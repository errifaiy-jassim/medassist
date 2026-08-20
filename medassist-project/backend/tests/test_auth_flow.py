"""End-to-end authentication and access-control tests (real JWT, no mocks)."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core import database
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password
from app.models.user import User


def test_login_with_email(client, admin_credentials):
    response = client.post("/api/v1/auth/login", json=admin_credentials)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "admin.test@medassist.local"
    assert body["user"]["role"] == "admin"
    assert "hashed_password" not in body["user"]


def test_login_with_email_case_insensitive(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "Admin.Test@MedAssist.Local",
            "password": "TestAdminPass123!",
        },
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "admin.test@medassist.local"


def test_login_with_inpe(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "INPE-TEST-001", "password": "TestAdminPass123!"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["inpe"] == "INPE-TEST-001"


def test_login_with_inpe_case_insensitive(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "inpe-test-001", "password": "TestAdminPass123!"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["inpe"] == "INPE-TEST-001"


def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin.test@medassist.local", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiants invalides"


def test_login_unknown_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "unknown@medassist.local", "password": "Whatever123!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiants invalides"


def test_login_inactive_user(client):
    db = database.SessionLocal()
    try:
        user = User(
            inpe="INPE-INACTIVE-001",
            email="inactive.test@medassist.local",
            hashed_password=hash_password("InactivePass123!"),
            full_name="Utilisateur Inactif",
            specialty="Médecine générale",
            role="doctor",
            is_active=False,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "inactive.test@medassist.local", "password": "InactivePass123!"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Compte utilisateur inactif"


def test_jwt_creation_and_validation_contains_role(client, admin_credentials):
    login = client.post("/api/v1/auth/login", json=admin_credentials)
    token = login.json()["access_token"]
    payload = decode_access_token(token)
    assert payload["sub"]
    assert payload["role"] == "admin"
    assert payload["email"] == "admin.test@medassist.local"
    assert "exp" in payload


def test_missing_token_rejected(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/patients/").status_code == 401
    assert client.get("/api/v1/consultations/").status_code == 401


def test_invalid_token_rejected(client):
    headers = {"Authorization": "Bearer not-a-real-jwt"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Token" in response.json()["detail"] or "Authentification" in response.json()["detail"]


def test_tampered_token_rejected(client, admin_token):
    # Corrupt signature while keeping JWT structure.
    parts = admin_token.split(".")
    assert len(parts) == 3
    tampered = f"{parts[0]}.{parts[1]}.invalidsignature"
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert response.status_code == 401


def test_expired_token_rejected(client, admin_headers):
    me = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me.status_code == 200
    user_id = me.json()["id"]

    expired = create_access_token(
        subject=user_id,
        extra_claims={"role": "admin", "email": "admin.test@medassist.local"},
        expires_minutes=-1,
    )
    # Defense: also craft an explicitly past exp in case timedelta edge cases differ.
    payload = {
        "sub": user_id,
        "role": "admin",
        "email": "admin.test@medassist.local",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
    }
    expired_explicit = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    for token in (expired, expired_explicit):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401, response.text


def test_get_current_user_via_me(client, admin_headers):
    response = client.get("/api/v1/auth/me", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "admin.test@medassist.local"
    assert body["inpe"] == "INPE-TEST-001"
    assert body["role"] == "admin"
    assert body["is_active"] is True


def test_role_propagation_doctor(client, doctor_headers):
    response = client.get("/api/v1/auth/me", headers=doctor_headers)
    assert response.status_code == 200
    assert response.json()["role"] == "doctor"


def test_deactivated_user_token_rejected(client, doctor_headers, doctor_user):
    # Token issued while active must stop working after deactivation.
    ok = client.get("/api/v1/auth/me", headers=doctor_headers)
    assert ok.status_code == 200

    db = database.SessionLocal()
    try:
        user = db.query(User).filter(User.id == doctor_user.id).first()
        user.is_active = False
        db.commit()
    finally:
        db.close()

    try:
        blocked = client.get("/api/v1/auth/me", headers=doctor_headers)
        assert blocked.status_code == 401
        assert "inactif" in blocked.json()["detail"].lower() or "introuvable" in blocked.json()[
            "detail"
        ].lower()
    finally:
        db = database.SessionLocal()
        try:
            user = db.query(User).filter(User.id == doctor_user.id).first()
            user.is_active = True
            db.commit()
        finally:
            db.close()


def test_doctor_can_access_own_patient_and_consultation(
    client, doctor_headers, synthetic_patient_payload
):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    patient = client.post(
        "/api/v1/patients/",
        headers=doctor_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient Docteur {suffix}",
            "nir": f"NIR-DOC-OWN-{suffix}",
            "dossier_number": f"DOS-DOC-{suffix}",
            "email": f"doc.own.{suffix.lower()}@example.test",
        },
    )
    assert patient.status_code == 201, patient.text
    pid = patient.json()["id"]

    listed = client.get("/api/v1/patients/", headers=doctor_headers)
    assert listed.status_code == 200
    assert any(p["id"] == pid for p in listed.json())

    detail = client.get(f"/api/v1/patients/{pid}", headers=doctor_headers)
    assert detail.status_code == 200

    consultation = client.post(
        "/api/v1/consultations/",
        headers=doctor_headers,
        json={"patient_id": pid, "title": "Consultation docteur", "status": "draft"},
    )
    assert consultation.status_code == 201, consultation.text
    cid = consultation.json()["id"]

    owned = client.get(f"/api/v1/consultations/{cid}", headers=doctor_headers)
    assert owned.status_code == 200
    assert owned.json()["created_by"]


def test_protected_endpoint_uses_get_current_user(client, admin_headers):
    response = client.get("/api/v1/dashboard/stats", headers=admin_headers)
    assert response.status_code == 200
    assert "practitioner" in response.json()
    assert response.json()["practitioner"]["role"] == "admin"
