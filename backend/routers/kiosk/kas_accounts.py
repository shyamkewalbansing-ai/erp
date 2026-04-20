"""Bank/Kas multi-account + multi-currency + exchange rate module."""
import asyncio
from datetime import datetime, timezone, timedelta
from .base import *
import httpx

CURRENCIES = {"SRD", "EUR", "USD"}
CME_URL = "https://www.cme.sr/"
CME_RATES_ENDPOINT = "https://www.cme.sr/Home/GetTodaysExchangeRates/?BusinessDate=2016-07-25"

# Simple in-process cache for CME rates
_cme_cache = {"data": None, "fetched_at": None}
_CACHE_TTL_MINUTES = 60


async def _ensure_default_account(company_id: str) -> dict:
    """Auto-create 'Hoofdkas' SRD for companies without any kas account."""
    existing = await db.kiosk_kas_accounts.find_one({"company_id": company_id, "is_default": True})
    if existing:
        return existing
    acc_id = generate_uuid()
    doc = {
        "account_id": acc_id,
        "company_id": company_id,
        "name": "Hoofdkas",
        "currency": "SRD",
        "description": "Standaard bank/kas voor huurinkomsten",
        "is_default": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_kas_accounts.insert_one(doc)
    # Stamp all existing kas entries without account_id to main account
    await db.kiosk_kas.update_many(
        {"company_id": company_id, "$or": [{"account_id": {"$exists": False}}, {"account_id": ""}, {"account_id": None}]},
        {"$set": {"account_id": acc_id}},
    )
    return doc


async def _resolve_account(company_id: str, account_id: Optional[str]) -> dict:
    """Return the account dict. Falls back to default if not provided."""
    if account_id:
        acc = await db.kiosk_kas_accounts.find_one({"account_id": account_id, "company_id": company_id})
        if acc:
            return acc
    return await _ensure_default_account(company_id)


@router.get("/admin/kas-accounts")
async def list_kas_accounts(company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    await _ensure_default_account(company_id)
    accounts = await db.kiosk_kas_accounts.find({"company_id": company_id}).sort("created_at", 1).to_list(100)
    result = []
    for a in accounts:
        # Compute balance per account
        # Income = manual kas income + approved rent payments (only for default SRD account)
        kas_entries = await db.kiosk_kas.find({"company_id": company_id, "account_id": a["account_id"]}).to_list(5000)
        manual_income = sum(e.get("amount", 0) for e in kas_entries if e.get("entry_type") == "income")
        total_expense = sum(e.get("amount", 0) for e in kas_entries if e.get("entry_type") in ("expense", "salary"))
        payment_income = 0
        if a.get("is_default"):
            payments = await db.kiosk_payments.find({"company_id": company_id, "status": {"$in": ["approved", None]}}).to_list(10000)
            payment_income = sum(p.get("amount", 0) for p in payments if p.get("status", "approved") != "pending" and p.get("status") != "rejected")
        total_income = manual_income + payment_income
        balance = total_income - total_expense
        result.append({
            "account_id": a["account_id"],
            "name": a["name"],
            "currency": a.get("currency", "SRD"),
            "description": a.get("description", ""),
            "is_default": a.get("is_default", False),
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": balance,
            "created_at": a.get("created_at"),
        })
    return result


@router.post("/admin/kas-accounts")
async def create_kas_account(data: KasAccountCreate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    currency = (data.currency or "SRD").upper()
    if currency not in CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Ongeldige valuta. Kies uit: {', '.join(sorted(CURRENCIES))}")
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Naam verplicht")
    await _ensure_default_account(company_id)
    exists = await db.kiosk_kas_accounts.find_one({"company_id": company_id, "name": name})
    if exists:
        raise HTTPException(status_code=400, detail="Een bank/kas met deze naam bestaat al")
    acc_id = generate_uuid()
    doc = {
        "account_id": acc_id,
        "company_id": company_id,
        "name": name,
        "currency": currency,
        "description": data.description or "",
        "is_default": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_kas_accounts.insert_one(doc)
    return {"account_id": acc_id, "message": "Bank/Kas aangemaakt"}


@router.put("/admin/kas-accounts/{account_id}")
async def update_kas_account(account_id: str, data: KasAccountUpdate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    acc = await db.kiosk_kas_accounts.find_one({"account_id": account_id, "company_id": company_id})
    if not acc:
        raise HTTPException(status_code=404, detail="Bank/Kas niet gevonden")
    updates = {}
    if data.name:
        new_name = data.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Naam mag niet leeg zijn")
        dup = await db.kiosk_kas_accounts.find_one({"company_id": company_id, "name": new_name, "account_id": {"$ne": account_id}})
        if dup:
            raise HTTPException(status_code=400, detail="Een bank/kas met deze naam bestaat al")
        updates["name"] = new_name
    if data.description is not None:
        updates["description"] = data.description
    if updates:
        await db.kiosk_kas_accounts.update_one({"account_id": account_id}, {"$set": updates})
    return {"message": "Bank/Kas bijgewerkt"}


@router.delete("/admin/kas-accounts/{account_id}")
async def delete_kas_account(account_id: str, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    acc = await db.kiosk_kas_accounts.find_one({"account_id": account_id, "company_id": company_id})
    if not acc:
        raise HTTPException(status_code=404, detail="Bank/Kas niet gevonden")
    if acc.get("is_default"):
        raise HTTPException(status_code=400, detail="De hoofdkas kan niet verwijderd worden")
    entry_count = await db.kiosk_kas.count_documents({"company_id": company_id, "account_id": account_id})
    if entry_count > 0:
        raise HTTPException(status_code=400, detail=f"Kan niet verwijderen: {entry_count} boekingen aanwezig. Verplaats of verwijder ze eerst.")
    await db.kiosk_kas_accounts.delete_one({"account_id": account_id})
    return {"message": "Bank/Kas verwijderd"}


# ============== EXCHANGE RATES (CME.sr) ==============

async def _fetch_cme_rates() -> dict:
    """Fetch + parse + cache CME rates via official JSON endpoint."""
    now = datetime.now(timezone.utc)
    cached = _cme_cache.get("data")
    fetched_at = _cme_cache.get("fetched_at")
    if cached and fetched_at and (now - fetched_at) < timedelta(minutes=_CACHE_TTL_MINUTES):
        return {**cached, "cached": True, "fetched_at": fetched_at.isoformat()}
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.post(
                CME_RATES_ENDPOINT,
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/json; charset=utf-8",
                    "Referer": CME_URL,
                },
                content="{}",
            )
            resp.raise_for_status()
            arr = resp.json()
            if not arr or not isinstance(arr, list):
                raise ValueError("Empty response from CME")
            d = arr[0]
            parsed = {
                "USD_buy": float(d.get("BuyUsdExchangeRate") or 0),
                "USD_sell": float(d.get("SaleUsdExchangeRate") or 0),
                "EUR_buy": float(d.get("BuyEuroExchangeRate") or 0),
                "EUR_sell": float(d.get("SaleEuroExchangeRate") or 0),
                "USD_to_EUR": float(d.get("ExchangeUsdRateNew") or 0),
                "EUR_to_USD": float(d.get("ExchangeUsdRate") or 0),
                "as_of": f"{d.get('BusinessDate', '')} {d.get('UpdatedTime', '')}".strip(),
                "source": CME_URL,
                "fetched_at": now.isoformat(),
                "cached": False,
            }
            _cme_cache["data"] = parsed
            _cme_cache["fetched_at"] = now
            return parsed
    except Exception as exc:
        if cached:
            return {**cached, "cached": True, "stale": True, "error": str(exc), "fetched_at": fetched_at.isoformat() if fetched_at else ""}
        return {"USD_buy": 0, "USD_sell": 0, "EUR_buy": 0, "EUR_sell": 0, "as_of": "", "source": CME_URL, "error": str(exc)}


@router.get("/admin/exchange-rates")
async def get_exchange_rates(company: dict = Depends(get_current_company)):
    """Return latest CME.sr cash buy/sell rates (cached 60m)."""
    return await _fetch_cme_rates()


@router.post("/admin/exchange-rates/convert")
async def convert_currency(payload: dict, company: dict = Depends(get_current_company)):
    """Convert between SRD/USD/EUR using CME.sr cash rates.
    Body: { amount: number, from: 'SRD'|'USD'|'EUR', to: 'SRD'|'USD'|'EUR', rate_type?: 'buy'|'sell' }
    For SRD->foreign we use SELL rate (bank sells foreign). For foreign->SRD we use BUY rate.
    """
    amount = float(payload.get("amount", 0) or 0)
    cur_from = (payload.get("from") or "SRD").upper()
    cur_to = (payload.get("to") or "SRD").upper()
    if cur_from not in CURRENCIES or cur_to not in CURRENCIES:
        raise HTTPException(status_code=400, detail="Ongeldige valuta")
    if amount < 0:
        raise HTTPException(status_code=400, detail="Bedrag mag niet negatief zijn")
    rates = await _fetch_cme_rates()
    if cur_from == cur_to:
        return {"amount": amount, "from": cur_from, "to": cur_to, "result": amount, "rate": 1, "source": CME_URL, "as_of": rates.get("as_of")}

    usd_buy = rates.get("USD_buy") or 0
    usd_sell = rates.get("USD_sell") or 0
    eur_buy = rates.get("EUR_buy") or 0
    eur_sell = rates.get("EUR_sell") or 0
    if usd_buy == 0 or eur_buy == 0:
        raise HTTPException(status_code=503, detail="Koersen tijdelijk niet beschikbaar")

    def srd_to_foreign(amt: float, cur: str) -> float:
        rate = usd_sell if cur == "USD" else eur_sell
        return amt / rate if rate else 0

    def foreign_to_srd(amt: float, cur: str) -> float:
        rate = usd_buy if cur == "USD" else eur_buy
        return amt * rate

    # Direct conversions
    if cur_from == "SRD":
        result = srd_to_foreign(amount, cur_to)
        rate = usd_sell if cur_to == "USD" else eur_sell
    elif cur_to == "SRD":
        result = foreign_to_srd(amount, cur_from)
        rate = usd_buy if cur_from == "USD" else eur_buy
    else:
        # Foreign -> Foreign: via SRD (buy from user, sell to user)
        srd_amt = foreign_to_srd(amount, cur_from)
        result = srd_to_foreign(srd_amt, cur_to)
        buy = usd_buy if cur_from == "USD" else eur_buy
        sell = usd_sell if cur_to == "USD" else eur_sell
        rate = buy / sell if sell else 0

    return {
        "amount": amount, "from": cur_from, "to": cur_to,
        "result": round(result, 4), "rate": round(rate, 6),
        "source": CME_URL, "as_of": rates.get("as_of"), "cached": rates.get("cached", False)
    }
