"""
Wisselkoers Scheduler
=====================
Automatische synchronisatie van CME.sr wisselkoersen op vaste tijdstippen.
Schema: 9:00, 10:00, 11:00 Surinaamse tijd (UTC-3)
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

# Suriname timezone: UTC-3
SURINAME_UTC_OFFSET = -3

# Scheduled sync times in Suriname time (SRT)
SYNC_TIMES_SRT = [
    (9, 0),   # 09:00 SRT = 12:00 UTC
    (10, 0),  # 10:00 SRT = 13:00 UTC
    (11, 0),  # 11:00 SRT = 14:00 UTC
]

scheduler = None


def get_utc_hour(srt_hour: int) -> int:
    """Convert Suriname time hour to UTC hour"""
    return (srt_hour - SURINAME_UTC_OFFSET) % 24


async def sync_cme_rates_for_all_users():
    """
    Synchroniseer CME koersen voor alle actieve gebruikers.
    Deze functie wordt aangeroepen door de scheduler.
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    from services.cme_scraper import fetch_cme_exchange_rates
    import os
    import uuid
    
    logger.info("🔄 Starting scheduled CME rate sync...")
    
    try:
        # Database connectie
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'erp_db')
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Haal koersen op van CME
        result = await fetch_cme_exchange_rates()
        
        if not result.get("success"):
            logger.error(f"❌ CME sync failed: {result.get('error')}")
            return
        
        rates = result.get("rates", {})
        now = datetime.now(timezone.utc)
        today = now.date().isoformat()
        
        # Haal alle unieke user_ids op die wisselkoersen hebben
        user_ids = await db.boekhouding_wisselkoersen.distinct("user_id")
        
        if not user_ids:
            # Als er nog geen users zijn, skip
            logger.info("ℹ️ No users found for CME sync")
            return
        
        # Sync voor elke gebruiker
        rate_mappings = [
            ("USD", "SRD", "inkoop", rates.get("USD_SRD", {}).get("inkoop")),
            ("USD", "SRD", "verkoop", rates.get("USD_SRD", {}).get("verkoop")),
            ("EUR", "SRD", "inkoop", rates.get("EUR_SRD", {}).get("inkoop")),
            ("EUR", "SRD", "verkoop", rates.get("EUR_SRD", {}).get("verkoop")),
            ("EUR", "USD", "inkoop", rates.get("EUR_USD", {}).get("inkoop")),
        ]
        
        total_saved = 0
        
        for user_id in user_ids:
            for valuta_van, valuta_naar, koers_type, koers_waarde in rate_mappings:
                if koers_waarde is None or koers_waarde <= 0:
                    continue
                
                # Check of er al een koers bestaat voor vandaag
                existing = await db.boekhouding_wisselkoersen.find_one({
                    "user_id": user_id,
                    "valuta_van": valuta_van,
                    "valuta_naar": valuta_naar,
                    "koers_type": koers_type,
                    "datum": today
                })
                
                if existing:
                    # Update bestaande
                    await db.boekhouding_wisselkoersen.update_one(
                        {"id": existing["id"]},
                        {"$set": {"koers": koers_waarde, "bron": "CME.sr", "updated_at": now}}
                    )
                else:
                    # Maak nieuwe
                    await db.boekhouding_wisselkoersen.insert_one({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "valuta_van": valuta_van,
                        "valuta_naar": valuta_naar,
                        "koers": koers_waarde,
                        "koers_type": koers_type,
                        "datum": today,
                        "bron": "CME.sr",
                        "created_at": now
                    })
                total_saved += 1
        
        logger.info(f"✅ CME sync completed: {total_saved} rates updated for {len(user_ids)} users")
        
        # Log de sync in audit
        await db.boekhouding_audit_log.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": "system",
            "action": "scheduled_sync",
            "module": "wisselkoersen",
            "entity_type": "cme_import",
            "entity_id": None,
            "details": {
                "users_synced": len(user_ids),
                "rates_updated": total_saved,
                "source": "CME.sr",
                "scheduled": True
            },
            "timestamp": now
        })
        
    except Exception as e:
        logger.error(f"❌ Error in scheduled CME sync: {e}")


def init_scheduler():
    """Initialize the scheduler with CME sync jobs"""
    global scheduler
    
    if scheduler is not None:
        logger.info("Scheduler already initialized")
        return scheduler
    
    scheduler = AsyncIOScheduler()
    
    # Add jobs for each sync time
    for srt_hour, srt_minute in SYNC_TIMES_SRT:
        utc_hour = get_utc_hour(srt_hour)
        
        trigger = CronTrigger(
            hour=utc_hour,
            minute=srt_minute,
            timezone='UTC'
        )
        
        job_id = f"cme_sync_{srt_hour:02d}{srt_minute:02d}"
        
        scheduler.add_job(
            sync_cme_rates_for_all_users,
            trigger=trigger,
            id=job_id,
            name=f"CME Sync at {srt_hour:02d}:{srt_minute:02d} SRT",
            replace_existing=True
        )
        
        logger.info(f"📅 Scheduled CME sync: {srt_hour:02d}:{srt_minute:02d} SRT ({utc_hour:02d}:{srt_minute:02d} UTC)")
    
    return scheduler


def start_scheduler():
    """Start the scheduler"""
    global scheduler
    
    if scheduler is None:
        scheduler = init_scheduler()
    
    if not scheduler.running:
        scheduler.start()
        logger.info("✅ Wisselkoers scheduler started")
        
        # Log scheduled jobs
        jobs = scheduler.get_jobs()
        for job in jobs:
            logger.info(f"   - {job.name}: next run at {job.next_run_time}")
    
    return scheduler


def stop_scheduler():
    """Stop the scheduler"""
    global scheduler
    
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Wisselkoers scheduler stopped")


def get_scheduler_status():
    """Get scheduler status and next run times"""
    global scheduler
    
    if scheduler is None or not scheduler.running:
        return {
            "running": False,
            "jobs": []
        }
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        })
    
    return {
        "running": True,
        "jobs": jobs
    }
