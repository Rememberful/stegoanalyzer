# orchestrator.py
"""
Orchestrator
Sits at backend/ root — one level above analysis/.
Imports every analysis module, runs them in sequence,
catches all errors per-module (one failure never stops the scan),
and assembles the final ScanReport dict.

Execution phases:
  Phase 1 — Static image analysis     (no file extraction)
  Phase 2 — LSB extraction            (bitstream → raw bytes)
  Phase 3 — Payload reconstruction    (raw bytes → typed file)
  Phase 4 — Payload validation + VT   (deep inspection of extracted file)
  Phase 5 — VT on original image      (hash lookup)
  Phase 6 — Aggregation               (score, verdict, summary)
"""
import os
import traceback
import numpy as np
from PIL import Image

from backend.config import SANDBOX_DIR
from backend.utils.file_utils import (
    sha256_of_file,
    ensure_dir,
    human_readable_size,
    list_files,
)
from backend.utils.image_utils import image_info, load_as_array

# ── Analysis modules ──────────────────────────────────────────────────
from backend.analysis.lsb_noise             import lsb_noise_analysis
from backend.analysis.histogram_analysis    import histogram_analysis
from backend.analysis.chi_square_test       import chi_square_test
from backend.analysis.entropy               import analyse_entropy
from backend.analysis.feature_extractor     import extract_features
from backend.analysis.alpha_channel         import analyse_alpha_channel
from backend.analysis.file_signature        import detect_appended_payload
from backend.analysis.metadata_analysis     import analyse_metadata
from backend.analysis.hidden_signature      import scan_for_hidden_signatures
from backend.analysis.lsb_extractor         import extract_lsb_payload
from backend.analysis.rebuild_payload       import extract_clean_payload
from backend.analysis.payload_validator     import validate_payload
from backend.analysis.virustotal            import scan_file as vt_scan_file


# ════════════════════════════════════════════════════════════════════════
# SCORING WEIGHTS
# Higher weight = this module's verdict carries more influence.
# Rationale documented per module.
# ════════════════════════════════════════════════════════════════════════

MODULE_WEIGHTS = {
    # Statistical tests — reliable but produce false positives on
    # naturally random images, so moderate weight.
    "lsb_noise":          2,
    "histogram":          2,
    "chi_square":         3,

    # Entropy and features — supporting signals, not definitive alone.
    "entropy":            2,
    "feature_extractor":  1,
    "alpha_channel":      2,

    # Structural checks — file sig / metadata are very reliable.
    "file_signature":     4,
    "metadata":           2,
    "hidden_signature":   5,   # finding an EXE header in an image is very suspicious

    # Extraction pipeline
    "lsb_extractor":      1,   # extraction itself isn't suspicious, just informational
    "rebuild_payload":    3,   # successfully reconstructing a typed file is suspicious

    # Deep payload analysis — most reliable signals
    "payload_validator":  5,
    "virustotal_payload": 6,   # VT detection is the strongest signal
    "virustotal_image":   6,
}


# ════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════

def _safe_run(module_name: str, fn, *args, **kwargs) -> dict:
    try:
        result = fn(*args, **kwargs)

        if isinstance(result, dict):
            result.setdefault("module", module_name)
            result.setdefault("indicators", [])
            result.setdefault("suspicious", False)

            # Promote status based on suspicious flag OR verdict text
            verdict = result.get("verdict", "")
            has_warning = (
                result.get("suspicious") or
                result.get("indicators") or          # any indicators = suspicious
                "⚠️" in str(verdict) or
                "🚨" in str(verdict)
            )

            if has_warning and result.get("status") in ("ok", "info", None):
                result["status"]     = "suspicious"
                result["suspicious"] = True

        return result

    except Exception as e:
        return {
            "module":     module_name,
            "status":     "error",
            "error":      str(e),
            "traceback":  traceback.format_exc(),
            "suspicious": False,
            "verdict":    f"❌ Module crashed: {e}",
            "indicators": [],
        }


def _is_suspicious(result: dict) -> bool:
    """
    Determine if a module result counts as suspicious for scoring.
    Checks both the boolean 'suspicious' flag and VT-specific
    'threat_status' field.
    """
    if result.get("suspicious", False):
        return True
    ts = result.get("threat_status", "")
    return ts in ("suspicious", "malicious")


def _score_module(module_name: str, result: dict) -> int:
    """
    Returns the threat score contribution of a single module result.
    Errors and skipped modules contribute 0.
    VT malicious results get double weight.
    """
    if result.get("status") in ("error", "skipped", "not_found", "submitted"):
        return 0

    weight = MODULE_WEIGHTS.get(module_name, 1)
    ts     = result.get("threat_status", "")

    if ts == "malicious":
        return weight * 2   # double weight for confirmed malicious
    if _is_suspicious(result):
        return weight

    return 0


