# Shared dependencies for all routers
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import jwt
import bcrypt
import uuid
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'erp_db')]

async def get_db():
    """Get database instance - async compatible"""
    return db

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'suri-rentals-default-secret-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Constants
SUPER_ADMIN_EMAIL = "admin@facturatie.sr"
SUBSCRIPTION_PRICE = 7500
TRIAL_DAYS = 3
SERVER_IP = "72.62.174.117"  # Update with your actual server IP
MAIN_DOMAIN = "facturatie.sr"

# Logger
logger = logging.getLogger(__name__)

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash"""
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str, email: str) -> str:
    """Create a JWT token"""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode a JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

# ==================== AUTH DEPENDENCIES ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
    
    # Add subscription status
    status, end_date, _ = get_subscription_status(user)
    user["subscription_status"] = status
    user["subscription_end_date"] = end_date
    
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """Get current user with active subscription check"""
    if current_user.get("role") == "superadmin":
        return current_user
    
    # Demo accounts should always have access
    if current_user.get("is_demo"):
        return current_user
    
    # Check if user has any active addon (including free boekhouding)
    user_id = current_user.get("id")
    active_addons = await db.user_addons.find({
        "user_id": user_id,
        "status": {"$in": ["active", "trial"]}
    }).to_list(100)
    
    # If user has active addons (like free boekhouding), allow access
    if active_addons and len(active_addons) > 0:
        return current_user
    
    status = current_user.get("subscription_status")
    if status not in ["active", "trial"]:
        raise HTTPException(status_code=403, detail="Abonnement niet actief")
    
    return current_user

async def get_superadmin(current_user: dict = Depends(get_current_user)):
    """Require superadmin role"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Alleen superadmin heeft toegang")
    return current_user

# ==================== SUBSCRIPTION HELPERS ====================

def get_subscription_status(user: dict) -> tuple:
    """Get subscription status for a user"""
    if user.get("role") == "superadmin":
        return ("active", None, 0)
    
    end_date_str = user.get("subscription_end_date")
    if not end_date_str:
        return ("none", None, 0)
    
    try:
        if isinstance(end_date_str, str):
            # Handle both timezone-aware and naive datetime strings
            if '+' in end_date_str or 'Z' in end_date_str:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            else:
                # Assume UTC for naive datetime strings
                end_date = datetime.fromisoformat(end_date_str).replace(tzinfo=timezone.utc)
        else:
            end_date = end_date_str
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        days_remaining = (end_date - now).days
        
        if end_date < now:
            return ("expired", end_date.isoformat(), 0)
        
        if user.get("is_trial"):
            return ("trial", end_date.isoformat(), days_remaining)
        
        return ("active", end_date.isoformat(), days_remaining)
    except Exception as e:
        logger.error(f"Error parsing subscription_end_date: {e}")
        return ("none", None, 0)

def format_currency(amount: float) -> str:
    """Format amount as SRD currency"""
    return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

# ==================== WORKSPACE HELPERS ====================

async def get_workspace_from_host(host: str) -> Optional[dict]:
    """Get workspace based on host/subdomain"""
    if not host:
        return None
    
    host = host.split(':')[0]
    
    if '.' in host and not host.startswith('www.'):
        subdomain = host.split('.')[0]
        if subdomain not in ['www', 'api', 'admin', 'localhost', 'modular-erp-20']:
            workspace = await db.workspaces.find_one(
                {"domain.subdomain": subdomain, "status": "active"},
                {"_id": 0}
            )
            if workspace:
                return workspace
    
    workspace = await db.workspaces.find_one(
        {"domain.custom_domain": host, "status": "active"},
        {"_id": 0}
    )
    return workspace

async def get_user_workspace(user_id: str) -> Optional[dict]:
    """Get workspace for a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "workspace_id": 1})
    if user and user.get("workspace_id"):
        return await db.workspaces.find_one({"id": user["workspace_id"]}, {"_id": 0})
    return None

async def create_workspace_for_user(user_id: str, user_name: str, company_name: str = None) -> dict:
    """Automatically create a workspace for a new user"""
    import re
    
    base_name = company_name or user_name
    slug = re.sub(r'[^a-z0-9]', '', base_name.lower())[:20]
    
    existing = await db.workspaces.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    workspace = {
        "id": workspace_id,
        "name": company_name or f"{user_name}'s Workspace",
        "slug": slug,
        "owner_id": user_id,
        "status": "active",
        "domain": {
            "type": "subdomain",
            "subdomain": slug,
            "custom_domain": None,
            "dns_verified": True,
            "ssl_active": True,
            "dns_record_type": "A",
            "dns_record_value": SERVER_IP
        },
        "branding": {
            "logo_url": None,
            "favicon_url": None,
            "primary_color": "#0caf60",
            "secondary_color": "#059669",
            "portal_name": company_name or f"{user_name}'s Portaal"
        },
        "created_at": now,
        "updated_at": now,
        "error_message": None
    }
    
    await db.workspaces.insert_one(workspace)
    workspace.pop("_id", None)
    await db.users.update_one({"id": user_id}, {"$set": {"workspace_id": workspace_id}})
    
    return workspace

def workspace_filter(user: dict, extra_filter: dict = None) -> dict:
    """Create a MongoDB filter that includes workspace_id for non-superadmin users"""
    base_filter = extra_filter or {}
    
    if user.get("role") == "superadmin":
        return base_filter
    
    workspace_id = user.get("workspace_id")
    if workspace_id:
        return {**base_filter, "workspace_id": workspace_id}
    
    return {**base_filter, "workspace_id": "none"}
