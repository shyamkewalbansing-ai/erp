"""
SaaS Subscription Management for Kiosk ERP
- Companies pay DEFAULT_MONTHLY_PRICE per month
- New companies get 14-day trial
- Superadmin can mark invoices paid, grant lifetime, override price
- Monthly invoice auto-generated via scheduler (kiosk/scheduler.py)
"""
from .base import (
    router, APIRouter, HTTPException, Depends, BaseModel, Optional,
    datetime, timezone, timedelta,
    db, generate_uuid, get_current_company,
)
from fastapi import Request as _Request
from .superadmin import get_superadmin

import asyncio
import logging

logger = logging.getLogger("kiosk.subscription")

DEFAULT_MONTHLY_PRICE = 3000.00
TRIAL_DAYS = 14


# ============== MODELS ==============
class InvoiceCreate(BaseModel):
    company_id: str
    period: Optional[str] = None  # YYYY-MM, defaults to current month
    amount: Optional[float] = None  # defaults to company monthly_price
    notes: Optional[str] = None


class InvoiceMarkPaid(BaseModel):
    paid_at: Optional[str] = None  # ISO date, defaults to now
    notes: Optional[str] = None


class PriceUpdate(BaseModel):
    monthly_price: float


class LifetimeToggle(BaseModel):
    lifetime: bool


class ProofUpload(BaseModel):
    payment_proof_url: str
    notes: Optional[str] = None


class PaymentMethodInitiate(BaseModel):
    method: str  # "mope" | "uni5pay" | "bank_transfer"
    notes: Optional[str] = None


class PaymentMethodsConfig(BaseModel):
    bank_transfer_enabled: bool = True
    mope_enabled: bool = False
    mope_api_key: Optional[str] = None
    mope_merchant_id: Optional[str] = None
    mope_merchant_name: Optional[str] = None
    mope_phone: Optional[str] = None
    uni5pay_enabled: bool = False
    uni5pay_merchant_id: Optional[str] = None
    uni5pay_merchant_name: Optional[str] = None


