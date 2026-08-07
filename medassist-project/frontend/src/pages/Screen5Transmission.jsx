import React from "react";

const docs = [
  { title: "Ordonnance Médicale", sub: "Prescription thérapeutique : Metformine & Amlodipine", size: "PDF • 240 KB", icon: "rx" },
  { title: "Compte-Rendu Clinique", sub: "Synthèse clinique structurée pour le dossier patient", size: "PDF • 180 KB", icon: "doc" },
  { title: "Demande de Biologie", sub: "Bilan sanguin complet : Glycémie à jeun & HbA1c", size: "PDF • 120 KB", icon: "lab" },
  { title: "Demande d'Imagerie", sub: "Échographie hépato-biliaire", size: "PDF • 140 KB", icon: "img" },
];

function DocIcon({ name }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "rx": return <svg {...common}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M8 13h8" /><path d="M12 9v8" /></svg>;
    case "doc": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    case "lab": return <svg {...common}><path d="M10 2v7.31" /><path d="M14 9.3V2" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>;
    default: return <svg {...common}><path d="M3 8l3-3 3 3" /><path d="M6 5v14" /><circle cx="18" cy="12" r="3" /><circle cx="18" cy="19" r="1.5" /></svg>;
  }
}

export default function Screen5Transmission({ onNewConsultation, onReturnHome }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="section-label mb-2">Étape 4 — Transmission</div>
        <h1 className="text-3xl lg:text-4xl font-bold">Transmission SIH Effectuée</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">Processus d'intégration des données médicales</p>
      </div>

      {/* Success */}
      <div className="luxury-card p-8 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-[var(--success-bg)] to-white border-[var(--success)]/30">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--success)] to-[var(--success)]/80 text-white flex items-center justify-center shrink-0 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-xl font-bold text-[var(--success)]">Consultation Validée & Transmise au SIH avec Succès</h2>
          <p className="text-sm text-[var(--text-body)] mt-1">
            Le dossier patient de <strong className="text-[var(--success)]">Amira Hadj</strong> a été mis à jour de manière sécurisée sous la référence <strong className="text-[var(--success)]">#TX-98234-A</strong>.
          </p>
        </div>
        <span className="md:ml-auto lux-badge badge-green">
          <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full" /> Horodaté
        </span>
      </div>

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Documents Cliniques Générés</h2>
          <button className="btn-gold text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Tout exporter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {docs.map((d, i) => (
            <div key={i} className="luxury-card luxury-card-hover p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center shrink-0">
                <DocIcon name={d.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--text-heading)]">{d.title}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{d.sub}</div>
                <div className="text-[11px] text-[var(--info)] font-semibold mt-2">{d.size}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button className="px-3 py-1.5 text-[11px] font-medium bg-[var(--info-bg)] text-[var(--info)] rounded-lg hover:bg-[var(--info)] hover:text-white transition cursor-pointer">Aperçu</button>
                <button className="px-3 py-1.5 text-[11px] font-medium bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-muted)] rounded-lg hover:border-[var(--gold)] transition cursor-pointer">Exporter</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
        <button onClick={onReturnHome} className="btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          Retour à l'Espace Praticien
        </button>
        <button onClick={onNewConsultation} className="btn-primary text-base px-6 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouvelle Consultation
        </button>
      </div>
    </div>
  );
}
