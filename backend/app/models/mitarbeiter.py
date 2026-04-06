"""
Mitarbeiter (Employee) + Abteilung (Department) + Dokument models
"""
import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Abteilung(Base):
    """Department within an organisation"""
    __tablename__ = "abteilungen"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="abteilungen")
    mitarbeiter = relationship("Mitarbeiter", back_populates="abteilung", cascade="all, delete-orphan")


class Mitarbeiter(Base):
    """Employee record (not a login user - just HR data)"""
    __tablename__ = "mitarbeiter"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    abteilung_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("abteilungen.id"), index=True
    )

    vorname: Mapped[str] = mapped_column(String(100), nullable=False)
    nachname: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    telefon: Mapped[str | None] = mapped_column(String(50))
    beruf: Mapped[str | None] = mapped_column(String(255))
    personalnummer: Mapped[str | None] = mapped_column(String(50))
    eintrittsdatum: Mapped[date | None] = mapped_column(Date)
    ist_aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
    typ: Mapped[str] = mapped_column(String(20), default='intern')   # intern | extern
    unternehmen: Mapped[str | None] = mapped_column(String(255))     # for extern employees

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="mitarbeiter")
    abteilung = relationship("Abteilung", back_populates="mitarbeiter")
    dokumente = relationship("MitarbeiterDokument", back_populates="mitarbeiter", cascade="all, delete-orphan")
    unterweisungs_zuweisungen = relationship("UnterweisungsZuweisung", back_populates="mitarbeiter", cascade="all, delete-orphan")

    @property
    def voller_name(self) -> str:
        return f"{self.vorname} {self.nachname}"


class MitarbeiterDokument(Base):
    """Documents associated with an employee (licenses, certificates)"""
    __tablename__ = "mitarbeiter_dokumente"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    mitarbeiter_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mitarbeiter.id"), nullable=False, index=True
    )
    typ: Mapped[str] = mapped_column(String(50), nullable=False)  # staplerschein, kranschein, ersthelfer, schweisserschein, sonstiges
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gueltig_bis: Mapped[date | None] = mapped_column(Date)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="gueltig")  # gueltig, abgelaufen, fehlt

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    mitarbeiter = relationship("Mitarbeiter", back_populates="dokumente")