def _threat_level(score: int) -> tuple[str, str]:
    """
    Maps a normalised 0–10 score to a threat level label and
    a human-readable suspicion string.
    Returns (threat_level, stego_suspicion).
    """
    if score >= 8:
        return "CRITICAL", "🔴 Very High Confidence — Almost certainly contains hidden payload"
    if score >= 6:
        return "HIGH",     "🟠 High Confidence — Strong indicators of steganography"
    if score >= 4:
        return "MEDIUM",   "🟡 Medium Confidence — Several suspicious indicators"
    if score >= 2:
        return "LOW",      "🟢 Low Confidence — Minor anomalies detected"
    return     "CLEAN",    "✅ No significant indicators of steganography"


# ════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ════════════════════════════════════════════════════════════════════════

def run_full_scan(image_path: str) -> dict:
    """
    Runs the complete steganalysis pipeline on one image.

    Args:
        image_path: Path to the uploaded image file.

    Returns:
        Complete scan report as a plain dict (JSON-serialisable).
        Never raises — top-level errors are captured and returned.
    """
    # ── Pre-flight ────────────────────────────────────────────────────
    ensure_dir(SANDBOX_DIR)

    if not os.path.exists(image_path):
        return {
            "status": "error",
            "error":  f"Image not found: {image_path}",
        }

    try:
        info      = image_info(image_path)
        file_hash = sha256_of_file(image_path)
        file_size = os.path.getsize(image_path)
        filename  = os.path.basename(image_path)
        base_name = os.path.splitext(filename)[0]
    except Exception as e:
        return {"status": "error", "error": f"Pre-flight failed: {e}"}

    results: dict[str, dict] = {}

    # ════════════════════════════════════════════════════════════════
    # PHASE 1 — Static image analysis
    # ════════════════════════════════════════════════════════════════

    results["lsb_noise"] = _safe_run(
        "lsb_noise",
        lsb_noise_analysis,
        image_path,
    )

    results["histogram"] = _safe_run(
        "histogram",
        histogram_analysis,
        image_path,
    )

    # Chi-square needs a numpy array — load once here, pass in
    try:
        arr = load_as_array(image_path, mode="RGB")
        results["chi_square"] = _safe_run(
            "chi_square",
            chi_square_test,
            arr,
        )
    except Exception as e:
        results["chi_square"] = {
            "module":     "chi_square",
            "status":     "error",
            "error":      str(e),
            "suspicious": False,
            "verdict":    f"❌ Could not load image array: {e}",
            "indicators": [],
        }

    results["entropy"] = _safe_run(
        "entropy",
        analyse_entropy,
        image_path,
    )

    results["feature_extractor"] = _safe_run(
        "feature_extractor",
        extract_features,
        image_path,
    )

    results["alpha_channel"] = _safe_run(
        "alpha_channel",
        analyse_alpha_channel,
        image_path,
    )

    results["file_signature"] = _safe_run(
        "file_signature",
        detect_appended_payload,
        image_path,
    )

    results["metadata"] = _safe_run(
        "metadata",
        analyse_metadata,
        image_path,
    )

    results["hidden_signature"] = _safe_run(
        "hidden_signature",
        scan_for_hidden_signatures,
        image_path,
    )

    # ════════════════════════════════════════════════════════════════
    # PHASE 2 — LSB extraction
    # ════════════════════════════════════════════════════════════════

    lsb_out = os.path.join(SANDBOX_DIR, f"{base_name}_lsb_raw.bin")
    results["lsb_extractor"] = _safe_run(
        "lsb_extractor",
        extract_lsb_payload,
        image_path,
        lsb_out,
    )

    # ════════════════════════════════════════════════════════════════
    # PHASE 3 — Payload reconstruction
    # ════════════════════════════════════════════════════════════════

    payload_path   = None
    payload_info   = None
    rebuild_result = {
        "module":     "rebuild_payload",
        "status":     "skipped",
        "suspicious": False,
        "verdict":    "⏭️ Skipped — LSB extraction did not produce output",
        "indicators": [],
    }

    if os.path.exists(lsb_out):
        try:
            with open(lsb_out, "rb") as f:
                lsb_bytes = f.read()

            raw = _safe_run(
                "rebuild_payload",
                extract_clean_payload,
                lsb_bytes,
                base_name
            )
            rebuild_result = raw
            payload_path   = raw.get("output_path")

            # Mark as suspicious if a typed file was successfully rebuilt
            if raw.get("file_type", "unknown") != "unknown":
                rebuild_result.setdefault("suspicious", True)
                rebuild_result.setdefault(
                    "indicators",
                    [f"{raw['file_type'].upper()} payload reconstructed from LSB stream"],
                )

        except Exception as e:
            rebuild_result["error"]  = str(e)
            rebuild_result["status"] = "error"

    results["rebuild_payload"] = rebuild_result

    # ════════════════════════════════════════════════════════════════
    # PHASE 4 — Payload validation + VirusTotal on payload
    # ════════════════════════════════════════════════════════════════

    _skipped = lambda name, reason: {
        "module":     name,
        "status":     "skipped",
        "suspicious": False,
        "verdict":    f"⏭️ {reason}",
        "indicators": [],
    }

    if payload_path and os.path.exists(payload_path):
        pv = _safe_run("payload_validator", validate_payload, payload_path)
        results["payload_validator"] = pv

        # Populate PayloadInfo for the report summary
        payload_info = {
            "path":          payload_path,
            "size_bytes":    os.path.getsize(payload_path),
            "size_human":    human_readable_size(os.path.getsize(payload_path)),
            "sha256":        rebuild_result.get("sha256", ""),
            "detected_type": pv.get("detected_type", "unknown"),
            "entropy":       pv.get("entropy", 0.0),
            "threat_score":  pv.get("threat_score", 0),
            "verdict":       pv.get("verdict", ""),
        }

        results["virustotal_payload"] = _safe_run(
            "virustotal_payload",
            vt_scan_file,
            payload_path,
        )
    else:
        results["payload_validator"]  = _skipped(
            "payload_validator", "No typed payload was extracted"
        )
        results["virustotal_payload"] = _skipped(
            "virustotal_payload", "No payload file to scan"
        )

    # ════════════════════════════════════════════════════════════════
    # PHASE 5 — VirusTotal on the original image
    # ════════════════════════════════════════════════════════════════

    results["virustotal_image"] = _safe_run(
        "virustotal_image",
        vt_scan_file,
        image_path,
    )

    # ════════════════════════════════════════════════════════════════
    # PHASE 6 — Aggregate scores and build final report
    # ════════════════════════════════════════════════════════════════

    raw_score         = 0
    suspicious_modules = []
    all_indicators    = []

    for mod_name, result in results.items():
        # Score contribution
        raw_score += _score_module(mod_name, result)

        # Track which modules flagged suspicious
        if _is_suspicious(result):
            suspicious_modules.append(mod_name)

        # Collect all indicators tagged with their source module
        for ind in result.get("indicators", []):
            all_indicators.append({
                "module":    mod_name,
                "indicator": ind,
            })

    # Normalise score to 0–10
    max_possible    = sum(v * 2 for v in MODULE_WEIGHTS.values())
    heuristic_score = min(10, round((raw_score / max_possible) * 10))
    threat_level, stego_suspicion = _threat_level(heuristic_score)

    # Collect all sandbox files produced during this scan
    sandbox_files = []
    for fpath in list_files(SANDBOX_DIR):
        size = os.path.getsize(fpath)
        sandbox_files.append({
            "filename":   os.path.basename(fpath),
            "path":       fpath,
            "size_bytes": size,
            "size_human": human_readable_size(size),
        })

    # ── Final report ──────────────────────────────────────────────────
    return {
        "status": "ok",

        # Nested file_info — matches what Report.jsx expects
        "file_info": {
            "filename":     filename,
            "sha256":       file_hash,
            "size":         file_size,
            "size_human":   human_readable_size(file_size),
            "dimensions":   (info["width"], info["height"])
                            if "width" in info and "height" in info
                            else None,
            "mode":         info.get("mode"),
            "format":       info.get("format"),
            "has_alpha":    info.get("has_alpha", False),
            "channels":     len(Image.open(image_path).getbands())
                            if os.path.exists(image_path) else None,
            "total_pixels": info.get("total_pixels"),
        },

        # Per-module results (full detail)
        "results": results,

        # Aggregated summary — what the frontend threat meter uses
        "summary": {
            "heuristic_score":       heuristic_score,
            "threat_level":          threat_level,
            "stego_suspicion":       stego_suspicion,
            "suspicious_modules":    len(suspicious_modules),
            "suspicious_module_names": suspicious_modules,
            "total_indicators":      len(all_indicators),
            "indicators":            all_indicators,
        },

        # Extracted payload summary (None if nothing found)
        "payload": payload_info,

        # All sandbox files produced during this scan
        "sandbox_files": sandbox_files,
    }