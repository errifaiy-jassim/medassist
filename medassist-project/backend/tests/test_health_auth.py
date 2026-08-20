def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "MedAssist API"
    assert body["database"] in {"connected", "unavailable"}
    assert body["status"] in {"ok", "degraded"}


def test_root_status(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "MedAssist" in response.json()["status"]


def test_login_success(client, admin_credentials):
    response = client.post("/api/v1/auth/login", json=admin_credentials)
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "admin.test@medassist.local"
    assert "hashed_password" not in body["user"]


def test_login_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin.test@medassist.local", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiants invalides"


def test_me_requires_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_token(client, admin_headers):
    response = client.get("/api/v1/auth/me", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "admin.test@medassist.local"


def test_logout(client, admin_headers):
    response = client.post("/api/v1/auth/logout", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
