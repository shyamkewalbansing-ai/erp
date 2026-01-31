# Payment Methods Router
# Handles payment method configuration for all modules

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/payment-methods", tags=["Payment Methods"])

# Import shared dependencies
from .deps import get_db, get_current_user, workspace_filter

# ==================== PYDANTIC MODELS ====================

class BankAccountSettings(BaseModel):
    """Bank account settings for bank transfers"""
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    swift_bic: Optional[str] = None
    description: Optional[str] = None

class MopeSettings(BaseModel):
    """Mope payment gateway settings"""
    is_enabled: bool = False
    test_token: Optional[str] = None
    live_token: Optional[str] = None
    use_live_mode: bool = False
    merchant_id: Optional[str] = None

class PaymentMethodConfig(BaseModel):
    """Configuration for a specific payment method"""
    method_id: str  # 'bank_transfer', 'mope', 'cash', 'cheque'
    name: str
    is_enabled: bool = True
    is_default: bool = False
    description: Optional[str] = None
    instructions: Optional[str] = None
    # For bank transfer
    bank_settings: Optional[BankAccountSettings] = None
    # For Mope
    mope_settings: Optional[MopeSettings] = None

class WorkspacePaymentSettings(BaseModel):
    """Payment settings for a workspace"""
    workspace_id: Optional[str] = None
    payment_methods: List[PaymentMethodConfig] = []
    default_method: Optional[str] = "bank_transfer"
    invoice_footer: Optional[str] = None
    receipt_footer: Optional[str] = None

# Default payment methods
DEFAULT_PAYMENT_METHODS = [
    {
        "method_id": "bank_transfer",
        "name": "Bankoverschrijving",
        "is_enabled": True,
        "is_default": True,
        "description": "Betalen via bankoverschrijving",
        "instructions": "Maak het bedrag over naar onderstaande bankrekening met vermelding van het factuurnummer.",
        "bank_settings": {
            "bank_name": "",
            "account_holder": "",
            "account_number": "",
            "description": "Vermeld het factuurnummer bij de overschrijving"
        }
    },
    {
        "method_id": "mope",
        "name": "Mope",
        "is_enabled": False,
        "is_default": False,
        "description": "Online betalen via Mope",
        "instructions": "Klik op de betaalknop om via Mope te betalen.",
        "mope_settings": {
            "is_enabled": False,
            "test_token": None,
            "live_token": None,
            "use_live_mode": False
        }
    },
    {
        "method_id": "cash",
        "name": "Contant",
        "is_enabled": True,
        "is_default": False,
        "description": "Contante betaling",
        "instructions": "Betaal contant bij het kantoor."
    },
    {
        "method_id": "cheque",
        "name": "Cheque",
        "is_enabled": False,
        "is_default": False,
        "description": "Betalen per cheque",
        "instructions": "Schrijf de cheque uit op naam van het bedrijf."
    }
]


# ==================== HELPER FUNCTIONS ====================

