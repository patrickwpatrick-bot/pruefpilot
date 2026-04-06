"""
Foto - Attached to inspections or defects
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Foto(Base):
    __tablename__ = "fotos"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    mangel_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("maengel.id"), index=True
    )
    pruefung_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("pruefungen.id"), index=True
    )

    dateiname: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), default="image/jpeg")
    groesse_bytes: Mapped[int | None] = mapped_column()
    beschreibung: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    mangel = relationship("Mangel", back_populates="fotos")
