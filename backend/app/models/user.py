"""
User Model - Belongs to an Organisation, has a Role
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organisationen.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    vorname: Mapped[str] = mapped_column(String(100), nullable=False)
    nachname: Mapped[str] = mapped_column(String(100), nullable=False)
    rolle: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pruefer"
    )  # admin, pruefer, mitarbeiter
    ist_aktiv: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="users")
    pruefungen = relationship("Pruefung", back_populates="pruefer")
    unterweisungen_durchgefuehrt = relationship("UnterweisungsDurchfuehrung", back_populates="durchgefuehrt_von")
    gefaehrdungsbeurteilungen = relationship("Gefaehrdungsbeurteilung", back_populates="erstellt_von")

    @property
    def voller_name(self) -> str:
        return f"{self.vorname} {self.nachname}"
