import os
from faster_whisper import WhisperModel

class STTService:
    def __init__(self):
        # Modèle Whisper léger pour un fonctionnement rapide en dev local (CPU)
        self.model_size = os.getenv("WHISPER_MODEL", "small")
        self.model = None

    def load_model(self):
        if self.model is None:
            self.model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8"
            )

    def transcribe_audio(self, audio_file_path: str) -> str:
        self.load_model()
        # Prise en charge des langues Français / Arabe comme spécifié dans le document
        segments, info = self.model.transcribe(
            audio_file_path,
            beam_size=5,
            language="fr"
        )

        full_text = " ".join([segment.text for segment in segments])
        return full_text.strip()

stt_service = STTService()

