"""
Fremdfirmen API - External contractors and their documentation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.core.database import get_db
from app.core.security import decode_token
from app.models.fremdfirma import Fremdfirma, FremdfirmaDokument
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/fremdfirmen", tags=["Fremdfirmen"])
security = HTTPBearer()


# --- Schemas ---

class FremdfirmaDokumentCreate(BaseModel):
    typ: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    gueltig_bis: Optional[date] = None


class FremdfirmaDokumentUpdate(BaseModel):
    status: Optional[str] = None
    gueltig_bis: Optional[date] = None


class FremdfirmaDokumentResponse(BaseModel):
    id: str
    fremdfirma_id: str
    typ: str
    name: str
    gueltig_bis: Optional[date]
    status: str
    bemerkung: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FremdfirmaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    ansprechpartner: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    taetigkeit: Optional[str] = None


class FremdfirmaUpdate(BaseModel):
    name: Optional[str] = None
    ansprechpartner: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    taetigkeit: Optional[str] = None
    status: Optional[str] = None


class FremdfirmaResponse(BaseModel):
    id: str
    name: str
    ansprechpartner: Optional[str]
    email: Optional[str]
    telefon: Optional[str]
    taetigkeit: Optional[str]
    status: str
    dokumente: list[FremdfirmaDokumentResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


async def _get_org_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    return payload.get("org")


@router.get("", response_model=list[FremdfirmaResponse])
async def list_fremdfirmen(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all contractors for org with dokumente loaded."""
    result = await db.execute(
        select(Fremdfirma)
        .options(selectinload(Fremdfirma.dokumente))
        .where(Fremdfirma.organisation_id == org_id)
        .order_by(Fremdfirma.name)
    )
    return result.scalars().all()


@router.post("", response_model=FremdfirmaResponse, status_code=201)
async def create_fremdfirma(
    data: FremdfirmaCreate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new contractor."""
    fremdfirma = Fremdfirma(
        organisation_id=org_id,
        **data.model_dump(),
    )
    db.add(fremdfirma)
    await db.flush()

    # Reload with dokumente
    result = await db.execute(
        select(Fremdfirma)
        .options(selectinload(Fremdfirma.dokumente))
        .where(Fremdfirma.id == fremdfirma.id)
    )
    return result.scalar_one()


@router.put("/{fremdfirma_id}", response_model=FremdfirmaResponse)
async def update_fremdfirma(
    fremdfirma_id: str,
    data: FremdfirmaUpdate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a contractor."""
    result = await db.execute(
        select(Fremdfirma).where(
            Fremdfirma.id == fremdfirma_id,
            Fremdfirma.organisation_id == org_id,
        )
    )
    fremdfirma = result.scalar_one_or_none()
    if not fremdfirma:
        raise HTTPException(status_code=404, detail="Fremdfirma nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fremdfirma, field, value)
    await db.flush()

    # Reload with dokumente
    result = await db.execute(
        select(Fremdfirma)
        .options(selectinload(Fremdfirma.dokumente))
        .where(Fremdfirma.id == fremdfirma.id)
    )
    return result.scalar_one()


@router.delete("/{fremdfirma_id}", status_code=204)
async def delete_fremdfirma(
    fremdfirma_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a contractor."""
    result = await db.execute(
        select(Fremdfirma).where(
            Fremdfirma.id == fremdfirma_id,
            Fremdfirma.organisation_id == org_id,
        )
    )
    fremdfirma = result.scalar_one_or_none()
    if not fremdfirma:
        raise HTTPException(status_code=404, detail="Fremdfirma nicht gefunden")
    await db.delete(fremdfirma)


@router.post("/{fremdfirma_id}/dokumente", response_model=FremdfirmaDokumentResponse, status_code=201)
async def add_dokument(
    fremdfirma_id: str,
    data: FremdfirmaDokumentCreate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Add a document to a contractor."""
    # Verify fremdfirma exists and belongs to org
    result_ff = await db.execute(
        select(Fremdfirma).where(
            Fremdfirma.id == fremdfirma_id,
            Fremdfirma.organisation_id == org_id,
        )
    )
    fremdfirma = result_ff.scalar_one_or_none()
    if not fremdfirma:
        raise HTTPException(status_code=404, detail="Fremdfirma nicht gefunden")

    dokument = FremdfirmaDokument(
        fremdfirma_id=fremdfirma_id,
        typ=data.typ,
        name=data.name,
        gueltig_bis=data.gueltig_bis,
    )
    db.add(dokument)
    await db.flush()
    await db.refresh(dokument)
    return dokument


@router.put("/{fremdfirma_id}/dokumente/{dok_id}", response_model=FremdfirmaDokumentResponse)
async def update_dokument(
    fremdfirma_id: str,
    dok_id: str,
    data: FremdfirmaDokumentUpdate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a document in a contractor."""
    # Verify fremdfirma exists and belongs to org
    result_ff = await db.execute(
        select(Fremdfirma).where(
            Fremdfirma.id == fremdfirma_id,
            Fremdfirma.organisation_id == org_id,
        )
    )
    fremdfirma = result_ff.scalar_one_or_none()
    if not fremdfirma:
        raise HTTPException(status_code=404, detail="Fremdfirma nicht gefunden")

    # Get and update dokument
    result = await db.execute(
        select(FremdfirmaDokument).where(
            FremdfirmaDokument.id == dok_id,
            FremdfirmaDokument.fremdfirma_id == fremdfirma_id,
        )
    )
    dokument = result.scalar_one_or_none()
    if not dokument:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dokument, field, value)
    await db.flush()
    await db.refresh(dokument)
    return dokument


@router.delete("/{fremdfirma_id}/dokumente/{dok_id}", status_code=204)
async def delete_dokument(
    fremdfirma_id: str,
    dok_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document from a contractor."""
    # Verify fremdfirma exists and belongs to org
    result_ff = await db.execute(
        select(Fremdfirma).where(
            Fremdfirma.id == fremdfirma_id,
            Fremdfirma.organisation_id == org_id,
        )
    )
    fremdfirma = result_ff.scalar_one_or_none()
    if not fremdfirma:
        raise HTTPException(status_code=404, detail="Fremdfirma nicht gefunden")

    # Get and delete dokument
    result = await db.execute(
        select(FremdfirmaDokument).where(
            FremdfirmaDokument.id == dok_id,
            FremdfirmaDokument.fremdfirma_id == fremdfirma_id,
        )
    )
    dokument = result.scalar_one_or_none()
    if not dokument:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    await db.delete(dokument)
