"""
Bank Reconciliatie Module
- Upload bank transacties (CSV formaat)
- Automatisch matchen met openstaande facturen
- Handmatig matchen/afwijzen van transacties
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid
import csv
import io
from .deps import db, get_current_active_user

from utils.grootboek_integration import (
    boek_verkoopfactuur_betaling,
    boek_inkoopfactuur_betaling
)

router = APIRouter(prefix="/bank", tags=["Bank Reconciliatie"])

# Helper function to clean MongoDB documents
def clean_doc(doc):
    """Remove MongoDB _id field from document"""
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc

# ==================== ENUMS ====================

class TransactionType(str, Enum):
    CREDIT = "credit"  # Geld ontvangen
    DEBIT = "debit"    # Geld betaald

class MatchStatus(str, Enum):
    UNMATCHED = "niet_gematcht"
    SUGGESTED = "suggestie"
    MATCHED = "gematcht"
    IGNORED = "genegeerd"

class MatchType(str, Enum):
    VERKOOPFACTUUR = "verkoopfactuur"
    INKOOPFACTUUR = "inkoopfactuur"
    HANDMATIG = "handmatig"

# ==================== MODELS ====================

class BankTransactionCreate(BaseModel):
    datum: str
    omschrijving: str
    bedrag: float
    type: TransactionType
    referentie: Optional[str] = None
    tegenrekening: Optional[str] = None

class BankTransactionMatch(BaseModel):
    factuur_id: str
    factuur_type: MatchType  # verkoopfactuur of inkoopfactuur

class ManualBooking(BaseModel):
    grootboekrekening_id: str
    omschrijving: str

# Surinaamse en internationale bank codes
SURINAME_BANKS = {
    "DSB": "De Surinaamsche Bank",
    "HAKRIN": "Hakrinbank",
    "FINA": "Finabank",
    "SPSB": "Surinaamse Postspaarbank",
    "RBS": "Republic Bank Suriname",
    "VOLKS": "Volkscredietbank",
    "GODO": "Godo Bank"
}

# ==================== HELPER FUNCTIONS ====================

def parse_csv_transactions(content: str, user_id: str) -> List[dict]:
    """Parse CSV bestand met banktransacties - ondersteunt Surinaamse en internationale formaten"""
    transactions = []
    
    # Try semicolon first, then comma delimiter
    try:
        reader = csv.DictReader(io.StringIO(content), delimiter=';')
        rows = list(reader)
        if not rows or not rows[0]:
            reader = csv.DictReader(io.StringIO(content), delimiter=',')
            rows = list(reader)
    except:
        reader = csv.DictReader(io.StringIO(content), delimiter=',')
        rows = list(reader)
    
    for row in rows:
        try:
            # Probeer verschillende CSV formaten te ondersteunen (NL, EN, SR)
            datum = (row.get('Datum') or row.get('datum') or row.get('Date') or 
                    row.get('Boekdatum') or row.get('Transactiedatum') or row.get('ValueDate') or '')
            
            omschrijving = (row.get('Omschrijving') or row.get('omschrijving') or 
                          row.get('Description') or row.get('Naam / Omschrijving') or
                          row.get('Narrative') or row.get('Details') or '')
            
            # Bedrag parsing - kan positief/negatief zijn of apart Credit/Debit kolom
            bedrag_str = row.get('Bedrag') or row.get('bedrag') or row.get('Amount') or row.get('Transactiebedrag') or '0'
            # Remove currency symbols (SRD, USD, EUR, $, €)
            bedrag_str = bedrag_str.replace(',', '.').replace(' ', '')
            bedrag_str = bedrag_str.replace('€', '').replace('$', '').replace('SRD', '').replace('USD', '').replace('EUR', '')
            
            # Check voor aparte credit/debit kolommen
            credit = row.get('Credit') or row.get('Bij') or row.get('Ontvangen') or row.get('CR') or ''
            debit = row.get('Debit') or row.get('Af') or row.get('Betaald') or row.get('DR') or ''
            
            if credit and credit.strip():
                credit_val = credit.replace(',', '.').replace(' ', '').replace('SRD', '').replace('USD', '').replace('EUR', '')
                bedrag = abs(float(credit_val))
                trans_type = TransactionType.CREDIT
            elif debit and debit.strip():
                debit_val = debit.replace(',', '.').replace(' ', '').replace('SRD', '').replace('USD', '').replace('EUR', '')
                bedrag = abs(float(debit_val))
                trans_type = TransactionType.DEBIT
            else:
                bedrag = float(bedrag_str) if bedrag_str else 0
                trans_type = TransactionType.CREDIT if bedrag >= 0 else TransactionType.DEBIT
                bedrag = abs(bedrag)
            
            if bedrag == 0:
                continue
            
            # Tegenrekening - Surinaamse banken gebruiken andere formaten
            tegenrekening = (row.get('Tegenrekening') or row.get('Rekening') or 
                           row.get('Account') or row.get('IBAN') or 
                           row.get('Rekeningnummer') or row.get('Beneficiary Account') or '')
            
            # Referentie/kenmerk
            referentie = (row.get('Referentie') or row.get('Kenmerk') or 
                         row.get('Reference') or row.get('Transactie ID') or
                         row.get('Volgnummer') or '')
                
            referentie = row.get('Referentie') or row.get('Kenmerk') or row.get('Reference') or ''
            tegenrekening = row.get('Tegenrekening') or row.get('IBAN') or row.get('Rekening') or ''
            
            transactions.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "datum": datum,
                "omschrijving": omschrijving or '',
                "bedrag": bedrag,
                "type": trans_type.value,
                "referentie": referentie,
                "tegenrekening": tegenrekening,
                "status": MatchStatus.UNMATCHED.value,
                "match_suggesties": [],
                "matched_factuur_id": None,
                "matched_factuur_type": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            print(f"Fout bij parsing rij: {e}")
            continue
    
    return transactions


async def find_matching_invoices(transaction: dict, user_id: str) -> List[dict]:
    """Zoek mogelijke matching facturen voor een transactie"""
    suggesties = []
    bedrag = transaction["bedrag"]
    omschrijving = transaction["omschrijving"].lower()
    trans_type = transaction["type"]
    
    if trans_type == TransactionType.CREDIT.value:
        # Credit = geld ontvangen = zoek openstaande verkoopfacturen
        facturen = await db.boekhouding_verkoopfacturen.find({
            "user_id": user_id,
            "status": {"$in": ["verstuurd", "gedeeltelijk_betaald"]}
        }, {"_id": 0}).to_list(100)
        
        for factuur in facturen:
            score = 0
            openstaand = factuur.get("totaal", 0) - factuur.get("betaald_bedrag", 0)
            
            # Exact bedrag match = hoge score
            if abs(openstaand - bedrag) < 0.01:
                score += 100
            # Bedrag komt overeen met < 5% verschil
            elif openstaand > 0 and abs(openstaand - bedrag) / openstaand < 0.05:
                score += 50
            
            # Factuurnummer in omschrijving
            if factuur.get("factuurnummer", "").lower() in omschrijving:
                score += 80
            
            # Klantnaam in omschrijving
            if factuur.get("debiteur_naam", "").lower() in omschrijving:
                score += 30
            
            if score > 0:
                suggesties.append({
                    "factuur_id": factuur["id"],
                    "factuur_type": "verkoopfactuur",
                    "factuurnummer": factuur.get("factuurnummer"),
                    "klant_naam": factuur.get("debiteur_naam"),
                    "factuur_bedrag": factuur.get("totaal"),
                    "openstaand_bedrag": openstaand,
                    "score": score
                })
    
    else:
        # Debit = geld betaald = zoek openstaande inkoopfacturen
        facturen = await db.boekhouding_inkoopfacturen.find({
            "user_id": user_id,
            "status": {"$in": ["goedgekeurd", "gedeeltelijk_betaald"]}
        }, {"_id": 0}).to_list(100)
        
        for factuur in facturen:
            score = 0
            openstaand = factuur.get("totaal", 0) - factuur.get("betaald_bedrag", 0)
            
            # Exact bedrag match
            if abs(openstaand - bedrag) < 0.01:
                score += 100
            elif openstaand > 0 and abs(openstaand - bedrag) / openstaand < 0.05:
                score += 50
            
            # Factuurnummer in omschrijving
            if factuur.get("factuurnummer", "").lower() in omschrijving:
                score += 80
            
            # Leveranciernaam in omschrijving
            if factuur.get("crediteur_naam", "").lower() in omschrijving:
                score += 30
            
            if score > 0:
                suggesties.append({
                    "factuur_id": factuur["id"],
                    "factuur_type": "inkoopfactuur",
                    "factuurnummer": factuur.get("factuurnummer"),
                    "leverancier_naam": factuur.get("crediteur_naam"),
                    "factuur_bedrag": factuur.get("totaal"),
                    "openstaand_bedrag": openstaand,
                    "score": score
                })
    
    # Sorteer op score (hoogste eerst)
    suggesties.sort(key=lambda x: x["score"], reverse=True)
    return suggesties[:5]  # Top 5 suggesties


# ==================== ENDPOINTS ====================

@router.post("/transacties/upload")
async def upload_bank_statement(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload een CSV bestand met banktransacties"""
    user_id = current_user["id"]
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Alleen CSV bestanden worden ondersteund")
    
    try:
        content = await file.read()
        content_str = content.decode('utf-8-sig')  # Handle BOM
    except UnicodeDecodeError:
        try:
            content_str = content.decode('latin-1')
        except:
            raise HTTPException(status_code=400, detail="Kon bestand niet lezen. Controleer de encoding.")
    
    transactions = parse_csv_transactions(content_str, user_id)
    
    if not transactions:
        raise HTTPException(status_code=400, detail="Geen geldige transacties gevonden in het bestand")
    
    # Zoek suggesties voor elke transactie
    for trans in transactions:
        suggesties = await find_matching_invoices(trans, user_id)
        trans["match_suggesties"] = suggesties
        if suggesties and suggesties[0]["score"] >= 100:
            trans["status"] = MatchStatus.SUGGESTED.value
    
    # Sla transacties op
    await db.bank_transacties.insert_many(transactions)
    
    # Clean the transactions before returning (remove _id added by insert_many)
    cleaned_transactions = [clean_doc(t) for t in transactions]
    
    return {
        "message": f"{len(transactions)} transacties geïmporteerd",
        "totaal": len(transactions),
        "met_suggesties": len([t for t in transactions if t["match_suggesties"]]),
        "transacties": cleaned_transactions
    }


