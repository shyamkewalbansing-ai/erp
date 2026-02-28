"""
Boekhouding Module - Complete Surinaams Boekhoudsysteem
======================================================
Refactored to match the frontend API client (boekhoudingApi.js)
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Header, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
import uuid
import os
import io
import re
import base64
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pymongo import ReturnDocument
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Import PDF generator and MT940 parser
try:
    from services.pdf_generator import generate_invoice_pdf, generate_reminder_pdf
    from services.mt940_parser import parse_mt940_file, suggest_reconciliation, MT940Transaction
    PDF_ENABLED = True
    MT940_ENABLED = True
except ImportError:
    PDF_ENABLED = False
    MT940_ENABLED = False

# Import email service
try:
    from services.unified_email_service import email_service
    EMAIL_ENABLED = True
except ImportError:
    EMAIL_ENABLED = False

# Import Excel export
try:
    from services.excel_export import (
        export_grootboek_excel, export_debiteuren_excel, export_crediteuren_excel,
        export_btw_aangifte_excel, export_winst_verlies_excel, export_balans_excel,
        export_ouderdom_excel
    )
    EXCEL_ENABLED = True
except ImportError:
    EXCEL_ENABLED = False

router = APIRouter(prefix="/boekhouding", tags=["Boekhouding"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'surirentals')]

# Upload settings
UPLOAD_DIR = "/app/uploads/documenten"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'}

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
        "timestamp": datetime.now(timezone.utc)
    })

# ==================== AUTOMATISCHE GROOTBOEKBOEKING ====================
# Deze functies zorgen voor automatische journaalposten bij transacties

# Standaard rekeningcodes (kunnen worden geconfigureerd per bedrijf)
DEFAULT_REKENINGEN = {
    "debiteuren": "1300",
    "crediteuren": "2300",
    "btw_verkoop": "2350",
    "btw_inkoop": "1350",
    "omzet": "4000",
    "inkoop": "5000",
    "bank": "1500",
    "kas": "1400",
    "voorraad": "1200"
}

# Alternatieve codes die ook geaccepteerd worden (voor verschillende schema's)
ALTERNATIEVE_CODES = {
    "debiteuren": ["1300", "1100"],
    "crediteuren": ["2300", "1600", "1700"],
    "btw_verkoop": ["2350", "2210", "1810"],
    "btw_inkoop": ["1350", "1400", "1410"],
    "omzet": ["4000", "8000", "8010", "8020"],
    "inkoop": ["5000", "4000", "4100"],
    "bank": ["1500", "1110", "1120"],
    "kas": ["1400", "1000", "1100"],
    "voorraad": ["1200", "3000", "3100"]
}

async def get_rekening_by_code(user_id: str, code: str) -> dict:
    """Zoek rekening op basis van code"""
    rekening = await db.boekhouding_rekeningen.find_one({"user_id": user_id, "code": code})
    return rekening

async def get_rekening_voor_type(user_id: str, rekening_type: str) -> str:
    """Zoek een geschikte rekeningcode voor een bepaald type boeking"""
    # Probeer eerst de standaard code
    standaard_code = DEFAULT_REKENINGEN.get(rekening_type)
    if standaard_code:
        rekening = await get_rekening_by_code(user_id, standaard_code)
        if rekening:
            return standaard_code
    
    # Probeer alternatieve codes
    alternatieven = ALTERNATIEVE_CODES.get(rekening_type, [])
    for code in alternatieven:
        rekening = await get_rekening_by_code(user_id, code)
        if rekening:
            return code
    
    # Als geen rekening gevonden, zoek op basis van naam/type
    naam_zoekterms = {
        "debiteuren": ["debiteur"],
        "crediteuren": ["crediteur"],
        "btw_verkoop": ["btw te betalen", "btw af te dragen"],
        "btw_inkoop": ["btw te vorderen", "voorbelasting"],
        "omzet": ["omzet", "verkoop"],
        "inkoop": ["inkoop"],
        "bank": ["bank"],
        "kas": ["kas"],
        "voorraad": ["voorraad"]
    }
    
    zoekterms = naam_zoekterms.get(rekening_type, [])
    for term in zoekterms:
        rekening = await db.boekhouding_rekeningen.find_one({
            "user_id": user_id, 
            "naam": {"$regex": term, "$options": "i"}
        })
        if rekening:
            return rekening.get("code")
    
    # Fallback naar standaard code
    return standaard_code

async def update_rekening_saldo(user_id: str, code: str, bedrag: float, is_debet: bool = True):
    """Update het saldo van een grootboekrekening"""
    rekening = await get_rekening_by_code(user_id, code)
    if not rekening:
        return False
    
    # Bij activa en kosten: debet verhoogt, credit verlaagt
    # Bij passiva en opbrengsten: credit verhoogt, debet verlaagt
    rekening_type = rekening.get("type", "")
    
    if rekening_type in ["activa", "kosten"]:
        saldo_wijziging = bedrag if is_debet else -bedrag
    else:  # passiva, opbrengsten
        saldo_wijziging = -bedrag if is_debet else bedrag
    
    await db.boekhouding_rekeningen.update_one(
        {"user_id": user_id, "code": code},
        {"$inc": {"saldo": saldo_wijziging}}
    )
    return True

async def create_auto_journaalpost(
    user_id: str,
    dagboek_code: str,
    datum: date,
    omschrijving: str,
    regels: list,
    document_ref: str = None,
    auto_boeken: bool = True
):
    """
    Maak automatisch een journaalpost aan
    
    regels = [
        {"rekening_code": "1300", "omschrijving": "Debiteur X", "debet": 1100, "credit": 0},
        {"rekening_code": "4000", "omschrijving": "Omzet", "debet": 0, "credit": 1000},
        {"rekening_code": "2350", "omschrijving": "BTW", "debet": 0, "credit": 100},
    ]
    """
    totaal_debet = sum(r.get("debet", 0) for r in regels)
    totaal_credit = sum(r.get("credit", 0) for r in regels)
    
    # Controleer balans
    if abs(totaal_debet - totaal_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Journaalpost niet in balans: debet={totaal_debet}, credit={totaal_credit}")
    
    # Genereer volgnummer
    count = await db.boekhouding_journaalposten.count_documents({"user_id": user_id, "dagboek_code": dagboek_code})
    volgnummer = f"{dagboek_code}{datetime.now().year}-{count + 1:05d}"
    
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "volgnummer": volgnummer,
        "dagboek_code": dagboek_code,
        "datum": datum.isoformat() if isinstance(datum, date) else datum,
        "omschrijving": omschrijving,
        "regels": regels,
        "document_ref": document_ref,
        "totaal_debet": totaal_debet,
        "totaal_credit": totaal_credit,
        "status": "geboekt" if auto_boeken else "concept",
        "created_at": datetime.now(timezone.utc),
        "auto_generated": True
    }
    
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update rekening saldi als auto_boeken
    if auto_boeken:
        for regel in regels:
            code = regel.get("rekening_code")
            debet = regel.get("debet", 0)
            credit = regel.get("credit", 0)
            if debet > 0:
                await update_rekening_saldo(user_id, code, debet, is_debet=True)
            if credit > 0:
                await update_rekening_saldo(user_id, code, credit, is_debet=False)
    
    return journaalpost

async def boek_verkoopfactuur(user_id: str, factuur: dict):
    """
    Boek een verkoopfactuur naar het grootboek
    
    Debet: Debiteuren (totaal incl BTW)
    Credit: Omzet (subtotaal excl BTW)
    Credit: BTW te betalen (BTW bedrag)
    """
    # Zoek de juiste rekeningcodes voor deze gebruiker
    debiteuren_code = await get_rekening_voor_type(user_id, "debiteuren")
    omzet_code = await get_rekening_voor_type(user_id, "omzet")
    btw_code = await get_rekening_voor_type(user_id, "btw_verkoop")
    
    regels = [
        {
            "rekening_code": debiteuren_code,
            "omschrijving": f"Debiteur: {factuur.get('debiteur_naam', 'Onbekend')}",
            "debet": factuur.get("totaal_incl_btw", 0),
            "credit": 0
        },
        {
            "rekening_code": omzet_code,
            "omschrijving": f"Omzet factuur {factuur.get('factuurnummer', '')}",
            "debet": 0,
            "credit": factuur.get("subtotaal", 0)
        }
    ]
    
    # Voeg BTW regel alleen toe als er BTW is
    btw_bedrag = factuur.get("btw_bedrag", 0)
    if btw_bedrag > 0:
        regels.append({
            "rekening_code": btw_code,
            "omschrijving": f"BTW factuur {factuur.get('factuurnummer', '')}",
            "debet": 0,
            "credit": btw_bedrag
        })
    
    await create_auto_journaalpost(
        user_id=user_id,
        dagboek_code="VK",  # Verkoop dagboek
        datum=factuur.get("factuurdatum", date.today()),
        omschrijving=f"Verkoopfactuur {factuur.get('factuurnummer', '')} - {factuur.get('debiteur_naam', '')}",
        regels=regels,
        document_ref=factuur.get("id")
    )

async def boek_betaling_ontvangen(user_id: str, factuur: dict, betaling: dict, bankrekening_code: str = None):
    """
    Boek een ontvangen betaling naar het grootboek
    
    Debet: Bank/Kas
    Credit: Debiteuren
    """
    bank_code = bankrekening_code or DEFAULT_REKENINGEN["bank"]
    
    regels = [
        {
            "rekening_code": bank_code,
            "omschrijving": f"Betaling ontvangen {factuur.get('factuurnummer', '')}",
            "debet": betaling.get("bedrag", 0),
            "credit": 0
        },
        {
            "rekening_code": DEFAULT_REKENINGEN["debiteuren"],
            "omschrijving": f"Afboeking debiteur: {factuur.get('debiteur_naam', 'Onbekend')}",
            "debet": 0,
            "credit": betaling.get("bedrag", 0)
        }
    ]
    
    await create_auto_journaalpost(
        user_id=user_id,
        dagboek_code="BK",  # Bank dagboek
        datum=betaling.get("datum", date.today()),
        omschrijving=f"Betaling factuur {factuur.get('factuurnummer', '')} - {factuur.get('debiteur_naam', '')}",
        regels=regels,
        document_ref=factuur.get("id")
    )

async def boek_inkoopfactuur(user_id: str, factuur: dict):
    """
    Boek een inkoopfactuur naar het grootboek
    
    Debet: Inkoop (subtotaal excl BTW)
    Debet: BTW te vorderen (BTW bedrag)
    Credit: Crediteuren (totaal incl BTW)
    """
    regels = [
        {
            "rekening_code": DEFAULT_REKENINGEN["inkoop"],
            "omschrijving": f"Inkoop factuur {factuur.get('factuurnummer', '')}",
            "debet": factuur.get("subtotaal", 0),
            "credit": 0
        }
    ]
    
    # Voeg BTW regel alleen toe als er BTW is
    btw_bedrag = factuur.get("btw_bedrag", 0)
    if btw_bedrag > 0:
        regels.append({
            "rekening_code": DEFAULT_REKENINGEN["btw_inkoop"],
            "omschrijving": f"Voorbelasting factuur {factuur.get('factuurnummer', '')}",
            "debet": btw_bedrag,
            "credit": 0
        })
    
    regels.append({
        "rekening_code": DEFAULT_REKENINGEN["crediteuren"],
        "omschrijving": f"Crediteur: {factuur.get('crediteur_naam', 'Onbekend')}",
        "debet": 0,
        "credit": factuur.get("totaal_incl_btw", 0)
    })
    
    await create_auto_journaalpost(
        user_id=user_id,
        dagboek_code="IK",  # Inkoop dagboek
        datum=factuur.get("factuurdatum", date.today()),
        omschrijving=f"Inkoopfactuur {factuur.get('factuurnummer', '')} - {factuur.get('crediteur_naam', '')}",
        regels=regels,
        document_ref=factuur.get("id")
    )

# ==================== PYDANTIC MODELS ====================

class RekeningCreate(BaseModel):
    code: str
    naam: str
    type: str
    categorie: str
    btw_code: Optional[str] = None
    valuta: str = "SRD"
    is_actief: bool = True

class BTWCodeCreate(BaseModel):
    code: str
    naam: str
    percentage: float
    type: str
    grootboekrekening_af: Optional[str] = None
    grootboekrekening_te_betalen: Optional[str] = None

class WisselkoersCreate(BaseModel):
    valuta_van: str
    valuta_naar: str
    koers: float
    datum: date
    bron: str = "handmatig"

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
    bank: Optional[str] = None

class BankrekeningCreate(BaseModel):
    naam: str
    rekeningnummer: str
    bank: str
    valuta: str = "SRD"
    beginsaldo: float = 0
    grootboekrekening: Optional[str] = None

class BanktransactieCreate(BaseModel):
    bankrekening_id: str
    datum: date
    omschrijving: str
    bedrag: float
    tegenrekening: Optional[str] = None
    tegenpartij: Optional[str] = None

class JournaalpostCreate(BaseModel):
    dagboek_code: str
    datum: date
    omschrijving: str
    regels: List[Dict[str, Any]]
    document_ref: Optional[str] = None

class ArtikelCreate(BaseModel):
    code: str
    naam: str
    omschrijving: Optional[str] = None
    type: str = "product"
    eenheid: str = "stuk"
    inkoopprijs: float = 0
    verkoopprijs: float = 0
    btw_code: str = "V25"
    minimum_voorraad: int = 0
    leverancier_id: Optional[str] = None
    foto_url: Optional[str] = None

class VastActivumCreate(BaseModel):
    naam: str
    categorie: str
    aanschafdatum: date
    aanschafwaarde: float
    restwaarde: float = 0
    levensduur_jaren: int
    afschrijvingsmethode: str = "lineair"
    locatie: Optional[str] = None
    serienummer: Optional[str] = None

class ProjectCreate(BaseModel):
    code: str
    naam: str
    klant_id: Optional[str] = None
    type: str = "klant"
    startdatum: date
    einddatum: Optional[date] = None
    budget: float = 0
    valuta: str = "SRD"
    status: str = "actief"

class UrenCreate(BaseModel):
    project_id: str
    medewerker_id: Optional[str] = None
    datum: date
    uren: float
    omschrijving: str
    uurtarief: Optional[float] = None
    factureerbaar: bool = True

class KostenplaatsCreate(BaseModel):
    code: str
    naam: str
    type: str = "afdeling"
    budget: float = 0
    verantwoordelijke: Optional[str] = None

class MagazijnCreate(BaseModel):
    code: str
    naam: str
    adres: Optional[str] = None
    is_hoofdmagazijn: bool = False

class VoorraadmutatieCreate(BaseModel):
    artikel_id: str
    magazijn_id: Optional[str] = "default"
    type: str
    aantal: int
    eenheidsprijs: Optional[float] = None
    referentie: Optional[str] = None
    opmerkingen: Optional[str] = None

class VerkoopfactuurCreate(BaseModel):
    debiteur_id: str
    factuurdatum: date
    vervaldatum: Optional[date] = None
    valuta: str = "SRD"
    wisselkoers: float = 1.0
    regels: List[Dict[str, Any]]
    opmerkingen: Optional[str] = None
    referentie: Optional[str] = None

class InkoopfactuurCreate(BaseModel):
    crediteur_id: str
    extern_factuurnummer: str
    factuurdatum: date
    vervaldatum: Optional[date] = None
    valuta: str = "SRD"
    wisselkoers: float = 1.0
    regels: List[Dict[str, Any]]
    opmerkingen: Optional[str] = None

class OfferteCreate(BaseModel):
    debiteur_id: str
    datum: date
    geldig_tot: date
    regels: List[Dict[str, Any]]
    opmerkingen: Optional[str] = None

class InkooporderCreate(BaseModel):
    crediteur_id: str
    datum: date
    regels: List[Dict[str, Any]]
    opmerkingen: Optional[str] = None

class VerkooporderCreate(BaseModel):
    debiteur_id: str
    datum: date
    regels: List[Dict[str, Any]]
    opmerkingen: Optional[str] = None

class InstellingenUpdate(BaseModel):
    bedrijfsnaam: Optional[str] = None
    adres: Optional[str] = None
    plaats: Optional[str] = None
    land: str = "Suriname"
    telefoon: Optional[str] = None
    email: Optional[str] = None
    btw_nummer: Optional[str] = None
    kvk_nummer: Optional[str] = None
    bank_naam: Optional[str] = None
    bank_rekening: Optional[str] = None
    logo_url: Optional[str] = None
    factuur_voorwaarden: Optional[str] = None
    standaard_betalingstermijn: int = 30
    # Email instellingen
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    # Factuur template instellingen
    factuur_primaire_kleur: Optional[str] = "#1e293b"
    factuur_secundaire_kleur: Optional[str] = "#f1f5f9"
    factuur_template: Optional[str] = "standaard"
    # Automatische herinneringen instellingen
    auto_herinneringen_enabled: Optional[bool] = False
    dagen_voor_eerste_herinnering: Optional[int] = 7
    dagen_tussen_herinneringen: Optional[int] = 7
    max_herinneringen: Optional[int] = 3


class BedrijfCreate(BaseModel):
    naam: str
    adres: Optional[str] = None
    plaats: Optional[str] = None
    land: str = "Suriname"
    telefoon: Optional[str] = None
    email: Optional[str] = None
    btw_nummer: Optional[str] = None
    kvk_nummer: Optional[str] = None

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard(authorization: str = Header(None)):
    """Haal dashboard KPI's op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Omzet deze maand (alle facturen behalve concept)
    omzet_maand = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
    ]).to_list(1)
    omzet_maand_val = omzet_maand[0]["totaal"] if omzet_maand else 0
    
    # Kosten deze maand
    kosten_maand = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
    ]).to_list(1)
    kosten_maand_val = kosten_maand[0]["totaal"] if kosten_maand else 0
    
    # Openstaande debiteuren (alle niet-betaalde facturen inclusief concept)
    openstaand_debiteuren = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$nin": ["betaald", "geannuleerd"]}, "openstaand_bedrag": {"$gt": 0}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    openstaand_deb = openstaand_debiteuren[0]["totaal"] if openstaand_debiteuren else 0
    
    # Openstaande crediteuren (alle niet-betaalde facturen)
    openstaand_crediteuren = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$nin": ["betaald", "geannuleerd"]}, "openstaand_bedrag": {"$gt": 0}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    openstaand_cred = openstaand_crediteuren[0]["totaal"] if openstaand_crediteuren else 0
    
    # Aantal openstaande facturen
    facturen_openstaand_count = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id, 
        "status": {"$nin": ["betaald", "geannuleerd"]},
        "openstaand_bedrag": {"$gt": 0}
    })
    
    # BTW berekening - verkoop BTW (alle facturen behalve concept voor echte aangifte)
    btw_verkoop = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "geannuleerd"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    btw_verkoop_val = btw_verkoop[0]["totaal"] if btw_verkoop else 0
    
    # BTW inkoop (voorbelasting)
    btw_inkoop = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "geannuleerd"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    btw_inkoop_val = btw_inkoop[0]["totaal"] if btw_inkoop else 0
    
    btw_te_betalen = btw_verkoop_val - btw_inkoop_val
    
    # Bank- en kaspositie
    bank_saldo = await db.boekhouding_bankrekeningen.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$valuta", "totaal": {"$sum": "$huidig_saldo"}}}
    ]).to_list(10)
    
    liquiditeit = {"SRD": 0, "USD": 0, "EUR": 0}
    for b in bank_saldo:
        if b["_id"] in liquiditeit:
            liquiditeit[b["_id"]] = b["totaal"]
    
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
            "dit_jaar": omzet_maand_val
        },
        "kosten": {
            "deze_maand": kosten_maand_val
        },
        "winst": {
            "deze_maand": omzet_maand_val - kosten_maand_val
        },
        "openstaand": {
            "debiteuren": openstaand_deb,
            "crediteuren": openstaand_cred,
            "facturen_count": facturen_openstaand_count
        },
        "btw": {
            "verkoop": btw_verkoop_val,
            "inkoop": btw_inkoop_val,
            "te_betalen": btw_te_betalen
        },
        "liquiditeit": {
            "bank_srd": liquiditeit["SRD"],
            "bank_usd": liquiditeit["USD"],
            "bank_eur": liquiditeit["EUR"]
        },
        "wisselkoersen": {
            "usd_srd": koers_usd.get("koers") if koers_usd else None,
            "eur_srd": koers_eur.get("koers") if koers_eur else None
        }
    }


