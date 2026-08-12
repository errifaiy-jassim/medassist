import React, { useState, useEffect } from "react";
import { createPatient, createConsultation, fetchPatientConsultations, fetchPatients, updatePatient } from "../services/api";

const createPatientState = (patient) => ({
  id: patient.id,
  fullName: patient.fullName,
  nir: patient.nir || "",
  age: patient.age || "",
  sex: patient.sex || "Féminin",
  bloodGroup: patient.bloodGroup || "A+",
  phone: patient.phone || "",
  email: patient.email || "",
  dossierNumber: patient.dossierNumber || "",
  historiques: patient.historiques || [],
  allergies: patient.allergies || [],
});

const initialPatients = [
  {
    id: 1,
    fullName: "Amira Hadj",
    nir: "290 128 44 782 005",
    age: "42 ans",
    sex: "Féminin",
    bloodGroup: "A+",
    phone: "+213 555 01 23 45",
    email: "amira.hadj@mail.com",
    dossierNumber: "DS-4471",
    historiques: [
      { date: "12/05/2024", motif: "Suivi HTA & diabète", medecin: "Dr. Errifaiy" },
      { date: "03/02/2024", motif: "Consultation cardiologie", medecin: "Dr. Errifaiy" },
      { date: "18/11/2023", motif: "Bilan biologique annuel", medecin: "Dr. Benali" },
    ],
    allergies: [
      { name: "Pénicilline", severity: "Sévère", color: "red" },
      { name: "Arachides", severity: "Modérée", color: "amber" },
    ],
  },
];

