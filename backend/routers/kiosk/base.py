"""
Appartement Kiosk - Standalone Huurbetalingen System
Multi-tenant SaaS voor vastgoedbeheer in Suriname
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import jwt
import bcrypt
import os
import uuid
import re
import httpx
import asyncio

router = APIRouter(prefix="/kiosk", tags=["Kiosk System"])
security = HTTPBearer(auto_error=False)

# Explicit __all__ so `from .base import *` includes underscore-prefixed helpers
__all__ = [
    # Re-export stdlib/third-party for sub-modules
    "APIRouter", "HTTPException", "Depends", "Response",
    "HTTPBearer", "HTTPAuthorizationCredentials",
    "BaseModel", "EmailStr", "List", "Optional",
    "datetime", "timezone", "timedelta", "relativedelta",
    "jwt", "bcrypt", "os", "uuid", "re", "httpx", "asyncio",
    # Core objects
    "router", "security", "db", "set_database", "ensure_indexes",
    "_cache_get", "_cache_set", "_cache_invalidate",
    "JWT_SECRET", "JWT_ALGORITHM", "JWT_EXPIRATION_HOURS",
    # Helpers
    "generate_uuid", "slugify_company_name",
    "_send_wa_auto", "_send_twilio_auto", "_send_message_auto", "_send_email_auto",
    "hash_password", "verify_password", "create_token", "decode_token",
    "get_current_company",
    # Models
    "CompanyRegister", "CompanyLogin", "CompanyUpdate",
    "KioskPinVerify", "ApartmentCreate", "ApartmentUpdate",
    "TenantCreate", "TenantUpdate", "PaymentCreate",
    "CashEntryCreate", "EmployeeCreate", "EmployeeUpdate",
    "LeaseCreate", "LeaseUpdate",
    "LoanCreate", "LoanUpdate", "LoanPaymentCreate",
    "InternetPlanCreate", "InternetPlanUpdate",
    "RekeninghouderCreate", "RekeninghouderUpdate", "VerdelingUitvoeren",
]

# JWT settings
JWT_SECRET = os.environ.get("JWT_SECRET", "kiosk-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Database proxy - shared mutable reference across all sub-modules
class _DatabaseProxy:
    """Proxy object so all modules share the same db reference after set_database()"""
    def __init__(self):
        self._db = None
    def __getattr__(self, name):
        if name == '_db':
            return super().__getattribute__(name)
        if self._db is None:
            raise RuntimeError("Database not initialized")
        return getattr(self._db, name)

db = _DatabaseProxy()

def set_database(database):
    db._db = database

# ============== PERFORMANCE: MongoDB Indexes ==============
async def ensure_indexes():
    """Create indexes for frequently queried collections"""
    try:
        await db.kiosk_companies.create_index("company_id", unique=True)
        await db.kiosk_companies.create_index("custom_domain")
        await db.kiosk_tenants.create_index([("company_id", 1), ("status", 1)])
        await db.kiosk_tenants.create_index([("company_id", 1), ("apartment_id", 1)])
        await db.kiosk_apartments.create_index([("company_id", 1), ("order", 1)])
        await db.kiosk_payments.create_index([("company_id", 1), ("created_at", -1)])
        await db.kiosk_payments.create_index([("company_id", 1), ("tenant_id", 1)])
        await db.kiosk_leases.create_index([("company_id", 1)])
        await db.kiosk_kas.create_index([("company_id", 1), ("created_at", -1)])
        await db.kiosk_employees.create_index([("company_id", 1)])
        await db.kiosk_rekeninghouders.create_index([("company_id", 1)])
    except Exception:
        pass  # Indexes may already exist

# ============== PERFORMANCE: In-memory cache ==============
_cache = {}
_cache_ttl = {}
CACHE_DURATION = 30  # seconds

def _cache_get(key):
    import time
    if key in _cache and _cache_ttl.get(key, 0) > time.time():
        return _cache[key]
    return None

def _cache_set(key, value, ttl=CACHE_DURATION):
    import time
    _cache[key] = value
    _cache_ttl[key] = time.time() + ttl

def _cache_invalidate(prefix):
    keys_to_remove = [k for k in _cache if k.startswith(prefix)]
    for k in keys_to_remove:
        _cache.pop(k, None)
        _cache_ttl.pop(k, None)

# ============== HELPER FUNCTIONS ==============

def generate_uuid():
    return str(uuid.uuid4())

def slugify_company_name(name: str) -> str:
    """Convert company name to a URL-safe slug for use as company_id"""
    slug = name.strip().lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or generate_uuid()

async def _send_wa_auto(company_id: str, phone: str, message: str, tenant_id: str = "", tenant_name: str = "", msg_type: str = "auto"):
    """Internal helper: send WhatsApp message if enabled for this company"""
    try:
        comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
        if not comp or not comp.get("wa_enabled") or not comp.get("wa_api_token") or not comp.get("wa_phone_id"):
            return  # WhatsApp not configured, skip silently
        
        phone_clean = phone.replace(" ", "").replace("-", "").replace("+", "")
        if not phone_clean.startswith("597"):
            phone_clean = "597" + phone_clean
        
        # Append bank info if available
        bank_name = comp.get("bank_name")
        bank_account = comp.get("bank_account_number")
        bank_holder = comp.get("bank_account_name")
        if bank_name and bank_account:
            message += f"\n\n--- Bankgegevens ---\nBank: {bank_name}\nRekening: {bank_account}"
            if bank_holder:
                message += f"\nT.n.v.: {bank_holder}"
        
        wa_url = comp.get("wa_api_url", "https://graph.facebook.com/v21.0")
        wa_token = comp["wa_api_token"]
        wa_phone_id = comp["wa_phone_id"]
        
        send_status = "pending"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{wa_url}/{wa_phone_id}/messages",
                    headers={"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"},
                    json={"messaging_product": "whatsapp", "to": phone_clean, "type": "text", "text": {"body": message}}
                )
            send_status = "sent" if resp.status_code == 200 else "failed"
        except Exception:
            send_status = "failed"
        
        await db.kiosk_wa_messages.insert_one({
            "message_id": generate_uuid(),
            "company_id": company_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "phone": phone_clean,
            "message_type": msg_type,
            "message": message,
            "status": send_status,
            "created_at": datetime.now(timezone.utc)
        })
    except Exception:
        pass  # Auto messages should never break the main flow


async def _send_twilio_auto(company_id: str, phone: str, message: str, tenant_id: str = "", tenant_name: str = "", msg_type: str = "auto"):
    """Internal helper: send WhatsApp message via Twilio if enabled for this company"""
    try:
        comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
        if not comp or not comp.get("twilio_enabled") or not comp.get("twilio_account_sid") or not comp.get("twilio_auth_token") or not comp.get("twilio_phone_number"):
            return  # Twilio not configured, skip silently

        phone_clean = phone.replace(" ", "").replace("-", "")
        if not phone_clean.startswith("+"):
            if phone_clean.startswith("597"):
                phone_clean = "+" + phone_clean
            else:
                phone_clean = "+597" + phone_clean

        # Append bank info if available
        bank_name = comp.get("bank_name")
        bank_account = comp.get("bank_account_number")
        bank_holder = comp.get("bank_account_name")
        if bank_name and bank_account:
            message += f"\n\n--- Bankgegevens ---\nBank: {bank_name}\nRekening: {bank_account}"
            if bank_holder:
                message += f"\nT.n.v.: {bank_holder}"

        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(comp["twilio_account_sid"], comp["twilio_auth_token"])
        
        twilio_from = comp["twilio_phone_number"]
        # Add whatsapp: prefix for Twilio WhatsApp API
        if not twilio_from.startswith("whatsapp:"):
            twilio_from = f"whatsapp:{twilio_from}"
        
        send_status = "pending"
        try:
            twilio_client.messages.create(
                body=message,
                from_=twilio_from,
                to=f"whatsapp:{phone_clean}"
            )
            send_status = "sent"
        except Exception:
            send_status = "failed"

        await db.kiosk_wa_messages.insert_one({
            "message_id": generate_uuid(),
            "company_id": company_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "phone": phone_clean,
            "message_type": msg_type,
            "channel": "twilio_whatsapp",
            "message": message,
            "status": send_status,
            "created_at": datetime.now(timezone.utc)
        })
    except Exception:
        pass  # Auto messages should never break the main flow


async def _send_message_auto(company_id: str, phone: str, message: str, tenant_id: str = "", tenant_name: str = "", msg_type: str = "auto"):
    """Send message via all enabled channels (WhatsApp + Twilio + Email)"""
    await _send_wa_auto(company_id, phone, message, tenant_id, tenant_name, msg_type)
    await _send_twilio_auto(company_id, phone, message, tenant_id, tenant_name, msg_type)
    # Also send via email if tenant has email
    if tenant_id:
        tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id}, {"_id": 0, "email": 1})
        if tenant and tenant.get("email"):
            subject_map = {
                "payment_confirmation": "Betalingsbevestiging",
                "rent_reminder": "Huurherinnering",
                "overdue_warning": "Achterstallige Huur",
                "fine_applied": "Boete Toegepast",
                "new_invoice": "Nieuwe Factuur",
                "loan_created": "Lening Aangemaakt",
                "loan_payment": "Leningbetaling",
                "lease_created": "Huurovereenkomst",
                "internet_assigned": "Internet Toegewezen",
            }
            subject = subject_map.get(msg_type, "Bericht van uw verhuurder")
            await _send_email_auto(company_id, tenant["email"], subject, message, tenant_id, tenant_name, msg_type)


async def _send_email_auto(company_id: str, to_email: str, subject: str, message: str, tenant_id: str = "", tenant_name: str = "", msg_type: str = "auto"):
    """Send email via SMTP if configured"""
    if not to_email:
        return
    try:
        company = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
        if not company or not company.get("smtp_enabled"):
            return
        smtp_host = company.get("smtp_host", "")
        smtp_port = company.get("smtp_port", 587)
        smtp_email = company.get("smtp_email", "")
        smtp_password = company.get("smtp_password", "")
        if not smtp_host or not smtp_email or not smtp_password:
            return
        
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = to_email
        msg['Subject'] = subject
        
        html_body = message.replace('\n', '<br>')
        comp_name = company.get("stamp_company_name") or company.get("name", "")
        html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#f97316;color:white;padding:15px 20px;border-radius:8px 8px 0 0;">
                <h2 style="margin:0;font-size:18px;">{comp_name}</h2>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
                <p style="color:#334155;line-height:1.6;">{html_body}</p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:15px;">Verzonden via {comp_name}</p>
        </div>"""
        msg.attach(MIMEText(html, 'html'))
        
        import asyncio
        loop = asyncio.get_event_loop()
        def send():
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        await asyncio.wait_for(loop.run_in_executor(None, send), timeout=15)
        
        # Log email
        await db.kiosk_messages.insert_one({
            "message_id": str(uuid.uuid4()),
            "company_id": company_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "channel": "email",
            "to": to_email,
            "subject": subject,
            "message": message,
            "msg_type": msg_type,
            "status": "sent",
            "created_at": datetime.now(timezone.utc)
        })
    except Exception as e:
        await db.kiosk_messages.insert_one({
            "message_id": str(uuid.uuid4()),
            "company_id": company_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "channel": "email",
            "to": to_email,
            "subject": subject,
            "message": message,
            "msg_type": msg_type,
            "status": "failed",
            "error": str(e),
            "created_at": datetime.now(timezone.utc)
        })


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(company_id: str) -> str:
    payload = {
        "company_id": company_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldig token")

async def get_current_company(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authenticatie vereist")
    payload = decode_token(credentials.credentials)
    company = await db.kiosk_companies.find_one({"company_id": payload["company_id"]})
    if not company:
        raise HTTPException(status_code=401, detail="Bedrijf niet gevonden")
    return company

# ============== MODELS ==============

class CompanyRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    telefoon: Optional[str] = None
    adres: Optional[str] = None

class CompanyLogin(BaseModel):
    email: EmailStr
    password: str

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    billing_day: Optional[int] = None  # 1-28
    billing_next_month: Optional[bool] = None  # True = deadline is next month
    fine_amount: Optional[float] = None
    power_cutoff_days: Optional[int] = None  # Days after due date to auto-cut power (0 = disabled)
    stamp_company_name: Optional[str] = None
    stamp_address: Optional[str] = None
    stamp_phone: Optional[str] = None
    stamp_whatsapp: Optional[str] = None
    kiosk_pin: Optional[str] = None  # 4-digit PIN for kiosk access
    # Bank/betaalmethode
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_description: Optional[str] = None
    # WhatsApp Business API
    wa_api_url: Optional[str] = None
    wa_api_token: Optional[str] = None
    wa_phone_id: Optional[str] = None
    wa_enabled: Optional[bool] = None
    # SumUp Payment Integration
    sumup_api_key: Optional[str] = None
    sumup_merchant_code: Optional[str] = None
    sumup_enabled: Optional[bool] = None
    sumup_currency: Optional[str] = None
    sumup_exchange_rate: Optional[float] = None
    # Mope Payment Integration
    mope_api_key: Optional[str] = None
    mope_enabled: Optional[bool] = None
    # Uni5Pay Payment Integration
    uni5pay_merchant_id: Optional[str] = None
    uni5pay_enabled: Optional[bool] = None
    # Start screen after login
    start_screen: Optional[str] = None  # 'kiosk' or 'dashboard'
    # Twilio SMS Integration
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    twilio_enabled: Optional[bool] = None
    # Email SMTP Integration
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_email: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_enabled: Optional[bool] = None
    # Custom Domain
    custom_domain: Optional[str] = None
    custom_domain_landing: Optional[str] = None  # 'kiosk' or 'login'

class KioskPinVerify(BaseModel):
    pin: str  # 4-digit PIN

class ApartmentCreate(BaseModel):
    number: str
    description: Optional[str] = None
    monthly_rent: float = 0

class ApartmentUpdate(BaseModel):
    number: Optional[str] = None
    description: Optional[str] = None
    monthly_rent: Optional[float] = None
    status: Optional[str] = None

class TenantCreate(BaseModel):
    name: str
    apartment_id: str
    tenant_code: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    monthly_rent: float = 0
    deposit_required: float = 0
    lease_start_date: Optional[str] = None  # YYYY-MM-DD
    lease_end_date: Optional[str] = None  # YYYY-MM-DD
    id_card_number: Optional[str] = None
    id_card_name: Optional[str] = None
    id_card_dob: Optional[str] = None
    id_card_raw: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    apartment_id: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    monthly_rent: Optional[float] = None
    status: Optional[str] = None
    outstanding_rent: Optional[float] = None
    service_costs: Optional[float] = None
    fines: Optional[float] = None
    deposit_required: Optional[float] = None
    deposit_paid: Optional[float] = None
    rent_billed_through: Optional[str] = None  # YYYY-MM
    id_card_number: Optional[str] = None
    id_card_name: Optional[str] = None
    id_card_dob: Optional[str] = None
    id_card_raw: Optional[str] = None

class PaymentCreate(BaseModel):
    tenant_id: str
    amount: float
    payment_type: str  # rent, partial_rent, service_costs, fines, deposit
    payment_method: str = "cash"
    description: Optional[str] = None
    rent_month: Optional[str] = None

class CashEntryCreate(BaseModel):
    entry_type: str  # income, expense, salary
    amount: float
    description: str
    category: Optional[str] = None  # rent, maintenance, salary, utilities, other
    related_tenant_id: Optional[str] = None
    related_employee_id: Optional[str] = None
    payment_id: Optional[str] = None

class EmployeeCreate(BaseModel):
    name: str
    functie: Optional[str] = None
    maandloon: float = 0
    telefoon: Optional[str] = None
    email: Optional[str] = None
    start_date: Optional[str] = None
    role: Optional[str] = None  # beheerder, boekhouder, kiosk_medewerker
    employee_type: Optional[str] = "vast"  # vast, los (aannemer)
    password: Optional[str] = None  # for login

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    functie: Optional[str] = None
    maandloon: Optional[float] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None
    employee_type: Optional[str] = None
    password: Optional[str] = None

class LeaseCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    monthly_rent: float
    voorwaarden: Optional[str] = None

class LeaseUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    monthly_rent: Optional[float] = None
    voorwaarden: Optional[str] = None
    status: Optional[str] = None  # active, expired, terminated

class LoanCreate(BaseModel):
    tenant_id: str
    amount: float
    monthly_payment: float
    start_date: Optional[str] = None  # YYYY-MM-DD
    description: Optional[str] = None

class LoanUpdate(BaseModel):
    monthly_payment: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None  # active, paid_off, cancelled

class LoanPaymentCreate(BaseModel):
    amount: float
    description: Optional[str] = None
    payment_method: str = "cash"

class InternetPlanCreate(BaseModel):
    name: str
    speed: str  # e.g. "25 Mbps"
    price: float

class InternetPlanUpdate(BaseModel):
    name: Optional[str] = None
    speed: Optional[str] = None
    price: Optional[float] = None

class RekeninghouderCreate(BaseModel):
    name: str
    percentage: float  # 0-100

class RekeninghouderUpdate(BaseModel):
    name: Optional[str] = None
    percentage: Optional[float] = None

class VerdelingUitvoeren(BaseModel):
    notitie: Optional[str] = None

