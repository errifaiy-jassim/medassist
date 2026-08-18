import React, { useCallback, useEffect, useState } from "react";
import { fetchBackendSettings } from "../services/api";
import { EmptyState, ErrorState, LoadingState } from "../components/ApiState";

export default function ScreenSettings({ isOffline, onLogout, user: sessionUser = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backend, setBackend] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    if (isOffline) {
      setError("Serveur inaccessible. Paramètres distants indisponibles.");
      setLoading(false);
      setBackend(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchBackendSettings();
      setBackend(data);
    } catch (err) {
      setError(err.message || "Impossible de charger les paramètres");
      setBackend(null);
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  const user = backend?.user || sessionUser || {};
  const profileFields = [
    { label: "Nom complet", value: user.full_name || "—" },
    { label: "Spécialité", value: user.specialty || "—" },
    { label: "RPPS", value: user.rpps_licence || "Non renseigné" },
    { label: "INPE", value: user.inpe || "—" },
  ];

  const sessionFields = [
    { label: "E-mail", value: user.email || "—" },
    { label: "Rôle", value: user.role || "—" },
    { label: "Compte actif", value: user.is_active === false ? "Non" : user.is_active ? "Oui" : "—" },
  ];

  const dbOk = backend?.database === "connected";
  const llmConfigured = Boolean(backend?.llm_api_configured);

  const handleLogout = async () => {
    if (!onLogout || loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Préférences Système</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Paramètres & Configurations</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">
            Affichage des paramètres exposés par le serveur. Les secrets et URLs sensibles restent côté backend.
          </p>
        </div>
        <button className="btn-primary" disabled={isOffline || loading} onClick={load}>
          Actualiser
        </button>
      </div>

      {loading ? <LoadingState label="Chargement des paramètres…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && !backend ? (
        <EmptyState title="Aucune donnée" message="Les paramètres serveur n'ont pas pu être chargés." />
      ) : null}

      {!loading && !error && backend ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="luxury-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-[var(--gold-light)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              </div>
              <h3 className="text-lg font-bold">1. Transcription & IA (serveur)</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Modèle LLM configuré
                </label>
                <input className="lux-input" value={backend.llm_model || "—"} readOnly />
              </div>
              <div className={`rounded-lg p-3 border ${
                llmConfigured
                  ? "bg-[var(--success-bg)] border-[var(--success)]/20"
                  : "bg-[var(--warning-bg)] border-[var(--warning)]/30"
              }`}>
                <div className={`text-sm font-semibold ${llmConfigured ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {llmConfigured ? "API LLM configurée" : "API LLM non configurée"}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  L'URL et les clés restent côté serveur. L'extraction clinique échoue si le service IA est indisponible.
                </p>
              </div>
              <div className="bg-[var(--bg-app)] rounded-lg p-3 text-sm">
                <div className="font-semibold text-[var(--text-heading)]">Entrée audio</div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Le périphérique micro est choisi localement lors de la dictée (navigateur). Aucune configuration micro n'est stockée sur le serveur.
                </p>
              </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Projet : {backend.project_name || "MedAssist"} · API {backend.api_version || "v1"}
                  {backend.token_ttl_minutes ? ` · JWT ${backend.token_ttl_minutes} min` : ""}
                  {backend.stt_model ? ` · STT ${backend.stt_model}` : ""}
                </p>
            </div>
          </div>

          <div className="luxury-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] text-white flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              </div>
              <h3 className="text-lg font-bold">2. Connectivité & application</h3>
            </div>

            <div className="space-y-4">
              <div className={`flex items-center gap-3 rounded-xl p-4 border ${
                dbOk
                  ? "bg-[var(--success-bg)] border-[var(--success)]/20"
                  : "bg-[var(--warning-bg)] border-[var(--warning)]/30"
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${dbOk ? "bg-[var(--success)] animate-pulse" : "bg-[var(--warning)]"}`} />
                <div>
                  <div className={`text-sm font-semibold ${dbOk ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                    {dbOk ? "Backend & base de données connectés" : "Base de données indisponible"}
                  </div>
                  <div className={`text-xs ${dbOk ? "text-[var(--success)]/80" : "text-[var(--warning)]/80"}`}>
                    Statut serveur : {backend.status || "inconnu"} · BDD : {backend.database || "inconnu"}
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-app)] rounded-lg p-3">
                <div className="text-sm font-semibold text-[var(--text-heading)]">Préférences applicatives</div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Aucune préférence utilisateur persistante n'est exposée par l'API settings actuelle
                  (pas de bascule mode sombre, transmission auto ou codage auto côté serveur).
                </p>
              </div>
            </div>
          </div>

          <div className="luxury-card p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-[var(--gold-light)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <h3 className="text-lg font-bold">3. Profil du praticien</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {profileFields.map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">{f.label}</label>
                  <input className="lux-input" value={f.value} readOnly />
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4">
              Profil fourni par l'API settings / authentification. La modification depuis l'interface n'est pas supportée.
            </p>
          </div>

          <div className="luxury-card p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-[var(--gold-light)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h3 className="text-lg font-bold">4. Session & compte</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sessionFields.map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">{f.label}</label>
                  <input className="lux-input" value={f.value} readOnly />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">
                La déconnexion efface le jeton JWT stocké localement. Aucun mot de passe n'est affiché ici.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={!onLogout || loggingOut}
                className="btn-outline text-sm disabled:opacity-50"
              >
                {loggingOut ? "Déconnexion…" : "Se déconnecter"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
