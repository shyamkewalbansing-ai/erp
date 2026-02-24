"""
Grootboek Integration Utilities
Automatische journaalposten voor alle transacties
"""

from datetime import datetime, timezone
import uuid
from typing import Optional, List, Dict, Any


# Standaard grootboekrekeningen (worden aangemaakt als ze niet bestaan)
STANDAARD_REKENINGEN = {
    # Balans - Activa
    "1000": {"naam": "Kas", "type": "activa", "beschrijving": "Kasgeld"},
    "1100": {"naam": "Bank", "type": "activa", "beschrijving": "Bankrekeningen"},
    "1200": {"naam": "Debiteuren", "type": "activa", "beschrijving": "Vorderingen op klanten"},
    "1300": {"naam": "Voorraad", "type": "activa", "beschrijving": "Handelsvoorraad"},
    "1400": {"naam": "Vaste Activa", "type": "activa", "beschrijving": "Materiële vaste activa"},
    "1410": {"naam": "Afschrijving Vaste Activa", "type": "activa", "beschrijving": "Cumulatieve afschrijvingen"},
    
    # Balans - Passiva
    "2000": {"naam": "Crediteuren", "type": "passiva", "beschrijving": "Schulden aan leveranciers"},
    "2100": {"naam": "BTW Af te dragen", "type": "passiva", "beschrijving": "Te betalen omzetbelasting"},
    "2200": {"naam": "BTW Voorbelasting", "type": "activa", "beschrijving": "Te verrekenen BTW"},
    
    # Resultaat - Opbrengsten
    "8000": {"naam": "Omzet Verkoop", "type": "opbrengsten", "beschrijving": "Omzet uit verkopen"},
    "8100": {"naam": "Omzet Diensten", "type": "opbrengsten", "beschrijving": "Omzet uit dienstverlening"},
    
    # Resultaat - Kosten
    "4000": {"naam": "Inkoopkosten", "type": "kosten", "beschrijving": "Kosten van inkoop"},
    "4100": {"naam": "Voorraadkosten", "type": "kosten", "beschrijving": "Kosten voorraadmutaties"},
    "4200": {"naam": "Personeelskosten", "type": "kosten", "beschrijving": "Lonen en salarissen"},
    "4300": {"naam": "Afschrijvingskosten", "type": "kosten", "beschrijving": "Afschrijvingen vaste activa"},
    "4400": {"naam": "Overige Kosten", "type": "kosten", "beschrijving": "Diverse bedrijfskosten"},
    "4500": {"naam": "Projectkosten", "type": "kosten", "beschrijving": "Kosten toegewezen aan projecten"},
}


