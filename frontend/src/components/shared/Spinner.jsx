// src/components/shared/Spinner.jsx
/**
 * Spinner
 * Reusable loading indicator.
 *
 * Props:
 *   size     {number}  diameter in px (default 24)
 *   color    {string}  stroke colour  (default primary blue)
 *   label    {string}  accessible text + optional visible caption
 *   caption  {boolean} show label as visible text below spinner
 */
import React from "react";

export default function Spinner({
  size    = 24,
  color   = "var(--color-primary)",
  label   = "Loading…",
  caption = false,
}) {
  const thickness = Math.max(2, Math.round(size / 10));

  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display:        "inline-flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            "0.5rem",
      }}
    >
      {/* SVG ring spinner — no external dependency */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}
        aria-hidden="true"
      >
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - thickness * 2) / 2}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={thickness}
        />
        {/* Spinning arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - thickness * 2) / 2}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(size - thickness * 2) * Math.PI * 0.75} ${(size - thickness * 2) * Math.PI}`}
          strokeDashoffset={0}
          style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
        />
      </svg>

      {/* Optional visible caption */}
      {caption && (
        <span
          style={{
            fontSize:  "0.8125rem",
            color:     "var(--color-text-muted)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      )}

      {/* Always hidden accessible text when caption is off */}
      {!caption && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}