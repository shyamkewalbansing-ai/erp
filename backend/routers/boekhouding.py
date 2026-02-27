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

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
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

async def get_current_user(authorization: str = None) -> dict:
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
async def initialiseer_boekhouding(authorization: str = None):
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
async def get_dashboard(authorization: str = None):
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
async def get_actielijst(authorization: str = None):
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
async def get_rekeningen(type: str = None, authorization: str = None):
    """Haal alle grootboekrekeningen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    
    rekeningen = await db.boekhouding_rekeningen.find(query).sort("code", 1).to_list(500)
    return [clean_doc(r) for r in rekeningen]

@router.post("/rekeningen")
async def create_rekening(data: RekeningCreate, authorization: str = None):
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
async def get_dagboeken(authorization: str = None):
    """Haal alle dagboeken op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    dagboeken = await db.boekhouding_dagboeken.find({"user_id": user_id}).to_list(50)
    return [clean_doc(d) for d in dagboeken]

@router.post("/journaalposten")
async def create_journaalpost(data: JournaalpostCreate, authorization: str = None):
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
async def get_journaalposten(dagboek: str = None, van: str = None, tot: str = None, authorization: str = None):
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
async def get_debiteuren(authorization: str = None):
    """Haal alle debiteuren op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    debiteuren = await db.boekhouding_debiteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    return [clean_doc(d) for d in debiteuren]

@router.post("/debiteuren")
async def create_debiteur(data: DebiteurCreate, authorization: str = None):
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
async def get_debiteur(debiteur_id: str, authorization: str = None):
    """Haal specifieke debiteur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    debiteur = await db.boekhouding_debiteuren.find_one({"id": debiteur_id, "user_id": user_id})
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return clean_doc(debiteur)

@router.put("/debiteuren/{debiteur_id}")
async def update_debiteur(debiteur_id: str, data: DebiteurCreate, authorization: str = None):
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
async def get_debiteur_openstaand(debiteur_id: str, authorization: str = None):
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
async def get_ouderdom_analyse(authorization: str = None):
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
async def get_crediteuren(authorization: str = None):
    """Haal alle crediteuren op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    crediteuren = await db.boekhouding_crediteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    return [clean_doc(c) for c in crediteuren]

@router.post("/crediteuren")
async def create_crediteur(data: CrediteurCreate, authorization: str = None):
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
async def get_crediteur(crediteur_id: str, authorization: str = None):
    """Haal specifieke crediteur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    crediteur = await db.boekhouding_crediteuren.find_one({"id": crediteur_id, "user_id": user_id})
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return clean_doc(crediteur)

@router.put("/crediteuren/{crediteur_id}")
async def update_crediteur(crediteur_id: str, data: CrediteurCreate, authorization: str = None):
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
async def get_betaaladvies(authorization: str = None):
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
async def get_verkoopfacturen(status: str = None, debiteur_id: str = None, authorization: str = None):
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
async def create_verkoopfactuur(data: VerkoopfactuurCreate, authorization: str = None):
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
async def get_verkoopfactuur(factuur_id: str, authorization: str = None):
    """Haal specifieke verkoopfactuur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return clean_doc(factuur)

@router.post("/verkoopfacturen/{factuur_id}/verzenden")
async def verzend_verkoopfactuur(factuur_id: str, authorization: str = None):
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
async def registreer_betaling_verkoopfactuur(factuur_id: str, bedrag: float, datum: date = None, authorization: str = None):
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
async def get_inkoopfacturen(status: str = None, crediteur_id: str = None, authorization: str = None):
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
async def create_inkoopfactuur(data: InkoopfactuurCreate, authorization: str = None):
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
async def boek_inkoopfactuur(factuur_id: str, authorization: str = None):
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
async def registreer_betaling_inkoopfactuur(factuur_id: str, bedrag: float, datum: date = None, authorization: str = None):
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
