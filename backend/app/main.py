"""
PrüfPilot - FastAPI Application Entry Point
"""
import asyncio
import logging
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


# ── Rate Limiting (Block 15) ─────────────────────────────────────────────────
from collections import defaultdict
from time import time

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_rate_limit_cleanup_counter = 0  # Fix 3: Zähler für periodischen Cleanup
RATE_LIMIT = 100  # requests per minute
RATE_WINDOW = 60  # seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print(f"🚀 {settings.APP_NAME} startet ({settings.APP_ENV})")

    # SEC-Fix: Dev-Secret in Production → Abbruch (alle JWTs forgeable!)
    _secret = settings.SECRET_KEY
    if settings.APP_ENV == "production":
        if _secret.startswith("dev-") or _secret == "dev-secret-key-change-in-production":
            logger.critical("FATAL: Dev-Secret-Key in Production erkannt!")
            raise RuntimeError("FATAL: dev-secret in production — setze SECRET_KEY als Env Var")
        if len(_secret) < 32:
            logger.critical("FATAL: SECRET_KEY zu kurz (%d Zeichen, min. 32).", len(_secret))
            raise RuntimeError("FATAL: SECRET_KEY muss mindestens 32 Zeichen lang sein")

    # Start background scheduler for daily jobs
    scheduler_task = None
    if settings.APP_ENV != "test":
        try:
            from app.services.scheduler import start_scheduler
            scheduler_task = asyncio.create_task(start_scheduler())
            logger.info("Scheduler gestartet")
        except Exception as e:
            logger.warning("Scheduler konnte nicht gestartet werden: %s", e)

    yield

    # Shutdown
    if scheduler_task:
        scheduler_task.cancel()
    print(f"👋 {settings.APP_NAME} wird beendet")


app = FastAPI(
    title=settings.APP_NAME,
    description="Die Arbeitsschutz-Zentrale für den deutschen Mittelstand",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — tighter in production
# Fix 2: Headers auf notwendige Minimum einschränken
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


# ── Security Headers Middleware (Block 15) ────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"

    if settings.APP_ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.stripe.com"
        )

    return response


# ── Request/Response Logging Middleware ───────────────────────────────────────
@app.middleware("http")
async def request_logging(request: Request, call_next):
    """Log all HTTP requests and responses for debugging and monitoring."""
    import uuid
    from datetime import datetime, timezone

    request_id = str(uuid.uuid4())
    start_time = time()

    # Extract request info
    method = request.method
    path = request.url.path
    client_ip = request.client.host if request.client else "unknown"

    # Skip logging for health checks and documentation
    if path in ("/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    try:
        response = await call_next(request)
        duration_ms = (time() - start_time) * 1000

        # Log successful request
        logger.info(
            f"REQ {request_id} | {method} {path} | Status: {response.status_code} | "
            f"IP: {client_ip} | Duration: {duration_ms:.1f}ms"
        )

        # Add request ID to response headers for tracing
        response.headers["X-Request-ID"] = request_id
        return response

    except Exception as e:
        duration_ms = (time() - start_time) * 1000
        logger.error(
            f"REQ {request_id} | {method} {path} | Exception | "
            f"IP: {client_ip} | Duration: {duration_ms:.1f}ms | Error: {str(e)}"
        )
        raise


# ── Rate Limiting Middleware (Block 15) ───────────────────────────────────────
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    global _rate_limit_cleanup_counter  # Fix 3: Globals verwenden

    # Skip rate limiting for health checks and docs
    if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    # Use IP + auth token as identifier
    client_ip = request.client.host if request.client else "unknown"
    auth = request.headers.get("Authorization", "")
    key = f"{client_ip}:{auth[:20]}" if auth else client_ip

    now = time()
    # Clean old entries
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_WINDOW]

    # Fix 3: Periodischer Gesamt-Cleanup alle 1000 Requests
    _rate_limit_cleanup_counter += 1
    if _rate_limit_cleanup_counter % 1000 == 0:
        stale_keys = [k for k, v in _rate_limit_store.items() if not v]
        for k in stale_keys:
            del _rate_limit_store[k]
        logger.debug(f"Rate limit cleanup durchgeführt: {len(stale_keys)} alte Keys gelöscht")

    if len(_rate_limit_store[key]) >= RATE_LIMIT:
        return Response(
            content='{"detail": "Zu viele Anfragen. Bitte warte einen Moment."}',
            status_code=429,
            media_type="application/json",
        )

    _rate_limit_store[key].append(now)
    response = await call_next(request)
    return response


# Static file serving for uploads (nur wenn Verzeichnis existiert/erstellt werden kann)
# In Serverless-Umgebungen (Vercel) ist das Dateisystem read-only außer /tmp
upload_dir = os.getenv("UPLOAD_DIR", os.path.join(os.getcwd(), "uploads"))
try:
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
except OSError:
    # Serverless: /tmp als Fallback
    upload_dir = "/tmp/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Routes
app.include_router(api_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    import os as _os
    db_url = settings.DATABASE_URL
    # Redact password
    if "@" in db_url:
        parts = db_url.split("@")
        before_at = parts[0]
        if ":" in before_at:
            user_part = before_at.rsplit(":", 1)[0]
            db_url_safe = f"{user_part}:***@{'@'.join(parts[1:])}"
        else:
            db_url_safe = f"***@{'@'.join(parts[1:])}"
    else:
        db_url_safe = "no-@-in-url"
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "0.2.1",
        "environment": settings.APP_ENV,
        "db_url": db_url_safe,
        "vercel_env": _os.environ.get("VERCEL", "NOT_SET"),
        "deploy": "v6",
    }
