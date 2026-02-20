"""
Vaste Activa & Kostenplaatsen Module
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from .deps import db, get_current_active_user, clean_doc

router = APIRouter(prefix="/activa", tags=["Vaste Activa & Kostenplaatsen"])

# ==================== ENUMS ====================

class Currency(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class AfschrijvingsMethode(str, Enum):
    LINEAIR = "lineair"
    DEGRESSIEF = "degressief"
    ANNUITEIT = "annuiteit"

class ActivaStatus(str, Enum):
    ACTIEF = "actief"
    VERKOCHT = "verkocht"
    AFGESCHREVEN = "afgeschreven"
    BUITEN_GEBRUIK = "buiten_gebruik"

class ActivaCategorie(str, Enum):
    GEBOUWEN = "gebouwen"
    MACHINES = "machines"
    INVENTARIS = "inventaris"
    TRANSPORTMIDDELEN = "transportmiddelen"
    COMPUTERS = "computers"
    SOFTWARE = "software"
    OVERIG = "overig"

# ==================== MODELS - VASTE ACTIVA ====================

class VastActivumCreate(BaseModel):
    naam: str
    omschrijving: Optional[str] = None
    categorie: ActivaCategorie = ActivaCategorie.OVERIG
    aanschafdatum: str
    aanschafwaarde: float
    valuta: Currency = Currency.SRD
    verwachte_levensduur: int = 5  # in jaren
    restwaarde: float = 0
    afschrijvings_methode: AfschrijvingsMethode = AfschrijvingsMethode.LINEAIR
    locatie: Optional[str] = None
    serienummer: Optional[str] = None
    leverancier_id: Optional[str] = None
    factuur_id: Optional[str] = None
    garantie_tot: Optional[str] = None
    verzekerd: bool = False
    verzekeringspolis: Optional[str] = None
    kostenplaats_id: Optional[str] = None
    grootboek_rekening_id: Optional[str] = None
    notities: Optional[str] = None

class VastActivumUpdate(BaseModel):
    naam: Optional[str] = None
    omschrijving: Optional[str] = None
    locatie: Optional[str] = None
    verwachte_levensduur: Optional[int] = None
    restwaarde: Optional[float] = None
    garantie_tot: Optional[str] = None
    verzekerd: Optional[bool] = None
    verzekeringspolis: Optional[str] = None
    kostenplaats_id: Optional[str] = None
    notities: Optional[str] = None
    status: Optional[ActivaStatus] = None

# ==================== MODELS - AFSCHRIJVINGEN ====================

class AfschrijvingCreate(BaseModel):
    activum_id: str
    datum: str
    bedrag: float
    omschrijving: Optional[str] = None

# ==================== MODELS - KOSTENPLAATSEN ====================

class KostenplaatsCreate(BaseModel):
    code: str
    naam: str
    omschrijving: Optional[str] = None
    type: str = "afdeling"  # afdeling, project, product
    bovenliggende_id: Optional[str] = None
    verantwoordelijke: Optional[str] = None
    budget: Optional[float] = None
    budget_valuta: Currency = Currency.SRD
    is_actief: bool = True

class KostenplaatsUpdate(BaseModel):
    naam: Optional[str] = None
    omschrijving: Optional[str] = None
    verantwoordelijke: Optional[str] = None
    budget: Optional[float] = None
    is_actief: Optional[bool] = None

# ==================== HELPER FUNCTIONS ====================

def bereken_jaarlijkse_afschrijving(aanschafwaarde: float, restwaarde: float, levensduur: int, methode: str) -> float:
    """Bereken de jaarlijkse afschrijving"""
    if levensduur <= 0:
        return 0
    
    af_te_schrijven = aanschafwaarde - restwaarde
    
    if methode == "lineair":
        return af_te_schrijven / levensduur
    elif methode == "degressief":
        # Dubbele lineaire methode
        return (aanschafwaarde * 2) / levensduur
    else:
        return af_te_schrijven / levensduur

def bereken_boekwaarde(aanschafwaarde: float, totaal_afgeschreven: float) -> float:
    """Bereken de huidige boekwaarde"""
    return max(0, aanschafwaarde - totaal_afgeschreven)

async def genereer_activum_nummer(user_id: str) -> str:
    """Genereer een uniek activum nummer"""
    count = await db.vaste_activa.count_documents({"user_id": user_id})
    return f"ACT{str(count + 1).zfill(5)}"

# ==================== VASTE ACTIVA ENDPOINTS ====================

@router.get("/")
async def get_vaste_activa(
    categorie: Optional[str] = None,
    status: Optional[str] = None,
    kostenplaats_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle vaste activa op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if categorie:
        query["categorie"] = categorie
    if status:
        query["status"] = status
    if kostenplaats_id:
        query["kostenplaats_id"] = kostenplaats_id
    
    activa = await db.vaste_activa.find(query, {"_id": 0}).sort("naam", 1).to_list(500)
    
    # Bereken actuele boekwaarde
    for activum in activa:
        afschrijvingen = await db.activa_afschrijvingen.aggregate([
            {"$match": {"activum_id": activum["id"]}},
            {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
        ]).to_list(1)
        
        totaal_afgeschreven = afschrijvingen[0]["totaal"] if afschrijvingen else 0
        activum["totaal_afgeschreven"] = totaal_afgeschreven
        activum["boekwaarde"] = bereken_boekwaarde(activum.get("aanschafwaarde", 0), totaal_afgeschreven)
    
    return activa

@router.get("/{activum_id}")
async def get_vast_activum(activum_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifiek vast activum op"""
    user_id = current_user["id"]
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id}, {"_id": 0})
    
    if not activum:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    # Haal afschrijvingen
    afschrijvingen = await db.activa_afschrijvingen.find(
        {"activum_id": activum_id},
        {"_id": 0}
    ).sort("datum", -1).to_list(100)
    
    totaal_afgeschreven = sum(a.get("bedrag", 0) for a in afschrijvingen)
    activum["afschrijvingen"] = afschrijvingen
    activum["totaal_afgeschreven"] = totaal_afgeschreven
    activum["boekwaarde"] = bereken_boekwaarde(activum.get("aanschafwaarde", 0), totaal_afgeschreven)
    
    # Bereken verwachte afschrijving per jaar
    activum["jaarlijkse_afschrijving"] = bereken_jaarlijkse_afschrijving(
        activum.get("aanschafwaarde", 0),
        activum.get("restwaarde", 0),
        activum.get("verwachte_levensduur", 5),
        activum.get("afschrijvings_methode", "lineair")
    )
    
    return activum

