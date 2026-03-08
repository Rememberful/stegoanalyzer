// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    proxy: {
      // Every request starting with /api is forwarded to FastAPI.
      // This means in development you never deal with CORS at all —
      // the browser thinks everything is on the same origin.
      "/api": {
        target:       "http://localhost:8000",
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  build: {
    // Output folder — serve this as static files when hosting
    outDir:    "dist",
    sourcemap: false,

    // Warn if any chunk exceeds this size (in KB)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk for better caching
        manualChunks: {
          react:    ["react", "react-dom", "react-router-dom"],
          charts:   ["recharts"],
          icons:    ["lucide-react"],
        },
      },
    },
  },
});