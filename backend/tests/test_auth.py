"""
Auth Tests — Register, Login, Refresh, Validation, Branche
"""
import pytest


@pytest.mark.asyncio
async def test_register_with_branche(client):
    """Block 1: Registration includes branche field."""
    res = await client.post("/api/v1/auth/register", json={
        "email": "test@schreinerei.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Thomas",
        "nachname": "Müller",
        "firmenname": "Schreinerei Müller GmbH",
        "branche": "baugewerbe",
    })
    assert res.status_code == 201
    tokens = res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens


@pytest.mark.asyncio
async def test_login_success(client):
    """Login with correct credentials."""
    # First register
    await client.post("/api/v1/auth/register", json={
        "email": "login@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": "maschinenbau",
    })

    # Then login
    res = await client.post("/api/v1/auth/login", json={
        "email": "login@test.de",
        "passwort": "sicheres_passwort_123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Login with wrong password should fail."""
    await client.post("/api/v1/auth/register", json={
        "email": "wrong@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": "logistik",
    })

    res = await client.post("/api/v1/auth/login", json={
        "email": "wrong@test.de",
        "passwort": "falsches_passwort",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_email(client):
    """Registration with duplicate email should fail."""
    data = {
        "email": "doppelt@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": "gastronomie",
    }
    await client.post("/api/v1/auth/register", json=data)
    res = await client.post("/api/v1/auth/register", json=data)
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_refresh_token(client):
    """Refresh token should return new access token."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": "refresh@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": "maschinenbau",
    })
    tokens = reg.json()

    res = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_me_endpoint(client):
    """Get user profile."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": "me@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Thomas",
        "nachname": "Müller",
        "firmenname": "Schreinerei GmbH",
        "branche": "baugewerbe",
    })
    token = reg.json()["access_token"]

    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@test.de"
    assert res.json()["vorname"] == "Thomas"
    assert res.json()["rolle"] == "admin"


@pytest.mark.asyncio
async def test_register_missing_branche(client):
    """Registration without branche should fail (required field)."""
    res = await client.post("/api/v1/auth/register", json={
        "email": "nobranche@test.de",
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
    })
    assert res.status_code == 422  # Validation error
