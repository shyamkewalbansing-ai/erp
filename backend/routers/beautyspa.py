"""
Beauty Spa Management Module for Suriname
Complete module with CRM, Appointments, Treatments, Inventory, POS, Staff, Reports, Marketing
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import os

# Import dependencies from main server
import sys
sys.path.append('/app/backend')
from server import db, get_current_user, logger

router = APIRouter(prefix="/beautyspa", tags=["Beauty Spa"])

# ==================== PYDANTIC MODELS ====================

# Client/CRM Models
class ClientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    skin_type: Optional[str] = None  # normaal, droog, vet, gecombineerd, gevoelig
    allergies: Optional[List[str]] = []
    preferences: Optional[str] = None
    notes: Optional[str] = None
    membership_type: Optional[str] = None  # none, bronze, silver, gold, platinum

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    skin_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    preferences: Optional[str] = None
    notes: Optional[str] = None
    membership_type: Optional[str] = None
    loyalty_points: Optional[int] = None

# Treatment Models
class TreatmentCreate(BaseModel):
    name: str
    category: str  # massage, facial, manicure, pedicure, waxing, hair, body, package
    description: Optional[str] = None
    duration_minutes: int = 60
    price_srd: float
    required_staff: int = 1
    products_used: Optional[List[str]] = []
    is_surinamese_special: bool = False  # Kruidentherapie, aloë, etc.
    is_package: bool = False
    package_treatments: Optional[List[str]] = []

class TreatmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price_srd: Optional[float] = None
    required_staff: Optional[int] = None
    products_used: Optional[List[str]] = None
    is_surinamese_special: Optional[bool] = None
    is_active: Optional[bool] = None

# Staff Models
class StaffCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    role: str  # therapist, receptionist, manager, owner
    specializations: Optional[List[str]] = []  # massage, facial, nails, etc.
    commission_percentage: float = 0
    salary_srd: float = 0
    certifications: Optional[List[str]] = []

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    specializations: Optional[List[str]] = None
    commission_percentage: Optional[float] = None
    salary_srd: Optional[float] = None
    certifications: Optional[List[str]] = None
    is_active: Optional[bool] = None

# Appointment Models
class AppointmentCreate(BaseModel):
    client_id: str
    treatment_id: str
    staff_id: str
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    notes: Optional[str] = None
    is_walk_in: bool = False

class AppointmentUpdate(BaseModel):
    treatment_id: Optional[str] = None
    staff_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None  # scheduled, confirmed, in_progress, completed, cancelled, no_show
    notes: Optional[str] = None

# Product/Inventory Models
class ProductCreate(BaseModel):
    name: str
    category: str  # shampoo, oil, scrub, nail_polish, cream, wax, other
    brand: Optional[str] = None
    description: Optional[str] = None
    purchase_price_srd: float = 0
    selling_price_srd: float = 0
    stock_quantity: int = 0
    min_stock_level: int = 5
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None  # YYYY-MM-DD
    supplier: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    purchase_price_srd: Optional[float] = None
    selling_price_srd: Optional[float] = None
    stock_quantity: Optional[int] = None
    min_stock_level: Optional[int] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    supplier: Optional[str] = None

# POS/Sale Models
class SaleItem(BaseModel):
    item_type: str  # treatment, product
    item_id: str
    item_name: str
    quantity: int = 1
    unit_price_srd: float
    discount_percentage: float = 0

class SaleCreate(BaseModel):
    client_id: Optional[str] = None
    appointment_id: Optional[str] = None
    items: List[SaleItem]
    payment_method: str  # cash, pin, qr_telesur, qr_finabank, qr_hakrinbank, split, voucher
    payment_details: Optional[dict] = None  # For split payments
    discount_percentage: float = 0
    voucher_code: Optional[str] = None
    notes: Optional[str] = None

# Schedule Models
class ScheduleCreate(BaseModel):
    staff_id: str
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    is_available: bool = True

# Voucher Models
class VoucherCreate(BaseModel):
    code: str
    discount_type: str  # percentage, fixed
    discount_value: float
    valid_from: str
    valid_until: str
    max_uses: int = 1
    applicable_treatments: Optional[List[str]] = []  # Empty = all

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """Get Beauty Spa dashboard statistics"""
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get counts
    total_clients = await db.spa_clients.count_documents({"user_id": user_id})
    total_treatments = await db.spa_treatments.count_documents({"user_id": user_id, "is_active": True})
    total_staff = await db.spa_staff.count_documents({"user_id": user_id, "is_active": True})
    total_products = await db.spa_products.count_documents({"user_id": user_id})
    
    # Today's appointments
    todays_appointments = await db.spa_appointments.count_documents({
        "user_id": user_id,
        "appointment_date": today,
        "status": {"$in": ["scheduled", "confirmed", "in_progress"]}
    })
    
    # Today's revenue
    today_sales = await db.spa_sales.find({
        "user_id": user_id,
        "created_at": {"$regex": f"^{today}"}
    }).to_list(1000)
    today_revenue = sum(s.get("total_amount", 0) for s in today_sales)
    
    # This month's revenue
    month_start = datetime.now(timezone.utc).strftime("%Y-%m-01")
    month_sales = await db.spa_sales.find({
        "user_id": user_id,
        "created_at": {"$gte": month_start}
    }).to_list(5000)
    month_revenue = sum(s.get("total_amount", 0) for s in month_sales)
    
    # Low stock products
    low_stock = await db.spa_products.count_documents({
        "user_id": user_id,
        "$expr": {"$lte": ["$stock_quantity", "$min_stock_level"]}
    })
    
    # Pending appointments (upcoming)
    pending_appointments = await db.spa_appointments.find({
        "user_id": user_id,
        "appointment_date": {"$gte": today},
        "status": {"$in": ["scheduled", "confirmed"]}
    }, {"_id": 0}).sort("appointment_date", 1).limit(5).to_list(5)
    
    # Enrich pending appointments with client and treatment names
    for apt in pending_appointments:
        client = await db.spa_clients.find_one({"id": apt.get("client_id")}, {"_id": 0, "name": 1})
        treatment = await db.spa_treatments.find_one({"id": apt.get("treatment_id")}, {"_id": 0, "name": 1})
        apt["client_name"] = client.get("name") if client else "Onbekend"
        apt["treatment_name"] = treatment.get("name") if treatment else "Onbekend"
    
    return {
        "total_clients": total_clients,
        "total_treatments": total_treatments,
        "total_staff": total_staff,
        "total_products": total_products,
        "todays_appointments": todays_appointments,
        "today_revenue": today_revenue,
        "month_revenue": month_revenue,
        "low_stock_count": low_stock,
        "upcoming_appointments": pending_appointments
    }

# ==================== CLIENT/CRM ROUTES ====================

@router.get("/clients")
async def list_clients(
    search: Optional[str] = None,
    membership: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all clients with optional filters"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if membership:
        query["membership_type"] = membership
    
    clients = await db.spa_clients.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return clients

@router.post("/clients")
async def create_client(client: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a new client"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    client_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **client.dict(),
        "loyalty_points": 0,
        "total_visits": 0,
        "total_spent": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.spa_clients.insert_one(client_doc)
    del client_doc["_id"] if "_id" in client_doc else None
    return client_doc

@router.get("/clients/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get client details with history"""
    user_id = current_user["id"]
    
    client = await db.spa_clients.find_one({"id": client_id, "user_id": user_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    # Get appointment history
    appointments = await db.spa_appointments.find({
        "client_id": client_id,
        "user_id": user_id
    }, {"_id": 0}).sort("appointment_date", -1).limit(20).to_list(20)
    
    # Enrich appointments
    for apt in appointments:
        treatment = await db.spa_treatments.find_one({"id": apt.get("treatment_id")}, {"_id": 0, "name": 1})
        apt["treatment_name"] = treatment.get("name") if treatment else "Onbekend"
    
    # Get purchase history
    purchases = await db.spa_sales.find({
        "client_id": client_id,
        "user_id": user_id
    }, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    client["appointment_history"] = appointments
    client["purchase_history"] = purchases
    
    return client

@router.put("/clients/{client_id}")
async def update_client(client_id: str, update: ClientUpdate, current_user: dict = Depends(get_current_user)):
    """Update client details"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.spa_clients.update_one(
        {"id": client_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"success": True, "message": "Klant bijgewerkt"}

@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a client"""
    user_id = current_user["id"]
    
    result = await db.spa_clients.delete_one({"id": client_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"success": True, "message": "Klant verwijderd"}

# ==================== TREATMENT ROUTES ====================

@router.get("/treatments")
async def list_treatments(
    category: Optional[str] = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """List all treatments"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if category:
        query["category"] = category
    if active_only:
        query["is_active"] = True
    
    treatments = await db.spa_treatments.find(query, {"_id": 0}).sort("category", 1).to_list(200)
    return treatments

@router.post("/treatments")
async def create_treatment(treatment: TreatmentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new treatment"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    treatment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **treatment.dict(),
        "is_active": True,
        "times_booked": 0,
        "created_at": now.isoformat()
    }
    
    await db.spa_treatments.insert_one(treatment_doc)
    return {"id": treatment_doc["id"], "message": "Behandeling aangemaakt"}

@router.put("/treatments/{treatment_id}")
async def update_treatment(treatment_id: str, update: TreatmentUpdate, current_user: dict = Depends(get_current_user)):
    """Update treatment"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    result = await db.spa_treatments.update_one(
        {"id": treatment_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Behandeling niet gevonden")
    
    return {"success": True, "message": "Behandeling bijgewerkt"}

@router.delete("/treatments/{treatment_id}")
async def delete_treatment(treatment_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete treatment"""
    user_id = current_user["id"]
    
    result = await db.spa_treatments.update_one(
        {"id": treatment_id, "user_id": user_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Behandeling niet gevonden")
    
    return {"success": True, "message": "Behandeling gedeactiveerd"}

# ==================== STAFF ROUTES ====================

@router.get("/staff")
async def list_staff(
    role: Optional[str] = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """List all staff members"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if role:
        query["role"] = role
    if active_only:
        query["is_active"] = True
    
    staff = await db.spa_staff.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return staff

@router.post("/staff")
async def create_staff(staff: StaffCreate, current_user: dict = Depends(get_current_user)):
    """Create a new staff member"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    staff_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **staff.dict(),
        "is_active": True,
        "total_treatments": 0,
        "total_commission": 0,
        "created_at": now.isoformat()
    }
    
    await db.spa_staff.insert_one(staff_doc)
    return {"id": staff_doc["id"], "message": "Medewerker aangemaakt"}

@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, update: StaffUpdate, current_user: dict = Depends(get_current_user)):
    """Update staff member"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    result = await db.spa_staff.update_one(
        {"id": staff_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medewerker niet gevonden")
    
    return {"success": True, "message": "Medewerker bijgewerkt"}

@router.get("/staff/{staff_id}/schedule")
async def get_staff_schedule(staff_id: str, current_user: dict = Depends(get_current_user)):
    """Get staff member's schedule"""
    user_id = current_user["id"]
    
    schedule = await db.spa_schedules.find({
        "staff_id": staff_id,
        "user_id": user_id
    }, {"_id": 0}).sort("day_of_week", 1).to_list(7)
    
    return schedule

@router.post("/staff/{staff_id}/schedule")
async def set_staff_schedule(staff_id: str, schedules: List[ScheduleCreate], current_user: dict = Depends(get_current_user)):
    """Set staff member's weekly schedule"""
    user_id = current_user["id"]
    
    # Remove existing schedule
    await db.spa_schedules.delete_many({"staff_id": staff_id, "user_id": user_id})
    
    # Add new schedule
    for schedule in schedules:
        schedule_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **schedule.dict()
        }
        await db.spa_schedules.insert_one(schedule_doc)
    
    return {"success": True, "message": "Rooster bijgewerkt"}

# ==================== APPOINTMENT ROUTES ====================

@router.get("/appointments")
async def list_appointments(
    date: Optional[str] = None,
    staff_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List appointments with filters"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if date:
        query["appointment_date"] = date
    if staff_id:
        query["staff_id"] = staff_id
    if status:
        query["status"] = status
    
    appointments = await db.spa_appointments.find(query, {"_id": 0}).sort([
        ("appointment_date", 1),
        ("appointment_time", 1)
    ]).to_list(500)
    
    # Enrich with names
    for apt in appointments:
        client = await db.spa_clients.find_one({"id": apt.get("client_id")}, {"_id": 0, "name": 1, "phone": 1})
        treatment = await db.spa_treatments.find_one({"id": apt.get("treatment_id")}, {"_id": 0, "name": 1, "duration_minutes": 1, "price_srd": 1})
        staff = await db.spa_staff.find_one({"id": apt.get("staff_id")}, {"_id": 0, "name": 1})
        
        apt["client_name"] = client.get("name") if client else "Onbekend"
        apt["client_phone"] = client.get("phone") if client else ""
        apt["treatment_name"] = treatment.get("name") if treatment else "Onbekend"
        apt["treatment_duration"] = treatment.get("duration_minutes", 60) if treatment else 60
        apt["treatment_price"] = treatment.get("price_srd", 0) if treatment else 0
        apt["staff_name"] = staff.get("name") if staff else "Onbekend"
    
    return appointments

@router.post("/appointments")
async def create_appointment(appointment: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new appointment"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    # Get treatment duration for end time calculation
    treatment = await db.spa_treatments.find_one({"id": appointment.treatment_id}, {"_id": 0})
    duration = treatment.get("duration_minutes", 60) if treatment else 60
    
    # Calculate end time
    start_parts = appointment.appointment_time.split(":")
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    end_minutes = start_minutes + duration
    end_time = f"{end_minutes // 60:02d}:{end_minutes % 60:02d}"
    
    appointment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **appointment.dict(),
        "end_time": end_time,
        "status": "scheduled",
        "reminder_sent": False,
        "created_at": now.isoformat()
    }
    
    await db.spa_appointments.insert_one(appointment_doc)
    
    # Increment treatment booking count
    await db.spa_treatments.update_one(
        {"id": appointment.treatment_id},
        {"$inc": {"times_booked": 1}}
    )
    
    return {"id": appointment_doc["id"], "message": "Afspraak aangemaakt"}

@router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, update: AppointmentUpdate, current_user: dict = Depends(get_current_user)):
    """Update appointment"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.spa_appointments.update_one(
        {"id": appointment_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Afspraak niet gevonden")
    
    return {"success": True, "message": "Afspraak bijgewerkt"}

@router.post("/appointments/{appointment_id}/complete")
async def complete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Mark appointment as completed"""
    user_id = current_user["id"]
    
    appointment = await db.spa_appointments.find_one({"id": appointment_id, "user_id": user_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Afspraak niet gevonden")
    
    await db.spa_appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update client visit count
    await db.spa_clients.update_one(
        {"id": appointment.get("client_id")},
        {"$inc": {"total_visits": 1}}
    )
    
    # Update staff treatment count
    await db.spa_staff.update_one(
        {"id": appointment.get("staff_id")},
        {"$inc": {"total_treatments": 1}}
    )
    
    return {"success": True, "message": "Afspraak afgerond"}

@router.post("/appointments/{appointment_id}/no-show")
async def mark_no_show(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Mark appointment as no-show"""
    user_id = current_user["id"]
    
    result = await db.spa_appointments.update_one(
        {"id": appointment_id, "user_id": user_id},
        {"$set": {"status": "no_show"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Afspraak niet gevonden")
    
    return {"success": True, "message": "Gemarkeerd als no-show"}

# ==================== PRODUCT/INVENTORY ROUTES ====================

@router.get("/products")
async def list_products(
    category: Optional[str] = None,
    low_stock: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """List all products"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if category:
        query["category"] = category
    if low_stock:
        query["$expr"] = {"$lte": ["$stock_quantity", "$min_stock_level"]}
    
    products = await db.spa_products.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return products

@router.post("/products")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    """Create a new product"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    product_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **product.dict(),
        "created_at": now.isoformat()
    }
    
    await db.spa_products.insert_one(product_doc)
    return {"id": product_doc["id"], "message": "Product aangemaakt"}

@router.put("/products/{product_id}")
async def update_product(product_id: str, update: ProductUpdate, current_user: dict = Depends(get_current_user)):
    """Update product"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    result = await db.spa_products.update_one(
        {"id": product_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return {"success": True, "message": "Product bijgewerkt"}

@router.post("/products/{product_id}/adjust-stock")
async def adjust_stock(
    product_id: str,
    quantity: int = Query(..., description="Positive to add, negative to subtract"),
    reason: str = Query("Handmatige aanpassing"),
    current_user: dict = Depends(get_current_user)
):
    """Adjust product stock"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    product = await db.spa_products.find_one({"id": product_id, "user_id": user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    new_quantity = product.get("stock_quantity", 0) + quantity
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Voorraad kan niet negatief zijn")
    
    await db.spa_products.update_one(
        {"id": product_id},
        {"$set": {"stock_quantity": new_quantity}}
    )
    
    # Log stock movement
    await db.spa_stock_movements.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "product_id": product_id,
        "product_name": product.get("name"),
        "quantity_change": quantity,
        "new_quantity": new_quantity,
        "reason": reason,
        "created_at": now.isoformat()
    })
    
    return {"success": True, "new_quantity": new_quantity}

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a product"""
    user_id = current_user["id"]
    
    result = await db.spa_products.delete_one({"id": product_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product niet gevonden")
    
    return {"success": True, "message": "Product verwijderd"}

# ==================== POS/SALES ROUTES ====================

@router.get("/sales")
async def list_sales(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    payment_method: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List sales with filters"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to + "T23:59:59"
        else:
            query["created_at"] = {"$lte": date_to + "T23:59:59"}
    if payment_method:
        query["payment_method"] = payment_method
    
    sales = await db.spa_sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with client names
    for sale in sales:
        if sale.get("client_id"):
            client = await db.spa_clients.find_one({"id": sale["client_id"]}, {"_id": 0, "name": 1})
            sale["client_name"] = client.get("name") if client else "Onbekend"
        else:
            sale["client_name"] = "Walk-in"
    
    return sales

@router.post("/sales")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new sale (POS transaction)"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    # Calculate totals
    subtotal = sum(item.unit_price_srd * item.quantity * (1 - item.discount_percentage / 100) for item in sale.items)
    discount_amount = subtotal * (sale.discount_percentage / 100)
    total = subtotal - discount_amount
    
    # Apply voucher if provided
    voucher_discount = 0
    if sale.voucher_code:
        voucher = await db.spa_vouchers.find_one({
            "user_id": user_id,
            "code": sale.voucher_code,
            "valid_from": {"$lte": now.strftime("%Y-%m-%d")},
            "valid_until": {"$gte": now.strftime("%Y-%m-%d")},
            "uses_count": {"$lt": "$max_uses"}
        }, {"_id": 0})
        
        if voucher:
            if voucher["discount_type"] == "percentage":
                voucher_discount = total * (voucher["discount_value"] / 100)
            else:
                voucher_discount = voucher["discount_value"]
            total -= voucher_discount
            
            # Increment voucher uses
            await db.spa_vouchers.update_one(
                {"code": sale.voucher_code},
                {"$inc": {"uses_count": 1}}
            )
    
    sale_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "sale_number": f"SPA-{now.strftime('%Y%m%d%H%M%S')}",
        "client_id": sale.client_id,
        "appointment_id": sale.appointment_id,
        "items": [item.dict() for item in sale.items],
        "subtotal": subtotal,
        "discount_percentage": sale.discount_percentage,
        "discount_amount": discount_amount,
        "voucher_code": sale.voucher_code,
        "voucher_discount": voucher_discount,
        "total_amount": total,
        "payment_method": sale.payment_method,
        "payment_details": sale.payment_details,
        "notes": sale.notes,
        "created_at": now.isoformat()
    }
    
    await db.spa_sales.insert_one(sale_doc)
    
    # Update product stock for sold products
    for item in sale.items:
        if item.item_type == "product":
            await db.spa_products.update_one(
                {"id": item.item_id},
                {"$inc": {"stock_quantity": -item.quantity}}
            )
    
    # Update client stats
    if sale.client_id:
        await db.spa_clients.update_one(
            {"id": sale.client_id},
            {
                "$inc": {
                    "total_spent": total,
                    "loyalty_points": int(total / 100)  # 1 point per 100 SRD
                }
            }
        )
    
    # Calculate and update staff commission
    if sale.appointment_id:
        appointment = await db.spa_appointments.find_one({"id": sale.appointment_id}, {"_id": 0})
        if appointment:
            staff = await db.spa_staff.find_one({"id": appointment.get("staff_id")}, {"_id": 0})
            if staff and staff.get("commission_percentage", 0) > 0:
                commission = total * (staff["commission_percentage"] / 100)
                await db.spa_staff.update_one(
                    {"id": staff["id"]},
                    {"$inc": {"total_commission": commission}}
                )
    
    return {
        "id": sale_doc["id"],
        "sale_number": sale_doc["sale_number"],
        "total_amount": total,
        "message": "Verkoop geregistreerd"
    }

@router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Get sale details"""
    user_id = current_user["id"]
    
    sale = await db.spa_sales.find_one({"id": sale_id, "user_id": user_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Verkoop niet gevonden")
    
    if sale.get("client_id"):
        client = await db.spa_clients.find_one({"id": sale["client_id"]}, {"_id": 0, "name": 1, "phone": 1})
        sale["client_name"] = client.get("name") if client else "Onbekend"
        sale["client_phone"] = client.get("phone") if client else ""
    
    return sale

# ==================== VOUCHER ROUTES ====================

@router.get("/vouchers")
async def list_vouchers(current_user: dict = Depends(get_current_user)):
    """List all vouchers"""
    user_id = current_user["id"]
    vouchers = await db.spa_vouchers.find({"user_id": user_id}, {"_id": 0}).sort("valid_until", -1).to_list(100)
    return vouchers

@router.post("/vouchers")
async def create_voucher(voucher: VoucherCreate, current_user: dict = Depends(get_current_user)):
    """Create a new voucher"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    # Check if code already exists
    existing = await db.spa_vouchers.find_one({"user_id": user_id, "code": voucher.code})
    if existing:
        raise HTTPException(status_code=400, detail="Voucher code bestaat al")
    
    voucher_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **voucher.dict(),
        "uses_count": 0,
        "created_at": now.isoformat()
    }
    
    await db.spa_vouchers.insert_one(voucher_doc)
    return {"id": voucher_doc["id"], "message": "Voucher aangemaakt"}

@router.delete("/vouchers/{voucher_id}")
async def delete_voucher(voucher_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a voucher"""
    user_id = current_user["id"]
    
    result = await db.spa_vouchers.delete_one({"id": voucher_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voucher niet gevonden")
    
    return {"success": True, "message": "Voucher verwijderd"}

# ==================== REPORTS ROUTES ====================

@router.get("/reports/revenue")
async def revenue_report(
    period: str = Query("month", description="day, week, month, year"),
    current_user: dict = Depends(get_current_user)
):
    """Get revenue report"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    # Calculate date range
    if period == "day":
        start_date = now.strftime("%Y-%m-%d")
    elif period == "week":
        start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    elif period == "month":
        start_date = now.strftime("%Y-%m-01")
    else:  # year
        start_date = now.strftime("%Y-01-01")
    
    sales = await db.spa_sales.find({
        "user_id": user_id,
        "created_at": {"$gte": start_date}
    }, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(s.get("total_amount", 0) for s in sales)
    total_transactions = len(sales)
    
    # Revenue by payment method
    by_payment = {}
    for sale in sales:
        method = sale.get("payment_method", "other")
        by_payment[method] = by_payment.get(method, 0) + sale.get("total_amount", 0)
    
    # Revenue by day
    by_day = {}
    for sale in sales:
        day = sale.get("created_at", "")[:10]
        by_day[day] = by_day.get(day, 0) + sale.get("total_amount", 0)
    
    return {
        "period": period,
        "start_date": start_date,
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "average_transaction": total_revenue / total_transactions if total_transactions > 0 else 0,
        "by_payment_method": by_payment,
        "by_day": by_day
    }

@router.get("/reports/treatments")
async def treatments_report(current_user: dict = Depends(get_current_user)):
    """Get popular treatments report"""
    user_id = current_user["id"]
    
    treatments = await db.spa_treatments.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).sort("times_booked", -1).to_list(20)
    
    return treatments

@router.get("/reports/products")
async def products_report(current_user: dict = Depends(get_current_user)):
    """Get product sales report"""
    user_id = current_user["id"]
    
    # Get all sales with products
    sales = await db.spa_sales.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    
    product_sales = {}
    for sale in sales:
        for item in sale.get("items", []):
            if item.get("item_type") == "product":
                pid = item.get("item_id")
                if pid not in product_sales:
                    product_sales[pid] = {
                        "name": item.get("item_name"),
                        "quantity_sold": 0,
                        "revenue": 0
                    }
                product_sales[pid]["quantity_sold"] += item.get("quantity", 0)
                product_sales[pid]["revenue"] += item.get("unit_price_srd", 0) * item.get("quantity", 0)
    
    # Sort by revenue
    sorted_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)
    
    return sorted_products[:20]

@router.get("/reports/staff")
async def staff_report(current_user: dict = Depends(get_current_user)):
    """Get staff performance report"""
    user_id = current_user["id"]
    
    staff = await db.spa_staff.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).sort("total_treatments", -1).to_list(50)
    
    return staff

@router.get("/reports/clients")
async def clients_report(current_user: dict = Depends(get_current_user)):
    """Get top clients report"""
    user_id = current_user["id"]
    
    clients = await db.spa_clients.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("total_spent", -1).limit(20).to_list(20)
    
    return clients

# ==================== WALK-IN QUEUE ====================

@router.get("/queue")
async def get_queue(current_user: dict = Depends(get_current_user)):
    """Get current walk-in queue"""
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    queue = await db.spa_queue.find({
        "user_id": user_id,
        "date": today,
        "status": {"$in": ["waiting", "in_service"]}
    }, {"_id": 0}).sort("queue_number", 1).to_list(50)
    
    return queue

@router.post("/queue")
async def add_to_queue(
    client_name: str,
    treatment_id: str,
    phone: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Add walk-in to queue"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    # Get next queue number
    last_in_queue = await db.spa_queue.find_one(
        {"user_id": user_id, "date": today},
        sort=[("queue_number", -1)]
    )
    next_number = (last_in_queue.get("queue_number", 0) if last_in_queue else 0) + 1
    
    treatment = await db.spa_treatments.find_one({"id": treatment_id}, {"_id": 0, "name": 1})
    
    queue_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": today,
        "queue_number": next_number,
        "client_name": client_name,
        "phone": phone,
        "treatment_id": treatment_id,
        "treatment_name": treatment.get("name") if treatment else "Onbekend",
        "status": "waiting",
        "added_at": now.isoformat()
    }
    
    await db.spa_queue.insert_one(queue_doc)
    return {"queue_number": next_number, "message": f"Toegevoegd aan wachtrij: #{next_number}"}

@router.post("/queue/{queue_id}/start")
async def start_service(queue_id: str, staff_id: str, current_user: dict = Depends(get_current_user)):
    """Start serving a queue item"""
    user_id = current_user["id"]
    
    result = await db.spa_queue.update_one(
        {"id": queue_id, "user_id": user_id},
        {"$set": {
            "status": "in_service",
            "staff_id": staff_id,
            "started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Niet gevonden in wachtrij")
    
    return {"success": True, "message": "Service gestart"}

@router.post("/queue/{queue_id}/complete")
async def complete_queue_service(queue_id: str, current_user: dict = Depends(get_current_user)):
    """Complete queue service"""
    user_id = current_user["id"]
    
    result = await db.spa_queue.update_one(
        {"id": queue_id, "user_id": user_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Niet gevonden in wachtrij")
    
    return {"success": True, "message": "Service afgerond"}

# ==================== POWER OUTAGE MANAGEMENT ====================

@router.post("/outage/notify")
async def notify_outage(
    message: str = Query("Wegens stroomuitval zijn wij tijdelijk gesloten. Wij nemen zo spoedig mogelijk contact met u op."),
    current_user: dict = Depends(get_current_user)
):
    """Notify all clients with appointments today about outage"""
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get today's appointments
    appointments = await db.spa_appointments.find({
        "user_id": user_id,
        "appointment_date": today,
        "status": {"$in": ["scheduled", "confirmed"]}
    }, {"_id": 0}).to_list(100)
    
    notified = []
    for apt in appointments:
        client = await db.spa_clients.find_one({"id": apt.get("client_id")}, {"_id": 0, "name": 1, "phone": 1})
        if client:
            notified.append({
                "name": client.get("name"),
                "phone": client.get("phone"),
                "time": apt.get("appointment_time")
            })
    
    # Mark appointments as affected
    await db.spa_appointments.update_many(
        {"user_id": user_id, "appointment_date": today, "status": {"$in": ["scheduled", "confirmed"]}},
        {"$set": {"status": "rescheduled", "outage_affected": True}}
    )
    
    return {
        "message": "Stroomuitval melding verwerkt",
        "affected_appointments": len(notified),
        "clients_to_notify": notified,
        "notification_message": message
    }

# ==================== MULTI-BRANCH ====================

@router.get("/branches")
async def list_branches(current_user: dict = Depends(get_current_user)):
    """List all branches (for multi-location businesses)"""
    user_id = current_user["id"]
    branches = await db.spa_branches.find({"user_id": user_id}, {"_id": 0}).to_list(20)
    return branches

@router.post("/branches")
async def create_branch(
    name: str,
    address: str,
    phone: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Create a new branch"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    branch_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "address": address,
        "phone": phone,
        "is_active": True,
        "created_at": now.isoformat()
    }
    
    await db.spa_branches.insert_one(branch_doc)
    return {"id": branch_doc["id"], "message": "Vestiging aangemaakt"}

# ==================== INTAKE FORMS ====================

@router.get("/intake-forms")
async def list_intake_forms(current_user: dict = Depends(get_current_user)):
    """List all intake form submissions"""
    user_id = current_user["id"]
    forms = await db.spa_intake_forms.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return forms

@router.post("/intake-forms")
async def submit_intake_form(
    client_id: str,
    medical_conditions: Optional[List[str]] = [],
    medications: Optional[str] = None,
    allergies: Optional[List[str]] = [],
    pregnancy: bool = False,
    skin_conditions: Optional[str] = None,
    previous_treatments: Optional[str] = None,
    consent_given: bool = False,
    signature: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Submit intake form for a client"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    if not consent_given:
        raise HTTPException(status_code=400, detail="Toestemming is vereist")
    
    form_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "client_id": client_id,
        "medical_conditions": medical_conditions,
        "medications": medications,
        "allergies": allergies,
        "pregnancy": pregnancy,
        "skin_conditions": skin_conditions,
        "previous_treatments": previous_treatments,
        "consent_given": consent_given,
        "signature": signature,
        "created_at": now.isoformat()
    }
    
    await db.spa_intake_forms.insert_one(form_doc)
    
    # Update client allergies
    if allergies:
        await db.spa_clients.update_one(
            {"id": client_id},
            {"$set": {"allergies": allergies}}
        )
    
    return {"id": form_doc["id"], "message": "Intakeformulier opgeslagen"}
