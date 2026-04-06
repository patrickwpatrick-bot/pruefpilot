"""
Gefahrstoffe API - Hazardous substances inventory
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.core.audit import log_audit, compute_changes
from app.models.gefahrstoff import Gefahrstoff

router = APIRouter(prefix="/gefahrstoffe", tags=["Gefahrstoffe"])
# --- Schemas ---

class GefahrstoffCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    hersteller: Optional[str] = None
    cas_nummer: Optional[str] = None
    gefahrenklasse: Optional[str] = None
    h_saetze: Optional[str] = None
    p_saetze: Optional[str] = None
    signalwort: Optional[str] = None
    lagerort: Optional[str] = None
    menge: Optional[str] = None
    foto_url: Optional[str] = None
    sicherheitsdatenblatt_url: Optional[str] = None

class GefahrstoffUpdate(BaseModel):
    name: Optional[str] = None
    hersteller: Optional[str] = None
    cas_nummer: Optional[str] = None
    gefahrenklasse: Optional[str] = None
    h_saetze: Optional[str] = None
    p_saetze: Optional[str] = None
    signalwort: Optional[str] = None
    lagerort: Optional[str] = None
    menge: Optional[str] = None
    foto_url: Optional[str] = None
    sicherheitsdatenblatt_url: Optional[str] = None

class GefahrstoffResponse(BaseModel):
    id: str
    name: str
    hersteller: Optional[str]
    cas_nummer: Optional[str]
    gefahrenklasse: Optional[str]
    h_saetze: Optional[str]
    p_saetze: Optional[str]
    signalwort: Optional[str]
    lagerort: Optional[str]
    menge: Optional[str]
    foto_url: Optional[str]
    sicherheitsdatenblatt_url: Optional[str]
    betriebsanweisung_text: Optional[str]
    letzte_aktualisierung: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True

def _generate_betriebsanweisung(stoff: Gefahrstoff) -> str:
    """
    Auto-generate German Betriebsanweisung (operational instruction) text
    from substance data following DGUV Regel 213-850 structure.
    """
    lines = [
        "BETRIEBSANWEISUNG",
        "================",
        "",
        f"Stoff/Gemisch: {stoff.name}",
    ]

    if stoff.hersteller:
        lines.append(f"Hersteller: {stoff.hersteller}")

    if stoff.cas_nummer:
        lines.append(f"CAS-Nummer: {stoff.cas_nummer}")

    lines.extend([
        "",
        "1. GEFAHREN FÜR MENSCH UND UMWELT",
        "-" * 40,
    ])

    if stoff.signalwort:
        lines.append(f"Signalwort: {stoff.signalwort}")

    if stoff.gefahrenklasse:
        lines.append(f"Gefahrenklasse: {stoff.gefahrenklasse}")

    if stoff.h_saetze:
        lines.append(f"H-Sätze: {stoff.h_saetze}")

    lines.extend([
        "",
        "2. SCHUTZMASSNAHMEN UND VERHALTENSREGELN",
        "-" * 40,
        "• Persönliche Schutzausrüstung: Schutzhandschuhe, Schutzbrille erforderlich",
        "• Lagerung nur an zugelassenen Lagerorten durchführen",
        "• Gute Belüftung erforderlich",
        "• Von Hitze und Zündquellen fernhalten",
    ])

    if stoff.p_saetze:
        lines.append(f"• P-Sätze beachten: {stoff.p_saetze}")

    lines.extend([
        "",
        "3. UNFALLMASSNAHMEN",
        "-" * 40,
        "• Bei Kontakt mit Haut: Sofort mit Wasser abwaschen",
        "• Bei Augenkontakt: Augenlider offenhalten, gründlich mit Wasser spülen",
        "• Bei Einatmung: Frische Luft zuführen",
        "• Giftige Dämpfe vermeiden",
        "• Im Notfall: Ärztliche Hilfe anfordern",
        "",
        "4. LAGERUNG UND ENTSORGUNG",
        "-" * 40,
    ])

    if stoff.lagerort:
        lines.append(f"• Lagerort: {stoff.lagerort}")

    if stoff.menge:
        lines.append(f"• Lagermenge: {stoff.menge}")

    lines.extend([
        "• Entsorgung nur nach behördlichen Vorgaben",
        "• Sicherheitsdatenblatt beachten",
        "",
        "5. NOTFALLMASSNAHMEN",
        "-" * 40,
        "• Verschüttete Mengen aufkehren und sachgerecht entsorgen",
        "• Betroffene Person an die frische Luft bringen",
        "• Im Notfall sofort Notfall-Telefon 112 anrufen",
        "• Sicherheitsdatenblatt verfügbar halten",
    ])

    return "\n".join(lines)

@router.get("", response_model=list[GefahrstoffResponse])
async def list_gefahrstoffe(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all substances for org."""
    result = await db.execute(
        select(Gefahrstoff)
        .where(Gefahrstoff.organisation_id == org_id)
        .order_by(Gefahrstoff.name)
    )
    items = result.scalars().all()
    return [
        GefahrstoffResponse(
            id=str(item.id),
            name=item.name,
            hersteller=item.hersteller,
            cas_nummer=item.cas_nummer,
            gefahrenklasse=item.gefahrenklasse,
            h_saetze=item.h_saetze,
            p_saetze=item.p_saetze,
            signalwort=item.signalwort,
            lagerort=item.lagerort,
            menge=item.menge,
            foto_url=item.foto_url,
            sicherheitsdatenblatt_url=item.sicherheitsdatenblatt_url,
            betriebsanweisung_text=item.betriebsanweisung_text,
            letzte_aktualisierung=item.letzte_aktualisierung,
            created_at=item.created_at,
        )
        for item in items
    ]

