"""
Plan Limits — Middleware to enforce Free/Paid plan restrictions
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.organisation import Organisation
from app.models.arbeitsmittel import Arbeitsmittel
from app.models.pruefung import Pruefung
from app.models.user import User
from datetime import datetime, timezone, timedelta


# Plan definitions
PLAN_LIMITS = {
    "free": {
        "arbeitsmittel_max": 10,
        "pruefungen_pro_monat": 3,
        "users_max": 1,
        "pdf_wasserzeichen": True,
        "ki_features": False,
    },
    "trial": {
        "arbeitsmittel_max": 999999,
        "pruefungen_pro_monat": 999999,
        "users_max": 999999,
        "pdf_wasserzeichen": False,
        "ki_features": True,
    },
    "pruef_manager": {
        "arbeitsmittel_max": 999999,
        "pruefungen_pro_monat": 999999,
        "users_max": 5,
        "pdf_wasserzeichen": False,
        "ki_features": True,
    },
    "professional": {
        "arbeitsmittel_max": 999999,
        "pruefungen_pro_monat": 999999,
        "users_max": 20,
        "pdf_wasserzeichen": False,
        "ki_features": True,
    },
    "business": {
        "arbeitsmittel_max": 999999,
        "pruefungen_pro_monat": 999999,
        "users_max": 999999,
        "pdf_wasserzeichen": False,
        "ki_features": True,
    },
}


async def get_org_plan(db: AsyncSession, org_id: str) -> dict:
    """Get the current plan and limits for an organisation."""
    result = await db.execute(
        select(Organisation).where(Organisation.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        return PLAN_LIMITS["free"]

    plan = org.plan or "free"

    # Check if trial has expired
    # Robust gegen naive datetimes (SQLite strippt Timezone-Info beim Lesen)
    if plan == "trial" and org.trial_endet_am:
        trial_end = org.trial_endet_am
        if trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
        if trial_end < datetime.now(timezone.utc):
            plan = "free"  # Trial expired, downgrade to free

    return {
        "plan_name": plan,
        "limits": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
        "trial_endet_am": org.trial_endet_am.isoformat() if org.trial_endet_am else None,
    }


async def check_arbeitsmittel_limit(db: AsyncSession, org_id: str):
    """Check if organisation can create more Arbeitsmittel."""
    plan_info = await get_org_plan(db, org_id)
    limits = plan_info["limits"]

    count = await db.execute(
        select(func.count()).select_from(
            select(Arbeitsmittel.id).where(Arbeitsmittel.organisation_id == org_id).subquery()
        )
    )
    current = count.scalar() or 0

    if current >= limits["arbeitsmittel_max"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": f"Du hast {current} von {limits['arbeitsmittel_max']} Arbeitsmitteln erreicht. Upgrade für unbegrenzte Arbeitsmittel.",
                "code": "LIMIT_ARBEITSMITTEL",
                "current": current,
                "max": limits["arbeitsmittel_max"],
                "plan": plan_info["plan_name"],
            }
        )


async def check_pruefung_limit(db: AsyncSession, org_id: str):
    """Check if organisation can start more Prüfungen this month."""
    plan_info = await get_org_plan(db, org_id)
    limits = plan_info["limits"]

    # Count pruefungen this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get all users in the org
    user_result = await db.execute(
        select(User.id).where(User.organisation_id == org_id)
    )
    user_ids = [row[0] for row in user_result.all()]

    if not user_ids:
        return

    count = await db.execute(
        select(func.count()).select_from(
            select(Pruefung.id).where(
                Pruefung.pruefer_id.in_(user_ids),
                Pruefung.gestartet_am >= month_start,
            ).subquery()
        )
    )
    current = count.scalar() or 0

    if current >= limits["pruefungen_pro_monat"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": f"Du hast {current} von {limits['pruefungen_pro_monat']} Prüfungen diesen Monat genutzt. Upgrade ab 29€/Monat für unbegrenzte Prüfungen.",
                "code": "LIMIT_PRUEFUNGEN",
                "current": current,
                "max": limits["pruefungen_pro_monat"],
                "plan": plan_info["plan_name"],
            }
        )


def should_add_wasserzeichen(plan_name: str) -> bool:
    """Check if PDF should have PrüfPilot watermark."""
    limits = PLAN_LIMITS.get(plan_name, PLAN_LIMITS["free"])
    return limits.get("pdf_wasserzeichen", True)
