# utils/image_utils.py
"""
Image Utilities
Shared PIL and NumPy helpers used across multiple analysis modules.
Centralising these avoids duplicate code and ensures consistent
image loading behaviour everywhere.
"""
import os
import numpy as np
from PIL import Image, UnidentifiedImageError
from backend.config import ALLOWED_EXTENSIONS


# ── Loading ───────────────────────────────────────────────────────────

def load_image(path: str) -> Image.Image:
    """
    Open and return a PIL Image.
    Raises ValueError with a clear message on failure.
    Always call this instead of Image.open() directly in analysis modules.
    """
    if not os.path.exists(path):
        raise ValueError(f"Image file not found: {path}")

    ext = os.path.splitext(path)[1].lstrip(".").lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '.{ext}'. "
            f"Allowed: {ALLOWED_EXTENSIONS}"
        )

    try:
        img = Image.open(path)
        img.verify()            # catches truncated / corrupt files
    except UnidentifiedImageError:
        raise ValueError(f"Cannot identify image file: {path}")
    except Exception as e:
        raise ValueError(f"Failed to open image: {e}")

    # Re-open after verify() — verify() closes the file pointer
    return Image.open(path)


def load_as_rgb(path: str) -> Image.Image:
    """Load image and convert to RGB (drops alpha, normalises mode)."""
    return load_image(path).convert("RGB")


def load_as_rgba(path: str) -> Image.Image:
    """Load image and convert to RGBA (preserves / adds alpha channel)."""
    return load_image(path).convert("RGBA")


def load_as_array(path: str, mode: str = "RGB") -> np.ndarray:
    """
    Load image directly as a uint8 NumPy array.

    Args:
        path: Image file path
        mode: PIL mode to convert to before converting to array
              'RGB'  → shape (H, W, 3)
              'RGBA' → shape (H, W, 4)
              'L'    → shape (H, W)    grayscale

    Returns:
        np.ndarray dtype uint8
    """
    img = load_image(path).convert(mode)
    return np.array(img, dtype=np.uint8)


# ── Channel splitting ─────────────────────────────────────────────────

def split_channels(arr: np.ndarray) -> dict[str, np.ndarray]:
    """
    Split an RGB or RGBA array into named channel planes.

    Args:
        arr: shape (H, W, C) where C is 3 or 4

    Returns:
        dict with keys 'R', 'G', 'B' and optionally 'A'
    """
    if arr.ndim != 3:
        raise ValueError(f"Expected 3D array, got shape {arr.shape}")

    labels = ["R", "G", "B", "A"][: arr.shape[2]]
    return {label: arr[:, :, i] for i, label in enumerate(labels)}


def get_channel(arr: np.ndarray, channel: str) -> np.ndarray:
    """
    Extract a single channel plane by name.

    Args:
        arr:     shape (H, W, C)
        channel: 'R', 'G', 'B', or 'A'
    """
    mapping = {"R": 0, "G": 1, "B": 2, "A": 3}
    if channel not in mapping:
        raise ValueError(f"Unknown channel '{channel}'. Use R, G, B, or A.")
    idx = mapping[channel]
    if idx >= arr.shape[2]:
        raise ValueError(
            f"Channel '{channel}' does not exist in array with {arr.shape[2]} channels"
        )
    return arr[:, :, idx]


# ── LSB helpers ───────────────────────────────────────────────────────

def extract_lsb_plane(channel: np.ndarray) -> np.ndarray:
    """
    Extract the LSB of every pixel in a channel.
    Returns a uint8 array of 0s and 1s, same shape as input.
    """
    return (channel & 1).astype(np.uint8)


def lsb_to_bytes(arr: np.ndarray, max_bytes: int | None = None) -> bytes:
    """
    Pack an LSB bit-plane into bytes (MSB first per byte).
    Optionally truncate to max_bytes.

    Args:
        arr:       2D or 3D uint8 array — only LSBs are used
        max_bytes: Maximum output bytes (None = no limit)

    Returns:
        Raw bytes from LSB bitstream
    """
    bits = (arr & 1).flatten()
    if max_bytes is not None:
        bits = bits[: max_bytes * 8]

    # Pad to multiple of 8
    pad = (8 - len(bits) % 8) % 8
    if pad:
        bits = np.concatenate([bits, np.zeros(pad, dtype=np.uint8)])

    return np.packbits(bits.reshape(-1, 8), axis=1).flatten().tobytes()


# ── Image info ────────────────────────────────────────────────────────

def image_info(path: str) -> dict:
    """
    Return basic image metadata without running any analysis.
    Safe to call on any supported image.
    """
    try:
        img = load_image(path)
        return {
            "filename":   os.path.basename(path),
            "format":     img.format,
            "mode":       img.mode,
            "width":      img.width,
            "height":     img.height,
            "total_pixels": img.width * img.height,
            "has_alpha":  img.mode in ("RGBA", "LA", "PA"),
            "file_size_bytes": os.path.getsize(path),
        }
    except Exception as e:
        return {"error": str(e)}


def has_alpha(path: str) -> bool:
    """Quick check — does this image have an alpha channel?"""
    try:
        return Image.open(path).mode in ("RGBA", "LA", "PA")
    except Exception:
        return False


def is_valid_image(path: str) -> bool:
    """
    Returns True if the file can be opened as a valid image.
    Uses PIL verify() — does not load pixel data.
    """
    try:
        img = Image.open(path)
        img.verify()
        return True
    except Exception:
        return False