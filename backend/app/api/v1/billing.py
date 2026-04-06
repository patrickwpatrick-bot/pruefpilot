"""
Billing API — Stripe integration for subscriptions
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.models.organisation import Organisation
from app.models.user import User
from app.core.plan_limits import get_org_plan
from pydantic import BaseModel

router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    plan: str  # pruef_manager, professional, business, enterprise


@router.get("/plan")
async def get_current_plan(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the current plan and usage for the organisation."""
    plan_info = await get_org_plan(db, org_id)
    return plan_info


@router.post("/checkout")
async def create_checkout(
    data: CheckoutRequest,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session."""
    try:
        from app.services.stripe_service import create_checkout_session

        # Get user email
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User nicht gefunden")

        url = await create_checkout_session(
            org_id=org_id,
            plan=data.plan,
            customer_email=user.email,
            success_url="https://app.pruefpilot.de/einstellungen?billing=success",
            cancel_url="https://app.pruefpilot.de/einstellungen?billing=cancel",
        )
        return {"checkout_url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Zahlungssystem nicht verfügbar")


@router.post("/portal")
async def create_portal(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session."""
    try:
        from app.services.stripe_service import create_portal_session

        result = await db.execute(select(Organisation).where(Organisation.id == org_id))
        org = result.scalar_one_or_none()

        if not org or not org.stripe_customer_id:
            raise HTTPException(status_code=400, detail="Kein Stripe-Konto verknüpft")

        url = await create_portal_session(
            customer_id=org.stripe_customer_id,
            return_url="https://app.pruefpilot.de/einstellungen",
        )
        return {"portal_url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events."""
    try:
        from app.services.stripe_service import handle_webhook

        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        event = await handle_webhook(payload, sig)

        event_type = event["type"]
        data = event["data"]

        if event_type == "checkout.session.completed":
            org_id = data.get("metadata", {}).get("org_id")
            plan = data.get("metadata", {}).get("plan")
            customer_id = data.get("customer")

            if org_id and plan:
                result = await db.execute(
                    select(Organisation).where(Organisation.id == org_id)
                )
                org = result.scalar_one_or_none()
                if org:
                    org.plan = plan
                    org.stripe_customer_id = customer_id
                    await db.flush()

        elif event_type == "customer.subscription.deleted":
            customer_id = data.get("customer")
            if customer_id:
                result = await db.execute(
                    select(Organisation).where(Organisation.stripe_customer_id == customer_id)
                )
                org = result.scalar_one_or_none()
                if org:
                    org.plan = "free"
                    await db.flush()

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
