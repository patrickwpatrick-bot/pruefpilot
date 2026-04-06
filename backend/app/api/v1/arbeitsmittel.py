"""
Arbeitsmittel API - CRUD for equipment/assets + CSV import + QR codes
All queries automatically filter by organisation_id (multi-tenant isolation)
"""
import csv
import io
import qrcode
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user_id, get_current_org_id
from app.core.audit import log_audit, compute_changes
from app.models.arbeitsmittel import Arbeitsmittel
from app.models.user import User
from app.schemas.arbeitsmittel import (
    ArbeitsmittelCreate,
    ArbeitsmittelUpdate,
    ArbeitsmittelResponse,
    ArbeitsmittelListResponse,
)
from app.core.config import settings

router = APIRouter(prefix="/arbeitsmittel", tags=["Arbeitsmittel"])


@router.get("", response_model=ArbeitsmittelListResponse, summary="List equipment", description="Retrieve all equipment (Arbeitsmittel) for the current organisation with filtering and pagination.")
async def list_arbeitsmittel(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=200, description="Number of items to return (max 200)"),
    typ: str | None = Query(None, description="Filter by type (regal, leiter, maschine, elektro, brandschutz)"),
    standort_id: str | None = Query(None, description="Filter by location ID"),
    suche: str | None = Query(None, description="Search by name"),
):
    """List all equipment for the current organisation."""
    query = select(Arbeitsmittel).where(
        Arbeitsmittel.organisation_id == org_id,
        Arbeitsmittel.deleted_at == None  # Exclude soft-deleted items
    )

    if typ:
        query = query.where(Arbeitsmittel.typ == typ)
    if standort_id:
        query = query.where(Arbeitsmittel.standort_id == standort_id)
    if suche:
        query = query.where(Arbeitsmittel.name.ilike(f"%{suche}%"))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.offset(skip).limit(limit).order_by(Arbeitsmittel.name)
    result = await db.execute(query)
    items = result.scalars().all()

    response_items = [
        ArbeitsmittelResponse(
            id=str(item.id),
            name=item.name,
            typ=item.typ,
            standort_id=str(item.standort_id) if item.standort_id else None,
            hersteller=item.hersteller,
            modell=item.modell,
            seriennummer=item.seriennummer,
            baujahr=item.baujahr,
            foto_url=item.foto_url,
            beschreibung=item.beschreibung,
            norm=item.norm,
            pruef_intervall_monate=item.pruef_intervall_monate,
            letzte_pruefung_am=item.letzte_pruefung_am,
            naechste_pruefung_am=item.naechste_pruefung_am,
            ampel_status=item.ampel_status,
            qr_code_url=item.qr_code_url,
            created_at=item.created_at,
        )
        for item in items
    ]

    return ArbeitsmittelListResponse(items=response_items, total=total)


