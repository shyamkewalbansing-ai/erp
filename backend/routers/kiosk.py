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
    stamp_company_name: Optional[str] = None
    stamp_address: Optional[str] = None
    stamp_phone: Optional[str] = None
    stamp_whatsapp: Optional[str] = None
    kiosk_pin: Optional[str] = None  # 4-digit PIN for kiosk access

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
        "stamp_company_name": company.get("stamp_company_name", ""),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", ""),
        "kiosk_pin": company.get("kiosk_pin", ""),
        "status": company.get("status")
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
    
    return [{
        "tenant_id": t["tenant_id"],
        "name": t["name"],
        "apartment_id": t["apartment_id"],
        "apartment_number": t.get("apartment_number", ""),
        "tenant_code": t.get("tenant_code", ""),
        "monthly_rent": t.get("monthly_rent", 0),
        "outstanding_rent": t.get("outstanding_rent", 0),
        "service_costs": t.get("service_costs", 0),
        "fines": t.get("fines", 0),
        "deposit_required": t.get("deposit_required", 0),
        "deposit_paid": t.get("deposit_paid", 0),
        "status": t["status"]
    } for t in tenants]

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
        
        result.append({
            "tenant_id": t["tenant_id"],
            "name": t["name"],
            "apartment_id": t["apartment_id"],
            "apartment_number": t.get("apartment_number", ""),
            "tenant_code": t.get("tenant_code", ""),
            "email": t.get("email"),
            "telefoon": t.get("telefoon"),
            "monthly_rent": monthly_rent,
            "outstanding_rent": outstanding,
            "service_costs": t.get("service_costs", 0),
            "fines": current_fines,
            "deposit_required": t.get("deposit_required", 0),
            "deposit_paid": t.get("deposit_paid", 0),
            "rent_billed_through": billed_through,
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
        "kwitantie_nummer": payment.get("kwitantie_nummer"),
        "created_at": payment["created_at"]
    }



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
    """Generate lease document HTML - accepts token via query param for new tab"""
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
    company_address = comp.get("adres", "") if comp else ""
    company_phone = comp.get("telefoon", "") if comp else ""

    html = f"""<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Huurovereenkomst</title>
<style>
body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }}
h1 {{ text-align: center; font-size: 22px; border-bottom: 2px solid #ea580c; padding-bottom: 10px; }}
h2 {{ font-size: 16px; margin-top: 30px; color: #ea580c; }}
.header {{ text-align: center; margin-bottom: 30px; }}
.header p {{ margin: 2px 0; font-size: 13px; color: #666; }}
table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
td {{ padding: 6px 12px; border: 1px solid #ddd; font-size: 14px; }}
td:first-child {{ background: #f9f9f9; font-weight: bold; width: 200px; }}
.voorwaarden {{ white-space: pre-wrap; font-size: 14px; background: #fafafa; padding: 15px; border: 1px solid #eee; border-radius: 4px; }}
.signatures {{ display: flex; justify-content: space-between; margin-top: 60px; }}
.sig-block {{ width: 45%; text-align: center; }}
.sig-line {{ border-top: 1px solid #333; margin-top: 50px; padding-top: 8px; font-size: 13px; }}
.footer {{ text-align: center; margin-top: 40px; font-size: 11px; color: #999; }}
@media print {{ body {{ margin: 20px; }} }}
</style></head>
<body>
<div class="header">
  <h1>HUUROVEREENKOMST</h1>
  <p><strong>{company_name}</strong></p>
  <p>{company_address}</p>
  <p>{company_phone}</p>
</div>

<h2>Artikel 1 - Partijen</h2>
<table>
  <tr><td>Verhuurder</td><td>{company_name}</td></tr>
  <tr><td>Huurder</td><td>{lease.get('tenant_name', '')}</td></tr>
  <tr><td>Appartement</td><td>{lease.get('apartment_number', '')}</td></tr>
</table>

<h2>Artikel 2 - Huurperiode</h2>
<table>
  <tr><td>Ingangsdatum</td><td>{lease.get('start_date', '')}</td></tr>
  <tr><td>Einddatum</td><td>{lease.get('end_date', '')}</td></tr>
</table>

<h2>Artikel 3 - Huurprijs</h2>
<table>
  <tr><td>Maandelijkse huur</td><td>SRD {lease.get('monthly_rent', 0):,.2f}</td></tr>
</table>

<h2>Artikel 4 - Voorwaarden</h2>
<div class="voorwaarden">{lease.get('voorwaarden', 'Geen aanvullende voorwaarden.')}</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-line">Verhuurder<br/>{company_name}</div>
  </div>
  <div class="sig-block">
    <div class="sig-line">Huurder<br/>{lease.get('tenant_name', '')}</div>
  </div>
</div>

<div class="footer">
  Overeenkomst-ID: {lease_id} | Gegenereerd op: {datetime.now(timezone.utc).strftime('%d-%m-%Y %H:%M')} UTC
</div>
</body></html>"""
    
    return Response(content=html, media_type="text/html")

