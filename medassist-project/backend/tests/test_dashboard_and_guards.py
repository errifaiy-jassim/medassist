"""API client / connectivity edge cases."""


def test_api_rejects_unauthenticated_stt(client):
    response = client.post(
        "/api/v1/stt/transcribe",
        files={"file": ("note.webm", b"x", "audio/webm")},
    )
    assert response.status_code == 401


def test_dashboard_stats_authenticated(client, admin_headers):
    response = client.get("/api/v1/dashboard/stats", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert "consultations_today" in body
    assert "recent_activity" in body
    # No fabricated demo keys
    assert "demo" not in body
