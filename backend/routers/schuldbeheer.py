"""
Persoonlijke Boekhouding & Schuldenbeheer Module
================================================
Complete module voor schuldbeheer, inkomsten/uitgaven tracking, en financiële planning.
BELANGRIJK: Deze module is NIET zichtbaar voor klanten - alleen admin kan deze toewijzen.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import logging
from pathlib import Path
from decimal import Decimal
import shutil
import aiofiles

# Import dependencies from main server
import sys
sys.path.append(str(Path(__file__).parent.parent))
from routers.deps import get_current_user, get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schuldbeheer", tags=["Schuldbeheer"])

# ==================== PYDANTIC MODELS ====================

# --- Bankrekeningen ---
class BankrekeningCreate(BaseModel):
    rekeningnummer: str
    bank: str
    type: str = "betaalrekening"  # betaalrekening, spaarrekening
    saldo: float = 0.0
    naam: Optional[str] = None
    actief: bool = True

class BankrekeningUpdate(BaseModel):
    rekeningnummer: Optional[str] = None
    bank: Optional[str] = None
    type: Optional[str] = None
    saldo: Optional[float] = None
    naam: Optional[str] = None
    actief: Optional[bool] = None

class BankrekeningResponse(BaseModel):
    id: str
    user_id: str
    rekeningnummer: str
    bank: str
    type: str
    saldo: float
    naam: Optional[str] = None
    actief: bool
    created_at: str
    updated_at: Optional[str] = None

# --- Relaties (Schuldeisers/Crediteuren) ---
class RelatieCreate(BaseModel):
    naam: str
    iban: Optional[str] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    type: str = "overig"  # huur, verzekering, lening, deurwaarder, belasting, zorg, energie, overig
    notities: Optional[str] = None
    actief: bool = True

class RelatieUpdate(BaseModel):
    naam: Optional[str] = None
    iban: Optional[str] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    type: Optional[str] = None
    notities: Optional[str] = None
    actief: Optional[bool] = None

class RelatieResponse(BaseModel):
    id: str
    user_id: str
    naam: str
    iban: Optional[str] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None
    adres: Optional[str] = None
    type: str
    notities: Optional[str] = None
    actief: bool
    totale_schuld: float = 0.0  # Berekend veld
    created_at: str
    updated_at: Optional[str] = None

# --- Schulden (Dossiers) ---
class SchuldCreate(BaseModel):
    relatie_id: str
    dossiernummer: Optional[str] = None
    omschrijving: str
    startdatum: str  # YYYY-MM-DD
    oorspronkelijk_bedrag: float
    rente_percentage: float = 0.0
    maandbedrag: float = 0.0  # Betaalregeling bedrag per maand
    status: str = "open"  # open, regeling, betaald, betwist
    prioriteit: str = "normaal"  # hoog, normaal, laag
    notities: Optional[str] = None

class SchuldUpdate(BaseModel):
    relatie_id: Optional[str] = None
    dossiernummer: Optional[str] = None
    omschrijving: Optional[str] = None
    startdatum: Optional[str] = None
    oorspronkelijk_bedrag: Optional[float] = None
    rente_percentage: Optional[float] = None
    maandbedrag: Optional[float] = None
    status: Optional[str] = None
    prioriteit: Optional[str] = None
    notities: Optional[str] = None

class SchuldResponse(BaseModel):
    id: str
    user_id: str
    relatie_id: str
    relatie_naam: Optional[str] = None
    dossiernummer: str
    omschrijving: str
    startdatum: str
    oorspronkelijk_bedrag: float
    rente_percentage: float
    maandbedrag: float
    openstaand_saldo: float  # Automatisch berekend
    totaal_betaald: float  # Automatisch berekend
    status: str
    prioriteit: str
    notities: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# --- Betalingen ---
class BetalingCreate(BaseModel):
    schuld_id: str
    datum: str  # YYYY-MM-DD
    bedrag: float
    rekening_id: Optional[str] = None
    omschrijving: Optional[str] = None
    referentie: Optional[str] = None
    betaalmethode: str = "bank"  # bank, contant, automatisch

class BetalingUpdate(BaseModel):
    datum: Optional[str] = None
    bedrag: Optional[float] = None
    rekening_id: Optional[str] = None
    omschrijving: Optional[str] = None
    referentie: Optional[str] = None
    betaalmethode: Optional[str] = None

class BetalingResponse(BaseModel):
    id: str
    user_id: str
    schuld_id: str
    schuld_omschrijving: Optional[str] = None
    relatie_naam: Optional[str] = None
    datum: str
    bedrag: float
    rekening_id: Optional[str] = None
    rekening_naam: Optional[str] = None
    omschrijving: Optional[str] = None
    referentie: Optional[str] = None
    betaalmethode: str
    created_at: str

# --- Inkomsten ---
class InkomstCreate(BaseModel):
    datum: str  # YYYY-MM-DD
    bron: str  # salaris, uitkering, toeslagen, overig
    bedrag: float
    vast: bool = True  # Vast of variabel inkomen
    omschrijving: Optional[str] = None
    frequentie: str = "maandelijks"  # eenmalig, wekelijks, maandelijks, jaarlijks

class InkomstUpdate(BaseModel):
    datum: Optional[str] = None
    bron: Optional[str] = None
    bedrag: Optional[float] = None
    vast: Optional[bool] = None
    omschrijving: Optional[str] = None
    frequentie: Optional[str] = None

class InkomstResponse(BaseModel):
    id: str
    user_id: str
    datum: str
    bron: str
    bedrag: float
    vast: bool
    omschrijving: Optional[str] = None
    frequentie: str
    created_at: str
    updated_at: Optional[str] = None

# --- Uitgaven ---
class UitgaveCreate(BaseModel):
    datum: str  # YYYY-MM-DD
    categorie: str  # huur, energie, zorg, boodschappen, transport, verzekering, overig
    bedrag: float
    rekening_id: Optional[str] = None
    omschrijving: Optional[str] = None
    vast: bool = False  # Vast of variabel
    frequentie: str = "eenmalig"  # eenmalig, wekelijks, maandelijks, jaarlijks

class UitgaveUpdate(BaseModel):
    datum: Optional[str] = None
    categorie: Optional[str] = None
    bedrag: Optional[float] = None
    rekening_id: Optional[str] = None
    omschrijving: Optional[str] = None
    vast: Optional[bool] = None
    frequentie: Optional[str] = None

class UitgaveResponse(BaseModel):
    id: str
    user_id: str
    datum: str
    categorie: str
    bedrag: float
    rekening_id: Optional[str] = None
    rekening_naam: Optional[str] = None
    omschrijving: Optional[str] = None
    vast: bool
    frequentie: str
    created_at: str
    updated_at: Optional[str] = None

# --- Documenten ---
class DocumentResponse(BaseModel):
    id: str
    user_id: str
    gekoppeld_type: str  # schuld, relatie
    gekoppeld_id: str
    bestandsnaam: str
    originele_naam: str
    bestandsgrootte: int
    mime_type: str
    upload_datum: str
    omschrijving: Optional[str] = None

# --- Dashboard ---
class DashboardResponse(BaseModel):
    totale_openstaande_schuld: float
    totaal_afgelost: float
    maandelijkse_verplichtingen: float
    totaal_inkomsten_maand: float
    totaal_uitgaven_maand: float
    beschikbaar_saldo: float
    aantal_schulden: int
    aantal_actieve_regelingen: int
    grootste_schuldeiser: Optional[dict] = None
    schulden_per_status: dict
    recente_betalingen: List[dict]

# --- Planning ---
class PlanningResponse(BaseModel):
    maand: str
    jaar: int
    totaal_inkomsten: float
    vaste_lasten: float
    schuld_betalingen: float
    variabele_uitgaven: float
    vrij_besteedbaar: float
    status: str  # positief, negatief, neutraal
    details: dict


# ==================== HELPER FUNCTIONS ====================

async def get_user_db(current_user: dict = Depends(get_current_user)):
    """Get database connection with user context"""
    db = await get_db()
    return db, current_user

async def calculate_openstaand_saldo(db, schuld_id: str) -> tuple:
    """Bereken openstaand saldo voor een schuld"""
    schuld = await db.schuldbeheer_schulden.find_one({"id": schuld_id})
    if not schuld:
        return 0.0, 0.0
    
    # Tel alle betalingen op
    betalingen = await db.schuldbeheer_betalingen.find({"schuld_id": schuld_id}).to_list(1000)
    totaal_betaald = sum(b.get("bedrag", 0) for b in betalingen)
    
    oorspronkelijk = schuld.get("oorspronkelijk_bedrag", 0)
    openstaand = max(0, oorspronkelijk - totaal_betaald)
    
    return openstaand, totaal_betaald

async def generate_dossiernummer(db, user_id: str) -> str:
    """Genereer uniek dossiernummer"""
    jaar = datetime.now().year
    count = await db.schuldbeheer_schulden.count_documents({
        "user_id": user_id,
        "dossiernummer": {"$regex": f"^DOS{jaar}"}
    })
    return f"DOS{jaar}-{str(count + 1).zfill(5)}"


# ==================== BANKREKENINGEN ENDPOINTS ====================

@router.get("/rekeningen", response_model=List[BankrekeningResponse])
async def get_rekeningen(
    actief: Optional[bool] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle bankrekeningen op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if actief is not None:
        query["actief"] = actief
    
    rekeningen = await db.schuldbeheer_rekeningen.find(query, {"_id": 0}).to_list(100)
    return rekeningen

@router.post("/rekeningen", response_model=BankrekeningResponse)
async def create_rekening(
    rekening: BankrekeningCreate,
    db_user: tuple = Depends(get_user_db)
):
    """Maak nieuwe bankrekening aan"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    now = datetime.now(timezone.utc).isoformat()
    rekening_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **rekening.dict(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.schuldbeheer_rekeningen.insert_one(rekening_doc)
    rekening_doc.pop("_id", None)
    return rekening_doc

@router.put("/rekeningen/{rekening_id}", response_model=BankrekeningResponse)
async def update_rekening(
    rekening_id: str,
    rekening: BankrekeningUpdate,
    db_user: tuple = Depends(get_user_db)
):
    """Update bankrekening"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    existing = await db.schuldbeheer_rekeningen.find_one({
        "id": rekening_id,
        "user_id": user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    update_data = {k: v for k, v in rekening.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.schuldbeheer_rekeningen.update_one(
        {"id": rekening_id},
        {"$set": update_data}
    )
    
    updated = await db.schuldbeheer_rekeningen.find_one({"id": rekening_id}, {"_id": 0})
    return updated

@router.delete("/rekeningen/{rekening_id}")
async def delete_rekening(
    rekening_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder bankrekening"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    result = await db.schuldbeheer_rekeningen.delete_one({
        "id": rekening_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    return {"message": "Rekening verwijderd"}


# ==================== RELATIES (CREDITEUREN) ENDPOINTS ====================

@router.get("/relaties", response_model=List[RelatieResponse])
async def get_relaties(
    actief: Optional[bool] = None,
    type: Optional[str] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle relaties (schuldeisers) op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if actief is not None:
        query["actief"] = actief
    if type:
        query["type"] = type
    
    relaties = await db.schuldbeheer_relaties.find(query, {"_id": 0}).to_list(500)
    
    # Bereken totale schuld per relatie
    for relatie in relaties:
        schulden = await db.schuldbeheer_schulden.find({
            "relatie_id": relatie["id"],
            "status": {"$ne": "betaald"}
        }).to_list(1000)
        
        totale_schuld = 0.0
        for schuld in schulden:
            openstaand, _ = await calculate_openstaand_saldo(db, schuld["id"])
            totale_schuld += openstaand
        
        relatie["totale_schuld"] = totale_schuld
    
    return relaties

@router.get("/relaties/{relatie_id}", response_model=RelatieResponse)
async def get_relatie(
    relatie_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Haal specifieke relatie op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    relatie = await db.schuldbeheer_relaties.find_one({
        "id": relatie_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not relatie:
        raise HTTPException(status_code=404, detail="Relatie niet gevonden")
    
    # Bereken totale schuld
    schulden = await db.schuldbeheer_schulden.find({
        "relatie_id": relatie_id,
        "status": {"$ne": "betaald"}
    }).to_list(1000)
    
    totale_schuld = 0.0
    for schuld in schulden:
        openstaand, _ = await calculate_openstaand_saldo(db, schuld["id"])
        totale_schuld += openstaand
    
    relatie["totale_schuld"] = totale_schuld
    return relatie

@router.post("/relaties", response_model=RelatieResponse)
async def create_relatie(
    relatie: RelatieCreate,
    db_user: tuple = Depends(get_user_db)
):
    """Maak nieuwe relatie (schuldeiser) aan"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    now = datetime.now(timezone.utc).isoformat()
    relatie_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **relatie.dict(),
        "totale_schuld": 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.schuldbeheer_relaties.insert_one(relatie_doc)
    relatie_doc.pop("_id", None)
    return relatie_doc

@router.put("/relaties/{relatie_id}", response_model=RelatieResponse)
async def update_relatie(
    relatie_id: str,
    relatie: RelatieUpdate,
    db_user: tuple = Depends(get_user_db)
):
    """Update relatie"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    existing = await db.schuldbeheer_relaties.find_one({
        "id": relatie_id,
        "user_id": user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Relatie niet gevonden")
    
    update_data = {k: v for k, v in relatie.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.schuldbeheer_relaties.update_one(
        {"id": relatie_id},
        {"$set": update_data}
    )
    
    updated = await db.schuldbeheer_relaties.find_one({"id": relatie_id}, {"_id": 0})
    
    # Bereken totale schuld
    schulden = await db.schuldbeheer_schulden.find({
        "relatie_id": relatie_id,
        "status": {"$ne": "betaald"}
    }).to_list(1000)
    
    totale_schuld = 0.0
    for schuld in schulden:
        openstaand, _ = await calculate_openstaand_saldo(db, schuld["id"])
        totale_schuld += openstaand
    
    updated["totale_schuld"] = totale_schuld
    return updated

@router.delete("/relaties/{relatie_id}")
async def delete_relatie(
    relatie_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder relatie"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Check of er nog schulden zijn
    schulden_count = await db.schuldbeheer_schulden.count_documents({
        "relatie_id": relatie_id,
        "status": {"$ne": "betaald"}
    })
    
    if schulden_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Kan relatie niet verwijderen: er zijn nog {schulden_count} openstaande schulden"
        )
    
    result = await db.schuldbeheer_relaties.delete_one({
        "id": relatie_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Relatie niet gevonden")
    
    return {"message": "Relatie verwijderd"}


# ==================== SCHULDEN (DOSSIERS) ENDPOINTS ====================

@router.get("/schulden", response_model=List[SchuldResponse])
async def get_schulden(
    status: Optional[str] = None,
    relatie_id: Optional[str] = None,
    prioriteit: Optional[str] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle schulden op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if relatie_id:
        query["relatie_id"] = relatie_id
    if prioriteit:
        query["prioriteit"] = prioriteit
    
    schulden = await db.schuldbeheer_schulden.find(query, {"_id": 0}).to_list(500)
    
    # Voeg berekende velden en relatie info toe
    for schuld in schulden:
        openstaand, totaal_betaald = await calculate_openstaand_saldo(db, schuld["id"])
        schuld["openstaand_saldo"] = openstaand
        schuld["totaal_betaald"] = totaal_betaald
        
        # Haal relatie naam op
        relatie = await db.schuldbeheer_relaties.find_one(
            {"id": schuld.get("relatie_id")},
            {"naam": 1}
        )
        schuld["relatie_naam"] = relatie.get("naam") if relatie else None
        
        # Auto-update status naar betaald als openstaand 0 is
        if openstaand == 0 and schuld.get("status") != "betaald" and totaal_betaald > 0:
            await db.schuldbeheer_schulden.update_one(
                {"id": schuld["id"]},
                {"$set": {"status": "betaald", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            schuld["status"] = "betaald"
    
    return schulden

@router.get("/schulden/{schuld_id}", response_model=SchuldResponse)
async def get_schuld(
    schuld_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Haal specifieke schuld op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    schuld = await db.schuldbeheer_schulden.find_one({
        "id": schuld_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not schuld:
        raise HTTPException(status_code=404, detail="Schuld niet gevonden")
    
    openstaand, totaal_betaald = await calculate_openstaand_saldo(db, schuld_id)
    schuld["openstaand_saldo"] = openstaand
    schuld["totaal_betaald"] = totaal_betaald
    
    relatie = await db.schuldbeheer_relaties.find_one(
        {"id": schuld.get("relatie_id")},
        {"naam": 1}
    )
    schuld["relatie_naam"] = relatie.get("naam") if relatie else None
    
    return schuld

@router.post("/schulden", response_model=SchuldResponse)
async def create_schuld(
    schuld: SchuldCreate,
    db_user: tuple = Depends(get_user_db)
):
    """Maak nieuwe schuld (dossier) aan"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Valideer relatie
    relatie = await db.schuldbeheer_relaties.find_one({
        "id": schuld.relatie_id,
        "user_id": user_id
    })
    if not relatie:
        raise HTTPException(status_code=404, detail="Relatie niet gevonden")
    
    # Genereer dossiernummer als niet opgegeven
    dossiernummer = schuld.dossiernummer
    if not dossiernummer:
        dossiernummer = await generate_dossiernummer(db, user_id)
    
    now = datetime.now(timezone.utc).isoformat()
    schuld_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **schuld.dict(),
        "dossiernummer": dossiernummer,
        "created_at": now,
        "updated_at": now
    }
    
    await db.schuldbeheer_schulden.insert_one(schuld_doc)
    schuld_doc.pop("_id", None)
    
    schuld_doc["openstaand_saldo"] = schuld.oorspronkelijk_bedrag
    schuld_doc["totaal_betaald"] = 0.0
    schuld_doc["relatie_naam"] = relatie.get("naam")
    
    return schuld_doc

