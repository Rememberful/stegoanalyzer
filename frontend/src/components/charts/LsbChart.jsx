// src/components/charts/LsbChart.jsx
/**
 * LsbChart
 * Shows LSB ones/zeros distribution per RGB channel as a stacked bar,
 * plus autocorrelation value per channel.
 * A near 50/50 split indicates possible LSB steganography.
 *
 * Props:
 *   data  {Object}  results.lsb_noise from ScanReport
 */
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";

function buildChartData(channels) {
  if (!channels) return [];
  return Object.entries(channels).map(([ch, d]) => ({
    channel:    ch,
    ones:       Number(d?.pct_ones   ?? d?.lsb_ones_pct   ?? 0),
    zeros:      Number(d?.pct_zeros  ?? d?.lsb_zeros_pct  ?? 0),
    autocorr:   Number(d?.lsb_autocorr ?? 0),
    suspicious: Boolean(d?.suspicious),
  }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const ones  = payload.find((p) => p.dataKey === "ones");
  const zeros = payload.find((p) => p.dataKey === "zeros");
  return (
    <div style={{
      background:   "#fff",
      border:       "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      padding:      "0.5rem 0.75rem",
      fontSize:     "0.75rem",
      boxShadow:    "var(--shadow-md)",
    }}>
      <p style={{ fontWeight: 600, marginBottom: "4px",
                  color: "var(--color-text)" }}>{label} Channel</p>
      {ones  && <p style={{ color: "#2563eb" }}>LSB 1s: {Number(ones.value).toFixed(2)}%</p>}
      {zeros && <p style={{ color: "#94a3b8" }}>LSB 0s: {Number(zeros.value).toFixed(2)}%</p>}
      <p style={{ color: "var(--color-text-muted)", marginTop: "4px", fontSize: "0.7rem" }}>
        Near 50/50 split → suspicious
      </p>
    </div>
  );
}

export default function LsbChart({ data }) {
  const channels   = data?.channels;
  const chartData  = buildChartData(channels);

  if (!chartData.length) {
    return (
      <div style={{ height: "200px", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "var(--color-text-muted)",
                    fontSize: "0.875rem" }}>
        No LSB data available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Stacked bar — ones vs zeros */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
          barSize={48}
        >
          <XAxis
            dataKey="channel"
            tick={{ fontSize: 12, fontWeight: 600, fill: "var(--color-text)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-secondary)" }} />

          {/* 50% reference line — crossing this is suspicious */}
          <ReferenceLine
            y={50}
            stroke="#dc2626"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: "50% threshold", position: "right",
                     fontSize: 9, fill: "#dc2626" }}
          />

          <Bar dataKey="ones"  stackId="a" fill="#2563eb" fillOpacity={0.85}
               radius={[0, 0, 0, 0]} name="LSB 1s" />
          <Bar dataKey="zeros" stackId="a" fill="#e2e8f0" fillOpacity={1}
               radius={[4, 4, 0, 0]} name="LSB 0s" />
        </BarChart>
      </ResponsiveContainer>

      {/* Autocorrelation table */}
      <div style={styles.autocorrTable}>
        <p style={styles.autocorrTitle}>LSB Autocorrelation</p>
        <div style={styles.autocorrRow}>
          {chartData.map((d) => (
            <div key={d.channel} style={styles.autocorrCell}>
              <span style={styles.autocorrChannel}>{d.channel}</span>
              <span style={{
                ...styles.autocorrVal,
                color: Math.abs(d.autocorr) < 0.01
                  ? "var(--color-suspicious)"
                  : "var(--color-clean)",
              }}>
                {d.autocorr.toFixed(4)}
              </span>
              {Math.abs(d.autocorr) < 0.01 && (
                <span style={styles.autocorrFlag}>near zero ⚠️</span>
              )}
            </div>
          ))}
        </div>
        <p style={styles.autocorrNote}>
          Natural images have slightly positive autocorrelation.
          Values near 0 indicate randomised LSB — consistent with steganography.
        </p>
      </div>
    </div>
  );
}

const styles = {
  autocorrTable: {
    background:    "var(--color-bg-secondary)",
    border:        "1px solid var(--color-border)",
    borderRadius:  "var(--radius-md)",
    padding:       "0.75rem 1rem",
    display:       "flex",
    flexDirection: "column",
    gap:           "0.5rem",
  },
  autocorrTitle: {
    fontSize:      "0.75rem",
    fontWeight:    600,
    color:         "var(--color-text)",
  },
  autocorrRow: {
    display:       "flex",
    gap:           "1.5rem",
    flexWrap:      "wrap",
  },
  autocorrCell: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.4rem",
  },
  autocorrChannel: {
    fontSize:      "0.8125rem",
    fontWeight:    700,
    color:         "var(--color-text)",
    width:         "16px",
  },
  autocorrVal: {
    fontFamily:    "var(--font-mono)",
    fontSize:      "0.8125rem",
    fontWeight:    600,
  },
  autocorrFlag: {
    fontSize:      "0.7rem",
    color:         "var(--color-suspicious)",
  },
  autocorrNote: {
    fontSize:      "0.7rem",
    color:         "var(--color-text-muted)",
    lineHeight:    1.5,
  },
};
