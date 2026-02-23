"""
Inkoop Module - Inkoopoffertes, Inkooporders, Goederenontvangst, Leveranciersbeheer
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from .deps import db, get_current_active_user, clean_doc

router = APIRouter(prefix="/inkoop", tags=["Inkoop"])

# ==================== ENUMS ====================

class Currency(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class OfferteStatus(str, Enum):
    CONCEPT = "concept"
    VERZONDEN = "verzonden"
    GEACCEPTEERD = "geaccepteerd"
    AFGEWEZEN = "afgewezen"
    VERLOPEN = "verlopen"

class OrderStatus(str, Enum):
    CONCEPT = "concept"
    BEVESTIGD = "bevestigd"
    GEDEELTELIJK_ONTVANGEN = "gedeeltelijk_ontvangen"
    VOLLEDIG_ONTVANGEN = "volledig_ontvangen"
    GEANNULEERD = "geannuleerd"

class OntvangstStatus(str, Enum):
    GEPLAND = "gepland"
    ONTVANGEN = "ontvangen"
    GECONTROLEERD = "gecontroleerd"
    AFGEKEURD = "afgekeurd"

# ==================== MODELS - LEVERANCIERS ====================

class LeverancierCreate(BaseModel):
    naam: str
    bedrijfsnaam: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    land: str = "Suriname"
    btw_nummer: Optional[str] = None
    kvk_nummer: Optional[str] = None
    bankrekening: Optional[str] = None
    bank_naam: Optional[str] = None
    standaard_valuta: Currency = Currency.SRD
    betalingstermijn: int = 30
    contactpersoon: Optional[str] = None
    notities: Optional[str] = None
    categorie: Optional[str] = None
    is_actief: bool = True

class LeverancierUpdate(BaseModel):
    naam: Optional[str] = None
    bedrijfsnaam: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    land: Optional[str] = None
    btw_nummer: Optional[str] = None
    kvk_nummer: Optional[str] = None
    bankrekening: Optional[str] = None
    bank_naam: Optional[str] = None
    standaard_valuta: Optional[Currency] = None
    betalingstermijn: Optional[int] = None
    contactpersoon: Optional[str] = None
    notities: Optional[str] = None
    categorie: Optional[str] = None
    is_actief: Optional[bool] = None

# ==================== MODELS - INKOOPOFFERTES ====================

class InkoopofferteRegelCreate(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float = 1
    eenheid: str = "stuk"
    prijs_per_stuk: float
    korting_percentage: float = 0
    btw_tarief: str = "25"

class InkoopofferteCreate(BaseModel):
    leverancier_id: str
    offertedatum: str
    geldig_tot: Optional[str] = None
    valuta: Currency = Currency.SRD
    regels: List[InkoopofferteRegelCreate]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None
    levering_adres: Optional[str] = None
    verwachte_leverdatum: Optional[str] = None

class InkoopofferteUpdate(BaseModel):
    geldig_tot: Optional[str] = None
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None
    levering_adres: Optional[str] = None
    verwachte_leverdatum: Optional[str] = None

# ==================== MODELS - INKOOPORDERS ====================

class InkooporderRegelCreate(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float = 1
    eenheid: str = "stuk"
    prijs_per_stuk: float
    korting_percentage: float = 0
    btw_tarief: str = "25"
    ontvangen_aantal: float = 0

class InkooporderCreate(BaseModel):
    leverancier_id: str
    offerte_id: Optional[str] = None
    orderdatum: str
    verwachte_leverdatum: Optional[str] = None
    valuta: Currency = Currency.SRD
    regels: List[InkooporderRegelCreate]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None
    levering_adres: Optional[str] = None

# ==================== MODELS - GOEDERENONTVANGST ====================

class OntvangstRegelCreate(BaseModel):
    order_regel_index: int
    artikel_id: Optional[str] = None
    omschrijving: str
    verwacht_aantal: float
    ontvangen_aantal: float
    eenheid: str = "stuk"
    serienummers: Optional[List[str]] = None
    batchnummer: Optional[str] = None
    locatie_id: Optional[str] = None
    opmerking: Optional[str] = None
    status: str = "goed"  # goed, beschadigd, afgekeurd

class GoederenontvangstCreate(BaseModel):
    inkooporder_id: str
    ontvangstdatum: str
    regels: List[OntvangstRegelCreate]
    pakbon_nummer: Optional[str] = None
    ontvangen_door: Optional[str] = None
    opmerkingen: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def get_btw_percentage(tarief: str) -> float:
    mapping = {"0": 0.0, "10": 10.0, "25": 25.0}
    return mapping.get(tarief, 25.0)

async def genereer_offertenummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.inkoop_offertes.count_documents({
        "user_id": user_id,
        "offertenummer": {"$regex": f"^IO{year}-"}
    })
    return f"IO{year}-{str(count + 1).zfill(5)}"

async def genereer_ordernummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.inkoop_orders.count_documents({
        "user_id": user_id,
        "ordernummer": {"$regex": f"^PO{year}-"}
    })
    return f"PO{year}-{str(count + 1).zfill(5)}"

async def genereer_ontvangstnummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.inkoop_ontvangsten.count_documents({
        "user_id": user_id,
        "ontvangstnummer": {"$regex": f"^GO{year}-"}
    })
    return f"GO{year}-{str(count + 1).zfill(5)}"

# ==================== LEVERANCIERS ENDPOINTS ====================

@router.get("/leveranciers")
async def get_leveranciers(
    actief: Optional[bool] = None,
    categorie: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle leveranciers op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if actief is not None:
        query["is_actief"] = actief
    if categorie:
        query["categorie"] = categorie
    if search:
        query["$or"] = [
            {"naam": {"$regex": search, "$options": "i"}},
            {"bedrijfsnaam": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    leveranciers = await db.inkoop_leveranciers.find(query, {"_id": 0}).sort("naam", 1).to_list(500)
    
    # Bereken openstaande bedragen per leverancier
    for lev in leveranciers:
        openstaand = await db.boekhouding_inkoopfacturen.aggregate([
            {"$match": {
                "user_id": user_id,
                "crediteur_id": lev["id"],
                "status": {"$in": ["ontvangen", "gedeeltelijk_betaald", "vervallen"]}
            }},
            {"$group": {
                "_id": "$valuta",
                "totaal": {"$sum": {"$subtract": ["$totaal", "$betaald_bedrag"]}}
            }}
        ]).to_list(10)
        
        lev["openstaand_per_valuta"] = {item["_id"]: item["totaal"] for item in openstaand}
        default_valuta = lev.get("standaard_valuta", "SRD")
        lev["openstaand_bedrag"] = lev["openstaand_per_valuta"].get(default_valuta, 0)
    
    return leveranciers

@router.get("/leveranciers/{leverancier_id}")
async def get_leverancier(leverancier_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke leverancier op"""
    user_id = current_user["id"]
    leverancier = await db.inkoop_leveranciers.find_one(
        {"id": leverancier_id, "user_id": user_id}, {"_id": 0}
    )
    if not leverancier:
        raise HTTPException(status_code=404, detail="Leverancier niet gevonden")
    return leverancier

