// src/api/scanApi.js
/**
 * scanApi.js
 * ──────────────────────────────────────────────────────────────────
 * All HTTP communication with the FastAPI backend lives here.
 * No component ever calls axios directly — always through this file.
 *
 * URL strategy:
 *   Development  → VITE_API_URL is empty, Vite proxy forwards
 *                  /api/* to localhost:8000 automatically.
 *   Production   → Set VITE_API_URL=https://your-backend.com
 *                  in frontend/.env before building.
 * ──────────────────────────────────────────────────────────────────
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

// ── Axios instance ────────────────────────────────────────────────
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 180_000, // 3 min — large images + VT lookup can be slow
});

// ── Response interceptor — normalise all errors to plain strings ──
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // FastAPI sends errors in { detail: "..." } shape
    const message =
      error.response?.data?.detail   ||
      error.response?.data?.message  ||
      error.message                  ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);


// ════════════════════════════════════════════════════════════════════
// SCAN ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * Upload an image file and run the full steganalysis pipeline.
 *
 * @param {File}     file        The image File object from the input/drop
 * @param {Function} onProgress  Called with upload % (0–100) as it uploads
 * @returns {Promise<Object>}    Full ScanReport from the backend
 */
export async function scanImage(file, onProgress) {
  const form = new FormData();
  form.append("file", file);

  const { data } = await client.post("/scan", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    },
  });

  return data;
}

/**
 * Retrieve a previously completed scan by its SHA-256 file hash.
 * Used to reload a result without re-uploading the image.
 *
 * @param {string} fileHash  SHA-256 hex string
 * @returns {Promise<Object>} ScanReport
 */
export async function getScan(fileHash) {
  const { data } = await client.get(`/scan/${fileHash}`);
  return data;
}

/**
 * Get a summary list of all scans cached in the current server session.
 *
 * @returns {Promise<{ total: number, scans: Array }>}
 */
export async function listScans() {
  const { data } = await client.get("/scans");
  return data;
}

/**
 * Clear all scan results from the server-side in-memory cache.
 *
 * @returns {Promise<{ message: string }>}
 */
export async function clearScans() {
  const { data } = await client.delete("/scans");
  return data;
}


// ════════════════════════════════════════════════════════════════════
// SANDBOX ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * List all files currently sitting in the backend sandbox directory.
 * These are payloads extracted during analysis.
 *
 * @returns {Promise<{ total: number, files: Array }>}
 */
export async function listSandbox() {
  const { data } = await client.get("/sandbox/list");
  return data;
}

/**
 * Build the direct download URL for a sandbox file.
 * Used as an <a href> or triggered via window.location.
 *
 * @param  {string} filename  Exact filename as returned by listSandbox()
 * @returns {string}          Full URL string
 */
export function sandboxDownloadUrl(filename) {
  return `${BASE_URL}/sandbox/download/${encodeURIComponent(filename)}`;
}

/**
 * Delete all files from the sandbox directory on the server.
 *
 * @returns {Promise<{ message: string }>}
 */
export async function clearSandbox() {
  const { data } = await client.delete("/sandbox/clear");
  return data;
}


// ════════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════════

/**
 * Ping the backend health endpoint.
 * Useful for checking if the server is reachable before a scan.
 *
 * @returns {Promise<{ status: string, service: string, version: string }>}
 */
export async function healthCheck() {
  const { data } = await client.get("/health");
  return data;
}