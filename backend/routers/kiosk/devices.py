from .base import *

# ============== SHELLY STROOMBREKERS ==============

class ShellyDeviceCreate(BaseModel):
    apartment_id: str
    device_ip: str
    device_name: Optional[str] = None
    device_type: str = "gen1"  # gen1 or gen2
    channel: int = 0

class ShellyDeviceUpdate(BaseModel):
    device_ip: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    channel: Optional[int] = None

@router.get("/admin/shelly-devices")
async def get_shelly_devices(company: dict = Depends(get_current_company)):
    devices = await db.kiosk_shelly_devices.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).to_list(100)
    return devices

@router.post("/admin/shelly-devices")
async def add_shelly_device(data: ShellyDeviceCreate, company: dict = Depends(get_current_company)):
    device_id = generate_uuid()
    device = {
        "device_id": device_id,
        "company_id": company["company_id"],
        "apartment_id": data.apartment_id,
        "device_ip": data.device_ip,
        "device_name": data.device_name or f"Shelly {data.device_ip}",
        "device_type": data.device_type,
        "channel": data.channel,
        "last_status": None,
        "created_at": datetime.now(timezone.utc)
    }
    await db.kiosk_shelly_devices.insert_one(device)
    return {"device_id": device_id, "message": "Shelly apparaat toegevoegd"}

