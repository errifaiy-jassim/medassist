import React from "react";

export default function ScreenPatientDetail({ onNewConsultation }) {
  const info = [
    { label: "Nom complet", value: "Amira Hadj" },
    { label: "NIR", value: "290 128 44 782 005" },
    { label: "Âge", value: "42 ans" },
    { label: "Sexe", value: "Féminin" },
    { label: "Groupe sanguin", value: "A+" },
    { label: "Téléphone", value: "+213 555 01 23 45" },
    { label: "Email", value: "amira.hadj@mail.com" },
    { label: "Dossier N°", value: "DS-4471" },
  ];

  const historiques = [
    { date: "12/05/2024", motif: "Suivi HTA & diabète", medecin: "Dr. Errifaiy" },
    { date: "03/02/2024", motif: "Consultation cardiologie", medecin: "Dr. Errifaiy" },
    { date: "18/11/2023", motif: "Bilan biologique annuel", medecin: "Dr. Benali" },
  ];

  const allergies = [
    { name: "Pénicilline", severity: "Sévère", color: "red" },
    { name: "Arachides", severity: "Modérée", color: "amber" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Dossier Patient</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Amira Hadj</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">Dossier médical complet · NIR 290 128 44 782 005</p>
        </div>
        <button onClick={onNewConsultation} className="btn-gold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          Démarrer une Consultation
        </button>
      </div>

      {/* Profile banner */}
      <div className="luxury-card p-6 flex items-center gap-5 bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] flex items-center justify-center text-2xl font-bold text-[var(--primary-navy)]">AH</div>
        <div className="flex-1">
          <div className="text-lg font-bold">Amira Hadj</div>
          <div className="text-sm text-white/60">Femme · 42 ans · Groupe A+</div>
        </div>
        <div className="hidden sm:flex gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--gold-light)]">12</div>
            <div className="text-[11px] text-white/50">Consultations</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--gold-light)]">3</div>
            <div className="text-[11px] text-white/50">Ordonnances</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="luxury-card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-5">Informations Générales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {info.map((i) => (
              <div key={i.label} className="bg-[var(--bg-app)] rounded-lg p-3">
                <div className="text-[11px] text-[var(--text-muted)]">{i.label}</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">{i.value}</div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold mt-8 mb-4">Historique des Consultations</h3>
          <div className="space-y-3">
            {historiques.map((h, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-app)]">
                <div className="w-10 h-10 rounded-full bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center text-sm font-bold shrink-0">{h.date.slice(0, 2)}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--text-heading)]">{h.motif}</div>
                  <div className="text-xs text-[var(--text-muted)]">{h.medecin}</div>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{h.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="space-y-6">
          <div className="luxury-card p-6">
            <h3 className="text-lg font-bold mb-4">Allergies</h3>
            <div className="space-y-2">
              {allergies.map((a) => (
                <div key={a.name} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                  <span className="text-sm font-semibold text-[var(--text-heading)]">{a.name}</span>
                  <span className={`lux-badge ${a.color === "red" ? "badge-red" : "badge-amber"}`}>{a.severity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="luxury-card p-6 bg-gradient-to-br from-[var(--warning-bg)] to-white border-[var(--warning)]/30">
            <h3 className="text-lg font-bold text-[var(--warning)] mb-2">⚠️ Attention</h3>
            <p className="text-sm text-[var(--text-body)]">
              Patient allergique à la pénicilline. Vérifier toute prescription d'antibiotiques de la famille des bêta-lactamines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
