"""
Boekhouding Module - Complete Surinaams Boekhoudsysteem
======================================================
Modules:
1. Dashboard - KPI's, omzet, kosten, winst
2. Grootboek - Rekeningschema, dagboeken, journaalposten
3. Debiteuren - Klantbeheer, openstaande posten
4. Crediteuren - Leveranciersbeheer
5. Bank/Kas - Bankmutaties, kasboek
6. Bank Reconciliatie - Auto-matching
7. Vaste Activa - Activaregister, afschrijvingen
8. Kostenplaatsen - Afdelingen, budgetten
9. Wisselkoersen - Dagkoersen (handmatig)
10. Inkoop - Orders, facturen
11. Verkoop - Offertes, orders, facturen
12. Voorraad - Niveaus, mutaties
13. Projecten - Uren, budget
14. Rapportages - Balans, W&V, BTW
15. BTW Module - Tarieven, codes
16. Documenten - Upload
17. Audit Trail - Logging
18. Email Herinneringen
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/boekhouding", tags=["Boekhouding"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'surirentals')]

# ==================== HELPER FUNCTIONS ====================

def clean_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert ObjectId to string"""
    if doc is None:
        return None
    if "_id" in doc:
        doc.pop("_id", None)
    return doc

async def get_user_from_token(token: str) -> dict:
    """Get user from JWT token"""
    import jwt
    JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'suri-rentals-default-secret-change-in-production'
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('user_id')
        user = await db.users.find_one({"id": user_id})
        return clean_doc(user)
    except:
        return None

async def get_current_user(authorization: str = Header(None)) -> dict:
    """Extract user from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Niet geautoriseerd")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Ongeldige token")
    return user

async def log_audit(user_id: str, action: str, module: str, entity_type: str, entity_id: str, details: dict = None):
    """Log audit trail entry"""
    await db.boekhouding_audit_trail.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "ip_address": None,
        "timestamp": datetime.utcnow()
    })

# ==================== PYDANTIC MODELS ====================

# === Grootboek ===
class RekeningCreate(BaseModel):
    code: str
    naam: str
    type: str  # activa, passiva, eigen_vermogen, omzet, kosten
    categorie: str
    btw_code: Optional[str] = None
    valuta: str = "SRD"
    is_actief: bool = True

class DagboekCreate(BaseModel):
    code: str
    naam: str
    type: str  # bank, kas, verkoop, inkoop, memoriaal
    standaard_rekening: Optional[str] = None

class JournaalpostCreate(BaseModel):
    dagboek_code: str
    datum: date
    omschrijving: str
    regels: List[Dict[str, Any]]  # [{rekening_code, debet, credit, omschrijving}]
    document_ref: Optional[str] = None

# === Debiteuren ===
class DebiteurCreate(BaseModel):
    naam: str
    adres: Optional[str] = None
    plaats: Optional[str] = None
    land: str = "Suriname"
    telefoon: Optional[str] = None
    email: Optional[str] = None
    btw_nummer: Optional[str] = None
    betalingstermijn: int = 30
    kredietlimiet: float = 0
    valuta: str = "SRD"
    btw_tarief: str = "V25"  # V25, V10, V0

# === Crediteuren ===
class CrediteurCreate(BaseModel):
    naam: str
    adres: Optional[str] = None
    plaats: Optional[str] = None
    land: str = "Suriname"
    telefoon: Optional[str] = None
    email: Optional[str] = None
    btw_nummer: Optional[str] = None
    betalingstermijn: int = 30
    valuta: str = "SRD"
    rekeningnummer: Optional[str] = None
    bank: Optional[str] = None  # DSB, RBC, Hakrinbank, Finabank

# === Verkoopfacturen ===
class VerkoopfactuurRegelCreate(BaseModel):
    omschrijving: str
    aantal: float = 1
    eenheidsprijs: float
    btw_code: str = "V25"
    korting_percentage: float = 0

class VerkoopfactuurCreate(BaseModel):
    debiteur_id: str
    factuurdatum: date
    vervaldatum: Optional[date] = None
    valuta: str = "SRD"
    wisselkoers: float = 1.0
    regels: List[VerkoopfactuurRegelCreate]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None

# === Inkoopfacturen ===
class InkoopfactuurRegelCreate(BaseModel):
    omschrijving: str
    aantal: float = 1
    eenheidsprijs: float
    btw_code: str = "I25"
    kostenplaats_id: Optional[str] = None

class InkoopfactuurCreate(BaseModel):
    crediteur_id: str
    extern_factuurnummer: str
    factuurdatum: date
    vervaldatum: Optional[date] = None
    valuta: str = "SRD"
    wisselkoers: float = 1.0
    regels: List[InkoopfactuurRegelCreate]
    opmerkingen: Optional[str] = None

# === Bankrekeningen ===
class BankrekeningCreate(BaseModel):
    naam: str
    rekeningnummer: str
    bank: str  # DSB, RBC, Hakrinbank, Finabank, Overig
    valuta: str = "SRD"
    beginsaldo: float = 0
    grootboekrekening: Optional[str] = None

class BankmutatieBatchCreate(BaseModel):
    bankrekening_id: str
    mutaties: List[Dict[str, Any]]  # [{datum, omschrijving, bedrag, tegenrekening}]

# === Kasboek ===
class KasmutatieCreate(BaseModel):
    datum: date
    omschrijving: str
    bedrag: float
    type: str  # ontvangst, uitgave
    categorie: Optional[str] = None
    tegenrekening: Optional[str] = None

# === Bank Reconciliatie ===
class ReconciliatieMatchCreate(BaseModel):
    bankmutatie_id: str
    boeking_id: str
    boeking_type: str  # verkoopfactuur, inkoopfactuur, kas

# === Vaste Activa ===
class VastActivumCreate(BaseModel):
    naam: str
    categorie: str  # gebouwen, machines, inventaris, voertuigen, computers
    aanschafdatum: date
    aanschafwaarde: float
    restwaarde: float = 0
    levensduur_jaren: int
    afschrijvingsmethode: str = "lineair"  # lineair, degressief, annuiteit
    locatie: Optional[str] = None
    serienummer: Optional[str] = None

# === Kostenplaatsen ===
class KostenplaatsCreate(BaseModel):
    code: str
    naam: str
    type: str = "afdeling"  # afdeling, project, kostendrager
    budget: float = 0
    verantwoordelijke: Optional[str] = None

# === Wisselkoersen ===
class WisselkoersCreate(BaseModel):
    valuta_van: str
    valuta_naar: str
    koers: float
    datum: date
    bron: str = "handmatig"  # handmatig, centrale_bank

# === Voorraad ===
class ArtikelCreate(BaseModel):
    code: str
    naam: str
    omschrijving: Optional[str] = None
    type: str = "product"  # product, dienst
    eenheid: str = "stuk"
    inkoopprijs: float = 0
    verkoopprijs: float = 0
    btw_code: str = "V25"
    minimum_voorraad: int = 0
    leverancier_id: Optional[str] = None

class MagazijnCreate(BaseModel):
    code: str
    naam: str
    adres: Optional[str] = None
    is_hoofdmagazijn: bool = False

class VoorraadmutatieCreate(BaseModel):
    artikel_id: str
    magazijn_id: str
    type: str  # inkoop, verkoop, correctie, transfer, inventarisatie
    aantal: int
    eenheidsprijs: Optional[float] = None
    referentie: Optional[str] = None
    opmerkingen: Optional[str] = None

# === Projecten ===
class ProjectCreate(BaseModel):
    code: str
    naam: str
    klant_id: Optional[str] = None
    type: str = "klant"  # klant, intern, onderhoud
    startdatum: date
    einddatum: Optional[date] = None
    budget: float = 0
    valuta: str = "SRD"
    status: str = "actief"

class UrenregistratieCreate(BaseModel):
    project_id: str
    medewerker_id: Optional[str] = None
    datum: date
    uren: float
    omschrijving: str
    uurtarief: Optional[float] = None
    factureerbaar: bool = True

class ProjectkostenCreate(BaseModel):
    project_id: str
    datum: date
    omschrijving: str
    bedrag: float
    categorie: str
    factureerbaar: bool = True

# === BTW ===
class BTWCodeCreate(BaseModel):
    code: str
    naam: str
    percentage: float
    type: str  # verkoop, inkoop, vrijgesteld
    grootboekrekening_af: str
    grootboekrekening_te_betalen: str

# === Documenten ===
class DocumentCreate(BaseModel):
    naam: str
    type: str  # factuur, bon, contract, overig
    gekoppeld_aan_type: Optional[str] = None
    gekoppeld_aan_id: Optional[str] = None

# === Email Herinneringen ===
class HerinneringCreate(BaseModel):
    debiteur_id: str
    factuur_id: str
    type: str  # eerste, tweede, aanmaning
    verzonden: bool = False

# ==================== INITIALIZATION ====================

@router.post("/init/volledig")
async def initialiseer_boekhouding(authorization: str = Header(None)):
    """Initialiseer complete boekhouding met standaard Surinaams rekeningschema"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Check if already initialized
    existing = await db.boekhouding_rekeningen.find_one({"user_id": user_id})
    if existing:
        return {"message": "Boekhouding is al geïnitialiseerd", "status": "exists"}
    
    # Standaard Surinaams Rekeningschema
    rekeningen = [
        # ACTIVA (1xxx)
        {"code": "1000", "naam": "Vaste activa", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1010", "naam": "Gebouwen", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1011", "naam": "Afschrijving gebouwen", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1020", "naam": "Machines en installaties", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1021", "naam": "Afschrijving machines", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1030", "naam": "Inventaris", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1031", "naam": "Afschrijving inventaris", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1040", "naam": "Voertuigen", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1041", "naam": "Afschrijving voertuigen", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1050", "naam": "Computers en software", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1051", "naam": "Afschrijving computers", "type": "activa", "categorie": "vaste_activa"},
        
        # Vlottende activa (12xx-14xx)
        {"code": "1200", "naam": "Voorraad goederen", "type": "activa", "categorie": "voorraad"},
        {"code": "1210", "naam": "Voorraad grondstoffen", "type": "activa", "categorie": "voorraad"},
        {"code": "1220", "naam": "Voorraad onderhanden werk", "type": "activa", "categorie": "voorraad"},
        {"code": "1300", "naam": "Debiteuren", "type": "activa", "categorie": "debiteuren"},
        {"code": "1310", "naam": "Voorziening dubieuze debiteuren", "type": "activa", "categorie": "debiteuren"},
        {"code": "1400", "naam": "BTW te vorderen", "type": "activa", "categorie": "btw"},
        {"code": "1410", "naam": "BTW voorheffing inkoop", "type": "activa", "categorie": "btw"},
        
        # Liquide middelen (15xx)
        {"code": "1500", "naam": "Kas SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1501", "naam": "Kas USD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1502", "naam": "Kas EUR", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1510", "naam": "Bank DSB SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1511", "naam": "Bank DSB USD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1512", "naam": "Bank DSB EUR", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1520", "naam": "Bank Hakrinbank SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1521", "naam": "Bank Hakrinbank USD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1530", "naam": "Bank Finabank SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1531", "naam": "Bank Finabank USD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1540", "naam": "Bank RBC SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1541", "naam": "Bank RBC USD", "type": "activa", "categorie": "liquide_middelen"},
        
        # PASSIVA (2xxx)
        {"code": "2000", "naam": "Eigen vermogen", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2010", "naam": "Aandelenkapitaal", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2020", "naam": "Reserves", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2030", "naam": "Ingehouden winst", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2040", "naam": "Resultaat boekjaar", "type": "passiva", "categorie": "eigen_vermogen"},
        
        # Langlopende schulden (21xx)
        {"code": "2100", "naam": "Langlopende leningen", "type": "passiva", "categorie": "langlopend"},
        {"code": "2110", "naam": "Hypotheek", "type": "passiva", "categorie": "langlopend"},
        
        # Kortlopende schulden (22xx)
        {"code": "2200", "naam": "Crediteuren", "type": "passiva", "categorie": "crediteuren"},
        {"code": "2210", "naam": "BTW te betalen", "type": "passiva", "categorie": "btw"},
        {"code": "2220", "naam": "Loonheffing te betalen", "type": "passiva", "categorie": "personeel"},
        {"code": "2230", "naam": "Pensioenpremies te betalen", "type": "passiva", "categorie": "personeel"},
        {"code": "2240", "naam": "Overige schulden", "type": "passiva", "categorie": "overig"},
        {"code": "2250", "naam": "Nog te betalen kosten", "type": "passiva", "categorie": "overig"},
        {"code": "2260", "naam": "Vooruitontvangen bedragen", "type": "passiva", "categorie": "overig"},
        
        # OMZET (8xxx)
        {"code": "8000", "naam": "Omzet verkopen", "type": "omzet", "categorie": "verkoop"},
        {"code": "8010", "naam": "Omzet diensten", "type": "omzet", "categorie": "diensten"},
        {"code": "8020", "naam": "Omzet export", "type": "omzet", "categorie": "export"},
        {"code": "8100", "naam": "Kortingen gegeven", "type": "omzet", "categorie": "korting"},
        {"code": "8200", "naam": "Overige opbrengsten", "type": "omzet", "categorie": "overig"},
        {"code": "8210", "naam": "Koersverschillen (positief)", "type": "omzet", "categorie": "koersverschil"},
        {"code": "8220", "naam": "Rente-inkomsten", "type": "omzet", "categorie": "rente"},
        
        # KOSTEN (4xxx)
        {"code": "4000", "naam": "Inkoopwaarde omzet", "type": "kosten", "categorie": "inkoop"},
        {"code": "4010", "naam": "Inkoop goederen", "type": "kosten", "categorie": "inkoop"},
        {"code": "4020", "naam": "Invoerrechten", "type": "kosten", "categorie": "inkoop"},
        {"code": "4030", "naam": "Vrachtkosten inkoop", "type": "kosten", "categorie": "inkoop"},
        {"code": "4100", "naam": "Personeelskosten", "type": "kosten", "categorie": "personeel"},
        {"code": "4110", "naam": "Lonen en salarissen", "type": "kosten", "categorie": "personeel"},
        {"code": "4120", "naam": "Sociale lasten", "type": "kosten", "categorie": "personeel"},
        {"code": "4130", "naam": "Pensioenkosten", "type": "kosten", "categorie": "personeel"},
        {"code": "4140", "naam": "Overige personeelskosten", "type": "kosten", "categorie": "personeel"},
        {"code": "4200", "naam": "Huisvestingskosten", "type": "kosten", "categorie": "huisvesting"},
        {"code": "4210", "naam": "Huur", "type": "kosten", "categorie": "huisvesting"},
        {"code": "4220", "naam": "Energie en water", "type": "kosten", "categorie": "huisvesting"},
        {"code": "4230", "naam": "Onderhoud gebouwen", "type": "kosten", "categorie": "huisvesting"},
        {"code": "4300", "naam": "Verkoopkosten", "type": "kosten", "categorie": "verkoop"},
        {"code": "4310", "naam": "Reclame en marketing", "type": "kosten", "categorie": "verkoop"},
        {"code": "4320", "naam": "Vertegenwoordigerskosten", "type": "kosten", "categorie": "verkoop"},
        {"code": "4400", "naam": "Autokosten", "type": "kosten", "categorie": "vervoer"},
        {"code": "4410", "naam": "Brandstof", "type": "kosten", "categorie": "vervoer"},
        {"code": "4420", "naam": "Onderhoud voertuigen", "type": "kosten", "categorie": "vervoer"},
        {"code": "4430", "naam": "Verzekering voertuigen", "type": "kosten", "categorie": "vervoer"},
        {"code": "4500", "naam": "Kantoorkosten", "type": "kosten", "categorie": "kantoor"},
        {"code": "4510", "naam": "Kantoorbenodigdheden", "type": "kosten", "categorie": "kantoor"},
        {"code": "4520", "naam": "Telefoon en internet", "type": "kosten", "categorie": "kantoor"},
        {"code": "4530", "naam": "Porti en verzendkosten", "type": "kosten", "categorie": "kantoor"},
        {"code": "4600", "naam": "Algemene kosten", "type": "kosten", "categorie": "algemeen"},
        {"code": "4610", "naam": "Accountantskosten", "type": "kosten", "categorie": "algemeen"},
        {"code": "4620", "naam": "Advieskosten", "type": "kosten", "categorie": "algemeen"},
        {"code": "4630", "naam": "Bankkosten", "type": "kosten", "categorie": "algemeen"},
        {"code": "4640", "naam": "Verzekeringen", "type": "kosten", "categorie": "algemeen"},
        {"code": "4650", "naam": "Afschrijvingen", "type": "kosten", "categorie": "afschrijving"},
        {"code": "4700", "naam": "Koersverschillen (negatief)", "type": "kosten", "categorie": "koersverschil"},
        {"code": "4800", "naam": "Rentekosten", "type": "kosten", "categorie": "rente"},
    ]
    
    # Insert rekeningen
    for rek in rekeningen:
        rek["id"] = str(uuid.uuid4())
        rek["user_id"] = user_id
        rek["is_actief"] = True
        rek["valuta"] = "SRD"
        rek["btw_code"] = None
        rek["created_at"] = datetime.utcnow()
        await db.boekhouding_rekeningen.insert_one(rek)
    
    # BTW Codes (Surinaamse tarieven)
    btw_codes = [
        {"code": "V25", "naam": "BTW verkoop 25%", "percentage": 25.0, "type": "verkoop", "grootboekrekening_af": "8000", "grootboekrekening_btw": "2210"},
        {"code": "V10", "naam": "BTW verkoop 10%", "percentage": 10.0, "type": "verkoop", "grootboekrekening_af": "8000", "grootboekrekening_btw": "2210"},
        {"code": "V0", "naam": "BTW verkoop 0%", "percentage": 0.0, "type": "verkoop", "grootboekrekening_af": "8000", "grootboekrekening_btw": "2210"},
        {"code": "VV", "naam": "Vrijgesteld verkoop", "percentage": 0.0, "type": "vrijgesteld", "grootboekrekening_af": "8000", "grootboekrekening_btw": None},
        {"code": "I25", "naam": "BTW inkoop 25%", "percentage": 25.0, "type": "inkoop", "grootboekrekening_af": "4000", "grootboekrekening_btw": "1400"},
        {"code": "I10", "naam": "BTW inkoop 10%", "percentage": 10.0, "type": "inkoop", "grootboekrekening_af": "4000", "grootboekrekening_btw": "1400"},
        {"code": "I0", "naam": "BTW inkoop 0%", "percentage": 0.0, "type": "inkoop", "grootboekrekening_af": "4000", "grootboekrekening_btw": "1400"},
        {"code": "IV", "naam": "Vrijgesteld inkoop", "percentage": 0.0, "type": "vrijgesteld", "grootboekrekening_af": "4000", "grootboekrekening_btw": None},
        {"code": "IM", "naam": "Import BTW", "percentage": 25.0, "type": "import", "grootboekrekening_af": "4020", "grootboekrekening_btw": "1400"},
        {"code": "EX", "naam": "Export vrijgesteld", "percentage": 0.0, "type": "export", "grootboekrekening_af": "8020", "grootboekrekening_btw": None},
    ]
    
    for btw in btw_codes:
        btw["id"] = str(uuid.uuid4())
        btw["user_id"] = user_id
        btw["created_at"] = datetime.utcnow()
        await db.boekhouding_btw_codes.insert_one(btw)
    
    # Dagboeken
    dagboeken = [
        {"code": "BNK", "naam": "Bankboek", "type": "bank", "standaard_rekening": "1510"},
        {"code": "KAS", "naam": "Kasboek", "type": "kas", "standaard_rekening": "1500"},
        {"code": "VKP", "naam": "Verkoopboek", "type": "verkoop", "standaard_rekening": "1300"},
        {"code": "INK", "naam": "Inkoopboek", "type": "inkoop", "standaard_rekening": "2200"},
        {"code": "MEM", "naam": "Memoriaal", "type": "memoriaal", "standaard_rekening": None},
    ]
    
    for dagboek in dagboeken:
        dagboek["id"] = str(uuid.uuid4())
        dagboek["user_id"] = user_id
        dagboek["created_at"] = datetime.utcnow()
        await db.boekhouding_dagboeken.insert_one(dagboek)
    
    await log_audit(user_id, "create", "boekhouding", "initialisatie", "volledig", {"rekeningen": len(rekeningen), "btw_codes": len(btw_codes), "dagboeken": len(dagboeken)})
    
    return {
        "message": "Boekhouding succesvol geïnitialiseerd",
        "rekeningen": len(rekeningen),
        "btw_codes": len(btw_codes),
        "dagboeken": len(dagboeken)
    }

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard(authorization: str = Header(None)):
    """Haal dashboard KPI's op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Omzet deze maand
    omzet_maand = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_of_month.date().isoformat()}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
    ]).to_list(1)
    omzet_maand_val = omzet_maand[0]["totaal"] if omzet_maand else 0
    
    # Omzet dit jaar
    omzet_jaar = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_of_year.date().isoformat()}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
    ]).to_list(1)
    omzet_jaar_val = omzet_jaar[0]["totaal"] if omzet_jaar else 0
    
    # Kosten deze maand
    kosten_maand = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_of_month.date().isoformat()}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
    ]).to_list(1)
    kosten_maand_val = kosten_maand[0]["totaal"] if kosten_maand else 0
    
    # Openstaande debiteuren
    openstaand_debiteuren = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$in": ["verzonden", "herinnering"]}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    openstaand_deb = openstaand_debiteuren[0]["totaal"] if openstaand_debiteuren else 0
    
    # Openstaande crediteuren
    openstaand_crediteuren = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    openstaand_cred = openstaand_crediteuren[0]["totaal"] if openstaand_crediteuren else 0
    
    # Bank- en kaspositie
    bank_srd = await db.boekhouding_bankrekeningen.aggregate([
        {"$match": {"user_id": user_id, "valuta": "SRD"}},
        {"$group": {"_id": None, "totaal": {"$sum": "$huidig_saldo"}}}
    ]).to_list(1)
    bank_srd_val = bank_srd[0]["totaal"] if bank_srd else 0
    
    bank_usd = await db.boekhouding_bankrekeningen.aggregate([
        {"$match": {"user_id": user_id, "valuta": "USD"}},
        {"$group": {"_id": None, "totaal": {"$sum": "$huidig_saldo"}}}
    ]).to_list(1)
    bank_usd_val = bank_usd[0]["totaal"] if bank_usd else 0
    
    bank_eur = await db.boekhouding_bankrekeningen.aggregate([
        {"$match": {"user_id": user_id, "valuta": "EUR"}},
        {"$group": {"_id": None, "totaal": {"$sum": "$huidig_saldo"}}}
    ]).to_list(1)
    bank_eur_val = bank_eur[0]["totaal"] if bank_eur else 0
    
    # BTW te betalen/vorderen
    btw_verkoop = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_of_month.date().isoformat()}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    btw_verkoop_val = btw_verkoop[0]["totaal"] if btw_verkoop else 0
    
    btw_inkoop = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_of_month.date().isoformat()}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    btw_inkoop_val = btw_inkoop[0]["totaal"] if btw_inkoop else 0
    
    # Voorraadwaarde
    voorraad = await db.boekhouding_artikelen.aggregate([
        {"$match": {"user_id": user_id, "type": "product"}},
        {"$group": {"_id": None, "totaal": {"$sum": {"$multiply": ["$voorraad", "$inkoopprijs"]}}}}
    ]).to_list(1)
    voorraad_val = voorraad[0]["totaal"] if voorraad else 0
    
    # Actieve projecten
    actieve_projecten = await db.boekhouding_projecten.count_documents({"user_id": user_id, "status": "actief"})
    
    # Actuele wisselkoersen
    koers_usd = await db.boekhouding_wisselkoersen.find_one(
        {"user_id": user_id, "valuta_van": "USD", "valuta_naar": "SRD"},
        sort=[("datum", -1)]
    )
    koers_eur = await db.boekhouding_wisselkoersen.find_one(
        {"user_id": user_id, "valuta_van": "EUR", "valuta_naar": "SRD"},
        sort=[("datum", -1)]
    )
    
    return {
        "omzet": {
            "deze_maand": omzet_maand_val,
            "dit_jaar": omzet_jaar_val
        },
        "kosten": {
            "deze_maand": kosten_maand_val
        },
        "winst": {
            "deze_maand": omzet_maand_val - kosten_maand_val,
            "dit_jaar": omzet_jaar_val
        },
        "openstaand": {
            "debiteuren": openstaand_deb,
            "crediteuren": openstaand_cred
        },
        "liquiditeit": {
            "bank_srd": bank_srd_val,
            "bank_usd": bank_usd_val,
            "bank_eur": bank_eur_val,
            "kas_srd": 0  # Te implementeren
        },
        "btw": {
            "te_betalen": btw_verkoop_val,
            "te_vorderen": btw_inkoop_val,
            "saldo": btw_verkoop_val - btw_inkoop_val
        },
        "voorraad": {
            "waarde": voorraad_val
        },
        "projecten": {
            "actief": actieve_projecten
        },
        "wisselkoersen": {
            "usd_srd": koers_usd.get("koers") if koers_usd else None,
            "eur_srd": koers_eur.get("koers") if koers_eur else None
        }
    }

@router.get("/dashboard/actielijst")
async def get_actielijst(authorization: str = Header(None)):
    """Haal actielijst op met openstaande taken"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    acties = []
    today = datetime.utcnow().date()
    
    # Verlopen facturen
    verlopen_facturen = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering"]},
        "vervaldatum": {"$lt": today.isoformat()}
    })
    if verlopen_facturen > 0:
        acties.append({
            "type": "warning",
            "titel": f"{verlopen_facturen} verlopen facturen",
            "beschrijving": "Er zijn facturen die de vervaldatum zijn gepasseerd",
            "actie": "debiteuren"
        })
    
    # Te betalen facturen
    te_betalen = await db.boekhouding_inkoopfacturen.count_documents({
        "user_id": user_id,
        "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]},
        "vervaldatum": {"$lte": (today + timedelta(days=7)).isoformat()}
    })
    if te_betalen > 0:
        acties.append({
            "type": "info",
            "titel": f"{te_betalen} facturen te betalen",
            "beschrijving": "Facturen die binnen 7 dagen vervallen",
            "actie": "crediteuren"
        })
    
    # Lage voorraad
    lage_voorraad = await db.boekhouding_artikelen.count_documents({
        "user_id": user_id,
        "type": "product",
        "$expr": {"$lte": ["$voorraad", "$minimum_voorraad"]}
    })
    if lage_voorraad > 0:
        acties.append({
            "type": "warning",
            "titel": f"{lage_voorraad} artikelen lage voorraad",
            "beschrijving": "Artikelen onder minimum voorraadniveau",
            "actie": "voorraad"
        })
    
    # Bank reconciliatie nodig
    niet_gematched = await db.boekhouding_bankmutaties.count_documents({
        "user_id": user_id,
        "status": "nieuw"
    })
    if niet_gematched > 0:
        acties.append({
            "type": "info",
            "titel": f"{niet_gematched} bankmutaties niet gematched",
            "beschrijving": "Bankmutaties die nog gematched moeten worden",
            "actie": "reconciliatie"
        })
    
    return {"acties": acties}

