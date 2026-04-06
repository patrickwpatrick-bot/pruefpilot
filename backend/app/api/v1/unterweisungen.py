"""
Unterweisungen API - Training templates and completion records
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timedelta
import io
import json
import re
from app.core.database import get_db
from app.core.security import decode_token
from app.core.config import settings
from app.models.unterweisung import UnterweisungsVorlage, UnterweisungsDurchfuehrung
from app.models.unterweisungs_zuweisung import UnterweisungsZuweisung
from app.models.mitarbeiter import Mitarbeiter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/unterweisungen", tags=["Unterweisungen"])
security = HTTPBearer()


# --- Schemas ---

class UnterweisungsDurchfuehrungCreate(BaseModel):
    vorlage_id: str
    teilnehmer_name: str = Field(..., min_length=1)
    teilnehmer_email: Optional[str] = None
    datum: date
    unterschrift_name: Optional[str] = None
    bemerkung: Optional[str] = None


class UnterweisungsDurchfuehrungResponse(BaseModel):
    id: str
    vorlage_id: str
    teilnehmer_name: str
    teilnehmer_email: Optional[str]
    datum: date
    unterschrift_name: Optional[str]
    bemerkung: Optional[str]
    naechste_unterweisung_am: Optional[date]
    vorlage_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UnterweisungsVorlageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    beschreibung: Optional[str] = None
    kategorie: str = "allgemein"
    inhalt: str = Field(..., min_length=1)
    intervall_monate: int = 12
    norm_referenz: Optional[str] = None
    betroffene_qualifikationen: Optional[str] = None
    ist_pflicht_fuer_alle: bool = False


class UnterweisungsVorlageUpdate(BaseModel):
    name: Optional[str] = None
    beschreibung: Optional[str] = None
    kategorie: Optional[str] = None
    inhalt: Optional[str] = None
    intervall_monate: Optional[int] = None
    norm_referenz: Optional[str] = None
    betroffene_qualifikationen: Optional[str] = None
    ist_pflicht_fuer_alle: Optional[bool] = None


class UnterweisungsVorlageResponse(BaseModel):
    id: str
    name: str
    beschreibung: Optional[str]
    kategorie: str
    inhalt: str
    ist_system_template: bool
    intervall_monate: int
    norm_referenz: Optional[str] = None
    betroffene_qualifikationen: Optional[str] = None
    ist_pflicht_fuer_alle: bool = False
    created_at: datetime
    zuweisungs_count: int = 0
    compliance_prozent: int = 0

    class Config:
        from_attributes = True


class UnterweisungsZuweisungCreate(BaseModel):
    vorlage_id: str
    mitarbeiter_id: str


class UnterweisungsZuweisungResponse(BaseModel):
    id: str
    vorlage_id: str
    vorlage_name: str
    mitarbeiter_id: str
    mitarbeiter_name: str
    status: str
    faellig_am: date
    unterschrieben_am: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MassAssignRequest(BaseModel):
    vorlage_id: str
    mitarbeiter_ids: list[str]


class ComplianceVorlageStatus(BaseModel):
    vorlage_id: str
    vorlage_name: str
    status: str  # gruen, rot, gelb, offen
    unterschrieben_am: Optional[datetime] = None
    faellig_am: Optional[date] = None


class ComplianceMatrixRow(BaseModel):
    mitarbeiter_id: str
    mitarbeiter_name: str
    abteilung: Optional[str]
    vorlagen: list[ComplianceVorlageStatus]
    gesamt_prozent: int


class UnterweisungenListResponse(BaseModel):
    vorlagen: list[UnterweisungsVorlageResponse] = []
    durchfuehrungen: list[UnterweisungsDurchfuehrungResponse] = []


async def _get_org_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    return payload.get("org")


@router.get("", response_model=UnterweisungenListResponse)
async def list_unterweisungen(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all training templates (org-specific + system) and completion records."""
    # Get all templates for org and system templates
    result_vorlagen = await db.execute(
        select(UnterweisungsVorlage)
        .where(
            (UnterweisungsVorlage.organisation_id == org_id)
            | (UnterweisungsVorlage.ist_system_template == True)
        )
        .order_by(UnterweisungsVorlage.name)
    )
    vorlagen = result_vorlagen.scalars().all()

    # Get all completions for org
    result_durchfuehrungen = await db.execute(
        select(UnterweisungsDurchfuehrung)
        .options(selectinload(UnterweisungsDurchfuehrung.vorlage))
        .where(UnterweisungsDurchfuehrung.organisation_id == org_id)
        .order_by(UnterweisungsDurchfuehrung.datum.desc())
    )
    durchfuehrungen = result_durchfuehrungen.scalars().all()

    # Map vorlage names to responses
    durchfuehrungen_response = []
    for d in durchfuehrungen:
        response = UnterweisungsDurchfuehrungResponse.model_validate(d)
        if d.vorlage:
            response.vorlage_name = d.vorlage.name
        durchfuehrungen_response.append(response)

    # Add zuweisungs_count and compliance_prozent for each vorlage
    vorlagen_response = []
    for v in vorlagen:
        # Count zuweisungen
        zuweisungen_result = await db.execute(
            select(func.count(UnterweisungsZuweisung.id)).where(
                UnterweisungsZuweisung.vorlage_id == v.id
            )
        )
        zuweisungs_count = zuweisungen_result.scalar() or 0

        # Calculate compliance
        completed_result = await db.execute(
            select(func.count(UnterweisungsZuweisung.id)).where(
                UnterweisungsZuweisung.vorlage_id == v.id,
                UnterweisungsZuweisung.status == "unterschrieben"
            )
        )
        completed_count = completed_result.scalar() or 0
        compliance_prozent = int((completed_count / zuweisungs_count * 100) if zuweisungs_count > 0 else 0)

        resp = UnterweisungsVorlageResponse.model_validate(v)
        resp.zuweisungs_count = zuweisungs_count
        resp.compliance_prozent = compliance_prozent
        vorlagen_response.append(resp)

    return UnterweisungenListResponse(
        vorlagen=vorlagen_response,
        durchfuehrungen=durchfuehrungen_response,
    )


