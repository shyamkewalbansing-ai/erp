# Kassa POS System Router
# Standalone Point of Sale system for Suriname businesses

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, date
from bson import ObjectId
import uuid
import hashlib
import secrets
import jwt
from decimal import Decimal

router = APIRouter(prefix="/kassa", tags=["Kassa POS"])

# Import database
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "facturatie_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Secret for Kassa system (separate from main app)
KASSA_JWT_SECRET = os.environ.get("KASSA_JWT_SECRET", "kassa-pos-secret-key-suriname-2026")
KASSA_JWT_ALGORITHM = "HS256"
KASSA_JWT_EXPIRATION = 60 * 60 * 24 * 7  # 7 days

# ==================== MODELS ====================

class KassaRegisterRequest(BaseModel):
    business_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    kvk_number: Optional[str] = None  # Chamber of Commerce number
    btw_number: Optional[str] = None

class KassaLoginRequest(BaseModel):
    email: EmailStr
    password: str

class KassaProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    price: float
    cost_price: Optional[float] = 0
    barcode: Optional[str] = None
    sku: Optional[str] = None
    stock_quantity: Optional[int] = 0
    track_stock: bool = True
    image_url: Optional[str] = None
    is_active: bool = True

class KassaCategoryCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = None
    sort_order: Optional[int] = 0

class KassaOrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    discount: float = 0

class KassaOrderCreate(BaseModel):
    items: List[KassaOrderItem]
    customer_id: Optional[str] = None
    payment_method: str = "cash"  # cash, pin, qr, mixed
    amount_paid: float
    discount_total: float = 0
    notes: Optional[str] = None

class KassaCustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: int = 0

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_kassa_token(business_id: str, user_id: str, role: str = "owner") -> str:
    payload = {
        "business_id": business_id,
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + KASSA_JWT_EXPIRATION,
        "iat": datetime.now(timezone.utc).timestamp()
    }
    return jwt.encode(payload, KASSA_JWT_SECRET, algorithm=KASSA_JWT_ALGORITHM)

async def get_kassa_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, KASSA_JWT_SECRET, algorithms=[KASSA_JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

def clean_doc(doc):
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ==================== SUBSCRIPTION PLANS ====================

SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "Basic",
        "price_monthly": 49.00,
        "price_yearly": 490.00,
        "currency": "SRD",
        "features": {
            "max_products": 100,
            "max_users": 2,
            "max_registers": 1,
            "reports": "basic",
            "support": "email",
            "offline_mode": False,
            "customer_loyalty": False,
            "inventory_alerts": False
        }
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 99.00,
        "price_yearly": 990.00,
        "currency": "SRD",
        "features": {
            "max_products": 500,
            "max_users": 5,
            "max_registers": 3,
            "reports": "advanced",
            "support": "email_phone",
            "offline_mode": True,
            "customer_loyalty": True,
            "inventory_alerts": True
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 199.00,
        "price_yearly": 1990.00,
        "currency": "SRD",
        "features": {
            "max_products": -1,  # Unlimited
            "max_users": -1,
            "max_registers": -1,
            "reports": "full",
            "support": "priority",
            "offline_mode": True,
            "customer_loyalty": True,
            "inventory_alerts": True,
            "api_access": True,
            "white_label": True
        }
    }
}

# ==================== AUTH ENDPOINTS ====================