# ============== SUPERADMIN INVOICE ENDPOINTS ==============
@router.get("/superadmin/invoices")
async def sa_list_invoices(admin=Depends(get_superadmin), status: Optional[str] = None, company_id: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    if company_id:
        q["company_id"] = company_id
    invoices = await db.kiosk_subscription_invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Mark overdue on the fly
    now = datetime.now(timezone.utc)
    for inv in invoices:
        if inv.get("status") == "unpaid" and inv.get("due_date"):
            due = inv["due_date"]
            if isinstance(due, str):
                try:
                    due = datetime.fromisoformat(due.replace("Z", "+00:00"))
                except Exception:
                    due = None
            if isinstance(due, datetime) and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if isinstance(due, datetime) and due < now:
                inv["is_overdue"] = True
                inv["days_overdue"] = (now - due).days
    return invoices


@router.post("/superadmin/invoices")
async def sa_create_invoice(data: InvoiceCreate, admin=Depends(get_superadmin)):
    comp = await db.kiosk_companies.find_one({"company_id": data.company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    now = datetime.now(timezone.utc)
    period = data.period or now.strftime("%Y-%m")
    amount = data.amount if data.amount is not None else comp.get("monthly_price", DEFAULT_MONTHLY_PRICE)
    invoice_id = generate_uuid()
    due_date = now + timedelta(days=TRIAL_DAYS)
    doc = {
        "invoice_id": invoice_id,
        "company_id": data.company_id,
        "company_name": comp.get("name", ""),
        "period": period,
        "amount": amount,
        "status": "unpaid",
        "due_date": due_date,
        "paid_at": None,
        "payment_proof_url": None,
        "marked_paid_by": None,
        "notes": data.notes or "",
        "created_at": now,
    }
    await db.kiosk_subscription_invoices.insert_one(doc)
    return {"invoice_id": invoice_id, "created": True}


@router.post("/superadmin/invoices/{invoice_id}/mark-paid")
async def sa_mark_paid(invoice_id: str, data: InvoiceMarkPaid = None, admin=Depends(get_superadmin)):
    inv = await db.kiosk_subscription_invoices.find_one({"invoice_id": invoice_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    now = datetime.now(timezone.utc)
    paid_at = now
    if data and data.paid_at:
        try:
            paid_at = datetime.fromisoformat(data.paid_at.replace("Z", "+00:00"))
        except Exception:
            pass
    upd = {
        "status": "paid",
        "paid_at": paid_at,
        "marked_paid_by": "superadmin",
    }
    if data and data.notes:
        upd["notes"] = (inv.get("notes", "") + " | " + data.notes).strip(" |")
    await db.kiosk_subscription_invoices.update_one({"invoice_id": invoice_id}, {"$set": upd})
    # Recompute company subscription status
    await _recompute_company_status(inv["company_id"])
    return {"marked_paid": True}


@router.post("/superadmin/invoices/{invoice_id}/mark-unpaid")
async def sa_mark_unpaid(invoice_id: str, admin=Depends(get_superadmin)):
    inv = await db.kiosk_subscription_invoices.find_one({"invoice_id": invoice_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    await db.kiosk_subscription_invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "unpaid", "paid_at": None, "marked_paid_by": None}}
    )
    await _recompute_company_status(inv["company_id"])
    return {"marked_unpaid": True}


@router.delete("/superadmin/invoices/{invoice_id}")
async def sa_delete_invoice(invoice_id: str, admin=Depends(get_superadmin)):
    r = await db.kiosk_subscription_invoices.delete_one({"invoice_id": invoice_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"deleted": True}


@router.post("/superadmin/companies/{company_id}/lifetime")
async def sa_toggle_lifetime(company_id: str, data: LifetimeToggle, admin=Depends(get_superadmin)):
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    upd = {"lifetime": data.lifetime, "updated_at": datetime.now(timezone.utc)}
    if data.lifetime:
        upd["subscription_status"] = "lifetime"
    else:
        # Recompute
        pass
    await db.kiosk_companies.update_one({"company_id": company_id}, {"$set": upd})
    if not data.lifetime:
        await _recompute_company_status(company_id)
    return {"lifetime": data.lifetime}


@router.put("/superadmin/companies/{company_id}/price")
async def sa_update_price(company_id: str, data: PriceUpdate, admin=Depends(get_superadmin)):
    if data.monthly_price < 0:
        raise HTTPException(status_code=400, detail="Prijs kan niet negatief zijn")
    r = await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {"monthly_price": data.monthly_price, "updated_at": datetime.now(timezone.utc)}}
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return {"monthly_price": data.monthly_price}


@router.post("/superadmin/subscription/bank-details")
async def sa_update_bank_details(data: dict, admin=Depends(get_superadmin)):
    """Store bank details shown to companies for subscription payments."""
    await db.kiosk_saas_config.update_one(
        {"key": "bank_details"},
        {"$set": {"key": "bank_details", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"saved": True}


@router.get("/superadmin/subscription/payment-methods")
async def sa_get_payment_methods(admin=Depends(get_superadmin)):
    """Return full payment-methods config including api keys. Superadmin only."""
    doc = await db.kiosk_saas_config.find_one({"key": "payment_methods"}, {"_id": 0, "value": 1})
    return (doc or {}).get("value", {})


@router.post("/superadmin/subscription/payment-methods")
async def sa_update_payment_methods(data: PaymentMethodsConfig, admin=Depends(get_superadmin)):
    """Configure which payment methods companies can use: bank / mope / uni5pay."""
    await db.kiosk_saas_config.update_one(
        {"key": "payment_methods"},
        {"$set": {"key": "payment_methods", "value": data.dict(), "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"saved": True}


@router.get("/public/subscription/payment-methods")
async def get_payment_methods_public():
    """Public: which payment methods are enabled + their public merchant info. Strips api keys."""
    doc = await db.kiosk_saas_config.find_one({"key": "payment_methods"}, {"_id": 0, "value": 1})
    val = (doc or {}).get("value", {
        "bank_transfer_enabled": True,
        "mope_enabled": False,
        "uni5pay_enabled": False,
    })
    # Never expose the raw api key publicly
    val.pop("mope_api_key", None)
    return val


@router.get("/public/subscription/bank-details")
async def get_bank_details_public():
    """Public endpoint: new registrants need to see where to pay."""
    doc = await db.kiosk_saas_config.find_one({"key": "bank_details"}, {"_id": 0, "value": 1})
    return (doc or {}).get("value", {
        "bank_name": "",
        "account_holder": "",
        "account_number": "",
        "swift": "",
        "reference_hint": "",
    })


# ============== COMPANY-FACING ENDPOINTS ==============
@router.get("/admin/subscription")
async def company_subscription(company: dict = Depends(get_current_company)):
    """Show current company's subscription status + invoices."""
    company_id = company["company_id"]
    now = datetime.now(timezone.utc)

    invoices = await db.kiosk_subscription_invoices.find(
        {"company_id": company_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for inv in invoices:
        if inv.get("status") == "unpaid" and inv.get("due_date"):
            due = inv["due_date"]
            if isinstance(due, datetime) and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if isinstance(due, datetime) and due < now:
                inv["is_overdue"] = True
                inv["days_overdue"] = (now - due).days

    trial_ends = company.get("trial_ends_at")
    days_left_trial = None
    if trial_ends and not company.get("lifetime"):
        if isinstance(trial_ends, datetime):
            te = trial_ends if trial_ends.tzinfo else trial_ends.replace(tzinfo=timezone.utc)
            delta = (te - now).total_seconds() / 86400.0
            days_left_trial = max(0, int(delta))

    # Get bank details + payment methods
    bd = await db.kiosk_saas_config.find_one({"key": "bank_details"}, {"_id": 0, "value": 1})
    pm = await db.kiosk_saas_config.find_one({"key": "payment_methods"}, {"_id": 0, "value": 1})
    pm_val = (pm or {}).get("value", {"bank_transfer_enabled": True, "mope_enabled": False, "uni5pay_enabled": False})
    pm_val = dict(pm_val)
    pm_val.pop("mope_api_key", None)  # never expose raw api key to company frontend

    return {
        "company_id": company_id,
        "name": company.get("name", ""),
        "subscription_status": company.get("subscription_status", "trial"),
        "monthly_price": company.get("monthly_price", DEFAULT_MONTHLY_PRICE),
        "lifetime": bool(company.get("lifetime")),
        "trial_ends_at": trial_ends.isoformat() if isinstance(trial_ends, datetime) else trial_ends,
        "days_left_trial": days_left_trial,
        "invoices": invoices,
        "bank_details": (bd or {}).get("value", {}),
        "payment_methods": pm_val,
    }


@router.post("/admin/subscription/invoices/{invoice_id}/initiate-payment")
async def initiate_subscription_payment(invoice_id: str, data: PaymentMethodInitiate, company: dict = Depends(get_current_company)):
    """Company initiates payment via Mope/Uni5Pay/bank_transfer. Marks as pending_review."""
    inv = await db.kiosk_subscription_invoices.find_one({
        "invoice_id": invoice_id, "company_id": company["company_id"]
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    if inv.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Deze factuur is al betaald")

    method = data.method
    method_label = {
        "mope": "Mope", "uni5pay": "Uni5Pay", "bank_transfer": "Bankoverschrijving"
    }.get(method, method)
    now = datetime.now(timezone.utc)
    upd = {
        "status": "pending_review",
        "payment_method": method,
        "payment_initiated_at": now,
        "notes": (inv.get("notes", "") + f" | Betaling gestart via {method_label}"
                  + (f" - {data.notes}" if data.notes else "")).strip(" |"),
    }
    await db.kiosk_subscription_invoices.update_one({"invoice_id": invoice_id}, {"$set": upd})
    return {"initiated": True, "method": method, "message": f"Betaling via {method_label} gestart. Superadmin zal uw betaling verifiëren."}


@router.post("/admin/subscription/invoices/{invoice_id}/upload-proof")
async def upload_payment_proof(invoice_id: str, data: ProofUpload, company: dict = Depends(get_current_company)):
    inv = await db.kiosk_subscription_invoices.find_one({
        "invoice_id": invoice_id, "company_id": company["company_id"]
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    await db.kiosk_subscription_invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {
            "payment_proof_url": data.payment_proof_url,
            "proof_uploaded_at": datetime.now(timezone.utc),
            "status": "pending_review",
            "notes": (inv.get("notes", "") + (" | " + data.notes if data.notes else "")).strip(" |"),
        }}
    )
    return {"uploaded": True}


# ============== MOPE SaaS CHECKOUT ==============
import os as _os
import uuid as _uuid
import httpx as _httpx


async def _get_saas_payment_config():
    doc = await db.kiosk_saas_config.find_one({"key": "payment_methods"}, {"_id": 0, "value": 1})
    return (doc or {}).get("value", {}) or {}


@router.post("/admin/subscription/invoices/{invoice_id}/mope-checkout")
async def mope_checkout_saas(invoice_id: str, company: dict = Depends(get_current_company)):
    """Create a Mope payment request for a SaaS subscription invoice."""
    inv = await db.kiosk_subscription_invoices.find_one({
        "invoice_id": invoice_id, "company_id": company["company_id"]
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    if inv.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Factuur is al betaald")

    cfg = await _get_saas_payment_config()
    if not cfg.get("mope_enabled"):
        raise HTTPException(status_code=400, detail="Mope is niet ingeschakeld")
    api_key = cfg.get("mope_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Mope API key ontbreekt. Neem contact op met superadmin.")

    order_id = f"SAAS-{invoice_id[:8]}"
    amount_cents = int(round(inv["amount"] * 100))
    app_url = _os.environ.get("APP_URL", "https://facturatie.sr")
    redirect_url = f"{app_url}/vastgoed/{company['company_id']}?saas_mope_done=1&invoice={invoice_id}"
    webhook_url = f"{app_url}/api/kiosk/public/subscription/mope-webhook"

    # Mock mode: api key starts with mock_
    if api_key.startswith("mock_"):
        mock_id = str(_uuid.uuid4())
        mock_url = f"https://mope.sr/p/{mock_id}"
        await db.mope_mock_payments.insert_one({
            "payment_id": mock_id,
            "company_id": company["company_id"],
            "invoice_id": invoice_id,
            "amount": inv["amount"],
            "amount_cents": amount_cents,
            "status": "open",
            "created_at": datetime.now(timezone.utc),
            "order_id": order_id,
            "saas": True,
        })
        await db.kiosk_subscription_invoices.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"payment_method": "mope", "payment_gateway_id": mock_id, "payment_initiated_at": datetime.now(timezone.utc)}}
        )
        return {"payment_id": mock_id, "payment_url": mock_url, "order_id": order_id, "amount": inv["amount"], "mock": True}

    # Real Mope API
    try:
        async with _httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.mope.sr/api/shop/payment_request",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "description": f"Abonnement {inv.get('period','')} - {company.get('name','')}",
                    "amount": amount_cents,
                    "order_id": order_id,
                    "currency": "SRD",
                    "redirect_url": redirect_url,
                    "webhook_url": webhook_url,
                },
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=400, detail=f"Mope fout: {resp.text[:200]}")
            md = resp.json()
            await db.kiosk_subscription_invoices.update_one(
                {"invoice_id": invoice_id},
                {"$set": {
                    "payment_method": "mope",
                    "payment_gateway_id": md.get("id"),
                    "payment_gateway_url": md.get("url"),
                    "payment_initiated_at": datetime.now(timezone.utc),
                }}
            )
            return {"payment_id": md.get("id"), "payment_url": md.get("url"), "order_id": order_id, "amount": inv["amount"]}
    except _httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Verbinding met Mope mislukt: {str(e)}")


@router.get("/admin/subscription/invoices/{invoice_id}/mope-status/{payment_id}")
async def mope_status_saas(invoice_id: str, payment_id: str, company: dict = Depends(get_current_company)):
    """Poll Mope payment status; if paid, mark the invoice as paid."""
    inv = await db.kiosk_subscription_invoices.find_one({
        "invoice_id": invoice_id, "company_id": company["company_id"]
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    cfg = await _get_saas_payment_config()
    api_key = cfg.get("mope_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Mope niet geconfigureerd")

    status_val = "open"
    if api_key.startswith("mock_"):
        mock = await db.mope_mock_payments.find_one({"payment_id": payment_id}, {"_id": 0})
        if not mock:
            raise HTTPException(status_code=404, detail="Betaalverzoek niet gevonden")
        status_val = mock.get("status", "open")
    else:
        try:
            async with _httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    f"https://api.mope.sr/api/shop/payment_request/{payment_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if r.status_code != 200:
                    raise HTTPException(status_code=400, detail="Kon status niet ophalen")
                status_val = r.json().get("status", "open")
        except _httpx.RequestError:
            raise HTTPException(status_code=500, detail="Verbinding met Mope mislukt")

    # Auto-mark paid on success
    if status_val in ("paid", "completed", "success") and inv.get("status") != "paid":
        await db.kiosk_subscription_invoices.update_one(
            {"invoice_id": invoice_id},
            {"$set": {
                "status": "paid",
                "paid_at": datetime.now(timezone.utc),
                "marked_paid_by": "mope-auto",
                "payment_method": "mope",
            }}
        )
        await _recompute_company_status(company["company_id"])

    return {"status": status_val, "invoice_status": "paid" if status_val in ("paid", "completed", "success") else inv.get("status", "unpaid")}


# ============== UNI5PAY SaaS CHECKOUT (mock-based, same as kiosk pattern) ==============
@router.post("/admin/subscription/invoices/{invoice_id}/uni5pay-checkout")
async def uni5pay_checkout_saas(invoice_id: str, company: dict = Depends(get_current_company)):
    inv = await db.kiosk_subscription_invoices.find_one({
        "invoice_id": invoice_id, "company_id": company["company_id"]
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    if inv.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Factuur is al betaald")
    cfg = await _get_saas_payment_config()
    if not cfg.get("uni5pay_enabled"):
        raise HTTPException(status_code=400, detail="Uni5Pay is niet ingeschakeld")
    merchant_id = cfg.get("uni5pay_merchant_id", "")
    if not merchant_id:
        raise HTTPException(status_code=400, detail="Uni5Pay Merchant ID ontbreekt")

    order_id = f"SAAS-U5P-{invoice_id[:8]}"
    payment_id = str(_uuid.uuid4())
    amount_cents = int(round(inv["amount"] * 100))
    mock_qr_url = f"https://uni5pay.sr/pay/{payment_id}"
    await db.uni5pay_mock_payments.insert_one({
        "payment_id": payment_id,
        "company_id": company["company_id"],
        "invoice_id": invoice_id,
        "amount": inv["amount"],
        "amount_cents": amount_cents,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "order_id": order_id,
        "saas": True,
    })
    await db.kiosk_subscription_invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"payment_method": "uni5pay", "payment_gateway_id": payment_id, "payment_initiated_at": datetime.now(timezone.utc)}}
    )
    return {"payment_id": payment_id, "payment_url": mock_qr_url, "order_id": order_id, "amount": inv["amount"], "mock": True}


@router.get("/admin/subscription/invoices/{invoice_id}/uni5pay-status/{payment_id}")
async def uni5pay_status_saas(invoice_id: str, payment_id: str, company: dict = Depends(get_current_company)):
    inv = await db.kiosk_subscription_invoices.find_one({
        "invoice_id": invoice_id, "company_id": company["company_id"]
    })
    if not inv:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    mock = await db.uni5pay_mock_payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not mock:
        raise HTTPException(status_code=404, detail="Betaalverzoek niet gevonden")
    status_val = mock.get("status", "open")
    if status_val in ("paid", "completed", "success") and inv.get("status") != "paid":
        await db.kiosk_subscription_invoices.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc), "marked_paid_by": "uni5pay-auto", "payment_method": "uni5pay"}}
        )
        await _recompute_company_status(company["company_id"])
    return {"status": status_val, "invoice_status": "paid" if status_val in ("paid", "completed", "success") else inv.get("status", "unpaid")}


# ============== MOPE WEBHOOK (public, server-to-server) ==============
@router.post("/public/subscription/mope-webhook")
async def mope_webhook(request: _Request):
    """Mope server-to-server webhook. Mope calls this URL after payment state change.
    We look up the invoice by payment_id (stored as payment_gateway_id) OR by the order_id
    pattern SAAS-{invoice_id[:8]}. If status = paid/completed/success, auto-mark the invoice.
    Always returns 200 so Mope does not retry forever.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    # Mope payload typically contains: id, status, order_id, amount, ...
    payment_id = body.get("id") or body.get("payment_id") or body.get("payment_request_id")
    status_val = (body.get("status") or "").lower()
    order_id = body.get("order_id") or ""

    logger.info(f"[mope-webhook] payment_id={payment_id} status={status_val} order_id={order_id}")

    # Find invoice: prefer gateway_id match, fallback to order_id prefix match
    inv = None
    if payment_id:
        inv = await db.kiosk_subscription_invoices.find_one({"payment_gateway_id": payment_id})
    if not inv and order_id and order_id.startswith("SAAS-"):
        prefix = order_id[len("SAAS-"):][:8]
        # Find invoice whose invoice_id starts with this prefix
        inv = await db.kiosk_subscription_invoices.find_one({
            "invoice_id": {"$regex": f"^{prefix}"}
        })

    if not inv:
        logger.warning(f"[mope-webhook] No matching SaaS invoice for id={payment_id} order={order_id}")
        return {"received": True, "matched": False}

    if status_val in ("paid", "completed", "success") and inv.get("status") != "paid":
        await db.kiosk_subscription_invoices.update_one(
            {"invoice_id": inv["invoice_id"]},
            {"$set": {
                "status": "paid",
                "paid_at": datetime.now(timezone.utc),
                "marked_paid_by": "mope-webhook",
                "payment_method": "mope",
                "payment_gateway_id": payment_id or inv.get("payment_gateway_id"),
            }}
        )
        await _recompute_company_status(inv["company_id"])
        logger.info(f"[mope-webhook] Invoice {inv['invoice_id']} auto-marked paid via webhook")
        # Try to fire a staff push
        try:
            from .push import send_push_to_company
            asyncio.create_task(send_push_to_company(
                inv["company_id"],
                title="✅ Abonnement betaald (Mope)",
                body=f"Factuur {inv.get('period','')} · SRD {inv.get('amount',0):,.2f} is via Mope betaald.",
                url="/vastgoed",
                tag=f"saas-paid-{inv['invoice_id']}",
            ))
        except Exception:
            pass

    return {"received": True, "matched": True, "invoice_id": inv["invoice_id"]}


# ============== INTERNAL ==============
async def _recompute_company_status(company_id: str):
    """Recompute the company's subscription_status based on invoices & trial."""
    comp = await db.kiosk_companies.find_one({"company_id": company_id})
    if not comp:
        return
    if comp.get("lifetime"):
        await db.kiosk_companies.update_one(
            {"company_id": company_id}, {"$set": {"subscription_status": "lifetime"}}
        )
        return
    now = datetime.now(timezone.utc)
    # Any unpaid + overdue invoice?
    unpaid = await db.kiosk_subscription_invoices.find(
        {"company_id": company_id, "status": {"$in": ["unpaid", "pending_review"]}}
    ).to_list(100)
    has_overdue = False
    for inv in unpaid:
        due = inv.get("due_date")
        if isinstance(due, datetime) and due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if isinstance(due, datetime) and due < now:
            has_overdue = True
            break
    # Any paid invoice for current period?
    period = now.strftime("%Y-%m")
    any_paid = await db.kiosk_subscription_invoices.find_one({
        "company_id": company_id, "status": "paid", "period": period
    })

    new_status = "trial"
    trial_ends = comp.get("trial_ends_at")
    if isinstance(trial_ends, datetime) and trial_ends.tzinfo is None:
        trial_ends = trial_ends.replace(tzinfo=timezone.utc)
    if has_overdue:
        new_status = "overdue"
    elif any_paid:
        new_status = "active"
    elif isinstance(trial_ends, datetime) and trial_ends > now:
        new_status = "trial"
    else:
        new_status = "overdue"

    await db.kiosk_companies.update_one(
        {"company_id": company_id}, {"$set": {"subscription_status": new_status}}
    )


@router.post("/superadmin/subscription/generate-monthly")
async def sa_generate_monthly_invoices(admin=Depends(get_superadmin)):
    """Manually trigger monthly invoice generation. Also called by scheduler."""
    now = datetime.now(timezone.utc)
    period = now.strftime("%Y-%m")
    companies = await db.kiosk_companies.find(
        {"lifetime": {"$ne": True}}, {"_id": 0}
    ).to_list(1000)
    created = 0
    for comp in companies:
        # Skip if invoice already exists for this period
        existing = await db.kiosk_subscription_invoices.find_one({
            "company_id": comp["company_id"], "period": period
        })
        if existing:
            continue
        amount = comp.get("monthly_price", DEFAULT_MONTHLY_PRICE)
        await db.kiosk_subscription_invoices.insert_one({
            "invoice_id": generate_uuid(),
            "company_id": comp["company_id"],
            "company_name": comp.get("name", ""),
            "period": period,
            "amount": amount,
            "status": "unpaid",
            "due_date": now + timedelta(days=TRIAL_DAYS),
            "paid_at": None,
            "payment_proof_url": None,
            "marked_paid_by": None,
            "notes": "Maandelijkse factuur",
            "created_at": now,
        })
        created += 1
    return {"created": created, "period": period}
