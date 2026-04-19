from .base import *

class EmployeePinLogin(BaseModel):
    pin: str

@router.post("/public/{company_id}/employee/login")
async def employee_pin_login(company_id: str, data: EmployeePinLogin):
    """Employee login via PIN on kiosk"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    employee = await db.kiosk_employees.find_one({
        "company_id": company_id, "pin": data.pin, "status": "active"
    })
    if not employee:
        raise HTTPException(status_code=401, detail="Ongeldige PIN")
    
    return {
        "employee_id": employee["employee_id"],
        "name": employee["name"],
        "role": employee.get("role", "kiosk_medewerker"),
        "functie": employee.get("functie", ""),
    }



@router.get("/public/{company_id}/company")
async def get_company_public(company_id: str):
    """Get company info for kiosk display (public) — cached"""
    cache_key = f"pub_company_{company_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    sub_status = company.get("subscription_status", "active")
    if sub_status in ("blocked", "expired"):
        result = {
            "name": company["name"],
            "company_id": company["company_id"],
            "has_pin": bool(company.get("kiosk_pin")),
            "subscription_blocked": True,
            "subscription_message": "Uw abonnement is verlopen. Neem contact op met de beheerder."
        }
    else:
        result = {
            "name": company["name"],
            "company_id": company["company_id"],
            "has_pin": bool(company.get("kiosk_pin")),
            "subscription_blocked": False,
            "start_screen": company.get("start_screen", "kiosk")
        }
    
    _cache_set(cache_key, result, 60)
    return result

@router.post("/public/{company_id}/verify-pin")
async def verify_kiosk_pin(company_id: str, data: KioskPinVerify):
    """Verify 4-digit PIN for kiosk access"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    stored_pin = company.get("kiosk_pin")
    if not stored_pin:
        # No PIN set, allow access
        return {"valid": True, "message": "Geen PIN ingesteld"}
    
    if data.pin != stored_pin:
        raise HTTPException(status_code=401, detail="Ongeldige PIN")
    
    # Generate a temporary token for admin access
    token = jwt.encode(
        {"company_id": company_id, "exp": datetime.now(timezone.utc) + timedelta(hours=8), "iat": datetime.now(timezone.utc)},
        JWT_SECRET, algorithm="HS256"
    )
    
    return {"valid": True, "message": "PIN correct", "token": token}


