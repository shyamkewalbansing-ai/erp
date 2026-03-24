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
import httpx

router = APIRouter(prefix="/kiosk", tags=["Kiosk System"])
security = HTTPBearer(auto_error=False)

# JWT settings
JWT_SECRET = os.environ.get("JWT_SECRET", "kiosk-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Database reference (will be set from server.py)
db = None

def set_database(database):
    global db
    db = database

# ============== HELPER FUNCTIONS ==============

def generate_uuid():
    return str(uuid.uuid4())

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

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    functie: Optional[str] = None
    maandloon: Optional[float] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None

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


# ============== AUTH ENDPOINTS ==============

@router.post("/auth/register")
async def register_company(data: CompanyRegister):
    """Register a new company for the kiosk system"""
    # Check if email exists
    existing = await db.kiosk_companies.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    company_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    company = {
        "company_id": company_id,
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "telefoon": data.telefoon,
        "adres": data.adres,
        "billing_day": 1,
        "fine_amount": 0,
        "power_cutoff_days": 0,
        "stamp_company_name": data.name,
        "stamp_address": data.adres or "",
        "stamp_phone": data.telefoon or "",
        "stamp_whatsapp": "",
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_companies.insert_one(company)
    
    token = create_token(company_id)
    
    return {
        "company_id": company_id,
        "name": data.name,
        "email": data.email,
        "token": token
    }

@router.post("/auth/login")
async def login_company(data: CompanyLogin):
    """Login to company account"""
    company = await db.kiosk_companies.find_one({"email": data.email.lower()})
    if not company:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not verify_password(data.password, company["password_hash"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if company.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is niet actief")
    
    token = create_token(company["company_id"])
    
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company["email"],
        "token": token
    }

@router.post("/auth/pin")
async def login_with_pin(data: KioskPinVerify):
    """Login to company account using 4-digit PIN code"""
    company = await db.kiosk_companies.find_one({"kiosk_pin": data.pin, "status": "active"})
    if not company:
        raise HTTPException(status_code=401, detail="Ongeldige PIN code")
    
    token = create_token(company["company_id"])
    
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company.get("email", ""),
        "token": token
    }

@router.get("/auth/me")
async def get_current_company_info(company: dict = Depends(get_current_company)):
    """Get current logged in company info"""
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company["email"],
        "telefoon": company.get("telefoon"),
        "adres": company.get("adres"),
        "billing_day": company.get("billing_day", 1),
        "billing_next_month": company.get("billing_next_month", True),
        "fine_amount": company.get("fine_amount", 0),
        "power_cutoff_days": company.get("power_cutoff_days", 0),
        "stamp_company_name": company.get("stamp_company_name", ""),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", ""),
        "kiosk_pin": company.get("kiosk_pin", ""),
        "status": company.get("status"),
        "bank_name": company.get("bank_name", ""),
        "bank_account_name": company.get("bank_account_name", ""),
        "bank_account_number": company.get("bank_account_number", ""),
        "bank_description": company.get("bank_description", ""),
        "wa_api_url": company.get("wa_api_url", "https://graph.facebook.com/v21.0"),
        "wa_api_token": company.get("wa_api_token", ""),
        "wa_phone_id": company.get("wa_phone_id", ""),
        "wa_enabled": company.get("wa_enabled", False),
        "sumup_api_key": company.get("sumup_api_key", ""),
        "sumup_merchant_code": company.get("sumup_merchant_code", ""),
        "sumup_enabled": company.get("sumup_enabled", False),
        "sumup_currency": company.get("sumup_currency", "EUR")
    }

@router.put("/auth/settings")
async def update_company_settings(data: CompanyUpdate, company: dict = Depends(get_current_company)):
    """Update company settings"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Check for unique PIN if PIN is being set/changed
    if "kiosk_pin" in update_data and update_data["kiosk_pin"]:
        existing = await db.kiosk_companies.find_one({
            "kiosk_pin": update_data["kiosk_pin"],
            "company_id": {"$ne": company["company_id"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Deze PIN code is al in gebruik door een ander bedrijf. Kies een andere PIN.")
    
    await db.kiosk_companies.update_one(
        {"company_id": company["company_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Instellingen bijgewerkt"}


# ============== SUMUP CHECKOUT ENDPOINTS ==============

class SumUpCheckoutRequest(BaseModel):
    amount: float
    description: str
    tenant_id: str
    payment_type: str

@router.post("/public/{company_id}/sumup/checkout")
async def create_sumup_checkout(company_id: str, data: SumUpCheckoutRequest):
    """Create a SumUp checkout for card payment"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    api_key = company.get("sumup_api_key", "")
    merchant_code = company.get("sumup_merchant_code", "")
    currency = company.get("sumup_currency", "EUR")
    
    if not api_key or not merchant_code:
        raise HTTPException(status_code=400, detail="SumUp is niet geconfigureerd. Stel de API key en merchant code in via Instellingen.")
    
    checkout_ref = f"KIOSK-{company_id}-{uuid.uuid4().hex[:8]}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sumup.com/v0.1/checkouts",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "checkout_reference": checkout_ref,
                    "amount": round(data.amount, 2),
                    "currency": currency,
                    "merchant_code": merchant_code,
                    "description": data.description,
                }
            )
            
            if response.status_code not in (200, 201):
                detail = response.text
                raise HTTPException(status_code=400, detail=f"SumUp fout: {detail}")
            
            checkout_data = response.json()
            
            return {
                "checkout_id": checkout_data.get("id"),
                "checkout_reference": checkout_ref,
                "amount": data.amount,
                "status": checkout_data.get("status", "PENDING")
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Verbinding met SumUp mislukt: {str(e)}")

@router.get("/public/{company_id}/sumup/checkout/{checkout_id}/status")
async def get_sumup_checkout_status(company_id: str, checkout_id: str):
    """Check status of a SumUp checkout"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    api_key = company.get("sumup_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="SumUp niet geconfigureerd")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.sumup.com/v0.1/checkouts/{checkout_id}",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Kon status niet ophalen")
            
            data = response.json()
            return {
                "status": data.get("status", "PENDING"),
                "transaction_id": data.get("transaction_id"),
                "amount": data.get("amount"),
            }
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Verbinding met SumUp mislukt")

@router.get("/public/{company_id}/sumup/enabled")
async def check_sumup_enabled(company_id: str):
    """Check if SumUp is enabled for this company"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return {
        "enabled": bool(company.get("sumup_enabled") and company.get("sumup_api_key") and company.get("sumup_merchant_code")),
        "currency": company.get("sumup_currency", "EUR")
    }


# ============== PUBLIC KIOSK ENDPOINTS (for huurders) ==============

@router.get("/public/{company_id}/company")
async def get_company_public(company_id: str):
    """Get company info for kiosk display (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    return {
        "name": company["name"],
        "company_id": company["company_id"],
        "has_pin": bool(company.get("kiosk_pin"))  # Indicate if PIN is required
    }

@router.post("/public/{company_id}/verify-pin")
async def verify_kiosk_pin(company_id: str, data: KioskPinVerify):
    """Verify 4-digit PIN for kiosk access"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    stored_pin = company.get("kiosk_pin")
    if not stored_pin:
        # No PIN set, allow access
        return {"valid": True, "message": "Geen PIN ingesteld"}
    
    if data.pin != stored_pin:
        raise HTTPException(status_code=401, detail="Ongeldige PIN")
    
    # Generate a temporary token for admin access
    token = jwt.encode(
        {"company_id": company_id, "exp": datetime.now(timezone.utc) + timedelta(hours=8), "iat": datetime.now(timezone.utc)},
        JWT_SECRET, algorithm="HS256"
    )
    
    return {"valid": True, "message": "PIN correct", "token": token}

@router.get("/public/{company_id}/company/stamp")
async def get_company_stamp(company_id: str):
    """Get company stamp info for receipts (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    return {
        "stamp_company_name": company.get("stamp_company_name", company["name"]),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", "")
    }

@router.get("/public/{company_id}/apartments")
async def get_apartments_public(company_id: str):
    """Get all apartments for a company (public for kiosk)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    apartments = await db.kiosk_apartments.find({"company_id": company_id}).to_list(1000)
    return [{
        "apartment_id": apt["apartment_id"],
        "number": apt["number"],
        "description": apt.get("description", ""),
        "status": apt.get("status", "available")
    } for apt in apartments]