# ==================== GROOTBOEK ====================

@router.get("/rekeningen")
async def get_rekeningen(type: str = None, authorization: str = Header(None)):
    """Haal alle grootboekrekeningen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    
    rekeningen = await db.boekhouding_rekeningen.find(query).sort("code", 1).to_list(500)
    return [clean_doc(r) for r in rekeningen]

@router.post("/rekeningen")
async def create_rekening(data: RekeningCreate, authorization: str = Header(None)):
    """Maak nieuwe grootboekrekening"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Check duplicate
    existing = await db.boekhouding_rekeningen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Rekening {data.code} bestaat al")
    
    rekening = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_rekeningen.insert_one(rekening)
    await log_audit(user_id, "create", "grootboek", "rekening", rekening["id"], {"code": data.code})
    return clean_doc(rekening)

@router.get("/dagboeken")
async def get_dagboeken(authorization: str = Header(None)):
    """Haal alle dagboeken op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    dagboeken = await db.boekhouding_dagboeken.find({"user_id": user_id}).to_list(50)
    return [clean_doc(d) for d in dagboeken]

@router.post("/journaalposten")
async def create_journaalpost(data: JournaalpostCreate, authorization: str = Header(None)):
    """Maak nieuwe journaalpost"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Valideer balans (debet = credit)
    totaal_debet = sum(r.get("debet", 0) for r in data.regels)
    totaal_credit = sum(r.get("credit", 0) for r in data.regels)
    
    if abs(totaal_debet - totaal_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Journaalpost niet in balans: debet {totaal_debet} != credit {totaal_credit}")
    
    # Genereer volgnummer
    count = await db.boekhouding_journaalposten.count_documents({"user_id": user_id, "dagboek_code": data.dagboek_code})
    volgnummer = f"{data.dagboek_code}{datetime.utcnow().year}-{count + 1:05d}"
    
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "volgnummer": volgnummer,
        "dagboek_code": data.dagboek_code,
        "datum": data.datum.isoformat(),
        "omschrijving": data.omschrijving,
        "regels": data.regels,
        "document_ref": data.document_ref,
        "totaal_debet": totaal_debet,
        "totaal_credit": totaal_credit,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    await log_audit(user_id, "create", "grootboek", "journaalpost", journaalpost["id"], {"volgnummer": volgnummer})
    return clean_doc(journaalpost)

@router.get("/journaalposten")
async def get_journaalposten(dagboek: str = None, van: str = None, tot: str = None, authorization: str = Header(None)):
    """Haal journaalposten op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if dagboek:
        query["dagboek_code"] = dagboek
    if van:
        query["datum"] = {"$gte": van}
    if tot:
        if "datum" in query:
            query["datum"]["$lte"] = tot
        else:
            query["datum"] = {"$lte": tot}
    
    posten = await db.boekhouding_journaalposten.find(query).sort("datum", -1).to_list(500)
    return [clean_doc(p) for p in posten]

# ==================== DEBITEUREN ====================

@router.get("/debiteuren")
async def get_debiteuren(authorization: str = Header(None)):
    """Haal alle debiteuren op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    debiteuren = await db.boekhouding_debiteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    return [clean_doc(d) for d in debiteuren]

@router.post("/debiteuren")
async def create_debiteur(data: DebiteurCreate, authorization: str = Header(None)):
    """Maak nieuwe debiteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Genereer debiteurnummer
    count = await db.boekhouding_debiteuren.count_documents({"user_id": user_id})
    debiteur_nummer = f"DEB{count + 1:05d}"
    
    debiteur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nummer": debiteur_nummer,
        **data.dict(),
        "openstaand_bedrag": 0,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_debiteuren.insert_one(debiteur)
    await log_audit(user_id, "create", "debiteuren", "debiteur", debiteur["id"], {"nummer": debiteur_nummer})
    return clean_doc(debiteur)

@router.get("/debiteuren/{debiteur_id}")
async def get_debiteur(debiteur_id: str, authorization: str = Header(None)):
    """Haal specifieke debiteur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    debiteur = await db.boekhouding_debiteuren.find_one({"id": debiteur_id, "user_id": user_id})
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return clean_doc(debiteur)

@router.put("/debiteuren/{debiteur_id}")
async def update_debiteur(debiteur_id: str, data: DebiteurCreate, authorization: str = Header(None)):
    """Update debiteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_debiteuren.update_one(
        {"id": debiteur_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    
    await log_audit(user_id, "update", "debiteuren", "debiteur", debiteur_id, data.dict())
    return {"message": "Debiteur bijgewerkt"}

@router.get("/debiteuren/{debiteur_id}/openstaand")
async def get_debiteur_openstaand(debiteur_id: str, authorization: str = Header(None)):
    """Haal openstaande facturen van debiteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "debiteur_id": debiteur_id,
        "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
    }).sort("vervaldatum", 1).to_list(100)
    
    return [clean_doc(f) for f in facturen]

