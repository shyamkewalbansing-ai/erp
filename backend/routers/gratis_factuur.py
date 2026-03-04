"""
Gratis Factuur & Offerte Generator - Standalone Authentication & Management System
Separate from main Facturatie.sr accounts
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import jwt
import bcrypt
import os

router = APIRouter(prefix="/gratis-factuur", tags=["Gratis Factuur"])
security = HTTPBearer(auto_error=False)

# JWT settings
JWT_SECRET = os.environ.get("JWT_SECRET", "gratis-factuur-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Database reference (will be set from server.py)
db = None

def set_database(database):
    global db
    db = database

# ============== MODELS ==============

class GratisUserRegister(BaseModel):
    email: EmailStr
    password: str
    bedrijfsnaam: str
    telefoon: Optional[str] = None

class GratisUserLogin(BaseModel):
    email: EmailStr
    password: str

class GratisUserUpdate(BaseModel):
    bedrijfsnaam: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    plaats: Optional[str] = None
    telefoon: Optional[str] = None
    kvk_nummer: Optional[str] = None
    btw_nummer: Optional[str] = None
    bank_naam: Optional[str] = None
    iban: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    # Automatic reminder settings
    auto_herinnering_enabled: Optional[bool] = None
    auto_herinnering_dagen: Optional[int] = None  # Days after due date to send reminder
    # Default currency setting
    standaard_valuta: Optional[str] = None  # SRD, EUR, USD

class KlantCreate(BaseModel):
    naam: str
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    plaats: Optional[str] = None
    land: Optional[str] = None
    notities: Optional[str] = None

class KlantUpdate(BaseModel):
    naam: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    plaats: Optional[str] = None
    land: Optional[str] = None
    notities: Optional[str] = None

class FactuurItem(BaseModel):
    omschrijving: str
    aantal: float
    prijs: float
    btw_percentage: float = 0

class FactuurCreate(BaseModel):
    klant_id: str
    document_type: str = "factuur"  # factuur or offerte
    nummer: str
    datum: str
    vervaldatum: str
    valuta: str = "SRD"
    btw_regio: str = "SR"
    items: List[FactuurItem]
    notities: Optional[str] = None
    template: str = "modern"

class FactuurUpdate(BaseModel):
    klant_id: Optional[str] = None
    document_type: Optional[str] = None
    nummer: Optional[str] = None
    datum: Optional[str] = None
    vervaldatum: Optional[str] = None
    valuta: Optional[str] = None
    btw_regio: Optional[str] = None
    items: Optional[List[FactuurItem]] = None
    notities: Optional[str] = None
    template: Optional[str] = None
    status: Optional[str] = None

class BetalingCreate(BaseModel):
    factuur_id: str
    bedrag: float
    datum: str
    notities: Optional[str] = None

class EmailFactuur(BaseModel):
    factuur_id: str
    onderwerp: Optional[str] = None
    bericht: Optional[str] = None

# ============== HELPERS ==============

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "type": "gratis_factuur"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "gratis_factuur":
            raise HTTPException(status_code=401, detail="Ongeldig token type")
        
        user = await db.gratis_factuur_users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldig token")

def clean_doc(doc):
    """Remove _id and convert ObjectId to string"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# ============== AUTH ENDPOINTS ==============

@router.post("/auth/register")
async def register(data: GratisUserRegister):
    """Register a new user for the free invoice system"""
    # Check if email already exists
    existing = await db.gratis_factuur_users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email is al geregistreerd")
    
    # Hash password
    hashed_password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    
    # Create user
    user_doc = {
        "email": data.email.lower(),
        "password": hashed_password,
        "bedrijfsnaam": data.bedrijfsnaam,
        "telefoon": data.telefoon,
        "adres": "",
        "postcode": "",
        "plaats": "",
        "kvk_nummer": "",
        "btw_nummer": "",
        "bank_naam": "",
        "iban": "",
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.gratis_factuur_users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create token
    token = create_token(user_id, data.email.lower())
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": data.email.lower(),
            "bedrijfsnaam": data.bedrijfsnaam
        }
    }

@router.post("/auth/login")
async def login(data: GratisUserLogin):
    """Login to the free invoice system"""
    user = await db.gratis_factuur_users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    token = create_token(str(user["_id"]), user["email"])
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "bedrijfsnaam": user["bedrijfsnaam"]
        }
    }

