import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.access import ensure_consultation_access
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.consultation import Consultation
from app.models.user import User
from app.services.sih_adapter import SIHTransmissionError, sih_adapter

logger = logging.getLogger(__name__)
router = APIRouter()


class TransmissionRequest(BaseModel):
    consultation_id: str = Field(min_length=1)


def _build_sih_payload(consultation: Consultation) -> dict:
    patient = consultation.patient
    return {
        "consultation_id": consultation.id,
        "patient_id": consultation.patient_id,
        "patient_name": patient.full_name if patient else None,
        "status": consultation.status,
        "validation_status": consultation.validation_status,
        "validated_at": consultation.validated_at.isoformat() if consultation.validated_at else None,
        "transcription": consultation.transcription,
        "structured_data": consultation.structured_data,
        "coding_results": consultation.coding_results,
    }


@router.post("/send")
def send_to_sih(
    request: TransmissionRequest,
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

    if consultation.validation_status != "validated":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consultation doit être validée avant transmission au SIH",
        )

    # Idempotent success — do not retransmit an already successful send.
    if (
        consultation.transmission_status == "sent"
        and consultation.status == "transmitted"
        and consultation.transmission_id
    ):
        ts = consultation.transmitted_at or datetime.utcnow()
        return {
            "status": "success",
            "already_transmitted": True,
            "message": "Consultation déjà transmise au SIH. Aucune nouvelle transmission effectuée.",
            "consultation_id": consultation.id,
            "transmission_id": consultation.transmission_id,
            "timestamp": ts.replace(tzinfo=timezone.utc).isoformat()
            if ts.tzinfo is None
            else ts.isoformat(),
            "consultation_status": consultation.status,
            "transmission_status": consultation.transmission_status,
            "adapter": getattr(sih_adapter, "name", "unknown"),
        }

    consultation.status = "transmitting"
    consultation.transmission_status = "pending"
    consultation.updated_at = datetime.utcnow()
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to mark consultation as transmitting")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du démarrage de la transmission",
        )

    try:
        result = sih_adapter.send_consultation(_build_sih_payload(consultation))
        if not result.success:
            raise SIHTransmissionError(result.message or "Échec de transmission SIH")
    except SIHTransmissionError as exc:
        consultation.status = "failed"
        consultation.transmission_status = "failed"
        consultation.updated_at = datetime.utcnow()
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            logger.exception("Failed to persist transmission failure")
        logger.exception("SIH transmission failed for %s", consultation.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc) or "Échec de la transmission vers le SIH",
        ) from exc
    except Exception as exc:
        consultation.status = "failed"
        consultation.transmission_status = "failed"
        consultation.updated_at = datetime.utcnow()
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
        logger.exception("Unexpected SIH adapter error for %s", consultation.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erreur inattendue lors de la transmission SIH",
        ) from exc

    now = result.timestamp
    consultation.transmission_status = "sent"
    consultation.transmission_id = result.transmission_id
    consultation.transmitted_at = now.replace(tzinfo=None) if now.tzinfo else now
    consultation.status = "transmitted"
    consultation.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(consultation)
    except SQLAlchemyError:
        db.rollback()
        consultation.status = "failed"
        consultation.transmission_status = "failed"
        consultation.updated_at = datetime.utcnow()
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
        logger.exception("Failed to persist successful transmission for %s", consultation.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="La transmission SIH a réussi mais l'enregistrement local a échoué",
        )

    logger.info(
        "Consultation %s transmitted (%s) via adapter=%s",
        consultation.id,
        consultation.transmission_id,
        result.adapter,
    )
    return {
        "status": "success",
        "already_transmitted": False,
        "message": result.message,
        "consultation_id": consultation.id,
        "transmission_id": consultation.transmission_id,
        "timestamp": now.isoformat(),
        "consultation_status": consultation.status,
        "transmission_status": consultation.transmission_status,
        "adapter": result.adapter,
    }
