const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
/**
 * Auth session storage.
 * JWT in localStorage is XSS-sensitive; keep tokens short-lived (server TTL)
 * and never store API keys / DB credentials in the browser.
 */
const TOKEN_KEY = "medassist_access_token";
const USER_KEY = "medassist_user";

export class ApiError extends Error {
  constructor(message, { status = 0, details = null, offline = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.offline = offline;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    // Persist only non-sensitive profile fields needed by the UI.
    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      specialty: user.specialty,
      role: user.role,
      inpe: user.inpe,
      rpps_licence: user.rpps_licence,
      is_active: user.is_active,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.detail || JSON.stringify(item))
      .join(" · ");
  }
  if (typeof detail === "object" && detail.message) return detail.message;
  return "Une erreur est survenue";
}

async function parseErrorMessage(response, fallback) {
  try {
    const payload = await response.json();
    return formatDetail(payload.detail) || formatDetail(payload.message) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Central request helper — all authenticated API calls go through here.
 */
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    expectJson = true,
    fallbackError = "Erreur de communication avec le serveur",
  } = options;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("Connexion réseau indisponible. Mode hors-ligne actif.", {
      status: 0,
      offline: true,
    });
  }

  const finalHeaders = auth ? authHeaders(headers) : { ...headers };
  let requestBody = body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: requestBody,
    });
  } catch {
    throw new ApiError("Impossible de joindre le serveur MedAssist.", {
      status: 0,
      offline: true,
    });
  }

  if (response.status === 401 && auth) {
    clearAuthSession();
    throw new ApiError("Session expirée. Veuillez vous reconnecter.", { status: 401 });
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, fallbackError);
    throw new ApiError(message, { status: response.status });
  }

  if (response.status === 204) return null;
  if (!expectJson) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response;
  return response.json();
}

export async function login(username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    auth: false,
    body: { username, password },
    fallbackError: "Identifiants invalides",
  });
  setAuthSession(data.access_token, data.user);
  return data;
}

export async function logout() {
  try {
    if (getAccessToken()) {
      await apiRequest("/auth/logout", { method: "POST", expectJson: true });
    }
  } catch {
    // Client-side clear remains authoritative for JWT sessions.
  } finally {
    clearAuthSession();
  }
}

export async function fetchCurrentUser() {
  const user = await apiRequest("/auth/me", { fallbackError: "Session invalide" });
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function fetchHealth() {
  return apiRequest("/health", { auth: false, fallbackError: "Service indisponible" });
}

export async function fetchDashboardStats() {
  return apiRequest("/dashboard/stats", {
    fallbackError: "Impossible de charger le tableau de bord",
  });
}

export async function fetchAllConsultations() {
  return apiRequest("/consultations/", {
    fallbackError: "Erreur lors de la récupération des consultations",
  });
}

export async function searchPatients(query) {
  return apiRequest(`/patients/search?q=${encodeURIComponent(query)}`, {
    fallbackError: "Erreur lors de la recherche du patient",
  });
}

export async function fetchPatients() {
  return apiRequest("/patients/", {
    fallbackError: "Erreur lors de la récupération des patients",
  });
}

export async function fetchPatient(patientId) {
  return apiRequest(`/patients/${patientId}`, {
    fallbackError: "Patient introuvable",
  });
}

export async function createPatient(patientData) {
  return apiRequest("/patients/", {
    method: "POST",
    body: patientData,
    fallbackError: "Erreur lors de la création du patient",
  });
}

export async function updatePatient(patientId, patientData) {
  return apiRequest(`/patients/${patientId}`, {
    method: "PUT",
    body: patientData,
    fallbackError: "Erreur lors de la mise à jour du patient",
  });
}

export async function deletePatient(patientId) {
  return apiRequest(`/patients/${patientId}`, {
    method: "DELETE",
    fallbackError: "Erreur lors de la suppression du patient",
  });
}

export async function sendConsultationToSIH(consultationId) {
  return apiRequest("/transmission/send", {
    method: "POST",
    body: { consultation_id: consultationId },
    fallbackError: "Erreur lors de la transmission SIH",
  });
}

export async function generateConsultationPDF(consultationId) {
  const response = await apiRequest("/pdf/generate", {
    method: "POST",
    body: { consultation_id: consultationId },
    expectJson: false,
    fallbackError: "Erreur lors de la génération PDF",
  });
  return response.blob();
}

export async function analyzeConsultationText(text, consultationId = null) {
  const body = { text };
  if (consultationId) body.consultation_id = consultationId;
  const data = await apiRequest("/consultations/extract-entities", {
    method: "POST",
    body,
    fallbackError: "Erreur lors de l'analyse LLM",
  });
  return data;
}

export async function processMedicalCoding({
  diagnostics = [],
  prescriptions = [],
  biology = [],
  consultationId = null,
} = {}) {
  const body = { diagnostics, prescriptions, biology };
  if (consultationId) body.consultation_id = consultationId;
  return apiRequest("/coding/process", {
    method: "POST",
    body,
    fallbackError: "Erreur lors de la codification médicale",
  });
}

export async function validateConsultation(consultationId) {
  return apiRequest(`/consultations/${consultationId}/validate`, {
    method: "POST",
    fallbackError: "Erreur lors de la validation de la consultation",
  });
}

export async function fetchConsultation(consultationId) {
  return apiRequest(`/consultations/${consultationId}`, {
    fallbackError: "Consultation introuvable",
  });
}

export async function sendAudioForTranscription(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  const data = await apiRequest("/stt/transcribe", {
    method: "POST",
    body: formData,
    fallbackError: "Erreur lors de la transcription STT",
  });
  return data.transcription || data.text || null;
}

export async function createConsultation(consultationData) {
  return apiRequest("/consultations/", {
    method: "POST",
    body: consultationData,
    fallbackError: "Erreur lors de la création de la consultation",
  });
}

export async function updateConsultation(consultationId, consultationData) {
  return apiRequest(`/consultations/${consultationId}`, {
    method: "PATCH",
    body: consultationData,
    fallbackError: "Erreur lors de la mise à jour de la consultation",
  });
}

export async function fetchPatientConsultations(patientId) {
  return apiRequest(`/consultations/patient/${patientId}`, {
    fallbackError: "Erreur lors de la récupération des consultations",
  });
}

export async function fetchBackendSettings() {
  return apiRequest("/settings/", {
    fallbackError: "Impossible de charger les paramètres",
  });
}
