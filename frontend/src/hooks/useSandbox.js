// src/hooks/useSandbox.js
/**
 * useSandbox
 * ──────────────────────────────────────────────────────────────────
 * Manages fetching, refreshing, and clearing the list of files
 * that the backend extracted to its sandbox directory during a scan.
 *
 * Usage:
 *   const { files, loading, error, refresh, clear, downloadUrl }
 *     = useSandbox();
 *
 *   // Fetch on mount
 *   useEffect(() => { refresh(); }, [refresh]);
 * ──────────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from "react";
import {
  listSandbox,
  clearSandbox,
  sandboxDownloadUrl,
} from "../api/scanApi";

export default function useSandbox() {
  const [files,   setFiles]   = useState([]); // array of file metadata objects
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [total,   setTotal]   = useState(0);

  // ── Fetch current sandbox file list ────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSandbox();
      setFiles(data.files  || []);
      setTotal(data.total  || 0);
    } catch (err) {
      setError(err.message || "Failed to load sandbox files");
      setFiles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Clear all sandbox files ─────────────────────────────────────
  const clear = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await clearSandbox();
      setFiles([]);
      setTotal(0);
    } catch (err) {
      setError(err.message || "Failed to clear sandbox");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Get download URL for a specific file ────────────────────────
  // Returns a URL string — component uses it as <a href> or
  // calls window.open() with it.
  const downloadUrl = useCallback((filename) => {
    return sandboxDownloadUrl(filename);
  }, []);

  // ── Trigger browser download programmatically ───────────────────
  const downloadFile = useCallback((filename) => {
    const url  = sandboxDownloadUrl(filename);
    const link = document.createElement("a");
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return {
    files,        // Array<{ filename, path, size_bytes, size_human }>
    total,        // number of files
    loading,      // boolean
    error,        // string | null
    refresh,      // () => Promise<void>
    clear,        // () => Promise<void>
    downloadUrl,  // (filename) => string
    downloadFile, // (filename) => void — triggers browser download
    isEmpty: files.length === 0 && !loading,
  };
}
