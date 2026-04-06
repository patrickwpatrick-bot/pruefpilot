"""
API v1 Router - combines all sub-routers
Gracefully skips modules with missing dependencies (Vercel serverless slim deploy)
"""
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

api_router = APIRouter(prefix="/api/v1")


def _try_include(module_path: str, attr: str = "router"):
    """Try to import and include a router, skip if dependencies are missing."""
    try:
        import importlib
        mod = importlib.import_module(module_path)
        api_router.include_router(getattr(mod, attr))
    except ImportError as e:
        logger.warning(f"Skipping {module_path}: {e}")
    except Exception as e:
        logger.warning(f"Skipping {module_path}: {e}")


# Core routes (always available)
from app.api.v1.auth import router as auth_router
from app.api.v1.branchen import router as branchen_router

api_router.include_router(auth_router)
api_router.include_router(branchen_router)

# Optional routes — skip if dependencies missing
_try_include("app.api.v1.arbeitsmittel")
_try_include("app.api.v1.pruefungen")
_try_include("app.api.v1.standorte")
_try_include("app.api.v1.checklisten")
_try_include("app.api.v1.maengel")
_try_include("app.api.v1.seed")
_try_include("app.api.v1.unterweisungen")
_try_include("app.api.v1.gefaehrdungsbeurteilungen")
_try_include("app.api.v1.gefahrstoffe")
_try_include("app.api.v1.fremdfirmen")
_try_include("app.api.v1.organisation")
_try_include("app.api.v1.mitarbeiter")
_try_include("app.api.v1.public_signing")
_try_include("app.api.v1.audit_log")
_try_include("app.api.v1.upload")
_try_include("app.api.v1.compliance")
_try_include("app.api.v1.billing")
_try_include("app.api.v1.formulare")
_try_include("app.api.v1.admin")
