import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPatient,
  createConsultation,
  fetchPatientConsultations,
  fetchPatients,
  searchPatients,
  updatePatient,
} from "../services/api";
import { EmptyState, ErrorState, LoadingState } from "../components/ApiState";

const EMPTY_FORM = {
  fullName: "",
  nir: "",
  age: "",
  sex: "",
  bloodGroup: "",
  phone: "",
  email: "",
  dossierNumber: "",
};

function normalizePatient(patient) {
  return {
    id: patient.id,
    fullName: patient.full_name || patient.fullName || "",
    nir: patient.nir || "",
    age: patient.age || "",
    sex: patient.gender || patient.sex || "",
    bloodGroup: patient.blood_group || patient.bloodGroup || "",
    phone: patient.phone || "",
    email: patient.email || "",
    dossierNumber: patient.dossier_number || patient.dossierNumber || "",
    createdAt: patient.created_at || null,
  };
}

function validateForm(formData) {
  if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
    return "Le nom complet est obligatoire (2 caractères minimum).";
  }
  if (formData.email.trim()) {
    const email = formData.email.trim();
    if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
      return "Adresse e-mail invalide.";
    }
  }
  if (formData.nir.trim() && formData.nir.trim().length < 3) {
    return "Le NIR saisi semble trop court.";
  }
  return "";
}

