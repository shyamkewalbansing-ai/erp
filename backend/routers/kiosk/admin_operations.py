from .base import *

import hashlib as _hashlib

# ============== APPLY FINES ==============

@router.post("/admin/apply-fines")
async def apply_fines(company: dict = Depends(get_current_company)):
    """Apply fines to all tenants with outstanding rent past the billing day"""
    company_id = company["company_id"]
    billing_day = company.get("billing_day", 1)
    fine_amount = company.get("fine_amount", 0)
    
    if fine_amount <= 0:
        raise HTTPException(status_code=400, detail="Boetebedrag is niet ingesteld")
    
    now = datetime.now(timezone.utc)
    current_day = now.day
    
    # Only apply if we're past the billing day
    if current_day <= billing_day:
        raise HTTPException(status_code=400, detail=f"Boetes kunnen pas na dag {billing_day} worden toegepast")
    
    # Find all tenants with outstanding rent
    tenants = await db.kiosk_tenants.find({
        "company_id": company_id,
        "status": "active",
        "outstanding_rent": {"$gt": 0}
    }).to_list(1000)
    
    updated_count = 0
    comp_name = company.get("stamp_company_name") or company.get("name", "")
    for tenant in tenants:
        # Add fine to existing fines
        current_fines = tenant.get("fines", 0)
        new_fines = current_fines + fine_amount
        await db.kiosk_tenants.update_one(
            {"tenant_id": tenant["tenant_id"]},
            {"$set": {
                "fines": new_fines,
                "updated_at": now
            }}
        )
        updated_count += 1
        
        # === AUTO WHATSAPP: Boete opgelegd notificatie ===
        try:
            t_phone = tenant.get("phone") or tenant.get("telefoon", "")
            if t_phone:
                total_debt = tenant.get("outstanding_rent", 0) + tenant.get("service_costs", 0) + new_fines
                wa_fine_msg = (f"Beste {tenant['name']},\n\n"
                               f"Er is een boete van SRD {fine_amount:,.2f} toegepast op uw account.\n"
                               f"Reden: Achterstallige huur niet tijdig betaald.\n"
                               f"Totaal boetes: SRD {new_fines:,.2f}\n"
                               f"Totaal openstaand: SRD {total_debt:,.2f}\n\n"
                               f"Gelieve zo spoedig mogelijk te betalen.\n\n"
                               f"Met vriendelijke groet,\n{comp_name}")
                await _send_message_auto(
                    company_id, t_phone, wa_fine_msg,
                    tenant["tenant_id"], tenant["name"], "fine_applied"
                )
        except Exception:
            pass  # Notificatie mag hoofdflow niet breken
    
    # Single summary push to staff
    try:
        await _push_fine_summary(company_id, updated_count, fine_amount)
    except Exception:
        pass

    return {
        "message": f"Boetes toegepast op {updated_count} huurders",
        "amount_per_tenant": fine_amount,
        "tenants_affected": updated_count
    }


async def _push_fine_summary(company_id: str, updated_count: int, fine_amount: float):
    if updated_count <= 0:
        return
    try:
        from .push import send_push_to_company
        await send_push_to_company(
            company_id,
            title="Achterstallige huur - Boetes toegepast",
            body=f"{updated_count} huurder(s) • SRD {fine_amount:,.2f} per huurder",
            url="/vastgoed",
            tag="fines-applied",
        )
    except Exception:
        pass


@router.post("/admin/tenants/{tenant_id}/advance-month")
async def advance_tenant_month(tenant_id: str, company: dict = Depends(get_current_company)):
    """Manually advance tenant billing to next month: adds monthly_rent to outstanding"""
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    monthly_rent = tenant.get("monthly_rent", 0)
    outstanding = tenant.get("outstanding_rent", 0)
    billed_through = tenant.get("rent_billed_through", "")
    
    if not billed_through:
        billed_through = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Advance to next month
    billed_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
    next_month = billed_date + relativedelta(months=1)
    new_billed = next_month.strftime("%Y-%m")
    new_outstanding = outstanding + monthly_rent
    
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "outstanding_rent": new_outstanding,
            "rent_billed_through": new_billed,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Format month name
    month_names_nl = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
    month_label = f"{month_names_nl[next_month.month - 1]} {next_month.year}"
    
    return {
        "message": f"Huur voor {month_label} toegevoegd",
        "rent_billed_through": new_billed,
        "outstanding_rent": new_outstanding,
        "monthly_rent_added": monthly_rent
    }


@router.post("/admin/tenants/{tenant_id}/reset-to-current-month")
async def reset_tenant_to_current_month(tenant_id: str, company: dict = Depends(get_current_company)):
    """Reset tenant's billing status back to the current real-world month.
    Useful when `rent_billed_through` was accidentally advanced too far into the future.
    Subtracts `months_ahead * monthly_rent` from outstanding_rent (and internet_outstanding
    proportionally) and sets `rent_billed_through` to the current month. Clamps at 0 so
    the tenant never goes into negative outstanding.
    """
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")

    billed_through = tenant.get("rent_billed_through", "")
    if not billed_through:
        raise HTTPException(status_code=400, detail="Huurder heeft nog geen factureringsmaand")

    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    if billed_through <= current_month:
        raise HTTPException(status_code=400, detail="Huurder is niet vooruit gefactureerd")

    billed_date = datetime.strptime(billed_through + "-01", "%Y-%m-%d")
    current_date = datetime.strptime(current_month + "-01", "%Y-%m-%d")
    months_ahead = (billed_date.year - current_date.year) * 12 + (billed_date.month - current_date.month)

    monthly_rent = float(tenant.get("monthly_rent", 0) or 0)
    internet_cost = float(tenant.get("internet_cost", 0) or 0)
    outstanding = float(tenant.get("outstanding_rent", 0) or 0)
    internet_outstanding = float(tenant.get("internet_outstanding", 0) or 0)

    rent_refund = monthly_rent * months_ahead
    internet_refund = internet_cost * months_ahead

    new_outstanding = max(0.0, outstanding - rent_refund)
    new_internet_outstanding = max(0.0, internet_outstanding - internet_refund)

    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "outstanding_rent": new_outstanding,
            "internet_outstanding": new_internet_outstanding,
            "rent_billed_through": current_month,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    month_names_nl = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
    cur_label = f"{month_names_nl[current_date.month - 1]} {current_date.year}"
    return {
        "message": f"Factureringsstatus hersteld naar {cur_label} ({months_ahead} maand(en) teruggedraaid)",
        "months_rolled_back": months_ahead,
        "rent_billed_through": current_month,
        "rent_refunded": rent_refund,
        "internet_refunded": internet_refund,
        "outstanding_rent": new_outstanding,
        "internet_outstanding": new_internet_outstanding,
    }


@router.post("/admin/tenants/reset-all-to-previous-month")
async def reset_all_tenants_to_previous_month(company: dict = Depends(get_current_company)):
    """Bulk reset: Zet alle actieve huurders met billed_through = huidige_maand terug
    naar de VORIGE maand — maar alleen als de vervaldag nog niet gepasseerd is.
    
    Gebruikscase (arrears workflow): Je incasseert in april de huur van maart.
    Als de engine al te vroeg april heeft toegevoegd (door oude settings), zet deze
    knop alle huurders in één klap terug naar maart — zodat de achterstand consistent is.
    
    De outstanding wordt NIET aangepast wanneer billed_through=current_month (geen rent
    refund, want april was nog niet "te innen"). Voor tenants die 2+ maanden vooruit staan
    gebruik de per-tenant "Reset" knop in de huurder modal.
    """
    import calendar as _cal
    company_id = company["company_id"]
    billing_day = int(company.get("billing_day", 1) or 1)
    billing_next_month = bool(company.get("billing_next_month", True))

    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    prev_month = (now - relativedelta(months=1)).strftime("%Y-%m")

    # Bereken vervaldag voor de huidige maand. Als vervaldag nog niet gepasseerd is,
    # mag je billed_through terugzetten naar prev_month.
    if billing_next_month:
        due_month = datetime(now.year, now.month, 1)
    else:
        due_month = datetime(now.year, now.month, 1) - relativedelta(months=1)
    last_day = _cal.monthrange(due_month.year, due_month.month)[1]
    due_date = due_month.replace(day=min(billing_day, last_day), tzinfo=timezone.utc)

    if now >= due_date:
        month_names_nl = ["januari", "februari", "maart", "april", "mei", "juni",
                          "juli", "augustus", "september", "oktober", "november", "december"]
        due_label = f"{due_date.day} {month_names_nl[due_date.month - 1]}"
        raise HTTPException(
            status_code=400,
            detail=f"Vervaldag ({due_label}) is al gepasseerd. Huurders kunnen niet meer terug — huidige maand is officieel achterstallig.",
        )

    # Zoek tenants op current_month → reset naar prev_month
    tenants = await db.kiosk_tenants.find({
        "company_id": company_id,
        "status": "active",
        "rent_billed_through": current_month,
    }).to_list(2000)

    adjusted = 0
    for t in tenants:
        monthly_rent = float(t.get("monthly_rent", 0) or 0)
        internet_cost = float(t.get("internet_cost", 0) or 0)
        outstanding = float(t.get("outstanding_rent", 0) or 0)
        internet_outstanding = float(t.get("internet_outstanding", 0) or 0)

        # Subtract the prematurely-added rent (current maand was te vroeg toegevoegd)
        new_outstanding = max(0.0, outstanding - monthly_rent)
        new_internet = max(0.0, internet_outstanding - internet_cost)

        await db.kiosk_tenants.update_one(
            {"tenant_id": t["tenant_id"]},
            {"$set": {
                "rent_billed_through": prev_month,
                "outstanding_rent": new_outstanding,
                "internet_outstanding": new_internet,
                "updated_at": datetime.now(timezone.utc),
            }},
        )
        adjusted += 1

    month_names_nl = ["januari", "februari", "maart", "april", "mei", "juni",
                      "juli", "augustus", "september", "oktober", "november", "december"]
    pd = datetime.strptime(prev_month + "-01", "%Y-%m-%d")
    prev_label = f"{month_names_nl[pd.month - 1]} {pd.year}"
    return {
        "message": f"{adjusted} huurder(s) teruggezet naar {prev_label}",
        "target_month": prev_month,
        "adjusted": adjusted,
    }


