"""Point the app at a temp database and a fake static site before import."""

import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp())
(_tmp / "static" / "nda").mkdir(parents=True)
(_tmp / "static" / "index.html").write_text("<h1>login</h1>")
(_tmp / "static" / "nda" / "index.html").write_text("<h1>nda</h1>")
os.environ["PRELEGAL_DB_PATH"] = str(_tmp / "db" / "test.db")
os.environ["PRELEGAL_STATIC_DIR"] = str(_tmp / "static")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.main import app  # noqa: E402

PASSWORD = "correct horse battery"


@pytest.fixture
def client():
    """A client with a fresh database (the app recreates it on startup)."""
    with TestClient(app) as test_client:
        yield test_client


def sign_up(client: TestClient, email: str = "ada@example.com") -> str:
    """Create an account and return its bearer token."""
    response = client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    assert response.status_code == 201
    return response.json()["token"]


@pytest.fixture
def signed_in(client):
    """A client signed in as ada@example.com."""
    client.headers["Authorization"] = f"Bearer {sign_up(client)}"
    return client
