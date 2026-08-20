def test_create_and_retrieve_patient(client, admin_headers, synthetic_patient_payload):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    payload = {
        **synthetic_patient_payload,
        "full_name": f"Patient Synthetique Alpha {suffix}",
        "nir": f"NIR-SYN-A-{suffix}",
        "dossier_number": f"DOS-A-{suffix}",
        "email": f"alpha.{suffix.lower()}@example.test",
    }
    create = client.post("/api/v1/patients/", headers=admin_headers, json=payload)
    assert create.status_code == 201, create.text
    patient = create.json()
    assert patient["full_name"] == payload["full_name"]
    assert patient["id"]
    assert "password" not in patient

    detail = client.get(f"/api/v1/patients/{patient['id']}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["nir"] == payload["nir"]


def test_list_and_search_patients(client, admin_headers, synthetic_patient_payload):
    import uuid

    suffix = uuid.uuid4().hex[:8].upper()
    payload = {
        **synthetic_patient_payload,
        "full_name": f"Patient Synthetique Beta {suffix}",
        "nir": f"NIR-SYN-B-{suffix}",
        "dossier_number": f"DOS-B-{suffix}",
        "email": f"beta.{suffix.lower()}@example.test",
    }
    created = client.post("/api/v1/patients/", headers=admin_headers, json=payload)
    assert created.status_code == 201

    listed = client.get("/api/v1/patients/", headers=admin_headers)
    assert listed.status_code == 200
    assert any(p["nir"] == payload["nir"] for p in listed.json())

    search = client.get("/api/v1/patients/search", headers=admin_headers, params={"q": "Beta"})
    assert search.status_code == 200
    assert any(payload["nir"] == p["nir"] for p in search.json())


def test_patient_validation_rejects_bad_email(client, admin_headers):
    response = client.post(
        "/api/v1/patients/",
        headers=admin_headers,
        json={"full_name": "Patient Synthetique Gamma", "email": "not-an-email"},
    )
    assert response.status_code == 422
