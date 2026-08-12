import React, { useState, useEffect } from "react";
import AudioRecorder from "../components/AudioRecorder";
import { fetchPatients } from "../services/api";

export default function Screen3Dictation({ patient: initialPatient, onAnalyze }) {
  const [transcription, setTranscription] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [patients, setPatients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      const data = await fetchPatients();
      setPatients(data);
      if (!initialPatient && data.length > 0) {
        setSelectedPatient(data[0]);
      }
    };
    loadPatients();
  }, [initialPatient]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="section-label mb-2">Étape 2 — Dictée</div>
        <h1 className="text-3xl lg:text-4xl font-bold">Nouvelle Dictée Médicale</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 text-[var(--text-muted)] text-sm">
          Enregistrez vos notes vocales pour générer la consultation clinique structurée.
        </p>
        <div className="mt-3 relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm text-[var(--info)] cursor-pointer" onClick={() => setShowDropdown(!showDropdown)}>
            <span className="font-semibold">Patient :</span> {selectedPatient ? selectedPatient.full_name || selectedPatient.fullName : "Sélectionner un patient..."}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
          {showDropdown && (
            <div className="absolute z-10 mt-2 w-64 bg-white border border-[var(--border-soft)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {patients.map(p => (
                <div key={p.id} className="px-4 py-2 hover:bg-[var(--bg-app)] cursor-pointer" onClick={() => { setSelectedPatient(p); setShowDropdown(false); }}>
                  {p.full_name || p.fullName}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions hint */}
      <div className="flex items-start gap-3 bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-xl p-4 text-sm text-[var(--info)]">
        <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          <strong className="font-semibold">Conseil :</strong> Dictéez le motif de consultation, les symptômes, le diagnostic et le traitement. L'IA générera automatiquement la codification CIM-10, GMR et NABM.
        </p>
      </div>

      {/* Recorder */}
      <AudioRecorder onTranscription={setTranscription} />

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <button className="btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          Vider la dictée
        </button>
        <button
          onClick={() => onAnalyze && onAnalyze(transcription, selectedPatient)}
          disabled={!transcription || !selectedPatient}
          className={`btn-gold text-base px-6 py-3 ${(!transcription || !selectedPatient) ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          Analyser & Générer
        </button>
      </div>
    </div>
  );
}
