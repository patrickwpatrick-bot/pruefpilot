"""
Seed API — Create default checklisten templates for a new organisation
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.core.security import get_current_org_id, get_current_user_id
from app.models.checkliste import ChecklistenTemplate, ChecklistenPunkt
from app.models.unterweisung import UnterweisungsVorlage, UnterweisungsDurchfuehrung
from app.models.organisation import Organisation
from app.models.standort import Standort
from app.models.mitarbeiter import Mitarbeiter, Abteilung
from app.models.arbeitsmittel import Arbeitsmittel
from app.models.pruefung import Pruefung, PruefPunkt
from app.models.mangel import Mangel
from app.models.user import User
from app.models.gefaehrdungsbeurteilung import Gefaehrdungsbeurteilung, GBU_Gefaehrdung
from app.models.gefahrstoff import Gefahrstoff
from app.models.fremdfirma import Fremdfirma, FremdfirmaDokument
from datetime import datetime, timezone, timedelta, date
import uuid

router = APIRouter(prefix="/seed", tags=["Seed"])
TEMPLATES = [
    {
        "name": "Leiterprüfung",
        "norm": "DIN EN 131",
        "kategorie": "leiter",
        "punkte": [
            "Holme auf Risse und Verformungen prüfen",
            "Sprossen/Stufen auf festen Sitz prüfen",
            "Gelenke und Scharniere auf Funktion prüfen",
            "Rutschsichere Füße vorhanden und intakt",
            "Spreizsicherung funktionsfähig",
            "Keine fehlenden oder beschädigten Teile",
            "Aufkleber/Kennzeichnung lesbar",
            "Maximale Belastung erkennbar",
        ],
    },
    {
        "name": "Regalprüfung",
        "norm": "DIN EN 15635",
        "kategorie": "regal",
        "punkte": [
            "Regalständer auf Verformungen prüfen",
            "Fußplatten und Bodenbefestigung intakt",
            "Traverse korrekt eingehängt und gesichert",
            "Maximale Fachlast gekennzeichnet",
            "Keine Überladung erkennbar",
            "Anfahrschutz vorhanden und intakt",
            "Beschädigungen nach Ampel-System bewerten",
            "Regalinspektor-Plakette aktuell",
        ],
    },
    {
        "name": "Elektrogeräteprüfung",
        "norm": "DGUV Vorschrift 3",
        "kategorie": "elektro",
        "punkte": [
            "Sichtprüfung Gehäuse (Risse, Beschädigungen)",
            "Kabel und Stecker auf Beschädigungen prüfen",
            "Zugentlastung am Gerät intakt",
            "Schutzleiter-Widerstand messen",
            "Isolationswiderstand messen",
            "Schutzleiterstrom messen",
            "Funktionsprüfung durchführen",
            "Prüfplakette anbringen",
        ],
    },
    {
        "name": "Brandschutzprüfung",
        "norm": "ASR A2.2",
        "kategorie": "brandschutz",
        "punkte": [
            "Feuerlöscher zugänglich und sichtbar",
            "Prüfdatum Feuerlöscher aktuell",
            "Plombierung und Sicherungsstift intakt",
            "Manometer im grünen Bereich",
            "Flucht- und Rettungswege frei",
            "Brandschutztüren schließen selbsttätig",
            "Rauchmelder funktionsfähig",
            "Brandschutzbeschilderung vollständig",
        ],
    },
    {
        "name": "Allgemeine Sichtprüfung",
        "norm": None,
        "kategorie": "allgemein",
        "punkte": [
            "Allgemeinzustand des Arbeitsmittels",
            "Sicherheitseinrichtungen vorhanden und funktionsfähig",
            "Kennzeichnungen und Warnhinweise lesbar",
            "Keine sichtbaren Beschädigungen",
            "Standsicherheit gewährleistet",
            "Betriebsanleitung vorhanden",
        ],
    },
]

UNTERWEISUNGS_TEMPLATES = [
    {
        "name": "Allgemeine Sicherheitsunterweisung",
        "kategorie": "allgemein",
        "norm_referenz": "§ 12 ArbSchG",
        "intervall_monate": 12,
        "ist_pflicht_fuer_alle": True,
        "beschreibung": "Jährliche Pflichtunterweisung für alle Beschäftigten gemäß Arbeitsschutzgesetz",
        "inhalt": """<h2>Allgemeine Sicherheitsunterweisung gemäß § 12 ArbSchG</h2>

<h3>1. Allgemeine Pflichten</h3>
<p>Jeder Beschäftigte ist verpflichtet, nach seinen Möglichkeiten sowie gemäß der Unterweisung und Weisung des Arbeitgebers für seine Sicherheit und Gesundheit bei der Arbeit Sorge zu tragen. Dies gilt auch für die Sicherheit und Gesundheit der Personen, die von den Handlungen oder Unterlassungen bei der Arbeit betroffen sind.</p>

<h3>2. Verhalten im Notfall</h3>
<ul>
<li>Ruhe bewahren und Situation einschätzen</li>
<li>Notruf absetzen (intern: [Durchwahl], extern: 112)</li>
<li>Erste Hilfe leisten, soweit möglich</li>
<li>Sammelplatz aufsuchen bei Evakuierung</li>
<li>Flucht- und Rettungswege freihalten</li>
</ul>

<h3>3. Persönliche Schutzausrüstung (PSA)</h3>
<p>Die bereitgestellte PSA ist bestimmungsgemäß zu verwenden. Mängel sind unverzüglich dem Vorgesetzten zu melden. Die PSA ist pfleglich zu behandeln und regelmäßig auf ihren ordnungsgemäßen Zustand zu prüfen.</p>

<h3>4. Meldepflichten</h3>
<p>Folgende Situationen sind unverzüglich zu melden:</p>
<ul>
<li>Arbeitsunfälle (auch Beinahe-Unfälle)</li>
<li>Defekte an Maschinen und Arbeitsmitteln</li>
<li>Fehlende oder beschädigte Sicherheitseinrichtungen</li>
<li>Gefahrstoffe außerhalb vorgesehener Bereiche</li>
</ul>

<h3>5. Ordnung und Sauberkeit</h3>
<p>Arbeitsplätze sind sauber und ordentlich zu halten. Stolperstellen, verschüttete Flüssigkeiten und herumliegende Gegenstände sind unverzüglich zu beseitigen.</p>""",
    },
    {
        "name": "Persönliche Schutzausrüstung (PSA)",
        "kategorie": "psa",
        "norm_referenz": "PSA-BV, DGUV Regel 112-189",
        "intervall_monate": 12,
        "ist_pflicht_fuer_alle": True,
        "beschreibung": "Unterweisung zum korrekten Umgang mit persönlicher Schutzausrüstung",
        "inhalt": """<h2>Unterweisung: Persönliche Schutzausrüstung (PSA)</h2>
<p>Rechtsgrundlage: PSA-Benutzungsverordnung (PSA-BV), DGUV Regel 112-189</p>

<h3>1. Arten der PSA</h3>
<ul>
<li><strong>Kopfschutz:</strong> Schutzhelme nach DIN EN 397</li>
<li><strong>Augenschutz:</strong> Schutzbrillen nach DIN EN 166</li>
<li><strong>Gehörschutz:</strong> Gehörschutzstöpsel oder Kapselgehörschutz nach DIN EN 352</li>
<li><strong>Handschutz:</strong> Schutzhandschuhe je nach Gefährdung (mechanisch, chemisch, thermisch)</li>
<li><strong>Fußschutz:</strong> Sicherheitsschuhe S1-S5 nach DIN EN ISO 20345</li>
<li><strong>Atemschutz:</strong> Filtermasken FFP1-FFP3 oder Atemschutzgeräte</li>
</ul>

<h3>2. Pflichten des Beschäftigten</h3>
<p>Die bereitgestellte PSA muss bestimmungsgemäß verwendet werden. Vor jedem Gebrauch ist eine Sichtprüfung durchzuführen. Beschädigungen sind sofort zu melden.</p>

<h3>3. Pflege und Aufbewahrung</h3>
<p>PSA ist nach den Herstellerangaben zu reinigen und aufzubewahren. Verbrauchsmaterialien (z.B. Filter) sind rechtzeitig zu ersetzen. Die Aufbewahrung erfolgt an den dafür vorgesehenen Stellen.</p>

