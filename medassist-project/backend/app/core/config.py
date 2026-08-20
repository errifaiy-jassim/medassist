from functools import lru_cache
from pathlib import Path
from typing import List
from urllib.parse import urlparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_DEFAULTS = {
    "",
    "change-me-in-development-only",
    "replace-with-a-long-random-secret",
    "secret",
    "changeme",
}

# Resolve .env against the backend package root (…/backend/.env), not the process CWD.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Absolute path so CWD does not control which .env is loaded.
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "MedAssist - Assistant IA de Consultation"
    ENVIRONMENT: str = "development"  # development | production
    DATABASE_URL: str = "sqlite:///./medassist.db"

    # JWT / auth
    JWT_SECRET_KEY: str = "change-me-in-development-only"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Bootstrap admin (created only if no users exist)
    ADMIN_INPE: str = "INPE-000001"
    ADMIN_EMAIL: str = "admin@medassist.local"
    ADMIN_PASSWORD: str = "ChangeMeAdmin123!"
    ADMIN_FULL_NAME: str = "Administrateur MedAssist"
    ADMIN_SPECIALTY: str = "Médecine générale"

    # CORS — comma-separated origins
    CORS_ORIGINS: str = "http://localhost:3003,http://127.0.0.1:3003"

    # External AI (backend-only — never expose URL/keys to the frontend)
    LLM_API_URL: str = "http://127.0.0.1:11434/api/generate"
    LLM_MODEL_NAME: str = "qwen2.5:7b"
    LLM_ALLOWED_HOSTS: str = "127.0.0.1,localhost"

    # STT (backend-only)
    WHISPER_MODEL: str = "small"
    STT_MAX_UPLOAD_BYTES: int = 25 * 1024 * 1024  # 25 MB
    STT_ALLOWED_CONTENT_TYPES: str = (
        "audio/webm,audio/wav,audio/x-wav,audio/mpeg,audio/mp3,audio/ogg,audio/mp4,application/octet-stream"
    )

    # OpenAPI docs (disable in production)
    ENABLE_API_DOCS: bool = True

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        return origins or ["http://localhost:3003"]

    @property
    def llm_allowed_hosts_list(self) -> List[str]:
        return [h.strip().lower() for h in self.LLM_ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def stt_allowed_content_types(self) -> set[str]:
        return {t.strip().lower() for t in self.STT_ALLOWED_CONTENT_TYPES.split(",") if t.strip()}

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def validate_token_ttl(cls, value: int) -> int:
        if value < 5 or value > 24 * 60:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 5 and 1440")
        return value

    @model_validator(mode="after")
    def harden_production_secrets(self):
        if self.is_production:
            if self.JWT_SECRET_KEY.strip() in INSECURE_JWT_DEFAULTS or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "Production requires a strong JWT_SECRET_KEY (min 32 chars, non-default)."
                )
            if self.ADMIN_PASSWORD in {"ChangeMeAdmin123!", "admin", "password", "changeme"}:
                raise ValueError("Production requires a non-default ADMIN_PASSWORD.")
            if self.ENABLE_API_DOCS is True and self.ENVIRONMENT == "production":
                # Prefer docs off in production unless explicitly enabled via env after this default.
                object.__setattr__(self, "ENABLE_API_DOCS", False)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def assert_llm_host_allowed(url: str) -> None:
    """Refuse silent PHI exfiltration to unexpected LLM hosts (fail-closed)."""
    # 1. Exact hostname from URL (no port, no path).
    host = (urlparse(url).hostname or "").lower()
    # 2. Explicit allowlist from settings.
    allowed = settings.llm_allowed_hosts_list
    # 3. Empty allowlist → block (fail closed).
    if not allowed:
        raise RuntimeError(
            "LLM_ALLOWED_HOSTS is empty. Refusing LLM requests until an explicit allowlist is configured."
        )
    # 4–6. Exact hostname membership only (no substring/suffix/wildcard).
    if host not in allowed:
        raise RuntimeError(
            f"LLM host '{host}' is not in LLM_ALLOWED_HOSTS. "
            "Configure an explicit allowlist before sending clinical text."
        )
