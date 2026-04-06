"""
AuditLog API — View and revert changes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit-log", tags=["Audit-Log"])
class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    aktion: str
    entitaet: str
    entitaet_id: str
    entitaet_name: Optional[str]
    aenderungen: Optional[dict]
    vorher_snapshot: Optional[dict]
    nachher_snapshot: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=list[AuditLogResponse], summary="List audit logs", description="Retrieve audit logs for the organisation showing all create/update/delete actions with detailed change tracking.")
async def list_audit_logs(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, le=200, description="Number of logs to return (max 200)"),
    offset: int = Query(default=0, description="Number of logs to skip"),
    entitaet: Optional[str] = Query(default=None, description="Filter by entity type (e.g., Arbeitsmittel, Pruefung)"),
):
    """List audit logs, newest first."""
    query = (
        select(AuditLog)
        .where(AuditLog.organisation_id == org_id)
        .order_by(desc(AuditLog.created_at))
    )
    if entitaet:
        query = query.where(AuditLog.entitaet == entitaet)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
