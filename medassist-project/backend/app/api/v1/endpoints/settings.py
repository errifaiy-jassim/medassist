from fastapi import APIRouter, Depends

from app.core.config import assert_llm_host_allowed, settings
from app.core.database import check_database_connection
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


def _llm_host_allowlisted() -> bool:
    """True only when configured LLM_API_URL passes the fail-closed host check."""
    try:
        assert_llm_host_allowed(settings.LLM_API_URL)
        return True
    except RuntimeError:
        return False


@router.get("/")
def get_settings(current_user: User = Depends(get_current_user)):
    db_ok = check_database_connection()
    return {
        "status": "ok",
        "project_name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "llm_model": settings.LLM_MODEL_NAME,
        "llm_api_configured": bool(settings.LLM_API_URL),
        "llm_host_allowlisted": _llm_host_allowlisted(),
        "stt_model": settings.WHISPER_MODEL,
        "stt_max_upload_mb": settings.STT_MAX_UPLOAD_BYTES // (1024 * 1024),
        "database": "connected" if db_ok else "unavailable",
        "api_version": "v1",
        "token_ttl_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "user": UserResponse.model_validate(current_user).model_dump(),
        # Never expose: JWT secret, DATABASE_URL, LLM_API_URL, HF_TOKEN, passwords
    }
