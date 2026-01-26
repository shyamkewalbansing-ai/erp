from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.colors import HexColor, white as WHITE
import httpx
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from PIL import Image as PILImage
import json
import asyncio

# AI Chat imports
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'surirentals')]

# JWT Configuration - use environment variable or generate a secure default
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'suri-rentals-default-secret-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Facturatie N.V. API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== GLOBAL EXCEPTION HANDLER ====================
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions to prevent server crashes"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.hostinger.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'info@facturatie.sr')
APP_URL = os.environ.get('APP_URL', 'https://facturatie.sr')

def send_email(to_email: str, subject: str, html_content: str):
    """Send email via SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"Facturatie N.V. <{SMTP_FROM}>"
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_welcome_email(name: str, email: str, password: str, plan_type: str):
    """Send welcome email to new customer"""
    
    plan_text = {
        'trial': '3 dagen gratis proefperiode',
        'active': 'Actief abonnement',
        'free': 'Gratis account (onbeperkt)',
        'none': 'Account aangemaakt (wacht op activatie)'
    }.get(plan_type, 'Account aangemaakt')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #0caf60 0%, #0a8f4e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0caf60; }}
            .credentials p {{ margin: 8px 0; }}
            .label {{ color: #666; font-size: 14px; }}
            .value {{ font-weight: bold; color: #333; font-size: 16px; }}
            .button {{ display: inline-block; background: #0caf60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Welkom bij Facturatie N.V.!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Uw verhuurbeheersysteem</p>
            </div>
            <div class="content">
                <p>Beste {name},</p>
                <p>Uw account is succesvol aangemaakt. Hieronder vindt u uw inloggegevens:</p>
                
                <div class="credentials">
                    <p><span class="label">E-mailadres:</span><br><span class="value">{email}</span></p>
                    <p><span class="label">Wachtwoord:</span><br><span class="value">{password}</span></p>
                    <p><span class="label">Account type:</span><br><span class="value">{plan_text}</span></p>
                </div>
                
                <p style="text-align: center;">
                    <a href="{APP_URL}/login" class="button">Nu Inloggen</a>
                </p>
                
                <p><strong>Belangrijk:</strong> Wijzig uw wachtwoord na de eerste keer inloggen via Instellingen.</p>
                
                <p>Met vriendelijke groet,<br>Het Facturatie N.V. Team</p>
            </div>
            <div class="footer">
                <p>© 2026 Facturatie N.V. - Verhuurbeheersysteem</p>
                <p>Dit is een automatisch gegenereerd bericht.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, "Welkom bij Facturatie N.V. - Uw Inloggegevens", html_content)

# Health check endpoint (required for Kubernetes deployment)
# Define at app level before any other routes
@app.get("/health")
@app.get("/healthz")
@app.get("/")
async def health_check():
    return {"status": "healthy"}

# ==================== MODELS ====================

# Subscription Constants
SUBSCRIPTION_PRICE_SRD = 3500.0
SUBSCRIPTION_DAYS = 30
TRIAL_DAYS = 3
SUPER_ADMIN_EMAIL = "admin@facturatie.sr"  # Default super admin

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    company_name: Optional[str] = None
    role: str  # 'superadmin', 'customer'
    subscription_status: str  # 'active', 'expired', 'trial', 'none'
    subscription_end_date: Optional[str] = None
    created_at: str
    logo: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Subscription Models
class SubscriptionCreate(BaseModel):
    user_id: str
    months: int = 1
    payment_method: str  # 'cash', 'bank_transfer', 'other'
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    amount: float
    months: int
    start_date: str
    end_date: str
    payment_method: str
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    status: str  # 'active', 'expired'
    created_at: str

class CustomerResponse(BaseModel):
    id: str
    email: str
    name: str
    company_name: Optional[str] = None
    role: str
    subscription_status: str
    subscription_end_date: Optional[str] = None
    created_at: str
    total_paid: float
    last_payment_date: Optional[str] = None

# Tenant Models
class TenantCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    id_number: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    id_number: Optional[str] = None

class TenantResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    id_number: Optional[str] = None
    created_at: str
    user_id: str

# Apartment Models
class ApartmentCreate(BaseModel):
    name: str
    address: str
    rent_amount: float
    description: Optional[str] = None
    bedrooms: Optional[int] = 1
    bathrooms: Optional[int] = 1

class ApartmentUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    rent_amount: Optional[float] = None
    description: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    status: Optional[str] = None
    tenant_id: Optional[str] = None

class ApartmentResponse(BaseModel):
    id: str
    name: str
    address: str
    rent_amount: float
    description: Optional[str] = None
    bedrooms: int
    bathrooms: int
    status: str  # 'available', 'occupied'
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    created_at: str
    user_id: str

# Payment Models
class PaymentCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    amount: float
    payment_date: str
    payment_type: str  # 'rent', 'deposit', 'loan', 'other'
    description: Optional[str] = None
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    loan_id: Optional[str] = None  # For loan repayments

class PaymentResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    apartment_id: str
    apartment_name: Optional[str] = None
    amount: float
    payment_date: str
    payment_type: str
    description: Optional[str] = None
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    loan_id: Optional[str] = None
    created_at: str
    user_id: str

# Deposit Models
class DepositCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    amount: float
    deposit_date: str
    status: str = "held"  # 'held', 'returned', 'partial_returned'
    notes: Optional[str] = None

class DepositUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None
    return_date: Optional[str] = None
    return_amount: Optional[float] = None
    notes: Optional[str] = None

class DepositResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    apartment_id: str
    apartment_name: Optional[str] = None
    amount: float
    deposit_date: str
    status: str
    return_date: Optional[str] = None
    return_amount: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
    user_id: str

# Reminder Models
class ReminderResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: str
    apartment_id: str
    apartment_name: str
    amount_due: float
    due_date: str
    days_overdue: int
    reminder_type: str  # 'upcoming', 'overdue'

# Kasgeld (Cash Fund) Models
class KasgeldCreate(BaseModel):
    amount: float
    transaction_type: str  # 'deposit' (storting), 'withdrawal' (opname)
    description: Optional[str] = None
    transaction_date: str

class KasgeldResponse(BaseModel):
    id: str
    amount: float
    transaction_type: str  # 'deposit', 'withdrawal', 'payment' (huurbetalingen)
    description: Optional[str] = None
    transaction_date: str
    created_at: str
    user_id: str
    source: Optional[str] = None  # 'manual' or 'payment'

class KasgeldBalanceResponse(BaseModel):
    total_balance: float
    total_deposits: float
    total_payments: float  # Inkomsten uit huurbetalingen
    total_withdrawals: float
    total_maintenance_costs: float
    total_salary_payments: float  # Salarisbetalingen
    transactions: List[KasgeldResponse]

# Lening (Loan) Models
class LoanCreate(BaseModel):
    tenant_id: str
    amount: float
    description: Optional[str] = None
    loan_date: str

class LoanUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    loan_date: Optional[str] = None

class LoanResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    amount: float
    amount_paid: float = 0
    remaining: float = 0
    description: Optional[str] = None
    loan_date: str
    status: str = "open"  # 'open', 'partial', 'paid'
    created_at: str
    user_id: str

# Onderhoud (Maintenance) Models
class MaintenanceCreate(BaseModel):
    apartment_id: str
    category: str  # 'wc', 'kraan', 'douche', 'keuken', 'verven', 'kasten', 'overig'
    description: str
    cost: float
    maintenance_date: str
    status: str = "completed"  # 'pending', 'in_progress', 'completed'
    cost_type: str = "kasgeld"  # 'kasgeld' (verhuurder betaalt) or 'tenant' (huurder betaalt)

class MaintenanceUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    maintenance_date: Optional[str] = None
    status: Optional[str] = None
    cost_type: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: str
    apartment_id: str
    apartment_name: Optional[str] = None
    category: str
    description: str
    cost: float
    maintenance_date: str
    status: str
    cost_type: str = "kasgeld"
    created_at: str
    user_id: str

# Werknemer (Employee) Models
class EmployeeCreate(BaseModel):
    name: str
    position: str  # functie
    phone: Optional[str] = None
    email: Optional[str] = None
    salary: float  # maandelijks salaris
    start_date: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    salary: Optional[float] = None
    status: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: str
    name: str
    position: str
    phone: Optional[str] = None
    email: Optional[str] = None
    salary: float
    start_date: str
    status: str  # 'active', 'inactive'
    created_at: str
    user_id: str

# Salaris (Salary Payment) Models
class SalaryPaymentCreate(BaseModel):
    employee_id: str
    amount: float
    payment_date: str
    period_month: int
    period_year: int
    description: Optional[str] = None

class SalaryPaymentResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    amount: float
    payment_date: str
    period_month: int
    period_year: int
    description: Optional[str] = None
    created_at: str
    user_id: str

# Exchange Rate Models
class ExchangeRateResponse(BaseModel):
    srd_to_eur: float
    eur_to_srd: float
    last_updated: str
    source: str

# ==================== ADD-ON MODELS ====================

class AddonCreate(BaseModel):
    name: str
    slug: str  # Unique identifier, e.g., 'vastgoed_beheer'
    description: Optional[str] = None
    price: float
    is_active: bool = True

class AddonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None

class AddonResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    is_active: bool
    created_at: str

class UserAddonCreate(BaseModel):
    user_id: str
    addon_id: str
    months: int = 1
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None

class UserAddonResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    addon_id: str
    addon_name: Optional[str] = None
    addon_slug: Optional[str] = None
    status: str  # 'active', 'expired', 'pending'
    start_date: str
    end_date: Optional[str] = None
    created_at: str

class AddonRequestCreate(BaseModel):
    addon_id: str
    notes: Optional[str] = None

class AddonRequestResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    addon_id: str
    addon_name: Optional[str] = None
    addon_price: Optional[float] = None
    status: str  # 'pending', 'approved', 'rejected'
    notes: Optional[str] = None
    created_at: str

# Admin Dashboard Models
class AdminDashboardStats(BaseModel):
    total_customers: int
    active_subscriptions: int
    expired_subscriptions: int
    total_revenue: float
    revenue_this_month: float
    recent_subscriptions: List[SubscriptionResponse]

# ==================== LANDING PAGE CMS MODELS ====================

class LandingPageSection(BaseModel):
    id: str
    section_type: str  # 'hero', 'features', 'pricing', 'about', 'terms', 'privacy', 'hrm', 'custom'
    title: str
    content: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    order: int = 0
    metadata: Optional[dict] = None  # For additional custom data

class LandingPageSectionCreate(BaseModel):
    section_type: str
    title: str
    content: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    order: int = 0
    metadata: Optional[dict] = None

class LandingPageSectionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    metadata: Optional[dict] = None

class LandingPageSettings(BaseModel):
    company_name: str = "Facturatie N.V."
    company_email: str = "info@facturatie.sr"
    company_phone: str = "+597 8934982"
    company_address: str = "Paramaribo, Suriname"
    logo_url: Optional[str] = None
    footer_text: Optional[str] = None
    social_links: Optional[dict] = None  # {"facebook": "url", "instagram": "url", etc}
    login_image_url: Optional[str] = None  # Afbeelding voor login pagina
    register_image_url: Optional[str] = None  # Afbeelding voor registratie pagina
    # Global site settings
    site_title: Optional[str] = "Facturatie N.V."
    site_description: Optional[str] = None
    primary_color: Optional[str] = "#3b82f6"
    secondary_color: Optional[str] = "#1e40af"
    font_family: Optional[str] = "Inter"

# ==================== CMS MODELS ====================

class CMSPageSection(BaseModel):
    """A section/block within a CMS page"""
    id: Optional[str] = None
    type: str  # 'hero', 'text', 'image_text', 'features', 'cta', 'gallery', 'pricing', 'contact', 'testimonials', 'faq', 'custom_html'
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Optional[str] = None  # Rich text / HTML content
    image_url: Optional[str] = None
    background_image_url: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    button_style: Optional[str] = "primary"  # 'primary', 'secondary', 'outline'
    layout: Optional[str] = "center"  # 'left', 'center', 'right', 'image-left', 'image-right'
    items: Optional[List[dict]] = None  # For features, gallery, testimonials, faq, etc.
    settings: Optional[dict] = None  # Extra settings per section type
    order: int = 0
    is_visible: bool = True

class CMSPage(BaseModel):
    """A CMS managed page"""
    id: Optional[str] = None
    title: str
    slug: str  # URL path e.g. 'about-us', 'contact'
    description: Optional[str] = None  # SEO description
    template: str = "default"  # 'default', 'landing', 'sidebar', 'full-width', 'blank'
    sections: List[CMSPageSection] = []
    is_published: bool = True
    show_in_menu: bool = True
    menu_order: int = 0
    menu_label: Optional[str] = None  # Override title in menu
    parent_page_id: Optional[str] = None  # For submenu
    show_header: bool = True
    show_footer: bool = True
    custom_css: Optional[str] = None
    seo_title: Optional[str] = None
    seo_keywords: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CMSMenuItem(BaseModel):
    """Menu item for navigation"""
    id: Optional[str] = None
    label: str
    link: str  # URL or page slug
    page_id: Optional[str] = None  # Link to CMS page
    is_external: bool = False
    open_in_new_tab: bool = False
    parent_id: Optional[str] = None  # For submenu
    order: int = 0
    is_visible: bool = True

class CMSMenu(BaseModel):
    """Navigation menu"""
    id: Optional[str] = None
    name: str  # 'main', 'footer', etc.
    items: List[CMSMenuItem] = []

class CMSFooter(BaseModel):
    """Footer configuration"""
    columns: List[dict] = []  # Each column has title and links
    copyright_text: Optional[str] = None
    show_social_links: bool = True
    show_newsletter: bool = False
    newsletter_title: Optional[str] = "Schrijf u in voor onze nieuwsbrief"
    background_color: Optional[str] = "#1f2937"
    text_color: Optional[str] = "#ffffff"
    custom_html: Optional[str] = None

class CMSTemplate(BaseModel):
    """Pre-made page templates"""
    id: str
    name: str
    description: str
    preview_image: Optional[str] = None
    category: str  # 'landing', 'business', 'portfolio', 'ecommerce'
    sections: List[dict] = []  # Pre-configured sections

class PublicOrderCreate(BaseModel):
    """Order from landing page with account creation"""
    name: str
    email: EmailStr
    phone: str
    password: str  # For account creation
    company_name: Optional[str] = None
    addon_ids: List[str]  # Which add-ons they want
    message: Optional[str] = None

class PublicOrderResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    addon_ids: List[str]
    addon_names: Optional[List[str]] = None
    total_price: Optional[float] = None
    message: Optional[str] = None
    status: str  # 'pending', 'pending_payment', 'paid', 'contacted', 'converted', 'rejected'
    payment_url: Optional[str] = None
    payment_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: str

# ==================== MOPE PAYMENT MODELS ====================

class MopeSettings(BaseModel):
    """Mope Payment Gateway Settings"""
    is_enabled: bool = False
    use_live_mode: bool = False  # False = test, True = live
    test_token: Optional[str] = None
    live_token: Optional[str] = None
    webhook_secret: Optional[str] = None

class MopePaymentRequest(BaseModel):
    """Create a Mope payment request"""
    amount: float
    description: str
    order_id: str
    redirect_url: str

class MopePaymentResponse(BaseModel):
    """Response from Mope payment creation"""
    id: str
    payment_url: str
    status: str

class MopeWebhook(BaseModel):
    """Webhook from Mope"""
    payment_request_id: str
    status: str
    amount: Optional[float] = None

# Dashboard Models
class DashboardStats(BaseModel):
    total_apartments: int
    occupied_apartments: int
    available_apartments: int
    total_tenants: int
    total_income_this_month: float
    total_outstanding: float
    total_outstanding_loans: float = 0  # Openstaande leningen
    total_deposits_held: float
    total_kasgeld: float
    total_employees: int
    total_salary_this_month: float
    recent_payments: List[PaymentResponse]
    reminders: List[ReminderResponse]

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_subscription_status(user: dict) -> tuple:
    """Check subscription status and return (status, end_date, is_trial)"""
    if user.get("role") == "superadmin":
        return "active", None, False
    
    end_date = user.get("subscription_end_date")
    is_trial = user.get("is_trial", False)
    
    if not end_date:
        return "none", None, False
    
    try:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        if end_dt > datetime.now(timezone.utc):
            if is_trial:
                return "trial", end_date, True
            return "active", end_date, False
        else:
            return "expired", end_date, is_trial
    except:
        return "none", None, False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Ongeldige token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
        
        # Update subscription status
        status, end_date, is_trial = get_subscription_status(user)
        user["subscription_status"] = status
        user["subscription_end_date"] = end_date
        user["is_trial"] = is_trial
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

async def get_current_active_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user and verify they have an active subscription or trial"""
    user = await get_current_user(credentials)
    
    # Superadmin always has access
    if user.get("role") == "superadmin":
        return user
    
    # Check subscription - allow both active and trial
    status = user.get("subscription_status")
    if status not in ("active", "trial"):
        raise HTTPException(
            status_code=403, 
            detail="Uw abonnement is verlopen. Ga naar Abonnement om uw account te activeren."
        )
    
    return user

