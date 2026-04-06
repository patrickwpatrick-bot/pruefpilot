# PrüfPilot Security Review

**Datum:** 2026-04-03
**Version:** 0.2.0
**Reviewed by:** Claude Agent

---

## Zusammenfassung

**Status: GELB — Kritische und Warnung-Level Befunde müssen vor Go-Live behoben werden**

Die Anwendung hat eine solide Basis mit korrekten Multi-Tenancy-Patterns und JWT-basierter Authentication. Es wurden jedoch mehrere kritische Sicherheitslücken identifiziert, die unverzüglich behoben werden müssen:

1. **KRITISCH**: Hardcodierte Secrets in Production-Config und Docker Compose
2. **KRITISCH**: Rate Limiting hat keine Brute-Force-Protection für Login
3. **KRITISCH**: Base64-Signatur-Upload (Path Traversal + RCE-Risiko)
4. **KRITISCH**: Fehlende Input-Validierung bei Wildcard-CORS
5. **WARNUNG**: S3 Fallback auf lokale Dateien kann zu File Disclosure führen
6. **WARNUNG**: Fehlende HTTPS-Enforcing außerhalb von HSTS-Header

---

## Geprüfte Bereiche

- ✓ JWT Token Configuration (Expiry, Refresh-Logik)
- ✓ Password Hashing (bcrypt + correct defaults)
- ✓ Multi-Tenancy Isolation (Datenbank-Queries)
- ✓ CORS Configuration
- ✓ Rate Limiting Implementation
- ✓ File Upload Handling (Images + Signatures)
- ✓ S3 Storage Configuration
- ✓ Security Headers Middleware
- ✓ API Input Validation
- ✓ Environment Variables & Secrets Management
- ✓ Git Configuration (.env exclusion)

---

## Befunde

### KRITISCH (Sofort beheben vor Production)

#### 1. Hardcodierte Secrets in config.py

**Datei:** `backend/app/core/config.py:22`

```python
SECRET_KEY: str = "dev-secret-key-change-in-production"
```

**Risiko:** Production-Deployments könnten mit diesem Defaultwert laufen. JWTs wären einfach zu fälschen.

**Behebung:**
- `SECRET_KEY` MUSS auf einen kryptographisch sicheren Zufallswert setzen
- Validierung in `config.py` hinzufügen: Exception werfen wenn nicht geändert
- In Docker Compose **NICHT** den Dev-Secret verwenden

**Priorität:** 🔴 BLOCKER

---

#### 2. Hardcodierte DB-Credentials in config.py + docker-compose.yml

**Datei:** `backend/app/core/config.py:18-19` + `docker-compose.yml:9,29-30`

```python
DATABASE_URL: str = "postgresql+asyncpg://pruefpilot:pruefpilot_dev@localhost:5432/pruefpilot"
```

**Risiko:** Production-DB-Credentials könnten im Code landen.

**Behebung:**
- Alle DB-Credentials MÜSSEN aus `.env` kommen
- Default-Credentials nur für `development` nutzen
- `docker-compose.yml` sollte auch aus `.env` die Secrets laden oder separates `.env.docker` verwenden
- `DATABASE_URL` und `DATABASE_URL_SYNC` MÜSSEN in `.env` gesetzt sein

**Priorität:** 🔴 BLOCKER

---

#### 3. Keine Brute-Force-Protection auf Login-Endpoint

**Datei:** `backend/app/api/v1/auth.py:71-93`

**Problem:** Der `/auth/login`-Endpoint hat keine Brute-Force-Limitierung. Der generische Rate-Limiter (`main.py:96-120`) arbeitet, hat aber diese Schwächen:
- Limitierung basiert auf IP + Auth-Header (Token-Hash)
- Bei Login gibt es noch kein Token → nur IP wird berücksichtigt
- 100 Requests/Minute sind zu großzügig für Login (→ ~1.6 RPS)
- Kein exponentielles Backoff oder Account-Lockout

**Angriffsszenario:** Attacker probiert 100 Passwörter pro Minute pro IP-Adresse aus.

**Behebung:**
```python
# In auth.py: Decorators für Login + Register
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@limiter.limit("5/minute")  # 5 attempts per minute per IP
@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # ... existing code
```

**Alternativ (empfohlen):**
- Nach 3 Failed Logins: Account für 15 Minuten sperren
- Log-Eintrag für Monitoring
- Exponentiell ansteigende Delays pro IP