@router.post("", response_model=ArbeitsmittelResponse, status_code=status.HTTP_201_CREATED, summary="Create equipment", description="Create a new piece of equipment (Arbeitsmittel) with inspection schedule and metadata.")
async def create_arbeitsmittel(
    data: ArbeitsmittelCreate,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new piece of equipment."""
    # Plan-Limit prüfen
    from app.core.plan_limits import check_arbeitsmittel_limit
    await check_arbeitsmittel_limit(db, org_id)

    arbeitsmittel = Arbeitsmittel(
        organisation_id=org_id,
        **data.model_dump(),
    )
    db.add(arbeitsmittel)
    await db.flush()
    await db.refresh(arbeitsmittel)
    await db.commit()

    # Log audit
    nachher_snapshot = arbeitsmittel.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    await log_audit(
        db=db,
        organisation_id=org_id,
        user_id=user_id,
        aktion="erstellt",
        entitaet="Arbeitsmittel",
        entitaet_id=arbeitsmittel.id,
        entitaet_name=arbeitsmittel.name,
        nachher_snapshot=nachher_snapshot,
    )

    return ArbeitsmittelResponse(
        id=str(arbeitsmittel.id),
        name=arbeitsmittel.name,
        typ=arbeitsmittel.typ,
        standort_id=str(arbeitsmittel.standort_id) if arbeitsmittel.standort_id else None,
        hersteller=arbeitsmittel.hersteller,
        modell=arbeitsmittel.modell,
        seriennummer=arbeitsmittel.seriennummer,
        baujahr=arbeitsmittel.baujahr,
        foto_url=arbeitsmittel.foto_url,
        beschreibung=arbeitsmittel.beschreibung,
        norm=arbeitsmittel.norm,
        pruef_intervall_monate=arbeitsmittel.pruef_intervall_monate,
        letzte_pruefung_am=arbeitsmittel.letzte_pruefung_am,
        naechste_pruefung_am=arbeitsmittel.naechste_pruefung_am,
        ampel_status=arbeitsmittel.ampel_status,
        qr_code_url=arbeitsmittel.qr_code_url,
        created_at=arbeitsmittel.created_at,
    )


@router.get("/{arbeitsmittel_id}", response_model=ArbeitsmittelResponse, summary="Get equipment", description="Retrieve a single piece of equipment by ID.")
async def get_arbeitsmittel(
    arbeitsmittel_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single piece of equipment."""
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id == arbeitsmittel_id,
            Arbeitsmittel.organisation_id == org_id,
            Arbeitsmittel.deleted_at == None,  # Exclude soft-deleted items
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Arbeitsmittel nicht gefunden")
    return ArbeitsmittelResponse(
        id=str(item.id),
        name=item.name,
        typ=item.typ,
        standort_id=str(item.standort_id) if item.standort_id else None,
        hersteller=item.hersteller,
        modell=item.modell,
        seriennummer=item.seriennummer,
        baujahr=item.baujahr,
        foto_url=item.foto_url,
        beschreibung=item.beschreibung,
        norm=item.norm,
        pruef_intervall_monate=item.pruef_intervall_monate,
        letzte_pruefung_am=item.letzte_pruefung_am,
        naechste_pruefung_am=item.naechste_pruefung_am,
        ampel_status=item.ampel_status,
        qr_code_url=item.qr_code_url,
        created_at=item.created_at,
    )


@router.put("/{arbeitsmittel_id}", response_model=ArbeitsmittelResponse, summary="Update equipment", description="Update equipment details. Changes are tracked in the audit log.")
async def update_arbeitsmittel(
    arbeitsmittel_id: str,
    data: ArbeitsmittelUpdate,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a piece of equipment."""
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id == arbeitsmittel_id,
            Arbeitsmittel.organisation_id == org_id,
            Arbeitsmittel.deleted_at == None,  # Exclude soft-deleted items
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Arbeitsmittel nicht gefunden")

    # Snapshot before update
    vorher_snapshot = item.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)

    # Snapshot after update and compute changes
    nachher_snapshot = item.__dict__.copy()
    nachher_snapshot.pop("_sa_instance_state", None)
    aenderungen = compute_changes(vorher_snapshot, nachher_snapshot)

    # Log audit only if there were changes
    if aenderungen:
        await log_audit(
            db=db,
            organisation_id=org_id,
            user_id=user_id,
            aktion="geaendert",
            entitaet="Arbeitsmittel",
            entitaet_id=item.id,
            entitaet_name=item.name,
            aenderungen=aenderungen,
            vorher_snapshot=vorher_snapshot,
            nachher_snapshot=nachher_snapshot,
        )

    return ArbeitsmittelResponse(
        id=str(item.id),
        name=item.name,
        typ=item.typ,
        standort_id=str(item.standort_id) if item.standort_id else None,
        hersteller=item.hersteller,
        modell=item.modell,
        seriennummer=item.seriennummer,
        baujahr=item.baujahr,
        foto_url=item.foto_url,
        beschreibung=item.beschreibung,
        norm=item.norm,
        pruef_intervall_monate=item.pruef_intervall_monate,
        letzte_pruefung_am=item.letzte_pruefung_am,
        naechste_pruefung_am=item.naechste_pruefung_am,
        ampel_status=item.ampel_status,
        qr_code_url=item.qr_code_url,
        created_at=item.created_at,
    )


@router.delete("/{arbeitsmittel_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete equipment", description="Soft-delete a piece of equipment (marked as deleted, not permanently removed). This action is recorded in the audit log.")
async def delete_arbeitsmittel(
    arbeitsmittel_id: str,
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a piece of equipment (soft-delete for audit trail)."""
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id == arbeitsmittel_id,
            Arbeitsmittel.organisation_id == org_id,
            Arbeitsmittel.deleted_at == None,  # Exclude already soft-deleted items
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Arbeitsmittel nicht gefunden")

    # Snapshot before delete
    vorher_snapshot = item.__dict__.copy()
    vorher_snapshot.pop("_sa_instance_state", None)

    # Soft-delete by setting deleted_at timestamp
    item.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    # Log audit
    await log_audit(
        db=db,
        organisation_id=org_id,
        user_id=user_id,
        aktion="geloescht",
        entitaet="Arbeitsmittel",
        entitaet_id=item.id,
        entitaet_name=item.name,
        vorher_snapshot=vorher_snapshot,
    )


# ── BLOCK 4: CSV Import ──────────────────────────────────────────────────────

@router.post("/import", summary="Import equipment from CSV", description="Import equipment items from a CSV file. Supports flexible column names, BOM detection, and semicolon-delimited files (German Excel exports).")
async def import_arbeitsmittel_csv(
    file: UploadFile = File(..., description="CSV file with equipment data"),
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Import equipment from a CSV file. Handles BOM, semicolons, messy Excel exports."""
    if not file.filename or not file.filename.lower().endswith(('.csv', '.txt')):
        raise HTTPException(status_code=400, detail="Nur CSV-Dateien erlaubt")

    content = await file.read()

    # Try different encodings
    text = None
    for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise HTTPException(status_code=400, detail="Datei-Encoding nicht erkannt")

    # Strip any leading BOM (handles double-BOM from clients that prepend \ufeff
    # before encoding with utf-8-sig, e.g. some Excel exports and tests)
    text = text.lstrip('\ufeff')

    # Detect delimiter (semicolon is common in German Excel exports)
    first_line = text.split('\n')[0] if text else ''
    delimiter = ';' if first_line.count(';') > first_line.count(',') else ','

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    # Column mapping (flexible names)
    FIELD_MAP = {
        'name': ['name', 'bezeichnung', 'arbeitsmittel', 'equipment'],
        'typ': ['typ', 'type', 'art', 'kategorie', 'geräteart'],
        'hersteller': ['hersteller', 'manufacturer', 'marke'],
        'modell': ['modell', 'model', 'modellbezeichnung'],
        'seriennummer': ['seriennummer', 'serial', 'sn', 'serial_number', 'inventarnummer'],
        'baujahr': ['baujahr', 'year', 'bj'],
        'standort': ['standort', 'location', 'ort', 'gebäude'],
        'norm': ['norm', 'prüfnorm', 'standard'],
        'pruef_intervall_monate': ['intervall', 'pruef_intervall', 'prüfintervall', 'interval_monate'],
    }

    def find_field(row: dict, field_names: list) -> str | None:
        for fn in field_names:
            for key in row:
                if key.strip().lower().replace('ü', 'ue').replace('ä', 'ae').replace('ö', 'oe') == fn.lower():
                    val = row[key].strip() if row[key] else None
                    return val if val else None
                if key.strip().lower() == fn.lower():
                    val = row[key].strip() if row[key] else None
                    return val if val else None
        return None

    imported = 0
    errors = []
    vorschau = []

    for i, row in enumerate(reader):
        # Skip empty rows
        if not any(v.strip() for v in row.values() if v):
            continue

        name = find_field(row, FIELD_MAP['name'])
        if not name:
            errors.append({"zeile": i + 2, "fehler": "Name fehlt", "daten": dict(row)})
            continue

        typ = find_field(row, FIELD_MAP['typ']) or 'Sonstiges'
        hersteller = find_field(row, FIELD_MAP['hersteller'])
        modell = find_field(row, FIELD_MAP['modell'])
        seriennummer = find_field(row, FIELD_MAP['seriennummer'])
        norm = find_field(row, FIELD_MAP['norm'])

        baujahr_str = find_field(row, FIELD_MAP['baujahr'])
        baujahr = None
        if baujahr_str:
            try:
                baujahr = int(baujahr_str)
            except ValueError:
                pass

        intervall_str = find_field(row, FIELD_MAP['pruef_intervall_monate'])
        intervall = 12  # default
        if intervall_str:
            try:
                intervall = int(intervall_str)
            except ValueError:
                pass

        try:
            am = Arbeitsmittel(
                organisation_id=org_id,
                name=name,
                typ=typ,
                hersteller=hersteller,
                modell=modell,
                seriennummer=seriennummer,
                baujahr=baujahr,
                norm=norm,
                pruef_intervall_monate=intervall,
            )
            db.add(am)
            await db.flush()
            imported += 1
        except Exception as e:
            errors.append({"zeile": i + 2, "fehler": str(e), "daten": dict(row)})

    return {
        "importiert": imported,
        "fehler": len(errors),
        "fehler_details": errors[:20],  # max 20 error details
    }


# ── BLOCK 5: QR Code ─────────────────────────────────────────────────────────

@router.get("/{arbeitsmittel_id}/qr")
async def get_qr_code(
    arbeitsmittel_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate a QR code PNG for an Arbeitsmittel."""
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id == arbeitsmittel_id,
            Arbeitsmittel.organisation_id == org_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Arbeitsmittel nicht gefunden")

    # Generate QR code pointing to the detail page
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://app.pruefpilot.de')
    qr_url = f"{frontend_url}/arbeitsmittel?id={arbeitsmittel_id}"

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(qr_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_{item.name}.png"'},
    )


@router.post("/qr-etiketten")
async def generate_qr_labels(
    ids: list[str],
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate a PDF with QR code labels for selected Arbeitsmittel."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as pdf_canvas

    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id.in_(ids),
            Arbeitsmittel.organisation_id == org_id,
        )
    )
    items = result.scalars().all()

    if not items:
        raise HTTPException(status_code=404, detail="Keine Arbeitsmittel gefunden")

    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Label layout: 3 columns, 8 rows
    cols = 3
    rows = 8
    label_w = 65 * mm
    label_h = 35 * mm
    margin_x = 7 * mm
    margin_y = 10 * mm

    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://app.pruefpilot.de')

    for idx, item in enumerate(items):
        col = idx % cols
        row = (idx // cols) % rows
        page = idx // (cols * rows)

        if idx > 0 and idx % (cols * rows) == 0:
            c.showPage()

        x = margin_x + col * label_w
        y = height - margin_y - (row + 1) * label_h

        # Generate QR image
        qr_url = f"{frontend_url}/arbeitsmittel?id={item.id}"
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=1)
        qr.add_data(qr_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        qr_buffer = io.BytesIO()
        img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)

        from reportlab.lib.utils import ImageReader
        qr_img = ImageReader(qr_buffer)
        c.drawImage(qr_img, x + 2 * mm, y + 3 * mm, 25 * mm, 25 * mm)

        # Text next to QR
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x + 30 * mm, y + 25 * mm, item.name[:25])
        c.setFont("Helvetica", 6)
        c.drawString(x + 30 * mm, y + 19 * mm, f"Typ: {item.typ}")
        if item.seriennummer:
            c.drawString(x + 30 * mm, y + 14 * mm, f"SN: {item.seriennummer}")
        c.setFont("Helvetica", 5)
        c.drawString(x + 30 * mm, y + 8 * mm, "PrüfPilot")

        # Border
        c.rect(x, y, label_w - 2 * mm, label_h - 2 * mm)

    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="qr_etiketten.pdf"'},
    )


