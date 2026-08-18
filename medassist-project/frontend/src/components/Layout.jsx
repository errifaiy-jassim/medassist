import React, { useState } from "react";
import { searchPatients } from "../services/api";

const NAV_ITEMS = [
  { key: "screen2", label: "Tableau de bord", icon: "dashboard" },
  { key: "patients", label: "Patients", icon: "patients" },
  { key: "history", label: "Historique", icon: "history" },
  { key: "settings", label: "Paramètres", icon: "settings" },
  { key: "offline", label: "Mode Hors-Ligne", icon: "offline" },
];

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "patients":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "offline":
      return (
        <svg {...common}>
          <path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "stethoscope":
      return (
        <svg {...common}>
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
          <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Layout({
  currentScreen,
  onNavigate,
  children,
  doctorName,
  onLogout,
  user = null,
  isOffline = false,
  databaseConnected = true,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");

  const displayName = doctorName
    || (user?.full_name ? (user.full_name.toLowerCase().startsWith("dr") ? user.full_name : `Dr. ${user.full_name}`) : "Praticien");
  const specialty = user?.specialty || "Médecine";
  const initials = displayName
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MD";

  const handleSearch = async (event) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    if (isOffline) {
      setSearchError("Recherche indisponible hors-ligne.");
      return;
    }
    setSearchError("");
    try {
      const results = await searchPatients(q);
      setSearchResults(results || []);
      onNavigate("patients");
    } catch (err) {
      setSearchError(err.message || "Erreur de recherche");
      setSearchResults([]);
    }
  };

  return (
    <div className="flex min-h-screen">
{/* Sidebar */}
<aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} shadow-2xl`}
      >
        {/* Logo */}
<div className="relative px-7 pt-8 pb-6 border-b border-white/10">
          <svg className="absolute top-6 right-6 w-16 h-16 text-white/5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12h4l2-6 4 12 2-6h8" className="ecg-line" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center text-white shadow-lg shrink-0">
              <Icon name="stethoscope" size={22} />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight text-white">MedAssist</div>
              <div className="text-[11px] text-white/70 tracking-wide">Assistant Clinique IA</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = currentScreen === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer
                  ${active
                    ? "bg-[var(--medical-blue)] text-white shadow-lg"
                    : "text-white hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"}`}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Doctor card */}
        <div className="px-4 pb-6">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] flex items-center justify-center text-[var(--primary-navy)] font-bold text-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                <div className="text-[11px] text-white/50">{specialty}{user?.inpe ? ` • ${user.inpe}` : ""}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition cursor-pointer"
            >
              <Icon name="logout" size={15} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-4 px-6 lg:px-10 h-16 lg:h-[72px]">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-app)] text-[var(--primary-navy)] cursor-pointer"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex relative items-center flex-1 max-w-md bg-[var(--bg-app)] rounded-xl px-4 py-2.5 gap-2 border border-transparent focus-within:border-[var(--gold)]">
              <span className="text-[var(--text-muted)]"><Icon name="search" size={18} /></span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un patient, un dossier..."
                className="bg-transparent outline-none text-sm w-full text-[var(--text-heading)] placeholder-[#9CA3AF]"
                disabled={isOffline}
              />
              {searchError ? (
                <span className="absolute left-0 top-full mt-1 text-[11px] text-[var(--danger)]">{searchError}</span>
              ) : null}
              {searchResults.length > 0 ? (
                <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">{searchResults.length} résultat(s)</span>
              ) : null}
            </form>

            <div className="flex-1 md:hidden" />

            {/* Right icons */}
            <div className="flex items-center gap-3">
              <span className={`hidden sm:inline-flex lux-badge ${isOffline || !databaseConnected ? "badge-amber" : "badge-green"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline || !databaseConnected ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`} />
                {isOffline ? "Hors-ligne" : databaseConnected ? "Serveur connecté" : "BDD indisponible"}
              </span>
              <button
                type="button"
                onClick={() => onNavigate("offline")}
                className="relative p-2 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-muted)] cursor-pointer"
                aria-label="État de connexion"
              >
                <Icon name="bell" size={20} />
                {isOffline ? <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full" /> : null}
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 lg:px-10 py-8 lg:py-10">
          <div className="max-w-7xl mx-auto animate-fade-up" key={currentScreen}>
            {children}
          </div>
        </main>

        <footer className="px-6 lg:px-10 pb-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} MedAssist — Système d'Aide à la Consultation IA · Conforme RGPD & HDS
          </p>
        </footer>
      </div>
    </div>
  );
}