**Priorität:** 🔴 KRITISCH

---

#### 4. Base64-Signatur-Upload: Keine Validierung

**Datei:** `backend/app/api/v1/pruefungen.py:262-271`

```python
if data.unterschrift_url and data.unterschrift_url.startswith("data:image/"):
    try:
        import base64
        header, b64_data = data.unterschrift_url.split(",", 1)
        img_bytes = base64.b64decode(b64_data)
        # ... upload_file(img_bytes, ...)
    except Exception:
        pass  # Silently fail
```

**Risiken:**
1. **Keine MIME-Type-Validierung nach Decode**: Base64-String könnte ein PNG-Header vortäuschen, aber tatsächlich ein ZIP/EXE sein
2. **Keine Größenlimit vor Upload**: Ein großes Base64-String könnte Memory-DoS verursachen
3. **Silent Fail**: Exception wird ignoriert — User weiß nicht, dass Upload fehlgeschlagen ist
4. **Path Traversal in Filename**: `unterschrift_{pruefung.id}.png` ist OK, aber `upload_file()` sollte Filenames sanitizen

**Behebung:**
```python
if data.unterschrift_url and data.unterschrift_url.startswith("data:image/"):
    try:
        # Größenlimit: max 1 MB signature
        if len(data.unterschrift_url) > 1024 * 1024 * 1.34:  # Base64 overhead
            raise ValueError("Signatur zu groß")

        import base64
        header, b64_data = data.unterschrift_url.split(",", 1)

        # Validiere MIME-Type Header
        if not header.startswith("data:image/"):
            raise ValueError("Nur PNG/JPG erlaubt")

        img_bytes = base64.b64decode(b64_data)

        # Validate actual image (use Pillow)
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(img_bytes))
        if img.format not in ('PNG', 'JPEG'):
            raise ValueError(f"Ungültiges Format: {img.format}")

        # Upload
        url = await upload_file(img_bytes, f"unterschrift_{pruefung.id}.png", "image/png")
        pruefung.unterschrift_url = url
    except Exception as e:
        logger.error("Signature upload failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Signatur-Upload fehlgeschlagen: {str(e)}")
```

**Priorität:** 🔴 KRITISCH

---

#### 5. CORS `allow_headers=["*"]` — Zu Permissiv

**Datei:** `backend/app/main.py:60-66`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_headers=["*"],  # ← PROBLEM
    # ...
)
```

**Risiko:** Allows **all** headers including custom ones. Kombiniert mit CORS-Preflight-Requests könnte ein Attacker beliebige Header injizieren.

**Behebung:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_credentials=True,
)
```

**Priorität:** 🟠 WARNUNG (aber mit allow_origins Config OK)

---

### WARNUNG (Vor Go-Live beheben)

#### 6. Rate Limiter Speicher-Leak

**Datei:** `backend/app/main.py:21, 95-120`

```python
_rate_limit_store: dict[str, list[float]] = defaultdict(list)

# Cleanup nur in Middleware:
_rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_WINDOW]
```

**Problem:**
- Bei Long-Running-Prozess ohne Requests wächst Dictionary unbegrenzt
- Keys mit alten Timestamps werden nie entfernt
- Nach 1 Monat mit 1000s Clients: Memory-Leak

**Behebung:**
```python
# Periodisches Cleanup starten (z.B. alle 5 Minuten)
async def cleanup_rate_limit_store():
    global _rate_limit_store
    while True:
        await asyncio.sleep(300)  # 5 minutes
        now = time()
        # Remove keys with all stale entries
        stale_keys = [
            key for key, times in _rate_limit_store.items()
            if not any(now - t < RATE_WINDOW for t in times)
        ]
        for key in stale_keys:
            del _rate_limit_store[key]
```

**Priorität:** 🟠 WARNUNG

---

#### 7. S3 Fallback ohne Zugriffskontrolle

**Datei:** `backend/app/services/storage.py:39-65`

```python
if _s3_configured():
    # ... S3 upload
else:
    # Fallback: local storage
    upload_dir = os.path.join(...)
    filepath = os.path.join(upload_dir, unique_name)
    with open(filepath, 'wb') as f:
        f.write(file_bytes)
    return f"/uploads/{unique_name}"
```

**Problem:**
1. Wenn S3-Credentials vergessen wurden, wird auf lokales Filesystem ausgewichen
2. Dateien sind unter `/uploads/` direkt abrufbar (kein Auth-Check vor Download)
3. In `main.py:126` sind die Uploads als StaticFiles gemountet

