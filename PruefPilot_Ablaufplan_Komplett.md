# PrüfPilot — Vollständiger Ablaufplan

**Ziel:** Code komplett fertigstellen bis alles funktioniert wie in der Projektspezifikation v2 + Task Breakdown v3 beschrieben.

**Regeln:** Kein Feature halb angefangen. Jeder Block wird komplett ausprogrammiert — Backend, Frontend, Design, Tests — bevor der nächste beginnt.

---

## IST-ZUSTAND (Stand 31.03.2026)

### Was da ist und funktioniert

| Bereich | Status | Details |
|---------|--------|---------|
| Backend-Struktur | ✅ Komplett | FastAPI, 16 Models, 16 API-Endpoint-Dateien (4.021 Zeilen) |
| Auth (Register/Login/JWT) | ✅ Funktioniert | Registrierung, Login, Refresh Token, /me Endpoint |
| Multi-Tenant-Isolierung | ✅ Funktioniert | Alle Queries filtern nach organisation_id |
| Arbeitsmittel CRUD | ✅ Funktioniert | Erstellen, Bearbeiten, Löschen, Auflisten mit Filter/Suche |
| Prüfungen Workflow | ✅ Funktioniert | Starten → Punkte bewerten → Mängel → Abschließen → Lock |
| PDF-Prüfprotokoll | ✅ Grundversion | ReportLab-PDF mit Prüfpunkten, Mängeln, Meta-Daten |
| Checklisten-Templates | ✅ Funktioniert | CRUD für Templates + Prüfpunkte |
| Seed-Daten | ✅ Funktioniert | Default-Checklisten werden bei Registrierung angelegt |
| Mängelverfolgung | ✅ Grundversion | Liste + Status-Änderung (offen/in_bearbeitung/erledigt) |
| Unterweisungen + KI | ✅ Funktioniert | Vorlagen, Zuweisungen, KI-Generierung via Claude API |
| Mitarbeiter | ✅ Funktioniert | CRUD, Abteilungen, Dokumente, Compliance-Matrix |
| GBU | ✅ Funktioniert | CRUD für Gefährdungsbeurteilungen |
| Gefahrstoffe | ✅ Funktioniert | Inventar, CRUD |
| Fremdfirmen | ✅ Funktioniert | CRUD mit Dokumentenverwaltung |
| Audit-Log | ✅ Funktioniert | Alle Änderungen werden protokolliert |
| Frontend Layout | ✅ Funktioniert | Sidebar (Desktop) + Bottom-Nav (Mobile), konfigurierbar |
| Dashboard | ✅ Grundversion | Kalender, Stat-Cards, nächste Prüfungen, offene Mängel |
| Branchen-Config | ✅ Umfangreich | 5+ Branchen mit Berufen, Arbeitsmitteln, Checklisten etc. |
| Organisation-Model | ✅ Felder da | branche, plan, trial_endet_am, stripe_customer_id vorhanden |
| Docker Compose | ✅ Funktioniert | PostgreSQL + Backend + Frontend |

### Was FEHLT (Lücken zum Soll)

