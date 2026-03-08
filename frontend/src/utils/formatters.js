// src/utils/formatters.js
/**
 * formatters.js
 * ──────────────────────────────────────────────────────────────────
 * Pure formatting functions — no side effects, no imports.
 * Used across multiple components for consistent display of:
 *   - File sizes
 *   - Hashes / hex strings
 *   - Percentages
 *   - Entropy values
 *   - Image dimensions
 *   - Module names
 *   - Numbers and scores
 * ──────────────────────────────────────────────────────────────────
 */


// ════════════════════════════════════════════════════════════════════
// FILE SIZE
// ════════════════════════════════════════════════════════════════════

/**
 * Convert a byte count to a human-readable string.
 *
 * @param  {number} bytes
 * @param  {number} decimals  decimal places (default 1)
 * @returns {string}  e.g. "1.4 MB", "320 KB", "0 B"
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes == null || isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i     = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
  const idx   = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, idx);

  return `${value.toFixed(idx === 0 ? 0 : decimals)} ${units[idx]}`;
}


// ════════════════════════════════════════════════════════════════════
// HASHES & HEX
// ════════════════════════════════════════════════════════════════════

/**
 * Shorten a long hash for display — shows first and last N chars.
 *
 * @param  {string} hash
 * @param  {number} chars  chars to show at each end (default 8)
 * @returns {string}  e.g. "a3f9e21b...d4c702ec"
 */
