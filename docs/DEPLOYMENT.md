# PrüfPilot — Deployment & Go-Live

**Version:** 0.2.0
**Zielumgebung:** Hetzner Cloud (Recommended)
**Stand:** 2026-04-03

---

## 1. Server-Voraussetzungen

### Empfohlene Infrastruktur (Hetzner Cloud)

| Komponente | Spec | Kosten | Hinweis |
|-----------|------|--------|--------|
| **App Server** | CPX21 (2 vCPU, 4 GB RAM) | ~13€/Monat | Für 100-500 Org. Skala mit CPX31 für 500+ |
| **Datenbank** | PostgreSQL 16 (Managed) | ~15€/Monat | 50 GB Storage, Backup inkl. |
| **Object Storage (S3)** | Hetzner S3 | ~0.29€/100GB/Mt | 1 TB = ~3€/Mt |
| **Backup Storage** | Backup Space | ~5€/Monat | Für DB-Backups |
| **Load Balancer** (optional) | Hetzner LB | ~5€/Monat | Ab 2+ Instanzen |
| **Reverse Proxy/WAF** | Cloudflare | Free - $20/Mt | Recommended: Pro ($20/Mt) für DDoS-Protection |
| **Monitoring** | Sentry | Free - $99/Mt | Free Tier für bis zu 5000 Events/Monat |
| **E-Mail Service** | Postmark | Pay-as-you-go | ~$0.01 pro Email |
| **Domain + SSL** | Domains.com | ~10€ - 40€/Jahr | SSL via Let's Encrypt (kostenlos) |

**Gesamtbudget Start:** ~50€/Monat (ohne Postmark)

### Server-Anforderungen (Minimal)

```yaml
CPU: 2 vCPU
RAM: 4 GB
Storage: 50 GB SSD
Bandbreite: 20 TB/Mt
Betriebssystem: Ubuntu 22.04 LTS
Docker: 24.x+
Docker Compose: 2.20+
```

### Software-Stack auf dem Server

```
Ubuntu 22.04 LTS
├── Docker Engine (latest)
├── Docker Compose (2.20+)
├── PostgreSQL 16 (oder managed)
├── Nginx/Caddy (Reverse Proxy)
├── Certbot (Let's Encrypt SSL)
├── Fail2Ban (Brute-Force-Schutz)
└── Logrotate (Log-Rotation)
```

---

## 2. Deployment-Schritte

### Phase 1: Server-Setup (ca. 30 Minuten)

#### 2.1 Server erstellen

```bash
# In Hetzner Cloud Console:
# - CPX21 Ubuntu 22.04 LTS
# - SSH-Key hinzufügen
# - Floating IP erstellen (optional, für mehrere Server)
```

#### 2.2 Initiales Setup

```bash
# SSH einloggen
ssh root@<server-ip>

# System updaten
apt-get update && apt-get upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installieren
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# User erstellen für Deployment
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# SSH-Key für Deploy-User
su - deploy
mkdir .ssh && chmod 700 .ssh
# Kopiere Public-Key der CI/CD

# Working Directory
mkdir -p /home/deploy/pruefpilot
cd /home/deploy/pruefpilot
```

#### 2.3 Firewall konfigurieren

```bash
# UFW aktivieren
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (für Certbot)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Phase 2: Docker Compose Production Setup (ca. 45 Minuten)

#### 2.4 .env für Production erstellen

Auf dem Server in `/home/deploy/pruefpilot/.env`:

```bash
# ─── APP ───────────────────────────────────────────────────
APP_NAME=PrüfPilot
APP_ENV=production
APP_URL=https://app.pruefpilot.de
API_URL=https://api.pruefpilot.de
DEBUG=False

# ─── SECRETS (Generieren mit: python -c 'import secrets; print(secrets.token_urlsafe(32))') ───
SECRET_KEY=<GENERATE-SECURE-TOKEN>

# ─── DATABASE (Hetzner Managed PostgreSQL) ───────────────
DATABASE_URL=postgresql+asyncpg://pruefpilot:${DB_PASSWORD}@pg-db.hetzner.cloud:5432/pruefpilot
DATABASE_URL_SYNC=postgresql://pruefpilot:${DB_PASSWORD}@pg-db.hetzner.cloud:5432/pruefpilot

