"""
Standorte API - CRUD for locations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.models.standort import Standort

router = APIRouter(prefix="/standorte", tags=["Standorte"])
class StandortCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    strasse: Optional[str] = None
    hausnummer: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    gebaeude: Optional[str] = None
    abteilung: Optional[str] = None
    etage: Optional[str] = None
    beschreibung: Optional[str] = None

class StandortResponse(BaseModel):
    id: str
    name: str
    strasse: Optional[str]
    hausnummer: Optional[str]
    plz: Optional[str]
    ort: Optional[str]
    gebaeude: Optional[str]
    abteilung: Optional[str]
    etage: Optional[str]
    beschreibung: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=list[StandortResponse])
async def list_standorte(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Standort).where(Standort.organisation_id == org_id).order_by(Standort.name)
    )
    rows = result.scalars().all()
    return [
        StandortResponse(
            id=str(s.id),
            name=s.name,
            strasse=s.strasse,
            hausnummer=s.hausnummer,
            plz=s.plz,
            ort=s.ort,
            gebaeude=s.gebaeude,
            abteilung=s.abteilung,
            etage=s.etage,
            beschreibung=s.beschreibung,
            created_at=s.created_at,
        )
        for s in rows
    ]

@router.post("", response_model=StandortResponse, status_code=201)
async def create_standort(
    data: StandortCreate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    standort = Standort(organisation_id=org_id, **data.model_dump())
    db.add(standort)
    await db.flush()
    await db.refresh(standort)
    return StandortResponse(
        id=str(standort.id),
        name=standort.name,
        strasse=standort.strasse,
        hausnummer=standort.hausnummer,
        plz=standort.plz,
        ort=standort.ort,
        gebaeude=standort.gebaeude,
        abteilung=standort.abteilung,
        etage=standort.etage,
        beschreibung=standort.beschreibung,
        created_at=standort.created_at,
    )

@router.put("/{standort_id}", response_model=StandortResponse)
async def update_standort(
    standort_id: str,
    data: StandortCreate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Standort).where(Standort.id == standort_id, Standort.organisation_id == org_id)
    )
    standort = result.scalar_one_or_none()
    if not standort:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")

    for field, value in data.model_dump().items():
        setattr(standort, field, value)
    await db.flush()
    await db.refresh(standort)
    return StandortResponse(
        id=str(standort.id),
        name=standort.name,
        strasse=standort.strasse,
        hausnummer=standort.hausnummer,
        plz=standort.plz,
        ort=standort.ort,
        gebaeude=standort.gebaeude,
        abteilung=standort.abteilung,
        etage=standort.etage,
        beschreibung=standort.beschreibung,
        created_at=standort.created_at,
    )

@router.delete("/{standort_id}", status_code=204)
async def delete_standort(
    standort_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Standort).where(Standort.id == standort_id, Standort.organisation_id == org_id)
    )
    standort = result.scalar_one_or_none()
    if not standort:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    await db.delete(standort)
