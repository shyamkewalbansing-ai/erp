"""
Scheduled Tasks / Cron Jobs
Handles automatic email reminders and notifications
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

class ScheduledTasks:
    """Handles scheduled tasks for email reminders"""
    
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
        self.scheduler = AsyncIOScheduler()
        self.base_url = "https://facturatie.sr"  # Will be updated from settings
        
    async def start(self):
        """Start the scheduler"""
        # Run module expiration check daily at 9:00 AM
        self.scheduler.add_job(
            self.check_expiring_modules,
            CronTrigger(hour=9, minute=0),
            id='check_expiring_modules',
            replace_existing=True
        )
        
        # Run expired modules check daily at 10:00 AM
        self.scheduler.add_job(
            self.check_expired_modules,
            CronTrigger(hour=10, minute=0),
            id='check_expired_modules',
            replace_existing=True
        )
        
        # Clean up old email logs weekly (Sundays at midnight)
        self.scheduler.add_job(
            self.cleanup_old_logs,
            CronTrigger(day_of_week='sun', hour=0, minute=0),
            id='cleanup_old_logs',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("Scheduled tasks started")
        
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduled tasks stopped")
    
    async def get_payment_info(self) -> Dict:
        """Get global payment info for emails"""
        payment_settings = await self.db.workspace_payment_settings.find_one(
            {"workspace_id": "global"},
            {"_id": 0}
        )
        
        payment_info = {
            "bank_name": "Hakrinbank",
            "account_number": "1234567890",
            "account_holder": "Facturatie N.V.",
            "instructions": "Vermeld uw naam en e-mailadres bij de betaling"
        }
        
        if payment_settings and payment_settings.get("payment_methods"):
            bank_method = next(
                (m for m in payment_settings["payment_methods"] if m.get("method_id") == "bank_transfer"),
                None
            )
            if bank_method and bank_method.get("bank_settings"):
                payment_info = {
                    "bank_name": bank_method["bank_settings"].get("bank_name", payment_info["bank_name"]),
                    "account_number": bank_method["bank_settings"].get("account_number", payment_info["account_number"]),
                    "account_holder": bank_method["bank_settings"].get("account_holder", payment_info["account_holder"]),
                    "instructions": bank_method.get("instructions", payment_info["instructions"])
                }
        
        return payment_info
    
    async def get_admin_email(self) -> str:
        """Get admin email for notifications"""
        email_settings = await self.db.email_settings.find_one(
            {"workspace_id": "global"},
            {"_id": 0}
        )
        return email_settings.get("admin_email") if email_settings else None
    
    async def check_expiring_modules(self):
        """Check for modules expiring soon and send reminders"""
        logger.info("Running expiring modules check...")
        
        try:
            now = datetime.now(timezone.utc)
            reminder_days = [7, 3, 1]  # Send reminders at 7, 3, and 1 day before expiration
            
            # Get all users with active/trial modules
            users = await self.db.users.find(
                {"role": {"$ne": "superadmin"}},
                {"_id": 0, "id": 1, "name": 1, "email": 1, "company_name": 1}
            ).to_list(1000)
            
            payment_info = await self.get_payment_info()
            emails_sent = 0
            
            for user in users:
                user_addons = await self.db.user_addons.find(
                    {
                        "user_id": user["id"],
                        "status": {"$in": ["active", "trial"]}
                    }
                ).to_list(100)
                
                expiring_modules = []
                
                for addon in user_addons:
                    end_date = addon.get("end_date") or addon.get("trial_ends_at") or addon.get("expires_at")
                    if not end_date:
                        continue
                    
                    try:
                        if isinstance(end_date, str):
                            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                        else:
                            end_dt = end_date
                        
                        days_remaining = (end_dt - now).days
                        
                        # Check if this is a reminder day
                        if days_remaining in reminder_days:
                            # Check if we already sent a reminder for this day
                            reminder_key = f"{user['id']}_{addon.get('addon_id')}_{days_remaining}"
                            existing_reminder = await self.db.email_reminders_sent.find_one({
                                "reminder_key": reminder_key,
                                "sent_at": {"$gte": (now - timedelta(hours=20)).isoformat()}
                            })
                            
                            if not existing_reminder:
                                # Get addon details
                                addon_details = await self.db.addons.find_one(
                                    {"$or": [{"id": addon.get("addon_id")}, {"slug": addon.get("addon_slug")}]},
                                    {"_id": 0}
                                )
                                
                                if addon_details and addon_details.get("price", 0) > 0:
                                    expiring_modules.append({
                                        "name": addon_details.get("name", "Onbekend"),
                                        "price": addon_details.get("price", 0),
                                        "expires_at": end_dt.strftime("%d-%m-%Y"),
                                        "addon_id": addon.get("addon_id"),
                                        "days_remaining": days_remaining
                                    })
                    except Exception as e:
                        logger.error(f"Error parsing date for addon {addon.get('addon_id')}: {e}")
                        continue
                
                # Send email if there are expiring modules
                if expiring_modules:
                    days_remaining = min(m["days_remaining"] for m in expiring_modules)
                    total_amount = sum(m["price"] for m in expiring_modules)
                    
                    result = await self.email_service.send_module_expiring_email(
                        to_email=user["email"],
                        customer_name=user.get("name", "Klant"),
                        modules=expiring_modules,
                        days_remaining=days_remaining,
                        total_amount=total_amount,
                        payment_info=payment_info,
                        dashboard_url=f"{self.base_url}/app/dashboard"
                    )
                    
                    if result.get("success"):
                        emails_sent += 1
                        # Record that we sent this reminder
                        for module in expiring_modules:
                            reminder_key = f"{user['id']}_{module['addon_id']}_{module['days_remaining']}"
                            await self.db.email_reminders_sent.insert_one({
                                "reminder_key": reminder_key,
                                "user_id": user["id"],
                                "addon_id": module["addon_id"],
                                "days_remaining": module["days_remaining"],
                                "sent_at": now.isoformat()
                            })
                        logger.info(f"Sent expiring reminder to {user['email']} ({days_remaining} days)")
            
            logger.info(f"Expiring modules check complete. Sent {emails_sent} reminder emails.")
            
            # Log the job run
            await self.db.scheduled_job_logs.insert_one({
                "job": "check_expiring_modules",
                "status": "success",
                "emails_sent": emails_sent,
                "run_at": now.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error in check_expiring_modules: {e}")
            await self.db.scheduled_job_logs.insert_one({
                "job": "check_expiring_modules",
                "status": "error",
                "error": str(e),
                "run_at": datetime.now(timezone.utc).isoformat()
            })
    
    async def check_expired_modules(self):
        """Check for expired modules and send notifications"""
        logger.info("Running expired modules check...")
        
        try:
            now = datetime.now(timezone.utc)
            
            # Get all users with expired modules
            users = await self.db.users.find(
                {"role": {"$ne": "superadmin"}},
                {"_id": 0, "id": 1, "name": 1, "email": 1, "company_name": 1}
            ).to_list(1000)
            
            payment_info = await self.get_payment_info()
            emails_sent = 0
            modules_updated = 0
            
            for user in users:
                user_addons = await self.db.user_addons.find(
                    {
                        "user_id": user["id"],
                        "status": {"$in": ["active", "trial"]}
                    }
                ).to_list(100)
                
                expired_modules = []
                
                for addon in user_addons:
                    end_date = addon.get("end_date") or addon.get("trial_ends_at") or addon.get("expires_at")
                    if not end_date:
                        continue
                    
                    try:
                        if isinstance(end_date, str):
                            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                        else:
                            end_dt = end_date
                        
                        if end_dt < now:
                            # Module has expired - update status
                            await self.db.user_addons.update_one(
                                {"_id": addon["_id"]},
                                {"$set": {
                                    "status": "expired",
                                    "expired_at": now.isoformat()
                                }}
                            )
                            modules_updated += 1
                            
                            # Get addon details
                            addon_details = await self.db.addons.find_one(
                                {"$or": [{"id": addon.get("addon_id")}, {"slug": addon.get("addon_slug")}]},
                                {"_id": 0}
                            )
                            
                            if addon_details and addon_details.get("price", 0) > 0:
                                expired_modules.append({
                                    "name": addon_details.get("name", "Onbekend"),
                                    "price": addon_details.get("price", 0),
                                    "expired_at": end_dt.strftime("%d-%m-%Y")
                                })
                    except Exception as e:
                        logger.error(f"Error processing addon {addon.get('addon_id')}: {e}")
                        continue
                
                # Send email if there are newly expired modules
                if expired_modules:
                    # Check if we already sent an expired notification today
                    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    existing_notification = await self.db.email_logs.find_one({
                        "to_email": user["email"],
                        "template": "module_expired",
                        "sent_at": {"$gte": today_start.isoformat()}
                    })
                    
                    if not existing_notification:
                        result = await self.email_service.send_module_expired_email(
                            to_email=user["email"],
                            customer_name=user.get("name", "Klant"),
                            modules=expired_modules,
                            payment_info=payment_info,
                            dashboard_url=f"{self.base_url}/app/dashboard"
                        )
                        
                        if result.get("success"):
                            emails_sent += 1
                            logger.info(f"Sent expired notification to {user['email']}")
            
            logger.info(f"Expired modules check complete. Updated {modules_updated} modules, sent {emails_sent} emails.")
            
            # Log the job run
            await self.db.scheduled_job_logs.insert_one({
                "job": "check_expired_modules",
                "status": "success",
                "modules_updated": modules_updated,
                "emails_sent": emails_sent,
                "run_at": now.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error in check_expired_modules: {e}")
            await self.db.scheduled_job_logs.insert_one({
                "job": "check_expired_modules",
                "status": "error",
                "error": str(e),
                "run_at": datetime.now(timezone.utc).isoformat()
            })
    
    async def cleanup_old_logs(self):
        """Clean up old email logs and reminder records"""
        logger.info("Running log cleanup...")
        
        try:
            now = datetime.now(timezone.utc)
            cutoff_date = (now - timedelta(days=30)).isoformat()
            
            # Delete old email logs
            email_result = await self.db.email_logs.delete_many({
                "sent_at": {"$lt": cutoff_date}
            })
            
            # Delete old reminder records
            reminder_result = await self.db.email_reminders_sent.delete_many({
                "sent_at": {"$lt": cutoff_date}
            })
            
            # Delete old job logs
            job_result = await self.db.scheduled_job_logs.delete_many({
                "run_at": {"$lt": cutoff_date}
            })
            
            logger.info(f"Cleanup complete. Deleted {email_result.deleted_count} email logs, "
                       f"{reminder_result.deleted_count} reminder records, "
                       f"{job_result.deleted_count} job logs.")
            
        except Exception as e:
            logger.error(f"Error in cleanup_old_logs: {e}")
    
    async def run_manual_check(self, job_type: str = "all") -> Dict:
        """Manually trigger a check (for admin use)"""
        results = {}
        
        if job_type in ["all", "expiring"]:
            await self.check_expiring_modules()
            results["expiring"] = "completed"
        
        if job_type in ["all", "expired"]:
            await self.check_expired_modules()
            results["expired"] = "completed"
        
        return results


# Singleton instance
scheduled_tasks = None

def get_scheduled_tasks(db, email_service):
    """Get or create scheduled tasks instance"""
    global scheduled_tasks
    if scheduled_tasks is None:
        scheduled_tasks = ScheduledTasks(db, email_service)
    return scheduled_tasks
