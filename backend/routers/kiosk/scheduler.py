from .base import *

# ============== DAGELIJKSE NOTIFICATIE SCHEDULER ==============

async def _run_daily_notifications():
    """Run daily checks for rent reminders and expiring leases across all companies"""
    import logging
    logger = logging.getLogger("kiosk.scheduler")
    
    try:
        companies = await db.kiosk_companies.find(
            {"status": "active"},
            {"_id": 0, "company_id": 1, "name": 1, "stamp_company_name": 1, 
             "billing_day": 1, "billing_next_month": 1, 
             "wa_enabled": 1, "twilio_enabled": 1}
        ).to_list(500)
        
        now = datetime.now(timezone.utc)
        today = now.day
        results = {"rent_reminders": 0, "lease_warnings": 0, "companies_checked": 0}
        
        for comp in companies:
            company_id = comp["company_id"]
            comp_name = comp.get("stamp_company_name") or comp.get("name", "")
            billing_day = comp.get("billing_day", 1)
            
            # Skip companies without messaging configured
            if not comp.get("wa_enabled") and not comp.get("twilio_enabled"):
                continue
            
            results["companies_checked"] += 1
            
            # === 1. HUUR HERINNERING: 3 dagen voor vervaldatum ===
            reminder_day = billing_day - 3
            if reminder_day <= 0:
                reminder_day += 28  # Wrap around for early-month billing days
            
            if today == reminder_day or today == billing_day:
                tenants_with_debt = await db.kiosk_tenants.find({
                    "company_id": company_id,
                    "status": "active",
                    "outstanding_rent": {"$gt": 0}
                }).to_list(1000)

                # Push notification summary: huurders achterstand
                try:
                    if tenants_with_debt:
                        from .push import send_push_to_company
                        total_achterstand = sum(
                            (t.get("outstanding_rent", 0) + t.get("fines", 0) + t.get("service_costs", 0))
                            for t in tenants_with_debt
                        )
                        label = "Vervaldatum vandaag" if today == billing_day else "Vervaldatum over 3 dagen"
                        await send_push_to_company(
                            company_id,
                            title="Achterstand huurders",
                            body=f"{len(tenants_with_debt)} huurder(s) • Totaal SRD {total_achterstand:,.2f} • {label}",
                            url="/vastgoed",
                            tag=f"overdue-summary-{now.strftime('%Y%m%d')}",
                        )
                except Exception:
                    pass

                for t in tenants_with_debt:
                    t_phone = t.get("phone") or t.get("telefoon", "")
                    if not t_phone:
                        continue
                    
                    outstanding = t.get("outstanding_rent", 0)
                    fines = t.get("fines", 0)
                    service = t.get("service_costs", 0)
                    total_debt = outstanding + fines + service
                    apt_nr = t.get("apartment_number", "")
                    
                    if today == billing_day:
                        wa_reminder = (f"Beste {t['name']},\n\n"
                                       f"Vandaag is de vervaldatum voor uw huurbetaling.\n"
                                       f"Openstaande huur: SRD {outstanding:,.2f}\n"
                                       f"{('Boetes: SRD ' + f'{fines:,.2f}' + chr(10)) if fines > 0 else ''}"
                                       f"Totaal verschuldigd: SRD {total_debt:,.2f}\n"
                                       f"Appartement: {apt_nr}\n\n"
                                       f"Gelieve vandaag nog te betalen om boetes te voorkomen.\n\n"
                                       f"Met vriendelijke groet,\n{comp_name}")
                        msg_type = "rent_due_today"
                    else:
                        wa_reminder = (f"Beste {t['name']},\n\n"
                                       f"Herinnering: uw huurbetaling vervalt over enkele dagen (dag {billing_day}).\n"
                                       f"Openstaande huur: SRD {outstanding:,.2f}\n"
                                       f"Totaal verschuldigd: SRD {total_debt:,.2f}\n"
                                       f"Appartement: {apt_nr}\n\n"
                                       f"Gelieve tijdig te betalen.\n\n"
                                       f"Met vriendelijke groet,\n{comp_name}")
                        msg_type = "rent_reminder"
                    
                    await _send_message_auto(company_id, t_phone, wa_reminder, t["tenant_id"], t["name"], msg_type)
                    results["rent_reminders"] += 1
            
            # === 2. HUURCONTRACT BIJNA VERLOPEN: 30 dagen van tevoren ===
            warning_date = (now + timedelta(days=30)).strftime("%Y-%m-%d")
            today_str = now.strftime("%Y-%m-%d")
            
            expiring_leases = await db.kiosk_leases.find({
                "company_id": company_id,
                "status": "active",
                "end_date": {"$lte": warning_date, "$gte": today_str}
            }).to_list(500)
            
            for lease in expiring_leases:
                tenant = await db.kiosk_tenants.find_one({"tenant_id": lease.get("tenant_id")})
                if not tenant:
                    continue
                t_phone = tenant.get("phone") or tenant.get("telefoon", "")
                if not t_phone:
                    continue
                
                # Only notify once per week (check if already sent in last 7 days)
                recent_msg = await db.kiosk_wa_messages.find_one({
                    "company_id": company_id,
                    "tenant_id": lease.get("tenant_id"),
                    "message_type": "lease_expiring",
                    "created_at": {"$gte": now - timedelta(days=7)}
                })
                if recent_msg:
                    continue
                
                end_date = lease.get("end_date", "")
                months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
                try:
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                    days_left = (end_dt - now.replace(tzinfo=None)).days
                    end_fmt = f"{end_dt.day} {months_nl[end_dt.month-1]} {end_dt.year}"
                except Exception:
                    days_left = 30
                    end_fmt = end_date
                
                apt_nr = lease.get("apartment_number", "")
                wa_lease_exp = (f"Beste {tenant['name']},\n\n"
                                f"Uw huurcontract voor appartement {apt_nr} loopt af op {end_fmt} "
                                f"(nog {days_left} dagen).\n\n"
                                f"Neem contact op met de verhuurder om uw contract te verlengen.\n\n"
                                f"Met vriendelijke groet,\n{comp_name}")
                await _send_message_auto(company_id, t_phone, wa_lease_exp, lease.get("tenant_id"), tenant["name"], "lease_expiring")
                results["lease_warnings"] += 1
        
        logger.info(f"Daily notifications complete: {results}")
        return results
        
    except Exception as e:
        logger.error(f"Error in daily notifications: {e}")
        return {"error": str(e)}


