# PrüfPilot Formulare API - PDF-Generierung

## Übersicht

Die Formulare API generiert professionelle PDF-Dokumente mit Corporate Design:
- **Firmenkopf** mit Logo, Adresse, Kontakt
- **Farbschema**: Dunkelblau (Primär), Hellblau (Tabellenzeilen), Ampelfarben (Zustände)
- **Fußzeile** mit Generierungsdatum und Seitenzahl
- **Responsive Layout** optimiert für A4-Druck

Alle Endpoints:
- Authentifiziert (JWT-Token erforderlich)
- Multi-Tenant (gefiltert nach org_id)
- Geben PDF als Download zurück (Content-Disposition)

## Endpoints

### 1. Prüfprotokoll

```
GET /api/v1/formulare/pruefprotokoll/{pruefung_id}
```

Generiert ein Prüfprotokoll-PDF für eine durchgeführte Prüfung.

**Parameter:**
- `pruefung_id` (path): UUID der Prüfung

**Response:**
- `200 OK`: PDF-Stream mit Dateiname `Pruefprotokoll_[ID]_[DATUM].pdf`
- `404 Not Found`: Prüfung nicht gefunden
- `403 Forbidden`: Kein Zugriff

**Inhalt:**
1. Firmenkopf mit Logo
2. Prüfungsdaten (Arbeitsmittel, Typ, Seriennummer, Standort, Prüfer, Datum)
3. Checkliste als Tabelle (Prüfpunkte mit OK/Mangel/n.a./Bemerkung)
4. Mängelliste mit Schweregrad-Farben
5. Gesamtergebnis (Bestanden/Mängel/Nicht bestanden) mit Ampel-Symbol
6. Unterschriftenfelder (Prüfer + Verantwortlicher)
7. Fußzeile mit Datum und Seitenzahl

**Beispiel:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/formulare/pruefprotokoll/abc-123-def \
  -o Pruefprotokoll.pdf
```

---

### 2. Unterweisungsnachweis

```
GET /api/v1/formulare/unterweisungsnachweis/{unterweisung_id}
```

Generiert einen Unterweisungsnachweis für Schulungen.

**Parameter:**
- `unterweisung_id` (path): UUID der Unterweisung

**Response:**
- `200 OK`: PDF-Stream
- `404 Not Found`: Unterweisung nicht gefunden
- `403 Forbidden`: Kein Zugriff

**Inhalt:**
1. Firmenkopf
2. Unterweisungsdaten (Thema, Datum, Unterweiser, Rechtsgrundlage)
3. Inhaltszusammenfassung
4. Teilnehmerliste als Tabelle (Name, Abteilung, Unterschrift)
5. Unterschrift Unterweiser
6. Fußzeile

**Beispiel:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/formulare/unterweisungsnachweis/uw-456-xyz \
  -o Unterweisungsnachweis.pdf
```

---

### 3. Leere Checkliste (druckbar)

```
GET /api/v1/formulare/checkliste-leer/{checkliste_id}
```

Generiert eine leere Checkliste zum Ausdrucken und Ausfüllen vor Ort.

**Parameter:**
- `checkliste_id` (path): UUID der Checklisten-Vorlage

**Response:**
- `200 OK`: PDF-Stream
- `404 Not Found`: Checkliste nicht gefunden
- `403 Forbidden`: Kein Zugriff

**Inhalt:**
1. Firmenkopf
2. Checklistenname und Beschreibung
3. Tabelle mit leeren Zeilen zum Ausfüllen:
   - Nummerierung
   - Prüfpunkt (Beschreibung)
   - Checkboxen: OK, Mangel, n.a.
   - Bemerkungen (Freitextfeld)
4. Unterschriftenfelder (Geprüft von, Datum, Unterschrift)

**Beispiel:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/formulare/checkliste-leer/cl-789-abc \
  -o Checkliste.pdf
