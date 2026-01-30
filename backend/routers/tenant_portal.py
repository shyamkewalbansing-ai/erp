"""
Tenant Portal Router
Handles all tenant-facing portal endpoints for tenants to:
- Register/login to their portal
- View their dashboard, payments, invoices
- Submit meter readings
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from .deps import get_current_user, db, hash_password, verify_password, create_token

router = APIRouter(prefix="/tenant-portal", tags=["Tenant Portal"])

# ==================== MODELS ====================

class TenantRegister(BaseModel):
    email: str
    password: str

class TenantLogin(BaseModel):
    email: str
    password: str

class TenantMeterReading(BaseModel):
    ebs_reading: Optional[float] = None
    swm_reading: Optional[float] = None
    notes: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

async def get_tenant_from_token(token: str):
    """Verify tenant token and return account"""
    from jose import jwt, JWTError
    import os
    
    SECRET_KEY = os.environ.get('SECRET_KEY', 'suri-rentals-default-secret-change-in-production')
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        account_id = payload.get("user_id")
        if not account_id:
            return None
        
        account = await db.tenant_accounts.find_one({"id": account_id}, {"_id": 0})
        return account
    except JWTError:
        return None

async def get_current_tenant(authorization: str = None):
    """Dependency to get current tenant from token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Niet geauthenticeerd")
    
    token = authorization.replace("Bearer ", "")
    account = await get_tenant_from_token(token)
    
    if not account:
        raise HTTPException(status_code=401, detail="Ongeldige of verlopen token")
    
    if not account.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is gedeactiveerd")
    
    return account

# ==================== AUTH ROUTES ====================

@router.post("/register")
async def tenant_portal_register(data: TenantRegister):
    """Register a tenant account linked to their tenant record"""
    tenant = await db.tenants.find_one({"email": data.email}, {"_id": 0})
    if not tenant:
        raise HTTPException(
            status_code=404, 
            detail="Geen huurder gevonden met dit e-mailadres. Neem contact op met uw verhuurder."
        )
    
    existing_account = await db.tenant_accounts.find_one({"email": data.email}, {"_id": 0})
    if existing_account:
        raise HTTPException(status_code=400, detail="Er bestaat al een account met dit e-mailadres")
    
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    account_doc = {
        "id": account_id,
        "tenant_id": tenant["id"],
        "email": data.email,
        "password": hash_password(data.password),
        "name": tenant["name"],
        "landlord_user_id": tenant["user_id"],
        "created_at": now.isoformat(),
        "last_login": None,
        "is_active": True
    }
    
    await db.tenant_accounts.insert_one(account_doc)
    token = create_token(account_id, data.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant": {
            "id": account_id,
            "tenant_id": tenant["id"],
            "email": data.email,
            "name": tenant["name"]
        }
    }

@router.post("/login")
async def tenant_portal_login(data: TenantLogin):
    """Login for tenant portal"""
    account = await db.tenant_accounts.find_one({"email": data.email}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not verify_password(data.password, account["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not account.get("is_active", True):
        raise HTTPException(status_code=403, detail="Uw account is gedeactiveerd")
    
    await db.tenant_accounts.update_one(
        {"id": account["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(account["id"], data.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant": {
            "id": account["id"],
            "tenant_id": account["tenant_id"],
            "email": account["email"],
            "name": account["name"]
        }
    }

@router.get("/me")
async def tenant_portal_me(authorization: str = None):
    """Get current tenant info"""
    if not authorization:
        from fastapi import Header
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    account = await get_current_tenant(authorization)
    
    tenant = await db.tenants.find_one({"id": account["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    apartment = None
    if tenant.get("apartment_id"):
        apartment = await db.apartments.find_one({"id": tenant["apartment_id"]}, {"_id": 0})
    
    return {
        "id": account["id"],
        "tenant_id": account["tenant_id"],
        "email": account["email"],
        "name": account["name"],
        "tenant_info": {
            "phone": tenant.get("phone"),
            "apartment_name": apartment.get("name") if apartment else None,
            "address": apartment.get("address") if apartment else None,
            "rent_amount": tenant.get("rent_amount"),
            "deposit_amount": tenant.get("deposit_amount"),
            "start_date": tenant.get("start_date"),
            "contract_type": tenant.get("contract_type")
        }
    }
