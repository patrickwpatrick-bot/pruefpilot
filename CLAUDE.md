# PruefPilot - Projektkontext & Code-Konventionen

> Diese Datei beschreibt die technischen Konventionen für PrüfPilot-Code.
> Aufgabenliste und Projekt-Status: siehe `projects/pruefpilot.md` (eine Ebene höher)

## Projektbeschreibung

PrüfPilot ist eine **Arbeitsschutz-Plattform für den deutschen Mittelstand**. Die App verwaltet Prüfungen, Checklisten, Mängel, Unterweisungen, Gefährdungsbeurteilungen, Gefahrstoffe, Fremdfirmen und Mitarbeiter. Multi-Mandanten-fähig mit Stripe-Billing.

## Tech-Stack

- **Backend:** Python 3.12 / FastAPI 0.115 / SQLAlchemy 2.0 (async) / PostgreSQL 16 / Alembic
- **Frontend:** React 18 / TypeScript 5.6 / Tailwind CSS 3.4 / Vite 6 / React Router 6
- **Auth:** JWT (python-jose) mit Access-Token (15 min) + Refresh-Token (7 Tage), bcrypt
- **Infra:** Docker Compose (db + backend + frontend), GitHub Actions
- **Services:** Hetzner S3 (Dateispeicher), Postmark (E-Mail), Stripe (Billing), Anthropic API (AI), Sentry (Monitoring)

## Projektstruktur

```
backend/
  app/
    main.py              # FastAPI-Entry, Middleware (CORS, Rate-Limit, Security-Headers)
    api/v1/router.py     # Zentral-Router, bindet alle Sub-Router ein
    api/v1/*.py           # Endpunkt-Module (auth, pruefungen, checklisten, maengel, ...)
    core/config.py        # pydantic-settings (Settings aus .env)
    core/database.py      # Async SQLAlchemy Engine + Session (asyncpg)
    core/security.py      # JWT encode/decode, password hashing, get_current_user_id
    core/audit.py         # Audit-Trail Helfer
    core/plan_limits.py   # Plan-Beschränkungen (Free/Pro/Enterprise)
    models/*.py           # SQLAlchemy ORM-Modelle (DeclarativeBase)
    schemas/*.py          # Pydantic Request/Response-Schemas
    services/*.py         # Business-Logik (email, scheduler, storage, stripe)
  alembic/               # DB-Migrationen
  tests/                 # pytest + pytest-asyncio
  requirements.txt

frontend/
  src/
    App.tsx              # React Router Konfiguration
    main.tsx             # Entry Point
    pages/*.tsx          # Seitenkomponenten (Dashboard, Pruefungen, Login, ...)
    components/
      layout/AppLayout.tsx
      auth/ProtectedRoute.tsx
      ui/*.tsx            # Wiederverwendbare UI-Komponenten
    hooks/useAuth.ts     # Auth-Hook
    lib/api.ts           # Axios API-Client
    types/index.ts       # TypeScript-Typen
    config/branchen.ts   # Branchenkonfiguration
    data/equipment-types.ts
  package.json
  tailwind.config.js
  vite.config.ts
```

## Entwicklung starten

```bash
# Mit Docker (empfohlen):
./scripts/start-dev.sh

# Manuell:
# Terminal 1 - Backend:
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Terminal 2 - Frontend:
cd frontend && npm install && npm run dev
```

**URLs:** Frontend http://localhost:5173 | Backend http://localhost:8000 | API-Docs http://localhost:8000/docs

## Architektur-Konventionen

### Backend

- **Async überall:** Alle DB-Operationen verwenden `AsyncSession` via `get_db()` Dependency
- **Multi-Tenancy:** JWT enthält `sub` (user_id) und `org` (organisation_id) — Daten immer nach `organisation_id` filtern
- **API-Prefix:** Alle Endpunkte unter `/api/v1/`
- **Neuer Router:** In `api/v1/` erstellen, dann in `api/v1/router.py` importieren und einbinden
- **Neues Modell:** In `models/` erstellen, in `models/__init__.py` importieren, dann Alembic-Migration generieren
- **Migration erstellen:** `cd backend && alembic revision --autogenerate -m "beschreibung"`
- **Migration ausführen:** `cd backend && alembic upgrade head`
- **Sprache:** API-Fehlermeldungen auf Deutsch, Code/Variablen auf Deutsch wo fachlich sinnvoll (Prüfung, Mangel, etc.)

### Frontend

- **Routing:** In `App.tsx` definiert, geschützte Routen via `<ProtectedRoute>`
- **API-Aufrufe:** Über `lib/api.ts` (Axios-Instanz mit Auth-Interceptor)
- **Styling:** Tailwind CSS Utility-Klassen, kein separates CSS
- **Icons:** lucide-react
- **Toasts:** react-hot-toast
- **Datumsformatierung:** date-fns mit deutscher Locale

### Namenskonventionen

- Backend-Dateien: snake_case (deutsch: `gefaehrdungsbeurteilung.py`, `fremdfirmen.py`)
- Frontend-Seiten: PascalCase (deutsch: `Gefaehrdungsbeurteilungen.tsx`, `Fremdfirmen.tsx`)
- API-Endpunkte: kebab-case oder deutsche Begriffe (`/api/v1/pruefungen`, `/api/v1/maengel`)
- DB-Tabellen: snake_case plural (`pruefungen`, `maengel`, `checklisten`)

## Wichtige Patterns

### Neuen API-Endpunkt erstellen
1. Model in `backend/app/models/` anlegen
2. Schema in `backend/app/schemas/` anlegen
3. Router in `backend/app/api/v1/` anlegen
4. Router in `backend/app/api/v1/router.py` importieren und einbinden
5. Alembic-Migration erstellen und ausführen

### Auth-Dependency in Endpunkten
```python
from app.core.security import get_current_user_id, get_current_org_id
from app.core.database import get_db

@router.get("/beispiel")
async def beispiel(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
):
    ...
```

### Frontend-Seite erstellen
1. Neue `.tsx`-Datei in `frontend/src/pages/`
2. Route in `App.tsx` hinzufügen (ggf. innerhalb `<ProtectedRoute>`)
3. API-Aufrufe über `api.get()` / `api.post()` aus `lib/api.ts`

## Tests

```bash
cd backend && pytest                    # Alle Tests
cd backend && pytest tests/test_X.py    # Einzelner Test
cd frontend && npm run lint             # Frontend Linting
cd frontend && npm run build            # TypeScript-Check + Build
```

## Umgebungsvariablen

Konfiguration in `.env` (nicht committen). Vorlage: `.env.example`. Wichtige Variablen:
- `DATABASE_URL` / `DATABASE_URL_SYNC` — PostgreSQL-Verbindung
- `SECRET_KEY` — JWT-Signierung
- `S3_*` — Hetzner Object Storage
- `POSTMARK_API_KEY` — E-Mail-Versand
- `ANTHROPIC_API_KEY` — AI-Funktionen
- `SENTRY_DSN` — Error-Tracking
