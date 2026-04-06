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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
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
    token_data = {"sub": user.id, "org": org.id, "rolle": user.rolle}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/login", response_model=TokenResponse)
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

    token_data = {"sub": user.id, "org": user.organisation_id, "rolle": user.rolle}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Get new access token using refresh token."""
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Ungültiger Token-Typ")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.ist_aktiv:
        raise HTTPException(status_code=401, detail="User nicht gefunden oder deaktiviert")

    token_data = {"sub": user.id, "org": user.organisation_id, "rolle": user.rolle}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")
    return user
