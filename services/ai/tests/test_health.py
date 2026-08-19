import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_ok():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True


def test_health_ai_disabled_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ai_enabled"] is False


def test_health_ai_enabled_with_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key-12345")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ai_enabled"] is True
