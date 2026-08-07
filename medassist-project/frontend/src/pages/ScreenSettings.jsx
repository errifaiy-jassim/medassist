import React, { useState } from "react";

export default function ScreenSettings() {
  const [micro, setMicro] = useState("Microphone externe USB (High Definition Audio)");
  const [model, setModel] = useState("Faster-Whisper (petit)");
  const [autoCode, setAutoCode] = useState(true);
  const [autoTransmit, setAutoTransmit] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="section-label mb-2">Préférences Système</div>
        <h1 className="text-3xl lg:text-4xl font-bold">Paramètres & Configurations</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">Gérez vos préférences médicales, intégrations SIH et modèles IA.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IA & Dictée */}
        <div className="luxury-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-[var(--gold-light)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            </div>
            <h3 className="text-lg font-bold">1. Assistant Clinique IA & Dictée Vocale</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Périphérique d'entrée audio</label>
              <select value={micro} onChange={(e) => setMicro(e.target.value)} className="lux-input">
                <option>Microphone externe USB (High Definition Audio)</option>
                <option>Microphone intégré</option>
                <option>Casque médical sans fil</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Modèle de reconnaissance vocale</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="lux-input">
                <option>Faster-Whisper (petit)</option>
                <option>Faster-Whisper (moyen)</option>
                <option>Faster-Whisper (grand)</option>
              </select>
            </div>
            <div className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">Codification automatique</div>
                <div className="text-xs text-[var(--text-muted)]">CIM-10, GMR & NABM</div>
              </div>
              <button onClick={() => setAutoCode(!autoCode)} className={`w-12 h-6 rounded-full transition ${autoCode ? "bg-[var(--gold)]" : "bg-[#D1D5DB]"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${autoCode ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* SIH */}
        <div className="luxury-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] text-white flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            </div>
            <h3 className="text-lg font-bold">2. Intégration SIH & Connectivité</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4">
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full animate-pulse" />
              <div>
                <div className="text-sm font-semibold text-[var(--success)]">Connecté au Réseau Hospitalier National</div>
                <div className="text-xs text-[var(--success)]/80">SIH-HL7 · Serveur 10.0.2.14</div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">Transmission automatique</div>
                <div className="text-xs text-[var(--text-muted)]">Après validation médicale</div>
              </div>
              <button onClick={() => setAutoTransmit(!autoTransmit)} className={`w-12 h-6 rounded-full transition ${autoTransmit ? "bg-[var(--gold)]" : "bg-[#D1D5DB]"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${autoTransmit ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-heading)]">Mode sombre</div>
                <div className="text-xs text-[var(--text-muted)]">Interface premium</div>
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full transition ${darkMode ? "bg-[var(--gold)]" : "bg-[#D1D5DB]"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Profil */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-[var(--gold-light)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <h3 className="text-lg font-bold">3. Profil du Praticien</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Nom complet", value: "Dr. Errifaiy Jassim" },
              { label: "Spécialité", value: "Cardiologue" },
              { label: "RPPS", value: "01234567890" },
              { label: "INPE", value: "INPE-2024-001" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">{f.label}</label>
                <input className="lux-input" defaultValue={f.value} />
              </div>
            ))}
          </div>
          <button className="btn-primary mt-6">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
}
