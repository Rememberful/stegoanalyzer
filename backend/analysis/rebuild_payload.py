"""
Rebuild Payload
Reconstructs a clean, properly-bounded file from a raw byte stream.

For each supported type, uses the format's own end-marker to determine
the true file boundary — never arbitrary size cutoffs.
Non-destructive: source bytes are never modified.
"""
import os
import math
from collections import Counter
from backend.utils.file_utils import sha256_of_bytes
from backend.config import SANDBOX_DIR

try:
    import pefile
    PEFILE_AVAILABLE = True
except ImportError:
    PEFILE_AVAILABLE = False


# (magic_bytes, file_type, extension)
FILE_SIGNATURES = [
    (b"\x4D\x5A",                 "exe",   "exe"),
    (b"\x7F\x45\x4C\x46",         "elf",   "elf"),
    (b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A", "png", "png"),
    (b"\xFF\xD8\xFF",             "jpeg",  "jpg"),
    (b"\x47\x49\x46\x38",         "gif",   "gif"),
    (b"\x25\x50\x44\x46",         "pdf",   "pdf"),
    (b"\x50\x4B\x03\x04",         "zip",   "zip"),
    (b"\x52\x61\x72\x21\x1A\x07", "rar",   "rar"),
    (b"\x37\x7A\xBC\xAF\x27\x1C", "7z",    "7z"),
    (b"\x1F\x8B\x08",             "gzip",  "gz"),
    (b"\xCA\xFE\xBA\xBE",         "java",  "class"),
]

SEARCH_WINDOW = 1024  # bytes to scan from start for signature


def detect_signature(
    payload: bytes,
) -> tuple[str, str, int] | tuple[None, None, None]:
    """
    Scans the first SEARCH_WINDOW bytes for a known file signature.
    Returns (file_type, extension, offset) or (None, None, None).
    Picks the earliest match if multiple signatures found.
    """
    window = payload[:SEARCH_WINDOW]
    best = (None, None, None)

    for magic, ftype, ext in FILE_SIGNATURES:
        pos = window.find(magic)
        if pos != -1:
            if best[2] is None or pos < best[2]:
                best = (ftype, ext, pos)

    return best


def _trim_exe(payload: bytes, offset: int) -> bytes:
    """Use PE headers to extract exactly the right number of bytes."""
    if not PEFILE_AVAILABLE:
        return payload[offset:]
    try:
        pe = pefile.PE(data=payload[offset:])
        if not pe.sections:
            # No sections — use SizeOfImage from optional header
            size = pe.OPTIONAL_HEADER.SizeOfImage
        else:
            last = pe.sections[-1]
            size = last.PointerToRawData + last.SizeOfRawData
        return payload[offset : offset + size]
    except Exception:
        # pefile failed — return from offset to end, let validator decide
        return payload[offset:]


def _trim_png(payload: bytes, offset: int) -> bytes:
    """Trim to IEND chunk boundary (inclusive of 4-byte CRC)."""
    # IEND chunk structure: [4B length][4B 'IEND'][0B data][4B CRC]
    # find() returns position of 'IEND' type field
    iend_type_pos = payload.find(b"IEND", offset)
    if iend_type_pos == -1:
        return payload[offset:]
    # End of IEND = position of type field + 4 (type) + 4 (CRC)
    end = iend_type_pos + 8
    return payload[offset:end]


def _trim_pdf(payload: bytes, offset: int) -> bytes:
    """Trim to %%EOF marker."""
    eof_pos = payload.rfind(b"%%EOF", offset)
    if eof_pos == -1:
        return payload[offset:]
    return payload[offset : eof_pos + 5]


def _trim_zip(payload: bytes, offset: int) -> bytes:
    """Trim to ZIP end-of-central-directory record."""
    eocd = payload.rfind(b"\x50\x4B\x05\x06", offset)
    if eocd == -1:
        return payload[offset:]
    # EOCD is 22 bytes minimum; comment length is last 2 bytes
    if eocd + 22 <= len(payload):
        comment_len = int.from_bytes(payload[eocd + 20 : eocd + 22], "little")
        return payload[offset : eocd + 22 + comment_len]
    return payload[offset:]


def _trim_jpeg(payload: bytes, offset: int) -> bytes:
    """Trim to JPEG EOI marker (FFD9)."""
    eoi = payload.rfind(b"\xFF\xD9", offset)
    if eoi == -1:
        return payload[offset:]
    return payload[offset : eoi + 2]


TRIMMERS = {
    "exe":  _trim_exe,
    "png":  _trim_png,
    "pdf":  _trim_pdf,
    "zip":  _trim_zip,
    "jpeg": _trim_jpeg,
}


def extract_clean_payload(
    payload: bytes,
    base_name: str = "payload",
) -> dict:
    """
    Detects the file type in a byte stream and extracts a clean,
    properly-bounded copy to the sandbox directory.

    Args:
        payload:   Raw byte stream (e.g. from LSB extraction)
        base_name: Base filename (no extension) for output file

    Returns:
        Structured result dict — never raises.
    """
    os.makedirs(SANDBOX_DIR, exist_ok=True)

    ftype, ext, offset = detect_signature(payload)

    if offset is None:
        # No known signature — save raw stream
        out_path = os.path.join(SANDBOX_DIR, f"{base_name}_raw.bin")
        with open(out_path, "wb") as f:
            f.write(payload)
        return {
            "status":        "no_signature",
            "file_type":     "unknown",
            "extension":     "bin",
            "offset":        None,
            "output_path":   out_path,
            "size_bytes":    len(payload),
            "sha256":        sha256_of_bytes(payload),
            "verdict":       "ℹ️ No known file signature found",
        }

    # Trim to proper file boundary
    trimmer = TRIMMERS.get(ftype)
    if trimmer:
        clean = trimmer(payload, offset)
    else:
        # No trimmer for this type — extract from signature to end
        clean = payload[offset:]

    out_path = os.path.join(SANDBOX_DIR, f"{base_name}_clean.{ext}")
    with open(out_path, "wb") as f:
        f.write(clean)

    file_hash = sha256_of_bytes(clean)

    return {
        "status":        "ok",
        "file_type":     ftype,
        "extension":     ext,
        "offset":        offset,
        "output_path":   out_path,
        "size_bytes":    len(clean),
        "sha256":        file_hash,
        "verdict":       f"✅ {ftype.upper()} payload extracted ({len(clean):,} bytes)",
    }