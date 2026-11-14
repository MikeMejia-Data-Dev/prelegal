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
