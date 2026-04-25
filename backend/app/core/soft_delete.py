"""
Soft-Delete Mixin für DSGVO-konformes Löschen.

SEC-Fix 2026-04-12 (M1 — DSGVO-Löschkonzept):
Statt Cascade-Delete wird deleted_at gesetzt. Daten bleiben in der DB
für Nachvollziehbarkeit und können nach Retention-Frist endgültig
gelöscht werden.

Verwendung:
    class MeinModel(SoftDeleteMixin, Base):
        __tablename__ = "mein_model"
        ...

    # Soft-Delete ausführen:
    from app.core.soft_delete import soft_delete
    await soft_delete(db, objekt)

    # Abfrage nur aktive Einträge:
    from app.core.soft_delete import not_deleted
    query = select(MeinModel).where(not_deleted(MeinModel))
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TypeVar, Type

from sqlalchemy import DateTime, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class SoftDeleteMixin:
    """Mixin das deleted_at Spalte zu einem Model hinzufügt."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, index=True
    )


def not_deleted(model_class) -> bool:
    """Filter-Clause: nur nicht-gelöschte Einträge.

    Verwendung: select(Model).where(not_deleted(Model))
    """
    return model_class.deleted_at.is_(None)


async def soft_delete(db: AsyncSession, obj, cascade_children: list = None) -> None:
    """Setzt deleted_at auf jetzt. Optional auch bei Kind-Objekten.

    Args:
        db: AsyncSession
        obj: Das zu löschende Objekt
        cascade_children: Liste von (Model, foreign_key_column, parent_id_value)
            Tuples für kaskadierende Soft-Deletes
    """
    now = datetime.now(timezone.utc)
    obj.deleted_at = now

    if cascade_children:
        from sqlalchemy import update
        for child_model, fk_column, parent_id in cascade_children:
            await db.execute(
                update(child_model)
                .where(fk_column == parent_id)
                .where(child_model.deleted_at.is_(None))
                .values(deleted_at=now)
            )
