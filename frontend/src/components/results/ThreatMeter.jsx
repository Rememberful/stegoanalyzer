// src/components/results/ThreatMeter.jsx
/**
 * ThreatMeter
 * Semi-circular gauge showing the 0–10 heuristic threat score.
 * Score needle + colour interpolates across the threat spectrum.
 *
 * Props:
 *   score        {number}  0–10 heuristic score
 *   threatLevel  {string}  "CLEAN"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"
 *   suspiciousModules {number}  count of flagged modules
 *   totalModules      {number}  total modules run
 */
import React, { useEffect, useRef } from "react";
import { getThreatConfig, scoreToColor } from "../../utils/threatColors";
import { formatScore }                   from "../../utils/formatters";

const W       = 280;   // SVG width
const H       = 160;   // SVG height
const CX      = W / 2; // centre x
const CY      = 155;   // centre y (pushed down so arc sits nicely)
const R       = 110;   // arc radius
const STROKE  = 14;    // arc thickness

// Arc runs from 180° (left) to 0° (right) — a half circle
const START_ANGLE = Math.PI;       // 180°
const END_ANGLE   = 0;             // 0°
const ARC_SPAN    = Math.PI;       // 180° total

/** Convert polar angle to SVG x,y */
function polar(angle, radius = R) {
  return {
    x: CX + radius * Math.cos(angle),
    y: CY - radius * Math.sin(angle),   // SVG y is inverted
  };
}