@router.put("/schulden/{schuld_id}", response_model=SchuldResponse)
async def update_schuld(
    schuld_id: str,
    schuld: SchuldUpdate,
    db_user: tuple = Depends(get_user_db)
):
    """Update schuld"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    existing = await db.schuldbeheer_schulden.find_one({
        "id": schuld_id,
        "user_id": user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Schuld niet gevonden")
    
    update_data = {k: v for k, v in schuld.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.schuldbeheer_schulden.update_one(
        {"id": schuld_id},
        {"$set": update_data}
    )
    
    updated = await db.schuldbeheer_schulden.find_one({"id": schuld_id}, {"_id": 0})
    
    openstaand, totaal_betaald = await calculate_openstaand_saldo(db, schuld_id)
    updated["openstaand_saldo"] = openstaand
    updated["totaal_betaald"] = totaal_betaald
    
    relatie = await db.schuldbeheer_relaties.find_one(
        {"id": updated.get("relatie_id")},
        {"naam": 1}
    )
    updated["relatie_naam"] = relatie.get("naam") if relatie else None
    
    return updated

@router.delete("/schulden/{schuld_id}")
async def delete_schuld(
    schuld_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder schuld"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Verwijder ook alle gekoppelde betalingen
    await db.schuldbeheer_betalingen.delete_many({"schuld_id": schuld_id})
    
    # Verwijder gekoppelde documenten
    await db.schuldbeheer_documenten.delete_many({
        "gekoppeld_type": "schuld",
        "gekoppeld_id": schuld_id
    })
    
    result = await db.schuldbeheer_schulden.delete_one({
        "id": schuld_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schuld niet gevonden")
    
    return {"message": "Schuld en gekoppelde betalingen verwijderd"}


# ==================== BETALINGEN ENDPOINTS ====================

@router.get("/betalingen", response_model=List[BetalingResponse])
async def get_betalingen(
    schuld_id: Optional[str] = None,
    datum_van: Optional[str] = None,
    datum_tot: Optional[str] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle betalingen op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if schuld_id:
        query["schuld_id"] = schuld_id
    if datum_van:
        query["datum"] = {"$gte": datum_van}
    if datum_tot:
        if "datum" in query:
            query["datum"]["$lte"] = datum_tot
        else:
            query["datum"] = {"$lte": datum_tot}
    
    betalingen = await db.schuldbeheer_betalingen.find(query, {"_id": 0}).to_list(1000)
    
    # Voeg extra info toe
    for betaling in betalingen:
        # Schuld info
        schuld = await db.schuldbeheer_schulden.find_one(
            {"id": betaling.get("schuld_id")},
            {"omschrijving": 1, "relatie_id": 1}
        )
        if schuld:
            betaling["schuld_omschrijving"] = schuld.get("omschrijving")
            relatie = await db.schuldbeheer_relaties.find_one(
                {"id": schuld.get("relatie_id")},
                {"naam": 1}
            )
            betaling["relatie_naam"] = relatie.get("naam") if relatie else None
        
        # Rekening info
        if betaling.get("rekening_id"):
            rekening = await db.schuldbeheer_rekeningen.find_one(
                {"id": betaling["rekening_id"]},
                {"naam": 1, "bank": 1}
            )
            betaling["rekening_naam"] = f"{rekening.get('bank')} - {rekening.get('naam')}" if rekening else None
    
    # Sorteer op datum (nieuwste eerst)
    betalingen.sort(key=lambda x: x.get("datum", ""), reverse=True)
    
    return betalingen

@router.post("/betalingen", response_model=BetalingResponse)
async def create_betaling(
    betaling: BetalingCreate,
    db_user: tuple = Depends(get_user_db)
):
    """Registreer nieuwe betaling"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Valideer schuld
    schuld = await db.schuldbeheer_schulden.find_one({
        "id": betaling.schuld_id,
        "user_id": user_id
    })
    if not schuld:
        raise HTTPException(status_code=404, detail="Schuld niet gevonden")
    
    now = datetime.now(timezone.utc).isoformat()
    betaling_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **betaling.dict(),
        "created_at": now
    }
    
    await db.schuldbeheer_betalingen.insert_one(betaling_doc)
    betaling_doc.pop("_id", None)
    
    # Update schuld saldo en status
    openstaand, totaal_betaald = await calculate_openstaand_saldo(db, betaling.schuld_id)
    
    update_data = {"updated_at": now}
    if openstaand == 0:
        update_data["status"] = "betaald"
    
    await db.schuldbeheer_schulden.update_one(
        {"id": betaling.schuld_id},
        {"$set": update_data}
    )
    
    # Voeg extra info toe aan response
    betaling_doc["schuld_omschrijving"] = schuld.get("omschrijving")
    relatie = await db.schuldbeheer_relaties.find_one(
        {"id": schuld.get("relatie_id")},
        {"naam": 1}
    )
    betaling_doc["relatie_naam"] = relatie.get("naam") if relatie else None
    
    return betaling_doc

