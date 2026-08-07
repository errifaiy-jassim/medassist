from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.stt_service import stt_service
import os
import tempfile

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # 1. Lire les informations du fichier reçu
    print(f"Fichier reçu : {file.filename} (Type: {file.content_type})")

    # 2. Sauvegarder le fichier audio temporairement
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # 3. Transcrire via Faster-Whisper (IA)
        text = stt_service.transcribe_audio(tmp_path)
        return {
            "status": "success",
            "message": "Transcription effectuée avec succès.",
            "text": text,
        }
    except Exception as e:
        print(f"Erreur STT : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la transcription : {str(e)}")
    finally:
        # 4. Nettoyer le fichier temporaire
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
