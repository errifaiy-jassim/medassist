import React, { useState } from "react";

export default function Screen1Login({ onLogin }) {
  const [email, setEmail] = useState("dr.errifaiyJassim@sante.gov");
  const [password, setPassword] = useState("medassist2024");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) onLogin();
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-app)]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[var(--primary-navy)] to-[#0A2A4E] text-white">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #0E9F6E 0, transparent 45%), radial-gradient(circle at 80% 80%, #2563EB 0, transparent 50%)" }} />
        {/* ECG monitor line */}
        <svg className="absolute bottom-0 left-0 w-full h-40 text-white/10" viewBox="0 0 1200 120" fill="none" preserveAspectRatio="none">
          <path d="M0,90 L100,90 L120,90 L140,30 L170,110 L200,90 L340,90 L360,90 L380,20 L400,100 L420,90 L560,90 L580,90 L600,40 L640,100 L670,90 L820,90 L840,90 L860,30 L890,110 L920,90 L1200,90"
            stroke="currentColor" strokeWidth="2" className="ecg-line" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="absolute inset-0 p-12 lg:p-16 flex flex-col justify-between relative z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MedAssist Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-lg" />
            <div>
              <div className="text-2xl font-bold leading-tight">MedAssist</div>
              <div className="text-xs text-white/50 tracking-wide">Assistant Clinique IA</div>
            </div>
          </div>

          <div className="max-w-lg">
            <div className="section-label text-[var(--gold-light)] mb-4">Présentation</div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
              La médecine moderne, <span className="text-gold-gradient">assistée par l'intelligence artificielle.</span>
            </h1>
            <div className="gold-divider my-6" />
            <p className="text-white/70 text-lg leading-relaxed">
              Dictée vocale, codification automatique CIM-10 / GMR / NABM, et transmission sécurisée au SIH — le tout en un seul espace clinique élégant.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { v: "99%", l: "Précision IA" },
                { v: "60s", l: "Dictée instantanée" },
                { v: "HDS", l: "Hébergement sécurisé" },
              ].map((s) => (
                <div key={s.l} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-[var(--gold-light)]">{s.v}</div>
                  <div className="text-[11px] text-white/50 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-white/40 text-xs">
            © {new Date().getFullYear()} MedAssist — Conforme RGPD & Hébergement Données de Santé (HDS)
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-[440px] animate-fade-up">

          <div className="luxury-card p-8 lg:p-10">
            <div className="flex flex-col items-center text-center mb-6">
              <img src="/logo.png" alt="MedAssist Logo" className="w-16 h-16 rounded-2xl object-contain bg-white p-2 shadow-sm border border-[var(--border-soft)] mb-3" />
              <div>
                <div className="text-2xl font-bold leading-none text-[var(--text-heading)]">MedAssist</div>
                <div className="text-[11px] text-[var(--text-muted)] tracking-wide mt-1.5">Assistant Clinique IA</div>
              </div>
            </div>
            <div className="section-label mb-2">Espace Sécurisé</div>
            <h1 className="text-2xl font-bold mb-1">Connexion Médecin</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">Système d'Aide à la Consultation IA</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-heading)] mb-1.5">
                  Identifiant Professionnel (INPE) ou Email
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lux-input pl-11"
                    placeholder="Nom d'utilisateur"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-heading)]">Mot de passe</label>
                  <a href="#forgot" className="text-xs font-semibold text-[var(--gold-dark)] hover:underline">Mot de passe oublié ?</a>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="lux-input pl-11 pr-11"
                    placeholder="••••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[var(--text-heading)] cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input type="checkbox" id="remember" defaultChecked className="w-4 h-4 accent-[var(--gold-dark)] rounded" />
                <label htmlFor="remember" className="text-xs text-[var(--text-muted)] cursor-pointer">Rester connecté sur cet appareil sécurisé</label>
              </div>

              <button type="submit" className="btn-gold w-full py-3 text-base justify-center">
                Se connecter
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span className="text-[var(--gold-dark)]">🛡️</span>
              <span>Accès sécurisé RGPD & Hébergement Données de Santé (HDS)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
