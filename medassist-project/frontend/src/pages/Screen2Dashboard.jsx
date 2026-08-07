import React from "react";

const stats = [
  { label: "Consultations du jour", value: "12", delta: "+3", icon: "consult", color: "navy" },
  { label: "Patients suivis", value: "248", delta: "+8", icon: "patients", color: "gold" },
  { label: "Transmissions SIH", value: "96%", delta: "+2%", icon: "transmit", color: "green" },
  { label: "Dictées en attente", value: "3", delta: "-1", icon: "dictation", color: "blue" },
];

function StatIcon({ name }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "consult":
      return <svg {...common}><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" /></svg>;
    case "patients":
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "transmit":
      return <svg {...common}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
    case "dictation":
      return <svg {...common}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
    default:
      return null;
  }
}

const recentActivity = [
  { patient: "Amira Hadj", action: "Consultation validée & transmise", time: "Il y a 12 min", code: "#TX-98234-A", status: "green" },
  { patient: "Karim Benali", action: "Dictée vocale en cours", time: "Il y a 25 min", code: "", status: "amber" },
  { patient: "Yasmine Cherif", action: "Codification CIM-10 confirmée", time: "Il y a 1 h", code: "I10 • E11", status: "blue" },
  { patient: "Omar Mansouri", action: "Dossier patient créé", time: "Il y a 2 h", code: "", status: "green" },
];

const quickActions = [
  { label: "Nouvelle Dictée", desc: "Enregistrer une consultation vocale", icon: "mic", screen: "screen3" },
  { label: "Dossier Patient", desc: "Consulter un dossier patient", icon: "file", screen: "patients" },
  { label: "Historique", desc: "Traçabilité des transmissions", icon: "clock", screen: "history" },
  { label: "Paramètres", desc: "Configurer le système", icon: "gear", screen: "settings" },
];

export default function Screen2Dashboard({ onStartDictation, onNavigate }) {
  const go = (screen) => {
    if (screen === "screen3") {
      if (onStartDictation) onStartDictation();
      else if (onNavigate) onNavigate(screen);
    } else if (onNavigate) {
      onNavigate(screen);
    }
  };

  return (
    <div className="space-y-8">
{/* Welcome header */}
      <div className="relative luxury-card p-6 lg:p-8 overflow-hidden">
        <svg className="absolute right-0 top-0 h-full w-64 text-[var(--medical-blue)]/10 pointer-events-none" viewBox="0 0 300 120" fill="none" preserveAspectRatio="none">
          <path d="M0,90 L40,90 L60,90 L80,30 L110,110 L140,90 L180,90 L200,90 L220,20 L250,100 L280,90 L300,90"
            stroke="currentColor" strokeWidth="2.5" className="ecg-line" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative">
          <div>
            <div className="section-label mb-2">Espace Praticien</div>
            <h1 className="text-3xl lg:text-4xl font-bold">Bonjour, Dr. Errifaiy Jassim</h1>
            <div className="gold-divider mt-3" />
            <p className="mt-3 text-[var(--text-muted)] text-sm">
              Voici l'aperçu de votre activité clinique aujourd'hui.
            </p>
          </div>
          <button onClick={() => go("screen3")} className="btn-gold text-base px-6 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Lancer une Dictée
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="luxury-card luxury-card-hover p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">{s.label}</p>
                <p className="text-3xl font-bold text-[var(--text-heading)] mt-2">{s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                s.color === "gold" ? "bg-[var(--gold-light)] text-[var(--gold-dark)]"
                : s.color === "green" ? "bg-[var(--success-bg)] text-[var(--success)]"
                : s.color === "blue" ? "bg-[var(--info-bg)] text-[var(--info)]"
                : "bg-[var(--primary-navy)] text-white"
              }`}>
                <StatIcon name={s.icon} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="lux-badge badge-green">{s.delta}</span>
              <span className="text-xs text-[var(--text-muted)]">vs hier</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <div className="section-label mb-2">Actions rapides</div>
            <h2 className="text-xl font-bold">Raccourcis</h2>
          </div>
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => go(a.screen)}
              className="w-full luxury-card luxury-card-hover p-4 flex items-center gap-4 text-left cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-[var(--gold-light)] flex items-center justify-center shrink-0 group-hover:from-[var(--gold)] group-hover:to-[var(--gold-dark)] group-hover:text-white transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {a.icon === "mic" && <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>}
                  {a.icon === "file" && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>}
                  {a.icon === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
                  {a.icon === "gear" && <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>}
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[var(--text-heading)]">{a.label}</div>
                <div className="text-xs text-[var(--text-muted)]">{a.desc}</div>
              </div>
              <span className="text-[var(--gold-dark)]">→</span>
            </button>
          ))}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2">
          <div className="luxury-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label mb-1">Journal</div>
                <h2 className="text-xl font-bold">Activité récente</h2>
              </div>
              <button onClick={() => onNavigate("history")} className="btn-outline text-xs">Voir tout</button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-app)] transition">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 ${
                    a.status === "green" ? "bg-[var(--success-bg)]" : a.status === "amber" ? "bg-[var(--warning-bg)]" : "bg-[var(--info-bg)]"
                  }`}>
                    {a.patient.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[var(--text-heading)]">{a.patient}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{a.action}</div>
                  </div>
                  {a.code && <span className="lux-badge badge-blue hidden sm:inline-flex">{a.code}</span>}
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