@router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    """Get current user profile"""
    user_data = clean_doc(user.copy())
    # Remove sensitive fields
    user_data.pop("password", None)
    return user_data

@router.put("/auth/profile")
async def update_profile(data: GratisUserUpdate, user = Depends(get_current_user)):
    """Update user profile/settings"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.gratis_factuur_users.update_one(
        {"_id": user["_id"]},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Profiel bijgewerkt"}

# ============== KLANTEN ENDPOINTS ==============

@router.get("/klanten")
async def get_klanten(user = Depends(get_current_user)):
    """Get all customers for the current user"""
    klanten = await db.gratis_factuur_klanten.find(
        {"user_id": str(user["_id"])}
    ).sort("naam", 1).to_list(1000)
    
    # Add statistics for each customer
    for klant in klanten:
        klant_id = str(klant["_id"])
        
        # Count invoices
        facturen = await db.gratis_factuur_facturen.find(
            {"user_id": str(user["_id"]), "klant_id": klant_id}
        ).to_list(1000)
        
        totaal_bedrag = 0
        totaal_betaald = 0
        openstaand = 0
        
        for factuur in facturen:
            bedrag = factuur.get("totaal", 0)
            betaald = factuur.get("betaald_bedrag", 0)
            totaal_bedrag += bedrag
            totaal_betaald += betaald
            if factuur.get("status") != "betaald":
                openstaand += (bedrag - betaald)
        
        klant["aantal_facturen"] = len(facturen)
        klant["totaal_bedrag"] = totaal_bedrag
        klant["totaal_betaald"] = totaal_betaald
        klant["openstaand"] = openstaand
        
        clean_doc(klant)
    
    return klanten

@router.post("/klanten")
async def create_klant(data: KlantCreate, user = Depends(get_current_user)):
    """Create a new customer"""
    klant_doc = {
        "user_id": str(user["_id"]),
        "naam": data.naam,
        "email": data.email,
        "telefoon": data.telefoon,
        "adres": data.adres,
        "postcode": data.postcode,
        "plaats": data.plaats,
        "land": data.land,
        "notities": data.notities,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.gratis_factuur_klanten.insert_one(klant_doc)
    klant_doc["id"] = str(result.inserted_id)
    del klant_doc["_id"]  # Remove MongoDB _id before returning
    
    return {"success": True, "klant": klant_doc}

@router.get("/klanten/{klant_id}")
async def get_klant(klant_id: str, user = Depends(get_current_user)):
    """Get a specific customer"""
    klant = await db.gratis_factuur_klanten.find_one({
        "_id": ObjectId(klant_id),
        "user_id": str(user["_id"])
    })
    
    if not klant:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return clean_doc(klant)

@router.put("/klanten/{klant_id}")
async def update_klant(klant_id: str, data: KlantUpdate, user = Depends(get_current_user)):
    """Update a customer"""
    klant = await db.gratis_factuur_klanten.find_one({
        "_id": ObjectId(klant_id),
        "user_id": str(user["_id"])
    })
    
    if not klant:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.gratis_factuur_klanten.update_one(
        {"_id": ObjectId(klant_id)},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Klant bijgewerkt"}

@router.delete("/klanten/{klant_id}")
async def delete_klant(klant_id: str, user = Depends(get_current_user)):
    """Delete a customer"""
    result = await db.gratis_factuur_klanten.delete_one({
        "_id": ObjectId(klant_id),
        "user_id": str(user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"success": True, "message": "Klant verwijderd"}

# ============== FACTUREN ENDPOINTS ==============

@router.get("/facturen")
async def get_facturen(
    status: Optional[str] = None,
    klant_id: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get all invoices for the current user"""
    query = {"user_id": str(user["_id"])}
    
    if status:
        query["status"] = status
    if klant_id:
        query["klant_id"] = klant_id
    
    facturen = await db.gratis_factuur_facturen.find(query).sort("created_at", -1).to_list(1000)
    
    # Enrich with customer info
    for factuur in facturen:
        if factuur.get("klant_id"):
            klant = await db.gratis_factuur_klanten.find_one({"_id": ObjectId(factuur["klant_id"])})
            if klant:
                factuur["klant_naam"] = klant.get("naam", "")
                factuur["klant_email"] = klant.get("email", "")
        
        clean_doc(factuur)
    
    return facturen

