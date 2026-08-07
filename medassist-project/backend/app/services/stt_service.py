import os
import tempfile
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
_model_instance = None

def get_whisper_model():
    """
    Charge le modèle Faster-Whisper de façon paresseuse (Lazy Loading)
    afin d'éviter d'alourdir le démarrage d'Uvicorn.
    """
    global _model_instance
    if _model_instance is None:
        print(f"Chargement du modèle Faster-Whisper ({MODEL_SIZE})...")
        _model_instance = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return _model_instance

def transcribe_audio_file(file_bytes: bytes, filename: str) -> str:
    suffix = os.path.splitext(filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(file_bytes)
        tmp_file_path = tmp_file.name

    try:
        model = get_whisper_model()
        segments, info = model.transcribe(
            tmp_file_path, 
            beam_size=5, 
            language="fr"
        )
        return " ".join([segment.text for segment in segments]).strip()

    finally:
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)