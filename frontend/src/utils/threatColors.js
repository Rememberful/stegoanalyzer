// src/utils/threatColors.js
/**
 * threatColors.js
 * ──────────────────────────────────────────────────────────────────
 * Single source of truth for all threat-level and module-status
 * colours, labels, and display config.
 *
 * Every component that needs to colour-code a threat level or
 * module status imports from here — never hardcodes colours.
 *
 * Threat levels  (from backend summary.threat_level):
 *   CLEAN | LOW | MEDIUM | HIGH | CRITICAL
 *
 * Module statuses (from backend results[module].status):
 *   clean | suspicious | malicious | info | skipped | error
 * ──────────────────────────────────────────────────────────────────
 */


// ════════════════════════════════════════════════════════════════════
// THREAT LEVEL CONFIG
// ════════════════════════════════════════════════════════════════════

export const THREAT_CONFIG = {
  CLEAN: {
    label:       "Clean",
    sublabel:    "No significant indicators found",
    emoji:       "✅",
    color:       "var(--color-clean)",
    bg:          "var(--color-clean-bg)",
    border:      "var(--color-clean-border)",
    // Score gauge arc colour
    gaugeColor:  "#16a34a",
    // For inline styles where CSS vars don't work (e.g. SVG)
    hex:         "#16a34a",
    hexBg:       "#f0fdf4",
  },

  LOW: {
    label:       "Low Risk",
    sublabel:    "Minor anomalies — unlikely to contain payload",
    emoji:       "🟢",
    color:       "var(--color-low)",
    bg:          "var(--color-low-bg)",
    border:      "var(--color-low-border)",
    gaugeColor:  "#65a30d",
    hex:         "#65a30d",
    hexBg:       "#f7fee7",
  },

  MEDIUM: {
    label:       "Medium Risk",
    sublabel:    "Several suspicious indicators detected",
    emoji:       "🟡",
    color:       "var(--color-medium)",
    bg:          "var(--color-medium-bg)",
    border:      "var(--color-medium-border)",
    gaugeColor:  "#d97706",
    hex:         "#d97706",
    hexBg:       "#fffbeb",
  },

  HIGH: {
    label:       "High Risk",
    sublabel:    "Strong indicators of hidden payload",
    emoji:       "🟠",
    color:       "var(--color-high)",
    bg:          "var(--color-high-bg)",
    border:      "var(--color-high-border)",
    gaugeColor:  "#ea580c",
    hex:         "#ea580c",
    hexBg:       "#fff7ed",
  },

  CRITICAL: {
    label:       "Critical",
    sublabel:    "Almost certainly contains hidden malicious payload",
    emoji:       "🔴",
    color:       "var(--color-critical)",
    bg:          "var(--color-critical-bg)",
    border:      "var(--color-critical-border)",
    gaugeColor:  "#dc2626",
    hex:         "#dc2626",
    hexBg:       "#fef2f2",
  },
};


// ════════════════════════════════════════════════════════════════════
// MODULE STATUS CONFIG
// ════════════════════════════════════════════════════════════════════

export const MODULE_STATUS_CONFIG = {
  clean: {
    label:   "Clean",
    color:   "var(--color-clean)",
    bg:      "var(--color-clean-bg)",
    border:  "var(--color-clean-border)",
    hex:     "#16a34a",
    hexBg:   "#f0fdf4",
    dot:     "#16a34a",
  },

  suspicious: {
    label:   "Suspicious",
    color:   "var(--color-suspicious)",
    bg:      "var(--color-medium-bg)",
    border:  "var(--color-medium-border)",
    hex:     "#d97706",
    hexBg:   "#fffbeb",
    dot:     "#d97706",
  },

  malicious: {
    label:   "Malicious",
    color:   "var(--color-malicious)",
    bg:      "var(--color-critical-bg)",
    border:  "var(--color-critical-border)",
    hex:     "#dc2626",
    hexBg:   "#fef2f2",
    dot:     "#dc2626",
  },

  info: {
    label:   "Info",
    color:   "var(--color-info)",
    bg:      "var(--color-info-bg)",
    border:  "var(--color-info-border)",
    hex:     "#0891b2",
    hexBg:   "#ecfeff",
    dot:     "#0891b2",
  },

  skipped: {
    label:   "Skipped",
    color:   "var(--color-text-muted)",
    bg:      "var(--color-bg-secondary)",
    border:  "var(--color-border)",
    hex:     "#94a3b8",
    hexBg:   "#f1f5f9",
    dot:     "#94a3b8",
  },

  error: {
    label:   "Error",
    color:   "var(--color-critical)",
    bg:      "var(--color-critical-bg)",
    border:  "var(--color-critical-border)",
    hex:     "#dc2626",
    hexBg:   "#fef2f2",
    dot:     "#dc2626",
  },

  // "not_found" and "submitted" come from VT module
  not_found: {
    label:   "Not Found",
    color:   "var(--color-text-muted)",
    bg:      "var(--color-bg-secondary)",
    border:  "var(--color-border)",
    hex:     "#94a3b8",
    hexBg:   "#f1f5f9",
    dot:     "#94a3b8",
  },

  submitted: {
    label:   "Submitted",
    color:   "var(--color-info)",
    bg:      "var(--color-info-bg)",
    border:  "var(--color-info-border)",
    hex:     "#0891b2",
    hexBg:   "#ecfeff",
    dot:     "#0891b2",
  },

  ok: {
    label:   "OK",
    color:   "var(--color-clean)",
    bg:      "var(--color-clean-bg)",
    border:  "var(--color-clean-border)",
    hex:     "#16a34a",
    hexBg:   "#f0fdf4",
    dot:     "#16a34a",
  },
};


