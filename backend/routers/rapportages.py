"""
Rapportages Module - Overzichten en rapportages uit alle geïntegreerde modules
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from .deps import db, get_current_active_user

router = APIRouter(prefix="/rapportages", tags=["Rapportages"])


@router.get("/grootboek/balans")
async def get_balans_rapport(
    datum: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Balans overzicht - Activa en Passiva
    """
    user_id = current_user["id"]
    
    # Haal alle rekeningen op
    rekeningen = await db.boekhouding_rekeningen.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(500)
    
    activa = []
    passiva = []
    totaal_activa = 0
    totaal_passiva = 0
    
    for rek in rekeningen:
        saldo = rek.get("saldo", 0)
        item = {
            "code": rek.get("code"),
            "naam": rek.get("naam"),
            "saldo": saldo
        }
        
        if rek.get("type") == "activa":
            activa.append(item)
            totaal_activa += saldo
        elif rek.get("type") in ["passiva", "eigen_vermogen"]:
            passiva.append(item)
            totaal_passiva += saldo
    
    return {
        "datum": datum or datetime.now().strftime("%Y-%m-%d"),
        "activa": sorted(activa, key=lambda x: x["code"]),
        "passiva": sorted(passiva, key=lambda x: x["code"]),
        "totaal_activa": totaal_activa,
        "totaal_passiva": totaal_passiva,
        "balans_verschil": totaal_activa - totaal_passiva
    }


