# Pompstation Module Router - Gas Station Management for Suriname
# Full-featured module for fuel management, POS, inventory, personnel, and compliance

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

router = APIRouter(prefix="/pompstation", tags=["Pompstation"])

# ==================== PYDANTIC MODELS ====================

# Tank Models
class TankBase(BaseModel):
    name: str  # e.g., "Tank 1 - Diesel"
    fuel_type: str  # diesel, benzine, super, kerosine
    capacity_liters: float
    current_level_liters: float
    min_level_alert: float = 1000.0
    location: Optional[str] = None
    last_calibration: Optional[str] = None

class TankCreate(TankBase):
    pass

class TankResponse(TankBase):
    id: str
    workspace_id: str
    percentage_full: float
    status: str  # normal, low, critical, leak_detected
    created_at: str
    updated_at: Optional[str] = None

# Tank Reading Models
class TankReadingCreate(BaseModel):
    tank_id: str
    level_liters: float
    temperature_celsius: Optional[float] = None
    reading_type: str = "manual"  # manual, automatic, delivery

class TankReadingResponse(BaseModel):
    id: str
    tank_id: str
    level_liters: float
    temperature_celsius: Optional[float] = None
    reading_type: str
    recorded_by: Optional[str] = None
    created_at: str

# Fuel Delivery Models
class FuelDeliveryCreate(BaseModel):
    tank_id: str
    supplier: str  # Staatsolie, Sol, GOw2
    truck_number: Optional[str] = None
    driver_name: Optional[str] = None
    ordered_liters: float
    delivered_liters: float
    price_per_liter: float
    delivery_note_number: Optional[str] = None
    temperature_correction: float = 0.0
    notes: Optional[str] = None

class FuelDeliveryResponse(FuelDeliveryCreate):
    id: str
    workspace_id: str
    tank_name: str
    fuel_type: str
    total_cost: float
    variance_liters: float
    variance_percentage: float
    status: str  # pending, verified, disputed
    created_at: str

# Pump Models
class PumpCreate(BaseModel):
    number: int
    name: str
    tank_id: str
    status: str = "active"  # active, inactive, maintenance
    last_maintenance: Optional[str] = None

class PumpResponse(PumpCreate):
    id: str
    workspace_id: str
    tank_name: str
    fuel_type: str
    total_sales_today: float
    total_liters_today: float
    created_at: str

# Fuel Price Models
class FuelPriceCreate(BaseModel):
    fuel_type: str
    price_per_liter: float
    effective_date: str

class FuelPriceResponse(FuelPriceCreate):
    id: str
    workspace_id: str
    previous_price: Optional[float] = None
    created_at: str

# POS Sale Models
class POSSaleItemCreate(BaseModel):
    item_type: str  # fuel, shop_item
    item_id: Optional[str] = None
    name: str
    quantity: float
    unit_price: float
    discount: float = 0.0

class POSSaleCreate(BaseModel):
    items: List[POSSaleItemCreate]
    payment_method: str  # cash, pin, credit_card, qr, ewallet
    pump_number: Optional[int] = None
    customer_name: Optional[str] = None
    loyalty_card_number: Optional[str] = None

class POSSaleResponse(BaseModel):
    id: str
    workspace_id: str
    receipt_number: str
    items: List[dict]
    subtotal: float
    discount_total: float
    total: float
    payment_method: str
    pump_number: Optional[int] = None
    operator_id: str
    operator_name: str
    shift_id: Optional[str] = None
    created_at: str

# Shop Product Models
class ShopProductCreate(BaseModel):
    name: str
    category: str  # snacks, drinks, oil, accessories, gas_cylinders, phone_cards
    barcode: Optional[str] = None
    sku: Optional[str] = None
    purchase_price: float
    selling_price: float
    stock_quantity: int
    min_stock_alert: int = 5
    supplier: Optional[str] = None
    # For gas cylinders
    serial_number: Optional[str] = None

class ShopProductResponse(ShopProductCreate):
    id: str
    workspace_id: str
    profit_margin: float
    stock_status: str  # ok, low, out_of_stock
    created_at: str
    updated_at: Optional[str] = None

# Shift Models
class ShiftCreate(BaseModel):
    operator_id: str
    pump_numbers: List[int]
    starting_cash: float

