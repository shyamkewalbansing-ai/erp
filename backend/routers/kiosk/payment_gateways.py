from .base import *

# ============== SUMUP CHECKOUT ENDPOINTS ==============

class SumUpCheckoutRequest(BaseModel):
    amount: float
    description: str
    tenant_id: str
    payment_type: str

@router.post("/public/{company_id}/sumup/checkout")
async def create_sumup_checkout(company_id: str, data: SumUpCheckoutRequest):
    """Create a SumUp checkout for card payment"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    api_key = company.get("sumup_api_key", "")
    merchant_code = company.get("sumup_merchant_code", "")
    currency = company.get("sumup_currency", "EUR")
    exchange_rate = company.get("sumup_exchange_rate", 1.0)
    
    if not api_key or not merchant_code:
        raise HTTPException(status_code=400, detail="SumUp is niet geconfigureerd. Stel de API key en merchant code in via Instellingen.")
    
    if not exchange_rate or exchange_rate <= 0:
        raise HTTPException(status_code=400, detail="Wisselkoers is niet ingesteld. Stel deze in via Instellingen.")
    
    # Convert SRD amount to SumUp currency using exchange rate
    # exchange_rate = how many SRD per 1 unit of SumUp currency (e.g. 40 SRD = 1 EUR)
    converted_amount = round(data.amount / exchange_rate, 2)
    
    checkout_ref = f"KIOSK-{company_id}-{uuid.uuid4().hex[:8]}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sumup.com/v0.1/checkouts",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "checkout_reference": checkout_ref,
                    "amount": converted_amount,
                    "currency": currency,
                    "merchant_code": merchant_code,
                    "description": f"{data.description} (SRD {data.amount:.2f})",
                }
            )
            
            if response.status_code not in (200, 201):
                detail = response.text
                raise HTTPException(status_code=400, detail=f"SumUp fout: {detail}")
            
            checkout_data = response.json()
            
            return {
                "checkout_id": checkout_data.get("id"),
                "checkout_reference": checkout_ref,
                "amount_srd": data.amount,
                "amount_converted": converted_amount,
                "currency": currency,
                "exchange_rate": exchange_rate,
                "status": checkout_data.get("status", "PENDING")
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Verbinding met SumUp mislukt: {str(e)}")

@router.get("/public/{company_id}/sumup/checkout/{checkout_id}/status")
async def get_sumup_checkout_status(company_id: str, checkout_id: str):
    """Check status of a SumUp checkout"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    api_key = company.get("sumup_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="SumUp niet geconfigureerd")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.sumup.com/v0.1/checkouts/{checkout_id}",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Kon status niet ophalen")
            
            data = response.json()
            return {
                "status": data.get("status", "PENDING"),
                "transaction_id": data.get("transaction_id"),
                "amount": data.get("amount"),
            }
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Verbinding met SumUp mislukt")

@router.get("/public/{company_id}/sumup/enabled")
async def check_sumup_enabled(company_id: str):
    """Check if SumUp is enabled for this company"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return {
        "enabled": bool(company.get("sumup_enabled") and company.get("sumup_api_key") and company.get("sumup_merchant_code")),
        "currency": company.get("sumup_currency", "EUR"),
        "exchange_rate": company.get("sumup_exchange_rate", 1.0)
    }


# ============== MOPE CHECKOUT ENDPOINTS ==============

class MopeCheckoutRequest(BaseModel):
    amount: float
    description: str
    tenant_id: str
    payment_type: str

@router.get("/public/{company_id}/mope/enabled")
async def check_mope_enabled(company_id: str):
    """Check if Mope is enabled for this company"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return {
        "enabled": bool(company.get("mope_enabled") and company.get("mope_api_key"))
    }

