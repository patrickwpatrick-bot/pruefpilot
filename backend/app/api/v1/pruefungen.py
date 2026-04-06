"""
Prüfungen API - Start, execute, and complete inspections
"""
from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_current_user_id, decode_token
from app.models.pruefung import Pruefung, PruefPunkt
from app.models.arbeitsmittel import Arbeitsmittel
from app.models.checkliste import ChecklistenTemplate, ChecklistenPunkt
from app.models.mangel import Mangel
from app.schemas.pruefung import (
    PruefungCreate,
    PruefPunktUpdate,
    PruefungAbschliessenRequest,
    MangelCreate,
    MangelStatusUpdate,
    PruefungResponse,
    MangelResponse,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/pruefungen", tags=["Prüfungen"])
security = HTTPBearer()


async def _get_token_data(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    return {"user_id": payload.get("sub"), "org_id": payload.get("org")}


@router.get("", summary="List inspections", description="Retrieve all inspections (Prüfungen) for the organisation with their status, defects, and checklist items.")
async def list_pruefungen(
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """List all inspections for the organisation."""
    from app.models.user import User
    # Get all user IDs in the same org
    result = await db.execute(
        select(User.id).where(User.organisation_id == token_data["org_id"])
    )
    user_ids = [row[0] for row in result.all()]

    result = await db.execute(
        select(Pruefung)
        .options(
            selectinload(Pruefung.pruef_punkte),
            selectinload(Pruefung.maengel),
            selectinload(Pruefung.arbeitsmittel),
        )
        .where(Pruefung.pruefer_id.in_(user_ids))
        .order_by(Pruefung.gestartet_am.desc())
    )
    pruefungen = result.scalars().all()

    return [
        {
            "id": p.id,
            "arbeitsmittel_id": p.arbeitsmittel_id,
            "arbeitsmittel_name": p.arbeitsmittel.name if p.arbeitsmittel else None,
            "checkliste_id": p.checkliste_id,
            "pruefer_id": p.pruefer_id,
            "status": p.status,
            "ergebnis": p.ergebnis,
            "bemerkung": p.bemerkung,
            "ist_abgeschlossen": p.ist_abgeschlossen,
            "abgeschlossen_am": p.abgeschlossen_am,
            "gestartet_am": p.gestartet_am,
            "anzahl_punkte": len(p.pruef_punkte),
            "anzahl_maengel": len(p.maengel),
        }
        for p in pruefungen
    ]


@router.post("", response_model=PruefungResponse, status_code=status.HTTP_201_CREATED, summary="Start inspection", description="Create and start a new inspection (Prüfung) for an equipment item using a checklist template.")
async def start_pruefung(
    data: PruefungCreate,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Start a new inspection for an equipment item."""
    # Plan-Limit prüfen
    from app.core.plan_limits import check_pruefung_limit
    await check_pruefung_limit(db, token_data["org_id"])

    # Verify arbeitsmittel belongs to org
    result = await db.execute(
        select(Arbeitsmittel).where(
            Arbeitsmittel.id == data.arbeitsmittel_id,
            Arbeitsmittel.organisation_id == token_data["org_id"],
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Arbeitsmittel nicht gefunden")

    # Load checklist with points
    result = await db.execute(
        select(ChecklistenTemplate)
        .options(selectinload(ChecklistenTemplate.punkte))
        .where(ChecklistenTemplate.id == data.checkliste_id)
    )
    checkliste = result.scalar_one_or_none()
    if not checkliste:
        raise HTTPException(status_code=404, detail="Checkliste nicht gefunden")

    # Create inspection
    pruefung = Pruefung(
        arbeitsmittel_id=data.arbeitsmittel_id,
        checkliste_id=data.checkliste_id,
        pruefer_id=token_data["user_id"],
        status="in_bearbeitung",
    )
    db.add(pruefung)
    await db.flush()

    # Create check items from template
    for punkt in checkliste.punkte:
        pruef_punkt = PruefPunkt(
            pruefung_id=pruefung.id,
            checklisten_punkt_id=punkt.id,
            ergebnis="offen",
        )
        db.add(pruef_punkt)

    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Pruefung)
        .options(selectinload(Pruefung.pruef_punkte), selectinload(Pruefung.maengel))
        .where(Pruefung.id == pruefung.id)
    )
    return result.scalar_one()


@router.get("/{pruefung_id}", response_model=PruefungResponse)
async def get_pruefung(
    pruefung_id: str,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Get inspection details."""
    result = await db.execute(
        select(Pruefung)
        .options(selectinload(Pruefung.pruef_punkte), selectinload(Pruefung.maengel))
        .where(Pruefung.id == pruefung_id)
    )
    pruefung = result.scalar_one_or_none()
    if not pruefung:
        raise HTTPException(status_code=404, detail="Prüfung nicht gefunden")
    return pruefung


@router.put("/{pruefung_id}/punkte/{punkt_id}")
async def update_pruef_punkt(
    pruefung_id: str,
    punkt_id: str,
    data: PruefPunktUpdate,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Update a single check item result (OK / Mangel / N/A)."""
    result = await db.execute(
        select(Pruefung).where(Pruefung.id == pruefung_id)
    )
    pruefung = result.scalar_one_or_none()
    if not pruefung:
        raise HTTPException(status_code=404, detail="Prüfung nicht gefunden")
    if pruefung.ist_abgeschlossen:
        raise HTTPException(status_code=400, detail="Prüfung ist bereits abgeschlossen und gesperrt")

    result = await db.execute(
        select(PruefPunkt).where(
            PruefPunkt.id == punkt_id,
            PruefPunkt.pruefung_id == pruefung_id,
        )
    )
    punkt = result.scalar_one_or_none()
    if not punkt:
        raise HTTPException(status_code=404, detail="Prüfpunkt nicht gefunden")

    punkt.ergebnis = data.ergebnis
    punkt.bemerkung = data.bemerkung
    punkt.geprueft_am = datetime.now(timezone.utc)

    return {"status": "ok"}


@router.post("/{pruefung_id}/maengel", response_model=MangelResponse, status_code=201)
async def create_mangel(
    pruefung_id: str,
    data: MangelCreate,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Record a defect during inspection."""
    result = await db.execute(
        select(Pruefung).where(Pruefung.id == pruefung_id)
    )
    pruefung = result.scalar_one_or_none()
    if not pruefung:
        raise HTTPException(status_code=404, detail="Prüfung nicht gefunden")
    if pruefung.ist_abgeschlossen:
        raise HTTPException(status_code=400, detail="Prüfung ist bereits abgeschlossen und gesperrt")

    mangel = Mangel(
        pruefung_id=pruefung_id,
        **data.model_dump(),
    )
    db.add(mangel)
    await db.flush()
    await db.refresh(mangel)
    return mangel


@router.put("/{pruefung_id}/abschliessen", response_model=PruefungResponse)
async def abschliessen(
    pruefung_id: str,
    data: PruefungAbschliessenRequest,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Complete and lock an inspection. No further changes allowed after this."""
    result = await db.execute(
        select(Pruefung)
        .options(selectinload(Pruefung.pruef_punkte), selectinload(Pruefung.maengel))
        .where(Pruefung.id == pruefung_id)
    )
    pruefung = result.scalar_one_or_none()
    if not pruefung:
        raise HTTPException(status_code=404, detail="Prüfung nicht gefunden")
    if pruefung.ist_abgeschlossen:
        raise HTTPException(status_code=400, detail="Prüfung ist bereits abgeschlossen")

    # Check all points are filled
    offene = [p for p in pruefung.pruef_punkte if p.ergebnis == "offen"]
    if offene:
        raise HTTPException(
            status_code=400,
            detail=f"Noch {len(offene)} Prüfpunkt(e) offen. Alle Punkte müssen bewertet werden.",
        )

    # Determine overall result
    hat_rot = any(m.schweregrad == "rot" for m in pruefung.maengel)
    hat_maengel = len(pruefung.maengel) > 0

    pruefung.status = "abgeschlossen"
    pruefung.ergebnis = "gesperrt" if hat_rot else ("maengel" if hat_maengel else "bestanden")
    pruefung.bemerkung = data.bemerkung
    pruefung.unterschrift_name = data.unterschrift_name
    pruefung.ist_abgeschlossen = True
    pruefung.abgeschlossen_am = datetime.now(timezone.utc)

    # Fix 4: Digitale Unterschrift speichern mit Validierung (Base64 DataURL → Datei)
    if data.unterschrift_url and data.unterschrift_url.startswith("data:image/"):
        try:
            import base64

            # Fix 4: MIME-Type Validierung - Nur PNG/JPEG erlaubt
            allowed_types = ["data:image/png", "data:image/jpeg", "data:image/jpg"]
            mime_header = data.unterschrift_url.split(",")[0] if "," in data.unterschrift_url else ""
            if not any(mime_header.startswith(t) for t in allowed_types):
                raise HTTPException(
                    status_code=400,
                    detail="Nur PNG oder JPEG Signaturen erlaubt",
                )

            header, b64_data = data.unterschrift_url.split(",", 1)
            img_bytes = base64.b64decode(b64_data)

            # Fix 4: Size-Check - max 2MB
            if len(img_bytes) > 2 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail="Signatur zu groß (max. 2 MB)",
                )

            from app.services.storage import upload_file
            url = await upload_file(img_bytes, f"unterschrift_{pruefung.id}.png", "image/png")
            pruefung.unterschrift_url = url
        except HTTPException:
            raise
        except Exception:
            pass  # Signatur-Upload fehlgeschlagen, nicht kritisch

    # --- Update Arbeitsmittel: Ampel-Status + next inspection date ---
    result2 = await db.execute(
        select(Arbeitsmittel).where(Arbeitsmittel.id == pruefung.arbeitsmittel_id)
    )
    am = result2.scalar_one_or_none()
    if am:
        today = date.today()
        am.letzte_pruefung_am = today
        intervall = am.pruef_intervall_monate or 12
        naechste = today + relativedelta(months=intervall)
        am.naechste_pruefung_am = naechste

        # Ampel: rot if overdue or gesperrt, gelb if <30 days left, gruen otherwise
        if pruefung.ergebnis == "gesperrt":
            am.ampel_status = "rot"
        else:
            from datetime import timedelta
            tage_bis = (naechste - today).days
            if tage_bis <= 0:
                am.ampel_status = "rot"
            elif tage_bis <= 30:
                am.ampel_status = "gelb"
            else:
                am.ampel_status = "gruen"

    return pruefung


async def _load_pruefung_for_pdf(pruefung_id: str, db: AsyncSession):
    """Load a Prüfung with all relations needed for PDF generation."""
    from sqlalchemy.orm import selectinload as sil
    result = await db.execute(
        select(Pruefung)
        .options(
            sil(Pruefung.pruef_punkte),
            sil(Pruefung.maengel).selectinload(Mangel.fotos),
            sil(Pruefung.arbeitsmittel),
        )
        .where(Pruefung.id == pruefung_id)
    )
    pruefung = result.scalar_one_or_none()
    if not pruefung:
        raise HTTPException(status_code=404, detail="Prüfung nicht gefunden")
    if not pruefung.ist_abgeschlossen:
        raise HTTPException(status_code=400, detail="Prüfung ist noch nicht abgeschlossen")
    return pruefung


async def _build_pdf(pruefung, checkliste, organisation, show_wasserzeichen: bool = False) -> bytes:
    """Build a professional PDF Prüfprotokoll. Returns PDF bytes."""
    import io
    import os
    import logging
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm, cm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.platypus.flowables import KeepTogether

    logger = logging.getLogger(__name__)

    # Colors
    PRUEFPILOT_BLACK = colors.Color(0.07, 0.07, 0.07)
    HEADER_BG = colors.Color(0.07, 0.07, 0.07)
    LIGHT_BG = colors.Color(0.97, 0.97, 0.97)
    BORDER_COLOR = colors.Color(0.85, 0.85, 0.85)
    AMPEL_COLORS = {
        "ok": colors.Color(0.13, 0.73, 0.33),         # green
        "mangel": colors.Color(0.96, 0.26, 0.21),      # red
        "nicht_anwendbar": colors.Color(0.61, 0.61, 0.61),  # grey
        "offen": colors.Color(0.61, 0.61, 0.61),
    }
    SEVERITY_COLORS = {
        "gruen": colors.Color(0.13, 0.73, 0.33),
        "orange": colors.Color(1.0, 0.65, 0.0),
        "rot": colors.Color(0.96, 0.26, 0.21),
    }
    ERGEBNIS_COLORS = {
        "bestanden": colors.Color(0.13, 0.73, 0.33),
        "maengel": colors.Color(1.0, 0.65, 0.0),
        "gesperrt": colors.Color(0.96, 0.26, 0.21),
    }

    punkt_texts = {}
    if checkliste:
        for p in checkliste.punkte:
            punkt_texts[p.id] = p.text

    buf = io.BytesIO()

    # Wasserzeichen callback for free plan
    def _add_wasserzeichen(canvas, doc):
        if show_wasserzeichen:
            canvas.saveState()
            canvas.setFont("Helvetica", 48)
            canvas.setFillColor(colors.Color(0, 0, 0, alpha=0.06))
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "PrüfPilot Free")
            canvas.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=20 * mm, bottomMargin=25 * mm,
        leftMargin=15 * mm, rightMargin=15 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('PP_Title', parent=styles['Title'], fontSize=20, spaceAfter=2, textColor=PRUEFPILOT_BLACK)
    subtitle_style = ParagraphStyle('PP_Sub', parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=10)
    h2_style = ParagraphStyle('PP_H2', parent=styles['Heading2'], fontSize=13, spaceBefore=14, spaceAfter=6, textColor=PRUEFPILOT_BLACK)
    normal = styles['Normal']
    normal.fontSize = 9
    small_style = ParagraphStyle('PP_Small', parent=normal, fontSize=8, textColor=colors.grey)
    bold_style = ParagraphStyle('PP_Bold', parent=normal, fontName='Helvetica-Bold', fontSize=9)
    center_style = ParagraphStyle('PP_Center', parent=normal, alignment=TA_CENTER, fontSize=9)

    elements = []

    # --- Header with Logo ---
    am_name = pruefung.arbeitsmittel.name if pruefung.arbeitsmittel else "—"
    header_left = Paragraph("PrüfPilot — Prüfprotokoll", title_style)

    # Try to load organisation logo
    logo_element = None
    if organisation and organisation.logo_url:
        try:
            logo_path = organisation.logo_url
            if logo_path.startswith("/uploads/"):
                logo_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', logo_path.lstrip('/'))
            if os.path.exists(logo_path):
                logo_element = Image(logo_path, width=30 * mm, height=15 * mm)
                logo_element.hAlign = 'RIGHT'
        except Exception as e:
            logger.warning("Could not load logo: %s", e)

    if logo_element:
        header_table = Table(
            [[header_left, logo_element]],
            colWidths=[130 * mm, 40 * mm],
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
    else:
        elements.append(header_left)

    elements.append(Paragraph(am_name, subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=8))

    # --- Ergebnis badge ---
    ergebnis_label = {
        "bestanden": "BESTANDEN",
        "maengel": "MIT MÄNGELN",
        "gesperrt": "GESPERRT",
    }.get(pruefung.ergebnis or "", "—")
    ergebnis_color = ERGEBNIS_COLORS.get(pruefung.ergebnis or "", colors.grey)

    ergebnis_badge = Table(
        [[Paragraph(f'<font color="white"><b>{ergebnis_label}</b></font>', center_style)]],
        colWidths=[45 * mm], rowHeights=[8 * mm],
    )
    ergebnis_badge.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), ergebnis_color),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ('LEFTPADDING', (0, 0), (0, 0), 6),
        ('RIGHTPADDING', (0, 0), (0, 0), 6),
    ]))

    # --- Meta table with Ergebnis badge ---
    org_name = organisation.name if organisation else "—"
    meta_data = [
        [Paragraph("<b>Betrieb:</b>", normal), Paragraph(org_name, normal)],
        [Paragraph("<b>Datum:</b>", normal), Paragraph(
            pruefung.abgeschlossen_am.strftime("%d.%m.%Y %H:%M") if pruefung.abgeschlossen_am else "—", normal
        )],
        [Paragraph("<b>Ergebnis:</b>", normal), ergebnis_badge],
        [Paragraph("<b>Prüfer:</b>", normal), Paragraph(pruefung.unterschrift_name or "—", normal)],
        [Paragraph("<b>Checkliste:</b>", normal), Paragraph(checkliste.name if checkliste else "—", normal)],
    ]
    if pruefung.bemerkung:
        meta_data.append([Paragraph("<b>Bemerkung:</b>", normal), Paragraph(pruefung.bemerkung, normal)])

    meta_table = Table(meta_data, colWidths=[35 * mm, 130 * mm])
    meta_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    # --- Prüfpunkte table with Ampelfarben ---
    elements.append(Paragraph("Prüfpunkte", h2_style))

    ergebnis_labels = {"ok": "OK", "mangel": "Mangel", "nicht_anwendbar": "N/A", "offen": "—"}
    rows = [[
        Paragraph("<b>Nr.</b>", center_style),
        Paragraph("<b>Prüfpunkt</b>", bold_style),
        Paragraph("<b>Ergebnis</b>", center_style),
    ]]
    row_colors = []
    for i, pp in enumerate(pruefung.pruef_punkte):
        text = punkt_texts.get(pp.checklisten_punkt_id, f"Punkt {i + 1}")
        label = ergebnis_labels.get(pp.ergebnis, "—")
        color = AMPEL_COLORS.get(pp.ergebnis, colors.grey)
        colored_label = Paragraph(f'<font color="{color.hexval()}">{label}</font>', center_style)
        rows.append([str(i + 1), Paragraph(text, normal), colored_label])
        row_colors.append(color)

    pt = Table(rows, colWidths=[12 * mm, 123 * mm, 30 * mm])
    table_style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]
    # Add colored left border per row based on result
    for idx, color in enumerate(row_colors):
        row = idx + 1  # skip header
        table_style_cmds.append(('LINEBEFORECOL', (0, row), (0, row), 3, color))

    pt.setStyle(TableStyle(table_style_cmds))
    elements.append(pt)

    # --- Mängel section with severity colors and photos ---
    if pruefung.maengel:
        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph(f"Mängel ({len(pruefung.maengel)})", h2_style))

        sev_labels = {"gruen": "Gering", "orange": "Mittel", "rot": "Kritisch"}

        for i, m in enumerate(pruefung.maengel):
            sev_color = SEVERITY_COLORS.get(m.schweregrad, colors.grey)
            sev_label = sev_labels.get(m.schweregrad, "—")

            # Mangel header row
            mangel_header = Table(
                [[
                    Paragraph(f"<b>#{i + 1}</b>", center_style),
                    Paragraph(f"<b>{m.beschreibung}</b>", normal),
                    Paragraph(f'<font color="{sev_color.hexval()}"><b>{sev_label}</b></font>', center_style),
                ]],
                colWidths=[12 * mm, 123 * mm, 30 * mm],
            )
            mangel_header.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LINEBEFORECOL', (0, 0), (0, 0), 3, sev_color),
            ]))
            elements.append(mangel_header)

            # Embed Mängel-Fotos if available
            if hasattr(m, 'fotos') and m.fotos:
                foto_elements = []
                for foto in m.fotos[:3]:  # max 3 photos per Mangel
                    try:
                        foto_path = foto.url
                        if foto_path.startswith("/uploads/"):
                            foto_path = os.path.join(
                                os.path.dirname(__file__), '..', '..', '..', foto_path.lstrip('/')
                            )
                        if os.path.exists(foto_path):
                            img = Image(foto_path, width=40 * mm, height=30 * mm)
                            foto_elements.append(img)
                    except Exception as e:
                        logger.warning("Could not embed foto %s: %s", foto.id, e)

                if foto_elements:
                    # Arrange photos in a row
                    foto_row = Table([foto_elements], colWidths=[45 * mm] * len(foto_elements))
                    foto_row.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 2),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]))
                    elements.append(foto_row)

            elements.append(Spacer(1, 2 * mm))

    # --- Digital Signature ---
    if pruefung.unterschrift_url:
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph("Unterschrift", h2_style))
        try:
            sig_path = pruefung.unterschrift_url
            if sig_path.startswith("/uploads/"):
                sig_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', sig_path.lstrip('/'))
            if os.path.exists(sig_path):
                sig_img = Image(sig_path, width=50 * mm, height=20 * mm)
                elements.append(sig_img)
        except Exception as e:
            logger.warning("Could not embed signature: %s", e)

        elements.append(Paragraph(pruefung.unterschrift_name or "", normal))
        elements.append(Paragraph(
            pruefung.abgeschlossen_am.strftime("%d.%m.%Y %H:%M") if pruefung.abgeschlossen_am else "",
            small_style,
        ))

    # --- Footer ---
    elements.append(Spacer(1, 12 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=4))
    elements.append(Paragraph(
        "Dieses Prüfprotokoll wurde revisionssicher erstellt mit PrüfPilot. "
        f"Dokument-ID: {pruefung.id[:8]}",
        small_style,
    ))

    doc.build(elements, onFirstPage=_add_wasserzeichen, onLaterPages=_add_wasserzeichen)
    buf.seek(0)
    return buf.getvalue()


@router.get("/{pruefung_id}/pdf")
async def export_pdf(
    pruefung_id: str,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Generate a professional PDF protocol for a completed inspection."""
    import io
    from app.models.organisation import Organisation
    from app.core.plan_limits import should_add_wasserzeichen

    pruefung = await _load_pruefung_for_pdf(pruefung_id, db)

    # Load checklist
    cl_result = await db.execute(
        select(ChecklistenTemplate)
        .options(selectinload(ChecklistenTemplate.punkte))
        .where(ChecklistenTemplate.id == pruefung.checkliste_id)
    )
    checkliste = cl_result.scalar_one_or_none()

    # Load organisation for logo and plan
    org = None
    if pruefung.arbeitsmittel:
        org_result = await db.execute(
            select(Organisation).where(Organisation.id == pruefung.arbeitsmittel.organisation_id)
        )
        org = org_result.scalar_one_or_none()

    plan_name = org.plan if org else "free"
    wasserzeichen = should_add_wasserzeichen(plan_name)

    pdf_bytes = await _build_pdf(pruefung, checkliste, org, show_wasserzeichen=wasserzeichen)

    am_name = pruefung.arbeitsmittel.name if pruefung.arbeitsmittel else "draft"
    filename = f"Pruefprotokoll_{am_name.replace(' ', '_')}_{pruefung.abgeschlossen_am.strftime('%Y%m%d') if pruefung.abgeschlossen_am else 'draft'}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{pruefung_id}/pdf/email")
async def send_pdf_email(
    pruefung_id: str,
    email_to: str | None = None,
    token_data: dict = Depends(_get_token_data),
    db: AsyncSession = Depends(get_db),
):
    """Generate PDF and send it via email."""
    from app.models.organisation import Organisation
    from app.models.user import User
    from app.core.plan_limits import should_add_wasserzeichen
    from app.services.email import send_pdf_per_email

    pruefung = await _load_pruefung_for_pdf(pruefung_id, db)

    # Load checklist
    cl_result = await db.execute(
        select(ChecklistenTemplate)
        .options(selectinload(ChecklistenTemplate.punkte))
        .where(ChecklistenTemplate.id == pruefung.checkliste_id)
    )
    checkliste = cl_result.scalar_one_or_none()

    # Load org
    org = None
    if pruefung.arbeitsmittel:
        org_result = await db.execute(
            select(Organisation).where(Organisation.id == pruefung.arbeitsmittel.organisation_id)
        )
        org = org_result.scalar_one_or_none()

    plan_name = org.plan if org else "free"
    wasserzeichen = should_add_wasserzeichen(plan_name)

    pdf_bytes = await _build_pdf(pruefung, checkliste, org, show_wasserzeichen=wasserzeichen)

    # Determine recipient
    if not email_to:
        user_result = await db.execute(
            select(User).where(User.id == token_data["sub"])
        )
        user = user_result.scalar_one_or_none()
        email_to = user.email if user else None

    if not email_to:
        raise HTTPException(status_code=400, detail="Keine E-Mail-Adresse angegeben")

    am_name = pruefung.arbeitsmittel.name if pruefung.arbeitsmittel else "Prüfung"
    filename = f"Pruefprotokoll_{am_name.replace(' ', '_')}.pdf"
    subject = f"Prüfprotokoll: {am_name}"

    success = await send_pdf_per_email(email_to, subject, pdf_bytes, filename)
    if not success:
        raise HTTPException(status_code=500, detail="E-Mail konnte nicht gesendet werden")

    return {"message": f"Prüfprotokoll an {email_to} gesendet", "email": email_to}
