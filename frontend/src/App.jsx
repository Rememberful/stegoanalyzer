// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar  from "./components/shared/Navbar";
import Home    from "./pages/Home";
import Report  from "./pages/Report";

export default function App() {
  return (
    <>
      {/* Navbar is always visible */}
      <Navbar />

      {/*
        Main content area sits below the fixed navbar.
        64px = var(--navbar-height)
      */}
      <main style={{ paddingTop: "var(--navbar-height)" }}>
        <Routes>
          <Route path="/"       element={<Home />}   />
          <Route path="/report" element={<Report />} />

          {/* Catch-all — redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}