class ShiftResponse(BaseModel):
    id: str
    workspace_id: str
    operator_id: str
    operator_name: str
    pump_numbers: List[int]
    start_time: str
    end_time: Optional[str] = None
    starting_cash: float
    ending_cash: Optional[float] = None
    total_sales: float
    total_fuel_liters: float
    total_shop_sales: float
    cash_difference: Optional[float] = None
    status: str  # active, closed
    created_at: str

# Personnel Models
class PompstationEmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str  # beheerder, kassier, pompbediende, manager
    pin_code: Optional[str] = None
    hourly_rate: Optional[float] = None
    start_date: Optional[str] = None

class PompstationEmployeeResponse(PompstationEmployeeCreate):
    id: str
    workspace_id: str
    is_active: bool
    total_shifts: int
    total_hours: float
    created_at: str

# Safety Inspection Models
class SafetyInspectionCreate(BaseModel):
    inspection_type: str  # fire_extinguisher, emergency_exit, tank_inspection, environmental
    inspector_name: str
    status: str  # passed, failed, needs_attention
    findings: Optional[str] = None
    next_inspection_date: Optional[str] = None
    attachments: List[str] = []

class SafetyInspectionResponse(SafetyInspectionCreate):
    id: str
    workspace_id: str
    inspection_date: str
    created_at: str

# Incident Log Models
class IncidentCreate(BaseModel):
    incident_type: str  # spill, accident, theft, equipment_failure, customer_complaint
    severity: str  # low, medium, high, critical
    description: str
    location: Optional[str] = None
    involved_persons: List[str] = []
    actions_taken: Optional[str] = None
    resolved: bool = False

class IncidentResponse(IncidentCreate):
    id: str
    workspace_id: str
    reported_by: str
    incident_date: str
    resolution_date: Optional[str] = None
    created_at: str

# Daily Closing Models
class DailyClosingResponse(BaseModel):
    id: str
    workspace_id: str
    date: str
    total_fuel_sales: float
    total_fuel_liters: float
    total_shop_sales: float
    total_sales: float
    total_cash: float
    total_card: float
    total_other: float
    cash_expected: float
    cash_actual: float
    cash_difference: float
    shifts_count: int
    transactions_count: int
    created_at: str

# ==================== DEPENDENCY ====================

# Import from shared deps
from .deps import db, get_current_user, security

def get_workspace_filter(user: dict) -> dict:
    workspace_id = user.get("workspace_id")
    if workspace_id:
        return {"workspace_id": workspace_id}
    return {"user_id": user["id"]}

# ==================== TANK ENDPOINTS ====================

@router.get("/tanks", response_model=List[TankResponse])
async def get_tanks(current_user: dict = Depends(get_current_user)):
    """Get all fuel tanks"""
    query = get_workspace_filter(current_user)
    tanks = await db.pompstation_tanks.find(query, {"_id": 0}).to_list(100)
    
    for tank in tanks:
        tank["percentage_full"] = round((tank["current_level_liters"] / tank["capacity_liters"]) * 100, 1)
        if tank["current_level_liters"] <= tank["min_level_alert"] * 0.5:
            tank["status"] = "critical"
        elif tank["current_level_liters"] <= tank["min_level_alert"]:
            tank["status"] = "low"
        else:
            tank["status"] = "normal"
    
    return tanks

