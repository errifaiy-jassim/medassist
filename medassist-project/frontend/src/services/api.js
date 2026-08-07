const API_BASE_URL = "http://localhost:8000/api/v1";

// 1. Récupérer toutes les consultations
export async function fetchConsultations() {
  try {
    const response = await fetch(`${API_BASE_URL}/consultations`);
    if (!response.ok) throw new Error("Erreur lors de la récupération des consultations");
    return await response.json();
  } catch (error) {
    console.error("API Error (fetchConsultations):", error);
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

// 3. Envoyer la consultation au SIH
export async function transmitConsultationToSIH(consultationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/consultations/${consultationId}/transmit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error) {
    console.error("API Error (transmitConsultationToSIH):", error);
    return { success: false };
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