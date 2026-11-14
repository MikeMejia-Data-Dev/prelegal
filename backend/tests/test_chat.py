import json
import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from backend import chat
from backend.chat import ChatRequest, build_messages, run_chat
from backend.main import app

EMPTY_PARTY = {"company": "", "name": "", "title": "", "noticeAddress": ""}

FIELDS = {
    "purpose": "Evaluating whether to enter into a business relationship.",
    "effectiveDate": "2026-11-14",
    "mndaTerm": {"kind": "expires", "years": 1},
    "confidentialityTerm": {"kind": "years", "years": 1},
    "governingLaw": "",
    "jurisdiction": "",
    "modifications": "",
    "party1": EMPTY_PARTY,
    "party2": EMPTY_PARTY,
}


def fake_completion(content: dict):
    """Return a stand-in for litellm.completion that answers with `content`."""

    def complete(**kwargs):
        complete.kwargs = kwargs
        message = SimpleNamespace(content=json.dumps(content))
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    return complete


def test_build_messages_includes_history_and_fields():
    request = ChatRequest(messages=[{"role": "user", "content": "hi"}], fields=FIELDS)
    messages = build_messages(request)
    assert messages[0]["role"] == "system"
    assert messages[1] == {"role": "user", "content": "hi"}
    assert "Evaluating whether" in messages[-1]["content"]


def test_run_chat_uses_structured_output(monkeypatch):
    updated = {**FIELDS, "governingLaw": "Delaware", "mndaTerm": {"kind": "untilTerminated"}}
    fake = fake_completion({"reply": "Noted.", "fields": updated})
    monkeypatch.setattr(chat, "completion", fake)
    result = run_chat(ChatRequest(messages=[], fields=FIELDS))
    assert fake.kwargs["response_format"] is chat.ChatResponse
    assert result.reply == "Noted."
    assert result.fields.governingLaw == "Delaware"
    assert result.fields.mndaTerm.kind == "untilTerminated"


def test_chat_endpoint(monkeypatch):
    monkeypatch.setattr(chat, "completion", fake_completion({"reply": "Hello!", "fields": FIELDS}))
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "fields": FIELDS})
    assert response.status_code == 200
    assert response.json() == {"reply": "Hello!", "fields": FIELDS}


def test_chat_endpoint_rejects_bad_fields():
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "fields": {"purpose": "x"}})
    assert response.status_code == 422


@pytest.mark.skipif(not os.environ.get("OPENAI_API_KEY"), reason="needs OPENAI_API_KEY")
def test_live_llm_fills_fields():
    message = "NDA between Acme Inc and Globex Corp, governed by Delaware law."
    result = run_chat(ChatRequest(messages=[{"role": "user", "content": message}], fields=FIELDS))
    assert result.reply
    assert result.fields.governingLaw == "Delaware"
    assert "Acme" in result.fields.party1.company + result.fields.party2.company