@router.get("/debiteuren/ouderdom/analyse")
async def get_ouderdom_analyse(authorization: str = Header(None)):
    """Ouderdomsanalyse openstaande debiteuren"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    today = datetime.utcnow().date()
    
    # Categorieën: 0-30, 31-60, 61-90, >90 dagen
    facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
    }).to_list(1000)
    
    analyse = {
        "0_30": 0,
        "31_60": 0,
        "61_90": 0,
        "90_plus": 0,
        "totaal": 0
    }
    
    for f in facturen:
        verval = datetime.fromisoformat(f["vervaldatum"]).date() if isinstance(f["vervaldatum"], str) else f["vervaldatum"]
        dagen = (today - verval).days
        bedrag = f.get("openstaand_bedrag", 0)
        
        if dagen <= 30:
            analyse["0_30"] += bedrag
        elif dagen <= 60:
            analyse["31_60"] += bedrag
        elif dagen <= 90:
            analyse["61_90"] += bedrag
        else:
            analyse["90_plus"] += bedrag
        
        analyse["totaal"] += bedrag
    
    return analyse

# ==================== CREDITEUREN ====================

@router.get("/crediteuren")
async def get_crediteuren(authorization: str = Header(None)):
    """Haal alle crediteuren op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    crediteuren = await db.boekhouding_crediteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    return [clean_doc(c) for c in crediteuren]

@router.post("/crediteuren")
async def create_crediteur(data: CrediteurCreate, authorization: str = Header(None)):
    """Maak nieuwe crediteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Genereer crediteurnummer
    count = await db.boekhouding_crediteuren.count_documents({"user_id": user_id})
    crediteur_nummer = f"CRE{count + 1:05d}"
    
    crediteur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nummer": crediteur_nummer,
        **data.dict(),
        "openstaand_bedrag": 0,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_crediteuren.insert_one(crediteur)
    await log_audit(user_id, "create", "crediteuren", "crediteur", crediteur["id"], {"nummer": crediteur_nummer})
    return clean_doc(crediteur)

@router.get("/crediteuren/{crediteur_id}")
async def get_crediteur(crediteur_id: str, authorization: str = Header(None)):
    """Haal specifieke crediteur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    crediteur = await db.boekhouding_crediteuren.find_one({"id": crediteur_id, "user_id": user_id})
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return clean_doc(crediteur)

@router.put("/crediteuren/{crediteur_id}")
async def update_crediteur(crediteur_id: str, data: CrediteurCreate, authorization: str = Header(None)):
    """Update crediteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_crediteuren.update_one(
        {"id": crediteur_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    
    await log_audit(user_id, "update", "crediteuren", "crediteur", crediteur_id, data.dict())
    return {"message": "Crediteur bijgewerkt"}

@router.get("/crediteuren/betaaladvies")
async def get_betaaladvies(authorization: str = Header(None)):
    """Haal betaaladvieslijst op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    today = datetime.utcnow().date()
    
    # Facturen die binnen 7 dagen vervallen of al verlopen zijn
    facturen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]},
        "vervaldatum": {"$lte": (today + timedelta(days=7)).isoformat()}
    }).sort("vervaldatum", 1).to_list(100)
    
    return [clean_doc(f) for f in facturen]

# ==================== VERKOOPFACTUREN ====================

@router.get("/verkoopfacturen")
async def get_verkoopfacturen(status: str = None, debiteur_id: str = None, authorization: str = Header(None)):
    """Haal alle verkoopfacturen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if debiteur_id:
        query["debiteur_id"] = debiteur_id
    
    facturen = await db.boekhouding_verkoopfacturen.find(query).sort("factuurdatum", -1).to_list(500)
    return [clean_doc(f) for f in facturen]

@router.post("/verkoopfacturen")
async def create_verkoopfactuur(data: VerkoopfactuurCreate, authorization: str = Header(None)):
    """Maak nieuwe verkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal BTW codes op
    btw_codes = {}
    codes = await db.boekhouding_btw_codes.find({"user_id": user_id}).to_list(20)
    for c in codes:
        btw_codes[c["code"]] = c["percentage"]
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_met_btw = []
    
    for regel in data.regels:
        bedrag_excl = regel.aantal * regel.eenheidsprijs * (1 - regel.korting_percentage / 100)
        btw_perc = btw_codes.get(regel.btw_code, 25)
        btw = bedrag_excl * btw_perc / 100
        
        regels_met_btw.append({
            **regel.dict(),
            "bedrag_excl": bedrag_excl,
            "btw_percentage": btw_perc,
            "btw_bedrag": btw,
            "bedrag_incl": bedrag_excl + btw
        })
        
        subtotaal += bedrag_excl
        btw_bedrag += btw
    
    totaal_incl = subtotaal + btw_bedrag
    
    # Genereer factuurnummer
    year = datetime.utcnow().year
    count = await db.boekhouding_verkoopfacturen.count_documents({"user_id": user_id})
    factuurnummer = f"VF{year}-{count + 1:05d}"
    
    # Bepaal vervaldatum
    debiteur = await db.boekhouding_debiteuren.find_one({"id": data.debiteur_id, "user_id": user_id})
    betalingstermijn = debiteur.get("betalingstermijn", 30) if debiteur else 30
    vervaldatum = data.vervaldatum or (data.factuurdatum + timedelta(days=betalingstermijn))
    
    factuur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "factuurnummer": factuurnummer,
        "debiteur_id": data.debiteur_id,
        "debiteur_naam": debiteur.get("naam") if debiteur else "Onbekend",
        "factuurdatum": data.factuurdatum.isoformat(),
        "vervaldatum": vervaldatum.isoformat() if isinstance(vervaldatum, date) else vervaldatum,
        "valuta": data.valuta,
        "wisselkoers": data.wisselkoers,
        "regels": regels_met_btw,
        "subtotaal": subtotaal,
        "btw_bedrag": btw_bedrag,
        "totaal_incl_btw": totaal_incl,
        "openstaand_bedrag": totaal_incl,
        "status": "concept",
        "opmerkingen": data.opmerkingen,
        "referentie": data.referentie,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_verkoopfacturen.insert_one(factuur)
    await log_audit(user_id, "create", "verkoop", "verkoopfactuur", factuur["id"], {"factuurnummer": factuurnummer})
    return clean_doc(factuur)

@router.get("/verkoopfacturen/{factuur_id}")
async def get_verkoopfactuur(factuur_id: str, authorization: str = Header(None)):
    """Haal specifieke verkoopfactuur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return clean_doc(factuur)

@router.post("/verkoopfacturen/{factuur_id}/verzenden")
async def verzend_verkoopfactuur(factuur_id: str, authorization: str = Header(None)):
    """Verzend verkoopfactuur en maak journaalpost"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if factuur["status"] != "concept":
        raise HTTPException(status_code=400, detail="Factuur is al verzonden")
    
    # Maak journaalpost
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "volgnummer": f"VKP{datetime.utcnow().year}-{factuur['factuurnummer']}",
        "dagboek_code": "VKP",
        "datum": factuur["factuurdatum"],
        "omschrijving": f"Verkoopfactuur {factuur['factuurnummer']} - {factuur['debiteur_naam']}",
        "regels": [
            {"rekening_code": "1300", "debet": factuur["totaal_incl_btw"], "credit": 0, "omschrijving": "Debiteuren"},
            {"rekening_code": "8000", "debet": 0, "credit": factuur["subtotaal"], "omschrijving": "Omzet"},
            {"rekening_code": "2210", "debet": 0, "credit": factuur["btw_bedrag"], "omschrijving": "BTW te betalen"}
        ],
        "document_ref": factuur_id,
        "totaal_debet": factuur["totaal_incl_btw"],
        "totaal_credit": factuur["totaal_incl_btw"],
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update factuur status
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {"status": "verzonden", "verzonden_op": datetime.utcnow()}}
    )
    
    # Update debiteur openstaand bedrag
    await db.boekhouding_debiteuren.update_one(
        {"id": factuur["debiteur_id"]},
        {"$inc": {"openstaand_bedrag": factuur["totaal_incl_btw"]}}
    )
    
    await log_audit(user_id, "verzenden", "verkoop", "verkoopfactuur", factuur_id, {"factuurnummer": factuur["factuurnummer"]})
    return {"message": "Factuur verzonden", "journaalpost_id": journaalpost["id"]}

@router.post("/verkoopfacturen/{factuur_id}/betaling")
async def registreer_betaling_verkoopfactuur(factuur_id: str, bedrag: float, datum: date = None, authorization: str = Header(None)):
    """Registreer betaling op verkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    openstaand = factuur.get("openstaand_bedrag", factuur["totaal_incl_btw"])
    nieuw_openstaand = openstaand - bedrag
    
    if nieuw_openstaand < 0:
        raise HTTPException(status_code=400, detail="Betaling is hoger dan openstaand bedrag")
    
    # Bepaal nieuwe status
    if nieuw_openstaand == 0:
        nieuwe_status = "betaald"
    else:
        nieuwe_status = "gedeeltelijk_betaald"
    
    # Registreer betaling
    betaling = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "factuur_id": factuur_id,
        "type": "verkoopfactuur",
        "bedrag": bedrag,
        "datum": (datum or datetime.utcnow().date()).isoformat(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_betalingen.insert_one(betaling)
    
    # Update factuur
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {"openstaand_bedrag": nieuw_openstaand, "status": nieuwe_status}}
    )
    
    # Update debiteur
    await db.boekhouding_debiteuren.update_one(
        {"id": factuur["debiteur_id"]},
        {"$inc": {"openstaand_bedrag": -bedrag}}
    )
    
    await log_audit(user_id, "betaling", "verkoop", "verkoopfactuur", factuur_id, {"bedrag": bedrag})
    return {"message": "Betaling geregistreerd", "nieuw_openstaand": nieuw_openstaand, "status": nieuwe_status}

# ==================== INKOOPFACTUREN ====================

@router.get("/inkoopfacturen")
async def get_inkoopfacturen(status: str = None, crediteur_id: str = None, authorization: str = Header(None)):
    """Haal alle inkoopfacturen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if crediteur_id:
        query["crediteur_id"] = crediteur_id
    
    facturen = await db.boekhouding_inkoopfacturen.find(query).sort("factuurdatum", -1).to_list(500)
    return [clean_doc(f) for f in facturen]

@router.post("/inkoopfacturen")
async def create_inkoopfactuur(data: InkoopfactuurCreate, authorization: str = Header(None)):
    """Maak nieuwe inkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal BTW codes op
    btw_codes = {}
    codes = await db.boekhouding_btw_codes.find({"user_id": user_id}).to_list(20)
    for c in codes:
        btw_codes[c["code"]] = c["percentage"]
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_met_btw = []
    
    for regel in data.regels:
        bedrag_excl = regel.aantal * regel.eenheidsprijs
        btw_perc = btw_codes.get(regel.btw_code, 25)
        btw = bedrag_excl * btw_perc / 100
        
        regels_met_btw.append({
            **regel.dict(),
            "bedrag_excl": bedrag_excl,
            "btw_percentage": btw_perc,
            "btw_bedrag": btw,
            "bedrag_incl": bedrag_excl + btw
        })
        
        subtotaal += bedrag_excl
        btw_bedrag += btw
    
    totaal_incl = subtotaal + btw_bedrag
    
    # Genereer intern nummer
    year = datetime.utcnow().year
    count = await db.boekhouding_inkoopfacturen.count_documents({"user_id": user_id})
    intern_nummer = f"IF{year}-{count + 1:05d}"
    
    # Haal crediteur op
    crediteur = await db.boekhouding_crediteuren.find_one({"id": data.crediteur_id, "user_id": user_id})
    betalingstermijn = crediteur.get("betalingstermijn", 30) if crediteur else 30
    vervaldatum = data.vervaldatum or (data.factuurdatum + timedelta(days=betalingstermijn))
    
    factuur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "intern_nummer": intern_nummer,
        "extern_factuurnummer": data.extern_factuurnummer,
        "crediteur_id": data.crediteur_id,
        "crediteur_naam": crediteur.get("naam") if crediteur else "Onbekend",
        "factuurdatum": data.factuurdatum.isoformat(),
        "vervaldatum": vervaldatum.isoformat() if isinstance(vervaldatum, date) else vervaldatum,
        "valuta": data.valuta,
        "wisselkoers": data.wisselkoers,
        "regels": regels_met_btw,
        "subtotaal": subtotaal,
        "btw_bedrag": btw_bedrag,
        "totaal_incl_btw": totaal_incl,
        "openstaand_bedrag": totaal_incl,
        "status": "nieuw",
        "opmerkingen": data.opmerkingen,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_inkoopfacturen.insert_one(factuur)
    await log_audit(user_id, "create", "inkoop", "inkoopfactuur", factuur["id"], {"intern_nummer": intern_nummer})
    return clean_doc(factuur)

@router.post("/inkoopfacturen/{factuur_id}/boeken")
async def boek_inkoopfactuur(factuur_id: str, authorization: str = Header(None)):
    """Boek inkoopfactuur en maak journaalpost"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_inkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if factuur["status"] != "nieuw":
        raise HTTPException(status_code=400, detail="Factuur is al geboekt")
    
    # Maak journaalpost
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "volgnummer": f"INK{datetime.utcnow().year}-{factuur['intern_nummer']}",
        "dagboek_code": "INK",
        "datum": factuur["factuurdatum"],
        "omschrijving": f"Inkoopfactuur {factuur['extern_factuurnummer']} - {factuur['crediteur_naam']}",
        "regels": [
            {"rekening_code": "4000", "debet": factuur["subtotaal"], "credit": 0, "omschrijving": "Inkoop"},
            {"rekening_code": "1400", "debet": factuur["btw_bedrag"], "credit": 0, "omschrijving": "BTW te vorderen"},
            {"rekening_code": "2200", "debet": 0, "credit": factuur["totaal_incl_btw"], "omschrijving": "Crediteuren"}
        ],
        "document_ref": factuur_id,
        "totaal_debet": factuur["totaal_incl_btw"],
        "totaal_credit": factuur["totaal_incl_btw"],
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update factuur status
    await db.boekhouding_inkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {"status": "geboekt", "geboekt_op": datetime.utcnow()}}
    )
    
    # Update crediteur openstaand bedrag
    await db.boekhouding_crediteuren.update_one(
        {"id": factuur["crediteur_id"]},
        {"$inc": {"openstaand_bedrag": factuur["totaal_incl_btw"]}}
    )
    
    await log_audit(user_id, "boeken", "inkoop", "inkoopfactuur", factuur_id, {"intern_nummer": factuur["intern_nummer"]})
    return {"message": "Factuur geboekt", "journaalpost_id": journaalpost["id"]}