```

---

### 4. Betriebsanweisung (Gefahrstoffe)

```
GET /api/v1/formulare/betriebsanweisung/{gefahrstoff_id}
```

Generiert eine Betriebsanweisung für Gefahrstoffe. Layout und Farbe orientieren sich an der Gefahrenklasse:
- **Rot**: Giftig/Tödlich
- **Orange**: Ätzend/Reizend
- **Blau**: Sonstige Gefahren

**Parameter:**
- `gefahrstoff_id` (path): UUID des Gefahrstoffs

**Response:**
- `200 OK`: PDF-Stream
- `404 Not Found`: Gefahrstoff nicht gefunden
- `403 Forbidden`: Kein Zugriff

**Inhalt:**
1. Firmenkopf
2. Gefahrstoff-Name und Gefahrenklasse (farbig hervorgehoben)
3. Anwendungsbereich
4. Erforderliche Schutzausrüstung (PSA)
5. Lagerbedingungen
6. Verhalten im Notfall
7. Erste Hilfe
8. Unterschriftenfelder (Aktualisiert, Verantwortlicher)

**Beispiel:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/formulare/betriebsanweisung/gs-111-def \
  -o Betriebsanweisung.pdf
```

---

### 5. Gefährdungsbeurteilung (GBU)

```
GET /api/v1/formulare/gefaehrdungsbeurteilung/{gbu_id}
```

Generiert eine Gefährdungsbeurteilung (GBU) mit Gefahren, Folgen und Schutzmaßnahmen.

**Parameter:**
- `gbu_id` (path): UUID der Gefährdungsbeurteilung

**Response:**
- `200 OK`: PDF-Stream
- `404 Not Found`: GBU nicht gefunden
- `403 Forbidden`: Kein Zugriff

**Inhalt:**
1. Firmenkopf
2. GBU-Daten (Titel, Abteilung, Erstellungsdatum, Verantwortlicher)
3. Gefährdungstabelle:
   - Gefährdung (Beschreibung)
   - Mögliche Folgen
   - Schutzmaßnahmen
   - Priorität (Hoch/Mittel/Niedrig mit Ampelfarben)
4. Bestätigungstext
5. Unterschriftenfelder (Verantwortlicher, Datum)

**Beispiel:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/formulare/gefaehrdungsbeurteilung/gbu-222-abc \
  -o GefaehrdungsBeurteilung.pdf
```

---

### 6. Mängelbericht

```
GET /api/v1/formulare/maengelbericht/{pruefung_id}
```

Generiert einen Mängelbericht mit Details zu gefundenen Mängeln und Fristen.

**Parameter:**
- `pruefung_id` (path): UUID der Prüfung

**Response:**
- `200 OK`: PDF-Stream
- `404 Not Found`: Prüfung nicht gefunden
- `403 Forbidden`: Kein Zugriff

**Inhalt:**
1. Firmenkopf
2. Kopfdaten (Arbeitsmittel, Prüfer, Datum)
3. Detaillierte Mängelliste mit:
   - Mängelnummer
   - Beschreibung
   - Schweregrad (mit Ampelfarbe: rot/orange/grün)
   - Abhilfe-Frist
   - Erforderliche Maßnahme
4. Tabelle zur Bestätigung der Behebung:
   - Mangel
   - Behoben am (Datum)
   - Bestätigung durch (Unterschrift)

**Beispiel:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/formulare/maengelbericht/pr-333-xyz \
  -o Maengelbericht.pdf
```

---

## Farbschema

| Element | Farbe | Hex-Code | Verwendung |
|---------|-------|----------|-----------|
| Primär (Header, Überschriften) | Dunkelblau | #1e40af | Kopf, Titel, Tabellenheader |
| Sekundär (Tabellenzellen) | Hellblau | #f0f4ff | Zeilen-Alternierung in Tabellen |
| Bestanden / Positiv | Grün | #22c55e | Erfolgreiche Prüfungen, niedrige Priorität |
| Warnung / Mängel | Orange | #f59e0b | Mängel vorhanden, mittlere Priorität |
| Kritisch / Nicht bestanden | Rot | #ef4444 | Kritische Fehler, hohe Priorität |
| Text (Standard) | Dunkelgrau | #1f2937 | Fließtext, Tabellencells |
| Borderlinen | Grau | #d1d5db | Tabellenrahmen |

---

## Implementierungsdetails

### Service: `FormularGenerator`
**Datei:** `app/services/formular_generator.py`

Hauptklasse für PDF-Generierung mit ReportLab.

