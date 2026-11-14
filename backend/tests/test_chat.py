import json
import os
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from backend import chat
from backend.catalog import DOCUMENT_IDS, catalog_text
from backend.chat import ChatRequest, GenericFields, NdaFields, build_messages, run_chat
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

GENERIC = {"keyTerms": [{"key": "fees", "value": "$1,000 per month"}], "party1": EMPTY_PARTY, "party2": EMPTY_PARTY}


def fake_completion(content: dict):
    """Return a stand-in for litellm.completion that answers with `content`."""

    def complete(**kwargs):
        complete.kwargs = kwargs
        message = SimpleNamespace(content=json.dumps(content))
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    return complete


def ask(text: str, document_id=None, fields=None) -> ChatRequest:
    return ChatRequest(messages=[{"role": "user", "content": text}], documentId=document_id, fields=fields)


def test_catalog_lists_every_document_and_its_key_terms():
    text = catalog_text()
    assert len(DOCUMENT_IDS) == 11
    for document_id in DOCUMENT_IDS:
        assert f"`{document_id}`" in text
    assert "subscriptionPeriod (Subscription Period, required)" in text
    assert "party1 = Provider, party2 = Customer" in text


def test_build_messages_includes_catalog_history_and_state():
    messages = build_messages(ask("hi", "mutual-nda", FIELDS))
    assert messages[0]["role"] == "system"
    assert "Cloud Service Agreement" in messages[0]["content"]
    assert messages[1] == {"role": "user", "content": "hi"}
    assert "Current documentId: mutual-nda" in messages[-1]["content"]
    assert "Evaluating whether" in messages[-1]["content"]


def test_build_messages_before_a_document_is_chosen():
    assert "Current documentId: None. Current fields: null" in build_messages(ask("hi"))[-1]["content"]


def test_run_chat_parses_nda_fields(monkeypatch):
    updated = {**FIELDS, "governingLaw": "Delaware", "mndaTerm": {"kind": "untilTerminated"}}
    fake = fake_completion({"reply": "Noted.", "question": "Who are the parties?", "documentId": "mutual-nda", "fields": updated})
    monkeypatch.setattr(chat, "completion", fake)
    result = run_chat(ask("Delaware"))
    assert fake.kwargs["response_format"] is chat.AiTurn
    assert isinstance(result.fields, NdaFields)
    assert result.fields.mndaTerm.kind == "untilTerminated"


def test_run_chat_parses_generic_fields(monkeypatch):
    turn = {"reply": "Noted.", "question": "What is the Effective Date?", "documentId": "csa", "fields": GENERIC}
    monkeypatch.setattr(chat, "completion", fake_completion(turn))
    result = run_chat(ask("CSA please"))
    assert result.documentId == "csa"
    assert isinstance(result.fields, GenericFields)
    assert result.fields.keyTerms[0].value == "$1,000 per month"


def test_run_chat_appends_the_follow_up_question(monkeypatch):
    turn = {"reply": "  Recorded Acme as the provider. ", "question": " Who is the customer? ", "documentId": "csa", "fields": GENERIC}
    monkeypatch.setattr(chat, "completion", fake_completion(turn))
    assert run_chat(ask("Acme is the provider")).reply == "Recorded Acme as the provider. Who is the customer?"


def test_run_chat_defaults_a_blank_nda_date_to_today(monkeypatch):
    turn = {"reply": "Noted.", "question": "Who?", "documentId": "mutual-nda", "fields": {**FIELDS, "effectiveDate": ""}}
    monkeypatch.setattr(chat, "completion", fake_completion(turn))
    assert run_chat(ask("NDA")).fields.effectiveDate == date.today().isoformat()


def test_chat_endpoint(monkeypatch):
    turn = {"reply": "Hello!", "question": "Which document do you need?", "documentId": None, "fields": None}
    monkeypatch.setattr(chat, "completion", fake_completion(turn))
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "documentId": None, "fields": None})
    assert response.status_code == 200
    assert response.json() == {"reply": "Hello! Which document do you need?", "documentId": None, "fields": None}


def test_chat_endpoint_round_trips_generic_fields(monkeypatch):
    turn = {"reply": "Noted.", "question": "What else?", "documentId": "csa", "fields": GENERIC}
    monkeypatch.setattr(chat, "completion", fake_completion(turn))
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "documentId": "csa", "fields": GENERIC})
    assert response.json() == {"reply": "Noted. What else?", "documentId": "csa", "fields": GENERIC}


def test_chat_endpoint_rejects_unknown_document():
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "documentId": "lease", "fields": None})
    assert response.status_code == 422


def test_chat_endpoint_rejects_bad_fields():
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "documentId": None, "fields": {"purpose": "x"}})
    assert response.status_code == 422


live = pytest.mark.skipif(not os.environ.get("OPENAI_API_KEY"), reason="needs OPENAI_API_KEY")


@live
def test_live_llm_selects_and_fills_a_document():
    result = run_chat(ask("I need a cloud service agreement. Acme Inc is the provider and Globex is the customer."))
    assert result.documentId == "csa"
    assert isinstance(result.fields, GenericFields)
    assert result.fields.party1.company.startswith("Acme")
    assert "?" in result.reply


@live
def test_live_llm_fills_the_nda():
    result = run_chat(ask("Mutual NDA between Acme Inc and Globex Corp, governed by Delaware law."))
    assert result.documentId == "mutual-nda"
    assert isinstance(result.fields, NdaFields)
    assert result.fields.governingLaw == "Delaware"
    assert "Acme" in result.fields.party1.company + result.fields.party2.company
    assert "?" in result.reply


@live
def test_live_llm_offers_an_alternative_for_unsupported_documents():
    result = run_chat(ask("I need an employment contract for a new engineer."))
    assert result.documentId is None
    assert any(name in result.reply for name in ("Agreement", "Addendum"))
    assert "?" in result.reply
