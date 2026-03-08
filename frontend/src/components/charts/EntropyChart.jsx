// src/components/charts/EntropyChart.jsx
/**
 * EntropyChart
 * Bar chart showing Shannon entropy per channel + file + LSB stream.
 * Reference bands show normal image range (6.5–7.5).
 *
 * Props:
 *   data  {Object}  results.entropy from ScanReport
 */
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const HIGH_THRESHOLD = 7.2;
const LOW_THRESHOLD  = 2.0;

function getBarColor(value) {
  if (value > HIGH_THRESHOLD) return "#dc2626"; // red — high
  if (value < LOW_THRESHOLD)  return "#d97706"; // amber — low
  return "#2563eb";                              // blue — normal
}

function buildChartData(data) {
  if (!data) return [];
  const rows = [];

  // Per-channel entropies
  const ch = data.channel_entropies || {};
  for (const [name, val] of Object.entries(ch)) {
    rows.push({ name, value: Number(val) || 0, type: "channel" });
  }

  // File entropy
  if (data.file_entropy != null) {
    rows.push({ name: "File", value: Number(data.file_entropy), type: "file" });
  }

  // LSB stream entropy
  if (data.lsb_stream_entropy != null) {
    rows.push({ name: "LSB", value: Number(data.lsb_stream_entropy), type: "lsb" });
  }

  // Tail entropy
  if (data.tail_entropy != null) {
    rows.push({ name: "Tail", value: Number(data.tail_entropy), type: "tail" });
  }

  return rows;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background:   "#fff",
      border:       "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      padding:      "0.5rem 0.75rem",
      fontSize:     "0.75rem",
      boxShadow:    "var(--shadow-md)",
    }}>
      <p style={{ fontWeight: 600, color: "var(--color-text)", marginBottom: "2px" }}>
        {d.payload?.name}
      </p>
      <p style={{ color: getBarColor(d.value) }}>
        Entropy: <strong>{Number(d.value).toFixed(4)}</strong>
      </p>
      <p style={{ color: "var(--color-text-muted)", marginTop: "2px" }}>
        Normal range: 6.5 – 7.5
      </p>
    </div>
  );
}

export default function EntropyChart({ data }) {
  const chartData = buildChartData(data);

  if (!chartData.length) {
    return (
      <div style={{ height: "200px", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "var(--color-text-muted)",
                    fontSize: "0.875rem" }}>
        No entropy data available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          barSize={36}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 8]}
            tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-secondary)" }} />

          {/* Normal range reference lines */}
          <ReferenceLine
            y={7.5}
            stroke="#94a3b8"
            strokeDasharray="4 3"
            label={{ value: "7.5 high", position: "right",
                     fontSize: 9, fill: "var(--color-text-muted)" }}
          />
          <ReferenceLine
            y={6.5}
            stroke="#94a3b8"
            strokeDasharray="4 3"
            label={{ value: "6.5 normal", position: "right",
                     fontSize: 9, fill: "var(--color-text-muted)" }}
          />

          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.value)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {[
          { color: "#2563eb", label: "Normal (6.5–7.5)" },
          { color: "#dc2626", label: "High >7.2 (suspicious)" },
          { color: "#d97706", label: "Low <2.0 (suspicious)" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2,
                           background: color, display: "inline-block" }} />
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}