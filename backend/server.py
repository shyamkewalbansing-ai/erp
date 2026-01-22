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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = 'suriname-rental-secret-key-production-2024'
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
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ==================== MODELS ====================

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

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

# Dashboard Models
class DashboardStats(BaseModel):
    total_apartments: int
    occupied_apartments: int
    available_apartments: int
    total_tenants: int
    total_income_this_month: float
    total_outstanding: float
    total_deposits_held: float
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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Ongeldige token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

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
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    token = create_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ==================== TENANT ROUTES ====================

@api_router.post("/tenants", response_model=TenantResponse)
async def create_tenant(tenant_data: TenantCreate, current_user: dict = Depends(get_current_user)):
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
async def get_tenants(current_user: dict = Depends(get_current_user)):
    tenants = await db.tenants.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(1000)
    return [TenantResponse(**t) for t in tenants]

@api_router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return TenantResponse(**tenant)

@api_router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: str, tenant_data: TenantUpdate, current_user: dict = Depends(get_current_user)):
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
async def delete_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tenants.delete_one({"id": tenant_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return {"message": "Huurder verwijderd"}

# ==================== APARTMENT ROUTES ====================

@api_router.post("/apartments", response_model=ApartmentResponse)
async def create_apartment(apt_data: ApartmentCreate, current_user: dict = Depends(get_current_user)):
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
async def get_apartments(current_user: dict = Depends(get_current_user)):
    apartments = await db.apartments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Add tenant names
    for apt in apartments:
        if apt.get("tenant_id"):
            tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
            apt["tenant_name"] = tenant["name"] if tenant else None
    
    return [ApartmentResponse(**apt) for apt in apartments]

@api_router.get("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def get_apartment(apartment_id: str, current_user: dict = Depends(get_current_user)):
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
async def update_apartment(apartment_id: str, apt_data: ApartmentUpdate, current_user: dict = Depends(get_current_user)):
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
async def delete_apartment(apartment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.apartments.delete_one({"id": apartment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

@api_router.post("/apartments/{apartment_id}/assign-tenant")
async def assign_tenant(apartment_id: str, tenant_id: str, current_user: dict = Depends(get_current_user)):
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
async def remove_tenant(apartment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.apartments.update_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"$set": {"tenant_id": None, "status": "available"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    return {"message": "Huurder verwijderd van appartement"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
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
async def get_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    
    # Add tenant and apartment names
    for payment in payments:
        tenant = await db.tenants.find_one({"id": payment["tenant_id"]}, {"_id": 0, "name": 1})
        apt = await db.apartments.find_one({"id": payment["apartment_id"]}, {"_id": 0, "name": 1})
        payment["tenant_name"] = tenant["name"] if tenant else None
        payment["apartment_name"] = apt["name"] if apt else None
    
    return [PaymentResponse(**p) for p in payments]

@api_router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
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
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.payments.delete_one({"id": payment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return {"message": "Betaling verwijderd"}

# ==================== DEPOSIT ROUTES ====================

@api_router.post("/deposits", response_model=DepositResponse)
async def create_deposit(deposit_data: DepositCreate, current_user: dict = Depends(get_current_user)):
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
async def get_deposits(current_user: dict = Depends(get_current_user)):
    deposits = await db.deposits.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Add tenant and apartment names
    for deposit in deposits:
        tenant = await db.tenants.find_one({"id": deposit["tenant_id"]}, {"_id": 0, "name": 1})
        apt = await db.apartments.find_one({"id": deposit["apartment_id"]}, {"_id": 0, "name": 1})
        deposit["tenant_name"] = tenant["name"] if tenant else None
        deposit["apartment_name"] = apt["name"] if apt else None
    
    return [DepositResponse(**d) for d in deposits]

@api_router.put("/deposits/{deposit_id}", response_model=DepositResponse)
async def update_deposit(deposit_id: str, deposit_data: DepositUpdate, current_user: dict = Depends(get_current_user)):
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
async def delete_deposit(deposit_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.deposits.delete_one({"id": deposit_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    return {"message": "Borg verwijderd"}

# ==================== RECEIPT/PDF ROUTES ====================

@api_router.get("/receipts/{payment_id}/pdf")
async def generate_receipt_pdf(payment_id: str, current_user: dict = Depends(get_current_user)):
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
async def get_dashboard(current_user: dict = Depends(get_current_user)):
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
    
    recent_payments = []
    for payment in recent_payments_cursor:
        tenant = await db.tenants.find_one({"id": payment["tenant_id"]}, {"_id": 0, "name": 1})
        apt = await db.apartments.find_one({"id": payment["apartment_id"]}, {"_id": 0, "name": 1})
        payment["tenant_name"] = tenant["name"] if tenant else None
        payment["apartment_name"] = apt["name"] if apt else None
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
            tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
            
            # Assume rent is due on the 1st of each month
            due_date = first_of_month
            days_overdue = (now - due_date).days
            
            reminders.append(ReminderResponse(
                id=str(uuid.uuid4()),
                tenant_id=apt["tenant_id"],
                tenant_name=tenant["name"] if tenant else "Onbekend",
                apartment_id=apt["id"],
                apartment_name=apt["name"],
                amount_due=apt["rent_amount"],
                due_date=due_date.strftime("%Y-%m-%d"),
                days_overdue=days_overdue,
                reminder_type="overdue" if days_overdue > 0 else "upcoming"
            ))
    
    return DashboardStats(
        total_apartments=total_apartments,
        occupied_apartments=occupied_apartments,
        available_apartments=available_apartments,
        total_tenants=total_tenants,
        total_income_this_month=total_income,
        total_outstanding=total_outstanding,
        total_deposits_held=total_deposits,
        recent_payments=recent_payments,
        reminders=reminders
    )

# ==================== TENANT BALANCE ROUTES ====================

@api_router.get("/tenants/{tenant_id}/balance")
async def get_tenant_balance(tenant_id: str, current_user: dict = Depends(get_current_user)):
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
