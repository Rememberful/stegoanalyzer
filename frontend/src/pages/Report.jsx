// src/pages/Report.jsx
/**
 * Report
 * Full scan report page.
 * Reads the ScanReport from React Router location state.
 * If state is missing (e.g. user refreshed), redirects home.
 */
import React, { useState }          from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileImage, Clock,
  Hash, Layers, Info,
}                                   from "lucide-react";
import ThreatMeter                  from "../components/results/ThreatMeter";
import ModuleGrid                   from "../components/results/ModuleGrid";
import IndicatorList                from "../components/results/IndicatorList";
import PayloadInfo                  from "../components/results/PayloadInfo";
import SandboxPanel                 from "../components/sandbox/SandboxPanel";
import HistogramChart               from "../components/charts/HistogramChart";
import EntropyChart                 from "../components/charts/EntropyChart";
import LsbChart                     from "../components/charts/LsbChart";
import Badge                        from "../components/shared/Badge";
import { formatBytes, formatDimensions,
         truncateHash, moduleLabel }from "../utils/formatters";

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const report   = location.state?.report;

  // Active tab for the bottom section
  const [activeTab, setActiveTab] = useState("modules");

  // ── No report in state — user refreshed or landed directly ───
  if (!report) {
    return (
      <div style={styles.noReport}>
        <div style={styles.noReportCard}>
          <span style={{ fontSize: "2.5rem" }}>🔍</span>
          <h2 style={{ margin: 0 }}>No report loaded</h2>
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            Reports are not persisted on page refresh.
            Please upload an image to generate a new report.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/")}
          >
            ← Back to Scanner
          </button>
        </div>
      </div>
    );
  }

  const { summary, file_info, results, payload } = report;
  const score       = summary?.heuristic_score    ?? 0;
  const level       = summary?.threat_level       ?? "CLEAN";
  const indicators  = summary?.indicators         ?? [];
  const totalMods   = Object.keys(results || {}).length;
  const suspMods    = summary?.suspicious_modules ?? 0;

  // Tabs definition — only show Charts if data exists
  const TABS = [
    { key: "modules",   label: "Modules",    count: totalMods  },
    { key: "charts",    label: "Charts"                        },
    { key: "sandbox",   label: "Sandbox"                       },
    { key: "fileinfo",  label: "File Info"                     },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.inner}>

        {/* ── Back button ─────────────────────────────────────── */}
        <button
          onClick={() => navigate("/")}
          style={styles.backBtn}
        >
          <ArrowLeft size={16} />
          New Scan
        </button>

        {/* ══════════════════════════════════════════════════════
            TOP SECTION — Threat meter + summary side by side
        ══════════════════════════════════════════════════════ */}
        <div style={styles.topSection}>

          {/* ── Left: Threat gauge ────────────────────────────── */}
          <div style={styles.gaugeCard}>
            <ThreatMeter
              score={score}
              threatLevel={level}
              suspiciousModules={suspMods}
              totalModules={totalMods}
            />
          </div>

          {/* ── Right: Summary panel ──────────────────────────── */}
          <div style={styles.summaryPanel}>

            {/* File name + badge */}
            <div style={styles.summaryHeader}>
              <div style={styles.fileNameRow}>
                <FileImage size={18} color="var(--color-primary)" />
                <span style={styles.fileNameText}>
                  {file_info?.filename || "Unknown file"}
                </span>
              </div>
              <Badge level={level} />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />

            {/* File metadata grid */}
            <div style={styles.metaGrid}>
              <MetaItem
                icon={<Hash size={13} />}
                label="SHA-256"
                value={truncateHash(file_info?.sha256, 8)}
                mono
                title={file_info?.sha256}
              />
              <MetaItem
                icon={<Layers size={13} />}
                label="Format"
                value={`${file_info?.format || "—"} · ${file_info?.mode || "—"}`}
              />
              <MetaItem
                icon={<FileImage size={13} />}
                label="Dimensions"
                value={formatDimensions(file_info?.dimensions)}
              />
              <MetaItem
                icon={<Info size={13} />}
                label="File size"
                value={formatBytes(file_info?.size)}
              />
            </div>

            {/* Indicators summary */}
            <IndicatorList indicators={indicators} />

            {/* Payload info — only if payload was found */}
            {payload && <PayloadInfo payload={payload} />}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB SECTION — Modules / Charts / Sandbox / File Info
        ══════════════════════════════════════════════════════ */}
        <div style={styles.tabSection}>

          {/* Tab bar */}
          <div style={styles.tabBar}>
            {TABS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === key ? styles.tabBtnActive : {}),
                }}
              >
                {label}
                {count != null && (
                  <span style={{
                    ...styles.tabCount,
                    background: activeTab === key
                      ? "var(--color-primary)"
                      : "var(--color-bg-secondary)",
                    color: activeTab === key
                      ? "#fff"
                      : "var(--color-text-muted)",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={styles.tabContent}>

            {/* ── Modules tab ─────────────────────────────────── */}
            {activeTab === "modules" && (
              <ModuleGrid results={results} />
            )}

            {/* ── Charts tab ──────────────────────────────────── */}
            {activeTab === "charts" && (
              <div style={styles.chartsGrid}>
                <ChartCard title="RGB Histogram" subtitle="Pixel intensity distribution per channel">
                  <HistogramChart data={results?.histogram} />
                </ChartCard>

                <ChartCard title="Entropy Analysis" subtitle="Shannon entropy — high values indicate randomness">
                  <EntropyChart data={results?.entropy} />
                </ChartCard>

                <ChartCard
                  title="LSB Distribution"
                  subtitle="Ones vs zeros balance — near 50/50 is suspicious"
                  wide
                >
                  <LsbChart data={results?.lsb_noise} />
                </ChartCard>
              </div>
            )}

            {/* ── Sandbox tab ─────────────────────────────────── */}
            {activeTab === "sandbox" && (
              <SandboxPanel reportHash={file_info?.sha256} />
            )}

            {/* ── File info tab ────────────────────────────────── */}
            {activeTab === "fileinfo" && (
              <FileInfoTab fileInfo={file_info} summary={summary} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════

/** Single metadata item in the summary panel */
function MetaItem({ icon, label, value, mono, title }) {
  return (
    <div style={styles.metaItem}>
      <div style={styles.metaIcon}>{icon}</div>
      <div style={styles.metaText}>
        <span style={styles.metaLabel}>{label}</span>
        <span
          title={title || value}
          style={{
            ...styles.metaValue,
            fontFamily: mono ? "var(--font-mono)" : "inherit",
            fontSize:   mono ? "0.75rem"          : "0.8125rem",
          }}
        >
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

/** Wrapper card for each chart */
function ChartCard({ title, subtitle, children, wide = false }) {
  return (
    <div style={{
      ...styles.chartCard,
      ...(wide ? styles.chartCardWide : {}),
    }}>
      <div style={styles.chartCardHeader}>
        <p style={styles.chartCardTitle}>{title}</p>
        {subtitle && (
          <p style={styles.chartCardSub}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Full file info + summary scores in the File Info tab */
function FileInfoTab({ fileInfo, summary }) {
  if (!fileInfo && !summary) {
    return (
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
        No file information available.
      </p>
    );
  }

  const fileRows = [
    { label: "Filename",       value: fileInfo?.filename                        },
    { label: "SHA-256",        value: fileInfo?.sha256,          mono: true     },
    { label: "MD5",            value: fileInfo?.md5,             mono: true     },
    { label: "File size",      value: formatBytes(fileInfo?.size)               },
    { label: "Format",         value: fileInfo?.format                          },
    { label: "Mode",           value: fileInfo?.mode                            },
    { label: "Dimensions",     value: formatDimensions(fileInfo?.dimensions)    },
    { label: "Has alpha",      value: fileInfo?.has_alpha ? "Yes" : "No"        },
    { label: "Colour channels",value: fileInfo?.channels != null
                                        ? String(fileInfo.channels) : "—"       },
  ];

  const summaryRows = [
    { label: "Heuristic score",     value: `${summary?.heuristic_score ?? "—"} / 10`      },
    { label: "Threat level",        value: summary?.threat_level   ?? "—"                 },
    { label: "Stego suspicion",     value: summary?.stego_suspicion
                                             ? "Likely steganography detected"
                                             : "No strong stego evidence"                 },
    { label: "Suspicious modules",  value: String(summary?.suspicious_modules ?? 0)       },
    { label: "Total indicators",    value: String(summary?.indicators?.length  ?? 0)      },
  ];

  return (
    <div style={styles.fileInfoTab}>
      <InfoTable title="Image File" rows={fileRows} />
      <InfoTable title="Analysis Summary" rows={summaryRows} />
    </div>
  );
}

function InfoTable({ title, rows }) {
  return (
    <div style={styles.infoTableWrap}>
      <p style={styles.infoTableTitle}>{title}</p>
      <div style={styles.infoTable}>
        {rows.filter((r) => r.value != null).map(({ label, value, mono }) => (
          <div key={label} style={styles.infoRow}>
            <span style={styles.infoLabel}>{label}</span>
            <span style={{
              ...styles.infoValue,
              fontFamily: mono ? "var(--font-mono)" : "inherit",
              fontSize:   mono ? "0.72rem"          : "0.8125rem",
              wordBreak:  "break-all",
            }}>
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Styles ────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight:      "100vh",
    background:     "var(--color-bg)",
    paddingBottom:  "4rem",
  },
  inner: {
    maxWidth:       "1100px",
    margin:         "0 auto",
    padding:        "2rem 1.5rem",
    display:        "flex",
    flexDirection:  "column",
    gap:            "1.75rem",
  },

  // ── No report ──────────────────────────────────────────────
  noReport: {
    minHeight:      "100vh",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "2rem",
  },
  noReportCard: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "1rem",
    padding:        "3rem 2.5rem",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-xl)",
    boxShadow:      "var(--shadow-lg)",
    maxWidth:       "420px",
    textAlign:      "center",
  },

  // ── Back button ────────────────────────────────────────────
  backBtn: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "0.4rem",
    padding:        "0.4rem 0.875rem",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-md)",
    fontSize:       "0.875rem",
    fontWeight:     500,
    color:          "var(--color-text-secondary)",
    cursor:         "pointer",
    alignSelf:      "flex-start",
    transition:     "background var(--transition)",
  },

  // ── Top section ────────────────────────────────────────────
  topSection: {
    display:        "grid",
    gridTemplateColumns: "320px 1fr",
    gap:            "1.5rem",
    alignItems:     "start",
  },
  gaugeCard: {
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-xl)",
    padding:        "1.75rem 1.25rem",
    boxShadow:      "var(--shadow-sm)",
    display:        "flex",
    justifyContent: "center",
  },
  summaryPanel: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1rem",
  },
  summaryHeader: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            "0.75rem",
    flexWrap:       "wrap",
  },
  fileNameRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.5rem",
    minWidth:       0,
    flex:           1,
  },
  fileNameText: {
    fontSize:       "1.0625rem",
    fontWeight:     700,
    color:          "var(--color-text)",
    overflow:       "hidden",
    textOverflow:   "ellipsis",
    whiteSpace:     "nowrap",
    fontFamily:     "var(--font-mono)",
  },
  metaGrid: {
    display:        "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:            "0.625rem",
  },
  metaItem: {
    display:        "flex",
    alignItems:     "flex-start",
    gap:            "0.4rem",
    padding:        "0.5rem 0.75rem",
    background:     "var(--color-bg-secondary)",
    borderRadius:   "var(--radius-md)",
    border:         "1px solid var(--color-border)",
  },
  metaIcon: {
    color:          "var(--color-text-muted)",
    flexShrink:     0,
    paddingTop:     "2px",
  },
  metaText: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1px",
    minWidth:       0,
  },
  metaLabel: {
    fontSize:       "0.6875rem",
    fontWeight:     600,
    color:          "var(--color-text-muted)",
    textTransform:  "uppercase",
    letterSpacing:  "0.04em",
  },
  metaValue: {
    color:          "var(--color-text)",
    overflow:       "hidden",
    textOverflow:   "ellipsis",
    whiteSpace:     "nowrap",
  },

  // ── Tab section ────────────────────────────────────────────
  tabSection: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-xl)",
    overflow:       "hidden",
    boxShadow:      "var(--shadow-sm)",
  },
  tabBar: {
    display:        "flex",
    gap:            "0",
    borderBottom:   "1px solid var(--color-border)",
    background:     "var(--color-bg-secondary)",
    padding:        "0 0.5rem",
    overflowX:      "auto",
  },
  tabBtn: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "0.375rem",
    padding:        "0.875rem 1rem",
    border:         "none",
    borderBottom:   "2px solid transparent",
    background:     "none",
    fontSize:       "0.875rem",
    fontWeight:     500,
    color:          "var(--color-text-muted)",
    cursor:         "pointer",
    whiteSpace:     "nowrap",
    transition:     "color var(--transition), border-color var(--transition)",
    marginBottom:   "-1px",
  },
  tabBtnActive: {
    color:          "var(--color-primary)",
    borderBottomColor: "var(--color-primary)",
    fontWeight:     600,
  },
  tabCount: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    minWidth:       "18px",
    height:         "18px",
    borderRadius:   "var(--radius-full)",
    fontSize:       "0.6875rem",
    fontWeight:     700,
    padding:        "0 4px",
    transition:     "all var(--transition)",
  },
  tabContent: {
    padding:        "1.5rem",
    animation:      "fadeIn 0.2s ease forwards",
  },

  // ── Charts grid ────────────────────────────────────────────
  chartsGrid: {
    display:        "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:            "1rem",
  },
  chartCard: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.75rem",
    padding:        "1.25rem",
    background:     "var(--color-bg-secondary)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-lg)",
  },
  chartCardWide: {
    gridColumn:     "1 / -1",
  },
  chartCardHeader: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "2px",
  },
  chartCardTitle: {
    fontSize:       "0.9375rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },
  chartCardSub: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-muted)",
  },

  // ── File info tab ──────────────────────────────────────────
  fileInfoTab: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1.5rem",
  },
  infoTableWrap: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.5rem",
  },
  infoTableTitle: {
    fontSize:       "0.8125rem",
    fontWeight:     700,
    color:          "var(--color-text-muted)",
    textTransform:  "uppercase",
    letterSpacing:  "0.06em",
  },
  infoTable: {
    display:        "flex",
    flexDirection:  "column",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-md)",
    overflow:       "hidden",
  },
  infoRow: {
    display:               "grid",
    gridTemplateColumns:   "160px 1fr",
    padding:               "0.45rem 0.875rem",
    borderBottom:          "1px solid var(--color-border)",
    gap:                   "1rem",
    alignItems:            "start",
  },
  infoLabel: {
    fontSize:       "0.75rem",
    fontWeight:     600,
    color:          "var(--color-text-muted)",
    paddingTop:     "1px",
  },
  infoValue: {
    color:          "var(--color-text)",
  },
};