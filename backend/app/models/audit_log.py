"""
AuditLog — Tracks all changes across the application
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AuditLog(Base):
    """Records every create/update/delete action with before/after snapshots."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # What was changed
    aktion: Mapped[str] = mapped_column(String(50), nullable=False)  # erstellt, geaendert, geloescht
    entitaet: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Gefahrstoff", "Arbeitsmittel"
    entitaet_id: Mapped[str] = mapped_column(String(36), nullable=False)
    entitaet_name: Mapped[str | None] = mapped_column(String(255))  # Human-readable name

    # Change details
    aenderungen: Mapped[dict | None] = mapped_column(JSON)  # {"field": {"alt": "old", "neu": "new"}}
    vorher_snapshot: Mapped[dict | None] = mapped_column(JSON)  # Full object before change
    nachher_snapshot: Mapped[dict | None] = mapped_column(JSON)  # Full object after change

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    organisation = relationship("Organisation", backref="audit_logs")
