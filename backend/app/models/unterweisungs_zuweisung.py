"""
UnterweisungsZuweisung - Assignment of a training to a specific employee
Includes token-based public signing
"""
import uuid
import secrets
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class UnterweisungsZuweisung(Base):
    """Assignment: which employee needs which training"""
    __tablename__ = "unterweisungs_zuweisungen"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    vorlage_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("unterweisungs_vorlagen.id"), nullable=False, index=True
    )
    mitarbeiter_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mitarbeiter.id"), nullable=False, index=True
    )
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisationen.id"), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(
        String(20), default="offen"
    )  # offen, versendet, unterschrieben, abgelaufen
    faellig_am: Mapped[date] = mapped_column(Date, nullable=False)
    unterschrieben_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    unterschrift_name: Mapped[str | None] = mapped_column(String(255))
    ip_adresse: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    gelesen_bestaetigt: Mapped[bool] = mapped_column(Boolean, default=False)

    # Token for public signing link (no login required)
    sign_token: Mapped[str] = mapped_column(
        String(64), unique=True, default=lambda: secrets.token_urlsafe(48), index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    vorlage = relationship("UnterweisungsVorlage", back_populates="zuweisungen")
    mitarbeiter = relationship("Mitarbeiter", back_populates="unterweisungs_zuweisungen")
    organisation = relationship("Organisation", back_populates="unterweisungs_zuweisungen")