@router.post("", response_model=GefahrstoffResponse, status_code=201)
async def create_gefahrstoff(
    data: GefahrstoffCreate,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new substance."""
    gefahrstoff = Gefahrstoff(
        organisation_id=org_id,
        **data.model_dump(),
    )
    db.add(gefahrstoff)
    await db.flush()
    await db.refresh(gefahrstoff)

    # Log audit
    nachher_snapshot = gefahrstoff.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    await log_audit(
        db=db,
        organisation_id=org_id,
        user_id=user_id,
        aktion="erstellt",
        entitaet="Gefahrstoff",
        entitaet_id=gefahrstoff.id,
        entitaet_name=gefahrstoff.name,
        nachher_snapshot=nachher_snapshot,
    )

    return GefahrstoffResponse(
        id=str(gefahrstoff.id),
        name=gefahrstoff.name,
        hersteller=gefahrstoff.hersteller,
        cas_nummer=gefahrstoff.cas_nummer,
        gefahrenklasse=gefahrstoff.gefahrenklasse,
        h_saetze=gefahrstoff.h_saetze,
        p_saetze=gefahrstoff.p_saetze,
        signalwort=gefahrstoff.signalwort,
        lagerort=gefahrstoff.lagerort,
        menge=gefahrstoff.menge,
        foto_url=gefahrstoff.foto_url,
        sicherheitsdatenblatt_url=gefahrstoff.sicherheitsdatenblatt_url,
        betriebsanweisung_text=gefahrstoff.betriebsanweisung_text,
        letzte_aktualisierung=gefahrstoff.letzte_aktualisierung,
        created_at=gefahrstoff.created_at,
    )

@router.put("/{stoff_id}", response_model=GefahrstoffResponse)
async def update_gefahrstoff(
    stoff_id: str,
    data: GefahrstoffUpdate,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a substance."""
    result = await db.execute(
        select(Gefahrstoff).where(
            Gefahrstoff.id == stoff_id,
            Gefahrstoff.organisation_id == org_id,
        )
    )
    gefahrstoff = result.scalar_one_or_none()
    if not gefahrstoff:
        raise HTTPException(status_code=404, detail="Gefahrstoff nicht gefunden")

    # Snapshot before update
    vorher_snapshot = gefahrstoff.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gefahrstoff, field, value)

    gefahrstoff.letzte_aktualisierung = date.today()
    await db.flush()
    await db.refresh(gefahrstoff)

    # Snapshot after update and compute changes
    nachher_snapshot = gefahrstoff.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    aenderungen = compute_changes(vorher_snapshot, nachher_snapshot)

    # Log audit only if there were changes
    if aenderungen:
        await log_audit(
            db=db,
            organisation_id=org_id,
            user_id=user_id,
            aktion="geaendert",
            entitaet="Gefahrstoff",
            entitaet_id=gefahrstoff.id,
            entitaet_name=gefahrstoff.name,
            aenderungen=aenderungen,
            vorher_snapshot=vorher_snapshot,
            nachher_snapshot=nachher_snapshot,
        )

    return GefahrstoffResponse(
        id=str(gefahrstoff.id),
        name=gefahrstoff.name,
        hersteller=gefahrstoff.hersteller,
        cas_nummer=gefahrstoff.cas_nummer,
        gefahrenklasse=gefahrstoff.gefahrenklasse,
        h_saetze=gefahrstoff.h_saetze,
        p_saetze=gefahrstoff.p_saetze,
        signalwort=gefahrstoff.signalwort,
        lagerort=gefahrstoff.lagerort,
        menge=gefahrstoff.menge,
        foto_url=gefahrstoff.foto_url,
        sicherheitsdatenblatt_url=gefahrstoff.sicherheitsdatenblatt_url,
        betriebsanweisung_text=gefahrstoff.betriebsanweisung_text,
        letzte_aktualisierung=gefahrstoff.letzte_aktualisierung,
        created_at=gefahrstoff.created_at,
    )

