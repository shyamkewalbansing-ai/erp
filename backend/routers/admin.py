# Admin Router - Superadmin management endpoints
# Refactored from server.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import jwt
import os

router = APIRouter(prefix="/admin", tags=["Admin"])

security = HTTPBearer()

# Import shared dependencies
from .deps import get_db

JWT_SECRET = os.environ.get("JWT_SECRET", "suri-rentals-secure-jwt-secret-2024")

# ==================== DEPENDENCY ====================

async def get_superadmin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify that the user is a superadmin"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        db = await get_db()
        user = await db.users.find_one({"id": payload.get("user_id")})
        
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
        
        if user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Alleen voor superadmin")
        
        user["id"] = str(user.get("_id", user.get("id")))
        if "_id" in user:
            del user["_id"]
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")


# ==================== PYDANTIC MODELS ====================

class AddonCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price_monthly: float = 0
    price_yearly: float = 0
    features: List[str] = []
    is_active: bool = True
    icon: Optional[str] = None
    category: Optional[str] = None

class AddonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    icon: Optional[str] = None
    category: Optional[str] = None

class MopeSettings(BaseModel):
    test_token: Optional[str] = None
    live_token: Optional[str] = None
    use_live_mode: bool = False

class LandingSettings(BaseModel):
    company_name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_admin_dashboard(current_user: dict = Depends(get_superadmin)):
    """Get admin dashboard statistics"""
    db = await get_db()
    
    # Count users
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": {"$ne": False}})
    
    # Count workspaces
    total_workspaces = await db.workspaces.count_documents({})
    
    # Count subscriptions
    active_subscriptions = await db.user_addons.count_documents({
        "status": "active",
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    # Recent signups (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc).replace(day=1).isoformat()
    recent_signups = await db.users.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Pending addon requests
    pending_requests = await db.addon_requests.count_documents({"status": "pending"})
    
    # Revenue (from subscriptions)
    subscriptions = await db.subscriptions.find({
        "status": "active"
    }).to_list(1000)
    monthly_revenue = sum(s.get("amount", 0) for s in subscriptions if s.get("billing_cycle") == "monthly")
    yearly_revenue = sum(s.get("amount", 0) for s in subscriptions if s.get("billing_cycle") == "yearly")
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "recent_signups": recent_signups
        },
        "workspaces": {
            "total": total_workspaces
        },
        "subscriptions": {
            "active": active_subscriptions,
            "pending_requests": pending_requests
        },
        "revenue": {
            "monthly": monthly_revenue,
            "yearly": yearly_revenue,
            "total_mrr": monthly_revenue + (yearly_revenue / 12)
        }
    }


# ==================== USER MANAGEMENT ====================

