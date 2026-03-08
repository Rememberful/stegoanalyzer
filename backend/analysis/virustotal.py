# virustotal.py
"""
VirusTotal Malware Signature Checker
Uses VirusTotal API v3 to check files by hash.
Hash-first approach — only uploads if explicitly enabled.
Never stores or transmits the original image — only SHA-256 hash.
"""
import os
import requests
from backend.config import VIRUSTOTAL_API_KEY, VIRUSTOTAL_UPLOAD_NEW
from backend.utils.file_utils import sha256_of_file, sha256_of_bytes

VT_BASE = "https://www.virustotal.com/api/v3"


def _headers() -> dict:
    return {"x-apikey": VIRUSTOTAL_API_KEY}


def _check_hash(file_hash: str) -> dict:
    """Query VT for an existing report by SHA-256 hash."""
    try:
        resp = requests.get(
            f"{VT_BASE}/files/{file_hash}",
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code == 200:
            return {"found": True, "data": resp.json()}
        if resp.status_code == 404:
            return {"found": False}
        return {"error": f"VT returned HTTP {resp.status_code}"}
    except requests.exceptions.Timeout:
        return {"error": "VT request timed out"}
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot reach VirusTotal — check internet connection"}
    except Exception as e:
        return {"error": str(e)}


def _upload_file(file_path: str) -> dict:
    """Upload file to VT for a fresh scan. Only called if VIRUSTOTAL_UPLOAD_NEW=true."""
    try:
        with open(file_path, "rb") as f:
            resp = requests.post(
                f"{VT_BASE}/files",
                headers=_headers(),
                files={"file": (os.path.basename(file_path), f)},
                timeout=60,
            )
        if resp.status_code == 200:
            return {"submitted": True, "data": resp.json()}
        return {"error": f"Upload failed: HTTP {resp.status_code}"}
    except Exception as e:
        return {"error": f"Upload error: {e}"}


def _parse_report(vt_data: dict) -> dict:
    """Extract meaningful fields from a VT file report response."""
    attrs  = vt_data.get("data", {}).get("attributes", {})
    stats  = attrs.get("last_analysis_stats", {})
    results = attrs.get("last_analysis_results", {})

    malicious_engines = {
        engine: res.get("result", "malicious")
        for engine, res in results.items()
        if res.get("category") == "malicious"
    }
    suspicious_engines = {
        engine: res.get("result", "suspicious")
        for engine, res in results.items()
        if res.get("category") == "suspicious"
    }

    return {
        "malicious":          stats.get("malicious",  0),
        "suspicious":         stats.get("suspicious", 0),
        "undetected":         stats.get("undetected", 0),
        "harmless":           stats.get("harmless",   0),
        "total_engines":      sum(stats.values()),
        "malicious_engines":  malicious_engines,
        "suspicious_engines": suspicious_engines,
        "reputation":         attrs.get("reputation", 0),
        "known_names":        attrs.get("names", [])[:5],
        "tags":               attrs.get("tags", []),
    }


def scan_file(file_path: str) -> dict:
    """
    Main entry point. Checks VT by hash, optionally uploads if not found.

    Args:
        file_path: Path to the file to check

    Returns:
        Structured result dict — never raises.
    """
    if not os.path.exists(file_path):
        return {
            "status":  "error",
            "error":   f"File not found: {file_path}",
        }

    if not VIRUSTOTAL_API_KEY:
        return {
            "status":  "skipped",
            "reason":  "No VIRUSTOTAL_API_KEY set in .env",
            "verdict": "⚠️ VT scan skipped — no API key",
        }

    file_hash = sha256_of_file(file_path)

    # ── Step 1: Check by hash ─────────────────────────────────────────
    result = _check_hash(file_hash)

    if "error" in result:
        return {
            "status":    "error",
            "sha256":    file_hash,
            "error":     result["error"],
            "verdict":   "❌ VT lookup failed",
        }

    if not result["found"]:
        # ── Step 2: Optionally upload ─────────────────────────────────
        if VIRUSTOTAL_UPLOAD_NEW:
            upload = _upload_file(file_path)
            if "error" in upload:
                return {
                    "status":  "error",
                    "sha256":  file_hash,
                    "error":   upload["error"],
                    "verdict": "❌ VT upload failed",
                }
            return {
                "status":  "submitted",
                "sha256":  file_hash,
                "verdict": "ℹ️ File submitted to VT — check back in ~1 minute",
                "note":    "No existing report found. File queued for analysis.",
            }
        return {
            "status":  "not_found",
            "sha256":  file_hash,
            "verdict": "ℹ️ No VT report found for this file",
            "note":    "File hash not in VirusTotal database",
        }

    # ── Step 3: Parse existing report ────────────────────────────────
    parsed    = _parse_report(result["data"])
    malicious = parsed["malicious"]
    total     = parsed["total_engines"]
    indicators = []

    if malicious > 0:
        indicators.append(
            f"Detected as malicious by {malicious}/{total} engines"
        )
        for engine, det in list(parsed["malicious_engines"].items())[:5]:
            indicators.append(f"  → {engine}: {det}")

    threat_status = (
        "malicious"  if malicious >= 3 else
        "suspicious" if malicious >= 1 or parsed["suspicious"] >= 2 else
        "clean"
    )

    return {
        "status":       "ok",
        "sha256":       file_hash,
        "threat_status": threat_status,
        "indicators":   indicators,
        "verdict": (
            f"🚨 {malicious}/{total} engines flagged this file" if malicious > 0
            else f"✅ Clean — 0/{total} detections"
        ),
        **parsed,
    }


def scan_bytes(data: bytes) -> dict:
    """
    Scan raw bytes by hash only (no file path needed).
    Useful for checking extracted payloads without writing to disk first.
    """
    if not VIRUSTOTAL_API_KEY:
        return {
            "status":  "skipped",
            "reason":  "No API key",
            "verdict": "⚠️ VT scan skipped",
        }

    file_hash = sha256_of_bytes(data)
    result    = _check_hash(file_hash)

    if "error" in result:
        return {"status": "error", "sha256": file_hash, "error": result["error"]}
    if not result["found"]:
        return {"status": "not_found", "sha256": file_hash,
                "verdict": "ℹ️ No VT report found"}

    parsed    = _parse_report(result["data"])
    malicious = parsed["malicious"]
    total     = parsed["total_engines"]

    return {
        "status":        "ok",
        "sha256":        file_hash,
        "threat_status": "malicious" if malicious >= 3 else
                         "suspicious" if malicious >= 1 else "clean",
        "verdict": (
            f"🚨 {malicious}/{total} engines flagged this"
            if malicious > 0 else f"✅ Clean — 0/{total} detections"
        ),
        **parsed,
    }