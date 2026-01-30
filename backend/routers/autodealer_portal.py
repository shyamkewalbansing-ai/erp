# Auto Dealer Customer Portal Router
# Allows customers to view their purchases and vehicle history

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
import jwt
import bcrypt
import os

router = APIRouter(prefix="/autodealer-portal", tags=["Auto Dealer Portal"])

security = HTTPBearer()

# Import shared dependencies
from .deps import get_db

JWT_SECRET = os.environ.get("JWT_SECRET", "suri-rentals-secure-jwt-secret-2024")

# ==================== PYDANTIC MODELS ====================

class CustomerLogin(BaseModel):
    email: str
    password: str

class CustomerRegister(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None

class CustomerPasswordChange(BaseModel):
    current_password: str
    new_password: str


# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_customer_token(customer_id: str, email: str, workspace_id: str) -> str:
    payload = {
        "customer_id": customer_id,
        "email": email,
        "workspace_id": workspace_id,
        "type": "autodealer_customer",
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 60 * 60 * 30)  # 30 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_customer_account(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify customer token and return customer data"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        if payload.get("type") != "autodealer_customer":
            raise HTTPException(status_code=401, detail="Ongeldige token type")
        
        db = await get_db()
        customer = await db.autodealer_customer_accounts.find_one({
            "_id": ObjectId(payload["customer_id"])
        })
        
        if not customer:
            raise HTTPException(status_code=401, detail="Account niet gevonden")
        
        if not customer.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account gedeactiveerd")
        
        customer["id"] = str(customer.pop("_id"))
        return customer
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")


# ==================== AUTH ENDPOINTS ====================

@router.post("/register")
async def customer_register(data: CustomerRegister):
    """Register a new customer account"""
    db = await get_db()
    
    # Check if email already exists
    existing = await db.autodealer_customer_accounts.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    # Find customer in autodealer_customers by email
    customer = await db.autodealer_customers.find_one({"email": data.email.lower()})
    
    # Create account
    account = {
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "customer_id": str(customer["_id"]) if customer else None,
        "workspace_id": customer.get("workspace_id") if customer else None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.autodealer_customer_accounts.insert_one(account)
    
    token = create_customer_token(
        str(result.inserted_id),
        data.email.lower(),
        account.get("workspace_id", "")
    )
    
    return {
        "message": "Account aangemaakt",
        "token": token,
        "customer": {
            "id": str(result.inserted_id),
            "email": data.email.lower(),
            "name": data.name,
            "linked": customer is not None
        }
    }


@router.post("/login")
async def customer_login(data: CustomerLogin):
    """Login customer"""
    db = await get_db()
    
    account = await db.autodealer_customer_accounts.find_one({"email": data.email.lower()})
    if not account:
        raise HTTPException(status_code=401, detail="E-mailadres of wachtwoord onjuist")
    
    if not verify_password(data.password, account["password"]):
        raise HTTPException(status_code=401, detail="E-mailadres of wachtwoord onjuist")
    
    if not account.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account gedeactiveerd")
    
    # Update last login
    await db.autodealer_customer_accounts.update_one(
        {"_id": account["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_customer_token(
        str(account["_id"]),
        account["email"],
        account.get("workspace_id", "")
    )
    
    return {
        "token": token,
        "customer": {
            "id": str(account["_id"]),
            "email": account["email"],
            "name": account.get("name", ""),
            "linked": account.get("customer_id") is not None
        }
    }


@router.get("/me")
async def get_customer_profile(account: dict = Depends(get_customer_account)):
    """Get current customer profile"""
    db = await get_db()
    
    response = {
        "id": account["id"],
        "email": account["email"],
        "name": account.get("name", ""),
        "phone": account.get("phone", ""),
        "created_at": account.get("created_at"),
        "linked_customer": None
    }
    
    # If linked to a customer record, get additional info
    if account.get("customer_id"):
        try:
            customer = await db.autodealer_customers.find_one({
                "_id": ObjectId(account["customer_id"])
            })
            if customer:
                response["linked_customer"] = {
                    "id": str(customer["_id"]),
                    "name": customer.get("name"),
                    "customer_type": customer.get("customer_type", "particulier"),
                    "address": customer.get("address"),
                    "city": customer.get("city")
                }
        except Exception:
            pass
    
    return response


@router.put("/me")
async def update_customer_profile(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    account: dict = Depends(get_customer_account)
):
    """Update customer profile"""
    db = await get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name:
        update_data["name"] = name
    if phone:
        update_data["phone"] = phone
    
    await db.autodealer_customer_accounts.update_one(
        {"_id": ObjectId(account["id"])},
        {"$set": update_data}
    )
    
    return {"message": "Profiel bijgewerkt"}


@router.put("/change-password")
async def change_customer_password(
    data: CustomerPasswordChange,
    account: dict = Depends(get_customer_account)
):
    """Change customer password"""
    db = await get_db()
    
    # Get full account with password
    full_account = await db.autodealer_customer_accounts.find_one({"_id": ObjectId(account["id"])})
    
    if not verify_password(data.current_password, full_account["password"]):
        raise HTTPException(status_code=400, detail="Huidig wachtwoord onjuist")
    
    await db.autodealer_customer_accounts.update_one(
        {"_id": ObjectId(account["id"])},
        {"$set": {
            "password": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Wachtwoord gewijzigd"}


# ==================== PURCHASES ENDPOINTS ====================

@router.get("/purchases")
async def get_customer_purchases(account: dict = Depends(get_customer_account)):
    """Get all purchases for this customer"""
    db = await get_db()
    
    if not account.get("customer_id"):
        return {"purchases": [], "message": "Geen klantrecord gekoppeld"}
    
    # Get all sales for this customer
    sales = await db.autodealer_sales.find({
        "customer_id": account["customer_id"]
    }).sort("sale_date", -1).to_list(100)
    
    purchases = []
    for sale in sales:
        purchase = {
            "id": str(sale["_id"]),
            "sale_date": sale.get("sale_date"),
            "status": sale.get("status", "completed"),
            "total_price": sale.get("total_price", {}),
            "payment_method": sale.get("payment_method"),
            "vehicle": None
        }
        
        # Get vehicle details
        if sale.get("vehicle_id"):
            try:
                vehicle = await db.autodealer_vehicles.find_one({
                    "_id": ObjectId(sale["vehicle_id"])
                })
                if vehicle:
                    purchase["vehicle"] = {
                        "id": str(vehicle["_id"]),
                        "brand": vehicle.get("brand"),
                        "model": vehicle.get("model"),
                        "year": vehicle.get("year"),
                        "license_plate": vehicle.get("license_plate"),
                        "color": vehicle.get("color"),
                        "vin": vehicle.get("vin"),
                        "mileage": vehicle.get("mileage"),
                        "fuel_type": vehicle.get("fuel_type"),
                        "transmission": vehicle.get("transmission"),
                        "image_url": vehicle.get("image_url")
                    }
            except Exception:
                pass
        
        purchases.append(purchase)
    
    return {"purchases": purchases, "total": len(purchases)}


@router.get("/purchases/{purchase_id}")
async def get_purchase_details(purchase_id: str, account: dict = Depends(get_customer_account)):
    """Get detailed purchase information"""
    db = await get_db()
    
    if not account.get("customer_id"):
        raise HTTPException(status_code=404, detail="Geen klantrecord gekoppeld")
    
    sale = await db.autodealer_sales.find_one({
        "_id": ObjectId(purchase_id),
        "customer_id": account["customer_id"]
    })
    
    if not sale:
        raise HTTPException(status_code=404, detail="Aankoop niet gevonden")
    
    purchase = {
        "id": str(sale["_id"]),
        "sale_date": sale.get("sale_date"),
        "status": sale.get("status", "completed"),
        "total_price": sale.get("total_price", {}),
        "payment_method": sale.get("payment_method"),
        "down_payment": sale.get("down_payment"),
        "financing_details": sale.get("financing_details"),
        "notes": sale.get("notes"),
        "documents": sale.get("documents", []),
        "vehicle": None,
        "warranty": sale.get("warranty", {})
    }
    
    # Get vehicle details
    if sale.get("vehicle_id"):
        try:
            vehicle = await db.autodealer_vehicles.find_one({
                "_id": ObjectId(sale["vehicle_id"])
            })
            if vehicle:
                purchase["vehicle"] = {
                    "id": str(vehicle["_id"]),
                    "brand": vehicle.get("brand"),
                    "model": vehicle.get("model"),
                    "year": vehicle.get("year"),
                    "license_plate": vehicle.get("license_plate"),
                    "color": vehicle.get("color"),
                    "vin": vehicle.get("vin"),
                    "mileage": vehicle.get("mileage"),
                    "fuel_type": vehicle.get("fuel_type"),
                    "transmission": vehicle.get("transmission"),
                    "engine_size": vehicle.get("engine_size"),
                    "body_type": vehicle.get("body_type"),
                    "features": vehicle.get("features", []),
                    "image_url": vehicle.get("image_url"),
                    "images": vehicle.get("images", [])
                }
        except Exception:
            pass
    
    return purchase


# ==================== DASHBOARD ENDPOINT ====================

@router.get("/dashboard")
async def get_customer_dashboard(account: dict = Depends(get_customer_account)):
    """Get customer dashboard with summary"""
    db = await get_db()
    
    dashboard = {
        "customer": {
            "name": account.get("name", ""),
            "email": account.get("email", ""),
            "member_since": account.get("created_at")
        },
        "stats": {
            "total_purchases": 0,
            "total_spent": {"srd": 0, "eur": 0, "usd": 0},
            "vehicles_owned": 0
        },
        "recent_purchases": [],
        "linked": account.get("customer_id") is not None
    }
    
    if not account.get("customer_id"):
        return dashboard
    
    # Get purchase stats
    sales = await db.autodealer_sales.find({
        "customer_id": account["customer_id"]
    }).to_list(100)
    
    dashboard["stats"]["total_purchases"] = len(sales)
    dashboard["stats"]["vehicles_owned"] = len([s for s in sales if s.get("status") == "completed"])
    
    # Calculate total spent per currency
    for sale in sales:
        price = sale.get("total_price", {})
        if isinstance(price, dict):
            currency = price.get("currency", "srd").lower()
            amount = price.get("amount", 0)
            if currency in dashboard["stats"]["total_spent"]:
                dashboard["stats"]["total_spent"][currency] += amount
    
    # Get recent purchases (last 3)
    recent_sales = sorted(sales, key=lambda x: x.get("sale_date", ""), reverse=True)[:3]
    for sale in recent_sales:
        purchase = {
            "id": str(sale["_id"]),
            "sale_date": sale.get("sale_date"),
            "status": sale.get("status"),
            "total_price": sale.get("total_price"),
            "vehicle_name": "Onbekend voertuig"
        }
        
        if sale.get("vehicle_id"):
            try:
                vehicle = await db.autodealer_vehicles.find_one({
                    "_id": ObjectId(sale["vehicle_id"])
                })
                if vehicle:
                    purchase["vehicle_name"] = f"{vehicle.get('brand', '')} {vehicle.get('model', '')} ({vehicle.get('year', '')})"
                    purchase["vehicle_image"] = vehicle.get("image_url")
            except Exception:
                pass
        
        dashboard["recent_purchases"].append(purchase)
    
    return dashboard


# ==================== SUPPORT/CONTACT ENDPOINT ====================

@router.post("/support")
async def submit_support_request(
    subject: str,
    message: str,
    purchase_id: Optional[str] = None,
    account: dict = Depends(get_customer_account)
):
    """Submit a support request"""
    db = await get_db()
    
    support_request = {
        "customer_account_id": account["id"],
        "customer_id": account.get("customer_id"),
        "customer_email": account["email"],
        "customer_name": account.get("name"),
        "workspace_id": account.get("workspace_id"),
        "subject": subject,
        "message": message,
        "purchase_id": purchase_id,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.autodealer_support_requests.insert_one(support_request)
    
    return {
        "message": "Ondersteuningsverzoek ingediend",
        "ticket_id": str(result.inserted_id)
    }


@router.get("/support")
async def get_support_requests(account: dict = Depends(get_customer_account)):
    """Get all support requests for this customer"""
    db = await get_db()
    
    requests = await db.autodealer_support_requests.find({
        "customer_account_id": account["id"]
    }).sort("created_at", -1).to_list(50)
    
    for req in requests:
        req["id"] = str(req.pop("_id"))
    
    return {"requests": requests}
