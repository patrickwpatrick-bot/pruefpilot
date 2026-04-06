"""
Formulare API - Generiere PDF-Formulare: Prüfprotokolle, Unterweisungsnachweise, etc.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_id, get_current_org_id
from app.models.pruefung import Pruefung, PruefPunkt
from app.models.organisation import Organisation
from app.models.user import User
from app.models.unterweisung import UnterweisungsVorlage, UnterweisungsDurchfuehrung
from app.models.gefaehrdungsbeurteilung import Gefaehrdungsbeurteilung, GBU_Gefaehrdung
from app.models.gefahrstoff import Gefahrstoff
from app.models.mangel import Mangel
from app.models.checkliste import ChecklistenTemplate
from app.services.formular_generator import FormularGenerator
import io

router = APIRouter(prefix="/formulare", tags=["Formulare"])


async def _get_org_data(
    org_id: str, db: AsyncSession
) -> Organisation:
    """Holt Organisations-Daten für Header."""
    result = await db.execute(
        select(Organisation).where(Organisation.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden")
    return org


async def _get_pruefung(
    pruefung_id: str, org_id: str, db: AsyncSession
) -> Pruefung:
    """Holt eine Prüfung und verifiziert Zugriff."""
    result = await db.execute(
        select(Pruefung)
        .options(
            selectinload(Pruefung.arbeitsmittel),
            selectinload(Pruefung.pruefer),
            selectinload(Pruefung.pruef_punkte),
            selectinload(Pruefung.maengel),
        )
        .where(Pruefung.id == pruefung_id)
    )
    pruefung = result.scalar_one_or_none()
    if not pruefung:
        raise HTTPException(status_code=404, detail="Prüfung nicht gefunden")

    # Verify Zugriff: Prüfer muss in der Org sein
    result = await db.execute(
        select(User).where(
            User.id == pruefung.pruefer_id,
            User.organisation_id == org_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diese Prüfung")

    return pruefung


@router.get("/pruefprotokoll/{pruefung_id}")
async def get_pruefprotokoll(
    pruefung_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    """
    Generiert ein Prüfprotokoll-PDF für eine Prüfung.

    Args:
        pruefung_id: ID der Prüfung

    Returns:
        PDF-Stream
    """
    # Daten laden
    org = await _get_org_data(org_id, db)
    pruefung = await _get_pruefung(pruefung_id, org_id, db)

    # Prüfdaten zusammenstellen
    pruef_punkte_data = [
        {
            "punkt": p.beschreibung,
            "ok": p.status == "ok",
            "mangel": p.status == "mangel",
            "na": p.status == "nicht_anwendbar",
            "bemerkung": p.bemerkung,
        }
        for p in pruefung.pruef_punkte
    ]

    maengel_data = [
        {
            "nummer": i + 1,
            "beschreibung": m.beschreibung,
            "schweregrad": m.schweregrad or "mittel",
            "frist": m.abstellfrist.strftime("%d.%m.%Y") if m.abstellfrist else "---",
        }
        for i, m in enumerate(pruefung.maengel)
    ]

    # Gesamtergebnis bestimmen
    if pruefung.ergebnis:
        gesamtergebnis = pruefung.ergebnis.lower()
    else:
        gesamtergebnis = "nicht abgeschlossen"

    pruefung_data = {
        "pruefung_id": pruefung_id[:8],
        "arbeitsmittel_name": pruefung.arbeitsmittel.name if pruefung.arbeitsmittel else "---",
        "arbeitsmittel_typ": pruefung.arbeitsmittel.geraeteart if pruefung.arbeitsmittel else "---",
        "seriennummer": pruefung.arbeitsmittel.seriennummer if pruefung.arbeitsmittel else "---",
        "standort": pruefung.arbeitsmittel.standort.standortname if pruefung.arbeitsmittel and pruefung.arbeitsmittel.standort else "---",
        "pruefer_name": pruefung.pruefer.name if pruefung.pruefer else "---",
        "unterschrift_name": pruefung.unterschrift_name or "---",
        "pruef_punkte": pruef_punkte_data,
        "maengel": maengel_data,
        "gesamtergebnis": gesamtergebnis,
    }

    # Generator initialisieren
    generator = FormularGenerator(
        org_name=org.name,
        org_strasse=org.strasse,
        org_plz=org.plz,
        org_ort=org.ort,
        org_telefon=org.telefon,
        org_email=org.email,
        logo_url=org.logo_url,
    )

    # PDF generieren
    pdf_bytes = await generator.pruefprotokoll(pruefung_data)

    # Rückgabe als Download
    filename = f"Pruefprotokoll_{pruefung_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/unterweisungsnachweis/{unterweisung_id}")
async def get_unterweisungsnachweis(
    unterweisung_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    """
    Generiert einen Unterweisungsnachweis-PDF.

    Args:
        unterweisung_id: ID der Unterweisung

    Returns:
        PDF-Stream
    """
    # Daten laden
    org = await _get_org_data(org_id, db)

    result = await db.execute(
        select(UnterweisungsVorlage)
        .options(selectinload(UnterweisungsVorlage.durchfuehrungen))
        .where(
            UnterweisungsVorlage.id == unterweisung_id,
            UnterweisungsVorlage.organisation_id == org_id,
        )
    )
    unterweisung = result.scalar_one_or_none()
    if not unterweisung:
        raise HTTPException(status_code=404, detail="Unterweisung nicht gefunden")

    # Teilnehmer aus Durchführungen laden
    result = await db.execute(
        select(UnterweisungsDurchfuehrung).where(
            UnterweisungsDurchfuehrung.vorlage_id == unterweisung_id
        )
    )
    teilnehmer_list = result.scalars().all()

    teilnehmer_data = [
        {
            "name": t.teilnehmer_name,
            "abteilung": "---",
        }
        for t in teilnehmer_list
    ]

    unterweisung_data = {
        "unterweisung_id": unterweisung_id[:8],
        "thema": unterweisung.name or "---",
        "datum": teilnehmer_list[0].datum.strftime("%d.%m.%Y") if teilnehmer_list else datetime.now().strftime("%d.%m.%Y"),
        "unterweiser_name": "---",
        "rechtsgrundlage": unterweisung.norm_referenz or "---",
        "inhalt_zusammenfassung": unterweisung.inhalt or "",
        "teilnehmer": teilnehmer_data,
    }

    # Generator
    generator = FormularGenerator(
        org_name=org.name,
        org_strasse=org.strasse,
        org_plz=org.plz,
        org_ort=org.ort,
        org_telefon=org.telefon,
        org_email=org.email,
        logo_url=org.logo_url,
    )

    pdf_bytes = await generator.unterweisungsnachweis(unterweisung_data)

    filename = f"Unterweisungsnachweis_{unterweisung_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/checkliste-leer/{checkliste_id}")
async def get_checkliste_leer(
    checkliste_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    """
    Generiert eine leere, druckbare Checkliste zum Ausfüllen vor Ort.

    Args:
        checkliste_id: ID der Checklisten-Vorlage

    Returns:
        PDF-Stream
    """
    org = await _get_org_data(org_id, db)

    # Checklisten-Template laden
    result = await db.execute(
        select(ChecklistenTemplate)
        .options(selectinload(ChecklistenTemplate.punkte))
        .where(
            ChecklistenTemplate.id == checkliste_id,
            ChecklistenTemplate.organisation_id == org_id,
        )
    )
    checkliste = result.scalar_one_or_none()
    if not checkliste:
        raise HTTPException(status_code=404, detail="Checkliste nicht gefunden")

    punkte_data = [p.beschreibung for p in checkliste.punkte]

    checkliste_data = {
        "checkliste_id": checkliste_id[:8],
        "name": checkliste.name,
        "beschreibung": checkliste.beschreibung or "",
        "punkte": punkte_data,
    }

    generator = FormularGenerator(
        org_name=org.name,
        org_strasse=org.strasse,
        org_plz=org.plz,
        org_ort=org.ort,
        org_telefon=org.telefon,
        org_email=org.email,
        logo_url=org.logo_url,
    )

    pdf_bytes = await generator.checkliste_leer(checkliste_data)

    filename = f"Checkliste_{checkliste_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/betriebsanweisung/{gefahrstoff_id}")
async def get_betriebsanweisung(
    gefahrstoff_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    """
    Generiert eine Betriebsanweisung für einen Gefahrstoff.

    Args:
        gefahrstoff_id: ID des Gefahrstoffs

    Returns:
        PDF-Stream
    """
    org = await _get_org_data(org_id, db)

    # Gefahrstoff laden
    result = await db.execute(
        select(Gefahrstoff).where(
            Gefahrstoff.id == gefahrstoff_id,
            Gefahrstoff.organisation_id == org_id,
        )
    )
    gefahrstoff = result.scalar_one_or_none()
    if not gefahrstoff:
        raise HTTPException(status_code=404, detail="Gefahrstoff nicht gefunden")

    data = {
        "titel": gefahrstoff.name,
        "gefahrenklasse": gefahrstoff.gefahrenklasse or "---",
        "anwendungsbereich": gefahrstoff.anwendungsbereich or "---",
        "schutzausruestung": [
            gefahrstoff.atemschutz,
            gefahrstoff.handschuhe,
            gefahrstoff.augenschutz,
            gefahrstoff.koerperschutz,
        ] if gefahrstoff.atemschutz else ["---"],
        "lagerung": gefahrstoff.lagerung or "---",
        "verhalten_im_notfall": gefahrstoff.notfallmassnahmen or "---",
        "erste_hilfe": gefahrstoff.erste_hilfe or "---",
    }

    generator = FormularGenerator(
        org_name=org.name,
        org_strasse=org.strasse,
        org_plz=org.plz,
        org_ort=org.ort,
        org_telefon=org.telefon,
        org_email=org.email,
        logo_url=org.logo_url,
    )

    pdf_bytes = await generator.betriebsanweisung(data)

    filename = f"Betriebsanweisung_{gefahrstoff_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/gefaehrdungsbeurteilung/{gbu_id}")
async def get_gefaehrdungsbeurteilung(
    gbu_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    """
    Generiert eine Gefährdungsbeurteilung-PDF.

    Args:
        gbu_id: ID der Gefährdungsbeurteilung

    Returns:
        PDF-Stream
    """
    org = await _get_org_data(org_id, db)

    # GBU laden
    result = await db.execute(
        select(Gefaehrdungsbeurteilung)
        .options(selectinload(Gefaehrdungsbeurteilung.gefahren))
        .where(
            Gefaehrdungsbeurteilung.id == gbu_id,
            Gefaehrdungsbeurteilung.organisation_id == org_id,
        )
    )
    gbu = result.scalar_one_or_none()
    if not gbu:
        raise HTTPException(status_code=404, detail="Gefährdungsbeurteilung nicht gefunden")

    gefahren_data = [
        {
            "beschreibung": g.gefaehrdung,
            "folgen": g.moegliche_folgen or "---",
            "massnahmen": g.schutzmassnahme or "---",
            "prioritaet": g.prioritaet or "mittel",
        }
        for g in gbu.gefahren
    ]

    gbu_data = {
        "gbu_id": gbu_id[:8],
        "titel": gbu.titel or "---",
        "abteilung": gbu.bereich or "---",
        "erstellung_datum": gbu.erstellungsdatum.strftime("%d.%m.%Y") if gbu.erstellungsdatum else datetime.now().strftime("%d.%m.%Y"),
        "verantwortlicher": gbu.verantwortlicher_name or "---",
        "gefahren": gefahren_data,
    }

    generator = FormularGenerator(
        org_name=org.name,
        org_strasse=org.strasse,
        org_plz=org.plz,
        org_ort=org.ort,
        org_telefon=org.telefon,
        org_email=org.email,
        logo_url=org.logo_url,
    )

    pdf_bytes = await generator.gefaehrdungsbeurteilung(gbu_data)

    filename = f"Gefaehrdungsbeurteilung_{gbu_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/maengelbericht/{pruefung_id}")
async def get_maengelbericht(
    pruefung_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    """
    Generiert einen Mängelbericht für eine Prüfung.

    Args:
        pruefung_id: ID der Prüfung

    Returns:
        PDF-Stream
    """
    org = await _get_org_data(org_id, db)
    pruefung = await _get_pruefung(pruefung_id, org_id, db)

    maengel_data = [
        {
            "nr": i + 1,
            "beschreibung": m.beschreibung,
            "schweregrad": m.schweregrad or "mittel",
            "frist": m.abstellfrist.strftime("%d.%m.%Y") if m.abstellfrist else "---",
            "massnahme": m.massnahme or "---",
        }
        for i, m in enumerate(pruefung.maengel)
    ]

    mängelbericht_data = {
        "pruefung_id": pruefung_id[:8],
        "arbeitsmittel_name": pruefung.arbeitsmittel.name if pruefung.arbeitsmittel else "---",
        "pruefer_name": pruefung.pruefer.name if pruefung.pruefer else "---",
        "maengel": maengel_data,
    }

    generator = FormularGenerator(
        org_name=org.name,
        org_strasse=org.strasse,
        org_plz=org.plz,
        org_ort=org.ort,
        org_telefon=org.telefon,
        org_email=org.email,
        logo_url=org.logo_url,
    )

    pdf_bytes = await generator.maengelbericht(mängelbericht_data)

    filename = f"Maengelbericht_{pruefung_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
