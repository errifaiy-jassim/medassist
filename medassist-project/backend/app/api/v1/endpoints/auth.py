from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

# Déclaration obligatoire de 'router'
router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(credentials: LoginRequest):
    # Logique d'authentification Keycloak / JWT
    if credentials.username == "admin" and credentials.password == "admin":
        return {"access_token": "token_demo_medassist", "token_type": "bearer"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides"
    )

@router.get("/me")
def get_current_user():
    return {"username": "medecin_demo", "role": "doctor"}