Starte und prüfe die PrüfPilot-Entwicklungsumgebung:

1. Prüfe ob Docker läuft
2. Starte `docker compose up -d` im Projektroot
3. Warte auf den Health-Check: `curl -s http://localhost:8000/health`
4. Prüfe ob das Frontend erreichbar ist: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`
5. Führe ausstehende Alembic-Migrationen aus: `docker compose exec backend alembic upgrade head`
6. Zeige eine Zusammenfassung mit dem Status aller Services (DB, Backend, Frontend) und den URLs:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Datenbank: localhost:5432
