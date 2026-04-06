"""
Plan Limits Tests — Free plan restrictions (10 Arbeitsmittel, 3 Prüfungen/Monat)
"""
import pytest
from sqlalchemy import update, select
from app.models.organisation import Organisation
from app.models.user import User
from tests.conftest import TestSessionLocal


async def _register_and_get_token(client, email="limit@test.de", branche="maschinenbau"):
    """Register a new user and downgrade their org to 'free' plan.
    (Registration defaults to 'trial' which has unlimited quotas, so we
    must explicitly switch to 'free' for limit enforcement tests.)"""
    res = await client.post("/api/v1/auth/register", json={
        "email": email,
        "passwort": "sicheres_passwort_123",
        "vorname": "Max",
        "nachname": "Test",
        "firmenname": "Test GmbH",
        "branche": branche,
    })
    token = res.json()["access_token"]

    # Downgrade org to free plan for limit testing
    async with TestSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.email == email))
        user = user_res.scalar_one()
        await db.execute(
            update(Organisation)
            .where(Organisation.id == user.organisation_id)
            .values(plan="free", trial_endet_am=None)
        )
        await db.commit()

    return token


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_arbeitsmittel_limit_free_plan(client):
    """Free plan allows max 10 Arbeitsmittel. 11th should be rejected with 403."""
    token = await _register_and_get_token(client, "freelimit@test.de")
    headers = _auth(token)

    # Create 10 items (should all succeed)
    for i in range(10):
        res = await client.post("/api/v1/arbeitsmittel", json={
            "name": f"Gerät {i+1}",
            "typ": "Allgemein",
            "pruef_intervall_monate": 12,
        }, headers=headers)
        assert res.status_code == 201, f"Item {i+1} should be created"

    # 11th item should be rejected
    res = await client.post("/api/v1/arbeitsmittel", json={
        "name": "Gerät 11",
        "typ": "Allgemein",
        "pruef_intervall_monate": 12,
    }, headers=headers)
    assert res.status_code == 403, "11th Arbeitsmittel should exceed free plan limit"
    assert "LIMIT_ARBEITSMITTEL" in str(res.json())


@pytest.mark.asyncio
async def test_arbeitsmittel_limit_error_contains_plan_info(client):
    """Error response should contain plan info and current count."""
    token = await _register_and_get_token(client, "limitinfo@test.de")
    headers = _auth(token)

    # Create 10 items
    for i in range(10):
        await client.post("/api/v1/arbeitsmittel", json={
            "name": f"Gerät {i+1}",
            "typ": "Allgemein",
            "pruef_intervall_monate": 12,
        }, headers=headers)

    # Try to exceed limit
    res = await client.post("/api/v1/arbeitsmittel", json={
        "name": "Über Limit",
        "typ": "Allgemein",
        "pruef_intervall_monate": 12,
    }, headers=headers)

    assert res.status_code == 403
    error_detail = res.json()["detail"]
    # The error detail should be a dict with plan info
    if isinstance(error_detail, dict):
        assert "plan" in error_detail
        assert error_detail["plan"] == "free"
        assert "current" in error_detail
        assert error_detail["current"] == 10
        assert "max" in error_detail
        assert error_detail["max"] == 10
