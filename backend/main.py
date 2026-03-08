# main.py

"""
StegoAnalyzer — FastAPI Backend
Handles image uploads, triggers the full analysis pipeline,
and serves results to the frontend.

Endpoints:
  POST   /api/scan                        → Upload image, run full scan
  GET    /api/scan/{file_hash}            → Retrieve cached scan by hash
  GET    /api/scans                       → List all cached scans
  DELETE /api/scans                       → Clear scan cache
  GET    /api/sandbox/list               → List sandbox extracted files
  GET    /api/sandbox/download/{filename} → Download a sandbox file
  DELETE /api/sandbox/clear              → Clear sandbox directory
  GET    /api/health                      → Health check
"""
import os
import math
import uuid
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import (
    SANDBOX_DIR,
    UPLOAD_DIR,
    MAX_FILE_SIZE_MB,
    ALLOWED_EXTENSIONS,
)
from backend.models.report import ScanReport, ScanError, ScanStatus
from backend.orchestrator import run_full_scan
from backend.utils.file_utils import (
    ensure_dir,
    safe_filename,
    unique_path,
    clear_dir,
    list_files,
    sha256_of_file,
    human_readable_size,
    is_within_size_limit,
)
from backend.utils.image_utils import is_valid_image


# ── Startup / shutdown ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create required directories on startup."""
    ensure_dir(UPLOAD_DIR)
    ensure_dir(SANDBOX_DIR)
    print(f"✅ StegoAnalyzer started")
    print(f"   Upload dir  : {UPLOAD_DIR}")
    print(f"   Sandbox dir : {SANDBOX_DIR}")
    yield
    # Cleanup temp uploads on shutdown
    clear_dir(UPLOAD_DIR)
    print("🛑 StegoAnalyzer stopped — uploads cleared")


# ── App init ──────────────────────────────────────────────────────────

app = FastAPI(
    title="StegoAnalyzer API",
    description=(
        "Advanced LSB Steganography Detection & Malware Analysis. "
        "Upload a PNG or JPEG image to scan for hidden payloads."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
# Allow requests only from local dev and deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                    # local dev frontend
        "https://stegoanalyzer-frontend.onrender.com",       # Render frontend (update after deploying)
        "https://stegoanalyzer-api2.onrender.com",  # Render backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory scan cache ──────────────────────────────────────────────
# Keyed by file SHA-256 hash.
# In production you would replace this with Redis or a database.
_scan_cache: dict[str, dict] = {}


# ════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════════════════

def clean_nan(obj):
    """Recursively replace NaN floats with None so JSON serialization doesn't fail."""
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    return obj

def _validate_upload(file: UploadFile, content: bytes) -> None:
    """
    Validate an uploaded file before analysis.
    Raises HTTPException with a clear message on any failure.
    """
    # Extension check
    original_name = file.filename or "unknown"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # Size check
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File too large ({size_mb:.1f} MB). "
                f"Maximum allowed size is {MAX_FILE_SIZE_MB} MB."
            ),
        )

    # Empty file check
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")


def _save_upload(filename: str, content: bytes) -> str:
    """
    Save uploaded file to the uploads directory with a unique name.
    Returns the saved file path.
    """
    safe_name  = safe_filename(filename)
    unique_id  = uuid.uuid4().hex[:8]
    final_name = f"{unique_id}_{safe_name}"
    save_path  = os.path.join(UPLOAD_DIR, final_name)
    with open(save_path, "wb") as f:
        f.write(content)
    return save_path