<h3>4. Tragekomfort und Passform</h3>
<p>PSA muss passen und darf die Arbeit nicht unnötig behindern. Bei Problemen mit der Passform ist der Vorgesetzte zu informieren.</p>""",
    },
    {
        "name": "Brandschutzunterweisung",
        "kategorie": "brandschutz",
        "norm_referenz": "ASR A2.2, ArbSchG § 10",
        "intervall_monate": 12,
        "ist_pflicht_fuer_alle": True,
        "beschreibung": "Jährliche Brandschutzunterweisung für alle Beschäftigten",
        "inhalt": """<h2>Brandschutzunterweisung gemäß ASR A2.2</h2>

<h3>1. Brandverhütung</h3>
<ul>
<li>Rauchverbot in allen Gebäuden beachten (ausgenommen gekennzeichnete Bereiche)</li>
<li>Elektrische Geräte nach Gebrauch ausschalten</li>
<li>Brennbare Materialien nicht in der Nähe von Wärmequellen lagern</li>
<li>Brandschutztüren niemals verkeilen oder blockieren</li>
</ul>

<h3>2. Verhalten im Brandfall</h3>
<ol>
<li><strong>Brand melden:</strong> Feuermelder betätigen oder Notruf 112</li>
<li><strong>In Sicherheit bringen:</strong> Gefährdete Personen warnen, Bereich verlassen</li>
<li><strong>Löschversuch:</strong> Nur bei kleinen, beherrschbaren Bränden mit Feuerlöscher</li>
</ol>

<h3>3. Feuerlöscher-Bedienung (PASS-Methode)</h3>
<ul>
<li><strong>P</strong>ull – Sicherungsstift ziehen</li>
<li><strong>A</strong>im – Auf Brandherd zielen (Basis der Flammen)</li>
<li><strong>S</strong>queeze – Hebel drücken</li>
<li><strong>S</strong>weep – Schwenkende Bewegungen</li>
</ul>

<h3>4. Flucht- und Rettungswege</h3>
<p>Flucht- und Rettungswege sind stets freizuhalten. Sammelplatz: [siehe Aushang]. Bei Evakuierung: Aufzüge NICHT benutzen, Gebäude zügig über Treppenhäuser verlassen.</p>""",
    },
    {
        "name": "Gabelstaplerunterweisung",
        "kategorie": "maschinen",
        "norm_referenz": "DGUV Vorschrift 68",
        "intervall_monate": 12,
        "ist_pflicht_fuer_alle": False,
        "betroffene_qualifikationen": "staplerschein",
        "beschreibung": "Jährliche Unterweisung für Gabelstaplerfahrer nach DGUV Vorschrift 68",
        "inhalt": """<h2>Gabelstaplerunterweisung nach DGUV Vorschrift 68</h2>
<p>Diese Unterweisung richtet sich ausschließlich an Personen mit gültigem Staplerschein (Fahrausweis nach DGUV Grundsatz 308-001).</p>

<h3>1. Voraussetzungen zum Führen</h3>
<ul>
<li>Gültiger Fahrausweis (Staplerschein)</li>
<li>Schriftliche Beauftragung durch den Arbeitgeber</li>
<li>Körperliche und geistige Eignung</li>
<li>Jährliche Unterweisung nachgewiesen</li>
</ul>

<h3>2. Tägliche Einsatzprüfung</h3>
<p>Vor jedem Einsatz: Sichtprüfung auf Beschädigungen, Reifenzustand, Hydraulik (Leckagen), Gabelzinken (Risse, Verformung), Beleuchtung, Hupe, Bremsen, Lenkung.</p>

<h3>3. Sicheres Fahren</h3>
<ul>
<li>Angepasste Geschwindigkeit (Schrittgeschwindigkeit in Gebäuden)</li>
<li>Last immer in Bodennähe transportieren (max. 20 cm)</li>
<li>Rückwärtsfahrt bei eingeschränkter Sicht nach vorne</li>
<li>An Kreuzungen: Hupen, Schritttempo, Spiegel beachten</li>
<li>Keine Personen auf der Gabel oder dem Hubgerüst befördern</li>
<li>Niemals unter angehobener Last stehen oder durchgehen</li>
</ul>

<h3>4. Laden und Abstellen</h3>
<p>Beim Verlassen: Gabel vollständig absenken, Feststellbremse anziehen, Motor abstellen, Schlüssel abziehen. Stapler nur auf ebenen, tragfähigen Flächen abstellen.</p>""",
    },
    {
        "name": "Kranunterweisung",
        "kategorie": "maschinen",
        "norm_referenz": "DGUV Vorschrift 52",
        "intervall_monate": 12,
        "ist_pflicht_fuer_alle": False,
        "betroffene_qualifikationen": "kranschein",
        "beschreibung": "Jährliche Unterweisung für Kranführer nach DGUV Vorschrift 52",
        "inhalt": """<h2>Kranunterweisung nach DGUV Vorschrift 52</h2>
<p>Diese Unterweisung gilt für alle Personen, die Krane bedienen (Brückenkrane, Portalkrane, Schwenkkrane).</p>

<h3>1. Voraussetzungen</h3>
<ul>
<li>Mindestalter 18 Jahre</li>
<li>Körperliche Eignung (Seh- und Hörvermögen)</li>
<li>Ausbildung zum Kranführer nachgewiesen</li>
<li>Schriftliche Beauftragung durch den Unternehmer</li>
</ul>

<h3>2. Vor Arbeitsbeginn</h3>
<p>Sichtprüfung: Seile, Ketten, Haken, Bremsen, Not-Aus. Probehub ohne Last durchführen. Tragfähigkeit und Lastdiagramm beachten.</p>

<h3>3. Während des Betriebs</h3>
<ul>
<li>Maximale Tragfähigkeit niemals überschreiten</li>
<li>Lasten nicht über Personen schwenken</li>
<li>Schrägzug ist verboten</li>
<li>Anschlagmittel richtig wählen und verwenden</li>
<li>Handzeichen des Anschlägers beachten</li>
<li>Bei Wind über 6 Beaufort: Kranbetrieb einstellen</li>
</ul>

<h3>4. Nach Arbeitsende</h3>
<p>Kran in Ruhestellung bringen, Haken hochfahren, Steuerung auf Null, Hauptschalter ausschalten.</p>""",
    },
    {
        "name": "Erste-Hilfe-Unterweisung",
        "kategorie": "erste_hilfe",
        "norm_referenz": "DGUV Vorschrift 1, § 26",
        "intervall_monate": 24,
        "ist_pflicht_fuer_alle": True,
        "beschreibung": "Unterweisung zur Ersten Hilfe im Betrieb",
        "inhalt": """<h2>Erste-Hilfe-Unterweisung nach DGUV Vorschrift 1</h2>

<h3>1. Ersthelfer im Betrieb</h3>
<p>In Betrieben mit mehr als 20 Beschäftigten müssen mindestens 10% der Belegschaft als Ersthelfer ausgebildet sein. Die Ausbildung umfasst 9 Unterrichtseinheiten, Auffrischung alle 2 Jahre.</p>

<h3>2. Rettungskette</h3>
<ol>
<li>Absichern der Unfallstelle</li>
<li>Notruf absetzen (112) – Wer? Was? Wo? Wie viele? Welche Verletzungen?</li>
<li>Erste Hilfe leisten</li>
<li>Rettungsdienst einweisen</li>
</ol>

<h3>3. Wichtige Sofortmaßnahmen</h3>
<ul>
<li>Bewusstlose Person: Stabile Seitenlage</li>
<li>Atemstillstand: Herzdruckmassage (30:2) und AED einsetzen</li>
<li>Starke Blutung: Druckverband anlegen</li>
<li>Schock: Beine hochlagern, Wärmeerhalt</li>
<li>Verbrennungen: Mit Wasser kühlen (max. 20 Min.)</li>
</ul>

