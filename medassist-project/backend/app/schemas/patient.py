from pydantic import BaseModel
from typing import Optional

class PatientBase(BaseModel):
    national_id: str
    full_name: str
    age: int
    gender: str
    blood_group: Optional[str] = None
    known_allergies: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: str

    class Config:
        from_attributes = True