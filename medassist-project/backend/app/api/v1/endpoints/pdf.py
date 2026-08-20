import logging
import os
import tempfile
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.core.access import ensure_consultation_access
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.consultation import Consultation
from app.models.user import User
from app.services.pdf_service import pdf_service

logger = logging.getLogger(__name__)
router = APIRouter()


class PDFRequest(BaseModel):
    consultation_id: str = Field(min_length=1)


def _cleanup_temp_file(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        logger.warning("Failed to remove temporary PDF file")


@router.post("/generate")
def generate_pdf(
    request: PDFRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consultation = (
        db.query(Consultation)
        .options(joinedload(Consultation.patient))
        .filter(Consultation.id == request.consultation_id)
        .first()
    )
    ensure_consultation_access(consultation, current_user)

    if consultation.validation_status != "validated" and consultation.status not in (
        "validated",
        "transmitting",
        "transmitted",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consultation doit être validée avant génération du PDF officiel",
        )

    consultation_data = pdf_service.build_pdf_payload(consultation, consultation.patient)

    fd, output_path = tempfile.mkstemp(prefix="medassist_pdf_", suffix=".pdf")
    os.close(fd)

    try:
        pdf_service.generate_consultation_pdf(consultation_data, output_path)
        consultation.pdf_status = "generated"
        consultation.updated_at = datetime.utcnow()
        db.commit()
        background_tasks.add_task(_cleanup_temp_file, output_path)
        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename=f"Consultation_{consultation.id}.pdf",
        )
    except Exception:
        db.rollback()
        consultation.pdf_status = "failed"
        consultation.updated_at = datetime.utcnow()
        try:
            db.commit()
        except Exception:
            db.rollback()
        logger.exception("PDF generation failed for consultation_id=%s", consultation.id)
        _cleanup_temp_file(output_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération du PDF",
        )
