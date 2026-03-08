// src/pages/Home.jsx
/**
 * Home
 * Landing page — upload zone + live progress.
 * After a successful scan, useScan() navigates to /report automatically.
 */
import React                        from "react";
import { Shield, Github, BookOpen } from "lucide-react";
import UploadZone                   from "../components/upload/UploadZone";
import UploadProgress               from "../components/upload/UploadProgress";
import ErrorBanner                  from "../components/shared/ErrorBanner";
import useScan                      from "../hooks/useScan";

export default function Home() {
  const {
    phase,
    progress,
    file,
    error,
    startScan,
    reset,
    isBusy,
  } = useScan();

  return (
    <div style={styles.page}>
      <div style={styles.inner}>

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div style={styles.hero}>
          <div style={styles.heroBadge}>
            <Shield size={14} color="var(--color-primary)" />
            <span>LSB Steganalysis Tool</span>
          </div>

          <h1 style={styles.heroTitle}>
            Detect Hidden Payloads
            <span style={styles.heroTitleAccent}> Inside Images</span>
          </h1>

          <p style={styles.heroSub}>
            Upload a PNG, JPG, or BMP image. StegoAnalyzer runs
            14 independent detection modules — chi-square tests,
            entropy analysis, LSB extraction, file signature scanning,
            and optional VirusTotal lookup — then returns a full report.
          </p>

          {/* Stats row */}
          <div style={styles.statsRow}>
            {[
              { num: "14",    label: "Analysis modules"    },
              { num: "0–10",  label: "Threat score range"  },
              { num: "5",     label: "Detection phases"    },
              { num: "50 MB", label: "Max file size"       },
            ].map(({ num, label }) => (
              <div key={label} style={styles.statItem}>
                <span style={styles.statNum}>{num}</span>
                <span style={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upload card ───────────────────────────────────────── */}
        <div style={styles.uploadCard}>

          {/* Card header */}
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderDot} />
            <span style={styles.cardHeaderText}>
              {isBusy ? "Analysis in progress…" : "Upload Image for Analysis"}
            </span>
          </div>

          {/* Error banner */}
          {error && (
            <ErrorBanner
              message={error}
              onRetry={reset}
              onDismiss={reset}
            />
          )}

          {/* Upload zone OR progress */}
          {!isBusy ? (
            <UploadZone
              onFile={startScan}
              disabled={isBusy}
            />
          ) : (
            <UploadProgress
              phase={phase}
              progress={progress}
              filename={file?.name}
              filesize={file?.size}
              onCancel={reset}
            />
          )}
        </div>

        {/* ── How it works ──────────────────────────────────────── */}
        <div style={styles.howSection}>
          <h2 style={styles.howTitle}>How It Works</h2>
          <div style={styles.stepsRow}>
            {HOW_STEPS.map((step, i) => (
              <div key={i} style={styles.stepCard}>
                <div style={styles.stepNum}>{i + 1}</div>
                <div style={styles.stepIcon}>{step.icon}</div>
                <p style={styles.stepTitle}>{step.title}</p>
                <p style={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detection modules overview ────────────────────────── */}
        <div style={styles.modulesSection}>
          <h2 style={styles.howTitle}>Detection Modules</h2>
          <div style={styles.modulesGrid}>
            {MODULE_LIST.map(({ name, tag, desc }) => (
              <div key={name} style={styles.moduleChip}>
                <div style={styles.moduleChipHeader}>
                  <span style={styles.moduleChipName}>{name}</span>
                  <span style={{
                    ...styles.moduleChipTag,
                    background: TAG_COLORS[tag]?.bg   || "var(--color-bg-secondary)",
                    color:      TAG_COLORS[tag]?.color || "var(--color-text-muted)",
                  }}>
                    {tag}
                  </span>
                </div>
                <p style={styles.moduleChipDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            StegoAnalyzer — Final Year Cybersecurity Project
          </p>
          <p style={styles.footerSub}>
            Images are processed server-side and never stored permanently.
            Extracted payloads are saved to a sandboxed directory only.
          </p>
        </footer>

      </div>
    </div>
  );
}

// ── Static data ───────────────────────────────────────────────────

const HOW_STEPS = [
  {
    icon:  "📤",
    title: "Upload Image",
    desc:  "Drag and drop or browse for a PNG, JPG, or BMP image up to 50 MB.",
  },
  {
    icon:  "🔬",
    title: "14-Module Pipeline",
    desc:  "Five analysis phases run in sequence — statistical tests, LSB extraction, file signatures, metadata, and payload reconstruction.",
  },
  {
    icon:  "📊",
    title: "Scored Report",
    desc:  "Each module contributes a weighted score. The final 0–10 threat score maps to CLEAN / LOW / MEDIUM / HIGH / CRITICAL.",
  },
  {
    icon:  "📦",
    title: "Payload Sandbox",
    desc:  "If a hidden file is reconstructed, it is saved to the sandbox for manual inspection and optional VirusTotal submission.",
  },
];

const MODULE_LIST = [
  { name: "LSB Noise",          tag: "Statistical", desc: "Balance and autocorrelation of least significant bits per channel."     },
  { name: "Histogram",          tag: "Statistical", desc: "Pair-wise flattening detection across RGB intensity histograms."         },
  { name: "Chi-Square",         tag: "Statistical", desc: "Statistical randomness test on pixel value pairs."                       },
  { name: "Entropy",            tag: "Statistical", desc: "Shannon entropy on file, channels, LSB stream, and appended tail."       },
  { name: "Feature Extractor",  tag: "ML-Ready",    desc: "Autocorrelation coefficients and statistical moments feature vector."    },
  { name: "Alpha Channel",      tag: "Statistical", desc: "LSB analysis on the transparency plane of RGBA images."                  },
  { name: "File Signature",     tag: "Structural",  desc: "Magic byte scan for embedded files after IEND / EOI markers."            },
  { name: "Metadata",           tag: "Structural",  desc: "EXIF data, PNG ancillary chunks, and post-marker appended data."         },
  { name: "Hidden Signature",   tag: "Structural",  desc: "Full-file scan for any embedded file signatures at any offset."          },
  { name: "LSB Extractor",      tag: "Extraction",  desc: "Vectorised extraction of raw LSB bitstream from all RGB channels."       },
  { name: "Rebuild Payload",    tag: "Extraction",  desc: "Reconstructs a typed file (PE, ZIP, PDF…) from the LSB bitstream."      },
  { name: "Payload Validator",  tag: "Extraction",  desc: "Deep inspection of extracted payload — PE headers, strings, entropy."   },
  { name: "VirusTotal Image",   tag: "Threat Intel",desc: "Hash lookup of the original image against VirusTotal database."         },
  { name: "VirusTotal Payload", tag: "Threat Intel",desc: "Hash lookup of the extracted payload against VirusTotal database."      },
];

const TAG_COLORS = {
  "Statistical":  { bg: "var(--color-primary-light)",  color: "var(--color-primary)"  },
  "Structural":   { bg: "var(--color-info-bg)",         color: "var(--color-info)"     },
  "Extraction":   { bg: "var(--color-medium-bg)",       color: "var(--color-medium)"   },
  "ML-Ready":     { bg: "#f3e8ff",                      color: "#7c3aed"               },
  "Threat Intel": { bg: "var(--color-critical-bg)",     color: "var(--color-critical)" },
};

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight:      "100vh",
    background:     "var(--color-bg)",
    paddingBottom:  "4rem",
  },
  inner: {
    maxWidth:       "820px",
    margin:         "0 auto",
    padding:        "2.5rem 1.5rem",
    display:        "flex",
    flexDirection:  "column",
    gap:            "3rem",
  },

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "1rem",
    textAlign:      "center",
    paddingTop:     "1rem",
  },
  heroBadge: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "0.4rem",
    padding:        "0.3rem 0.875rem",
    background:     "var(--color-primary-light)",
    border:         "1px solid var(--color-primary-border)",
    borderRadius:   "var(--radius-full)",
    fontSize:       "0.8125rem",
    fontWeight:     600,
    color:          "var(--color-primary)",
  },
  heroTitle: {
    fontSize:       "clamp(1.75rem, 5vw, 2.75rem)",
    fontWeight:     800,
    letterSpacing:  "-0.03em",
    lineHeight:     1.15,
    color:          "var(--color-text)",
    margin:         0,
  },
  heroTitleAccent: {
    color:          "var(--color-primary)",
  },
  heroSub: {
    maxWidth:       "580px",
    fontSize:       "1rem",
    color:          "var(--color-text-secondary)",
    lineHeight:     1.7,
    margin:         0,
  },
  statsRow: {
    display:        "flex",
    gap:            "0.75rem",
    flexWrap:       "wrap",
    justifyContent: "center",
    marginTop:      "0.5rem",
  },
  statItem: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            "2px",
    padding:        "0.625rem 1.25rem",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-lg)",
    minWidth:       "80px",
  },
  statNum: {
    fontSize:       "1.25rem",
    fontWeight:     700,
    color:          "var(--color-primary)",
    fontFamily:     "var(--font-mono)",
    lineHeight:     1,
  },
  statLabel: {
    fontSize:       "0.6875rem",
    color:          "var(--color-text-muted)",
    fontWeight:     500,
    textAlign:      "center",
    lineHeight:     1.3,
  },

  // ── Upload card ─────────────────────────────────────────────
  uploadCard: {
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-xl)",
    padding:        "1.75rem",
    boxShadow:      "var(--shadow-lg)",
    display:        "flex",
    flexDirection:  "column",
    gap:            "1.25rem",
  },
  cardHeader: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.5rem",
  },
  cardHeaderDot: {
    width:          "8px",
    height:         "8px",
    borderRadius:   "50%",
    background:     "var(--color-primary)",
    flexShrink:     0,
  },
  cardHeaderText: {
    fontSize:       "0.875rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },

  // ── How it works ────────────────────────────────────────────
  howSection: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1.25rem",
  },
  howTitle: {
    fontSize:       "1.25rem",
    fontWeight:     700,
    color:          "var(--color-text)",
    margin:         0,
  },
  stepsRow: {
    display:        "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap:            "1rem",
  },
  stepCard: {
    position:       "relative",
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.4rem",
    padding:        "1.25rem",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-lg)",
  },
  stepNum: {
    position:       "absolute",
    top:            "0.75rem",
    right:          "0.875rem",
    fontSize:       "0.75rem",
    fontWeight:     700,
    color:          "var(--color-text-muted)",
    fontFamily:     "var(--font-mono)",
  },
  stepIcon: {
    fontSize:       "1.5rem",
    lineHeight:     1,
    marginBottom:   "0.25rem",
  },
  stepTitle: {
    fontSize:       "0.9375rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },
  stepDesc: {
    fontSize:       "0.8125rem",
    color:          "var(--color-text-secondary)",
    lineHeight:     1.5,
  },

  // ── Modules grid ────────────────────────────────────────────
  modulesSection: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "1.25rem",
  },
  modulesGrid: {
    display:        "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap:            "0.625rem",
  },
  moduleChip: {
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.3rem",
    padding:        "0.875rem 1rem",
    background:     "var(--color-surface)",
    border:         "1px solid var(--color-border)",
    borderRadius:   "var(--radius-md)",
  },
  moduleChipHeader: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            "0.5rem",
  },
  moduleChipName: {
    fontSize:       "0.875rem",
    fontWeight:     600,
    color:          "var(--color-text)",
  },
  moduleChipTag: {
    fontSize:       "0.6rem",
    fontWeight:     700,
    padding:        "2px 7px",
    borderRadius:   "var(--radius-full)",
    textTransform:  "uppercase",
    letterSpacing:  "0.04em",
    whiteSpace:     "nowrap",
    flexShrink:     0,
  },
  moduleChipDesc: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-muted)",
    lineHeight:     1.45,
  },

  // ── Footer ──────────────────────────────────────────────────
  footer: {
    textAlign:      "center",
    display:        "flex",
    flexDirection:  "column",
    gap:            "0.3rem",
    paddingTop:     "1rem",
    borderTop:      "1px solid var(--color-border)",
  },
  footerText: {
    fontSize:       "0.875rem",
    fontWeight:     600,
    color:          "var(--color-text-muted)",
  },
  footerSub: {
    fontSize:       "0.75rem",
    color:          "var(--color-text-muted)",
    lineHeight:     1.5,
  },
};