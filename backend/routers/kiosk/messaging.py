from .base import *


# ============== EMAIL SMTP ==============

@router.post("/admin/email/test")
async def test_smtp_email(company: dict = Depends(get_current_company)):
    """Send a test email to verify SMTP settings"""
    smtp_email = company.get("smtp_email")
    if not company.get("smtp_enabled") or not smtp_email:
        raise HTTPException(status_code=400, detail="SMTP is niet geconfigureerd")
    try:
        await _send_email_auto(
            company["company_id"], smtp_email,
            "SMTP Test", f"Dit is een testbericht van {company.get('name', 'Kiosk')}.\n\nUw SMTP instellingen werken correct!",
            "", "", "test"
        )
        return {"message": f"Testmail verzonden naar {smtp_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP fout: {str(e)}")


@router.post("/admin/email/send")
async def send_manual_email(tenant_id: str, subject: str = "Bericht van uw verhuurder", message: str = "", company: dict = Depends(get_current_company)):
    """Send a manual email to a tenant"""
    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company["company_id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    email = tenant.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Huurder heeft geen email adres")
    if not company.get("smtp_enabled"):
        raise HTTPException(status_code=400, detail="SMTP is niet geconfigureerd")
    
    await _send_email_auto(company["company_id"], email, subject, message, tenant_id, tenant.get("name", ""), "manual")
    return {"message": f"Email verzonden naar {email}"}


# ============== CLEAR MESSAGES LOG ==============

@router.delete("/admin/messages/clear")
async def clear_messages_log(company: dict = Depends(get_current_company)):
    """Clear all notification messages for this company"""
    result = await db.kiosk_messages.delete_many({"company_id": company["company_id"]})
    return {"message": f"{result.deleted_count} berichten verwijderd"}


# ============== WHATSAPP BUSINESS API ==============

class WhatsAppMessage(BaseModel):
    tenant_id: str
    message_type: str  # reminder, fine, overdue, custom
    custom_message: Optional[str] = None