| Nr | Feature | Wo fehlt es | Priorität |
|----|---------|-------------|-----------|
| L1 | **Branche bei Registrierung** | Login.tsx fragt nicht nach Branche, auth.py speichert keine Branche | Hoch |
| L2 | **Schnellstart-Modus** | Kein Onboarding-Flow nach Registrierung, Dashboard zeigt leere App | Hoch |
| L3 | **BG-Ready-Score als Hero-Element** | Dashboard hat kleine Compliance-%, aber nicht den großen Score mit Ampelfarbe + Top-3-Maßnahmen | Hoch |
| L4 | **CSV-Import Arbeitsmittel** | Kein Backend-Endpoint, kein Frontend-UI | Hoch |
| L5 | **QR-Code Generierung** | Feld `qr_code_url` existiert, aber kein Endpoint der QR erzeugt | Hoch |
| L6 | **QR-Code Drucken + Scannen** | Kein Frontend für QR-Druck (Etikettenformat), kein Scanner | Hoch |
| L7 | **E-Mail-Erinnerungen** | Postmark installiert, aber keine E-Mail-Logik, kein Cronjob | Hoch |
| L8 | **Prüffristen-Berechnung automatisch** | Ampel wird bei Prüfungsabschluss gesetzt, aber nicht per Cronjob aktualisiert (veraltet mit der Zeit) | Hoch |
| L9 | **Plan-Limits / Free-Plan** | Felder existieren, aber keine Middleware die Limits prüft | Mittel |
| L10 | **PDF mit Firmenlogo** | PDF enthält kein Kundenlogo, nur "PrüfPilot"-Header | Mittel |
| L11 | **PDF per E-Mail senden** | Kein Endpoint zum E-Mail-Versand des Protokolls | Mittel |
| L12 | **Digitale Touch-Unterschrift** | Nur Textfeld für Name, kein Canvas-Signaturfeld | Mittel |
| L13 | **Stripe-Integration** | Keine Zahlungsabwicklung | Mittel |
| L14 | **Upgrade-Hinweise im UI** | Keine Meldungen wenn Free-Plan-Limits erreicht | Mittel |
| L15 | **Tests: Auth + CRUD** | Nur 3 Basistests (health, register, login) | Mittel |
| L16 | **Tests: Prüf-Flow** | Kein Test für den kritischen Pfad: Starten → Bewerten → Mangel → Lock | Mittel |
| L17 | **Tests: Unveränderbarkeit** | Kein Test der prüft: Abgeschlossenes Protokoll darf nicht geändert werden | Mittel |
| L18 | **CI/CD Pipeline** | Kein .github/workflows Verzeichnis | Mittel |
| L19 | **Rate Limiting** | Keine API-Drosselung | Mittel |
| L20 | **S3-Upload statt lokal** | Fotos gehen auf lokales Filesystem statt Hetzner S3 | Mittel |
| L21 | **Security Headers** | HTTPS/HSTS/CSP/CORS nicht vollständig | Mittel |
| L22 | **Error Handling Frontend** | Keine einheitlichen Loading States, Empty States, Offline-Warnung | Mittel |
| L23 | **Datenschutz + Impressum** | Keine Seiten im Frontend | Niedrig |
| L24 | **Landing Page** | pruefpilot.de Seite existiert nicht | Niedrig |
| L25 | **Hilfe-Center (5 Artikel)** | Kein Help-Center | Niedrig |
| L26 | **In-App Feedback-Button** | Kein Feedback-Button | Niedrig |

---

## ABLAUFPLAN — 18 ARBEITSBLÖCKE

Jeder Block ist in sich abgeschlossen. Am Ende jedes Blocks funktioniert alles was darin gebaut wurde — komplett.

---

### BLOCK 1: Registrierung + Branche komplett machen

**Was wird gemacht:**
- Backend: `auth.py` → RegisterRequest erhält Feld `branche`, wird auf Organisation gespeichert
- Frontend: `Login.tsx` → Branche-Dropdown bei Registrierung (aus branchen.ts geladen)
- Seed: Nach Registrierung werden branchenspezifische Checklisten angelegt (nicht nur die Default-Checklisten)
- Test: Registrierung mit Branche testen, prüfen dass Organisation.branche gesetzt ist

**Dateien die geändert werden:**
- `backend/app/schemas/auth.py` — branche-Feld zu RegisterRequest
- `backend/app/api/v1/auth.py` — branche auf Organisation speichern
- `backend/app/api/v1/seed.py` — Branchenspezifische Checklisten
- `frontend/src/pages/Login.tsx` — Branche-Dropdown
- `backend/tests/test_health.py` — Test erweitern

**Fertig wenn:** Neuer User registriert sich mit Branche, Organisation hat Branche gesetzt, passende Checklisten sind angelegt.

---

### BLOCK 2: Schnellstart-Modus nach Registrierung

**Was wird gemacht:**
- Frontend: Neue Komponente `Schnellstart.tsx` — 3-Schritte-Flow:
  1. Branche bestätigen → vorgeschlagene Arbeitsmittel-Typen erscheinen
  2. Erstes Arbeitsmittel schnell anlegen (nur Name + Typ + Standort)
  3. Erste Prüfung starten
- Backend: Neuer Endpoint `GET /api/v1/branchen/{branche}/vorschlaege` → gibt typische Arbeitsmittel + Checklisten für die Branche zurück
- Dashboard: Erkennt ob Schnellstart nötig ist (0 Arbeitsmittel = Schnellstart anzeigen statt leerem Dashboard)
- Routing: Nach Registrierung → /schnellstart statt /dashboard

