// src/components/shared/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation }          from "react-router-dom";
import { Shield, Activity, Menu, X }  from "lucide-react";
import { healthCheck }                from "../../api/scanApi";

export default function Navbar() {
  const location                    = useLocation();
  const [menuOpen,  setMenuOpen]    = useState(false);
  const [apiOnline, setApiOnline]   = useState(null); // null=checking, true, false

  // ── Check backend health on mount ──────────────────────────────
  useEffect(() => {
    healthCheck()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  // ── Close mobile menu on route change ──────────────────────────
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>

        {/* ── Brand ────────────────────────────────────────────── */}
        <Link to="/" style={styles.brand}>
          <div style={styles.logoBox}>
            <Shield size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={styles.brandName}>StegoAnalyzer</span>
          <span style={styles.brandTag}>v1.0</span>
        </Link>

        {/* ── Desktop nav links ─────────────────────────────────── */}
        <div style={styles.links}>
          <NavLink to="/"       label="Scanner" active={isActive("/")}       />
          <NavLink to="/report" label="Report"  active={isActive("/report")} />
        </div>

        {/* ── Right side ───────────────────────────────────────── */}
        <div style={styles.right}>
          {/* API status indicator */}
          <ApiStatus online={apiOnline} />

          {/* Mobile hamburger */}
          <button
            style={styles.hamburger}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen
              ? <X    size={20} color="var(--color-text-secondary)" />
              : <Menu size={20} color="var(--color-text-secondary)" />
            }
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────────── */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          <MobileNavLink to="/"       label="Scanner" active={isActive("/")}       />
          <MobileNavLink to="/report" label="Report"  active={isActive("/report")} />
        </div>
      )}
    </nav>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      style={{
        ...styles.link,
        ...(active ? styles.linkActive : {}),
      }}
    >
      {label}
      {active && <span style={styles.linkDot} />}
    </Link>
  );
}

function MobileNavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      style={{
        ...styles.mobileLink,
        ...(active ? styles.mobileLinkActive : {}),
      }}
    >
      {label}
    </Link>
  );
}

function ApiStatus({ online }) {
  // Still checking
  if (online === null) {
    return (
      <div style={styles.statusWrap}>
        <span style={{ ...styles.statusDot, background: "#94a3b8" }} />
        <span style={styles.statusLabel}>Connecting…</span>
      </div>
    );
  }

  return (
    <div style={styles.statusWrap} title={online ? "Backend is online" : "Backend is offline"}>
      <span
        style={{
          ...styles.statusDot,
          background: online ? "#16a34a" : "#dc2626",
          // Pulse animation when online
          animation: online ? "pulse 2s ease-in-out infinite" : "none",
        }}
      />
      <span style={styles.statusLabel}>
        {online ? "API Online" : "API Offline"}
      </span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  nav: {
    position:        "fixed",
    top:             0,
    left:            0,
    right:           0,
    height:          "var(--navbar-height)",
    background:      "var(--color-surface)",
    borderBottom:    "1px solid var(--color-border)",
    zIndex:          1000,
    boxShadow:       "var(--shadow-sm)",
  },
  inner: {
    maxWidth:        "1200px",
    margin:          "0 auto",
    padding:         "0 1.5rem",
    height:          "100%",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    gap:             "1.5rem",
  },
  brand: {
    display:         "flex",
    alignItems:      "center",
    gap:             "0.625rem",
    textDecoration:  "none",
    flexShrink:      0,
  },
  logoBox: {
    width:           "32px",
    height:          "32px",
    borderRadius:    "var(--radius-md)",
    background:      "var(--color-primary)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  brandName: {
    fontWeight:      700,
    fontSize:        "1rem",
    color:           "var(--color-text)",
    letterSpacing:   "-0.01em",
  },
  brandTag: {
    fontSize:        "0.6875rem",
    color:           "var(--color-text-muted)",
    background:      "var(--color-bg-secondary)",
    border:          "1px solid var(--color-border)",
    borderRadius:    "var(--radius-full)",
    padding:         "1px 6px",
    fontWeight:      500,
  },
  links: {
    display:         "flex",
    alignItems:      "center",
    gap:             "0.25rem",
    flex:            1,
  },
  link: {
    position:        "relative",
    display:         "flex",
    flexDirection:   "column",
    alignItems:      "center",
    gap:             "2px",
    padding:         "0.375rem 0.75rem",
    borderRadius:    "var(--radius-md)",
    fontSize:        "0.875rem",
    fontWeight:      500,
    color:           "var(--color-text-secondary)",
    textDecoration:  "none",
    transition:      "background var(--transition), color var(--transition)",
  },
  linkActive: {
    color:           "var(--color-primary)",
    background:      "var(--color-primary-light)",
  },
  linkDot: {
    width:           "4px",
    height:          "4px",
    borderRadius:    "50%",
    background:      "var(--color-primary)",
  },
  right: {
    display:         "flex",
    alignItems:      "center",
    gap:             "1rem",
    flexShrink:      0,
  },
  statusWrap: {
    display:         "flex",
    alignItems:      "center",
    gap:             "0.4rem",
  },
  statusDot: {
    width:           "8px",
    height:          "8px",
    borderRadius:    "50%",
    flexShrink:      0,
  },
  statusLabel: {
    fontSize:        "0.75rem",
    color:           "var(--color-text-muted)",
    fontWeight:      500,
    whiteSpace:      "nowrap",
  },
  hamburger: {
    display:         "none",
    background:      "none",
    border:          "none",
    cursor:          "pointer",
    padding:         "4px",
    borderRadius:    "var(--radius-sm)",
  },
  mobileMenu: {
    display:         "flex",
    flexDirection:   "column",
    padding:         "0.5rem 1rem 1rem",
    borderTop:       "1px solid var(--color-border)",
    background:      "var(--color-surface)",
    animation:       "slideDown 0.2s ease forwards",
  },
  mobileLink: {
    display:         "block",
    padding:         "0.75rem 1rem",
    borderRadius:    "var(--radius-md)",
    fontSize:        "0.9375rem",
    fontWeight:      500,
    color:           "var(--color-text-secondary)",
    textDecoration:  "none",
  },
  mobileLinkActive: {
    color:           "var(--color-primary)",
    background:      "var(--color-primary-light)",
  },
};