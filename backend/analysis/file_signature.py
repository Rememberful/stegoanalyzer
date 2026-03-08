"""
File Signature Detection
Scans image binary for embedded file magic bytes.

Strategy:
- For PNG: scan after the IEND chunk (appended data)
- For JPEG: scan after the EOI marker (FFD9)
- Fallback: scan after first 512 bytes to skip image header region
- Returns structured findings with offset, type, and hex preview
"""
import os

MAGIC_SIGNATURES = {
    "EXE":   (b"\x4D\x5A",                    "Windows PE Executable"),
    "ELF":   (b"\x7F\x45\x4C\x46",            "ELF Executable (Linux)"),
    "ZIP":   (b"\x50\x4B\x03\x04",            "ZIP Archive"),
    "RAR":   (b"\x52\x61\x72\x21\x1A\x07",    "RAR Archive"),
    "7Z":    (b"\x37\x7A\xBC\xAF\x27\x1C",    "7-Zip Archive"),
    "GZ":    (b"\x1F\x8B\x08",                "GZIP Archive"),
    "PDF":   (b"\x25\x50\x44\x46",            "PDF Document"),
    "CAB":   (b"\x4D\x53\x43\x46",            "Microsoft Cabinet"),
    "CLASS": (b"\xCA\xFE\xBA\xBE",            "Java Class File"),
    "SQLITE":(b"\x53\x51\x4C\x69\x74\x65",   "SQLite Database"),
    "MACHO": (b"\xFE\xED\xFA\xCE",            "Mach-O Binary (macOS)"),
}

PNG_MAGIC = b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"
PNG_IEND  = b"\x49\x45\x4E\x44\xAE\x42\x60\x82"  # IEND + CRC
JPEG_SOI  = b"\xFF\xD8\xFF"
JPEG_EOI  = b"\xFF\xD9"


def _find_scan_start(content: bytes, image_path: str) -> tuple[int, str]:
    """
    Returns (offset, method) — where to start scanning for hidden signatures.
    """
    ext = os.path.splitext(image_path)[1].lower()

    if ext == ".png" or content[:8] == PNG_MAGIC:
        # Scan only after IEND — the safest boundary for PNG
        iend_pos = content.rfind(PNG_IEND)
        if iend_pos != -1:
            return iend_pos + len(PNG_IEND), "after_IEND"
        # IEND not found (corrupted?) — fallback to after magic bytes
        return 8, "after_PNG_magic_fallback"

    if ext in (".jpg", ".jpeg") or content[:3] == JPEG_SOI:
        # Scan after EOI (end of JPEG image data)
        eoi_pos = content.rfind(JPEG_EOI)
        if eoi_pos != -1:
            return eoi_pos + 2, "after_JPEG_EOI"
        return 512, "after_JPEG_header_fallback"

    # Unknown image type — skip first 512 bytes conservatively
    return 512, "generic_fallback"


def detect_appended_payload(image_path: str) -> dict:
    if not os.path.exists(image_path):
        return {"status": "error", "error": "File not found", "suspicious": False, "found": []}

    try:
        with open(image_path, "rb") as f:
            content = f.read()

        file_size = len(content)
        scan_start, scan_method = _find_scan_start(content, image_path)
        search_region = content[scan_start:]

        found = []
        for sig_name, (magic, description) in MAGIC_SIGNATURES.items():
            offset = 0
            while True:
                pos = search_region.find(magic, offset)
                if pos == -1:
                    break
                abs_offset = scan_start + pos
                found.append({
                    "type":        sig_name,
                    "description": description,
                    "offset":      abs_offset,
                    "offset_pct":  round(abs_offset / file_size * 100, 1),
                    "hex_preview": content[abs_offset: abs_offset + 8].hex().upper(),
                })
                offset = pos + 1  # keep scanning for multiple occurrences

        is_exe = any(f["type"] in ("EXE", "ELF", "MACHO") for f in found)

        return {
            "status":       "error_free",
            "suspicious":   len(found) > 0,
            "executable_found": is_exe,
            "scan_start_offset": scan_start,
            "scan_method":  scan_method,
            "file_size":    file_size,
            "found":        found,
            "verdict": (
                "🚨 Executable Detected" if is_exe
                else "⚠️ Embedded File Found" if found
                else "✅ Clean"
            ),
        }

    except Exception as e:
        return {
            "status":    "error",
            "error":     str(e),
            "suspicious": False,
            "found":     [],
        }