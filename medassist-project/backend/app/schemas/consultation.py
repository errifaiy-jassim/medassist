from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ConsultationBase(BaseModel):
    patient_id: str
    title: Optional[str] = None
    transcription: Optional[str] = None
    structured_data: Optional[Any] = None
    status: Optional[str] = "completed"

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationUpdate(BaseModel):
    status: Optional[str] = None
    transcription: Optional[str] = None
    structured_data: Optional[Any] = None

class ConsultationResponse(ConsultationBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True