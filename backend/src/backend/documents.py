"""A user's saved (downloaded) documents."""

import json
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, TypeAdapter

from backend.auth import CurrentUser
from backend.chat import DocumentId, GenericFields, NdaFields
from backend.db import connect

router = APIRouter(prefix="/api/documents")

Fields = NdaFields | GenericFields
FIELDS = TypeAdapter(Fields)


class NewDocument(BaseModel):
    documentId: DocumentId
    title: str = Field(min_length=1, max_length=200)
    fields: Fields


class DocumentSummary(BaseModel):
    id: int
    documentId: DocumentId
    title: str
    createdAt: str


class SavedDocument(DocumentSummary):
    fields: Fields


def _summary(row) -> DocumentSummary:
    return DocumentSummary(id=row["id"], documentId=row["document_id"], title=row["title"], createdAt=row["created_at"])


@router.post("", status_code=status.HTTP_201_CREATED)
def save_document(document: NewDocument, user: CurrentUser) -> DocumentSummary:
    """Save a generated document for the signed-in user."""
    created_at = datetime.now(UTC).isoformat(timespec="seconds")
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO documents (user_id, document_id, title, fields, created_at) VALUES (?, ?, ?, ?, ?)",
            (user.id, document.documentId, document.title, document.fields.model_dump_json(), created_at),
        )
    return DocumentSummary(id=cursor.lastrowid, documentId=document.documentId, title=document.title, createdAt=created_at)


@router.get("")
def list_documents(user: CurrentUser) -> list[DocumentSummary]:
    """The signed-in user's documents, newest first."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, document_id, title, created_at FROM documents WHERE user_id = ? ORDER BY id DESC", (user.id,)
        ).fetchall()
    return [_summary(row) for row in rows]


@router.get("/{document_id}")
def get_document(document_id: int, user: CurrentUser) -> SavedDocument:
    """One of the signed-in user's documents; 404 for anyone else's."""
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?", (document_id, user.id)
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return SavedDocument(**_summary(row).model_dump(), fields=FIELDS.validate_python(json.loads(row["fields"])))