@router.get("/dashboard/charts")
async def get_dashboard_charts(authorization: str = Header(None)):
    """Haal dashboard grafiek data op - omzet/kosten per maand"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    now = datetime.now(timezone.utc)
    year = now.year
    
    # Omzet per maand (laatste 12 maanden)
    maanden = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]
    omzet_per_maand = []
    kosten_per_maand = []
    
    for month in range(1, 13):
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        
        # Omzet
        omzet = await db.boekhouding_verkoopfacturen.aggregate([
            {"$match": {
                "user_id": user_id,
                "status": {"$ne": "concept"},
                "factuurdatum": {"$gte": start_date, "$lt": end_date}
            }},
            {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
        ]).to_list(1)
        
        # Kosten
        kosten = await db.boekhouding_inkoopfacturen.aggregate([
            {"$match": {
                "user_id": user_id,
                "status": {"$ne": "nieuw"},
                "factuurdatum": {"$gte": start_date, "$lt": end_date}
            }},
            {"$group": {"_id": None, "totaal": {"$sum": "$totaal_incl_btw"}}}
        ]).to_list(1)
        
        omzet_per_maand.append({
            "maand": maanden[month - 1],
            "omzet": omzet[0]["totaal"] if omzet else 0,
            "kosten": kosten[0]["totaal"] if kosten else 0
        })
    
    # Ouderdomsanalyse voor donut chart
    today = datetime.now().date()
    facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
    }).to_list(1000)
    
    ouderdom = {"0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0}
    for f in facturen:
        try:
            verval = datetime.fromisoformat(f["vervaldatum"]).date()
            dagen = (today - verval).days
            bedrag = f.get("openstaand_bedrag", 0)
            
            if dagen <= 30:
                ouderdom["0_30"] += bedrag
            elif dagen <= 60:
                ouderdom["31_60"] += bedrag
            elif dagen <= 90:
                ouderdom["61_90"] += bedrag
            else:
                ouderdom["90_plus"] += bedrag
        except:
            pass
    
    ouderdom_data = [
        {"name": "0-30 dagen", "value": ouderdom["0_30"], "color": "#22c55e"},
        {"name": "31-60 dagen", "value": ouderdom["31_60"], "color": "#f59e0b"},
        {"name": "61-90 dagen", "value": ouderdom["61_90"], "color": "#f97316"},
        {"name": ">90 dagen", "value": ouderdom["90_plus"], "color": "#dc2626"}
    ]
    
    # Cashflow (inkomsten - uitgaven per maand)
    cashflow_data = [
        {
            "maand": item["maand"],
            "inkomsten": item["omzet"],
            "uitgaven": item["kosten"],
            "netto": item["omzet"] - item["kosten"]
        }
        for item in omzet_per_maand
    ]
    
    # Top 5 klanten
    top_klanten = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {
            "_id": "$debiteur_naam",
            "totaal": {"$sum": "$totaal_incl_btw"},
            "aantal": {"$sum": 1}
        }},
        {"$sort": {"totaal": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    return {
        "omzet_kosten": omzet_per_maand,
        "ouderdom": ouderdom_data,
        "cashflow": cashflow_data,
        "top_klanten": [{"naam": k["_id"] or "Onbekend", "omzet": k["totaal"], "facturen": k["aantal"]} for k in top_klanten],
        "jaar": year
    }

# ==================== MULTI-TENANT / BEDRIJVEN ====================

@router.get("/bedrijven")
async def get_bedrijven(authorization: str = Header(None)):
    """Haal alle bedrijven van de gebruiker op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    bedrijven = await db.boekhouding_bedrijven.find({"user_id": user_id}).sort("naam", 1).to_list(50)
    
    # Als geen bedrijven, maak default bedrijf (atomair met upsert)
    if not bedrijven:
        default_id = str(uuid.uuid4())
        # Use findOneAndUpdate with upsert to prevent race conditions
        result = await db.boekhouding_bedrijven.find_one_and_update(
            {"user_id": user_id, "is_default": True},
            {"$setOnInsert": {
                "id": default_id,
                "user_id": user_id,
                "naam": user.get('company_name', 'Mijn Bedrijf'),
                "is_actief": True,
                "is_default": True,
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        bedrijven = [result] if result else []
    
    return [clean_doc(b) for b in bedrijven]


@router.get("/bedrijven/actief")
async def get_actief_bedrijf(authorization: str = Header(None)):
    """Haal het actieve bedrijf op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Zoek actief bedrijf
    bedrijf = await db.boekhouding_bedrijven.find_one({"user_id": user_id, "is_actief": True})
    
    if not bedrijf:
        # Zoek bestaand bedrijf
        bedrijf = await db.boekhouding_bedrijven.find_one({"user_id": user_id})
        if not bedrijf:
            # Atomair default aanmaken met upsert om race conditions te voorkomen
            default_id = str(uuid.uuid4())
            bedrijf = await db.boekhouding_bedrijven.find_one_and_update(
                {"user_id": user_id, "is_default": True},
                {"$setOnInsert": {
                    "id": default_id,
                    "user_id": user_id,
                    "naam": user.get('company_name', 'Mijn Bedrijf'),
                    "is_actief": True,
                    "is_default": True,
                    "created_at": datetime.now(timezone.utc)
                }},
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
        else:
            # Activeer bestaand bedrijf
            await db.boekhouding_bedrijven.update_one(
                {"id": bedrijf["id"]},
                {"$set": {"is_actief": True}}
            )
            bedrijf["is_actief"] = True
    
    return clean_doc(bedrijf)


@router.post("/bedrijven")
async def create_bedrijf(data: BedrijfCreate, authorization: str = Header(None)):
    """Maak nieuw bedrijf"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    bedrijf = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "is_actief": False,
        "is_default": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_bedrijven.insert_one(bedrijf)
    return clean_doc(bedrijf)


@router.put("/bedrijven/{bedrijf_id}/activeer")
async def activeer_bedrijf(bedrijf_id: str, authorization: str = Header(None)):
    """Activeer een bedrijf (schakel naar dit bedrijf)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Deactiveer alle andere bedrijven
    await db.boekhouding_bedrijven.update_many(
        {"user_id": user_id},
        {"$set": {"is_actief": False}}
    )
    
    # Activeer dit bedrijf
    result = await db.boekhouding_bedrijven.update_one(
        {"id": bedrijf_id, "user_id": user_id},
        {"$set": {"is_actief": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    return {"message": "Bedrijf geactiveerd", "bedrijf_id": bedrijf_id}


@router.delete("/bedrijven/{bedrijf_id}")
async def delete_bedrijf(bedrijf_id: str, authorization: str = Header(None)):
    """Verwijder bedrijf"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Check of het niet het enige bedrijf is
    count = await db.boekhouding_bedrijven.count_documents({"user_id": user_id})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Kan het enige bedrijf niet verwijderen")
    
    # Check of het niet actief is
    bedrijf = await db.boekhouding_bedrijven.find_one({"id": bedrijf_id, "user_id": user_id})
    if bedrijf and bedrijf.get("is_actief"):
        raise HTTPException(status_code=400, detail="Kan actief bedrijf niet verwijderen. Activeer eerst een ander bedrijf.")
    
    result = await db.boekhouding_bedrijven.delete_one({"id": bedrijf_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    
    return {"message": "Bedrijf verwijderd"}

# ==================== WISSELKOERSEN ====================

@router.get("/wisselkoersen")
async def get_wisselkoersen(authorization: str = Header(None)):
    """Haal alle wisselkoersen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    koersen = await db.boekhouding_wisselkoersen.find({"user_id": user_id}).sort("datum", -1).to_list(100)
    return [clean_doc(k) for k in koersen]

@router.get("/wisselkoersen/latest")
async def get_latest_wisselkoersen(authorization: str = Header(None)):
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

@router.post("/wisselkoersen")
async def create_wisselkoers(data: WisselkoersCreate, authorization: str = Header(None)):
    """Maak nieuwe wisselkoers"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    koers = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_wisselkoersen.insert_one(koers)
    await log_audit(user_id, "create", "wisselkoersen", "wisselkoers", koers["id"], {"valuta": f"{data.valuta_van}/{data.valuta_naar}"})
    return clean_doc(koers)


@router.post("/wisselkoersen/sync-cme")
async def sync_cme_wisselkoersen(authorization: str = Header(None)):
    """
    Synchroniseer wisselkoersen van CME.sr (Central Money Exchange Suriname)
    Haalt actuele inkoop- en verkoopkoersen op voor USD en EUR
    """
    from services.cme_scraper import fetch_cme_exchange_rates
    
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal koersen op van CME.sr
    result = await fetch_cme_exchange_rates()
    
    if not result.get("success"):
        raise HTTPException(
            status_code=503, 
            detail=result.get("error", "Kon wisselkoersen niet ophalen van CME.sr")
        )
    
    rates = result.get("rates", {})
    saved_rates = []
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    # Sla elke koers apart op (inkoop en verkoop)
    rate_mappings = [
        ("USD", "SRD", "inkoop", rates.get("USD_SRD", {}).get("inkoop")),
        ("USD", "SRD", "verkoop", rates.get("USD_SRD", {}).get("verkoop")),
        ("EUR", "SRD", "inkoop", rates.get("EUR_SRD", {}).get("inkoop")),
        ("EUR", "SRD", "verkoop", rates.get("EUR_SRD", {}).get("verkoop")),
        ("EUR", "USD", "inkoop", rates.get("EUR_USD", {}).get("inkoop")),
    ]
    
    for valuta_van, valuta_naar, koers_type, koers_waarde in rate_mappings:
        if koers_waarde is not None and koers_waarde > 0:
            # Check of er al een koers bestaat voor vandaag met dit type
            existing = await db.boekhouding_wisselkoersen.find_one({
                "user_id": user_id,
                "valuta_van": valuta_van,
                "valuta_naar": valuta_naar,
                "koers_type": koers_type,
                "datum": today
            })
            
            if existing:
                # Update bestaande koers
                await db.boekhouding_wisselkoersen.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "koers": koers_waarde,
                        "bron": "CME.sr",
                        "updated_at": now
                    }}
                )
                saved_rates.append({
                    "valuta": f"{valuta_van}/{valuta_naar}",
                    "type": koers_type,
                    "koers": koers_waarde,
                    "actie": "bijgewerkt"
                })
            else:
                # Maak nieuwe koers
                new_koers = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "valuta_van": valuta_van,
                    "valuta_naar": valuta_naar,
                    "koers": koers_waarde,
                    "koers_type": koers_type,
                    "datum": today,
                    "bron": "CME.sr",
                    "created_at": now
                }
                await db.boekhouding_wisselkoersen.insert_one(new_koers)
                saved_rates.append({
                    "valuta": f"{valuta_van}/{valuta_naar}",
                    "type": koers_type,
                    "koers": koers_waarde,
                    "actie": "aangemaakt"
                })
    
    await log_audit(user_id, "sync", "wisselkoersen", "cme_import", None, {
        "aantal_koersen": len(saved_rates),
        "bron": "CME.sr"
    })
    
    return {
        "success": True,
        "message": f"{len(saved_rates)} wisselkoersen gesynchroniseerd van CME.sr",
        "timestamp": result.get("timestamp"),
        "cme_last_updated": result.get("last_updated"),
        "rates": saved_rates
    }


@router.get("/wisselkoersen/cme-preview")
async def preview_cme_wisselkoersen(authorization: str = Header(None)):
    """
    Preview van CME.sr koersen zonder op te slaan
    """
    from services.cme_scraper import fetch_cme_exchange_rates, format_rate_for_display
    
    await get_current_user(authorization)  # Alleen authenticatie check
    
    result = await fetch_cme_exchange_rates()
    
    if not result.get("success"):
        raise HTTPException(
            status_code=503, 
            detail=result.get("error", "Kon wisselkoersen niet ophalen van CME.sr")
        )
    
    return {
        "success": True,
        "timestamp": result.get("timestamp"),
        "cme_last_updated": result.get("last_updated"),
        "rates": result.get("rates"),
        "formatted": format_rate_for_display(result.get("rates", {}))
    }


@router.get("/wisselkoersen/scheduler-status")
async def get_wisselkoers_scheduler_status(authorization: str = Header(None)):
    """
    Bekijk de status van de automatische wisselkoers scheduler.
    Toont wanneer de volgende sync gepland staat.
    """
    from services.wisselkoers_scheduler import get_scheduler_status
    
    await get_current_user(authorization)  # Auth check
    
    status = get_scheduler_status()
    
    # Voeg Surinaamse tijd toe voor duidelijkheid
    if status.get("jobs"):
        for job in status["jobs"]:
            if job.get("next_run"):
                # Convert UTC to Suriname time (UTC-3)
                from datetime import datetime, timedelta
                utc_time = datetime.fromisoformat(job["next_run"].replace('Z', '+00:00'))
                srt_time = utc_time - timedelta(hours=3)
                job["next_run_srt"] = srt_time.strftime("%H:%M:%S SRT")
    
    return {
        "scheduler": status,
        "sync_times": ["09:00 SRT", "10:00 SRT", "11:00 SRT"],
        "timezone": "UTC-3 (Suriname Time)"
    }

# ==================== BTW CODES ====================

@router.get("/btw-codes")
async def get_btw_codes(authorization: str = Header(None)):
    """Haal alle BTW codes op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    codes = await db.boekhouding_btw_codes.find({"user_id": user_id}).sort("code", 1).to_list(50)
    return [clean_doc(c) for c in codes]

@router.post("/btw-codes")
async def create_btw_code(data: BTWCodeCreate, authorization: str = Header(None)):
    """Maak nieuwe BTW code"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    btw_code = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_btw_codes.insert_one(btw_code)
    return clean_doc(btw_code)

@router.put("/btw-codes/{code_id}")
async def update_btw_code(code_id: str, data: BTWCodeCreate, authorization: str = Header(None)):
    """Update BTW code"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_btw_codes.update_one(
        {"id": code_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="BTW code niet gevonden")
    return {"message": "BTW code bijgewerkt"}

@router.delete("/btw-codes/{code_id}")
async def delete_btw_code(code_id: str, authorization: str = Header(None)):
    """Verwijder BTW code"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_btw_codes.delete_one({"id": code_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="BTW code niet gevonden")
    return {"message": "BTW code verwijderd"}

# ==================== REKENINGEN (Chart of Accounts) ====================

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
    
    existing = await db.boekhouding_rekeningen.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Rekening {data.code} bestaat al")
    
    rekening = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_rekeningen.insert_one(rekening)
    return clean_doc(rekening)

@router.put("/rekeningen/{rekening_id}")
async def update_rekening(rekening_id: str, data: RekeningCreate, authorization: str = Header(None)):
    """Update grootboekrekening"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_rekeningen.update_one(
        {"id": rekening_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    return {"message": "Rekening bijgewerkt"}

@router.delete("/rekeningen/{rekening_id}")
async def delete_rekening(rekening_id: str, authorization: str = Header(None)):
    """Verwijder grootboekrekening"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_rekeningen.delete_one({"id": rekening_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    return {"message": "Rekening verwijderd"}


@router.post("/rekeningen/init-standaard")
async def init_standaard_rekeningschema(authorization: str = Header(None)):
    """Initialiseer standaard Surinaams rekeningschema"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Check if user already has accounts
    existing_count = await db.boekhouding_rekeningen.count_documents({"user_id": user_id})
    if existing_count > 0:
        raise HTTPException(status_code=400, detail="Er zijn al rekeningen aanwezig. Verwijder eerst alle rekeningen om het standaard schema te laden.")
    
    # Standaard Surinaams Rekeningschema
    standaard_rekeningen = [
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
        
        # Vlottende activa (12xx-13xx)
        {"code": "1200", "naam": "Voorraad goederen", "type": "activa", "categorie": "vlottende_activa"},
        {"code": "1210", "naam": "Voorraad grondstoffen", "type": "activa", "categorie": "vlottende_activa"},
        {"code": "1220", "naam": "Onderhanden werk", "type": "activa", "categorie": "vlottende_activa"},
        {"code": "1300", "naam": "Debiteuren", "type": "activa", "categorie": "vorderingen"},
        {"code": "1310", "naam": "Vooruitbetaalde kosten", "type": "activa", "categorie": "vorderingen"},
        {"code": "1320", "naam": "Te ontvangen bedragen", "type": "activa", "categorie": "vorderingen"},
        {"code": "1350", "naam": "BTW te vorderen", "type": "activa", "categorie": "vorderingen"},
        
        # Liquide middelen (14xx-15xx)
        {"code": "1400", "naam": "Kas SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1410", "naam": "Kas USD", "type": "activa", "categorie": "liquide_middelen", "valuta": "USD"},
        {"code": "1420", "naam": "Kas EUR", "type": "activa", "categorie": "liquide_middelen", "valuta": "EUR"},
        {"code": "1500", "naam": "Bank DSB SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1510", "naam": "Bank DSB USD", "type": "activa", "categorie": "liquide_middelen", "valuta": "USD"},
        {"code": "1520", "naam": "Bank Republic", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1530", "naam": "Bank Hakrinbank", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1540", "naam": "Bank Finabank", "type": "activa", "categorie": "liquide_middelen"},
        
        # PASSIVA (2xxx)
        {"code": "2000", "naam": "Eigen vermogen", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2010", "naam": "Startkapitaal", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2020", "naam": "Privé-stortingen", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2030", "naam": "Privé-opnames", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2100", "naam": "Ingehouden winst", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2200", "naam": "Lening langlopend", "type": "passiva", "categorie": "langlopende_schulden"},
        {"code": "2210", "naam": "Hypotheek", "type": "passiva", "categorie": "langlopende_schulden"},
        {"code": "2300", "naam": "Crediteuren", "type": "passiva", "categorie": "kortlopende_schulden"},
        {"code": "2310", "naam": "Te betalen kosten", "type": "passiva", "categorie": "kortlopende_schulden"},
        {"code": "2350", "naam": "BTW te betalen", "type": "passiva", "categorie": "kortlopende_schulden"},
        {"code": "2360", "naam": "Loonheffing te betalen", "type": "passiva", "categorie": "kortlopende_schulden"},
        {"code": "2370", "naam": "Pensioenpremie te betalen", "type": "passiva", "categorie": "kortlopende_schulden"},
        {"code": "2380", "naam": "AOV te betalen", "type": "passiva", "categorie": "kortlopende_schulden"},
        
        # OPBRENGSTEN (4xxx)
        {"code": "4000", "naam": "Omzet binnenland", "type": "opbrengsten", "categorie": "omzet"},
        {"code": "4010", "naam": "Omzet export", "type": "opbrengsten", "categorie": "omzet"},
        {"code": "4020", "naam": "Omzet diensten", "type": "opbrengsten", "categorie": "omzet"},
        {"code": "4100", "naam": "Kortingen gegeven", "type": "opbrengsten", "categorie": "omzet"},
        {"code": "4200", "naam": "Overige opbrengsten", "type": "opbrengsten", "categorie": "overige_opbrengsten"},
        {"code": "4210", "naam": "Rente-inkomsten", "type": "opbrengsten", "categorie": "overige_opbrengsten"},
        {"code": "4220", "naam": "Koerswinst", "type": "opbrengsten", "categorie": "overige_opbrengsten"},
        
        # KOSTEN (5xxx-8xxx)
        {"code": "5000", "naam": "Inkoopwaarde omzet", "type": "kosten", "categorie": "kostprijs_omzet"},
        {"code": "5010", "naam": "Inkoop goederen", "type": "kosten", "categorie": "kostprijs_omzet"},
        {"code": "5020", "naam": "Kortingen ontvangen", "type": "kosten", "categorie": "kostprijs_omzet"},
        {"code": "5100", "naam": "Directe loonkosten", "type": "kosten", "categorie": "kostprijs_omzet"},
        
        # Personeelskosten (6xxx)
        {"code": "6000", "naam": "Salarissen", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6010", "naam": "Vakantiegeld", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6020", "naam": "Sociale lasten", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6030", "naam": "Pensioenpremie", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6040", "naam": "AOV premie", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6050", "naam": "Reiskosten personeel", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6060", "naam": "Opleidingskosten", "type": "kosten", "categorie": "personeelskosten"},
        {"code": "6070", "naam": "Overige personeelskosten", "type": "kosten", "categorie": "personeelskosten"},
        
        # Huisvestingskosten (7xxx)
        {"code": "7000", "naam": "Huur bedrijfspand", "type": "kosten", "categorie": "huisvestingskosten"},
        {"code": "7010", "naam": "Energie en water", "type": "kosten", "categorie": "huisvestingskosten"},
        {"code": "7020", "naam": "Onderhoud pand", "type": "kosten", "categorie": "huisvestingskosten"},
        {"code": "7030", "naam": "Verzekering pand", "type": "kosten", "categorie": "huisvestingskosten"},
        {"code": "7040", "naam": "Schoonmaakkosten", "type": "kosten", "categorie": "huisvestingskosten"},
        
        # Overige bedrijfskosten (8xxx)
        {"code": "8000", "naam": "Kantoorkosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8010", "naam": "Telefoon en internet", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8020", "naam": "Portokosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8030", "naam": "Drukwerk en kantoorbenodigdheden", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8100", "naam": "Autokosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8110", "naam": "Brandstof", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8120", "naam": "Onderhoud voertuigen", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8130", "naam": "Verzekering voertuigen", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8200", "naam": "Accountantskosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8210", "naam": "Advieskosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8220", "naam": "Juridische kosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8300", "naam": "Reclame en marketing", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8310", "naam": "Representatiekosten", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8400", "naam": "Afschrijvingskosten", "type": "kosten", "categorie": "afschrijvingen"},
        {"code": "8500", "naam": "Rentekosten", "type": "kosten", "categorie": "financiele_kosten"},
        {"code": "8510", "naam": "Bankkosten", "type": "kosten", "categorie": "financiele_kosten"},
        {"code": "8520", "naam": "Koersverlies", "type": "kosten", "categorie": "financiele_kosten"},
        {"code": "8600", "naam": "Verzekeringen algemeen", "type": "kosten", "categorie": "overige_kosten"},
        {"code": "8700", "naam": "Belastingen", "type": "kosten", "categorie": "belastingen"},
        {"code": "8710", "naam": "Inkomstenbelasting", "type": "kosten", "categorie": "belastingen"},
        {"code": "8720", "naam": "Vermogensbelasting", "type": "kosten", "categorie": "belastingen"},
        {"code": "8900", "naam": "Diverse kosten", "type": "kosten", "categorie": "overige_kosten"},
        
        # Tussenrekeningen (9xxx)
        {"code": "9000", "naam": "Kruisposten", "type": "activa", "categorie": "tussenrekeningen"},
        {"code": "9100", "naam": "Vraagposten", "type": "activa", "categorie": "tussenrekeningen"},
        {"code": "9900", "naam": "Resultaat lopend jaar", "type": "passiva", "categorie": "resultaat"},
    ]
    
    # Insert all accounts
    for rek in standaard_rekeningen:
        rekening = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": rek["code"],
            "naam": rek["naam"],
            "type": rek["type"],
            "categorie": rek["categorie"],
            "valuta": rek.get("valuta", "SRD"),
            "saldo": 0,
            "externe_code": None,
            "is_actief": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.boekhouding_rekeningen.insert_one(rekening)
    
    return {"message": f"{len(standaard_rekeningen)} standaard rekeningen aangemaakt", "count": len(standaard_rekeningen)}

@router.put("/rekeningen/{rekening_id}/externe-code")
async def update_externe_code(rekening_id: str, externe_code: str = None, authorization: str = Header(None)):
    """Koppel een externe code aan een rekening (voor integratie met externe systemen)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_rekeningen.update_one(
        {"id": rekening_id, "user_id": user_id},
        {"$set": {"externe_code": externe_code, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    return {"message": "Externe code gekoppeld"}

@router.get("/rekeningen/zoek-op-externe-code/{externe_code}")
async def zoek_rekening_op_externe_code(externe_code: str, authorization: str = Header(None)):
    """Zoek een rekening op basis van externe code"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    rekening = await db.boekhouding_rekeningen.find_one({"user_id": user_id, "externe_code": externe_code})
    if not rekening:
        raise HTTPException(status_code=404, detail=f"Geen rekening gevonden met externe code {externe_code}")
    return clean_doc(rekening)



# ==================== JOURNAALPOSTEN ====================

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

@router.post("/journaalposten")
async def create_journaalpost(data: JournaalpostCreate, authorization: str = Header(None)):
    """Maak nieuwe journaalpost"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    totaal_debet = sum(r.get("debet", 0) for r in data.regels)
    totaal_credit = sum(r.get("credit", 0) for r in data.regels)
    
    if abs(totaal_debet - totaal_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Journaalpost niet in balans")
    
    count = await db.boekhouding_journaalposten.count_documents({"user_id": user_id, "dagboek_code": data.dagboek_code})
    volgnummer = f"{data.dagboek_code}{datetime.now().year}-{count + 1:05d}"
    
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
        "status": "concept",
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    return clean_doc(journaalpost)

@router.put("/journaalposten/{post_id}/boeken")
async def boek_journaalpost(post_id: str, authorization: str = Header(None)):
    """Boek journaalpost definitief"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_journaalposten.update_one(
        {"id": post_id, "user_id": user_id},
        {"$set": {"status": "geboekt", "geboekt_op": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journaalpost niet gevonden")
    return {"message": "Journaalpost geboekt"}

# ==================== DEBITEUREN ====================

@router.get("/debiteuren")
async def get_debiteuren(authorization: str = Header(None)):
    """Haal alle debiteuren op met hun actuele openstaand saldo"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal alle debiteuren op
    debiteuren = await db.boekhouding_debiteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    
    # Bereken openstaand bedrag per debiteur uit verkoopfacturen
    openstaand_per_debiteur = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {
            "user_id": user_id, 
            "status": {"$nin": ["betaald", "geannuleerd"]},
            "openstaand_bedrag": {"$gt": 0}
        }},
        {"$group": {
            "_id": "$debiteur_id", 
            "openstaand": {"$sum": "$openstaand_bedrag"},
            "aantal_facturen": {"$sum": 1}
        }}
    ]).to_list(500)
    
    # Maak lookup dict
    openstaand_dict = {o["_id"]: o for o in openstaand_per_debiteur}
    
    # Voeg openstaand bedrag toe aan elke debiteur
    result = []
    for d in debiteuren:
        debiteur = clean_doc(d)
        debiteur_id = debiteur.get("id")
        if debiteur_id in openstaand_dict:
            debiteur["openstaand_bedrag"] = openstaand_dict[debiteur_id]["openstaand"]
            debiteur["aantal_openstaande_facturen"] = openstaand_dict[debiteur_id]["aantal_facturen"]
        else:
            debiteur["openstaand_bedrag"] = 0
            debiteur["aantal_openstaande_facturen"] = 0
        result.append(debiteur)
    
    return result

@router.get("/debiteuren/{debiteur_id}")
async def get_debiteur(debiteur_id: str, authorization: str = Header(None)):
    """Haal specifieke debiteur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    debiteur = await db.boekhouding_debiteuren.find_one({"id": debiteur_id, "user_id": user_id})
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return clean_doc(debiteur)

@router.post("/debiteuren")
async def create_debiteur(data: DebiteurCreate, authorization: str = Header(None)):
    """Maak nieuwe debiteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    count = await db.boekhouding_debiteuren.count_documents({"user_id": user_id})
    debiteur_nummer = f"DEB{count + 1:05d}"
    
    debiteur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nummer": debiteur_nummer,
        **data.dict(),
        "openstaand_bedrag": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_debiteuren.insert_one(debiteur)
    return clean_doc(debiteur)

@router.put("/debiteuren/{debiteur_id}")
async def update_debiteur(debiteur_id: str, data: DebiteurCreate, authorization: str = Header(None)):
    """Update debiteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_debiteuren.update_one(
        {"id": debiteur_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return {"message": "Debiteur bijgewerkt"}

@router.delete("/debiteuren/{debiteur_id}")
async def delete_debiteur(debiteur_id: str, authorization: str = Header(None)):
    """Verwijder debiteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_debiteuren.delete_one({"id": debiteur_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    return {"message": "Debiteur verwijderd"}

# ==================== CREDITEUREN ====================

@router.get("/crediteuren")
async def get_crediteuren(authorization: str = Header(None)):
    """Haal alle crediteuren op met hun actuele openstaand saldo"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal alle crediteuren op
    crediteuren = await db.boekhouding_crediteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    
    # Bereken openstaand bedrag per crediteur uit inkoopfacturen
    openstaand_per_crediteur = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {
            "user_id": user_id, 
            "status": {"$nin": ["betaald", "geannuleerd"]},
            "openstaand_bedrag": {"$gt": 0}
        }},
        {"$group": {
            "_id": "$crediteur_id", 
            "openstaand": {"$sum": "$openstaand_bedrag"},
            "aantal_facturen": {"$sum": 1}
        }}
    ]).to_list(500)
    
    # Maak lookup dict
    openstaand_dict = {o["_id"]: o for o in openstaand_per_crediteur}
    
    # Voeg openstaand bedrag toe aan elke crediteur
    result = []
    for c in crediteuren:
        crediteur = clean_doc(c)
        crediteur_id = crediteur.get("id")
        if crediteur_id in openstaand_dict:
            crediteur["openstaand_bedrag"] = openstaand_dict[crediteur_id]["openstaand"]
            crediteur["aantal_openstaande_facturen"] = openstaand_dict[crediteur_id]["aantal_facturen"]
        else:
            crediteur["openstaand_bedrag"] = 0
            crediteur["aantal_openstaande_facturen"] = 0
        result.append(crediteur)
    
    return result

@router.get("/crediteuren/{crediteur_id}")
async def get_crediteur(crediteur_id: str, authorization: str = Header(None)):
    """Haal specifieke crediteur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    crediteur = await db.boekhouding_crediteuren.find_one({"id": crediteur_id, "user_id": user_id})
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return clean_doc(crediteur)

@router.post("/crediteuren")
async def create_crediteur(data: CrediteurCreate, authorization: str = Header(None)):
    """Maak nieuwe crediteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    count = await db.boekhouding_crediteuren.count_documents({"user_id": user_id})
    crediteur_nummer = f"CRE{count + 1:05d}"
    
    crediteur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nummer": crediteur_nummer,
        **data.dict(),
        "openstaand_bedrag": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_crediteuren.insert_one(crediteur)
    return clean_doc(crediteur)

@router.put("/crediteuren/{crediteur_id}")
async def update_crediteur(crediteur_id: str, data: CrediteurCreate, authorization: str = Header(None)):
    """Update crediteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_crediteuren.update_one(
        {"id": crediteur_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return {"message": "Crediteur bijgewerkt"}

@router.delete("/crediteuren/{crediteur_id}")
async def delete_crediteur(crediteur_id: str, authorization: str = Header(None)):
    """Verwijder crediteur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_crediteuren.delete_one({"id": crediteur_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    return {"message": "Crediteur verwijderd"}

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
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_bankrekeningen.insert_one(rekening)
    return clean_doc(rekening)

@router.put("/bankrekeningen/{rekening_id}")
async def update_bankrekening(rekening_id: str, data: BankrekeningCreate, authorization: str = Header(None)):
    """Update bankrekening"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_bankrekeningen.update_one(
        {"id": rekening_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    return {"message": "Bankrekening bijgewerkt"}

# ==================== BANKTRANSACTIES ====================

@router.get("/banktransacties")
async def get_banktransacties(bank_id: str = None, van: str = None, tot: str = None, authorization: str = Header(None)):
    """Haal banktransacties op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if bank_id:
        query["bankrekening_id"] = bank_id
    if van:
        query["datum"] = {"$gte": van}
    if tot:
        if "datum" in query:
            query["datum"]["$lte"] = tot
        else:
            query["datum"] = {"$lte": tot}
    
    transacties = await db.boekhouding_banktransacties.find(query).sort("datum", -1).to_list(500)
    return [clean_doc(t) for t in transacties]

@router.post("/banktransacties")
async def create_banktransactie(data: BanktransactieCreate, authorization: str = Header(None)):
    """Maak nieuwe banktransactie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    transactie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "status": "nieuw",
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_banktransacties.insert_one(transactie)
    
    # Update bankrekening saldo
    await db.boekhouding_bankrekeningen.update_one(
        {"id": data.bankrekening_id, "user_id": user_id},
        {"$inc": {"huidig_saldo": data.bedrag}}
    )
    
    return clean_doc(transactie)

# ==================== BANK IMPORT ====================

@router.post("/bank/import/csv")
async def import_bank_csv(bank_id: str, file: UploadFile = File(...), authorization: str = Header(None)):
    """Importeer banktransacties uit CSV"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    content = await file.read()
    try:
        content_str = content.decode('utf-8')
    except:
        content_str = content.decode('latin-1')
    
    lines = content_str.strip().split('\n')
    imported = 0
    
    for line in lines[1:]:  # Skip header
        try:
            parts = line.split(';')
            if len(parts) >= 3:
                transactie = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "bankrekening_id": bank_id,
                    "datum": parts[0].strip(),
                    "omschrijving": parts[1].strip(),
                    "bedrag": float(parts[2].strip().replace(',', '.')),
                    "status": "nieuw",
                    "import_bron": "csv",
                    "created_at": datetime.now(timezone.utc)
                }
                await db.boekhouding_banktransacties.insert_one(transactie)
                imported += 1
        except:
            pass
    
    return {"message": f"{imported} transacties geïmporteerd", "imported": imported}

@router.post("/bank/import/mt940")
async def import_mt940(bank_id: str, file: UploadFile = File(...), authorization: str = Header(None)):
    """Importeer banktransacties uit MT940 bestand met verbeterde parsing"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    content = await file.read()
    
    # Gebruik de verbeterde MT940 parser indien beschikbaar
    if MT940_ENABLED:
        try:
            statements = parse_mt940_file(content)
            
            imported = 0
            for statement in statements:
                for tx in statement.transacties:
                    transactie = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "bankrekening_id": bank_id,
                        "datum": tx.datum.isoformat() if tx.datum else datetime.now().strftime('%Y-%m-%d'),
                        "valutadatum": tx.valutadatum.isoformat() if tx.valutadatum else None,
                        "omschrijving": tx.omschrijving,
                        "bedrag": tx.bedrag,
                        "tegenrekening": tx.tegenrekening,
                        "tegenpartij": tx.tegenpartij,
                        "referentie": tx.referentie,
                        "status": "nieuw",
                        "import_bron": "mt940",
                        "raw_data": tx.raw_data,
                        "created_at": datetime.now(timezone.utc)
                    }
                    await db.boekhouding_banktransacties.insert_one(transactie)
                    imported += 1
                
                # Update bankrekening saldo
                if statement.eindsaldo != 0:
                    await db.boekhouding_bankrekeningen.update_one(
                        {"id": bank_id, "user_id": user_id},
                        {"$set": {
                            "huidig_saldo": statement.eindsaldo,
                            "laatste_import": datetime.now(timezone.utc)
                        }}
                    )
            
            return {
                "message": f"{imported} transacties geïmporteerd",
                "imported": imported,
                "statements_processed": len(statements)
            }
            
        except Exception as e:
            # Fallback naar basic parsing
            pass
    
    # Fallback: Basic MT940 parsing
    try:
        content_str = content.decode('utf-8')
    except:
        content_str = content.decode('latin-1')
    
    transactions = []
    lines = content_str.split('\n')
    current_tx = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith(':61:'):
            if current_tx:
                transactions.append(current_tx)
            current_tx = {"raw": line[4:]}
            try:
                date_str = line[4:10]
                current_tx["datum"] = f"20{date_str[:2]}-{date_str[2:4]}-{date_str[4:6]}"
                
                # Parse bedrag
                tx_data = line[4:]
                cd_pos = 6
                if len(tx_data) > 12 and tx_data[6:12].isdigit():
                    cd_pos = 12
                
                sign = 1 if tx_data[cd_pos] == 'C' else -1
                import re
                bedrag_match = re.search(r'[CD](\d+[,.]?\d*)', tx_data[cd_pos:])
                if bedrag_match:
                    current_tx["bedrag"] = sign * float(bedrag_match.group(1).replace(',', '.'))
                else:
                    current_tx["bedrag"] = 0
            except:
                current_tx["datum"] = datetime.now().strftime('%Y-%m-%d')
                current_tx["bedrag"] = 0
        elif line.startswith(':86:') and current_tx:
            current_tx["omschrijving"] = line[4:]
    
    if current_tx:
        transactions.append(current_tx)
    
    imported = 0
    for tx in transactions:
        transactie = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "bankrekening_id": bank_id,
            "datum": tx.get("datum", datetime.now().strftime('%Y-%m-%d')),
            "omschrijving": tx.get("omschrijving", ""),
            "bedrag": tx.get("bedrag", 0),
            "status": "nieuw",
            "import_bron": "mt940",
            "created_at": datetime.now(timezone.utc)
        }
        await db.boekhouding_banktransacties.insert_one(transactie)
        imported += 1
    
    return {"message": f"{imported} transacties geïmporteerd", "imported": imported}

# ==================== RECONCILIATIE ====================

@router.get("/banktransacties/{transactie_id}/reconciliatie-suggesties")
async def get_reconciliatie_suggesties(transactie_id: str, authorization: str = Header(None)):
    """Haal automatische reconciliatie suggesties op voor een banktransactie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal transactie
    transactie = await db.boekhouding_banktransacties.find_one({"id": transactie_id, "user_id": user_id})
    if not transactie:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    suggesties = []
    
    if MT940_ENABLED:
        # Maak MT940Transaction object
        tx = MT940Transaction(
            datum=datetime.fromisoformat(transactie['datum']).date() if transactie.get('datum') else date.today(),
            valutadatum=None,
            bedrag=transactie.get('bedrag', 0),
            omschrijving=transactie.get('omschrijving', ''),
            tegenrekening=transactie.get('tegenrekening'),
            tegenpartij=transactie.get('tegenpartij'),
            referentie=transactie.get('referentie'),
            boekcode=None,
            raw_data=transactie.get('raw_data', '')
        )
        
        # Haal openstaande facturen afhankelijk van credit/debet
        if transactie.get('bedrag', 0) > 0:
            # Inkomende betaling -> match met verkoopfacturen
            facturen = await db.boekhouding_verkoopfacturen.find({
                "user_id": user_id,
                "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]},
                "openstaand_bedrag": {"$gt": 0}
            }).to_list(100)
            for f in facturen:
                f['type'] = 'verkoop'
        else:
            # Uitgaande betaling -> match met inkoopfacturen
            facturen = await db.boekhouding_inkoopfacturen.find({
                "user_id": user_id,
                "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]},
                "openstaand_bedrag": {"$gt": 0}
            }).to_list(100)
            for f in facturen:
                f['type'] = 'inkoop'
        
        # Genereer suggesties
        suggesties = suggest_reconciliation(tx, [clean_doc(f) for f in facturen])
    
    return {
        "transactie_id": transactie_id,
        "suggesties": suggesties,
        "transactie_bedrag": transactie.get('bedrag', 0),
        "transactie_omschrijving": transactie.get('omschrijving', '')
    }


@router.post("/banktransacties/{transactie_id}/reconcilieer")
async def reconcilieer_transactie(
    transactie_id: str,
    factuur_id: str,
    factuur_type: str = "verkoop",
    authorization: str = Header(None)
):
    """Koppel banktransactie aan factuur (reconciliatie)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal transactie
    transactie = await db.boekhouding_banktransacties.find_one({"id": transactie_id, "user_id": user_id})
    if not transactie:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    bedrag = abs(transactie.get('bedrag', 0))
    
    # Haal en update factuur
    if factuur_type == "verkoop":
        factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
        if not factuur:
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        
        nieuw_openstaand = max(0, factuur.get('openstaand_bedrag', 0) - bedrag)
        nieuwe_status = "betaald" if nieuw_openstaand == 0 else "gedeeltelijk_betaald"
        
        await db.boekhouding_verkoopfacturen.update_one(
            {"id": factuur_id},
            {"$set": {
                "openstaand_bedrag": nieuw_openstaand,
                "status": nieuwe_status,
                "laatste_betaling_datum": datetime.now(timezone.utc)
            }}
        )
        
        # Update debiteur saldo
        if factuur.get('debiteur_id'):
            await db.boekhouding_debiteuren.update_one(
                {"id": factuur['debiteur_id']},
                {"$inc": {"openstaand_bedrag": -bedrag}}
            )
    else:
        factuur = await db.boekhouding_inkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
        if not factuur:
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        
        nieuw_openstaand = max(0, factuur.get('openstaand_bedrag', 0) - bedrag)
        nieuwe_status = "betaald" if nieuw_openstaand == 0 else "gedeeltelijk_betaald"
        
        await db.boekhouding_inkoopfacturen.update_one(
            {"id": factuur_id},
            {"$set": {
                "openstaand_bedrag": nieuw_openstaand,
                "status": nieuwe_status,
                "laatste_betaling_datum": datetime.now(timezone.utc)
            }}
        )
        
        # Update crediteur saldo
        if factuur.get('crediteur_id'):
            await db.boekhouding_crediteuren.update_one(
                {"id": factuur['crediteur_id']},
                {"$inc": {"openstaand_bedrag": -bedrag}}
            )
    
    # Update transactie status
    await db.boekhouding_banktransacties.update_one(
        {"id": transactie_id},
        {"$set": {
            "status": "gereconcilieerd",
            "gekoppeld_aan_type": factuur_type,
            "gekoppeld_aan_id": factuur_id,
            "gereconcilieerd_op": datetime.now(timezone.utc)
        }}
    )
    
    # Log audit
    await log_audit(
        user_id, "reconcilieer", "bank", "transactie", transactie_id,
        {"factuur_id": factuur_id, "factuur_type": factuur_type, "bedrag": bedrag}
    )
    
    return {
        "message": "Transactie gereconcilieerd",
        "transactie_id": transactie_id,
        "factuur_id": factuur_id,
        "factuur_nieuw_openstaand": nieuw_openstaand,
        "factuur_nieuwe_status": nieuwe_status
    }

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

@router.get("/verkoopfacturen/{factuur_id}")
async def get_verkoopfactuur(factuur_id: str, authorization: str = Header(None)):
    """Haal specifieke verkoopfactuur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return clean_doc(factuur)

@router.post("/verkoopfacturen")
async def create_verkoopfactuur(data: VerkoopfactuurCreate, authorization: str = Header(None)):
    """Maak nieuwe verkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_met_btw = []
    
    for regel in data.regels:
        # Support both Dutch and English field names
        aantal = regel.get("aantal") or regel.get("quantity", 1)
        prijs = regel.get("eenheidsprijs") or regel.get("unit_price", 0)
        btw_perc = regel.get("btw_percentage", 25)
        korting = regel.get("korting_percentage", 0)
        omschrijving = regel.get("omschrijving") or regel.get("description", "")
        
        bedrag_excl = aantal * prijs * (1 - korting / 100)
        btw = bedrag_excl * btw_perc / 100
        
        # Store artikel_id from either product_id or artikel_id field
        artikel_id = regel.get("product_id") or regel.get("artikel_id")
        
        regel_data = {
            "artikel_id": artikel_id,
            "omschrijving": omschrijving,
            "aantal": aantal,
            "eenheidsprijs": prijs,
            "btw_percentage": btw_perc,
            "bedrag_excl": bedrag_excl,
            "btw_bedrag": btw,
            "bedrag_incl": bedrag_excl + btw
        }
        regels_met_btw.append(regel_data)
        
        subtotaal += bedrag_excl
        btw_bedrag += btw
    
    totaal_incl = subtotaal + btw_bedrag
    
    # Genereer factuurnummer
    year = datetime.now().year
    count = await db.boekhouding_verkoopfacturen.count_documents({"user_id": user_id})
    factuurnummer = f"VF{year}-{count + 1:05d}"
    
    # Haal debiteur
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
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_verkoopfacturen.insert_one(factuur)
    return clean_doc(factuur)

@router.put("/verkoopfacturen/{factuur_id}")
async def update_verkoopfactuur(factuur_id: str, data: VerkoopfactuurCreate, authorization: str = Header(None)):
    """Update verkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Herbereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_met_btw = []
    
    for regel in data.regels:
        aantal = regel.get("aantal", 1)
        prijs = regel.get("eenheidsprijs", 0)
        btw_perc = regel.get("btw_percentage", 25)
        
        bedrag_excl = aantal * prijs
        btw = bedrag_excl * btw_perc / 100
        
        regels_met_btw.append({
            **regel,
            "bedrag_excl": bedrag_excl,
            "btw_bedrag": btw,
            "bedrag_incl": bedrag_excl + btw
        })
        
        subtotaal += bedrag_excl
        btw_bedrag += btw
    
    result = await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {
            "debiteur_id": data.debiteur_id,
            "factuurdatum": data.factuurdatum.isoformat(),
            "vervaldatum": data.vervaldatum.isoformat() if data.vervaldatum else None,
            "regels": regels_met_btw,
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal_incl_btw": subtotaal + btw_bedrag,
            "openstaand_bedrag": subtotaal + btw_bedrag,
            "opmerkingen": data.opmerkingen,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": "Factuur bijgewerkt"}

@router.put("/verkoopfacturen/{factuur_id}/status")
async def update_verkoopfactuur_status(factuur_id: str, status: str, authorization: str = Header(None)):
    """Update status van verkoopfactuur en boek automatisch naar grootboek"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal factuur op om te controleren of boeking nodig is
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    oude_status = factuur.get("status", "concept")
    
    # Update status
    result = await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Automatisch boeken naar grootboek wanneer status naar verzonden gaat
    # (en nog niet eerder geboekt)
    if oude_status == "concept" and status in ["verzonden", "herinnering"]:
        try:
            # Controleer of er al een boeking bestaat voor deze factuur
            bestaande_boeking = await db.boekhouding_journaalposten.find_one({
                "user_id": user_id, 
                "document_ref": factuur_id,
                "dagboek_code": "VK"
            })
            if not bestaande_boeking:
                await boek_verkoopfactuur(user_id, factuur)
        except Exception as e:
            # Log error maar laat status update doorgaan
            print(f"Fout bij boeken factuur: {e}")
    
    return {"message": f"Status gewijzigd naar {status}"}

@router.delete("/verkoopfacturen/{factuur_id}")
async def delete_verkoopfactuur(factuur_id: str, authorization: str = Header(None)):
    """Verwijder een verkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    await db.boekhouding_verkoopfacturen.delete_one({"id": factuur_id, "user_id": user_id})
    return {"message": "Factuur verwijderd"}

class BetalingCreate(BaseModel):
    bedrag: float
    datum: str
    betaalmethode: str = "bank"
    referentie: Optional[str] = None

@router.post("/verkoopfacturen/{factuur_id}/betaling")
async def add_betaling_to_factuur(factuur_id: str, data: BetalingCreate, authorization: str = Header(None)):
    """Voeg een betaling toe aan een factuur en boek naar grootboek"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Haal bestaande betalingen op of maak lege lijst
    betalingen = factuur.get('betalingen', [])
    
    # Voeg nieuwe betaling toe
    nieuwe_betaling = {
        "id": str(uuid.uuid4()),
        "bedrag": data.bedrag,
        "datum": data.datum,
        "betaalmethode": data.betaalmethode,
        "referentie": data.referentie,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    betalingen.append(nieuwe_betaling)
    
    # Bereken totaal betaald en openstaand bedrag
    totaal_betaald = sum(b['bedrag'] for b in betalingen)
    totaal_factuur = factuur.get('totaal_incl_btw', 0)
    openstaand = max(0, totaal_factuur - totaal_betaald)
    
    # Bepaal nieuwe status
    if openstaand <= 0:
        nieuwe_status = 'betaald'
    elif totaal_betaald > 0:
        nieuwe_status = 'deelbetaling'
    else:
        nieuwe_status = factuur.get('status', 'concept')
    
    # Update factuur
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {
            "betalingen": betalingen,
            "totaal_betaald": totaal_betaald,
            "openstaand_bedrag": openstaand,
            "status": nieuwe_status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Automatisch boeken naar grootboek
    try:
        await boek_betaling_ontvangen(user_id, factuur, nieuwe_betaling)
    except Exception as e:
        print(f"Fout bij boeken betaling: {e}")
    
    return {
        "message": "Betaling toegevoegd",
        "totaal_betaald": totaal_betaald,
        "openstaand_bedrag": openstaand,
        "status": nieuwe_status
    }

@router.post("/verkoopfacturen/boek-alle-verzonden")
async def boek_alle_verzonden_facturen(authorization: str = Header(None)):
    """Boek alle verzonden facturen die nog niet geboekt zijn naar het grootboek"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Vind alle verzonden facturen
    facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering", "betaald", "deelbetaling"]}
    }).to_list(500)
    
    geboekt = 0
    overgeslagen = 0
    
    for factuur in facturen:
        # Controleer of er al een boeking bestaat
        bestaande_boeking = await db.boekhouding_journaalposten.find_one({
            "user_id": user_id,
            "document_ref": factuur["id"],
            "dagboek_code": "VK"
        })
        
        if not bestaande_boeking:
            try:
                await boek_verkoopfactuur(user_id, factuur)
                geboekt += 1
            except Exception as e:
                print(f"Fout bij boeken factuur {factuur.get('factuurnummer')}: {e}")
                overgeslagen += 1
        else:
            overgeslagen += 1
    
    return {
        "message": f"{geboekt} facturen geboekt, {overgeslagen} overgeslagen",
        "geboekt": geboekt,
        "overgeslagen": overgeslagen
    }

@router.get("/verkoopfacturen/{factuur_id}/pdf")
async def get_verkoopfactuur_pdf(factuur_id: str, authorization: str = Header(None)):
    """Download factuur als professionele PDF"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Haal bedrijfsinstellingen
    instellingen = await db.boekhouding_instellingen.find_one({"user_id": user_id})
    if not instellingen:
        instellingen = {
            "bedrijfsnaam": user.get('company_name', 'Uw Bedrijf'),
            "adres": user.get('address', ''),
            "email": user.get('email', ''),
            "telefoon": user.get('phone', '')
        }
    
    # Haal debiteur
    debiteur = None
    if factuur.get('debiteur_id'):
        debiteur = await db.boekhouding_debiteuren.find_one({"id": factuur['debiteur_id'], "user_id": user_id})
        if debiteur:
            debiteur = clean_doc(debiteur)
    
    # Verrijk factuurregels met foto_url van artikelen
    factuur_clean = clean_doc(factuur)
    regels = factuur_clean.get('regels', [])
    for regel in regels:
        artikel_id = regel.get('artikel_id') or regel.get('product_id')
        if artikel_id:
            artikel = await db.boekhouding_artikelen.find_one({"id": artikel_id, "user_id": user_id})
            if artikel and artikel.get('foto_url'):
                regel['foto_url'] = artikel.get('foto_url')
    factuur_clean['regels'] = regels
    
    # Genereer PDF
    if PDF_ENABLED:
        try:
            # Extract template settings from instellingen
            template_settings = {
                'factuur_primaire_kleur': instellingen.get('factuur_primaire_kleur', '#1e293b'),
                'factuur_secundaire_kleur': instellingen.get('factuur_secundaire_kleur', '#f1f5f9'),
                'factuur_template': instellingen.get('factuur_template', 'standaard'),
                'factuur_voorwaarden': instellingen.get('factuur_voorwaarden', '')
            }
            
            pdf_bytes = generate_invoice_pdf(
                factuur=factuur_clean,
                bedrijf=clean_doc(instellingen) if instellingen else {},
                debiteur=debiteur,
                template_settings=template_settings
            )
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=factuur_{factuur.get('factuurnummer', 'CONCEPT')}.pdf"
                }
            )
        except Exception as e:
            # Fallback naar HTML als PDF generatie faalt
            pass
    
    # Fallback: Simple HTML
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Factuur {factuur.get('factuurnummer')}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
            h1 {{ color: #1e293b; }}
            .header {{ margin-bottom: 30px; }}
            .info {{ margin-bottom: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
            th {{ background: #f1f5f9; }}
            .totaal {{ font-weight: bold; font-size: 1.2em; }}
            .right {{ text-align: right; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{instellingen.get('bedrijfsnaam', 'Uw Bedrijf')}</h1>
            <p>{instellingen.get('adres', '')}</p>
        </div>
        
        <h2>FACTUUR</h2>
        
        <div class="info">
            <p><strong>Factuurnummer:</strong> {factuur.get('factuurnummer')}</p>
            <p><strong>Klant:</strong> {factuur.get('debiteur_naam')}</p>
            <p><strong>Datum:</strong> {factuur.get('factuurdatum')}</p>
            <p><strong>Vervaldatum:</strong> {factuur.get('vervaldatum')}</p>
        </div>
        
        <table>
            <tr><th>Omschrijving</th><th class="right">Aantal</th><th class="right">Prijs</th><th class="right">Bedrag</th></tr>
            {''.join(f"<tr><td>{r.get('omschrijving', '')}</td><td class='right'>{r.get('aantal', 1)}</td><td class='right'>{factuur.get('valuta', 'SRD')} {r.get('eenheidsprijs', 0):.2f}</td><td class='right'>{factuur.get('valuta', 'SRD')} {r.get('bedrag_incl', 0):.2f}</td></tr>" for r in factuur.get('regels', []))}
        </table>
        
        <p><strong>Subtotaal:</strong> {factuur.get('valuta', 'SRD')} {factuur.get('subtotaal', 0):.2f}</p>
        <p><strong>BTW:</strong> {factuur.get('valuta', 'SRD')} {factuur.get('btw_bedrag', 0):.2f}</p>
        <p class="totaal"><strong>Totaal:</strong> {factuur.get('valuta', 'SRD')} {factuur.get('totaal_incl_btw', 0):.2f}</p>
    </body>
    </html>
    """
    
    return Response(
        content=html_content.encode(),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=factuur_{factuur.get('factuurnummer')}.html"}
    )

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

@router.get("/inkoopfacturen/{factuur_id}")
async def get_inkoopfactuur(factuur_id: str, authorization: str = Header(None)):
    """Haal specifieke inkoopfactuur op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    factuur = await db.boekhouding_inkoopfacturen.find_one({"id": factuur_id, "user_id": user_id})
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return clean_doc(factuur)

@router.post("/inkoopfacturen")
async def create_inkoopfactuur(data: InkoopfactuurCreate, authorization: str = Header(None)):
    """Maak nieuwe inkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Bereken totalen
    subtotaal = 0
    btw_bedrag = 0
    regels_met_btw = []
    
    for regel in data.regels:
        aantal = regel.get("aantal", 1)
        prijs = regel.get("eenheidsprijs", 0)
        btw_perc = regel.get("btw_percentage", 25)
        
        bedrag_excl = aantal * prijs
        btw = bedrag_excl * btw_perc / 100
        
        regels_met_btw.append({
            **regel,
            "bedrag_excl": bedrag_excl,
            "btw_bedrag": btw,
            "bedrag_incl": bedrag_excl + btw
        })
        
        subtotaal += bedrag_excl
        btw_bedrag += btw
    
    totaal_incl = subtotaal + btw_bedrag
    
    # Genereer intern nummer
    year = datetime.now().year
    count = await db.boekhouding_inkoopfacturen.count_documents({"user_id": user_id})
    intern_nummer = f"IF{year}-{count + 1:05d}"
    
    # Haal crediteur
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
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_inkoopfacturen.insert_one(factuur)
    return clean_doc(factuur)

@router.put("/inkoopfacturen/{factuur_id}")
async def update_inkoopfactuur(factuur_id: str, data: InkoopfactuurCreate, authorization: str = Header(None)):
    """Update inkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_inkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {
            "crediteur_id": data.crediteur_id,
            "extern_factuurnummer": data.extern_factuurnummer,
            "factuurdatum": data.factuurdatum.isoformat(),
            "opmerkingen": data.opmerkingen,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": "Factuur bijgewerkt"}

@router.put("/inkoopfacturen/{factuur_id}/status")
async def update_inkoopfactuur_status(factuur_id: str, status: str, authorization: str = Header(None)):
    """Update status van inkoopfactuur"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_inkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": f"Status gewijzigd naar {status}"}



# ==================== IMAGE UPLOAD ====================

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), authorization: str = Header(None)):
    """Upload product image"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Alleen afbeeldingen zijn toegestaan (JPG, PNG, GIF, WEBP)")
    
    # Read file content
    content = await file.read()
    
    # Validate file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Afbeelding mag maximaal 5MB zijn")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_id = str(uuid.uuid4())[:8]
    filename = f"product_{user_id[:8]}_{unique_id}.{file_ext}"
    
    # Save to uploads directory
    upload_dir = "/app/backend/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Return URL (will be served by backend)
    url = f"/api/boekhouding/images/{filename}"
    
    return {"url": url, "filename": filename}


@router.get("/images/{filename}")
async def get_image(filename: str):
    """Serve uploaded images"""
    # Sanitize filename to prevent path traversal
    safe_filename = os.path.basename(filename)
    file_path = f"/app/backend/uploads/{safe_filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Afbeelding niet gevonden")
    
    # Determine content type
    ext = safe_filename.split('.')[-1].lower()
    content_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    content_type = content_types.get(ext, 'image/jpeg')
    
    with open(file_path, 'rb') as f:
        content = f.read()
    
    return Response(content=content, media_type=content_type)


# ==================== ARTIKELEN ====================

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
    
    artikel = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "voorraad": 0,
        "gereserveerd": 0,
        "beschikbaar": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_artikelen.insert_one(artikel)
    return clean_doc(artikel)

@router.put("/artikelen/{artikel_id}")
async def update_artikel(artikel_id: str, data: ArtikelCreate, authorization: str = Header(None)):
    """Update artikel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_artikelen.update_one(
        {"id": artikel_id, "user_id": user_id},
        {"$set": {**data.dict(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    return {"message": "Artikel bijgewerkt"}

@router.delete("/artikelen/{artikel_id}")
async def delete_artikel(artikel_id: str, authorization: str = Header(None)):
    """Verwijder artikel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_artikelen.delete_one({"id": artikel_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    return {"message": "Artikel verwijderd"}

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
    
    count = await db.boekhouding_vaste_activa.count_documents({"user_id": user_id})
    activum_nummer = f"ACT{count + 1:05d}"
    
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
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_vaste_activa.insert_one(activum)
    return clean_doc(activum)

@router.put("/vaste-activa/{activum_id}")
async def update_vast_activum(activum_id: str, data: VastActivumCreate, authorization: str = Header(None)):
    """Update vast activum"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_vaste_activa.update_one(
        {"id": activum_id, "user_id": user_id},
        {"$set": {**data.dict(), "aanschafdatum": data.aanschafdatum.isoformat(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    return {"message": "Activum bijgewerkt"}

@router.post("/vaste-activa/{activum_id}/afschrijven")
async def afschrijven_activum(activum_id: str, authorization: str = Header(None)):
    """Voer afschrijving uit voor specifiek activum"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    activum = await db.boekhouding_vaste_activa.find_one({"id": activum_id, "user_id": user_id})
    if not activum:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    maandelijks = activum.get("jaarlijkse_afschrijving", 0) / 12
    nieuwe_boekwaarde = activum.get("boekwaarde", 0) - maandelijks
    
    await db.boekhouding_vaste_activa.update_one(
        {"id": activum_id},
        {
            "$inc": {"totaal_afgeschreven": maandelijks},
            "$set": {"boekwaarde": max(activum.get("restwaarde", 0), nieuwe_boekwaarde)}
        }
    )
    
    return {"message": "Afschrijving geboekt", "bedrag": maandelijks}

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

@router.get("/projecten/{project_id}")
async def get_project(project_id: str, authorization: str = Header(None)):
    """Haal specifiek project op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    project = await db.boekhouding_projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    return clean_doc(project)

@router.post("/projecten")
async def create_project(data: ProjectCreate, authorization: str = Header(None)):
    """Maak nieuw project"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    project = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "startdatum": data.startdatum.isoformat(),
        "einddatum": data.einddatum.isoformat() if data.einddatum else None,
        "totaal_uren": 0,
        "totaal_kosten": 0,
        "gefactureerd": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_projecten.insert_one(project)
    return clean_doc(project)

@router.put("/projecten/{project_id}")
async def update_project(project_id: str, data: ProjectCreate, authorization: str = Header(None)):
    """Update project"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_projecten.update_one(
        {"id": project_id, "user_id": user_id},
        {"$set": {
            **data.dict(),
            "startdatum": data.startdatum.isoformat(),
            "einddatum": data.einddatum.isoformat() if data.einddatum else None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    return {"message": "Project bijgewerkt"}

# ==================== UREN ====================

@router.get("/uren")
async def get_uren(project_id: str = None, authorization: str = Header(None)):
    """Haal urenregistraties op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if project_id:
        query["project_id"] = project_id
    
    uren = await db.boekhouding_uren.find(query).sort("datum", -1).to_list(500)
    return [clean_doc(u) for u in uren]

@router.post("/uren")
async def create_uren(data: UrenCreate, authorization: str = Header(None)):
    """Registreer uren"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    uren = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "bedrag": data.uren * (data.uurtarief or 0),
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_uren.insert_one(uren)
    
    # Update project totalen
    await db.boekhouding_projecten.update_one(
        {"id": data.project_id, "user_id": user_id},
        {"$inc": {"totaal_uren": data.uren}}
    )
    
    return clean_doc(uren)

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
    
    kostenplaats = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "besteed": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_kostenplaatsen.insert_one(kostenplaats)
    return clean_doc(kostenplaats)

# ==================== MAGAZIJNEN ====================

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
    
    magazijn = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_magazijnen.insert_one(magazijn)
    return clean_doc(magazijn)

# ==================== VOORRAADMUTATIES ====================

@router.get("/voorraadmutaties")
async def get_voorraadmutaties(artikel_id: str = None, authorization: str = Header(None)):
    """Haal voorraadmutaties op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if artikel_id:
        query["artikel_id"] = artikel_id
    
    mutaties = await db.boekhouding_voorraadmutaties.find(query).sort("created_at", -1).to_list(500)
    return [clean_doc(m) for m in mutaties]

@router.post("/voorraadmutaties")
async def create_voorraadmutatie(data: VoorraadmutatieCreate, authorization: str = Header(None)):
    """Maak nieuwe voorraadmutatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    artikel = await db.boekhouding_artikelen.find_one({"id": data.artikel_id, "user_id": user_id})
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    huidige_voorraad = artikel.get("voorraad", 0)
    
    if data.type in ["inkoop", "correctie_plus"]:
        nieuwe_voorraad = huidige_voorraad + data.aantal
    elif data.type in ["verkoop", "correctie_min"]:
        nieuwe_voorraad = huidige_voorraad - data.aantal
    else:
        nieuwe_voorraad = huidige_voorraad
    
    mutatie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.dict(),
        "voorraad_voor": huidige_voorraad,
        "voorraad_na": nieuwe_voorraad,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_voorraadmutaties.insert_one(mutatie)
    
    await db.boekhouding_artikelen.update_one(
        {"id": data.artikel_id},
        {"$set": {"voorraad": nieuwe_voorraad, "beschikbaar": nieuwe_voorraad}}
    )
    
    return clean_doc(mutatie)

@router.delete("/voorraadmutaties/{mutatie_id}")
async def delete_voorraadmutatie(mutatie_id: str, authorization: str = Header(None)):
    """Verwijder een voorraadmutatie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    mutatie = await db.boekhouding_voorraadmutaties.find_one({"id": mutatie_id, "user_id": user_id})
    if not mutatie:
        raise HTTPException(status_code=404, detail="Mutatie niet gevonden")
    
    await db.boekhouding_voorraadmutaties.delete_one({"id": mutatie_id, "user_id": user_id})
    
    return {"message": "Mutatie verwijderd"}

# ==================== INKOOPORDERS ====================

@router.get("/inkooporders")
async def get_inkooporders(authorization: str = Header(None)):
    """Haal alle inkooporders op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    orders = await db.boekhouding_inkooporders.find({"user_id": user_id}).sort("datum", -1).to_list(500)
    return [clean_doc(o) for o in orders]

@router.post("/inkooporders")
async def create_inkooporder(data: InkooporderCreate, authorization: str = Header(None)):
    """Maak nieuwe inkooporder"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    count = await db.boekhouding_inkooporders.count_documents({"user_id": user_id})
    ordernummer = f"IO{datetime.now().year}-{count + 1:05d}"
    
    order = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "ordernummer": ordernummer,
        **data.dict(),
        "datum": data.datum.isoformat(),
        "status": "concept",
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_inkooporders.insert_one(order)
    return clean_doc(order)

# ==================== OFFERTES ====================

@router.get("/offertes")
async def get_offertes(authorization: str = Header(None)):
    """Haal alle offertes op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    offertes = await db.boekhouding_offertes.find({"user_id": user_id}).sort("datum", -1).to_list(500)
    return [clean_doc(o) for o in offertes]

@router.post("/offertes")
async def create_offerte(data: OfferteCreate, authorization: str = Header(None)):
    """Maak nieuwe offerte"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    count = await db.boekhouding_offertes.count_documents({"user_id": user_id})
    offertenummer = f"OF{datetime.now().year}-{count + 1:05d}"
    
    debiteur = await db.boekhouding_debiteuren.find_one({"id": data.debiteur_id, "user_id": user_id})
    
    offerte = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "offertenummer": offertenummer,
        "debiteur_naam": debiteur.get("naam") if debiteur else "Onbekend",
        **data.dict(),
        "datum": data.datum.isoformat(),
        "geldig_tot": data.geldig_tot.isoformat(),
        "status": "concept",
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_offertes.insert_one(offerte)
    return clean_doc(offerte)

@router.put("/offertes/{offerte_id}/status")
async def update_offerte_status(offerte_id: str, status: str, authorization: str = Header(None)):
    """Update status van offerte"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_offertes.update_one(
        {"id": offerte_id, "user_id": user_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")
    return {"message": f"Status gewijzigd naar {status}"}

# ==================== VERKOOPORDERS ====================

@router.get("/verkooporders")
async def get_verkooporders(authorization: str = Header(None)):
    """Haal alle verkooporders op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    orders = await db.boekhouding_verkooporders.find({"user_id": user_id}).sort("datum", -1).to_list(500)
    return [clean_doc(o) for o in orders]

@router.post("/verkooporders")
async def create_verkooporder(data: VerkooporderCreate, authorization: str = Header(None)):
    """Maak nieuwe verkooporder"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    count = await db.boekhouding_verkooporders.count_documents({"user_id": user_id})
    ordernummer = f"VO{datetime.now().year}-{count + 1:05d}"
    
    debiteur = await db.boekhouding_debiteuren.find_one({"id": data.debiteur_id, "user_id": user_id})
    
    order = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "ordernummer": ordernummer,
        "debiteur_naam": debiteur.get("naam") if debiteur else "Onbekend",
        **data.dict(),
        "datum": data.datum.isoformat(),
        "status": "concept",
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_verkooporders.insert_one(order)
    return clean_doc(order)

# ==================== RAPPORTAGES ====================

@router.get("/rapportages/winst-verlies")
async def get_winst_verlies(jaar: int = None, authorization: str = Header(None)):
    """Haal winst & verlies rekening op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    jaar = jaar or datetime.now().year
    
    # Omzet
    omzet = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$subtotaal"}}}
    ]).to_list(1)
    totaal_omzet = omzet[0]["totaal"] if omzet else 0
    
    # Kosten
    kosten = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$subtotaal"}}}
    ]).to_list(1)
    totaal_kosten = kosten[0]["totaal"] if kosten else 0
    
    return {
        "jaar": jaar,
        "omzet": [{"naam": "Totale omzet", "bedrag": totaal_omzet}],
        "kosten": [{"naam": "Totale kosten", "bedrag": totaal_kosten}],
        "totaal_omzet": totaal_omzet,
        "totaal_kosten": totaal_kosten,
        "bruto_winst": totaal_omzet - totaal_kosten,
        "netto_winst": totaal_omzet - totaal_kosten
    }

@router.get("/rapportages/balans")
async def get_balans(authorization: str = Header(None)):
    """Haal balans op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Bank saldi
    bank_saldo = await db.boekhouding_bankrekeningen.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$huidig_saldo"}}}
    ]).to_list(1)
    liquide_middelen = bank_saldo[0]["totaal"] if bank_saldo else 0
    
    # Debiteuren
    debiteuren = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$in": ["verzonden", "herinnering"]}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    debiteuren_totaal = debiteuren[0]["totaal"] if debiteuren else 0
    
    # Crediteuren
    crediteuren = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    crediteuren_totaal = crediteuren[0]["totaal"] if crediteuren else 0
    
    activa = [
        {"code": "1500", "naam": "Liquide middelen", "saldo": liquide_middelen},
        {"code": "1300", "naam": "Debiteuren", "saldo": debiteuren_totaal}
    ]
    
    passiva = [
        {"code": "2200", "naam": "Crediteuren", "saldo": crediteuren_totaal}
    ]
    
    totaal_activa = sum(a["saldo"] for a in activa)
    totaal_passiva = sum(p["saldo"] for p in passiva)
    
    return {
        "datum": datetime.now().strftime('%Y-%m-%d'),
        "activa": activa,
        "passiva": passiva,
        "totaal_activa": totaal_activa,
        "totaal_passiva": totaal_passiva
    }

@router.get("/rapportages/btw")
async def get_btw_rapport(jaar: int = None, kwartaal: int = None, authorization: str = Header(None)):
    """Haal BTW rapport op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # BTW verkoop
    btw_verkoop = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    btw_verkoop_totaal = btw_verkoop[0]["totaal"] if btw_verkoop else 0
    
    # BTW inkoop
    btw_inkoop = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    btw_inkoop_totaal = btw_inkoop[0]["totaal"] if btw_inkoop else 0
    
    return {
        "periode": {"jaar": jaar or datetime.now().year, "kwartaal": kwartaal or 1},
        "btw_verkoop": btw_verkoop_totaal,
        "btw_inkoop": btw_inkoop_totaal,
        "btw_te_betalen": btw_verkoop_totaal - btw_inkoop_totaal
    }


# ==================== SURINAAMSE BELASTINGRAPPORTAGES ====================

@router.get("/rapportages/suriname/btw-aangifte")
async def get_suriname_btw_aangifte(jaar: int = None, maand: int = None, authorization: str = Header(None)):
    """
    Surinaamse BTW Aangifte Rapport
    Conform Surinaamse belastingdienst eisen
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    jaar = jaar or datetime.now().year
    maand = maand or datetime.now().month
    
    # Bepaal periode
    start_date = f"{jaar}-{maand:02d}-01"
    if maand == 12:
        end_date = f"{jaar + 1}-01-01"
    else:
        end_date = f"{jaar}-{maand + 1:02d}-01"
    
    # BTW Verkopen per tarief
    btw_verkoop_25 = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$unwind": "$regels"},
        {"$match": {"regels.btw_percentage": 25}},
        {"$group": {
            "_id": None,
            "omzet": {"$sum": "$regels.bedrag_excl"},
            "btw": {"$sum": "$regels.btw_bedrag"}
        }}
    ]).to_list(1)
    
    btw_verkoop_10 = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$unwind": "$regels"},
        {"$match": {"regels.btw_percentage": 10}},
        {"$group": {
            "_id": None,
            "omzet": {"$sum": "$regels.bedrag_excl"},
            "btw": {"$sum": "$regels.btw_bedrag"}
        }}
    ]).to_list(1)
    
    btw_verkoop_0 = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$unwind": "$regels"},
        {"$match": {"regels.btw_percentage": 0}},
        {"$group": {
            "_id": None,
            "omzet": {"$sum": "$regels.bedrag_excl"}
        }}
    ]).to_list(1)
    
    # BTW Inkoop (voorbelasting)
    btw_inkoop = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    
    # Bereken totalen
    omzet_25 = btw_verkoop_25[0]["omzet"] if btw_verkoop_25 else 0
    btw_25 = btw_verkoop_25[0]["btw"] if btw_verkoop_25 else 0
    omzet_10 = btw_verkoop_10[0]["omzet"] if btw_verkoop_10 else 0
    btw_10 = btw_verkoop_10[0]["btw"] if btw_verkoop_10 else 0
    omzet_0 = btw_verkoop_0[0]["omzet"] if btw_verkoop_0 else 0
    voorbelasting = btw_inkoop[0]["totaal"] if btw_inkoop else 0
    
    totaal_btw_af = btw_25 + btw_10
    te_betalen = totaal_btw_af - voorbelasting
    
    return {
        "rapport_type": "BTW Aangifte Suriname",
        "periode": {
            "jaar": jaar,
            "maand": maand,
            "maand_naam": ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni",
                          "Juli", "Augustus", "September", "Oktober", "November", "December"][maand]
        },
        "verkopen": {
            "tarief_25": {"omzet": omzet_25, "btw": btw_25},
            "tarief_10": {"omzet": omzet_10, "btw": btw_10},
            "tarief_0": {"omzet": omzet_0, "btw": 0},
            "totaal_omzet": omzet_25 + omzet_10 + omzet_0,
            "totaal_btw": totaal_btw_af
        },
        "voorbelasting": voorbelasting,
        "te_betalen": te_betalen,
        "te_vorderen": -te_betalen if te_betalen < 0 else 0
    }


@router.get("/rapportages/suriname/loonbelasting")
async def get_suriname_loonbelasting(jaar: int = None, maand: int = None, authorization: str = Header(None)):
    """
    Surinaamse Loonbelasting Rapport
    Overzicht van loonkosten en af te dragen loonbelasting
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    jaar = jaar or datetime.now().year
    maand = maand or datetime.now().month
    
    # Haal uren/loongegevens
    uren = await db.boekhouding_uren.find({
        "user_id": user_id,
        "factureerbaar": True
    }).to_list(1000)
    
    totaal_uren = sum(u.get('uren', 0) for u in uren)
    totaal_loon = sum(u.get('bedrag', 0) for u in uren)
    
    # Surinaamse loonbelasting schijven (vereenvoudigd)
    # 0-2.646 SRD: 0%
    # 2.646-10.045 SRD: 18%
    # 10.045-28.694 SRD: 28%
    # > 28.694 SRD: 38%
    
    loonbelasting = 0
    if totaal_loon > 28694:
        loonbelasting += (totaal_loon - 28694) * 0.38
        loonbelasting += (28694 - 10045) * 0.28
        loonbelasting += (10045 - 2646) * 0.18
    elif totaal_loon > 10045:
        loonbelasting += (totaal_loon - 10045) * 0.28
        loonbelasting += (10045 - 2646) * 0.18
    elif totaal_loon > 2646:
        loonbelasting += (totaal_loon - 2646) * 0.18
    
    return {
        "rapport_type": "Loonbelasting Overzicht Suriname",
        "periode": {"jaar": jaar, "maand": maand},
        "totaal_uren": totaal_uren,
        "bruto_loon": totaal_loon,
        "loonbelasting_schijven": [
            {"schijf": "0 - 2.646", "percentage": "0%"},
            {"schijf": "2.646 - 10.045", "percentage": "18%"},
            {"schijf": "10.045 - 28.694", "percentage": "28%"},
            {"schijf": "> 28.694", "percentage": "38%"}
        ],
        "geschatte_loonbelasting": round(loonbelasting, 2),
        "disclaimer": "Dit is een geschatte berekening. Raadpleeg uw accountant voor exacte berekening."
    }


@router.get("/rapportages/suriname/inkomstenbelasting")
async def get_suriname_inkomstenbelasting(jaar: int = None, authorization: str = Header(None)):
    """
    Surinaamse Inkomstenbelasting Overzicht
    Jaaroverzicht voor IB aangifte
    """
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    jaar = jaar or datetime.now().year
    
    # Omzet
    omzet = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$subtotaal"}}}
    ]).to_list(1)
    
    # Kosten
    kosten = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$subtotaal"}}}
    ]).to_list(1)
    
    # Afschrijvingen
    afschrijvingen = await db.boekhouding_vaste_activa.aggregate([
        {"$match": {"user_id": user_id, "status": "actief"}},
        {"$group": {"_id": None, "totaal": {"$sum": "$jaarlijkse_afschrijving"}}}
    ]).to_list(1)
    
    totaal_omzet = omzet[0]["totaal"] if omzet else 0
    totaal_kosten = kosten[0]["totaal"] if kosten else 0
    totaal_afschrijving = afschrijvingen[0]["totaal"] if afschrijvingen else 0
    
    winst_voor_belasting = totaal_omzet - totaal_kosten - totaal_afschrijving
    
    # Surinaamse IB schijven (vereenvoudigd voor ondernemers)
    # 0% tot SRD 2.646
    # 18% van SRD 2.646 tot 10.045
    # 28% van SRD 10.045 tot 28.694
    # 38% boven SRD 28.694
    
    ib_belasting = 0
    belastbaar = winst_voor_belasting
    if belastbaar > 28694:
        ib_belasting += (belastbaar - 28694) * 0.38
        ib_belasting += (28694 - 10045) * 0.28
        ib_belasting += (10045 - 2646) * 0.18
    elif belastbaar > 10045:
        ib_belasting += (belastbaar - 10045) * 0.28
        ib_belasting += (10045 - 2646) * 0.18
    elif belastbaar > 2646:
        ib_belasting += (belastbaar - 2646) * 0.18
    
    return {
        "rapport_type": "Inkomstenbelasting Overzicht Suriname",
        "jaar": jaar,
        "bedrijfsresultaat": {
            "omzet": totaal_omzet,
            "kosten": totaal_kosten,
            "afschrijvingen": totaal_afschrijving,
            "winst_voor_belasting": winst_voor_belasting
        },
        "belasting_schijven": [
            {"van": 0, "tot": 2646, "percentage": 0},
            {"van": 2646, "tot": 10045, "percentage": 18},
            {"van": 10045, "tot": 28694, "percentage": 28},
            {"van": 28694, "tot": None, "percentage": 38}
        ],
        "geschatte_ib": round(ib_belasting, 2),
        "netto_winst": winst_voor_belasting - ib_belasting,
        "disclaimer": "Dit is een geschatte berekening. Raadpleeg uw accountant voor exacte berekening."
    }


@router.get("/rapportages/ouderdom")
async def get_ouderdom_rapport(type: str = "debiteuren", authorization: str = Header(None)):
    """Haal ouderdomsanalyse op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    today = datetime.now().date()
    
    if type == "debiteuren":
        facturen = await db.boekhouding_verkoopfacturen.find({
            "user_id": user_id,
            "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
        }).to_list(1000)
    else:
        facturen = await db.boekhouding_inkoopfacturen.find({
            "user_id": user_id,
            "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}
        }).to_list(1000)
    
    analyse = {"0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0, "totaal": 0}
    
    for f in facturen:
        try:
            verval = datetime.fromisoformat(f["vervaldatum"]).date()
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
        except:
            pass
    
    return analyse

# ==================== EXCEL EXPORT ====================

@router.get("/export/grootboek")
async def export_grootboek(authorization: str = Header(None)):
    """Export grootboek naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    rekeningen = await db.boekhouding_rekeningen.find({"user_id": user_id}).sort("code", 1).to_list(500)
    journaalposten = await db.boekhouding_journaalposten.find({"user_id": user_id}).sort("datum", -1).to_list(500)
    
    excel_bytes = export_grootboek_excel(
        [clean_doc(r) for r in rekeningen],
        [clean_doc(j) for j in journaalposten]
    )
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=grootboek_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )


@router.get("/export/debiteuren")
async def export_debiteuren(authorization: str = Header(None)):
    """Export debiteuren en facturen naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    debiteuren = await db.boekhouding_debiteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    facturen = await db.boekhouding_verkoopfacturen.find({"user_id": user_id}).sort("factuurdatum", -1).to_list(500)
    
    excel_bytes = export_debiteuren_excel(
        [clean_doc(d) for d in debiteuren],
        [clean_doc(f) for f in facturen]
    )
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=debiteuren_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )


@router.get("/export/crediteuren")
async def export_crediteuren(authorization: str = Header(None)):
    """Export crediteuren en facturen naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    crediteuren = await db.boekhouding_crediteuren.find({"user_id": user_id}).sort("naam", 1).to_list(500)
    facturen = await db.boekhouding_inkoopfacturen.find({"user_id": user_id}).sort("factuurdatum", -1).to_list(500)
    
    excel_bytes = export_crediteuren_excel(
        [clean_doc(c) for c in crediteuren],
        [clean_doc(f) for f in facturen]
    )
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=crediteuren_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )


@router.get("/export/btw-aangifte")
async def export_btw_aangifte(jaar: int = None, kwartaal: int = 1, authorization: str = Header(None)):
    """Export BTW aangifte naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    jaar = jaar or datetime.now().year
    
    # BTW verkoop
    btw_verkoop = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    
    # BTW inkoop
    btw_inkoop = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_bedrag"}}}
    ]).to_list(1)
    
    rapport = {
        "periode": {"jaar": jaar, "kwartaal": kwartaal},
        "btw_verkoop": btw_verkoop[0]["totaal"] if btw_verkoop else 0,
        "btw_inkoop": btw_inkoop[0]["totaal"] if btw_inkoop else 0,
        "btw_te_betalen": (btw_verkoop[0]["totaal"] if btw_verkoop else 0) - (btw_inkoop[0]["totaal"] if btw_inkoop else 0)
    }
    
    excel_bytes = export_btw_aangifte_excel(rapport)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=btw_aangifte_{jaar}_Q{kwartaal}.xlsx"}
    )


@router.get("/export/winst-verlies")
async def export_winst_verlies(jaar: int = None, authorization: str = Header(None)):
    """Export Winst & Verlies naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    jaar = jaar or datetime.now().year
    
    omzet = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "concept"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$subtotaal"}}}
    ]).to_list(1)
    
    kosten = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$ne": "nieuw"}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$subtotaal"}}}
    ]).to_list(1)
    
    totaal_omzet = omzet[0]["totaal"] if omzet else 0
    totaal_kosten = kosten[0]["totaal"] if kosten else 0
    
    rapport = {
        "jaar": jaar,
        "omzet": [{"naam": "Totale omzet", "bedrag": totaal_omzet}],
        "kosten": [{"naam": "Totale kosten", "bedrag": totaal_kosten}],
        "totaal_omzet": totaal_omzet,
        "totaal_kosten": totaal_kosten,
        "netto_winst": totaal_omzet - totaal_kosten
    }
    
    excel_bytes = export_winst_verlies_excel(rapport)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=winst_verlies_{jaar}.xlsx"}
    )


