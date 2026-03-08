"""
Metadata Analysis
Extracts and analyses EXIF metadata (JPEG) and PNG chunk structure.
Flags:
  - Steganography tool fingerprints in EXIF fields
  - Suspicious/oversized PNG text chunks (tEXt, zTXt, iTXt)
  - Data appended after IEND
  - Missing expected EXIF fields (unusual for real camera photos)
"""
import os
import struct
from PIL import Image, ExifTags

SUSPICIOUS_EXIF_KEYS = {
    "Software", "UserComment", "MakerNote",
    "ImageDescription", "Artist", "Copyright", "Comment",
}

STEGO_TOOL_KEYWORDS = [
    "steghide", "stegsolve", "stegcloak", "openstego",
    "outguess", "jsteg", "invisible", "lsb", "steg",
]

PNG_TEXT_CHUNKS = {"tEXt", "zTXt", "iTXt"}


def _parse_exif(img: Image.Image) -> dict:
    """Safely extract EXIF from any image format."""
    try:
        raw = img.getexif()          # public API — works on JPEG, PNG, TIFF
        if not raw:
            return {}
        return {
            ExifTags.TAGS.get(tag_id, str(tag_id)): str(value)[:256]
            for tag_id, value in raw.items()
        }
    except Exception:
        return {}


def _check_exif_anomalies(exif: dict) -> list[str]:
    indicators = []

    for key, value in exif.items():
        val_lower = value.lower()
        # Check for stego tool keywords in any field
        for kw in STEGO_TOOL_KEYWORDS:
            if kw in val_lower:
                indicators.append(
                    f"Stego tool keyword '{kw}' found in EXIF field '{key}'"
                )
        # Flag suspicious fields with non-trivial content
        if key in SUSPICIOUS_EXIF_KEYS and len(value) > 8:
            indicators.append(
                f"Suspicious EXIF field '{key}': {value[:80]}"
            )

    # Absence check: real camera photos almost always have these
    expected = {"Make", "Model", "DateTime"}
    missing = expected - set(exif.keys())
    if missing and len(exif) > 3:
        # Has EXIF but missing basic camera fields — could be synthetically added
        indicators.append(
            f"EXIF present but missing expected camera fields: {', '.join(missing)}"
        )

    return indicators


def _parse_png_chunks(image_path: str) -> dict:
    """Parse all PNG chunks and flag suspicious ones."""
    chunks = []
    suspicious = []
    data_after_iend = 0

    try:
        with open(image_path, "rb") as f:
            sig = f.read(8)
            if sig != b"\x89PNG\r\n\x1a\n":
                return {"error": "Not a valid PNG file"}

            while True:
                header = f.read(8)
                if len(header) < 8:
                    break

                length, chunk_type_raw = struct.unpack(">I4s", header)
                chunk_type = chunk_type_raw.decode("ascii", errors="replace")
                chunk_data = f.read(length)
                f.read(4)  # CRC

                preview = None
                if chunk_type in PNG_TEXT_CHUNKS:
                    # Decode text content for preview
                    try:
                        preview = chunk_data.split(b"\x00", 1)[-1].decode(
                            "utf-8", errors="ignore"
                        )[:128]
                    except Exception:
                        preview = chunk_data[:32].hex()

                chunks.append({
                    "type":    chunk_type,
                    "length":  length,
                    "preview": preview,
                })

                if chunk_type in PNG_TEXT_CHUNKS:
                    suspicious.append({
                        "type":    chunk_type,
                        "length":  length,
                        "preview": preview,
                    })

                if chunk_type == "IEND":
                    # Check for appended data after IEND + CRC
                    remaining = f.read()
                    data_after_iend = len(remaining)
                    break

    except Exception as e:
        return {"error": str(e)}

    return {
        "chunks":           chunks,
        "chunk_count":      len(chunks),
        "suspicious_chunks": suspicious,
        "data_after_iend":  data_after_iend,
    }


def analyse_metadata(image_path: str) -> dict:
    """
    Full metadata analysis for PNG and JPEG images.
    Returns structured results with indicators for the orchestrator.
    """
    if not os.path.exists(image_path):
        return {"status": "error", "error": "File not found"}

    try:
        img = Image.open(image_path)
    except Exception as e:
        return {"status": "error", "error": f"Cannot open image: {e}"}

    ext = os.path.splitext(image_path)[1].lower()
    indicators = []
    details: dict = {
        "status":  "ok",
        "format":  img.format,
        "mode":    img.mode,
        "size":    img.size,
    }

    # ── EXIF ─────────────────────────────────────────────────────────
    exif = _parse_exif(img)
    details["exif"] = exif
    details["exif_field_count"] = len(exif)

    exif_flags = _check_exif_anomalies(exif)
    indicators.extend(exif_flags)

    # ── PNG chunks ────────────────────────────────────────────────────
    if ext == ".png" or img.format == "PNG":
        png = _parse_png_chunks(image_path)
        details["png"] = png

        if png.get("suspicious_chunks"):
            for ch in png["suspicious_chunks"]:
                indicators.append(
                    f"PNG text chunk '{ch['type']}' found ({ch['length']} bytes)"
                )
        if png.get("data_after_iend", 0) > 0:
            indicators.append(
                f"{png['data_after_iend']} bytes appended after IEND — "
                "possible hidden payload"
            )

    details["indicators"] = indicators
    details["suspicious"]  = len(indicators) > 0
    details["verdict"] = (
        "⚠️ Suspicious Metadata" if indicators else "✅ Clean Metadata"
    )

    return details