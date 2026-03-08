// src/components/results/IndicatorList.jsx
/**
 * IndicatorList
 * Renders all cross-module suspicious indicators in a grouped list.
 *
 * Props:
 *   indicators  {Array}  report.summary.indicators
 *               Each item: { module: string, indicator: string }
 */
import React, { useState } from "react";
import { AlertTriangle }   from "lucide-react";
import { moduleLabel }     from "../../utils/formatters";

export default function IndicatorList({ indicators }) {
  const [expanded, setExpanded] = useState(true);

  if (!indicators?.length) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: "1.25rem" }}>✅</span>
        <span>No suspicious indicators found across any module.</span>
      </div>
    );
  }

  // Group by module
  const grouped = indicators.reduce((acc, item) => {
    const mod = item.module || "general";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(item.indicator);
    return acc;
  }, {});

  return (
    <div style={styles.wrapper}>

      {/* Header */}
      <div style={styles.header}>
        <AlertTriangle size={16} color="var(--color-high)" />
        <span style={styles.headerText}>
          {indicators.length} indicator{indicators.length !== 1 ? "s" : ""} detected
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={styles.toggleBtn}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Grouped indicator rows */}
      {expanded && (
        <div style={styles.groups}>
          {Object.entries(grouped).map(([mod, items]) => (
            <div key={mod} style={styles.group}>
              {/* Module name */}
              <p style={styles.groupLabel}>{moduleLabel(mod)}</p>

              {/* Indicator items */}
              <ul style={styles.list}>
                {items.map((item, i) => (
                  <li key={i} style={styles.item}>
                    <span style={styles.bullet}>▸</span>
                    <span style={styles.itemText}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
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
    gap:           "0.75rem",
    padding:       "1rem",
    background:    "var(--color-high-bg)",
    border:        "1px solid var(--color-high-border)",
    borderRadius:  "var(--radius-lg)",
  },
  header: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.5rem",
  },
  headerText: {
    flex:          1,
    fontSize:      "0.875rem",
    fontWeight:    600,
    color:         "var(--color-high)",
  },
  toggleBtn: {
    background:    "none",
    border:        "none",
    cursor:        "pointer",
    fontSize:      "0.75rem",
    color:         "var(--color-text-muted)",
    fontWeight:    500,
    padding:       "2px 6px",
  },
  groups: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0.75rem",
  },
  group: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0.3rem",
  },
  groupLabel: {
    fontSize:      "0.6875rem",
    fontWeight:    700,
    color:         "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  list: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0.2rem",
  },
  item: {
    display:       "flex",
    gap:           "0.4rem",
    alignItems:    "flex-start",
  },
  bullet: {
    color:         "var(--color-high)",
    fontSize:      "0.75rem",
    flexShrink:    0,
    marginTop:     "2px",
  },
  itemText: {
    fontSize:      "0.8125rem",
    color:         "var(--color-text-secondary)",
    lineHeight:    1.5,
  },
  empty: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.5rem",
    padding:       "0.875rem 1rem",
    background:    "var(--color-clean-bg)",
    border:        "1px solid var(--color-clean-border)",
    borderRadius:  "var(--radius-lg)",
    fontSize:      "0.875rem",
    color:         "var(--color-clean)",
    fontWeight:    500,
  },
};