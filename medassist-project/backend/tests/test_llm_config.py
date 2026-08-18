"""LLM configuration and allowlist tests — no clinical text, no outbound LLM calls."""

from __future__ import annotations

import json
import socket
from unittest.mock import MagicMock, patch
from urllib.parse import urlparse

import pytest
import requests

from app.core.config import assert_llm_host_allowed, settings
from app.core.llm_service import LLMService, normalize_extracted_entities


@pytest.fixture
def restore_llm_hosts():
    original = settings.LLM_ALLOWED_HOSTS
    yield
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", original)


def test_empty_allowlist_blocks_loopback(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "")
    with pytest.raises(RuntimeError, match="empty"):
        assert_llm_host_allowed("http://127.0.0.1:11434/api/generate")


def test_exact_127_allows_127(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "127.0.0.1")
    assert_llm_host_allowed("http://127.0.0.1:11434/api/generate")


def test_exact_127_blocks_localhost(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "127.0.0.1")
    with pytest.raises(RuntimeError, match="not in LLM_ALLOWED_HOSTS"):
        assert_llm_host_allowed("http://localhost:11434/api/generate")


def test_exact_localhost_allows_localhost(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "localhost")
    assert_llm_host_allowed("http://localhost:11434/api/generate")


def test_allowlist_is_exact_host_not_substring(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "127.0.0.1")
    with pytest.raises(RuntimeError):
        assert_llm_host_allowed("http://127.0.0.1.evil.example/api/generate")


def test_configured_defaults_are_local_ollama_shape():
    parsed = urlparse(settings.LLM_API_URL)
    assert parsed.scheme in {"http", "https"}
    assert parsed.path.rstrip("/").endswith("/api/generate")
    assert settings.LLM_MODEL_NAME
    assert settings.llm_allowed_hosts_list  # fail-closed: empty would block
    assert_llm_host_allowed(settings.LLM_API_URL)


def test_normalize_extracted_entities_stable():
    raw = {
        "diagnostics": [{"label": "Migraine"}],
        "symptoms": ["céphalées"],
        "prescriptions": [{"drug_name": "Paracétamol", "dosage": "1g", "frequency": "x3"}],
        "biology": [{"test_name": "NFS"}],
        "imaging": [],
        "structured_summary": "Céphalées — migraine",
    }
    out = normalize_extracted_entities(raw)
    assert out["diagnoses"][0]["label"] == "Migraine"
    assert out["symptoms"][0]["label"] == "céphalées"
    assert out["medications"][0]["drug_name"] == "Paracétamol"
    assert out["biology"][0]["test_name"] == "NFS"


def test_extract_medical_data_refuses_redirects_and_uses_timeout(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "127.0.0.1")
    service = LLMService()
    service.ollama_url = "http://127.0.0.1:11434/api/generate"

    fake = MagicMock()
    fake.status_code = 200
    fake.json.return_value = {
        "response": json.dumps(
            {
                "diagnostics": [],
                "symptoms": [],
                "prescriptions": [],
                "biology": [],
                "imaging": [],
                "structured_summary": None,
            }
        )
    }

    with patch("app.core.llm_service.requests.post", return_value=fake) as post:
        service.extract_medical_data("patient rapporte des céphalées")
        kwargs = post.call_args.kwargs
        assert kwargs["timeout"] == 90
        assert kwargs["allow_redirects"] is False
        assert post.call_args.args[0] == "http://127.0.0.1:11434/api/generate"


def test_extract_medical_data_blocks_before_http_when_not_allowlisted(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "")
    service = LLMService()
    service.ollama_url = "http://127.0.0.1:11434/api/generate"
    with patch("app.core.llm_service.requests.post") as post:
        with pytest.raises(RuntimeError, match="empty"):
            service.extract_medical_data("texte clinique")
        post.assert_not_called()


def test_extract_medical_data_maps_timeout(restore_llm_hosts):
    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "127.0.0.1")
    service = LLMService()
    service.ollama_url = "http://127.0.0.1:11434/api/generate"
    with patch(
        "app.core.llm_service.requests.post",
        side_effect=requests.Timeout(),
    ):
        with pytest.raises(RuntimeError, match="timed out"):
            service.extract_medical_data("texte")


def test_settings_endpoint_reports_allowlist_honestly(client, admin_headers, restore_llm_hosts):
    ok = client.get("/api/v1/settings/", headers=admin_headers)
    assert ok.status_code == 200
    assert ok.json()["llm_host_allowlisted"] is True
    assert "LLM_API_URL" not in ok.text

    object.__setattr__(settings, "LLM_ALLOWED_HOSTS", "")
    blocked = client.get("/api/v1/settings/", headers=admin_headers)
    assert blocked.status_code == 200
    assert blocked.json()["llm_host_allowlisted"] is False


def test_ollama_port_probe_optional_no_clinical_request():
    """TCP probe only — skip live generate if Ollama is down (expected in CI)."""
    parsed = urlparse(settings.LLM_API_URL)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    sock = socket.socket()
    sock.settimeout(1.0)
    try:
        sock.connect((host, port))
        reachable = True
    except OSError:
        reachable = False
    finally:
        sock.close()

    if not reachable:
        pytest.skip(f"Ollama not reachable at {host}:{port}; skipped live probe")

    # Reachable: HEAD/GET tags is enough — still no clinical prompt.
    url = f"{parsed.scheme}://{host}:{port}/api/tags"
    response = requests.get(url, timeout=3)
    assert response.status_code == 200
