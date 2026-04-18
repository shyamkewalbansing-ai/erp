from .base import *

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
    
    return {
        "message": f"Boetes toegepast op {updated_count} huurders",
        "amount_per_tenant": fine_amount,
        "tenants_affected": updated_count
    }


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
async def list_kas_entries(company: dict = Depends(get_current_company)):
    """List all cash register entries - expenses only. Income comes from payments."""
    company_id = company["company_id"]
    
    # All kas entries (income, expense, salary)
    entries = await db.kiosk_kas.find({"company_id": company_id}).sort("created_at", -1).to_list(1000)
    
    # Total income from rent payments (kiosk_payments)
    payments = await db.kiosk_payments.find({"company_id": company_id}).to_list(10000)
    payment_income = sum(p.get("amount", 0) for p in payments)
    
    # Manual income from kas entries
    manual_income = sum(e.get("amount", 0) for e in entries if e.get("entry_type") == "income")
    total_income = payment_income + manual_income
    
    # Total expense = sum of all kas entries (expenses + salaries)
    total_expense = sum(e.get("amount", 0) for e in entries if e.get("entry_type") in ("expense", "salary"))
    balance = total_income - total_expense
    
    result_entries = []
    for e in entries:
        result_entries.append({
            "entry_id": e["entry_id"],
            "entry_type": e["entry_type"],
            "amount": e["amount"],
            "description": e["description"],
            "category": e.get("category", ""),
            "related_tenant_name": e.get("related_tenant_name", ""),
            "related_employee_name": e.get("related_employee_name", ""),
            "payment_id": e.get("payment_id", ""),
            "created_at": e.get("created_at")
        })
    
    return {
        "entries": result_entries,
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance
    }

@router.post("/admin/kas")
async def create_kas_entry(data: CashEntryCreate, company: dict = Depends(get_current_company)):
    """Create a cash register entry"""
    entry_id = generate_uuid()
    now = datetime.now(timezone.utc)
    
    entry = {
        "entry_id": entry_id,
        "company_id": company["company_id"],
        "entry_type": data.entry_type,
        "amount": data.amount,
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
    
    # Calculate total rent income (same logic as kas endpoint)
    payments = await db.kiosk_payments.find({"company_id": company_id}).to_list(10000)
    payment_income = sum(p.get("amount", 0) for p in payments)
    
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
    
    # Calculate huurinkomsten
    payments = await db.kiosk_payments.find({"company_id": company_id}).to_list(10000)
    huurinkomsten = sum(p.get("amount", 0) for p in payments)
    
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
    """List all employees"""
    company_id = company["company_id"]
    employees = await db.kiosk_employees.find({"company_id": company_id}).to_list(1000)
    
    result = []
    for e in employees:
        # Get total paid
        payments = await db.kiosk_kas.find({
            "company_id": company_id,
            "related_employee_id": e["employee_id"],
            "entry_type": "salary"
        }).to_list(1000)
        total_paid = sum(p.get("amount", 0) for p in payments)
        
        result.append({
            "employee_id": e["employee_id"],
            "name": e["name"],
            "functie": e.get("functie", ""),
            "maandloon": e.get("maandloon", 0),
            "telefoon": e.get("telefoon", ""),
            "email": e.get("email", ""),
            "start_date": e.get("start_date", ""),
            "status": e.get("status", "active"),
            "role": e.get("role", "kiosk_medewerker"),
            "employee_type": e.get("employee_type", "vast"),
            "has_password": bool(e.get("password_hash")),
            "total_paid": total_paid,
            "created_at": e.get("created_at")
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
        "status": "active",
        "created_at": now
    }
    
    # Hash password if provided
    if data.password:
        employee["password_hash"] = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.kiosk_employees.insert_one(employee)
    return {"employee_id": employee_id, "message": "Werknemer aangemaakt"}

@router.put("/admin/employees/{employee_id}")
async def update_employee(employee_id: str, data: EmployeeUpdate, company: dict = Depends(get_current_company)):
    """Update an employee"""
    updates = {k: v for k, v in data.dict().items() if v is not None and k != 'password'}
    if data.password:
        updates["password_hash"] = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if not updates:
        raise HTTPException(status_code=400, detail="Geen wijzigingen")
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
    
    return {"entry_id": entry_id, "amount": amount, "message": f"Loon uitbetaald: SRD {amount:.2f}"}



