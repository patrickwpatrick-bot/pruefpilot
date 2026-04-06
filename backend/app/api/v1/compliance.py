"""
Compliance API — BG-Ready-Score Berechnung
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user_id, get_current_org_id
from app.models.arbeitsmittel import Arbeitsmittel
from app.models.mangel import Mangel
from app.models.pruefung import Pruefung
from datetime import datetime, timezone

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get("/score")
async def get_compliance_score(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Calculate BG-Ready-Score for the organisation."""

    # 1. Get all Arbeitsmittel
    result = await db.execute(
        select(Arbeitsmittel).where(Arbeitsmittel.organisation_id == org_id)
    )
    arbeitsmittel = result.scalars().all()

    if not arbeitsmittel:
        return {
            "score": 0,
            "ampel": "unbekannt",
            "details": {
                "pruefungen_aktuell_prozent": 0,
                "maengel_offen": 0,
                "maengel_rot": 0,
                "maengel_orange": 0,
                "arbeitsmittel_gesamt": 0,
                "arbeitsmittel_gruen": 0,
                "arbeitsmittel_gelb": 0,
                "arbeitsmittel_rot": 0,
            },
            "top_massnahmen": [
                {
                    "typ": "erstellen",
                    "text": "Erstes Arbeitsmittel anlegen",
                    "impact": 30,
                    "link": "/arbeitsmittel",
                }
            ],
        }

    total = len(arbeitsmittel)
    gruen = sum(1 for a in arbeitsmittel if a.ampel_status == "gruen")
    gelb = sum(1 for a in arbeitsmittel if a.ampel_status == "gelb")
    rot = sum(1 for a in arbeitsmittel if a.ampel_status == "rot")

    # 2. Prüfungen-Aktualität (0-60 Punkte)
    pruef_score = (gruen / total) * 60 if total > 0 else 0

    # 3. Offene Mängel (0-30 Punkte Abzug) — join through Pruefung → Arbeitsmittel
    result = await db.execute(
        select(Mangel)
        .join(Pruefung, Mangel.pruefung_id == Pruefung.id)
        .join(Arbeitsmittel, Pruefung.arbeitsmittel_id == Arbeitsmittel.id)
        .where(
            Arbeitsmittel.organisation_id == org_id,
            Mangel.status != "erledigt",
        )
    )
    offene_maengel = result.scalars().all()
    maengel_rot = sum(1 for m in offene_maengel if m.schweregrad == "rot")
    maengel_orange = sum(1 for m in offene_maengel if m.schweregrad == "orange")
    maengel_gruen_count = sum(1 for m in offene_maengel if m.schweregrad == "gruen")

    mangel_abzug = (maengel_rot * 10) + (maengel_orange * 5) + (maengel_gruen_count * 2)
    mangel_abzug = min(mangel_abzug, 30)  # max 30 Punkte Abzug
    mangel_score = 30 - mangel_abzug

    # 4. Basis-Score (10 Punkte wenn Arbeitsmittel vorhanden)
    basis_score = 10

    # Gesamtscore
    score = max(0, min(100, round(pruef_score + mangel_score + basis_score)))

    # Ampelfarbe
    if score >= 80:
        ampel = "gruen"
    elif score >= 50:
        ampel = "gelb"
    else:
        ampel = "rot"

    # Top-3 Maßnahmen berechnen
    massnahmen = []

    if rot > 0:
        massnahmen.append({
            "typ": "pruefung",
            "text": f"{rot} überfällige Prüfung{'en' if rot > 1 else ''} durchführen",
            "impact": min(rot * 10, 30),
            "link": "/arbeitsmittel",
        })

    if maengel_rot > 0:
        massnahmen.append({
            "typ": "mangel",
            "text": f"{maengel_rot} kritische{'n' if maengel_rot == 1 else ''} Mängel beheben",
            "impact": min(maengel_rot * 10, 20),
            "link": "/maengel",
        })

    if gelb > 0:
        massnahmen.append({
            "typ": "pruefung",
            "text": f"{gelb} bald fällige Prüfung{'en' if gelb > 1 else ''} vorziehen",
            "impact": min(gelb * 5, 15),
            "link": "/arbeitsmittel",
        })

    if maengel_orange > 0:
        massnahmen.append({
            "typ": "mangel",
            "text": f"{maengel_orange} Mängel (mittel) bearbeiten",
            "impact": min(maengel_orange * 5, 15),
            "link": "/maengel",
        })

    # Sort by impact, take top 3
    massnahmen.sort(key=lambda x: x["impact"], reverse=True)
    massnahmen = massnahmen[:3]

    # If no issues, add positive message
    if not massnahmen:
        massnahmen.append({
            "typ": "info",
            "text": "Alle Prüfungen aktuell — weiter so!",
            "impact": 0,
            "link": "/dashboard",
        })

    return {
        "score": score,
        "ampel": ampel,
        "details": {
            "pruefungen_aktuell_prozent": round((gruen / total) * 100) if total > 0 else 0,
            "maengel_offen": len(offene_maengel),
            "maengel_rot": maengel_rot,
            "maengel_orange": maengel_orange,
            "arbeitsmittel_gesamt": total,
            "arbeitsmittel_gruen": gruen,
            "arbeitsmittel_gelb": gelb,
            "arbeitsmittel_rot": rot,
        },
        "top_massnahmen": massnahmen,
    }
