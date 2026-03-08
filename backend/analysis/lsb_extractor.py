"""
LSB Extractor
Extracts the raw LSB bitstream from all RGB channels.
Uses NumPy vectorisation — fast on any image size.

Returns structured result including:
- output file path
- number of bytes extracted
- detected payload signature (if any)
- offset where signature was found
"""
import os
import numpy as np
from PIL import Image

# Reuse the same signature table as file_signature.py
PAYLOAD_SIGNATURES = [
    (b"\x4D\x5A",                 "Windows PE/EXE",  "exe"),
    (b"\x7F\x45\x4C\x46",         "ELF Executable",  "elf"),
    (b"\x50\x4B\x03\x04",         "ZIP Archive",     "zip"),
    (b"\x52\x61\x72\x21\x1A\x07", "RAR Archive",     "rar"),
    (b"\x37\x7A\xBC\xAF\x27\x1C", "7-Zip Archive",   "7z"),
    (b"\x1F\x8B\x08",             "GZIP Archive",    "gz"),
    (b"\x25\x50\x44\x46",         "PDF Document",    "pdf"),
    (b"\x89\x50\x4E\x47",         "PNG Image",       "png"),
    (b"\xFF\xD8\xFF",             "JPEG Image",      "jpg"),
    (b"\xCA\xFE\xBA\xBE",         "Java Class",      "class"),
]

# How far into the bitstream to search for a signature
SIGNATURE_SEARCH_WINDOW = 1024  # bytes


def _extract_raw_lsb(arr: np.ndarray, max_bytes: int) -> bytes:
    """
    Vectorised LSB extraction from RGB array.
    Returns raw bytes from LSB bitstream.
    """
    # Extract LSB of every channel value → flat bit array
    bits = (arr[:, :, :3] & 1).flatten()

    # Limit to max_bytes
    max_bits = min(len(bits), max_bytes * 8)
    bits = bits[:max_bits]

    # Pad to multiple of 8
    pad = (8 - len(bits) % 8) % 8
    if pad:
        bits = np.concatenate([bits, np.zeros(pad, dtype=np.uint8)])

    # Pack bits into bytes (MSB first)
    byte_arr = np.packbits(bits.reshape(-1, 8), axis=1).flatten()
    return bytes(byte_arr)


def _find_signature(data: bytes) -> tuple[str, str, int] | tuple[None, None, int]:
    """
    Scans the first SIGNATURE_SEARCH_WINDOW bytes for known magic bytes.
    Returns (description, extension, offset) or (None, None, -1).
    """
    window = data[:SIGNATURE_SEARCH_WINDOW]
    best = (None, None, -1)

    for magic, desc, ext in PAYLOAD_SIGNATURES:
        pos = window.find(magic)
        if pos != -1:
            # Prefer the earliest match
            if best[2] == -1 or pos < best[2]:
                best = (desc, ext, pos)

    return best


def extract_lsb_payload(
    image_path: str,
    output_path: str,
    max_bytes: int = 5 * 1024 * 1024,  # 5 MB
) -> dict:
    """
    Extracts LSB payload from image and saves to output_path.

    Args:
        image_path:  Path to source image (PNG or JPEG)
        output_path: Where to save the extracted payload
        max_bytes:   Maximum bytes to extract (default 5 MB)

    Returns:
        Structured result dict — never raises, always returns status.
    """
    if not os.path.exists(image_path):
        return {
            "status": "error",
            "error": f"Image not found: {image_path}",
        }

    try:
        img = Image.open(image_path).convert("RGB")
        arr = np.array(img, dtype=np.uint8)
    except Exception as e:
        return {"status": "error", "error": f"Failed to open image: {e}"}

    try:
        raw = _extract_raw_lsb(arr, max_bytes)
    except Exception as e:
        return {"status": "error", "error": f"LSB extraction failed: {e}"}

    # Detect signature and trim payload to start at it
    sig_desc, sig_ext, sig_offset = _find_signature(raw)

    if sig_offset != -1:
        payload = raw[sig_offset:]
        trimmed = True
    else:
        payload = raw
        trimmed = False

    # Write payload to disk
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    try:
        with open(output_path, "wb") as f:
            f.write(payload)
    except Exception as e:
        return {"status": "error", "error": f"Failed to write payload: {e}"}

    return {
        "status":             "ok",
        "output_path":        output_path,
        "total_bits_scanned": len(arr.flatten()),
        "extracted_bytes":    len(payload),
        "trimmed":            trimmed,
        "signature_found":    sig_desc,
        "signature_ext":      sig_ext,
        "signature_offset":   sig_offset,
        "verdict": (
            f"⚠️ {sig_desc} detected in LSB stream"
            if sig_desc else "ℹ️ No known signature found in LSB stream"
        ),
    }