@router.post("/inkoopfacturen/{factuur_id}/betaling")
async def registreer_betaling_inkoopfactuur(factuur_id: str, bedrag: float, datum: date = None, authorization: str = Header(None)):
    """Registreer betaling op inkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_inkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    openstaand = factuur.get("openstaand_bedrag", factuur["totaal_incl_btw"])
    nieuw_openstaand = openstaand - bedrag
    
    if nieuw_openstaand < 0:
        raise HTTPException(status_code=400, detail="Betaling is hoger dan openstaand bedrag")
    
    # Bepaal nieuwe status
    if nieuw_openstaand == 0:
        nieuwe_status = "betaald"
    else:
        nieuwe_status = "gedeeltelijk_betaald"
    
    # Registreer betaling
    betaling = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "factuur_id": factuur_id,
        "type": "inkoopfactuur",
        "bedrag": bedrag,
        "datum": (datum or datetime.utcnow().date()).isoformat(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_betalingen.insert_one(betaling)
    
    # Update factuur
    await db.boekhouding_inkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {"openstaand_bedrag": nieuw_openstaand, "status": nieuwe_status}}
    )
    
    # Update crediteur
    await db.boekhouding_crediteuren.update_one(
        {"id": factuur["crediteur_id"]},
        {"$inc": {"openstaand_bedrag": -bedrag}}
    )
    
    await log_audit(user_id, "betaling", "inkoop", "inkoopfactuur", factuur_id, {"bedrag": bedrag})
    return {"message": "Betaling geregistreerd", "nieuw_openstaand": nieuw_openstaand, "status": nieuwe_status}


# ==================== BANKREKENINGEN ====================

@router.get("/bankrekeningen")
async def get_bankrekeningen(authorization: str = Header(None)):
    """Haal alle bankrekeningen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    rekeningen = await db.boekhouding_bankrekeningen.find({"user_id": user_id}).sort("naam", 1).to_list(50)
    return [clean_doc(r) for r in rekeningen]

@router.post("/bankrekeningen")
async def create_bankrekening(data: BankrekeningCreate, authorization: str = Header(None)):
    """Maak nieuwe bankrekening"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    rekening = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "huidig_saldo": data.beginsaldo,
        "laatste_reconciliatie": None,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_bankrekeningen.insert_one(rekening)
    await log_audit(user_id, "create", "bank", "bankrekening", rekening["id"], {"naam": data.naam})
    return clean_doc(rekening)

@router.get("/bankrekeningen/{rekening_id}/mutaties")
async def get_bankmutaties(rekening_id: str, van: str = None, tot: str = None, authorization: str = Header(None)):
    """Haal bankmutaties op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id, "bankrekening_id": rekening_id}
    if van:
        query["datum"] = {"$gte": van}
    if tot:
        if "datum" in query:
            query["datum"]["$lte"] = tot
        else:
            query["datum"] = {"$lte": tot}
    
    mutaties = await db.boekhouding_bankmutaties.find(query).sort("datum", -1).to_list(500)
    return [clean_doc(m) for m in mutaties]

@router.post("/bankrekeningen/{rekening_id}/mutaties")
async def create_bankmutatie(rekening_id: str, datum: date, omschrijving: str, bedrag: float, tegenrekening: str = None, authorization: str = Header(None)):
    """Maak nieuwe bankmutatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Controleer bankrekening
    bankrekening = await db.boekhouding_bankrekeningen.find_one({"id": rekening_id, "user_id": user_id})
    if not bankrekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    mutatie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "bankrekening_id": rekening_id,
        "datum": datum.isoformat(),
        "omschrijving": omschrijving,
        "bedrag": bedrag,
        "tegenrekening": tegenrekening,
        "status": "nieuw",  # nieuw, gematched, geboekt
        "matched_met": None,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_bankmutaties.insert_one(mutatie)
    
    # Update saldo
    await db.boekhouding_bankrekeningen.update_one(
        {"id": rekening_id},
        {"$inc": {"huidig_saldo": bedrag}}
    )
    
    await log_audit(user_id, "create", "bank", "bankmutatie", mutatie["id"], {"bedrag": bedrag})
    return clean_doc(mutatie)

@router.post("/bankrekeningen/{rekening_id}/import")
async def import_bankmutaties(rekening_id: str, data: BankmutatieBatchCreate, authorization: str = Header(None)):
    """Importeer bankmutaties in batch"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    bankrekening = await db.boekhouding_bankrekeningen.find_one({"id": rekening_id, "user_id": user_id})
    if not bankrekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    imported = 0
    totaal_bedrag = 0
    
    for mut in data.mutaties:
        mutatie = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "bankrekening_id": rekening_id,
            "datum": mut.get("datum"),
            "omschrijving": mut.get("omschrijving"),
            "bedrag": mut.get("bedrag", 0),
            "tegenrekening": mut.get("tegenrekening"),
            "status": "nieuw",
            "matched_met": None,
            "created_at": datetime.utcnow()
        }
        await db.boekhouding_bankmutaties.insert_one(mutatie)
        imported += 1
        totaal_bedrag += mut.get("bedrag", 0)
    
    # Update saldo
    await db.boekhouding_bankrekeningen.update_one(
        {"id": rekening_id},
        {"$inc": {"huidig_saldo": totaal_bedrag}}
    )
    
    await log_audit(user_id, "import", "bank", "bankmutaties", rekening_id, {"aantal": imported})
    return {"message": f"{imported} mutaties geïmporteerd", "totaal_bedrag": totaal_bedrag}

# ==================== KASBOEK ====================

@router.get("/kasboek")
async def get_kasboek(van: str = None, tot: str = None, authorization: str = Header(None)):
    """Haal kasboek mutaties op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if van:
        query["datum"] = {"$gte": van}
    if tot:
        if "datum" in query:
            query["datum"]["$lte"] = tot
        else:
            query["datum"] = {"$lte": tot}
    
    mutaties = await db.boekhouding_kasmutaties.find(query).sort("datum", -1).to_list(500)
    return [clean_doc(m) for m in mutaties]

@router.post("/kasboek")
async def create_kasmutatie(data: KasmutatieCreate, authorization: str = Header(None)):
    """Maak nieuwe kasmutatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Genereer volgnummer
    count = await db.boekhouding_kasmutaties.count_documents({"user_id": user_id})
    volgnummer = f"KAS{datetime.utcnow().year}-{count + 1:05d}"
    
    bedrag = data.bedrag if data.type == "ontvangst" else -data.bedrag
    
    mutatie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "volgnummer": volgnummer,
        **data.dict(),
        "bedrag_signed": bedrag,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_kasmutaties.insert_one(mutatie)
    await log_audit(user_id, "create", "kas", "kasmutatie", mutatie["id"], {"volgnummer": volgnummer})
    return clean_doc(mutatie)

@router.get("/kasboek/saldo")
async def get_kassaldo(authorization: str = Header(None)):
    """Haal huidige kassaldo op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_kasmutaties.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$bedrag_signed"}}}
    ]).to_list(1)
    
    return {"saldo": result[0]["totaal"] if result else 0}

# ==================== BANK RECONCILIATIE ====================

@router.get("/reconciliatie/{bankrekening_id}")
async def get_reconciliatie_overzicht(bankrekening_id: str, authorization: str = Header(None)):
    """Haal reconciliatie overzicht op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Niet gematchte bankmutaties
    niet_gematched = await db.boekhouding_bankmutaties.find({
        "user_id": user_id,
        "bankrekening_id": bankrekening_id,
        "status": "nieuw"
    }).sort("datum", -1).to_list(100)
    
    # Openstaande verkoopfacturen
    openstaande_verkoop = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
    }).to_list(100)
    
    # Openstaande inkoopfacturen
    openstaande_inkoop = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}
    }).to_list(100)
    
    return {
        "bankmutaties": [clean_doc(m) for m in niet_gematched],
        "verkoopfacturen": [clean_doc(f) for f in openstaande_verkoop],
        "inkoopfacturen": [clean_doc(f) for f in openstaande_inkoop]
    }

@router.post("/reconciliatie/auto-match")
async def auto_match_reconciliatie(bankrekening_id: str, authorization: str = Header(None)):
    """Automatisch matchen van bankmutaties"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal niet gematchte mutaties
    mutaties = await db.boekhouding_bankmutaties.find({
        "user_id": user_id,
        "bankrekening_id": bankrekening_id,
        "status": "nieuw"
    }).to_list(500)
    
    matches = []
    
    for mutatie in mutaties:
        bedrag = mutatie["bedrag"]
        omschrijving = mutatie["omschrijving"].lower()
        
        # Zoek naar matching verkoopfacturen (positieve bedragen)
        if bedrag > 0:
            # Zoek op exact bedrag
            factuur = await db.boekhouding_verkoopfacturen.find_one({
                "user_id": user_id,
                "openstaand_bedrag": bedrag,
                "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
            })
            
            if factuur:
                # Match gevonden
                await db.boekhouding_bankmutaties.update_one(
                    {"id": mutatie["id"]},
                    {"$set": {"status": "gematched", "matched_met": {"type": "verkoopfactuur", "id": factuur["id"]}}}
                )
                matches.append({
                    "mutatie_id": mutatie["id"],
                    "matched_type": "verkoopfactuur",
                    "matched_id": factuur["id"],
                    "factuurnummer": factuur["factuurnummer"]
                })
        
        # Zoek naar matching inkoopfacturen (negatieve bedragen)
        elif bedrag < 0:
            factuur = await db.boekhouding_inkoopfacturen.find_one({
                "user_id": user_id,
                "openstaand_bedrag": abs(bedrag),
                "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}
            })
            
            if factuur:
                await db.boekhouding_bankmutaties.update_one(
                    {"id": mutatie["id"]},
                    {"$set": {"status": "gematched", "matched_met": {"type": "inkoopfactuur", "id": factuur["id"]}}}
                )
                matches.append({
                    "mutatie_id": mutatie["id"],
                    "matched_type": "inkoopfactuur",
                    "matched_id": factuur["id"],
                    "factuurnummer": factuur["extern_factuurnummer"]
                })
    
    await log_audit(user_id, "auto_match", "reconciliatie", "batch", bankrekening_id, {"matches": len(matches)})
    return {"matches": matches, "totaal": len(matches)}

@router.post("/reconciliatie/handmatig")
async def handmatig_match(data: ReconciliatieMatchCreate, authorization: str = Header(None)):
    """Handmatig matchen van bankmutatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Update bankmutatie
    await db.boekhouding_bankmutaties.update_one(
        {"id": data.bankmutatie_id, "user_id": user_id},
        {"$set": {"status": "gematched", "matched_met": {"type": data.boeking_type, "id": data.boeking_id}}}
    )
    
    await log_audit(user_id, "manual_match", "reconciliatie", "bankmutatie", data.bankmutatie_id, {"boeking_id": data.boeking_id})
    return {"message": "Mutatie gematched"}

@router.post("/reconciliatie/verwerken")
async def verwerk_reconciliatie(bankrekening_id: str, authorization: str = Header(None)):
    """Verwerk gematchte mutaties naar betalingen"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal gematchte mutaties
    mutaties = await db.boekhouding_bankmutaties.find({
        "user_id": user_id,
        "bankrekening_id": bankrekening_id,
        "status": "gematched"
    }).to_list(500)
    
    verwerkt = 0
    
    for mutatie in mutaties:
        match_info = mutatie.get("matched_met", {})
        if not match_info:
            continue
        
        match_type = match_info.get("type")
        match_id = match_info.get("id")
        bedrag = abs(mutatie["bedrag"])
        
        if match_type == "verkoopfactuur":
            # Registreer betaling op verkoopfactuur
            factuur = await db.boekhouding_verkoopfacturen.find_one({"id": match_id})
            if factuur:
                nieuw_openstaand = factuur.get("openstaand_bedrag", 0) - bedrag
                nieuwe_status = "betaald" if nieuw_openstaand <= 0 else "gedeeltelijk_betaald"
                
                await db.boekhouding_verkoopfacturen.update_one(
                    {"id": match_id},
                    {"$set": {"openstaand_bedrag": max(0, nieuw_openstaand), "status": nieuwe_status}}
                )
                
                await db.boekhouding_debiteuren.update_one(
                    {"id": factuur["debiteur_id"]},
                    {"$inc": {"openstaand_bedrag": -bedrag}}
                )
        
        elif match_type == "inkoopfactuur":
            factuur = await db.boekhouding_inkoopfacturen.find_one({"id": match_id})
            if factuur:
                nieuw_openstaand = factuur.get("openstaand_bedrag", 0) - bedrag
                nieuwe_status = "betaald" if nieuw_openstaand <= 0 else "gedeeltelijk_betaald"
                
                await db.boekhouding_inkoopfacturen.update_one(
                    {"id": match_id},
                    {"$set": {"openstaand_bedrag": max(0, nieuw_openstaand), "status": nieuwe_status}}
                )
                
                await db.boekhouding_crediteuren.update_one(
                    {"id": factuur["crediteur_id"]},
                    {"$inc": {"openstaand_bedrag": -bedrag}}
                )
        
        # Update mutatie status
        await db.boekhouding_bankmutaties.update_one(
            {"id": mutatie["id"]},
            {"$set": {"status": "geboekt", "verwerkt_op": datetime.utcnow()}}
        )
        verwerkt += 1
    
    # Update laatste reconciliatie datum
    await db.boekhouding_bankrekeningen.update_one(
        {"id": bankrekening_id},
        {"$set": {"laatste_reconciliatie": datetime.utcnow()}}
    )
    
    await log_audit(user_id, "verwerken", "reconciliatie", "batch", bankrekening_id, {"verwerkt": verwerkt})
    return {"message": f"{verwerkt} mutaties verwerkt"}

# ==================== VASTE ACTIVA ====================

@router.get("/vaste-activa")
async def get_vaste_activa(categorie: str = None, authorization: str = Header(None)):
    """Haal alle vaste activa op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if categorie:
        query["categorie"] = categorie
    
    activa = await db.boekhouding_vaste_activa.find(query).sort("naam", 1).to_list(500)
    return [clean_doc(a) for a in activa]

@router.post("/vaste-activa")
async def create_vast_activum(data: VastActivumCreate, authorization: str = Header(None)):
    """Maak nieuw vast activum"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Genereer activumnummer
    count = await db.boekhouding_vaste_activa.count_documents({"user_id": user_id})
    activum_nummer = f"ACT{count + 1:05d}"
    
    # Bereken jaarlijkse afschrijving
    if data.afschrijvingsmethode == "lineair":
        jaarlijkse_afschrijving = (data.aanschafwaarde - data.restwaarde) / data.levensduur_jaren
    else:
        jaarlijkse_afschrijving = (data.aanschafwaarde - data.restwaarde) / data.levensduur_jaren
    
    activum = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "activum_nummer": activum_nummer,
        **data.dict(),
        "aanschafdatum": data.aanschafdatum.isoformat(),
        "boekwaarde": data.aanschafwaarde,
        "totaal_afgeschreven": 0,
        "jaarlijkse_afschrijving": jaarlijkse_afschrijving,
        "status": "actief",
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_vaste_activa.insert_one(activum)
    await log_audit(user_id, "create", "activa", "vast_activum", activum["id"], {"nummer": activum_nummer})
    return clean_doc(activum)

@router.get("/vaste-activa/{activum_id}")
async def get_vast_activum(activum_id: str, authorization: str = Header(None)):
    """Haal specifiek vast activum op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    activum = await db.boekhouding_vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    return clean_doc(activum)

