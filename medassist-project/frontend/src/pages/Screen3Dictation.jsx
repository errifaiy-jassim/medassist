import React, { useEffect, useState } from "react";
import AudioRecorder from "../components/AudioRecorder";
import { EmptyState, ErrorState, LoadingState } from "../components/ApiState";
import {
  analyzeConsultationText,
  createConsultation,
  fetchPatients,
  processMedicalCoding,
  updateConsultation,
} from "../services/api";

function patientLabel(p) {
  return p?.full_name || p?.fullName || "Patient";
}

function codingTermsFromExtracted(extracted) {
  const diagnostics = (extracted?.diagnoses || extracted?.diagnostics || [])
    .map((d) => (typeof d === "string" ? d : d?.label))
    .filter(Boolean);
  const prescriptions = (extracted?.medications || extracted?.prescriptions || [])
    .map((m) => (typeof m === "string" ? m : m?.drug_name || m?.label))
    .filter(Boolean);
  const biology = (extracted?.examinations || extracted?.biology || [])
    .map((e) => (typeof e === "string" ? e : e?.label || e?.test_name))
    .filter(Boolean);
  return { diagnostics, prescriptions, biology };
}

export default function Screen3Dictation({
  patient: initialPatient,
  initialConsultationId = null,
  onAnalyze,
  isOffline,
}) {
  const [transcription, setTranscription] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [patients, setPatients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [consultationId, setConsultationId] = useState(initialConsultationId);
  const [workflowStatus, setWorkflowStatus] = useState(initialConsultationId ? "draft" : "draft");
  const [pipelineError, setPipelineError] = useState("");
  const [pipelineStep, setPipelineStep] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedPatient(initialPatient || null);
  }, [initialPatient]);

  useEffect(() => {
    if (initialConsultationId) {
      setConsultationId(initialConsultationId);
      setWorkflowStatus("draft");
    }
  }, [initialConsultationId]);

  useEffect(() => {
    const loadPatients = async () => {
      if (isOffline) {
        setError("Serveur inaccessible. Sélection patient indisponible.");
        setLoading(false);
        setPatients([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await fetchPatients();
        setPatients(data || []);
        if (initialPatient) {
          setSelectedPatient(initialPatient);
        } else if (data?.length > 0) {
          setSelectedPatient(data[0]);
        }
      } catch (err) {
        setError(err.message || "Impossible de charger les patients");
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, [initialPatient, isOffline]);

  const ensureConsultation = async (patient, text = null) => {
    if (consultationId) {
      if (text != null) {
        const updated = await updateConsultation(consultationId, {
          transcription: text,
          status: text ? "transcribed" : "draft",
        });
        setWorkflowStatus(updated.status || "transcribed");
        return updated;
      }
      return { id: consultationId };
    }
    const created = await createConsultation({
      patient_id: patient.id,
      title: "Consultation clinique",
      transcription: text || null,
      status: text ? "transcribed" : "draft",
    });
    setConsultationId(created.id);
    setWorkflowStatus(created.status || "draft");
    return created;
  };

  const handleStartConsultation = async () => {
    if (!selectedPatient || isOffline || busy) return;
    setBusy(true);
    setPipelineError("");
    try {
      const created = await ensureConsultation(selectedPatient);
      setWorkflowStatus(created.status || "draft");
    } catch (err) {
      setPipelineError(err.message || "Impossible de créer la consultation");
    } finally {
      setBusy(false);
    }
  };

  const handleTranscription = async (text) => {
    setTranscription(text || "");
    if (!selectedPatient || !text || isOffline) return;
    try {
      await ensureConsultation(selectedPatient, text);
      setWorkflowStatus("transcribed");
    } catch (err) {
      setPipelineError(err.message || "Impossible d'enregistrer la transcription");
    }
  };

  const runAnalysisPipeline = async () => {
    if (!selectedPatient || !transcription.trim() || isOffline) return;
    setBusy(true);
    setPipelineError("");
    try {
      setPipelineStep("Enregistrement de la transcription…");
      const consultation = await ensureConsultation(selectedPatient, transcription.trim());
      const cid = consultation.id || consultationId;

      setPipelineStep("Extraction IA des entités cliniques…");
      setWorkflowStatus("analyzed");
      let extractionResponse;
      try {
        extractionResponse = await analyzeConsultationText(transcription.trim(), cid);
      } catch (err) {
        setWorkflowStatus("transcribed");
        throw err;
      }
      const extracted = extractionResponse?.data || extractionResponse;
      if (!extracted || typeof extracted !== "object") {
        throw new Error("Réponse d'extraction IA invalide");
      }

      setPipelineStep("Codification médicale (CIM-10 / GMR / NABM)…");
      const terms = codingTermsFromExtracted(extracted);
      let coding;
      try {
        coding = await processMedicalCoding({
          diagnostics: terms.diagnostics,
          prescriptions: terms.prescriptions,
          biology: terms.biology,
          consultationId: cid,
        });
        setWorkflowStatus("coded");
      } catch (err) {
        setWorkflowStatus("analyzed");
        // Keep extracted data; allow retry of coding from validation or here
        onAnalyze?.({
          consultationId: cid,
          patient: selectedPatient,
          transcription: transcription.trim(),
          extracted,
          coding: null,
          status: "analyzed",
          codingError: err.message,
        });
        setPipelineError(err.message || "Codification échouée — les entités extraites sont conservées.");
        return;
      }

      onAnalyze?.({
        consultationId: cid,
        patient: selectedPatient,
        transcription: transcription.trim(),
        extracted,
        coding,
        status: "coded",
      });
    } catch (err) {
      setPipelineError(err.message || "Échec de l'analyse clinique");
    } finally {
      setBusy(false);
      setPipelineStep("");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="section-label mb-2">Étape 2 — Dictée</div>
        <h1 className="text-3xl lg:text-4xl font-bold">Nouvelle Dictée Médicale</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">
          Enregistrez vos notes vocales pour générer la consultation clinique structurée.
        </p>
        {loading ? <div className="mt-3"><LoadingState label="Chargement des patients…" /></div> : null}
        {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}
        {!loading && !error ? (
          <div className="mt-3 relative">
            <div
              className="inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm text-[var(--info)] cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="font-semibold">Patient :</span> {selectedPatient ? patientLabel(selectedPatient) : "Sélectionner un patient..."}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {showDropdown && (
              <div className="absolute z-10 mt-2 w-64 bg-white border border-[var(--border-soft)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {patients.length === 0 ? (
                  <div className="p-3">
                    <EmptyState title="Aucun patient" message="Créez un patient avant de dicter." />
                  </div>
                ) : (
                  patients.map((p) => (
                    <div
                      key={p.id}
                      className="px-4 py-2 hover:bg-[var(--bg-app)] cursor-pointer"
                      onClick={() => {
                        setSelectedPatient(p);
                        setConsultationId(null);
                        setWorkflowStatus("draft");
                        setShowDropdown(false);
                      }}
                    >
                      {patientLabel(p)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {selectedPatient ? (
        <div className="luxury-card p-5 flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center font-bold">
            {patientLabel(selectedPatient).split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text-heading)]">{patientLabel(selectedPatient)}</div>
            <div className="text-xs text-[var(--text-muted)]">
              NIR {selectedPatient.nir || "—"} · Dossier {selectedPatient.dossier_number || selectedPatient.dossierNumber || "—"} · {selectedPatient.gender || selectedPatient.sex || "—"} · {selectedPatient.age || "Âge N/A"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="lux-badge badge-blue">{workflowStatus}</span>
            {!consultationId ? (
              <button onClick={handleStartConsultation} disabled={busy || isOffline} className="btn-outline text-xs disabled:opacity-50">
                Démarrer la consultation
              </button>
            ) : (
              <span className="text-xs text-[var(--text-muted)] font-mono">#{consultationId.slice(0, 8)}</span>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-3 bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-xl p-4 text-sm text-[var(--info)]">
        <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          <strong className="font-semibold">Conseil :</strong> Dictéez le motif, les symptômes, le diagnostic et le traitement. Relisez la transcription avant l'extraction IA.
        </p>
      </div>

      <AudioRecorder
        onTranscription={handleTranscription}
        disabled={isOffline || !selectedPatient}
      />
      {isOffline ? (
        <p className="text-sm text-[var(--warning)]">
          Dictée et analyse IA indisponibles hors-ligne : transcription STT, extraction et codage nécessitent le serveur.
        </p>
      ) : null}

      <div className="luxury-card p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Transcription à valider
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">Modifiable avant extraction IA</span>
        </div>
        <textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          rows={6}
          className="w-full lux-input min-h-[140px] text-sm leading-relaxed"
          placeholder="La transcription réelle du serveur apparaîtra ici. Vous pouvez la corriger avant l'analyse."
          disabled={isOffline}
        />
      </div>

      {pipelineError ? <ErrorState message={pipelineError} onRetry={runAnalysisPipeline} /> : null}
      {busy && pipelineStep ? <LoadingState label={pipelineStep} /> : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <button
          className="btn-outline"
          onClick={() => {
            setTranscription("");
            setPipelineError("");
          }}
        >
          Vider la dictée
        </button>
        <button
          onClick={runAnalysisPipeline}
          disabled={!transcription.trim() || !selectedPatient || isOffline || busy}
          className={`btn-gold text-base px-6 py-3 ${(!transcription.trim() || !selectedPatient || isOffline || busy) ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Analyser & Générer
        </button>
      </div>
    </div>
  );
}
