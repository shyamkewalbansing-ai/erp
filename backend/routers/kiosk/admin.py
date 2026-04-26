from .base import *

import asyncio
import socket
import ssl
import io as _io
import os as _os
import base64 as _b64
import hashlib as _hashlib
import secrets as _secrets
import dns.resolver

# ============== CUSTOM DOMAIN ==============

@router.post("/admin/domain/verify")
async def verify_custom_domain(company: dict = Depends(get_current_company)):
    """Check if the custom domain's DNS resolves and SSL certificate is valid"""
    domain = company.get("custom_domain", "").strip()
    if not domain:
        raise HTTPException(status_code=400, detail="Geen custom domein ingesteld")
    
    # The company's main domain (where the app is hosted)
    main_domain = company.get("main_app_domain", "").strip()
    
    result = {"domain": domain, "status": "unknown", "details": [], "ssl": None}
    resolved_ip = None
    
    try:
        # Check CNAME record
        cname_found = False
        try:
            answers = dns.resolver.resolve(domain, 'CNAME')
            cname_target = str(answers[0].target).rstrip('.')
            cname_found = True
            result["details"].append(f"CNAME gevonden: {cname_target}")
            
            # If company has a main domain set, check if CNAME matches
            if main_domain and main_domain in cname_target:
                result["status"] = "active"
                result["details"].append(f"DNS correct geconfigureerd! Wijst naar {cname_target}")
            elif main_domain:
                result["status"] = "misconfigured"
                result["details"].append(f"CNAME wijst naar {cname_target}, verwacht: {main_domain}")
            else:
                # No main domain set — just verify it resolves
                result["status"] = "active"
                result["details"].append(f"DNS geconfigureerd, wijst naar {cname_target}")
        except dns.resolver.NoAnswer:
            result["details"].append("Geen CNAME record gevonden")
        except dns.resolver.NXDOMAIN:
            result["status"] = "not_found"
            result["details"].append("Domein bestaat niet of is niet geconfigureerd")
            result["ssl"] = {"status": "unavailable", "details": ["DNS niet geconfigureerd"]}
            return result
        
        # Check A record (always, for IP info)
        try:
            answers = dns.resolver.resolve(domain, 'A')
            resolved_ip = str(answers[0])
            result["details"].append(f"IP-adres: {resolved_ip}")
            if result["status"] == "unknown":
                result["status"] = "active"
                result["details"].append("DNS is bereikbaar via A-record")
        except dns.resolver.NoAnswer:
            if not cname_found:
                result["status"] = "pending" if result["status"] == "unknown" else result["status"]
                result["details"].append("Geen A record gevonden")
        except Exception:
            pass
            
    except Exception as e:
        result["status"] = "error"
        result["details"].append(f"DNS controle mislukt: {str(e)}")
    
    # SSL Certificate Check
    ssl_result = {"status": "unknown", "details": []}
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        
        def check_ssl():
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                s.settimeout(10)
                s.connect((domain, 443))
                cert = s.getpeercert()
                return cert
        
        cert = await asyncio.wait_for(loop.run_in_executor(None, check_ssl), timeout=15)
        
        from datetime import datetime as dt
        not_after = cert.get("notAfter", "")
        issuer = dict(x[0] for x in cert.get("issuer", []))
        subject = dict(x[0] for x in cert.get("subject", []))
        
        expiry = dt.strptime(not_after, "%b %d %H:%M:%S %Y %Z") if not_after else None
        days_left = (expiry - dt.utcnow()).days if expiry else 0
        
        ssl_result["status"] = "valid" if days_left > 0 else "expired"
        ssl_result["details"].append(f"Uitgever: {issuer.get('organizationName', issuer.get('commonName', 'Onbekend'))}")
        ssl_result["details"].append(f"Domein: {subject.get('commonName', 'Onbekend')}")
        ssl_result["details"].append(f"Geldig tot: {not_after}")
        ssl_result["details"].append(f"Dagen resterend: {days_left}")
        
        if days_left <= 0:
            ssl_result["details"].append("Certificaat is verlopen!")
        elif days_left <= 30:
            ssl_result["status"] = "expiring"
            ssl_result["details"].append("Certificaat verloopt binnen 30 dagen")
        
        san = cert.get("subjectAltName", [])
        cert_domains = [d[1] for d in san if d[0] == 'DNS']
        domain_match = any(
            domain == cd or (cd.startswith('*.') and domain.endswith(cd[1:]))
            for cd in cert_domains
        )
        if domain_match:
            ssl_result["details"].append("Domein komt overeen met certificaat")
        else:
            ssl_result["status"] = "mismatch"
            ssl_result["details"].append(f"Domein niet in certificaat. Voeg '{domain}' toe aan uw SSL certificaat (Let's Encrypt / Cloudflare)")
            if cert_domains:
                ssl_result["details"].append(f"Certificaat geldig voor: {', '.join(cert_domains[:5])}")
            
    except (socket.timeout, asyncio.TimeoutError):
        ssl_result["status"] = "timeout"
        ssl_result["details"].append("SSL verbinding time-out (poort 443 niet bereikbaar)")
    except ssl.SSLCertVerificationError:
        ssl_result["status"] = "mismatch"
        ssl_result["details"].append(f"SSL certificaat dekt '{domain}' niet")
        ssl_result["details"].append(f"Oplossing: Voeg '{domain}' toe aan uw SSL certificaat")
        ssl_result["details"].append("Bij Let's Encrypt: sudo certbot --nginx -d facturatie.sr -d " + domain)
        ssl_result["details"].append("Bij Cloudflare: Voeg domein toe als proxy record")
    except ConnectionRefusedError:
        ssl_result["status"] = "unavailable"
        ssl_result["details"].append("Poort 443 geweigerd - geen HTTPS beschikbaar")
    except (socket.gaierror, OSError):
        ssl_result["status"] = "unavailable"
        ssl_result["details"].append("Kan geen verbinding maken met domein")
    except Exception as e:
        ssl_result["status"] = "error"
        ssl_result["details"].append(f"SSL controle mislukt: {str(e)[:120]}")
    
    result["ssl"] = ssl_result
    return result

@router.get("/admin/domain/lookup")
async def domain_lookup_by_host(host: str):
    """Public endpoint: find company by custom domain"""
    company = await db.kiosk_companies.find_one(
        {"custom_domain": host.strip().lower()},
        {"_id": 0, "company_id": 1, "name": 1, "custom_domain_landing": 1}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Domein niet gekoppeld")
    return company


# ============== ADMIN ENDPOINTS (authenticated) ==============

@router.get("/admin/dashboard")
async def get_dashboard(company: dict = Depends(get_current_company)):
    """Get dashboard statistics"""
    company_id = company["company_id"]
    
    total_apartments = await db.kiosk_apartments.count_documents({"company_id": company_id})
    total_tenants = await db.kiosk_tenants.count_documents({"company_id": company_id, "status": "active"})
    
    # Calculate totals
    tenants = await db.kiosk_tenants.find({"company_id": company_id, "status": "active"}).to_list(1000)
    total_outstanding = sum(t.get("outstanding_rent", 0) for t in tenants)
    total_service_costs = sum(t.get("service_costs", 0) for t in tenants)
    total_fines = sum(t.get("fines", 0) for t in tenants)
    total_internet = sum(t.get("internet_outstanding", 0) for t in tenants)
    
    # Payments this month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    payments_this_month = await db.kiosk_payments.find({
        "company_id": company_id,
        "created_at": {"$gte": start_of_month}
    }).to_list(1000)
    approved_payments = [p for p in payments_this_month if p.get("status", "approved") == "approved"]
    pending_payments = [p for p in payments_this_month if p.get("status") == "pending"]
    total_received_month = sum(p.get("amount", 0) for p in approved_payments)
    total_pending_month = sum(p.get("amount", 0) for p in pending_payments)
    
    return {
        "total_apartments": total_apartments,
        "total_tenants": total_tenants,
        "total_outstanding": total_outstanding,
        "total_service_costs": total_service_costs,
        "total_fines": total_fines,
        "total_internet": total_internet,
        "total_received_month": total_received_month,
        "total_pending_month": total_pending_month,
        "payments_count_month": len(approved_payments),
        "pending_count_month": len(pending_payments)
    }

# Apartments CRUD
@router.get("/admin/apartments")
async def list_apartments(company: dict = Depends(get_current_company)):
    """List all apartments"""
    apartments = await db.kiosk_apartments.find({"company_id": company["company_id"]}).to_list(1000)
    return [{
        "apartment_id": apt["apartment_id"],
        "number": apt["number"],
        "description": apt.get("description", ""),
        "monthly_rent": apt.get("monthly_rent", 0),
        "currency": (apt.get("currency") or "SRD").upper(),
        "status": apt.get("status", "available"),
        "sort_order": apt.get("sort_order", 999),
        "location_id": apt.get("location_id"),
        "location_name": apt.get("location_name"),
        "created_at": apt.get("created_at")
    } for apt in apartments]


class ApartmentReorder(BaseModel):
    order: list  # [{"apartment_id": "...", "sort_order": 0}, ...]


@router.put("/admin/apartments/reorder")
async def reorder_apartments(data: ApartmentReorder, company: dict = Depends(get_current_company)):
    """Reorder apartments via drag-and-drop"""
    company_id = company["company_id"]
    for item in data.order:
        await db.kiosk_apartments.update_one(
            {"apartment_id": item["apartment_id"], "company_id": company_id},
            {"$set": {"sort_order": item["sort_order"]}}
        )
    return {"message": "Volgorde bijgewerkt"}


