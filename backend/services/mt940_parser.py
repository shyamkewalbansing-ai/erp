"""
MT940 Parser Module - Verbeterde bankimport parsing
"""
import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import mt940


@dataclass
class MT940Transaction:
    """Geparseerde MT940 transactie"""
    datum: date
    valutadatum: Optional[date]
    bedrag: float
    omschrijving: str
    tegenrekening: Optional[str]
    tegenpartij: Optional[str]
    referentie: Optional[str]
    boekcode: Optional[str]
    raw_data: str


@dataclass
class MT940Statement:
    """Geparseerd MT940 afschrift"""
    rekeningnummer: str
    valuta: str
    beginsaldo: float
    eindsaldo: float
    transacties: List[MT940Transaction]
    statement_datum: date
    volgnummer: str


def parse_mt940_file(content: bytes) -> List[MT940Statement]:
    """
    Parse MT940 bestand met de mt940 library
    
    Args:
        content: Raw bytes van het MT940 bestand
        
    Returns:
        Lijst van MT940Statement objecten
    """
    try:
        # Decode content
        try:
            content_str = content.decode('utf-8')
        except:
            content_str = content.decode('latin-1')
        
        # Parse met mt940 library
        statements = mt940.parse(mt940.models.Transactions, content_str)
        
        result = []
        for stmt in statements:
            transacties = []
            for tx in stmt.data:
                # Extract transactie details
                omschrijving = ""
                tegenrekening = None
                tegenpartij = None
                referentie = None
                
                if hasattr(tx, 'customer_reference'):
                    referentie = tx.customer_reference
                
                if hasattr(tx, 'extra_details'):
                    omschrijving = tx.extra_details or ""
                    # Parse tegenrekening uit omschrijving
                    iban_match = re.search(r'([A-Z]{2}\d{2}[A-Z0-9]{4,30})', omschrijving)
                    if iban_match:
                        tegenrekening = iban_match.group(1)
                    
                    # Parse tegenpartij naam
                    naam_match = re.search(r'NAME:([^/]+)', omschrijving)
                    if naam_match:
                        tegenpartij = naam_match.group(1).strip()
                
                transactie = MT940Transaction(
                    datum=tx.date if hasattr(tx, 'date') else date.today(),
                    valutadatum=tx.entry_date if hasattr(tx, 'entry_date') else None,
                    bedrag=float(tx.amount.amount) if hasattr(tx, 'amount') else 0,
                    omschrijving=omschrijving,
                    tegenrekening=tegenrekening,
                    tegenpartij=tegenpartij,
                    referentie=referentie,
                    boekcode=tx.transaction_details if hasattr(tx, 'transaction_details') else None,
                    raw_data=str(tx)
                )
                transacties.append(transactie)
            
            statement = MT940Statement(
                rekeningnummer=stmt.data.account_identification if hasattr(stmt.data, 'account_identification') else "",
                valuta=stmt.data.currency if hasattr(stmt.data, 'currency') else "SRD",
                beginsaldo=float(stmt.data.opening_balance.amount.amount) if hasattr(stmt.data, 'opening_balance') else 0,
                eindsaldo=float(stmt.data.closing_balance.amount.amount) if hasattr(stmt.data, 'closing_balance') else 0,
                transacties=transacties,
                statement_datum=stmt.data.closing_balance.date if hasattr(stmt.data, 'closing_balance') else date.today(),
                volgnummer=stmt.data.sequence_number if hasattr(stmt.data, 'sequence_number') else ""
            )
            result.append(statement)
        
        return result
        
    except Exception as e:
        # Fallback naar handmatige parsing
        return parse_mt940_manual(content)


