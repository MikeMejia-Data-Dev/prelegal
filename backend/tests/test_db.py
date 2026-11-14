import sqlite3

from backend.db import init_db


def test_init_db_creates_users_table(tmp_path):
    db = tmp_path / "sub" / "app.db"
    init_db(db)
    with sqlite3.connect(db) as conn:
        cols = [row[1] for row in conn.execute("PRAGMA table_info(users)")]
    assert cols == ["id", "email", "password_hash", "created_at"]


def test_init_db_starts_from_scratch(tmp_path):
    db = tmp_path / "app.db"
    init_db(db)
    with sqlite3.connect(db) as conn:
        conn.execute("INSERT INTO users (email, password_hash) VALUES ('a@b.c', 'x')")
    init_db(db)
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
