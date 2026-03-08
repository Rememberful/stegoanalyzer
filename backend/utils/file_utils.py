# utils/file_utils.py
"""
File Utilities
Low-level helpers for hashing, path management, and safe file operations.
Imported by almost every module — keep this dependency-free
(no PIL, no numpy, no requests).
"""
import os
import hashlib
import shutil
import unicodedata
import re


# ── Hashing ───────────────────────────────────────────────────────────

def sha256_of_file(path: str) -> str:
    """
    Compute SHA-256 of a file by streaming it in chunks.
    Safe for large files — never loads entire file into memory.
    """
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_of_bytes(data: bytes) -> str:
    """Compute SHA-256 of an in-memory bytes object."""
    return hashlib.sha256(data).hexdigest()


def md5_of_file(path: str) -> str:
    """
    Compute MD5 of a file by streaming.
    Used only for quick deduplication — not for security.
    """
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ── Directory helpers ─────────────────────────────────────────────────

def ensure_dir(path: str) -> str:
    """
    Create directory (and all parents) if it doesn't exist.
    Returns the path for chaining.
    """
    os.makedirs(path, exist_ok=True)
    return path


def clear_dir(path: str) -> int:
    """
    Delete all files inside a directory without removing the directory itself.
    Returns number of files deleted.
    Skips subdirectories silently.
    """
    deleted = 0
    if not os.path.exists(path):
        return 0
    for name in os.listdir(path):
        fpath = os.path.join(path, name)
        if os.path.isfile(fpath):
            try:
                os.remove(fpath)
                deleted += 1
            except Exception:
                pass
    return deleted


def list_files(directory: str, extensions: set[str] | None = None) -> list[str]:
    """
    List all files in a directory.
    Optionally filter by extension set e.g. {'.png', '.jpg'}.
    Returns absolute paths.
    """
    if not os.path.exists(directory):
        return []
    results = []
    for name in os.listdir(directory):
        fpath = os.path.join(directory, name)
        if not os.path.isfile(fpath):
            continue
        if extensions is None:
            results.append(fpath)
        elif os.path.splitext(name)[1].lower() in extensions:
            results.append(fpath)
    return sorted(results)


# ── Filename helpers ──────────────────────────────────────────────────

def safe_filename(name: str) -> str:
    """
    Sanitise a filename so it is safe to use on any OS.
    - Normalises unicode to ASCII
    - Strips path separators and shell-special characters
    - Collapses spaces and dots
    - Truncates to 200 characters
    """
    # Normalise unicode (é → e etc.)
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")

    # Keep only safe characters
    name = re.sub(r"[^\w\s.\-]", "", name)

    # Collapse whitespace to underscores
    name = re.sub(r"\s+", "_", name).strip("_")

    # Prevent empty result
    if not name:
        name = "unnamed"

    return name[:200]


def unique_path(directory: str, filename: str) -> str:
    """
    Returns a path that does not already exist by appending _1, _2 etc.
    Useful when multiple scans produce files with the same base name.

    Example:
        unique_path("sandbox", "payload_clean.exe")
        → "sandbox/payload_clean.exe"       if it doesn't exist
        → "sandbox/payload_clean_1.exe"     if it does
    """
    base, ext = os.path.splitext(filename)
    candidate  = os.path.join(directory, filename)
    counter    = 1
    while os.path.exists(candidate):
        candidate = os.path.join(directory, f"{base}_{counter}{ext}")
        counter  += 1
    return candidate


def file_extension(path: str) -> str:
    """Returns lowercase extension without dot. e.g. 'png', 'exe'."""
    return os.path.splitext(path)[1].lstrip(".").lower()


# ── File size helpers ─────────────────────────────────────────────────

def human_readable_size(size_bytes: int) -> str:
    """
    Convert bytes to a human-readable string.
    e.g. 1024 → '1.0 KB', 1048576 → '1.0 MB'
    """
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def is_within_size_limit(path: str, max_mb: int) -> bool:
    """Returns True if file is within the given MB limit."""
    return os.path.getsize(path) <= max_mb * 1024 * 1024


# ── Safe file operations ──────────────────────────────────────────────

def safe_copy(src: str, dst_dir: str) -> str:
    """
    Copy a file to dst_dir safely.
    Creates dst_dir if needed. Returns destination path.
    """
    ensure_dir(dst_dir)
    dst = unique_path(dst_dir, os.path.basename(src))
    shutil.copy2(src, dst)
    return dst


def safe_delete(path: str) -> bool:
    """
    Delete a file without raising if it doesn't exist.
    Returns True if deleted, False if not found or failed.
    """
    try:
        os.remove(path)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False