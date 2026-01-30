"""
Auto Dealer Module Router
Complete module for managing an auto dealership in Suriname with multi-currency support (SRD, EUR, USD)
"""

from fastapi import APIRouter, Depends, HTTPException
from starlette import status as http_status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import uuid

# Import shared dependencies
from .deps import get_current_user, db

router = APIRouter(prefix="/autodealer", tags=["Auto Dealer"])

# ==================== PYDANTIC MODELS ====================

class MultiCurrencyPrice(BaseModel):
    srd: float = 0.0
    eur: float = 0.0
    usd: float = 0.0

class VehicleBase(BaseModel):
    brand: str = Field(..., description="Merk van het voertuig")
    model: str = Field(..., description="Model van het voertuig")
    year: int = Field(..., description="Bouwjaar")
    license_plate: Optional[str] = Field(None, description="Kenteken")
    vin: Optional[str] = Field(None, description="VIN/Chassisnummer")
    mileage: int = Field(0, description="Kilometerstand")
    fuel_type: str = Field("benzine", description="Brandstoftype")
    transmission: str = Field("automaat", description="Transmissie")
    color: Optional[str] = Field(None, description="Kleur")
    body_type: Optional[str] = Field(None, description="Carrosserie type")
    engine_size: Optional[str] = Field(None, description="Motorinhoud")
    doors: Optional[int] = Field(4, description="Aantal deuren")
    seats: Optional[int] = Field(5, description="Aantal zitplaatsen")
    description: Optional[str] = Field(None, description="Beschrijving")
    features: List[str] = Field(default_factory=list, description="Extra opties")
    images: List[str] = Field(default_factory=list, description="Afbeelding URLs")
    
    # Pricing in multiple currencies
    purchase_price: MultiCurrencyPrice = Field(default_factory=MultiCurrencyPrice)
    selling_price: MultiCurrencyPrice = Field(default_factory=MultiCurrencyPrice)
    
    # Status
    status: str = Field("in_stock", description="Status: in_stock, reserved, sold")
    condition: str = Field("used", description="Conditie: new, used, certified")
    
    # Dates
    purchase_date: Optional[str] = None
    sold_date: Optional[str] = None
    
    # Supplier info
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    license_plate: Optional[str] = None
    vin: Optional[str] = None
    mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    color: Optional[str] = None
    body_type: Optional[str] = None
    engine_size: Optional[str] = None
    doors: Optional[int] = None
    seats: Optional[int] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    images: Optional[List[str]] = None
    purchase_price: Optional[MultiCurrencyPrice] = None
    selling_price: Optional[MultiCurrencyPrice] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    purchase_date: Optional[str] = None
    sold_date: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: str
    user_id: str
    workspace_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# Customer Models
class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    id_number: Optional[str] = Field(None, description="ID/Paspoort nummer")
    notes: Optional[str] = None
    customer_type: str = Field("individual", description="individual or business")
    company_name: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    id_number: Optional[str] = None
    notes: Optional[str] = None
    customer_type: Optional[str] = None
    company_name: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    user_id: str
    workspace_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    total_purchases: int = 0
    total_spent: MultiCurrencyPrice = Field(default_factory=MultiCurrencyPrice)

# Sale Models
class SaleBase(BaseModel):
    vehicle_id: str
    customer_id: str
    sale_price: MultiCurrencyPrice
    currency_used: str = Field("srd", description="Primary currency: srd, eur, usd")
    payment_method: str = Field("cash", description="cash, bank_transfer, financing")
    payment_status: str = Field("pending", description="pending, partial, paid")
    amount_paid: MultiCurrencyPrice = Field(default_factory=MultiCurrencyPrice)
    sale_date: str
    delivery_date: Optional[str] = None
    notes: Optional[str] = None
    commission: Optional[float] = Field(0.0, description="Commissie bedrag")
    salesperson: Optional[str] = None

class SaleCreate(SaleBase):
    pass

class SaleUpdate(BaseModel):
    sale_price: Optional[MultiCurrencyPrice] = None
    currency_used: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    amount_paid: Optional[MultiCurrencyPrice] = None
    delivery_date: Optional[str] = None
    notes: Optional[str] = None
    commission: Optional[float] = None
    salesperson: Optional[str] = None

class SaleResponse(SaleBase):
    id: str
    user_id: str
    workspace_id: Optional[str] = None
    vehicle_info: Optional[dict] = None
    customer_info: Optional[dict] = None
    created_at: str
    updated_at: Optional[str] = None

