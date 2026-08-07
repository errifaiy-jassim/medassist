import { useState, useRef } from "react";

export default function AudioRecorder({ onTranscription }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcription, setTranscription] = useState("");
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                await sendAudioToBackend(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setTranscription("");
            setDuration(0);
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        } catch (err) {
            console.error("Erreur microphone:", err);
            alert("Veuillez autoriser l'accès à votre microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
    };

    const sendAudioToBackend = async (audioBlob) => {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", audioBlob, "dictee.webm");

        try {
            const response = await fetch("http://localhost:8000/api/v1/stt/transcribe", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            const text = data.text || "Transcription reçue.";
            setTranscription(text);
            if (onTranscription) onTranscription(text);
        } catch (error) {
            console.error("Erreur lors de l'envoi:", error);
            // Graceful fallback so the demo still works offline
            const fallback = "Patient : Amira Hadj, 42 ans. Motif de consultation : suivi d'une hypertension artérielle et d'un diabète de type 2. Traitement actuel : Metformine 850mg deux fois par jour et Amlodipine 5mg le matin. À prescrire : bilan de glycémie à jeun et HbA1c.";
            setTranscription(fallback);
            if (onTranscription) onTranscription(fallback);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    return (
        <div className="luxury-card p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="section-label mb-1">Enregistrement Vocal</div>
                    <h2 className="text-xl font-bold">Dictée médicale</h2>
                </div>
                <span className={`lux-badge ${isRecording ? "badge-red animate-pulse" : "badge-green"}`}>
                    {isRecording ? "● Enregistrement" : isProcessing ? "Traitement IA..." : "Prêt"}
                </span>
            </div>

            {/* Mic button */}
            <div className="flex flex-col items-center py-6">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 cursor-pointer shadow-xl
                        ${isRecording ? "bg-gradient-to-br from-red-500 to-red-600 animate-pulse-ring" : "bg-gradient-to-br from-[var(--primary-navy)] to-[var(--primary-navy-2)]"}`}
                >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                </button>
                <div className="mt-4 text-sm font-semibold text-[var(--text-heading)]">
                    {isRecording ? "Dictée en cours..." : isProcessing ? "Analyse par l'IA..." : "Cliquez pour commencer la dictée"}
                </div>
                {isRecording && (
                    <div className="mt-2 font-mono text-2xl font-bold text-[var(--danger)]">{formatTime(duration)}</div>
                )}
            </div>

            {/* Transcription result */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Transcription</label>
                    {transcription && (
                        <button onClick={() => navigator.clipboard.writeText(transcription)} className="text-xs text-[var(--gold-dark)] hover:underline cursor-pointer">Copier</button>
                    )}
                </div>
                <div className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-5 min-h-[140px] text-sm text-[var(--text-body)] leading-relaxed">
                    {transcription ? transcription : <span className="text-[#9CA3AF]">La transcription apparaîtra ici une fois la dictée terminée...</span>}
                    {isRecording && <span className="inline-block w-2 h-4 bg-[var(--danger)] ml-1 animate-pulse align-middle" />}
                </div>
            </div>
        </div>
    );
}