async def get_or_create_payment_settings(workspace_id: str):
    """Get payment settings for a workspace, create defaults if not exist"""
    db = await get_db()
    
    settings = await db.workspace_payment_settings.find_one(
        {"workspace_id": workspace_id}
    )
    
    if not settings:
        # Create default settings
        default_settings = {
            "workspace_id": workspace_id,
            "payment_methods": DEFAULT_PAYMENT_METHODS,
            "default_method": "bank_transfer",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.workspace_payment_settings.insert_one(default_settings)
        settings = default_settings
    
    if "_id" in settings:
        settings["id"] = str(settings.pop("_id"))
    
    return settings


# ==================== ENDPOINTS ====================

@router.get("/settings")
async def get_payment_settings(current_user: dict = Depends(get_current_user)):
    """Get payment settings for current workspace or global settings for superadmin"""
    workspace_id = current_user.get("workspace_id")
    
    # For superadmin without workspace, use "global" as workspace_id
    if not workspace_id:
        if current_user.get("role") == "superadmin" or current_user.get("is_admin"):
            workspace_id = "global"
        else:
            raise HTTPException(status_code=400, detail="Geen workspace gevonden")
    
    settings = await get_or_create_payment_settings(workspace_id)
    return settings


@router.put("/settings")
async def update_payment_settings(
    settings: WorkspacePaymentSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update payment settings for current workspace"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    # For superadmin without workspace, use "global" as workspace_id
    if not workspace_id:
        if current_user.get("role") == "superadmin" or current_user.get("is_admin"):
            workspace_id = "global"
        else:
            raise HTTPException(status_code=400, detail="Geen workspace gevonden")
    
    settings_dict = settings.model_dump()
    settings_dict["workspace_id"] = workspace_id
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_dict["updated_by"] = str(current_user["_id"])
    
    await db.workspace_payment_settings.update_one(
        {"workspace_id": workspace_id},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Betaalinstellingen bijgewerkt"}


@router.get("/methods")
async def get_payment_methods(current_user: dict = Depends(get_current_user)):
    """Get available payment methods for current workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Geen workspace gevonden")
    
    settings = await get_or_create_payment_settings(workspace_id)
    
    # Return only enabled methods
    enabled_methods = [
        m for m in settings.get("payment_methods", [])
        if m.get("is_enabled", False)
    ]
    
    return enabled_methods


@router.put("/methods/{method_id}")
async def update_payment_method(
    method_id: str,
    method_config: PaymentMethodConfig,
    current_user: dict = Depends(get_current_user)
):
    """Update a specific payment method"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Geen workspace gevonden")
    
    settings = await get_or_create_payment_settings(workspace_id)
    methods = settings.get("payment_methods", [])
    
    # Find and update the method
    method_found = False
    for i, m in enumerate(methods):
        if m.get("method_id") == method_id:
            methods[i] = method_config.model_dump()
            method_found = True
            break
    
    if not method_found:
        # Add new method
        methods.append(method_config.model_dump())
    
    # If this method is set as default, unset others
    if method_config.is_default:
        for m in methods:
            if m.get("method_id") != method_id:
                m["is_default"] = False
    
    await db.workspace_payment_settings.update_one(
        {"workspace_id": workspace_id},
        {"$set": {
            "payment_methods": methods,
            "default_method": method_id if method_config.is_default else settings.get("default_method"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Betaalmethode {method_config.name} bijgewerkt"}


@router.put("/methods/{method_id}/toggle")
async def toggle_payment_method(
    method_id: str,
    enabled: bool,
    current_user: dict = Depends(get_current_user)
):
    """Enable or disable a payment method"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Geen workspace gevonden")
    
    settings = await get_or_create_payment_settings(workspace_id)
    methods = settings.get("payment_methods", [])
    
    for m in methods:
        if m.get("method_id") == method_id:
            m["is_enabled"] = enabled
            break
    
    await db.workspace_payment_settings.update_one(
        {"workspace_id": workspace_id},
        {"$set": {
            "payment_methods": methods,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Betaalmethode {'geactiveerd' if enabled else 'gedeactiveerd'}"}


@router.get("/bank-accounts")
async def get_bank_accounts(current_user: dict = Depends(get_current_user)):
    """Get configured bank accounts"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    accounts = await db.workspace_bank_accounts.find(
        {"workspace_id": workspace_id}
    ).to_list(20)
    
    for acc in accounts:
        acc["id"] = str(acc.pop("_id"))
    
    return accounts


@router.post("/bank-accounts")
async def add_bank_account(
    account: BankAccountSettings,
    current_user: dict = Depends(get_current_user)
):
    """Add a bank account"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    account_dict = account.model_dump()
    account_dict["workspace_id"] = workspace_id
    account_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.workspace_bank_accounts.insert_one(account_dict)
    
    return {"id": str(result.inserted_id), "message": "Bankrekening toegevoegd"}


@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a bank account"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    result = await db.workspace_bank_accounts.delete_one({
        "_id": ObjectId(account_id),
        "workspace_id": workspace_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    return {"message": "Bankrekening verwijderd"}


# ==================== MOPE SPECIFIC ENDPOINTS ====================

@router.get("/mope/settings")
async def get_mope_settings(current_user: dict = Depends(get_current_user)):
    """Get Mope settings for current workspace"""
    settings = await get_or_create_payment_settings(current_user.get("workspace_id"))
    
    for method in settings.get("payment_methods", []):
        if method.get("method_id") == "mope":
            return method.get("mope_settings", {})
    
    return {"is_enabled": False}


@router.put("/mope/settings")
async def update_mope_settings(
    mope_settings: MopeSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update Mope settings for current workspace"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    settings = await get_or_create_payment_settings(workspace_id)
    methods = settings.get("payment_methods", [])
    
    # Find and update Mope method
    for m in methods:
        if m.get("method_id") == "mope":
            m["mope_settings"] = mope_settings.model_dump()
            m["is_enabled"] = mope_settings.is_enabled
            break
    
    await db.workspace_payment_settings.update_one(
        {"workspace_id": workspace_id},
        {"$set": {
            "payment_methods": methods,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Mope instellingen bijgewerkt"}


# ==================== PUBLIC PAYMENT ENDPOINTS ====================

@router.get("/public/{workspace_id}/methods")
async def get_public_payment_methods(workspace_id: str):
    """Get enabled payment methods for a workspace (public, no auth)"""
    db = await get_db()
    
    # First try to find by workspace_id
    settings = await db.workspace_payment_settings.find_one(
        {"workspace_id": workspace_id}
    )
    
    if not settings:
        # Return default methods (bank transfer only)
        return [{
            "method_id": "bank_transfer",
            "name": "Bankoverschrijving",
            "description": "Betalen via bankoverschrijving"
        }]
    
    # Return only enabled methods with limited info (no tokens)
    enabled_methods = []
    for m in settings.get("payment_methods", []):
        if m.get("is_enabled", False):
            safe_method = {
                "method_id": m.get("method_id"),
                "name": m.get("name"),
                "description": m.get("description"),
                "instructions": m.get("instructions"),
                "is_default": m.get("is_default", False)
            }
            # Add bank info if bank transfer
            if m.get("method_id") == "bank_transfer" and m.get("bank_settings"):
                safe_method["bank_settings"] = {
                    "bank_name": m["bank_settings"].get("bank_name"),
                    "account_holder": m["bank_settings"].get("account_holder"),
                    "account_number": m["bank_settings"].get("account_number"),
                    "iban": m["bank_settings"].get("iban"),
                    "description": m["bank_settings"].get("description")
                }
            enabled_methods.append(safe_method)
    
    return enabled_methods


# ==================== INVOICE/RECEIPT PAYMENT ====================

@router.post("/invoices/{invoice_id}/pay")
async def create_invoice_payment(
    invoice_id: str,
    payment_method: str,
    redirect_url: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Create a payment for an invoice"""
    db = await get_db()
    workspace_id = current_user.get("workspace_id")
    
    # Get invoice
    invoice = await db.invoices.find_one({
        "_id": ObjectId(invoice_id),
        **workspace_filter(current_user)
    })
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if invoice.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Deze factuur is al betaald")
    
    # Get payment settings
    settings = await get_or_create_payment_settings(workspace_id)
    
    # Find the payment method
    method_config = None
    for m in settings.get("payment_methods", []):
        if m.get("method_id") == payment_method and m.get("is_enabled"):
            method_config = m
            break
    
    if not method_config:
        raise HTTPException(status_code=400, detail="Betaalmethode niet beschikbaar")
    
    if payment_method == "mope":
        # Process Mope payment
        mope_settings = method_config.get("mope_settings", {})
        if not mope_settings.get("is_enabled"):
            raise HTTPException(status_code=400, detail="Mope is niet geconfigureerd")
        
        import httpx
        
        token = mope_settings.get("live_token") if mope_settings.get("use_live_mode") else mope_settings.get("test_token")
        if not token:
            raise HTTPException(status_code=400, detail="Mope token niet geconfigureerd")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.mope.sr/api/shop/payment_request",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "amount": invoice.get("total_amount", 0),
                        "description": f"Factuur {invoice.get('invoice_number', invoice_id[:8])}",
                        "redirect_url": redirect_url or "/"
                    },
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    mope_data = response.json()
                    
                    # Update invoice with payment info
                    await db.invoices.update_one(
                        {"_id": ObjectId(invoice_id)},
                        {"$set": {
                            "payment_method": "mope",
                            "payment_id": mope_data.get("id"),
                            "payment_url": mope_data.get("payment_url") or mope_data.get("url"),
                            "payment_status": "pending"
                        }}
                    )
                    
                    return {
                        "payment_url": mope_data.get("payment_url") or mope_data.get("url"),
                        "payment_id": mope_data.get("id")
                    }
                else:
                    raise HTTPException(status_code=500, detail="Fout bij Mope betaling")
                    
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Verbindingsfout met Mope: {str(e)}")
    
    elif payment_method == "bank_transfer":
        # Return bank transfer instructions
        bank_settings = method_config.get("bank_settings", {})
        
        await db.invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {
                "payment_method": "bank_transfer",
                "payment_status": "awaiting_transfer"
            }}
        )
        
        return {
            "payment_method": "bank_transfer",
            "instructions": method_config.get("instructions"),
            "bank_info": bank_settings
        }
    
    else:
        # Other payment methods
        await db.invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {
                "payment_method": payment_method,
                "payment_status": "pending"
            }}
        )
        
        return {
            "payment_method": payment_method,
            "instructions": method_config.get("instructions")
        }


@router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    invoice_id: str,
    payment_method: Optional[str] = "bank_transfer",
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Manually mark an invoice as paid"""
    db = await get_db()
    
    result = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id), **workspace_filter(current_user)},
        {"$set": {
            "status": "paid",
            "payment_method": payment_method,
            "payment_status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "paid_by": str(current_user["_id"]),
            "payment_notes": notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    return {"message": "Factuur gemarkeerd als betaald"}
