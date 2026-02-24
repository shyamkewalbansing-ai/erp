"""
Voorraad & Logistiek Module - Artikelbeheer, Voorraadbeheer, Magazijnen, Serie/Batch nummers
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid
from .deps import db, get_current_active_user, clean_doc

# Grootboek integratie
from utils.grootboek_integration import boek_voorraad_ontvangst, boek_voorraad_verkoop

router = APIRouter(prefix="/voorraad", tags=["Voorraad & Logistiek"])

# ==================== ENUMS ====================

class Currency(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class ArtikelType(str, Enum):
    PRODUCT = "product"
    DIENST = "dienst"
    SAMENSTELLING = "samenstelling"

class VoorraadBeheerMethode(str, Enum):
    FIFO = "fifo"  # First In First Out
    LIFO = "lifo"  # Last In First Out
    GEMIDDELD = "gemiddeld"  # Gewogen gemiddelde
    SPECIFIEK = "specifiek"  # Specifieke identificatie

class MutatieType(str, Enum):
    INKOOP = "inkoop"
    VERKOOP = "verkoop"
    CORRECTIE = "correctie"
    TRANSFER = "transfer"
    INVENTARISATIE = "inventarisatie"
    PRODUCTIE = "productie"
    RETOUR = "retour"

# ==================== MODELS - ARTIKELEN ====================

class ArtikelCreate(BaseModel):
    artikelcode: str
    naam: str
    omschrijving: Optional[str] = None
    type: ArtikelType = ArtikelType.PRODUCT
    categorie: Optional[str] = None
    eenheid: str = "stuk"
    
    # Prijzen
    inkoopprijs: float = 0
    verkoopprijs: float = 0
    standaard_valuta: Currency = Currency.SRD
    btw_tarief: str = "25"
    
    # Voorraad
    voorraad_beheer: bool = True
    min_voorraad: float = 0
    max_voorraad: Optional[float] = None
    bestel_aantal: Optional[float] = None
    voorraad_methode: VoorraadBeheerMethode = VoorraadBeheerMethode.GEMIDDELD
    
    # Extra
    leverancier_id: Optional[str] = None
    leverancier_artikelcode: Optional[str] = None
    barcode: Optional[str] = None
    afbeelding_url: Optional[str] = None
    
    # Serialisatie
    heeft_serienummers: bool = False
    heeft_batchnummers: bool = False
    
    # Afmetingen (voor logistiek)
    gewicht: Optional[float] = None
    lengte: Optional[float] = None
    breedte: Optional[float] = None
    hoogte: Optional[float] = None
    
    notities: Optional[str] = None
    is_actief: bool = True

class ArtikelUpdate(BaseModel):
    naam: Optional[str] = None
    omschrijving: Optional[str] = None
    categorie: Optional[str] = None
    eenheid: Optional[str] = None
    inkoopprijs: Optional[float] = None
    verkoopprijs: Optional[float] = None
    btw_tarief: Optional[str] = None
    min_voorraad: Optional[float] = None
    max_voorraad: Optional[float] = None
    bestel_aantal: Optional[float] = None
    leverancier_id: Optional[str] = None
    leverancier_artikelcode: Optional[str] = None
    barcode: Optional[str] = None
    afbeelding_url: Optional[str] = None
    gewicht: Optional[float] = None
    lengte: Optional[float] = None
    breedte: Optional[float] = None
    hoogte: Optional[float] = None
    notities: Optional[str] = None
    is_actief: Optional[bool] = None

# ==================== MODELS - MAGAZIJNEN ====================

class MagazijnCreate(BaseModel):
    naam: str
    code: str
    adres: Optional[str] = None
    contactpersoon: Optional[str] = None
    telefoon: Optional[str] = None
    is_standaard: bool = False
    is_actief: bool = True

class MagazijnUpdate(BaseModel):
    naam: Optional[str] = None
    adres: Optional[str] = None
    contactpersoon: Optional[str] = None
    telefoon: Optional[str] = None
    is_actief: Optional[bool] = None

class LocatieCreate(BaseModel):
    magazijn_id: str
    code: str
    naam: str
    zone: Optional[str] = None
    gang: Optional[str] = None
    stelling: Optional[str] = None
    plank: Optional[str] = None
    capaciteit: Optional[float] = None
    is_actief: bool = True

# ==================== MODELS - VOORRAADMUTATIES ====================

class VoorraadMutatieCreate(BaseModel):
    artikel_id: str
    type: MutatieType
    aantal: float
    locatie_id: Optional[str] = None
    naar_locatie_id: Optional[str] = None  # Voor transfers
    serienummers: Optional[List[str]] = None
    batchnummer: Optional[str] = None
    kostprijs: Optional[float] = None
    omschrijving: Optional[str] = None
    referentie_type: Optional[str] = None
    referentie_id: Optional[str] = None
    datum: Optional[str] = None

# ==================== MODELS - INVENTARISATIE ====================

class InventarisatieCreate(BaseModel):
    naam: str
    magazijn_id: Optional[str] = None
    locatie_id: Optional[str] = None
    categorie: Optional[str] = None
    geplande_datum: str

class InventarisatieRegelCreate(BaseModel):
    artikel_id: str
    verwacht_aantal: float
    geteld_aantal: float
    locatie_id: Optional[str] = None
    serienummers: Optional[List[str]] = None
    opmerking: Optional[str] = None

# ==================== MODELS - SERIENUMMERS ====================

class SerienummerCreate(BaseModel):
    artikel_id: str
    serienummer: str
    status: str = "beschikbaar"  # beschikbaar, verkocht, defect, retour
    locatie_id: Optional[str] = None
    aankoop_datum: Optional[str] = None
    garantie_tot: Optional[str] = None
    notities: Optional[str] = None

# ==================== ARTIKELEN ENDPOINTS ====================

@router.get("/artikelen")
async def get_artikelen(
    type: Optional[str] = None,
    categorie: Optional[str] = None,
    actief: Optional[bool] = None,
    search: Optional[str] = None,
    voorraad_onder_min: bool = False,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle artikelen op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if type:
        query["type"] = type
    if categorie:
        query["categorie"] = categorie
    if actief is not None:
        query["is_actief"] = actief
    if search:
        query["$or"] = [
            {"artikelcode": {"$regex": search, "$options": "i"}},
            {"naam": {"$regex": search, "$options": "i"}},
            {"barcode": search}
        ]
    
    artikelen = await db.voorraad_artikelen.find(query, {"_id": 0}).sort("naam", 1).to_list(1000)
    
    # Filter op voorraad onder minimum indien gevraagd
    if voorraad_onder_min:
        artikelen = [a for a in artikelen if a.get("voorraad_aantal", 0) < a.get("min_voorraad", 0)]
    
    return artikelen

@router.get("/artikelen/{artikel_id}")
async def get_artikel(artikel_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifiek artikel op met voorraaddetails"""
    user_id = current_user["id"]
    artikel = await db.voorraad_artikelen.find_one({"id": artikel_id, "user_id": user_id}, {"_id": 0})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    # Haal voorraad per locatie
    voorraad_per_locatie = await db.voorraad_locatie_voorraad.find(
        {"artikel_id": artikel_id},
        {"_id": 0}
    ).to_list(100)
    artikel["voorraad_per_locatie"] = voorraad_per_locatie
    
    # Haal serienummers als van toepassing
    if artikel.get("heeft_serienummers"):
        serienummers = await db.voorraad_serienummers.find(
            {"artikel_id": artikel_id, "status": "beschikbaar"},
            {"_id": 0}
        ).to_list(100)
        artikel["beschikbare_serienummers"] = serienummers
    
    return artikel

