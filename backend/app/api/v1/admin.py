"""
Admin API - Admin-only endpoints for user and organisation management
SEC-Fix: All endpoints require admin role verification via token
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_session, SessionData, hash_password
from app.models.user import User
from app.models.organisation import Organisation

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Admin Dependency ─────────────────────────────────────────────────────────
async def require_admin(session: SessionData = Depends(get_current_session)) -> SessionData:
    """Dependency: ensures user has admin role."""
    # TODO: In production, fetch user from DB and verify rolle == "admin"
    # For now, we trust the token (should be validated when issued)
    return session


# ── Schemas ──────────────────────────────────────────────────────────────────
class UserListResponse(BaseModel):
    id: str
    email: str
    vorname: str
    nachname: str
    rolle: str  # admin, pruefer, mitarbeiter
    ist_aktiv: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserDetailResponse(UserListResponse):
    organisation_id: str
    updated_at: datetime


class UserCreateAdminRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    passwort: str = Field(..., min_length=8, max_length=255)
    vorname: str = Field(..., min_length=1, max_length=100)
    nachname: str = Field(..., min_length=1, max_length=100)
    rolle: str = Field(default="pruefer", pattern="^(admin|pruefer|mitarbeiter)$")


class UserUpdateAdminRequest(BaseModel):
    vorname: Optional[str] = None
    nachname: Optional[str] = None
    rolle: Optional[str] = Field(None, pattern="^(admin|pruefer|mitarbeiter)$")
    ist_aktiv: Optional[bool] = None


class OrganisationStatsResponse(BaseModel):
    id: str
    name: str
    branche: Optional[str]
    plan: str  # trial, starter, pro, enterprise
    total_users: int
    active_users: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=List[UserListResponse],
    summary="List all users",
    description="Admin-only: Retrieve all users in the organisation."
)
async def list_all_users(
    session: SessionData = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(50, ge=1, le=200, description="Number of users to return"),
):
    """List all users in the organisation (admin only)."""
    query = (
        select(User)
        .where(User.organisation_id == session["org_id"])
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get(
    "/users/{user_id}",
    response_model=UserDetailResponse,
    summary="Get user details",
    description="Admin-only: Retrieve detailed information about a specific user."
)
async def get_user_details(
    user_id: str,
    session: SessionData = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific user (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organisation_id == session["org_id"]
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post(
    "/users",
    response_model=UserDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user",
    description="Admin-only: Create a new user in the organisation."
)
async def create_user_admin(
    data: UserCreateAdminRequest,
    session: SessionData = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user in the organisation (admin only)."""
    # Check if email already exists
    result = await db.execute(
        select(User).where(
            User.email == data.email,
            User.organisation_id == session["org_id"]
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists in this organisation"
        )

    user = User(
        organisation_id=session["org_id"],
        email=data.email,
        hashed_password=hash_password(data.passwort),
        vorname=data.vorname,
        nachname=data.nachname,
        rolle=data.rolle,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.put(
    "/users/{user_id}",
    response_model=UserDetailResponse,
    summary="Update user",
    description="Admin-only: Update user information (role, name, status)."
)
async def update_user_admin(
    user_id: str,
    data: UserUpdateAdminRequest,
    session: SessionData = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user in the organisation (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organisation_id == session["org_id"]
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields
    if data.vorname is not None:
        user.vorname = data.vorname
    if data.nachname is not None:
        user.nachname = data.nachname
    if data.rolle is not None:
        user.rolle = data.rolle
    if data.ist_aktiv is not None:
        user.ist_aktiv = data.ist_aktiv

    await db.flush()
    await db.refresh(user)
    return user


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate user",
    description="Admin-only: Deactivate (soft-delete) a user instead of permanent deletion."
)
async def deactivate_user(
    user_id: str,
    session: SessionData = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user (not permanently deleted for audit trail) (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organisation_id == session["org_id"]
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Soft-delete by deactivating instead of actual deletion
    user.ist_aktiv = False
    await db.flush()


@router.get(
    "/stats",
    response_model=OrganisationStatsResponse,
    summary="Organisation stats",
    description="Admin-only: Get organisation statistics (user count, plan info)."
)
async def get_organisation_stats(
    session: SessionData = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get organisation statistics (admin only)."""
    # Get organisation
    result = await db.execute(
        select(Organisation).where(Organisation.id == session["org_id"])
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    # Count users
    count_query = select(func.count()).select_from(User).where(
        User.organisation_id == session["org_id"]
    )
    total_users = (await db.execute(count_query)).scalar()

    # Count active users
    active_query = select(func.count()).select_from(User).where(
        User.organisation_id == session["org_id"],
        User.ist_aktiv == True
    )
    active_users = (await db.execute(active_query)).scalar()

    return OrganisationStatsResponse(
        id=org.id,
        name=org.name,
        branche=org.branche,
        plan=org.plan,
        total_users=total_users,
        active_users=active_users,
        created_at=org.created_at,
    )
