"""
Verkoop Module - Verkoopoffertes, Verkooporders, Prijslijsten, Klantbeheer
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from .deps import db, get_current_active_user, clean_doc

router = APIRouter(prefix="/verkoop", tags=["Verkoop"])

# ==================== ENUMS ====================

class Currency(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class OfferteStatus(str, Enum):
    CONCEPT = "concept"
    VERZONDEN = "verzonden"
    BEKEKEN = "bekeken"
    GEACCEPTEERD = "geaccepteerd"
    AFGEWEZEN = "afgewezen"
    VERLOPEN = "verlopen"

class OrderStatus(str, Enum):
    CONCEPT = "concept"
    BEVESTIGD = "bevestigd"
    IN_BEHANDELING = "in_behandeling"
    GELEVERD = "geleverd"
    GEFACTUREERD = "gefactureerd"
    GEANNULEERD = "geannuleerd"

# ==================== MODELS - KLANTEN ====================

class KlantCreate(BaseModel):
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
    standaard_valuta: Currency = Currency.SRD
    betalingstermijn: int = 30
    contactpersoon: Optional[str] = None
    notities: Optional[str] = None
    categorie: Optional[str] = None
    prijslijst_id: Optional[str] = None
    korting_percentage: float = 0
    kredietlimiet: Optional[float] = None
    is_actief: bool = True

class KlantUpdate(BaseModel):
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
    standaard_valuta: Optional[Currency] = None
    betalingstermijn: Optional[int] = None
    contactpersoon: Optional[str] = None
    notities: Optional[str] = None
    categorie: Optional[str] = None
    prijslijst_id: Optional[str] = None
    korting_percentage: Optional[float] = None
    kredietlimiet: Optional[float] = None
    is_actief: Optional[bool] = None

# ==================== MODELS - VERKOOPOFFERTES ====================

class VerkoopofferteRegelCreate(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float = 1
    eenheid: str = "stuk"
    prijs_per_stuk: float
    korting_percentage: float = 0
    btw_tarief: str = "25"

class VerkoopofferteCreate(BaseModel):
    klant_id: str
    offertedatum: str
    geldig_tot: Optional[str] = None
    valuta: Currency = Currency.SRD
    regels: List[VerkoopofferteRegelCreate]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None
    interne_notities: Optional[str] = None
    levering_adres: Optional[str] = None
    verwachte_leverdatum: Optional[str] = None

# ==================== MODELS - VERKOOPORDERS ====================

class VerkooporderRegelCreate(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float = 1
    eenheid: str = "stuk"
    prijs_per_stuk: float
    korting_percentage: float = 0
    btw_tarief: str = "25"
    geleverd_aantal: float = 0

class VerkooporderCreate(BaseModel):
    klant_id: str
    offerte_id: Optional[str] = None
    orderdatum: str
    verwachte_leverdatum: Optional[str] = None
    valuta: Currency = Currency.SRD
    regels: List[VerkooporderRegelCreate]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None
    levering_adres: Optional[str] = None

# ==================== MODELS - PRIJSLIJSTEN ====================

class PrijslijstCreate(BaseModel):
    naam: str
    beschrijving: Optional[str] = None
    valuta: Currency = Currency.SRD
    is_standaard: bool = False
    geldig_van: Optional[str] = None
    geldig_tot: Optional[str] = None
    is_actief: bool = True

class PrijslijstUpdate(BaseModel):
    naam: Optional[str] = None
    beschrijving: Optional[str] = None
    geldig_van: Optional[str] = None
    geldig_tot: Optional[str] = None
    is_actief: Optional[bool] = None

class PrijslijstItemCreate(BaseModel):
    artikel_id: str
    prijs: float
    min_aantal: float = 1
    korting_percentage: float = 0

# ==================== MODELS - KORTINGSREGELS ====================

class KortingsregelCreate(BaseModel):
    naam: str
    type: str  # percentage, vast_bedrag, staffel
    waarde: float
    min_bedrag: Optional[float] = None
    min_aantal: Optional[float] = None
    artikel_id: Optional[str] = None
    categorie: Optional[str] = None
    klant_categorie: Optional[str] = None
    geldig_van: Optional[str] = None
    geldig_tot: Optional[str] = None
    is_actief: bool = True

# ==================== HELPER FUNCTIONS ====================

def get_btw_percentage(tarief: str) -> float:
    mapping = {"0": 0.0, "10": 10.0, "25": 25.0}
    return mapping.get(tarief, 25.0)

async def genereer_offertenummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.verkoop_offertes.count_documents({
        "user_id": user_id,
        "offertenummer": {"$regex": f"^OF{year}-"}
    })
    return f"OF{year}-{str(count + 1).zfill(5)}"

async def genereer_ordernummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.verkoop_orders.count_documents({
        "user_id": user_id,
        "ordernummer": {"$regex": f"^SO{year}-"}
    })
    return f"SO{year}-{str(count + 1).zfill(5)}"

async def get_klant_prijs(user_id: str, klant_id: str, artikel_id: str, standaard_prijs: float) -> float:
    """Bereken de prijs voor een klant, rekening houdend met prijslijsten en kortingen"""
    klant = await db.verkoop_klanten.find_one({"id": klant_id, "user_id": user_id})
    if not klant:
        return standaard_prijs
    
    # Check prijslijst van klant
    if klant.get("prijslijst_id"):
        prijslijst_item = await db.verkoop_prijslijst_items.find_one({
            "prijslijst_id": klant["prijslijst_id"],
            "artikel_id": artikel_id
        })
        if prijslijst_item:
            return prijslijst_item.get("prijs", standaard_prijs)
    
    # Pas klantkorting toe
    klant_korting = klant.get("korting_percentage", 0)
    if klant_korting > 0:
        return standaard_prijs * (1 - klant_korting / 100)
    
    return standaard_prijs

# ==================== KLANTEN ENDPOINTS ====================

@router.get("/klanten")
async def get_klanten(
    actief: Optional[bool] = None,
    categorie: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle klanten op"""
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
    
    klanten = await db.verkoop_klanten.find(query, {"_id": 0}).sort("naam", 1).to_list(500)
    
    # Bereken openstaande bedragen per klant
    for klant in klanten:
        openstaand = await db.boekhouding_verkoopfacturen.aggregate([
            {"$match": {
                "user_id": user_id,
                "debiteur_id": klant["id"],
                "status": {"$in": ["verstuurd", "gedeeltelijk_betaald", "vervallen"]}
            }},
            {"$group": {
                "_id": "$valuta",
                "totaal": {"$sum": {"$subtract": ["$totaal", "$betaald_bedrag"]}}
            }}
        ]).to_list(10)
        
        klant["openstaand_per_valuta"] = {item["_id"]: item["totaal"] for item in openstaand}
        default_valuta = klant.get("standaard_valuta", "SRD")
        klant["openstaand_bedrag"] = klant["openstaand_per_valuta"].get(default_valuta, 0)
    
    return klanten

