// src/components/sandbox/SandboxPanel.jsx
/**
 * SandboxPanel
 * Displays all files extracted to the backend sandbox directory.
 * Allows downloading individual files or clearing the sandbox.
 *
 * Props:
 *   reportHash  {string}  optional — auto-refreshes when a new scan completes
 */
import React, { useEffect, useState } from "react";
import {
  FolderOpen, Download, Trash2,
  RefreshCw, FileText, Shield,
  AlertTriangle, Package,
}                                      from "lucide-react";
import Spinner                         from "../shared/Spinner";
import ErrorBanner                     from "../shared/ErrorBanner";
import Badge                           from "../shared/Badge";
import useSandbox                      from "../../hooks/useSandbox";
import { formatBytes, truncateHash }   from "../../utils/formatters";

export default function SandboxPanel({ reportHash }) {
  const {
    files,
    total,
    loading,
    error,
    refresh,
    clear,
    downloadFile,
    isEmpty,
  } = useSandbox();

  const [clearing, setClearing] = useState(false);
  const [cleared,  setCleared]  = useState(false);

  // ── Auto-refresh whenever a new scan completes ────────────────
  useEffect(() => {
    refresh();
  }, [reportHash, refresh]);

  // ── Clear with confirmation ───────────────────────────────────
  const handleClear = async () => {
    if (!window.confirm("Delete all sandbox files? This cannot be undone.")) return;
    setClearing(true);
    await clear();
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div style={styles.wrapper}>

      {/* ── Panel header ──────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <FolderOpen size={18} color="var(--color-primary)" />
          </div>
          <div>
            <p style={styles.headerTitle}>Sandbox Files</p>
            <p style={styles.headerSub}>
              Payloads extracted during analysis
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={styles.headerActions}>
          <button
            onClick={refresh}
            disabled={loading}
            style={styles.iconBtn}
            title="Refresh file list"
            aria-label="Refresh"
          >
            <RefreshCw
              size={15}
              color="var(--color-text-secondary)"
              style={{ animation: loading ? "spin 0.75s linear infinite" : "none" }}
            />
          </button>

          {!isEmpty && (
            <button
              onClick={handleClear}
              disabled={clearing || loading}
              style={{ ...styles.iconBtn, ...styles.dangerIconBtn }}
              title="Delete all sandbox files"
              aria-label="Clear sandbox"
            >
              {clearing
                ? <Spinner size={15} />
                : <Trash2 size={15} color="var(--color-critical)" />
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={refresh}
          compact
        />
      )}

      {/* ── Cleared confirmation ──────────────────────────────── */}
      {cleared && (
        <div style={styles.clearedMsg}>
          ✅ Sandbox cleared successfully.
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────── */}
      {loading && !files.length && (
        <div style={styles.loadingWrap}>
          <Spinner size={22} label="Loading sandbox files…" caption />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!loading && isEmpty && !error && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <Package size={28} color="var(--color-text-muted)" />
          </div>
          <p style={styles.emptyTitle}>No sandbox files</p>
          <p style={styles.emptyText}>
            Files will appear here when the backend extracts
            a payload from an analysed image.
          </p>
        </div>
      )}

      {/* ── File list ─────────────────────────────────────────── */}
      {!isEmpty && (
        <>
          {/* Summary bar */}
          <div style={styles.summaryBar}>
            <span style={styles.summaryText}>
              {total} file{total !== 1 ? "s" : ""} in sandbox
            </span>
            <span style={styles.warningText}>
              <AlertTriangle size={12} color="var(--color-medium)" />
              These files may be malicious — download with care
            </span>
          </div>

          {/* File rows */}
          <div style={styles.fileList}>
            {files.map((file, idx) => (
              <FileRow
                key={file.filename || idx}
                file={file}
                onDownload={() => downloadFile(file.filename)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// FILE ROW
// ════════════════════════════════════════════════════════════════════

/**
 * Single file entry in the sandbox list.
 *
 * file shape from backend:
 *   { filename, size_bytes, size_human, sha256, detected_type, entropy }
 */
function FileRow({ file, onDownload }) {
  const [expanded, setExpanded] = useState(false);

  const icon      = getFileIcon(file.filename, file.detected_type);
  const threatBadge = getThreatBadge(file.detected_type);

  return (
    <div style={styles.fileRow}>

      {/* ── Main row ─────────────────────────────────────────── */}
      <div style={styles.fileMain}>

        {/* File type icon */}
        <div style={styles.fileIconWrap}>
          {icon}
        </div>

        {/* Name + size */}
        <div style={styles.fileMeta}>
          <span style={styles.fileName} title={file.filename}>
            {file.filename}
          </span>
          <span style={styles.fileSub}>
            {file.size_human || formatBytes(file.size_bytes)}
            {file.detected_type && (
              <> &nbsp;·&nbsp; {file.detected_type}</>
            )}
          </span>
        </div>

        {/* Threat badge */}
        {threatBadge && (
          <Badge status={threatBadge.status} label={threatBadge.label} size="sm" />
        )}

        {/* Actions */}
        <div style={styles.fileActions}>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={styles.fileBtn}
            title="Show file details"
            aria-label="Toggle details"
          >
            <FileText size={14} color="var(--color-text-muted)" />
          </button>
          <button
            onClick={onDownload}
            style={{ ...styles.fileBtn, ...styles.dlFileBtn }}
            title="Download this file"
            aria-label={`Download ${file.filename}`}
          >
            <Download size={14} color="#fff" />
          </button>
        </div>
      </div>

      {/* ── Expanded details ─────────────────────────────────── */}
      {expanded && (
        <div style={styles.fileDetails}>
          <DetailRow label="SHA-256"       value={file.sha256 || "—"}          mono />
          <DetailRow label="Entropy"       value={file.entropy != null
                                              ? Number(file.entropy).toFixed(4)
                                              : "—"}                            mono />
          <DetailRow label="Detected type" value={file.detected_type || "Unknown"} />
          <DetailRow label="Size"          value={file.size_human
                                              || formatBytes(file.size_bytes)} />
        </div>
      )}
    </div>
  );
}


// ── Detail row inside expanded file card ─────────────────────────
function DetailRow({ label, value, mono }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={{
        ...styles.detailValue,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        fontSize:   mono ? "0.7rem"           : "0.75rem",
        wordBreak:  "break-all",
      }}>
        {value}
      </span>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

/** Pick an icon based on file extension / detected type */
function getFileIcon(filename = "", detectedType = "") {
  const ext  = filename.split(".").pop()?.toLowerCase();
  const type = detectedType.toLowerCase();

  const color = type.includes("pe")  || ext === "exe" || ext === "dll"
    ? "var(--color-critical)"
    : type.includes("zip") || type.includes("archive")
    ? "var(--color-medium)"
    : "var(--color-info)";

  return (
    <Shield
      size={18}
      color={color}
      style={{ flexShrink: 0 }}
    />
  );
}

/** Return a badge config based on detected file type */
function getThreatBadge(detectedType = "") {
  const t = detectedType.toLowerCase();
  if (t.includes("pe") || t.includes("exe") || t.includes("dll")) {
    return { status: "malicious",   label: "PE Executable" };
  }
  if (t.includes("zip") || t.includes("rar") || t.includes("archive")) {
    return { status: "suspicious",  label: "Archive"       };
  }
  if (t.includes("pdf")) {
    return { status: "suspicious",  label: "PDF"           };
  }
  if (t.includes("script") || t.includes("sh") || t.includes("ps1")) {
    return { status: "malicious",   label: "Script"        };
  }
  if (!detectedType || t === "unknown" || t === "binary") {
    return { status: "info",        label: "Unknown"       };
  }
  return null;
}


// ════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════
const styles = {
  wrapper: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.875rem",
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            "1rem",
  },
  headerLeft: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.75rem",
  },
  headerIcon: {
    width:          "36px",
    height:         "36px",
    borderRadius:   "var(--radius-md)",
    background:     "var(--color-primary-light)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    border:         "1px solid var(--color-primary-border)",
  },
  headerTitle: {
    fontSize:       "0.9375rem",
    fontWeight:     600,
    color:          "var(--color-text)",
    lineHeight:     1.2,
  },
  headerSub: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-muted)",
  },
  headerActions: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.375rem",
  },
  iconBtn: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "32px",
    height:         "32px",
    borderRadius:   "var(--radius-md)",
    border:         "1px solid var(--color-border)",
    background:     "var(--color-surface)",
    cursor:         "pointer",
    transition:     "background var(--transition)",
    flexShrink:     0,
  },
  dangerIconBtn: {
    borderColor:    "var(--color-critical-border)",
    background:     "var(--color-critical-bg)",
  },

  // ── States ────────────────────────────────────────────────────
  loadingWrap: {
    display:        "flex",
    justifyContent: "center",
    padding:        "2rem 0",
  },
  emptyState: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "0.5rem",
    padding:        "2.5rem 1rem",
    background:     "var(--color-bg-secondary)",
    borderRadius:   "var(--radius-lg)",
    border:         "1px dashed var(--color-border-strong)",
    textAlign:      "center",
  },
  emptyIcon: {
    width:          "52px",
    height:         "52px",
    borderRadius:   "50%",
    background:     "var(--color-bg)",
    border:         "1px solid var(--color-border)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   "0.25rem",
  },
  emptyTitle: {
    fontSize:       "0.9375rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },
  emptyText: {
    fontSize:       "0.8125rem",
    color:          "var(--color-text-muted)",
    maxWidth:       "260px",
    lineHeight:     1.5,
  },
  clearedMsg: {
    padding:        "0.5rem 0.875rem",
    background:     "var(--color-clean-bg)",
    border:         "1px solid var(--color-clean-border)",
    borderRadius:   "var(--radius-md)",
    fontSize:       "0.8125rem",
    fontWeight:     500,
    color:          "var(--color-clean)",
  },

  // ── Summary bar ───────────────────────────────────────────────
  summaryBar: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    flexWrap:       "wrap",
    gap:            "0.5rem",
    padding:        "0.5rem 0.75rem",
    background:     "var(--color-bg-secondary)",
    borderRadius:   "var(--radius-md)",
    border:         "1px solid var(--color-border)",
  },
  summaryText: {
    fontSize:       "0.8125rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },
  warningText: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.3rem",
    fontSize:       "0.75rem",
    color:          "var(--color-medium)",
    fontWeight:     500,
  },

  // ── File list ─────────────────────────────────────────────────
  fileList: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.375rem",
  },
  fileRow: {
    display:        "flex",
    flexDirection:  "column",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-md)",
    overflow:       "hidden",
    transition:     "border-color var(--transition)",
  },
  fileMain: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.75rem",
    padding:        "0.625rem 0.875rem",
  },
  fileIconWrap: {
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
  },
  fileMeta: {
    flex:           1,
    display:        "flex",
    flexDirection:  "column",
    gap:            "1px",
    minWidth:       0,
  },
  fileName: {
    fontSize:       "0.875rem",
    fontWeight:     600,
    color:          "var(--color-text)",
    overflow:       "hidden",
    textOverflow:   "ellipsis",
    whiteSpace:     "nowrap",
    fontFamily:     "var(--font-mono)",
  },
  fileSub: {
    fontSize:       "0.72rem",
    color:          "var(--color-text-muted)",
  },
  fileActions: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.375rem",
    flexShrink:     0,
  },
  fileBtn: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "28px",
    height:         "28px",
    borderRadius:   "var(--radius-sm)",
    border:         "1px solid var(--color-border)",
    background:     "var(--color-surface)",
    cursor:         "pointer",
    transition:     "background var(--transition)",
    flexShrink:     0,
  },
  dlFileBtn: {
    background:     "var(--color-primary)",
    borderColor:    "var(--color-primary)",
  },

  // ── Expanded details ──────────────────────────────────────────
  fileDetails: {
    display:        "flex",
    flexDirection:  "column",
    borderTop:      "1px solid var(--color-border)",
    background:     "var(--color-bg-secondary)",
    animation:      "fadeIn 0.15s ease forwards",
  },
  detailRow: {
    display:               "grid",
    gridTemplateColumns:   "110px 1fr",
    padding:               "0.35rem 0.875rem",
    borderBottom:          "1px solid var(--color-border)",
    gap:                   "0.75rem",
    alignItems:            "start",
  },
  detailLabel: {
    fontSize:       "0.7rem",
    fontWeight:     600,
    color:          "var(--color-text-muted)",
    textTransform:  "uppercase",
    letterSpacing:  "0.04em",
    paddingTop:     "1px",
  },
  detailValue: {
    color:          "var(--color-text)",
    lineHeight:     1.5,
  },
};
