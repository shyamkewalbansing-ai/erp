"""
Kostenplaatsen Module
- Beheer van kostenplaatsen (afdelingen, projecten, etc.)
- Koppeling van kosten aan kostenplaatsen
- Rapportages per kostenplaats
- Budget tracking
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid
from .deps import db, get_current_active_user

router = APIRouter(prefix="/kostenplaatsen", tags=["Kostenplaatsen"])

# ==================== ENUMS ====================

class KostenplaatsType(str, Enum):
    AFDELING = "afdeling"
    PROJECT = "project"
    DIVISIE = "divisie"
    LOCATIE = "locatie"
    OVERIG = "overig"

class KostenplaatsStatus(str, Enum):
    ACTIEF = "actief"
    INACTIEF = "inactief"
    AFGESLOTEN = "afgesloten"

# ==================== MODELS ====================

class KostenplaatsCreate(BaseModel):
    code: str
    naam: str
    type: KostenplaatsType = KostenplaatsType.AFDELING
    omschrijving: Optional[str] = None
    parent_id: Optional[str] = None  # Voor hiërarchische structuur
    budget_jaar: Optional[float] = None
    verantwoordelijke: Optional[str] = None
    startdatum: Optional[str] = None
    einddatum: Optional[str] = None

class KostenplaatsUpdate(BaseModel):
    naam: Optional[str] = None
    type: Optional[KostenplaatsType] = None
    omschrijving: Optional[str] = None
    budget_jaar: Optional[float] = None
    verantwoordelijke: Optional[str] = None
    status: Optional[KostenplaatsStatus] = None
    einddatum: Optional[str] = None

class KostenboekingCreate(BaseModel):
    kostenplaats_id: str
    datum: str
    bedrag: float
    omschrijving: str
    categorie: Optional[str] = None
    referentie_type: Optional[str] = None  # inkoopfactuur, urenboeking, etc.
    referentie_id: Optional[str] = None

# ==================== ENDPOINTS ====================

@router.get("/")
async def get_kostenplaatsen(
    type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle kostenplaatsen op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "afgesloten"}
    
    kostenplaatsen = await db.kostenplaatsen.find(query, {"_id": 0}).sort("code", 1).to_list(500)
    
    # Voeg actuele kosten toe
    for kp in kostenplaatsen:
        totaal = await db.kostenboekingen.aggregate([
            {"$match": {"kostenplaats_id": kp["id"]}},
            {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
        ]).to_list(1)
        kp["actuele_kosten"] = totaal[0]["totaal"] if totaal else 0
        kp["budget_resterend"] = (kp.get("budget_jaar", 0) or 0) - kp["actuele_kosten"]
    
    return kostenplaatsen

@router.get("/stats")
async def get_kostenplaatsen_stats(
    jaar: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal statistieken op voor kostenplaatsen"""
    user_id = current_user["id"]
    
    if not jaar:
        jaar = datetime.now().year
    
    kostenplaatsen = await db.kostenplaatsen.find(
        {"user_id": user_id, "status": "actief"},
        {"_id": 0}
    ).to_list(500)
    
    totaal_budget = sum(kp.get("budget_jaar", 0) or 0 for kp in kostenplaatsen)
    
    # Totale kosten dit jaar
    start_jaar = f"{jaar}-01-01"
    eind_jaar = f"{jaar}-12-31"
    
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "datum": {"$gte": start_jaar, "$lte": eind_jaar}
        }},
        {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
    ]
    
    totaal_kosten = await db.kostenboekingen.aggregate(pipeline).to_list(1)
    totaal_kosten = totaal_kosten[0]["totaal"] if totaal_kosten else 0
    
    # Per type
    per_type = {}
    for kp in kostenplaatsen:
        kp_type = kp.get("type", "overig")
        if kp_type not in per_type:
            per_type[kp_type] = {"aantal": 0, "budget": 0}
        per_type[kp_type]["aantal"] += 1
        per_type[kp_type]["budget"] += kp.get("budget_jaar", 0) or 0
    
    return {
        "jaar": jaar,
        "totaal_kostenplaatsen": len(kostenplaatsen),
        "totaal_budget": round(totaal_budget, 2),
        "totaal_kosten": round(totaal_kosten, 2),
        "budget_resterend": round(totaal_budget - totaal_kosten, 2),
        "budget_benutting_percentage": round((totaal_kosten / totaal_budget * 100) if totaal_budget > 0 else 0, 1),
        "per_type": per_type
    }

