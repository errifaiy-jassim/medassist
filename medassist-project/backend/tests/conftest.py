"""Pytest fixtures — isolated SQLite DB, synthetic users, no real patient data."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_DB = Path(__file__).parent / "_pytest_medassist.db"


def _configure_test_env() -> None:
    if TEST_DB.exists():
        TEST_DB.unlink()
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
    os.environ["ENVIRONMENT"] = "development"
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-characters-long"
    os.environ["ADMIN_EMAIL"] = "admin.test@medassist.local"
    os.environ["ADMIN_PASSWORD"] = "TestAdminPass123!"
    os.environ["ADMIN_INPE"] = "INPE-TEST-001"
    os.environ["ADMIN_FULL_NAME"] = "Administrateur Test"
    os.environ["CORS_ORIGINS"] = "http://localhost:3003"
    os.environ["LLM_API_URL"] = "http://127.0.0.1:11434/api/generate"
    os.environ["LLM_MODEL_NAME"] = "test-model"
    os.environ["LLM_ALLOWED_HOSTS"] = "127.0.0.1,localhost"
    os.environ["ENABLE_API_DOCS"] = "true"
    os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"


_configure_test_env()

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

# Rebuild engine against the test DATABASE_URL (module may have been imported elsewhere).
import app.core.database as database  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

database.engine = create_engine(
    get_settings().DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=database.engine)
database.init_db()

from fastapi.testclient import TestClient  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
import app.main as main_module  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_login_rate_limit():
    """Isolate login rate-limit state across tests without weakening production limits."""
    main_module._LOGIN_ATTEMPTS.clear()
    yield
    main_module._LOGIN_ATTEMPTS.clear()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def admin_credentials():
    return {
        "username": "admin.test@medassist.local",
        "password": "TestAdminPass123!",
    }


@pytest.fixture(scope="session")
def admin_token(client, admin_credentials):
    response = client.post("/api/v1/auth/login", json=admin_credentials)
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def doctor_user():
    """Second practitioner for authorization isolation tests (synthetic)."""
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "doctor.test@medassist.local").first()
        if existing:
            return existing
        user = User(
            inpe="INPE-DOC-002",
            email="doctor.test@medassist.local",
            hashed_password=hash_password("DoctorPass123!"),
            full_name="Praticien Test",
            specialty="Médecine générale",
            role="doctor",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture(scope="session")
def doctor_headers(client, doctor_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "doctor.test@medassist.local", "password": "DoctorPass123!"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def synthetic_patient_payload():
    """Synthetic demographic only — not real patient data."""
    return {
        "full_name": "Patient Synthetique Alpha",
        "nir": "NIR-SYN-ALPHA-001",
        "age": "45",
        "gender": "Masculin",
        "blood_group": "O+",
        "phone": "0600000000",
        "email": "patient.synthetique@example.test",
        "dossier_number": "DOS-SYN-001",
    }
