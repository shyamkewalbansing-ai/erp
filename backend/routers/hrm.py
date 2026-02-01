# HRM Router - Human Resource Management Module
# Refactored from server.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/hrm", tags=["HRM"])

# Import shared dependencies
from .deps import get_db, get_current_user, workspace_filter

# ==================== PYDANTIC MODELS ====================

class HRMEmployee(BaseModel):
    employee_id: Optional[str] = None
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[str] = None
    salary: Optional[float] = 0
    status: Optional[str] = "active"
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    bank_account: Optional[str] = None
    notes: Optional[str] = None

class HRMDepartment(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[str] = None

class HRMLeaveRequest(BaseModel):
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: Optional[str] = None
    status: Optional[str] = "pending"

class HRMContract(BaseModel):
    employee_id: str
    contract_type: str
    start_date: str
    end_date: Optional[str] = None
    salary: float
    terms: Optional[str] = None
    status: Optional[str] = "active"

class HRMVacancy(BaseModel):
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[str] = "open"
    deadline: Optional[str] = None

class HRMApplication(BaseModel):
    vacancy_id: str
    applicant_name: str
    email: str
    phone: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    status: Optional[str] = "new"

class HRMDocument(BaseModel):
    employee_id: Optional[str] = None
    title: str
    document_type: str
    file_url: Optional[str] = None
    notes: Optional[str] = None

class HRMAttendance(BaseModel):
    employee_id: str
    date: str
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    status: Optional[str] = "present"
    notes: Optional[str] = None

class HRMPayroll(BaseModel):
    employee_id: str
    period: str
    basic_salary: float
    allowances: Optional[float] = 0
    deductions: Optional[float] = 0
    net_salary: Optional[float] = None
    status: Optional[str] = "draft"
    notes: Optional[str] = None

class HRMSettings(BaseModel):
    work_hours_per_day: Optional[float] = 8
    work_days_per_week: Optional[int] = 5
    overtime_rate: Optional[float] = 1.5
    leave_days_per_year: Optional[int] = 20
    sick_days_per_year: Optional[int] = 10
    currency: Optional[str] = "SRD"


# ==================== EMPLOYEE ENDPOINTS ====================

@router.get("/employees")
async def get_hrm_employees(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    employees = await db.hrm_employees.find(
        workspace_filter(current_user)
    ).sort("last_name", 1).to_list(1000)
    for emp in employees:
        emp["id"] = str(emp.pop("_id"))
    return employees

@router.get("/employees/{employee_id}")
async def get_hrm_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    employee = await db.hrm_employees.find_one({
        "_id": ObjectId(employee_id),
        **workspace_filter(current_user)
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Medewerker niet gevonden")
    employee["id"] = str(employee.pop("_id"))
    return employee

@router.post("/employees")
async def create_hrm_employee(employee: HRMEmployee, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    employee_dict = employee.model_dump()
    employee_dict["workspace_id"] = current_user.get("workspace_id")
    employee_dict["user_id"] = str(current_user["_id"])
    employee_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Generate employee ID if not provided
    if not employee_dict.get("employee_id"):
        count = await db.hrm_employees.count_documents(workspace_filter(current_user))
        employee_dict["employee_id"] = f"EMP{str(count + 1).zfill(4)}"
    
    result = await db.hrm_employees.insert_one(employee_dict)
    employee_dict["id"] = str(result.inserted_id)
    if "_id" in employee_dict:
        del employee_dict["_id"]
    return employee_dict

@router.put("/employees/{employee_id}")
async def update_hrm_employee(employee_id: str, employee: HRMEmployee, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in employee.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hrm_employees.update_one(
        {"_id": ObjectId(employee_id), **workspace_filter(current_user)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medewerker niet gevonden")
    return {"message": "Medewerker bijgewerkt"}

@router.delete("/employees/{employee_id}")
async def delete_hrm_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_employees.delete_one({
        "_id": ObjectId(employee_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medewerker niet gevonden")
    return {"message": "Medewerker verwijderd"}


# ==================== DEPARTMENT ENDPOINTS ====================

@router.get("/departments")
async def get_hrm_departments(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    departments = await db.hrm_departments.find(
        workspace_filter(current_user)
    ).to_list(100)
    for dept in departments:
        dept["id"] = str(dept.pop("_id"))
    return departments

@router.post("/departments")
async def create_hrm_department(department: HRMDepartment, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    dept_dict = department.model_dump()
    dept_dict["workspace_id"] = current_user.get("workspace_id")
    dept_dict["user_id"] = str(current_user["_id"])
    dept_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.hrm_departments.insert_one(dept_dict)
    dept_dict.pop("_id", None)
    return {"id": str(result.inserted_id), **dept_dict}

@router.delete("/departments/{dept_id}")
async def delete_hrm_department(dept_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_departments.delete_one({
        "_id": ObjectId(dept_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Afdeling niet gevonden")
    return {"message": "Afdeling verwijderd"}


# ==================== LEAVE REQUEST ENDPOINTS ====================

@router.get("/leave-requests")
async def get_hrm_leave_requests(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    requests = await db.hrm_leave_requests.find(
        workspace_filter(current_user)
    ).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        req["id"] = str(req.pop("_id"))
        # Get employee name
        if req.get("employee_id"):
            try:
                emp = await db.hrm_employees.find_one({"_id": ObjectId(req["employee_id"])})
                if emp:
                    req["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
            except Exception:
                pass
    return requests

@router.post("/leave-requests")
async def create_hrm_leave_request(request: HRMLeaveRequest, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    req_dict = request.model_dump()
    req_dict["workspace_id"] = current_user.get("workspace_id")
    req_dict["user_id"] = str(current_user["_id"])
    req_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    req_dict["status"] = "pending"
    
    # Get employee name
    try:
        emp = await db.hrm_employees.find_one({"_id": ObjectId(request.employee_id)})
        if emp:
            req_dict["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
    except Exception:
        pass
    
    result = await db.hrm_leave_requests.insert_one(req_dict)
    req_dict["id"] = str(result.inserted_id)
    return req_dict

@router.put("/leave-requests/{request_id}/status")
async def update_hrm_leave_request(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Ongeldige status")
    
    result = await db.hrm_leave_requests.update_one(
        {"_id": ObjectId(request_id), **workspace_filter(current_user)},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": str(current_user["_id"])
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Verlofaanvraag niet gevonden")
    return {"message": f"Status gewijzigd naar {status}"}

@router.delete("/leave-requests/{request_id}")
async def delete_hrm_leave_request(request_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_leave_requests.delete_one({
        "_id": ObjectId(request_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verlofaanvraag niet gevonden")
    return {"message": "Verlofaanvraag verwijderd"}


# ==================== CONTRACT ENDPOINTS ====================

@router.get("/contracts")
async def get_hrm_contracts(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    contracts = await db.hrm_contracts.find(
        workspace_filter(current_user)
    ).sort("created_at", -1).to_list(1000)
    
    for contract in contracts:
        contract["id"] = str(contract.pop("_id"))
        if contract.get("employee_id"):
            try:
                emp = await db.hrm_employees.find_one({"_id": ObjectId(contract["employee_id"])})
                if emp:
                    contract["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
            except Exception:
                pass
    return contracts

@router.post("/contracts")
async def create_hrm_contract(contract: HRMContract, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    contract_dict = contract.model_dump()
    contract_dict["workspace_id"] = current_user.get("workspace_id")
    contract_dict["user_id"] = str(current_user["_id"])
    contract_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hrm_contracts.insert_one(contract_dict)
    contract_dict["id"] = str(result.inserted_id)
    return contract_dict

@router.put("/contracts/{contract_id}")
async def update_hrm_contract(contract_id: str, contract: HRMContract, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in contract.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hrm_contracts.update_one(
        {"_id": ObjectId(contract_id), **workspace_filter(current_user)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    return {"message": "Contract bijgewerkt"}

@router.delete("/contracts/{contract_id}")
async def delete_hrm_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_contracts.delete_one({
        "_id": ObjectId(contract_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    return {"message": "Contract verwijderd"}


# ==================== VACANCY ENDPOINTS ====================

@router.get("/vacancies")
async def get_hrm_vacancies(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    vacancies = await db.hrm_vacancies.find(
        workspace_filter(current_user)
    ).sort("created_at", -1).to_list(100)
    for vac in vacancies:
        vac["id"] = str(vac.pop("_id"))
    return vacancies

@router.post("/vacancies")
async def create_hrm_vacancy(vacancy: HRMVacancy, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    vac_dict = vacancy.model_dump()
    vac_dict["workspace_id"] = current_user.get("workspace_id")
    vac_dict["user_id"] = str(current_user["_id"])
    vac_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.hrm_vacancies.insert_one(vac_dict)
    vac_dict["id"] = str(result.inserted_id)
    return vac_dict

@router.put("/vacancies/{vacancy_id}")
async def update_hrm_vacancy(vacancy_id: str, vacancy: HRMVacancy, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in vacancy.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hrm_vacancies.update_one(
        {"_id": ObjectId(vacancy_id), **workspace_filter(current_user)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    return {"message": "Vacature bijgewerkt"}

@router.delete("/vacancies/{vacancy_id}")
async def delete_hrm_vacancy(vacancy_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_vacancies.delete_one({
        "_id": ObjectId(vacancy_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    return {"message": "Vacature verwijderd"}


# ==================== APPLICATION ENDPOINTS ====================

@router.get("/applications")
async def get_hrm_applications(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    applications = await db.hrm_applications.find(
        workspace_filter(current_user)
    ).sort("created_at", -1).to_list(1000)
    
    for app in applications:
        app["id"] = str(app.pop("_id"))
        if app.get("vacancy_id"):
            try:
                vac = await db.hrm_vacancies.find_one({"_id": ObjectId(app["vacancy_id"])})
                if vac:
                    app["vacancy_title"] = vac.get("title", "")
            except Exception:
                pass
    return applications

@router.post("/applications")
async def create_hrm_application(application: HRMApplication, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    app_dict = application.model_dump()
    app_dict["workspace_id"] = current_user.get("workspace_id")
    app_dict["user_id"] = str(current_user["_id"])
    app_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hrm_applications.insert_one(app_dict)
    app_dict["id"] = str(result.inserted_id)
    return app_dict

@router.put("/applications/{application_id}/status")
async def update_hrm_application_status(application_id: str, status: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_applications.update_one(
        {"_id": ObjectId(application_id), **workspace_filter(current_user)},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    return {"message": "Status bijgewerkt"}

@router.delete("/applications/{application_id}")
async def delete_hrm_application(application_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_applications.delete_one({
        "_id": ObjectId(application_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    return {"message": "Sollicitatie verwijderd"}


# ==================== DOCUMENT ENDPOINTS ====================

@router.get("/documents")
async def get_hrm_documents(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = workspace_filter(current_user)
    if employee_id:
        query["employee_id"] = employee_id
    
    documents = await db.hrm_documents.find(query).sort("created_at", -1).to_list(1000)
    for doc in documents:
        doc["id"] = str(doc.pop("_id"))
    return documents

@router.post("/documents")
async def create_hrm_document(document: HRMDocument, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    doc_dict = document.model_dump()
    doc_dict["workspace_id"] = current_user.get("workspace_id")
    doc_dict["user_id"] = str(current_user["_id"])
    doc_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.hrm_documents.insert_one(doc_dict)
    doc_dict["id"] = str(result.inserted_id)
    return doc_dict

@router.delete("/documents/{document_id}")
async def delete_hrm_document(document_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_documents.delete_one({
        "_id": ObjectId(document_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    return {"message": "Document verwijderd"}


# ==================== ATTENDANCE ENDPOINTS ====================

@router.get("/attendance")
async def get_hrm_attendance(date: Optional[str] = None, employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = workspace_filter(current_user)
    if date:
        query["date"] = date
    if employee_id:
        query["employee_id"] = employee_id
    
    attendance = await db.hrm_attendance.find(query).sort("date", -1).to_list(1000)
    for att in attendance:
        att["id"] = str(att.pop("_id"))
    return attendance

@router.post("/attendance")
async def create_hrm_attendance(attendance: HRMAttendance, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    # Check if attendance already exists for this employee and date
    existing = await db.hrm_attendance.find_one({
        "employee_id": attendance.employee_id,
        "date": attendance.date,
        **workspace_filter(current_user)
    })
    
    if existing:
        # Update existing
        await db.hrm_attendance.update_one(
            {"_id": existing["_id"]},
            {"$set": attendance.model_dump()}
        )
        return {"id": str(existing["_id"]), **attendance.model_dump()}
    
    att_dict = attendance.model_dump()
    att_dict["workspace_id"] = current_user.get("workspace_id")
    att_dict["user_id"] = str(current_user["_id"])
    att_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.hrm_attendance.insert_one(att_dict)
    att_dict["id"] = str(result.inserted_id)
    return att_dict

@router.post("/attendance/{employee_id}/clock-in")
async def clock_in(employee_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    existing = await db.hrm_attendance.find_one({
        "employee_id": employee_id,
        "date": today,
        **workspace_filter(current_user)
    })
    
    if existing and existing.get("clock_in"):
        raise HTTPException(status_code=400, detail="Al ingeklokt vandaag")
    
    if existing:
        await db.hrm_attendance.update_one(
            {"_id": existing["_id"]},
            {"$set": {"clock_in": now, "status": "present"}}
        )
    else:
        await db.hrm_attendance.insert_one({
            "employee_id": employee_id,
            "date": today,
            "clock_in": now,
            "status": "present",
            "workspace_id": current_user.get("workspace_id"),
            "user_id": str(current_user["_id"]),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Ingeklokt", "time": now}

@router.post("/attendance/{employee_id}/clock-out")
async def clock_out(employee_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    existing = await db.hrm_attendance.find_one({
        "employee_id": employee_id,
        "date": today,
        **workspace_filter(current_user)
    })
    
    if not existing or not existing.get("clock_in"):
        raise HTTPException(status_code=400, detail="Nog niet ingeklokt vandaag")
    
    if existing.get("clock_out"):
        raise HTTPException(status_code=400, detail="Al uitgeklokt vandaag")
    
    # Calculate hours worked
    clock_in = datetime.strptime(existing["clock_in"], "%H:%M:%S")
    clock_out_time = datetime.strptime(now, "%H:%M:%S")
    hours_worked = (clock_out_time - clock_in).seconds / 3600
    
    await db.hrm_attendance.update_one(
        {"_id": existing["_id"]},
        {"$set": {"clock_out": now, "hours_worked": round(hours_worked, 2)}}
    )
    
    return {"message": "Uitgeklokt", "time": now, "hours_worked": round(hours_worked, 2)}


# ==================== PAYROLL ENDPOINTS ====================

@router.get("/payroll")
async def get_hrm_payroll(period: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    query = workspace_filter(current_user)
    if period:
        query["period"] = period
    
    payroll = await db.hrm_payroll.find(query).sort("created_at", -1).to_list(1000)
    for pay in payroll:
        pay["id"] = str(pay.pop("_id"))
    return payroll

@router.post("/payroll")
async def create_hrm_payroll(payroll: HRMPayroll, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    pay_dict = payroll.model_dump()
    pay_dict["workspace_id"] = current_user.get("workspace_id")
    pay_dict["user_id"] = str(current_user["_id"])
    pay_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate net salary if not provided
    if not pay_dict.get("net_salary"):
        pay_dict["net_salary"] = pay_dict["basic_salary"] + (pay_dict.get("allowances") or 0) - (pay_dict.get("deductions") or 0)
    
    result = await db.hrm_payroll.insert_one(pay_dict)
    pay_dict["id"] = str(result.inserted_id)
    return pay_dict

@router.put("/payroll/{payroll_id}")
async def update_hrm_payroll(payroll_id: str, payroll: HRMPayroll, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in payroll.model_dump().items() if v is not None}
    update_data["net_salary"] = update_data["basic_salary"] + (update_data.get("allowances") or 0) - (update_data.get("deductions") or 0)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hrm_payroll.update_one(
        {"_id": ObjectId(payroll_id), **workspace_filter(current_user)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Salarisrecord niet gevonden")
    return {"message": "Salarisrecord bijgewerkt"}

@router.put("/payroll/{payroll_id}/approve")
async def approve_hrm_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_payroll.update_one(
        {"_id": ObjectId(payroll_id), **workspace_filter(current_user)},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Salarisrecord niet gevonden")
    return {"message": "Salaris goedgekeurd"}

@router.put("/payroll/{payroll_id}/pay")
async def pay_hrm_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_payroll.update_one(
        {"_id": ObjectId(payroll_id), **workspace_filter(current_user)},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Salarisrecord niet gevonden")
    return {"message": "Salaris betaald"}

@router.delete("/payroll/{payroll_id}")
async def delete_hrm_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.hrm_payroll.delete_one({
        "_id": ObjectId(payroll_id),
        **workspace_filter(current_user)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salarisrecord niet gevonden")
    return {"message": "Salarisrecord verwijderd"}

@router.post("/payroll/generate")
async def generate_payroll(period: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    # Get all active employees
    employees = await db.hrm_employees.find({
        **workspace_filter(current_user),
        "status": "active"
    }).to_list(1000)
    
    generated = []
    for emp in employees:
        # Check if payroll already exists for this period
        existing = await db.hrm_payroll.find_one({
            "employee_id": str(emp["_id"]),
            "period": period,
            **workspace_filter(current_user)
        })
        
        if not existing:
            pay_dict = {
                "employee_id": str(emp["_id"]),
                "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}",
                "period": period,
                "basic_salary": emp.get("salary", 0),
                "allowances": 0,
                "deductions": 0,
                "net_salary": emp.get("salary", 0),
                "status": "draft",
                "workspace_id": current_user.get("workspace_id"),
                "user_id": str(current_user["_id"]),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            result = await db.hrm_payroll.insert_one(pay_dict)
            pay_dict["id"] = str(result.inserted_id)
            generated.append(pay_dict)
    
    return {"message": f"{len(generated)} salarisrecords gegenereerd", "records": generated}


# ==================== SETTINGS ENDPOINTS ====================

@router.get("/settings")
async def get_hrm_settings(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    settings = await db.hrm_settings.find_one(workspace_filter(current_user))
    if not settings:
        # Return default settings
        return {
            "work_hours_per_day": 8,
            "work_days_per_week": 5,
            "overtime_rate": 1.5,
            "leave_days_per_year": 20,
            "sick_days_per_year": 10,
            "currency": "SRD"
        }
    settings["id"] = str(settings.pop("_id"))
    return settings

@router.put("/settings")
async def update_hrm_settings(settings: HRMSettings, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    settings_dict = settings.model_dump()
    settings_dict["workspace_id"] = current_user.get("workspace_id")
    settings_dict["user_id"] = str(current_user["_id"])
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_settings.update_one(
        workspace_filter(current_user),
        {"$set": settings_dict},
        upsert=True
    )
    return {"message": "Instellingen bijgewerkt"}


# ==================== DASHBOARD/STATS ENDPOINTS ====================

@router.get("/stats")
async def get_hrm_stats(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    wf = workspace_filter(current_user)
    
    total_employees = await db.hrm_employees.count_documents(wf)
    active_employees = await db.hrm_employees.count_documents({**wf, "status": "active"})
    
    pending_leave = await db.hrm_leave_requests.count_documents({**wf, "status": "pending"})
    open_vacancies = await db.hrm_vacancies.count_documents({**wf, "status": "open"})
    new_applications = await db.hrm_applications.count_documents({**wf, "status": "new"})
    
    # Department distribution
    departments = await db.hrm_employees.aggregate([
        {"$match": wf},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(100)
    
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "pending_leave_requests": pending_leave,
        "open_vacancies": open_vacancies,
        "new_applications": new_applications,
        "department_distribution": [{"department": d["_id"] or "Niet toegewezen", "count": d["count"]} for d in departments]
    }

@router.get("/dashboard")
async def get_hrm_dashboard(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    wf = workspace_filter(current_user)
    
    # Get stats
    stats = await get_hrm_stats(current_user)
    
    # Recent employees
    recent_employees = await db.hrm_employees.find(wf).sort("created_at", -1).limit(5).to_list(5)
    for emp in recent_employees:
        emp["id"] = str(emp.pop("_id"))
    
    # Pending leave requests
    pending_leaves = await db.hrm_leave_requests.find({**wf, "status": "pending"}).limit(5).to_list(5)
    for leave in pending_leaves:
        leave["id"] = str(leave.pop("_id"))
    
    # Today's attendance
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_attendance = await db.hrm_attendance.find({**wf, "date": today}).to_list(100)
    present_count = len([a for a in today_attendance if a.get("status") == "present"])
    
    # Upcoming birthdays (if birth_date field exists)
    # This is a placeholder - implement based on your data model
    
    return {
        **stats,
        "recent_employees": recent_employees,
        "pending_leave_requests_list": pending_leaves,
        "today_present": present_count,
        "today_absent": stats["active_employees"] - present_count
    }
