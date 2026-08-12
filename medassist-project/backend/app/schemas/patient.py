from pydantic import BaseModel
from typing import Optional

class PatientBase(BaseModel):
    full_name: str
    nir: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dossier_number: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: str

    class Config:
        from_attributes = True