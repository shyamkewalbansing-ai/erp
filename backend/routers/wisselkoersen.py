"""
Wisselkoersen Module
- Beheer van wisselkoersen (USD, EUR vs SRD)
- Historische koersen
- Automatische valuta conversie
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, date
from enum import Enum
import uuid
from .deps import db, get_current_active_user

router = APIRouter(prefix="/wisselkoersen", tags=["Wisselkoersen"])

# ==================== ENUMS ====================

class Valuta(str, Enum):
    SRD = "SRD"  # Surinaamse Dollar (basis valuta)
    USD = "USD"  # US Dollar
    EUR = "EUR"  # Euro
    GYD = "GYD"  # Guyanese Dollar
    BRL = "BRL"  # Braziliaanse Real

# ==================== MODELS ====================

class WisselkoersCreate(BaseModel):
    valuta: Valuta
    koers: float  # Koers t.o.v. SRD (1 vreemde valuta = X SRD)
    datum: str
    bron: Optional[str] = None  # Bijv. "CBvS" (Centrale Bank van Suriname)

class WisselkoersUpdate(BaseModel):
    koers: float
    bron: Optional[str] = None

class ConversieRequest(BaseModel):
    bedrag: float
    van_valuta: Valuta
    naar_valuta: Valuta
    datum: Optional[str] = None  # Gebruik koers van specifieke datum

# ==================== HELPER FUNCTIONS ====================

async def get_koers_voor_datum(db, user_id: str, valuta: str, datum: str) -> Optional[float]:
    """Haal de wisselkoers op voor een specifieke datum (of meest recente daarvoor)"""
    koers = await db.wisselkoersen.find_one(
        {"user_id": user_id, "valuta": valuta, "datum": {"$lte": datum}},
        {"_id": 0},
        sort=[("datum", -1)]
    )
    return koers.get("koers") if koers else None

async def converteer_bedrag(db, user_id: str, bedrag: float, van_valuta: str, naar_valuta: str, datum: str = None) -> dict:
    """Converteer een bedrag van de ene valuta naar de andere"""
    if not datum:
        datum = datetime.now().strftime("%Y-%m-%d")
    
    # Als beide valuta's hetzelfde zijn
    if van_valuta == naar_valuta:
        return {"bedrag": bedrag, "koers": 1, "valuta": naar_valuta}
    
    # SRD is de basis valuta
    if van_valuta == "SRD":
        # Van SRD naar andere valuta: deel door koers
        koers = await get_koers_voor_datum(db, user_id, naar_valuta, datum)
        if not koers:
            raise HTTPException(status_code=404, detail=f"Geen wisselkoers gevonden voor {naar_valuta}")
        return {"bedrag": round(bedrag / koers, 2), "koers": koers, "valuta": naar_valuta}
    
    elif naar_valuta == "SRD":
        # Van andere valuta naar SRD: vermenigvuldig met koers
        koers = await get_koers_voor_datum(db, user_id, van_valuta, datum)
        if not koers:
            raise HTTPException(status_code=404, detail=f"Geen wisselkoers gevonden voor {van_valuta}")
        return {"bedrag": round(bedrag * koers, 2), "koers": koers, "valuta": naar_valuta}
    
    else:
        # Van vreemde valuta naar andere vreemde valuta: via SRD
        koers_van = await get_koers_voor_datum(db, user_id, van_valuta, datum)
        koers_naar = await get_koers_voor_datum(db, user_id, naar_valuta, datum)
        
        if not koers_van:
            raise HTTPException(status_code=404, detail=f"Geen wisselkoers gevonden voor {van_valuta}")
        if not koers_naar:
            raise HTTPException(status_code=404, detail=f"Geen wisselkoers gevonden voor {naar_valuta}")
        
        # Eerst naar SRD, dan naar doelvaluta
        bedrag_srd = bedrag * koers_van
        bedrag_doel = bedrag_srd / koers_naar
        
        return {
            "bedrag": round(bedrag_doel, 2),
            "koers_van": koers_van,
            "koers_naar": koers_naar,
            "via_srd": round(bedrag_srd, 2),
            "valuta": naar_valuta
        }

# ==================== ENDPOINTS ====================

@router.get("/")
async def get_wisselkoersen(
    valuta: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle wisselkoersen op (meest recente per valuta)"""
    user_id = current_user["id"]
    
    # Haal meest recente koers per valuta
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"datum": -1}},
        {"$group": {
            "_id": "$valuta",
            "koers": {"$first": "$koers"},
            "datum": {"$first": "$datum"},
            "bron": {"$first": "$bron"},
            "id": {"$first": "$id"}
        }}
    ]
    
    if valuta:
        pipeline[0]["$match"]["valuta"] = valuta
    
    koersen = await db.wisselkoersen.aggregate(pipeline).to_list(20)
    
    return [
        {
            "id": k["id"],
            "valuta": k["_id"],
            "koers": k["koers"],
            "datum": k["datum"],
            "bron": k.get("bron")
        }
        for k in koersen
    ]