@router.post("/admin/apartments")
async def create_apartment(data: ApartmentCreate, company: dict = Depends(get_current_company)):
    """Create a new apartment"""
    apartment_id = generate_uuid()
    now = datetime.now(timezone.utc)

    location_name = None
    if data.location_id:
        loc = await db.kiosk_locations.find_one({"location_id": data.location_id, "company_id": company["company_id"]})
        location_name = loc["name"] if loc else None

    apartment = {
        "apartment_id": apartment_id,
        "company_id": company["company_id"],
        "number": data.number.upper(),
        "description": data.description,
        "monthly_rent": data.monthly_rent,
        "currency": (data.currency or "SRD").upper(),
        "status": "available",
        "location_id": data.location_id,
        "location_name": location_name,
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_apartments.insert_one(apartment)
    return {"apartment_id": apartment_id, "message": "Appartement aangemaakt"}

@router.put("/admin/apartments/{apartment_id}")
async def update_apartment(apartment_id: str, data: ApartmentUpdate, company: dict = Depends(get_current_company)):
    """Update an apartment"""
    apt = await db.kiosk_apartments.find_one({
        "apartment_id": apartment_id,
        "company_id": company["company_id"]
    })
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    # Normalize currency
    if "currency" in update_data:
        update_data["currency"] = str(update_data["currency"]).upper()
    # Resolve location_name when location_id changes
    if "location_id" in update_data:
        if update_data["location_id"]:
            loc = await db.kiosk_locations.find_one({"location_id": update_data["location_id"], "company_id": company["company_id"]})
            update_data["location_name"] = loc["name"] if loc else None
        else:
            update_data["location_name"] = None
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.kiosk_apartments.update_one(
        {"apartment_id": apartment_id},
        {"$set": update_data}
    )

    # Sync monthly_rent to linked tenant if rent changed
    if "monthly_rent" in update_data:
        await db.kiosk_tenants.update_many(
            {"apartment_id": apartment_id, "company_id": company["company_id"], "status": "active"},
            {"$set": {"monthly_rent": update_data["monthly_rent"], "updated_at": datetime.now(timezone.utc)}}
        )
    # Sync currency to linked tenants if currency changed
    if "currency" in update_data:
        await db.kiosk_tenants.update_many(
            {"apartment_id": apartment_id, "company_id": company["company_id"], "status": "active"},
            {"$set": {"currency": update_data["currency"], "updated_at": datetime.now(timezone.utc)}}
        )
    if "monthly_rent" in update_data:
        # === AUTO WHATSAPP: Huurprijs gewijzigd notificatie ===
        try:
            comp_name = company.get("stamp_company_name") or company.get("name", "")
            apt_nr = apt.get("number", apartment_id)
            new_rent = update_data["monthly_rent"]
            cur = update_data.get("currency") or apt.get("currency", "SRD")
            affected_tenants = await db.kiosk_tenants.find(
                {"apartment_id": apartment_id, "company_id": company["company_id"], "status": "active"}
            ).to_list(100)
            for at in affected_tenants:
                t_phone = at.get("phone") or at.get("telefoon", "")
                if t_phone:
                    wa_rent_change_msg = (f"Beste {at['name']},\n\n"
                                          f"De maandhuur voor appartement {apt_nr} is gewijzigd.\n"
                                          f"Nieuwe huurprijs: {cur} {new_rent:,.2f}\n\n"
                                          f"Met vriendelijke groet,\n{comp_name}")
                    await _send_message_auto(
                        company["company_id"], t_phone, wa_rent_change_msg,
                        at["tenant_id"], at["name"], "rent_updated"
                    )
        except Exception:
            pass  # Notificatie mag hoofdflow niet breken

    return {"message": "Appartement bijgewerkt"}

@router.delete("/admin/apartments/{apartment_id}")
async def delete_apartment(apartment_id: str, company: dict = Depends(get_current_company)):
    """Delete an apartment"""
    result = await db.kiosk_apartments.delete_one({
        "apartment_id": apartment_id,
        "company_id": company["company_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

# ============ LOCATIONS CRUD ============
@router.get("/admin/locations")
async def list_locations(company: dict = Depends(get_current_company)):
    """List all locations"""
    locations = await db.kiosk_locations.find(
        {"company_id": company["company_id"]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return locations

@router.post("/admin/locations")
async def create_location(data: LocationCreate, company: dict = Depends(get_current_company)):
    """Create a new location"""
    now = datetime.now(timezone.utc)
    location = {
        "location_id": generate_uuid(),
        "company_id": company["company_id"],
        "name": data.name.strip(),
        "address": (data.address or "").strip(),
        "created_at": now,
        "updated_at": now
    }
    await db.kiosk_locations.insert_one(location)
    return {"location_id": location["location_id"], "message": "Locatie aangemaakt"}

@router.put("/admin/locations/{location_id}")
async def update_location(location_id: str, data: LocationUpdate, company: dict = Depends(get_current_company)):
    """Update a location"""
    loc = await db.kiosk_locations.find_one({"location_id": location_id, "company_id": company["company_id"]})
    if not loc:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.kiosk_locations.update_one(
        {"location_id": location_id},
        {"$set": update_data}
    )
    # Propagate name change to all apartments linked to this location
    if "name" in update_data:
        await db.kiosk_apartments.update_many(
            {"company_id": company["company_id"], "location_id": location_id},
            {"$set": {"location_name": update_data["name"]}}
        )
    return {"message": "Locatie bijgewerkt"}

@router.delete("/admin/locations/{location_id}")
async def delete_location(location_id: str, company: dict = Depends(get_current_company)):
    """Delete a location. Apartments linked to this location are unlinked (not deleted)."""
    result = await db.kiosk_locations.delete_one({"location_id": location_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden")
    # Unlink apartments
    await db.kiosk_apartments.update_many(
        {"company_id": company["company_id"], "location_id": location_id},
        {"$set": {"location_id": None, "location_name": None}}
    )
    return {"message": "Locatie verwijderd"}


# Tenants CRUD
_MONTH_NAMES_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']


def _parse_dutch_month_label(label: str):
    """Parse 'februari 2026' or 'februari 2026 (gedeeltelijk)' → (year, month) tuple, or None."""
    clean = (label or "").replace(" (gedeeltelijk)", "").strip().lower()
    parts = clean.split()
    if len(parts) != 2:
        return None
    mname, yr = parts[0], parts[1]
    if mname not in _MONTH_NAMES_NL:
        return None
    try:
        return (int(yr), _MONTH_NAMES_NL.index(mname) + 1)
    except ValueError:
        return None


async def _compute_unpaid_months(company_id: str, tenant_id: str, billed_through: str, monthly_rent: float, outstanding: float):
    """Compute the list of unpaid months for a tenant, oldest first.
    Uses past payment history (covered_months entries) to identify partially-paid months
    and stops at the most recent FULLY-paid month so we never go further back than necessary.
    Returns list of dicts: [{ym, label, already_paid, remaining}, ...]
    """
    if not billed_through or monthly_rent <= 0 or outstanding <= 0:
        return []

    past_payments = await db.kiosk_payments.find({
        "company_id": company_id,
        "tenant_id": tenant_id,
        "payment_type": {"$in": ["rent", "partial_rent", "monthly_rent"]},
        "$or": [
            {"status": {"$in": ["approved", "completed"]}},
            {"status": {"$exists": False}},
            {"status": None},
        ],
    }, {"_id": 0, "amount": 1, "covered_months": 1}).to_list(2000)

    paid_per_month: dict = {}
    for pp in past_payments:
        cms = pp.get("covered_months") or []
        if not cms:
            continue
        per = float(pp.get("amount", 0) or 0) / len(cms)
        for cm in cms:
            ym = _parse_dutch_month_label(cm)
            if ym is None:
                continue
            paid_per_month[ym] = paid_per_month.get(ym, 0.0) + per

    bt_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
    months_owed_est = int(outstanding / monthly_rent) if monthly_rent > 0 else 0
    if outstanding - (months_owed_est * monthly_rent) > 0:
        months_owed_est += 1

    months_backward: list = []
    i = 0
    max_lookback = max(months_owed_est + 6, 24)
    while i < max_lookback:
        m_date = bt_date - relativedelta(months=i)
        ym = (m_date.year, m_date.month)
        already_paid = paid_per_month.get(ym, 0.0)
        if already_paid >= monthly_rent - 0.01:
            break
        months_backward.append({
            "ym": ym,
            "label": f"{_MONTH_NAMES_NL[m_date.month - 1]} {m_date.year}",
            "already_paid": already_paid,
            "remaining": max(0.0, monthly_rent - already_paid),
        })
        total_remaining = sum(m["remaining"] for m in months_backward)
        if total_remaining >= outstanding - 0.01:
            break
        i += 1
    months_backward.reverse()  # oldest first
    return months_backward


@router.get("/admin/tenants")
async def list_tenants(company: dict = Depends(get_current_company)):
    """List all tenants - auto-bills new months based on billing_day setting"""
    company_id = company["company_id"]
    tenants = await db.kiosk_tenants.find({"company_id": company_id}).to_list(1000)
    
    # Get company billing settings
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    billing_day = comp.get("billing_day", 1) if comp else 1
    billing_next_month = comp.get("billing_next_month", True) if comp else True
    fine_amount = comp.get("fine_amount", 0) if comp else 0
    
    now = datetime.now(timezone.utc)
    engine_now = now
    current_month = now.strftime("%Y-%m")
    
    result = []
    for t in tenants:
        billed_through = t.get("rent_billed_through", "")
        monthly_rent = t.get("monthly_rent", 0)
        outstanding = t.get("outstanding_rent", 0)
        current_fines = t.get("fines", 0)
        updates = {}
        
        # Alleen auto-billing voor huurders met EXPLICIETE status="active" — anders niet aanraken
        # om bestaande achterstand-data niet dubbel te tellen
        is_active_status = t.get("status") == "active"
        if is_active_status and monthly_rent > 0:
            if not billed_through:
                billed_through = current_month
                updates["rent_billed_through"] = current_month
            else:
                # Auto-billing engine
                # How it works:
                #   billed_through = last month whose rent was added to outstanding
                #   check_month = next month to potentially bill (billed_through + 1)
                #   The due date determines WHEN the next month's rent gets added:
                #     billing_next_month=True  ("Volgende maand"): due_date = check_month's billing_day
                #       -> Feb rent due March 24. After March 24: bill March.
                #     billing_next_month=False ("Dezelfde maand"): due_date = prev_month's billing_day
                #       -> Feb rent due Feb 24. After Feb 24: bill March.
                billed_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
                
                months_billed = 0
                check_month = billed_date + relativedelta(months=1)
                
                # Helper: clamp billing_day to the actual last day of the target month.
                # This ensures billing_day=30 works in April (30 days), May (31), but clamps
                # to 28/29 in February automatically.
                import calendar as _cal
                def _safe_due(dt, day):
                    last_day = _cal.monthrange(dt.year, dt.month)[1]
                    return dt.replace(day=min(day, last_day))

                while True:
                    prev_month = check_month - relativedelta(months=1)
                    if billing_next_month:
                        due_date = _safe_due(check_month, billing_day)
                    else:
                        due_date = _safe_due(prev_month, billing_day)
                    
                    if engine_now >= due_date.replace(tzinfo=timezone.utc):
                        months_billed += 1
                        check_month += relativedelta(months=1)
                    else:
                        break
                
                if months_billed > 0:
                    # Apply fine for existing outstanding BEFORE adding new rent
                    if outstanding > 0 and fine_amount > 0:
                        last_fine_month = t.get("last_fine_month", "")
                        fine_due_month = billed_through  # The period they failed to pay
                        if last_fine_month != fine_due_month:
                            current_fines += fine_amount
                            updates["fines"] = current_fines
                            updates["last_fine_month"] = fine_due_month
                    
                    outstanding += monthly_rent * months_billed
                    billed_through = (billed_date + relativedelta(months=months_billed)).strftime("%Y-%m")
                    updates["outstanding_rent"] = outstanding
                    updates["rent_billed_through"] = billed_through
                    
                    # Add internet costs for billed months
                    internet_cost = t.get("internet_cost", 0)
                    if internet_cost > 0:
                        current_internet = t.get("internet_outstanding", 0)
                        updates["internet_outstanding"] = current_internet + (internet_cost * months_billed)
            
            # Catch-up fine: apply fine when no new billing happened but rent is overdue
            if outstanding > 0 and fine_amount > 0 and not updates.get("last_fine_month"):
                billed_dt = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
                if billing_next_month:
                    current_due = _safe_due(billed_dt + relativedelta(months=1), billing_day)
                else:
                    current_due = _safe_due(billed_dt, billing_day)
                
                if now >= current_due.replace(tzinfo=timezone.utc):
                    last_fine_month = t.get("last_fine_month", "")
                    if last_fine_month != billed_through:
                        current_fines += fine_amount
                        updates["fines"] = current_fines
                        updates["last_fine_month"] = billed_through
        
        if updates:
            updates["updated_at"] = now
            await db.kiosk_tenants.update_one(
                {"tenant_id": t["tenant_id"]},
                {"$set": updates}
            )
            
            # === AUTO WHATSAPP: Billing notifications ===
            if (t.get("phone") or t.get("telefoon")) and is_active_status:
                company_name_for_wa = comp.get("stamp_company_name") or comp.get("name", "") if comp else ""
                months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
                t_phone = t.get("phone") or t.get("telefoon", "")
                
                # New rent month billed
                if "outstanding_rent" in updates and updates["outstanding_rent"] > t.get("outstanding_rent", 0):
                    new_bt = updates.get("rent_billed_through", billed_through)
                    try:
                        bt_d = datetime.strptime(new_bt + "-01", "%Y-%m-%d")
                        month_label = f"{months_nl[bt_d.month - 1]} {bt_d.year}"
                    except Exception:
                        month_label = new_bt
                    wa_rent_msg = (f"Beste {t['name']},\n\n"
                                   f"De huur voor {month_label} is gefactureerd bij {company_name_for_wa}.\n"
                                   f"Bedrag: SRD {monthly_rent:,.2f}\n"
                                   f"Totaal openstaand: SRD {updates['outstanding_rent']:,.2f}\n\n"
                                   f"Gelieve voor de vervaldatum te betalen.\n\n"
                                   f"Met vriendelijke groet,\n{company_name_for_wa}")
                    await _send_message_auto(company_id, t_phone, wa_rent_msg, t["tenant_id"], t["name"], "new_invoice")
                
                # Fine applied
                if "fines" in updates and updates["fines"] > t.get("fines", 0):
                    added_fine = updates["fines"] - t.get("fines", 0)
                    wa_fine_msg = (f"Beste {t['name']},\n\n"
                                   f"Er is een boete van SRD {added_fine:,.2f} toegepast op uw account bij {company_name_for_wa}.\n"
                                   f"Reden: Achterstallige huur niet tijdig betaald.\n"
                                   f"Totaal boetes: SRD {updates['fines']:,.2f}\n"
                                   f"Totaal openstaand: SRD {(updates.get('outstanding_rent', outstanding) + updates.get('service_costs', t.get('service_costs', 0)) + updates['fines']):,.2f}\n\n"
                                   f"Gelieve zo spoedig mogelijk te betalen.\n\n"
                                   f"Met vriendelijke groet,\n{company_name_for_wa}")
                    await _send_message_auto(company_id, t_phone, wa_fine_msg, t["tenant_id"], t["name"], "fine_applied")
        
        # === AUTO POWER CUTOFF: Turn off Shelly when overdue past cutoff days ===
        power_cutoff_days = comp.get("power_cutoff_days", 0) if comp else 0
        if power_cutoff_days > 0 and is_active_status:
            total_debt = (updates.get("outstanding_rent", outstanding) + 
                         t.get("service_costs", 0) + 
                         (updates.get("fines", current_fines)))
            if total_debt > 0 and billed_through:
                try:
                    bt_dt = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
                    if billing_next_month:
                        due_dt = _safe_due(bt_dt + relativedelta(months=1), billing_day)
                    else:
                        due_dt = _safe_due(bt_dt, billing_day)
                    cutoff_dt = due_dt + timedelta(days=power_cutoff_days)
                    if now >= cutoff_dt.replace(tzinfo=timezone.utc):
                        shelly = await db.kiosk_shelly_devices.find_one(
                            {"company_id": company_id, "apartment_id": t.get("apartment_id")}, {"_id": 0}
                        )
                        if shelly and shelly.get("last_status") != "off":
                            ip = shelly["device_ip"]
                            ch = shelly.get("channel", 0)
                            dtype = shelly.get("device_type", "gen1")
                            try:
                                async with httpx.AsyncClient(timeout=5.0) as client:
                                    if dtype == "gen2":
                                        await client.get(f"http://{ip}/rpc/switch.set?id={ch}&on=false")
                                    else:
                                        await client.get(f"http://{ip}/relay/{ch}?turn=off")
                                await db.kiosk_shelly_devices.update_one(
                                    {"device_id": shelly["device_id"]},
                                    {"$set": {"last_status": "off", "last_check": now, "auto_cutoff": True}}
                                )
                            except Exception:
                                pass
                except Exception:
                    pass
        
        # Calculate billing details for display
        overdue_months = []
        current_billing_month = ""
        if billed_through and monthly_rent > 0:
            current_billing_month = billed_through
            if outstanding > 0:
                # Use the same payment-history-aware logic as register_manual_payment
                unpaid_list = await _compute_unpaid_months(company_id, t["tenant_id"], billed_through, monthly_rent, outstanding)
                overdue_months = [m["label"] for m in unpaid_list]

        result.append({
            "tenant_id": t["tenant_id"],
            "name": t["name"],
            "apartment_id": t["apartment_id"],
            "apartment_number": t.get("apartment_number", ""),
            "tenant_code": t.get("tenant_code", ""),
            "email": t.get("email"),
            "telefoon": t.get("telefoon") or t.get("phone"),
            "phone": t.get("phone") or t.get("telefoon"),
            "monthly_rent": monthly_rent,
            "currency": (t.get("currency") or "SRD").upper(),
            "outstanding_rent": outstanding,
            "service_costs": t.get("service_costs", 0),
            "fines": current_fines,
            "deposit_required": t.get("deposit_required", 0),
            "deposit_paid": t.get("deposit_paid", 0),
            "rent_billed_through": billed_through,
            "current_billing_month": current_billing_month,
            "overdue_months": overdue_months,
            "status": t.get("status", "active"),
            "created_at": t.get("created_at"),
            "face_id_enabled": bool(t.get("face_id_enabled") and t.get("face_descriptor")),
            "internet_cost": t.get("internet_cost", 0),
            "internet_outstanding": updates.get("internet_outstanding", t.get("internet_outstanding", 0)),
            "internet_plan_id": t.get("internet_plan_id"),
            "internet_plan_name": t.get("internet_plan_name", ""),
            "id_card_number": t.get("id_card_number"),
            "id_card_name": t.get("id_card_name"),
            "id_card_dob": t.get("id_card_dob"),
        })
    
    return result


@router.post("/admin/tenants/sync-billing")
async def sync_billing_for_all_tenants(company: dict = Depends(get_current_company)):
    """Force re-sync van rent_billed_through voor alle huurders met legacy/missing status.
    Gebruik dit als de huurmaand-kolom blijft hangen op een oude maand.
    """
    company_id = company["company_id"]
    now = datetime.now(timezone.utc)
    # Reset status op alle huurders zonder duidelijke status
    res1 = await db.kiosk_tenants.update_many(
        {"company_id": company_id, "$or": [{"status": {"$exists": False}}, {"status": None}, {"status": ""}, {"status": "Active"}]},
        {"$set": {"status": "active"}}
    )
    total = await db.kiosk_tenants.count_documents({"company_id": company_id})
    return {
        "message": "Status genormaliseerd. Vernieuw de pagina om de auto-billing te laten draaien.",
        "status_normalized": res1.modified_count,
        "total_tenants": total,
        "synced_at": now.isoformat(),
    }



@router.get("/admin/tenants/{tenant_id}/payment-overview")
async def get_tenant_payment_overview(tenant_id: str, company: dict = Depends(get_current_company)):
    """Maand-per-maand overzicht van huurbetalingen voor één huurder.
    Returnt voor elke gefactureerde maand vanaf de eerste tot rent_billed_through:
    {year, month, label, ym, status ('paid'|'partial'|'open'), paid, due, remaining}.
    Geeft ook samenvatting: totaal betaald, totaal verschuldigd, huidige achterstand.
    """
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"company_id": company_id, "tenant_id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")

    monthly_rent = float(tenant.get("monthly_rent", 0) or 0)
    billed_through = tenant.get("rent_billed_through", "") or ""

    # Build paid_per_month from all rent payments
    past_payments = await db.kiosk_payments.find({
        "company_id": company_id,
        "tenant_id": tenant_id,
        "payment_type": {"$in": ["rent", "partial_rent", "monthly_rent"]},
        "$or": [
            {"status": {"$in": ["approved", "completed"]}},
            {"status": {"$exists": False}},
            {"status": None},
        ],
    }, {"_id": 0, "amount": 1, "covered_months": 1, "kwitantie_nummer": 1, "created_at": 1}).to_list(5000)

    paid_per_month: dict = {}
    payments_per_month: dict = {}
    for pp in past_payments:
        cms = pp.get("covered_months") or []
        if not cms:
            continue
        per = float(pp.get("amount", 0) or 0) / len(cms)
        for cm in cms:
            ym = _parse_dutch_month_label(cm)
            if ym is None:
                continue
            paid_per_month[ym] = paid_per_month.get(ym, 0.0) + per
            payments_per_month.setdefault(ym, []).append({
                "kwitantie_nummer": pp.get("kwitantie_nummer"),
                "amount": per,
                "created_at": pp.get("created_at").isoformat() if pp.get("created_at") else None,
                "partial": "(gedeeltelijk)" in cm,
            })

    # Determine range of months to display
    # Start: earliest month in paid_per_month OR tenant.created_at OR billed_through
    end_ym = None
    if billed_through:
        try:
            y, m = billed_through.split("-")
            end_ym = (int(y), int(m))
        except Exception:
            pass
    if end_ym is None:
        now = datetime.now(timezone.utc)
        end_ym = (now.year, now.month)

    start_ym = None
    if paid_per_month:
        start_ym = min(paid_per_month.keys())
    created_at = tenant.get("created_at")
    if created_at:
        c_ym = (created_at.year, created_at.month)
        if start_ym is None or c_ym < start_ym:
            start_ym = c_ym
    if start_ym is None:
        start_ym = end_ym

    # Generate months range start → end inclusive
    months = []
    sy, sm = start_ym
    ey, em = end_ym
    cy, cm_ = sy, sm
    iters = 0
    while (cy, cm_) <= (ey, em) and iters < 240:  # max 20 years safety
        ym = (cy, cm_)
        paid = paid_per_month.get(ym, 0.0)
        due = monthly_rent
        remaining = max(0.0, due - paid)
        if paid <= 0.01:
            status = "open"
        elif paid >= due - 0.01:
            status = "paid"
        else:
            status = "partial"
        months.append({
            "ym": f"{cy}-{cm_:02d}",
            "year": cy,
            "month": cm_,
            "label": f"{_MONTH_NAMES_NL[cm_ - 1]} {cy}",
            "status": status,
            "paid": round(paid, 2),
            "due": round(due, 2),
            "remaining": round(remaining, 2),
            "payments": payments_per_month.get(ym, []),
        })
        # Advance
        if cm_ == 12:
            cy += 1
            cm_ = 1
        else:
            cm_ += 1
        iters += 1

    # Summary
    total_paid = round(sum(m["paid"] for m in months), 2)
    total_due = round(sum(m["due"] for m in months), 2)
    outstanding_calc = round(sum(m["remaining"] for m in months), 2)
    open_count = sum(1 for m in months if m["status"] == "open")
    partial_count = sum(1 for m in months if m["status"] == "partial")
    paid_count = sum(1 for m in months if m["status"] == "paid")

    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant.get("name"),
        "tenant_code": tenant.get("tenant_code"),
        "apartment_number": tenant.get("apartment_number"),
        "monthly_rent": monthly_rent,
        "currency": (tenant.get("currency") or "SRD").upper(),
        "rent_billed_through": billed_through,
        "outstanding_rent": float(tenant.get("outstanding_rent", 0) or 0),
        "months": months,
        "summary": {
            "total_paid": total_paid,
            "total_due": total_due,
            "outstanding": outstanding_calc,
            "counts": {"paid": paid_count, "partial": partial_count, "open": open_count},
        },
    }


# ============== COMBINED DASHBOARD ENDPOINT (1 call instead of 6) ==============

@router.get("/admin/dashboard-data")
async def get_dashboard_data(company: dict = Depends(get_current_company)):
    """Combined endpoint - returns all admin dashboard data in one call"""
    company_id = company["company_id"]
    
    # Parallel fetch all data
    tenants_raw, apartments_raw, payments_raw, leases_raw, kas_entries, employees_raw = await asyncio.gather(
        db.kiosk_tenants.find({"company_id": company_id}).to_list(500),
        db.kiosk_apartments.find({"company_id": company_id}).sort("order", 1).to_list(200),
        db.kiosk_payments.find({"company_id": company_id}).sort("created_at", -1).to_list(10000),
        db.kiosk_leases.find({"company_id": company_id}).to_list(200),
        db.kiosk_kas.find({"company_id": company_id}).sort("created_at", -1).to_list(1000),
        db.kiosk_employees.find({"company_id": company_id}).to_list(100),
    )
    
    # Process apartments
    apartments = [{k: v for k, v in a.items() if k != '_id'} for a in apartments_raw]
    
    # Process payments
    payments = [{k: v for k, v in p.items() if k != '_id'} for p in payments_raw]
    
    # Process leases
    leases = [{k: v for k, v in l.items() if k != '_id'} for l in leases_raw]
    
    # Process kas
    total_income_kas = sum(p.get("amount", 0) for p in payments_raw)
    manual_income = sum(e.get("amount", 0) for e in kas_entries if e.get("entry_type") == "income")
    total_income = total_income_kas + manual_income
    total_expense = sum(e.get("amount", 0) for e in kas_entries if e.get("entry_type") in ("expense", "salary"))
    kas = {
        "entries": [{k: v for k, v in e.items() if k != '_id'} for e in kas_entries],
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
    }
    
    # Process employees
    employees = [{k: v for k, v in e.items() if k != '_id'} for e in employees_raw]
    
    # Process tenants (simplified — no billing logic, just current state)
    tenants = []
    for t in tenants_raw:
        tenants.append({k: v for k, v in t.items() if k != '_id'})
    
    return {
        "apartments": apartments,
        "payments": payments,
        "leases": leases,
        "kas": kas,
        "employees": employees,
        "tenants_raw": tenants,
    }

@router.post("/admin/tenants")
async def create_tenant(data: TenantCreate, company: dict = Depends(get_current_company)):
    """Create a new tenant"""
    # Verify apartment exists
    apt = await db.kiosk_apartments.find_one({
        "apartment_id": data.apartment_id,
        "company_id": company["company_id"]
    })
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    tenant_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    # Generate tenant code if not provided
    tenant_code = data.tenant_code
    if not tenant_code:
        count = await db.kiosk_tenants.count_documents({"company_id": company["company_id"]})
        tenant_code = f"H{str(count + 1).zfill(4)}"
    
    # Inherit currency from apartment (tenant always uses apartment's currency)
    tenant_currency = (data.currency or apt.get("currency") or "SRD").upper()

    tenant = {
        "tenant_id": tenant_id,
        "company_id": company["company_id"],
        "name": data.name,
        "apartment_id": data.apartment_id,
        "apartment_number": apt["number"],
        "tenant_code": tenant_code.upper(),
        "email": data.email,
        "telefoon": data.telefoon,
        "phone": data.telefoon,
        "monthly_rent": data.monthly_rent,
        "currency": tenant_currency,
        "outstanding_rent": data.monthly_rent,  # Start with current month rent owed
        "service_costs": 0,
        "fines": 0,
        "deposit_required": data.deposit_required,
        "deposit_paid": 0,
        "rent_billed_through": now.strftime("%Y-%m"),
        "status": "active",
        "id_card_number": data.id_card_number,
        "id_card_name": data.id_card_name,
        "id_card_dob": data.id_card_dob,
        "id_card_raw": data.id_card_raw,
        "created_at": now,
        "updated_at": now
    }
    
    await db.kiosk_tenants.insert_one(tenant)
    
    # Update apartment status
    await db.kiosk_apartments.update_one(
        {"apartment_id": data.apartment_id},
        {"$set": {"status": "occupied", "updated_at": now}}
    )
    
    # Auto-create lease if dates provided
    lease_id = None
    if data.lease_start_date and data.lease_end_date:
        lease_id = generate_uuid()
        lease = {
            "lease_id": lease_id,
            "company_id": company["company_id"],
            "tenant_id": tenant_id,
            "tenant_name": data.name,
            "apartment_id": data.apartment_id,
            "apartment_number": apt["number"],
            "start_date": data.lease_start_date,
            "end_date": data.lease_end_date,
            "monthly_rent": data.monthly_rent,
            "voorwaarden": "",
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        await db.kiosk_leases.insert_one(lease)
    
    return {"tenant_id": tenant_id, "tenant_code": tenant_code, "lease_id": lease_id, "message": "Huurder aangemaakt"}

@router.put("/admin/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, company: dict = Depends(get_current_company)):
    """Update a tenant"""
    tenant = await db.kiosk_tenants.find_one({
        "tenant_id": tenant_id,
        "company_id": company["company_id"]
    })
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    # Normalize currency
    if "currency" in update_data:
        update_data["currency"] = str(update_data["currency"]).upper()
    
    # If apartment changed, update apartment number and statuses
    if "apartment_id" in update_data:
        apt = await db.kiosk_apartments.find_one({"apartment_id": update_data["apartment_id"]})
        if apt:
            update_data["apartment_number"] = apt["number"]
            # Auto-inherit currency from new apartment if not explicitly overridden
            if "currency" not in update_data and apt.get("currency"):
                update_data["currency"] = apt["currency"]
    
    # If tenant is being deactivated, free up the apartment
    if update_data.get("status") == "inactive" and tenant.get("apartment_id"):
        await db.kiosk_apartments.update_one(
            {"apartment_id": tenant["apartment_id"]},
            {"$set": {"status": "available", "updated_at": datetime.now(timezone.utc)}}
        )
    
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": update_data}
    )
    return {"message": "Huurder bijgewerkt"}

@router.delete("/admin/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, company: dict = Depends(get_current_company)):
    """Delete/deactivate a tenant"""
    tenant = await db.kiosk_tenants.find_one({
        "tenant_id": tenant_id,
        "company_id": company["company_id"]
    })
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Deactivate instead of delete
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Update apartment status
    await db.kiosk_apartments.update_one(
        {"apartment_id": tenant["apartment_id"]},
        {"$set": {"status": "available", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Delete linked leases
    await db.kiosk_leases.delete_many({"tenant_id": tenant_id, "company_id": company["company_id"]})
    
    return {"message": "Huurder gedeactiveerd"}

# Payments
@router.get("/admin/payments")
async def list_payments(
    company: dict = Depends(get_current_company),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    """List all payments with optional month filter"""
    query = {"company_id": company["company_id"]}
    
    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    payments = await db.kiosk_payments.find(query).sort("created_at", -1).to_list(1000)
    return [{
        "payment_id": p["payment_id"],
        "tenant_name": p.get("tenant_name"),
        "tenant_code": p.get("tenant_code"),
        "apartment_number": p.get("apartment_number"),
        "amount": p["amount"],
        "payment_type": p["payment_type"],
        "payment_method": p.get("payment_method", "cash"),
        "description": p.get("description"),
        "rent_month": p.get("rent_month"),
        "covered_months": p.get("covered_months", []),
        "remaining_rent": p.get("remaining_rent"),
        "remaining_service": p.get("remaining_service"),
        "remaining_fines": p.get("remaining_fines"),
        "remaining_internet": p.get("remaining_internet"),
        "kwitantie_nummer": p.get("kwitantie_nummer"),
        "status": p.get("status", "approved"),
        "processed_by": p.get("processed_by", ""),
        "approved_by": p.get("approved_by", ""),
        "has_signature": bool(p.get("approval_signature")),
        "created_at": p["created_at"]
    } for p in payments]

@router.get("/admin/payments/{payment_id}")
async def get_payment(payment_id: str, company: dict = Depends(get_current_company)):
    """Get single payment details"""
    payment = await db.kiosk_payments.find_one({
        "payment_id": payment_id,
        "company_id": company["company_id"]
    })
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    # Backfill tenant_id if missing by looking up on apartment_number / tenant_code.
    resolved_tenant_id = payment.get("tenant_id")
    if not resolved_tenant_id:
        tenant_doc = None
        if payment.get("apartment_number"):
            tenant_doc = await db.kiosk_tenants.find_one({
                "company_id": company["company_id"],
                "apartment_number": payment["apartment_number"],
                "status": "active",
            })
        if not tenant_doc and payment.get("tenant_code"):
            tenant_doc = await db.kiosk_tenants.find_one({
                "company_id": company["company_id"],
                "code": payment["tenant_code"],
            })
        if tenant_doc:
            resolved_tenant_id = tenant_doc.get("tenant_id")

    return {
        "payment_id": payment["payment_id"],
        "tenant_id": resolved_tenant_id,
        "tenant_name": payment.get("tenant_name"),
        "tenant_code": payment.get("tenant_code"),
        "apartment_number": payment.get("apartment_number"),
        "amount": payment["amount"],
        "currency": payment.get("currency", "SRD"),
        "payment_type": payment["payment_type"],
        "payment_method": payment.get("payment_method", "cash"),
        "description": payment.get("description"),
        "rent_month": payment.get("rent_month"),
        "covered_months": payment.get("covered_months", []),
        "remaining_rent": payment.get("remaining_rent"),
        "remaining_service": payment.get("remaining_service"),
        "remaining_fines": payment.get("remaining_fines"),
        "remaining_internet": payment.get("remaining_internet"),
        "kwitantie_nummer": payment.get("kwitantie_nummer"),
        "created_at": payment["created_at"],
        "status": payment.get("status"),
    }


@router.get("/admin/payments/{payment_id}/receipt")
async def generate_receipt(payment_id: str, request: Request, token: Optional[str] = None, noprint: Optional[str] = None, autoprint: Optional[str] = None):
    """Generate printable receipt/kwitantie HTML with the OFFICIAL verified layout
    (watermark + geverifieerd banner + hash-check widget). Same format as /public/receipt
    so users see identical output on screen, PDF and print."""
    if not token:
        raise HTTPException(status_code=401, detail="Token vereist")
    try:
        payload = decode_token(token)
        company_id = payload["company_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")
    
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id, "company_id": company_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    # ALWAYS render in public_view=True so watermark + banner + hash widget are present.
    # The hash-widget has .no-print class so it's automatically hidden when printing to paper/PDF.
    return await _render_receipt_html(
        payment, company_id,
        noprint=bool(noprint), autoprint=bool(autoprint),
        public_view=True,
        request=request,
    )


@router.get("/public/receipt/{payment_id}")
async def public_receipt(payment_id: str, request: Request, autoprint: Optional[str] = None):
    """Publicly accessible receipt view (for QR code scanning or mobile print).
    Renders the SAME verified HTML layout as the admin receipt — identical output
    on screen, PDF and print. Only shows approved payments."""
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Kwitantie niet gevonden")
    if payment.get("status") not in ("approved", "completed"):
        raise HTTPException(status_code=404, detail="Kwitantie niet beschikbaar")
    return await _render_receipt_html(
        payment, payment["company_id"],
        noprint=True, autoprint=bool(autoprint),
        public_view=True, public_pdf_url=True,
        request=request,
    )


async def _render_receipt_pdf_bytes(payment: dict, company_id: str, public_view: bool = False, request=None) -> bytes:
    """Render the kwitantie as a tamper-protected, encrypted PDF (A5 compact)."""
    html_resp = await _render_receipt_html(payment, company_id, noprint=True, autoprint=False, public_view=public_view, request=request)
    html_bytes = html_resp.body if hasattr(html_resp, "body") else html_resp
    html_str = html_bytes.decode("utf-8", errors="ignore") if isinstance(html_bytes, bytes) else str(html_bytes)
    return await _encrypt_receipt_pdf(html_str)


@router.get("/admin/payments/{payment_id}/receipt/pdf")
async def generate_receipt_pdf(payment_id: str, request: Request, token: Optional[str] = None):
    """Download the kwitantie as a tamper-protected, encrypted PDF (A5, compact)."""
    if not token:
        raise HTTPException(status_code=401, detail="Token vereist")
    try:
        payload = decode_token(token)
        company_id = payload["company_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id, "company_id": company_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    pdf_bytes = await _render_receipt_pdf_bytes(payment, company_id, public_view=False, request=request)
    filename = f"Kwitantie_{payment.get('kwitantie_nummer', payment_id)}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/public/receipt/{payment_id}/pdf")
async def public_receipt_pdf(payment_id: str, request: Request):
    """Publicly download the verified kwitantie PDF (only for approved payments)."""
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Kwitantie niet gevonden")
    if payment.get("status") not in ("approved", "completed"):
        raise HTTPException(status_code=404, detail="Kwitantie niet beschikbaar")
    pdf_bytes = await _render_receipt_pdf_bytes(payment, payment["company_id"], public_view=True, request=request)
    filename = f"Kwitantie_{payment.get('kwitantie_nummer', payment_id)}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


def _get_request_base_url(request) -> str:
    """Bepaal de juiste publieke base URL voor deze request.
    Respecteert X-Forwarded-Host en X-Forwarded-Proto (gezet door nginx/reverse proxy).
    Valt terug op APP_URL env var wanneer geen request beschikbaar is (bv. scheduler).
    """
    if request is None:
        return _os.environ.get("APP_URL", "https://facturatie.sr").rstrip("/")
    try:
        # Respect proxy headers
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        if forwarded_host:
            return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    except Exception:
        pass
    return _os.environ.get("APP_URL", "https://facturatie.sr").rstrip("/")


async def _render_receipt_html(payment: dict, company_id: str, noprint: bool = False, autoprint: bool = False, public_view: bool = False, public_pdf_url: bool = False, request=None):
    """Render the kwitantie HTML. Shared between /admin/.../receipt and /public/receipt/..."""

    # Build public QR URL (authentic kwitantie link) for this payment
    app_url = _get_request_base_url(request)
    qr_url = f"{app_url}/api/kiosk/public/receipt/{payment['payment_id']}"
    qr_data_url = ""
    try:
        import qrcode as _qrcode
        qr = _qrcode.QRCode(version=None, error_correction=_qrcode.constants.ERROR_CORRECT_M, box_size=4, border=2)
        qr.add_data(qr_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
        qr_data_url = "data:image/png;base64," + _b64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        qr_data_url = ""

    comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    
    # Use stamp settings from Instellingen, fallback to company name
    stamp_name = comp.get("stamp_company_name") or comp.get("name", "Onbekend")
    stamp_address = comp.get("stamp_address") or comp.get("adres") or "Paramaribo, Suriname"
    stamp_phone = comp.get("stamp_phone") or comp.get("telefoon") or ""
    stamp_whatsapp = comp.get("stamp_whatsapp") or ""
    company_email = comp.get("email", "")
    
    # Stamp initials
    initials = "".join([w[0] for w in stamp_name.split()[:3] if w]).upper()
    
    tenant_name = payment.get("tenant_name", "Onbekend")
    tenant_code = payment.get("tenant_code", "")
    apartment_number = payment.get("apartment_number", "")
    amount = payment.get("amount", 0)
    currency = str(payment.get("currency") or "SRD").upper()
    payment_type = payment.get("payment_type", "")
    payment_method = payment.get("payment_method", "cash")
    description = payment.get("description", "")
    rent_month = payment.get("rent_month", "")
    kwitantie_nummer = payment.get("kwitantie_nummer", "")
    created_at = payment.get("created_at")
    
    # Format date in Suriname time (America/Paramaribo, UTC-3)
    if created_at:
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        # Ensure we have a TZ-aware datetime, then convert to Suriname time
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        try:
            from zoneinfo import ZoneInfo
            created_at_sr = created_at.astimezone(ZoneInfo("America/Paramaribo"))
        except Exception:
            # Fallback: fixed UTC-3 offset
            created_at_sr = created_at.astimezone(timezone(timedelta(hours=-3)))
        months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
        date_fmt = f"{created_at_sr.day} {months_nl[created_at_sr.month-1]} {created_at_sr.year}"
        time_fmt = created_at_sr.strftime("%H:%M")
    else:
        date_fmt = "-"
        time_fmt = ""
    
    # Payment type label
    type_labels = {
        "rent": "Huurbetaling",
        "monthly_rent": "Maandhuur",
        "partial_rent": "Gedeeltelijke Huurbetaling",
        "service_costs": "Servicekosten",
        "deposit": "Borg",
        "fine": "Boete",
        "fines": "Boetes",
        "internet": "Internet",
        "other": "Overig"
    }
    type_label = type_labels.get(payment_type, payment_type.replace("_", " ").title())
    
    method_labels = {"cash": "Contant", "bank": "Bank", "pin": "PIN", "card": "Pinpas (SumUp)", "mope": "Mope", "uni5pay": "Uni5Pay"}
    method_label = method_labels.get(payment_method, payment_method)
    
    # Format rent month
    rent_month_label = ""
    covered_months = payment.get("covered_months", [])
    if covered_months:
        rent_month_label = ", ".join(covered_months)
    elif rent_month:
        try:
            y, m = rent_month.split("-")
            months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            rent_month_label = f"{months_nl[int(m)-1]} {y}"
        except Exception:
            rent_month_label = rent_month
    
    # Remaining balances from stored payment data or live from tenant
    remaining_rent = payment.get("remaining_rent")
    remaining_service = payment.get("remaining_service")
    remaining_fines = payment.get("remaining_fines")
    remaining_internet = payment.get("remaining_internet")
    has_remaining = remaining_rent is not None
    
    # Fallback: get current tenant balances if not stored
    if not has_remaining:
        tenant_doc = await db.kiosk_tenants.find_one({"tenant_id": payment.get("tenant_id"), "company_id": company_id})
        if tenant_doc:
            remaining_rent = tenant_doc.get("outstanding_rent", 0)
            remaining_service = tenant_doc.get("service_costs", 0)
            remaining_fines = tenant_doc.get("fines", 0)
            remaining_internet = tenant_doc.get("internet_outstanding", 0)
    
    total_remaining = (remaining_rent or 0) + (remaining_service or 0) + (remaining_fines or 0) + (remaining_internet or 0)

    # Build remaining balance HTML section
    remaining_html = ""
    if total_remaining is not None:
        rows = ""
        if remaining_rent:
            rows += f'<tr><td>Huur</td><td>SRD {remaining_rent:,.2f}</td></tr>'
        if remaining_service:
            rows += f'<tr><td>Servicekosten</td><td>SRD {remaining_service:,.2f}</td></tr>'
        if remaining_fines:
            rows += f'<tr><td>Boetes</td><td>SRD {remaining_fines:,.2f}</td></tr>'
        if remaining_internet:
            rows += f'<tr><td>Internet</td><td>SRD {remaining_internet:,.2f}</td></tr>'
        total_color = "#27ae60" if total_remaining == 0 else "#e74c3c"
        total_text = "VOLDAAN" if total_remaining == 0 else f"SRD {total_remaining:,.2f}"
        label = "Openstaand na betaling" if has_remaining else "Huidig openstaand saldo"
        remaining_html = f'''
<table class="details-table" style="margin-top:10px;">
  <tr><td colspan="2" style="font-size:9pt;color:#7f8c8d;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2c3e50 !important;">{label}</td></tr>
  {rows}
  <tr style="border-top:2px solid #2c3e50;"><td style="font-weight:bold;font-size:11pt;">TOTAAL OPENSTAAND</td><td style="font-weight:bold;font-size:11pt;color:{total_color};">{total_text}</td></tr>
</table>'''

    # Build rent month row
    rent_month_row = ""
    if rent_month_label:
        if payment_type in ("rent", "partial_rent", "monthly_rent"):
            rent_month_row = f'<tr><td>Betaling voor</td><td>{rent_month_label}</td></tr>'
        else:
            rent_month_row = f'<tr><td>Huurmaand</td><td>{rent_month_label}</td></tr>'

    # Build processed/approved info
    processed_by = payment.get("processed_by", "")
    approved_by = payment.get("approved_by", "")
    processed_by_role = payment.get("processed_by_role", "")
    approval_signature = payment.get("approval_signature", "")

    role_labels = {
        "beheerder": "Beheerder",
        "boekhouder": "Boekhouder",
        "kiosk_medewerker": "Kiosk Medewerker",
    }
    role_label = role_labels.get(processed_by_role, "")
    role_colors = {
        "beheerder": "#f97316",       # orange-500
        "boekhouder": "#6366f1",       # indigo-500
        "kiosk_medewerker": "#64748b", # slate-500
    }
    role_color = role_colors.get(processed_by_role, "#64748b")

    process_html = ""
    # Hide generic "Kiosk" label (legacy default value)
    show_processed = processed_by and processed_by.strip().lower() != "kiosk"
    show_approved = approved_by and approved_by.strip().lower() != "kiosk"
    if show_processed or show_approved:
        process_html = '<table class="details-table" style="margin-top:8px;">'
        if show_processed:
            role_badge = (
                f'<span style="display:inline-block;margin-left:8px;padding:1px 8px;'
                f'border:1px solid {role_color};color:{role_color};border-radius:10px;'
                f'font-size:10px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">'
                f'{role_label}</span>'
            ) if role_label else ""
            process_html += f'<tr><td>Ontvangen door</td><td>{processed_by}{role_badge}</td></tr>'
        if show_approved:
            process_html += f'<tr><td>Goedgekeurd door</td><td>{approved_by}</td></tr>'
        process_html += '</table>'
    
    signature_html = ""
    if approval_signature:
        signature_html = f'''
<div class="approval-signature">
  <div class="sig-label">Goedgekeurd door {approved_by or "Beheerder"}</div>
  <img src="{approval_signature}" alt="Handtekening" />
</div>'''

    # Compute tamper-proof SHA-256 document hash (stable over payment content)
    import json as _json
    hash_payload = {
        "payment_id": payment.get("payment_id"),
        "kwitantie_nummer": kwitantie_nummer,
        "company_id": company_id,
        "tenant_id": payment.get("tenant_id"),
        "tenant_name": tenant_name,
        "apartment_number": apartment_number,
        "amount": float(amount or 0),
        "payment_type": payment_type,
        "payment_method": payment_method,
        "rent_month": rent_month,
        "created_at": payment.get("created_at").isoformat() if isinstance(payment.get("created_at"), datetime) else str(payment.get("created_at") or ""),
        "approved_by": approved_by,
    }
    _h = _hashlib.sha256(_json.dumps(hash_payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    doc_hash_short = _h[:16].upper()
    doc_hash_full = _h

    verified_banner_html = ""
    hash_verify_html = ""
    if public_view:
        verified_banner_html = '<div class="verified-banner">&#10003; Geverifieerd origineel &middot; Authentiek document</div>'
        # Interactive hash-compare widget (only shows in HTML public view, not in PDF)
        hash_verify_html = f'''
<div class="hash-verify no-print" data-testid="hash-verify-widget">
  <div class="hv-title">Document-hash controleren</div>
  <p class="hv-help">Voer de SHA-256 hash in die op uw papieren/PDF-kwitantie staat (onderaan). Deze pagina vergelijkt met de authentieke hash op de server.</p>
  <div class="hv-row">
    <input id="hvInput" type="text" placeholder="Plak hier de hash van uw kopie..." spellcheck="false" autocomplete="off" data-testid="hash-verify-input" />
    <button onclick="verifyHash()" data-testid="hash-verify-btn">Vergelijk</button>
  </div>
  <div id="hvResult" class="hv-result" data-testid="hash-verify-result"></div>
  <div class="hv-authentic">Authentieke hash: <code id="hvAuth">{doc_hash_full}</code>
    <button class="hv-copy" onclick="(function(){{navigator.clipboard&&navigator.clipboard.writeText('{doc_hash_full}');document.getElementById('hvCopiedMsg').style.display='inline';setTimeout(function(){{document.getElementById('hvCopiedMsg').style.display='none';}},1500);}})()" data-testid="hash-copy-btn">Kopieer</button>
    <span id="hvCopiedMsg" style="display:none;color:#15803d;font-size:7pt;margin-left:6px;">Gekopieerd!</span>
  </div>
</div>
<script>
function verifyHash(){{
  var expected = "{doc_hash_full}".toLowerCase();
  var input = (document.getElementById('hvInput').value || '').trim().toLowerCase().replace(/\\s+/g,'');
  var out = document.getElementById('hvResult');
  if (!input){{
    out.className = 'hv-result hv-warn';
    out.innerHTML = 'Voer eerst een hash in om te vergelijken.';
    return;
  }}
  if (input === expected){{
    out.className = 'hv-result hv-ok';
    out.innerHTML = '&#10003; Gematcht &mdash; document is AUTHENTIEK en ongewijzigd.';
  }} else if (expected.indexOf(input) === 0 || input.length < 16){{
    out.className = 'hv-result hv-warn';
    out.innerHTML = 'Hash te kort of onvolledig. Voer de volledige 64-teken SHA-256 hash in.';
  }} else {{
    out.className = 'hv-result hv-bad';
    out.innerHTML = '&#10007; Mismatch &mdash; dit document wijkt af van de serverversie. Mogelijk VERVALST.';
  }}
}}
</script>'''

    # PDF button (only shown in non-public admin view, not noprint preview)
    pdf_download_url = ""
    if not public_view:
        if public_pdf_url:
            # Public mobile print flow: use the publicly-accessible PDF endpoint (no token).
            # Current URL is /api/kiosk/public/receipt/<id>, so "./pdf" resolves to /api/kiosk/public/receipt/<id>/pdf.
            pdf_download_url = f"./{payment['payment_id']}/pdf"
        else:
            # Admin view: relative URL resolves to /api/kiosk/admin/payments/<id>/receipt/pdf.
            pdf_download_url = f"./{payment['payment_id']}/receipt/pdf"

    # Build print bar HTML outside f-string (backslashes not allowed in f-expressions)
    if noprint:
        print_bar_html = ""
    else:
        _pdf_js = (
            "window.location.href='" + pdf_download_url +
            "?token=' + (new URLSearchParams(window.location.search).get('token')||'')"
        )
        print_bar_html = (
            '<div class="print-bar">'
            f'<button class="pdf-btn" onclick="{_pdf_js}">&#11015; Download PDF (Beveiligd)</button>'
            '<button onclick="window.close()">Sluiten</button>'
            '</div>'
        )

    # Auto-print script — triggers browser print dialog when ?autoprint=1 is set.
    # Works even in public/noprint view: we skip the print-bar UI but still trigger the print dialog.
    if autoprint:
        autoprint_script = """<script>
window.addEventListener('load', function() {
  setTimeout(function() {
    try { window.focus(); window.print(); } catch(e) {}
  }, 400);
});
</script>"""
    else:
        autoprint_script = ""

    # QR inline rendered inside the receipt title (right side, no text)
    qr_inline = ""
    if qr_data_url:
        qr_inline = f'<div class="qr-inline"><img src="{qr_data_url}" alt="QR" /></div>'
    qr_block = ""

    html = f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Kwitantie {kwitantie_nummer}</title>
<style>
  @page {{ size: A4 portrait; margin: 0 !important; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ width: 210mm; }}
  body {{
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 9pt;
    line-height: 1.3;
    color: #000;
    background: #fff;
    position: relative;
  }}
  .page {{
    width: 210mm;
    margin: 0 auto;
    padding: 10mm 14mm 8mm;
    page-break-inside: avoid;
    position: relative;
    z-index: 1;
  }}
  /* Tamper-proof diagonal watermark — identical across ALL receipt types, centered WITHIN the receipt body */
  .receipt-body {{
    position: relative;
    min-height: 110mm;
    overflow: hidden;
  }}
  .receipt-body::before {{
    content: "ORIGINEEL";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 72pt;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.09);
    letter-spacing: 10px;
    z-index: 0;
    pointer-events: none;
    white-space: nowrap;
    font-family: 'Georgia', 'Times New Roman', serif;
  }}
  .receipt-body > * {{ position: relative; z-index: 1; }}
  .header {{
    border-bottom: 1.5px solid #000;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }}
  .company-name {{
    font-size: 11pt;
    font-weight: bold;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }}
  .company-info {{
    font-size: 6.5pt;
    color: #000;
    margin-top: 1px;
    line-height: 1.25;
  }}
  .receipt-title {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin: 8px 0 6px;
  }}
  .receipt-title .title-wrap {{
    flex: 1;
    text-align: center;
  }}
  .receipt-title h1 {{
    font-size: 15pt;
    color: #000;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .receipt-title .qr-inline {{
    width: 78px;
    height: 78px;
    flex-shrink: 0;
  }}
  .receipt-title .qr-inline img {{
    width: 100%;
    height: 100%;
    display: block;
  }}
  .receipt-number {{
    font-size: 9pt;
    color: #000;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    margin-top: 2px;
  }}
  .details-table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
  }}
  .details-table td {{
    padding: 3px 8px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 9pt;
    color: #000;
  }}
  .details-table tr:last-child td {{
    border-bottom: none;
  }}
  .details-table td:first-child {{
    color: #000;
    width: 30%;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}
  .details-table td:last-child {{
    font-weight: 600;
    color: #000;
  }}
  .amount-row {{
    background: #fff;
    border-top: 1.5px solid #000 !important;
    border-bottom: 1.5px solid #000 !important;
  }}
  .amount-row td {{
    padding: 6px 8px;
    font-size: 12pt !important;
    font-weight: bold !important;
    color: #000 !important;
  }}
  .amount-row td:last-child {{
    color: #000 !important;
    text-align: right;
    font-size: 13pt !important;
  }}
  .stamp-section {{
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 8px;
    margin: 8px 0 4px;
    flex-wrap: wrap;
  }}
  .stamp-rect {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1.5px solid #991b1b;
    padding: 4px 9px;
    transform: rotate(-5deg);
    opacity: 0.88;
  }}
  .stamp-info p {{ margin: 0; line-height: 1.25; }}
  .stamp-info .stamp-name {{ color: #991b1b; font-weight: bold; font-size: 7.5pt; }}
  .stamp-info .stamp-detail {{ color: #1a1a1a; font-size: 6.5pt; }}
  .approval-signature {{
    text-align: center;
    min-width: 130px;
  }}
  .approval-signature img {{
    max-width: 150px;
    max-height: 46px;
    display: block;
    margin: 0 auto 2px;
  }}
  .approval-signature .sig-label {{
    border-top: 1px solid #000;
    padding-top: 2px;
    font-size: 7pt;
    color: #000;
    font-weight: bold;
  }}
  .verified-banner {{
    margin-top: 6px;
    padding: 4px 8px;
    border: 1.5px solid #15803d;
    color: #15803d;
    font-weight: bold;
    font-size: 8pt;
    text-align: center;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }}
  .doc-hash {{
    margin-top: 4px;
    font-family: 'Courier New', monospace;
    font-size: 6pt;
    color: #555;
    text-align: center;
    word-break: break-all;
  }}
  /* Public hash-verify widget (HTML only, never printed) */
  .hash-verify {{
    margin: 14px auto 0;
    max-width: 480px;
    padding: 12px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #f9fafb;
    font-family: system-ui, -apple-system, sans-serif;
  }}
  .hash-verify .hv-title {{ font-size: 10pt; font-weight: bold; color: #111; margin-bottom: 4px; }}
  .hash-verify .hv-help {{ font-size: 8pt; color: #555; margin-bottom: 8px; line-height: 1.4; }}
  .hash-verify .hv-row {{ display: flex; gap: 6px; }}
  .hash-verify input {{
    flex: 1; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 4px;
    font-family: 'Courier New', monospace; font-size: 9pt; background: #fff; min-width: 0;
  }}
  .hash-verify input:focus {{ outline: 2px solid #15803d; outline-offset: -1px; }}
  .hash-verify button {{
    background: #15803d; color: #fff; border: none; padding: 7px 16px;
    font-size: 9pt; font-weight: bold; border-radius: 4px; cursor: pointer;
  }}
  .hash-verify button:hover {{ background: #166534; }}
  .hash-verify .hv-result {{ margin-top: 8px; font-size: 9pt; font-weight: bold; min-height: 0; }}
  .hash-verify .hv-result.hv-ok {{ color: #15803d; }}
  .hash-verify .hv-result.hv-bad {{ color: #b91c1c; }}
  .hash-verify .hv-result.hv-warn {{ color: #a16207; }}
  .hash-verify .hv-authentic {{ margin-top: 10px; font-size: 7pt; color: #555; word-break: break-all; line-height: 1.4; }}
  .hash-verify .hv-authentic code {{ color: #111; background: #fff; padding: 1px 4px; border-radius: 3px; border: 1px solid #e5e7eb; }}
  .hash-verify .hv-copy {{ background: #64748b; color: #fff; border: none; padding: 2px 8px; font-size: 7pt; border-radius: 3px; margin-left: 4px; cursor: pointer; font-weight: normal; }}
  .hash-verify .hv-copy:hover {{ background: #475569; }}
  @media print {{ .hash-verify, .no-print {{ display: none !important; }} }}
  .footer {{
    margin-top: 5px;
    padding-top: 3px;
    border-top: 1px solid #000;
    font-size: 6pt;
    color: #000;
    text-align: center;
    line-height: 1.2;
  }}
  .qr-block {{
    margin-top: 10px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px dashed #000;
  }}
  .qr-block .qr-img {{
    width: 80px;
    height: 80px;
    display: block;
  }}
  .qr-block .qr-label {{
    text-align: right;
    font-size: 7pt;
    line-height: 1.3;
  }}
  .qr-block .qr-title {{
    font-weight: bold;
    font-size: 8pt;
    color: #000;
  }}
  .qr-block .qr-hint {{
    color: #333;
    font-style: italic;
  }}
  .print-bar {{
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #2c3e50;
    padding: 8px 16px;
    text-align: center;
    z-index: 1000;
  }}
  .print-bar button {{
    background: #e67e22;
    color: white;
    border: none;
    padding: 8px 24px;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin: 0 4px;
    text-decoration: none;
    display: inline-block;
  }}
  .print-bar button.pdf-btn {{ background: #15803d; }}
  .print-bar button:hover {{ background: #d35400; }}
  .print-bar button.pdf-btn:hover {{ background: #166534; }}
  @media print {{
    .print-bar {{ display: none !important; }}
    body {{ padding: 0; margin: 0; }}
    .page {{ padding: 8mm 14mm 6mm !important; margin: 0 !important; margin-top: 0 !important; }}
    @page {{ size: A4 portrait; margin: 0 !important; }}
  }}
</style>
</head>
<body>
{print_bar_html}

<div class="page" style="{'margin-top: 0' if noprint else 'margin-top: 40px'}; position: relative;">

<div class="receipt-body">
<div class="header">
  <div class="company-name">{stamp_name}</div>
  <div class="company-info">
    {stamp_address}
    {(' | Tel: ' + stamp_phone) if stamp_phone else ''}{(' | WhatsApp: ' + stamp_whatsapp) if stamp_whatsapp else ''}
    {(' | ' + company_email) if company_email else ''}
  </div>
</div>

<div class="receipt-title">
  <div class="title-wrap">
    <h1>Kwitantie</h1>
    <div class="receipt-number">{kwitantie_nummer}</div>
  </div>
  {qr_inline}
</div>

<table class="details-table">
  <tr><td>Datum</td><td>{date_fmt}</td></tr>
  <tr><td>Huurder</td><td>{tenant_name} {('(' + tenant_code + ')') if tenant_code else ''}</td></tr>
  <tr><td>Appartement</td><td>{apartment_number}</td></tr>
  <tr><td>Type betaling</td><td>{type_label}</td></tr>
  {rent_month_row}
  <tr><td>Betalingswijze</td><td>{method_label}</td></tr>
  <tr class="amount-row"><td>Ontvangen bedrag</td><td>{currency} {amount:,.2f}</td></tr>
</table>

{remaining_html}

{process_html}

<div class="stamp-section">
  <div class="stamp-rect">
    <svg width="30" height="28" viewBox="0 0 52 48" fill="none">
      <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
      <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
      <rect x="18" y="22" width="6" height="6" fill="white"/>
      <rect x="28" y="22" width="6" height="6" fill="white"/>
      <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
      <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
      <rect x="8" y="31" width="5" height="5" fill="white"/>
      <rect x="16" y="31" width="5" height="5" fill="white"/>
    </svg>
    <div class="stamp-info">
      <p class="stamp-name">{stamp_name}</p>
      <p class="stamp-detail">{stamp_address}</p>
      <p class="stamp-detail">Tel: {stamp_phone}</p>
    </div>
  </div>
  {signature_html}
</div>

{qr_block}

{verified_banner_html}

<div class="doc-hash">Document-hash (SHA-256): {doc_hash_short} &middot; {doc_hash_full}</div>

<div class="footer">
  {stamp_name} &bull; {stamp_address} &bull; {kwitantie_nummer}
</div>
</div>

{hash_verify_html}

</div>
{autoprint_script}
</body>
</html>"""
    
    return Response(content=html, media_type="text/html")


@router.delete("/admin/payments/{payment_id}")
async def delete_payment(payment_id: str, company: dict = Depends(get_current_company)):
    result = await db.kiosk_payments.delete_one({"payment_id": payment_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return {"message": "Betaling verwijderd"}


@router.post("/admin/payments/fix-covered-months")
async def fix_covered_months(company: dict = Depends(get_current_company)):
    """DISABLED — deze functie heeft eerder bestaande covered_months overschreven.
    Behouden voor URL-compatibiliteit maar voert geen wijzigingen uit.
    """
    return {"message": "Functie gedeactiveerd. Bewerk Periode handmatig per kwitantie indien nodig.", "total": 0, "fixed": 0}


class CoveredMonthsUpdate(BaseModel):
    covered_months: list[str]


@router.put("/admin/payments/{payment_id}/covered-months")
async def update_payment_covered_months(payment_id: str, data: CoveredMonthsUpdate, company: dict = Depends(get_current_company)):
    """Handmatig de Periode (covered_months) van een kwitantie corrigeren.
    Bijvoorbeeld: ['februari 2026 (gedeeltelijk)']
    """
    res = await db.kiosk_payments.update_one(
        {"payment_id": payment_id, "company_id": company["company_id"]},
        {"$set": {"covered_months": [m.strip() for m in data.covered_months if m and m.strip()]}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kwitantie niet gevonden")
    return {"message": "Periode bijgewerkt", "covered_months": data.covered_months}


@router.post("/admin/payments/_legacy_fix_covered_months_DISABLED")
async def _legacy_fix_covered_months(company: dict = Depends(get_current_company)):
    """Recalculate covered_months for all rent payments using a date-based approach.
    
    Uses the payment's created_at to determine which month(s) the payment covered:
    - Single month payment (amount == monthly_rent): covered_month = vorige kalendermaand
      (arrears workflow: betaling op 16 april = huur voor maart)
    - Multiple months: splits bedrag over opeenvolgende maanden vanaf oudste achterstand
    
    Dit is stabiel door de tijd (payment_date verandert niet), in tegenstelling tot de
    vorige logica die afhankelijk was van de huidige billed_through (die door auto-billing
    verandert).
    """
    import calendar as _cal
    company_id = company["company_id"]
    billing_day = int(company.get("billing_day", 1) or 1)
    billing_next_month = bool(company.get("billing_next_month", True))

    payments = await db.kiosk_payments.find({"company_id": company_id}).sort("created_at", 1).to_list(10000)
    month_names_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
    fixed = 0

    for p in payments:
        if p.get("payment_type") not in ("rent", "partial_rent", "monthly_rent"):
            continue

        tenant_id = p.get("tenant_id")
        if not tenant_id:
            continue

        tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id})
        if not tenant:
            continue

        monthly_rent = float(tenant.get("monthly_rent", 0) or 0)
        if monthly_rent <= 0:
            continue

        # Step 1: Bepaal de "reference month" op basis van betaaldatum + billing_day
        pay_date = p.get("created_at") or datetime.now(timezone.utc)
        if isinstance(pay_date, str):
            try:
                pay_date = datetime.fromisoformat(pay_date.replace("Z", "+00:00"))
            except Exception:
                pay_date = datetime.now(timezone.utc)

        # Reference month = de maand waarvoor deze betaling geldt.
        # Arrears workflow met billing_next_month=true: betaling in maand X geldt voor maand X-1.
        # Bepaal of de vervaldag van HUIDIGE maand al gepasseerd is ten tijde van betaling.
        last_day = _cal.monthrange(pay_date.year, pay_date.month)[1]
        due_day_clamped = min(billing_day, last_day)
        due_this_month = pay_date.replace(day=due_day_clamped, hour=23, minute=59, second=59, microsecond=0)

        if billing_next_month:
            # Huur van vorige maand vervalt deze maand op billing_day
            # Als betaling vóór vervaldag → betaling is voor prev maand
            # Als betaling na vervaldag → nog steeds voor prev maand (al achterstand)
            ref_month = pay_date - relativedelta(months=1)
        else:
            # Huur van huidige maand vervalt deze maand op billing_day
            # Voor vervaldag: betaling is voor huidige maand
            # Na vervaldag: mogelijk al achterstand van huidige maand
            ref_month = pay_date

        # Step 2: Aantal maanden dit payment dekt
        pay_amount = float(p.get("amount", 0) or 0)
        months_covered_count = int(pay_amount / monthly_rent) if monthly_rent > 0 else 0
        remainder = pay_amount - (months_covered_count * monthly_rent)
        partial_month = remainder > 0

        # Step 3: Bouw de lijst — oudste eerst, eindigend bij ref_month
        covered = []
        for i in range(months_covered_count):
            # Start with oldest: ref_month - (count-1) + i
            m_offset = (months_covered_count - 1) - i
            m_date = ref_month - relativedelta(months=m_offset)
            covered.append(f"{month_names_nl[m_date.month - 1]} {m_date.year}")

        if partial_month:
            # Een extra gedeeltelijke maand: één maand ouder dan de oudste volledige
            oldest_full_offset = months_covered_count
            m_date = ref_month - relativedelta(months=oldest_full_offset)
            covered.insert(0, f"{month_names_nl[m_date.month - 1]} {m_date.year} (gedeeltelijk)")
        elif months_covered_count == 0 and pay_amount > 0:
            # Alleen een kleine partiële betaling, geen volledige maand
            covered.append(f"{month_names_nl[ref_month.month - 1]} {ref_month.year} (gedeeltelijk)")

        if covered != p.get("covered_months", []):
            await db.kiosk_payments.update_one(
                {"payment_id": p["payment_id"]},
                {"$set": {"covered_months": covered}}
            )
            fixed += 1

    return {"message": f"{fixed} betalingen bijgewerkt", "total": len(payments)}



@router.post("/admin/payments/register")
async def register_manual_payment(data: PaymentCreate, company: dict = Depends(get_current_company)):
    """Register a manual/cash payment from admin dashboard"""
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"company_id": company_id, "tenant_id": data.tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")

    payment_id = generate_uuid()
    now = datetime.now(timezone.utc)
    count = await db.kiosk_payments.count_documents({"company_id": company_id})
    kwitantie_nummer = f"KW{now.year}-{str(count + 1).zfill(5)}"

    # Covered months calculation for rent — uses payment-history-aware helper
    covered_months = []
    if data.payment_type in ["rent", "partial_rent", "monthly_rent"]:
        monthly_rent = tenant.get("monthly_rent", 0)
        outstanding = tenant.get("outstanding_rent", 0)
        billed_through = tenant.get("rent_billed_through", "")
        months_backward = await _compute_unpaid_months(company_id, data.tenant_id, billed_through, monthly_rent, outstanding)

        # Allocate payment across months, oldest first
        pay_amount = float(data.amount)
        for m in months_backward:
            if pay_amount <= 0:
                break
            needed = m["remaining"]
            if needed <= 0:
                continue
            if pay_amount >= needed - 0.01:
                covered_months.append(m["label"])
                pay_amount -= needed
            else:
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
        "currency": (tenant.get("currency") or "SRD").upper(),
        "payment_type": data.payment_type,
        "payment_method": data.payment_method or "cash",
        "description": data.description or "Handmatige betaling",
        "rent_month": data.rent_month,
        "covered_months": covered_months,
        "kwitantie_nummer": kwitantie_nummer,
        "status": "approved",
        "approved_at": now,
        "processed_by": data.processed_by or company.get("name", "Beheerder"),
        "processed_by_role": data.processed_by_role or "beheerder",
        "approved_by": data.processed_by or company.get("name", "Beheerder"),
        "created_at": now
    }

    # Auto-apply balance updates (admin dashboard = beheerder, trusted)
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
    payment["remaining_rent"] = updated_tenant.get("outstanding_rent", 0) if updated_tenant else 0
    payment["remaining_service"] = updated_tenant.get("service_costs", 0) if updated_tenant else 0
    payment["remaining_fines"] = updated_tenant.get("fines", 0) if updated_tenant else 0
    payment["remaining_internet"] = updated_tenant.get("internet_outstanding", 0) if updated_tenant else 0

    await db.kiosk_payments.insert_one(payment)

    # Send WhatsApp confirmation
    try:
        tenant_phone = tenant.get("phone") or tenant.get("telefoon", "")
        if tenant_phone:
            comp_name = company.get("stamp_company_name") or company.get("name", "")
            type_labels = {"rent": "Huurbetaling", "partial_rent": "Gedeeltelijke betaling", "service_costs": "Servicekosten", "fines": "Boetes", "deposit": "Borg", "internet": "Internet"}
            type_label = type_labels.get(data.payment_type, data.payment_type)
            cur_label = (tenant.get("currency") or "SRD").upper()
            covered_str = ", ".join(covered_months)
            total_remaining = payment["remaining_rent"] + payment["remaining_service"] + payment["remaining_fines"] + payment["remaining_internet"]
            if total_remaining <= 0:
                wa_msg = (f"Beste {tenant['name']},\n\n"
                          f"Uw betaling van {cur_label} {data.amount:,.2f} ({type_label}) is ontvangen.\n"
                          f"Kwitantie: {kwitantie_nummer}\n"
                          f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                          f"Uw saldo is nu VOLLEDIG VOLDAAN.\n\nBedankt voor uw betaling!\n{comp_name}")
            else:
                wa_msg = (f"Beste {tenant['name']},\n\n"
                          f"Uw betaling van {cur_label} {data.amount:,.2f} ({type_label}) is ontvangen.\n"
                          f"Kwitantie: {kwitantie_nummer}\n"
                          f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                          f"Resterend saldo: {cur_label} {total_remaining:,.2f}\n\nMet vriendelijke groet,\n{comp_name}")
            await _send_message_auto(company_id, tenant_phone, wa_msg, data.tenant_id, tenant["name"], "payment_confirmation")
    except Exception:
        pass

    return {
        "payment_id": payment_id,
        "kwitantie_nummer": kwitantie_nummer,
        "amount": data.amount,
        "payment_type": data.payment_type,
        "payment_method": data.payment_method,
        "tenant_name": tenant["name"],
        "apartment_number": tenant.get("apartment_number", ""),
        "status": "approved",
        "remaining_rent": payment.get("remaining_rent", 0),
        "remaining_service": payment.get("remaining_service", 0),
        "remaining_fines": payment.get("remaining_fines", 0),
        "remaining_internet": payment.get("remaining_internet", 0),
        "created_at": now.isoformat(),
        "covered_months": covered_months
    }


class ApprovePaymentData(BaseModel):
    approved_by: Optional[str] = None
    signature: Optional[str] = None  # base64 signature image

@router.post("/admin/payments/{payment_id}/approve")
async def approve_payment(payment_id: str, data: ApprovePaymentData = None, company: dict = Depends(get_current_company)):
    """Approve a pending payment - updates tenant balances and sends WhatsApp"""
    if data is None:
        data = ApprovePaymentData()
    company_id = company["company_id"]
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id, "company_id": company_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    if payment.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Betaling is al goedgekeurd")

    tenant = await db.kiosk_tenants.find_one({"tenant_id": payment["tenant_id"], "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")

    now = datetime.now(timezone.utc)
    amount = payment["amount"]
    payment_type = payment["payment_type"]

    # Update tenant balances
    update_fields = {}
    if payment_type in ["rent", "partial_rent"]:
        update_fields["outstanding_rent"] = max(0, tenant.get("outstanding_rent", 0) - amount)
    elif payment_type == "service_costs":
        update_fields["service_costs"] = max(0, tenant.get("service_costs", 0) - amount)
    elif payment_type == "fines":
        update_fields["fines"] = max(0, tenant.get("fines", 0) - amount)
    elif payment_type == "internet":
        update_fields["internet_outstanding"] = max(0, tenant.get("internet_outstanding", 0) - amount)
    elif payment_type == "deposit":
        update_fields["deposit_paid"] = tenant.get("deposit_paid", 0) + amount
    if update_fields:
        update_fields["updated_at"] = now
        await db.kiosk_tenants.update_one({"tenant_id": payment["tenant_id"]}, {"$set": update_fields})

    # Get updated balances
    updated_tenant = await db.kiosk_tenants.find_one({"tenant_id": payment["tenant_id"]})
    remaining_rent = updated_tenant.get("outstanding_rent", 0) if updated_tenant else 0
    remaining_service = updated_tenant.get("service_costs", 0) if updated_tenant else 0
    remaining_fines = updated_tenant.get("fines", 0) if updated_tenant else 0
    remaining_internet = updated_tenant.get("internet_outstanding", 0) if updated_tenant else 0

    # Update payment status + store remaining balances + approval info
    approve_update = {
        "status": "approved",
        "approved_at": now,
        "remaining_rent": remaining_rent,
        "remaining_service": remaining_service,
        "remaining_fines": remaining_fines,
        "remaining_internet": remaining_internet,
    }
    if data.approved_by:
        approve_update["approved_by"] = data.approved_by
    if data.signature:
        approve_update["approval_signature"] = data.signature
    await db.kiosk_payments.update_one(
        {"payment_id": payment_id},
        {"$set": approve_update}
    )

    # Send WhatsApp confirmation
    total_remaining = remaining_rent + remaining_service + remaining_fines + remaining_internet
    comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    comp_name = (comp.get("stamp_company_name") or comp.get("name", "")) if comp else ""
    type_labels = {"rent": "Huurbetaling", "partial_rent": "Gedeeltelijke betaling", "service_costs": "Servicekosten", "fines": "Boetes", "deposit": "Borg", "internet": "Internet"}
    type_label = type_labels.get(payment_type, payment_type)
    covered_str = ", ".join(payment.get("covered_months", []))

    if total_remaining <= 0:
        wa_msg = (f"Beste {tenant['name']},\n\n"
                  f"Uw betaling van SRD {amount:,.2f} ({type_label}) is goedgekeurd.\n"
                  f"Kwitantie: {payment['kwitantie_nummer']}\n"
                  f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                  f"Uw saldo is nu VOLLEDIG VOLDAAN.\n\nBedankt voor uw betaling!\n{comp_name}")
    else:
        wa_msg = (f"Beste {tenant['name']},\n\n"
                  f"Uw betaling van SRD {amount:,.2f} ({type_label}) is goedgekeurd.\n"
                  f"Kwitantie: {payment['kwitantie_nummer']}\n"
                  f"{('Periode: ' + covered_str + chr(10)) if covered_str else ''}\n"
                  f"Resterend saldo: SRD {total_remaining:,.2f}\n\nMet vriendelijke groet,\n{comp_name}")

    if tenant.get("phone") or tenant.get("telefoon"):
        tenant_phone = tenant.get("phone") or tenant.get("telefoon", "")
        await _send_message_auto(company_id, tenant_phone, wa_msg, payment["tenant_id"], tenant["name"], "payment_confirmation")

    # Web Push to staff devices
    try:
        from .push import send_push_to_company
        asyncio.create_task(send_push_to_company(
            company_id,
            title="Kwitantie goedgekeurd",
            body=f"{tenant['name']} • SRD {amount:,.2f} • {payment['kwitantie_nummer']}",
            url="/vastgoed",
            tag=f"approved-{payment_id}",
        ))
    except Exception:
        pass

    return {"message": "Betaling goedgekeurd", "status": "approved"}


@router.post("/admin/payments/{payment_id}/reject")
async def reject_payment(payment_id: str, company: dict = Depends(get_current_company)):
    """Reject a pending payment"""
    company_id = company["company_id"]
    payment = await db.kiosk_payments.find_one({"payment_id": payment_id, "company_id": company_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    if payment.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Goedgekeurde betaling kan niet worden afgewezen")

    await db.kiosk_payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Betaling afgewezen", "status": "rejected"}
