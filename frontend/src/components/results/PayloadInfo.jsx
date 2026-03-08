// src/components/results/PayloadInfo.jsx
/**
 * PayloadInfo
 * Displays metadata about an extracted payload file.
 * Shown only when the backend successfully reconstructed a payload.
 *
 * Props:
 *   payload  {Object}  report.payload from ScanReport
 */
import React           from "react";
import { FileWarning,
         Download }    from "lucide-react";
import Badge           from "../shared/Badge";
import { formatBytes,
         truncateHash,
         formatEntropy,
         formatScore } from "../../utils/formatters";
import { sandboxDownloadUrl } from "../../api/scanApi";

export default function PayloadInfo({ payload }) {
  if (!payload) return null;

  const dlUrl = payload.path
    ? sandboxDownloadUrl(payload.path.split(/[\\/]/).pop())
    : null;

  const rows = [
    { label: "File size",     value: formatBytes(payload.size_bytes ?? payload.size)          },
    { label: "Detected type", value: payload.detected_type || "Unknown" },
    { label: "Entropy",       value: formatEntropy(payload.entropy)     },
    { label: "Threat score",  value: formatScore(payload.threat_score)  },
    {
      label: "SHA-256",
      value: truncateHash(payload.sha256, 10),
      mono:  true,
      full:  payload.sha256,
    },
  ];

  // Map numeric score → threat level key for Badge
  function scoreToLevel(score) {
    if (score >= 8) return "CRITICAL";
    if (score >= 6) return "HIGH";
    if (score >= 4) return "MEDIUM";
    if (score >= 2) return "LOW";
    return "CLEAN";
  }

  return (
    <div style={styles.wrapper}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.iconWrap}>
          <FileWarning size={20} color="var(--color-critical)" />
        </div>
        <div style={styles.headerText}>
          <p style={styles.title}>Payload Extracted</p>
          <p style={styles.subtitle}>
            The backend reconstructed a hidden file from the image's LSB stream.
          </p>
        </div>
      </div>

      {/* ── Metadata rows ────────────────────────────────────── */}
      <div style={styles.table}>
        {rows.map(({ label, value, mono, full }) => (
          <div key={label} style={styles.row}>
            <span style={styles.rowLabel}>{label}</span>
            <span
              title={full || value}
              style={{
                ...styles.rowValue,
                fontFamily: mono ? "var(--font-mono)" : "inherit",
                fontSize:   mono ? "0.75rem"          : "0.8125rem",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Threat level badge ───────────────────────────────── */}
      {payload.threat_score != null && (
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>Payload threat level:</span>
          <Badge
            level={scoreToLevel(payload.threat_score)}
            size="sm"
          />
        </div>
      )}

      {/* ── Download button ──────────────────────────────────── */}
      {dlUrl && (
        <a
          href={dlUrl}
          download
          style={styles.dlBtn}
          title="Download extracted payload — handle with care"
        >
          <Download size={15} />
          Download Payload
          <span style={styles.dlWarning}>⚠ handle with care</span>
        </a>
      )}

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1rem",
    padding:        "1.25rem",
    background:     "var(--color-critical-bg)",
    border:         "1px solid var(--color-critical-border)",
    borderRadius:   "var(--radius-lg)",
  },
  header: {
    display:        "flex",
    gap:            "0.75rem",
    alignItems:     "flex-start",
  },
  iconWrap: {
    width:          "38px",
    height:         "38px",
    borderRadius:   "var(--radius-md)",
    background:     "#fff",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    border:         "1px solid var(--color-critical-border)",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize:       "0.9375rem",
    fontWeight:     700,
    color:          "var(--color-critical)",
  },
  subtitle: {
    fontSize:       "0.8125rem",
    color:          "var(--color-text-secondary)",
    marginTop:      "2px",
    lineHeight:     1.4,
  },
  table: {
    display:        "flex",
    flexDirection:  "column",
    borderRadius:   "var(--radius-md)",
    border:         "1px solid var(--color-critical-border)",
    overflow:       "hidden",
    background:     "#fff",
  },
  row: {
    display:               "grid",
    gridTemplateColumns:   "120px 1fr",
    padding:               "0.45rem 0.875rem",
    borderBottom:          "1px solid var(--color-critical-border)",
    gap:                   "1rem",
    alignItems:            "center",
  },
  rowLabel: {
    fontSize:       "0.75rem",
    fontWeight:     600,
    color:          "var(--color-text-muted)",
  },
  rowValue: {
    color:          "var(--color-text)",
    wordBreak:      "break-all",
  },
  scoreRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.5rem",
  },
  scoreLabel: {
    fontSize:       "0.8125rem",
    fontWeight:     500,
    color:          "var(--color-text-secondary)",
  },
  dlBtn: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "0.4rem",
    padding:        "0.5rem 1rem",
    background:     "var(--color-critical)",
    color:          "#fff",
    borderRadius:   "var(--radius-md)",
    fontSize:       "0.875rem",
    fontWeight:     600,
    textDecoration: "none",
    alignSelf:      "flex-start",
    transition:     "background var(--transition)",
  },
  dlWarning: {
    fontSize:       "0.7rem",
    opacity:        0.8,
    marginLeft:     "4px",
  },
};