@router.post("/")
async def create_vast_activum(data: VastActivumCreate, current_user: dict = Depends(get_current_active_user)):
    """Registreer een nieuw vast activum"""
    user_id = current_user["id"]
    activum_id = str(uuid.uuid4())
    activum_nummer = await genereer_activum_nummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken jaarlijkse afschrijving
    jaarlijkse_afschrijving = bereken_jaarlijkse_afschrijving(
        data.aanschafwaarde,
        data.restwaarde,
        data.verwachte_levensduur,
        data.afschrijvings_methode.value
    )
    
    activum_doc = {
        "id": activum_id,
        "user_id": user_id,
        "activum_nummer": activum_nummer,
        **data.model_dump(),
        "categorie": data.categorie.value,
        "valuta": data.valuta.value,
        "afschrijvings_methode": data.afschrijvings_methode.value,
        "status": "actief",
        "jaarlijkse_afschrijving": round(jaarlijkse_afschrijving, 2),
        "maandelijkse_afschrijving": round(jaarlijkse_afschrijving / 12, 2),
        "totaal_afgeschreven": 0,
        "boekwaarde": data.aanschafwaarde,
        "created_at": now,
        "updated_at": now
    }
    
    await db.vaste_activa.insert_one(activum_doc)
    activum_doc.pop("_id", None)
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
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Herbereken afschrijving als levensduur of restwaarde wijzigt
    if "verwachte_levensduur" in update_data or "restwaarde" in update_data:
        levensduur = update_data.get("verwachte_levensduur", activum.get("verwachte_levensduur", 5))
        restwaarde = update_data.get("restwaarde", activum.get("restwaarde", 0))
        jaarlijkse = bereken_jaarlijkse_afschrijving(
            activum.get("aanschafwaarde", 0),
            restwaarde,
            levensduur,
            activum.get("afschrijvings_methode", "lineair")
        )
        update_data["jaarlijkse_afschrijving"] = round(jaarlijkse, 2)
        update_data["maandelijkse_afschrijving"] = round(jaarlijkse / 12, 2)
    
    await db.vaste_activa.update_one({"id": activum_id}, {"$set": update_data})
    
    updated = await db.vaste_activa.find_one({"id": activum_id}, {"_id": 0})
    return updated