@router.get("/{kostenplaats_id}")
async def get_kostenplaats(kostenplaats_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke kostenplaats op"""
    user_id = current_user["id"]
    
    kp = await db.kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id}, {"_id": 0})
    if not kp:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    # Haal kosten per maand op
    pipeline = [
        {"$match": {"kostenplaats_id": kostenplaats_id}},
        {"$group": {
            "_id": {"$substr": ["$datum", 0, 7]},
            "totaal": {"$sum": "$bedrag"},
            "aantal": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]
    
    kosten_per_maand = await db.kostenboekingen.aggregate(pipeline).to_list(12)
    kp["kosten_per_maand"] = [{"maand": k["_id"], "totaal": k["totaal"], "aantal": k["aantal"]} for k in kosten_per_maand]
    
    # Totale kosten
    totaal = await db.kostenboekingen.aggregate([
        {"$match": {"kostenplaats_id": kostenplaats_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
    ]).to_list(1)
    kp["actuele_kosten"] = totaal[0]["totaal"] if totaal else 0
    kp["budget_resterend"] = (kp.get("budget_jaar", 0) or 0) - kp["actuele_kosten"]
    
    return kp

@router.post("/")
async def create_kostenplaats(data: KostenplaatsCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe kostenplaats aan"""
    user_id = current_user["id"]
    
    # Check of code al bestaat
    existing = await db.kostenplaatsen.find_one({"code": data.code, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Kostenplaats code bestaat al")
    
    kostenplaats_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    kp_doc = {
        "id": kostenplaats_id,
        "user_id": user_id,
        "code": data.code,
        "naam": data.naam,
        "type": data.type.value,
        "omschrijving": data.omschrijving,
        "parent_id": data.parent_id,
        "budget_jaar": data.budget_jaar,
        "verantwoordelijke": data.verantwoordelijke,
        "startdatum": data.startdatum or now.split("T")[0],
        "einddatum": data.einddatum,
        "status": KostenplaatsStatus.ACTIEF.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.kostenplaatsen.insert_one(kp_doc)
    kp_doc.pop("_id", None)
    kp_doc["actuele_kosten"] = 0
    kp_doc["budget_resterend"] = data.budget_jaar or 0
    
    return kp_doc

@router.put("/{kostenplaats_id}")
async def update_kostenplaats(
    kostenplaats_id: str,
    data: KostenplaatsUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update een kostenplaats"""
    user_id = current_user["id"]
    
    kp = await db.kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id})
    if not kp:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    update_data = {k: v.value if isinstance(v, Enum) else v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.kostenplaatsen.update_one({"id": kostenplaats_id}, {"$set": update_data})
    
    updated = await db.kostenplaatsen.find_one({"id": kostenplaats_id}, {"_id": 0})
    return updated

@router.delete("/{kostenplaats_id}")
async def delete_kostenplaats(kostenplaats_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een kostenplaats (alleen als er geen boekingen zijn)"""
    user_id = current_user["id"]
    
    kp = await db.kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id})
    if not kp:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    # Check of er boekingen zijn
    boeking_count = await db.kostenboekingen.count_documents({"kostenplaats_id": kostenplaats_id})
    if boeking_count > 0:
        raise HTTPException(status_code=400, detail="Kan niet verwijderen: er zijn boekingen gekoppeld")
    
    await db.kostenplaatsen.delete_one({"id": kostenplaats_id})
    return {"message": "Kostenplaats verwijderd"}

@router.post("/{kostenplaats_id}/boeking")
async def create_kostenboeking(
    kostenplaats_id: str,
    data: KostenboekingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Boek kosten op een kostenplaats"""
    user_id = current_user["id"]
    
    kp = await db.kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id})
    if not kp:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    if kp.get("status") != "actief":
        raise HTTPException(status_code=400, detail="Kostenplaats is niet actief")
    
    boeking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    boeking_doc = {
        "id": boeking_id,
        "user_id": user_id,
        "kostenplaats_id": kostenplaats_id,
        "datum": data.datum,
        "bedrag": data.bedrag,
        "omschrijving": data.omschrijving,
        "categorie": data.categorie,
        "referentie_type": data.referentie_type,
        "referentie_id": data.referentie_id,
        "created_at": now
    }
    
    await db.kostenboekingen.insert_one(boeking_doc)
    boeking_doc.pop("_id", None)
    
    return boeking_doc

@router.get("/{kostenplaats_id}/boekingen")
async def get_kostenboekingen(
    kostenplaats_id: str,
    start_datum: Optional[str] = None,
    eind_datum: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle boekingen op voor een kostenplaats"""
    user_id = current_user["id"]
    
    kp = await db.kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id})
    if not kp:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    query = {"kostenplaats_id": kostenplaats_id}
    
    if start_datum or eind_datum:
        query["datum"] = {}
        if start_datum:
            query["datum"]["$gte"] = start_datum
        if eind_datum:
            query["datum"]["$lte"] = eind_datum
    
    boekingen = await db.kostenboekingen.find(query, {"_id": 0}).sort("datum", -1).to_list(500)
    
    return boekingen

@router.get("/rapportage/overzicht")
async def get_kostenplaatsen_rapportage(
    jaar: Optional[int] = None,
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Genereer een overzichtsrapportage van alle kostenplaatsen"""
    user_id = current_user["id"]
    
    if not jaar:
        jaar = datetime.now().year
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    
    kostenplaatsen = await db.kostenplaatsen.find(query, {"_id": 0}).to_list(500)
    
    start_jaar = f"{jaar}-01-01"
    eind_jaar = f"{jaar}-12-31"
    
    rapportage = []
    for kp in kostenplaatsen:
        # Haal kosten op voor dit jaar
        kosten = await db.kostenboekingen.aggregate([
            {"$match": {
                "kostenplaats_id": kp["id"],
                "datum": {"$gte": start_jaar, "$lte": eind_jaar}
            }},
            {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}, "aantal": {"$sum": 1}}}
        ]).to_list(1)
        
        actuele_kosten = kosten[0]["totaal"] if kosten else 0
        aantal_boekingen = kosten[0]["aantal"] if kosten else 0
        budget = kp.get("budget_jaar", 0) or 0
        
        rapportage.append({
            "kostenplaats_id": kp["id"],
            "code": kp["code"],
            "naam": kp["naam"],
            "type": kp.get("type", "overig"),
            "budget": budget,
            "actuele_kosten": round(actuele_kosten, 2),
            "budget_resterend": round(budget - actuele_kosten, 2),
            "benutting_percentage": round((actuele_kosten / budget * 100) if budget > 0 else 0, 1),
            "aantal_boekingen": aantal_boekingen,
            "status": kp.get("status", "actief")
        })
    
    # Sorteer op benutting percentage (hoogste eerst)
    rapportage.sort(key=lambda x: x["benutting_percentage"], reverse=True)
    
    return {
        "jaar": jaar,
        "rapportage": rapportage,
        "totalen": {
            "totaal_budget": sum(r["budget"] for r in rapportage),
            "totaal_kosten": sum(r["actuele_kosten"] for r in rapportage),
            "gemiddelde_benutting": round(sum(r["benutting_percentage"] for r in rapportage) / len(rapportage), 1) if rapportage else 0
        }
    }
