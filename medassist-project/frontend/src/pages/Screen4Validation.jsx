import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Edit2,
  FileText,
  FlaskConical,
  Pill,
  Plus,
  RefreshCw,
  Scan,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";
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
  const [saveNotice, setSaveNotice] = useState(false);

  // Form states for adding new items
  const [newSymptom, setNewSymptom] = useState("");
  const [newDiagnosis, setNewDiagnosis] = useState("");
  const [newMedication, setNewMedication] = useState({ drug_name: "", dosage: "", frequency: "" });
  const [newTreatment, setNewTreatment] = useState("");
  const [newBiology, setNewBiology] = useState("");
  const [newImaging, setNewImaging] = useState({ type: "", indication: "" });
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);

  useEffect(() => {
    setLocalExtracted(extracted || {});
    setLocalCoding(coding || null);
    setLocalStatus(status || "coded");
    setLocalTranscription(transcription || "");
    setValidated(status === "validated" || status === "transmitted");
  }, [extracted, coding, status, transcription]);

  const demographicsData = localExtracted?.demographics || {};

  const diagnoses = useMemo(() => {
    return localExtracted?.diagnoses || localExtracted?.diagnostics || [];
  }, [localExtracted]);

  const treatments = useMemo(() => {
    return localExtracted?.treatments || [];
  }, [localExtracted]);

  const medications = useMemo(() => {
    return localExtracted?.medications || localExtracted?.prescriptions || [];
  }, [localExtracted]);

  const biology = useMemo(() => {
    if (Array.isArray(localExtracted?.biology)) return localExtracted.biology;
    if (Array.isArray(localExtracted?.examinations)) {
      return localExtracted.examinations
        .filter((e) => (typeof e === "object" ? e.type === "biology" : false))
        .map((e) => ({ test_name: e.label }));
    }
    return [];
  }, [localExtracted]);

  const imaging = useMemo(() => {
    if (Array.isArray(localExtracted?.imaging)) return localExtracted.imaging;
    if (Array.isArray(localExtracted?.examinations)) {
      return localExtracted.examinations
        .filter((e) => (typeof e === "object" ? e.type === "imaging" : false))
        .map((e) => ({ type: e.label, indication: e.indication }));
    }
    return [];
  }, [localExtracted]);

  const symptoms = useMemo(() => {
    return localExtracted?.symptoms || [];
  }, [localExtracted]);

  const codedDx = localCoding?.diagnostics_icd10 || [];
  const codedRx = localCoding?.prescriptions_gmr || [];
  const codedBio = localCoding?.biology_nabm || [];

  const canGeneratePdf =
    validated ||
    localStatus === "validated" ||
    localStatus === "transmitting" ||
    localStatus === "transmitted";

  // --- Handlers for Modifying Extracted Data ---

  const handleAddSymptom = () => {
    if (!newSymptom.trim()) return;
    const item = { label: newSymptom.trim() };
    const updated = [...symptoms, item];
    setLocalExtracted((prev) => ({ ...prev, symptoms: updated }));
    setNewSymptom("");
  };

  const handleRemoveSymptom = (index) => {
    const updated = symptoms.filter((_, i) => i !== index);
    setLocalExtracted((prev) => ({ ...prev, symptoms: updated }));
  };

  const handleAddDiagnosis = () => {
    if (!newDiagnosis.trim()) return;
    const item = { label: newDiagnosis.trim() };
    const updated = [...diagnoses, item];
    setLocalExtracted((prev) => ({
      ...prev,
      diagnoses: updated,
      diagnostics: updated,
    }));
    setNewDiagnosis("");
  };

  const handleRemoveDiagnosis = (index) => {
    const updated = diagnoses.filter((_, i) => i !== index);
    setLocalExtracted((prev) => ({
      ...prev,
      diagnoses: updated,
      diagnostics: updated,
    }));
  };

  const handleAddMedication = () => {
    if (!newMedication.drug_name.trim()) return;
    const item = {
      drug_name: newMedication.drug_name.trim(),
      dosage: newMedication.dosage.trim() || null,
      frequency: newMedication.frequency.trim() || null,
    };
    const updated = [...medications, item];
    setLocalExtracted((prev) => ({
      ...prev,
      medications: updated,
      prescriptions: updated,
    }));
    setNewMedication({ drug_name: "", dosage: "", frequency: "" });
  };

  const handleRemoveMedication = (index) => {
    const updated = medications.filter((_, i) => i !== index);
    setLocalExtracted((prev) => ({
      ...prev,
      medications: updated,
      prescriptions: updated,
    }));
  };

  const handleAddTreatment = () => {
    if (!newTreatment.trim()) return;
    const item = { label: newTreatment.trim() };
    const updated = [...treatments, item];
    setLocalExtracted((prev) => ({ ...prev, treatments: updated }));
    setNewTreatment("");
  };

  const handleRemoveTreatment = (index) => {
    const updated = treatments.filter((_, i) => i !== index);
    setLocalExtracted((prev) => ({ ...prev, treatments: updated }));
  };

  const handleAddBiology = () => {
    if (!newBiology.trim()) return;
    const item = { test_name: newBiology.trim() };
    const updatedBio = [...biology, item];
    const updatedExams = [
      ...updatedBio.map((b) => ({ label: b.test_name, type: "biology" })),
      ...imaging.map((img) => ({ label: img.type, type: "imaging", indication: img.indication })),
    ];
    setLocalExtracted((prev) => ({
      ...prev,
      biology: updatedBio,
      examinations: updatedExams,
    }));
    setNewBiology("");
  };

  const handleRemoveBiology = (index) => {
    const updatedBio = biology.filter((_, i) => i !== index);
    const updatedExams = [
      ...updatedBio.map((b) => ({ label: b.test_name, type: "biology" })),
      ...imaging.map((img) => ({ label: img.type, type: "imaging", indication: img.indication })),
    ];
    setLocalExtracted((prev) => ({
      ...prev,
      biology: updatedBio,
      examinations: updatedExams,
    }));
  };

  const handleAddImaging = () => {
    if (!newImaging.type.trim()) return;
    const item = {
      type: newImaging.type.trim(),
      indication: newImaging.indication.trim() || null,
    };
    const updatedImg = [...imaging, item];
    const updatedExams = [
      ...biology.map((b) => ({ label: b.test_name, type: "biology" })),
      ...updatedImg.map((img) => ({ label: img.type, type: "imaging", indication: img.indication })),
    ];
    setLocalExtracted((prev) => ({
      ...prev,
      imaging: updatedImg,
      examinations: updatedExams,
    }));
    setNewImaging({ type: "", indication: "" });
  };

  const handleRemoveImaging = (index) => {
    const updatedImg = imaging.filter((_, i) => i !== index);
    const updatedExams = [
      ...biology.map((b) => ({ label: b.test_name, type: "biology" })),
      ...updatedImg.map((img) => ({ label: img.type, type: "imaging", indication: img.indication })),
    ];
    setLocalExtracted((prev) => ({
      ...prev,
      imaging: updatedImg,
      examinations: updatedExams,
    }));
  };

  const handleUpdateDemographicField = (field, value) => {
    setLocalExtracted((prev) => ({
      ...prev,
      demographics: {
        ...(prev?.demographics || {}),
        [field]: value || null,
      },
    }));
  };

  const handleUpdateSummary = (value) => {
    setLocalExtracted((prev) => ({
      ...prev,
      structured_summary: value,
    }));
  };

  // --- Persistence and Actions ---

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
      setSaveNotice(true);
      setTimeout(() => setSaveNotice(false), 3000);
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
    setBusyLabel("Recalcul de la codification médicale…");
    setError("");
    try {
      const dList = diagnoses.map((d) => (typeof d === "string" ? d : d?.label)).filter(Boolean);
      const pList = medications.map((m) => (typeof m === "string" ? m : m?.drug_name || m?.label)).filter(Boolean);
      const bList = biology.map((b) => (typeof b === "string" ? b : b?.test_name || b?.label)).filter(Boolean);

      const result = await processMedicalCoding({
        diagnostics: dList,
        prescriptions: pList,
        biology: bList,
        consultationId,
      });
      setLocalCoding(result);
      setLocalStatus("coded");
      onConsultationUpdate?.({ coding_results: result, status: "coded" });
      setSaveNotice(true);
      setTimeout(() => setSaveNotice(false), 3000);
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
    setBusyLabel("Validation médicale de la consultation…");
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
    setBusyLabel("Génération PDF officiel…");
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-1">Étape 3 — Révision & Validation Médicale</div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-heading)]">
            Validation & Édition des Propositions IA
          </h1>
          <div className="gold-divider mt-2" />
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            Vous pouvez modifier, supprimer ou ajouter des éléments extraits avant de valider la consultation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {saveNotice && (
            <span className="lux-badge badge-green animate-fade-up">
              <Check size={14} /> Enregistré
            </span>
          )}
          <span className={`lux-badge w-fit ${validated ? "badge-green" : "badge-amber"}`}>
            {validated
              ? "✓ CONSULTATION VALIDÉE"
              : "⚠️ PROPOSITION IA ÉDITABLE — EN ATTENTE DE VALIDATION"}
          </span>
        </div>
      </div>

      {/* Patient Header Banner */}
      <div className="luxury-card p-4 flex flex-wrap items-center gap-4 bg-white border border-[var(--border-soft)]">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center font-bold text-lg">
          {patientName.split(" ").map((word) => word[0]).join("").slice(0, 2)}
        </div>
        <div>
          <div className="font-bold text-base text-[var(--text-heading)]">{patientName}</div>
          <div className="text-xs text-[var(--text-muted)]">
            Dossier N° {patient?.dossierNumber || patient?.dossier_number || "-"} · NIR {patient?.nir || "-"}
          </div>
        </div>
        <div className="ml-auto flex gap-3 items-center">
          <span className={`lux-badge ${statusBadge(localStatus)}`}>{localStatus}</span>
          <span className="text-xs font-mono text-[var(--text-muted)]">#{consultationId.slice(0, 8)}</span>
        </div>
      </div>

      {/* Transcription Editor */}
      <div className="luxury-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--medical-blue)]" />
            <h3 className="text-base font-bold">Transcription Textuelle</h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">Éditable directement</span>
        </div>
        <textarea
          value={localTranscription}
          onChange={(e) => setLocalTranscription(e.target.value)}
          rows={4}
          className="w-full lux-input text-sm resize-y"
          placeholder="Transcription brute de la consultation..."
          disabled={isOffline || validated}
        />
      </div>

      {/* Clinical Summary Editor */}
      <div className="luxury-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[var(--gold)]" />
            <h3 className="text-base font-bold">Synthèse Clinique Structurée</h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">Éditable</span>
        </div>
        <textarea
          value={localExtracted?.structured_summary || ""}
          onChange={(e) => handleUpdateSummary(e.target.value)}
          rows={3}
          className="w-full lux-input text-sm resize-y"
          placeholder="Synthèse factuelle générée par l'IA..."
          disabled={isOffline || validated}
        />
      </div>

      {/* Main Grid: 4 Structured Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Demographics & Symptoms */}
        <div className="luxury-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-navy)] text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <h3 className="text-base font-bold">Informations Démographiques</h3>
            </div>
            {!validated && (
              <button
                type="button"
                onClick={() => setIsEditingDemographics(!isEditingDemographics)}
                className="text-xs text-[var(--medical-blue)] font-semibold hover:underline inline-flex items-center gap-1"
              >
                <Edit2 size={13} /> {isEditingDemographics ? "Fermer" : "Modifier"}
              </button>
            )}
          </div>

          {isEditingDemographics && !validated ? (
            <div className="grid grid-cols-3 gap-3 bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border-soft)]">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Âge</label>
                <input
                  type="text"
                  value={demographicsData.age || ""}
                  onChange={(e) => handleUpdateDemographicField("age", e.target.value)}
                  placeholder="Ex: 45 ans"
                  className="lux-input text-xs py-1.5 px-2"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Sexe</label>
                <input
                  type="text"
                  value={demographicsData.gender || ""}
                  onChange={(e) => handleUpdateDemographicField("gender", e.target.value)}
                  placeholder="M / F"
                  className="lux-input text-xs py-1.5 px-2"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Groupe Sanguin</label>
                <input
                  type="text"
                  value={demographicsData.blood_group || ""}
                  onChange={(e) => handleUpdateDemographicField("blood_group", e.target.value)}
                  placeholder="Ex: O+"
                  className="lux-input text-xs py-1.5 px-2"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[var(--bg-app)] rounded-lg p-2.5">
                <div className="text-[11px] text-[var(--text-muted)]">Âge</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">
                  {demographicsData.age || patient?.age || "—"}
                </div>
              </div>
              <div className="bg-[var(--bg-app)] rounded-lg p-2.5">
                <div className="text-[11px] text-[var(--text-muted)]">Sexe</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">
                  {demographicsData.gender || patient?.gender || patient?.sex || "—"}
                </div>
              </div>
              <div className="bg-[var(--bg-app)] rounded-lg p-2.5">
                <div className="text-[11px] text-[var(--text-muted)]">Groupe Sanguin</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">
                  {demographicsData.blood_group || patient?.blood_group || "—"}
                </div>
              </div>
            </div>
          )}

          {/* Symptoms Section */}
          <div className="pt-2 border-t border-[var(--border-soft)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider">
                Symptômes extraits ({symptoms.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[32px] items-center mb-3">
              {symptoms.length === 0 ? (
                <span className="text-xs text-[var(--text-muted)] italic">Aucun symptôme extrait</span>
              ) : (
                symptoms.map((s, idx) => {
                  const label = typeof s === "string" ? s : s?.label;
                  return (
                    <span
                      key={idx}
                      className="lux-badge badge-amber inline-flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium rounded-md"
                    >
                      <span>{label}</span>
                      {!validated && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSymptom(idx)}
                          className="hover:text-red-700 transition-colors"
                          title="Supprimer ce symptôme"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </span>
                  );
                })
              )}
            </div>

            {!validated && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddSymptom();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  placeholder="Ajouter un symptôme (ex: céphalées, fièvre)..."
                  className="lux-input text-xs flex-1 py-1.5"
                />
                <button
                  type="submit"
                  disabled={!newSymptom.trim()}
                  className="btn-outline text-xs px-3 py-1.5 shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Card 2: Diagnostics & Codage CIM-10 */}
        <div className="luxury-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--gold)] text-white flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 className="text-base font-bold">Diagnostics & Codage CIM-10</h3>
              </div>
            </div>
            {!validated && (
              <button
                type="button"
                onClick={retryCoding}
                disabled={busy || isOffline}
                className="text-xs text-[var(--medical-blue)] font-semibold hover:underline inline-flex items-center gap-1"
                title="Recalculer les codes CIM-10"
              >
                <RefreshCw size={12} /> Coder
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {diagnoses.length === 0 ? (
              <div className="p-4 bg-[var(--bg-app)] rounded-lg text-center">
                <p className="text-xs font-semibold text-[var(--text-heading)]">Aucun diagnostic extrait</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Ajoutez manuellement les diagnostics ci-dessous si nécessaire.
                </p>
              </div>
            ) : (
              diagnoses.map((d, i) => {
                const label = typeof d === "string" ? d : d?.label;
                const match = codedDx[i];
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-2.5 gap-2 border border-[var(--border-soft)] hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[var(--text-heading)] truncate">{label}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {match?.code ? `CIM-10 : ${match.code} (${match.label || "Libellé"})` : "CIM-10 · À valider"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {match?.code ? (
                        <span className="lux-badge badge-blue text-[11px]">{match.code}</span>
                      ) : (
                        <span className="lux-badge badge-amber text-[11px]">À valider</span>
                      )}
                      {!validated && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDiagnosis(i)}
                          className="text-[var(--text-muted)] hover:text-red-600 p-1 transition-colors"
                          title="Supprimer ce diagnostic"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!validated && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddDiagnosis();
              }}
              className="flex gap-2 pt-2 border-t border-[var(--border-soft)]"
            >
              <input
                type="text"
                value={newDiagnosis}
                onChange={(e) => setNewDiagnosis(e.target.value)}
                placeholder="Nouveau diagnostic (ex: Hypertension artérielle)..."
                className="lux-input text-xs flex-1 py-1.5"
              />
              <button
                type="submit"
                disabled={!newDiagnosis.trim()}
                className="btn-outline text-xs px-3 py-1.5 shrink-0 flex items-center gap-1 disabled:opacity-50"
              >
                <Plus size={14} /> Ajouter
              </button>
            </form>
          )}
        </div>

        {/* Card 3: Traitement & Prescriptions */}
        <div className="luxury-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-navy)] text-white flex items-center justify-center text-sm font-bold">
                3
              </div>
              <h3 className="text-base font-bold">Traitement & Prescriptions</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Médicaments & soins</span>
          </div>

          {/* Medications */}
          <div>
            <div className="text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider mb-2">
              Prescriptions Médicamenteuses ({medications.length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {medications.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic p-2 bg-[var(--bg-app)] rounded-lg">
                  Aucun médicament extrait
                </p>
              ) : (
                medications.map((m, i) => {
                  const drugName = typeof m === "string" ? m : m?.drug_name || m?.label;
                  const dosage = typeof m === "object" ? m?.dosage : null;
                  const freq = typeof m === "object" ? m?.frequency : null;
                  const details = [dosage, freq].filter(Boolean).join(" · ");
                  const match = codedRx[i];

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-2.5 gap-2 border border-[var(--border-soft)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--text-heading)] truncate">{drugName}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {details || "Posologie non spécifiée"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="lux-badge badge-blue text-[11px]">{match?.code || "GMR-AUTO"}</span>
                        {!validated && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(i)}
                            className="text-[var(--text-muted)] hover:text-red-600 p-1 transition-colors"
                            title="Supprimer ce médicament"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!validated && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddMedication();
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3"
              >
                <input
                  type="text"
                  value={newMedication.drug_name}
                  onChange={(e) => setNewMedication({ ...newMedication, drug_name: e.target.value })}
                  placeholder="Médicament (ex: Paracétamol)"
                  className="lux-input text-xs py-1.5"
                />
                <input
                  type="text"
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  placeholder="Dosage (ex: 1g)"
                  className="lux-input text-xs py-1.5"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                    placeholder="Fréquence (ex: 3x/j)"
                    className="lux-input text-xs py-1.5 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!newMedication.drug_name.trim()}
                    className="btn-outline text-xs px-2.5 py-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Non-medicinal treatments */}
          <div className="pt-2 border-t border-[var(--border-soft)]">
            <div className="text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider mb-2">
              Traitements non médicamenteux ({treatments.length})
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {treatments.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic p-2 bg-[var(--bg-app)] rounded-lg">
                  Aucun traitement non médicamenteux extrait
                </p>
              ) : (
                treatments.map((t, i) => {
                  const label = typeof t === "string" ? t : t?.label;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-2.5 gap-2 border border-[var(--border-soft)]"
                    >
                      <div className="text-sm font-medium text-[var(--text-heading)]">{label}</div>
                      {!validated && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTreatment(i)}
                          className="text-[var(--text-muted)] hover:text-red-600 p-1 transition-colors"
                          title="Supprimer ce traitement"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!validated && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTreatment();
                }}
                className="flex gap-2 mt-2"
              >
                <input
                  type="text"
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  placeholder="Ajouter une prise en charge (ex: Repos, Kinésithérapie)..."
                  className="lux-input text-xs flex-1 py-1.5"
                />
                <button
                  type="submit"
                  disabled={!newTreatment.trim()}
                  className="btn-outline text-xs px-3 py-1.5 shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Card 4: Examens Biologiques & Imagerie */}
        <div className="luxury-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--gold)] text-white flex items-center justify-center text-sm font-bold">
                4
              </div>
              <h3 className="text-base font-bold">Examens Biologiques & Imagerie</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Biologie · Imagerie</span>
          </div>

          {/* Biology Tests */}
          <div>
            <div className="text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FlaskConical size={14} className="text-[var(--medical-blue)]" />
              Biologie Médicale ({biology.length})
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {biology.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic p-2 bg-[var(--bg-app)] rounded-lg">
                  Aucun examen biologique extrait
                </p>
              ) : (
                biology.map((b, i) => {
                  const label = typeof b === "string" ? b : b?.test_name || b?.label;
                  const match = codedBio[i];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-2.5 gap-2 border border-[var(--border-soft)]"
                    >
                      <div className="text-sm font-semibold text-[var(--text-heading)]">{label}</div>
                      <div className="flex items-center gap-2">
                        <span className="lux-badge badge-blue text-[11px]">{match?.code || "NABM-AUTO"}</span>
                        {!validated && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBiology(i)}
                            className="text-[var(--text-muted)] hover:text-red-600 p-1 transition-colors"
                            title="Supprimer cet examen"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!validated && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddBiology();
                }}
                className="flex gap-2 mt-2"
              >
                <input
                  type="text"
                  value={newBiology}
                  onChange={(e) => setNewBiology(e.target.value)}
                  placeholder="Nouvel examen biologique (ex: NFS, CRP, Glycémie)..."
                  className="lux-input text-xs flex-1 py-1.5"
                />
                <button
                  type="submit"
                  disabled={!newBiology.trim()}
                  className="btn-outline text-xs px-3 py-1.5 shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </form>
            )}
          </div>

          {/* Imaging */}
          <div className="pt-2 border-t border-[var(--border-soft)]">
            <div className="text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Scan size={14} className="text-[var(--gold)]" />
              Imagerie Médicale ({imaging.length})
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {imaging.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic p-2 bg-[var(--bg-app)] rounded-lg">
                  Aucun examen d'imagerie extrait
                </p>
              ) : (
                imaging.map((img, i) => {
                  const type = typeof img === "string" ? img : img?.type || img?.label;
                  const indication = typeof img === "object" ? img?.indication : null;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-2.5 gap-2 border border-[var(--border-soft)]"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-heading)]">{type}</div>
                        {indication && <div className="text-[11px] text-[var(--text-muted)]">Raison : {indication}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="lux-badge badge-blue text-[11px]">IMAGERIE</span>
                        {!validated && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImaging(i)}
                            className="text-[var(--text-muted)] hover:text-red-600 p-1 transition-colors"
                            title="Supprimer cet examen"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!validated && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddImaging();
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"
              >
                <input
                  type="text"
                  value={newImaging.type}
                  onChange={(e) => setNewImaging({ ...newImaging, type: e.target.value })}
                  placeholder="Type d'imagerie (ex: Échographie abdominale)"
                  className="lux-input text-xs py-1.5"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newImaging.indication}
                    onChange={(e) => setNewImaging({ ...newImaging, indication: e.target.value })}
                    placeholder="Indication (ex: Douleur FID)"
                    className="lux-input text-xs py-1.5 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!newImaging.type.trim()}
                    className="btn-outline text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Error and Loading States */}
      {error ? <ErrorState message={error} /> : null}
      {busy && busyLabel ? <LoadingState label={busyLabel} /> : null}

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[var(--border-soft)]">
        <div className="flex items-center gap-2">
          <button
            onClick={persistEdits}
            disabled={busy || isOffline || validated}
            className="btn-outline text-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 size={16} />
            Enregistrer les modifications
          </button>
          {!validated && (
            <button
              onClick={retryCoding}
              disabled={busy || isOffline}
              className="btn-outline text-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw size={16} />
              Recalculer le codage
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGeneratePDF}
            disabled={busy || isOffline || !canGeneratePdf}
            className="btn-outline text-sm disabled:opacity-50 flex items-center gap-1.5"
            title={
              canGeneratePdf
                ? "Générer le PDF officiel"
                : "Disponible uniquement après validation"
            }
          >
            <FileText size={16} />
            Générer PDF
          </button>
          {!validated ? (
            <button
              onClick={handleValidate}
              disabled={busy || isOffline}
              className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck size={16} />
              Valider la consultation
            </button>
          ) : null}
          <button
            onClick={runValidateThenTransmit}
            disabled={busy || isOffline}
            className="btn-gold text-sm px-5 py-2.5 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Activity size={16} />
            {validated ? "Transmettre au SIH" : "Valider & Transmettre au SIH"}
          </button>
        </div>
      </div>
    </div>
  );
}
