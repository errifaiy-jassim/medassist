import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.access import (
    consultations_for_user,
    ensure_consultation_access,
    ensure_patient_access,
    patients_for_user,
)
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.llm_service import llm_service
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.user import User
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationListItem,
    ConsultationResponse,
    ConsultationUpdate,
    ExtractEntitiesRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _dumps_json(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def _to_response(consultation: Consultation) -> ConsultationResponse:
    payload = ConsultationResponse.model_validate(consultation)
    if consultation.patient is not None:
        payload.patient_name = consultation.patient.full_name
    return payload


def _to_list_item(consultation: Consultation) -> ConsultationListItem:
    coding = consultation.coding_results
    has_coding = bool(coding) and str(coding).strip() not in ("", "{}", "null")
    has_transcription = bool(consultation.transcription and str(consultation.transcription).strip())
    return ConsultationListItem(
        id=consultation.id,
        patient_id=consultation.patient_id,
        patient_name=consultation.patient.full_name if consultation.patient else None,
        created_by=consultation.created_by,
        title=consultation.title,
        status=consultation.status,
        validation_status=consultation.validation_status,
        transmission_status=consultation.transmission_status,
        pdf_status=consultation.pdf_status,
        created_at=consultation.created_at,
        updated_at=consultation.updated_at,
        transmitted_at=consultation.transmitted_at,
        transmission_id=consultation.transmission_id,
        has_coding=has_coding,
        has_transcription=has_transcription,
    )


def _load_consultation_for_user(db: Session, consultation_id: str, user: User) -> Consultation:
    consultation = (
        db.query(Consultation)
        .options(joinedload(Consultation.patient))
        .filter(Consultation.id == consultation_id)
        .first()
    )
    return ensure_consultation_access(consultation, user)


@router.get("/", response_model=list[ConsultationListItem])
def list_consultations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        consultations_for_user(db, current_user)
        .options(joinedload(Consultation.patient))
        .order_by(Consultation.created_at.desc())
        .all()
    )
    return [_to_list_item(row) for row in rows]


@router.get("/patient/{patient_id}", response_model=list[ConsultationListItem])
def list_patient_consultations(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patients_for_user(db, current_user).filter(Patient.id == patient_id).first()
    ensure_patient_access(patient, current_user)
    rows = (
        consultations_for_user(db, current_user)
        .options(joinedload(Consultation.patient))
        .filter(Consultation.patient_id == patient_id)
        .order_by(Consultation.created_at.desc())
        .all()
    )
    return [_to_list_item(row) for row in rows]


@router.post("/extract-entities")
def extract_entities(
    payload: ExtractEntitiesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le texte de transcription est vide",
        )

    try:
        extracted = llm_service.extract_medical_data(text)
    except Exception:
        logger.exception("LLM extraction failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service d'extraction IA indisponible",
        )

    consultation = None
    if payload.consultation_id:
        consultation = _load_consultation_for_user(db, payload.consultation_id, current_user)
        consultation.structured_data = _dumps_json(extracted)
        consultation.transcription = text
        if not consultation.transcribed_at:
            consultation.transcribed_at = datetime.utcnow()
        consultation.analyzed_at = datetime.utcnow()
        consultation.status = "analyzed"
        consultation.updated_at = datetime.utcnow()
        try:
            db.commit()
            db.refresh(consultation)
        except SQLAlchemyError:
            db.rollback()
            logger.exception("Failed to persist extracted entities")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de l'enregistrement des entités extraites",
            )

    return {
        "success": True,
        "data": extracted,
        "consultation_id": consultation.id if consultation else payload.consultation_id,
        "status": consultation.status if consultation else "analyzed",
    }


@router.post("/{consultation_id}/validate", response_model=ConsultationResponse)
def validate_consultation(
    consultation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consultation = _load_consultation_for_user(db, consultation_id, current_user)
    if consultation.validation_status == "validated" and consultation.status == "validated":
        return _to_response(consultation)

    if consultation.status in ("transmitting", "transmitted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation déjà en cours de transmission ou transmise",
        )

    consultation.validation_status = "validated"
    consultation.status = "validated"
    consultation.validated_at = datetime.utcnow()
    consultation.updated_at = datetime.utcnow()
    try:
        db.commit()
        db.refresh(consultation)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to validate consultation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la validation de la consultation",
        )
    return _to_response(consultation)


@router.get("/{consultation_id}", response_model=ConsultationResponse)
def get_consultation(
    consultation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_response(_load_consultation_for_user(db, consultation_id, current_user))


@router.post("/", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def create_consultation(
    payload: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patients_for_user(db, current_user).filter(Patient.id == payload.patient_id).first()
    ensure_patient_access(patient, current_user)

    now = datetime.utcnow()
    consultation = Consultation(
        patient_id=payload.patient_id,
        created_by=current_user.id,
        title=payload.title or "Nouvelle consultation",
        transcription=payload.transcription,
        structured_data=_dumps_json(payload.structured_data),
        coding_results=_dumps_json(payload.coding_results),
        status=payload.status or "draft",
        validation_status="pending",
        transmission_status="pending",
        pdf_status="pending",
        updated_at=now,
        transcribed_at=now if payload.transcription else None,
    )
    db.add(consultation)
    try:
        db.commit()
        db.refresh(consultation)
        consultation.patient = patient
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while creating consultation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données lors de la création de la consultation",
        )
    return _to_response(consultation)


@router.patch("/{consultation_id}", response_model=ConsultationResponse)
def update_consultation(
    consultation_id: str,
    payload: ConsultationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consultation = _load_consultation_for_user(db, consultation_id, current_user)

    data = payload.model_dump(exclude_unset=True)
    if "structured_data" in data:
        data["structured_data"] = _dumps_json(data["structured_data"])
    if "coding_results" in data:
        data["coding_results"] = _dumps_json(data["coding_results"])

    now = datetime.utcnow()
    if "transcription" in data and data["transcription"]:
        consultation.transcribed_at = consultation.transcribed_at or now
        if "status" not in data and consultation.status in ("draft", "transcribing", "failed"):
            data["status"] = "transcribed"

    for key, value in data.items():
        setattr(consultation, key, value)
    consultation.updated_at = now

    try:
        db.commit()
        db.refresh(consultation)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while updating consultation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données lors de la mise à jour de la consultation",
        )
    return _to_response(consultation)