@router.post("/admin/whatsapp/send")
async def send_whatsapp_message(data: WhatsAppMessage, company: dict = Depends(get_current_company)):
    """Send WhatsApp message to tenant via Business API"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    
    if not comp.get("wa_enabled") and not comp.get("twilio_enabled"):
        raise HTTPException(status_code=400, detail="Geen berichtenkanaal geconfigureerd. Schakel WhatsApp of Twilio in bij Instellingen.")
    
    tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id, "company_id": company["company_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    phone = tenant.get("phone") or tenant.get("telefoon", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Huurder heeft geen telefoonnummer")
    
    # Clean phone number
    phone_clean = phone.replace(" ", "").replace("-", "").replace("+", "")
    if not phone_clean.startswith("597"):
        phone_clean = "597" + phone_clean
    
    company_name = comp.get("stamp_company_name") or comp.get("name", "")
    tenant_name = tenant.get("name", "")
    outstanding = tenant.get("outstanding_rent", 0) + tenant.get("service_costs", 0) + tenant.get("fines", 0)
    
    # Build message based on type
    if data.message_type == "reminder":
        message = (f"Beste {tenant_name},\n\n"
                   f"Dit is een herinnering van {company_name}.\n"
                   f"Uw openstaand saldo is SRD {outstanding:,.2f}.\n"
                   f"Gelieve zo spoedig mogelijk te betalen.\n\n"
                   f"Met vriendelijke groet,\n{company_name}")
    elif data.message_type == "fine":
        message = (f"Beste {tenant_name},\n\n"
                   f"Er is een boete toegepast op uw account bij {company_name}.\n"
                   f"Uw totaal openstaand saldo is nu SRD {outstanding:,.2f}.\n"
                   f"Neem contact op voor vragen.\n\n"
                   f"Met vriendelijke groet,\n{company_name}")
    elif data.message_type == "overdue":
        overdue_months = tenant.get("overdue_months", [])
        months_str = ", ".join(overdue_months) if overdue_months else "onbekend"
        message = (f"Beste {tenant_name},\n\n"
                   f"Uw huur bij {company_name} is achterstallig.\n"
                   f"Achterstand maanden: {months_str}\n"
                   f"Totaal openstaand: SRD {outstanding:,.2f}\n\n"
                   f"Gelieve zo spoedig mogelijk te betalen om verdere maatregelen te voorkomen.\n\n"
                   f"Met vriendelijke groet,\n{company_name}")
    elif data.message_type == "custom" and data.custom_message:
        message = data.custom_message
    else:
        raise HTTPException(status_code=400, detail="Ongeldig berichttype")
    
    # Add bank info if available
    bank_name = comp.get("bank_name")
    bank_account = comp.get("bank_account_number")
    bank_holder = comp.get("bank_account_name")
    if bank_name and bank_account:
        message += f"\n\n--- Bankgegevens ---\nBank: {bank_name}\nRekening: {bank_account}"
        if bank_holder:
            message += f"\nT.n.v.: {bank_holder}"
    
    # Send via WhatsApp Business Cloud API
    wa_sent = False
    twilio_sent = False
    results = []
    
    if comp.get("wa_enabled") and comp.get("wa_api_token") and comp.get("wa_phone_id"):
        wa_url = comp.get("wa_api_url", "https://graph.facebook.com/v21.0")
        wa_token = comp["wa_api_token"]
        wa_phone_id = comp["wa_phone_id"]
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{wa_url}/{wa_phone_id}/messages",
                    headers={
                        "Authorization": f"Bearer {wa_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "to": phone_clean,
                        "type": "text",
                        "text": {"body": message}
                    }
                )
                result = resp.json()
            
            wa_sent = resp.status_code == 200
            await db.kiosk_wa_messages.insert_one({
                "message_id": generate_uuid(),
                "company_id": company["company_id"],
                "tenant_id": data.tenant_id,
                "tenant_name": tenant_name,
                "phone": phone_clean,
                "message_type": data.message_type,
                "channel": "whatsapp",
                "message": message,
                "status": "sent" if wa_sent else "failed",
                "api_response": str(result),
                "created_at": datetime.now(timezone.utc)
            })
            results.append(f"WhatsApp: {'verstuurd' if wa_sent else 'mislukt'}")
        except Exception as e:
            results.append(f"WhatsApp: fout - {str(e)}")
    
    # Also send via Twilio WhatsApp if enabled
    if comp.get("twilio_enabled") and comp.get("twilio_account_sid") and comp.get("twilio_auth_token") and comp.get("twilio_phone_number"):
        phone_twilio = phone.replace(" ", "").replace("-", "")
        if not phone_twilio.startswith("+"):
            phone_twilio = "+597" + phone_twilio if not phone_twilio.startswith("597") else "+" + phone_twilio
        
        try:
            from twilio.rest import Client as TwilioClient
            tw_client = TwilioClient(comp["twilio_account_sid"], comp["twilio_auth_token"])
            tw_from = comp["twilio_phone_number"]
            if not tw_from.startswith("whatsapp:"):
                tw_from = f"whatsapp:{tw_from}"
            tw_client.messages.create(
                body=message,
                from_=tw_from,
                to=f"whatsapp:{phone_twilio}"
            )
            twilio_sent = True
        except Exception as e:
            results.append(f"Twilio WhatsApp: fout - {str(e)}")
        
        await db.kiosk_wa_messages.insert_one({
            "message_id": generate_uuid(),
            "company_id": company["company_id"],
            "tenant_id": data.tenant_id,
            "tenant_name": tenant_name,
            "phone": phone_twilio,
            "message_type": data.message_type,
            "channel": "twilio_whatsapp",
            "message": message,
            "status": "sent" if twilio_sent else "failed",
            "created_at": datetime.now(timezone.utc)
        })
        results.append(f"Twilio WhatsApp: {'verstuurd' if twilio_sent else 'mislukt'}")
    
    if wa_sent or twilio_sent:
        return {"status": "sent", "message": f"Bericht verstuurd naar {tenant_name} ({', '.join(results)})"}
    elif not comp.get("wa_enabled") and not comp.get("twilio_enabled"):
        raise HTTPException(status_code=400, detail="Geen berichtenkanaal geconfigureerd. Schakel WhatsApp of Twilio in bij Instellingen.")
    else:
        return {"status": "failed", "message": f"Verzending mislukt: {', '.join(results)}"}

@router.post("/admin/whatsapp/send-bulk")
async def send_bulk_whatsapp(message_type: str = "overdue", company: dict = Depends(get_current_company)):
    """Send WhatsApp to all tenants with outstanding balance"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    
    if not comp.get("wa_enabled") or not comp.get("wa_api_token"):
        raise HTTPException(status_code=400, detail="WhatsApp Business API is niet geconfigureerd")
    
    tenants = await db.kiosk_tenants.find({"company_id": company["company_id"], "status": "active"}, {"_id": 0}).to_list(500)
    
    sent = 0
    failed = 0
    for tenant in tenants:
        outstanding = (tenant.get("outstanding_rent", 0) + tenant.get("service_costs", 0) + tenant.get("fines", 0))
        if outstanding <= 0 or not (tenant.get("phone") or tenant.get("telefoon")):
            continue
        try:
            msg_data = WhatsAppMessage(tenant_id=tenant["tenant_id"], message_type=message_type)
            await send_whatsapp_message(msg_data, company)
            sent += 1
        except Exception:
            failed += 1
    
    return {"sent": sent, "failed": failed, "message": f"{sent} berichten verstuurd, {failed} mislukt"}

