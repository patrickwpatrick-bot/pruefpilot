"""
Organisation API - Get and update company/letterhead data
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import json
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.core.audit import log_audit, compute_changes
from app.models.organisation import Organisation

router = APIRouter(prefix="/organisation", tags=["Organisation"])
class OrganisationResponse(BaseModel):
    id: str
    name: str
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None
    branche: Optional[str] = None
    verantwortlicher_name: Optional[str] = None
    verantwortlicher_email: Optional[str] = None
    verantwortlicher_telefon: Optional[str] = None
    berufe: List[str] = []
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class OrganisationUpdate(BaseModel):
    name: Optional[str] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None
    branche: Optional[str] = None
    verantwortlicher_name: Optional[str] = None
    verantwortlicher_email: Optional[str] = None
    verantwortlicher_telefon: Optional[str] = None
    logo_url: Optional[str] = None

def _org_to_response(org: Organisation) -> OrganisationResponse:
    berufe = []
    if org.berufe_config:
        try:
            berufe = json.loads(org.berufe_config)
        except Exception:
            berufe = []
    return OrganisationResponse(
        id=str(org.id), name=org.name, strasse=org.strasse, plz=org.plz, ort=org.ort,
        telefon=org.telefon, email=org.email, branche=org.branche,
        verantwortlicher_name=org.verantwortlicher_name,
        verantwortlicher_email=org.verantwortlicher_email,
        verantwortlicher_telefon=org.verantwortlicher_telefon,
        berufe=berufe,
        logo_url=org.logo_url,
    )

@router.get("", response_model=OrganisationResponse)
async def get_organisation(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current organisation details."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden")
    return _org_to_response(org)

@router.put("", response_model=OrganisationResponse)
async def update_organisation(
    data: OrganisationUpdate,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update organisation / company data."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden")

    # Snapshot before update
    vorher_snapshot = org.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)

    await db.flush()
    await db.refresh(org)

    # Snapshot after update and compute changes
    nachher_snapshot = org.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    aenderungen = compute_changes(vorher_snapshot, nachher_snapshot)

    # Log audit only if there were changes
    if aenderungen:
        await log_audit(
            db=db,
            organisation_id=org_id,
            user_id=user_id,
            aktion="geaendert",
            entitaet="Organisation",
            entitaet_id=org.id,
            entitaet_name=org.name,
            aenderungen=aenderungen,
            vorher_snapshot=vorher_snapshot,
            nachher_snapshot=nachher_snapshot,
        )

    return _org_to_response(org)

# ---- Berufe management ----

class BerufeUpdate(BaseModel):
    berufe: List[str]

@router.get("/berufe", response_model=List[str])
async def get_berufe(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get configured job titles for this organisation."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org or not org.berufe_config:
        return []
    try:
        return json.loads(org.berufe_config)
    except Exception:
        return []

@router.put("/berufe", response_model=List[str])
async def update_berufe(
    data: BerufeUpdate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Set the list of job titles for this organisation."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden")
    berufe = list(dict.fromkeys(b.strip() for b in data.berufe if b.strip()))
    org.berufe_config = json.dumps(berufe, ensure_ascii=False)
    await db.flush()
    return berufe
