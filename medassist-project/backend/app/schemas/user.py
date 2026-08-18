from typing import Optional

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    inpe: str
    email: str
    full_name: str
    specialty: Optional[str] = "Cardiologie"
    role: Optional[str] = "doctor"


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserResponse(UserBase):
    id: str
    is_active: bool
    rpps_licence: Optional[str] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, description="Email or INPE")
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
