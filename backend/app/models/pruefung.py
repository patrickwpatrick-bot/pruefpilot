"""
Prüfung (Inspection) and PrüfPunkt (individual check items during inspection)
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Pruefung(Base):
    __tablename__ = "pruefungen"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    arbeitsmittel_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("arbeitsmittel.id"), nullable=False, index=True
    )
    checkliste_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("checklisten_templates.id"), nullable=False
    )
    pruefer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Status: entwurf, in_bearbeitung, abgeschlossen
    status: Mapped[str] = mapped_column(String(20), default="entwurf")
    ergebnis: Mapped[str | None] = mapped_column(String(20))  # bestanden, maengel, gesperrt
    bemerkung: Mapped[str | None] = mapped_column(Text)

    # Digital signature
    unterschrift_url: Mapped[str | None] = mapped_column(Text)
    unterschrift_name: Mapped[str | None] = mapped_column(String(255))

    # PDF
    protokoll_pdf_url: Mapped[str | None] = mapped_column(Text)

    # Lock: once completed, no more changes
    ist_abgeschlossen: Mapped[bool] = mapped_column(Boolean, default=False)
    abgeschlossen_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    gestartet_am: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    arbeitsmittel = relationship("Arbeitsmittel", back_populates="pruefungen")
    checkliste = relationship("ChecklistenTemplate", back_populates="pruefungen")
    pruefer = relationship("User", back_populates="pruefungen")
    pruef_punkte = relationship("PruefPunkt", back_populates="pruefung", cascade="all, delete-orphan")
    maengel = relationship("Mangel", back_populates="pruefung", cascade="all, delete-orphan")


class PruefPunkt(Base):
    """Individual check result within an inspection"""
    __tablename__ = "pruef_punkte"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pruefung_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("pruefungen.id"), nullable=False, index=True
    )
    checklisten_punkt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("checklisten_punkte.id"), nullable=False
    )

    # Result: ok, mangel, nicht_anwendbar, offen
    ergebnis: Mapped[str] = mapped_column(String(20), default="offen")
    bemerkung: Mapped[str | None] = mapped_column(Text)

    geprueft_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    pruefung = relationship("Pruefung", back_populates="pruef_punkte")
    checklisten_punkt = relationship("ChecklistenPunkt")
