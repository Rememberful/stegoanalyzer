"""
config.py
Single source of truth for all configurable values.
Reads from .env file if present, falls back to safe defaults.
"""
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ── Paths ─────────────────────────────────────────────────────────────
SANDBOX_DIR   = os.getenv("SANDBOX_DIR",  "sandbox")
UPLOAD_DIR    = os.getenv("UPLOAD_DIR",   "uploads")

# ── File limits ───────────────────────────────────────────────────────
MAX_FILE_SIZE_MB    = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_EXTRACT_BYTES   = int(os.getenv("MAX_EXTRACT_BYTES", str(5 * 1024 * 1024)))  # 5MB
SIGNATURE_SCAN_LIMIT = int(os.getenv("SIGNATURE_SCAN_LIMIT", "8192"))            # 8KB

# ── Allowed uploads ───────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp"}

# ── VirusTotal ────────────────────────────────────────────────────────
VIRUSTOTAL_API_KEY     = os.getenv("VIRUSTOTAL_API_KEY", "")
VIRUSTOTAL_UPLOAD_NEW  = os.getenv("VIRUSTOTAL_UPLOAD_NEW", "false").lower() == "true"

# ── Analysis thresholds (tunable without touching module code) ────────
LSB_BALANCE_THRESHOLD     = float(os.getenv("LSB_BALANCE_THRESHOLD",  "5.0"))
LSB_AUTOCORR_THRESHOLD    = float(os.getenv("LSB_AUTOCORR_THRESHOLD", "0.01"))
ENTROPY_HIGH_THRESHOLD    = float(os.getenv("ENTROPY_HIGH_THRESHOLD", "7.2"))
ENTROPY_LOW_THRESHOLD     = float(os.getenv("ENTROPY_LOW_THRESHOLD",  "2.0"))
HISTOGRAM_PAIR_THRESHOLD  = float(os.getenv("HISTOGRAM_PAIR_THRESHOLD","15.0"))
CHI_SQUARE_P_THRESHOLD    = float(os.getenv("CHI_SQUARE_P_THRESHOLD", "0.05"))