@router.post("/artikelen")
async def create_artikel(data: ArtikelCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuw artikel aan"""
    user_id = current_user["id"]
    
    # Check of artikelcode al bestaat
    existing = await db.voorraad_artikelen.find_one({
        "user_id": user_id,
        "artikelcode": data.artikelcode
    })
    if existing:
        raise HTTPException(status_code=400, detail="Artikelcode bestaat al")
    
    artikel_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    artikel_doc = {
        "id": artikel_id,
        "user_id": user_id,
        **data.model_dump(),
        "type": data.type.value,
        "standaard_valuta": data.standaard_valuta.value,
        "voorraad_methode": data.voorraad_methode.value,
        "voorraad_aantal": 0,
        "gereserveerd_aantal": 0,
        "beschikbaar_aantal": 0,
        "gemiddelde_kostprijs": data.inkoopprijs,
        "created_at": now,
        "updated_at": now
    }
    
    await db.voorraad_artikelen.insert_one(artikel_doc)
    artikel_doc.pop("_id", None)
    return clean_doc(artikel_doc)

@router.put("/artikelen/{artikel_id}")
async def update_artikel(
    artikel_id: str, 
    data: ArtikelUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Update een artikel"""
    user_id = current_user["id"]
    
    artikel = await db.voorraad_artikelen.find_one({"id": artikel_id, "user_id": user_id})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.voorraad_artikelen.update_one({"id": artikel_id}, {"$set": update_data})
    
    updated = await db.voorraad_artikelen.find_one({"id": artikel_id}, {"_id": 0})
    return updated

@router.delete("/artikelen/{artikel_id}")
async def delete_artikel(artikel_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een artikel (soft delete als er mutaties zijn)"""
    user_id = current_user["id"]
    
    # Check voor mutaties
    mutatie_count = await db.voorraad_mutaties.count_documents({"artikel_id": artikel_id})
    
    if mutatie_count > 0:
        await db.voorraad_artikelen.update_one(
            {"id": artikel_id, "user_id": user_id},
            {"$set": {"is_actief": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Artikel gedeactiveerd (er zijn voorraadmutaties)"}
    
    result = await db.voorraad_artikelen.delete_one({"id": artikel_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    return {"message": "Artikel verwijderd"}

@router.get("/artikelen/{artikel_id}/mutaties")
async def get_artikel_mutaties(
    artikel_id: str, 
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal voorraadmutaties van een artikel op"""
    user_id = current_user["id"]
    
    mutaties = await db.voorraad_mutaties.find(
        {"artikel_id": artikel_id, "user_id": user_id},
        {"_id": 0}
    ).sort("datum", -1).limit(limit).to_list(limit)
    
    return mutaties

@router.get("/categorieen")
async def get_artikel_categorieen(current_user: dict = Depends(get_current_active_user)):
    """Haal alle unieke categorieën op"""
    user_id = current_user["id"]
    
    categorieen = await db.voorraad_artikelen.distinct("categorie", {"user_id": user_id})
    return [c for c in categorieen if c]

# ==================== MAGAZIJNEN ENDPOINTS ====================

@router.get("/magazijnen")
async def get_magazijnen(current_user: dict = Depends(get_current_active_user)):
    """Haal alle magazijnen op"""
    user_id = current_user["id"]
    magazijnen = await db.voorraad_magazijnen.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Tel locaties en artikelen per magazijn
    for mag in magazijnen:
        locaties_count = await db.voorraad_locaties.count_documents({"magazijn_id": mag["id"]})
        mag["locaties_count"] = locaties_count
    
    return magazijnen

@router.get("/magazijnen/{magazijn_id}")
async def get_magazijn(magazijn_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifiek magazijn op met locaties"""
    user_id = current_user["id"]
    magazijn = await db.voorraad_magazijnen.find_one({"id": magazijn_id, "user_id": user_id}, {"_id": 0})
    if not magazijn:
        raise HTTPException(status_code=404, detail="Magazijn niet gevonden")
    
    locaties = await db.voorraad_locaties.find({"magazijn_id": magazijn_id}, {"_id": 0}).to_list(500)
    magazijn["locaties"] = locaties
    
    return magazijn

@router.post("/magazijnen")
async def create_magazijn(data: MagazijnCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuw magazijn aan"""
    user_id = current_user["id"]
    
    # Check of code al bestaat
    existing = await db.voorraad_magazijnen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Magazijncode bestaat al")
    
    magazijn_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Als dit het standaard magazijn wordt, zet andere op niet-standaard
    if data.is_standaard:
        await db.voorraad_magazijnen.update_many(
            {"user_id": user_id},
            {"$set": {"is_standaard": False}}
        )
    
    magazijn_doc = {
        "id": magazijn_id,
        "user_id": user_id,
        **data.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.voorraad_magazijnen.insert_one(magazijn_doc)
    magazijn_doc.pop("_id", None)
    return clean_doc(magazijn_doc)

@router.put("/magazijnen/{magazijn_id}")
async def update_magazijn(
    magazijn_id: str, 
    data: MagazijnUpdate, 
    current_user: dict = Depends(get_current_active_user)
):
    """Update een magazijn"""
    user_id = current_user["id"]
    
    result = await db.voorraad_magazijnen.find_one({"id": magazijn_id, "user_id": user_id})
    if not result:
        raise HTTPException(status_code=404, detail="Magazijn niet gevonden")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.voorraad_magazijnen.update_one({"id": magazijn_id}, {"$set": update_data})
    
    updated = await db.voorraad_magazijnen.find_one({"id": magazijn_id}, {"_id": 0})
    return updated

@router.delete("/magazijnen/{magazijn_id}")
async def delete_magazijn(magazijn_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een magazijn"""
    user_id = current_user["id"]
    
    # Check voor locaties met voorraad
    locaties = await db.voorraad_locaties.find({"magazijn_id": magazijn_id}).to_list(100)
    for loc in locaties:
        voorraad = await db.voorraad_locatie_voorraad.find_one({"locatie_id": loc["id"], "aantal": {"$gt": 0}})
        if voorraad:
            raise HTTPException(status_code=400, detail="Magazijn bevat nog voorraad")
    
    result = await db.voorraad_magazijnen.delete_one({"id": magazijn_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Magazijn niet gevonden")
    
    # Verwijder locaties
    await db.voorraad_locaties.delete_many({"magazijn_id": magazijn_id})
    
    return {"message": "Magazijn verwijderd"}

# ==================== LOCATIES ENDPOINTS ====================

@router.get("/locaties")
async def get_locaties(
    magazijn_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle locaties op"""
    user_id = current_user["id"]
    
    # Haal eerst de magazijnen van de user
    magazijn_ids = await db.voorraad_magazijnen.distinct("id", {"user_id": user_id})
    
    query = {"magazijn_id": {"$in": magazijn_ids}}
    if magazijn_id:
        query["magazijn_id"] = magazijn_id
    
    locaties = await db.voorraad_locaties.find(query, {"_id": 0}).to_list(500)
    return locaties

@router.post("/locaties")
async def create_locatie(data: LocatieCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe locatie aan"""
    user_id = current_user["id"]
    
    # Valideer magazijn
    magazijn = await db.voorraad_magazijnen.find_one({"id": data.magazijn_id, "user_id": user_id})
    if not magazijn:
        raise HTTPException(status_code=404, detail="Magazijn niet gevonden")
    
    # Check of code al bestaat in dit magazijn
    existing = await db.voorraad_locaties.find_one({
        "magazijn_id": data.magazijn_id,
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Locatiecode bestaat al in dit magazijn")
    
    locatie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    locatie_doc = {
        "id": locatie_id,
        **data.model_dump(),
        "created_at": now
    }
    
    await db.voorraad_locaties.insert_one(locatie_doc)
    locatie_doc.pop("_id", None)
    return clean_doc(locatie_doc)

@router.delete("/locaties/{locatie_id}")
async def delete_locatie(locatie_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een locatie"""
    user_id = current_user["id"]
    
    # Check of locatie voorraad bevat
    voorraad = await db.voorraad_locatie_voorraad.find_one({"locatie_id": locatie_id, "aantal": {"$gt": 0}})
    if voorraad:
        raise HTTPException(status_code=400, detail="Locatie bevat nog voorraad")
    
    result = await db.voorraad_locaties.delete_one({"id": locatie_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden")
    
    return {"message": "Locatie verwijderd"}

# ==================== VOORRAADMUTATIES ENDPOINTS ====================

@router.get("/mutaties")
async def get_voorraad_mutaties(
    artikel_id: Optional[str] = None,
    type: Optional[str] = None,
    start_datum: Optional[str] = None,
    eind_datum: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal voorraadmutaties op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if artikel_id:
        query["artikel_id"] = artikel_id
    if type:
        query["type"] = type
    if start_datum:
        query["datum"] = {"$gte": start_datum}
    if eind_datum:
        if "datum" in query:
            query["datum"]["$lte"] = eind_datum
        else:
            query["datum"] = {"$lte": eind_datum}
    
    mutaties = await db.voorraad_mutaties.find(query, {"_id": 0}).sort("datum", -1).limit(limit).to_list(limit)
    return mutaties

@router.post("/mutaties")
async def create_voorraad_mutatie(data: VoorraadMutatieCreate, current_user: dict = Depends(get_current_active_user)):
    """Registreer een voorraadmutatie"""
    user_id = current_user["id"]
    
    # Valideer artikel
    artikel = await db.voorraad_artikelen.find_one({"id": data.artikel_id, "user_id": user_id})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    if not artikel.get("voorraad_beheer"):
        raise HTTPException(status_code=400, detail="Artikel heeft geen voorraad beheer")
    
    mutatie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    datum = data.datum or datetime.now().strftime("%Y-%m-%d")
    
    # Bepaal voorraad wijziging
    aantal_wijziging = data.aantal
    if data.type.value in ["verkoop", "correctie"] and data.aantal > 0:
        # Voor verkoop en negatieve correcties
        if data.type.value == "verkoop":
            aantal_wijziging = -abs(data.aantal)
    
    # Check of er voldoende voorraad is voor uitgaande mutaties
    huidige_voorraad = artikel.get("voorraad_aantal", 0)
    if aantal_wijziging < 0 and huidige_voorraad + aantal_wijziging < 0:
        raise HTTPException(status_code=400, detail="Onvoldoende voorraad")
    
    # Bereken nieuwe gemiddelde kostprijs bij inkoop
    nieuwe_kostprijs = artikel.get("gemiddelde_kostprijs", 0)
    if data.type.value == "inkoop" and data.kostprijs:
        totaal_waarde = huidige_voorraad * nieuwe_kostprijs
        nieuwe_waarde = abs(data.aantal) * data.kostprijs
        nieuwe_voorraad = huidige_voorraad + abs(data.aantal)
        if nieuwe_voorraad > 0:
            nieuwe_kostprijs = (totaal_waarde + nieuwe_waarde) / nieuwe_voorraad
    
    mutatie_doc = {
        "id": mutatie_id,
        "user_id": user_id,
        "artikel_id": data.artikel_id,
        "artikel_naam": artikel.get("naam"),
        "artikelcode": artikel.get("artikelcode"),
        "type": data.type.value,
        "aantal": data.aantal,
        "aantal_wijziging": aantal_wijziging,
        "locatie_id": data.locatie_id,
        "naar_locatie_id": data.naar_locatie_id,
        "serienummers": data.serienummers or [],
        "batchnummer": data.batchnummer,
        "kostprijs": data.kostprijs,
        "omschrijving": data.omschrijving,
        "referentie_type": data.referentie_type,
        "referentie_id": data.referentie_id,
        "datum": datum,
        "voorraad_voor": huidige_voorraad,
        "voorraad_na": huidige_voorraad + aantal_wijziging,
        "created_at": now
    }
    
    await db.voorraad_mutaties.insert_one(mutatie_doc)
    mutatie_doc.pop("_id", None)
    
    # Update artikel voorraad
    await db.voorraad_artikelen.update_one(
        {"id": data.artikel_id},
        {
            "$inc": {"voorraad_aantal": aantal_wijziging},
            "$set": {
                "gemiddelde_kostprijs": nieuwe_kostprijs,
                "beschikbaar_aantal": huidige_voorraad + aantal_wijziging - artikel.get("gereserveerd_aantal", 0),
                "updated_at": now
            }
        }
    )
    
    # Update locatie voorraad indien van toepassing
    if data.locatie_id:
        await db.voorraad_locatie_voorraad.update_one(
            {"artikel_id": data.artikel_id, "locatie_id": data.locatie_id},
            {"$inc": {"aantal": aantal_wijziging}},
            upsert=True
        )
    
    # Bij transfer: update ook de doellocatie
    if data.type.value == "transfer" and data.naar_locatie_id:
        await db.voorraad_locatie_voorraad.update_one(
            {"artikel_id": data.artikel_id, "locatie_id": data.naar_locatie_id},
            {"$inc": {"aantal": abs(data.aantal)}},
            upsert=True
        )
    
    # Update serienummers status
    if data.serienummers:
        nieuwe_status = "beschikbaar" if data.type.value == "inkoop" else "verkocht"
        for sn in data.serienummers:
            await db.voorraad_serienummers.update_one(
                {"artikel_id": data.artikel_id, "serienummer": sn},
                {"$set": {"status": nieuwe_status, "locatie_id": data.locatie_id}},
                upsert=True
            )
    
    # Automatische grootboekboeking
    try:
        kostprijs = data.kostprijs or artikel.get("inkoopprijs", 0) or nieuwe_kostprijs
        if data.type.value == "inkoop" and kostprijs > 0:
            await boek_voorraad_ontvangst(
                db=db,
                user_id=user_id,
                artikel=artikel,
                aantal=abs(data.aantal),
                kostprijs=kostprijs,
                referentie=data.omschrijving or "Handmatige ontvangst"
            )
        elif data.type.value == "verkoop" and kostprijs > 0:
            await boek_voorraad_verkoop(
                db=db,
                user_id=user_id,
                artikel=artikel,
                aantal=abs(data.aantal),
                kostprijs=kostprijs,
                referentie=data.omschrijving or "Handmatige verkoop"
            )
    except Exception as e:
        print(f"Fout bij grootboekboeking voorraad: {e}")
    
    return clean_doc(mutatie_doc)

# ==================== INVENTARISATIE ENDPOINTS ====================

@router.get("/inventarisaties")
async def get_inventarisaties(current_user: dict = Depends(get_current_active_user)):
    """Haal alle inventarisaties op"""
    user_id = current_user["id"]
    inventarisaties = await db.voorraad_inventarisaties.find({"user_id": user_id}, {"_id": 0}).sort("geplande_datum", -1).to_list(100)
    return inventarisaties

@router.post("/inventarisaties")
async def create_inventarisatie(data: InventarisatieCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuwe inventarisatie aan"""
    user_id = current_user["id"]
    inventarisatie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Genereer inventarisatienummer
    year = datetime.now().year
    count = await db.voorraad_inventarisaties.count_documents({"user_id": user_id})
    inventarisatienummer = f"INV{year}-{str(count + 1).zfill(4)}"
    
    inventarisatie_doc = {
        "id": inventarisatie_id,
        "user_id": user_id,
        "inventarisatienummer": inventarisatienummer,
        **data.model_dump(),
        "status": "gepland",
        "regels": [],
        "created_at": now
    }
    
    await db.voorraad_inventarisaties.insert_one(inventarisatie_doc)
    inventarisatie_doc.pop("_id", None)
    return clean_doc(inventarisatie_doc)

@router.get("/inventarisaties/{inventarisatie_id}")
async def get_inventarisatie(inventarisatie_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifieke inventarisatie op"""
    user_id = current_user["id"]
    inventarisatie = await db.voorraad_inventarisaties.find_one(
        {"id": inventarisatie_id, "user_id": user_id}, {"_id": 0}
    )
    if not inventarisatie:
        raise HTTPException(status_code=404, detail="Inventarisatie niet gevonden")
    return inventarisatie

@router.post("/inventarisaties/{inventarisatie_id}/regels")
async def add_inventarisatie_regel(
    inventarisatie_id: str,
    data: InventarisatieRegelCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Voeg een tellingsregel toe aan een inventarisatie"""
    user_id = current_user["id"]
    
    inventarisatie = await db.voorraad_inventarisaties.find_one(
        {"id": inventarisatie_id, "user_id": user_id}
    )
    if not inventarisatie:
        raise HTTPException(status_code=404, detail="Inventarisatie niet gevonden")
    
    if inventarisatie.get("status") == "afgerond":
        raise HTTPException(status_code=400, detail="Inventarisatie is al afgerond")
    
    # Haal artikel info
    artikel = await db.voorraad_artikelen.find_one({"id": data.artikel_id, "user_id": user_id})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    regel = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "artikel_naam": artikel.get("naam"),
        "artikelcode": artikel.get("artikelcode"),
        "verschil": data.geteld_aantal - data.verwacht_aantal,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.voorraad_inventarisaties.update_one(
        {"id": inventarisatie_id},
        {
            "$push": {"regels": regel},
            "$set": {"status": "in_uitvoering"}
        }
    )
    
    return regel

@router.post("/inventarisaties/{inventarisatie_id}/afronden")
async def afronden_inventarisatie(
    inventarisatie_id: str,
    verwerk_verschillen: bool = True,
    current_user: dict = Depends(get_current_active_user)
):
    """Rond een inventarisatie af en verwerk optioneel de verschillen"""
    user_id = current_user["id"]
    
    inventarisatie = await db.voorraad_inventarisaties.find_one(
        {"id": inventarisatie_id, "user_id": user_id}
    )
    if not inventarisatie:
        raise HTTPException(status_code=404, detail="Inventarisatie niet gevonden")
    
    if inventarisatie.get("status") == "afgerond":
        raise HTTPException(status_code=400, detail="Inventarisatie is al afgerond")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Verwerk verschillen als mutaties
    if verwerk_verschillen:
        for regel in inventarisatie.get("regels", []):
            verschil = regel.get("verschil", 0)
            if verschil != 0:
                mutatie_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "artikel_id": regel["artikel_id"],
                    "artikel_naam": regel.get("artikel_naam"),
                    "artikelcode": regel.get("artikelcode"),
                    "type": "inventarisatie",
                    "aantal": abs(verschil),
                    "aantal_wijziging": verschil,
                    "locatie_id": regel.get("locatie_id"),
                    "omschrijving": f"Inventarisatie correctie {inventarisatie.get('inventarisatienummer')}",
                    "referentie_type": "inventarisatie",
                    "referentie_id": inventarisatie_id,
                    "datum": datetime.now().strftime("%Y-%m-%d"),
                    "created_at": now
                }
                await db.voorraad_mutaties.insert_one(mutatie_doc)
                mutatie_doc.pop("_id", None)
                
                # Update artikel voorraad
                await db.voorraad_artikelen.update_one(
                    {"id": regel["artikel_id"]},
                    {"$set": {"voorraad_aantal": regel["geteld_aantal"], "updated_at": now}}
                )
    
    # Update inventarisatie status
    await db.voorraad_inventarisaties.update_one(
        {"id": inventarisatie_id},
        {"$set": {"status": "afgerond", "afgerond_op": now}}
    )
    
    return {"message": "Inventarisatie afgerond", "verschillen_verwerkt": verwerk_verschillen}

# ==================== SERIENUMMERS ENDPOINTS ====================

@router.get("/serienummers")
async def get_serienummers(
    artikel_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal serienummers op"""
    user_id = current_user["id"]
    
    # Haal artikel IDs van de user
    artikel_ids = await db.voorraad_artikelen.distinct("id", {"user_id": user_id})
    
    query = {"artikel_id": {"$in": artikel_ids}}
    if artikel_id:
        query["artikel_id"] = artikel_id
    if status:
        query["status"] = status
    
    serienummers = await db.voorraad_serienummers.find(query, {"_id": 0}).to_list(500)
    return serienummers

@router.post("/serienummers")
async def create_serienummer(data: SerienummerCreate, current_user: dict = Depends(get_current_active_user)):
    """Registreer een serienummer"""
    user_id = current_user["id"]
    
    # Valideer artikel
    artikel = await db.voorraad_artikelen.find_one({"id": data.artikel_id, "user_id": user_id})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    if not artikel.get("heeft_serienummers"):
        raise HTTPException(status_code=400, detail="Artikel ondersteunt geen serienummers")
    
    # Check of serienummer al bestaat
    existing = await db.voorraad_serienummers.find_one({
        "artikel_id": data.artikel_id,
        "serienummer": data.serienummer
    })
    if existing:
        raise HTTPException(status_code=400, detail="Serienummer bestaat al")
    
    serienummer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    serienummer_doc = {
        "id": serienummer_id,
        **data.model_dump(),
        "created_at": now
    }
    
    await db.voorraad_serienummers.insert_one(serienummer_doc)
    serienummer_doc.pop("_id", None)
    return clean_doc(serienummer_doc)

# ==================== KOSTPRIJSBEREKENINGEN ====================

@router.get("/kostprijs/{artikel_id}")
async def get_kostprijs_info(artikel_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal kostprijsinformatie van een artikel op"""
    user_id = current_user["id"]
    
    artikel = await db.voorraad_artikelen.find_one({"id": artikel_id, "user_id": user_id}, {"_id": 0})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    # Haal recente inkopen
    recente_inkopen = await db.voorraad_mutaties.find({
        "artikel_id": artikel_id,
        "type": "inkoop"
    }).sort("datum", -1).limit(10).to_list(10)
    
    # Bereken gewogen gemiddelde van recente inkopen
    totaal_aantal = 0
    totaal_waarde = 0
    for inkoop in recente_inkopen:
        aantal = inkoop.get("aantal", 0)
        kostprijs = inkoop.get("kostprijs", 0)
        totaal_aantal += aantal
        totaal_waarde += aantal * kostprijs
    
    gewogen_gemiddelde = totaal_waarde / totaal_aantal if totaal_aantal > 0 else 0
    
    return {
        "artikel_id": artikel_id,
        "artikelcode": artikel.get("artikelcode"),
        "naam": artikel.get("naam"),
        "inkoopprijs": artikel.get("inkoopprijs", 0),
        "gemiddelde_kostprijs": artikel.get("gemiddelde_kostprijs", 0),
        "gewogen_gemiddelde_recent": round(gewogen_gemiddelde, 2),
        "verkoopprijs": artikel.get("verkoopprijs", 0),
        "marge": round(artikel.get("verkoopprijs", 0) - artikel.get("gemiddelde_kostprijs", 0), 2),
        "marge_percentage": round(
            ((artikel.get("verkoopprijs", 0) - artikel.get("gemiddelde_kostprijs", 0)) / artikel.get("verkoopprijs", 1)) * 100, 1
        ) if artikel.get("verkoopprijs", 0) > 0 else 0,
        "voorraad_waarde": round(artikel.get("voorraad_aantal", 0) * artikel.get("gemiddelde_kostprijs", 0), 2),
        "recente_inkopen": [{**i, "_id": None} for i in recente_inkopen]
    }

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_voorraad_dashboard(current_user: dict = Depends(get_current_active_user)):
    """Haal voorraad dashboard data op"""
    user_id = current_user["id"]
    
    # Totaal artikelen
    artikelen_count = await db.voorraad_artikelen.count_documents({"user_id": user_id, "is_actief": True})
    
    # Artikelen met lage voorraad
    lage_voorraad = await db.voorraad_artikelen.count_documents({
        "user_id": user_id,
        "voorraad_beheer": True,
        "$expr": {"$lt": ["$voorraad_aantal", "$min_voorraad"]}
    })
    
    # Totale voorraadwaarde
    voorraad_waarde = await db.voorraad_artikelen.aggregate([
        {"$match": {"user_id": user_id, "voorraad_beheer": True}},
        {"$group": {
            "_id": None,
            "totaal": {"$sum": {"$multiply": ["$voorraad_aantal", "$gemiddelde_kostprijs"]}}
        }}
    ]).to_list(1)
    
    totale_waarde = voorraad_waarde[0]["totaal"] if voorraad_waarde else 0
    
    # Magazijnen
    magazijnen_count = await db.voorraad_magazijnen.count_documents({"user_id": user_id, "is_actief": True})
    
    # Recente mutaties
    recente_mutaties = await db.voorraad_mutaties.find(
        {"user_id": user_id}
    ).sort("datum", -1).limit(10).to_list(10)
    
    # Openstaande inventarisaties
    open_inventarisaties = await db.voorraad_inventarisaties.count_documents({
        "user_id": user_id,
        "status": {"$in": ["gepland", "in_uitvoering"]}
    })
    
    # Top 5 artikelen op waarde
    top_artikelen = await db.voorraad_artikelen.aggregate([
        {"$match": {"user_id": user_id, "voorraad_beheer": True}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "artikelcode": 1,
            "naam": 1,
            "voorraad_aantal": 1,
            "waarde": {"$multiply": ["$voorraad_aantal", "$gemiddelde_kostprijs"]}
        }},
        {"$sort": {"waarde": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    return {
        "artikelen_count": artikelen_count,
        "lage_voorraad_count": lage_voorraad,
        "totale_voorraad_waarde": round(totale_waarde, 2),
        "magazijnen_count": magazijnen_count,
        "open_inventarisaties": open_inventarisaties,
        "recente_mutaties": [{**m, "_id": None} for m in recente_mutaties],
        "top_artikelen_waarde": top_artikelen
    }
