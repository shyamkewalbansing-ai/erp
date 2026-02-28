"""
Boekhouding Module - Gedeelde Componenten
==========================================
Imports, helpers, models en database connectie voor alle boekhouding routers.
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
import jwt

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'surirentals')]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'suri-rentals-default-secret-change-in-production'

# Upload settings
UPLOAD_DIR = "/app/uploads/documenten"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'}

# Import optional services
try:
    from services.pdf_generator import generate_invoice_pdf, generate_reminder_pdf
    from services.mt940_parser import parse_mt940_file, suggest_reconciliation, MT940Transaction
    PDF_ENABLED = True
    MT940_ENABLED = True
except ImportError:
    PDF_ENABLED = False
    MT940_ENABLED = False

try:
    from services.unified_email_service import email_service
    EMAIL_ENABLED = True
except ImportError:
    EMAIL_ENABLED = False

try:
    from services.excel_export import (
        export_grootboek_excel, export_debiteuren_excel, export_crediteuren_excel,
        export_btw_aangifte_excel, export_winst_verlies_excel, export_balans_excel,
        export_ouderdom_excel
    )
    EXCEL_ENABLED = True
except ImportError:
    EXCEL_ENABLED = False

# Import grootboek service
from services.grootboek_service import (
    set_database as set_grootboek_db,
    get_rekening_by_code,
    get_rekening_voor_type,
    update_rekening_saldo,
    create_auto_journaalpost,
    boek_verkoopfactuur,
    boek_betaling_ontvangen,
    boek_inkoopfactuur,
    boek_betaling_uitgaand
)

# Initialize grootboek service with database
set_grootboek_db(db)


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
        "timestamp": datetime.now(timezone.utc)
    })


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