async def get_superadmin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify current user is superadmin"""
    user = await get_current_user(credentials)
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Alleen voor beheerders")
    return user

async def get_user_active_addons(user_id: str) -> List[str]:
    """Get list of active addon slugs for a user"""
    now = datetime.now(timezone.utc)
    user_addons = await db.user_addons.find({
        "user_id": user_id,
        "status": "active"
    }).to_list(length=100)
    
    active_slugs = []
    for ua in user_addons:
        # Check if addon is still valid (not expired)
        end_date = ua.get("end_date")
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt < now:
                    # Expired, update status
                    await db.user_addons.update_one(
                        {"id": ua["id"]},
                        {"$set": {"status": "expired"}}
                    )
                    continue
            except:
                pass
        
        # Get addon info
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        if addon and addon.get("is_active", True):
            active_slugs.append(addon.get("slug", ""))
    
    return active_slugs

async def user_has_addon(user_id: str, addon_slug: str) -> bool:
    """Check if user has a specific addon active"""
    active_addons = await get_user_active_addons(user_id)
    return addon_slug in active_addons

async def get_current_active_user_with_addon(addon_slug: str):
    """Dependency factory for checking addon access"""
    async def dependency(credentials: HTTPAuthorizationCredentials = Depends(security)):
        user = await get_current_user(credentials)
        
        # Superadmin always has access
        if user.get("role") == "superadmin":
            return user
        
        # Check subscription first
        status = user.get("subscription_status")
        if status not in ("active", "trial"):
            raise HTTPException(
                status_code=403, 
                detail="Uw abonnement is verlopen. Ga naar Abonnement om uw account te activeren."
            )
        
        # Check addon
        has_addon = await user_has_addon(user["id"], addon_slug)
        if not has_addon:
            raise HTTPException(
                status_code=403,
                detail=f"U heeft de add-on '{addon_slug}' niet geactiveerd. Ga naar Abonnement om deze te activeren."
            )
        
        return user
    return dependency

def format_currency(amount: float) -> str:
    """Format amount as SRD currency"""
    return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    # Check if this is the first user or superadmin email
    user_count = await db.users.count_documents({})
    is_superadmin = user_count == 0 or user_data.email == SUPER_ADMIN_EMAIL
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # New customers get a 3-day trial
    trial_end_date = None
    is_trial = False
    if not is_superadmin:
        trial_end_date = (now + timedelta(days=TRIAL_DAYS)).isoformat()
        is_trial = True
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "company_name": user_data.company_name,
        "role": "superadmin" if is_superadmin else "customer",
        "subscription_end_date": trial_end_date,
        "is_trial": is_trial,
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    
    status, end_date, _ = get_subscription_status(user_doc)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            company_name=user_data.company_name,
            role=user_doc["role"],
            subscription_status=status,
            subscription_end_date=end_date,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    token = create_token(user["id"], user["email"])
    
    status, end_date, _ = get_subscription_status(user)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            company_name=user.get("company_name"),
            role=user.get("role", "customer"),
            subscription_status=status,
            subscription_end_date=end_date,
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        company_name=current_user.get("company_name"),
        role=current_user.get("role", "customer"),
        subscription_status=current_user.get("subscription_status", "none"),
        subscription_end_date=current_user.get("subscription_end_date"),
        created_at=current_user["created_at"],
        logo=current_user.get("logo")
    )

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u instructies"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.users.update_one(
        {"email": request.email},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_expiry.isoformat()
        }}
    )
    
    # Send email with reset link
    try:
        smtp_host = os.environ.get("SMTP_HOST", "smtp.hostinger.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "465"))
        smtp_user = os.environ.get("SMTP_USER", "info@facturatie.sr")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        
        if smtp_password:
            # Build reset link - use frontend URL
            frontend_url = os.environ.get("FRONTEND_URL", "https://facturatie.sr")
            reset_link = f"{frontend_url}/reset-wachtwoord/{reset_token}"
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Wachtwoord Resetten - Facturatie N.V."
            msg["From"] = smtp_user
            msg["To"] = request.email
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0caf60;">Facturatie N.V.</h1>
                </div>
                <h2>Wachtwoord Resetten</h2>
                <p>Beste {user.get('name', 'Klant')},</p>
                <p>U heeft een verzoek ingediend om uw wachtwoord te resetten.</p>
                <p>Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #0caf60; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 25px; font-weight: bold;">
                        Wachtwoord Resetten
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Deze link is 1 uur geldig. Als u geen wachtwoord reset heeft aangevraagd, 
                    kunt u deze e-mail negeren.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    Facturatie N.V. - Verhuurbeheersysteem
                </p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(html_content, "html"))
            
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, request.email, msg.as_string())
            
            logger.info(f"Password reset email sent to {request.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Don't expose email sending errors to user
    
    return {"message": "Als dit e-mailadres bestaat, ontvangt u instructies"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    # Find user with valid reset token
    user = await db.users.find_one(
        {"reset_token": request.token},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen reset link")
    
    # Check if token is expired
    expiry = user.get("reset_token_expiry")
    if expiry:
        try:
            expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expiry_dt:
                raise HTTPException(status_code=400, detail="Reset link is verlopen")
        except:
            raise HTTPException(status_code=400, detail="Ongeldige reset link")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens bevatten")
    
    # Hash new password
    hashed_password = hash_password(request.new_password)
    
    # Update password and clear reset token
    await db.users.update_one(
        {"reset_token": request.token},
        {"$set": {"password": hashed_password},
         "$unset": {"reset_token": "", "reset_token_expiry": ""}}
    )
    
    return {"message": "Wachtwoord succesvol gewijzigd"}

# ==================== TENANT ROUTES ====================

@api_router.post("/tenants", response_model=TenantResponse)
async def create_tenant(tenant_data: TenantCreate, current_user: dict = Depends(get_current_active_user)):
    tenant_id = str(uuid.uuid4())
    tenant_doc = {
        "id": tenant_id,
        "name": tenant_data.name,
        "email": tenant_data.email,
        "phone": tenant_data.phone,
        "address": tenant_data.address,
        "id_number": tenant_data.id_number,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.tenants.insert_one(tenant_doc)
    tenant_doc.pop("_id", None)
    
    return TenantResponse(**tenant_doc)

@api_router.get("/tenants", response_model=List[TenantResponse])
async def get_tenants(current_user: dict = Depends(get_current_active_user)):
    tenants = await db.tenants.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(1000)
    
    result = []
    for t in tenants:
        try:
            # Safely build tenant response with defaults for missing fields
            result.append(TenantResponse(
                id=t.get("id", ""),
                name=t.get("name", "Onbekend"),
                email=t.get("email"),
                phone=t.get("phone", ""),
                address=t.get("address"),
                id_number=t.get("id_number"),
                created_at=t.get("created_at", ""),
                user_id=t.get("user_id", "")
            ))
        except Exception as e:
            logger.error(f"Error processing tenant {t.get('id')}: {e}")
            continue
    return result

@api_router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Safely build response with defaults
    return TenantResponse(
        id=tenant.get("id", tenant_id),
        name=tenant.get("name", "Onbekend"),
        email=tenant.get("email"),
        phone=tenant.get("phone", ""),
        address=tenant.get("address"),
        id_number=tenant.get("id_number"),
        created_at=tenant.get("created_at", ""),
        user_id=tenant.get("user_id", current_user["id"])
    )

@api_router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: str, tenant_data: TenantUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in tenant_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.tenants.update_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return TenantResponse(**tenant)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.tenants.delete_one({"id": tenant_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return {"message": "Huurder verwijderd"}

# ==================== APARTMENT ROUTES ====================

@api_router.post("/apartments", response_model=ApartmentResponse)
async def create_apartment(apt_data: ApartmentCreate, current_user: dict = Depends(get_current_active_user)):
    apt_id = str(uuid.uuid4())
    apt_doc = {
        "id": apt_id,
        "name": apt_data.name,
        "address": apt_data.address,
        "rent_amount": apt_data.rent_amount,
        "description": apt_data.description,
        "bedrooms": apt_data.bedrooms or 1,
        "bathrooms": apt_data.bathrooms or 1,
        "status": "available",
        "tenant_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.apartments.insert_one(apt_doc)
    
    return ApartmentResponse(**apt_doc)

@api_router.get("/apartments", response_model=List[ApartmentResponse])
async def get_apartments(current_user: dict = Depends(get_current_active_user)):
    apartments = await db.apartments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Batch fetch tenant names to avoid N+1 queries
    tenant_ids = [apt["tenant_id"] for apt in apartments if apt.get("tenant_id")]
    tenant_map = {}
    if tenant_ids:
        tenants = await db.tenants.find(
            {"id": {"$in": tenant_ids}},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(1000)
        tenant_map = {t["id"]: t["name"] for t in tenants}
    
    result = []
    for apt in apartments:
        try:
            # Safely build apartment response with defaults for missing fields
            result.append(ApartmentResponse(
                id=apt.get("id", ""),
                name=apt.get("name", "Onbekend"),
                address=apt.get("address", ""),
                rent_amount=apt.get("rent_amount", 0) or 0,
                description=apt.get("description"),
                bedrooms=apt.get("bedrooms", 1) or 1,
                bathrooms=apt.get("bathrooms", 1) or 1,
                status=apt.get("status", "available"),
                tenant_id=apt.get("tenant_id"),
                tenant_name=tenant_map.get(apt.get("tenant_id")) if apt.get("tenant_id") else None,
                created_at=apt.get("created_at", ""),
                user_id=apt.get("user_id", "")
            ))
        except Exception as e:
            logger.error(f"Error processing apartment {apt.get('id')}: {e}")
            continue
    return result

@api_router.get("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def get_apartment(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    apt = await db.apartments.find_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    tenant_name = None
    if apt.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
        tenant_name = tenant.get("name") if tenant else None
    
    # Safely build response with defaults
    return ApartmentResponse(
        id=apt.get("id", apartment_id),
        name=apt.get("name", "Onbekend"),
        address=apt.get("address", ""),
        rent_amount=apt.get("rent_amount", 0) or 0,
        description=apt.get("description"),
        bedrooms=apt.get("bedrooms", 1) or 1,
        bathrooms=apt.get("bathrooms", 1) or 1,
        status=apt.get("status", "available"),
        tenant_id=apt.get("tenant_id"),
        tenant_name=tenant_name,
        created_at=apt.get("created_at", ""),
        user_id=apt.get("user_id", current_user["id"])
    )

@api_router.put("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def update_apartment(apartment_id: str, apt_data: ApartmentUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in apt_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.apartments.update_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    apt = await db.apartments.find_one({"id": apartment_id}, {"_id": 0})
    
    tenant_name = None
    if apt.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
        tenant_name = tenant.get("name") if tenant else None
    
    # Safely build response with defaults
    return ApartmentResponse(
        id=apt.get("id", apartment_id),
        name=apt.get("name", "Onbekend"),
        address=apt.get("address", ""),
        rent_amount=apt.get("rent_amount", 0) or 0,
        description=apt.get("description"),
        bedrooms=apt.get("bedrooms", 1) or 1,
        bathrooms=apt.get("bathrooms", 1) or 1,
        status=apt.get("status", "available"),
        tenant_id=apt.get("tenant_id"),
        tenant_name=tenant_name,
        created_at=apt.get("created_at", ""),
        user_id=apt.get("user_id", current_user["id"])
    )

@api_router.delete("/apartments/{apartment_id}")
async def delete_apartment(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.apartments.delete_one({"id": apartment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

@api_router.post("/apartments/{apartment_id}/assign-tenant")
async def assign_tenant(apartment_id: str, tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    # Verify apartment exists
    apt = await db.apartments.find_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # Verify tenant exists
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Update apartment
    await db.apartments.update_one(
        {"id": apartment_id},
        {"$set": {"tenant_id": tenant_id, "status": "occupied"}}
    )
    
    return {"message": "Huurder toegewezen aan appartement"}

@api_router.post("/apartments/{apartment_id}/remove-tenant")
async def remove_tenant(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.apartments.update_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"$set": {"tenant_id": None, "status": "available"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    return {"message": "Huurder verwijderd van appartement"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify tenant and apartment
    tenant = await db.tenants.find_one({"id": payment_data.tenant_id, "user_id": current_user["id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    apt = await db.apartments.find_one({"id": payment_data.apartment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # If loan payment, verify loan exists
    if payment_data.payment_type == "loan" and payment_data.loan_id:
        loan = await db.loans.find_one({"id": payment_data.loan_id, "user_id": current_user["id"]}, {"_id": 0})
        if not loan:
            raise HTTPException(status_code=404, detail="Lening niet gevonden")
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "tenant_id": payment_data.tenant_id,
        "apartment_id": payment_data.apartment_id,
        "amount": payment_data.amount,
        "payment_date": payment_data.payment_date,
        "payment_type": payment_data.payment_type,
        "description": payment_data.description,
        "period_month": payment_data.period_month,
        "period_year": payment_data.period_year,
        "loan_id": payment_data.loan_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.payments.insert_one(payment_doc)
    
    return PaymentResponse(
        **payment_doc,
        tenant_name=tenant["name"],
        apartment_name=apt["name"]
    )

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(current_user: dict = Depends(get_current_active_user)):
    payments = await db.payments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    
    # Batch fetch tenant and apartment names to avoid N+1 queries
    tenant_ids = list(set(p["tenant_id"] for p in payments))
    apt_ids = list(set(p["apartment_id"] for p in payments))
    
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apt_map = {a["id"]: a["name"] for a in apts}
    
    for payment in payments:
        payment["tenant_name"] = tenant_map.get(payment["tenant_id"])
        payment["apartment_name"] = apt_map.get(payment["apartment_id"])
    
    return [PaymentResponse(**p) for p in payments]

@api_router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, current_user: dict = Depends(get_current_active_user)):
    payment = await db.payments.find_one(
        {"id": payment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    tenant = await db.tenants.find_one({"id": payment["tenant_id"]}, {"_id": 0, "name": 1})
    apt = await db.apartments.find_one({"id": payment["apartment_id"]}, {"_id": 0, "name": 1})
    payment["tenant_name"] = tenant["name"] if tenant else None
    payment["apartment_name"] = apt["name"] if apt else None
    
    return PaymentResponse(**payment)

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.payments.delete_one({"id": payment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return {"message": "Betaling verwijderd"}

# ==================== DEPOSIT ROUTES ====================

@api_router.post("/deposits", response_model=DepositResponse)
async def create_deposit(deposit_data: DepositCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify tenant and apartment
    tenant = await db.tenants.find_one({"id": deposit_data.tenant_id, "user_id": current_user["id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    apt = await db.apartments.find_one({"id": deposit_data.apartment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    deposit_id = str(uuid.uuid4())
    deposit_doc = {
        "id": deposit_id,
        "tenant_id": deposit_data.tenant_id,
        "apartment_id": deposit_data.apartment_id,
        "amount": deposit_data.amount,
        "deposit_date": deposit_data.deposit_date,
        "status": deposit_data.status,
        "return_date": None,
        "return_amount": None,
        "notes": deposit_data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.deposits.insert_one(deposit_doc)
    
    return DepositResponse(
        **deposit_doc,
        tenant_name=tenant["name"],
        apartment_name=apt["name"]
    )

@api_router.get("/deposits", response_model=List[DepositResponse])
async def get_deposits(current_user: dict = Depends(get_current_active_user)):
    deposits = await db.deposits.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Batch fetch tenant and apartment names to avoid N+1 queries
    tenant_ids = list(set(d["tenant_id"] for d in deposits))
    apt_ids = list(set(d["apartment_id"] for d in deposits))
    
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apt_map = {a["id"]: a["name"] for a in apts}
    
    for deposit in deposits:
        deposit["tenant_name"] = tenant_map.get(deposit["tenant_id"])
        deposit["apartment_name"] = apt_map.get(deposit["apartment_id"])
    
    return [DepositResponse(**d) for d in deposits]

@api_router.put("/deposits/{deposit_id}", response_model=DepositResponse)
async def update_deposit(deposit_id: str, deposit_data: DepositUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in deposit_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.deposits.update_one(
        {"id": deposit_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    
    deposit = await db.deposits.find_one({"id": deposit_id}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": deposit["tenant_id"]}, {"_id": 0, "name": 1})
    apt = await db.apartments.find_one({"id": deposit["apartment_id"]}, {"_id": 0, "name": 1})
    deposit["tenant_name"] = tenant["name"] if tenant else None
    deposit["apartment_name"] = apt["name"] if apt else None
    
    return DepositResponse(**deposit)

@api_router.delete("/deposits/{deposit_id}")
async def delete_deposit(deposit_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.deposits.delete_one({"id": deposit_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    return {"message": "Borg verwijderd"}

# ==================== DEPOSIT REFUND PDF ====================

def create_deposit_refund_pdf(deposit, tenant, apt, user):
    """Create a modern styled deposit refund PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'RefundTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Company name from user
    company_name = user.get("company_name") if user and user.get("company_name") else "Facturatie N.V."
    
    # === HEADER SECTION ===
    header_data = []
    
    # Left side: Logo or Company name
    left_content = []
    if user and user.get("logo"):
        try:
            logo_data = user["logo"]
            if "," in logo_data:
                logo_data = logo_data.split(",")[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=4*cm, height=2*cm)
            left_content.append(logo_img)
        except Exception as e:
            logger.error(f"Error adding logo: {e}")
            left_content.append(Paragraph(company_name, company_style))
    else:
        left_content.append(Paragraph(company_name, company_style))
    
    left_content.append(Paragraph("Verhuurbeheersysteem", small_text))
    
    # Right side: Title
    right_content = [Paragraph("BORG TERUGBETALING", title_style)]
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[10*cm, 7*cm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Green line separator
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === DOCUMENT DETAILS ROW ===
    doc_num = deposit["id"][:8].upper()
    return_date = deposit.get("return_date", "-")
    
    details_data = [
        [
            Paragraph("<b>Document Nr:</b>", normal_text),
            Paragraph(doc_num, bold_text),
            Paragraph("<b>Terugbetaaldatum:</b>", normal_text),
            Paragraph(return_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 4*cm, 5*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === CLIENT AND PROPERTY INFO ===
    tenant_name = tenant["name"] if tenant else "Onbekend"
    tenant_phone = tenant.get("phone", "-") if tenant else "-"
    tenant_email = tenant.get("email", "-") if tenant else "-"
    tenant_address = tenant.get("address", "-") if tenant else "-"
    
    apt_name = apt["name"] if apt else "Onbekend"
    apt_address = apt.get("address", "-") if apt else "-"
    
    info_left = [
        [Paragraph("TERUGBETAALD AAN", section_header)],
        [Paragraph(f"<b>{tenant_name}</b>", normal_text)],
        [Paragraph(f"Tel: {tenant_phone}", small_text)],
        [Paragraph(f"Email: {tenant_email}", small_text)],
        [Paragraph(f"Adres: {tenant_address}", small_text)],
    ]
    
    info_right = [
        [Paragraph("APPARTEMENT", section_header)],
        [Paragraph(f"<b>{apt_name}</b>", normal_text)],
        [Paragraph(f"Adres: {apt_address}", small_text)],
        [Paragraph("", small_text)],
        [Paragraph("", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === DETAILS TABLE ===
    original_amount = deposit.get("amount", 0)
    return_amount = deposit.get("return_amount", original_amount)
    deposit_date = deposit.get("deposit_date", "-")
    status_labels = {
        'returned': 'Volledig terugbetaald',
        'partial_returned': 'Deels terugbetaald',
        'held': 'In beheer'
    }
    status = status_labels.get(deposit.get("status", "returned"), "Terugbetaald")
    
    table_header = ['OMSCHRIJVING', 'DATUM', 'BEDRAG']
    table_data = [
        table_header,
        [f'Oorspronkelijke borg gestort', deposit_date, format_currency(original_amount)],
        [f'Terugbetaald bedrag', return_date, format_currency(return_amount)],
    ]
    
    items_table = Table(table_data, colWidths=[9*cm, 4*cm, 4*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#e8f5e9')),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === STATUS SECTION ===
    totals_data = [
        ['Status:', status],
        ['', ''],
        ['TERUGBETAALD BEDRAG:', format_currency(return_amount)],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 1), 10),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 2), (-1, 2), 14),
        ('TEXTCOLOR', (0, 2), (-1, 2), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 2), (-1, 2), 10),
        ('LINEABOVE', (0, 2), (-1, 2), 2, PRIMARY_GREEN),
    ]))
    
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 20))
    
    # === NOTES ===
    if deposit.get("notes"):
        elements.append(Paragraph("OPMERKINGEN", section_header))
        elements.append(Paragraph(deposit["notes"], normal_text))
        elements.append(Spacer(1, 20))
    
    # === FOOTER ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=15))
    
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph("Borg succesvol terugbetaald!", thank_you_style))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Dit document is gegenereerd door {company_name}", footer_style))
    elements.append(Paragraph("Bewaar dit document als bewijs van terugbetaling.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/deposits/{deposit_id}/refund-pdf")
async def generate_deposit_refund_pdf(deposit_id: str, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF for deposit refund"""
    # Get deposit data
    deposit = await db.deposits.find_one(
        {"id": deposit_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not deposit:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    
    # Check if deposit is returned
    if deposit.get("status") not in ["returned", "partial_returned"]:
        raise HTTPException(status_code=400, detail="Borg is nog niet terugbetaald")
    
    tenant = await db.tenants.find_one({"id": deposit["tenant_id"]}, {"_id": 0})
    apt = await db.apartments.find_one({"id": deposit["apartment_id"]}, {"_id": 0})
    
    # Get user logo and company name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "logo": 1, "company_name": 1})
    
    # Create PDF
    buffer = create_deposit_refund_pdf(deposit, tenant, apt, user)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=borg_terugbetaling_{deposit_id[:8]}.pdf"
        }
    )

# ==================== RECEIPT/PDF ROUTES ====================

def create_modern_receipt_pdf(payment, tenant, apt, user, payment_id):
    """Create a modern styled receipt PDF"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.units import cm, mm
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
    from reportlab.platypus import HRFlowable
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    total_style = ParagraphStyle(
        'TotalStyle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    )
    
    elements = []
    
    # Company name from user
    company_name = user.get("company_name") if user and user.get("company_name") else "Facturatie N.V."
    
    # === HEADER SECTION ===
    # Create header table with logo/company on left and KWITANTIE on right
    header_data = []
    
    # Left side: Logo or Company name
    left_content = []
    if user and user.get("logo"):
        try:
            logo_data = user["logo"]
            if "," in logo_data:
                logo_data = logo_data.split(",")[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=4*cm, height=2*cm)
            left_content.append(logo_img)
        except Exception as e:
            logger.error(f"Error adding logo: {e}")
            left_content.append(Paragraph(company_name, company_style))
    else:
        left_content.append(Paragraph(company_name, company_style))
    
    left_content.append(Paragraph("Verhuurbeheersysteem", small_text))
    
    # Right side: KWITANTIE title
    right_content = [Paragraph("KWITANTIE", title_style)]
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[10*cm, 7*cm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Green line separator
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === INVOICE DETAILS ROW ===
    receipt_num = payment_id[:8].upper()
    issue_date = payment.get("payment_date", "-")
    
    details_data = [
        [
            Paragraph("<b>Kwitantie Nr:</b>", normal_text),
            Paragraph(receipt_num, bold_text),
            Paragraph("<b>Datum:</b>", normal_text),
            Paragraph(issue_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 3*cm, 6*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === CLIENT AND PROPERTY INFO ===
    tenant_name = tenant["name"] if tenant else "Onbekend"
    tenant_phone = tenant.get("phone", "-") if tenant else "-"
    tenant_email = tenant.get("email", "-") if tenant else "-"
    tenant_address = tenant.get("address", "-") if tenant else "-"
    
    apt_name = apt["name"] if apt else "Onbekend"
    apt_address = apt.get("address", "-") if apt else "-"
    
    info_left = [
        [Paragraph("GEFACTUREERD AAN", section_header)],
        [Paragraph(f"<b>{tenant_name}</b>", normal_text)],
        [Paragraph(f"Tel: {tenant_phone}", small_text)],
        [Paragraph(f"Email: {tenant_email}", small_text)],
        [Paragraph(f"Adres: {tenant_address}", small_text)],
    ]
    
    info_right = [
        [Paragraph("APPARTEMENT", section_header)],
        [Paragraph(f"<b>{apt_name}</b>", normal_text)],
        [Paragraph(f"Adres: {apt_address}", small_text)],
        [Paragraph("", small_text)],
        [Paragraph("", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === ITEMS TABLE ===
    payment_type_labels = {
        "rent": "Huur",
        "deposit": "Borg",
        "other": "Overig"
    }
    payment_type = payment_type_labels.get(payment.get("payment_type", ""), payment.get("payment_type", "Betaling"))
    period_text = f"{payment.get('period_month', '-')}/{payment.get('period_year', '-')}" if payment.get('period_month') else "-"
    description = payment.get("description") or f"{payment_type} betaling"
    amount = payment.get("amount", 0)
    
    # Table header
    table_header = ['NR', 'OMSCHRIJVING', 'TYPE', 'PERIODE', 'BEDRAG']
    
    # Table data
    table_data = [
        table_header,
        ['1', description, payment_type, period_text, format_currency(amount)]
    ]
    
    items_table = Table(table_data, colWidths=[1.5*cm, 7*cm, 3*cm, 2.5*cm, 3*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === TOTALS SECTION ===
    totals_data = [
        ['Subtotaal:', format_currency(amount)],
        ['BTW (0%):', format_currency(0)],
        ['', ''],
        ['TOTAAL:', format_currency(amount)],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 2), 10),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 14),
        ('TEXTCOLOR', (0, 3), (-1, 3), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 2, PRIMARY_GREEN),
    ]))
    
    # Wrap totals in a table to align right
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 30))
    
    # === PAYMENT INFO ===
    elements.append(Paragraph("Betaalmethode", section_header))
    elements.append(Paragraph("Contant / Bankoverschrijving", normal_text))
    elements.append(Spacer(1, 20))
    
    # === THANK YOU ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=15))
    
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph("Bedankt voor uw betaling!", thank_you_style))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Dit document is gegenereerd door {company_name}", footer_style))
    elements.append(Paragraph("Bewaar deze kwitantie als bewijs van betaling.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/receipts/{payment_id}/pdf")
async def generate_receipt_pdf(payment_id: str, current_user: dict = Depends(get_current_active_user)):
    # Get payment data
    payment = await db.payments.find_one(
        {"id": payment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    tenant = await db.tenants.find_one({"id": payment["tenant_id"]}, {"_id": 0})
    apt = await db.apartments.find_one({"id": payment["apartment_id"]}, {"_id": 0})
    
    # Get user logo and company name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "logo": 1, "company_name": 1})
    
    # Create modern PDF
    buffer = create_modern_receipt_pdf(payment, tenant, apt, user, payment_id)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=kwitantie_{payment_id[:8]}.pdf"
        }
    )

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Get apartment stats
    total_apartments = await db.apartments.count_documents({"user_id": user_id})
    occupied_apartments = await db.apartments.count_documents({"user_id": user_id, "status": "occupied"})
    available_apartments = total_apartments - occupied_apartments
    
    # Get tenant count
    total_tenants = await db.tenants.count_documents({"user_id": user_id})
    
    # Get this month's income - based on payment_date in current month
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
    
    # Get all payments and filter by payment_date in current month
    all_payments_cursor = await db.payments.find({
        "user_id": user_id
    }, {"_id": 0}).to_list(1000)
    
    # Calculate income this month based on payment_date
    current_month_str = now.strftime("%Y-%m")
    total_income = sum(
        p["amount"] for p in all_payments_cursor 
        if p.get("payment_date", "").startswith(current_month_str)
    )
    
    # Get rent payments only for calculating outstanding
    rent_payments = [p for p in all_payments_cursor if p.get("payment_type") == "rent"]
    
    # Calculate outstanding (rent due - payments made this month for occupied apartments)
    occupied_apts = await db.apartments.find(
        {"user_id": user_id, "status": "occupied"},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate total rent due for current month
    total_rent_due = sum(apt["rent_amount"] for apt in occupied_apts)
    
    # Calculate paid rent for this month's period
    rent_paid_this_month = sum(
        p["amount"] for p in rent_payments 
        if p.get("period_month") == now.month and p.get("period_year") == now.year
    )
    total_outstanding = max(0, total_rent_due - rent_paid_this_month)
    
    # Calculate outstanding loans
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    loan_ids = [l.get("id") for l in loans if l.get("id")]
    
    # Get loan payments
    loan_payments = await db.payments.find(
        {"user_id": user_id, "payment_type": "loan"},
        {"_id": 0, "loan_id": 1, "amount": 1}
    ).to_list(1000)
    
    loan_payments_by_id = {}
    for lp in loan_payments:
        lid = lp.get("loan_id")
        if lid:
            loan_payments_by_id[lid] = loan_payments_by_id.get(lid, 0) + (lp.get("amount") or 0)
    
    total_outstanding_loans = 0
    for l in loans:
        try:
            loan_id = l.get("id")
            loan_amount = l.get("amount") or 0
            if loan_id:
                paid = loan_payments_by_id.get(loan_id, 0)
                total_outstanding_loans += max(0, loan_amount - paid)
        except Exception as e:
            logger.error(f"Error calculating loan outstanding: {e}")
            continue
    
    # Batch fetch tenant names for occupied apartments (used in reminders)
    occupied_tenant_ids = [apt["tenant_id"] for apt in occupied_apts if apt.get("tenant_id")]
    occupied_tenants = await db.tenants.find({"id": {"$in": occupied_tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    occupied_tenant_map = {t["id"]: t["name"] for t in occupied_tenants}
    
    # Get total deposits held
    deposits = await db.deposits.find(
        {"user_id": user_id, "status": "held"},
        {"_id": 0}
    ).to_list(1000)
    total_deposits = sum(d["amount"] for d in deposits)
    
    # Get recent payments
    recent_payments_cursor = await db.payments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    
    # Batch fetch tenant and apartment names for recent payments
    recent_tenant_ids = list(set(p["tenant_id"] for p in recent_payments_cursor))
    recent_apt_ids = list(set(p["apartment_id"] for p in recent_payments_cursor))
    
    recent_tenants = await db.tenants.find({"id": {"$in": recent_tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    recent_apts = await db.apartments.find({"id": {"$in": recent_apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    
    recent_tenant_map = {t["id"]: t["name"] for t in recent_tenants}
    recent_apt_map = {a["id"]: a["name"] for a in recent_apts}
    
    recent_payments = []
    for payment in recent_payments_cursor:
        try:
            # Safely build payment response with defaults
            recent_payments.append(PaymentResponse(
                id=payment.get("id", ""),
                tenant_id=payment.get("tenant_id", ""),
                tenant_name=recent_tenant_map.get(payment.get("tenant_id")),
                apartment_id=payment.get("apartment_id", ""),
                apartment_name=recent_apt_map.get(payment.get("apartment_id")),
                amount=payment.get("amount", 0) or 0,
                payment_date=payment.get("payment_date", ""),
                payment_type=payment.get("payment_type", "rent"),
                description=payment.get("description"),
                period_month=payment.get("period_month"),
                period_year=payment.get("period_year"),
                loan_id=payment.get("loan_id"),
                created_at=payment.get("created_at", ""),
                user_id=payment.get("user_id", "")
            ))
        except Exception as e:
            logger.error(f"Error processing payment for dashboard: {e}")
            continue
    
    # Get user's rent settings
    user_settings = await db.users.find_one({"id": user_id}, {"_id": 0, "rent_due_day": 1, "grace_period_days": 1})
    rent_due_day = user_settings.get("rent_due_day", 1) if user_settings else 1
    grace_period_days = user_settings.get("grace_period_days", 5) if user_settings else 5
    
    # Generate reminders for unpaid rent
    reminders = []
    for apt in occupied_apts:
        if not apt.get("tenant_id"):
            continue
        
        # Check if rent was paid this month
        paid_this_month = any(
            p["apartment_id"] == apt["id"] and 
            p.get("period_month") == now.month and 
            p.get("period_year") == now.year
            for p in rent_payments
        )
        
        if not paid_this_month:
            # Use user's rent due day setting
            try:
                due_date = now.replace(day=rent_due_day)
            except ValueError:
                # If day doesn't exist in current month, use last day
                due_date = now.replace(day=28)
            
            # Calculate days overdue considering grace period
            days_since_due = (now - due_date).days
            days_overdue = max(0, days_since_due - grace_period_days)
            
            # Only show as overdue if past grace period
            is_overdue = days_since_due > grace_period_days
            
            reminders.append(ReminderResponse(
                id=str(uuid.uuid4()),
                tenant_id=apt["tenant_id"],
                tenant_name=occupied_tenant_map.get(apt["tenant_id"], "Onbekend"),
                apartment_id=apt["id"],
                apartment_name=apt["name"],
                amount_due=apt["rent_amount"],
                due_date=due_date.strftime("%Y-%m-%d"),
                days_overdue=days_overdue,
                reminder_type="overdue" if is_overdue else "upcoming"
            ))
    
    # Calculate kasgeld balance
    kasgeld_transactions = await db.kasgeld.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    kasgeld_deposits = sum(t["amount"] for t in kasgeld_transactions if t["transaction_type"] == "deposit")
    kasgeld_withdrawals = sum(t["amount"] for t in kasgeld_transactions if t["transaction_type"] == "withdrawal")
    maintenance_costs = await db.maintenance.find({"user_id": user_id}, {"_id": 0, "cost": 1, "cost_type": 1}).to_list(1000)
    # Only count maintenance where cost_type is 'kasgeld' (or not set for legacy data)
    total_maintenance = sum(m["cost"] for m in maintenance_costs if m.get("cost_type", "kasgeld") == "kasgeld")
    
    # Get all payments (huurbetalingen) for kasgeld calculation
    all_payments = await db.payments.find({"user_id": user_id}, {"_id": 0, "amount": 1}).to_list(1000)
    total_all_payments = sum(p["amount"] for p in all_payments)
    
    # Get salary payments for kasgeld calculation
    all_salaries = await db.salaries.find({"user_id": user_id}, {"_id": 0, "amount": 1, "period_month": 1, "period_year": 1}).to_list(1000)
    total_all_salaries = sum(s["amount"] for s in all_salaries)
    
    # Total kasgeld = deposits + all payments - withdrawals - maintenance (kasgeld only) - salaries
    total_kasgeld = kasgeld_deposits + total_all_payments - kasgeld_withdrawals - total_maintenance - total_all_salaries
    
    # Get employee stats
    total_employees = await db.employees.count_documents({"user_id": user_id, "status": "active"})
    
    # Salary this month
    total_salary_this_month = sum(
        s["amount"] for s in all_salaries 
        if s.get("period_month") == now.month and s.get("period_year") == now.year
    )
    
    return DashboardStats(
        total_apartments=total_apartments,
        occupied_apartments=occupied_apartments,
        available_apartments=available_apartments,
        total_tenants=total_tenants,
        total_income_this_month=total_income,
        total_outstanding=total_outstanding,
        total_outstanding_loans=total_outstanding_loans,
        total_deposits_held=total_deposits,
        total_kasgeld=total_kasgeld,
        total_employees=total_employees,
        total_salary_this_month=total_salary_this_month,
        recent_payments=recent_payments,
        reminders=reminders
    )

# ==================== NOTIFICATIONS ROUTES ====================

class NotificationItem(BaseModel):
    id: str
    type: str  # 'rent_due', 'outstanding_balance', 'contract_expiring', 'loan_outstanding', 'salary_due'
    title: str
    message: str
    priority: str  # 'high', 'medium', 'low'
    related_id: Optional[str] = None
    related_name: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None

class NotificationsResponse(BaseModel):
    total: int
    high_priority: int
    notifications: List[NotificationItem]

@api_router.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(current_user: dict = Depends(get_current_active_user)):
    """Get all notifications and reminders for the current user"""
    user_id = current_user["id"]
    notifications = []
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Get user settings for due dates
    user_settings = await db.users.find_one({"id": user_id}, {"_id": 0, "rent_due_day": 1, "grace_period_days": 1})
    rent_due_day = user_settings.get("rent_due_day", 1) if user_settings else 1
    grace_period_days = user_settings.get("grace_period_days", 5) if user_settings else 5
    
    # === 1. RENT PAYMENT REMINDERS ===
    # Get occupied apartments
    occupied_apts = await db.apartments.find(
        {"user_id": user_id, "status": "occupied"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get rent payments for current month
    rent_payments = await db.payments.find(
        {"user_id": user_id, "payment_type": "rent"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get tenant info
    tenant_ids = list(set(apt.get("tenant_id") for apt in occupied_apts if apt.get("tenant_id")))
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    tenant_map = {t["id"]: t["name"] for t in tenants}
    
    for apt in occupied_apts:
        if not apt.get("tenant_id"):
            continue
        
        # Check if rent paid this month
        paid_this_month = any(
            p["apartment_id"] == apt["id"] and 
            p.get("period_month") == current_month and 
            p.get("period_year") == current_year
            for p in rent_payments
        )
        
        if not paid_this_month:
            try:
                due_date = now.replace(day=rent_due_day)
            except ValueError:
                due_date = now.replace(day=28)
            
            days_since_due = (now - due_date).days
            is_overdue = days_since_due > grace_period_days
            
            tenant_name = tenant_map.get(apt["tenant_id"], "Onbekend")
            
            notifications.append(NotificationItem(
                id=str(uuid.uuid4()),
                type="rent_due",
                title="Huur niet betaald" if is_overdue else "Huur herinnering",
                message=f"{tenant_name} - {apt['name']}: Huur van {now.strftime('%B %Y')} nog niet ontvangen",
                priority="high" if is_overdue else "medium",
                related_id=apt["tenant_id"],
                related_name=tenant_name,
                amount=apt["rent_amount"],
                due_date=due_date.strftime("%Y-%m-%d")
            ))
    
    # === 2. OUTSTANDING BALANCE REMINDERS ===
    for apt in occupied_apts:
        if not apt.get("tenant_id"):
            continue
        
        tenant_id = apt["tenant_id"]
        tenant_name = tenant_map.get(tenant_id, "Onbekend")
        
        # Calculate outstanding for this tenant
        tenant_payments = [p for p in rent_payments if p["tenant_id"] == tenant_id and p["payment_type"] == "rent"]
        total_paid = sum(p["amount"] for p in tenant_payments)
        
        # Get tenant start (from first payment or apartment assignment)
        if tenant_payments:
            first_payment = min(tenant_payments, key=lambda x: x["payment_date"])
            try:
                first_date = datetime.fromisoformat(first_payment["payment_date"].replace("Z", "+00:00"))
            except:
                first_date = now
        else:
            first_date = now
        
        months_rented = max(1, (now.year - first_date.year) * 12 + (now.month - first_date.month) + 1)
        total_due = months_rented * apt["rent_amount"]
        balance = total_due - total_paid
        
        if balance > apt["rent_amount"]:  # More than 1 month outstanding
            notifications.append(NotificationItem(
                id=str(uuid.uuid4()),
                type="outstanding_balance",
                title="Openstaand saldo",
                message=f"{tenant_name} heeft een openstaand saldo van meer dan 1 maand huur",
                priority="high",
                related_id=tenant_id,
                related_name=tenant_name,
                amount=balance,
                due_date=None
            ))
    
    # === 3. CONTRACT EXPIRING REMINDERS ===
    contracts = await db.contracts.find(
        {"user_id": user_id, "status": "signed"},
        {"_id": 0}
    ).to_list(1000)
    
    for contract in contracts:
        if contract.get("end_date"):
            try:
                end_date = datetime.fromisoformat(contract["end_date"])
                days_until_expiry = (end_date - now).days
                
                if 0 <= days_until_expiry <= 30:  # Expiring within 30 days
                    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0, "name": 1})
                    tenant_name = tenant["name"] if tenant else "Onbekend"
                    
                    notifications.append(NotificationItem(
                        id=str(uuid.uuid4()),
                        type="contract_expiring",
                        title="Contract verloopt binnenkort",
                        message=f"Contract van {tenant_name} verloopt over {days_until_expiry} dagen",
                        priority="high" if days_until_expiry <= 7 else "medium",
                        related_id=contract["id"],
                        related_name=tenant_name,
                        amount=None,
                        due_date=contract["end_date"]
                    ))
                elif days_until_expiry < 0:  # Already expired
                    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0, "name": 1})
                    tenant_name = tenant["name"] if tenant else "Onbekend"
                    
                    notifications.append(NotificationItem(
                        id=str(uuid.uuid4()),
                        type="contract_expiring",
                        title="Contract verlopen",
                        message=f"Contract van {tenant_name} is {abs(days_until_expiry)} dagen geleden verlopen",
                        priority="high",
                        related_id=contract["id"],
                        related_name=tenant_name,
                        amount=None,
                        due_date=contract["end_date"]
                    ))
            except:
                pass
    
    # === 4. OUTSTANDING LOAN REMINDERS ===
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    loan_ids = [l.get("id") for l in loans if l.get("id")]
    
    if loan_ids:
        loan_payments = await db.payments.find(
            {"loan_id": {"$in": loan_ids}, "payment_type": "loan"},
            {"_id": 0, "loan_id": 1, "amount": 1}
        ).to_list(1000)
        
        loan_payments_map = {}
        for lp in loan_payments:
            lid = lp.get("loan_id")
            if lid:
                loan_payments_map[lid] = loan_payments_map.get(lid, 0) + (lp.get("amount") or 0)
        
        for loan in loans:
            try:
                loan_id = loan.get("id")
                if not loan_id:
                    continue
                    
                paid = loan_payments_map.get(loan_id, 0)
                loan_amount = loan.get("amount") or 0
                remaining = loan_amount - paid
                
                if remaining > 0:
                    tenant_id = loan.get("tenant_id")
                    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "name": 1}) if tenant_id else None
                    tenant_name = tenant.get("name", "Onbekend") if tenant else "Onbekend"
                    
                    # Calculate days since loan
                    loan_date_str = loan.get("loan_date") or loan.get("created_at") or ""
                    try:
                        if loan_date_str:
                            clean_date = loan_date_str.replace('Z', '+00:00')
                            if '+' not in clean_date and 'T' in clean_date:
                                clean_date = clean_date + '+00:00'
                            loan_date = datetime.fromisoformat(clean_date)
                            days_since_loan = (now - loan_date).days
                        else:
                            days_since_loan = 0
                    except:
                        days_since_loan = 0
                    
                    priority = "high" if days_since_loan > 60 else ("medium" if days_since_loan > 30 else "low")
                    
                    notifications.append(NotificationItem(
                        id=str(uuid.uuid4()),
                        type="loan_outstanding",
                        title="Openstaande lening",
                        message=f"{tenant_name} heeft nog SRD {remaining:,.2f} openstaande lening",
                        priority=priority,
                        related_id=loan_id,
                        related_name=tenant_name,
                        amount=remaining,
                        due_date=loan_date_str[:10] if loan_date_str else ""
                    ))
            except Exception as e:
                logger.error(f"Error processing loan notification: {e}")
                continue
    
    # === 5. SALARY PAYMENT REMINDERS ===
    employees = await db.employees.find(
        {"user_id": user_id, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    if employees:
        salaries = await db.salaries.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        for emp in employees:
            # Check if salary paid this month
            paid_this_month = any(
                s["employee_id"] == emp["id"] and
                s.get("period_month") == current_month and
                s.get("period_year") == current_year
                for s in salaries
            )
            
            if not paid_this_month and now.day >= 25:  # Reminder after 25th of month
                notifications.append(NotificationItem(
                    id=str(uuid.uuid4()),
                    type="salary_due",
                    title="Loon uitbetalen",
                    message=f"Loon van {emp['name']} voor {now.strftime('%B %Y')} nog niet uitbetaald",
                    priority="medium" if now.day < 28 else "high",
                    related_id=emp["id"],
                    related_name=emp["name"],
                    amount=emp.get("salary"),
                    due_date=None
                ))
    
    # Sort notifications by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    notifications.sort(key=lambda x: priority_order.get(x.priority, 3))
    
    high_priority = len([n for n in notifications if n.priority == "high"])
    
    return NotificationsResponse(
        total=len(notifications),
        high_priority=high_priority,
        notifications=notifications
    )

# ==================== TENANT BALANCE ROUTES ====================

@api_router.get("/tenants/{tenant_id}/balance")
async def get_tenant_balance(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment assigned to tenant
    apt = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    # Get deposit info for this tenant
    deposit_info = await db.deposits.find_one(
        {"tenant_id": tenant_id, "user_id": current_user["id"], "status": "held"},
        {"_id": 0, "amount": 1, "deposit_date": 1, "status": 1}
    )
    
    if not apt:
        return {
            "tenant_id": tenant_id,
            "tenant_name": tenant["name"],
            "apartment": None,
            "total_due": 0,
            "total_paid": 0,
            "balance": 0,
            "payments": [],
            "deposit": deposit_info
        }
    
    # Get all payments for this tenant-apartment combination
    payments = await db.payments.find(
        {"tenant_id": tenant_id, "apartment_id": apt["id"], "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    total_paid = sum(p["amount"] for p in payments if p["payment_type"] == "rent")
    
    # Calculate months rented (simplified - from first payment or created_at)
    if payments:
        first_payment_date = min(p["payment_date"] for p in payments)
        first_date = datetime.fromisoformat(first_payment_date.replace("Z", "+00:00") if "Z" in first_payment_date else first_payment_date)
    else:
        first_date = datetime.fromisoformat(apt["created_at"].replace("Z", "+00:00") if "Z" in apt["created_at"] else apt["created_at"])
    
    now = datetime.now(timezone.utc)
    months_diff = (now.year - first_date.year) * 12 + (now.month - first_date.month) + 1
    total_due = apt["rent_amount"] * months_diff
    
    balance = total_due - total_paid
    
    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant["name"],
        "apartment": {
            "id": apt["id"],
            "name": apt["name"],
            "rent_amount": apt["rent_amount"]
        },
        "total_due": total_due,
        "total_paid": total_paid,
        "balance": balance,
        "payments": payments,
        "deposit": deposit_info
    }

@api_router.get("/tenants/{tenant_id}/outstanding")
async def get_tenant_outstanding(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get outstanding (unpaid/partially paid) months for a tenant - used when registering new payment"""
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment assigned to tenant
    apt = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not apt:
        return {
            "tenant_id": tenant_id,
            "tenant_name": tenant["name"],
            "has_outstanding": False,
            "outstanding_amount": 0,
            "outstanding_months": [],
            "partial_payments": [],
            "maintenance_costs": [],
            "total_maintenance": 0,
            "suggestion": None
        }
    
    # Get all rent payments for this tenant-apartment
    payments = await db.payments.find(
        {"tenant_id": tenant_id, "apartment_id": apt["id"], "user_id": current_user["id"], "payment_type": "rent"},
        {"_id": 0, "period_month": 1, "period_year": 1, "amount": 1, "payment_date": 1}
    ).to_list(1000)
    
    # Get maintenance costs for this apartment that tenant must pay
    maintenance_records = await db.maintenance.find(
        {"apartment_id": apt["id"], "user_id": current_user["id"], "cost_type": "tenant"},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate total maintenance costs
    category_labels = {
        'wc': 'WC/Toilet', 'kraan': 'Kraan', 'douche': 'Douche',
        'keuken': 'Keuken', 'kasten': 'Kasten', 'verven': 'Verven', 'overig': 'Overig'
    }
    maintenance_costs = []
    total_maintenance = 0
    for m in maintenance_records:
        total_maintenance += m["cost"]
        maintenance_costs.append({
            "id": m["id"],
            "date": m["maintenance_date"],
            "category": category_labels.get(m.get("category", "overig"), "Onderhoud"),
            "description": m.get("description", ""),
            "cost": m["cost"]
        })
    
    # Create payment lookup: (year, month) -> total paid for that period
    payment_totals = {}
    for p in payments:
        if p.get("period_month") and p.get("period_year"):
            key = (p["period_year"], p["period_month"])
            if key not in payment_totals:
                payment_totals[key] = 0
            payment_totals[key] += p["amount"]
    
    # Calculate which months should be paid (from apartment creation or first payment)
    if payments:
        first_payment_date = min(p.get("period_year", 9999) * 100 + p.get("period_month", 1) for p in payments if p.get("period_year"))
        start_year = first_payment_date // 100
        start_month = first_payment_date % 100
    else:
        created = apt.get("created_at", "")
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                start_year = created_dt.year
                start_month = created_dt.month
            except:
                now = datetime.now(timezone.utc)
                start_year = now.year
                start_month = now.month
        else:
            now = datetime.now(timezone.utc)
            start_year = now.year
            start_month = now.month
    
    # Generate list of all months with their payment status
    now = datetime.now(timezone.utc)
    outstanding_months = []
    partial_payments = []
    total_outstanding = 0.0
    
    year = start_year
    month = start_month
    months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    
    while (year < now.year) or (year == now.year and month <= now.month):
        key = (year, month)
        amount_due = apt["rent_amount"]
        amount_paid = payment_totals.get(key, 0)
        remaining = amount_due - amount_paid
        
        if remaining > 0:
            month_info = {
                "year": year,
                "month": month,
                "month_name": months_nl[month],
                "label": f"{months_nl[month]} {year}",
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "remaining": remaining,
                "status": "partial" if amount_paid > 0 else "unpaid"
            }
            
            if amount_paid > 0:
                partial_payments.append(month_info)
            
            outstanding_months.append(month_info)
            total_outstanding += remaining
        
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    # Sort by date (oldest first)
    outstanding_months.sort(key=lambda x: (x["year"], x["month"]))
    partial_payments.sort(key=lambda x: (x["year"], x["month"]))
    
    # Create detailed suggestion message
    suggestion = None
    if outstanding_months:
        oldest = outstanding_months[0]
        
        # Count unpaid vs partial
        unpaid_count = len([m for m in outstanding_months if m["status"] == "unpaid"])
        partial_count = len([m for m in outstanding_months if m["status"] == "partial"])
        
        suggestion_parts = [f"Let op: Deze huurder heeft een openstaand saldo van {format_currency(total_outstanding)}."]
        
        if unpaid_count > 0:
            suggestion_parts.append(f"{unpaid_count} maand(en) volledig onbetaald.")
        
        if partial_count > 0:
            partial_details = []
            for pm in partial_payments:
                partial_details.append(f"{pm['label']}: {format_currency(pm['amount_paid'])} betaald, {format_currency(pm['remaining'])} nog open")
            suggestion_parts.append(f"{partial_count} maand(en) gedeeltelijk betaald:")
            suggestion_parts.extend(partial_details)
        
        suggestion_parts.append(f"Oudste openstaande maand: {oldest['label']}")
        suggestion = " ".join(suggestion_parts[:2]) + (" " + " | ".join(partial_details) if partial_count > 0 else "")
    
    # Add maintenance costs to total outstanding
    total_outstanding_with_maintenance = total_outstanding + total_maintenance
    has_outstanding = len(outstanding_months) > 0 or total_maintenance > 0
    
    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant["name"],
        "apartment_name": apt["name"],
        "rent_amount": apt["rent_amount"],
        "has_outstanding": has_outstanding,
        "outstanding_amount": total_outstanding_with_maintenance,
        "outstanding_rent": total_outstanding,
        "outstanding_months": outstanding_months,
        "partial_payments": partial_payments,
        "maintenance_costs": maintenance_costs,
        "total_maintenance": total_maintenance,
        "unpaid_count": len([m for m in outstanding_months if m["status"] == "unpaid"]),
        "partial_count": len([m for m in outstanding_months if m["status"] == "partial"]),
        "suggestion": suggestion
    }

# ==================== FACTUREN (INVOICES) ROUTES ====================

@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_active_user)):
    """Get all invoices (rent due) for all tenants with payment status, cumulative balance, maintenance costs and loans"""
    
    # Get all apartments with tenants
    apartments = await db.apartments.find(
        {"user_id": current_user["id"], "tenant_id": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    if not apartments:
        return {"invoices": [], "summary": {"total_invoices": 0, "paid": 0, "partial": 0, "unpaid": 0, "total_amount": 0, "paid_amount": 0, "unpaid_amount": 0}}
    
    # Get all tenants
    tenant_ids = [apt["tenant_id"] for apt in apartments if apt.get("tenant_id")]
    tenants = await db.tenants.find(
        {"id": {"$in": tenant_ids}, "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    tenant_map = {t["id"]: t for t in tenants}
    
    # Get all rent payments
    payments = await db.payments.find(
        {"user_id": current_user["id"], "payment_type": "rent"},
        {"_id": 0}
    ).to_list(10000)
    
    # Get all loan payments
    loan_payments = await db.payments.find(
        {"user_id": current_user["id"], "payment_type": "loan"},
        {"_id": 0, "tenant_id": 1, "loan_id": 1, "amount": 1}
    ).to_list(10000)
    
    # Get all loans
    loans = await db.loans.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate loan balances per tenant
    loan_payments_by_loan = {}
    for lp in loan_payments:
        loan_id = lp.get("loan_id")
        if loan_id:
            if loan_id not in loan_payments_by_loan:
                loan_payments_by_loan[loan_id] = 0
            loan_payments_by_loan[loan_id] += lp["amount"]
    
    # Group loans by tenant with remaining balance
    loans_by_tenant = {}
    for loan in loans:
        tenant_id = loan["tenant_id"]
        if tenant_id not in loans_by_tenant:
            loans_by_tenant[tenant_id] = {
                "total": 0,
                "paid": 0,
                "remaining": 0,
                "items": []
            }
        paid = loan_payments_by_loan.get(loan["id"], 0)
        remaining = loan["amount"] - paid
        if remaining > 0:
            loans_by_tenant[tenant_id]["total"] += loan["amount"]
            loans_by_tenant[tenant_id]["paid"] += paid
            loans_by_tenant[tenant_id]["remaining"] += remaining
            loans_by_tenant[tenant_id]["items"].append({
                "id": loan["id"],
                "date": loan["loan_date"],
                "description": loan.get("description", ""),
                "amount": loan["amount"],
                "paid": paid,
                "remaining": remaining
            })
    
    # Get all maintenance costs for tenants (cost_type = 'tenant')
    maintenance_records = await db.maintenance.find(
        {"user_id": current_user["id"], "cost_type": "tenant"},
        {"_id": 0}
    ).to_list(1000)
    
    # Create maintenance lookup by apartment_id
    # Group by apartment and calculate total + details
    maintenance_by_apartment = {}
    for m in maintenance_records:
        apt_id = m["apartment_id"]
        if apt_id not in maintenance_by_apartment:
            maintenance_by_apartment[apt_id] = {
                "total": 0,
                "items": []
            }
        category_labels = {
            'wc': 'WC/Toilet', 'kraan': 'Kraan', 'douche': 'Douche',
            'keuken': 'Keuken', 'kasten': 'Kasten', 'verven': 'Verven', 'overig': 'Overig'
        }
        maintenance_by_apartment[apt_id]["total"] += m["cost"]
        maintenance_by_apartment[apt_id]["items"].append({
            "id": m["id"],
            "date": m["maintenance_date"],
            "category": category_labels.get(m.get("category", "overig"), "Onderhoud"),
            "description": m.get("description", ""),
            "cost": m["cost"]
        })
    
    # Create payment lookup: (tenant_id, apartment_id, year, month) -> list of payments
    payment_lookup = {}
    for p in payments:
        if p.get("period_month") and p.get("period_year"):
            key = (p["tenant_id"], p["apartment_id"], p["period_year"], p["period_month"])
            if key not in payment_lookup:
                payment_lookup[key] = []
            payment_lookup[key].append(p)
    
    months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    
    now = datetime.now(timezone.utc)
    
    # Process each apartment/tenant combination
    all_invoices = []
    
    for apt in apartments:
        tenant = tenant_map.get(apt.get("tenant_id"))
        if not tenant:
            continue
        
        # Get maintenance costs for this apartment (tenant pays)
        apt_maintenance = maintenance_by_apartment.get(apt["id"], {"total": 0, "items": []})
        
        # Get loan balance for this tenant
        tenant_loans = loans_by_tenant.get(apt["tenant_id"], {"total": 0, "paid": 0, "remaining": 0, "items": []})
        
        # Determine start date (from apartment creation or assignment)
        try:
            created = apt.get("created_at", "")
            if created:
                start_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            else:
                start_dt = now
        except:
            start_dt = now
        
        # Generate invoices from start month to current month
        year = start_dt.year
        month = start_dt.month
        
        # Track cumulative balance for this tenant (including maintenance and loans)
        cumulative_balance = 0.0
        # Add maintenance costs to starting balance
        cumulative_balance += apt_maintenance["total"]
        # Add loan balance to starting balance
        cumulative_balance += tenant_loans["remaining"]
        
        tenant_invoices = []
        is_first_month = True
        
        while (year < now.year) or (year == now.year and month <= now.month):
            key = (apt["tenant_id"], apt["id"], year, month)
            period_payments = payment_lookup.get(key, [])
            
            # Calculate amounts
            rent_due = apt["rent_amount"]
            # Only add maintenance and loans to first month's invoice display
            maintenance_due = apt_maintenance["total"] if is_first_month else 0
            loan_due = tenant_loans["remaining"] if is_first_month else 0
            amount_due = rent_due + maintenance_due + loan_due
            amount_paid = sum(p["amount"] for p in period_payments)
            remaining = amount_due - amount_paid
            
            # Add previous balance to this month's remaining
            if not is_first_month:
                total_remaining = remaining + cumulative_balance
            else:
                total_remaining = remaining
            
            # Determine status
            if amount_paid >= amount_due:
                status = "paid"
                cumulative_balance = min(0, remaining) if not is_first_month else min(0, total_remaining)
            elif amount_paid > 0:
                status = "partial"
                cumulative_balance = total_remaining
            else:
                status = "unpaid"
                cumulative_balance = total_remaining
            
            invoice_id = f"{apt['id']}-{year}-{month:02d}"
            
            # Get latest payment date if any
            latest_payment_date = None
            if period_payments:
                latest_payment_date = max(p["payment_date"] for p in period_payments)
            
            invoice = {
                "id": invoice_id,
                "tenant_id": apt["tenant_id"],
                "tenant_name": tenant["name"],
                "tenant_phone": tenant.get("phone", ""),
                "apartment_id": apt["id"],
                "apartment_name": apt["name"],
                "year": year,
                "month": month,
                "month_name": months_nl[month],
                "period_label": f"{months_nl[month]} {year}",
                "rent_amount": rent_due,
                "maintenance_cost": maintenance_due,
                "maintenance_items": apt_maintenance["items"] if is_first_month and maintenance_due > 0 else [],
                "loan_amount": loan_due,
                "loan_items": tenant_loans["items"] if is_first_month and loan_due > 0 else [],
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "remaining": max(0, remaining),
                "cumulative_balance": max(0, cumulative_balance),
                "status": status,
                "payment_count": len(period_payments),
                "payment_ids": [p["id"] for p in period_payments],
                "payment_date": latest_payment_date,
                "due_date": f"{year}-{month:02d}-01"
            }
            
            tenant_invoices.append(invoice)
            is_first_month = False
            
            month += 1
            if month > 12:
                month = 1
                year += 1
        
        all_invoices.extend(tenant_invoices)
    
    # Sort by date (newest first), then by tenant name
    all_invoices.sort(key=lambda x: (-x["year"], -x["month"], x["tenant_name"]))
    
    # Calculate summary
    total_invoices = len(all_invoices)
    paid_invoices = [i for i in all_invoices if i["status"] == "paid"]
    partial_invoices = [i for i in all_invoices if i["status"] == "partial"]
    unpaid_invoices = [i for i in all_invoices if i["status"] == "unpaid"]
    
    summary = {
        "total_invoices": total_invoices,
        "paid": len(paid_invoices),
        "partial": len(partial_invoices),
        "unpaid": len(unpaid_invoices),
        "total_amount": sum(i["amount_due"] for i in all_invoices),
        "paid_amount": sum(i["amount_paid"] for i in all_invoices),
        "unpaid_amount": sum(i["remaining"] for i in all_invoices)
    }
    
    return {"invoices": all_invoices, "summary": summary}

@api_router.get("/invoices/pdf/{tenant_id}/{year}/{month}")
async def get_invoice_pdf(tenant_id: str, year: int, month: int, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF for a specific invoice/factuur"""
    user_id = current_user["id"]
    
    # Get tenant
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": user_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment
    apartment = await db.apartments.find_one({"tenant_id": tenant_id, "user_id": user_id}, {"_id": 0})
    if not apartment:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    rent_amount = apartment.get("rent_amount", 0)
    
    # Get rent payments for this period
    all_payments = await db.payments.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    rent_payments = [p for p in all_payments if 
                    p["tenant_id"] == tenant_id and 
                    p.get("payment_type") == "rent" and
                    p.get("period_month") == month and 
                    p.get("period_year") == year]
    
    total_paid = sum(p["amount"] for p in rent_payments)
    remaining = max(0, rent_amount - total_paid)
    
    # Get maintenance costs for tenant this month
    maintenance_records = await db.maintenance.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    tenant_maintenance = [m for m in maintenance_records if 
                         m.get("tenant_id") == tenant_id and
                         m.get("cost_type") == "tenant"]
    
    month_maintenance = []
    maintenance_cost = 0
    for m in tenant_maintenance:
        try:
            m_date = datetime.fromisoformat(m["date"].replace("Z", "+00:00"))
            if m_date.month == month and m_date.year == year:
                month_maintenance.append(m)
                maintenance_cost += m.get("cost", 0)
        except:
            pass
    
    # Get loans info
    loans = await db.loans.find({"user_id": user_id, "tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    loan_payments = [p for p in all_payments if p.get("payment_type") == "loan" and p.get("tenant_id") == tenant_id]
    
    total_loan_amount = sum(l["amount"] for l in loans)
    total_loan_paid = sum(p["amount"] for p in loan_payments)
    loan_balance = max(0, total_loan_amount - total_loan_paid)
    
    # Calculate cumulative balance
    cumulative_due = 0
    cumulative_paid = 0
    for m in range(1, month + 1):
        cumulative_due += rent_amount
        month_payments = [p for p in all_payments if 
                        p["tenant_id"] == tenant_id and 
                        p.get("payment_type") == "rent" and
                        p.get("period_month") == m and 
                        p.get("period_year") == year]
        cumulative_paid += sum(p["amount"] for p in month_payments)
    
    cumulative_balance = cumulative_due - cumulative_paid
    
    # Status
    status = "Openstaand"
    if total_paid >= rent_amount:
        status = "Betaald"
    elif total_paid > 0:
        status = "Gedeeltelijk"
    
    # Month names in Dutch
    month_names = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                   'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Colors
    PRIMARY_GREEN = HexColor("#0caf60")
    DARK_TEXT = HexColor("#1a1a1a")
    GRAY_TEXT = HexColor("#666666")
    LIGHT_GRAY = HexColor("#f5f5f5")
    
    # Custom styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=DARK_TEXT,
        spaceAfter=10,
        alignment=1
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=PRIMARY_GREEN,
        spaceBefore=15,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        spaceAfter=4
    )
    
    # Company header
    company_name = current_user.get("company_name") or current_user.get("name") or "Verhuurder"
    elements.append(Paragraph(company_name, ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=16,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph(current_user.get("email", ""), ParagraphStyle(
        'CompanyEmail',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        alignment=1
    )))
    elements.append(Spacer(1, 20))
    
    # Title
    elements.append(Paragraph("FACTUUR", title_style))
    elements.append(Spacer(1, 5))
    
    # Period
    elements.append(Paragraph(f"{month_names[month]} {year}", ParagraphStyle(
        'Period',
        parent=styles['Normal'],
        fontSize=14,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 5))
    
    # Status badge
    status_color = PRIMARY_GREEN if status == "Betaald" else HexColor("#f59e0b") if status == "Gedeeltelijk" else HexColor("#ef4444")
    elements.append(Paragraph(f"Status: {status}", ParagraphStyle(
        'Status',
        parent=styles['Normal'],
        fontSize=11,
        textColor=status_color,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 20))
    
    # Tenant & Apartment info in table
    elements.append(Paragraph("GEGEVENS", section_header))
    
    info_data = [
        ["Huurder:", tenant.get("name", "-")],
        ["E-mail:", tenant.get("email", "-")],
        ["Telefoon:", tenant.get("phone", "-")],
        ["ID/Paspoort:", tenant.get("id_number", "-")],
        ["", ""],
        ["Appartement:", apartment.get("name", "-")],
        ["Adres:", apartment.get("address", "-")]
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY_TEXT),
        ('TEXTCOLOR', (1, 0), (1, -1), DARK_TEXT),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Financial details
    elements.append(Paragraph("FINANCIEEL OVERZICHT", section_header))
    
    def format_currency(amount):
        return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    fin_data = [
        ["Omschrijving", "Bedrag"],
        ["Maandelijkse huur", format_currency(rent_amount)],
    ]
    
    if maintenance_cost > 0:
        fin_data.append(["Onderhoudskosten (huurder)", format_currency(maintenance_cost)])
    
    fin_data.append(["Totaal verschuldigd", format_currency(rent_amount + maintenance_cost)])
    fin_data.append(["Betaald", f"- {format_currency(total_paid)}"])
    fin_data.append(["Openstaand deze maand", format_currency(remaining + maintenance_cost)])
    
    fin_table = Table(fin_data, colWidths=[10*cm, 6*cm])
    fin_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor("#e8f5e9") if remaining == 0 else HexColor("#fff3e0")),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK_TEXT),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_TEXT),
    ]))
    elements.append(fin_table)
    elements.append(Spacer(1, 20))
    
    # Cumulative balance
    elements.append(Paragraph("CUMULATIEF SALDO", section_header))
    cum_data = [
        ["Totaal verschuldigd t/m deze maand:", format_currency(cumulative_due)],
        ["Totaal betaald t/m deze maand:", format_currency(cumulative_paid)],
        ["Saldo:", format_currency(abs(cumulative_balance)) + (" (achterstallig)" if cumulative_balance > 0 else " (vooruit)")],
    ]
    
    cum_table = Table(cum_data, colWidths=[10*cm, 6*cm])
    cum_table.setStyle(TableStyle([
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -2), DARK_TEXT),
        ('TEXTCOLOR', (0, -1), (-1, -1), HexColor("#ef4444") if cumulative_balance > 0 else PRIMARY_GREEN),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cum_table)
    elements.append(Spacer(1, 20))
    
    # Loan info if any
    if loan_balance > 0:
        elements.append(Paragraph("OPENSTAANDE LENING", section_header))
        elements.append(Paragraph(f"Totaal uitgeleend: {format_currency(total_loan_amount)}", normal_text))
        elements.append(Paragraph(f"Totaal terugbetaald: {format_currency(total_loan_paid)}", normal_text))
        elements.append(Paragraph(f"<b>Openstaand: {format_currency(loan_balance)}</b>", normal_text))
        elements.append(Spacer(1, 20))
    
    # Payment history
    if rent_payments:
        elements.append(Paragraph("BETALINGEN DEZE MAAND", section_header))
        pay_data = [["Datum", "Bedrag"]]
        for p in rent_payments:
            pay_data.append([p.get("payment_date", "-"), format_currency(p.get("amount", 0))])
        
        pay_table = Table(pay_data, colWidths=[8*cm, 8*cm])
        pay_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('TEXTCOLOR', (1, 1), (1, -1), PRIMARY_GREEN),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, GRAY_TEXT),
        ]))
        elements.append(pay_table)
        elements.append(Spacer(1, 20))
    
    # Maintenance records
    if month_maintenance:
        elements.append(Paragraph("ONDERHOUDSKOSTEN DEZE MAAND", section_header))
        maint_data = [["Datum", "Omschrijving", "Bedrag"]]
        for m in month_maintenance:
            maint_data.append([
                m.get("date", "-")[:10], 
                m.get("description", "-")[:30],
                format_currency(m.get("cost", 0))
            ])
        
        maint_table = Table(maint_data, colWidths=[4*cm, 8*cm, 4*cm])
        maint_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('TEXTCOLOR', (2, 1), (2, -1), HexColor("#f59e0b")),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, GRAY_TEXT),
        ]))
        elements.append(maint_table)
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        f"Gegenereerd op: {datetime.now(timezone.utc).strftime('%d-%m-%Y %H:%M')}",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=GRAY_TEXT, alignment=1)
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Factuur_{tenant.get('name', 'huurder').replace(' ', '_')}_{month_names[month]}_{year}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== KASGELD (CASH FUND) ROUTES ====================

@api_router.post("/kasgeld", response_model=KasgeldResponse)
async def create_kasgeld_transaction(kasgeld_data: KasgeldCreate, current_user: dict = Depends(get_current_active_user)):
    kasgeld_id = str(uuid.uuid4())
    kasgeld_doc = {
        "id": kasgeld_id,
        "amount": kasgeld_data.amount,
        "transaction_type": kasgeld_data.transaction_type,
        "description": kasgeld_data.description,
        "transaction_date": kasgeld_data.transaction_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.kasgeld.insert_one(kasgeld_doc)
    
    return KasgeldResponse(**kasgeld_doc)

@api_router.get("/kasgeld", response_model=KasgeldBalanceResponse)
async def get_kasgeld(current_user: dict = Depends(get_current_active_user)):
    # Get all manual kasgeld transactions
    manual_transactions = await db.kasgeld.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Get all payments (huurbetalingen) - these count as income to kasgeld
    payments = await db.payments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Batch fetch tenant and apartment names for payments
    tenant_ids = list(set(p["tenant_id"] for p in payments)) if payments else []
    apt_ids = list(set(p["apartment_id"] for p in payments)) if payments else []
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if tenant_ids else []
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if apt_ids else []
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apt_map = {a["id"]: a["name"] for a in apts}
    
    # Calculate totals from manual transactions
    total_deposits = sum(t["amount"] for t in manual_transactions if t["transaction_type"] == "deposit")
    total_withdrawals = sum(t["amount"] for t in manual_transactions if t["transaction_type"] == "withdrawal")
    
    # Calculate total from payments (all payments go to kasgeld)
    total_payments = sum(p["amount"] for p in payments)
    
    # Get maintenance records - only those with cost_type='kasgeld' (or no cost_type for legacy data)
    maintenance_records = await db.maintenance.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Filter: Only count costs where cost_type is 'kasgeld' or not set (legacy)
    kasgeld_maintenance = [m for m in maintenance_records if m.get("cost_type", "kasgeld") == "kasgeld"]
    total_maintenance_costs = sum(m["cost"] for m in kasgeld_maintenance)
    
    # Batch fetch apartment names for maintenance
    maint_apt_ids = list(set(m["apartment_id"] for m in maintenance_records))
    maint_apts = await db.apartments.find({"id": {"$in": maint_apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if maint_apt_ids else []
    maint_apt_map = {a["id"]: a["name"] for a in maint_apts}
    
    # Get total salary payments
    salary_payments = await db.salaries.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    total_salary_payments = sum(s["amount"] for s in salary_payments)
    
    # Batch fetch employee names for salary payments
    employee_ids = list(set(s["employee_id"] for s in salary_payments)) if salary_payments else []
    employees = await db.employees.find({"id": {"$in": employee_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if employee_ids else []
    employee_map = {e["id"]: e["name"] for e in employees}
    
    # Total balance = deposits + payments - withdrawals - maintenance costs (kasgeld only) - salaries
    total_balance = total_deposits + total_payments - total_withdrawals - total_maintenance_costs - total_salary_payments
    
    # Combine all transactions for display
    all_transactions = []
    
    # Add manual transactions
    for t in manual_transactions:
        all_transactions.append(KasgeldResponse(
            **t,
            source="manual"
        ))
    
    # Add payments as transactions
    for p in payments:
        tenant_name = tenant_map.get(p["tenant_id"], "Onbekend")
        apt_name = apt_map.get(p["apartment_id"], "")
        payment_type_label = "Huur" if p["payment_type"] == "rent" else "Borg" if p["payment_type"] == "deposit" else "Overig"
        
        all_transactions.append(KasgeldResponse(
            id=p["id"],
            amount=p["amount"],
            transaction_type="payment",
            description=f"{payment_type_label} van {tenant_name} - {apt_name}",
            transaction_date=p["payment_date"],
            created_at=p["created_at"],
            user_id=p["user_id"],
            source="payment"
        ))
    
    # Add salary payments as transactions (negative)
    for s in salary_payments:
        employee_name = employee_map.get(s["employee_id"], "Onbekend")
        
        all_transactions.append(KasgeldResponse(
            id=s["id"],
            amount=s["amount"],
            transaction_type="salary",
            description=f"Salaris {employee_name} - {s['period_month']}/{s['period_year']}",
            transaction_date=s["payment_date"],
            created_at=s["created_at"],
            user_id=s["user_id"],
            source="salary"
        ))
    
    # Add maintenance records as transactions (only kasgeld type costs)
    for m in kasgeld_maintenance:
        apt_name = maint_apt_map.get(m["apartment_id"], "Onbekend")
        category_labels = {
            'wc': 'WC/Toilet', 'kraan': 'Kraan', 'douche': 'Douche',
            'keuken': 'Keuken', 'kasten': 'Kasten', 'verven': 'Verven', 'overig': 'Overig'
        }
        cat_label = category_labels.get(m.get("category", "overig"), "Onderhoud")
        
        all_transactions.append(KasgeldResponse(
            id=m["id"],
            amount=m["cost"],
            transaction_type="maintenance",
            description=f"{cat_label} - {apt_name}: {m.get('description', '')}",
            transaction_date=m["maintenance_date"],
            created_at=m["created_at"],
            user_id=m["user_id"],
            source="maintenance"
        ))
    
    # Sort all transactions by date (newest first)
    all_transactions.sort(key=lambda x: x.transaction_date, reverse=True)
    
    return KasgeldBalanceResponse(
        total_balance=total_balance,
        total_deposits=total_deposits,
        total_payments=total_payments,
        total_withdrawals=total_withdrawals,
        total_maintenance_costs=total_maintenance_costs,
        total_salary_payments=total_salary_payments,
        transactions=all_transactions
    )

@api_router.delete("/kasgeld/{kasgeld_id}")
async def delete_kasgeld_transaction(kasgeld_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.kasgeld.delete_one({"id": kasgeld_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    return {"message": "Transactie verwijderd"}

# ==================== ONDERHOUD (MAINTENANCE) ROUTES ====================

@api_router.post("/maintenance", response_model=MaintenanceResponse)
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify apartment exists
    apt = await db.apartments.find_one(
        {"id": maintenance_data.apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    maintenance_id = str(uuid.uuid4())
    maintenance_doc = {
        "id": maintenance_id,
        "apartment_id": maintenance_data.apartment_id,
        "category": maintenance_data.category,
        "description": maintenance_data.description,
        "cost": maintenance_data.cost,
        "maintenance_date": maintenance_data.maintenance_date,
        "status": maintenance_data.status,
        "cost_type": maintenance_data.cost_type,  # 'kasgeld' or 'tenant'
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.maintenance.insert_one(maintenance_doc)
    
    return MaintenanceResponse(
        **maintenance_doc,
        apartment_name=apt["name"]
    )

@api_router.get("/maintenance", response_model=List[MaintenanceResponse])
async def get_maintenance_records(current_user: dict = Depends(get_current_active_user)):
    records = await db.maintenance.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("maintenance_date", -1).to_list(1000)
    
    # Batch fetch apartment names
    apt_ids = list(set(r["apartment_id"] for r in records))
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apt_map = {a["id"]: a["name"] for a in apts}
    
    for record in records:
        record["apartment_name"] = apt_map.get(record["apartment_id"])
    
    return [MaintenanceResponse(**r) for r in records]

@api_router.get("/maintenance/{maintenance_id}", response_model=MaintenanceResponse)
async def get_maintenance_record(maintenance_id: str, current_user: dict = Depends(get_current_active_user)):
    record = await db.maintenance.find_one(
        {"id": maintenance_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    
    apt = await db.apartments.find_one({"id": record["apartment_id"]}, {"_id": 0, "name": 1})
    record["apartment_name"] = apt["name"] if apt else None
    
    return MaintenanceResponse(**record)

@api_router.put("/maintenance/{maintenance_id}", response_model=MaintenanceResponse)
async def update_maintenance(maintenance_id: str, maintenance_data: MaintenanceUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in maintenance_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.maintenance.update_one(
        {"id": maintenance_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    
    record = await db.maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    apt = await db.apartments.find_one({"id": record["apartment_id"]}, {"_id": 0, "name": 1})
    record["apartment_name"] = apt["name"] if apt else None
    
    return MaintenanceResponse(**record)

@api_router.delete("/maintenance/{maintenance_id}")
async def delete_maintenance(maintenance_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.maintenance.delete_one({"id": maintenance_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    return {"message": "Onderhoudsrecord verwijderd"}

@api_router.get("/maintenance/apartment/{apartment_id}", response_model=List[MaintenanceResponse])
async def get_apartment_maintenance(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    records = await db.maintenance.find(
        {"apartment_id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort("maintenance_date", -1).to_list(1000)
    
    apt = await db.apartments.find_one({"id": apartment_id}, {"_id": 0, "name": 1})
    apt_name = apt["name"] if apt else None
    
    for record in records:
        record["apartment_name"] = apt_name
    
    return [MaintenanceResponse(**r) for r in records]

# ==================== WERKNEMERS (EMPLOYEES) ROUTES ====================

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_active_user)):
    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id,
        "name": employee_data.name,
        "position": employee_data.position,
        "phone": employee_data.phone,
        "email": employee_data.email,
        "salary": employee_data.salary,
        "start_date": employee_data.start_date,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.employees.insert_one(employee_doc)
    
    return EmployeeResponse(**employee_doc)

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(current_user: dict = Depends(get_current_active_user)):
    employees = await db.employees.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    return [EmployeeResponse(**e) for e in employees]

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_active_user)):
    employee = await db.employees.find_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return EmployeeResponse(**employee)

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee_data: EmployeeUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in employee_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.employees.update_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return EmployeeResponse(**employee)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.employees.delete_one({"id": employee_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

# ==================== SALARIS (SALARY) ROUTES ====================

@api_router.post("/salaries", response_model=SalaryPaymentResponse)
async def create_salary_payment(salary_data: SalaryPaymentCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify employee exists
    employee = await db.employees.find_one(
        {"id": salary_data.employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    salary_id = str(uuid.uuid4())
    salary_doc = {
        "id": salary_id,
        "employee_id": salary_data.employee_id,
        "amount": salary_data.amount,
        "payment_date": salary_data.payment_date,
        "period_month": salary_data.period_month,
        "period_year": salary_data.period_year,
        "description": salary_data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.salaries.insert_one(salary_doc)
    
    return SalaryPaymentResponse(
        **salary_doc,
        employee_name=employee["name"]
    )

@api_router.get("/salaries", response_model=List[SalaryPaymentResponse])
async def get_salary_payments(current_user: dict = Depends(get_current_active_user)):
    salaries = await db.salaries.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    
    # Batch fetch employee names
    employee_ids = list(set(s["employee_id"] for s in salaries))
    employees = await db.employees.find({"id": {"$in": employee_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    employee_map = {e["id"]: e["name"] for e in employees}
    
    for salary in salaries:
        salary["employee_name"] = employee_map.get(salary["employee_id"])
    
    return [SalaryPaymentResponse(**s) for s in salaries]

@api_router.delete("/salaries/{salary_id}")
async def delete_salary_payment(salary_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.salaries.delete_one({"id": salary_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salarisbetaling niet gevonden")
    return {"message": "Salarisbetaling verwijderd"}

# ==================== PDF LOONSTROOK (PAYSLIP) ====================

def create_payslip_pdf(salary, employee, user):
    """Create a modern styled payslip PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'PayslipTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Company name from user
    company_name = user.get("company_name") if user and user.get("company_name") else "Facturatie N.V."
    
    # === HEADER SECTION ===
    header_data = []
    
    # Left side: Logo or Company name
    left_content = []
    if user and user.get("logo"):
        try:
            logo_data = user["logo"]
            if "," in logo_data:
                logo_data = logo_data.split(",")[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=4*cm, height=2*cm)
            left_content.append(logo_img)
        except Exception as e:
            logger.error(f"Error adding logo: {e}")
            left_content.append(Paragraph(company_name, company_style))
    else:
        left_content.append(Paragraph(company_name, company_style))
    
    left_content.append(Paragraph("Verhuurbeheersysteem", small_text))
    
    # Right side: LOONSTROOK title
    right_content = [Paragraph("LOONSTROOK", title_style)]
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[10*cm, 7*cm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Green line separator
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === PAYSLIP DETAILS ROW ===
    payslip_num = salary["id"][:8].upper()
    payment_date = salary.get("payment_date", "-")
    months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    period = f"{months_nl[salary.get('period_month', 1)]} {salary.get('period_year', '-')}"
    
    details_data = [
        [
            Paragraph("<b>Loonstrook Nr:</b>", normal_text),
            Paragraph(payslip_num, bold_text),
            Paragraph("<b>Betaaldatum:</b>", normal_text),
            Paragraph(payment_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 3*cm, 6*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === EMPLOYEE INFO ===
    emp_name = employee["name"] if employee else "Onbekend"
    emp_position = employee.get("position", "-") if employee else "-"
    emp_phone = employee.get("phone", "-") if employee else "-"
    emp_email = employee.get("email", "-") if employee else "-"
    emp_start = employee.get("start_date", "-") if employee else "-"
    
    info_left = [
        [Paragraph("WERKNEMER", section_header)],
        [Paragraph(f"<b>{emp_name}</b>", normal_text)],
        [Paragraph(f"Functie: {emp_position}", small_text)],
        [Paragraph(f"Tel: {emp_phone}", small_text)],
        [Paragraph(f"Email: {emp_email}", small_text)],
    ]
    
    info_right = [
        [Paragraph("PERIODE", section_header)],
        [Paragraph(f"<b>{period}</b>", normal_text)],
        [Paragraph(f"In dienst sinds: {emp_start}", small_text)],
        [Paragraph("", small_text)],
        [Paragraph("", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === PAYMENT TABLE ===
    amount = salary.get("amount", 0)
    description = salary.get("description") or f"Salaris {period}"
    
    table_header = ['OMSCHRIJVING', 'PERIODE', 'BEDRAG']
    table_data = [
        table_header,
        [description, period, format_currency(amount)]
    ]
    
    items_table = Table(table_data, colWidths=[9*cm, 4*cm, 4*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === TOTALS SECTION ===
    totals_data = [
        ['Bruto salaris:', format_currency(amount)],
        ['Inhoudingen:', format_currency(0)],
        ['', ''],
        ['NETTO UITBETAALD:', format_currency(amount)],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 2), 10),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 14),
        ('TEXTCOLOR', (0, 3), (-1, 3), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 2, PRIMARY_GREEN),
    ]))
    
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 30))
    
    # === FOOTER ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=15))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Dit document is gegenereerd door {company_name}", footer_style))
    elements.append(Paragraph("Bewaar deze loonstrook voor uw administratie.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/salaries/{salary_id}/pdf")
async def generate_payslip_pdf(salary_id: str, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF payslip for a salary payment"""
    # Get salary data
    salary = await db.salaries.find_one(
        {"id": salary_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not salary:
        raise HTTPException(status_code=404, detail="Salarisbetaling niet gevonden")
    
    employee = await db.employees.find_one({"id": salary["employee_id"]}, {"_id": 0})
    
    # Get user logo and company name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "logo": 1, "company_name": 1})
    
    # Create PDF
    buffer = create_payslip_pdf(salary, employee, user)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=loonstrook_{salary_id[:8]}.pdf"
        }
    )

# ==================== LENINGEN (LOANS) ROUTES ====================

@api_router.get("/loans")
async def get_loans(current_user: dict = Depends(get_current_active_user)):
    """Get all loans for the current user"""
    loans = await db.loans.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Get tenant names and calculate payments
    tenant_ids = list(set(l["tenant_id"] for l in loans))
    tenants = await db.tenants.find(
        {"id": {"$in": tenant_ids}},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(1000) if tenant_ids else []
    tenant_map = {t["id"]: t["name"] for t in tenants}
    
    # Get all loan payments
    loan_payments = await db.payments.find(
        {"user_id": current_user["id"], "payment_type": "loan"},
        {"_id": 0, "loan_id": 1, "amount": 1}
    ).to_list(10000)
    
    # Calculate payments per loan
    loan_payments_map = {}
    for p in loan_payments:
        loan_id = p.get("loan_id")
        if loan_id:
            if loan_id not in loan_payments_map:
                loan_payments_map[loan_id] = 0
            loan_payments_map[loan_id] += p["amount"]
    
    result = []
    for loan in loans:
        try:
            amount_paid = loan_payments_map.get(loan.get("id", ""), 0)
            loan_amount = loan.get("amount", 0) or 0
            remaining = loan_amount - amount_paid
            
            if remaining <= 0:
                calc_status = "paid"
            elif amount_paid > 0:
                calc_status = "partial"
            else:
                calc_status = "open"
            
            # Build response manually to avoid duplicate keys
            result.append(LoanResponse(
                id=loan.get("id", ""),
                tenant_id=loan.get("tenant_id", ""),
                amount=loan_amount,
                description=loan.get("description", ""),
                loan_date=loan.get("loan_date") or loan.get("created_at", "")[:10] if loan.get("created_at") else "",
                created_at=loan.get("created_at", ""),
                user_id=loan.get("user_id", ""),
                tenant_name=tenant_map.get(loan.get("tenant_id", ""), "Onbekend"),
                amount_paid=amount_paid,
                remaining=max(0, remaining),
                status=calc_status
            ))
        except Exception as e:
            # Skip invalid loans instead of crashing
            logger.error(f"Error processing loan {loan.get('id')}: {e}")
            continue
    
    return result

@api_router.post("/loans", response_model=LoanResponse)
async def create_loan(loan_data: LoanCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new loan for a tenant"""
    # Verify tenant exists
    tenant = await db.tenants.find_one(
        {"id": loan_data.tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    loan_id = str(uuid.uuid4())
    loan_doc = {
        "id": loan_id,
        "tenant_id": loan_data.tenant_id,
        "amount": loan_data.amount,
        "description": loan_data.description,
        "loan_date": loan_data.loan_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.loans.insert_one(loan_doc)
    
    return LoanResponse(
        **loan_doc,
        tenant_name=tenant["name"],
        amount_paid=0,
        remaining=loan_data.amount,
        status="open"
    )

@api_router.put("/loans/{loan_id}", response_model=LoanResponse)
async def update_loan(loan_id: str, loan_data: LoanUpdate, current_user: dict = Depends(get_current_active_user)):
    """Update an existing loan"""
    loan = await db.loans.find_one(
        {"id": loan_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    
    update_data = {k: v for k, v in loan_data.dict().items() if v is not None}
    if update_data:
        await db.loans.update_one(
            {"id": loan_id},
            {"$set": update_data}
        )
    
    updated_loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    
    # Get tenant name
    tenant = await db.tenants.find_one({"id": updated_loan["tenant_id"]}, {"_id": 0, "name": 1})
    
    # Calculate payments
    loan_payments = await db.payments.find(
        {"loan_id": loan_id, "payment_type": "loan"},
        {"_id": 0, "amount": 1}
    ).to_list(1000)
    amount_paid = sum(p["amount"] for p in loan_payments)
    remaining = updated_loan["amount"] - amount_paid
    
    if remaining <= 0:
        status = "paid"
    elif amount_paid > 0:
        status = "partial"
    else:
        status = "open"
    
    return LoanResponse(
        **updated_loan,
        tenant_name=tenant["name"] if tenant else "Onbekend",
        amount_paid=amount_paid,
        remaining=max(0, remaining),
        status=status
    )

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a loan"""
    result = await db.loans.delete_one({"id": loan_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    return {"message": "Lening verwijderd"}

@api_router.get("/tenants/{tenant_id}/loans")
async def get_tenant_loans(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get all loans for a specific tenant"""
    loans = await db.loans.find(
        {"tenant_id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Get loan payments
    loan_ids = [l["id"] for l in loans]
    loan_payments = await db.payments.find(
        {"loan_id": {"$in": loan_ids}, "payment_type": "loan"},
        {"_id": 0, "loan_id": 1, "amount": 1}
    ).to_list(1000) if loan_ids else []
    
    loan_payments_map = {}
    for p in loan_payments:
        loan_id = p.get("loan_id")
        if loan_id:
            if loan_id not in loan_payments_map:
                loan_payments_map[loan_id] = 0
            loan_payments_map[loan_id] += p["amount"]
    
    total_loans = 0
    total_paid = 0
    result = []
    
    for loan in loans:
        amount_paid = loan_payments_map.get(loan["id"], 0)
        remaining = loan["amount"] - amount_paid
        total_loans += loan["amount"]
        total_paid += amount_paid
        
        if remaining <= 0:
            status = "paid"
        elif amount_paid > 0:
            status = "partial"
        else:
            status = "open"
        
        result.append({
            **loan,
            "amount_paid": amount_paid,
            "remaining": max(0, remaining),
            "status": status
        })
    
    return {
        "loans": result,
        "total_loans": total_loans,
        "total_paid": total_paid,
        "total_remaining": total_loans - total_paid
    }

# ==================== CONTRACT (HUURCONTRACT) ROUTES ====================

class ContractCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    start_date: str
    end_date: Optional[str] = None  # None = onbepaalde tijd
    rent_amount: float
    deposit_amount: float
    payment_due_day: int = 1
    payment_deadline_day: Optional[int] = None
    payment_deadline_month_offset: int = 0
    additional_terms: Optional[str] = None

class ContractUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    payment_due_day: Optional[int] = None
    payment_deadline_day: Optional[int] = None
    payment_deadline_month_offset: Optional[int] = None
    additional_terms: Optional[str] = None

class ContractResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    apartment_id: str
    apartment_name: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    rent_amount: float
    deposit_amount: float
    payment_due_day: int
    payment_deadline_day: Optional[int] = None
    payment_deadline_month_offset: int = 0
    additional_terms: Optional[str] = None
    status: str  # 'draft', 'pending_signature', 'signed'
    signing_token: Optional[str] = None
    signature_data: Optional[str] = None
    signed_at: Optional[str] = None
    created_at: str
    user_id: str
    # Landlord info
    landlord_name: Optional[str] = None
    landlord_company: Optional[str] = None

@api_router.get("/contracts", response_model=List[ContractResponse])
async def get_contracts(current_user: dict = Depends(get_current_active_user)):
    """Get all contracts for the current user"""
    contracts = await db.contracts.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get tenant and apartment info
    tenant_ids = list(set(c["tenant_id"] for c in contracts))
    apartment_ids = list(set(c["apartment_id"] for c in contracts))
    
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apartments = await db.apartments.find({"id": {"$in": apartment_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apartment_map = {a["id"]: a["name"] for a in apartments}
    
    result = []
    for contract in contracts:
        contract["tenant_name"] = tenant_map.get(contract["tenant_id"])
        contract["apartment_name"] = apartment_map.get(contract["apartment_id"])
        contract["landlord_name"] = current_user.get("name")
        contract["landlord_company"] = current_user.get("company_name")
        result.append(ContractResponse(**contract))
    
    return result

@api_router.post("/contracts", response_model=ContractResponse)
async def create_contract(contract: ContractCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new contract"""
    # Verify tenant exists and belongs to user
    tenant = await db.tenants.find_one(
        {"id": contract.tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Verify apartment exists and belongs to user
    apartment = await db.apartments.find_one(
        {"id": contract.apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apartment:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # Generate unique signing token
    signing_token = str(uuid.uuid4())
    
    contract_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "tenant_id": contract.tenant_id,
        "apartment_id": contract.apartment_id,
        "start_date": contract.start_date,
        "end_date": contract.end_date,
        "rent_amount": contract.rent_amount,
        "deposit_amount": contract.deposit_amount,
        "payment_due_day": contract.payment_due_day,
        "payment_deadline_day": contract.payment_deadline_day,
        "payment_deadline_month_offset": contract.payment_deadline_month_offset,
        "additional_terms": contract.additional_terms,
        "status": "pending_signature",
        "signing_token": signing_token,
        "signature_data": None,
        "signed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contracts.insert_one(contract_doc)
    
    return ContractResponse(
        **contract_doc,
        tenant_name=tenant["name"],
        apartment_name=apartment["name"],
        landlord_name=current_user.get("name"),
        landlord_company=current_user.get("company_name")
    )

@api_router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get a specific contract"""
    contract = await db.contracts.find_one(
        {"id": contract_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0, "name": 1})
    apartment = await db.apartments.find_one({"id": contract["apartment_id"]}, {"_id": 0, "name": 1})
    
    return ContractResponse(
        **contract,
        tenant_name=tenant["name"] if tenant else None,
        apartment_name=apartment["name"] if apartment else None,
        landlord_name=current_user.get("name"),
        landlord_company=current_user.get("company_name")
    )

@api_router.put("/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(contract_id: str, contract_data: ContractUpdate, current_user: dict = Depends(get_current_active_user)):
    """Update a contract (only if not yet signed)"""
    contract = await db.contracts.find_one(
        {"id": contract_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    if contract["status"] == "signed":
        raise HTTPException(status_code=400, detail="Ondertekende contracten kunnen niet worden gewijzigd")
    
    update_data = {k: v for k, v in contract_data.dict().items() if v is not None}
    if update_data:
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": update_data}
        )
    
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": updated["tenant_id"]}, {"_id": 0, "name": 1})
    apartment = await db.apartments.find_one({"id": updated["apartment_id"]}, {"_id": 0, "name": 1})
    
    return ContractResponse(
        **updated,
        tenant_name=tenant["name"] if tenant else None,
        apartment_name=apartment["name"] if apartment else None,
        landlord_name=current_user.get("name"),
        landlord_company=current_user.get("company_name")
    )

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a contract"""
    result = await db.contracts.delete_one({"id": contract_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    return {"message": "Contract verwijderd"}

# Public endpoint for signing (no auth required)
@api_router.get("/contracts/sign/{token}")
async def get_contract_for_signing(token: str):
    """Get contract details for signing (public endpoint)"""
    contract = await db.contracts.find_one(
        {"signing_token": token},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden of link is verlopen")
    
    if contract["status"] == "signed":
        raise HTTPException(status_code=400, detail="Dit contract is al ondertekend")
    
    # Get related info
    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0})
    apartment = await db.apartments.find_one({"id": contract["apartment_id"]}, {"_id": 0})
    user = await db.users.find_one({"id": contract["user_id"]}, {"_id": 0, "name": 1, "company_name": 1, "email": 1})
    
    return {
        "contract": {
            "id": contract["id"],
            "start_date": contract["start_date"],
            "end_date": contract["end_date"],
            "rent_amount": contract["rent_amount"],
            "deposit_amount": contract["deposit_amount"],
            "payment_due_day": contract["payment_due_day"],
            "payment_deadline_day": contract.get("payment_deadline_day"),
            "payment_deadline_month_offset": contract.get("payment_deadline_month_offset", 0),
            "additional_terms": contract.get("additional_terms"),
            "status": contract["status"]
        },
        "tenant": {
            "name": tenant["name"] if tenant else None,
            "email": tenant.get("email") if tenant else None,
            "phone": tenant.get("phone") if tenant else None,
            "id_number": tenant.get("id_number") if tenant else None
        },
        "apartment": {
            "name": apartment["name"] if apartment else None,
            "address": apartment.get("address") if apartment else None
        },
        "landlord": {
            "name": user.get("name") if user else None,
            "company_name": user.get("company_name") if user else None,
            "email": user.get("email") if user else None
        }
    }

class SignatureSubmit(BaseModel):
    signature_data: str  # Base64 encoded image

@api_router.post("/contracts/sign/{token}")
async def sign_contract(token: str, signature: SignatureSubmit):
    """Submit signature for a contract (public endpoint)"""
    contract = await db.contracts.find_one(
        {"signing_token": token},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden of link is verlopen")
    
    if contract["status"] == "signed":
        raise HTTPException(status_code=400, detail="Dit contract is al ondertekend")
    
    # Update contract with signature
    await db.contracts.update_one(
        {"signing_token": token},
        {"$set": {
            "signature_data": signature.signature_data,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "status": "signed"
        }}
    )
    
    return {"message": "Contract succesvol ondertekend"}

@api_router.get("/contracts/{contract_id}/pdf")
async def get_contract_pdf(contract_id: str, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF for a contract"""
    contract = await db.contracts.find_one(
        {"id": contract_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    # Get related data
    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0})
    apartment = await db.apartments.find_one({"id": contract["apartment_id"]}, {"_id": 0})
    user = await db.users.find_one({"id": contract["user_id"]}, {"_id": 0})
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Colors
    PRIMARY_GREEN = HexColor("#0caf60")
    DARK_TEXT = HexColor("#1a1a1a")
    GRAY_TEXT = HexColor("#666666")
    LIGHT_GRAY = HexColor("#f5f5f5")
    
    # Custom styles
    title_style = ParagraphStyle(
        'ContractTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=DARK_TEXT,
        spaceAfter=20,
        alignment=1  # Center
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=11,
        textColor=DARK_TEXT,
        spaceAfter=8,
        leading=16
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT
    )
    
    # Header with logo placeholder
    company_name = user.get("company_name") or user.get("name") or "Verhuurder"
    elements.append(Paragraph(company_name, ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 10))
    
    # Title
    elements.append(Paragraph("HUUROVEREENKOMST", title_style))
    elements.append(Spacer(1, 20))
    
    # Contract info
    contract_date = datetime.now(timezone.utc).strftime("%d-%m-%Y")
    elements.append(Paragraph(f"Datum: {contract_date}", small_text))
    elements.append(Paragraph(f"Contractnummer: {contract['id'][:8].upper()}", small_text))
    elements.append(Spacer(1, 20))
    
    # PARTIJEN
    elements.append(Paragraph("PARTIJEN", section_header))
    
    # Verhuurder
    landlord_text = f"""
    <b>DE VERHUURDER:</b><br/>
    Naam: {user.get('name', '-')}<br/>
    Bedrijf: {user.get('company_name', '-')}<br/>
    E-mail: {user.get('email', '-')}<br/>
    """
    elements.append(Paragraph(landlord_text, normal_text))
    elements.append(Spacer(1, 10))
    
    # Huurder
    tenant_text = f"""
    <b>DE HUURDER:</b><br/>
    Naam: {tenant.get('name', '-') if tenant else '-'}<br/>
    ID/Paspoort: {tenant.get('id_number', '-') if tenant else '-'}<br/>
    Telefoon: {tenant.get('phone', '-') if tenant else '-'}<br/>
    E-mail: {tenant.get('email', '-') if tenant else '-'}<br/>
    """
    elements.append(Paragraph(tenant_text, normal_text))
    elements.append(Spacer(1, 20))
    
    # HET GEHUURDE
    elements.append(Paragraph("HET GEHUURDE", section_header))
    apt_address = apartment.get('address', '-') if apartment else '-'
    apt_name = apartment.get('name', '-') if apartment else '-'
    elements.append(Paragraph(f"""
    Het gehuurde betreft: <b>{apt_name}</b><br/>
    Adres: {apt_address}<br/>
    """, normal_text))
    elements.append(Spacer(1, 20))
    
    # HUURPERIODE
    elements.append(Paragraph("HUURPERIODE", section_header))
    start_date = contract.get('start_date', '-')
    end_date = contract.get('end_date')
    if end_date:
        period_text = f"De huurovereenkomst gaat in op <b>{start_date}</b> en eindigt op <b>{end_date}</b>."
    else:
        period_text = f"De huurovereenkomst gaat in op <b>{start_date}</b> en is voor onbepaalde tijd."
    elements.append(Paragraph(period_text, normal_text))
    elements.append(Spacer(1, 20))
    
    # HUURPRIJS EN BETALING
    elements.append(Paragraph("HUURPRIJS EN BETALING", section_header))
    
    def format_currency(amount):
        return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    rent_amount = format_currency(contract.get('rent_amount', 0))
    deposit_amount = format_currency(contract.get('deposit_amount', 0))
    due_day = contract.get('payment_due_day', 1)
    
    payment_text = f"""
    <b>Huurprijs:</b> {rent_amount} per maand<br/>
    <b>Waarborgsom:</b> {deposit_amount}<br/>
    <b>Betaaldatum:</b> De {due_day}e van elke maand<br/>
    """
    
    deadline_day = contract.get('payment_deadline_day')
    deadline_offset = contract.get('payment_deadline_month_offset', 0)
    if deadline_day and deadline_day > 0:
        if deadline_offset == 1:
            payment_text += f"<b>Uiterste betaaldatum:</b> De {deadline_day}e van de volgende maand<br/>"
        else:
            payment_text += f"<b>Uiterste betaaldatum:</b> De {deadline_day}e van dezelfde maand<br/>"
    
    elements.append(Paragraph(payment_text, normal_text))
    elements.append(Spacer(1, 20))
    
    # BIJZONDERE BEPALINGEN
    if contract.get('additional_terms'):
        elements.append(Paragraph("BIJZONDERE BEPALINGEN", section_header))
        elements.append(Paragraph(contract['additional_terms'], normal_text))
        elements.append(Spacer(1, 20))
    
    # ONDERTEKENING
    elements.append(Paragraph("ONDERTEKENING", section_header))
    elements.append(Paragraph(
        "Aldus overeengekomen en in tweevoud opgemaakt en ondertekend:",
        normal_text
    ))
    elements.append(Spacer(1, 30))
    
    # Signature table
    sig_data = [
        ["Verhuurder", "Huurder"],
        ["", ""],
        ["", ""],
        [f"Naam: {user.get('name', '-')}", f"Naam: {tenant.get('name', '-') if tenant else '-'}"],
        [f"Datum: {contract_date}", f"Datum: {contract.get('signed_at', '_______________')[:10] if contract.get('signed_at') else '_______________'}"]
    ]
    
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(sig_table)
    
    # Add signature image if signed
    if contract.get('signature_data') and contract.get('status') == 'signed':
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("<b>Digitale Handtekening Huurder:</b>", small_text))
        
        try:
            # Decode base64 signature
            sig_b64 = contract['signature_data']
            if ',' in sig_b64:
                sig_b64 = sig_b64.split(',')[1]
            sig_bytes = base64.b64decode(sig_b64)
            sig_img = PILImage.open(BytesIO(sig_bytes))
            
            # Save to buffer
            img_buffer = BytesIO()
            sig_img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            # Add to PDF
            sig_image = Image(img_buffer, width=6*cm, height=2*cm)
            elements.append(sig_image)
            elements.append(Paragraph(f"Ondertekend op: {contract['signed_at'][:10]}", small_text))
        except Exception as e:
            elements.append(Paragraph(f"[Handtekening beschikbaar]", small_text))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    tenant_name = tenant.get('name', 'huurder').replace(' ', '_') if tenant else 'huurder'
    filename = f"Contract_{tenant_name}_{contract['id'][:8]}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== WISSELKOERS (EXCHANGE RATE) ROUTES ====================

# Cache for exchange rate (to avoid too many API calls)
exchange_rate_cache = {
    "rate": None,
    "last_updated": None
}

@api_router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate():
    """Get current SRD to EUR exchange rate"""
    now = datetime.now(timezone.utc)
    
    # Check if cache is valid (less than 1 hour old)
    if exchange_rate_cache["rate"] and exchange_rate_cache["last_updated"]:
        cache_age = (now - exchange_rate_cache["last_updated"]).total_seconds()
        if cache_age < 3600:  # 1 hour
            return ExchangeRateResponse(
                srd_to_eur=exchange_rate_cache["rate"],
                eur_to_srd=1 / exchange_rate_cache["rate"],
                last_updated=exchange_rate_cache["last_updated"].isoformat(),
                source="cached"
            )
    
    # Try to fetch from external API
    try:
        async with httpx.AsyncClient() as client:
            # Using exchangerate-api.com (free tier)
            response = await client.get(
                "https://api.exchangerate-api.com/v4/latest/EUR",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                # SRD rate from EUR
                eur_to_srd = data.get("rates", {}).get("SRD", 38.5)
                srd_to_eur = 1 / eur_to_srd
                
                # Update cache
                exchange_rate_cache["rate"] = srd_to_eur
                exchange_rate_cache["last_updated"] = now
                
                return ExchangeRateResponse(
                    srd_to_eur=srd_to_eur,
                    eur_to_srd=eur_to_srd,
                    last_updated=now.isoformat(),
                    source="live"
                )
    except Exception as e:
        logger.warning(f"Failed to fetch exchange rate: {e}")
    
    # Fallback to approximate rate if API fails
    # Current approximate rate: 1 EUR ≈ 38.5 SRD (December 2024)
    fallback_eur_to_srd = 38.5
    return ExchangeRateResponse(
        srd_to_eur=1 / fallback_eur_to_srd,
        eur_to_srd=fallback_eur_to_srd,
        last_updated=now.isoformat(),
        source="fallback"
    )

# ==================== ADMIN/SUPERADMIN ROUTES ====================

# ==================== ADD-ONS MANAGEMENT ROUTES ====================

@api_router.get("/addons", response_model=List[AddonResponse])
async def get_all_addons():
    """Get all available add-ons (public endpoint)"""
    addons = await db.addons.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    return [AddonResponse(**addon) for addon in addons]

@api_router.post("/admin/addons", response_model=AddonResponse)
async def create_addon(addon_data: AddonCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new add-on - superadmin only"""
    # Check if slug already exists
    existing = await db.addons.find_one({"slug": addon_data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Add-on met deze slug bestaat al")
    
    addon_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    addon_doc = {
        "id": addon_id,
        "name": addon_data.name,
        "slug": addon_data.slug,
        "description": addon_data.description,
        "price": addon_data.price,
        "is_active": addon_data.is_active,
        "created_at": now
    }
    
    await db.addons.insert_one(addon_doc)
    return AddonResponse(**addon_doc)

@api_router.get("/admin/addons", response_model=List[AddonResponse])
async def get_admin_addons(current_user: dict = Depends(get_superadmin)):
    """Get all add-ons including inactive - superadmin only"""
    addons = await db.addons.find({}, {"_id": 0}).to_list(100)
    return [AddonResponse(**addon) for addon in addons]

@api_router.put("/admin/addons/{addon_id}", response_model=AddonResponse)
async def update_addon(addon_id: str, addon_data: AddonUpdate, current_user: dict = Depends(get_superadmin)):
    """Update an add-on - superadmin only"""
    addon = await db.addons.find_one({"id": addon_id}, {"_id": 0})
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    
    update_data = {k: v for k, v in addon_data.model_dump().items() if v is not None}
    if update_data:
        await db.addons.update_one({"id": addon_id}, {"$set": update_data})
    
    updated = await db.addons.find_one({"id": addon_id}, {"_id": 0})
    return AddonResponse(**updated)

@api_router.delete("/admin/addons/{addon_id}")
async def delete_addon(addon_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete an add-on - superadmin only"""
    result = await db.addons.delete_one({"id": addon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    
    # Also remove all user addons for this addon
    await db.user_addons.delete_many({"addon_id": addon_id})
    await db.addon_requests.delete_many({"addon_id": addon_id})
    
    return {"message": "Add-on verwijderd"}

# ==================== USER ADD-ONS MANAGEMENT ====================

@api_router.get("/user/addons", response_model=List[UserAddonResponse])
async def get_my_addons(current_user: dict = Depends(get_current_user)):
    """Get current user's active add-ons"""
    user_addons = await db.user_addons.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    result = []
    now = datetime.now(timezone.utc)
    
    for ua in user_addons:
        # Check if expired
        end_date = ua.get("end_date")
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt < now and ua.get("status") == "active":
                    await db.user_addons.update_one(
                        {"id": ua["id"]},
                        {"$set": {"status": "expired"}}
                    )
                    ua["status"] = "expired"
            except:
                pass
        
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        result.append(UserAddonResponse(
            id=ua["id"],
            user_id=ua["user_id"],
            addon_id=ua["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_slug=addon.get("slug") if addon else None,
            status=ua.get("status", "active"),
            start_date=ua.get("start_date", ua.get("created_at")),
            end_date=ua.get("end_date"),
            created_at=ua.get("created_at")
        ))
    
    return result

@api_router.post("/user/addons/request", response_model=AddonRequestResponse)
async def request_addon_activation(request_data: AddonRequestCreate, current_user: dict = Depends(get_current_user)):
    """Request activation of an add-on (for customers)"""
    # Check if addon exists
    addon = await db.addons.find_one({"id": request_data.addon_id, "is_active": True}, {"_id": 0})
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden of niet beschikbaar")
    
    # Check if already has active addon
    existing_active = await db.user_addons.find_one({
        "user_id": current_user["id"],
        "addon_id": request_data.addon_id,
        "status": "active"
    }, {"_id": 0})
    if existing_active:
        raise HTTPException(status_code=400, detail="U heeft deze add-on al actief")
    
    # Check if pending request exists
    existing_request = await db.addon_requests.find_one({
        "user_id": current_user["id"],
        "addon_id": request_data.addon_id,
        "status": "pending"
    }, {"_id": 0})
    if existing_request:
        raise HTTPException(status_code=400, detail="U heeft al een verzoek ingediend voor deze add-on")
    
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    request_doc = {
        "id": request_id,
        "user_id": current_user["id"],
        "addon_id": request_data.addon_id,
        "status": "pending",
        "notes": request_data.notes,
        "created_at": now
    }
    
    await db.addon_requests.insert_one(request_doc)
    
    return AddonRequestResponse(
        id=request_id,
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        user_email=current_user.get("email"),
        addon_id=request_data.addon_id,
        addon_name=addon.get("name"),
        addon_price=addon.get("price"),
        status="pending",
        notes=request_data.notes,
        created_at=now
    )

# ==================== ADMIN USER ADD-ONS MANAGEMENT ====================

@api_router.get("/admin/user-addons", response_model=List[UserAddonResponse])
async def get_all_user_addons(current_user: dict = Depends(get_superadmin)):
    """Get all user add-ons - superadmin only"""
    user_addons = await db.user_addons.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for ua in user_addons:
        user = await db.users.find_one({"id": ua["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        
        result.append(UserAddonResponse(
            id=ua["id"],
            user_id=ua["user_id"],
            user_name=user.get("name") if user else None,
            user_email=user.get("email") if user else None,
            addon_id=ua["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_slug=addon.get("slug") if addon else None,
            status=ua.get("status", "active"),
            start_date=ua.get("start_date", ua.get("created_at")),
            end_date=ua.get("end_date"),
            created_at=ua.get("created_at")
        ))
    
    return result

@api_router.get("/admin/users/{user_id}/addons", response_model=List[UserAddonResponse])
async def get_user_addons_admin(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Get add-ons for a specific user - superadmin only"""
    user_addons = await db.user_addons.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    result = []
    for ua in user_addons:
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        
        result.append(UserAddonResponse(
            id=ua["id"],
            user_id=ua["user_id"],
            addon_id=ua["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_slug=addon.get("slug") if addon else None,
            status=ua.get("status", "active"),
            start_date=ua.get("start_date", ua.get("created_at")),
            end_date=ua.get("end_date"),
            created_at=ua.get("created_at")
        ))
    
    return result

@api_router.post("/admin/users/{user_id}/addons", response_model=UserAddonResponse)
async def activate_user_addon(user_id: str, addon_data: UserAddonCreate, current_user: dict = Depends(get_superadmin)):
    """Activate an add-on for a user - superadmin only"""
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    # Check if addon exists
    addon = await db.addons.find_one({"id": addon_data.addon_id}, {"_id": 0})
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    
    # Check if already has active addon of same type
    existing = await db.user_addons.find_one({
        "user_id": user_id,
        "addon_id": addon_data.addon_id,
        "status": "active"
    }, {"_id": 0})
    
    now = datetime.now(timezone.utc)
    end_date = (now + timedelta(days=30 * addon_data.months)).isoformat()
    
    if existing:
        # Extend existing addon
        current_end = existing.get("end_date")
        if current_end:
            try:
                current_end_dt = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
                if current_end_dt > now:
                    # Extend from current end date
                    end_date = (current_end_dt + timedelta(days=30 * addon_data.months)).isoformat()
            except:
                pass
        
        await db.user_addons.update_one(
            {"id": existing["id"]},
            {"$set": {"end_date": end_date}}
        )
        
        updated = await db.user_addons.find_one({"id": existing["id"]}, {"_id": 0})
        return UserAddonResponse(
            id=updated["id"],
            user_id=updated["user_id"],
            user_name=user.get("name"),
            user_email=user.get("email"),
            addon_id=updated["addon_id"],
            addon_name=addon.get("name"),
            addon_slug=addon.get("slug"),
            status=updated.get("status", "active"),
            start_date=updated.get("start_date", updated.get("created_at")),
            end_date=updated.get("end_date"),
            created_at=updated.get("created_at")
        )
    
    # Create new user addon
    user_addon_id = str(uuid.uuid4())
    
    user_addon_doc = {
        "id": user_addon_id,
        "user_id": user_id,
        "addon_id": addon_data.addon_id,
        "status": "active",
        "start_date": now.isoformat(),
        "end_date": end_date,
        "payment_method": addon_data.payment_method,
        "payment_reference": addon_data.payment_reference,
        "created_at": now.isoformat()
    }
    
    await db.user_addons.insert_one(user_addon_doc)
    
    # Remove any pending requests for this addon
    await db.addon_requests.delete_many({
        "user_id": user_id,
        "addon_id": addon_data.addon_id,
        "status": "pending"
    })
    
    return UserAddonResponse(
        id=user_addon_id,
        user_id=user_id,
        user_name=user.get("name"),
        user_email=user.get("email"),
        addon_id=addon_data.addon_id,
        addon_name=addon.get("name"),
        addon_slug=addon.get("slug"),
        status="active",
        start_date=now.isoformat(),
        end_date=end_date,
        created_at=now.isoformat()
    )

@api_router.delete("/admin/users/{user_id}/addons/{addon_id}")
async def deactivate_user_addon(user_id: str, addon_id: str, current_user: dict = Depends(get_superadmin)):
    """Deactivate an add-on for a user - superadmin only"""
    result = await db.user_addons.update_one(
        {"user_id": user_id, "addon_id": addon_id, "status": "active"},
        {"$set": {"status": "deactivated"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Actieve add-on niet gevonden voor deze gebruiker")
    
    return {"message": "Add-on gedeactiveerd"}

# ==================== ADD-ON REQUESTS MANAGEMENT ====================

@api_router.get("/admin/addon-requests", response_model=List[AddonRequestResponse])
async def get_addon_requests(current_user: dict = Depends(get_superadmin)):
    """Get all pending add-on requests - superadmin only"""
    requests = await db.addon_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for req in requests:
        user = await db.users.find_one({"id": req["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        addon = await db.addons.find_one({"id": req["addon_id"]}, {"_id": 0})
        
        result.append(AddonRequestResponse(
            id=req["id"],
            user_id=req["user_id"],
            user_name=user.get("name") if user else None,
            user_email=user.get("email") if user else None,
            addon_id=req["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_price=addon.get("price") if addon else None,
            status=req.get("status", "pending"),
            notes=req.get("notes"),
            created_at=req.get("created_at")
        ))
    
    return result

@api_router.put("/admin/addon-requests/{request_id}/approve")
async def approve_addon_request(request_id: str, months: int = 1, current_user: dict = Depends(get_superadmin)):
    """Approve an add-on request - superadmin only"""
    request = await db.addon_requests.find_one({"id": request_id, "status": "pending"}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden of al verwerkt")
    
    # Activate the addon for the user
    addon_data = UserAddonCreate(
        user_id=request["user_id"],
        addon_id=request["addon_id"],
        months=months
    )
    
    # Use the existing activation function
    result = await activate_user_addon(request["user_id"], addon_data, current_user)
    
    # Mark request as approved
    await db.addon_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved"}}
    )
    
    return {"message": "Add-on verzoek goedgekeurd en geactiveerd", "user_addon": result}

@api_router.put("/admin/addon-requests/{request_id}/reject")
async def reject_addon_request(request_id: str, current_user: dict = Depends(get_superadmin)):
    """Reject an add-on request - superadmin only"""
    result = await db.addon_requests.update_one(
        {"id": request_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden of al verwerkt")
    
    return {"message": "Add-on verzoek afgewezen"}

# ==================== LANDING PAGE CMS ROUTES ====================

@api_router.get("/public/landing/sections")
async def get_landing_sections():
    """Get all active landing page sections (public)"""
    sections = await db.landing_sections.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return sections

@api_router.get("/public/landing/settings")
async def get_landing_settings():
    """Get landing page settings (public)"""
    settings = await db.landing_settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "company_name": "Facturatie N.V.",
            "company_email": "info@facturatie.sr",
            "company_phone": "+597 8934982",
            "company_address": "Paramaribo, Suriname",
            "logo_url": "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp",
            "footer_text": "© 2025 Facturatie N.V. Alle rechten voorbehouden.",
            "social_links": {}
        }
    return settings

@api_router.get("/public/addons")
async def get_public_addons():
    """Get all active add-ons for landing page (public)"""
    addons = await db.addons.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    return addons

@api_router.post("/public/orders")
async def create_public_order(order_data: PublicOrderCreate):
    """Create a new order from landing page with account creation"""
    # Validate at least one addon selected
    if not order_data.addon_ids or len(order_data.addon_ids) == 0:
        raise HTTPException(status_code=400, detail="Selecteer minimaal één module")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": order_data.email.lower()}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Dit e-mailadres is al geregistreerd. Log in of gebruik een ander e-mailadres.")
    
    # Validate password
    if len(order_data.password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens zijn")
    
    # Validate addons exist
    addon_names = []
    total_price = 0
    for addon_id in order_data.addon_ids:
        addon = await db.addons.find_one({"id": addon_id, "is_active": True}, {"_id": 0})
        if not addon:
            raise HTTPException(status_code=400, detail=f"Add-on niet gevonden: {addon_id}")
        addon_names.append(addon["name"])
        total_price += addon.get("price", 0)
    
    order_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Create user account (inactive - pending payment/activation)
    user_doc = {
        "id": user_id,
        "email": order_data.email.lower(),
        "password": hash_password(order_data.password),
        "name": order_data.name,
        "company_name": order_data.company_name,
        "phone": order_data.phone,
        "role": "customer",
        "subscription_status": "pending",  # Will be activated after payment
        "subscription_end": None,
        "created_at": now,
        "order_id": order_id  # Link to the order
    }
    
    await db.users.insert_one(user_doc)
    
    # Create order
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "name": order_data.name,
        "email": order_data.email.lower(),
        "phone": order_data.phone,
        "company_name": order_data.company_name,
        "addon_ids": order_data.addon_ids,
        "addon_names": addon_names,
        "total_price": total_price,
        "message": order_data.message,
        "status": "pending",
        "payment_id": None,
        "payment_url": None,
        "created_at": now
    }
    
    await db.public_orders.insert_one(order_doc)
    
    return PublicOrderResponse(**order_doc)

# ==================== MOPE PAYMENT ROUTES ====================

MOPE_API_URL = "https://api.mope.sr/api"

async def get_mope_settings():
    """Get Mope payment settings"""
    settings = await db.mope_settings.find_one({}, {"_id": 0})
    if not settings:
        return MopeSettings()
    return MopeSettings(**settings)

async def get_mope_token():
    """Get the active Mope API token"""
    settings = await get_mope_settings()
    if not settings.is_enabled:
        return None
    if settings.use_live_mode:
        return settings.live_token
    return settings.test_token

@api_router.get("/admin/mope/settings")
async def get_admin_mope_settings(current_user: dict = Depends(get_superadmin)):
    """Get Mope payment settings (admin)"""
    settings = await db.mope_settings.find_one({}, {"_id": 0})
    if not settings:
        return MopeSettings()
    return settings

@api_router.put("/admin/mope/settings")
async def update_mope_settings(settings_data: MopeSettings, current_user: dict = Depends(get_superadmin)):
    """Update Mope payment settings (admin)"""
    settings_dict = settings_data.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.mope_settings.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_data

@api_router.post("/public/orders/{order_id}/pay")
async def create_payment_for_order(order_id: str, redirect_url: str = ""):
    """Create a Mope payment for an order"""
    import httpx
    
    # Get order
    order = await db.public_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    if order.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Deze bestelling is al betaald")
    
    # Get Mope settings
    token = await get_mope_token()
    if not token:
        raise HTTPException(status_code=400, detail="Mope betalingen zijn niet geconfigureerd. Neem contact op met de beheerder.")
    
    # Get landing settings for redirect URL
    landing_settings = await db.landing_settings.find_one({}, {"_id": 0})
    base_url = redirect_url or "/"
    
    # Create payment request to Mope
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MOPE_API_URL}/shop/payment_request",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "amount": order["total_price"],
                    "description": f"Bestelling {order_id[:8]} - {', '.join(order.get('addon_names', []))}",
                    "redirect_url": f"{base_url}/betaling-voltooid?order_id={order_id}"
                },
                timeout=30.0
            )
            
            if response.status_code != 200 and response.status_code != 201:
                logger.error(f"Mope API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Fout bij het aanmaken van de betaling")
            
            mope_response = response.json()
            payment_id = mope_response.get("id")
            payment_url = mope_response.get("payment_url") or mope_response.get("url")
            
            # Update order with payment info
            await db.public_orders.update_one(
                {"id": order_id},
                {"$set": {
                    "payment_id": payment_id,
                    "payment_url": payment_url,
                    "status": "pending_payment"
                }}
            )
            
            return {
                "payment_id": payment_id,
                "payment_url": payment_url,
                "order_id": order_id
            }
            
    except httpx.RequestError as e:
        logger.error(f"Mope request error: {e}")
        raise HTTPException(status_code=500, detail="Kon geen verbinding maken met Mope")

@api_router.get("/public/orders/{order_id}/payment-status")
async def check_payment_status(order_id: str):
    """Check payment status for an order"""
    import httpx
    
    order = await db.public_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    payment_id = order.get("payment_id")
    if not payment_id:
        return {"status": order.get("status", "pending"), "paid": False}
    
    # Get Mope token
    token = await get_mope_token()
    if not token:
        return {"status": order.get("status", "pending"), "paid": False}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MOPE_API_URL}/shop/payment_request/{payment_id}",
                headers={
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                mope_data = response.json()
                mope_status = mope_data.get("status", "").lower()
                
                if mope_status in ["paid", "completed", "success"]:
                    # Update order and activate user
                    await db.public_orders.update_one(
                        {"id": order_id},
                        {"$set": {"status": "paid"}}
                    )
                    
                    # Activate user account if exists
                    if order.get("user_id"):
                        trial_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                        await db.users.update_one(
                            {"id": order["user_id"]},
                            {"$set": {
                                "subscription_status": "active",
                                "subscription_end": trial_end
                            }}
                        )
                        
                        # Activate the add-ons for the user
                        for addon_id in order.get("addon_ids", []):
                            user_addon_id = str(uuid.uuid4())
                            now = datetime.now(timezone.utc)
                            await db.user_addons.insert_one({
                                "id": user_addon_id,
                                "user_id": order["user_id"],
                                "addon_id": addon_id,
                                "status": "active",
                                "start_date": now.isoformat(),
                                "end_date": (now + timedelta(days=30)).isoformat(),
                                "created_at": now.isoformat()
                            })
                    
                    return {"status": "paid", "paid": True}
                
                return {"status": mope_status, "paid": False}
            
            return {"status": order.get("status", "pending"), "paid": False}
            
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        return {"status": order.get("status", "pending"), "paid": False}

@api_router.post("/webhooks/mope")
async def mope_webhook(request: Request):
    """Handle Mope payment webhooks"""
    try:
        body = await request.json()
        payment_id = body.get("payment_request_id") or body.get("id")
        status = body.get("status", "").lower()
        
        logger.info(f"Mope webhook received: payment_id={payment_id}, status={status}")
        
        if not payment_id:
            return {"status": "error", "message": "Missing payment_request_id"}
        
        # Find order by payment_id
        order = await db.public_orders.find_one({"payment_id": payment_id}, {"_id": 0})
        if not order:
            logger.warning(f"Order not found for payment_id: {payment_id}")
            return {"status": "ok", "message": "Order not found"}
        
        if status in ["paid", "completed", "success"]:
            # Update order status
            await db.public_orders.update_one(
                {"payment_id": payment_id},
                {"$set": {"status": "paid"}}
            )
            
            # Activate user account if exists
            if order.get("user_id"):
                trial_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                await db.users.update_one(
                    {"id": order["user_id"]},
                    {"$set": {
                        "subscription_status": "active",
                        "subscription_end": trial_end
                    }}
                )
                
                # Activate the add-ons for the user
                for addon_id in order.get("addon_ids", []):
                    # Check if addon already exists
                    existing = await db.user_addons.find_one({
                        "user_id": order["user_id"],
                        "addon_id": addon_id,
                        "status": "active"
                    }, {"_id": 0})
                    
                    if not existing:
                        user_addon_id = str(uuid.uuid4())
                        now = datetime.now(timezone.utc)
                        await db.user_addons.insert_one({
                            "id": user_addon_id,
                            "user_id": order["user_id"],
                            "addon_id": addon_id,
                            "status": "active",
                            "start_date": now.isoformat(),
                            "end_date": (now + timedelta(days=30)).isoformat(),
                            "created_at": now.isoformat()
                        })
                
                logger.info(f"User {order['user_id']} activated via Mope payment")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Mope webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ==================== ADMIN LANDING PAGE MANAGEMENT ====================

@api_router.get("/admin/landing/sections")
async def get_admin_landing_sections(current_user: dict = Depends(get_superadmin)):
    """Get all landing page sections (admin)"""
    sections = await db.landing_sections.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return sections

@api_router.post("/admin/landing/sections")
async def create_landing_section(section_data: LandingPageSectionCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new landing page section"""
    section_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    section_doc = {
        "id": section_id,
        "section_type": section_data.section_type,
        "title": section_data.title,
        "content": section_data.content,
        "subtitle": section_data.subtitle,
        "image_url": section_data.image_url,
        "button_text": section_data.button_text,
        "button_link": section_data.button_link,
        "is_active": section_data.is_active,
        "order": section_data.order,
        "metadata": section_data.metadata,
        "created_at": now,
        "updated_at": now
    }
    
    await db.landing_sections.insert_one(section_doc)
    return LandingPageSection(**section_doc)

@api_router.put("/admin/landing/sections/{section_id}")
async def update_landing_section(section_id: str, section_data: LandingPageSectionUpdate, current_user: dict = Depends(get_superadmin)):
    """Update a landing page section"""
    section = await db.landing_sections.find_one({"id": section_id}, {"_id": 0})
    if not section:
        raise HTTPException(status_code=404, detail="Sectie niet gevonden")
    
    update_data = {k: v for k, v in section_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.landing_sections.update_one({"id": section_id}, {"$set": update_data})
    
    updated = await db.landing_sections.find_one({"id": section_id}, {"_id": 0})
    return LandingPageSection(**updated)

@api_router.delete("/admin/landing/sections/{section_id}")
async def delete_landing_section(section_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a landing page section"""
    result = await db.landing_sections.delete_one({"id": section_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sectie niet gevonden")
    return {"message": "Sectie verwijderd"}

@api_router.put("/admin/landing/sections/reorder")
async def reorder_landing_sections(section_orders: List[dict], current_user: dict = Depends(get_superadmin)):
    """Reorder landing page sections"""
    for item in section_orders:
        await db.landing_sections.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        )
    return {"message": "Volgorde bijgewerkt"}

@api_router.get("/admin/landing/settings")
async def get_admin_landing_settings(current_user: dict = Depends(get_superadmin)):
    """Get landing page settings (admin)"""
    settings = await db.landing_settings.find_one({}, {"_id": 0})
    if not settings:
        return LandingPageSettings()
    return settings

@api_router.put("/admin/landing/settings")
async def update_landing_settings(settings_data: LandingPageSettings, current_user: dict = Depends(get_superadmin)):
    """Update landing page settings"""
    settings_dict = settings_data.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.landing_settings.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_data

# ==================== ADMIN PUBLIC ORDERS MANAGEMENT ====================

@api_router.get("/admin/orders")
async def get_admin_orders(current_user: dict = Depends(get_superadmin)):
    """Get all public orders (admin)"""
    orders = await db.public_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [PublicOrderResponse(**order) for order in orders]

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, current_user: dict = Depends(get_superadmin)):
    """Update order status"""
    if status not in ["pending", "contacted", "converted", "rejected"]:
        raise HTTPException(status_code=400, detail="Ongeldige status")
    
    result = await db.public_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    return {"message": "Status bijgewerkt"}

@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete an order"""
    result = await db.public_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    return {"message": "Bestelling verwijderd"}

# ==================== SEED DEFAULT LANDING PAGE ====================

async def seed_default_landing_page():
    """Seed the default landing page sections if they don't exist"""
    existing = await db.landing_sections.find_one({}, {"_id": 0})
    if existing:
        return  # Already seeded
    
    now = datetime.now(timezone.utc).isoformat()
    
    default_sections = [
        {
            "id": str(uuid.uuid4()),
            "section_type": "hero",
            "title": "Uw Complete ERP Oplossing",
            "subtitle": "Modulaire bedrijfssoftware voor ondernemers in Suriname",
            "content": "Kies de modules die passen bij uw bedrijfsvoering. Betaal alleen voor wat u gebruikt.",
            "image_url": "https://customer-assets.emergentagent.com/job_07e3c66b-0794-491d-bbf3-342aff3c1100/artifacts/vill14ys_261F389D-0F54-4D61-963C-4B58A923ED3D.png",
            "button_text": "Start Nu",
            "button_link": "/register",
            "is_active": True,
            "order": 0,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "features",
            "title": "Waarom Facturatie N.V.?",
            "subtitle": "Alles wat u nodig heeft voor uw bedrijf",
            "content": None,
            "is_active": True,
            "order": 1,
            "metadata": {
                "features": [
                    {"icon": "Shield", "title": "Veilig & Betrouwbaar", "description": "Uw data is veilig opgeslagen in de cloud"},
                    {"icon": "Zap", "title": "Snel & Efficiënt", "description": "Bespaar tijd met onze geoptimaliseerde workflows"},
                    {"icon": "Package", "title": "Modulair Systeem", "description": "Betaal alleen voor de modules die u nodig heeft"},
                    {"icon": "HeadphonesIcon", "title": "24/7 Support", "description": "Altijd bereikbaar voor ondersteuning"}
                ]
            },
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "pricing",
            "title": "Onze Modules",
            "subtitle": "Kies de modules die passen bij uw bedrijf",
            "content": "Alle prijzen zijn per maand. Geen verborgen kosten.",
            "is_active": True,
            "order": 2,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "about",
            "title": "Over Ons",
            "subtitle": "Facturatie N.V. - Uw Partner in Bedrijfssoftware",
            "content": "Facturatie N.V. is een Surinaams softwarebedrijf dat zich richt op het ontwikkelen van moderne, gebruiksvriendelijke bedrijfssoftware. Onze missie is om ondernemers in Suriname te helpen hun bedrijf efficiënter te beheren met betaalbare, modulaire oplossingen.\n\nOnze software is speciaal ontworpen voor de Surinaamse markt, met ondersteuning voor lokale valuta en belastingregels.",
            "is_active": True,
            "order": 3,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "terms",
            "title": "Algemene Voorwaarden",
            "subtitle": "Gebruiksvoorwaarden Facturatie N.V.",
            "content": "**1. Algemeen**\nDeze algemene voorwaarden zijn van toepassing op alle diensten van Facturatie N.V.\n\n**2. Diensten**\nFacturatie N.V. biedt cloud-gebaseerde bedrijfssoftware aan op basis van maandelijkse abonnementen.\n\n**3. Betalingen**\nBetalingen geschieden vooraf per maand. Bij niet-betaling wordt de toegang tot de dienst opgeschort.\n\n**4. Privacy**\nWij gaan zorgvuldig om met uw gegevens. Zie ons privacybeleid voor meer informatie.\n\n**5. Aansprakelijkheid**\nFacturatie N.V. is niet aansprakelijk voor indirecte schade of gevolgschade.\n\n**6. Wijzigingen**\nWij behouden het recht om deze voorwaarden te wijzigen. Wijzigingen worden via e-mail gecommuniceerd.",
            "is_active": True,
            "order": 4,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "privacy",
            "title": "Privacybeleid",
            "subtitle": "Hoe wij omgaan met uw gegevens",
            "content": "**1. Verzamelde Gegevens**\nWij verzamelen alleen gegevens die nodig zijn voor het leveren van onze diensten: naam, e-mailadres, bedrijfsgegevens en gebruiksdata.\n\n**2. Gebruik van Gegevens**\nUw gegevens worden uitsluitend gebruikt voor het leveren en verbeteren van onze diensten.\n\n**3. Delen van Gegevens**\nWij delen uw gegevens niet met derden, tenzij wettelijk verplicht.\n\n**4. Beveiliging**\nWij nemen passende technische en organisatorische maatregelen om uw gegevens te beschermen.\n\n**5. Uw Rechten**\nU heeft recht op inzage, correctie en verwijdering van uw gegevens. Neem contact met ons op voor meer informatie.\n\n**6. Contact**\nVoor vragen over privacy kunt u contact opnemen via info@facturatie.sr",
            "is_active": True,
            "order": 5,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "contact",
            "title": "Contact",
            "subtitle": "Neem contact met ons op",
            "content": "Heeft u vragen of wilt u meer informatie? Neem gerust contact met ons op!",
            "is_active": True,
            "order": 6,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    await db.landing_sections.insert_many(default_sections)
    logger.info("Default landing page sections created")

# ==================== SEED DEFAULT ADD-ONS ====================

async def seed_default_addons():
    """Seed the default Vastgoed Beheer add-on if it doesn't exist"""
    existing = await db.addons.find_one({"slug": "vastgoed_beheer"}, {"_id": 0})
    if not existing:
        addon_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        addon_doc = {
            "id": addon_id,
            "name": "Vastgoed Beheer",
            "slug": "vastgoed_beheer",
            "description": "Complete vastgoedbeheer module met huurders, appartementen, contracten, betalingen, facturen, leningen, borg, kasgeld, onderhoud en werknemers.",
            "price": 3500.0,
            "is_active": True,
            "created_at": now
        }
        
        await db.addons.insert_one(addon_doc)
        logger.info("Default 'Vastgoed Beheer' add-on created")
    
    return existing or await db.addons.find_one({"slug": "vastgoed_beheer"}, {"_id": 0})

async def seed_default_cms_pages():
    """Seed default CMS pages if they don't exist"""
    existing = await db.cms_pages.find_one({}, {"_id": 0})
    if existing:
        return  # Already seeded
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create default Home page
    home_page = {
        "id": str(uuid.uuid4()),
        "title": "Home",
        "slug": "home",
        "description": "Welkom bij Facturatie N.V.",
        "template": "landing",
        "sections": [
            {
                "id": str(uuid.uuid4()),
                "type": "hero",
                "title": "Uw Complete ERP Oplossing",
                "subtitle": "Modulaire bedrijfssoftware voor ondernemers in Suriname",
                "content": "Kies de modules die passen bij uw bedrijfsvoering. Betaal alleen voor wat u gebruikt.",
                "image_url": None,
                "background_color": "#3b82f6",
                "text_color": "#ffffff",
                "button_text": "Start Nu",
                "button_link": "/register",
                "layout": "center",
                "order": 0,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "features",
                "title": "Waarom Facturatie N.V.?",
                "subtitle": "Alles wat u nodig heeft voor uw bedrijf",
                "items": [
                    {"title": "Veilig & Betrouwbaar", "description": "Uw data is veilig opgeslagen in de cloud"},
                    {"title": "Snel & Efficiënt", "description": "Bespaar tijd met onze geoptimaliseerde workflows"},
                    {"title": "Modulair Systeem", "description": "Betaal alleen voor de modules die u nodig heeft"},
                    {"title": "24/7 Support", "description": "Altijd bereikbaar voor ondersteuning"}
                ],
                "layout": "center",
                "order": 1,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "cta",
                "title": "Klaar om te beginnen?",
                "subtitle": "Start vandaag nog met uw gratis proefperiode",
                "button_text": "Registreer Nu",
                "button_link": "/register",
                "background_color": "#1e40af",
                "text_color": "#ffffff",
                "layout": "center",
                "order": 2,
                "is_visible": True
            }
        ],
        "is_published": True,
        "show_in_menu": True,
        "menu_order": 0,
        "menu_label": "Home",
        "show_header": True,
        "show_footer": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Create Over Ons page
    about_page = {
        "id": str(uuid.uuid4()),
        "title": "Over Ons",
        "slug": "over-ons",
        "description": "Leer meer over Facturatie N.V.",
        "template": "about",
        "sections": [
            {
                "id": str(uuid.uuid4()),
                "type": "hero",
                "title": "Over Ons",
                "subtitle": "Uw partner in bedrijfsautomatisering",
                "layout": "center",
                "order": 0,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "text",
                "title": "Ons Verhaal",
                "content": "Facturatie N.V. is opgericht met één doel: het leven van ondernemers in Suriname makkelijker maken. Wij bieden moderne, betaalbare software oplossingen die speciaal zijn ontworpen voor de lokale markt.",
                "layout": "center",
                "order": 1,
                "is_visible": True
            }
        ],
        "is_published": True,
        "show_in_menu": True,
        "menu_order": 1,
        "show_header": True,
        "show_footer": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Create Contact page
    contact_page = {
        "id": str(uuid.uuid4()),
        "title": "Contact",
        "slug": "contact",
        "description": "Neem contact met ons op",
        "template": "contact",
        "sections": [
            {
                "id": str(uuid.uuid4()),
                "type": "hero",
                "title": "Contact",
                "subtitle": "Wij horen graag van u",
                "layout": "center",
                "order": 0,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "contact",
                "title": "Neem contact op",
                "subtitle": "Vul het formulier in of neem direct contact met ons op",
                "layout": "center",
                "order": 1,
                "is_visible": True
            }
        ],
        "is_published": True,
        "show_in_menu": True,
        "menu_order": 2,
        "show_header": True,
        "show_footer": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.cms_pages.insert_many([home_page, about_page, contact_page])
    logger.info("Default CMS pages created")

# Call seed on startup
@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    try:
        await seed_default_addons()
        await seed_default_landing_page()
        await seed_default_cms_pages()
        logger.info("Startup tasks completed")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@api_router.get("/admin/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(current_user: dict = Depends(get_superadmin)):
    """Get admin dashboard statistics - superadmin only"""
    
    # Get all customers (excluding superadmin)
    all_users = await db.users.find(
        {"role": "customer"},
        {"_id": 0}
    ).to_list(1000)
    
    total_customers = len(all_users)
    active_subscriptions = 0
    expired_subscriptions = 0
    
    for user in all_users:
        status, _, _ = get_subscription_status(user)
        if status in ("active", "trial"):
            active_subscriptions += 1
        elif status == "expired":
            expired_subscriptions += 1
    
    # Get all subscription payments
    all_subscriptions = await db.subscriptions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    total_revenue = sum(s["amount"] for s in all_subscriptions)
    
    # Revenue this month
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    revenue_this_month = sum(
        s["amount"] for s in all_subscriptions 
        if s["created_at"] >= first_of_month
    )
    
    # Recent subscriptions with user info
    recent_subscriptions = []
    for sub in all_subscriptions[:10]:
        user = await db.users.find_one({"id": sub["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        recent_subscriptions.append(SubscriptionResponse(
            **sub,
            user_name=user["name"] if user else None,
            user_email=user["email"] if user else None
        ))
    
    return AdminDashboardStats(
        total_customers=total_customers,
        active_subscriptions=active_subscriptions,
        expired_subscriptions=expired_subscriptions,
        total_revenue=total_revenue,
        revenue_this_month=revenue_this_month,
        recent_subscriptions=recent_subscriptions
    )

@api_router.get("/admin/customers", response_model=List[CustomerResponse])
async def get_all_customers(current_user: dict = Depends(get_superadmin)):
    """Get all customers - superadmin only"""
    
    customers = await db.users.find(
        {"role": "customer"},
        {"_id": 0}
    ).to_list(1000)
    
    result = []
    for customer in customers:
        # Get total paid from subscriptions
        subscriptions = await db.subscriptions.find(
            {"user_id": customer["id"]},
            {"_id": 0, "amount": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(100)
        
        total_paid = sum(s["amount"] for s in subscriptions)
        last_payment_date = subscriptions[0]["created_at"] if subscriptions else None
        
        status, end_date, _ = get_subscription_status(customer)
        
        result.append(CustomerResponse(
            id=customer["id"],
            email=customer["email"],
            name=customer["name"],
            company_name=customer.get("company_name"),
            role=customer["role"],
            subscription_status=status,
            subscription_end_date=end_date,
            created_at=customer["created_at"],
            total_paid=total_paid,
            last_payment_date=last_payment_date
        ))
    
    return result

@api_router.post("/admin/subscriptions", response_model=SubscriptionResponse)
async def activate_subscription(sub_data: SubscriptionCreate, current_user: dict = Depends(get_superadmin)):
    """Activate or extend a customer subscription - superadmin only"""
    
    # Find the customer
    customer = await db.users.find_one({"id": sub_data.user_id, "role": "customer"}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    now = datetime.now(timezone.utc)
    
    # Calculate new end date
    current_end = customer.get("subscription_end_date")
    if current_end:
        try:
            current_end_dt = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
            if current_end_dt > now:
                # Extend from current end date
                start_date = current_end_dt
            else:
                # Start from now
                start_date = now
        except:
            start_date = now
    else:
        start_date = now
    
    end_date = start_date + timedelta(days=SUBSCRIPTION_DAYS * sub_data.months)
    
    # Create subscription record
    sub_id = str(uuid.uuid4())
    sub_doc = {
        "id": sub_id,
        "user_id": sub_data.user_id,
        "amount": SUBSCRIPTION_PRICE_SRD * sub_data.months,
        "months": sub_data.months,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "payment_method": sub_data.payment_method,
        "payment_reference": sub_data.payment_reference,
        "notes": sub_data.notes,
        "status": "active",
        "created_at": now.isoformat()
    }
    
    await db.subscriptions.insert_one(sub_doc)
    
    # Update user's subscription end date
    await db.users.update_one(
        {"id": sub_data.user_id},
        {"$set": {
            "subscription_end_date": end_date.isoformat(),
            "is_trial": False
        }}
    )
    
    return SubscriptionResponse(
        **sub_doc,
        user_name=customer["name"],
        user_email=customer["email"]
    )

@api_router.get("/admin/subscriptions", response_model=List[SubscriptionResponse])
async def get_all_subscriptions(current_user: dict = Depends(get_superadmin)):
    """Get all subscription payments - superadmin only"""
    
    subscriptions = await db.subscriptions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Batch fetch user names
    user_ids = list(set(s["user_id"] for s in subscriptions))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    user_map = {u["id"]: {"name": u["name"], "email": u["email"]} for u in users}
    
    result = []
    for sub in subscriptions:
        user_info = user_map.get(sub["user_id"], {})
        result.append(SubscriptionResponse(
            **sub,
            user_name=user_info.get("name"),
            user_email=user_info.get("email")
        ))
    
    return result

@api_router.delete("/admin/customers/{user_id}")
async def deactivate_customer(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Deactivate a customer's subscription - superadmin only"""
    
    result = await db.users.update_one(
        {"id": user_id, "role": "customer"},
        {"$set": {
            "subscription_end_date": datetime.now(timezone.utc).isoformat(),
            "is_trial": False
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Abonnement gedeactiveerd"}

# Admin: Create customer
class AdminCustomerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    plan_type: str = "trial"  # 'trial', 'active', 'none', 'free'
    subscription_months: int = 1
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None

@api_router.post("/admin/customers", response_model=CustomerResponse)
async def create_customer(customer_data: AdminCustomerCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new customer - superadmin only"""
    
    # Check if user exists
    existing = await db.users.find_one({"email": customer_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Calculate subscription end date based on plan_type
    subscription_end_date = None
    is_trial = False
    is_free = False
    
    if customer_data.plan_type == "active":
        # Active subscription with payment
        subscription_end_date = (now + timedelta(days=SUBSCRIPTION_DAYS * customer_data.subscription_months)).isoformat()
    elif customer_data.plan_type == "trial":
        # 3-day trial
        subscription_end_date = (now + timedelta(days=TRIAL_DAYS)).isoformat()
        is_trial = True
    elif customer_data.plan_type == "free":
        # Free forever - set far future date
        subscription_end_date = (now + timedelta(days=36500)).isoformat()  # 100 years
        is_free = True
    else:
        # No plan - expired (blocked until activation)
        subscription_end_date = (now - timedelta(days=1)).isoformat()
        is_trial = False
    
    user_doc = {
        "id": user_id,
        "email": customer_data.email,
        "password": hash_password(customer_data.password),
        "name": customer_data.name,
        "company_name": customer_data.company_name,
        "role": "customer",
        "subscription_end_date": subscription_end_date,
        "is_trial": is_trial,
        "is_free": is_free,
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # If subscription is activated, create subscription record
    total_paid = 0.0
    if customer_data.plan_type == "active":
        sub_id = str(uuid.uuid4())
        amount = SUBSCRIPTION_PRICE_SRD * customer_data.subscription_months
        sub_doc = {
            "id": sub_id,
            "user_id": user_id,
            "amount": amount,
            "months": customer_data.subscription_months,
            "start_date": now.isoformat(),
            "end_date": subscription_end_date,
            "payment_method": customer_data.payment_method,
            "payment_reference": customer_data.payment_reference,
            "notes": "Aangemaakt door admin",
            "status": "active",
            "created_at": now.isoformat()
        }
        await db.subscriptions.insert_one(sub_doc)
        total_paid = amount
    
    status, end_date, _ = get_subscription_status(user_doc)
    
    # Override status for free accounts
    if is_free:
        status = "active"
    
    # Send welcome email with credentials
    email_sent = send_welcome_email(
        name=customer_data.name,
        email=customer_data.email,
        password=customer_data.password,
        plan_type=customer_data.plan_type
    )
    
    if not email_sent:
        logger.warning(f"Welcome email could not be sent to {customer_data.email}")
    
    return CustomerResponse(
        id=user_id,
        email=customer_data.email,
        name=customer_data.name,
        company_name=customer_data.company_name,
        role="customer",
        subscription_status=status,
        subscription_end_date=end_date,
        created_at=user_doc["created_at"],
        total_paid=total_paid,
        last_payment_date=now.isoformat() if customer_data.plan_type == "active" else None
    )

@api_router.delete("/admin/customers/{user_id}/permanent")
async def delete_customer_permanent(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Permanently delete a customer and all their data - superadmin only"""
    
    # Check if customer exists
    customer = await db.users.find_one({"id": user_id, "role": "customer"}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    # Delete all customer data
    await db.users.delete_one({"id": user_id})
    await db.subscriptions.delete_many({"user_id": user_id})
    await db.subscription_requests.delete_many({"user_id": user_id})
    
    # Also delete customer's rental data
    await db.tenants.delete_many({"user_id": user_id})
    await db.apartments.delete_many({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    await db.deposits.delete_many({"user_id": user_id})
    await db.kasgeld.delete_many({"user_id": user_id})
    await db.maintenance.delete_many({"user_id": user_id})
    await db.employees.delete_many({"user_id": user_id})
    await db.salaries.delete_many({"user_id": user_id})
    
    return {"message": f"Klant {customer['name']} en alle gegevens permanent verwijderd"}

@api_router.delete("/admin/subscriptions/{subscription_id}")
async def delete_subscription_payment(subscription_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a subscription payment record - superadmin only"""
    
    # Get the subscription first to adjust the user's end date
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Abonnementsbetaling niet gevonden")
    
    # Delete the subscription
    await db.subscriptions.delete_one({"id": subscription_id})
    
    # Recalculate user's subscription end date based on remaining subscriptions
    user_id = subscription["user_id"]
    remaining_subs = await db.subscriptions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("end_date", -1).to_list(1)
    
    if remaining_subs:
        # Set end date to the latest remaining subscription
        new_end_date = remaining_subs[0]["end_date"]
    else:
        # No subscriptions left, set to expired
        new_end_date = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_end_date": new_end_date, "is_trial": False}}
    )
    
    return {"message": "Abonnementsbetaling verwijderd"}

@api_router.get("/admin/subscriptions/{subscription_id}/pdf")
async def generate_subscription_receipt_pdf(subscription_id: str, current_user: dict = Depends(get_superadmin)):
    """Generate PDF receipt for subscription payment - superadmin only"""
    
    # Get subscription data
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Abonnementsbetaling niet gevonden")
    
    # Get customer data
    customer = await db.users.find_one({"id": subscription["user_id"]}, {"_id": 0})
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # === HEADER ===
    header_data = [
        [
            [Paragraph("Facturatie N.V.", company_style), Paragraph("Verhuurbeheersysteem", small_text)],
            [Paragraph("ABONNEMENT<br/>KWITANTIE", title_style)]
        ]
    ]
    header_table = Table(header_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === RECEIPT DETAILS ===
    receipt_num = subscription["id"][:8].upper()
    issue_date = subscription["created_at"][:10]
    
    details_data = [
        [
            Paragraph("<b>Kwitantie Nr:</b>", normal_text),
            Paragraph(receipt_num, bold_text),
            Paragraph("<b>Datum:</b>", normal_text),
            Paragraph(issue_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 3*cm, 6*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === CUSTOMER INFO ===
    customer_name = customer["name"] if customer else "Onbekend"
    customer_email = customer.get("email", "-") if customer else "-"
    customer_company = customer.get("company_name", "-") if customer else "-"
    
    info_left = [
        [Paragraph("KLANT GEGEVENS", section_header)],
        [Paragraph(f"<b>{customer_name}</b>", normal_text)],
        [Paragraph(f"Email: {customer_email}", small_text)],
        [Paragraph(f"Bedrijf: {customer_company}", small_text)],
    ]
    
    info_right = [
        [Paragraph("ABONNEMENT PERIODE", section_header)],
        [Paragraph(f"<b>{subscription.get('months', 1)} maand(en)</b>", normal_text)],
        [Paragraph(f"Start: {subscription['start_date'][:10]}", small_text)],
        [Paragraph(f"Einde: {subscription['end_date'][:10]}", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === ITEMS TABLE ===
    payment_method_labels = {
        "bank_transfer": "Bankoverschrijving",
        "cash": "Contant",
        "other": "Anders"
    }
    payment_method = payment_method_labels.get(subscription.get("payment_method", ""), subscription.get("payment_method", "-"))
    
    table_header = ['NR', 'OMSCHRIJVING', 'PERIODE', 'METHODE', 'BEDRAG']
    table_data = [
        table_header,
        ['1', f"Abonnement Facturatie N.V.", f"{subscription.get('months', 1)} maand(en)", payment_method, format_currency(subscription["amount"])]
    ]
    
    items_table = Table(table_data, colWidths=[1.5*cm, 6*cm, 3*cm, 3.5*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === TOTALS ===
    totals_data = [
        ['Subtotaal:', format_currency(subscription["amount"])],
        ['BTW (0%):', format_currency(0)],
        ['', ''],
        ['TOTAAL:', format_currency(subscription["amount"])],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 2), 10),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 14),
        ('TEXTCOLOR', (0, 3), (-1, 3), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 2, PRIMARY_GREEN),
    ]))
    
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([('ALIGN', (0, 0), (0, 0), 'RIGHT')]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 20))
    
    # === PAYMENT REFERENCE ===
    if subscription.get("payment_reference"):
        elements.append(Paragraph("Betaalreferentie", section_header))
        elements.append(Paragraph(subscription["payment_reference"], normal_text))
        elements.append(Spacer(1, 10))
    
    if subscription.get("notes"):
        elements.append(Paragraph("Opmerkingen", section_header))
        elements.append(Paragraph(subscription["notes"], small_text))
        elements.append(Spacer(1, 10))
    
    # === FOOTER ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=20, spaceAfter=15))
    
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph("Bedankt voor uw abonnement!", thank_you_style))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Dit document is gegenereerd door Facturatie N.V.", footer_style))
    elements.append(Paragraph("Bewaar deze kwitantie als bewijs van betaling.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    customer_name_safe = customer["name"].replace(" ", "_") if customer else "klant"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=abonnement_kwitantie_{customer_name_safe}_{subscription['id'][:8]}.pdf"
        }
    )

# ==================== USER SUBSCRIPTION ROUTES ====================

# ==================== PROFILE/SETTINGS ROUTES ====================

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None

class LogoUpload(BaseModel):
    logo_data: str  # Base64 encoded image data

@api_router.put("/profile/password")
async def change_own_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change own password"""
    
    # Verify current password
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Huidig wachtwoord is onjuist")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nieuw wachtwoord moet minimaal 6 tekens zijn")
    
    # Update password
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hash_password(password_data.new_password)}}
    )
    
    return {"message": "Wachtwoord succesvol gewijzigd"}

@api_router.put("/profile")
async def update_own_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update own profile (name, email, company_name)"""
    
    update_fields = {}
    
    if profile_data.name:
        update_fields["name"] = profile_data.name
    
    if profile_data.email:
        # Check if email is already in use by another user
        existing = await db.users.find_one(
            {"email": profile_data.email, "id": {"$ne": current_user["id"]}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")
        update_fields["email"] = profile_data.email
    
    if profile_data.company_name is not None:
        update_fields["company_name"] = profile_data.company_name
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Geen gegevens om te wijzigen")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_fields}
    )
    
    # Return updated user
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user

@api_router.get("/profile")
async def get_own_profile(current_user: dict = Depends(get_current_user)):
    """Get own profile"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return user

@api_router.post("/profile/logo")
async def upload_logo(logo_data: LogoUpload, current_user: dict = Depends(get_current_user)):
    """Upload company logo - max 2MB"""
    
    # Check base64 data size (roughly 1.37x the original file size)
    # 2MB = 2 * 1024 * 1024 bytes, base64 adds ~37% overhead
    max_size = 2 * 1024 * 1024 * 1.37
    if len(logo_data.logo_data) > max_size:
        raise HTTPException(status_code=400, detail="Logo is te groot. Maximum 2MB toegestaan.")
    
    # Validate it's a valid base64 image
    if not logo_data.logo_data.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Ongeldig afbeeldingsformaat")
    
    # Store the logo in the user document
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"logo": logo_data.logo_data}}
    )
    
    return {"message": "Logo succesvol geüpload", "logo": logo_data.logo_data}

@api_router.delete("/profile/logo")
async def delete_logo(current_user: dict = Depends(get_current_user)):
    """Delete company logo"""
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$unset": {"logo": ""}}
    )
    
    return {"message": "Logo succesvol verwijderd"}

class RentSettings(BaseModel):
    rent_due_day: int = 1  # Day of month (1-28) - when rent is DUE
    payment_frequency: str = "monthly"  # monthly, weekly, biweekly, quarterly, yearly
    grace_period_days: int = 5  # Days after due date before considered late
    payment_deadline_day: int = 0  # Day of NEXT month by which rent must be paid (0 = same month)
    payment_deadline_month_offset: int = 0  # 0 = same month, 1 = next month

@api_router.put("/profile/rent-settings")
async def update_rent_settings(settings: RentSettings, current_user: dict = Depends(get_current_user)):
    """Update rent/payment settings for customer"""
    
    if settings.rent_due_day < 1 or settings.rent_due_day > 28:
        raise HTTPException(status_code=400, detail="Dag moet tussen 1 en 28 zijn")
    
    if settings.payment_deadline_day < 0 or settings.payment_deadline_day > 28:
        raise HTTPException(status_code=400, detail="Deadline dag moet tussen 0 en 28 zijn")
    
    valid_frequencies = ["monthly", "weekly", "biweekly", "quarterly", "yearly"]
    if settings.payment_frequency not in valid_frequencies:
        raise HTTPException(status_code=400, detail="Ongeldige betalingsfrequentie")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "rent_due_day": settings.rent_due_day,
            "payment_frequency": settings.payment_frequency,
            "grace_period_days": settings.grace_period_days,
            "payment_deadline_day": settings.payment_deadline_day,
            "payment_deadline_month_offset": settings.payment_deadline_month_offset
        }}
    )
    
    return {"message": "Huurinstellingen opgeslagen"}

# ==================== ADMIN: CUSTOMER PROFILE MANAGEMENT ====================

class AdminPasswordReset(BaseModel):
    new_password: str

class AdminCustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None

@api_router.put("/admin/customers/{user_id}/password")
async def admin_reset_customer_password(user_id: str, password_data: AdminPasswordReset, current_user: dict = Depends(get_superadmin)):
    """Reset a customer's password - superadmin only"""
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens zijn")
    
    result = await db.users.update_one(
        {"id": user_id, "role": "customer"},
        {"$set": {"password": hash_password(password_data.new_password)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Wachtwoord succesvol gereset"}

@api_router.put("/admin/customers/{user_id}/profile")
async def admin_update_customer_profile(user_id: str, profile_data: AdminCustomerUpdate, current_user: dict = Depends(get_superadmin)):
    """Update a customer's profile - superadmin only"""
    
    update_fields = {}
    
    if profile_data.name:
        update_fields["name"] = profile_data.name
    
    if profile_data.email:
        # Check if email is already in use
        existing = await db.users.find_one(
            {"email": profile_data.email, "id": {"$ne": user_id}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")
        update_fields["email"] = profile_data.email
    
    if profile_data.company_name is not None:
        update_fields["company_name"] = profile_data.company_name
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Geen gegevens om te wijzigen")
    
    result = await db.users.update_one(
        {"id": user_id, "role": "customer"},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Klantgegevens succesvol bijgewerkt"}

# ==================== CUSTOM DOMAIN ROUTES ====================

class CustomDomainCreate(BaseModel):
    domain: str
    user_id: str

class CustomDomainResponse(BaseModel):
    id: str
    user_id: str
    domain: str
    status: str  # pending, active, error
    verified: bool
    dns_record_type: str
    dns_record_value: str
    created_at: str
    verified_at: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

# Get server IP for DNS configuration
SERVER_IP = "72.62.174.117"  # CloudPanel server IP

@api_router.post("/admin/domains", response_model=CustomDomainResponse)
async def create_custom_domain(domain_data: CustomDomainCreate, current_user: dict = Depends(get_superadmin)):
    """Add a custom domain for a customer - superadmin only"""
    
    # Validate domain format
    domain = domain_data.domain.lower().strip()
    if not domain or "." not in domain:
        raise HTTPException(status_code=400, detail="Ongeldig domeinformaat")
    
    # Remove http/https if present
    domain = domain.replace("http://", "").replace("https://", "").replace("www.", "").rstrip("/")
    
    # Check if domain already exists
    existing = await db.custom_domains.find_one({"domain": domain}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
    
    # Check if customer exists
    customer = await db.users.find_one({"id": domain_data.user_id, "role": "customer"}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    domain_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    domain_doc = {
        "id": domain_id,
        "user_id": domain_data.user_id,
        "domain": domain,
        "status": "pending",
        "verified": False,
        "dns_record_type": "A",
        "dns_record_value": SERVER_IP,
        "created_at": now.isoformat(),
        "verified_at": None
    }
    
    await db.custom_domains.insert_one(domain_doc)
    
    return CustomDomainResponse(
        **domain_doc,
        user_name=customer["name"],
        user_email=customer["email"]
    )

@api_router.get("/admin/domains", response_model=List[CustomDomainResponse])
async def get_all_custom_domains(current_user: dict = Depends(get_superadmin)):
    """Get all custom domains - superadmin only"""
    
    domains = await db.custom_domains.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Batch fetch user info
    user_ids = list(set(d["user_id"] for d in domains))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    user_map = {u["id"]: {"name": u["name"], "email": u["email"]} for u in users}
    
    result = []
    for domain in domains:
        user_info = user_map.get(domain["user_id"], {})
        result.append(CustomDomainResponse(
            **domain,
            user_name=user_info.get("name"),
            user_email=user_info.get("email")
        ))
    
    return result

@api_router.put("/admin/domains/{domain_id}/verify")
async def verify_custom_domain(domain_id: str, current_user: dict = Depends(get_superadmin)):
    """Mark a custom domain as verified - superadmin only"""
    
    now = datetime.now(timezone.utc)
    
    result = await db.custom_domains.update_one(
        {"id": domain_id},
        {"$set": {
            "status": "active",
            "verified": True,
            "verified_at": now.isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Domein niet gevonden")
    
    return {"message": "Domein geverifieerd en geactiveerd"}

@api_router.delete("/admin/domains/{domain_id}")
async def delete_custom_domain(domain_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a custom domain - superadmin only"""
    
    result = await db.custom_domains.delete_one({"id": domain_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domein niet gevonden")
    
    return {"message": "Domein verwijderd"}

@api_router.get("/admin/domains/customer/{user_id}", response_model=List[CustomDomainResponse])
async def get_customer_domains(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Get custom domains for a specific customer - superadmin only"""
    
    domains = await db.custom_domains.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    customer = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    
    result = []
    for domain in domains:
        result.append(CustomDomainResponse(
            **domain,
            user_name=customer["name"] if customer else None,
            user_email=customer["email"] if customer else None
        ))
    
    return result

# ==================== USER SUBSCRIPTION ROUTES ====================

@api_router.get("/subscription/status")
async def get_subscription_status_api(current_user: dict = Depends(get_current_user)):
    """Get current user's subscription status"""
    
    status, end_date, is_trial = get_subscription_status(current_user)
    
    # Calculate days remaining
    days_remaining = 0
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            days_remaining = max(0, (end_dt - datetime.now(timezone.utc)).days)
        except:
            pass
    
    # Get subscription history
    history = []
    if current_user.get("role") != "superadmin":
        subs = await db.subscriptions.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        history = subs
    
    return {
        "status": status,
        "is_trial": is_trial,
        "end_date": end_date,
        "days_remaining": days_remaining,
        "price_per_month": SUBSCRIPTION_PRICE_SRD,
        "history": history
    }

@api_router.post("/subscription/request")
async def request_subscription(current_user: dict = Depends(get_current_user)):
    """Request subscription activation (for bank transfer payment)"""
    
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen abonnement nodig")
    
    # Create a pending subscription request
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    request_doc = {
        "id": request_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_email": current_user["email"],
        "amount": SUBSCRIPTION_PRICE_SRD,
        "status": "pending",
        "created_at": now.isoformat()
    }
    
    await db.subscription_requests.insert_one(request_doc)
    
    return {
        "message": "Abonnementsverzoek verzonden. Maak de betaling over naar het opgegeven rekeningnummer en neem contact op met de beheerder.",
        "request_id": request_id,
        "amount": SUBSCRIPTION_PRICE_SRD,
        "bank_info": {
            "bank": "Hakrinbank",
            "rekening": "205911044",
            "naam": "Facturatie N.V.",
            "omschrijving": "+5978934982"
        }
    }

@api_router.get("/admin/subscription-requests")
async def get_subscription_requests(current_user: dict = Depends(get_superadmin)):
    """Get pending subscription requests - superadmin only"""
    
    requests = await db.subscription_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests

# ==================== CRON JOB ENDPOINTS ====================

CRON_SECRET = os.environ.get('CRON_SECRET', 'facturatie-cron-secret-2026')

@api_router.get("/cron/run")
async def run_cron_jobs(secret: str = None):
    """Run all cron jobs - called every minute"""
    
    # Simple security check
    if secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "jobs": {}
    }
    
    # Job 1: Check and update subscription statuses
    try:
        expired_count = await check_expired_subscriptions()
        results["jobs"]["subscription_check"] = {
            "status": "success",
            "expired_count": expired_count
        }
    except Exception as e:
        logger.error(f"Cron job subscription_check failed: {e}")
        results["jobs"]["subscription_check"] = {"status": "error", "message": str(e)}
    
    # Job 2: Send subscription reminders (3 days before expiry)
    try:
        reminders_sent = await send_subscription_reminders()
        results["jobs"]["reminders"] = {
            "status": "success",
            "reminders_sent": reminders_sent
        }
    except Exception as e:
        logger.error(f"Cron job reminders failed: {e}")
        results["jobs"]["reminders"] = {"status": "error", "message": str(e)}
    
    # Job 3: Clean old data (runs once per day at midnight)
    current_hour = datetime.now(timezone.utc).hour
    current_minute = datetime.now(timezone.utc).minute
    if current_hour == 0 and current_minute == 0:
        try:
            cleaned = await cleanup_old_data()
            results["jobs"]["cleanup"] = {
                "status": "success",
                "cleaned": cleaned
            }
        except Exception as e:
            logger.error(f"Cron job cleanup failed: {e}")
            results["jobs"]["cleanup"] = {"status": "error", "message": str(e)}
    
    return results

async def check_expired_subscriptions():
    """Check and mark expired subscriptions"""
    now = datetime.now(timezone.utc)
    expired_count = 0
    
    # Find all customers with expired subscriptions that haven't been marked
    customers = await db.users.find({
        "role": "customer",
        "is_free": {"$ne": True}  # Don't touch free accounts
    }, {"_id": 0}).to_list(1000)
    
    for customer in customers:
        if customer.get("subscription_end_date"):
            try:
                end_date = datetime.fromisoformat(customer["subscription_end_date"].replace('Z', '+00:00'))
                if end_date < now:
                    # Mark as expired in notifications collection
                    existing_notification = await db.notifications.find_one({
                        "user_id": customer["id"],
                        "type": "subscription_expired",
                        "created_at": {"$gte": (now - timedelta(days=1)).isoformat()}
                    })
                    
                    if not existing_notification:
                        await db.notifications.insert_one({
                            "id": str(uuid.uuid4()),
                            "user_id": customer["id"],
                            "type": "subscription_expired",
                            "message": f"Abonnement van {customer['name']} is verlopen",
                            "email": customer["email"],
                            "read": False,
                            "created_at": now.isoformat()
                        })
                        expired_count += 1
            except Exception as e:
                logger.error(f"Error checking subscription for {customer.get('email')}: {e}")
    
    return expired_count

async def send_subscription_reminders():
    """Send reminders for subscriptions expiring in 3 days"""
    now = datetime.now(timezone.utc)
    reminder_date = now + timedelta(days=3)
    reminders_sent = 0
    
    customers = await db.users.find({
        "role": "customer",
        "is_free": {"$ne": True}
    }, {"_id": 0}).to_list(1000)
    
    for customer in customers:
        if customer.get("subscription_end_date"):
            try:
                end_date = datetime.fromisoformat(customer["subscription_end_date"].replace('Z', '+00:00'))
                
                # Check if expiring within 3 days
                days_until_expiry = (end_date - now).days
                
                if 0 < days_until_expiry <= 3:
                    # Check if reminder already sent today
                    existing_reminder = await db.notifications.find_one({
                        "user_id": customer["id"],
                        "type": "subscription_reminder",
                        "created_at": {"$gte": (now - timedelta(hours=24)).isoformat()}
                    })
                    
                    if not existing_reminder:
                        await db.notifications.insert_one({
                            "id": str(uuid.uuid4()),
                            "user_id": customer["id"],
                            "type": "subscription_reminder",
                            "message": f"Abonnement van {customer['name']} verloopt over {days_until_expiry} dag(en)",
                            "email": customer["email"],
                            "days_remaining": days_until_expiry,
                            "read": False,
                            "created_at": now.isoformat()
                        })
                        reminders_sent += 1
            except Exception as e:
                logger.error(f"Error sending reminder for {customer.get('email')}: {e}")
    
    return reminders_sent

async def cleanup_old_data():
    """Clean up old data (notifications older than 30 days, old logs)"""
    now = datetime.now(timezone.utc)
    cleanup_date = (now - timedelta(days=30)).isoformat()
    cleaned = {}
    
    # Delete old notifications
    result = await db.notifications.delete_many({
        "created_at": {"$lt": cleanup_date}
    })
    cleaned["notifications"] = result.deleted_count
    
    # Delete old subscription requests that are completed
    result = await db.subscription_requests.delete_many({
        "status": {"$in": ["approved", "rejected"]},
        "created_at": {"$lt": cleanup_date}
    })
    cleaned["subscription_requests"] = result.deleted_count
    
    return cleaned

# Endpoint to get notifications for superadmin
@api_router.get("/admin/notifications")
async def get_admin_notifications(current_user: dict = Depends(get_superadmin)):
    """Get all notifications for superadmin"""
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return notifications

@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_superadmin)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notificatie gelezen"}

@api_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a notification"""
    await db.notifications.delete_one({"id": notification_id})
    return {"message": "Notificatie verwijderd"}
    
    return requests

# ============================================
# CMS - COMPLETE WEBSITE BUILDER
# ============================================

# --- CMS PAGES ---

@api_router.get("/cms/pages")
async def get_cms_pages(current_user: dict = Depends(get_superadmin)):
    """Get all CMS pages (admin)"""
    pages = await db.cms_pages.find({}, {"_id": 0}).sort("menu_order", 1).to_list(100)
    return pages

@api_router.get("/cms/pages/{page_id}")
async def get_cms_page(page_id: str, current_user: dict = Depends(get_superadmin)):
    """Get a specific CMS page (admin)"""
    page = await db.cms_pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    return page

@api_router.post("/cms/pages")
async def create_cms_page(page: CMSPage, current_user: dict = Depends(get_superadmin)):
    """Create a new CMS page"""
    # Check slug uniqueness
    existing = await db.cms_pages.find_one({"slug": page.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Deze URL slug bestaat al")
    
    page_dict = page.dict()
    page_dict["id"] = str(uuid.uuid4())
    page_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    page_dict["updated_at"] = page_dict["created_at"]
    
    # Add IDs to sections
    for section in page_dict.get("sections", []):
        if not section.get("id"):
            section["id"] = str(uuid.uuid4())
    
    await db.cms_pages.insert_one(page_dict)
    
    # Update menu if show_in_menu
    if page.show_in_menu:
        await update_main_menu()
    
    return {**page_dict, "_id": None}

@api_router.put("/cms/pages/{page_id}")
async def update_cms_page(page_id: str, page: CMSPage, current_user: dict = Depends(get_superadmin)):
    """Update a CMS page"""
    existing = await db.cms_pages.find_one({"id": page_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    
    # Check slug uniqueness if changed
    if page.slug != existing.get("slug"):
        slug_exists = await db.cms_pages.find_one({"slug": page.slug, "id": {"$ne": page_id}})
        if slug_exists:
            raise HTTPException(status_code=400, detail="Deze URL slug bestaat al")
    
    page_dict = page.dict()
    page_dict["id"] = page_id
    page_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    page_dict["created_at"] = existing.get("created_at")
    
    # Add IDs to new sections
    for section in page_dict.get("sections", []):
        if not section.get("id"):
            section["id"] = str(uuid.uuid4())
    
    await db.cms_pages.update_one({"id": page_id}, {"$set": page_dict})
    
    # Update menu
    await update_main_menu()
    
    return {**page_dict, "_id": None}

@api_router.delete("/cms/pages/{page_id}")
async def delete_cms_page(page_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a CMS page"""
    page = await db.cms_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    
    # Don't allow deleting home page
    if page.get("slug") == "home":
        raise HTTPException(status_code=400, detail="De homepage kan niet worden verwijderd")
    
    await db.cms_pages.delete_one({"id": page_id})
    
    # Update menu
    await update_main_menu()
    
    return {"message": "Pagina verwijderd"}

@api_router.put("/cms/pages/{page_id}/sections/reorder")
async def reorder_page_sections(page_id: str, section_ids: List[str], current_user: dict = Depends(get_superadmin)):
    """Reorder sections within a page"""
    page = await db.cms_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    
    sections = page.get("sections", [])
    section_map = {s["id"]: s for s in sections}
    
    reordered = []
    for i, sid in enumerate(section_ids):
        if sid in section_map:
            section_map[sid]["order"] = i
            reordered.append(section_map[sid])
    
    await db.cms_pages.update_one({"id": page_id}, {"$set": {"sections": reordered}})
    return {"message": "Secties herschikt"}

# --- CMS MENU ---

@api_router.get("/cms/menu")
async def get_cms_menu(current_user: dict = Depends(get_superadmin)):
    """Get main menu (admin)"""
    menu = await db.cms_menus.find_one({"name": "main"}, {"_id": 0})
    if not menu:
        # Create default menu
        menu = {"id": str(uuid.uuid4()), "name": "main", "items": []}
        await db.cms_menus.insert_one({**menu})
    return menu

@api_router.put("/cms/menu")
async def update_cms_menu(menu: CMSMenu, current_user: dict = Depends(get_superadmin)):
    """Update main menu"""
    menu_dict = menu.dict()
    menu_dict["name"] = "main"
    
    # Add IDs to items
    for item in menu_dict.get("items", []):
        if not item.get("id"):
            item["id"] = str(uuid.uuid4())
    
    await db.cms_menus.update_one(
        {"name": "main"},
        {"$set": menu_dict},
        upsert=True
    )
    return menu_dict

async def update_main_menu():
    """Auto-update main menu based on published pages"""
    pages = await db.cms_pages.find(
        {"is_published": True, "show_in_menu": True},
        {"_id": 0}
    ).sort("menu_order", 1).to_list(100)
    
    items = []
    for page in pages:
        items.append({
            "id": str(uuid.uuid4()),
            "label": page.get("menu_label") or page.get("title"),
            "link": f"/{page.get('slug')}" if page.get("slug") != "home" else "/",
            "page_id": page.get("id"),
            "is_external": False,
            "open_in_new_tab": False,
            "parent_id": page.get("parent_page_id"),
            "order": page.get("menu_order", 0),
            "is_visible": True
        })
    
    await db.cms_menus.update_one(
        {"name": "main"},
        {"$set": {"items": items}},
        upsert=True
    )

# --- CMS FOOTER ---

@api_router.get("/cms/footer")
async def get_cms_footer(current_user: dict = Depends(get_superadmin)):
    """Get footer configuration (admin)"""
    footer = await db.cms_footer.find_one({}, {"_id": 0})
    if not footer:
        # Create default footer
        footer = {
            "id": str(uuid.uuid4()),
            "columns": [
                {
                    "title": "Over Ons",
                    "links": [
                        {"label": "Over Facturatie", "url": "/over-ons"},
                        {"label": "Contact", "url": "/contact"}
                    ]
                },
                {
                    "title": "Diensten",
                    "links": [
                        {"label": "Prijzen", "url": "/prijzen"},
                        {"label": "Modules", "url": "/prijzen"}
                    ]
                },
                {
                    "title": "Legal",
                    "links": [
                        {"label": "Privacy Policy", "url": "/privacy"},
                        {"label": "Algemene Voorwaarden", "url": "/voorwaarden"}
                    ]
                }
            ],
            "copyright_text": f"© {datetime.now().year} Facturatie N.V. Alle rechten voorbehouden.",
            "show_social_links": True,
            "show_newsletter": False,
            "background_color": "#1f2937",
            "text_color": "#ffffff"
        }
        await db.cms_footer.insert_one({**footer})
    return footer

@api_router.put("/cms/footer")
async def update_cms_footer(footer: CMSFooter, current_user: dict = Depends(get_superadmin)):
    """Update footer configuration"""
    footer_dict = footer.dict()
    footer_dict["id"] = str(uuid.uuid4())
    
    await db.cms_footer.update_one(
        {},
        {"$set": footer_dict},
        upsert=True
    )
    return footer_dict

# --- CMS TEMPLATES ---

@api_router.get("/cms/templates")
async def get_cms_templates(current_user: dict = Depends(get_superadmin)):
    """Get available page templates"""
    templates = [
        {
            "id": "blank",
            "name": "Lege Pagina",
            "description": "Start met een lege pagina",
            "preview_image": None,
            "category": "basic",
            "sections": []
        },
        {
            "id": "landing",
            "name": "Landing Page",
            "description": "Perfect voor een homepage met hero, features en CTA",
            "preview_image": None,
            "category": "landing",
            "sections": [
                {"type": "hero", "title": "Welkom", "subtitle": "Uw ondertitel hier", "layout": "center"},
                {"type": "features", "title": "Onze Features", "items": []},
                {"type": "cta", "title": "Klaar om te beginnen?", "button_text": "Contact"}
            ]
        },
        {
            "id": "about",
            "name": "Over Ons",
            "description": "Vertel uw verhaal met tekst en afbeeldingen",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Over Ons", "layout": "center"},
                {"type": "image_text", "title": "Ons Verhaal", "layout": "image-left"},
                {"type": "text", "title": "Onze Missie", "layout": "center"}
            ]
        },
        {
            "id": "services",
            "name": "Diensten",
            "description": "Toon uw diensten met kaarten",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Onze Diensten", "layout": "center"},
                {"type": "features", "title": "", "items": [], "layout": "grid-3"}
            ]
        },
        {
            "id": "pricing",
            "name": "Prijzen",
            "description": "Prijstabellen en vergelijkingen",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Prijzen", "subtitle": "Kies het plan dat bij u past"},
                {"type": "pricing", "title": "", "items": []}
            ]
        },
        {
            "id": "contact",
            "name": "Contact",
            "description": "Contactformulier en bedrijfsinfo",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Contact", "layout": "center"},
                {"type": "contact", "title": "Neem contact op"}
            ]
        },
        {
            "id": "gallery",
            "name": "Galerij",
            "description": "Afbeeldingen galerij met lightbox",
            "preview_image": None,
            "category": "portfolio",
            "sections": [
                {"type": "hero", "title": "Galerij", "layout": "center"},
                {"type": "gallery", "title": "", "items": []}
            ]
        },
        {
            "id": "faq",
            "name": "FAQ",
            "description": "Veelgestelde vragen met accordion",
            "preview_image": None,
            "category": "support",
            "sections": [
                {"type": "hero", "title": "Veelgestelde Vragen", "layout": "center"},
                {"type": "faq", "title": "", "items": []}
            ]
        }
    ]
    return templates

@api_router.post("/cms/pages/from-template/{template_id}")
async def create_page_from_template(template_id: str, page_data: dict, current_user: dict = Depends(get_superadmin)):
    """Create a new page from a template"""
    templates = await get_cms_templates(current_user)
    template = next((t for t in templates if t["id"] == template_id), None)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template niet gevonden")
    
    # Create page with template sections
    page = CMSPage(
        title=page_data.get("title", template["name"]),
        slug=page_data.get("slug", template_id + "-" + str(uuid.uuid4())[:8]),
        template=template_id,
        sections=[CMSPageSection(**s) for s in template["sections"]],
        is_published=page_data.get("is_published", False),
        show_in_menu=page_data.get("show_in_menu", True),
        menu_order=page_data.get("menu_order", 99)
    )
    
    return await create_cms_page(page, current_user)

# --- PUBLIC CMS ROUTES ---

@api_router.get("/public/cms/page/{slug}")
async def get_public_cms_page(slug: str):
    """Get a published CMS page by slug (public)"""
    page = await db.cms_pages.find_one(
        {"slug": slug, "is_published": True},
        {"_id": 0}
    )
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    return page

@api_router.get("/public/cms/menu")
async def get_public_menu():
    """Get public navigation menu"""
    menu = await db.cms_menus.find_one({"name": "main"}, {"_id": 0})
    if not menu:
        # Build from pages
        pages = await db.cms_pages.find(
            {"is_published": True, "show_in_menu": True},
            {"_id": 0, "id": 1, "title": 1, "slug": 1, "menu_label": 1, "menu_order": 1, "parent_page_id": 1}
        ).sort("menu_order", 1).to_list(100)
        
        items = []
        for page in pages:
            items.append({
                "id": page.get("id"),
                "label": page.get("menu_label") or page.get("title"),
                "link": f"/{page.get('slug')}" if page.get("slug") != "home" else "/",
                "page_id": page.get("id"),
                "parent_id": page.get("parent_page_id"),
                "order": page.get("menu_order", 0)
            })
        
        return {"name": "main", "items": items}
    
    # Filter only visible items
    menu["items"] = [i for i in menu.get("items", []) if i.get("is_visible", True)]
    return menu

@api_router.get("/public/cms/footer")
async def get_public_footer():
    """Get public footer configuration"""
    footer = await db.cms_footer.find_one({}, {"_id": 0})
    if not footer:
        return {
            "columns": [],
            "copyright_text": f"© {datetime.now().year} Facturatie N.V.",
            "show_social_links": True,
            "background_color": "#1f2937",
            "text_color": "#ffffff"
        }
    return footer

@api_router.get("/public/cms/pages")
async def get_public_pages():
    """Get all published pages (for sitemap, etc.)"""
    pages = await db.cms_pages.find(
        {"is_published": True},
        {"_id": 0, "id": 1, "title": 1, "slug": 1, "description": 1, "template": 1}
    ).sort("menu_order", 1).to_list(100)
    return pages

# --- CMS IMAGE UPLOAD ---

@api_router.post("/cms/upload-image")
async def upload_cms_image(file: UploadFile = File(...), current_user: dict = Depends(get_superadmin)):
    """Upload an image for CMS"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Alleen afbeeldingen zijn toegestaan")
    
    # Read and convert to base64
    contents = await file.read()
    
    # Check file size (max 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Afbeelding mag maximaal 5MB zijn")
    
    base64_image = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    return {"url": data_url, "filename": file.filename}

# ============================================
# HRM MODULE - Human Resource Management
# ============================================

class HRMEmployee(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    hire_date: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    status: Optional[str] = "active"  # active, inactive, on_leave
    notes: Optional[str] = None

class HRMLeaveRequest(BaseModel):
    employee_id: str
    leave_type: str  # vacation, sick, personal, maternity, paternity, unpaid
    start_date: str
    end_date: str
    reason: Optional[str] = None
    status: Optional[str] = "pending"  # pending, approved, rejected

class HRMDepartment(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[str] = None

# --- HRM EMPLOYEES ---

@api_router.get("/hrm/employees")
async def get_hrm_employees(current_user: dict = Depends(get_current_user)):
    """Get all employees for the user's company"""
    employees = await db.hrm_employees.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return employees

@api_router.get("/hrm/employees/{employee_id}")
async def get_hrm_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific employee"""
    employee = await db.hrm_employees.find_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return employee

@api_router.post("/hrm/employees")
async def create_hrm_employee(employee: HRMEmployee, current_user: dict = Depends(get_current_user)):
    """Create a new employee"""
    # Check addon access
    has_hrm = await db.customer_addons.find_one({
        "user_id": current_user["id"],
        "addon_id": {"$in": ["hrm", "HRM"]}
    })
    if not has_hrm and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="HRM module niet geactiveerd")
    
    employee_dict = employee.dict()
    employee_dict["id"] = str(uuid.uuid4())
    employee_dict["user_id"] = current_user["id"]
    employee_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    employee_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    employee_dict["leave_balance"] = {
        "vacation": 20,  # Standard Suriname vacation days
        "sick": 10,
        "personal": 3
    }
    
    await db.hrm_employees.insert_one(employee_dict)
    del employee_dict["_id"] if "_id" in employee_dict else None
    return employee_dict

@api_router.put("/hrm/employees/{employee_id}")
async def update_hrm_employee(employee_id: str, employee: HRMEmployee, current_user: dict = Depends(get_current_user)):
    """Update an employee"""
    existing = await db.hrm_employees.find_one({"id": employee_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    employee_dict = employee.dict()
    employee_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_employees.update_one(
        {"id": employee_id},
        {"$set": employee_dict}
    )
    
    updated = await db.hrm_employees.find_one({"id": employee_id}, {"_id": 0})
    return updated

@api_router.delete("/hrm/employees/{employee_id}")
async def delete_hrm_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an employee"""
    result = await db.hrm_employees.delete_one({"id": employee_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

# --- HRM DEPARTMENTS ---

@api_router.get("/hrm/departments")
async def get_hrm_departments(current_user: dict = Depends(get_current_user)):
    """Get all departments"""
    departments = await db.hrm_departments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    return departments

@api_router.post("/hrm/departments")
async def create_hrm_department(department: HRMDepartment, current_user: dict = Depends(get_current_user)):
    """Create a new department"""
    dept_dict = department.dict()
    dept_dict["id"] = str(uuid.uuid4())
    dept_dict["user_id"] = current_user["id"]
    dept_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_departments.insert_one(dept_dict)
    return {k: v for k, v in dept_dict.items() if k != "_id"}

@api_router.delete("/hrm/departments/{dept_id}")
async def delete_hrm_department(dept_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a department"""
    result = await db.hrm_departments.delete_one({"id": dept_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Afdeling niet gevonden")
    return {"message": "Afdeling verwijderd"}

# --- HRM LEAVE REQUESTS ---

@api_router.get("/hrm/leave-requests")
async def get_hrm_leave_requests(current_user: dict = Depends(get_current_user)):
    """Get all leave requests"""
    requests = await db.hrm_leave_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Enrich with employee names
    for req in requests:
        employee = await db.hrm_employees.find_one({"id": req.get("employee_id")}, {"name": 1})
        req["employee_name"] = employee.get("name") if employee else "Onbekend"
    
    return requests

@api_router.post("/hrm/leave-requests")
async def create_hrm_leave_request(request: HRMLeaveRequest, current_user: dict = Depends(get_current_user)):
    """Create a new leave request"""
    # Validate employee exists
    employee = await db.hrm_employees.find_one({
        "id": request.employee_id, 
        "user_id": current_user["id"]
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    req_dict = request.dict()
    req_dict["id"] = str(uuid.uuid4())
    req_dict["user_id"] = current_user["id"]
    req_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    req_dict["employee_name"] = employee.get("name")
    
    # Calculate days
    try:
        start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
        req_dict["days"] = (end - start).days + 1
    except:
        req_dict["days"] = 1
    
    await db.hrm_leave_requests.insert_one(req_dict)
    return {k: v for k, v in req_dict.items() if k != "_id"}

@api_router.put("/hrm/leave-requests/{request_id}")
async def update_hrm_leave_request(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Approve or reject a leave request"""
    if status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Ongeldige status")
    
    request = await db.hrm_leave_requests.find_one({
        "id": request_id,
        "user_id": current_user["id"]
    })
    if not request:
        raise HTTPException(status_code=404, detail="Verlofaanvraag niet gevonden")
    
    # Update leave balance if approved
    if status == "approved" and request.get("status") != "approved":
        leave_type = request.get("leave_type", "vacation")
        days = request.get("days", 1)
        
        await db.hrm_employees.update_one(
            {"id": request.get("employee_id")},
            {"$inc": {f"leave_balance.{leave_type}": -days}}
        )
    
    await db.hrm_leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.hrm_leave_requests.find_one({"id": request_id}, {"_id": 0})
    return updated

@api_router.delete("/hrm/leave-requests/{request_id}")
async def delete_hrm_leave_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a leave request"""
    result = await db.hrm_leave_requests.delete_one({
        "id": request_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verlofaanvraag niet gevonden")
    return {"message": "Verlofaanvraag verwijderd"}

# --- HRM DASHBOARD STATS ---

@api_router.get("/hrm/stats")
async def get_hrm_stats(current_user: dict = Depends(get_current_user)):
    """Get HRM dashboard statistics"""
    user_id = current_user["id"]
    
    total_employees = await db.hrm_employees.count_documents({"user_id": user_id})
    active_employees = await db.hrm_employees.count_documents({"user_id": user_id, "status": "active"})
    on_leave = await db.hrm_employees.count_documents({"user_id": user_id, "status": "on_leave"})
    
    pending_requests = await db.hrm_leave_requests.count_documents({
        "user_id": user_id,
        "status": "pending"
    })
    
    departments = await db.hrm_departments.count_documents({"user_id": user_id})
    
    # Calculate total salary
    salary_pipeline = [
        {"$match": {"user_id": user_id, "status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$salary"}}}
    ]
    salary_result = await db.hrm_employees.aggregate(salary_pipeline).to_list(1)
    total_salary = salary_result[0]["total"] if salary_result else 0
    
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "on_leave": on_leave,
        "pending_leave_requests": pending_requests,
        "departments": departments,
        "total_monthly_salary": total_salary
    }

# ============================================
# AI CHAT ASSISTANT
# ============================================

class AIChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class AIActionResult(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# AI System functions to execute commands
async def ai_get_dashboard_stats(user_id: str):
    """Get dashboard statistics"""
    tenants = await db.tenants.count_documents({"user_id": user_id})
    apartments = await db.apartments.count_documents({"user_id": user_id})
    
    # Get payments this month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    payments_pipeline = [
        {"$match": {"user_id": user_id, "created_at": {"$gte": start_of_month.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    payments_result = await db.payments.aggregate(payments_pipeline).to_list(1)
    monthly_income = payments_result[0]["total"] if payments_result else 0
    
    # Outstanding balance
    outstanding_pipeline = [
        {"$match": {"user_id": user_id, "balance": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]
    # This is simplified - actual implementation would calculate from payments
    
    return {
        "total_tenants": tenants,
        "total_apartments": apartments,
        "monthly_income": monthly_income,
        "currency": "SRD"
    }

async def ai_list_tenants(user_id: str):
    """List all tenants"""
    tenants = await db.tenants.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return tenants

async def ai_create_tenant(user_id: str, name: str, phone: str, email: str = None, address: str = None, id_number: str = None):
    """Create a new tenant with validation"""
    # Validate required fields
    if not name or not isinstance(name, str) or len(name.strip()) < 2:
        return {"error": "Naam is verplicht en moet minimaal 2 tekens zijn"}
    if not phone or not isinstance(phone, str) or len(phone.strip()) < 5:
        return {"error": "Telefoonnummer is verplicht en moet minimaal 5 tekens zijn"}
    
    tenant = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name.strip(),
        "phone": phone.strip(),
        "email": email.strip() if email else None,
        "address": address.strip() if address else None,
        "id_number": id_number.strip() if id_number else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(tenant)
    return {"success": True, "tenant_id": tenant["id"], "name": name}

async def ai_list_apartments(user_id: str):
    """List all apartments"""
    apartments = await db.apartments.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return apartments

async def ai_create_apartment(user_id: str, name: str, address: str, rent_amount: float, description: str = None):
    """Create a new apartment with validation"""
    # Validate required fields
    if not name or not isinstance(name, str) or len(name.strip()) < 2:
        return {"error": "Appartement naam is verplicht en moet minimaal 2 tekens zijn"}
    
    try:
        rent = float(rent_amount) if rent_amount else 0
        if rent <= 0:
            return {"error": "Huurbedrag moet groter zijn dan 0"}
    except (ValueError, TypeError):
        return {"error": "Ongeldig huurbedrag"}
    
    apartment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name.strip(),
        "address": (address or "").strip(),
        "rent_amount": rent,
        "description": (description or "").strip() if description else None,
        "status": "available",
        "tenant_id": None,
        "bedrooms": 1,
        "bathrooms": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.apartments.insert_one(apartment)
    return {"success": True, "apartment_id": apartment["id"], "name": name}

async def ai_get_tenant_balance(user_id: str, tenant_name: str):
    """Get balance for a specific tenant by name"""
    tenant = await db.tenants.find_one({"user_id": user_id, "name": {"$regex": tenant_name, "$options": "i"}})
    if not tenant:
        return {"error": f"Huurder '{tenant_name}' niet gevonden"}
    
    apartment = await db.apartments.find_one({"user_id": user_id, "tenant_id": tenant["id"]})
    if not apartment:
        return {"tenant": tenant["name"], "message": "Geen appartement toegewezen"}
    
    # Calculate balance
    payments = await db.payments.find({
        "user_id": user_id,
        "tenant_id": tenant["id"],
        "payment_type": "rent"
    }).to_list(1000)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    return {
        "tenant": tenant["name"],
        "apartment": apartment["name"],
        "rent_amount": apartment["rent_amount"],
        "total_paid": total_paid
    }

async def ai_register_payment(user_id: str, tenant_name: str, amount: float, payment_type: str = "rent", description: str = None):
    """Register a payment for a tenant with validation"""
    # Validate tenant name
    if not tenant_name or not isinstance(tenant_name, str) or len(tenant_name.strip()) < 2:
        return {"error": "Huurder naam is verplicht"}
    
    # Validate amount
    try:
        payment_amount = float(amount) if amount else 0
        if payment_amount <= 0:
            return {"error": "Betaling bedrag moet groter zijn dan 0"}
    except (ValueError, TypeError):
        return {"error": "Ongeldig betalingsbedrag"}
    
    tenant = await db.tenants.find_one({"user_id": user_id, "name": {"$regex": tenant_name.strip(), "$options": "i"}})
    if not tenant:
        return {"error": f"Huurder '{tenant_name}' niet gevonden"}
    
    apartment = await db.apartments.find_one({"user_id": user_id, "tenant_id": tenant["id"]})
    
    now = datetime.now(timezone.utc)
    payment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tenant_id": tenant["id"],
        "apartment_id": apartment["id"] if apartment else None,
        "amount": payment_amount,
        "payment_type": payment_type or "rent",
        "payment_date": now.strftime("%Y-%m-%d"),
        "period_month": now.month,
        "period_year": now.year,
        "description": (description or f"Betaling van {tenant['name']}").strip(),
        "created_at": now.isoformat()
    }
    await db.payments.insert_one(payment)
    return {"success": True, "payment_id": payment["id"], "amount": payment_amount, "tenant": tenant["name"]}

async def ai_list_payments(user_id: str, limit: int = 10):
    """List recent payments"""
    payments = await db.payments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add tenant names
    for payment in payments:
        tenant = await db.tenants.find_one({"id": payment.get("tenant_id")})
        payment["tenant_name"] = tenant["name"] if tenant else "Onbekend"
    
    return payments

async def ai_list_loans(user_id: str):
    """List all loans"""
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for loan in loans:
        tenant = await db.tenants.find_one({"id": loan.get("tenant_id")})
        loan["tenant_name"] = tenant["name"] if tenant else "Onbekend"
    return loans

async def ai_create_loan(user_id: str, tenant_name: str, amount: float, description: str = None):
    """Create a loan for a tenant with validation"""
    # Validate tenant name
    if not tenant_name or not isinstance(tenant_name, str) or len(tenant_name.strip()) < 2:
        return {"error": "Huurder naam is verplicht"}
    
    # Validate amount
    try:
        loan_amount = float(amount) if amount else 0
        if loan_amount <= 0:
            return {"error": "Lening bedrag moet groter zijn dan 0"}
    except (ValueError, TypeError):
        return {"error": "Ongeldig leningsbedrag"}
    
    tenant = await db.tenants.find_one({"user_id": user_id, "name": {"$regex": tenant_name.strip(), "$options": "i"}})
    if not tenant:
        return {"error": f"Huurder '{tenant_name}' niet gevonden"}
    
    now = datetime.now(timezone.utc)
    loan = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tenant_id": tenant["id"],
        "amount": loan_amount,
        "remaining_amount": loan_amount,
        "description": (description or f"Lening aan {tenant['name']}").strip(),
        "status": "open",
        "loan_date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat()
    }
    await db.loans.insert_one(loan)
    return {"success": True, "loan_id": loan["id"], "amount": loan_amount, "tenant": tenant["name"]}

async def ai_get_kasgeld(user_id: str):
    """Get kasgeld (petty cash) balance"""
    kasgeld = await db.kasgeld.find_one({"user_id": user_id})
    if not kasgeld:
        return {"balance": 0, "transactions": []}
    
    transactions = await db.kasgeld_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {"balance": kasgeld.get("balance", 0), "recent_transactions": transactions}

# Main AI processing function
async def process_ai_command(user_id: str, message: str, session_id: str):
    """Process user message with AI and execute commands"""
    
    # Get current data context
    stats = await ai_get_dashboard_stats(user_id)
    tenants = await ai_list_tenants(user_id)
    apartments = await ai_list_apartments(user_id)
    
    tenant_list = ", ".join([t["name"] for t in tenants[:10]]) if tenants else "Geen huurders"
    apartment_list = ", ".join([f"{a['name']} (SRD {a['rent_amount']})" for a in apartments[:10]]) if apartments else "Geen appartementen"
    
    system_prompt = f"""Je bent de AI assistent van Facturatie N.V., een verhuurbeheersysteem in Suriname.
Je helpt de gebruiker met het beheren van hun verhuuradministratie.

HUIDIGE SYSTEEM DATA:
- Totaal huurders: {stats['total_tenants']}
- Totaal appartementen: {stats['total_apartments']}
- Maandinkomen: SRD {stats['monthly_income']:,.2f}
- Huurders: {tenant_list}
- Appartementen: {apartment_list}

JE KUNT DE VOLGENDE ACTIES UITVOEREN:
1. HUURDER_TOEVOEGEN: Nieuwe huurder aanmaken
2. APPARTEMENT_TOEVOEGEN: Nieuw appartement aanmaken
3. BETALING_REGISTREREN: Betaling registreren voor een huurder
4. SALDO_OPVRAGEN: Saldo van een huurder bekijken
5. LENING_AANMAKEN: Lening aanmaken voor een huurder
6. OVERZICHT_GEVEN: Overzicht geven van huurders, appartementen, betalingen, etc.

WANNEER DE GEBRUIKER EEN ACTIE WIL UITVOEREN, GEEF DAN EEN JSON RESPONSE IN DIT FORMAAT:
{{"action": "ACTIE_NAAM", "params": {{"param1": "waarde1", "param2": "waarde2"}}}}

VOORBEELDEN:
- "Voeg Jan Pietersen toe met telefoon 8234567" -> {{"action": "HUURDER_TOEVOEGEN", "params": {{"name": "Jan Pietersen", "phone": "8234567"}}}}
- "Registreer betaling van 5000 voor Jan" -> {{"action": "BETALING_REGISTREREN", "params": {{"tenant_name": "Jan", "amount": 5000}}}}
- "Wat is het saldo van Maria?" -> {{"action": "SALDO_OPVRAGEN", "params": {{"tenant_name": "Maria"}}}}
- "Maak een lening van 2000 voor Piet" -> {{"action": "LENING_AANMAKEN", "params": {{"tenant_name": "Piet", "amount": 2000}}}}

Als de gebruiker alleen informatie vraagt of een gesprek voert, antwoord dan normaal in het Nederlands ZONDER JSON.
Wees vriendelijk, professioneel en behulpzaam. Gebruik de valuta SRD (Surinaamse Dollar).
Als je een actie uitvoert, bevestig dit duidelijk aan de gebruiker."""

    # Initialize AI chat
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=session_id,
        system_message=system_prompt
    ).with_model("openai", "gpt-4o")
    
    # Send message to AI
    user_msg = UserMessage(text=message)
    ai_response = await chat.send_message(user_msg)
    
    # Check if response contains an action
    action_result = None
    final_response = ai_response
    
    try:
        # Try to parse JSON action from response
        if "{" in ai_response and "}" in ai_response:
            # Find JSON in response
            start = ai_response.find("{")
            end = ai_response.rfind("}") + 1
            json_str = ai_response[start:end]
            action_data = json.loads(json_str)
            
            if "action" in action_data:
                action = action_data["action"]
                params = action_data.get("params", {})
                
                # Execute action
                if action == "HUURDER_TOEVOEGEN":
                    result = await ai_create_tenant(
                        user_id, 
                        params.get("name"), 
                        params.get("phone"),
                        params.get("email"),
                        params.get("address"),
                        params.get("id_number")
                    )
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                        action_result = None
                    else:
                        action_result = result
                        final_response = f"✅ Huurder '{params.get('name')}' is succesvol toegevoegd!"
                    
                elif action == "APPARTEMENT_TOEVOEGEN":
                    try:
                        rent = float(params.get("rent_amount", 0)) if params.get("rent_amount") else 0
                    except:
                        rent = 0
                    result = await ai_create_apartment(
                        user_id,
                        params.get("name"),
                        params.get("address", ""),
                        rent,
                        params.get("description")
                    )
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                        action_result = None
                    else:
                        action_result = result
                        final_response = f"✅ Appartement '{params.get('name')}' is succesvol toegevoegd!"
                    
                elif action == "BETALING_REGISTREREN":
                    try:
                        amount = float(params.get("amount", 0)) if params.get("amount") else 0
                    except:
                        amount = 0
                    result = await ai_register_payment(
                        user_id,
                        params.get("tenant_name"),
                        amount,
                        params.get("payment_type", "rent"),
                        params.get("description")
                    )
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                        action_result = None
                    else:
                        action_result = result
                        final_response = f"✅ Betaling van SRD {amount:,.2f} voor {params.get('tenant_name')} is geregistreerd!"
                    
                elif action == "SALDO_OPVRAGEN":
                    result = await ai_get_tenant_balance(user_id, params.get("tenant_name"))
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                        action_result = None
                    else:
                        action_result = result
                        if "message" in result:
                            final_response = f"📊 **{result['tenant']}**: {result['message']}"
                        else:
                            final_response = f"📊 **Saldo {result['tenant']}**\n- Appartement: {result['apartment']}\n- Huur: SRD {result['rent_amount']:,.2f}\n- Totaal betaald: SRD {result['total_paid']:,.2f}"
                    
                elif action == "LENING_AANMAKEN":
                    try:
                        amount = float(params.get("amount", 0)) if params.get("amount") else 0
                    except:
                        amount = 0
                    result = await ai_create_loan(
                        user_id,
                        params.get("tenant_name"),
                        amount,
                        params.get("description")
                    )
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                        action_result = None
                    else:
                        action_result = result
                        final_response = f"✅ Lening van SRD {amount:,.2f} voor {params.get('tenant_name')} is aangemaakt!"
                    
                elif action == "OVERZICHT_GEVEN":
                    # Already have stats, just format nicely
                    final_response = f"""📊 **Overzicht Facturatie N.V.**

👥 **Huurders:** {stats['total_tenants']}
🏠 **Appartementen:** {stats['total_apartments']}
💰 **Maandinkomen:** SRD {stats['monthly_income']:,.2f}

**Huurders:** {tenant_list}
**Appartementen:** {apartment_list}"""
                    
    except json.JSONDecodeError:
        # Not a JSON response, just return the AI's natural response
        pass
    except Exception as e:
        logger.error(f"AI action error: {e}")
    
    return {
        "response": final_response,
        "action_executed": action_result is not None,
        "action_result": action_result
    }

@api_router.post("/ai/chat")
async def ai_chat(message_data: AIChatMessage, current_user: dict = Depends(get_current_user)):
    """AI Chat endpoint - processes user messages and executes commands"""
    try:
        session_id = message_data.session_id or f"chat_{current_user['id']}_{datetime.now().strftime('%Y%m%d')}"
        
        result = await process_ai_command(
            current_user["id"],
            message_data.message,
            session_id
        )
        
        # Store chat message in database
        await db.ai_chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "session_id": session_id,
            "user_message": message_data.message,
            "ai_response": result["response"],
            "action_executed": result["action_executed"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI fout: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
