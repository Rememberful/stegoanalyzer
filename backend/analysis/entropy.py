# entropy.py
"""
Entropy Calculator
Computes Shannon entropy on:
  - The full image file
  - Each RGB channel independently  
  - The tail (data after IEND/EOI) if present
High tail entropy is a strong indicator of an encrypted/compressed payload.
"""
import os
import math
import struct
import numpy as np
from collections import Counter
from PIL import Image


def shannon_entropy(data: bytes) -> float:
    """Shannon entropy in bits per byte. Returns 0.0 for empty input."""
    if not data:
        return 0.0
    counts = Counter(data)
    total = len(data)
    return round(
        -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0),
        4,
    )


def _extract_png_tail(data: bytes) -> bytes:
    """Returns bytes after the IEND chunk by walking PNG chunks properly."""
    if len(data) < 8:
        return b""
    offset = 8  # skip PNG signature
    while offset + 12 <= len(data):
        try:
            chunk_len = struct.unpack(">I", data[offset : offset + 4])[0]
            chunk_type = data[offset + 4 : offset + 8].decode("ascii", errors="replace")
            chunk_end = offset + 12 + chunk_len
            if chunk_type == "IEND":
                return data[chunk_end:]
            offset = chunk_end
        except Exception:
            break
    return b""


def _extract_jpeg_tail(data: bytes) -> bytes:
    """Returns bytes after the last FFD9 EOI marker."""
    eoi = data.rfind(b"\xFF\xD9")
    if eoi == -1:
        return b""
    return data[eoi + 2:]


def analyse_entropy(image_path: str) -> dict:
    """
    Full entropy analysis for an image file.
    Returns structured results — never raises.
    """
    if not os.path.exists(image_path):
        return {"status": "error", "error": "File not found"}

    try:
        with open(image_path, "rb") as f:
            raw = f.read()
    except Exception as e:
        return {"status": "error", "error": str(e)}

    ext = os.path.splitext(image_path)[1].lower()
    file_entropy = shannon_entropy(raw)

    # ── Per-channel entropy ───────────────────────────────────────────
    channel_entropies = {}
    try:
        img = Image.open(image_path).convert("RGB")
        arr = np.array(img, dtype=np.uint8)
        for i, ch in enumerate(["R", "G", "B"]):
            channel_entropies[ch] = shannon_entropy(arr[:, :, i].tobytes())
    except Exception:
        pass

    # ── Tail entropy ──────────────────────────────────────────────────
    tail_bytes = b""
    tail_method = None

    if ext == ".png":
        tail_bytes = _extract_png_tail(raw)
        tail_method = "after_IEND"
    elif ext in (".jpg", ".jpeg"):
        tail_bytes = _extract_jpeg_tail(raw)
        tail_method = "after_EOI"

    tail_entropy = shannon_entropy(tail_bytes) if tail_bytes else None
    tail_size    = len(tail_bytes)

    # ── Indicators ────────────────────────────────────────────────────
    indicators = []
    status = "clean"

    if file_entropy > 7.5:
        indicators.append(f"Very high file entropy ({file_entropy}) — possibly encrypted")
        status = "suspicious"

    if channel_entropies:
        spread = max(channel_entropies.values()) - min(channel_entropies.values())
        if spread > 1.0:
            indicators.append(
                f"Channel entropy spread of {spread:.4f} — "
                "one channel may carry hidden data"
            )
            status = "suspicious"

    if tail_size > 0:
        indicators.append(
            f"{tail_size} bytes found {tail_method} — tail entropy: {tail_entropy}"
        )
        if tail_entropy and tail_entropy > 6.5:
            indicators.append(
                f"High tail entropy ({tail_entropy}) — "
                "appended data is likely encrypted or compressed"
            )
            status = "suspicious"

    return {
        "status":            "ok",
        "file_entropy":      file_entropy,
        "channel_entropies": channel_entropies,
        "tail_size_bytes":   tail_size,
        "tail_entropy":      tail_entropy,
        "tail_method":       tail_method,
        "indicators":        indicators,
        "suspicious":        status == "suspicious",
        "verdict": (
            "⚠️ Suspicious Entropy Pattern" if status == "suspicious"
            else "✅ Normal Entropy"
        ),
    }