def parse_mt940_manual(content: bytes) -> List[MT940Statement]:
    """
    Fallback handmatige MT940 parser voor non-standard formaten
    """
    try:
        content_str = content.decode('utf-8')
    except:
        content_str = content.decode('latin-1')
    
    statements = []
    current_statement = None
    current_transactions = []
    
    lines = content_str.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Begin nieuw statement
        if line.startswith(':20:'):
            if current_statement:
                current_statement.transacties = current_transactions
                statements.append(current_statement)
            current_statement = MT940Statement(
                rekeningnummer="",
                valuta="SRD",
                beginsaldo=0,
                eindsaldo=0,
                transacties=[],
                statement_datum=date.today(),
                volgnummer=line[4:]
            )
            current_transactions = []
        
        # Rekeningnummer
        elif line.startswith(':25:'):
            if current_statement:
                current_statement.rekeningnummer = line[4:]
        
        # Beginsaldo
        elif line.startswith(':60F:') or line.startswith(':60M:'):
            if current_statement:
                saldo_data = line[5:]
                try:
                    # Format: C/D YYMMDD EUR bedrag
                    sign = 1 if saldo_data[0] == 'C' else -1
                    bedrag_str = saldo_data[10:].replace(',', '.')
                    current_statement.beginsaldo = sign * float(bedrag_str)
                    current_statement.valuta = saldo_data[7:10]
                except:
                    pass
        
        # Eindsaldo
        elif line.startswith(':62F:') or line.startswith(':62M:'):
            if current_statement:
                saldo_data = line[5:]
                try:
                    sign = 1 if saldo_data[0] == 'C' else -1
                    bedrag_str = saldo_data[10:].replace(',', '.')
                    current_statement.eindsaldo = sign * float(bedrag_str)
                except:
                    pass
        
        # Transactie
        elif line.startswith(':61:'):
            tx_data = line[4:]
            omschrijving = ""
            
            # Kijk naar volgende regel voor omschrijving
            if i + 1 < len(lines) and lines[i + 1].strip().startswith(':86:'):
                i += 1
                omschrijving = lines[i].strip()[4:]
                # Verzamel meerdere regels
                while i + 1 < len(lines) and not lines[i + 1].strip().startswith(':'):
                    i += 1
                    omschrijving += " " + lines[i].strip()
            
            try:
                # Parse transactie: YYMMDD[YYMMDD]C/D bedrag N...
                datum_str = tx_data[:6]
                datum = datetime.strptime(f"20{datum_str}", "%Y%m%d").date()
                
                # Vind C/D indicator
                cd_pos = 6
                if len(tx_data) > 12 and tx_data[6:12].isdigit():
                    cd_pos = 12  # Valutadatum aanwezig
                
                sign = 1 if tx_data[cd_pos] == 'C' else -1
                
                # Parse bedrag
                bedrag_match = re.search(r'[CD](\d+[,.]?\d*)', tx_data[cd_pos:])
                bedrag = 0
                if bedrag_match:
                    bedrag = sign * float(bedrag_match.group(1).replace(',', '.'))
                
                # Parse tegenrekening uit omschrijving
                tegenrekening = None
                tegenpartij = None
                iban_match = re.search(r'([A-Z]{2}\d{2}[A-Z0-9]{4,30})', omschrijving)
                if iban_match:
                    tegenrekening = iban_match.group(1)
                
                naam_match = re.search(r'(?:NAME:|NAAM:)\s*([^/]+)', omschrijving, re.IGNORECASE)
                if naam_match:
                    tegenpartij = naam_match.group(1).strip()
                
                transactie = MT940Transaction(
                    datum=datum,
                    valutadatum=None,
                    bedrag=bedrag,
                    omschrijving=omschrijving.strip(),
                    tegenrekening=tegenrekening,
                    tegenpartij=tegenpartij,
                    referentie=None,
                    boekcode=None,
                    raw_data=tx_data
                )
                current_transactions.append(transactie)
            except Exception as e:
                pass
        
        i += 1
    
    # Laatste statement toevoegen
    if current_statement:
        current_statement.transacties = current_transactions
        statements.append(current_statement)
    
    return statements


def suggest_reconciliation(
    transactie: MT940Transaction,
    openstaande_facturen: List[Dict],
    tolerantie: float = 0.01
) -> List[Dict[str, Any]]:
    """
    Suggereer mogelijke reconciliaties voor een banktransactie
    
    Args:
        transactie: De banktransactie
        openstaande_facturen: Lijst van openstaande facturen
        tolerantie: Bedrag tolerantie voor matching
        
    Returns:
        Lijst van mogelijke matches met confidence score
    """
    suggestions = []
    
    for factuur in openstaande_facturen:
        confidence = 0
        match_details = []
        
        factuur_bedrag = factuur.get('openstaand_bedrag', 0)
        tx_bedrag = abs(transactie.bedrag)
        
        # Bedrag matching (0-50 punten)
        if abs(factuur_bedrag - tx_bedrag) <= tolerantie:
            confidence += 50
            match_details.append("Exact bedrag match")
        elif abs(factuur_bedrag - tx_bedrag) <= factuur_bedrag * 0.01:  # 1% tolerantie
            confidence += 40
            match_details.append("Bedrag binnen 1%")
        elif abs(factuur_bedrag - tx_bedrag) <= factuur_bedrag * 0.05:  # 5% tolerantie
            confidence += 20
            match_details.append("Bedrag binnen 5%")
        
        # Factuurnummer in omschrijving (0-30 punten)
        factuurnummer = factuur.get('factuurnummer', '') or factuur.get('intern_nummer', '')
        if factuurnummer and factuurnummer.lower() in transactie.omschrijving.lower():
            confidence += 30
            match_details.append(f"Factuurnummer '{factuurnummer}' gevonden")
        
        # Klantnaam/leveranciersnaam matching (0-20 punten)
        naam = factuur.get('debiteur_naam') or factuur.get('crediteur_naam', '')
        if naam:
            naam_lower = naam.lower()
            if transactie.tegenpartij and naam_lower in transactie.tegenpartij.lower():
                confidence += 20
                match_details.append(f"Naam '{naam}' match in tegenpartij")
            elif naam_lower in transactie.omschrijving.lower():
                confidence += 15
                match_details.append(f"Naam '{naam}' gevonden in omschrijving")
        
        # Alleen suggesties met minimaal 30% confidence
        if confidence >= 30:
            suggestions.append({
                "factuur_id": factuur.get('id'),
                "factuurnummer": factuurnummer,
                "factuur_bedrag": factuur_bedrag,
                "transactie_bedrag": tx_bedrag,
                "confidence": min(confidence, 100),
                "match_details": match_details,
                "type": factuur.get('type', 'verkoop')
            })
    
    # Sorteer op confidence
    suggestions.sort(key=lambda x: x['confidence'], reverse=True)
    
    return suggestions[:5]  # Top 5 suggesties
