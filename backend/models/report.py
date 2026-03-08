# models/report.py
"""
Report Models
Pydantic models that define the shape of all data flowing
through the system — from individual module results
to the final scan report returned by the API.

These are the single source of truth for data structure.
Both the orchestrator and FastAPI routes import from here.
"""
from pydantic import BaseModel, Field
from typing import Any, Optional
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────────

class ModuleStatus(str, Enum):
    """Possible outcomes for any analysis module."""
    CLEAN      = "clean"
    SUSPICIOUS = "suspicious"
    MALICIOUS  = "malicious"
    INFO       = "info"
    SKIPPED    = "skipped"
    ERROR      = "error"


class ThreatLevel(str, Enum):
    """Overall threat level for the final report."""
    CLEAN    = "CLEAN"
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


# ── Per-module result ─────────────────────────────────────────────────

class ModuleResult(BaseModel):
    """
    Standardised output from every analysis module.
    Every module must return something that matches this shape.
    """
    module:     str                         = Field(..., description="Module name")
    status:     ModuleStatus                = Field(..., description="Clean / suspicious / malicious / error")
    verdict:    str                         = Field(..., description="Human-readable one-line verdict")
    suspicious: bool                        = Field(False, description="Quick boolean flag for orchestrator")
    indicators: list[str]                   = Field(default_factory=list, description="List of suspicious findings")
    details:    dict[str, Any]              = Field(default_factory=dict, description="Full module output data")
    error:      Optional[str]               = Field(None, description="Error message if status is error")


# ── VirusTotal sub-model ──────────────────────────────────────────────

class VTResult(BaseModel):
    """Structured VirusTotal scan result."""
    status:           str                   = Field(..., description="ok / not_found / skipped / error / submitted")
    sha256:           Optional[str]         = None
    verdict:          str                   = ""
    threat_status:    Optional[str]         = None   # clean / suspicious / malicious
    malicious:        int                   = 0
    suspicious:       int                   = 0
    undetected:       int                   = 0
    harmless:         int                   = 0
    total_engines:    int                   = 0
    malicious_engines: dict[str, str]       = Field(default_factory=dict)
    suspicious_engines: dict[str, str]      = Field(default_factory=dict)
    reputation:       int                   = 0
    known_names:      list[str]             = Field(default_factory=list)
    tags:             list[str]             = Field(default_factory=list)
    indicators:       list[str]             = Field(default_factory=list)
    error:            Optional[str]         = None


# ── Indicator item ────────────────────────────────────────────────────

class Indicator(BaseModel):
    """A single suspicious finding, tagged with its source module."""
    module:    str  = Field(..., description="Which module raised this indicator")
    indicator: str  = Field(..., description="Human-readable description of the finding")


# ── Summary block ─────────────────────────────────────────────────────

class ScanSummary(BaseModel):
    """
    Aggregated threat assessment computed by the orchestrator.
    This is what the frontend uses to render the threat meter.
    """
    heuristic_score:    int         = Field(..., ge=0, le=10, description="0–10 overall threat score")
    threat_level:       ThreatLevel = Field(..., description="Final threat classification")
    stego_suspicion:    str         = Field(..., description="Human-readable confidence label")
    suspicious_modules: list[str]   = Field(default_factory=list, description="Names of modules that flagged suspicious")
    total_indicators:   int         = Field(0, description="Total number of indicators across all modules")
    indicators:         list[Indicator] = Field(default_factory=list, description="All indicators with module attribution")


# ── Payload info ──────────────────────────────────────────────────────

class PayloadInfo(BaseModel):
    """Details about an extracted payload file."""
    path:          str
    size_bytes:    int
    sha256:        str
    detected_type: str
    entropy:       float
    threat_score:  int  = 0
    verdict:       str  = ""


# ── Main scan report ──────────────────────────────────────────────────

class ScanReport(BaseModel):
    """
    The complete output of a full steganalysis scan.
    Returned by POST /api/scan and GET /api/scan/{hash}.
    """
    # ── File metadata ─────────────────────────────────────────────────
    status:            str              = Field("ok", description="Top-level status: ok / error")
    filename:          str
    file_hash:         str              = Field(..., description="SHA-256 of the original image")
    file_size_bytes:   int
    image_dimensions:  Optional[tuple[int, int]]  = None
    image_mode:        Optional[str]              = None
    image_format:      Optional[str]              = None

    # ── Per-module results ────────────────────────────────────────────
    # Keyed by module name for easy frontend lookup
    results: dict[str, Any] = Field(
        default_factory=dict,
        description="Per-module result dicts, keyed by module name"
    )

    # ── Aggregated summary ────────────────────────────────────────────
    summary:           ScanSummary

    # ── Payload ───────────────────────────────────────────────────────
    payload:           Optional[PayloadInfo]  = None

    # ── Sandbox files ─────────────────────────────────────────────────
    sandbox_files:     list[str]  = Field(
        default_factory=list,
        description="Paths of all files extracted to the sandbox during this scan"
    )

    class Config:
        use_enum_values = True   # serialise enums as strings in JSON


# ── API request/response wrappers ─────────────────────────────────────

class ScanError(BaseModel):
    """Returned when a scan fails at the API level."""
    status:  str = "error"
    message: str
    detail:  Optional[str] = None


class ScanStatus(BaseModel):
    """Lightweight status response for health checks."""
    status:  str = "ok"
    service: str = "StegoAnalyzer"
    version: str = "1.0.0"