async def _kiosk_daily_scheduler():
    """Background loop that runs daily notifications at 08:00 Suriname time (UTC-3)"""
    import logging
    logger = logging.getLogger("kiosk.scheduler")
    
    while True:
        try:
            now_utc = datetime.now(timezone.utc)
            # Suriname is UTC-3
            suriname_hour = (now_utc.hour - 3) % 24
            suriname_minute = now_utc.minute
            
            # Run at 08:00 Suriname time (= 11:00 UTC)
            if suriname_hour == 8 and suriname_minute < 5:
                logger.info("Running daily kiosk notifications...")
                results = await _run_daily_notifications()
                logger.info(f"Daily kiosk notifications results: {results}")
                # Sleep 6 hours to avoid re-running in the same window
                await asyncio.sleep(6 * 3600)
            else:
                # Check every 5 minutes
                await asyncio.sleep(300)
        except Exception as e:
            logger.error(f"Kiosk scheduler error: {e}")
            await asyncio.sleep(300)


# Manual trigger endpoint for daily notifications
@router.post("/admin/daily-notifications")
async def trigger_daily_notifications(company: dict = Depends(get_current_company)):
    """Manually trigger daily rent reminders and lease expiration checks for this company"""
    company_id = company["company_id"]
    comp_name = company.get("stamp_company_name") or company.get("name", "")
    billing_day = company.get("billing_day", 1)
    now = datetime.now(timezone.utc)
    results = {"rent_reminders": 0, "lease_warnings": 0}
    
    # === Rent reminders for this company ===
    tenants_with_debt = await db.kiosk_tenants.find({
        "company_id": company_id,
        "status": "active",
        "outstanding_rent": {"$gt": 0}
    }).to_list(1000)
    
    for t in tenants_with_debt:
        t_phone = t.get("phone") or t.get("telefoon", "")
        if not t_phone:
            continue
        outstanding = t.get("outstanding_rent", 0)
        fines = t.get("fines", 0)
        service = t.get("service_costs", 0)
        total_debt = outstanding + fines + service
        apt_nr = t.get("apartment_number", "")
        
        wa_reminder = (f"Beste {t['name']},\n\n"
                       f"Herinnering: u heeft nog een openstaand saldo.\n"
                       f"Openstaande huur: SRD {outstanding:,.2f}\n"
                       f"{('Boetes: SRD ' + f'{fines:,.2f}' + chr(10)) if fines > 0 else ''}"
                       f"Totaal verschuldigd: SRD {total_debt:,.2f}\n"
                       f"Appartement: {apt_nr}\n\n"
                       f"Gelieve zo spoedig mogelijk te betalen.\n\n"
                       f"Met vriendelijke groet,\n{comp_name}")
        await _send_message_auto(company_id, t_phone, wa_reminder, t["tenant_id"], t["name"], "rent_reminder_manual")
        results["rent_reminders"] += 1
    
    # === Lease expiration warnings for this company ===
    warning_date = (now + timedelta(days=30)).strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")
    
    expiring_leases = await db.kiosk_leases.find({
        "company_id": company_id,
        "status": "active",
        "end_date": {"$lte": warning_date, "$gte": today_str}
    }).to_list(500)
    
    months_nl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
    for lease in expiring_leases:
        tenant = await db.kiosk_tenants.find_one({"tenant_id": lease.get("tenant_id")})
        if not tenant:
            continue
        t_phone = tenant.get("phone") or tenant.get("telefoon", "")
        if not t_phone:
            continue
        
        end_date = lease.get("end_date", "")
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            days_left = (end_dt - now.replace(tzinfo=None)).days
            end_fmt = f"{end_dt.day} {months_nl[end_dt.month-1]} {end_dt.year}"
        except Exception:
            days_left = 30
            end_fmt = end_date
        
        apt_nr = lease.get("apartment_number", "")
        wa_lease_exp = (f"Beste {tenant['name']},\n\n"
                        f"Uw huurcontract voor appartement {apt_nr} loopt af op {end_fmt} "
                        f"(nog {days_left} dagen).\n\n"
                        f"Neem contact op met de verhuurder om uw contract te verlengen.\n\n"
                        f"Met vriendelijke groet,\n{comp_name}")
        await _send_message_auto(company_id, t_phone, wa_lease_exp, lease.get("tenant_id"), tenant["name"], "lease_expiring")
        results["lease_warnings"] += 1
    
    return results
