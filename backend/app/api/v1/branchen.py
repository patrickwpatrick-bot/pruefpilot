"""
Branchen API — Industry-specific suggestions for onboarding
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id

router = APIRouter(prefix="/branchen", tags=["Branchen"])

# Branchenspezifische Vorschläge
BRANCHEN_VORSCHLAEGE = {
    "maschinenbau": {
        "arbeitsmittel": [
            {"name": "CNC-Fräsmaschine", "typ": "CNC-Maschine", "pruef_intervall_monate": 12},
            {"name": "Drehmaschine", "typ": "Drehmaschine", "pruef_intervall_monate": 12},
            {"name": "Schweißgerät MIG/MAG", "typ": "Schweißgerät", "pruef_intervall_monate": 12},
            {"name": "Brückenkran 5t", "typ": "Kran", "pruef_intervall_monate": 12},
            {"name": "Gabelstapler", "typ": "Gabelstapler", "pruef_intervall_monate": 12},
            {"name": "Schleifbock", "typ": "Schleifmaschine", "pruef_intervall_monate": 12},
            {"name": "Anlegeleiter Alu", "typ": "Leiter", "pruef_intervall_monate": 12},
            {"name": "Schwerlast-Palettenregal", "typ": "Regal", "pruef_intervall_monate": 12},
        ],
        "checklisten": ["Leiterprüfung", "Regalprüfung", "Elektrogeräteprüfung", "CNC-Maschinen Prüfung"],
    },
    "baugewerbe": {
        "arbeitsmittel": [
            {"name": "Minibagger 1.5t", "typ": "Bagger", "pruef_intervall_monate": 12},
            {"name": "Gerüst Fassade", "typ": "Gerüst", "pruef_intervall_monate": 6},
            {"name": "Winkelschleifer Makita", "typ": "Flex/Winkelschleifer", "pruef_intervall_monate": 6},
            {"name": "Bohrhammer Hilti", "typ": "Bohrhammer", "pruef_intervall_monate": 12},
            {"name": "Anlegeleiter", "typ": "Leiter", "pruef_intervall_monate": 12},
            {"name": "Hubarbeitsbühne", "typ": "Hubarbeitsbühne", "pruef_intervall_monate": 12},
        ],
        "checklisten": ["Gerüstprüfung", "Leiterprüfung", "Baustellensicherheit", "Brandschutzprüfung"],
    },
    "logistik": {
        "arbeitsmittel": [
            {"name": "Gabelstapler Toyota", "typ": "Gabelstapler", "pruef_intervall_monate": 12},
            {"name": "Elektro-Hubwagen", "typ": "Hubwagen", "pruef_intervall_monate": 12},
            {"name": "Palettenregal Halle 1", "typ": "Regal", "pruef_intervall_monate": 12},
            {"name": "Kragarmregal Außenlager", "typ": "Regal", "pruef_intervall_monate": 12},
            {"name": "Anlegeleiter Stahl", "typ": "Leiter", "pruef_intervall_monate": 12},
            {"name": "Ladungssicherung Set", "typ": "Ladungssicherung", "pruef_intervall_monate": 12},
        ],
        "checklisten": ["Gabelstapler-Tagesprüfung", "Regalprüfung", "Leiterprüfung", "Brandschutzprüfung"],
    },
    "gastronomie": {
        "arbeitsmittel": [
            {"name": "Aufschnittmaschine", "typ": "Küchengerät", "pruef_intervall_monate": 12},
            {"name": "Fritteuse", "typ": "Küchengerät", "pruef_intervall_monate": 12},
            {"name": "Geschirrspülmaschine", "typ": "Küchengerät", "pruef_intervall_monate": 12},
            {"name": "Kühlhaus", "typ": "Kälteanlage", "pruef_intervall_monate": 12},
            {"name": "Feuerlöscher Küche", "typ": "Brandschutz", "pruef_intervall_monate": 24},
            {"name": "Trittleiter Küche", "typ": "Leiter", "pruef_intervall_monate": 12},
        ],
        "checklisten": ["Küchengeräte-Prüfung", "Brandschutzprüfung", "Elektrogeräteprüfung"],
    },
    "gesundheitswesen": {
        "arbeitsmittel": [
            {"name": "Patientenbett elektrisch", "typ": "Medizingerät", "pruef_intervall_monate": 12},
            {"name": "Defibrillator AED", "typ": "Medizingerät", "pruef_intervall_monate": 12},
            {"name": "Blutdruckmessgerät", "typ": "Medizingerät", "pruef_intervall_monate": 24},
            {"name": "Sterilisator", "typ": "Medizingerät", "pruef_intervall_monate": 12},
            {"name": "Feuerlöscher Station", "typ": "Brandschutz", "pruef_intervall_monate": 24},
        ],
        "checklisten": ["Medizingeräte-Prüfung", "Brandschutzprüfung", "Elektrogeräteprüfung"],
    },
}


@router.get("/{branche}/vorschlaege")
async def get_branchen_vorschlaege(
    branche: str,
    _user_id: str = Depends(get_current_user_id),
):
    """Get industry-specific suggestions for equipment and checklists."""
    vorschlaege = BRANCHEN_VORSCHLAEGE.get(branche, {
        "arbeitsmittel": [],
        "checklisten": [],
    })
    return vorschlaege
