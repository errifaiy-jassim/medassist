import React, { useState } from "react";

const BLOCKED_ACTIONS = [
  {
    label: "Créer / modifier un patient",
    reason: "Écriture en base PostgreSQL requise.",
  },
  {
    label: "Démarrer une consultation",
    reason: "Création d'enregistrement serveur requise.",
  },
  {
    label: "Transcription STT & extraction IA",
    reason: "Services backend (STT / LLM) injoignables.",
  },
  {
    label: "Validation, transmission SIH, PDF",
    reason: "Ces étapes confirment et persistent côté serveur.",
  },
  {
    label: "Historique & paramètres distants",
    reason: "Lecture API authentifiée nécessaire.",
  },
];

export default function ScreenOffline({
  isOffline,
  browserOnline = true,
  serverReachable = true,
  databaseConnected = true,
  checking = false,
  lastCheckedAt = null,
  onRetryConnectivity,
  onNavigate,
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handleRetry = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await onRetryConnectivity?.();
      if (!result) {
        setMessage("Vérification terminée.");
        return;
      }
      if (!result.browserOnline) {
        setMessage("Le navigateur signale hors-ligne (navigator.onLine = false). Aucune opération serveur n'a été tentée.");
        return;
      }
      if (!result.serverReachable) {
        setMessage("Réseau local OK, mais le serveur MedAssist reste injoignable. Aucune donnée n'a été transmise.");
        return;
      }
      if (!result.databaseConnected) {
        setMessage("Serveur joignable, mais la base de données reste indisponible. Aucune écriture n'a été effectuée.");
        return;
      }
      setMessage("Connexion rétablie (navigateur + serveur + BDD). Vous pouvez reprendre les opérations.");
      onNavigate?.("screen2");
    } catch {
      setMessage("Toujours hors-ligne. Aucune donnée n'a été transmise.");
    } finally {
      setBusy(false);
    }
  };

  const statusRows = [
    {
      label: "Navigateur (navigator.onLine)",
      ok: browserOnline,
      detail: browserOnline ? "En ligne" : "Hors-ligne",
    },
    {
      label: "Serveur MedAssist",
      ok: serverReachable,
      detail: serverReachable ? "Joignable" : "Injoignable",
    },
    {
      label: "Base de données",
      ok: databaseConnected,
      detail: databaseConnected ? "Connectée" : "Indisponible",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="section-label mb-2">Mode Hors-Ligne</div>
        <h1 className="text-3xl lg:text-4xl font-bold">
          {isOffline ? "Connexion au serveur interrompue" : "Connexion rétablie"}
        </h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">
          MedAssist n'enregistre pas de file de consultation hors-ligne. Les opérations serveur restent bloquées tant que le backend est injoignable — aucune réussite n'est simulée.
        </p>
      </div>

      <div className={`flex items-start gap-4 rounded-xl p-5 border ${
        isOffline
          ? "bg-[var(--warning-bg)] border-[var(--warning)]/30"
          : "bg-[var(--success-bg)] border-[var(--success)]/20"
      }`}>
        <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 ${
          isOffline ? "bg-[var(--warning)]" : "bg-[var(--success)]"
        }`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${isOffline ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
            {isOffline ? "Mode hors-ligne actif" : "Serveur disponible"}
          </h3>
          <p className="text-sm text-[var(--text-body)] mt-1">
            {isOffline
              ? "Le navigateur est hors-ligne et/ou le backend MedAssist est injoignable. Aucune consultation n'est présentée comme transmise."
              : "Vous pouvez quitter cet écran et reprendre le travail clinique normal."}
          </p>
          <button
            onClick={handleRetry}
            disabled={busy || checking}
            className="btn-gold mt-4 text-sm disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            {busy || checking ? "Vérification…" : "Vérifier la connexion"}
          </button>
          {message ? <p className="text-sm mt-3 text-[var(--text-body)]">{message}</p> : null}
          {lastCheckedAt ? (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Dernière vérification : {new Date(lastCheckedAt).toLocaleString("fr-FR")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-4">État de connectivité</h2>
        <div className="space-y-3">
          {statusRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 bg-[var(--bg-app)] rounded-lg p-3 text-sm"
            >
              <span className="text-[var(--text-muted)]">{row.label}</span>
              <span className={`lux-badge ${row.ok ? "badge-green" : "badge-amber"}`}>{row.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-2">Actions indisponibles hors-ligne</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Ces actions restent désactivées tant que la connectivité serveur n'est pas rétablie.
        </p>
        <div className="space-y-3">
          {BLOCKED_ACTIONS.map((item) => (
            <div key={item.label} className="rounded-lg border border-[var(--border-soft)] p-3">
              <div className="text-sm font-semibold text-[var(--text-heading)]">{item.label}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{item.reason}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="luxury-card p-6">
        <h2 className="text-xl font-bold mb-2">Stockage hors-ligne des consultations</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Non implémenté. MedAssist ne met pas en file d'attente locale les consultations, transcriptions ou transmissions.
          Lorsque la connexion revient, reprenez depuis Patients / Historique — rien n'a été synchronisé automatiquement.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">
          0 consultation en attente de synchro locale (aucune file locale)
        </div>
      </div>
    </div>
  );
}
