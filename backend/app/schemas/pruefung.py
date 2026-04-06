"""
Prüfung & Mangel Schemas
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class PruefungCreate(BaseModel):
    arbeitsmittel_id: str
    checkliste_id: str


class PruefPunktUpdate(BaseModel):
    ergebnis: str = Field(..., pattern="^(ok|mangel|nicht_anwendbar)$")
    bemerkung: Optional[str] = None


class PruefungAbschliessenRequest(BaseModel):
    unterschrift_name: str
    unterschrift_url: Optional[str] = None  # Base64 DataURL der Canvas-Signatur
    bemerkung: Optional[str] = None


class MangelCreate(BaseModel):
    pruef_punkt_id: Optional[str] = None
    beschreibung: str = Field(..., min_length=1)
    schweregrad: str = Field(..., pattern="^(gruen|orange|rot)$")
    frist: Optional[date] = None


class MangelStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(offen|in_bearbeitung|erledigt)$")
    kommentar: Optional[str] = None


class MangelResponse(BaseModel):
    id: str
    beschreibung: str
    schweregrad: str
    status: str
    frist: Optional[date]
    erledigt_am: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PruefPunktResponse(BaseModel):
    id: str
    checklisten_punkt_id: str
    ergebnis: str
    bemerkung: Optional[str]
    geprueft_am: Optional[datetime]

    class Config:
        from_attributes = True


class PruefungResponse(BaseModel):
    id: str
    arbeitsmittel_id: str
    checkliste_id: str
    pruefer_id: str
    status: str
    ergebnis: Optional[str]
    bemerkung: Optional[str]
    ist_abgeschlossen: bool
    abgeschlossen_am: Optional[datetime]
    gestartet_am: datetime
    protokoll_pdf_url: Optional[str]
    unterschrift_name: Optional[str] = None
    unterschrift_url: Optional[str] = None
    pruef_punkte: list[PruefPunktResponse] = []
    maengel: list[MangelResponse] = []

    class Config:
        from_attributes = True