@router.get("/export/balans")
async def export_balans(authorization: str = Header(None)):
    """Export Balans naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    # Bank saldi
    bank_saldo = await db.boekhouding_bankrekeningen.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$huidig_saldo"}}}
    ]).to_list(1)
    
    # Debiteuren
    debiteuren = await db.boekhouding_verkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$in": ["verzonden", "herinnering"]}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    
    # Crediteuren
    crediteuren = await db.boekhouding_inkoopfacturen.aggregate([
        {"$match": {"user_id": user_id, "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$openstaand_bedrag"}}}
    ]).to_list(1)
    
    activa = [
        {"naam": "Liquide middelen", "saldo": bank_saldo[0]["totaal"] if bank_saldo else 0},
        {"naam": "Debiteuren", "saldo": debiteuren[0]["totaal"] if debiteuren else 0}
    ]
    
    passiva = [
        {"naam": "Crediteuren", "saldo": crediteuren[0]["totaal"] if crediteuren else 0}
    ]
    
    rapport = {
        "datum": datetime.now().strftime('%d-%m-%Y'),
        "activa": activa,
        "passiva": passiva,
        "totaal_activa": sum(a["saldo"] for a in activa),
        "totaal_passiva": sum(p["saldo"] for p in passiva)
    }
    
    excel_bytes = export_balans_excel(rapport)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=balans_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )


@router.get("/export/ouderdom")
async def export_ouderdom(type: str = "debiteuren", authorization: str = Header(None)):
    """Export Ouderdomsanalyse naar Excel"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    if not EXCEL_ENABLED:
        raise HTTPException(status_code=501, detail="Excel export niet beschikbaar")
    
    today = datetime.now().date()
    
    if type == "debiteuren":
        facturen = await db.boekhouding_verkoopfacturen.find({
            "user_id": user_id,
            "status": {"$in": ["verzonden", "herinnering", "gedeeltelijk_betaald"]}
        }).to_list(1000)
    else:
        facturen = await db.boekhouding_inkoopfacturen.find({
            "user_id": user_id,
            "status": {"$in": ["geboekt", "gedeeltelijk_betaald"]}
        }).to_list(1000)
    
    analyse = {"0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0, "totaal": 0}
    
    for f in facturen:
        try:
            verval = datetime.fromisoformat(f["vervaldatum"]).date()
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
        except:
            pass
    
    type_label = "Debiteuren" if type == "debiteuren" else "Crediteuren"
    excel_bytes = export_ouderdom_excel(analyse, type_label)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=ouderdom_{type}_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )

