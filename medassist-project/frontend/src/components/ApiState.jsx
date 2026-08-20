import React from "react";

export function LoadingState({ label = "Chargement en cours…" }) {
  return (
    <div className="luxury-card p-8 text-center text-sm text-[var(--text-muted)]">
      <div className="inline-block w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mb-3" />
      <div>{label}</div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="luxury-card p-6 border border-[var(--danger)]/20 bg-red-50/40">
      <div className="text-sm font-semibold text-[var(--danger)] mb-1">Une erreur est survenue</div>
      <p className="text-sm text-[var(--text-body)]">{message || "Impossible de charger les données."}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-outline mt-4 text-sm">
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title = "Aucun élément", message }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-6 text-center">
      <div className="text-sm font-semibold text-[var(--text-heading)]">{title}</div>
      {message ? <p className="text-xs text-[var(--text-muted)] mt-1">{message}</p> : null}
    </div>
  );
}

export function OfflineBanner({ visible, message, browserOnline = true, serverReachable = true }) {
  if (!visible) return null;
  let detail =
    message ||
    "Le serveur MedAssist est inaccessible. Les opérations nécessitant le serveur sont désactivées.";
  if (!message) {
    if (!browserOnline) {
      detail = "Le navigateur est hors-ligne (navigator.onLine). Les appels serveur sont bloqués.";
    } else if (!serverReachable) {
      detail = "Réseau détecté, mais le serveur MedAssist ne répond pas. Aucune opération n'est simulée comme réussie.";
    }
  }
  return (
    <div className="mb-6 flex items-start gap-3 bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-xl px-4 py-3">
      <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-[var(--warning)] shrink-0" />
      <div>
        <div className="text-sm font-semibold text-[var(--warning)]">Mode hors-ligne</div>
        <p className="text-xs text-[var(--text-body)] mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export function formatRelativeFr(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "À l'instant";
  if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;
  return date.toLocaleDateString("fr-FR");
}

export function formatDelta(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${suffix}`;
}