export default function ScreenPatientDetail({ onNewConsultation }) {
  const [patients, setPatients] = useState(initialPatients.map(createPatientState));
  const [activePatientId, setActivePatientId] = useState(initialPatients[0].id);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    nir: "",
    age: "",
    sex: "Féminin",
    bloodGroup: "A+",
    phone: "",
    email: "",
    dossierNumber: "",
  });

  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

  useEffect(() => {
    const loadPatients = async () => {
      const backendPatients = await fetchPatients();
      if (backendPatients?.length) {
        const normalizedPatients = backendPatients.map((patient) =>
          createPatientState({
            id: patient.id,
            fullName: patient.full_name || patient.fullName || "",
            nir: patient.nir || "",
            age: patient.age || "",
            sex: patient.gender || patient.sex || "Féminin",
            bloodGroup: patient.blood_group || patient.bloodGroup || "A+",
            phone: patient.phone || "",
            email: patient.email || "",
            dossierNumber: patient.dossier_number || patient.dossierNumber || "",
            historiques: patient.historiques || [],
            allergies: patient.allergies || [],
          })
        );
        setPatients(normalizedPatients);
        setActivePatientId((currentId) => (normalizedPatients.some((patient) => patient.id === currentId) ? currentId : normalizedPatients[0]?.id));
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!activePatient) return;
      setConsultationHistory([]);
      if (typeof activePatient.id !== "string") return;
      const history = await fetchPatientConsultations(activePatient.id);
      setConsultationHistory(history);
    };

    loadHistory();
  }, [activePatient?.id]);

  const info = [
    { label: "Nom complet", value: activePatient.fullName },
    { label: "NIR", value: activePatient.nir },
    { label: "Âge", value: activePatient.age },
    { label: "Sexe", value: activePatient.sex },
    { label: "Groupe sanguin", value: activePatient.bloodGroup },
    { label: "Téléphone", value: activePatient.phone },
    { label: "Email", value: activePatient.email },
    { label: "Dossier N°", value: activePatient.dossierNumber },
  ];

  const startCreate = () => {
    setIsEditing(false);
    setSubmitError("");
    setFormData({
      fullName: "",
      nir: "",
      age: "",
      sex: "Féminin",
      bloodGroup: "A+",
      phone: "",
      email: "",
      dossierNumber: "",
    });
    setShowForm(true);
  };

  const startEdit = () => {
    setIsEditing(true);
    setSubmitError("");
    setFormData({
      fullName: activePatient.fullName,
      nir: activePatient.nir,
      age: activePatient.age,
      sex: activePatient.sex,
      bloodGroup: activePatient.bloodGroup,
      phone: activePatient.phone,
      email: activePatient.email,
      dossierNumber: activePatient.dossierNumber,
    });
    setShowForm(true);
  };

  const handleConsultationStart = async () => {
    const consultationPayload = {
      patient_id: activePatient.id,
      title: "Nouvelle consultation",
      transcription: "Consultation démarrée depuis l’interface patient",
      structured_data: { source: "patient-screen" },
      status: "started",
    };

    const createdConsultation = await createConsultation(consultationPayload);
    if (createdConsultation) {
      setConsultationHistory((prev) => [createdConsultation, ...prev]);
    }

    onNewConsultation(activePatient);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.fullName.trim()) return;

    const payload = {
      full_name: formData.fullName,
      nir: formData.nir || null,
      age: formData.age || null,
      gender: formData.sex || null,
      blood_group: formData.bloodGroup || null,
      phone: formData.phone || null,
      email: formData.email || null,
      dossier_number: formData.dossierNumber || null,
    };

    const createdPatient = isEditing
      ? await updatePatient(activePatient.id, payload)
      : await createPatient(payload);

    if (createdPatient) {
      setSubmitError("");
      const patientRecord = createPatientState({
        id: createdPatient.id,
        fullName: createdPatient.full_name,
        nir: createdPatient.nir || "",
        age: createdPatient.age || "",
        sex: createdPatient.gender || "Féminin",
        bloodGroup: createdPatient.blood_group || "A+",
        phone: createdPatient.phone || "",
        email: createdPatient.email || "",
        dossierNumber: createdPatient.dossier_number || "",
        historiques: [],
        allergies: [],
      });

      if (isEditing) {
        setPatients((prev) => prev.map((patient) => patient.id === activePatient.id ? { ...patient, ...patientRecord } : patient));
        setActivePatientId(activePatient.id);
      } else {
        setPatients((prev) => [patientRecord, ...prev]);
        setActivePatientId(patientRecord.id);
      }

      setFormData({
        fullName: "",
        nir: "",
        age: "",
        sex: "Féminin",
        bloodGroup: "A+",
        phone: "",
        email: "",
        dossierNumber: "",
      });
      setShowForm(false);
      setIsEditing(false);
    } else {
      setSubmitError("L’enregistrement du patient a échoué. Vérifiez la connexion au serveur.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Dossier Patient</div>
          <h1 className="text-3xl lg:text-4xl font-bold">{activePatient.fullName}</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">Dossier médical complet · {activePatient.nir}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={startCreate} className="btn-outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Ajouter un patient
          </button>
          <button onClick={startEdit} className="btn-outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Modifier les infos
          </button>
          <button onClick={handleConsultationStart} className="btn-gold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            Démarrer une Consultation
          </button>
        </div>
      </div>

      <div className="luxury-card p-4">
        <div className="text-sm font-semibold text-[var(--text-heading)] mb-3">Patients disponibles</div>
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
      </div>

      {showForm && (
        <div className="luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{isEditing ? "Modifier les informations" : "Nouveau patient"}</h3>
            <button onClick={() => { setShowForm(false); setIsEditing(false); }} className="text-sm text-[var(--text-muted)]">Fermer</button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="Nom complet" />
            <input value={formData.nir} onChange={(e) => setFormData({ ...formData, nir: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="NIR" />
            <input value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="Âge" />
            <select value={formData.sex} onChange={(e) => setFormData({ ...formData, sex: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2">
              <option>Féminin</option>
              <option>Masculin</option>
              <option>Autre</option>
            </select>
            <input value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="Groupe sanguin" />
            <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="Téléphone" />
            <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="Email" />
            <input value={formData.dossierNumber} onChange={(e) => setFormData({ ...formData, dossierNumber: e.target.value })} className="rounded-lg border border-[var(--border-soft)] px-3 py-2" placeholder="Dossier N°" />
            <div className="md:col-span-2 flex flex-col items-end gap-2">
              {submitError ? <div className="text-sm text-red-500">{submitError}</div> : null}
              <button type="submit" className="btn-gold">{isEditing ? "Enregistrer les modifications" : "Enregistrer le patient"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Profile banner */}
      <div className="luxury-card p-6 flex items-center gap-5 bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] flex items-center justify-center text-2xl font-bold text-[var(--primary-navy)]">
          {activePatient.fullName.split(" ").map((word) => word[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold">{activePatient.fullName}</div>
          <div className="text-sm text-white/60">{activePatient.sex} · {activePatient.age} · Groupe {activePatient.bloodGroup}</div>
        </div>
        <div className="hidden sm:flex gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--gold-light)]">{consultationHistory.length}</div>
            <div className="text-[11px] text-white/50">Consultations</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[var(--gold-light)]">{activePatient.allergies.length}</div>
            <div className="text-[11px] text-white/50">Allergies</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
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

          <h3 className="text-lg font-bold mt-8 mb-4">Historique des Consultations</h3>
          <div className="space-y-3">
            {consultationHistory.length > 0 ? (
              consultationHistory.map((h, i) => {
                const createdDate = h.created_at ? new Date(h.created_at).toLocaleDateString("fr-FR") : "—";
                return (
                  <div key={h.id || i} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-app)]">
                    <div className="w-10 h-10 rounded-full bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center text-sm font-bold shrink-0">{createdDate.slice(0, 2)}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[var(--text-heading)]">{h.title || "Consultation"}</div>
                      <div className="text-xs text-[var(--text-muted)]">{h.status || "En cours"}</div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{createdDate}</span>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-soft)] p-4 text-sm text-[var(--text-muted)]">
                Aucun historique pour ce patient pour l’instant.
              </div>
            )}
          </div>
        </div>

        {/* Allergies */}
        <div className="space-y-6">
          <div className="luxury-card p-6">
            <h3 className="text-lg font-bold mb-4">Allergies</h3>
            <div className="space-y-2">
              {activePatient.allergies.length > 0 ? (
                activePatient.allergies.map((a) => (
                  <div key={a.name} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                    <span className="text-sm font-semibold text-[var(--text-heading)]">{a.name}</span>
                    <span className={`lux-badge ${a.color === "red" ? "badge-red" : "badge-amber"}`}>{a.severity}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-[var(--bg-app)] p-3 text-sm text-[var(--text-muted)]">Aucune allergie renseignée.</div>
              )}
            </div>
          </div>

          <div className="luxury-card p-6 bg-gradient-to-br from-[var(--warning-bg)] to-white border-[var(--warning)]/30">
            <h3 className="text-lg font-bold text-[var(--warning)] mb-2">⚠️ Attention</h3>
            <p className="text-sm text-[var(--text-body)]">
              Vérifier les allergies et les traitements avant de démarrer une consultation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
