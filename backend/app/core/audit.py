"""
Audit Logging Utility - Centralized function to log all changes
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.audit_log import AuditLog
from app.models.user import User
from typing import Optional
from datetime import date, datetime
import uuid


def _make_json_safe(obj):
    """Recursively convert non-JSON-serializable types (date, datetime, UUID) to strings."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_make_json_safe(v) for v in obj]
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    return obj


async def log_audit(
    db: AsyncSession,
    organisation_id: str,
    user_id: str,
    aktion: str,  # "erstellt" | "geaendert" | "geloescht"
    entitaet: str,  # "Arbeitsmittel" | "Mitarbeiter" | "Gefahrstoff" | "Organisation" etc.
    entitaet_id: str,
    entitaet_name: Optional[str] = None,
    aenderungen: Optional[dict] = None,  # {"field": {"alt": "old", "neu": "new"}}
    vorher_snapshot: Optional[dict] = None,
    nachher_snapshot: Optional[dict] = None,
) -> AuditLog:
    """
    Log an audit trail entry for any create/update/delete operation.

    Args:
        db: AsyncSession database connection
        organisation_id: ID of the organisation
        user_id: ID of the user performing the action
        aktion: Action type (erstellt, geaendert, geloescht)
        entitaet: Entity type (e.g., Arbeitsmittel, Mitarbeiter, Gefahrstoff)
        entitaet_id: ID of the entity being changed
        entitaet_name: Human-readable name of the entity
        aenderungen: Dict of field changes like {"field": {"alt": "old", "neu": "new"}}
        vorher_snapshot: Full object state before change
        nachher_snapshot: Full object state after change

    Returns:
        The created AuditLog record
    """
    # Get user name
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    user_name = user.voller_name if user else "Unbekannt"

    # Create audit log entry — convert all date/datetime/UUID objects to JSON-safe strings
    audit_log = AuditLog(
        organisation_id=organisation_id,
        user_id=user_id,
        user_name=user_name,
        aktion=aktion,
        entitaet=entitaet,
        entitaet_id=entitaet_id,
        entitaet_name=entitaet_name,
        aenderungen=_make_json_safe(aenderungen),
        vorher_snapshot=_make_json_safe(vorher_snapshot),
        nachher_snapshot=_make_json_safe(nachher_snapshot),
    )

    db.add(audit_log)
    await db.flush()
    return audit_log


def compute_changes(old_data: dict, new_data: dict) -> dict:
    """
    Compute the difference between old and new data.

    Args:
        old_data: Dict of old values
        new_data: Dict of new values

    Returns:
        Dict like {"field": {"alt": "old_value", "neu": "new_value"}}
    """
    changes = {}

    # Check all keys in new_data
    for key, new_value in new_data.items():
        old_value = old_data.get(key)
        # Only record if value changed (considering None vs missing)
        if old_value != new_value:
            changes[key] = {
                "alt": old_value,
                "neu": new_value,
            }

    # Check for deleted keys (in old but not in new)
    for key, old_value in old_data.items():
        if key not in new_data:
            changes[key] = {
                "alt": old_value,
                "neu": None,
            }

    return changes