# Dashboard Stats
class AutoDealerStats(BaseModel):
    total_vehicles: int = 0
    vehicles_in_stock: int = 0
    vehicles_reserved: int = 0
    vehicles_sold: int = 0
    total_customers: int = 0
    total_sales: int = 0
    revenue: MultiCurrencyPrice = Field(default_factory=MultiCurrencyPrice)
    pending_payments: MultiCurrencyPrice = Field(default_factory=MultiCurrencyPrice)
    recent_sales: List[dict] = Field(default_factory=list)
    popular_brands: List[dict] = Field(default_factory=list)

# ==================== HELPER FUNCTIONS ====================

async def check_autodealer_access(user: dict):
    """Check if user has access to Auto Dealer module"""
    if user.get("role") == "superadmin":
        return True
    
    # Check if user has autodealer addon
    user_addon = await db.user_addons.find_one({
        "user_id": user["id"],
        "status": "active"
    })
    
    if user_addon:
        addon = await db.addons.find_one({"id": user_addon["addon_id"]}, {"_id": 0})
        if addon and addon.get("slug") == "autodealer":
            return True
    
    # Check all user addons
    user_addons = await db.user_addons.find({"user_id": user["id"], "status": "active"}).to_list(100)
    for ua in user_addons:
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        if addon and addon.get("slug") == "autodealer":
            return True
    
    return False

def get_workspace_filter(user: dict) -> dict:
    """Get filter for workspace-scoped queries"""
    if user.get("workspace_id"):
        return {"workspace_id": user["workspace_id"]}
    return {"user_id": user["id"]}

# ==================== VEHICLE ENDPOINTS ====================

@router.get("/vehicles", response_model=List[VehicleResponse])
async def get_vehicles(
    status: Optional[str] = None,
    brand: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all vehicles for the dealer"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="U heeft geen toegang tot de Auto Dealer module"
        )
    
    query = get_workspace_filter(current_user)
    
    if status:
        query["status"] = status
    if brand:
        query["brand"] = {"$regex": brand, "$options": "i"}
    
    vehicles = await db.autodealer_vehicles.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [VehicleResponse(**v) for v in vehicles]

