"""
Organisation (Firma/Betrieb) - Multi-Tenant Root Entity
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Organisation(Base):
    __tablename__ = "organisationen"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    strasse: Mapped[str | None] = mapped_column(String(255))
    plz: Mapped[str | None] = mapped_column(String(10))
    ort: Mapped[str | None] = mapped_column(String(255))
    telefon: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    logo_url: Mapped[str | None] = mapped_column(Text)
    branche: Mapped[str | None] = mapped_column(String(100))
    verantwortlicher_name: Mapped[str | None] = mapped_column(String(255))
    verantwortlicher_email: Mapped[str | None] = mapped_column(String(255))
    verantwortlicher_telefon: Mapped[str | None] = mapped_column(String(50))

    # Configurable Berufe (job titles) for this organisation — stored as JSON array
    berufe_config: Mapped[str | None] = mapped_column(Text)

    # Subscription
    plan: Mapped[str] = mapped_column(String(50), default="trial")  # trial, starter, professional, business
    trial_endet_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))  # für Webhook-Verarbeitung
    plan_aktiv_seit: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # Wann wurde Plan aktiviert

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    standorte = relationship("Standort", back_populates="organisation", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organisation", cascade="all, delete-orphan")
    arbeitsmittel = relationship("Arbeitsmittel", back_populates="organisation", cascade="all, delete-orphan")
    checklisten_templates = relationship("ChecklistenTemplate", back_populates="organisation", cascade="all, delete-orphan")
    unterweisungs_vorlagen = relationship("UnterweisungsVorlage", back_populates="organisation", cascade="all, delete-orphan")
    unterweisungs_durchfuehrungen = relationship("UnterweisungsDurchfuehrung", back_populates="organisation", cascade="all, delete-orphan")
    gefaehrdungsbeurteilungen = relationship("Gefaehrdungsbeurteilung", back_populates="organisation", cascade="all, delete-orphan")
    gefahrstoffe = relationship("Gefahrstoff", back_populates="organisation", cascade="all, delete-orphan")
    fremdfirmen = relationship("Fremdfirma", back_populates="organisation", cascade="all, delete-orphan")
    abteilungen = relationship("Abteilung", back_populates="organisation", cascade="all, delete-orphan")
    mitarbeiter = relationship("Mitarbeiter", back_populates="organisation", cascade="all, delete-orphan")
    unterweisungs_zuweisungen = relationship("UnterweisungsZuweisung", back_populates="organisation", cascade="all, delete-orphan")
