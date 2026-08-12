const API_BASE_URL = "http://localhost:8000/api/v1";

// 1. Récupérer toutes les consultations
export async function fetchAllConsultations() {
  try {
    const response = await fetch(`${API_BASE_URL}/consultations/`);
    if (!response.ok) throw new Error("Erreur lors de la récupération des consultations");
    return await response.json();
  } catch (error) {
    console.error("API Error (fetchAllConsultations):", error);
    return [];
  }
}

// 2. Rechercher un patient
export async function searchPatients(query) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("Erreur lors de la recherche du patient");
    return await response.json();
  } catch (error) {
    console.error("API Error (searchPatients):", error);
    return [];
  }
}

export async function fetchPatients() {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/`);
    if (!response.ok) throw new Error("Erreur lors de la récupération des patients");
    return await response.json();
  } catch (error) {
    console.error("API Error (fetchPatients):", error);
    return [];
  }
}

// 2b. Créer un patient
export async function createPatient(patientData) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) throw new Error("Erreur lors de la création du patient");
    return await response.json();
  } catch (error) {
    console.error("API Error (createPatient):", error);
    return null;
  }
}

export async function updatePatient(patientId, patientData) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) throw new Error("Erreur lors de la mise à jour du patient");
    return await response.json();
  } catch (error) {
    console.error("API Error (updatePatient):", error);
    return null;
  }
}

// Transmission SIH
export async function sendConsultationToSIH(consultationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/transmission/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: consultationId }),
    });

    if (!response.ok) throw new Error("Erreur lors de la transmission SIH");
    return await response.json();
  } catch (error) {
    console.error("API Error (sendConsultationToSIH):", error);
    return { status: "error" };
  }
}

// Génération PDF
export async function generateConsultationPDF(consultationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/pdf/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: consultationId }),
    });

    if (!response.ok) throw new Error("Erreur lors de la génération PDF");
    return await response.blob();
  } catch (error) {
    console.error("API Error (generateConsultationPDF):", error);
    return null;
  }
}

// 4. Analyser le texte avec le LLM Qwen
export async function analyzeConsultationText(text) {
  try {
    const response = await fetch(`${API_BASE_URL}/consultations/extract-entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("Erreur lors de l'analyse LLM");
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("API Error (analyzeConsultationText):", error);
    return null;
  }
}

// 5. Envoyer l'audio au moteur Faster-Whisper
export async function sendAudioForTranscription(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  try {
    const response = await fetch(`${API_BASE_URL}/stt/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Erreur lors de la transcription STT");

    const data = await response.json();
    return data.transcription;
  } catch (error) {
    console.error("API STT Error (sendAudioForTranscription):", error);
    return null;
  }
}

export async function createConsultation(consultationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/consultations/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consultationData),
    });

    if (!response.ok) throw new Error("Erreur lors de la création de la consultation");
    return await response.json();
  } catch (error) {
    console.error("API Error (createConsultation):", error);
    return null;
  }
}

export async function fetchPatientConsultations(patientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/consultations/patient/${patientId}`);
    if (!response.ok) throw new Error("Erreur lors de la récupération des consultations");
    return await response.json();
  } catch (error) {
    console.error("API Error (fetchPatientConsultations):", error);
    return [];
  }
}