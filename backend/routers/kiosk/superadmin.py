from .base import *

# ============== SUPERADMIN ==============

SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "Bharat7755"
PRO_PLAN_PRICE = 3500.00

class SuperAdminLogin(BaseModel):
    email: str
    password: str

def create_superadmin_token():
    payload = {
        "role": "superadmin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_superadmin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Niet geautoriseerd")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Geen superadmin rechten")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldig token")

@router.post("/superadmin/login")
async def superadmin_login(data: SuperAdminLogin):
    if data.email.lower() != SUPERADMIN_EMAIL or data.password != SUPERADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldig email of wachtwoord")
    token = create_superadmin_token()
    return {"token": token, "role": "superadmin"}

@router.get("/superadmin/stats")
async def superadmin_stats(admin=Depends(get_superadmin)):
    total_companies = await db.kiosk_companies.count_documents({})
    active_companies = await db.kiosk_companies.count_documents({"status": "active"})
    pro_companies = await db.kiosk_companies.count_documents({"subscription": "pro"})
    total_tenants = await db.kiosk_tenants.count_documents({})
    total_apartments = await db.kiosk_apartments.count_documents({})
    total_payments = await db.kiosk_payments.count_documents({})
    
    pipeline = [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    agg = await db.kiosk_payments.aggregate(pipeline).to_list(1)
    total_rent_revenue = agg[0]["total"] if agg else 0
    
    monthly_saas_revenue = pro_companies * PRO_PLAN_PRICE
    
    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "pro_companies": pro_companies,
        "free_companies": total_companies - pro_companies,
        "total_tenants": total_tenants,
        "total_apartments": total_apartments,
        "total_payments": total_payments,
        "total_rent_revenue": total_rent_revenue,
        "monthly_saas_revenue": monthly_saas_revenue,
        "pro_plan_price": PRO_PLAN_PRICE
    }

@router.get("/superadmin/companies")
async def superadmin_companies(admin=Depends(get_superadmin)):
    companies = await db.kiosk_companies.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    result = []
    for c in companies:
        cid = c["company_id"]
        tenant_count = await db.kiosk_tenants.count_documents({"company_id": cid})
        apt_count = await db.kiosk_apartments.count_documents({"company_id": cid})
        payment_count = await db.kiosk_payments.count_documents({"company_id": cid})
        pipeline = [{"$match": {"company_id": cid, "status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
        agg = await db.kiosk_payments.aggregate(pipeline).to_list(1)
        revenue = agg[0]["total"] if agg else 0
        result.append({
            "company_id": cid,
            "name": c.get("name", ""),
            "email": c.get("email", ""),
            "telefoon": c.get("telefoon", ""),
            "status": c.get("status", "active"),
            "subscription_status": c.get("subscription_status", "active"),
            "monthly_price": c.get("monthly_price", 0),
            "subscription_notes": c.get("subscription_notes", ""),
            "tenant_count": tenant_count,
            "apartment_count": apt_count,
            "payment_count": payment_count,
            "revenue": revenue,
            "created_at": c.get("created_at")
        })
    return result

@router.put("/superadmin/companies/{company_id}/status")
async def superadmin_toggle_company(company_id: str, admin=Depends(get_superadmin)):
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    new_status = "inactive" if comp.get("status") == "active" else "active"
    await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"status": new_status, "message": f"Bedrijf {'geactiveerd' if new_status == 'active' else 'gedeactiveerd'}"}

class SuperAdminSubscriptionUpdate(BaseModel):
    subscription_status: str  # active, blocked, expired
    monthly_price: float = 0
    notes: str = ""

class SuperAdminCreateCompany(BaseModel):
    name: str
    email: str
    password: str
    telefoon: str = ""
    adres: str = ""
    subscription_status: str = "active"
    monthly_price: float = 0

@router.put("/superadmin/companies/{company_id}/subscription")
async def superadmin_update_subscription(company_id: str, data: SuperAdminSubscriptionUpdate, admin=Depends(get_superadmin)):
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {
            "subscription_status": data.subscription_status,
            "monthly_price": data.monthly_price,
            "subscription_notes": data.notes,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    return {"message": "Abonnement bijgewerkt", "subscription_status": data.subscription_status}

@router.post("/superadmin/companies")
async def superadmin_create_company(data: SuperAdminCreateCompany, admin=Depends(get_superadmin)):
    existing = await db.kiosk_companies.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    company_id = slugify_company_name(data.name)
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
        "subscription_status": data.subscription_status,
        "monthly_price": data.monthly_price,
        "created_at": now,
        "updated_at": now
    }
    await db.kiosk_companies.insert_one(company)
    return {"company_id": company_id, "name": data.name, "message": "Bedrijf aangemaakt"}

@router.get("/superadmin/payments")
async def superadmin_payments(admin=Depends(get_superadmin)):
    payments = await db.kiosk_payments.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    company_cache = {}
    for p in payments:
        cid = p.get("company_id", "")
        if cid not in company_cache:
            comp = await db.kiosk_companies.find_one({"company_id": cid}, {"_id": 0, "name": 1})
            company_cache[cid] = comp.get("name", "") if comp else ""
        p["company_name"] = company_cache[cid]
    return payments


