"""
Gefaehrdungsbeurteilungen API - Risk assessment documents
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.models.gefaehrdungsbeurteilung import Gefaehrdungsbeurteilung, GBU_Gefaehrdung

router = APIRouter(prefix="/gbus", tags=["Gefährdungsbeurteilungen"])
# --- Schemas ---

class GefaehrdungUpdate(BaseModel):
    status: Optional[str] = None
    massnahmen: Optional[str] = None

class GefaehrdungCreate(BaseModel):
    gefaehrdung: str = Field(..., min_length=1)
    risikoklasse: Optional[str] = None
    bestehende_massnahmen: Optional[str] = None
    weitere_massnahmen: Optional[str] = None
    verantwortlich: Optional[str] = None
    frist: Optional[date] = None

class GefaehrdungResponse(BaseModel):
    id: str
    gbu_id: str
    gefaehrdung: str
    risikoklasse: Optional[str]
    bestehende_massnahmen: Optional[str]
    weitere_massnahmen: Optional[str]
    verantwortlich: Optional[str]
    frist: Optional[date]
    status: str
    reihenfolge: int
    created_at: datetime

    class Config:
        from_attributes = True

class GefaehrdungsbeurteilungCreate(BaseModel):
    titel: str = Field(..., min_length=1, max_length=255)
    arbeitsbereich: str = Field(..., min_length=1, max_length=255)
    datum: date
    bemerkung: Optional[str] = None

class GefaehrdungsbeurteilungUpdate(BaseModel):
    status: Optional[str] = None
    bemerkung: Optional[str] = None
    naechste_ueberpruefung_am: Optional[date] = None

class GefaehrdungsbeurteilungResponse(BaseModel):
    id: str
    titel: str
    arbeitsbereich: str
    status: str
    datum: date
    naechste_ueberpruefung_am: Optional[date]
    bemerkung: Optional[str]
    gefaehrdungen: list[GefaehrdungResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=list[GefaehrdungsbeurteilungResponse])
async def list_gbu(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all GBUs for org with gefaehrdungen loaded."""
    result = await db.execute(
        select(Gefaehrdungsbeurteilung)
        .options(selectinload(Gefaehrdungsbeurteilung.gefaehrdungen))
        .where(Gefaehrdungsbeurteilung.organisation_id == org_id)
        .order_by(Gefaehrdungsbeurteilung.datum.desc())
    )
    return result.scalars().all()

