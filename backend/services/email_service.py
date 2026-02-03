"""
Email Service Module
Handles all email functionality including SMTP configuration, templates, and sending
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from typing import Optional, Dict, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Email Templates
EMAIL_TEMPLATES = {
    "welcome": {
        "subject": "Welkom bij Facturatie.sr - Uw Account Gegevens",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welkom bij Facturatie.sr!</h1>
        </div>
        <div class="content">
            <p>Beste {{ customer_name }},</p>
            <p>Uw account is succesvol aangemaakt. Hieronder vindt u uw inloggegevens:</p>
            
            <div class="credentials">
                <p><strong>E-mail:</strong> {{ email }}</p>
                <p><strong>Wachtwoord:</strong> {{ password }}</p>
                <p><strong>Bedrijf:</strong> {{ company_name }}</p>
            </div>
            
            <p>U kunt direct inloggen en aan de slag gaan met uw gratis boekhouding module!</p>
            
            <a href="{{ login_url }}" class="button">Inloggen</a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Tip:</strong> Wijzig uw wachtwoord na de eerste login voor extra veiligheid.
            </p>
        </div>
        <div class="footer">
            <p>© {{ year }} Facturatie.sr - Alle rechten voorbehouden</p>
        </div>
    </div>
</body>
</html>
"""
    },
    "password_reset": {
        "subject": "Wachtwoord Resetten - Facturatie.sr",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .reset-code { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #3b82f6; }
        .reset-code h2 { color: #3b82f6; margin: 0; font-size: 32px; letter-spacing: 5px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Wachtwoord Resetten</h1>
        </div>
        <div class="content">
            <p>Beste {{ customer_name }},</p>
            <p>U heeft een verzoek ingediend om uw wachtwoord te resetten. Gebruik de onderstaande code:</p>
            
            <div class="reset-code">
                <h2>{{ reset_code }}</h2>
                <p style="color: #6b7280; margin-top: 10px;">Deze code is 1 uur geldig</p>
            </div>
            
            <p>Als u dit verzoek niet heeft gedaan, kunt u deze email negeren.</p>
            
            <a href="{{ reset_url }}" class="button">Wachtwoord Resetten</a>
        </div>
        <div class="footer">
            <p>© {{ year }} Facturatie.sr - Alle rechten voorbehouden</p>
        </div>
    </div>
</body>
</html>
"""
    },
    "module_expiring_soon": {
        "subject": "⚠️ Uw module(s) verlopen binnenkort - Facturatie.sr",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .module-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .module-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Module Verloopt Binnenkort</h1>
        </div>
        <div class="content">
            <p>Beste {{ customer_name }},</p>
            
            <div class="warning-box">
                <strong>Let op!</strong> De volgende module(s) verlopen over {{ days_remaining }} dag(en):
            </div>
            
            <div class="module-list">
                {% for module in modules %}
                <div class="module-item">
                    <span>{{ module.name }}</span>
                    <span style="color: #f59e0b; font-weight: bold;">Verloopt: {{ module.expires_at }}</span>
                </div>
                {% endfor %}
                <div class="module-item" style="border-bottom: none; font-weight: bold;">
                    <span>Totaal per maand:</span>
                    <span>SRD {{ total_amount }}</span>
                </div>
            </div>
            
            <p>Verleng nu om onderbrekingen te voorkomen!</p>
            
            <a href="{{ dashboard_url }}" class="button">Nu Verlengen</a>
            
            <div style="margin-top: 30px; padding: 20px; background: #ecfdf5; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #059669;">💳 Betaalgegevens</h3>
                <p><strong>Bank:</strong> {{ payment_info.bank_name }}</p>
                <p><strong>Rekening:</strong> {{ payment_info.account_number }}</p>
                <p><strong>T.n.v.:</strong> {{ payment_info.account_holder }}</p>
            </div>
        </div>
        <div class="footer">
            <p>© {{ year }} Facturatie.sr - Alle rechten voorbehouden</p>
        </div>
    </div>
</body>
</html>
"""
    },
    "module_expired": {
        "subject": "🚨 Uw module(s) zijn verlopen - Facturatie.sr",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .module-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .module-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Modules Verlopen</h1>
        </div>
        <div class="content">
            <p>Beste {{ customer_name }},</p>
            
            <div class="alert-box">
                <strong>Uw module(s) zijn verlopen!</strong> Heractiveer nu om weer toegang te krijgen.
            </div>
            
            <div class="module-list">
                {% for module in modules %}
                <div class="module-item">
                    <span>{{ module.name }}</span>
                    <span style="color: #ef4444; font-weight: bold;">Verlopen</span>
                </div>
                {% endfor %}
            </div>
            
            <p>Na betaling worden uw modules direct weer geactiveerd.</p>
            
            <a href="{{ dashboard_url }}" class="button">Nu Heractiveren</a>
            
            <div style="margin-top: 30px; padding: 20px; background: #ecfdf5; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #059669;">💳 Betaalgegevens</h3>
                <p><strong>Bank:</strong> {{ payment_info.bank_name }}</p>
                <p><strong>Rekening:</strong> {{ payment_info.account_number }}</p>
                <p><strong>T.n.v.:</strong> {{ payment_info.account_holder }}</p>
            </div>
        </div>
        <div class="footer">
            <p>© {{ year }} Facturatie.sr - Alle rechten voorbehouden</p>
        </div>
    </div>
</body>
</html>
"""
    },
    "payment_confirmed": {
        "subject": "✅ Betaling Bevestigd - Modules Geactiveerd",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center; }
        .module-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .module-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Betaling Bevestigd!</h1>
        </div>
        <div class="content">
            <p>Beste {{ customer_name }},</p>
            
            <div class="success-box">
                <h2 style="color: #10b981; margin: 0;">🎉 Bedankt voor uw betaling!</h2>
                <p style="margin-bottom: 0;">Uw modules zijn geactiveerd voor {{ months }} maand(en).</p>
            </div>
            
            <div class="module-list">
                <h3 style="margin-top: 0;">Geactiveerde Modules:</h3>
                {% for module in modules %}
                <div class="module-item">
                    <span>{{ module.name }}</span>
                    <span style="color: #10b981;">✓ Actief tot {{ module.expires_at }}</span>
                </div>
                {% endfor %}
            </div>
            
            <a href="{{ dashboard_url }}" class="button">Naar Dashboard</a>
        </div>
        <div class="footer">
            <p>© {{ year }} Facturatie.sr - Alle rechten voorbehouden</p>
        </div>
    </div>
</body>
</html>
"""
    },
    "admin_new_payment_request": {
        "subject": "🔔 Nieuw Betaalverzoek - {{ customer_name }}",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
        .module-list { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Nieuw Betaalverzoek</h1>
        </div>
        <div class="content">
            <p>Er is een nieuw betaalverzoek binnengekomen.</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0;">Klantgegevens:</h3>
                <p><strong>Naam:</strong> {{ customer_name }}</p>
                <p><strong>Email:</strong> {{ customer_email }}</p>
                <p><strong>Bedrijf:</strong> {{ company_name }}</p>
            </div>
            
            <div class="module-list">
                <h4 style="margin-top: 0;">Aangevraagde Modules:</h4>
                {% for module in modules %}
                <p>• {{ module.name }} - SRD {{ module.price }}</p>
                {% endfor %}
                <p style="font-weight: bold; margin-bottom: 0;">Totaal: SRD {{ total_amount }}/maand</p>
            </div>
            
            <a href="{{ admin_url }}" class="button">Verzoek Bekijken</a>
        </div>
        <div class="footer">
            <p>© {{ year }} Facturatie.sr Admin</p>
        </div>
    </div>
</body>
</html>
"""
    }
}


class EmailService:
    """Email service for sending emails via SMTP"""
    
    def __init__(self, db):
        self.db = db
        self._settings = None
    
    async def get_settings(self, workspace_id: str = "global") -> Optional[Dict]:
        """Get email settings from database"""
        settings = await self.db.email_settings.find_one(
            {"workspace_id": workspace_id},
            {"_id": 0}
        )
        return settings
    
    async def save_settings(self, workspace_id: str, settings: Dict) -> bool:
        """Save email settings to database"""
        settings["workspace_id"] = workspace_id
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.email_settings.update_one(
            {"workspace_id": workspace_id},
            {"$set": settings},
            upsert=True
        )
        return True
    
    async def send_email(
        self,
        to_email: str,
        template_name: str,
        template_data: Dict,
        workspace_id: str = "global",
        custom_subject: str = None
    ) -> Dict:
        """Send an email using a template"""
        
        # Get email settings
        settings = await self.get_settings(workspace_id)
        if not settings or not settings.get("enabled"):
            logger.warning(f"Email settings not configured for workspace {workspace_id}")
            return {"success": False, "error": "Email niet geconfigureerd"}
        
        # Get template
        template = EMAIL_TEMPLATES.get(template_name)
        if not template:
            return {"success": False, "error": f"Template '{template_name}' niet gevonden"}
        
        try:
            # Add common template data
            template_data["year"] = datetime.now().year
            
            # Render subject and body
            subject = custom_subject or Template(template["subject"]).render(**template_data)
            html_body = Template(template["html"]).render(**template_data)
            
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = f"{settings.get('from_name', 'Facturatie.sr')} <{settings['from_email']}>"
            message["To"] = to_email
            message["Subject"] = subject
            
            # Attach HTML
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=settings["smtp_host"],
                port=settings.get("smtp_port", 587),
                username=settings["smtp_user"],
                password=settings["smtp_password"],
                use_tls=settings.get("use_tls", True),
                start_tls=settings.get("start_tls", True)
            )
            
            # Log successful send
            await self.db.email_logs.insert_one({
                "to_email": to_email,
                "template": template_name,
                "subject": subject,
                "status": "sent",
                "workspace_id": workspace_id,
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Email sent successfully to {to_email}")
            return {"success": True, "message": "Email verzonden"}
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            
            # Log failed send
            await self.db.email_logs.insert_one({
                "to_email": to_email,
                "template": template_name,
                "status": "failed",
                "error": str(e),
                "workspace_id": workspace_id,
                "attempted_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": False, "error": str(e)}
    
    async def send_test_email(self, to_email: str, workspace_id: str = "global") -> Dict:
        """Send a test email to verify settings"""
        return await self.send_email(
            to_email=to_email,
            template_name="welcome",
            template_data={
                "customer_name": "Test Gebruiker",
                "email": to_email,
                "password": "********",
                "company_name": "Test Bedrijf",
                "login_url": "https://facturatie.sr/login"
            },
            workspace_id=workspace_id,
            custom_subject="🧪 Test Email - Facturatie.sr"
        )
    
    async def send_welcome_email(
        self,
        to_email: str,
        customer_name: str,
        password: str,
        company_name: str,
        login_url: str
    ) -> Dict:
        """Send welcome email to new customer"""
        return await self.send_email(
            to_email=to_email,
            template_name="welcome",
            template_data={
                "customer_name": customer_name,
                "email": to_email,
                "password": password,
                "company_name": company_name or "N/A",
                "login_url": login_url
            }
        )
    
    async def send_password_reset_email(
        self,
        to_email: str,
        customer_name: str,
        reset_code: str,
        reset_url: str
    ) -> Dict:
        """Send password reset email"""
        return await self.send_email(
            to_email=to_email,
            template_name="password_reset",
            template_data={
                "customer_name": customer_name,
                "reset_code": reset_code,
                "reset_url": reset_url
            }
        )
    
    async def send_module_expiring_email(
        self,
        to_email: str,
        customer_name: str,
        modules: List[Dict],
        days_remaining: int,
        total_amount: float,
        payment_info: Dict,
        dashboard_url: str
    ) -> Dict:
        """Send module expiring soon notification"""
        return await self.send_email(
            to_email=to_email,
            template_name="module_expiring_soon",
            template_data={
                "customer_name": customer_name,
                "modules": modules,
                "days_remaining": days_remaining,
                "total_amount": f"{total_amount:,.2f}".replace(",", "."),
                "payment_info": payment_info,
                "dashboard_url": dashboard_url
            }
        )
    
    async def send_module_expired_email(
        self,
        to_email: str,
        customer_name: str,
        modules: List[Dict],
        payment_info: Dict,
        dashboard_url: str
    ) -> Dict:
        """Send module expired notification"""
        return await self.send_email(
            to_email=to_email,
            template_name="module_expired",
            template_data={
                "customer_name": customer_name,
                "modules": modules,
                "payment_info": payment_info,
                "dashboard_url": dashboard_url
            }
        )
    
    async def send_payment_confirmed_email(
        self,
        to_email: str,
        customer_name: str,
        modules: List[Dict],
        months: int,
        dashboard_url: str
    ) -> Dict:
        """Send payment confirmed notification"""
        return await self.send_email(
            to_email=to_email,
            template_name="payment_confirmed",
            template_data={
                "customer_name": customer_name,
                "modules": modules,
                "months": months,
                "dashboard_url": dashboard_url
            }
        )
    
    async def send_admin_payment_request_notification(
        self,
        admin_email: str,
        customer_name: str,
        customer_email: str,
        company_name: str,
        modules: List[Dict],
        total_amount: float,
        admin_url: str
    ) -> Dict:
        """Send notification to admin about new payment request"""
        return await self.send_email(
            to_email=admin_email,
            template_name="admin_new_payment_request",
            template_data={
                "customer_name": customer_name,
                "customer_email": customer_email,
                "company_name": company_name or "N/A",
                "modules": modules,
                "total_amount": f"{total_amount:,.2f}".replace(",", "."),
                "admin_url": admin_url
            }
        )


# Singleton instance
email_service = None

def get_email_service(db):
    """Get or create email service instance"""
    global email_service
    if email_service is None:
        email_service = EmailService(db)
    return email_service
