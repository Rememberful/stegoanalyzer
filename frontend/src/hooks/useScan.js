// src/hooks/useScan.js
/**
 * useScan
 * ──────────────────────────────────────────────────────────────────
 * Owns the entire upload → scan → result state machine.
 * Components just call startScan(file) and read back the state.
 *
 * Phase machine:
 *
 *   idle
 *    │
 *    ▼  startScan(file) called
 *   uploading  ── file bytes going to server (progress 0→100)
 *    │
 *    ▼  upload hits 100%
 *   scanning   ── server running all 13 analysis modules
 *    │
 *    ├──▶ done   ── report received, navigates to /report
 *    │
 *    └──▶ error  ── something went wrong, error message set
 *
 * Calling reset() returns to idle from any state.
 * ──────────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from "react";
import { useNavigate }           from "react-router-dom";
import { scanImage }             from "../api/scanApi";

// Valid phase values — exported so components can compare safely
export const PHASES = {
  IDLE:      "idle",
  UPLOADING: "uploading",
  SCANNING:  "scanning",
  DONE:      "done",
  ERROR:     "error",
};

export default function useScan() {
  const navigate = useNavigate();

  const [phase,    setPhase]    = useState(PHASES.IDLE);
  const [progress, setProgress] = useState(0);    // 0–100 upload progress
  const [report,   setReport]   = useState(null); // full ScanReport object
  const [error,    setError]    = useState(null); // error message string
  const [file,     setFile]     = useState(null); // the File object being scanned

  // ── Reset to idle ───────────────────────────────────────────────
  const reset = useCallback(() => {
    setPhase(PHASES.IDLE);
    setProgress(0);
    setReport(null);
    setError(null);
    setFile(null);
  }, []);

  // ── Main scan trigger ───────────────────────────────────────────
  const startScan = useCallback(async (imageFile) => {
    if (!imageFile) return;

    // Validate file type on the client side before sending
    const ext = imageFile.name.split(".").pop()?.toLowerCase();
    const allowed = ["png", "jpg", "jpeg", "bmp"];
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type ".${ext}". Please upload a PNG, JPG, or BMP image.`);
      setPhase(PHASES.ERROR);
      return;
    }

    // Validate file size on client (50MB limit matches backend)
    const maxMb = 50;
    if (imageFile.size > maxMb * 1024 * 1024) {
      setError(`File is too large (${(imageFile.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${maxMb} MB.`);
      setPhase(PHASES.ERROR);
      return;
    }

    // Reset any previous scan
    setFile(imageFile);
    setError(null);
    setReport(null);
    setProgress(0);
    setPhase(PHASES.UPLOADING);

    try {
      // Track upload progress
      // When progress hits 100 the file is on the server —
      // switch to "scanning" phase while we wait for analysis
      const handleProgress = (pct) => {
        setProgress(pct);
        if (pct >= 100) {
          setPhase(PHASES.SCANNING);
        }
      };

      const result = await scanImage(imageFile, handleProgress);

      // Sanity check — backend should always return status "ok"
      if (result?.status === "error") {
        throw new Error(result.error || "Backend returned an error");
      }

      setReport(result);
      setPhase(PHASES.DONE);

      // Pass the report via router state so Report page
      // can read it without a second network request
      navigate("/report", { state: { report: result } });

    } catch (err) {
      setError(err.message || "Scan failed. Please try again.");
      setPhase(PHASES.ERROR);
    }
  }, [navigate]);

  // ── Derived booleans — keep component code readable ─────────────
  const isIdle      = phase === PHASES.IDLE;
  const isUploading = phase === PHASES.UPLOADING;
  const isScanning  = phase === PHASES.SCANNING;
  const isDone      = phase === PHASES.DONE;
  const isError     = phase === PHASES.ERROR;
  const isBusy      = isUploading || isScanning;

  return {
    // State
    phase,
    progress,
    report,
    error,
    file,

    // Actions
    startScan,
    reset,

    // Derived booleans
    isIdle,
    isUploading,
    isScanning,
    isDone,
    isError,
    isBusy,
  };
}