@router.post("/leveranciers")
async def create_leverancier(data: LeverancierCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe leverancier aan"""
    user_id = current_user["id"]
    leverancier_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Genereer leveranciersnummer
    count = await db.inkoop_leveranciers.count_documents({"user_id": user_id})
    leveranciersnummer = f"LEV{str(count + 1).zfill(5)}"
    
    leverancier_doc = {
        "id": leverancier_id,
        "user_id": user_id,
        "leveranciersnummer": leveranciersnummer,
        **data.model_dump(),
        "standaard_valuta": data.standaard_valuta.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.inkoop_leveranciers.insert_one(leverancier_doc)
    leverancier_doc.pop("_id", None)
    
    # Synchroniseer met crediteuren in boekhouding
    crediteur_doc = {
        "id": leverancier_id,
        "user_id": user_id,
        "naam": data.bedrijfsnaam or data.naam,
        "email": data.email,
        "telefoon": data.telefoon,
        "adres": data.adres,
        "btw_nummer": data.btw_nummer,
        "standaard_valuta": data.standaard_valuta.value,
        "betalingstermijn": data.betalingstermijn,
        "notities": data.notities,
        "openstaand_bedrag": 0,
        "openstaand_valuta": data.standaard_valuta.value,
        "created_at": now,
        "leverancier_id": leverancier_id  # Link naar leverancier
    }
    await db.boekhouding_crediteuren.insert_one(crediteur_doc)
    crediteur_doc.pop("_id", None)
    
    # Remove MongoDB _id before returning
    leverancier_doc.pop("_id", None)
    return clean_doc(leverancier_doc)

@router.put("/leveranciers/{leverancier_id}")
async def update_leverancier(
    leverancier_id: str, 
    data: LeverancierUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Update een leverancier"""
    user_id = current_user["id"]
    
    leverancier = await db.inkoop_leveranciers.find_one({"id": leverancier_id, "user_id": user_id})
    if not leverancier:
        raise HTTPException(status_code=404, detail="Leverancier niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.inkoop_leveranciers.update_one({"id": leverancier_id}, {"$set": update_data})
        
        # Synchroniseer met crediteuren
        crediteur_update = {}
        if "naam" in update_data or "bedrijfsnaam" in update_data:
            crediteur_update["naam"] = update_data.get("bedrijfsnaam", update_data.get("naam"))
        if "email" in update_data:
            crediteur_update["email"] = update_data["email"]
        if "telefoon" in update_data:
            crediteur_update["telefoon"] = update_data["telefoon"]
        if "adres" in update_data:
            crediteur_update["adres"] = update_data["adres"]
        if "standaard_valuta" in update_data:
            crediteur_update["standaard_valuta"] = update_data["standaard_valuta"]
        if "betalingstermijn" in update_data:
            crediteur_update["betalingstermijn"] = update_data["betalingstermijn"]
        
        if crediteur_update:
            await db.boekhouding_crediteuren.update_one(
                {"leverancier_id": leverancier_id},
                {"$set": crediteur_update}
            )
    
    updated = await db.inkoop_leveranciers.find_one({"id": leverancier_id}, {"_id": 0})
    return updated

@router.delete("/leveranciers/{leverancier_id}")
async def delete_leverancier(leverancier_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een leverancier (soft delete)"""
    user_id = current_user["id"]
    
    # Check voor gekoppelde orders/facturen
    order_count = await db.inkoop_orders.count_documents({"user_id": user_id, "leverancier_id": leverancier_id})
    factuur_count = await db.boekhouding_inkoopfacturen.count_documents({"user_id": user_id, "crediteur_id": leverancier_id})
    
    if order_count > 0 or factuur_count > 0:
        # Soft delete - markeer als inactief
        await db.inkoop_leveranciers.update_one(
            {"id": leverancier_id, "user_id": user_id},
            {"$set": {"is_actief": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Leverancier gedeactiveerd (er zijn gekoppelde orders/facturen)"}
    
    result = await db.inkoop_leveranciers.delete_one({"id": leverancier_id, "user_id": user_id})
    await db.boekhouding_crediteuren.delete_one({"leverancier_id": leverancier_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leverancier niet gevonden")
    
    return {"message": "Leverancier verwijderd"}

@router.get("/leveranciers/{leverancier_id}/historie")
async def get_leverancier_historie(leverancier_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal inkoop historie van een leverancier op"""
    user_id = current_user["id"]
    
    offertes = await db.inkoop_offertes.find(
        {"user_id": user_id, "leverancier_id": leverancier_id},
        {"_id": 0}
    ).sort("offertedatum", -1).limit(20).to_list(20)
    
    orders = await db.inkoop_orders.find(
        {"user_id": user_id, "leverancier_id": leverancier_id},
        {"_id": 0}
    ).sort("orderdatum", -1).limit(20).to_list(20)
    
    facturen = await db.boekhouding_inkoopfacturen.find(
        {"user_id": user_id, "crediteur_id": leverancier_id},
        {"_id": 0}
    ).sort("factuurdatum", -1).limit(20).to_list(20)
    
    return {
        "offertes": offertes,
        "orders": orders,
        "facturen": facturen
    }

# ==================== INKOOPOFFERTES ENDPOINTS ====================

@router.get("/offertes")
async def get_inkoopoffertes(
    status: Optional[str] = None,
    leverancier_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle inkoopoffertes op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if status:
        query["status"] = status
    if leverancier_id:
        query["leverancier_id"] = leverancier_id
    
    offertes = await db.inkoop_offertes.find(query, {"_id": 0}).sort("offertedatum", -1).to_list(500)
    return offertes

@router.get("/offertes/{offerte_id}")
async def get_inkoopofferte(offerte_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke inkoopofferte op"""
    user_id = current_user["id"]
    offerte = await db.inkoop_offertes.find_one({"id": offerte_id, "user_id": user_id}, {"_id": 0})
    if not offerte:
        raise HTTPException(status_code=404, detail="Inkoopofferte niet gevonden")
    return offerte

@router.post("/offertes")
async def create_inkoopofferte(data: InkoopofferteCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe inkoopofferte aan"""
    user_id = current_user["id"]
    
    # Valideer leverancier - eerst in crediteuren zoeken, dan in inkoop_leveranciers
    leverancier = await db.boekhouding_crediteuren.find_one(
        {"id": data.leverancier_id, "user_id": user_id}, {"_id": 0}
    )
    if not leverancier:
        leverancier = await db.inkoop_leveranciers.find_one(
            {"id": data.leverancier_id, "user_id": user_id}, {"_id": 0}
        )
    if not leverancier:
        raise HTTPException(status_code=404, detail="Crediteur/leverancier niet gevonden")
    
    offerte_id = str(uuid.uuid4())
    offertenummer = await genereer_offertenummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken geldig tot datum
    geldig_tot = data.geldig_tot
    if not geldig_tot:
        offertedatum_dt = datetime.strptime(data.offertedatum, "%Y-%m-%d")
        geldig_tot_dt = offertedatum_dt + timedelta(days=30)
        geldig_tot = geldig_tot_dt.strftime("%Y-%m-%d")
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_docs = []
    
    for regel in data.regels:
        regel_subtotaal = regel.aantal * regel.prijs_per_stuk
        korting = regel_subtotaal * (regel.korting_percentage / 100)
        regel_netto = regel_subtotaal - korting
        btw_perc = get_btw_percentage(regel.btw_tarief)
        regel_btw = regel_netto * (btw_perc / 100)
        
        subtotaal += regel_netto
        btw_bedrag += regel_btw
        
        regels_docs.append({
            "artikel_id": regel.artikel_id,
            "omschrijving": regel.omschrijving,
            "aantal": regel.aantal,
            "eenheid": regel.eenheid,
            "prijs_per_stuk": regel.prijs_per_stuk,
            "korting_percentage": regel.korting_percentage,
            "btw_tarief": regel.btw_tarief,
            "btw_percentage": btw_perc,
            "subtotaal": regel_netto,
            "btw_bedrag": regel_btw,
            "totaal": regel_netto + regel_btw
        })
    
    totaal = subtotaal + btw_bedrag
    
    offerte_doc = {
        "id": offerte_id,
        "user_id": user_id,
        "offertenummer": offertenummer,
        "leverancier_id": data.leverancier_id,
        "leverancier_naam": leverancier.get("bedrijfsnaam") or leverancier.get("naam"),
        "offertedatum": data.offertedatum,
        "geldig_tot": geldig_tot,
        "valuta": data.valuta.value,
        "regels": regels_docs,
        "subtotaal": round(subtotaal, 2),
        "btw_bedrag": round(btw_bedrag, 2),
        "totaal": round(totaal, 2),
        "status": "concept",
        "opmerkingen": data.opmerkingen,
        "referentie": data.referentie,
        "levering_adres": data.levering_adres,
        "verwachte_leverdatum": data.verwachte_leverdatum,
        "created_at": now,
        "updated_at": now
    }
    
    await db.inkoop_offertes.insert_one(offerte_doc)
    offerte_doc.pop("_id", None)
    return clean_doc(offerte_doc)

@router.put("/offertes/{offerte_id}")
async def update_inkoopofferte(
    offerte_id: str, 
    data: InkoopofferteUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Update een inkoopofferte"""
    user_id = current_user["id"]
    
    offerte = await db.inkoop_offertes.find_one({"id": offerte_id, "user_id": user_id})
    if not offerte:
        raise HTTPException(status_code=404, detail="Inkoopofferte niet gevonden")
    
    if offerte.get("status") not in ["concept", "verzonden"]:
        raise HTTPException(status_code=400, detail="Alleen concept of verzonden offertes kunnen worden bewerkt")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.inkoop_offertes.update_one({"id": offerte_id}, {"$set": update_data})
    
    updated = await db.inkoop_offertes.find_one({"id": offerte_id}, {"_id": 0})
    return updated

@router.put("/offertes/{offerte_id}/status")
async def update_inkoopofferte_status(
    offerte_id: str, 
    status: OfferteStatus,
    current_user: dict = Depends(get_current_active_user)
):
    """Update de status van een inkoopofferte"""
    user_id = current_user["id"]
    
    result = await db.inkoop_offertes.update_one(
        {"id": offerte_id, "user_id": user_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inkoopofferte niet gevonden")
    
    return {"message": f"Status gewijzigd naar {status.value}"}

@router.post("/offertes/{offerte_id}/naar-order")
async def offerte_naar_order(offerte_id: str, current_user: dict = Depends(get_current_active_user)):
    """Converteer een geaccepteerde offerte naar een inkooporder"""
    user_id = current_user["id"]
    
    offerte = await db.inkoop_offertes.find_one({"id": offerte_id, "user_id": user_id}, {"_id": 0})
    if not offerte:
        raise HTTPException(status_code=404, detail="Inkoopofferte niet gevonden")
    
    if offerte.get("status") != "geaccepteerd":
        raise HTTPException(status_code=400, detail="Alleen geaccepteerde offertes kunnen worden omgezet naar orders")
    
    order_id = str(uuid.uuid4())
    ordernummer = await genereer_ordernummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Kopieer regels met ontvangen_aantal = 0
    order_regels = []
    for regel in offerte.get("regels", []):
        order_regels.append({**regel, "ontvangen_aantal": 0})
    
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "ordernummer": ordernummer,
        "offerte_id": offerte_id,
        "leverancier_id": offerte.get("leverancier_id"),
        "leverancier_naam": offerte.get("leverancier_naam"),
        "orderdatum": datetime.now().strftime("%Y-%m-%d"),
        "verwachte_leverdatum": offerte.get("verwachte_leverdatum"),
        "valuta": offerte.get("valuta"),
        "regels": order_regels,
        "subtotaal": offerte.get("subtotaal"),
        "btw_bedrag": offerte.get("btw_bedrag"),
        "totaal": offerte.get("totaal"),
        "status": "bevestigd",
        "opmerkingen": offerte.get("opmerkingen"),
        "referentie": offerte.get("referentie"),
        "levering_adres": offerte.get("levering_adres"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.inkoop_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    
    # Update offerte status
    await db.inkoop_offertes.update_one(
        {"id": offerte_id},
        {"$set": {"status": "omgezet_naar_order", "order_id": order_id, "updated_at": now}}
    )
    
    return clean_doc(order_doc)

@router.delete("/offertes/{offerte_id}")
async def delete_inkoopofferte(offerte_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een inkoopofferte"""
    user_id = current_user["id"]
    
    offerte = await db.inkoop_offertes.find_one({"id": offerte_id, "user_id": user_id})
    if not offerte:
        raise HTTPException(status_code=404, detail="Inkoopofferte niet gevonden")
    
    if offerte.get("status") not in ["concept", "verlopen", "afgewezen"]:
        raise HTTPException(status_code=400, detail="Alleen concept, verlopen of afgewezen offertes kunnen worden verwijderd")
    
    await db.inkoop_offertes.delete_one({"id": offerte_id})
    return {"message": "Inkoopofferte verwijderd"}

# ==================== INKOOPORDERS ENDPOINTS ====================

@router.get("/orders")
async def get_inkooporders(
    status: Optional[str] = None,
    leverancier_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle inkooporders op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if status:
        query["status"] = status
    if leverancier_id:
        query["leverancier_id"] = leverancier_id
    
    orders = await db.inkoop_orders.find(query, {"_id": 0}).sort("orderdatum", -1).to_list(500)
    return orders

@router.get("/orders/{order_id}")
async def get_inkooporder(order_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke inkooporder op"""
    user_id = current_user["id"]
    order = await db.inkoop_orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Inkooporder niet gevonden")
    return order

@router.post("/orders")
async def create_inkooporder(data: InkooporderCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe inkooporder aan"""
    user_id = current_user["id"]
    
    # Valideer leverancier - eerst in crediteuren zoeken, dan in inkoop_leveranciers
    leverancier = await db.boekhouding_crediteuren.find_one(
        {"id": data.leverancier_id, "user_id": user_id}, {"_id": 0}
    )
    if not leverancier:
        leverancier = await db.inkoop_leveranciers.find_one(
            {"id": data.leverancier_id, "user_id": user_id}, {"_id": 0}
        )
    if not leverancier:
        raise HTTPException(status_code=404, detail="Crediteur/leverancier niet gevonden")
    
    order_id = str(uuid.uuid4())
    ordernummer = await genereer_ordernummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_docs = []
    
    for regel in data.regels:
        regel_subtotaal = regel.aantal * regel.prijs_per_stuk
        korting = regel_subtotaal * (regel.korting_percentage / 100)
        regel_netto = regel_subtotaal - korting
        btw_perc = get_btw_percentage(regel.btw_tarief)
        regel_btw = regel_netto * (btw_perc / 100)
        
        subtotaal += regel_netto
        btw_bedrag += regel_btw
        
        regels_docs.append({
            "artikel_id": regel.artikel_id,
            "omschrijving": regel.omschrijving,
            "aantal": regel.aantal,
            "eenheid": regel.eenheid,
            "prijs_per_stuk": regel.prijs_per_stuk,
            "korting_percentage": regel.korting_percentage,
            "btw_tarief": regel.btw_tarief,
            "btw_percentage": btw_perc,
            "subtotaal": regel_netto,
            "btw_bedrag": regel_btw,
            "totaal": regel_netto + regel_btw,
            "ontvangen_aantal": 0
        })
    
    totaal = subtotaal + btw_bedrag
    
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "ordernummer": ordernummer,
        "offerte_id": data.offerte_id,
        "leverancier_id": data.leverancier_id,
        "leverancier_naam": leverancier.get("bedrijfsnaam") or leverancier.get("naam"),
        "orderdatum": data.orderdatum,
        "verwachte_leverdatum": data.verwachte_leverdatum,
        "valuta": data.valuta.value,
        "regels": regels_docs,
        "subtotaal": round(subtotaal, 2),
        "btw_bedrag": round(btw_bedrag, 2),
        "totaal": round(totaal, 2),
        "status": "concept",
        "opmerkingen": data.opmerkingen,
        "referentie": data.referentie,
        "levering_adres": data.levering_adres,
        "created_at": now,
        "updated_at": now
    }
    
    await db.inkoop_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    return clean_doc(order_doc)

@router.put("/orders/{order_id}/status")
async def update_inkooporder_status(
    order_id: str, 
    status: OrderStatus,
    current_user: dict = Depends(get_current_active_user)
):
    """Update de status van een inkooporder"""
    user_id = current_user["id"]
    
    result = await db.inkoop_orders.update_one(
        {"id": order_id, "user_id": user_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inkooporder niet gevonden")
    
    return {"message": f"Status gewijzigd naar {status.value}"}

@router.post("/orders/{order_id}/naar-factuur")
async def order_naar_factuur(order_id: str, current_user: dict = Depends(get_current_active_user)):
    """Maak een inkoopfactuur van een volledig ontvangen order"""
    user_id = current_user["id"]
    
    order = await db.inkoop_orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Inkooporder niet gevonden")
    
    if order.get("status") not in ["gedeeltelijk_ontvangen", "volledig_ontvangen"]:
        raise HTTPException(status_code=400, detail="Order moet (gedeeltelijk) ontvangen zijn voor facturatie")
    
    # Check of er al een factuur is
    existing_factuur = await db.boekhouding_inkoopfacturen.find_one({
        "user_id": user_id,
        "inkooporder_id": order_id
    })
    if existing_factuur:
        raise HTTPException(status_code=400, detail="Er bestaat al een factuur voor deze order")
    
    factuur_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Genereer factuurnummer
    year = datetime.now().year
    count = await db.boekhouding_inkoopfacturen.count_documents({
        "user_id": user_id,
        "factuurnummer": {"$regex": f"^IF{year}-"}
    })
    factuurnummer = f"IF{year}-{str(count + 1).zfill(5)}"
    
    # Bepaal vervaldatum
    leverancier = await db.inkoop_leveranciers.find_one({"id": order.get("leverancier_id")})
    betalingstermijn = leverancier.get("betalingstermijn", 30) if leverancier else 30
    vervaldatum = (datetime.now() + timedelta(days=betalingstermijn)).strftime("%Y-%m-%d")
    
    factuur_doc = {
        "id": factuur_id,
        "user_id": user_id,
        "factuurnummer": factuurnummer,
        "inkooporder_id": order_id,
        "crediteur_id": order.get("leverancier_id"),
        "crediteur_naam": order.get("leverancier_naam"),
        "factuurdatum": datetime.now().strftime("%Y-%m-%d"),
        "vervaldatum": vervaldatum,
        "valuta": order.get("valuta"),
        "regels": order.get("regels", []),
        "subtotaal": order.get("subtotaal"),
        "btw_bedrag": order.get("btw_bedrag"),
        "totaal": order.get("totaal"),
        "betaald_bedrag": 0,
        "status": "ontvangen",
        "opmerkingen": order.get("opmerkingen"),
        "created_at": now
    }
    
    await db.boekhouding_inkoopfacturen.insert_one(factuur_doc)
    factuur_doc.pop("_id", None)
    
    # Update order met factuur link
    await db.inkoop_orders.update_one(
        {"id": order_id},
        {"$set": {"factuur_id": factuur_id, "updated_at": now}}
    )
    
    return clean_doc(factuur_doc)

@router.delete("/orders/{order_id}")
async def delete_inkooporder(order_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een inkooporder"""
    user_id = current_user["id"]
    
    order = await db.inkoop_orders.find_one({"id": order_id, "user_id": user_id})
    if not order:
        raise HTTPException(status_code=404, detail="Inkooporder niet gevonden")
    
    if order.get("status") not in ["concept", "geannuleerd"]:
        raise HTTPException(status_code=400, detail="Alleen concept of geannuleerde orders kunnen worden verwijderd")
    
    await db.inkoop_orders.delete_one({"id": order_id})
    return {"message": "Inkooporder verwijderd"}

# ==================== GOEDERENONTVANGST ENDPOINTS ====================

@router.get("/ontvangsten")
async def get_goederenontvangsten(
    order_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle goederenontvangsten op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if order_id:
        query["inkooporder_id"] = order_id
    
    ontvangsten = await db.inkoop_ontvangsten.find(query, {"_id": 0}).sort("ontvangstdatum", -1).to_list(500)
    return ontvangsten

@router.get("/ontvangsten/{ontvangst_id}")
async def get_goederenontvangst(ontvangst_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke goederenontvangst op"""
    user_id = current_user["id"]
    ontvangst = await db.inkoop_ontvangsten.find_one({"id": ontvangst_id, "user_id": user_id}, {"_id": 0})
    if not ontvangst:
        raise HTTPException(status_code=404, detail="Goederenontvangst niet gevonden")
    return ontvangst

@router.post("/ontvangsten")
async def create_goederenontvangst(data: GoederenontvangstCreate, current_user: dict = Depends(get_current_active_user)):
    """Registreer een goederenontvangst"""
    user_id = current_user["id"]
    
    # Valideer inkooporder
    order = await db.inkoop_orders.find_one({"id": data.inkooporder_id, "user_id": user_id})
    if not order:
        raise HTTPException(status_code=404, detail="Inkooporder niet gevonden")
    
    if order.get("status") not in ["bevestigd", "gedeeltelijk_ontvangen"]:
        raise HTTPException(status_code=400, detail="Order moet bevestigd of gedeeltelijk ontvangen zijn")
    
    ontvangst_id = str(uuid.uuid4())
    ontvangstnummer = await genereer_ontvangstnummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    regels_docs = []
    for regel in data.regels:
        regels_docs.append({
            "order_regel_index": regel.order_regel_index,
            "artikel_id": regel.artikel_id,
            "omschrijving": regel.omschrijving,
            "verwacht_aantal": regel.verwacht_aantal,
            "ontvangen_aantal": regel.ontvangen_aantal,
            "eenheid": regel.eenheid,
            "serienummers": regel.serienummers or [],
            "batchnummer": regel.batchnummer,
            "locatie_id": regel.locatie_id,
            "opmerking": regel.opmerking,
            "status": regel.status
        })
    
    ontvangst_doc = {
        "id": ontvangst_id,
        "user_id": user_id,
        "ontvangstnummer": ontvangstnummer,
        "inkooporder_id": data.inkooporder_id,
        "ordernummer": order.get("ordernummer"),
        "leverancier_id": order.get("leverancier_id"),
        "leverancier_naam": order.get("leverancier_naam"),
        "ontvangstdatum": data.ontvangstdatum,
        "regels": regels_docs,
        "pakbon_nummer": data.pakbon_nummer,
        "ontvangen_door": data.ontvangen_door,
        "opmerkingen": data.opmerkingen,
        "status": "ontvangen",
        "created_at": now
    }
    
    await db.inkoop_ontvangsten.insert_one(ontvangst_doc)
    ontvangst_doc.pop("_id", None)
    
    # Update order regels met ontvangen aantallen
    order_regels = order.get("regels", [])
    volledig_ontvangen = True
    
    for ontvangst_regel in data.regels:
        idx = ontvangst_regel.order_regel_index
        if 0 <= idx < len(order_regels):
            huidige_ontvangen = order_regels[idx].get("ontvangen_aantal", 0)
            nieuwe_ontvangen = huidige_ontvangen + ontvangst_regel.ontvangen_aantal
            order_regels[idx]["ontvangen_aantal"] = nieuwe_ontvangen
            
            if nieuwe_ontvangen < order_regels[idx].get("aantal", 0):
                volledig_ontvangen = False
    
    # Check of alle regels volledig ontvangen zijn
    for regel in order_regels:
        if regel.get("ontvangen_aantal", 0) < regel.get("aantal", 0):
            volledig_ontvangen = False
            break
    
    nieuwe_status = "volledig_ontvangen" if volledig_ontvangen else "gedeeltelijk_ontvangen"
    
    await db.inkoop_orders.update_one(
        {"id": data.inkooporder_id},
        {"$set": {"regels": order_regels, "status": nieuwe_status, "updated_at": now}}
    )
    
    # Update voorraad als artikelen zijn gekoppeld
    for regel in data.regels:
        if regel.artikel_id and regel.ontvangen_aantal > 0:
            # Maak voorraadmutatie aan
            mutatie_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "artikel_id": regel.artikel_id,
                "type": "inkoop",
                "aantal": regel.ontvangen_aantal,
                "referentie_type": "goederenontvangst",
                "referentie_id": ontvangst_id,
                "locatie_id": regel.locatie_id,
                "serienummers": regel.serienummers,
                "batchnummer": regel.batchnummer,
                "datum": data.ontvangstdatum,
                "omschrijving": f"Ontvangst {ontvangstnummer}",
                "created_at": now
            }
            await db.voorraad_mutaties.insert_one(mutatie_doc)
            mutatie_doc.pop("_id", None)
            
            # Update voorraad niveau
            await db.voorraad_artikelen.update_one(
                {"id": regel.artikel_id, "user_id": user_id},
                {"$inc": {"voorraad_aantal": regel.ontvangen_aantal}}
            )
    
    return clean_doc(ontvangst_doc)

@router.put("/ontvangsten/{ontvangst_id}/status")
async def update_goederenontvangst_status(
    ontvangst_id: str,
    status: OntvangstStatus,
    current_user: dict = Depends(get_current_active_user)
):
    """Update de status van een goederenontvangst"""
    user_id = current_user["id"]
    
    result = await db.inkoop_ontvangsten.update_one(
        {"id": ontvangst_id, "user_id": user_id},
        {"$set": {"status": status.value}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goederenontvangst niet gevonden")
    
    return {"message": f"Status gewijzigd naar {status.value}"}

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_inkoop_dashboard(current_user: dict = Depends(get_current_active_user)):
    """Haal inkoop dashboard data op"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    # Aantal leveranciers
    leveranciers_count = await db.inkoop_leveranciers.count_documents({"user_id": user_id, "is_actief": True})
    
    # Openstaande offertes
    open_offertes = await db.inkoop_offertes.count_documents({
        "user_id": user_id,
        "status": {"$in": ["concept", "verzonden"]}
    })
    
    # Openstaande orders
    open_orders = await db.inkoop_orders.count_documents({
        "user_id": user_id,
        "status": {"$in": ["bevestigd", "gedeeltelijk_ontvangen"]}
    })
    
    # Orders te verwachten deze week
    week_end = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    orders_deze_week = await db.inkoop_orders.count_documents({
        "user_id": user_id,
        "status": {"$in": ["bevestigd", "gedeeltelijk_ontvangen"]},
        "verwachte_leverdatum": {"$gte": today, "$lte": week_end}
    })
    
    # Totaal inkoop deze maand
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
    inkoop_maand = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {
            "user_id": user_id,
            "factuurdatum": {"$gte": start_of_month}
        }},
        {"$group": {
            "_id": "$valuta",
            "totaal": {"$sum": "$totaal"}
        }}
    ]).to_list(10)
    
    # Openstaande facturen
    openstaande_facturen = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {
            "user_id": user_id,
            "status": {"$in": ["ontvangen", "gedeeltelijk_betaald", "vervallen"]}
        }},
        {"$group": {
            "_id": "$valuta",
            "totaal": {"$sum": {"$subtract": ["$totaal", "$betaald_bedrag"]}}
        }}
    ]).to_list(10)
    
    # Recente ontvangsten
    recente_ontvangsten = await db.inkoop_ontvangsten.find(
        {"user_id": user_id}
    ).sort("ontvangstdatum", -1).limit(5).to_list(5)
    
    return {
        "leveranciers_count": leveranciers_count,
        "open_offertes": open_offertes,
        "open_orders": open_orders,
        "orders_deze_week": orders_deze_week,
        "inkoop_maand": {item["_id"]: item["totaal"] for item in inkoop_maand},
        "openstaande_facturen": {item["_id"]: item["totaal"] for item in openstaande_facturen},
        "recente_ontvangsten": [{**o, "_id": None} for o in recente_ontvangsten]
    }
