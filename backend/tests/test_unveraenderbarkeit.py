"""
Unveränderbarkeit Tests — Completed protocols must NOT be modifiable
"""
import pytest


@pytest.mark.asyncio
async def test_abgeschlossene_pruefung_nicht_aenderbar(client):
    """A completed inspection should reject modifications.
    This is critical for BG compliance (revisionssicheres Protokoll)."""

    # Register and setup
    reg = await client.post("/api/v1/auth/register", json={
        "email": "unver@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Prüfer",
        "nachname": "Test",
        "firmenname": "Unveränderbar GmbH",
        "branche": "maschinenbau",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Seed checklisten
    await client.post("/api/v1/seed/default-checklisten", headers=headers)

    # Create Arbeitsmittel
    am_res = await client.post("/api/v1/arbeitsmittel", json={
        "name": "Prüfmaschine",
        "typ": "CNC-Maschine",
        "pruef_intervall_monate": 12,
    }, headers=headers)
    am_id = am_res.json()["id"]

    # Get checkliste
    cl_res = await client.get("/api/v1/checklisten", headers=headers)
    checklisten = cl_res.json()
    if not checklisten:
        pytest.skip("No checkliste available")
    checkliste_id = checklisten[0]["id"]

    # Start and close Prüfung
    start_res = await client.post("/api/v1/pruefungen/start", json={
        "arbeitsmittel_id": am_id,
        "checkliste_id": checkliste_id,
    }, headers=headers)

    if start_res.status_code != 201:
        pytest.skip("Could not start pruefung")

    pruefung_id = start_res.json()["id"]

    # Close the Prüfung
    close_res = await client.put(f"/api/v1/pruefungen/{pruefung_id}/abschliessen", json={
        "ergebnis": "bestanden",
        "unterschrift_name": "Max Tester",
    }, headers=headers)

    if close_res.status_code != 200:
        pytest.skip("Could not close pruefung")

    # Now try to modify — should be rejected
    # Try to add a Mangel to closed Prüfung
    mangel_res = await client.post(f"/api/v1/pruefungen/{pruefung_id}/maengel", json={
        "beschreibung": "Nachträglicher Mangel",
        "schweregrad": "rot",
    }, headers=headers)

    # Should be 400 or 403 — not 201
    assert mangel_res.status_code in [400, 403, 409], \
        f"Abgeschlossene Prüfung darf nicht geändert werden! Status: {mangel_res.status_code}"


@pytest.mark.asyncio
async def test_compliance_score_endpoint(client):
    """BG-Ready-Score endpoint should work."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": "score@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Score GmbH",
        "branche": "logistik",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/compliance/score", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "score" in data
    assert "ampel" in data
    assert "top_massnahmen" in data