@router.get("/grootboek/resultaat")
async def get_resultaat_rapport(
    jaar: Optional[int] = None,
    maand: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Winst & Verlies Rekening
    """
    user_id = current_user["id"]
    
    # Haal alle rekeningen op
    rekeningen = await db.boekhouding_rekeningen.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(500)
    
    opbrengsten = []
    kosten = []
    totaal_opbrengsten = 0
    totaal_kosten = 0
    
    for rek in rekeningen:
        saldo = rek.get("saldo", 0)
        item = {
            "code": rek.get("code"),
            "naam": rek.get("naam"),
            "bedrag": abs(saldo)
        }
        
        if rek.get("type") == "opbrengsten":
            opbrengsten.append(item)
            totaal_opbrengsten += abs(saldo)
        elif rek.get("type") == "kosten":
            kosten.append(item)
            totaal_kosten += abs(saldo)
    
    return {
        "periode": f"{jaar or datetime.now().year}-{maand or 'Jaar'}",
        "opbrengsten": sorted(opbrengsten, key=lambda x: x["code"]),
        "kosten": sorted(kosten, key=lambda x: x["code"]),
        "totaal_opbrengsten": totaal_opbrengsten,
        "totaal_kosten": totaal_kosten,
        "resultaat": totaal_opbrengsten - totaal_kosten
    }


@router.get("/grootboek/journaalposten")
async def get_journaalposten_rapport(
    van_datum: Optional[str] = None,
    tot_datum: Optional[str] = None,
    referentie_type: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Journaalposten overzicht
    """
    user_id = current_user["id"]
    
    filter_query = {"user_id": user_id}
    
    if van_datum:
        filter_query["datum"] = {"$gte": van_datum}
    if tot_datum:
        if "datum" not in filter_query:
            filter_query["datum"] = {}
        filter_query["datum"]["$lte"] = tot_datum
    if referentie_type:
        filter_query["referentie_type"] = referentie_type
    
    posten = await db.boekhouding_journaalposten.find(
        filter_query,
        {"_id": 0}
    ).sort("datum", -1).limit(limit).to_list(limit)
    
    return posten


@router.get("/debiteuren/openstaand")
async def get_openstaande_debiteuren(
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Openstaande vorderingen per debiteur
    """
    user_id = current_user["id"]
    
    facturen = await db.boekhouding_verkoopfacturen.find(
        {
            "user_id": user_id,
            "status": {"$in": ["verstuurd", "gedeeltelijk_betaald", "vervallen"]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    per_debiteur = {}
    totaal = 0
    
    for f in facturen:
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        if openstaand > 0:
            deb_id = f.get("debiteur_id")
            deb_naam = f.get("debiteur_naam", "Onbekend")
            
            if deb_id not in per_debiteur:
                per_debiteur[deb_id] = {
                    "naam": deb_naam,
                    "facturen": [],
                    "totaal_openstaand": 0
                }
            
            per_debiteur[deb_id]["facturen"].append({
                "factuurnummer": f.get("factuurnummer"),
                "factuurdatum": f.get("factuurdatum"),
                "vervaldatum": f.get("vervaldatum"),
                "totaal": f.get("totaal"),
                "betaald": f.get("betaald_bedrag", 0),
                "openstaand": openstaand,
                "status": f.get("status")
            })
            per_debiteur[deb_id]["totaal_openstaand"] += openstaand
            totaal += openstaand
    
    return {
        "per_debiteur": list(per_debiteur.values()),
        "totaal_openstaand": totaal,
        "aantal_debiteuren": len(per_debiteur)
    }


@router.get("/crediteuren/openstaand")
async def get_openstaande_crediteuren(
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Openstaande schulden per crediteur
    """
    user_id = current_user["id"]
    
    facturen = await db.boekhouding_inkoopfacturen.find(
        {
            "user_id": user_id,
            "status": {"$in": ["ontvangen", "gedeeltelijk_betaald", "vervallen"]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    per_crediteur = {}
    totaal = 0
    
    for f in facturen:
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        if openstaand > 0:
            cred_id = f.get("crediteur_id")
            cred_naam = f.get("crediteur_naam", "Onbekend")
            
            if cred_id not in per_crediteur:
                per_crediteur[cred_id] = {
                    "naam": cred_naam,
                    "facturen": [],
                    "totaal_openstaand": 0
                }
            
            per_crediteur[cred_id]["facturen"].append({
                "factuurnummer": f.get("factuurnummer"),
                "factuurnummer_leverancier": f.get("factuurnummer_leverancier"),
                "factuurdatum": f.get("factuurdatum"),
                "vervaldatum": f.get("vervaldatum"),
                "totaal": f.get("totaal"),
                "betaald": f.get("betaald_bedrag", 0),
                "openstaand": openstaand,
                "status": f.get("status")
            })
            per_crediteur[cred_id]["totaal_openstaand"] += openstaand
            totaal += openstaand
    
    return {
        "per_crediteur": list(per_crediteur.values()),
        "totaal_openstaand": totaal,
        "aantal_crediteuren": len(per_crediteur)
    }


@router.get("/voorraad/waarde")
async def get_voorraad_waarde_rapport(
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Voorraadwaarde overzicht
    """
    user_id = current_user["id"]
    
    artikelen = await db.voorraad_artikelen.find(
        {"user_id": user_id, "voorraad_beheer": True},
        {"_id": 0}
    ).to_list(1000)
    
    items = []
    totaal_waarde = 0
    totaal_artikelen = 0
    
    for a in artikelen:
        aantal = a.get("voorraad_aantal", 0)
        kostprijs = a.get("gemiddelde_kostprijs", 0) or a.get("inkoopprijs", 0)
        waarde = aantal * kostprijs
        
        items.append({
            "artikelcode": a.get("artikelcode"),
            "naam": a.get("naam"),
            "aantal": aantal,
            "eenheid": a.get("eenheid", "stuk"),
            "kostprijs": kostprijs,
            "waarde": waarde,
            "min_voorraad": a.get("min_voorraad", 0),
            "is_onder_minimum": aantal < a.get("min_voorraad", 0)
        })
        
        totaal_waarde += waarde
        totaal_artikelen += 1
    
    return {
        "artikelen": sorted(items, key=lambda x: x["waarde"], reverse=True),
        "totaal_waarde": totaal_waarde,
        "totaal_artikelen": totaal_artikelen,
        "onder_minimum": len([i for i in items if i["is_onder_minimum"]])
    }


@router.get("/projecten/overzicht")
async def get_projecten_overzicht_rapport(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Projecten overzicht met uren en kosten
    """
    user_id = current_user["id"]
    
    filter_query = {"user_id": user_id}
    if status:
        filter_query["status"] = status
    
    projecten = await db.projecten.find(filter_query, {"_id": 0}).to_list(500)
    
    result = []
    totaal_uren = 0
    totaal_kosten = 0
    
    for p in projecten:
        project_id = p.get("id")
        
        # Haal uren op
        uren = await db.project_uren.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
        totaal_project_uren = sum(u.get("uren", 0) for u in uren)
        factureerbare_uren = sum(u.get("uren", 0) for u in uren if u.get("factureerbaar"))
        
        # Bereken kosten
        uurtarief = p.get("uurtarief", 0)
        kosten = totaal_project_uren * uurtarief
        
        # Budget verbruik
        budget = p.get("budget", 0)
        budget_verbruik = (kosten / budget * 100) if budget > 0 else 0
        
        result.append({
            "code": p.get("code"),
            "naam": p.get("naam"),
            "status": p.get("status"),
            "startdatum": p.get("startdatum"),
            "einddatum": p.get("einddatum"),
            "totaal_uren": totaal_project_uren,
            "factureerbare_uren": factureerbare_uren,
            "uurtarief": uurtarief,
            "kosten": kosten,
            "budget": budget,
            "budget_verbruik": round(budget_verbruik, 1)
        })
        
        totaal_uren += totaal_project_uren
        totaal_kosten += kosten
    
    return {
        "projecten": result,
        "totaal_uren": totaal_uren,
        "totaal_kosten": totaal_kosten,
        "aantal_projecten": len(result)
    }


@router.get("/btw/aangifte")
async def get_btw_aangifte(
    jaar: int,
    kwartaal: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    BTW Aangifte overzicht
    """
    user_id = current_user["id"]
    
    # Bepaal periode
    if kwartaal:
        start_maand = (kwartaal - 1) * 3 + 1
        eind_maand = kwartaal * 3
    else:
        start_maand = 1
        eind_maand = 12
    
    start_datum = f"{jaar}-{start_maand:02d}-01"
    eind_datum = f"{jaar}-{eind_maand:02d}-31"
    
    # Verkoop BTW (af te dragen)
    verkoopfacturen = await db.boekhouding_verkoopfacturen.find(
        {
            "user_id": user_id,
            "factuurdatum": {"$gte": start_datum, "$lte": eind_datum},
            "status": {"$ne": "concept"}
        },
        {"_id": 0}
    ).to_list(1000)
    
    omzet_totaal = sum(f.get("subtotaal", 0) for f in verkoopfacturen)
    btw_verkoop = sum(f.get("btw_bedrag", 0) for f in verkoopfacturen)
    
    # Inkoop BTW (voorbelasting)
    inkoopfacturen = await db.boekhouding_inkoopfacturen.find(
        {
            "user_id": user_id,
            "factuurdatum": {"$gte": start_datum, "$lte": eind_datum}
        },
        {"_id": 0}
    ).to_list(1000)
    
    inkoop_totaal = sum(f.get("subtotaal", 0) for f in inkoopfacturen)
    btw_inkoop = sum(f.get("btw_bedrag", 0) for f in inkoopfacturen)
    
    return {
        "periode": f"{jaar} Q{kwartaal}" if kwartaal else str(jaar),
        "omzet_totaal": omzet_totaal,
        "btw_verkoop": btw_verkoop,
        "inkoop_totaal": inkoop_totaal,
        "btw_voorbelasting": btw_inkoop,
        "btw_af_te_dragen": btw_verkoop - btw_inkoop,
        "aantal_verkoopfacturen": len(verkoopfacturen),
        "aantal_inkoopfacturen": len(inkoopfacturen)
    }


# ==================== MULTI-VALUTA RAPPORTAGES ====================

@router.get("/valuta/overzicht")
async def get_valuta_overzicht(
    jaar: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Multi-valuta overzicht - Alle transacties per valuta met SRD equivalenten
    """
    user_id = current_user["id"]
    jaar = jaar or datetime.now().year
    start_datum = f"{jaar}-01-01"
    eind_datum = f"{jaar}-12-31"
    
    # Haal alle facturen op
    verkoop = await db.boekhouding_verkoopfacturen.find(
        {"user_id": user_id, "factuurdatum": {"$gte": start_datum, "$lte": eind_datum}, "status": {"$ne": "concept"}},
        {"_id": 0, "valuta": 1, "totaal": 1, "srd_equivalent": 1}
    ).to_list(1000)
    
    inkoop = await db.boekhouding_inkoopfacturen.find(
        {"user_id": user_id, "factuurdatum": {"$gte": start_datum, "$lte": eind_datum}},
        {"_id": 0, "valuta": 1, "totaal": 1, "srd_equivalent": 1}
    ).to_list(1000)
    
    # Groepeer per valuta
    valuta_stats = {}
    
    for f in verkoop:
        valuta = f.get("valuta", "SRD")
        if valuta not in valuta_stats:
            valuta_stats[valuta] = {
                "valuta": valuta,
                "verkoop_origineel": 0,
                "verkoop_srd": 0,
                "verkoop_aantal": 0,
                "inkoop_origineel": 0,
                "inkoop_srd": 0,
                "inkoop_aantal": 0
            }
        valuta_stats[valuta]["verkoop_origineel"] += f.get("totaal", 0)
        valuta_stats[valuta]["verkoop_srd"] += f.get("srd_equivalent") or f.get("totaal", 0)
        valuta_stats[valuta]["verkoop_aantal"] += 1
    
    for f in inkoop:
        valuta = f.get("valuta", "SRD")
        if valuta not in valuta_stats:
            valuta_stats[valuta] = {
                "valuta": valuta,
                "verkoop_origineel": 0,
                "verkoop_srd": 0,
                "verkoop_aantal": 0,
                "inkoop_origineel": 0,
                "inkoop_srd": 0,
                "inkoop_aantal": 0
            }
        valuta_stats[valuta]["inkoop_origineel"] += f.get("totaal", 0)
        valuta_stats[valuta]["inkoop_srd"] += f.get("srd_equivalent") or f.get("totaal", 0)
        valuta_stats[valuta]["inkoop_aantal"] += 1
    
    # Bereken totalen
    totaal_verkoop_srd = sum(v["verkoop_srd"] for v in valuta_stats.values())
    totaal_inkoop_srd = sum(v["inkoop_srd"] for v in valuta_stats.values())
    
    # Haal huidige wisselkoersen op
    koersen = await db.wisselkoersen.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("datum", -1).to_list(10)
    
    koersen_dict = {}
    for k in koersen:
        if k["valuta"] not in koersen_dict:
            koersen_dict[k["valuta"]] = k["koers"]
    
    return {
        "jaar": jaar,
        "per_valuta": list(valuta_stats.values()),
        "totalen": {
            "verkoop_srd": round(totaal_verkoop_srd, 2),
            "inkoop_srd": round(totaal_inkoop_srd, 2),
            "saldo_srd": round(totaal_verkoop_srd - totaal_inkoop_srd, 2)
        },
        "huidige_koersen": koersen_dict
    }


@router.get("/valuta/exposure")
async def get_valuta_exposure(
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Valuta exposure rapport - Openstaande posities in vreemde valuta
    """
    user_id = current_user["id"]
    
    # Openstaande verkoopfacturen per valuta
    verkoop_open = await db.boekhouding_verkoopfacturen.find(
        {"user_id": user_id, "status": {"$nin": ["betaald", "concept"]}},
        {"_id": 0, "factuurnummer": 1, "valuta": 1, "totaal": 1, "betaald_bedrag": 1, "debiteur_naam": 1}
    ).to_list(500)
    
    # Openstaande inkoopfacturen per valuta
    inkoop_open = await db.boekhouding_inkoopfacturen.find(
        {"user_id": user_id, "status": {"$ne": "betaald"}},
        {"_id": 0, "factuurnummer": 1, "valuta": 1, "totaal": 1, "betaald_bedrag": 1, "crediteur_naam": 1}
    ).to_list(500)
    
    # Groepeer per valuta
    exposure = {}
    
    for f in verkoop_open:
        valuta = f.get("valuta", "SRD")
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        if openstaand <= 0:
            continue
        if valuta not in exposure:
            exposure[valuta] = {"valuta": valuta, "te_ontvangen": 0, "te_betalen": 0, "netto": 0, "details_te_ontvangen": [], "details_te_betalen": []}
        exposure[valuta]["te_ontvangen"] += openstaand
        exposure[valuta]["details_te_ontvangen"].append({
            "factuurnummer": f.get("factuurnummer"),
            "relatie": f.get("debiteur_naam"),
            "bedrag": openstaand
        })
    
    for f in inkoop_open:
        valuta = f.get("valuta", "SRD")
        openstaand = f.get("totaal", 0) - f.get("betaald_bedrag", 0)
        if openstaand <= 0:
            continue
        if valuta not in exposure:
            exposure[valuta] = {"valuta": valuta, "te_ontvangen": 0, "te_betalen": 0, "netto": 0, "details_te_ontvangen": [], "details_te_betalen": []}
        exposure[valuta]["te_betalen"] += openstaand
        exposure[valuta]["details_te_betalen"].append({
            "factuurnummer": f.get("factuurnummer"),
            "relatie": f.get("crediteur_naam"),
            "bedrag": openstaand
        })
    
    # Bereken netto exposure en converteer naar SRD
    koersen = await db.wisselkoersen.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("datum", -1).to_list(10)
    
    koersen_dict = {"SRD": 1.0, "USD": 36.50, "EUR": 39.00}  # Fallback koersen
    for k in koersen:
        if k["valuta"] not in koersen_dict:
            koersen_dict[k["valuta"]] = k["koers"]
    
    totaal_exposure_srd = 0
    for valuta, data in exposure.items():
        data["netto"] = round(data["te_ontvangen"] - data["te_betalen"], 2)
        data["te_ontvangen"] = round(data["te_ontvangen"], 2)
        data["te_betalen"] = round(data["te_betalen"], 2)
        koers = koersen_dict.get(valuta, 1.0)
        data["netto_srd"] = round(data["netto"] * koers, 2)
        totaal_exposure_srd += data["netto_srd"]
    
    return {
        "datum": datetime.now().strftime("%Y-%m-%d"),
        "per_valuta": list(exposure.values()),
        "totaal_netto_exposure_srd": round(totaal_exposure_srd, 2),
        "koersen_gebruikt": koersen_dict
    }


@router.get("/valuta/koershistorie")
async def get_koers_historie(
    valuta: str = "USD",
    dagen: int = 30,
    current_user: dict = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Wisselkoers historie voor een specifieke valuta
    """
    user_id = current_user["id"]
    start_datum = (datetime.now() - timedelta(days=dagen)).strftime("%Y-%m-%d")
    
    koersen = await db.wisselkoersen.find(
        {"user_id": user_id, "valuta": valuta, "datum": {"$gte": start_datum}},
        {"_id": 0}
    ).sort("datum", 1).to_list(dagen)
    
    if not koersen:
        # Geen data, return placeholder
        return {
            "valuta": valuta,
            "periode_dagen": dagen,
            "data": [],
            "gemiddelde": None,
            "minimum": None,
            "maximum": None,
            "trend": "geen_data"
        }
    
    koers_values = [k["koers"] for k in koersen]
    
    # Bereken trend
    if len(koers_values) >= 2:
        eerste = koers_values[0]
        laatste = koers_values[-1]
        verschil_perc = ((laatste - eerste) / eerste) * 100
        if verschil_perc > 1:
            trend = "stijgend"
        elif verschil_perc < -1:
            trend = "dalend"
        else:
            trend = "stabiel"
    else:
        trend = "onvoldoende_data"
    
    return {
        "valuta": valuta,
        "periode_dagen": dagen,
        "data": koersen,
        "gemiddelde": round(sum(koers_values) / len(koers_values), 4),
        "minimum": min(koers_values),
        "maximum": max(koers_values),
        "laatste_koers": koers_values[-1] if koers_values else None,
        "trend": trend
    }