export function truncateHash(hash, chars = 8) {
  if (!hash) return "—";
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Format a hex string with spaces every 2 chars for readability.
 *
 * @param  {string} hex  raw hex string e.g. "4D5A9000"
 * @returns {string}     e.g. "4D 5A 90 00"
 */
export function formatHex(hex) {
  if (!hex) return "—";
  return hex.match(/.{1,2}/g)?.join(" ") ?? hex;
}

/**
 * Uppercase a hex string — consistent display convention.
 *
 * @param  {string} hex
 * @returns {string}
 */
export function upperHex(hex) {
  return hex?.toUpperCase() ?? "—";
}


// ════════════════════════════════════════════════════════════════════
// NUMBERS & PERCENTAGES
// ════════════════════════════════════════════════════════════════════

/**
 * Format a number as a percentage string.
 *
 * @param  {number} value     raw value (e.g. 82.7234)
 * @param  {number} decimals  (default 2)
 * @returns {string}  e.g. "82.72%"
 */
export function formatPct(value, decimals = 2) {
  if (value == null || isNaN(value)) return "—";
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format a Shannon entropy value.
 *
 * @param  {number} value
 * @param  {number} decimals  (default 4)
 * @returns {string}  e.g. "7.4231"
 */
export function formatEntropy(value, decimals = 4) {
  if (value == null || isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

/**
 * Format a threat / confidence score out of 10.
 *
 * @param  {number} score  0–10
 * @returns {string}  e.g. "7/10"
 */
export function formatScore(score) {
  if (score == null || isNaN(score)) return "—";
  return `${score}/10`;
}

/**
 * Format a generic number with thousands separators.
 *
 * @param  {number} value
 * @returns {string}  e.g. "1,048,576"
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return "—";
  return Number(value).toLocaleString();
}

/**
 * Round a float to N decimal places, return as string.
 *
 * @param  {number} value
 * @param  {number} decimals  (default 2)
 * @returns {string}
 */
export function formatFloat(value, decimals = 2) {
  if (value == null || isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}


// ════════════════════════════════════════════════════════════════════
// IMAGE
// ════════════════════════════════════════════════════════════════════

/**
 * Format image dimensions tuple for display.
 *
 * @param  {Array|null} dims  [width, height] from backend
 * @returns {string}  e.g. "1920 × 1080"
 */
export function formatDimensions(dims) {
  if (!dims || !Array.isArray(dims) || dims.length < 2) return "—";
  return `${dims[0].toLocaleString()} × ${dims[1].toLocaleString()}`;
}

/**
 * Calculate total pixel count from dimensions.
 *
 * @param  {Array|null} dims  [width, height]
 * @returns {string}  e.g. "2,073,600 px"
 */
export function formatPixelCount(dims) {
  if (!dims || dims.length < 2) return "—";
  return `${(dims[0] * dims[1]).toLocaleString()} px`;
}


// ════════════════════════════════════════════════════════════════════
// MODULE NAMES
// ════════════════════════════════════════════════════════════════════

// Map internal module keys → human-readable display labels
const MODULE_LABELS = {
  lsb_noise:           "LSB Noise Analysis",
  histogram:           "Histogram Analysis",
  chi_square:          "Chi-Square Test",
  entropy:             "Entropy Calculator",
  feature_extractor:   "Feature Extractor",
  alpha_channel:       "Alpha Channel Analysis",
  file_signature:      "File Signature Detection",
  metadata:            "Metadata Analysis",
  hidden_signature:    "Hidden Signature Checker",
  lsb_extractor:       "LSB Extractor",
  rebuild_payload:     "Payload Reconstruction",
  payload_validator:   "Payload Validator",
  virustotal_payload:  "VirusTotal — Payload",
  virustotal_image:    "VirusTotal — Image",
};

/**
 * Convert a backend module key to a readable display label.
 *
 * @param  {string} key  e.g. "chi_square", "virustotal_payload"
 * @returns {string}     e.g. "Chi-Square Test"
 */
export function moduleLabel(key) {
  if (!key) return "Unknown Module";
  return (
    MODULE_LABELS[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Short description for each module — shown as subtitle on ModuleCard.
 */
const MODULE_DESCRIPTIONS = {
  lsb_noise:           "Checks LSB distribution balance across RGB channels",
  histogram:           "Detects pair-wise histogram flattening from embedding",
  chi_square:          "Statistical test for randomness in pixel value pairs",
  entropy:             "Shannon entropy on file, channels, and appended tail",
  feature_extractor:   "ML-ready feature vector — autocorrelation and moments",
  alpha_channel:       "LSB analysis of the transparency channel",
  file_signature:      "Scans for embedded file magic bytes after image end",
  metadata:            "EXIF, PNG chunks, and post-IEND data inspection",
  hidden_signature:    "Full-file scan for any hidden file signatures",
  lsb_extractor:       "Extracts raw LSB bitstream from all RGB channels",
  rebuild_payload:     "Reconstructs typed file from LSB bitstream",
  payload_validator:   "Deep inspection of extracted payload — PE, strings",
  virustotal_payload:  "VirusTotal hash lookup on extracted payload",
  virustotal_image:    "VirusTotal hash lookup on the original image",
};

/**
 * Get the short description for a module.
 *
 * @param  {string} key
 * @returns {string}
 */
export function moduleDescription(key) {
  return MODULE_DESCRIPTIONS[key] ?? "";
}


// ════════════════════════════════════════════════════════════════════
// STRINGS
// ════════════════════════════════════════════════════════════════════

/**
 * Capitalise the first letter of a string.
 *
 * @param  {string} str
 * @returns {string}
 */
export function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate a string to maxLen characters, appending "…" if cut.
 *
 * @param  {string} str
 * @param  {number} maxLen  (default 60)
 * @returns {string}
 */
export function truncateStr(str, maxLen = 60) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Convert a snake_case or kebab-case string to Title Case.
 *
 * @param  {string} str  e.g. "file_signature_detection"
 * @returns {string}     e.g. "File Signature Detection"
 */
export function toTitleCase(str) {
  if (!str) return "";
  return str
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Safely get a nested value from an object without crashing.
 * Useful for reading deep report fields.
 *
 * @param  {Object} obj
 * @param  {string} path   dot-separated path e.g. "summary.threat_level"
 * @param  {*}      fallback  returned if path doesn't exist
 * @returns {*}
 */
export function deepGet(obj, path, fallback = null) {
  try {
    return path
      .split(".")
      .reduce((acc, key) => acc?.[key], obj) ?? fallback;
  } catch {
    return fallback;
  }
}