@router.delete("/betalingen/{betaling_id}")
async def delete_betaling(
    betaling_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder betaling"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    betaling = await db.schuldbeheer_betalingen.find_one({
        "id": betaling_id,
        "user_id": user_id
    })
    
    if not betaling:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    schuld_id = betaling.get("schuld_id")
    
    result = await db.schuldbeheer_betalingen.delete_one({"id": betaling_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    # Update schuld status terug naar open/regeling als nodig
    if schuld_id:
        schuld = await db.schuldbeheer_schulden.find_one({"id": schuld_id})
        if schuld and schuld.get("status") == "betaald":
            openstaand, _ = await calculate_openstaand_saldo(db, schuld_id)
            if openstaand > 0:
                new_status = "regeling" if schuld.get("maandbedrag", 0) > 0 else "open"
                await db.schuldbeheer_schulden.update_one(
                    {"id": schuld_id},
                    {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
    
    return {"message": "Betaling verwijderd"}


# ==================== INKOMSTEN ENDPOINTS ====================

@router.get("/inkomsten", response_model=List[InkomstResponse])
async def get_inkomsten(
    bron: Optional[str] = None,
    vast: Optional[bool] = None,
    maand: Optional[int] = None,
    jaar: Optional[int] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle inkomsten op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if bron:
        query["bron"] = bron
    if vast is not None:
        query["vast"] = vast
    
    # Filter op maand/jaar
    if maand and jaar:
        start_date = f"{jaar}-{str(maand).zfill(2)}-01"
        if maand == 12:
            end_date = f"{jaar + 1}-01-01"
        else:
            end_date = f"{jaar}-{str(maand + 1).zfill(2)}-01"
        query["datum"] = {"$gte": start_date, "$lt": end_date}
    elif jaar:
        query["datum"] = {"$gte": f"{jaar}-01-01", "$lt": f"{jaar + 1}-01-01"}
    
    inkomsten = await db.schuldbeheer_inkomsten.find(query, {"_id": 0}).to_list(1000)
    inkomsten.sort(key=lambda x: x.get("datum", ""), reverse=True)
    
    return inkomsten

@router.post("/inkomsten", response_model=InkomstResponse)
async def create_inkomst(
    inkomst: InkomstCreate,
    db_user: tuple = Depends(get_user_db)
):
    """Registreer nieuwe inkomst"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    now = datetime.now(timezone.utc).isoformat()
    inkomst_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **inkomst.dict(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.schuldbeheer_inkomsten.insert_one(inkomst_doc)
    inkomst_doc.pop("_id", None)
    return inkomst_doc

@router.put("/inkomsten/{inkomst_id}", response_model=InkomstResponse)
async def update_inkomst(
    inkomst_id: str,
    inkomst: InkomstUpdate,
    db_user: tuple = Depends(get_user_db)
):
    """Update inkomst"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    existing = await db.schuldbeheer_inkomsten.find_one({
        "id": inkomst_id,
        "user_id": user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Inkomst niet gevonden")
    
    update_data = {k: v for k, v in inkomst.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.schuldbeheer_inkomsten.update_one(
        {"id": inkomst_id},
        {"$set": update_data}
    )
    
    updated = await db.schuldbeheer_inkomsten.find_one({"id": inkomst_id}, {"_id": 0})
    return updated

@router.delete("/inkomsten/{inkomst_id}")
async def delete_inkomst(
    inkomst_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder inkomst"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    result = await db.schuldbeheer_inkomsten.delete_one({
        "id": inkomst_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inkomst niet gevonden")
    
    return {"message": "Inkomst verwijderd"}


# ==================== UITGAVEN ENDPOINTS ====================

@router.get("/uitgaven", response_model=List[UitgaveResponse])
async def get_uitgaven(
    categorie: Optional[str] = None,
    vast: Optional[bool] = None,
    maand: Optional[int] = None,
    jaar: Optional[int] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle uitgaven op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if categorie:
        query["categorie"] = categorie
    if vast is not None:
        query["vast"] = vast
    
    # Filter op maand/jaar
    if maand and jaar:
        start_date = f"{jaar}-{str(maand).zfill(2)}-01"
        if maand == 12:
            end_date = f"{jaar + 1}-01-01"
        else:
            end_date = f"{jaar}-{str(maand + 1).zfill(2)}-01"
        query["datum"] = {"$gte": start_date, "$lt": end_date}
    elif jaar:
        query["datum"] = {"$gte": f"{jaar}-01-01", "$lt": f"{jaar + 1}-01-01"}
    
    uitgaven = await db.schuldbeheer_uitgaven.find(query, {"_id": 0}).to_list(1000)
    
    # Voeg rekening info toe
    for uitgave in uitgaven:
        if uitgave.get("rekening_id"):
            rekening = await db.schuldbeheer_rekeningen.find_one(
                {"id": uitgave["rekening_id"]},
                {"naam": 1, "bank": 1}
            )
            uitgave["rekening_naam"] = f"{rekening.get('bank')} - {rekening.get('naam')}" if rekening else None
    
    uitgaven.sort(key=lambda x: x.get("datum", ""), reverse=True)
    return uitgaven

@router.post("/uitgaven", response_model=UitgaveResponse)
async def create_uitgave(
    uitgave: UitgaveCreate,
    db_user: tuple = Depends(get_user_db)
):
    """Registreer nieuwe uitgave"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    now = datetime.now(timezone.utc).isoformat()
    uitgave_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **uitgave.dict(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.schuldbeheer_uitgaven.insert_one(uitgave_doc)
    uitgave_doc.pop("_id", None)
    return uitgave_doc

@router.put("/uitgaven/{uitgave_id}", response_model=UitgaveResponse)
async def update_uitgave(
    uitgave_id: str,
    uitgave: UitgaveUpdate,
    db_user: tuple = Depends(get_user_db)
):
    """Update uitgave"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    existing = await db.schuldbeheer_uitgaven.find_one({
        "id": uitgave_id,
        "user_id": user_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Uitgave niet gevonden")
    
    update_data = {k: v for k, v in uitgave.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.schuldbeheer_uitgaven.update_one(
        {"id": uitgave_id},
        {"$set": update_data}
    )
    
    updated = await db.schuldbeheer_uitgaven.find_one({"id": uitgave_id}, {"_id": 0})
    return updated

@router.delete("/uitgaven/{uitgave_id}")
async def delete_uitgave(
    uitgave_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder uitgave"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    result = await db.schuldbeheer_uitgaven.delete_one({
        "id": uitgave_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Uitgave niet gevonden")
    
    return {"message": "Uitgave verwijderd"}


# ==================== DASHBOARD ENDPOINT ====================

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    db_user: tuple = Depends(get_user_db)
):
    """Haal dashboard overzicht op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Bereken totale openstaande schuld
    schulden = await db.schuldbeheer_schulden.find({
        "user_id": user_id,
        "status": {"$ne": "betaald"}
    }, {"_id": 0}).to_list(1000)
    
    totale_openstaande_schuld = 0.0
    totaal_afgelost = 0.0
    maandelijkse_verplichtingen = 0.0
    
    for schuld in schulden:
        openstaand, betaald = await calculate_openstaand_saldo(db, schuld["id"])
        totale_openstaande_schuld += openstaand
        totaal_afgelost += betaald
        maandelijkse_verplichtingen += schuld.get("maandbedrag", 0)
    
    # Betaalde schulden ook meetellen voor totaal afgelost
    betaalde_schulden = await db.schuldbeheer_schulden.find({
        "user_id": user_id,
        "status": "betaald"
    }).to_list(1000)
    
    for schuld in betaalde_schulden:
        _, betaald = await calculate_openstaand_saldo(db, schuld["id"])
        totaal_afgelost += betaald
    
    # Huidige maand inkomsten en uitgaven
    now = datetime.now()
    maand_start = f"{now.year}-{str(now.month).zfill(2)}-01"
    if now.month == 12:
        maand_end = f"{now.year + 1}-01-01"
    else:
        maand_end = f"{now.year}-{str(now.month + 1).zfill(2)}-01"
    
    inkomsten_maand = await db.schuldbeheer_inkomsten.find({
        "user_id": user_id,
        "datum": {"$gte": maand_start, "$lt": maand_end}
    }).to_list(1000)
    totaal_inkomsten_maand = sum(i.get("bedrag", 0) for i in inkomsten_maand)
    
    uitgaven_maand = await db.schuldbeheer_uitgaven.find({
        "user_id": user_id,
        "datum": {"$gte": maand_start, "$lt": maand_end}
    }).to_list(1000)
    totaal_uitgaven_maand = sum(u.get("bedrag", 0) for u in uitgaven_maand)
    
    # Beschikbaar saldo
    beschikbaar_saldo = totaal_inkomsten_maand - totaal_uitgaven_maand - maandelijkse_verplichtingen
    
    # Schulden per status
    alle_schulden = await db.schuldbeheer_schulden.find({"user_id": user_id}).to_list(1000)
    schulden_per_status = {
        "open": 0,
        "regeling": 0,
        "betaald": 0,
        "betwist": 0
    }
    for s in alle_schulden:
        status = s.get("status", "open")
        if status in schulden_per_status:
            schulden_per_status[status] += 1
    
    # Grootste schuldeiser
    grootste_schuldeiser = None
    schuld_per_relatie = {}
    
    for schuld in schulden:
        relatie_id = schuld.get("relatie_id")
        if relatie_id:
            openstaand, _ = await calculate_openstaand_saldo(db, schuld["id"])
            if relatie_id not in schuld_per_relatie:
                schuld_per_relatie[relatie_id] = 0
            schuld_per_relatie[relatie_id] += openstaand
    
    if schuld_per_relatie:
        max_relatie_id = max(schuld_per_relatie, key=schuld_per_relatie.get)
        relatie = await db.schuldbeheer_relaties.find_one({"id": max_relatie_id}, {"_id": 0, "naam": 1})
        if relatie:
            grootste_schuldeiser = {
                "naam": relatie.get("naam"),
                "bedrag": schuld_per_relatie[max_relatie_id]
            }
    
    # Recente betalingen (laatste 5)
    recente_betalingen_raw = await db.schuldbeheer_betalingen.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("datum", -1).limit(5).to_list(5)
    
    recente_betalingen = []
    for b in recente_betalingen_raw:
        schuld = await db.schuldbeheer_schulden.find_one({"id": b.get("schuld_id")})
        relatie = None
        if schuld:
            relatie = await db.schuldbeheer_relaties.find_one({"id": schuld.get("relatie_id")})
        
        recente_betalingen.append({
            "id": b.get("id"),
            "datum": b.get("datum"),
            "bedrag": b.get("bedrag"),
            "schuld_omschrijving": schuld.get("omschrijving") if schuld else None,
            "relatie_naam": relatie.get("naam") if relatie else None
        })
    
    return DashboardResponse(
        totale_openstaande_schuld=totale_openstaande_schuld,
        totaal_afgelost=totaal_afgelost,
        maandelijkse_verplichtingen=maandelijkse_verplichtingen,
        totaal_inkomsten_maand=totaal_inkomsten_maand,
        totaal_uitgaven_maand=totaal_uitgaven_maand,
        beschikbaar_saldo=beschikbaar_saldo,
        aantal_schulden=len(alle_schulden),
        aantal_actieve_regelingen=schulden_per_status.get("regeling", 0),
        grootste_schuldeiser=grootste_schuldeiser,
        schulden_per_status=schulden_per_status,
        recente_betalingen=recente_betalingen
    )


# ==================== PLANNING ENDPOINT ====================

@router.get("/planning", response_model=PlanningResponse)
async def get_planning(
    maand: Optional[int] = None,
    jaar: Optional[int] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal maandplanning op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Default naar huidige maand
    now = datetime.now()
    maand = maand or now.month
    jaar = jaar or now.year
    
    maand_start = f"{jaar}-{str(maand).zfill(2)}-01"
    if maand == 12:
        maand_end = f"{jaar + 1}-01-01"
    else:
        maand_end = f"{jaar}-{str(maand + 1).zfill(2)}-01"
    
    # Inkomsten deze maand (inclusief vaste maandelijkse inkomsten)
    inkomsten = await db.schuldbeheer_inkomsten.find({
        "user_id": user_id,
        "$or": [
            {"datum": {"$gte": maand_start, "$lt": maand_end}},
            {"vast": True, "frequentie": "maandelijks"}
        ]
    }).to_list(1000)
    
    totaal_inkomsten = sum(i.get("bedrag", 0) for i in inkomsten)
    
    # Vaste lasten (vaste uitgaven)
    vaste_uitgaven = await db.schuldbeheer_uitgaven.find({
        "user_id": user_id,
        "vast": True
    }).to_list(1000)
    
    vaste_lasten = sum(u.get("bedrag", 0) for u in vaste_uitgaven if u.get("frequentie") == "maandelijks")
    
    # Schuld betalingen (maandbedragen)
    schulden = await db.schuldbeheer_schulden.find({
        "user_id": user_id,
        "status": {"$in": ["open", "regeling"]}
    }).to_list(1000)
    
    schuld_betalingen = sum(s.get("maandbedrag", 0) for s in schulden)
    
    # Variabele uitgaven deze maand
    variabele_uitgaven_list = await db.schuldbeheer_uitgaven.find({
        "user_id": user_id,
        "vast": False,
        "datum": {"$gte": maand_start, "$lt": maand_end}
    }).to_list(1000)
    
    variabele_uitgaven = sum(u.get("bedrag", 0) for u in variabele_uitgaven_list)
    
    # Vrij besteedbaar
    vrij_besteedbaar = totaal_inkomsten - vaste_lasten - schuld_betalingen - variabele_uitgaven
    
    # Status bepalen
    if vrij_besteedbaar > 100:
        status = "positief"
    elif vrij_besteedbaar < -100:
        status = "negatief"
    else:
        status = "neutraal"
    
    return PlanningResponse(
        maand=f"{jaar}-{str(maand).zfill(2)}",
        jaar=jaar,
        totaal_inkomsten=totaal_inkomsten,
        vaste_lasten=vaste_lasten,
        schuld_betalingen=schuld_betalingen,
        variabele_uitgaven=variabele_uitgaven,
        vrij_besteedbaar=vrij_besteedbaar,
        status=status,
        details={
            "inkomsten_items": len(inkomsten),
            "vaste_lasten_items": len(vaste_uitgaven),
            "schulden_met_regeling": len([s for s in schulden if s.get("maandbedrag", 0) > 0]),
            "variabele_uitgaven_items": len(variabele_uitgaven_list)
        }
    )


# ==================== RAPPORTAGES ENDPOINTS ====================

@router.get("/rapportages/schuld-per-schuldeiser")
async def rapport_schuld_per_schuldeiser(
    db_user: tuple = Depends(get_user_db)
):
    """Rapport: Schuld per schuldeiser"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    relaties = await db.schuldbeheer_relaties.find(
        {"user_id": user_id, "actief": True},
        {"_id": 0}
    ).to_list(500)
    
    rapport = []
    for relatie in relaties:
        schulden = await db.schuldbeheer_schulden.find({
            "relatie_id": relatie["id"],
            "status": {"$ne": "betaald"}
        }).to_list(1000)
        
        totaal_oorspronkelijk = 0.0
        totaal_openstaand = 0.0
        totaal_betaald = 0.0
        
        for schuld in schulden:
            openstaand, betaald = await calculate_openstaand_saldo(db, schuld["id"])
            totaal_oorspronkelijk += schuld.get("oorspronkelijk_bedrag", 0)
            totaal_openstaand += openstaand
            totaal_betaald += betaald
        
        if totaal_oorspronkelijk > 0 or totaal_openstaand > 0:
            rapport.append({
                "relatie_id": relatie["id"],
                "relatie_naam": relatie.get("naam"),
                "relatie_type": relatie.get("type"),
                "aantal_schulden": len(schulden),
                "totaal_oorspronkelijk": totaal_oorspronkelijk,
                "totaal_openstaand": totaal_openstaand,
                "totaal_betaald": totaal_betaald,
                "percentage_afgelost": round((totaal_betaald / totaal_oorspronkelijk * 100) if totaal_oorspronkelijk > 0 else 0, 1)
            })
    
    # Sorteer op openstaand bedrag (hoogste eerst)
    rapport.sort(key=lambda x: x["totaal_openstaand"], reverse=True)
    
    return {
        "rapport": rapport,
        "totalen": {
            "totaal_schuldeisers": len(rapport),
            "totaal_oorspronkelijk": sum(r["totaal_oorspronkelijk"] for r in rapport),
            "totaal_openstaand": sum(r["totaal_openstaand"] for r in rapport),
            "totaal_betaald": sum(r["totaal_betaald"] for r in rapport)
        }
    }

@router.get("/rapportages/schuld-per-categorie")
async def rapport_schuld_per_categorie(
    db_user: tuple = Depends(get_user_db)
):
    """Rapport: Schuld per categorie (relatie type)"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Alle schulden ophalen
    schulden = await db.schuldbeheer_schulden.find({
        "user_id": user_id,
        "status": {"$ne": "betaald"}
    }).to_list(1000)
    
    categorie_data = {}
    
    for schuld in schulden:
        relatie = await db.schuldbeheer_relaties.find_one({"id": schuld.get("relatie_id")})
        categorie = relatie.get("type", "overig") if relatie else "overig"
        
        if categorie not in categorie_data:
            categorie_data[categorie] = {
                "categorie": categorie,
                "aantal_schulden": 0,
                "totaal_oorspronkelijk": 0.0,
                "totaal_openstaand": 0.0,
                "totaal_betaald": 0.0
            }
        
        openstaand, betaald = await calculate_openstaand_saldo(db, schuld["id"])
        categorie_data[categorie]["aantal_schulden"] += 1
        categorie_data[categorie]["totaal_oorspronkelijk"] += schuld.get("oorspronkelijk_bedrag", 0)
        categorie_data[categorie]["totaal_openstaand"] += openstaand
        categorie_data[categorie]["totaal_betaald"] += betaald
    
    rapport = list(categorie_data.values())
    rapport.sort(key=lambda x: x["totaal_openstaand"], reverse=True)
    
    return {
        "rapport": rapport,
        "totalen": {
            "totaal_categorieen": len(rapport),
            "totaal_schulden": sum(r["aantal_schulden"] for r in rapport),
            "totaal_openstaand": sum(r["totaal_openstaand"] for r in rapport)
        }
    }

@router.get("/rapportages/betaalhistorie")
async def rapport_betaalhistorie(
    maanden: int = 12,
    db_user: tuple = Depends(get_user_db)
):
    """Rapport: Betaalhistorie per maand"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    now = datetime.now()
    rapport = []
    
    for i in range(maanden):
        # Bereken maand
        maand = now.month - i
        jaar = now.year
        while maand <= 0:
            maand += 12
            jaar -= 1
        
        maand_start = f"{jaar}-{str(maand).zfill(2)}-01"
        if maand == 12:
            maand_end = f"{jaar + 1}-01-01"
        else:
            maand_end = f"{jaar}-{str(maand + 1).zfill(2)}-01"
        
        betalingen = await db.schuldbeheer_betalingen.find({
            "user_id": user_id,
            "datum": {"$gte": maand_start, "$lt": maand_end}
        }).to_list(1000)
        
        totaal = sum(b.get("bedrag", 0) for b in betalingen)
        
        rapport.append({
            "maand": maand_start[:7],
            "jaar": jaar,
            "maand_nummer": maand,
            "aantal_betalingen": len(betalingen),
            "totaal_betaald": totaal
        })
    
    rapport.reverse()
    
    return {
        "rapport": rapport,
        "totalen": {
            "totaal_betalingen": sum(r["aantal_betalingen"] for r in rapport),
            "totaal_bedrag": sum(r["totaal_betaald"] for r in rapport),
            "gemiddeld_per_maand": sum(r["totaal_betaald"] for r in rapport) / max(len(rapport), 1)
        }
    }

@router.get("/rapportages/cashflow")
async def rapport_cashflow(
    maanden: int = 6,
    db_user: tuple = Depends(get_user_db)
):
    """Rapport: Maandelijkse cashflow"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    now = datetime.now()
    rapport = []
    
    for i in range(maanden):
        maand = now.month - i
        jaar = now.year
        while maand <= 0:
            maand += 12
            jaar -= 1
        
        maand_start = f"{jaar}-{str(maand).zfill(2)}-01"
        if maand == 12:
            maand_end = f"{jaar + 1}-01-01"
        else:
            maand_end = f"{jaar}-{str(maand + 1).zfill(2)}-01"
        
        # Inkomsten
        inkomsten = await db.schuldbeheer_inkomsten.find({
            "user_id": user_id,
            "datum": {"$gte": maand_start, "$lt": maand_end}
        }).to_list(1000)
        totaal_inkomsten = sum(i.get("bedrag", 0) for i in inkomsten)
        
        # Uitgaven
        uitgaven = await db.schuldbeheer_uitgaven.find({
            "user_id": user_id,
            "datum": {"$gte": maand_start, "$lt": maand_end}
        }).to_list(1000)
        totaal_uitgaven = sum(u.get("bedrag", 0) for u in uitgaven)
        
        # Schuld betalingen
        betalingen = await db.schuldbeheer_betalingen.find({
            "user_id": user_id,
            "datum": {"$gte": maand_start, "$lt": maand_end}
        }).to_list(1000)
        totaal_betalingen = sum(b.get("bedrag", 0) for b in betalingen)
        
        netto = totaal_inkomsten - totaal_uitgaven - totaal_betalingen
        
        rapport.append({
            "maand": maand_start[:7],
            "inkomsten": totaal_inkomsten,
            "uitgaven": totaal_uitgaven,
            "schuld_betalingen": totaal_betalingen,
            "netto": netto,
            "status": "positief" if netto > 0 else ("negatief" if netto < 0 else "neutraal")
        })
    
    rapport.reverse()
    
    return {
        "rapport": rapport,
        "totalen": {
            "totaal_inkomsten": sum(r["inkomsten"] for r in rapport),
            "totaal_uitgaven": sum(r["uitgaven"] for r in rapport),
            "totaal_schuld_betalingen": sum(r["schuld_betalingen"] for r in rapport),
            "totaal_netto": sum(r["netto"] for r in rapport)
        }
    }

@router.get("/rapportages/jaaroverzicht")
async def rapport_jaaroverzicht(
    jaar: Optional[int] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Rapport: Jaaroverzicht inkomsten/uitgaven"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    jaar = jaar or datetime.now().year
    jaar_start = f"{jaar}-01-01"
    jaar_end = f"{jaar + 1}-01-01"
    
    # Inkomsten per bron
    inkomsten = await db.schuldbeheer_inkomsten.find({
        "user_id": user_id,
        "datum": {"$gte": jaar_start, "$lt": jaar_end}
    }).to_list(10000)
    
    inkomsten_per_bron = {}
    for i in inkomsten:
        bron = i.get("bron", "overig")
        if bron not in inkomsten_per_bron:
            inkomsten_per_bron[bron] = 0.0
        inkomsten_per_bron[bron] += i.get("bedrag", 0)
    
    # Uitgaven per categorie
    uitgaven = await db.schuldbeheer_uitgaven.find({
        "user_id": user_id,
        "datum": {"$gte": jaar_start, "$lt": jaar_end}
    }).to_list(10000)
    
    uitgaven_per_categorie = {}
    for u in uitgaven:
        cat = u.get("categorie", "overig")
        if cat not in uitgaven_per_categorie:
            uitgaven_per_categorie[cat] = 0.0
        uitgaven_per_categorie[cat] += u.get("bedrag", 0)
    
    # Schuld betalingen
    betalingen = await db.schuldbeheer_betalingen.find({
        "user_id": user_id,
        "datum": {"$gte": jaar_start, "$lt": jaar_end}
    }).to_list(10000)
    totaal_betalingen = sum(b.get("bedrag", 0) for b in betalingen)
    
    totaal_inkomsten = sum(inkomsten_per_bron.values())
    totaal_uitgaven = sum(uitgaven_per_categorie.values())
    
    return {
        "jaar": jaar,
        "inkomsten": {
            "totaal": totaal_inkomsten,
            "per_bron": inkomsten_per_bron
        },
        "uitgaven": {
            "totaal": totaal_uitgaven,
            "per_categorie": uitgaven_per_categorie
        },
        "schuld_betalingen": totaal_betalingen,
        "netto": totaal_inkomsten - totaal_uitgaven - totaal_betalingen,
        "samenvatting": {
            "gemiddeld_inkomen_per_maand": totaal_inkomsten / 12,
            "gemiddelde_uitgaven_per_maand": totaal_uitgaven / 12,
            "gemiddelde_schuld_betaling_per_maand": totaal_betalingen / 12
        }
    }


# ==================== DOCUMENTEN ENDPOINTS ====================

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "schuldbeheer"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".doc", ".docx", ".xls", ".xlsx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.get("/documenten", response_model=List[DocumentResponse])
async def get_documenten(
    gekoppeld_type: Optional[str] = None,
    gekoppeld_id: Optional[str] = None,
    db_user: tuple = Depends(get_user_db)
):
    """Haal alle documenten op"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if gekoppeld_type:
        query["gekoppeld_type"] = gekoppeld_type
    if gekoppeld_id:
        query["gekoppeld_id"] = gekoppeld_id
    
    documenten = await db.schuldbeheer_documenten.find(query, {"_id": 0}).to_list(1000)
    return documenten

@router.post("/documenten", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    gekoppeld_type: str = Form(...),
    gekoppeld_id: str = Form(...),
    omschrijving: Optional[str] = Form(None),
    db_user: tuple = Depends(get_user_db)
):
    """Upload een document"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Valideer bestandstype
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Bestandstype niet toegestaan. Toegestane types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Lees bestand
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Bestand te groot. Maximum is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Genereer unieke bestandsnaam
    doc_id = str(uuid.uuid4())
    bestandsnaam = f"{doc_id}{file_ext}"
    
    # Maak user directory
    user_dir = UPLOAD_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Sla bestand op
    file_path = user_dir / bestandsnaam
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": doc_id,
        "user_id": user_id,
        "gekoppeld_type": gekoppeld_type,
        "gekoppeld_id": gekoppeld_id,
        "bestandsnaam": bestandsnaam,
        "originele_naam": file.filename,
        "bestandsgrootte": len(content),
        "mime_type": file.content_type or "application/octet-stream",
        "upload_datum": now,
        "omschrijving": omschrijving
    }
    
    await db.schuldbeheer_documenten.insert_one(doc)
    doc.pop("_id", None)
    
    return doc

@router.get("/documenten/{document_id}/download")
async def download_document(
    document_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Download een document"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    doc = await db.schuldbeheer_documenten.find_one({
        "id": document_id,
        "user_id": user_id
    })
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    file_path = UPLOAD_DIR / user_id / doc["bestandsnaam"]
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Bestand niet gevonden op server")
    
    async def file_iterator():
        async with aiofiles.open(file_path, 'rb') as f:
            while chunk := await f.read(8192):
                yield chunk
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        file_iterator(),
        media_type=doc.get("mime_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f'attachment; filename="{doc["originele_naam"]}"'
        }
    )

@router.delete("/documenten/{document_id}")
async def delete_document(
    document_id: str,
    db_user: tuple = Depends(get_user_db)
):
    """Verwijder een document"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    doc = await db.schuldbeheer_documenten.find_one({
        "id": document_id,
        "user_id": user_id
    })
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    # Verwijder bestand
    file_path = UPLOAD_DIR / user_id / doc["bestandsnaam"]
    if file_path.exists():
        file_path.unlink()
    
    # Verwijder record
    await db.schuldbeheer_documenten.delete_one({"id": document_id})
    
    return {"message": "Document verwijderd"}


# ==================== STATISTIEKEN ENDPOINT ====================

@router.get("/statistieken")
async def get_statistieken(
    db_user: tuple = Depends(get_user_db)
):
    """Haal algemene statistieken op voor grafieken"""
    db, current_user = db_user
    user_id = current_user["id"]
    
    # Schuldontwikkeling laatste 12 maanden
    now = datetime.now()
    schuld_ontwikkeling = []
    
    alle_schulden = await db.schuldbeheer_schulden.find({"user_id": user_id}).to_list(1000)
    
    for i in range(12):
        maand = now.month - i
        jaar = now.year
        while maand <= 0:
            maand += 12
            jaar -= 1
        
        maand_end = f"{jaar}-{str(maand).zfill(2)}-01"
        
        # Bereken schuld stand op begin van maand
        totaal_openstaand = 0.0
        for schuld in alle_schulden:
            # Tel alleen betalingen vóór deze maand
            betalingen = await db.schuldbeheer_betalingen.find({
                "schuld_id": schuld["id"],
                "datum": {"$lt": maand_end}
            }).to_list(1000)
            totaal_betaald = sum(b.get("bedrag", 0) for b in betalingen)
            
            oorspronkelijk = schuld.get("oorspronkelijk_bedrag", 0)
            openstaand = max(0, oorspronkelijk - totaal_betaald)
            totaal_openstaand += openstaand
        
        schuld_ontwikkeling.append({
            "maand": f"{jaar}-{str(maand).zfill(2)}",
            "openstaand": totaal_openstaand
        })
    
    schuld_ontwikkeling.reverse()
    
    return {
        "schuld_ontwikkeling": schuld_ontwikkeling,
        "valuta": "EUR"
    }
