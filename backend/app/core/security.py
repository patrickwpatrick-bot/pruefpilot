"""
PrüfPilot - Security: JWT Tokens & Password Hashing

SEC-Fix: Zentrale Session-Dependency validiert sub+org Claims zusammen
in einem einzigen Token-Decode (verhindert Token-Juggling).
"""
import uuid as _uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, TypedDict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()


class SessionData(TypedDict):
    user_id: str
    org_id: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ungültig oder abgelaufen",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── SEC-Fix: Zentrale Session-Dependency ─────────────────────────────────────
# Validiert sub + org Claims zusammen in einem einzigen Token-Decode.
# Verhindert Token-Juggling wenn get_current_user_id() und get_current_org_id()
# einzeln per Depends geladen werden und der Token unterschiedlich interpretiert
# werden könnte.

async def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> SessionData:
    """Zentrale Dependency: dekodiert Token einmal, validiert sub+org zusammen."""
    payload = decode_token(credentials.credentials)

    user_id = payload.get("sub")
    org_id = payload.get("org")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token enthält keine User-ID (sub)",
        )
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token enthält keine Organisations-ID (org)",
        )

    return SessionData(user_id=user_id, org_id=org_id)


# ── Convenience-Dependencies (Abwärtskompatibel) ────────────────────────────
# Verwenden intern get_current_session(), dekodieren Token nur noch einmal.

async def get_current_user_id(
    session: SessionData = Depends(get_current_session),
) -> _uuid.UUID:
    """Dependency: extracts and validates user_id from JWT token as UUID."""
    return _uuid.UUID(session["user_id"])


async def get_current_org_id(
    session: SessionData = Depends(get_current_session),
) -> _uuid.UUID:
    """Dependency: extracts organisation_id from JWT token as UUID."""
    return _uuid.UUID(session["org_id"])
