// src/components/upload/UploadZone.jsx
/**
 * UploadZone
 * Drag-and-drop + click-to-browse image uploader.
 *
 * Props:
 *   onFile   {Function}  called with a File object when user selects one
 *   disabled {boolean}   locks the zone during scanning
 */
import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, Image, AlertCircle }       from "lucide-react";

const ALLOWED      = ["image/png", "image/jpeg", "image/bmp"];
const ALLOWED_EXT  = ".png, .jpg, .jpeg, .bmp";
const MAX_MB       = 50;

export default function UploadZone({ onFile, disabled = false }) {
  const inputRef              = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localErr, setLocalErr] = useState(null);

  // ── Validate a File before passing up ────────────────────────────
  const validate = useCallback((file) => {
    setLocalErr(null);
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      setLocalErr(`Unsupported format. Please upload PNG, JPG, or BMP.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalErr(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_MB} MB.`);
      return;
    }
    onFile(file);
  }, [onFile]);

  // ── Drag handlers ─────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragging(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validate(file);
  };

  // ── Click to browse ───────────────────────────────────────────────
  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validate(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const openBrowser = () => {
    if (!disabled) inputRef.current?.click();
  };

  // ── Dynamic zone style ────────────────────────────────────────────
  const zoneStyle = {
    ...styles.zone,
    ...(dragging  ? styles.zoneDragging  : {}),
    ...(disabled  ? styles.zoneDisabled  : {}),
    ...(localErr  ? styles.zoneError     : {}),
  };

  return (
    <div style={styles.wrapper}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXT}
        onChange={onInputChange}
        style={{ display: "none" }}
        disabled={disabled}
        aria-hidden="true"
      />

      {/* Drop zone */}
      <div
        style={zoneStyle}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openBrowser}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload image for analysis"
        onKeyDown={(e) => e.key === "Enter" && openBrowser()}
      >
        {/* Icon */}
        <div style={{
          ...styles.iconCircle,
          background: dragging
            ? "var(--color-primary-light)"
            : "var(--color-bg-secondary)",
          border: dragging
            ? "2px solid var(--color-primary)"
            : "2px solid var(--color-border)",
        }}>
          {dragging
            ? <Image       size={28} color="var(--color-primary)"      />
            : <UploadCloud size={28} color="var(--color-text-muted)"   />
          }
        </div>

        {/* Text */}
        <div style={styles.textBlock}>
          <p style={styles.mainText}>
            {dragging
              ? "Drop your image here"
              : "Drag & drop an image, or click to browse"
            }
          </p>
          <p style={styles.subText}>
            Supports PNG, JPG, BMP &nbsp;·&nbsp; Max {MAX_MB} MB
          </p>
        </div>

        {/* Call to action pill */}
        {!dragging && !disabled && (
          <div style={styles.pill}>
            Choose File
          </div>
        )}
      </div>

      {/* Local validation error */}
      {localErr && (
        <div style={styles.errRow}>
          <AlertCircle size={14} color="var(--color-critical)" style={{ flexShrink: 0 }} />
          <span style={styles.errText}>{localErr}</span>
        </div>
      )}

      {/* Supported formats hint */}
      <div style={styles.hintRow}>
        {["PNG", "JPG", "BMP"].map((fmt) => (
          <span key={fmt} style={styles.fmtTag}>{fmt}</span>
        ))}
        <span style={styles.hintText}>
          Image is analysed server-side and never stored permanently
        </span>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.75rem",
  },
  zone: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "1.25rem",
    padding:        "3rem 2rem",
    border:         "2px dashed var(--color-border-strong)",
    borderRadius:   "var(--radius-xl)",
    background:     "var(--color-surface)",
    cursor:         "pointer",
    transition:     "border-color 150ms ease, background 150ms ease",
    userSelect:     "none",
    outline:        "none",
    minHeight:      "220px",
  },
  zoneDragging: {
    borderColor:    "var(--color-primary)",
    background:     "var(--color-primary-light)",
  },
  zoneDisabled: {
    cursor:         "not-allowed",
    opacity:        0.6,
  },
  zoneError: {
    borderColor:    "var(--color-critical)",
    background:     "var(--color-critical-bg)",
  },
  iconCircle: {
    width:          "72px",
    height:         "72px",
    borderRadius:   "50%",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    transition:     "background 150ms ease, border-color 150ms ease",
    flexShrink:     0,
  },
  textBlock: {
    textAlign:      "center",
  },
  mainText: {
    fontSize:       "1rem",
    fontWeight:     600,
    color:          "var(--color-text)",
    marginBottom:   "0.3rem",
  },
  subText: {
    fontSize:       "0.875rem",
    color:          "var(--color-text-muted)",
  },
  pill: {
    padding:        "0.5rem 1.5rem",
    background:     "var(--color-primary)",
    color:          "#fff",
    borderRadius:   "var(--radius-full)",
    fontSize:       "0.875rem",
    fontWeight:     600,
    pointerEvents:  "none",
  },
  errRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.4rem",
    padding:        "0.5rem 0.75rem",
    background:     "var(--color-critical-bg)",
    border:         "1px solid var(--color-critical-border)",
    borderRadius:   "var(--radius-md)",
  },
  errText: {
    fontSize:       "0.8125rem",
    color:          "var(--color-critical)",
    fontWeight:     500,
  },
  hintRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.5rem",
    flexWrap:       "wrap",
  },
  fmtTag: {
    fontSize:       "0.6875rem",
    fontWeight:     600,
    color:          "var(--color-text-secondary)",
    background:     "var(--color-bg-secondary)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-sm)",
    padding:        "1px 6px",
    letterSpacing:  "0.05em",
  },
  hintText: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-muted)",
  },
};  