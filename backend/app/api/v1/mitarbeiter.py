"""
Mitarbeiter API - Employee management, departments, documents
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from app.core.database import get_db
from app.core.security import decode_token
from app.core.audit import log_audit, compute_changes
from app.models.mitarbeiter import Mitarbeiter, Abteilung, MitarbeiterDokument
from app.models.unterweisungs_zuweisung import UnterweisungsZuweisung
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/mitarbeiter", tags=["Mitarbeiter"])
security = HTTPBearer()


# --- Schemas ---

class AbteilungCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class AbteilungResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    class Config:
        from_attributes = True

class MitarbeiterCreate(BaseModel):
    vorname: str = Field(..., min_length=1, max_length=100)
    nachname: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    telefon: Optional[str] = None
    beruf: Optional[str] = None
    personalnummer: Optional[str] = None
    abteilung_id: Optional[str] = None
    eintrittsdatum: Optional[date] = None
    typ: Optional[str] = 'intern'       # intern | extern
    unternehmen: Optional[str] = None   # for extern employees

class MitarbeiterUpdate(BaseModel):
    vorname: Optional[str] = None
    nachname: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    beruf: Optional[str] = None
    personalnummer: Optional[str] = None
    abteilung_id: Optional[str] = None
    eintrittsdatum: Optional[date] = None
    ist_aktiv: Optional[bool] = None
    typ: Optional[str] = None
    unternehmen: Optional[str] = None

class MitarbeiterDokumentCreate(BaseModel):
    typ: str = Field(..., min_length=1)  # staplerschein, kranschein, ersthelfer, schweisserschein, sonstiges
    name: str = Field(..., min_length=1, max_length=255)
    gueltig_bis: Optional[date] = None
    bemerkung: Optional[str] = None

class MitarbeiterDokumentResponse(BaseModel):
    id: str
    mitarbeiter_id: str
    typ: str
    name: str
    gueltig_bis: Optional[date]
    bemerkung: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class UnterweisungsStatusItem(BaseModel):
    vorlage_id: str
    vorlage_name: str
    status: str  # gruen, rot, gelb, offen
    unterschrieben_am: Optional[datetime] = None
    faellig_am: Optional[date] = None

class MitarbeiterResponse(BaseModel):
    id: str
    vorname: str
    nachname: str
    email: Optional[str]
    telefon: Optional[str]
    beruf: Optional[str]
    personalnummer: Optional[str]
    abteilung_id: Optional[str]
    abteilung_name: Optional[str] = None
    eintrittsdatum: Optional[date]
    ist_aktiv: bool
    typ: str = 'intern'
    unternehmen: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    dokumente: list[MitarbeiterDokumentResponse] = []
    unterweisungs_status: list[UnterweisungsStatusItem] = []
    compliance_prozent: int = 0  # 0-100

    class Config:
        from_attributes = True


async def _get_org_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    return payload.get("org")


async def _get_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    return payload.get("sub")


# ===== ABTEILUNGEN =====

@router.get("/abteilungen", response_model=list[AbteilungResponse])
async def list_abteilungen(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Abteilung)
        .where(Abteilung.organisation_id == org_id)
        .order_by(Abteilung.name)
    )
    return result.scalars().all()


@router.post("/abteilungen", response_model=AbteilungResponse, status_code=201)
async def create_abteilung(
    data: AbteilungCreate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    abt = Abteilung(organisation_id=org_id, name=data.name)
    db.add(abt)
    await db.flush()
    await db.refresh(abt)
    return abt


@router.delete("/abteilungen/{abteilung_id}", status_code=204)
async def delete_abteilung(
    abteilung_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Abteilung).where(Abteilung.id == abteilung_id, Abteilung.organisation_id == org_id)
    )
    abt = result.scalar_one_or_none()
    if not abt:
        raise HTTPException(status_code=404, detail="Abteilung nicht gefunden")
    await db.delete(abt)


# ===== MITARBEITER =====

@router.get("", response_model=list[MitarbeiterResponse])
async def list_mitarbeiter(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
    abteilung_id: Optional[str] = Query(None),
    nur_aktive: bool = Query(False),
):
    """List all employees with their department, documents, and training compliance."""
    query = (
        select(Mitarbeiter)
        .options(
            selectinload(Mitarbeiter.abteilung),
            selectinload(Mitarbeiter.dokumente),
            selectinload(Mitarbeiter.unterweisungs_zuweisungen).selectinload(UnterweisungsZuweisung.vorlage),
        )
        .where(Mitarbeiter.organisation_id == org_id)
    )
    if nur_aktive:
        query = query.where(Mitarbeiter.ist_aktiv == True)
    if abteilung_id:
        query = query.where(Mitarbeiter.abteilung_id == abteilung_id)
    query = query.order_by(Mitarbeiter.nachname, Mitarbeiter.vorname)

    result = await db.execute(query)
    mitarbeiter_list = result.scalars().all()

    responses = []
    for m in mitarbeiter_list:
        # Build training status
        uw_status = []
        total_zuweisungen = 0
        completed = 0
        for z in m.unterweisungs_zuweisungen:
            total_zuweisungen += 1
            if z.status == "unterschrieben":
                status_color = "gruen"
                completed += 1
            elif z.faellig_am and z.faellig_am < date.today():
                status_color = "rot"
            elif z.status == "versendet":
                status_color = "gelb"
            else:
                status_color = "offen"
            uw_status.append(UnterweisungsStatusItem(
                vorlage_id=z.vorlage_id,
                vorlage_name=z.vorlage.name if z.vorlage else "—",
                status=status_color,
                unterschrieben_am=z.unterschrieben_am,
                faellig_am=z.faellig_am,
            ))

        compliance = int((completed / total_zuweisungen * 100) if total_zuweisungen > 0 else 100)

        resp = MitarbeiterResponse(
            id=m.id,
            vorname=m.vorname,
            nachname=m.nachname,
            email=m.email,
            telefon=m.telefon,
            beruf=m.beruf,
            personalnummer=m.personalnummer,
            abteilung_id=m.abteilung_id,
            abteilung_name=m.abteilung.name if m.abteilung else None,
            eintrittsdatum=m.eintrittsdatum,
            ist_aktiv=m.ist_aktiv,
            created_at=m.created_at,
            updated_at=m.updated_at,
            dokumente=[MitarbeiterDokumentResponse.model_validate(d) for d in m.dokumente],
            unterweisungs_status=uw_status,
            compliance_prozent=compliance,
        )
        responses.append(resp)

    return responses


@router.post("", response_model=MitarbeiterResponse, status_code=201)
async def create_mitarbeiter(
    data: MitarbeiterCreate,
    org_id: str = Depends(_get_org_id),
    user_id: str = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    ma = Mitarbeiter(
        organisation_id=org_id,
        vorname=data.vorname,
        nachname=data.nachname,
        email=data.email,
        telefon=data.telefon,
        beruf=data.beruf,
        personalnummer=data.personalnummer,
        abteilung_id=data.abteilung_id,
        eintrittsdatum=data.eintrittsdatum,
        typ=data.typ or 'intern',
        unternehmen=data.unternehmen,
    )
    db.add(ma)
    await db.flush()
    await db.refresh(ma)
    # Reload with relationships
    result = await db.execute(
        select(Mitarbeiter)
        .options(selectinload(Mitarbeiter.abteilung), selectinload(Mitarbeiter.dokumente))
        .where(Mitarbeiter.id == ma.id)
    )
    loaded = result.scalar_one()

    # Log audit
    nachher_snapshot = ma.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    await log_audit(
        db=db,
        organisation_id=org_id,
        user_id=user_id,
        aktion="erstellt",
        entitaet="Mitarbeiter",
        entitaet_id=ma.id,
        entitaet_name=f"{ma.vorname} {ma.nachname}",
        nachher_snapshot=nachher_snapshot,
    )

    return MitarbeiterResponse(
        id=loaded.id, vorname=loaded.vorname, nachname=loaded.nachname,
        email=loaded.email, telefon=loaded.telefon, beruf=loaded.beruf,
        personalnummer=loaded.personalnummer, abteilung_id=loaded.abteilung_id,
        abteilung_name=loaded.abteilung.name if loaded.abteilung else None,
        eintrittsdatum=loaded.eintrittsdatum, ist_aktiv=loaded.ist_aktiv,
        typ=loaded.typ or 'intern', unternehmen=loaded.unternehmen,
        created_at=loaded.created_at, updated_at=loaded.updated_at,
        dokumente=[], unterweisungs_status=[], compliance_prozent=100,
    )


@router.patch("/{mitarbeiter_id}", response_model=MitarbeiterResponse)
@router.put("/{mitarbeiter_id}", response_model=MitarbeiterResponse)
async def update_mitarbeiter(
    mitarbeiter_id: str,
    data: MitarbeiterUpdate,
    org_id: str = Depends(_get_org_id),
    user_id: str = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Mitarbeiter)
        .options(selectinload(Mitarbeiter.abteilung), selectinload(Mitarbeiter.dokumente))
        .where(Mitarbeiter.id == mitarbeiter_id, Mitarbeiter.organisation_id == org_id)
    )
    ma = result.scalar_one_or_none()
    if not ma:
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")

    # Snapshot before update
    vorher_snapshot = ma.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ma, key, value)
    await db.flush()
    await db.refresh(ma)

    # Snapshot after update and compute changes
    nachher_snapshot = ma.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    aenderungen = compute_changes(vorher_snapshot, nachher_snapshot)

    # Log audit only if there were changes
    if aenderungen:
        await log_audit(
            db=db,
            organisation_id=org_id,
            user_id=user_id,
            aktion="geaendert",
            entitaet="Mitarbeiter",
            entitaet_id=ma.id,
            entitaet_name=f"{ma.vorname} {ma.nachname}",
            aenderungen=aenderungen,
            vorher_snapshot=vorher_snapshot,
            nachher_snapshot=nachher_snapshot,
        )

    return MitarbeiterResponse(
        id=ma.id, vorname=ma.vorname, nachname=ma.nachname,
        email=ma.email, telefon=ma.telefon, beruf=ma.beruf,
        personalnummer=ma.personalnummer, abteilung_id=ma.abteilung_id,
        abteilung_name=ma.abteilung.name if ma.abteilung else None,
        eintrittsdatum=ma.eintrittsdatum, ist_aktiv=ma.ist_aktiv,
        created_at=ma.created_at, updated_at=ma.updated_at,
        dokumente=[], unterweisungs_status=[], compliance_prozent=0,
    )


@router.delete("/{mitarbeiter_id}", status_code=204)
async def delete_mitarbeiter(
    mitarbeiter_id: str,
    org_id: str = Depends(_get_org_id),
    user_id: str = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Mitarbeiter).where(Mitarbeiter.id == mitarbeiter_id, Mitarbeiter.organisation_id == org_id)
    )
    ma = result.scalar_one_or_none()
    if not ma:
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")

    # Snapshot before delete
    vorher_snapshot = ma.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)
    mitarbeiter_name = f"{ma.vorname} {ma.nachname}"

    await db.delete(ma)

    # Log audit
    await log_audit(
        db=db,
        organisation_id=org_id,
        user_id=user_id,
        aktion="geloescht",
        entitaet="Mitarbeiter",
        entitaet_id=ma.id,
        entitaet_name=mitarbeiter_name,
        vorher_snapshot=vorher_snapshot,
    )


# ===== DOKUMENTE =====

@router.get("/{mitarbeiter_id}/dokumente", response_model=list[MitarbeiterDokumentResponse])
async def list_dokumente(
    mitarbeiter_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify employee belongs to org
    result = await db.execute(
        select(Mitarbeiter).where(Mitarbeiter.id == mitarbeiter_id, Mitarbeiter.organisation_id == org_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")

    result = await db.execute(
        select(MitarbeiterDokument)
        .where(MitarbeiterDokument.mitarbeiter_id == mitarbeiter_id)
        .order_by(MitarbeiterDokument.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{mitarbeiter_id}/dokumente", response_model=MitarbeiterDokumentResponse, status_code=201)
async def create_dokument(
    mitarbeiter_id: str,
    data: MitarbeiterDokumentCreate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify employee belongs to org
    result = await db.execute(
        select(Mitarbeiter).where(Mitarbeiter.id == mitarbeiter_id, Mitarbeiter.organisation_id == org_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")

    # Auto-set status based on gueltig_bis
    status = "gueltig"
    if data.gueltig_bis and data.gueltig_bis < date.today():
        status = "abgelaufen"

    dok = MitarbeiterDokument(
        mitarbeiter_id=mitarbeiter_id,
        typ=data.typ,
        name=data.name,
        gueltig_bis=data.gueltig_bis,
        bemerkung=data.bemerkung,
        status=status,
    )
    db.add(dok)
    await db.flush()
    await db.refresh(dok)
    return dok


@router.delete("/{mitarbeiter_id}/dokumente/{dokument_id}", status_code=204)
async def delete_dokument(
    mitarbeiter_id: str,
    dokument_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify employee belongs to org
    result = await db.execute(
        select(Mitarbeiter).where(Mitarbeiter.id == mitarbeiter_id, Mitarbeiter.organisation_id == org_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")

    result = await db.execute(
        select(MitarbeiterDokument).where(
            MitarbeiterDokument.id == dokument_id,
            MitarbeiterDokument.mitarbeiter_id == mitarbeiter_id,
        )
    )
    dok = result.scalar_one_or_none()
    if not dok:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    await db.delete(dok)