<h3>4. Standorte Erste-Hilfe-Material</h3>
<p>Verbandkästen befinden sich an den gekennzeichneten Stellen (grünes Kreuz). AED-Standorte sind mit dem Herzsymbol gekennzeichnet. Jeder Unfall ist im Verbandbuch zu dokumentieren.</p>""",
    },
    {
        "name": "Gefahrstoffunterweisung",
        "kategorie": "gefahrstoffe",
        "norm_referenz": "GefStoffV §14, TRGS 555",
        "intervall_monate": 12,
        "ist_pflicht_fuer_alle": False,
        "betroffene_qualifikationen": "gefahrstoffe",
        "beschreibung": "Unterweisung zum sicheren Umgang mit Gefahrstoffen",
        "inhalt": """<h2>Gefahrstoffunterweisung nach GefStoffV § 14</h2>

<h3>1. GHS-Kennzeichnung verstehen</h3>
<p>Alle Gefahrstoffe sind mit GHS-Piktogrammen, Signalwörtern (Gefahr/Achtung) und H-/P-Sätzen gekennzeichnet. Vor der Verwendung stets das Etikett und das Sicherheitsdatenblatt (SDB) lesen.</p>

<h3>2. Wichtige GHS-Piktogramme</h3>
<ul>
<li>GHS01 – Explodierende Bombe: Explosionsgefahr</li>
<li>GHS02 – Flamme: Entzündbar</li>
<li>GHS05 – Ätzwirkung: Korrosiv</li>
<li>GHS06 – Totenkopf: Akute Toxizität</li>
<li>GHS07 – Ausrufezeichen: Reizend</li>
<li>GHS08 – Gesundheitsgefahr: Krebserzeugend/Organschäden</li>
<li>GHS09 – Umwelt: Gewässergefährdend</li>
</ul>

<h3>3. Schutzmaßnahmen</h3>
<ul>
<li>Gefahrstoffe nur in gekennzeichneten Originalbehältern aufbewahren</li>
<li>PSA gemäß Betriebsanweisung tragen</li>
<li>Gefahrstoffe nicht in Lebensmittelbehälter umfüllen</li>
<li>Nach Umgang: Hände gründlich waschen</li>
<li>Am Arbeitsplatz nicht essen, trinken oder rauchen</li>
</ul>

<h3>4. Verhalten bei Unfällen mit Gefahrstoffen</h3>
<p>Kontaminierte Kleidung sofort ausziehen. Betroffene Hautstellen mit viel Wasser spülen. Bei Augenkontakt: Mindestens 15 Minuten spülen. Bei Verschlucken: Kein Erbrechen auslösen, Arzt aufsuchen. Notruf 112 bei schweren Fällen.</p>""",
    },
    {
        "name": "Bildschirmarbeitsplatz-Unterweisung",
        "kategorie": "ergonomie",
        "norm_referenz": "ArbStättV Anhang 6, DGUV Information 215-410",
        "intervall_monate": 24,
        "ist_pflicht_fuer_alle": False,
        "betroffene_qualifikationen": "buero",
        "beschreibung": "Unterweisung für Beschäftigte an Bildschirmarbeitsplätzen",
        "inhalt": """<h2>Bildschirmarbeitsplatz-Unterweisung</h2>
<p>Rechtsgrundlage: ArbStättV Anhang Nr. 6, DGUV Information 215-410</p>

<h3>1. Ergonomische Einrichtung</h3>
<ul>
<li>Bildschirm: Oberkante auf Augenhöhe, Abstand 50-70 cm</li>
<li>Tastatur: Flach, 10-15 cm Abstand zur Tischkante</li>
<li>Stuhl: Sitzhöhe so, dass Oberschenkel waagerecht, Füße flach auf dem Boden</li>
<li>Beleuchtung: 500 Lux, Bildschirm seitlich zum Fenster</li>
</ul>

<h3>2. Pausenregelung</h3>
<p>Nach 50 Minuten Bildschirmarbeit: Mindestens 5-10 Minuten Bildschirmpause oder Mischarbeit. Regelmäßig aufstehen und bewegen.</p>

<h3>3. Augengesundheit</h3>
<p>Beschäftigte haben Anspruch auf arbeitsmedizinische Vorsorge (Sehtest) gemäß ArbMedVV. Die 20-20-20-Regel: Alle 20 Minuten für 20 Sekunden auf einen Punkt in 20 Fuß (6 m) Entfernung schauen.</p>

<h3>4. Beschwerdeprävention</h3>
<p>Regelmäßige Ausgleichsübungen für Nacken, Schultern und Handgelenke durchführen. Bei anhaltenden Beschwerden den Betriebsarzt konsultieren.</p>""",
    },
]

@router.post("/default-checklisten")
async def seed_default_checklisten(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create default checklist templates for the organisation."""
    # Check if already seeded
    result = await db.execute(
        select(ChecklistenTemplate).where(
            ChecklistenTemplate.organisation_id == org_id
        )
    )
    existing = result.scalars().all()
    if len(existing) >= len(TEMPLATES):
        return {"message": "Default-Checklisten bereits vorhanden", "count": len(existing)}

    created = 0
    existing_names = {t.name for t in existing}

    for tmpl in TEMPLATES:
        if tmpl["name"] in existing_names:
            continue

        template = ChecklistenTemplate(
            organisation_id=org_id,
            name=tmpl["name"],
            norm=tmpl["norm"],
            kategorie=tmpl["kategorie"],
        )
        db.add(template)
        await db.flush()

        for i, text in enumerate(tmpl["punkte"]):
            punkt = ChecklistenPunkt(
                template_id=template.id,
                text=text,
                reihenfolge=i,
                ist_pflicht=True,
            )
            db.add(punkt)

        created += 1

    await db.flush()
    return {"message": f"{created} Checklisten erstellt", "count": created}