# ============== LEASE AGREEMENTS ==============

@router.get("/admin/leases")
async def list_leases(company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    leases = await db.kiosk_leases.find(
        {"company_id": company_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return leases

@router.post("/admin/leases")
async def create_lease(data: LeaseCreate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    apt = await db.kiosk_apartments.find_one({"apartment_id": data.apartment_id, "company_id": company_id})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")

    now = datetime.now(timezone.utc)
    lease = {
        "lease_id": generate_uuid(),
        "company_id": company_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "apartment_id": data.apartment_id,
        "apartment_number": apt["number"],
        "start_date": data.start_date,
        "end_date": data.end_date,
        "monthly_rent": data.monthly_rent,
        "voorwaarden": data.voorwaarden or "",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await db.kiosk_leases.insert_one(lease)
    lease.pop("_id", None)
    
    # === AUTO WHATSAPP: Nieuw huurcontract notificatie ===
    try:
        t_phone = tenant.get("phone") or tenant.get("telefoon", "")
        if t_phone:
            comp_name = company.get("stamp_company_name") or company.get("name", "")
            months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            def _fmt_date(d):
                try:
                    dt = datetime.strptime(d, "%Y-%m-%d")
                    return f"{dt.day} {months_nl[dt.month-1]} {dt.year}"
                except Exception:
                    return d
            wa_lease_msg = (f"Beste {tenant['name']},\n\n"
                            f"Er is een nieuw huurcontract aangemaakt voor appartement {apt['number']}.\n"
                            f"Periode: {_fmt_date(data.start_date)} t/m {_fmt_date(data.end_date)}\n"
                            f"Maandhuur: SRD {data.monthly_rent:,.2f}\n\n"
                            f"Met vriendelijke groet,\n{comp_name}")
            await _send_message_auto(
                company_id, t_phone, wa_lease_msg,
                data.tenant_id, tenant["name"], "lease_created"
            )
    except Exception:
        pass  # Notificatie mag hoofdflow niet breken
    
    return lease

@router.put("/admin/leases/{lease_id}")
async def update_lease(lease_id: str, data: LeaseUpdate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    existing = await db.kiosk_leases.find_one({"lease_id": lease_id, "company_id": company_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Huurovereenkomst niet gevonden")

    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.kiosk_leases.update_one({"lease_id": lease_id}, {"$set": updates})
    updated = await db.kiosk_leases.find_one({"lease_id": lease_id}, {"_id": 0})
    return updated

@router.delete("/admin/leases/{lease_id}")
async def delete_lease(lease_id: str, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    result = await db.kiosk_leases.delete_one({"lease_id": lease_id, "company_id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurovereenkomst niet gevonden")
    return {"message": "Huurovereenkomst verwijderd"}

@router.get("/admin/leases/{lease_id}/document")
async def generate_lease_document(lease_id: str, token: Optional[str] = None):
    """Generate professional Suriname lease document HTML with company stamp"""
    if not token:
        raise HTTPException(status_code=401, detail="Token vereist")
    try:
        payload = decode_token(token)
        company_id = payload["company_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")
    lease = await db.kiosk_leases.find_one({"lease_id": lease_id, "company_id": company_id}, {"_id": 0})
    if not lease:
        raise HTTPException(status_code=404, detail="Huurovereenkomst niet gevonden")
    
    comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    company_name = comp.get("name", "Onbekend") if comp else "Onbekend"
    company_address = comp.get("adres") or "Paramaribo, Suriname" if comp else "Paramaribo, Suriname"
    company_phone = comp.get("telefoon") or "" if comp else ""
    company_email = comp.get("email") or "" if comp else ""
    
    # Use official stamp from settings
    stamp_name = comp.get("stamp_company_name") or company_name if comp else company_name
    stamp_address = comp.get("stamp_address") or company_address if comp else company_address
    stamp_phone_val = comp.get("stamp_phone") or company_phone if comp else company_phone
    
    # Company billing/power settings for lease
    billing_day = comp.get("billing_day", 1) if comp else 1
    billing_next_month = comp.get("billing_next_month", True) if comp else True
    power_cutoff_days = comp.get("power_cutoff_days", 0) if comp else 0
    fine_amount = comp.get("fine_amount", 0) if comp else 0
    stamp_whatsapp = comp.get("stamp_whatsapp") or "" if comp else ""
    
    # Build betalingswijze text from settings
    if billing_next_month:
        betalingswijze = f"Per maand, bij vooruitbetaling v&oacute;&oacute;r de {billing_day}e van de volgende kalendermaand"
    else:
        betalingswijze = f"Per maand, bij vooruitbetaling v&oacute;&oacute;r de {billing_day}e van elke kalendermaand"
    
    # Build boete text
    if fine_amount > 0:
        boete_text = f' en is Huurder een boete verschuldigd van <span class="field">SRD {fine_amount:,.2f}</span> per maand'
    else:
        boete_text = ' en is Huurder een boete verschuldigd conform de geldende bedrijfsvoorwaarden van Verhuurder'
    
    # Build stroombreker article
    if power_cutoff_days > 0:
        dagen_text = f"{power_cutoff_days} dag{'en' if power_cutoff_days != 1 else ''}"
        stroombreker_html = f"""
<div class="artikel">
  <h2>Artikel 4b &mdash; Stroomonderbreking bij Wanbetaling</h2>
  <p>Indien Huurder niet binnen <span class="field">{dagen_text}</span> na de vervaldatum aan de betalingsverplichting heeft voldaan, is Verhuurder gerechtigd de stroomtoevoer naar het gehuurde automatisch te onderbreken tot het volledige openstaande bedrag is voldaan. Huurder erkent dit recht van Verhuurder en kan hieraan geen aanspraken op schadevergoeding ontlenen.</p>
</div>"""
    else:
        stroombreker_html = ""
    
    # Build stamp phone/whatsapp lines
    stamp_phone_line = f'<p style="color:#1a1a1a;font-size:8pt;margin:0;">Tel: {stamp_phone_val}</p>' if stamp_phone_val else ''
    stamp_wa_line = f'<p style="color:#1a1a1a;font-size:8pt;margin:0;">WhatsApp: {stamp_whatsapp}</p>' if stamp_whatsapp else ''
    
    tenant_name = lease.get("tenant_name", "")
    apartment_number = lease.get("apartment_number", "")
    start_date = lease.get("start_date", "")
    end_date = lease.get("end_date", "")
    monthly_rent = lease.get("monthly_rent", 0)
    voorwaarden = lease.get("voorwaarden", "")
    
    # Format dates to Dutch
    def fmt_date(d):
        if not d:
            return "-"
        try:
            dt = datetime.strptime(d, "%Y-%m-%d")
            months = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
            return f"{dt.day} {months[dt.month-1]} {dt.year}"
        except Exception:
            return d
    
    start_fmt = fmt_date(start_date)
    end_fmt = fmt_date(end_date)
    gen_date = datetime.now(timezone.utc).strftime('%d-%m-%Y')
    
    # Company initials for stamp - use stamp name from settings
    initials = "".join([w[0] for w in stamp_name.split()[:3] if w]).upper()

    html = f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Huurovereenkomst - {tenant_name}</title>
<style>
  @page {{ size: A4; margin: 25mm 20mm 25mm 20mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 30px 40px;
    background: #fff;
  }}
  
  /* Header / Briefhoofd */
  .letterhead {{
    border-bottom: 3px double #2c3e50;
    padding-bottom: 20px;
    margin-bottom: 30px;
    position: relative;
  }}
  .letterhead-left {{
    display: inline-block;
    vertical-align: top;
    width: 60%;
  }}
  .company-name {{
    font-size: 22pt;
    font-weight: bold;
    color: #2c3e50;
    letter-spacing: 1px;
    text-transform: uppercase;
  }}
  .company-subtitle {{
    font-size: 9pt;
    color: #7f8c8d;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
  }}
  .company-details {{
    font-size: 9pt;
    color: #555;
    margin-top: 8px;
    line-height: 1.5;
  }}
  .letterhead-right {{
    display: inline-block;
    vertical-align: top;
    width: 38%;
    text-align: right;
  }}
  
  /* Document titel */
  .doc-title {{
    text-align: center;
    margin: 25px 0 10px 0;
  }}
  .doc-title h1 {{
    font-size: 18pt;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #2c3e50;
    border-top: 1px solid #bdc3c7;
    border-bottom: 1px solid #bdc3c7;
    padding: 8px 0;
    display: inline-block;
  }}
  .doc-subtitle {{
    text-align: center;
    font-size: 10pt;
    color: #7f8c8d;
    margin-bottom: 25px;
  }}
  
  /* Artikelen */
  .artikel {{
    margin-bottom: 20px;
    page-break-inside: avoid;
  }}
  .artikel h2 {{
    font-size: 11pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #2c3e50;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }}
  .artikel p {{
    font-size: 11pt;
    text-align: justify;
    margin-bottom: 6px;
  }}
  .artikel .field {{
    font-weight: bold;
  }}
  
  /* Data tabel */
  .data-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 11pt;
  }}
  .data-table td {{
    padding: 8px 12px;
    border: 1px solid #d5d8dc;
    vertical-align: top;
  }}
  .data-table td:first-child {{
    background: #f8f9fa;
    font-weight: bold;
    width: 180px;
    color: #2c3e50;
  }}
  
  /* Voorwaarden */
  .voorwaarden-box {{
    background: #fafbfc;
    border: 1px solid #d5d8dc;
    border-left: 4px solid #2c3e50;
    padding: 15px 18px;
    font-size: 10.5pt;
    line-height: 1.7;
    white-space: pre-wrap;
    margin: 10px 0;
  }}
  
  /* Handtekeningen */
  .signatures-section {{
    margin-top: 50px;
    page-break-inside: avoid;
  }}
  .sig-row {{
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
  }}
  .sig-block {{
    width: 42%;
    text-align: center;
  }}
  .sig-space {{
    height: 90px;
    border-bottom: 1px solid #333;
    margin-bottom: 5px;
    position: relative;
  }}
  .sig-label {{
    font-size: 10pt;
    color: #555;
  }}
  .sig-name {{
    font-size: 11pt;
    font-weight: bold;
    margin-top: 3px;
  }}
  .sig-date {{
    font-size: 9pt;
    color: #999;
    margin-top: 2px;
  }}
  
  /* Bedrijfsstempel */
  .stamp {{
    position: relative;
    display: inline-block;
    margin-top: 15px;
  }}
  .stamp-rect {{
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border: 3px solid #991b1b;
    padding: 12px 18px;
    transform: rotate(-5deg);
    opacity: 0.8;
    background: rgba(255,255,255,0.5);
  }}
  .stamp-house {{
    flex-shrink: 0;
  }}
  .stamp-info p {{
    margin: 0;
    line-height: 1.4;
  }}
  .stamp-info .stamp-name {{
    color: #991b1b;
    font-weight: bold;
    font-size: 10pt;
  }}
  .stamp-info .stamp-detail {{
    color: #1a1a1a;
    font-size: 9pt;
    font-weight: 500;
  }}
  
  /* Footer */
  .doc-footer {{
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    font-size: 8pt;
    color: #aaa;
    text-align: center;
    line-height: 1.5;
  }}
  
  /* Print */
  @media print {{
    body {{ padding: 0; margin: 0; }}
    .no-print {{ display: none; }}
  }}
  
  /* Print button */
  .print-bar {{
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #2c3e50;
    padding: 10px 20px;
    text-align: center;
    z-index: 1000;
  }}
  .print-bar button {{
    background: #e67e22;
    color: white;
    border: none;
    padding: 8px 30px;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin: 0 5px;
  }}
  .print-bar button:hover {{ background: #d35400; }}
</style>
</head>
<body>
<div class="print-bar no-print">
  <button onclick="window.print()">Afdrukken / Print</button>
  <button onclick="window.close()">Sluiten</button>
</div>

<div style="margin-top: 50px;">

<!-- BRIEFHOOFD -->
<div class="letterhead">
  <div class="letterhead-left">
    <div class="company-name">{company_name}</div>
    <div class="company-subtitle">Vastgoedbeheer &amp; Verhuur</div>
    <div class="company-details">
      {company_address}<br/>
      {('Tel: ' + company_phone + '<br/>') if company_phone else ''}
      {('E-mail: ' + company_email) if company_email else ''}
    </div>
  </div>
  <div class="letterhead-right">
    <div style="font-size: 9pt; color: #555; line-height: 1.5; text-align: right;">
      <div style="font-size: 11pt; font-weight: bold; color: #2c3e50;">Overeenkomst</div>
      <div>Datum: {gen_date}</div>
      <div>Nr. {lease_id[:8].upper()}</div>
    </div>
  </div>
</div>

<!-- TITEL -->
<div class="doc-title">
  <h1>Huurovereenkomst</h1>
</div>
<div class="doc-subtitle">
  Woonruimte &mdash; Overeenkomst Nr. {lease_id[:8].upper()}
</div>

<!-- ARTIKEL 1: PARTIJEN -->
<div class="artikel">
  <h2>Artikel 1 &mdash; De Ondergetekenden</h2>
  <p>De ondergetekenden:</p>
  <table class="data-table">
    <tr><td>Verhuurder</td><td><span class="field">{company_name}</span>, gevestigd te {company_address or 'Paramaribo, Suriname'}, hierna te noemen "Verhuurder"</td></tr>
    <tr><td>Huurder</td><td><span class="field">{tenant_name}</span>, hierna te noemen "Huurder"</td></tr>
  </table>
  <p>Zijn overeengekomen als volgt:</p>
</div>

<!-- ARTIKEL 2: HET GEHUURDE -->
<div class="artikel">
  <h2>Artikel 2 &mdash; Het Gehuurde</h2>
  <p>Verhuurder verhuurt aan Huurder en Huurder huurt van Verhuurder het navolgende:</p>
  <table class="data-table">
    <tr><td>Object</td><td>Appartement <span class="field">{apartment_number}</span></td></tr>
    <tr><td>Adres</td><td>{company_address or 'Paramaribo, Suriname'}</td></tr>
    <tr><td>Bestemming</td><td>Uitsluitend als woonruimte ten behoeve van Huurder</td></tr>
  </table>
</div>

<!-- ARTIKEL 3: HUURPERIODE -->
<div class="artikel">
  <h2>Artikel 3 &mdash; Duur van de Overeenkomst</h2>
  <p>Deze huurovereenkomst is aangegaan voor de volgende periode:</p>
  <table class="data-table">
    <tr><td>Ingangsdatum</td><td><span class="field">{start_fmt}</span></td></tr>
    <tr><td>Einddatum</td><td><span class="field">{end_fmt}</span></td></tr>
  </table>
  <p>Na afloop van de hierboven genoemde periode wordt de overeenkomst voortgezet voor onbepaalde tijd, tenzij een der partijen uiterlijk &eacute;&eacute;n (1) maand voor het verstrijken van enige termijn schriftelijk opzegt.</p>
</div>

<!-- ARTIKEL 4: HUURPRIJS -->
<div class="artikel">
  <h2>Artikel 4 &mdash; Huurprijs en Betaling</h2>
  <table class="data-table">
    <tr><td>Maandelijkse huur</td><td><span class="field">SRD {monthly_rent:,.2f}</span> (Surinaamse Dollar)</td></tr>
    <tr><td>Betalingswijze</td><td>{betalingswijze}</td></tr>
  </table>
  <p>Bij niet tijdige betaling is Huurder van rechtswege in verzuim{boete_text}.</p>
</div>

{stroombreker_html}

<!-- ARTIKEL 5: BORG -->
<div class="artikel">
  <h2>Artikel 5 &mdash; Waarborgsom</h2>
  <p>Huurder betaalt bij aanvang van de huurovereenkomst een waarborgsom ter grootte van <span class="field">&eacute;&eacute;n (1) maand huur</span>, zijnde <span class="field">SRD {monthly_rent:,.2f}</span>. Deze borg wordt na be&euml;indiging van de huurovereenkomst terugbetaald, onder aftrek van eventuele kosten of schade.</p>
</div>

<!-- ARTIKEL 6: VERPLICHTINGEN -->
<div class="artikel">
  <h2>Artikel 6 &mdash; Verplichtingen van de Huurder</h2>
  <p>Huurder verplicht zich:</p>
  <p style="padding-left: 20px;">
    a) het gehuurde als een goed huurder te gebruiken en te onderhouden;<br/>
    b) geen wijzigingen aan te brengen aan het gehuurde zonder schriftelijke toestemming van Verhuurder;<br/>
    c) het gehuurde uitsluitend te gebruiken voor het in Artikel 2 genoemde doel;<br/>
    d) geen overlast te veroorzaken aan medebewoners of omwonenden;<br/>
    e) de Verhuurder toegang te verlenen voor noodzakelijk onderhoud of inspectie, na voorafgaande kennisgeving.
  </p>
</div>

<!-- ARTIKEL 7: ONDERHOUD -->
<div class="artikel">
  <h2>Artikel 7 &mdash; Onderhoud en Reparaties</h2>
  <p>Klein onderhoud en dagelijkse reparaties komen voor rekening van Huurder. Groot onderhoud en structurele reparaties komen voor rekening van Verhuurder, tenzij de schade is veroorzaakt door toedoen of nalatigheid van Huurder.</p>
</div>

<!-- ARTIKEL 8: BEEINDIGING -->
<div class="artikel">
  <h2>Artikel 8 &mdash; Be&euml;indiging</h2>
  <p>Deze overeenkomst kan worden be&euml;indigd:</p>
  <p style="padding-left: 20px;">
    a) door het verstrijken van de overeengekomen termijn;<br/>
    b) door schriftelijke opzegging met inachtneming van een opzegtermijn van ten minste &eacute;&eacute;n (1) maand;<br/>
    c) door ontbinding wegens wanprestatie van een der partijen, waaronder begrepen het niet nakomen van de betalingsverplichtingen.
  </p>
</div>

{'<div class="artikel"><h2>Artikel 9 &mdash; Bijzondere Voorwaarden</h2><div class="voorwaarden-box">' + voorwaarden + '</div></div>' if voorwaarden else ''}

<!-- ARTIKEL 9/10: TOEPASSELIJK RECHT -->
<div class="artikel">
  <h2>Artikel {'10' if voorwaarden else '9'} &mdash; Toepasselijk Recht</h2>
  <p>Op deze huurovereenkomst is het <span class="field">Surinaams recht</span> van toepassing. Geschillen voortvloeiend uit deze overeenkomst worden voorgelegd aan de bevoegde rechter in het Kanton Paramaribo.</p>
</div>

<!-- ONDERTEKENING -->
<div class="signatures-section">
  <p style="font-size: 11pt; margin-bottom: 5px;">Aldus opgemaakt en ondertekend in tweevoud te <span class="field">Paramaribo</span>, op <span class="field">{gen_date}</span>.</p>
  
  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-space">
        <div style="position: absolute; top: -15px; left: 0; right: 0; transform: rotate(-4deg); opacity: 0.75;">
          <div class="stamp-rect" style="padding: 10px 16px; gap: 10px; border-width: 3px; display: inline-flex; align-items: center;">
            <svg width="40" height="36" viewBox="0 0 52 48" fill="none">
              <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
              <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
              <rect x="18" y="22" width="6" height="6" fill="white"/>
              <rect x="28" y="22" width="6" height="6" fill="white"/>
              <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
              <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
              <rect x="8" y="31" width="5" height="5" fill="white"/>
              <rect x="16" y="31" width="5" height="5" fill="white"/>
              <rect x="8" y="38" width="5" height="6" fill="white"/>
              <rect x="16" y="38" width="5" height="6" fill="white"/>
            </svg>
            <div style="line-height:1.3; text-align:left;">
              <p style="color:#991b1b;font-weight:bold;font-size:10pt;margin:0;">{stamp_name}</p>
              <p style="color:#1a1a1a;font-size:8pt;margin:0;">{stamp_address}</p>
              {stamp_phone_line}
              {stamp_wa_line}
            </div>
          </div>
        </div>
      </div>
      <div class="sig-label">Verhuurder</div>
      <div class="sig-name">{company_name}</div>
    </div>
    <div class="sig-block">
      <div class="sig-space"></div>
      <div class="sig-label">Huurder</div>
      <div class="sig-name">{tenant_name}</div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="doc-footer">
  {company_name} &bull; Vastgoedbeheer &bull; {company_address or 'Paramaribo, Suriname'}<br/>
  Overeenkomst-ID: {lease_id} &bull; Datum: {gen_date}
</div>

</div>
</body>
</html>"""
    
    return Response(content=html, media_type="text/html")



# ============== BANK/KAS ENDPOINTS ==============

@router.get("/admin/kas")
async def list_kas_entries(
    account_id: Optional[str] = None,
    currency: Optional[str] = None,
    company: dict = Depends(get_current_company),
):
    """List all cash register entries for a specific account, optionally filtered by currency."""
    company_id = company["company_id"]

    from .kas_accounts import _resolve_account
    acc = await _resolve_account(company_id, account_id)
    target_account_id = acc["account_id"]
    account_currencies = acc.get("currencies") or [acc.get("currency", "SRD")]

    # All kas entries for this account
    query = {"company_id": company_id, "account_id": target_account_id}
    if currency:
        cur_upper = currency.upper()
        query["$or"] = [
            {"currency": cur_upper},
            {"currency": {"$exists": False}} if cur_upper == account_currencies[0] else {"_always_no_match_": True},
        ]
    entries = await db.kiosk_kas.find(query).sort("created_at", -1).to_list(1000)

    # Group totals per currency
    totals_by_currency = {c: {"total_income": 0.0, "total_expense": 0.0, "balance": 0.0} for c in account_currencies}
    for e in entries:
        cur = (e.get("currency") or account_currencies[0]).upper()
        if cur not in totals_by_currency:
            totals_by_currency[cur] = {"total_income": 0.0, "total_expense": 0.0, "balance": 0.0}
        if e.get("entry_type") == "income":
            totals_by_currency[cur]["total_income"] += e.get("amount", 0)
        elif e.get("entry_type") in ("expense", "salary"):
            totals_by_currency[cur]["total_expense"] += e.get("amount", 0)

    # Hoofdkas: add payment income to SRD bucket
    if acc.get("is_default") and "SRD" in totals_by_currency and not currency:
        payments = await db.kiosk_payments.find({"company_id": company_id, "status": {"$in": ["approved", None]}}).to_list(10000)
        payment_income = sum(p.get("amount", 0) for p in payments if p.get("status", "approved") != "pending" and p.get("status") != "rejected")
        totals_by_currency["SRD"]["total_income"] += payment_income
    elif acc.get("is_default") and currency and currency.upper() == "SRD":
        payments = await db.kiosk_payments.find({"company_id": company_id, "status": {"$in": ["approved", None]}}).to_list(10000)
        payment_income = sum(p.get("amount", 0) for p in payments if p.get("status", "approved") != "pending" and p.get("status") != "rejected")
        totals_by_currency["SRD"]["total_income"] += payment_income

    for cur in totals_by_currency:
        totals_by_currency[cur]["balance"] = totals_by_currency[cur]["total_income"] - totals_by_currency[cur]["total_expense"]

    primary = account_currencies[0]
    active = (currency.upper() if currency else primary)
    active_totals = totals_by_currency.get(active, {"total_income": 0, "total_expense": 0, "balance": 0})

    result_entries = []
    for e in entries:
        result_entries.append({
            "entry_id": e["entry_id"],
            "entry_type": e["entry_type"],
            "amount": e["amount"],
            "currency": (e.get("currency") or primary).upper(),
            "description": e["description"],
            "category": e.get("category", ""),
            "related_tenant_name": e.get("related_tenant_name", ""),
            "related_employee_name": e.get("related_employee_name", ""),
            "payment_id": e.get("payment_id", ""),
            "exchange_id": e.get("exchange_id", ""),
            "exchange_direction": e.get("exchange_direction", ""),
            "exchange_rate": e.get("exchange_rate"),
            "exchange_counterparty_account_id": e.get("exchange_counterparty_account_id", ""),
            "exchange_counterparty_currency": e.get("exchange_counterparty_currency", ""),
            "exchange_counterparty_amount": e.get("exchange_counterparty_amount"),
            "created_at": e.get("created_at")
        })

    return {
        "entries": result_entries,
        "total_income": active_totals["total_income"],
        "total_expense": active_totals["total_expense"],
        "balance": active_totals["balance"],
        "totals_by_currency": totals_by_currency,
        "account_id": target_account_id,
        "account_name": acc.get("name"),
        "currency": active,
        "currencies": account_currencies,
    }

@router.post("/admin/kas")
async def create_kas_entry(data: CashEntryCreate, company: dict = Depends(get_current_company)):
    """Create a cash register entry"""
    entry_id = generate_uuid()
    now = datetime.now(timezone.utc)

    # Resolve account (default if not provided)
    from .kas_accounts import _resolve_account
    acc = await _resolve_account(company["company_id"], data.account_id)
    account_currencies = acc.get("currencies") or [acc.get("currency", "SRD")]

    # Resolve currency: use provided, fallback to account's primary, validate is allowed for this account
    entry_currency = (data.currency or account_currencies[0]).upper()
    if entry_currency not in account_currencies:
        raise HTTPException(status_code=400, detail=f"{entry_currency} is niet toegestaan voor deze kas. Toegestane valuta: {', '.join(account_currencies)}")

    entry = {
        "entry_id": entry_id,
        "company_id": company["company_id"],
        "account_id": acc["account_id"],
        "entry_type": data.entry_type,
        "amount": data.amount,
        "currency": entry_currency,
        "description": data.description,
        "category": data.category or ("rent" if data.entry_type == "income" else "other"),
        "related_tenant_id": data.related_tenant_id or "",
        "related_tenant_name": "",
        "related_employee_id": data.related_employee_id or "",
        "related_employee_name": "",
        "payment_id": data.payment_id or "",
        "created_at": now
    }
    
    # Look up related names
    if data.related_tenant_id:
        t = await db.kiosk_tenants.find_one({"tenant_id": data.related_tenant_id})
        if t:
            entry["related_tenant_name"] = t.get("name", "")
    if data.related_employee_id:
        emp = await db.kiosk_employees.find_one({"employee_id": data.related_employee_id})
        if emp:
            entry["related_employee_name"] = emp.get("name", "")
    
    await db.kiosk_kas.insert_one(entry)

    # === Web Push notification for income/expense entries ===
    try:
        from .push import send_push_to_company
        cur_label = entry_currency if entry_currency != "SRD" else "SRD"
        if data.entry_type == "income":
            push_title = "Inkomsten geregistreerd"
            push_body = f"{cur_label} {data.amount:,.2f} • {data.description or entry.get('category', 'Inkomsten')}"
            push_tag = f"kas-income-{entry_id}"
        elif data.entry_type in ("expense", "salary"):
            label = "Salaris uitbetaald" if data.entry_type == "salary" else "Uitgave geregistreerd"
            push_title = label
            push_body = f"{cur_label} {data.amount:,.2f} • {data.description or entry.get('category', 'Uitgave')}"
            push_tag = f"kas-{data.entry_type}-{entry_id}"
        else:
            push_title = None
        if push_title:
            asyncio.create_task(send_push_to_company(
                company["company_id"], title=push_title, body=push_body,
                url="/vastgoed", tag=push_tag
            ))
    except Exception:
        pass

    return {"entry_id": entry_id, "message": "Kas boeking aangemaakt"}

@router.delete("/admin/kas/{entry_id}")
async def delete_kas_entry(entry_id: str, company: dict = Depends(get_current_company)):
    """Delete a cash register entry"""
    result = await db.kiosk_kas.delete_one({"entry_id": entry_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Boeking niet gevonden")
    return {"message": "Boeking verwijderd"}


# ============== VERDELING (DISTRIBUTION) ENDPOINTS ==============

@router.get("/admin/verdeling/rekeninghouders")
async def list_rekeninghouders(company: dict = Depends(get_current_company)):
    """List all account holders for income distribution"""
    company_id = company["company_id"]
    holders = await db.kiosk_rekeninghouders.find({"company_id": company_id}).sort("created_at", 1).to_list(100)
    return [{
        "holder_id": h["holder_id"],
        "name": h["name"],
        "percentage": h["percentage"],
        "created_at": h.get("created_at")
    } for h in holders]

@router.post("/admin/verdeling/rekeninghouders")
async def create_rekeninghouder(data: RekeninghouderCreate, company: dict = Depends(get_current_company)):
    """Add an account holder for income distribution"""
    company_id = company["company_id"]
    
    if data.percentage <= 0 or data.percentage > 100:
        raise HTTPException(status_code=400, detail="Percentage moet tussen 0 en 100 liggen")
    
    # Check total percentage doesn't exceed 100
    existing = await db.kiosk_rekeninghouders.find({"company_id": company_id}).to_list(100)
    total_pct = sum(h.get("percentage", 0) for h in existing)
    if total_pct + data.percentage > 100:
        raise HTTPException(status_code=400, detail=f"Totaal percentage mag niet meer dan 100% zijn. Huidig: {total_pct}%, beschikbaar: {100 - total_pct}%")
    
    holder_id = generate_uuid()
    now = datetime.now(timezone.utc)
    await db.kiosk_rekeninghouders.insert_one({
        "holder_id": holder_id,
        "company_id": company_id,
        "name": data.name.strip(),
        "percentage": data.percentage,
        "created_at": now
    })
    return {"holder_id": holder_id, "message": "Rekeninghouder toegevoegd"}

@router.put("/admin/verdeling/rekeninghouders/{holder_id}")
async def update_rekeninghouder(holder_id: str, data: RekeninghouderUpdate, company: dict = Depends(get_current_company)):
    """Update an account holder"""
    company_id = company["company_id"]
    holder = await db.kiosk_rekeninghouders.find_one({"holder_id": holder_id, "company_id": company_id})
    if not holder:
        raise HTTPException(status_code=404, detail="Rekeninghouder niet gevonden")
    
    updates = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.percentage is not None:
        if data.percentage <= 0 or data.percentage > 100:
            raise HTTPException(status_code=400, detail="Percentage moet tussen 0 en 100 liggen")
        # Check total excluding this holder
        existing = await db.kiosk_rekeninghouders.find({"company_id": company_id, "holder_id": {"$ne": holder_id}}).to_list(100)
        total_pct = sum(h.get("percentage", 0) for h in existing)
        if total_pct + data.percentage > 100:
            raise HTTPException(status_code=400, detail=f"Totaal percentage mag niet meer dan 100% zijn. Overig: {total_pct}%, beschikbaar: {100 - total_pct}%")
        updates["percentage"] = data.percentage
    
    if updates:
        await db.kiosk_rekeninghouders.update_one({"holder_id": holder_id}, {"$set": updates})
    return {"message": "Rekeninghouder bijgewerkt"}

@router.delete("/admin/verdeling/rekeninghouders/{holder_id}")
async def delete_rekeninghouder(holder_id: str, company: dict = Depends(get_current_company)):
    """Delete an account holder"""
    result = await db.kiosk_rekeninghouders.delete_one({"holder_id": holder_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rekeninghouder niet gevonden")
    return {"message": "Rekeninghouder verwijderd"}

@router.get("/admin/verdeling/overzicht")
async def verdeling_overzicht(company: dict = Depends(get_current_company)):
    """Preview income distribution based on current rent income"""
    company_id = company["company_id"]
    
    # Calculate total rent income (same logic as kas endpoint) - ONLY approved
    payments = await db.kiosk_payments.find({
        "company_id": company_id,
        "status": {"$ne": "pending"}
    }).to_list(10000)
    payment_income = sum(p.get("amount", 0) for p in payments if p.get("status") != "rejected")
    
    kas_entries = await db.kiosk_kas.find({"company_id": company_id}).to_list(1000)
    manual_income = sum(e.get("amount", 0) for e in kas_entries if e.get("entry_type") == "income")
    total_income = payment_income + manual_income
    total_expense = sum(e.get("amount", 0) for e in kas_entries if e.get("entry_type") in ("expense", "salary"))
    
    holders = await db.kiosk_rekeninghouders.find({"company_id": company_id}).sort("created_at", 1).to_list(100)
    
    # Calculate distribution on huurinkomsten only
    huurinkomsten = payment_income
    total_pct = sum(h.get("percentage", 0) for h in holders)
    restant_pct = 100 - total_pct
    
    verdeling = []
    total_distributed = 0
    for h in holders:
        bedrag = round(huurinkomsten * h["percentage"] / 100, 2)
        total_distributed += bedrag
        verdeling.append({
            "holder_id": h["holder_id"],
            "name": h["name"],
            "percentage": h["percentage"],
            "bedrag": bedrag
        })
    
    restant_bedrag = round(huurinkomsten - total_distributed, 2)
    
    return {
        "huurinkomsten": huurinkomsten,
        "total_income": total_income,
        "total_expense": total_expense,
        "verdeling": verdeling,
        "restant_percentage": restant_pct,
        "restant_bedrag": restant_bedrag,
        "total_distributed": total_distributed
    }

@router.post("/admin/verdeling/uitvoeren")
async def verdeling_uitvoeren(data: VerdelingUitvoeren, company: dict = Depends(get_current_company)):
    """Execute income distribution — creates expense entries in kas for each holder"""
    company_id = company["company_id"]
    
    holders = await db.kiosk_rekeninghouders.find({"company_id": company_id}).to_list(100)
    if not holders:
        raise HTTPException(status_code=400, detail="Geen rekeninghouders ingesteld")
    
    # Calculate huurinkomsten - only approved payments
    payments = await db.kiosk_payments.find({
        "company_id": company_id,
        "status": {"$ne": "pending"}
    }).to_list(10000)
    huurinkomsten = sum(p.get("amount", 0) for p in payments if p.get("status") != "rejected")
    
    if huurinkomsten <= 0:
        raise HTTPException(status_code=400, detail="Geen huurinkomsten om te verdelen")
    
    now = datetime.now(timezone.utc)
    notitie = data.notitie or ""
    created_entries = []
    
    for h in holders:
        bedrag = round(huurinkomsten * h["percentage"] / 100, 2)
        if bedrag <= 0:
            continue
        entry_id = generate_uuid()
        entry = {
            "entry_id": entry_id,
            "company_id": company_id,
            "entry_type": "expense",
            "amount": bedrag,
            "description": f"Verdeling {h['percentage']}% aan {h['name']}" + (f" — {notitie}" if notitie else ""),
            "category": "verdeling",
            "related_tenant_id": "",
            "related_tenant_name": "",
            "related_employee_id": "",
            "related_employee_name": h["name"],
            "payment_id": "",
            "created_at": now
        }
        await db.kiosk_kas.insert_one(entry)
        created_entries.append({"entry_id": entry_id, "name": h["name"], "bedrag": bedrag})
    
    return {
        "message": f"Verdeling uitgevoerd: {len(created_entries)} uitbetalingen aangemaakt",
        "entries": created_entries,
        "totaal_verdeeld": sum(e["bedrag"] for e in created_entries)
    }


# ============== WERKNEMERS ENDPOINTS ==============

@router.get("/admin/employees")
async def list_employees(company: dict = Depends(get_current_company)):
    """List all employees with paid + open balance per current month"""
    company_id = company["company_id"]
    employees = await db.kiosk_employees.find({"company_id": company_id}).to_list(1000)

    # Compute current Suriname month label (e.g. "april 2026")
    from datetime import datetime as _dt
    _MONTHS_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
    _now = _dt.now(timezone.utc)
    # Approximate Suriname time (UTC-3) by subtracting 3 hours for month boundary check
    _sur = _now - timedelta(hours=3)
    current_period = f"{_MONTHS_NL[_sur.month - 1]} {_sur.year}"

    result = []
    for e in employees:
        emp_id = e["employee_id"]
        # All salary-related kas entries (loonstrook + voorschot), linked by id (new) OR name (legacy)
        payments = await db.kiosk_kas.find({
            "company_id": company_id,
            "$or": [
                {"category": {"$in": ["loon", "voorschot"]}},
                {"entry_type": "salary"},
            ],
            "$and": [{
                "$or": [
                    {"related_employee_id": emp_id},
                    {"related_employee_name": e["name"]},
                ]
            }],
        }, {"_id": 0, "amount": 1, "category": 1, "reference_id": 1, "created_at": 1}).to_list(2000)
        total_paid = sum(p.get("amount", 0) for p in payments)

        # Voorschotten this period (loaded separately so we can show open balance)
        # Loonstroken for current period
        ls_this_period = await db.kiosk_loonstroken.find({
            "company_id": company_id,
            "employee_id": emp_id,
            "period_label": current_period,
        }, {"_id": 0, "netto_loon": 1, "loonstrook_id": 1}).to_list(50)
        loonstrook_paid_this_period = sum(ls.get("netto_loon", 0) for ls in ls_this_period)
        voorschot_ids = await db.kiosk_kas.find({
            "company_id": company_id,
            "category": "voorschot",
            "related_employee_id": emp_id,
            "voorschot_period": current_period,
        }, {"_id": 0, "amount": 1}).to_list(50)
        voorschot_paid_this_period = sum(v.get("amount", 0) for v in voorschot_ids)
        period_paid = loonstrook_paid_this_period + voorschot_paid_this_period
        maandloon = e.get("maandloon", 0) or 0
        period_open = max(0, maandloon - period_paid)

        result.append({
            "employee_id": emp_id,
            "name": e["name"],
            "functie": e.get("functie", ""),
            "maandloon": maandloon,
            "telefoon": e.get("telefoon", ""),
            "email": e.get("email", ""),
            "start_date": e.get("start_date", ""),
            "status": e.get("status", "active"),
            "role": e.get("role", "kiosk_medewerker"),
            "employee_type": e.get("employee_type", "vast"),
            "has_pin": bool(e.get("pin")),
            "has_signature": bool(e.get("signature")),
            "total_paid": total_paid,
            "current_period": current_period,
            "current_period_paid": period_paid,
            "current_period_open": period_open,
            "created_at": e.get("created_at"),
        })

    return result

@router.post("/admin/employees")
async def create_employee(data: EmployeeCreate, company: dict = Depends(get_current_company)):
    """Create a new employee"""
    employee_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    employee = {
        "employee_id": employee_id,
        "company_id": company["company_id"],
        "name": data.name,
        "functie": data.functie or "",
        "maandloon": data.maandloon,
        "telefoon": data.telefoon or "",
        "email": data.email or "",
        "start_date": data.start_date or now.strftime("%Y-%m-%d"),
        "role": data.role or "kiosk_medewerker",
        "employee_type": data.employee_type or "vast",
        "pin": data.pin or "",
        "status": "active",
        "created_at": now
    }
    
    # Check PIN uniqueness within company
    if data.pin:
        existing = await db.kiosk_employees.find_one({"company_id": company["company_id"], "pin": data.pin, "status": "active"})
        if existing:
            raise HTTPException(status_code=400, detail="Deze PIN is al in gebruik door een andere werknemer")
    
    await db.kiosk_employees.insert_one(employee)
    return {"employee_id": employee_id, "message": "Werknemer aangemaakt"}

@router.put("/admin/employees/{employee_id}")
async def update_employee(employee_id: str, data: EmployeeUpdate, company: dict = Depends(get_current_company)):
    """Update an employee"""
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Geen wijzigingen")
    # Check PIN uniqueness
    if "pin" in updates and updates["pin"]:
        existing = await db.kiosk_employees.find_one({
            "company_id": company["company_id"], "pin": updates["pin"],
            "employee_id": {"$ne": employee_id}, "status": "active"
        })
        if existing:
            raise HTTPException(status_code=400, detail="Deze PIN is al in gebruik door een andere werknemer")
    updates["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.kiosk_employees.update_one(
        {"employee_id": employee_id, "company_id": company["company_id"]},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer bijgewerkt"}

@router.delete("/admin/employees/{employee_id}")
async def delete_employee(employee_id: str, company: dict = Depends(get_current_company)):
    """Delete an employee"""
    result = await db.kiosk_employees.delete_one(
        {"employee_id": employee_id, "company_id": company["company_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

@router.post("/admin/employees/{employee_id}/voorschot")
async def employee_voorschot(employee_id: str, body: dict, company: dict = Depends(get_current_company)):
    """Quick voorschot (advance) payment for an employee — partial salary.
    Body: { amount: float, period_label: str ("april 2026"), payment_method: 'cash'|'bank', notes?: str, payment_date?: 'YYYY-MM-DD' }
    Creates a kas entry that counts toward total_paid + current_period_paid for the employee.
    Does NOT generate a loonstrook — meant for quick partial advances.
    """
    company_id = company["company_id"]
    emp = await db.kiosk_employees.find_one({"employee_id": employee_id, "company_id": company_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    try:
        amount = float(body.get("amount", 0))
    except (TypeError, ValueError):
        amount = 0
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Bedrag moet groter zijn dan 0")
    period_label = (body.get("period_label") or "").strip()
    if not period_label:
        raise HTTPException(status_code=400, detail="Periode is verplicht")
    payment_method = body.get("payment_method", "cash")
    notes = body.get("notes", "")
    now = datetime.now(timezone.utc)
    payment_date = now
    if body.get("payment_date"):
        try:
            payment_date = datetime.fromisoformat(body["payment_date"]).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    source_label = "Kas" if payment_method == "cash" else "Bank"
    entry_id = generate_uuid()
    description_extra = f" - {notes}" if notes else ""
    await db.kiosk_kas.insert_one({
        "entry_id": entry_id,
        "company_id": company_id,
        "entry_type": "expense",
        "amount": amount,
        "description": f"Voorschot ({source_label}) - {emp['name']} ({period_label}){description_extra}",
        "category": "voorschot",
        "payment_method": payment_method,
        "related_employee_id": employee_id,
        "related_employee_name": emp["name"],
        "voorschot_period": period_label,
        "created_at": payment_date,
    })
    return {
        "entry_id": entry_id,
        "amount": amount,
        "period_label": period_label,
        "employee_name": emp["name"],
    }


@router.delete("/admin/employees/{employee_id}/voorschot/{entry_id}")
async def delete_employee_voorschot(employee_id: str, entry_id: str, company: dict = Depends(get_current_company)):
    """Delete a voorschot entry (admin)."""
    res = await db.kiosk_kas.delete_one({
        "entry_id": entry_id,
        "company_id": company["company_id"],
        "related_employee_id": employee_id,
        "category": "voorschot",
    })
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voorschot niet gevonden")
    return {"message": "Voorschot verwijderd"}


@router.get("/admin/employees/{employee_id}/voorschotten")
async def list_employee_voorschotten(employee_id: str, company: dict = Depends(get_current_company), period_label: Optional[str] = None):
    """List voorschotten for an employee, optionally filtered by period_label (e.g. 'april 2026')."""
    q: dict = {
        "company_id": company["company_id"],
        "related_employee_id": employee_id,
        "category": "voorschot",
    }
    if period_label:
        q["voorschot_period"] = period_label
    items = await db.kiosk_kas.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("/admin/employees/{employee_id}/pay")
async def pay_employee(employee_id: str, body: dict = None, company: dict = Depends(get_current_company)):
    """Pay an employee — optional custom amount, defaults to maandloon"""
    emp = await db.kiosk_employees.find_one({
        "employee_id": employee_id,
        "company_id": company["company_id"]
    })
    if not emp:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    # Use custom amount if provided, otherwise full maandloon
    if body and body.get("amount") is not None:
        amount = float(body["amount"])
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Bedrag moet groter zijn dan 0")
    else:
        amount = emp["maandloon"]
    
    now = datetime.now(timezone.utc)
    month_label = now.strftime("%B %Y")
    
    # Generate kwitantie nummer for salary payment
    count = await db.kiosk_payments.count_documents({"company_id": company["company_id"]})
    kwitantie_nummer = f"KW{now.year}-{str(count + 1).zfill(5)}"
    
    entry_id = generate_uuid()
    entry = {
        "entry_id": entry_id,
        "company_id": company["company_id"],
        "entry_type": "salary",
        "amount": amount,
        "description": f"Loon {emp['name']} - {month_label}",
        "category": "salary",
        "related_employee_id": employee_id,
        "related_employee_name": emp["name"],
        "related_tenant_id": "",
        "related_tenant_name": "",
        "payment_id": "",
        "kwitantie_nummer": kwitantie_nummer,
        "created_at": now
    }
    
    await db.kiosk_kas.insert_one(entry)
    
    # Also create a payment record for the salary kwitantie
    salary_payment = {
        "payment_id": entry_id,
        "company_id": company["company_id"],
        "tenant_id": "",
        "tenant_name": emp["name"],
        "tenant_code": "",
        "apartment_number": "",
        "amount": amount,
        "payment_type": "salary",
        "payment_method": "cash",
        "description": f"Loon {emp['name']} - {month_label}",
        "kwitantie_nummer": kwitantie_nummer,
        "status": "approved",
        "covered_months": [month_label],
        "created_at": now
    }
    await db.kiosk_payments.insert_one(salary_payment)
    
    # === AUTO WHATSAPP: Salaris uitbetaald notificatie ===
    try:
        emp_phone = emp.get("telefoon", "")
        if emp_phone:
            comp_name = company.get("stamp_company_name") or company.get("name", "")
            wa_salary_msg = (f"Beste {emp['name']},\n\n"
                             f"Uw salaris van SRD {amount:,.2f} is uitbetaald.\n"
                             f"Periode: {month_label}\n\n"
                             f"Met vriendelijke groet,\n{comp_name}")
            await _send_message_auto(
                company["company_id"], emp_phone, wa_salary_msg,
                "", emp["name"], "salary_paid"
            )
    except Exception:
        pass  # Notificatie mag hoofdflow niet breken

    # === Web Push: Salaris uitbetaald ===
    try:
        from .push import send_push_to_company
        asyncio.create_task(send_push_to_company(
            company["company_id"],
            title="Salaris uitbetaald",
            body=f"{emp['name']} • SRD {amount:,.2f} • {month_label}",
            url="/vastgoed",
            tag=f"salary-{entry_id}",
        ))
    except Exception:
        pass

    return {"entry_id": entry_id, "amount": amount, "message": f"Loon uitbetaald: SRD {amount:.2f}"}





# ============ FREELANCER PAYMENTS ============
@router.post("/admin/freelancer-payments")
async def create_freelancer_payment(data: FreelancerPaymentCreate, company: dict = Depends(get_current_company)):
    """Register a payment to a freelancer/contractor (losse werker/aannemer) and generate a receipt"""
    company_id = company["company_id"]
    name = (data.employee_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Naam is verplicht")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Bedrag moet positief zijn")

    functie = (data.functie or "").strip()
    # If employee_id provided, lookup for extra info
    if data.employee_id:
        emp = await db.kiosk_employees.find_one({"employee_id": data.employee_id, "company_id": company_id})
        if emp:
            if not functie:
                functie = emp.get("functie", "")

    now = datetime.now(timezone.utc)
    payment_date = now
    if data.payment_date:
        try:
            payment_date = datetime.fromisoformat(data.payment_date).replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # Generate receipt number
    year = payment_date.year
    counter_key = f"freelancer_{company_id}_{year}"
    last = await db.kiosk_counters.find_one({"key": counter_key})
    next_num = (last.get("value", 0) if last else 0) + 1
    await db.kiosk_counters.update_one({"key": counter_key}, {"$set": {"value": next_num}}, upsert=True)
    kwitantie_nummer = f"FR{year}-{next_num:05d}"

    payment_id = generate_uuid()
    entry = {
        "payment_id": payment_id,
        "company_id": company_id,
        "employee_id": data.employee_id,
        "employee_name": name,
        "functie": functie,
        "telefoon": (data.telefoon or "").strip(),
        "employee_type": "los",
        "amount": data.amount,
        "description": (data.description or "").strip() or "Uitbetaling",
        "payment_method": data.payment_method,
        "payment_date": payment_date,
        "kwitantie_nummer": kwitantie_nummer,
        "processed_by": data.processed_by or company.get("name", "Beheerder"),
        "processed_by_role": data.processed_by_role or "beheerder",
        "created_at": now
    }
    await db.kiosk_freelancer_payments.insert_one(entry)

    # Also register in kas as expense (category: freelancer)
    try:
        source_label = "Kas" if data.payment_method == "cash" else "Bank"
        await db.kiosk_kas.insert_one({
            "entry_id": generate_uuid(),
            "company_id": company_id,
            "entry_type": "expense",
            "amount": data.amount,
            "description": f"Losse uitbetaling ({source_label}) - {name}: {entry['description']}",
            "category": "freelancer",
            "payment_method": data.payment_method,
            "related_employee_name": name,
            "reference_id": payment_id,
            "kwitantie_nummer": kwitantie_nummer,
            "created_at": payment_date
        })
    except Exception:
        pass

    # === Web Push: Losse uitbetaling ===
    try:
        from .push import send_push_to_company
        asyncio.create_task(send_push_to_company(
            company_id,
            title="Losse uitbetaling",
            body=f"{name}{' (' + functie + ')' if functie else ''} • SRD {data.amount:,.2f} • {kwitantie_nummer}",
            url="/vastgoed",
            tag=f"freelancer-{payment_id}",
        ))
    except Exception:
        pass

    return {
        "payment_id": payment_id,
        "kwitantie_nummer": kwitantie_nummer,
        "employee_name": name,
        "amount": data.amount,
        "created_at": now.isoformat()
    }


@router.get("/admin/freelancer-payments")
async def list_freelancer_payments(company: dict = Depends(get_current_company), employee_id: Optional[str] = None):
    """List all freelancer payments, optionally filtered by employee"""
    query = {"company_id": company["company_id"]}
    if employee_id:
        query["employee_id"] = employee_id
    payments = await db.kiosk_freelancer_payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return payments


@router.delete("/admin/freelancer-payments/{payment_id}")
async def delete_freelancer_payment(payment_id: str, company: dict = Depends(get_current_company)):
    """Delete a freelancer payment and its kas entry"""
    result = await db.kiosk_freelancer_payments.delete_one({
        "payment_id": payment_id,
        "company_id": company["company_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    await db.kiosk_kas.delete_many({"company_id": company["company_id"], "reference_id": payment_id})
    return {"message": "Betaling verwijderd"}


@router.get("/admin/freelancer-payments/{payment_id}/receipt")
async def get_freelancer_receipt(payment_id: str, company: dict = Depends(get_current_company), noprint: Optional[str] = None):
    """Return A5-styled HTML receipt for a freelancer payment (same style as main kwitantie)"""
    p = await db.kiosk_freelancer_payments.find_one({"payment_id": payment_id, "company_id": company["company_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    stamp_name = company.get("stamp_company_name") or company.get("name", "")
    stamp_address = company.get("stamp_address", "")
    stamp_phone = company.get("stamp_phone", "")
    stamp_whatsapp = company.get("stamp_whatsapp", "")
    company_email = company.get("email", "")
    date_fmt = p["payment_date"].strftime("%d-%m-%Y") if isinstance(p.get("payment_date"), datetime) else str(p.get("payment_date", ""))
    method_label = {"cash": "Contant", "bank": "Bank overboeking"}.get(p.get("payment_method", "cash"), "Contant")
    processed_by = p.get("processed_by", "")
    functie = p.get("functie", "")
    telefoon = p.get("telefoon", "")

    doc_hash = _hashlib.sha256(
        f"FREELANCER|{p['payment_id']}|{p['kwitantie_nummer']}|{company['company_id']}|{p['employee_name']}|{float(p['amount']):.2f}|{date_fmt}".encode("utf-8")
    ).hexdigest()

    html = _build_a4_receipt_html(
        doc_type="UITBETALINGSKWITANTIE",
        doc_number=p["kwitantie_nummer"],
        date_str=date_fmt,
        receiver_name=p["employee_name"],
        receiver_extra_label="Functie" if functie else None,
        receiver_extra_value=functie if functie else None,
        receiver_phone=telefoon,
        method_label=method_label,
        processed_by=processed_by,
        description=p.get("description", ""),
        amount=p["amount"],
        stamp_name=stamp_name,
        stamp_address=stamp_address,
        stamp_phone=stamp_phone,
        stamp_whatsapp=stamp_whatsapp,
        company_email=company_email,
        noprint=bool(noprint),
        include_sig_line=True,
        pdf_download_path=f"./{payment_id}/receipt/pdf",
        doc_hash=doc_hash,
    )
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/admin/freelancer-payments/{payment_id}/receipt/pdf")
async def get_freelancer_receipt_pdf(payment_id: str, company: dict = Depends(get_current_company)):
    """Return tamper-protected, encrypted PDF (A5) for a freelancer payment receipt."""
    p = await db.kiosk_freelancer_payments.find_one({"payment_id": payment_id, "company_id": company["company_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    stamp_name = company.get("stamp_company_name") or company.get("name", "")
    stamp_address = company.get("stamp_address", "")
    stamp_phone = company.get("stamp_phone", "")
    stamp_whatsapp = company.get("stamp_whatsapp", "")
    company_email = company.get("email", "")
    date_fmt = p["payment_date"].strftime("%d-%m-%Y") if isinstance(p.get("payment_date"), datetime) else str(p.get("payment_date", ""))
    method_label = {"cash": "Contant", "bank": "Bank overboeking"}.get(p.get("payment_method", "cash"), "Contant")
    doc_hash = _hashlib.sha256(
        f"FREELANCER|{p['payment_id']}|{p['kwitantie_nummer']}|{company['company_id']}|{p['employee_name']}|{float(p['amount']):.2f}|{date_fmt}".encode("utf-8")
    ).hexdigest()

    html = _build_a4_receipt_html(
        doc_type="UITBETALINGSKWITANTIE",
        doc_number=p["kwitantie_nummer"],
        date_str=date_fmt,
        receiver_name=p["employee_name"],
        receiver_extra_label="Functie" if p.get("functie") else None,
        receiver_extra_value=p.get("functie") if p.get("functie") else None,
        receiver_phone=p.get("telefoon", ""),
        method_label=method_label,
        processed_by=p.get("processed_by", ""),
        description=p.get("description", ""),
        amount=p["amount"],
        stamp_name=stamp_name,
        stamp_address=stamp_address,
        stamp_phone=stamp_phone,
        stamp_whatsapp=stamp_whatsapp,
        company_email=company_email,
        noprint=True,
        include_sig_line=True,
        doc_hash=doc_hash,
    )
    pdf_bytes = await _encrypt_receipt_pdf(html)
    filename = f"Kwitantie_{p['kwitantie_nummer']}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{filename}"'})


@router.post("/admin/freelancer-payments/{payment_id}/send-whatsapp")
async def send_freelancer_receipt_whatsapp(payment_id: str, company: dict = Depends(get_current_company)):
    """Send freelancer payment confirmation + receipt link via WhatsApp (Twilio)"""
    company_id = company["company_id"]
    p = await db.kiosk_freelancer_payments.find_one({"payment_id": payment_id, "company_id": company_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    phone = p.get("telefoon", "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Geen telefoonnummer geregistreerd voor deze ontvanger")

    comp_name = company.get("stamp_company_name") or company.get("name", "")
    date_fmt = p["payment_date"].strftime("%d-%m-%Y") if isinstance(p.get("payment_date"), datetime) else str(p.get("payment_date", ""))
    msg = (
        f"Beste {p['employee_name']},\n\n"
        f"U heeft een uitbetaling ontvangen:\n"
        f"Bedrag: SRD {p['amount']:,.2f}\n"
        f"Datum: {date_fmt}\n"
        f"Kwitantie: {p['kwitantie_nummer']}\n"
        f"Omschrijving: {p.get('description','')}\n\n"
        f"Met vriendelijke groet,\n{comp_name}"
    )
    try:
        await _send_message_auto(company_id, phone, msg, None, p["employee_name"], "freelancer_payment")
        return {"message": "WhatsApp bericht verstuurd"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Versturen mislukt: {str(e)}")


# ============ LOONSTROOK ============
@router.post("/admin/loonstroken")
async def create_loonstrook(data: LoonstrookCreate, company: dict = Depends(get_current_company)):
    """Generate loonstrook (pay slip) for a regular employee"""
    company_id = company["company_id"]
    emp = await db.kiosk_employees.find_one({"employee_id": data.employee_id, "company_id": company_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")

    bruto_totaal = data.bruto_loon + data.overuren_bedrag + data.bonus
    totale_aftrek = data.belasting_aftrek + data.overige_aftrek
    # Auto-deduct any unconsumed voorschotten for this employee + period
    voorschot_entries = await db.kiosk_kas.find({
        "company_id": company_id,
        "category": "voorschot",
        "related_employee_id": data.employee_id,
        "voorschot_period": data.period_label,
        "consumed_by_loonstrook_id": {"$in": [None, ""]},
    }, {"_id": 0, "entry_id": 1, "amount": 1, "created_at": 1}).to_list(500)
    voorschot_total = round(sum(v.get("amount", 0) or 0 for v in voorschot_entries), 2)
    if voorschot_total > 0:
        totale_aftrek += voorschot_total
    netto_loon = bruto_totaal - totale_aftrek
    if netto_loon <= 0:
        raise HTTPException(status_code=400, detail="Netto loon moet positief zijn")

    now = datetime.now(timezone.utc)
    payment_date = now
    if data.payment_date:
        try:
            payment_date = datetime.fromisoformat(data.payment_date).replace(tzinfo=timezone.utc)
        except Exception:
            pass

    year = payment_date.year
    counter_key = f"loonstrook_{company_id}_{year}"
    last = await db.kiosk_counters.find_one({"key": counter_key})
    next_num = (last.get("value", 0) if last else 0) + 1
    await db.kiosk_counters.update_one({"key": counter_key}, {"$set": {"value": next_num}}, upsert=True)
    strook_nummer = f"LS{year}-{next_num:05d}"

    loon_id = generate_uuid()
    doc = {
        "loonstrook_id": loon_id,
        "company_id": company_id,
        "employee_id": data.employee_id,
        "employee_name": emp["name"],
        "functie": emp.get("functie", ""),
        "telefoon": emp.get("telefoon", ""),
        "period_label": data.period_label,
        "bruto_loon": data.bruto_loon,
        "overuren_bedrag": data.overuren_bedrag,
        "bonus": data.bonus,
        "belasting_aftrek": data.belasting_aftrek,
        "overige_aftrek": data.overige_aftrek,
        "voorschot_aftrek": voorschot_total,
        "voorschot_entry_ids": [v["entry_id"] for v in voorschot_entries],
        "netto_loon": netto_loon,
        "dagen_gewerkt": data.dagen_gewerkt,
        "uren_gewerkt": data.uren_gewerkt,
        "payment_method": data.payment_method,
        "payment_date": payment_date,
        "strook_nummer": strook_nummer,
        "notes": data.notes,
        "processed_by": data.processed_by or company.get("name", "Beheerder"),
        "processed_by_role": data.processed_by_role or "beheerder",
        "created_at": now
    }
    await db.kiosk_loonstroken.insert_one(doc)

    # Kas boeking
    try:
        source_label = "Kas" if data.payment_method == "cash" else "Bank"
        await db.kiosk_kas.insert_one({
            "entry_id": generate_uuid(),
            "company_id": company_id,
            "entry_type": "expense",
            "amount": netto_loon,
            "description": f"Loonuitbetaling ({source_label}) - {emp['name']} ({data.period_label})",
            "category": "loon",
            "payment_method": data.payment_method,
            "related_employee_id": data.employee_id,
            "related_employee_name": emp["name"],
            "reference_id": loon_id,
            "kwitantie_nummer": strook_nummer,
            "created_at": payment_date
        })
    except Exception:
        pass

    # Mark consumed voorschotten so they aren't deducted twice
    if voorschot_entries:
        await db.kiosk_kas.update_many(
            {"company_id": company_id, "entry_id": {"$in": [v["entry_id"] for v in voorschot_entries]}},
            {"$set": {"consumed_by_loonstrook_id": loon_id}},
        )

    # === Web Push: Loonstrook aangemaakt ===
    try:
        from .push import send_push_to_company
        asyncio.create_task(send_push_to_company(
            company_id,
            title="Loonstrook aangemaakt",
            body=f"{emp['name']} • Netto SRD {netto_loon:,.2f} • {data.period_label} • {strook_nummer}",
            url="/vastgoed",
            tag=f"loonstrook-{loon_id}",
        ))
    except Exception:
        pass

    return {
        "loonstrook_id": loon_id,
        "strook_nummer": strook_nummer,
        "employee_name": emp["name"],
        "bruto_loon": data.bruto_loon,
        "belasting_aftrek": data.belasting_aftrek,
        "overige_aftrek": data.overige_aftrek,
        "voorschot_aftrek": voorschot_total,
        "voorschot_entry_ids": [v["entry_id"] for v in voorschot_entries],
        "netto_loon": netto_loon,
        "created_at": now.isoformat()
    }


@router.get("/admin/loonstroken")
async def list_loonstroken(company: dict = Depends(get_current_company), employee_id: Optional[str] = None):
    query = {"company_id": company["company_id"]}
    if employee_id:
        query["employee_id"] = employee_id
    items = await db.kiosk_loonstroken.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@router.delete("/admin/loonstroken/{loonstrook_id}")
async def delete_loonstrook(loonstrook_id: str, company: dict = Depends(get_current_company)):
    # Find loonstrook first to know which voorschotten to release
    loon = await db.kiosk_loonstroken.find_one({"loonstrook_id": loonstrook_id, "company_id": company["company_id"]}, {"_id": 0, "voorschot_entry_ids": 1})
    result = await db.kiosk_loonstroken.delete_one({"loonstrook_id": loonstrook_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loonstrook niet gevonden")
    await db.kiosk_kas.delete_many({"company_id": company["company_id"], "reference_id": loonstrook_id})
    # Release linked voorschotten so they can be deducted by a future loonstrook
    if loon and loon.get("voorschot_entry_ids"):
        await db.kiosk_kas.update_many(
            {"company_id": company["company_id"], "entry_id": {"$in": loon["voorschot_entry_ids"]}},
            {"$set": {"consumed_by_loonstrook_id": None}},
        )
    return {"message": "Loonstrook verwijderd"}


@router.get("/admin/loonstroken/{loonstrook_id}/receipt")
async def get_loonstrook_receipt(loonstrook_id: str, company: dict = Depends(get_current_company), noprint: Optional[str] = None):
    """Return A5-styled Loonstrook HTML"""
    p = await db.kiosk_loonstroken.find_one({"loonstrook_id": loonstrook_id, "company_id": company["company_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Loonstrook niet gevonden")
    stamp_name = company.get("stamp_company_name") or company.get("name", "")
    stamp_address = company.get("stamp_address", "")
    stamp_phone = company.get("stamp_phone", "")
    stamp_whatsapp = company.get("stamp_whatsapp", "")
    company_email = company.get("email", "")
    date_fmt = p["payment_date"].strftime("%d-%m-%Y") if isinstance(p.get("payment_date"), datetime) else str(p.get("payment_date", ""))
    method_label = {"cash": "Contant", "bank": "Bank overboeking"}.get(p.get("payment_method", "cash"), "Bank")

    breakdown = []
    if p.get("dagen_gewerkt"):
        breakdown.append(("Dagen gewerkt", str(p["dagen_gewerkt"])))
    if p.get("uren_gewerkt"):
        breakdown.append(("Uren gewerkt", f"{p['uren_gewerkt']:.1f}"))
    breakdown.append(("Bruto loon", f"SRD {p['bruto_loon']:,.2f}"))
    if p.get("overuren_bedrag", 0) > 0:
        breakdown.append(("Overuren", f"SRD {p['overuren_bedrag']:,.2f}"))
    if p.get("bonus", 0) > 0:
        breakdown.append(("Bonus", f"SRD {p['bonus']:,.2f}"))
    bruto_totaal = p['bruto_loon'] + p.get('overuren_bedrag', 0) + p.get('bonus', 0)
    breakdown.append(("Bruto totaal", f"SRD {bruto_totaal:,.2f}"))
    if p.get("belasting_aftrek", 0) > 0:
        breakdown.append(("Belasting aftrek", f"- SRD {p['belasting_aftrek']:,.2f}"))
    if p.get("overige_aftrek", 0) > 0:
        breakdown.append(("Overige aftrek", f"- SRD {p['overige_aftrek']:,.2f}"))
    if p.get("voorschot_aftrek", 0) > 0:
        breakdown.append(("Voorschot aftrek", f"- SRD {p['voorschot_aftrek']:,.2f}"))

    doc_hash = _hashlib.sha256(
        f"LOONSTROOK|{p['loonstrook_id']}|{p['strook_nummer']}|{company['company_id']}|{p['employee_name']}|{float(p['netto_loon']):.2f}|{date_fmt}".encode("utf-8")
    ).hexdigest()

    html = _build_a4_receipt_html(
        doc_type="LOONSTROOK",
        doc_number=p["strook_nummer"],
        date_str=date_fmt,
        receiver_name=p["employee_name"],
        receiver_extra_label="Functie" if p.get("functie") else None,
        receiver_extra_value=p.get("functie") if p.get("functie") else None,
        receiver_phone=p.get("telefoon"),
        method_label=method_label,
        processed_by=p.get("processed_by"),
        description=p.get("notes", "") or f"Loonuitbetaling periode: {p['period_label']}",
        amount=p["netto_loon"],
        amount_label="NETTO LOON",
        breakdown_rows=breakdown,
        stamp_name=stamp_name,
        stamp_address=stamp_address,
        stamp_phone=stamp_phone,
        stamp_whatsapp=stamp_whatsapp,
        company_email=company_email,
        noprint=bool(noprint),
        include_sig_line=True,
        pdf_download_path=f"./{loonstrook_id}/receipt/pdf",
        doc_hash=doc_hash,
    )
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/admin/loonstroken/{loonstrook_id}/receipt/pdf")
async def get_loonstrook_receipt_pdf(loonstrook_id: str, company: dict = Depends(get_current_company)):
    """Return tamper-protected, encrypted PDF (A5) for a loonstrook."""
    p = await db.kiosk_loonstroken.find_one({"loonstrook_id": loonstrook_id, "company_id": company["company_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Loonstrook niet gevonden")
    stamp_name = company.get("stamp_company_name") or company.get("name", "")
    stamp_address = company.get("stamp_address", "")
    stamp_phone = company.get("stamp_phone", "")
    stamp_whatsapp = company.get("stamp_whatsapp", "")
    company_email = company.get("email", "")
    date_fmt = p["payment_date"].strftime("%d-%m-%Y") if isinstance(p.get("payment_date"), datetime) else str(p.get("payment_date", ""))
    method_label = {"cash": "Contant", "bank": "Bank overboeking"}.get(p.get("payment_method", "cash"), "Bank")

    breakdown = []
    if p.get("dagen_gewerkt"):
        breakdown.append(("Dagen gewerkt", str(p["dagen_gewerkt"])))
    if p.get("uren_gewerkt"):
        breakdown.append(("Uren gewerkt", f"{p['uren_gewerkt']:.1f}"))
    breakdown.append(("Bruto loon", f"SRD {p['bruto_loon']:,.2f}"))
    if p.get("overuren_bedrag", 0) > 0:
        breakdown.append(("Overuren", f"SRD {p['overuren_bedrag']:,.2f}"))
    if p.get("bonus", 0) > 0:
        breakdown.append(("Bonus", f"SRD {p['bonus']:,.2f}"))
    bruto_totaal = p['bruto_loon'] + p.get('overuren_bedrag', 0) + p.get('bonus', 0)
    breakdown.append(("Bruto totaal", f"SRD {bruto_totaal:,.2f}"))
    if p.get("belasting_aftrek", 0) > 0:
        breakdown.append(("Belasting aftrek", f"- SRD {p['belasting_aftrek']:,.2f}"))
    if p.get("overige_aftrek", 0) > 0:
        breakdown.append(("Overige aftrek", f"- SRD {p['overige_aftrek']:,.2f}"))
    if p.get("voorschot_aftrek", 0) > 0:
        breakdown.append(("Voorschot aftrek", f"- SRD {p['voorschot_aftrek']:,.2f}"))

    doc_hash = _hashlib.sha256(
        f"LOONSTROOK|{p['loonstrook_id']}|{p['strook_nummer']}|{company['company_id']}|{p['employee_name']}|{float(p['netto_loon']):.2f}|{date_fmt}".encode("utf-8")
    ).hexdigest()

    html = _build_a4_receipt_html(
        doc_type="LOONSTROOK",
        doc_number=p["strook_nummer"],
        date_str=date_fmt,
        receiver_name=p["employee_name"],
        receiver_extra_label="Functie" if p.get("functie") else None,
        receiver_extra_value=p.get("functie") if p.get("functie") else None,
        receiver_phone=p.get("telefoon"),
        method_label=method_label,
        processed_by=p.get("processed_by"),
        description=p.get("notes", "") or f"Loonuitbetaling periode: {p['period_label']}",
        amount=p["netto_loon"],
        amount_label="NETTO LOON",
        breakdown_rows=breakdown,
        stamp_name=stamp_name,
        stamp_address=stamp_address,
        stamp_phone=stamp_phone,
        stamp_whatsapp=stamp_whatsapp,
        company_email=company_email,
        noprint=True,
        include_sig_line=True,
        doc_hash=doc_hash,
    )
    pdf_bytes = await _encrypt_receipt_pdf(html)
    filename = f"Loonstrook_{p['strook_nummer']}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{filename}"'})


@router.post("/admin/loonstroken/{loonstrook_id}/send-whatsapp")
async def send_loonstrook_whatsapp(loonstrook_id: str, company: dict = Depends(get_current_company)):
    """Send loonstrook summary via WhatsApp"""
    company_id = company["company_id"]
    p = await db.kiosk_loonstroken.find_one({"loonstrook_id": loonstrook_id, "company_id": company_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Loonstrook niet gevonden")
    phone = (p.get("telefoon", "") or "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Geen telefoonnummer geregistreerd voor werknemer")

    comp_name = company.get("stamp_company_name") or company.get("name", "")
    date_fmt = p["payment_date"].strftime("%d-%m-%Y") if isinstance(p.get("payment_date"), datetime) else str(p.get("payment_date", ""))
    msg = (
        f"Beste {p['employee_name']},\n\n"
        f"Uw loonstrook voor {p['period_label']} is beschikbaar:\n"
        f"Netto loon: SRD {p['netto_loon']:,.2f}\n"
        f"Datum: {date_fmt}\n"
        f"Strook nr: {p['strook_nummer']}\n\n"
        f"Met vriendelijke groet,\n{comp_name}"
    )
    try:
        await _send_message_auto(company_id, phone, msg, None, p["employee_name"], "loonstrook")
        return {"message": "WhatsApp bericht verstuurd"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Versturen mislukt: {str(e)}")

