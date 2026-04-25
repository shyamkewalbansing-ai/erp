"""Suribet — daily MAC machine balance counting feature.

Records daily denomination counts per MAC machine for a company.
Feature must be activated by superadmin via /superadmin/companies/{id}/features/suribet.
"""
from .base import *
from typing import List, Optional
from pydantic import BaseModel, Field

# Use the shared kiosk router (defined in base.py)
# All routes prefixed with /admin/suribet

# Bill denominations supported (SRD)
SRD_DENOMS = [500, 200, 100, 50, 20, 10, 5]


def _ensure_feature(company: dict):
    if not (company.get("features") or {}).get("suribet"):
        raise HTTPException(status_code=403, detail="Suribet functie is niet geactiveerd voor uw bedrijf. Vraag de superadmin om te activeren.")


# ============ Pydantic Models ============

class MachineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)


class MachineUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)


class BalanceCreate(BaseModel):
    machine_id: str
    balance_date: str  # 'YYYY-MM-DD'
    counts: dict = Field(default_factory=dict)  # {"500": int, "200": int, ...}
    eur_amount: float = 0
    usd_amount: float = 0
    balance_from_bon: float = 0  # Balance from the daily Suribet receipt (SRD)
    commissie_amount: float = 0  # Manual commissie entry (SRD)
    notes: str = ""


class BalanceUpdate(BaseModel):
    balance_date: Optional[str] = None
    counts: Optional[dict] = None
    eur_amount: Optional[float] = None
    usd_amount: Optional[float] = None
    balance_from_bon: Optional[float] = None
    commissie_amount: Optional[float] = None
    notes: Optional[str] = None


# ============ Machines CRUD ============

