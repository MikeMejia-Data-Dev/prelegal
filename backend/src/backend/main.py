"""FastAPI app: JSON API under /api and the static frontend at /."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend import auth, documents
from backend.auth import CurrentUser
from backend.chat import ChatRequest, ChatResponse, run_chat
from backend.db import init_db

STATIC_DIR = Path(os.environ.get("PRELEGAL_STATIC_DIR", "../frontend/out"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create a fresh database when the server starts."""
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(documents.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report that the API is up."""
    return {"status": "ok"}


@app.post("/api/chat")
def chat(request: ChatRequest, user: CurrentUser) -> ChatResponse:
    """Send the conversation to the AI and return its reply and the updated draft."""
    return run_chat(request)


if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