# ─── S3 (Hetzner Object Storage) ──────────────────────────
S3_ENDPOINT=https://s3.eu-central-1.hetzner.com
S3_BUCKET=pruefpilot-prod
S3_REGION=eu-central-1
S3_ACCESS_KEY=<FROM-HETZNER>
S3_SECRET_KEY=<FROM-HETZNER>

# ─── EMAIL (Postmark) ──────────────────────────────────────
POSTMARK_API_KEY=<FROM-POSTMARK>
FROM_EMAIL=noreply@pruefpilot.de

# ─── KI (Anthropic) ────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-<FROM-ANTHROPIC>

# ─── MONITORING (Sentry) ──────────────────────────────────
SENTRY_DSN=https://<key>@sentry.io/<project>

# ─── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=["https://app.pruefpilot.de","https://pruefpilot.de"]
```

**Sichere speichern (GitHub Secrets):**
- DB_PASSWORD (Zufälliges Passwort)
- S3_ACCESS_KEY / S3_SECRET_KEY
- ANTHROPIC_API_KEY
- POSTMARK_API_KEY
- SECRET_KEY

#### 2.5 Docker Compose für Production

Erstelle `/home/deploy/pruefpilot/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Reverse Proxy mit Certbot
  reverse-proxy:
    image: caddy:2-alpine
    container_name: caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - pruefpilot-net
    environment:
      ACME_AGREE: "true"

  # FastAPI Backend
  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.prod
    container_name: pruefpilot-backend
    restart: always
    expose:
      - 8000
    environment:
      APP_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      DATABASE_URL_SYNC: ${DATABASE_URL_SYNC}
      SECRET_KEY: ${SECRET_KEY}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_BUCKET: ${S3_BUCKET}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      POSTMARK_API_KEY: ${POSTMARK_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      SENTRY_DSN: ${SENTRY_DSN}
      CORS_ORIGINS: ${CORS_ORIGINS}
    networks:
      - pruefpilot-net
    depends_on:
      - reverse-proxy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend (pre-built static)
  frontend:
    image: nginx:alpine
    container_name: pruefpilot-frontend
    restart: always
    volumes:
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - pruefpilot-net
    expose:
      - 80

networks:
  pruefpilot-net:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:
```

#### 2.6 Caddyfile für HTTPS + Reverse Proxy

`/home/deploy/pruefpilot/Caddyfile`:

```caddy
api.pruefpilot.de {
    encode gzip

    # Reverse Proxy zum Backend
    reverse_proxy backend:8000 {
        # Preserve original Host header
        header_up Host {http.request.header.Host}
        header_up X-Real-IP {http.request.remote.host}
        header_up X-Forwarded-For {http.request.remote.host}
        header_up X-Forwarded-Proto https
    }

    # Security Headers
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"
    header X-XSS-Protection "1; mode=block"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Permissions-Policy "camera=(), microphone=(), geolocation=()"

    # Logging
    log {
        output file /var/log/caddy/api.log {
            roll_size 10mb
            roll_keep 3
        }
    }
}

app.pruefpilot.de {
    encode gzip

    # Reverse Proxy zum Frontend
    reverse_proxy frontend:80

    # Security Headers
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"
    header X-XSS-Protection "1; mode=block"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Permissions-Policy "camera=(self), microphone=(), geolocation=()"

    # Cache for static assets
    @static {
        path /assets/* /favicon.ico
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # HTML - No cache (SPA routing)
    @html {
        path *.html /
    }
    header @html Cache-Control "public, max-age=0, must-revalidate"
}

# Redirect pruefpilot.de → app.pruefpilot.de
pruefpilot.de {
    redir https://app.pruefpilot.de{uri} permanent
}

# Www-Subdomain
www.pruefpilot.de {
    redir https://app.pruefpilot.de{uri} permanent
}
```

#### 2.7 Nginx Config für Frontend

`/home/deploy/pruefpilot/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;

    gzip on;
    gzip_types text/plain text/css text/js text/xml text/javascript application/javascript application/xml+rss;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # No cache for index.html
        location = /index.html {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
```

### Phase 3: Datenbank-Migration (ca. 30 Minuten)

#### 2.8 DB Initial Setup

```bash
# In den Backend-Container gehen
docker exec -it pruefpilot-backend bash

# Alembic Migrations ausführen
cd /app && alembic upgrade head

# Exit
exit
```

#### 2.9 Demo-Daten NICHT auf Production!

Stelle sicher:
```bash
# Keine Seed-Daten im Prod-Setup
# Falls Dump nötig:
pg_dump -h localhost -U pruefpilot pruefpilot > /backups/backup-prod.sql
```

### Phase 4: Deployment (ca. 15 Minuten)

#### 2.10 Docker Images bauen

```bash
cd /home/deploy/pruefpilot

# Baue optimierte Production Images
docker build -f docker/Dockerfile.prod -t pruefpilot-backend:latest .
docker build -f docker/Dockerfile.frontend -t pruefpilot-frontend:latest .

# Optional: Push zu Registry (z.B. Docker Hub / Hetzner Registry)
docker tag pruefpilot-backend:latest <registry>/pruefpilot-backend:latest
docker push <registry>/pruefpilot-backend:latest
```

#### 2.11 Container starten

```bash
docker-compose -f docker-compose.prod.yml up -d

# Logs überprüfen
docker-compose -f docker-compose.prod.yml logs -f backend

# Health-Check
curl -I https://api.pruefpilot.de/health
# Sollte HTTP 200 zurückgeben
```

---

## 3. Domain & SSL

### 3.1 Domain registrieren

- Registrar: Domains.com, Hetzner Domains, oder similär
- A-Record auf Server-IP zeigen
- MX-Records für E-Mail (falls nötig)

**Beispiel Hetzner DNS:**
```
api.pruefpilot.de    A        <server-ip>
app.pruefpilot.de    A        <server-ip>
www.pruefpilot.de    CNAME    app.pruefpilot.de
mail.pruefpilot.de   MX       mail.<provider>
```

### 3.2 SSL mit Let's Encrypt (via Caddy)

Caddy verwaltet SSL automatisch:
- Generiert Zertifikate automatisch
- Erneuert 30 Tage vor Ablauf
- Speichert Zertifikate in `caddy_data`

```bash
# Überprüfe SSL-Status
curl -I https://api.pruefpilot.de
# Sollte 200 OK mit SSL-Zertifikat zeigen
```

---

## 4. Monitoring

### 4.1 Sentry aktivieren

```python
# backend/app/main.py, oben hinzufügen:
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # 10% Sampling
    environment=settings.APP_ENV,
)
```

Konfiguriere Alerts in Sentry Dashboard:
- Critical Errors → Slack/E-Mail
- Performance > 500ms → Slack
- Release Tracking enabled

### 4.2 Health-Check Monitoring

```bash
# Cron Job (jeden 5 Min):
*/5 * * * * curl -f https://api.pruefpilot.de/health || mail -s "PrüfPilot API Down" patrick@example.com
```

Oder nutze externes Monitoring (z.B. Uptime Robot):
- URL: `https://api.pruefpilot.de/health`
- Check-Intervall: 5 Minuten
- Alert bei Failure

### 4.3 Logs aggregieren

```bash
# Optional: Logs zu ELK/Grafana/Datadog senden
# In Caddy Caddyfile:
log {
    output file /var/log/caddy/access.log {
        roll_size 100mb
        roll_keep 7
    }
}

# Log-Rotation (logrotate)
sudo vi /etc/logrotate.d/pruefpilot
```

---

## 5. Backup-Strategie

### 5.1 Datenbank-Backup

**Automatisch via Hetzner Managed DB:**
- Tägliche Backups (7 Tage retention)
- Point-in-time Recovery (24 Stunden)

**Zusätzlich: Manuelles Backup**

```bash
# Script: `/home/deploy/backup.sh`
#!/bin/bash
DB_USER="pruefpilot"
DB_HOST="pg-db.hetzner.cloud"
DB_NAME="pruefpilot"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup-$DATE.sql
gzip $BACKUP_DIR/backup-$DATE.sql

# Upload zu S3
s3cmd put $BACKUP_DIR/backup-$DATE.sql.gz s3://pruefpilot-backups/

# Keep only last 30 days
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete
```

Cron Job:
```bash
# Daily at 2 AM
0 2 * * * /home/deploy/backup.sh >> /var/log/pruefpilot-backup.log 2>&1
```

### 5.2 File-Uploads (S3) Backup

S3 hat interne Replication, aber zusätzlicher Backup ist klug:

```bash
# Wöchentliches Backup der S3-Bucket
0 3 * * 0 aws s3 sync s3://pruefpilot-prod s3://pruefpilot-backups/s3-$(date +\%Y\%m\%d)/ --region eu-central-1
```

### 5.3 Restore-Plan

```bash
# DB-Restore (im Notfall)
psql -h pg-db.hetzner.cloud -U pruefpilot -d pruefpilot < /backups/backup-YYYYMMDD.sql

# S3-Restore
s3cmd sync s3://pruefpilot-backups/s3-YYYYMMDD/ s3://pruefpilot-prod/
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Deployment

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: docker.io
  IMAGE_NAME: pruefpilot

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Backend
        run: docker build -f docker/Dockerfile.prod -t ${{ env.REGISTRY }}/pruefpilot-backend:latest .

      - name: Push to Registry
        run: |
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          docker push ${{ env.REGISTRY }}/pruefpilot-backend:latest

      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: deploy
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd ~/pruefpilot
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

      - name: Health Check
        run: |
          sleep 10
          curl -f https://api.pruefpilot.de/health || exit 1
```

---

## 7. iOS/Mobile App — Optionen

### 7.1 PWA (Empfohlen als erster Schritt)

**Vorteil:** Sofort einsatzbereit, kein App-Store nötig, Offline-Support

**Implementierung:**

1. **Service Worker** (`frontend/public/sw.js`):
```javascript
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/',
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
```

2. **Web Manifest** (`frontend/public/manifest.json`):
```json
{
  "name": "PrüfPilot",
  "short_name": "PrüfPilot",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-540.png",
      "sizes": "540x720"
    }
  ]
}
```

3. **HTML Head** (`frontend/index.html`):
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#000000" />
<meta name="description" content="Arbeitsschutz-Plattform für den Mittelstand" />
<link rel="manifest" href="/manifest.json" />
<link rel="icon" href="/favicon.ico" />
```

4. **Kamera-Zugriff** (bereits im Code):
```javascript
// Browser API (funktioniert schon, ist aber mit HTTPS nötig)
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
});
```

**Test auf iOS/Android:**
- Chrome/Firefox/Safari → "Zum Startbildschirm hinzufügen"
- App wird im Standalone-Mode geöffnet
- Offline-Funktionalität via Service Worker

### 7.2 Native App (Mittelfristig)

**Optionen:**
1. **React Native** — JavaScript → iOS + Android Binary
2. **Flutter + WebView** — Modern, schnell
3. **Capacitor** — Web-Code → Native Wrapper

**Empfehlung:** Capacitor mit bestehender React-Web-App
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm run build
npx cap add ios
npx cap add android
```

**Features für Native:**
- Push Notifications (Firebase)
- Camera (besser als Browser API)
- Offline-Storage (SQLite)
- App-Store Distribution

---

## 8. Go-Live Checkliste

### Pre-Launch (48h vorher)

- [ ] Alle Secrets in GitHub Secrets oder Hetzner Secret Manager
- [ ] `.env` in `.gitignore` ✓
- [ ] DATABASE_URL auf Production-DB gesetzt
- [ ] SECRET_KEY generiert und deployed
- [ ] CORS_ORIGINS auf Production-Domäne
- [ ] Sentry DSN konfiguriert
- [ ] S3-Bucket erstellt und getestet
- [ ] Postmark API-Key konfiguriert
- [ ] SMTP-Test: Willkommens-E-Mail funktioniert?
- [ ] Anthropic API-Key aktiv

### Infrastructure

- [ ] Hetzner Server → CPX21+ (2 vCPU, 4GB RAM)
- [ ] PostgreSQL Managed DB → 50GB, Backup enabled
- [ ] Hetzner S3 Bucket → Region EU-Central
- [ ] Floating IP reserviert (optional)
- [ ] Backup Storage konfiguriert
- [ ] Cloudflare / DDoS-Protection konfiguriert

### Domain & SSL

- [ ] Domain registriert
- [ ] A-Records auf Server-IP gesetzt
- [ ] SSL-Zertifikate via Let's Encrypt (Caddy)
- [ ] HTTPS-Redirect funktioniert
- [ ] HSTS-Header vorhanden (Caddy)

### Application

- [ ] Datenbank-Migrations ausgeführt (`alembic upgrade head`)
- [ ] Keine Demo-Daten auf Production
- [ ] Logging aktiviert (Sentry + Docker Logs)
- [ ] Rate-Limiting aktiviert
- [ ] Brute-Force-Protection für Login
- [ ] Signature-Upload-Validierung aktiv

### Monitoring & Alerts

- [ ] Health-Check Endpoint funktioniert
- [ ] Sentry-Alerts konfiguriert (kritische Fehler)
- [ ] Uptime-Monitoring aktiv (Uptime Robot / StatusCake)
- [ ] Backup-Job läuft täglich
- [ ] Log-Rotation konfiguriert

### Security

- [ ] Firewall → Only 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] SSH-Key Authentication (kein Passwort)
- [ ] Fail2Ban installiert für Brute-Force
- [ ] HTTPS erzwungen (keine HTTP-Fallback)
- [ ] Security Headers gesetzt (CSP, X-Frame-Options, etc.)
- [ ] CORS auf spezifische Origins limitiert
- [ ] API-Keys nicht in Logs sichtbar