@router.post("/public/{company_id}/mope/checkout")
async def create_mope_checkout(company_id: str, data: MopeCheckoutRequest):
    """Create a Mope payment request"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    api_key = company.get("mope_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Mope is niet geconfigureerd. Stel de API key in via Instellingen.")
    
    order_id = f"KIOSK-{company_id[:8]}-{uuid.uuid4().hex[:8]}"
    amount_cents = int(round(data.amount * 100))
    redirect_url = f"{os.environ.get('APP_URL', 'https://facturatie.sr')}/vastgoed/{company_id}?mope_done=1&order={order_id}"
    
    # Mock mode: if key starts with mock_, simulate Mope response
    if api_key.startswith("mock_"):
        mock_id = str(uuid.uuid4())
        mock_url = f"https://mope.sr/p/{mock_id}"
        # Store mock payment in DB for status polling
        await db.mope_mock_payments.insert_one({
            "payment_id": mock_id,
            "company_id": company_id,
            "amount": data.amount,
            "amount_cents": amount_cents,
            "status": "open",
            "created_at": datetime.now(timezone.utc),
            "tenant_id": data.tenant_id,
            "order_id": order_id,
        })
        return {
            "payment_id": mock_id,
            "payment_url": mock_url,
            "order_id": order_id,
            "amount": data.amount,
            "amount_cents": amount_cents,
            "mock": True
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.mope.sr/api/shop/payment_request",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "description": f"{data.description} ({data.tenant_id[:8]})",
                    "amount": amount_cents,
                    "order_id": order_id,
                    "currency": "SRD",
                    "redirect_url": redirect_url
                }
            )
            
            if response.status_code not in (200, 201):
                detail = response.text
                raise HTTPException(status_code=400, detail=f"Mope fout: {detail}")
            
            mope_data = response.json()
            
            return {
                "payment_id": mope_data.get("id"),
                "payment_url": mope_data.get("url"),
                "order_id": order_id,
                "amount": data.amount,
                "amount_cents": amount_cents
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Verbinding met Mope mislukt: {str(e)}")

@router.get("/public/{company_id}/mope/status/{payment_id}")
async def get_mope_payment_status(company_id: str, payment_id: str):
    """Check status of a Mope payment request"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    api_key = company.get("mope_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Mope niet geconfigureerd")
    
    # Mock mode
    if api_key.startswith("mock_"):
        mock_payment = await db.mope_mock_payments.find_one({"payment_id": payment_id}, {"_id": 0})
        if not mock_payment:
            raise HTTPException(status_code=404, detail="Betaalverzoek niet gevonden")
        # Mock stays "open" — never auto-approves. Real payment requires real API key.
        return {
            "status": mock_payment.get("status", "open"),
            "amount": mock_payment.get("amount_cents"),
            "payment_id": payment_id
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.mope.sr/api/shop/payment_request/{payment_id}",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Kon status niet ophalen")
            
            pdata = response.json()
            return {
                "status": pdata.get("status", "open"),
                "amount": pdata.get("amount"),
                "payment_id": pdata.get("id")
            }
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Verbinding met Mope mislukt")


# ============== UNI5PAY CHECKOUT ENDPOINTS ==============

class Uni5PayCheckoutRequest(BaseModel):
    amount: float
    description: str
    tenant_id: str
    payment_type: str

@router.get("/public/{company_id}/uni5pay/enabled")
async def check_uni5pay_enabled(company_id: str):
    """Check if Uni5Pay is enabled for this company"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return {
        "enabled": bool(company.get("uni5pay_enabled") and company.get("uni5pay_merchant_id"))
    }

@router.post("/public/{company_id}/uni5pay/checkout")
async def create_uni5pay_checkout(company_id: str, data: Uni5PayCheckoutRequest):
    """Create a Uni5Pay payment request (mock)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")

    merchant_id = company.get("uni5pay_merchant_id", "")
    if not merchant_id:
        raise HTTPException(status_code=400, detail="Uni5Pay is niet geconfigureerd. Stel het Merchant ID in via Instellingen.")

    order_id = f"U5P-{company_id[:8]}-{uuid.uuid4().hex[:8]}"
    payment_id = str(uuid.uuid4())
    amount_cents = int(round(data.amount * 100))

    # Mock mode: simulate Uni5Pay QR payment
    mock_qr_url = f"https://uni5pay.sr/pay/{payment_id}"
    await db.uni5pay_mock_payments.insert_one({
        "payment_id": payment_id,
        "company_id": company_id,
        "amount": data.amount,
        "amount_cents": amount_cents,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "tenant_id": data.tenant_id,
        "order_id": order_id,
    })
    return {
        "payment_id": payment_id,
        "payment_url": mock_qr_url,
        "order_id": order_id,
        "amount": data.amount,
        "amount_cents": amount_cents,
        "mock": True
    }

@router.get("/public/{company_id}/uni5pay/status/{payment_id}")
async def get_uni5pay_payment_status(company_id: str, payment_id: str):
    """Check status of a Uni5Pay payment request (mock: auto-transitions)"""
    company = await db.kiosk_companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")

    mock_payment = await db.uni5pay_mock_payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not mock_payment:
        raise HTTPException(status_code=404, detail="Betaalverzoek niet gevonden")

    created = mock_payment.get("created_at", datetime.now(timezone.utc))
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    # Mock stays "open" — never auto-approves. Real payment requires real API key.
    return {
        "status": mock_payment.get("status", "open"),
        "amount": mock_payment.get("amount_cents"),
        "payment_id": payment_id
    }

