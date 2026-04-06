"""
API v1 Router - combines all sub-routers
"""
from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.arbeitsmittel import router as arbeitsmittel_router
from app.api.v1.pruefungen import router as pruefungen_router
from app.api.v1.standorte import router as standorte_router
from app.api.v1.checklisten import router as checklisten_router
from app.api.v1.maengel import router as maengel_router
from app.api.v1.seed import router as seed_router
from app.api.v1.unterweisungen import router as unterweisungen_router
from app.api.v1.gefaehrdungsbeurteilungen import router as gefaehrdungsbeurteilungen_router
from app.api.v1.gefahrstoffe import router as gefahrstoffe_router
from app.api.v1.fremdfirmen import router as fremdfirmen_router
from app.api.v1.organisation import router as organisation_router
from app.api.v1.mitarbeiter import router as mitarbeiter_router
from app.api.v1.public_signing import router as public_signing_router
from app.api.v1.audit_log import router as audit_log_router
from app.api.v1.upload import router as upload_router
from app.api.v1.branchen import router as branchen_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.billing import router as billing_router
from app.api.v1.formulare import router as formulare_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(branchen_router)
api_router.include_router(arbeitsmittel_router)
api_router.include_router(pruefungen_router)
api_router.include_router(standorte_router)
api_router.include_router(checklisten_router)
api_router.include_router(maengel_router)
api_router.include_router(seed_router)
api_router.include_router(unterweisungen_router)
api_router.include_router(gefaehrdungsbeurteilungen_router)
api_router.include_router(gefahrstoffe_router)
api_router.include_router(fremdfirmen_router)
api_router.include_router(organisation_router)
api_router.include_router(mitarbeiter_router)
api_router.include_router(public_signing_router)
api_router.include_router(audit_log_router)
api_router.include_router(upload_router)
api_router.include_router(compliance_router)
api_router.include_router(billing_router)
api_router.include_router(formulare_router)
api_router.include_router(admin_router)
