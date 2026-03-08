# hidden_signature.py
"""
Hidden Signature Checker
Two-pass scan:
  Pass 1 (precise): walk PNG chunks to find exact IEND boundary,
                    then scan only post-IEND data
  Pass 2 (broad):   scan the entire file, skipping the natural
                    image header at offset 0

Deduplicates results so the same finding isn't reported twice.
Extracts each found payload to sandbox.
"""
import os
import struct
from backend.config import SANDBOX_DIR
from backend.utils.file_utils import sha256_of_bytes

SIGNATURES = [
    (b"\x4D\x5A",                 "EXE",  "exe"),
    (b"\x7F\x45\x4C\x46",         "ELF",  "elf"),
    (b"\x50\x4B\x03\x04",         "ZIP",  "zip"),
    (b"\x52\x61\x72\x21\x1A\x07", "RAR",  "rar"),
    (b"\x37\x7A\xBC\xAF\x27\x1C", "7Z",   "7z"),
    (b"\x25\x50\x44\x46",         "PDF",  "pdf"),
    (b"\x1F\x8B\x08",             "GZIP", "gz"),
    (b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A", "PNG", "png"),
    (b"\xFF\xD8\xFF",             "JPEG", "jpg"),
    (b"\xCA\xFE\xBA\xBE",         "JAVA", "class"),
]

# Natural image headers to skip at offset 0
NATURAL_HEADERS = {
    b"\x89\x50\x4E\x47",  # PNG
    b"\xFF\xD8\xFF",       # JPEG
    b"\x47\x49\x46\x38",  # GIF
    b"\x42\x4D",           # BMP
}


def _find_iend_end(data: bytes) -> int | None:
    """
    Walks PNG chunks to find the byte offset immediately after IEND+CRC.
    Returns None if IEND not found or file is not a valid PNG.
    """
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    offset = 8
    while offset + 12 <= len(data):
        try:
            chunk_len  = struct.unpack(">I", data[offset : offset + 4])[0]
            chunk_type = data[offset + 4 : offset + 8].decode("ascii", errors="replace")
            chunk_end  = offset + 12 + chunk_len
            if chunk_type == "IEND":
                return chunk_end   # first byte after IEND CRC
            offset = chunk_end
        except Exception:
            break
    return None


def _is_natural_header(data: bytes, offset: int) -> bool:
    """True if offset 0 matches the file's own image magic bytes."""
    if offset != 0:
        return False
    for magic in NATURAL_HEADERS:
        if data[:len(magic)] == magic:
            return True
    return False


def _scan_region(
    data: bytes,
    region_start: int,
    confidence: str,
    base_name: str,
) -> list[dict]:
    """Scan a byte region for all known signatures."""
    os.makedirs(SANDBOX_DIR, exist_ok=True)
    findings = []
    region = data[region_start:]

    for magic, sig_type, ext in SIGNATURES:
        search_from = 0
        while True:
            pos = region.find(magic, search_from)
            if pos == -1:
                break

            abs_offset = region_start + pos

            # Skip the image's own natural header
            if _is_natural_header(data, abs_offset):
                search_from = pos + 1
                continue

            payload = data[abs_offset:]
            out_name = f"{base_name}_{sig_type}_{abs_offset}.{ext}"
            out_path = os.path.join(SANDBOX_DIR, out_name)

            try:
                with open(out_path, "wb") as f:
                    f.write(payload)
                extracted = out_path
            except Exception as e:
                extracted = f"error: {e}"

            findings.append({
                "type":            sig_type,
                "extension":       ext,
                "offset":          abs_offset,
                "hex_preview":     data[abs_offset : abs_offset + 8].hex().upper(),
                "estimated_size":  len(payload),
                "confidence":      confidence,
                "extracted_to":    extracted,
                "sha256":          sha256_of_bytes(payload[:4096]),
            })
            search_from = pos + 1

    return findings


def scan_for_hidden_signatures(image_path: str) -> dict:
    """
    Scans image for hidden file signatures using two passes.
    Returns deduplicated findings with extraction paths.
    """
    if not os.path.exists(image_path):
        return {"status": "error", "error": "File not found", "findings": []}

    try:
        with open(image_path, "rb") as f:
            data = f.read()
    except Exception as e:
        return {"status": "error", "error": str(e), "findings": []}

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    all_findings = []
    seen_offsets = set()

    # ── Pass 1: post-IEND (high confidence) ──────────────────────────
    iend_end = _find_iend_end(data)
    if iend_end is not None and iend_end < len(data):
        for f in _scan_region(data, iend_end, "High (after IEND)", base_name):
            if f["offset"] not in seen_offsets:
                seen_offsets.add(f["offset"])
                all_findings.append(f)

    # ── Pass 2: full file scan (medium confidence) ────────────────────
    for f in _scan_region(data, 0, "Medium (full scan)", base_name):
        if f["offset"] not in seen_offsets:
            seen_offsets.add(f["offset"])
            all_findings.append(f)

    exe_found = any(f["type"] in ("EXE", "ELF") for f in all_findings)
    status = "malicious" if exe_found else "suspicious" if all_findings else "clean"

    return {
        "status":    "ok",
        "findings":  all_findings,
        "total":     len(all_findings),
        "suspicious": len(all_findings) > 0,
        "verdict": (
            "🚨 Executable Hidden in Image" if exe_found else
            "⚠️ Hidden Files Detected"      if all_findings else
            "✅ No Hidden Signatures"
        ),
    }