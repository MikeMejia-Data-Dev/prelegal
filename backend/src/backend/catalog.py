"""Supported documents, loaded from documents.json at the repository root."""

import json
from pathlib import Path

DOCUMENTS_PATH = Path(__file__).resolve().parents[3] / "documents.json"
DOCUMENTS: list[dict] = json.loads(DOCUMENTS_PATH.read_text())["documents"]
DOCUMENT_IDS = tuple(doc["id"] for doc in DOCUMENTS)
NDA_ID = "mutual-nda"


def _key_term(term: dict) -> str:
    required = "required" if term["required"] else "optional"
    description = f" - {term['description']}" if term.get("description") else ""
    return f"    - {term['key']} ({term['label']}, {required}){description}"


def _document(doc: dict) -> str:
    lines = [f"- id `{doc['id']}`: {doc['name']}. {doc['description']} Parties: party1 = {doc['parties'][0]}, party2 = {doc['parties'][1]}."]
    if doc["keyTerms"]:
        lines.append("  keyTerms:")
        lines += [_key_term(term) for term in doc["keyTerms"]]
    return "\n".join(lines)


def catalog_text() -> str:
    """Describe every supported document for the system prompt."""
    return "\n".join(_document(doc) for doc in DOCUMENTS)
