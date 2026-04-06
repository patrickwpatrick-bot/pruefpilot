"""
Email Service — Send transactional emails via Postmark
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html_body: str, text_body: str | None = None):
    """Send an email via Postmark API."""
    api_key = getattr(settings, 'POSTMARK_API_KEY', None)
    if not api_key:
        logger.warning("POSTMARK_API_KEY not configured, skipping email to %s", to)
        return False

    try:
        from postmarker.core import PostmarkClient
        client = PostmarkClient(server_token=api_key)
        client.emails.send(
            From="noreply@pruefpilot.de",
            To=to,
            Subject=subject,
            HtmlBody=html_body,
            TextBody=text_body or subject,
        )
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


async def send_pruef_erinnerung(to: str, firmenname: str, arbeitsmittel_name: str, faellig_am: str, tage_bis: int):
    """Send inspection reminder email."""
    if tage_bis > 0:
        betreff = f"Erinnerung: Prüfung für {arbeitsmittel_name} in {tage_bis} Tagen fällig"
        dringlichkeit = f"in <strong>{tage_bis} Tagen</strong>"
    else:
        betreff = f"ÜBERFÄLLIG: Prüfung für {arbeitsmittel_name} seit {abs(tage_bis)} Tagen"
        dringlichkeit = f"seit <strong>{abs(tage_bis)} Tagen überfällig</strong>"

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #000; color: #fff; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 18px;">PrüfPilot</h1>
            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.6;">Arbeitsschutz-Zentrale</p>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 14px;">Hallo,</p>
            <p style="color: #374151; font-size: 14px;">
                die Prüfung für <strong>{arbeitsmittel_name}</strong> bei {firmenname} ist {dringlichkeit} fällig
                (Termin: {faellig_am}).
            </p>
            <p style="color: #374151; font-size: 14px;">
                Bitte führen Sie die Prüfung zeitnah durch, um Ihre BG-Compliance sicherzustellen.
            </p>
            <a href="https://app.pruefpilot.de/arbeitsmittel"
               style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 12px;">
                Prüfung starten →
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                Diese E-Mail wurde automatisch von PrüfPilot versendet.
            </p>
        </div>
    </div>
    """
    return await send_email(to, betreff, html)


async def send_pdf_per_email(to: str, subject: str, pdf_bytes: bytes, filename: str):
    """Send a PDF attachment via Postmark."""
    api_key = getattr(settings, 'POSTMARK_API_KEY', None)
    if not api_key:
        logger.warning("POSTMARK_API_KEY not configured")
        return False

    try:
        import base64
        from postmarker.core import PostmarkClient
        client = PostmarkClient(server_token=api_key)

        client.emails.send(
            From="noreply@pruefpilot.de",
            To=to,
            Subject=subject,
            HtmlBody=f"<p>Anbei finden Sie das Prüfprotokoll als PDF.</p><p>— PrüfPilot</p>",
            TextBody="Anbei finden Sie das Prüfprotokoll als PDF.",
            Attachments=[{
                "Name": filename,
                "Content": base64.b64encode(pdf_bytes).decode(),
                "ContentType": "application/pdf",
            }],
        )
        return True
    except Exception as e:
        logger.error("Failed to send PDF email: %s", e)
        return False