# ==================== INSTELLINGEN ====================

@router.get("/instellingen")
async def get_instellingen(authorization: str = Header(None)):
    """Haal bedrijfsinstellingen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    instellingen = await db.boekhouding_instellingen.find_one({"user_id": user_id})
    if not instellingen:
        # Maak default instellingen
        instellingen = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "bedrijfsnaam": "",
            "adres": "",
            "plaats": "",
            "land": "Suriname",
            "telefoon": "",
            "email": "",
            "btw_nummer": "",
            "kvk_nummer": "",
            "bank_naam": "",
            "bank_rekening": "",
            "standaard_betalingstermijn": 30,
            # Factuur template instellingen
            "factuur_primaire_kleur": "#1e293b",
            "factuur_secundaire_kleur": "#f1f5f9",
            "factuur_template": "standaard",
            "factuur_voorwaarden": "",
            "created_at": datetime.now(timezone.utc)
        }
        await db.boekhouding_instellingen.insert_one(instellingen)
    
    return clean_doc(instellingen)

@router.put("/instellingen")
async def update_instellingen(data: InstellingenUpdate, authorization: str = Header(None)):
    """Update bedrijfsinstellingen"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.boekhouding_instellingen.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Instellingen bijgewerkt"}

# ==================== HERINNERINGEN ====================

