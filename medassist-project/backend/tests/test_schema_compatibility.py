"""Schema compatibility checks for User / Patient / Consultation upgrades."""

from sqlalchemy import text
from sqlalchemy.orm import configure_mappers

from app.core import database
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.user import User
from app.schemas.consultation import ConsultationResponse
from app.schemas.patient import PatientResponse
from app.schemas.user import UserResponse


def test_sqlalchemy_mappers_configure():
    configure_mappers()
    assert Consultation.patient.property.mapper.class_ is Patient
    assert Consultation.author.property.mapper.class_ is User
    assert Patient.consultations.property.mapper.class_ is Consultation
    assert Patient.creator.property.mapper.class_ is User


def test_foreign_key_targets():
    consultation_targets = {str(fk.column) for fk in Consultation.__table__.foreign_keys}
    patient_targets = {str(fk.column) for fk in Patient.__table__.foreign_keys}
    assert "patients.id" in consultation_targets
    assert "users.id" in consultation_targets
    assert "users.id" in patient_targets


def test_pydantic_responses_match_persisted_rows(client, admin_headers, synthetic_patient_payload):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    created = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient Schema {suffix}",
            "nir": f"NIR-SCHEMA-{suffix}",
            "dossier_number": f"DOS-SCHEMA-{suffix}",
            "email": f"schema.{suffix.lower()}@example.test",
        },
    )
    assert created.status_code == 201, created.text
    patient = created.json()
    PatientResponse.model_validate(patient)

    me = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me.status_code == 200
    UserResponse.model_validate(me.json())

    consultation = client.post(
        "/api/v1/consultations/",
        headers=admin_headers,
        json={"patient_id": patient["id"], "title": "Schema check", "status": "draft"},
    )
    assert consultation.status_code == 201, consultation.text
    ConsultationResponse.model_validate(consultation.json())


def test_add_column_default_keeps_existing_rows_valid():
    """Upgrade path: new column with DEFAULT must populate existing rows."""
    with database.engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS _upgrade_probe"))
        conn.execute(text("CREATE TABLE _upgrade_probe (id VARCHAR PRIMARY KEY)"))
        conn.execute(text("INSERT INTO _upgrade_probe (id) VALUES ('row-1')"))

    try:
        database._add_column_if_missing(
            "_upgrade_probe",
            "status",
            "VARCHAR(50)",
            server_default="'draft'",
        )
        with database.engine.connect() as conn:
            value = conn.execute(
                text("SELECT status FROM _upgrade_probe WHERE id = 'row-1'")
            ).scalar()
        assert value == "draft"
    finally:
        with database.engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS _upgrade_probe"))


def test_backfill_legacy_nulls_is_idempotent_on_valid_rows(
    client, admin_headers, synthetic_patient_payload
):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    patient = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient LegacyNull {suffix}",
            "nir": f"NIR-LEGACY-{suffix}",
            "dossier_number": f"DOS-LEGACY-{suffix}",
            "email": f"legacy.{suffix.lower()}@example.test",
        },
    )
    assert patient.status_code == 201, patient.text
    consultation = client.post(
        "/api/v1/consultations/",
        headers=admin_headers,
        json={
            "patient_id": patient.json()["id"],
            "title": "Legacy null backfill",
            "status": "draft",
        },
    )
    assert consultation.status_code == 201, consultation.text
    cid = consultation.json()["id"]

    database._backfill_legacy_nulls()

    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["validation_status"] == "pending"
    assert body["transmission_status"] == "pending"
    assert body["pdf_status"] == "pending"
    ConsultationResponse.model_validate(body)
