from .base import *

# Default SaaS subscription price for new companies (SRD per month)
DEFAULT_MONTHLY_PRICE = 3000.00
TRIAL_DAYS = 14


async def _create_initial_invoice(company_id: str, company_name: str, amount: float, now: datetime):
    """Create the first invoice for a newly registered company (due in TRIAL_DAYS)."""
    try:
        period = now.strftime("%Y-%m")
        invoice_id = generate_uuid()
        due_date = now + timedelta(days=TRIAL_DAYS)
        await db.kiosk_subscription_invoices.insert_one({
            "invoice_id": invoice_id,
            "company_id": company_id,
            "company_name": company_name,
            "period": period,
            "amount": amount,
            "status": "unpaid",
            "due_date": due_date,
            "paid_at": None,
            "payment_proof_url": None,
            "marked_paid_by": None,
            "notes": "Eerste maand - Registratie",
            "created_at": now,
        })
    except Exception:
        pass

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
    trial_ends = now + timedelta(days=TRIAL_DAYS)
    
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
        # SaaS subscription fields
        "subscription_status": "trial",  # trial | active | overdue | lifetime
        "subscription_plan": "pro",
        "monthly_price": DEFAULT_MONTHLY_PRICE,
        "trial_ends_at": trial_ends,
        "lifetime": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_companies.insert_one(company)
    await _create_initial_invoice(company_id, data.name, DEFAULT_MONTHLY_PRICE, now)
    
    token = create_token(company_id)
    
    return {
        "company_id": company_id,
        "name": data.name,
        "email": data.email,
        "token": token,
        "trial_ends_at": trial_ends.isoformat(),
        "monthly_price": DEFAULT_MONTHLY_PRICE,
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
    """Login using 4-digit PIN — accepts both company Kiosk PIN (beheerder) and employee PIN."""
    # First: try company Kiosk PIN (beheerder/owner)
    company = await db.kiosk_companies.find_one({"kiosk_pin": data.pin, "status": "active"})
    if company:
        token = create_token(company["company_id"])
        return {
            "company_id": company["company_id"],
            "name": company["name"],
            "email": company.get("email", ""),
            "role": "beheerder",
            "employee_id": None,
            "employee_name": company["name"],
            "token": token,
        }
    # Second: try employee PIN across all active companies
    emp = await db.kiosk_employees.find_one({"pin": data.pin, "status": "active"})
    if not emp:
        raise HTTPException(status_code=401, detail="Ongeldige PIN code")
    company = await db.kiosk_companies.find_one({"company_id": emp["company_id"], "status": "active"})
    if not company:
        raise HTTPException(status_code=401, detail="Bedrijf niet actief")
    token = create_token(company["company_id"])
    return {
        "company_id": company["company_id"],
        "name": company["name"],
        "email": company.get("email", ""),
        "role": emp.get("role", "kiosk_medewerker"),
        "employee_id": emp.get("employee_id"),
        "employee_name": emp.get("name", ""),
        "token": token,
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
        "rent_billing_mode": company.get("rent_billing_mode", "advance"),
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
        "twilio_sms_number": company.get("twilio_sms_number", ""),
        "twilio_mode": company.get("twilio_mode", "whatsapp"),
        "twilio_enabled": company.get("twilio_enabled", False),
        "start_screen": company.get("start_screen", "kiosk"),
        "custom_domain": company.get("custom_domain", ""),
        "custom_domain_landing": company.get("custom_domain_landing", "kiosk"),
        "smtp_host": company.get("smtp_host", ""),
        "smtp_port": company.get("smtp_port", 587),
        "smtp_email": company.get("smtp_email", ""),
        "smtp_password": company.get("smtp_password", ""),
        "smtp_enabled": company.get("smtp_enabled", False),
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

    # Email change: validate uniqueness and normalize (email is used for login)
    if "email" in update_data and update_data["email"]:
        new_email = str(update_data["email"]).strip().lower()
        update_data["email"] = new_email
        existing_email = await db.kiosk_companies.find_one({
            "email": new_email,
            "company_id": {"$ne": company["company_id"]}
        })
        if existing_email:
            raise HTTPException(status_code=400, detail="Dit e-mailadres is al in gebruik door een ander bedrijf.")
    
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




class TwilioTestPayload(BaseModel):
    phone: str
    message: Optional[str] = None
    mode: Optional[str] = None  # whatsapp | sms | both — overrides company default


@router.post("/auth/twilio/test")
async def test_twilio_send(data: TwilioTestPayload, company: dict = Depends(get_current_company)):
    """Test Twilio integration — stuur een bericht direct en geef de EXACTE fout terug indien mislukt.
    Hierdoor kan de gebruiker zien waarom WhatsApp/SMS niet verstuurd kan worden."""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    if not comp.get("twilio_enabled"):
        raise HTTPException(status_code=400, detail="Twilio is niet ingeschakeld in instellingen.")
    if not comp.get("twilio_account_sid") or not comp.get("twilio_auth_token") or not comp.get("twilio_phone_number"):
        raise HTTPException(status_code=400, detail="Twilio credentials (SID/Token/Nummer) zijn niet volledig ingevuld.")

    phone_clean = data.phone.replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        if phone_clean.startswith("597"):
            phone_clean = "+" + phone_clean
        else:
            phone_clean = "+597" + phone_clean

    message = data.message or f"Dit is een testbericht van {comp.get('name', 'uw bedrijf')} via Twilio."
    mode = (data.mode or comp.get("twilio_mode") or "whatsapp").lower()

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(comp["twilio_account_sid"], comp["twilio_auth_token"])
    except ImportError:
        raise HTTPException(status_code=500, detail="Twilio Python package niet geïnstalleerd op server. Run: pip install twilio")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kon geen Twilio client maken: {str(e)[:300]}")

    raw_from = comp["twilio_phone_number"].strip()
    sms_from = (comp.get("twilio_sms_number") or raw_from).strip()
    wa_from = raw_from if raw_from.startswith("whatsapp:") else f"whatsapp:{raw_from}"

    results = []
    channels = []
    if mode in ("whatsapp", "both"):
        channels.append(("whatsapp", wa_from, f"whatsapp:{phone_clean}"))
    if mode in ("sms", "both"):
        channels.append(("sms", sms_from, phone_clean))

    for ch, from_addr, to_addr in channels:
        try:
            msg = client.messages.create(body=message, from_=from_addr, to=to_addr)
            results.append({"channel": ch, "status": "sent", "sid": msg.sid, "from": from_addr, "to": to_addr})
        except Exception as e:
            err_str = str(e)
            # Twilio errors have codes like 21608 (unverified sandbox number), 63016 (not approved template), etc.
            import re
            code_match = re.search(r"Error code:?\s*(\d+)|HTTP\s*(\d+)", err_str)
            code = code_match.group(1) or code_match.group(2) if code_match else None
            hint = ""
            if "401" in err_str or "20003" in err_str or "authenticate" in err_str.lower():
                hint = "Authenticatie mislukt. Controleer Account SID en Auth Token in Twilio Console → Dashboard (tokens kunnen roteren)."
            elif "21608" in err_str or "21614" in err_str:
                hint = "WhatsApp sandbox: ontvanger moet eerst 'join <code>' sturen naar uw sandbox nummer. Zie Twilio Console > WhatsApp Sandbox."
            elif "63016" in err_str or "63007" in err_str:
                hint = "WhatsApp production vereist goedgekeurde message template. Gebruik een goedgekeurde template of stuur binnen 24u na laatste klantreactie."
            elif "21659" in err_str or "21660" in err_str:
                hint = "Verzendnummer is geen geldig Twilio nummer. Zorg dat u een WhatsApp-enabled nummer gebruikt (bv. whatsapp:+14155238886 voor sandbox)."
            elif "21211" in err_str:
                hint = "Ongeldig ontvanger-nummer. Moet formaat +[landcode][nummer] hebben (bv. +597XXXXXXX)."
            elif "21614" in err_str:
                hint = "Nummer niet geverifieerd. Bij trial accounts moet het ontvanger-nummer eerst geverifieerd zijn in Twilio Console."
            results.append({
                "channel": ch, "status": "failed",
                "from": from_addr, "to": to_addr,
                "error": err_str[:500],
                "error_code": code,
                "hint": hint,
            })

    # Log test results in wa_messages for traceability
    for r in results:
        await db.kiosk_wa_messages.insert_one({
            "message_id": generate_uuid(),
            "company_id": company["company_id"],
            "tenant_id": "",
            "tenant_name": "(Twilio test)",
            "phone": phone_clean,
            "message_type": "test",
            "channel": f"twilio_{r['channel']}",
            "message": message,
            "status": r["status"],
            "error": r.get("error", ""),
            "created_at": datetime.now(timezone.utc),
        })

    any_sent = any(r["status"] == "sent" for r in results)
    return {
        "success": any_sent,
        "results": results,
        "phone_used": phone_clean,
        "mode": mode,
    }


@router.get("/auth/twilio/recent-errors")
async def list_twilio_errors(company: dict = Depends(get_current_company), limit: int = 20):
    """Lijst recente verzend-pogingen (sent + failed) met foutmeldingen voor debugging."""
    cursor = db.kiosk_wa_messages.find(
        {"company_id": company["company_id"], "channel": {"$in": ["twilio_whatsapp", "twilio_sms"]}},
        {"_id": 0, "message_id": 1, "phone": 1, "tenant_name": 1, "channel": 1,
         "message_type": 1, "status": 1, "error": 1, "created_at": 1}
    ).sort("created_at", -1).limit(min(limit, 100))
    return await cursor.to_list(length=limit)