@router.delete("/{stoff_id}", status_code=204)
async def delete_gefahrstoff(
    stoff_id: str,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a substance."""
    result = await db.execute(
        select(Gefahrstoff).where(
            Gefahrstoff.id == stoff_id,
            Gefahrstoff.organisation_id == org_id,
        )
    )
    gefahrstoff = result.scalar_one_or_none()
    if not gefahrstoff:
        raise HTTPException(status_code=404, detail="Gefahrstoff nicht gefunden")

    # Snapshot before delete
    vorher_snapshot = gefahrstoff.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)

    await db.delete(gefahrstoff)

    # Log audit
    await log_audit(
        db=db,
        organisation_id=org_id,
        user_id=user_id,
        aktion="geloescht",
        entitaet="Gefahrstoff",
        entitaet_id=gefahrstoff.id,
        entitaet_name=gefahrstoff.name,
        vorher_snapshot=vorher_snapshot,
    )

@router.post("/{stoff_id}/betriebsanweisung", response_model=GefahrstoffResponse)
async def generate_betriebsanweisung(
    stoff_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generate Betriebsanweisung text from substance data."""
    result = await db.execute(
        select(Gefahrstoff).where(
            Gefahrstoff.id == stoff_id,
            Gefahrstoff.organisation_id == org_id,
        )
    )
    gefahrstoff = result.scalar_one_or_none()
    if not gefahrstoff:
        raise HTTPException(status_code=404, detail="Gefahrstoff nicht gefunden")

    # Generate and store betriebsanweisung text
    gefahrstoff.betriebsanweisung_text = _generate_betriebsanweisung(gefahrstoff)
    gefahrstoff.letzte_aktualisierung = date.today()
    await db.flush()
    await db.refresh(gefahrstoff)
    return GefahrstoffResponse(
        id=str(gefahrstoff.id),
        name=gefahrstoff.name,
        hersteller=gefahrstoff.hersteller,
        cas_nummer=gefahrstoff.cas_nummer,
        gefahrenklasse=gefahrstoff.gefahrenklasse,
        h_saetze=gefahrstoff.h_saetze,
        p_saetze=gefahrstoff.p_saetze,
        signalwort=gefahrstoff.signalwort,
        lagerort=gefahrstoff.lagerort,
        menge=gefahrstoff.menge,
        foto_url=gefahrstoff.foto_url,
        sicherheitsdatenblatt_url=gefahrstoff.sicherheitsdatenblatt_url,
        betriebsanweisung_text=gefahrstoff.betriebsanweisung_text,
        letzte_aktualisierung=gefahrstoff.letzte_aktualisierung,
        created_at=gefahrstoff.created_at,
    )
