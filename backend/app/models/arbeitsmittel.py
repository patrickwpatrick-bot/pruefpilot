"""
Arbeitsmittel - Equipment/asset that needs regular inspections
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Arbeitsmittel(Base):
    __tablename__ = "arbeitsmittel"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    standort_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("standorte.id"), index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    typ: Mapped[str] = mapped_column(String(100), nullable=False)  # regal, leiter, maschine, elektro, brandschutz
    hersteller: Mapped[str | None] = mapped_column(String(255))
    modell: Mapped[str | None] = mapped_column(String(255))
    seriennummer: Mapped[str | None] = mapped_column(String(255))
    baujahr: Mapped[int | None] = mapped_column(Integer)
    foto_url: Mapped[str | None] = mapped_column(Text)
    beschreibung: Mapped[str | None] = mapped_column(Text)

    # Inspection schedule
    norm: Mapped[str | None] = mapped_column(String(100))  # e.g. "DIN EN 15635", "DGUV V3"
    pruef_intervall_monate: Mapped[float] = mapped_column(Float, default=12)
    letzte_pruefung_am: Mapped[date | None] = mapped_column(Date)
    naechste_pruefung_am: Mapped[date | None] = mapped_column(Date)

    # QR Code
    qr_code_url: Mapped[str | None] = mapped_column(Text)

    # Status: gruen, gelb, rot, unbekannt
    ampel_status: Mapped[str] = mapped_column(String(20), default="unbekannt")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="arbeitsmittel")
    standort = relationship("Standort", back_populates="arbeitsmittel")
    pruefungen = relationship("Pruefung", back_populates="arbeitsmittel", cascade="all, delete-orphan")