@router.get("/admin/whatsapp/history")
async def get_whatsapp_history(
    limit: int = 100,
    skip: int = 0,
    msg_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    company: dict = Depends(get_current_company)
):
    """Get WhatsApp/Twilio message history with filtering and pagination"""
    query = {"company_id": company["company_id"]}
    if msg_type and msg_type != "all":
        query["message_type"] = msg_type
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"tenant_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.kiosk_wa_messages.count_documents(query)
    messages = await db.kiosk_wa_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(min(limit, 200))
    
    return {"messages": messages, "total": total}

@router.post("/admin/whatsapp/test")
async def test_whatsapp_connection(company: dict = Depends(get_current_company)):
    """Test WhatsApp Business API connection"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})
    
    wa_token = comp.get("wa_api_token")
    wa_phone_id = comp.get("wa_phone_id")
    wa_url = comp.get("wa_api_url", "https://graph.facebook.com/v21.0")
    
    if not wa_token or not wa_phone_id:
        return {"status": "not_configured", "message": "API token en Phone ID zijn vereist"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{wa_url}/{wa_phone_id}",
                headers={"Authorization": f"Bearer {wa_token}"}
            )
            if resp.status_code == 200:
                return {"status": "connected", "message": "Verbinding succesvol!"}
            else:
                return {"status": "error", "message": f"API fout: {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Verbinding mislukt: {str(e)}"}


@router.post("/admin/twilio/test")
async def test_twilio_connection(company: dict = Depends(get_current_company)):
    """Test Twilio SMS connection"""
    comp = await db.kiosk_companies.find_one({"company_id": company["company_id"]}, {"_id": 0})

    sid = comp.get("twilio_account_sid")
    token = comp.get("twilio_auth_token")
    phone = comp.get("twilio_phone_number")

    if not sid or not token or not phone:
        return {"status": "not_configured", "message": "Account SID, Auth Token en telefoonnummer zijn vereist"}

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(sid, token)
        # Fetch account to verify credentials
        account = client.api.accounts(sid).fetch()
        if account.status == "active":
            return {"status": "connected", "message": f"Verbinding succesvol! Account: {account.friendly_name}"}
        else:
            return {"status": "error", "message": f"Account status: {account.status}"}
    except Exception as e:
        return {"status": "error", "message": f"Verbinding mislukt: {str(e)}"}


@router.post("/admin/twilio/send")
async def send_twilio_sms(request: dict, company: dict = Depends(get_current_company)):
    """Send a Twilio SMS to a specific tenant"""
    company_id = company["company_id"]
    comp = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    if not comp or not comp.get("twilio_enabled") or not comp.get("twilio_account_sid"):
        raise HTTPException(status_code=400, detail="Twilio SMS is niet geconfigureerd")

    tenant_id = request.get("tenant_id")
    message = request.get("message", "")
    if not tenant_id or not message:
        raise HTTPException(status_code=400, detail="tenant_id en message zijn vereist")

    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")

    phone = tenant.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Huurder heeft geen telefoonnummer")

    phone_clean = phone.replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        phone_clean = "+597" + phone_clean if not phone_clean.startswith("597") else "+" + phone_clean

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(comp["twilio_account_sid"], comp["twilio_auth_token"])
        twilio_from = comp["twilio_phone_number"]
        if not twilio_from.startswith("whatsapp:"):
            twilio_from = f"whatsapp:{twilio_from}"
        client.messages.create(
            body=message,
            from_=twilio_from,
            to=f"whatsapp:{phone_clean}"
        )
        send_status = "sent"
    except Exception as e:
        send_status = "failed"
        raise HTTPException(status_code=500, detail=f"WhatsApp bericht versturen mislukt: {str(e)}")
    finally:
        await db.kiosk_wa_messages.insert_one({
            "message_id": generate_uuid(),
            "company_id": company_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant.get("name", ""),
            "phone": phone_clean,
            "message_type": "reminder",
            "channel": "twilio_whatsapp",
            "message": message,
            "status": send_status,
            "created_at": datetime.now(timezone.utc)
        })

    return {"message": "WhatsApp bericht verstuurd via Twilio", "status": "sent"}