@router.post("/vaste-activa/afschrijven")
async def batch_afschrijving(periode: str, authorization: str = Header(None)):
    """Voer batch afschrijving uit voor periode (YYYY-MM)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal actieve activa
    activa = await db.boekhouding_vaste_activa.find({
        "user_id": user_id,
        "status": "actief"
    }).to_list(500)
    
    afschrijvingen = []
    totaal = 0
    
    for activum in activa:
        maandelijks = activum.get("jaarlijkse_afschrijving", 0) / 12
        if maandelijks <= 0:
            continue
        
        # Check of nog niet volledig afgeschreven
        if activum.get("boekwaarde", 0) <= activum.get("restwaarde", 0):
            continue
        
        # Registreer afschrijving
        afschrijving = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "activum_id": activum["id"],
            "periode": periode,
            "bedrag": maandelijks,
            "boekwaarde_voor": activum.get("boekwaarde", 0),
            "boekwaarde_na": activum.get("boekwaarde", 0) - maandelijks,
            "created_at": datetime.utcnow()
        }
        await db.boekhouding_afschrijvingen.insert_one(afschrijving)
        
        # Update activum
        await db.boekhouding_vaste_activa.update_one(
            {"id": activum["id"]},
            {
                "$inc": {"totaal_afgeschreven": maandelijks},
                "$set": {"boekwaarde": activum.get("boekwaarde", 0) - maandelijks}
            }
        )
        
        afschrijvingen.append(clean_doc(afschrijving))
        totaal += maandelijks
    
    # Maak journaalpost
    if totaal > 0:
        journaalpost = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "volgnummer": f"MEM{datetime.utcnow().year}-AFS-{periode}",
            "dagboek_code": "MEM",
            "datum": f"{periode}-01",
            "omschrijving": f"Afschrijvingen {periode}",
            "regels": [
                {"rekening_code": "4650", "debet": totaal, "credit": 0, "omschrijving": "Afschrijvingskosten"},
                {"rekening_code": "1011", "debet": 0, "credit": totaal, "omschrijving": "Cumulatieve afschrijvingen"}
            ],
            "totaal_debet": totaal,
            "totaal_credit": totaal,
            "created_at": datetime.utcnow()
        }
        await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    await log_audit(user_id, "afschrijven", "activa", "batch", periode, {"totaal": totaal, "aantal": len(afschrijvingen)})
    return {"afschrijvingen": afschrijvingen, "totaal": totaal}

# ==================== KOSTENPLAATSEN ====================

@router.get("/kostenplaatsen")
async def get_kostenplaatsen(authorization: str = Header(None)):
    """Haal alle kostenplaatsen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    kostenplaatsen = await db.boekhouding_kostenplaatsen.find({"user_id": user_id}).sort("code", 1).to_list(100)
    return [clean_doc(k) for k in kostenplaatsen]

@router.post("/kostenplaatsen")
async def create_kostenplaats(data: KostenplaatsCreate, authorization: str = Header(None)):
    """Maak nieuwe kostenplaats"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Check duplicate
    existing = await db.boekhouding_kostenplaatsen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Kostenplaats {data.code} bestaat al")
    
    kostenplaats = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "besteed": 0,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_kostenplaatsen.insert_one(kostenplaats)
    await log_audit(user_id, "create", "kostenplaatsen", "kostenplaats", kostenplaats["id"], {"code": data.code})
    return clean_doc(kostenplaats)

@router.get("/kostenplaatsen/{kostenplaats_id}/rapport")
async def get_kostenplaats_rapport(kostenplaats_id: str, authorization: str = Header(None)):
    """Haal kostenplaats rapport op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    kostenplaats = await db.boekhouding_kostenplaatsen.find_one({"id": kostenplaats_id, "user_id": user_id})
    if not kostenplaats:
        raise HTTPException(status_code=404, detail="Kostenplaats niet gevonden")
    
    # Haal gerelateerde boekingen
    boekingen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "regels.kostenplaats_id": kostenplaats_id
    }).to_list(100)
    
    return {
        "kostenplaats": clean_doc(kostenplaats),
        "budget": kostenplaats.get("budget", 0),
        "besteed": kostenplaats.get("besteed", 0),
        "beschikbaar": kostenplaats.get("budget", 0) - kostenplaats.get("besteed", 0),
        "boekingen": len(boekingen)
    }

# ==================== WISSELKOERSEN ====================

@router.get("/wisselkoersen")
async def get_wisselkoersen(valuta_van: str = None, authorization: str = Header(None)):
    """Haal alle wisselkoersen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if valuta_van:
        query["valuta_van"] = valuta_van
    
    koersen = await db.boekhouding_wisselkoersen.find(query).sort("datum", -1).to_list(100)
    return [clean_doc(k) for k in koersen]

@router.post("/wisselkoersen")
async def create_wisselkoers(data: WisselkoersCreate, authorization: str = Header(None)):
    """Maak nieuwe wisselkoers (handmatig)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    koers = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_wisselkoersen.insert_one(koers)
    await log_audit(user_id, "create", "wisselkoersen", "wisselkoers", koers["id"], {"valuta": f"{data.valuta_van}/{data.valuta_naar}", "koers": data.koers})
    return clean_doc(koers)

@router.get("/wisselkoersen/actueel")
async def get_actuele_koersen(authorization: str = Header(None)):
    """Haal meest recente wisselkoersen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    koersen = {}
    valuta_paren = [("USD", "SRD"), ("EUR", "SRD"), ("EUR", "USD")]
    
    for van, naar in valuta_paren:
        koers = await db.boekhouding_wisselkoersen.find_one(
            {"user_id": user_id, "valuta_van": van, "valuta_naar": naar},
            sort=[("datum", -1)]
        )
        if koers:
            koersen[f"{van}_{naar}"] = {
                "koers": koers["koers"],
                "datum": koers["datum"],
                "bron": koers.get("bron", "handmatig")
            }
    
    return koersen

# ==================== VOORRAAD ====================

@router.get("/artikelen")
async def get_artikelen(type: str = None, authorization: str = Header(None)):
    """Haal alle artikelen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    
    artikelen = await db.boekhouding_artikelen.find(query).sort("naam", 1).to_list(500)
    return [clean_doc(a) for a in artikelen]

@router.post("/artikelen")
async def create_artikel(data: ArtikelCreate, authorization: str = Header(None)):
    """Maak nieuw artikel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Check duplicate
    existing = await db.boekhouding_artikelen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Artikel {data.code} bestaat al")
    
    artikel = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "voorraad": 0,
        "gereserveerd": 0,
        "beschikbaar": 0,
        "gemiddelde_inkoopprijs": data.inkoopprijs,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_artikelen.insert_one(artikel)
    await log_audit(user_id, "create", "voorraad", "artikel", artikel["id"], {"code": data.code})
    return clean_doc(artikel)

@router.get("/magazijnen")
async def get_magazijnen(authorization: str = Header(None)):
    """Haal alle magazijnen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    magazijnen = await db.boekhouding_magazijnen.find({"user_id": user_id}).sort("naam", 1).to_list(50)
    return [clean_doc(m) for m in magazijnen]

@router.post("/magazijnen")
async def create_magazijn(data: MagazijnCreate, authorization: str = Header(None)):
    """Maak nieuw magazijn"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    existing = await db.boekhouding_magazijnen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Magazijn {data.code} bestaat al")
    
    magazijn = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_magazijnen.insert_one(magazijn)
    await log_audit(user_id, "create", "voorraad", "magazijn", magazijn["id"], {"code": data.code})
    return clean_doc(magazijn)

@router.post("/mutaties")
async def create_voorraadmutatie(data: VoorraadmutatieCreate, authorization: str = Header(None)):
    """Maak nieuwe voorraadmutatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal artikel
    artikel = await db.boekhouding_artikelen.find_one({"id": data.artikel_id, "user_id": user_id})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    huidige_voorraad = artikel.get("voorraad", 0)
    
    # Bereken nieuwe voorraad
    if data.type in ["inkoop", "correctie_plus", "inventarisatie"]:
        nieuwe_voorraad = huidige_voorraad + data.aantal
    elif data.type in ["verkoop", "correctie_min"]:
        nieuwe_voorraad = huidige_voorraad - data.aantal
        if nieuwe_voorraad < 0:
            raise HTTPException(status_code=400, detail="Onvoldoende voorraad")
    elif data.type == "transfer":
        nieuwe_voorraad = huidige_voorraad  # Transfer tussen magazijnen
    else:
        nieuwe_voorraad = huidige_voorraad
    
    # Genereer volgnummer
    count = await db.boekhouding_voorraadmutaties.count_documents({"user_id": user_id})
    volgnummer = f"VM{datetime.utcnow().year}-{count + 1:05d}"
    
    mutatie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "volgnummer": volgnummer,
        **data.dict(),
        "voorraad_voor": huidige_voorraad,
        "voorraad_na": nieuwe_voorraad,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_voorraadmutaties.insert_one(mutatie)
    
    # Update artikel voorraad
    await db.boekhouding_artikelen.update_one(
        {"id": data.artikel_id},
        {"$set": {"voorraad": nieuwe_voorraad, "beschikbaar": nieuwe_voorraad - artikel.get("gereserveerd", 0)}}
    )
    
    # Update gemiddelde inkoopprijs bij inkoop
    if data.type == "inkoop" and data.eenheidsprijs:
        oude_waarde = huidige_voorraad * artikel.get("gemiddelde_inkoopprijs", 0)
        nieuwe_waarde = data.aantal * data.eenheidsprijs
        nieuwe_gem = (oude_waarde + nieuwe_waarde) / nieuwe_voorraad if nieuwe_voorraad > 0 else data.eenheidsprijs
        await db.boekhouding_artikelen.update_one(
            {"id": data.artikel_id},
            {"$set": {"gemiddelde_inkoopprijs": nieuwe_gem}}
        )
    
    await log_audit(user_id, "create", "voorraad", "mutatie", mutatie["id"], {"type": data.type, "aantal": data.aantal})
    return clean_doc(mutatie)

# ==================== PROJECTEN ====================

@router.get("/projecten")
async def get_projecten(status: str = None, authorization: str = Header(None)):
    """Haal alle projecten op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    projecten = await db.boekhouding_projecten.find(query).sort("naam", 1).to_list(100)
    return [clean_doc(p) for p in projecten]

@router.post("/projecten")
async def create_project(data: ProjectCreate, authorization: str = Header(None)):
    """Maak nieuw project"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    existing = await db.boekhouding_projecten.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Project {data.code} bestaat al")
    
    project = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "startdatum": data.startdatum.isoformat(),
        "einddatum": data.einddatum.isoformat() if data.einddatum else None,
        "totaal_uren": 0,
        "totaal_kosten": 0,
        "gefactureerd": 0,
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_projecten.insert_one(project)
    await log_audit(user_id, "create", "projecten", "project", project["id"], {"code": data.code})
    return clean_doc(project)

@router.get("/projecten/{project_id}")
async def get_project(project_id: str, authorization: str = Header(None)):
    """Haal specifiek project op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    project = await db.boekhouding_projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    return clean_doc(project)

@router.post("/projecten/{project_id}/uren")
async def registreer_uren(project_id: str, data: UrenregistratieCreate, authorization: str = Header(None)):
    """Registreer uren op project"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    project = await db.boekhouding_projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    uren = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "bedrag": data.uren * (data.uurtarief or 0),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_uren.insert_one(uren)
    
    # Update project totalen
    await db.boekhouding_projecten.update_one(
        {"id": project_id},
        {"$inc": {"totaal_uren": data.uren}}
    )
    
    await log_audit(user_id, "create", "projecten", "uren", uren["id"], {"project_id": project_id, "uren": data.uren})
    return clean_doc(uren)

@router.post("/projecten/{project_id}/kosten")
async def registreer_kosten(project_id: str, data: ProjectkostenCreate, authorization: str = Header(None)):
    """Registreer kosten op project"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    project = await db.boekhouding_projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    kosten = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_projectkosten.insert_one(kosten)
    
    # Update project totalen
    await db.boekhouding_projecten.update_one(
        {"id": project_id},
        {"$inc": {"totaal_kosten": data.bedrag}}
    )
    
    await log_audit(user_id, "create", "projecten", "kosten", kosten["id"], {"project_id": project_id, "bedrag": data.bedrag})
    return clean_doc(kosten)

@router.get("/projecten/{project_id}/overzicht")
async def get_project_overzicht(project_id: str, authorization: str = Header(None)):
    """Haal project overzicht met budget vs realisatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    project = await db.boekhouding_projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    uren = await db.boekhouding_uren.find({"user_id": user_id, "project_id": project_id}).to_list(1000)
    kosten = await db.boekhouding_projectkosten.find({"user_id": user_id, "project_id": project_id}).to_list(1000)
    
    totaal_uren = sum(u.get("uren", 0) for u in uren)
    totaal_uren_bedrag = sum(u.get("bedrag", 0) for u in uren)
    totaal_kosten = sum(k.get("bedrag", 0) for k in kosten)
    
    return {
        "project": clean_doc(project),
        "budget": project.get("budget", 0),
        "realisatie": {
            "uren": totaal_uren,
            "uren_bedrag": totaal_uren_bedrag,
            "kosten": totaal_kosten,
            "totaal": totaal_uren_bedrag + totaal_kosten
        },
        "gefactureerd": project.get("gefactureerd", 0),
        "nog_te_factureren": totaal_uren_bedrag + totaal_kosten - project.get("gefactureerd", 0)
    }

# ==================== BTW MODULE ====================

@router.get("/btw/codes")
async def get_btw_codes(authorization: str = Header(None)):
    """Haal alle BTW codes op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    codes = await db.boekhouding_btw_codes.find({"user_id": user_id}).sort("code", 1).to_list(20)
    return [clean_doc(c) for c in codes]

@router.post("/btw/codes")
async def create_btw_code(data: BTWCodeCreate, authorization: str = Header(None)):
    """Maak nieuwe BTW code"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    existing = await db.boekhouding_btw_codes.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"BTW code {data.code} bestaat al")
    
    btw_code = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_btw_codes.insert_one(btw_code)
    await log_audit(user_id, "create", "btw", "btw_code", btw_code["id"], {"code": data.code})
    return clean_doc(btw_code)

@router.get("/btw/aangifte")
async def get_btw_aangifte(jaar: int = None, kwartaal: int = None, authorization: str = Header(None)):
    """Haal BTW aangifte overzicht op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.utcnow()
    jaar = jaar or now.year
    kwartaal = kwartaal or ((now.month - 1) // 3 + 1)
    
    # Bepaal periode
    start_maand = (kwartaal - 1) * 3 + 1
    eind_maand = kwartaal * 3
    start_datum = f"{jaar}-{start_maand:02d}-01"
    if eind_maand == 12:
        eind_datum = f"{jaar}-12-31"
    else:
        eind_datum = f"{jaar}-{eind_maand + 1:02d}-01"
    
    # BTW op verkopen
    verkoop_facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "factuurdatum": {"$gte": start_datum, "$lt": eind_datum},
        "status": {"$ne": "concept"}
    }).to_list(1000)
    
    btw_verkoop = {"V25": 0, "V10": 0, "V0": 0, "VV": 0}
    omzet_per_tarief = {"V25": 0, "V10": 0, "V0": 0, "VV": 0}
    
    for f in verkoop_facturen:
        for regel in f.get("regels", []):
            code = regel.get("btw_code", "V25")
            if code in btw_verkoop:
                btw_verkoop[code] += regel.get("btw_bedrag", 0)
                omzet_per_tarief[code] += regel.get("bedrag_excl", 0)
    
    # BTW op inkopen
    inkoop_facturen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "factuurdatum": {"$gte": start_datum, "$lt": eind_datum},
        "status": {"$ne": "nieuw"}
    }).to_list(1000)
    
    btw_inkoop = {"I25": 0, "I10": 0, "I0": 0, "IM": 0}
    inkoop_per_tarief = {"I25": 0, "I10": 0, "I0": 0, "IM": 0}
    
    for f in inkoop_facturen:
        for regel in f.get("regels", []):
            code = regel.get("btw_code", "I25")
            if code in btw_inkoop:
                btw_inkoop[code] += regel.get("btw_bedrag", 0)
                inkoop_per_tarief[code] += regel.get("bedrag_excl", 0)
    
    totaal_btw_verkoop = sum(btw_verkoop.values())
    totaal_btw_inkoop = sum(btw_inkoop.values())
    
    return {
        "periode": {
            "jaar": jaar,
            "kwartaal": kwartaal,
            "van": start_datum,
            "tot": eind_datum
        },
        "verkoop": {
            "omzet_per_tarief": omzet_per_tarief,
            "btw_per_tarief": btw_verkoop,
            "totaal_omzet": sum(omzet_per_tarief.values()),
            "totaal_btw": totaal_btw_verkoop
        },
        "inkoop": {
            "inkoop_per_tarief": inkoop_per_tarief,
            "btw_per_tarief": btw_inkoop,
            "totaal_inkoop": sum(inkoop_per_tarief.values()),
            "totaal_btw": totaal_btw_inkoop
        },
        "saldo": {
            "te_betalen": totaal_btw_verkoop,
            "te_vorderen": totaal_btw_inkoop,
            "te_betalen_aan_belastingdienst": totaal_btw_verkoop - totaal_btw_inkoop
        }
    }

# ==================== RAPPORTAGES ====================

@router.get("/rapportages/balans")
async def get_balans(datum: str = None, authorization: str = Header(None)):
    """Haal balans op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    datum = datum or datetime.utcnow().date().isoformat()
    
    # Haal rekeningen per type
    rekeningen = await db.boekhouding_rekeningen.find({"user_id": user_id}).to_list(500)
    
    # Haal journaalposten
    journaalposten = await db.boekhouding_journaalposten.find({
        "user_id": user_id,
        "datum": {"$lte": datum}
    }).to_list(10000)
    
    # Bereken saldi per rekening
    saldi = {}
    for jp in journaalposten:
        for regel in jp.get("regels", []):
            code = regel.get("rekening_code")
            if code not in saldi:
                saldi[code] = 0
            saldi[code] += regel.get("debet", 0) - regel.get("credit", 0)
    
    # Groepeer per type
    activa = []
    passiva = []
    
    for rek in rekeningen:
        code = rek["code"]
        saldo = saldi.get(code, 0)
        if saldo == 0:
            continue
        
        item = {
            "code": code,
            "naam": rek["naam"],
            "saldo": abs(saldo)
        }
        
        if rek["type"] == "activa":
            activa.append(item)
        elif rek["type"] in ["passiva", "eigen_vermogen"]:
            passiva.append(item)
    
    totaal_activa = sum(a["saldo"] for a in activa)
    totaal_passiva = sum(p["saldo"] for p in passiva)
    
    return {
        "datum": datum,
        "activa": activa,
        "passiva": passiva,
        "totaal_activa": totaal_activa,
        "totaal_passiva": totaal_passiva,
        "in_balans": abs(totaal_activa - totaal_passiva) < 0.01
    }