async def ensure_standaard_rekeningen(db, user_id: str) -> Dict[str, str]:
    """
    Zorg dat alle standaard grootboekrekeningen bestaan.
    Returns dict met code -> id mapping.
    """
    rekening_map = {}
    
    for code, data in STANDAARD_REKENINGEN.items():
        existing = await db.boekhouding_rekeningen.find_one(
            {"user_id": user_id, "code": code},
            {"_id": 0, "id": 1}
        )
        
        if existing:
            rekening_map[code] = existing["id"]
        else:
            rekening_id = str(uuid.uuid4())
            await db.boekhouding_rekeningen.insert_one({
                "id": rekening_id,
                "user_id": user_id,
                "code": code,
                "naam": data["naam"],
                "type": data["type"],
                "beschrijving": data["beschrijving"],
                "standaard_valuta": "SRD",
                "is_systeem": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            rekening_map[code] = rekening_id
    
    return rekening_map


async def get_rekening_by_code(db, user_id: str, code: str) -> Optional[str]:
    """Haal rekening ID op basis van code"""
    rekening = await db.boekhouding_rekeningen.find_one(
        {"user_id": user_id, "code": code},
        {"_id": 0, "id": 1}
    )
    return rekening["id"] if rekening else None


async def create_journaalpost(
    db,
    user_id: str,
    omschrijving: str,
    regels: List[Dict[str, Any]],
    datum: Optional[str] = None,
    referentie_type: Optional[str] = None,
    referentie_id: Optional[str] = None,
    referentie_nummer: Optional[str] = None,
    kostenplaats_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Maak een journaalpost aan.
    
    Args:
        db: Database connection
        user_id: User ID
        omschrijving: Beschrijving van de boeking
        regels: List van regels met {rekening_id, debet, credit, omschrijving}
        datum: Boekdatum (default: vandaag)
        referentie_type: Type referentie (verkoopfactuur, inkoopfactuur, betaling, etc.)
        referentie_id: ID van gerelateerd document
        referentie_nummer: Nummer van gerelateerd document
        kostenplaats_id: Optionele kostenplaats
        project_id: Optioneel project
    
    Returns:
        Created journaalpost document
    """
    # Valideer dat debet = credit
    totaal_debet = sum(r.get("debet", 0) for r in regels)
    totaal_credit = sum(r.get("credit", 0) for r in regels)
    
    if abs(totaal_debet - totaal_credit) > 0.01:
        raise ValueError(f"Debet ({totaal_debet}) en Credit ({totaal_credit}) zijn niet in balans")
    
    # Genereer journaalpostnummer
    count = await db.boekhouding_journaalposten.count_documents({"user_id": user_id})
    jaar = datetime.now().year
    post_nummer = f"JP{jaar}-{(count + 1):05d}"
    
    post_id = str(uuid.uuid4())
    post_datum = datum or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Voeg rekening info toe aan regels
    enriched_regels = []
    for regel in regels:
        rekening = await db.boekhouding_rekeningen.find_one(
            {"id": regel["rekening_id"], "user_id": user_id},
            {"_id": 0, "code": 1, "naam": 1}
        )
        enriched_regels.append({
            **regel,
            "rekening_code": rekening["code"] if rekening else "",
            "rekening_naam": rekening["naam"] if rekening else ""
        })
    
    post_doc = {
        "id": post_id,
        "user_id": user_id,
        "post_nummer": post_nummer,
        "datum": post_datum,
        "omschrijving": omschrijving,
        "regels": enriched_regels,
        "totaal_debet": totaal_debet,
        "totaal_credit": totaal_credit,
        "referentie_type": referentie_type,
        "referentie_id": referentie_id,
        "referentie_nummer": referentie_nummer,
        "kostenplaats_id": kostenplaats_id,
        "project_id": project_id,
        "status": "definitief",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.boekhouding_journaalposten.insert_one(post_doc)
    
    # Update rekening saldi
    for regel in regels:
        await update_rekening_saldo(db, user_id, regel["rekening_id"], regel.get("debet", 0), regel.get("credit", 0))
    
    return post_doc


async def update_rekening_saldo(db, user_id: str, rekening_id: str, debet: float, credit: float):
    """Update het saldo van een grootboekrekening"""
    rekening = await db.boekhouding_rekeningen.find_one(
        {"id": rekening_id, "user_id": user_id},
        {"_id": 0, "type": 1, "saldo": 1}
    )
    
    if not rekening:
        return
    
    current_saldo = rekening.get("saldo", 0)
    
    # Activa en Kosten: debet verhoogt, credit verlaagt
    # Passiva, Eigen Vermogen, Opbrengsten: credit verhoogt, debet verlaagt
    if rekening["type"] in ["activa", "kosten"]:
        new_saldo = current_saldo + debet - credit
    else:
        new_saldo = current_saldo + credit - debet
    
    await db.boekhouding_rekeningen.update_one(
        {"id": rekening_id, "user_id": user_id},
        {"$set": {"saldo": new_saldo, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )


# ==================== VERKOOPFACTUUR BOEKINGEN ====================

async def boek_verkoopfactuur(
    db,
    user_id: str,
    factuur: Dict[str, Any],
    debiteur_naam: str
) -> Dict[str, Any]:
    """
    Boek een verkoopfactuur naar het grootboek.
    
    Debet: Debiteuren (1200) - totaalbedrag
    Credit: Omzet (8000) - subtotaal
    Credit: BTW Af te dragen (2100) - BTW bedrag
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_debiteuren = await get_rekening_by_code(db, user_id, "1200")
    rekening_omzet = await get_rekening_by_code(db, user_id, "8000")
    rekening_btw = await get_rekening_by_code(db, user_id, "2100")
    
    subtotaal = factuur.get("subtotaal", 0)
    btw_bedrag = factuur.get("btw_bedrag", 0)
    totaal = factuur.get("totaal", 0)
    
    regels = [
        {
            "rekening_id": rekening_debiteuren,
            "debet": totaal,
            "credit": 0,
            "omschrijving": f"Vordering {debiteur_naam}"
        },
        {
            "rekening_id": rekening_omzet,
            "debet": 0,
            "credit": subtotaal,
            "omschrijving": f"Omzet {factuur.get('factuurnummer', '')}"
        }
    ]
    
    if btw_bedrag > 0:
        regels.append({
            "rekening_id": rekening_btw,
            "debet": 0,
            "credit": btw_bedrag,
            "omschrijving": f"BTW {factuur.get('factuurnummer', '')}"
        })
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Verkoopfactuur {factuur.get('factuurnummer', '')} - {debiteur_naam}",
        regels=regels,
        datum=factuur.get("factuurdatum"),
        referentie_type="verkoopfactuur",
        referentie_id=factuur.get("id"),
        referentie_nummer=factuur.get("factuurnummer"),
        project_id=factuur.get("project_id")
    )


async def boek_verkoopfactuur_betaling(
    db,
    user_id: str,
    factuur: Dict[str, Any],
    betaling: Dict[str, Any],
    debiteur_naam: str
) -> Dict[str, Any]:
    """
    Boek een betaling op een verkoopfactuur.
    
    Debet: Bank/Kas - betaald bedrag
    Credit: Debiteuren (1200) - betaald bedrag
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_debiteuren = await get_rekening_by_code(db, user_id, "1200")
    
    # Bepaal bank of kas rekening
    betaalmethode = betaling.get("betaalmethode", "bank")
    if betaalmethode == "kas":
        rekening_geld = await get_rekening_by_code(db, user_id, "1000")
    else:
        rekening_geld = await get_rekening_by_code(db, user_id, "1100")
    
    bedrag = betaling.get("bedrag", 0)
    
    regels = [
        {
            "rekening_id": rekening_geld,
            "debet": bedrag,
            "credit": 0,
            "omschrijving": f"Ontvangst van {debiteur_naam}"
        },
        {
            "rekening_id": rekening_debiteuren,
            "debet": 0,
            "credit": bedrag,
            "omschrijving": f"Betaling {factuur.get('factuurnummer', '')}"
        }
    ]
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Betaling {factuur.get('factuurnummer', '')} - {debiteur_naam}",
        regels=regels,
        datum=betaling.get("betaaldatum"),
        referentie_type="verkoopfactuur_betaling",
        referentie_id=factuur.get("id"),
        referentie_nummer=factuur.get("factuurnummer")
    )


# ==================== INKOOPFACTUUR BOEKINGEN ====================

async def boek_inkoopfactuur(
    db,
    user_id: str,
    factuur: Dict[str, Any],
    crediteur_naam: str
) -> Dict[str, Any]:
    """
    Boek een inkoopfactuur naar het grootboek.
    
    Debet: Inkoopkosten/Voorraad (4000/1300) - subtotaal
    Debet: BTW Voorbelasting (2200) - BTW bedrag
    Credit: Crediteuren (2000) - totaalbedrag
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_crediteuren = await get_rekening_by_code(db, user_id, "2000")
    rekening_btw = await get_rekening_by_code(db, user_id, "2200")
    
    # Bepaal of het voorraad of kosten zijn
    factuur_type = factuur.get("type", "kosten")
    if factuur_type == "voorraad":
        rekening_kosten = await get_rekening_by_code(db, user_id, "1300")
    else:
        rekening_kosten = await get_rekening_by_code(db, user_id, "4000")
    
    subtotaal = factuur.get("subtotaal", 0)
    btw_bedrag = factuur.get("btw_bedrag", 0)
    totaal = factuur.get("totaal", 0)
    
    regels = [
        {
            "rekening_id": rekening_kosten,
            "debet": subtotaal,
            "credit": 0,
            "omschrijving": f"Inkoop {factuur.get('factuurnummer', '')}"
        },
        {
            "rekening_id": rekening_crediteuren,
            "debet": 0,
            "credit": totaal,
            "omschrijving": f"Schuld aan {crediteur_naam}"
        }
    ]
    
    if btw_bedrag > 0:
        regels.append({
            "rekening_id": rekening_btw,
            "debet": btw_bedrag,
            "credit": 0,
            "omschrijving": f"BTW Voorbelasting {factuur.get('factuurnummer', '')}"
        })
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Inkoopfactuur {factuur.get('factuurnummer', '')} - {crediteur_naam}",
        regels=regels,
        datum=factuur.get("factuurdatum"),
        referentie_type="inkoopfactuur",
        referentie_id=factuur.get("id"),
        referentie_nummer=factuur.get("factuurnummer"),
        kostenplaats_id=factuur.get("kostenplaats_id"),
        project_id=factuur.get("project_id")
    )


async def boek_inkoopfactuur_betaling(
    db,
    user_id: str,
    factuur: Dict[str, Any],
    betaling: Dict[str, Any],
    crediteur_naam: str
) -> Dict[str, Any]:
    """
    Boek een betaling van een inkoopfactuur.
    
    Debet: Crediteuren (2000) - betaald bedrag
    Credit: Bank/Kas - betaald bedrag
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_crediteuren = await get_rekening_by_code(db, user_id, "2000")
    
    betaalmethode = betaling.get("betaalmethode", "bank")
    if betaalmethode == "kas":
        rekening_geld = await get_rekening_by_code(db, user_id, "1000")
    else:
        rekening_geld = await get_rekening_by_code(db, user_id, "1100")
    
    bedrag = betaling.get("bedrag", 0)
    
    regels = [
        {
            "rekening_id": rekening_crediteuren,
            "debet": bedrag,
            "credit": 0,
            "omschrijving": f"Betaling aan {crediteur_naam}"
        },
        {
            "rekening_id": rekening_geld,
            "debet": 0,
            "credit": bedrag,
            "omschrijving": f"Betaling {factuur.get('factuurnummer', '')}"
        }
    ]
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Betaling {factuur.get('factuurnummer', '')} - {crediteur_naam}",
        regels=regels,
        datum=betaling.get("betaaldatum"),
        referentie_type="inkoopfactuur_betaling",
        referentie_id=factuur.get("id"),
        referentie_nummer=factuur.get("factuurnummer")
    )


# ==================== VOORRAAD BOEKINGEN ====================

async def boek_voorraad_ontvangst(
    db,
    user_id: str,
    artikel: Dict[str, Any],
    aantal: float,
    kostprijs: float,
    referentie: str = ""
) -> Dict[str, Any]:
    """
    Boek voorraad ontvangst (inkoop).
    
    Debet: Voorraad (1300) - waarde
    Credit: Voorraadkosten (4100) - waarde
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_voorraad = await get_rekening_by_code(db, user_id, "1300")
    rekening_kosten = await get_rekening_by_code(db, user_id, "4100")
    
    waarde = aantal * kostprijs
    
    regels = [
        {
            "rekening_id": rekening_voorraad,
            "debet": waarde,
            "credit": 0,
            "omschrijving": f"Ontvangst {artikel.get('naam', '')} ({aantal} stuks)"
        },
        {
            "rekening_id": rekening_kosten,
            "debet": 0,
            "credit": waarde,
            "omschrijving": f"Voorraadtoename {artikel.get('artikelcode', '')}"
        }
    ]
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Voorraad ontvangst {artikel.get('naam', '')} - {referentie}",
        regels=regels,
        referentie_type="voorraad_ontvangst",
        referentie_nummer=referentie
    )