**Behebung:**
```python
# In main.py, REMOVE or protect static file mounting
# Stattdessen: Presigned URLs nur über API endpoint verteilen

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    org_id: str = Depends(_get_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Download file only for authorized users."""
    # Check DB: does user's org own this file?
    # Then return presigned S3 URL OR serve from disk with auth
```

**Priorität:** 🟠 WARNUNG (Mittel)

---

#### 8. JWT Token Exposure in Rate-Limiter Key

**Datei:** `backend/app/main.py:103-105`

```python
auth = request.headers.get("Authorization", "")
key = f"{client_ip}:{auth[:20]}" if auth else client_ip
```

**Problem:** JWT Token (20 chars) wird in Logs/Monitoring sichtbar, wenn Rate-Limiter-Statistiken gesammelt werden.

**Behebung:**
```python
# Hash den Auth-Header statt ihn direkt zu speichern
import hashlib

auth = request.headers.get("Authorization", "")
if auth:
    auth_hash = hashlib.sha256(auth.encode()).hexdigest()[:12]
    key = f"{client_ip}:{auth_hash}"
else:
    key = client_ip
```

**Priorität:** 🟠 WARNUNG (Niedrig, nur bei Logging-Leak)

---

#### 9. Fehlende Input-Validierung in CSV Import

**Datei:** `backend/app/api/v1/arbeitsmittel.py:225-337`

**Problem:**
- CSV-Zeilen werden direkt in DB eingefügt
- `baujahr` wird `int()` ohne Bereichsprüfung
- `intervall` hat keinen Min/Max-Check
- Keine Sanitization von Unicode-Characters (könnte DoS sein)

**Behebung:**
```python
try:
    baujahr = int(baujahr_str)
    if baujahr < 1900 or baujahr > 2100:
        raise ValueError(f"Baujahr muss zwischen 1900-2100 liegen")
except ValueError:
    errors.append({"zeile": i + 2, "fehler": "Baujahr ungültig", "daten": dict(row)})
    continue

try:
    intervall = int(intervall_str)
    if intervall < 1 or intervall > 120:
        raise ValueError("Intervall muss zwischen 1-120 Monaten liegen")
except ValueError:
    errors.append({"zeile": i + 2, "fehler": "Intervall ungültig", "daten": dict(row)})
    continue
```

**Priorität:** 🟠 WARNUNG (Niedrig, Datenqualität statt Security)

---

#### 10. Keine HTTPS-Enforcement außer in Production

**Datei:** `backend/app/main.py:81-90`

```python
if settings.APP_ENV == "production":
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

**Problem:** Nur in Production. Beim Testing/Staging läuft HTTP unverschlüsselt.

**Behebung:**
```python
if settings.APP_ENV in ("production", "staging"):
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

**Priorität:** 🟠 WARNUNG (Staging sollte auch sicher sein)

---

#### 11. Fehlende DSGVO-Compliance Checks

**Problem:** Nicht im Code, aber ein Go-Live-Blocker:
- Datenschutzerklärung ❌
- Impressum ❌
- Cookie-Banner (wegen Stripe, Anthropic API, Analytics) ❌
- Widerrufsrecht ❌

**Behebung:**
- `/datenschutz` statische Seite
- `/impressum` mit Verantwortlichen
- Cookie-Banner mit Opt-In/Opt-Out Logik

**Priorität:** 🔴 Go-Live-Blocker

---

### HINWEIS (Empfehlung)

#### 12. Logging & Monitoring

**Status:** Nicht implementiert

**Empfehlung:**
- Sentry (schon in Config) aktivieren für Error-Tracking
- Login-Fehler mit Timestamp + IP logger → wird für Brute-Force-Analyse wichtig
- Failed Auth Attempts tracken (für Account-Lockout)
- S3 Upload/Download Logs

**Priorität:** 🟢 Empfehlung

---

#### 13. Secrets Rotation

**Empfehlung:**
- `SECRET_KEY` sollte alle 90 Tage rotiert werden
- Plan: Zwei Keys parallel halten (current + previous) für JWT-Validierung
- Webhooks für Stripe sollten mit HMAC-SHA256 verifiziert werden

**Priorität:** 🟢 Empfehlung (für Production)

---

#### 14. Fehlende OAuth/SSO

**Status:** Nur Email+Password

