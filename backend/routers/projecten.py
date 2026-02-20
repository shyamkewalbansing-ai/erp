"""
Projecten Module - Project management met koppeling naar andere modules
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
from .deps import db, get_current_active_user, clean_doc

router = APIRouter(prefix="/projecten", tags=["Projecten"])

# ==================== ENUMS ====================

class Currency(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class ProjectStatus(str, Enum):
    CONCEPT = "concept"
    ACTIEF = "actief"
    IN_WACHT = "in_wacht"
    AFGEROND = "afgerond"
    GEANNULEERD = "geannuleerd"

class ProjectType(str, Enum):
    INTERN = "intern"
    KLANT = "klant"
    ONDERHOUD = "onderhoud"

# ==================== MODELS ====================

class ProjectCreate(BaseModel):
    naam: str
    code: str
    omschrijving: Optional[str] = None
    type: ProjectType = ProjectType.KLANT
    klant_id: Optional[str] = None
    verantwoordelijke_id: Optional[str] = None
    startdatum: Optional[str] = None
    einddatum: Optional[str] = None
    budget: Optional[float] = None
    budget_valuta: Currency = Currency.SRD
    uurtarief: Optional[float] = None
    kostenplaats_id: Optional[str] = None
    tags: Optional[List[str]] = None
    notities: Optional[str] = None

class ProjectUpdate(BaseModel):
    naam: Optional[str] = None
    omschrijving: Optional[str] = None
    verantwoordelijke_id: Optional[str] = None
    startdatum: Optional[str] = None
    einddatum: Optional[str] = None
    budget: Optional[float] = None
    uurtarief: Optional[float] = None
    kostenplaats_id: Optional[str] = None
    tags: Optional[List[str]] = None
    notities: Optional[str] = None
    status: Optional[ProjectStatus] = None

class ProjectTaakCreate(BaseModel):
    naam: str
    omschrijving: Optional[str] = None
    toegewezen_aan: Optional[str] = None  # HRM employee_id
    deadline: Optional[str] = None
    geschatte_uren: Optional[float] = None
    prioriteit: str = "normaal"  # laag, normaal, hoog, urgent

class ProjectUrenCreate(BaseModel):
    medewerker_id: str  # HRM employee_id
    datum: str
    uren: float
    omschrijving: Optional[str] = None
    taak_id: Optional[str] = None
    factureerbaar: bool = True

class ProjectKostenCreate(BaseModel):
    datum: str
    omschrijving: str
    bedrag: float
    valuta: Currency = Currency.SRD
    categorie: Optional[str] = None
    factuur_id: Optional[str] = None
    leverancier_id: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

async def genereer_project_nummer(user_id: str) -> str:
    year = datetime.now().year
    count = await db.projecten.count_documents({
        "user_id": user_id,
        "project_nummer": {"$regex": f"^PRJ{year}-"}
    })
    return f"PRJ{year}-{str(count + 1).zfill(4)}"

# ==================== PROJECTEN ENDPOINTS ====================

@router.get("/")
async def get_projecten(
    status: Optional[str] = None,
    type: Optional[str] = None,
    klant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Haal alle projecten op"""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    if klant_id:
        query["klant_id"] = klant_id
    
    projecten = await db.projecten.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Bereken voortgang per project
    for project in projecten:
        # Gewerkte uren
        uren = await db.project_uren.aggregate([
            {"$match": {"project_id": project["id"]}},
            {"$group": {"_id": None, "totaal": {"$sum": "$uren"}}}
        ]).to_list(1)
        project["gewerkte_uren"] = uren[0]["totaal"] if uren else 0
        
        # Kosten
        kosten = await db.project_kosten.aggregate([
            {"$match": {"project_id": project["id"]}},
            {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
        ]).to_list(1)
        project["totale_kosten"] = kosten[0]["totaal"] if kosten else 0
        
        # Budget verbruik
        if project.get("budget") and project["budget"] > 0:
            project["budget_verbruik"] = round((project["totale_kosten"] / project["budget"]) * 100, 1)
        else:
            project["budget_verbruik"] = 0
    
    return projecten

@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal een specifiek project op met details"""
    user_id = current_user["id"]
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    # Haal taken
    taken = await db.project_taken.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    project["taken"] = taken
    
    # Haal uren
    uren = await db.project_uren.find({"project_id": project_id}, {"_id": 0}).sort("datum", -1).to_list(100)
    project["uren"] = uren
    
    # Haal kosten
    kosten = await db.project_kosten.find({"project_id": project_id}, {"_id": 0}).sort("datum", -1).to_list(100)
    project["kosten"] = kosten
    
    # Bereken totalen
    project["totale_uren"] = sum(u.get("uren", 0) for u in uren)
    project["factureerbare_uren"] = sum(u.get("uren", 0) for u in uren if u.get("factureerbaar"))
    project["totale_kosten"] = sum(k.get("bedrag", 0) for k in kosten)
    
    # Bereken uren waarde
    if project.get("uurtarief"):
        project["uren_waarde"] = project["factureerbare_uren"] * project["uurtarief"]
    
    return project

@router.post("/")
async def create_project(data: ProjectCreate, current_user: dict = Depends(get_current_active_user)):
    """Maak een nieuw project aan"""
    user_id = current_user["id"]
    
    # Check of code al bestaat
    existing = await db.projecten.find_one({"user_id": user_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Projectcode bestaat al")
    
    project_id = str(uuid.uuid4())
    project_nummer = await genereer_project_nummer(user_id)
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "id": project_id,
        "user_id": user_id,
        "project_nummer": project_nummer,
        **data.model_dump(),
        "type": data.type.value,
        "budget_valuta": data.budget_valuta.value,
        "status": "concept",
        "created_at": now,
        "updated_at": now
    }
    
    await db.projecten.insert_one(project_doc)
    project_doc.pop("_id", None)
    return project_doc

@router.put("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update een project"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    update_data = {k: v.value if hasattr(v, 'value') else v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projecten.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projecten.find_one({"id": project_id}, {"_id": 0})
    return updated

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_active_user)):
    """Verwijder een project"""
    user_id = current_user["id"]
    
    # Check voor gekoppelde items
    uren_count = await db.project_uren.count_documents({"project_id": project_id})
    kosten_count = await db.project_kosten.count_documents({"project_id": project_id})
    
    if uren_count > 0 or kosten_count > 0:
        await db.projecten.update_one(
            {"id": project_id, "user_id": user_id},
            {"$set": {"status": "geannuleerd", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Project geannuleerd (er zijn gekoppelde uren/kosten)"}
    
    result = await db.projecten.delete_one({"id": project_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    # Verwijder taken
    await db.project_taken.delete_many({"project_id": project_id})
    
    return {"message": "Project verwijderd"}

# ==================== TAKEN ENDPOINTS ====================

@router.get("/{project_id}/taken")
async def get_project_taken(project_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal taken van een project op"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    taken = await db.project_taken.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    return taken

@router.post("/{project_id}/taken")
async def create_project_taak(
    project_id: str,
    data: ProjectTaakCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Voeg een taak toe aan een project"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    taak_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    taak_doc = {
        "id": taak_id,
        "project_id": project_id,
        **data.model_dump(),
        "status": "open",
        "gewerkte_uren": 0,
        "created_at": now
    }
    
    await db.project_taken.insert_one(taak_doc)
    taak_doc.pop("_id", None)
    return taak_doc

@router.put("/{project_id}/taken/{taak_id}")
async def update_project_taak(
    project_id: str,
    taak_id: str,
    status: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Update een taak status"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    result = await db.project_taken.update_one(
        {"id": taak_id, "project_id": project_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Taak niet gevonden")
    
    return {"message": "Taak bijgewerkt"}

@router.delete("/{project_id}/taken/{taak_id}")
async def delete_project_taak(
    project_id: str,
    taak_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Verwijder een taak"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    result = await db.project_taken.delete_one({"id": taak_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Taak niet gevonden")
    
    return {"message": "Taak verwijderd"}

# ==================== UREN ENDPOINTS ====================

@router.get("/{project_id}/uren")
async def get_project_uren(project_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal uren van een project op"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    uren = await db.project_uren.find({"project_id": project_id}, {"_id": 0}).sort("datum", -1).to_list(500)
    return uren

@router.post("/{project_id}/uren")
async def create_project_uren(
    project_id: str,
    data: ProjectUrenCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Registreer uren op een project"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    uren_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Haal medewerker naam als HRM gekoppeld is
    medewerker_naam = None
    medewerker = await db.hrm_employees.find_one({"id": data.medewerker_id})
    if medewerker:
        medewerker_naam = medewerker.get("name")
    
    uren_doc = {
        "id": uren_id,
        "project_id": project_id,
        "project_naam": project.get("naam"),
        **data.model_dump(),
        "medewerker_naam": medewerker_naam,
        "created_at": now
    }
    
    await db.project_uren.insert_one(uren_doc)
    uren_doc.pop("_id", None)
    
    # Update taak gewerkte uren als van toepassing
    if data.taak_id:
        await db.project_taken.update_one(
            {"id": data.taak_id},
            {"$inc": {"gewerkte_uren": data.uren}}
        )
    
    return uren_doc

@router.delete("/{project_id}/uren/{uren_id}")
async def delete_project_uren(
    project_id: str,
    uren_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Verwijder urenregistratie"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    uren = await db.project_uren.find_one({"id": uren_id, "project_id": project_id})
    if not uren:
        raise HTTPException(status_code=404, detail="Urenregistratie niet gevonden")
    
    # Update taak gewerkte uren terug als van toepassing
    if uren.get("taak_id"):
        await db.project_taken.update_one(
            {"id": uren["taak_id"]},
            {"$inc": {"gewerkte_uren": -uren.get("uren", 0)}}
        )
    
    await db.project_uren.delete_one({"id": uren_id})
    return {"message": "Urenregistratie verwijderd"}

# ==================== KOSTEN ENDPOINTS ====================

@router.get("/{project_id}/kosten")
async def get_project_kosten(project_id: str, current_user: dict = Depends(get_current_active_user)):
    """Haal kosten van een project op"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    kosten = await db.project_kosten.find({"project_id": project_id}, {"_id": 0}).sort("datum", -1).to_list(500)
    return kosten

@router.post("/{project_id}/kosten")
async def create_project_kosten(
    project_id: str,
    data: ProjectKostenCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Registreer kosten op een project"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    kosten_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    kosten_doc = {
        "id": kosten_id,
        "project_id": project_id,
        "project_naam": project.get("naam"),
        **data.model_dump(),
        "valuta": data.valuta.value,
        "created_at": now
    }
    
    await db.project_kosten.insert_one(kosten_doc)
    kosten_doc.pop("_id", None)
    return kosten_doc

@router.delete("/{project_id}/kosten/{kosten_id}")
async def delete_project_kosten(
    project_id: str,
    kosten_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Verwijder kostenregistratie"""
    user_id = current_user["id"]
    
    project = await db.projecten.find_one({"id": project_id, "user_id": user_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    result = await db.project_kosten.delete_one({"id": kosten_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kostenregistratie niet gevonden")
    
    return {"message": "Kostenregistratie verwijderd"}

# ==================== DASHBOARD ====================

@router.get("/dashboard/overzicht")
async def get_projecten_dashboard(current_user: dict = Depends(get_current_active_user)):
    """Haal projecten dashboard data op"""
    user_id = current_user["id"]
    
    # Actieve projecten
    actieve_projecten = await db.projecten.count_documents({"user_id": user_id, "status": "actief"})
    
    # Projecten per status
    per_status = await db.projecten.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$status", "aantal": {"$sum": 1}}}
    ]).to_list(10)
    
    # Totale uren deze maand
    now = datetime.now()
    start_of_month = now.replace(day=1).strftime("%Y-%m-%d")
    
    uren_maand = await db.project_uren.aggregate([
        {"$lookup": {
            "from": "projecten",
            "localField": "project_id",
            "foreignField": "id",
            "as": "project"
        }},
        {"$unwind": "$project"},
        {"$match": {
            "project.user_id": user_id,
            "datum": {"$gte": start_of_month}
        }},
        {"$group": {"_id": None, "totaal": {"$sum": "$uren"}}}
    ]).to_list(1)
    
    # Kosten deze maand
    kosten_maand = await db.project_kosten.aggregate([
        {"$lookup": {
            "from": "projecten",
            "localField": "project_id",
            "foreignField": "id",
            "as": "project"
        }},
        {"$unwind": "$project"},
        {"$match": {
            "project.user_id": user_id,
            "datum": {"$gte": start_of_month}
        }},
        {"$group": {"_id": None, "totaal": {"$sum": "$bedrag"}}}
    ]).to_list(1)
    
    # Top 5 projecten op uren
    top_projecten = await db.project_uren.aggregate([
        {"$lookup": {
            "from": "projecten",
            "localField": "project_id",
            "foreignField": "id",
            "as": "project"
        }},
        {"$unwind": "$project"},
        {"$match": {"project.user_id": user_id}},
        {"$group": {
            "_id": "$project_id",
            "naam": {"$first": "$project.naam"},
            "totaal_uren": {"$sum": "$uren"}
        }},
        {"$sort": {"totaal_uren": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    return {
        "actieve_projecten": actieve_projecten,
        "per_status": {item["_id"]: item["aantal"] for item in per_status},
        "uren_deze_maand": uren_maand[0]["totaal"] if uren_maand else 0,
        "kosten_deze_maand": kosten_maand[0]["totaal"] if kosten_maand else 0,
        "top_projecten": top_projecten
    }

# ==================== INSTELLINGEN ====================

@router.get("/instellingen")
async def get_project_instellingen(current_user: dict = Depends(get_current_active_user)):
    """Haal project instellingen op"""
    user_id = current_user["id"]
    
    instellingen = await db.project_instellingen.find_one({"user_id": user_id}, {"_id": 0})
    
    if not instellingen:
        # Return defaults
        return {
            "standaard_uurtarief": 50.0,
            "standaard_valuta": "SRD",
            "project_nummering_prefix": "PRJ",
            "automatisch_factureren": False
        }
    
    return instellingen

@router.put("/instellingen")
async def update_project_instellingen(
    standaard_uurtarief: Optional[float] = None,
    standaard_valuta: Optional[str] = None,
    automatisch_factureren: Optional[bool] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Update project instellingen"""
    user_id = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {"updated_at": now}
    if standaard_uurtarief is not None:
        update_data["standaard_uurtarief"] = standaard_uurtarief
    if standaard_valuta is not None:
        update_data["standaard_valuta"] = standaard_valuta
    if automatisch_factureren is not None:
        update_data["automatisch_factureren"] = automatisch_factureren
    
    await db.project_instellingen.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Instellingen bijgewerkt"}
