"""
Betalingsherinnering Scheduler
==============================
Automatische controle op vervallen facturen en versturen van herinneringen.
Schema: Dagelijks om 08:00 Surinaamse tijd (UTC-3)
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import uuid

logger = logging.getLogger(__name__)

# Suriname timezone: UTC-3
SURINAME_UTC_OFFSET = -3

# Scheduler instance
reminder_scheduler = None


def get_utc_hour(srt_hour: int) -> int:
    """Convert Suriname time hour to UTC hour"""
    return (srt_hour - SURINAME_UTC_OFFSET) % 24


class HerinneringScheduler:
    """
    Automatische betalingsherinneringen scheduler.
    
    Controleert dagelijks op:
    - Facturen die over de vervaldatum zijn
    - Escalatie van bestaande herinneringen (eerste -> tweede -> aanmaning)
    
    Configureert per gebruiker:
    - Dagen na vervaldatum voor eerste herinnering
    - Dagen tussen herinneringen voor escalatie
    - Auto-email aan/uit
    """
    
    def __init__(self, db):
        self.db = db
        self.scheduler = AsyncIOScheduler()
        
    async def start(self):
        """Start de herinnering scheduler"""
        # Dagelijks om 08:00 SRT (11:00 UTC)
        utc_hour = get_utc_hour(8)
        
        self.scheduler.add_job(
            self.process_overdue_invoices,
            CronTrigger(hour=utc_hour, minute=0),
            id='process_overdue_invoices',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("✅ Herinnering scheduler gestart")
        logger.info(f"   - Dagelijkse controle om 08:00 SRT ({utc_hour}:00 UTC)")
        
    def stop(self):
        """Stop de scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Herinnering scheduler gestopt")
    
    async def get_user_reminder_settings(self, user_id: str) -> Dict:
        """
        Haal herinnering-instellingen op voor een gebruiker.
        Returns defaults als geen instellingen gevonden.
        """
        instellingen = await self.db.boekhouding_instellingen.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        return {
            "auto_herinneringen_enabled": instellingen.get("auto_herinneringen_enabled", False) if instellingen else False,
            "dagen_voor_eerste_herinnering": instellingen.get("dagen_voor_eerste_herinnering", 7) if instellingen else 7,
            "dagen_tussen_herinneringen": instellingen.get("dagen_tussen_herinneringen", 7) if instellingen else 7,
            "max_herinneringen": instellingen.get("max_herinneringen", 3) if instellingen else 3,
            "smtp_configured": bool(instellingen.get("smtp_user") and instellingen.get("smtp_password")) if instellingen else False,
            "bedrijfsnaam": instellingen.get("bedrijfsnaam", "") if instellingen else "",
            "bank_naam": instellingen.get("bank_naam", "") if instellingen else "",
            "bank_rekening": instellingen.get("bank_rekening", "") if instellingen else "",
        }
    
    async def process_overdue_invoices(self):
        """
        Hoofdfunctie: Verwerk alle vervallen facturen voor alle gebruikers.
        """
        logger.info("🔔 Start dagelijkse herinnering controle...")
        
        try:
            # Haal alle unieke user_ids op met facturen
            users = await self.db.boekhouding_verkoopfacturen.distinct("user_id")
            
            total_reminders_created = 0
            total_emails_sent = 0
            
            for user_id in users:
                try:
                    result = await self.process_user_invoices(user_id)
                    total_reminders_created += result.get("reminders_created", 0)
                    total_emails_sent += result.get("emails_sent", 0)
                except Exception as e:
                    logger.error(f"❌ Fout bij verwerken user {user_id}: {e}")
                    continue
            
            logger.info(f"✅ Herinnering controle voltooid:")
            logger.info(f"   - {total_reminders_created} herinneringen aangemaakt")
            logger.info(f"   - {total_emails_sent} e-mails verzonden")
            
        except Exception as e:
            logger.error(f"❌ Kritieke fout in herinnering scheduler: {e}")
    
    async def process_user_invoices(self, user_id: str) -> Dict:
        """
        Verwerk vervallen facturen voor één gebruiker.
        """
        settings = await self.get_user_reminder_settings(user_id)
        
        # Skip als auto-herinneringen uitgeschakeld
        if not settings["auto_herinneringen_enabled"]:
            return {"reminders_created": 0, "emails_sent": 0}
        
        today = datetime.now(timezone.utc).date()
        reminders_created = 0
        emails_sent = 0
        
        # Haal openstaande facturen op
        facturen = await self.db.boekhouding_verkoopfacturen.find({
            "user_id": user_id,
            "status": {"$nin": ["betaald", "geannuleerd"]},
            "openstaand_bedrag": {"$gt": 0}
        }, {"_id": 0}).to_list(1000)
        
        for factuur in facturen:
            try:
                result = await self.process_single_invoice(
                    factuur, user_id, settings, today
                )
                reminders_created += result.get("reminder_created", 0)
                emails_sent += result.get("email_sent", 0)
            except Exception as e:
                logger.error(f"Fout bij factuur {factuur.get('factuurnummer')}: {e}")
                continue
        
        return {
            "reminders_created": reminders_created,
            "emails_sent": emails_sent
        }
    
    async def process_single_invoice(
        self, 
        factuur: Dict, 
        user_id: str, 
        settings: Dict,
        today
    ) -> Dict:
        """
        Verwerk één factuur: controleer of herinnering nodig is.
        """
        result = {"reminder_created": 0, "email_sent": 0}
        
        # Parse vervaldatum
        vervaldatum_str = factuur.get("vervaldatum", "")
        if not vervaldatum_str:
            return result
        
        try:
            if isinstance(vervaldatum_str, str):
                vervaldatum = datetime.fromisoformat(vervaldatum_str.replace('Z', '+00:00')).date()
            else:
                vervaldatum = vervaldatum_str
        except (ValueError, TypeError):
            return result
        
        # Bereken dagen over vervaldatum
        dagen_over = (today - vervaldatum).days
        
        # Niet over vervaldatum + grace period
        if dagen_over < settings["dagen_voor_eerste_herinnering"]:
            return result
        
        # Check bestaande herinneringen voor deze factuur
        bestaande_herinneringen = await self.db.boekhouding_herinneringen.find({
            "user_id": user_id,
            "factuur_id": factuur.get("id")
        }, {"_id": 0}).sort("created_at", -1).to_list(10)
        
        laatste_herinnering = bestaande_herinneringen[0] if bestaande_herinneringen else None
        aantal_herinneringen = len(bestaande_herinneringen)
        
        # Max herinneringen bereikt?
        if aantal_herinneringen >= settings["max_herinneringen"]:
            return result
        
        # Bepaal of nieuwe herinnering nodig is
        should_create = False
        herinnering_type = "eerste"
        
        if not laatste_herinnering:
            # Geen eerdere herinnering - maak eerste
            should_create = True
            herinnering_type = "eerste"
        else:
            # Check dagen sinds laatste herinnering
            laatste_datum = laatste_herinnering.get("created_at", "")
            if isinstance(laatste_datum, str):
                try:
                    laatste_datum = datetime.fromisoformat(laatste_datum.replace('Z', '+00:00')).date()
                except (ValueError, TypeError):
                    return result
            elif hasattr(laatste_datum, 'date'):
                laatste_datum = laatste_datum.date()
            else:
                return result
            
            dagen_sinds_laatste = (today - laatste_datum).days
            
            if dagen_sinds_laatste >= settings["dagen_tussen_herinneringen"]:
                should_create = True
                # Escaleer type
                if laatste_herinnering.get("type") == "eerste":
                    herinnering_type = "tweede"
                elif laatste_herinnering.get("type") == "tweede":
                    herinnering_type = "aanmaning"
                else:
                    herinnering_type = "aanmaning"
        
        if not should_create:
            return result
        
        # Maak herinnering aan
        herinnering = await self.create_reminder(
            factuur, user_id, herinnering_type, settings
        )
        
        if herinnering:
            result["reminder_created"] = 1
            
            # Verstuur e-mail als SMTP geconfigureerd
            if settings["smtp_configured"]:
                email_sent = await self.send_reminder_email(
                    herinnering, factuur, user_id, settings
                )
                if email_sent:
                    result["email_sent"] = 1
        
        return result
    
    async def create_reminder(
        self, 
        factuur: Dict, 
        user_id: str, 
        herinnering_type: str,
        settings: Dict
    ) -> Optional[Dict]:
        """
        Maak een nieuwe herinnering aan in de database.
        """
        try:
            # Haal debiteur op
            debiteur = None
            if factuur.get("debiteur_id"):
                debiteur = await self.db.boekhouding_debiteuren.find_one(
                    {"id": factuur["debiteur_id"], "user_id": user_id},
                    {"_id": 0}
                )
            
            herinnering = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "factuur_id": factuur.get("id"),
                "factuurnummer": factuur.get("factuurnummer"),
                "debiteur_id": factuur.get("debiteur_id"),
                "debiteur_naam": debiteur.get("naam") if debiteur else factuur.get("debiteur_naam", ""),
                "debiteur_email": debiteur.get("email") if debiteur else "",
                "openstaand_bedrag": factuur.get("openstaand_bedrag", 0),
                "vervaldatum": factuur.get("vervaldatum"),
                "type": herinnering_type,
                "status": "verzonden",
                "verzonden_op": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "auto_generated": True
            }
            
            await self.db.boekhouding_herinneringen.insert_one(herinnering)
            
            logger.info(f"📝 Herinnering aangemaakt: {factuur.get('factuurnummer')} ({herinnering_type})")
            
            return herinnering
            
        except Exception as e:
            logger.error(f"Fout bij aanmaken herinnering: {e}")
            return None
    
    async def send_reminder_email(
        self, 
        herinnering: Dict, 
        factuur: Dict, 
        user_id: str,
        settings: Dict
    ) -> bool:
        """
        Verstuur herinnering per e-mail.
        """
        try:
            # Import email service
            from services.unified_email_service import UnifiedEmailService
            
            email_service = UnifiedEmailService(self.db)
            
            # Haal bedrijfsinstellingen op
            bedrijf = await self.db.boekhouding_instellingen.find_one(
                {"user_id": user_id},
                {"_id": 0}
            ) or {}
            
            # Genereer email HTML
            html_content = email_service.generate_reminder_html(
                herinnering, bedrijf, factuur
            )
            
            to_email = herinnering.get("debiteur_email")
            if not to_email:
                logger.warning(f"Geen e-mail voor debiteur: {herinnering.get('debiteur_naam')}")
                return False
            
            # Type labels voor subject
            type_labels = {
                "eerste": "Betalingsherinnering",
                "tweede": "Tweede Betalingsherinnering",
                "aanmaning": "Aanmaning"
            }
            
            subject = f"{type_labels.get(herinnering.get('type'), 'Herinnering')} - Factuur {herinnering.get('factuurnummer')}"
            
            # Verstuur email
            result = await email_service.send_email(
                to_email=to_email,
                subject=subject,
                body_html=html_content,
                user_id=user_id
            )
            
            if result.get("success"):
                logger.info(f"📧 E-mail verzonden naar {to_email}")
                
                # Update herinnering met email status
                await self.db.boekhouding_herinneringen.update_one(
                    {"id": herinnering["id"]},
                    {"$set": {
                        "email_verzonden": True,
                        "email_verzonden_op": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return True
            else:
                logger.error(f"Email verzenden mislukt: {result.get('error')}")
                return False
                
        except Exception as e:
            logger.error(f"Fout bij verzenden email: {e}")
            return False


# Global scheduler instance
reminder_scheduler_instance = None


async def start_reminder_scheduler(db):
    """Start de herinnering scheduler"""
    global reminder_scheduler_instance
    
    if reminder_scheduler_instance is None:
        reminder_scheduler_instance = HerinneringScheduler(db)
        await reminder_scheduler_instance.start()
    
    return reminder_scheduler_instance


def stop_reminder_scheduler():
    """Stop de herinnering scheduler"""
    global reminder_scheduler_instance
    
    if reminder_scheduler_instance:
        reminder_scheduler_instance.stop()
        reminder_scheduler_instance = None


async def trigger_manual_reminder_check(db, user_id: str = None) -> Dict:
    """
    Handmatig triggeren van herinnering controle (voor testing of on-demand).
    """
    scheduler = HerinneringScheduler(db)
    
    if user_id:
        result = await scheduler.process_user_invoices(user_id)
    else:
        await scheduler.process_overdue_invoices()
        result = {"status": "completed"}
    
    return result
