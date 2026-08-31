import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteConsultation,
  deletePatient,
  fetchAllConsultations,
  fetchConsultation,
  generateConsultationPDF,
} from "../services/api";
import { EmptyState, ErrorState, LoadingState } from "../components/ApiState";

const transmissionStyles = {
  sent: "badge-green",
  pending: "badge-amber",
  failed: "badge-red",
};

function labelTransmission(status) {
  if (status === "sent") return "Transmis";
  if (status === "failed") return "Échec";
  return "En attente";
}

function labelValidation(status) {
  if (status === "validated") return "Validée";
  if (status === "rejected") return "Rejetée";
  return "En attente";
}

function labelWorkflow(status) {
  const map = {
    draft: "Brouillon",
    transcribing: "Transcription…",
    transcribed: "Transcrite",
    analyzed: "Analysée",
    coded: "Codée",
    validated: "Validée",
    transmitting: "Transmission…",
    transmitted: "Transmise",
    failed: "Échec",
  };
  return map[status] || status || "—";
}

function labelCoding(hasCoding) {
  return hasCoding ? "Codé" : "Non codé";
}

function labelPdf(status) {
  if (status === "generated") return "PDF disponible";
  if (status === "failed") return "PDF en échec";
  return "PDF non généré";
}

function canGeneratePdf(consultation) {
  if (!consultation) return false;
  return (
    consultation.validation_status === "validated" ||
    ["validated", "transmitting", "transmitted"].includes(consultation.status)
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR");
}

function summarizeCoding(codingResults) {
  if (!codingResults) return [];
  const data = typeof codingResults === "string" ? null : codingResults;
  if (!data || typeof data !== "object") {
    return codingResults ? ["Résultats de codage présents"] : [];
  }

  const lines = [];
  // Backend /coding/process persists diagnostics_icd10 / prescriptions_gmr / biology_nabm.
  const diagnostics =
    data.diagnostics_icd10 || data.diagnostics || data.cim10 || data.codes || [];
  const prescriptions =
    data.prescriptions_gmr || data.prescriptions || data.gmr || [];
  const biology = data.biology_nabm || data.biology || data.nabm || [];

  const pushList = (label, list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    const preview = list
      .slice(0, 3)
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.code || item?.label || item?.name || null;
      })
      .filter(Boolean);
    if (preview.length) lines.push(`${label} : ${preview.join(", ")}`);
  };

  pushList("Diagnostics", diagnostics);
  pushList("Prescriptions", prescriptions);
  pushList("Biologie", biology);

  if (!lines.length) lines.push("Résultats de codage présents");
  return lines;
}

function mapRow(c) {
  return {
    id: c.id,
    ref: `#${String(c.id).slice(0, 8).toUpperCase()}`,
    txId: c.transmission_id || "—",
    patient: c.patient_name || "Patient inconnu",
    patientId: c.patient_id,
    date: formatDate(c.created_at),
    type: c.title || "Consultation",
    status: c.status || "draft",
    validation: c.validation_status || "pending",
    transmission: c.transmission_status || "pending",
        coding: labelCoding(Boolean(c.has_coding)),
        codingResults: null,
        pdf: labelPdf(c.pdf_status),
        pdfStatus: c.pdf_status || "pending",
        pdfReady: c.pdf_status === "generated",
        raw: c,
  };
}

