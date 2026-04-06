"""
Checklisten API - CRUD for inspection templates
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.models.checkliste import ChecklistenTemplate, ChecklistenPunkt

router = APIRouter(prefix="/checklisten", tags=["Checklisten"])
# --- Schemas ---

class PunktCreate(BaseModel):
    text: str = Field(..., min_length=1)
    kategorie: Optional[str] = None
    hinweis: Optional[str] = None
    reihenfolge: int = 0
    ist_pflicht: bool = True

class PunktResponse(BaseModel):
    id: str
    text: str
    kategorie: Optional[str]
    hinweis: Optional[str]
    reihenfolge: int
    ist_pflicht: bool

    class Config:
        from_attributes = True

class ChecklisteCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    norm: Optional[str] = None
    beschreibung: Optional[str] = None
    kategorie: str = "allgemein"
    punkte: list[PunktCreate] = []

class ChecklisteResponse(BaseModel):
    id: str
    name: str
    norm: Optional[str]
    beschreibung: Optional[str]
    kategorie: str
    ist_system_template: bool
    version: int
    punkte: list[PunktResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=list[ChecklisteResponse])
async def list_checklisten(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all checklist templates (org-specific + system templates)."""
    result = await db.execute(
        select(ChecklistenTemplate)
        .options(selectinload(ChecklistenTemplate.punkte))
        .where(
            (ChecklistenTemplate.organisation_id == org_id)
            | (ChecklistenTemplate.ist_system_template == True)
        )
        .order_by(ChecklistenTemplate.name)
    )
    return result.scalars().all()

@router.post("", response_model=ChecklisteResponse, status_code=201)
async def create_checkliste(
    data: ChecklisteCreate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new checklist template with check items."""
    template = ChecklistenTemplate(
        organisation_id=org_id,
        name=data.name,
        norm=data.norm,
        beschreibung=data.beschreibung,
        kategorie=data.kategorie,
    )
    db.add(template)
    await db.flush()

    for i, punkt in enumerate(data.punkte):
        p = ChecklistenPunkt(
            template_id=template.id,
            text=punkt.text,
            kategorie=punkt.kategorie,
            hinweis=punkt.hinweis,
            reihenfolge=punkt.reihenfolge or i,
            ist_pflicht=punkt.ist_pflicht,
        )
        db.add(p)

    await db.flush()

    # Reload with punkte
    result = await db.execute(
        select(ChecklistenTemplate)
        .options(selectinload(ChecklistenTemplate.punkte))
        .where(ChecklistenTemplate.id == template.id)
    )
    return result.scalar_one()

@router.delete("/{checkliste_id}", status_code=204)
async def delete_checkliste(
    checkliste_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChecklistenTemplate).where(
            ChecklistenTemplate.id == checkliste_id,
            ChecklistenTemplate.organisation_id == org_id,
            ChecklistenTemplate.ist_system_template == False,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Checkliste nicht gefunden")
    await db.delete(template)
