import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  History,
  LogOut,
  Mic,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { fetchAllConsultations, searchPatients } from "../services/api";

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
    default:
      return null;
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMinutes = Math.floor((now - d) / 60000);
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${time}`;
}

export default function Layout({
  currentScreen,
  onNavigate,
  onOpenConsultation,
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

  // Dropdown states for Bell and Profile
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const displayName =
    doctorName ||
    (user?.full_name
      ? user.full_name.toLowerCase().startsWith("dr")
        ? user.full_name
        : `Dr. ${user.full_name}`
      : "Dr. Ahmed Mansouri");
  const specialty = user?.specialty || "Médecine Générale";
  const initials =
    displayName
      .replace(/^Dr\.?\s*/i, "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AM";

  // Close popups on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch real clinical notifications from backend consultations
  const loadClinicalNotifications = async () => {
    setLoadingNotifs(true);
    const notifs = [];

    if (isOffline) {
      notifs.push({
        id: "offline-alert",
        title: "Mode Hors-Ligne Actif",
        message: "Enregistrement local activé. Les données seront synchronisées au rétablissement du réseau.",
        type: "warning",
        time: "En cours",
        actionScreen: "offline",
      });
    }

    if (!databaseConnected && !isOffline) {
      notifs.push({
        id: "db-alert",
        title: "Base de données inaccessible",
        message: "Impossible de joindre le serveur MedAssist.",
        type: "danger",
        time: "Urgent",
        actionScreen: "settings",
      });
    }

    try {
      if (!isOffline) {
        const rawConsultations = await fetchAllConsultations();
        const consultations = Array.isArray(rawConsultations) ? rawConsultations : [];

        // Parse real consultations into actionable notifications
        consultations.slice(0, 8).forEach((c) => {
          const patientName = c.patient_name || "Patient";
          const time = formatRelativeTime(c.created_at || c.updated_at);

          if (["transcribed", "analyzed", "coded"].includes(c.status) && c.validation_status !== "validated") {
            notifs.push({
              id: `notif-${c.id}`,
              consultationId: c.id,
              title: patientName,
              message: "Consultation codée en attente de validation médicale.",
              type: "warning",
              statusBadge: "À valider",
              time,
            });
          } else if (["draft", "transcribing"].includes(c.status)) {
            notifs.push({
              id: `notif-${c.id}`,
              consultationId: c.id,
              title: patientName,
              message: "Dictée vocale en cours d'enregistrement.",
              type: "info",
              statusBadge: "En cours",
              time,
            });
          } else if (c.transmission_status === "sent" || c.status === "transmitted") {
            notifs.push({
              id: `notif-${c.id}`,
              consultationId: c.id,
              title: patientName,
              message: `Consultation validée et transmise au SIH ${c.transmission_id ? `(#${c.transmission_id.slice(0, 8)})` : ""}`,
              type: "success",
              statusBadge: "Transmise",
              time,
            });
          } else if (c.validation_status === "validated" || c.status === "validated") {
            notifs.push({
              id: `notif-${c.id}`,
              consultationId: c.id,
              title: patientName,
              message: "Consultation validée médicalement. Prête pour envoi SIH.",
              type: "success",
              statusBadge: "Validée",
              time,
            });
          } else if (c.status === "failed" || c.transmission_status === "failed") {
            notifs.push({
              id: `notif-${c.id}`,
              consultationId: c.id,
              title: patientName,
              message: "Échec de transmission SIH. Cliquez pour vérifier.",
              type: "danger",
              statusBadge: "Échec",
              time,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Could not load consultations for notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }

    if (notifs.length === 0) {
      notifs.push({
        id: "system-ready",
        title: "Système MedAssist",
        message: "Tous les services IA, transcription et codification sont prêts.",
        type: "success",
        time: "Prêt",
        actionScreen: "screen2",
      });
    }

    setNotifications(notifs);
    const unread = notifs.filter((n) => n.type === "warning" || n.type === "danger").length || (notifs.length > 1 ? notifs.length : 0);
    setUnreadCount(unread);
  };

  useEffect(() => {
    loadClinicalNotifications();
  }, [isOffline, databaseConnected]);

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

  const handleNotificationClick = (notif) => {
    setShowNotifications(false);
    if (notif.consultationId && onOpenConsultation) {
      onOpenConsultation(notif.consultationId);
    } else if (notif.actionScreen && onNavigate) {
      onNavigate(notif.actionScreen);
    } else if (onNavigate) {
      onNavigate("history");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
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
            <img src="/logo.png" alt="MedAssist Logo" className="w-11 h-11 rounded-xl object-contain shrink-0 bg-white p-1" />
            <div>
              <div className="text-lg font-bold leading-tight text-white">MedAssist</div>
              <div className="text-[11px] text-white/70 tracking-wide">Assistant Clinique IA</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = currentScreen === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  setMobileOpen(false);
                }}
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

        {/* Doctor Card in Sidebar */}
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[var(--border-soft)] shadow-sm">
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

            {/* Search Box */}
            <form onSubmit={handleSearch} className="hidden md:flex relative items-center flex-1 max-w-md bg-[var(--bg-app)] rounded-xl px-4 py-2.5 gap-2 border border-transparent focus-within:border-[var(--medical-blue)] transition-all">
              <span className="text-[var(--text-muted)]"><Search size={18} /></span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un patient, NIR, dossier..."
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

            {/* Right Icons */}
            <div className="flex items-center gap-4">
              {/* Online / Offline Status Badge */}
              <span className={`hidden sm:inline-flex lux-badge ${isOffline || !databaseConnected ? "badge-amber" : "badge-green"}`}>
                <span className={`w-2 h-2 rounded-full ${isOffline || !databaseConnected ? "bg-[var(--warning)] animate-pulse" : "bg-[var(--success)]"}`} />
                {isOffline ? "Mode Hors-ligne" : databaseConnected ? "Serveur Connecté" : "BDD Indisponible"}
              </span>

              {/* 1. NOTIFICATION BELL (Interactive with Dropdown) */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                    if (!showNotifications) loadClinicalNotifications();
                  }}
                  className={`relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    showNotifications
                      ? "bg-[var(--medical-blue-light)] text-[var(--medical-blue-dark)] ring-2 ring-[var(--medical-blue)]"
                      : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                  aria-label="Notifications"
                  title="Centre de notifications"
                >
                  <Bell size={21} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Card */}
                {showNotifications && (
                  <div className="absolute right-0 top-12 mt-2 w-84 sm:w-96 bg-white border border-[var(--border-soft)] rounded-2xl shadow-2xl z-50 p-4 animate-fade-up">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Bell size={17} className="text-[var(--medical-blue)]" />
                        <h4 className="font-bold text-sm text-[var(--text-heading)]">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="lux-badge badge-blue text-[10px] py-0.5 px-2 font-bold">{unreadCount}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadClinicalNotifications}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                          title="Actualiser les notifications"
                        >
                          <RefreshCw size={13} className={loadingNotifs ? "animate-spin" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnreadCount(0)}
                          className="text-xs text-[var(--medical-blue)] hover:underline font-medium cursor-pointer"
                        >
                          Tout marquer lu
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className="p-3 bg-[var(--bg-app)] hover:bg-blue-50/80 border border-transparent hover:border-blue-200 rounded-xl transition-all cursor-pointer flex items-start gap-3 group"
                        >
                          <div className="mt-0.5 shrink-0">
                            {notif.type === "danger" ? (
                              <AlertCircle size={17} className="text-red-500" />
                            ) : notif.type === "warning" ? (
                              <Activity size={17} className="text-amber-500" />
                            ) : notif.type === "info" ? (
                              <Mic size={17} className="text-[var(--medical-blue)]" />
                            ) : (
                              <CheckCircle2 size={17} className="text-emerald-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs font-bold text-[var(--text-heading)] group-hover:text-[var(--medical-blue)] transition-colors">
                                  {notif.title}
                                </span>
                                {notif.statusBadge && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                    notif.type === "warning"
                                      ? "bg-amber-100 text-amber-800"
                                      : notif.type === "success"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}>
                                    {notif.statusBadge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                            </div>
                            <p className="text-xs text-[var(--text-body)] mt-0.5 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-[var(--medical-blue)] font-medium inline-flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Ouvrir la consultation <ChevronRight size={11} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Système MedAssist HDS</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          onNavigate("history");
                        }}
                        className="text-[var(--medical-blue)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Historique complet <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. USER PROFILE CIRCLE (AM) (Interactive with Dropdown) */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu);
                    setShowNotifications(false);
                  }}
                  className={`flex items-center gap-2.5 p-1 rounded-full transition-all duration-200 cursor-pointer ${
                    showProfileMenu
                      ? "ring-2 ring-[var(--medical-blue)] ring-offset-2"
                      : "hover:opacity-90"
                  }`}
                  aria-label="Menu profil"
                  title="Profil et options"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    {initials}
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-12 mt-2 w-72 bg-white border border-[var(--border-soft)] rounded-2xl shadow-2xl z-50 p-2 animate-fade-up">
                    {/* User Identity Info */}
                    <div className="p-3 bg-[var(--bg-app)] rounded-xl mb-2 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[var(--text-heading)] truncate">{displayName}</div>
                        <div className="text-xs text-[var(--text-muted)] truncate">{specialty}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Session active</span>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate("settings");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[var(--medical-blue)] rounded-xl transition-all cursor-pointer font-medium"
                      >
                        <Settings size={17} className="text-slate-500" />
                        <span>Paramètres & Profil</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onNavigate("history");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[var(--medical-blue)] rounded-xl transition-all cursor-pointer font-medium"
                      >
                        <History size={17} className="text-slate-500" />
                        <span>Historique & Transmissions</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onNavigate("patients");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[var(--medical-blue)] rounded-xl transition-all cursor-pointer font-medium"
                      >
                        <Users size={17} className="text-slate-500" />
                        <span>Gestion des Patients</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onNavigate("offline");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[var(--medical-blue)] rounded-xl transition-all cursor-pointer font-medium"
                      >
                        <WifiOff size={17} className="text-slate-500" />
                        <span>Mode Hors-Ligne & Sync</span>
                      </button>
                    </div>

                    {/* Logout Option */}
                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer font-semibold"
                      >
                        <LogOut size={17} />
                        <span>Se Déconnecter</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-6 lg:px-10 py-8 lg:py-10">
          <div className="max-w-7xl mx-auto animate-fade-up" key={currentScreen}>
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 lg:px-10 pb-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} MedAssist — Système d'Aide à la Consultation IA · Conforme RGPD & HDS
          </p>
        </footer>
      </div>
    </div>
  );
}
