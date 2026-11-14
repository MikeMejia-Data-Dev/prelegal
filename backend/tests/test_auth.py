import jwt
import pytest

from backend import auth
from conftest import PASSWORD, sign_up


def test_password_hash_is_salted_and_verifiable():
    first, second = auth.hash_password(PASSWORD), auth.hash_password(PASSWORD)
    assert first != second
    assert PASSWORD not in first
    assert auth.verify_password(PASSWORD, first)
    assert not auth.verify_password("wrong password", first)


def test_sign_up_returns_a_working_token(client):
    response = client.post("/api/auth/signup", json={"email": " Ada@Example.com ", "password": PASSWORD})
    assert response.status_code == 201
    assert response.json()["email"] == "ada@example.com"
    me = client.get("/api/me", headers={"Authorization": f"Bearer {response.json()['token']}"})
    assert me.json()["email"] == "ada@example.com"


def test_sign_up_rejects_a_duplicate_email(client):
    sign_up(client)
    response = client.post("/api/auth/signup", json={"email": "ADA@example.com", "password": PASSWORD})
    assert response.status_code == 409


@pytest.mark.parametrize(
    "body",
    [{"email": "not-an-email", "password": PASSWORD}, {"email": "ada@example.com", "password": "short"}],
)
def test_sign_up_validates_input(client, body):
    assert client.post("/api/auth/signup", json=body).status_code == 422


def test_sign_in_with_the_right_password(client):
    sign_up(client)
    response = client.post("/api/auth/signin", json={"email": "ada@example.com", "password": PASSWORD})
    assert response.status_code == 200
    assert response.json()["token"]


@pytest.mark.parametrize("email,password", [("ada@example.com", "wrong password"), ("nobody@example.com", PASSWORD)])
def test_sign_in_rejects_bad_credentials(client, email, password):
    sign_up(client)
    response = client.post("/api/auth/signin", json={"email": email, "password": password})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."


def test_me_requires_a_valid_token(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    forged = jwt.encode({"sub": "1"}, "another secret", algorithm="HS256")
    assert client.get("/api/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_expired_token_is_rejected(client, monkeypatch):
    sign_up(client)
    monkeypatch.setattr(auth, "TOKEN_LIFETIME", -auth.TOKEN_LIFETIME)
    token = auth.create_token(1)
    assert client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_accounts_are_gone_after_a_restart(client):
    token = sign_up(client)
    with client:  # restarting the app recreates the database
        pass
    with client:
        assert client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
