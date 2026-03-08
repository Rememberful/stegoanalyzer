// src/components/results/ModuleCard.jsx
/**
 * ModuleCard
 * Expandable card for a single analysis module result.
 *
 * Props:
 *   moduleKey  {string}  internal key e.g. "chi_square"
 *   result     {Object}  ModuleResult from backend
 */
import React, { useState }            from "react";
import { ChevronDown, ChevronRight }  from "lucide-react";
import Badge                          from "../shared/Badge";
import { moduleLabel, moduleDescription,
         formatFloat, formatEntropy,
         formatPct, formatBytes }     from "../../utils/formatters";
import { isBadStatus }                from "../../utils/threatColors";

export default function ModuleCard({ moduleKey, result }) {
  const [open, setOpen] = useState(false);

  if (!result) return null;

  const label       = moduleLabel(moduleKey);
  const description = moduleDescription(moduleKey);
  const bad         = isBadStatus(result.status);

  return (
    <div style={{
      ...styles.card,
      borderColor: bad
        ? (result.status === "malicious"
            ? "var(--color-critical-border)"
            : "var(--color-medium-border)")
        : "var(--color-border)",
    }}>

      {/* ── Header row (always visible) ──────────────────────── */}
      <button
        style={styles.header}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`module-${moduleKey}`}
      >
        {/* Status dot */}
        <StatusDot status={result.status} />

        {/* Title block */}
        <div style={styles.titleBlock}>
          <span style={styles.title}>{label}</span>
          {!open && description && (
            <span style={styles.subtitle}>{description}</span>
          )}
        </div>

        {/* Right side */}
        <div style={styles.headerRight}>
          <Badge status={result.status} size="sm" />
          {open
            ? <ChevronDown  size={16} color="var(--color-text-muted)" />
            : <ChevronRight size={16} color="var(--color-text-muted)" />
          }
        </div>
      </button>

      {/* ── Expanded body ────────────────────────────────────── */}
      {open && (
        <div
          id={`module-${moduleKey}`}
          style={styles.body}
        >
          {/* Verdict string */}
          {result.verdict && (
            <p style={styles.verdict}>{result.verdict}</p>
          )}

          {/* Error message */}
          {result.error && (
            <p style={styles.errorMsg}>⚠ {result.error}</p>
          )}

          {/* Indicators list */}
          {result.indicators?.length > 0 && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>Indicators</p>
              <ul style={styles.indicatorList}>
                {result.indicators.map((ind, i) => (
                  <li key={i} style={styles.indicatorItem}>
                    <span style={styles.indicatorBullet}>›</span>
                    <span style={styles.indicatorText}>{ind}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Details key-value table */}
          {result.details && Object.keys(result.details).length > 0 && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>Details</p>
              <DetailsTable data={result.details} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────
function StatusDot({ status }) {
  const colors = {
    clean:      "#16a34a",
    suspicious: "#d97706",
    malicious:  "#dc2626",
    info:       "#0891b2",
    skipped:    "#94a3b8",
    error:      "#dc2626",
  };
  const color = colors[status?.toLowerCase()] || "#94a3b8";
  return (
    <span style={{
      width:        "8px",
      height:       "8px",
      borderRadius: "50%",
      background:   color,
      flexShrink:   0,
      boxShadow:    `0 0 0 2px ${color}28`,
    }} />
  );
}

// ── Details table ─────────────────────────────────────────────────
function DetailsTable({ data }) {
  const rows = flattenDetails(data);
  if (!rows.length) return null;

  return (
    <div style={styles.detailsTable}>
      {rows.map(({ key, value }) => (
        <div key={key} style={styles.detailRow}>
          <span style={styles.detailKey}>{key}</span>
          <span style={styles.detailVal}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/** Flatten a nested details object to [{key, value}] rows for display */
function flattenDetails(obj, prefix = "") {
  if (!obj || typeof obj !== "object") return [];
  const rows = [];

  for (const [k, v] of Object.entries(obj)) {
    const label = prefix ? `${prefix} › ${k}` : k;

    if (v === null || v === undefined) {
      rows.push({ key: label, value: "—" });
    } else if (typeof v === "boolean") {
      rows.push({ key: label, value: v ? "Yes" : "No" });
    } else if (typeof v === "number") {
      // Heuristic: if it looks like entropy, show 4dp
      const val = Number.isInteger(v) ? v.toLocaleString() : v.toFixed(4);
      rows.push({ key: label, value: val });
    } else if (typeof v === "string") {
      rows.push({ key: label, value: v || "—" });
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        rows.push({ key: label, value: "None" });
      } else if (typeof v[0] !== "object") {
        // Array of primitives — join up to 6 items
        rows.push({ key: label, value: v.slice(0, 6).join(", ") + (v.length > 6 ? `… +${v.length - 6}` : "") });
      } else {
        rows.push({ key: label, value: `${v.length} items` });
      }
    } else if (typeof v === "object") {
      // Recurse one level only to avoid infinite depth
      if (!prefix) {
        rows.push(...flattenDetails(v, label));
      } else {
        rows.push({ key: label, value: JSON.stringify(v).slice(0, 80) });
      }
    }
  }
  return rows;
}

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  card: {
    background:    "var(--color-surface)",
    border:        "1px solid",
    borderRadius:  "var(--radius-lg)",
    overflow:      "hidden",
    transition:    "border-color var(--transition)",
  },
  header: {
    width:         "100%",
    display:       "flex",
    alignItems:    "center",
    gap:           "0.75rem",
    padding:       "0.875rem 1rem",
    background:    "none",
    border:        "none",
    cursor:        "pointer",
    textAlign:     "left",
    transition:    "background var(--transition)",
  },
  titleBlock: {
    flex:          1,
    display:       "flex",
    flexDirection: "column",
    gap:           "1px",
    minWidth:      0,
  },
  title: {
    fontSize:      "0.875rem",
    fontWeight:    600,
    color:         "var(--color-text)",
  },
  subtitle: {
    fontSize:      "0.75rem",
    color:         "var(--color-text-muted)",
    overflow:      "hidden",
    textOverflow:  "ellipsis",
    whiteSpace:    "nowrap",
  },
  headerRight: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.5rem",
    flexShrink:    0,
  },
  body: {
    padding:       "0 1rem 1rem",
    display:       "flex",
    flexDirection: "column",
    gap:           "0.875rem",
    borderTop:     "1px solid var(--color-border)",
    paddingTop:    "0.875rem",
    animation:     "fadeIn 0.15s ease forwards",
  },
  verdict: {
    fontSize:      "0.875rem",
    color:         "var(--color-text-secondary)",
    lineHeight:    1.5,
  },
  errorMsg: {
    fontSize:      "0.8125rem",
    color:         "var(--color-critical)",
    background:    "var(--color-critical-bg)",
    border:        "1px solid var(--color-critical-border)",
    borderRadius:  "var(--radius-md)",
    padding:       "0.5rem 0.75rem",
  },
  section: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0.4rem",
  },
  sectionLabel: {
    fontSize:      "0.6875rem",
    fontWeight:    700,
    color:         "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  indicatorList: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0.25rem",
  },
  indicatorItem: {
    display:       "flex",
    gap:           "0.4rem",
    alignItems:    "flex-start",
  },
  indicatorBullet: {
    color:         "var(--color-primary)",
    fontWeight:    700,
    flexShrink:    0,
    marginTop:     "1px",
  },
  indicatorText: {
    fontSize:      "0.8125rem",
    color:         "var(--color-text-secondary)",
    lineHeight:    1.5,
  },
  detailsTable: {
    display:       "flex",
    flexDirection: "column",
    borderRadius:  "var(--radius-md)",
    border:        "1px solid var(--color-border)",
    overflow:      "hidden",
  },
  detailRow: {
    display:       "grid",
    gridTemplateColumns: "1fr 1fr",
    padding:       "0.4rem 0.75rem",
    borderBottom:  "1px solid var(--color-border)",
    gap:           "1rem",
  },
  detailKey: {
    fontSize:      "0.75rem",
    color:         "var(--color-text-muted)",
    fontWeight:    500,
    textTransform: "capitalize",
  },
  detailVal: {
    fontSize:      "0.75rem",
    color:         "var(--color-text)",
    fontFamily:    "var(--font-mono)",
    wordBreak:     "break-all",
  },
};