@router.put("/admin/shelly-devices/{device_id}")
async def update_shelly_device(device_id: str, data: ShellyDeviceUpdate, company: dict = Depends(get_current_company)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Geen wijzigingen")
    await db.kiosk_shelly_devices.update_one(
        {"device_id": device_id, "company_id": company["company_id"]},
        {"$set": updates}
    )
    return {"message": "Apparaat bijgewerkt"}

@router.delete("/admin/shelly-devices/{device_id}")
async def delete_shelly_device(device_id: str, company: dict = Depends(get_current_company)):
    await db.kiosk_shelly_devices.delete_one(
        {"device_id": device_id, "company_id": company["company_id"]}
    )
    return {"message": "Apparaat verwijderd"}

@router.post("/admin/shelly-devices/{device_id}/control")
async def control_shelly_device(device_id: str, action: str = "toggle", company: dict = Depends(get_current_company)):
    """Control a Shelly relay: action = on, off, toggle"""
    device = await db.kiosk_shelly_devices.find_one(
        {"device_id": device_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not device:
        raise HTTPException(status_code=404, detail="Apparaat niet gevonden")
    
    ip = device["device_ip"]
    ch = device.get("channel", 0)
    dtype = device.get("device_type", "gen1")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            if dtype == "gen2":
                if action == "toggle":
                    url = f"http://{ip}/rpc/switch.toggle?id={ch}"
                else:
                    on_val = "true" if action == "on" else "false"
                    url = f"http://{ip}/rpc/switch.set?id={ch}&on={on_val}"
                resp = await client.get(url)
                result = resp.json()
                new_status = result.get("was_on") is False if action == "toggle" else (action == "on")
            else:
                url = f"http://{ip}/relay/{ch}?turn={action}"
                resp = await client.get(url)
                result = resp.json()
                new_status = result.get("ison", False)
        
        status_str = "on" if new_status else "off"
        await db.kiosk_shelly_devices.update_one(
            {"device_id": device_id},
            {"$set": {"last_status": status_str, "last_check": datetime.now(timezone.utc)}}
        )
        
        # === AUTO WHATSAPP: Stroombreker AAN/UIT notificatie ===
        try:
            apt_id = device.get("apartment_id", "")
            if apt_id:
                tenant_for_shelly = await db.kiosk_tenants.find_one(
                    {"apartment_id": apt_id, "company_id": company["company_id"], "status": "active"}
                )
                if tenant_for_shelly:
                    t_phone = tenant_for_shelly.get("phone") or tenant_for_shelly.get("telefoon", "")
                    comp_name = company.get("stamp_company_name") or company.get("name", "")
                    device_name = device.get("device_name", "Stroombreker")
                    apt_nr = tenant_for_shelly.get("apartment_number", apt_id)
                    if t_phone:
                        if new_status:
                            wa_shelly_msg = (f"Beste {tenant_for_shelly['name']},\n\n"
                                             f"De stroombreker ({device_name}) van appartement {apt_nr} is weer INGESCHAKELD.\n"
                                             f"U heeft weer stroom.\n\n"
                                             f"Met vriendelijke groet,\n{comp_name}")
                        else:
                            wa_shelly_msg = (f"Beste {tenant_for_shelly['name']},\n\n"
                                             f"De stroombreker ({device_name}) van appartement {apt_nr} is UITGESCHAKELD.\n"
                                             f"Neem contact op met de verhuurder als u vragen heeft.\n\n"
                                             f"Met vriendelijke groet,\n{comp_name}")
                        await _send_message_auto(
                            company["company_id"], t_phone, wa_shelly_msg,
                            tenant_for_shelly["tenant_id"], tenant_for_shelly["name"],
                            "shelly_on" if new_status else "shelly_off"
                        )
        except Exception:
            pass  # Notificatie mag hoofdflow niet breken
        
        return {"status": status_str, "message": f"Stroombreker {'AAN' if new_status else 'UIT'}"}
    
    except httpx.TimeoutException:
        return {"status": "unreachable", "message": f"Apparaat {ip} niet bereikbaar (timeout)"}
    except httpx.ConnectError:
        return {"status": "unreachable", "message": f"Apparaat {ip} niet bereikbaar (geen verbinding)"}
    except Exception as e:
        return {"status": "error", "message": f"Fout: {str(e)}"}

@router.get("/admin/shelly-devices/{device_id}/status")
async def get_shelly_status(device_id: str, company: dict = Depends(get_current_company)):
    """Get current status of a Shelly relay"""
    device = await db.kiosk_shelly_devices.find_one(
        {"device_id": device_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not device:
        raise HTTPException(status_code=404, detail="Apparaat niet gevonden")
    
    ip = device["device_ip"]
    ch = device.get("channel", 0)
    dtype = device.get("device_type", "gen1")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            if dtype == "gen2":
                resp = await client.get(f"http://{ip}/rpc/Switch.GetStatus?id={ch}")
                result = resp.json()
                is_on = result.get("output", False)
                power = result.get("apower", 0)
            else:
                resp = await client.get(f"http://{ip}/relay/{ch}")
                result = resp.json()
                is_on = result.get("ison", False)
                power = result.get("power", 0)
        
        status_str = "on" if is_on else "off"
        await db.kiosk_shelly_devices.update_one(
            {"device_id": device_id},
            {"$set": {"last_status": status_str, "last_check": datetime.now(timezone.utc)}}
        )
        return {"status": status_str, "power_w": power, "online": True}
    
    except Exception:
        return {"status": device.get("last_status", "unknown"), "power_w": 0, "online": False}

@router.post("/admin/shelly-devices/refresh-all")
async def refresh_all_shelly(company: dict = Depends(get_current_company)):
    """Refresh status of all Shelly devices"""
    devices = await db.kiosk_shelly_devices.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).to_list(100)
    
    results = []
    async with httpx.AsyncClient(timeout=3.0) as client:
        for dev in devices:
            ip = dev["device_ip"]
            ch = dev.get("channel", 0)
            dtype = dev.get("device_type", "gen1")
            try:
                if dtype == "gen2":
                    resp = await client.get(f"http://{ip}/rpc/Switch.GetStatus?id={ch}")
                    r = resp.json()
                    is_on = r.get("output", False)
                else:
                    resp = await client.get(f"http://{ip}/relay/{ch}")
                    r = resp.json()
                    is_on = r.get("ison", False)
                
                status_str = "on" if is_on else "off"
                await db.kiosk_shelly_devices.update_one(
                    {"device_id": dev["device_id"]},
                    {"$set": {"last_status": status_str, "last_check": datetime.now(timezone.utc)}}
                )
                results.append({"device_id": dev["device_id"], "status": status_str, "online": True})
            except Exception:
                results.append({"device_id": dev["device_id"], "status": dev.get("last_status", "unknown"), "online": False})
    
    return results




# ============== INTERNET AANSLUITINGEN ==============

@router.get("/admin/internet/plans")
async def list_internet_plans(company: dict = Depends(get_current_company)):
    """List all internet plans"""
    plans = await db.kiosk_internet_plans.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).sort("price", 1).to_list(100)
    return plans

@router.post("/admin/internet/plans")
async def create_internet_plan(data: InternetPlanCreate, company: dict = Depends(get_current_company)):
    """Create a new internet plan"""
    plan_id = generate_uuid()
    plan = {
        "plan_id": plan_id,
        "company_id": company["company_id"],
        "name": data.name,
        "speed": data.speed,
        "price": data.price,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_internet_plans.insert_one(plan)
    plan.pop("_id", None)
    return plan

@router.put("/admin/internet/plans/{plan_id}")
async def update_internet_plan(plan_id: str, data: InternetPlanUpdate, company: dict = Depends(get_current_company)):
    """Update an internet plan"""
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        return {"message": "Geen wijzigingen"}
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.kiosk_internet_plans.update_one(
        {"plan_id": plan_id, "company_id": company["company_id"]}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan niet gevonden")
    # Sync price to all tenants with this plan
    if "price" in updates:
        await db.kiosk_tenants.update_many(
            {"internet_plan_id": plan_id, "company_id": company["company_id"]},
            {"$set": {"internet_cost": updates["price"]}}
        )
    return {"message": "Plan bijgewerkt"}

@router.delete("/admin/internet/plans/{plan_id}")
async def delete_internet_plan(plan_id: str, company: dict = Depends(get_current_company)):
    """Delete an internet plan and unassign from tenants"""
    result = await db.kiosk_internet_plans.delete_one(
        {"plan_id": plan_id, "company_id": company["company_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan niet gevonden")
    # Unassign from tenants
    await db.kiosk_tenants.update_many(
        {"internet_plan_id": plan_id, "company_id": company["company_id"]},
        {"$set": {"internet_plan_id": None, "internet_cost": 0, "internet_plan_name": ""}}
    )
    return {"message": "Plan verwijderd"}

@router.get("/admin/internet/connections")
async def list_internet_connections(company: dict = Depends(get_current_company)):
    """List all tenants with their internet plan"""
    company_id = company["company_id"]
    tenants = await db.kiosk_tenants.find(
        {"company_id": company_id, "status": "active"},
        {"_id": 0, "tenant_id": 1, "name": 1, "apartment_number": 1,
         "internet_plan_id": 1, "internet_plan_name": 1, "internet_cost": 1}
    ).to_list(1000)
    return tenants

@router.post("/admin/internet/assign")
async def assign_internet_plan(tenant_id: str = None, plan_id: str = None, company: dict = Depends(get_current_company)):
    """Assign or remove an internet plan for a tenant"""
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    if not plan_id or plan_id == "none":
        # Remove internet
        await db.kiosk_tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"internet_plan_id": None, "internet_cost": 0, "internet_outstanding": 0, "internet_plan_name": "", "updated_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Internet verwijderd"}
    
    plan = await db.kiosk_internet_plans.find_one({"plan_id": plan_id, "company_id": company_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan niet gevonden")
    
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "internet_plan_id": plan_id,
            "internet_plan_name": f"{plan['name']} ({plan['speed']})",
            "internet_cost": plan["price"],
            "internet_outstanding": tenant.get("internet_outstanding", 0) + plan["price"],
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    
    # WhatsApp notification
    try:
        t_phone = tenant.get("phone") or tenant.get("telefoon", "")
        if t_phone:
            comp_name = company.get("stamp_company_name") or company.get("name", "")
            wa_msg = (f"Beste {tenant['name']},\n\n"
                      f"Uw internetaansluiting is gewijzigd.\n"
                      f"Plan: {plan['name']} ({plan['speed']})\n"
                      f"Kosten: SRD {plan['price']:,.2f} per maand\n\n"
                      f"Met vriendelijke groet,\n{comp_name}")
            await _send_message_auto(company_id, t_phone, wa_msg, tenant_id, tenant["name"], "internet_assigned")
    except Exception:
        pass
    
    return {"message": f"Internet plan toegewezen: {plan['name']}"}




# ============== TENDA ROUTER MANAGEMENT ==============

class TendaRouterCreate(BaseModel):
    tenant_id: str
    router_ip: str
    admin_password: str
    router_name: Optional[str] = ""

class TendaRouterUpdate(BaseModel):
    router_ip: Optional[str] = None
    admin_password: Optional[str] = None
    router_name: Optional[str] = None

import hashlib

async def _tenda_login(router_ip: str, admin_password: str):
    """Login to Tenda router and return session cookies"""
    import httpx
    md5_pass = hashlib.md5(admin_password.encode()).hexdigest()
    async with httpx.AsyncClient(timeout=8) as client:
        resp = await client.post(
            f"http://{router_ip}/login/Auth",
            data=f"username=admin&password={md5_pass}",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return resp.cookies

async def _tenda_get_devices(router_ip: str, cookies):
    """Get connected devices from Tenda router"""
    import httpx
    import time
    async with httpx.AsyncClient(timeout=8, cookies=cookies) as client:
        resp = await client.get(f"http://{router_ip}/goform/GetIpMacBind?{int(time.time())}")
        data = resp.json()
        return data.get("bindList", [])

async def _tenda_set_internet(router_ip: str, cookies, enable: bool):
    """Enable or disable internet on Tenda router (via WiFi schedule)"""
    import httpx
    async with httpx.AsyncClient(timeout=8, cookies=cookies) as client:
        if enable:
            resp = await client.post(
                f"http://{router_ip}/goform/setWiFi",
                data="wifiEn=1",
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
        else:
            resp = await client.post(
                f"http://{router_ip}/goform/setWiFi",
                data="wifiEn=0",
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
        return resp.status_code == 200

@router.get("/admin/tenda/routers")
async def list_tenda_routers(company: dict = Depends(get_current_company)):
    """List all Tenda routers for this company"""
    company_id = company["company_id"]
    routers = await db.kiosk_tenda_routers.find(
        {"company_id": company_id}, {"_id": 0}
    ).to_list(100)
    return routers

@router.post("/admin/tenda/routers")
async def add_tenda_router(data: TendaRouterCreate, company: dict = Depends(get_current_company)):
    """Add a Tenda router for a tenant"""
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    existing = await db.kiosk_tenda_routers.find_one({"tenant_id": data.tenant_id, "company_id": company_id})
    if existing:
        raise HTTPException(status_code=400, detail="Deze huurder heeft al een router gekoppeld")
    
    router_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    router_doc = {
        "router_id": router_id,
        "company_id": company_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "apartment_number": tenant.get("apartment_number", ""),
        "router_ip": data.router_ip,
        "admin_password": data.admin_password,
        "router_name": data.router_name or f"Router {tenant.get('apartment_number', '')}",
        "status": "unknown",
        "internet_enabled": True,
        "last_check": None,
        "connected_devices": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.kiosk_tenda_routers.insert_one(router_doc)
    del router_doc["_id"]
    return router_doc

@router.put("/admin/tenda/routers/{router_id}")
async def update_tenda_router(router_id: str, data: TendaRouterUpdate, company: dict = Depends(get_current_company)):
    """Update router settings"""
    company_id = company["company_id"]
    update = {"updated_at": datetime.now(timezone.utc)}
    if data.router_ip is not None:
        update["router_ip"] = data.router_ip
    if data.admin_password is not None:
        update["admin_password"] = data.admin_password
    if data.router_name is not None:
        update["router_name"] = data.router_name
    
    result = await db.kiosk_tenda_routers.update_one(
        {"router_id": router_id, "company_id": company_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Router niet gevonden")
    return {"message": "Router bijgewerkt"}

@router.delete("/admin/tenda/routers/{router_id}")
async def delete_tenda_router(router_id: str, company: dict = Depends(get_current_company)):
    """Remove a Tenda router"""
    result = await db.kiosk_tenda_routers.delete_one({"router_id": router_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Router niet gevonden")
    return {"message": "Router verwijderd"}

@router.post("/admin/tenda/routers/{router_id}/status")
async def check_tenda_status(router_id: str, company: dict = Depends(get_current_company)):
    """Check router status and connected devices"""
    router = await db.kiosk_tenda_routers.find_one(
        {"router_id": router_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not router:
        raise HTTPException(status_code=404, detail="Router niet gevonden")
    
    try:
        cookies = await _tenda_login(router["router_ip"], router["admin_password"])
        devices = await _tenda_get_devices(router["router_ip"], cookies)
        online_devices = [{"name": d.get("devname", "Onbekend"), "mac": d.get("macaddr", ""), "ip": d.get("ipaddr", "")} for d in devices if str(d.get("status")) == "1"]
        
        await db.kiosk_tenda_routers.update_one(
            {"router_id": router_id},
            {"$set": {
                "status": "online",
                "connected_devices": online_devices,
                "last_check": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        return {"status": "online", "connected_devices": online_devices, "device_count": len(online_devices)}
    except Exception as e:
        await db.kiosk_tenda_routers.update_one(
            {"router_id": router_id},
            {"$set": {"status": "offline", "last_check": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
        )
        return {"status": "offline", "connected_devices": [], "device_count": 0, "error": str(e)}

@router.post("/admin/tenda/routers/{router_id}/control")
async def control_tenda_internet(router_id: str, action: str = "enable", company: dict = Depends(get_current_company)):
    """Enable or disable internet on Tenda router"""
    router = await db.kiosk_tenda_routers.find_one(
        {"router_id": router_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not router:
        raise HTTPException(status_code=404, detail="Router niet gevonden")
    
    enable = action == "enable"
    try:
        cookies = await _tenda_login(router["router_ip"], router["admin_password"])
        success = await _tenda_set_internet(router["router_ip"], cookies, enable)
        
        if success:
            await db.kiosk_tenda_routers.update_one(
                {"router_id": router_id},
                {"$set": {"internet_enabled": enable, "updated_at": datetime.now(timezone.utc)}}
            )
            return {"success": True, "internet_enabled": enable, "message": f"Internet {'ingeschakeld' if enable else 'uitgeschakeld'}"}
        else:
            return {"success": False, "message": "Router commando mislukt"}
    except Exception as e:
        return {"success": False, "message": f"Verbinding mislukt: {str(e)}"}

