"""
Vaste Activa Module
- Beheer van vaste activa (gebouwen, voertuigen, apparatuur, etc.)
- Automatische afschrijvingen (lineair, degressief)
- Grootboek integratie
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from .deps import db, get_current_active_user
from utils.grootboek_integration import create_journaalpost, ensure_standaard_rekeningen, get_rekening_by_code

router = APIRouter(prefix="/vaste-activa", tags=["Vaste Activa"])

# ==================== ENUMS ====================

class ActivaCategorie(str, Enum):
    GEBOUWEN = "gebouwen"
    GROND = "grond"
    MACHINES = "machines"
    VOERTUIGEN = "voertuigen"
    INVENTARIS = "inventaris"
    COMPUTERS = "computers"
    SOFTWARE = "software"
    OVERIG = "overig"

class AfschrijvingsMethode(str, Enum):
    LINEAIR = "lineair"           # Gelijke bedragen per jaar
    DEGRESSIEF = "degressief"     # Percentage van boekwaarde
    GEEN = "geen"                 # Geen afschrijving (bijv. grond)

class ActivaStatus(str, Enum):
    ACTIEF = "actief"
    VERKOCHT = "verkocht"
    AFGESCHREVEN = "afgeschreven"
    BUITEN_GEBRUIK = "buiten_gebruik"

# ==================== MODELS ====================

class VastActivumCreate(BaseModel):
    naam: str
    omschrijving: Optional[str] = None
    categorie: ActivaCategorie
    aanschafdatum: str
    aanschafwaarde: float
    restwaarde: float = 0
    levensduur_jaren: int = 5
    afschrijvings_methode: AfschrijvingsMethode = AfschrijvingsMethode.LINEAIR
    degressief_percentage: Optional[float] = None  # Voor degressieve afschrijving
    locatie: Optional[str] = None
    serienummer: Optional[str] = None
    leverancier: Optional[str] = None
    garantie_tot: Optional[str] = None
    kostenplaats_id: Optional[str] = None

class VastActivumUpdate(BaseModel):
    naam: Optional[str] = None
    omschrijving: Optional[str] = None
    categorie: Optional[ActivaCategorie] = None
    locatie: Optional[str] = None
    serienummer: Optional[str] = None
    garantie_tot: Optional[str] = None
    kostenplaats_id: Optional[str] = None
    status: Optional[ActivaStatus] = None

class AfschrijvingCreate(BaseModel):
    activum_id: str
    datum: str
    bedrag: float
    omschrijving: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def bereken_afschrijving_lineair(aanschafwaarde: float, restwaarde: float, levensduur_jaren: int) -> float:
    """Bereken jaarlijkse lineaire afschrijving"""
    if levensduur_jaren <= 0:
        return 0
    return (aanschafwaarde - restwaarde) / levensduur_jaren

def bereken_afschrijving_degressief(boekwaarde: float, percentage: float) -> float:
    """Bereken degressieve afschrijving (percentage van boekwaarde)"""
    return boekwaarde * (percentage / 100)

def bereken_maandelijkse_afschrijving(jaarlijks: float) -> float:
    """Verdeel jaarlijkse afschrijving over 12 maanden"""
    return jaarlijks / 12

async def get_activum_boekwaarde(activum: dict) -> float:
    """Bereken huidige boekwaarde van een activum"""
    aanschafwaarde = activum.get("aanschafwaarde", 0)
    totaal_afgeschreven = activum.get("totaal_afgeschreven", 0)
    return aanschafwaarde - totaal_afgeschreven

# ==================== ENDPOINTS ====================

@router.get("/")
async def get_vaste_activa(
    categorie: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle vaste activa op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if categorie:
        query["categorie"] = categorie
    if status:
        query["status"] = status
    
    activa = await db.vaste_activa.find(query, {"_id": 0}).sort("aanschafdatum", -1).to_list(500)
    
    # Bereken boekwaarde voor elk activum
    for activum in activa:
        activum["boekwaarde"] = await get_activum_boekwaarde(activum)
    
    return activa

@router.get("/stats")
async def get_vaste_activa_stats(current_user: dict = Depends(get_current_active_user)):
    """Haal statistieken op voor vaste activa"""
    user_id = current_user["id"]
    
    activa = await db.vaste_activa.find({"user_id": user_id, "status": "actief"}, {"_id": 0}).to_list(500)
    
    totaal_aanschafwaarde = sum(a.get("aanschafwaarde", 0) for a in activa)
    totaal_afgeschreven = sum(a.get("totaal_afgeschreven", 0) for a in activa)
    totaal_boekwaarde = totaal_aanschafwaarde - totaal_afgeschreven
    
    # Per categorie
    per_categorie = {}
    for activum in activa:
        cat = activum.get("categorie", "overig")
        if cat not in per_categorie:
            per_categorie[cat] = {"aantal": 0, "aanschafwaarde": 0, "boekwaarde": 0}
        per_categorie[cat]["aantal"] += 1
        per_categorie[cat]["aanschafwaarde"] += activum.get("aanschafwaarde", 0)
        per_categorie[cat]["boekwaarde"] += activum.get("aanschafwaarde", 0) - activum.get("totaal_afgeschreven", 0)
    
    return {
        "totaal_activa": len(activa),
        "totaal_aanschafwaarde": round(totaal_aanschafwaarde, 2),
        "totaal_afgeschreven": round(totaal_afgeschreven, 2),
        "totaal_boekwaarde": round(totaal_boekwaarde, 2),
        "per_categorie": per_categorie
    }

@router.get("/{activum_id}")
async def get_vast_activum(activum_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifiek vast activum op"""
    user_id = current_user["id"]
    
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id}, {"_id": 0})
    if not activum:
        raise HTTPException(status_code=404, detail="Vast activum niet gevonden")
    
    activum["boekwaarde"] = await get_activum_boekwaarde(activum)
    
    # Haal afschrijvingshistorie op
    afschrijvingen = await db.vaste_activa_afschrijvingen.find(
        {"activum_id": activum_id},
        {"_id": 0}
    ).sort("datum", -1).to_list(100)
    activum["afschrijvingen"] = afschrijvingen
    
    return activum

