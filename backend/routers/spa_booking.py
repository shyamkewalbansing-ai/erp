"""
Beauty Spa Online Booking Portal
Public booking portal for customers to book appointments
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from .deps import db

router = APIRouter(prefix="/spa-booking", tags=["Spa Booking Portal"])

# ==================== MODELS ====================

class BookingRequest(BaseModel):
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    treatment_id: str
    preferred_staff_id: Optional[str] = None
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    notes: Optional[str] = None

class ClientRegistration(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    skin_type: Optional[str] = None
    allergies: Optional[List[str]] = []
    preferences: Optional[str] = None

# ==================== PUBLIC BOOKING ENDPOINTS ====================

@router.get("/spa/{workspace_id}/info")
async def get_spa_info(workspace_id: str):
    """Get spa info for booking portal"""
    # Find the spa owner by workspace
    user = await db.users.find_one({"id": workspace_id}, {"_id": 0})
    if not user:
        # Try to find by company name or other identifier
        user = await db.users.find_one({"company_name": {"$regex": workspace_id, "$options": "i"}}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Spa niet gevonden")
    
    # Check if user has beauty module
    if "beauty" not in user.get("modules", []):
        raise HTTPException(status_code=404, detail="Deze spa heeft geen online boekingen")
        raise HTTPException(status_code=404, detail="Deze spa heeft geen online boekingen")
    
    return {
        "spa_name": user.get("company_name", "Beauty Spa"),
        "workspace_id": user.get("id"),
        "phone": user.get("phone", ""),
        "email": user.get("email", ""),
        "address": user.get("address", "")
    }

@router.get("/spa/{workspace_id}/treatments")
async def get_available_treatments(workspace_id: str, category: Optional[str] = None):
    """Get available treatments for booking"""
    treatments = await db.spa_treatments.find({
        "user_id": workspace_id,
        "is_active": True
    }, {"_id": 0}).sort("category", 1).to_list(100)
    
    if category:
        treatments = [t for t in treatments if t.get("category") == category]
    
    # Group by category
    categories = {}
    for t in treatments:
        cat = t.get("category", "other")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "id": t.get("id"),
            "name": t.get("name"),
            "description": t.get("description"),
            "duration_minutes": t.get("duration_minutes"),
            "price_srd": t.get("price_srd"),
            "is_surinamese_special": t.get("is_surinamese_special", False),
            "is_package": t.get("is_package", False)
        })
    
    return {"categories": categories, "total": len(treatments)}

@router.get("/spa/{workspace_id}/staff")
async def get_available_staff(workspace_id: str, treatment_id: Optional[str] = None):
    """Get available staff members for booking"""
    query = {"user_id": workspace_id, "is_active": True, "role": "therapist"}
    
    staff = await db.spa_staff.find(query, {"_id": 0}).to_list(50)
    
    # If treatment specified, filter by specialization
    if treatment_id:
        treatment = await db.spa_treatments.find_one({"id": treatment_id}, {"_id": 0})
        if treatment:
            treatment_category = treatment.get("category", "")
            # Filter staff with matching specialization
            staff = [s for s in staff if treatment_category.capitalize() in s.get("specializations", [])]
    
    return [{
        "id": s.get("id"),
        "name": s.get("name"),
        "specializations": s.get("specializations", [])
    } for s in staff]

@router.get("/spa/{workspace_id}/availability")
async def get_availability(
    workspace_id: str,
    date: str,
    staff_id: Optional[str] = None,
    treatment_id: Optional[str] = None
):
    """Get available time slots for a specific date"""
    # Get treatment duration
    duration = 60
    if treatment_id:
        treatment = await db.spa_treatments.find_one({"id": treatment_id}, {"_id": 0})
        if treatment:
            duration = treatment.get("duration_minutes", 60)
    
    # Get existing appointments for the date
    query = {"user_id": workspace_id, "appointment_date": date, "status": {"$nin": ["cancelled", "no_show"]}}
    if staff_id:
        query["staff_id"] = staff_id
    
    existing_appointments = await db.spa_appointments.find(query, {"_id": 0}).to_list(100)
    
    # Get staff schedules
    staff_query = {"user_id": workspace_id, "is_active": True, "role": "therapist"}
    if staff_id:
        staff_query["id"] = staff_id
    
    available_staff = await db.spa_staff.find(staff_query, {"_id": 0}).to_list(50)
    
    # Generate time slots (9:00 - 19:00, every 30 minutes)
    time_slots = []
    for hour in range(9, 19):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"
            
            # Check if slot is available
            is_available = True
            available_for = []
            
            for staff in available_staff:
                staff_busy = False
                for apt in existing_appointments:
                    if apt.get("staff_id") == staff.get("id"):
                        apt_start = apt.get("appointment_time", "")
                        apt_end = apt.get("end_time", "")
                        if apt_start <= time_str < apt_end:
                            staff_busy = True
                            break
                
                if not staff_busy:
                    available_for.append(staff.get("name"))
            
            if available_for:
                time_slots.append({
                    "time": time_str,
                    "available": True,
                    "available_staff": available_for
                })
            else:
                time_slots.append({
                    "time": time_str,
                    "available": False,
                    "available_staff": []
                })
    
    return {"date": date, "slots": time_slots, "treatment_duration": duration}

@router.post("/spa/{workspace_id}/book")
async def create_booking(workspace_id: str, booking: BookingRequest):
    """Create a new booking"""
    now = datetime.now(timezone.utc)
    
    # Verify treatment exists
    treatment = await db.spa_treatments.find_one({
        "id": booking.treatment_id,
        "user_id": workspace_id,
        "is_active": True
    }, {"_id": 0})
    
    if not treatment:
        raise HTTPException(status_code=404, detail="Behandeling niet gevonden")
    
    # Find or create client
    client = await db.spa_clients.find_one({
        "user_id": workspace_id,
        "phone": booking.client_phone
    }, {"_id": 0})
    
    if not client:
        # Create new client
        client = {
            "id": str(uuid.uuid4()),
            "user_id": workspace_id,
            "name": booking.client_name,
            "phone": booking.client_phone,
            "email": booking.client_email,
            "membership_type": "none",
            "loyalty_points": 0,
            "total_visits": 0,
            "total_spent": 0,
            "created_at": now.isoformat()
        }
        await db.spa_clients.insert_one(client)
    
    # Find available staff if not specified
    staff_id = booking.preferred_staff_id
    if not staff_id:
        # Get first available staff
        staff_list = await db.spa_staff.find({
            "user_id": workspace_id,
            "is_active": True,
            "role": "therapist"
        }, {"_id": 0}).to_list(10)
        
        if staff_list:
            staff_id = staff_list[0].get("id")
    
    if not staff_id:
        raise HTTPException(status_code=400, detail="Geen beschikbaar personeel")
    
    # Calculate end time
    duration = treatment.get("duration_minutes", 60)
    start_parts = booking.appointment_time.split(":")
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    end_minutes = start_minutes + duration
    end_time = f"{end_minutes // 60:02d}:{end_minutes % 60:02d}"
    
    # Check for conflicts
    conflict = await db.spa_appointments.find_one({
        "user_id": workspace_id,
        "staff_id": staff_id,
        "appointment_date": booking.appointment_date,
        "status": {"$nin": ["cancelled", "no_show"]},
        "$or": [
            {"appointment_time": {"$lt": end_time}, "end_time": {"$gt": booking.appointment_time}}
        ]
    })
    
    if conflict:
        raise HTTPException(status_code=400, detail="Dit tijdslot is niet meer beschikbaar")
    
    # Create appointment
    appointment = {
        "id": str(uuid.uuid4()),
        "user_id": workspace_id,
        "client_id": client.get("id"),
        "treatment_id": booking.treatment_id,
        "staff_id": staff_id,
        "appointment_date": booking.appointment_date,
        "appointment_time": booking.appointment_time,
        "end_time": end_time,
        "status": "scheduled",
        "notes": booking.notes,
        "is_walk_in": False,
        "booked_online": True,
        "reminder_sent": False,
        "created_at": now.isoformat()
    }
    
    await db.spa_appointments.insert_one(appointment)
    
    # Update treatment booking count
    await db.spa_treatments.update_one(
        {"id": booking.treatment_id},
        {"$inc": {"times_booked": 1}}
    )
    
    # Get staff name for confirmation
    staff = await db.spa_staff.find_one({"id": staff_id}, {"_id": 0, "name": 1})
    
    return {
        "success": True,
        "booking_id": appointment["id"],
        "message": "Afspraak succesvol geboekt!",
        "confirmation": {
            "treatment": treatment.get("name"),
            "date": booking.appointment_date,
            "time": booking.appointment_time,
            "duration": f"{duration} minuten",
            "staff": staff.get("name") if staff else "Eerste beschikbare",
            "price": f"SRD {treatment.get('price_srd', 0):,.0f}"
        }
    }

@router.get("/spa/{workspace_id}/booking/{booking_id}")
async def get_booking_status(workspace_id: str, booking_id: str):
    """Check booking status"""
    appointment = await db.spa_appointments.find_one({
        "id": booking_id,
        "user_id": workspace_id
    }, {"_id": 0})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Boeking niet gevonden")
    
    # Get related info
    treatment = await db.spa_treatments.find_one({"id": appointment.get("treatment_id")}, {"_id": 0, "name": 1, "price_srd": 1})
    staff = await db.spa_staff.find_one({"id": appointment.get("staff_id")}, {"_id": 0, "name": 1})
    client = await db.spa_clients.find_one({"id": appointment.get("client_id")}, {"_id": 0, "name": 1, "phone": 1})
    
    return {
        "booking_id": booking_id,
        "status": appointment.get("status"),
        "date": appointment.get("appointment_date"),
        "time": appointment.get("appointment_time"),
        "treatment": treatment.get("name") if treatment else "Onbekend",
        "price": treatment.get("price_srd") if treatment else 0,
        "staff": staff.get("name") if staff else "Niet toegewezen",
        "client_name": client.get("name") if client else "",
        "client_phone": client.get("phone") if client else ""
    }

@router.post("/spa/{workspace_id}/cancel/{booking_id}")
async def cancel_booking(workspace_id: str, booking_id: str, phone: str):
    """Cancel a booking (requires phone verification)"""
    appointment = await db.spa_appointments.find_one({
        "id": booking_id,
        "user_id": workspace_id
    }, {"_id": 0})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Boeking niet gevonden")
    
    # Verify phone
    client = await db.spa_clients.find_one({"id": appointment.get("client_id")}, {"_id": 0, "phone": 1})
    if not client or client.get("phone") != phone:
        raise HTTPException(status_code=403, detail="Telefoonnummer komt niet overeen")
    
    # Check if not already cancelled
    if appointment.get("status") in ["cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Deze afspraak kan niet meer worden geannuleerd")
    
    # Cancel
    await db.spa_appointments.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Afspraak geannuleerd"}
