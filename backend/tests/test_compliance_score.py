"""
Compliance Score Tests — BG-Ready-Score calculation
"""
import pytest


async def _get_token(client, email="comp@test.de"):
    res = await client.post("/api/v1/auth/register", json={
        "email": email,
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": "maschinenbau",
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_score_empty_org(client):
    """Score with no Arbeitsmittel should return 0 with suggestion."""
    token = await _get_token(client, "empty@comp.de")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/compliance/score", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["score"] == 0
    assert data["ampel"] == "unbekannt"
    assert len(data["top_massnahmen"]) > 0


@pytest.mark.asyncio
async def test_score_with_arbeitsmittel(client):
    """Score with Arbeitsmittel should be > 0."""
    token = await _get_token(client, "withdata@comp.de")
    headers = {"Authorization": f"Bearer {token}"}

    # Create Arbeitsmittel
    await client.post("/api/v1/arbeitsmittel", json={
        "name": "Testmaschine",
        "typ": "CNC",
        "pruef_intervall_monate": 12,
    }, headers=headers)

    res = await client.get("/api/v1/compliance/score", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["score"] > 0
    assert data["details"]["arbeitsmittel_gesamt"] == 1


@pytest.mark.asyncio
async def test_score_response_structure(client):
    """Verify response structure of compliance score."""
    token = await _get_token(client, "struct@comp.de")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/compliance/score", headers=headers)
    data = res.json()

    assert "score" in data
    assert "ampel" in data
    assert "details" in data
    assert "top_massnahmen" in data
    assert isinstance(data["top_massnahmen"], list)

    details = data["details"]
    assert "pruefungen_aktuell_prozent" in details
    assert "maengel_offen" in details
    assert "arbeitsmittel_gesamt" in details
