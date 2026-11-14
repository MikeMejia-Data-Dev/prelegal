from conftest import sign_up

PARTY = {"company": "Acme, Inc.", "name": "", "title": "", "noticeAddress": ""}
GENERIC = {"keyTerms": [{"key": "fees", "value": "$1,000 per month"}], "party1": PARTY, "party2": PARTY}
NDA = {
    "purpose": "Evaluating a deal.",
    "effectiveDate": "2026-11-14",
    "mndaTerm": {"kind": "untilTerminated"},
    "confidentialityTerm": {"kind": "perpetual"},
    "governingLaw": "Delaware",
    "jurisdiction": "New Castle, DE",
    "modifications": "",
    "party1": PARTY,
    "party2": PARTY,
}


def save(client, document_id="csa", fields=GENERIC, title="Cloud Service Agreement · Acme"):
    return client.post("/api/documents", json={"documentId": document_id, "title": title, "fields": fields})


def test_documents_require_sign_in(client):
    assert client.get("/api/documents").status_code == 401
    assert save(client).status_code == 401


def test_save_list_and_open_documents(signed_in):
    first = save(signed_in).json()
    second = save(signed_in, "mutual-nda", NDA, "Mutual NDA · Acme").json()
    assert first["id"] != second["id"]
    assert first["createdAt"]

    listed = signed_in.get("/api/documents").json()
    assert [d["title"] for d in listed] == ["Mutual NDA · Acme", "Cloud Service Agreement · Acme"]
    assert "fields" not in listed[0]

    nda = signed_in.get(f"/api/documents/{second['id']}").json()
    assert nda["documentId"] == "mutual-nda"
    assert nda["fields"] == NDA
    assert signed_in.get(f"/api/documents/{first['id']}").json()["fields"] == GENERIC


def test_users_only_see_their_own_documents(client):
    ada = {"Authorization": f"Bearer {sign_up(client, 'ada@example.com')}"}
    bob = {"Authorization": f"Bearer {sign_up(client, 'bob@example.com')}"}
    saved = client.post(
        "/api/documents", json={"documentId": "csa", "title": "Ada's CSA", "fields": GENERIC}, headers=ada
    ).json()
    assert client.get("/api/documents", headers=bob).json() == []
    assert client.get(f"/api/documents/{saved['id']}", headers=bob).status_code == 404


def test_save_validates_the_document(signed_in):
    assert save(signed_in, document_id="lease").status_code == 422
    assert save(signed_in, title="").status_code == 422
    assert save(signed_in, fields={"purpose": "x"}).status_code == 422


def test_missing_document_is_404(signed_in):
    assert signed_in.get("/api/documents/999").status_code == 404
