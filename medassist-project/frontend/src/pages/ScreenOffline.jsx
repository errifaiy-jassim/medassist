import React from "react";

const localConsultations = [
  { patient: "Karim Benali", date: "11/05/2024 • 14:32", status: "En attente de synchro", code: "amber", taille: "1.2 MB" },
  { patient: "Yasmine Cherif", date: "10/05/2024 • 09:15", status: "En attente de synchro", code: "amber", taille: "980 KB" },
];

export default function ScreenOffline() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="section-label mb-2">Mode Hors-Ligne</div>
        <h1 className="text-3xl lg:text-4xl font-bold">Connexion SIH Interrompue</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">Vos consultations sont conservées localement et synchronisées automatiquement au retour du réseau.</p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-4 bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-xl p-5">
        <div className="w-10 h-10 rounded-full bg-[var(--warning)] text-white flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--warning)]">Mode Hors-Ligne Actif</h3>
          <p className="text-sm text-[var(--text-body)] mt-1">
            Le réseau hospitalier national est momentanément indisponible. Les données restent chiffrées sur cet appareil sécurisé.
          </p>
          <button className="btn-gold mt-4 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            Tenter de synchroniser
          </button>
        </div>
      </div>

      {/* Local consultations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Consultations Enregistrées en Local</h2>
          <span className="lux-badge badge-amber">{localConsultations.length} en attente</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {localConsultations.map((c, i) => (
            <div key={i} className="luxury-card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[var(--warning-bg)] text-[var(--warning)] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--text-heading)]">{c.patient}</div>
                <div className="text-xs text-[var(--text-muted)]">{c.date}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">{c.taille}</div>
              </div>
              <span className={`lux-badge ${c.code === "amber" ? "badge-amber" : "badge-green"}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