@router.get("/rapportages/winst-verlies")
async def get_winst_verlies(jaar: int = None, authorization: str = Header(None)):
    """Haal winst & verlies rekening op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    jaar = jaar or datetime.utcnow().year
    start_datum = f"{jaar}-01-01"
    eind_datum = f"{jaar}-12-31"
    
    # Haal rekeningen
    rekeningen = await db.boekhouding_rekeningen.find({"user_id": user_id}).to_list(500)
    rek_dict = {r["code"]: r for r in rekeningen}
    
    # Haal journaalposten
    journaalposten = await db.boekhouding_journaalposten.find({
        "user_id": user_id,
        "datum": {"$gte": start_datum, "$lte": eind_datum}
    }).to_list(10000)
    
    # Bereken saldi per rekening
    saldi = {}
    for jp in journaalposten:
        for regel in jp.get("regels", []):
            code = regel.get("rekening_code")
            if code not in saldi:
                saldi[code] = 0
            saldi[code] += regel.get("credit", 0) - regel.get("debet", 0)
    
    # Groepeer omzet en kosten
    omzet = []
    kosten = []
    
    for code, saldo in saldi.items():
        if code not in rek_dict:
            continue
        rek = rek_dict[code]
        if saldo == 0:
            continue
        
        item = {
            "code": code,
            "naam": rek["naam"],
            "bedrag": abs(saldo)
        }
        
        if rek["type"] == "omzet":
            omzet.append(item)
        elif rek["type"] == "kosten":
            kosten.append(item)
    
    totaal_omzet = sum(o["bedrag"] for o in omzet)
    totaal_kosten = sum(k["bedrag"] for k in kosten)
    
    return {
        "jaar": jaar,
        "omzet": omzet,
        "kosten": kosten,
        "totaal_omzet": totaal_omzet,
        "totaal_kosten": totaal_kosten,
        "bruto_winst": totaal_omzet - totaal_kosten,
        "netto_winst": totaal_omzet - totaal_kosten  # Simplified
    }

@router.get("/rapportages/proef-saldibalans")
async def get_proef_saldibalans(datum: str = None, authorization: str = Header(None)):
    """Haal proef- en saldibalans op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    datum = datum or datetime.utcnow().date().isoformat()
    
    # Haal rekeningen
    rekeningen = await db.boekhouding_rekeningen.find({"user_id": user_id}).to_list(500)
    rek_dict = {r["code"]: r for r in rekeningen}
    
    # Haal journaalposten
    journaalposten = await db.boekhouding_journaalposten.find({
        "user_id": user_id,
        "datum": {"$lte": datum}
    }).to_list(10000)
    
    # Bereken debet/credit per rekening
    balansen = {}
    for jp in journaalposten:
        for regel in jp.get("regels", []):
            code = regel.get("rekening_code")
            if code not in balansen:
                balansen[code] = {"debet": 0, "credit": 0}
            balansen[code]["debet"] += regel.get("debet", 0)
            balansen[code]["credit"] += regel.get("credit", 0)
    
    items = []
    totaal_debet = 0
    totaal_credit = 0
    
    for code, bal in sorted(balansen.items()):
        if code not in rek_dict:
            continue
        rek = rek_dict[code]
        saldo_debet = max(0, bal["debet"] - bal["credit"])
        saldo_credit = max(0, bal["credit"] - bal["debet"])
        
        items.append({
            "code": code,
            "naam": rek["naam"],
            "debet": bal["debet"],
            "credit": bal["credit"],
            "saldo_debet": saldo_debet,
            "saldo_credit": saldo_credit
        })
        
        totaal_debet += bal["debet"]
        totaal_credit += bal["credit"]
    
    return {
        "datum": datum,
        "items": items,
        "totaal_debet": totaal_debet,
        "totaal_credit": totaal_credit,
        "in_balans": abs(totaal_debet - totaal_credit) < 0.01
    }

@router.get("/rapportages/openstaande-debiteuren")
async def get_openstaande_debiteuren_rapport(authorization: str = Header(None)):
    """Haal openstaande debiteuren rapport op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
    }).sort("vervaldatum", 1).to_list(500)
    
    # Groepeer per debiteur
    per_debiteur = {}
    for f in facturen:
        deb_id = f["debiteur_id"]
        if deb_id not in per_debiteur:
            per_debiteur[deb_id] = {
                "debiteur_naam": f.get("debiteur_naam", "Onbekend"),
                "facturen": [],
                "totaal": 0
            }
        per_debiteur[deb_id]["facturen"].append(clean_doc(f))
        per_debiteur[deb_id]["totaal"] += f.get("openstaand_bedrag", 0)
    
    return {
        "debiteuren": list(per_debiteur.values()),
        "totaal_openstaand": sum(d["totaal"] for d in per_debiteur.values())
    }

@router.get("/rapportages/openstaande-crediteuren")
async def get_openstaande_crediteuren_rapport(authorization: str = Header(None)):
    """Haal openstaande crediteuren rapport op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    facturen = await db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}
    }).sort("vervaldatum", 1).to_list(500)
    
    # Groepeer per crediteur
    per_crediteur = {}
    for f in facturen:
        cred_id = f["crediteur_id"]
        if cred_id not in per_crediteur:
            per_crediteur[cred_id] = {
                "crediteur_naam": f.get("crediteur_naam", "Onbekend"),
                "facturen": [],
                "totaal": 0
            }
        per_crediteur[cred_id]["facturen"].append(clean_doc(f))
        per_crediteur[cred_id]["totaal"] += f.get("openstaand_bedrag", 0)
    
    return {
        "crediteuren": list(per_crediteur.values()),
        "totaal_openstaand": sum(c["totaal"] for c in per_crediteur.values())
    }

# ==================== DOCUMENTEN ====================

@router.get("/documenten")
async def get_documenten(type: str = None, authorization: str = Header(None)):
    """Haal alle documenten op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    
    documenten = await db.boekhouding_documenten.find(query).sort("created_at", -1).to_list(100)
    return [clean_doc(d) for d in documenten]

@router.post("/documenten")
async def upload_document(
    naam: str,
    type: str,
    gekoppeld_aan_type: str = None,
    gekoppeld_aan_id: str = None,
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """Upload document"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Lees bestand
    content = await file.read()
    
    document = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "naam": naam,
        "type": type,
        "bestandsnaam": file.filename,
        "content_type": file.content_type,
        "grootte": len(content),
        "gekoppeld_aan_type": gekoppeld_aan_type,
        "gekoppeld_aan_id": gekoppeld_aan_id,
        "created_at": datetime.utcnow()
    }
    
    # Sla document metadata op
    await db.boekhouding_documenten.insert_one(document)
    
    # Sla bestand apart op (in productie: S3 of andere storage)
    await db.boekhouding_document_files.insert_one({
        "document_id": document["id"],
        "content": content
    })
    
    await log_audit(user_id, "upload", "documenten", "document", document["id"], {"naam": naam})
    return clean_doc(document)

# ==================== EMAIL HERINNERINGEN ====================

@router.get("/herinneringen")
async def get_herinneringen(authorization: str = Header(None)):
    """Haal alle herinneringen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    herinneringen = await db.boekhouding_herinneringen.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return [clean_doc(h) for h in herinneringen]

@router.post("/herinneringen/genereer")
async def genereer_herinneringen(authorization: str = Header(None)):
    """Genereer herinneringen voor verlopen facturen"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    today = datetime.utcnow().date()
    
    # Zoek verlopen facturen
    verlopen_facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering"]},
        "vervaldatum": {"$lt": today.isoformat()}
    }).to_list(500)
    
    nieuwe_herinneringen = []
    
    for factuur in verlopen_facturen:
        # Check of er al een recente herinnering is
        bestaande = await db.boekhouding_herinneringen.find_one({
            "user_id": user_id,
            "factuur_id": factuur["id"],
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
        })
        
        if bestaande:
            continue
        
        # Bepaal type herinnering
        aantal_herinneringen = await db.boekhouding_herinneringen.count_documents({
            "user_id": user_id,
            "factuur_id": factuur["id"]
        })
        
        if aantal_herinneringen == 0:
            type_herinnering = "eerste"
        elif aantal_herinneringen == 1:
            type_herinnering = "tweede"
        else:
            type_herinnering = "aanmaning"
        
        herinnering = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "debiteur_id": factuur["debiteur_id"],
            "factuur_id": factuur["id"],
            "factuurnummer": factuur["factuurnummer"],
            "debiteur_naam": factuur.get("debiteur_naam"),
            "openstaand_bedrag": factuur.get("openstaand_bedrag", 0),
            "vervaldatum": factuur["vervaldatum"],
            "type": type_herinnering,
            "verzonden": False,
            "created_at": datetime.utcnow()
        }
        await db.boekhouding_herinneringen.insert_one(herinnering)
        nieuwe_herinneringen.append(clean_doc(herinnering))
        
        # Update factuur status
        await db.boekhouding_verkoopfacturen.update_one(
            {"id": factuur["id"]},
            {"$set": {"status": "herinnering"}}
        )
    
    await log_audit(user_id, "genereer", "herinneringen", "batch", "all", {"aantal": len(nieuwe_herinneringen)})
    return {"herinneringen": nieuwe_herinneringen, "aantal": len(nieuwe_herinneringen)}

@router.post("/herinneringen/{herinnering_id}/verzenden")
async def verzend_herinnering(herinnering_id: str, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    """Verzend herinnering per email"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    herinnering = await db.boekhouding_herinneringen.find_one({"id": herinnering_id, "user_id": user_id})
    if not herinnering:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    
    # Haal debiteur email
    debiteur = await db.boekhouding_debiteuren.find_one({"id": herinnering["debiteur_id"]})
    if not debiteur or not debiteur.get("email"):
        raise HTTPException(status_code=400, detail="Debiteur heeft geen email adres")
    
    # Haal factuur
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": herinnering["factuur_id"]})
    
    # Email template
    type_tekst = {
        "eerste": "Eerste herinnering",
        "tweede": "Tweede herinnering",
        "aanmaning": "Aanmaning"
    }
    
    subject = f"{type_tekst.get(herinnering['type'], 'Herinnering')}: Factuur {herinnering['factuurnummer']}"
    
    body = f"""
Geachte {debiteur.get('naam')},

Dit is een {type_tekst.get(herinnering['type'], 'herinnering').lower()} voor factuur {herinnering['factuurnummer']}.

Factuurnummer: {herinnering['factuurnummer']}
Openstaand bedrag: {factuur.get('valuta', 'SRD')} {herinnering['openstaand_bedrag']:.2f}
Vervaldatum: {herinnering['vervaldatum']}

Wij verzoeken u vriendelijk dit bedrag zo spoedig mogelijk over te maken.

Met vriendelijke groet,
{user.get('company_name', 'Facturatie N.V.')}
"""
    
    # Verzend email (in background)
    async def send_email():
        try:
            # SMTP configuratie uit omgevingsvariabelen
            smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
            smtp_port = int(os.environ.get('SMTP_PORT', 587))
            smtp_user = os.environ.get('SMTP_USER')
            smtp_pass = os.environ.get('SMTP_PASS')
            
            if smtp_user and smtp_pass:
                msg = MIMEMultipart()
                msg['From'] = smtp_user
                msg['To'] = debiteur['email']
                msg['Subject'] = subject
                msg.attach(MIMEText(body, 'plain'))
                
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                
                # Update herinnering
                await db.boekhouding_herinneringen.update_one(
                    {"id": herinnering_id},
                    {"$set": {"verzonden": True, "verzonden_op": datetime.utcnow()}}
                )
        except Exception as e:
            print(f"Email verzenden mislukt: {e}")
    
    background_tasks.add_task(send_email)
    
    await log_audit(user_id, "verzenden", "herinneringen", "herinnering", herinnering_id, {"email": debiteur['email']})
    return {"message": "Herinnering wordt verzonden", "email": debiteur['email']}

@router.post("/herinneringen/batch-verzenden")
async def batch_verzend_herinneringen(background_tasks: BackgroundTasks, authorization: str = Header(None)):
    """Verzend alle niet-verzonden herinneringen"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    herinneringen = await db.boekhouding_herinneringen.find({
        "user_id": user_id,
        "verzonden": False
    }).to_list(100)
    
    verzonden = 0
    for h in herinneringen:
        try:
            # Queue voor verzending
            verzonden += 1
        except:
            pass
    
    return {"message": f"{verzonden} herinneringen in wachtrij voor verzending"}

# ==================== AUDIT TRAIL ====================

@router.get("/audit-trail")
async def get_audit_trail(
    module: str = None,
    entity_type: str = None,
    van: str = None,
    tot: str = None,
    authorization: str = Header(None)
):
    """Haal audit trail op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if module:
        query["module"] = module
    if entity_type:
        query["entity_type"] = entity_type
    if van:
        query["timestamp"] = {"$gte": datetime.fromisoformat(van)}
    if tot:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = datetime.fromisoformat(tot)
        else:
            query["timestamp"] = {"$lte": datetime.fromisoformat(tot)}
    
    trail = await db.boekhouding_audit_trail.find(query).sort("timestamp", -1).to_list(500)
    return [clean_doc(t) for t in trail]

@router.get("/audit-trail/entity/{entity_type}/{entity_id}")
async def get_audit_trail_entity(entity_type: str, entity_id: str, authorization: str = Header(None)):
    """Haal audit trail voor specifieke entiteit"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    trail = await db.boekhouding_audit_trail.find({
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id
    }).sort("timestamp", -1).to_list(100)
    
    return [clean_doc(t) for t in trail]

# ==================== PERIODE AFSLUITING ====================