@router.post("/tanks", response_model=TankResponse)
async def create_tank(tank: TankCreate, current_user: dict = Depends(get_current_user)):
    """Create a new fuel tank"""
    now = datetime.now(timezone.utc).isoformat()
    
    tank_doc = {
        "id": str(uuid.uuid4()),
        **tank.model_dump(),
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pompstation_tanks.insert_one(tank_doc)
    tank_doc.pop("_id", None)
    
    tank_doc["percentage_full"] = round((tank_doc["current_level_liters"] / tank_doc["capacity_liters"]) * 100, 1)
    tank_doc["status"] = "normal"
    
    return tank_doc

@router.put("/tanks/{tank_id}", response_model=TankResponse)
async def update_tank(tank_id: str, tank: TankCreate, current_user: dict = Depends(get_current_user)):
    """Update a tank"""
    query = {**get_workspace_filter(current_user), "id": tank_id}
    
    result = await db.pompstation_tanks.update_one(
        query,
        {"$set": {**tank.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tank niet gevonden")
    
    updated = await db.pompstation_tanks.find_one(query, {"_id": 0})
    updated["percentage_full"] = round((updated["current_level_liters"] / updated["capacity_liters"]) * 100, 1)
    updated["status"] = "normal" if updated["current_level_liters"] > updated["min_level_alert"] else "low"
    
    return updated

@router.post("/tanks/{tank_id}/readings", response_model=TankReadingResponse)
async def add_tank_reading(tank_id: str, reading: TankReadingCreate, current_user: dict = Depends(get_current_user)):
    """Add a tank level reading"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Update tank current level
    query = {**get_workspace_filter(current_user), "id": tank_id}
    tank = await db.pompstation_tanks.find_one(query)
    if not tank:
        raise HTTPException(status_code=404, detail="Tank niet gevonden")
    
    await db.pompstation_tanks.update_one(query, {"$set": {"current_level_liters": reading.level_liters, "updated_at": now}})
    
    reading_doc = {
        "id": str(uuid.uuid4()),
        **reading.model_dump(),
        "workspace_id": current_user.get("workspace_id"),
        "recorded_by": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_tank_readings.insert_one(reading_doc)
    reading_doc.pop("_id", None)
    
    return reading_doc

@router.get("/tanks/{tank_id}/history")
async def get_tank_history(tank_id: str, days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get tank level history"""
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    readings = await db.pompstation_tank_readings.find(
        {"tank_id": tank_id, "created_at": {"$gte": from_date}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return {"tank_id": tank_id, "readings": readings, "period_days": days}

# ==================== FUEL DELIVERY ENDPOINTS ====================

@router.get("/deliveries", response_model=List[FuelDeliveryResponse])
async def get_deliveries(current_user: dict = Depends(get_current_user)):
    """Get all fuel deliveries"""
    query = get_workspace_filter(current_user)
    deliveries = await db.pompstation_deliveries.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return deliveries

@router.post("/deliveries", response_model=FuelDeliveryResponse)
async def create_delivery(delivery: FuelDeliveryCreate, current_user: dict = Depends(get_current_user)):
    """Register a new fuel delivery"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Get tank info
    tank = await db.pompstation_tanks.find_one({"id": delivery.tank_id}, {"_id": 0})
    if not tank:
        raise HTTPException(status_code=404, detail="Tank niet gevonden")
    
    variance = delivery.delivered_liters - delivery.ordered_liters
    variance_pct = (variance / delivery.ordered_liters * 100) if delivery.ordered_liters > 0 else 0
    
    delivery_doc = {
        "id": str(uuid.uuid4()),
        **delivery.model_dump(),
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "tank_name": tank["name"],
        "fuel_type": tank["fuel_type"],
        "total_cost": delivery.delivered_liters * delivery.price_per_liter,
        "variance_liters": round(variance, 2),
        "variance_percentage": round(variance_pct, 2),
        "status": "verified" if abs(variance_pct) < 1 else "pending",
        "created_at": now
    }
    
    await db.pompstation_deliveries.insert_one(delivery_doc)
    delivery_doc.pop("_id", None)
    
    # Update tank level
    new_level = min(tank["current_level_liters"] + delivery.delivered_liters, tank["capacity_liters"])
    await db.pompstation_tanks.update_one(
        {"id": delivery.tank_id},
        {"$set": {"current_level_liters": new_level, "updated_at": now}}
    )
    
    return delivery_doc

# ==================== PUMP ENDPOINTS ====================

@router.get("/pumps", response_model=List[PumpResponse])
async def get_pumps(current_user: dict = Depends(get_current_user)):
    """Get all pumps"""
    query = get_workspace_filter(current_user)
    pumps = await db.pompstation_pumps.find(query, {"_id": 0}).to_list(50)
    
    # Calculate today's sales per pump
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    
    for pump in pumps:
        tank = await db.pompstation_tanks.find_one({"id": pump["tank_id"]}, {"_id": 0})
        pump["tank_name"] = tank["name"] if tank else "Onbekend"
        pump["fuel_type"] = tank["fuel_type"] if tank else "Onbekend"
        
        # Get today's sales for this pump
        sales = await db.pompstation_sales.find({
            "pump_number": pump["number"],
            "workspace_id": pump["workspace_id"],
            "created_at": {"$gte": today}
        }).to_list(1000)
        
        pump["total_sales_today"] = sum(s.get("total", 0) for s in sales)
        pump["total_liters_today"] = sum(
            item.get("quantity", 0) 
            for s in sales 
            for item in s.get("items", []) 
            if item.get("item_type") == "fuel"
        )
    
    return pumps

@router.post("/pumps", response_model=PumpResponse)
async def create_pump(pump: PumpCreate, current_user: dict = Depends(get_current_user)):
    """Create a new pump"""
    now = datetime.now(timezone.utc).isoformat()
    
    tank = await db.pompstation_tanks.find_one({"id": pump.tank_id}, {"_id": 0})
    if not tank:
        raise HTTPException(status_code=404, detail="Tank niet gevonden")
    
    pump_doc = {
        "id": str(uuid.uuid4()),
        **pump.model_dump(),
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_pumps.insert_one(pump_doc)
    pump_doc.pop("_id", None)
    
    pump_doc["tank_name"] = tank["name"]
    pump_doc["fuel_type"] = tank["fuel_type"]
    pump_doc["total_sales_today"] = 0
    pump_doc["total_liters_today"] = 0
    
    return pump_doc

# ==================== FUEL PRICES ENDPOINTS ====================

@router.get("/prices")
async def get_fuel_prices(current_user: dict = Depends(get_current_user)):
    """Get current fuel prices"""
    query = get_workspace_filter(current_user)
    prices = await db.pompstation_prices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get latest price per fuel type
    latest = {}
    for price in prices:
        if price["fuel_type"] not in latest:
            latest[price["fuel_type"]] = price
    
    return {"prices": list(latest.values()), "all_history": prices[:20]}

@router.post("/prices", response_model=FuelPriceResponse)
async def set_fuel_price(price: FuelPriceCreate, current_user: dict = Depends(get_current_user)):
    """Set a new fuel price"""
    now = datetime.now(timezone.utc).isoformat()
    query = get_workspace_filter(current_user)
    
    # Get previous price
    previous = await db.pompstation_prices.find_one(
        {**query, "fuel_type": price.fuel_type},
        {"_id": 0}
    )
    
    price_doc = {
        "id": str(uuid.uuid4()),
        **price.model_dump(),
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "previous_price": previous["price_per_liter"] if previous else None,
        "created_at": now
    }
    
    await db.pompstation_prices.insert_one(price_doc)
    price_doc.pop("_id", None)
    
    return price_doc

# ==================== POS/SALES ENDPOINTS ====================

@router.get("/sales")
async def get_sales(
    date_from: Optional[str] = None, 
    date_to: Optional[str] = None,
    payment_method: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get sales with filters"""
    query = get_workspace_filter(current_user)
    
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    if payment_method:
        query["payment_method"] = payment_method
    
    sales = await db.pompstation_sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    total = sum(s.get("total", 0) for s in sales)
    
    return {"sales": sales, "count": len(sales), "total": total}

@router.post("/sales", response_model=POSSaleResponse)
async def create_sale(sale: POSSaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new POS sale"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate totals
    items = []
    subtotal = 0
    discount_total = 0
    
    for item in sale.items:
        item_total = item.quantity * item.unit_price
        item_discount = item.discount
        items.append({
            **item.model_dump(),
            "total": item_total - item_discount
        })
        subtotal += item_total
        discount_total += item_discount
    
    # Generate receipt number
    count = await db.pompstation_sales.count_documents(get_workspace_filter(current_user))
    receipt_number = f"BON-{count + 1:06d}"
    
    # Get active shift
    shift = await db.pompstation_shifts.find_one({
        **get_workspace_filter(current_user),
        "operator_id": current_user["id"],
        "status": "active"
    }, {"_id": 0})
    
    sale_doc = {
        "id": str(uuid.uuid4()),
        "receipt_number": receipt_number,
        "items": items,
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
        "total": round(subtotal - discount_total, 2),
        "payment_method": sale.payment_method,
        "pump_number": sale.pump_number,
        "customer_name": sale.customer_name,
        "loyalty_card_number": sale.loyalty_card_number,
        "operator_id": current_user["id"],
        "operator_name": current_user.get("name", "Onbekend"),
        "shift_id": shift["id"] if shift else None,
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_sales.insert_one(sale_doc)
    sale_doc.pop("_id", None)
    
    # Update tank levels for fuel sales
    for item in items:
        if item["item_type"] == "fuel" and sale.pump_number:
            pump = await db.pompstation_pumps.find_one({"number": sale.pump_number})
            if pump:
                tank = await db.pompstation_tanks.find_one({"id": pump["tank_id"]})
                if tank:
                    new_level = max(0, tank["current_level_liters"] - item["quantity"])
                    await db.pompstation_tanks.update_one(
                        {"id": pump["tank_id"]},
                        {"$set": {"current_level_liters": new_level}}
                    )
    
    # Update shop stock
    for item in items:
        if item["item_type"] == "shop_item" and item.get("item_id"):
            await db.pompstation_products.update_one(
                {"id": item["item_id"]},
                {"$inc": {"stock_quantity": -int(item["quantity"])}}
            )
    
    return sale_doc

# ==================== SHOP PRODUCTS ENDPOINTS ====================

@router.get("/products", response_model=List[ShopProductResponse])
async def get_products(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get shop products"""
    query = get_workspace_filter(current_user)
    if category:
        query["category"] = category
    
    products = await db.pompstation_products.find(query, {"_id": 0}).to_list(500)
    
    for product in products:
        product["profit_margin"] = round(
            ((product["selling_price"] - product["purchase_price"]) / product["selling_price"]) * 100, 1
        ) if product["selling_price"] > 0 else 0
        
        if product["stock_quantity"] <= 0:
            product["stock_status"] = "out_of_stock"
        elif product["stock_quantity"] <= product["min_stock_alert"]:
            product["stock_status"] = "low"
        else:
            product["stock_status"] = "ok"
    
    return products

@router.post("/products", response_model=ShopProductResponse)
async def create_product(product: ShopProductCreate, current_user: dict = Depends(get_current_user)):
    """Create a shop product"""
    now = datetime.now(timezone.utc).isoformat()
    
    product_doc = {
        "id": str(uuid.uuid4()),
        **product.model_dump(),
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pompstation_products.insert_one(product_doc)
    product_doc.pop("_id", None)
    
    product_doc["profit_margin"] = round(
        ((product_doc["selling_price"] - product_doc["purchase_price"]) / product_doc["selling_price"]) * 100, 1
    ) if product_doc["selling_price"] > 0 else 0
    product_doc["stock_status"] = "ok" if product_doc["stock_quantity"] > product_doc["min_stock_alert"] else "low"
    
    return product_doc

@router.put("/products/{product_id}")
async def update_product(product_id: str, product: ShopProductCreate, current_user: dict = Depends(get_current_user)):
    """Update a product"""
    query = {**get_workspace_filter(current_user), "id": product_id}
    
    result = await db.pompstation_products.update_one(
        query,
        {"$set": {**product.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return {"message": "Product bijgewerkt"}

# ==================== SHIFT ENDPOINTS ====================

@router.get("/shifts")
async def get_shifts(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get shifts"""
    query = get_workspace_filter(current_user)
    if status:
        query["status"] = status
    
    shifts = await db.pompstation_shifts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return shifts

@router.post("/shifts/start", response_model=ShiftResponse)
async def start_shift(shift: ShiftCreate, current_user: dict = Depends(get_current_user)):
    """Start a new shift"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check for active shift
    query = get_workspace_filter(current_user)
    existing = await db.pompstation_shifts.find_one({**query, "operator_id": shift.operator_id, "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="Operator heeft al een actieve shift")
    
    # Get operator name
    employee = await db.pompstation_employees.find_one({"id": shift.operator_id}, {"_id": 0})
    operator_name = employee["name"] if employee else current_user.get("name", "Onbekend")
    
    shift_doc = {
        "id": str(uuid.uuid4()),
        **shift.model_dump(),
        "operator_name": operator_name,
        "start_time": now,
        "end_time": None,
        "ending_cash": None,
        "total_sales": 0,
        "total_fuel_liters": 0,
        "total_shop_sales": 0,
        "cash_difference": None,
        "status": "active",
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_shifts.insert_one(shift_doc)
    shift_doc.pop("_id", None)
    
    return shift_doc

@router.post("/shifts/{shift_id}/close")
async def close_shift(shift_id: str, ending_cash: float, current_user: dict = Depends(get_current_user)):
    """Close a shift"""
    now = datetime.now(timezone.utc).isoformat()
    
    query = {**get_workspace_filter(current_user), "id": shift_id}
    shift = await db.pompstation_shifts.find_one(query, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    if shift["status"] == "closed":
        raise HTTPException(status_code=400, detail="Shift is al afgesloten")
    
    # Calculate totals from sales during this shift
    sales = await db.pompstation_sales.find({
        "shift_id": shift_id,
        "workspace_id": shift["workspace_id"]
    }).to_list(1000)
    
    total_sales = sum(s.get("total", 0) for s in sales)
    cash_sales = sum(s.get("total", 0) for s in sales if s.get("payment_method") == "cash")
    total_fuel_liters = sum(
        item.get("quantity", 0) 
        for s in sales 
        for item in s.get("items", []) 
        if item.get("item_type") == "fuel"
    )
    total_shop = sum(
        item.get("total", 0) 
        for s in sales 
        for item in s.get("items", []) 
        if item.get("item_type") == "shop_item"
    )
    
    expected_cash = shift["starting_cash"] + cash_sales
    cash_difference = ending_cash - expected_cash
    
    await db.pompstation_shifts.update_one(
        query,
        {"$set": {
            "end_time": now,
            "ending_cash": ending_cash,
            "total_sales": round(total_sales, 2),
            "total_fuel_liters": round(total_fuel_liters, 2),
            "total_shop_sales": round(total_shop, 2),
            "cash_difference": round(cash_difference, 2),
            "status": "closed"
        }}
    )
    
    return {
        "message": "Shift afgesloten",
        "total_sales": total_sales,
        "expected_cash": expected_cash,
        "actual_cash": ending_cash,
        "difference": cash_difference
    }

# ==================== EMPLOYEE ENDPOINTS ====================

@router.get("/employees", response_model=List[PompstationEmployeeResponse])
async def get_employees(current_user: dict = Depends(get_current_user)):
    """Get all employees"""
    query = get_workspace_filter(current_user)
    employees = await db.pompstation_employees.find(query, {"_id": 0}).to_list(100)
    
    for emp in employees:
        shifts = await db.pompstation_shifts.find({"operator_id": emp["id"]}).to_list(1000)
        emp["total_shifts"] = len(shifts)
        # Calculate hours (simplified)
        emp["total_hours"] = sum(8 for s in shifts if s.get("status") == "closed")
    
    return employees

@router.post("/employees", response_model=PompstationEmployeeResponse)
async def create_employee(employee: PompstationEmployeeCreate, current_user: dict = Depends(get_current_user)):
    """Create an employee"""
    now = datetime.now(timezone.utc).isoformat()
    
    emp_doc = {
        "id": str(uuid.uuid4()),
        **employee.model_dump(),
        "is_active": True,
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_employees.insert_one(emp_doc)
    emp_doc.pop("_id", None)
    emp_doc["total_shifts"] = 0
    emp_doc["total_hours"] = 0
    
    return emp_doc

# ==================== SAFETY & COMPLIANCE ENDPOINTS ====================

@router.get("/inspections")
async def get_inspections(current_user: dict = Depends(get_current_user)):
    """Get safety inspections"""
    query = get_workspace_filter(current_user)
    inspections = await db.pompstation_inspections.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return inspections

@router.post("/inspections", response_model=SafetyInspectionResponse)
async def create_inspection(inspection: SafetyInspectionCreate, current_user: dict = Depends(get_current_user)):
    """Record a safety inspection"""
    now = datetime.now(timezone.utc).isoformat()
    
    insp_doc = {
        "id": str(uuid.uuid4()),
        **inspection.model_dump(),
        "inspection_date": now,
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_inspections.insert_one(insp_doc)
    insp_doc.pop("_id", None)
    
    return insp_doc

@router.get("/incidents")
async def get_incidents(resolved: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    """Get incidents"""
    query = get_workspace_filter(current_user)
    if resolved is not None:
        query["resolved"] = resolved
    
    incidents = await db.pompstation_incidents.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return incidents

@router.post("/incidents", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate, current_user: dict = Depends(get_current_user)):
    """Report an incident"""
    now = datetime.now(timezone.utc).isoformat()
    
    inc_doc = {
        "id": str(uuid.uuid4()),
        **incident.model_dump(),
        "incident_date": now,
        "reported_by": current_user.get("name", "Onbekend"),
        "resolution_date": None,
        "workspace_id": current_user.get("workspace_id"),
        "user_id": current_user["id"],
        "created_at": now
    }
    
    await db.pompstation_incidents.insert_one(inc_doc)
    inc_doc.pop("_id", None)
    
    return inc_doc

# ==================== DASHBOARD & REPORTS ====================

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """Get dashboard overview"""
    query = get_workspace_filter(current_user)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # Get tanks
    tanks = await db.pompstation_tanks.find(query, {"_id": 0}).to_list(50)
    low_tanks = [t for t in tanks if t["current_level_liters"] <= t["min_level_alert"]]
    
    # Get today's sales
    today_sales = await db.pompstation_sales.find({**query, "created_at": {"$gte": today}}).to_list(1000)
    today_total = sum(s.get("total", 0) for s in today_sales)
    today_fuel_liters = sum(
        item.get("quantity", 0) 
        for s in today_sales 
        for item in s.get("items", []) 
        if item.get("item_type") == "fuel"
    )
    
    # Get week's sales
    week_sales = await db.pompstation_sales.find({**query, "created_at": {"$gte": week_ago}}).to_list(5000)
    week_total = sum(s.get("total", 0) for s in week_sales)
    
    # Get month's sales
    month_sales = await db.pompstation_sales.find({**query, "created_at": {"$gte": month_ago}}).to_list(10000)
    month_total = sum(s.get("total", 0) for s in month_sales)
    
    # Active shifts
    active_shifts = await db.pompstation_shifts.count_documents({**query, "status": "active"})
    
    # Low stock products
    low_stock = await db.pompstation_products.find({
        **query, 
        "$expr": {"$lte": ["$stock_quantity", "$min_stock_alert"]}
    }).to_list(50)
    
    # Recent incidents
    recent_incidents = await db.pompstation_incidents.find({**query, "resolved": False}).to_list(10)
    
    # Pumps
    pumps = await db.pompstation_pumps.find(query, {"_id": 0}).to_list(50)
    
    return {
        "tanks": {
            "total": len(tanks),
            "low_level": len(low_tanks),
            "details": tanks
        },
        "sales": {
            "today": {
                "total": round(today_total, 2),
                "transactions": len(today_sales),
                "fuel_liters": round(today_fuel_liters, 2)
            },
            "week": {
                "total": round(week_total, 2),
                "transactions": len(week_sales)
            },
            "month": {
                "total": round(month_total, 2),
                "transactions": len(month_sales)
            }
        },
        "operations": {
            "active_shifts": active_shifts,
            "pumps_active": len([p for p in pumps if p.get("status") == "active"]),
            "pumps_total": len(pumps)
        },
        "alerts": {
            "low_tanks": [{"id": t["id"], "name": t["name"], "level": t["current_level_liters"]} for t in low_tanks],
            "low_stock_products": len(low_stock),
            "open_incidents": len(recent_incidents)
        }
    }

@router.get("/reports/daily")
async def get_daily_report(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get daily closing report"""
    query = get_workspace_filter(current_user)
    
    if date:
        start = date + "T00:00:00"
        end = date + "T23:59:59"
    else:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        start = today.isoformat()
        end = (today + timedelta(days=1)).isoformat()
    
    sales = await db.pompstation_sales.find({
        **query,
        "created_at": {"$gte": start, "$lte": end}
    }).to_list(10000)
    
    fuel_sales = sum(
        item.get("total", 0) 
        for s in sales 
        for item in s.get("items", []) 
        if item.get("item_type") == "fuel"
    )
    
    fuel_liters = sum(
        item.get("quantity", 0) 
        for s in sales 
        for item in s.get("items", []) 
        if item.get("item_type") == "fuel"
    )
    
    shop_sales = sum(
        item.get("total", 0) 
        for s in sales 
        for item in s.get("items", []) 
        if item.get("item_type") == "shop_item"
    )
    
    cash_total = sum(s.get("total", 0) for s in sales if s.get("payment_method") == "cash")
    card_total = sum(s.get("total", 0) for s in sales if s.get("payment_method") in ["pin", "credit_card"])
    other_total = sum(s.get("total", 0) for s in sales if s.get("payment_method") in ["qr", "ewallet"])
    
    shifts = await db.pompstation_shifts.find({
        **query,
        "created_at": {"$gte": start, "$lte": end}
    }).to_list(100)
    
    return {
        "date": date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "total_fuel_sales": round(fuel_sales, 2),
        "total_fuel_liters": round(fuel_liters, 2),
        "total_shop_sales": round(shop_sales, 2),
        "total_sales": round(fuel_sales + shop_sales, 2),
        "payment_breakdown": {
            "cash": round(cash_total, 2),
            "card": round(card_total, 2),
            "other": round(other_total, 2)
        },
        "shifts_count": len(shifts),
        "transactions_count": len(sales),
        "average_transaction": round((fuel_sales + shop_sales) / len(sales), 2) if sales else 0
    }