def _cleanup_upload(path: str) -> None:
    """Delete a temp upload file silently."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ════════════════════════════════════════════════════════════════════════
# ROUTES
# ════════════════════════════════════════════════════════════════════════

# ── Health check ──────────────────────────────────────────────────────

@app.get(
    "/api/health",
    response_model=ScanStatus,
    tags=["System"],
    summary="Health check",
)
def health_check():
    """Returns service status. Use this to verify the backend is running."""
    return ScanStatus(status="ok", service="StegoAnalyzer", version="1.0.0")


# ── Main scan endpoint ────────────────────────────────────────────────

@app.post(
    "/api/scan",
    tags=["Scan"],
    summary="Upload image and run full steganalysis",
    responses={
        200: {"description": "Scan completed successfully"},
        400: {"description": "Invalid file type or empty file"},
        413: {"description": "File too large"},
        500: {"description": "Internal analysis error"},
    },
)
async def scan_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PNG or JPEG image to analyse"),
):
    """
    Upload an image and run the complete steganalysis pipeline.

    Runs all 12 analysis modules and returns a full scan report including:
    - LSB noise and distribution analysis
    - Chi-square statistical test
    - Histogram pair-wise analysis
    - Entropy analysis (file, channel, tail)
    - Hidden file signature detection
    - Payload extraction and validation
    - VirusTotal hash lookup

    Results are cached by file SHA-256 hash.
    Re-uploading the same file returns the cached result instantly.
    """
    # Read file into memory first
    try:
        content = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")

    # Validate before touching disk
    _validate_upload(file, content)

    # Save to temp upload dir
    upload_path = _save_upload(file.filename or "upload.png", content)

    # Verify it is actually a valid image
    if not is_valid_image(upload_path):
        _cleanup_upload(upload_path)
        raise HTTPException(
            status_code=400,
            detail="File does not appear to be a valid image. It may be corrupt or disguised."
        )

    # Check cache — same file hash = return cached result
    try:
        file_hash = sha256_of_file(upload_path)
    except Exception:
        _cleanup_upload(upload_path)
        raise HTTPException(status_code=500, detail="Failed to hash uploaded file.")

    if file_hash in _scan_cache:
        background_tasks.add_task(_cleanup_upload, upload_path)
        return JSONResponse(
            content=_scan_cache[file_hash],
            headers={"X-Cache": "HIT", "X-File-Hash": file_hash},
        )

    # Run the full scan pipeline
    try:
        report = run_full_scan(upload_path)
    except Exception as e:
        _cleanup_upload(upload_path)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline failed: {str(e)}\n{traceback.format_exc()}",
        )

    # Cache the result
    _scan_cache[file_hash] = report

    # Clean up upload in background (sandbox files are kept)
    background_tasks.add_task(_cleanup_upload, upload_path)

    report = clean_nan(report)

    return JSONResponse(
        content=report,
        headers={"X-Cache": "MISS", "X-File-Hash": file_hash},
    )
    

# ── Retrieve cached scan ──────────────────────────────────────────────

@app.get(
    "/api/scan/{file_hash}",
    tags=["Scan"],
    summary="Retrieve a cached scan result by file hash",
    responses={
        200: {"description": "Cached scan report"},
        404: {"description": "No scan found for this hash"},
    },
)
def get_scan(file_hash: str):
    """
    Retrieve a previously completed scan report by its SHA-256 hash.
    Useful for the frontend to reload a result without re-uploading.
    """
    if file_hash not in _scan_cache:
        raise HTTPException(
            status_code=404,
            detail=f"No scan found for hash '{file_hash}'. "
                   "The cache is cleared when the server restarts."
        )
    return JSONResponse(content=_scan_cache[file_hash])


# ── List all cached scans ─────────────────────────────────────────────

@app.get(
    "/api/scans",
    tags=["Scan"],
    summary="List all cached scan results",
)
def list_scans():
    """
    Returns a summary list of all scans in the current session cache.
    Does not return full reports — just metadata for each scan.
    """
    summaries = []
    for file_hash, report in _scan_cache.items():
        summaries.append({
            "file_hash":       file_hash,
            "filename":        report.get("filename", "unknown"),
            "file_size_bytes": report.get("file_size_bytes", 0),
            "file_size_human": human_readable_size(report.get("file_size_bytes", 0)),
            "threat_level":    report.get("summary", {}).get("threat_level", "UNKNOWN"),
            "heuristic_score": report.get("summary", {}).get("heuristic_score", 0),
        })
    return {
        "total":  len(summaries),
        "scans":  summaries,
    }


# ── Clear scan cache ──────────────────────────────────────────────────

@app.delete(
    "/api/scans",
    tags=["Scan"],
    summary="Clear the in-memory scan cache",
)
def clear_scans():
    """Clears all cached scan results from memory."""
    count = len(_scan_cache)
    _scan_cache.clear()
    return {"message": f"Cleared {count} cached scan(s)."}


# ── List sandbox files ────────────────────────────────────────────────

@app.get(
    "/api/sandbox/list",
    tags=["Sandbox"],
    summary="List all files extracted to the sandbox",
)
def list_sandbox():
    """
    Returns metadata for all files currently in the sandbox directory.
    These are payloads extracted during analysis — handle with care.
    """
    files = list_files(SANDBOX_DIR)
    file_list = []
    for path in files:
        size = os.path.getsize(path)
        file_list.append({
            "filename":   os.path.basename(path),
            "path":       path,
            "size_bytes": size,
            "size_human": human_readable_size(size),
        })
    return {
        "total":        len(file_list),
        "sandbox_dir":  SANDBOX_DIR,
        "files":        file_list,
    }


# ── Download sandbox file ─────────────────────────────────────────────

@app.get(
    "/api/sandbox/download/{filename}",
    tags=["Sandbox"],
    summary="Download a specific sandbox file",
    responses={
        200: {"description": "File download"},
        404: {"description": "File not found in sandbox"},
    },
)
def download_sandbox_file(filename: str):
    """
    Download a specific file from the sandbox directory.

    ⚠️  WARNING: Sandbox files may contain malware.
    Only download if you know what you are doing.
    Always analyse in an isolated environment.
    """
    safe_name = safe_filename(filename)
    file_path = os.path.join(SANDBOX_DIR, safe_name)

    # Prevent path traversal attacks
    abs_sandbox = os.path.realpath(SANDBOX_DIR)
    abs_file    = os.path.realpath(file_path)
    if not abs_file.startswith(abs_sandbox):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"File '{safe_name}' not found in sandbox."
        )

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type="application/octet-stream",
        headers={"X-Content-Type-Options": "nosniff"},
    )


# ── Clear sandbox ─────────────────────────────────────────────────────

@app.delete(
    "/api/sandbox/clear",
    tags=["Sandbox"],
    summary="Delete all files in the sandbox directory",
)
def clear_sandbox():
    """
    Removes all extracted payload files from the sandbox.
    Does not affect cached scan results.
    """
    deleted = clear_dir(SANDBOX_DIR)
    return {"message": f"Sandbox cleared — {deleted} file(s) deleted."}


# ── 404 fallback for unknown API routes ───────────────────────────────

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "status":  "error",
            "message": "Endpoint not found",
            "detail":  str(exc.detail),
        },
    )


# ── Global error handler ──────────────────────────────────────────────

@app.exception_handler(500)
async def server_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "status":  "error",
            "message": "Internal server error",
            "detail":  str(exc),
        },
    )


# ── Dev entry point ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["./"],
    )