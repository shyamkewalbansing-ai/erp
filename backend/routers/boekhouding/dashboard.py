"""
Boekhouding Module - Dashboard Router
=====================================
Dashboard en grafiek endpoints.
"""

from fastapi import APIRouter, Header
from datetime import datetime, timezone
from routers.boekhouding.common import db, get_current_user, clean_doc

router = APIRouter(tags=["Boekhouding - Dashboard"])


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