function statusLabel(status) {
  const map = {
    draft: "Brouillon",
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

export default function ScreenPatientDetail({
  onNewConsultation,
  isOffline,
  initialPatientId = null,
}) {
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState(initialPatientId);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [formErrors, setFormErrors] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingConsultation, setStartingConsultation] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const submitLockRef = useRef(false);
  const startLockRef = useRef(false);

  const activePatient = useMemo(
    () => patients.find((p) => p.id === activePatientId) || null,
    [patients, activePatientId]
  );

  const loadPatients = useCallback(async () => {
    if (isOffline) {
      setError("Serveur inaccessible. Impossible de charger les patients.");
      setLoading(false);
      setPatients([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const backendPatients = await fetchPatients();
      const normalizedPatients = (backendPatients || []).map(normalizePatient);
      setPatients(normalizedPatients);
      setActivePatientId((currentId) => {
        const preferred = currentId || initialPatientId;
        if (preferred && normalizedPatients.some((p) => p.id === preferred)) {
          return preferred;
        }
        return normalizedPatients[0]?.id || null;
      });
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des patients");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [isOffline, initialPatientId]);

  const loadHistory = useCallback(async (patientId) => {
    if (!patientId) {
      setConsultationHistory([]);
      return;
    }
    if (isOffline) {
      setHistoryError("Historique indisponible hors-ligne.");
      setConsultationHistory([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const history = await fetchPatientConsultations(patientId);
      setConsultationHistory(history || []);
    } catch (err) {
      setHistoryError(err.message || "Erreur lors du chargement de l'historique");
      setConsultationHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    loadHistory(activePatient?.id);
  }, [activePatient?.id, loadHistory]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      loadPatients();
      return;
    }
    if (isOffline) {
      setError("Recherche impossible hors-ligne.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const results = await searchPatients(q);
      const normalized = (results || []).map(normalizePatient);
      setPatients(normalized);
      setActivePatientId(normalized[0]?.id || null);
    } catch (err) {
      setError(err.message || "Erreur de recherche");
    } finally {
      setSearching(false);
    }
  };

  const info = activePatient
    ? [
        { label: "Nom complet", value: activePatient.fullName || "—" },
        { label: "NIR", value: activePatient.nir || "—" },
        { label: "Âge", value: activePatient.age || "—" },
        { label: "Sexe", value: activePatient.sex || "—" },
        { label: "Groupe sanguin", value: activePatient.bloodGroup || "—" },
        { label: "Téléphone", value: activePatient.phone || "—" },
        { label: "Email", value: activePatient.email || "—" },
        { label: "Dossier N°", value: activePatient.dossierNumber || "—" },
      ]
    : [];

  const startCreate = () => {
    setIsEditing(false);
    setSubmitError("");
    setFormErrors("");
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = () => {
    if (!activePatient) return;
    setIsEditing(true);
    setSubmitError("");
    setFormErrors("");
    setFormData({
      fullName: activePatient.fullName || "",
      nir: activePatient.nir || "",
      age: activePatient.age || "",
      sex: activePatient.sex || "",
      bloodGroup: activePatient.bloodGroup || "",
      phone: activePatient.phone || "",
      email: activePatient.email || "",
      dossierNumber: activePatient.dossierNumber || "",
    });
    setShowForm(true);
  };

  const handleConsultationStart = async () => {
    if (!activePatient?.id || isOffline || startLockRef.current) return;
    startLockRef.current = true;
    setStartingConsultation(true);
    setSubmitError("");
    try {
      const createdConsultation = await createConsultation({
        patient_id: activePatient.id,
        title: "Nouvelle consultation",
        status: "draft",
      });
      setConsultationHistory((prev) => [createdConsultation, ...prev]);
      onNewConsultation?.(activePatient, createdConsultation);
    } catch (err) {
      setSubmitError(err.message || "Impossible de démarrer la consultation");
    } finally {
      setStartingConsultation(false);
      startLockRef.current = false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isOffline || submitLockRef.current || saving) return;

    const validationMessage = validateForm(formData);
    if (validationMessage) {
      setFormErrors(validationMessage);
      return;
    }

    const payload = {
      full_name: formData.fullName.trim(),
      nir: formData.nir.trim() || null,
      age: formData.age.trim() || null,
      gender: formData.sex.trim() || null,
      blood_group: formData.bloodGroup.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      dossier_number: formData.dossierNumber.trim() || null,
    };

    submitLockRef.current = true;
    setSaving(true);
    setSubmitError("");
    setFormErrors("");
    try {
      const saved = isEditing
        ? await updatePatient(activePatient.id, payload)
        : await createPatient(payload);
      const patientRecord = normalizePatient(saved);

      if (isEditing) {
        setPatients((prev) =>
          prev.map((patient) => (patient.id === activePatient.id ? patientRecord : patient))
        );
        setActivePatientId(activePatient.id);
      } else {
        setPatients((prev) => [patientRecord, ...prev]);
        setActivePatientId(patientRecord.id);
      }

      setShowForm(false);
      setIsEditing(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setSubmitError(err.message || "L'enregistrement du patient a échoué.");
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const transmittedCount = consultationHistory.filter((c) => c.transmission_status === "sent").length;
  const createdLabel = activePatient?.createdAt
    ? new Date(activePatient.createdAt).toLocaleDateString("fr-FR")
    : "—";

  if (loading) {
    return <LoadingState label="Chargement des patients…" />;
  }

  if (error && patients.length === 0) {
    return <ErrorState message={error} onRetry={loadPatients} />;
  }

  const patientForm = (
    <div className="luxury-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{isEditing ? "Modifier les informations" : "Nouveau patient"}</h3>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setIsEditing(false);
            setFormErrors("");
            setSubmitError("");
          }}
          className="text-sm text-[var(--text-muted)]"
        >
          Fermer
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
        <input
          required
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="Nom complet *"
          disabled={saving}
        />
        <input
          value={formData.nir}
          onChange={(e) => setFormData({ ...formData, nir: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="NIR"
          disabled={saving}
        />
        <input
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="Âge"
          disabled={saving}
        />
        <select
          value={formData.sex}
          onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          disabled={saving}
        >
          <option value="">Sexe (non renseigné)</option>
          <option value="Féminin">Féminin</option>
          <option value="Masculin">Masculin</option>
          <option value="Autre">Autre</option>
        </select>
        <input
          value={formData.bloodGroup}
          onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="Groupe sanguin"
          disabled={saving}
        />
        <input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="Téléphone"
          disabled={saving}
        />
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="Email"
          disabled={saving}
        />
        <input
          value={formData.dossierNumber}
          onChange={(e) => setFormData({ ...formData, dossierNumber: e.target.value })}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
          placeholder="Dossier N°"
          disabled={saving}
        />
        <div className="md:col-span-2 flex flex-col items-end gap-2">
          {formErrors ? <div className="text-sm text-red-500 w-full text-right">{formErrors}</div> : null}
          {submitError ? <div className="text-sm text-red-500 w-full text-right">{submitError}</div> : null}
          <button type="submit" disabled={saving || isOffline} className="btn-gold disabled:opacity-50">
            {saving ? "Enregistrement…" : isEditing ? "Enregistrer les modifications" : "Enregistrer le patient"}
          </button>
        </div>
      </form>
    </div>
  );

  if (!activePatient) {
    return (
      <div className="space-y-6">
        <div>
          <div className="section-label mb-2">Dossier Patient</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Patients</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">Aucun dossier patient en base pour le moment.</p>
        </div>
        {error ? <ErrorState message={error} onRetry={loadPatients} /> : null}
        <EmptyState title="Aucun patient" message="Créez un premier dossier patient pour commencer." />
        <button onClick={startCreate} disabled={isOffline} className="btn-gold disabled:opacity-50">
          Ajouter un patient
        </button>
        {showForm ? patientForm : null}
      </div>
    );
  }

  const initials = activePatient.fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Dossier Patient</div>
          <h1 className="text-3xl lg:text-4xl font-bold">{activePatient.fullName}</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">
            Dossier médical · {activePatient.nir || "NIR non renseigné"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={startCreate} disabled={isOffline || saving} className="btn-outline disabled:opacity-50">
            Ajouter un patient
          </button>
          <button onClick={startEdit} disabled={isOffline || saving} className="btn-outline disabled:opacity-50">
            Modifier les infos
          </button>
          <button
            onClick={handleConsultationStart}
            disabled={isOffline || startingConsultation}
            className="btn-gold disabled:opacity-50"
          >
            {startingConsultation ? "Création…" : "Nouvelle consultation"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="luxury-card p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="lux-input flex-1"
          placeholder="Rechercher par nom, NIR ou dossier…"
          disabled={isOffline || searching}
        />
        <button type="submit" disabled={searching || isOffline} className="btn-primary disabled:opacity-50">
          {searching ? "Recherche…" : "Rechercher"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            loadPatients();
          }}
          className="btn-outline"
          disabled={isOffline || searching}
        >
          Tous
        </button>
      </form>

      {error ? <ErrorState message={error} onRetry={loadPatients} /> : null}
      {submitError && !showForm ? <ErrorState message={submitError} /> : null}

      <div className="luxury-card p-4">
        <div className="text-sm font-semibold text-[var(--text-heading)] mb-3">Patients disponibles</div>
        {patients.length === 0 ? (
          <EmptyState title="Aucun résultat" message="Aucun patient ne correspond à votre recherche." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => setActivePatientId(patient.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  activePatientId === patient.id
                    ? "bg-[var(--gold)] text-[var(--primary-navy)] border-[var(--gold)]"
                    : "bg-[var(--bg-app)] text-[var(--text-heading)] border-[var(--border-soft)]"
                }`}
              >
                {patient.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm ? patientForm : null}

      <div className="luxury-card p-6 flex items-center gap-5 bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] flex items-center justify-center text-2xl font-bold text-[var(--primary-navy)]">
          {initials}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold">{activePatient.fullName}</div>
          <div className="text-sm text-white/60">
            {[activePatient.sex, activePatient.age ? `${activePatient.age}` : null, activePatient.bloodGroup ? `Groupe ${activePatient.bloodGroup}` : null]
              .filter(Boolean)
              .join(" · ") || "Informations complémentaires non renseignées"}
          </div>
        </div>
        <div className="hidden sm:flex gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--gold-light)]">{consultationHistory.length}</div>
            <div className="text-[11px] text-white/50">Consultations</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--gold-light)]">{transmittedCount}</div>
            <div className="text-[11px] text-white/50">Transmises</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="luxury-card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-5">Informations Générales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {info.map((i) => (
              <div key={i.label} className="bg-[var(--bg-app)] rounded-lg p-3">
                <div className="text-[11px] text-[var(--text-muted)]">{i.label}</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">{i.value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-8 mb-4">
            <h3 className="text-lg font-bold">Historique des Consultations</h3>
            <button
              type="button"
              className="btn-outline text-xs"
              disabled={historyLoading || isOffline}
              onClick={() => loadHistory(activePatient.id)}
            >
              Actualiser
            </button>
          </div>
          {historyLoading ? <LoadingState label="Chargement de l'historique…" /> : null}
          {historyError ? <ErrorState message={historyError} onRetry={() => loadHistory(activePatient.id)} /> : null}
          {!historyLoading && !historyError ? (
            <div className="space-y-3">
              {consultationHistory.length > 0 ? (
                consultationHistory.map((h) => {
                  const createdDate = h.created_at
                    ? new Date(h.created_at).toLocaleDateString("fr-FR")
                    : "—";
                  return (
                    <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-app)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center text-sm font-bold shrink-0">
                        {createdDate.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-heading)]">
                          {h.title || "Consultation"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          {statusLabel(h.status)}
                          {h.transmission_id ? ` · ${h.transmission_id}` : ` · TX: ${h.transmission_status || "pending"}`}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{createdDate}</span>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="Aucun historique"
                  message="Aucune consultation pour ce patient pour l'instant."
                />
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="luxury-card p-6">
            <h3 className="text-lg font-bold mb-4">Métadonnées dossier</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Créé le</span>
                <span className="font-semibold text-[var(--text-heading)]">{createdLabel}</span>
              </div>
              <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Identifiant</span>
                <span className="font-mono text-xs text-[var(--text-heading)]">{activePatient.id.slice(0, 8)}…</span>
              </div>
              <div className="bg-[var(--bg-app)] rounded-lg p-3 flex justify-between gap-3">
                <span className="text-[var(--text-muted)]">Consultations</span>
                <span className="font-semibold text-[var(--text-heading)]">{consultationHistory.length}</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-4">
              Seules les informations présentes dans le modèle patient sont affichées. Aucune donnée clinique inventée.
            </p>
          </div>

          <div className="luxury-card p-6 bg-gradient-to-br from-[var(--warning-bg)] to-white border-[var(--warning)]/30">
            <h3 className="text-lg font-bold text-[var(--warning)] mb-2">Attention</h3>
            <p className="text-sm text-[var(--text-body)]">
              Vérifiez l'identité du patient avant de démarrer une consultation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
