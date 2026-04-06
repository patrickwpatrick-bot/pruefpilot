"""
Fremdfirma - External contractors and their documentation
- Fremdfirma: Contractor company information and status
- FremdfirmaDokument: Required documentation from contractors (insurance, training, etc.)
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Fremdfirma(Base):
    """External contractor company"""
    __tablename__ = "fremdfirmen"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ansprechpartner: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    telefon: Mapped[str | None] = mapped_column(String(50))
    taetigkeit: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="aktiv")  # aktiv, gesperrt, archiviert

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="fremdfirmen")
    dokumente = relationship(
        "FremdfirmaDokument",
        back_populates="fremdfirma",
        cascade="all, delete-orphan"
    )


class FremdfirmaDokument(Base):
    """Required documentation from a contractor"""
    __tablename__ = "fremdfirma_dokumente"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    fremdfirma_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("fremdfirmen.id"), nullable=False, index=True
    )

    typ: Mapped[str] = mapped_column(String(100))  # haftpflicht, unterweisung, qualifikation, gefaehrdungsbeurteilung, sonstiges
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gueltig_bis: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="aktuell")  # aktuell, abgelaufen, fehlend
    bemerkung: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    fremdfirma = relationship("Fremdfirma", back_populates="dokumente")