@router.get("/herinneringen")
async def get_herinneringen(authorization: str = Header(None)):
    """Haal alle herinneringen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    herinneringen = await db.boekhouding_herinneringen.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return [clean_doc(h) for h in herinneringen]

@router.post("/herinneringen/genereren")
async def genereer_herinneringen(authorization: str = Header(None)):
    """Genereer herinneringen voor verlopen facturen"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    today = datetime.now().date()
    
    verlopen_facturen = await db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "herinnering"]},
        "vervaldatum": {"$lt": today.isoformat()}
    }).to_list(500)
    
    nieuwe_herinneringen = []
    
    for factuur in verlopen_facturen:
        # Check bestaande herinneringen
        aantal = await db.boekhouding_herinneringen.count_documents({
            "user_id": user_id,
            "factuur_id": factuur["id"]
        })
        
        if aantal == 0:
            type_h = "eerste"
        elif aantal == 1:
            type_h = "tweede"
        else:
            type_h = "aanmaning"
        
        herinnering = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "debiteur_id": factuur.get("debiteur_id"),
            "factuur_id": factuur["id"],
            "factuurnummer": factuur.get("factuurnummer"),
            "debiteur_naam": factuur.get("debiteur_naam"),
            "openstaand_bedrag": factuur.get("openstaand_bedrag", 0),
            "type": type_h,
            "verzonden": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.boekhouding_herinneringen.insert_one(herinnering)
        nieuwe_herinneringen.append(clean_doc(herinnering))
    
    return {"herinneringen": nieuwe_herinneringen, "aantal": len(nieuwe_herinneringen)}