**Dateien die geändert/erstellt werden:**
- `frontend/src/pages/Schnellstart.tsx` — NEU
- `frontend/src/App.tsx` — Route hinzufügen
- `frontend/src/pages/Login.tsx` — Redirect nach /schnellstart
- `frontend/src/pages/Dashboard.tsx` — Schnellstart-Redirect wenn 0 Arbeitsmittel
- `backend/app/api/v1/branchen.py` — NEU: Vorschläge-Endpoint

**Fertig wenn:** Neuer User durchläuft 3-Schritte-Schnellstart und hat danach sein erstes Arbeitsmittel + erste Prüfung gestartet. Alles unter 10 Minuten machbar.

---

### BLOCK 3: BG-Ready-Score — Das Killer-Feature

**Was wird gemacht:**
- Backend: Neuer Endpoint `GET /api/v1/compliance-score` → berechnet Score aus:
  - % Prüfungen aktuell (nicht überfällig)
  - Offene Mängel nach Schweregrad (rot = -10 Punkte, orange = -5)
  - Gewichteter Gesamtscore als Prozentzahl
  - Top-3 Maßnahmen die den Score am meisten verbessern würden
- Frontend: Dashboard komplett überarbeiten:
  - **Hero-Element:** Große Zahl (z.B. "78%") mit Ampelfarbe (grün/gelb/rot)
  - Darunter: Top-3 Maßnahmen als klickbare Karten
  - Bestehende Stat-Cards + Kalender bleiben

**Dateien die geändert/erstellt werden:**
- `backend/app/api/v1/compliance.py` — NEU: Score-Berechnung
- `backend/app/api/v1/router.py` — Route registrieren
- `frontend/src/pages/Dashboard.tsx` — Hero-Element + Score-Anzeige

**Fertig wenn:** Dashboard zeigt prominent den BG-Ready-Score mit Ampelfarbe + Top-3-Verbesserungsvorschläge. Score aktualisiert sich in Echtzeit.

---

### BLOCK 4: CSV-Import für Arbeitsmittel

**Was wird gemacht:**
- Backend: `POST /api/v1/arbeitsmittel/import` — CSV hochladen, Spalten-Mapping, Validierung, Bulk-Insert. Fehlertolerant: auch "dreckige" Excel-Exports verarbeiten (BOM, Semikolon-Trenner, leere Zeilen, doppelte Anführungszeichen)
- Frontend: CSV-Import-Dialog in Arbeitsmittel-Seite:
  1. Datei hochladen
  2. Spalten-Mapping (Vorschau der ersten 5 Zeilen)
  3. Validierung anzeigen (Fehler rot markiert)
  4. Import starten
  5. Ergebnis: "42 importiert, 3 Fehler"

**Dateien die geändert/erstellt werden:**
- `backend/app/api/v1/arbeitsmittel.py` — Import-Endpoint hinzufügen
- `frontend/src/pages/Arbeitsmittel.tsx` — CSV-Import-Dialog + Button

**Fertig wenn:** User kann Excel-Export (CSV) hochladen, Spalten zuordnen, importieren. Fehlerhafte Zeilen werden angezeigt, gute Zeilen importiert.

---

### BLOCK 5: QR-Code System komplett

**Was wird gemacht:**
- Backend: `GET /api/v1/arbeitsmittel/{id}/qr` → QR-Code als PNG generieren (mit qrcode-Bibliothek, bereits installiert). QR enthält URL zur Detailseite/Prüfhistorie.
- Backend: `GET /api/v1/arbeitsmittel/qr-etiketten` → Druckseite mit mehreren QR-Codes (PDF, Etikettenformat)
- Frontend: QR-Code-Anzeige auf Arbeitsmittel-Detailseite
- Frontend: "QR-Codes drucken" Button → Auswahl mehrerer Arbeitsmittel → Druckansicht
- Frontend: QR-Scanner-Seite (Kamera-basiert, öffnet Arbeitsmittel-Detail)

**Dateien die geändert/erstellt werden:**
- `backend/app/api/v1/arbeitsmittel.py` — QR-Endpoints
- `frontend/src/pages/Arbeitsmittel.tsx` — QR-Anzeige + Druck-Dialog
- `frontend/src/pages/QRScanner.tsx` — NEU: Kamera-Scanner
- `frontend/src/App.tsx` — Scanner-Route

