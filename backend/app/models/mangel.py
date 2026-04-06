"""
Mangel (Defect) - Found during an inspection
3-level severity system: gruen (none), orange (fix within deadline), rot (immediate action)
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Mangel(Base):
    __tablename__ = "maengel"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pruefung_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("pruefungen.id"), nullable=False, index=True
    )
    pruef_punkt_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("pruef_punkte.id")
    )

    beschreibung: Mapped[str] = mapped_column(Text, nullable=False)
    schweregrad: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # gruen, orange, rot

    # Status tracking: offen, in_bearbeitung, erledigt
    status: Mapped[str] = mapped_column(String(20), default="offen")
    frist: Mapped[date | None] = mapped_column(Date)
    erledigt_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    erledigt_kommentar: Mapped[str | None] = mapped_column(Text)
    zugewiesen_an: Mapped[str | None] = mapped_column(String(255))  # freies Textfeld, Name der zugewiesenen Person
    behoben_von_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"))  # welcher User hat behoben

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    pruefung = relationship("Pruefung", back_populates="maengel")
    pruef_punkt = relationship("PruefPunkt")
    fotos = relationship("Foto", back_populates="mangel", cascade="all, delete-orphan")