@router.put("/herinneringen/{herinnering_id}/verzonden")
async def mark_herinnering_verzonden(herinnering_id: str, authorization: str = Header(None)):
    """Markeer herinnering als verzonden"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_herinneringen.update_one(
        {"id": herinnering_id, "user_id": user_id},
        {"$set": {"verzonden": True, "verzonden_op": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    return {"message": "Herinnering gemarkeerd als verzonden"}


@router.post("/herinneringen/{herinnering_id}/email")
async def send_herinnering_email(herinnering_id: str, authorization: str = Header(None)):
    """Verzend herinnering per email"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal herinnering
    herinnering = await db.boekhouding_herinneringen.find_one({"id": herinnering_id, "user_id": user_id})
    if not herinnering:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    
    # Haal factuur
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": herinnering.get('factuur_id'), "user_id": user_id})
    factuur = clean_doc(factuur) if factuur else {}
    
    # Haal debiteur
    debiteur = None
    if herinnering.get('debiteur_id'):
        debiteur = await db.boekhouding_debiteuren.find_one({"id": herinnering['debiteur_id'], "user_id": user_id})
        debiteur = clean_doc(debiteur) if debiteur else None
    
    if not debiteur or not debiteur.get('email'):
        raise HTTPException(status_code=400, detail="Debiteur heeft geen email adres")
    
    # Haal bedrijfsinstellingen (inclusief SMTP)
    instellingen = await db.boekhouding_instellingen.find_one({"user_id": user_id})
    instellingen = clean_doc(instellingen) if instellingen else {}
    
    # Check SMTP configuratie
    smtp_host = instellingen.get('smtp_host') or os.environ.get('SMTP_HOST')
    smtp_user = instellingen.get('smtp_user') or os.environ.get('SMTP_USER')
    smtp_password = instellingen.get('smtp_password') or os.environ.get('SMTP_PASSWORD')
    
    if not smtp_host or not smtp_user or not smtp_password:
        return {
            "success": False,
            "error": "Email niet geconfigureerd. Ga naar Instellingen om SMTP in te stellen.",
            "smtp_configured": False
        }
    
    # Genereer email HTML
    if EMAIL_ENABLED:
        html = email_service.generate_reminder_html(
            herinnering=clean_doc(herinnering),
            bedrijf=instellingen,
            factuur=factuur
        )
    else:
        html = f"<h1>Betalingsherinnering</h1><p>Factuur: {herinnering.get('factuurnummer')}</p>"
    
    # Type labels
    type_labels = {
        'eerste': 'Betalingsherinnering',
        'tweede': 'Tweede Betalingsherinnering',
        'aanmaning': 'Aanmaning'
    }
    subject = f"{type_labels.get(herinnering.get('type', 'eerste'), 'Herinnering')} - Factuur {herinnering.get('factuurnummer', '')}"
    
    # Verzend email via SMTP
    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{instellingen.get('smtp_from_name', instellingen.get('bedrijfsnaam', 'Facturatie'))} <{instellingen.get('smtp_from_email', smtp_user)}>"
        msg['To'] = debiteur['email']
        msg.attach(MIMEText(html, 'html', 'utf-8'))
        
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=instellingen.get('smtp_port', 587),
            username=smtp_user,
            password=smtp_password,
            start_tls=True
        )
        
        # Update herinnering status
        await db.boekhouding_herinneringen.update_one(
            {"id": herinnering_id},
            {"$set": {
                "verzonden": True,
                "verzonden_op": datetime.now(timezone.utc),
                "verzonden_naar": debiteur['email']
            }}
        )
        
        await log_audit(user_id, "email_verzonden", "herinneringen", "herinnering", herinnering_id, {
            "email": debiteur['email'],
            "type": herinnering.get('type')
        })
        
        return {"success": True, "message": f"Email verzonden naar {debiteur['email']}"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/instellingen/test-email")
async def test_email(to_email: str = None, authorization: str = Header(None)):
    """Test email configuratie"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal instellingen
    instellingen = await db.boekhouding_instellingen.find_one({"user_id": user_id})
    instellingen = clean_doc(instellingen) if instellingen else {}
    
    smtp_host = instellingen.get('smtp_host') or os.environ.get('SMTP_HOST')
    smtp_user = instellingen.get('smtp_user') or os.environ.get('SMTP_USER')
    smtp_password = instellingen.get('smtp_password') or os.environ.get('SMTP_PASSWORD')
    smtp_port = instellingen.get('smtp_port', 587)
    
    if not smtp_host or not smtp_user or not smtp_password:
        return {
            "success": False,
            "error": "SMTP niet geconfigureerd. Vul SMTP Host, Gebruikersnaam en Wachtwoord in."
        }
    
    # Use provided email, user email from settings, or current user email
    recipient_email = to_email or instellingen.get('email') or user.get('email')
    if not recipient_email:
        return {
            "success": False,
            "error": "Geen e-mailadres beschikbaar. Vul een e-mailadres in bij bedrijfsinstellingen."
        }
    
    try:
        import aiosmtplib
        import asyncio
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Test Email - Facturatie.sr"
        msg['From'] = f"{instellingen.get('smtp_from_name', 'Facturatie')} <{instellingen.get('smtp_from_email', smtp_user)}>"
        msg['To'] = recipient_email
        
        html = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #1e293b;">Test Email Geslaagd! ✅</h1>
            <p>Uw email configuratie werkt correct.</p>
            <p>Bedrijf: {instellingen.get('bedrijfsnaam', '-')}</p>
            <p>SMTP Host: {smtp_host}:{smtp_port}</p>
            <p style="color: #64748b; font-size: 12px;">Dit is een test email van Facturatie.sr</p>
        </div>
        """
        msg.attach(MIMEText(html, 'html', 'utf-8'))
        
        # Use timeout to prevent hanging
        try:
            await asyncio.wait_for(
                aiosmtplib.send(
                    msg,
                    hostname=smtp_host,
                    port=smtp_port,
                    username=smtp_user,
                    password=smtp_password,
                    start_tls=True,
                    timeout=30
                ),
                timeout=45
            )
        except asyncio.TimeoutError:
            return {"success": False, "error": f"Timeout bij verbinden met {smtp_host}:{smtp_port}. Controleer uw SMTP-instellingen."}
        
        return {"success": True, "message": f"Test email verzonden naar {recipient_email}"}
        
    except aiosmtplib.SMTPAuthenticationError as e:
        return {"success": False, "error": f"Authenticatie mislukt. Controleer uw gebruikersnaam en wachtwoord. ({str(e)})"}
    except aiosmtplib.SMTPConnectError as e:
        return {"success": False, "error": f"Kan niet verbinden met {smtp_host}:{smtp_port}. Controleer de server en poort. ({str(e)})"}
    except aiosmtplib.SMTPException as e:
        return {"success": False, "error": f"SMTP fout: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Onverwachte fout: {str(e)}"}

@router.put("/herinneringen/{herinnering_id}/bevestigen")
async def bevestig_herinnering(herinnering_id: str, authorization: str = Header(None)):
    """Bevestig herinnering (klant heeft gereageerd)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_herinneringen.update_one(
        {"id": herinnering_id, "user_id": user_id},
        {"$set": {"bevestigd": True, "bevestigd_op": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    return {"message": "Herinnering bevestigd"}

@router.get("/herinneringen/{herinnering_id}/brief")
async def get_herinnering_brief(herinnering_id: str, format: str = "pdf", authorization: str = Header(None)):
    """Download herinnering als brief (PDF of tekst)"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    herinnering = await db.boekhouding_herinneringen.find_one({"id": herinnering_id, "user_id": user_id})
    if not herinnering:
        raise HTTPException(status_code=404, detail="Herinnering niet gevonden")
    
    # Haal factuur
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": herinnering.get('factuur_id'), "user_id": user_id})
    factuur = clean_doc(factuur) if factuur else {}
    
    # Haal bedrijfsinstellingen
    instellingen = await db.boekhouding_instellingen.find_one({"user_id": user_id})
    if not instellingen:
        instellingen = {
            "bedrijfsnaam": user.get('company_name', 'Uw Bedrijf'),
            "adres": user.get('address', ''),
            "email": user.get('email', ''),
            "telefoon": user.get('phone', '')
        }
    
    # Haal debiteur
    debiteur = None
    if herinnering.get('debiteur_id'):
        debiteur = await db.boekhouding_debiteuren.find_one({"id": herinnering['debiteur_id'], "user_id": user_id})
        if debiteur:
            debiteur = clean_doc(debiteur)
    
    # Genereer PDF indien mogelijk en gewenst
    if format == "pdf" and PDF_ENABLED:
        try:
            pdf_bytes = generate_reminder_pdf(
                herinnering=clean_doc(herinnering),
                factuur=factuur,
                bedrijf=clean_doc(instellingen) if instellingen else {},
                debiteur=debiteur
            )
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=herinnering_{herinnering.get('factuurnummer', herinnering_id)}.pdf"
                }
            )
        except Exception as e:
            pass
    
    # Fallback: tekst brief
    type_labels = {
        'eerste': 'EERSTE BETALINGSHERINNERING',
        'tweede': 'TWEEDE BETALINGSHERINNERING',
        'aanmaning': 'AANMANING'
    }
    
    herinnering_type = herinnering.get('type', 'eerste')
    
    brief = f"""
{type_labels.get(herinnering_type, 'BETALINGSHERINNERING')}

{instellingen.get('bedrijfsnaam', 'Uw Bedrijf')}
{instellingen.get('adres', '')}
{instellingen.get('plaats', '')}

Datum: {datetime.now().strftime('%d-%m-%Y')}

Aan: {herinnering.get('debiteur_naam', 'Klant')}

Betreft: Factuurnummer {herinnering.get('factuurnummer', '')}
Openstaand bedrag: SRD {herinnering.get('openstaand_bedrag', 0):.2f}

Geachte heer/mevrouw,

Bij controle van onze administratie is ons gebleken dat de betaling van bovengenoemde 
factuur nog niet door ons is ontvangen. Wij verzoeken u vriendelijk het openstaande 
bedrag zo spoedig mogelijk over te maken.

Betalingsgegevens:
Bank: {instellingen.get('bank_naam', '')}
Rekeningnummer: {instellingen.get('bank_rekening', '')}
Onder vermelding van: {herinnering.get('factuurnummer', '')}

Mocht u reeds betaald hebben, dan kunt u deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,

{instellingen.get('bedrijfsnaam', '')}
"""
    
    return Response(
        content=brief.encode(),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=herinnering_{herinnering_id}.txt"}
    )

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