**Fertig wenn:** QR-Codes werden generiert, auf Etiketten gedruckt, per Kamera gescannt und führen direkt zum Arbeitsmittel.

---

### BLOCK 6: PDF-Prüfprotokoll perfektionieren

**Was wird gemacht:**
- PDF-Layout komplett überarbeiten — professionell, mit:
  - Firmenlogo des Kunden (aus Organisation.logo_url)
  - Sauberes Layout: Kopf mit Logo + Firmeninfo, Prüfdaten-Tabelle, Checkliste mit Ampelfarben, Mängel mit Fotos, Unterschrift
  - PrüfPilot-Wasserzeichen bei Free-Plan (Plan-abhängig)
  - Fußzeile: "Revisionssicher erstellt mit PrüfPilot"
- Fotos in PDF einbetten (aktuell werden Mängel-Fotos nicht eingebettet)
- Endpoint: `POST /api/v1/pruefungen/{id}/email` → PDF per E-Mail an beliebige Adresse senden

**Dateien die geändert werden:**
- `backend/app/api/v1/pruefungen.py` — PDF-Generierung komplett überarbeiten + E-Mail-Endpoint
- `backend/app/services/email.py` — NEU: E-Mail-Service mit Postmark
- `frontend/src/pages/PruefScreen.tsx` — "Per E-Mail senden" Button

**Fertig wenn:** PDF sieht professionell aus mit Firmenlogo, Fotos, Ampelfarben. Kann per E-Mail versendet werden. Free-Plan hat Wasserzeichen.

---

### BLOCK 7: Digitale Touch-Unterschrift

**Was wird gemacht:**
- Frontend: Canvas-Signatur-Komponente für Touch-Geräte
  - Zeichenfläche mit Touch-Support
  - Löschen-Button
  - Unterschrift wird als PNG gespeichert
- Backend: Unterschrift-Bild speichern (Upload als Base64 oder File)
- Integration in PruefScreen.tsx: Beim Abschließen Unterschrift-Canvas statt nur Textfeld
- PDF: Unterschrift-Bild im Protokoll einbetten

**Dateien die geändert/erstellt werden:**
- `frontend/src/components/ui/SignaturPad.tsx` — NEU: Touch-Canvas-Komponente
- `frontend/src/pages/PruefScreen.tsx` — SignaturPad in Abschluss-Modal
- `backend/app/api/v1/pruefungen.py` — Unterschrift-Bild speichern + in PDF einbetten

**Fertig wenn:** Prüfer kann auf Tablet unterschreiben (Touch-Canvas), Unterschrift erscheint im PDF-Protokoll.

---

### BLOCK 8: E-Mail-Erinnerungen + Fristenmanagement

**Was wird gemacht:**
- Backend-Service: `services/scheduler.py` — Täglicher Cronjob der:
  1. Alle Arbeitsmittel mit naechste_pruefung_am prüft
  2. Ampel-Status aktualisiert (veraltet nach 24h)
  3. E-Mail-Erinnerungen versendet bei: 4 Wochen / 2 Wochen / 1 Woche / Überfällig
  4. BG-Ready-Score aktualisiert
- Konfigurierbar pro Organisation: Welche Erinnerungen, an wen
- E-Mail-Templates: Deutsch, professionell, mit Logo

**Dateien die geändert/erstellt werden:**
- `backend/app/services/scheduler.py` — NEU: Cronjob-Logik
- `backend/app/services/email.py` — E-Mail-Templates erweitern
- `backend/app/main.py` — Scheduler beim Start registrieren
- `frontend/src/pages/Einstellungen.tsx` — Erinnerungs-Einstellungen

**Fertig wenn:** Ampel-Status bleibt aktuell, E-Mail-Erinnerungen gehen raus, Admin kann Intervalle konfigurieren.

---

### BLOCK 9: Plan-Limits + Free-Plan Enforcement

**Was wird gemacht:**
- Backend-Middleware: `core/plan_limits.py` — Prüft bei jeder relevanten Aktion:
  - Free: max 10 Arbeitsmittel, 3 Prüfungen/Monat, 1 User, PDF mit Wasserzeichen
  - Prüf-Manager (29€): unbegrenzt, ohne Wasserzeichen
  - Bei Limit: HTTP 403 mit klarer Meldung