@router.post("/")
async def create_vast_activum(data: VastActivumCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuw vast activum aan"""
    user_id = current_user["id"]
    activum_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken jaarlijkse en maandelijkse afschrijving
    if data.afschrijvings_methode == AfschrijvingsMethode.LINEAIR:
        jaarlijks = bereken_afschrijving_lineair(data.aanschafwaarde, data.restwaarde, data.levensduur_jaren)
    elif data.afschrijvings_methode == AfschrijvingsMethode.DEGRESSIEF:
        jaarlijks = bereken_afschrijving_degressief(data.aanschafwaarde, data.degressief_percentage or 20)
    else:
        jaarlijks = 0
    
    maandelijks = bereken_maandelijkse_afschrijving(jaarlijks)
    
    activum_doc = {
        "id": activum_id,
        "user_id": user_id,
        "naam": data.naam,
        "omschrijving": data.omschrijving,
        "categorie": data.categorie.value,
        "aanschafdatum": data.aanschafdatum,
        "aanschafwaarde": data.aanschafwaarde,
        "restwaarde": data.restwaarde,
        "levensduur_jaren": data.levensduur_jaren,
        "afschrijvings_methode": data.afschrijvings_methode.value,
        "degressief_percentage": data.degressief_percentage,
        "jaarlijkse_afschrijving": round(jaarlijks, 2),
        "maandelijkse_afschrijving": round(maandelijks, 2),
        "totaal_afgeschreven": 0,
        "locatie": data.locatie,
        "serienummer": data.serienummer,
        "leverancier": data.leverancier,
        "garantie_tot": data.garantie_tot,
        "kostenplaats_id": data.kostenplaats_id,
        "status": ActivaStatus.ACTIEF.value,
        "laatste_afschrijving": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.vaste_activa.insert_one(activum_doc)
    activum_doc.pop("_id", None)
    activum_doc["boekwaarde"] = data.aanschafwaarde
    
    return activum_doc

@router.put("/{activum_id}")
async def update_vast_activum(
    activum_id: str, 
    data: VastActivumUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Update een vast activum"""
    user_id = current_user["id"]
    
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Vast activum niet gevonden")
    
    update_data = {k: v.value if isinstance(v, Enum) else v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vaste_activa.update_one({"id": activum_id}, {"$set": update_data})
    
    updated = await db.vaste_activa.find_one({"id": activum_id}, {"_id": 0})
    updated["boekwaarde"] = await get_activum_boekwaarde(updated)
    return updated

@router.delete("/{activum_id}")
async def delete_vast_activum(activum_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een vast activum (alleen als er geen afschrijvingen zijn)"""
    user_id = current_user["id"]
    
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Vast activum niet gevonden")
    
    # Check of er afschrijvingen zijn
    afschrijving_count = await db.vaste_activa_afschrijvingen.count_documents({"activum_id": activum_id})
    if afschrijving_count > 0:
        raise HTTPException(status_code=400, detail="Kan niet verwijderen: er zijn afschrijvingen geboekt")
    
    await db.vaste_activa.delete_one({"id": activum_id})
    return {"message": "Vast activum verwijderd"}

@router.post("/{activum_id}/afschrijving")
async def boek_afschrijving(
    activum_id: str,
    data: AfschrijvingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Boek een afschrijving voor een vast activum"""
    user_id = current_user["id"]
    
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Vast activum niet gevonden")
    
    if activum.get("status") != "actief":
        raise HTTPException(status_code=400, detail="Activum is niet actief")
    
    boekwaarde = await get_activum_boekwaarde(activum)
    restwaarde = activum.get("restwaarde", 0)
    
    # Check of er nog ruimte is voor afschrijving
    if boekwaarde <= restwaarde:
        raise HTTPException(status_code=400, detail="Activum is volledig afgeschreven")
    
    # Limiteer afschrijving tot maximaal boekwaarde - restwaarde
    max_afschrijving = boekwaarde - restwaarde
    bedrag = min(data.bedrag, max_afschrijving)
    
    now = datetime.now(timezone.utc).isoformat()
    afschrijving_id = str(uuid.uuid4())
    
    # Maak afschrijving document
    afschrijving_doc = {
        "id": afschrijving_id,
        "user_id": user_id,
        "activum_id": activum_id,
        "datum": data.datum,
        "bedrag": round(bedrag, 2),
        "omschrijving": data.omschrijving or f"Afschrijving {activum.get('naam')}",
        "boekwaarde_voor": round(boekwaarde, 2),
        "boekwaarde_na": round(boekwaarde - bedrag, 2),
        "created_at": now
    }
    
    await db.vaste_activa_afschrijvingen.insert_one(afschrijving_doc)
    afschrijving_doc.pop("_id", None)
    
    # Update activum
    nieuw_totaal = activum.get("totaal_afgeschreven", 0) + bedrag
    nieuwe_status = "afgeschreven" if (boekwaarde - bedrag) <= restwaarde else "actief"
    
    await db.vaste_activa.update_one(
        {"id": activum_id},
        {"$set": {
            "totaal_afgeschreven": round(nieuw_totaal, 2),
            "laatste_afschrijving": data.datum,
            "status": nieuwe_status,
            "updated_at": now
        }}
    )
    
    # Boek naar grootboek
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_afschrijving = await get_rekening_by_code(db, user_id, "4300")  # Afschrijvingskosten
    rekening_cum_afschrijving = await get_rekening_by_code(db, user_id, "1410")  # Cum. Afschrijving
    
    regels = [
        {
            "rekening_id": rekening_afschrijving,
            "debet": bedrag,
            "credit": 0,
            "omschrijving": f"Afschrijving {activum.get('naam')}"
        },
        {
            "rekening_id": rekening_cum_afschrijving,
            "debet": 0,
            "credit": bedrag,
            "omschrijving": f"Cum. afschrijving {activum.get('naam')}"
        }
    ]
    
    await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Afschrijving {activum.get('naam')} - {data.datum}",
        regels=regels,
        datum=data.datum,
        referentie_type="afschrijving",
        referentie_id=afschrijving_id
    )
    
    return afschrijving_doc

@router.post("/maandelijkse-afschrijvingen")
async def boek_maandelijkse_afschrijvingen(
    maand: str,  # Format: YYYY-MM
    current_user: dict = Depends(get_current_active_user)
):
    """Boek alle maandelijkse afschrijvingen voor actieve activa"""
    user_id = current_user["id"]
    
    # Haal alle actieve activa op
    activa = await db.vaste_activa.find({
        "user_id": user_id,
        "status": "actief",
        "afschrijvings_methode": {"$ne": "geen"}
    }, {"_id": 0}).to_list(500)
    
    geboekt = []
    overgeslagen = []
    
    for activum in activa:
        # Check of deze maand al geboekt is
        bestaande = await db.vaste_activa_afschrijvingen.find_one({
            "activum_id": activum["id"],
            "datum": {"$regex": f"^{maand}"}
        })
        
        if bestaande:
            overgeslagen.append({"activum": activum["naam"], "reden": "Al geboekt deze maand"})
            continue
        
        boekwaarde = await get_activum_boekwaarde(activum)
        restwaarde = activum.get("restwaarde", 0)
        
        if boekwaarde <= restwaarde:
            overgeslagen.append({"activum": activum["naam"], "reden": "Volledig afgeschreven"})
            continue
        
        # Bereken afschrijving
        if activum.get("afschrijvings_methode") == "degressief":
            jaarlijks = bereken_afschrijving_degressief(boekwaarde, activum.get("degressief_percentage", 20))
            maandelijks = bereken_maandelijkse_afschrijving(jaarlijks)
        else:
            maandelijks = activum.get("maandelijkse_afschrijving", 0)
        
        if maandelijks <= 0:
            overgeslagen.append({"activum": activum["naam"], "reden": "Geen afschrijving berekend"})
            continue
        
        # Boek de afschrijving
        afschrijving_data = AfschrijvingCreate(
            activum_id=activum["id"],
            datum=f"{maand}-01",
            bedrag=maandelijks,
            omschrijving=f"Maandelijkse afschrijving {maand}"
        )
        
        try:
            result = await boek_afschrijving(activum["id"], afschrijving_data, current_user)
            geboekt.append({"activum": activum["naam"], "bedrag": result["bedrag"]})
        except HTTPException as e:
            overgeslagen.append({"activum": activum["naam"], "reden": e.detail})
    
    return {
        "maand": maand,
        "geboekt": len(geboekt),
        "overgeslagen": len(overgeslagen),
        "details_geboekt": geboekt,
        "details_overgeslagen": overgeslagen
    }

@router.get("/{activum_id}/afschrijvingen")
async def get_afschrijvingen(activum_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal afschrijvingshistorie op voor een activum"""
    user_id = current_user["id"]
    
    # Verifieer dat activum bestaat en van user is
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Vast activum niet gevonden")
    
    afschrijvingen = await db.vaste_activa_afschrijvingen.find(
        {"activum_id": activum_id},
        {"_id": 0}
    ).sort("datum", -1).to_list(100)
    
    return afschrijvingen
