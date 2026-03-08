// src/components/charts/HistogramChart.jsx
/**
 * HistogramChart
 * Renders the RGB pixel intensity histogram from the backend.
 * One line per channel — R, G, B — over 256 intensity bins.
 *
 * Props:
 *   data  {Object}  results.histogram.channels from ScanReport
 */
import React, { useState }                         from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip,
         ResponsiveContainer, Legend }             from "recharts";

const CHANNEL_COLORS = { R: "#ef4444", G: "#22c55e", B: "#3b82f6" };

function buildChartData(channels) {
  if (!channels) return [];
  const length = 256;
  return Array.from({ length }, (_, i) => {
    const point = { intensity: i };
    for (const [ch, d] of Object.entries(channels)) {
      const hist = d?.histogram_norm || d?.histogram || [];
      point[ch]  = hist[i] ?? 0;
    }
    return point;
  });
}

// Custom lightweight tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:    "#fff",
      border:        "1px solid var(--color-border)",
      borderRadius:  "var(--radius-md)",
      padding:       "0.5rem 0.75rem",
      fontSize:      "0.75rem",
      boxShadow:     "var(--shadow-md)",
    }}>
      <p style={{ fontWeight: 600, marginBottom: "4px", color: "var(--color-text)" }}>
        Intensity: {label}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: {Number(p.value).toFixed(5)}
        </p>
      ))}
    </div>
  );
}

export default function HistogramChart({ data }) {
  const [hidden, setHidden] = useState({});

  if (!data?.channels) {
    return <EmptyChart label="No histogram data available" />;
  }

  const chartData = buildChartData(data.channels);
  const channels  = Object.keys(data.channels);

  const toggleChannel = (ch) =>
    setHidden((h) => ({ ...h, [ch]: !h[ch] }));

  return (
    <div style={styles.wrapper}>
      {/* Channel toggles */}
      <div style={styles.toggleRow}>
        {channels.map((ch) => (
          <button
            key={ch}
            onClick={() => toggleChannel(ch)}
            style={{
              ...styles.toggle,
              opacity:        hidden[ch] ? 0.35 : 1,
              borderColor:    CHANNEL_COLORS[ch],
              color:          CHANNEL_COLORS[ch],
              background:     hidden[ch] ? "#fff" : `${CHANNEL_COLORS[ch]}18`,
            }}
          >
            {ch} Channel
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="intensity"
            tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
            ticks={[0, 64, 128, 192, 255]}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toFixed(3)}
          />
          <Tooltip content={<CustomTooltip />} />
          {channels.map((ch) => (
            <Line
              key={ch}
              type="monotone"
              dataKey={ch}
              stroke={CHANNEL_COLORS[ch]}
              strokeWidth={1.5}
              dot={false}
              hide={hidden[ch]}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Pair-wise deviation summary */}
      {data.channels && (
        <div style={styles.summaryRow}>
          {Object.entries(data.channels).map(([ch, d]) => (
            <div key={ch} style={styles.summaryItem}>
              <span style={{ color: CHANNEL_COLORS[ch], fontWeight: 600, fontSize: "0.75rem" }}>
                {ch}
              </span>
              <span style={styles.summaryVal}>
                {d?.mean_pair_diff_pct != null
                  ? `${Number(d.mean_pair_diff_pct).toFixed(2)}% pair diff`
                  : "—"}
              </span>
              {d?.pair_suspicious && (
                <span style={styles.suspFlag}>⚠️ suspicious</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div style={{ height: "220px", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "var(--color-text-muted)",
                  fontSize: "0.875rem" }}>
      {label}
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  toggleRow: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  toggle: {
    padding:       "3px 10px",
    borderRadius:  "var(--radius-full)",
    border:        "1.5px solid",
    fontSize:      "0.75rem",
    fontWeight:    600,
    cursor:        "pointer",
    transition:    "all 150ms ease",
  },
  summaryRow: {
    display:   "flex",
    gap:       "1.5rem",
    flexWrap:  "wrap",
    paddingTop:"0.5rem",
    borderTop: "1px solid var(--color-border)",
  },
  summaryItem: {
    display:       "flex",
    alignItems:    "center",
    gap:           "0.4rem",
  },
  summaryVal: {
    fontSize:      "0.75rem",
    color:         "var(--color-text-secondary)",
    fontFamily:    "var(--font-mono)",
  },
  suspFlag: {
    fontSize:      "0.7rem",
    color:         "var(--color-suspicious)",
    fontWeight:    600,
  },
};