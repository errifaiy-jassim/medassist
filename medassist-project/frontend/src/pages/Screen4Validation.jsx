import React from "react";
import { sendConsultationToSIH, generateConsultationPDF } from "../services/api";

const demographie = [
  { label: "Âge", value: "42 ans" },
  { label: "Sexe", value: "Féminin" },
  { label: "Groupe Sanguin", value: "A+" },
  { label: "Poids", value: "68 kg" },
  { label: "Taille", value: "165 cm" },
  { label: "Antécédents", value: "HTA, Diabète type 2" },
];

const diagnostics = [
  { label: "Hypertension artérielle", code: "I10", area: "CIM-10" },
  { label: "Diabète type 2 déséquilibré", code: "E11", area: "CIM-10" },
];

const traitements = [
  { label: "Metformine 850mg", detail: "2 comprimés par jour", code: "GMR-MET-850" },
  { label: "Amlodipine 5mg", detail: "1 comprimé le matin", code: "GMR-AML-5" },
];

const examens = [
  { label: "Glycémie à jeun", code: "0552", area: "NABM" },
  { label: "Dosage HbA1c", code: "0596", area: "NABM" },
];

export default function Screen4Validation({ patient, consultationId, onTransmit }) {
  const handleTransmit = async () => {
    const result = await sendConsultationToSIH(consultationId);
    if (result.status === "success") {
      alert("Consultation transmise avec succès !");
      if (onTransmit) onTransmit();
    } else {
      alert("Erreur lors de la transmission.");
    }
  };

  const handleGeneratePDF = async () => {
    const pdfBlob = await generateConsultationPDF(consultationId);
    if (pdfBlob) {
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Consultation_${consultationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert("Erreur lors de la génération PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="section-label mb-2">Étape 3 — Validation</div>
          <h1 className="text-3xl lg:text-4xl font-bold">Validation Structurée de la Consultation</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-[var(--text-muted)] text-sm">Dossier généré par intelligence artificielle clinique</p>
          {patient && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm text-[var(--info)]">
              <span className="font-semibold">Patient :</span> {patient.fullName}
            </div>
          )}
        </div>
        <span className="lux-badge badge-amber w-fit">
          ⚠️ PROPOSITION IA EN ATTENTE DE VALIDATION MÉDICALE
        </span>
      </div>

      {/* Patient summary bar */}
      <div className="luxury-card p-5 flex flex-wrap items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)] text-white flex items-center justify-center font-bold text-lg">
          {patient ? patient.fullName.split(" ").map((word) => word[0]).join("").slice(0, 2) : "AH"}
        </div>
        <div>
          <div className="font-semibold text-[var(--text-heading)]">{patient ? patient.fullName : "Amira Hadj"}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {patient ? `Dossier N° ${patient.dossierNumber || "-"} · NIR ${patient.nir || "-"}` : "Dossier N° DS-4471 · NIR 290 128 44 782 005"}
          </div>
        </div>
        <div className="ml-auto flex gap-4">
          <div className="text-center">
            <div className="text-sm font-bold text-[var(--text-heading)]">12</div>
            <div className="text-[11px] text-[var(--text-muted)]">Consultations</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-[var(--text-heading)]">A+</div>
            <div className="text-[11px] text-[var(--text-muted)]">Groupe</div>
          </div>
        </div>
      </div>

      {/* Grid of sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Démographie */}
        <div className="luxury-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary-navy)] text-[var(--gold-light)] flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="text-lg font-bold">Informations Démographiques</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {demographie.map((d) => (
              <div key={d.label} className="bg-[var(--bg-app)] rounded-lg p-3">
                <div className="text-[11px] text-[var(--text-muted)]">{d.label}</div>
                <div className="text-sm font-semibold text-[var(--text-heading)] mt-0.5">{d.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Diagnostics + 3. Traitement */}
        <div className="space-y-6">
          <div className="luxury-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--gold)] text-white flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="text-lg font-bold">Diagnostics Proposés</h3>
            </div>
            <div className="space-y-3">
              {diagnostics.map((d) => (
                <div key={d.code} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-heading)]">{d.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{d.area}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="lux-badge badge-blue">{d.code}</span>
                    <span className="lux-badge badge-green">Confirmé</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="luxury-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary-navy)] text-[var(--gold-light)] flex items-center justify-center text-sm font-bold">3</div>
              <h3 className="text-lg font-bold">Traitement & Prescriptions</h3>
            </div>
            <div className="space-y-3">
              {traitements.map((t) => (
                <div key={t.code} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-heading)]">{t.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{t.detail}</div>
                  </div>
                  <span className="lux-badge badge-blue">{t.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Examens */}
        <div className="luxury-card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[var(--gold)] text-white flex items-center justify-center text-sm font-bold">4</div>
            <h3 className="text-lg font-bold">Examens Biologiques</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {examens.map((e) => (
              <div key={e.code} className="flex items-center justify-between bg-[var(--bg-app)] rounded-lg p-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-heading)]">{e.label}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{e.area}</div>
                </div>
                <span className="lux-badge badge-blue">{e.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
        <button onClick={handleGeneratePDF} className="btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          Générer PDF
        </button>
        <button onClick={handleTransmit} className="btn-gold text-base px-6 py-3">
          Valider & Transmettre au SIH
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </div>
    </div>
  );
}
