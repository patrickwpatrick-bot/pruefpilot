"""
Multi-Tenant Isolation Tests für Mängel + Prüf-Punkte.

SEC (M1 Finding #3): Stellt sicher, dass ein Token aus Org A weder
Mängel von Org B lesen/ändern, noch Mängel oder Prüf-Punkte an
Prüfungen von Org B anlegen/ändern kann. Erwartung: HTTP 404 (kein
Leak über Existenz, 403 wäre bereits Existenz-Information).

Vorlage: test_formulare_isolation.py
"""
import pytest


async def _register_org(client, suffix: str):
    """Registriert eine Org + User, seedet Default-Checklisten und legt
    ein Arbeitsmittel an.

    Gibt (headers, arbeitsmittel_id, checkliste_id) zurück.
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"iso-maengel-{suffix}@test.de",
            "passwort": "sicheres_passwort_123",
            "vorname": "Iso",
            "nachname": suffix,
            "firmenname": f"Iso-Maengel-{suffix} GmbH",
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


async def _start_pruefung_with_mangel(client, headers, am_id, cl_id):
    """Startet eine Prüfung und legt einen Mangel an. Gibt
    (pruefung_id, mangel_id, pruef_punkt_id) zurück.
    """
    start = await client.post(
        "/api/v1/pruefungen",
        json={"arbeitsmittel_id": am_id, "checkliste_id": cl_id},
        headers=headers,
    )
    assert start.status_code == 201, start.text
    pruefung_id = start.json()["id"]

    # Einen Mangel an die Prüfung hängen
    m_res = await client.post(
        f"/api/v1/pruefungen/{pruefung_id}/maengel",
        json={
            "beschreibung": "Verkabelung lose",
            "schweregrad": "orange",
        },
        headers=headers,
    )
    assert m_res.status_code == 201, m_res.text
    mangel_id = m_res.json()["id"]

    # Prüfpunkt-ID für Punkte-Tests ermitteln
    detail = await client.get(
        f"/api/v1/pruefungen/{pruefung_id}", headers=headers
    )
    assert detail.status_code == 200, detail.text
    punkte = detail.json().get("pruef_punkte", [])
    pruef_punkt_id = punkte[0]["id"] if punkte else None

    return pruefung_id, mangel_id, pruef_punkt_id


@pytest.mark.asyncio
async def test_list_maengel_kein_cross_tenant_leak(client):
    """GET /maengel mit Token Org A listet KEINE Mängel aus Org B."""
    headers_a, am_a, cl_a = await _register_org(client, "orga1")
    headers_b, am_b, cl_b = await _register_org(client, "orgb1")

    if not cl_a or not cl_b:
        pytest.skip("Keine Default-Checklisten verfügbar")

    _p_b, mangel_b_id, _pp_b = await _start_pruefung_with_mangel(
        client, headers_b, am_b, cl_b
    )

    # Org A listet ihre Mängel → darf Org-B-Mangel NICHT enthalten
    res = await client.get("/api/v1/maengel", headers=headers_a)
    assert res.status_code == 200, res.text
    ids = [m.get("id") for m in res.json()]
    assert mangel_b_id not in ids, (
        f"Cross-Tenant-Leak: Org A sieht Mangel {mangel_b_id} aus Org B"
    )


@pytest.mark.asyncio
async def test_update_mangel_status_cross_tenant_404(client):
    """PUT /maengel/{org_b_mangel_id}/status mit Token Org A → 404."""
    headers_a, am_a, cl_a = await _register_org(client, "orga2")
    headers_b, am_b, cl_b = await _register_org(client, "orgb2")

    if not cl_a or not cl_b:
        pytest.skip("Keine Default-Checklisten verfügbar")

    _p_b, mangel_b_id, _pp_b = await _start_pruefung_with_mangel(
        client, headers_b, am_b, cl_b
    )

    res = await client.put(
        f"/api/v1/maengel/{mangel_b_id}/status",
        json={"status": "erledigt", "kommentar": "cross-tenant"},
        headers=headers_a,
    )
    assert res.status_code == 404, (
        f"Cross-Tenant-Update: erwartet 404, bekommen {res.status_code} "
        f"({res.text[:200]})"
    )


@pytest.mark.asyncio
async def test_create_mangel_cross_tenant_404(client):
    """POST /pruefungen/{org_b_pruef_id}/maengel mit Token Org A → 404."""
    headers_a, am_a, cl_a = await _register_org(client, "orga3")
    headers_b, am_b, cl_b = await _register_org(client, "orgb3")

    if not cl_a or not cl_b:
        pytest.skip("Keine Default-Checklisten verfügbar")

    pruef_b_id, _m_b, _pp_b = await _start_pruefung_with_mangel(
        client, headers_b, am_b, cl_b
    )

    # Org A versucht einen Mangel an Org-B-Prüfung zu hängen
    res = await client.post(
        f"/api/v1/pruefungen/{pruef_b_id}/maengel",
        json={
            "beschreibung": "injizierter Mangel",
            "schweregrad": "rot",
        },
        headers=headers_a,
    )
    assert res.status_code == 404, (
        f"Cross-Tenant-POST-Mangel: erwartet 404, bekommen "
        f"{res.status_code} ({res.text[:200]})"
    )


@pytest.mark.asyncio
async def test_update_pruef_punkt_cross_tenant_404(client):
    """PUT /pruefungen/{org_b_pruef_id}/punkte/{punkt_id} mit Token Org A → 404."""
    headers_a, am_a, cl_a = await _register_org(client, "orga4")
    headers_b, am_b, cl_b = await _register_org(client, "orgb4")

    if not cl_a or not cl_b:
        pytest.skip("Keine Default-Checklisten verfügbar")

    pruef_b_id, _m_b, pp_b_id = await _start_pruefung_with_mangel(
        client, headers_b, am_b, cl_b
    )

    if not pp_b_id:
        pytest.skip("Keine Prüf-Punkte an der Test-Prüfung verfügbar")

    res = await client.put(
        f"/api/v1/pruefungen/{pruef_b_id}/punkte/{pp_b_id}",
        json={"ergebnis": "mangel", "bemerkung": "cross-tenant"},
        headers=headers_a,
    )
    assert res.status_code == 404, (
        f"Cross-Tenant-PUT-Punkt: erwartet 404, bekommen "
        f"{res.status_code} ({res.text[:200]})"
    )
