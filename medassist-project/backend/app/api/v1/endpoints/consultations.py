import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.schemas.consultation import ConsultationCreate, ConsultationResponse

router = APIRouter()

class TranscribeRequest(BaseModel):
    text: str


@router.get("/", response_model=list[ConsultationResponse])
def get_consultations(db: Session = Depends(get_db)):
    return db.query(Consultation).order_by(Consultation.created_at.desc()).all()


@router.get("/patient/{patient_id}", response_model=list[ConsultationResponse])
def get_patient_consultations(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(Consultation).filter(Consultation.patient_id == patient_id).order_by(Consultation.created_at.desc()).all()


@router.post("/", response_model=ConsultationResponse, status_code=201)
def create_consultation(consultation: ConsultationCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == consultation.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Conversion de dict/list en JSON string si nécessaire
    structured_data_str = consultation.structured_data
    if isinstance(structured_data_str, (dict, list)):
        structured_data_str = json.dumps(structured_data_str)

    db_consultation = Consultation(
        patient_id=consultation.patient_id,
        title=consultation.title or "Nouvelle consultation",
        transcription=consultation.transcription,
        structured_data=structured_data_str,
        status=consultation.status or "completed",
    )
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    return db_consultation


@router.post("/extract-entities")
async def extract_entities(payload: TranscribeRequest):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Le texte de transcription est vide.")

    return {
        "success": True,
        "data": {
            "summary": "Résumé simulé..."
        }
    }