**Empfehlung (für spätere Phase):**
- Google OAuth für firmenübergreifende Registrierung
- Microsoft Azure AD für Enterprise-Kunden
- Zertifikat-basierte Auth (für CAP-zertifizierte Prüfer?)

**Priorität:** 🟢 Empfehlung (Roadmap)

---

## Sicherheits-Checkliste für Go-Live

- [ ] SECRET_KEY mit `secrets.token_urlsafe(32)` generiert
- [ ] NICHT in der Config hartcodiert
- [ ] DB-Credentials NUR in `.env` (mit GitHub secret rotation)
- [ ] Brute-Force-Protection auf Login aktiviert
- [ ] Signatur-Upload: Pillow-Validierung + Size-Limits
- [ ] CORS: `allow_headers` spezifizieren statt `["*"]`
- [ ] Rate-Limiter: Memory-Cleanup implementiert
- [ ] S3-Fallback: Entweder deaktiviert oder mit Auth-Checks
- [ ] JWT Token-Hashing in Rate-Limiter-Key
- [ ] CSV Import: Input-Validierung (Ranges)
- [ ] HTTPS in Staging + Production erzwungen
- [ ] Datenschutzerklärung + Impressum
- [ ] DSGVO-Cookie-Banner (falls Tracking)
- [ ] `.env` in `.gitignore` ✓ (bereits korrekt)
- [ ] Sentry aktiviert + Error-Monitoring
- [ ] E-Mail-Bestätigung für Account-Erstellung (optional aber empfohlen)
- [ ] 2FA für Admin-Accounts (später)

---

## Deployment Security-Hardening

### Docker Production Image

Erstelle eine separate `Dockerfile.prod`:

```dockerfile
# Use slim base image
FROM python:3.12-slim

WORKDIR /app

# Install only production dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Non-root user
RUN useradd -m -u 1000 appuser
COPY --chown=appuser:appuser backend .

USER appuser

# No shell access in production
ENTRYPOINT ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment-spezifische Secrets

**Production** (GitHub Secrets):
```
SECRET_KEY=<random-via-secrets-generator>
DATABASE_URL=postgresql+asyncpg://user:pass@prod-db:5432/pruefpilot
S3_ACCESS_KEY=<from-hetzner>
S3_SECRET_KEY=<from-hetzner>
ANTHROPIC_API_KEY=<from-console>
POSTMARK_API_KEY=<from-postmark>
```

**Staging** (Separate `.env.staging`):
```
SECRET_KEY=staging-test-key-change-regularly
DATABASE_URL=postgresql+asyncpg://user:pass@staging-db:5432/pruefpilot-staging
```

---

## Empfehlungen für nächste Phase

1. **Intrusion Detection:** Fail2Ban + Log-Monitoring für Login-Failures
2. **API Rate Limiting:** Redis-backed Limiter statt In-Memory
3. **FIDO2/WebAuthn:** Hardware-Token für Admin-Accounts
4. **Audit Trail Enhancement:** Complete Revision-History für alle Entities (teilweise vorhanden)
5. **Encryption at Rest:** DB-Spalten mit `sqlalchemy-encrypted-fields` für sensitive Daten
6. **Secret Manager:** Hashicorp Vault oder AWS Secrets Manager für Production

---

## Summary der Fixes

| Befund | Priorität | Complexity | Zeit (Est.) |
|--------|-----------|-----------|-----------|
| Secret-Validierung | 🔴 | Mittel | 30 min |
| Brute-Force-Protection | 🔴 | Mittel | 45 min |
| Signatur-Validierung | 🔴 | Hoch | 1-2 h |
| CORS Headers | 🟠 | Niedrig | 10 min |
| Rate-Limiter Cleanup | 🟠 | Mittel | 30 min |
| S3 Zugriffskontrolle | 🟠 | Hoch | 1-2 h |
| JWT Token-Hashing | 🟠 | Niedrig | 15 min |
| CSV Validierung | 🟠 | Mittel | 45 min |
| HTTPS Enforcement | 🟠 | Niedrig | 10 min |
| DSGVO-Pages | 🔴 | Mittel | 2-3 h |
| **Gesamtzeit** | — | — | **6-8 Stunden** |

---

**Nächster Schritt:** Die 🔴 KRITISCH-Befunde sind zu beheben, bevor Demo/Beta-Zugriff gewährt wird. Dann Security-Test mit Penetration-Tools (OWASP ZAP).
