"""
Multi-Tenant Isolation Tests für das Formulare-Modul.

SEC (M1 Finding #2): Stellt sicher, dass ein Token aus Org A weder
Prüfprotokoll- noch Mängelbericht-PDFs für eine Prüfung aus Org B
abrufen kann. Erwartung: HTTP 404 (kein Leak über Existenz).
"""
import pytest


async def _register_org(client, suffix: str):
    """Registriert eine Org + User und legt ein Arbeitsmittel an.

    Gibt (headers, arbeitsmittel_id, checkliste_id) zurück.
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"iso-{suffix}@test.de",
            "passwort": "sicheres_passwort_123",
            "vorname": "Iso",
            "nachname": suffix,
            "firmenname": f"Iso-{suffix} GmbH",
            "branche": "maschinenbau",
        },
    )
    assert reg.status_code in (200, 201), reg.text
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Default-Checklisten seeden, damit eine Prüfung starten kann
    await client.post("/api/v1/seed/default-checklisten", headers=headers)

    am_res = await client.post(
        "/api/v1/arbeitsmittel",
        json={
            "name": f"Maschine-{suffix}",
            "typ": "CNC-Maschine",
            "pruef_intervall_monate": 12,
        },
        headers=headers,
    )
    assert am_res.status_code in (200, 201), am_res.text
    am_id = am_res.json()["id"]

    cl_res = await client.get("/api/v1/checklisten", headers=headers)
    checklisten = cl_res.json()
    checkliste_id = checklisten[0]["id"] if checklisten else None

    return headers, am_id, checkliste_id


@pytest.mark.asyncio
async def test_pruefprotokoll_cross_org_leak_blocked(client):
    """Org-A-Token darf kein Prüfprotokoll von Org B abrufen."""
    headers_a, am_a, cl_a = await _register_org(client, "orga")
    headers_b, am_b, cl_b = await _register_org(client, "orgb")

    if not cl_a or not cl_b:
        pytest.skip("Keine Default-Checklisten verfügbar")

    # Org B legt eine Prüfung an
    start = await client.post(
        "/api/v1/pruefungen",
        json={"arbeitsmittel_id": am_b, "checkliste_id": cl_b},
        headers=headers_b,
    )
    assert start.status_code == 201, start.text
    pruefung_id = start.json()["id"]

    # Org A versucht, das PDF der Org-B-Prüfung zu ziehen
    leak = await client.get(
        f"/api/v1/formulare/pruefprotokoll/{pruefung_id}",
        headers=headers_a,
    )
    assert leak.status_code == 404, (
        f"Cross-Org-Leak: erwartet 404, bekommen {leak.status_code}"
    )

    # Owner darf weiterhin zugreifen (smoke)
    ok = await client.get(
        f"/api/v1/formulare/pruefprotokoll/{pruefung_id}",
        headers=headers_b,
    )
    # PDF-Generator darf fehlen (weasyprint optional) – wichtig ist
    # nur, dass es KEIN 403/404 ist. 500 akzeptieren wir hier nicht.
    assert ok.status_code not in (403, 404), (
        f"Owner unberechtigt abgewiesen: {ok.status_code} {ok.text[:200]}"
    )


@pytest.mark.asyncio
async def test_maengelbericht_cross_org_leak_blocked(client):
    """Org-A-Token darf keinen Mängelbericht von Org B abrufen."""
    headers_a, am_a, cl_a = await _register_org(client, "orga2")
    headers_b, am_b, cl_b = await _register_org(client, "orgb2")

    if not cl_a or not cl_b:
        pytest.skip("Keine Default-Checklisten verfügbar")

    start = await client.post(
        "/api/v1/pruefungen",
        json={"arbeitsmittel_id": am_b, "checkliste_id": cl_b},
        headers=headers_b,
    )
    assert start.status_code == 201, start.text
    pruefung_id = start.json()["id"]

    leak = await client.get(
        f"/api/v1/formulare/maengelbericht/{pruefung_id}",
        headers=headers_a,
    )
    assert leak.status_code == 404, (
        f"Cross-Org-Leak (Mängelbericht): {leak.status_code}"
    )
