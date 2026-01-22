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
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import cm
import httpx

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
app = FastAPI(title="SuriRentals API", version="1.0.0")

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
SUPER_ADMIN_EMAIL = "admin@surirentals.sr"  # Default super admin

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

class MaintenanceUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    maintenance_date: Optional[str] = None
    status: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: str
    apartment_id: str
    apartment_name: Optional[str] = None
    category: str
    description: str
    cost: float
    maintenance_date: str
    status: str
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
        created_at=current_user["created_at"]
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

# ==================== RECEIPT/PDF ROUTES ====================

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
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#0caf60')
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph("KWITANTIE", title_style))
    elements.append(Paragraph(f"<b>SuriRentals</b> - Verhuurbeheersysteem", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Receipt info
    receipt_data = [
        ["Kwitantie Nr:", payment_id[:8].upper()],
        ["Datum:", payment["payment_date"]],
        ["", ""],
        ["HUURDER GEGEVENS", ""],
        ["Naam:", tenant["name"] if tenant else "Onbekend"],
        ["Telefoon:", tenant["phone"] if tenant else ""],
        ["", ""],
        ["APPARTEMENT", ""],
        ["Naam:", apt["name"] if apt else "Onbekend"],
        ["Adres:", apt["address"] if apt else ""],
        ["", ""],
        ["BETALING", ""],
        ["Type:", payment["payment_type"].capitalize()],
        ["Periode:", f"{payment.get('period_month', '-')}/{payment.get('period_year', '-')}" if payment.get('period_month') else "-"],
        ["Bedrag:", format_currency(payment["amount"])],
        ["", ""],
        ["Omschrijving:", payment.get("description") or "-"],
    ]
    
    table = Table(receipt_data, colWidths=[5*cm, 10*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 3), (0, 3), 'Helvetica-Bold'),
        ('FONTNAME', (0, 7), (0, 7), 'Helvetica-Bold'),
        ('FONTNAME', (0, 11), (0, 11), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 3), (0, 3), colors.HexColor('#0caf60')),
        ('TEXTCOLOR', (0, 7), (0, 7), colors.HexColor('#0caf60')),
        ('TEXTCOLOR', (0, 11), (0, 11), colors.HexColor('#0caf60')),
        ('FONTNAME', (1, 14), (1, 14), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 14), (1, 14), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 40))
    
    # Footer
    elements.append(Paragraph("_" * 50, styles['Normal']))
    elements.append(Paragraph("Handtekening Verhuurder", styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
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
            # Assume rent is due on the 1st of each month
            due_date = first_of_month
            days_overdue = (now - due_date).days
            
            reminders.append(ReminderResponse(
                id=str(uuid.uuid4()),
                tenant_id=apt["tenant_id"],
                tenant_name=occupied_tenant_map.get(apt["tenant_id"], "Onbekend"),
                apartment_id=apt["id"],
                apartment_name=apt["name"],
                amount_due=apt["rent_amount"],
                due_date=due_date.strftime("%Y-%m-%d"),
                days_overdue=days_overdue,
                reminder_type="overdue" if days_overdue > 0 else "upcoming"
            ))
    
    # Calculate kasgeld balance
    kasgeld_transactions = await db.kasgeld.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    kasgeld_deposits = sum(t["amount"] for t in kasgeld_transactions if t["transaction_type"] == "deposit")
    kasgeld_withdrawals = sum(t["amount"] for t in kasgeld_transactions if t["transaction_type"] == "withdrawal")
    maintenance_costs = await db.maintenance.find({"user_id": user_id}, {"_id": 0, "cost": 1}).to_list(1000)
    total_maintenance = sum(m["cost"] for m in maintenance_costs)
    
    # Get all payments (huurbetalingen) for kasgeld calculation
    all_payments = await db.payments.find({"user_id": user_id}, {"_id": 0, "amount": 1}).to_list(1000)
    total_all_payments = sum(p["amount"] for p in all_payments)
    
    # Get salary payments for kasgeld calculation
    all_salaries = await db.salaries.find({"user_id": user_id}, {"_id": 0, "amount": 1, "period_month": 1, "period_year": 1}).to_list(1000)
    total_all_salaries = sum(s["amount"] for s in all_salaries)
    
    # Total kasgeld = deposits + all payments - withdrawals - maintenance - salaries
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
    
    if not apt:
        return {
            "tenant_id": tenant_id,
            "tenant_name": tenant["name"],
            "apartment": None,
            "total_due": 0,
            "total_paid": 0,
            "balance": 0,
            "payments": []
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
        "payments": payments
    }

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
    
    # Get total maintenance costs
    maintenance_records = await db.maintenance.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "cost": 1}
    ).to_list(1000)
    total_maintenance_costs = sum(m["cost"] for m in maintenance_records)
    
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
    
    # Total balance = deposits + payments - withdrawals - maintenance costs - salaries
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
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: dict = Depends(get_current_user)):
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.maintenance.insert_one(maintenance_doc)
    
    return MaintenanceResponse(
        **maintenance_doc,
        apartment_name=apt["name"]
    )

@api_router.get("/maintenance", response_model=List[MaintenanceResponse])
async def get_maintenance_records(current_user: dict = Depends(get_current_user)):
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
async def get_maintenance_record(maintenance_id: str, current_user: dict = Depends(get_current_user)):
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
async def update_maintenance(maintenance_id: str, maintenance_data: MaintenanceUpdate, current_user: dict = Depends(get_current_user)):
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
async def delete_maintenance(maintenance_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.maintenance.delete_one({"id": maintenance_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    return {"message": "Onderhoudsrecord verwijderd"}

@api_router.get("/maintenance/apartment/{apartment_id}", response_model=List[MaintenanceResponse])
async def get_apartment_maintenance(apartment_id: str, current_user: dict = Depends(get_current_user)):
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
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
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
async def get_employees(current_user: dict = Depends(get_current_user)):
    employees = await db.employees.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    return [EmployeeResponse(**e) for e in employees]

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.employees.find_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return EmployeeResponse(**employee)

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee_data: EmployeeUpdate, current_user: dict = Depends(get_current_user)):
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
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.employees.delete_one({"id": employee_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

# ==================== SALARIS (SALARY) ROUTES ====================

@api_router.post("/salaries", response_model=SalaryPaymentResponse)
async def create_salary_payment(salary_data: SalaryPaymentCreate, current_user: dict = Depends(get_current_user)):
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
async def get_salary_payments(current_user: dict = Depends(get_current_user)):
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
async def delete_salary_payment(salary_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.salaries.delete_one({"id": salary_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salarisbetaling niet gevonden")
    return {"message": "Salarisbetaling verwijderd"}

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
            "bank": "De Surinaamsche Bank",
            "rekening": "123456789",
            "naam": "SuriRentals BV",
            "omschrijving": f"Abonnement {current_user['email']}"
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