export default function ScreenHistory({ isOffline }) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (isOffline) {
      setError("Serveur inaccessible. Historique indisponible hors-ligne.");
      setLoading(false);
      setRows([]);
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllConsultations();
      setRows((data || []).map(mapRow));
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de l'historique");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetails = useCallback(
    async (consultationId) => {
      if (!consultationId || isOffline) return;
      setSelectedId(consultationId);
      setDetailLoading(true);
      setDetailError("");
      setPdfError("");
      setPdfMessage("");
      try {
        const data = await fetchConsultation(consultationId);
        setDetail(data);
      } catch (err) {
        setDetail(null);
        setDetailError(err.message || "Impossible de charger le détail");
      } finally {
        setDetailLoading(false);
      }
    },
    [isOffline]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((t) => {
      if (filter === "success" && t.transmission !== "sent") return false;
      if (filter === "pending" && t.transmission !== "pending") return false;
      if (filter === "failed" && !(t.transmission === "failed" || t.validation === "rejected")) {
        return false;
      }
      if (!q) return true;
      const haystack = [t.ref, t.patient, t.type, t.txId, t.status, t.coding]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, filter, searchQuery]);

  const handleGeneratePdf = async ({ open = false } = {}) => {
    if (!detail?.id) return;
    if (isOffline) {
      setPdfError("Génération PDF impossible hors-ligne.");
      return;
    }
    if (!canGeneratePdf(detail)) {
      setPdfError("La consultation doit être validée avant génération du PDF officiel.");
      return;
    }
    setPdfBusy(true);
    setPdfError("");
    setPdfMessage("");
    try {
      const blob = await generateConsultationPDF(detail.id);
      if (!blob || blob.size === 0) throw new Error("PDF vide renvoyé par le serveur");
      const url = window.URL.createObjectURL(blob);
      if (open) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Consultation_${detail.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setPdfMessage("PDF généré à partir des données réelles de la consultation.");
      setDetail((prev) => (prev ? { ...prev, pdf_status: "generated" } : prev));
      setRows((prev) =>
        prev.map((row) =>
          row.id === detail.id
            ? { ...row, pdfStatus: "generated", pdfReady: true, pdf: labelPdf("generated") }
            : row
        )
      );
    } catch (err) {
      setPdfError(err.message || "Erreur lors de la génération du PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDeleteConsultation = async (consultationId, e) => {
    if (e) e.stopPropagation();
    if (!consultationId || isOffline) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette consultation ?")) {
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteConsultation(consultationId);
      if (selectedId === consultationId) {
        setSelectedId(null);
        setDetail(null);
      }
      setRows((prev) => prev.filter((r) => r.id !== consultationId));
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression de la consultation");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!detail?.patient_id) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Cette action supprimera également toutes ses consultations associées.")) {
      return;
    }
    setDeleteBusy(true);
    try {
      await deletePatient(detail.patient_id);
      setSelectedId(null);
      setDetail(null);
      await load(); // Reload the history
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression du patient");
    } finally {
      setDeleteBusy(false);
    }
  };

  const codingLines = summarizeCoding(detail?.coding_results);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Traçabilité</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Historique & Transmissions SIH</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">
            Journal complet des consultations, validations et transmissions.
          </p>
        </div>
        <button className="btn-primary" disabled={isOffline || loading} onClick={load}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Actualiser
        </button>
      </div>

      <div className="luxury-card p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="lux-input flex-1"
          placeholder="Rechercher par patient, référence, titre ou ID SIH…"
          disabled={loading || Boolean(error)}
        />
        <button
          type="button"
          className="btn-outline"
          onClick={() => setSearchQuery("")}
          disabled={!searchQuery}
        >
          Effacer
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "Tous" },
          { key: "success", label: "Réussis" },
          { key: "pending", label: "En attente" },
          { key: "failed", label: "Échecs" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer ${
              filter === f.key
                ? "bg-[var(--primary-navy)] text-white border-[var(--primary-navy)]"
                : "bg-white text-[var(--text-muted)] border-[var(--border-soft)] hover:border-[var(--gold)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState label="Chargement de l'historique…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="luxury-card overflow-hidden xl:col-span-3">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Aucune consultation"
                  message={
                    rows.length === 0
                      ? "Aucune consultation n'est encore enregistrée."
                      : "Aucun résultat ne correspond à votre recherche ou filtre."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-app)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-6 py-4 font-semibold">Référence</th>
                      <th className="px-6 py-4 font-semibold">Patient</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Statut</th>
                      <th className="px-6 py-4 font-semibold">Codage</th>
                      <th className="px-6 py-4 font-semibold">Transmission</th>
                      <th className="px-6 py-4 font-semibold">PDF</th>
                      <th className="px-6 py-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {filtered.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => openDetails(t.id)}
                        className={`hover:bg-[var(--bg-app)] transition cursor-pointer ${
                          selectedId === t.id ? "bg-[var(--info-bg)]/40" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-semibold text-[var(--info)]">{t.ref}</td>
                        <td className="px-6 py-4 text-[var(--text-heading)] font-medium">{t.patient}</td>
                        <td className="px-6 py-4 text-[var(--text-muted)]">{t.date}</td>
                        <td className="px-6 py-4">
                          <span className="lux-badge badge-blue">{labelWorkflow(t.status)}</span>
                          <div className="text-[11px] text-[var(--text-muted)] mt-1">
                            {labelValidation(t.validation)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-heading)]">{t.coding}</td>
                        <td className="px-6 py-4">
                          <span className={`lux-badge ${transmissionStyles[t.transmission] || "badge-amber"}`}>
                            {labelTransmission(t.transmission)}
                          </span>
                          <div className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">{t.txId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`lux-badge ${t.pdfReady ? "badge-green" : "badge-amber"}`}>
                            {t.pdf}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteConsultation(t.id, e)}
                            disabled={deleteBusy || isOffline}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                            title="Supprimer cette consultation"
                          >
                            <Trash2 size={16} />
                            <span className="sr-only">Supprimer</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="luxury-card p-6 xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Détail consultation</h3>
              {selectedId ? (
                <button
                  type="button"
                  className="text-xs text-[var(--text-muted)]"
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                    setDetailError("");
                    setPdfError("");
                    setPdfMessage("");
                  }}
                >
                  Fermer
                </button>
              ) : null}
            </div>

            {!selectedId ? (
              <EmptyState
                title="Sélectionnez une ligne"
                message="Cliquez une consultation pour afficher son détail."
              />
            ) : null}

            {selectedId && detailLoading ? <LoadingState label="Chargement du détail…" /> : null}
            {selectedId && !detailLoading && detailError ? (
              <ErrorState message={detailError} onRetry={() => openDetails(selectedId)} />
            ) : null}

            {selectedId && !detailLoading && detail ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Référence</span>
                    <span className="font-mono text-xs">#{String(detail.id).slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Patient</span>
                    <span className="font-semibold text-right">
                      {detail.patient_name || detail.patient_id || "—"}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Titre</span>
                    <span className="font-semibold text-right">{detail.title || "Consultation"}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Date</span>
                    <span>{formatDate(detail.created_at)}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Statut</span>
                    <span>{labelWorkflow(detail.status)}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Validation</span>
                    <span>{labelValidation(detail.validation_status)}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">Transmission</span>
                    <span>{labelTransmission(detail.transmission_status)}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">ID SIH</span>
                    <span className="font-mono text-xs">{detail.transmission_id || "—"}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                    <span className="text-[var(--text-muted)]">PDF</span>
                    <span>{labelPdf(detail.pdf_status)}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">Codage</div>
                  {codingLines.length ? (
                    <ul className="space-y-1 text-sm text-[var(--text-body)]">
                      {codingLines.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">Aucun résultat de codage enregistré.</p>
                  )}
                </div>

                {detail.transcription ? (
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">Transcription</div>
                    <p className="text-sm text-[var(--text-body)] whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--bg-app)] rounded-lg p-3">
                      {detail.transcription}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-outline text-sm disabled:opacity-50"
                    disabled={pdfBusy || isOffline || !canGeneratePdf(detail)}
                    onClick={() => handleGeneratePdf({ open: true })}
                    title={
                      canGeneratePdf(detail)
                        ? "Ouvrir le PDF"
                        : "Disponible uniquement après validation"
                    }
                  >
                    Ouvrir PDF
                  </button>
                  <button
                    type="button"
                    className="btn-gold text-sm disabled:opacity-50"
                    disabled={pdfBusy || isOffline || !canGeneratePdf(detail)}
                    onClick={() => handleGeneratePdf({ open: false })}
                  >
                    {pdfBusy ? "Génération…" : "Télécharger PDF"}
                  </button>
                  <button
                    type="button"
                    className="btn-outline-danger text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                    disabled={deleteBusy || isOffline}
                    onClick={(e) => handleDeleteConsultation(detail.id, e)}
                  >
                    <Trash2 size={15} />
                    {deleteBusy ? "Suppression…" : "Supprimer Consultation"}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-red-600 underline ml-auto disabled:opacity-50"
                    disabled={deleteBusy || isOffline}
                    onClick={handleDeletePatient}
                  >
                    Supprimer Patient
                  </button>
                </div>
                {!canGeneratePdf(detail) ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Le PDF officiel n'est disponible qu'après validation médicale de la consultation.
                  </p>
                ) : null}
                {pdfError ? <ErrorState message={pdfError} /> : null}
                {pdfMessage ? <p className="text-sm text-[var(--success)]">{pdfMessage}</p> : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
