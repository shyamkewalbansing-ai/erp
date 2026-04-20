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
from .superadmin import get_superadmin

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

    # Get bank details
    bd = await db.kiosk_saas_config.find_one({"key": "bank_details"}, {"_id": 0, "value": 1})

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
    }


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
