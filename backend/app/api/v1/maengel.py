"""
Mängel API - List and update defects across all inspections
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import decode_token
from app.models.mangel import Mangel
from app.models.pruefung import Pruefung
from app.models.user import User
from app.schemas.pruefung import MangelStatusUpdate
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/maengel", tags=["Mängel"])
security = HTTPBearer()


async def _get_org_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    return payload.get("org")


@router.get("")
async def list_maengel(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = None,
):
    """List all defects across all inspections for the organisation."""
    # Get all user IDs in org
    result = await db.execute(
        select(User.id).where(User.organisation_id == org_id)
    )
    user_ids = [row[0] for row in result.all()]

    # Get all pruefungen for org
    result = await db.execute(
        select(Pruefung.id).where(Pruefung.pruefer_id.in_(user_ids))
    )
    pruefung_ids = [row[0] for row in result.all()]

    if not pruefung_ids:
        return []

    query = (
        select(Mangel)
        .options(selectinload(Mangel.pruefung).selectinload(Pruefung.arbeitsmittel))
        .where(Mangel.pruefung_id.in_(pruefung_ids))
    )

    if status_filter:
        query = query.where(Mangel.status == status_filter)

    query = query.order_by(Mangel.created_at.desc())
    result = await db.execute(query)
    maengel = result.scalars().all()

    return [
        {
            "id": m.id,
            "beschreibung": m.beschreibung,
            "schweregrad": m.schweregrad,
            "status": m.status,
            "frist": m.frist,
            "erledigt_am": m.erledigt_am,
            "created_at": m.created_at,
            "pruefung_id": m.pruefung_id,
            "arbeitsmittel_name": m.pruefung.arbeitsmittel.name if m.pruefung and m.pruefung.arbeitsmittel else None,
        }
        for m in maengel
    ]


@router.put("/{mangel_id}/status")
async def update_mangel_status(
    mangel_id: str,
    data: MangelStatusUpdate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update defect status (offen → in_bearbeitung → erledigt)."""
    result = await db.execute(
        select(Mangel).where(Mangel.id == mangel_id)
    )
    mangel = result.scalar_one_or_none()
    if not mangel:
        raise HTTPException(status_code=404, detail="Mangel nicht gefunden")

    mangel.status = data.status
    if data.kommentar:
        mangel.erledigt_kommentar = data.kommentar
    if data.status == "erledigt":
        mangel.erledigt_am = datetime.now(timezone.utc)

    await db.flush()
    return {"status": "ok"}