async def boek_voorraad_verkoop(
    db,
    user_id: str,
    artikel: Dict[str, Any],
    aantal: float,
    kostprijs: float,
    referentie: str = ""
) -> Dict[str, Any]:
    """
    Boek voorraad verkoop (uitgifte).
    
    Debet: Voorraadkosten (4100) - waarde
    Credit: Voorraad (1300) - waarde
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_voorraad = await get_rekening_by_code(db, user_id, "1300")
    rekening_kosten = await get_rekening_by_code(db, user_id, "4100")
    
    waarde = aantal * kostprijs
    
    regels = [
        {
            "rekening_id": rekening_kosten,
            "debet": waarde,
            "credit": 0,
            "omschrijving": f"Kostprijs verkoop {artikel.get('naam', '')}"
        },
        {
            "rekening_id": rekening_voorraad,
            "debet": 0,
            "credit": waarde,
            "omschrijving": f"Uitgifte {artikel.get('artikelcode', '')} ({aantal} stuks)"
        }
    ]
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Voorraad verkoop {artikel.get('naam', '')} - {referentie}",
        regels=regels,
        referentie_type="voorraad_verkoop",
        referentie_nummer=referentie
    )


# ==================== VASTE ACTIVA BOEKINGEN ====================

async def boek_afschrijving(
    db,
    user_id: str,
    activum: Dict[str, Any],
    afschrijving_bedrag: float,
    periode: str
) -> Dict[str, Any]:
    """
    Boek afschrijving van een vast activum.
    
    Debet: Afschrijvingskosten (4300) - bedrag
    Credit: Afschrijving Vaste Activa (1410) - bedrag
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_kosten = await get_rekening_by_code(db, user_id, "4300")
    rekening_afschrijving = await get_rekening_by_code(db, user_id, "1410")
    
    regels = [
        {
            "rekening_id": rekening_kosten,
            "debet": afschrijving_bedrag,
            "credit": 0,
            "omschrijving": f"Afschrijving {activum.get('naam', '')}"
        },
        {
            "rekening_id": rekening_afschrijving,
            "debet": 0,
            "credit": afschrijving_bedrag,
            "omschrijving": f"Cum. afschrijving {activum.get('activumnummer', '')}"
        }
    ]
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Afschrijving {activum.get('naam', '')} - {periode}",
        regels=regels,
        referentie_type="afschrijving",
        referentie_id=activum.get("id"),
        referentie_nummer=activum.get("activumnummer"),
        kostenplaats_id=activum.get("kostenplaats_id")
    )


