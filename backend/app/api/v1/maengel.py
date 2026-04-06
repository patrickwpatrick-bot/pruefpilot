"""
Mängel API - List and update defects across all inspections

SEC-Fix 2026-04-06: Zentrale get_current_org_id Dependency statt lokaler _get_org_id.
SEC-Fix 2026-04-06: update_mangel_status prüft jetzt org_id via Join auf Pruefung→User.
Vorher: Cross-Tenant-Zugriff auf fremde Mängel möglich (DSGVO-Verletzung).
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload
from app.core.database import get_db
from app.core.security import get_current_org_id
from app.models.mangel import Mangel
from app.models.pruefung import Pruefung
from app.models.user import User
from app.schemas.pruefung import MangelStatusUpdate

router = APIRouter(prefix="/maengel", tags=["Mängel"])


@router.get("", summary="List defects", description="Retrieve all defects (Mängel) across all inspections for the organisation with filtering by status.")
async def list_maengel(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(None, description="Filter by status: offen, in_bearbeitung, erledigt"),
):
    """List all defects across all inspections for the organisation."""
    # Direkter Join: Mangel → Pruefung → User.organisation_id
    query = (
        select(Mangel)
        .join(Pruefung, Mangel.pruefung_id == Pruefung.id)
        .join(User, Pruefung.pruefer_id == User.id)
        .options(selectinload(Mangel.pruefung).selectinload(Pruefung.arbeitsmittel))
        .where(User.organisation_id == org_id)
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


@router.put("/{mangel_id}/status", summary="Update defect status", description="Update the status of a defect (offen → in_bearbeitung → erledigt). Includes optional completion comments. Cross-tenant access is prevented.")
async def update_mangel_status(
    mangel_id: str,
    data: MangelStatusUpdate,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update defect status (offen → in_bearbeitung → erledigt).

    SEC-Fix: Validiert org_id via Join auf Pruefung→User. Verhindert
    Cross-Tenant-Zugriff auf Mängel fremder Organisationen.
    """
    # Mangel laden MIT org_id-Validierung über Pruefung → User
    result = await db.execute(
        select(Mangel)
        .join(Pruefung, Mangel.pruefung_id == Pruefung.id)
        .join(User, Pruefung.pruefer_id == User.id)
        .where(Mangel.id == mangel_id, User.organisation_id == org_id)
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
