"""SQLite database, recreated from scratch on every startup."""

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def init_db(path: Path) -> None:
    """Delete any existing database at `path` and create a fresh schema."""
    path.unlink(missing_ok=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA)
