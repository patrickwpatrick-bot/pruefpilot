"""
Arbeitsmittel Schemas
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class ArbeitsmittelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    typ: str = Field(..., min_length=1, max_length=100)
    standort_id: Optional[str] = None
    hersteller: Optional[str] = None
    modell: Optional[str] = None
    seriennummer: Optional[str] = None
    baujahr: Optional[int] = None
    beschreibung: Optional[str] = None
    norm: Optional[str] = None
    pruef_intervall_monate: float = 12
    foto_url: Optional[str] = None
    naechste_pruefung_am: Optional[date] = None


class ArbeitsmittelUpdate(BaseModel):
    name: Optional[str] = None
    typ: Optional[str] = None
    standort_id: Optional[str] = None
    hersteller: Optional[str] = None
    modell: Optional[str] = None
    seriennummer: Optional[str] = None
    baujahr: Optional[int] = None
    beschreibung: Optional[str] = None
    norm: Optional[str] = None
    pruef_intervall_monate: Optional[float] = None
    foto_url: Optional[str] = None
    naechste_pruefung_am: Optional[date] = None


class ArbeitsmittelResponse(BaseModel):
    id: str
    name: str
    typ: str
    standort_id: Optional[str]
    hersteller: Optional[str]
    modell: Optional[str]
    seriennummer: Optional[str]
    baujahr: Optional[int]
    foto_url: Optional[str]
    beschreibung: Optional[str]
    norm: Optional[str]
    pruef_intervall_monate: float
    letzte_pruefung_am: Optional[date]
    naechste_pruefung_am: Optional[date]
    ampel_status: str
    qr_code_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ArbeitsmittelListResponse(BaseModel):
    items: list[ArbeitsmittelResponse]
    total: int
