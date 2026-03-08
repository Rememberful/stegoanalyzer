# alpha_channel.py
"""
Alpha Channel Entropy Analysis
The alpha (transparency) channel is frequently overlooked but is a
prime steganography target — many tools ignore it entirely.

Checks:
  - Whether an alpha channel exists
  - LSB distribution of alpha channel (50/50 = suspicious)
  - LSB autocorrelation (near 0 = random = suspicious)
  - Entropy of the alpha channel
  - Whether alpha values are purely binary (0 or 255 only)
    vs having intermediate values (more room for hidden data)
"""
import os
import math
import numpy as np
from collections import Counter
from PIL import Image


def _shannon_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    total  = len(data)
    return round(
        -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0),
        4,
    )


def analyse_alpha_channel(image_path: str) -> dict:
    """
    Analyses the alpha channel of an image for steganographic indicators.

    Returns structured result — never raises.
    """
    if not os.path.exists(image_path):
        return {"status": "error", "error": "File not found"}

    try:
        img = Image.open(image_path)
    except Exception as e:
        return {"status": "error", "error": f"Cannot open image: {e}"}

    # Check if image has an alpha channel
    if img.mode not in ("RGBA", "LA", "PA"):
        return {
            "status":     "ok",
            "has_alpha":  False,
            "suspicious": False,
            "verdict":    "ℹ️ No alpha channel present",
        }

    try:
        arr   = np.array(img.convert("RGBA"), dtype=np.uint8)
        alpha = arr[:, :, 3]
    except Exception as e:
        return {"status": "error", "error": f"Failed to extract alpha channel: {e}"}

    total_pixels = alpha.size

    # ── Basic statistics ──────────────────────────────────────────────
    unique_vals    = np.unique(alpha)
    is_uniform     = len(unique_vals) == 1
    is_binary      = set(unique_vals.tolist()).issubset({0, 255})
    entropy        = _shannon_entropy(alpha.flatten().tobytes())

    # ── LSB analysis ──────────────────────────────────────────────────
    lsb            = (alpha & 1).astype(np.float32)
    lsb_ones_pct   = round(float(np.mean(lsb) * 100), 4)
    lsb_deviation  = round(abs(lsb_ones_pct - 50.0), 4)

    flat = lsb.flatten()
    if len(flat) > 1:
        autocorr = round(float(np.corrcoef(flat[:-1], flat[1:])[0, 1]), 6)
    else:
        autocorr = 0.0

    # ── Intermediate value analysis ───────────────────────────────────
    # Real transparency uses 0 and 255 mostly.
    # Intermediate values (1-254) offer space for hidden data.
    intermediate   = [v for v in unique_vals.tolist() if 0 < v < 255]
    intermediate_pixels = int(np.sum((alpha > 0) & (alpha < 255)))
    intermediate_pct    = round(intermediate_pixels / total_pixels * 100, 4)

    # ── Indicators ────────────────────────────────────────────────────
    indicators = []
    status     = "clean"

    if not is_uniform and lsb_deviation < 5.0:
        indicators.append(
            f"Alpha LSB near 50/50 ({lsb_ones_pct}% ones) — "
            "consistent with random LSB embedding"
        )
        status = "suspicious"

    if abs(autocorr) < 0.01 and not is_uniform:
        indicators.append(
            f"Alpha LSB autocorrelation near zero ({autocorr}) — "
            "random pattern consistent with steganography"
        )
        status = "suspicious"

    if not is_binary and entropy > 3.0:
        indicators.append(
            f"Alpha channel has {len(intermediate)} intermediate values "
            f"({intermediate_pct}% of pixels) with entropy {entropy} — "
            "non-binary alpha is unusual"
        )
        status = "suspicious"

    if is_uniform and unique_vals[0] == 255:
        # Fully opaque — alpha carries no visual info, ideal for hiding data
        # Not suspicious on its own but worth noting
        pass

    return {
        "status":               "ok",
        "has_alpha":            True,
        "suspicious":           status == "suspicious",
        "verdict": (
            "⚠️ Suspicious Alpha Channel Pattern" if status == "suspicious"
            else "✅ Normal Alpha Channel"
        ),
        "entropy":              entropy,
        "unique_value_count":   int(len(unique_vals)),
        "is_uniform":           bool(is_uniform),
        "is_binary_only":       bool(is_binary),
        "intermediate_pixels":  intermediate_pixels,
        "intermediate_pct":     intermediate_pct,
        "lsb_ones_pct":         lsb_ones_pct,
        "lsb_deviation":        lsb_deviation,
        "lsb_autocorr":         autocorr,
        "indicators":           indicators,
        "total_pixels":         total_pixels,
    }