@router.get("/klanten/{klant_id}")
async def get_klant(klant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke klant op"""
    user_id = current_user["id"]
    klant = await db.verkoop_klanten.find_one({"id": klant_id, "user_id": user_id}, {"_id": 0})
    if not klant:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    return klant

@router.post("/klanten")
async def create_klant(data: KlantCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe klant aan"""
    user_id = current_user["id"]
    klant_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Genereer klantnummer
    count = await db.verkoop_klanten.count_documents({"user_id": user_id})
    klantnummer = f"KL{str(count + 1).zfill(5)}"
    
    klant_doc = {
        "id": klant_id,
        "user_id": user_id,
        "klantnummer": klantnummer,
        **data.model_dump(),
        "standaard_valuta": data.standaard_valuta.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.verkoop_klanten.insert_one(klant_doc)
    klant_doc.pop("_id", None)
    
    # Synchroniseer met debiteuren in boekhouding
    debiteur_doc = {
        "id": klant_id,
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
        "klant_id": klant_id  # Link naar klant
    }
    await db.boekhouding_debiteuren.insert_one(debiteur_doc)
    debiteur_doc.pop("_id", None)
    
    return clean_doc(klant_doc)

@router.put("/klanten/{klant_id}")
async def update_klant(klant_id: str, data: KlantUpdate, current_user: dict = Depends(get_current_active_user)):
    """Update een klant"""
    user_id = current_user["id"]
    
    klant = await db.verkoop_klanten.find_one({"id": klant_id, "user_id": user_id})
    if not klant:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.verkoop_klanten.update_one({"id": klant_id}, {"$set": update_data})
        
        # Synchroniseer met debiteuren
        debiteur_update = {}
        if "naam" in update_data or "bedrijfsnaam" in update_data:
            debiteur_update["naam"] = update_data.get("bedrijfsnaam", update_data.get("naam"))
        if "email" in update_data:
            debiteur_update["email"] = update_data["email"]
        if "telefoon" in update_data:
            debiteur_update["telefoon"] = update_data["telefoon"]
        if "adres" in update_data:
            debiteur_update["adres"] = update_data["adres"]
        if "standaard_valuta" in update_data:
            debiteur_update["standaard_valuta"] = update_data["standaard_valuta"]
        if "betalingstermijn" in update_data:
            debiteur_update["betalingstermijn"] = update_data["betalingstermijn"]
        
        if debiteur_update:
            await db.boekhouding_debiteuren.update_one(
                {"klant_id": klant_id},
                {"$set": debiteur_update}
            )
    
    updated = await db.verkoop_klanten.find_one({"id": klant_id}, {"_id": 0})
    return updated

@router.delete("/klanten/{klant_id}")
async def delete_klant(klant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een klant (soft delete)"""
    user_id = current_user["id"]
    
    # Check voor gekoppelde orders/facturen
    order_count = await db.verkoop_orders.count_documents({"user_id": user_id, "klant_id": klant_id})
    factuur_count = await db.boekhouding_verkoopfacturen.count_documents({"user_id": user_id, "debiteur_id": klant_id})
    
    if order_count > 0 or factuur_count > 0:
        await db.verkoop_klanten.update_one(
            {"id": klant_id, "user_id": user_id},
            {"$set": {"is_actief": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Klant gedeactiveerd (er zijn gekoppelde orders/facturen)"}
    
    result = await db.verkoop_klanten.delete_one({"id": klant_id, "user_id": user_id})
    await db.boekhouding_debiteuren.delete_one({"klant_id": klant_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Klant verwijderd"}

@router.get("/klanten/{klant_id}/historie")
async def get_klant_historie(klant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal verkoop historie van een klant op"""
    user_id = current_user["id"]
    
    offertes = await db.verkoop_offertes.find(
        {"user_id": user_id, "klant_id": klant_id},
        {"_id": 0}
    ).sort("offertedatum", -1).limit(20).to_list(20)
    
    orders = await db.verkoop_orders.find(
        {"user_id": user_id, "klant_id": klant_id},
        {"_id": 0}
    ).sort("orderdatum", -1).limit(20).to_list(20)
    
    facturen = await db.boekhouding_verkoopfacturen.find(
        {"user_id": user_id, "debiteur_id": klant_id},
        {"_id": 0}
    ).sort("factuurdatum", -1).limit(20).to_list(20)
    
    return {
        "offertes": offertes,
        "orders": orders,
        "facturen": facturen
    }

# ==================== VERKOOPOFFERTES ENDPOINTS ====================

@router.get("/offertes")
async def get_verkoopoffertes(
    status: Optional[str] = None,
    klant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle verkoopoffertes op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if status:
        query["status"] = status
    if klant_id:
        query["klant_id"] = klant_id
    
    offertes = await db.verkoop_offertes.find(query, {"_id": 0}).sort("offertedatum", -1).to_list(500)
    return offertes

@router.get("/offertes/{offerte_id}")
async def get_verkoopofferte(offerte_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke verkoopofferte op"""
    user_id = current_user["id"]
    offerte = await db.verkoop_offertes.find_one({"id": offerte_id, "user_id": user_id}, {"_id": 0})
    if not offerte:
        raise HTTPException(status_code=404, detail="Verkoopofferte niet gevonden")
    return offerte

@router.post("/offertes")
async def create_verkoopofferte(data: VerkoopofferteCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe verkoopofferte aan"""
    user_id = current_user["id"]
    
    # Valideer klant
    klant = await db.verkoop_klanten.find_one({"id": data.klant_id, "user_id": user_id}, {"_id": 0})
    if not klant:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    offerte_id = str(uuid.uuid4())
    offertenummer = await genereer_offertenummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken geldig tot datum
    geldig_tot = data.geldig_tot
    if not geldig_tot:
        offertedatum_dt = datetime.strptime(data.offertedatum, "%Y-%m-%d")
        geldig_tot_dt = offertedatum_dt + timedelta(days=30)
        geldig_tot = geldig_tot_dt.strftime("%Y-%m-%d")
    
    # Bereken totalen met klantprijzen
    subtotaal = 0
    btw_bedrag = 0
    regels_docs = []
    
    for regel in data.regels:
        # Haal klantprijs op als artikel gekoppeld is
        prijs = regel.prijs_per_stuk
        if regel.artikel_id:
            prijs = await get_klant_prijs(user_id, data.klant_id, regel.artikel_id, regel.prijs_per_stuk)
        
        regel_subtotaal = regel.aantal * prijs
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
            "prijs_per_stuk": prijs,
            "korting_percentage": regel.korting_percentage,
            "btw_tarief": regel.btw_tarief,
            "btw_percentage": btw_perc,
            "subtotaal": regel_netto,
            "btw_bedrag": regel_btw,
            "totaal": regel_netto + regel_btw
        })
    
    # Pas klantkorting toe op totaal
    klant_korting = klant.get("korting_percentage", 0)
    if klant_korting > 0:
        korting_bedrag = subtotaal * (klant_korting / 100)
        subtotaal -= korting_bedrag
        btw_bedrag = subtotaal * 0.25  # Recalculate BTW
    
    totaal = subtotaal + btw_bedrag
    
    offerte_doc = {
        "id": offerte_id,
        "user_id": user_id,
        "offertenummer": offertenummer,
        "klant_id": data.klant_id,
        "klant_naam": klant.get("bedrijfsnaam") or klant.get("naam"),
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
        "interne_notities": data.interne_notities,
        "levering_adres": data.levering_adres or klant.get("adres"),
        "verwachte_leverdatum": data.verwachte_leverdatum,
        "created_at": now,
        "updated_at": now
    }
    
    await db.verkoop_offertes.insert_one(offerte_doc)
    offerte_doc.pop("_id", None)
    return clean_doc(offerte_doc)

@router.put("/offertes/{offerte_id}/status")
async def update_verkoopofferte_status(
    offerte_id: str, 
    status: OfferteStatus,
    current_user: dict = Depends(get_current_active_user)
):
    """Update de status van een verkoopofferte"""
    user_id = current_user["id"]
    
    result = await db.verkoop_offertes.update_one(
        {"id": offerte_id, "user_id": user_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Verkoopofferte niet gevonden")
    
    return {"message": f"Status gewijzigd naar {status.value}"}

@router.post("/offertes/{offerte_id}/naar-order")
async def offerte_naar_order(offerte_id: str, current_user: dict = Depends(get_current_active_user)):
    """Converteer een geaccepteerde offerte naar een verkooporder"""
    user_id = current_user["id"]
    
    offerte = await db.verkoop_offertes.find_one({"id": offerte_id, "user_id": user_id}, {"_id": 0})
    if not offerte:
        raise HTTPException(status_code=404, detail="Verkoopofferte niet gevonden")
    
    if offerte.get("status") != "geaccepteerd":
        raise HTTPException(status_code=400, detail="Alleen geaccepteerde offertes kunnen worden omgezet naar orders")
    
    order_id = str(uuid.uuid4())
    ordernummer = await genereer_ordernummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Kopieer regels met geleverd_aantal = 0
    order_regels = []
    for regel in offerte.get("regels", []):
        order_regels.append({**regel, "geleverd_aantal": 0})
    
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "ordernummer": ordernummer,
        "offerte_id": offerte_id,
        "klant_id": offerte.get("klant_id"),
        "klant_naam": offerte.get("klant_naam"),
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
    
    await db.verkoop_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    
    # Update offerte status
    await db.verkoop_offertes.update_one(
        {"id": offerte_id},
        {"$set": {"status": "omgezet_naar_order", "order_id": order_id, "updated_at": now}}
    )
    
    return clean_doc(order_doc)

@router.delete("/offertes/{offerte_id}")
async def delete_verkoopofferte(offerte_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een verkoopofferte"""
    user_id = current_user["id"]
    
    offerte = await db.verkoop_offertes.find_one({"id": offerte_id, "user_id": user_id})
    if not offerte:
        raise HTTPException(status_code=404, detail="Verkoopofferte niet gevonden")
    
    if offerte.get("status") not in ["concept", "verlopen", "afgewezen"]:
        raise HTTPException(status_code=400, detail="Alleen concept, verlopen of afgewezen offertes kunnen worden verwijderd")
    
    await db.verkoop_offertes.delete_one({"id": offerte_id})
    return {"message": "Verkoopofferte verwijderd"}

# ==================== VERKOOPORDERS ENDPOINTS ====================

@router.get("/orders")
async def get_verkooporders(
    status: Optional[str] = None,
    klant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle verkooporders op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if status:
        query["status"] = status
    if klant_id:
        query["klant_id"] = klant_id
    
    orders = await db.verkoop_orders.find(query, {"_id": 0}).sort("orderdatum", -1).to_list(500)
    return orders

@router.get("/orders/{order_id}")
async def get_verkooporder(order_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke verkooporder op"""
    user_id = current_user["id"]
    order = await db.verkoop_orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Verkooporder niet gevonden")
    return order

@router.post("/orders")
async def create_verkooporder(data: VerkooporderCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe verkooporder aan"""
    user_id = current_user["id"]
    
    # Valideer klant
    klant = await db.verkoop_klanten.find_one({"id": data.klant_id, "user_id": user_id}, {"_id": 0})
    if not klant:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    order_id = str(uuid.uuid4())
    ordernummer = await genereer_ordernummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_docs = []
    
    for regel in data.regels:
        prijs = regel.prijs_per_stuk
        if regel.artikel_id:
            prijs = await get_klant_prijs(user_id, data.klant_id, regel.artikel_id, regel.prijs_per_stuk)
        
        regel_subtotaal = regel.aantal * prijs
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
            "prijs_per_stuk": prijs,
            "korting_percentage": regel.korting_percentage,
            "btw_tarief": regel.btw_tarief,
            "btw_percentage": btw_perc,
            "subtotaal": regel_netto,
            "btw_bedrag": regel_btw,
            "totaal": regel_netto + regel_btw,
            "geleverd_aantal": 0
        })
    
    totaal = subtotaal + btw_bedrag
    
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "ordernummer": ordernummer,
        "offerte_id": data.offerte_id,
        "klant_id": data.klant_id,
        "klant_naam": klant.get("bedrijfsnaam") or klant.get("naam"),
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
        "levering_adres": data.levering_adres or klant.get("adres"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.verkoop_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    return clean_doc(order_doc)

@router.put("/orders/{order_id}/status")
async def update_verkooporder_status(
    order_id: str, 
    status: OrderStatus,
    current_user: dict = Depends(get_current_active_user)
):
    """Update de status van een verkooporder"""
    user_id = current_user["id"]
    
    result = await db.verkoop_orders.update_one(
        {"id": order_id, "user_id": user_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Verkooporder niet gevonden")
    
    return {"message": f"Status gewijzigd naar {status.value}"}

@router.post("/orders/{order_id}/naar-factuur")
async def order_naar_factuur(order_id: str, current_user: dict = Depends(get_current_active_user)):
    """Maak een verkoopfactuur van een geleverde order"""
    user_id = current_user["id"]
    
    order = await db.verkoop_orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Verkooporder niet gevonden")
    
    if order.get("status") not in ["bevestigd", "in_behandeling", "geleverd"]:
        raise HTTPException(status_code=400, detail="Order moet bevestigd, in behandeling of geleverd zijn")
    
    # Check of er al een factuur is
    existing_factuur = await db.boekhouding_verkoopfacturen.find_one({
        "user_id": user_id,
        "verkooporder_id": order_id
    })
    if existing_factuur:
        raise HTTPException(status_code=400, detail="Er bestaat al een factuur voor deze order")
    
    factuur_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Genereer factuurnummer
    year = datetime.now().year
    count = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "factuurnummer": {"$regex": f"^VF{year}-"}
    })
    factuurnummer = f"VF{year}-{str(count + 1).zfill(5)}"
    
    # Bepaal vervaldatum
    klant = await db.verkoop_klanten.find_one({"id": order.get("klant_id")})
    betalingstermijn = klant.get("betalingstermijn", 30) if klant else 30
    vervaldatum = (datetime.now() + timedelta(days=betalingstermijn)).strftime("%Y-%m-%d")
    
    factuur_doc = {
        "id": factuur_id,
        "user_id": user_id,
        "factuurnummer": factuurnummer,
        "verkooporder_id": order_id,
        "debiteur_id": order.get("klant_id"),
        "debiteur_naam": order.get("klant_naam"),
        "factuurdatum": datetime.now().strftime("%Y-%m-%d"),
        "vervaldatum": vervaldatum,
        "valuta": order.get("valuta"),
        "regels": order.get("regels", []),
        "subtotaal": order.get("subtotaal"),
        "btw_bedrag": order.get("btw_bedrag"),
        "totaal": order.get("totaal"),
        "betaald_bedrag": 0,
        "status": "concept",
        "opmerkingen": order.get("opmerkingen"),
        "referentie": order.get("referentie"),
        "created_at": now
    }
    
    await db.boekhouding_verkoopfacturen.insert_one(factuur_doc)
    factuur_doc.pop("_id", None)
    
    # Update order met factuur link en status
    await db.verkoop_orders.update_one(
        {"id": order_id},
        {"$set": {"factuur_id": factuur_id, "status": "gefactureerd", "updated_at": now}}
    )
    
    return clean_doc(factuur_doc)

@router.delete("/orders/{order_id}")
async def delete_verkooporder(order_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een verkooporder"""
    user_id = current_user["id"]
    
    order = await db.verkoop_orders.find_one({"id": order_id, "user_id": user_id})
    if not order:
        raise HTTPException(status_code=404, detail="Verkooporder niet gevonden")
    
    if order.get("status") not in ["concept", "geannuleerd"]:
        raise HTTPException(status_code=400, detail="Alleen concept of geannuleerde orders kunnen worden verwijderd")
    
    await db.verkoop_orders.delete_one({"id": order_id})
    return {"message": "Verkooporder verwijderd"}

# ==================== PRIJSLIJSTEN ENDPOINTS ====================

@router.get("/prijslijsten")
async def get_prijslijsten(current_user: dict = Depends(get_current_active_user)):
    """Haal alle prijslijsten op"""
    user_id = current_user["id"]
    prijslijsten = await db.verkoop_prijslijsten.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Tel items per prijslijst
    for pl in prijslijsten:
        items_count = await db.verkoop_prijslijst_items.count_documents({"prijslijst_id": pl["id"]})
        pl["items_count"] = items_count
    
    return prijslijsten

@router.get("/prijslijsten/{prijslijst_id}")
async def get_prijslijst(prijslijst_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke prijslijst op met items"""
    user_id = current_user["id"]
    prijslijst = await db.verkoop_prijslijsten.find_one({"id": prijslijst_id, "user_id": user_id}, {"_id": 0})
    if not prijslijst:
        raise HTTPException(status_code=404, detail="Prijslijst niet gevonden")
    
    items = await db.verkoop_prijslijst_items.find({"prijslijst_id": prijslijst_id}, {"_id": 0}).to_list(500)
    prijslijst["items"] = items
    
    return prijslijst

@router.post("/prijslijsten")
async def create_prijslijst(data: PrijslijstCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe prijslijst aan"""
    user_id = current_user["id"]
    prijslijst_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Als dit de standaard prijslijst wordt, zet andere op niet-standaard
    if data.is_standaard:
        await db.verkoop_prijslijsten.update_many(
            {"user_id": user_id},
            {"$set": {"is_standaard": False}}
        )
    
    prijslijst_doc = {
        "id": prijslijst_id,
        "user_id": user_id,
        **data.model_dump(),
        "valuta": data.valuta.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.verkoop_prijslijsten.insert_one(prijslijst_doc)
    prijslijst_doc.pop("_id", None)
    return clean_doc(prijslijst_doc)

@router.put("/prijslijsten/{prijslijst_id}")
async def update_prijslijst(
    prijslijst_id: str, 
    data: PrijslijstUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Update een prijslijst"""
    user_id = current_user["id"]
    
    result = await db.verkoop_prijslijsten.find_one({"id": prijslijst_id, "user_id": user_id})
    if not result:
        raise HTTPException(status_code=404, detail="Prijslijst niet gevonden")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.verkoop_prijslijsten.update_one({"id": prijslijst_id}, {"$set": update_data})
    
    updated = await db.verkoop_prijslijsten.find_one({"id": prijslijst_id}, {"_id": 0})
    return updated

@router.delete("/prijslijsten/{prijslijst_id}")
async def delete_prijslijst(prijslijst_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een prijslijst"""
    user_id = current_user["id"]
    
    # Check of klanten deze prijslijst gebruiken
    klant_count = await db.verkoop_klanten.count_documents({"user_id": user_id, "prijslijst_id": prijslijst_id})
    if klant_count > 0:
        raise HTTPException(status_code=400, detail="Deze prijslijst is gekoppeld aan klanten")
    
    result = await db.verkoop_prijslijsten.delete_one({"id": prijslijst_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prijslijst niet gevonden")
    
    # Verwijder ook de items
    await db.verkoop_prijslijst_items.delete_many({"prijslijst_id": prijslijst_id})
    
    return {"message": "Prijslijst verwijderd"}

@router.post("/prijslijsten/{prijslijst_id}/items")
async def add_prijslijst_item(
    prijslijst_id: str, 
    data: PrijslijstItemCreate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Voeg een item toe aan een prijslijst"""
    user_id = current_user["id"]
    
    prijslijst = await db.verkoop_prijslijsten.find_one({"id": prijslijst_id, "user_id": user_id})
    if not prijslijst:
        raise HTTPException(status_code=404, detail="Prijslijst niet gevonden")
    
    # Check of artikel al in prijslijst zit
    existing = await db.verkoop_prijslijst_items.find_one({
        "prijslijst_id": prijslijst_id,
        "artikel_id": data.artikel_id
    })
    if existing:
        # Update bestaand item
        await db.verkoop_prijslijst_items.update_one(
            {"id": existing["id"]},
            {"$set": {"prijs": data.prijs, "min_aantal": data.min_aantal, "korting_percentage": data.korting_percentage}}
        )
        return {"message": "Prijslijst item bijgewerkt"}
    
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    item_doc = {
        "id": item_id,
        "prijslijst_id": prijslijst_id,
        **data.model_dump(),
        "created_at": now
    }
    
    await db.verkoop_prijslijst_items.insert_one(item_doc)
    item_doc.pop("_id", None)
    return clean_doc(item_doc)

@router.delete("/prijslijsten/{prijslijst_id}/items/{item_id}")
async def delete_prijslijst_item(
    prijslijst_id: str, 
    item_id: str, 
    current_user: dict = Depends(get_current_active_user)
):
    """Verwijder een item uit een prijslijst"""
    user_id = current_user["id"]
    
    prijslijst = await db.verkoop_prijslijsten.find_one({"id": prijslijst_id, "user_id": user_id})
    if not prijslijst:
        raise HTTPException(status_code=404, detail="Prijslijst niet gevonden")
    
    result = await db.verkoop_prijslijst_items.delete_one({"id": item_id, "prijslijst_id": prijslijst_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item niet gevonden")
    
    return {"message": "Item verwijderd"}

# ==================== KORTINGSREGELS ENDPOINTS ====================

@router.get("/kortingsregels")
async def get_kortingsregels(current_user: dict = Depends(get_current_active_user)):
    """Haal alle kortingsregels op"""
    user_id = current_user["id"]
    regels = await db.verkoop_kortingsregels.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return regels

@router.post("/kortingsregels")
async def create_kortingsregel(data: KortingsregelCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe kortingsregel aan"""
    user_id = current_user["id"]
    regel_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    regel_doc = {
        "id": regel_id,
        "user_id": user_id,
        **data.model_dump(),
        "created_at": now
    }
    
    await db.verkoop_kortingsregels.insert_one(regel_doc)
    regel_doc.pop("_id", None)
    return clean_doc(regel_doc)

@router.delete("/kortingsregels/{regel_id}")
async def delete_kortingsregel(regel_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een kortingsregel"""
    user_id = current_user["id"]
    
    result = await db.verkoop_kortingsregels.delete_one({"id": regel_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kortingsregel niet gevonden")
    
    return {"message": "Kortingsregel verwijderd"}

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_verkoop_dashboard(current_user: dict = Depends(get_current_active_user)):
    """Haal verkoop dashboard data op"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    
    # Aantal klanten
    klanten_count = await db.verkoop_klanten.count_documents({"user_id": user_id, "is_actief": True})
    
    # Openstaande offertes
    open_offertes = await db.verkoop_offertes.count_documents({
        "user_id": user_id,
        "status": {"$in": ["concept", "verzonden", "bekeken"]}
    })
    
    # Openstaande orders
    open_orders = await db.verkoop_orders.count_documents({
        "user_id": user_id,
        "status": {"$in": ["bevestigd", "in_behandeling"]}
    })
    
    # Omzet deze maand
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
    omzet_maand = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {
            "user_id": user_id,
            "factuurdatum": {"$gte": start_of_month},
            "status": {"$ne": "concept"}
        }},
        {"$group": {
            "_id": "$valuta",
            "totaal": {"$sum": "$totaal"}
        }}
    ]).to_list(10)
    
    # Openstaande facturen
    openstaande_facturen = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {
            "user_id": user_id,
            "status": {"$in": ["verstuurd", "gedeeltelijk_betaald", "vervallen"]}
        }},
        {"$group": {
            "_id": "$valuta",
            "totaal": {"$sum": {"$subtract": ["$totaal", "$betaald_bedrag"]}}
        }}
    ]).to_list(10)
    
    # Offerte conversie ratio
    total_offertes = await db.verkoop_offertes.count_documents({"user_id": user_id})
    accepted_offertes = await db.verkoop_offertes.count_documents({
        "user_id": user_id,
        "status": {"$in": ["geaccepteerd", "omgezet_naar_order"]}
    })
    conversie_ratio = (accepted_offertes / total_offertes * 100) if total_offertes > 0 else 0
    
    # Top 5 klanten
    top_klanten = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$debiteur_id",
            "naam": {"$first": "$debiteur_naam"},
            "totaal": {"$sum": "$totaal"}
        }},
        {"$sort": {"totaal": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    return {
        "klanten_count": klanten_count,
        "open_offertes": open_offertes,
        "open_orders": open_orders,
        "omzet_maand": {item["_id"]: item["totaal"] for item in omzet_maand},
        "openstaande_facturen": {item["_id"]: item["totaal"] for item in openstaande_facturen},
        "conversie_ratio": round(conversie_ratio, 1),
        "top_klanten": top_klanten
    }
