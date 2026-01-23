from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
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
import httpx
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.hostinger.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'info@facturatie.sr')
APP_URL = os.environ.get('APP_URL', 'https://vastgoed.facturatie.sr')

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
    payment_type: str  # 'rent', 'deposit', 'other'
    description: Optional[str] = None
    period_month: Optional[int] = None
    period_year: Optional[int] = None

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

# Admin Dashboard Models
class AdminDashboardStats(BaseModel):
    total_customers: int
    active_subscriptions: int
    expired_subscriptions: int
    total_revenue: float
    revenue_this_month: float
    recent_subscriptions: List[SubscriptionResponse]

# Dashboard Models
class DashboardStats(BaseModel):
    total_apartments: int
    occupied_apartments: int
    available_apartments: int
    total_tenants: int
    total_income_this_month: float
    total_outstanding: float
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
    return [TenantResponse(**t) for t in tenants]

@api_router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return TenantResponse(**tenant)

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
    if tenant_ids:
        tenants = await db.tenants.find(
            {"id": {"$in": tenant_ids}},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(1000)
        tenant_map = {t["id"]: t["name"] for t in tenants}
        for apt in apartments:
            if apt.get("tenant_id"):
                apt["tenant_name"] = tenant_map.get(apt["tenant_id"])
    
    return [ApartmentResponse(**apt) for apt in apartments]

@api_router.get("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def get_apartment(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    apt = await db.apartments.find_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    if apt.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
        apt["tenant_name"] = tenant["name"] if tenant else None
    
    return ApartmentResponse(**apt)

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
    
    if apt.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
        apt["tenant_name"] = tenant["name"] if tenant else None
    
    return ApartmentResponse(**apt)

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
    
    # Get this month's income
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    payments_this_month = await db.payments.find({
        "user_id": user_id,
        "payment_type": "rent"
    }, {"_id": 0}).to_list(1000)
    
    total_income = sum(
        p["amount"] for p in payments_this_month 
        if p.get("period_month") == now.month and p.get("period_year") == now.year
    )
    
    # Calculate outstanding (rent due - payments made this month for occupied apartments)
    occupied_apts = await db.apartments.find(
        {"user_id": user_id, "status": "occupied"},
        {"_id": 0}
    ).to_list(1000)
    
    total_rent_due = sum(apt["rent_amount"] for apt in occupied_apts)
    total_outstanding = max(0, total_rent_due - total_income)
    
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
        payment["tenant_name"] = recent_tenant_map.get(payment["tenant_id"])
        payment["apartment_name"] = recent_apt_map.get(payment["apartment_id"])
        recent_payments.append(PaymentResponse(**payment))
    
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
            for p in payments_this_month
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
        total_deposits_held=total_deposits,
        total_kasgeld=total_kasgeld,
        total_employees=total_employees,
        total_salary_this_month=total_salary_this_month,
        recent_payments=recent_payments,
        reminders=reminders
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
    
    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant["name"],
        "apartment_name": apt["name"],
        "rent_amount": apt["rent_amount"],
        "has_outstanding": len(outstanding_months) > 0,
        "outstanding_amount": total_outstanding,
        "outstanding_months": outstanding_months,
        "partial_payments": partial_payments,
        "unpaid_count": len([m for m in outstanding_months if m["status"] == "unpaid"]),
        "partial_count": len([m for m in outstanding_months if m["status"] == "partial"]),
        "suggestion": suggestion
    }

# ==================== FACTUREN (INVOICES) ROUTES ====================

@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_active_user)):
    """Get all invoices (rent due) for all tenants with payment status, cumulative balance and maintenance costs"""
    
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
        
        # Track cumulative balance for this tenant (including maintenance)
        cumulative_balance = 0.0
        # Add maintenance costs to starting balance
        cumulative_balance += apt_maintenance["total"]
        
        tenant_invoices = []
        is_first_month = True
        
        while (year < now.year) or (year == now.year and month <= now.month):
            key = (apt["tenant_id"], apt["id"], year, month)
            period_payments = payment_lookup.get(key, [])
            
            # Calculate amounts
            rent_due = apt["rent_amount"]
            # Only add maintenance to first month's invoice display
            maintenance_due = apt_maintenance["total"] if is_first_month else 0
            amount_due = rent_due + maintenance_due
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
    rent_due_day: int = 1  # Day of month (1-28)
    payment_frequency: str = "monthly"  # monthly, weekly, biweekly, quarterly, yearly
    grace_period_days: int = 5  # Days after due date before considered late

@api_router.put("/profile/rent-settings")
async def update_rent_settings(settings: RentSettings, current_user: dict = Depends(get_current_user)):
    """Update rent/payment settings for customer"""
    
    if settings.rent_due_day < 1 or settings.rent_due_day > 28:
        raise HTTPException(status_code=400, detail="Dag moet tussen 1 en 28 zijn")
    
    valid_frequencies = ["monthly", "weekly", "biweekly", "quarterly", "yearly"]
    if settings.payment_frequency not in valid_frequencies:
        raise HTTPException(status_code=400, detail="Ongeldige betalingsfrequentie")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "rent_due_day": settings.rent_due_day,
            "payment_frequency": settings.payment_frequency,
            "grace_period_days": settings.grace_period_days
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
