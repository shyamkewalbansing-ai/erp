"""
Email Service Module - For system notifications and scheduled tasks
"""
import os
import smtplib
from typing import Dict, Any, Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


EMAIL_TEMPLATES = {
    "welcome": {
        "subject": "Welkom bij Facturatie.sr",
        "body": """
        <h1>Welkom!</h1>
        <p>Bedankt voor uw registratie bij Facturatie.sr.</p>
        """
    },
    "password_reset": {
        "subject": "Wachtwoord reset aanvraag",
        "body": """
        <h1>Wachtwoord Reset</h1>
        <p>U heeft een wachtwoord reset aangevraagd.</p>
        <p>Klik op de link om uw wachtwoord te resetten.</p>
        """
    },
    "module_expiring": {
        "subject": "Module loopt binnenkort af",
        "body": """
        <h1>Module Melding</h1>
        <p>Uw module {module_name} loopt binnenkort af.</p>
        """
    },
    "module_expired": {
        "subject": "Module verlopen",
        "body": """
        <h1>Module Verlopen</h1>
        <p>Uw module {module_name} is verlopen.</p>
        """
    }
}


class EmailService:
    """Email service for system notifications"""
    
    def __init__(self, db):
        self.db = db
        
    async def get_settings(self, workspace_id: str = "global") -> Dict[str, Any]:
        """Get email settings from database"""
        settings = await self.db.email_settings.find_one({"workspace_id": workspace_id})
        if not settings:
            return {
                "smtp_host": os.environ.get('SMTP_HOST', ''),
                "smtp_port": int(os.environ.get('SMTP_PORT', '587')),
                "smtp_user": os.environ.get('SMTP_USER', ''),
                "smtp_password": os.environ.get('SMTP_PASSWORD', ''),
                "from_email": os.environ.get('FROM_EMAIL', ''),
                "from_name": os.environ.get('FROM_NAME', 'Facturatie.sr'),
                "enabled": False
            }
        return settings
    
    async def save_settings(self, workspace_id: str, settings: Dict[str, Any]):
        """Save email settings to database"""
        settings["workspace_id"] = workspace_id
        settings["updated_at"] = datetime.utcnow()
        await self.db.email_settings.update_one(
            {"workspace_id": workspace_id},
            {"$set": settings},
            upsert=True
        )
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        workspace_id: str = "global"
    ) -> Dict[str, Any]:
        """Send an email"""
        settings = await self.get_settings(workspace_id)
        
        if not settings.get('smtp_user') or not settings.get('smtp_password'):
            return {
                "success": False,
                "error": "SMTP niet geconfigureerd"
            }
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.get('from_name', 'Facturatie.sr')} <{settings.get('from_email', settings['smtp_user'])}>"
            msg['To'] = to_email
            
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))
            
            with smtplib.SMTP(settings['smtp_host'], settings['smtp_port']) as server:
                server.starttls()
                server.login(settings['smtp_user'], settings['smtp_password'])
                server.send_message(msg)
            
            return {"success": True, "message": f"Email verzonden naar {to_email}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def send_welcome_email(self, to_email: str, workspace_id: str = "global") -> Dict[str, Any]:
        """Send welcome email to new user"""
        template = EMAIL_TEMPLATES["welcome"]
        return await self.send_email(to_email, template["subject"], template["body"], workspace_id)
    
    async def send_password_reset_email(self, to_email: str, reset_link: str, workspace_id: str = "global") -> Dict[str, Any]:
        """Send password reset email"""
        template = EMAIL_TEMPLATES["password_reset"]
        body = template["body"].replace("{reset_link}", reset_link)
        return await self.send_email(to_email, template["subject"], body, workspace_id)
    
    async def send_module_expiring_email(self, to_email: str, module_name: str, workspace_id: str = "global") -> Dict[str, Any]:
        """Send module expiring notification"""
        template = EMAIL_TEMPLATES["module_expiring"]
        body = template["body"].replace("{module_name}", module_name)
        return await self.send_email(to_email, template["subject"], body, workspace_id)
    
    async def send_module_expired_email(self, to_email: str, module_name: str, workspace_id: str = "global") -> Dict[str, Any]:
        """Send module expired notification"""
        template = EMAIL_TEMPLATES["module_expired"]
        body = template["body"].replace("{module_name}", module_name)
        return await self.send_email(to_email, template["subject"], body, workspace_id)
    
    async def send_test_email(self, to_email: str, workspace_id: str = "global") -> Dict[str, Any]:
        """Send test email"""
        return await self.send_email(
            to_email,
            "Test Email - Facturatie.sr",
            "<h1>Test</h1><p>Dit is een test email.</p>",
            workspace_id
        )


def get_email_service(db) -> EmailService:
    """Factory function to create email service"""
    return EmailService(db)
