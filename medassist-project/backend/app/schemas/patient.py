from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _empty_to_none(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


class PatientBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    nir: Optional[str] = Field(default=None, max_length=64)
    age: Optional[str] = Field(default=None, max_length=32)
    gender: Optional[str] = Field(default=None, max_length=32)
    blood_group: Optional[str] = Field(default=None, max_length=16)
    phone: Optional[str] = Field(default=None, max_length=64)
    email: Optional[str] = Field(default=None, max_length=255)
    dossier_number: Optional[str] = Field(default=None, max_length=64)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if len(cleaned) < 2:
            raise ValueError("Le nom complet doit contenir au moins 2 caractères")
        return cleaned

    @field_validator("nir", "age", "gender", "blood_group", "phone", "email", "dossier_number", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        return _empty_to_none(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        email = value.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise ValueError("Adresse e-mail invalide")
        return email


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    nir: Optional[str] = Field(default=None, max_length=64)
    age: Optional[str] = Field(default=None, max_length=32)
    gender: Optional[str] = Field(default=None, max_length=32)
    blood_group: Optional[str] = Field(default=None, max_length=16)
    phone: Optional[str] = Field(default=None, max_length=64)
    email: Optional[str] = Field(default=None, max_length=255)
    dossier_number: Optional[str] = Field(default=None, max_length=64)

    @field_validator("full_name", "nir", "age", "gender", "blood_group", "phone", "email", "dossier_number", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        return _empty_to_none(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        email = value.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise ValueError("Adresse e-mail invalide")
        return email


class PatientResponse(PatientBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

    @field_validator("created_at", mode="before")
    @classmethod
    def serialize_created_at(cls, value):
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)