@router.get("/public/{company_id}/tenants")
async def get_tenants_public(company_id: str):
    """Get all active tenants for kiosk display (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    tenants = await db.kiosk_tenants.find({
        "company_id": company_id,
        "status": "active"
    }).to_list(1000)
    
    result = []
    for t in tenants:
        monthly_rent = t.get("monthly_rent", 0)
        outstanding = t.get("outstanding_rent", 0)
        billed_through = t.get("rent_billed_through", "")
        
        # Calculate overdue months
        overdue_months = []
        if billed_through and monthly_rent > 0 and outstanding > 0:
            bt_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
            months_owed = int(outstanding / monthly_rent) if monthly_rent > 0 else 0
            remainder = outstanding - (months_owed * monthly_rent)
            if remainder > 0:
                months_owed += 1
            month_names_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            for i in range(months_owed):
                m_date = bt_date - relativedelta(months=i)
                m_name = month_names_nl[m_date.month - 1]
                overdue_months.append(f"{m_name} {m_date.year}")
            overdue_months.reverse()
        
        result.append({
            "tenant_id": t["tenant_id"],
            "name": t["name"],
            "apartment_id": t["apartment_id"],
            "apartment_number": t.get("apartment_number", ""),
            "tenant_code": t.get("tenant_code", ""),
            "monthly_rent": monthly_rent,
            "outstanding_rent": outstanding,
            "service_costs": t.get("service_costs", 0),
            "fines": t.get("fines", 0),
            "deposit_required": t.get("deposit_required", 0),
            "deposit_paid": t.get("deposit_paid", 0),
            "rent_billed_through": billed_through,
            "overdue_months": overdue_months,
            "status": t["status"]
        })
    
    return result

@router.get("/public/{company_id}/tenants/lookup/{code}")
async def lookup_tenant_by_code(company_id: str, code: str):
    """Lookup tenant by code or apartment number (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    # Try to find by tenant code
    tenant = await db.kiosk_tenants.find_one({
        "company_id": company_id,
        "tenant_code": code.upper(),
        "status": "active"
    })
    
    # If not found, try by apartment number
    if not tenant:
        apt = await db.kiosk_apartments.find_one({
            "company_id": company_id,
            "number": code.upper()
        })
        if apt:
            tenant = await db.kiosk_tenants.find_one({
                "company_id": company_id,
                "apartment_id": apt["apartment_id"],
                "status": "active"
            })
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    return {
        "tenant_id": tenant["tenant_id"],
        "name": tenant["name"],
        "apartment_id": tenant["apartment_id"],
        "apartment_number": tenant.get("apartment_number", ""),
        "tenant_code": tenant.get("tenant_code", ""),
        "monthly_rent": tenant.get("monthly_rent", 0),
        "outstanding_rent": tenant.get("outstanding_rent", 0),
        "service_costs": tenant.get("service_costs", 0),
        "fines": tenant.get("fines", 0),
        "deposit_required": tenant.get("deposit_required", 0),
        "deposit_paid": tenant.get("deposit_paid", 0),
        "status": tenant["status"]
    }

@router.post("/public/{company_id}/payments")
async def create_payment_public(company_id: str, data: PaymentCreate):
    """Create a payment from kiosk (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    tenant = await db.kiosk_tenants.find_one({
        "company_id": company_id,
        "tenant_id": data.tenant_id
    })
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    payment_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    # Generate kwitantie nummer
    count = await db.kiosk_payments.count_documents({"company_id": company_id})
    kwitantie_nummer = f"KW{now.year}-{str(count + 1).zfill(5)}"
    
    # Auto-calculate covered months for rent payments
    covered_months = []
    if data.payment_type in ["rent", "partial_rent", "monthly_rent"]:
        monthly_rent = tenant.get("monthly_rent", 0)
        outstanding = tenant.get("outstanding_rent", 0)
        billed_through = tenant.get("rent_billed_through", "")
        if billed_through and monthly_rent > 0 and outstanding > 0:
            bt_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
            months_owed = int(outstanding / monthly_rent) if monthly_rent > 0 else 0
            remainder = outstanding - (months_owed * monthly_rent)
            if remainder > 0:
                months_owed += 1
            month_names_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            # Build overdue months list (oldest first)
            all_overdue = []
            for i in range(months_owed):
                m_date = bt_date - relativedelta(months=i)
                m_label = f"{month_names_nl[m_date.month - 1]} {m_date.year}"
                m_key = m_date.strftime("%Y-%m")
                all_overdue.append({"label": m_label, "key": m_key})
            all_overdue.reverse()
            # Determine how many months this payment covers
            pay_amount = data.amount
            for m in all_overdue:
                if pay_amount >= monthly_rent:
                    covered_months.append(m["label"])
                    pay_amount -= monthly_rent
                elif pay_amount > 0:
                    covered_months.append(m["label"] + " (gedeeltelijk)")
                    pay_amount = 0

    payment = {
        "payment_id": payment_id,
        "company_id": company_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "tenant_code": tenant.get("tenant_code", ""),
        "apartment_number": tenant.get("apartment_number", ""),
        "amount": data.amount,
        "payment_type": data.payment_type,
        "payment_method": data.payment_method,
        "description": data.description,
        "rent_month": data.rent_month,
        "covered_months": covered_months,
        "kwitantie_nummer": kwitantie_nummer,
        "created_at": now
    }
    
    await db.kiosk_payments.insert_one(payment)
    
    # Update tenant balances
    update_fields = {}
    if data.payment_type in ["rent", "partial_rent"]:
        new_outstanding = max(0, tenant.get("outstanding_rent", 0) - data.amount)
        update_fields["outstanding_rent"] = new_outstanding
    elif data.payment_type == "service_costs":
        new_service = max(0, tenant.get("service_costs", 0) - data.amount)
        update_fields["service_costs"] = new_service
    elif data.payment_type == "fines":
        new_fines = max(0, tenant.get("fines", 0) - data.amount)
        update_fields["fines"] = new_fines
    elif data.payment_type == "deposit":
        new_deposit = tenant.get("deposit_paid", 0) + data.amount
        update_fields["deposit_paid"] = new_deposit
    
    if update_fields:
        update_fields["updated_at"] = now
        await db.kiosk_tenants.update_one(
            {"tenant_id": data.tenant_id},
            {"$set": update_fields}
        )
    
    # Get updated tenant balances for receipt
    updated_tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id})
    remaining_rent = updated_tenant.get("outstanding_rent", 0) if updated_tenant else 0
    remaining_service = updated_tenant.get("service_costs", 0) if updated_tenant else 0
    remaining_fines = updated_tenant.get("fines", 0) if updated_tenant else 0
    
    # === AUTO WHATSAPP: Payment confirmation ===
    total_remaining = remaining_rent + remaining_service + remaining_fines
    comp_name = ""
    try:
        c = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
        comp_name = c.get("stamp_company_name") or c.get("name", "") if c else ""
    except Exception:
        pass
    
    type_labels = {"rent": "Huurbetaling", "monthly_rent": "Huurbetaling", "partial_rent": "Gedeeltelijke betaling", "service_costs": "Servicekosten", "fines": "Boetes", "deposit": "Borg"}
    type_label = type_labels.get(data.payment_type, data.payment_type)
    covered_str = ", ".join(covered_months) if covered_months else ""
    
    if total_remaining <= 0:
        wa_msg = (f"Beste {tenant['name']},\n\n"
                  f"Uw betaling van SRD {data.amount:,.2f} ({type_label}) is ontvangen.\n"
                  f"Kwitantie: {kwitantie_nummer}\n"
                  f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                  f"Uw saldo is nu VOLLEDIG VOLDAAN.\n\n"
                  f"Bedankt voor uw betaling!\n{comp_name}")
    else:
        wa_msg = (f"Beste {tenant['name']},\n\n"
                  f"Uw betaling van SRD {data.amount:,.2f} ({type_label}) is ontvangen.\n"
                  f"Kwitantie: {kwitantie_nummer}\n"
                  f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                  f"Resterend saldo: SRD {total_remaining:,.2f}\n\n"
                  f"Met vriendelijke groet,\n{comp_name}")
    
    if tenant.get("phone") or tenant.get("telefoon"):
        tenant_phone = tenant.get("phone") or tenant.get("telefoon", "")
        await _send_wa_auto(company_id, tenant_phone, wa_msg, data.tenant_id, tenant["name"], "payment_confirmation")
    
    return {
        "payment_id": payment_id,
        "kwitantie_nummer": kwitantie_nummer,
        "receipt_number": kwitantie_nummer,
        "amount": data.amount,
        "payment_type": data.payment_type,
        "tenant_name": tenant["name"],
        "tenant_code": tenant.get("tenant_code", ""),
        "apartment_number": tenant.get("apartment_number", ""),
        "rent_month": data.rent_month,
        "covered_months": covered_months,
        "created_at": now.isoformat(),
        "remaining_rent": remaining_rent,
        "remaining_service": remaining_service,
        "remaining_fines": remaining_fines
    }

# ============== ADMIN ENDPOINTS (authenticated) ==============

@router.get("/admin/dashboard")
async def get_dashboard(company: dict = Depends(get_current_company)):
    """Get dashboard statistics"""
    company_id = company["company_id"]
    
    total_apartments = await db.kiosk_apartments.count_documents({"company_id": company_id})
    total_tenants = await db.kiosk_tenants.count_documents({"company_id": company_id, "status": "active"})
    
    # Calculate totals
    tenants = await db.kiosk_tenants.find({"company_id": company_id, "status": "active"}).to_list(1000)
    total_outstanding = sum(t.get("outstanding_rent", 0) for t in tenants)
    total_service_costs = sum(t.get("service_costs", 0) for t in tenants)
    total_fines = sum(t.get("fines", 0) for t in tenants)
    
    # Payments this month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    payments_this_month = await db.kiosk_payments.find({
        "company_id": company_id,
        "created_at": {"$gte": start_of_month}
    }).to_list(1000)
    total_received_month = sum(p.get("amount", 0) for p in payments_this_month)
    
    return {
        "total_apartments": total_apartments,
        "total_tenants": total_tenants,
        "total_outstanding": total_outstanding,
        "total_service_costs": total_service_costs,
        "total_fines": total_fines,
        "total_received_month": total_received_month,
        "payments_count_month": len(payments_this_month)
    }

# Apartments CRUD
@router.get("/admin/apartments")
async def list_apartments(company: dict = Depends(get_current_company)):
    """List all apartments"""
    apartments = await db.kiosk_apartments.find({"company_id": company["company_id"]}).to_list(1000)
    return [{
        "apartment_id": apt["apartment_id"],
        "number": apt["number"],
        "description": apt.get("description", ""),
        "monthly_rent": apt.get("monthly_rent", 0),
        "status": apt.get("status", "available"),
        "created_at": apt.get("created_at")
    } for apt in apartments]

@router.post("/admin/apartments")
async def create_apartment(data: ApartmentCreate, company: dict = Depends(get_current_company)):
    """Create a new apartment"""
    apartment_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    apartment = {
        "apartment_id": apartment_id,
        "company_id": company["company_id"],
        "number": data.number.upper(),
        "description": data.description,
        "monthly_rent": data.monthly_rent,
        "status": "available",
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_apartments.insert_one(apartment)
    return {"apartment_id": apartment_id, "message": "Appartement aangemaakt"}

@router.put("/admin/apartments/{apartment_id}")
async def update_apartment(apartment_id: str, data: ApartmentUpdate, company: dict = Depends(get_current_company)):
    """Update an apartment"""
    apt = await db.kiosk_apartments.find_one({
        "apartment_id": apartment_id,
        "company_id": company["company_id"]
    })
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.kiosk_apartments.update_one(
        {"apartment_id": apartment_id},
        {"$set": update_data}
    )
    return {"message": "Appartement bijgewerkt"}

@router.delete("/admin/apartments/{apartment_id}")
async def delete_apartment(apartment_id: str, company: dict = Depends(get_current_company)):
    """Delete an apartment"""
    result = await db.kiosk_apartments.delete_one({
        "apartment_id": apartment_id,
        "company_id": company["company_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

# Tenants CRUD
@router.get("/admin/tenants")
async def list_tenants(company: dict = Depends(get_current_company)):
    """List all tenants - auto-bills new months based on billing_day setting"""
    company_id = company["company_id"]
    tenants = await db.kiosk_tenants.find({"company_id": company_id}).to_list(1000)
    
    # Get company billing settings
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    billing_day = comp.get("billing_day", 1) if comp else 1
    billing_next_month = comp.get("billing_next_month", True) if comp else True
    fine_amount = comp.get("fine_amount", 0) if comp else 0
    
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    
    result = []
    for t in tenants:
        billed_through = t.get("rent_billed_through", "")
        monthly_rent = t.get("monthly_rent", 0)
        outstanding = t.get("outstanding_rent", 0)
        current_fines = t.get("fines", 0)
        updates = {}
        
        if t.get("status") == "active" and monthly_rent > 0:
            if not billed_through:
                billed_through = current_month
                updates["rent_billed_through"] = current_month
            else:
                # Auto-billing engine
                # How it works:
                #   billed_through = last month whose rent was added to outstanding
                #   check_month = next month to potentially bill (billed_through + 1)
                #   The due date determines WHEN the next month's rent gets added:
                #     billing_next_month=True  ("Volgende maand"): due_date = check_month's billing_day
                #       -> Feb rent due March 24. After March 24: bill March.
                #     billing_next_month=False ("Dezelfde maand"): due_date = prev_month's billing_day
                #       -> Feb rent due Feb 24. After Feb 24: bill March.
                billed_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
                
                months_billed = 0
                check_month = billed_date + relativedelta(months=1)
                
                while True:
                    prev_month = check_month - relativedelta(months=1)
                    if billing_next_month:
                        due_date = check_month.replace(day=min(billing_day, 28))
                    else:
                        due_date = prev_month.replace(day=min(billing_day, 28))
                    
                    if now >= due_date.replace(tzinfo=timezone.utc):
                        months_billed += 1
                        check_month += relativedelta(months=1)
                    else:
                        break
                
                if months_billed > 0:
                    # Apply fine for existing outstanding BEFORE adding new rent
                    if outstanding > 0 and fine_amount > 0:
                        last_fine_month = t.get("last_fine_month", "")
                        fine_due_month = billed_through  # The period they failed to pay
                        if last_fine_month != fine_due_month:
                            current_fines += fine_amount
                            updates["fines"] = current_fines
                            updates["last_fine_month"] = fine_due_month
                    
                    outstanding += monthly_rent * months_billed
                    billed_through = (billed_date + relativedelta(months=months_billed)).strftime("%Y-%m")
                    updates["outstanding_rent"] = outstanding
                    updates["rent_billed_through"] = billed_through
            
            # Catch-up fine: apply fine when no new billing happened but rent is overdue
            if outstanding > 0 and fine_amount > 0 and not updates.get("last_fine_month"):
                billed_dt = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
                if billing_next_month:
                    current_due = (billed_dt + relativedelta(months=1)).replace(day=min(billing_day, 28))
                else:
                    current_due = billed_dt.replace(day=min(billing_day, 28))
                
                if now >= current_due.replace(tzinfo=timezone.utc):
                    last_fine_month = t.get("last_fine_month", "")
                    if last_fine_month != billed_through:
                        current_fines += fine_amount
                        updates["fines"] = current_fines
                        updates["last_fine_month"] = billed_through
        
        if updates:
            updates["updated_at"] = now
            await db.kiosk_tenants.update_one(
                {"tenant_id": t["tenant_id"]},
                {"$set": updates}
            )
            
            # === AUTO WHATSAPP: Billing notifications ===
            if (t.get("phone") or t.get("telefoon")) and t.get("status") == "active":
                company_name_for_wa = comp.get("stamp_company_name") or comp.get("name", "") if comp else ""
                months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
                t_phone = t.get("phone") or t.get("telefoon", "")
                
                # New rent month billed
                if "outstanding_rent" in updates and updates["outstanding_rent"] > t.get("outstanding_rent", 0):
                    new_bt = updates.get("rent_billed_through", billed_through)
                    try:
                        bt_d = datetime.strptime(new_bt + "-01", "%Y-%m-%d")
                        month_label = f"{months_nl[bt_d.month - 1]} {bt_d.year}"
                    except Exception:
                        month_label = new_bt
                    wa_rent_msg = (f"Beste {t['name']},\n\n"
                                   f"De huur voor {month_label} is gefactureerd bij {company_name_for_wa}.\n"
                                   f"Bedrag: SRD {monthly_rent:,.2f}\n"
                                   f"Totaal openstaand: SRD {updates['outstanding_rent']:,.2f}\n\n"
                                   f"Gelieve voor de vervaldatum te betalen.\n\n"
                                   f"Met vriendelijke groet,\n{company_name_for_wa}")
                    await _send_wa_auto(company_id, t_phone, wa_rent_msg, t["tenant_id"], t["name"], "new_invoice")
                
                # Fine applied
                if "fines" in updates and updates["fines"] > t.get("fines", 0):
                    added_fine = updates["fines"] - t.get("fines", 0)
                    wa_fine_msg = (f"Beste {t['name']},\n\n"
                                   f"Er is een boete van SRD {added_fine:,.2f} toegepast op uw account bij {company_name_for_wa}.\n"
                                   f"Reden: Achterstallige huur niet tijdig betaald.\n"
                                   f"Totaal boetes: SRD {updates['fines']:,.2f}\n"
                                   f"Totaal openstaand: SRD {(updates.get('outstanding_rent', outstanding) + updates.get('service_costs', t.get('service_costs', 0)) + updates['fines']):,.2f}\n\n"
                                   f"Gelieve zo spoedig mogelijk te betalen.\n\n"
                                   f"Met vriendelijke groet,\n{company_name_for_wa}")
                    await _send_wa_auto(company_id, t_phone, wa_fine_msg, t["tenant_id"], t["name"], "fine_applied")
        
        # === AUTO POWER CUTOFF: Turn off Shelly when overdue past cutoff days ===
        power_cutoff_days = comp.get("power_cutoff_days", 0) if comp else 0
        if power_cutoff_days > 0 and t.get("status") == "active":
            total_debt = (updates.get("outstanding_rent", outstanding) + 
                         t.get("service_costs", 0) + 
                         (updates.get("fines", current_fines)))
            if total_debt > 0 and billed_through:
                try:
                    bt_dt = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
                    if billing_next_month:
                        due_dt = (bt_dt + relativedelta(months=1)).replace(day=min(billing_day, 28))
                    else:
                        due_dt = bt_dt.replace(day=min(billing_day, 28))
                    cutoff_dt = due_dt + timedelta(days=power_cutoff_days)
                    if now >= cutoff_dt.replace(tzinfo=timezone.utc):
                        shelly = await db.kiosk_shelly_devices.find_one(
                            {"company_id": company_id, "apartment_id": t.get("apartment_id")}, {"_id": 0}
                        )
                        if shelly and shelly.get("last_status") != "off":
                            ip = shelly["device_ip"]
                            ch = shelly.get("channel", 0)
                            dtype = shelly.get("device_type", "gen1")
                            try:
                                async with httpx.AsyncClient(timeout=5.0) as client:
                                    if dtype == "gen2":
                                        await client.get(f"http://{ip}/rpc/switch.set?id={ch}&on=false")
                                    else:
                                        await client.get(f"http://{ip}/relay/{ch}?turn=off")
                                await db.kiosk_shelly_devices.update_one(
                                    {"device_id": shelly["device_id"]},
                                    {"$set": {"last_status": "off", "last_check": now, "auto_cutoff": True}}
                                )
                            except Exception:
                                pass
                except Exception:
                    pass
        
        # Calculate billing details for display
        overdue_months = []
        current_billing_month = ""
        if billed_through and monthly_rent > 0:
            bt_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
            current_billing_month = billed_through
            # Calculate how many months of rent are in outstanding
            if outstanding > 0:
                months_owed = int(outstanding / monthly_rent) if monthly_rent > 0 else 0
                remainder = outstanding - (months_owed * monthly_rent)
                if remainder > 0:
                    months_owed += 1
                # List the overdue months (counting back from billed_through)
                for i in range(months_owed):
                    m_date = bt_date - relativedelta(months=i)
                    month_names_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
                    m_name = month_names_nl[m_date.month - 1]
                    overdue_months.append(f"{m_name} {m_date.year}")
                overdue_months.reverse()

        result.append({
            "tenant_id": t["tenant_id"],
            "name": t["name"],
            "apartment_id": t["apartment_id"],
            "apartment_number": t.get("apartment_number", ""),
            "tenant_code": t.get("tenant_code", ""),
            "email": t.get("email"),
            "telefoon": t.get("telefoon") or t.get("phone"),
            "phone": t.get("phone") or t.get("telefoon"),
            "monthly_rent": monthly_rent,
            "outstanding_rent": outstanding,
            "service_costs": t.get("service_costs", 0),
            "fines": current_fines,
            "deposit_required": t.get("deposit_required", 0),
            "deposit_paid": t.get("deposit_paid", 0),
            "rent_billed_through": billed_through,
            "current_billing_month": current_billing_month,
            "overdue_months": overdue_months,
            "status": t.get("status", "active"),
            "created_at": t.get("created_at")
        })
    
    return result

@router.post("/admin/tenants")
async def create_tenant(data: TenantCreate, company: dict = Depends(get_current_company)):
    """Create a new tenant"""
    # Verify apartment exists
    apt = await db.kiosk_apartments.find_one({
        "apartment_id": data.apartment_id,
        "company_id": company["company_id"]
    })
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    tenant_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    # Generate tenant code if not provided
    tenant_code = data.tenant_code
    if not tenant_code:
        count = await db.kiosk_tenants.count_documents({"company_id": company["company_id"]})
        tenant_code = f"H{str(count + 1).zfill(4)}"
    
    tenant = {
        "tenant_id": tenant_id,
        "company_id": company["company_id"],
        "name": data.name,
        "apartment_id": data.apartment_id,
        "apartment_number": apt["number"],
        "tenant_code": tenant_code.upper(),
        "email": data.email,
        "telefoon": data.telefoon,
        "phone": data.telefoon,
        "monthly_rent": data.monthly_rent,
        "outstanding_rent": data.monthly_rent,  # Start with first month rent
        "service_costs": 0,
        "fines": 0,
        "deposit_required": data.deposit_required,
        "deposit_paid": 0,
        "rent_billed_through": now.strftime("%Y-%m"),  # Current month
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_tenants.insert_one(tenant)
    
    # Update apartment status
    await db.kiosk_apartments.update_one(
        {"apartment_id": data.apartment_id},
        {"$set": {"status": "occupied", "updated_at": now}}
    )
    
    # Auto-create lease if dates provided
    lease_id = None
    if data.lease_start_date and data.lease_end_date:
        lease_id = generate_uuid()
        lease = {
            "lease_id": lease_id,
            "company_id": company["company_id"],
            "tenant_id": tenant_id,
            "tenant_name": data.name,
            "apartment_id": data.apartment_id,
            "apartment_number": apt["number"],
            "start_date": data.lease_start_date,
            "end_date": data.lease_end_date,
            "monthly_rent": data.monthly_rent,
            "voorwaarden": "",
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        await db.kiosk_leases.insert_one(lease)
    
    return {"tenant_id": tenant_id, "tenant_code": tenant_code, "lease_id": lease_id, "message": "Huurder aangemaakt"}

@router.put("/admin/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, company: dict = Depends(get_current_company)):
    """Update a tenant"""
    tenant = await db.kiosk_tenants.find_one({
        "tenant_id": tenant_id,
        "company_id": company["company_id"]
    })
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If apartment changed, update apartment number
    if "apartment_id" in update_data:
        apt = await db.kiosk_apartments.find_one({"apartment_id": update_data["apartment_id"]})
        if apt:
            update_data["apartment_number"] = apt["number"]
    
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": update_data}
    )
    return {"message": "Huurder bijgewerkt"}

@router.delete("/admin/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, company: dict = Depends(get_current_company)):
    """Delete/deactivate a tenant"""
    tenant = await db.kiosk_tenants.find_one({
        "tenant_id": tenant_id,
        "company_id": company["company_id"]
    })
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Deactivate instead of delete
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Update apartment status
    await db.kiosk_apartments.update_one(
        {"apartment_id": tenant["apartment_id"]},
        {"$set": {"status": "available", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Huurder gedeactiveerd"}

# Payments
@router.get("/admin/payments")
async def list_payments(
    company: dict = Depends(get_current_company),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    """List all payments with optional month filter"""
    query = {"company_id": company["company_id"]}
    
    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    payments = await db.kiosk_payments.find(query).sort("created_at", -1).to_list(1000)
    return [{
        "payment_id": p["payment_id"],
        "tenant_name": p.get("tenant_name"),
        "tenant_code": p.get("tenant_code"),
        "apartment_number": p.get("apartment_number"),
        "amount": p["amount"],
        "payment_type": p["payment_type"],
        "payment_method": p.get("payment_method", "cash"),
        "description": p.get("description"),
        "rent_month": p.get("rent_month"),
        "covered_months": p.get("covered_months", []),
        "remaining_rent": p.get("remaining_rent"),
        "remaining_service": p.get("remaining_service"),
        "remaining_fines": p.get("remaining_fines"),
        "kwitantie_nummer": p.get("kwitantie_nummer"),
        "created_at": p["created_at"]
    } for p in payments]

@router.get("/admin/payments/{payment_id}")
async def get_payment(payment_id: str, company: dict = Depends(get_current_company)):
    """Get single payment details"""
    payment = await db.kiosk_payments.find_one({
        "payment_id": payment_id,
        "company_id": company["company_id"]
    })
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    return {
        "payment_id": payment["payment_id"],
        "tenant_name": payment.get("tenant_name"),
        "tenant_code": payment.get("tenant_code"),
        "apartment_number": payment.get("apartment_number"),
        "amount": payment["amount"],
        "payment_type": payment["payment_type"],
        "payment_method": payment.get("payment_method", "cash"),
        "description": payment.get("description"),
        "rent_month": payment.get("rent_month"),
        "covered_months": payment.get("covered_months", []),
        "remaining_rent": payment.get("remaining_rent"),
        "remaining_service": payment.get("remaining_service"),
        "remaining_fines": payment.get("remaining_fines"),
        "kwitantie_nummer": payment.get("kwitantie_nummer"),
        "created_at": payment["created_at"]
    }


@router.get("/admin/payments/{payment_id}/receipt")
async def generate_receipt(payment_id: str, token: Optional[str] = None):
    """Generate printable receipt/kwitantie HTML"""
    if not token:
        raise HTTPException(status_code=401, detail="Token vereist")
    try:
        payload = decode_token(token)
        company_id = payload["company_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")
    
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id, "company_id": company_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    
    # Use stamp settings from Instellingen, fallback to company name
    stamp_name = comp.get("stamp_company_name") or comp.get("name", "Onbekend")
    stamp_address = comp.get("stamp_address") or comp.get("adres") or "Paramaribo, Suriname"
    stamp_phone = comp.get("stamp_phone") or comp.get("telefoon") or ""
    stamp_whatsapp = comp.get("stamp_whatsapp") or ""
    company_email = comp.get("email", "")
    
    # Stamp initials
    initials = "".join([w[0] for w in stamp_name.split()[:3] if w]).upper()
    
    tenant_name = payment.get("tenant_name", "Onbekend")
    tenant_code = payment.get("tenant_code", "")
    apartment_number = payment.get("apartment_number", "")
    amount = payment.get("amount", 0)
    payment_type = payment.get("payment_type", "")
    payment_method = payment.get("payment_method", "cash")
    description = payment.get("description", "")
    rent_month = payment.get("rent_month", "")
    kwitantie_nummer = payment.get("kwitantie_nummer", "")
    created_at = payment.get("created_at")
    
    # Format date
    if created_at:
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
        date_fmt = f"{created_at.day} {months_nl[created_at.month-1]} {created_at.year}"
        time_fmt = created_at.strftime("%H:%M")
    else:
        date_fmt = "-"
        time_fmt = ""
    
    # Payment type label
    type_labels = {
        "monthly_rent": "Maandhuur",
        "service_costs": "Servicekosten",
        "deposit": "Borg",
        "fine": "Boete",
        "other": "Overig"
    }
    type_label = type_labels.get(payment_type, payment_type.replace("_", " ").title())
    
    method_labels = {"cash": "Contant", "bank": "Bank", "pin": "PIN"}
    method_label = method_labels.get(payment_method, payment_method)
    
    # Format rent month
    rent_month_label = ""
    if rent_month:
        try:
            y, m = rent_month.split("-")
            months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            rent_month_label = f"{months_nl[int(m)-1]} {y}"
        except Exception:
            rent_month_label = rent_month

    html = f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Kwitantie {kwitantie_nummer}</title>
<style>
  @page {{ size: A5; margin: 15mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    max-width: 160mm;
    margin: 0 auto;
    padding: 25px 30px;
    background: #fff;
  }}
  .header {{
    border-bottom: 2px solid #2c3e50;
    padding-bottom: 15px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }}
  .header-left {{ flex: 1; }}
  .company-name {{
    font-size: 16pt;
    font-weight: bold;
    color: #2c3e50;
    text-transform: uppercase;
    letter-spacing: 1px;
  }}
  .company-info {{
    font-size: 8pt;
    color: #7f8c8d;
    margin-top: 4px;
    line-height: 1.4;
  }}
  .receipt-title {{
    text-align: center;
    margin-bottom: 20px;
  }}
  .receipt-title h1 {{
    font-size: 18pt;
    color: #2c3e50;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .receipt-number {{
    font-size: 10pt;
    color: #e67e22;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    margin-top: 4px;
  }}
  .details-table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }}
  .details-table td {{
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    font-size: 10pt;
  }}
  .details-table td:first-child {{
    color: #7f8c8d;
    width: 35%;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  .details-table td:last-child {{
    font-weight: 600;
    color: #1a1a1a;
  }}
  .amount-row {{
    background: #f8f9fa;
    border-top: 2px solid #2c3e50 !important;
    border-bottom: 2px solid #2c3e50 !important;
  }}
  .amount-row td {{
    padding: 12px;
    font-size: 14pt !important;
    font-weight: bold !important;
  }}
  .amount-row td:last-child {{
    color: #27ae60;
    text-align: right;
    font-size: 16pt !important;
  }}
  .stamp-section {{
    text-align: center;
    margin: 25px 0 15px;
  }}
  .stamp-rect {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border: 2.5px solid #991b1b;
    padding: 10px 16px;
    transform: rotate(-5deg);
    opacity: 0.8;
    background: rgba(255,255,255,0.5);
  }}
  .stamp-house {{
    flex-shrink: 0;
  }}
  .stamp-info p {{
    margin: 0;
    line-height: 1.4;
  }}
  .stamp-info .stamp-name {{
    color: #991b1b;
    font-weight: bold;
    font-size: 9pt;
  }}
  .stamp-info .stamp-detail {{
    color: #1a1a1a;
    font-size: 8pt;
    font-weight: 500;
  }}
  .footer {{
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 7.5pt;
    color: #aaa;
    text-align: center;
    line-height: 1.4;
  }}
  .print-bar {{
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #2c3e50;
    padding: 10px 20px;
    text-align: center;
    z-index: 1000;
  }}
  .print-bar button {{
    background: #e67e22;
    color: white;
    border: none;
    padding: 8px 30px;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin: 0 5px;
  }}
  .print-bar button:hover {{ background: #d35400; }}
  @media print {{
    .print-bar {{ display: none; }}
    body {{ padding: 0; margin: 0; }}
  }}
</style>
</head>
<body>
<div class="print-bar">
  <button onclick="window.print()">Afdrukken / Print</button>
  <button onclick="window.close()">Sluiten</button>
</div>

<div style="margin-top: 50px;">

<div class="header">
  <div class="header-left">
    <div class="company-name">{stamp_name}</div>
    <div class="company-info">
      {stamp_address}<br/>
      {('Tel: ' + stamp_phone) if stamp_phone else ''}{(' | WhatsApp: ' + stamp_whatsapp) if stamp_whatsapp else ''}<br/>
      {company_email}
    </div>
  </div>
</div>

<div class="receipt-title">
  <h1>Kwitantie</h1>
  <div class="receipt-number">{kwitantie_nummer}</div>
</div>

<table class="details-table">
  <tr>
    <td>Datum</td>
    <td>{date_fmt}{(' om ' + time_fmt) if time_fmt else ''}</td>
  </tr>
  <tr>
    <td>Huurder</td>
    <td>{tenant_name} {('(' + tenant_code + ')') if tenant_code else ''}</td>
  </tr>
  <tr>
    <td>Appartement</td>
    <td>{apartment_number}</td>
  </tr>
  <tr>
    <td>Type betaling</td>
    <td>{type_label}</td>
  </tr>
  {f'<tr><td>Huurmaand</td><td>{rent_month_label}</td></tr>' if rent_month_label else ''}
  <tr>
    <td>Betalingswijze</td>
    <td>{method_label}</td>
  </tr>
  {f'<tr><td>Omschrijving</td><td>{description}</td></tr>' if description else ''}
  <tr class="amount-row">
    <td>Ontvangen bedrag</td>
    <td>SRD {amount:,.2f}</td>
  </tr>
</table>

<div class="stamp-section">
  <div class="stamp-rect">
    <svg class="stamp-house" width="40" height="36" viewBox="0 0 52 48" fill="none">
      <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
      <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
      <rect x="18" y="22" width="6" height="6" fill="white"/>
      <rect x="28" y="22" width="6" height="6" fill="white"/>
      <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
      <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
      <rect x="8" y="31" width="5" height="5" fill="white"/>
      <rect x="16" y="31" width="5" height="5" fill="white"/>
      <rect x="8" y="38" width="5" height="6" fill="white"/>
      <rect x="16" y="38" width="5" height="6" fill="white"/>
    </svg>
    <div class="stamp-info">
      <p class="stamp-name">{stamp_name}</p>
      <p class="stamp-detail">{stamp_address}</p>
      <p class="stamp-detail">Tel : {stamp_phone}</p>
      {f'<p class="stamp-detail">Whatsapp : {stamp_whatsapp}</p>' if stamp_whatsapp else ''}
    </div>
  </div>
</div>

<div class="footer">
  {stamp_name} &bull; {stamp_address}<br/>
  Kwitantie {kwitantie_nummer} &bull; Betaling-ID: {payment_id}
</div>

</div>
</body>
</html>"""
    
    return Response(content=html, media_type="text/html")


@router.delete("/admin/payments/{payment_id}")
async def delete_payment(payment_id: str, company: dict = Depends(get_current_company)):
    result = await db.kiosk_payments.delete_one({"payment_id": payment_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return {"message": "Betaling verwijderd"}

# ============== APPLY FINES ==============

@router.post("/admin/apply-fines")
async def apply_fines(company: dict = Depends(get_current_company)):
    """Apply fines to all tenants with outstanding rent past the billing day"""
    company_id = company["company_id"]
    billing_day = company.get("billing_day", 1)
    fine_amount = company.get("fine_amount", 0)
    
    if fine_amount <= 0:
        raise HTTPException(status_code=400, detail="Boetebedrag is niet ingesteld")
    
    now = datetime.now(timezone.utc)
    current_day = now.day
    
    # Only apply if we're past the billing day
    if current_day <= billing_day:
        raise HTTPException(status_code=400, detail=f"Boetes kunnen pas na dag {billing_day} worden toegepast")
    
    # Find all tenants with outstanding rent
    tenants = await db.kiosk_tenants.find({
        "company_id": company_id,
        "status": "active",
        "outstanding_rent": {"$gt": 0}
    }).to_list(1000)
    
    updated_count = 0
    for tenant in tenants:
        # Add fine to existing fines
        current_fines = tenant.get("fines", 0)
        await db.kiosk_tenants.update_one(
            {"tenant_id": tenant["tenant_id"]},
            {"$set": {
                "fines": current_fines + fine_amount,
                "updated_at": now
            }}
        )
        updated_count += 1
    
    return {
        "message": f"Boetes toegepast op {updated_count} huurders",
        "amount_per_tenant": fine_amount,
        "tenants_affected": updated_count
    }


@router.post("/admin/tenants/{tenant_id}/advance-month")
async def advance_tenant_month(tenant_id: str, company: dict = Depends(get_current_company)):
    """Manually advance tenant billing to next month: adds monthly_rent to outstanding"""
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    monthly_rent = tenant.get("monthly_rent", 0)
    outstanding = tenant.get("outstanding_rent", 0)
    billed_through = tenant.get("rent_billed_through", "")
    
    if not billed_through:
        billed_through = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Advance to next month
    billed_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
    next_month = billed_date + relativedelta(months=1)
    new_billed = next_month.strftime("%Y-%m")
    new_outstanding = outstanding + monthly_rent
    
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "outstanding_rent": new_outstanding,
            "rent_billed_through": new_billed,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Format month name
    month_names_nl = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
    month_label = f"{month_names_nl[next_month.month - 1]} {next_month.year}"
    
    return {
        "message": f"Huur voor {month_label} toegevoegd",
        "rent_billed_through": new_billed,
        "outstanding_rent": new_outstanding,
        "monthly_rent_added": monthly_rent
    }


# ============== LEASE AGREEMENTS ==============

@router.get("/admin/leases")
async def list_leases(company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    leases = await db.kiosk_leases.find(
        {"company_id": company_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return leases

@router.post("/admin/leases")
async def create_lease(data: LeaseCreate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    apt = await db.kiosk_apartments.find_one({"apartment_id": data.apartment_id, "company_id": company_id})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")

    now = datetime.now(timezone.utc)
    lease = {
        "lease_id": generate_uuid(),
        "company_id": company_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "apartment_id": data.apartment_id,
        "apartment_number": apt["number"],
        "start_date": data.start_date,
        "end_date": data.end_date,
        "monthly_rent": data.monthly_rent,
        "voorwaarden": data.voorwaarden or "",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await db.kiosk_leases.insert_one(lease)
    lease.pop("_id", None)
    return lease

@router.put("/admin/leases/{lease_id}")
async def update_lease(lease_id: str, data: LeaseUpdate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    existing = await db.kiosk_leases.find_one({"lease_id": lease_id, "company_id": company_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Huurovereenkomst niet gevonden")

    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.kiosk_leases.update_one({"lease_id": lease_id}, {"$set": updates})
    updated = await db.kiosk_leases.find_one({"lease_id": lease_id}, {"_id": 0})
    return updated

@router.delete("/admin/leases/{lease_id}")
async def delete_lease(lease_id: str, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    result = await db.kiosk_leases.delete_one({"lease_id": lease_id, "company_id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurovereenkomst niet gevonden")
    return {"message": "Huurovereenkomst verwijderd"}

@router.get("/admin/leases/{lease_id}/document")
async def generate_lease_document(lease_id: str, token: Optional[str] = None):
    """Generate professional Suriname lease document HTML with company stamp"""
    if not token:
        raise HTTPException(status_code=401, detail="Token vereist")
    try:
        payload = decode_token(token)
        company_id = payload["company_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")
    lease = await db.kiosk_leases.find_one({"lease_id": lease_id, "company_id": company_id}, {"_id": 0})
    if not lease:
        raise HTTPException(status_code=404, detail="Huurovereenkomst niet gevonden")
    
    comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    company_name = comp.get("name", "Onbekend") if comp else "Onbekend"
    company_address = comp.get("adres") or "Paramaribo, Suriname" if comp else "Paramaribo, Suriname"
    company_phone = comp.get("telefoon") or "" if comp else ""
    company_email = comp.get("email") or "" if comp else ""
    
    # Use official stamp from settings
    stamp_name = comp.get("stamp_company_name") or company_name if comp else company_name
    stamp_address = comp.get("stamp_address") or company_address if comp else company_address
    stamp_phone_val = comp.get("stamp_phone") or company_phone if comp else company_phone
    
    tenant_name = lease.get("tenant_name", "")
    apartment_number = lease.get("apartment_number", "")
    start_date = lease.get("start_date", "")
    end_date = lease.get("end_date", "")
    monthly_rent = lease.get("monthly_rent", 0)
    voorwaarden = lease.get("voorwaarden", "")
    
    # Format dates to Dutch
    def fmt_date(d):
        if not d:
            return "-"
        try:
            dt = datetime.strptime(d, "%Y-%m-%d")
            months = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            return f"{dt.day} {months[dt.month-1]} {dt.year}"
        except Exception:
            return d
    
    start_fmt = fmt_date(start_date)
    end_fmt = fmt_date(end_date)
    gen_date = datetime.now(timezone.utc).strftime('%d-%m-%Y')
    
    # Company initials for stamp - use stamp name from settings
    initials = "".join([w[0] for w in stamp_name.split()[:3] if w]).upper()

    html = f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Huurovereenkomst - {tenant_name}</title>
<style>
  @page {{ size: A4; margin: 25mm 20mm 25mm 20mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 30px 40px;
    background: #fff;
  }}
  
  /* Header / Briefhoofd */
  .letterhead {{
    border-bottom: 3px double #2c3e50;
    padding-bottom: 20px;
    margin-bottom: 30px;
    position: relative;
  }}
  .letterhead-left {{
    display: inline-block;
    vertical-align: top;
    width: 60%;
  }}
  .company-name {{
    font-size: 22pt;
    font-weight: bold;
    color: #2c3e50;
    letter-spacing: 1px;
    text-transform: uppercase;
  }}
  .company-subtitle {{
    font-size: 9pt;
    color: #7f8c8d;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
  }}
  .company-details {{
    font-size: 9pt;
    color: #555;
    margin-top: 8px;
    line-height: 1.5;
  }}
  .letterhead-right {{
    display: inline-block;
    vertical-align: top;
    width: 38%;
    text-align: right;
  }}
  
  /* Document titel */
  .doc-title {{
    text-align: center;
    margin: 25px 0 10px 0;
  }}
  .doc-title h1 {{
    font-size: 18pt;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #2c3e50;
    border-top: 1px solid #bdc3c7;
    border-bottom: 1px solid #bdc3c7;
    padding: 8px 0;
    display: inline-block;
  }}
  .doc-subtitle {{
    text-align: center;
    font-size: 10pt;
    color: #7f8c8d;
    margin-bottom: 25px;
  }}
  
  /* Artikelen */
  .artikel {{
    margin-bottom: 20px;
    page-break-inside: avoid;
  }}
  .artikel h2 {{
    font-size: 11pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #2c3e50;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }}
  .artikel p {{
    font-size: 11pt;
    text-align: justify;
    margin-bottom: 6px;
  }}
  .artikel .field {{
    font-weight: bold;
  }}
  
  /* Data tabel */
  .data-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 11pt;
  }}
  .data-table td {{
    padding: 8px 12px;
    border: 1px solid #d5d8dc;
    vertical-align: top;
  }}
  .data-table td:first-child {{
    background: #f8f9fa;
    font-weight: bold;
    width: 180px;
    color: #2c3e50;
  }}
  
  /* Voorwaarden */
  .voorwaarden-box {{
    background: #fafbfc;
    border: 1px solid #d5d8dc;
    border-left: 4px solid #2c3e50;
    padding: 15px 18px;
    font-size: 10.5pt;
    line-height: 1.7;
    white-space: pre-wrap;
    margin: 10px 0;
  }}
  
  /* Handtekeningen */
  .signatures-section {{
    margin-top: 50px;
    page-break-inside: avoid;
  }}
  .sig-row {{
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
  }}
  .sig-block {{
    width: 42%;
    text-align: center;
  }}
  .sig-space {{
    height: 70px;
    border-bottom: 1px solid #333;
    margin-bottom: 5px;
    position: relative;
  }}
  .sig-label {{
    font-size: 10pt;
    color: #555;
  }}
  .sig-name {{
    font-size: 11pt;
    font-weight: bold;
    margin-top: 3px;
  }}
  .sig-date {{
    font-size: 9pt;
    color: #999;
    margin-top: 2px;
  }}
  
  /* Bedrijfsstempel */
  .stamp {{
    position: relative;
    display: inline-block;
    margin-top: 15px;
  }}
  .stamp-rect {{
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border: 3px solid #991b1b;
    padding: 12px 18px;
    transform: rotate(-5deg);
    opacity: 0.8;
    background: rgba(255,255,255,0.5);
  }}
  .stamp-house {{
    flex-shrink: 0;
  }}
  .stamp-info p {{
    margin: 0;
    line-height: 1.4;
  }}
  .stamp-info .stamp-name {{
    color: #991b1b;
    font-weight: bold;
    font-size: 10pt;
  }}
  .stamp-info .stamp-detail {{
    color: #1a1a1a;
    font-size: 9pt;
    font-weight: 500;
  }}
  
  /* Footer */
  .doc-footer {{
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    font-size: 8pt;
    color: #aaa;
    text-align: center;
    line-height: 1.5;
  }}
  
  /* Print */
  @media print {{
    body {{ padding: 0; margin: 0; }}
    .no-print {{ display: none; }}
  }}
  
  /* Print button */
  .print-bar {{
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #2c3e50;
    padding: 10px 20px;
    text-align: center;
    z-index: 1000;
  }}
  .print-bar button {{
    background: #e67e22;
    color: white;
    border: none;
    padding: 8px 30px;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin: 0 5px;
  }}
  .print-bar button:hover {{ background: #d35400; }}
</style>
</head>
<body>
<div class="print-bar no-print">
  <button onclick="window.print()">Afdrukken / Print</button>
  <button onclick="window.close()">Sluiten</button>
</div>

<div style="margin-top: 50px;">

<!-- BRIEFHOOFD -->
<div class="letterhead">
  <div class="letterhead-left">
    <div class="company-name">{company_name}</div>
    <div class="company-subtitle">Vastgoedbeheer &amp; Verhuur</div>
    <div class="company-details">
      {company_address}<br/>
      {('Tel: ' + company_phone + '<br/>') if company_phone else ''}
      {('E-mail: ' + company_email) if company_email else ''}
    </div>
  </div>
  <div class="letterhead-right">
    <div class="stamp">
      <div class="stamp-rect">
        <svg class="stamp-house" width="46" height="42" viewBox="0 0 52 48" fill="none">
          <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
          <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
          <rect x="18" y="22" width="6" height="6" fill="white"/>
          <rect x="28" y="22" width="6" height="6" fill="white"/>
          <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
          <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
          <rect x="8" y="31" width="5" height="5" fill="white"/>
          <rect x="16" y="31" width="5" height="5" fill="white"/>
          <rect x="8" y="38" width="5" height="6" fill="white"/>
          <rect x="16" y="38" width="5" height="6" fill="white"/>
        </svg>
        <div class="stamp-info">
          <p class="stamp-name">{stamp_name}</p>
          <p class="stamp-detail">{stamp_address}</p>
          <p class="stamp-detail">Tel : {stamp_phone_val}</p>
          {f'<p class="stamp-detail">Whatsapp : {comp.get("stamp_whatsapp", "")}</p>' if comp.get("stamp_whatsapp") else ''}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- TITEL -->
<div class="doc-title">
  <h1>Huurovereenkomst</h1>
</div>
<div class="doc-subtitle">
  Woonruimte &mdash; Overeenkomst Nr. {lease_id[:8].upper()}
</div>

<!-- ARTIKEL 1: PARTIJEN -->
<div class="artikel">
  <h2>Artikel 1 &mdash; De Ondergetekenden</h2>
  <p>De ondergetekenden:</p>
  <table class="data-table">
    <tr><td>Verhuurder</td><td><span class="field">{company_name}</span>, gevestigd te {company_address or 'Paramaribo, Suriname'}, hierna te noemen "Verhuurder"</td></tr>
    <tr><td>Huurder</td><td><span class="field">{tenant_name}</span>, hierna te noemen "Huurder"</td></tr>
  </table>
  <p>Zijn overeengekomen als volgt:</p>
</div>

<!-- ARTIKEL 2: HET GEHUURDE -->
<div class="artikel">
  <h2>Artikel 2 &mdash; Het Gehuurde</h2>
  <p>Verhuurder verhuurt aan Huurder en Huurder huurt van Verhuurder het navolgende:</p>
  <table class="data-table">
    <tr><td>Object</td><td>Appartement <span class="field">{apartment_number}</span></td></tr>
    <tr><td>Adres</td><td>{company_address or 'Paramaribo, Suriname'}</td></tr>
    <tr><td>Bestemming</td><td>Uitsluitend als woonruimte ten behoeve van Huurder</td></tr>
  </table>
</div>

<!-- ARTIKEL 3: HUURPERIODE -->
<div class="artikel">
  <h2>Artikel 3 &mdash; Duur van de Overeenkomst</h2>
  <p>Deze huurovereenkomst is aangegaan voor de volgende periode:</p>
  <table class="data-table">
    <tr><td>Ingangsdatum</td><td><span class="field">{start_fmt}</span></td></tr>
    <tr><td>Einddatum</td><td><span class="field">{end_fmt}</span></td></tr>
  </table>
  <p>Na afloop van de hierboven genoemde periode wordt de overeenkomst voortgezet voor onbepaalde tijd, tenzij een der partijen uiterlijk &eacute;&eacute;n (1) maand voor het verstrijken van enige termijn schriftelijk opzegt.</p>
</div>

<!-- ARTIKEL 4: HUURPRIJS -->
<div class="artikel">
  <h2>Artikel 4 &mdash; Huurprijs en Betaling</h2>
  <table class="data-table">
    <tr><td>Maandelijkse huur</td><td><span class="field">SRD {monthly_rent:,.2f}</span> (Surinaamse Dollar)</td></tr>
    <tr><td>Betalingswijze</td><td>Per maand, bij vooruitbetaling v&oacute;&oacute;r de eerste van elke kalendermaand</td></tr>
  </table>
  <p>Bij niet tijdige betaling is Huurder van rechtswege in verzuim en is Huurder een boete verschuldigd conform de geldende bedrijfsvoorwaarden van Verhuurder.</p>
</div>

<!-- ARTIKEL 5: BORG -->
<div class="artikel">
  <h2>Artikel 5 &mdash; Waarborgsom</h2>
  <p>Huurder betaalt bij aanvang van de huurovereenkomst een waarborgsom ter grootte van <span class="field">&eacute;&eacute;n (1) maand huur</span>, zijnde <span class="field">SRD {monthly_rent:,.2f}</span>. Deze borg wordt na be&euml;indiging van de huurovereenkomst terugbetaald, onder aftrek van eventuele kosten of schade.</p>
</div>

<!-- ARTIKEL 6: VERPLICHTINGEN -->
<div class="artikel">
  <h2>Artikel 6 &mdash; Verplichtingen van de Huurder</h2>
  <p>Huurder verplicht zich:</p>
  <p style="padding-left: 20px;">
    a) het gehuurde als een goed huurder te gebruiken en te onderhouden;<br/>
    b) geen wijzigingen aan te brengen aan het gehuurde zonder schriftelijke toestemming van Verhuurder;<br/>
    c) het gehuurde uitsluitend te gebruiken voor het in Artikel 2 genoemde doel;<br/>
    d) geen overlast te veroorzaken aan medebewoners of omwonenden;<br/>
    e) de Verhuurder toegang te verlenen voor noodzakelijk onderhoud of inspectie, na voorafgaande kennisgeving.
  </p>
</div>

<!-- ARTIKEL 7: ONDERHOUD -->
<div class="artikel">
  <h2>Artikel 7 &mdash; Onderhoud en Reparaties</h2>
  <p>Klein onderhoud en dagelijkse reparaties komen voor rekening van Huurder. Groot onderhoud en structurele reparaties komen voor rekening van Verhuurder, tenzij de schade is veroorzaakt door toedoen of nalatigheid van Huurder.</p>
</div>

<!-- ARTIKEL 8: BEEINDIGING -->
<div class="artikel">
  <h2>Artikel 8 &mdash; Be&euml;indiging</h2>
  <p>Deze overeenkomst kan worden be&euml;indigd:</p>
  <p style="padding-left: 20px;">
    a) door het verstrijken van de overeengekomen termijn;<br/>
    b) door schriftelijke opzegging met inachtneming van een opzegtermijn van ten minste &eacute;&eacute;n (1) maand;<br/>
    c) door ontbinding wegens wanprestatie van een der partijen, waaronder begrepen het niet nakomen van de betalingsverplichtingen.
  </p>
</div>

{'<div class="artikel"><h2>Artikel 9 &mdash; Bijzondere Voorwaarden</h2><div class="voorwaarden-box">' + voorwaarden + '</div></div>' if voorwaarden else ''}

<!-- ARTIKEL 9/10: TOEPASSELIJK RECHT -->
<div class="artikel">
  <h2>Artikel {'10' if voorwaarden else '9'} &mdash; Toepasselijk Recht</h2>
  <p>Op deze huurovereenkomst is het <span class="field">Surinaams recht</span> van toepassing. Geschillen voortvloeiend uit deze overeenkomst worden voorgelegd aan de bevoegde rechter in het Kanton Paramaribo.</p>
</div>

<!-- ONDERTEKENING -->
<div class="signatures-section">
  <p style="font-size: 11pt; margin-bottom: 5px;">Aldus opgemaakt en ondertekend in tweevoud te <span class="field">Paramaribo</span>, op <span class="field">{gen_date}</span>.</p>
  
  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-space">
        <div style="position: absolute; top: 5px; left: 10px; transform: rotate(-5deg); opacity: 0.6;">
          <div class="stamp-rect" style="padding: 6px 10px; gap: 6px; border-width: 2px;">
            <svg width="24" height="22" viewBox="0 0 52 48" fill="none">
              <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
              <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
              <rect x="18" y="22" width="6" height="6" fill="white"/>
              <rect x="28" y="22" width="6" height="6" fill="white"/>
              <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
              <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
              <rect x="8" y="31" width="5" height="5" fill="white"/>
              <rect x="16" y="31" width="5" height="5" fill="white"/>
            </svg>
            <div style="line-height:1.2;">
              <p style="color:#991b1b;font-weight:bold;font-size:6pt;margin:0;">{stamp_name}</p>
              <p style="color:#1a1a1a;font-size:5.5pt;margin:0;">{stamp_address}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="sig-label">Verhuurder</div>
      <div class="sig-name">{company_name}</div>
    </div>
    <div class="sig-block">
      <div class="sig-space"></div>
      <div class="sig-label">Huurder</div>
      <div class="sig-name">{tenant_name}</div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="doc-footer">
  {company_name} &bull; Vastgoedbeheer &bull; {company_address or 'Paramaribo, Suriname'}<br/>
  Overeenkomst-ID: {lease_id} &bull; Datum: {gen_date}
</div>

</div>
</body>
</html>"""
    
    return Response(content=html, media_type="text/html")



# ============== BANK/KAS ENDPOINTS ==============

@router.get("/admin/kas")
async def list_kas_entries(company: dict = Depends(get_current_company)):
    """List all cash register entries - expenses only. Income comes from payments."""
    company_id = company["company_id"]
    
    # Kas entries = only expenses and salaries
    entries = await db.kiosk_kas.find({"company_id": company_id}).sort("created_at", -1).to_list(1000)
    
    # Total income = sum of all rent payments (from kiosk_payments)
    payments = await db.kiosk_payments.find({"company_id": company_id}).to_list(10000)
    total_income = sum(p.get("amount", 0) for p in payments)
    
    # Total expense = sum of all kas entries (expenses + salaries)
    total_expense = sum(e.get("amount", 0) for e in entries if e.get("entry_type") in ("expense", "salary"))
    balance = total_income - total_expense
    
    result_entries = []
    for e in entries:
        if e.get("entry_type") == "income":
            continue  # Skip old income entries
        result_entries.append({
            "entry_id": e["entry_id"],
            "entry_type": e["entry_type"],
            "amount": e["amount"],
            "description": e["description"],
            "category": e.get("category", ""),
            "related_tenant_name": e.get("related_tenant_name", ""),
            "related_employee_name": e.get("related_employee_name", ""),
            "payment_id": e.get("payment_id", ""),
            "created_at": e.get("created_at")
        })
    
    return {
        "entries": result_entries,
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance
    }

@router.post("/admin/kas")
async def create_kas_entry(data: CashEntryCreate, company: dict = Depends(get_current_company)):
    """Create a cash register entry"""
    entry_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    entry = {
        "entry_id": entry_id,
        "company_id": company["company_id"],
        "entry_type": data.entry_type,
        "amount": data.amount,
        "description": data.description,
        "category": data.category or ("rent" if data.entry_type == "income" else "other"),
        "related_tenant_id": data.related_tenant_id or "",
        "related_tenant_name": "",
        "related_employee_id": data.related_employee_id or "",
        "related_employee_name": "",
        "payment_id": data.payment_id or "",
        "created_at": now
    }
    
    # Look up related names
    if data.related_tenant_id:
        t = await db.kiosk_tenants.find_one({"tenant_id": data.related_tenant_id})
        if t:
            entry["related_tenant_name"] = t.get("name", "")
    if data.related_employee_id:
        emp = await db.kiosk_employees.find_one({"employee_id": data.related_employee_id})
        if emp:
            entry["related_employee_name"] = emp.get("name", "")
    
    await db.kiosk_kas.insert_one(entry)
    return {"entry_id": entry_id, "message": "Kas boeking aangemaakt"}

@router.delete("/admin/kas/{entry_id}")
async def delete_kas_entry(entry_id: str, company: dict = Depends(get_current_company)):
    """Delete a cash register entry"""
    result = await db.kiosk_kas.delete_one({"entry_id": entry_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Boeking niet gevonden")
    return {"message": "Boeking verwijderd"}


# ============== WERKNEMERS ENDPOINTS ==============

@router.get("/admin/employees")
async def list_employees(company: dict = Depends(get_current_company)):
    """List all employees"""
    company_id = company["company_id"]
    employees = await db.kiosk_employees.find({"company_id": company_id}).to_list(1000)
    
    result = []
    for e in employees:
        # Get total paid
        payments = await db.kiosk_kas.find({
            "company_id": company_id,
            "related_employee_id": e["employee_id"],
            "entry_type": "salary"
        }).to_list(1000)
        total_paid = sum(p.get("amount", 0) for p in payments)
        
        result.append({
            "employee_id": e["employee_id"],
            "name": e["name"],
            "functie": e.get("functie", ""),
            "maandloon": e.get("maandloon", 0),
            "telefoon": e.get("telefoon", ""),
            "email": e.get("email", ""),
            "start_date": e.get("start_date", ""),
            "status": e.get("status", "active"),
            "total_paid": total_paid,
            "created_at": e.get("created_at")
        })
    
    return result

@router.post("/admin/employees")
async def create_employee(data: EmployeeCreate, company: dict = Depends(get_current_company)):
    """Create a new employee"""
    employee_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    employee = {
        "employee_id": employee_id,
        "company_id": company["company_id"],
        "name": data.name,
        "functie": data.functie or "",
        "maandloon": data.maandloon,
        "telefoon": data.telefoon or "",
        "email": data.email or "",
        "start_date": data.start_date or now.strftime("%Y-%m-%d"),
        "status": "active",
        "created_at": now
    }
    
    await db.kiosk_employees.insert_one(employee)
    return {"employee_id": employee_id, "message": "Werknemer aangemaakt"}

@router.put("/admin/employees/{employee_id}")
async def update_employee(employee_id: str, data: EmployeeUpdate, company: dict = Depends(get_current_company)):
    """Update an employee"""
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Geen wijzigingen")
    updates["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.kiosk_employees.update_one(
        {"employee_id": employee_id, "company_id": company["company_id"]},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer bijgewerkt"}

@router.delete("/admin/employees/{employee_id}")
async def delete_employee(employee_id: str, company: dict = Depends(get_current_company)):
    """Delete an employee"""
    result = await db.kiosk_employees.delete_one(
        {"employee_id": employee_id, "company_id": company["company_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

@router.post("/admin/employees/{employee_id}/pay")
async def pay_employee(employee_id: str, company: dict = Depends(get_current_company)):
    """Pay an employee's monthly salary - creates a kas entry"""
    emp = await db.kiosk_employees.find_one({
        "employee_id": employee_id,
        "company_id": company["company_id"]
    })
    if not emp:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    now = datetime.now(timezone.utc)
    month_label = now.strftime("%B %Y")
    
    entry_id = generate_uuid()
    entry = {
        "entry_id": entry_id,
        "company_id": company["company_id"],
        "entry_type": "salary",
        "amount": emp["maandloon"],
        "description": f"Loon {emp['name']} - {month_label}",
        "category": "salary",
        "related_employee_id": employee_id,
        "related_employee_name": emp["name"],
        "related_tenant_id": "",
        "related_tenant_name": "",
        "payment_id": "",
        "created_at": now
    }
    
    await db.kiosk_kas.insert_one(entry)
    return {"entry_id": entry_id, "amount": emp["maandloon"], "message": f"Loon uitbetaald: SRD {emp['maandloon']:.2f}"}



# ============== SHELLY STROOMBREKERS ==============

class ShellyDeviceCreate(BaseModel):
    apartment_id: str
    device_ip: str
    device_name: Optional[str] = None
    device_type: str = "gen1"  # gen1 or gen2
    channel: int = 0

class ShellyDeviceUpdate(BaseModel):
    device_ip: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    channel: Optional[int] = None

@router.get("/admin/shelly-devices")
async def get_shelly_devices(company: dict = Depends(get_current_company)):
    devices = await db.kiosk_shelly_devices.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).to_list(100)
    return devices

@router.post("/admin/shelly-devices")
async def add_shelly_device(data: ShellyDeviceCreate, company: dict = Depends(get_current_company)):
    device_id = generate_uuid()
    device = {
        "device_id": device_id,
        "company_id": company["company_id"],
        "apartment_id": data.apartment_id,
        "device_ip": data.device_ip,
        "device_name": data.device_name or f"Shelly {data.device_ip}",
        "device_type": data.device_type,
        "channel": data.channel,
        "last_status": None,
        "created_at": datetime.now(timezone.utc)
    }
    await db.kiosk_shelly_devices.insert_one(device)
    return {"device_id": device_id, "message": "Shelly apparaat toegevoegd"}

@router.put("/admin/shelly-devices/{device_id}")
async def update_shelly_device(device_id: str, data: ShellyDeviceUpdate, company: dict = Depends(get_current_company)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Geen wijzigingen")
    await db.kiosk_shelly_devices.update_one(
        {"device_id": device_id, "company_id": company["company_id"]},
        {"$set": updates}
    )
    return {"message": "Apparaat bijgewerkt"}

@router.delete("/admin/shelly-devices/{device_id}")
async def delete_shelly_device(device_id: str, company: dict = Depends(get_current_company)):
    await db.kiosk_shelly_devices.delete_one(
        {"device_id": device_id, "company_id": company["company_id"]}
    )
    return {"message": "Apparaat verwijderd"}

@router.post("/admin/shelly-devices/{device_id}/control")
async def control_shelly_device(device_id: str, action: str = "toggle", company: dict = Depends(get_current_company)):
    """Control a Shelly relay: action = on, off, toggle"""
    device = await db.kiosk_shelly_devices.find_one(
        {"device_id": device_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not device:
        raise HTTPException(status_code=404, detail="Apparaat niet gevonden")
    
    ip = device["device_ip"]
    ch = device.get("channel", 0)
    dtype = device.get("device_type", "gen1")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            if dtype == "gen2":
                if action == "toggle":
                    url = f"http://{ip}/rpc/switch.toggle?id={ch}"
                else:
                    on_val = "true" if action == "on" else "false"
                    url = f"http://{ip}/rpc/switch.set?id={ch}&on={on_val}"
                resp = await client.get(url)
                result = resp.json()
                new_status = result.get("was_on") is False if action == "toggle" else (action == "on")
            else:
                url = f"http://{ip}/relay/{ch}?turn={action}"
                resp = await client.get(url)
                result = resp.json()
                new_status = result.get("ison", False)
        
        status_str = "on" if new_status else "off"
        await db.kiosk_shelly_devices.update_one(
            {"device_id": device_id},
            {"$set": {"last_status": status_str, "last_check": datetime.now(timezone.utc)}}
        )
        return {"status": status_str, "message": f"Stroombreker {'AAN' if new_status else 'UIT'}"}
    
    except httpx.TimeoutException:
        return {"status": "unreachable", "message": f"Apparaat {ip} niet bereikbaar (timeout)"}
    except httpx.ConnectError:
        return {"status": "unreachable", "message": f"Apparaat {ip} niet bereikbaar (geen verbinding)"}
    except Exception as e:
        return {"status": "error", "message": f"Fout: {str(e)}"}

@router.get("/admin/shelly-devices/{device_id}/status")
async def get_shelly_status(device_id: str, company: dict = Depends(get_current_company)):
    """Get current status of a Shelly relay"""
    device = await db.kiosk_shelly_devices.find_one(
        {"device_id": device_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not device:
        raise HTTPException(status_code=404, detail="Apparaat niet gevonden")
    
    ip = device["device_ip"]
    ch = device.get("channel", 0)
    dtype = device.get("device_type", "gen1")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            if dtype == "gen2":
                resp = await client.get(f"http://{ip}/rpc/Switch.GetStatus?id={ch}")
                result = resp.json()
                is_on = result.get("output", False)
                power = result.get("apower", 0)
            else:
                resp = await client.get(f"http://{ip}/relay/{ch}")
                result = resp.json()
                is_on = result.get("ison", False)
                power = result.get("power", 0)
        
        status_str = "on" if is_on else "off"
        await db.kiosk_shelly_devices.update_one(
            {"device_id": device_id},
            {"$set": {"last_status": status_str, "last_check": datetime.now(timezone.utc)}}
        )
        return {"status": status_str, "power_w": power, "online": True}
    
    except Exception:
        return {"status": device.get("last_status", "unknown"), "power_w": 0, "online": False}

@router.post("/admin/shelly-devices/refresh-all")
async def refresh_all_shelly(company: dict = Depends(get_current_company)):
    """Refresh status of all Shelly devices"""
    devices = await db.kiosk_shelly_devices.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).to_list(100)
    
    results = []
    async with httpx.AsyncClient(timeout=3.0) as client:
        for dev in devices:
            ip = dev["device_ip"]
            ch = dev.get("channel", 0)
            dtype = dev.get("device_type", "gen1")
            try:
                if dtype == "gen2":
                    resp = await client.get(f"http://{ip}/rpc/Switch.GetStatus?id={ch}")
                    r = resp.json()
                    is_on = r.get("output", False)
                else:
                    resp = await client.get(f"http://{ip}/relay/{ch}")
                    r = resp.json()
                    is_on = r.get("ison", False)
                
                status_str = "on" if is_on else "off"
                await db.kiosk_shelly_devices.update_one(
                    {"device_id": dev["device_id"]},
                    {"$set": {"last_status": status_str, "last_check": datetime.now(timezone.utc)}}
                )
                results.append({"device_id": dev["device_id"], "status": status_str, "online": True})
            except Exception:
                results.append({"device_id": dev["device_id"], "status": dev.get("last_status", "unknown"), "online": False})
    
    return results



# ============== WHATSAPP BUSINESS API ==============

class WhatsAppMessage(BaseModel):
    tenant_id: str
    message_type: str  # reminder, fine, overdue, custom
    custom_message: Optional[str] = None

@router.post("/admin/whatsapp/send")
async def send_whatsapp_message(data: WhatsAppMessage, company: dict = Depends(get_current_company)):
    """Send WhatsApp message to tenant via Business API"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    
    if not comp.get("wa_enabled") or not comp.get("wa_api_token") or not comp.get("wa_phone_id"):
        raise HTTPException(status_code=400, detail="WhatsApp Business API is niet geconfigureerd. Ga naar Instellingen.")
    
    tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id, "company_id": company["company_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    phone = tenant.get("phone") or tenant.get("telefoon", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Huurder heeft geen telefoonnummer")
    
    # Clean phone number
    phone_clean = phone.replace(" ", "").replace("-", "").replace("+", "")
    if not phone_clean.startswith("597"):
        phone_clean = "597" + phone_clean
    
    company_name = comp.get("stamp_company_name") or comp.get("name", "")
    tenant_name = tenant.get("name", "")
    outstanding = tenant.get("outstanding_rent", 0) + tenant.get("service_costs", 0) + tenant.get("fines", 0)
    
    # Build message based on type
    if data.message_type == "reminder":
        message = (f"Beste {tenant_name},\n\n"
                   f"Dit is een herinnering van {company_name}.\n"
                   f"Uw openstaand saldo is SRD {outstanding:,.2f}.\n"
                   f"Gelieve zo spoedig mogelijk te betalen.\n\n"
                   f"Met vriendelijke groet,\n{company_name}")
    elif data.message_type == "fine":
        message = (f"Beste {tenant_name},\n\n"
                   f"Er is een boete toegepast op uw account bij {company_name}.\n"
                   f"Uw totaal openstaand saldo is nu SRD {outstanding:,.2f}.\n"
                   f"Neem contact op voor vragen.\n\n"
                   f"Met vriendelijke groet,\n{company_name}")
    elif data.message_type == "overdue":
        overdue_months = tenant.get("overdue_months", [])
        months_str = ", ".join(overdue_months) if overdue_months else "onbekend"
        message = (f"Beste {tenant_name},\n\n"
                   f"Uw huur bij {company_name} is achterstallig.\n"
                   f"Achterstand maanden: {months_str}\n"
                   f"Totaal openstaand: SRD {outstanding:,.2f}\n\n"
                   f"Gelieve zo spoedig mogelijk te betalen om verdere maatregelen te voorkomen.\n\n"
                   f"Met vriendelijke groet,\n{company_name}")
    elif data.message_type == "custom" and data.custom_message:
        message = data.custom_message
    else:
        raise HTTPException(status_code=400, detail="Ongeldig berichttype")
    
    # Add bank info if available
    bank_name = comp.get("bank_name")
    bank_account = comp.get("bank_account_number")
    bank_holder = comp.get("bank_account_name")
    if bank_name and bank_account:
        message += f"\n\n--- Bankgegevens ---\nBank: {bank_name}\nRekening: {bank_account}"
        if bank_holder:
            message += f"\nT.n.v.: {bank_holder}"
    
    # Send via WhatsApp Business Cloud API
    wa_url = comp.get("wa_api_url", "https://graph.facebook.com/v21.0")
    wa_token = comp["wa_api_token"]
    wa_phone_id = comp["wa_phone_id"]
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{wa_url}/{wa_phone_id}/messages",
                headers={
                    "Authorization": f"Bearer {wa_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": phone_clean,
                    "type": "text",
                    "text": {"body": message}
                }
            )
            result = resp.json()
        
        # Log the message
        await db.kiosk_wa_messages.insert_one({
            "message_id": generate_uuid(),
            "company_id": company["company_id"],
            "tenant_id": data.tenant_id,
            "tenant_name": tenant_name,
            "phone": phone_clean,
            "message_type": data.message_type,
            "message": message,
            "status": "sent" if resp.status_code == 200 else "failed",
            "api_response": str(result),
            "created_at": datetime.now(timezone.utc)
        })
        
        if resp.status_code == 200:
            return {"status": "sent", "message": f"Bericht verstuurd naar {tenant_name}"}
        else:
            return {"status": "failed", "message": f"Verzending mislukt: {result.get('error', {}).get('message', 'Onbekende fout')}"}
    
    except Exception as e:
        return {"status": "error", "message": f"Fout bij verzending: {str(e)}"}

@router.post("/admin/whatsapp/send-bulk")
async def send_bulk_whatsapp(message_type: str = "overdue", company: dict = Depends(get_current_company)):
    """Send WhatsApp to all tenants with outstanding balance"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    
    if not comp.get("wa_enabled") or not comp.get("wa_api_token"):
        raise HTTPException(status_code=400, detail="WhatsApp Business API is niet geconfigureerd")
    
    tenants = await db.kiosk_tenants.find({"company_id": company["company_id"], "status": "active"}, {"_id": 0}).to_list(500)
    
    sent = 0
    failed = 0
    for tenant in tenants:
        outstanding = (tenant.get("outstanding_rent", 0) + tenant.get("service_costs", 0) + tenant.get("fines", 0))
        if outstanding <= 0 or not (tenant.get("phone") or tenant.get("telefoon")):
            continue
        try:
            msg_data = WhatsAppMessage(tenant_id=tenant["tenant_id"], message_type=message_type)
            await send_whatsapp_message(msg_data, company)
            sent += 1
        except Exception:
            failed += 1
    
    return {"sent": sent, "failed": failed, "message": f"{sent} berichten verstuurd, {failed} mislukt"}

@router.get("/admin/whatsapp/history")
async def get_whatsapp_history(company: dict = Depends(get_current_company)):
    """Get WhatsApp message history"""
    messages = await db.kiosk_wa_messages.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return messages

@router.post("/admin/whatsapp/test")
async def test_whatsapp_connection(company: dict = Depends(get_current_company)):
    """Test WhatsApp Business API connection"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    
    wa_token = comp.get("wa_api_token")
    wa_phone_id = comp.get("wa_phone_id")
    wa_url = comp.get("wa_api_url", "https://graph.facebook.com/v21.0")
    
    if not wa_token or not wa_phone_id:
        return {"status": "not_configured", "message": "API token en Phone ID zijn vereist"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{wa_url}/{wa_phone_id}",
                headers={"Authorization": f"Bearer {wa_token}"}
            )
            if resp.status_code == 200:
                return {"status": "connected", "message": "Verbinding succesvol!"}
            else:
                return {"status": "error", "message": f"API fout: {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Verbinding mislukt: {str(e)}"}


# ============== SUPERADMIN ==============

SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "Bharat7755"
PRO_PLAN_PRICE = 3500.00

class SuperAdminLogin(BaseModel):
    email: str
    password: str

def create_superadmin_token():
    payload = {
        "role": "superadmin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_superadmin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Niet geautoriseerd")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Geen superadmin rechten")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldig token")

@router.post("/superadmin/login")
async def superadmin_login(data: SuperAdminLogin):
    if data.email.lower() != SUPERADMIN_EMAIL or data.password != SUPERADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldig email of wachtwoord")
    token = create_superadmin_token()
    return {"token": token, "role": "superadmin"}

@router.get("/superadmin/stats")
async def superadmin_stats(admin=Depends(get_superadmin)):
    total_companies = await db.kiosk_companies.count_documents({})
    active_companies = await db.kiosk_companies.count_documents({"status": "active"})
    pro_companies = await db.kiosk_companies.count_documents({"subscription": "pro"})
    total_tenants = await db.kiosk_tenants.count_documents({})
    total_apartments = await db.kiosk_apartments.count_documents({})
    total_payments = await db.kiosk_payments.count_documents({})
    
    pipeline = [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    agg = await db.kiosk_payments.aggregate(pipeline).to_list(1)
    total_rent_revenue = agg[0]["total"] if agg else 0
    
    monthly_saas_revenue = pro_companies * PRO_PLAN_PRICE
    
    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "pro_companies": pro_companies,
        "free_companies": total_companies - pro_companies,
        "total_tenants": total_tenants,
        "total_apartments": total_apartments,
        "total_payments": total_payments,
        "total_rent_revenue": total_rent_revenue,
        "monthly_saas_revenue": monthly_saas_revenue,
        "pro_plan_price": PRO_PLAN_PRICE
    }

@router.get("/superadmin/companies")
async def superadmin_companies(admin=Depends(get_superadmin)):
    companies = await db.kiosk_companies.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    result = []
    for c in companies:
        cid = c["company_id"]
        tenant_count = await db.kiosk_tenants.count_documents({"company_id": cid})
        apt_count = await db.kiosk_apartments.count_documents({"company_id": cid})
        payment_count = await db.kiosk_payments.count_documents({"company_id": cid})
        pipeline = [{"$match": {"company_id": cid, "status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
        agg = await db.kiosk_payments.aggregate(pipeline).to_list(1)
        revenue = agg[0]["total"] if agg else 0
        result.append({
            "company_id": cid,
            "name": c.get("name", ""),
            "email": c.get("email", ""),
            "telefoon": c.get("telefoon", ""),
            "status": c.get("status", "active"),
            "subscription": c.get("subscription", "free"),
            "tenant_count": tenant_count,
            "apartment_count": apt_count,
            "payment_count": payment_count,
            "revenue": revenue,
            "created_at": c.get("created_at")
        })
    return result

@router.put("/superadmin/companies/{company_id}/status")
async def superadmin_toggle_company(company_id: str, admin=Depends(get_superadmin)):
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    new_status = "inactive" if comp.get("status") == "active" else "active"
    await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"status": new_status, "message": f"Bedrijf {'geactiveerd' if new_status == 'active' else 'gedeactiveerd'}"}

@router.put("/superadmin/companies/{company_id}/subscription")
async def superadmin_update_subscription(company_id: str, admin=Depends(get_superadmin)):
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    current = comp.get("subscription", "free")
    new_sub = "free" if current == "pro" else "pro"
    await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {"subscription": new_sub, "updated_at": datetime.now(timezone.utc)}}
    )
    label = "PRO (SRD 3.500/mnd)" if new_sub == "pro" else "Gratis"
    return {"subscription": new_sub, "message": f"Abonnement bijgewerkt naar {label}"}

@router.get("/superadmin/payments")
async def superadmin_payments(admin=Depends(get_superadmin)):
    payments = await db.kiosk_payments.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    company_cache = {}
    for p in payments:
        cid = p.get("company_id", "")
        if cid not in company_cache:
            comp = await db.kiosk_companies.find_one({"company_id": cid}, {"_id": 0, "name": 1})
            company_cache[cid] = comp.get("name", "") if comp else ""
        p["company_name"] = company_cache[cid]
    return payments