@router.delete("/{activum_id}")
async def delete_vast_activum(activum_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een vast activum"""
    user_id = current_user["id"]
    
    # Check voor afschrijvingen
    afschrijving_count = await db.activa_afschrijvingen.count_documents({"activum_id": activum_id})
    
    if afschrijving_count > 0:
        # Soft delete - markeer als buiten gebruik
        await db.vaste_activa.update_one(
            {"id": activum_id, "user_id": user_id},
            {"$set": {"status": "buiten_gebruik", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Activum gemarkeerd als buiten gebruik (er zijn afschrijvingen)"}
    
    result = await db.vaste_activa.delete_one({"id": activum_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    return {"message": "Activum verwijderd"}

# ==================== AFSCHRIJVINGEN ENDPOINTS ====================

@router.get("/{activum_id}/afschrijvingen")
async def get_afschrijvingen(activum_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal afschrijvingen van een activum op"""
    user_id = current_user["id"]
    
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    afschrijvingen = await db.activa_afschrijvingen.find(
        {"activum_id": activum_id},
        {"_id": 0}
    ).sort("datum", -1).to_list(100)
    
    return afschrijvingen

@router.post("/{activum_id}/afschrijvingen")
async def create_afschrijving(
    activum_id: str,
    data: AfschrijvingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Registreer een afschrijving"""
    user_id = current_user["id"]
    
    activum = await db.vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    if activum.get("status") != "actief":
        raise HTTPException(status_code=400, detail="Kan alleen afschrijven op actieve activa")
    
    afschrijving_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken nieuwe totaal en boekwaarde
    huidige_totaal = activum.get("totaal_afgeschreven", 0)
    nieuwe_totaal = huidige_totaal + data.bedrag
    nieuwe_boekwaarde = bereken_boekwaarde(activum.get("aanschafwaarde", 0), nieuwe_totaal)
    
    # Check of we niet meer afschrijven dan mogelijk
    if nieuwe_boekwaarde < activum.get("restwaarde", 0):
        raise HTTPException(
            status_code=400, 
            detail=f"Afschrijving zou boekwaarde onder restwaarde brengen. Max afschrijving: {huidige_totaal + activum.get('boekwaarde', 0) - activum.get('restwaarde', 0)}"
        )
    
    afschrijving_doc = {
        "id": afschrijving_id,
        "activum_id": activum_id,
        "datum": data.datum,
        "bedrag": data.bedrag,
        "omschrijving": data.omschrijving or f"Afschrijving {activum.get('naam')}",
        "boekwaarde_na": nieuwe_boekwaarde,
        "created_at": now
    }
    
    await db.activa_afschrijvingen.insert_one(afschrijving_doc)
    afschrijving_doc.pop("_id", None)
    
    # Update activum
    update_fields = {
        "totaal_afgeschreven": nieuwe_totaal,
        "boekwaarde": nieuwe_boekwaarde,
        "updated_at": now
    }
    
    # Check of volledig afgeschreven
    if nieuwe_boekwaarde <= activum.get("restwaarde", 0):
        update_fields["status"] = "afgeschreven"
    
    await db.vaste_activa.update_one({"id": activum_id}, {"$set": update_fields})
    
    # Maak journaalpost voor boekhouding als gekoppeld
    if activum.get("grootboek_rekening_id"):
        # Dit zou een journaalpost moeten maken in de boekhouding
        pass
    
    return afschrijving_doc

@router.post("/afschrijvingen/batch")
async def batch_afschrijvingen(
    periode: str,  # YYYY-MM
    current_user: dict = Depends(get_current_active_user)
):
    """Voer batch afschrijvingen uit voor alle actieve activa"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Haal alle actieve activa
    activa = await db.vaste_activa.find({
        "user_id": user_id,
        "status": "actief"
    }).to_list(1000)
    
    resultaten = []
    for activum in activa:
        # Check of afschrijving voor deze periode al bestaat
        existing = await db.activa_afschrijvingen.find_one({
            "activum_id": activum["id"],
            "datum": {"$regex": f"^{periode}"}
        })
        
        if existing:
            resultaten.append({
                "activum_id": activum["id"],
                "naam": activum.get("naam"),
                "status": "overgeslagen",
                "reden": "Afschrijving voor deze periode bestaat al"
            })
            continue
        
        # Bereken afschrijvingsbedrag
        maandelijks = activum.get("maandelijkse_afschrijving", 0)
        if maandelijks <= 0:
            continue
        
        # Check of nog kan worden afgeschreven
        huidige_boekwaarde = activum.get("boekwaarde", 0)
        restwaarde = activum.get("restwaarde", 0)
        
        if huidige_boekwaarde <= restwaarde:
            resultaten.append({
                "activum_id": activum["id"],
                "naam": activum.get("naam"),
                "status": "overgeslagen",
                "reden": "Volledig afgeschreven"
            })
            continue
        
        # Pas bedrag aan als nodig
        max_afschrijving = huidige_boekwaarde - restwaarde
        bedrag = min(maandelijks, max_afschrijving)
        
        # Maak afschrijving
        afschrijving_id = str(uuid.uuid4())
        datum = f"{periode}-01"
        nieuwe_boekwaarde = huidige_boekwaarde - bedrag
        
        afschrijving_doc = {
            "id": afschrijving_id,
            "activum_id": activum["id"],
            "datum": datum,
            "bedrag": round(bedrag, 2),
            "omschrijving": f"Maandelijkse afschrijving {periode}",
            "boekwaarde_na": round(nieuwe_boekwaarde, 2),
            "created_at": now
        }
        
        await db.activa_afschrijvingen.insert_one(afschrijving_doc)
    afschrijving_doc.pop("_id", None)
        
        # Update activum
        update_fields = {
            "totaal_afgeschreven": activum.get("totaal_afgeschreven", 0) + bedrag,
            "boekwaarde": nieuwe_boekwaarde,
            "updated_at": now
        }
        
        if nieuwe_boekwaarde <= restwaarde:
            update_fields["status"] = "afgeschreven"
        
        await db.vaste_activa.update_one({"id": activum["id"]}, {"$set": update_fields})
        
        resultaten.append({
            "activum_id": activum["id"],
            "naam": activum.get("naam"),
            "status": "afgeschreven",
            "bedrag": round(bedrag, 2),
            "nieuwe_boekwaarde": round(nieuwe_boekwaarde, 2)
        })
    
    return {
        "periode": periode,
        "verwerkt": len([r for r in resultaten if r.get("status") == "afgeschreven"]),
        "overgeslagen": len([r for r in resultaten if r.get("status") == "overgeslagen"]),
        "resultaten": resultaten
    }

# ==================== KOSTENPLAATSEN ENDPOINTS ====================

@router.get("/kostenplaatsen")
async def get_kostenplaatsen(
    type: Optional[str] = None,
    actief: Optional[bool] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle kostenplaatsen op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if type:
        query["type"] = type
    if actief is not None:
        query["is_actief"] = actief
    
    kostenplaatsen = await db.kostenplaatsen.find(query, {"_id": 0}).sort("code", 1).to_list(500)
    
    # Bereken werkelijke kosten per kostenplaats
    for kp in kostenplaatsen:
        # Haal kosten uit journaalposten die aan deze kostenplaats zijn toegewezen
        kosten = await db.boekhouding_journaalposten.aggregate([
            {"$match": {"user_id": user_id, "kostenplaats_id": kp["id"]}},
            {"$group": {"_id": None, "totaal": {"$sum": "$totaal_debet"}}}
        ]).to_list(1)
        
        kp["werkelijke_kosten"] = kosten[0]["totaal"] if kosten else 0
        
        # Bereken budget verbruik percentage
        if kp.get("budget") and kp["budget"] > 0:
            kp["budget_verbruik_percentage"] = round((kp["werkelijke_kosten"] / kp["budget"]) * 100, 1)
        else:
            kp["budget_verbruik_percentage"] = 0
    
    return kostenplaatsen

@router.get("/kostenplaatsen/{kostenplaats_id}")
async def get_kostenplaats(kostenplaats_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke kostenplaats op"""
    user_id = current_user["id"]
    kostenplaats = await db.kostenplaatsen.find_one(
        {"id": kostenplaats_id, "user_id": user_id}, {"_id": 0}
    )
    
    if not kostenplaats:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    # Haal gekoppelde activa
    activa = await db.vaste_activa.find(
        {"kostenplaats_id": kostenplaats_id},
        {"_id": 0}
    ).to_list(100)
    kostenplaats["activa"] = activa
    
    # Haal boekingen
    boekingen = await db.boekhouding_journaalposten.find(
        {"user_id": user_id, "kostenplaats_id": kostenplaats_id},
        {"_id": 0}
    ).sort("datum", -1).limit(50).to_list(50)
    kostenplaats["recente_boekingen"] = boekingen
    
    return kostenplaats

@router.post("/kostenplaatsen")
async def create_kostenplaats(data: KostenplaatsCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe kostenplaats aan"""
    user_id = current_user["id"]
    
    # Check of code al bestaat
    existing = await db.kostenplaatsen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Kostenplaatscode bestaat al")
    
    kostenplaats_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    kostenplaats_doc = {
        "id": kostenplaats_id,
        "user_id": user_id,
        **data.model_dump(),
        "budget_valuta": data.budget_valuta.value,
        "werkelijke_kosten": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.kostenplaatsen.insert_one(kostenplaats_doc)
    kostenplaats_doc.pop("_id", None)
    return kostenplaats_doc

@router.put("/kostenplaatsen/{kostenplaats_id}")
async def update_kostenplaats(
    kostenplaats_id: str,
    data: KostenplaatsUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update een kostenplaats"""
    user_id = current_user["id"]
    
    kostenplaats = await db.kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id})
    if not kostenplaats:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.kostenplaatsen.update_one({"id": kostenplaats_id}, {"$set": update_data})
    
    updated = await db.kostenplaatsen.find_one({"id": kostenplaats_id}, {"_id": 0})
    return updated

@router.delete("/kostenplaatsen/{kostenplaats_id}")
async def delete_kostenplaats(kostenplaats_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een kostenplaats"""
    user_id = current_user["id"]
    
    # Check voor gekoppelde items
    activa_count = await db.vaste_activa.count_documents({"kostenplaats_id": kostenplaats_id})
    boeking_count = await db.boekhouding_journaalposten.count_documents({
        "user_id": user_id, "kostenplaats_id": kostenplaats_id
    })
    
    if activa_count > 0 or boeking_count > 0:
        await db.kostenplaatsen.update_one(
            {"id": kostenplaats_id, "user_id": user_id},
            {"$set": {"is_actief": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Kostenplaats gedeactiveerd (er zijn gekoppelde items)"}
    
    result = await db.kostenplaatsen.delete_one({"id": kostenplaats_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    return {"message": "Kostenplaats verwijderd"}

# ==================== RAPPORTAGES ====================

@router.get("/rapportages/overzicht")
async def get_activa_overzicht(
    valuta: Currency = Currency.SRD,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal een overzicht van alle vaste activa"""
    user_id = current_user["id"]
    
    # Per categorie
    per_categorie = await db.vaste_activa.aggregate([
        {"$match": {"user_id": user_id, "status": "actief"}},
        {"$group": {
            "_id": "$categorie",
            "aantal": {"$sum": 1},
            "aanschafwaarde": {"$sum": "$aanschafwaarde"},
            "boekwaarde": {"$sum": "$boekwaarde"},
            "afgeschreven": {"$sum": "$totaal_afgeschreven"}
        }}
    ]).to_list(20)
    
    # Totalen
    totalen = await db.vaste_activa.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$status",
            "aantal": {"$sum": 1},
            "aanschafwaarde": {"$sum": "$aanschafwaarde"},
            "boekwaarde": {"$sum": "$boekwaarde"}
        }}
    ]).to_list(10)
    
    # Afschrijvingen dit jaar
    jaar_start = f"{datetime.now().year}-01-01"
    afschrijvingen_jaar = await db.activa_afschrijvingen.aggregate([
        {"$match": {"datum": {"$gte": jaar_start}}},
        {"$lookup": {
            "from": "vaste_activa",
            "localField": "activum_id",
            "foreignField": "id",
            "as": "activum"
        }},
        {"$unwind": "$activum"},
        {"$match": {"activum.user_id": user_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
    ]).to_list(1)
    
    return {
        "per_categorie": per_categorie,
        "per_status": totalen,
        "afschrijvingen_dit_jaar": afschrijvingen_jaar[0]["totaal"] if afschrijvingen_jaar else 0,
        "valuta": valuta.value
    }

@router.get("/rapportages/kostenplaatsen")
async def get_kostenplaatsen_rapportage(
    start_datum: Optional[str] = None,
    eind_datum: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal een kostenplaatsen rapportage op"""
    user_id = current_user["id"]
    
    # Standaard naar deze maand
    if not start_datum:
        now = datetime.now()
        start_datum = now.replace(day=1).strftime("%Y-%m-%d")
    if not eind_datum:
        eind_datum = datetime.now().strftime("%Y-%m-%d")
    
    kostenplaatsen = await db.kostenplaatsen.find(
        {"user_id": user_id, "is_actief": True},
        {"_id": 0}
    ).to_list(100)
    
    rapportage = []
    for kp in kostenplaatsen:
        # Haal kosten voor periode
        kosten = await db.boekhouding_journaalposten.aggregate([
            {"$match": {
                "user_id": user_id,
                "kostenplaats_id": kp["id"],
                "datum": {"$gte": start_datum, "$lte": eind_datum}
            }},
            {"$group": {"_id": None, "totaal": {"$sum": "$totaal_debet"}}}
        ]).to_list(1)
        
        werkelijke_kosten = kosten[0]["totaal"] if kosten else 0
        budget = kp.get("budget", 0)
        
        rapportage.append({
            "id": kp["id"],
            "code": kp.get("code"),
            "naam": kp.get("naam"),
            "type": kp.get("type"),
            "budget": budget,
            "werkelijke_kosten": werkelijke_kosten,
            "verschil": budget - werkelijke_kosten if budget else None,
            "verbruik_percentage": round((werkelijke_kosten / budget) * 100, 1) if budget > 0 else 0
        })
    
    return {
        "periode": f"{start_datum} - {eind_datum}",
        "kostenplaatsen": rapportage,
        "totaal_budget": sum(r.get("budget", 0) or 0 for r in rapportage),
        "totaal_kosten": sum(r.get("werkelijke_kosten", 0) for r in rapportage)
    }

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_activa_dashboard(current_user: dict = Depends(get_current_active_user)):
    """Haal vaste activa dashboard data op"""
    user_id = current_user["id"]
    
    # Totaal actieve activa
    activa_count = await db.vaste_activa.count_documents({"user_id": user_id, "status": "actief"})
    
    # Totale waarden
    waarden = await db.vaste_activa.aggregate([
        {"$match": {"user_id": user_id, "status": "actief"}},
        {"$group": {
            "_id": None,
            "totaal_aanschafwaarde": {"$sum": "$aanschafwaarde"},
            "totaal_boekwaarde": {"$sum": "$boekwaarde"},
            "totaal_afgeschreven": {"$sum": "$totaal_afgeschreven"}
        }}
    ]).to_list(1)
    
    totalen = waarden[0] if waarden else {
        "totaal_aanschafwaarde": 0,
        "totaal_boekwaarde": 0,
        "totaal_afgeschreven": 0
    }
    
    # Kostenplaatsen met budget overschrijding
    budget_overschreden = 0
    kostenplaatsen = await db.kostenplaatsen.find(
        {"user_id": user_id, "is_actief": True, "budget": {"$gt": 0}}
    ).to_list(100)
    
    for kp in kostenplaatsen:
        kosten = await db.boekhouding_journaalposten.aggregate([
            {"$match": {"user_id": user_id, "kostenplaats_id": kp["id"]}},
            {"$group": {"_id": None, "totaal": {"$sum": "$totaal_debet"}}}
        ]).to_list(1)
        
        if kosten and kosten[0]["totaal"] > kp.get("budget", 0):
            budget_overschreden += 1
    
    # Recente afschrijvingen
    recente_afschrijvingen = await db.activa_afschrijvingen.aggregate([
        {"$lookup": {
            "from": "vaste_activa",
            "localField": "activum_id",
            "foreignField": "id",
            "as": "activum"
        }},
        {"$unwind": "$activum"},
        {"$match": {"activum.user_id": user_id}},
        {"$sort": {"datum": -1}},
        {"$limit": 5},
        {"$project": {
            "_id": 0,
            "id": 1,
            "datum": 1,
            "bedrag": 1,
            "activum_naam": "$activum.naam"
        }}
    ]).to_list(5)
    
    # Activa per categorie
    per_categorie = await db.vaste_activa.aggregate([
        {"$match": {"user_id": user_id, "status": "actief"}},
        {"$group": {
            "_id": "$categorie",
            "aantal": {"$sum": 1},
            "boekwaarde": {"$sum": "$boekwaarde"}
        }}
    ]).to_list(20)
    
    return {
        "activa_count": activa_count,
        "totaal_aanschafwaarde": totalen.get("totaal_aanschafwaarde", 0),
        "totaal_boekwaarde": totalen.get("totaal_boekwaarde", 0),
        "totaal_afgeschreven": totalen.get("totaal_afgeschreven", 0),
        "kostenplaatsen_count": len(kostenplaatsen),
        "budget_overschreden_count": budget_overschreden,
        "recente_afschrijvingen": recente_afschrijvingen,
        "per_categorie": per_categorie
    }