@router.get("/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    current_user: dict = Depends(get_superadmin)
):
    """Get all users with pagination"""
    db = await get_db()
    
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(
        query,
        {"password": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    for user in users:
        user["id"] = str(user.pop("_id", user.get("id")))
    
    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/users/{user_id}")
async def get_user_details(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Get detailed user information"""
    db = await get_db()
    
    user = await db.users.find_one(
        {"$or": [{"id": user_id}, {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else None}]},
        {"password": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    user["id"] = str(user.pop("_id", user.get("id")))
    
    # Get user's addons
    user_addons = await db.user_addons.find({"user_id": user_id}).to_list(50)
    for addon in user_addons:
        addon["id"] = str(addon.pop("_id"))
    
    # Get user's workspace
    workspace = await db.workspaces.find_one({"owner_id": user_id})
    if workspace:
        workspace["id"] = str(workspace.pop("_id", workspace.get("id")))
    
    return {
        "user": user,
        "addons": user_addons,
        "workspace": workspace
    }


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(get_superadmin)
):
    """Activate or deactivate a user"""
    db = await get_db()
    
    result = await db.users.update_one(
        {"$or": [{"id": user_id}, {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else None}]},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    return {"message": f"Gebruiker {'geactiveerd' if is_active else 'gedeactiveerd'}"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a user and all associated data"""
    db = await get_db()
    
    # Check if user exists
    user = await db.users.find_one(
        {"$or": [{"id": user_id}, {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else None}]}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    if user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Kan geen superadmin verwijderen")
    
    # Delete user data
    await db.users.delete_one({"_id": user["_id"]})
    await db.user_addons.delete_many({"user_id": user_id})
    await db.workspaces.delete_many({"owner_id": user_id})
    
    return {"message": "Gebruiker en gerelateerde data verwijderd"}


# ==================== ADDON MANAGEMENT ====================

@router.get("/addons")
async def get_all_addons(current_user: dict = Depends(get_superadmin)):
    """Get all addons"""
    db = await get_db()
    
    addons = await db.addons.find({}).to_list(100)
    for addon in addons:
        addon["id"] = str(addon.pop("_id"))
    
    return addons


@router.post("/addons")
async def create_addon(addon_data: AddonCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new addon"""
    db = await get_db()
    
    # Check if slug already exists
    existing = await db.addons.find_one({"slug": addon_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Addon met deze slug bestaat al")
    
    addon_dict = addon_data.model_dump()
    addon_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    addon_dict["created_by"] = current_user.get("id")
    
    result = await db.addons.insert_one(addon_dict)
    addon_dict["id"] = str(result.inserted_id)
    
    return addon_dict


@router.put("/addons/{addon_id}")
async def update_addon(addon_id: str, addon_data: AddonUpdate, current_user: dict = Depends(get_superadmin)):
    """Update an addon"""
    db = await get_db()
    
    update_data = {k: v for k, v in addon_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.addons.update_one(
        {"_id": ObjectId(addon_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Addon niet gevonden")
    
    return {"message": "Addon bijgewerkt"}


@router.delete("/addons/{addon_id}")
async def delete_addon(addon_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete an addon"""
    db = await get_db()
    
    result = await db.addons.delete_one({"_id": ObjectId(addon_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Addon niet gevonden")
    
    return {"message": "Addon verwijderd"}


# ==================== ADDON REQUESTS ====================

@router.get("/addon-requests")
async def get_addon_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_superadmin)
):
    """Get all addon requests"""
    db = await get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.addon_requests.find(query).sort("created_at", -1).to_list(200)
    
    for req in requests:
        req["id"] = str(req.pop("_id"))
        
        # Get user info
        if req.get("user_id"):
            user = await db.users.find_one({"id": req["user_id"]}, {"password": 0, "_id": 0})
            req["user"] = user
    
    return requests


@router.put("/addon-requests/{request_id}/approve")
async def approve_addon_request(
    request_id: str,
    months: int = 1,
    current_user: dict = Depends(get_superadmin)
):
    """Approve an addon request"""
    db = await get_db()
    
    request = await db.addon_requests.find_one({"_id": ObjectId(request_id)})
    
    if not request:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden")
    
    if request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Verzoek is al verwerkt")
    
    # Activate the addon for the user
    expires_at = datetime.now(timezone.utc)
    if months > 0:
        from datetime import timedelta
        expires_at = expires_at + timedelta(days=months * 30)
    
    user_addon = {
        "user_id": request["user_id"],
        "addon_id": request["addon_id"],
        "addon_slug": request.get("addon_slug"),
        "status": "active",
        "activated_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "approved_by": current_user.get("id")
    }
    
    await db.user_addons.insert_one(user_addon)
    
    # Update request status
    await db.addon_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": "approved",
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": current_user.get("id")
        }}
    )
    
    return {"message": "Verzoek goedgekeurd"}


@router.put("/addon-requests/{request_id}/reject")
async def reject_addon_request(
    request_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_superadmin)
):
    """Reject an addon request"""
    db = await get_db()
    
    result = await db.addon_requests.update_one(
        {"_id": ObjectId(request_id), "status": "pending"},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": current_user.get("id")
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden of al verwerkt")
    
    return {"message": "Verzoek afgewezen"}


# ==================== MOPE SETTINGS ====================

@router.get("/mope/settings")
async def get_mope_settings(current_user: dict = Depends(get_superadmin)):
    """Get Mope payment gateway settings"""
    db = await get_db()
    
    settings = await db.admin_settings.find_one({"type": "mope"})
    
    if not settings:
        return {"test_token": None, "live_token": None, "use_live_mode": False}
    
    # Don't expose full tokens
    return {
        "test_token": "***" + settings.get("test_token", "")[-4:] if settings.get("test_token") else None,
        "live_token": "***" + settings.get("live_token", "")[-4:] if settings.get("live_token") else None,
        "use_live_mode": settings.get("use_live_mode", False)
    }


@router.put("/mope/settings")
async def update_mope_settings(
    settings_data: MopeSettings,
    current_user: dict = Depends(get_superadmin)
):
    """Update Mope payment gateway settings"""
    db = await get_db()
    
    update_data = settings_data.model_dump()
    update_data["type"] = "mope"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = current_user.get("id")
    
    await db.admin_settings.update_one(
        {"type": "mope"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Mope instellingen bijgewerkt"}


# ==================== LANDING PAGE SETTINGS ====================

@router.get("/landing/settings")
async def get_landing_settings(current_user: dict = Depends(get_superadmin)):
    """Get landing page settings"""
    db = await get_db()
    
    settings = await db.admin_settings.find_one({"type": "landing"})
    
    if not settings:
        return {}
    
    if "_id" in settings:
        del settings["_id"]
    
    return settings


@router.put("/landing/settings")
async def update_landing_settings(
    settings_data: LandingSettings,
    current_user: dict = Depends(get_superadmin)
):
    """Update landing page settings"""
    db = await get_db()
    
    update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    update_data["type"] = "landing"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.admin_settings.update_one(
        {"type": "landing"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Landing page instellingen bijgewerkt"}


# ==================== DEMO DATA CLEANUP ====================

DEMO_ACCOUNT_EMAIL = "demo@facturatie.sr"

@router.post("/cleanup-demo-data")
async def cleanup_demo_data_endpoint(current_user: dict = Depends(get_superadmin)):
    """Manually trigger demo data cleanup"""
    db = await get_db()
    
    from datetime import timedelta
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        demo_user = await db.users.find_one({"email": DEMO_ACCOUNT_EMAIL})
        if not demo_user:
            raise HTTPException(status_code=404, detail="Demo gebruiker niet gevonden")
        
        demo_user_id = str(demo_user.get("id", demo_user.get("_id")))
        demo_workspace_id = demo_user.get("workspace_id")
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        logger.info(f"Running manual demo data cleanup for user {DEMO_ACCOUNT_EMAIL}")
        
        # Collections to clean up with their user/workspace field names
        collections_to_clean = [
            # HRM data
            ("hrm_employees", "workspace_id"),
            ("hrm_departments", "workspace_id"),
            ("hrm_leave_requests", "workspace_id"),
            ("hrm_attendance", "workspace_id"),
            ("hrm_payroll", "workspace_id"),
            
            # Vastgoed data
            ("apartments", "workspace_id"),
            ("tenants", "workspace_id"),
            ("payments", "workspace_id"),
            ("deposits", "workspace_id"),
            ("maintenance", "workspace_id"),
            ("loans", "workspace_id"),
            
            # Auto dealer data
            ("autodealer_vehicles", "workspace_id"),
            ("autodealer_customers", "workspace_id"),
            ("autodealer_sales", "workspace_id"),
            
            # General data
            ("ai_chat_history", "user_id"),
            ("public_chats", "user_id"),
        ]
        
        total_deleted = 0
        deleted_details = {}
        
        for collection_name, filter_field in collections_to_clean:
            try:
                collection = db[collection_name]
                
                # Build filter based on field type
                if filter_field == "workspace_id" and demo_workspace_id:
                    filter_query = {
                        filter_field: demo_workspace_id,
                        "created_at": {"$lt": one_hour_ago.isoformat()}
                    }
                elif filter_field == "user_id":
                    filter_query = {
                        filter_field: demo_user_id,
                        "created_at": {"$lt": one_hour_ago.isoformat()}
                    }
                else:
                    continue
                
                result = await collection.delete_many(filter_query)
                if result.deleted_count > 0:
                    logger.info(f"Deleted {result.deleted_count} demo records from {collection_name}")
                    total_deleted += result.deleted_count
                    deleted_details[collection_name] = result.deleted_count
            except Exception as e:
                logger.error(f"Error cleaning {collection_name}: {e}")
        
        return {
            "message": f"Demo data cleanup voltooid: {total_deleted} records verwijderd",
            "total_deleted": total_deleted,
            "details": deleted_details,
            "demo_user_id": demo_user_id,
            "demo_workspace_id": demo_workspace_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demo cleanup error: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup fout: {str(e)}")


# ==================== SYSTEM STATS ====================

@router.get("/stats/system")
async def get_system_stats(current_user: dict = Depends(get_superadmin)):
    """Get system-wide statistics"""
    db = await get_db()
    
    # Database stats
    collections = await db.list_collection_names()
    collection_stats = {}
    
    for coll in collections[:20]:  # Limit to 20 collections
        count = await db[coll].count_documents({})
        collection_stats[coll] = count
    
    return {
        "database": {
            "collections": len(collections),
            "document_counts": collection_stats
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
