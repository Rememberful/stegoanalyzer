"""
Histogram Analysis
Primary method: pair-wise flattening test.
  In a natural image, hist[2k] != hist[2k+1] for most k.
  After LSB embedding, these pairs become nearly equal.
  We measure the mean absolute difference between adjacent pairs —
  a low value is suspicious.

Secondary method: smoothness deviation.
  Measures general histogram roughness as a supporting signal.

Both are computed per channel (R, G, B).
Raw histogram data is returned for frontend visualisation.
"""
import numpy as np
from PIL import Image


def _analyse_channel(plane: np.ndarray) -> dict:
    hist, _ = np.histogram(plane.flatten(), bins=256, range=(0, 256))
    total = hist.sum()
    hist_norm = hist / total if total > 0 else hist.astype(float)

    # ── Primary: pair-wise flattening ────────────────────────────────
    even = hist[0::2].astype(float)   # hist[0], hist[2], hist[4], ...
    odd  = hist[1::2].astype(float)   # hist[1], hist[3], hist[5], ...

    pair_sum = even + odd
    pair_sum[pair_sum == 0] = 1       # avoid div/0

    # Normalised absolute difference per pair — low = suspiciously flat
    pair_diff = np.abs(even - odd) / pair_sum
    mean_pair_diff = float(np.mean(pair_diff) * 100)

    # ── Secondary: smoothness deviation ──────────────────────────────
    smoothed = np.convolve(hist_norm, np.ones(3) / 3, mode="same")
    smoothness_deviation = float(np.mean(np.abs(hist_norm - smoothed)) * 100)

    # ── Verdict ───────────────────────────────────────────────────────
    # Low pair_diff = pairs are too equal = suspicious
    # Threshold: natural images typically score > 15% pair diff
    pair_suspicious = mean_pair_diff < 15.0

    return {
        "mean_pair_diff_pct":    round(mean_pair_diff, 4),
        "smoothness_deviation":  round(smoothness_deviation, 6),
        "pair_suspicious":       pair_suspicious,
        "histogram":             hist.tolist(),   # raw data for frontend chart
        "histogram_norm":        [round(v, 6) for v in hist_norm.tolist()],
    }


def histogram_analysis(image_path: str) -> dict:
    """
    Runs histogram analysis on all RGB channels.

    Args:
        image_path: path to image file

    Returns:
        dict with per-channel results, overall verdict, and raw histogram data
    """
    img = Image.open(image_path).convert("RGB")
    arr = np.array(img, dtype=np.uint8)

    channel_names = ["R", "G", "B"]
    channels = {}
    suspicious_count = 0

    for i, ch in enumerate(channel_names):
        result = _analyse_channel(arr[:, :, i])
        channels[ch] = result
        if result["pair_suspicious"]:
            suspicious_count += 1

    overall_suspicious = suspicious_count >= 2  # majority of channels

    return {
        "channels":          channels,
        "suspicious_channels": suspicious_count,
        "suspicious":        overall_suspicious,
        "verdict": (
            "⚠️ Suspicious — Pair-wise Flattening Detected"
            if overall_suspicious else "✅ Normal"
        ),
        # Flat summary for ML feature vector
        "mean_pair_diff_rgb": round(float(np.mean([
            channels[ch]["mean_pair_diff_pct"] for ch in channel_names
        ])), 4),
    }