### Compliance & Legal

- [ ] Datenschutzerklärung veröffentlicht
- [ ] Impressum mit Verantwortlichen
- [ ] DSGVO Cookie-Banner (wenn nötig)
- [ ] Widerrufsrecht dokumentiert
- [ ] Stripe Webhooks konfiguriert
- [ ] Terms of Service publiziert (optional für Beta)

### Testing

- [ ] Homepage laden → 200 OK
- [ ] Login/Register → funktioniert
- [ ] Prüfung starten → funktioniert
- [ ] PDF-Export → generiert und downloadbar
- [ ] E-Mail-Versand → Test erfolgreich
- [ ] CSV-Import → funktioniert
- [ ] QR-Codes → scannable und funktional
- [ ] Mobile (PWA) → "Add to Homescreen" funktioniert
- [ ] Offline-Modus → Service Worker lädt Bilder

### Performance & Capacity

- [ ] Page Load Time < 3s (Lighthouse > 80)
- [ ] API Response Time < 500ms (95th percentile)
- [ ] DB-Queries optimiert (keine N+1 Problems)
- [ ] S3-Upload Performance > 1MB/s
- [ ] Kein Memory-Leak (Docker Stats nach 24h stabil)

### Documentation

- [ ] Runbook für tägliche Operations
- [ ] Disaster Recovery Plan (DB-Restore, S3-Restore)
- [ ] Incident Response Playbook
- [ ] Onboarding-Guide für Support-Team
- [ ] API-Dokumentation aktuell (/docs accessible)

