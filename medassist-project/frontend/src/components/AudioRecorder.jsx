import { useState, useRef } from "react";
import { sendAudioForTranscription } from "../services/api";

export default function AudioRecorder({ onTranscription, disabled = false, onStatusChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lastBlobRef = useRef(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef(null);

  const emitStatus = (status) => {
    if (onStatusChange) onStatusChange(status);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopTracks = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.stream) {
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    if (disabled) {
      setError("Dictée indisponible hors-ligne.");
      return;
    }
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        clearTimer();
        stopTracks();
        if (cancelledRef.current) {
          emitStatus("cancelled");
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        lastBlobRef.current = audioBlob;
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscription("");
      setError("");
      setDuration(0);
      emitStatus("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Erreur microphone:", err.name || "MediaError");
      setError("Veuillez autoriser l'accès à votre microphone.");
      emitStatus("error");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    cancelledRef.current = false;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    emitStatus("uploading");
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      stopTracks();
    }
    setIsRecording(false);
    setIsUploading(false);
    setError("");
    emitStatus("cancelled");
  };

  const sendAudioToBackend = async (audioBlob) => {
    setIsUploading(true);
    setError("");
    emitStatus("transcribing");
    try {
      const text = await sendAudioForTranscription(audioBlob);
      if (!text) throw new Error("Transcription vide renvoyée par le serveur");
      setTranscription(text);
      if (onTranscription) onTranscription(text);
      emitStatus("transcribed");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Erreur lors de l'envoi audio");
      setError(err.message || "Échec de la transcription");
      emitStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  const retryTranscription = async () => {
    if (!lastBlobRef.current) {
      setError("Aucun enregistrement à réessayer. Relancez la dictée.");
      return;
    }
    await sendAudioToBackend(lastBlobRef.current);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const badgeLabel = isRecording
    ? "● Enregistrement"
    : isUploading
      ? "Transcription…"
      : error
        ? "Erreur"
        : "Prêt";

  return (
    <div className="luxury-card p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="section-label mb-1">Enregistrement Vocal</div>
          <h2 className="text-xl font-bold">Dictée médicale</h2>
        </div>
        <span className={`lux-badge ${isRecording ? "badge-red animate-pulse" : error ? "badge-red" : isUploading ? "badge-amber" : "badge-green"}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="flex flex-col items-center py-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading || disabled}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 cursor-pointer shadow-xl disabled:opacity-50
            ${isRecording ? "bg-gradient-to-br from-red-500 to-red-600 animate-pulse-ring" : "bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)]"}`}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        <div className="mt-4 text-sm font-semibold text-[var(--text-heading)]">
          {isRecording
            ? "Dictée en cours… Cliquez pour arrêter"
            : isUploading
              ? "Envoi audio et transcription en cours…"
              : "Cliquez pour commencer la dictée"}
        </div>
        {isRecording && (
          <div className="mt-2 font-mono text-2xl font-bold text-[var(--danger)]">{formatTime(duration)}</div>
        )}
        <div className="mt-4 flex gap-2">
          {isRecording ? (
            <button type="button" onClick={cancelRecording} className="btn-outline text-xs">
              Annuler
            </button>
          ) : null}
          {error && lastBlobRef.current ? (
            <button type="button" onClick={retryTranscription} disabled={isUploading || disabled} className="btn-outline text-xs disabled:opacity-50">
              Réessayer la transcription
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Aperçu STT</label>
          {transcription ? (
            <button onClick={() => navigator.clipboard.writeText(transcription)} className="text-xs text-[var(--gold-dark)] hover:underline cursor-pointer">Copier</button>
          ) : null}
        </div>
        <div className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-5 min-h-[100px] text-sm text-[var(--text-body)] leading-relaxed">
          {error ? (
            <span className="text-[var(--danger)]">{error}</span>
          ) : transcription ? (
            transcription
          ) : (
            <span className="text-[#9CA3AF]">La transcription serveur apparaîtra ici…</span>
          )}
          {isRecording && <span className="inline-block w-2 h-4 bg-[var(--danger)] ml-1 animate-pulse align-middle" />}
        </div>
      </div>
    </div>
  );
}
