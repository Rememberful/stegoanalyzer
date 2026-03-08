// src/components/shared/Badge.jsx
/**
 * Badge
 * Small coloured pill used to display:
 *   - Module status  (clean / suspicious / malicious / error / skipped)
 *   - Threat level   (CLEAN / LOW / MEDIUM / HIGH / CRITICAL)
 *   - Any custom label + colour
 *
 * Props:
 *   status      {string}   module status key  — uses MODULE_STATUS_CONFIG
 *   level       {string}   threat level key   — uses THREAT_CONFIG
 *   label       {string}   override display text (optional)
 *   dot         {boolean}  show coloured dot before label (default true)
 *   size        {string}   "sm" | "md" (default "md")
 */
import React from "react";
import { getThreatConfig, getStatusConfig } from "../../utils/threatColors";

export default function Badge({
  status,
  level,
  label,
  dot   = true,
  size  = "md",
}) {
  // Level takes priority over status if both are provided
  const config = level
    ? getThreatConfig(level)
    : getStatusConfig(status || "info");

  const displayLabel = label ?? config.label;

  const padY = size === "sm" ? "2px"  : "3px";
  const padX = size === "sm" ? "8px"  : "10px";
  const fs   = size === "sm" ? "0.7rem" : "0.75rem";
  const dotS = size === "sm" ? "5px"  : "6px";

  return (
    <span
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        gap:           "5px",
        padding:       `${padY} ${padX}`,
        borderRadius:  "var(--radius-full)",
        background:    config.bg     || config.hexBg,
        border:        `1px solid ${config.border || config.hexBg}`,
        color:         config.color  || config.hex,
        fontSize:      fs,
        fontWeight:    600,
        whiteSpace:    "nowrap",
        lineHeight:    1.4,
        letterSpacing: "0.01em",
      }}
    >
      {dot && (
        <span
          style={{
            width:        dotS,
            height:       dotS,
            borderRadius: "50%",
            background:   config.dot || config.hex || config.color,
            flexShrink:   0,
          }}
        />
      )}
      {displayLabel}
    </span>
  );
}