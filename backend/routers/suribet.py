"""
Suribet Retailer Management Module - Backend Routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import base64
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/suribet", tags=["Suribet"])

# ============================================
# MODELS
# ============================================

# Machine Models
class MachineCreate(BaseModel):
    machine_id: str
    location: str
    machine_type: str
    status: str = "active"  # active, inactive, maintenance
    notes: Optional[str] = None

class MachineUpdate(BaseModel):
    location: Optional[str] = None
    machine_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# Dagstaat (Daily Statement) Models
class BiljettenSRD(BaseModel):
    b5: int = 0
    b10: int = 0
    b20: int = 0
    b50: int = 0
    b100: int = 0
    b200: int = 0
    b500: int = 0

class BiljettenEUR(BaseModel):
    b5: int = 0
    b10: int = 0
    b20: int = 0
    b50: int = 0
    b100: int = 0
    b200: int = 0

class BiljettenUSD(BaseModel):
    b1: int = 0
    b5: int = 0
    b10: int = 0
    b20: int = 0
    b50: int = 0
    b100: int = 0

# Product data from bon
class POSSalesProduct(BaseModel):
    product: str  # SB, SF, VSF, Topup, PT, S2W, VSB
    total_bets: float = 0
    comm_percentage: float = 0
    commission: float = 0

class POSPayoutProduct(BaseModel):
    product: str  # PT, S2W, SF, VSB, WDR, WDRNC
    total_paid: float = 0
    comm_percentage: float = 0
    commission: float = 0

class PlayableTicketProduct(BaseModel):
    product: str  # SB, VSF, S2W, YGT, AMT
    total_bets: float = 0
    comm_percentage: float = 0
    commission: float = 0

class BonData(BaseModel):
    # POS Sales
    pos_sales: Optional[List[POSSalesProduct]] = []
    pos_sales_total: float = 0
    pos_sales_commission: float = 0
    # POS Payout
    pos_payout: Optional[List[POSPayoutProduct]] = []
    pos_payout_total: float = 0
    pos_payout_commission: float = 0
    # Playable Ticket
    playable_ticket: Optional[List[PlayableTicketProduct]] = []
    playable_ticket_total: float = 0
    playable_ticket_commission: float = 0
    # Totals from bon
    total_sales: float = 0
    kiosk_cash_in: float = 0
    kiosk_commission: float = 0
    total_pc_sales: float = 0
    total_payout: float = 0
    total_pt_pos_cancel_bets: float = 0
    total_pos_commission: float = 0
    balance: float = 0

class DagstaatCreate(BaseModel):
    machine_id: str
    date: str  # YYYY-MM-DD
    employee_id: Optional[str] = None
    beginsaldo_srd: float = 0
    beginsaldo_eur: float = 0
    beginsaldo_usd: float = 0
    eindsaldo_srd: float = 0
    eindsaldo_eur: float = 0
    eindsaldo_usd: float = 0
    biljetten_srd: Optional[BiljettenSRD] = None
    biljetten_eur: Optional[BiljettenEUR] = None
    biljetten_usd: Optional[BiljettenUSD] = None
    bon_data: Optional[BonData] = None  # New: parsed bon data
    omzet: float = 0
    suribet_percentage: float = 80  # Default 80%
    notes: Optional[str] = None

class DagstaatUpdate(BaseModel):
    employee_id: Optional[str] = None
    beginsaldo_srd: Optional[float] = None
    beginsaldo_eur: Optional[float] = None
    beginsaldo_usd: Optional[float] = None
    eindsaldo_srd: Optional[float] = None
    eindsaldo_eur: Optional[float] = None
    eindsaldo_usd: Optional[float] = None
    biljetten_srd: Optional[BiljettenSRD] = None
    biljetten_eur: Optional[BiljettenEUR] = None
    biljetten_usd: Optional[BiljettenUSD] = None
    bon_data: Optional[BonData] = None
    omzet: Optional[float] = None
    suribet_percentage: Optional[float] = None
    notes: Optional[str] = None

# Werknemer Models
class WerknemerCreate(BaseModel):
    name: str
    function: str
    hourly_rate: float = 0
    daily_rate: float = 0
    status: str = "active"  # active, inactive
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    # Portal credentials
    username: Optional[str] = None
    password: Optional[str] = None

class WerknemerUpdate(BaseModel):
    name: Optional[str] = None
    function: Optional[str] = None
    hourly_rate: Optional[float] = None
    daily_rate: Optional[float] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

# Werknemer Portal Login
class WerknemerLogin(BaseModel):
    username: str
    password: str
    user_id: str  # The owner's user_id for context

# Shift Models
class ShiftCreate(BaseModel):
    employee_id: str
    machine_id: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: Optional[str] = None  # HH:MM
    cash_difference: float = 0
    notes: Optional[str] = None

class ShiftUpdate(BaseModel):
    end_time: Optional[str] = None
    cash_difference: Optional[float] = None
    notes: Optional[str] = None

# Kasboek Models
class KasboekCreate(BaseModel):
    date: str  # YYYY-MM-DD
    transaction_type: str  # income, expense
    category: str  # commissie, loon, onderhoud, aankoop, overig
    amount: float
    currency: str = "SRD"  # SRD, EUR, USD
    description: str
    machine_id: Optional[str] = None
    employee_id: Optional[str] = None

class KasboekUpdate(BaseModel):
    transaction_type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None

# Loonbetaling Models
class LoonbetalingCreate(BaseModel):
    employee_id: str
    date: str  # YYYY-MM-DD
    period_start: str  # YYYY-MM-DD
    period_end: str  # YYYY-MM-DD
    hours_worked: float = 0
    days_worked: float = 0
    base_amount: float
    bonus: float = 0
    deductions: float = 0
    advance_payment: float = 0
    notes: Optional[str] = None

class LoonbetalingUpdate(BaseModel):
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    advance_payment: Optional[float] = None
    notes: Optional[str] = None

# Wisselkoers Models
class WisselkoersUpdate(BaseModel):
    eur_to_srd: float
    usd_to_srd: float


# ============================================
# DEPENDENCY - Get current user
# ============================================
from .deps import get_current_user, db

# ============================================
# WISSELKOERSEN ENDPOINTS
# ============================================

@router.get("/wisselkoersen")
async def get_wisselkoersen(current_user: dict = Depends(get_current_user)):
    """Get exchange rates for the user"""
    user_id = current_user["id"]
    
    rates = await db.suribet_wisselkoersen.find_one({"user_id": user_id}, {"_id": 0})
    if not rates:
        # Return default rates
        return {
            "user_id": user_id,
            "eur_to_srd": 38.50,
            "usd_to_srd": 35.50,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    return rates

@router.put("/wisselkoersen")
async def update_wisselkoersen(
    data: WisselkoersUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update exchange rates"""
    user_id = current_user["id"]
    
    update_data = {
        "user_id": user_id,
        "eur_to_srd": data.eur_to_srd,
        "usd_to_srd": data.usd_to_srd,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_wisselkoersen.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return update_data

# ============================================
# MACHINES ENDPOINTS
# ============================================

@router.get("/machines")
async def get_machines(current_user: dict = Depends(get_current_user)):
    """Get all machines for the user"""
    user_id = current_user["id"]
    machines = await db.suribet_machines.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return machines

@router.post("/machines")
async def create_machine(
    data: MachineCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new machine"""
    user_id = current_user["id"]
    
    # Check if machine_id already exists
    existing = await db.suribet_machines.find_one({
        "user_id": user_id,
        "machine_id": data.machine_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Machine ID bestaat al")
    
    machine = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "machine_id": data.machine_id,
        "location": data.location,
        "machine_type": data.machine_type,
        "status": data.status,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_machines.insert_one(machine)
    if "_id" in machine:
        del machine["_id"]
    return machine

@router.put("/machines/{machine_id}")
async def update_machine(
    machine_id: str,
    data: MachineUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a machine"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.suribet_machines.update_one(
        {"id": machine_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    
    return {"message": "Machine bijgewerkt"}

@router.delete("/machines/{machine_id}")
async def delete_machine(
    machine_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a machine"""
    user_id = current_user["id"]
    
    result = await db.suribet_machines.delete_one({
        "id": machine_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    
    return {"message": "Machine verwijderd"}

# ============================================
# DAGSTAAT ENDPOINTS
# ============================================

@router.get("/dagstaten")
async def get_dagstaten(
    date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    machine_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get daily statements"""
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    
    if machine_id:
        query["machine_id"] = machine_id
    
    # Specifieke datum heeft prioriteit
    if date:
        query["date"] = date
    elif month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    elif year:
        query["date"] = {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}
    
    dagstaten = await db.suribet_dagstaten.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return dagstaten

@router.post("/dagstaten")
async def create_dagstaat(
    data: DagstaatCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a daily statement"""
    user_id = current_user["id"]
    
    # Get exchange rates
    rates = await db.suribet_wisselkoersen.find_one({"user_id": user_id})
    eur_rate = rates["eur_to_srd"] if rates else 38.50
    usd_rate = rates["usd_to_srd"] if rates else 35.50
    
    # Calculate totals from biljetten
    biljetten_srd = data.biljetten_srd or BiljettenSRD()
    biljetten_eur = data.biljetten_eur or BiljettenEUR()
    biljetten_usd = data.biljetten_usd or BiljettenUSD()
    
    total_srd = (
        biljetten_srd.b5 * 5 + biljetten_srd.b10 * 10 + biljetten_srd.b20 * 20 +
        biljetten_srd.b50 * 50 + biljetten_srd.b100 * 100 + biljetten_srd.b200 * 200 +
        biljetten_srd.b500 * 500
    )
    
    total_eur = (
        biljetten_eur.b5 * 5 + biljetten_eur.b10 * 10 + biljetten_eur.b20 * 20 +
        biljetten_eur.b50 * 50 + biljetten_eur.b100 * 100 + biljetten_eur.b200 * 200
    )
    
    total_usd = (
        biljetten_usd.b1 * 1 + biljetten_usd.b5 * 5 + biljetten_usd.b10 * 10 +
        biljetten_usd.b20 * 20 + biljetten_usd.b50 * 50 + biljetten_usd.b100 * 100
    )
    
    # Convert to SRD
    total_in_srd = total_srd + (total_eur * eur_rate) + (total_usd * usd_rate)
    
    # Calculate Suribet deel and commission
    suribet_deel = data.omzet * (data.suribet_percentage / 100)
    commissie = data.omzet * ((100 - data.suribet_percentage) / 100)
    
    # Determine profit/loss
    status = "winst" if commissie > 0 else "verlies"
    
    dagstaat = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "machine_id": data.machine_id,
        "date": data.date,
        "employee_id": data.employee_id,
        "beginsaldo_srd": data.beginsaldo_srd,
        "beginsaldo_eur": data.beginsaldo_eur,
        "beginsaldo_usd": data.beginsaldo_usd,
        "eindsaldo_srd": data.eindsaldo_srd,
        "eindsaldo_eur": data.eindsaldo_eur,
        "eindsaldo_usd": data.eindsaldo_usd,
        "biljetten_srd": biljetten_srd.dict(),
        "biljetten_eur": biljetten_eur.dict(),
        "biljetten_usd": biljetten_usd.dict(),
        "total_counted_srd": total_srd,
        "total_counted_eur": total_eur,
        "total_counted_usd": total_usd,
        "total_in_srd": total_in_srd,
        "omzet": data.omzet,
        "suribet_percentage": data.suribet_percentage,
        "suribet_deel": suribet_deel,
        "commissie": commissie,
        "status": status,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_dagstaten.insert_one(dagstaat)
    if "_id" in dagstaat:
        del dagstaat["_id"]
    return dagstaat

@router.put("/dagstaten/{dagstaat_id}")
async def update_dagstaat(
    dagstaat_id: str,
    data: DagstaatUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a daily statement"""
    user_id = current_user["id"]
    
    # Get current dagstaat
    dagstaat = await db.suribet_dagstaten.find_one({
        "id": dagstaat_id,
        "user_id": user_id
    })
    
    if not dagstaat:
        raise HTTPException(status_code=404, detail="Dagstaat niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    # Recalculate if omzet or percentage changed
    if "omzet" in update_data or "suribet_percentage" in update_data:
        omzet = update_data.get("omzet", dagstaat["omzet"])
        percentage = update_data.get("suribet_percentage", dagstaat["suribet_percentage"])
        update_data["suribet_deel"] = omzet * (percentage / 100)
        update_data["commissie"] = omzet * ((100 - percentage) / 100)
        update_data["status"] = "winst" if update_data["commissie"] > 0 else "verlies"
    
    # Recalculate biljetten totals if changed
    if any(k.startswith("biljetten") for k in update_data):
        rates = await db.suribet_wisselkoersen.find_one({"user_id": user_id})
        eur_rate = rates["eur_to_srd"] if rates else 38.50
        usd_rate = rates["usd_to_srd"] if rates else 35.50
        
        biljetten_srd = update_data.get("biljetten_srd", dagstaat.get("biljetten_srd", {}))
        biljetten_eur = update_data.get("biljetten_eur", dagstaat.get("biljetten_eur", {}))
        biljetten_usd = update_data.get("biljetten_usd", dagstaat.get("biljetten_usd", {}))
        
        if isinstance(biljetten_srd, BiljettenSRD):
            biljetten_srd = biljetten_srd.dict()
        if isinstance(biljetten_eur, BiljettenEUR):
            biljetten_eur = biljetten_eur.dict()
        if isinstance(biljetten_usd, BiljettenUSD):
            biljetten_usd = biljetten_usd.dict()
        
        total_srd = sum(int(k[1:]) * v for k, v in biljetten_srd.items() if k.startswith('b'))
        total_eur = sum(int(k[1:]) * v for k, v in biljetten_eur.items() if k.startswith('b'))
        total_usd = sum(int(k[1:]) * v for k, v in biljetten_usd.items() if k.startswith('b'))
        
        update_data["total_counted_srd"] = total_srd
        update_data["total_counted_eur"] = total_eur
        update_data["total_counted_usd"] = total_usd
        update_data["total_in_srd"] = total_srd + (total_eur * eur_rate) + (total_usd * usd_rate)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.suribet_dagstaten.update_one(
        {"id": dagstaat_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Dagstaat bijgewerkt"}

@router.delete("/dagstaten/{dagstaat_id}")
async def delete_dagstaat(
    dagstaat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a daily statement"""
    user_id = current_user["id"]
    
    result = await db.suribet_dagstaten.delete_one({
        "id": dagstaat_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dagstaat niet gevonden")
    
    return {"message": "Dagstaat verwijderd"}

# ============================================
# WERKNEMERS ENDPOINTS
# ============================================

@router.get("/werknemers")
async def get_werknemers(current_user: dict = Depends(get_current_user)):
    """Get all employees"""
    user_id = current_user["id"]
    werknemers = await db.suribet_werknemers.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("name", 1).to_list(1000)
    
    # Add has_portal_access flag and remove password from response
    for w in werknemers:
        w["has_portal_access"] = bool(w.get("username") and w.get("password"))
        if "password" in w:
            del w["password"]
    
    return werknemers

@router.post("/werknemers")
async def create_werknemer(
    data: WerknemerCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new employee"""
    user_id = current_user["id"]
    
    # Check if username is unique within this user's employees
    if data.username:
        existing = await db.suribet_werknemers.find_one({
            "user_id": user_id,
            "username": data.username
        })
        if existing:
            raise HTTPException(status_code=400, detail="Gebruikersnaam is al in gebruik")
    
    werknemer = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": data.name,
        "function": data.function,
        "hourly_rate": data.hourly_rate,
        "daily_rate": data.daily_rate,
        "status": data.status,
        "phone": data.phone,
        "address": data.address,
        "notes": data.notes,
        "username": data.username,
        "password": data.password,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_werknemers.insert_one(werknemer)
    if "_id" in werknemer:
        del werknemer["_id"]
    # Don't return password
    if "password" in werknemer:
        werknemer["has_portal_access"] = bool(werknemer.get("username") and werknemer.get("password"))
        del werknemer["password"]
    return werknemer

@router.put("/werknemers/{werknemer_id}")
async def update_werknemer(
    werknemer_id: str,
    data: WerknemerUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an employee"""
    user_id = current_user["id"]
    
    # Check if username is unique (if being changed)
    if data.username:
        existing = await db.suribet_werknemers.find_one({
            "user_id": user_id,
            "username": data.username,
            "id": {"$ne": werknemer_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Gebruikersnaam is al in gebruik")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.suribet_werknemers.update_one(
        {"id": werknemer_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    return {"message": "Werknemer bijgewerkt"}

@router.delete("/werknemers/{werknemer_id}")
async def delete_werknemer(
    werknemer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an employee"""
    user_id = current_user["id"]
    
    result = await db.suribet_werknemers.delete_one({
        "id": werknemer_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    return {"message": "Werknemer verwijderd"}

# ============================================
# SHIFTS ENDPOINTS
# ============================================

@router.get("/shifts")
async def get_shifts(
    month: Optional[int] = None,
    year: Optional[int] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get shifts"""
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    
    if employee_id:
        query["employee_id"] = employee_id
    
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    
    shifts = await db.suribet_shifts.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return shifts

@router.post("/shifts")
async def create_shift(
    data: ShiftCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a shift"""
    user_id = current_user["id"]
    
    shift = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "employee_id": data.employee_id,
        "machine_id": data.machine_id,
        "date": data.date,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "cash_difference": data.cash_difference,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_shifts.insert_one(shift)
    if "_id" in shift:
        del shift["_id"]
    return shift

@router.put("/shifts/{shift_id}")
async def update_shift(
    shift_id: str,
    data: ShiftUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a shift"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.suribet_shifts.update_one(
        {"id": shift_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    return {"message": "Shift bijgewerkt"}

@router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a shift"""
    user_id = current_user["id"]
    
    result = await db.suribet_shifts.delete_one({
        "id": shift_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    return {"message": "Shift verwijderd"}

# ============================================
# KASBOEK ENDPOINTS
# ============================================

@router.get("/kasboek")
async def get_kasboek(
    date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    transaction_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get kasboek entries"""
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    # Specifieke datum heeft prioriteit
    if date:
        query["date"] = date
    elif month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    elif year:
        query["date"] = {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}
    
    entries = await db.suribet_kasboek.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return entries

@router.post("/kasboek")
async def create_kasboek_entry(
    data: KasboekCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a kasboek entry"""
    user_id = current_user["id"]
    
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": data.date,
        "transaction_type": data.transaction_type,
        "category": data.category,
        "amount": data.amount,
        "currency": data.currency,
        "description": data.description,
        "machine_id": data.machine_id,
        "employee_id": data.employee_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_kasboek.insert_one(entry)
    if "_id" in entry:
        del entry["_id"]
    return entry

@router.put("/kasboek/{entry_id}")
async def update_kasboek_entry(
    entry_id: str,
    data: KasboekUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a kasboek entry"""
    user_id = current_user["id"]
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.suribet_kasboek.update_one(
        {"id": entry_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kasboek entry niet gevonden")
    
    return {"message": "Kasboek entry bijgewerkt"}

@router.delete("/kasboek/{entry_id}")
async def delete_kasboek_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a kasboek entry"""
    user_id = current_user["id"]
    
    result = await db.suribet_kasboek.delete_one({
        "id": entry_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kasboek entry niet gevonden")
    
    return {"message": "Kasboek entry verwijderd"}

# ============================================
# LOONBETALING ENDPOINTS
# ============================================

@router.get("/loonbetalingen")
async def get_loonbetalingen(
    date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get salary payments"""
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    
    if employee_id:
        query["employee_id"] = employee_id
    
    # Specifieke datum heeft prioriteit
    if date:
        query["date"] = date
    elif month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    
    betalingen = await db.suribet_loonbetalingen.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return betalingen

@router.post("/loonbetalingen")
async def create_loonbetaling(
    data: LoonbetalingCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a salary payment"""
    user_id = current_user["id"]
    
    # Calculate net amount
    net_amount = data.base_amount + data.bonus - data.deductions - data.advance_payment
    
    betaling = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "employee_id": data.employee_id,
        "date": data.date,
        "period_start": data.period_start,
        "period_end": data.period_end,
        "hours_worked": data.hours_worked,
        "days_worked": data.days_worked,
        "base_amount": data.base_amount,
        "bonus": data.bonus,
        "deductions": data.deductions,
        "advance_payment": data.advance_payment,
        "net_amount": net_amount,
        "notes": data.notes,
        "status": "paid",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suribet_loonbetalingen.insert_one(betaling)
    if "_id" in betaling:
        del betaling["_id"]
    
    # Also add to kasboek
    kasboek_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": data.date,
        "transaction_type": "expense",
        "category": "loon",
        "amount": net_amount,
        "currency": "SRD",
        "description": f"Loonbetaling",
        "employee_id": data.employee_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.suribet_kasboek.insert_one(kasboek_entry)
    
    return betaling

@router.delete("/loonbetalingen/{betaling_id}")
async def delete_loonbetaling(
    betaling_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a salary payment"""
    user_id = current_user["id"]
    
    result = await db.suribet_loonbetalingen.delete_one({
        "id": betaling_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loonbetaling niet gevonden")
    
    return {"message": "Loonbetaling verwijderd"}

# ============================================
# DASHBOARD STATS ENDPOINT
# ============================================

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics"""
    user_id = current_user["id"]
    
    # Default to current month/year
    now = datetime.now()
    if not month:
        month = now.month
    if not year:
        year = now.year
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    # Get machines
    machines = await db.suribet_machines.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    active_machines = len([m for m in machines if m.get("status") == "active"])
    
    # Get dagstaten for the month
    dagstaten = await db.suribet_dagstaten.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(1000)
    
    total_omzet = sum(d.get("omzet", 0) for d in dagstaten)
    total_commissie = sum(d.get("commissie", 0) for d in dagstaten)
    total_suribet = sum(d.get("suribet_deel", 0) for d in dagstaten)
    
    # Count profit/loss
    winst_count = len([d for d in dagstaten if d.get("status") == "winst"])
    verlies_count = len([d for d in dagstaten if d.get("status") == "verlies"])
    
    # Get werknemers
    werknemers = await db.suribet_werknemers.find(
        {"user_id": user_id, "status": "active"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get kasboek for the month
    kasboek = await db.suribet_kasboek.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(1000)
    
    total_income = sum(k.get("amount", 0) for k in kasboek if k.get("transaction_type") == "income")
    total_expenses = sum(k.get("amount", 0) for k in kasboek if k.get("transaction_type") == "expense")
    
    # Get loonbetalingen
    loonbetalingen = await db.suribet_loonbetalingen.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(1000)
    
    total_loonkosten = sum(l.get("net_amount", 0) for l in loonbetalingen)
    
    # Calculate net profit
    netto_winst = total_commissie - total_expenses
    
    return {
        "month": month,
        "year": year,
        "machines": {
            "total": len(machines),
            "active": active_machines,
            "inactive": len(machines) - active_machines
        },
        "omzet": {
            "total": total_omzet,
            "suribet_deel": total_suribet,
            "commissie": total_commissie
        },
        "prestaties": {
            "winst_dagen": winst_count,
            "verlies_dagen": verlies_count,
            "totaal_dagen": len(dagstaten)
        },
        "personeel": {
            "actief": len(werknemers),
            "loonkosten": total_loonkosten
        },
        "kasboek": {
            "inkomsten": total_income,
            "uitgaven": total_expenses,
            "saldo": total_income - total_expenses
        },
        "netto_winst": netto_winst
    }


# ============================================
# WERKNEMER PORTAL ENDPOINTS (Public)
# ============================================

@router.post("/portal/login")
async def werknemer_portal_login(data: WerknemerLogin):
    """Login for employee shift portal - no auth required"""
    # Find employee with matching username and password for this user
    werknemer = await db.suribet_werknemers.find_one({
        "user_id": data.user_id,
        "username": data.username,
        "status": "active"
    })
    
    if not werknemer:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    # Check password (simple comparison - in production use hashing)
    if werknemer.get("password") != data.password:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    # Get employer info
    employer = await db.users.find_one({"id": data.user_id}, {"_id": 0, "company_name": 1, "name": 1})
    
    return {
        "employee_id": werknemer["id"],
        "name": werknemer["name"],
        "function": werknemer.get("function", ""),
        "user_id": data.user_id,
        "employer_name": employer.get("company_name") or employer.get("name") if employer else "Onbekend"
    }

@router.get("/portal/machines/{user_id}")
async def get_portal_machines(user_id: str):
    """Get available machines for shift portal"""
    machines = await db.suribet_machines.find(
        {"user_id": user_id, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    return machines

@router.get("/portal/active-shift/{user_id}/{employee_id}")
async def get_active_shift(user_id: str, employee_id: str):
    """Check if employee has an active shift (any day, not just today)"""
    # Find any shift without end_time (active shift), regardless of date
    active_shift = await db.suribet_shifts.find_one({
        "user_id": user_id,
        "employee_id": employee_id,
        "end_time": None
    }, {"_id": 0})
    
    return {"active_shift": active_shift}

@router.post("/portal/shift/start")
async def start_shift_portal(
    user_id: str,
    employee_id: str,
    machine_id: str
):
    """Start a new shift from employee portal"""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")
    
    # Check for existing active shift (any day, not just today)
    existing = await db.suribet_shifts.find_one({
        "user_id": user_id,
        "employee_id": employee_id,
        "end_time": None
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Je hebt al een actieve shift")
    
    # Verify employee exists and is active
    werknemer = await db.suribet_werknemers.find_one({
        "id": employee_id,
        "user_id": user_id,
        "status": "active"
    })
    
    if not werknemer:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    # Verify machine exists
    machine = await db.suribet_machines.find_one({
        "id": machine_id,
        "user_id": user_id
    })
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    
    shift = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "employee_id": employee_id,
        "machine_id": machine_id,
        "date": today,
        "start_time": current_time,
        "end_time": None,
        "cash_difference": 0,
        "notes": "Gestart via werknemer portaal",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.suribet_shifts.insert_one(shift)
    if "_id" in shift:
        del shift["_id"]
    
    return {
        "shift": shift,
        "machine_name": machine.get("machine_id", ""),
        "message": f"Shift gestart op {machine.get('machine_id', '')} om {current_time}"
    }

@router.post("/portal/shift/stop")
async def stop_shift_portal(
    user_id: str,
    employee_id: str,
    shift_id: str,
    cash_difference: float = 0,
    notes: Optional[str] = None
):
    """Stop an active shift from employee portal"""
    now = datetime.now(timezone.utc)
    current_time = now.strftime("%H:%M")
    
    # Find the active shift
    shift = await db.suribet_shifts.find_one({
        "id": shift_id,
        "user_id": user_id,
        "employee_id": employee_id,
        "end_time": None
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Actieve shift niet gevonden")
    
    # Calculate hours worked
    start_parts = shift["start_time"].split(":")
    end_parts = current_time.split(":")
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
    hours_worked = round((end_minutes - start_minutes) / 60, 2)
    
    # Update shift
    update_data = {
        "end_time": current_time,
        "cash_difference": cash_difference,
        "hours_worked": hours_worked,
        "updated_at": now.isoformat()
    }
    
    if notes:
        update_data["notes"] = (shift.get("notes", "") + " | " + notes).strip(" | ")
    
    await db.suribet_shifts.update_one(
        {"id": shift_id},
        {"$set": update_data}
    )
    
    # Get machine info
    machine = await db.suribet_machines.find_one({"id": shift["machine_id"]}, {"_id": 0, "machine_id": 1})
    
    return {
        "message": f"Shift beëindigd om {current_time}",
        "hours_worked": hours_worked,
        "machine_name": machine.get("machine_id", "") if machine else "",
        "start_time": shift["start_time"],
        "end_time": current_time
    }

@router.get("/portal/shift-history/{user_id}/{employee_id}")
async def get_shift_history(user_id: str, employee_id: str, limit: int = 10):
    """Get recent shift history for employee"""
    shifts = await db.suribet_shifts.find(
        {"user_id": user_id, "employee_id": employee_id},
        {"_id": 0}
    ).sort("date", -1).limit(limit).to_list(limit)
    
    # Add machine names
    for shift in shifts:
        machine = await db.suribet_machines.find_one(
            {"id": shift["machine_id"]}, 
            {"_id": 0, "machine_id": 1, "location": 1}
        )
        if machine:
            shift["machine_name"] = machine.get("machine_id", "")
            shift["machine_location"] = machine.get("location", "")
    
    return shifts


# ============================================
# BON SCANNER ENDPOINT
# ============================================

@router.post("/parse-bon")
async def parse_bon_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Parse a Suribet receipt image using AI vision"""
    import logging
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Define FileContent and ImageContent locally (for older library versions)
        class FileContent:
            def __init__(self, content_type: str, file_content_base64: str):
                self.content_type = content_type
                self.file_content_base64 = file_content_base64
        
        class ImageContent(FileContent):
            def __init__(self, image_base64: str):
                super().__init__("image", image_base64)
        
        # Read file contents
        contents = await file.read()
        logger.info(f"Received file: {file.filename}, size: {len(contents)} bytes, content_type: {file.content_type}")
        
        # Encode image to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        logger.info(f"Base64 encoded image length: {len(base64_image)}")
        
        # Get API key
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logger.error("EMERGENT_LLM_KEY not found in environment")
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        logger.info("Creating LlmChat instance with gemini-2.0-flash model")
        
        # Create chat instance with Gemini Vision
        chat = LlmChat(
            api_key=api_key,
            session_id=f"bon-parse-{uuid.uuid4()}",
            system_message="""You are a receipt data extractor. Extract ALL data from Suribet receipts.
            
Return ONLY valid JSON, no other text. Use this exact structure:
{
  "pos_sales": [
    {"product": "SB", "total_bets": 0.00, "comm_percentage": 0.00, "commission": 0.00}
  ],
  "pos_sales_total": 0.00,
  "pos_sales_commission": 0.00,
  "pos_payout": [
    {"product": "PT", "total_paid": 0.00, "comm_percentage": 0.00, "commission": 0.00}
  ],
  "pos_payout_total": 0.00,
  "pos_payout_commission": 0.00,
  "playable_ticket": [
    {"product": "SB", "total_bets": 0.00, "comm_percentage": 0.00, "commission": 0.00}
  ],
  "playable_ticket_total": 0.00,
  "playable_ticket_commission": 0.00,
  "total_sales": 0.00,
  "kiosk_cash_in": 0.00,
  "kiosk_commission": 0.00,
  "total_pc_sales": 0.00,
  "total_payout": 0.00,
  "total_pt_pos_cancel_bets": 0.00,
  "total_pos_commission": 0.00,
  "balance": 0.00
}

Product codes: SB=Sports Betting, SF=Scratch Fun, VSF=Virtual Scratch Fun, Topup, PT=Prize Transfer, S2W=Spin2Win, VSB=Virtual Sports Betting, WDR=Withdrawal, WDRNC=Withdrawal No Commission, YGT=Your Game Ticket, AMT=Amount.

Extract ALL products shown on the receipt. Use 0.00 for missing values."""
        )
        
        # Support both old and new library versions
        try:
            chat = chat.with_model("gemini", "gemini-2.0-flash")
        except TypeError:
            chat = chat.with_model("gemini-2.0-flash")
        
        # Create image content
        image_content = ImageContent(image_base64=base64_image)
        
        # Send message with image
        user_message = UserMessage(
            text="Extract all data from this Suribet receipt. Return ONLY the JSON, nothing else.",
            file_contents=[image_content]
        )
        
        logger.info("Sending message to Gemini Vision API...")
        response = await chat.send_message(user_message)
        logger.info(f"Received response from Gemini: {response[:500] if response else 'Empty response'}...")
        
        # Parse the JSON response - clean markdown if present
        json_str = response.strip()
        if json_str.startswith("```"):
            json_str = re.sub(r'^```(?:json)?\n?', '', json_str)
            json_str = re.sub(r'\n?```$', '', json_str)
        
        try:
            bon_data = json.loads(json_str)
            logger.info("Successfully parsed JSON response")
        except json.JSONDecodeError as je:
            logger.warning(f"Initial JSON parse failed: {je}")
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                bon_data = json.loads(json_match.group())
                logger.info("Extracted JSON from response using regex")
            else:
                logger.error(f"Could not parse JSON from response: {response[:500]}")
                raise HTTPException(status_code=400, detail="Could not parse receipt data from AI response")
        
        return {
            "success": True,
            "bon_data": bon_data
        }
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Missing library: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bon parse error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error parsing receipt: {str(e)}")

# ============================================
# PRODUCT SETTINGS ENDPOINTS
# ============================================

@router.get("/product-settings")
async def get_product_settings(current_user: dict = Depends(get_current_user)):
    """Get user's product commission settings"""
    user_id = current_user["id"]
    
    settings = await db.suribet_product_settings.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        settings = {
            "user_id": user_id,
            "pos_sales_products": [
                {"code": "SB", "name": "Sports Betting", "comm_percentage": 5.0},
                {"code": "SF", "name": "Scratch Fun", "comm_percentage": 8.0},
                {"code": "VSF", "name": "Virtual Scratch Fun", "comm_percentage": 8.0},
                {"code": "Topup", "name": "Topup", "comm_percentage": 2.0},
                {"code": "PT", "name": "Prize Transfer", "comm_percentage": 0.0},
                {"code": "S2W", "name": "Spin2Win", "comm_percentage": 8.0},
                {"code": "VSB", "name": "Virtual Sports Betting", "comm_percentage": 5.0},
            ],
            "pos_payout_products": [
                {"code": "PT", "name": "Prize Transfer", "comm_percentage": 0.0},
                {"code": "S2W", "name": "Spin2Win", "comm_percentage": 0.0},
                {"code": "SF", "name": "Scratch Fun", "comm_percentage": 0.0},
                {"code": "VSB", "name": "Virtual Sports Betting", "comm_percentage": 0.0},
                {"code": "WDR", "name": "Withdrawal", "comm_percentage": 0.0},
                {"code": "WDRNC", "name": "Withdrawal No Commission", "comm_percentage": 0.0},
            ],
            "playable_ticket_products": [
                {"code": "SB", "name": "Sports Betting", "comm_percentage": 5.0},
                {"code": "VSF", "name": "Virtual Scratch Fun", "comm_percentage": 8.0},
                {"code": "S2W", "name": "Spin2Win", "comm_percentage": 8.0},
                {"code": "YGT", "name": "Your Game Ticket", "comm_percentage": 5.0},
                {"code": "AMT", "name": "Amount", "comm_percentage": 5.0},
            ],
            "retailer_percentage": 20.0  # Retailer gets 20%, Suribet gets 80%
        }
    
    return settings

@router.put("/product-settings")
async def update_product_settings(
    settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's product commission settings"""
    user_id = current_user["id"]
    
    settings["user_id"] = user_id
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.suribet_product_settings.update_one(
        {"user_id": user_id},
        {"$set": settings},
        upsert=True
    )
    
    return {"message": "Instellingen opgeslagen"}