@router.post("/transacties")
async def create_manual_transaction(
    data: BankTransactionCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Maak handmatig een banktransactie aan"""
    user_id = current_user["id"]
    
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "datum": data.datum,
        "omschrijving": data.omschrijving,
        "bedrag": data.bedrag,
        "type": data.type.value,
        "referentie": data.referentie,
        "tegenrekening": data.tegenrekening,
        "status": MatchStatus.UNMATCHED.value,
        "match_suggesties": [],
        "matched_factuur_id": None,
        "matched_factuur_type": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Zoek suggesties
    suggesties = await find_matching_invoices(transaction, user_id)
    transaction["match_suggesties"] = suggesties
    if suggesties and suggesties[0]["score"] >= 100:
        transaction["status"] = MatchStatus.SUGGESTED.value
    
    await db.bank_transacties.insert_one(transaction)
    
    return transaction


@router.get("/transacties")
async def get_bank_transactions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle banktransacties op"""
    user_id = current_user["id"]
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    transactions = await db.bank_transacties.find(query, {"_id": 0}).sort("datum", -1).to_list(500)
    
    # Stats berekenen
    stats = {
        "totaal": len(transactions),
        "niet_gematcht": len([t for t in transactions if t["status"] == MatchStatus.UNMATCHED.value]),
        "suggesties": len([t for t in transactions if t["status"] == MatchStatus.SUGGESTED.value]),
        "gematcht": len([t for t in transactions if t["status"] == MatchStatus.MATCHED.value]),
        "genegeerd": len([t for t in transactions if t["status"] == MatchStatus.IGNORED.value])
    }
    
    return {
        "transacties": transactions,
        "stats": stats
    }


@router.get("/transacties/{transactie_id}")
async def get_bank_transaction(
    transactie_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal een specifieke banktransactie op"""
    user_id = current_user["id"]
    
    transaction = await db.bank_transacties.find_one(
        {"id": transactie_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    return transaction


@router.post("/transacties/{transactie_id}/match")
async def match_transaction_to_invoice(
    transactie_id: str,
    data: BankTransactionMatch,
    current_user: dict = Depends(get_current_active_user)
):
    """Match een transactie aan een factuur en registreer de betaling"""
    user_id = current_user["id"]
    
    # Haal transactie op
    transaction = await db.bank_transacties.find_one(
        {"id": transactie_id, "user_id": user_id}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    if transaction["status"] == MatchStatus.MATCHED.value:
        raise HTTPException(status_code=400, detail="Transactie is al gematcht")
    
    bedrag = transaction["bedrag"]
    
    if data.factuur_type == MatchType.VERKOOPFACTUUR:
        # Haal verkoopfactuur op
        factuur = await db.boekhouding_verkoopfacturen.find_one(
            {"id": data.factuur_id, "user_id": user_id}
        )
        if not factuur:
            raise HTTPException(status_code=404, detail="Verkoopfactuur niet gevonden")
        
        openstaand = factuur.get("totaal", 0) - factuur.get("betaald_bedrag", 0)
        if bedrag > openstaand + 0.01:
            raise HTTPException(status_code=400, detail=f"Transactiebedrag ({bedrag}) is hoger dan openstaand bedrag ({openstaand})")
        
        # Registreer betaling
        nieuw_betaald = factuur.get("betaald_bedrag", 0) + bedrag
        nieuwe_status = "betaald" if nieuw_betaald >= factuur.get("totaal", 0) - 0.01 else "gedeeltelijk_betaald"
        
        await db.boekhouding_verkoopfacturen.update_one(
            {"id": data.factuur_id},
            {"$set": {
                "betaald_bedrag": nieuw_betaald,
                "status": nieuwe_status,
                "laatste_betaling": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Boek naar grootboek
        await boek_verkoopfactuur_betaling(
            factuur_id=data.factuur_id,
            betaling_bedrag=bedrag,
            betaling_methode="bank",
            user_id=user_id
        )
        
        factuur_nummer = factuur.get("factuurnummer")
        
    elif data.factuur_type == MatchType.INKOOPFACTUUR:
        # Haal inkoopfactuur op
        factuur = await db.boekhouding_inkoopfacturen.find_one(
            {"id": data.factuur_id, "user_id": user_id}
        )
        if not factuur:
            raise HTTPException(status_code=404, detail="Inkoopfactuur niet gevonden")
        
        openstaand = factuur.get("totaal", 0) - factuur.get("betaald_bedrag", 0)
        if bedrag > openstaand + 0.01:
            raise HTTPException(status_code=400, detail=f"Transactiebedrag ({bedrag}) is hoger dan openstaand bedrag ({openstaand})")
        
        # Registreer betaling
        nieuw_betaald = factuur.get("betaald_bedrag", 0) + bedrag
        nieuwe_status = "betaald" if nieuw_betaald >= factuur.get("totaal", 0) - 0.01 else "gedeeltelijk_betaald"
        
        await db.boekhouding_inkoopfacturen.update_one(
            {"id": data.factuur_id},
            {"$set": {
                "betaald_bedrag": nieuw_betaald,
                "status": nieuwe_status,
                "laatste_betaling": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Boek naar grootboek
        await boek_inkoopfactuur_betaling(
            factuur_id=data.factuur_id,
            betaling_bedrag=bedrag,
            betaling_methode="bank",
            user_id=user_id
        )
        
        factuur_nummer = factuur.get("factuurnummer")
    
    else:
        raise HTTPException(status_code=400, detail="Ongeldig factuur type")
    
    # Update transactie status
    await db.bank_transacties.update_one(
        {"id": transactie_id},
        {"$set": {
            "status": MatchStatus.MATCHED.value,
            "matched_factuur_id": data.factuur_id,
            "matched_factuur_type": data.factuur_type.value,
            "matched_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"Transactie gematcht met {data.factuur_type.value} {factuur_nummer}",
        "transactie_id": transactie_id,
        "factuur_id": data.factuur_id,
        "bedrag": bedrag
    }


@router.post("/transacties/{transactie_id}/ignore")
async def ignore_transaction(
    transactie_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Markeer een transactie als genegeerd"""
    user_id = current_user["id"]
    
    result = await db.bank_transacties.update_one(
        {"id": transactie_id, "user_id": user_id},
        {"$set": {
            "status": MatchStatus.IGNORED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    return {"message": "Transactie genegeerd"}


@router.post("/transacties/{transactie_id}/unmatch")
async def unmatch_transaction(
    transactie_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Ontkoppel een transactie van een factuur (reset naar niet gematcht)"""
    user_id = current_user["id"]
    
    transaction = await db.bank_transacties.find_one(
        {"id": transactie_id, "user_id": user_id}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    # Reset status
    await db.bank_transacties.update_one(
        {"id": transactie_id},
        {"$set": {
            "status": MatchStatus.UNMATCHED.value,
            "matched_factuur_id": None,
            "matched_factuur_type": None,
            "matched_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Transactie ontkoppeld"}


@router.delete("/transacties/{transactie_id}")
async def delete_transaction(
    transactie_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Verwijder een banktransactie"""
    user_id = current_user["id"]
    
    transaction = await db.bank_transacties.find_one(
        {"id": transactie_id, "user_id": user_id}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    
    if transaction["status"] == MatchStatus.MATCHED.value:
        raise HTTPException(status_code=400, detail="Gematchte transacties kunnen niet worden verwijderd")
    
    await db.bank_transacties.delete_one({"id": transactie_id})
    
    return {"message": "Transactie verwijderd"}


@router.post("/transacties/auto-match")
async def auto_match_all_transactions(
    current_user: dict = Depends(get_current_active_user)
):
    """Automatisch alle transacties matchen met hoge score suggesties"""
    user_id = current_user["id"]
    
    # Haal niet-gematchte transacties met suggesties op
    transactions = await db.bank_transacties.find({
        "user_id": user_id,
        "status": {"$in": [MatchStatus.UNMATCHED.value, MatchStatus.SUGGESTED.value]},
        "match_suggesties": {"$ne": []}
    }).to_list(500)
    
    matched_count = 0
    errors = []
    
    for trans in transactions:
        suggesties = trans.get("match_suggesties", [])
        if suggesties and suggesties[0]["score"] >= 100:
            beste_match = suggesties[0]
            try:
                # Match uitvoeren
                match_data = BankTransactionMatch(
                    factuur_id=beste_match["factuur_id"],
                    factuur_type=MatchType(beste_match["factuur_type"])
                )
                
                # Simulate the match logic inline
                bedrag = trans["bedrag"]
                
                if beste_match["factuur_type"] == "verkoopfactuur":
                    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": beste_match["factuur_id"]})
                    if factuur:
                        openstaand = factuur.get("totaal", 0) - factuur.get("betaald_bedrag", 0)
                        if bedrag <= openstaand + 0.01:
                            nieuw_betaald = factuur.get("betaald_bedrag", 0) + bedrag
                            nieuwe_status = "betaald" if nieuw_betaald >= factuur.get("totaal", 0) - 0.01 else "gedeeltelijk_betaald"
                            
                            await db.boekhouding_verkoopfacturen.update_one(
                                {"id": beste_match["factuur_id"]},
                                {"$set": {"betaald_bedrag": nieuw_betaald, "status": nieuwe_status}}
                            )
                            
                            await boek_verkoopfactuur_betaling(
                                factuur_id=beste_match["factuur_id"],
                                betaling_bedrag=bedrag,
                                betaling_methode="bank",
                                user_id=user_id
                            )
                            
                            await db.bank_transacties.update_one(
                                {"id": trans["id"]},
                                {"$set": {
                                    "status": MatchStatus.MATCHED.value,
                                    "matched_factuur_id": beste_match["factuur_id"],
                                    "matched_factuur_type": "verkoopfactuur",
                                    "matched_at": datetime.now(timezone.utc).isoformat()
                                }}
                            )
                            matched_count += 1
                
                elif beste_match["factuur_type"] == "inkoopfactuur":
                    factuur = await db.boekhouding_inkoopfacturen.find_one({"id": beste_match["factuur_id"]})
                    if factuur:
                        openstaand = factuur.get("totaal", 0) - factuur.get("betaald_bedrag", 0)
                        if bedrag <= openstaand + 0.01:
                            nieuw_betaald = factuur.get("betaald_bedrag", 0) + bedrag
                            nieuwe_status = "betaald" if nieuw_betaald >= factuur.get("totaal", 0) - 0.01 else "gedeeltelijk_betaald"
                            
                            await db.boekhouding_inkoopfacturen.update_one(
                                {"id": beste_match["factuur_id"]},
                                {"$set": {"betaald_bedrag": nieuw_betaald, "status": nieuwe_status}}
                            )
                            
                            await boek_inkoopfactuur_betaling(
                                factuur_id=beste_match["factuur_id"],
                                betaling_bedrag=bedrag,
                                betaling_methode="bank",
                                user_id=user_id
                            )
                            
                            await db.bank_transacties.update_one(
                                {"id": trans["id"]},
                                {"$set": {
                                    "status": MatchStatus.MATCHED.value,
                                    "matched_factuur_id": beste_match["factuur_id"],
                                    "matched_factuur_type": "inkoopfactuur",
                                    "matched_at": datetime.now(timezone.utc).isoformat()
                                }}
                            )
                            matched_count += 1
                            
            except Exception as e:
                errors.append({"transactie_id": trans["id"], "error": str(e)})
    
    return {
        "message": f"{matched_count} transacties automatisch gematcht",
        "matched": matched_count,
        "errors": errors
    }


@router.get("/stats")
async def get_reconciliation_stats(
    current_user: dict = Depends(get_current_active_user)
):
    """Haal reconciliatie statistieken op"""
    user_id = current_user["id"]
    
    # Tel transacties per status
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "totaal_bedrag": {"$sum": "$bedrag"}
        }}
    ]
    
    stats_raw = await db.bank_transacties.aggregate(pipeline).to_list(10)
    
    stats = {
        "niet_gematcht": {"count": 0, "bedrag": 0},
        "suggestie": {"count": 0, "bedrag": 0},
        "gematcht": {"count": 0, "bedrag": 0},
        "genegeerd": {"count": 0, "bedrag": 0}
    }
    
    for item in stats_raw:
        status = item["_id"]
        if status in stats:
            stats[status] = {
                "count": item["count"],
                "bedrag": round(item["totaal_bedrag"], 2)
            }
    
    # Haal openstaande facturen op
    open_verkoop = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "status": {"$in": ["verstuurd", "gedeeltelijk_betaald"]}
    })
    
    open_inkoop = await db.boekhouding_inkoopfacturen.count_documents({
        "user_id": user_id,
        "status": {"$in": ["goedgekeurd", "gedeeltelijk_betaald"]}
    })
    
    return {
        "transacties": stats,
        "openstaande_verkoopfacturen": open_verkoop,
        "openstaande_inkoopfacturen": open_inkoop
    }
