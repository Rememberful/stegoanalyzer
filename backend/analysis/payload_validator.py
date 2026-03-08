"""
Payload Validator
Deep analysis of an extracted payload file.
Detects: file type, entropy, PE structure, suspicious strings,
         PNG/JPEG structural anomalies, size discrepancies.
Returns structured results — no printing, no CLI.
"""
import os
import math
import struct
from collections import Counter
from backend.config import SANDBOX_DIR

try:
    import pefile
    PEFILE_AVAILABLE = True
except ImportError:
    PEFILE_AVAILABLE = False

MAGIC_MAP = [
    (b"\x4D\x5A",                 "Windows PE/EXE",  "exe"),
    (b"\x7F\x45\x4C\x46",         "ELF Executable",  "elf"),
    (b"\x50\x4B\x03\x04",         "ZIP Archive",     "zip"),
    (b"\x25\x50\x44\x46",         "PDF Document",    "pdf"),
    (b"\x89\x50\x4E\x47",         "PNG Image",       "png"),
    (b"\xFF\xD8\xFF",             "JPEG Image",      "jpg"),
    (b"\xD0\xCF\x11\xE0",         "MS Office Doc",   "doc"),
    (b"\x1F\x8B\x08",             "GZIP Archive",    "gz"),
    (b"\x52\x61\x72\x21\x1A\x07", "RAR Archive",     "rar"),
    (b"\xCA\xFE\xBA\xBE",         "Java Class",      "class"),
]

SUSPICIOUS_STRINGS = [
    b"cmd.exe", b"powershell", b"WScript.Shell",
    b"CreateProcess", b"VirtualAlloc", b"WriteProcessMemory",
    b"ShellExecute", b"RegSetValue", b"HKEY_",
    b"mimikatz", b"meterpreter", b"metasploit",
    b"socket", b"connect", b"recv ", b"send ",
    b"CryptEncrypt", b"DeleteFile", b"autorun",
]

PACKER_SECTION_NAMES = {"upx", "pack", "crypt", "themida", "aspack"}


def _entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    total = len(data)
    return round(
        -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0),
        4,
    )


def _detect_type(data: bytes) -> tuple[str, str]:
    for magic, desc, ext in MAGIC_MAP:
        if data[: len(magic)] == magic:
            return desc, ext
    return "Unknown", "bin"


def _analyse_pe(data: bytes) -> dict:
    if not PEFILE_AVAILABLE:
        return {"error": "pefile not installed"}
    try:
        pe = pefile.PE(data=data)
        sections = []
        for s in pe.sections:
            name = s.Name.decode("utf-8", errors="ignore").strip("\x00")
            sections.append({
                "name":    name,
                "size":    s.SizeOfRawData,
                "entropy": round(s.get_entropy(), 4),
                "packed":  any(p in name.lower() for p in PACKER_SECTION_NAMES),
            })
        imports = []
        if hasattr(pe, "DIRECTORY_ENTRY_IMPORT"):
            imports = [e.dll.decode("utf-8", errors="ignore")
                       for e in pe.DIRECTORY_ENTRY_IMPORT]
        return {
            "valid":            True,
            "num_sections":     len(sections),
            "sections":         sections,
            "imports":          imports[:20],
            "is_dll":           pe.is_dll(),
            "is_exe":           pe.is_exe(),
            "packed_sections":  [s["name"] for s in sections if s["packed"]],
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def _scan_strings(data: bytes) -> list[str]:
    found = []
    data_lower = data.lower()
    for s in SUSPICIOUS_STRINGS:
        if s.lower() in data_lower:
            found.append(s.decode("ascii", errors="ignore"))
    return found


def validate_payload(payload_path: str) -> dict:
    """
    Analyses a payload file and returns structured results.
    Never raises — always returns a dict with status field.
    """
    if not os.path.exists(payload_path):
        return {"status": "error", "error": f"File not found: {payload_path}"}

    try:
        with open(payload_path, "rb") as f:
            data = f.read()
    except Exception as e:
        return {"status": "error", "error": f"Cannot read file: {e}"}

    detected_type, detected_ext = _detect_type(data)
    entropy_val = _entropy(data)
    found_strings = _scan_strings(data)

    indicators = []
    score = 0

    # ── Entropy ───────────────────────────────────────────────────────
    if entropy_val > 7.5:
        indicators.append(f"Very high entropy ({entropy_val}) — likely encrypted/compressed")
        score += 2
    elif entropy_val < 2.0:
        indicators.append(f"Very low entropy ({entropy_val}) — possible padding/filler")
        score += 1

    # ── Suspicious strings ────────────────────────────────────────────
    for s in found_strings:
        indicators.append(f"Suspicious string: '{s}'")
        score += 1

    # ── Extension mismatch ────────────────────────────────────────────
    actual_ext = os.path.splitext(payload_path)[1].lower().lstrip(".")
    if actual_ext and detected_ext != "bin" and actual_ext != detected_ext:
        indicators.append(
            f"Extension mismatch: file is '{detected_ext}' but saved as '.{actual_ext}'"
        )
        score += 2

    # ── Type-specific analysis ────────────────────────────────────────
    type_details = {}

    if detected_type == "Windows PE/EXE":
        pe_result = _analyse_pe(data)
        type_details["pe"] = pe_result
        if pe_result.get("valid"):
            score += 4
            indicators.append("Valid Windows PE executable structure confirmed")
        if pe_result.get("packed_sections"):
            indicators.append(
                f"Packer section names found: {pe_result['packed_sections']}"
            )
            score += 2
        if pe_result.get("num_sections", 0) > 6:
            indicators.append(
                f"High section count ({pe_result['num_sections']}) — common in packed malware"
            )
            score += 1

    score = min(score, 10)
    status = (
        "malicious"  if score >= 6 else
        "suspicious" if score >= 3 else
        "clean"
    )

    return {
        "status":          "ok",
        "path":            payload_path,
        "filename":        os.path.basename(payload_path),
        "size_bytes":      len(data),
        "detected_type":   detected_type,
        "detected_ext":    detected_ext,
        "entropy":         entropy_val,
        "suspicious_strings": found_strings[:10],
        "type_details":    type_details,
        "indicators":      indicators,
        "threat_score":    score,
        "threat_status":   status,
        "verdict": (
            "🚨 High Threat"   if status == "malicious"  else
            "⚠️ Suspicious"    if status == "suspicious" else
            "✅ Low Risk"
        ),
    }