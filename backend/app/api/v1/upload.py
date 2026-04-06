"""
File Upload API - simple base64 image upload for equipment photos

Security: Extension-Whitelist + Content-Type-Validierung gegen RCE.
Erlaubte Typen: jpg, jpeg, png, gif, webp, pdf — kein SVG (XSS-Risiko).
"""
import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.security import get_current_org_id

router = APIRouter(prefix="/upload", tags=["Upload"])

# Upload-Verzeichnis: konfigurierbar via ENV, default relativ zum CWD
# Verzeichnis wird lazy beim ersten Upload erstellt, nicht beim Modul-Import
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.getcwd(), "uploads"))

# SEC-Fix: Strikte Whitelist gegen RCE via .php/.sh Upload
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "pdf"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
}


def _ensure_upload_dir() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    org_id: str = Depends(get_current_org_id),
):
    """Upload an image file and return its URL."""
    # SEC: Content-Type gegen Whitelist prüfen (nicht nur startswith)
    if not file.content_type or file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Dateityp nicht erlaubt. Erlaubt: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # SEC: Extension aus Dateiname extrahieren und gegen Whitelist prüfen
    ext = ""
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Dateiendung '.{ext}' nicht erlaubt. Erlaubt: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Max 5MB
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 5MB)")

    # SEC: Sichere Dateinamen — nur UUID + geprüfte Extension
    filename = f"{org_id}_{uuid.uuid4().hex[:12]}.{ext}"
    _ensure_upload_dir()
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{filename}"}