@router.get("/documenten/{document_id}")
async def get_document(document_id: str, authorization: str = Header(None)):
    """Haal specifiek document op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    document = await db.boekhouding_documenten.find_one({"id": document_id, "user_id": user_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    return clean_doc(document)

@router.post("/documenten/upload")
async def upload_document(
    file: UploadFile = File(...),
    naam: str = None,
    type: str = "overig",
    gekoppeld_aan_type: str = None,
    gekoppeld_aan_id: str = None,
    authorization: str = Header(None)
):
    """Upload document"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Bestand te groot")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Bestandstype niet toegestaan")
    
    # Save file
    user_upload_dir = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(user_upload_dir, exist_ok=True)
    
    safe_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(user_upload_dir, safe_filename)
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    document = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "naam": naam or file.filename,
        "bestandsnaam": safe_filename,
        "bestandspad": file_path,
        "type": type,
        "grootte": len(content),
        "mime_type": file.content_type,
        "gekoppeld_aan_type": gekoppeld_aan_type,
        "gekoppeld_aan_id": gekoppeld_aan_id,
        "created_at": datetime.now(timezone.utc)
    }
    await db.boekhouding_documenten.insert_one(document)
    return clean_doc(document)

@router.get("/documenten/{document_id}/download")
async def download_document(document_id: str, authorization: str = Header(None)):
    """Download document"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    document = await db.boekhouding_documenten.find_one({"id": document_id, "user_id": user_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    file_path = document.get('bestandspad')
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Bestand niet gevonden")
    
    with open(file_path, 'rb') as f:
        content = f.read()
    
    return {
        "filename": document.get('naam'),
        "content": base64.b64encode(content).decode('utf-8'),
        "mime_type": document.get('mime_type')
    }

@router.delete("/documenten/{document_id}")
async def delete_document(document_id: str, authorization: str = Header(None)):
    """Verwijder document"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    document = await db.boekhouding_documenten.find_one({"id": document_id, "user_id": user_id})
    if document and document.get('bestandspad'):
        try:
            os.remove(document['bestandspad'])
        except:
            pass
    
    result = await db.boekhouding_documenten.delete_one({"id": document_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    return {"message": "Document verwijderd"}

@router.put("/documenten/{document_id}/link")
async def link_document(document_id: str, entity_type: str, entity_id: str, authorization: str = Header(None)):
    """Koppel document aan entiteit"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    result = await db.boekhouding_documenten.update_one(
        {"id": document_id, "user_id": user_id},
        {"$set": {"gekoppeld_aan_type": entity_type, "gekoppeld_aan_id": entity_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    return {"message": "Document gekoppeld"}


# ==================== AUTOMATISCHE HERINNERINGEN ====================

@router.get("/herinneringen/scheduler-status")
async def get_reminder_scheduler_status(authorization: str = Header(None)):
    """Haal status van automatische herinneringen op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    # Haal instellingen op
    instellingen = await db.boekhouding_instellingen.find_one({"user_id": user_id})
    
    # Tel herinneringen vandaag
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    herinneringen_vandaag = await db.boekhouding_herinneringen.count_documents({
        "user_id": user_id,
        "auto_generated": True,
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # Tel openstaande facturen over vervaldatum
    vandaag = datetime.now(timezone.utc).date().isoformat()
    facturen_over_vervaldatum = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "status": {"$nin": ["betaald", "geannuleerd"]},
        "openstaand_bedrag": {"$gt": 0},
        "vervaldatum": {"$lt": vandaag}
    })
    
    return {
        "auto_herinneringen_enabled": instellingen.get("auto_herinneringen_enabled", False) if instellingen else False,
        "dagen_voor_eerste_herinnering": instellingen.get("dagen_voor_eerste_herinnering", 7) if instellingen else 7,
        "dagen_tussen_herinneringen": instellingen.get("dagen_tussen_herinneringen", 7) if instellingen else 7,
        "max_herinneringen": instellingen.get("max_herinneringen", 3) if instellingen else 3,
        "smtp_configured": bool(instellingen.get("smtp_user") and instellingen.get("smtp_password")) if instellingen else False,
        "herinneringen_vandaag": herinneringen_vandaag,
        "facturen_over_vervaldatum": facturen_over_vervaldatum,
        "scheduler_active": True,
        "next_run": "08:00 SRT (dagelijks)"
    }


@router.post("/herinneringen/trigger-check")
async def trigger_reminder_check(authorization: str = Header(None)):
    """Handmatig triggeren van herinnering controle"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    try:
        from services.herinnering_scheduler import trigger_manual_reminder_check
        result = await trigger_manual_reminder_check(db, user_id)
        
        return {
            "success": True,
            "message": "Herinnering controle uitgevoerd",
            "reminders_created": result.get("reminders_created", 0),
            "emails_sent": result.get("emails_sent", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fout bij uitvoeren controle: {str(e)}")


# ==================== AUDIT TRAIL ====================

@router.get("/audit-trail")
async def get_audit_trail(module: str = None, limit: int = 100, authorization: str = Header(None)):
    """Haal audit trail op"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    query = {"user_id": user_id}
    if module:
        query["module"] = module
    
    trail = await db.boekhouding_audit_trail.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [clean_doc(t) for t in trail]

# ==================== INITIALISATIE ====================

@router.post("/init/volledig")
async def initialiseer_boekhouding(authorization: str = Header(None)):
    """Initialiseer complete boekhouding met standaard Surinaams rekeningschema"""
    user = await get_current_user(authorization)
    user_id = user.get('id')
    
    existing = await db.boekhouding_rekeningen.find_one({"user_id": user_id})
    if existing:
        return {"message": "Boekhouding is al geïnitialiseerd", "status": "exists"}
    
    # Standaard rekeningen
    rekeningen = [
        {"code": "1000", "naam": "Vaste activa", "type": "activa", "categorie": "vaste_activa"},
        {"code": "1300", "naam": "Debiteuren", "type": "activa", "categorie": "debiteuren"},
        {"code": "1500", "naam": "Kas SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "1510", "naam": "Bank SRD", "type": "activa", "categorie": "liquide_middelen"},
        {"code": "2000", "naam": "Eigen vermogen", "type": "passiva", "categorie": "eigen_vermogen"},
        {"code": "2200", "naam": "Crediteuren", "type": "passiva", "categorie": "crediteuren"},
        {"code": "2210", "naam": "BTW te betalen", "type": "passiva", "categorie": "btw"},
        {"code": "8000", "naam": "Omzet verkopen", "type": "omzet", "categorie": "verkoop"},
        {"code": "4000", "naam": "Inkoopwaarde omzet", "type": "kosten", "categorie": "inkoop"},
    ]
    
    for rek in rekeningen:
        rek["id"] = str(uuid.uuid4())
        rek["user_id"] = user_id
        rek["is_actief"] = True
        rek["valuta"] = "SRD"
        rek["created_at"] = datetime.now(timezone.utc)
        await db.boekhouding_rekeningen.insert_one(rek)
    
    # BTW codes
    btw_codes = [
        {"code": "V25", "naam": "BTW verkoop 25%", "percentage": 25.0, "type": "verkoop"},
        {"code": "V10", "naam": "BTW verkoop 10%", "percentage": 10.0, "type": "verkoop"},
        {"code": "V0", "naam": "BTW verkoop 0%", "percentage": 0.0, "type": "verkoop"},
        {"code": "I25", "naam": "BTW inkoop 25%", "percentage": 25.0, "type": "inkoop"},
        {"code": "I10", "naam": "BTW inkoop 10%", "percentage": 10.0, "type": "inkoop"},
    ]
    
    for btw in btw_codes:
        btw["id"] = str(uuid.uuid4())
        btw["user_id"] = user_id
        btw["created_at"] = datetime.now(timezone.utc)
        await db.boekhouding_btw_codes.insert_one(btw)
    
    return {"message": "Boekhouding geïnitialiseerd", "rekeningen": len(rekeningen), "btw_codes": len(btw_codes)}
