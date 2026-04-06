"""
Arbeitsmittel Tests — CRUD, Pagination, Filter, Multi-Tenant Isolation
"""
import pytest


async def _register_and_get_token(client, email="crud@test.de", branche="maschinenbau"):
    res = await client.post("/api/v1/auth/register", json={
        "email": email,
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": branche,
    })
    return res.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_arbeitsmittel(client):
    token = await _register_and_get_token(client, "create@am.de")
    res = await client.post("/api/v1/arbeitsmittel", json={
        "name": "CNC-Fräse Halle 1",
        "typ": "CNC-Maschine",
        "hersteller": "DMG Mori",
        "pruef_intervall_monate": 12,
    }, headers=_auth(token))
    assert res.status_code == 201
    assert res.json()["name"] == "CNC-Fräse Halle 1"
    assert res.json()["typ"] == "CNC-Maschine"


@pytest.mark.asyncio
async def test_list_arbeitsmittel(client):
    token = await _register_and_get_token(client, "list@am.de")
    headers = _auth(token)

    # Create 3 items
    for name in ["Drehmaschine", "Schweißgerät", "Leiter"]:
        await client.post("/api/v1/arbeitsmittel", json={
            "name": name, "typ": "Allgemein", "pruef_intervall_monate": 12,
        }, headers=headers)

    res = await client.get("/api/v1/arbeitsmittel", headers=headers)
    assert res.status_code == 200
    assert res.json()["total"] == 3


@pytest.mark.asyncio
async def test_update_arbeitsmittel(client):
    token = await _register_and_get_token(client, "update@am.de")
    headers = _auth(token)

    create_res = await client.post("/api/v1/arbeitsmittel", json={
        "name": "Altes Gerät", "typ": "Leiter", "pruef_intervall_monate": 6,
    }, headers=headers)
    am_id = create_res.json()["id"]

    res = await client.put(f"/api/v1/arbeitsmittel/{am_id}", json={
        "name": "Neues Gerät",
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Neues Gerät"


@pytest.mark.asyncio
async def test_delete_arbeitsmittel(client):
    token = await _register_and_get_token(client, "delete@am.de")
    headers = _auth(token)

    create_res = await client.post("/api/v1/arbeitsmittel", json={
        "name": "Zum Löschen", "typ": "Leiter", "pruef_intervall_monate": 12,
    }, headers=headers)
    am_id = create_res.json()["id"]

    res = await client.delete(f"/api/v1/arbeitsmittel/{am_id}", headers=headers)
    assert res.status_code == 204

    res = await client.get(f"/api/v1/arbeitsmittel/{am_id}", headers=headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_multi_tenant_isolation(client):
    """Org A should not see Org B's Arbeitsmittel."""
    token_a = await _register_and_get_token(client, "orga@test.de")
    token_b = await _register_and_get_token(client, "orgb@test.de")

    # Org A creates item
    await client.post("/api/v1/arbeitsmittel", json={
        "name": "Geheim-Maschine", "typ": "CNC", "pruef_intervall_monate": 12,
    }, headers=_auth(token_a))

    # Org B should not see it
    res = await client.get("/api/v1/arbeitsmittel", headers=_auth(token_b))
    assert res.json()["total"] == 0


@pytest.mark.asyncio
async def test_search_filter(client):
    token = await _register_and_get_token(client, "search@am.de")
    headers = _auth(token)

    await client.post("/api/v1/arbeitsmittel", json={
        "name": "CNC-Fräse", "typ": "CNC-Maschine", "pruef_intervall_monate": 12,
    }, headers=headers)
    await client.post("/api/v1/arbeitsmittel", json={
        "name": "Leiter Alu", "typ": "Leiter", "pruef_intervall_monate": 12,
    }, headers=headers)

    res = await client.get("/api/v1/arbeitsmittel?suche=CNC", headers=headers)
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["name"] == "CNC-Fräse"