@router.post("/auth/register")
async def kassa_register(data: KassaRegisterRequest):
    """Register a new business for the POS system"""
    
    # Check if email already exists
    existing = await db.kassa_businesses.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")
    
    business_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    
    # Create business
    business = {
        "id": business_id,
        "name": data.business_name,
        "email": data.email.lower(),
        "phone": data.phone,
        "address": data.address,
        "kvk_number": data.kvk_number,
        "btw_number": data.btw_number,
        "btw_percentage": 8.0,  # Suriname BTW
        "currency": "SRD",
        "subscription_plan": "basic",
        "subscription_status": "trial",
        "trial_ends_at": (datetime.now(timezone.utc).replace(day=datetime.now().day + 14)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {
            "receipt_header": data.business_name,
            "receipt_footer": "Bedankt voor uw aankoop!",
            "auto_print_receipt": True,
            "sound_enabled": True,
            "theme": "light"
        }
    }
    
    # Create owner user
    user = {
        "id": user_id,
        "business_id": business_id,
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "name": data.business_name,
        "role": "owner",  # owner, manager, cashier
        "pin": None,  # Quick login PIN
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kassa_businesses.insert_one(business)
    await db.kassa_users.insert_one(user)
    
    # Create default categories
    default_categories = [
        {"name": "Algemeen", "color": "#6366f1", "sort_order": 0},
        {"name": "Dranken", "color": "#06b6d4", "sort_order": 1},
        {"name": "Eten", "color": "#f59e0b", "sort_order": 2},
        {"name": "Overig", "color": "#8b5cf6", "sort_order": 3}
    ]
    
    for cat in default_categories:
        await db.kassa_categories.insert_one({
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            **cat,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    token = create_kassa_token(business_id, user_id, "owner")
    
    return {
        "message": "Registratie succesvol",
        "access_token": token,
        "business": clean_doc(business),
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@router.post("/auth/login")
async def kassa_login(data: KassaLoginRequest):
    """Login to the POS system"""
    
    user = await db.kassa_users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is gedeactiveerd")
    
    business = await db.kassa_businesses.find_one({"id": user["business_id"]})
    if not business:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    token = create_kassa_token(user["business_id"], user["id"], user.get("role", "cashier"))
    
    return {
        "access_token": token,
        "business": clean_doc(business),
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "cashier")
        }
    }

@router.get("/auth/me")
async def kassa_me(auth: dict = Depends(get_kassa_user)):
    """Get current user and business info"""
    
    business = await db.kassa_businesses.find_one({"id": auth["business_id"]})
    user = await db.kassa_users.find_one({"id": auth["user_id"]})
    
    if not business or not user:
        raise HTTPException(status_code=404, detail="Niet gevonden")
    
    return {
        "business": clean_doc(business),
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "cashier")
        },
        "subscription": SUBSCRIPTION_PLANS.get(business.get("subscription_plan", "basic"))
    }

# ==================== CATEGORIES ====================

@router.get("/categories")
async def get_categories(auth: dict = Depends(get_kassa_user)):
    """Get all categories for the business"""
    
    categories = await db.kassa_categories.find(
        {"business_id": auth["business_id"]}
    ).sort("sort_order", 1).to_list(100)
    
    return [clean_doc(c) for c in categories]

@router.post("/categories")
async def create_category(data: KassaCategoryCreate, auth: dict = Depends(get_kassa_user)):
    """Create a new category"""
    
    category = {
        "id": str(uuid.uuid4()),
        "business_id": auth["business_id"],
        "name": data.name,
        "color": data.color,
        "icon": data.icon,
        "sort_order": data.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kassa_categories.insert_one(category)
    return clean_doc(category)

@router.put("/categories/{category_id}")
async def update_category(category_id: str, data: KassaCategoryCreate, auth: dict = Depends(get_kassa_user)):
    """Update a category"""
    
    result = await db.kassa_categories.update_one(
        {"id": category_id, "business_id": auth["business_id"]},
        {"$set": {
            "name": data.name,
            "color": data.color,
            "icon": data.icon,
            "sort_order": data.sort_order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categorie niet gevonden")
    
    return {"message": "Categorie bijgewerkt"}

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, auth: dict = Depends(get_kassa_user)):
    """Delete a category"""
    
    # Move products to "Algemeen" category
    await db.kassa_products.update_many(
        {"category_id": category_id, "business_id": auth["business_id"]},
        {"$set": {"category_id": None}}
    )
    
    result = await db.kassa_categories.delete_one(
        {"id": category_id, "business_id": auth["business_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categorie niet gevonden")
    
    return {"message": "Categorie verwijderd"}

# ==================== PRODUCTS ====================

@router.get("/products")
async def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    auth: dict = Depends(get_kassa_user)
):
    """Get all products for the business"""
    
    query = {"business_id": auth["business_id"], "is_active": True}
    
    if category_id:
        query["category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.kassa_products.find(query).sort("name", 1).to_list(1000)
    return [clean_doc(p) for p in products]

@router.get("/products/{product_id}")
async def get_product(product_id: str, auth: dict = Depends(get_kassa_user)):
    """Get a single product"""
    
    product = await db.kassa_products.find_one(
        {"id": product_id, "business_id": auth["business_id"]}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return clean_doc(product)

@router.get("/products/barcode/{barcode}")
async def get_product_by_barcode(barcode: str, auth: dict = Depends(get_kassa_user)):
    """Get a product by barcode"""
    
    product = await db.kassa_products.find_one(
        {"barcode": barcode, "business_id": auth["business_id"], "is_active": True}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return clean_doc(product)

@router.post("/products")
async def create_product(data: KassaProductCreate, auth: dict = Depends(get_kassa_user)):
    """Create a new product"""
    
    # Check subscription limits
    business = await db.kassa_businesses.find_one({"id": auth["business_id"]})
    plan = SUBSCRIPTION_PLANS.get(business.get("subscription_plan", "basic"))
    max_products = plan["features"]["max_products"]
    
    if max_products > 0:
        product_count = await db.kassa_products.count_documents({"business_id": auth["business_id"]})
        if product_count >= max_products:
            raise HTTPException(
                status_code=403, 
                detail=f"Maximum aantal producten ({max_products}) bereikt. Upgrade uw abonnement."
            )
    
    # Check for duplicate barcode
    if data.barcode:
        existing = await db.kassa_products.find_one({
            "barcode": data.barcode, 
            "business_id": auth["business_id"]
        })
        if existing:
            raise HTTPException(status_code=400, detail="Barcode is al in gebruik")
    
    product = {
        "id": str(uuid.uuid4()),
        "business_id": auth["business_id"],
        **data.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kassa_products.insert_one(product)
    return clean_doc(product)

@router.put("/products/{product_id}")
async def update_product(product_id: str, data: KassaProductCreate, auth: dict = Depends(get_kassa_user)):
    """Update a product"""
    
    result = await db.kassa_products.update_one(
        {"id": product_id, "business_id": auth["business_id"]},
        {"$set": {
            **data.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return {"message": "Product bijgewerkt"}

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, auth: dict = Depends(get_kassa_user)):
    """Soft delete a product"""
    
    result = await db.kassa_products.update_one(
        {"id": product_id, "business_id": auth["business_id"]},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return {"message": "Product verwijderd"}

# ==================== ORDERS / SALES ====================

@router.get("/orders")
async def get_orders(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    auth: dict = Depends(get_kassa_user)
):
    """Get orders for the business"""
    
    query = {"business_id": auth["business_id"]}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    orders = await db.kassa_orders.find(query).sort("created_at", -1).to_list(limit)
    return [clean_doc(o) for o in orders]

@router.get("/orders/{order_id}")
async def get_order(order_id: str, auth: dict = Depends(get_kassa_user)):
    """Get a single order"""
    
    order = await db.kassa_orders.find_one(
        {"id": order_id, "business_id": auth["business_id"]}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    return clean_doc(order)

@router.post("/orders")
async def create_order(data: KassaOrderCreate, auth: dict = Depends(get_kassa_user)):
    """Create a new order (sale)"""
    
    business = await db.kassa_businesses.find_one({"id": auth["business_id"]})
    btw_percentage = business.get("btw_percentage", 8.0)
    
    # Calculate totals
    subtotal = sum(item.quantity * item.unit_price - item.discount for item in data.items)
    btw_amount = subtotal * (btw_percentage / 100)
    total = subtotal + btw_amount - data.discount_total
    change = data.amount_paid - total
    
    if change < 0:
        raise HTTPException(status_code=400, detail="Onvoldoende betaling")
    
    # Generate order number
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await db.kassa_orders.count_documents({
        "business_id": auth["business_id"],
        "created_at": {"$regex": f"^{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"}
    })
    order_number = f"POS-{today}-{count + 1:04d}"
    
    order = {
        "id": str(uuid.uuid4()),
        "business_id": auth["business_id"],
        "order_number": order_number,
        "user_id": auth["user_id"],
        "customer_id": data.customer_id,
        "items": [item.dict() for item in data.items],
        "subtotal": subtotal,
        "btw_percentage": btw_percentage,
        "btw_amount": btw_amount,
        "discount_total": data.discount_total,
        "total": total,
        "payment_method": data.payment_method,
        "amount_paid": data.amount_paid,
        "change": change,
        "notes": data.notes,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kassa_orders.insert_one(order)
    
    # Update stock quantities
    for item in data.items:
        await db.kassa_products.update_one(
            {"id": item.product_id, "business_id": auth["business_id"], "track_stock": True},
            {"$inc": {"stock_quantity": -item.quantity}}
        )
    
    # Add loyalty points if customer
    if data.customer_id:
        points = int(total / 10)  # 1 point per 10 SRD
        await db.kassa_customers.update_one(
            {"id": data.customer_id, "business_id": auth["business_id"]},
            {
                "$inc": {"loyalty_points": points, "total_spent": total, "order_count": 1},
                "$set": {"last_visit": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    return clean_doc(order)

@router.post("/orders/{order_id}/refund")
async def refund_order(order_id: str, auth: dict = Depends(get_kassa_user)):
    """Refund an order"""
    
    order = await db.kassa_orders.find_one(
        {"id": order_id, "business_id": auth["business_id"]}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    if order.get("status") == "refunded":
        raise HTTPException(status_code=400, detail="Bestelling is al terugbetaald")
    
    # Restore stock
    for item in order.get("items", []):
        await db.kassa_products.update_one(
            {"id": item["product_id"], "business_id": auth["business_id"], "track_stock": True},
            {"$inc": {"stock_quantity": item["quantity"]}}
        )
    
    # Update order status
    await db.kassa_orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "refunded",
            "refunded_at": datetime.now(timezone.utc).isoformat(),
            "refunded_by": auth["user_id"]
        }}
    )
    
    return {"message": "Bestelling terugbetaald"}

# ==================== CUSTOMERS ====================

@router.get("/customers")
async def get_customers(search: Optional[str] = None, auth: dict = Depends(get_kassa_user)):
    """Get all customers"""
    
    query = {"business_id": auth["business_id"]}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.kassa_customers.find(query).sort("name", 1).to_list(500)
    return [clean_doc(c) for c in customers]

@router.post("/customers")
async def create_customer(data: KassaCustomerCreate, auth: dict = Depends(get_kassa_user)):
    """Create a new customer"""
    
    customer = {
        "id": str(uuid.uuid4()),
        "business_id": auth["business_id"],
        **data.dict(),
        "total_spent": 0,
        "order_count": 0,
        "last_visit": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kassa_customers.insert_one(customer)
    return clean_doc(customer)

@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: KassaCustomerCreate, auth: dict = Depends(get_kassa_user)):
    """Update a customer"""
    
    result = await db.kassa_customers.update_one(
        {"id": customer_id, "business_id": auth["business_id"]},
        {"$set": {
            **data.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Klant bijgewerkt"}

# ==================== REPORTS ====================

@router.get("/reports/daily")
async def get_daily_report(date: Optional[str] = None, auth: dict = Depends(get_kassa_user)):
    """Get daily sales report"""
    
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    orders = await db.kassa_orders.find({
        "business_id": auth["business_id"],
        "created_at": {"$regex": f"^{date}"},
        "status": "completed"
    }).to_list(1000)
    
    total_sales = sum(o.get("total", 0) for o in orders)
    total_btw = sum(o.get("btw_amount", 0) for o in orders)
    total_orders = len(orders)
    
    # Payment method breakdown
    payment_methods = {}
    for order in orders:
        method = order.get("payment_method", "cash")
        if method not in payment_methods:
            payment_methods[method] = {"count": 0, "total": 0}
        payment_methods[method]["count"] += 1
        payment_methods[method]["total"] += order.get("total", 0)
    
    # Top products
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            pid = item.get("product_id")
            if pid not in product_sales:
                product_sales[pid] = {
                    "name": item.get("product_name"),
                    "quantity": 0,
                    "revenue": 0
                }
            product_sales[pid]["quantity"] += item.get("quantity", 0)
            product_sales[pid]["revenue"] += item.get("quantity", 0) * item.get("unit_price", 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    return {
        "date": date,
        "total_sales": total_sales,
        "total_btw": total_btw,
        "total_orders": total_orders,
        "average_order": total_sales / total_orders if total_orders > 0 else 0,
        "payment_methods": payment_methods,
        "top_products": top_products
    }

@router.get("/reports/inventory")
async def get_inventory_report(auth: dict = Depends(get_kassa_user)):
    """Get inventory report with low stock alerts"""
    
    products = await db.kassa_products.find({
        "business_id": auth["business_id"],
        "is_active": True,
        "track_stock": True
    }).to_list(1000)
    
    low_stock = [p for p in products if p.get("stock_quantity", 0) <= 5]
    out_of_stock = [p for p in products if p.get("stock_quantity", 0) <= 0]
    
    total_value = sum(
        p.get("stock_quantity", 0) * p.get("cost_price", p.get("price", 0)) 
        for p in products
    )
    
    return {
        "total_products": len(products),
        "total_inventory_value": total_value,
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "low_stock_items": [clean_doc(p) for p in low_stock],
        "out_of_stock_items": [clean_doc(p) for p in out_of_stock]
    }

# ==================== SUBSCRIPTION / PLANS ====================

@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return SUBSCRIPTION_PLANS

@router.get("/subscription")
async def get_subscription(auth: dict = Depends(get_kassa_user)):
    """Get current subscription status"""
    
    business = await db.kassa_businesses.find_one({"id": auth["business_id"]})
    if not business:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    plan = business.get("subscription_plan", "basic")
    status = business.get("subscription_status", "trial")
    
    return {
        "plan": plan,
        "plan_details": SUBSCRIPTION_PLANS.get(plan),
        "status": status,
        "trial_ends_at": business.get("trial_ends_at"),
        "subscription_ends_at": business.get("subscription_ends_at")
    }

# ==================== SETTINGS ====================

@router.get("/settings")
async def get_settings(auth: dict = Depends(get_kassa_user)):
    """Get business settings"""
    
    business = await db.kassa_businesses.find_one({"id": auth["business_id"]})
    if not business:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    return {
        "business_name": business.get("name"),
        "email": business.get("email"),
        "phone": business.get("phone"),
        "address": business.get("address"),
        "kvk_number": business.get("kvk_number"),
        "btw_number": business.get("btw_number"),
        "btw_percentage": business.get("btw_percentage", 8.0),
        "currency": business.get("currency", "SRD"),
        "settings": business.get("settings", {})
    }

@router.put("/settings")
async def update_settings(data: dict, auth: dict = Depends(get_kassa_user)):
    """Update business settings"""
    
    if auth.get("role") not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Geen toegang")
    
    await db.kassa_businesses.update_one(
        {"id": auth["business_id"]},
        {"$set": {
            "name": data.get("business_name"),
            "phone": data.get("phone"),
            "address": data.get("address"),
            "btw_percentage": data.get("btw_percentage", 8.0),
            "settings": data.get("settings", {}),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Instellingen bijgewerkt"}

# ==================== SUPERADMIN ====================

SUPERADMIN_EMAIL = "admin@kassapos.sr"
SUPERADMIN_PASSWORD = "KassaAdmin2026!"

@router.post("/superadmin/login")
async def superadmin_login(email: str, password: str):
    """Superadmin login"""
    
    if email != SUPERADMIN_EMAIL or password != SUPERADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    token = jwt.encode({
        "role": "superadmin",
        "exp": datetime.now(timezone.utc).timestamp() + KASSA_JWT_EXPIRATION
    }, KASSA_JWT_SECRET, algorithm=KASSA_JWT_ALGORITHM)
    
    return {"access_token": token, "role": "superadmin"}

@router.get("/superadmin/businesses")
async def superadmin_get_businesses(authorization: str = Header(None)):
    """Get all businesses (superadmin only)"""
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, KASSA_JWT_SECRET, algorithms=[KASSA_JWT_ALGORITHM])
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Geen toegang")
    except:
        raise HTTPException(status_code=401, detail="Ongeldige token")
    
    businesses = await db.kassa_businesses.find({}).to_list(1000)
    
    result = []
    for b in businesses:
        order_count = await db.kassa_orders.count_documents({"business_id": b["id"]})
        product_count = await db.kassa_products.count_documents({"business_id": b["id"]})
        result.append({
            **clean_doc(b),
            "order_count": order_count,
            "product_count": product_count
        })
    
    return result

@router.put("/superadmin/businesses/{business_id}/plan")
async def superadmin_update_plan(business_id: str, plan: str, authorization: str = Header(None)):
    """Update business subscription plan (superadmin only)"""
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, KASSA_JWT_SECRET, algorithms=[KASSA_JWT_ALGORITHM])
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Geen toegang")
    except:
        raise HTTPException(status_code=401, detail="Ongeldige token")
    
    if plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Ongeldig abonnement")
    
    await db.kassa_businesses.update_one(
        {"id": business_id},
        {"$set": {
            "subscription_plan": plan,
            "subscription_status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Abonnement gewijzigd naar {plan}"}