@router.post("/periode/afsluiten")
async def sluit_periode(jaar: int, maand: int, authorization: str = Header(None)):
    """Sluit boekingsperiode af"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    periode = f"{jaar}-{maand:02d}"
    
    # Check of periode al afgesloten is
    bestaand = await db.boekhouding_periodes.find_one({
        "user_id": user_id,
        "periode": periode,
        "status": "afgesloten"
    })
    
    if bestaand:
        raise HTTPException(status_code=400, detail=f"Periode {periode} is al afgesloten")
    
    # Registreer afsluiting
    afsluiting = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "periode": periode,
        "jaar": jaar,
        "maand": maand,
        "status": "afgesloten",
        "afgesloten_door": user.get("email"),
        "afgesloten_op": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    await db.boekhouding_periodes.insert_one(afsluiting)
    
    await log_audit(user_id, "afsluiten", "periode", "periode", periode, {"jaar": jaar, "maand": maand})
    return {"message": f"Periode {periode} afgesloten", "periode": clean_doc(afsluiting)}

@router.get("/periode/status")
async def get_periode_status(authorization: str = Header(None)):
    """Haal status van alle periodes op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    periodes = await db.boekhouding_periodes.find({"user_id": user_id}).sort("periode", -1).to_list(24)
    return [clean_doc(p) for p in periodes]



# ============================================
# AUDIT TRAIL ENDPOINTS
# ============================================

@router.get("/audit-trail")
async def get_audit_trail(
    module: str = None,
    action: str = None,
    van: str = None,
    tot: str = None,
    limit: int = 100,
    authorization: str = Header(None)
):
    """Haal audit trail logs op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    
    if module:
        query["module"] = module
    if action:
        query["action"] = action
    if van:
        query["timestamp"] = {"$gte": van}
    if tot:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = tot
        else:
            query["timestamp"] = {"$lte": tot}
    
    logs = await db.audit_trail.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [clean_doc(log) for log in logs]

@router.post("/audit-trail")
async def create_audit_log(data: dict, authorization: str = Header(None)):
    """Maak een audit log entry aan"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.now(timezone.utc).isoformat()
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user.get("email"),
        "user_name": user.get("name"),
        "action": data.get("action"),
        "module": data.get("module", "boekhouding"),
        "entity_type": data.get("entity_type"),
        "entity_id": data.get("entity_id"),
        "details": data.get("details", {}),
        "ip_address": data.get("ip_address"),
        "timestamp": now,
        "created_at": now
    }
    
    await db.audit_trail.insert_one(log_entry)
    return clean_doc(log_entry)


# ============================================
# BETALINGSHERINNERINGEN ENDPOINTS
# ============================================

@router.get("/herinneringen")
async def get_herinneringen(authorization: str = Header(None)):
    """Haal alle betalingsherinneringen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    herinneringen = await db.herinneringen.find({"user_id": user_id}).sort("created_at", -1).to_list(1000)
    
    # Voeg factuur en debiteur info toe
    for h in herinneringen:
        if h.get("factuur_id"):
            factuur = await db.verkoopfacturen.find_one({"id": h["factuur_id"], "user_id": user_id})
            if factuur:
                h["factuurnummer"] = factuur.get("factuurnummer")
                h["bedrag"] = factuur.get("openstaand_bedrag") or factuur.get("totaal_incl_btw")
        if h.get("debiteur_id"):
            debiteur = await db.debiteuren.find_one({"id": h["debiteur_id"], "user_id": user_id})
            if debiteur:
                h["debiteur_naam"] = debiteur.get("naam")
    
    return [clean_doc(h) for h in herinneringen]

@router.get("/herinneringen/facturen")
async def get_facturen_voor_herinnering(authorization: str = Header(None)):
    """Haal openstaande facturen op die in aanmerking komen voor een herinnering"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal openstaande facturen op (niet betaald, niet gecrediteerd)
    facturen = await db.verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$nin": ["betaald", "gecrediteerd", "concept"]}
    }).sort("vervaldatum", 1).to_list(1000)
    
    result = []
    for f in facturen:
        # Haal debiteur naam op
        debiteur = await db.debiteuren.find_one({"id": f.get("debiteur_id"), "user_id": user_id})
        f["debiteur_naam"] = debiteur.get("naam") if debiteur else "Onbekend"
        result.append(clean_doc(f))
    
    return result

