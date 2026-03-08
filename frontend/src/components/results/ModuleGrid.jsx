// src/components/results/ModuleGrid.jsx
/**
 * ModuleGrid
 * Renders all ModuleCards in a structured, filterable grid.
 *
 * Props:
 *   results  {Object}  report.results — key → ModuleResult
 */
import React, { useState, useMemo } from "react";
import ModuleCard                   from "./ModuleCard";
import { isBadStatus }              from "../../utils/threatColors";

const FILTERS = [
  { key: "all",        label: "All"        },
  { key: "flagged",    label: "Flagged"    },
  { key: "clean",      label: "Clean"      },
  { key: "skipped",    label: "Skipped"    },
];

// Preferred display order — matches orchestrator pipeline phases
const MODULE_ORDER = [
  "lsb_noise",
  "histogram",
  "chi_square",
  "entropy",
  "feature_extractor",
  "alpha_channel",
  "file_signature",
  "metadata",
  "hidden_signature",
  "lsb_extractor",
  "rebuild_payload",
  "payload_validator",
  "virustotal_payload",
  "virustotal_image",
];

export default function ModuleGrid({ results }) {
  const [activeFilter, setActiveFilter] = useState("all");

  if (!results || Object.keys(results).length === 0) {
    return (
      <div style={styles.empty}>
        No module results available.
      </div>
    );
  }

  // Sort by preferred order, unknown modules go to end
  const sortedKeys = useMemo(() => {
    const keys    = Object.keys(results);
    const ordered = MODULE_ORDER.filter((k) => keys.includes(k));
    const extra   = keys.filter((k) => !MODULE_ORDER.includes(k));
    return [...ordered, ...extra];
  }, [results]);

  // Counts for filter badges
  const counts = useMemo(() => ({
    all:     sortedKeys.length,
    flagged: sortedKeys.filter((k) => isBadStatus(results[k]?.status)).length,
    clean:   sortedKeys.filter((k) =>
  ["clean", "ok"].includes(results[k]?.status?.toLowerCase())
).length,
    skipped: sortedKeys.filter((k) => results[k]?.status === "skipped").length,
  }), [sortedKeys, results]);

  // Apply filter
  const visibleKeys = useMemo(() => {
    switch (activeFilter) {
      case "flagged": return sortedKeys.filter((k) => isBadStatus(results[k]?.status));
      case "clean":   return sortedKeys.filter((k) =>
  ["clean", "ok"].includes(results[k]?.status?.toLowerCase())
);
      case "skipped": return sortedKeys.filter((k) => results[k]?.status === "skipped");
      default:        return sortedKeys;
    }
  }, [activeFilter, sortedKeys, results]);

  return (
    <div style={styles.wrapper}>

      {/* ── Filter tabs ───────────────────────────────────────── */}
      <div style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              ...styles.filterBtn,
              ...(activeFilter === key ? styles.filterBtnActive : {}),
            }}
          >
            {label}
            <span style={{
              ...styles.filterCount,
              background: activeFilter === key
                ? "var(--color-primary)"
                : "var(--color-bg-secondary)",
              color: activeFilter === key
                ? "#fff"
                : "var(--color-text-muted)",
            }}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Cards ─────────────────────────────────────────────── */}
      {visibleKeys.length === 0 ? (
        <div style={styles.empty}>
          No modules match this filter.
        </div>
      ) : (
        <div style={styles.grid}>
          {visibleKeys.map((key) => (
            <ModuleCard
              key={key}
              moduleKey={key}
              result={results[key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display:       "flex",
    flexDirection: "column",
    gap:           "1rem",
  },
  filterRow: {
    display:       "flex",
    gap:           "0.375rem",
    flexWrap:      "wrap",
  },
  filterBtn: {
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "0.4rem",
    padding:       "0.4rem 0.875rem",
    borderRadius:  "var(--radius-full)",
    border:        "1px solid var(--color-border)",
    background:    "var(--color-surface)",
    fontSize:      "0.8125rem",
    fontWeight:    500,
    color:         "var(--color-text-secondary)",
    cursor:        "pointer",
    transition:    "all var(--transition)",
  },
  filterBtnActive: {
    background:    "var(--color-primary-light)",
    borderColor:   "var(--color-primary-border)",
    color:         "var(--color-primary)",
    fontWeight:    600,
  },
  filterCount: {
    display:       "inline-flex",
    alignItems:    "center",
    justifyContent:"center",
    minWidth:      "18px",
    height:        "18px",
    borderRadius:  "var(--radius-full)",
    fontSize:      "0.6875rem",
    fontWeight:    700,
    padding:       "0 4px",
    transition:    "all var(--transition)",
  },
  grid: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0.5rem",
  },
  empty: {
    padding:       "2rem",
    textAlign:     "center",
    color:         "var(--color-text-muted)",
    fontSize:      "0.875rem",
  },
};