# PrüfPilot

## Meta
- **Stack**: FastAPI + React + TypeScript + PostgreSQL + Tailwind CSS
- **Code**: `projects/PruefPilot/` (enthält eigene CLAUDE.md mit Code-Konventionen)
- **Ziel**: SaaS für Prüfmanagement — KMUs können Prüfungen anlegen, Termine verwalten, Ergebnisse dokumentieren
- **Zielgruppe**: Deutsche KMUs (5-250 MA) mit Prüfpflichten, Sicherheitsfachkräfte
- **Status**: MVP Prüf-Manager in Entwicklung

## Module (geplant)
1. **Prüf-Manager** ← aktueller Fokus
2. Unterweisungen
3. Gefährdungsbeurteilungen
4. Gefahrstoffe
5. Fremdfirmenmanagement

## Wichtig
- **Vor dem Coden**: Immer `projects/PruefPilot/CLAUDE.md` lesen — dort stehen alle Architektur-Konventionen, Patterns und Namenskonventionen
- Multi-Tenancy via JWT (org_id) — Daten immer nach organisation_id filtern
- Async überall (AsyncSession)
- API-Prefix: `/api/v1/`

## Aufgaben — Prüf-Manager MVP

### 1. Datenbank-Setup und Modelle
- Typ: backend
- Beschreibung: PostgreSQL Schema für Prüfungen, Prüfmittel, Prüfpläne, Prüfer. SQLAlchemy 2.0 mit Mapped[] Type Annotations.
- Abhängig von: keine
- Testbar durch: Alembic Migration läuft fehlerfrei, Tabellen existieren

### 2. CRUD-Endpoints Prüfmittel
- Typ: backend
- Beschreibung: REST-Endpoints für Prüfmittel (Anlagen, Maschinen, Werkzeuge). GET/POST/PUT/DELETE. Pydantic Schemas mit deutscher Validierung.
- Abhängig von: 1
- Testbar durch: pytest, alle CRUD-Operationen funktionieren

### 3. CRUD-Endpoints Prüfungen
- Typ: backend
- Beschreibung: REST-Endpoints für Prüfungen. Erstellen, fällige abrufen, als durchgeführt markieren, Ergebnis speichern. Filterung nach Status, Datum, Prüfmittel.
- Abhängig von: 1, 2
- Testbar durch: pytest, Filterung korrekt

### 4. Prüfmittel-Übersicht Frontend
- Typ: frontend
- Beschreibung: React-Tabelle aller Prüfmittel. Sortierung, Filter, Suche. Status-Badges (fällig/überfällig/ok). Responsive.
- Abhängig von: 2
- Testbar durch: Rendert mit Testdaten, Filter funktionieren

### 5. Prüfungs-Dashboard Frontend
- Typ: frontend
- Beschreibung: Dashboard mit fälligen Prüfungen, Kalender-Widget, Statistik-Karten, Charts (Recharts).
- Abhängig von: 3
- Testbar durch: Dashboard zeigt korrekte Zahlen

### 6. Prüfung durchführen — Workflow
- Typ: fullstack
- Beschreibung: Mehrstufiger Workflow: Prüfmittel auswählen → Checkliste → Ergebnis + Fotos → Zusammenfassung + Unterschrift.
- Abhängig von: 3, 5
- Testbar durch: Kompletter Workflow durchspielbar

### 7. PDF-Prüfprotokoll
- Typ: backend
- Beschreibung: Automatische PDF-Generierung nach abgeschlossener Prüfung. WeasyPrint mit Firmenlogo, Ergebnis, Checkliste, Unterschrift.
- Abhängig von: 6
- Testbar durch: PDF wird generiert mit korrekten Daten

### 8. Benutzer- und Rechteverwaltung
- Typ: backend
- Beschreibung: JWT-Auth. Rollen: Admin, Prüfer, Betrachter. Middleware, bcrypt.
- Abhängig von: keine
- Testbar durch: Login funktioniert, rollenbasierter Zugriff korrekt
