"""
Gefahrstoff - Hazardous substances inventory and safety data
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Gefahrstoff(Base):
    """Hazardous substance stored and used in the organization"""
    __tablename__ = "gefahrstoffe"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hersteller: Mapped[str | None] = mapped_column(String(255))
    cas_nummer: Mapped[str | None] = mapped_column(String(50))
    gefahrenklasse: Mapped[str | None] = mapped_column(String(100))
    h_saetze: Mapped[str | None] = mapped_column(Text)
    p_saetze: Mapped[str | None] = mapped_column(Text)
    signalwort: Mapped[str | None] = mapped_column(String(50))
    lagerort: Mapped[str | None] = mapped_column(String(255))
    menge: Mapped[str | None] = mapped_column(String(100))
    foto_url: Mapped[str | None] = mapped_column(Text)
    sicherheitsdatenblatt_url: Mapped[str | None] = mapped_column(Text)
    betriebsanweisung_text: Mapped[str | None] = mapped_column(Text)
    letzte_aktualisierung: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="gefahrstoffe")
