"""
Email Service Module - E-mail verzending voor herinneringen
"""
import os
import asyncio
from typing import Optional, List, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime
import aiosmtplib


class EmailService:
    """Async email service voor het verzenden van herinneringen en facturen"""
    
    def __init__(self):
        self.smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_user = os.environ.get('SMTP_USER', '')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.from_email = os.environ.get('FROM_EMAIL', self.smtp_user)
        self.from_name = os.environ.get('FROM_NAME', 'Facturatie.sr')
        
    def is_configured(self) -> bool:
        """Check of SMTP is geconfigureerd"""
        return bool(self.smtp_user and self.smtp_password)
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Verzend een email
        
        Args:
            to_email: Ontvanger email
            subject: Onderwerp
            body_html: HTML body
            body_text: Plain text body (optioneel)
            attachments: Lijst van {"filename": str, "content": bytes, "mime_type": str}
            cc: CC ontvangers
            bcc: BCC ontvangers
            
        Returns:
            Dict met status en eventuele foutmelding
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "SMTP niet geconfigureerd. Stel SMTP_USER en SMTP_PASSWORD in.",
                "simulated": True
            }
        
        try:
            # Maak email bericht
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            
            # Voeg text en HTML body toe
            if body_text:
                msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))
            
            # Voeg attachments toe
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
            
            # Verzend email
            all_recipients = [to_email]
            if cc:
                all_recipients.extend(cc)
            if bcc:
                all_recipients.extend(bcc)
            
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
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
    
    def generate_reminder_html(
        self,
        herinnering: Dict[str, Any],
        bedrijf: Dict[str, Any],
        factuur: Dict[str, Any]
    ) -> str:
        """Genereer HTML voor betalingsherinnering email"""
        
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
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: {color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }}
        .footer {{ background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }}
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


email_service = EmailService()