**Methoden:**
- `__init__(org_name, org_strasse, org_plz, org_ort, org_telefon, org_email, logo_url)`
- `async pruefprotokoll(pruefung_data: dict) -> bytes`
- `async unterweisungsnachweis(unterweisung_data: dict) -> bytes`
- `async gefaehrdungsbeurteilung(gbu_data: dict) -> bytes`
- `async checkliste_leer(checkliste_data: dict) -> bytes`
- `async betriebsanweisung(data: dict) -> bytes`
- `async maengelbericht(maengel_data: dict) -> bytes`

### Router: `formulare`
**Datei:** `app/api/v1/formulare.py`

6 Endpoints für PDF-Generierung mit:
- JWT-Authentifizierung
- Multi-Tenant-Filterung (org_id)
- Streaming-Response mit korrektem Content-Type
- Sprechende Dateinamen mit Datum

---

## Fehlerbehandlung

| Fehler | Status | Ursache | Lösung |
|--------|--------|--------|--------|
| `404 Not Found` | 404 | Dokument nicht in Org vorhanden | ID überprüfen, Zugriff überprüfen |
| `403 Forbidden` | 403 | User hat keinen Zugriff | Nur eigene Org-Dokumente abrufen |
| `401 Unauthorized` | 401 | Kein/ungültiger JWT-Token | Token aktualisieren |
| `500 Internal Server Error` | 500 | Fehler bei PDF-Generierung | Logs überprüfen, API-Support kontaktieren |

---

## Verwendungsbeispiele

### Python
```python
import httpx

async def download_pdf(pruefung_id: str, token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8000/api/v1/formulare/pruefprotokoll/{pruefung_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        with open("Pruefprotokoll.pdf", "wb") as f:
            f.write(response.content)
```

### JavaScript/Frontend
```javascript
async function downloadPDF(pruefungId, token) {
  const response = await fetch(
    `/api/v1/formulare/pruefprotokoll/${pruefungId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pruefprotokoll_${pruefungId}.pdf`;
  a.click();
}
```

---

## Technische Anforderungen

- **Python >= 3.10**
- **reportlab == 4.1.0** (bereits in requirements.txt)
- **Pillow >= 10.0** (für Logo-Handling)
- **requests** (für URL-basierte Logos)

---

## Konfiguration

Die Organisations-Daten werden aus der DB geladen:
```python
organisation = await db.get(Organisation, org_id)
generator = FormularGenerator(
    org_name=organisation.name,
    org_strasse=organisation.strasse,
    org_plz=organisation.plz,
    org_ort=organisation.ort,
    org_telefon=organisation.telefon,
    org_email=organisation.email,
    logo_url=organisation.logo_url,  # Optional
)
```

Falls Organisation noch kein Logo hat, wird es einfach ignoriert und nur Textdaten im Header angezeigt.

---

## Erweiterbarkeit

Um neue Dokument-Typen hinzuzufügen:

1. **Service erweitern:**
   ```python
   async def neues_dokument(self, data: Dict[str, Any]) -> bytes:
       """Neue Methode in FormularGenerator"""
       pdf_buffer = BytesIO()
       doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
       elements = []
       # ... Aufbau ...
       doc.build(elements, onFirstPage=self._page_footer, ...)
       return pdf_buffer.getvalue()
   ```

2. **Endpoint hinzufügen:**
   ```python
   @router.get("/neues-dokument/{doc_id}")
   async def get_neues_dokument(doc_id: str, db: AsyncSession = Depends(get_db), ...):
       # ... Daten laden, validieren ...
       pdf_bytes = await generator.neues_dokument(data)
       # ... Rückgabe ...
   ```

3. **Router in `api/v1/router.py` registrieren** (bereits geschehen)

---

## Support & Debugging

**Logs überprüfen:**
```bash
docker-compose logs backend | grep "FormularGenerator\|formulare"
```

**Test durchführen:**
```bash
cd backend
python -m pytest tests/test_formulare.py -v
```

**PDF-Generierung manuell testen:**
```python
# In Python-Shell
from app.services.formular_generator import FormularGenerator

gen = FormularGenerator(org_name="Test GmbH")
pdf = await gen.pruefprotokoll({...})
# PDF ist nun in der Variablen 'pdf' als bytes
```
