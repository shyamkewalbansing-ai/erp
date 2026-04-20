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
        # Backfill currencies field for legacy accounts
        if not existing.get("currencies"):
            currencies = [existing.get("currency", "SRD")]
            await db.kiosk_kas_accounts.update_one({"account_id": existing["account_id"]}, {"$set": {"currencies": currencies}})
            existing["currencies"] = currencies
        return existing
    acc_id = generate_uuid()
    doc = {
        "account_id": acc_id,
        "company_id": company_id,
        "name": "Hoofdkas",
        "currency": "SRD",
        "currencies": ["SRD"],
        "description": "Standaard bank/kas voor huurinkomsten",
        "is_default": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_kas_accounts.insert_one(doc)
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
            if not acc.get("currencies"):
                currencies = [acc.get("currency", "SRD")]
                await db.kiosk_kas_accounts.update_one({"account_id": acc["account_id"]}, {"$set": {"currencies": currencies}})
                acc["currencies"] = currencies
            return acc
    return await _ensure_default_account(company_id)


def _resolve_currencies(data_currencies, data_currency) -> list:
    """Normalize currency input into a validated list."""
    currencies = []
    if isinstance(data_currencies, list) and data_currencies:
        currencies = [c.upper() for c in data_currencies if isinstance(c, str)]
    elif data_currency:
        currencies = [data_currency.upper()]
    if not currencies:
        currencies = ["SRD"]
    # dedupe + validate
    seen = []
    for c in currencies:
        if c in CURRENCIES and c not in seen:
            seen.append(c)
    if not seen:
        raise HTTPException(status_code=400, detail=f"Kies ten minste één geldige valuta uit: {', '.join(sorted(CURRENCIES))}")
    return seen


@router.get("/admin/kas-accounts")
async def list_kas_accounts(company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    await _ensure_default_account(company_id)
    accounts = await db.kiosk_kas_accounts.find({"company_id": company_id}).sort("created_at", 1).to_list(100)
    result = []
    for a in accounts:
        currencies = a.get("currencies") or [a.get("currency", "SRD")]
        # Backfill currencies if missing
        if not a.get("currencies"):
            await db.kiosk_kas_accounts.update_one({"account_id": a["account_id"]}, {"$set": {"currencies": currencies}})
        # Compute balance per currency
        kas_entries = await db.kiosk_kas.find({"company_id": company_id, "account_id": a["account_id"]}).to_list(5000)
        balances = {c: {"total_income": 0.0, "total_expense": 0.0, "balance": 0.0} for c in currencies}
        for e in kas_entries:
            cur = (e.get("currency") or currencies[0]).upper()
            if cur not in balances:
                balances[cur] = {"total_income": 0.0, "total_expense": 0.0, "balance": 0.0}
            if e.get("entry_type") == "income":
                balances[cur]["total_income"] += e.get("amount", 0)
            elif e.get("entry_type") in ("expense", "salary"):
                balances[cur]["total_expense"] += e.get("amount", 0)
        # Hoofdkas: payment income counts in SRD only
        if a.get("is_default") and "SRD" in balances:
            payments = await db.kiosk_payments.find({"company_id": company_id, "status": {"$in": ["approved", None]}}).to_list(10000)
            payment_income = sum(p.get("amount", 0) for p in payments if p.get("status", "approved") != "pending" and p.get("status") != "rejected")
            balances["SRD"]["total_income"] += payment_income
        for cur in balances:
            balances[cur]["balance"] = balances[cur]["total_income"] - balances[cur]["total_expense"]
        primary = currencies[0]
        result.append({
            "account_id": a["account_id"],
            "name": a["name"],
            "currency": primary,  # legacy field: first currency
            "currencies": currencies,
            "description": a.get("description", ""),
            "is_default": a.get("is_default", False),
            "balances": balances,
            "total_income": balances[primary]["total_income"],
            "total_expense": balances[primary]["total_expense"],
            "balance": balances[primary]["balance"],
            "created_at": a.get("created_at"),
        })
    return result


@router.post("/admin/kas-accounts")
async def create_kas_account(data: KasAccountCreate, company: dict = Depends(get_current_company)):
    company_id = company["company_id"]
    currencies = _resolve_currencies(data.currencies, data.currency)
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
        "currency": currencies[0],  # legacy primary
        "currencies": currencies,
        "description": data.description or "",
        "is_default": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_kas_accounts.insert_one(doc)
    return {"account_id": acc_id, "currencies": currencies, "message": "Bank/Kas aangemaakt"}


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
    if data.currencies is not None:
        new_currencies = _resolve_currencies(data.currencies, None)
        # Guard: cannot remove a currency that already has entries
        existing_currencies = acc.get("currencies") or [acc.get("currency", "SRD")]
        removed = [c for c in existing_currencies if c not in new_currencies]
        if removed:
            for c in removed:
                cnt = await db.kiosk_kas.count_documents({"company_id": company_id, "account_id": account_id, "currency": c})
                if cnt > 0:
                    raise HTTPException(status_code=400, detail=f"Kan {c} niet verwijderen: {cnt} boekingen aanwezig")
            # Also check default currency entries when old default currency is being removed
            if acc.get("currency") in removed:
                cnt = await db.kiosk_kas.count_documents({"company_id": company_id, "account_id": account_id, "$or": [{"currency": {"$exists": False}}, {"currency": acc.get("currency")}]})
                if cnt > 0:
                    raise HTTPException(status_code=400, detail=f"Kan {acc.get('currency')} niet verwijderen: {cnt} boekingen aanwezig")
        updates["currencies"] = new_currencies
        updates["currency"] = new_currencies[0]
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


async def _compute_conversion(cur_from: str, cur_to: str, amount: float) -> dict:
    """Shared FX conversion helper. Returns {result, rate, rates, as_of}."""
    rates = await _fetch_cme_rates()
    if cur_from == cur_to:
        return {"result": amount, "rate": 1, "rates": rates, "as_of": rates.get("as_of")}
    usd_buy = rates.get("USD_buy") or 0
    usd_sell = rates.get("USD_sell") or 0
    eur_buy = rates.get("EUR_buy") or 0
    eur_sell = rates.get("EUR_sell") or 0
    if usd_buy == 0 or eur_buy == 0:
        raise HTTPException(status_code=503, detail="Koersen tijdelijk niet beschikbaar")

    if cur_from == "SRD":
        rate = usd_sell if cur_to == "USD" else eur_sell
        result = amount / rate if rate else 0
    elif cur_to == "SRD":
        rate = usd_buy if cur_from == "USD" else eur_buy
        result = amount * rate
    else:
        buy = usd_buy if cur_from == "USD" else eur_buy
        sell = usd_sell if cur_to == "USD" else eur_sell
        srd_amt = amount * buy
        result = srd_amt / sell if sell else 0
        rate = buy / sell if sell else 0
    return {"result": round(result, 4), "rate": round(rate, 6), "rates": rates, "as_of": rates.get("as_of")}


@router.post("/admin/exchange-rates/convert")
async def convert_currency(payload: dict, company: dict = Depends(get_current_company)):
    """Convert between SRD/USD/EUR using CME.sr cash rates."""
    amount = float(payload.get("amount", 0) or 0)
    cur_from = (payload.get("from") or "SRD").upper()
    cur_to = (payload.get("to") or "SRD").upper()
    if cur_from not in CURRENCIES or cur_to not in CURRENCIES:
        raise HTTPException(status_code=400, detail="Ongeldige valuta")
    if amount < 0:
        raise HTTPException(status_code=400, detail="Bedrag mag niet negatief zijn")
    conv = await _compute_conversion(cur_from, cur_to, amount)
    rates = conv["rates"]
    return {
        "amount": amount, "from": cur_from, "to": cur_to,
        "result": conv["result"], "rate": conv["rate"],
        "source": CME_URL, "as_of": rates.get("as_of"), "cached": rates.get("cached", False)
    }


@router.post("/admin/kas/exchange")
async def exchange_between_kas(payload: dict, company: dict = Depends(get_current_company)):
    """Wissel bedrag tussen kassen/valuta met CME dagkoers.
    Body: {
      from_account_id, from_currency, from_amount,
      to_account_id, to_currency,
      custom_rate? (optional), description? (optional)
    }
    Maakt 2 gekoppelde boekingen: uitgave in bron + inkomst in doel, met shared exchange_id.
    """
    company_id = company["company_id"]
    from_account_id = payload.get("from_account_id")
    from_currency = (payload.get("from_currency") or "").upper()
    from_amount = float(payload.get("from_amount", 0) or 0)
    to_account_id = payload.get("to_account_id")
    to_currency = (payload.get("to_currency") or "").upper()
    custom_rate = payload.get("custom_rate")
    description = (payload.get("description") or "").strip()

    if not from_account_id or not to_account_id:
        raise HTTPException(status_code=400, detail="Bron en doel kas verplicht")
    if from_currency not in CURRENCIES or to_currency not in CURRENCIES:
        raise HTTPException(status_code=400, detail="Ongeldige valuta")
    if from_amount <= 0:
        raise HTTPException(status_code=400, detail="Bedrag moet positief zijn")

    from_acc = await db.kiosk_kas_accounts.find_one({"account_id": from_account_id, "company_id": company_id})
    to_acc = await db.kiosk_kas_accounts.find_one({"account_id": to_account_id, "company_id": company_id})
    if not from_acc:
        raise HTTPException(status_code=404, detail="Bron kas niet gevonden")
    if not to_acc:
        raise HTTPException(status_code=404, detail="Doel kas niet gevonden")

    from_allowed = from_acc.get("currencies") or [from_acc.get("currency", "SRD")]
    to_allowed = to_acc.get("currencies") or [to_acc.get("currency", "SRD")]
    if from_currency not in from_allowed:
        raise HTTPException(status_code=400, detail=f"{from_currency} is niet toegestaan in bron kas '{from_acc['name']}'")
    if to_currency not in to_allowed:
        raise HTTPException(status_code=400, detail=f"{to_currency} is niet toegestaan in doel kas '{to_acc['name']}'")

    if from_account_id == to_account_id and from_currency == to_currency:
        raise HTTPException(status_code=400, detail="Bron en doel zijn identiek")

    # Compute conversion
    if custom_rate and float(custom_rate) > 0:
        # Apply user-provided rate: result = amount * rate (for SRD-based: rate is from_currency-per-to_currency)
        # To keep semantics consistent: custom_rate = to_amount / from_amount (i.e. 1 unit from_currency = X unit to_currency)
        rate = float(custom_rate)
        to_amount = round(from_amount * rate, 4)
        rates_info = {"as_of": "Handmatig", "source": "custom"}
    else:
        conv = await _compute_conversion(from_currency, to_currency, from_amount)
        to_amount = conv["result"]
        rate = conv["rate"]
        rates_info = {"as_of": conv.get("as_of"), "source": CME_URL}

    now = datetime.now(timezone.utc)
    exchange_id = generate_uuid()
    desc_default = f"Wissel {from_currency} → {to_currency}"
    final_desc = description or desc_default

    # Create outflow entry (from account) — as expense
    out_id = generate_uuid()
    out_entry = {
        "entry_id": out_id,
        "company_id": company_id,
        "account_id": from_account_id,
        "entry_type": "expense",
        "amount": from_amount,
        "currency": from_currency,
        "description": f"{final_desc} → {to_acc['name']} ({to_currency} {to_amount:,.2f})",
        "category": "wissel",
        "related_tenant_id": "", "related_tenant_name": "",
        "related_employee_id": "", "related_employee_name": "",
        "payment_id": "",
        "exchange_id": exchange_id,
        "exchange_direction": "out",
        "exchange_rate": rate,
        "exchange_counterparty_account_id": to_account_id,
        "exchange_counterparty_currency": to_currency,
        "exchange_counterparty_amount": to_amount,
        "created_at": now,
    }
    # Create inflow entry (to account) — as income
    in_id = generate_uuid()
    in_entry = {
        "entry_id": in_id,
        "company_id": company_id,
        "account_id": to_account_id,
        "entry_type": "income",
        "amount": to_amount,
        "currency": to_currency,
        "description": f"{final_desc} ← {from_acc['name']} ({from_currency} {from_amount:,.2f})",
        "category": "wissel",
        "related_tenant_id": "", "related_tenant_name": "",
        "related_employee_id": "", "related_employee_name": "",
        "payment_id": "",
        "exchange_id": exchange_id,
        "exchange_direction": "in",
        "exchange_rate": rate,
        "exchange_counterparty_account_id": from_account_id,
        "exchange_counterparty_currency": from_currency,
        "exchange_counterparty_amount": from_amount,
        "created_at": now,
    }
    await db.kiosk_kas.insert_many([out_entry, in_entry])

    # Push notification
    try:
        from .push import send_push_to_company
        import asyncio as _asyncio
        _asyncio.create_task(send_push_to_company(
            company_id,
            title="Valuta gewisseld",
            body=f"{from_currency} {from_amount:,.2f} → {to_currency} {to_amount:,.2f} • {from_acc['name']} → {to_acc['name']}",
            url="/vastgoed",
            tag=f"exchange-{exchange_id}",
        ))
    except Exception:
        pass

    return {
        "exchange_id": exchange_id,
        "from": {"account_id": from_account_id, "account_name": from_acc["name"], "currency": from_currency, "amount": from_amount, "entry_id": out_id},
        "to": {"account_id": to_account_id, "account_name": to_acc["name"], "currency": to_currency, "amount": to_amount, "entry_id": in_id},
        "rate": rate,
        "as_of": rates_info.get("as_of"),
        "source": rates_info.get("source"),
        "message": "Wisseltransactie geslaagd",
    }
