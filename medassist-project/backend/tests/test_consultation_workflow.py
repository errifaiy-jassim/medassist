"""End-to-end clinical workflow with mocked STT / LLM / SIH."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

from app.services.sih_adapter import SIHTransmissionError, SIHTransmissionResult


SYNTHETIC_TRANSCRIPT = (
    "Patient synthetique de 45 ans. Hypertension arterielle. "
    "Prescription metformine 850 mg. Demande glycemie a jeun."
)

MOCK_EXTRACTION = {
    "demographics": {"age": "45", "gender": "Masculin", "blood_group": None},
    "symptoms": [],
    "diagnoses": [{"label": "Hypertension arterielle"}],
    "diagnostics": [{"label": "Hypertension arterielle"}],
    "treatments": [],
    "medications": [{"drug_name": "Metformine", "dosage": "850 mg", "frequency": None}],
    "prescriptions": [{"drug_name": "Metformine", "dosage": "850 mg", "frequency": None}],
    "examinations": [{"label": "Glycemie a jeun", "type": "biology"}],
    "biology": [{"test_name": "Glycemie a jeun"}],
    "imaging": [],
    "structured_summary": "Synthese factuelle de test.",
}


def _unique_suffix() -> str:
    return uuid.uuid4().hex[:8].upper()


@pytest.fixture
def owned_consultation(client, admin_headers, synthetic_patient_payload):
    suffix = _unique_suffix()
    patient = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient Synthetique Workflow {suffix}",
            "nir": f"NIR-SYN-WF-{suffix}",
            "dossier_number": f"DOS-SYN-WF-{suffix}",
            "email": f"wf.{suffix.lower()}@example.test",
        },
    )
    assert patient.status_code == 201, patient.text
    patient_id = patient.json()["id"]

    consultation = client.post(
        "/api/v1/consultations/",
        headers=admin_headers,
        json={"patient_id": patient_id, "title": "Consultation synthetique", "status": "draft"},
    )
    assert consultation.status_code == 201, consultation.text
    return {"patient_id": patient_id, "consultation": consultation.json()}


def test_consultation_creation(owned_consultation):
    c = owned_consultation["consultation"]
    assert c["status"] == "draft"
    assert c["validation_status"] == "pending"
    assert c["transmission_status"] == "pending"
    assert c["patient_id"] == owned_consultation["patient_id"]


def test_transcription_flow_mocked_stt(client, admin_headers, owned_consultation, monkeypatch):
    import app.api.v1.endpoints.stt as stt_endpoint

    monkeypatch.setattr(
        stt_endpoint.stt_service,
        "transcribe_audio",
        lambda _path: SYNTHETIC_TRANSCRIPT,
    )

    response = client.post(
        "/api/v1/stt/transcribe",
        headers=admin_headers,
        files={"file": ("dictation.webm", b"fake-audio-bytes", "audio/webm")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["transcription"] == SYNTHETIC_TRANSCRIPT

    cid = owned_consultation["consultation"]["id"]
    updated = client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"transcription": SYNTHETIC_TRANSCRIPT, "status": "transcribed"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "transcribed"
    assert updated.json()["transcription"] == SYNTHETIC_TRANSCRIPT


def test_stt_failure_keeps_consultation(client, admin_headers, owned_consultation, monkeypatch):
    import app.api.v1.endpoints.stt as stt_endpoint

    def _fail(_path):
        raise RuntimeError("STT unavailable")

    monkeypatch.setattr(stt_endpoint.stt_service, "transcribe_audio", _fail)

    response = client.post(
        "/api/v1/stt/transcribe",
        headers=admin_headers,
        files={"file": ("dictation.webm", b"fake-audio-bytes", "audio/webm")},
    )
    assert response.status_code == 500

    cid = owned_consultation["consultation"]["id"]
    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == cid
    assert detail.json()["status"] == "draft"


def test_entity_extraction_mocked_ai(client, admin_headers, owned_consultation, monkeypatch):
    import app.api.v1.endpoints.consultations as consultations_endpoint

    monkeypatch.setattr(
        consultations_endpoint.llm_service,
        "extract_medical_data",
        lambda _text: MOCK_EXTRACTION,
    )

    cid = owned_consultation["consultation"]["id"]
    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"transcription": SYNTHETIC_TRANSCRIPT, "status": "transcribed"},
    )

    response = client.post(
        "/api/v1/consultations/extract-entities",
        headers=admin_headers,
        json={"text": SYNTHETIC_TRANSCRIPT, "consultation_id": cid},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["status"] == "analyzed"
    assert body["data"]["diagnostics"][0]["label"] == "Hypertension arterielle"

    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.json()["status"] == "analyzed"
    assert detail.json()["structured_data"] is not None


def test_ai_failure_keeps_transcription(client, admin_headers, owned_consultation, monkeypatch):
    import app.api.v1.endpoints.consultations as consultations_endpoint

    monkeypatch.setattr(
        consultations_endpoint.llm_service,
        "extract_medical_data",
        lambda _text: (_ for _ in ()).throw(RuntimeError("LLM down")),
    )

    cid = owned_consultation["consultation"]["id"]
    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"transcription": SYNTHETIC_TRANSCRIPT, "status": "transcribed"},
    )

    response = client.post(
        "/api/v1/consultations/extract-entities",
        headers=admin_headers,
        json={"text": SYNTHETIC_TRANSCRIPT, "consultation_id": cid},
    )
    assert response.status_code == 503

    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["transcription"] == SYNTHETIC_TRANSCRIPT
    assert detail.json()["status"] == "transcribed"


def test_coding_and_coding_failure(client, admin_headers, owned_consultation, monkeypatch):
    cid = owned_consultation["consultation"]["id"]

    ok = client.post(
        "/api/v1/coding/process",
        headers=admin_headers,
        json={
            "diagnostics": ["Hypertension arterielle"],
            "prescriptions": ["Metformine"],
            "biology": ["Glycemie a jeun"],
            "consultation_id": cid,
        },
    )
    assert ok.status_code == 200, ok.text
    assert "diagnostics_icd10" in ok.json()
    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.json()["status"] == "coded"

    import app.api.v1.endpoints.coding as coding_endpoint

    monkeypatch.setattr(
        coding_endpoint.coding_service,
        "match_icd10",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("coding boom")),
    )
    fail = client.post(
        "/api/v1/coding/process",
        headers=admin_headers,
        json={"diagnostics": ["x"], "consultation_id": cid},
    )
    assert fail.status_code == 500
    still = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert still.json()["id"] == cid
    assert still.json()["status"] == "coded"


def test_validation_and_validation_guard(client, admin_headers, owned_consultation):
    cid = owned_consultation["consultation"]["id"]
    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={
            "transcription": SYNTHETIC_TRANSCRIPT,
            "structured_data": MOCK_EXTRACTION,
            "status": "coded",
        },
    )

    validated = client.post(f"/api/v1/consultations/{cid}/validate", headers=admin_headers)
    assert validated.status_code == 200
    assert validated.json()["validation_status"] == "validated"
    assert validated.json()["status"] == "validated"

    # Cannot set validated via PATCH anymore
    blocked = client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"status": "validated"},
    )
    assert blocked.status_code == 422


def test_transmission_success_pdf_and_history(client, admin_headers, owned_consultation):
    cid = owned_consultation["consultation"]["id"]
    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={
            "transcription": SYNTHETIC_TRANSCRIPT,
            "structured_data": MOCK_EXTRACTION,
            "status": "coded",
        },
    )
    client.post(f"/api/v1/consultations/{cid}/validate", headers=admin_headers)

    tx = client.post(
        "/api/v1/transmission/send",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert tx.status_code == 200, tx.text
    body = tx.json()
    assert body["status"] == "success"
    assert body["transmission_id"]
    assert body["transmission_status"] == "sent"

    # Idempotent retry after success
    again = client.post(
        "/api/v1/transmission/send",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert again.status_code == 200
    assert again.json().get("already_transmitted") is True

    pdf = client.post(
        "/api/v1/pdf/generate",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert pdf.content[:4] == b"%PDF"

    history = client.get("/api/v1/consultations/", headers=admin_headers)
    assert history.status_code == 200
    row = next(r for r in history.json() if r["id"] == cid)
    assert "transcription" not in row
    assert row["transmission_status"] == "sent"
    assert row["has_transcription"] is True


def test_transmission_failure_and_retry(client, admin_headers, owned_consultation, monkeypatch):
    import app.api.v1.endpoints.transmission as tx_mod

    cid = owned_consultation["consultation"]["id"]
    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"transcription": SYNTHETIC_TRANSCRIPT, "status": "coded"},
    )
    client.post(f"/api/v1/consultations/{cid}/validate", headers=admin_headers)

    class FailingAdapter:
        name = "failing"

        def send_consultation(self, payload):
            raise SIHTransmissionError("SIH synthetique indisponible")

    class RecoveringAdapter:
        name = "recovering"

        def send_consultation(self, payload):
            return SIHTransmissionResult(
                success=True,
                transmission_id=f"#TX-RETRY-{str(payload['consultation_id'])[:6].upper()}",
                timestamp=datetime.now(timezone.utc),
                message="OK",
                adapter=self.name,
            )

    monkeypatch.setattr(tx_mod, "sih_adapter", FailingAdapter())
    fail = client.post(
        "/api/v1/transmission/send",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert fail.status_code == 502

    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == cid
    assert detail.json()["transmission_status"] == "failed"
    assert detail.json()["validation_status"] == "validated"
    assert detail.json()["transcription"] == SYNTHETIC_TRANSCRIPT

    monkeypatch.setattr(tx_mod, "sih_adapter", RecoveringAdapter())
    retry = client.post(
        "/api/v1/transmission/send",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert retry.status_code == 200, retry.text
    assert retry.json()["transmission_status"] == "sent"


def test_pdf_failure_keeps_consultation(client, admin_headers, owned_consultation, monkeypatch):
    import app.api.v1.endpoints.pdf as pdf_endpoint

    cid = owned_consultation["consultation"]["id"]
    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"transcription": SYNTHETIC_TRANSCRIPT, "status": "coded"},
    )
    client.post(f"/api/v1/consultations/{cid}/validate", headers=admin_headers)

    monkeypatch.setattr(
        pdf_endpoint.pdf_service,
        "generate_consultation_pdf",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("PDF boom")),
    )
    response = client.post(
        "/api/v1/pdf/generate",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert response.status_code == 500

    detail = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers)
    assert detail.json()["id"] == cid
    assert detail.json()["validation_status"] == "validated"
    assert detail.json()["pdf_status"] == "failed"


def test_transmit_requires_validation(client, admin_headers, owned_consultation):
    cid = owned_consultation["consultation"]["id"]
    response = client.post(
        "/api/v1/transmission/send",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert response.status_code == 400


def test_full_workflow_happy_path(client, admin_headers, synthetic_patient_payload, monkeypatch):
    import app.api.v1.endpoints.consultations as consultations_endpoint
    import app.api.v1.endpoints.stt as stt_endpoint

    monkeypatch.setattr(
        stt_endpoint.stt_service,
        "transcribe_audio",
        lambda _path: SYNTHETIC_TRANSCRIPT,
    )
    monkeypatch.setattr(
        consultations_endpoint.llm_service,
        "extract_medical_data",
        lambda _text: MOCK_EXTRACTION,
    )

    suffix = _unique_suffix()
    patient = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient Synthetique E2E {suffix}",
            "nir": f"NIR-SYN-E2E-{suffix}",
            "dossier_number": f"DOS-E2E-{suffix}",
            "email": f"e2e.{suffix.lower()}@example.test",
        },
    ).json()

    consultation = client.post(
        "/api/v1/consultations/",
        headers=admin_headers,
        json={"patient_id": patient["id"], "title": "E2E synthetique", "status": "draft"},
    ).json()
    cid = consultation["id"]

    stt = client.post(
        "/api/v1/stt/transcribe",
        headers=admin_headers,
        files={"file": ("note.webm", b"audio", "audio/webm")},
    )
    assert stt.status_code == 200

    client.patch(
        f"/api/v1/consultations/{cid}",
        headers=admin_headers,
        json={"transcription": stt.json()["transcription"], "status": "transcribed"},
    )
    extract = client.post(
        "/api/v1/consultations/extract-entities",
        headers=admin_headers,
        json={"text": SYNTHETIC_TRANSCRIPT, "consultation_id": cid},
    )
    assert extract.status_code == 200

    coding = client.post(
        "/api/v1/coding/process",
        headers=admin_headers,
        json={
            "diagnostics": ["Hypertension arterielle"],
            "prescriptions": ["Metformine"],
            "biology": ["Glycemie a jeun"],
            "consultation_id": cid,
        },
    )
    assert coding.status_code == 200

    validated = client.post(f"/api/v1/consultations/{cid}/validate", headers=admin_headers)
    assert validated.status_code == 200

    tx = client.post(
        "/api/v1/transmission/send",
        headers=admin_headers,
        json={"consultation_id": cid},
    )
    assert tx.status_code == 200

    pdf = client.post("/api/v1/pdf/generate", headers=admin_headers, json={"consultation_id": cid})
    assert pdf.status_code == 200

    final = client.get(f"/api/v1/consultations/{cid}", headers=admin_headers).json()
    assert final["status"] == "transmitted"
    assert final["transmission_status"] == "sent"
    assert final["pdf_status"] == "generated"
    assert final["transcription"] == SYNTHETIC_TRANSCRIPT