/** Build an SVG arc path string */
function arcPath(startAngle, endAngle, radius = R) {
  const s    = polar(startAngle, radius);
  const e    = polar(endAngle,   radius);
  const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  // Sweep = 0 because we go clockwise in SVG space (y inverted)
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 0 ${e.x} ${e.y}`;
}

/** Map score 0–10 to an angle on the arc */
function scoreToAngle(score) {
  const clamped = Math.max(0, Math.min(10, score));
  // score 0 → START_ANGLE (left), score 10 → END_ANGLE (right)
  return START_ANGLE - (clamped / 10) * ARC_SPAN;
}

/** Tick marks at each threat boundary */
const TICKS = [
  { score: 0,  label: "0"  },
  { score: 2,  label: "2"  },
  { score: 4,  label: "4"  },
  { score: 6,  label: "6"  },
  { score: 8,  label: "8"  },
  { score: 10, label: "10" },
];

/** Coloured arc segments */
const SEGMENTS = [
  { from: 0,  to: 2,  color: "#16a34a" },
  { from: 2,  to: 4,  color: "#65a30d" },
  { from: 4,  to: 6,  color: "#d97706" },
  { from: 6,  to: 8,  color: "#ea580c" },
  { from: 8,  to: 10, color: "#dc2626" },
];

export default function ThreatMeter({
  score            = 0,
  threatLevel      = "CLEAN",
  suspiciousModules = 0,
  totalModules      = 0,
}) {
  const config      = getThreatConfig(threatLevel);
  const needleAngle = scoreToAngle(score);
  const needleTip   = polar(needleAngle, R - STROKE / 2 - 4);
  const needleBase1 = polar(needleAngle + Math.PI / 2, 6);
  const needleBase2 = polar(needleAngle - Math.PI / 2, 6);
  const needleColor = scoreToColor(score);

  return (
    <div style={styles.wrapper}>

      {/* ── SVG Gauge ───────────────────────────────────────── */}
      <svg
        width={W}
        height={H + 10}
        viewBox={`0 0 ${W} ${H + 10}`}
        style={{ overflow: "visible", maxWidth: "100%" }}
        aria-label={`Threat score ${score} out of 10 — ${config.label}`}
      >
        {/* Track (grey background arc) */}
        <path
          d={arcPath(START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="var(--color-bg-secondary)"
          strokeWidth={STROKE + 2}
          strokeLinecap="round"
        />

        {/* Coloured threat segments */}
        {SEGMENTS.map(({ from, to, color }) => (
          <path
            key={from}
            d={arcPath(scoreToAngle(from), scoreToAngle(to))}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
            opacity={0.25}
          />
        ))}

        {/* Active arc up to current score */}
        {score > 0 && (
          <path
            d={arcPath(START_ANGLE, needleAngle)}
            fill="none"
            stroke={needleColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            opacity={0.9}
          />
        )}

        {/* Tick marks + labels */}
        {TICKS.map(({ score: ts, label }) => {
          const angle    = scoreToAngle(ts);
          const inner    = polar(angle, R - STROKE / 2 - 6);
          const outer    = polar(angle, R + STROKE / 2 + 4);
          const labelPos = polar(angle, R + STROKE / 2 + 16);
          return (
            <g key={ts}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="var(--color-border-strong)"
                strokeWidth={1.5}
              />
              <text
                x={labelPos.x}
                y={labelPos.y + 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-text-muted)"
                fontFamily="var(--font-mono)"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={needleColor}
          opacity={0.95}
        />

        {/* Needle pivot dot */}
        <circle cx={CX} cy={CY} r={7}  fill={needleColor} opacity={0.9} />
        <circle cx={CX} cy={CY} r={3}  fill="#fff" />
      </svg>

      {/* ── Score & label ────────────────────────────────────── */}
      <div style={styles.scoreBlock}>
        <span style={{ ...styles.scoreNum, color: needleColor }}>
          {score}
          <span style={styles.scoreMax}>/10</span>
        </span>

        <span style={{
          ...styles.levelBadge,
          background: config.bg     || config.hexBg,
          color:      config.color  || config.hex,
          border:     `1px solid ${config.border || config.hexBg}`,
        }}>
          {config.emoji} {config.label}
        </span>

        <p style={styles.sublabel}>{config.sublabel}</p>
      </div>

      {/* ── Module summary row ───────────────────────────────── */}
      {totalModules > 0 && (
        <div style={styles.moduleSummary}>
          <div style={styles.moduleCell}>
            <span style={styles.moduleCellNum}>{totalModules}</span>
            <span style={styles.moduleCellLabel}>modules run</span>
          </div>
          <div style={styles.moduleDivider} />
          <div style={styles.moduleCell}>
            <span style={{
              ...styles.moduleCellNum,
              color: suspiciousModules > 0
                ? "var(--color-suspicious)"
                : "var(--color-clean)",
            }}>
              {suspiciousModules}
            </span>
            <span style={styles.moduleCellLabel}>flagged</span>
          </div>
          <div style={styles.moduleDivider} />
          <div style={styles.moduleCell}>
            <span style={{
              ...styles.moduleCellNum,
              color: "var(--color-clean)",
            }}>
              {totalModules - suspiciousModules}
            </span>
            <span style={styles.moduleCellLabel}>clean</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "0.5rem",
  },
  scoreBlock: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "0.4rem",
    marginTop:      "-0.5rem",
  },
  scoreNum: {
    fontSize:       "3rem",
    fontWeight:     700,
    lineHeight:     1,
    letterSpacing:  "-0.03em",
    fontFamily:     "var(--font-mono)",
  },
  scoreMax: {
    fontSize:       "1.25rem",
    fontWeight:     400,
    color:          "var(--color-text-muted)",
    marginLeft:     "2px",
  },
  levelBadge: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "5px",
    padding:        "4px 14px",
    borderRadius:   "var(--radius-full)",
    fontSize:       "0.875rem",
    fontWeight:     600,
  },
  sublabel: {
    fontSize:       "0.8125rem",
    color:          "var(--color-text-muted)",
    textAlign:      "center",
    maxWidth:       "240px",
    lineHeight:     1.4,
  },
  moduleSummary: {
    display:        "flex",
    alignItems:     "center",
    gap:            "1rem",
    marginTop:      "0.5rem",
    padding:        "0.75rem 1.5rem",
    background:     "var(--color-bg-secondary)",
    borderRadius:   "var(--radius-lg)",
    border:         "1px solid var(--color-border)",
  },
  moduleCell: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "1px",
  },
  moduleCellNum: {
    fontSize:       "1.25rem",
    fontWeight:     700,
    fontFamily:     "var(--font-mono)",
    color:          "var(--color-text)",
    lineHeight:     1,
  },
  moduleCellLabel: {
    fontSize:       "0.6875rem",
    color:          "var(--color-text-muted)",
    fontWeight:     500,
    textTransform:  "uppercase",
    letterSpacing:  "0.04em",
  },
  moduleDivider: {
    width:          "1px",
    height:         "28px",
    background:     "var(--color-border)",
  },
};