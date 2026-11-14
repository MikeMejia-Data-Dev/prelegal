"""Sign up, sign in and JWT bearer authentication."""

import hashlib
import hmac
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

from backend.db import connect

# A new secret each start: tokens end with the server, like the temporary database.
SECRET = secrets.token_hex(32)
TOKEN_LIFETIME = timedelta(hours=24)

router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        email = email.strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("Enter a valid email address.")
        return email


class Session(BaseModel):
    token: str
    email: str


class User(BaseModel):
    id: int
    email: str


def hash_password(password: str) -> str:
    """Salted scrypt hash, stored as 'salt:key' in hex."""
    salt = os.urandom(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, key = stored.split(":")
    candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1)
    return hmac.compare_digest(candidate.hex(), key)


def create_token(user_id: int) -> str:
    expires = datetime.now(UTC) + TOKEN_LIFETIME
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET, algorithm="HS256")


def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> User:
    """The signed-in user, from the Bearer token; 401 if missing, invalid or expired."""
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in.")
    if credentials is None:
        raise unauthorized
    try:
        user_id = int(jwt.decode(credentials.credentials, SECRET, algorithms=["HS256"])["sub"])
    except jwt.PyJWTError:
        raise unauthorized
    with connect() as conn:
        row = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise unauthorized
    return User(id=row["id"], email=row["email"])


CurrentUser = Annotated[User, Depends(current_user)]


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def sign_up(credentials: Credentials) -> Session:
    """Create an account and sign it in."""
    with connect() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (credentials.email,)).fetchone():
            raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (credentials.email, hash_password(credentials.password)),
        )
    return Session(token=create_token(cursor.lastrowid), email=credentials.email)


@router.post("/auth/signin")
def sign_in(credentials: Credentials) -> Session:
    """Check the password and return a new token."""
    with connect() as conn:
        row = conn.execute("SELECT id, password_hash FROM users WHERE email = ?", (credentials.email,)).fetchone()
    if row is None or not verify_password(credentials.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return Session(token=create_token(row["id"]), email=credentials.email)


@router.get("/me")
def me(user: CurrentUser) -> User:
    """The signed-in user."""
    return user
