import os
import sqlite3

from fastapi.testclient import TestClient

from backend.main import app


def test_health():
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}


def test_startup_creates_database():
    with TestClient(app):
        with sqlite3.connect(os.environ["PRELEGAL_DB_PATH"]) as conn:
            assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0


def test_serves_login_page_at_root():
    with TestClient(app) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert "login" in response.text


def test_serves_nda_page():
    with TestClient(app) as client:
        response = client.get("/nda/")
    assert response.status_code == 200
    assert "nda" in response.text


def test_unknown_path_is_404():
    with TestClient(app) as client:
        assert client.get("/nope").status_code == 404