- Frontend: Upgrade-Hinweise wenn Limit erreicht:
  - Freundlich, nicht aggressiv
  - "Du hast 3 von 3 Prüfungen diesen Monat genutzt. Upgrade ab 29€/Monat."
- Trial-Logik: 30 Tage Trial auf bezahlten Plänen

**Dateien die geändert/erstellt werden:**
- `backend/app/core/plan_limits.py` — NEU: Plan-Check-Middleware
- `backend/app/api/v1/arbeitsmittel.py` — Limit prüfen bei Create
- `backend/app/api/v1/pruefungen.py` — Limit prüfen bei Start
- `frontend/src/components/ui/UpgradeHinweis.tsx` — NEU: Upgrade-Komponente

**Fertig wenn:** Free-Plan ist limitiert, Limits werden durchgesetzt, User sieht freundliche Upgrade-Hinweise.

---

### BLOCK 10: Mängelverfolgung komplett

**Was wird gemacht:**
- Frontend: `Maengel.tsx` komplett überarbeiten (aktuell nur 147 Zeilen — zu wenig):
  - Filter nach Schweregrad, Standort, Arbeitsmittel, Status
  - Sortierung nach Frist, Erstellung, Schweregrad
  - Status-Änderung mit Kommentar + Foto
  - Detailansicht: Mangel mit allen Infos, Fotos, Historie
  - BG-Ready-Score aktualisiert sich bei Statusänderung
- Backend: Mangel-Status-Update mit Kommentar + Foto-Upload

**Dateien die geändert werden:**
- `backend/app/api/v1/maengel.py` — Status-Update mit Kommentar/Foto erweitern
- `frontend/src/pages/Maengel.tsx` — Komplett überarbeiten

**Fertig wenn:** Mängel können gefiltert, sortiert, mit Kommentar + Foto bearbeitet werden. Geschlossener Kreislauf: Erfassen → Bearbeiten → Erledigen → Score-Update.

---

### BLOCK 11: Checklisten-Verwaltung vervollständigen

**Was wird gemacht:**
- Frontend: `Checklisten.tsx` erweitern (aktuell 254 Zeilen):
  - Eigene Prüfpunkte zu bestehenden Templates hinzufügen/entfernen
  - Neue eigene Checkliste erstellen
  - Prüfpunkte: Text, Kategorie, Hinweis/Erläuterung, Pflicht ja/nein
  - Normverweis pro Prüfpunkt
  - Vorschau der Checkliste

**Dateien die geändert werden:**
- `frontend/src/pages/Checklisten.tsx` — Erweitern

**Fertig wenn:** Admin kann Templates anpassen, eigene Checklisten erstellen, Prüfpunkte mit Hinweisen und Normverweisen versehen.

---

### BLOCK 12: Foto-Upload auf S3 umstellen

**Was wird gemacht:**
- Backend: Upload-Service von lokalem Filesystem auf Hetzner S3 umstellen
- Alle Foto-URLs zeigen auf S3 statt /uploads/
- Bestehende Uploads migrieren (falls vorhanden)
- Presigned URLs für sichere Downloads

**Dateien die geändert werden:**
- `backend/app/services/storage.py` — NEU: S3-Service
- `backend/app/api/v1/upload.py` — S3 statt lokal
- `backend/app/core/config.py` — S3-Config validieren

**Fertig wenn:** Alle Fotos gehen zu S3. Alte Uploads funktionieren weiterhin. Presigned URLs für sicheren Zugriff.

---

### BLOCK 13: Automatisierte Tests komplett

**Was wird gemacht:**
- `test_auth.py` — Register, Login, Refresh, falsche Credentials, doppelte E-Mail
- `test_arbeitsmittel.py` — CRUD, Pagination, Filter, Multi-Tenant-Isolierung
- `test_pruefungen.py` — Kompletter Flow: Starten → Punkte → Mangel → Abschließen → Lock
- `test_unveraenderbarkeit.py` — Abgeschlossenes Protokoll darf NICHT geändert werden
- `test_csv_import.py` — Import mit sauberen + dreckigen Daten
- `test_compliance_score.py` — Score-Berechnung korrekt
- conftest.py mit Test-DB, Fixtures, Factory-Funktionen

