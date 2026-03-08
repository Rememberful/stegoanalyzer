"""
Feature Extractor
Computes a rich feature vector from the image for steganalysis.
Each feature is independently sourced — no black-box imports.
This output can feed an ML classifier or be used standalone.
"""
import os
import math
import numpy as np
from PIL import Image
from collections import Counter


def _shannon_entropy(data: np.ndarray) -> float:
    """Shannon entropy in bits. Works on any flattened array of integers."""
    flat = data.flatten().astype(np.uint8)
    counts = Counter(flat.tobytes())
    total = len(flat)
    return -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0)


def _lsb_stats(plane: np.ndarray) -> dict:
    """LSB distribution and autocorrelation for a single channel."""
    lsb = (plane & 1).astype(float)
    ones_pct = float(np.mean(lsb) * 100)
    flat = lsb.flatten()
    # Autocorrelation: natural images have slightly positive, stego drops near 0
    if len(flat) > 1:
        autocorr = float(np.corrcoef(flat[:-1], flat[1:])[0, 1])
    else:
        autocorr = 0.0
    return {
        "lsb_ones_pct": round(ones_pct, 4),
        "lsb_autocorr": round(autocorr, 6),
    }


def _noise_residual(plane: np.ndarray) -> float:
    """Laplacian variance as a proxy for noise — drops after LSB manipulation."""
    from PIL import ImageFilter
    img_ch = Image.fromarray(plane.astype(np.uint8))
    lap = np.array(img_ch.filter(ImageFilter.FIND_EDGES), dtype=float)
    return round(float(np.var(lap)), 4)


def _pixel_moments(plane: np.ndarray) -> dict:
    """Mean, std, skewness, kurtosis for a channel."""
    mu = float(np.mean(plane))
    sigma = float(np.std(plane)) + 1e-9
    norm = (plane - mu) / sigma
    return {
        "mean":     round(mu, 4),
        "std":      round(float(np.std(plane)), 4),
        "skewness": round(float(np.mean(norm ** 3)), 4),
        "kurtosis": round(float(np.mean(norm ** 4)), 4),
    }


def extract_features(image_path: str) -> dict:
    """
    Returns a feature dict for the given image.
    Raises ValueError on bad input, RuntimeError on processing failure.
    """
    if not os.path.exists(image_path):
        raise ValueError(f"Image not found: {image_path}")

    img = Image.open(image_path).convert("RGB")
    arr = np.array(img, dtype=np.uint8)

    features = {
        "filename":       os.path.basename(image_path),
        "file_size":      os.path.getsize(image_path),
        "image_width":    img.width,
        "image_height":   img.height,
        "total_pixels":   img.width * img.height,
        "mode":           img.mode,
    }

    channel_names = ["R", "G", "B"]
    channel_features = {}

    for i, ch in enumerate(channel_names):
        plane = arr[:, :, i]
        channel_features[ch] = {
            **_pixel_moments(plane),
            **_lsb_stats(plane),
            "entropy":        round(_shannon_entropy(plane), 6),
            "noise_residual": _noise_residual(plane),
        }

    features["channels"] = channel_features

    # Cross-channel summary features (useful for quick ML input)
    features["mean_lsb_autocorr"] = round(
        float(np.mean([channel_features[ch]["lsb_autocorr"] for ch in channel_names])), 6
    )
    features["mean_entropy"] = round(
        float(np.mean([channel_features[ch]["entropy"] for ch in channel_names])), 6
    )
    features["entropy_spread"] = round(
        float(np.std([channel_features[ch]["entropy"] for ch in channel_names])), 6
    )

    # Suspicion flags (not labels — just boolean signals for the orchestrator)
    features["flags"] = {
        "low_lsb_autocorr": features["mean_lsb_autocorr"] < 0.01,
        "high_entropy":     features["mean_entropy"] > 7.2,
        "entropy_imbalance": features["entropy_spread"] > 0.3,
    }

    return features