@router.get("/admin/suribet/machines")
async def list_suribet_machines(company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    items = await db.kiosk_suribet_machines.find(
        {"company_id": company["company_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return items


@router.post("/admin/suribet/machines")
async def create_suribet_machine(data: MachineCreate, company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Naam is verplicht")
    # Prevent duplicate name within company
    exists = await db.kiosk_suribet_machines.find_one({"company_id": company["company_id"], "name": name})
    if exists:
        raise HTTPException(status_code=400, detail=f"Machine '{name}' bestaat al")
    doc = {
        "machine_id": generate_uuid(),
        "company_id": company["company_id"],
        "name": name,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_suribet_machines.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.put("/admin/suribet/machines/{machine_id}")
async def update_suribet_machine(machine_id: str, data: MachineUpdate, company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Naam is verplicht")
    res = await db.kiosk_suribet_machines.update_one(
        {"machine_id": machine_id, "company_id": company["company_id"]},
        {"$set": {"name": name, "updated_at": datetime.now(timezone.utc)}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    # Update name on related balances for display consistency
    await db.kiosk_suribet_balances.update_many(
        {"machine_id": machine_id, "company_id": company["company_id"]},
        {"$set": {"machine_name": name}},
    )
    return {"machine_id": machine_id, "name": name}


@router.delete("/admin/suribet/machines/{machine_id}")
async def delete_suribet_machine(machine_id: str, company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    # Also delete its balances
    await db.kiosk_suribet_balances.delete_many({"machine_id": machine_id, "company_id": company["company_id"]})
    res = await db.kiosk_suribet_machines.delete_one({"machine_id": machine_id, "company_id": company["company_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    return {"message": "Machine verwijderd"}


# ============ Balances CRUD ============

def _normalize_counts(counts_in: dict) -> dict:
    """Normalize counts to dict with keys '500','200',… and integer values."""
    out = {}
    for d in SRD_DENOMS:
        key = str(d)
        try:
            out[key] = max(0, int(counts_in.get(key, 0) or 0))
        except (TypeError, ValueError):
            out[key] = 0
    return out


def _calc_srd_total(counts: dict) -> float:
    return float(sum(int(d) * counts.get(str(d), 0) for d in SRD_DENOMS))


@router.get("/admin/suribet/balances")
async def list_suribet_balances(
    company: dict = Depends(get_current_company),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    machine_id: Optional[str] = None,
):
    _ensure_feature(company)
    q: dict = {"company_id": company["company_id"]}
    if from_date or to_date:
        date_q = {}
        if from_date:
            date_q["$gte"] = from_date
        if to_date:
            date_q["$lte"] = to_date
        q["balance_date"] = date_q
    if machine_id:
        q["machine_id"] = machine_id
    items = await db.kiosk_suribet_balances.find(q, {"_id": 0}).sort([("balance_date", 1), ("machine_name", 1)]).to_list(2000)
    # Add computed total per row
    for it in items:
        srd = _calc_srd_total(it.get("counts", {}))
        it["srd_total"] = srd
        bal = float(it.get("balance_from_bon", 0) or 0)
        it["balance_from_bon"] = bal
        it["commissie_amount"] = float(it.get("commissie_amount", 0) or 0)
        it["verschil"] = bal - srd
    return items


@router.post("/admin/suribet/balances")
async def create_suribet_balance(data: BalanceCreate, company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    machine = await db.kiosk_suribet_machines.find_one({"machine_id": data.machine_id, "company_id": company["company_id"]})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    # Validate date
    try:
        datetime.strptime(data.balance_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Datum-formaat moet YYYY-MM-DD zijn")
    counts = _normalize_counts(data.counts or {})
    doc = {
        "balance_id": generate_uuid(),
        "company_id": company["company_id"],
        "machine_id": data.machine_id,
        "machine_name": machine["name"],
        "balance_date": data.balance_date,
        "counts": counts,
        "eur_amount": float(data.eur_amount or 0),
        "usd_amount": float(data.usd_amount or 0),
        "balance_from_bon": float(data.balance_from_bon or 0),
        "commissie_amount": float(data.commissie_amount or 0),
        "notes": (data.notes or "").strip(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.kiosk_suribet_balances.insert_one(dict(doc))
    doc.pop("_id", None)
    srd = _calc_srd_total(counts)
    doc["srd_total"] = srd
    doc["verschil"] = float(data.balance_from_bon or 0) - srd
    return doc


@router.put("/admin/suribet/balances/{balance_id}")
async def update_suribet_balance(balance_id: str, data: BalanceUpdate, company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    update: dict = {"updated_at": datetime.now(timezone.utc)}
    if data.balance_date is not None:
        try:
            datetime.strptime(data.balance_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Datum-formaat moet YYYY-MM-DD zijn")
        update["balance_date"] = data.balance_date
    if data.counts is not None:
        update["counts"] = _normalize_counts(data.counts)
    if data.eur_amount is not None:
        update["eur_amount"] = float(data.eur_amount or 0)
    if data.usd_amount is not None:
        update["usd_amount"] = float(data.usd_amount or 0)
    if data.balance_from_bon is not None:
        update["balance_from_bon"] = float(data.balance_from_bon or 0)
    if data.commissie_amount is not None:
        update["commissie_amount"] = float(data.commissie_amount or 0)
    if data.notes is not None:
        update["notes"] = (data.notes or "").strip()
    res = await db.kiosk_suribet_balances.update_one(
        {"balance_id": balance_id, "company_id": company["company_id"]},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Saldo niet gevonden")
    return {"balance_id": balance_id, **{k: v for k, v in update.items() if k != "updated_at"}}


@router.delete("/admin/suribet/balances/{balance_id}")
async def delete_suribet_balance(balance_id: str, company: dict = Depends(get_current_company)):
    _ensure_feature(company)
    res = await db.kiosk_suribet_balances.delete_one({"balance_id": balance_id, "company_id": company["company_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saldo niet gevonden")
    return {"message": "Saldo verwijderd"}


# ============ Totals (per machine column-totals + grand total) ============

@router.get("/admin/suribet/totals")
async def get_suribet_totals(
    company: dict = Depends(get_current_company),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
):
    _ensure_feature(company)
    q: dict = {"company_id": company["company_id"]}
    if from_date or to_date:
        date_q = {}
        if from_date:
            date_q["$gte"] = from_date
        if to_date:
            date_q["$lte"] = to_date
        q["balance_date"] = date_q
    items = await db.kiosk_suribet_balances.find(q, {"_id": 0}).to_list(5000)

    # Per machine, sum counts per denom + EUR + USD + SRD total + balance_from_bon + verschil
    per_machine: dict = {}
    for it in items:
        mid = it.get("machine_id")
        if mid not in per_machine:
            per_machine[mid] = {
                "machine_id": mid,
                "machine_name": it.get("machine_name", ""),
                "counts": {str(d): 0 for d in SRD_DENOMS},
                "eur_amount": 0.0,
                "usd_amount": 0.0,
                "srd_total": 0.0,
                "balance_from_bon": 0.0,
                "commissie_amount": 0.0,
                "verschil": 0.0,
                "rows_count": 0,
            }
        for d in SRD_DENOMS:
            per_machine[mid]["counts"][str(d)] += int(it.get("counts", {}).get(str(d), 0) or 0)
        per_machine[mid]["eur_amount"] += float(it.get("eur_amount", 0) or 0)
        per_machine[mid]["usd_amount"] += float(it.get("usd_amount", 0) or 0)
        per_machine[mid]["srd_total"] += _calc_srd_total(it.get("counts", {}))
        per_machine[mid]["balance_from_bon"] += float(it.get("balance_from_bon", 0) or 0)
        per_machine[mid]["commissie_amount"] += float(it.get("commissie_amount", 0) or 0)
        per_machine[mid]["rows_count"] += 1

    # Compute verschil per machine = balance_from_bon - srd_total (negatief = winst)
    for pm in per_machine.values():
        pm["verschil"] = pm["balance_from_bon"] - pm["srd_total"]

    return {"per_machine": list(per_machine.values()), "denominations": SRD_DENOMS}
