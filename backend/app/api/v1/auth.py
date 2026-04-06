"""
Auth API - Registration, Login, Token Refresh
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections import defaultdict
from time import time
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_id,
)
from app.models.user import User
from app.models.organisation import Organisation
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse,
)

# ── Rate Limiting für Login (Fix 1) ──────────────────────────────────────────
_login_attempts: dict[str, list[float]] = defaultdict(list)
LOGIN_RATE_LIMIT = 5  # max 5 Versuche
LOGIN_RATE_WINDOW = 300  # in 5 Minuten

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/debug-register")
async def debug_register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Debug register endpoint — returns traceback on error."""
    import traceback
    try:
        result = await db.execute(select(User).where(User.email == data.email))
        return {"ok": True, "step": "db_query_works", "found": result.scalar_one_or_none() is not None}
    except Exception as exc:
        return {"error": str(exc), "traceback": traceback.format_exc()}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="Register new user", description="Create a new user account and organization. Returns access and refresh tokens.")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user + create their organisation."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diese E-Mail-Adresse ist bereits registriert",
        )

    # Create organisation with branche + trial
    from datetime import datetime, timezone, timedelta
    org = Organisation(
        name=data.firmenname,
        branche=data.branche,
        plan="trial",
        trial_endet_am=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(org)
    await db.flush()

    # Create admin user
    user = User(
        organisation_id=org.id,
        email=data.email,
        hashed_password=hash_password(data.passwort),
        vorname=data.vorname,
        nachname=data.nachname,
        rolle="admin",
    )
    db.add(user)
    await db.flush()

    # Generate tokens
    token_data = {"sub": str(user.id), "org": str(org.id), "rolle": user.rolle}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/login", response_model=TokenResponse, summary="Login user", description="Authenticate with email and password. Includes rate limiting protection (5 attempts per 5 minutes).")
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Login with email + password."""
    # Fix 1: Rate Limiting für Brute-Force-Schutz
    client_ip = request.client.host if request.client else "unknown"
    now = time()
    _login_attempts[client_ip] = [t for t in _login_attempts[client_ip] if now - t < LOGIN_RATE_WINDOW]
    if len(_login_attempts[client_ip]) >= LOGIN_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Zu viele Anmeldeversuche. Bitte warte 5 Minuten.",
        )

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.passwort, user.hashed_password):
        # Fix 1: Fehlgeschlagener Login wird registriert
        _login_attempts[client_ip].append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-Mail oder Passwort falsch",
        )

    if not user.ist_aktiv:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dieses Konto ist deaktiviert",
        )

    token_data = {"sub": str(user.id), "org": str(user.organisation_id), "rolle": user.rolle}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token", description="Obtain a new access token using a valid refresh token.")
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Get new access token using refresh token."""
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Ungültiger Token-Typ")

    import uuid as _uuid
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == _uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.ist_aktiv:
        raise HTTPException(status_code=401, detail="User nicht gefunden oder deaktiviert")

    token_data = {"sub": str(user.id), "org": str(user.organisation_id), "rolle": user.rolle}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserResponse, summary="Get user profile", description="Retrieve the profile of the currently authenticated user.")
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    import uuid as _uuid
    import logging
    logger = logging.getLogger(__name__)
    try:
        result = await db.execute(select(User).where(User.id == _uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User nicht gefunden")
        # Explicitly build response to avoid lazy-loading issues
        return UserResponse(
            id=str(user.id),
            email=user.email,
            vorname=user.vorname,
            nachname=user.nachname,
            rolle=user.rolle,
            organisation_id=str(user.organisation_id),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_me error for user {user_id}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Interner Fehler: {type(e).__name__}: {str(e)}")