@router.get("/historie/{valuta}")
async def get_wisselkoers_historie(
    valuta: str,
    limit: int = 30,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal wisselkoers historie op voor een valuta"""
    user_id = current_user["id"]
    
    koersen = await db.wisselkoersen.find(
        {"user_id": user_id, "valuta": valuta.upper()},
        {"_id": 0}
    ).sort("datum", -1).limit(limit).to_list(limit)
    
    return koersen

@router.get("/actueel/{valuta}")
async def get_actuele_koers(valuta: str, current_user: dict = Depends(get_current_active_user)):
    """Haal de meest recente wisselkoers op voor een valuta"""
    user_id = current_user["id"]
    
    koers = await db.wisselkoersen.find_one(
        {"user_id": user_id, "valuta": valuta.upper()},
        {"_id": 0},
        sort=[("datum", -1)]
    )
    
    if not koers:
        raise HTTPException(status_code=404, detail=f"Geen wisselkoers gevonden voor {valuta}")
    
    return koers

@router.post("/")
async def create_wisselkoers(data: WisselkoersCreate, current_user: dict = Depends(get_current_active_user)):
    """Voeg een nieuwe wisselkoers toe"""
    user_id = current_user["id"]
    
    if data.valuta == Valuta.SRD:
        raise HTTPException(status_code=400, detail="SRD is de basis valuta, kan geen koers voor SRD toevoegen")
    
    # Check of er al een koers is voor deze datum
    existing = await db.wisselkoersen.find_one({
        "user_id": user_id,
        "valuta": data.valuta.value,
        "datum": data.datum
    })
    
    if existing:
        # Update bestaande
        await db.wisselkoersen.update_one(
            {"id": existing["id"]},
            {"$set": {
                "koers": data.koers,
                "bron": data.bron,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        updated = await db.wisselkoersen.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    
    koers_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    koers_doc = {
        "id": koers_id,
        "user_id": user_id,
        "valuta": data.valuta.value,
        "koers": data.koers,
        "datum": data.datum,
        "bron": data.bron,
        "created_at": now,
        "updated_at": now
    }
    
    await db.wisselkoersen.insert_one(koers_doc)
    koers_doc.pop("_id", None)
    
    return koers_doc

@router.put("/{koers_id}")
async def update_wisselkoers(
    koers_id: str,
    data: WisselkoersUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update een wisselkoers"""
    user_id = current_user["id"]
    
    koers = await db.wisselkoersen.find_one({"id": koers_id, "user_id": user_id})
    if not koers:
        raise HTTPException(status_code=404, detail="Wisselkoers niet gevonden")
    
    update_data = {
        "koers": data.koers,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.bron:
        update_data["bron"] = data.bron
    
    await db.wisselkoersen.update_one({"id": koers_id}, {"$set": update_data})
    
    updated = await db.wisselkoersen.find_one({"id": koers_id}, {"_id": 0})
    return updated

@router.delete("/{koers_id}")
async def delete_wisselkoers(koers_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een wisselkoers"""
    user_id = current_user["id"]
    
    result = await db.wisselkoersen.delete_one({"id": koers_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Wisselkoers niet gevonden")
    
    return {"message": "Wisselkoers verwijderd"}

@router.post("/converteer")
async def converteer_valuta(data: ConversieRequest, current_user: dict = Depends(get_current_active_user)):
    """Converteer een bedrag van de ene valuta naar de andere"""
    user_id = current_user["id"]
    
    datum = data.datum or datetime.now().strftime("%Y-%m-%d")
    
    result = await converteer_bedrag(
        db=db,
        user_id=user_id,
        bedrag=data.bedrag,
        van_valuta=data.van_valuta.value,
        naar_valuta=data.naar_valuta.value,
        datum=datum
    )
    
    return {
        "origineel": {
            "bedrag": data.bedrag,
            "valuta": data.van_valuta.value
        },
        "geconverteerd": result,
        "datum": datum
    }

@router.post("/bulk-import")
async def bulk_import_koersen(
    koersen: List[WisselkoersCreate],
    current_user: dict = Depends(get_current_active_user)
):
    """Importeer meerdere wisselkoersen tegelijk"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()
    
    toegevoegd = 0
    bijgewerkt = 0
    
    for koers_data in koersen:
        if koers_data.valuta == Valuta.SRD:
            continue
        
        existing = await db.wisselkoersen.find_one({
            "user_id": user_id,
            "valuta": koers_data.valuta.value,
            "datum": koers_data.datum
        })
        
        if existing:
            await db.wisselkoersen.update_one(
                {"id": existing["id"]},
                {"$set": {"koers": koers_data.koers, "bron": koers_data.bron, "updated_at": now}}
            )
            bijgewerkt += 1
        else:
            koers_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "valuta": koers_data.valuta.value,
                "koers": koers_data.koers,
                "datum": koers_data.datum,
                "bron": koers_data.bron,
                "created_at": now,
                "updated_at": now
            }
            await db.wisselkoersen.insert_one(koers_doc)
            toegevoegd += 1
    
    return {
        "message": f"{toegevoegd} koersen toegevoegd, {bijgewerkt} koersen bijgewerkt",
        "toegevoegd": toegevoegd,
        "bijgewerkt": bijgewerkt
    }

@router.get("/standaard-koersen")
async def get_standaard_koersen():
    """Geef standaard/voorbeeld wisselkoersen terug (zonder authenticatie)"""
    # Actuele indicatieve koersen (moet door gebruiker worden aangepast)
    return {
        "bron": "Indicatief - pas aan naar actuele koersen",
        "datum": datetime.now().strftime("%Y-%m-%d"),
        "koersen": [
            {"valuta": "USD", "koers": 36.50, "omschrijving": "1 USD = 36.50 SRD"},
            {"valuta": "EUR", "koers": 39.00, "omschrijving": "1 EUR = 39.00 SRD"},
            {"valuta": "GYD", "koers": 0.17, "omschrijving": "1 GYD = 0.17 SRD"},
            {"valuta": "BRL", "koers": 7.30, "omschrijving": "1 BRL = 7.30 SRD"}
        ]
    }
