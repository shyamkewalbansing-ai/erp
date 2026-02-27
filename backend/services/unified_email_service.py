"""
Unified Email Service Module - For system notifications, reminders and invoices
Combines email_service.py and boekhouding_email.py functionality
"""
import os
import asyncio
from typing import Optional, List, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime
import aiosmtplib


# Email templates for system notifications
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


class UnifiedEmailService:
    """
    Unified async email service for:
    - System notifications (welcome, password reset, module expiry)
    - Boekhouding reminders and invoices
    - Custom SMTP per user/workspace
    """
    
    def __init__(self, db=None):
        self.db = db
        # Default SMTP settings from environment
        self.default_smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        self.default_smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.default_smtp_user = os.environ.get('SMTP_USER', '')
        self.default_smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.default_from_email = os.environ.get('FROM_EMAIL', '')
        self.default_from_name = os.environ.get('FROM_NAME', 'Facturatie.sr')
    
    async def get_smtp_settings(self, user_id: str = None, workspace_id: str = None) -> Dict[str, Any]:
        """
        Get SMTP settings from database or fallback to defaults
        Priority: user_id settings > workspace_id settings > environment defaults
        """
        settings = None
        
        # Try user-specific settings (boekhouding_instellingen)
        if self.db and user_id:
            settings = await self.db.boekhouding_instellingen.find_one({"user_id": user_id})
            if settings and settings.get('smtp_host'):
                return {
                    "smtp_host": settings.get('smtp_host'),
                    "smtp_port": settings.get('smtp_port', 587),
                    "smtp_user": settings.get('smtp_user'),
                    "smtp_password": settings.get('smtp_password'),
                    "from_email": settings.get('smtp_from_email', settings.get('smtp_user')),
                    "from_name": settings.get('smtp_from_name', 'Facturatie.sr'),
                    "enabled": bool(settings.get('smtp_user') and settings.get('smtp_password'))
                }
        
        # Try workspace settings
        if self.db and workspace_id:
            settings = await self.db.email_settings.find_one({"workspace_id": workspace_id})
            if settings and settings.get('smtp_host'):
                return settings
        
        # Fallback to environment defaults
        return {
            "smtp_host": self.default_smtp_host,
            "smtp_port": self.default_smtp_port,
            "smtp_user": self.default_smtp_user,
            "smtp_password": self.default_smtp_password,
            "from_email": self.default_from_email or self.default_smtp_user,
            "from_name": self.default_from_name,
            "enabled": bool(self.default_smtp_user and self.default_smtp_password)
        }
    
    def is_configured(self, settings: Dict[str, Any]) -> bool:
        """Check if SMTP is properly configured"""
        return bool(settings.get('smtp_user') and settings.get('smtp_password'))
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        user_id: str = None,
        workspace_id: str = None
    ) -> Dict[str, Any]:
        """
        Send an email with optional attachments
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (optional)
            attachments: List of {"filename": str, "content": bytes, "mime_type": str}
            cc: CC recipients
            bcc: BCC recipients
            user_id: User ID for SMTP settings lookup
            workspace_id: Workspace ID for SMTP settings lookup
            
        Returns:
            Dict with success status and message/error
        """
        settings = await self.get_smtp_settings(user_id, workspace_id)
        
        if not self.is_configured(settings):
            return {
                "success": False,
                "error": "SMTP niet geconfigureerd. Stel SMTP-instellingen in via Instellingen > E-mail.",
                "simulated": True
            }
        
        try:
            # Create email message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.get('from_name', 'Facturatie.sr')} <{settings.get('from_email', settings['smtp_user'])}>"
            msg['To'] = to_email
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            
            # Add text and HTML body
            if body_text:
                msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))
            
            # Add attachments
            if attachments:
                for att in attachments:
                    part = MIMEApplication(att['content'])
                    part.add_header(
                        'Content-Disposition', 
                        'attachment', 
                        filename=att['filename']
                    )
                    if att.get('mime_type'):
                        part.set_type(att['mime_type'])
                    msg.attach(part)
            
            # Send email
            all_recipients = [to_email]
            if cc:
                all_recipients.extend(cc)
            if bcc:
                all_recipients.extend(bcc)
            
            await aiosmtplib.send(
                msg,
                hostname=settings['smtp_host'],
                port=settings['smtp_port'],
                username=settings['smtp_user'],
                password=settings['smtp_password'],
                start_tls=True
            )
            
            return {
                "success": True,
                "message": f"Email verzonden naar {to_email}",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # System notification methods
    async def send_welcome_email(self, to_email: str, user_id: str = None) -> Dict[str, Any]:
        """Send welcome email to new user"""
        template = EMAIL_TEMPLATES["welcome"]
        return await self.send_email(to_email, template["subject"], template["body"], user_id=user_id)
    
    async def send_password_reset_email(self, to_email: str, reset_link: str, user_id: str = None) -> Dict[str, Any]:
        """Send password reset email"""
        template = EMAIL_TEMPLATES["password_reset"]
        body = template["body"].replace("{reset_link}", reset_link)
        return await self.send_email(to_email, template["subject"], body, user_id=user_id)
    
    async def send_module_expiring_email(self, to_email: str, module_name: str, user_id: str = None) -> Dict[str, Any]:
        """Send module expiring notification"""
        template = EMAIL_TEMPLATES["module_expiring"]
        body = template["body"].replace("{module_name}", module_name)
        return await self.send_email(to_email, template["subject"], body, user_id=user_id)
    
    async def send_module_expired_email(self, to_email: str, module_name: str, user_id: str = None) -> Dict[str, Any]:
        """Send module expired notification"""
        template = EMAIL_TEMPLATES["module_expired"]
        body = template["body"].replace("{module_name}", module_name)
        return await self.send_email(to_email, template["subject"], body, user_id=user_id)
    
    async def send_test_email(self, to_email: str, user_id: str = None) -> Dict[str, Any]:
        """Send test email to verify SMTP configuration"""
        return await self.send_email(
            to_email,
            "Test Email - Facturatie.sr",
            "<h1>Test Geslaagd!</h1><p>Uw SMTP-instellingen zijn correct geconfigureerd.</p>",
            user_id=user_id
        )
    
    # Boekhouding-specific methods
    def generate_reminder_html(
        self,
        herinnering: Dict[str, Any],
        bedrijf: Dict[str, Any],
        factuur: Dict[str, Any]
    ) -> str:
        """Generate HTML for payment reminder email"""
        
        type_labels = {
            'eerste': 'Eerste Betalingsherinnering',
            'tweede': 'Tweede Betalingsherinnering',
            'aanmaning': 'Aanmaning'
        }
        
        type_colors = {
            'eerste': '#f59e0b',
            'tweede': '#f97316',
            'aanmaning': '#dc2626'
        }
        
        herinnering_type = herinnering.get('type', 'eerste')
        color = type_colors.get(herinnering_type, '#f59e0b')
        
        # Get template colors from bedrijf settings
        primary_color = bedrijf.get('factuur_primaire_kleur', '#1e293b')
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: {color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }}
        .footer {{ background: {primary_color}; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
        .amount {{ font-size: 24px; font-weight: bold; color: {color}; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }}
        .details {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }}
        .details table {{ width: 100%; }}
        .details td {{ padding: 8px 0; }}
        .details td:first-child {{ font-weight: bold; width: 40%; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{type_labels.get(herinnering_type, 'Betalingsherinnering')}</h1>
    </div>
    <div class="content">
        <p>Geachte heer/mevrouw,</p>
        {'<p>Bij controle van onze administratie is ons gebleken dat de betaling van onderstaande factuur nog niet door ons is ontvangen.</p>' if herinnering_type == 'eerste' else ''}
        {'<p>Ondanks onze eerdere herinnering hebben wij nog geen betaling mogen ontvangen. Wij verzoeken u <strong>dringend</strong> binnen 7 dagen te betalen.</p>' if herinnering_type == 'tweede' else ''}
        {'<p>Tot op heden hebben wij geen betaling ontvangen. Indien wij binnen <strong>5 dagen</strong> geen betaling ontvangen, nemen wij incassomaatregelen.</p>' if herinnering_type == 'aanmaning' else ''}
        <div class="amount">Openstaand: {factuur.get('valuta', 'SRD')} {herinnering.get('openstaand_bedrag', 0):,.2f}</div>
        <div class="details">
            <table>
                <tr><td>Factuurnummer:</td><td>{herinnering.get('factuurnummer', '')}</td></tr>
                <tr><td>Factuurdatum:</td><td>{factuur.get('factuurdatum', '')}</td></tr>
                <tr><td>Vervaldatum:</td><td>{factuur.get('vervaldatum', '')}</td></tr>
            </table>
        </div>
        <h3>Betalingsgegevens</h3>
        <div class="details">
            <table>
                <tr><td>Bank:</td><td>{bedrijf.get('bank_naam', '-')}</td></tr>
                <tr><td>Rekeningnummer:</td><td>{bedrijf.get('bank_rekening', '-')}</td></tr>
                <tr><td>Onder vermelding van:</td><td>{herinnering.get('factuurnummer', '')}</td></tr>
            </table>
        </div>
        <p>Mocht u reeds betaald hebben, dan kunt u deze herinnering als niet verzonden beschouwen.</p>
        <p>Met vriendelijke groet,<br><strong>{bedrijf.get('bedrijfsnaam', '')}</strong></p>
    </div>
    <div class="footer">
        <p>{bedrijf.get('bedrijfsnaam', '')} | {bedrijf.get('adres', '')} | {bedrijf.get('plaats', '')}</p>
    </div>
</body>
</html>
"""
        return html
    
    def generate_invoice_html(
        self,
        factuur: Dict[str, Any],
        bedrijf: Dict[str, Any],
        debiteur: Dict[str, Any] = None
    ) -> str:
        """Generate HTML for invoice email"""
        
        # Get template colors
        primary_color = bedrijf.get('factuur_primaire_kleur', '#1e293b')
        secondary_color = bedrijf.get('factuur_secundaire_kleur', '#f1f5f9')
        
        klant_naam = debiteur.get('naam', '') if debiteur else factuur.get('debiteur_naam', '')
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: {primary_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: {secondary_color}; padding: 30px; border: 1px solid #e2e8f0; }}
        .footer {{ background: {primary_color}; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
        .amount {{ font-size: 24px; font-weight: bold; color: {primary_color}; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Factuur {factuur.get('factuurnummer', '')}</h1>
    </div>
    <div class="content">
        <p>Geachte {klant_naam},</p>
        <p>Hierbij ontvangt u onze factuur. In de bijlage vindt u het PDF-bestand.</p>
        <div class="amount">Totaal: {factuur.get('valuta', 'SRD')} {factuur.get('totaal_incl_btw', 0):,.2f}</div>
        <p>Wij verzoeken u vriendelijk het bedrag binnen {bedrijf.get('standaard_betalingstermijn', 30)} dagen over te maken.</p>
        <p>Met vriendelijke groet,<br><strong>{bedrijf.get('bedrijfsnaam', '')}</strong></p>
    </div>
    <div class="footer">
        <p>{bedrijf.get('bedrijfsnaam', '')} | {bedrijf.get('adres', '')} | {bedrijf.get('plaats', '')}</p>
    </div>
</body>
</html>
"""
        return html


# Factory function for backwards compatibility
def get_email_service(db=None) -> UnifiedEmailService:
    """Factory function to create unified email service"""
    return UnifiedEmailService(db)


# Global instance for boekhouding (backwards compatibility)
email_service = UnifiedEmailService()
