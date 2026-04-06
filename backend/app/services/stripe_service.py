"""
Stripe Service — Payment processing for PrüfPilot subscriptions
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Stripe Price IDs (to be configured in Stripe Dashboard)
PLAN_PRICES = {
    "pruef_manager": "price_pruef_manager_monthly",   # 29€/month
    "professional": "price_professional_monthly",       # 79€/month
    "business": "price_business_monthly",               # 149€/month
    "enterprise": "price_enterprise_monthly",           # 249€/month
}


def _get_stripe():
    """Get configured Stripe module."""
    import stripe
    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
    if not stripe.api_key:
        raise ValueError("STRIPE_SECRET_KEY not configured")
    return stripe


async def create_checkout_session(org_id: str, plan: str, customer_email: str, success_url: str, cancel_url: str) -> str:
    """Create a Stripe Checkout Session and return the URL."""
    stripe = _get_stripe()

    price_id = PLAN_PRICES.get(plan)
    if not price_id:
        raise ValueError(f"Unknown plan: {plan}")

    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        customer_email=customer_email,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"org_id": org_id, "plan": plan},
    )

    return session.url


async def create_portal_session(customer_id: str, return_url: str) -> str:
    """Create a Stripe Customer Portal session for managing subscription."""
    stripe = _get_stripe()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


async def handle_webhook(payload: bytes, sig_header: str) -> dict:
    """Process Stripe webhook events."""
    stripe = _get_stripe()
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)

    if not webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured")

    event = stripe.Webhook.construct_event(
        payload, sig_header, webhook_secret
    )

    return {
        "type": event["type"],
        "data": event["data"]["object"],
    }
