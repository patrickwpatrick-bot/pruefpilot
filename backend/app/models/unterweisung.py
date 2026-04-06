"""
Unterweisung - Training templates and completion records
- UnterweisungsVorlage: Training template that can be assigned to employees
- UnterweisungsDurchfuehrung: Record of when training was completed
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class UnterweisungsVorlage(Base):
    """Training template for employees (e.g., fire safety, machinery, hazmat)"""
    __tablename__ = "unterweisungs_vorlagen"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organisationen.id"), index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text)
    kategorie: Mapped[str] = mapped_column(String(100))  # brandschutz, maschinen, gefahrstoffe, allgemein
    inhalt: Mapped[str] = mapped_column(Text, nullable=False)
    ist_system_template: Mapped[bool] = mapped_column(Boolean, default=False)
    intervall_monate: Mapped[int] = mapped_column(Integer, default=12)
    betroffene_qualifikationen: Mapped[str | None] = mapped_column(Text)
    ist_pflicht_fuer_alle: Mapped[bool] = mapped_column(Boolean, default=False)
    norm_referenz: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="unterweisungs_vorlagen")
    durchfuehrungen = relationship(
        "UnterweisungsDurchfuehrung",
        back_populates="vorlage",
        cascade="all, delete-orphan"
    )
    zuweisungen = relationship("UnterweisungsZuweisung", back_populates="vorlage", cascade="all, delete-orphan")


class UnterweisungsDurchfuehrung(Base):
    """Record of a training completion by an employee"""
    __tablename__ = "unterweisungs_durchfuehrungen"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    vorlage_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("unterweisungs_vorlagen.id"), nullable=False, index=True
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    durchgefuehrt_von_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    teilnehmer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    teilnehmer_email: Mapped[str | None] = mapped_column(String(255))
    datum: Mapped[date] = mapped_column(Date, nullable=False)
    unterschrift_name: Mapped[str | None] = mapped_column(String(255))
    bemerkung: Mapped[str | None] = mapped_column(Text)
    naechste_unterweisung_am: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    vorlage = relationship("UnterweisungsVorlage", back_populates="durchfuehrungen")
    organisation = relationship("Organisation", back_populates="unterweisungs_durchfuehrungen")
    durchgefuehrt_von = relationship("User", back_populates="unterweisungen_durchgefuehrt")
