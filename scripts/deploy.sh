#!/bin/bash
# PrüfPilot — Deployment Script for Hetzner
set -e

echo "🚀 PrüfPilot Deployment starting..."

# Pull latest code
cd /opt/pruefpilot
git pull origin main

# Build and restart containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run database migrations
docker compose exec -T backend alembic upgrade head

# Health check
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Deploy erfolgreich! Health check: $HTTP_CODE"
else
    echo "❌ Health check fehlgeschlagen: $HTTP_CODE"
    docker compose logs backend --tail 50
    exit 1
fi

echo "🎉 PrüfPilot v$(date +%Y.%m.%d) deployed"