@router.post("/facturen")
async def create_factuur(data: FactuurCreate, user = Depends(get_current_user)):
    """Create a new invoice"""
    # Calculate totals
    subtotaal = sum(item.aantal * item.prijs for item in data.items)
    btw_totaal = sum(item.aantal * item.prijs * item.btw_percentage / 100 for item in data.items)
    totaal = subtotaal + btw_totaal
    
    factuur_doc = {
        "user_id": str(user["_id"]),
        "klant_id": data.klant_id,
        "document_type": data.document_type,
        "nummer": data.nummer,
        "datum": data.datum,
        "vervaldatum": data.vervaldatum,
        "valuta": data.valuta,
        "btw_regio": data.btw_regio,
        "items": [item.dict() for item in data.items],
        "notities": data.notities,
        "template": data.template,
        "subtotaal": subtotaal,
        "btw_totaal": btw_totaal,
        "totaal": totaal,
        "betaald_bedrag": 0,
        "status": "openstaand",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.gratis_factuur_facturen.insert_one(factuur_doc)
    factuur_doc["id"] = str(result.inserted_id)
    del factuur_doc["_id"]  # Remove MongoDB _id before returning
    
    return {"success": True, "factuur": factuur_doc}

@router.get("/facturen/{factuur_id}")
async def get_factuur(factuur_id: str, user = Depends(get_current_user)):
    """Get a specific invoice"""
    factuur = await db.gratis_factuur_facturen.find_one({
        "_id": ObjectId(factuur_id),
        "user_id": str(user["_id"])
    })
    
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Get customer info
    if factuur.get("klant_id"):
        klant = await db.gratis_factuur_klanten.find_one({"_id": ObjectId(factuur["klant_id"])})
        if klant:
            factuur["klant"] = clean_doc(klant.copy())
    
    # Get payments
    betalingen = await db.gratis_factuur_betalingen.find(
        {"factuur_id": factuur_id}
    ).sort("datum", -1).to_list(100)
    
    factuur["betalingen"] = [clean_doc(b) for b in betalingen]
    
    return clean_doc(factuur)

@router.put("/facturen/{factuur_id}")
async def update_factuur(factuur_id: str, data: FactuurUpdate, user = Depends(get_current_user)):
    """Update an invoice"""
    factuur = await db.gratis_factuur_facturen.find_one({
        "_id": ObjectId(factuur_id),
        "user_id": str(user["_id"])
    })
    
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    # Recalculate totals if items changed
    if "items" in update_data:
        items = update_data["items"]
        subtotaal = sum(item["aantal"] * item["prijs"] for item in items)
        btw_totaal = sum(item["aantal"] * item["prijs"] * item["btw_percentage"] / 100 for item in items)
        update_data["subtotaal"] = subtotaal
        update_data["btw_totaal"] = btw_totaal
        update_data["totaal"] = subtotaal + btw_totaal
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.gratis_factuur_facturen.update_one(
        {"_id": ObjectId(factuur_id)},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Factuur bijgewerkt"}

@router.delete("/facturen/{factuur_id}")
async def delete_factuur(factuur_id: str, user = Depends(get_current_user)):
    """Delete an invoice"""
    result = await db.gratis_factuur_facturen.delete_one({
        "_id": ObjectId(factuur_id),
        "user_id": str(user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Also delete related payments
    await db.gratis_factuur_betalingen.delete_many({"factuur_id": factuur_id})
    
    return {"success": True, "message": "Factuur verwijderd"}

# ============== BETALINGEN ENDPOINTS ==============

@router.post("/betalingen")
async def create_betaling(data: BetalingCreate, user = Depends(get_current_user)):
    """Register a payment for an invoice"""
    # Check invoice exists and belongs to user
    factuur = await db.gratis_factuur_facturen.find_one({
        "_id": ObjectId(data.factuur_id),
        "user_id": str(user["_id"])
    })
    
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    betaling_doc = {
        "factuur_id": data.factuur_id,
        "user_id": str(user["_id"]),
        "bedrag": data.bedrag,
        "datum": data.datum,
        "notities": data.notities,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.gratis_factuur_betalingen.insert_one(betaling_doc)
    
    # Update invoice paid amount and status
    nieuw_betaald = factuur.get("betaald_bedrag", 0) + data.bedrag
    nieuwe_status = "betaald" if nieuw_betaald >= factuur["totaal"] else "deelbetaling"
    
    await db.gratis_factuur_facturen.update_one(
        {"_id": ObjectId(data.factuur_id)},
        {"$set": {
            "betaald_bedrag": nieuw_betaald,
            "status": nieuwe_status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    betaling_doc["id"] = str(result.inserted_id)
    del betaling_doc["_id"]  # Remove MongoDB _id before returning
    
    return {"success": True, "betaling": betaling_doc}

@router.get("/betalingen")
async def get_betalingen(
    factuur_id: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get all payments"""
    query = {"user_id": str(user["_id"])}
    if factuur_id:
        query["factuur_id"] = factuur_id
    
    betalingen = await db.gratis_factuur_betalingen.find(query).sort("datum", -1).to_list(1000)
    
    return [clean_doc(b) for b in betalingen]

@router.delete("/betalingen/{betaling_id}")
async def delete_betaling(betaling_id: str, user = Depends(get_current_user)):
    """Delete a payment"""
    betaling = await db.gratis_factuur_betalingen.find_one({
        "_id": ObjectId(betaling_id),
        "user_id": str(user["_id"])
    })
    
    if not betaling:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    # Update invoice
    factuur = await db.gratis_factuur_facturen.find_one({"_id": ObjectId(betaling["factuur_id"])})
    if factuur:
        nieuw_betaald = max(0, factuur.get("betaald_bedrag", 0) - betaling["bedrag"])
        nieuwe_status = "betaald" if nieuw_betaald >= factuur["totaal"] else ("openstaand" if nieuw_betaald == 0 else "deelbetaling")
        
        await db.gratis_factuur_facturen.update_one(
            {"_id": ObjectId(betaling["factuur_id"])},
            {"$set": {
                "betaald_bedrag": nieuw_betaald,
                "status": nieuwe_status,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    await db.gratis_factuur_betalingen.delete_one({"_id": ObjectId(betaling_id)})
    
    return {"success": True, "message": "Betaling verwijderd"}

# ============== DASHBOARD/STATS ENDPOINTS ==============

@router.get("/dashboard")
async def get_dashboard(user = Depends(get_current_user)):
    """Get dashboard statistics"""
    user_id = str(user["_id"])
    
    # Count customers
    klanten_count = await db.gratis_factuur_klanten.count_documents({"user_id": user_id})
    
    # Get all invoices
    facturen = await db.gratis_factuur_facturen.find({"user_id": user_id}).to_list(10000)
    
    totaal_omzet = sum(f.get("totaal", 0) for f in facturen)
    totaal_betaald = sum(f.get("betaald_bedrag", 0) for f in facturen)
    totaal_openstaand = totaal_omzet - totaal_betaald
    
    # Count by status
    openstaand_count = len([f for f in facturen if f.get("status") == "openstaand"])
    deelbetaling_count = len([f for f in facturen if f.get("status") == "deelbetaling"])
    betaald_count = len([f for f in facturen if f.get("status") == "betaald"])
    
    # Get overdue invoices
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    verlopen_facturen = [
        f for f in facturen 
        if f.get("status") in ["openstaand", "deelbetaling"] 
        and f.get("vervaldatum", "") < today
    ]
    
    return {
        "klanten_count": klanten_count,
        "facturen_count": len(facturen),
        "totaal_omzet": totaal_omzet,
        "totaal_betaald": totaal_betaald,
        "totaal_openstaand": totaal_openstaand,
        "openstaand_count": openstaand_count,
        "deelbetaling_count": deelbetaling_count,
        "betaald_count": betaald_count,
        "verlopen_count": len(verlopen_facturen),
        "verlopen_bedrag": sum(f.get("totaal", 0) - f.get("betaald_bedrag", 0) for f in verlopen_facturen)
    }

# ============== EMAIL ENDPOINTS ==============

@router.post("/email/factuur")
async def email_factuur(data: EmailFactuur, user = Depends(get_current_user)):
    """Send invoice to customer via email"""
    import aiosmtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Get invoice
    factuur = await db.gratis_factuur_facturen.find_one({
        "_id": ObjectId(data.factuur_id),
        "user_id": str(user["_id"])
    })
    
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Get customer
    klant = await db.gratis_factuur_klanten.find_one({"_id": ObjectId(factuur["klant_id"])})
    if not klant or not klant.get("email"):
        raise HTTPException(status_code=400, detail="Klant heeft geen email adres")
    
    # Check SMTP settings
    if not user.get("smtp_host") or not user.get("smtp_user") or not user.get("smtp_password"):
        raise HTTPException(status_code=400, detail="SMTP instellingen niet geconfigureerd. Ga naar Instellingen om uw email server in te stellen.")
    
    # Prepare email
    doc_type = "Factuur" if factuur.get("document_type") == "factuur" else "Offerte"
    onderwerp = data.onderwerp or f"{doc_type} {factuur['nummer']} van {user['bedrijfsnaam']}"
    
    bericht = data.bericht or f"""
Beste {klant['naam']},

Hierbij ontvangt u {doc_type.lower()} {factuur['nummer']}.

Bedrag: {factuur['valuta']} {factuur['totaal']:,.2f}
Vervaldatum: {factuur['vervaldatum']}

Met vriendelijke groet,
{user['bedrijfsnaam']}
    """
    
    msg = MIMEMultipart()
    msg['From'] = user.get("smtp_user")
    msg['To'] = klant['email']
    msg['Subject'] = onderwerp
    msg.attach(MIMEText(bericht, 'plain'))
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=user['smtp_host'],
            port=user.get('smtp_port', 587),
            username=user['smtp_user'],
            password=user['smtp_password'],
            use_tls=True
        )
        
        # Log email sent
        await db.gratis_factuur_facturen.update_one(
            {"_id": ObjectId(data.factuur_id)},
            {"$set": {
                "email_verzonden": True,
                "email_verzonden_op": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {"success": True, "message": f"Email verzonden naar {klant['email']}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email versturen mislukt: {str(e)}")

@router.post("/email/herinnering/{factuur_id}")
async def send_herinnering(factuur_id: str, user = Depends(get_current_user)):
    """Send payment reminder to customer"""
    import aiosmtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Get invoice
    factuur = await db.gratis_factuur_facturen.find_one({
        "_id": ObjectId(factuur_id),
        "user_id": str(user["_id"])
    })
    
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if factuur.get("status") == "betaald":
        raise HTTPException(status_code=400, detail="Factuur is al betaald")
    
    # Get customer
    klant = await db.gratis_factuur_klanten.find_one({"_id": ObjectId(factuur["klant_id"])})
    if not klant or not klant.get("email"):
        raise HTTPException(status_code=400, detail="Klant heeft geen email adres")
    
    # Check SMTP settings
    if not user.get("smtp_host") or not user.get("smtp_user") or not user.get("smtp_password"):
        raise HTTPException(status_code=400, detail="SMTP instellingen niet geconfigureerd")
    
    openstaand = factuur['totaal'] - factuur.get('betaald_bedrag', 0)
    
    bericht = f"""
Beste {klant['naam']},

Dit is een vriendelijke herinnering dat factuur {factuur['nummer']} nog niet (volledig) is betaald.

Factuurnummer: {factuur['nummer']}
Factuurdatum: {factuur['datum']}
Vervaldatum: {factuur['vervaldatum']}
Openstaand bedrag: {factuur['valuta']} {openstaand:,.2f}

Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.

Met vriendelijke groet,
{user['bedrijfsnaam']}
    """
    
    msg = MIMEMultipart()
    msg['From'] = user.get("smtp_user")
    msg['To'] = klant['email']
    msg['Subject'] = f"Betalingsherinnering - Factuur {factuur['nummer']}"
    msg.attach(MIMEText(bericht, 'plain'))
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=user['smtp_host'],
            port=user.get('smtp_port', 587),
            username=user['smtp_user'],
            password=user['smtp_password'],
            use_tls=True
        )
        
        return {"success": True, "message": f"Herinnering verzonden naar {klant['email']}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email versturen mislukt: {str(e)}")


# ============== AUTOMATIC REMINDERS ==============

@router.get("/verlopen-facturen")
async def get_verlopen_facturen(user = Depends(get_current_user)):
    """Get all overdue invoices that haven't been paid"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    facturen = await db.gratis_factuur_facturen.find({
        "user_id": str(user["_id"]),
        "status": {"$in": ["openstaand", "deelbetaling"]},
        "vervaldatum": {"$lt": today}
    }).sort("vervaldatum", 1).to_list(1000)
    
    # Enrich with customer info
    for factuur in facturen:
        if factuur.get("klant_id"):
            klant = await db.gratis_factuur_klanten.find_one({"_id": ObjectId(factuur["klant_id"])})
            if klant:
                factuur["klant_naam"] = klant.get("naam", "")
                factuur["klant_email"] = klant.get("email", "")
        
        # Calculate days overdue
        vervaldatum = datetime.strptime(factuur["vervaldatum"], "%Y-%m-%d")
        today_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        factuur["dagen_verlopen"] = (today_dt - vervaldatum).days
        
        clean_doc(factuur)
    
    return facturen

@router.post("/auto-herinneringen")
async def send_auto_herinneringen(user = Depends(get_current_user)):
    """Send automatic reminders for overdue invoices based on user settings"""
    import aiosmtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Check if auto reminders are enabled
    if not user.get("auto_herinnering_enabled"):
        return {"success": False, "message": "Automatische herinneringen zijn niet ingeschakeld"}
    
    # Check SMTP settings
    if not user.get("smtp_host") or not user.get("smtp_user") or not user.get("smtp_password"):
        return {"success": False, "message": "SMTP instellingen niet geconfigureerd"}
    
    reminder_days = user.get("auto_herinnering_dagen", 7)  # Default 7 days after due date
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find overdue invoices
    facturen = await db.gratis_factuur_facturen.find({
        "user_id": str(user["_id"]),
        "status": {"$in": ["openstaand", "deelbetaling"]},
        "vervaldatum": {"$lt": today},
        "auto_herinnering_verzonden": {"$ne": True}  # Not already sent
    }).to_list(1000)
    
    sent_count = 0
    errors = []
    
    for factuur in facturen:
        # Check if enough days have passed
        vervaldatum = datetime.strptime(factuur["vervaldatum"], "%Y-%m-%d")
        today_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        days_overdue = (today_dt - vervaldatum).days
        
        if days_overdue < reminder_days:
            continue
        
        # Get customer
        klant = await db.gratis_factuur_klanten.find_one({"_id": ObjectId(factuur["klant_id"])})
        if not klant or not klant.get("email"):
            continue
        
        openstaand = factuur['totaal'] - factuur.get('betaald_bedrag', 0)
        
        bericht = f"""
Beste {klant['naam']},

Dit is een automatische herinnering dat factuur {factuur['nummer']} nog niet (volledig) is betaald.

Factuurnummer: {factuur['nummer']}
Factuurdatum: {factuur['datum']}
Vervaldatum: {factuur['vervaldatum']}
Dagen verlopen: {days_overdue}
Openstaand bedrag: {factuur['valuta']} {openstaand:,.2f}

Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.

Met vriendelijke groet,
{user['bedrijfsnaam']}
        """
        
        msg = MIMEMultipart()
        msg['From'] = user.get("smtp_user")
        msg['To'] = klant['email']
        msg['Subject'] = f"Betalingsherinnering - Factuur {factuur['nummer']} ({days_overdue} dagen verlopen)"
        msg.attach(MIMEText(bericht, 'plain'))
        
        try:
            await aiosmtplib.send(
                msg,
                hostname=user['smtp_host'],
                port=user.get('smtp_port', 587),
                username=user['smtp_user'],
                password=user['smtp_password'],
                use_tls=True
            )
            
            # Mark as sent
            await db.gratis_factuur_facturen.update_one(
                {"_id": factuur["_id"]},
                {"$set": {
                    "auto_herinnering_verzonden": True,
                    "auto_herinnering_datum": datetime.now(timezone.utc)
                }}
            )
            
            sent_count += 1
            
        except Exception as e:
            errors.append(f"Factuur {factuur['nummer']}: {str(e)}")
    
    return {
        "success": True,
        "verzonden": sent_count,
        "fouten": errors,
        "message": f"{sent_count} herinneringen verzonden" + (f", {len(errors)} fouten" if errors else "")
    }

@router.post("/herinnering-reset/{factuur_id}")
async def reset_herinnering(factuur_id: str, user = Depends(get_current_user)):
    """Reset the auto reminder flag for a specific invoice (to send again)"""
    result = await db.gratis_factuur_facturen.update_one(
        {"_id": ObjectId(factuur_id), "user_id": str(user["_id"])},
        {"$unset": {"auto_herinnering_verzonden": "", "auto_herinnering_datum": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    return {"success": True, "message": "Herinnering status gereset"}