**Dateien die erstellt werden:**
- `backend/tests/test_auth.py` — NEU
- `backend/tests/test_arbeitsmittel.py` — NEU
- `backend/tests/test_pruefungen.py` — NEU
- `backend/tests/test_unveraenderbarkeit.py` — NEU
- `backend/tests/test_csv_import.py` — NEU
- `backend/tests/test_compliance_score.py` — NEU
- `backend/tests/conftest.py` — Erweitern

**Fertig wenn:** `pytest` läuft durch, alle kritischen Pfade sind getestet. Unveränderbarkeit ist bewiesen.

---

### BLOCK 14: CI/CD Pipeline

**Was wird gemacht:**
- GitHub Actions Workflow:
  - Bei jedem Push: Lint (ruff/flake8), Tests (pytest), Type-Check
  - Bei Push auf main: Build + Deploy auf Hetzner (Docker)
- Dockerfile optimieren für Production
- Deployment-Script für Hetzner (SSH + Docker Compose)

**Dateien die erstellt werden:**
- `.github/workflows/ci.yml` — NEU: Test + Lint
- `.github/workflows/deploy.yml` — NEU: Deploy auf Hetzner
- `docker/Dockerfile.backend.prod` — NEU: Optimiertes Production-Image
- `scripts/deploy.sh` — NEU: Deployment-Script

**Fertig wenn:** Push auf main → Tests laufen → Bei Erfolg automatisches Deployment auf Hetzner.

---

### BLOCK 15: Sicherheit + Error Handling

**Was wird gemacht:**
- Backend: Rate Limiting (100 Req/Min pro User)
- Backend: Security Headers (HSTS, CSP, CORS verschärfen)
- Backend: Input-Validierung überall (XSS, SQL Injection schon durch SQLAlchemy, aber doppelt prüfen)
- Backend: Backup-System (tägliches automatisches Backup DB)
- Frontend: Einheitliche Loading States, Empty States, Error States
- Frontend: Offline-Warnung wenn keine Verbindung
- Frontend: Alle Touch-Targets min. 48x48px prüfen

**Dateien die geändert werden:**
- `backend/app/main.py` — Rate Limiter + Security Headers
- `backend/app/core/security.py` — Rate Limiting
- `frontend/src/components/ui/LoadingState.tsx` — NEU
- `frontend/src/components/ui/EmptyState.tsx` — NEU
- `frontend/src/components/ui/ErrorState.tsx` — NEU
- Alle Frontend-Pages: Einheitliche States einbauen

**Fertig wenn:** API ist geschützt, Frontend zeigt saubere Zustände für Laden/Leer/Fehler/Offline.

---

### BLOCK 16: Stripe-Integration + Pricing

**Was wird gemacht:**
- Stripe-Checkout für alle Bezahlpläne (29€, 79€, 149€, 249€)
- Webhook für Zahlungsbestätigung
- Plan-Upgrade/Downgrade
- 30-Tage-Testphase
- Pricing-Seite im Frontend (in Einstellungen)

**Dateien die geändert/erstellt werden:**
- `backend/app/api/v1/billing.py` — NEU: Stripe-Endpoints
- `backend/app/services/stripe_service.py` — NEU: Stripe-Logik
- `frontend/src/pages/Einstellungen.tsx` — Billing-Tab
- `backend/requirements.txt` — stripe Paket hinzufügen

**Fertig wenn:** User kann Plan wählen, mit Kreditkarte bezahlen, Plan wechseln. Trial funktioniert.

---

### BLOCK 17: Datenschutz, Impressum, Feedback, Hilfe

**Was wird gemacht:**
- Frontend: Datenschutz-Seite (Text vom Anwalt, Platzhalter erstmal)
- Frontend: Impressum-Seite
- Frontend: Feedback-Button auf jeder Seite ("Was fehlt hier?")
- Frontend: Mini-Hilfe-Center (5 Artikel: Erste Schritte, Prüfung, PDF, CSV, QR)

**Dateien die erstellt werden:**
- `frontend/src/pages/Datenschutz.tsx` — NEU
- `frontend/src/pages/Impressum.tsx` — NEU
- `frontend/src/components/ui/FeedbackButton.tsx` — NEU
- `frontend/src/pages/Hilfe.tsx` — NEU
- `frontend/src/App.tsx` — Routen

