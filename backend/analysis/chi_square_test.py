import numpy as np
from scipy.stats import chi2

def chi_square_test(img_array):
    """
    Performs a chi-square attack on LSB pairs per colour channel.
    Compares pixel pairs (0 vs 1), (2 vs 3), ..., (254 vs 255).
    In a natural image, hist[2k] != hist[2k+1].
    After LSB embedding, they become nearly equal — chi-square detects this.

    Args:
        img_array: numpy array, shape (H, W) or (H, W, C)

    Returns:
        dict with per-channel results and an overall verdict
    """
    if img_array is None or not isinstance(img_array, np.ndarray):
        raise ValueError("Input must be a numpy array")

    # Normalise to (H, W, C) shape
    if img_array.ndim == 2:
        channels = {"gray": img_array}
    elif img_array.ndim == 3:
        labels = ["R", "G", "B", "A"][: img_array.shape[2]]
        channels = {label: img_array[:, :, i] for i, label in enumerate(labels)}
    else:
        raise ValueError(f"Unexpected array shape: {img_array.shape}")

    channel_results = {}
    suspicious_count = 0

    for ch_name, plane in channels.items():
        hist, _ = np.histogram(plane.flatten(), bins=256, range=(0, 256))

        chi_stat = 0.0
        valid_pairs = 0

        for i in range(0, 256, 2):
            o1 = hist[i]
            o2 = hist[i + 1]
            total = o1 + o2

            if total == 0:
                continue

            expected = total / 2.0
            chi_stat += ((o1 - expected) ** 2 + (o2 - expected) ** 2) / expected
            valid_pairs += 1

        # Correct DoF: number of valid pairs minus 1
        dof = max(valid_pairs - 1, 1)
        p_value = float(1 - chi2.cdf(chi_stat, df=dof))
        is_suspicious = p_value < 0.05  # pairs too equal → likely LSB embedded

        if is_suspicious:
            suspicious_count += 1

        channel_results[ch_name] = {
            "chi_stat": round(chi_stat, 4),
            "p_value": round(p_value, 6),
            "degrees_of_freedom": dof,
            "valid_pairs": valid_pairs,
            "suspicious": is_suspicious,
        }

    return {
        "channels": channel_results,
        "suspicious_channels": suspicious_count,
        # Flag overall if majority of channels are suspicious
        "suspicious": suspicious_count >= max(1, len(channels) // 2),
        "verdict": "⚠️ Suspicious" if suspicious_count > 0 else "✅ Normal",
    }