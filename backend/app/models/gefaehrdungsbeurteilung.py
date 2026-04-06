"""
Gefaehrdungsbeurteilung - Risk assessment documents
- Gefaehrdungsbeurteilung: Overall risk assessment for a work area
- GBU_Gefaehrdung: Individual hazards identified in a risk assessment
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Gefaehrdungsbeurteilung(Base):
    """Risk assessment document for a work area"""
    __tablename__ = "gefaehrdungsbeurteilungen"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    erstellt_von_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    titel: Mapped[str] = mapped_column(String(255), nullable=False)
    arbeitsbereich: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="entwurf")  # entwurf, aktiv, archiviert
    datum: Mapped[date] = mapped_column(Date, nullable=False)
    naechste_ueberpruefung_am: Mapped[date | None] = mapped_column(Date)
    bemerkung: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="gefaehrdungsbeurteilungen")
    erstellt_von = relationship("User", back_populates="gefaehrdungsbeurteilungen")
    gefaehrdungen = relationship(
        "GBU_Gefaehrdung",
        back_populates="gbu",
        cascade="all, delete-orphan"
    )


class GBU_Gefaehrdung(Base):
    """Identified hazard within a risk assessment"""
    __tablename__ = "gbu_gefaehrdungen"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    gbu_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("gefaehrdungsbeurteilungen.id"), nullable=False, index=True
    )

    gefaehrdung: Mapped[str] = mapped_column(Text, nullable=False)
    risikoklasse: Mapped[str] = mapped_column(String(20))  # gering, mittel, hoch, sehr_hoch
    bestehende_massnahmen: Mapped[str | None] = mapped_column(Text)
    weitere_massnahmen: Mapped[str | None] = mapped_column(Text)
    verantwortlich: Mapped[str | None] = mapped_column(String(255))
    frist: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="offen")  # offen, in_umsetzung, erledigt
    reihenfolge: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    gbu = relationship("Gefaehrdungsbeurteilung", back_populates="gefaehrdungen")