**Fertig wenn:** Alle rechtlich nötigen Seiten existieren. Feedback-Button ist auf jeder Seite. Hilfe-Artikel sind abrufbar.

---

### BLOCK 18: Endabnahme + Tablet-Optimierung

**Was wird gemacht:**
- Alle Seiten auf iPad/Android-Tablet testen
- Touch-Targets überall min. 48x48px
- Prüf-Screen Fullscreen-Optimierung
- Design-Konsistenz prüfen: Alle Farben, Abstände, Fonts einheitlich
- Cross-Browser-Test (Chrome, Safari, Firefox)
- Performance-Check: Keine langsamen Queries, keine unnötigen Re-Renders
- Gesamttest: Kompletter User-Flow von Registrierung bis PDF-Download

**Fertig wenn:** App funktioniert fehlerfrei auf Desktop + Tablet + Handy. Design ist einheitlich. Kompletter Flow funktioniert von A bis Z.

---

## REIHENFOLGE + ABHÄNGIGKEITEN

```
BLOCK 1 (Registrierung+Branche)
    └── BLOCK 2 (Schnellstart) ─── benötigt Branche
    └── BLOCK 3 (BG-Ready-Score)

BLOCK 4 (CSV-Import) ─── unabhängig
BLOCK 5 (QR-Codes) ─── unabhängig
BLOCK 6 (PDF perfekt) ─── unabhängig
BLOCK 7 (Touch-Unterschrift) ─── vor Block 6 ideal

BLOCK 8 (E-Mail/Fristen) ─── benötigt Block 6 (E-Mail-Service)
BLOCK 9 (Plan-Limits) ─── benötigt Block 6 (PDF-Wasserzeichen)

BLOCK 10 (Mängel komplett) ─── unabhängig
BLOCK 11 (Checklisten komplett) ─── unabhängig
BLOCK 12 (S3-Upload) ─── unabhängig

BLOCK 13 (Tests) ─── nach allen Feature-Blocks
BLOCK 14 (CI/CD) ─── nach Block 13
BLOCK 15 (Sicherheit) ─── nach Features
BLOCK 16 (Stripe) ─── nach Block 9

BLOCK 17 (Rechtliches) ─── unabhängig
BLOCK 18 (Endabnahme) ─── GANZ AM SCHLUSS
```

## EMPFOHLENE BEARBEITUNGSREIHENFOLGE

| Schritt | Block | Begründung |
|---------|-------|------------|
| 1 | Block 1: Registrierung+Branche | Grundlage für alles andere |
| 2 | Block 2: Schnellstart | Direkt danach, baut darauf auf |
| 3 | Block 3: BG-Ready-Score | Killer-Feature, Motivation für den Rest |
| 4 | Block 7: Touch-Unterschrift | Schnell, benötigt für PDF |
| 5 | Block 6: PDF perfekt | Muss makellos sein — DAS Verkaufsargument |
| 6 | Block 4: CSV-Import | Hoher Impact für Pilotfirmen |
| 7 | Block 5: QR-Codes | Rundet den Prüf-Workflow ab |
| 8 | Block 10: Mängel komplett | Geschlossener Kreislauf |
| 9 | Block 11: Checklisten komplett | Anpassbarkeit für Kunden |
| 10 | Block 8: E-Mail/Fristen | Automatisierung |
| 11 | Block 9: Plan-Limits | Monetarisierung |
| 12 | Block 12: S3-Upload | Production-ready |
| 13 | Block 13: Tests | Alles absichern |
| 14 | Block 14: CI/CD | Automatisierung |
| 15 | Block 15: Sicherheit | Vor Launch pflicht |
| 16 | Block 16: Stripe | Bezahlung möglich |
| 17 | Block 17: Rechtliches | Vor Launch pflicht |
| 18 | Block 18: Endabnahme | Finaler Check |

---

## SO ARBEITEN WIR

1. Du sagst: "Lass uns Block X machen"
2. Ich programmiere alles komplett — Backend, Frontend, Tests
3. Du testest und gibst Feedback
4. Wir fixen alles bis es perfekt ist
5. Haken dran, nächster Block

**Keine halben Sachen. Jeder Block wird fertig.**

---

*PrüfPilot Ablaufplan — Stand 31.03.2026*
