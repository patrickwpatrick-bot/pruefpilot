"""
Checklisten-Templates and their Prüfpunkte
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text, Boolean, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ChecklistenTemplate(Base):
    __tablename__ = "checklisten_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organisation_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organisationen.id"), index=True
    )  # NULL = system-wide template

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    norm: Mapped[str | None] = mapped_column(String(100))  # e.g. "DIN EN 15635"
    beschreibung: Mapped[str | None] = mapped_column(Text)
    kategorie: Mapped[str] = mapped_column(String(100), nullable=False)  # regal, leiter, elektro, brandschutz, allgemein
    ist_system_template: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="checklisten_templates")
    punkte = relationship("ChecklistenPunkt", back_populates="template", cascade="all, delete-orphan", order_by="ChecklistenPunkt.reihenfolge")
    pruefungen = relationship("Pruefung", back_populates="checkliste")


class ChecklistenPunkt(Base):
    __tablename__ = "checklisten_punkte"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("checklisten_templates.id"), nullable=False, index=True
    )

    text: Mapped[str] = mapped_column(Text, nullable=False)
    kategorie: Mapped[str | None] = mapped_column(String(100))  # Grouping within checklist
    hinweis: Mapped[str | None] = mapped_column(Text)  # Help text for the inspector
    reihenfolge: Mapped[int] = mapped_column(Integer, default=0)
    ist_pflicht: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    template = relationship("ChecklistenTemplate", back_populates="punkte")