@router.post("/default-unterweisungen")
async def seed_default_unterweisungen(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create default training templates for the organisation."""
    result = await db.execute(
        select(UnterweisungsVorlage).where(
            UnterweisungsVorlage.organisation_id == org_id
        )
    )
    existing = result.scalars().all()
    existing_names = {t.name for t in existing}

    created = 0
    for tmpl in UNTERWEISUNGS_TEMPLATES:
        if tmpl["name"] in existing_names:
            continue
        vorlage = UnterweisungsVorlage(
            organisation_id=org_id,
            name=tmpl["name"],
            kategorie=tmpl["kategorie"],
            norm_referenz=tmpl.get("norm_referenz"),
            intervall_monate=tmpl["intervall_monate"],
            ist_pflicht_fuer_alle=tmpl.get("ist_pflicht_fuer_alle", False),
            betroffene_qualifikationen=tmpl.get("betroffene_qualifikationen"),
            beschreibung=tmpl["beschreibung"],
            inhalt=tmpl["inhalt"],
            ist_system_template=False,  # org-specific copies
        )
        db.add(vorlage)
        created += 1

    await db.flush()
    return {"message": f"{created} Unterweisungsvorlagen erstellt", "count": created}

# Branchenspezifische Checklisten-Templates
BRANCHEN_TEMPLATES = {
    "maschinenbau": [
        {
            "name": "CNC-Maschinen Prüfung",
            "norm": "BetrSichV",
            "kategorie": "maschinen",
            "punkte": [
                "Not-Aus-Schalter funktionsfähig",
                "Schutzverkleidung geschlossen und intakt",
                "Kühlmittelstand und -qualität prüfen",
                "Spindel auf Rundlauf prüfen",
                "Werkzeugspannung prüfen",
                "Hydraulikanlage auf Leckagen prüfen",
                "Sicherheitslichtschranken testen",
                "Betriebsanleitung am Arbeitsplatz vorhanden",
            ],
        },
        {
            "name": "Schweißgeräte-Prüfung",
            "norm": "DGUV Vorschrift 3",
            "kategorie": "maschinen",
            "punkte": [
                "Kabel und Anschlüsse auf Beschädigungen prüfen",
                "Schweißbrenner und Düsen intakt",
                "Gasflaschen gesichert aufgestellt",
                "Druckminderer funktionsfähig",
                "Absaugung am Arbeitsplatz funktioniert",
                "Schutzausrüstung vollständig vorhanden",
                "Prüfplakette aktuell",
            ],
        },
    ],
    "baugewerbe": [
        {
            "name": "Gerüstprüfung",
            "norm": "TRBS 2121",
            "kategorie": "gerüst",
            "punkte": [
                "Standsicherheit des Gerüsts prüfen",
                "Verankerungen kontrollieren",
                "Belag vollständig und tragfähig",
                "Seitenschutz komplett (Geländer, Knieleiste, Bordbrett)",
                "Aufstieg sicher und zugänglich",
                "Kennzeichnung und Freigabe vorhanden",
                "Keine Überladung erkennbar",
                "Abstand zur Fassade max. 30 cm",
            ],
        },
        {
            "name": "Baustellensicherheit",
            "norm": "BaustellV",
            "kategorie": "baustelle",
            "punkte": [
                "Bauzaun / Absperrung vollständig",
                "Zufahrt und Rettungswege frei",
                "Erste-Hilfe-Material vorhanden",
                "Sozialräume vorhanden und sauber",
                "Elektroanschlüsse ordnungsgemäß",
                "SiGe-Plan auf der Baustelle vorhanden",
                "Unterweisung aller Gewerke dokumentiert",
            ],
        },
    ],
    "logistik": [
        {
            "name": "Gabelstapler-Tagesprüfung",
            "norm": "DGUV Vorschrift 68",
            "kategorie": "stapler",
            "punkte": [
                "Reifenzustand prüfen",
                "Hydraulik auf Leckagen prüfen",
                "Gabelzinken auf Risse und Verformung",
                "Beleuchtung und Hupe funktionsfähig",
                "Bremsen prüfen",
                "Lenkung gängig und spielfrei",
                "Sicherheitsgurt vorhanden",
                "Batterie-/Tankstand ausreichend",
            ],
        },
    ],
    "gastronomie": [
        {
            "name": "Küchengeräte-Prüfung",
            "norm": "BetrSichV",
            "kategorie": "allgemein",
            "punkte": [
                "Elektrogeräte auf Beschädigungen prüfen",
                "Gasanschlüsse dicht",
                "Schneidemaschine Schutzvorrichtung intakt",
                "Fritteuse: Thermostat funktioniert",
                "Kühltemperaturen im Sollbereich",
                "Lüftungsanlage funktionsfähig",
                "Fettfilter sauber",
            ],
        },
    ],
    "gesundheitswesen": [
        {
            "name": "Medizingeräte-Prüfung",
            "norm": "MPBetreibV",
            "kategorie": "allgemein",
            "punkte": [
                "Sichtprüfung Gehäuse und Kabel",
                "Funktionsprüfung durchführen",
                "Kalibrierung aktuell",
                "Sicherheitstechnische Kontrolle (STK) Termin",
                "Messtechnische Kontrolle (MTK) Termin",
                "Medizinproduktebuch geführt",
                "Bestandsverzeichnis aktuell",
            ],
        },
    ],
}

@router.post("/branchen-checklisten")
async def seed_branchen_checklisten(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create branch-specific checklist templates based on organisation's branche."""
    # Get organisation branche
    result = await db.execute(
        select(Organisation).where(Organisation.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org or not org.branche:
        return {"message": "Keine Branche gesetzt", "count": 0}

    templates = BRANCHEN_TEMPLATES.get(org.branche, [])
    if not templates:
        return {"message": f"Keine branchenspezifischen Checklisten für '{org.branche}'", "count": 0}

    # Check existing
    result = await db.execute(
        select(ChecklistenTemplate).where(
            ChecklistenTemplate.organisation_id == org_id
        )
    )
    existing_names = {t.name for t in result.scalars().all()}

    created = 0
    for tmpl in templates:
        if tmpl["name"] in existing_names:
            continue
        template = ChecklistenTemplate(
            organisation_id=org_id,
            name=tmpl["name"],
            norm=tmpl["norm"],
            kategorie=tmpl["kategorie"],
        )
        db.add(template)
        await db.flush()
        for i, text in enumerate(tmpl["punkte"]):
            punkt = ChecklistenPunkt(
                template_id=template.id,
                text=text,
                reihenfolge=i,
                ist_pflicht=True,
            )
            db.add(punkt)
        created += 1

    await db.flush()
    return {"message": f"{created} branchenspezifische Checklisten erstellt", "count": created}

# =============================================================================
# OPTIMIZED SINGLE DEMO-DATEN ENDPOINT (Vercel Serverless-kompatibel)
# =============================================================================

@router.post("/demo-daten")
async def seed_demo_data(
    org_id: uuid.UUID = Depends(get_current_org_id),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create comprehensive demo data in a single optimized batch.
    Pre-generates all UUIDs and uses single batch insert + one commit.
    """
    import json as _json
    import traceback as _tb
    from random import randint

    try:
        return await _seed_demo_data_impl(org_id, user_id, db)
    except Exception as exc:
        await db.rollback()
        return {"error": str(exc), "traceback": _tb.format_exc()}


async def _seed_demo_data_impl(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
):
    import json as _json
    from random import randint

    # =========================================================================
    # FETCH AND UPDATE ORGANISATION
    # =========================================================================
    org_result = await db.execute(
        select(Organisation).where(Organisation.id == org_id)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        return {"error": "Organisation nicht gefunden"}

    org.branche = "maschinenbau"
    org.name = "PrüfPilot Demo GmbH"
    org.strasse = "Industriestraße 42"
    org.plz = "70565"
    org.ort = "Stuttgart-Vaihingen"
    org.telefon = "+49 711 98765-0"
    org.email = "info@pruefpilot.de"
    org.verantwortlicher_name = "Dipl.-Ing. Markus Weber"
    org.verantwortlicher_email = "m.weber@pruefpilot.de"
    org.verantwortlicher_telefon = "+49 711 98765-10"
    org.berufe_config = _json.dumps([
        "Werkstattleiter", "CNC-Fräser", "CNC-Dreher", "Industriemechaniker",
        "Zerspanungsmechaniker", "Schweißer", "Schlosser", "Elektriker",
        "Instandhalter", "Qualitätsprüfer", "Meister", "Produktionshelfer",
        "Lagerist", "Konstrukteur", "Sicherheitsbeauftragter", "Betriebsleiter",
        "Auszubildender", "Arbeitsvorbereiter",
    ])

    # =========================================================================
    # PRE-GENERATE ALL UUIDS
    # =========================================================================
    now = datetime.now(timezone.utc)

    # Standorte
    standorte_data = [
        {
            "id": uuid.uuid4(),
            "name": "Hauptwerk Stuttgart",
            "strasse": "Industriestraße",
            "hausnummer": "42",
            "plz": "70565",
            "ort": "Stuttgart",
            "gebaeude": "Halle A",
        },
        {
            "id": uuid.uuid4(),
            "name": "Außenlager Nord",
            "strasse": "Hafenweg",
            "hausnummer": "8",
            "plz": "70327",
            "ort": "Stuttgart",
        },
        {
            "id": uuid.uuid4(),
            "name": "Bürogebäude Mitte",
            "strasse": "Königstraße",
            "hausnummer": "15",
            "plz": "70173",
            "ort": "Stuttgart",
        },
    ]

    # Abteilungen
    abteilungen_data = [
        {"id": uuid.uuid4(), "name": "Produktion"},
        {"id": uuid.uuid4(), "name": "Verwaltung"},
        {"id": uuid.uuid4(), "name": "Lager & Logistik"},
    ]

    # Mitarbeiter
    mitarbeiter_data = [
        # Produktion
        {"id": uuid.uuid4(), "vorname": "Thomas", "nachname": "Müller", "beruf": "Werkstattleiter", "abteilung": "Produktion", "qualifikationen": ["kranschein", "ersthelfer"]},
        {"id": uuid.uuid4(), "vorname": "Sandra", "nachname": "Weber", "beruf": "Sicherheitsbeauftragte", "abteilung": "Produktion", "qualifikationen": ["ersthelfer"]},
        {"id": uuid.uuid4(), "vorname": "Michael", "nachname": "Schmidt", "beruf": "Elektriker", "abteilung": "Produktion", "qualifikationen": ["hochspannungsschein"]},
        {"id": uuid.uuid4(), "vorname": "Lisa", "nachname": "Hoffmann", "beruf": "Meister", "abteilung": "Produktion", "qualifikationen": ["meisterschein"]},
        {"id": uuid.uuid4(), "vorname": "Klaus", "nachname": "Hoffmann", "beruf": "CNC-Fräser", "abteilung": "Produktion", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Petra", "nachname": "Lang", "beruf": "CNC-Dreher", "abteilung": "Produktion", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Martin", "nachname": "Bauer", "beruf": "Schweißer", "abteilung": "Produktion", "qualifikationen": ["schweisserschein"]},
        {"id": uuid.uuid4(), "vorname": "Brigitte", "nachname": "Schäfer", "beruf": "Schlosser", "abteilung": "Produktion", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Wolfgang", "nachname": "Keller", "beruf": "Instandhalter", "abteilung": "Produktion", "qualifikationen": []},
        # Verwaltung
        {"id": uuid.uuid4(), "vorname": "Markus", "nachname": "Richter", "beruf": "Betriebsleiter", "abteilung": "Verwaltung", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Anna", "nachname": "Fischer", "beruf": "Qualitätsprüferin", "abteilung": "Verwaltung", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Christian", "nachname": "Neumann", "beruf": "Arbeitsvorbereiter", "abteilung": "Verwaltung", "qualifikationen": []},
        # Lager & Logistik
        {"id": uuid.uuid4(), "vorname": "Andreas", "nachname": "Koch", "beruf": "Lagerist", "abteilung": "Lager & Logistik", "qualifikationen": ["staplerschein"]},
        {"id": uuid.uuid4(), "vorname": "Julia", "nachname": "Bauer", "beruf": "Auszubildende", "abteilung": "Lager & Logistik", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Rolf", "nachname": "Zeller", "beruf": "Produktionshelfer", "abteilung": "Lager & Logistik", "qualifikationen": []},
        {"id": uuid.uuid4(), "vorname": "Carla", "nachname": "Görz", "beruf": "Lagermeister", "abteilung": "Lager & Logistik", "qualifikationen": ["staplerschein", "kranschein"]},
        {"id": uuid.uuid4(), "vorname": "Daniel", "nachname": "Wagner", "beruf": "Sicherheitsbeauftragter", "abteilung": "Lager & Logistik", "qualifikationen": ["ersthelfer"]},
        {"id": uuid.uuid4(), "vorname": "Stefanie", "nachname": "Meyer", "beruf": "Konstrukteur", "abteilung": "Verwaltung", "qualifikationen": []},
    ]

    # Users
    demo_pruefer_id = uuid.uuid4()
    demo_admin_id = uuid.uuid4()

    # Arbeitsmittel
    arbeitsmittel_data = [
        {"id": uuid.uuid4(), "name": "Brückenkran 5t", "typ": "kran", "hersteller": "Demag", "baujahr": 2019, "standort": "Hauptwerk Stuttgart", "status": "gelb", "tage_bis_pruefung": 14, "norm": "DIN EN 60204-32"},
        {"id": uuid.uuid4(), "name": "Portalkran 10t", "typ": "kran", "hersteller": "Abus", "baujahr": 2020, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 150, "norm": "DIN EN 60204-32"},
        {"id": uuid.uuid4(), "name": "Hydraulikpresse HP-200", "typ": "presse", "hersteller": "Schuler", "baujahr": 2018, "standort": "Hauptwerk Stuttgart", "status": "rot", "tage_bis_pruefung": -15, "norm": "BetrSichV"},
        {"id": uuid.uuid4(), "name": "Exzenterpresse EP-100", "typ": "presse", "hersteller": "Müller", "baujahr": 2021, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 200, "norm": "BetrSichV"},
        {"id": uuid.uuid4(), "name": "Drehbank DMG Mori CTX 310", "typ": "drehmaschine", "hersteller": "DMG Mori", "baujahr": 2021, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 120, "norm": "BetrSichV"},
        {"id": uuid.uuid4(), "name": "Drehmaschine Emco", "typ": "drehmaschine", "hersteller": "Emco", "baujahr": 2019, "standort": "Hauptwerk Stuttgart", "status": "gelb", "tage_bis_pruefung": 30, "norm": "BetrSichV"},
        {"id": uuid.uuid4(), "name": "Gabelstapler Linde H30", "typ": "stapler", "hersteller": "Linde", "baujahr": 2018, "standort": "Außenlager Nord", "status": "gelb", "tage_bis_pruefung": 25, "norm": "DGUV V68"},
        {"id": uuid.uuid4(), "name": "Stapler Still RX70", "typ": "stapler", "hersteller": "Still", "baujahr": 2022, "standort": "Außenlager Nord", "status": "gruen", "tage_bis_pruefung": 180, "norm": "DGUV V68"},
        {"id": uuid.uuid4(), "name": "Schweißgerät Fronius 400i", "typ": "schweissgeraet", "hersteller": "Fronius", "baujahr": 2022, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 220, "norm": "DGUV V3"},
        {"id": uuid.uuid4(), "name": "Alu-Stehleiter 3m", "typ": "leiter", "hersteller": "Zarges", "baujahr": 2021, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 90, "norm": "DIN EN 131"},
        {"id": uuid.uuid4(), "name": "Anlegeleiter 4,5m", "typ": "leiter", "hersteller": "Hymer", "baujahr": 2020, "standort": "Hauptwerk Stuttgart", "status": "orange", "tage_bis_pruefung": 7, "norm": "DIN EN 131"},
        {"id": uuid.uuid4(), "name": "Palettenregal Fachbodenregal R1", "typ": "regal", "hersteller": "META", "baujahr": 2020, "standort": "Außenlager Nord", "status": "gruen", "tage_bis_pruefung": 160, "norm": "DIN EN 15635"},
        {"id": uuid.uuid4(), "name": "Fachbodenregal Metall", "typ": "regal", "hersteller": "Schulte", "baujahr": 2019, "standort": "Außenlager Nord", "status": "orange", "tage_bis_pruefung": 10, "norm": "DIN EN 15635"},
        {"id": uuid.uuid4(), "name": "Bandschleifer BSM 150", "typ": "schleifmaschine", "hersteller": "Metabo", "baujahr": 2023, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 140, "norm": "DGUV V3"},
        {"id": uuid.uuid4(), "name": "Kompressor Atlas Copco", "typ": "kompressor", "hersteller": "Atlas Copco", "baujahr": 2017, "standort": "Hauptwerk Stuttgart", "status": "gelb", "tage_bis_pruefung": 20, "norm": "BetrSichV"},
        {"id": uuid.uuid4(), "name": "Feuerlöscher Set (5x)", "typ": "brandschutz", "hersteller": "Gloria", "baujahr": 2022, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 150, "norm": "EN 3"},
        {"id": uuid.uuid4(), "name": "Rauchmelder Set (10x)", "typ": "brandschutz", "hersteller": "Hekatron", "baujahr": 2021, "standort": "Bürogebäude Mitte", "status": "gruen", "tage_bis_pruefung": 100, "norm": "DIN 14604"},
        {"id": uuid.uuid4(), "name": "Erste-Hilfe-Kasten", "typ": "erste_hilfe", "hersteller": "Holthaus", "baujahr": 2022, "standort": "Hauptwerk Stuttgart", "status": "gruen", "tage_bis_pruefung": 120, "norm": "DIN 13157"},
    ]

    # =========================================================================
    # BUILD LOOKUP MAPS FROM PRE-GENERATED IDS
    # =========================================================================
    standorte_map = {s["name"]: s["id"] for s in standorte_data}
    abteilungen_map = {a["name"]: a["id"] for a in abteilungen_data}
    arbeitsmittel_map = {am["name"]: am["id"] for am in arbeitsmittel_data}

    # =========================================================================
    # CREATE ALL MODEL INSTANCES (NO FLUSHES)
    # =========================================================================
    objects_to_add = []

    # Add Standorte
    for s_data in standorte_data:
        standort = Standort(
            id=s_data["id"],
            organisation_id=org_id,
            name=s_data["name"],
            strasse=s_data["strasse"],
            hausnummer=s_data["hausnummer"],
            plz=s_data["plz"],
            ort=s_data["ort"],
            gebaeude=s_data.get("gebaeude"),
        )
        objects_to_add.append(standort)

    # Add Abteilungen
    for a_data in abteilungen_data:
        abteilung = Abteilung(
            id=a_data["id"],
            organisation_id=org_id,
            name=a_data["name"],
        )
        objects_to_add.append(abteilung)

    # Add Mitarbeiter
    mitarbeiter_objs = {}
    for m_data in mitarbeiter_data:
        mitarbeiter = Mitarbeiter(
            id=m_data["id"],
            organisation_id=org_id,
            abteilung_id=abteilungen_map[m_data["abteilung"]],
            vorname=m_data["vorname"],
            nachname=m_data["nachname"],
            beruf=m_data["beruf"],
            email=f"{m_data['vorname'].lower()}.{m_data['nachname'].lower()}@pruefpilot.de",
            ist_aktiv=True,
            typ="intern",
        )
        objects_to_add.append(mitarbeiter)
        mitarbeiter_objs[m_data["id"]] = (m_data, m_data["qualifikationen"])

    # Add Demo Users
    demo_pruefer = User(
        id=demo_pruefer_id,
        organisation_id=org_id,
        email="demo.pruefer@pruefpilot.de",
        hashed_password="$2b$12$dummy.hash.for.demo",
        vorname="Demo",
        nachname="Pruefer",
        rolle="pruefer",
        ist_aktiv=True,
    )
    objects_to_add.append(demo_pruefer)

    demo_admin = User(
        id=demo_admin_id,
        organisation_id=org_id,
        email="demo.admin@pruefpilot.de",
        hashed_password="$2b$12$dummy.hash.for.demo",
        vorname="Demo",
        nachname="Admin",
        rolle="admin",
        ist_aktiv=True,
    )
    objects_to_add.append(demo_admin)

    # Add Arbeitsmittel
    for am_data in arbeitsmittel_data:
        tage = am_data["tage_bis_pruefung"]
        naechste_pruefung = now + timedelta(days=tage)
        letzte_pruefung = naechste_pruefung - timedelta(days=365)

        arbeitsmittel = Arbeitsmittel(
            id=am_data["id"],
            organisation_id=org_id,
            standort_id=standorte_map[am_data["standort"]],
            name=am_data["name"],
            typ=am_data["typ"],
            hersteller=am_data["hersteller"],
            baujahr=am_data["baujahr"],
            norm=am_data.get("norm"),
            pruef_intervall_monate=12,
            ampel_status=am_data["status"],
            letzte_pruefung_am=letzte_pruefung.date(),
            naechste_pruefung_am=naechste_pruefung.date(),
        )
        objects_to_add.append(arbeitsmittel)

    # =========================================================================
    # CREATE CHECKLISTEN FROM PRUEFKATALOG_DE
    # =========================================================================
    from app.data.pruefkatalog_de import PRUEF_CHECKLISTEN, UNTERWEISUNGS_KATALOG

    created_templates = {}
    for i, kat_data in enumerate(PRUEF_CHECKLISTEN[:8]):
        template_id = uuid.uuid4()
        template = ChecklistenTemplate(
            id=template_id,
            organisation_id=org_id,
            name=kat_data["name"],
            norm=kat_data.get("norm"),
            kategorie=kat_data.get("kategorie"),
        )
        objects_to_add.append(template)
        created_templates[kat_data["name"]] = template_id

        for j, punkt_data in enumerate(kat_data.get("punkte", [])):
            if isinstance(punkt_data, dict):
                text = punkt_data.get("text", "")
                ist_pflicht = punkt_data.get("ist_pflicht", True)
            else:
                text = punkt_data
                ist_pflicht = True

            cp = ChecklistenPunkt(
                id=uuid.uuid4(),
                template_id=template_id,
                text=text,
                reihenfolge=j,
                ist_pflicht=ist_pflicht,
            )
            objects_to_add.append(cp)

    # =========================================================================
    # CREATE PRUEFUNGEN WITH VARIED STATUSES
    # =========================================================================
    pruefungen_objs = []
    arbeitsmittel_ids = list(arbeitsmittel_map.values())

    # Completed successfully (5)
    for i in range(min(5, len(arbeitsmittel_ids))):
        am_id = arbeitsmittel_ids[i]
        template_id = list(created_templates.values())[i % len(created_templates)]
        pruefung_id = uuid.uuid4()
        pruefung = Pruefung(
            id=pruefung_id,
            arbeitsmittel_id=am_id,
            checkliste_id=template_id,
            pruefer_id=demo_pruefer_id,
            status="abgeschlossen",
            ergebnis="bestanden",
            bemerkung="Erfolgreich geprüft.",
            ist_abgeschlossen=True,
            gestartet_am=now - timedelta(days=randint(10, 60)),
            abgeschlossen_am=now - timedelta(days=randint(5, 60)),
        )
        objects_to_add.append(pruefung)
        pruefungen_objs.append((pruefung_id, template_id))

    # Completed with defects (3)
    for i in range(min(3, len(arbeitsmittel_ids) - 5)):
        am_id = arbeitsmittel_ids[5 + i]
        template_id = list(created_templates.values())[i % len(created_templates)]
        pruefung_id = uuid.uuid4()
        pruefung = Pruefung(
            id=pruefung_id,
            arbeitsmittel_id=am_id,
            checkliste_id=template_id,
            pruefer_id=demo_pruefer_id,
            status="abgeschlossen",
            ergebnis="maengel",
            bemerkung="Mängel festgestellt.",
            ist_abgeschlossen=True,
            gestartet_am=now - timedelta(days=randint(60, 90)),
            abgeschlossen_am=now - timedelta(days=randint(55, 85)),
        )
        objects_to_add.append(pruefung)
        pruefungen_objs.append((pruefung_id, template_id))

    # In progress (2)
    for i in range(min(2, len(arbeitsmittel_ids) - 8)):
        am_id = arbeitsmittel_ids[8 + i]
        template_id = list(created_templates.values())[i % len(created_templates)]
        pruefung = Pruefung(
            id=uuid.uuid4(),
            arbeitsmittel_id=am_id,
            checkliste_id=template_id,
            pruefer_id=demo_pruefer_id,
            status="in_bearbeitung",
            ergebnis=None,
            bemerkung=None,
            ist_abgeschlossen=False,
            gestartet_am=now - timedelta(days=2),
        )
        objects_to_add.append(pruefung)

    # Planned (2)
    for i in range(min(2, len(arbeitsmittel_ids) - 10)):
        am_id = arbeitsmittel_ids[10 + i]
        template_id = list(created_templates.values())[i % len(created_templates)]
        pruefung = Pruefung(
            id=uuid.uuid4(),
            arbeitsmittel_id=am_id,
            checkliste_id=template_id,
            pruefer_id=demo_pruefer_id,
            status="entwurf",
            ergebnis=None,
            bemerkung=None,
            ist_abgeschlossen=False,
            gestartet_am=now + timedelta(days=randint(5, 30)),
        )
        objects_to_add.append(pruefung)

    # =========================================================================
    # CREATE PRUEF PUNKTE (from in-memory data, no DB query needed)
    # =========================================================================
    # Build a map of template_id -> list of ChecklistenPunkt IDs from objects_to_add
    template_punkte_map: dict[uuid.UUID, list[uuid.UUID]] = {}
    for obj in objects_to_add:
        if isinstance(obj, ChecklistenPunkt):
            tid = obj.template_id
            if tid not in template_punkte_map:
                template_punkte_map[tid] = []
            template_punkte_map[tid].append(obj.id)

    for pruefung_id, template_id in pruefungen_objs:
        check_point_ids = template_punkte_map.get(template_id, [])
        for j, cp_id in enumerate(check_point_ids):
            ergebnis = "ok"
            if j >= len(check_point_ids) - 2:
                ergebnis = "mangel"
            elif j % 5 == 0:
                ergebnis = "nicht_anwendbar"

            pp = PruefPunkt(
                id=uuid.uuid4(),
                pruefung_id=pruefung_id,
                checklisten_punkt_id=cp_id,
                ergebnis=ergebnis,
                geprueft_am=now.date() if ergebnis != "ok" else None,
            )
            objects_to_add.append(pp)

    # =========================================================================
    # CREATE MAENGEL
    # =========================================================================
    mangel_descriptions = [
        ("Hydraulikschlauch Leckage", "rot", "offen"),
        ("Sicherheitsabdeckung Riss", "orange", "in_bearbeitung"),
        ("Hupe defekt", "gruen", "offen"),
        ("Bremsflüssigkeit ersetzt", "gruen", "erledigt"),
        ("Beleuchtung defekt (1 Leuchte)", "orange", "in_bearbeitung"),
        ("Reifenprofil gering", "orange", "offen"),
        ("Verschleiß Gabelzinken", "gelb", "offen"),
        ("Flüssigkeitsverlust Hydraulik", "rot", "offen"),
    ]

    for i, (pruefung_id, _) in enumerate(pruefungen_objs[:8]):
        if i < len(mangel_descriptions):
            desc, severity, status = mangel_descriptions[i]
            mangel = Mangel(
                id=uuid.uuid4(),
                pruefung_id=pruefung_id,
                beschreibung=desc,
                schweregrad=severity,
                status=status,
                frist=now.date() + timedelta(days=randint(3, 30)) if status != "erledigt" else None,
                erledigt_am=now - timedelta(days=randint(1, 7)) if status == "erledigt" else None,
            )
            objects_to_add.append(mangel)

    # =========================================================================
    # CREATE UNTERWEISUNGS-VORLAGEN
    # =========================================================================
    def _generate_unterweisung_html(name: str, norm_referenz: str, beschreibung: str, stichpunkte: list) -> str:
        html = f"<h2>{name}</h2>"
        if norm_referenz:
            html += f"<p><strong>Rechtsgrundlage:</strong> {norm_referenz}</p>"
        if beschreibung:
            html += f"<p>{beschreibung}</p>"
        html += "<h3>Schulungsinhalte</h3><ul>"
        for punkt in stichpunkte:
            html += f"<li>{punkt}</li>"
        html += "</ul>"
        return html

    unterweisungs_vorlagen = {}
    for i, uv_data in enumerate(UNTERWEISUNGS_KATALOG[:5]):
        vorlage_id = uuid.uuid4()
        vorlage = UnterweisungsVorlage(
            id=vorlage_id,
            organisation_id=org_id,
            name=uv_data["name"],
            kategorie=uv_data.get("kategorie"),
            norm_referenz=uv_data.get("norm_referenz"),
            intervall_monate=uv_data.get("intervall_monate", 12),
            ist_pflicht_fuer_alle=uv_data.get("ist_pflicht_fuer_alle", False),
            betroffene_qualifikationen=uv_data.get("betroffene_qualifikationen"),
            beschreibung=uv_data.get("beschreibung"),
            inhalt=_generate_unterweisung_html(
                uv_data["name"],
                uv_data.get("norm_referenz"),
                uv_data.get("beschreibung"),
                uv_data.get("stichpunkte", [])
            ),
            ist_system_template=False,
        )
        objects_to_add.append(vorlage)
        unterweisungs_vorlagen[uv_data["name"]] = vorlage_id

    # =========================================================================
    # CREATE UNTERWEISUNGS-DURCHFUEHRUNGEN
    # =========================================================================
    for vorlage_name, vorlage_id in list(unterweisungs_vorlagen.items())[:3]:
        for j in range(4):
            mitarbeiter_ids = list(mitarbeiter_objs.keys())
            mit_id = mitarbeiter_ids[j % len(mitarbeiter_ids)]
            m_data, _ = mitarbeiter_objs[mit_id]
            voller_name = f"{m_data['vorname']} {m_data['nachname']}"

            df_date = now.date() - timedelta(days=randint(30, 180))
            naechste_date = df_date + timedelta(days=365)

            df = UnterweisungsDurchfuehrung(
                id=uuid.uuid4(),
                vorlage_id=vorlage_id,
                organisation_id=org_id,
                durchgefuehrt_von_id=demo_pruefer_id,
                teilnehmer_name=voller_name,
                teilnehmer_email=f"{m_data['vorname'].lower()}.{m_data['nachname'].lower()}@pruefpilot.de",
                datum=df_date,
                unterschrift_name=voller_name,
                naechste_unterweisung_am=naechste_date,
                bemerkung="Unterweisung erfolgreich durchgeführt und attestiert.",
            )
            objects_to_add.append(df)

    # =========================================================================
    # CREATE GEFAEHRDUNGSBEURTEILUNGEN
    # =========================================================================
    gbu_data = [
        {
            "titel": "Gefährdungsbeurteilung CNC-Arbeitsplatz",
            "arbeitsbereich": "CNC-Bereich Hauptwerk",
            "gefaehrdungen": [
                ("Gefahren durch bewegliche Maschinenteile", "hoch", "Schutzvorrichtungen, Notausschalter", "Installation Sicherheitslichtschranken"),
                ("Lärmbelastung", "mittel", "Gehörschutz", "Schallschutzwand installieren"),
            ],
        },
        {
            "titel": "Gefährdungsbeurteilung Lagerbereich",
            "arbeitsbereich": "Außenlager Nord",
            "gefaehrdungen": [
                ("Quetsch- und Fangstellen", "hoch", "Kennzeichnung, Warnschilder", "Schutzausrüstung PSA"),
                ("Rutsch- und Stolpergefahr", "mittel", "Ordnung und Reinigung", "Wartungsplan erstellen"),
            ],
        },
        {
            "titel": "Gefährdungsbeurteilung Schweißplatz",
            "arbeitsbereich": "Schweißwerkstatt",
            "gefaehrdungen": [
                ("Gefahr durch Schweißrauch und Gase", "hoch", "Absaugung, Atemschutz", "Absauganlage prüfen"),
                ("Verbrennungsgefahr", "mittel", "Schweißerschutz PSA", "Schulung auffrischen"),
            ],
        },
    ]

    for gbu_info in gbu_data:
        gbu_id = uuid.uuid4()
        gbu = Gefaehrdungsbeurteilung(
            id=gbu_id,
            organisation_id=org_id,
            erstellt_von_id=demo_admin_id,
            titel=gbu_info["titel"],
            arbeitsbereich=gbu_info["arbeitsbereich"],
            status="aktiv",
            datum=now.date() - timedelta(days=randint(60, 180)),
            naechste_ueberpruefung_am=now.date() + timedelta(days=365),
            bemerkung="Systematische Gefährdungsbeurteilung gemäß ArbSchG durchgeführt.",
        )
        objects_to_add.append(gbu)

        for gef_text, risikoklasse, bestehende, weitere in gbu_info["gefaehrdungen"]:
            gbu_gef = GBU_Gefaehrdung(
                id=uuid.uuid4(),
                gbu_id=gbu_id,
                gefaehrdung=gef_text,
                risikoklasse=risikoklasse,
                bestehende_massnahmen=bestehende,
                weitere_massnahmen=weitere,
                verantwortlich="Betriebsleiter",
                frist=now.date() + timedelta(days=randint(30, 90)),
                status="offen",
                reihenfolge=0,
            )
            objects_to_add.append(gbu_gef)

    # =========================================================================
    # CREATE GEFAHRSTOFFE
    # =========================================================================
    gefahrstoffe_data = [
        {
            "name": "Isopropanol 99,9% (Reinigungsmittel)",
            "hersteller": "Merck",
            "cas_nummer": "67-63-0",
            "gefahrenklasse": "Flüssigkeit und Dampf leicht entzündbar",
            "h_saetze": "H225, H319, H336",
            "p_saetze": "P210, P280, P305+P351+P338",
            "signalwort": "Achtung",
            "lagerort": "Chemikalienlagerschrank, Hauptwerk Halle A",
            "menge": "10 Liter",
        },
        {
            "name": "Kühlschmierstoff wassergemischt",
            "hersteller": "Blaser",
            "cas_nummer": "",
            "gefahrenklasse": "Reizwirkung",
            "h_saetze": "H315, H319",
            "p_saetze": "P280, P302+P352",
            "signalwort": "Achtung",
            "lagerort": "Lagerbereich, Außenlager Nord",
            "menge": "50 Liter",
        },
        {
            "name": "Acetylen (Schweißgas)",
            "hersteller": "Linde Gas",
            "cas_nummer": "74-86-2",
            "gefahrenklasse": "Explosionsgefahr",
            "h_saetze": "H220, H280",
            "p_saetze": "P210, P377, P381",
            "signalwort": "Gefahr",
            "lagerort": "Flaschenlagerschrank, Schweißwerkstatt",
            "menge": "5 Flaschen à 40L",
        },
        {
            "name": "Hydrauliköl ISO VG 46",
            "hersteller": "Shell",
            "cas_nummer": "nicht applicable",
            "gefahrenklasse": "Wassergefährdung",
            "h_saetze": "H413",
            "p_saetze": "P273",
            "signalwort": "",
            "lagerort": "Hydrauliköl-Lagertank, Produktionshalle",
            "menge": "500 Liter",
        },
        {
            "name": "Entfettungsmittel (Trichlorethan-frei)",
            "hersteller": "Chemiewerk",
            "cas_nummer": "",
            "gefahrenklasse": "Hautreizung, Augenreizung",
            "h_saetze": "H315, H319",
            "p_saetze": "P264, P280",
            "signalwort": "Achtung",
            "lagerort": "Chemikalienlagerschrank",
            "menge": "20 Liter",
        },
        {
            "name": "Schleifmittelstaub (asbest-frei)",
            "hersteller": "Schleif GmbH",
            "cas_nummer": "",
            "gefahrenklasse": "Atemwegsreizung",
            "h_saetze": "H335",
            "p_saetze": "P271",
            "signalwort": "Achtung",
            "lagerort": "Schleifbereich, Hauptwerk",
            "menge": "100 kg",
        },
    ]

    for gfs_data in gefahrstoffe_data:
        gfs = Gefahrstoff(
            id=uuid.uuid4(),
            organisation_id=org_id,
            name=gfs_data["name"],
            hersteller=gfs_data.get("hersteller"),
            cas_nummer=gfs_data.get("cas_nummer"),
            gefahrenklasse=gfs_data.get("gefahrenklasse"),
            h_saetze=gfs_data.get("h_saetze"),
            p_saetze=gfs_data.get("p_saetze"),
            signalwort=gfs_data.get("signalwort"),
            lagerort=gfs_data.get("lagerort"),
            menge=gfs_data.get("menge"),
            letzte_aktualisierung=now.date() - timedelta(days=randint(30, 180)),
        )
        objects_to_add.append(gfs)

    # =========================================================================
    # CREATE FREMDFIRMEN
    # =========================================================================
    fremdfirmen_data = [
        {
            "name": "Elektro Meyer GmbH",
            "ansprechpartner": "Dipl.-Ing. Peter Meyer",
            "email": "kontakt@elektro-meyer.de",
            "telefon": "+49 711 555-1234",
            "taetigkeit": "Elektroinstallation, Elektroprüfung",
            "dokumente": [
                {"typ": "haftpflicht", "name": "Haftpflichtversicherung 2025", "gueltig_bis": date(2025, 12, 31), "status": "aktuell"},
                {"typ": "unterweisung", "name": "Arbeitsschutzunterweisung 2024", "gueltig_bis": date(2025, 12, 31), "status": "aktuell"},
            ],
        },
        {
            "name": "Stahlbau Schmidt OHG",
            "ansprechpartner": "Meister Johannes Schmidt",
            "email": "j.schmidt@stahlbau-schmidt.de",
            "telefon": "+49 711 666-5678",
            "taetigkeit": "Stahlbau, Reparaturen",
            "dokumente": [
                {"typ": "haftpflicht", "name": "Versicherung Schmidt", "gueltig_bis": date(2025, 6, 30), "status": "aktuell"},
                {"typ": "gefaehrdungsbeurteilung", "name": "GBU Schweißarbeiten", "gueltig_bis": date(2025, 12, 31), "status": "aktuell"},
            ],
        },
    ]

    for ff_data in fremdfirmen_data:
        fremdfirma_id = uuid.uuid4()
        fremdfirma = Fremdfirma(
            id=fremdfirma_id,
            organisation_id=org_id,
            name=ff_data["name"],
            ansprechpartner=ff_data.get("ansprechpartner"),
            email=ff_data.get("email"),
            telefon=ff_data.get("telefon"),
            taetigkeit=ff_data.get("taetigkeit"),
            status="aktiv",
        )
        objects_to_add.append(fremdfirma)

        for dok_data in ff_data.get("dokumente", []):
            dokument = FremdfirmaDokument(
                id=uuid.uuid4(),
                fremdfirma_id=fremdfirma_id,
                typ=dok_data["typ"],
                name=dok_data["name"],
                gueltig_bis=dok_data.get("gueltig_bis"),
                status=dok_data.get("status", "aktuell"),
            )
            objects_to_add.append(dokument)

    # =========================================================================
    # BATCH ADD ALL OBJECTS + SINGLE COMMIT
    # =========================================================================
    db.add(org)
    db.add_all(objects_to_add)
    await db.commit()

    return {
        "message": "Umfassende Demo-Daten für PrüfPilot GmbH erfolgreich erstellt!",
        "organisation": org.name,
        "standorte": len(standorte_map),
        "abteilungen": len(abteilungen_map),
        "mitarbeiter": len(mitarbeiter_data),
        "arbeitsmittel": len(arbeitsmittel_map),
        "checklisten_templates": len(created_templates),
        "unterweisungs_vorlagen": len(unterweisungs_vorlagen),
        "gefaehrdungsbeurteilungen": len(gbu_data),
        "gefahrstoffe": len(gefahrstoffe_data),
        "fremdfirmen": len(fremdfirmen_data),
    }

@router.post("/demo-daten/loeschen")
async def delete_demo_data(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all demo data for the organisation.
    Removes: Standorte, Mitarbeiter, Arbeitsmittel, Prüfungen, Mängel, and ChecklistenTemplates/Punkte.
    """
    try:
        # Delete Mängel (cascades from Pruefungen)
        await db.execute(
            delete(Mangel).where(
                Mangel.pruefung_id.in_(
                    select(Pruefung.id).where(
                        Pruefung.arbeitsmittel_id.in_(
                            select(Arbeitsmittel.id).where(
                                Arbeitsmittel.organisation_id == org_id
                            )
                        )
                    )
                )
            )
        )

        # Delete PruefPunkte
        await db.execute(
            delete(PruefPunkt).where(
                PruefPunkt.pruefung_id.in_(
                    select(Pruefung.id).where(
                        Pruefung.arbeitsmittel_id.in_(
                            select(Arbeitsmittel.id).where(
                                Arbeitsmittel.organisation_id == org_id
                            )
                        )
                    )
                )
            )
        )

        # Delete Prüfungen (cascades from Arbeitsmittel)
        await db.execute(
            delete(Pruefung).where(
                Pruefung.arbeitsmittel_id.in_(
                    select(Arbeitsmittel.id).where(
                        Arbeitsmittel.organisation_id == org_id
                    )
                )
            )
        )

        # Delete Arbeitsmittel
        await db.execute(
            delete(Arbeitsmittel).where(Arbeitsmittel.organisation_id == org_id)
        )

        # Delete Mitarbeiter
        await db.execute(
            delete(Mitarbeiter).where(Mitarbeiter.organisation_id == org_id)
        )

        # Delete Abteilungen
        await db.execute(
            delete(Abteilung).where(Abteilung.organisation_id == org_id)
        )

        # Delete Standorte
        await db.execute(
            delete(Standort).where(Standort.organisation_id == org_id)
        )

        # Delete ChecklistenPunkte and Templates
        await db.execute(
            delete(ChecklistenPunkt).where(
                ChecklistenPunkt.template_id.in_(
                    select(ChecklistenTemplate.id).where(
                        ChecklistenTemplate.organisation_id == org_id
                    )
                )
            )
        )

        await db.execute(
            delete(ChecklistenTemplate).where(
                ChecklistenTemplate.organisation_id == org_id
            )
        )

        # Delete demo User
        await db.execute(
            delete(User).where(
                User.organisation_id == org_id,
                User.email == "demo.pruefer@demo.de",
            )
        )

        # Reset organisation demo fields
        org_result = await db.execute(
            select(Organisation).where(Organisation.id == org_id)
        )
        org = org_result.scalar_one_or_none()
        if org:
            org.branche = None
            org.strasse = None
            org.plz = None
            org.ort = None
            org.telefon = None
            org.email = None
            org.verantwortlicher_name = None
            org.verantwortlicher_email = None
            org.verantwortlicher_telefon = None
            org.berufe_config = None
            db.add(org)

        await db.commit()
        return {"message": "Demo-Daten erfolgreich gelöscht"}
    except Exception as e:
        await db.rollback()
        return {"error": str(e)}
