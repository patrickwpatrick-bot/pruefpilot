"""
CSV Import Tests — Clean and messy data
"""
import pytest
import io


async def _get_token(client, email="csv@test.de"):
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
async def test_csv_import_clean(client):
    """Import clean CSV with standard columns."""
    token = await _get_token(client, "csvclean@test.de")
    headers = {"Authorization": f"Bearer {token}"}

    csv_content = "Name;Typ;Hersteller;Seriennummer;Baujahr;Intervall\n"
    csv_content += "CNC-Fräse;CNC-Maschine;DMG Mori;SN-001;2020;12\n"
    csv_content += "Leiter Alu;Leiter;Zarges;SN-002;2019;12\n"
    csv_content += "Schweißgerät;Schweißgerät;Fronius;SN-003;2021;6\n"

    files = {"file": ("import.csv", csv_content.encode('utf-8'), "text/csv")}
    res = await client.post("/api/v1/arbeitsmittel/import", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["importiert"] == 3
    assert data["fehler"] == 0


@pytest.mark.asyncio
async def test_csv_import_semicolon_bom(client):
    """Import CSV with BOM marker and semicolons (typical German Excel export)."""
    token = await _get_token(client, "csvbom@test.de")
    headers = {"Authorization": f"Bearer {token}"}

    # BOM + semicolons
    csv_content = "\ufeffBezeichnung;Art;Hersteller\n"
    csv_content += "Bohrmaschine;Bohrmaschine;Bosch\n"
    csv_content += ";;\n"  # empty row
    csv_content += "Schleifbock;Schleifmaschine;Metabo\n"

    files = {"file": ("import.csv", csv_content.encode('utf-8-sig'), "text/csv")}
    res = await client.post("/api/v1/arbeitsmittel/import", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    # Should skip empty row, "Bezeichnung" mapped to "name"
    assert data["importiert"] >= 1


@pytest.mark.asyncio
async def test_csv_import_missing_name(client):
    """Rows without name should produce errors."""
    token = await _get_token(client, "csvmissing@test.de")
    headers = {"Authorization": f"Bearer {token}"}

    csv_content = "Name;Typ\n"
    csv_content += ";Leiter\n"  # missing name
    csv_content += "OK Gerät;Maschine\n"

    files = {"file": ("import.csv", csv_content.encode('utf-8'), "text/csv")}
    res = await client.post("/api/v1/arbeitsmittel/import", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["importiert"] == 1
    assert data["fehler"] == 1
