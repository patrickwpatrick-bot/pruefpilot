#!/bin/bash
# PrüfPilot - Lokale Entwicklungsumgebung starten
# Voraussetzung: Docker + Docker Compose installiert

set -e

echo "🚀 PrüfPilot Entwicklungsumgebung wird gestartet..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert."
    echo "   Installiere Docker Desktop: https://docker.com/get-started"
    exit 1
fi

# Copy .env if not exists
if [ ! -f .env ]; then
    echo "📋 Erstelle .env aus .env.example..."
    cp .env.example .env
fi

# Start services
echo "🐳 Starte Docker Container..."
docker compose up -d --build

echo ""
echo "⏳ Warte auf Datenbank..."
sleep 5

# Run migrations
echo "📦 Führe Datenbankmigrationen aus..."
docker compose exec backend alembic upgrade head 2>/dev/null || echo "⚠️  Migrationen noch nicht erstellt (wird beim ersten alembic revision gemacht)"

echo ""
echo "✅ PrüfPilot läuft!"
echo ""
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   Datenbank: localhost:5432"
echo ""
echo "   Stoppen:   docker compose down"
echo "   Logs:      docker compose logs -f"
