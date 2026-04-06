"""
Public Signing API - Token-based training acknowledgement (no authentication required)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.unterweisungs_zuweisung import UnterweisungsZuweisung
from app.models.organisation import Organisation

router = APIRouter(prefix="/public", tags=["Public Signing"])


class SigningPageResponse(BaseModel):
    organisation_name: str
    vorlage_name: str
    vorlage_inhalt: str
    mitarbeiter_name: str
    already_signed: bool
    unterschrieben_am: Optional[datetime] = None


class SignRequest(BaseModel):
    unterschrift_name: str  # typed name as signature
    gelesen_bestaetigt: bool = True


class SignResponse(BaseModel):
    success: bool
    message: str


@router.get("/unterweisung/{token}", response_model=SigningPageResponse)
async def get_signing_page(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public page: load training content for signing."""
    result = await db.execute(
        select(UnterweisungsZuweisung)
        .options(
            selectinload(UnterweisungsZuweisung.vorlage),
            selectinload(UnterweisungsZuweisung.mitarbeiter),
            selectinload(UnterweisungsZuweisung.organisation),
        )
        .where(UnterweisungsZuweisung.sign_token == token)
    )
    zuweisung = result.scalar_one_or_none()
    if not zuweisung:
        raise HTTPException(status_code=404, detail="Unterweisung nicht gefunden oder Link ungültig")

    return SigningPageResponse(
        organisation_name=zuweisung.organisation.name if zuweisung.organisation else "—",
        vorlage_name=zuweisung.vorlage.name if zuweisung.vorlage else "—",
        vorlage_inhalt=zuweisung.vorlage.inhalt if zuweisung.vorlage else "",
        mitarbeiter_name=f"{zuweisung.mitarbeiter.vorname} {zuweisung.mitarbeiter.nachname}" if zuweisung.mitarbeiter else "—",
        already_signed=zuweisung.status == "unterschrieben",
        unterschrieben_am=zuweisung.unterschrieben_am,
    )


@router.post("/unterweisung/{token}/sign", response_model=SignResponse)
async def sign_unterweisung(
    token: str,
    data: SignRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: employee signs the training."""
    result = await db.execute(
        select(UnterweisungsZuweisung).where(UnterweisungsZuweisung.sign_token == token)
    )
    zuweisung = result.scalar_one_or_none()
    if not zuweisung:
        raise HTTPException(status_code=404, detail="Unterweisung nicht gefunden oder Link ungültig")

    if zuweisung.status == "unterschrieben":
        return SignResponse(success=False, message="Diese Unterweisung wurde bereits unterschrieben.")

    if not data.gelesen_bestaetigt:
        raise HTTPException(status_code=400, detail="Bitte bestätigen Sie, dass Sie den Inhalt gelesen haben.")

    # Record the signature
    zuweisung.status = "unterschrieben"
    zuweisung.unterschrieben_am = datetime.now(timezone.utc)
    zuweisung.unterschrift_name = data.unterschrift_name
    zuweisung.gelesen_bestaetigt = True
    zuweisung.ip_adresse = request.client.host if request.client else None
    zuweisung.user_agent = request.headers.get("user-agent", "")[:500]

    await db.flush()

    return SignResponse(success=True, message="Unterweisung erfolgreich unterschrieben. Vielen Dank!")
