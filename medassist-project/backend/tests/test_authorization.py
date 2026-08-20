def test_protected_routes_require_auth(client):
    assert client.get("/api/v1/patients/").status_code == 401
    assert client.get("/api/v1/consultations/").status_code == 401
    assert client.get("/api/v1/settings/").status_code == 401
    assert client.get("/api/v1/dashboard/stats").status_code == 401


def test_doctor_cannot_access_admin_patient(client, admin_headers, doctor_headers, synthetic_patient_payload):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    created = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient Synthetique Prive {suffix}",
            "nir": f"NIR-SYN-PRIV-{suffix}",
            "dossier_number": f"DOS-PRIV-{suffix}",
            "email": f"priv.{suffix.lower()}@example.test",
        },
    )
    assert created.status_code == 201
    patient_id = created.json()["id"]

    listed = client.get("/api/v1/patients/", headers=doctor_headers)
    assert listed.status_code == 200
    assert all(p["id"] != patient_id for p in listed.json())

    detail = client.get(f"/api/v1/patients/{patient_id}", headers=doctor_headers)
    assert detail.status_code == 404


def test_doctor_cannot_access_foreign_consultation(
    client, admin_headers, doctor_headers, synthetic_patient_payload
):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    patient = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={
            **synthetic_patient_payload,
            "full_name": f"Patient Synthetique AuthZ {suffix}",
            "nir": f"NIR-SYN-AUTHZ-{suffix}",
            "dossier_number": f"DOS-AUTHZ-{suffix}",
            "email": f"authz.{suffix.lower()}@example.test",
        },
    ).json()

    consultation = client.post(
        "/api/v1/consultations/",
        headers=admin_headers,
        json={"patient_id": patient["id"], "title": "Privee", "status": "draft"},
    ).json()
    cid = consultation["id"]

    assert client.get(f"/api/v1/consultations/{cid}", headers=doctor_headers).status_code == 404
    assert (
        client.post(
            f"/api/v1/consultations/{cid}/validate",
            headers=doctor_headers,
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/v1/transmission/send",
            headers=doctor_headers,
            json={"consultation_id": cid},
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/v1/pdf/generate",
            headers=doctor_headers,
            json={"consultation_id": cid},
        ).status_code
        == 404
    )


def test_settings_does_not_leak_secrets(client, admin_headers):
    response = client.get("/api/v1/settings/", headers=admin_headers)
    assert response.status_code == 200
    raw = response.text
    assert "JWT_SECRET" not in raw
    assert "DATABASE_URL" not in raw
    assert "password" not in raw.lower()
    assert "LLM_API_URL" not in raw
    assert "HF_TOKEN" not in raw
    body = response.json()
    assert "llm_model" in body
    assert body["llm_api_configured"] is True