@router.post("/vorlagen", response_model=UnterweisungsVorlageResponse, status_code=201)
async def create_vorlage(
    data: UnterweisungsVorlageCreate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new training template."""
    vorlage = UnterweisungsVorlage(
        organisation_id=org_id,
        name=data.name,
        beschreibung=data.beschreibung,
        kategorie=data.kategorie,
        inhalt=data.inhalt,
        intervall_monate=data.intervall_monate,
        norm_referenz=data.norm_referenz,
        betroffene_qualifikationen=data.betroffene_qualifikationen,
        ist_pflicht_fuer_alle=data.ist_pflicht_fuer_alle,
    )
    db.add(vorlage)
    await db.flush()
    await db.refresh(vorlage)
    return vorlage


@router.get("/vorlagen/{vorlage_id}", response_model=UnterweisungsVorlageResponse)
async def get_vorlage(
    vorlage_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single training template with compliance stats."""
    result = await db.execute(
        select(UnterweisungsVorlage).where(
            UnterweisungsVorlage.id == vorlage_id,
            (UnterweisungsVorlage.organisation_id == org_id) | (UnterweisungsVorlage.ist_system_template == True)
        )
    )
    vorlage = result.scalar_one_or_none()
    if not vorlage:
        raise HTTPException(status_code=404, detail="Unterweisungsvorlage nicht gefunden")

    # Count zuweisungen
    zuweisungen_result = await db.execute(
        select(func.count(UnterweisungsZuweisung.id)).where(
            UnterweisungsZuweisung.vorlage_id == vorlage_id
        )
    )
    zuweisungs_count = zuweisungen_result.scalar() or 0

    # Calculate compliance
    completed_result = await db.execute(
        select(func.count(UnterweisungsZuweisung.id)).where(
            UnterweisungsZuweisung.vorlage_id == vorlage_id,
            UnterweisungsZuweisung.status == "unterschrieben"
        )
    )
    completed_count = completed_result.scalar() or 0
    compliance_prozent = int((completed_count / zuweisungs_count * 100) if zuweisungs_count > 0 else 0)

    resp = UnterweisungsVorlageResponse.model_validate(vorlage)
    resp.zuweisungs_count = zuweisungs_count
    resp.compliance_prozent = compliance_prozent
    return resp


@router.put("/vorlagen/{vorlage_id}", response_model=UnterweisungsVorlageResponse)
async def update_vorlage(
    vorlage_id: str,
    data: UnterweisungsVorlageUpdate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a training template."""
    result = await db.execute(
        select(UnterweisungsVorlage).where(
            UnterweisungsVorlage.id == vorlage_id,
            UnterweisungsVorlage.organisation_id == org_id,
            UnterweisungsVorlage.ist_system_template == False,
        )
    )
    vorlage = result.scalar_one_or_none()
    if not vorlage:
        raise HTTPException(status_code=404, detail="Unterweisungsvorlage nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vorlage, key, value)
    await db.flush()
    await db.refresh(vorlage)

    # Get compliance stats
    zuweisungen_result = await db.execute(
        select(func.count(UnterweisungsZuweisung.id)).where(
            UnterweisungsZuweisung.vorlage_id == vorlage_id
        )
    )
    zuweisungs_count = zuweisungen_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(UnterweisungsZuweisung.id)).where(
            UnterweisungsZuweisung.vorlage_id == vorlage_id,
            UnterweisungsZuweisung.status == "unterschrieben"
        )
    )
    completed_count = completed_result.scalar() or 0
    compliance_prozent = int((completed_count / zuweisungs_count * 100) if zuweisungs_count > 0 else 0)

    resp = UnterweisungsVorlageResponse.model_validate(vorlage)
    resp.zuweisungs_count = zuweisungs_count
    resp.compliance_prozent = compliance_prozent
    return resp


@router.delete("/vorlagen/{vorlage_id}", status_code=204)
async def delete_vorlage(
    vorlage_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a training template (only non-system templates)."""
    result = await db.execute(
        select(UnterweisungsVorlage).where(
            UnterweisungsVorlage.id == vorlage_id,
            UnterweisungsVorlage.organisation_id == org_id,
            UnterweisungsVorlage.ist_system_template == False,
        )
    )
    vorlage = result.scalar_one_or_none()
    if not vorlage:
        raise HTTPException(status_code=404, detail="Unterweisungsvorlage nicht gefunden")
    await db.delete(vorlage)


@router.post("/durchfuehrungen", response_model=UnterweisungsDurchfuehrungResponse, status_code=201)
async def create_durchfuehrung(
    data: UnterweisungsDurchfuehrungCreate,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Record a training completion."""
    # Get vorlage to calculate next training date
    result_vorlage = await db.execute(
        select(UnterweisungsVorlage).where(UnterweisungsVorlage.id == data.vorlage_id)
    )
    vorlage = result_vorlage.scalar_one_or_none()
    if not vorlage:
        raise HTTPException(status_code=404, detail="Unterweisungsvorlage nicht gefunden")

    # Calculate next training date
    naechste_unterweisung_am = None
    if vorlage.intervall_monate:
        naechste_unterweisung_am = data.datum + timedelta(days=30 * vorlage.intervall_monate)

    # Get current user from token (would need durchgefuehrt_von_id)
    # For now, we'll use a placeholder - in real implementation, this would come from token
    durchfuehrung = UnterweisungsDurchfuehrung(
        vorlage_id=data.vorlage_id,
        organisation_id=org_id,
        durchgefuehrt_von_id="system",  # Would be actual user from token
        teilnehmer_name=data.teilnehmer_name,
        teilnehmer_email=data.teilnehmer_email,
        datum=data.datum,
        unterschrift_name=data.unterschrift_name,
        bemerkung=data.bemerkung,
        naechste_unterweisung_am=naechste_unterweisung_am,
    )
    db.add(durchfuehrung)
    await db.flush()
    await db.refresh(durchfuehrung)

    # Reload with vorlage
    result = await db.execute(
        select(UnterweisungsDurchfuehrung)
        .options(selectinload(UnterweisungsDurchfuehrung.vorlage))
        .where(UnterweisungsDurchfuehrung.id == durchfuehrung.id)
    )
    durchfuehrung_loaded = result.scalar_one()

    response = UnterweisungsDurchfuehrungResponse.model_validate(durchfuehrung_loaded)
    if durchfuehrung_loaded.vorlage:
        response.vorlage_name = durchfuehrung_loaded.vorlage.name
    return response


@router.get("/durchfuehrungen", response_model=list[UnterweisungsDurchfuehrungResponse])
async def list_durchfuehrungen(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all training completions for the org with vorlage name via join."""
    result = await db.execute(
        select(UnterweisungsDurchfuehrung)
        .options(selectinload(UnterweisungsDurchfuehrung.vorlage))
        .where(UnterweisungsDurchfuehrung.organisation_id == org_id)
        .order_by(UnterweisungsDurchfuehrung.datum.desc())
    )
    durchfuehrungen = result.scalars().all()

    responses = []
    for d in durchfuehrungen:
        response = UnterweisungsDurchfuehrungResponse.model_validate(d)
        if d.vorlage:
            response.vorlage_name = d.vorlage.name
        responses.append(response)
    return responses


# ===== ZUWEISUNGEN (Mass Assign / Individual) =====

@router.get("/zuweisungen", response_model=list[UnterweisungsZuweisungResponse])
async def list_zuweisungen(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all training assignments for the org with vorlage and mitarbeiter names."""
    result = await db.execute(
        select(UnterweisungsZuweisung)
        .options(
            selectinload(UnterweisungsZuweisung.vorlage),
            selectinload(UnterweisungsZuweisung.mitarbeiter),
        )
        .where(UnterweisungsZuweisung.organisation_id == org_id)
        .order_by(UnterweisungsZuweisung.created_at.desc())
    )
    zuweisungen = result.scalars().all()

    responses = []
    for z in zuweisungen:
        resp = UnterweisungsZuweisungResponse(
            id=z.id,
            vorlage_id=z.vorlage_id,
            vorlage_name=z.vorlage.name if z.vorlage else "—",
            mitarbeiter_id=z.mitarbeiter_id,
            mitarbeiter_name=f"{z.mitarbeiter.vorname} {z.mitarbeiter.nachname}" if z.mitarbeiter else "—",
            status=z.status,
            faellig_am=z.faellig_am,
            unterschrieben_am=z.unterschrieben_am,
            created_at=z.created_at,
        )
        responses.append(resp)
    return responses


@router.post("/zuweisungen/versenden", status_code=201)
async def mass_assign_zuweisungen(
    data: MassAssignRequest,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Mass-assign a training template to multiple employees."""
    # Verify vorlage exists and belongs to org
    vorlage_result = await db.execute(
        select(UnterweisungsVorlage).where(UnterweisungsVorlage.id == data.vorlage_id)
    )
    vorlage = vorlage_result.scalar_one_or_none()
    if not vorlage:
        raise HTTPException(status_code=404, detail="Unterweisungsvorlage nicht gefunden")

    # Create zuweisung for each mitarbeiter
    zuweisungen_created = []
    for mitarbeiter_id in data.mitarbeiter_ids:
        # Verify mitarbeiter exists in org
        ma_result = await db.execute(
            select(Mitarbeiter).where(
                Mitarbeiter.id == mitarbeiter_id,
                Mitarbeiter.organisation_id == org_id,
            )
        )
        if not ma_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Mitarbeiter {mitarbeiter_id} nicht gefunden")

        # Calculate faellig_am
        faellig_am = date.today() + timedelta(days=30 * vorlage.intervall_monate)

        # Create zuweisung
        zuweisung = UnterweisungsZuweisung(
            vorlage_id=data.vorlage_id,
            mitarbeiter_id=mitarbeiter_id,
            organisation_id=org_id,
            faellig_am=faellig_am,
            status="versendet",
        )
        db.add(zuweisung)
        zuweisungen_created.append(zuweisung)

    await db.flush()

    return {"created": len(zuweisungen_created), "message": f"{len(zuweisungen_created)} Zuweisungen erstellt"}


# ===== COMPLIANCE MATRIX =====

@router.get("/compliance-matrix", response_model=list[ComplianceMatrixRow])
async def get_compliance_matrix(
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Return per-mitarbeiter compliance status across all vorlagen."""
    # Get all mitarbeiter for org
    result = await db.execute(
        select(Mitarbeiter)
        .options(
            selectinload(Mitarbeiter.abteilung),
            selectinload(Mitarbeiter.unterweisungs_zuweisungen).selectinload(UnterweisungsZuweisung.vorlage),
        )
        .where(Mitarbeiter.organisation_id == org_id)
        .order_by(Mitarbeiter.nachname, Mitarbeiter.vorname)
    )
    mitarbeiter_list = result.scalars().all()

    matrix_rows = []
    for m in mitarbeiter_list:
        # Build status for each vorlage
        vorlage_statuses = []
        total_zuweisungen = len(m.unterweisungs_zuweisungen)
        completed = 0

        for z in m.unterweisungs_zuweisungen:
            if z.status == "unterschrieben":
                status_color = "gruen"
                completed += 1
            elif z.faellig_am and z.faellig_am < date.today():
                status_color = "rot"
            elif z.status == "versendet":
                status_color = "gelb"
            else:
                status_color = "offen"

            vorlage_statuses.append(ComplianceVorlageStatus(
                vorlage_id=z.vorlage_id,
                vorlage_name=z.vorlage.name if z.vorlage else "—",
                status=status_color,
                unterschrieben_am=z.unterschrieben_am,
                faellig_am=z.faellig_am,
            ))

        gesamt_prozent = int((completed / total_zuweisungen * 100) if total_zuweisungen > 0 else 100)

        row = ComplianceMatrixRow(
            mitarbeiter_id=m.id,
            mitarbeiter_name=f"{m.vorname} {m.nachname}",
            abteilung=m.abteilung.name if m.abteilung else None,
            vorlagen=vorlage_statuses,
            gesamt_prozent=gesamt_prozent,
        )
        matrix_rows.append(row)

    return matrix_rows


# ============================================================================
# AI GENERATION
# ============================================================================

class AIGenerateRequest(BaseModel):
    thema: str = Field(..., min_length=1)
    context: Optional[str] = None


def _parse_ai_response_to_blocks(text: str) -> list:
    """Parse Claude's markdown-like response into EditorBlock format."""
    blocks = []
    lines = text.strip().split('\n')
    block_id = 0

    def next_id():
        nonlocal block_id
        block_id += 1
        return f"ai-{block_id}"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Heading 2: ## or ALL CAPS short line
        if stripped.startswith('## '):
            blocks.append({"id": next_id(), "type": "heading2", "content": stripped[3:].strip()})
        elif stripped.startswith('### '):
            blocks.append({"id": next_id(), "type": "heading3", "content": stripped[4:].strip()})
        elif stripped.startswith('# '):
            blocks.append({"id": next_id(), "type": "heading2", "content": stripped[2:].strip()})
        # Bullet
        elif re.match(r'^[-*•]\s', stripped):
            blocks.append({"id": next_id(), "type": "bullet", "content": re.sub(r'^[-*•]\s', '', stripped)})
        # Numbered list
        elif re.match(r'^\d+[.)]\s', stripped):
            blocks.append({"id": next_id(), "type": "numbered", "content": re.sub(r'^\d+[.)]\s*', '', stripped)})
        # Bold line as heading3
        elif stripped.startswith('**') and stripped.endswith('**') and len(stripped) > 4:
            blocks.append({"id": next_id(), "type": "heading3", "content": stripped[2:-2]})
        # Horizontal rule
        elif stripped in ('---', '***', '___'):
            blocks.append({"id": next_id(), "type": "divider", "content": ""})
        # Regular paragraph
        elif stripped:
            # Clean bold/italic markdown from paragraphs
            content = re.sub(r'\*\*(.+?)\*\*', r'\1', stripped)
            content = re.sub(r'\*(.+?)\*', r'\1', content)
            blocks.append({"id": next_id(), "type": "paragraph", "content": content})

    return blocks


@router.post("/ai-generate")
async def ai_generate(
    request: AIGenerateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Generate a training instruction draft using Claude AI."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="KI-Funktion nicht konfiguriert. Bitte ANTHROPIC_API_KEY in der .env Datei setzen."
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        system_prompt = """Du bist ein Experte für Arbeitssicherheit und betriebliche Unterweisungen in Deutschland.
Erstelle eine professionelle, praxisnahe Unterweisungsunterlage auf Deutsch.

Die Unterweisung soll:
- Den deutschen Arbeitsschutzgesetzen entsprechen (ArbSchG, DGUV, BGV etc.)
- Klar und verständlich formuliert sein
- Praktische Hinweise und Verhaltensregeln enthalten
- Mit ## für Hauptabschnitte strukturiert sein
- Bullet-Points für Regeln und Maßnahmen verwenden
- Einen Abschnitt "Rechtliche Grundlagen" enthalten
- Einen Abschnitt "Verhalten im Notfall" enthalten

Format: Verwende Markdown mit ##, ###, -, 1. etc. Kein HTML."""

        user_message = f"Erstelle eine Unterweisungsunterlage zum Thema: **{request.thema}**"
        if request.context and request.context.strip():
            user_message += f"\n\nFolgende betriebsspezifische Informationen und Unterlagen sollen berücksichtigt werden:\n\n{request.context[:8000]}"

        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}]
        )

        response_text = message.content[0].text
        blocks = _parse_ai_response_to_blocks(response_text)

        return {"blocks": blocks, "raw": response_text}

    except ImportError:
        raise HTTPException(status_code=500, detail="anthropic Paket nicht installiert. Bitte 'pip install anthropic' ausführen.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KI-Generierung fehlgeschlagen: {str(e)}")


@router.post("/extract-text")
async def extract_text(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Extract text from uploaded PDF, Word, or text files for use as AI context."""
    filename = (file.filename or "").lower()
    content = await file.read()

    extracted = ""

    try:
        if filename.endswith('.pdf'):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(content))
                pages = []
                for page in reader.pages[:20]:  # limit to 20 pages
                    text = page.extract_text()
                    if text:
                        pages.append(text)
                extracted = '\n\n'.join(pages)
            except ImportError:
                extracted = content.decode('utf-8', errors='ignore')
        elif filename.endswith(('.txt', '.md')):
            extracted = content.decode('utf-8', errors='ignore')
        elif filename.endswith(('.doc', '.docx')):
            # Simple fallback: try reading as text
            try:
                extracted = content.decode('utf-8', errors='ignore')
            except Exception:
                extracted = ""
        else:
            extracted = content.decode('utf-8', errors='ignore')

        # Clean up excessive whitespace
        extracted = re.sub(r'\n{3,}', '\n\n', extracted)
        extracted = extracted[:12000]  # limit context size

        return {"text": extracted, "filename": file.filename, "chars": len(extracted)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Lesen der Datei: {str(e)}")
