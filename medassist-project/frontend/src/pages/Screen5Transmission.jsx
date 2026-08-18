import React, { useMemo, useState } from "react";
import { generateConsultationPDF, sendConsultationToSIH } from "../services/api";
import { ErrorState, LoadingState } from "../components/ApiState";

function DocIcon({ name }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "rx": return <svg {...common}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M8 13h8" /><path d="M12 9v8" /></svg>;
    case "doc": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    case "lab": return <svg {...common}><path d="M10 2v7.31" /><path d="M14 9.3V2" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>;
    default: return <svg {...common}><path d="M3 8l3-3 3 3" /><path d="M6 5v14" /><circle cx="18" cy="12" r="3" /><circle cx="18" cy="19" r="1.5" /></svg>;
  }
}

function buildDocs({ patient, transcription, extracted, coding, transmissionId }) {
  const patientName = patient?.fullName || patient?.full_name || "Patient";
  const meds = (extracted?.medications || extracted?.prescriptions || []).map((m) =>
    typeof m === "string" ? m : [m.drug_name, m.dosage, m.frequency].filter(Boolean).join(" — ")
  );
  const diagnoses = (extracted?.diagnoses || extracted?.diagnostics || []).map((d) =>
    typeof d === "string" ? d : d.label
  );
  const exams = (extracted?.examinations || []).map((e) =>
    typeof e === "string" ? e : e.label || e.test_name
  );
  const imaging = (extracted?.imaging || []).map((e) =>
    typeof e === "string" ? e : [e.type, e.indication].filter(Boolean).join(" — ")
  );
  const codes = (coding?.diagnostics_icd10 || [])
    .map((c) => `${c.code} (${c.label})`)
    .filter(Boolean);

  return [
    {
      title: "Ordonnance Médicale",
      sub: meds.length ? `Prescriptions extraites (${meds.length})` : "Aucune prescription extraite",
      size: "Données consultation",
      icon: "rx",
      content: [
        `Patient : ${patientName}`,
        `Réf. transmission : ${transmissionId || "Non transmise"}`,
        ...(meds.length ? meds.map((m) => `Médicament : ${m}`) : ["Aucune prescription dans les données extraites"]),
      ],
    },
    {
      title: "Compte-Rendu Clinique",
      sub: "Synthèse basée sur la consultation persistée",
      size: "Données consultation",
      icon: "doc",
      content: [
        `Patient : ${patientName}`,
        extracted?.structured_summary || "Synthèse non disponible",
        ...(diagnoses.length ? diagnoses.map((d) => `Diagnostic : ${d}`) : []),
        ...(codes.length ? codes.map((c) => `Code : ${c}`) : []),
        transcription ? `Transcription : ${transcription.slice(0, 280)}${transcription.length > 280 ? "…" : ""}` : "Transcription absente",
      ].filter(Boolean),
    },
    {
      title: "Demande de Biologie",
      sub: exams.length ? `${exams.length} examen(s)` : "Aucun examen biologique extrait",
      size: "Données consultation",
      icon: "lab",
      content: [
        `Patient : ${patientName}`,
        ...(exams.length ? exams.map((e) => `Examen : ${e}`) : ["Aucun examen biologique mentionné"]),
      ],
    },
    {
      title: "Demande d'Imagerie",
      sub: imaging.length ? `${imaging.length} demande(s)` : "Aucune imagerie extraite",
      size: "Données consultation",
      icon: "img",
      content: [
        `Patient : ${patientName}`,
        ...(imaging.length ? imaging.map((e) => `Examen : ${e}`) : ["Aucune imagerie mentionnée"]),
      ],
    },
  ];
}