# ── BLOCK 5: Bulk Operations ─────────────────────────────────────────────────

@router.delete("/bulk", status_code=status.HTTP_204_NO_CONTENT, summary="Bulk delete equipment", description="Soft-delete multiple equipment items by ID list (marked as deleted, audit trail preserved).")
async def bulk_delete_arbeitsmittel(
    ids: list[str] = Query(..., description="List of equipment IDs to delete"),
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete multiple pieces of equipment in one request."""
    # Validate all items belong to org and get them first for audit logging
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id.in_(ids),
            Arbeitsmittel.organisation_id == org_id,
            Arbeitsmittel.deleted_at == None,  # Only soft-delete non-deleted items
        )
    )
    items = result.scalars().all()

    if len(items) != len(ids):
        raise HTTPException(
            status_code=400,
            detail=f"Found {len(items)} items out of {len(ids)} requested. Check IDs, org access, or deletion status."
        )

    now = datetime.now(timezone.utc)
    # Log audit for each deletion and perform soft-delete
    for item in items:
        vorher_snapshot = item.__dict__.copy()
        vorher_snapshot.pop("_sa_instance_state", None)

        # Soft-delete
        item.deleted_at = now

        await log_audit(
            db=db,
            organisation_id=org_id,
            user_id=user_id,
            aktion="geloescht",
            entitaet="Arbeitsmittel",
            entitaet_id=item.id,
            entitaet_name=item.name,
            vorher_snapshot=vorher_snapshot,
        )

    await db.flush()


@router.post("/bulk-update", response_model=list[ArbeitsmittelResponse], summary="Bulk update equipment", description="Update multiple equipment items with common fields.")
async def bulk_update_arbeitsmittel(
    updates: dict,  # {"ids": [...], "fields": {"pruef_intervall_monate": 24, ...}}
    org_id: str = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple equipment items with the same field values."""
    ids = updates.get("ids", [])
    fields = updates.get("fields", {})

    if not ids or not fields:
        raise HTTPException(status_code=400, detail="Must provide 'ids' and 'fields'")

    # Fetch all items
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id.in_(ids),
            Arbeitsmittel.organisation_id == org_id,
        )
    )
    items = result.scalars().all()

    if len(items) != len(ids):
        raise HTTPException(status_code=400, detail="Some items not found or not in your organisation")

    updated_items = []
    for item in items:
        # Snapshot before
        vorher_snapshot = item.__dict__.copy()
        vorher_snapshot.pop("_sa_instance_state", None)

        # Update fields
        for field, value in fields.items():
            if hasattr(item, field):
                setattr(item, field, value)

        await db.flush()
        await db.refresh(item)

        # Snapshot after and log audit
        nachher_snapshot = item.__dict__.copy()
        nachher_snapshot.pop("_sa_instance_state", None)
        aenderungen = compute_changes(vorher_snapshot, nachher_snapshot)

        if aenderungen:
            await log_audit(
                db=db,
                organisation_id=org_id,
                user_id=user_id,
                aktion="geaendert",
                entitaet="Arbeitsmittel",
                entitaet_id=item.id,
                entitaet_name=item.name,
                aenderungen=aenderungen,
                vorher_snapshot=vorher_snapshot,
                nachher_snapshot=nachher_snapshot,
            )

        updated_items.append(
            ArbeitsmittelResponse(
                id=str(item.id),
                name=item.name,
                typ=item.typ,
                standort_id=str(item.standort_id) if item.standort_id else None,
                hersteller=item.hersteller,
                modell=item.modell,
                seriennummer=item.seriennummer,
                baujahr=item.baujahr,
                foto_url=item.foto_url,
                beschreibung=item.beschreibung,
                norm=item.norm,
                pruef_intervall_monate=item.pruef_intervall_monate,
                letzte_pruefung_am=item.letzte_pruefung_am,
                naechste_pruefung_am=item.naechste_pruefung_am,
                ampel_status=item.ampel_status,
                qr_code_url=item.qr_code_url,
                created_at=item.created_at,
            )
        )

    return updated_items
