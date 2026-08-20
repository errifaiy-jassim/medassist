import logging
import os
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.stt_service import stt_service
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_SUFFIXES = {".webm", ".wav", ".mp3", ".ogg", ".m4a", ".mp4", ".mpeg"}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in settings.stt_allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Type de fichier audio non autorisé",
        )

    suffix = os.path.splitext(file.filename or "")[1].lower() or ".webm"
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Extension audio non autorisée",
        )

    max_bytes = settings.STT_MAX_UPLOAD_BYTES
    chunk_size = 1024 * 1024
    total = 0
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Fichier audio trop volumineux (max {max_bytes // (1024 * 1024)} Mo)",
                    )
                tmp.write(chunk)

        if total == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fichier audio vide",
            )

        text = stt_service.transcribe_audio(tmp_path)
        # Never return or log raw audio metadata beyond size class
        logger.info("STT transcription completed (bytes=%s)", total)
        return {
            "status": "success",
            "message": "Transcription effectuée avec succès.",
            "text": text,
            "transcription": text,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("STT transcription failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la transcription audio",
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