@router.post("/public/{company_id}/set-pin")
async def set_initial_pin(company_id: str, data: KioskPinVerify):
    """Set PIN for the first time (only works if no PIN is set yet)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    if company.get("kiosk_pin"):
        raise HTTPException(status_code=400, detail="PIN is al ingesteld. Gebruik Instellingen om te wijzigen.")
    if not data.pin or len(data.pin) != 4 or not data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN moet 4 cijfers zijn")
    await db.kiosk_companies.update_one({"company_id": company_id}, {"$set": {"kiosk_pin": data.pin}})
    token = jwt.encode(
        {"company_id": company_id, "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        JWT_SECRET, algorithm="HS256"
    )
    return {"success": True, "message": "PIN code ingesteld!", "token": token}

@router.get("/public/{company_id}/company/stamp")
async def get_company_stamp(company_id: str):
    """Get company stamp info for receipts (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    return {
        "stamp_company_name": company.get("stamp_company_name", company["name"]),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", "")
    }

@router.get("/public/{company_id}/apartments")
async def get_apartments_public(company_id: str):
    """Get all apartments for a company (public for kiosk)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    sub_status = company.get("subscription_status", "active")
    if sub_status in ("blocked", "expired"):
        raise HTTPException(status_code=403, detail="Abonnement verlopen")
    
    apartments = await db.kiosk_apartments.find({"company_id": company_id}).to_list(1000)
    return [{
        "apartment_id": apt["apartment_id"],
        "number": apt["number"],
        "description": apt.get("description", ""),
        "status": apt.get("status", "available"),
        "location_id": apt.get("location_id"),
        "location_name": apt.get("location_name")
    } for apt in apartments]

@router.get("/public/{company_id}/locations")
async def get_locations_public(company_id: str):
    """Get all locations for a company (public for kiosk)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    locations = await db.kiosk_locations.find(
        {"company_id": company_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return locations

@router.get("/public/{company_id}/tenants")
async def get_tenants_public(company_id: str):
    """Get all active tenants for kiosk display (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    tenants = await db.kiosk_tenants.find({
        "company_id": company_id,
        "status": "active"
    }).to_list(1000)
    
    result = []
    for t in tenants:
        monthly_rent = t.get("monthly_rent", 0)
        outstanding = t.get("outstanding_rent", 0)
        billed_through = t.get("rent_billed_through", "")
        
        # Calculate overdue months (exclude billed_through = current billing period)
        overdue_months = []
        if billed_through and monthly_rent > 0 and outstanding > 0:
            bt_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
            months_owed = int(outstanding / monthly_rent) if monthly_rent > 0 else 0
            remainder = outstanding - (months_owed * monthly_rent)
            if remainder > 0:
                months_owed += 1
            month_names_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            for i in range(months_owed):
                m_date = bt_date - relativedelta(months=i + 1)
                m_name = month_names_nl[m_date.month - 1]
                overdue_months.append(f"{m_name} {m_date.year}")
            overdue_months.reverse()
        
        result.append({
            "tenant_id": t["tenant_id"],
            "name": t["name"],
            "apartment_id": t["apartment_id"],
            "apartment_number": t.get("apartment_number", ""),
            "tenant_code": t.get("tenant_code", ""),
            "monthly_rent": monthly_rent,
            "outstanding_rent": outstanding,
            "service_costs": t.get("service_costs", 0),
            "fines": t.get("fines", 0),
            "deposit_required": t.get("deposit_required", 0),
            "deposit_paid": t.get("deposit_paid", 0),
            "rent_billed_through": billed_through,
            "overdue_months": overdue_months,
            "status": t["status"],
            "internet_cost": t.get("internet_cost", 0),
            "internet_outstanding": t.get("internet_outstanding", 0),
            "internet_plan_name": t.get("internet_plan_name", ""),
        })
    
    return result

@router.get("/public/{company_id}/tenants/lookup/{code}")
async def lookup_tenant_by_code(company_id: str, code: str):
    """Lookup tenant by code or apartment number (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    # Try to find by tenant code
    tenant = await db.kiosk_tenants.find_one({
        "company_id": company_id,
        "tenant_code": code.upper(),
        "status": "active"
    })
    
    # If not found, try by apartment number
    if not tenant:
        apt = await db.kiosk_apartments.find_one({
            "company_id": company_id,
            "number": code.upper()
        })
        if apt:
            tenant = await db.kiosk_tenants.find_one({
                "company_id": company_id,
                "apartment_id": apt["apartment_id"],
                "status": "active"
            })
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    return {
        "tenant_id": tenant["tenant_id"],
        "name": tenant["name"],
        "apartment_id": tenant["apartment_id"],
        "apartment_number": tenant.get("apartment_number", ""),
        "tenant_code": tenant.get("tenant_code", ""),
        "monthly_rent": tenant.get("monthly_rent", 0),
        "outstanding_rent": tenant.get("outstanding_rent", 0),
        "service_costs": tenant.get("service_costs", 0),
        "fines": tenant.get("fines", 0),
        "deposit_required": tenant.get("deposit_required", 0),
        "deposit_paid": tenant.get("deposit_paid", 0),
        "status": tenant["status"],
        "internet_cost": tenant.get("internet_cost", 0),
        "internet_outstanding": tenant.get("internet_outstanding", 0),
        "internet_plan_name": tenant.get("internet_plan_name", ""),
    }


@router.get("/public/{company_id}/tenant/{tenant_id}/payments")
async def get_tenant_payment_history(company_id: str, tenant_id: str, limit: int = 10):
    """Get last N approved payments for a tenant (public kiosk endpoint)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    payments = await db.kiosk_payments.find(
        {"company_id": company_id, "tenant_id": tenant_id, "status": {"$in": ["approved", None]}},
        {"_id": 0, "payment_id": 1, "amount": 1, "payment_type": 1, "payment_method": 1, "kwitantie_nummer": 1, "created_at": 1, "covered_months": 1, "status": 1, "processed_by": 1, "approved_by": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    for p in payments:
        if hasattr(p.get("created_at"), "isoformat"):
            p["created_at"] = p["created_at"].isoformat()
        if not p.get("status"):
            p["status"] = "approved"
    return payments


@router.post("/public/{company_id}/payments")
async def create_payment_public(company_id: str, data: PaymentCreate):
    """Create a payment from kiosk (public)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    tenant = await db.kiosk_tenants.find_one({
        "company_id": company_id,
        "tenant_id": data.tenant_id
    })
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    payment_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    # Generate kwitantie nummer
    count = await db.kiosk_payments.count_documents({"company_id": company_id})
    kwitantie_nummer = f"KW{now.year}-{str(count + 1).zfill(5)}"
    
    # Auto-calculate covered months for rent payments
    covered_months = []
    if data.payment_type in ["rent", "partial_rent", "monthly_rent"]:
        monthly_rent = tenant.get("monthly_rent", 0)
        outstanding = tenant.get("outstanding_rent", 0)
        billed_through = tenant.get("rent_billed_through", "")
        if billed_through and monthly_rent > 0 and outstanding > 0:
            bt_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
            months_owed = int(outstanding / monthly_rent) if monthly_rent > 0 else 0
            remainder = outstanding - (months_owed * monthly_rent)
            if remainder > 0:
                months_owed += 1
            month_names_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            # Build overdue months list (oldest first)
            all_overdue = []
            for i in range(months_owed):
                m_date = bt_date - relativedelta(months=i+1)
                m_label = f"{month_names_nl[m_date.month - 1]} {m_date.year}"
                m_key = m_date.strftime("%Y-%m")
                all_overdue.append({"label": m_label, "key": m_key})
            all_overdue.reverse()
            # Determine how many months this payment covers
            pay_amount = data.amount
            for m in all_overdue:
                if pay_amount >= monthly_rent:
                    covered_months.append(m["label"])
                    pay_amount -= monthly_rent
                elif pay_amount > 0:
                    covered_months.append(m["label"] + " (gedeeltelijk)")
                    pay_amount = 0

    payment = {
        "payment_id": payment_id,
        "company_id": company_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "tenant_code": tenant.get("tenant_code", ""),
        "apartment_number": tenant.get("apartment_number", ""),
        "amount": data.amount,
        "payment_type": data.payment_type,
        "payment_method": data.payment_method,
        "description": data.description,
        "rent_month": data.rent_month,
        "covered_months": covered_months,
        "kwitantie_nummer": kwitantie_nummer,
        "status": "pending",
        "processed_by": (data.processed_by or "").strip() or tenant["name"],
        "processed_by_role": data.processed_by_role or "",
        "created_at": now
    }

    # Auto-approve if processed by a Beheerder via Kiosk
    auto_approved = (data.processed_by_role == "beheerder")
    if auto_approved:
        update_fields = {}
        if data.payment_type in ["rent", "partial_rent"]:
            update_fields["outstanding_rent"] = max(0, tenant.get("outstanding_rent", 0) - data.amount)
        elif data.payment_type == "service_costs":
            update_fields["service_costs"] = max(0, tenant.get("service_costs", 0) - data.amount)
        elif data.payment_type == "fines":
            update_fields["fines"] = max(0, tenant.get("fines", 0) - data.amount)
        elif data.payment_type == "internet":
            update_fields["internet_outstanding"] = max(0, tenant.get("internet_outstanding", 0) - data.amount)
        elif data.payment_type == "deposit":
            update_fields["deposit_paid"] = tenant.get("deposit_paid", 0) + data.amount
        if update_fields:
            update_fields["updated_at"] = now
            await db.kiosk_tenants.update_one({"tenant_id": data.tenant_id}, {"$set": update_fields})

        updated_tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id})
        payment["status"] = "approved"
        payment["approved_at"] = now
        payment["approved_by"] = data.processed_by or ""
        payment["remaining_rent"] = updated_tenant.get("outstanding_rent", 0) if updated_tenant else 0
        payment["remaining_service"] = updated_tenant.get("service_costs", 0) if updated_tenant else 0
        payment["remaining_fines"] = updated_tenant.get("fines", 0) if updated_tenant else 0
        payment["remaining_internet"] = updated_tenant.get("internet_outstanding", 0) if updated_tenant else 0

    await db.kiosk_payments.insert_one(payment)

    # Send Web Push to all staff devices
    try:
        from .push import send_push_to_company
        type_labels_push = {"rent": "Huur", "partial_rent": "Huur (deel)", "service_costs": "Servicekosten", "fines": "Boete", "deposit": "Borg", "internet": "Internet"}
        type_lbl = type_labels_push.get(data.payment_type, data.payment_type)
        if auto_approved:
            push_title = "Nieuwe Kiosk betaling"
            push_body = f"{tenant['name']} • SRD {data.amount:,.2f} ({type_lbl}) • {kwitantie_nummer}"
            push_tag = f"payment-{payment_id}"
            extra = {"payment_id": payment_id}
        else:
            push_title = "Kwitantie wacht op goedkeuring"
            push_body = f"{tenant['name']} • SRD {data.amount:,.2f} ({type_lbl}) • {kwitantie_nummer}"
            push_tag = f"approval-{payment_id}"
            extra = {"payment_id": payment_id, "actions_hint": "approve"}
        asyncio.create_task(send_push_to_company(company_id, push_title, push_body, url="/vastgoed", tag=push_tag, extra_data=extra))
    except Exception:
        pass

    # Send WhatsApp only if auto-approved
    if auto_approved:
        try:
            tenant_phone = tenant.get("phone") or tenant.get("telefoon", "")
            if tenant_phone:
                comp_name = company.get("stamp_company_name") or company.get("name", "")
                type_labels = {"rent": "Huurbetaling", "partial_rent": "Gedeeltelijke betaling", "service_costs": "Servicekosten", "fines": "Boetes", "deposit": "Borg", "internet": "Internet"}
                type_label = type_labels.get(data.payment_type, data.payment_type)
                covered_str = ", ".join(covered_months)
                total_remaining = payment["remaining_rent"] + payment["remaining_service"] + payment["remaining_fines"] + payment["remaining_internet"]
                if total_remaining <= 0:
                    wa_msg = (f"Beste {tenant['name']},\n\n"
                              f"Uw betaling van SRD {data.amount:,.2f} ({type_label}) is ontvangen.\n"
                              f"Kwitantie: {kwitantie_nummer}\n"
                              f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                              f"Uw saldo is nu VOLLEDIG VOLDAAN.\n\nBedankt voor uw betaling!\n{comp_name}")
                else:
                    wa_msg = (f"Beste {tenant['name']},\n\n"
                              f"Uw betaling van SRD {data.amount:,.2f} ({type_label}) is ontvangen.\n"
                              f"Kwitantie: {kwitantie_nummer}\n"
                              f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                              f"Resterend saldo: SRD {total_remaining:,.2f}\n\nMet vriendelijke groet,\n{comp_name}")
                await _send_message_auto(company_id, tenant_phone, wa_msg, data.tenant_id, tenant["name"], "payment_confirmation")
        except Exception:
            pass

    return {
        "payment_id": payment_id,
        "kwitantie_nummer": kwitantie_nummer,
        "receipt_number": kwitantie_nummer,
        "amount": data.amount,
        "payment_type": data.payment_type,
        "payment_method": data.payment_method,
        "tenant_name": tenant["name"],
        "tenant_code": tenant.get("tenant_code", ""),
        "apartment_number": tenant.get("apartment_number", ""),
        "rent_month": data.rent_month,
        "covered_months": covered_months,
        "status": payment["status"],
        "remaining_rent": payment.get("remaining_rent", tenant.get("outstanding_rent", 0)),
        "remaining_service": payment.get("remaining_service", tenant.get("service_costs", 0)),
        "remaining_fines": payment.get("remaining_fines", tenant.get("fines", 0)),
        "remaining_internet": payment.get("remaining_internet", tenant.get("internet_outstanding", 0)),
        "created_at": now.isoformat()
    }

