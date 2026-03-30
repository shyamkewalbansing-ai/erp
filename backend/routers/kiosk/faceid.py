from .base import *
import math

# ====== FACE ID ENDPOINTS ======

class FaceRegisterRequest(BaseModel):
    descriptor: List[float]
    label: str = "Beheerder"

class FaceVerifyRequest(BaseModel):
    descriptor: List[float]

# Helper: compute euclidean distance
def _face_distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

# Register face for company admin - supports MULTIPLE faces
@router.post("/public/{company_id}/face/register-admin")
async def register_admin_face(company_id: str, req: FaceRegisterRequest):
    company = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    new_entry = {
        "label": req.label or "Beheerder",
        "descriptor": req.descriptor,
        "registered_at": datetime.now(timezone.utc).isoformat()
    }
    # Migrate old single face_descriptor to new format if needed
    existing = company.get("face_descriptors", [])
    if not existing and company.get("face_descriptor"):
        existing = [{"label": "Beheerder", "descriptor": company["face_descriptor"], "registered_at": datetime.now(timezone.utc).isoformat()}]
    existing.append(new_entry)
    await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {"face_descriptors": existing, "face_id_enabled": True}, "$unset": {"face_descriptor": ""}}
    )
    return {"success": True, "message": "Face ID geregistreerd", "count": len(existing)}

# Verify face for company admin - checks ALL registered faces
@router.post("/public/{company_id}/face/verify-admin")
async def verify_admin_face(company_id: str, req: FaceVerifyRequest):
    company = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Geen Face ID geregistreerd")
    descriptors = company.get("face_descriptors", [])
    # Backwards compat: old single descriptor
    if not descriptors and company.get("face_descriptor"):
        descriptors = [{"label": "Beheerder", "descriptor": company["face_descriptor"]}]
    if not descriptors:
        raise HTTPException(status_code=404, detail="Geen Face ID geregistreerd")
    for entry in descriptors:
        distance = _face_distance(entry["descriptor"], req.descriptor)
        if distance < 0.6:
            token = jwt.encode({"company_id": company_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return {"success": True, "token": token, "distance": round(distance, 4), "matched_label": entry.get("label", "")}
    raise HTTPException(status_code=401, detail="Gezicht niet herkend")

# Check admin face status - returns count and labels
@router.get("/public/{company_id}/face/admin-status")
async def admin_face_status(company_id: str):
    company = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0, "company_id": 1, "face_id_enabled": 1, "face_descriptors": 1, "face_descriptor": 1})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    descriptors = company.get("face_descriptors", [])
    if not descriptors and company.get("face_descriptor"):
        descriptors = [{"label": "Beheerder", "descriptor": company["face_descriptor"]}]
    faces = [{"label": d.get("label", "Beheerder"), "registered_at": d.get("registered_at", "")} for d in descriptors]
    return {"enabled": len(descriptors) > 0, "count": len(descriptors), "faces": faces}

# Register face for tenant
@router.post("/public/{company_id}/tenant/{tenant_id}/face/register")
async def register_tenant_face(company_id: str, tenant_id: str, req: FaceRegisterRequest):
    tenant = await db.kiosk_tenants.find_one({"tenant_id": tenant_id, "company_id": company_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"face_descriptor": req.descriptor, "face_id_enabled": True}}
    )
    return {"success": True, "message": "Face ID geregistreerd voor huurder"}

# Verify tenant face - returns matching tenant
@router.post("/public/{company_id}/face/verify-tenant")
async def verify_tenant_face(company_id: str, req: FaceVerifyRequest):
    tenants = await db.kiosk_tenants.find(
        {"company_id": company_id, "face_id_enabled": True, "face_descriptor": {"$exists": True}, "status": "active"},
        {"_id": 0, "tenant_id": 1, "name": 1, "apartment_number": 1, "tenant_code": 1, "face_descriptor": 1,
         "outstanding_rent": 1, "service_costs": 1, "fines": 1, "monthly_rent": 1, "apartment_id": 1,
         "internet_cost": 1, "internet_outstanding": 1, "internet_plan_name": 1}
    ).to_list(500)
    best_match = None
    best_distance = 999
    for t in tenants:
        stored = t.get("face_descriptor", [])
        if not stored:
            continue
        distance = sum((a - b) ** 2 for a, b in zip(stored, req.descriptor)) ** 0.5
        if distance < best_distance:
            best_distance = distance
            best_match = t
    if best_match and best_distance < 0.6:
        best_match.pop("face_descriptor", None)
        return {**best_match, "distance": round(best_distance, 4)}
    raise HTTPException(status_code=401, detail="Gezicht niet herkend")

# Delete face for admin - by index, or all if no index given
@router.delete("/public/{company_id}/face/admin")
async def delete_admin_face(company_id: str, index: int = -1):
    if index >= 0:
        company = await db.kiosk_companies.find_one({"company_id": company_id}, {"_id": 0, "face_descriptors": 1, "face_descriptor": 1})
        descriptors = company.get("face_descriptors", []) if company else []
        if not descriptors and company and company.get("face_descriptor"):
            descriptors = [{"label": "Beheerder", "descriptor": company["face_descriptor"]}]
        if 0 <= index < len(descriptors):
            descriptors.pop(index)
        update = {"$set": {"face_descriptors": descriptors, "face_id_enabled": len(descriptors) > 0}, "$unset": {"face_descriptor": ""}}
        await db.kiosk_companies.update_one({"company_id": company_id}, update)
        return {"success": True, "remaining": len(descriptors)}
    else:
        await db.kiosk_companies.update_one(
            {"company_id": company_id},
            {"$set": {"face_id_enabled": False, "face_descriptors": []}, "$unset": {"face_descriptor": ""}}
        )
        return {"success": True, "remaining": 0}

# Delete face for tenant
@router.delete("/public/{company_id}/tenant/{tenant_id}/face")
async def delete_tenant_face(company_id: str, tenant_id: str):
    await db.kiosk_tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"face_id_enabled": False}, "$unset": {"face_descriptor": ""}}
    )
    return {"success": True}


# Global Face ID login - search across ALL companies (for /vastgoed login page)
@router.post("/public/face/verify-global")
async def verify_global_face(req: FaceVerifyRequest):
    companies = await db.kiosk_companies.find(
        {"face_id_enabled": True, "status": "active"},
        {"_id": 0, "company_id": 1, "name": 1, "face_descriptors": 1, "face_descriptor": 1}
    ).to_list(500)
    best_match = None
    best_distance = 999
    for c in companies:
        # Support both old and new format
        descriptors = c.get("face_descriptors", [])
        if not descriptors and c.get("face_descriptor"):
            descriptors = [{"descriptor": c["face_descriptor"]}]
        for entry in descriptors:
            stored = entry.get("descriptor", [])
            if not stored:
                continue
            distance = _face_distance(stored, req.descriptor)
            if distance < best_distance:
                best_distance = distance
                best_match = c
    if best_match and best_distance < 0.6:
        company_id = best_match["company_id"]
        token = jwt.encode({"company_id": company_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return {
            "success": True,
            "token": token,
            "company_id": company_id,
            "name": best_match.get("name", ""),
            "distance": round(best_distance, 4)
        }
    raise HTTPException(status_code=401, detail="Gezicht niet herkend")