export default function Screen5Transmission({
  patient,
  consultationId,
  transmissionId: initialTransmissionId,
  timestamp: initialTimestamp,
  transcription,
  extracted,
  coding,
  transmissionOutcome = "success",
  transmissionError = "",
  isOffline,
  onNewConsultation,
  onReturnHome,
  onTransmissionUpdate,
}) {
  const patientName = patient?.fullName || patient?.full_name || "Patient";
  const [outcome, setOutcome] = useState(transmissionOutcome === "success" ? "success" : "failed");
  const [transmissionId, setTransmissionId] = useState(initialTransmissionId || null);
  const [timestamp, setTimestamp] = useState(initialTimestamp || null);
  const [txError, setTxError] = useState(transmissionError || "");
  const [pdfError, setPdfError] = useState("");
  const [pdfReady, setPdfReady] = useState(false);
  const [busyTx, setBusyTx] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  const docs = useMemo(
    () => buildDocs({ patient, transcription, extracted, coding, transmissionId }),
    [patient, transcription, extracted, coding, transmissionId]
  );

  const retryTransmission = async () => {
    if (!consultationId) {
      setTxError("Identifiant de consultation manquant.");
      return;
    }
    if (isOffline) {
      setTxError("Transmission impossible hors-ligne. Aucune donnée n'a été envoyée.");
      return;
    }
    setBusyTx(true);
    setTxError("");
    try {
      const result = await sendConsultationToSIH(consultationId);
      if (result?.status !== "success" || !result?.transmission_id) {
        throw new Error("Le serveur n'a pas confirmé la transmission SIH.");
      }
      setOutcome("success");
      setTransmissionId(result.transmission_id);
      setTimestamp(result.timestamp || new Date().toISOString());
      onTransmissionUpdate?.({
        status: "transmitted",
        transmissionId: result.transmission_id,
        timestamp: result.timestamp,
        alreadyTransmitted: Boolean(result.already_transmitted),
      });
    } catch (err) {
      setOutcome("failed");
      setTxError(err.message || "Échec de la transmission SIH");
      onTransmissionUpdate?.({
        status: "failed",
        transmissionId: null,
        timestamp: null,
        error: err.message,
      });
    } finally {
      setBusyTx(false);
    }
  };

  const handleGeneratePdf = async ({ open = false } = {}) => {
    if (!consultationId) {
      setPdfError("Identifiant de consultation manquant.");
      return;
    }
    if (isOffline) {
      setPdfError("Génération PDF impossible hors-ligne.");
      return;
    }
    setBusyPdf(true);
    setPdfError("");
    try {
      const blob = await generateConsultationPDF(consultationId);
      if (!blob || blob.size === 0) {
        throw new Error("PDF vide renvoyé par le serveur");
      }
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setPdfReady(true);
      if (open) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Consultation_${consultationId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setPdfReady(false);
      setPdfError(err.message || "Erreur lors de la génération du PDF");
    } finally {
      setBusyPdf(false);
    }
  };

  const success = outcome === "success" && Boolean(transmissionId);

  return (
    <div className="space-y-8">
      <div>
        <div className="section-label mb-2">Étape 4 — Transmission</div>
        <h1 className="text-3xl lg:text-4xl font-bold">
          {success ? "Transmission SIH Effectuée" : "Transmission SIH en Échec"}
        </h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">Processus d'intégration des données médicales</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm text-[var(--info)]">
          <span className="font-semibold">Patient :</span> {patientName}
        </div>
      </div>

      {success ? (
        <div className="luxury-card p-8 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-[var(--success-bg)] to-white border-[var(--success)]/30">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--success)] to-[var(--success)]/80 text-white flex items-center justify-center shrink-0 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold text-[var(--success)]">Consultation transmise au SIH avec succès</h2>
            <p className="text-sm text-[var(--text-body)] mt-1">
              Le dossier de <strong className="text-[var(--success)]">{patientName}</strong> a été transmis sous la référence{" "}
              <strong className="text-[var(--success)]">{transmissionId}</strong>.
            </p>
            {timestamp ? (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Horodatage : {new Date(timestamp).toLocaleString("fr-FR")}
              </p>
            ) : null}
          </div>
          <span className="md:ml-auto lux-badge badge-green">
            <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full" /> Transmis
          </span>
        </div>
      ) : (
        <div className="luxury-card p-8 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-red-50 to-white border border-red-200">
          <div className="w-16 h-16 rounded-full bg-[var(--danger)] text-white flex items-center justify-center shrink-0 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold text-[var(--danger)]">Échec de la transmission SIH</h2>
            <p className="text-sm text-[var(--text-body)] mt-1">
              La consultation validée a été conservée. Aucune transmission n'est considérée comme réussie tant que le serveur ne confirme pas le succès.
            </p>
            {txError ? <p className="text-sm text-[var(--danger)] mt-2">{txError}</p> : null}
            <button
              onClick={retryTransmission}
              disabled={busyTx || isOffline || !consultationId}
              className="btn-gold mt-4 text-sm disabled:opacity-50"
            >
              {busyTx ? "Nouvelle tentative…" : "Réessayer la transmission"}
            </button>
          </div>
          <span className="md:ml-auto lux-badge badge-red">Échec</span>
        </div>
      )}

      {busyTx ? <LoadingState label="Transmission SIH en cours…" /> : null}
      {pdfError ? <ErrorState message={pdfError} onRetry={() => handleGeneratePdf({ open: false })} /> : null}
      {busyPdf ? <LoadingState label="Génération du PDF officiel…" /> : null}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Documents Cliniques</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleGeneratePdf({ open: true })}
              disabled={busyPdf || isOffline || !consultationId}
              className="btn-outline text-sm disabled:opacity-50"
            >
              Ouvrir le PDF
            </button>
            <button
              onClick={() => handleGeneratePdf({ open: false })}
              disabled={busyPdf || isOffline || !consultationId}
              className="btn-gold text-sm disabled:opacity-50"
            >
              Télécharger le PDF
            </button>
          </div>
        </div>
        {pdfReady ? (
          <div className="mb-4 text-sm text-[var(--success)]">PDF généré avec succès à partir des données réelles de la consultation.</div>
        ) : null}

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
                <ul className="mt-2 text-[11px] text-[var(--text-muted)] space-y-0.5">
                  {d.content.slice(0, 4).map((line, idx) => (
                    <li key={idx} className="truncate">• {line}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
        <button onClick={onReturnHome} className="btn-outline">
          Retour à l'Espace Praticien
        </button>
        <button onClick={onNewConsultation} className="btn-primary text-base px-6 py-3">
          Nouvelle Consultation
        </button>
      </div>
    </div>
  );
}