@router.post("/herinneringen")
async def create_herinnering(data: dict, authorization: str = Header(None)):
    """Maak een nieuwe betalingsherinnering aan"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.now(timezone.utc).isoformat()
    
    herinnering = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "debiteur_id": data.get("debiteur_id"),
        "factuur_id": data.get("factuur_id"),
        "type": data.get("type", "eerste"),  # eerste, tweede, aanmaning
        "verzonden": False,
        "verzonden_datum": None,
        "opmerkingen": data.get("opmerkingen"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.herinneringen.insert_one(herinnering)
    return clean_doc(herinnering)

@router.put("/herinneringen/{herinnering_id}/verzonden")
async def mark_herinnering_verzonden(herinnering_id: str, authorization: str = Header(None)):
    """Markeer een herinnering als verzonden"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.herinneringen.update_one(
        {"id": herinnering_id, "user_id": user_id},
        {"$set": {"verzonden": True, "verzonden_datum": now, "updated_at": now}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    
    herinnering = await db.herinneringen.find_one({"id": herinnering_id, "user_id": user_id})
    return clean_doc(herinnering)


# ============================================
# DOCUMENTEN ENDPOINTS
# ============================================

@router.get("/documenten")
async def get_documenten(authorization: str = Header(None)):
    """Haal alle documenten op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    documenten = await db.documenten.find({"user_id": user_id}).sort("created_at", -1).to_list(1000)
    return [clean_doc(d) for d in documenten]

@router.post("/documenten")
async def create_document(data: dict, authorization: str = Header(None)):
    """Maak een nieuw document record aan"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.now(timezone.utc).isoformat()
    
    document = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "naam": data.get("naam"),
        "type": data.get("type", "overig"),
        "bestandsnaam": data.get("bestandsnaam"),
        "bestandspad": data.get("bestandspad"),
        "grootte": data.get("grootte"),
        "mime_type": data.get("mime_type"),
        "gekoppeld_aan_type": data.get("gekoppeld_aan_type"),
        "gekoppeld_aan_id": data.get("gekoppeld_aan_id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.documenten.insert_one(document)
    return clean_doc(document)

@router.delete("/documenten/{document_id}")
async def delete_document(document_id: str, authorization: str = Header(None)):
    """Verwijder een document"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.documenten.delete_one({"id": document_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    return {"message": "Document verwijderd"}



# ============================================
# MT940 BANK IMPORT FUNCTIONALITEIT
# ============================================

import re
from datetime import timezone

def parse_mt940(content: str) -> List[Dict]:
    """
    Parse MT940 bank statement format
    MT940 is de standaard voor banktransacties in Nederland/Suriname
    """
    transactions = []
    current_statement = {}
    current_transaction = {}
    
    lines = content.strip().split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Tag :20: Transaction Reference Number
        if line.startswith(':20:'):
            current_statement['reference'] = line[4:]
        
        # Tag :25: Account Identification
        elif line.startswith(':25:'):
            current_statement['account'] = line[4:]
        
        # Tag :28C: Statement Number/Sequence Number
        elif line.startswith(':28C:'):
            current_statement['statement_number'] = line[5:]
        
        # Tag :60F: Opening Balance
        elif line.startswith(':60F:') or line.startswith(':60M:'):
            balance_data = line[5:]
            current_statement['opening_balance'] = parse_mt940_balance(balance_data)
        
        # Tag :61: Statement Line (Transaction)
        elif line.startswith(':61:'):
            if current_transaction:
                transactions.append(current_transaction)
            
            current_transaction = parse_mt940_transaction_line(line[4:])
            current_transaction['statement_ref'] = current_statement.get('reference', '')
            current_transaction['account'] = current_statement.get('account', '')
        
        # Tag :86: Information to Account Owner (Transaction Details)
        elif line.startswith(':86:'):
            if current_transaction:
                description = line[4:]
                # Collect multi-line description
                while i + 1 < len(lines) and not lines[i + 1].strip().startswith(':'):
                    i += 1
                    description += ' ' + lines[i].strip()
                current_transaction['description'] = description
                current_transaction['parsed_details'] = parse_mt940_description(description)
        
        # Tag :62F: Closing Balance
        elif line.startswith(':62F:') or line.startswith(':62M:'):
            balance_data = line[5:]
            current_statement['closing_balance'] = parse_mt940_balance(balance_data)
        
        i += 1
    
    # Add last transaction
    if current_transaction:
        transactions.append(current_transaction)
    
    return transactions

def parse_mt940_balance(balance_str: str) -> Dict:
    """Parse MT940 balance field"""
    # Format: C/D YYMMDD Currency Amount
    # Example: C261215SRD1234,56
    try:
        credit_debit = balance_str[0]  # C or D
        date_str = balance_str[1:7]    # YYMMDD
        currency = balance_str[7:10]   # Currency code
        amount_str = balance_str[10:].replace(',', '.')
        
        return {
            'type': 'credit' if credit_debit == 'C' else 'debit',
            'date': f"20{date_str[:2]}-{date_str[2:4]}-{date_str[4:6]}",
            'currency': currency,
            'amount': float(amount_str)
        }
    except:
        return {'raw': balance_str}

def parse_mt940_transaction_line(line: str) -> Dict:
    """
    Parse MT940 :61: transaction line
    Format: YYMMDD[MMDD]DC[R]Amount[F]TypeRef[//RefOwner][Additional]
    """
    try:
        # Date YYMMDD
        value_date = f"20{line[:2]}-{line[2:4]}-{line[4:6]}"
        
        pos = 6
        # Optional entry date MMDD
        entry_date = None
        if line[pos:pos+4].isdigit():
            entry_date = f"20{line[:2]}-{line[pos:pos+2]}-{line[pos+2:pos+4]}"
            pos += 4
        
        # Credit/Debit indicator
        cd = line[pos]
        is_credit = cd == 'C'
        pos += 1
        
        # Optional 'R' for reversal
        if line[pos] == 'R':
            pos += 1
        
        # Amount (find the end by looking for letters)
        amount_start = pos
        while pos < len(line) and (line[pos].isdigit() or line[pos] in ',.'):
            pos += 1
        amount_str = line[amount_start:pos].replace(',', '.')
        amount = float(amount_str) if amount_str else 0
        
        # Make amount negative for debits
        if not is_credit:
            amount = -amount
        
        # Transaction type (3 characters)
        trans_type = line[pos:pos+3] if pos + 3 <= len(line) else ''
        pos += 3
        
        # Reference
        ref = line[pos:pos+16] if pos + 16 <= len(line) else line[pos:]
        
        return {
            'value_date': value_date,
            'entry_date': entry_date or value_date,
            'amount': amount,
            'is_credit': is_credit,
            'transaction_type': trans_type,
            'reference': ref.strip(),
            'raw_line': line
        }
    except Exception as e:
        return {
            'value_date': datetime.now().strftime('%Y-%m-%d'),
            'entry_date': datetime.now().strftime('%Y-%m-%d'),
            'amount': 0,
            'is_credit': True,
            'transaction_type': '',
            'reference': '',
            'raw_line': line,
            'parse_error': str(e)
        }

def parse_mt940_description(description: str) -> Dict:
    """Parse MT940 :86: description field to extract structured data"""
    result = {
        'raw': description,
        'counterparty_name': None,
        'counterparty_account': None,
        'payment_reference': None
    }
    
    # Common patterns for Surinamese banks
    # /NAME/ or /NAAM/ for counterparty name
    name_match = re.search(r'/(?:NAME|NAAM)/([^/]+)', description, re.IGNORECASE)
    if name_match:
        result['counterparty_name'] = name_match.group(1).strip()
    
    # /REMI/ for remittance info (often contains invoice numbers)
    remi_match = re.search(r'/REMI/([^/]+)', description, re.IGNORECASE)
    if remi_match:
        result['payment_reference'] = remi_match.group(1).strip()
    
    # /ORDP/ or /BENM/ for counterparty
    ordp_match = re.search(r'/(?:ORDP|BENM)/([^/]+)', description, re.IGNORECASE)
    if ordp_match and not result['counterparty_name']:
        result['counterparty_name'] = ordp_match.group(1).strip()
    
    # /IBAN/ for account
    iban_match = re.search(r'/IBAN/([A-Z0-9]+)', description)
    if iban_match:
        result['counterparty_account'] = iban_match.group(1)
    
    # Look for invoice-like patterns
    invoice_match = re.search(r'(?:VF|INV|FACT)[- ]?(\d{4}[-/]?\d+)', description, re.IGNORECASE)
    if invoice_match:
        result['invoice_reference'] = invoice_match.group(0)
    
    return result


@router.post("/bank/import/mt940")
async def import_mt940(
    bank_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Importeer banktransacties uit MT940 bestand
    Ondersteunt Surinaamse banken: DSB, Hakrinbank, Finabank, Republic Bank
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Verify bank account exists
    bank_account = await db.bankrekeningen.find_one({"id": bank_id, "user_id": user_id})
    if not bank_account:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    # Read file content
    content = await file.read()
    try:
        content_str = content.decode('utf-8')
    except:
        content_str = content.decode('latin-1')
    
    # Parse MT940
    transactions = parse_mt940(content_str)
    
    if not transactions:
        raise HTTPException(status_code=400, detail="Geen transacties gevonden in bestand")
    
    now = datetime.now(timezone.utc).isoformat()
    imported_count = 0
    skipped_count = 0
    
    for tx in transactions:
        # Check for duplicates based on date, amount and reference
        existing = await db.bankmutaties.find_one({
            "user_id": user_id,
            "bankrekening_id": bank_id,
            "datum": tx.get('value_date'),
            "bedrag": tx.get('amount'),
            "referentie": tx.get('reference', '')[:50]
        })
        
        if existing:
            skipped_count += 1
            continue
        
        # Parse description for counterparty info
        parsed = tx.get('parsed_details', {})
        
        mutatie = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "bankrekening_id": bank_id,
            "datum": tx.get('value_date'),
            "boekdatum": tx.get('entry_date'),
            "bedrag": tx.get('amount'),
            "omschrijving": tx.get('description', ''),
            "tegenrekening": parsed.get('counterparty_account', ''),
            "tegenpartij": parsed.get('counterparty_name', ''),
            "referentie": tx.get('reference', '')[:50],
            "betalingskenmerk": parsed.get('payment_reference', ''),
            "transactietype": tx.get('transaction_type', ''),
            "status": "nieuw",
            "import_bron": "mt940",
            "import_bestand": file.filename,
            "gematched_factuur_id": None,
            "gematched_type": None,
            "created_at": now,
            "updated_at": now
        }
        
        await db.bankmutaties.insert_one(mutatie)
        imported_count += 1
    
    # Update bank account balance
    latest_balance = await db.bankmutaties.aggregate([
        {"$match": {"user_id": user_id, "bankrekening_id": bank_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
    ]).to_list(1)
    
    if latest_balance:
        new_balance = bank_account.get('beginsaldo', 0) + latest_balance[0].get('totaal', 0)
        await db.bankrekeningen.update_one(
            {"id": bank_id, "user_id": user_id},
            {"$set": {"huidig_saldo": new_balance, "updated_at": now}}
        )
    
    # Log to audit trail
    await db.audit_trail.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user.get("email"),
        "action": "import",
        "module": "bank",
        "entity_type": "mt940",
        "entity_id": bank_id,
        "details": {
            "bestand": file.filename,
            "geimporteerd": imported_count,
            "overgeslagen": skipped_count
        },
        "timestamp": now
    })
    
    return {
        "message": f"MT940 import voltooid",
        "imported": imported_count,
        "skipped": skipped_count,
        "total_in_file": len(transactions)
    }


@router.post("/bank/import/csv")
async def import_bank_csv(
    bank_id: str,
    file: UploadFile = File(...),
    delimiter: str = ";",
    date_format: str = "%Y-%m-%d",
    authorization: str = Header(None)
):
    """
    Importeer banktransacties uit CSV bestand
    Verwacht kolommen: datum, omschrijving, bedrag (of: datum;omschrijving;bedrag)
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Verify bank account exists
    bank_account = await db.bankrekeningen.find_one({"id": bank_id, "user_id": user_id})
    if not bank_account:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    # Read file content
    content = await file.read()
    try:
        content_str = content.decode('utf-8')
    except:
        content_str = content.decode('latin-1')
    
    lines = content_str.strip().split('\n')
    if len(lines) < 2:
        raise HTTPException(status_code=400, detail="CSV bestand heeft geen data")
    
    # Skip header
    now = datetime.now(timezone.utc).isoformat()
    imported_count = 0
    errors = []
    
    for i, line in enumerate(lines[1:], start=2):
        try:
            parts = line.split(delimiter)
            if len(parts) < 3:
                errors.append(f"Regel {i}: onvoldoende kolommen")
                continue
            
            datum = parts[0].strip()
            omschrijving = parts[1].strip()
            bedrag_str = parts[2].strip().replace(',', '.').replace('"', '')
            bedrag = float(bedrag_str)
            
            # Optional columns
            tegenrekening = parts[3].strip() if len(parts) > 3 else ''
            tegenpartij = parts[4].strip() if len(parts) > 4 else ''
            
            mutatie = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "bankrekening_id": bank_id,
                "datum": datum,
                "boekdatum": datum,
                "bedrag": bedrag,
                "omschrijving": omschrijving,
                "tegenrekening": tegenrekening,
                "tegenpartij": tegenpartij,
                "referentie": "",
                "status": "nieuw",
                "import_bron": "csv",
                "import_bestand": file.filename,
                "gematched_factuur_id": None,
                "created_at": now,
                "updated_at": now
            }
            
            await db.bankmutaties.insert_one(mutatie)
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Regel {i}: {str(e)}")
    
    return {
        "message": f"CSV import voltooid",
        "imported": imported_count,
        "errors": errors[:10],  # Max 10 errors
        "total_errors": len(errors)
    }


# ============================================
# AUTOMATISCHE BANK RECONCILIATIE
# ============================================

@router.post("/reconciliatie/auto-match/{bank_id}")
async def auto_match_transactions(bank_id: str, authorization: str = Header(None)):
    """
    Automatisch banktransacties matchen met openstaande facturen
    Matching criteria:
    1. Exact bedrag match
    2. Factuurnummer in omschrijving
    3. Klant/leverancier naam match
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Get unmatched bank mutations
    unmatched = await db.bankmutaties.find({
        "user_id": user_id,
        "bankrekening_id": bank_id,
        "status": "nieuw",
        "gematched_factuur_id": None
    }).to_list(1000)
    
    if not unmatched:
        return {"message": "Geen ongematchte transacties", "matched": 0}
    
    # Get all open invoices
    open_sales = await db.verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "openstaand", "gedeeltelijk_betaald"]}
    }).to_list(1000)
    
    open_purchases = await db.inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["geboekt", "openstaand", "gedeeltelijk_betaald"]}
    }).to_list(1000)
    
    # Build lookup dictionaries
    sales_by_amount = {}
    sales_by_number = {}
    for inv in open_sales:
        amount = round(inv.get('openstaand_bedrag') or inv.get('totaal_incl_btw', 0), 2)
        if amount not in sales_by_amount:
            sales_by_amount[amount] = []
        sales_by_amount[amount].append(inv)
        
        number = inv.get('factuurnummer', '').upper()
        if number:
            sales_by_number[number] = inv
    
    purchases_by_amount = {}
    purchases_by_number = {}
    for inv in open_purchases:
        amount = round(inv.get('openstaand_bedrag') or inv.get('totaal_incl_btw', 0), 2)
        if amount not in purchases_by_amount:
            purchases_by_amount[amount] = []
        purchases_by_amount[amount].append(inv)
        
        number = inv.get('extern_factuurnummer', '').upper()
        intern = inv.get('intern_nummer', '').upper()
        if number:
            purchases_by_number[number] = inv
        if intern:
            purchases_by_number[intern] = inv
    
    now = datetime.now(timezone.utc).isoformat()
    matched_count = 0
    
    for mutatie in unmatched:
        bedrag = round(mutatie.get('bedrag', 0), 2)
        omschrijving = (mutatie.get('omschrijving', '') + ' ' + mutatie.get('betalingskenmerk', '')).upper()
        tegenpartij = mutatie.get('tegenpartij', '').upper()
        
        matched_invoice = None
        match_type = None
        confidence = 0
        
        # Strategy 1: Invoice number in description (highest confidence)
        for inv_number, inv in {**sales_by_number, **purchases_by_number}.items():
            if inv_number in omschrijving:
                matched_invoice = inv
                match_type = 'verkoopfactuur' if inv in open_sales else 'inkoopfactuur'
                confidence = 95
                break
        
        # Strategy 2: Exact amount match for incoming (sales) payments
        if not matched_invoice and bedrag > 0:
            candidates = sales_by_amount.get(bedrag, [])
            if len(candidates) == 1:
                matched_invoice = candidates[0]
                match_type = 'verkoopfactuur'
                confidence = 80
            elif len(candidates) > 1:
                # Try to narrow down by counterparty name
                for inv in candidates:
                    debiteur = await db.debiteuren.find_one({"id": inv.get('debiteur_id'), "user_id": user_id})
                    if debiteur:
                        deb_naam = debiteur.get('naam', '').upper()
                        if deb_naam and (deb_naam in tegenpartij or tegenpartij in deb_naam):
                            matched_invoice = inv
                            match_type = 'verkoopfactuur'
                            confidence = 85
                            break
        
        # Strategy 3: Exact amount match for outgoing (purchase) payments
        if not matched_invoice and bedrag < 0:
            candidates = purchases_by_amount.get(abs(bedrag), [])
            if len(candidates) == 1:
                matched_invoice = candidates[0]
                match_type = 'inkoopfactuur'
                confidence = 80
            elif len(candidates) > 1:
                # Try to narrow down by counterparty name
                for inv in candidates:
                    crediteur = await db.crediteuren.find_one({"id": inv.get('crediteur_id'), "user_id": user_id})
                    if crediteur:
                        cred_naam = crediteur.get('naam', '').upper()
                        if cred_naam and (cred_naam in tegenpartij or tegenpartij in cred_naam):
                            matched_invoice = inv
                            match_type = 'inkoopfactuur'
                            confidence = 85
                            break
        
        # Update mutation if matched
        if matched_invoice and confidence >= 80:
            await db.bankmutaties.update_one(
                {"id": mutatie['id'], "user_id": user_id},
                {"$set": {
                    "gematched_factuur_id": matched_invoice.get('id'),
                    "gematched_type": match_type,
                    "match_confidence": confidence,
                    "status": "gematched",
                    "updated_at": now
                }}
            )
            matched_count += 1
    
    # Log to audit trail
    await db.audit_trail.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user.get("email"),
        "action": "auto_match",
        "module": "reconciliatie",
        "entity_type": "bankmutaties",
        "entity_id": bank_id,
        "details": {
            "verwerkt": len(unmatched),
            "gematched": matched_count
        },
        "timestamp": now
    })
    
    return {
        "message": f"Auto-match voltooid",
        "processed": len(unmatched),
        "matched": matched_count,
        "unmatched": len(unmatched) - matched_count
    }


@router.post("/reconciliatie/manual-match")
async def manual_match_transaction(
    mutatie_id: str,
    factuur_id: str,
    factuur_type: str,  # 'verkoopfactuur' of 'inkoopfactuur'
    authorization: str = Header(None)
):
    """Handmatig een banktransactie koppelen aan een factuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Verify mutation exists
    mutatie = await db.bankmutaties.find_one({"id": mutatie_id, "user_id": user_id})
    if not mutatie:
        raise HTTPException(status_code=404, detail="Bankmutatie niet gevonden")
    
    # Verify invoice exists
    collection = db.verkoopfacturen if factuur_type == 'verkoopfactuur' else db.inkoopfacturen
    factuur = await collection.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bankmutaties.update_one(
        {"id": mutatie_id, "user_id": user_id},
        {"$set": {
            "gematched_factuur_id": factuur_id,
            "gematched_type": factuur_type,
            "match_confidence": 100,
            "status": "gematched",
            "updated_at": now
        }}
    )
    
    return {"message": "Handmatige match succesvol", "mutatie_id": mutatie_id, "factuur_id": factuur_id}


@router.post("/reconciliatie/book-payment")
async def book_matched_payment(
    mutatie_id: str,
    authorization: str = Header(None)
):
    """Boek een gematchte banktransactie als betaling op de factuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Get mutation
    mutatie = await db.bankmutaties.find_one({"id": mutatie_id, "user_id": user_id})
    if not mutatie:
        raise HTTPException(status_code=404, detail="Bankmutatie niet gevonden")
    
    if mutatie.get('status') != 'gematched':
        raise HTTPException(status_code=400, detail="Transactie is niet gematched")
    
    factuur_id = mutatie.get('gematched_factuur_id')
    factuur_type = mutatie.get('gematched_type')
    
    if not factuur_id or not factuur_type:
        raise HTTPException(status_code=400, detail="Geen gekoppelde factuur")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get invoice
    collection = db.verkoopfacturen if factuur_type == 'verkoopfactuur' else db.inkoopfacturen
    factuur = await collection.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Calculate payment
    betaald_bedrag = abs(mutatie.get('bedrag', 0))
    huidig_openstaand = factuur.get('openstaand_bedrag') or factuur.get('totaal_incl_btw', 0)
    nieuw_openstaand = max(0, huidig_openstaand - betaald_bedrag)
    
    # Determine new status
    if nieuw_openstaand == 0:
        nieuwe_status = 'betaald'
    elif nieuw_openstaand < huidig_openstaand:
        nieuwe_status = 'gedeeltelijk_betaald'
    else:
        nieuwe_status = factuur.get('status')
    
    # Update invoice
    await collection.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {
            "openstaand_bedrag": nieuw_openstaand,
            "status": nieuwe_status,
            "laatste_betaling_datum": mutatie.get('datum'),
            "updated_at": now
        }}
    )
    
    # Create payment record
    betaling = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "factuur_id": factuur_id,
        "factuur_type": factuur_type,
        "bankmutatie_id": mutatie_id,
        "bedrag": betaald_bedrag,
        "datum": mutatie.get('datum'),
        "omschrijving": f"Automatisch geboekt van bankmutatie",
        "created_at": now
    }
    await db.factuur_betalingen.insert_one(betaling)
    
    # Update mutation status
    await db.bankmutaties.update_one(
        {"id": mutatie_id, "user_id": user_id},
        {"$set": {
            "status": "geboekt",
            "updated_at": now
        }}
    )
    
    return {
        "message": "Betaling geboekt",
        "factuur_id": factuur_id,
        "betaald_bedrag": betaald_bedrag,
        "nieuw_openstaand": nieuw_openstaand,
        "nieuwe_status": nieuwe_status
    }


@router.get("/reconciliatie/overzicht/{bank_id}")
async def get_reconciliation_overview(bank_id: str, authorization: str = Header(None)):
    """Haal reconciliatie overzicht op voor een bankrekening"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Get unmatched bank mutations
    bankmutaties = await db.bankmutaties.find({
        "user_id": user_id,
        "bankrekening_id": bank_id,
        "status": {"$in": ["nieuw", "gematched"]}
    }).sort("datum", -1).to_list(100)
    
    # Get open sales invoices
    verkoopfacturen = await db.verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "openstaand", "gedeeltelijk_betaald"]}
    }).sort("vervaldatum", 1).to_list(100)
    
    # Get open purchase invoices
    inkoopfacturen = await db.inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["geboekt", "openstaand", "gedeeltelijk_betaald"]}
    }).sort("vervaldatum", 1).to_list(100)
    
    # Add customer/supplier names
    for f in verkoopfacturen:
        debiteur = await db.debiteuren.find_one({"id": f.get('debiteur_id'), "user_id": user_id})
        f['debiteur_naam'] = debiteur.get('naam') if debiteur else 'Onbekend'
    
    for f in inkoopfacturen:
        crediteur = await db.crediteuren.find_one({"id": f.get('crediteur_id'), "user_id": user_id})
        f['crediteur_naam'] = crediteur.get('naam') if crediteur else 'Onbekend'
    
    return {
        "bankmutaties": [clean_doc(m) for m in bankmutaties],
        "verkoopfacturen": [clean_doc(f) for f in verkoopfacturen],
        "inkoopfacturen": [clean_doc(f) for f in inkoopfacturen]
    }


# ============================================
# FILE UPLOAD VOOR DOCUMENTEN
# ============================================

import base64
import hashlib

UPLOAD_DIR = "/app/uploads/documenten"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'}

@router.post("/documenten/upload")
async def upload_document(
    file: UploadFile = File(...),
    naam: str = None,
    type: str = "overig",
    gekoppeld_aan_type: str = None,
    gekoppeld_aan_id: str = None,
    authorization: str = Header(None)
):
    """
    Upload een document bestand
    Ondersteunde formaten: PDF, afbeeldingen, Office documenten
    Max grootte: 10MB
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Validate file extension
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Bestandstype niet toegestaan. Toegestaan: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Bestand te groot. Maximum: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Create upload directory if not exists
    user_upload_dir = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(user_upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_hash = hashlib.md5(content).hexdigest()[:8]
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    safe_filename = f"{timestamp}_{file_hash}{ext}"
    file_path = os.path.join(user_upload_dir, safe_filename)
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(content)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create document record
    document = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "naam": naam or filename,
        "originele_bestandsnaam": filename,
        "bestandsnaam": safe_filename,
        "bestandspad": file_path,
        "type": type,
        "grootte": len(content),
        "mime_type": file.content_type,
        "extensie": ext,
        "gekoppeld_aan_type": gekoppeld_aan_type,
        "gekoppeld_aan_id": gekoppeld_aan_id,
        "created_at": now,
        "updated_at": now
    }
    
    await db.documenten.insert_one(document)
    
    # Log to audit trail
    await db.audit_trail.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user.get("email"),
        "action": "upload",
        "module": "documenten",
        "entity_type": "document",
        "entity_id": document['id'],
        "details": {
            "bestandsnaam": filename,
            "grootte": len(content),
            "type": type
        },
        "timestamp": now
    })
    
    return clean_doc(document)


@router.get("/documenten/{document_id}/download")
async def download_document(document_id: str, authorization: str = Header(None)):
    """Download een document"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    document = await db.documenten.find_one({"id": document_id, "user_id": user_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    file_path = document.get('bestandspad')
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Bestand niet gevonden op server")
    
    # Read file and return as base64
    with open(file_path, 'rb') as f:
        content = f.read()
    
    return {
        "filename": document.get('originele_bestandsnaam') or document.get('bestandsnaam'),
        "mime_type": document.get('mime_type'),
        "content": base64.b64encode(content).decode('utf-8')
    }


@router.get("/documenten/{document_id}/preview")
async def preview_document(document_id: str, authorization: str = Header(None)):
    """Haal document preview info op (voor afbeeldingen en PDFs)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    document = await db.documenten.find_one({"id": document_id, "user_id": user_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    ext = document.get('extensie', '').lower()
    can_preview = ext in {'.pdf', '.jpg', '.jpeg', '.png', '.gif'}
    
    result = {
        "id": document.get('id'),
        "naam": document.get('naam'),
        "type": document.get('type'),
        "mime_type": document.get('mime_type'),
        "grootte": document.get('grootte'),
        "can_preview": can_preview
    }
    
    # For images, include base64 thumbnail
    if ext in {'.jpg', '.jpeg', '.png', '.gif'}:
        file_path = document.get('bestandspad')
        if file_path and os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
            result['preview_data'] = base64.b64encode(content).decode('utf-8')
    
    return result