// ════════════════════════════════════════════════════════════════════
// SCORE → COLOUR GRADIENT
// Maps a 0–10 heuristic score to an interpolated hex colour.
// Used by ThreatMeter gauge needle and score number.
// ════════════════════════════════════════════════════════════════════

const SCORE_STOPS = [
  { score: 0,  hex: "#16a34a" },  // green  — clean
  { score: 2,  hex: "#65a30d" },  // lime   — low
  { score: 4,  hex: "#d97706" },  // amber  — medium
  { score: 6,  hex: "#ea580c" },  // orange — high
  { score: 8,  hex: "#dc2626" },  // red    — critical
  { score: 10, hex: "#991b1b" },  // dark red
];

/**
 * Interpolate a hex colour for any score 0–10.
 * @param {number} score  0–10
 * @returns {string}      hex colour string e.g. "#ea580c"
 */
export function scoreToColor(score) {
  const clamped = Math.max(0, Math.min(10, score));

  // Find the two stops this score falls between
  for (let i = 0; i < SCORE_STOPS.length - 1; i++) {
    const lo = SCORE_STOPS[i];
    const hi = SCORE_STOPS[i + 1];

    if (clamped >= lo.score && clamped <= hi.score) {
      const t = (clamped - lo.score) / (hi.score - lo.score);
      return _lerpHex(lo.hex, hi.hex, t);
    }
  }

  return SCORE_STOPS[SCORE_STOPS.length - 1].hex;
}

/** Linear interpolation between two hex colours. */
function _lerpHex(hexA, hexB, t) {
  const a = _hexToRgb(hexA);
  const b = _hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bv = Math.round(a.b + (b.b - a.b) * t);
  return `#${_toHex(r)}${_toHex(g)}${_toHex(bv)}`;
}

function _hexToRgb(hex) {
  const v = parseInt(hex.replace("#", ""), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function _toHex(n) {
  return n.toString(16).padStart(2, "0");
}


// ════════════════════════════════════════════════════════════════════
// LOOKUP HELPERS
// ════════════════════════════════════════════════════════════════════

/**
 * Get the full config object for a threat level string.
 * Falls back to CLEAN if level is unrecognised.
 *
 * @param  {string} level  e.g. "CRITICAL", "medium", "clean"
 * @returns {Object}       THREAT_CONFIG entry
 */
export function getThreatConfig(level) {
  if (!level) return THREAT_CONFIG.CLEAN;
  return THREAT_CONFIG[level.toUpperCase()] ?? THREAT_CONFIG.CLEAN;
}

/**
 * Get the full config object for a module status string.
 * Falls back to "info" if status is unrecognised.
 *
 * @param  {string} status  e.g. "suspicious", "clean", "error"
 * @returns {Object}        MODULE_STATUS_CONFIG entry
 */
export function getStatusConfig(status) {
  if (!status) return MODULE_STATUS_CONFIG.info;
  return MODULE_STATUS_CONFIG[status.toLowerCase()] ?? MODULE_STATUS_CONFIG.info;
}

/**
 * Map a numeric score (0–10) to the corresponding threat level key.
 *
 * @param  {number} score
 * @returns {string}  "CLEAN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
 */
export function scoreToThreatLevel(score) {
  if (score >= 8) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 4) return "MEDIUM";
  if (score >= 2) return "LOW";
  return "CLEAN";
}

/**
 * Convenience — get threat config directly from a numeric score.
 *
 * @param  {number} score  0–10
 * @returns {Object}       THREAT_CONFIG entry
 */
export function getThreatConfigFromScore(score) {
  return getThreatConfig(scoreToThreatLevel(score));
}

/**
 * Returns true if the given module status is considered "bad"
 * (i.e. should draw the examiner's attention).
 *
 * @param  {string} status
 * @returns {boolean}
 */
export function isBadStatus(status) {
  return ["suspicious", "malicious", "error"].includes(status?.toLowerCase());
}