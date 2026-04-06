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
from app.core.security import decode_token
from app.models.audit_log import AuditLog
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/audit-log", tags=["Audit-Log"])
security = HTTPBearer()


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


async def _get_org_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    return payload.get("org")


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    entitaet: Optional[str] = Query(default=None),
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
