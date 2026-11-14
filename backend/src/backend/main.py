"""FastAPI app: JSON API under /api and the static frontend at /."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.chat import ChatRequest, ChatResponse, run_chat
from backend.db import init_db

DB_PATH = Path(os.environ.get("PRELEGAL_DB_PATH", "data/prelegal.db"))
STATIC_DIR = Path(os.environ.get("PRELEGAL_STATIC_DIR", "../frontend/out"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create a fresh database when the server starts."""
    init_db(DB_PATH)
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report that the API is up."""
    return {"status": "ok"}


@app.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    """Send the conversation to the AI and return its reply and updated NDA fields."""
    return run_chat(request)


if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