@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single vehicle by ID"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = vehicle_id
    
    vehicle = await db.autodealer_vehicles.find_one(query, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Voertuig niet gevonden")
    
    return VehicleResponse(**vehicle)

@router.post("/vehicles", response_model=VehicleResponse)
async def create_vehicle(vehicle: VehicleCreate, current_user: dict = Depends(get_current_user)):
    """Add a new vehicle to inventory"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    now = datetime.now(timezone.utc).isoformat()
    
    vehicle_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "workspace_id": current_user.get("workspace_id"),
        **vehicle.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    # Convert nested models to dict
    if isinstance(vehicle_doc.get("purchase_price"), MultiCurrencyPrice):
        vehicle_doc["purchase_price"] = vehicle_doc["purchase_price"].model_dump()
    if isinstance(vehicle_doc.get("selling_price"), MultiCurrencyPrice):
        vehicle_doc["selling_price"] = vehicle_doc["selling_price"].model_dump()
    
    await db.autodealer_vehicles.insert_one(vehicle_doc)
    
    return VehicleResponse(**vehicle_doc)

@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str, 
    vehicle: VehicleUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update a vehicle"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = vehicle_id
    
    existing = await db.autodealer_vehicles.find_one(query, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Voertuig niet gevonden")
    
    update_data = {k: v for k, v in vehicle.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert nested models
    if "purchase_price" in update_data and isinstance(update_data["purchase_price"], MultiCurrencyPrice):
        update_data["purchase_price"] = update_data["purchase_price"].model_dump()
    if "selling_price" in update_data and isinstance(update_data["selling_price"], MultiCurrencyPrice):
        update_data["selling_price"] = update_data["selling_price"].model_dump()
    
    await db.autodealer_vehicles.update_one(query, {"$set": update_data})
    
    updated = await db.autodealer_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return VehicleResponse(**updated)

@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a vehicle"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = vehicle_id
    
    # Check if vehicle is sold
    existing = await db.autodealer_vehicles.find_one(query, {"_id": 0})
    if existing and existing.get("status") == "sold":
        raise HTTPException(status_code=400, detail="Verkochte voertuigen kunnen niet worden verwijderd")
    
    result = await db.autodealer_vehicles.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voertuig niet gevonden")
    
    return {"message": "Voertuig verwijderd"}

# ==================== CUSTOMER ENDPOINTS ====================

@router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all dealer customers"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.autodealer_customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with purchase stats
    result = []
    for c in customers:
        sales = await db.autodealer_sales.find({
            "customer_id": c["id"],
            **get_workspace_filter(current_user)
        }, {"_id": 0}).to_list(100)
        
        total_spent = {"srd": 0, "eur": 0, "usd": 0}
        for sale in sales:
            sp = sale.get("sale_price", {})
            total_spent["srd"] += sp.get("srd", 0)
            total_spent["eur"] += sp.get("eur", 0)
            total_spent["usd"] += sp.get("usd", 0)
        
        c["total_purchases"] = len(sales)
        c["total_spent"] = total_spent
        result.append(CustomerResponse(**c))
    
    return result

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single customer"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = customer_id
    
    customer = await db.autodealer_customers.find_one(query, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return CustomerResponse(**customer)

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    now = datetime.now(timezone.utc).isoformat()
    
    customer_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "workspace_id": current_user.get("workspace_id"),
        **customer.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.autodealer_customers.insert_one(customer_doc)
    
    return CustomerResponse(**customer_doc)

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer: CustomerUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a customer"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = customer_id
    
    existing = await db.autodealer_customers.find_one(query, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    update_data = {k: v for k, v in customer.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.autodealer_customers.update_one(query, {"$set": update_data})
    
    updated = await db.autodealer_customers.find_one({"id": customer_id}, {"_id": 0})
    return CustomerResponse(**updated)

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a customer"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = customer_id
    
    # Check if customer has sales
    sales_count = await db.autodealer_sales.count_documents({"customer_id": customer_id})
    if sales_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Klant met verkoophistorie kan niet worden verwijderd"
        )
    
    result = await db.autodealer_customers.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Klant verwijderd"}

# ==================== SALES ENDPOINTS ====================

@router.get("/sales", response_model=List[SaleResponse])
async def get_sales(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all sales"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    
    if status:
        query["payment_status"] = status
    
    sales = await db.autodealer_sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with vehicle and customer info
    result = []
    for s in sales:
        vehicle = await db.autodealer_vehicles.find_one({"id": s.get("vehicle_id")}, {"_id": 0})
        customer = await db.autodealer_customers.find_one({"id": s.get("customer_id")}, {"_id": 0})
        
        s["vehicle_info"] = {
            "brand": vehicle.get("brand") if vehicle else None,
            "model": vehicle.get("model") if vehicle else None,
            "year": vehicle.get("year") if vehicle else None,
            "license_plate": vehicle.get("license_plate") if vehicle else None
        } if vehicle else None
        
        s["customer_info"] = {
            "name": customer.get("name") if customer else None,
            "phone": customer.get("phone") if customer else None
        } if customer else None
        
        result.append(SaleResponse(**s))
    
    return result

@router.get("/sales/{sale_id}", response_model=SaleResponse)
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single sale"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = sale_id
    
    sale = await db.autodealer_sales.find_one(query, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Verkoop niet gevonden")
    
    # Enrich
    vehicle = await db.autodealer_vehicles.find_one({"id": sale.get("vehicle_id")}, {"_id": 0})
    customer = await db.autodealer_customers.find_one({"id": sale.get("customer_id")}, {"_id": 0})
    
    sale["vehicle_info"] = vehicle
    sale["customer_info"] = customer
    
    return SaleResponse(**sale)

@router.post("/sales", response_model=SaleResponse)
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new sale"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    # Verify vehicle exists and is available
    vehicle_query = get_workspace_filter(current_user)
    vehicle_query["id"] = sale.vehicle_id
    
    vehicle = await db.autodealer_vehicles.find_one(vehicle_query, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Voertuig niet gevonden")
    
    if vehicle.get("status") == "sold":
        raise HTTPException(status_code=400, detail="Voertuig is al verkocht")
    
    # Verify customer exists
    customer_query = get_workspace_filter(current_user)
    customer_query["id"] = sale.customer_id
    
    customer = await db.autodealer_customers.find_one(customer_query, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    now = datetime.now(timezone.utc).isoformat()
    
    sale_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "workspace_id": current_user.get("workspace_id"),
        **sale.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    # Convert nested models
    if isinstance(sale_doc.get("sale_price"), MultiCurrencyPrice):
        sale_doc["sale_price"] = sale_doc["sale_price"].model_dump()
    if isinstance(sale_doc.get("amount_paid"), MultiCurrencyPrice):
        sale_doc["amount_paid"] = sale_doc["amount_paid"].model_dump()
    
    await db.autodealer_sales.insert_one(sale_doc)
    
    # Update vehicle status to sold
    await db.autodealer_vehicles.update_one(
        {"id": sale.vehicle_id},
        {"$set": {"status": "sold", "sold_date": sale.sale_date, "updated_at": now}}
    )
    
    return SaleResponse(**sale_doc)

@router.put("/sales/{sale_id}", response_model=SaleResponse)
async def update_sale(
    sale_id: str,
    sale: SaleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a sale"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = sale_id
    
    existing = await db.autodealer_sales.find_one(query, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Verkoop niet gevonden")
    
    update_data = {k: v for k, v in sale.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert nested models
    if "sale_price" in update_data and isinstance(update_data["sale_price"], MultiCurrencyPrice):
        update_data["sale_price"] = update_data["sale_price"].model_dump()
    if "amount_paid" in update_data and isinstance(update_data["amount_paid"], MultiCurrencyPrice):
        update_data["amount_paid"] = update_data["amount_paid"].model_dump()
    
    await db.autodealer_sales.update_one(query, {"$set": update_data})
    
    updated = await db.autodealer_sales.find_one({"id": sale_id}, {"_id": 0})
    return SaleResponse(**updated)

@router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a sale (will restore vehicle status)"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    query = get_workspace_filter(current_user)
    query["id"] = sale_id
    
    sale = await db.autodealer_sales.find_one(query, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Verkoop niet gevonden")
    
    # Restore vehicle status
    await db.autodealer_vehicles.update_one(
        {"id": sale.get("vehicle_id")},
        {"$set": {"status": "in_stock", "sold_date": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    result = await db.autodealer_sales.delete_one(query)
    
    return {"message": "Verkoop verwijderd en voertuig terug op voorraad"}

# ==================== DASHBOARD STATS ====================

@router.get("/stats", response_model=AutoDealerStats)
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    if not await check_autodealer_access(current_user):
        raise HTTPException(status_code=403, detail="Geen toegang tot Auto Dealer module")
    
    base_query = get_workspace_filter(current_user)
    
    # Vehicle counts
    total_vehicles = await db.autodealer_vehicles.count_documents(base_query)
    in_stock = await db.autodealer_vehicles.count_documents({**base_query, "status": "in_stock"})
    reserved = await db.autodealer_vehicles.count_documents({**base_query, "status": "reserved"})
    sold = await db.autodealer_vehicles.count_documents({**base_query, "status": "sold"})
    
    # Customer count
    total_customers = await db.autodealer_customers.count_documents(base_query)
    
    # Sales stats
    sales = await db.autodealer_sales.find(base_query, {"_id": 0}).to_list(1000)
    total_sales = len(sales)
    
    revenue = {"srd": 0, "eur": 0, "usd": 0}
    pending = {"srd": 0, "eur": 0, "usd": 0}
    
    for sale in sales:
        sp = sale.get("sale_price", {})
        ap = sale.get("amount_paid", {})
        
        revenue["srd"] += sp.get("srd", 0)
        revenue["eur"] += sp.get("eur", 0)
        revenue["usd"] += sp.get("usd", 0)
        
        if sale.get("payment_status") != "paid":
            pending["srd"] += sp.get("srd", 0) - ap.get("srd", 0)
            pending["eur"] += sp.get("eur", 0) - ap.get("eur", 0)
            pending["usd"] += sp.get("usd", 0) - ap.get("usd", 0)
    
    # Recent sales (last 5)
    recent_sales = await db.autodealer_sales.find(base_query, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_enriched = []
    for s in recent_sales:
        vehicle = await db.autodealer_vehicles.find_one({"id": s.get("vehicle_id")}, {"_id": 0})
        customer = await db.autodealer_customers.find_one({"id": s.get("customer_id")}, {"_id": 0})
        recent_enriched.append({
            "id": s.get("id"),
            "vehicle": f"{vehicle.get('brand', '')} {vehicle.get('model', '')}" if vehicle else "Onbekend",
            "customer": customer.get("name") if customer else "Onbekend",
            "price": s.get("sale_price", {}),
            "date": s.get("sale_date")
        })
    
    # Popular brands
    pipeline = [
        {"$match": base_query},
        {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    brand_stats = await db.autodealer_vehicles.aggregate(pipeline).to_list(5)
    popular_brands = [{"brand": b["_id"], "count": b["count"]} for b in brand_stats]
    
    return AutoDealerStats(
        total_vehicles=total_vehicles,
        vehicles_in_stock=in_stock,
        vehicles_reserved=reserved,
        vehicles_sold=sold,
        total_customers=total_customers,
        total_sales=total_sales,
        revenue=revenue,
        pending_payments=pending,
        recent_sales=recent_enriched,
        popular_brands=popular_brands
    )
