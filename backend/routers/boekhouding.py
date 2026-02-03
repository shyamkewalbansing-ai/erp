"""
Boekhouding Module - Complete Accounting Solution for Surinamese Businesses
Supports multi-currency: SRD, USD, EUR
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from .deps import db, get_current_active_user, get_current_user

router = APIRouter(prefix="/api/boekhouding", tags=["Boekhouding"])

# ==================== ENUMS ====================

class Currency(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class AccountType(str, Enum):
    ASSET = "activa"
    LIABILITY = "passiva"
    EQUITY = "eigen_vermogen"
    REVENUE = "opbrengsten"
    EXPENSE = "kosten"

class BTWTarief(str, Enum):
    NUL = "0"
    LAAG = "10"
    HOOG = "25"

# ==================== MODELS ====================

class RekeningCreate(BaseModel):
    code: str
    naam: str
    type: AccountType
    beschrijving: Optional[str] = None
    standaard_valuta: Currency = Currency.SRD
    is_actief: bool = True

class RekeningUpdate(BaseModel):
    naam: Optional[str] = None
    beschrijving: Optional[str] = None
    standaard_valuta: Optional[Currency] = None
    is_actief: Optional[bool] = None

class RekeningResponse(BaseModel):
    id: str
    code: str
    naam: str
    type: str
    beschrijving: Optional[str] = None
    standaard_valuta: str
    is_actief: bool
    saldo: float = 0
    saldo_valuta: str = "SRD"
    created_at: str
    user_id: str

class JournaalRegelCreate(BaseModel):
    rekening_id: str
    rekening_code: Optional[str] = None
    rekening_naam: Optional[str] = None
    debet: float = 0
    credit: float = 0
    omschrijving: Optional[str] = None

class JournaalpostCreate(BaseModel):
    datum: str
    omschrijving: str
    valuta: Currency = Currency.SRD
    regels: List[JournaalRegelCreate]
    referentie: Optional[str] = None

class JournaalpostResponse(BaseModel):
    id: str
    boekstuknummer: str
    datum: str
    omschrijving: str
    valuta: str
    totaal_debet: float
    totaal_credit: float
    regels: List[dict]
    referentie: Optional[str] = None
    created_at: str
    user_id: str

class DebiteurCreate(BaseModel):
    naam: str
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    btw_nummer: Optional[str] = None
    standaard_valuta: Currency = Currency.SRD
    betalingstermijn: int = 30
    notities: Optional[str] = None

class DebiteurUpdate(BaseModel):
    naam: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    btw_nummer: Optional[str] = None
    standaard_valuta: Optional[Currency] = None
    betalingstermijn: Optional[int] = None
    notities: Optional[str] = None

class DebiteurResponse(BaseModel):
    id: str
    naam: str
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    btw_nummer: Optional[str] = None
    standaard_valuta: str
    betalingstermijn: int
    notities: Optional[str] = None
    openstaand_bedrag: float = 0
    openstaand_valuta: str = "SRD"
    created_at: str
    user_id: str

class CrediteurCreate(BaseModel):
    naam: str
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    btw_nummer: Optional[str] = None
    standaard_valuta: Currency = Currency.SRD
    betalingstermijn: int = 30
    notities: Optional[str] = None

class CrediteurUpdate(BaseModel):
    naam: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    btw_nummer: Optional[str] = None
    standaard_valuta: Optional[Currency] = None
    betalingstermijn: Optional[int] = None
    notities: Optional[str] = None

class CrediteurResponse(BaseModel):
    id: str
    naam: str
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    btw_nummer: Optional[str] = None
    standaard_valuta: str
    betalingstermijn: int
    notities: Optional[str] = None
    openstaand_bedrag: float = 0
    openstaand_valuta: str = "SRD"
    created_at: str
    user_id: str

class FactuurRegelCreate(BaseModel):
    omschrijving: str
    aantal: float = 1
    prijs_per_stuk: float
    btw_tarief: BTWTarief = BTWTarief.HOOG
    korting_percentage: float = 0

class VerkoopfactuurCreate(BaseModel):
    debiteur_id: str
    factuurdatum: str
    vervaldatum: Optional[str] = None
    valuta: Currency = Currency.SRD
    regels: List[FactuurRegelCreate]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None

class VerkoopfactuurResponse(BaseModel):
    id: str
    factuurnummer: str
    debiteur_id: str
    debiteur_naam: Optional[str] = None
    factuurdatum: str
    vervaldatum: str
    valuta: str
    regels: List[dict]
    subtotaal: float
    btw_bedrag: float
    totaal: float
    betaald_bedrag: float = 0
    status: str
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None
    created_at: str
    user_id: str

class InkoopfactuurCreate(BaseModel):
    crediteur_id: str
    factuurnummer_leverancier: Optional[str] = None
    factuurdatum: str
    vervaldatum: Optional[str] = None
    valuta: Currency = Currency.SRD
    regels: List[FactuurRegelCreate]
    opmerkingen: Optional[str] = None

class InkoopfactuurResponse(BaseModel):
    id: str
    factuurnummer: str
    crediteur_id: str
    crediteur_naam: Optional[str] = None
    factuurnummer_leverancier: Optional[str] = None
    factuurdatum: str
    vervaldatum: str
    valuta: str
    regels: List[dict]
    subtotaal: float
    btw_bedrag: float
    totaal: float
    betaald_bedrag: float = 0
    status: str
    opmerkingen: Optional[str] = None
    created_at: str
    user_id: str

class BankrekeningCreate(BaseModel):
    naam: str
    rekeningnummer: str
    bank_naam: str
    valuta: Currency = Currency.SRD
    beginsaldo: float = 0
    is_actief: bool = True

class BankrekeningUpdate(BaseModel):
    naam: Optional[str] = None
    bank_naam: Optional[str] = None
    is_actief: Optional[bool] = None

class BankrekeningResponse(BaseModel):
    id: str
    naam: str
    rekeningnummer: str
    bank_naam: str
    valuta: str
    huidig_saldo: float
    is_actief: bool
    created_at: str
    user_id: str

class TransactieCreate(BaseModel):
    rekening_id: str
    datum: str
    type: str
    bedrag: float
    valuta: Currency = Currency.SRD
    omschrijving: str
    categorie: Optional[str] = None
    debiteur_id: Optional[str] = None
    crediteur_id: Optional[str] = None
    factuur_id: Optional[str] = None
    referentie: Optional[str] = None

class TransactieResponse(BaseModel):
    id: str
    rekening_id: str
    rekening_naam: Optional[str] = None
    datum: str
    type: str
    bedrag: float
    valuta: str
    omschrijving: str
    categorie: Optional[str] = None
    debiteur_naam: Optional[str] = None
    crediteur_naam: Optional[str] = None
    referentie: Optional[str] = None
    created_at: str
    user_id: str

class WisselkoersCreate(BaseModel):
    van_valuta: Currency
    naar_valuta: Currency
    koers: float
    datum: Optional[str] = None

class WisselkoersResponse(BaseModel):
    id: str
    van_valuta: str
    naar_valuta: str
    koers: float
    datum: str
    created_at: str
    user_id: str

class BetalingCreate(BaseModel):
    bedrag: float
    betaaldatum: str
    betaalmethode: str = "bank"
    rekening_id: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def get_btw_percentage(tarief: BTWTarief) -> float:
    mapping = {BTWTarief.NUL: 0.0, BTWTarief.LAAG: 10.0, BTWTarief.HOOG: 25.0}
    return mapping.get(tarief, 25.0)

async def get_wisselkoers(user_id: str, van: Currency, naar: Currency) -> float:
    if van == naar:
        return 1.0
    
    rate = await db.boekhouding_wisselkoersen.find_one(
        {"user_id": user_id, "van_valuta": van.value, "naar_valuta": naar.value},
        sort=[("datum", -1)]
    )
    if rate:
        return rate["koers"]
    
    inverse = await db.boekhouding_wisselkoersen.find_one(
        {"user_id": user_id, "van_valuta": naar.value, "naar_valuta": van.value},
        sort=[("datum", -1)]
    )
    if inverse and inverse["koers"] != 0:
        return 1 / inverse["koers"]
    
    defaults = {
        (Currency.USD, Currency.SRD): 35.0,
        (Currency.EUR, Currency.SRD): 38.0,
        (Currency.USD, Currency.EUR): 0.92,
        (Currency.SRD, Currency.USD): 0.0286,
        (Currency.SRD, Currency.EUR): 0.0263,
        (Currency.EUR, Currency.USD): 1.09
    }
    return defaults.get((van, naar), 1.0)

async def genereer_boekstuknummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.boekhouding_journaalposten.count_documents({
        "user_id": user_id,
        "boekstuknummer": {"$regex": f"^{year}-"}
    })
    return f"{year}-{str(count + 1).zfill(5)}"

async def genereer_factuurnummer(user_id: str, prefix: str = "VF") -> str:
    year = datetime.now().year
    collection = "boekhouding_verkoopfacturen" if prefix == "VF" else "boekhouding_inkoopfacturen"
    count = await db[collection].count_documents({
        "user_id": user_id,
        "factuurnummer": {"$regex": f"^{prefix}{year}-"}
    })
    return f"{prefix}{year}-{str(count + 1).zfill(5)}"

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_active_user)):
    """Get accounting dashboard overview"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    debiteuren_count = await db.boekhouding_debiteuren.count_documents({"user_id": user_id})
    crediteuren_count = await db.boekhouding_crediteuren.count_documents({"user_id": user_id})
    
    openstaande_debiteuren = {"SRD": 0, "USD": 0, "EUR": 0}
    verkoopfacturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verstuurd", "gedeeltelijk_betaald", "vervallen"]}
    }).to_list(1000)
    
    for f in verkoopfacturen:
        valuta = f.get("valuta", "SRD")
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        openstaande_debiteuren[valuta] = openstaande_debiteuren.get(valuta, 0) + openstaand
    
    openstaande_crediteuren = {"SRD": 0, "USD": 0, "EUR": 0}
    inkoopfacturen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["ontvangen", "gedeeltelijk_betaald", "vervallen"]}
    }).to_list(1000)
    
    for f in inkoopfacturen:
        valuta = f.get("valuta", "SRD")
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        openstaande_crediteuren[valuta] = openstaande_crediteuren.get(valuta, 0) + openstaand
    
    bank_saldi = {"SRD": 0, "USD": 0, "EUR": 0}
    bankrekeningen = await db.boekhouding_bankrekeningen.find({
        "user_id": user_id, "is_actief": True
    }).to_list(100)
    
    for bank in bankrekeningen:
        valuta = bank.get("valuta", "SRD")
        bank_saldi[valuta] = bank_saldi.get(valuta, 0) + bank.get("huidig_saldo", 0)
    
    omzet_maand = {"SRD": 0, "USD": 0, "EUR": 0}
    facturen_maand = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "factuurdatum": {"$gte": start_of_month.strftime("%Y-%m-%d")},
        "status": {"$ne": "concept"}
    }).to_list(1000)
    
    for f in facturen_maand:
        valuta = f.get("valuta", "SRD")
        omzet_maand[valuta] = omzet_maand.get(valuta, 0) + f.get("subtotaal", 0)
    
    recente_transacties = await db.boekhouding_transacties.find(
        {"user_id": user_id}
    ).sort("datum", -1).limit(5).to_list(5)
    
    today = now.strftime("%Y-%m-%d")
    vervallen_facturen = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "vervaldatum": {"$lt": today},
        "status": {"$in": ["verstuurd", "gedeeltelijk_betaald"]}
    })
    
    return {
        "debiteuren_count": debiteuren_count,
        "crediteuren_count": crediteuren_count,
        "openstaande_debiteuren": openstaande_debiteuren,
        "openstaande_crediteuren": openstaande_crediteuren,
        "bank_saldi": bank_saldi,
        "omzet_maand": omzet_maand,
        "recente_transacties": [{**t, "_id": None} for t in recente_transacties],
        "vervallen_facturen": vervallen_facturen
    }

