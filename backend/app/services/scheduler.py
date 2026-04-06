"""
Scheduler Service — Daily cron job for:
1. Updating Ampel status on all Arbeitsmittel
2. Sending email reminders for upcoming/overdue inspections
3. Recalculating compliance scores
"""
import logging
import asyncio
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.arbeitsmittel import Arbeitsmittel
from app.models.organisation import Organisation
from app.models.user import User

logger = logging.getLogger(__name__)


async def update_ampel_status(db: AsyncSession):
    """Update traffic light status for all Arbeitsmittel based on next inspection date."""
    today = date.today()
    result = await db.execute(select(Arbeitsmittel))
    arbeitsmittel = result.scalars().all()

    updated = 0
    for am in arbeitsmittel:
        if not am.naechste_pruefung_am:
            if am.ampel_status != "unbekannt":
                am.ampel_status = "unbekannt"
                updated += 1
            continue

        naechste = am.naechste_pruefung_am
        if isinstance(naechste, datetime):
            naechste = naechste.date()

        tage_bis = (naechste - today).days

        if tage_bis < 0:
            new_status = "rot"
        elif tage_bis <= 30:
            new_status = "gelb"
        else:
            new_status = "gruen"

        if am.ampel_status != new_status:
            am.ampel_status = new_status
            updated += 1

    await db.flush()
    logger.info("Ampel-Status aktualisiert: %d von %d Arbeitsmitteln", updated, len(arbeitsmittel))
    return updated


async def send_erinnerungen(db: AsyncSession):
    """Send email reminders for upcoming and overdue inspections."""
    from app.services.email import send_pruef_erinnerung

    today = date.today()
    erinnerungs_tage = [28, 14, 7, 0, -7, -14]  # 4w, 2w, 1w, today, 1w overdue, 2w overdue

    result = await db.execute(
        select(Arbeitsmittel).where(Arbeitsmittel.naechste_pruefung_am.isnot(None))
    )
    arbeitsmittel = result.scalars().all()

    sent = 0
    for am in arbeitsmittel:
        naechste = am.naechste_pruefung_am
        if isinstance(naechste, datetime):
            naechste = naechste.date()

        tage_bis = (naechste - today).days

        # Only send on specific days
        if tage_bis not in erinnerungs_tage:
            continue

        # Get org and admin email
        org_result = await db.execute(
            select(Organisation).where(Organisation.id == am.organisation_id)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            continue

        # Get admin users for this org
        user_result = await db.execute(
            select(User).where(
                User.organisation_id == am.organisation_id,
                User.rolle == "admin",
                User.ist_aktiv == True,
            )
        )
        admins = user_result.scalars().all()

        for admin in admins:
            try:
                await send_pruef_erinnerung(
                    to=admin.email,
                    firmenname=org.name,
                    arbeitsmittel_name=am.name,
                    faellig_am=naechste.strftime("%d.%m.%Y"),
                    tage_bis=tage_bis,
                )
                sent += 1
            except Exception as e:
                logger.error("Erinnerung fehlgeschlagen für %s: %s", admin.email, e)

    logger.info("%d Erinnerungen versendet", sent)
    return sent


async def run_daily_job():
    """Main daily job — called by scheduler."""
    logger.info("Starte täglichen PrüfPilot Job...")
    try:
        async with async_session_maker() as db:
            async with db.begin():
                updated = await update_ampel_status(db)
                sent = await send_erinnerungen(db)
                logger.info("Job abgeschlossen: %d Ampeln aktualisiert, %d Erinnerungen", updated, sent)
    except Exception as e:
        logger.error("Täglicher Job fehlgeschlagen: %s", e)


async def start_scheduler():
    """Start the background scheduler that runs daily at 6:00 AM."""
    logger.info("PrüfPilot Scheduler gestartet")
    while True:
        now = datetime.now(timezone.utc)
        # Next run at 5:00 UTC (6:00 CET)
        next_run = now.replace(hour=5, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)

        sleep_seconds = (next_run - now).total_seconds()
        logger.info("Nächster Job in %.0f Sekunden (%s)", sleep_seconds, next_run.isoformat())

        await asyncio.sleep(sleep_seconds)
        await run_daily_job()
