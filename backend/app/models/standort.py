"""
Standort - Physical location belonging to an Organisation
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Standort(Base):
    __tablename__ = "standorte"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    strasse: Mapped[str | None] = mapped_column(String(255))
    hausnummer: Mapped[str | None] = mapped_column(String(255))
    plz: Mapped[str | None] = mapped_column(String(10))
    ort: Mapped[str | None] = mapped_column(String(255))
    gebaeude: Mapped[str | None] = mapped_column(String(255))
    abteilung: Mapped[str | None] = mapped_column(String(255))
    etage: Mapped[str | None] = mapped_column(String(255))
    beschreibung: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="standorte")
    arbeitsmittel = relationship("Arbeitsmittel", back_populates="standort", cascade="all, delete-orphan")
