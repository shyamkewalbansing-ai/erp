from .base import *

# ============== AUTH ENDPOINTS ==============

@router.post("/auth/register")
async def register_company(data: CompanyRegister):
    """Register a new company for the kiosk system"""
    # Check if email exists
    existing = await db.kiosk_companies.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    company_id = slugify_company_name(data.name)
    # Check if company_id already exists
    existing_id = await db.kiosk_companies.find_one({"company_id": company_id})
    if existing_id:
        raise HTTPException(status_code=400, detail=f"Bedrijfsnaam '{data.name}' is al in gebruik")
    now = datetime.now(timezone.utc)
    
    company = {
        "company_id": company_id,
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "telefoon": data.telefoon,
        "adres": data.adres,
        "billing_day": 1,
        "fine_amount": 0,
        "power_cutoff_days": 0,
        "stamp_company_name": data.name,
        "stamp_address": data.adres or "",
        "stamp_phone": data.telefoon or "",
        "stamp_whatsapp": "",
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_companies.insert_one(company)
    
    token = create_token(company_id)
    
    return {
        "company_id": company_id,
        "name": data.name,
        "email": data.email,
        "token": token
    }

@router.post("/auth/login")
async def login_company(data: CompanyLogin):
    """Login to company account"""
    company = await db.kiosk_companies.find_one({"email": data.email.lower()})
    if not company:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not verify_password(data.password, company["password_hash"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if company.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is niet actief")
    
    token = create_token(company["company_id"])
    
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company["email"],
        "token": token
    }

@router.post("/auth/pin")
async def login_with_pin(data: KioskPinVerify):
    """Login to company account using 4-digit PIN code"""
    company = await db.kiosk_companies.find_one({"kiosk_pin": data.pin, "status": "active"})
    if not company:
        raise HTTPException(status_code=401, detail="Ongeldige PIN code")
    
    token = create_token(company["company_id"])
    
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company.get("email", ""),
        "token": token
    }

@router.get("/auth/me")
async def get_current_company_info(company: dict = Depends(get_current_company)):
    """Get current logged in company info"""
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company["email"],
        "telefoon": company.get("telefoon"),
        "adres": company.get("adres"),
        "billing_day": company.get("billing_day", 1),
        "billing_next_month": company.get("billing_next_month", True),
        "fine_amount": company.get("fine_amount", 0),
        "power_cutoff_days": company.get("power_cutoff_days", 0),
        "stamp_company_name": company.get("stamp_company_name", ""),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", ""),
        "kiosk_pin": company.get("kiosk_pin", ""),
        "status": company.get("status"),
        "bank_name": company.get("bank_name", ""),
        "bank_account_name": company.get("bank_account_name", ""),
        "bank_account_number": company.get("bank_account_number", ""),
        "bank_description": company.get("bank_description", ""),
        "wa_api_url": company.get("wa_api_url", "https://graph.facebook.com/v21.0"),
        "wa_api_token": company.get("wa_api_token", ""),
        "wa_phone_id": company.get("wa_phone_id", ""),
        "wa_enabled": company.get("wa_enabled", False),
        "sumup_api_key": company.get("sumup_api_key", ""),
        "sumup_merchant_code": company.get("sumup_merchant_code", ""),
        "sumup_enabled": company.get("sumup_enabled", False),
        "sumup_currency": company.get("sumup_currency", "EUR"),
        "sumup_exchange_rate": company.get("sumup_exchange_rate", 1.0),
        "mope_api_key": company.get("mope_api_key", ""),
        "mope_enabled": company.get("mope_enabled", False),
        "uni5pay_merchant_id": company.get("uni5pay_merchant_id", ""),
        "uni5pay_enabled": company.get("uni5pay_enabled", False),
        "twilio_account_sid": company.get("twilio_account_sid", ""),
        "twilio_auth_token": company.get("twilio_auth_token", ""),
        "twilio_phone_number": company.get("twilio_phone_number", ""),
        "twilio_enabled": company.get("twilio_enabled", False),
        "start_screen": company.get("start_screen", "kiosk"),
        "custom_domain": company.get("custom_domain", ""),
        "custom_domain_landing": company.get("custom_domain_landing", "kiosk")
    }

@router.put("/auth/settings")
async def update_company_settings(data: CompanyUpdate, company: dict = Depends(get_current_company)):
    """Update company settings"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Normalize custom domain
    if "custom_domain" in update_data:
        cd = update_data["custom_domain"].strip().lower()
        cd = cd.replace("https://", "").replace("http://", "").rstrip("/")
        update_data["custom_domain"] = cd
    
    # Check for unique PIN if PIN is being set/changed
    if "kiosk_pin" in update_data and update_data["kiosk_pin"]:
        existing = await db.kiosk_companies.find_one({
            "kiosk_pin": update_data["kiosk_pin"],
            "company_id": {"$ne": company["company_id"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Deze PIN code is al in gebruik door een ander bedrijf. Kies een andere PIN.")
    
    old_company_id = company["company_id"]
    new_company_id = None
    new_token = None
    
    # If name changed, regenerate slug and cascade company_id update
    if "name" in update_data and update_data["name"].strip():
        new_slug = slugify_company_name(update_data["name"])
        if new_slug != old_company_id:
            # Check uniqueness
            existing_slug = await db.kiosk_companies.find_one({"company_id": new_slug})
            if existing_slug:
                raise HTTPException(status_code=400, detail=f"De URL '{new_slug}' is al in gebruik. Kies een andere bedrijfsnaam.")
            
            new_company_id = new_slug
            update_data["company_id"] = new_company_id
            
            # Cascade update company_id in all related collections
            collections = [
                db.kiosk_tenants, db.kiosk_apartments, db.kiosk_payments,
                db.kiosk_leases, db.kiosk_kas, db.kiosk_employees,
                db.kiosk_loans, db.kiosk_loan_payments, db.kiosk_internet_plans,
                db.kiosk_rekeninghouders, db.kiosk_messages, db.kiosk_wa_messages,
                db.kiosk_shelly_devices, db.kiosk_tenda_routers,
            ]
            await asyncio.gather(*[
                col.update_many(
                    {"company_id": old_company_id},
                    {"$set": {"company_id": new_company_id}}
                ) for col in collections
            ])
            
            new_token = create_token(new_company_id)
            
            # Invalidate caches for old company_id
            _cache_invalidate(f"pub_company_{old_company_id}")
            _cache_invalidate(f"pub_apt_{old_company_id}")
            _cache_invalidate(f"pub_ten_{old_company_id}")
    
    await db.kiosk_companies.update_one(
        {"company_id": old_company_id},
        {"$set": update_data}
    )
    
    result = {"message": "Instellingen bijgewerkt"}
    if new_company_id:
        result["company_id"] = new_company_id
        result["token"] = new_token
    return result

