from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    inpe: str
    email: str
    full_name: str
    specialty: Optional[str] = "Cardiologie"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool

    class Config:
        from_attributes = True