# ==================== PROJECT BOEKINGEN ====================

async def boek_project_uren(
    db,
    user_id: str,
    project: Dict[str, Any],
    uren: float,
    uurtarief: float,
    medewerker_naam: str = "",
    datum: str = None
) -> Dict[str, Any]:
    """
    Boek uren op een project.
    
    Debet: Projectkosten (4500) - waarde
    Credit: Personeelskosten (4200) - waarde (tegenrekening)
    """
    await ensure_standaard_rekeningen(db, user_id)
    
    rekening_projectkosten = await get_rekening_by_code(db, user_id, "4500")
    rekening_personeel = await get_rekening_by_code(db, user_id, "4200")
    
    waarde = uren * uurtarief
    
    regels = [
        {
            "rekening_id": rekening_projectkosten,
            "debet": waarde,
            "credit": 0,
            "omschrijving": f"Uren {medewerker_naam} op {project.get('naam', '')}"
        },
        {
            "rekening_id": rekening_personeel,
            "debet": 0,
            "credit": waarde,
            "omschrijving": f"Doorbelasting uren {project.get('code', '')}"
        }
    ]
    
    return await create_journaalpost(
        db=db,
        user_id=user_id,
        omschrijving=f"Urenregistratie {project.get('naam', '')} - {medewerker_naam}",
        regels=regels,
        datum=datum,
        referentie_type="project_uren",
        referentie_id=project.get("id"),
        referentie_nummer=project.get("project_nummer"),
        project_id=project.get("id")
    )
