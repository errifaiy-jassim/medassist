from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class ConsultationBase(BaseModel):
    patient_id: str
    title: Optional[str] = None
    transcription: Optional[str] = None
    structured_data: Optional[Any] = None
    coding_results: Optional[Any] = None
    status: Optional[str] = "draft"
    validation_status: Optional[str] = "pending"
    transmission_status: Optional[str] = "pending"
    pdf_status: Optional[str] = "pending"


class ConsultationCreate(BaseModel):
    patient_id: str
    title: Optional[str] = None
    transcription: Optional[str] = None
    structured_data: Optional[Any] = None
    coding_results: Optional[Any] = None
    status: Optional[str] = "draft"


class ConsultationUpdate(BaseModel):
    """Client-mutable fields only. Validation / transmission / PDF are dedicated endpoints."""

    title: Optional[str] = None
    transcription: Optional[str] = None
    structured_data: Optional[Any] = None
    coding_results: Optional[Any] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        allowed = {"draft", "transcribing", "transcribed", "analyzed", "coded", "failed"}
        if value not in allowed:
            raise ValueError(
                "Statut non autorisé via PATCH. Utilisez les endpoints validate/transmission."
            )
        return value


class ConsultationListItem(BaseModel):
    """List DTO without clinical bodies (transcription / structured data)."""

    id: str
    patient_id: str
    patient_name: Optional[str] = None
    created_by: Optional[str] = None
    title: Optional[str] = None
    status: str
    validation_status: str
    transmission_status: str
    pdf_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    transmitted_at: Optional[datetime] = None
    transmission_id: Optional[str] = None
    has_coding: bool = False
    has_transcription: bool = False

    class Config:
        from_attributes = True


class ConsultationResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    created_by: Optional[str] = None
    title: Optional[str] = None
    transcription: Optional[str] = None
    structured_data: Optional[Any] = None
    coding_results: Optional[Any] = None
    status: str
    validation_status: str
    transmission_status: str
    pdf_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    transcribed_at: Optional[datetime] = None
    analyzed_at: Optional[datetime] = None
    coded_at: Optional[datetime] = None
    validated_at: Optional[datetime] = None
    transmitted_at: Optional[datetime] = None
    transmission_id: Optional[str] = None

    class Config:
        from_attributes = True

    @field_validator("structured_data", "coding_results", mode="before")
    @classmethod
    def parse_json_fields(cls, value: Any) -> Any:
        if value is None or value == "":
            return None
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            import json

            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value


class ExtractEntitiesRequest(BaseModel):
    text: str = Field(min_length=1)
    consultation_id: Optional[str] = None
