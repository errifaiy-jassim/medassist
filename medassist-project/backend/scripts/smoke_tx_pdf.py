"""Smoke test for SIH transmission + PDF workflow."""
from app.core.database import SessionLocal, init_db
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.user import User
from app.services.sih_adapter import sih_adapter
from fastapi.testclient import TestClient
from app.main import app

init_db()
db = SessionLocal()
user = db.query(User).first()
assert user is not None

patient = Patient(full_name="PDF Test", nir="PDF-1", age="40", gender="F")
db.add(patient)
db.commit()
db.refresh(patient)

structured = (
    '{"diagnoses":[{"label":"HTA"}],'
    '"medications":[{"drug_name":"metformine","dosage":"850mg"}],'
    '"examinations":[{"label":"HbA1c","type":"biology"}],'
    '"structured_summary":"Suivi HTA"}'
)
coding = '{"diagnostics_icd10":[{"code":"I10","label":"HTA","requires_validation":true}]}'

consultation = Consultation(
    patient_id=patient.id,
    created_by=user.id,
    title="T",
    transcription="HTA, metformine 850mg, HbA1c",
    structured_data=structured,
    coding_results=coding,
    status="validated",
    validation_status="validated",
)
db.add(consultation)
db.commit()
db.refresh(consultation)

client = TestClient(app)
login = client.post(
    "/api/v1/auth/login",
    json={"username": "admin@medassist.local", "password": "ChangeMeAdmin123!"},
)
assert login.status_code == 200, login.text
headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

first = client.post(
    "/api/v1/transmission/send",
    json={"consultation_id": consultation.id},
    headers=headers,
)
assert first.status_code == 200, first.text
body1 = first.json()
assert body1["status"] == "success"
assert body1["transmission_id"]
assert body1.get("already_transmitted") is False

second = client.post(
    "/api/v1/transmission/send",
    json={"consultation_id": consultation.id},
    headers=headers,
)
assert second.status_code == 200, second.text
assert second.json().get("already_transmitted") is True
assert second.json()["transmission_id"] == body1["transmission_id"]

pending = Consultation(
    patient_id=patient.id,
    created_by=user.id,
    title="U",
    status="coded",
    validation_status="pending",
)
db.add(pending)
db.commit()
db.refresh(pending)
rejected = client.post(
    "/api/v1/transmission/send",
    json={"consultation_id": pending.id},
    headers=headers,
)
assert rejected.status_code == 400

pdf = client.post(
    "/api/v1/pdf/generate",
    json={"consultation_id": consultation.id},
    headers=headers,
)
assert pdf.status_code == 200, pdf.text
assert pdf.headers["content-type"].startswith("application/pdf")
assert len(pdf.content) > 500

db.refresh(consultation)
assert consultation.transmission_id
assert consultation.transmission_status == "sent"
assert consultation.transmitted_at is not None
assert consultation.pdf_status == "generated"

print("adapter", sih_adapter.name)
print("tx_id", consultation.transmission_id)
print("pdf_bytes", len(pdf.content))
print("ok")
db.close()
