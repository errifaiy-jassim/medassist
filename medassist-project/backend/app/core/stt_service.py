import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class STTService:
    def __init__(self):
        # Local Faster-Whisper — model size from backend env WHISPER_MODEL only.
        self.model_size = settings.WHISPER_MODEL
        self.model = None

    def load_model(self):
        if self.model is None:
            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise RuntimeError(
                    "faster-whisper n'est pas installé. "
                    "Installez les dépendances STT pour activer la transcription."
                ) from exc
            logger.info("Loading Whisper model: %s", self.model_size)
            self.model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8",
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