### Stakeholder

- [ ] Patrick & Gründer reviewed Go-Live Plan
- [ ] Demo-Account für Sales/Marketing
- [ ] Beta-Tester-Liste (10-20 Kunden)
- [ ] Support-Ticket-System aktiv (ggf. Slack)
- [ ] Analytics/Telemetrie (optional: Mixpanel/Posthog)

---

## 9. Post-Launch Operations

### Ersten 7 Tage (Hypervigilance)

```bash
# Daily Checks
- Logs für Fehler/Warnings überprüfen
- API Response Time monitoren
- Sentry für neue Exceptions
- User Feedback sammeln (Direct Messages)
- Performance Metrics (DB Query Time)
```

### Wöchentlich

- [ ] Backup-Integrität testen (1 Restore)
- [ ] Security Patches überprüfen
- [ ] Database VACUUM & ANALYZE
- [ ] S3 Storage usage
- [ ] Cost Review (Hetzner, AWS, etc.)

### Monatlich

- [ ] Traffic Analysis
- [ ] User Retention Metrics
- [ ] Feature Requests sammeln
- [ ] Security Audit Log review
- [ ] Dependencies aktualisieren (renovate bot)

---

## 10. Skalierung (wenn nötig)

### Wenn 500+ Nutzer:

1. **Load Balancer** hinzufügen (Hetzner LB)
2. **Zweiter App-Server** (CPX21)
3. **Database Replication** (Primary + Replica)
4. **Redis-Cache** für Rate-Limiter + Sessions
5. **CDN** für statische Dateien (Cloudflare)

### Wenn 2000+ Nutzer:

1. **Kubernetes** (Hetzner Kubernetes Service)
2. **Separate DB-Cluster** (PostgreSQL HA)
3. **Distributed Caching** (Redis Sentinel)
4. **Microservices** (async PDF-Generation, Email-Queue)

---

## Notfall-Kontakte & Escalation

```
Monitoring/Alerts: Sentry + Uptime Robot
On-Call: Patrick (whatsapp/telegram)
Database Emergency: Hetzner Support
Security Issue: Sicherheit@pruefpilot.de
```

---

**Stand:** 2026-04-03
**Nächste Review:** 2026-05-03 (nach Go-Live)