# ==================== GROOTBOEK REKENINGEN ====================

@router.get("/rekeningen", response_model=List[RekeningResponse])
async def get_rekeningen(
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    
    rekeningen = await db.boekhouding_rekeningen.find(query, {"_id": 0}).sort("code", 1).to_list(500)
    return [RekeningResponse(**r) for r in rekeningen]

@router.post("/rekeningen", response_model=RekeningResponse)
async def create_rekening(data: RekeningCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    existing = await db.boekhouding_rekeningen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Rekeningcode {data.code} bestaat al")
    
    rekening_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    rekening_doc = {
        "id": rekening_id,
        "user_id": user_id,
        "code": data.code,
        "naam": data.naam,
        "type": data.type.value,
        "beschrijving": data.beschrijving,
        "standaard_valuta": data.standaard_valuta.value,
        "is_actief": data.is_actief,
        "saldo": 0,
        "saldo_valuta": data.standaard_valuta.value,
        "created_at": now
    }
    
    await db.boekhouding_rekeningen.insert_one(rekening_doc)
    return RekeningResponse(**rekening_doc)

@router.put("/rekeningen/{rekening_id}", response_model=RekeningResponse)
async def update_rekening(rekening_id: str, data: RekeningUpdate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    rekening = await db.boekhouding_rekeningen.find_one({"id": rekening_id, "user_id": user_id}, {"_id": 0})
    if not rekening:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.boekhouding_rekeningen.update_one({"id": rekening_id}, {"$set": update_data})
    
    updated = await db.boekhouding_rekeningen.find_one({"id": rekening_id}, {"_id": 0})
    return RekeningResponse(**updated)

@router.delete("/rekeningen/{rekening_id}")
async def delete_rekening(rekening_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    journal_count = await db.boekhouding_journaalposten.count_documents({
        "user_id": user_id, "regels.rekening_id": rekening_id
    })
    if journal_count > 0:
        raise HTTPException(status_code=400, detail="Kan rekening niet verwijderen - er zijn boekingen aan gekoppeld")
    
    result = await db.boekhouding_rekeningen.delete_one({"id": rekening_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    return {"message": "Rekening verwijderd"}

@router.post("/rekeningen/init-standaard")
async def init_standaard_rekeningen(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    existing = await db.boekhouding_rekeningen.count_documents({"user_id": user_id})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Rekeningschema bestaat al")
    
    now = datetime.now(timezone.utc).isoformat()
    
    standaard_rekeningen = [
        {"code": "1000", "naam": "Kas", "type": "activa", "beschrijving": "Contant geld"},
        {"code": "1100", "naam": "Bank SRD", "type": "activa", "beschrijving": "Bankrekening in SRD"},
        {"code": "1110", "naam": "Bank USD", "type": "activa", "beschrijving": "Bankrekening in USD"},
        {"code": "1120", "naam": "Bank EUR", "type": "activa", "beschrijving": "Bankrekening in EUR"},
        {"code": "1300", "naam": "Debiteuren", "type": "activa", "beschrijving": "Vorderingen op klanten"},
        {"code": "1400", "naam": "Voorraad", "type": "activa", "beschrijving": "Handelsvoorraad"},
        {"code": "1500", "naam": "Te vorderen BTW", "type": "activa", "beschrijving": "Voorbelasting BTW"},
        {"code": "1600", "naam": "Inventaris", "type": "activa", "beschrijving": "Kantoorinventaris"},
        {"code": "1700", "naam": "Machines", "type": "activa", "beschrijving": "Machines en apparatuur"},
        {"code": "1800", "naam": "Gebouwen", "type": "activa", "beschrijving": "Bedrijfspanden"},
        {"code": "1900", "naam": "Transportmiddelen", "type": "activa", "beschrijving": "Voertuigen"},
        {"code": "2000", "naam": "Crediteuren", "type": "passiva", "beschrijving": "Schulden aan leveranciers"},
        {"code": "2100", "naam": "Te betalen BTW", "type": "passiva", "beschrijving": "Verschuldigde BTW"},
        {"code": "2200", "naam": "Te betalen loonbelasting", "type": "passiva", "beschrijving": "Loonheffingen"},
        {"code": "2300", "naam": "Korte termijn leningen", "type": "passiva", "beschrijving": "Leningen < 1 jaar"},
        {"code": "2400", "naam": "Lange termijn leningen", "type": "passiva", "beschrijving": "Leningen > 1 jaar"},
        {"code": "2500", "naam": "Overige schulden", "type": "passiva", "beschrijving": "Diverse te betalen"},
        {"code": "3000", "naam": "Aandelenkapitaal", "type": "eigen_vermogen", "beschrijving": "Gestort kapitaal"},
        {"code": "3100", "naam": "Reserves", "type": "eigen_vermogen", "beschrijving": "Algemene reserve"},
        {"code": "3200", "naam": "Winst lopend boekjaar", "type": "eigen_vermogen", "beschrijving": "Resultaat dit jaar"},
        {"code": "3300", "naam": "Privé", "type": "eigen_vermogen", "beschrijving": "Privé opnames"},
        {"code": "4000", "naam": "Omzet verkoop goederen", "type": "opbrengsten", "beschrijving": "Verkoop producten"},
        {"code": "4100", "naam": "Omzet dienstverlening", "type": "opbrengsten", "beschrijving": "Verkoop services"},
        {"code": "4200", "naam": "Overige opbrengsten", "type": "opbrengsten", "beschrijving": "Diverse inkomsten"},
        {"code": "4300", "naam": "Rente opbrengsten", "type": "opbrengsten", "beschrijving": "Ontvangen rente"},
        {"code": "4400", "naam": "Valuta winst", "type": "opbrengsten", "beschrijving": "Wisselkoerswinst"},
        {"code": "5000", "naam": "Inkoopwaarde verkopen", "type": "kosten", "beschrijving": "Kostprijs verkoop"},
        {"code": "5100", "naam": "Personeelskosten", "type": "kosten", "beschrijving": "Salarissen en lonen"},
        {"code": "5200", "naam": "Sociale lasten", "type": "kosten", "beschrijving": "Werkgeverslasten"},
        {"code": "5300", "naam": "Pensioenpremies", "type": "kosten", "beschrijving": "Pensioenkosten"},
        {"code": "6000", "naam": "Huurkosten", "type": "kosten", "beschrijving": "Huur bedrijfspand"},
        {"code": "6100", "naam": "Energie", "type": "kosten", "beschrijving": "EBS en water"},
        {"code": "6200", "naam": "Telefoon en internet", "type": "kosten", "beschrijving": "Communicatiekosten"},
        {"code": "6300", "naam": "Verzekeringen", "type": "kosten", "beschrijving": "Bedrijfsverzekeringen"},
        {"code": "6400", "naam": "Kantoorbenodigdheden", "type": "kosten", "beschrijving": "Kantoorkosten"},
        {"code": "6500", "naam": "Reclame en marketing", "type": "kosten", "beschrijving": "Promotiekosten"},
        {"code": "6600", "naam": "Transportkosten", "type": "kosten", "beschrijving": "Brandstof en onderhoud"},
        {"code": "6700", "naam": "Onderhoud en reparatie", "type": "kosten", "beschrijving": "Onderhoudskosten"},
        {"code": "6800", "naam": "Administratiekosten", "type": "kosten", "beschrijving": "Boekhouding etc."},
        {"code": "6900", "naam": "Bankkosten", "type": "kosten", "beschrijving": "Bankkosten en rente"},
        {"code": "7000", "naam": "Afschrijvingen", "type": "kosten", "beschrijving": "Afschrijving activa"},
        {"code": "7100", "naam": "Overige kosten", "type": "kosten", "beschrijving": "Diverse kosten"},
        {"code": "7200", "naam": "Rente kosten", "type": "kosten", "beschrijving": "Betaalde rente"},
        {"code": "7300", "naam": "Valuta verlies", "type": "kosten", "beschrijving": "Wisselkoersverlies"},
    ]
    
    rekeningen_docs = []
    for r in standaard_rekeningen:
        rekeningen_docs.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": r["code"],
            "naam": r["naam"],
            "type": r["type"],
            "beschrijving": r["beschrijving"],
            "standaard_valuta": "SRD",
            "is_actief": True,
            "saldo": 0,
            "saldo_valuta": "SRD",
            "created_at": now
        })
    
    await db.boekhouding_rekeningen.insert_many(rekeningen_docs)
    return {"message": f"{len(rekeningen_docs)} standaard rekeningen aangemaakt"}

# ==================== JOURNAALPOSTEN ====================

@router.get("/journaalposten", response_model=List[JournaalpostResponse])
async def get_journaalposten(
    start_datum: Optional[str] = None,
    eind_datum: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if start_datum:
        query["datum"] = {"$gte": start_datum}
    if eind_datum:
        if "datum" in query:
            query["datum"]["$lte"] = eind_datum
        else:
            query["datum"] = {"$lte": eind_datum}
    
    posten = await db.boekhouding_journaalposten.find(query, {"_id": 0}).sort("datum", -1).limit(limit).to_list(limit)
    return [JournaalpostResponse(**p) for p in posten]

@router.post("/journaalposten", response_model=JournaalpostResponse)
async def create_journaalpost(data: JournaalpostCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    totaal_debet = sum(r.debet for r in data.regels)
    totaal_credit = sum(r.credit for r in data.regels)
    
    if abs(totaal_debet - totaal_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Boeking is niet in balans: Debet {totaal_debet}, Credit {totaal_credit}")
    
    for regel in data.regels:
        rekening = await db.boekhouding_rekeningen.find_one({"id": regel.rekening_id, "user_id": user_id})
        if not rekening:
            raise HTTPException(status_code=404, detail=f"Rekening {regel.rekening_id} niet gevonden")
    
    post_id = str(uuid.uuid4())
    boekstuknummer = await genereer_boekstuknummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    regels_docs = []
    for regel in data.regels:
        rekening = await db.boekhouding_rekeningen.find_one({"id": regel.rekening_id}, {"_id": 0, "code": 1, "naam": 1})
        regels_docs.append({
            "rekening_id": regel.rekening_id,
            "rekening_code": rekening.get("code") if rekening else regel.rekening_code,
            "rekening_naam": rekening.get("naam") if rekening else regel.rekening_naam,
            "debet": regel.debet,
            "credit": regel.credit,
            "omschrijving": regel.omschrijving
        })
        
        saldo_change = regel.debet - regel.credit
        await db.boekhouding_rekeningen.update_one({"id": regel.rekening_id}, {"$inc": {"saldo": saldo_change}})
    
    post_doc = {
        "id": post_id,
        "user_id": user_id,
        "boekstuknummer": boekstuknummer,
        "datum": data.datum,
        "omschrijving": data.omschrijving,
        "valuta": data.valuta.value,
        "totaal_debet": totaal_debet,
        "totaal_credit": totaal_credit,
        "regels": regels_docs,
        "referentie": data.referentie,
        "created_at": now
    }
    
    await db.boekhouding_journaalposten.insert_one(post_doc)
    return JournaalpostResponse(**post_doc)

# ==================== DEBITEUREN ====================

@router.get("/debiteuren", response_model=List[DebiteurResponse])
async def get_debiteuren(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    debiteuren = await db.boekhouding_debiteuren.find({"user_id": user_id}, {"_id": 0}).sort("naam", 1).to_list(500)
    
    result = []
    for d in debiteuren:
        facturen = await db.boekhouding_verkoopfacturen.find({
            "user_id": user_id,
            "debiteur_id": d["id"],
            "status": {"$in": ["verstuurd", "gedeeltelijk_betaald", "vervallen"]}
        }).to_list(1000)
        
        openstaand = {}
        for f in facturen:
            valuta = f.get("valuta", "SRD")
            bedrag = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
            openstaand[valuta] = openstaand.get(valuta, 0) + bedrag
        
        default_valuta = d.get("standaard_valuta", "SRD")
        d["openstaand_bedrag"] = openstaand.get(default_valuta, 0)
        d["openstaand_valuta"] = default_valuta
        result.append(DebiteurResponse(**d))
    
    return result

@router.post("/debiteuren", response_model=DebiteurResponse)
async def create_debiteur(data: DebiteurCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    debiteur_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    debiteur_doc = {
        "id": debiteur_id,
        "user_id": user_id,
        "naam": data.naam,
        "email": data.email,
        "telefoon": data.telefoon,
        "adres": data.adres,
        "btw_nummer": data.btw_nummer,
        "standaard_valuta": data.standaard_valuta.value,
        "betalingstermijn": data.betalingstermijn,
        "notities": data.notities,
        "openstaand_bedrag": 0,
        "openstaand_valuta": data.standaard_valuta.value,
        "created_at": now
    }
    
    await db.boekhouding_debiteuren.insert_one(debiteur_doc)
    return DebiteurResponse(**debiteur_doc)

@router.get("/debiteuren/{debiteur_id}", response_model=DebiteurResponse)
async def get_debiteur(debiteur_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    debiteur = await db.boekhouding_debiteuren.find_one({"id": debiteur_id, "user_id": user_id}, {"_id": 0})
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return DebiteurResponse(**debiteur)

@router.put("/debiteuren/{debiteur_id}", response_model=DebiteurResponse)
async def update_debiteur(debiteur_id: str, data: DebiteurUpdate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    debiteur = await db.boekhouding_debiteuren.find_one({"id": debiteur_id, "user_id": user_id})
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.boekhouding_debiteuren.update_one({"id": debiteur_id}, {"$set": update_data})
    
    updated = await db.boekhouding_debiteuren.find_one({"id": debiteur_id}, {"_id": 0})
    return DebiteurResponse(**updated)

@router.delete("/debiteuren/{debiteur_id}")
async def delete_debiteur(debiteur_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    factuur_count = await db.boekhouding_verkoopfacturen.count_documents({"user_id": user_id, "debiteur_id": debiteur_id})
    if factuur_count > 0:
        raise HTTPException(status_code=400, detail="Kan debiteur niet verwijderen - er zijn facturen aan gekoppeld")
    
    result = await db.boekhouding_debiteuren.delete_one({"id": debiteur_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return {"message": "Debiteur verwijderd"}

# ==================== CREDITEUREN ====================

@router.get("/crediteuren", response_model=List[CrediteurResponse])
async def get_crediteuren(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    crediteuren = await db.boekhouding_crediteuren.find({"user_id": user_id}, {"_id": 0}).sort("naam", 1).to_list(500)
    
    result = []
    for c in crediteuren:
        facturen = await db.boekhouding_inkoopfacturen.find({
            "user_id": user_id,
            "crediteur_id": c["id"],
            "status": {"$in": ["ontvangen", "gedeeltelijk_betaald", "vervallen"]}
        }).to_list(1000)
        
        openstaand = {}
        for f in facturen:
            valuta = f.get("valuta", "SRD")
            bedrag = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
            openstaand[valuta] = openstaand.get(valuta, 0) + bedrag
        
        default_valuta = c.get("standaard_valuta", "SRD")
        c["openstaand_bedrag"] = openstaand.get(default_valuta, 0)
        c["openstaand_valuta"] = default_valuta
        result.append(CrediteurResponse(**c))
    
    return result

@router.post("/crediteuren", response_model=CrediteurResponse)
async def create_crediteur(data: CrediteurCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    crediteur_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    crediteur_doc = {
        "id": crediteur_id,
        "user_id": user_id,
        "naam": data.naam,
        "email": data.email,
        "telefoon": data.telefoon,
        "adres": data.adres,
        "btw_nummer": data.btw_nummer,
        "standaard_valuta": data.standaard_valuta.value,
        "betalingstermijn": data.betalingstermijn,
        "notities": data.notities,
        "openstaand_bedrag": 0,
        "openstaand_valuta": data.standaard_valuta.value,
        "created_at": now
    }
    
    await db.boekhouding_crediteuren.insert_one(crediteur_doc)
    return CrediteurResponse(**crediteur_doc)

@router.get("/crediteuren/{crediteur_id}", response_model=CrediteurResponse)
async def get_crediteur(crediteur_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    crediteur = await db.boekhouding_crediteuren.find_one({"id": crediteur_id, "user_id": user_id}, {"_id": 0})
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return CrediteurResponse(**crediteur)

@router.put("/crediteuren/{crediteur_id}", response_model=CrediteurResponse)
async def update_crediteur(crediteur_id: str, data: CrediteurUpdate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    crediteur = await db.boekhouding_crediteuren.find_one({"id": crediteur_id, "user_id": user_id})
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.boekhouding_crediteuren.update_one({"id": crediteur_id}, {"$set": update_data})
    
    updated = await db.boekhouding_crediteuren.find_one({"id": crediteur_id}, {"_id": 0})
    return CrediteurResponse(**updated)

@router.delete("/crediteuren/{crediteur_id}")
async def delete_crediteur(crediteur_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    factuur_count = await db.boekhouding_inkoopfacturen.count_documents({"user_id": user_id, "crediteur_id": crediteur_id})
    if factuur_count > 0:
        raise HTTPException(status_code=400, detail="Kan crediteur niet verwijderen - er zijn facturen aan gekoppeld")
    
    result = await db.boekhouding_crediteuren.delete_one({"id": crediteur_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return {"message": "Crediteur verwijderd"}

# ==================== VERKOOPFACTUREN ====================

@router.get("/verkoopfacturen", response_model=List[VerkoopfactuurResponse])
async def get_verkoopfacturen(
    status: Optional[str] = None,
    debiteur_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if debiteur_id:
        query["debiteur_id"] = debiteur_id
    
    facturen = await db.boekhouding_verkoopfacturen.find(query, {"_id": 0}).sort("factuurdatum", -1).to_list(500)
    return [VerkoopfactuurResponse(**f) for f in facturen]

@router.post("/verkoopfacturen", response_model=VerkoopfactuurResponse)
async def create_verkoopfactuur(data: VerkoopfactuurCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    debiteur = await db.boekhouding_debiteuren.find_one({"id": data.debiteur_id, "user_id": user_id}, {"_id": 0})
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    
    factuur_id = str(uuid.uuid4())
    factuurnummer = await genereer_factuurnummer(user_id, "VF")
    now = datetime.now(timezone.utc).isoformat()
    
    vervaldatum = data.vervaldatum
    if not vervaldatum:
        factuurdatum_dt = datetime.strptime(data.factuurdatum, "%Y-%m-%d")
        vervaldatum_dt = factuurdatum_dt + timedelta(days=debiteur.get("betalingstermijn", 30))
        vervaldatum = vervaldatum_dt.strftime("%Y-%m-%d")
    
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
            "omschrijving": regel.omschrijving,
            "aantal": regel.aantal,
            "prijs_per_stuk": regel.prijs_per_stuk,
            "btw_tarief": regel.btw_tarief.value,
            "btw_percentage": btw_perc,
            "korting_percentage": regel.korting_percentage,
            "subtotaal": regel_netto,
            "btw_bedrag": regel_btw,
            "totaal": regel_netto + regel_btw
        })
    
    totaal = subtotaal + btw_bedrag
    
    factuur_doc = {
        "id": factuur_id,
        "user_id": user_id,
        "factuurnummer": factuurnummer,
        "debiteur_id": data.debiteur_id,
        "debiteur_naam": debiteur.get("naam"),
        "factuurdatum": data.factuurdatum,
        "vervaldatum": vervaldatum,
        "valuta": data.valuta.value,
        "regels": regels_docs,
        "subtotaal": round(subtotaal, 2),
        "btw_bedrag": round(btw_bedrag, 2),
        "totaal": round(totaal, 2),
        "betaald_bedrag": 0,
        "status": "concept",
        "opmerkingen": data.opmerkingen,
        "referentie": data.referentie,
        "created_at": now
    }
    
    await db.boekhouding_verkoopfacturen.insert_one(factuur_doc)
    return VerkoopfactuurResponse(**factuur_doc)

@router.get("/verkoopfacturen/{factuur_id}", response_model=VerkoopfactuurResponse)
async def get_verkoopfactuur(factuur_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id}, {"_id": 0})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return VerkoopfactuurResponse(**factuur)

@router.put("/verkoopfacturen/{factuur_id}/status")
async def update_verkoopfactuur_status(factuur_id: str, status: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    valid_statuses = ["concept", "verstuurd", "betaald", "gedeeltelijk_betaald", "vervallen", "geannuleerd"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Ongeldige status. Kies uit: {valid_statuses}")
    
    result = await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": f"Status gewijzigd naar {status}"}

@router.post("/verkoopfacturen/{factuur_id}/betaling")
async def register_betaling_verkoopfactuur(
    factuur_id: str,
    data: BetalingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    nieuw_betaald = factuur.get("betaald_bedrag", 0) + data.bedrag
    totaal = factuur.get("totaal", 0)
    
    if nieuw_betaald >= totaal:
        nieuwe_status = "betaald"
    elif nieuw_betaald > 0:
        nieuwe_status = "gedeeltelijk_betaald"
    else:
        nieuwe_status = factuur.get("status")
    
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {"betaald_bedrag": nieuw_betaald, "status": nieuwe_status}}
    )
    
    transactie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transactie_doc = {
        "id": transactie_id,
        "user_id": user_id,
        "rekening_id": data.rekening_id,
        "datum": data.betaaldatum,
        "type": "inkomst",
        "bedrag": data.bedrag,
        "valuta": factuur.get("valuta", "SRD"),
        "omschrijving": f"Betaling factuur {factuur.get('factuurnummer')}",
        "categorie": "debiteuren",
        "debiteur_id": factuur.get("debiteur_id"),
        "factuur_id": factuur_id,
        "referentie": data.betaalmethode,
        "created_at": now
    }
    
    await db.boekhouding_transacties.insert_one(transactie_doc)
    
    if data.rekening_id:
        await db.boekhouding_bankrekeningen.update_one(
            {"id": data.rekening_id},
            {"$inc": {"huidig_saldo": data.bedrag}}
        )
    
    return {"message": "Betaling geregistreerd", "nieuwe_status": nieuwe_status}

@router.delete("/verkoopfacturen/{factuur_id}")
async def delete_verkoopfactuur(factuur_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    if factuur.get("status") != "concept":
        raise HTTPException(status_code=400, detail="Alleen concept facturen kunnen worden verwijderd")
    
    await db.boekhouding_verkoopfacturen.delete_one({"id": factuur_id})
    return {"message": "Factuur verwijderd"}

# ==================== INKOOPFACTUREN ====================

@router.get("/inkoopfacturen", response_model=List[InkoopfactuurResponse])
async def get_inkoopfacturen(
    status: Optional[str] = None,
    crediteur_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if crediteur_id:
        query["crediteur_id"] = crediteur_id
    
    facturen = await db.boekhouding_inkoopfacturen.find(query, {"_id": 0}).sort("factuurdatum", -1).to_list(500)
    return [InkoopfactuurResponse(**f) for f in facturen]

@router.post("/inkoopfacturen", response_model=InkoopfactuurResponse)
async def create_inkoopfactuur(data: InkoopfactuurCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    crediteur = await db.boekhouding_crediteuren.find_one({"id": data.crediteur_id, "user_id": user_id}, {"_id": 0})
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    
    factuur_id = str(uuid.uuid4())
    factuurnummer = await genereer_factuurnummer(user_id, "IF")
    now = datetime.now(timezone.utc).isoformat()
    
    vervaldatum = data.vervaldatum
    if not vervaldatum:
        factuurdatum_dt = datetime.strptime(data.factuurdatum, "%Y-%m-%d")
        vervaldatum_dt = factuurdatum_dt + timedelta(days=crediteur.get("betalingstermijn", 30))
        vervaldatum = vervaldatum_dt.strftime("%Y-%m-%d")
    
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
            "omschrijving": regel.omschrijving,
            "aantal": regel.aantal,
            "prijs_per_stuk": regel.prijs_per_stuk,
            "btw_tarief": regel.btw_tarief.value,
            "btw_percentage": btw_perc,
            "korting_percentage": regel.korting_percentage,
            "subtotaal": regel_netto,
            "btw_bedrag": regel_btw,
            "totaal": regel_netto + regel_btw
        })
    
    totaal = subtotaal + btw_bedrag
    
    factuur_doc = {
        "id": factuur_id,
        "user_id": user_id,
        "factuurnummer": factuurnummer,
        "crediteur_id": data.crediteur_id,
        "crediteur_naam": crediteur.get("naam"),
        "factuurnummer_leverancier": data.factuurnummer_leverancier,
        "factuurdatum": data.factuurdatum,
        "vervaldatum": vervaldatum,
        "valuta": data.valuta.value,
        "regels": regels_docs,
        "subtotaal": round(subtotaal, 2),
        "btw_bedrag": round(btw_bedrag, 2),
        "totaal": round(totaal, 2),
        "betaald_bedrag": 0,
        "status": "ontvangen",
        "opmerkingen": data.opmerkingen,
        "created_at": now
    }
    
    await db.boekhouding_inkoopfacturen.insert_one(factuur_doc)
    return InkoopfactuurResponse(**factuur_doc)

@router.post("/inkoopfacturen/{factuur_id}/betaling")
async def register_betaling_inkoopfactuur(
    factuur_id: str,
    data: BetalingCreate,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    factuur = await db.boekhouding_inkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    nieuw_betaald = factuur.get("betaald_bedrag", 0) + data.bedrag
    totaal = factuur.get("totaal", 0)
    
    if nieuw_betaald >= totaal:
        nieuwe_status = "betaald"
    elif nieuw_betaald > 0:
        nieuwe_status = "gedeeltelijk_betaald"
    else:
        nieuwe_status = factuur.get("status")
    
    await db.boekhouding_inkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {"betaald_bedrag": nieuw_betaald, "status": nieuwe_status}}
    )
    
    transactie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transactie_doc = {
        "id": transactie_id,
        "user_id": user_id,
        "rekening_id": data.rekening_id,
        "datum": data.betaaldatum,
        "type": "uitgave",
        "bedrag": data.bedrag,
        "valuta": factuur.get("valuta", "SRD"),
        "omschrijving": f"Betaling factuur {factuur.get('factuurnummer')}",
        "categorie": "crediteuren",
        "crediteur_id": factuur.get("crediteur_id"),
        "factuur_id": factuur_id,
        "referentie": data.betaalmethode,
        "created_at": now
    }
    
    await db.boekhouding_transacties.insert_one(transactie_doc)
    
    if data.rekening_id:
        await db.boekhouding_bankrekeningen.update_one(
            {"id": data.rekening_id},
            {"$inc": {"huidig_saldo": -data.bedrag}}
        )
    
    return {"message": "Betaling geregistreerd", "nieuwe_status": nieuwe_status}

# ==================== BANKREKENINGEN ====================

@router.get("/bankrekeningen", response_model=List[BankrekeningResponse])
async def get_bankrekeningen(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    rekeningen = await db.boekhouding_bankrekeningen.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return [BankrekeningResponse(**r) for r in rekeningen]

@router.post("/bankrekeningen", response_model=BankrekeningResponse)
async def create_bankrekening(data: BankrekeningCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    rekening_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    rekening_doc = {
        "id": rekening_id,
        "user_id": user_id,
        "naam": data.naam,
        "rekeningnummer": data.rekeningnummer,
        "bank_naam": data.bank_naam,
        "valuta": data.valuta.value,
        "huidig_saldo": data.beginsaldo,
        "beginsaldo": data.beginsaldo,
        "is_actief": data.is_actief,
        "created_at": now
    }
    
    await db.boekhouding_bankrekeningen.insert_one(rekening_doc)
    return BankrekeningResponse(**rekening_doc)

@router.put("/bankrekeningen/{rekening_id}", response_model=BankrekeningResponse)
async def update_bankrekening(rekening_id: str, data: BankrekeningUpdate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    rekening = await db.boekhouding_bankrekeningen.find_one({"id": rekening_id, "user_id": user_id})
    if not rekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.boekhouding_bankrekeningen.update_one({"id": rekening_id}, {"$set": update_data})
    
    updated = await db.boekhouding_bankrekeningen.find_one({"id": rekening_id}, {"_id": 0})
    return BankrekeningResponse(**updated)

@router.delete("/bankrekeningen/{rekening_id}")
async def delete_bankrekening(rekening_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    transactie_count = await db.boekhouding_transacties.count_documents({"user_id": user_id, "rekening_id": rekening_id})
    if transactie_count > 0:
        raise HTTPException(status_code=400, detail="Kan bankrekening niet verwijderen - er zijn transacties aan gekoppeld")
    
    result = await db.boekhouding_bankrekeningen.delete_one({"id": rekening_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    return {"message": "Bankrekening verwijderd"}

# ==================== TRANSACTIES ====================

@router.get("/transacties", response_model=List[TransactieResponse])
async def get_transacties(
    rekening_id: Optional[str] = None,
    type: Optional[str] = None,
    start_datum: Optional[str] = None,
    eind_datum: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    query = {"user_id": user_id}
    if rekening_id:
        query["rekening_id"] = rekening_id
    if type:
        query["type"] = type
    if start_datum:
        query["datum"] = {"$gte": start_datum}
    if eind_datum:
        if "datum" in query:
            query["datum"]["$lte"] = eind_datum
        else:
            query["datum"] = {"$lte": eind_datum}
    
    transacties = await db.boekhouding_transacties.find(query, {"_id": 0}).sort("datum", -1).to_list(500)
    
    result = []
    for t in transacties:
        if t.get("debiteur_id"):
            debiteur = await db.boekhouding_debiteuren.find_one({"id": t["debiteur_id"]}, {"naam": 1})
            t["debiteur_naam"] = debiteur.get("naam") if debiteur else None
        if t.get("crediteur_id"):
            crediteur = await db.boekhouding_crediteuren.find_one({"id": t["crediteur_id"]}, {"naam": 1})
            t["crediteur_naam"] = crediteur.get("naam") if crediteur else None
        if t.get("rekening_id"):
            rekening = await db.boekhouding_bankrekeningen.find_one({"id": t["rekening_id"]}, {"naam": 1})
            t["rekening_naam"] = rekening.get("naam") if rekening else None
        result.append(TransactieResponse(**t))
    
    return result

@router.post("/transacties", response_model=TransactieResponse)
async def create_transactie(data: TransactieCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    rekening = await db.boekhouding_bankrekeningen.find_one({"id": data.rekening_id, "user_id": user_id})
    if not rekening:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    transactie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transactie_doc = {
        "id": transactie_id,
        "user_id": user_id,
        "rekening_id": data.rekening_id,
        "datum": data.datum,
        "type": data.type,
        "bedrag": data.bedrag,
        "valuta": data.valuta.value,
        "omschrijving": data.omschrijving,
        "categorie": data.categorie,
        "debiteur_id": data.debiteur_id,
        "crediteur_id": data.crediteur_id,
        "factuur_id": data.factuur_id,
        "referentie": data.referentie,
        "created_at": now
    }
    
    await db.boekhouding_transacties.insert_one(transactie_doc)
    
    saldo_change = data.bedrag if data.type == "inkomst" else -data.bedrag
    await db.boekhouding_bankrekeningen.update_one({"id": data.rekening_id}, {"$inc": {"huidig_saldo": saldo_change}})
    
    transactie_doc["rekening_naam"] = rekening.get("naam")
    return TransactieResponse(**transactie_doc)

@router.delete("/transacties/{transactie_id}")
async def delete_transactie(transactie_id: str, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    transactie = await db.boekhouding_transacties.find_one({"id": transactie_id, "user_id": user_id})
    if not transactie:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    if transactie.get("rekening_id"):
        saldo_change = -transactie["bedrag"] if transactie["type"] == "inkomst" else transactie["bedrag"]
        await db.boekhouding_bankrekeningen.update_one({"id": transactie["rekening_id"]}, {"$inc": {"huidig_saldo": saldo_change}})
    
    await db.boekhouding_transacties.delete_one({"id": transactie_id})
    return {"message": "Transactie verwijderd"}

# ==================== WISSELKOERSEN ====================

@router.get("/wisselkoersen", response_model=List[WisselkoersResponse])
async def get_wisselkoersen(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    koersen = await db.boekhouding_wisselkoersen.find({"user_id": user_id}, {"_id": 0}).sort("datum", -1).to_list(100)
    return [WisselkoersResponse(**k) for k in koersen]

@router.post("/wisselkoersen", response_model=WisselkoersResponse)
async def create_wisselkoers(data: WisselkoersCreate, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    koers_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    datum = data.datum or now.strftime("%Y-%m-%d")
    
    koers_doc = {
        "id": koers_id,
        "user_id": user_id,
        "van_valuta": data.van_valuta.value,
        "naar_valuta": data.naar_valuta.value,
        "koers": data.koers,
        "datum": datum,
        "created_at": now.isoformat()
    }
    
    await db.boekhouding_wisselkoersen.insert_one(koers_doc)
    return WisselkoersResponse(**koers_doc)

@router.get("/wisselkoersen/convert")
async def convert_currency(
    bedrag: float,
    van: Currency,
    naar: Currency,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    if van == naar:
        return {"bedrag": bedrag, "valuta": naar.value, "koers": 1.0}
    
    koers = await get_wisselkoers(user_id, van, naar)
    converted = bedrag * koers
    
    return {
        "origineel_bedrag": bedrag,
        "origineel_valuta": van.value,
        "bedrag": round(converted, 2),
        "valuta": naar.value,
        "koers": koers
    }

# ==================== BTW RAPPORTAGE ====================

@router.get("/btw/aangifte")
async def get_btw_aangifte(
    start_datum: str,
    eind_datum: str,
    valuta: Currency = Currency.SRD,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    
    verkoopfacturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "factuurdatum": {"$gte": start_datum, "$lte": eind_datum},
        "status": {"$ne": "concept"}
    }).to_list(1000)
    
    omzet_hoog = btw_hoog = omzet_laag = btw_laag = omzet_nul = 0
    
    for f in verkoopfacturen:
        f_valuta = f.get("valuta", "SRD")
        koers = await get_wisselkoers(user_id, Currency(f_valuta), valuta) if f_valuta != valuta.value else 1.0
        
        for regel in f.get("regels", []):
            btw_tarief = regel.get("btw_tarief", "25")
            subtotaal = regel.get("subtotaal", 0) * koers
            btw_bedrag = regel.get("btw_bedrag", 0) * koers
            
            if btw_tarief == "25":
                omzet_hoog += subtotaal
                btw_hoog += btw_bedrag
            elif btw_tarief == "10":
                omzet_laag += subtotaal
                btw_laag += btw_bedrag
            else:
                omzet_nul += subtotaal
    
    totaal_verschuldigde_btw = btw_hoog + btw_laag
    
    inkoopfacturen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "factuurdatum": {"$gte": start_datum, "$lte": eind_datum}
    }).to_list(1000)
    
    voorbelasting = 0
    for f in inkoopfacturen:
        f_valuta = f.get("valuta", "SRD")
        koers = await get_wisselkoers(user_id, Currency(f_valuta), valuta) if f_valuta != valuta.value else 1.0
        voorbelasting += f.get("btw_bedrag", 0) * koers
    
    te_betalen = totaal_verschuldigde_btw - voorbelasting
    
    return {
        "periode": f"{start_datum} - {eind_datum}",
        "start_datum": start_datum,
        "eind_datum": eind_datum,
        "valuta": valuta.value,
        "omzet_hoog_tarief": round(omzet_hoog, 2),
        "btw_hoog_tarief": round(btw_hoog, 2),
        "omzet_laag_tarief": round(omzet_laag, 2),
        "btw_laag_tarief": round(btw_laag, 2),
        "omzet_nul_tarief": round(omzet_nul, 2),
        "totaal_verschuldigde_btw": round(totaal_verschuldigde_btw, 2),
        "voorbelasting": round(voorbelasting, 2),
        "te_betalen_btw": round(te_betalen, 2)
    }

# ==================== RAPPORTAGES ====================

@router.get("/rapportages/balans")
async def get_balans(
    datum: Optional[str] = None,
    valuta: Currency = Currency.SRD,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    if not datum:
        datum = datetime.now().strftime("%Y-%m-%d")
    
    rekeningen = await db.boekhouding_rekeningen.find({"user_id": user_id, "is_actief": True}, {"_id": 0}).to_list(500)
    
    activa = []
    passiva = []
    eigen_vermogen = []
    totaal_activa = totaal_passiva = totaal_eigen_vermogen = 0
    
    for r in rekeningen:
        saldo = r.get("saldo", 0)
        saldo_valuta = r.get("saldo_valuta", "SRD")
        
        if saldo_valuta != valuta.value:
            koers = await get_wisselkoers(user_id, Currency(saldo_valuta), valuta)
            saldo = saldo * koers
        
        item = {"code": r.get("code"), "naam": r.get("naam"), "saldo": round(saldo, 2), "valuta": valuta.value}
        
        if r.get("type") == "activa":
            activa.append(item)
            totaal_activa += saldo
        elif r.get("type") == "passiva":
            passiva.append(item)
            totaal_passiva += saldo
        elif r.get("type") == "eigen_vermogen":
            eigen_vermogen.append(item)
            totaal_eigen_vermogen += saldo
    
    return {
        "datum": datum,
        "valuta": valuta.value,
        "activa": sorted(activa, key=lambda x: x["code"]),
        "totaal_activa": round(totaal_activa, 2),
        "passiva": sorted(passiva, key=lambda x: x["code"]),
        "totaal_passiva": round(totaal_passiva, 2),
        "eigen_vermogen": sorted(eigen_vermogen, key=lambda x: x["code"]),
        "totaal_eigen_vermogen": round(totaal_eigen_vermogen, 2),
        "totaal_passiva_ev": round(totaal_passiva + totaal_eigen_vermogen, 2),
        "in_balans": abs(totaal_activa - (totaal_passiva + totaal_eigen_vermogen)) < 0.01
    }

@router.get("/rapportages/resultaat")
async def get_resultatenrekening(
    start_datum: str,
    eind_datum: str,
    valuta: Currency = Currency.SRD,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    
    rekeningen = await db.boekhouding_rekeningen.find({
        "user_id": user_id,
        "is_actief": True,
        "type": {"$in": ["opbrengsten", "kosten"]}
    }, {"_id": 0}).to_list(500)
    
    opbrengsten = []
    kosten = []
    totaal_opbrengsten = totaal_kosten = 0
    
    for r in rekeningen:
        saldo = abs(r.get("saldo", 0))
        saldo_valuta = r.get("saldo_valuta", "SRD")
        
        if saldo_valuta != valuta.value:
            koers = await get_wisselkoers(user_id, Currency(saldo_valuta), valuta)
            saldo = saldo * koers
        
        item = {"code": r.get("code"), "naam": r.get("naam"), "bedrag": round(saldo, 2), "valuta": valuta.value}
        
        if r.get("type") == "opbrengsten":
            opbrengsten.append(item)
            totaal_opbrengsten += saldo
        else:
            kosten.append(item)
            totaal_kosten += saldo
    
    resultaat = totaal_opbrengsten - totaal_kosten
    
    return {
        "periode": f"{start_datum} - {eind_datum}",
        "valuta": valuta.value,
        "opbrengsten": sorted(opbrengsten, key=lambda x: x["code"]),
        "totaal_opbrengsten": round(totaal_opbrengsten, 2),
        "kosten": sorted(kosten, key=lambda x: x["code"]),
        "totaal_kosten": round(totaal_kosten, 2),
        "resultaat": round(resultaat, 2),
        "resultaat_type": "winst" if resultaat >= 0 else "verlies"
    }

@router.get("/rapportages/openstaande-debiteuren")
async def get_openstaande_debiteuren(valuta: Optional[Currency] = None, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    today = datetime.now()
    
    facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verstuurd", "gedeeltelijk_betaald", "vervallen"]}
    }, {"_id": 0}).to_list(1000)
    
    result = []
    totalen = {"0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, "totaal": 0}
    
    for f in facturen:
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        if openstaand <= 0:
            continue
        
        vervaldatum = datetime.strptime(f.get("vervaldatum"), "%Y-%m-%d")
        dagen_over = (today - vervaldatum).days
        
        if dagen_over < 0:
            categorie = "niet_vervallen"
        elif dagen_over <= 30:
            categorie = "0-30"
        elif dagen_over <= 60:
            categorie = "31-60"
        elif dagen_over <= 90:
            categorie = "61-90"
        else:
            categorie = "90+"
        
        f_valuta = f.get("valuta", "SRD")
        if valuta and f_valuta != valuta.value:
            koers = await get_wisselkoers(user_id, Currency(f_valuta), valuta)
            openstaand = openstaand * koers
            f_valuta = valuta.value
        
        result.append({
            "factuurnummer": f.get("factuurnummer"),
            "debiteur_naam": f.get("debiteur_naam"),
            "factuurdatum": f.get("factuurdatum"),
            "vervaldatum": f.get("vervaldatum"),
            "dagen_over": dagen_over,
            "categorie": categorie,
            "openstaand": round(openstaand, 2),
            "valuta": f_valuta
        })
        
        if categorie in totalen:
            totalen[categorie] += openstaand
        totalen["totaal"] += openstaand
    
    return {
        "datum": today.strftime("%Y-%m-%d"),
        "facturen": sorted(result, key=lambda x: x["dagen_over"], reverse=True),
        "totalen": {k: round(v, 2) for k, v in totalen.items()}
    }

@router.get("/rapportages/openstaande-crediteuren")
async def get_openstaande_crediteuren(valuta: Optional[Currency] = None, current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    today = datetime.now()
    
    facturen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["ontvangen", "gedeeltelijk_betaald", "vervallen"]}
    }, {"_id": 0}).to_list(1000)
    
    result = []
    totalen = {"0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, "totaal": 0}
    
    for f in facturen:
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        if openstaand <= 0:
            continue
        
        vervaldatum = datetime.strptime(f.get("vervaldatum"), "%Y-%m-%d")
        dagen_over = (today - vervaldatum).days
        
        if dagen_over < 0:
            categorie = "niet_vervallen"
        elif dagen_over <= 30:
            categorie = "0-30"
        elif dagen_over <= 60:
            categorie = "31-60"
        elif dagen_over <= 90:
            categorie = "61-90"
        else:
            categorie = "90+"
        
        f_valuta = f.get("valuta", "SRD")
        if valuta and f_valuta != valuta.value:
            koers = await get_wisselkoers(user_id, Currency(f_valuta), valuta)
            openstaand = openstaand * koers
            f_valuta = valuta.value
        
        result.append({
            "factuurnummer": f.get("factuurnummer"),
            "crediteur_naam": f.get("crediteur_naam"),
            "factuurdatum": f.get("factuurdatum"),
            "vervaldatum": f.get("vervaldatum"),
            "dagen_over": dagen_over,
            "categorie": categorie,
            "openstaand": round(openstaand, 2),
            "valuta": f_valuta
        })
        
        if categorie in totalen:
            totalen[categorie] += openstaand
        totalen["totaal"] += openstaand
    
    return {
        "datum": today.strftime("%Y-%m-%d"),
        "facturen": sorted(result, key=lambda x: x["dagen_over"], reverse=True),
        "totalen": {k: round(v, 2) for k, v in totalen.items()}
    }

# ==================== KAS ====================

@router.get("/kas/saldo")
async def get_kas_saldo(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    kas_rekening = await db.boekhouding_rekeningen.find_one({"user_id": user_id, "code": "1000"}, {"_id": 0})
    if not kas_rekening:
        return {"saldo": 0, "valuta": "SRD", "message": "Kas rekening niet gevonden"}
    return {"saldo": kas_rekening.get("saldo", 0), "valuta": kas_rekening.get("saldo_valuta", "SRD")}

@router.post("/kas/transactie")
async def create_kas_transactie(
    type: str,
    bedrag: float,
    valuta: Currency,
    omschrijving: str,
    datum: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    user_id = current_user["id"]
    if type not in ["inkomst", "uitgave"]:
        raise HTTPException(status_code=400, detail="Type moet 'inkomst' of 'uitgave' zijn")
    
    transactie_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    datum = datum or now.strftime("%Y-%m-%d")
    
    transactie_doc = {
        "id": transactie_id,
        "user_id": user_id,
        "rekening_id": "kas",
        "datum": datum,
        "type": type,
        "bedrag": bedrag,
        "valuta": valuta.value,
        "omschrijving": omschrijving,
        "categorie": "kas",
        "created_at": now.isoformat()
    }
    
    await db.boekhouding_transacties.insert_one(transactie_doc)
    
    saldo_change = bedrag if type == "inkomst" else -bedrag
    await db.boekhouding_rekeningen.update_one({"user_id": user_id, "code": "1000"}, {"$inc": {"saldo": saldo_change}})
    
    return {"message": "Kas transactie geregistreerd", "id": transactie_id}
