"""
LSB Noise Analysis
Analyses the statistical distribution of LSBs across all RGB channels.

Two signals:
1. Balance test  — natural images have slight LSB imbalance (~45-55%).
                   Near-perfect 50/50 indicates randomised embedding.
2. Autocorrelation — natural images have slightly positive LSB autocorr
                     (texture continuity). After embedding it drops near 0.

PE extraction logic → payload_validator.py
LSB byte extraction → lsb_extractor.py
"""
import numpy as np
from PIL import Image


def _analyse_channel(plane: np.ndarray, name: str) -> dict:
    lsb = (plane & 1).astype(np.float32)

    total = lsb.size
    ones  = int(lsb.sum())
    zeros = total - ones

    pct_ones  = round(float(ones  / total * 100), 4)
    pct_zeros = round(float(zeros / total * 100), 4)
    deviation = round(abs(pct_ones - 50.0), 4)

    # Autocorrelation on flattened LSB plane
    flat = lsb.flatten()
    if len(flat) > 1:
        autocorr = float(np.corrcoef(flat[:-1], flat[1:])[0, 1])
    else:
        autocorr = 0.0
    autocorr = round(autocorr, 6)

    # Balance suspicious: deviation from 50/50 < 5%
    balance_suspicious = deviation < 5.0

    # Autocorr suspicious: near zero means randomised bits
    autocorr_suspicious = abs(autocorr) < 0.01

    return {
        "channel":            name,
        "total_pixels":       total,
        "lsb_ones":           ones,
        "lsb_zeros":          zeros,
        "pct_ones":           pct_ones,
        "pct_zeros":          pct_zeros,
        "deviation_from_50":  deviation,
        "lsb_autocorr":       autocorr,
        "balance_suspicious": balance_suspicious,
        "autocorr_suspicious":autocorr_suspicious,
        "suspicious":         balance_suspicious or autocorr_suspicious,
    }


def lsb_noise_analysis(image_path: str) -> dict:
    """
    Runs LSB noise analysis on all RGB channels.

    Args:
        image_path: path to the image file

    Returns:
        Per-channel results, overall verdict, and suspicion flag.
    """
    img = Image.open(image_path).convert("RGB")
    arr = np.array(img, dtype=np.uint8)

    channel_names = ["R", "G", "B"]
    channels = {}
    suspicious_count = 0

    for i, name in enumerate(channel_names):
        result = _analyse_channel(arr[:, :, i], name)
        channels[name] = result
        if result["suspicious"]:
            suspicious_count += 1

    overall = suspicious_count >= 2

    return {
        "channels":           channels,
        "suspicious_channels": suspicious_count,
        "suspicious":         overall,
        "verdict": (
            "⚠️ Suspicious LSB Distribution" if overall else "✅ Normal"
        ),
    }