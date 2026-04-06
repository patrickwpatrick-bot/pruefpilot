# PrüfPilot

Die Arbeitsschutz-Zentrale für den deutschen Mittelstand.

## Tech-Stack

- **Backend:** Python / FastAPI / SQLAlchemy / PostgreSQL
- **Frontend:** React / TypeScript / Tailwind CSS / Vite
- **Infrastruktur:** Docker Compose / GitHub Actions

## Schnellstart (Docker)

```bash
# 1. Repository klonen
git clone <repo-url> && cd pruefpilot

# 2. Umgebungsvariablen erstellen
cp .env.example .env

# 3. Alles starten
./scripts/start-dev.sh
```

Danach erreichbar unter:

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:8000        |
| API Docs | http://localhost:8000/docs   |
| DB       | localhost:5432               |

## Ohne Docker (manuell)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Datenbank
PostgreSQL muss lokal laufen. Verbindung konfigurieren in `.env`.

```bash
cd backend
alembic upgrade head    # Migrationen ausführen
```

## Projektstruktur

```
pruefpilot/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # API Endpunkte
│   │   ├── core/          # Config, DB, Security
│   │   ├── models/        # SQLAlchemy Models
│   │   ├── schemas/       # Pydantic Schemas
│   │   ├── services/      # Business Logic
│   │   └── utils/         # Hilfsfunktionen
│   ├── alembic/           # DB Migrationen
│   ├── tests/             # pytest Tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React Komponenten
│   │   ├── pages/         # Seiten
│   │   ├── hooks/         # Custom Hooks
│   │   ├── lib/           # API Client etc.
│   │   └── types/         # TypeScript Types
│   └── package.json
├── docker/                # Dockerfiles
├── docker-compose.yml
└── scripts/               # Dev-Skripte
```

## Tests

```bash
cd backend
pytest
```

## API Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | /api/v1/auth/register | Registrierung |
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/me | Aktueller User |
| GET/POST | /api/v1/arbeitsmittel | Arbeitsmittel CRUD |
| GET/POST | /api/v1/standorte | Standorte CRUD |
| POST | /api/v1/pruefungen | Prüfung starten |
| PUT | /api/v1/pruefungen/{id}/punkte/{id} | Prüfpunkt bewerten |
| POST | /api/v1/pruefungen/{id}/maengel | Mangel erfassen |
| PUT | /api/v1/pruefungen/{id}/abschliessen | Prüfung abschließen + sperren |
| GET | /health | Health Check |
