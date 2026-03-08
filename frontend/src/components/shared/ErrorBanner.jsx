// src/components/shared/ErrorBanner.jsx
/**
 * ErrorBanner
 * Displays an error message with optional retry / dismiss actions.
 *
 * Props:
 *   message   {string}    the error text to display (required)
 *   onRetry   {Function}  if provided, shows a "Try Again" button
 *   onDismiss {Function}  if provided, shows an "×" dismiss button
 *   compact   {boolean}   smaller inline version (default false)
 */
import React        from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";

export default function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  compact = false,
}) {
  if (!message) return null;

  if (compact) {
    return (
      <div style={styles.compact}>
        <AlertCircle size={14} color="var(--color-critical)" style={{ flexShrink: 0 }} />
        <span style={styles.compactText}>{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} style={styles.compactDismiss} aria-label="Dismiss">
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.banner} role="alert" aria-live="assertive">
      {/* Icon */}
      <div style={styles.iconWrap}>
        <AlertCircle size={20} color="var(--color-critical)" />
      </div>

      {/* Content */}
      <div style={styles.content}>
        <p style={styles.title}>Something went wrong</p>
        <p style={styles.message}>{message}</p>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={styles.retryBtn}
            className="btn btn-ghost btn-sm"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={styles.dismissBtn}
            aria-label="Dismiss error"
          >
            <X size={16} color="var(--color-text-muted)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  banner: {
    display:       "flex",
    alignItems:    "flex-start",
    gap:           "0.75rem",
    padding:       "1rem 1.25rem",
    background:    "var(--color-critical-bg)",
    border:        "1px solid var(--color-critical-border)",
    borderRadius:  "var(--radius-lg)",
    animation:     "fadeIn 0.2s ease forwards",
  },
  iconWrap: {
    flexShrink:    0,
    paddingTop:    "1px",
  },
  content: {
    flex:          1,
    minWidth:      0,
  },
  title: {
    fontSize:      "0.875rem",
    fontWeight:    600,
    color:         "var(--color-critical)",
    marginBottom:  "0.2rem",
  },
  message: {
    fontSize:      "0.8125rem",
    color:         "var(--color-text-secondary)",
    lineHeight:    1.5,
    wordBreak:     "break-word",
  },
  actions: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.5rem",
    flexShrink:    0,
  },
  retryBtn: {
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "0.35rem",
    padding:       "0.375rem 0.75rem",
    borderRadius:  "var(--radius-md)",
    fontSize:      "0.8125rem",
    fontWeight:    500,
    background:    "transparent",
    border:        "1px solid var(--color-critical-border)",
    color:         "var(--color-critical)",
    cursor:        "pointer",
    whiteSpace:    "nowrap",
    transition:    "background var(--transition)",
  },
  dismissBtn: {
    display:       "flex",
    alignItems:    "center",
    justifyContent:"center",
    width:         "28px",
    height:        "28px",
    borderRadius:  "var(--radius-sm)",
    border:        "none",
    background:    "transparent",
    cursor:        "pointer",
    flexShrink:    0,
    transition:    "background var(--transition)",
  },
  // Compact inline version
  compact: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.4rem",
    padding:       "0.4rem 0.75rem",
    background:    "var(--color-critical-bg)",
    border:        "1px solid var(--color-critical-border)",
    borderRadius:  "var(--radius-md)",
  },
  compactText: {
    flex:          1,
    fontSize:      "0.8125rem",
    color:         "var(--color-critical)",
    fontWeight:    500,
  },
  compactDismiss: {
    display:       "flex",
    alignItems:    "center",
    background:    "none",
    border:        "none",
    cursor:        "pointer",
    color:         "var(--color-critical)",
    padding:       "0 2px",
    flexShrink:    0,
  },
};