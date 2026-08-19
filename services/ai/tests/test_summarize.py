import json
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import claude


client = TestClient(app)


@pytest.fixture
def valid_request():
    return {
        "monitors": [
            {
                "name": "API",
                "url": "https://api.example.com",
                "status": "up",
                "uptime_24h": 99.9,
                "avg_latency_ms": 120,
            }
        ]
    }


def test_summarize_disabled_without_key(valid_request, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    response = client.post("/summarize", json=valid_request)
    assert response.status_code == 503
    assert "AI summaries are disabled" in response.json()["detail"]


def test_summarize_success(valid_request, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key-12345")

    # Mock the summarize function to return a successful response
    def mock_summarize(payload, client=None):
        return "All systems operational.", "claude-opus-5"

    monkeypatch.setattr(claude, "summarize", mock_summarize)

    response = client.post("/summarize", json=valid_request)
    assert response.status_code == 200
    data = response.json()
    assert data["summary"] == "All systems operational."
    assert data["model"] == "claude-opus-5"


def test_summarize_refusal(valid_request, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key-12345")

    # Monkeypatch the summarize function to raise ClaudeRefusalError
    def mock_summarize(payload, client=None):
        raise claude.ClaudeRefusalError("The model declined to summarize this input.")

    monkeypatch.setattr(claude, "summarize", mock_summarize)

    response = client.post("/summarize", json=valid_request)
    assert response.status_code == 502
    assert "declined" in response.json()["detail"]


def test_summarize_api_error(valid_request, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key-12345")

    # Mock the summarize function to raise APIStatusError
    import anthropic

    def mock_summarize(payload, client=None):
        raise anthropic.APIStatusError(
            message="Rate limited",
            response=MagicMock(status_code=429),
            body={"error": "rate_limited"},
        )

    monkeypatch.setattr(claude, "summarize", mock_summarize)

    response = client.post("/summarize", json=valid_request)
    assert response.status_code == 502
    assert "Upstream AI error" in response.json()["detail"]


def test_summarize_empty_monitors():
    response = client.post("/summarize", json={"monitors": []})
    assert response.status_code == 422


def test_summarize_invalid_status():
    response = client.post(
        "/summarize",
        json={
            "monitors": [
                {
                    "name": "API",
                    "url": "https://api.example.com",
                    "status": "invalid",
                    "uptime_24h": 99.9,
                }
            ]
        },
    )
    assert response.status_code == 422


def test_claude_summarize_with_fake_client():
    fake_response = MagicMock()
    fake_response.stop_reason = "end_turn"
    fake_response.model = "claude-opus-5"

    fake_block = MagicMock()
    fake_block.type = "text"
    fake_block.text = "Status summary here."
    fake_response.content = [fake_block]

    fake_client = MagicMock()
    fake_client.beta.messages.create.return_value = fake_response

    payload = json.dumps([{"name": "API", "status": "up"}])
    summary, model = claude.summarize(payload, client=fake_client)

    assert summary == "Status summary here."
    assert model == "claude-opus-5"


def test_claude_summarize_refusal_with_fake_client():
    fake_response = MagicMock()
    fake_response.stop_reason = "refusal"
    fake_response.model = "claude-opus-5"
    fake_response.content = []

    fake_client = MagicMock()
    fake_client.beta.messages.create.return_value = fake_response

    payload = json.dumps([{"name": "API", "status": "up"}])

    with pytest.raises(claude.ClaudeRefusalError):
        claude.summarize(payload, client=fake_client)


def test_claude_summarize_multi_block_text():
    fake_response = MagicMock()
    fake_response.stop_reason = "end_turn"
    fake_response.model = "claude-opus-5"

    # Multiple text blocks
    block1 = MagicMock()
    block1.type = "text"
    block1.text = "First part. "

    block2 = MagicMock()
    block2.type = "text"
    block2.text = "Second part."

    # Non-text block should be skipped
    block3 = MagicMock()
    block3.type = "other"
    block3.text = "Should be ignored"

    fake_response.content = [block1, block2, block3]

    fake_client = MagicMock()
    fake_client.beta.messages.create.return_value = fake_response

    payload = json.dumps([{"name": "API", "status": "up"}])
    summary, model = claude.summarize(payload, client=fake_client)

    assert summary == "First part. Second part."
    assert model == "claude-opus-5"
