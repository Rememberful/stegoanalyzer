// src/components/upload/UploadProgress.jsx
/**
 * UploadProgress
 * Shows upload progress and scanning state after a file is chosen.
 *
 * Props:
 *   phase     {string}  "uploading" | "scanning"
 *   progress  {number}  0–100 upload percentage
 *   filename  {string}  name of the file being scanned
 *   filesize  {number}  size in bytes
 *   onCancel  {Function} optional cancel / reset callback
 */
import React            from "react";
import { FileImage, X } from "lucide-react";
import Spinner          from "../shared/Spinner";
import { formatBytes }  from "../../utils/formatters";

const PHASE_MESSAGES = {
  uploading: "Uploading image to server…",
  scanning:  "Running steganalysis pipeline…",
};

const SCAN_STEPS = [
  "LSB noise analysis",
  "Histogram analysis",
  "Chi-square test",
  "Entropy calculation",
  "File signature scan",
  "Metadata inspection",
  "Hidden payload search",
  "VirusTotal lookup",
];

export default function UploadProgress({
  phase,
  progress = 0,
  filename = "image.png",
  filesize = 0,
  onCancel,
}) {
  const isUploading = phase === "uploading";
  const isScanning  = phase === "scanning";
  const clampedPct  = Math.min(100, Math.max(0, progress));

  return (
    <div style={styles.wrapper} role="status" aria-live="polite">

      {/* ── File info row ─────────────────────────────────────── */}
      <div style={styles.fileRow}>
        <div style={styles.fileIcon}>
          <FileImage size={20} color="var(--color-primary)" />
        </div>

        <div style={styles.fileMeta}>
          <span style={styles.fileName}>{filename}</span>
          <span style={styles.fileSize}>{formatBytes(filesize)}</span>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            style={styles.cancelBtn}
            title="Cancel and start over"
            aria-label="Cancel scan"
          >
            <X size={16} color="var(--color-text-muted)" />
          </button>
        )}
      </div>

      {/* ── Upload progress bar ───────────────────────────────── */}
      {isUploading && (
        <div style={styles.section}>
          <div style={styles.barHeader}>
            <span style={styles.barLabel}>Uploading</span>
            <span style={styles.barPct}>{clampedPct}%</span>
          </div>
          <div style={styles.track}>
            <div
              style={{
                ...styles.fill,
                width:      `${clampedPct}%`,
                background: "var(--color-primary)",
              }}
            />
          </div>
          <p style={styles.phaseMsg}>{PHASE_MESSAGES.uploading}</p>
        </div>
      )}

      {/* ── Scanning state ────────────────────────────────────── */}
      {isScanning && (
        <div style={styles.section}>
          {/* Indeterminate animated bar */}
          <div style={styles.barHeader}>
            <span style={styles.barLabel}>Analysing</span>
            <span style={styles.barPct}>Running…</span>
          </div>
          <div style={styles.track}>
            <div style={styles.indeterminate} />
          </div>

          {/* Spinner + message */}
          <div style={styles.scanningRow}>
            <Spinner size={18} label="Scanning" />
            <p style={styles.phaseMsg}>{PHASE_MESSAGES.scanning}</p>
          </div>

          {/* Steps checklist */}
          <div style={styles.steps}>
            {SCAN_STEPS.map((step, i) => (
              <div key={step} style={styles.step}>
                <span style={styles.stepDot}>
                  <svg width="8" height="8" viewBox="0 0 8 8">
                    <circle
                      cx="4" cy="4" r="3"
                      fill="var(--color-primary)"
                      style={{
                        animation: `pulse ${1 + i * 0.15}s ease-in-out infinite`,
                      }}
                    />
                  </svg>
                </span>
                <span style={styles.stepLabel}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1.25rem",
    padding:        "1.5rem",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-xl)",
    boxShadow:      "var(--shadow-sm)",
    animation:      "fadeIn 0.25s ease forwards",
  },
  fileRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.75rem",
  },
  fileIcon: {
    width:          "40px",
    height:         "40px",
    borderRadius:   "var(--radius-md)",
    background:     "var(--color-primary-light)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  fileMeta: {
    flex:           1,
    display:        "flex",
    flexDirection:  "column",
    gap:            "2px",
    minWidth:       0,
  },
  fileName: {
    fontSize:       "0.9375rem",
    fontWeight:     600,
    color:          "var(--color-text)",
    overflow:       "hidden",
    textOverflow:   "ellipsis",
    whiteSpace:     "nowrap",
  },
  fileSize: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-muted)",
  },
  cancelBtn: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "32px",
    height:         "32px",
    borderRadius:   "var(--radius-md)",
    border:         "1px solid var(--color-border)",
    background:     "var(--color-surface)",
    cursor:         "pointer",
    flexShrink:     0,
    transition:     "background var(--transition)",
  },
  section: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.6rem",
  },
  barHeader: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  barLabel: {
    fontSize:       "0.8125rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },
  barPct: {
    fontSize:       "0.8125rem",
    fontWeight:     600,
    color:          "var(--color-primary)",
    fontFamily:     "var(--font-mono)",
  },
  track: {
    width:          "100%",
    height:         "6px",
    background:     "var(--color-bg-secondary)",
    borderRadius:   "var(--radius-full)",
    overflow:       "hidden",
  },
  fill: {
    height:         "100%",
    borderRadius:   "var(--radius-full)",
    transition:     "width 0.3s ease",
  },
  // Indeterminate sliding bar for scanning phase
  indeterminate: {
    height:         "100%",
    width:          "40%",
    background:     "var(--color-primary)",
    borderRadius:   "var(--radius-full)",
    animation:      "indeterminate 1.4s ease-in-out infinite",
  },
  phaseMsg: {
    fontSize:       "0.8125rem",
    color:          "var(--color-text-secondary)",
  },
  scanningRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.6rem",
  },
  steps: {
    display:        "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap:            "0.4rem 1rem",
    marginTop:      "0.25rem",
  },
  step: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.4rem",
  },
  stepDot: {
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
  },
  stepLabel: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-secondary)",
  },
};