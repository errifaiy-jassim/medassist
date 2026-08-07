from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime

class ConsultationBase(BaseModel):
    patient_id: str
    doctor_id: str
    status: Optional[str] = "Draft"

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationUpdate(BaseModel):
    status: Optional[str] = None
    raw_transcription: Optional[str] = None
    structured_summary: Optional[str] = None
    diagnostics_icd10: Optional[List[Dict[str, Any]]] = None
    prescriptions_gmr: Optional[List[Dict[str, Any]]] = None
    biology_nabm: Optional[List[Dict[str, Any]]] = None
    imaging_requests: Optional[List[Dict[str, Any]]] = None

class ConsultationResponse(ConsultationBase):
    id: str
    consultation_code: str
    raw_transcription: Optional[str] = None
    structured_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True