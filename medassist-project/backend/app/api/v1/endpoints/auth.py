import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    raw_username = credentials.username.strip()
    normalized = raw_username.lower()
    # Email is stored lowercase; INPE match is case-insensitive without weakening password checks.
    user = (
        db.query(User)
        .filter(
            or_(
                User.email == normalized,
                func.lower(User.inpe) == normalized,
            )
        )
        .first()
    )
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte utilisateur inactif",
        )

    token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email},
    )
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # JWT is stateless; client must discard the token.
    return {"status": "success", "message": "Déconnexion effectuée", "user_id": current_user.id}