@router.post("", response_model=GefaehrdungsbeurteilungResponse, status_code=201)
async def create_gbu(
    data: GefaehrdungsbeurteilungCreate,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new GBU."""
    gbu = Gefaehrdungsbeurteilung(
        organisation_id=org_id,
        erstellt_von_id=user_id,
        titel=data.titel,
        arbeitsbereich=data.arbeitsbereich,
        datum=data.datum,
        bemerkung=data.bemerkung,
    )
    db.add(gbu)
    await db.flush()

    # Reload with gefaehrdungen
    result = await db.execute(
        select(Gefaehrdungsbeurteilung)
        .options(selectinload(Gefaehrdungsbeurteilung.gefaehrdungen))
        .where(Gefaehrdungsbeurteilung.id == gbu.id)
    )
    return result.scalar_one()

@router.get("/{gbu_id}", response_model=GefaehrdungsbeurteilungResponse)
async def get_gbu(
    gbu_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single GBU with gefaehrdungen."""
    result = await db.execute(
        select(Gefaehrdungsbeurteilung)
        .options(selectinload(Gefaehrdungsbeurteilung.gefaehrdungen))
        .where(
            Gefaehrdungsbeurteilung.id == gbu_id,
            Gefaehrdungsbeurteilung.organisation_id == org_id,
        )
    )
    gbu = result.scalar_one_or_none()
    if not gbu:
        raise HTTPException(status_code=404, detail="Gefaehrdungsbeurteilung nicht gefunden")
    return gbu

@router.put("/{gbu_id}", response_model=GefaehrdungsbeurteilungResponse)
async def update_gbu(
    gbu_id: str,
    data: GefaehrdungsbeurteilungUpdate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a GBU."""
    result = await db.execute(
        select(Gefaehrdungsbeurteilung).where(
            Gefaehrdungsbeurteilung.id == gbu_id,
            Gefaehrdungsbeurteilung.organisation_id == org_id,
        )
    )
    gbu = result.scalar_one_or_none()
    if not gbu:
        raise HTTPException(status_code=404, detail="Gefaehrdungsbeurteilung nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gbu, field, value)
    await db.flush()

    # Reload with gefaehrdungen
    result = await db.execute(
        select(Gefaehrdungsbeurteilung)
        .options(selectinload(Gefaehrdungsbeurteilung.gefaehrdungen))
        .where(Gefaehrdungsbeurteilung.id == gbu.id)
    )
    return result.scalar_one()

@router.post("/{gbu_id}/gefaehrdungen", response_model=GefaehrdungResponse, status_code=201)
async def add_gefaehrdung(
    gbu_id: str,
    data: GefaehrdungCreate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Add a hazard to a GBU."""
    # Verify GBU exists and belongs to org
    result_gbu = await db.execute(
        select(Gefaehrdungsbeurteilung).where(
            Gefaehrdungsbeurteilung.id == gbu_id,
            Gefaehrdungsbeurteilung.organisation_id == org_id,
        )
    )
    gbu = result_gbu.scalar_one_or_none()
    if not gbu:
        raise HTTPException(status_code=404, detail="Gefaehrdungsbeurteilung nicht gefunden")

    gefaehrdung = GBU_Gefaehrdung(
        gbu_id=gbu_id,
        gefaehrdung=data.gefaehrdung,
        risikoklasse=data.risikoklasse,
        bestehende_massnahmen=data.bestehende_massnahmen,
        weitere_massnahmen=data.weitere_massnahmen,
        verantwortlich=data.verantwortlich,
        frist=data.frist,
    )
    db.add(gefaehrdung)
    await db.flush()
    await db.refresh(gefaehrdung)
    return gefaehrdung

@router.put("/{gbu_id}/gefaehrdungen/{gef_id}", response_model=GefaehrdungResponse)
async def update_gefaehrdung(
    gbu_id: str,
    gef_id: str,
    data: GefaehrdungUpdate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a hazard in a GBU."""
    # Verify GBU belongs to org
    result_gbu = await db.execute(
        select(Gefaehrdungsbeurteilung).where(
            Gefaehrdungsbeurteilung.id == gbu_id,
            Gefaehrdungsbeurteilung.organisation_id == org_id,
        )
    )
    gbu = result_gbu.scalar_one_or_none()
    if not gbu:
        raise HTTPException(status_code=404, detail="Gefaehrdungsbeurteilung nicht gefunden")

    # Get and update gefaehrdung
    result = await db.execute(
        select(GBU_Gefaehrdung).where(
            GBU_Gefaehrdung.id == gef_id,
            GBU_Gefaehrdung.gbu_id == gbu_id,
        )
    )
    gefaehrdung = result.scalar_one_or_none()
    if not gefaehrdung:
        raise HTTPException(status_code=404, detail="Gefaehrdung nicht gefunden")

    # Map status -> status, massnahmen -> weitere_massnahmen
    update_data = data.model_dump(exclude_unset=True)
    if "massnahmen" in update_data:
        update_data["weitere_massnahmen"] = update_data.pop("massnahmen")

    for field, value in update_data.items():
        setattr(gefaehrdung, field, value)
    await db.flush()
    await db.refresh(gefaehrdung)
    return gefaehrdung

@router.delete("/{gbu_id}", status_code=204)
async def delete_gbu(
    gbu_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a GBU."""
    result = await db.execute(
        select(Gefaehrdungsbeurteilung).where(
            Gefaehrdungsbeurteilung.id == gbu_id,
            Gefaehrdungsbeurteilung.organisation_id == org_id,
        )
    )
    gbu = result.scalar_one_or_none()
    if not gbu:
        raise HTTPException(status_code=404, detail="Gefaehrdungsbeurteilung nicht gefunden")
    await db.delete(gbu)
