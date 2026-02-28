"""
Grootboek Service - Automatische Journaalposten
================================================
Business logic voor automatische grootboekboekingen bij transacties.
"""

from datetime import date, datetime, timezone
from typing import Dict, Optional
import uuid
from fastapi import HTTPException

# MongoDB connection is injected from the router
db = None

def set_database(database):
    """Set the MongoDB database instance"""
    global db
    db = database

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
    
    # Type mapping met verwacht grootboek type en zoektermen
    type_mapping = {
        "debiteuren": ("activa", ["debiteur"]),
        "crediteuren": ("passiva", ["crediteur"]),
        "btw_verkoop": ("passiva", ["btw te betalen", "btw af te dragen"]),
        "btw_inkoop": ("activa", ["btw te vorderen", "voorbelasting", "btw voorheffing"]),
        "omzet": ("omzet", ["omzet verkop", "omzet dienst", "omzet export"]),
        "inkoop": ("kosten", ["inkoop", "inkoopwaarde"]),
        "bank": ("activa", ["bank"]),
        "kas": ("activa", ["kas"]),
        "voorraad": ("activa", ["voorraad"])
    }
    
    # STAP 1: Zoek eerst op basis van naam EN type (meest nauwkeurig)
    if rekening_type in type_mapping:
        verwacht_type, zoekterms = type_mapping[rekening_type]
        for term in zoekterms:
            rekening = await db.boekhouding_rekeningen.find_one({
                "user_id": user_id, 
                "naam": {"$regex": term, "$options": "i"},
                "type": verwacht_type
            })
            if rekening:
                return rekening.get("code")
    
    # STAP 2: Probeer de standaard code (werkt alleen als rekening bestaat)
    standaard_code = DEFAULT_REKENINGEN.get(rekening_type)
    if standaard_code:
        rekening = await get_rekening_by_code(user_id, standaard_code)
        if rekening:
            # Controleer of het type klopt
            if rekening_type in type_mapping:
                verwacht_type = type_mapping[rekening_type][0]
                if rekening.get("type") == verwacht_type:
                    return standaard_code
    
    # STAP 3: Probeer alternatieve codes
    alternatieven = ALTERNATIEVE_CODES.get(rekening_type, [])
    for code in alternatieven:
        rekening = await get_rekening_by_code(user_id, code)
        if rekening:
            # Controleer of het type klopt
            if rekening_type in type_mapping:
                verwacht_type = type_mapping[rekening_type][0]
                if rekening.get("type") == verwacht_type:
                    return code
    
    # STAP 4: Fallback - zoek op type alleen
    if rekening_type in type_mapping:
        verwacht_type = type_mapping[rekening_type][0]
        rekening = await db.boekhouding_rekeningen.find_one({
            "user_id": user_id, 
            "type": verwacht_type
        })
        if rekening:
            return rekening.get("code")
    
    # Laatste fallback
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
    bank_code = bankrekening_code or await get_rekening_voor_type(user_id, "bank")
    debiteuren_code = await get_rekening_voor_type(user_id, "debiteuren")
    
    regels = [
        {
            "rekening_code": bank_code,
            "omschrijving": f"Betaling ontvangen {factuur.get('factuurnummer', '')}",
            "debet": betaling.get("bedrag", 0),
            "credit": 0
        },
        {
            "rekening_code": debiteuren_code,
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
    inkoop_code = await get_rekening_voor_type(user_id, "inkoop")
    btw_code = await get_rekening_voor_type(user_id, "btw_inkoop")
    crediteuren_code = await get_rekening_voor_type(user_id, "crediteuren")
    
    regels = [
        {
            "rekening_code": inkoop_code,
            "omschrijving": f"Inkoop factuur {factuur.get('factuurnummer', '')}",
            "debet": factuur.get("subtotaal", 0),
            "credit": 0
        }
    ]
    
    # Voeg BTW regel alleen toe als er BTW is
    btw_bedrag = factuur.get("btw_bedrag", 0)
    if btw_bedrag > 0:
        regels.append({
            "rekening_code": btw_code,
            "omschrijving": f"Voorbelasting factuur {factuur.get('factuurnummer', '')}",
            "debet": btw_bedrag,
            "credit": 0
        })
    
    regels.append({
        "rekening_code": crediteuren_code,
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


async def boek_betaling_uitgaand(user_id: str, factuur: dict, betaling: dict, bankrekening_code: str = None):
    """
    Boek een uitgaande betaling naar het grootboek
    
    Debet: Crediteuren
    Credit: Bank/Kas
    """
    bank_code = bankrekening_code or await get_rekening_voor_type(user_id, "bank")
    crediteuren_code = await get_rekening_voor_type(user_id, "crediteuren")
    
    regels = [
        {
            "rekening_code": crediteuren_code,
            "omschrijving": f"Afboeking crediteur: {factuur.get('crediteur_naam', 'Onbekend')}",
            "debet": betaling.get("bedrag", 0),
            "credit": 0
        },
        {
            "rekening_code": bank_code,
            "omschrijving": f"Betaling uitgaand {factuur.get('factuurnummer', '')}",
            "debet": 0,
            "credit": betaling.get("bedrag", 0)
        }
    ]
    
    await create_auto_journaalpost(
        user_id=user_id,
        dagboek_code="BK",  # Bank dagboek
        datum=betaling.get("datum", date.today()),
        omschrijving=f"Betaling factuur {factuur.get('factuurnummer', '')} - {factuur.get('crediteur_naam', '')}",
        regels=regels,
        document_ref=factuur.get("id")
    )
