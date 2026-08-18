import React, { useEffect, useMemo, useState } from "react";
import {
  generateConsultationPDF,
  processMedicalCoding,
  sendConsultationToSIH,
  updateConsultation,
  validateConsultation,
} from "../services/api";
import { EmptyState, ErrorState, LoadingState } from "../components/ApiState";

function statusBadge(status) {
  if (status === "validated" || status === "transmitted") return "badge-green";
  if (status === "failed") return "badge-red";
  if (status === "coded" || status === "analyzed") return "badge-blue";
  return "badge-amber";
}

export default function Screen4Validation({
  patient,
  consultationId,
  transcription,
  extracted,
  coding,
  status,
  isOffline,
  onTransmit,
  onConsultationUpdate,
}) {
  const patientName = patient?.fullName || patient?.full_name || "Patient";
  const [localExtracted, setLocalExtracted] = useState(extracted || {});
  const [localCoding, setLocalCoding] = useState(coding || null);
  const [localStatus, setLocalStatus] = useState(status || "coded");
  const [localTranscription, setLocalTranscription] = useState(transcription || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [validated, setValidated] = useState(status === "validated" || status === "transmitted");

  useEffect(() => {
    setLocalExtracted(extracted || {});
    setLocalCoding(coding || null);
    setLocalStatus(status || "coded");
    setLocalTranscription(transcription || "");
    setValidated(status === "validated" || status === "transmitted");
  }, [extracted, coding, status, transcription]);

  const demographics = useMemo(() => {
    const d = localExtracted?.demographics || {};
    return [
      { label: "Âge", value: d.age || patient?.age || "—" },
      { label: "Sexe", value: d.gender || patient?.gender || patient?.sex || "—" },
      { label: "Groupe Sanguin", value: d.blood_group || patient?.blood_group || patient?.bloodGroup || "—" },
      { label: "NIR", value: patient?.nir || "—" },
      { label: "Dossier", value: patient?.dossier_number || patient?.dossierNumber || "—" },
      { label: "Statut", value: localStatus },
    ];
  }, [localExtracted, patient, localStatus]);

  const diagnoses = localExtracted?.diagnoses || localExtracted?.diagnostics || [];
  const treatments = localExtracted?.treatments || [];
  const medications = localExtracted?.medications || localExtracted?.prescriptions || [];
  const examinations = localExtracted?.examinations || [];
  const symptoms = localExtracted?.symptoms || [];
  const codedDx = localCoding?.diagnostics_icd10 || [];
  const codedRx = localCoding?.prescriptions_gmr || [];
  const codedBio = localCoding?.biology_nabm || [];
  // Matches backend /pdf/generate: validated status required before official PDF.
  const canGeneratePdf =
    validated ||
    localStatus === "validated" ||
    localStatus === "transmitting" ||
    localStatus === "transmitted";

  const persistEdits = async () => {
    if (!consultationId || isOffline) return;
    setBusy(true);
    setBusyLabel("Enregistrement des modifications…");
    setError("");
    try {
      const updated = await updateConsultation(consultationId, {
        transcription: localTranscription,
        structured_data: localExtracted,
        coding_results: localCoding,
        status: localStatus === "validated" ? undefined : localStatus || "coded",
      });
      onConsultationUpdate?.(updated);
    } catch (err) {
      setError(err.message || "Impossible d'enregistrer les modifications");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const retryCoding = async () => {
    if (!consultationId || isOffline) return;
    setBusy(true);
    setBusyLabel("Nouvelle tentative de codification…");
    setError("");
    try {
      const diagnostics = (localExtracted?.diagnoses || localExtracted?.diagnostics || [])
        .map((d) => (typeof d === "string" ? d : d?.label))
        .filter(Boolean);
      const prescriptions = (localExtracted?.medications || localExtracted?.prescriptions || [])
        .map((m) => (typeof m === "string" ? m : m?.drug_name || m?.label))
        .filter(Boolean);
      const biology = (localExtracted?.examinations || localExtracted?.biology || [])
        .map((e) => (typeof e === "string" ? e : e?.label || e?.test_name))
        .filter(Boolean);
      const result = await processMedicalCoding({
        diagnostics,
        prescriptions,
        biology,
        consultationId,
      });
      setLocalCoding(result);
      setLocalStatus("coded");
      onConsultationUpdate?.({ coding_results: result, status: "coded" });
    } catch (err) {
      setError(err.message || "Échec de la codification");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const handleValidate = async () => {
    if (!consultationId || isOffline) return;
    setBusy(true);
    setBusyLabel("Validation médicale…");
    setError("");
    try {
      await updateConsultation(consultationId, {
        transcription: localTranscription,
        structured_data: localExtracted,
        coding_results: localCoding,
      });
      const updated = await validateConsultation(consultationId);
      setValidated(true);
      setLocalStatus(updated.status || "validated");
      onConsultationUpdate?.(updated);
    } catch (err) {
      setError(err.message || "Échec de la validation");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const handleTransmit = async () => {
    if (isOffline) {
      setError("Transmission impossible hors-ligne. Aucune donnée n'a été envoyée.");
      return;
    }
    if (!consultationId) {
      setError("Aucune consultation persistée n'est associée.");
      return;
    }
    if (!validated) {
      setError("Validez d'abord la consultation avant toute transmission SIH.");
      return;
    }
    setBusy(true);
    setBusyLabel("Transmission SIH…");
    setError("");
    const basePayload = {
      consultationId,
      patient,
      transcription: localTranscription,
      extracted: localExtracted,
      coding: localCoding,
    };
    try {
      const result = await sendConsultationToSIH(consultationId);
      if (result?.status !== "success" || !result?.transmission_id) {
        throw new Error("Le serveur n'a pas confirmé la transmission SIH.");
      }
      onTransmit?.({
        ...basePayload,
        outcome: "success",
        transmissionId: result.transmission_id,
        timestamp: result.timestamp,
        error: "",
      });
    } catch (err) {
      onTransmit?.({
        ...basePayload,
        outcome: "failed",
        transmissionId: null,
        timestamp: null,
        error: err.message || "Erreur lors de la transmission",
      });
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const handleGeneratePDF = async () => {
    if (isOffline) {
      setError("Génération PDF impossible hors-ligne.");
      return;
    }
    if (!consultationId) {
      setError("Aucune consultation persistée n'est associée à cette validation.");
      return;
    }
    if (!canGeneratePdf) {
      setError("La consultation doit être validée avant génération du PDF officiel.");
      return;
    }
    setBusy(true);
    setBusyLabel("Génération PDF…");
    setError("");
    try {
      const pdfBlob = await generateConsultationPDF(consultationId);
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Consultation_${consultationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message || "Erreur lors de la génération PDF.");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const runValidateThenTransmit = async () => {
    if (isOffline) {
      setError("Opération impossible hors-ligne.");
      return;
    }
    if (!consultationId) {
      setError("Aucune consultation persistée.");
      return;
    }
    setBusy(true);
    setError("");
    const basePayload = {
      consultationId,
      patient,
      transcription: localTranscription,
      extracted: localExtracted,
      coding: localCoding,
    };
    let isValidatedNow = validated;
    try {
      if (!isValidatedNow) {
        setBusyLabel("Validation médicale…");
        await updateConsultation(consultationId, {
          transcription: localTranscription,
          structured_data: localExtracted,
          coding_results: localCoding,
        });
        const updated = await validateConsultation(consultationId);
        isValidatedNow = true;
        setValidated(true);
        setLocalStatus(updated.status || "validated");
        onConsultationUpdate?.(updated);
      }
      setBusyLabel("Transmission SIH…");
      const result = await sendConsultationToSIH(consultationId);
      if (result?.status !== "success" || !result?.transmission_id) {
        throw new Error("Le serveur n'a pas confirmé la transmission SIH.");
      }
      onTransmit?.({
        ...basePayload,
        outcome: "success",
        transmissionId: result.transmission_id,
        timestamp: result.timestamp,
        error: "",
      });
    } catch (err) {
      if (isValidatedNow) {
        onTransmit?.({
          ...basePayload,
          outcome: "failed",
          transmissionId: null,
          timestamp: null,
          error: err.message || "Échec de la transmission SIH",
        });
      } else {
        setError(err.message || "Échec validation/transmission");
      }
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  if (!consultationId) {
    return <ErrorState message="Aucune consultation active. Reprenez depuis la dictée." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Étape 3 — Validation</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Validation Structurée de la Consultation</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">Dossier généré par intelligence artificielle clinique</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm text-[var(--info)]">
            <span className="font-semibold">Patient :</span> {patientName}
          </div>
        </div>
        <span className={`lux-badge w-fit ${validated ? "badge-green" : "badge-amber"}`}>
          {validated
            ? "✓ CONSULTATION VALIDÉE"
            : "⚠️ PROPOSITION IA EN ATTENTE DE VALIDATION MÉDICALE"}
        </span>
      </div>

      <div className="luxury-card p-5 flex flex-wrap items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center font-bold text-lg">
          {patientName.split(" ").map((word) => word[0]).join("").slice(0, 2)}
        </div>
        <div>
          <div className="font-semibold text-[var(--text-heading)]">{patientName}</div>
          <div className="text-xs text-[var(--text-muted)]">
            Dossier N° {patient?.dossierNumber || patient?.dossier_number || "-"} · NIR {patient?.nir || "-"}
          </div>
        </div>
        <div className="ml-auto flex gap-3 items-center">
          <span className={`lux-badge ${statusBadge(localStatus)}`}>{localStatus}</span>
          <span className="text-xs font-mono text-[var(--text-muted)]">#{consultationId.slice(0, 8)}</span>
        </div>
      </div>

      <div className="luxury-card p-5">
        <h3 className="text-lg font-bold mb-3">Transcription</h3>
        <textarea
          value={localTranscription}
          onChange={(e) => setLocalTranscription(e.target.value)}
          rows={5}
          className="w-full lux-input text-sm"
          disabled={isOffline || validated}
        />
      </div>

      {localExtracted?.structured_summary ? (
        <div className="luxury-card p-5">
          <h3 className="text-lg font-bold mb-2">Synthèse clinique</h3>
          <p className="text-sm text-[var(--text-body)]">{localExtracted.structured_summary}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="luxury-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary-navy)] text-[var(--gold-light)] flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="text-lg font-bold">Informations Démographiques</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {demographics.map((d) => (
              <div key={d.label} className="bg-[var(--bg-app)] rounded-lg p-3">
                <div className="text-[11px] text-[var(--text-muted)]">{d.label}</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">{String(d.value ?? "—")}</div>
              </div>
            ))}
          </div>
          {symptoms.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">Symptômes extraits</div>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s, i) => (
                  <span key={i} className="lux-badge badge-amber">{typeof s === "string" ? s : s.label}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="luxury-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--gold)] text-white flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="text-lg font-bold">Diagnostics & Codage CIM-10</h3>
            </div>
            <div className="space-y-3">
              {(codedDx.length ? codedDx : diagnoses.map((d) => ({ label: typeof d === "string" ? d : d.label, code: "—", status: "To Confirm", source: "CIM-10", requires_validation: true }))).map((d, i) => (
                <div key={`${d.code}-${i}`} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-heading)]">{d.label || diagnoses[i]?.label || "—"}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {d.source || "CIM-10"} · {d.match_quality || "n/a"} · validation médicale requise
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="lux-badge badge-blue">{d.code || "A CONFIRMER"}</span>
                    <span className={`lux-badge ${d.status === "Matched" ? "badge-amber" : "badge-amber"}`}>
                      À valider
                    </span>
                  </div>
                </div>
              ))}
              {!diagnoses.length && !codedDx.length ? (
                <EmptyState title="Aucun diagnostic extrait" message="Aucune information diagnostique n'a été détectée dans la transcription." />
              ) : null}
            </div>
          </div>

          <div className="luxury-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary-navy)] text-[var(--gold-light)] flex items-center justify-center text-sm font-bold">3</div>
              <h3 className="text-lg font-bold">Traitement & Prescriptions</h3>
            </div>
            <div className="space-y-3">
              {(codedRx.length
                ? codedRx
                : medications.map((m) => ({
                    label: typeof m === "string" ? m : m.drug_name || m.label,
                    code: "—",
                    detail: typeof m === "object" ? [m.dosage, m.frequency].filter(Boolean).join(" · ") : "",
                  }))
              ).map((t, i) => (
                <div key={`${t.code}-${i}`} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-heading)]">{t.label || t.query}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{t.detail || t.source || "GMR"} · À valider</div>
                  </div>
                  <span className="lux-badge badge-blue">{t.code || "GMR-AUTO"}</span>
                </div>
              ))}
              {!medications.length && !treatments.length && !codedRx.length ? (
                <EmptyState title="Aucun traitement extrait" />
              ) : null}
              {treatments.length > 0 ? (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">Traitements</div>
                  {treatments.map((t, i) => (
                    <div key={i} className="text-sm text-[var(--text-heading)] bg-[var(--bg-app)] rounded-lg p-3 mb-2">
                      {typeof t === "string" ? t : t.label}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[var(--gold)] text-white flex items-center justify-center text-sm font-bold">4</div>
            <h3 className="text-lg font-bold">Examens Biologiques & Imagerie</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(codedBio.length
              ? codedBio
              : examinations.map((e) => ({
                  label: typeof e === "string" ? e : e.label || e.test_name,
                  code: "—",
                  source: typeof e === "object" ? e.type || "examen" : "examen",
                }))
            ).map((e, i) => (
              <div key={`${e.code}-${i}`} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-heading)]">{e.label || e.query}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{e.source || "NABM"} · À valider</div>
                </div>
                <span className="lux-badge badge-blue">{e.code || "NABM-AUTO"}</span>
              </div>
            ))}
            {!examinations.length && !codedBio.length ? (
              <EmptyState title="Aucun examen extrait" />
            ) : null}
          </div>
          {localCoding?.note ? (
            <p className="text-xs text-[var(--text-muted)] mt-4">{localCoding.note}</p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-4">
              Les codes proposés ne sont pas confirmés cliniquement automatiquement. Le praticien doit les valider.
            </p>
          )}
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {busy && busyLabel ? <LoadingState label={busyLabel} /> : null}

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2 flex-wrap">
        <button onClick={persistEdits} disabled={busy || isOffline || validated} className="btn-outline disabled:opacity-50">
          Enregistrer
        </button>
        {!localCoding ? (
          <button onClick={retryCoding} disabled={busy || isOffline} className="btn-outline disabled:opacity-50">
            Relancer la codification
          </button>
        ) : null}
        <button
          onClick={handleGeneratePDF}
          disabled={busy || isOffline || !canGeneratePdf}
          className="btn-outline disabled:opacity-50"
          title={
            canGeneratePdf
              ? "Générer le PDF officiel"
              : "Disponible uniquement après validation"
          }
        >
          Générer PDF
        </button>
        {!validated ? (
          <button onClick={handleValidate} disabled={busy || isOffline} className="btn-primary disabled:opacity-50">
            Valider la consultation
          </button>
        ) : null}
        <button
          onClick={runValidateThenTransmit}
          disabled={busy || isOffline}
          className="btn-gold text-base px-6 py-3 disabled:opacity-50"
        >
          {validated ? "Transmettre au SIH" : "Valider & Transmettre au SIH"}
        </button>
      </div>
    </div>
  );
}
