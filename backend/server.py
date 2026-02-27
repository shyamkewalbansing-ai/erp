from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from enum import Enum
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.lib.colors import HexColor
import httpx
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from PIL import Image as PILImage
import json

# Custom JSON encoder for MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def jsonable_encoder_fix(obj: Any) -> Any:
    """Recursively convert MongoDB ObjectIds to strings"""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: jsonable_encoder_fix(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [jsonable_encoder_fix(item) for item in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

# AI Chat imports
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Import routers
from routers.autodealer import router as autodealer_router
from routers.tenant_portal import router as tenant_portal_router
from routers.hrm import router as hrm_router
from routers.autodealer_portal import router as autodealer_portal_router
from routers.payment_methods import router as payment_methods_router
from routers.admin import router as admin_router
from routers.domain_management import router as domain_management_router
from routers.beautyspa import router as beautyspa_router
from routers.spa_booking import router as spa_booking_router
from routers.suribet import router as suribet_router
from routers.boekhouding import router as boekhouding_router
from services.email_service import get_email_service, EMAIL_TEMPLATES
from services.scheduled_tasks import get_scheduled_tasks

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Helper function to remove MongoDB _id field from documents
def clean_mongo_doc(doc: dict) -> dict:
    """Remove MongoDB _id field from document to prevent ObjectId serialization errors"""
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'surirentals')]

# JWT Configuration - use environment variable or generate a secure default
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'suri-rentals-default-secret-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Demo account credentials
DEMO_ACCOUNT_EMAIL = "demo@facturatie.sr"
DEMO_ACCOUNT_PASSWORD = "demo2024"

# Create the main app
app = FastAPI(title="Facturatie N.V. API", version="1.0.0")

# Custom JSON Response that handles MongoDB ObjectId
class MongoJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            jsonable_encoder_fix(content),
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")

# Set default response class for the app
app.default_response_class = MongoJSONResponse

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== DEMO ACCOUNT CLEANUP ====================

import asyncio

async def cleanup_demo_data():
    """Clean up ALL demo account data and reset with fixed demo data"""
    try:
        demo_user = await db.users.find_one({"email": DEMO_ACCOUNT_EMAIL})
        if not demo_user:
            return
        
        demo_user_id = demo_user.get('id') or str(demo_user['_id'])
        demo_workspace_id = demo_user.get('workspace_id')
        
        logger.info(f"Running demo data cleanup for user {DEMO_ACCOUNT_EMAIL}")
        
        # ALL collections to clean up completely (delete ALL data, not just old data)
        collections_to_clean = [
            # HRM data
            ("hrm_employees", "user_id"),
            ("hrm_departments", "user_id"),
            ("hrm_leave_requests", "user_id"),
            ("hrm_attendance", "user_id"),
            ("hrm_payroll", "user_id"),
            ("hrm_contracts", "user_id"),
            ("hrm_documents", "user_id"),
            
            # Vastgoed data
            ("apartments", "user_id"),
            ("tenants", "user_id"),
            ("payments", "user_id"),
            ("deposits", "user_id"),
            ("maintenance", "user_id"),
            ("loans", "user_id"),
            ("meter_readings", "user_id"),
            ("contracts", "user_id"),
            
            # Auto dealer data
            ("autodealer_vehicles", "user_id"),
            ("autodealer_customers", "user_id"),
            ("autodealer_sales", "user_id"),
            ("autodealer_payments", "user_id"),
            
            # Beauty Spa data
            ("spa_clients", "user_id"),
            ("spa_services", "user_id"),
            ("spa_customers", "user_id"),
            ("spa_treatments", "user_id"),
            ("spa_staff", "user_id"),
            ("spa_appointments", "user_id"),
            ("spa_products", "user_id"),
            ("spa_sales", "user_id"),
            ("spa_vouchers", "user_id"),
            ("spa_queue", "user_id"),
            ("spa_schedules", "user_id"),
            ("spa_branches", "user_id"),
            ("spa_intake_forms", "user_id"),
            ("spa_stock_movements", "user_id"),
            
            # Pompstation data
            ("pompstation_tanks", "user_id"),
            ("pompstation_leveringen", "user_id"),
            ("pompstation_pompen", "user_id"),
            ("pompstation_verkopen", "user_id"),
            ("pompstation_winkel_producten", "user_id"),
            ("pompstation_winkel_verkopen", "user_id"),
            ("pompstation_diensten", "user_id"),
            ("pompstation_personeel", "user_id"),
            ("pompstation_veiligheid", "user_id"),
            ("pompstation_incidenten", "user_id"),
            ("pompstation_rapportages", "user_id"),
            ("fuel_sales", "user_id"),
            ("fuel_inventory", "user_id"),
            
            # General data
            ("ai_chat_history", "user_id"),
            ("public_chats", "user_id"),
            ("notifications", "user_id"),
            ("invoices", "user_id"),
            ("documents", "user_id"),
        ]
        
        total_deleted = 0
        
        # Delete ALL data for demo user (not just old data)
        for collection_name, filter_field in collections_to_clean:
            try:
                collection = db[collection_name]
                filter_query = {filter_field: demo_user_id}
                
                result = await collection.delete_many(filter_query)
                if result.deleted_count > 0:
                    logger.info(f"Deleted {result.deleted_count} demo records from {collection_name}")
                    total_deleted += result.deleted_count
            except Exception as e:
                logger.error(f"Error cleaning {collection_name}: {e}")
        
        if total_deleted > 0:
            logger.info(f"Demo cleanup completed: {total_deleted} total records deleted")
        
        # Now insert fixed demo data
        await insert_fixed_demo_data(demo_user_id)
        
    except Exception as e:
        logger.error(f"Demo cleanup error: {e}")

async def insert_fixed_demo_data(user_id: str):
    """Insert comprehensive fixed demo data for ALL modules"""
    try:
        now = datetime.now(timezone.utc).isoformat()
        today = datetime.now().strftime("%Y-%m-%d")
        
        # ============== VASTGOED BEHEER DEMO DATA ==============
        apt1_id = str(uuid.uuid4())
        apt2_id = str(uuid.uuid4())
        apt3_id = str(uuid.uuid4())
        apt4_id = str(uuid.uuid4())
        
        demo_apartments = [
            {"id": apt1_id, "user_id": user_id, "name": "Appartement A1 - Centrum", "address": "Kerkstraat 10, Paramaribo", "rent_amount": 2500, "status": "verhuurd", "bedrooms": 2, "bathrooms": 1, "size_sqm": 75, "created_at": now},
            {"id": apt2_id, "user_id": user_id, "name": "Appartement B2 - Noord", "address": "Wilhelminastraat 25, Paramaribo", "rent_amount": 3500, "status": "beschikbaar", "bedrooms": 3, "bathrooms": 2, "size_sqm": 110, "created_at": now},
            {"id": apt3_id, "user_id": user_id, "name": "Studio C3 - Zuid", "address": "Gravenstraat 8, Paramaribo", "rent_amount": 1800, "status": "verhuurd", "bedrooms": 1, "bathrooms": 1, "size_sqm": 45, "created_at": now},
            {"id": apt4_id, "user_id": user_id, "name": "Penthouse D4 - Centrum", "address": "Waterkant 50, Paramaribo", "rent_amount": 5500, "status": "beschikbaar", "bedrooms": 4, "bathrooms": 3, "size_sqm": 180, "created_at": now},
        ]
        
        tenant1_id = str(uuid.uuid4())
        tenant2_id = str(uuid.uuid4())
        tenant3_id = str(uuid.uuid4())
        
        demo_tenants = [
            {"id": tenant1_id, "user_id": user_id, "name": "Jan Jansen", "email": "jan.jansen@demo.sr", "phone": "8123456", "address": "Kerkstraat 10", "apartment_id": apt1_id, "balance": 0, "status": "active", "created_at": now},
            {"id": tenant2_id, "user_id": user_id, "name": "Maria Pengel", "email": "maria.pengel@demo.sr", "phone": "8234567", "address": "Gravenstraat 8", "apartment_id": apt3_id, "balance": -500, "status": "active", "created_at": now},
            {"id": tenant3_id, "user_id": user_id, "name": "Robert Tjin", "email": "robert.tjin@demo.sr", "phone": "8345678", "address": "Zwartenhovenbrugstraat 15", "apartment_id": None, "balance": 2500, "status": "inactive", "created_at": now},
        ]
        
        # Demo betalingen
        demo_payments = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenant1_id, "tenant_name": "Jan Jansen", "amount": 2500, "payment_date": today, "payment_method": "bank", "description": "Huur januari", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenant1_id, "tenant_name": "Jan Jansen", "amount": 2500, "payment_date": "2025-12-01", "payment_method": "bank", "description": "Huur december", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenant2_id, "tenant_name": "Maria Pengel", "amount": 1300, "payment_date": today, "payment_method": "cash", "description": "Gedeeltelijke betaling", "created_at": now},
        ]
        
        # Demo contracten
        demo_contracts = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenant1_id, "apartment_id": apt1_id, "start_date": "2024-01-01", "end_date": "2025-12-31", "rent_amount": 2500, "deposit": 5000, "status": "active", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenant2_id, "apartment_id": apt3_id, "start_date": "2024-06-01", "end_date": "2025-05-31", "rent_amount": 1800, "deposit": 3600, "status": "active", "created_at": now},
        ]
        
        # Demo onderhoud
        demo_maintenance = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "apartment_id": apt1_id, "apartment_name": "Appartement A1", "description": "Lekkende kraan badkamer", "status": "pending", "priority": "medium", "cost": 150, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "apartment_id": apt3_id, "apartment_name": "Studio C3", "description": "Airco service", "status": "completed", "priority": "low", "cost": 250, "created_at": now},
        ]
        
        await db.apartments.insert_many(demo_apartments)
        await db.tenants.insert_many(demo_tenants)
        await db.payments.insert_many(demo_payments)
        await db.contracts.insert_many(demo_contracts)
        await db.maintenance.insert_many(demo_maintenance)
        
        # ============== HRM MODULE DEMO DATA ==============
        dept1_id = str(uuid.uuid4())
        dept2_id = str(uuid.uuid4())
        dept3_id = str(uuid.uuid4())
        dept4_id = str(uuid.uuid4())
        
        demo_departments = [
            {"id": dept1_id, "user_id": user_id, "name": "Administratie", "description": "Financiële administratie en boekhouding", "manager": "Peter Bakker", "budget": 50000, "created_at": now},
            {"id": dept2_id, "user_id": user_id, "name": "Verkoop", "description": "Sales en klantrelaties", "manager": "Sandra Lie", "budget": 75000, "created_at": now},
            {"id": dept3_id, "user_id": user_id, "name": "IT", "description": "Technische ondersteuning en development", "manager": "Kevin Moensi", "budget": 80000, "created_at": now},
            {"id": dept4_id, "user_id": user_id, "name": "HR", "description": "Human Resources", "manager": "Diana Soekhoe", "budget": 45000, "created_at": now},
        ]
        
        emp1_id = str(uuid.uuid4())
        emp2_id = str(uuid.uuid4())
        emp3_id = str(uuid.uuid4())
        emp4_id = str(uuid.uuid4())
        emp5_id = str(uuid.uuid4())
        emp6_id = str(uuid.uuid4())
        
        demo_employees = [
            {"id": emp1_id, "user_id": user_id, "name": "Peter Bakker", "email": "peter.bakker@demo.sr", "phone": "8456789", "department": "Administratie", "department_id": dept1_id, "position": "Hoofd Financiën", "salary": 6500, "hire_date": "2020-03-15", "status": "active", "created_at": now},
            {"id": emp2_id, "user_id": user_id, "name": "Sandra Lie", "email": "sandra.lie@demo.sr", "phone": "8567890", "department": "Verkoop", "department_id": dept2_id, "position": "Sales Manager", "salary": 5500, "hire_date": "2021-06-01", "status": "active", "created_at": now},
            {"id": emp3_id, "user_id": user_id, "name": "Kevin Moensi", "email": "kevin.moensi@demo.sr", "phone": "8678901", "department": "IT", "department_id": dept3_id, "position": "Lead Developer", "salary": 7000, "hire_date": "2019-01-10", "status": "active", "created_at": now},
            {"id": emp4_id, "user_id": user_id, "name": "Diana Soekhoe", "email": "diana.soekhoe@demo.sr", "phone": "8789012", "department": "HR", "department_id": dept4_id, "position": "HR Manager", "salary": 5000, "hire_date": "2022-02-01", "status": "active", "created_at": now},
            {"id": emp5_id, "user_id": user_id, "name": "Marco Venetiaan", "email": "marco.v@demo.sr", "phone": "8890123", "department": "Verkoop", "department_id": dept2_id, "position": "Sales Representative", "salary": 3500, "hire_date": "2023-04-15", "status": "active", "created_at": now},
            {"id": emp6_id, "user_id": user_id, "name": "Reshma Doerga", "email": "reshma.d@demo.sr", "phone": "8901234", "department": "IT", "department_id": dept3_id, "position": "Junior Developer", "salary": 4000, "hire_date": "2024-01-08", "status": "active", "created_at": now},
        ]
        
        # Demo verlofaanvragen
        demo_leave_requests = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp2_id, "employee_name": "Sandra Lie", "leave_type": "vakantie", "start_date": "2025-03-01", "end_date": "2025-03-10", "days": 8, "reason": "Familie bezoek Nederland", "status": "pending", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp5_id, "employee_name": "Marco Venetiaan", "leave_type": "ziek", "start_date": today, "end_date": today, "days": 1, "reason": "Griep", "status": "approved", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp3_id, "employee_name": "Kevin Moensi", "leave_type": "vakantie", "start_date": "2025-04-15", "end_date": "2025-04-25", "days": 9, "reason": "Huwelijksreis", "status": "pending", "created_at": now},
        ]
        
        # Demo aanwezigheid
        demo_attendance = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp1_id, "employee_name": "Peter Bakker", "date": today, "check_in": "08:00", "check_out": "17:00", "status": "present", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp2_id, "employee_name": "Sandra Lie", "date": today, "check_in": "08:30", "check_out": "17:30", "status": "present", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp3_id, "employee_name": "Kevin Moensi", "date": today, "check_in": "09:00", "check_out": None, "status": "present", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "employee_id": emp4_id, "employee_name": "Diana Soekhoe", "date": today, "check_in": "08:15", "check_out": "16:45", "status": "present", "created_at": now},
        ]
        
        await db.hrm_departments.insert_many(demo_departments)
        await db.hrm_employees.insert_many(demo_employees)
        await db.hrm_leave_requests.insert_many(demo_leave_requests)
        await db.hrm_attendance.insert_many(demo_attendance)
        
        # ============== AUTO DEALER MODULE DEMO DATA ==============
        veh1_id = str(uuid.uuid4())
        veh2_id = str(uuid.uuid4())
        veh3_id = str(uuid.uuid4())
        veh4_id = str(uuid.uuid4())
        veh5_id = str(uuid.uuid4())
        veh6_id = str(uuid.uuid4())
        
        demo_vehicles = [
            {"id": veh1_id, "user_id": user_id, "brand": "Toyota", "model": "Corolla", "year": 2022, "license_plate": "AB-1234", "color": "Wit", "mileage": 25000, "price_srd": 85000, "price_eur": 2500, "price_usd": 2700, "status": "beschikbaar", "fuel_type": "Benzine", "transmission": "Automaat", "created_at": now},
            {"id": veh2_id, "user_id": user_id, "brand": "Honda", "model": "Civic", "year": 2021, "license_plate": "CD-5678", "color": "Zwart", "mileage": 35000, "price_srd": 75000, "price_eur": 2200, "price_usd": 2400, "status": "beschikbaar", "fuel_type": "Benzine", "transmission": "Handgeschakeld", "created_at": now},
            {"id": veh3_id, "user_id": user_id, "brand": "Nissan", "model": "Qashqai", "year": 2023, "license_plate": "EF-9012", "color": "Grijs", "mileage": 8000, "price_srd": 120000, "price_eur": 3500, "price_usd": 3800, "status": "verkocht", "fuel_type": "Benzine", "transmission": "Automaat", "created_at": now},
            {"id": veh4_id, "user_id": user_id, "brand": "Hyundai", "model": "Tucson", "year": 2022, "license_plate": "GH-3456", "color": "Blauw", "mileage": 18000, "price_srd": 95000, "price_eur": 2800, "price_usd": 3000, "status": "beschikbaar", "fuel_type": "Benzine", "transmission": "Automaat", "created_at": now},
            {"id": veh5_id, "user_id": user_id, "brand": "Suzuki", "model": "Swift", "year": 2020, "license_plate": "IJ-7890", "color": "Rood", "mileage": 45000, "price_srd": 45000, "price_eur": 1300, "price_usd": 1400, "status": "beschikbaar", "fuel_type": "Benzine", "transmission": "Handgeschakeld", "created_at": now},
            {"id": veh6_id, "user_id": user_id, "brand": "Toyota", "model": "Hilux", "year": 2021, "license_plate": "KL-1122", "color": "Zilver", "mileage": 55000, "price_srd": 150000, "price_eur": 4400, "price_usd": 4800, "status": "gereserveerd", "fuel_type": "Diesel", "transmission": "Handgeschakeld", "created_at": now},
        ]
        
        cust1_id = str(uuid.uuid4())
        cust2_id = str(uuid.uuid4())
        cust3_id = str(uuid.uuid4())
        
        demo_ad_customers = [
            {"id": cust1_id, "user_id": user_id, "name": "Robert Chin", "email": "robert.chin@demo.sr", "phone": "8012345", "address": "Maagdenstraat 22", "type": "particulier", "notes": "Zoekt gezinsauto", "created_at": now},
            {"id": cust2_id, "user_id": user_id, "name": "Garage Paramaribo N.V.", "email": "info@garagepbo.sr", "phone": "8123456", "address": "Industrieweg 100", "type": "bedrijf", "notes": "Grote klant - fleet aankopen", "created_at": now},
            {"id": cust3_id, "user_id": user_id, "name": "Lisa Sital", "email": "lisa.sital@demo.sr", "phone": "8234567", "address": "Ringweg Zuid 45", "type": "particulier", "notes": "Eerste auto", "created_at": now},
        ]
        
        # Demo verkopen
        demo_ad_sales = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "vehicle_id": veh3_id, "customer_id": cust1_id, "customer_name": "Robert Chin", "vehicle_name": "Nissan Qashqai 2023", "sale_date": "2025-01-15", "price": 120000, "currency": "SRD", "payment_status": "paid", "created_at": now},
        ]
        
        await db.autodealer_vehicles.insert_many(demo_vehicles)
        await db.autodealer_customers.insert_many(demo_ad_customers)
        await db.autodealer_sales.insert_many(demo_ad_sales)
        
        # ============== BEAUTY & SPA MODULE DEMO DATA ==============
        serv1_id = str(uuid.uuid4())
        serv2_id = str(uuid.uuid4())
        serv3_id = str(uuid.uuid4())
        serv4_id = str(uuid.uuid4())
        serv5_id = str(uuid.uuid4())
        serv6_id = str(uuid.uuid4())
        
        demo_spa_services = [
            {"id": serv1_id, "user_id": user_id, "name": "Luxe Gezichtsbehandeling", "price": 175, "duration": 75, "description": "Complete gezichtsverzorging met masker", "category": "Gezicht", "is_active": True, "created_at": now},
            {"id": serv2_id, "user_id": user_id, "name": "Klassieke Manicure", "price": 65, "duration": 45, "description": "Nagelverzorging met lakken", "category": "Nagels", "is_active": True, "created_at": now},
            {"id": serv3_id, "user_id": user_id, "name": "Spa Pedicure", "price": 95, "duration": 60, "description": "Voetenverzorging met massage", "category": "Nagels", "is_active": True, "created_at": now},
            {"id": serv4_id, "user_id": user_id, "name": "Zweedse Massage", "price": 200, "duration": 90, "description": "Ontspannende lichaamsmassage", "category": "Massage", "is_active": True, "created_at": now},
            {"id": serv5_id, "user_id": user_id, "name": "Hot Stone Massage", "price": 250, "duration": 90, "description": "Massage met warme stenen", "category": "Massage", "is_active": True, "created_at": now},
            {"id": serv6_id, "user_id": user_id, "name": "Gel Nagels Full Set", "price": 120, "duration": 90, "description": "Complete gel nagelset", "category": "Nagels", "is_active": True, "created_at": now},
        ]
        
        spa_cust1_id = str(uuid.uuid4())
        spa_cust2_id = str(uuid.uuid4())
        spa_cust3_id = str(uuid.uuid4())
        spa_cust4_id = str(uuid.uuid4())
        
        demo_spa_customers = [
            {"id": spa_cust1_id, "user_id": user_id, "name": "Lisa Djokarto", "email": "lisa.d@demo.sr", "phone": "8345678", "birthday": "1990-05-15", "notes": "Allergisch voor noten", "visits": 12, "total_spent": 1850, "created_at": now},
            {"id": spa_cust2_id, "user_id": user_id, "name": "Reshma Doerga", "email": "reshma.d@demo.sr", "phone": "8456789", "birthday": "1988-11-22", "notes": "VIP klant", "visits": 25, "total_spent": 4500, "created_at": now},
            {"id": spa_cust3_id, "user_id": user_id, "name": "Anita Ramdin", "email": "anita.r@demo.sr", "phone": "8567890", "birthday": "1995-03-08", "notes": "", "visits": 5, "total_spent": 650, "created_at": now},
            {"id": spa_cust4_id, "user_id": user_id, "name": "Carmen Soekhoe", "email": "carmen.s@demo.sr", "phone": "8678901", "birthday": "1992-08-30", "notes": "Voorkeur voor ochtendafspraken", "visits": 8, "total_spent": 1200, "created_at": now},
        ]
        
        # Demo afspraken
        demo_spa_appointments = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "customer_id": spa_cust1_id, "customer_name": "Lisa Djokarto", "service_id": serv1_id, "service": "Luxe Gezichtsbehandeling", "date": today, "time": "10:00", "duration": 75, "price": 175, "status": "confirmed", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "customer_id": spa_cust2_id, "customer_name": "Reshma Doerga", "service_id": serv4_id, "service": "Zweedse Massage", "date": today, "time": "14:00", "duration": 90, "price": 200, "status": "confirmed", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "customer_id": spa_cust3_id, "customer_name": "Anita Ramdin", "service_id": serv2_id, "service": "Klassieke Manicure", "date": today, "time": "11:30", "duration": 45, "price": 65, "status": "pending", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "customer_id": spa_cust4_id, "customer_name": "Carmen Soekhoe", "service_id": serv6_id, "service": "Gel Nagels Full Set", "date": today, "time": "16:00", "duration": 90, "price": 120, "status": "confirmed", "created_at": now},
        ]
        
        # Demo spa staff
        demo_spa_staff = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Michelle Ramdas", "email": "michelle@demo.sr", "phone": "8789012", "role": "Schoonheidsspecialist", "specialties": ["Gezicht", "Massage"], "status": "active", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Priya Narain", "email": "priya@demo.sr", "phone": "8890123", "role": "Nagelstyliste", "specialties": ["Nagels"], "status": "active", "created_at": now},
        ]
        
        await db.spa_services.insert_many(demo_spa_services)
        await db.spa_customers.insert_many(demo_spa_customers)
        await db.spa_appointments.insert_many(demo_spa_appointments)
        await db.spa_staff.insert_many(demo_spa_staff)
        
        # ============== POMPSTATION MODULE DEMO DATA ==============
        demo_fuel_inventory = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Benzine 95", "current_liters": 15000, "capacity": 25000, "price_per_liter": 12.50, "last_delivery": "2025-01-28", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Diesel", "current_liters": 22000, "capacity": 30000, "price_per_liter": 10.80, "last_delivery": "2025-01-25", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Benzine 98 Premium", "current_liters": 8000, "capacity": 15000, "price_per_liter": 14.20, "last_delivery": "2025-01-20", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "LPG", "current_liters": 5000, "capacity": 10000, "price_per_liter": 8.50, "last_delivery": "2025-01-22", "created_at": now},
        ]
        
        # Demo brandstof verkopen
        demo_fuel_sales = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Benzine 95", "liters": 45, "price_per_liter": 12.50, "total": 562.50, "pump_number": 1, "payment_method": "cash", "date": now, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Diesel", "liters": 80, "price_per_liter": 10.80, "total": 864.00, "pump_number": 3, "payment_method": "card", "date": now, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Benzine 95", "liters": 30, "price_per_liter": 12.50, "total": 375.00, "pump_number": 2, "payment_method": "cash", "date": now, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "fuel_type": "Benzine 98 Premium", "liters": 55, "price_per_liter": 14.20, "total": 781.00, "pump_number": 4, "payment_method": "mope", "date": now, "created_at": now},
        ]
        
        # Demo pompstation tanks
        demo_tanks = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Tank 1 - Benzine 95", "fuel_type": "Benzine 95", "capacity": 25000, "current_level": 15000, "status": "active", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Tank 2 - Diesel", "fuel_type": "Diesel", "capacity": 30000, "current_level": 22000, "status": "active", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Tank 3 - Premium", "fuel_type": "Benzine 98", "capacity": 15000, "current_level": 8000, "status": "active", "created_at": now},
        ]
        
        # Demo pompen
        demo_pumps = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "pump_number": 1, "fuel_types": ["Benzine 95", "Diesel"], "status": "active", "last_maintenance": "2025-01-15", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "pump_number": 2, "fuel_types": ["Benzine 95", "Benzine 98"], "status": "active", "last_maintenance": "2025-01-15", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "pump_number": 3, "fuel_types": ["Diesel"], "status": "active", "last_maintenance": "2025-01-10", "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "pump_number": 4, "fuel_types": ["Benzine 95", "Benzine 98", "Diesel"], "status": "maintenance", "last_maintenance": "2025-01-05", "created_at": now},
        ]
        
        # Demo winkel producten
        demo_shop_products = [
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Motorolie 5W-30", "category": "Auto", "price": 85.00, "stock": 24, "min_stock": 10, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Ruitenwisservloeistof", "category": "Auto", "price": 15.00, "stock": 50, "min_stock": 20, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Coca Cola 500ml", "category": "Dranken", "price": 8.50, "stock": 120, "min_stock": 50, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Water 500ml", "category": "Dranken", "price": 5.00, "stock": 200, "min_stock": 80, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Chips Lays", "category": "Snacks", "price": 12.00, "stock": 60, "min_stock": 30, "created_at": now},
        ]
        
        await db.fuel_inventory.insert_many(demo_fuel_inventory)
        await db.fuel_sales.insert_many(demo_fuel_sales)
        await db.pompstation_tanks.insert_many(demo_tanks)
        await db.pompstation_pompen.insert_many(demo_pumps)
        await db.pompstation_winkel_producten.insert_many(demo_shop_products)
        
        logger.info(f"Comprehensive demo data inserted for user {user_id} - All modules populated")
        
    except Exception as e:
        logger.error(f"Error inserting demo data: {e}")
        import traceback
        logger.error(traceback.format_exc())

async def demo_cleanup_scheduler():
    """Run demo cleanup every hour"""
    while True:
        await cleanup_demo_data()
        await asyncio.sleep(3600)  # Wait 1 hour

async def ensure_demo_has_all_modules():
    """Ensure demo account has ALL modules activated in user_addons collection"""
    try:
        # Get demo user
        demo_user = await db.users.find_one({"email": DEMO_ACCOUNT_EMAIL}, {"_id": 0})
        if not demo_user:
            logger.warning("Demo account not found")
            return
            
        user_id = demo_user.get("id")
        
        # Get all active addons
        all_addons = await db.addons.find({"is_active": True}).to_list(100)
        
        now = datetime.now(timezone.utc)
        end_date = (now + timedelta(days=365)).isoformat()  # 1 year validity
        
        for addon in all_addons:
            addon_id = addon.get('id') or str(addon.get('_id'))
            addon_slug = addon.get('slug', '')
            
            # Check if already exists in user_addons
            existing = await db.user_addons.find_one({
                "user_id": user_id,
                "addon_id": addon_id,
                "status": "active"
            })
            
            if not existing:
                # Create user_addon record
                user_addon_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "addon_id": addon_id,
                    "addon_slug": addon_slug,
                    "status": "active",
                    "start_date": now.isoformat(),
                    "end_date": end_date,
                    "payment_method": "demo",
                    "payment_reference": "DEMO-AUTO",
                    "created_at": now.isoformat()
                }
                await db.user_addons.insert_one(user_addon_doc)
                logger.info(f"Added {addon_slug} module to demo account")
        
        logger.info(f"Demo account modules synced - {len(all_addons)} addons available")
        
    except Exception as e:
        logger.error(f"Error updating demo modules: {e}")

async def ensure_demo_account_exists():
    """Create demo account if it doesn't exist, or update password if it does"""
    try:
        demo_user = await db.users.find_one({"email": DEMO_ACCOUNT_EMAIL})
        
        if not demo_user:
            # Create demo account
            demo_user_id = str(uuid.uuid4())
            workspace_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            demo_user_doc = {
                "id": demo_user_id,
                "email": DEMO_ACCOUNT_EMAIL,
                "password": hash_password(DEMO_ACCOUNT_PASSWORD),
                "name": "Demo Gebruiker",
                "company_name": "Demo Bedrijf N.V.",
                "phone": "8000000",
                "role": "admin",
                "workspace_id": workspace_id,
                "is_active": True,
                "is_demo": True,
                "created_at": now,
                "updated_at": now
            }
            
            await db.users.insert_one(demo_user_doc)
            logger.info(f"Demo account created: {DEMO_ACCOUNT_EMAIL}")
        else:
            # Update password to ensure it's correct
            await db.users.update_one(
                {"email": DEMO_ACCOUNT_EMAIL},
                {"$set": {
                    "password": hash_password(DEMO_ACCOUNT_PASSWORD),
                    "is_demo": True,
                    "is_active": True
                }}
            )
            logger.info(f"Demo account password updated: {DEMO_ACCOUNT_EMAIL}")
            
    except Exception as e:
        logger.error(f"Error ensuring demo account: {e}")

@app.on_event("startup")
async def start_demo_cleanup():
    """Start the demo cleanup background task and ensure demo has all modules"""
    # First ensure demo account exists with correct password
    await ensure_demo_account_exists()
    # Then ensure demo account has all modules
    await ensure_demo_has_all_modules()
    # Start cleanup scheduler
    asyncio.create_task(demo_cleanup_scheduler())
    logger.info("Demo cleanup scheduler started - runs every hour")

# ==================== GLOBAL EXCEPTION HANDLER ====================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions to prevent server crashes"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.hostinger.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'info@facturatie.sr')
APP_URL = os.environ.get('APP_URL', 'https://facturatie.sr')

async def send_email_async(to_email: str, subject: str, html_content: str):
    """Send email via configured SMTP - uses global email settings"""
    try:
        # Try to use the email service with global settings
        email_service = get_email_service(db)
        settings = await email_service.get_settings("global")
        
        if settings and settings.get("enabled"):
            import aiosmtplib
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.get('from_name', 'Facturatie.sr')} <{settings.get('from_email')}>"
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            await aiosmtplib.send(
                msg,
                hostname=settings["smtp_host"],
                port=settings.get("smtp_port", 587),
                username=settings["smtp_user"],
                password=settings["smtp_password"],
                use_tls=settings.get("use_tls", True),
                start_tls=settings.get("start_tls", True)
            )
            
            # Log successful send
            await db.email_logs.insert_one({
                "to_email": to_email,
                "template": "custom",
                "subject": subject,
                "status": "sent",
                "workspace_id": "global",
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Email sent successfully to {to_email} via email service")
            return True
        else:
            # Fallback to old SMTP config
            return send_email_sync(to_email, subject, html_content)
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_email_sync(to_email: str, subject: str, html_content: str):
    """Synchronous email send - fallback"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"Facturatie N.V. <{SMTP_FROM}>"
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_email(to_email: str, subject: str, html_content: str):
    """Send email via SMTP - wrapper for backward compatibility"""
    return send_email_sync(to_email, subject, html_content)

async def send_welcome_email_async(name: str, email: str, password: str, company_name: str = None):
    """Send welcome email using the new email service"""
    try:
        email_service = get_email_service(db)
        settings = await email_service.get_settings("global")
        
        if settings and settings.get("enabled"):
            result = await email_service.send_welcome_email(
                to_email=email,
                customer_name=name,
                password=password,
                company_name=company_name or "N/A",
                login_url=f"{APP_URL}/login"
            )
            return result.get("success", False)
    except Exception as e:
        logger.error(f"Error sending welcome email via email service: {e}")
    return False

def send_welcome_email(name: str, email: str, password: str, plan_type: str):
    """Send welcome email to new customer"""
    
    plan_text = {
        'trial': '3 dagen gratis proefperiode',
        'active': 'Actief abonnement',
        'free': 'Gratis account (onbeperkt)',
        'none': 'Account aangemaakt (wacht op activatie)'
    }.get(plan_type, 'Account aangemaakt')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #0caf60 0%, #0a8f4e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0caf60; }}
            .credentials p {{ margin: 8px 0; }}
            .label {{ color: #666; font-size: 14px; }}
            .value {{ font-weight: bold; color: #333; font-size: 16px; }}
            .button {{ display: inline-block; background: #0caf60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Welkom bij Facturatie N.V.!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Uw verhuurbeheersysteem</p>
            </div>
            <div class="content">
                <p>Beste {name},</p>
                <p>Uw account is succesvol aangemaakt. Hieronder vindt u uw inloggegevens:</p>
                
                <div class="credentials">
                    <p><span class="label">E-mailadres:</span><br><span class="value">{email}</span></p>
                    <p><span class="label">Wachtwoord:</span><br><span class="value">{password}</span></p>
                    <p><span class="label">Account type:</span><br><span class="value">{plan_text}</span></p>
                </div>
                
                <p style="text-align: center;">
                    <a href="{APP_URL}/login" class="button">Nu Inloggen</a>
                </p>
                
                <p><strong>Belangrijk:</strong> Wijzig uw wachtwoord na de eerste keer inloggen via Instellingen.</p>
                
                <p>Met vriendelijke groet,<br>Het Facturatie N.V. Team</p>
            </div>
            <div class="footer">
                <p>© 2026 Facturatie N.V. - Verhuurbeheersysteem</p>
                <p>Dit is een automatisch gegenereerd bericht.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, "Welkom bij Facturatie N.V. - Uw Inloggegevens", html_content)

# Health check endpoint (required for Kubernetes deployment)
# Define at app level before any other routes
@app.get("/health")
@app.get("/healthz")
@app.get("/")
async def health_check():
    return {"status": "healthy"}

# ==================== MODELS ====================

# Subscription Constants
SUBSCRIPTION_PRICE_SRD = 3500.0
SUBSCRIPTION_DAYS = 30
TRIAL_DAYS = 3
SUPER_ADMIN_EMAIL = "admin@facturatie.sr"  # Default super admin

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    company_name: Optional[str] = None
    role: str  # 'superadmin', 'customer'
    subscription_status: str  # 'active', 'expired', 'trial', 'none'
    subscription_end_date: Optional[str] = None
    created_at: str
    logo: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Subscription Models
class SubscriptionCreate(BaseModel):
    user_id: str
    months: int = 1
    payment_method: str  # 'cash', 'bank_transfer', 'other'
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    amount: float
    months: int
    start_date: str
    end_date: str
    payment_method: str
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    status: str  # 'active', 'expired'
    created_at: str

class CustomerResponse(BaseModel):
    id: str
    email: str
    name: str
    company_name: Optional[str] = None
    role: str
    subscription_status: str
    subscription_end_date: Optional[str] = None
    created_at: str
    total_paid: float
    last_payment_date: Optional[str] = None

# Tenant Models
class TenantCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    id_number: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    id_number: Optional[str] = None

class TenantResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    id_number: Optional[str] = None
    created_at: str
    user_id: str

# Apartment Models
class ApartmentCreate(BaseModel):
    name: str
    address: str
    rent_amount: float
    description: Optional[str] = None
    bedrooms: Optional[int] = 1
    bathrooms: Optional[int] = 1

class ApartmentUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    rent_amount: Optional[float] = None
    description: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    status: Optional[str] = None
    tenant_id: Optional[str] = None

class ApartmentResponse(BaseModel):
    id: str
    name: str
    address: str
    rent_amount: float
    description: Optional[str] = None
    bedrooms: int
    bathrooms: int
    status: str  # 'available', 'occupied'
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    created_at: str
    user_id: str

# Payment Models
class PaymentCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    amount: float
    payment_date: str
    payment_type: str  # 'rent', 'deposit', 'loan', 'other'
    description: Optional[str] = None
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    loan_id: Optional[str] = None  # For loan repayments

class PaymentResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    apartment_id: str
    apartment_name: Optional[str] = None
    amount: float
    payment_date: str
    payment_type: str
    description: Optional[str] = None
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    loan_id: Optional[str] = None
    created_at: str
    user_id: str

# Deposit Models
class DepositCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    amount: float
    deposit_date: str
    status: str = "held"  # 'held', 'returned', 'partial_returned'
    notes: Optional[str] = None

class DepositUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None
    return_date: Optional[str] = None
    return_amount: Optional[float] = None
    notes: Optional[str] = None

class DepositResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    apartment_id: str
    apartment_name: Optional[str] = None
    amount: float
    deposit_date: str
    status: str
    return_date: Optional[str] = None
    return_amount: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
    user_id: str

# Reminder Models
class ReminderResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: str
    apartment_id: str
    apartment_name: str
    amount_due: float
    due_date: str
    days_overdue: int
    reminder_type: str  # 'upcoming', 'overdue'

# Kasgeld (Cash Fund) Models
class KasgeldCreate(BaseModel):
    amount: float
    transaction_type: str  # 'deposit' (storting), 'withdrawal' (opname)
    description: Optional[str] = None
    transaction_date: str

class KasgeldResponse(BaseModel):
    id: str
    amount: float
    transaction_type: str  # 'deposit', 'withdrawal', 'payment' (huurbetalingen)
    description: Optional[str] = None
    transaction_date: str
    created_at: str
    user_id: str
    source: Optional[str] = None  # 'manual' or 'payment'

class KasgeldBalanceResponse(BaseModel):
    total_balance: float
    total_deposits: float
    total_payments: float  # Inkomsten uit huurbetalingen
    total_withdrawals: float
    total_maintenance_costs: float
    total_salary_payments: float  # Salarisbetalingen
    transactions: List[KasgeldResponse]

# Lening (Loan) Models
class LoanCreate(BaseModel):
    tenant_id: str
    amount: float
    description: Optional[str] = None
    loan_date: str

class LoanUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    loan_date: Optional[str] = None

class LoanResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    amount: float
    amount_paid: float = 0
    remaining: float = 0
    description: Optional[str] = None
    loan_date: str
    status: str = "open"  # 'open', 'partial', 'paid'
    created_at: str
    user_id: str

# Onderhoud (Maintenance) Models
class MaintenanceCreate(BaseModel):
    apartment_id: str
    category: str  # 'wc', 'kraan', 'douche', 'keuken', 'verven', 'kasten', 'overig'
    description: str
    cost: float
    maintenance_date: str
    status: str = "completed"  # 'pending', 'in_progress', 'completed'
    cost_type: str = "kasgeld"  # 'kasgeld' (verhuurder betaalt) or 'tenant' (huurder betaalt)

class MaintenanceUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    maintenance_date: Optional[str] = None
    status: Optional[str] = None
    cost_type: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: str
    apartment_id: str
    apartment_name: Optional[str] = None
    category: str
    description: str
    cost: float
    maintenance_date: str
    status: str
    cost_type: str = "kasgeld"
    created_at: str
    user_id: str

# ==================== METER READING MODELS ====================

# EBS Tarieven Suriname (2024)
EBS_TARIFFS = [
    {"min": 0, "max": 150, "rate": 0.35},      # 0-150 kWh: SRD 0.35/kWh
    {"min": 150, "max": 500, "rate": 0.55},    # 150-500 kWh: SRD 0.55/kWh
    {"min": 500, "max": 999999, "rate": 0.85}  # 500+ kWh: SRD 0.85/kWh
]

# SWM Tarieven Suriname (2024)
SWM_TARIFFS = [
    {"min": 0, "max": 10, "rate": 2.50},       # 0-10 m³: SRD 2.50/m³
    {"min": 10, "max": 30, "rate": 4.50},      # 10-30 m³: SRD 4.50/m³
    {"min": 30, "max": 999999, "rate": 7.50}   # 30+ m³: SRD 7.50/m³
]

def calculate_ebs_cost(usage_kwh: float) -> float:
    """Calculate EBS cost based on tiered tariffs"""
    total_cost = 0.0
    remaining = usage_kwh
    
    for tier in EBS_TARIFFS:
        tier_max = tier["max"] if tier["max"] < 999999 else float('inf')
        tier_usage = min(remaining, tier_max - tier["min"])
        if tier_usage > 0:
            total_cost += tier_usage * tier["rate"]
            remaining -= tier_usage
        if remaining <= 0:
            break
    
    return round(total_cost, 2)

def calculate_swm_cost(usage_m3: float) -> float:
    """Calculate SWM cost based on tiered tariffs"""
    total_cost = 0.0
    remaining = usage_m3
    
    for tier in SWM_TARIFFS:
        tier_max = tier["max"] if tier["max"] < 999999 else float('inf')
        tier_usage = min(remaining, tier_max - tier["min"])
        if tier_usage > 0:
            total_cost += tier_usage * tier["rate"]
            remaining -= tier_usage
        if remaining <= 0:
            break
    
    return round(total_cost, 2)

class MeterReadingCreate(BaseModel):
    apartment_id: str
    tenant_id: Optional[str] = None
    reading_date: str
    ebs_reading: Optional[float] = None  # kWh
    swm_reading: Optional[float] = None  # m³
    notes: Optional[str] = None

class MeterReadingUpdate(BaseModel):
    ebs_reading: Optional[float] = None
    swm_reading: Optional[float] = None
    notes: Optional[str] = None
    payment_status: Optional[str] = None  # 'pending', 'paid'

class MeterReadingResponse(BaseModel):
    id: str
    apartment_id: str
    apartment_name: Optional[str] = None
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    reading_date: str
    period_month: int
    period_year: int
    ebs_reading: Optional[float] = None
    ebs_previous: Optional[float] = None
    ebs_usage: Optional[float] = None
    ebs_cost: Optional[float] = None
    swm_reading: Optional[float] = None
    swm_previous: Optional[float] = None
    swm_usage: Optional[float] = None
    swm_cost: Optional[float] = None
    total_cost: Optional[float] = None
    payment_status: str = "pending"  # 'pending', 'paid'
    paid_at: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    submitted_by: str  # 'tenant' or 'admin'
    user_id: str

class MeterSettingsCreate(BaseModel):
    ebs_tariffs: Optional[List[dict]] = None
    swm_tariffs: Optional[List[dict]] = None
    reminder_day: int = 25  # Day of month for reminder
    reminder_enabled: bool = True

class MeterSettingsResponse(BaseModel):
    id: str
    ebs_tariffs: List[dict]
    swm_tariffs: List[dict]
    reminder_day: int
    reminder_enabled: bool
    user_id: str

class MeterSummaryResponse(BaseModel):
    period_month: int
    period_year: int
    total_apartments: int
    submitted_count: int
    pending_count: int
    total_ebs_usage: float
    total_ebs_cost: float
    total_swm_usage: float
    total_swm_cost: float
    total_cost: float
    paid_count: int
    unpaid_count: int
    unpaid_total: float

# ==================== TENANT PORTAL MODELS ====================

class TenantRegister(BaseModel):
    email: EmailStr
    password: str
    invite_code: Optional[str] = None

class TenantLogin(BaseModel):
    email: EmailStr
    password: str

class TenantPortalDashboard(BaseModel):
    tenant_id: str
    tenant_name: str
    apartment_id: Optional[str] = None
    apartment_name: Optional[str] = None
    apartment_address: Optional[str] = None
    rent_amount: Optional[float] = None
    # Financials
    total_paid: float = 0
    total_due: float = 0
    outstanding_balance: float = 0
    # Recent payments
    recent_payments: List[dict] = []
    # Meter readings
    pending_meter_reading: bool = False
    last_meter_reading: Optional[dict] = None
    # Invoices
    open_invoices: List[dict] = []

class TenantMeterReadingCreate(BaseModel):
    ebs_reading: Optional[float] = None
    swm_reading: Optional[float] = None
    reading_date: Optional[str] = None
    notes: Optional[str] = None

# Werknemer (Employee) Models
class EmployeeCreate(BaseModel):
    name: str
    position: str  # functie
    phone: Optional[str] = None
    email: Optional[str] = None
    salary: float  # maandelijks salaris
    start_date: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    salary: Optional[float] = None
    status: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: str
    name: str
    position: str
    phone: Optional[str] = None
    email: Optional[str] = None
    salary: float
    start_date: str
    status: str  # 'active', 'inactive'
    created_at: str
    user_id: str

# Salaris (Salary Payment) Models
class SalaryPaymentCreate(BaseModel):
    employee_id: str
    amount: float
    payment_date: str
    period_month: int
    period_year: int
    description: Optional[str] = None

class SalaryPaymentResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    amount: float
    payment_date: str
    period_month: int
    period_year: int
    description: Optional[str] = None
    created_at: str
    user_id: str

# Exchange Rate Models
class ExchangeRateResponse(BaseModel):
    srd_to_eur: float
    eur_to_srd: float
    last_updated: str
    source: str

# ==================== ADD-ON MODELS ====================

class AddonCreate(BaseModel):
    name: str
    slug: str  # Unique identifier, e.g., 'vastgoed_beheer'
    description: Optional[str] = None
    price: float
    is_active: bool = True
    # Extra module detail fields
    category: Optional[str] = None  # e.g., 'Personeel', 'Vastgoed', 'Analytics'
    icon_name: Optional[str] = None  # Lucide icon name e.g., 'Users', 'Building2'
    hero_image_url: Optional[str] = None
    highlights: Optional[List[str]] = None  # Short feature highlights
    features: Optional[List[dict]] = None  # List of feature sections with title, description, features list

class AddonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    category: Optional[str] = None
    icon_name: Optional[str] = None
    hero_image_url: Optional[str] = None
    highlights: Optional[List[str]] = None
    features: Optional[List[dict]] = None

class AddonResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    is_active: bool
    created_at: str
    category: Optional[str] = None
    icon_name: Optional[str] = None
    hero_image_url: Optional[str] = None
    highlights: Optional[List[str]] = None
    features: Optional[List[dict]] = None

class UserAddonCreate(BaseModel):
    user_id: str
    addon_id: str
    months: int = 1
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None

class UserAddonResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    addon_id: str
    addon_name: Optional[str] = None
    addon_slug: Optional[str] = None
    status: str  # 'active', 'expired', 'pending'
    start_date: str
    end_date: Optional[str] = None
    created_at: str

class AddonRequestCreate(BaseModel):
    addon_id: str
    notes: Optional[str] = None

class AddonRequestResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    addon_id: str
    addon_name: Optional[str] = None
    addon_price: Optional[float] = None
    status: str  # 'pending', 'approved', 'rejected'
    notes: Optional[str] = None
    created_at: str

# Admin Dashboard Models
class AdminDashboardStats(BaseModel):
    total_customers: int
    active_subscriptions: int
    expired_subscriptions: int
    total_revenue: float
    revenue_this_month: float
    recent_subscriptions: List[SubscriptionResponse]

# ==================== WORKSPACE / MULTI-TENANT MODELS ====================

class WorkspaceBranding(BaseModel):
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#0caf60"
    secondary_color: str = "#059669"
    portal_name: Optional[str] = None
    # Login/Register page customization
    login_background_url: Optional[str] = None
    login_image_url: Optional[str] = None
    register_image_url: Optional[str] = None
    welcome_text: Optional[str] = None
    tagline: Optional[str] = None

class WorkspaceDomain(BaseModel):
    type: str  # 'subdomain' or 'custom'
    subdomain: Optional[str] = None  # e.g., 'klantnaam' -> klantnaam.facturatie.sr
    custom_domain: Optional[str] = None  # e.g., 'portal.klantdomein.nl'
    dns_verified: bool = False
    ssl_active: bool = False
    dns_record_type: str = "A"
    dns_record_value: Optional[str] = None  # Server IP

class WorkspaceCreate(BaseModel):
    name: str
    slug: str  # URL-safe identifier
    owner_id: str  # Customer user_id
    domain_type: str = "subdomain"  # 'subdomain' or 'custom'
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    branding: Optional[WorkspaceBranding] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    branding: Optional[WorkspaceBranding] = None
    domain_type: Optional[str] = None
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    owner_id: str
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    status: str  # 'pending', 'active', 'suspended', 'error'
    domain: WorkspaceDomain
    branding: WorkspaceBranding
    created_at: str
    updated_at: Optional[str] = None
    users_count: int = 0
    error_message: Optional[str] = None

# ==================== DEPLOYMENT / SYSTEM UPDATE MODELS ====================

class DeploymentSettings(BaseModel):
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    auto_restart_backend: bool = True
    auto_rebuild_frontend: bool = True
    run_migrations: bool = True
    last_update: Optional[str] = None
    last_update_status: Optional[str] = None

class DeploymentLog(BaseModel):
    id: str
    timestamp: str
    status: str  # 'pending', 'running', 'success', 'failed'
    message: str
    details: Optional[str] = None

# ==================== LANDING PAGE CMS MODELS ====================

class LandingPageSection(BaseModel):
    id: str
    section_type: str  # 'hero', 'features', 'pricing', 'about', 'terms', 'privacy', 'hrm', 'custom'
    title: str
    content: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    order: int = 0
    metadata: Optional[dict] = None  # For additional custom data

class LandingPageSectionCreate(BaseModel):
    section_type: str
    title: str
    content: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    order: int = 0
    metadata: Optional[dict] = None

class LandingPageSectionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    metadata: Optional[dict] = None

class LandingPageSettings(BaseModel):
    company_name: str = "Facturatie N.V."
    company_email: str = "info@facturatie.sr"
    company_phone: str = "+597 8934982"
    company_address: str = "Paramaribo, Suriname"
    logo_url: Optional[str] = None
    footer_text: Optional[str] = None
    social_links: Optional[dict] = None  # {"facebook": "url", "instagram": "url", etc}
    login_image_url: Optional[str] = None  # Afbeelding voor login pagina
    register_image_url: Optional[str] = None  # Afbeelding voor registratie pagina
    partners: Optional[List[dict]] = None  # [{"name": "Partner A", "logo": "url"}, ...]
    # Global site settings
    site_title: Optional[str] = "Facturatie N.V."
    site_description: Optional[str] = None
    primary_color: Optional[str] = "#3b82f6"
    secondary_color: Optional[str] = "#1e40af"
    font_family: Optional[str] = "Inter"

# ==================== CMS MODELS ====================

class CMSPageSection(BaseModel):
    """A section/block within a CMS page"""
    id: Optional[str] = None
    type: str  # 'hero', 'text', 'image_text', 'features', 'cta', 'gallery', 'pricing', 'contact', 'testimonials', 'faq', 'custom_html'
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Optional[str] = None  # Rich text / HTML content
    image_url: Optional[str] = None
    background_image_url: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    button_style: Optional[str] = "primary"  # 'primary', 'secondary', 'outline'
    layout: Optional[str] = "center"  # 'left', 'center', 'right', 'image-left', 'image-right'
    items: Optional[List[dict]] = None  # For features, gallery, testimonials, faq, etc.
    settings: Optional[dict] = None  # Extra settings per section type
    order: int = 0
    is_visible: bool = True

class CMSPage(BaseModel):
    """A CMS managed page"""
    id: Optional[str] = None
    title: str
    slug: str  # URL path e.g. 'about-us', 'contact'
    description: Optional[str] = None  # SEO description
    template: str = "default"  # 'default', 'landing', 'sidebar', 'full-width', 'blank'
    sections: List[CMSPageSection] = []
    is_published: bool = True
    show_in_menu: bool = True
    menu_order: int = 0
    menu_label: Optional[str] = None  # Override title in menu
    parent_page_id: Optional[str] = None  # For submenu
    show_header: bool = True
    show_footer: bool = True
    custom_css: Optional[str] = None
    seo_title: Optional[str] = None
    seo_keywords: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CMSMenuItem(BaseModel):
    """Menu item for navigation"""
    id: Optional[str] = None
    label: str
    link: str  # URL or page slug
    page_id: Optional[str] = None  # Link to CMS page
    is_external: bool = False
    open_in_new_tab: bool = False
    parent_id: Optional[str] = None  # For submenu
    order: int = 0
    is_visible: bool = True

class CMSMenu(BaseModel):
    """Navigation menu"""
    id: Optional[str] = None
    name: str  # 'main', 'footer', etc.
    items: List[CMSMenuItem] = []

class CMSFooter(BaseModel):
    """Footer configuration"""
    columns: List[dict] = []  # Each column has title and links
    copyright_text: Optional[str] = None
    show_social_links: bool = True
    show_newsletter: bool = False
    newsletter_title: Optional[str] = "Schrijf u in voor onze nieuwsbrief"
    background_color: Optional[str] = "#1f2937"
    text_color: Optional[str] = "#ffffff"
    custom_html: Optional[str] = None

class CMSTemplate(BaseModel):
    """Pre-made page templates"""
    id: str
    name: str
    description: str
    preview_image: Optional[str] = None
    category: str  # 'landing', 'business', 'portfolio', 'ecommerce'
    sections: List[dict] = []  # Pre-configured sections

class PublicOrderCreate(BaseModel):
    """Order from landing page with account creation"""
    name: str
    email: EmailStr
    phone: str
    password: str  # For account creation
    company_name: Optional[str] = None
    addon_ids: List[str]  # Which add-ons they want
    message: Optional[str] = None

class PublicOrderResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    addon_ids: List[str]
    addon_names: Optional[List[str]] = None
    total_price: Optional[float] = None
    message: Optional[str] = None
    status: str  # 'pending', 'pending_payment', 'paid', 'contacted', 'converted', 'rejected'
    payment_url: Optional[str] = None
    payment_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: str

# ==================== MOPE PAYMENT MODELS ====================

class MopeSettings(BaseModel):
    """Mope Payment Gateway Settings"""
    is_enabled: bool = False
    use_live_mode: bool = False  # False = test, True = live
    test_token: Optional[str] = None
    live_token: Optional[str] = None
    webhook_secret: Optional[str] = None

class MopePaymentRequest(BaseModel):
    """Create a Mope payment request"""
    amount: float
    description: str
    order_id: str
    redirect_url: str

class MopePaymentResponse(BaseModel):
    """Response from Mope payment creation"""
    id: str
    payment_url: str
    status: str

class MopeWebhook(BaseModel):
    """Webhook from Mope"""
    payment_request_id: str
    status: str
    amount: Optional[float] = None

# Dashboard Models
class DashboardStats(BaseModel):
    total_apartments: int
    occupied_apartments: int
    available_apartments: int
    total_tenants: int
    total_income_this_month: float
    total_outstanding: float
    total_outstanding_loans: float = 0  # Openstaande leningen
    total_deposits_held: float
    total_kasgeld: float
    total_employees: int
    total_salary_this_month: float
    recent_payments: List[PaymentResponse]
    reminders: List[ReminderResponse]

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_subscription_status(user: dict) -> tuple:
    """Check subscription status and return (status, end_date, is_trial)"""
    if user.get("role") == "superadmin":
        return "active", None, False
    
    end_date_str = user.get("subscription_end_date")
    is_trial = user.get("is_trial", False)
    
    if not end_date_str:
        return "none", None, False
    
    try:
        # Handle both timezone-aware and naive datetime strings
        if isinstance(end_date_str, str):
            if '+' in end_date_str or 'Z' in end_date_str:
                end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            else:
                # Assume UTC for naive datetime strings
                end_dt = datetime.fromisoformat(end_date_str).replace(tzinfo=timezone.utc)
        else:
            end_dt = end_date_str
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
        
        if end_dt > datetime.now(timezone.utc):
            if is_trial:
                return "trial", end_dt.isoformat(), True
            return "active", end_dt.isoformat(), False
        else:
            return "expired", end_dt.isoformat(), is_trial
    except Exception as e:
        logger.error(f"Error parsing subscription_end_date: {e}")
        return "none", None, False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Ongeldige token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
        
        # Update subscription status
        status, end_date, is_trial = get_subscription_status(user)
        user["subscription_status"] = status
        user["subscription_end_date"] = end_date
        user["is_trial"] = is_trial
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

async def get_current_active_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user and verify they have an active subscription or trial"""
    user = await get_current_user(credentials)
    
    # Superadmin always has access
    if user.get("role") == "superadmin":
        return user
    
    # Check subscription - allow both active and trial
    status = user.get("subscription_status")
    if status not in ("active", "trial"):
        raise HTTPException(
            status_code=403, 
            detail="Uw abonnement is verlopen. Ga naar Abonnement om uw account te activeren."
        )
    
    return user

async def get_superadmin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify current user is superadmin"""
    user = await get_current_user(credentials)
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Alleen voor beheerders")
    return user

async def get_user_active_addons(user_id: str) -> List[str]:
    """Get list of active addon slugs for a user"""
    now = datetime.now(timezone.utc)
    user_addons = await db.user_addons.find({
        "user_id": user_id,
        "status": "active"
    }).to_list(length=100)
    
    active_slugs = []
    for ua in user_addons:
        # Check if addon is still valid (not expired)
        end_date = ua.get("end_date")
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt < now:
                    # Expired, update status
                    await db.user_addons.update_one(
                        {"id": ua["id"]},
                        {"$set": {"status": "expired"}}
                    )
                    continue
            except Exception:
                pass
        
        # Get addon info
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        if addon and addon.get("is_active", True):
            active_slugs.append(addon.get("slug", ""))
    
    return active_slugs

async def user_has_addon(user_id: str, addon_slug: str) -> bool:
    """Check if user has a specific addon active"""
    active_addons = await get_user_active_addons(user_id)
    return addon_slug in active_addons

async def get_current_active_user_with_addon(addon_slug: str):
    """Dependency factory for checking addon access"""
    async def dependency(credentials: HTTPAuthorizationCredentials = Depends(security)):
        user = await get_current_user(credentials)
        
        # Superadmin always has access
        if user.get("role") == "superadmin":
            return user
        
        # Check subscription first
        status = user.get("subscription_status")
        if status not in ("active", "trial"):
            raise HTTPException(
                status_code=403, 
                detail="Uw abonnement is verlopen. Ga naar Abonnement om uw account te activeren."
            )
        
        # Check addon
        has_addon = await user_has_addon(user["id"], addon_slug)
        if not has_addon:
            raise HTTPException(
                status_code=403,
                detail=f"U heeft de add-on '{addon_slug}' niet geactiveerd. Ga naar Abonnement om deze te activeren."
            )
        
        return user
    return dependency

def format_currency(amount: float) -> str:
    """Format amount as SRD currency"""
    return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

# ==================== WORKSPACE MIDDLEWARE & HELPERS ====================

async def get_workspace_from_host(host: str) -> Optional[dict]:
    """Get workspace based on host/subdomain"""
    if not host:
        return None
    
    # Remove port if present
    host = host.split(':')[0]
    
    # Check for subdomain (e.g., klantnaam.facturatie.sr)
    if '.' in host and not host.startswith('www.'):
        subdomain = host.split('.')[0]
        if subdomain not in ['www', 'api', 'admin', 'localhost', 'modular-erp-20']:
            workspace = await db.workspaces.find_one(
                {"domain.subdomain": subdomain, "status": "active"},
                {"_id": 0}
            )
            if workspace:
                return workspace
    
    # Check for custom domain
    workspace = await db.workspaces.find_one(
        {"domain.custom_domain": host, "status": "active"},
        {"_id": 0}
    )
    return workspace

async def get_user_workspace(user_id: str) -> Optional[dict]:
    """Get workspace for a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "workspace_id": 1})
    if user and user.get("workspace_id"):
        return await db.workspaces.find_one({"id": user["workspace_id"]}, {"_id": 0})
    return None

async def create_workspace_for_user(user_id: str, user_name: str, company_name: str = None) -> dict:
    """Automatically create a workspace for a new user"""
    import re
    
    # Generate slug from company name or user name
    base_name = company_name or user_name
    slug = re.sub(r'[^a-z0-9]', '', base_name.lower())[:20]
    
    # Ensure unique slug
    existing = await db.workspaces.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    workspace = {
        "id": workspace_id,
        "name": company_name or f"{user_name}'s Workspace",
        "slug": slug,
        "owner_id": user_id,
        "status": "active",
        "domain": {
            "type": "subdomain",
            "subdomain": slug,
            "custom_domain": None,
            "dns_verified": True,
            "ssl_active": True,
            "dns_record_type": "A",
            "dns_record_value": SERVER_IP
        },
        "branding": {
            "logo_url": None,
            "favicon_url": None,
            "primary_color": "#0caf60",
            "secondary_color": "#059669",
            "portal_name": company_name or f"{user_name}'s Portaal"
        },
        "created_at": now,
        "updated_at": now,
        "error_message": None
    }
    
    await db.workspaces.insert_one(workspace)
    
    # Remove MongoDB's _id field to prevent serialization errors
    workspace.pop("_id", None)
    
    # Update user with workspace_id
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"workspace_id": workspace_id}}
    )
    
    return workspace

async def get_current_user_with_workspace(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
):
    """Get current user and their workspace context"""
    user = await get_current_user(credentials)
    
    # Superadmin has no workspace restriction
    if user.get("role") == "superadmin":
        user["workspace"] = None
        user["workspace_id"] = None
        return user
    
    # Get user's workspace
    workspace_id = user.get("workspace_id")
    if workspace_id:
        workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
        user["workspace"] = workspace
        user["workspace_id"] = workspace_id
    else:
        user["workspace"] = None
        user["workspace_id"] = None
    
    return user

def workspace_filter(user: dict, extra_filter: dict = None) -> dict:
    """Create a MongoDB filter that includes workspace_id for non-superadmin users"""
    base_filter = extra_filter or {}
    
    # Superadmin sees all
    if user.get("role") == "superadmin":
        return base_filter
    
    # Regular users only see their workspace data
    workspace_id = user.get("workspace_id")
    if workspace_id:
        return {**base_filter, "workspace_id": workspace_id}
    
    # No workspace = no data (shouldn't happen)
    return {**base_filter, "workspace_id": "none"}

async def activate_free_addons_for_user(user_id: str):
    """Automatisch alle gratis/auto-activate addons activeren voor een nieuwe gebruiker"""
    try:
        # Zoek alle addons die gratis of auto-activate zijn
        free_addons = await db.addons.find({
            "$or": [
                {"is_free": True},
                {"auto_activate": True},
                {"price": 0}
            ],
            "is_active": True
        }).to_list(100)
        
        now = datetime.now(timezone.utc)
        # Gratis addons krijgen een lange geldigheidsduur (10 jaar)
        end_date = (now + timedelta(days=3650)).isoformat()
        
        for addon in free_addons:
            addon_id = addon.get('id') or str(addon.get('_id'))
            addon_slug = addon.get('slug', '')
            
            # Check of al bestaat
            existing = await db.user_addons.find_one({
                "user_id": user_id,
                "addon_id": addon_id
            })
            
            if not existing:
                user_addon_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "addon_id": addon_id,
                    "addon_slug": addon_slug,
                    "status": "active",
                    "start_date": now.isoformat(),
                    "end_date": end_date,
                    "activated_at": now.isoformat(),
                    "created_at": now.isoformat(),
                    "is_free": True
                }
                await db.user_addons.insert_one(user_addon_doc)
                logger.info(f"Gratis addon '{addon_slug}' geactiveerd voor user {user_id}")
    except Exception as e:
        logger.error(f"Fout bij activeren gratis addons: {e}")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    # Check if this is the first user or superadmin email
    user_count = await db.users.count_documents({})
    is_superadmin = user_count == 0 or user_data.email == SUPER_ADMIN_EMAIL
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # New customers get a 3-day trial
    trial_end_date = None
    is_trial = False
    if not is_superadmin:
        trial_end_date = (now + timedelta(days=TRIAL_DAYS)).isoformat()
        is_trial = True
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "company_name": user_data.company_name,
        "role": "superadmin" if is_superadmin else "customer",
        "subscription_end_date": trial_end_date,
        "is_trial": is_trial,
        "created_at": now.isoformat(),
        "workspace_id": None  # Will be set after workspace creation
    }
    
    await db.users.insert_one(user_doc)
    
    # Automatically create workspace for non-superadmin users
    workspace = None
    if not is_superadmin:
        workspace = await create_workspace_for_user(
            user_id, 
            user_data.name, 
            user_data.company_name
        )
        user_doc["workspace_id"] = workspace["id"]
        
        # Automatisch gratis boekhouding module activeren
        await activate_free_addons_for_user(user_id)
    
    token = create_token(user_id, user_data.email)
    
    status, end_date, _ = get_subscription_status(user_doc)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            company_name=user_data.company_name,
            role=user_doc["role"],
            subscription_status=status,
            subscription_end_date=end_date,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """Login with workspace validation for subdomains/custom domains"""
    
    # Get the origin domain from the request headers
    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")
    x_workspace_domain = request.headers.get("x-workspace-domain", "")
    
    # Determine the domain being accessed
    access_domain = x_workspace_domain or ""
    if not access_domain and origin:
        # Extract domain from origin (e.g., https://subdomain.facturatie.sr -> subdomain.facturatie.sr)
        access_domain = origin.replace("https://", "").replace("http://", "").split("/")[0]
    if not access_domain and referer:
        access_domain = referer.replace("https://", "").replace("http://", "").split("/")[0]
    
    # Define main domains (where anyone can login)
    main_domains = ['facturatie.sr', 'www.facturatie.sr', 'app.facturatie.sr', 'localhost', '127.0.0.1', 'localhost:3000']
    
    # Check if accessing from a workspace subdomain or custom domain
    workspace_slug = None
    custom_domain = None
    
    if access_domain and access_domain not in main_domains:
        if access_domain.endswith('.facturatie.sr'):
            # Subdomain - extract workspace slug
            workspace_slug = access_domain.replace('.facturatie.sr', '')
        else:
            # Custom domain
            custom_domain = access_domain
    
    # Find the user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        logger.warning(f"Login failed: User not found for email {credentials.email}")
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        logger.warning(f"Login failed: Invalid password for {credentials.email}")
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    # If accessing from workspace subdomain or custom domain, validate workspace membership
    if workspace_slug or custom_domain:
        # Skip workspace validation for superadmin and demo account
        if user.get("role") != "superadmin" and user.get("email") != DEMO_ACCOUNT_EMAIL:
            # Find the workspace
            workspace = None
            if workspace_slug:
                workspace = await db.workspaces.find_one({"slug": workspace_slug})
            elif custom_domain:
                workspace = await db.workspaces.find_one({
                    "$or": [
                        {"domain.custom_domain": custom_domain},
                        {"domain.subdomain": custom_domain}
                    ]
                })
            
            if workspace:
                # Check if user belongs to this workspace
                user_workspace_id = user.get("workspace_id")
                workspace_id = workspace.get("id")
                
                # Also check if user is in the workspace's users list
                workspace_users = workspace.get("users", [])
                user_id = user.get("id")
                
                if user_workspace_id != workspace_id and user_id not in workspace_users:
                    logger.warning(f"Login failed: User {credentials.email} does not belong to workspace {workspace_slug or custom_domain}")
                    raise HTTPException(
                        status_code=403, 
                        detail="U heeft geen toegang tot deze workspace. Neem contact op met de beheerder."
                    )
            else:
                # Workspace not found - might be a new/unconfigured domain
                logger.warning(f"Login attempt on unknown workspace domain: {workspace_slug or custom_domain}")
    
    token = create_token(user["id"], user["email"])
    
    status, end_date, _ = get_subscription_status(user)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            company_name=user.get("company_name"),
            role=user.get("role", "customer"),
            subscription_status=status,
            subscription_end_date=end_date,
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        company_name=current_user.get("company_name"),
        role=current_user.get("role", "customer"),
        subscription_status=current_user.get("subscription_status", "none"),
        subscription_end_date=current_user.get("subscription_end_date"),
        created_at=current_user["created_at"],
        logo=current_user.get("logo"),
        phone=current_user.get("phone"),
        address=current_user.get("address"),
        profile_photo=current_user.get("profile_photo")
    )

# Profile Update Models
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

@api_router.put("/user/profile")
async def update_user_profile(
    profile_data: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information"""
    user_id = current_user["id"]
    update_data = {}
    
    # Update basic fields if provided
    if profile_data.name:
        update_data["name"] = profile_data.name
    if profile_data.email:
        # Check if email is already in use by another user
        existing = await db.users.find_one({
            "email": profile_data.email,
            "id": {"$ne": user_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="E-mail is al in gebruik")
        update_data["email"] = profile_data.email
    if profile_data.phone is not None:
        update_data["phone"] = profile_data.phone
    if profile_data.address is not None:
        update_data["address"] = profile_data.address
    
    # Handle password change
    if profile_data.new_password:
        if not profile_data.current_password:
            raise HTTPException(status_code=400, detail="Huidig wachtwoord is vereist")
        
        # Verify current password
        user = await db.users.find_one({"id": user_id})
        if not user or not bcrypt.checkpw(
            profile_data.current_password.encode('utf-8'),
            user["password"].encode('utf-8')
        ):
            raise HTTPException(status_code=400, detail="Huidig wachtwoord is onjuist")
        
        # Hash new password
        hashed = bcrypt.hashpw(profile_data.new_password.encode('utf-8'), bcrypt.gensalt())
        update_data["password"] = hashed.decode('utf-8')
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    return {"message": "Profiel bijgewerkt", "success": True}

@api_router.post("/user/profile/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload user profile photo"""
    user_id = current_user["id"]
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Alleen JPG, PNG en WebP bestanden zijn toegestaan")
    
    # Read and validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Bestand is te groot (max 5MB)")
    
    try:
        # Process image with PIL
        img = PILImage.open(BytesIO(contents))
        
        # Resize if too large (max 500x500)
        max_size = (500, 500)
        img.thumbnail(max_size, PILImage.Resampling.LANCZOS)
        
        # Convert to RGB if necessary (for PNG with transparency)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Save to bytes
        output = BytesIO()
        img.save(output, format='JPEG', quality=85)
        output.seek(0)
        
        # Generate unique filename
        filename = f"profile_{user_id}_{uuid.uuid4().hex[:8]}.jpg"
        
        # Store as base64 in database (simple solution)
        photo_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
        photo_url = f"data:image/jpeg;base64,{photo_base64}"
        
        # Update user
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "profile_photo": photo_url,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {"photo_url": photo_url, "message": "Foto geüpload"}
        
    except Exception as e:
        logging.error(f"Photo upload error: {e}")
        raise HTTPException(status_code=500, detail="Fout bij verwerken afbeelding")

@api_router.get("/workspace/current")
async def get_current_workspace(current_user: dict = Depends(get_current_user)):
    """Get the current user's workspace with branding"""
    if current_user.get("role") == "superadmin":
        return {
            "workspace": None,
            "branding": {
                "logo_url": None,
                "primary_color": "#0caf60",
                "secondary_color": "#059669",
                "portal_name": "Facturatie Admin"
            }
        }
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        # Create workspace if user doesn't have one (legacy users)
        workspace = await create_workspace_for_user(
            current_user["id"],
            current_user["name"],
            current_user.get("company_name")
        )
    else:
        workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    
    if not workspace:
        return {
            "workspace": None,
            "branding": {
                "logo_url": None,
                "primary_color": "#0caf60",
                "secondary_color": "#059669",
                "portal_name": "Facturatie"
            }
        }
    
    return {
        "workspace": {
            "id": workspace["id"],
            "name": workspace["name"],
            "slug": workspace["slug"],
            "domain": workspace.get("domain", {})
        },
        "branding": workspace.get("branding", {
            "logo_url": None,
            "primary_color": "#0caf60",
            "secondary_color": "#059669",
            "portal_name": workspace["name"]
        })
    }

@api_router.put("/workspace/branding")
async def update_workspace_branding(
    branding: WorkspaceBranding,
    current_user: dict = Depends(get_current_user)
):
    """Update the current user's workspace branding"""
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "branding": branding.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Branding bijgewerkt"}

# ==================== WORKSPACE SETTINGS (Customer) ====================

class WorkspaceSettingsUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None

class WorkspaceDomainUpdate(BaseModel):
    domain_type: str  # "subdomain" or "custom"
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None

class WorkspaceCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None

@api_router.get("/workspace/settings")
async def get_workspace_settings(current_user: dict = Depends(get_current_user)):
    """Get full workspace settings for the current user"""
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        return {"workspace": None, "has_workspace": False}
    
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        return {"workspace": None, "has_workspace": False}
    
    # Get server IP for DNS instructions
    server_ip = "72.62.174.80"  # Update with actual server IP
    main_domain = "facturatie.sr"
    
    domain = workspace.get("domain", {})
    domain_info = {
        **domain,
        "full_subdomain": f"{domain.get('subdomain', workspace['slug'])}.{main_domain}" if domain.get("type") == "subdomain" else None,
        "server_ip": server_ip,
        "dns_instructions": None
    }
    
    # Add DNS instructions for custom domains
    if domain.get("type") == "custom" and domain.get("custom_domain"):
        domain_info["dns_instructions"] = {
            "record_type": "A",
            "host": domain["custom_domain"],
            "value": server_ip,
            "ttl": "3600",
            "instructions": f"Maak een A-record aan voor {domain['custom_domain']} die wijst naar {server_ip}"
        }
    
    return {
        "workspace": {
            "id": workspace["id"],
            "name": workspace["name"],
            "slug": workspace["slug"],
            "status": workspace.get("status", "active"),
            "owner_id": workspace.get("owner_id"),
            "created_at": workspace.get("created_at"),
            "updated_at": workspace.get("updated_at")
        },
        "domain": domain_info,
        "branding": workspace.get("branding", {}),
        "has_workspace": True,
        "is_owner": workspace.get("owner_id") == current_user["id"]
    }

@api_router.get("/workspace/branding-public/{slug_or_domain}")
async def get_workspace_branding_public(slug_or_domain: str):
    """Get workspace branding by slug, subdomain, or custom domain (public, no auth required)"""
    # Try to find by slug first
    workspace = await db.workspaces.find_one({"slug": slug_or_domain}, {"_id": 0})
    
    # If not found, try by subdomain
    if not workspace:
        workspace = await db.workspaces.find_one(
            {"domain.subdomain": slug_or_domain}, 
            {"_id": 0}
        )
    
    # If not found, try by custom domain (full domain)
    if not workspace:
        workspace = await db.workspaces.find_one(
            {"domain.custom_domain": slug_or_domain}, 
            {"_id": 0}
        )
    
    # If not found, try by custom domain (subdomain.facturatie.sr format)
    if not workspace:
        full_subdomain = f"{slug_or_domain}.facturatie.sr"
        workspace = await db.workspaces.find_one(
            {"domain.custom_domain": full_subdomain}, 
            {"_id": 0}
        )
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    branding = workspace.get("branding", {})
    
    return {
        "workspace_id": workspace["id"],
        "workspace_name": workspace["name"],
        "slug": workspace["slug"],
        "logo_url": branding.get("logo_url"),
        "favicon_url": branding.get("favicon_url"),
        "primary_color": branding.get("primary_color", "#0caf60"),
        "secondary_color": branding.get("secondary_color", "#059669"),
        "portal_name": branding.get("portal_name") or workspace["name"],
        "login_background_url": branding.get("login_background_url"),
        "login_image_url": branding.get("login_image_url"),
        "register_image_url": branding.get("register_image_url"),
        "welcome_text": branding.get("welcome_text"),
        "tagline": branding.get("tagline")
    }

@api_router.put("/workspace/settings")
async def update_workspace_settings(
    settings: WorkspaceSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update workspace name and/or slug"""
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    # Only owner can update settings
    if workspace["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Alleen de eigenaar kan workspace instellingen wijzigen")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if settings.name:
        update_data["name"] = settings.name
        # Update portal name in branding if it matches old name
        if workspace.get("branding", {}).get("portal_name") == workspace["name"]:
            update_data["branding.portal_name"] = settings.name
    
    if settings.slug:
        import re
        slug = settings.slug.lower().strip()
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', slug):
            raise HTTPException(status_code=400, detail="Slug mag alleen kleine letters, cijfers en koppeltekens bevatten")
        
        # Check if slug is already in use
        existing = await db.workspaces.find_one({"slug": slug, "id": {"$ne": workspace_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Deze slug is al in gebruik")
        
        update_data["slug"] = slug
        # Update subdomain if using subdomain type
        if workspace.get("domain", {}).get("type") == "subdomain":
            update_data["domain.subdomain"] = slug
    
    await db.workspaces.update_one({"id": workspace_id}, {"$set": update_data})
    
    return {"message": "Workspace instellingen bijgewerkt"}

@api_router.put("/workspace/domain")
async def update_workspace_domain(
    domain_data: WorkspaceDomainUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update workspace domain settings"""
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    if workspace["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Alleen de eigenaar kan domein instellingen wijzigen")
    
    server_ip = "72.62.174.80"
    
    if domain_data.domain_type == "subdomain":
        subdomain = domain_data.subdomain or workspace["slug"]
        
        # Check if subdomain is available
        existing = await db.workspaces.find_one({
            "domain.subdomain": subdomain,
            "id": {"$ne": workspace_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Dit subdomein is al in gebruik")
        
        domain_config = {
            "type": "subdomain",
            "subdomain": subdomain,
            "custom_domain": None,
            "dns_verified": True,
            "ssl_active": True,
            "dns_record_type": "A",
            "dns_record_value": server_ip
        }
        status = "active"
        
    elif domain_data.domain_type == "custom":
        if not domain_data.custom_domain:
            raise HTTPException(status_code=400, detail="Custom domein is verplicht")
        
        # Clean domain
        custom_domain = domain_data.custom_domain.lower().strip()
        if custom_domain.startswith("http://") or custom_domain.startswith("https://"):
            custom_domain = custom_domain.split("://")[1]
        custom_domain = custom_domain.rstrip("/")
        
        # Check if domain is available
        existing = await db.workspaces.find_one({
            "domain.custom_domain": custom_domain,
            "id": {"$ne": workspace_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
        
        domain_config = {
            "type": "custom",
            "subdomain": None,
            "custom_domain": custom_domain,
            "dns_verified": False,
            "ssl_active": False,
            "dns_record_type": "A",
            "dns_record_value": server_ip
        }
        status = "pending"
    else:
        raise HTTPException(status_code=400, detail="Ongeldig domein type")
    
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "domain": domain_config,
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Domein instellingen bijgewerkt",
        "domain": domain_config,
        "status": status
    }

@api_router.post("/workspace/domain/verify")
async def verify_workspace_domain(current_user: dict = Depends(get_current_user)):
    """Verify DNS for custom domain and auto-configure Nginx + SSL"""
    import socket
    import subprocess
    
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain = workspace.get("domain", {})
    if domain.get("type") != "custom" or not domain.get("custom_domain"):
        raise HTTPException(status_code=400, detail="Geen custom domein geconfigureerd")
    
    custom_domain = domain["custom_domain"]
    server_ip = "72.62.174.80"
    
    try:
        ip_addresses = socket.gethostbyname_ex(custom_domain)[2]
        
        if server_ip in ip_addresses:
            # DNS is correct! Now auto-configure Nginx and SSL
            try:
                # Run auto domain setup script
                script_path = "/home/clp/htdocs/facturatie.sr/auto_domain_setup.sh"
                result = subprocess.run(
                    ["sudo", script_path, custom_domain, workspace_id],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                ssl_success = "SUCCESS" in result.stdout
                
                await db.workspaces.update_one(
                    {"id": workspace_id},
                    {"$set": {
                        "domain.dns_verified": True,
                        "domain.ssl_active": ssl_success,
                        "status": "active",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                if ssl_success:
                    return {
                        "success": True,
                        "message": f"DNS geverifieerd en domein geconfigureerd!",
                        "domain": f"https://{custom_domain}",
                        "ssl_active": True,
                        "details": "Nginx en SSL zijn automatisch geconfigureerd"
                    }
                else:
                    return {
                        "success": True,
                        "message": f"DNS geverifieerd! SSL wordt nog geconfigureerd.",
                        "domain": f"https://{custom_domain}",
                        "ssl_active": False,
                        "details": result.stderr or "SSL configuratie in behandeling"
                    }
                    
            except subprocess.TimeoutExpired:
                return {
                    "success": True,
                    "message": f"DNS geverifieerd! Server configuratie duurt langer dan verwacht.",
                    "domain": f"https://{custom_domain}",
                    "ssl_active": False
                }
            except Exception as e:
                logger.error(f"Auto domain setup error: {e}")
                await db.workspaces.update_one(
                    {"id": workspace_id},
                    {"$set": {
                        "domain.dns_verified": True,
                        "status": "active",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {
                    "success": True,
                    "message": f"DNS geverifieerd! Handmatige server configuratie nodig.",
                    "domain": f"https://{custom_domain}",
                    "ssl_active": False,
                    "manual_setup": True
                }
        else:
            return {
                "success": False,
                "message": f"DNS wijst naar {', '.join(ip_addresses)} in plaats van {server_ip}",
                "instructions": f"Wijzig het A-record van {custom_domain} naar {server_ip}"
            }
    except socket.gaierror:
        return {
            "success": False,
            "message": f"Domein {custom_domain} niet gevonden in DNS",
            "instructions": f"Maak een A-record aan voor {custom_domain} dat wijst naar {server_ip}"
        }

@api_router.post("/workspace/create")
async def create_user_workspace(
    workspace_data: WorkspaceCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new workspace for a user who doesn't have one"""
    import re
    
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin kan geen workspace aanmaken")
    
    # Check if user already has a workspace
    if current_user.get("workspace_id"):
        existing = await db.workspaces.find_one({"id": current_user["workspace_id"]})
        if existing:
            raise HTTPException(status_code=400, detail="Je hebt al een workspace")
    
    # Generate slug from name if not provided
    slug = workspace_data.slug or re.sub(r'[^a-z0-9]', '', workspace_data.name.lower())[:20]
    
    # Validate slug
    if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', slug):
        raise HTTPException(status_code=400, detail="Slug mag alleen kleine letters, cijfers en koppeltekens bevatten")
    
    # Check if slug is available
    existing = await db.workspaces.find_one({"slug": slug})
    if existing:
        # Add random suffix
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    server_ip = "72.62.174.80"
    
    workspace = {
        "id": workspace_id,
        "name": workspace_data.name,
        "slug": slug,
        "owner_id": current_user["id"],
        "status": "active",
        "domain": {
            "type": "subdomain",
            "subdomain": slug,
            "custom_domain": None,
            "dns_verified": True,
            "ssl_active": True,
            "dns_record_type": "A",
            "dns_record_value": server_ip
        },
        "branding": {
            "logo_url": None,
            "favicon_url": None,
            "primary_color": "#0caf60",
            "secondary_color": "#059669",
            "portal_name": workspace_data.name
        },
        "created_at": now,
        "updated_at": now
    }
    
    await db.workspaces.insert_one(workspace)
    # Remove MongoDB _id to prevent serialization errors
    workspace.pop("_id", None)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"workspace_id": workspace_id}})
    
    return {
        "message": "Workspace aangemaakt",
        "workspace": {
            "id": workspace_id,
            "name": workspace_data.name,
            "slug": slug,
            "domain": workspace["domain"]
        }
    }

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u instructies"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.users.update_one(
        {"email": request.email},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_expiry.isoformat()
        }}
    )
    
    # Try to send email using email service first
    try:
        email_service = get_email_service(db)
        settings = await email_service.get_settings("global")
        
        frontend_url = os.environ.get("FRONTEND_URL", "https://facturatie.sr")
        reset_link = f"{frontend_url}/reset-wachtwoord/{reset_token}"
        
        if settings and settings.get("enabled"):
            # Use email service
            result = await email_service.send_password_reset_email(
                to_email=request.email,
                customer_name=user.get('name', 'Klant'),
                reset_code=reset_token[:8].upper(),
                reset_url=reset_link
            )
            if result.get("success"):
                logger.info(f"Password reset email sent to {request.email} via email service")
        else:
            # Fallback to old method
            smtp_host = os.environ.get("SMTP_HOST", "smtp.hostinger.com")
            smtp_port = int(os.environ.get("SMTP_PORT", "465"))
            smtp_user = os.environ.get("SMTP_USER", "info@facturatie.sr")
            smtp_password = os.environ.get("SMTP_PASSWORD", "")
            
            if smtp_password:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "Wachtwoord Resetten - Facturatie N.V."
                msg["From"] = smtp_user
                msg["To"] = request.email
                
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #0caf60;">Facturatie N.V.</h1>
                    </div>
                    <h2>Wachtwoord Resetten</h2>
                    <p>Beste {user.get('name', 'Klant')},</p>
                    <p>U heeft een verzoek ingediend om uw wachtwoord te resetten.</p>
                    <p>Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background-color: #0caf60; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 25px; font-weight: bold;">
                            Wachtwoord Resetten
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Deze link is 1 uur geldig. Als u geen wachtwoord reset heeft aangevraagd, 
                        kunt u deze e-mail negeren.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Facturatie N.V. - Verhuurbeheersysteem
                    </p>
                </body>
                </html>
                """
                
                msg.attach(MIMEText(html_content, "html"))
                
                with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, request.email, msg.as_string())
                
                logger.info(f"Password reset email sent to {request.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Don't expose email sending errors to user
    
    return {"message": "Als dit e-mailadres bestaat, ontvangt u instructies"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    # Find user with valid reset token
    user = await db.users.find_one(
        {"reset_token": request.token},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen reset link")
    
    # Check if token is expired
    expiry = user.get("reset_token_expiry")
    if expiry:
        try:
            expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expiry_dt:
                raise HTTPException(status_code=400, detail="Reset link is verlopen")
        except Exception:
            raise HTTPException(status_code=400, detail="Ongeldige reset link")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens bevatten")
    
    # Hash new password
    hashed_password = hash_password(request.new_password)
    
    # Update password and clear reset token
    await db.users.update_one(
        {"reset_token": request.token},
        {"$set": {"password": hashed_password},
         "$unset": {"reset_token": "", "reset_token_expiry": ""}}
    )
    
    return {"message": "Wachtwoord succesvol gewijzigd"}

# ==================== TENANT ROUTES ====================

@api_router.post("/tenants", response_model=TenantResponse)
async def create_tenant(tenant_data: TenantCreate, current_user: dict = Depends(get_current_active_user)):
    tenant_id = str(uuid.uuid4())
    tenant_doc = {
        "id": tenant_id,
        "name": tenant_data.name,
        "email": tenant_data.email,
        "phone": tenant_data.phone,
        "address": tenant_data.address,
        "id_number": tenant_data.id_number,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"],
        "workspace_id": current_user.get("workspace_id")  # Workspace isolation
    }
    
    await db.tenants.insert_one(tenant_doc)
    tenant_doc.pop("_id", None)
    
    return TenantResponse(**tenant_doc)

@api_router.get("/tenants", response_model=List[TenantResponse])
async def get_tenants(current_user: dict = Depends(get_current_active_user)):
    # Use workspace filter for data isolation
    query_filter = {"user_id": current_user["id"]}
    if current_user.get("workspace_id"):
        query_filter = {"$or": [
            {"workspace_id": current_user["workspace_id"]},
            {"user_id": current_user["id"], "workspace_id": {"$exists": False}}  # Legacy data
        ]}
    
    tenants = await db.tenants.find(query_filter, {"_id": 0}).to_list(1000)
    
    result = []
    for t in tenants:
        try:
            # Safely build tenant response with defaults for missing fields
            result.append(TenantResponse(
                id=t.get("id", ""),
                name=t.get("name", "Onbekend"),
                email=t.get("email"),
                phone=t.get("phone", ""),
                address=t.get("address"),
                id_number=t.get("id_number"),
                created_at=t.get("created_at", ""),
                user_id=t.get("user_id", "")
            ))
        except Exception as e:
            logger.error(f"Error processing tenant {t.get('id')}: {e}")
            continue
    return result


# ==================== TENANT PORTAL ACCOUNT MANAGEMENT (by landlord) ====================
# Note: These routes MUST come BEFORE /tenants/{tenant_id} to avoid path conflicts

class CreatePortalAccountRequest(BaseModel):
    tenant_id: str
    password: str

@api_router.get("/tenants/portal-accounts")
async def get_tenant_portal_accounts(current_user: dict = Depends(get_current_active_user)):
    """Get all tenant portal accounts for this landlord"""
    accounts = await db.tenant_accounts.find(
        {"landlord_user_id": current_user["id"]},
        {"_id": 0, "id": 1, "tenant_id": 1, "email": 1, "name": 1, "created_at": 1, "last_login": 1, "is_active": 1}
    ).to_list(1000)
    return accounts


@api_router.post("/tenants/create-portal-account")
async def create_tenant_portal_account(
    data: CreatePortalAccountRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a portal account for a tenant (by landlord)"""
    # Verify tenant belongs to this landlord
    tenant = await db.tenants.find_one(
        {"id": data.tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    if not tenant.get("email"):
        raise HTTPException(status_code=400, detail="Huurder heeft geen e-mailadres")
    
    # Check if account already exists
    existing = await db.tenant_accounts.find_one(
        {"tenant_id": data.tenant_id},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Deze huurder heeft al een portaal account")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens bevatten")
    
    # Create account
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    account_doc = {
        "id": account_id,
        "tenant_id": data.tenant_id,
        "email": tenant["email"],
        "password": hash_password(data.password),
        "name": tenant["name"],
        "landlord_user_id": current_user["id"],
        "created_at": now.isoformat(),
        "last_login": None,
        "is_active": True
    }
    
    await db.tenant_accounts.insert_one(account_doc)
    
    return {
        "message": f"Portaal account aangemaakt voor {tenant['name']}",
        "account_id": account_id,
        "email": tenant["email"]
    }


# ==================== TENANT CRUD (must come after static routes) ====================

@api_router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Safely build response with defaults
    return TenantResponse(
        id=tenant.get("id", tenant_id),
        name=tenant.get("name", "Onbekend"),
        email=tenant.get("email"),
        phone=tenant.get("phone", ""),
        address=tenant.get("address"),
        id_number=tenant.get("id_number"),
        created_at=tenant.get("created_at", ""),
        user_id=tenant.get("user_id", current_user["id"])
    )

@api_router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: str, tenant_data: TenantUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in tenant_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.tenants.update_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return TenantResponse(**tenant)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.tenants.delete_one({"id": tenant_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return {"message": "Huurder verwijderd"}


@api_router.delete("/tenants/portal-accounts/{tenant_id}")
async def delete_tenant_portal_account(
    tenant_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a tenant's portal account"""
    result = await db.tenant_accounts.delete_one({
        "tenant_id": tenant_id,
        "landlord_user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portaal account niet gevonden")
    return {"message": "Portaal account verwijderd"}


@api_router.put("/tenants/portal-accounts/{tenant_id}/reset-password")
async def reset_tenant_portal_password(
    tenant_id: str,
    data: CreatePortalAccountRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Reset a tenant's portal password"""
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens bevatten")
    
    result = await db.tenant_accounts.update_one(
        {"tenant_id": tenant_id, "landlord_user_id": current_user["id"]},
        {"$set": {"password": hash_password(data.password)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portaal account niet gevonden")
    return {"message": "Wachtwoord gereset"}


# ==================== APARTMENT ROUTES ====================

@api_router.post("/apartments", response_model=ApartmentResponse)
async def create_apartment(apt_data: ApartmentCreate, current_user: dict = Depends(get_current_active_user)):
    apt_id = str(uuid.uuid4())
    apt_doc = {
        "id": apt_id,
        "name": apt_data.name,
        "address": apt_data.address,
        "rent_amount": apt_data.rent_amount,
        "description": apt_data.description,
        "bedrooms": apt_data.bedrooms or 1,
        "bathrooms": apt_data.bathrooms or 1,
        "status": "available",
        "tenant_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"],
        "workspace_id": current_user.get("workspace_id")  # Workspace isolation
    }
    
    await db.apartments.insert_one(apt_doc)
    apt_doc.pop("_id", None)
    
    return ApartmentResponse(**apt_doc)

@api_router.get("/apartments", response_model=List[ApartmentResponse])
async def get_apartments(current_user: dict = Depends(get_current_active_user)):
    # Use workspace filter for data isolation
    query_filter = {"user_id": current_user["id"]}
    if current_user.get("workspace_id"):
        query_filter = {"$or": [
            {"workspace_id": current_user["workspace_id"]},
            {"user_id": current_user["id"], "workspace_id": {"$exists": False}}  # Legacy data
        ]}
    
    apartments = await db.apartments.find(query_filter, {"_id": 0}).to_list(1000)
    
    # Batch fetch tenant names to avoid N+1 queries
    tenant_ids = [apt["tenant_id"] for apt in apartments if apt.get("tenant_id")]
    tenant_map = {}
    if tenant_ids:
        tenants = await db.tenants.find(
            {"id": {"$in": tenant_ids}},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(1000)
        tenant_map = {t["id"]: t["name"] for t in tenants}
    
    result = []
    for apt in apartments:
        try:
            # Safely build apartment response with defaults for missing fields
            result.append(ApartmentResponse(
                id=apt.get("id", ""),
                name=apt.get("name", "Onbekend"),
                address=apt.get("address", ""),
                rent_amount=apt.get("rent_amount", 0) or 0,
                description=apt.get("description"),
                bedrooms=apt.get("bedrooms", 1) or 1,
                bathrooms=apt.get("bathrooms", 1) or 1,
                status=apt.get("status", "available"),
                tenant_id=apt.get("tenant_id"),
                tenant_name=tenant_map.get(apt.get("tenant_id")) if apt.get("tenant_id") else None,
                created_at=apt.get("created_at", ""),
                user_id=apt.get("user_id", "")
            ))
        except Exception as e:
            logger.error(f"Error processing apartment {apt.get('id')}: {e}")
            continue
    return result

@api_router.get("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def get_apartment(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    apt = await db.apartments.find_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    tenant_name = None
    if apt.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
        tenant_name = tenant.get("name") if tenant else None
    
    # Safely build response with defaults
    return ApartmentResponse(
        id=apt.get("id", apartment_id),
        name=apt.get("name", "Onbekend"),
        address=apt.get("address", ""),
        rent_amount=apt.get("rent_amount", 0) or 0,
        description=apt.get("description"),
        bedrooms=apt.get("bedrooms", 1) or 1,
        bathrooms=apt.get("bathrooms", 1) or 1,
        status=apt.get("status", "available"),
        tenant_id=apt.get("tenant_id"),
        tenant_name=tenant_name,
        created_at=apt.get("created_at", ""),
        user_id=apt.get("user_id", current_user["id"])
    )

@api_router.put("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def update_apartment(apartment_id: str, apt_data: ApartmentUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in apt_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.apartments.update_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    apt = await db.apartments.find_one({"id": apartment_id}, {"_id": 0})
    
    tenant_name = None
    if apt.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": apt["tenant_id"]}, {"_id": 0, "name": 1})
        tenant_name = tenant.get("name") if tenant else None
    
    # Safely build response with defaults
    return ApartmentResponse(
        id=apt.get("id", apartment_id),
        name=apt.get("name", "Onbekend"),
        address=apt.get("address", ""),
        rent_amount=apt.get("rent_amount", 0) or 0,
        description=apt.get("description"),
        bedrooms=apt.get("bedrooms", 1) or 1,
        bathrooms=apt.get("bathrooms", 1) or 1,
        status=apt.get("status", "available"),
        tenant_id=apt.get("tenant_id"),
        tenant_name=tenant_name,
        created_at=apt.get("created_at", ""),
        user_id=apt.get("user_id", current_user["id"])
    )

@api_router.delete("/apartments/{apartment_id}")
async def delete_apartment(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.apartments.delete_one({"id": apartment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

@api_router.post("/apartments/{apartment_id}/assign-tenant")
async def assign_tenant(apartment_id: str, tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    # Verify apartment exists
    apt = await db.apartments.find_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # Verify tenant exists
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Update apartment
    await db.apartments.update_one(
        {"id": apartment_id},
        {"$set": {"tenant_id": tenant_id, "status": "occupied"}}
    )
    
    return {"message": "Huurder toegewezen aan appartement"}

@api_router.post("/apartments/{apartment_id}/remove-tenant")
async def remove_tenant(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.apartments.update_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"$set": {"tenant_id": None, "status": "available"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    return {"message": "Huurder verwijderd van appartement"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify tenant and apartment
    tenant = await db.tenants.find_one({"id": payment_data.tenant_id, "user_id": current_user["id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    apt = await db.apartments.find_one({"id": payment_data.apartment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # If loan payment, verify loan exists
    if payment_data.payment_type == "loan" and payment_data.loan_id:
        loan = await db.loans.find_one({"id": payment_data.loan_id, "user_id": current_user["id"]}, {"_id": 0})
        if not loan:
            raise HTTPException(status_code=404, detail="Lening niet gevonden")
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "tenant_id": payment_data.tenant_id,
        "apartment_id": payment_data.apartment_id,
        "amount": payment_data.amount,
        "payment_date": payment_data.payment_date,
        "payment_type": payment_data.payment_type,
        "description": payment_data.description,
        "period_month": payment_data.period_month,
        "period_year": payment_data.period_year,
        "loan_id": payment_data.loan_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.payments.insert_one(payment_doc)
    
    return PaymentResponse(
        **payment_doc,
        tenant_name=tenant["name"],
        apartment_name=apt["name"]
    )

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(current_user: dict = Depends(get_current_active_user)):
    payments = await db.payments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    
    # Batch fetch tenant and apartment names to avoid N+1 queries
    tenant_ids = list(set(p["tenant_id"] for p in payments))
    apt_ids = list(set(p["apartment_id"] for p in payments))
    
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apt_map = {a["id"]: a["name"] for a in apts}
    
    for payment in payments:
        payment["tenant_name"] = tenant_map.get(payment["tenant_id"])
        payment["apartment_name"] = apt_map.get(payment["apartment_id"])
    
    return [PaymentResponse(**p) for p in payments]

@api_router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, current_user: dict = Depends(get_current_active_user)):
    payment = await db.payments.find_one(
        {"id": payment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    tenant = await db.tenants.find_one({"id": payment["tenant_id"]}, {"_id": 0, "name": 1})
    apt = await db.apartments.find_one({"id": payment["apartment_id"]}, {"_id": 0, "name": 1})
    payment["tenant_name"] = tenant["name"] if tenant else None
    payment["apartment_name"] = apt["name"] if apt else None
    
    return PaymentResponse(**payment)

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.payments.delete_one({"id": payment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return {"message": "Betaling verwijderd"}

# ==================== DEPOSIT ROUTES ====================

@api_router.post("/deposits", response_model=DepositResponse)
async def create_deposit(deposit_data: DepositCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify tenant and apartment
    tenant = await db.tenants.find_one({"id": deposit_data.tenant_id, "user_id": current_user["id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    apt = await db.apartments.find_one({"id": deposit_data.apartment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    deposit_id = str(uuid.uuid4())
    deposit_doc = {
        "id": deposit_id,
        "tenant_id": deposit_data.tenant_id,
        "apartment_id": deposit_data.apartment_id,
        "amount": deposit_data.amount,
        "deposit_date": deposit_data.deposit_date,
        "status": deposit_data.status,
        "return_date": None,
        "return_amount": None,
        "notes": deposit_data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.deposits.insert_one(deposit_doc)
    
    return DepositResponse(
        **deposit_doc,
        tenant_name=tenant["name"],
        apartment_name=apt["name"]
    )

@api_router.get("/deposits", response_model=List[DepositResponse])
async def get_deposits(current_user: dict = Depends(get_current_active_user)):
    deposits = await db.deposits.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Batch fetch tenant and apartment names to avoid N+1 queries
    tenant_ids = list(set(d["tenant_id"] for d in deposits))
    apt_ids = list(set(d["apartment_id"] for d in deposits))
    
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apt_map = {a["id"]: a["name"] for a in apts}
    
    for deposit in deposits:
        deposit["tenant_name"] = tenant_map.get(deposit["tenant_id"])
        deposit["apartment_name"] = apt_map.get(deposit["apartment_id"])
    
    return [DepositResponse(**d) for d in deposits]

@api_router.put("/deposits/{deposit_id}", response_model=DepositResponse)
async def update_deposit(deposit_id: str, deposit_data: DepositUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in deposit_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.deposits.update_one(
        {"id": deposit_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    
    deposit = await db.deposits.find_one({"id": deposit_id}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": deposit["tenant_id"]}, {"_id": 0, "name": 1})
    apt = await db.apartments.find_one({"id": deposit["apartment_id"]}, {"_id": 0, "name": 1})
    deposit["tenant_name"] = tenant["name"] if tenant else None
    deposit["apartment_name"] = apt["name"] if apt else None
    
    return DepositResponse(**deposit)

@api_router.delete("/deposits/{deposit_id}")
async def delete_deposit(deposit_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.deposits.delete_one({"id": deposit_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    return {"message": "Borg verwijderd"}

# ==================== DEPOSIT REFUND PDF ====================

def create_deposit_refund_pdf(deposit, tenant, apt, user):
    """Create a modern styled deposit refund PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'RefundTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Company name from user
    company_name = user.get("company_name") if user and user.get("company_name") else "Facturatie N.V."
    
    # === HEADER SECTION ===
    
    # Left side: Logo or Company name
    left_content = []
    if user and user.get("logo"):
        try:
            logo_data = user["logo"]
            if "," in logo_data:
                logo_data = logo_data.split(",")[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=4*cm, height=2*cm)
            left_content.append(logo_img)
        except Exception as e:
            logger.error(f"Error adding logo: {e}")
            left_content.append(Paragraph(company_name, company_style))
    else:
        left_content.append(Paragraph(company_name, company_style))
    
    left_content.append(Paragraph("Verhuurbeheersysteem", small_text))
    
    # Right side: Title
    right_content = [Paragraph("BORG TERUGBETALING", title_style)]
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[10*cm, 7*cm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Green line separator
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === DOCUMENT DETAILS ROW ===
    doc_num = deposit["id"][:8].upper()
    return_date = deposit.get("return_date", "-")
    
    details_data = [
        [
            Paragraph("<b>Document Nr:</b>", normal_text),
            Paragraph(doc_num, bold_text),
            Paragraph("<b>Terugbetaaldatum:</b>", normal_text),
            Paragraph(return_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 4*cm, 5*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === CLIENT AND PROPERTY INFO ===
    tenant_name = tenant["name"] if tenant else "Onbekend"
    tenant_phone = tenant.get("phone", "-") if tenant else "-"
    tenant_email = tenant.get("email", "-") if tenant else "-"
    tenant_address = tenant.get("address", "-") if tenant else "-"
    
    apt_name = apt["name"] if apt else "Onbekend"
    apt_address = apt.get("address", "-") if apt else "-"
    
    info_left = [
        [Paragraph("TERUGBETAALD AAN", section_header)],
        [Paragraph(f"<b>{tenant_name}</b>", normal_text)],
        [Paragraph(f"Tel: {tenant_phone}", small_text)],
        [Paragraph(f"Email: {tenant_email}", small_text)],
        [Paragraph(f"Adres: {tenant_address}", small_text)],
    ]
    
    info_right = [
        [Paragraph("APPARTEMENT", section_header)],
        [Paragraph(f"<b>{apt_name}</b>", normal_text)],
        [Paragraph(f"Adres: {apt_address}", small_text)],
        [Paragraph("", small_text)],
        [Paragraph("", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === DETAILS TABLE ===
    original_amount = deposit.get("amount", 0)
    return_amount = deposit.get("return_amount", original_amount)
    deposit_date = deposit.get("deposit_date", "-")
    status_labels = {
        'returned': 'Volledig terugbetaald',
        'partial_returned': 'Deels terugbetaald',
        'held': 'In beheer'
    }
    status = status_labels.get(deposit.get("status", "returned"), "Terugbetaald")
    
    table_header = ['OMSCHRIJVING', 'DATUM', 'BEDRAG']
    table_data = [
        table_header,
        ['Oorspronkelijke borg gestort', deposit_date, format_currency(original_amount)],
        ['Terugbetaald bedrag', return_date, format_currency(return_amount)],
    ]
    
    items_table = Table(table_data, colWidths=[9*cm, 4*cm, 4*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#e8f5e9')),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === STATUS SECTION ===
    totals_data = [
        ['Status:', status],
        ['', ''],
        ['TERUGBETAALD BEDRAG:', format_currency(return_amount)],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 1), 10),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 2), (-1, 2), 14),
        ('TEXTCOLOR', (0, 2), (-1, 2), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 2), (-1, 2), 10),
        ('LINEABOVE', (0, 2), (-1, 2), 2, PRIMARY_GREEN),
    ]))
    
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 20))
    
    # === NOTES ===
    if deposit.get("notes"):
        elements.append(Paragraph("OPMERKINGEN", section_header))
        elements.append(Paragraph(deposit["notes"], normal_text))
        elements.append(Spacer(1, 20))
    
    # === FOOTER ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=15))
    
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph("Borg succesvol terugbetaald!", thank_you_style))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Dit document is gegenereerd door {company_name}", footer_style))
    elements.append(Paragraph("Bewaar dit document als bewijs van terugbetaling.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/deposits/{deposit_id}/refund-pdf")
async def generate_deposit_refund_pdf(deposit_id: str, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF for deposit refund"""
    # Get deposit data
    deposit = await db.deposits.find_one(
        {"id": deposit_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not deposit:
        raise HTTPException(status_code=404, detail="Borg niet gevonden")
    
    # Check if deposit is returned
    if deposit.get("status") not in ["returned", "partial_returned"]:
        raise HTTPException(status_code=400, detail="Borg is nog niet terugbetaald")
    
    tenant = await db.tenants.find_one({"id": deposit["tenant_id"]}, {"_id": 0})
    apt = await db.apartments.find_one({"id": deposit["apartment_id"]}, {"_id": 0})
    
    # Get user logo and company name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "logo": 1, "company_name": 1})
    
    # Create PDF
    buffer = create_deposit_refund_pdf(deposit, tenant, apt, user)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=borg_terugbetaling_{deposit_id[:8]}.pdf"
        }
    )

# ==================== RECEIPT/PDF ROUTES ====================

def create_modern_receipt_pdf(payment, tenant, apt, user, payment_id):
    """Create a modern styled receipt PDF"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    from reportlab.platypus import HRFlowable
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    ParagraphStyle(
        'TotalStyle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    )
    
    elements = []
    
    # Company name from user
    company_name = user.get("company_name") if user and user.get("company_name") else "Facturatie N.V."
    
    # === HEADER SECTION ===
    # Create header table with logo/company on left and KWITANTIE on right
    
    # Left side: Logo or Company name
    left_content = []
    if user and user.get("logo"):
        try:
            logo_data = user["logo"]
            if "," in logo_data:
                logo_data = logo_data.split(",")[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=4*cm, height=2*cm)
            left_content.append(logo_img)
        except Exception as e:
            logger.error(f"Error adding logo: {e}")
            left_content.append(Paragraph(company_name, company_style))
    else:
        left_content.append(Paragraph(company_name, company_style))
    
    left_content.append(Paragraph("Verhuurbeheersysteem", small_text))
    
    # Right side: KWITANTIE title
    right_content = [Paragraph("KWITANTIE", title_style)]
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[10*cm, 7*cm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Green line separator
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === INVOICE DETAILS ROW ===
    receipt_num = payment_id[:8].upper()
    issue_date = payment.get("payment_date", "-")
    
    details_data = [
        [
            Paragraph("<b>Kwitantie Nr:</b>", normal_text),
            Paragraph(receipt_num, bold_text),
            Paragraph("<b>Datum:</b>", normal_text),
            Paragraph(issue_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 3*cm, 6*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === CLIENT AND PROPERTY INFO ===
    tenant_name = tenant["name"] if tenant else "Onbekend"
    tenant_phone = tenant.get("phone", "-") if tenant else "-"
    tenant_email = tenant.get("email", "-") if tenant else "-"
    tenant_address = tenant.get("address", "-") if tenant else "-"
    
    apt_name = apt["name"] if apt else "Onbekend"
    apt_address = apt.get("address", "-") if apt else "-"
    
    info_left = [
        [Paragraph("GEFACTUREERD AAN", section_header)],
        [Paragraph(f"<b>{tenant_name}</b>", normal_text)],
        [Paragraph(f"Tel: {tenant_phone}", small_text)],
        [Paragraph(f"Email: {tenant_email}", small_text)],
        [Paragraph(f"Adres: {tenant_address}", small_text)],
    ]
    
    info_right = [
        [Paragraph("APPARTEMENT", section_header)],
        [Paragraph(f"<b>{apt_name}</b>", normal_text)],
        [Paragraph(f"Adres: {apt_address}", small_text)],
        [Paragraph("", small_text)],
        [Paragraph("", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === ITEMS TABLE ===
    payment_type_labels = {
        "rent": "Huur",
        "deposit": "Borg",
        "other": "Overig"
    }
    payment_type = payment_type_labels.get(payment.get("payment_type", ""), payment.get("payment_type", "Betaling"))
    period_text = f"{payment.get('period_month', '-')}/{payment.get('period_year', '-')}" if payment.get('period_month') else "-"
    description = payment.get("description") or f"{payment_type} betaling"
    amount = payment.get("amount", 0)
    
    # Table header
    table_header = ['NR', 'OMSCHRIJVING', 'TYPE', 'PERIODE', 'BEDRAG']
    
    # Table data
    table_data = [
        table_header,
        ['1', description, payment_type, period_text, format_currency(amount)]
    ]
    
    items_table = Table(table_data, colWidths=[1.5*cm, 7*cm, 3*cm, 2.5*cm, 3*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === TOTALS SECTION ===
    totals_data = [
        ['Subtotaal:', format_currency(amount)],
        ['BTW (0%):', format_currency(0)],
        ['', ''],
        ['TOTAAL:', format_currency(amount)],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 2), 10),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 14),
        ('TEXTCOLOR', (0, 3), (-1, 3), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 2, PRIMARY_GREEN),
    ]))
    
    # Wrap totals in a table to align right
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 30))
    
    # === PAYMENT INFO ===
    elements.append(Paragraph("Betaalmethode", section_header))
    elements.append(Paragraph("Contant / Bankoverschrijving", normal_text))
    elements.append(Spacer(1, 20))
    
    # === THANK YOU ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=15))
    
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph("Bedankt voor uw betaling!", thank_you_style))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Dit document is gegenereerd door {company_name}", footer_style))
    elements.append(Paragraph("Bewaar deze kwitantie als bewijs van betaling.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/receipts/{payment_id}/pdf")
async def generate_receipt_pdf(payment_id: str, current_user: dict = Depends(get_current_active_user)):
    # Get payment data
    payment = await db.payments.find_one(
        {"id": payment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    
    tenant = await db.tenants.find_one({"id": payment["tenant_id"]}, {"_id": 0})
    apt = await db.apartments.find_one({"id": payment["apartment_id"]}, {"_id": 0})
    
    # Get user logo and company name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "logo": 1, "company_name": 1})
    
    # Create modern PDF
    buffer = create_modern_receipt_pdf(payment, tenant, apt, user, payment_id)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=kwitantie_{payment_id[:8]}.pdf"
        }
    )

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: dict = Depends(get_current_active_user)):
    user_id = current_user["id"]
    
    # Get apartment stats
    total_apartments = await db.apartments.count_documents({"user_id": user_id})
    occupied_apartments = await db.apartments.count_documents({"user_id": user_id, "status": "occupied"})
    available_apartments = total_apartments - occupied_apartments
    
    # Get tenant count
    total_tenants = await db.tenants.count_documents({"user_id": user_id})
    
    # Get this month's income - based on payment_date in current month
    now = datetime.now(timezone.utc)
    now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d")
    
    # Get all payments and filter by payment_date in current month
    all_payments_cursor = await db.payments.find({
        "user_id": user_id
    }, {"_id": 0}).to_list(1000)
    
    # Calculate income this month based on payment_date
    current_month_str = now.strftime("%Y-%m")
    total_income = sum(
        p["amount"] for p in all_payments_cursor 
        if p.get("payment_date", "").startswith(current_month_str)
    )
    
    # Get rent payments only for calculating outstanding
    rent_payments = [p for p in all_payments_cursor if p.get("payment_type") == "rent"]
    
    # Calculate outstanding (rent due - payments made this month for occupied apartments)
    occupied_apts = await db.apartments.find(
        {"user_id": user_id, "status": "occupied"},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate total rent due for current month
    total_rent_due = sum(apt["rent_amount"] for apt in occupied_apts)
    
    # Calculate paid rent for this month's period
    rent_paid_this_month = sum(
        p["amount"] for p in rent_payments 
        if p.get("period_month") == now.month and p.get("period_year") == now.year
    )
    total_outstanding = max(0, total_rent_due - rent_paid_this_month)
    
    # Calculate outstanding loans
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Get loan payments
    loan_payments = await db.payments.find(
        {"user_id": user_id, "payment_type": "loan"},
        {"_id": 0, "loan_id": 1, "amount": 1}
    ).to_list(1000)
    
    loan_payments_by_id = {}
    for lp in loan_payments:
        lid = lp.get("loan_id")
        if lid:
            loan_payments_by_id[lid] = loan_payments_by_id.get(lid, 0) + (lp.get("amount") or 0)
    
    total_outstanding_loans = 0
    for loan in loans:
        try:
            loan_id = loan.get("id")
            loan_amount = loan.get("amount") or 0
            if loan_id:
                paid = loan_payments_by_id.get(loan_id, 0)
                total_outstanding_loans += max(0, loan_amount - paid)
        except Exception as e:
            logger.error(f"Error calculating loan outstanding: {e}")
            continue
    
    # Batch fetch tenant names for occupied apartments (used in reminders)
    occupied_tenant_ids = [apt["tenant_id"] for apt in occupied_apts if apt.get("tenant_id")]
    occupied_tenants = await db.tenants.find({"id": {"$in": occupied_tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    occupied_tenant_map = {t["id"]: t["name"] for t in occupied_tenants}
    
    # Get total deposits held
    deposits = await db.deposits.find(
        {"user_id": user_id, "status": "held"},
        {"_id": 0}
    ).to_list(1000)
    total_deposits = sum(d["amount"] for d in deposits)
    
    # Get recent payments
    recent_payments_cursor = await db.payments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    
    # Batch fetch tenant and apartment names for recent payments
    recent_tenant_ids = list(set(p["tenant_id"] for p in recent_payments_cursor))
    recent_apt_ids = list(set(p["apartment_id"] for p in recent_payments_cursor))
    
    recent_tenants = await db.tenants.find({"id": {"$in": recent_tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    recent_apts = await db.apartments.find({"id": {"$in": recent_apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    
    recent_tenant_map = {t["id"]: t["name"] for t in recent_tenants}
    recent_apt_map = {a["id"]: a["name"] for a in recent_apts}
    
    recent_payments = []
    for payment in recent_payments_cursor:
        try:
            # Safely build payment response with defaults
            recent_payments.append(PaymentResponse(
                id=payment.get("id", ""),
                tenant_id=payment.get("tenant_id", ""),
                tenant_name=recent_tenant_map.get(payment.get("tenant_id")),
                apartment_id=payment.get("apartment_id", ""),
                apartment_name=recent_apt_map.get(payment.get("apartment_id")),
                amount=payment.get("amount", 0) or 0,
                payment_date=payment.get("payment_date", ""),
                payment_type=payment.get("payment_type", "rent"),
                description=payment.get("description"),
                period_month=payment.get("period_month"),
                period_year=payment.get("period_year"),
                loan_id=payment.get("loan_id"),
                created_at=payment.get("created_at", ""),
                user_id=payment.get("user_id", "")
            ))
        except Exception as e:
            logger.error(f"Error processing payment for dashboard: {e}")
            continue
    
    # Get user's rent settings
    user_settings = await db.users.find_one({"id": user_id}, {"_id": 0, "rent_due_day": 1, "grace_period_days": 1})
    rent_due_day = user_settings.get("rent_due_day", 1) if user_settings else 1
    grace_period_days = user_settings.get("grace_period_days", 5) if user_settings else 5
    
    # Generate reminders for unpaid rent
    reminders = []
    for apt in occupied_apts:
        if not apt.get("tenant_id"):
            continue
        
        # Check if rent was paid this month
        paid_this_month = any(
            p["apartment_id"] == apt["id"] and 
            p.get("period_month") == now.month and 
            p.get("period_year") == now.year
            for p in rent_payments
        )
        
        if not paid_this_month:
            # Use user's rent due day setting
            try:
                due_date = now.replace(day=rent_due_day)
            except ValueError:
                # If day doesn't exist in current month, use last day
                due_date = now.replace(day=28)
            
            # Calculate days overdue considering grace period
            days_since_due = (now - due_date).days
            days_overdue = max(0, days_since_due - grace_period_days)
            
            # Only show as overdue if past grace period
            is_overdue = days_since_due > grace_period_days
            
            reminders.append(ReminderResponse(
                id=str(uuid.uuid4()),
                tenant_id=apt["tenant_id"],
                tenant_name=occupied_tenant_map.get(apt["tenant_id"], "Onbekend"),
                apartment_id=apt["id"],
                apartment_name=apt["name"],
                amount_due=apt["rent_amount"],
                due_date=due_date.strftime("%Y-%m-%d"),
                days_overdue=days_overdue,
                reminder_type="overdue" if is_overdue else "upcoming"
            ))
    
    # Calculate kasgeld balance
    kasgeld_transactions = await db.kasgeld.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    kasgeld_deposits = sum(t["amount"] for t in kasgeld_transactions if t["transaction_type"] == "deposit")
    kasgeld_withdrawals = sum(t["amount"] for t in kasgeld_transactions if t["transaction_type"] == "withdrawal")
    maintenance_costs = await db.maintenance.find({"user_id": user_id}, {"_id": 0, "cost": 1, "cost_type": 1}).to_list(1000)
    # Only count maintenance where cost_type is 'kasgeld' (or not set for legacy data)
    total_maintenance = sum(m["cost"] for m in maintenance_costs if m.get("cost_type", "kasgeld") == "kasgeld")
    
    # Get all payments (huurbetalingen) for kasgeld calculation
    all_payments = await db.payments.find({"user_id": user_id}, {"_id": 0, "amount": 1}).to_list(1000)
    total_all_payments = sum(p["amount"] for p in all_payments)
    
    # Get salary payments for kasgeld calculation
    all_salaries = await db.salaries.find({"user_id": user_id}, {"_id": 0, "amount": 1, "period_month": 1, "period_year": 1}).to_list(1000)
    total_all_salaries = sum(s["amount"] for s in all_salaries)
    
    # Total kasgeld = deposits + all payments - withdrawals - maintenance (kasgeld only) - salaries
    total_kasgeld = kasgeld_deposits + total_all_payments - kasgeld_withdrawals - total_maintenance - total_all_salaries
    
    # Get employee stats
    total_employees = await db.employees.count_documents({"user_id": user_id, "status": "active"})
    
    # Salary this month
    total_salary_this_month = sum(
        s["amount"] for s in all_salaries 
        if s.get("period_month") == now.month and s.get("period_year") == now.year
    )
    
    return DashboardStats(
        total_apartments=total_apartments,
        occupied_apartments=occupied_apartments,
        available_apartments=available_apartments,
        total_tenants=total_tenants,
        total_income_this_month=total_income,
        total_outstanding=total_outstanding,
        total_outstanding_loans=total_outstanding_loans,
        total_deposits_held=total_deposits,
        total_kasgeld=total_kasgeld,
        total_employees=total_employees,
        total_salary_this_month=total_salary_this_month,
        recent_payments=recent_payments,
        reminders=reminders
    )

# ==================== NOTIFICATIONS ROUTES ====================

class NotificationItem(BaseModel):
    id: str
    type: str  # 'rent_due', 'outstanding_balance', 'contract_expiring', 'loan_outstanding', 'salary_due'
    title: str
    message: str
    priority: str  # 'high', 'medium', 'low'
    related_id: Optional[str] = None
    related_name: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None

class NotificationsResponse(BaseModel):
    total: int
    high_priority: int
    notifications: List[NotificationItem]

@api_router.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(current_user: dict = Depends(get_current_active_user)):
    """Get all notifications and reminders for the current user"""
    user_id = current_user["id"]
    notifications = []
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Get user settings for due dates
    user_settings = await db.users.find_one({"id": user_id}, {"_id": 0, "rent_due_day": 1, "grace_period_days": 1})
    rent_due_day = user_settings.get("rent_due_day", 1) if user_settings else 1
    grace_period_days = user_settings.get("grace_period_days", 5) if user_settings else 5
    
    # === 1. RENT PAYMENT REMINDERS ===
    # Get occupied apartments
    occupied_apts = await db.apartments.find(
        {"user_id": user_id, "status": "occupied"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get rent payments for current month
    rent_payments = await db.payments.find(
        {"user_id": user_id, "payment_type": "rent"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get tenant info
    tenant_ids = list(set(apt.get("tenant_id") for apt in occupied_apts if apt.get("tenant_id")))
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    tenant_map = {t["id"]: t["name"] for t in tenants}
    
    for apt in occupied_apts:
        if not apt.get("tenant_id"):
            continue
        
        # Check if rent paid this month
        paid_this_month = any(
            p["apartment_id"] == apt["id"] and 
            p.get("period_month") == current_month and 
            p.get("period_year") == current_year
            for p in rent_payments
        )
        
        if not paid_this_month:
            try:
                due_date = now.replace(day=rent_due_day)
            except ValueError:
                due_date = now.replace(day=28)
            
            days_since_due = (now - due_date).days
            is_overdue = days_since_due > grace_period_days
            
            tenant_name = tenant_map.get(apt["tenant_id"], "Onbekend")
            
            notifications.append(NotificationItem(
                id=str(uuid.uuid4()),
                type="rent_due",
                title="Huur niet betaald" if is_overdue else "Huur herinnering",
                message=f"{tenant_name} - {apt['name']}: Huur van {now.strftime('%B %Y')} nog niet ontvangen",
                priority="high" if is_overdue else "medium",
                related_id=apt["tenant_id"],
                related_name=tenant_name,
                amount=apt["rent_amount"],
                due_date=due_date.strftime("%Y-%m-%d")
            ))
    
    # === 2. OUTSTANDING BALANCE REMINDERS ===
    for apt in occupied_apts:
        if not apt.get("tenant_id"):
            continue
        
        tenant_id = apt["tenant_id"]
        tenant_name = tenant_map.get(tenant_id, "Onbekend")
        
        # Calculate outstanding for this tenant
        tenant_payments = [p for p in rent_payments if p["tenant_id"] == tenant_id and p["payment_type"] == "rent"]
        total_paid = sum(p["amount"] for p in tenant_payments)
        
        # Get tenant start (from first payment or apartment assignment)
        if tenant_payments:
            first_payment = min(tenant_payments, key=lambda x: x["payment_date"])
            try:
                first_date = datetime.fromisoformat(first_payment["payment_date"].replace("Z", "+00:00"))
            except Exception:
                first_date = now
        else:
            first_date = now
        
        months_rented = max(1, (now.year - first_date.year) * 12 + (now.month - first_date.month) + 1)
        total_due = months_rented * apt["rent_amount"]
        balance = total_due - total_paid
        
        if balance > apt["rent_amount"]:  # More than 1 month outstanding
            notifications.append(NotificationItem(
                id=str(uuid.uuid4()),
                type="outstanding_balance",
                title="Openstaand saldo",
                message=f"{tenant_name} heeft een openstaand saldo van meer dan 1 maand huur",
                priority="high",
                related_id=tenant_id,
                related_name=tenant_name,
                amount=balance,
                due_date=None
            ))
    
    # === 3. CONTRACT EXPIRING REMINDERS ===
    contracts = await db.contracts.find(
        {"user_id": user_id, "status": "signed"},
        {"_id": 0}
    ).to_list(1000)
    
    for contract in contracts:
        if contract.get("end_date"):
            try:
                end_date = datetime.fromisoformat(contract["end_date"])
                days_until_expiry = (end_date - now).days
                
                if 0 <= days_until_expiry <= 30:  # Expiring within 30 days
                    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0, "name": 1})
                    tenant_name = tenant["name"] if tenant else "Onbekend"
                    
                    notifications.append(NotificationItem(
                        id=str(uuid.uuid4()),
                        type="contract_expiring",
                        title="Contract verloopt binnenkort",
                        message=f"Contract van {tenant_name} verloopt over {days_until_expiry} dagen",
                        priority="high" if days_until_expiry <= 7 else "medium",
                        related_id=contract["id"],
                        related_name=tenant_name,
                        amount=None,
                        due_date=contract["end_date"]
                    ))
                elif days_until_expiry < 0:  # Already expired
                    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0, "name": 1})
                    tenant_name = tenant["name"] if tenant else "Onbekend"
                    
                    notifications.append(NotificationItem(
                        id=str(uuid.uuid4()),
                        type="contract_expiring",
                        title="Contract verlopen",
                        message=f"Contract van {tenant_name} is {abs(days_until_expiry)} dagen geleden verlopen",
                        priority="high",
                        related_id=contract["id"],
                        related_name=tenant_name,
                        amount=None,
                        due_date=contract["end_date"]
                    ))
            except Exception:
                pass
    
    # === 4. OUTSTANDING LOAN REMINDERS ===
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    loan_ids = [loan.get("id") for loan in loans if loan.get("id")]
    
    if loan_ids:
        loan_payments = await db.payments.find(
            {"loan_id": {"$in": loan_ids}, "payment_type": "loan"},
            {"_id": 0, "loan_id": 1, "amount": 1}
        ).to_list(1000)
        
        loan_payments_map = {}
        for lp in loan_payments:
            lid = lp.get("loan_id")
            if lid:
                loan_payments_map[lid] = loan_payments_map.get(lid, 0) + (lp.get("amount") or 0)
        
        for loan in loans:
            try:
                loan_id = loan.get("id")
                if not loan_id:
                    continue
                    
                paid = loan_payments_map.get(loan_id, 0)
                loan_amount = loan.get("amount") or 0
                remaining = loan_amount - paid
                
                if remaining > 0:
                    tenant_id = loan.get("tenant_id")
                    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "name": 1}) if tenant_id else None
                    tenant_name = tenant.get("name", "Onbekend") if tenant else "Onbekend"
                    
                    # Calculate days since loan
                    loan_date_str = loan.get("loan_date") or loan.get("created_at") or ""
                    try:
                        if loan_date_str:
                            clean_date = loan_date_str.replace('Z', '+00:00')
                            if '+' not in clean_date and 'T' in clean_date:
                                clean_date = clean_date + '+00:00'
                            loan_date = datetime.fromisoformat(clean_date)
                            days_since_loan = (now - loan_date).days
                        else:
                            days_since_loan = 0
                    except Exception:
                        days_since_loan = 0
                    
                    priority = "high" if days_since_loan > 60 else ("medium" if days_since_loan > 30 else "low")
                    
                    notifications.append(NotificationItem(
                        id=str(uuid.uuid4()),
                        type="loan_outstanding",
                        title="Openstaande lening",
                        message=f"{tenant_name} heeft nog SRD {remaining:,.2f} openstaande lening",
                        priority=priority,
                        related_id=loan_id,
                        related_name=tenant_name,
                        amount=remaining,
                        due_date=loan_date_str[:10] if loan_date_str else ""
                    ))
            except Exception as e:
                logger.error(f"Error processing loan notification: {e}")
                continue
    
    # === 5. SALARY PAYMENT REMINDERS ===
    employees = await db.employees.find(
        {"user_id": user_id, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    if employees:
        salaries = await db.salaries.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        for emp in employees:
            # Check if salary paid this month
            paid_this_month = any(
                s["employee_id"] == emp["id"] and
                s.get("period_month") == current_month and
                s.get("period_year") == current_year
                for s in salaries
            )
            
            if not paid_this_month and now.day >= 25:  # Reminder after 25th of month
                notifications.append(NotificationItem(
                    id=str(uuid.uuid4()),
                    type="salary_due",
                    title="Loon uitbetalen",
                    message=f"Loon van {emp['name']} voor {now.strftime('%B %Y')} nog niet uitbetaald",
                    priority="medium" if now.day < 28 else "high",
                    related_id=emp["id"],
                    related_name=emp["name"],
                    amount=emp.get("salary"),
                    due_date=None
                ))
    
    # Sort notifications by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    notifications.sort(key=lambda x: priority_order.get(x.priority, 3))
    
    high_priority = len([n for n in notifications if n.priority == "high"])
    
    return NotificationsResponse(
        total=len(notifications),
        high_priority=high_priority,
        notifications=notifications
    )

# ==================== TENANT BALANCE ROUTES ====================

@api_router.get("/tenants/{tenant_id}/balance")
async def get_tenant_balance(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment assigned to tenant
    apt = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    # Get deposit info for this tenant
    deposit_info = await db.deposits.find_one(
        {"tenant_id": tenant_id, "user_id": current_user["id"], "status": "held"},
        {"_id": 0, "amount": 1, "deposit_date": 1, "status": 1}
    )
    
    if not apt:
        return {
            "tenant_id": tenant_id,
            "tenant_name": tenant["name"],
            "apartment": None,
            "total_due": 0,
            "total_paid": 0,
            "balance": 0,
            "payments": [],
            "deposit": deposit_info
        }
    
    # Get all payments for this tenant-apartment combination
    payments = await db.payments.find(
        {"tenant_id": tenant_id, "apartment_id": apt["id"], "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    total_paid = sum(p["amount"] for p in payments if p["payment_type"] == "rent")
    
    # Calculate months rented (simplified - from first payment or created_at)
    if payments:
        first_payment_date = min(p["payment_date"] for p in payments)
        first_date = datetime.fromisoformat(first_payment_date.replace("Z", "+00:00") if "Z" in first_payment_date else first_payment_date)
    else:
        first_date = datetime.fromisoformat(apt["created_at"].replace("Z", "+00:00") if "Z" in apt["created_at"] else apt["created_at"])
    
    now = datetime.now(timezone.utc)
    months_diff = (now.year - first_date.year) * 12 + (now.month - first_date.month) + 1
    total_due = apt["rent_amount"] * months_diff
    
    balance = total_due - total_paid
    
    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant["name"],
        "apartment": {
            "id": apt["id"],
            "name": apt["name"],
            "rent_amount": apt["rent_amount"]
        },
        "total_due": total_due,
        "total_paid": total_paid,
        "balance": balance,
        "payments": payments,
        "deposit": deposit_info
    }

@api_router.get("/tenants/{tenant_id}/outstanding")
async def get_tenant_outstanding(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get outstanding (unpaid/partially paid) months for a tenant - used when registering new payment"""
    tenant = await db.tenants.find_one(
        {"id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment assigned to tenant
    apt = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not apt:
        return {
            "tenant_id": tenant_id,
            "tenant_name": tenant["name"],
            "has_outstanding": False,
            "outstanding_amount": 0,
            "outstanding_months": [],
            "partial_payments": [],
            "maintenance_costs": [],
            "total_maintenance": 0,
            "suggestion": None
        }
    
    # Get all rent payments for this tenant-apartment
    payments = await db.payments.find(
        {"tenant_id": tenant_id, "apartment_id": apt["id"], "user_id": current_user["id"], "payment_type": "rent"},
        {"_id": 0, "period_month": 1, "period_year": 1, "amount": 1, "payment_date": 1}
    ).to_list(1000)
    
    # Get maintenance costs for this apartment that tenant must pay
    maintenance_records = await db.maintenance.find(
        {"apartment_id": apt["id"], "user_id": current_user["id"], "cost_type": "tenant"},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate total maintenance costs
    category_labels = {
        'wc': 'WC/Toilet', 'kraan': 'Kraan', 'douche': 'Douche',
        'keuken': 'Keuken', 'kasten': 'Kasten', 'verven': 'Verven', 'overig': 'Overig'
    }
    maintenance_costs = []
    total_maintenance = 0
    for m in maintenance_records:
        total_maintenance += m["cost"]
        maintenance_costs.append({
            "id": m["id"],
            "date": m["maintenance_date"],
            "category": category_labels.get(m.get("category", "overig"), "Onderhoud"),
            "description": m.get("description", ""),
            "cost": m["cost"]
        })
    
    # Create payment lookup: (year, month) -> total paid for that period
    payment_totals = {}
    for p in payments:
        if p.get("period_month") and p.get("period_year"):
            key = (p["period_year"], p["period_month"])
            if key not in payment_totals:
                payment_totals[key] = 0
            payment_totals[key] += p["amount"]
    
    # Calculate which months should be paid (from apartment creation or first payment)
    if payments:
        first_payment_date = min(p.get("period_year", 9999) * 100 + p.get("period_month", 1) for p in payments if p.get("period_year"))
        start_year = first_payment_date // 100
        start_month = first_payment_date % 100
    else:
        created = apt.get("created_at", "")
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                start_year = created_dt.year
                start_month = created_dt.month
            except Exception:
                now = datetime.now(timezone.utc)
                start_year = now.year
                start_month = now.month
        else:
            now = datetime.now(timezone.utc)
            start_year = now.year
            start_month = now.month
    
    # Generate list of all months with their payment status
    now = datetime.now(timezone.utc)
    outstanding_months = []
    partial_payments = []
    total_outstanding = 0.0
    
    year = start_year
    month = start_month
    months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    
    while (year < now.year) or (year == now.year and month <= now.month):
        key = (year, month)
        amount_due = apt["rent_amount"]
        amount_paid = payment_totals.get(key, 0)
        remaining = amount_due - amount_paid
        
        if remaining > 0:
            month_info = {
                "year": year,
                "month": month,
                "month_name": months_nl[month],
                "label": f"{months_nl[month]} {year}",
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "remaining": remaining,
                "status": "partial" if amount_paid > 0 else "unpaid"
            }
            
            if amount_paid > 0:
                partial_payments.append(month_info)
            
            outstanding_months.append(month_info)
            total_outstanding += remaining
        
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    # Sort by date (oldest first)
    outstanding_months.sort(key=lambda x: (x["year"], x["month"]))
    partial_payments.sort(key=lambda x: (x["year"], x["month"]))
    
    # Create detailed suggestion message
    suggestion = None
    if outstanding_months:
        oldest = outstanding_months[0]
        
        # Count unpaid vs partial
        unpaid_count = len([m for m in outstanding_months if m["status"] == "unpaid"])
        partial_count = len([m for m in outstanding_months if m["status"] == "partial"])
        
        suggestion_parts = [f"Let op: Deze huurder heeft een openstaand saldo van {format_currency(total_outstanding)}."]
        
        if unpaid_count > 0:
            suggestion_parts.append(f"{unpaid_count} maand(en) volledig onbetaald.")
        
        if partial_count > 0:
            partial_details = []
            for pm in partial_payments:
                partial_details.append(f"{pm['label']}: {format_currency(pm['amount_paid'])} betaald, {format_currency(pm['remaining'])} nog open")
            suggestion_parts.append(f"{partial_count} maand(en) gedeeltelijk betaald:")
            suggestion_parts.extend(partial_details)
        
        suggestion_parts.append(f"Oudste openstaande maand: {oldest['label']}")
        suggestion = " ".join(suggestion_parts[:2]) + (" " + " | ".join(partial_details) if partial_count > 0 else "")
    
    # Add maintenance costs to total outstanding
    total_outstanding_with_maintenance = total_outstanding + total_maintenance
    has_outstanding = len(outstanding_months) > 0 or total_maintenance > 0
    
    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant["name"],
        "apartment_name": apt["name"],
        "rent_amount": apt["rent_amount"],
        "has_outstanding": has_outstanding,
        "outstanding_amount": total_outstanding_with_maintenance,
        "outstanding_rent": total_outstanding,
        "outstanding_months": outstanding_months,
        "partial_payments": partial_payments,
        "maintenance_costs": maintenance_costs,
        "total_maintenance": total_maintenance,
        "unpaid_count": len([m for m in outstanding_months if m["status"] == "unpaid"]),
        "partial_count": len([m for m in outstanding_months if m["status"] == "partial"]),
        "suggestion": suggestion
    }

# ==================== FACTUREN (INVOICES) ROUTES ====================

@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_active_user)):
    """Get all invoices (rent due) for all tenants with payment status, cumulative balance, maintenance costs and loans"""
    
    # Get all apartments with tenants
    apartments = await db.apartments.find(
        {"user_id": current_user["id"], "tenant_id": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    if not apartments:
        return {"invoices": [], "summary": {"total_invoices": 0, "paid": 0, "partial": 0, "unpaid": 0, "total_amount": 0, "paid_amount": 0, "unpaid_amount": 0}}
    
    # Get all tenants
    tenant_ids = [apt["tenant_id"] for apt in apartments if apt.get("tenant_id")]
    tenants = await db.tenants.find(
        {"id": {"$in": tenant_ids}, "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    tenant_map = {t["id"]: t for t in tenants}
    
    # Get all rent payments
    payments = await db.payments.find(
        {"user_id": current_user["id"], "payment_type": "rent"},
        {"_id": 0}
    ).to_list(10000)
    
    # Get all loan payments
    loan_payments = await db.payments.find(
        {"user_id": current_user["id"], "payment_type": "loan"},
        {"_id": 0, "tenant_id": 1, "loan_id": 1, "amount": 1}
    ).to_list(10000)
    
    # Get all loans
    loans = await db.loans.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate loan balances per tenant
    loan_payments_by_loan = {}
    for lp in loan_payments:
        loan_id = lp.get("loan_id")
        if loan_id:
            if loan_id not in loan_payments_by_loan:
                loan_payments_by_loan[loan_id] = 0
            loan_payments_by_loan[loan_id] += lp["amount"]
    
    # Group loans by tenant with remaining balance
    loans_by_tenant = {}
    for loan in loans:
        tenant_id = loan["tenant_id"]
        if tenant_id not in loans_by_tenant:
            loans_by_tenant[tenant_id] = {
                "total": 0,
                "paid": 0,
                "remaining": 0,
                "items": []
            }
        paid = loan_payments_by_loan.get(loan["id"], 0)
        remaining = loan["amount"] - paid
        if remaining > 0:
            loans_by_tenant[tenant_id]["total"] += loan["amount"]
            loans_by_tenant[tenant_id]["paid"] += paid
            loans_by_tenant[tenant_id]["remaining"] += remaining
            loans_by_tenant[tenant_id]["items"].append({
                "id": loan["id"],
                "date": loan["loan_date"],
                "description": loan.get("description", ""),
                "amount": loan["amount"],
                "paid": paid,
                "remaining": remaining
            })
    
    # Get all maintenance costs for tenants (cost_type = 'tenant')
    maintenance_records = await db.maintenance.find(
        {"user_id": current_user["id"], "cost_type": "tenant"},
        {"_id": 0}
    ).to_list(1000)
    
    # Create maintenance lookup by apartment_id
    # Group by apartment and calculate total + details
    maintenance_by_apartment = {}
    for m in maintenance_records:
        apt_id = m["apartment_id"]
        if apt_id not in maintenance_by_apartment:
            maintenance_by_apartment[apt_id] = {
                "total": 0,
                "items": []
            }
        category_labels = {
            'wc': 'WC/Toilet', 'kraan': 'Kraan', 'douche': 'Douche',
            'keuken': 'Keuken', 'kasten': 'Kasten', 'verven': 'Verven', 'overig': 'Overig'
        }
        maintenance_by_apartment[apt_id]["total"] += m["cost"]
        maintenance_by_apartment[apt_id]["items"].append({
            "id": m["id"],
            "date": m["maintenance_date"],
            "category": category_labels.get(m.get("category", "overig"), "Onderhoud"),
            "description": m.get("description", ""),
            "cost": m["cost"]
        })
    
    # Create payment lookup: (tenant_id, apartment_id, year, month) -> list of payments
    payment_lookup = {}
    for p in payments:
        if p.get("period_month") and p.get("period_year"):
            key = (p["tenant_id"], p["apartment_id"], p["period_year"], p["period_month"])
            if key not in payment_lookup:
                payment_lookup[key] = []
            payment_lookup[key].append(p)
    
    months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    
    now = datetime.now(timezone.utc)
    
    # Process each apartment/tenant combination
    all_invoices = []
    
    for apt in apartments:
        tenant = tenant_map.get(apt.get("tenant_id"))
        if not tenant:
            continue
        
        # Get maintenance costs for this apartment (tenant pays)
        apt_maintenance = maintenance_by_apartment.get(apt["id"], {"total": 0, "items": []})
        
        # Get loan balance for this tenant
        tenant_loans = loans_by_tenant.get(apt["tenant_id"], {"total": 0, "paid": 0, "remaining": 0, "items": []})
        
        # Determine start date (from apartment creation or assignment)
        try:
            created = apt.get("created_at", "")
            if created:
                start_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            else:
                start_dt = now
        except Exception:
            start_dt = now
        
        # Generate invoices from start month to current month
        year = start_dt.year
        month = start_dt.month
        
        # Track cumulative balance for this tenant (including maintenance and loans)
        cumulative_balance = 0.0
        # Add maintenance costs to starting balance
        cumulative_balance += apt_maintenance["total"]
        # Add loan balance to starting balance
        cumulative_balance += tenant_loans["remaining"]
        
        tenant_invoices = []
        is_first_month = True
        
        while (year < now.year) or (year == now.year and month <= now.month):
            key = (apt["tenant_id"], apt["id"], year, month)
            period_payments = payment_lookup.get(key, [])
            
            # Calculate amounts
            rent_due = apt["rent_amount"]
            # Only add maintenance and loans to first month's invoice display
            maintenance_due = apt_maintenance["total"] if is_first_month else 0
            loan_due = tenant_loans["remaining"] if is_first_month else 0
            amount_due = rent_due + maintenance_due + loan_due
            amount_paid = sum(p["amount"] for p in period_payments)
            remaining = amount_due - amount_paid
            
            # Add previous balance to this month's remaining
            if not is_first_month:
                total_remaining = remaining + cumulative_balance
            else:
                total_remaining = remaining
            
            # Determine status
            if amount_paid >= amount_due:
                status = "paid"
                cumulative_balance = min(0, remaining) if not is_first_month else min(0, total_remaining)
            elif amount_paid > 0:
                status = "partial"
                cumulative_balance = total_remaining
            else:
                status = "unpaid"
                cumulative_balance = total_remaining
            
            invoice_id = f"{apt['id']}-{year}-{month:02d}"
            
            # Get latest payment date if any
            latest_payment_date = None
            if period_payments:
                latest_payment_date = max(p["payment_date"] for p in period_payments)
            
            invoice = {
                "id": invoice_id,
                "tenant_id": apt["tenant_id"],
                "tenant_name": tenant["name"],
                "tenant_phone": tenant.get("phone", ""),
                "apartment_id": apt["id"],
                "apartment_name": apt["name"],
                "year": year,
                "month": month,
                "month_name": months_nl[month],
                "period_label": f"{months_nl[month]} {year}",
                "rent_amount": rent_due,
                "maintenance_cost": maintenance_due,
                "maintenance_items": apt_maintenance["items"] if is_first_month and maintenance_due > 0 else [],
                "loan_amount": loan_due,
                "loan_items": tenant_loans["items"] if is_first_month and loan_due > 0 else [],
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "remaining": max(0, remaining),
                "cumulative_balance": max(0, cumulative_balance),
                "status": status,
                "payment_count": len(period_payments),
                "payment_ids": [p["id"] for p in period_payments],
                "payment_date": latest_payment_date,
                "due_date": f"{year}-{month:02d}-01"
            }
            
            tenant_invoices.append(invoice)
            is_first_month = False
            
            month += 1
            if month > 12:
                month = 1
                year += 1
        
        all_invoices.extend(tenant_invoices)
    
    # Sort by date (newest first), then by tenant name
    all_invoices.sort(key=lambda x: (-x["year"], -x["month"], x["tenant_name"]))
    
    # Calculate summary
    total_invoices = len(all_invoices)
    paid_invoices = [i for i in all_invoices if i["status"] == "paid"]
    partial_invoices = [i for i in all_invoices if i["status"] == "partial"]
    unpaid_invoices = [i for i in all_invoices if i["status"] == "unpaid"]
    
    summary = {
        "total_invoices": total_invoices,
        "paid": len(paid_invoices),
        "partial": len(partial_invoices),
        "unpaid": len(unpaid_invoices),
        "total_amount": sum(i["amount_due"] for i in all_invoices),
        "paid_amount": sum(i["amount_paid"] for i in all_invoices),
        "unpaid_amount": sum(i["remaining"] for i in all_invoices)
    }
    
    return {"invoices": all_invoices, "summary": summary}

@api_router.get("/invoices/pdf/{tenant_id}/{year}/{month}")
async def get_invoice_pdf(tenant_id: str, year: int, month: int, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF for a specific invoice/factuur"""
    user_id = current_user["id"]
    
    # Get tenant
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": user_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment
    apartment = await db.apartments.find_one({"tenant_id": tenant_id, "user_id": user_id}, {"_id": 0})
    if not apartment:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    rent_amount = apartment.get("rent_amount", 0)
    
    # Get rent payments for this period
    all_payments = await db.payments.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    rent_payments = [p for p in all_payments if 
                    p["tenant_id"] == tenant_id and 
                    p.get("payment_type") == "rent" and
                    p.get("period_month") == month and 
                    p.get("period_year") == year]
    
    total_paid = sum(p["amount"] for p in rent_payments)
    remaining = max(0, rent_amount - total_paid)
    
    # Get maintenance costs for tenant this month
    maintenance_records = await db.maintenance.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    tenant_maintenance = [m for m in maintenance_records if 
                         m.get("tenant_id") == tenant_id and
                         m.get("cost_type") == "tenant"]
    
    month_maintenance = []
    maintenance_cost = 0
    for m in tenant_maintenance:
        try:
            m_date = datetime.fromisoformat(m["date"].replace("Z", "+00:00"))
            if m_date.month == month and m_date.year == year:
                month_maintenance.append(m)
                maintenance_cost += m.get("cost", 0)
        except Exception:
            pass
    
    # Get loans info
    loans = await db.loans.find({"user_id": user_id, "tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    loan_payments = [p for p in all_payments if p.get("payment_type") == "loan" and p.get("tenant_id") == tenant_id]
    
    total_loan_amount = sum(loan["amount"] for loan in loans)
    total_loan_paid = sum(p["amount"] for p in loan_payments)
    loan_balance = max(0, total_loan_amount - total_loan_paid)
    
    # Calculate cumulative balance
    cumulative_due = 0
    cumulative_paid = 0
    for m in range(1, month + 1):
        cumulative_due += rent_amount
        month_payments = [p for p in all_payments if 
                        p["tenant_id"] == tenant_id and 
                        p.get("payment_type") == "rent" and
                        p.get("period_month") == m and 
                        p.get("period_year") == year]
        cumulative_paid += sum(p["amount"] for p in month_payments)
    
    cumulative_balance = cumulative_due - cumulative_paid
    
    # Status
    status = "Openstaand"
    if total_paid >= rent_amount:
        status = "Betaald"
    elif total_paid > 0:
        status = "Gedeeltelijk"
    
    # Month names in Dutch
    month_names = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                   'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Colors
    PRIMARY_GREEN = HexColor("#0caf60")
    DARK_TEXT = HexColor("#1a1a1a")
    GRAY_TEXT = HexColor("#666666")
    LIGHT_GRAY = HexColor("#f5f5f5")
    
    # Custom styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=DARK_TEXT,
        spaceAfter=10,
        alignment=1
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=PRIMARY_GREEN,
        spaceBefore=15,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        spaceAfter=4
    )
    
    # Company header
    company_name = current_user.get("company_name") or current_user.get("name") or "Verhuurder"
    elements.append(Paragraph(company_name, ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=16,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph(current_user.get("email", ""), ParagraphStyle(
        'CompanyEmail',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        alignment=1
    )))
    elements.append(Spacer(1, 20))
    
    # Title
    elements.append(Paragraph("FACTUUR", title_style))
    elements.append(Spacer(1, 5))
    
    # Period
    elements.append(Paragraph(f"{month_names[month]} {year}", ParagraphStyle(
        'Period',
        parent=styles['Normal'],
        fontSize=14,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 5))
    
    # Status badge
    status_color = PRIMARY_GREEN if status == "Betaald" else HexColor("#f59e0b") if status == "Gedeeltelijk" else HexColor("#ef4444")
    elements.append(Paragraph(f"Status: {status}", ParagraphStyle(
        'Status',
        parent=styles['Normal'],
        fontSize=11,
        textColor=status_color,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 20))
    
    # Tenant & Apartment info in table
    elements.append(Paragraph("GEGEVENS", section_header))
    
    info_data = [
        ["Huurder:", tenant.get("name", "-")],
        ["E-mail:", tenant.get("email", "-")],
        ["Telefoon:", tenant.get("phone", "-")],
        ["ID/Paspoort:", tenant.get("id_number", "-")],
        ["", ""],
        ["Appartement:", apartment.get("name", "-")],
        ["Adres:", apartment.get("address", "-")]
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY_TEXT),
        ('TEXTCOLOR', (1, 0), (1, -1), DARK_TEXT),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Financial details
    elements.append(Paragraph("FINANCIEEL OVERZICHT", section_header))
    
    def format_currency(amount):
        return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    fin_data = [
        ["Omschrijving", "Bedrag"],
        ["Maandelijkse huur", format_currency(rent_amount)],
    ]
    
    if maintenance_cost > 0:
        fin_data.append(["Onderhoudskosten (huurder)", format_currency(maintenance_cost)])
    
    fin_data.append(["Totaal verschuldigd", format_currency(rent_amount + maintenance_cost)])
    fin_data.append(["Betaald", f"- {format_currency(total_paid)}"])
    fin_data.append(["Openstaand deze maand", format_currency(remaining + maintenance_cost)])
    
    fin_table = Table(fin_data, colWidths=[10*cm, 6*cm])
    fin_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor("#e8f5e9") if remaining == 0 else HexColor("#fff3e0")),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK_TEXT),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_TEXT),
    ]))
    elements.append(fin_table)
    elements.append(Spacer(1, 20))
    
    # Cumulative balance
    elements.append(Paragraph("CUMULATIEF SALDO", section_header))
    cum_data = [
        ["Totaal verschuldigd t/m deze maand:", format_currency(cumulative_due)],
        ["Totaal betaald t/m deze maand:", format_currency(cumulative_paid)],
        ["Saldo:", format_currency(abs(cumulative_balance)) + (" (achterstallig)" if cumulative_balance > 0 else " (vooruit)")],
    ]
    
    cum_table = Table(cum_data, colWidths=[10*cm, 6*cm])
    cum_table.setStyle(TableStyle([
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -2), DARK_TEXT),
        ('TEXTCOLOR', (0, -1), (-1, -1), HexColor("#ef4444") if cumulative_balance > 0 else PRIMARY_GREEN),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cum_table)
    elements.append(Spacer(1, 20))
    
    # Loan info if any
    if loan_balance > 0:
        elements.append(Paragraph("OPENSTAANDE LENING", section_header))
        elements.append(Paragraph(f"Totaal uitgeleend: {format_currency(total_loan_amount)}", normal_text))
        elements.append(Paragraph(f"Totaal terugbetaald: {format_currency(total_loan_paid)}", normal_text))
        elements.append(Paragraph(f"<b>Openstaand: {format_currency(loan_balance)}</b>", normal_text))
        elements.append(Spacer(1, 20))
    
    # Payment history
    if rent_payments:
        elements.append(Paragraph("BETALINGEN DEZE MAAND", section_header))
        pay_data = [["Datum", "Bedrag"]]
        for p in rent_payments:
            pay_data.append([p.get("payment_date", "-"), format_currency(p.get("amount", 0))])
        
        pay_table = Table(pay_data, colWidths=[8*cm, 8*cm])
        pay_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('TEXTCOLOR', (1, 1), (1, -1), PRIMARY_GREEN),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, GRAY_TEXT),
        ]))
        elements.append(pay_table)
        elements.append(Spacer(1, 20))
    
    # Maintenance records
    if month_maintenance:
        elements.append(Paragraph("ONDERHOUDSKOSTEN DEZE MAAND", section_header))
        maint_data = [["Datum", "Omschrijving", "Bedrag"]]
        for m in month_maintenance:
            maint_data.append([
                m.get("date", "-")[:10], 
                m.get("description", "-")[:30],
                format_currency(m.get("cost", 0))
            ])
        
        maint_table = Table(maint_data, colWidths=[4*cm, 8*cm, 4*cm])
        maint_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('TEXTCOLOR', (2, 1), (2, -1), HexColor("#f59e0b")),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, GRAY_TEXT),
        ]))
        elements.append(maint_table)
    
    # Payment Methods Section - only show if there's an outstanding balance
    if remaining > 0 or cumulative_balance > 0:
        # Get payment settings for this workspace/user
        workspace_id = current_user.get("workspace_id") or "global"
        payment_settings = await db.workspace_payment_settings.find_one({"workspace_id": workspace_id})
        
        if payment_settings and payment_settings.get("payment_methods"):
            enabled_methods = [m for m in payment_settings.get("payment_methods", []) if m.get("is_enabled")]
            
            if enabled_methods:
                elements.append(Spacer(1, 20))
                elements.append(Paragraph("BETAALMETHODES", section_header))
                
                for method in enabled_methods:
                    method_id = method.get("method_id")
                    method_name = method.get("name", "")
                    instructions = method.get("instructions", "")
                    
                    elements.append(Paragraph(f"<b>{method_name}</b>", ParagraphStyle(
                        'MethodName',
                        parent=styles['Normal'],
                        fontSize=10,
                        textColor=DARK_TEXT,
                        spaceBefore=8,
                        spaceAfter=2
                    )))
                    
                    if method_id == "bank_transfer" and method.get("bank_settings"):
                        bank = method.get("bank_settings", {})
                        bank_info = []
                        if bank.get("bank_name"):
                            bank_info.append(f"Bank: {bank.get('bank_name')}")
                        if bank.get("account_holder"):
                            bank_info.append(f"T.n.v.: {bank.get('account_holder')}")
                        if bank.get("account_number"):
                            bank_info.append(f"Rekeningnr: {bank.get('account_number')}")
                        if bank.get("iban"):
                            bank_info.append(f"IBAN: {bank.get('iban')}")
                        
                        for info in bank_info:
                            elements.append(Paragraph(info, ParagraphStyle(
                                'BankInfo',
                                parent=styles['Normal'],
                                fontSize=9,
                                textColor=GRAY_TEXT,
                                leftIndent=10
                            )))
                    
                    elif method_id == "mope" and method.get("mope_settings", {}).get("is_enabled"):
                        elements.append(Paragraph("Online betalen via Mope - vraag de betaallink aan bij uw verhuurder", ParagraphStyle(
                            'MopeInfo',
                            parent=styles['Normal'],
                            fontSize=9,
                            textColor=GRAY_TEXT,
                            leftIndent=10
                        )))
                    
                    if instructions:
                        elements.append(Paragraph(instructions, ParagraphStyle(
                            'Instructions',
                            parent=styles['Normal'],
                            fontSize=9,
                            textColor=GRAY_TEXT,
                            leftIndent=10,
                            spaceBefore=2
                        )))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        f"Gegenereerd op: {datetime.now(timezone.utc).strftime('%d-%m-%Y %H:%M')}",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=GRAY_TEXT, alignment=1)
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Factuur_{tenant.get('name', 'huurder').replace(' ', '_')}_{month_names[month]}_{year}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== KASGELD (CASH FUND) ROUTES ====================

@api_router.post("/kasgeld", response_model=KasgeldResponse)
async def create_kasgeld_transaction(kasgeld_data: KasgeldCreate, current_user: dict = Depends(get_current_active_user)):
    kasgeld_id = str(uuid.uuid4())
    kasgeld_doc = {
        "id": kasgeld_id,
        "amount": kasgeld_data.amount,
        "transaction_type": kasgeld_data.transaction_type,
        "description": kasgeld_data.description,
        "transaction_date": kasgeld_data.transaction_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.kasgeld.insert_one(kasgeld_doc)
    kasgeld_doc.pop("_id", None)
    
    return KasgeldResponse(**kasgeld_doc)

@api_router.get("/kasgeld", response_model=KasgeldBalanceResponse)
async def get_kasgeld(current_user: dict = Depends(get_current_active_user)):
    # Get all manual kasgeld transactions
    manual_transactions = await db.kasgeld.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Get all payments (huurbetalingen) - these count as income to kasgeld
    payments = await db.payments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Batch fetch tenant and apartment names for payments
    tenant_ids = list(set(p["tenant_id"] for p in payments)) if payments else []
    apt_ids = list(set(p["apartment_id"] for p in payments)) if payments else []
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if tenant_ids else []
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if apt_ids else []
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apt_map = {a["id"]: a["name"] for a in apts}
    
    # Calculate totals from manual transactions
    total_deposits = sum(t["amount"] for t in manual_transactions if t["transaction_type"] == "deposit")
    total_withdrawals = sum(t["amount"] for t in manual_transactions if t["transaction_type"] == "withdrawal")
    
    # Calculate total from payments (all payments go to kasgeld)
    total_payments = sum(p["amount"] for p in payments)
    
    # Get maintenance records - only those with cost_type='kasgeld' (or no cost_type for legacy data)
    maintenance_records = await db.maintenance.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Filter: Only count costs where cost_type is 'kasgeld' or not set (legacy)
    kasgeld_maintenance = [m for m in maintenance_records if m.get("cost_type", "kasgeld") == "kasgeld"]
    total_maintenance_costs = sum(m["cost"] for m in kasgeld_maintenance)
    
    # Batch fetch apartment names for maintenance
    maint_apt_ids = list(set(m["apartment_id"] for m in maintenance_records))
    maint_apts = await db.apartments.find({"id": {"$in": maint_apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if maint_apt_ids else []
    maint_apt_map = {a["id"]: a["name"] for a in maint_apts}
    
    # Get total salary payments
    salary_payments = await db.salaries.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    total_salary_payments = sum(s["amount"] for s in salary_payments)
    
    # Batch fetch employee names for salary payments
    employee_ids = list(set(s["employee_id"] for s in salary_payments)) if salary_payments else []
    employees = await db.employees.find({"id": {"$in": employee_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if employee_ids else []
    employee_map = {e["id"]: e["name"] for e in employees}
    
    # Total balance = deposits + payments - withdrawals - maintenance costs (kasgeld only) - salaries
    total_balance = total_deposits + total_payments - total_withdrawals - total_maintenance_costs - total_salary_payments
    
    # Combine all transactions for display
    all_transactions = []
    
    # Add manual transactions
    for t in manual_transactions:
        all_transactions.append(KasgeldResponse(
            **t,
            source="manual"
        ))
    
    # Add payments as transactions
    for p in payments:
        tenant_name = tenant_map.get(p["tenant_id"], "Onbekend")
        apt_name = apt_map.get(p["apartment_id"], "")
        payment_type_label = "Huur" if p["payment_type"] == "rent" else "Borg" if p["payment_type"] == "deposit" else "Overig"
        
        all_transactions.append(KasgeldResponse(
            id=p["id"],
            amount=p["amount"],
            transaction_type="payment",
            description=f"{payment_type_label} van {tenant_name} - {apt_name}",
            transaction_date=p["payment_date"],
            created_at=p["created_at"],
            user_id=p["user_id"],
            source="payment"
        ))
    
    # Add salary payments as transactions (negative)
    for s in salary_payments:
        employee_name = employee_map.get(s["employee_id"], "Onbekend")
        
        all_transactions.append(KasgeldResponse(
            id=s["id"],
            amount=s["amount"],
            transaction_type="salary",
            description=f"Salaris {employee_name} - {s['period_month']}/{s['period_year']}",
            transaction_date=s["payment_date"],
            created_at=s["created_at"],
            user_id=s["user_id"],
            source="salary"
        ))
    
    # Add maintenance records as transactions (only kasgeld type costs)
    for m in kasgeld_maintenance:
        apt_name = maint_apt_map.get(m["apartment_id"], "Onbekend")
        category_labels = {
            'wc': 'WC/Toilet', 'kraan': 'Kraan', 'douche': 'Douche',
            'keuken': 'Keuken', 'kasten': 'Kasten', 'verven': 'Verven', 'overig': 'Overig'
        }
        cat_label = category_labels.get(m.get("category", "overig"), "Onderhoud")
        
        all_transactions.append(KasgeldResponse(
            id=m["id"],
            amount=m["cost"],
            transaction_type="maintenance",
            description=f"{cat_label} - {apt_name}: {m.get('description', '')}",
            transaction_date=m["maintenance_date"],
            created_at=m["created_at"],
            user_id=m["user_id"],
            source="maintenance"
        ))
    
    # Sort all transactions by date (newest first)
    all_transactions.sort(key=lambda x: x.transaction_date, reverse=True)
    
    return KasgeldBalanceResponse(
        total_balance=total_balance,
        total_deposits=total_deposits,
        total_payments=total_payments,
        total_withdrawals=total_withdrawals,
        total_maintenance_costs=total_maintenance_costs,
        total_salary_payments=total_salary_payments,
        transactions=all_transactions
    )

@api_router.delete("/kasgeld/{kasgeld_id}")
async def delete_kasgeld_transaction(kasgeld_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.kasgeld.delete_one({"id": kasgeld_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden")
    return {"message": "Transactie verwijderd"}

# ==================== METERSTANDEN (METER READINGS) ROUTES ====================

@api_router.post("/meter-readings", response_model=MeterReadingResponse)
async def create_meter_reading(reading_data: MeterReadingCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new meter reading for an apartment"""
    # Verify apartment exists
    apt = await db.apartments.find_one(
        {"id": reading_data.apartment_id, "user_id": current_user["id"]},
        {"_id": 0, "name": 1}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # Get tenant info if provided
    tenant_name = None
    if reading_data.tenant_id:
        tenant = await db.tenants.find_one(
            {"id": reading_data.tenant_id, "user_id": current_user["id"]},
            {"_id": 0, "name": 1}
        )
        if tenant:
            tenant_name = tenant["name"]
    
    # Parse reading date to get period
    from datetime import datetime
    try:
        reading_dt = datetime.fromisoformat(reading_data.reading_date.replace('Z', '+00:00'))
    except Exception:
        reading_dt = datetime.now(timezone.utc)
    
    period_month = reading_dt.month
    period_year = reading_dt.year
    
    # Get previous reading for this apartment to calculate usage
    prev_reading = await db.meter_readings.find_one(
        {
            "apartment_id": reading_data.apartment_id,
            "user_id": current_user["id"],
            "$or": [
                {"period_year": {"$lt": period_year}},
                {"$and": [{"period_year": period_year}, {"period_month": {"$lt": period_month}}]}
            ]
        },
        {"_id": 0},
        sort=[("period_year", -1), ("period_month", -1)]
    )
    
    # Calculate usage and costs
    ebs_previous = prev_reading.get("ebs_reading") if prev_reading else None
    swm_previous = prev_reading.get("swm_reading") if prev_reading else None
    
    ebs_usage = None
    ebs_cost = None
    if reading_data.ebs_reading is not None and ebs_previous is not None:
        ebs_usage = max(0, reading_data.ebs_reading - ebs_previous)
        ebs_cost = calculate_ebs_cost(ebs_usage)
    
    swm_usage = None
    swm_cost = None
    if reading_data.swm_reading is not None and swm_previous is not None:
        swm_usage = max(0, reading_data.swm_reading - swm_previous)
        swm_cost = calculate_swm_cost(swm_usage)
    
    total_cost = (ebs_cost or 0) + (swm_cost or 0)
    
    reading_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    reading_doc = {
        "id": reading_id,
        "apartment_id": reading_data.apartment_id,
        "apartment_name": apt["name"],
        "tenant_id": reading_data.tenant_id,
        "tenant_name": tenant_name,
        "reading_date": reading_data.reading_date,
        "period_month": period_month,
        "period_year": period_year,
        "ebs_reading": reading_data.ebs_reading,
        "ebs_previous": ebs_previous,
        "ebs_usage": ebs_usage,
        "ebs_cost": ebs_cost,
        "swm_reading": reading_data.swm_reading,
        "swm_previous": swm_previous,
        "swm_usage": swm_usage,
        "swm_cost": swm_cost,
        "total_cost": total_cost if total_cost > 0 else None,
        "payment_status": "pending",
        "paid_at": None,
        "notes": reading_data.notes,
        "created_at": now.isoformat(),
        "submitted_by": "admin",
        "user_id": current_user["id"]
    }
    
    await db.meter_readings.insert_one(reading_doc)
    reading_doc.pop("_id", None)
    
    return MeterReadingResponse(**reading_doc)


@api_router.get("/meter-readings", response_model=List[MeterReadingResponse])
async def get_meter_readings(
    month: Optional[int] = None,
    year: Optional[int] = None,
    apartment_id: Optional[str] = None,
    payment_status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all meter readings with optional filters"""
    query = {"user_id": current_user["id"]}
    
    if month:
        query["period_month"] = month
    if year:
        query["period_year"] = year
    if apartment_id:
        query["apartment_id"] = apartment_id
    if payment_status:
        query["payment_status"] = payment_status
    
    readings = await db.meter_readings.find(
        query, {"_id": 0}
    ).sort([("period_year", -1), ("period_month", -1), ("apartment_name", 1)]).to_list(1000)
    
    return [MeterReadingResponse(**r) for r in readings]


@api_router.get("/meter-readings/summary")
async def get_meter_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get summary of meter readings for a period"""
    now = datetime.now(timezone.utc)
    period_month = month or now.month
    period_year = year or now.year
    
    # Get total apartments count
    total_apartments = await db.apartments.count_documents({"user_id": current_user["id"]})
    
    # Get readings for the period
    readings = await db.meter_readings.find(
        {
            "user_id": current_user["id"],
            "period_month": period_month,
            "period_year": period_year
        },
        {"_id": 0}
    ).to_list(1000)
    
    submitted_count = len(readings)
    pending_count = total_apartments - submitted_count
    
    total_ebs_usage = sum(r.get("ebs_usage") or 0 for r in readings)
    total_ebs_cost = sum(r.get("ebs_cost") or 0 for r in readings)
    total_swm_usage = sum(r.get("swm_usage") or 0 for r in readings)
    total_swm_cost = sum(r.get("swm_cost") or 0 for r in readings)
    total_cost = total_ebs_cost + total_swm_cost
    
    paid_readings = [r for r in readings if r.get("payment_status") == "paid"]
    unpaid_readings = [r for r in readings if r.get("payment_status") != "paid"]
    
    return MeterSummaryResponse(
        period_month=period_month,
        period_year=period_year,
        total_apartments=total_apartments,
        submitted_count=submitted_count,
        pending_count=pending_count,
        total_ebs_usage=round(total_ebs_usage, 2),
        total_ebs_cost=round(total_ebs_cost, 2),
        total_swm_usage=round(total_swm_usage, 2),
        total_swm_cost=round(total_swm_cost, 2),
        total_cost=round(total_cost, 2),
        paid_count=len(paid_readings),
        unpaid_count=len(unpaid_readings),
        unpaid_total=round(sum(r.get("total_cost") or 0 for r in unpaid_readings), 2)
    )


@api_router.put("/meter-readings/{reading_id}")
async def update_meter_reading(
    reading_id: str,
    update_data: MeterReadingUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a meter reading"""
    reading = await db.meter_readings.find_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Meterstand niet gevonden")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    # Recalculate costs if readings changed
    if "ebs_reading" in update_dict and reading.get("ebs_previous") is not None:
        ebs_usage = max(0, update_dict["ebs_reading"] - reading["ebs_previous"])
        update_dict["ebs_usage"] = ebs_usage
        update_dict["ebs_cost"] = calculate_ebs_cost(ebs_usage)
    
    if "swm_reading" in update_dict and reading.get("swm_previous") is not None:
        swm_usage = max(0, update_dict["swm_reading"] - reading["swm_previous"])
        update_dict["swm_usage"] = swm_usage
        update_dict["swm_cost"] = calculate_swm_cost(swm_usage)
    
    # Update total cost if either changed
    if "ebs_cost" in update_dict or "swm_cost" in update_dict:
        ebs_cost = update_dict.get("ebs_cost", reading.get("ebs_cost") or 0)
        swm_cost = update_dict.get("swm_cost", reading.get("swm_cost") or 0)
        update_dict["total_cost"] = ebs_cost + swm_cost
    
    if update_dict:
        await db.meter_readings.update_one(
            {"id": reading_id, "user_id": current_user["id"]},
            {"$set": update_dict}
        )
    
    updated = await db.meter_readings.find_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    return MeterReadingResponse(**updated)


@api_router.post("/meter-readings/{reading_id}/pay")
async def mark_meter_reading_paid(
    reading_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Mark a meter reading as paid and deduct from kasgeld"""
    reading = await db.meter_readings.find_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Meterstand niet gevonden")
    
    if reading.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Deze meterstand is al betaald")
    
    total_cost = reading.get("total_cost") or 0
    if total_cost <= 0:
        raise HTTPException(status_code=400, detail="Geen kosten om te betalen")
    
    now = datetime.now(timezone.utc)
    
    # Mark as paid
    await db.meter_readings.update_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"$set": {
            "payment_status": "paid",
            "paid_at": now.isoformat()
        }}
    )
    
    # Create kasgeld withdrawal for the payment
    kasgeld_id = str(uuid.uuid4())
    apt_name = reading.get("apartment_name", "Onbekend")
    period = f"{reading.get('period_month', '?')}/{reading.get('period_year', '?')}"
    
    kasgeld_doc = {
        "id": kasgeld_id,
        "amount": total_cost,
        "transaction_type": "withdrawal",
        "description": f"Nutsvoorzieningen {apt_name} - {period} (EBS/SWM)",
        "transaction_date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat(),
        "user_id": current_user["id"],
        "meter_reading_id": reading_id  # Link to meter reading
    }
    
    await db.kasgeld.insert_one(kasgeld_doc)
    
    return {
        "message": f"Betaling van SRD {total_cost:.2f} verwerkt en afgetrokken van kasgeld",
        "kasgeld_transaction_id": kasgeld_id
    }


@api_router.post("/meter-readings/{reading_id}/unpay")
async def mark_meter_reading_unpaid(
    reading_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Mark a meter reading as unpaid and reverse kasgeld deduction"""
    reading = await db.meter_readings.find_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Meterstand niet gevonden")
    
    if reading.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Deze meterstand is niet betaald")
    
    # Mark as unpaid
    await db.meter_readings.update_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"$set": {
            "payment_status": "pending",
            "paid_at": None
        }}
    )
    
    # Remove the kasgeld withdrawal
    await db.kasgeld.delete_one({
        "meter_reading_id": reading_id,
        "user_id": current_user["id"]
    })
    
    return {"message": "Betaling ongedaan gemaakt"}


@api_router.delete("/meter-readings/{reading_id}")
async def delete_meter_reading(
    reading_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a meter reading"""
    reading = await db.meter_readings.find_one(
        {"id": reading_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Meterstand niet gevonden")
    
    # If paid, also remove kasgeld transaction
    if reading.get("payment_status") == "paid":
        await db.kasgeld.delete_one({
            "meter_reading_id": reading_id,
            "user_id": current_user["id"]
        })
    
    await db.meter_readings.delete_one(
        {"id": reading_id, "user_id": current_user["id"]}
    )
    
    return {"message": "Meterstand verwijderd"}


@api_router.get("/meter-settings")
async def get_meter_settings(current_user: dict = Depends(get_current_active_user)):
    """Get meter settings including tariffs"""
    settings = await db.meter_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not settings:
        # Return defaults
        return {
            "id": None,
            "ebs_tariffs": EBS_TARIFFS,
            "swm_tariffs": SWM_TARIFFS,
            "reminder_day": 25,
            "reminder_enabled": True,
            "user_id": current_user["id"]
        }
    
    return settings


@api_router.put("/meter-settings")
async def update_meter_settings(
    settings_data: MeterSettingsCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update meter settings"""
    existing = await db.meter_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    update_dict = {
        "ebs_tariffs": settings_data.ebs_tariffs or EBS_TARIFFS,
        "swm_tariffs": settings_data.swm_tariffs or SWM_TARIFFS,
        "reminder_day": settings_data.reminder_day,
        "reminder_enabled": settings_data.reminder_enabled,
        "user_id": current_user["id"]
    }
    
    if existing:
        await db.meter_settings.update_one(
            {"user_id": current_user["id"]},
            {"$set": update_dict}
        )
    else:
        update_dict["id"] = str(uuid.uuid4())
        await db.meter_settings.insert_one(update_dict)
    
    result = await db.meter_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    return result


@api_router.get("/apartments/{apartment_id}/meter-history")
async def get_apartment_meter_history(
    apartment_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get meter reading history for a specific apartment"""
    apt = await db.apartments.find_one(
        {"id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0, "name": 1}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    readings = await db.meter_readings.find(
        {"apartment_id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort([("period_year", -1), ("period_month", -1)]).to_list(100)
    
    return {
        "apartment_id": apartment_id,
        "apartment_name": apt["name"],
        "readings": readings
    }


# ==================== ONDERHOUD (MAINTENANCE) ROUTES ====================

@api_router.post("/maintenance", response_model=MaintenanceResponse)
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify apartment exists
    apt = await db.apartments.find_one(
        {"id": maintenance_data.apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    maintenance_id = str(uuid.uuid4())
    maintenance_doc = {
        "id": maintenance_id,
        "apartment_id": maintenance_data.apartment_id,
        "category": maintenance_data.category,
        "description": maintenance_data.description,
        "cost": maintenance_data.cost,
        "maintenance_date": maintenance_data.maintenance_date,
        "status": maintenance_data.status,
        "cost_type": maintenance_data.cost_type,  # 'kasgeld' or 'tenant'
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.maintenance.insert_one(maintenance_doc)
    maintenance_doc.pop("_id", None)
    
    return MaintenanceResponse(
        **maintenance_doc,
        apartment_name=apt["name"]
    )

@api_router.get("/maintenance", response_model=List[MaintenanceResponse])
async def get_maintenance_records(current_user: dict = Depends(get_current_active_user)):
    records = await db.maintenance.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("maintenance_date", -1).to_list(1000)
    
    # Batch fetch apartment names
    apt_ids = list(set(r["apartment_id"] for r in records))
    apts = await db.apartments.find({"id": {"$in": apt_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apt_map = {a["id"]: a["name"] for a in apts}
    
    for record in records:
        record["apartment_name"] = apt_map.get(record["apartment_id"])
    
    return [MaintenanceResponse(**r) for r in records]

@api_router.get("/maintenance/{maintenance_id}", response_model=MaintenanceResponse)
async def get_maintenance_record(maintenance_id: str, current_user: dict = Depends(get_current_active_user)):
    record = await db.maintenance.find_one(
        {"id": maintenance_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    
    apt = await db.apartments.find_one({"id": record["apartment_id"]}, {"_id": 0, "name": 1})
    record["apartment_name"] = apt["name"] if apt else None
    
    return MaintenanceResponse(**record)

@api_router.put("/maintenance/{maintenance_id}", response_model=MaintenanceResponse)
async def update_maintenance(maintenance_id: str, maintenance_data: MaintenanceUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in maintenance_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.maintenance.update_one(
        {"id": maintenance_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    
    record = await db.maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    apt = await db.apartments.find_one({"id": record["apartment_id"]}, {"_id": 0, "name": 1})
    record["apartment_name"] = apt["name"] if apt else None
    
    return MaintenanceResponse(**record)

@api_router.delete("/maintenance/{maintenance_id}")
async def delete_maintenance(maintenance_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.maintenance.delete_one({"id": maintenance_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Onderhoudsrecord niet gevonden")
    return {"message": "Onderhoudsrecord verwijderd"}

@api_router.get("/maintenance/apartment/{apartment_id}", response_model=List[MaintenanceResponse])
async def get_apartment_maintenance(apartment_id: str, current_user: dict = Depends(get_current_active_user)):
    records = await db.maintenance.find(
        {"apartment_id": apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort("maintenance_date", -1).to_list(1000)
    
    apt = await db.apartments.find_one({"id": apartment_id}, {"_id": 0, "name": 1})
    apt_name = apt["name"] if apt else None
    
    for record in records:
        record["apartment_name"] = apt_name
    
    return [MaintenanceResponse(**r) for r in records]

# ==================== WERKNEMERS (EMPLOYEES) ROUTES ====================

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_active_user)):
    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id,
        "name": employee_data.name,
        "position": employee_data.position,
        "phone": employee_data.phone,
        "email": employee_data.email,
        "salary": employee_data.salary,
        "start_date": employee_data.start_date,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.employees.insert_one(employee_doc)
    employee_doc.pop("_id", None)
    
    return EmployeeResponse(**employee_doc)

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(current_user: dict = Depends(get_current_active_user)):
    employees = await db.employees.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    return [EmployeeResponse(**e) for e in employees]

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_active_user)):
    employee = await db.employees.find_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return EmployeeResponse(**employee)

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee_data: EmployeeUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in employee_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen gegevens om bij te werken")
    
    result = await db.employees.update_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return EmployeeResponse(**employee)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.employees.delete_one({"id": employee_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

# ==================== SALARIS (SALARY) ROUTES ====================

@api_router.post("/salaries", response_model=SalaryPaymentResponse)
async def create_salary_payment(salary_data: SalaryPaymentCreate, current_user: dict = Depends(get_current_active_user)):
    # Verify employee exists
    employee = await db.employees.find_one(
        {"id": salary_data.employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    salary_id = str(uuid.uuid4())
    salary_doc = {
        "id": salary_id,
        "employee_id": salary_data.employee_id,
        "amount": salary_data.amount,
        "payment_date": salary_data.payment_date,
        "period_month": salary_data.period_month,
        "period_year": salary_data.period_year,
        "description": salary_data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.salaries.insert_one(salary_doc)
    salary_doc.pop("_id", None)
    
    return SalaryPaymentResponse(
        **salary_doc,
        employee_name=employee["name"]
    )

@api_router.get("/salaries", response_model=List[SalaryPaymentResponse])
async def get_salary_payments(current_user: dict = Depends(get_current_active_user)):
    salaries = await db.salaries.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    
    # Batch fetch employee names
    employee_ids = list(set(s["employee_id"] for s in salaries))
    employees = await db.employees.find({"id": {"$in": employee_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    employee_map = {e["id"]: e["name"] for e in employees}
    
    for salary in salaries:
        salary["employee_name"] = employee_map.get(salary["employee_id"])
    
    return [SalaryPaymentResponse(**s) for s in salaries]

@api_router.delete("/salaries/{salary_id}")
async def delete_salary_payment(salary_id: str, current_user: dict = Depends(get_current_active_user)):
    result = await db.salaries.delete_one({"id": salary_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salarisbetaling niet gevonden")
    return {"message": "Salarisbetaling verwijderd"}

# ==================== PDF LOONSTROOK (PAYSLIP) ====================

def create_payslip_pdf(salary, employee, user):
    """Create a modern styled payslip PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'PayslipTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Company name from user
    company_name = user.get("company_name") if user and user.get("company_name") else "Facturatie N.V."
    
    # === HEADER SECTION ===
    
    # Left side: Logo or Company name
    left_content = []
    if user and user.get("logo"):
        try:
            logo_data = user["logo"]
            if "," in logo_data:
                logo_data = logo_data.split(",")[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=4*cm, height=2*cm)
            left_content.append(logo_img)
        except Exception as e:
            logger.error(f"Error adding logo: {e}")
            left_content.append(Paragraph(company_name, company_style))
    else:
        left_content.append(Paragraph(company_name, company_style))
    
    left_content.append(Paragraph("Verhuurbeheersysteem", small_text))
    
    # Right side: LOONSTROOK title
    right_content = [Paragraph("LOONSTROOK", title_style)]
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[10*cm, 7*cm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Green line separator
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === PAYSLIP DETAILS ROW ===
    payslip_num = salary["id"][:8].upper()
    payment_date = salary.get("payment_date", "-")
    months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
    period = f"{months_nl[salary.get('period_month', 1)]} {salary.get('period_year', '-')}"
    
    details_data = [
        [
            Paragraph("<b>Loonstrook Nr:</b>", normal_text),
            Paragraph(payslip_num, bold_text),
            Paragraph("<b>Betaaldatum:</b>", normal_text),
            Paragraph(payment_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 3*cm, 6*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === EMPLOYEE INFO ===
    emp_name = employee["name"] if employee else "Onbekend"
    emp_position = employee.get("position", "-") if employee else "-"
    emp_phone = employee.get("phone", "-") if employee else "-"
    emp_email = employee.get("email", "-") if employee else "-"
    emp_start = employee.get("start_date", "-") if employee else "-"
    
    info_left = [
        [Paragraph("WERKNEMER", section_header)],
        [Paragraph(f"<b>{emp_name}</b>", normal_text)],
        [Paragraph(f"Functie: {emp_position}", small_text)],
        [Paragraph(f"Tel: {emp_phone}", small_text)],
        [Paragraph(f"Email: {emp_email}", small_text)],
    ]
    
    info_right = [
        [Paragraph("PERIODE", section_header)],
        [Paragraph(f"<b>{period}</b>", normal_text)],
        [Paragraph(f"In dienst sinds: {emp_start}", small_text)],
        [Paragraph("", small_text)],
        [Paragraph("", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === PAYMENT TABLE ===
    amount = salary.get("amount", 0)
    description = salary.get("description") or f"Salaris {period}"
    
    table_header = ['OMSCHRIJVING', 'PERIODE', 'BEDRAG']
    table_data = [
        table_header,
        [description, period, format_currency(amount)]
    ]
    
    items_table = Table(table_data, colWidths=[9*cm, 4*cm, 4*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === TOTALS SECTION ===
    totals_data = [
        ['Bruto salaris:', format_currency(amount)],
        ['Inhoudingen:', format_currency(0)],
        ['', ''],
        ['NETTO UITBETAALD:', format_currency(amount)],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 2), 10),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 14),
        ('TEXTCOLOR', (0, 3), (-1, 3), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 2, PRIMARY_GREEN),
    ]))
    
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 30))
    
    # === FOOTER ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=15))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Dit document is gegenereerd door {company_name}", footer_style))
    elements.append(Paragraph("Bewaar deze loonstrook voor uw administratie.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/salaries/{salary_id}/pdf")
async def generate_payslip_pdf(salary_id: str, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF payslip for a salary payment"""
    # Get salary data
    salary = await db.salaries.find_one(
        {"id": salary_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not salary:
        raise HTTPException(status_code=404, detail="Salarisbetaling niet gevonden")
    
    employee = await db.employees.find_one({"id": salary["employee_id"]}, {"_id": 0})
    
    # Get user logo and company name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "logo": 1, "company_name": 1})
    
    # Create PDF
    buffer = create_payslip_pdf(salary, employee, user)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=loonstrook_{salary_id[:8]}.pdf"
        }
    )

# ==================== LENINGEN (LOANS) ROUTES ====================

@api_router.get("/loans")
async def get_loans(current_user: dict = Depends(get_current_active_user)):
    """Get all loans for the current user"""
    loans = await db.loans.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Get tenant names and calculate payments
    tenant_ids = list(set(loan["tenant_id"] for loan in loans))
    tenants = await db.tenants.find(
        {"id": {"$in": tenant_ids}},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(1000) if tenant_ids else []
    tenant_map = {t["id"]: t["name"] for t in tenants}
    
    # Get all loan payments
    loan_payments = await db.payments.find(
        {"user_id": current_user["id"], "payment_type": "loan"},
        {"_id": 0, "loan_id": 1, "amount": 1}
    ).to_list(10000)
    
    # Calculate payments per loan
    loan_payments_map = {}
    for p in loan_payments:
        loan_id = p.get("loan_id")
        if loan_id:
            if loan_id not in loan_payments_map:
                loan_payments_map[loan_id] = 0
            loan_payments_map[loan_id] += p["amount"]
    
    result = []
    for loan in loans:
        try:
            amount_paid = loan_payments_map.get(loan.get("id", ""), 0)
            loan_amount = loan.get("amount", 0) or 0
            remaining = loan_amount - amount_paid
            
            if remaining <= 0:
                calc_status = "paid"
            elif amount_paid > 0:
                calc_status = "partial"
            else:
                calc_status = "open"
            
            # Build response manually to avoid duplicate keys
            result.append(LoanResponse(
                id=loan.get("id", ""),
                tenant_id=loan.get("tenant_id", ""),
                amount=loan_amount,
                description=loan.get("description", ""),
                loan_date=loan.get("loan_date") or loan.get("created_at", "")[:10] if loan.get("created_at") else "",
                created_at=loan.get("created_at", ""),
                user_id=loan.get("user_id", ""),
                tenant_name=tenant_map.get(loan.get("tenant_id", ""), "Onbekend"),
                amount_paid=amount_paid,
                remaining=max(0, remaining),
                status=calc_status
            ))
        except Exception as e:
            # Skip invalid loans instead of crashing
            logger.error(f"Error processing loan {loan.get('id')}: {e}")
            continue
    
    return result

@api_router.post("/loans", response_model=LoanResponse)
async def create_loan(loan_data: LoanCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new loan for a tenant"""
    # Verify tenant exists
    tenant = await db.tenants.find_one(
        {"id": loan_data.tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    loan_id = str(uuid.uuid4())
    loan_doc = {
        "id": loan_id,
        "tenant_id": loan_data.tenant_id,
        "amount": loan_data.amount,
        "description": loan_data.description,
        "loan_date": loan_data.loan_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"]
    }
    
    await db.loans.insert_one(loan_doc)
    loan_doc.pop("_id", None)
    
    return LoanResponse(
        **loan_doc,
        tenant_name=tenant["name"],
        amount_paid=0,
        remaining=loan_data.amount,
        status="open"
    )

@api_router.put("/loans/{loan_id}", response_model=LoanResponse)
async def update_loan(loan_id: str, loan_data: LoanUpdate, current_user: dict = Depends(get_current_active_user)):
    """Update an existing loan"""
    loan = await db.loans.find_one(
        {"id": loan_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    
    update_data = {k: v for k, v in loan_data.dict().items() if v is not None}
    if update_data:
        await db.loans.update_one(
            {"id": loan_id},
            {"$set": update_data}
        )
    
    updated_loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    
    # Get tenant name
    tenant = await db.tenants.find_one({"id": updated_loan["tenant_id"]}, {"_id": 0, "name": 1})
    
    # Calculate payments
    loan_payments = await db.payments.find(
        {"loan_id": loan_id, "payment_type": "loan"},
        {"_id": 0, "amount": 1}
    ).to_list(1000)
    amount_paid = sum(p["amount"] for p in loan_payments)
    remaining = updated_loan["amount"] - amount_paid
    
    if remaining <= 0:
        status = "paid"
    elif amount_paid > 0:
        status = "partial"
    else:
        status = "open"
    
    return LoanResponse(
        **updated_loan,
        tenant_name=tenant["name"] if tenant else "Onbekend",
        amount_paid=amount_paid,
        remaining=max(0, remaining),
        status=status
    )

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a loan"""
    result = await db.loans.delete_one({"id": loan_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    return {"message": "Lening verwijderd"}

@api_router.get("/tenants/{tenant_id}/loans")
async def get_tenant_loans(tenant_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get all loans for a specific tenant"""
    loans = await db.loans.find(
        {"tenant_id": tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Get loan payments
    loan_ids = [loan["id"] for loan in loans]
    loan_payments = await db.payments.find(
        {"loan_id": {"$in": loan_ids}, "payment_type": "loan"},
        {"_id": 0, "loan_id": 1, "amount": 1}
    ).to_list(1000) if loan_ids else []
    
    loan_payments_map = {}
    for p in loan_payments:
        loan_id = p.get("loan_id")
        if loan_id:
            if loan_id not in loan_payments_map:
                loan_payments_map[loan_id] = 0
            loan_payments_map[loan_id] += p["amount"]
    
    total_loans = 0
    total_paid = 0
    result = []
    
    for loan in loans:
        amount_paid = loan_payments_map.get(loan["id"], 0)
        remaining = loan["amount"] - amount_paid
        total_loans += loan["amount"]
        total_paid += amount_paid
        
        if remaining <= 0:
            status = "paid"
        elif amount_paid > 0:
            status = "partial"
        else:
            status = "open"
        
        result.append({
            **loan,
            "amount_paid": amount_paid,
            "remaining": max(0, remaining),
            "status": status
        })
    
    return {
        "loans": result,
        "total_loans": total_loans,
        "total_paid": total_paid,
        "total_remaining": total_loans - total_paid
    }

# ==================== CONTRACT (HUURCONTRACT) ROUTES ====================

class ContractCreate(BaseModel):
    tenant_id: str
    apartment_id: str
    start_date: str
    end_date: Optional[str] = None  # None = onbepaalde tijd
    rent_amount: float
    deposit_amount: float
    payment_due_day: int = 1
    payment_deadline_day: Optional[int] = None
    payment_deadline_month_offset: int = 0
    additional_terms: Optional[str] = None

class ContractUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    payment_due_day: Optional[int] = None
    payment_deadline_day: Optional[int] = None
    payment_deadline_month_offset: Optional[int] = None
    additional_terms: Optional[str] = None

class ContractResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    apartment_id: str
    apartment_name: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    rent_amount: float
    deposit_amount: float
    payment_due_day: int
    payment_deadline_day: Optional[int] = None
    payment_deadline_month_offset: int = 0
    additional_terms: Optional[str] = None
    status: str  # 'draft', 'pending_signature', 'signed'
    signing_token: Optional[str] = None
    signature_data: Optional[str] = None
    signed_at: Optional[str] = None
    created_at: str
    user_id: str
    # Landlord info
    landlord_name: Optional[str] = None
    landlord_company: Optional[str] = None

@api_router.get("/contracts", response_model=List[ContractResponse])
async def get_contracts(current_user: dict = Depends(get_current_active_user)):
    """Get all contracts for the current user"""
    contracts = await db.contracts.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get tenant and apartment info
    tenant_ids = list(set(c["tenant_id"] for c in contracts))
    apartment_ids = list(set(c["apartment_id"] for c in contracts))
    
    tenants = await db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    apartments = await db.apartments.find({"id": {"$in": apartment_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    
    tenant_map = {t["id"]: t["name"] for t in tenants}
    apartment_map = {a["id"]: a["name"] for a in apartments}
    
    result = []
    for contract in contracts:
        contract["tenant_name"] = tenant_map.get(contract["tenant_id"])
        contract["apartment_name"] = apartment_map.get(contract["apartment_id"])
        contract["landlord_name"] = current_user.get("name")
        contract["landlord_company"] = current_user.get("company_name")
        result.append(ContractResponse(**contract))
    
    return result

@api_router.post("/contracts", response_model=ContractResponse)
async def create_contract(contract: ContractCreate, current_user: dict = Depends(get_current_active_user)):
    """Create a new contract"""
    # Verify tenant exists and belongs to user
    tenant = await db.tenants.find_one(
        {"id": contract.tenant_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Verify apartment exists and belongs to user
    apartment = await db.apartments.find_one(
        {"id": contract.apartment_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not apartment:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    
    # Generate unique signing token
    signing_token = str(uuid.uuid4())
    
    contract_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "tenant_id": contract.tenant_id,
        "apartment_id": contract.apartment_id,
        "start_date": contract.start_date,
        "end_date": contract.end_date,
        "rent_amount": contract.rent_amount,
        "deposit_amount": contract.deposit_amount,
        "payment_due_day": contract.payment_due_day,
        "payment_deadline_day": contract.payment_deadline_day,
        "payment_deadline_month_offset": contract.payment_deadline_month_offset,
        "additional_terms": contract.additional_terms,
        "status": "pending_signature",
        "signing_token": signing_token,
        "signature_data": None,
        "signed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contracts.insert_one(contract_doc)
    
    return ContractResponse(
        **contract_doc,
        tenant_name=tenant["name"],
        apartment_name=apartment["name"],
        landlord_name=current_user.get("name"),
        landlord_company=current_user.get("company_name")
    )

@api_router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get a specific contract"""
    contract = await db.contracts.find_one(
        {"id": contract_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0, "name": 1})
    apartment = await db.apartments.find_one({"id": contract["apartment_id"]}, {"_id": 0, "name": 1})
    
    return ContractResponse(
        **contract,
        tenant_name=tenant["name"] if tenant else None,
        apartment_name=apartment["name"] if apartment else None,
        landlord_name=current_user.get("name"),
        landlord_company=current_user.get("company_name")
    )

@api_router.put("/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(contract_id: str, contract_data: ContractUpdate, current_user: dict = Depends(get_current_active_user)):
    """Update a contract (only if not yet signed)"""
    contract = await db.contracts.find_one(
        {"id": contract_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    if contract["status"] == "signed":
        raise HTTPException(status_code=400, detail="Ondertekende contracten kunnen niet worden gewijzigd")
    
    update_data = {k: v for k, v in contract_data.dict().items() if v is not None}
    if update_data:
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": update_data}
        )
    
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": updated["tenant_id"]}, {"_id": 0, "name": 1})
    apartment = await db.apartments.find_one({"id": updated["apartment_id"]}, {"_id": 0, "name": 1})
    
    return ContractResponse(
        **updated,
        tenant_name=tenant["name"] if tenant else None,
        apartment_name=apartment["name"] if apartment else None,
        landlord_name=current_user.get("name"),
        landlord_company=current_user.get("company_name")
    )

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a contract"""
    result = await db.contracts.delete_one({"id": contract_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    return {"message": "Contract verwijderd"}

# Public endpoint for signing (no auth required)
@api_router.get("/contracts/sign/{token}")
async def get_contract_for_signing(token: str):
    """Get contract details for signing (public endpoint)"""
    contract = await db.contracts.find_one(
        {"signing_token": token},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden of link is verlopen")
    
    if contract["status"] == "signed":
        raise HTTPException(status_code=400, detail="Dit contract is al ondertekend")
    
    # Get related info
    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0})
    apartment = await db.apartments.find_one({"id": contract["apartment_id"]}, {"_id": 0})
    user = await db.users.find_one({"id": contract["user_id"]}, {"_id": 0, "name": 1, "company_name": 1, "email": 1})
    
    return {
        "contract": {
            "id": contract["id"],
            "start_date": contract["start_date"],
            "end_date": contract["end_date"],
            "rent_amount": contract["rent_amount"],
            "deposit_amount": contract["deposit_amount"],
            "payment_due_day": contract["payment_due_day"],
            "payment_deadline_day": contract.get("payment_deadline_day"),
            "payment_deadline_month_offset": contract.get("payment_deadline_month_offset", 0),
            "additional_terms": contract.get("additional_terms"),
            "status": contract["status"]
        },
        "tenant": {
            "name": tenant["name"] if tenant else None,
            "email": tenant.get("email") if tenant else None,
            "phone": tenant.get("phone") if tenant else None,
            "id_number": tenant.get("id_number") if tenant else None
        },
        "apartment": {
            "name": apartment["name"] if apartment else None,
            "address": apartment.get("address") if apartment else None
        },
        "landlord": {
            "name": user.get("name") if user else None,
            "company_name": user.get("company_name") if user else None,
            "email": user.get("email") if user else None
        }
    }

class SignatureSubmit(BaseModel):
    signature_data: str  # Base64 encoded image

@api_router.post("/contracts/sign/{token}")
async def sign_contract(token: str, signature: SignatureSubmit):
    """Submit signature for a contract (public endpoint)"""
    contract = await db.contracts.find_one(
        {"signing_token": token},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden of link is verlopen")
    
    if contract["status"] == "signed":
        raise HTTPException(status_code=400, detail="Dit contract is al ondertekend")
    
    # Update contract with signature
    await db.contracts.update_one(
        {"signing_token": token},
        {"$set": {
            "signature_data": signature.signature_data,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "status": "signed"
        }}
    )
    
    return {"message": "Contract succesvol ondertekend"}

@api_router.get("/contracts/{contract_id}/pdf")
async def get_contract_pdf(contract_id: str, current_user: dict = Depends(get_current_active_user)):
    """Generate PDF for a contract"""
    contract = await db.contracts.find_one(
        {"id": contract_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    # Get related data
    tenant = await db.tenants.find_one({"id": contract["tenant_id"]}, {"_id": 0})
    apartment = await db.apartments.find_one({"id": contract["apartment_id"]}, {"_id": 0})
    user = await db.users.find_one({"id": contract["user_id"]}, {"_id": 0})
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Colors
    PRIMARY_GREEN = HexColor("#0caf60")
    DARK_TEXT = HexColor("#1a1a1a")
    GRAY_TEXT = HexColor("#666666")
    HexColor("#f5f5f5")
    
    # Custom styles
    title_style = ParagraphStyle(
        'ContractTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=DARK_TEXT,
        spaceAfter=20,
        alignment=1  # Center
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=11,
        textColor=DARK_TEXT,
        spaceAfter=8,
        leading=16
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT
    )
    
    # Header with logo placeholder
    company_name = user.get("company_name") or user.get("name") or "Verhuurder"
    elements.append(Paragraph(company_name, ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=1
    )))
    elements.append(Spacer(1, 10))
    
    # Title
    elements.append(Paragraph("HUUROVEREENKOMST", title_style))
    elements.append(Spacer(1, 20))
    
    # Contract info
    contract_date = datetime.now(timezone.utc).strftime("%d-%m-%Y")
    elements.append(Paragraph(f"Datum: {contract_date}", small_text))
    elements.append(Paragraph(f"Contractnummer: {contract['id'][:8].upper()}", small_text))
    elements.append(Spacer(1, 20))
    
    # PARTIJEN
    elements.append(Paragraph("PARTIJEN", section_header))
    
    # Verhuurder
    landlord_text = f"""
    <b>DE VERHUURDER:</b><br/>
    Naam: {user.get('name', '-')}<br/>
    Bedrijf: {user.get('company_name', '-')}<br/>
    E-mail: {user.get('email', '-')}<br/>
    """
    elements.append(Paragraph(landlord_text, normal_text))
    elements.append(Spacer(1, 10))
    
    # Huurder
    tenant_text = f"""
    <b>DE HUURDER:</b><br/>
    Naam: {tenant.get('name', '-') if tenant else '-'}<br/>
    ID/Paspoort: {tenant.get('id_number', '-') if tenant else '-'}<br/>
    Telefoon: {tenant.get('phone', '-') if tenant else '-'}<br/>
    E-mail: {tenant.get('email', '-') if tenant else '-'}<br/>
    """
    elements.append(Paragraph(tenant_text, normal_text))
    elements.append(Spacer(1, 20))
    
    # HET GEHUURDE
    elements.append(Paragraph("HET GEHUURDE", section_header))
    apt_address = apartment.get('address', '-') if apartment else '-'
    apt_name = apartment.get('name', '-') if apartment else '-'
    elements.append(Paragraph(f"""
    Het gehuurde betreft: <b>{apt_name}</b><br/>
    Adres: {apt_address}<br/>
    """, normal_text))
    elements.append(Spacer(1, 20))
    
    # HUURPERIODE
    elements.append(Paragraph("HUURPERIODE", section_header))
    start_date = contract.get('start_date', '-')
    end_date = contract.get('end_date')
    if end_date:
        period_text = f"De huurovereenkomst gaat in op <b>{start_date}</b> en eindigt op <b>{end_date}</b>."
    else:
        period_text = f"De huurovereenkomst gaat in op <b>{start_date}</b> en is voor onbepaalde tijd."
    elements.append(Paragraph(period_text, normal_text))
    elements.append(Spacer(1, 20))
    
    # HUURPRIJS EN BETALING
    elements.append(Paragraph("HUURPRIJS EN BETALING", section_header))
    
    def format_currency(amount):
        return f"SRD {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    rent_amount = format_currency(contract.get('rent_amount', 0))
    deposit_amount = format_currency(contract.get('deposit_amount', 0))
    due_day = contract.get('payment_due_day', 1)
    
    payment_text = f"""
    <b>Huurprijs:</b> {rent_amount} per maand<br/>
    <b>Waarborgsom:</b> {deposit_amount}<br/>
    <b>Betaaldatum:</b> De {due_day}e van elke maand<br/>
    """
    
    deadline_day = contract.get('payment_deadline_day')
    deadline_offset = contract.get('payment_deadline_month_offset', 0)
    if deadline_day and deadline_day > 0:
        if deadline_offset == 1:
            payment_text += f"<b>Uiterste betaaldatum:</b> De {deadline_day}e van de volgende maand<br/>"
        else:
            payment_text += f"<b>Uiterste betaaldatum:</b> De {deadline_day}e van dezelfde maand<br/>"
    
    elements.append(Paragraph(payment_text, normal_text))
    elements.append(Spacer(1, 20))
    
    # BIJZONDERE BEPALINGEN
    if contract.get('additional_terms'):
        elements.append(Paragraph("BIJZONDERE BEPALINGEN", section_header))
        elements.append(Paragraph(contract['additional_terms'], normal_text))
        elements.append(Spacer(1, 20))
    
    # ONDERTEKENING
    elements.append(Paragraph("ONDERTEKENING", section_header))
    elements.append(Paragraph(
        "Aldus overeengekomen en in tweevoud opgemaakt en ondertekend:",
        normal_text
    ))
    elements.append(Spacer(1, 30))
    
    # Signature table
    sig_data = [
        ["Verhuurder", "Huurder"],
        ["", ""],
        ["", ""],
        [f"Naam: {user.get('name', '-')}", f"Naam: {tenant.get('name', '-') if tenant else '-'}"],
        [f"Datum: {contract_date}", f"Datum: {contract.get('signed_at', '_______________')[:10] if contract.get('signed_at') else '_______________'}"]
    ]
    
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(sig_table)
    
    # Add signature image if signed
    if contract.get('signature_data') and contract.get('status') == 'signed':
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("<b>Digitale Handtekening Huurder:</b>", small_text))
        
        try:
            # Decode base64 signature
            sig_b64 = contract['signature_data']
            if ',' in sig_b64:
                sig_b64 = sig_b64.split(',')[1]
            sig_bytes = base64.b64decode(sig_b64)
            sig_img = PILImage.open(BytesIO(sig_bytes))
            
            # Save to buffer
            img_buffer = BytesIO()
            sig_img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            # Add to PDF
            sig_image = Image(img_buffer, width=6*cm, height=2*cm)
            elements.append(sig_image)
            elements.append(Paragraph(f"Ondertekend op: {contract['signed_at'][:10]}", small_text))
        except Exception:
            elements.append(Paragraph("[Handtekening beschikbaar]", small_text))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    tenant_name = tenant.get('name', 'huurder').replace(' ', '_') if tenant else 'huurder'
    filename = f"Contract_{tenant_name}_{contract['id'][:8]}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== WISSELKOERS (EXCHANGE RATE) ROUTES ====================

# Cache for exchange rate (to avoid too many API calls)
exchange_rate_cache = {
    "rate": None,
    "last_updated": None
}

@api_router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate():
    """Get current SRD to EUR exchange rate"""
    now = datetime.now(timezone.utc)
    
    # Check if cache is valid (less than 1 hour old)
    if exchange_rate_cache["rate"] and exchange_rate_cache["last_updated"]:
        cache_age = (now - exchange_rate_cache["last_updated"]).total_seconds()
        if cache_age < 3600:  # 1 hour
            return ExchangeRateResponse(
                srd_to_eur=exchange_rate_cache["rate"],
                eur_to_srd=1 / exchange_rate_cache["rate"],
                last_updated=exchange_rate_cache["last_updated"].isoformat(),
                source="cached"
            )
    
    # Try to fetch from external API
    try:
        async with httpx.AsyncClient() as client:
            # Using exchangerate-api.com (free tier)
            response = await client.get(
                "https://api.exchangerate-api.com/v4/latest/EUR",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                # SRD rate from EUR
                eur_to_srd = data.get("rates", {}).get("SRD", 38.5)
                srd_to_eur = 1 / eur_to_srd
                
                # Update cache
                exchange_rate_cache["rate"] = srd_to_eur
                exchange_rate_cache["last_updated"] = now
                
                return ExchangeRateResponse(
                    srd_to_eur=srd_to_eur,
                    eur_to_srd=eur_to_srd,
                    last_updated=now.isoformat(),
                    source="live"
                )
    except Exception as e:
        logger.warning(f"Failed to fetch exchange rate: {e}")
    
    # Fallback to approximate rate if API fails
    # Current approximate rate: 1 EUR ≈ 38.5 SRD (December 2024)
    fallback_eur_to_srd = 38.5
    return ExchangeRateResponse(
        srd_to_eur=1 / fallback_eur_to_srd,
        eur_to_srd=fallback_eur_to_srd,
        last_updated=now.isoformat(),
        source="fallback"
    )

# ==================== ADMIN/SUPERADMIN ROUTES ====================

# ==================== ADD-ONS MANAGEMENT ROUTES ====================

@api_router.get("/addons", response_model=List[AddonResponse])
async def get_all_addons():
    """Get all available add-ons (public endpoint)"""
    addons = await db.addons.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    return [AddonResponse(**addon) for addon in addons]

@api_router.get("/addons/{slug_or_id}")
async def get_addon_by_slug_or_id(slug_or_id: str):
    """Get a single addon by slug or id (public endpoint for module detail page)"""
    # Try finding by slug first (exact match)
    addon = await db.addons.find_one({"slug": slug_or_id, "is_active": True}, {"_id": 0})
    
    if not addon:
        # Try with underscore replaced by hyphen and vice versa
        alt_slug = slug_or_id.replace('-', '_') if '-' in slug_or_id else slug_or_id.replace('_', '-')
        addon = await db.addons.find_one({"slug": alt_slug, "is_active": True}, {"_id": 0})
    
    if not addon:
        # Try by id
        addon = await db.addons.find_one({"id": slug_or_id, "is_active": True}, {"_id": 0})
    
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    return AddonResponse(**addon)

@api_router.post("/admin/addons", response_model=AddonResponse)
async def create_addon(addon_data: AddonCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new add-on - superadmin only"""
    # Check if slug already exists
    existing = await db.addons.find_one({"slug": addon_data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Add-on met deze slug bestaat al")
    
    addon_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    addon_doc = {
        "id": addon_id,
        "name": addon_data.name,
        "slug": addon_data.slug,
        "description": addon_data.description,
        "price": addon_data.price,
        "is_active": addon_data.is_active,
        "created_at": now,
        # Extra module detail fields
        "category": addon_data.category,
        "icon_name": addon_data.icon_name,
        "hero_image_url": addon_data.hero_image_url,
        "highlights": addon_data.highlights or [],
        "features": addon_data.features or []
    }
    
    await db.addons.insert_one(addon_doc)
    return AddonResponse(**addon_doc)

@api_router.get("/admin/addons", response_model=List[AddonResponse])
async def get_admin_addons(current_user: dict = Depends(get_superadmin)):
    """Get all add-ons including inactive - superadmin only"""
    addons = await db.addons.find({}, {"_id": 0}).to_list(100)
    return [AddonResponse(**addon) for addon in addons]

@api_router.put("/admin/addons/{addon_id}", response_model=AddonResponse)
async def update_addon(addon_id: str, addon_data: AddonUpdate, current_user: dict = Depends(get_superadmin)):
    """Update an add-on - superadmin only"""
    addon = await db.addons.find_one({"id": addon_id}, {"_id": 0})
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    
    update_data = {k: v for k, v in addon_data.model_dump().items() if v is not None}
    if update_data:
        await db.addons.update_one({"id": addon_id}, {"$set": update_data})
    
    updated = await db.addons.find_one({"id": addon_id}, {"_id": 0})
    return AddonResponse(**updated)

@api_router.delete("/admin/addons/{addon_id}")
async def delete_addon(addon_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete an add-on - superadmin only"""
    result = await db.addons.delete_one({"id": addon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    
    # Also remove all user addons for this addon
    await db.user_addons.delete_many({"addon_id": addon_id})
    await db.addon_requests.delete_many({"addon_id": addon_id})
    
    return {"message": "Add-on verwijderd"}

# ==================== USER ADD-ONS MANAGEMENT ====================

@api_router.get("/user/addons", response_model=List[UserAddonResponse])
async def get_my_addons(current_user: dict = Depends(get_current_user)):
    """Get current user's active add-ons"""
    user_addons = await db.user_addons.find(
        {"user_id": current_user["id"]}
    ).to_list(100)
    
    result = []
    now = datetime.now(timezone.utc)
    
    for ua in user_addons:
        # Convert _id to id
        ua_id = str(ua.pop("_id", ""))
        
        # Check if expired
        end_date = ua.get("end_date") or ua.get("expires_at")
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt < now and ua.get("status") == "active":
                    await db.user_addons.update_one(
                        {"_id": ObjectId(ua_id)},
                        {"$set": {"status": "expired"}}
                    )
                    ua["status"] = "expired"
            except Exception:
                pass
        
        addon = await db.addons.find_one(
            {"$or": [{"id": ua.get("addon_id")}, {"slug": ua.get("addon_slug")}]},
            {"_id": 0}
        )
        
        result.append(UserAddonResponse(
            id=ua_id or ua.get("id", ""),
            user_id=ua.get("user_id", ""),
            addon_id=ua.get("addon_id") or ua.get("addon_slug", ""),
            addon_name=addon.get("name") if addon else ua.get("addon_slug"),
            addon_slug=ua.get("addon_slug") or (addon.get("slug") if addon else None),
            status=ua.get("status", "active"),
            start_date=ua.get("start_date") or ua.get("activated_at") or ua.get("created_at"),
            end_date=ua.get("end_date") or ua.get("expires_at"),
            created_at=ua.get("created_at") or ua.get("activated_at")
        ))
    
    return result

@api_router.post("/user/addons/request", response_model=AddonRequestResponse)
async def request_addon_activation(request_data: AddonRequestCreate, current_user: dict = Depends(get_current_user)):
    """Request activation of an add-on (for customers)"""
    # Check if addon exists
    addon = await db.addons.find_one({"id": request_data.addon_id, "is_active": True}, {"_id": 0})
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden of niet beschikbaar")
    
    # Check if already has active addon
    existing_active = await db.user_addons.find_one({
        "user_id": current_user["id"],
        "addon_id": request_data.addon_id,
        "status": "active"
    }, {"_id": 0})
    if existing_active:
        raise HTTPException(status_code=400, detail="U heeft deze add-on al actief")
    
    # Check if pending request exists
    existing_request = await db.addon_requests.find_one({
        "user_id": current_user["id"],
        "addon_id": request_data.addon_id,
        "status": "pending"
    }, {"_id": 0})
    if existing_request:
        raise HTTPException(status_code=400, detail="U heeft al een verzoek ingediend voor deze add-on")
    
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    request_doc = {
        "id": request_id,
        "user_id": current_user["id"],
        "addon_id": request_data.addon_id,
        "status": "pending",
        "notes": request_data.notes,
        "created_at": now
    }
    
    await db.addon_requests.insert_one(request_doc)
    
    return AddonRequestResponse(
        id=request_id,
        user_id=current_user["id"],
        user_name=current_user.get("name"),
        user_email=current_user.get("email"),
        addon_id=request_data.addon_id,
        addon_name=addon.get("name"),
        addon_price=addon.get("price"),
        status="pending",
        notes=request_data.notes,
        created_at=now
    )

# ==================== MODULE PAYMENT STATUS ====================

class ModulePaymentStatus(BaseModel):
    has_expired_modules: bool
    expired_modules: List[dict]
    total_monthly_amount: float
    trial_ends_at: Optional[str] = None
    payment_info: dict

@api_router.get("/user/modules/payment-status")
async def get_module_payment_status(current_user: dict = Depends(get_current_user)):
    """Check if user has expired modules that need payment"""
    # Superadmin doesn't need to pay
    if current_user.get("role") == "superadmin":
        return {
            "has_expired_modules": False,
            "expired_modules": [],
            "total_monthly_amount": 0,
            "payment_info": {}
        }
    
    user_addons = await db.user_addons.find(
        {"user_id": current_user["id"]}
    ).to_list(100)
    
    now = datetime.now(timezone.utc)
    expired_modules = []
    total_amount = 0
    trial_ends_at = None
    
    for ua in user_addons:
        addon = await db.addons.find_one(
            {"$or": [{"id": ua.get("addon_id")}, {"slug": ua.get("addon_slug")}]},
            {"_id": 0}
        )
        
        # Skip free modules
        if addon and (addon.get("is_free") or addon.get("price", 0) == 0):
            continue
        
        end_date = ua.get("end_date") or ua.get("expires_at")
        status = ua.get("status", "active")
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if end_dt < now or status == "expired" or status == "trial_expired":
                    expired_modules.append({
                        "id": str(ua.get("_id", "")),
                        "addon_id": ua.get("addon_id"),
                        "addon_name": addon.get("name") if addon else "Onbekend",
                        "addon_slug": ua.get("addon_slug") or (addon.get("slug") if addon else None),
                        "price": addon.get("price", 0) if addon else 0,
                        "expired_at": end_date
                    })
                    total_amount += addon.get("price", 0) if addon else 0
                elif not trial_ends_at or end_dt.isoformat() < trial_ends_at:
                    trial_ends_at = end_dt.isoformat()
            except Exception:
                pass
    
    # Get payment settings - first try global settings from admin
    payment_settings = await db.payment_settings.find_one(
        {"type": "global"},
        {"_id": 0}
    )
    
    # If no global settings, try workspace settings
    if not payment_settings:
        payment_settings = await db.workspace_payment_settings.find_one(
            {"workspace_id": "global"},
            {"_id": 0}
        )
        # Extract bank transfer settings if found
        if payment_settings and payment_settings.get("payment_methods"):
            bank_method = next((m for m in payment_settings["payment_methods"] if m.get("method_id") == "bank_transfer"), None)
            if bank_method and bank_method.get("bank_settings"):
                payment_settings = {
                    "bank_transfer": {
                        "bank_name": bank_method["bank_settings"].get("bank_name", ""),
                        "account_holder": bank_method["bank_settings"].get("account_holder", ""),
                        "account_number": bank_method["bank_settings"].get("account_number", ""),
                        "iban": bank_method["bank_settings"].get("iban", ""),
                        "instructions": bank_method.get("instructions", "")
                    }
                }
    
    # Default payment info if no settings found
    default_payment_info = {
        "bank_name": "",
        "account_holder": "",
        "account_number": "",
        "instructions": "Neem contact op met de beheerder voor betaalinformatie."
    }
    
    return {
        "has_expired_modules": len(expired_modules) > 0,
        "expired_modules": expired_modules,
        "total_monthly_amount": total_amount,
        "trial_ends_at": trial_ends_at,
        "payment_info": payment_settings.get("bank_transfer", default_payment_info) if payment_settings else default_payment_info
    }

@api_router.get("/user/modules/payment-methods")
async def get_module_payment_methods(current_user: dict = Depends(get_current_user)):
    """Get available payment methods for module orders"""
    # Get global payment settings from admin
    payment_settings = await db.payment_settings.find_one(
        {"type": "global"},
        {"_id": 0}
    )
    
    # If no global settings, try workspace settings with workspace_id = "global"
    if not payment_settings:
        payment_settings = await db.workspace_payment_settings.find_one(
            {"workspace_id": "global"},
            {"_id": 0}
        )
    
    # Build list of enabled payment methods
    payment_methods = []
    
    if payment_settings and payment_settings.get("payment_methods"):
        for m in payment_settings.get("payment_methods", []):
            if m.get("is_enabled", False):
                method_info = {
                    "method_id": m.get("method_id"),
                    "name": m.get("name"),
                    "description": m.get("description"),
                    "instructions": m.get("instructions"),
                    "is_default": m.get("is_default", False)
                }
                
                # Add bank details for bank transfer
                if m.get("method_id") == "bank_transfer" and m.get("bank_settings"):
                    method_info["bank_settings"] = {
                        "bank_name": m["bank_settings"].get("bank_name", ""),
                        "account_holder": m["bank_settings"].get("account_holder", ""),
                        "account_number": m["bank_settings"].get("account_number", ""),
                        "iban": m["bank_settings"].get("iban", ""),
                        "description": m["bank_settings"].get("description", "")
                    }
                
                payment_methods.append(method_info)
    elif payment_settings and payment_settings.get("bank_transfer"):
        # Old format - single bank transfer
        bank_info = payment_settings.get("bank_transfer", {})
        payment_methods.append({
            "method_id": "bank_transfer",
            "name": "Bankoverschrijving",
            "description": "Betalen via bankoverschrijving",
            "instructions": bank_info.get("instructions", "Maak het bedrag over naar onderstaande rekening."),
            "is_default": True,
            "bank_settings": {
                "bank_name": bank_info.get("bank_name", ""),
                "account_holder": bank_info.get("account_holder", ""),
                "account_number": bank_info.get("account_number", ""),
                "iban": bank_info.get("iban", ""),
                "description": bank_info.get("description", "")
            }
        })
    
    # Default if no payment methods configured
    if not payment_methods:
        payment_methods = [{
            "method_id": "bank_transfer",
            "name": "Bankoverschrijving",
            "description": "Betalen via bankoverschrijving",
            "instructions": "Neem contact op met de beheerder voor betaalinformatie.",
            "is_default": True,
            "bank_settings": {
                "bank_name": "",
                "account_holder": "",
                "account_number": "",
                "description": ""
            }
        }]
    
    return {
        "payment_methods": payment_methods,
        "default_method": next((m["method_id"] for m in payment_methods if m.get("is_default")), "bank_transfer")
    }

@api_router.post("/user/modules/payment-request")
async def submit_payment_request(current_user: dict = Depends(get_current_user)):
    """Submit a payment request for expired modules"""
    # Get expired modules
    status = await get_module_payment_status(current_user)
    
    if not status["has_expired_modules"]:
        raise HTTPException(status_code=400, detail="Geen verlopen modules gevonden")
    
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    payment_request = {
        "id": request_id,
        "user_id": current_user["id"],
        "user_name": current_user.get("name"),
        "user_email": current_user.get("email"),
        "modules": status["expired_modules"],
        "total_amount": status["total_monthly_amount"],
        "status": "pending",
        "created_at": now
    }
    
    await db.module_payment_requests.insert_one(payment_request)
    
    return {"success": True, "request_id": request_id, "message": "Betaalverzoek ingediend"}

# ==================== USER MODULE ORDER (for existing users) ====================

class UserModuleOrder(BaseModel):
    modules: List[str]  # List of addon IDs
    customer: Optional[dict] = None

@api_router.post("/user/modules/order")
async def create_user_module_order(
    data: UserModuleOrder,
    current_user: dict = Depends(get_current_user)
):
    """Create a module order for existing user - activates 3-day trial"""
    if not data.modules:
        raise HTTPException(status_code=400, detail="Selecteer minimaal één module")
    
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=3)
    
    activated_modules = []
    total_amount = 0
    
    for addon_id in data.modules:
        # Get addon details
        addon = await db.addons.find_one(
            {"$or": [{"id": addon_id}, {"_id": addon_id}]},
            {"_id": 0}
        )
        if not addon:
            continue
        
        # Check if user already has this addon
        existing = await db.user_addons.find_one({
            "user_id": current_user["id"],
            "$or": [{"addon_id": addon_id}, {"addon_slug": addon.get("slug")}]
        })
        
        if existing:
            # Reactivate with trial
            await db.user_addons.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "status": "trial",
                    "end_date": trial_end.isoformat(),
                    "trial_ends_at": trial_end.isoformat(),
                    "reactivated_at": now.isoformat()
                }}
            )
        else:
            # Create new subscription with trial
            user_addon = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "addon_id": addon.get("id"),
                "addon_slug": addon.get("slug"),
                "addon_name": addon.get("name"),
                "status": "trial",
                "start_date": now.isoformat(),
                "end_date": trial_end.isoformat(),
                "trial_ends_at": trial_end.isoformat(),
                "created_at": now.isoformat()
            }
            await db.user_addons.insert_one(user_addon)
        
        activated_modules.append({
            "addon_id": addon.get("id"),
            "addon_name": addon.get("name"),
            "price": addon.get("price", 0)
        })
        total_amount += addon.get("price", 0)
    
    # Get payment settings for the response
    payment_settings = await db.workspace_payment_settings.find_one(
        {"workspace_id": "global"},
        {"_id": 0}
    )
    
    payment_info = {
        "bank_name": "Hakrinbank",
        "account_number": "1234567890",
        "account_holder": "Facturatie N.V.",
        "instructions": "Vermeld uw naam en e-mailadres bij de betaling"
    }
    
    if payment_settings and payment_settings.get("payment_methods"):
        bank_method = next((m for m in payment_settings["payment_methods"] if m.get("method_id") == "bank_transfer"), None)
        if bank_method and bank_method.get("bank_settings"):
            payment_info = {
                "bank_name": bank_method["bank_settings"].get("bank_name", payment_info["bank_name"]),
                "account_number": bank_method["bank_settings"].get("account_number", payment_info["account_number"]),
                "account_holder": bank_method["bank_settings"].get("account_holder", payment_info["account_holder"]),
                "instructions": bank_method.get("instructions", payment_info["instructions"])
            }
    
    # Create order record
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "user_id": current_user["id"],
        "user_email": current_user.get("email"),
        "modules": activated_modules,
        "total_amount": total_amount,
        "status": "trial_activated",
        "trial_ends_at": trial_end.isoformat(),
        "created_at": now.isoformat()
    }
    await db.module_orders.insert_one(order)
    
    return {
        "success": True,
        "order_id": order_id,
        "activated_modules": activated_modules,
        "trial_ends_at": trial_end.isoformat(),
        "total_monthly_amount": total_amount,
        "payment_info": payment_info,
        "message": f"Modules geactiveerd voor 3 dagen proefperiode"
    }

# ==================== EMAIL SETTINGS & NOTIFICATIONS ====================

class EmailSettings(BaseModel):
    enabled: bool = False
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_email: str
    from_name: str = "Facturatie.sr"
    use_tls: bool = True
    start_tls: bool = True
    # Admin notification settings
    admin_email: Optional[str] = None
    notify_new_customer: bool = True
    notify_payment_request: bool = True
    notify_module_expiring: bool = True

class CustomerEmailSettings(BaseModel):
    enabled: bool = False
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    use_tls: bool = True

@api_router.get("/admin/email-settings")
async def get_admin_email_settings(current_user: dict = Depends(get_superadmin)):
    """Get global email settings - superadmin only"""
    email_service = get_email_service(db)
    settings = await email_service.get_settings("global")
    if settings:
        # Hide password in response
        settings["smtp_password"] = "********" if settings.get("smtp_password") else ""
    return settings or {}

@api_router.put("/admin/email-settings")
async def update_admin_email_settings(
    settings: EmailSettings,
    current_user: dict = Depends(get_superadmin)
):
    """Update global email settings - superadmin only"""
    email_service = get_email_service(db)
    
    # Get existing settings to preserve password if not changed
    existing = await email_service.get_settings("global")
    settings_dict = settings.dict()
    
    if settings_dict.get("smtp_password") == "********" and existing:
        settings_dict["smtp_password"] = existing.get("smtp_password", "")
    
    await email_service.save_settings("global", settings_dict)
    return {"success": True, "message": "Email instellingen opgeslagen"}

@api_router.post("/admin/email-settings/test")
async def test_admin_email(
    to_email: str = None,
    current_user: dict = Depends(get_superadmin)
):
    """Send a test email - superadmin only"""
    email_service = get_email_service(db)
    target_email = to_email or current_user.get("email")
    
    result = await email_service.send_test_email(target_email, "global")
    return result

@api_router.get("/admin/email-templates")
async def get_email_templates(current_user: dict = Depends(get_superadmin)):
    """Get available email templates - superadmin only"""
    templates = []
    for name, template in EMAIL_TEMPLATES.items():
        templates.append({
            "name": name,
            "subject": template["subject"],
            "description": get_template_description(name)
        })
    return templates

def get_template_description(name: str) -> str:
    descriptions = {
        "welcome": "Welkom email voor nieuwe klanten met inloggegevens",
        "password_reset": "Wachtwoord reset email met code",
        "module_expiring_soon": "Herinnering dat module(s) bijna verlopen",
        "module_expired": "Notificatie dat module(s) zijn verlopen",
        "payment_confirmed": "Bevestiging van betaling en module activatie",
        "admin_new_payment_request": "Admin notificatie bij nieuw betaalverzoek"
    }
    return descriptions.get(name, "")

@api_router.get("/admin/email-logs")
async def get_email_logs(
    limit: int = 50,
    current_user: dict = Depends(get_superadmin)
):
    """Get email send logs - superadmin only"""
    logs = await db.email_logs.find(
        {},
        {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    return logs

# ==================== SCHEDULED TASKS / CRON JOBS ====================

@api_router.get("/admin/scheduled-jobs/status")
async def get_scheduled_jobs_status(current_user: dict = Depends(get_superadmin)):
    """Get status of scheduled jobs"""
    email_service = get_email_service(db)
    scheduler = get_scheduled_tasks(db, email_service)
    
    jobs = []
    for job in scheduler.scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    # Get recent job logs
    recent_logs = await db.scheduled_job_logs.find(
        {},
        {"_id": 0}
    ).sort("run_at", -1).limit(10).to_list(10)
    
    return {
        "scheduler_running": scheduler.scheduler.running,
        "jobs": jobs,
        "recent_logs": recent_logs
    }

@api_router.post("/admin/scheduled-jobs/run")
async def run_scheduled_job_manually(
    job_type: str = "all",
    current_user: dict = Depends(get_superadmin)
):
    """Manually run scheduled jobs - superadmin only"""
    email_service = get_email_service(db)
    scheduler = get_scheduled_tasks(db, email_service)
    
    results = await scheduler.run_manual_check(job_type)
    
    return {
        "success": True,
        "message": f"Job(s) uitgevoerd: {job_type}",
        "results": results
    }

@api_router.get("/admin/scheduled-jobs/logs")
async def get_scheduled_job_logs(
    limit: int = 50,
    current_user: dict = Depends(get_superadmin)
):
    """Get scheduled job execution logs"""
    logs = await db.scheduled_job_logs.find(
        {},
        {"_id": 0}
    ).sort("run_at", -1).limit(limit).to_list(limit)
    return logs

# Customer email settings
@api_router.get("/user/email-settings")
async def get_user_email_settings(current_user: dict = Depends(get_current_user)):
    """Get customer email settings"""
    settings = await db.customer_email_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    if settings:
        settings["smtp_password"] = "********" if settings.get("smtp_password") else ""
    return settings or {"enabled": False}

@api_router.put("/user/email-settings")
async def update_user_email_settings(
    settings: CustomerEmailSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update customer email settings"""
    # Get existing settings to preserve password if not changed
    existing = await db.customer_email_settings.find_one({"user_id": current_user["id"]})
    settings_dict = settings.dict()
    settings_dict["user_id"] = current_user["id"]
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if settings_dict.get("smtp_password") == "********" and existing:
        settings_dict["smtp_password"] = existing.get("smtp_password", "")
    
    await db.customer_email_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": settings_dict},
        upsert=True
    )
    return {"success": True, "message": "Email instellingen opgeslagen"}

@api_router.post("/user/email-settings/test")
async def test_user_email(current_user: dict = Depends(get_current_user)):
    """Send a test email using customer's own SMTP settings"""
    settings = await db.customer_email_settings.find_one(
        {"user_id": current_user["id"]}
    )
    
    if not settings or not settings.get("enabled"):
        raise HTTPException(status_code=400, detail="Email niet geconfigureerd")
    
    # Create a temporary email service with customer settings
    email_service = get_email_service(db)
    
    # Save customer settings temporarily as their workspace
    workspace_id = f"customer_{current_user['id']}"
    await email_service.save_settings(workspace_id, settings)
    
    result = await email_service.send_test_email(current_user["email"], workspace_id)
    return result

# ==================== SIDEBAR MODULE ORDER ====================

class SidebarModuleOrder(BaseModel):
    module_order: List[str]  # List of addon slugs in desired order

@api_router.get("/user/sidebar-order")
async def get_user_sidebar_order(current_user: dict = Depends(get_current_user)):
    """Get user's sidebar module order preference and default dashboard"""
    settings = await db.user_sidebar_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    return settings or {"module_order": [], "default_dashboard": None}

@api_router.put("/user/sidebar-order")
async def update_user_sidebar_order(
    data: SidebarModuleOrder,
    current_user: dict = Depends(get_current_user)
):
    """Update user's sidebar module order preference"""
    update_data = {
        "user_id": current_user["id"],
        "module_order": data.module_order,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    # Include default_dashboard if provided
    if hasattr(data, 'default_dashboard') and data.default_dashboard is not None:
        update_data["default_dashboard"] = data.default_dashboard
    
    await db.user_sidebar_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data},
        upsert=True
    )
    return {"success": True, "message": "Sidebar volgorde opgeslagen"}

@api_router.put("/user/default-dashboard")
async def update_default_dashboard(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's default dashboard preference"""
    default_dashboard = data.get("default_dashboard")
    await db.user_sidebar_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": {
            "user_id": current_user["id"],
            "default_dashboard": default_dashboard,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "message": "Standaard dashboard opgeslagen"}

# ==================== MODULE SETTINGS SYSTEM ====================

class ModuleSettingsBase(BaseModel):
    """Base model for all module settings"""
    pass

class VastgoedSettings(ModuleSettingsBase):
    rent_due_day: int = 1
    payment_frequency: str = "monthly"
    grace_period_days: int = 5
    payment_deadline_day: int = 0
    payment_deadline_month_offset: int = 0
    late_fee_percentage: float = 0
    late_fee_fixed: float = 0
    auto_generate_invoices: bool = True
    invoice_prefix: str = "HF"
    default_currency: str = "SRD"
    send_payment_reminders: bool = True
    reminder_days_before: int = 3

class HRMSettings(ModuleSettingsBase):
    work_hours_per_day: float = 8.0
    work_days_per_week: int = 5
    overtime_multiplier: float = 1.5
    weekend_multiplier: float = 2.0
    annual_leave_days: int = 20
    sick_leave_days: int = 10
    maternity_leave_days: int = 90
    paternity_leave_days: int = 5
    probation_period_months: int = 3
    notice_period_days: int = 30
    salary_payment_day: int = 25
    default_currency: str = "SRD"
    track_attendance: bool = True
    require_leave_approval: bool = True

class AutoDealerSettings(ModuleSettingsBase):
    commission_percentage: float = 5.0
    default_warranty_months: int = 12
    auto_generate_contracts: bool = True
    contract_prefix: str = "VC"
    invoice_prefix: str = "VF"
    default_currency: str = "SRD"
    track_test_drives: bool = True
    require_deposit: bool = True
    deposit_percentage: float = 10.0
    show_prices_on_portal: bool = True
    allow_online_inquiries: bool = True

class BeautySpaSettings(ModuleSettingsBase):
    opening_time: str = "09:00"
    closing_time: str = "18:00"
    slot_duration_minutes: int = 30
    buffer_between_appointments: int = 15
    max_advance_booking_days: int = 30
    cancellation_notice_hours: int = 24
    no_show_fee_percentage: float = 50.0
    default_currency: str = "SRD"
    send_appointment_reminders: bool = True
    reminder_hours_before: int = 24
    allow_online_booking: bool = True
    require_deposit: bool = False
    deposit_percentage: float = 25.0

class PompstationSettings(ModuleSettingsBase):
    fuel_price_gasoline: float = 0.0
    fuel_price_diesel: float = 0.0
    fuel_price_lpg: float = 0.0
    tank_warning_level_percentage: int = 20
    tank_critical_level_percentage: int = 10
    shift_duration_hours: int = 8
    track_meter_readings: bool = True
    require_shift_handover: bool = True
    default_currency: str = "SRD"
    auto_update_inventory: bool = True
    pos_receipt_header: str = ""
    pos_receipt_footer: str = ""

class BoekhoudingSettings(ModuleSettingsBase):
    default_currency: str = "SRD"
    fiscal_year_start_month: int = 1
    btw_tarief_hoog: float = 25.0
    btw_tarief_laag: float = 10.0
    btw_aangifte_periode: str = "quarterly"
    auto_btw_calculation: bool = True
    invoice_prefix: str = "VF"
    invoice_number_length: int = 5
    default_payment_terms_days: int = 30
    show_btw_on_invoices: bool = True
    enable_multi_currency: bool = True
    exchange_rate_source: str = "manual"

# Generic endpoint to get module settings
@api_router.get("/module-settings/{module_slug}")
async def get_module_settings(
    module_slug: str,
    current_user: dict = Depends(get_current_user)
):
    """Get settings for a specific module"""
    settings = await db.module_settings.find_one(
        {"user_id": current_user["id"], "module_slug": module_slug},
        {"_id": 0}
    )
    
    # Return default settings if none exist
    if not settings:
        defaults = get_default_module_settings(module_slug)
        return {"module_slug": module_slug, "settings": defaults, "is_default": True}
    
    return {"module_slug": module_slug, "settings": settings.get("settings", {}), "is_default": False}

# Generic endpoint to update module settings
@api_router.put("/module-settings/{module_slug}")
async def update_module_settings(
    module_slug: str,
    settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update settings for a specific module"""
    await db.module_settings.update_one(
        {"user_id": current_user["id"], "module_slug": module_slug},
        {"$set": {
            "user_id": current_user["id"],
            "module_slug": module_slug,
            "settings": settings,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "message": f"{module_slug} instellingen opgeslagen"}

def get_default_module_settings(module_slug: str) -> dict:
    """Get default settings for a module"""
    defaults = {
        "vastgoed_beheer": VastgoedSettings().model_dump(),
        "hrm": HRMSettings().model_dump(),
        "autodealer": AutoDealerSettings().model_dump(),
        "beauty": BeautySpaSettings().model_dump(),
        "pompstation": PompstationSettings().model_dump(),
        "boekhouding": BoekhoudingSettings().model_dump(),
    }
    return defaults.get(module_slug, {})

# Endpoint to get all module settings at once
@api_router.get("/module-settings")
async def get_all_module_settings(current_user: dict = Depends(get_current_user)):
    """Get all module settings for current user"""
    settings_cursor = db.module_settings.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    settings_list = await settings_cursor.to_list(100)
    
    # Create a dict with module_slug as key
    result = {}
    for s in settings_list:
        result[s["module_slug"]] = s.get("settings", {})
    
    return result

# ==================== ADMIN BULK MODULE ACTIVATION ====================

class BulkModuleActivation(BaseModel):
    user_id: str
    addon_ids: List[str]
    months: int = 1
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None

@api_router.post("/admin/users/{user_id}/activate-modules")
async def admin_activate_user_modules(
    user_id: str,
    data: BulkModuleActivation,
    current_user: dict = Depends(get_superadmin)
):
    """Activate multiple modules for a user at once - superadmin only"""
    # Verify user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    now = datetime.now(timezone.utc)
    end_date = (now + timedelta(days=30 * data.months)).isoformat()
    now_str = now.isoformat()
    
    activated_modules = []
    total_amount = 0
    
    for addon_id in data.addon_ids:
        # Get addon details
        addon = await db.addons.find_one({"id": addon_id}, {"_id": 0})
        if not addon:
            continue
        
        # Check if user already has this addon
        existing = await db.user_addons.find_one({
            "user_id": user_id,
            "addon_id": addon_id
        })
        
        if existing:
            # Update existing addon
            await db.user_addons.update_one(
                {"user_id": user_id, "addon_id": addon_id},
                {"$set": {
                    "status": "active",
                    "end_date": end_date,
                    "is_trial": False,
                    "updated_at": now_str
                }}
            )
        else:
            # Create new user addon
            user_addon = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "addon_id": addon_id,
                "addon_slug": addon.get("slug"),
                "status": "active",
                "start_date": now_str,
                "end_date": end_date if addon.get("price", 0) > 0 else None,
                "is_trial": False,
                "created_at": now_str
            }
            await db.user_addons.insert_one(user_addon)
        
        activated_modules.append(addon.get("name"))
        total_amount += addon.get("price", 0) * data.months
    
    # Update user subscription status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription_status": "active",
            "subscription_end_date": end_date,
            "updated_at": now_str
        }}
    )
    
    # Record payment
    if total_amount > 0:
        payment_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_name": user.get("name"),
            "user_email": user.get("email"),
            "amount": total_amount,
            "months": data.months,
            "modules": activated_modules,
            "payment_method": data.payment_method,
            "payment_reference": data.payment_reference,
            "type": "module_activation",
            "created_at": now_str
        }
        await db.module_payments.insert_one(payment_record)
    
    return {
        "success": True,
        "activated_modules": activated_modules,
        "total_amount": total_amount,
        "end_date": end_date,
        "message": f"{len(activated_modules)} module(s) geactiveerd voor {data.months} maand(en)"
    }

@api_router.get("/admin/module-payments")
async def get_module_payments(current_user: dict = Depends(get_superadmin)):
    """Get all module payment records - superadmin only"""
    payments = await db.module_payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return payments

@api_router.get("/admin/module-payment-requests")
async def get_module_payment_requests(current_user: dict = Depends(get_superadmin)):
    """Get all pending module payment requests - superadmin only"""
    requests = await db.module_payment_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return requests

@api_router.post("/admin/module-payment-requests/{request_id}/confirm")
async def confirm_module_payment(
    request_id: str,
    months: int = 1,
    current_user: dict = Depends(get_superadmin)
):
    """Confirm a module payment request and activate modules - superadmin only"""
    request = await db.module_payment_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Betaalverzoek niet gevonden")
    
    # Activate the modules
    activation_data = BulkModuleActivation(
        user_id=request["user_id"],
        addon_ids=[m["addon_id"] for m in request.get("modules", [])],
        months=months,
        payment_method="bank_transfer"
    )
    
    result = await admin_activate_user_modules(request["user_id"], activation_data, current_user)
    
    # Update request status
    await db.module_payment_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "confirmed",
            "confirmed_at": datetime.now(timezone.utc).isoformat(),
            "confirmed_by": current_user["id"]
        }}
    )
    
    return result

# ==================== ADMIN USER ADD-ONS MANAGEMENT ====================

@api_router.get("/admin/user-addons", response_model=List[UserAddonResponse])
async def get_all_user_addons(current_user: dict = Depends(get_superadmin)):
    """Get all user add-ons - superadmin only"""
    user_addons = await db.user_addons.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for ua in user_addons:
        user = await db.users.find_one({"id": ua["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        
        result.append(UserAddonResponse(
            id=ua["id"],
            user_id=ua["user_id"],
            user_name=user.get("name") if user else None,
            user_email=user.get("email") if user else None,
            addon_id=ua["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_slug=addon.get("slug") if addon else None,
            status=ua.get("status", "active"),
            start_date=ua.get("start_date", ua.get("created_at")),
            end_date=ua.get("end_date"),
            created_at=ua.get("created_at")
        ))
    
    return result

@api_router.get("/admin/users/{user_id}/addons", response_model=List[UserAddonResponse])
async def get_user_addons_admin(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Get add-ons for a specific user - superadmin only"""
    user_addons = await db.user_addons.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    result = []
    for ua in user_addons:
        addon = await db.addons.find_one({"id": ua["addon_id"]}, {"_id": 0})
        
        result.append(UserAddonResponse(
            id=ua["id"],
            user_id=ua["user_id"],
            addon_id=ua["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_slug=addon.get("slug") if addon else None,
            status=ua.get("status", "active"),
            start_date=ua.get("start_date", ua.get("created_at")),
            end_date=ua.get("end_date"),
            created_at=ua.get("created_at")
        ))
    
    return result

@api_router.post("/admin/users/{user_id}/addons", response_model=UserAddonResponse)
async def activate_user_addon(user_id: str, addon_data: UserAddonCreate, current_user: dict = Depends(get_superadmin)):
    """Activate an add-on for a user - superadmin only"""
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    # Check if addon exists
    addon = await db.addons.find_one({"id": addon_data.addon_id}, {"_id": 0})
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on niet gevonden")
    
    # Check if already has active addon of same type
    existing = await db.user_addons.find_one({
        "user_id": user_id,
        "addon_id": addon_data.addon_id,
        "status": "active"
    }, {"_id": 0})
    
    now = datetime.now(timezone.utc)
    end_date = (now + timedelta(days=30 * addon_data.months)).isoformat()
    
    if existing:
        # Extend existing addon
        current_end = existing.get("end_date")
        if current_end:
            try:
                current_end_dt = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
                if current_end_dt > now:
                    # Extend from current end date
                    end_date = (current_end_dt + timedelta(days=30 * addon_data.months)).isoformat()
            except Exception:
                pass
        
        await db.user_addons.update_one(
            {"id": existing["id"]},
            {"$set": {"end_date": end_date}}
        )
        
        updated = await db.user_addons.find_one({"id": existing["id"]}, {"_id": 0})
        return UserAddonResponse(
            id=updated["id"],
            user_id=updated["user_id"],
            user_name=user.get("name"),
            user_email=user.get("email"),
            addon_id=updated["addon_id"],
            addon_name=addon.get("name"),
            addon_slug=addon.get("slug"),
            status=updated.get("status", "active"),
            start_date=updated.get("start_date", updated.get("created_at")),
            end_date=updated.get("end_date"),
            created_at=updated.get("created_at")
        )
    
    # Create new user addon
    user_addon_id = str(uuid.uuid4())
    
    user_addon_doc = {
        "id": user_addon_id,
        "user_id": user_id,
        "addon_id": addon_data.addon_id,
        "status": "active",
        "start_date": now.isoformat(),
        "end_date": end_date,
        "payment_method": addon_data.payment_method,
        "payment_reference": addon_data.payment_reference,
        "created_at": now.isoformat()
    }
    
    await db.user_addons.insert_one(user_addon_doc)
    
    # Remove any pending requests for this addon
    await db.addon_requests.delete_many({
        "user_id": user_id,
        "addon_id": addon_data.addon_id,
        "status": "pending"
    })
    
    return UserAddonResponse(
        id=user_addon_id,
        user_id=user_id,
        user_name=user.get("name"),
        user_email=user.get("email"),
        addon_id=addon_data.addon_id,
        addon_name=addon.get("name"),
        addon_slug=addon.get("slug"),
        status="active",
        start_date=now.isoformat(),
        end_date=end_date,
        created_at=now.isoformat()
    )

@api_router.delete("/admin/users/{user_id}/addons/{addon_id}")
async def deactivate_user_addon(user_id: str, addon_id: str, current_user: dict = Depends(get_superadmin)):
    """Deactivate an add-on for a user - superadmin only"""
    result = await db.user_addons.update_one(
        {"user_id": user_id, "addon_id": addon_id, "status": "active"},
        {"$set": {"status": "deactivated"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Actieve add-on niet gevonden voor deze gebruiker")
    
    return {"message": "Add-on gedeactiveerd"}

# ==================== ADD-ON REQUESTS MANAGEMENT ====================

@api_router.get("/admin/addon-requests", response_model=List[AddonRequestResponse])
async def get_addon_requests(current_user: dict = Depends(get_superadmin)):
    """Get all pending add-on requests - superadmin only"""
    requests = await db.addon_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for req in requests:
        user = await db.users.find_one({"id": req["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        addon = await db.addons.find_one({"id": req["addon_id"]}, {"_id": 0})
        
        result.append(AddonRequestResponse(
            id=req["id"],
            user_id=req["user_id"],
            user_name=user.get("name") if user else None,
            user_email=user.get("email") if user else None,
            addon_id=req["addon_id"],
            addon_name=addon.get("name") if addon else None,
            addon_price=addon.get("price") if addon else None,
            status=req.get("status", "pending"),
            notes=req.get("notes"),
            created_at=req.get("created_at")
        ))
    
    return result

@api_router.put("/admin/addon-requests/{request_id}/approve")
async def approve_addon_request(request_id: str, months: int = 1, current_user: dict = Depends(get_superadmin)):
    """Approve an add-on request - superadmin only"""
    request = await db.addon_requests.find_one({"id": request_id, "status": "pending"}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden of al verwerkt")
    
    # Activate the addon for the user
    addon_data = UserAddonCreate(
        user_id=request["user_id"],
        addon_id=request["addon_id"],
        months=months
    )
    
    # Use the existing activation function
    result = await activate_user_addon(request["user_id"], addon_data, current_user)
    
    # Mark request as approved
    await db.addon_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved"}}
    )
    
    # Calculate subscription end date based on months
    now = datetime.now(timezone.utc)
    end_date = (now + timedelta(days=30 * months)).isoformat()
    
    # Update user's subscription status and end date (they now have at least one active addon)
    await db.users.update_one(
        {"id": request["user_id"]},
        {"$set": {
            "subscription_status": "active",
            "subscription_end_date": end_date
        }}
    )
    
    return {"message": "Add-on verzoek goedgekeurd en geactiveerd", "user_addon": result}

@api_router.put("/admin/addon-requests/{request_id}/reject")
async def reject_addon_request(request_id: str, current_user: dict = Depends(get_superadmin)):
    """Reject an add-on request - superadmin only"""
    result = await db.addon_requests.update_one(
        {"id": request_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Verzoek niet gevonden of al verwerkt")
    
    return {"message": "Add-on verzoek afgewezen"}

@api_router.get("/my-addon-requests")
async def get_my_addon_requests(current_user: dict = Depends(get_current_user)):
    """Get addon requests for the current user"""
    requests = await db.addon_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return requests

@api_router.get("/my-active-addons")
async def get_my_active_addons(current_user: dict = Depends(get_current_user)):
    """Get active addons for the current user"""
    user_addons = await db.user_addons.find(
        {"user_id": current_user["id"], "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with addon details
    for ua in user_addons:
        addon = await db.addons.find_one({"id": ua.get("addon_id")}, {"_id": 0})
        if addon:
            ua["addon_name"] = addon.get("name")
            ua["addon_slug"] = addon.get("slug")
    
    return user_addons

# ==================== LANDING PAGE CMS ROUTES ====================

@api_router.get("/public/landing/sections")
async def get_landing_sections():
    """Get all active landing page sections (public)"""
    sections = await db.landing_sections.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return sections

@api_router.get("/public/landing/settings")
async def get_landing_settings():
    """Get landing page settings (public)"""
    settings = await db.landing_settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "company_name": "Facturatie N.V.",
            "company_email": "info@facturatie.sr",
            "company_phone": "+597 8934982",
            "company_address": "Paramaribo, Suriname",
            "logo_url": "https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp",
            "footer_text": "© 2025 Facturatie N.V. Alle rechten voorbehouden.",
            "social_links": {}
        }
    return settings

@api_router.get("/public/addons")
async def get_public_addons():
    """Get all active add-ons for landing page (public)"""
    addons = await db.addons.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    return addons

# Newsletter subscriber model
class NewsletterSubscribe(BaseModel):
    email: str

@api_router.post("/public/newsletter/subscribe")
async def subscribe_newsletter(data: NewsletterSubscribe):
    """Subscribe to newsletter for updates"""
    email = data.email.lower().strip()
    
    # Basic email validation
    if not email or '@' not in email or '.' not in email:
        raise HTTPException(status_code=400, detail="Voer een geldig e-mailadres in")
    
    # Check if already subscribed
    existing = await db.newsletter_subscribers.find_one({"email": email})
    if existing:
        return {"message": "U bent al aangemeld voor onze nieuwsbrief"}
    
    # Create subscriber
    subscriber = {
        "id": str(uuid.uuid4()),
        "email": email,
        "subscribed_at": datetime.utcnow().isoformat(),
        "is_active": True
    }
    
    await db.newsletter_subscribers.insert_one(subscriber)
    
    return {"message": "Bedankt voor uw aanmelding!", "success": True}

@api_router.post("/public/orders")
async def create_public_order(order_data: PublicOrderCreate):
    """Create a new order from landing page with account creation, auto-login, and 3-day trial"""
    # Validate at least one addon selected
    if not order_data.addon_ids or len(order_data.addon_ids) == 0:
        raise HTTPException(status_code=400, detail="Selecteer minimaal één module")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": order_data.email.lower()}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Dit e-mailadres is al geregistreerd. Log in of gebruik een ander e-mailadres.")
    
    # Validate password
    if len(order_data.password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens zijn")
    
    # Validate addons exist
    addon_names = []
    total_price = 0
    addon_details = []
    for addon_id in order_data.addon_ids:
        addon = await db.addons.find_one({"id": addon_id, "is_active": True}, {"_id": 0})
        if not addon:
            raise HTTPException(status_code=400, detail=f"Add-on niet gevonden: {addon_id}")
        addon_names.append(addon["name"])
        total_price += addon.get("price", 0)
        addon_details.append(addon)
    
    order_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    now_str = now.isoformat()
    
    # Calculate 3-day trial end date
    trial_end = (now + timedelta(days=3)).isoformat()
    
    # Create user account (active - can login immediately)
    user_doc = {
        "id": user_id,
        "email": order_data.email.lower(),
        "password": hash_password(order_data.password),
        "name": order_data.name,
        "company_name": order_data.company_name,
        "phone": order_data.phone,
        "role": "customer",
        "subscription_status": "trial",  # 3-day trial period
        "trial_end_date": trial_end,
        "created_at": now_str,
        "order_id": order_id
    }
    
    await db.users.insert_one(user_doc)
    
    # Directly activate modules with 3-day trial (no approval needed)
    for addon in addon_details:
        user_addon = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "addon_id": addon["id"],
            "addon_slug": addon.get("slug"),
            "status": "trial" if addon.get("price", 0) > 0 else "active",  # Free modules are always active
            "start_date": now_str,
            "end_date": trial_end if addon.get("price", 0) > 0 else None,  # Free modules don't expire
            "is_trial": addon.get("price", 0) > 0,
            "order_id": order_id,
            "created_at": now_str
        }
        await db.user_addons.insert_one(user_addon)
    
    # Create order record
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "name": order_data.name,
        "email": order_data.email.lower(),
        "phone": order_data.phone,
        "company_name": order_data.company_name,
        "addon_ids": order_data.addon_ids,
        "addon_names": addon_names,
        "total_price": total_price,
        "message": order_data.message,
        "status": "trial",  # Order is in trial
        "trial_end_date": trial_end,
        "payment_id": None,
        "payment_url": None,
        "created_at": now_str
    }
    
    await db.public_orders.insert_one(order_doc)
    
    # Generate JWT token for auto-login
    token = create_token(user_id, order_data.email.lower())
    
    # Return order with token for auto-login
    return {
        "order": PublicOrderResponse(**order_doc),
        "token": token,
        "user": {
            "id": user_id,
            "email": order_data.email.lower(),
            "name": order_data.name,
            "role": "customer"
        }
    }

# ==================== MOPE PAYMENT ROUTES ====================

MOPE_API_URL = "https://api.mope.sr/api"

async def get_mope_settings():
    """Get Mope payment settings"""
    settings = await db.mope_settings.find_one({}, {"_id": 0})
    if not settings:
        return MopeSettings()
    return MopeSettings(**settings)

async def get_mope_token():
    """Get the active Mope API token"""
    settings = await get_mope_settings()
    if not settings.is_enabled:
        return None
    if settings.use_live_mode:
        return settings.live_token
    return settings.test_token

@api_router.get("/admin/mope/settings")
async def get_admin_mope_settings(current_user: dict = Depends(get_superadmin)):
    """Get Mope payment settings (admin)"""
    settings = await db.mope_settings.find_one({}, {"_id": 0})
    if not settings:
        return MopeSettings()
    return settings

@api_router.put("/admin/mope/settings")
async def update_mope_settings(settings_data: MopeSettings, current_user: dict = Depends(get_superadmin)):
    """Update Mope payment settings (admin)"""
    settings_dict = settings_data.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.mope_settings.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_data

@api_router.post("/public/orders/{order_id}/pay")
async def create_payment_for_order(order_id: str, redirect_url: str = ""):
    """Create a Mope payment for an order"""
    import httpx
    
    # Get order
    order = await db.public_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    if order.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Deze bestelling is al betaald")
    
    # Get Mope settings
    token = await get_mope_token()
    if not token:
        raise HTTPException(status_code=400, detail="Mope betalingen zijn niet geconfigureerd. Neem contact op met de beheerder.")
    
    # Get landing settings for redirect URL
    await db.landing_settings.find_one({}, {"_id": 0})
    base_url = redirect_url or "/"
    
    # Create payment request to Mope
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MOPE_API_URL}/shop/payment_request",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "amount": order["total_price"],
                    "description": f"Bestelling {order_id[:8]} - {', '.join(order.get('addon_names', []))}",
                    "redirect_url": f"{base_url}/betaling-voltooid?order_id={order_id}"
                },
                timeout=30.0
            )
            
            if response.status_code != 200 and response.status_code != 201:
                logger.error(f"Mope API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Fout bij het aanmaken van de betaling")
            
            mope_response = response.json()
            payment_id = mope_response.get("id")
            payment_url = mope_response.get("payment_url") or mope_response.get("url")
            
            # Update order with payment info
            await db.public_orders.update_one(
                {"id": order_id},
                {"$set": {
                    "payment_id": payment_id,
                    "payment_url": payment_url,
                    "status": "pending_payment"
                }}
            )
            
            return {
                "payment_id": payment_id,
                "payment_url": payment_url,
                "order_id": order_id
            }
            
    except httpx.RequestError as e:
        logger.error(f"Mope request error: {e}")
        raise HTTPException(status_code=500, detail="Kon geen verbinding maken met Mope")

@api_router.get("/public/orders/{order_id}/payment-status")
async def check_payment_status(order_id: str):
    """Check payment status for an order"""
    import httpx
    
    order = await db.public_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    payment_id = order.get("payment_id")
    if not payment_id:
        return {"status": order.get("status", "pending"), "paid": False}
    
    # Get Mope token
    token = await get_mope_token()
    if not token:
        return {"status": order.get("status", "pending"), "paid": False}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MOPE_API_URL}/shop/payment_request/{payment_id}",
                headers={
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                mope_data = response.json()
                mope_status = mope_data.get("status", "").lower()
                
                if mope_status in ["paid", "completed", "success"]:
                    # Update order and activate user
                    await db.public_orders.update_one(
                        {"id": order_id},
                        {"$set": {"status": "paid"}}
                    )
                    
                    # Activate user account if exists
                    if order.get("user_id"):
                        trial_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                        await db.users.update_one(
                            {"id": order["user_id"]},
                            {"$set": {
                                "subscription_status": "active",
                                "subscription_end": trial_end
                            }}
                        )
                        
                        # Activate the add-ons for the user
                        for addon_id in order.get("addon_ids", []):
                            user_addon_id = str(uuid.uuid4())
                            now = datetime.now(timezone.utc)
                            await db.user_addons.insert_one({
                                "id": user_addon_id,
                                "user_id": order["user_id"],
                                "addon_id": addon_id,
                                "status": "active",
                                "start_date": now.isoformat(),
                                "end_date": (now + timedelta(days=30)).isoformat(),
                                "created_at": now.isoformat()
                            })
                    
                    return {"status": "paid", "paid": True}
                
                return {"status": mope_status, "paid": False}
            
            return {"status": order.get("status", "pending"), "paid": False}
            
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        return {"status": order.get("status", "pending"), "paid": False}

@api_router.get("/test/mope/status")
async def test_mope_status():
    """Test endpoint to check Mope configuration status"""
    settings = await get_mope_settings()
    token = await get_mope_token()
    
    return {
        "is_enabled": settings.is_enabled,
        "use_live_mode": settings.use_live_mode,
        "has_test_token": bool(settings.test_token),
        "has_live_token": bool(settings.live_token),
        "active_token_available": bool(token),
        "api_url": MOPE_API_URL,
        "message": "Mope is geconfigureerd en klaar voor gebruik" if token else "Mope is niet geconfigureerd. Ga naar Admin > Instellingen > Betalingen om Mope in te stellen."
    }

@api_router.post("/test/mope/payment")
async def test_mope_payment(amount: float = 10.0, description: str = "Test betaling"):
    """Test endpoint to create a Mope test payment"""
    import httpx
    
    token = await get_mope_token()
    if not token:
        return {
            "success": False,
            "error": "Mope is niet geconfigureerd",
            "instructions": "Ga naar Admin > Instellingen > Betalingen om Mope API tokens in te stellen"
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MOPE_API_URL}/shop/payment_request",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "amount": amount,
                    "description": description,
                    "redirect_url": "https://suriname-ledger.preview.emergentagent.com/betaling-voltooid"
                },
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                mope_response = response.json()
                return {
                    "success": True,
                    "payment_id": mope_response.get("id"),
                    "payment_url": mope_response.get("payment_url") or mope_response.get("url"),
                    "amount": amount,
                    "description": description,
                    "message": "Test betaling aangemaakt! Klik op de payment_url om te betalen."
                }
            else:
                return {
                    "success": False,
                    "error": f"Mope API error: {response.status_code}",
                    "details": response.text
                }
                
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@api_router.post("/webhooks/mope")
async def mope_webhook(request: Request):
    """Handle Mope payment webhooks"""
    try:
        body = await request.json()
        payment_id = body.get("payment_request_id") or body.get("id")
        status = body.get("status", "").lower()
        
        logger.info(f"Mope webhook received: payment_id={payment_id}, status={status}")
        
        if not payment_id:
            return {"status": "error", "message": "Missing payment_request_id"}
        
        # Find order by payment_id
        order = await db.public_orders.find_one({"payment_id": payment_id}, {"_id": 0})
        if not order:
            logger.warning(f"Order not found for payment_id: {payment_id}")
            return {"status": "ok", "message": "Order not found"}
        
        if status in ["paid", "completed", "success"]:
            # Update order status
            await db.public_orders.update_one(
                {"payment_id": payment_id},
                {"$set": {"status": "paid"}}
            )
            
            # Activate user account if exists
            if order.get("user_id"):
                trial_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                await db.users.update_one(
                    {"id": order["user_id"]},
                    {"$set": {
                        "subscription_status": "active",
                        "subscription_end": trial_end
                    }}
                )
                
                # Activate the add-ons for the user
                for addon_id in order.get("addon_ids", []):
                    # Check if addon already exists
                    existing = await db.user_addons.find_one({
                        "user_id": order["user_id"],
                        "addon_id": addon_id,
                        "status": "active"
                    }, {"_id": 0})
                    
                    if not existing:
                        user_addon_id = str(uuid.uuid4())
                        now = datetime.now(timezone.utc)
                        await db.user_addons.insert_one({
                            "id": user_addon_id,
                            "user_id": order["user_id"],
                            "addon_id": addon_id,
                            "status": "active",
                            "start_date": now.isoformat(),
                            "end_date": (now + timedelta(days=30)).isoformat(),
                            "created_at": now.isoformat()
                        })
                
                logger.info(f"User {order['user_id']} activated via Mope payment")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Mope webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ==================== ADMIN LANDING PAGE MANAGEMENT ====================

@api_router.get("/admin/landing/sections")
async def get_admin_landing_sections(current_user: dict = Depends(get_superadmin)):
    """Get all landing page sections (admin)"""
    sections = await db.landing_sections.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return sections

@api_router.post("/admin/landing/sections")
async def create_landing_section(section_data: LandingPageSectionCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new landing page section"""
    section_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    section_doc = {
        "id": section_id,
        "section_type": section_data.section_type,
        "title": section_data.title,
        "content": section_data.content,
        "subtitle": section_data.subtitle,
        "image_url": section_data.image_url,
        "button_text": section_data.button_text,
        "button_link": section_data.button_link,
        "is_active": section_data.is_active,
        "order": section_data.order,
        "metadata": section_data.metadata,
        "created_at": now,
        "updated_at": now
    }
    
    await db.landing_sections.insert_one(section_doc)
    return LandingPageSection(**section_doc)

@api_router.put("/admin/landing/sections/{section_id}")
async def update_landing_section(section_id: str, section_data: LandingPageSectionUpdate, current_user: dict = Depends(get_superadmin)):
    """Update a landing page section"""
    section = await db.landing_sections.find_one({"id": section_id}, {"_id": 0})
    if not section:
        raise HTTPException(status_code=404, detail="Sectie niet gevonden")
    
    update_data = {k: v for k, v in section_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.landing_sections.update_one({"id": section_id}, {"$set": update_data})
    
    updated = await db.landing_sections.find_one({"id": section_id}, {"_id": 0})
    return LandingPageSection(**updated)

@api_router.delete("/admin/landing/sections/{section_id}")
async def delete_landing_section(section_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a landing page section"""
    result = await db.landing_sections.delete_one({"id": section_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sectie niet gevonden")
    return {"message": "Sectie verwijderd"}

@api_router.put("/admin/landing/sections/reorder")
async def reorder_landing_sections(section_orders: List[dict], current_user: dict = Depends(get_superadmin)):
    """Reorder landing page sections"""
    for item in section_orders:
        await db.landing_sections.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        )
    return {"message": "Volgorde bijgewerkt"}

@api_router.get("/admin/landing/settings")
async def get_admin_landing_settings(current_user: dict = Depends(get_superadmin)):
    """Get landing page settings (admin)"""
    settings = await db.landing_settings.find_one({}, {"_id": 0})
    if not settings:
        return LandingPageSettings()
    return settings

@api_router.put("/admin/landing/settings")
async def update_landing_settings(settings_data: LandingPageSettings, current_user: dict = Depends(get_superadmin)):
    """Update landing page settings"""
    settings_dict = settings_data.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.landing_settings.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_data

# ==================== ADMIN PUBLIC ORDERS MANAGEMENT ====================

@api_router.get("/admin/orders")
async def get_admin_orders(current_user: dict = Depends(get_superadmin)):
    """Get all public orders (admin)"""
    orders = await db.public_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [PublicOrderResponse(**order) for order in orders]

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, current_user: dict = Depends(get_superadmin)):
    """Update order status"""
    if status not in ["pending", "contacted", "converted", "rejected"]:
        raise HTTPException(status_code=400, detail="Ongeldige status")
    
    result = await db.public_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    
    return {"message": "Status bijgewerkt"}

@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete an order"""
    result = await db.public_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bestelling niet gevonden")
    return {"message": "Bestelling verwijderd"}

# ==================== SEED DEFAULT LANDING PAGE ====================

async def seed_default_landing_page():
    """Seed the default landing page sections if they don't exist"""
    existing = await db.landing_sections.find_one({}, {"_id": 0})
    if existing:
        return  # Already seeded
    
    now = datetime.now(timezone.utc).isoformat()
    
    default_sections = [
        {
            "id": str(uuid.uuid4()),
            "section_type": "hero",
            "title": "Uw Complete ERP Oplossing",
            "subtitle": "Modulaire bedrijfssoftware voor ondernemers in Suriname",
            "content": "Kies de modules die passen bij uw bedrijfsvoering. Betaal alleen voor wat u gebruikt.",
            "image_url": "https://customer-assets.emergentagent.com/job_07e3c66b-0794-491d-bbf3-342aff3c1100/artifacts/vill14ys_261F389D-0F54-4D61-963C-4B58A923ED3D.png",
            "button_text": "Start Nu",
            "button_link": "/register",
            "is_active": True,
            "order": 0,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "features",
            "title": "Waarom Facturatie N.V.?",
            "subtitle": "Alles wat u nodig heeft voor uw bedrijf",
            "content": None,
            "is_active": True,
            "order": 1,
            "metadata": {
                "features": [
                    {"icon": "Shield", "title": "Veilig & Betrouwbaar", "description": "Uw data is veilig opgeslagen in de cloud"},
                    {"icon": "Zap", "title": "Snel & Efficiënt", "description": "Bespaar tijd met onze geoptimaliseerde workflows"},
                    {"icon": "Package", "title": "Modulair Systeem", "description": "Betaal alleen voor de modules die u nodig heeft"},
                    {"icon": "HeadphonesIcon", "title": "24/7 Support", "description": "Altijd bereikbaar voor ondersteuning"}
                ]
            },
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "pricing",
            "title": "Onze Modules",
            "subtitle": "Kies de modules die passen bij uw bedrijf",
            "content": "Alle prijzen zijn per maand. Geen verborgen kosten.",
            "is_active": True,
            "order": 2,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "about",
            "title": "Over Ons",
            "subtitle": "Facturatie N.V. - Uw Partner in Bedrijfssoftware",
            "content": "Facturatie N.V. is een Surinaams softwarebedrijf dat zich richt op het ontwikkelen van moderne, gebruiksvriendelijke bedrijfssoftware. Onze missie is om ondernemers in Suriname te helpen hun bedrijf efficiënter te beheren met betaalbare, modulaire oplossingen.\n\nOnze software is speciaal ontworpen voor de Surinaamse markt, met ondersteuning voor lokale valuta en belastingregels.",
            "is_active": True,
            "order": 3,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "terms",
            "title": "Algemene Voorwaarden",
            "subtitle": "Gebruiksvoorwaarden Facturatie N.V.",
            "content": "**1. Algemeen**\nDeze algemene voorwaarden zijn van toepassing op alle diensten van Facturatie N.V.\n\n**2. Diensten**\nFacturatie N.V. biedt cloud-gebaseerde bedrijfssoftware aan op basis van maandelijkse abonnementen.\n\n**3. Betalingen**\nBetalingen geschieden vooraf per maand. Bij niet-betaling wordt de toegang tot de dienst opgeschort.\n\n**4. Privacy**\nWij gaan zorgvuldig om met uw gegevens. Zie ons privacybeleid voor meer informatie.\n\n**5. Aansprakelijkheid**\nFacturatie N.V. is niet aansprakelijk voor indirecte schade of gevolgschade.\n\n**6. Wijzigingen**\nWij behouden het recht om deze voorwaarden te wijzigen. Wijzigingen worden via e-mail gecommuniceerd.",
            "is_active": True,
            "order": 4,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "privacy",
            "title": "Privacybeleid",
            "subtitle": "Hoe wij omgaan met uw gegevens",
            "content": "**1. Verzamelde Gegevens**\nWij verzamelen alleen gegevens die nodig zijn voor het leveren van onze diensten: naam, e-mailadres, bedrijfsgegevens en gebruiksdata.\n\n**2. Gebruik van Gegevens**\nUw gegevens worden uitsluitend gebruikt voor het leveren en verbeteren van onze diensten.\n\n**3. Delen van Gegevens**\nWij delen uw gegevens niet met derden, tenzij wettelijk verplicht.\n\n**4. Beveiliging**\nWij nemen passende technische en organisatorische maatregelen om uw gegevens te beschermen.\n\n**5. Uw Rechten**\nU heeft recht op inzage, correctie en verwijdering van uw gegevens. Neem contact met ons op voor meer informatie.\n\n**6. Contact**\nVoor vragen over privacy kunt u contact opnemen via info@facturatie.sr",
            "is_active": True,
            "order": 5,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "section_type": "contact",
            "title": "Contact",
            "subtitle": "Neem contact met ons op",
            "content": "Heeft u vragen of wilt u meer informatie? Neem gerust contact met ons op!",
            "is_active": True,
            "order": 6,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    await db.landing_sections.insert_many(default_sections)
    logger.info("Default landing page sections created")

# ==================== SEED DEFAULT ADD-ONS ====================

async def seed_default_addons():
    """Seed the default add-ons if they don't exist"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Vastgoed Beheer
    existing_vastgoed = await db.addons.find_one({"slug": "vastgoed_beheer"}, {"_id": 0})
    if not existing_vastgoed:
        addon_doc = {
            "id": str(uuid.uuid4()),
            "name": "Vastgoed Beheer",
            "slug": "vastgoed_beheer",
            "description": "Complete vastgoedbeheer module met huurders, appartementen, contracten, betalingen, facturen, leningen, borg, kasgeld, onderhoud en werknemers.",
            "price": 3500.0,
            "is_active": True,
            "category": "vastgoed",
            "created_at": now
        }
        await db.addons.insert_one(addon_doc)
        logger.info("Default 'Vastgoed Beheer' add-on created")
    
    # HRM Module
    existing_hrm = await db.addons.find_one({"slug": "hrm"}, {"_id": 0})
    if not existing_hrm:
        hrm_doc = {
            "id": str(uuid.uuid4()),
            "name": "HRM",
            "slug": "hrm",
            "description": "Complete HRM module voor personeelsbeheer. Werknemers registratie, verlofaanvragen, afdelingen, salarisoverzicht en meer.",
            "price": 1500.0,
            "is_active": True,
            "category": "hr",
            "created_at": now
        }
        await db.addons.insert_one(hrm_doc)
        logger.info("Default 'HRM' add-on created")
    
    # Auto Dealer Module
    existing_autodealer = await db.addons.find_one({"slug": "autodealer"}, {"_id": 0})
    if not existing_autodealer:
        autodealer_doc = {
            "id": str(uuid.uuid4()),
            "name": "Auto Dealer",
            "slug": "autodealer",
            "description": "Complete autohandelmodule voor Suriname. Voertuigenbeheer, klanten, verkoop en multi-valuta ondersteuning (SRD, EUR, USD).",
            "price": 2500.0,
            "is_active": True,
            "category": "handel",
            "created_at": now
        }
        await db.addons.insert_one(autodealer_doc)
        logger.info("Default 'Auto Dealer' add-on created")
    
    # Boekhouding Module - GRATIS voor alle klanten
    existing_boekhouding = await db.addons.find_one({"slug": "boekhouding"}, {"_id": 0})
    if not existing_boekhouding:
        boekhouding_doc = {
            "id": str(uuid.uuid4()),
            "name": "Boekhouding",
            "slug": "boekhouding",
            "description": "Complete boekhoudoplossing voor Surinaamse bedrijven. Grootboek, debiteuren, crediteuren, BTW, bank/kas administratie en rapportages. Multi-valuta ondersteuning: SRD, USD en EUR.",
            "price": 0.0,  # GRATIS
            "is_active": True,
            "is_free": True,  # Marker dat dit een gratis module is
            "auto_activate": True,  # Automatisch activeren voor nieuwe gebruikers
            "category": "financieel",
            "icon_name": "Calculator",
            "highlights": [
                "Surinaams standaard rekeningschema",
                "Multi-valuta: SRD, USD, EUR",
                "BTW tarieven: 0%, 10%, 25%",
                "Debiteuren & Crediteuren beheer",
                "Bank & Kas administratie",
                "Verkoopfacturen met automatische BTW berekening",
                "Inkoopfacturen registratie",
                "BTW aangifte overzicht",
                "Balans & Resultatenrekening",
                "Openstaande posten rapportage"
            ],
            "features": [
                {
                    "title": "Grootboek",
                    "description": "Volledig rekeningschema met journaalboekingen",
                    "features": ["Surinaams standaard rekeningschema", "Journaalposten", "Automatische saldo updates"]
                },
                {
                    "title": "Debiteuren & Crediteuren",
                    "description": "Beheer uw klanten en leveranciers",
                    "features": ["Klanten beheer", "Leveranciers beheer", "Openstaande posten", "Betalingstermijnen"]
                },
                {
                    "title": "Facturatie",
                    "description": "Professionele facturen met BTW berekening",
                    "features": ["Verkoopfacturen", "Inkoopfacturen", "Automatische BTW", "Multi-valuta"]
                },
                {
                    "title": "Rapportages",
                    "description": "Financiële overzichten en analyses",
                    "features": ["Balans", "Winst & Verlies", "BTW aangifte", "Ouderdomsanalyse debiteuren"]
                }
            ],
            "created_at": now
        }
        await db.addons.insert_one(boekhouding_doc)
        logger.info("Default 'Boekhouding' add-on created (GRATIS)")
    
    # Suribet Retailer Management Module
    existing_suribet = await db.addons.find_one({"slug": "suribet"}, {"_id": 0})
    if not existing_suribet:
        suribet_doc = {
            "id": str(uuid.uuid4()),
            "name": "Suribet Retailer",
            "slug": "suribet",
            "description": "Compleet retailer management systeem voor Suribet. Beheer machines, werknemers, kasstromen, commissies en loonuitbetalingen met multi-valuta ondersteuning.",
            "price": 149.99,
            "is_active": True,
            "is_free": False,
            "auto_activate": False,
            "category": "retail",
            "icon_name": "Gamepad2",
            "highlights": [
                "Machine dagstaten met biljettenregistratie",
                "Multi-valuta: SRD, EUR, USD",
                "Automatische commissieberekening",
                "Kasboek met inkomsten/uitgaven",
                "Werknemerbeheer met shifts",
                "Loonberekening en uitbetalingen",
                "Dashboard met realtime statistieken",
                "Wisselkoersen instelbaar"
            ],
            "features": [
                {
                    "title": "Machinebeheer",
                    "description": "Registreer en beheer al uw machines",
                    "features": ["Machine registratie", "Dagstaten invoer", "Biljettenregistratie", "Omzet tracking"]
                },
                {
                    "title": "Kasboek",
                    "description": "Financiële administratie",
                    "features": ["Inkomsten/uitgaven", "Multi-valuta", "Dagelijkse kasrapporten", "Week/maand totalen"]
                },
                {
                    "title": "Personeelsbeheer",
                    "description": "Beheer uw werknemers",
                    "features": ["Werknemer registratie", "Shift registratie", "Werkrooster", "Prestatie tracking"]
                },
                {
                    "title": "Loonuitbetaling",
                    "description": "Automatische loonberekening",
                    "features": ["Uurloon/dagloon", "Bonussen", "Inhoudingen", "Uitbetalingshistorie"]
                }
            ],
            "created_at": now
        }
        await db.addons.insert_one(suribet_doc)
        logger.info("Default 'Suribet' add-on created")

async def seed_default_cms_pages():
    """Seed default CMS pages if they don't exist"""
    existing = await db.cms_pages.find_one({}, {"_id": 0})
    if existing:
        return  # Already seeded
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create default Home page
    home_page = {
        "id": str(uuid.uuid4()),
        "title": "Home",
        "slug": "home",
        "description": "Welkom bij Facturatie N.V.",
        "template": "landing",
        "sections": [
            {
                "id": str(uuid.uuid4()),
                "type": "hero",
                "title": "Uw Complete ERP Oplossing",
                "subtitle": "Modulaire bedrijfssoftware voor ondernemers in Suriname",
                "content": "Kies de modules die passen bij uw bedrijfsvoering. Betaal alleen voor wat u gebruikt.",
                "image_url": None,
                "background_color": "#3b82f6",
                "text_color": "#ffffff",
                "button_text": "Start Nu",
                "button_link": "/register",
                "layout": "center",
                "order": 0,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "features",
                "title": "Waarom Facturatie N.V.?",
                "subtitle": "Alles wat u nodig heeft voor uw bedrijf",
                "items": [
                    {"title": "Veilig & Betrouwbaar", "description": "Uw data is veilig opgeslagen in de cloud"},
                    {"title": "Snel & Efficiënt", "description": "Bespaar tijd met onze geoptimaliseerde workflows"},
                    {"title": "Modulair Systeem", "description": "Betaal alleen voor de modules die u nodig heeft"},
                    {"title": "24/7 Support", "description": "Altijd bereikbaar voor ondersteuning"}
                ],
                "layout": "center",
                "order": 1,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "cta",
                "title": "Klaar om te beginnen?",
                "subtitle": "Start vandaag nog met uw gratis proefperiode",
                "button_text": "Registreer Nu",
                "button_link": "/register",
                "background_color": "#1e40af",
                "text_color": "#ffffff",
                "layout": "center",
                "order": 2,
                "is_visible": True
            }
        ],
        "is_published": True,
        "show_in_menu": True,
        "menu_order": 0,
        "menu_label": "Home",
        "show_header": True,
        "show_footer": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Create Over Ons page
    about_page = {
        "id": str(uuid.uuid4()),
        "title": "Over Ons",
        "slug": "over-ons",
        "description": "Leer meer over Facturatie N.V.",
        "template": "about",
        "sections": [
            {
                "id": str(uuid.uuid4()),
                "type": "hero",
                "title": "Over Ons",
                "subtitle": "Uw partner in bedrijfsautomatisering",
                "layout": "center",
                "order": 0,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "text",
                "title": "Ons Verhaal",
                "content": "Facturatie N.V. is opgericht met één doel: het leven van ondernemers in Suriname makkelijker maken. Wij bieden moderne, betaalbare software oplossingen die speciaal zijn ontworpen voor de lokale markt.",
                "layout": "center",
                "order": 1,
                "is_visible": True
            }
        ],
        "is_published": True,
        "show_in_menu": True,
        "menu_order": 1,
        "show_header": True,
        "show_footer": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Create Contact page
    contact_page = {
        "id": str(uuid.uuid4()),
        "title": "Contact",
        "slug": "contact",
        "description": "Neem contact met ons op",
        "template": "contact",
        "sections": [
            {
                "id": str(uuid.uuid4()),
                "type": "hero",
                "title": "Contact",
                "subtitle": "Wij horen graag van u",
                "layout": "center",
                "order": 0,
                "is_visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "type": "contact",
                "title": "Neem contact op",
                "subtitle": "Vul het formulier in of neem direct contact met ons op",
                "layout": "center",
                "order": 1,
                "is_visible": True
            }
        ],
        "is_published": True,
        "show_in_menu": True,
        "menu_order": 2,
        "show_header": True,
        "show_footer": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.cms_pages.insert_many([home_page, about_page, contact_page])
    logger.info("Default CMS pages created")

# Call seed on startup
@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    try:
        await seed_default_addons()
        await seed_default_landing_page()
        await seed_default_cms_pages()
        
        # Start scheduled tasks for email reminders
        email_service = get_email_service(db)
        scheduler = get_scheduled_tasks(db, email_service)
        await scheduler.start()
        
        logger.info("Startup tasks completed (including scheduler)")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@api_router.get("/admin/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(current_user: dict = Depends(get_superadmin)):
    """Get admin dashboard statistics - superadmin only"""
    
    # Get all customers (excluding superadmin)
    all_users = await db.users.find(
        {"role": "customer"},
        {"_id": 0}
    ).to_list(1000)
    
    total_customers = len(all_users)
    active_subscriptions = 0
    expired_subscriptions = 0
    
    for user in all_users:
        status, _, _ = get_subscription_status(user)
        if status in ("active", "trial"):
            active_subscriptions += 1
        elif status == "expired":
            expired_subscriptions += 1
    
    # Get all subscription payments
    all_subscriptions = await db.subscriptions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    total_revenue = sum(s["amount"] for s in all_subscriptions)
    
    # Revenue this month
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    revenue_this_month = sum(
        s["amount"] for s in all_subscriptions 
        if s["created_at"] >= first_of_month
    )
    
    # Recent subscriptions with user info
    recent_subscriptions = []
    for sub in all_subscriptions[:10]:
        user = await db.users.find_one({"id": sub["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        recent_subscriptions.append(SubscriptionResponse(
            **sub,
            user_name=user["name"] if user else None,
            user_email=user["email"] if user else None
        ))
    
    return AdminDashboardStats(
        total_customers=total_customers,
        active_subscriptions=active_subscriptions,
        expired_subscriptions=expired_subscriptions,
        total_revenue=total_revenue,
        revenue_this_month=revenue_this_month,
        recent_subscriptions=recent_subscriptions
    )

@api_router.get("/admin/customers", response_model=List[CustomerResponse])
async def get_all_customers(current_user: dict = Depends(get_superadmin)):
    """Get all customers - superadmin only"""
    
    customers = await db.users.find(
        {"role": "customer"},
        {"_id": 0}
    ).to_list(1000)
    
    result = []
    for customer in customers:
        # Get total paid from subscriptions
        subscriptions = await db.subscriptions.find(
            {"user_id": customer["id"]},
            {"_id": 0, "amount": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(100)
        
        total_paid = sum(s["amount"] for s in subscriptions)
        last_payment_date = subscriptions[0]["created_at"] if subscriptions else None
        
        status, end_date, _ = get_subscription_status(customer)
        
        result.append(CustomerResponse(
            id=customer["id"],
            email=customer["email"],
            name=customer["name"],
            company_name=customer.get("company_name"),
            role=customer["role"],
            subscription_status=status,
            subscription_end_date=end_date,
            created_at=customer["created_at"],
            total_paid=total_paid,
            last_payment_date=last_payment_date
        ))
    
    return result

@api_router.post("/admin/subscriptions", response_model=SubscriptionResponse)
async def activate_subscription(sub_data: SubscriptionCreate, current_user: dict = Depends(get_superadmin)):
    """Activate or extend a customer subscription - superadmin only"""
    
    # Find the customer
    customer = await db.users.find_one({"id": sub_data.user_id, "role": "customer"}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    now = datetime.now(timezone.utc)
    
    # Calculate new end date
    current_end = customer.get("subscription_end_date")
    if current_end:
        try:
            current_end_dt = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
            if current_end_dt > now:
                # Extend from current end date
                start_date = current_end_dt
            else:
                # Start from now
                start_date = now
        except Exception:
            start_date = now
    else:
        start_date = now
    
    end_date = start_date + timedelta(days=SUBSCRIPTION_DAYS * sub_data.months)
    
    # Create subscription record
    sub_id = str(uuid.uuid4())
    sub_doc = {
        "id": sub_id,
        "user_id": sub_data.user_id,
        "amount": SUBSCRIPTION_PRICE_SRD * sub_data.months,
        "months": sub_data.months,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "payment_method": sub_data.payment_method,
        "payment_reference": sub_data.payment_reference,
        "notes": sub_data.notes,
        "status": "active",
        "created_at": now.isoformat()
    }
    
    await db.subscriptions.insert_one(sub_doc)
    
    # Update user's subscription end date
    await db.users.update_one(
        {"id": sub_data.user_id},
        {"$set": {
            "subscription_end_date": end_date.isoformat(),
            "is_trial": False
        }}
    )
    
    return SubscriptionResponse(
        **sub_doc,
        user_name=customer["name"],
        user_email=customer["email"]
    )

@api_router.get("/admin/subscriptions", response_model=List[SubscriptionResponse])
async def get_all_subscriptions(current_user: dict = Depends(get_superadmin)):
    """Get all subscription payments - superadmin only"""
    
    subscriptions = await db.subscriptions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Batch fetch user names
    user_ids = list(set(s["user_id"] for s in subscriptions))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    user_map = {u["id"]: {"name": u["name"], "email": u["email"]} for u in users}
    
    result = []
    for sub in subscriptions:
        user_info = user_map.get(sub["user_id"], {})
        result.append(SubscriptionResponse(
            **sub,
            user_name=user_info.get("name"),
            user_email=user_info.get("email")
        ))
    
    return result

@api_router.delete("/admin/customers/{user_id}")
async def deactivate_customer(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Deactivate a customer's subscription - superadmin only"""
    
    result = await db.users.update_one(
        {"id": user_id, "role": "customer"},
        {"$set": {
            "subscription_end_date": datetime.now(timezone.utc).isoformat(),
            "is_trial": False
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Abonnement gedeactiveerd"}

# Admin: Create customer
class AdminCustomerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    plan_type: str = "trial"  # 'trial', 'active', 'none', 'free'
    subscription_months: int = 1
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None

@api_router.post("/admin/customers", response_model=CustomerResponse)
async def create_customer(customer_data: AdminCustomerCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new customer - superadmin only"""
    
    # Check if user exists
    existing = await db.users.find_one({"email": customer_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Calculate subscription end date based on plan_type
    subscription_end_date = None
    is_trial = False
    is_free = False
    
    if customer_data.plan_type == "active":
        # Active subscription with payment
        subscription_end_date = (now + timedelta(days=SUBSCRIPTION_DAYS * customer_data.subscription_months)).isoformat()
    elif customer_data.plan_type == "trial":
        # 3-day trial
        subscription_end_date = (now + timedelta(days=TRIAL_DAYS)).isoformat()
        is_trial = True
    elif customer_data.plan_type == "free":
        # Free forever - set far future date
        subscription_end_date = (now + timedelta(days=36500)).isoformat()  # 100 years
        is_free = True
    else:
        # No plan - expired (blocked until activation)
        subscription_end_date = (now - timedelta(days=1)).isoformat()
        is_trial = False
    
    user_doc = {
        "id": user_id,
        "email": customer_data.email,
        "password": hash_password(customer_data.password),
        "name": customer_data.name,
        "company_name": customer_data.company_name,
        "role": "customer",
        "subscription_end_date": subscription_end_date,
        "is_trial": is_trial,
        "is_free": is_free,
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # If subscription is activated, create subscription record
    total_paid = 0.0
    if customer_data.plan_type == "active":
        sub_id = str(uuid.uuid4())
        amount = SUBSCRIPTION_PRICE_SRD * customer_data.subscription_months
        sub_doc = {
            "id": sub_id,
            "user_id": user_id,
            "amount": amount,
            "months": customer_data.subscription_months,
            "start_date": now.isoformat(),
            "end_date": subscription_end_date,
            "payment_method": customer_data.payment_method,
            "payment_reference": customer_data.payment_reference,
            "notes": "Aangemaakt door admin",
            "status": "active",
            "created_at": now.isoformat()
        }
        await db.subscriptions.insert_one(sub_doc)
        total_paid = amount
    
    status, end_date, _ = get_subscription_status(user_doc)
    
    # Override status for free accounts
    if is_free:
        status = "active"
    
    # Try to send welcome email with the new email service first
    email_sent = False
    try:
        email_sent = await send_welcome_email_async(
            name=customer_data.name,
            email=customer_data.email,
            password=customer_data.password,
            company_name=customer_data.company_name
        )
    except Exception as e:
        logger.warning(f"Error with async welcome email: {e}")
    
    # Fallback to old method if new service is not configured
    if not email_sent:
        email_sent = send_welcome_email(
            name=customer_data.name,
            email=customer_data.email,
            password=customer_data.password,
            plan_type=customer_data.plan_type
        )
    
    if not email_sent:
        logger.warning(f"Welcome email could not be sent to {customer_data.email}")
    
    # Automatisch gratis addons activeren voor nieuwe klant
    await activate_free_addons_for_user(user_id)
    
    return CustomerResponse(
        id=user_id,
        email=customer_data.email,
        name=customer_data.name,
        company_name=customer_data.company_name,
        role="customer",
        subscription_status=status,
        subscription_end_date=end_date,
        created_at=user_doc["created_at"],
        total_paid=total_paid,
        last_payment_date=now.isoformat() if customer_data.plan_type == "active" else None
    )

# Activeer gratis addons na het aanmaken van de klant
async def post_create_customer_addons(user_id: str):
    """Helper to activate free addons after customer creation"""
    await activate_free_addons_for_user(user_id)

# Hook om gratis addons te activeren bij klant aanmaak
@api_router.post("/admin/customers/{user_id}/activate-free-addons")
async def admin_activate_free_addons(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Activate all free addons for a customer - superadmin only"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    await activate_free_addons_for_user(user_id)
    return {"message": "Gratis modules geactiveerd"}

@api_router.delete("/admin/customers/{user_id}/permanent")
async def delete_customer_permanent(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Permanently delete a customer and all their data - superadmin only"""
    
    # Check if customer exists
    customer = await db.users.find_one({"id": user_id, "role": "customer"}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    # Delete all customer data
    await db.users.delete_one({"id": user_id})
    await db.subscriptions.delete_many({"user_id": user_id})
    await db.subscription_requests.delete_many({"user_id": user_id})
    
    # Also delete customer's rental data
    await db.tenants.delete_many({"user_id": user_id})
    await db.apartments.delete_many({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    await db.deposits.delete_many({"user_id": user_id})
    await db.kasgeld.delete_many({"user_id": user_id})
    await db.maintenance.delete_many({"user_id": user_id})
    await db.employees.delete_many({"user_id": user_id})
    await db.salaries.delete_many({"user_id": user_id})
    
    return {"message": f"Klant {customer['name']} en alle gegevens permanent verwijderd"}

@api_router.delete("/admin/subscriptions/{subscription_id}")
async def delete_subscription_payment(subscription_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a subscription payment record - superadmin only"""
    
    # Get the subscription first to adjust the user's end date
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Abonnementsbetaling niet gevonden")
    
    # Delete the subscription
    await db.subscriptions.delete_one({"id": subscription_id})
    
    # Recalculate user's subscription end date based on remaining subscriptions
    user_id = subscription["user_id"]
    remaining_subs = await db.subscriptions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("end_date", -1).to_list(1)
    
    if remaining_subs:
        # Set end date to the latest remaining subscription
        new_end_date = remaining_subs[0]["end_date"]
    else:
        # No subscriptions left, set to expired
        new_end_date = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_end_date": new_end_date, "is_trial": False}}
    )
    
    return {"message": "Abonnementsbetaling verwijderd"}

@api_router.get("/admin/subscriptions/{subscription_id}/pdf")
async def generate_subscription_receipt_pdf(subscription_id: str, current_user: dict = Depends(get_superadmin)):
    """Generate PDF receipt for subscription payment - superadmin only"""
    
    # Get subscription data
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Abonnementsbetaling niet gevonden")
    
    # Get customer data
    customer = await db.users.find_one({"id": subscription["user_id"]}, {"_id": 0})
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#0caf60')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    WHITE = colors.white
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=1.5*cm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold',
        spaceAfter=0,
        alignment=TA_RIGHT
    )
    
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=18,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=5
    )
    
    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=15
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica',
        leading=14
    )
    
    small_text = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        leading=12
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # === HEADER ===
    header_data = [
        [
            [Paragraph("Facturatie N.V.", company_style), Paragraph("Verhuurbeheersysteem", small_text)],
            [Paragraph("ABONNEMENT<br/>KWITANTIE", title_style)]
        ]
    ]
    header_table = Table(header_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=3, color=PRIMARY_GREEN, spaceBefore=5, spaceAfter=15))
    
    # === RECEIPT DETAILS ===
    receipt_num = subscription["id"][:8].upper()
    issue_date = subscription["created_at"][:10]
    
    details_data = [
        [
            Paragraph("<b>Kwitantie Nr:</b>", normal_text),
            Paragraph(receipt_num, bold_text),
            Paragraph("<b>Datum:</b>", normal_text),
            Paragraph(issue_date, bold_text)
        ]
    ]
    details_table = Table(details_data, colWidths=[3*cm, 5*cm, 3*cm, 6*cm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # === CUSTOMER INFO ===
    customer_name = customer["name"] if customer else "Onbekend"
    customer_email = customer.get("email", "-") if customer else "-"
    customer_company = customer.get("company_name", "-") if customer else "-"
    
    info_left = [
        [Paragraph("KLANT GEGEVENS", section_header)],
        [Paragraph(f"<b>{customer_name}</b>", normal_text)],
        [Paragraph(f"Email: {customer_email}", small_text)],
        [Paragraph(f"Bedrijf: {customer_company}", small_text)],
    ]
    
    info_right = [
        [Paragraph("ABONNEMENT PERIODE", section_header)],
        [Paragraph(f"<b>{subscription.get('months', 1)} maand(en)</b>", normal_text)],
        [Paragraph(f"Start: {subscription['start_date'][:10]}", small_text)],
        [Paragraph(f"Einde: {subscription['end_date'][:10]}", small_text)],
    ]
    
    info_table = Table(
        [[Table(info_left), Table(info_right)]],
        colWidths=[9*cm, 8*cm]
    )
    info_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(info_table)
    elements.append(Spacer(1, 25))
    
    # === ITEMS TABLE ===
    payment_method_labels = {
        "bank_transfer": "Bankoverschrijving",
        "cash": "Contant",
        "other": "Anders"
    }
    payment_method = payment_method_labels.get(subscription.get("payment_method", ""), subscription.get("payment_method", "-"))
    
    table_header = ['NR', 'OMSCHRIJVING', 'PERIODE', 'METHODE', 'BEDRAG']
    table_data = [
        table_header,
        ['1', "Abonnement Facturatie N.V.", f"{subscription.get('months', 1)} maand(en)", payment_method, format_currency(subscription["amount"])]
    ]
    
    items_table = Table(table_data, colWidths=[1.5*cm, 6*cm, 3*cm, 3.5*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_TEXT),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_GREEN),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e0e0e0')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # === TOTALS ===
    totals_data = [
        ['Subtotaal:', format_currency(subscription["amount"])],
        ['BTW (0%):', format_currency(0)],
        ['', ''],
        ['TOTAAL:', format_currency(subscription["amount"])],
    ]
    
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 2), 10),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 14),
        ('TEXTCOLOR', (0, 3), (-1, 3), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 2, PRIMARY_GREEN),
    ]))
    
    totals_wrapper = Table([[totals_table]], colWidths=[17*cm])
    totals_wrapper.setStyle(TableStyle([('ALIGN', (0, 0), (0, 0), 'RIGHT')]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 20))
    
    # === PAYMENT REFERENCE ===
    if subscription.get("payment_reference"):
        elements.append(Paragraph("Betaalreferentie", section_header))
        elements.append(Paragraph(subscription["payment_reference"], normal_text))
        elements.append(Spacer(1, 10))
    
    if subscription.get("notes"):
        elements.append(Paragraph("Opmerkingen", section_header))
        elements.append(Paragraph(subscription["notes"], small_text))
        elements.append(Spacer(1, 10))
    
    # === FOOTER ===
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=20, spaceAfter=15))
    
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=14,
        textColor=PRIMARY_GREEN,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph("Bedankt voor uw abonnement!", thank_you_style))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=GRAY_TEXT,
        fontName='Helvetica',
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Dit document is gegenereerd door Facturatie N.V.", footer_style))
    elements.append(Paragraph("Bewaar deze kwitantie als bewijs van betaling.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    customer_name_safe = customer["name"].replace(" ", "_") if customer else "klant"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=abonnement_kwitantie_{customer_name_safe}_{subscription['id'][:8]}.pdf"
        }
    )

# ==================== USER SUBSCRIPTION ROUTES ====================

# ==================== PROFILE/SETTINGS ROUTES ====================

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None

class LogoUpload(BaseModel):
    logo_data: str  # Base64 encoded image data

@api_router.put("/profile/password")
async def change_own_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change own password"""
    
    # Verify current password
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Huidig wachtwoord is onjuist")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nieuw wachtwoord moet minimaal 6 tekens zijn")
    
    # Update password
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hash_password(password_data.new_password)}}
    )
    
    return {"message": "Wachtwoord succesvol gewijzigd"}

@api_router.put("/profile")
async def update_own_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update own profile (name, email, company_name)"""
    
    update_fields = {}
    
    if profile_data.name:
        update_fields["name"] = profile_data.name
    
    if profile_data.email:
        # Check if email is already in use by another user
        existing = await db.users.find_one(
            {"email": profile_data.email, "id": {"$ne": current_user["id"]}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")
        update_fields["email"] = profile_data.email
    
    if profile_data.company_name is not None:
        update_fields["company_name"] = profile_data.company_name
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Geen gegevens om te wijzigen")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_fields}
    )
    
    # Return updated user
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user

@api_router.get("/profile")
async def get_own_profile(current_user: dict = Depends(get_current_user)):
    """Get own profile"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return user

@api_router.post("/profile/logo")
async def upload_logo(logo_data: LogoUpload, current_user: dict = Depends(get_current_user)):
    """Upload company logo - max 5MB"""
    
    # Check base64 data size (roughly 1.37x the original file size)
    # 5MB = 5 * 1024 * 1024 bytes, base64 adds ~37% overhead
    max_size = 5 * 1024 * 1024 * 1.37
    if len(logo_data.logo_data) > max_size:
        raise HTTPException(status_code=400, detail="Logo is te groot. Maximum 5MB toegestaan.")
    
    # Validate it's a valid base64 image
    if not logo_data.logo_data.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Ongeldig afbeeldingsformaat")
    
    # Store the logo in the user document
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"logo": logo_data.logo_data}}
    )
    
    return {"message": "Logo succesvol geüpload", "logo": logo_data.logo_data}

@api_router.delete("/profile/logo")
async def delete_logo(current_user: dict = Depends(get_current_user)):
    """Delete company logo"""
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$unset": {"logo": ""}}
    )
    
    return {"message": "Logo succesvol verwijderd"}

class RentSettings(BaseModel):
    rent_due_day: int = 1  # Day of month (1-28) - when rent is DUE
    payment_frequency: str = "monthly"  # monthly, weekly, biweekly, quarterly, yearly
    grace_period_days: int = 5  # Days after due date before considered late
    payment_deadline_day: int = 0  # Day of NEXT month by which rent must be paid (0 = same month)
    payment_deadline_month_offset: int = 0  # 0 = same month, 1 = next month

@api_router.put("/profile/rent-settings")
async def update_rent_settings(settings: RentSettings, current_user: dict = Depends(get_current_user)):
    """Update rent/payment settings for customer"""
    
    if settings.rent_due_day < 1 or settings.rent_due_day > 28:
        raise HTTPException(status_code=400, detail="Dag moet tussen 1 en 28 zijn")
    
    if settings.payment_deadline_day < 0 or settings.payment_deadline_day > 28:
        raise HTTPException(status_code=400, detail="Deadline dag moet tussen 0 en 28 zijn")
    
    valid_frequencies = ["monthly", "weekly", "biweekly", "quarterly", "yearly"]
    if settings.payment_frequency not in valid_frequencies:
        raise HTTPException(status_code=400, detail="Ongeldige betalingsfrequentie")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "rent_due_day": settings.rent_due_day,
            "payment_frequency": settings.payment_frequency,
            "grace_period_days": settings.grace_period_days,
            "payment_deadline_day": settings.payment_deadline_day,
            "payment_deadline_month_offset": settings.payment_deadline_month_offset
        }}
    )
    
    return {"message": "Huurinstellingen opgeslagen"}

# ==================== ADMIN: CUSTOMER PROFILE MANAGEMENT ====================

class AdminPasswordReset(BaseModel):
    new_password: str

class AdminCustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None

@api_router.put("/admin/customers/{user_id}/password")
async def admin_reset_customer_password(user_id: str, password_data: AdminPasswordReset, current_user: dict = Depends(get_superadmin)):
    """Reset a customer's password - superadmin only"""
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens zijn")
    
    result = await db.users.update_one(
        {"id": user_id, "role": "customer"},
        {"$set": {"password": hash_password(password_data.new_password)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Wachtwoord succesvol gereset"}

@api_router.put("/admin/customers/{user_id}/profile")
async def admin_update_customer_profile(user_id: str, profile_data: AdminCustomerUpdate, current_user: dict = Depends(get_superadmin)):
    """Update a customer's profile - superadmin only"""
    
    update_fields = {}
    
    if profile_data.name:
        update_fields["name"] = profile_data.name
    
    if profile_data.email:
        # Check if email is already in use
        existing = await db.users.find_one(
            {"email": profile_data.email, "id": {"$ne": user_id}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")
        update_fields["email"] = profile_data.email
    
    if profile_data.company_name is not None:
        update_fields["company_name"] = profile_data.company_name
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Geen gegevens om te wijzigen")
    
    result = await db.users.update_one(
        {"id": user_id, "role": "customer"},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    return {"message": "Klantgegevens succesvol bijgewerkt"}

# ==================== CUSTOM DOMAIN ROUTES ====================

class CustomDomainCreate(BaseModel):
    domain: str
    user_id: str

class CustomDomainResponse(BaseModel):
    id: str
    user_id: str
    domain: str
    status: str  # pending, active, error
    verified: bool
    dns_record_type: str
    dns_record_value: str
    created_at: str
    verified_at: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

# Get server IP for DNS configuration
SERVER_IP = "72.62.174.80"  # CloudPanel server IP

@api_router.post("/admin/domains", response_model=CustomDomainResponse)
async def create_custom_domain(domain_data: CustomDomainCreate, current_user: dict = Depends(get_superadmin)):
    """Add a custom domain for a customer - superadmin only"""
    
    # Validate domain format
    domain = domain_data.domain.lower().strip()
    if not domain or "." not in domain:
        raise HTTPException(status_code=400, detail="Ongeldig domeinformaat")
    
    # Remove http/https if present
    domain = domain.replace("http://", "").replace("https://", "").replace("www.", "").rstrip("/")
    
    # Check if domain already exists
    existing = await db.custom_domains.find_one({"domain": domain}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
    
    # Check if customer exists
    customer = await db.users.find_one({"id": domain_data.user_id, "role": "customer"}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    
    domain_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    domain_doc = {
        "id": domain_id,
        "user_id": domain_data.user_id,
        "domain": domain,
        "status": "pending",
        "verified": False,
        "dns_record_type": "A",
        "dns_record_value": SERVER_IP,
        "created_at": now.isoformat(),
        "verified_at": None
    }
    
    await db.custom_domains.insert_one(domain_doc)
    
    return CustomDomainResponse(
        **domain_doc,
        user_name=customer["name"],
        user_email=customer["email"]
    )

@api_router.get("/admin/domains", response_model=List[CustomDomainResponse])
async def get_all_custom_domains(current_user: dict = Depends(get_superadmin)):
    """Get all custom domains - superadmin only"""
    
    domains = await db.custom_domains.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Batch fetch user info
    user_ids = list(set(d["user_id"] for d in domains))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    user_map = {u["id"]: {"name": u["name"], "email": u["email"]} for u in users}
    
    result = []
    for domain in domains:
        user_info = user_map.get(domain["user_id"], {})
        result.append(CustomDomainResponse(
            **domain,
            user_name=user_info.get("name"),
            user_email=user_info.get("email")
        ))
    
    return result

@api_router.put("/admin/domains/{domain_id}/verify")
async def verify_custom_domain(domain_id: str, current_user: dict = Depends(get_superadmin)):
    """Mark a custom domain as verified - superadmin only"""
    
    now = datetime.now(timezone.utc)
    
    result = await db.custom_domains.update_one(
        {"id": domain_id},
        {"$set": {
            "status": "active",
            "verified": True,
            "verified_at": now.isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Domein niet gevonden")
    
    return {"message": "Domein geverifieerd en geactiveerd"}

@api_router.delete("/admin/domains/{domain_id}")
async def delete_custom_domain(domain_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a custom domain - superadmin only"""
    
    result = await db.custom_domains.delete_one({"id": domain_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domein niet gevonden")
    
    return {"message": "Domein verwijderd"}

@api_router.get("/admin/domains/customer/{user_id}", response_model=List[CustomDomainResponse])
async def get_customer_domains(user_id: str, current_user: dict = Depends(get_superadmin)):
    """Get custom domains for a specific customer - superadmin only"""
    
    domains = await db.custom_domains.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    customer = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    
    result = []
    for domain in domains:
        result.append(CustomDomainResponse(
            **domain,
            user_name=customer["name"] if customer else None,
            user_email=customer["email"] if customer else None
        ))
    
    return result

# ==================== USER SUBSCRIPTION ROUTES ====================

@api_router.get("/subscription/status")
async def get_subscription_status_api(current_user: dict = Depends(get_current_user)):
    """Get current user's subscription status"""
    
    status, end_date, is_trial = get_subscription_status(current_user)
    
    # Calculate days remaining
    days_remaining = 0
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            days_remaining = max(0, (end_dt - datetime.now(timezone.utc)).days)
        except Exception:
            pass
    
    # Get subscription history
    history = []
    if current_user.get("role") != "superadmin":
        subs = await db.subscriptions.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        history = subs
    
    return {
        "status": status,
        "is_trial": is_trial,
        "end_date": end_date,
        "days_remaining": days_remaining,
        "price_per_month": SUBSCRIPTION_PRICE_SRD,
        "history": history
    }

@api_router.post("/subscription/request")
async def request_subscription(current_user: dict = Depends(get_current_user)):
    """Request subscription activation (for bank transfer payment)"""
    
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen abonnement nodig")
    
    # Create a pending subscription request
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    request_doc = {
        "id": request_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_email": current_user["email"],
        "amount": SUBSCRIPTION_PRICE_SRD,
        "status": "pending",
        "created_at": now.isoformat()
    }
    
    await db.subscription_requests.insert_one(request_doc)
    
    return {
        "message": "Abonnementsverzoek verzonden. Maak de betaling over naar het opgegeven rekeningnummer en neem contact op met de beheerder.",
        "request_id": request_id,
        "amount": SUBSCRIPTION_PRICE_SRD,
        "bank_info": {
            "bank": "Hakrinbank",
            "rekening": "205911044",
            "naam": "Facturatie N.V.",
            "omschrijving": "+5978934982"
        }
    }

@api_router.get("/admin/subscription-requests")
async def get_subscription_requests(current_user: dict = Depends(get_superadmin)):
    """Get pending subscription requests - superadmin only"""
    
    requests = await db.subscription_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests

# ==================== CRON JOB ENDPOINTS ====================

CRON_SECRET = os.environ.get('CRON_SECRET', 'facturatie-cron-secret-2026')

@api_router.get("/cron/run")
async def run_cron_jobs(secret: str = None):
    """Run all cron jobs - called every minute"""
    
    # Simple security check
    if secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "jobs": {}
    }
    
    # Job 1: Check and update subscription statuses
    try:
        expired_count = await check_expired_subscriptions()
        results["jobs"]["subscription_check"] = {
            "status": "success",
            "expired_count": expired_count
        }
    except Exception as e:
        logger.error(f"Cron job subscription_check failed: {e}")
        results["jobs"]["subscription_check"] = {"status": "error", "message": str(e)}
    
    # Job 2: Send subscription reminders (3 days before expiry)
    try:
        reminders_sent = await send_subscription_reminders()
        results["jobs"]["reminders"] = {
            "status": "success",
            "reminders_sent": reminders_sent
        }
    except Exception as e:
        logger.error(f"Cron job reminders failed: {e}")
        results["jobs"]["reminders"] = {"status": "error", "message": str(e)}
    
    # Job 3: Clean old data (runs once per day at midnight)
    current_hour = datetime.now(timezone.utc).hour
    current_minute = datetime.now(timezone.utc).minute
    if current_hour == 0 and current_minute == 0:
        try:
            cleaned = await cleanup_old_data()
            results["jobs"]["cleanup"] = {
                "status": "success",
                "cleaned": cleaned
            }
        except Exception as e:
            logger.error(f"Cron job cleanup failed: {e}")
            results["jobs"]["cleanup"] = {"status": "error", "message": str(e)}
    
    return results

async def check_expired_subscriptions():
    """Check and mark expired subscriptions"""
    now = datetime.now(timezone.utc)
    expired_count = 0
    
    # Find all customers with expired subscriptions that haven't been marked
    customers = await db.users.find({
        "role": "customer",
        "is_free": {"$ne": True}  # Don't touch free accounts
    }, {"_id": 0}).to_list(1000)
    
    for customer in customers:
        if customer.get("subscription_end_date"):
            try:
                end_date = datetime.fromisoformat(customer["subscription_end_date"].replace('Z', '+00:00'))
                if end_date < now:
                    # Mark as expired in notifications collection
                    existing_notification = await db.notifications.find_one({
                        "user_id": customer["id"],
                        "type": "subscription_expired",
                        "created_at": {"$gte": (now - timedelta(days=1)).isoformat()}
                    })
                    
                    if not existing_notification:
                        await db.notifications.insert_one({
                            "id": str(uuid.uuid4()),
                            "user_id": customer["id"],
                            "type": "subscription_expired",
                            "message": f"Abonnement van {customer['name']} is verlopen",
                            "email": customer["email"],
                            "read": False,
                            "created_at": now.isoformat()
                        })
                        expired_count += 1
            except Exception as e:
                logger.error(f"Error checking subscription for {customer.get('email')}: {e}")
    
    return expired_count

async def send_subscription_reminders():
    """Send reminders for subscriptions expiring in 3 days"""
    now = datetime.now(timezone.utc)
    now + timedelta(days=3)
    reminders_sent = 0
    
    customers = await db.users.find({
        "role": "customer",
        "is_free": {"$ne": True}
    }, {"_id": 0}).to_list(1000)
    
    for customer in customers:
        if customer.get("subscription_end_date"):
            try:
                end_date = datetime.fromisoformat(customer["subscription_end_date"].replace('Z', '+00:00'))
                
                # Check if expiring within 3 days
                days_until_expiry = (end_date - now).days
                
                if 0 < days_until_expiry <= 3:
                    # Check if reminder already sent today
                    existing_reminder = await db.notifications.find_one({
                        "user_id": customer["id"],
                        "type": "subscription_reminder",
                        "created_at": {"$gte": (now - timedelta(hours=24)).isoformat()}
                    })
                    
                    if not existing_reminder:
                        await db.notifications.insert_one({
                            "id": str(uuid.uuid4()),
                            "user_id": customer["id"],
                            "type": "subscription_reminder",
                            "message": f"Abonnement van {customer['name']} verloopt over {days_until_expiry} dag(en)",
                            "email": customer["email"],
                            "days_remaining": days_until_expiry,
                            "read": False,
                            "created_at": now.isoformat()
                        })
                        reminders_sent += 1
            except Exception as e:
                logger.error(f"Error sending reminder for {customer.get('email')}: {e}")
    
    return reminders_sent

async def cleanup_old_data():
    """Clean up old data (notifications older than 30 days, old logs)"""
    now = datetime.now(timezone.utc)
    cleanup_date = (now - timedelta(days=30)).isoformat()
    cleaned = {}
    
    # Delete old notifications
    result = await db.notifications.delete_many({
        "created_at": {"$lt": cleanup_date}
    })
    cleaned["notifications"] = result.deleted_count
    
    # Delete old subscription requests that are completed
    result = await db.subscription_requests.delete_many({
        "status": {"$in": ["approved", "rejected"]},
        "created_at": {"$lt": cleanup_date}
    })
    cleaned["subscription_requests"] = result.deleted_count
    
    return cleaned

# Endpoint to get notifications for superadmin
@api_router.get("/admin/notifications")
async def get_admin_notifications(current_user: dict = Depends(get_superadmin)):
    """Get all notifications for superadmin"""
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return notifications

@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_superadmin)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notificatie gelezen"}

@api_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a notification"""
    await db.notifications.delete_one({"id": notification_id})
    return {"message": "Notificatie verwijderd"}

# ============================================
# DEPLOYMENT / SYSTEM UPDATE ENDPOINTS
# ============================================

@api_router.get("/admin/deployment/settings")
async def get_deployment_settings(current_user: dict = Depends(get_superadmin)):
    """Get deployment/update settings - superadmin only"""
    settings = await db.deployment_settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        settings = {
            "webhook_url": "",
            "webhook_secret": "",
            "auto_restart_backend": True,
            "auto_rebuild_frontend": True,
            "run_migrations": True,
            "last_update": None,
            "last_update_status": None
        }
        await db.deployment_settings.insert_one(settings)
    return settings

@api_router.put("/admin/deployment/settings")
async def update_deployment_settings(
    settings: DeploymentSettings,
    current_user: dict = Depends(get_superadmin)
):
    """Update deployment settings - superadmin only"""
    await db.deployment_settings.update_one(
        {},
        {"$set": settings.dict(exclude_none=True)},
        upsert=True
    )
    return {"message": "Instellingen opgeslagen"}

@api_router.post("/admin/deployment/update")
async def trigger_system_update(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_superadmin)
):
    """Trigger direct system update - superadmin only (self-hosted server)"""
    import subprocess
    
    settings = await db.deployment_settings.find_one({}, {"_id": 0}) or {}
    
    # Create deployment log entry
    log_id = str(uuid.uuid4())
    log_entry = {
        "id": log_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "message": "Update gestart...",
        "details": ["🚀 Update proces gestart in achtergrond..."]
    }
    await db.deployment_logs.insert_one(log_entry)
    
    # Update settings to show running status
    await db.deployment_settings.update_one(
        {},
        {"$set": {
            "last_update": datetime.now(timezone.utc).isoformat(),
            "last_update_status": "running"
        }},
        upsert=True
    )
    
    # Run the actual update in background
    def run_update_script():
        import time
        details = []
        base_path = os.environ.get("APP_BASE_PATH", "/home/clp/htdocs/facturatie.sr")
        update_script = f"{base_path}/server-update.sh"
        
        try:
            if os.path.exists(update_script):
                details.append("🚀 Server update script uitvoeren...")
                result = subprocess.run(
                    ["sudo", "bash", update_script],
                    capture_output=True,
                    text=True,
                    timeout=600,
                    cwd=base_path
                )
                
                if result.returncode == 0:
                    details.append("✅ Update script succesvol uitgevoerd")
                    if result.stdout:
                        details.append(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
                else:
                    details.append(f"⚠️ Script returncode: {result.returncode}")
                    if result.stderr:
                        details.append(f"Errors: {result.stderr[-300:]}")
                    if result.stdout:
                        details.append(result.stdout[-300:])
            else:
                # Fallback: manual git pull
                details.append("📥 Git pull uitvoeren (script niet gevonden)...")
                result = subprocess.run(
                    ["git", "pull", "origin", "main"],
                    cwd=base_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                details.append(f"Git: {result.stdout or result.stderr}")
            
            # Update log with success
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            
            # Use sync pymongo for background task
            from pymongo import MongoClient
            mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            db_name = os.environ.get("DB_NAME", "erp_db")
            sync_client = MongoClient(mongo_url)
            sync_db = sync_client[db_name]
            
            sync_db.deployment_logs.update_one(
                {"id": log_id},
                {"$set": {
                    "status": "success",
                    "message": "Update succesvol afgerond",
                    "details": details,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            sync_db.deployment_settings.update_one(
                {},
                {"$set": {
                    "last_update": datetime.now(timezone.utc).isoformat(),
                    "last_update_status": "success"
                }},
                upsert=True
            )
            sync_client.close()
            
        except subprocess.TimeoutExpired:
            details.append("❌ Timeout tijdens update (max 10 min)")
            from pymongo import MongoClient
            mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            db_name = os.environ.get("DB_NAME", "erp_db")
            sync_client = MongoClient(mongo_url)
            sync_db = sync_client[db_name]
            sync_db.deployment_logs.update_one(
                {"id": log_id},
                {"$set": {"status": "failed", "message": "Timeout", "details": details}}
            )
            sync_db.deployment_settings.update_one(
                {}, {"$set": {"last_update_status": "failed"}}, upsert=True
            )
            sync_client.close()
        except Exception as e:
            details.append(f"❌ Fout: {str(e)}")
            from pymongo import MongoClient
            mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            db_name = os.environ.get("DB_NAME", "erp_db")
            sync_client = MongoClient(mongo_url)
            sync_db = sync_client[db_name]
            sync_db.deployment_logs.update_one(
                {"id": log_id},
                {"$set": {"status": "failed", "message": str(e), "details": details}}
            )
            sync_db.deployment_settings.update_one(
                {}, {"$set": {"last_update_status": "failed"}}, upsert=True
            )
            sync_client.close()
    
    # Add to background tasks
    background_tasks.add_task(run_update_script)
    
    return {
        "success": True,
        "message": "Update gestart in achtergrond. Ververs de pagina over ~30 seconden voor de status.",
        "log_id": log_id,
        "status": "running"
    }


async def sync_modules_to_database():
    """Sync predefined modules to the database"""
    predefined_modules = [
        {
            "slug": "hrm",
            "name": "HRM",
            "description": "Human Resource Management - Personeelsbeheer, verlof, salarissen",
            "icon": "users",
            "price": 49.99,
            "features": ["Personeelsbeheer", "Verlofregistratie", "Salarisadministratie", "Aanwezigheid"],
            "is_active": True
        },
        {
            "slug": "vastgoed_beheer",
            "name": "Vastgoed Beheer",
            "description": "Beheer huurwoningen, huurders en onderhoud",
            "icon": "building",
            "price": 59.99,
            "features": ["Huurdersbeheer", "Facturatie", "Onderhoud", "Meterstanden"],
            "is_active": True
        },
        {
            "slug": "autodealer",
            "name": "Auto Dealer",
            "description": "Voertuigbeheer, verkoop en klanten portal",
            "icon": "car",
            "price": 69.99,
            "features": ["Voertuigbeheer", "Multi-valuta", "Verkoop", "Klanten Portal"],
            "is_active": True
        },
        {
            "slug": "beauty",
            "name": "Beauty Spa",
            "description": "Complete oplossing voor schoonheidssalons en spa's",
            "icon": "scissors",
            "price": 59.99,
            "features": ["CRM", "Afspraken", "POS", "Voorraad", "Online Booking"],
            "is_active": True
        },
        {
            "slug": "pompstation",
            "name": "Pompstation",
            "description": "Compleet tankstation beheer: tanks, pompen, POS, winkel, personeel en veiligheid",
            "icon": "fuel",
            "price": 79.99,
            "features": ["Tankbeheer", "POS/Kassa", "Winkel", "Personeel", "Veiligheid", "Rapportages"],
            "is_active": True
        }
    ]
    
    for module in predefined_modules:
        existing = await db.addons.find_one({"slug": module["slug"]})
        if not existing:
            module["id"] = str(uuid.uuid4())
            module["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.addons.insert_one(module)
            logger.info(f"Created addon: {module['slug']}")
        else:
            # Update existing addon with new info (but keep id and created_at)
            await db.addons.update_one(
                {"slug": module["slug"]},
                {"$set": {
                    "name": module["name"],
                    "description": module["description"],
                    "icon": module["icon"],
                    "price": module["price"],
                    "features": module["features"],
                    "is_active": module["is_active"]
                }}
            )

@api_router.get("/admin/deployment/logs")
async def get_deployment_logs(current_user: dict = Depends(get_superadmin)):
    """Get deployment logs - superadmin only"""
    logs = await db.deployment_logs.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    return logs

# ============================================
# WORKSPACES - MULTI-TENANT MANAGEMENT
# ============================================

# Server IP for DNS instructions (configure this)
SERVER_IP = "72.62.174.80"  # Replace with actual server IP
MAIN_DOMAIN = "facturatie.sr"

@api_router.get("/admin/workspaces", response_model=List[WorkspaceResponse])
async def get_all_workspaces(current_user: dict = Depends(get_superadmin)):
    """Get all workspaces - superadmin only"""
    workspaces = await db.workspaces.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with owner info and user counts
    result = []
    for ws in workspaces:
        owner = await db.users.find_one({"id": ws.get("owner_id")}, {"_id": 0, "name": 1, "email": 1})
        users_count = await db.workspace_users.count_documents({"workspace_id": ws["id"]})
        
        result.append({
            **ws,
            "owner_name": owner.get("name") if owner else None,
            "owner_email": owner.get("email") if owner else None,
            "users_count": users_count,
            "domain": ws.get("domain", {
                "type": "subdomain",
                "subdomain": ws.get("slug"),
                "dns_verified": False,
                "ssl_active": False,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            }),
            "branding": ws.get("branding", {
                "primary_color": "#0caf60",
                "secondary_color": "#059669"
            })
        })
    
    return result

@api_router.get("/admin/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Get a specific workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    owner = await db.users.find_one({"id": workspace.get("owner_id")}, {"_id": 0, "name": 1, "email": 1})
    users_count = await db.workspace_users.count_documents({"workspace_id": workspace_id})
    
    return {
        **workspace,
        "owner_name": owner.get("name") if owner else None,
        "owner_email": owner.get("email") if owner else None,
        "users_count": users_count
    }

@api_router.post("/admin/workspaces", response_model=WorkspaceResponse)
async def create_workspace(workspace_data: WorkspaceCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new workspace - superadmin only"""
    import re
    
    # Validate slug (URL-safe)
    slug = workspace_data.slug.lower().strip()
    if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', slug):
        raise HTTPException(status_code=400, detail="Slug mag alleen kleine letters, cijfers en koppeltekens bevatten")
    
    # Check if slug is unique
    existing = await db.workspaces.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="Deze slug is al in gebruik")
    
    # Check if subdomain/custom domain is unique
    if workspace_data.domain_type == "subdomain":
        subdomain = workspace_data.subdomain or slug
        existing_domain = await db.workspaces.find_one({"domain.subdomain": subdomain})
        if existing_domain:
            raise HTTPException(status_code=400, detail="Dit subdomein is al in gebruik")
    elif workspace_data.domain_type == "custom" and workspace_data.custom_domain:
        existing_domain = await db.workspaces.find_one({"domain.custom_domain": workspace_data.custom_domain})
        if existing_domain:
            raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
    
    # Verify owner exists
    owner = await db.users.find_one({"id": workspace_data.owner_id}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Eigenaar niet gevonden")
    
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Build domain config
    domain_config = {
        "type": workspace_data.domain_type,
        "subdomain": workspace_data.subdomain or slug if workspace_data.domain_type == "subdomain" else None,
        "custom_domain": workspace_data.custom_domain if workspace_data.domain_type == "custom" else None,
        "dns_verified": workspace_data.domain_type == "subdomain",  # Subdomain auto-verified
        "ssl_active": workspace_data.domain_type == "subdomain",  # Subdomain auto-SSL
        "dns_record_type": "A",
        "dns_record_value": SERVER_IP
    }
    
    # Build branding config
    branding_config = {
        "logo_url": workspace_data.branding.logo_url if workspace_data.branding else None,
        "favicon_url": workspace_data.branding.favicon_url if workspace_data.branding else None,
        "primary_color": workspace_data.branding.primary_color if workspace_data.branding else "#0caf60",
        "secondary_color": workspace_data.branding.secondary_color if workspace_data.branding else "#059669",
        "portal_name": workspace_data.branding.portal_name if workspace_data.branding else workspace_data.name
    }
    
    workspace = {
        "id": workspace_id,
        "name": workspace_data.name,
        "slug": slug,
        "owner_id": workspace_data.owner_id,
        "status": "active" if workspace_data.domain_type == "subdomain" else "pending",
        "domain": domain_config,
        "branding": branding_config,
        "created_at": now,
        "updated_at": now,
        "error_message": None
    }
    
    await db.workspaces.insert_one(workspace)
    
    # Create nginx config instruction log
    if workspace_data.domain_type == "subdomain":
        await db.workspace_logs.insert_one({
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "action": "create",
            "message": f"Subdomein {domain_config['subdomain']}.{MAIN_DOMAIN} aangemaakt",
            "timestamp": now
        })
    
    return {
        **workspace,
        "owner_name": owner.get("name"),
        "owner_email": owner.get("email"),
        "users_count": 0
    }

@api_router.put("/admin/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: str, workspace_data: WorkspaceUpdate, current_user: dict = Depends(get_superadmin)):
    """Update a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if workspace_data.name:
        update_data["name"] = workspace_data.name
    
    if workspace_data.branding:
        update_data["branding"] = workspace_data.branding.dict()
    
    # Handle domain changes
    if workspace_data.domain_type:
        workspace.get("domain", {})
        
        if workspace_data.domain_type == "subdomain":
            subdomain = workspace_data.subdomain or workspace["slug"]
            # Check uniqueness
            existing = await db.workspaces.find_one({
                "domain.subdomain": subdomain,
                "id": {"$ne": workspace_id}
            })
            if existing:
                raise HTTPException(status_code=400, detail="Dit subdomein is al in gebruik")
            
            update_data["domain"] = {
                "type": "subdomain",
                "subdomain": subdomain,
                "custom_domain": None,
                "dns_verified": True,
                "ssl_active": True,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            }
            update_data["status"] = "active"
            
        elif workspace_data.domain_type == "custom" and workspace_data.custom_domain:
            # Check uniqueness
            existing = await db.workspaces.find_one({
                "domain.custom_domain": workspace_data.custom_domain,
                "id": {"$ne": workspace_id}
            })
            if existing:
                raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
            
            update_data["domain"] = {
                "type": "custom",
                "subdomain": None,
                "custom_domain": workspace_data.custom_domain,
                "dns_verified": False,
                "ssl_active": False,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            }
            update_data["status"] = "pending"
    
    await db.workspaces.update_one({"id": workspace_id}, {"$set": update_data})
    
    # Get updated workspace
    updated = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    owner = await db.users.find_one({"id": updated.get("owner_id")}, {"_id": 0, "name": 1, "email": 1})
    users_count = await db.workspace_users.count_documents({"workspace_id": workspace_id})
    
    return {
        **updated,
        "owner_name": owner.get("name") if owner else None,
        "owner_email": owner.get("email") if owner else None,
        "users_count": users_count
    }

@api_router.delete("/admin/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    # Delete workspace and all related data
    await db.workspaces.delete_one({"id": workspace_id})
    await db.workspace_users.delete_many({"workspace_id": workspace_id})
    await db.workspace_logs.delete_many({"workspace_id": workspace_id})
    
    # Note: In production, you would also clean up:
    # - Nginx config
    # - SSL certificates
    # - Any workspace-specific data
    
    return {"message": "Workspace verwijderd"}

@api_router.post("/admin/workspaces/{workspace_id}/verify-dns")
async def verify_workspace_dns(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Verify DNS configuration for custom domain - superadmin only"""
    import socket
    
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain = workspace.get("domain", {})
    if domain.get("type") != "custom" or not domain.get("custom_domain"):
        raise HTTPException(status_code=400, detail="Geen custom domein geconfigureerd")
    
    custom_domain = domain["custom_domain"]
    
    try:
        # DNS lookup
        ip_addresses = socket.gethostbyname_ex(custom_domain)[2]
        
        if SERVER_IP in ip_addresses:
            # DNS is correct, update workspace
            await db.workspaces.update_one(
                {"id": workspace_id},
                {"$set": {
                    "domain.dns_verified": True,
                    "status": "active",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": None
                }}
            )
            
            # Log success
            await db.workspace_logs.insert_one({
                "id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "action": "dns_verified",
                "message": f"DNS geverifieerd voor {custom_domain}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "message": f"DNS geverifieerd! {custom_domain} wijst naar {SERVER_IP}",
                "ssl_instructions": "SSL-certificaat kan nu worden aangevraagd via: sudo certbot --nginx -d " + custom_domain
            }
        else:
            return {
                "success": False,
                "message": f"DNS wijst naar {', '.join(ip_addresses)} in plaats van {SERVER_IP}",
                "instructions": f"Maak een A-record aan voor {custom_domain} dat wijst naar {SERVER_IP}"
            }
            
    except socket.gaierror:
        return {
            "success": False,
            "message": f"Domein {custom_domain} niet gevonden in DNS",
            "instructions": f"Maak een A-record aan voor {custom_domain} dat wijst naar {SERVER_IP}"
        }

@api_router.post("/admin/workspaces/{workspace_id}/activate-ssl")
async def activate_workspace_ssl(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Mark SSL as activated for a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain = workspace.get("domain", {})
    if not domain.get("dns_verified"):
        raise HTTPException(status_code=400, detail="DNS moet eerst geverifieerd zijn")
    
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "domain.ssl_active": True,
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "SSL geactiveerd"}

@api_router.get("/admin/workspaces/{workspace_id}/nginx-config")
async def get_workspace_nginx_config(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Get Nginx configuration for a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain = workspace.get("domain", {})
    
    if domain.get("type") == "subdomain":
        server_name = f"{domain['subdomain']}.{MAIN_DOMAIN}"
    else:
        server_name = domain.get("custom_domain", "example.com")
    
    nginx_config = f"""# Nginx config voor workspace: {workspace['name']}
# Voeg toe aan /etc/nginx/sites-available/{workspace['slug']}

server {{
    listen 80;
    server_name {server_name};
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {server_name};
    
    # SSL certificaten (via Certbot)
    ssl_certificate /etc/letsencrypt/live/{server_name}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{server_name}/privkey.pem;
    
    # Frontend
    location / {{
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Workspace-ID {workspace['id']};
        proxy_cache_bypass $http_upgrade;
    }}
    
    # Backend API
    location /api {{
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Workspace-ID {workspace['id']};
    }}
}}

# Activeren:
# sudo ln -s /etc/nginx/sites-available/{workspace['slug']} /etc/nginx/sites-enabled/
# sudo certbot --nginx -d {server_name}
# sudo nginx -t && sudo systemctl reload nginx
"""
    
    return {
        "config": nginx_config,
        "server_name": server_name,
        "commands": [
            f"sudo nano /etc/nginx/sites-available/{workspace['slug']}",
            f"sudo ln -s /etc/nginx/sites-available/{workspace['slug']} /etc/nginx/sites-enabled/",
            f"sudo certbot --nginx -d {server_name}",
            "sudo nginx -t && sudo systemctl reload nginx"
        ]
    }

@api_router.get("/admin/workspace-stats")
async def get_workspace_stats(current_user: dict = Depends(get_superadmin)):
    """Get workspace statistics - superadmin only"""
    total = await db.workspaces.count_documents({})
    active = await db.workspaces.count_documents({"status": "active"})
    pending = await db.workspaces.count_documents({"status": "pending"})
    
    return {
        "total": total,
        "active": active,
        "pending": pending,
        "suspended": await db.workspaces.count_documents({"status": "suspended"})
    }

# ============================================
# WORKSPACE USERS MANAGEMENT
# ============================================

class WorkspaceUserRole(str, Enum):
    admin = "admin"
    member = "member"
    viewer = "viewer"

class WorkspaceUserInvite(BaseModel):
    email: str
    name: str
    role: str = "member"

class WorkspaceUserResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    email: str
    name: str
    role: str
    status: str  # 'active', 'invited', 'disabled'
    invited_at: str
    joined_at: Optional[str] = None

@api_router.get("/workspace/users", response_model=List[WorkspaceUserResponse])
async def get_workspace_users(current_user: dict = Depends(get_current_user)):
    """Get all users in current workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        if current_user.get("role") == "superadmin":
            raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    # Check if user is workspace admin
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if workspace["owner_id"] != current_user["id"]:
        # Check if user has admin role in workspace
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"]
        })
        if not user_role or user_role.get("role") not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Geen toegang tot gebruikersbeheer")
    
    users = await db.workspace_users.find(
        {"workspace_id": workspace_id},
        {"_id": 0}
    ).to_list(100)
    
    return users

@api_router.post("/workspace/users/invite", response_model=WorkspaceUserResponse)
async def invite_workspace_user(invite: WorkspaceUserInvite, current_user: dict = Depends(get_current_user)):
    """Invite a user to the current workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    # Only owner or admin can invite
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"],
            "role": {"$in": ["admin", "owner"]}
        })
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten om gebruikers uit te nodigen")
    
    # Check if already invited
    existing = await db.workspace_users.find_one({
        "workspace_id": workspace_id,
        "email": invite.email
    })
    if existing:
        raise HTTPException(status_code=400, detail="Gebruiker is al uitgenodigd")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": invite.email}, {"_id": 0})
    
    invitation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    invitation = {
        "id": invitation_id,
        "user_id": existing_user["id"] if existing_user else None,
        "workspace_id": workspace_id,
        "email": invite.email,
        "name": invite.name,
        "role": invite.role,
        "status": "active" if existing_user else "invited",
        "invited_at": now,
        "joined_at": now if existing_user else None,
        "invited_by": current_user["id"]
    }
    
    await db.workspace_users.insert_one(invitation)
    
    # If user exists, update their workspace_id
    if existing_user and not existing_user.get("workspace_id"):
        await db.users.update_one(
            {"id": existing_user["id"]},
            {"$set": {"workspace_id": workspace_id}}
        )
    
    return WorkspaceUserResponse(**invitation)

@api_router.put("/workspace/users/{user_id}/role")
async def update_workspace_user_role(user_id: str, role: str, current_user: dict = Depends(get_current_user)):
    """Update a workspace user's role"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    
    # Only owner can change roles
    if workspace["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Alleen de eigenaar kan rollen wijzigen")
    
    # Can't change owner's role
    if user_id == workspace["owner_id"]:
        raise HTTPException(status_code=400, detail="Kan de eigenaar's rol niet wijzigen")
    
    result = await db.workspace_users.update_one(
        {"workspace_id": workspace_id, "user_id": user_id},
        {"$set": {"role": role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    return {"message": "Rol bijgewerkt"}

@api_router.delete("/workspace/users/{user_id}")
async def remove_workspace_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a user from the workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    
    # Only owner or admin can remove
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"],
            "role": "admin"
        })
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten om gebruikers te verwijderen")
    
    # Can't remove owner
    if user_id == workspace["owner_id"]:
        raise HTTPException(status_code=400, detail="Kan de eigenaar niet verwijderen")
    
    # Remove from workspace_users
    await db.workspace_users.delete_one({
        "workspace_id": workspace_id,
        "user_id": user_id
    })
    
    # Clear user's workspace_id
    await db.users.update_one(
        {"id": user_id, "workspace_id": workspace_id},
        {"$set": {"workspace_id": None}}
    )
    
    return {"message": "Gebruiker verwijderd"}

# ==================== WORKSPACE BACKUPS ====================

BACKUP_COLLECTIONS = [
    # Vastgoed Beheer (Real Estate)
    "tenants", "apartments", "payments", "deposits", "loans",
    "kasgeld", "maintenance", "meter_readings", "contracts", "invoices",
    # HRM Module
    "employees", "salaries", "hrm_employees", "hrm_departments", 
    "hrm_attendance", "hrm_leave_requests", "hrm_payroll", "hrm_settings",
    # Auto Dealer Module
    "autodealer_vehicles", "autodealer_customers", "autodealer_sales",
    # Tenant Portal
    "tenant_accounts",
    # AI Chat History
    "ai_chat_history",
    # Workspace specifiek
    "workspace_users", "workspace_logs", "user_addons"
]

async def get_all_workspace_collections():
    """
    Dynamisch alle collecties ophalen die workspace_id bevatten.
    Dit zorgt ervoor dat nieuwe modules automatisch worden gebackupt.
    """
    all_collections = await db.list_collection_names()
    workspace_collections = set(BACKUP_COLLECTIONS)  # Start met bekende collecties
    
    # Controleer elke collectie of het workspace_id bevat
    for coll_name in all_collections:
        # Skip system en backup collecties
        if coll_name.startswith('system.') or coll_name in ['workspace_backups', 'workspace_backup_data', 'workspaces']:
            continue
        try:
            # Check of collectie documenten met workspace_id heeft
            sample = await db[coll_name].find_one({"workspace_id": {"$exists": True}})
            if sample:
                workspace_collections.add(coll_name)
        except Exception:
            pass
    
    return list(workspace_collections)

class BackupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class BackupResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    size_bytes: int
    collections_count: int
    records_count: int
    created_at: str
    created_by: str
    status: str

@api_router.get("/workspace/backups", response_model=List[BackupResponse])
async def get_workspace_backups(current_user: dict = Depends(get_current_user)):
    """Get all backups for the current workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        if current_user.get("role") == "superadmin":
            raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"],
            "role": {"$in": ["admin", "owner"]}
        })
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten voor backup beheer")
    
    backups = await db.workspace_backups.find({"workspace_id": workspace_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return backups

@api_router.post("/workspace/backups", response_model=BackupResponse)
async def create_workspace_backup(backup_data: BackupCreate, current_user: dict = Depends(get_current_user)):
    """Create a backup of the current workspace data"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        if current_user.get("role") == "superadmin":
            raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id, "user_id": current_user["id"], "role": {"$in": ["admin", "owner"]}
        })
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten om backups te maken")
    
    backup_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    backup_content = {"workspace": {k: v for k, v in workspace.items() if k != "_id"}, "collections": {}}
    total_records = 0
    
    # Dynamisch alle workspace collecties ophalen (inclusief nieuwe modules)
    collections_to_backup = await get_all_workspace_collections()
    
    for coll_name in collections_to_backup:
        try:
            records = await db[coll_name].find({"workspace_id": workspace_id}, {"_id": 0}).to_list(10000)
            if coll_name in ["tenants", "apartments", "payments", "employees"]:
                legacy = await db[coll_name].find({"user_id": workspace["owner_id"], "workspace_id": {"$exists": False}}, {"_id": 0}).to_list(10000)
                records.extend(legacy)
            if records:  # Alleen toevoegen als er data is
                backup_content["collections"][coll_name] = records
                total_records += len(records)
        except Exception as e:
            logger.warning(f"Could not backup collection {coll_name}: {e}")
    
    backup_json = json.dumps(backup_content, default=str)
    size_bytes = len(backup_json.encode('utf-8'))
    
    backup_record = {
        "id": backup_id, "workspace_id": workspace_id, "name": backup_data.name,
        "description": backup_data.description, "size_bytes": size_bytes,
        "collections_count": len(backup_content["collections"]), "records_count": total_records,
        "created_at": now, "created_by": current_user["id"],
        "created_by_name": current_user.get("name", "Onbekend"), "status": "completed",
        "backed_up_collections": list(backup_content["collections"].keys())
    }
    await db.workspace_backups.insert_one(backup_record)
    await db.workspace_backup_data.insert_one({"backup_id": backup_id, "workspace_id": workspace_id, "content": backup_content, "created_at": now})
    
    return BackupResponse(**backup_record)

@api_router.post("/workspace/backups/{backup_id}/restore")
async def restore_workspace_backup(backup_id: str, current_user: dict = Depends(get_current_user), confirm: bool = False):
    """Restore a workspace from a backup"""
    if not confirm:
        raise HTTPException(status_code=400, detail="Bevestig door confirm=true mee te sturen")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace or workspace["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Alleen de eigenaar kan een backup herstellen")
    
    backup = await db.workspace_backups.find_one({"id": backup_id, "workspace_id": workspace_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup niet gevonden")
    
    backup_data = await db.workspace_backup_data.find_one({"backup_id": backup_id})
    if not backup_data or not backup_data.get("content"):
        raise HTTPException(status_code=404, detail="Backup data niet gevonden")
    
    content = backup_data["content"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Create safety backup
    safety_id = str(uuid.uuid4())
    safety_content = {"workspace": {k: v for k, v in workspace.items() if k != "_id"}, "collections": {}}
    for coll_name in BACKUP_COLLECTIONS:
        safety_content["collections"][coll_name] = await db[coll_name].find({"workspace_id": workspace_id}, {"_id": 0}).to_list(10000)
    await db.workspace_backup_data.insert_one({"backup_id": safety_id, "workspace_id": workspace_id, "content": safety_content, "created_at": now})
    await db.workspace_backups.insert_one({"id": safety_id, "workspace_id": workspace_id, "name": "Auto-backup voor herstel", "size_bytes": 0, "collections_count": len(BACKUP_COLLECTIONS), "records_count": 0, "created_at": now, "created_by": "system", "status": "completed"})
    
    # Restore
    restored_count = 0
    for coll_name, records in content.get("collections", {}).items():
        if coll_name in BACKUP_COLLECTIONS:
            await db[coll_name].delete_many({"workspace_id": workspace_id})
            if records:
                for r in records:
                    r["workspace_id"] = workspace_id
                await db[coll_name].insert_many(records)
                restored_count += len(records)
    
    return {"message": "Backup succesvol hersteld", "records_restored": restored_count, "safety_backup_id": safety_id}

@api_router.delete("/workspace/backups/{backup_id}")
async def delete_workspace_backup(backup_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a workspace backup"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({"workspace_id": workspace_id, "user_id": current_user["id"], "role": {"$in": ["admin", "owner"]}})
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten")
    
    backup = await db.workspace_backups.find_one({"id": backup_id, "workspace_id": workspace_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup niet gevonden")
    
    await db.workspace_backup_data.delete_one({"backup_id": backup_id})
    await db.workspace_backups.delete_one({"id": backup_id})
    return {"message": "Backup verwijderd"}

@api_router.get("/workspace/backups/{backup_id}/download")
async def download_workspace_backup(backup_id: str, current_user: dict = Depends(get_current_user)):
    """Download backup as JSON"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    backup = await db.workspace_backups.find_one({"id": backup_id, "workspace_id": workspace_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup niet gevonden")
    
    backup_data = await db.workspace_backup_data.find_one({"backup_id": backup_id})
    if not backup_data:
        raise HTTPException(status_code=404, detail="Backup data niet gevonden")
    
    from fastapi.responses import JSONResponse
    return JSONResponse(content={"backup_info": {"id": backup["id"], "name": backup["name"], "created_at": backup["created_at"]}, "data": backup_data["content"]}, headers={"Content-Disposition": f'attachment; filename="backup_{backup_id}.json"'})

# ============================================
# CMS - COMPLETE WEBSITE BUILDER
# ============================================

# --- CMS PAGES ---

@api_router.get("/cms/pages")
async def get_cms_pages(current_user: dict = Depends(get_superadmin)):
    """Get all CMS pages (admin)"""
    pages = await db.cms_pages.find({}, {"_id": 0}).sort("menu_order", 1).to_list(100)
    return pages

@api_router.get("/cms/pages/{page_id}")
async def get_cms_page(page_id: str, current_user: dict = Depends(get_superadmin)):
    """Get a specific CMS page (admin)"""
    page = await db.cms_pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    return page

@api_router.post("/cms/pages")
async def create_cms_page(page: CMSPage, current_user: dict = Depends(get_superadmin)):
    """Create a new CMS page"""
    # Check slug uniqueness
    existing = await db.cms_pages.find_one({"slug": page.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Deze URL slug bestaat al")
    
    page_dict = page.dict()
    page_dict["id"] = str(uuid.uuid4())
    page_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    page_dict["updated_at"] = page_dict["created_at"]
    
    # Add IDs to sections
    for section in page_dict.get("sections", []):
        if not section.get("id"):
            section["id"] = str(uuid.uuid4())
    
    await db.cms_pages.insert_one(page_dict)
    
    # Update menu if show_in_menu
    if page.show_in_menu:
        await update_main_menu()
    
    return {**page_dict, "_id": None}

@api_router.put("/cms/pages/{page_id}")
async def update_cms_page(page_id: str, page: CMSPage, current_user: dict = Depends(get_superadmin)):
    """Update a CMS page"""
    existing = await db.cms_pages.find_one({"id": page_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    
    # Check slug uniqueness if changed
    if page.slug != existing.get("slug"):
        slug_exists = await db.cms_pages.find_one({"slug": page.slug, "id": {"$ne": page_id}})
        if slug_exists:
            raise HTTPException(status_code=400, detail="Deze URL slug bestaat al")
    
    page_dict = page.dict()
    page_dict["id"] = page_id
    page_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    page_dict["created_at"] = existing.get("created_at")
    
    # Add IDs to new sections
    for section in page_dict.get("sections", []):
        if not section.get("id"):
            section["id"] = str(uuid.uuid4())
    
    await db.cms_pages.update_one({"id": page_id}, {"$set": page_dict})
    
    # Update menu
    await update_main_menu()
    
    return {**page_dict, "_id": None}

@api_router.delete("/cms/pages/{page_id}")
async def delete_cms_page(page_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a CMS page"""
    page = await db.cms_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    
    # Don't allow deleting home page
    if page.get("slug") == "home":
        raise HTTPException(status_code=400, detail="De homepage kan niet worden verwijderd")
    
    await db.cms_pages.delete_one({"id": page_id})
    
    # Update menu
    await update_main_menu()
    
    return {"message": "Pagina verwijderd"}

@api_router.put("/cms/pages/{page_id}/sections/reorder")
async def reorder_page_sections(page_id: str, section_ids: List[str], current_user: dict = Depends(get_superadmin)):
    """Reorder sections within a page"""
    page = await db.cms_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    
    sections = page.get("sections", [])
    section_map = {s["id"]: s for s in sections}
    
    reordered = []
    for i, sid in enumerate(section_ids):
        if sid in section_map:
            section_map[sid]["order"] = i
            reordered.append(section_map[sid])
    
    await db.cms_pages.update_one({"id": page_id}, {"$set": {"sections": reordered}})
    return {"message": "Secties herschikt"}

# --- CMS MENU ---

@api_router.get("/cms/menu")
async def get_cms_menu(current_user: dict = Depends(get_superadmin)):
    """Get main menu (admin)"""
    menu = await db.cms_menus.find_one({"name": "main"}, {"_id": 0})
    if not menu:
        # Create default menu
        menu = {"id": str(uuid.uuid4()), "name": "main", "items": []}
        await db.cms_menus.insert_one({**menu})
    return menu

@api_router.put("/cms/menu")
async def update_cms_menu(menu: CMSMenu, current_user: dict = Depends(get_superadmin)):
    """Update main menu"""
    menu_dict = menu.dict()
    menu_dict["name"] = "main"
    
    # Add IDs to items
    for item in menu_dict.get("items", []):
        if not item.get("id"):
            item["id"] = str(uuid.uuid4())
    
    await db.cms_menus.update_one(
        {"name": "main"},
        {"$set": menu_dict},
        upsert=True
    )
    return menu_dict

async def update_main_menu():
    """Auto-update main menu based on published pages"""
    pages = await db.cms_pages.find(
        {"is_published": True, "show_in_menu": True},
        {"_id": 0}
    ).sort("menu_order", 1).to_list(100)
    
    items = []
    for page in pages:
        items.append({
            "id": str(uuid.uuid4()),
            "label": page.get("menu_label") or page.get("title"),
            "link": f"/{page.get('slug')}" if page.get("slug") != "home" else "/",
            "page_id": page.get("id"),
            "is_external": False,
            "open_in_new_tab": False,
            "parent_id": page.get("parent_page_id"),
            "order": page.get("menu_order", 0),
            "is_visible": True
        })
    
    await db.cms_menus.update_one(
        {"name": "main"},
        {"$set": {"items": items}},
        upsert=True
    )

# --- CMS FOOTER ---

@api_router.get("/cms/footer")
async def get_cms_footer(current_user: dict = Depends(get_superadmin)):
    """Get footer configuration (admin)"""
    footer = await db.cms_footer.find_one({}, {"_id": 0})
    if not footer:
        # Create default footer
        footer = {
            "id": str(uuid.uuid4()),
            "columns": [
                {
                    "title": "Over Ons",
                    "links": [
                        {"label": "Over Facturatie", "url": "/over-ons"},
                        {"label": "Contact", "url": "/contact"}
                    ]
                },
                {
                    "title": "Diensten",
                    "links": [
                        {"label": "Prijzen", "url": "/prijzen"},
                        {"label": "Modules", "url": "/prijzen"}
                    ]
                },
                {
                    "title": "Legal",
                    "links": [
                        {"label": "Privacy Policy", "url": "/privacy"},
                        {"label": "Algemene Voorwaarden", "url": "/voorwaarden"}
                    ]
                }
            ],
            "copyright_text": f"© {datetime.now().year} Facturatie N.V. Alle rechten voorbehouden.",
            "show_social_links": True,
            "show_newsletter": False,
            "background_color": "#1f2937",
            "text_color": "#ffffff"
        }
        await db.cms_footer.insert_one({**footer})
    return footer

@api_router.put("/cms/footer")
async def update_cms_footer(footer: CMSFooter, current_user: dict = Depends(get_superadmin)):
    """Update footer configuration"""
    footer_dict = footer.dict()
    footer_dict["id"] = str(uuid.uuid4())
    
    await db.cms_footer.update_one(
        {},
        {"$set": footer_dict},
        upsert=True
    )
    return footer_dict

# --- CMS TEMPLATES ---

@api_router.get("/cms/templates")
async def get_cms_templates(current_user: dict = Depends(get_superadmin)):
    """Get available page templates"""
    templates = [
        {
            "id": "blank",
            "name": "Lege Pagina",
            "description": "Start met een lege pagina",
            "preview_image": None,
            "category": "basic",
            "sections": []
        },
        {
            "id": "landing",
            "name": "Landing Page",
            "description": "Perfect voor een homepage met hero, features en CTA",
            "preview_image": None,
            "category": "landing",
            "sections": [
                {"type": "hero", "title": "Welkom", "subtitle": "Uw ondertitel hier", "layout": "center"},
                {"type": "features", "title": "Onze Features", "items": []},
                {"type": "cta", "title": "Klaar om te beginnen?", "button_text": "Contact"}
            ]
        },
        {
            "id": "about",
            "name": "Over Ons",
            "description": "Vertel uw verhaal met tekst en afbeeldingen",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Over Ons", "layout": "center"},
                {"type": "image_text", "title": "Ons Verhaal", "layout": "image-left"},
                {"type": "text", "title": "Onze Missie", "layout": "center"}
            ]
        },
        {
            "id": "services",
            "name": "Diensten",
            "description": "Toon uw diensten met kaarten",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Onze Diensten", "layout": "center"},
                {"type": "features", "title": "", "items": [], "layout": "grid-3"}
            ]
        },
        {
            "id": "pricing",
            "name": "Prijzen",
            "description": "Prijstabellen en vergelijkingen",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Prijzen", "subtitle": "Kies het plan dat bij u past"},
                {"type": "pricing", "title": "", "items": []}
            ]
        },
        {
            "id": "contact",
            "name": "Contact",
            "description": "Contactformulier en bedrijfsinfo",
            "preview_image": None,
            "category": "business",
            "sections": [
                {"type": "hero", "title": "Contact", "layout": "center"},
                {"type": "contact", "title": "Neem contact op"}
            ]
        },
        {
            "id": "gallery",
            "name": "Galerij",
            "description": "Afbeeldingen galerij met lightbox",
            "preview_image": None,
            "category": "portfolio",
            "sections": [
                {"type": "hero", "title": "Galerij", "layout": "center"},
                {"type": "gallery", "title": "", "items": []}
            ]
        },
        {
            "id": "faq",
            "name": "FAQ",
            "description": "Veelgestelde vragen met accordion",
            "preview_image": None,
            "category": "support",
            "sections": [
                {"type": "hero", "title": "Veelgestelde Vragen", "layout": "center"},
                {"type": "faq", "title": "", "items": []}
            ]
        }
    ]
    return templates

@api_router.post("/cms/pages/from-template/{template_id}")
async def create_page_from_template(template_id: str, page_data: dict, current_user: dict = Depends(get_superadmin)):
    """Create a new page from a template"""
    templates = await get_cms_templates(current_user)
    template = next((t for t in templates if t["id"] == template_id), None)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template niet gevonden")
    
    # Create page with template sections
    page = CMSPage(
        title=page_data.get("title", template["name"]),
        slug=page_data.get("slug", template_id + "-" + str(uuid.uuid4())[:8]),
        template=template_id,
        sections=[CMSPageSection(**s) for s in template["sections"]],
        is_published=page_data.get("is_published", False),
        show_in_menu=page_data.get("show_in_menu", True),
        menu_order=page_data.get("menu_order", 99)
    )
    
    return await create_cms_page(page, current_user)

# --- PUBLIC CMS ROUTES ---

@api_router.get("/public/cms/page/{slug}")
async def get_public_cms_page(slug: str):
    """Get a published CMS page by slug (public)"""
    page = await db.cms_pages.find_one(
        {"slug": slug, "is_published": True},
        {"_id": 0}
    )
    if not page:
        raise HTTPException(status_code=404, detail="Pagina niet gevonden")
    return page

@api_router.get("/public/cms/menu")
async def get_public_menu():
    """Get public navigation menu"""
    menu = await db.cms_menus.find_one({"name": "main"}, {"_id": 0})
    if not menu:
        # Build from pages
        pages = await db.cms_pages.find(
            {"is_published": True, "show_in_menu": True},
            {"_id": 0, "id": 1, "title": 1, "slug": 1, "menu_label": 1, "menu_order": 1, "parent_page_id": 1}
        ).sort("menu_order", 1).to_list(100)
        
        items = []
        for page in pages:
            items.append({
                "id": page.get("id"),
                "label": page.get("menu_label") or page.get("title"),
                "link": f"/{page.get('slug')}" if page.get("slug") != "home" else "/",
                "page_id": page.get("id"),
                "parent_id": page.get("parent_page_id"),
                "order": page.get("menu_order", 0)
            })
        
        return {"name": "main", "items": items}
    
    # Filter only visible items
    menu["items"] = [i for i in menu.get("items", []) if i.get("is_visible", True)]
    return menu

@api_router.get("/public/cms/footer")
async def get_public_footer():
    """Get public footer configuration"""
    footer = await db.cms_footer.find_one({}, {"_id": 0})
    if not footer:
        return {
            "columns": [],
            "copyright_text": f"© {datetime.now().year} Facturatie N.V.",
            "show_social_links": True,
            "background_color": "#1f2937",
            "text_color": "#ffffff"
        }
    return footer

@api_router.get("/public/cms/pages")
async def get_public_pages():
    """Get all published pages (for sitemap, etc.)"""
    pages = await db.cms_pages.find(
        {"is_published": True},
        {"_id": 0, "id": 1, "title": 1, "slug": 1, "description": 1, "template": 1}
    ).sort("menu_order", 1).to_list(100)
    return pages

# --- CMS IMAGE UPLOAD ---

@api_router.post("/cms/upload-image")
async def upload_cms_image(file: UploadFile = File(...), current_user: dict = Depends(get_superadmin)):
    """Upload an image for CMS"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Alleen afbeeldingen zijn toegestaan")
    
    # Read and convert to base64
    contents = await file.read()
    
    # Check file size (max 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Afbeelding mag maximaal 5MB zijn")
    
    base64_image = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    return {"url": data_url, "filename": file.filename}

# ============================================
# HRM MODULE - Human Resource Management
# ============================================

class HRMEmployee(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    hire_date: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    status: Optional[str] = "active"  # active, inactive, on_leave
    notes: Optional[str] = None

class HRMLeaveRequest(BaseModel):
    employee_id: str
    leave_type: str  # vacation, sick, personal, maternity, paternity, unpaid
    start_date: str
    end_date: str
    reason: Optional[str] = None
    status: Optional[str] = "pending"  # pending, approved, rejected

class HRMDepartment(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[str] = None

# --- HRM EMPLOYEES ---

@api_router.get("/hrm/employees")
async def get_hrm_employees(current_user: dict = Depends(get_current_user)):
    """Get all employees for the user's company"""
    employees = await db.hrm_employees.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return employees

@api_router.get("/hrm/employees/{employee_id}")
async def get_hrm_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific employee"""
    employee = await db.hrm_employees.find_one(
        {"id": employee_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return employee

@api_router.post("/hrm/employees")
async def create_hrm_employee(employee: HRMEmployee, current_user: dict = Depends(get_current_user)):
    """Create a new employee"""
    # Check addon access using helper function
    if current_user.get("role") != "superadmin":
        has_hrm = await user_has_addon(current_user["id"], "hrm")
        if not has_hrm:
            raise HTTPException(status_code=403, detail="HRM module niet geactiveerd")
    
    employee_dict = employee.dict()
    employee_dict["id"] = str(uuid.uuid4())
    employee_dict["user_id"] = current_user["id"]
    employee_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    employee_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    employee_dict["leave_balance"] = {
        "vacation": 20,  # Standard Suriname vacation days
        "sick": 10,
        "personal": 3
    }
    
    await db.hrm_employees.insert_one(employee_dict)
    if "_id" in employee_dict:
        del employee_dict["_id"]
    return employee_dict

@api_router.put("/hrm/employees/{employee_id}")
async def update_hrm_employee(employee_id: str, employee: HRMEmployee, current_user: dict = Depends(get_current_user)):
    """Update an employee"""
    existing = await db.hrm_employees.find_one({"id": employee_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    employee_dict = employee.dict()
    employee_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_employees.update_one(
        {"id": employee_id},
        {"$set": employee_dict}
    )
    
    updated = await db.hrm_employees.find_one({"id": employee_id}, {"_id": 0})
    return updated

@api_router.delete("/hrm/employees/{employee_id}")
async def delete_hrm_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an employee"""
    result = await db.hrm_employees.delete_one({"id": employee_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    return {"message": "Werknemer verwijderd"}

# --- HRM DEPARTMENTS ---

@api_router.get("/hrm/departments")
async def get_hrm_departments(current_user: dict = Depends(get_current_user)):
    """Get all departments"""
    departments = await db.hrm_departments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    return departments

@api_router.post("/hrm/departments")
async def create_hrm_department(department: HRMDepartment, current_user: dict = Depends(get_current_user)):
    """Create a new department"""
    dept_dict = department.dict()
    dept_dict["id"] = str(uuid.uuid4())
    dept_dict["user_id"] = current_user["id"]
    dept_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_departments.insert_one(dept_dict)
    return {k: v for k, v in dept_dict.items() if k != "_id"}

@api_router.delete("/hrm/departments/{dept_id}")
async def delete_hrm_department(dept_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a department"""
    result = await db.hrm_departments.delete_one({"id": dept_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Afdeling niet gevonden")
    return {"message": "Afdeling verwijderd"}

# --- HRM LEAVE REQUESTS ---

@api_router.get("/hrm/leave-requests")
async def get_hrm_leave_requests(current_user: dict = Depends(get_current_user)):
    """Get all leave requests"""
    requests = await db.hrm_leave_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Enrich with employee names
    for req in requests:
        employee = await db.hrm_employees.find_one({"id": req.get("employee_id")}, {"name": 1})
        req["employee_name"] = employee.get("name") if employee else "Onbekend"
    
    return requests

@api_router.post("/hrm/leave-requests")
async def create_hrm_leave_request(request: HRMLeaveRequest, current_user: dict = Depends(get_current_user)):
    """Create a new leave request"""
    # Validate employee exists
    employee = await db.hrm_employees.find_one({
        "id": request.employee_id, 
        "user_id": current_user["id"]
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    req_dict = request.dict()
    req_dict["id"] = str(uuid.uuid4())
    req_dict["user_id"] = current_user["id"]
    req_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    req_dict["employee_name"] = employee.get("name")
    
    # Calculate days
    try:
        start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
        req_dict["days"] = (end - start).days + 1
    except Exception:
        req_dict["days"] = 1
    
    await db.hrm_leave_requests.insert_one(req_dict)
    return {k: v for k, v in req_dict.items() if k != "_id"}

@api_router.put("/hrm/leave-requests/{request_id}")
async def update_hrm_leave_request(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Approve or reject a leave request"""
    if status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Ongeldige status")
    
    request = await db.hrm_leave_requests.find_one({
        "id": request_id,
        "user_id": current_user["id"]
    })
    if not request:
        raise HTTPException(status_code=404, detail="Verlofaanvraag niet gevonden")
    
    # Update leave balance if approved
    if status == "approved" and request.get("status") != "approved":
        leave_type = request.get("leave_type", "vacation")
        days = request.get("days", 1)
        
        await db.hrm_employees.update_one(
            {"id": request.get("employee_id")},
            {"$inc": {f"leave_balance.{leave_type}": -days}}
        )
    
    await db.hrm_leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.hrm_leave_requests.find_one({"id": request_id}, {"_id": 0})
    return updated

@api_router.delete("/hrm/leave-requests/{request_id}")
async def delete_hrm_leave_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a leave request"""
    result = await db.hrm_leave_requests.delete_one({
        "id": request_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verlofaanvraag niet gevonden")
    return {"message": "Verlofaanvraag verwijderd"}

# --- HRM DASHBOARD STATS ---

@api_router.get("/hrm/stats")
async def get_hrm_stats(current_user: dict = Depends(get_current_user)):
    """Get HRM dashboard statistics"""
    user_id = current_user["id"]
    
    total_employees = await db.hrm_employees.count_documents({"user_id": user_id})
    active_employees = await db.hrm_employees.count_documents({"user_id": user_id, "status": "active"})
    on_leave = await db.hrm_employees.count_documents({"user_id": user_id, "status": "on_leave"})
    
    pending_requests = await db.hrm_leave_requests.count_documents({
        "user_id": user_id,
        "status": "pending"
    })
    
    departments = await db.hrm_departments.count_documents({"user_id": user_id})
    
    # Calculate total salary
    salary_pipeline = [
        {"$match": {"user_id": user_id, "status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$salary"}}}
    ]
    salary_result = await db.hrm_employees.aggregate(salary_pipeline).to_list(1)
    total_salary = salary_result[0]["total"] if salary_result else 0
    
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "on_leave": on_leave,
        "pending_leave_requests": pending_requests,
        "departments": departments,
        "total_monthly_salary": total_salary
    }

# --- HRM CONTRACTS ---

class HRMContract(BaseModel):
    employee_id: str
    contract_type: str  # permanent, temporary, freelance, internship
    start_date: str
    end_date: Optional[str] = None
    salary: float
    currency: str = "SRD"  # SRD, EUR, USD
    working_hours: int = 40
    position: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/hrm/contracts")
async def get_hrm_contracts(current_user: dict = Depends(get_current_user)):
    """Get all contracts"""
    contracts = await db.hrm_contracts.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Add employee names
    for contract in contracts:
        employee = await db.hrm_employees.find_one({"id": contract.get("employee_id")}, {"name": 1})
        contract["employee_name"] = employee.get("name") if employee else "Onbekend"
    
    return contracts

@api_router.post("/hrm/contracts")
async def create_hrm_contract(contract: HRMContract, current_user: dict = Depends(get_current_user)):
    """Create a new contract"""
    contract_dict = contract.dict()
    contract_dict["id"] = str(uuid.uuid4())
    contract_dict["user_id"] = current_user["id"]
    contract_dict["status"] = "active"
    contract_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_contracts.insert_one(contract_dict)
    
    # Update employee salary if needed
    await db.hrm_employees.update_one(
        {"id": contract.employee_id},
        {"$set": {"salary": contract.salary, "position": contract.position}}
    )
    
    return {k: v for k, v in contract_dict.items() if k != "_id"}

@api_router.put("/hrm/contracts/{contract_id}")
async def update_hrm_contract(contract_id: str, contract: HRMContract, current_user: dict = Depends(get_current_user)):
    """Update a contract"""
    existing = await db.hrm_contracts.find_one({"id": contract_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    
    update_data = contract.dict()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_contracts.update_one({"id": contract_id}, {"$set": update_data})
    return await db.hrm_contracts.find_one({"id": contract_id}, {"_id": 0})

@api_router.delete("/hrm/contracts/{contract_id}")
async def delete_hrm_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a contract"""
    result = await db.hrm_contracts.delete_one({"id": contract_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract niet gevonden")
    return {"message": "Contract verwijderd"}

# --- HRM VACANCIES (WERVING) ---

class HRMVacancy(BaseModel):
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "SRD"
    employment_type: str = "fulltime"  # fulltime, parttime, freelance, internship
    location: Optional[str] = None
    deadline: Optional[str] = None
    status: str = "open"  # open, closed, on_hold

@api_router.get("/hrm/vacancies")
async def get_hrm_vacancies(current_user: dict = Depends(get_current_user)):
    """Get all vacancies"""
    vacancies = await db.hrm_vacancies.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return vacancies

@api_router.post("/hrm/vacancies")
async def create_hrm_vacancy(vacancy: HRMVacancy, current_user: dict = Depends(get_current_user)):
    """Create a new vacancy"""
    vacancy_dict = vacancy.dict()
    vacancy_dict["id"] = str(uuid.uuid4())
    vacancy_dict["user_id"] = current_user["id"]
    vacancy_dict["applications_count"] = 0
    vacancy_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_vacancies.insert_one(vacancy_dict)
    return {k: v for k, v in vacancy_dict.items() if k != "_id"}

@api_router.put("/hrm/vacancies/{vacancy_id}")
async def update_hrm_vacancy(vacancy_id: str, vacancy: HRMVacancy, current_user: dict = Depends(get_current_user)):
    """Update a vacancy"""
    existing = await db.hrm_vacancies.find_one({"id": vacancy_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    
    update_data = vacancy.dict()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_vacancies.update_one({"id": vacancy_id}, {"$set": update_data})
    return await db.hrm_vacancies.find_one({"id": vacancy_id}, {"_id": 0})

@api_router.delete("/hrm/vacancies/{vacancy_id}")
async def delete_hrm_vacancy(vacancy_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a vacancy"""
    result = await db.hrm_vacancies.delete_one({"id": vacancy_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    return {"message": "Vacature verwijderd"}

# --- HRM APPLICATIONS (SOLLICITATIES) ---

class HRMApplication(BaseModel):
    vacancy_id: str
    applicant_name: str
    applicant_email: str
    applicant_phone: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str = "new"  # new, reviewing, interview, offered, hired, rejected

@api_router.get("/hrm/applications")
async def get_hrm_applications(current_user: dict = Depends(get_current_user)):
    """Get all applications"""
    applications = await db.hrm_applications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Add vacancy titles
    for app in applications:
        vacancy = await db.hrm_vacancies.find_one({"id": app.get("vacancy_id")}, {"title": 1})
        app["vacancy_title"] = vacancy.get("title") if vacancy else "Onbekend"
    
    return applications

@api_router.post("/hrm/applications")
async def create_hrm_application(application: HRMApplication, current_user: dict = Depends(get_current_user)):
    """Create a new application"""
    app_dict = application.dict()
    app_dict["id"] = str(uuid.uuid4())
    app_dict["user_id"] = current_user["id"]
    app_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_applications.insert_one(app_dict)
    
    # Update applications count on vacancy
    await db.hrm_vacancies.update_one(
        {"id": application.vacancy_id},
        {"$inc": {"applications_count": 1}}
    )
    
    return {k: v for k, v in app_dict.items() if k != "_id"}

@api_router.put("/hrm/applications/{application_id}/status")
async def update_hrm_application_status(application_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update application status"""
    valid_statuses = ["new", "reviewing", "interview", "offered", "hired", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Ongeldige status")
    
    result = await db.hrm_applications.update_one(
        {"id": application_id, "user_id": current_user["id"]},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    
    return await db.hrm_applications.find_one({"id": application_id}, {"_id": 0})

@api_router.delete("/hrm/applications/{application_id}")
async def delete_hrm_application(application_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an application"""
    result = await db.hrm_applications.delete_one({"id": application_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    return {"message": "Sollicitatie verwijderd"}

# --- HRM DOCUMENTS ---

class HRMDocument(BaseModel):
    employee_id: Optional[str] = None
    name: str
    document_type: str  # contract, id, certificate, other
    file_url: Optional[str] = None
    notes: Optional[str] = None
    expiry_date: Optional[str] = None

@api_router.get("/hrm/documents")
async def get_hrm_documents(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all documents, optionally filtered by employee"""
    query = {"user_id": current_user["id"]}
    if employee_id:
        query["employee_id"] = employee_id
    
    documents = await db.hrm_documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add employee names
    for doc in documents:
        if doc.get("employee_id"):
            employee = await db.hrm_employees.find_one({"id": doc.get("employee_id")}, {"name": 1})
            doc["employee_name"] = employee.get("name") if employee else "Onbekend"
    
    return documents

@api_router.post("/hrm/documents")
async def create_hrm_document(document: HRMDocument, current_user: dict = Depends(get_current_user)):
    """Create a new document"""
    doc_dict = document.dict()
    doc_dict["id"] = str(uuid.uuid4())
    doc_dict["user_id"] = current_user["id"]
    doc_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_documents.insert_one(doc_dict)
    return {k: v for k, v in doc_dict.items() if k != "_id"}

@api_router.delete("/hrm/documents/{document_id}")
async def delete_hrm_document(document_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a document"""
    result = await db.hrm_documents.delete_one({"id": document_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    return {"message": "Document verwijderd"}

# --- HRM ATTENDANCE (AANWEZIGHEID) ---

class HRMAttendance(BaseModel):
    employee_id: str
    date: str
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    break_minutes: int = 0
    status: str = "present"  # present, absent, late, half_day, remote
    notes: Optional[str] = None

@api_router.get("/hrm/attendance")
async def get_hrm_attendance(date: Optional[str] = None, employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get attendance records"""
    query = {"user_id": current_user["id"]}
    if date:
        query["date"] = date
    if employee_id:
        query["employee_id"] = employee_id
    
    records = await db.hrm_attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Add employee names
    for record in records:
        employee = await db.hrm_employees.find_one({"id": record.get("employee_id")}, {"name": 1})
        record["employee_name"] = employee.get("name") if employee else "Onbekend"
    
    return records

@api_router.post("/hrm/attendance")
async def create_hrm_attendance(attendance: HRMAttendance, current_user: dict = Depends(get_current_user)):
    """Create or update attendance record"""
    # Check if record exists for this employee and date
    existing = await db.hrm_attendance.find_one({
        "user_id": current_user["id"],
        "employee_id": attendance.employee_id,
        "date": attendance.date
    })
    
    att_dict = attendance.dict()
    att_dict["user_id"] = current_user["id"]
    att_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate worked hours
    if attendance.clock_in and attendance.clock_out:
        try:
            clock_in = datetime.strptime(attendance.clock_in, "%H:%M")
            clock_out = datetime.strptime(attendance.clock_out, "%H:%M")
            worked_minutes = (clock_out - clock_in).seconds // 60 - attendance.break_minutes
            att_dict["worked_hours"] = round(worked_minutes / 60, 2)
        except Exception:
            att_dict["worked_hours"] = 0
    
    if existing:
        await db.hrm_attendance.update_one({"id": existing["id"]}, {"$set": att_dict})
        return await db.hrm_attendance.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        att_dict["id"] = str(uuid.uuid4())
        att_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.hrm_attendance.insert_one(att_dict)
        return {k: v for k, v in att_dict.items() if k != "_id"}

@api_router.post("/hrm/attendance/clock-in")
async def clock_in(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Clock in an employee"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    existing = await db.hrm_attendance.find_one({
        "user_id": current_user["id"],
        "employee_id": employee_id,
        "date": today
    })
    
    if existing:
        await db.hrm_attendance.update_one(
            {"id": existing["id"]},
            {"$set": {"clock_in": now_time, "status": "present"}}
        )
    else:
        att_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "employee_id": employee_id,
            "date": today,
            "clock_in": now_time,
            "status": "present",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.hrm_attendance.insert_one(att_dict)
    
    return {"message": f"Ingeklokt om {now_time}", "time": now_time}

@api_router.post("/hrm/attendance/clock-out")
async def clock_out(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Clock out an employee"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    existing = await db.hrm_attendance.find_one({
        "user_id": current_user["id"],
        "employee_id": employee_id,
        "date": today
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Geen inklok record gevonden voor vandaag")
    
    # Calculate worked hours
    worked_hours = 0
    if existing.get("clock_in"):
        try:
            clock_in = datetime.strptime(existing["clock_in"], "%H:%M")
            clock_out = datetime.strptime(now_time, "%H:%M")
            worked_minutes = (clock_out - clock_in).seconds // 60 - existing.get("break_minutes", 0)
            worked_hours = round(worked_minutes / 60, 2)
        except Exception:
            pass
    
    await db.hrm_attendance.update_one(
        {"id": existing["id"]},
        {"$set": {"clock_out": now_time, "worked_hours": worked_hours}}
    )
    
    return {"message": f"Uitgeklokt om {now_time}", "time": now_time, "worked_hours": worked_hours}

# --- HRM PAYROLL (LOONLIJST) ---

class HRMPayroll(BaseModel):
    employee_id: str
    period: str  # e.g., "2024-01"
    basic_salary: float
    currency: str = "SRD"
    overtime_hours: float = 0
    overtime_rate: float = 1.5
    bonuses: float = 0
    deductions: float = 0
    tax_amount: float = 0
    net_salary: Optional[float] = None
    status: str = "draft"  # draft, approved, paid
    payment_date: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/hrm/payroll")
async def get_hrm_payroll(period: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get payroll records"""
    query = {"user_id": current_user["id"]}
    if period:
        query["period"] = period
    
    records = await db.hrm_payroll.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add employee names
    for record in records:
        employee = await db.hrm_employees.find_one({"id": record.get("employee_id")}, {"name": 1})
        record["employee_name"] = employee.get("name") if employee else "Onbekend"
    
    return records

@api_router.post("/hrm/payroll")
async def create_hrm_payroll(payroll: HRMPayroll, current_user: dict = Depends(get_current_user)):
    """Create a payroll record"""
    payroll_dict = payroll.dict()
    payroll_dict["id"] = str(uuid.uuid4())
    payroll_dict["user_id"] = current_user["id"]
    payroll_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate net salary
    overtime_pay = payroll.overtime_hours * (payroll.basic_salary / 160) * payroll.overtime_rate
    gross_salary = payroll.basic_salary + overtime_pay + payroll.bonuses
    payroll_dict["gross_salary"] = gross_salary
    payroll_dict["net_salary"] = gross_salary - payroll.deductions - payroll.tax_amount
    
    await db.hrm_payroll.insert_one(payroll_dict)
    return {k: v for k, v in payroll_dict.items() if k != "_id"}

@api_router.put("/hrm/payroll/{payroll_id}")
async def update_hrm_payroll(payroll_id: str, payroll: HRMPayroll, current_user: dict = Depends(get_current_user)):
    """Update a payroll record"""
    existing = await db.hrm_payroll.find_one({"id": payroll_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Loonlijst niet gevonden")
    
    payroll_dict = payroll.dict()
    payroll_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate
    overtime_pay = payroll.overtime_hours * (payroll.basic_salary / 160) * payroll.overtime_rate
    gross_salary = payroll.basic_salary + overtime_pay + payroll.bonuses
    payroll_dict["gross_salary"] = gross_salary
    payroll_dict["net_salary"] = gross_salary - payroll.deductions - payroll.tax_amount
    
    await db.hrm_payroll.update_one({"id": payroll_id}, {"$set": payroll_dict})
    return await db.hrm_payroll.find_one({"id": payroll_id}, {"_id": 0})

@api_router.put("/hrm/payroll/{payroll_id}/approve")
async def approve_hrm_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a payroll record"""
    result = await db.hrm_payroll.update_one(
        {"id": payroll_id, "user_id": current_user["id"]},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Loonlijst niet gevonden")
    return await db.hrm_payroll.find_one({"id": payroll_id}, {"_id": 0})

@api_router.put("/hrm/payroll/{payroll_id}/pay")
async def pay_hrm_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    """Mark payroll as paid"""
    result = await db.hrm_payroll.update_one(
        {"id": payroll_id, "user_id": current_user["id"]},
        {"$set": {
            "status": "paid",
            "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Loonlijst niet gevonden")
    return await db.hrm_payroll.find_one({"id": payroll_id}, {"_id": 0})

@api_router.delete("/hrm/payroll/{payroll_id}")
async def delete_hrm_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a payroll record"""
    result = await db.hrm_payroll.delete_one({"id": payroll_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loonlijst niet gevonden")
    return {"message": "Loonlijst verwijderd"}

@api_router.post("/hrm/payroll/generate")
async def generate_payroll(period: str, current_user: dict = Depends(get_current_user)):
    """Generate payroll for all active employees for a period"""
    employees = await db.hrm_employees.find(
        {"user_id": current_user["id"], "status": "active"},
        {"_id": 0}
    ).to_list(500)
    
    created = []
    for emp in employees:
        # Check if payroll already exists
        existing = await db.hrm_payroll.find_one({
            "user_id": current_user["id"],
            "employee_id": emp["id"],
            "period": period
        })
        if existing:
            continue
        
        payroll_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "employee_id": emp["id"],
            "period": period,
            "basic_salary": emp.get("salary", 0),
            "currency": "SRD",
            "overtime_hours": 0,
            "overtime_rate": 1.5,
            "bonuses": 0,
            "deductions": 0,
            "tax_amount": 0,
            "gross_salary": emp.get("salary", 0),
            "net_salary": emp.get("salary", 0),
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.hrm_payroll.insert_one(payroll_dict)
        created.append({k: v for k, v in payroll_dict.items() if k != "_id"})
    
    return {"message": f"{len(created)} loonstroken aangemaakt", "payrolls": created}

# --- HRM SETTINGS ---

class HRMSettings(BaseModel):
    company_name: Optional[str] = None
    default_currency: str = "SRD"
    work_hours_per_day: int = 8
    work_days_per_week: int = 5
    overtime_rate: float = 1.5
    vacation_days_per_year: int = 20
    sick_days_per_year: int = 10
    tax_rate: float = 0.0
    allow_remote_work: bool = True
    require_clock_in: bool = False

@api_router.get("/hrm/settings")
async def get_hrm_settings(current_user: dict = Depends(get_current_user)):
    """Get HRM settings"""
    settings = await db.hrm_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        # Return defaults
        settings = {
            "user_id": current_user["id"],
            "default_currency": "SRD",
            "work_hours_per_day": 8,
            "work_days_per_week": 5,
            "overtime_rate": 1.5,
            "vacation_days_per_year": 20,
            "sick_days_per_year": 10,
            "tax_rate": 0.0,
            "allow_remote_work": True,
            "require_clock_in": False
        }
    return settings

@api_router.put("/hrm/settings")
async def update_hrm_settings(settings: HRMSettings, current_user: dict = Depends(get_current_user)):
    """Update HRM settings"""
    settings_dict = settings.dict()
    settings_dict["user_id"] = current_user["id"]
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hrm_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": settings_dict},
        upsert=True
    )
    
    return await db.hrm_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})

# --- HRM EXTENDED STATS ---

@api_router.get("/hrm/dashboard")
async def get_hrm_dashboard(current_user: dict = Depends(get_current_user)):
    """Get comprehensive HRM dashboard data"""
    user_id = current_user["id"]
    
    # Basic stats
    total_employees = await db.hrm_employees.count_documents({"user_id": user_id})
    active_employees = await db.hrm_employees.count_documents({"user_id": user_id, "status": "active"})
    on_leave = await db.hrm_employees.count_documents({"user_id": user_id, "status": "on_leave"})
    departments = await db.hrm_departments.count_documents({"user_id": user_id})
    
    # Leave requests
    pending_leave = await db.hrm_leave_requests.count_documents({"user_id": user_id, "status": "pending"})
    
    # Vacancies
    open_vacancies = await db.hrm_vacancies.count_documents({"user_id": user_id, "status": "open"})
    total_applications = await db.hrm_applications.count_documents({"user_id": user_id})
    new_applications = await db.hrm_applications.count_documents({"user_id": user_id, "status": "new"})
    
    # Contracts expiring soon (within 30 days)
    thirty_days_later = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    expiring_contracts = await db.hrm_contracts.count_documents({
        "user_id": user_id,
        "end_date": {"$lte": thirty_days_later, "$gte": datetime.now(timezone.utc).isoformat()}
    })
    
    # Salary statistics
    salary_pipeline = [
        {"$match": {"user_id": user_id, "status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$salary"}, "avg": {"$avg": "$salary"}}}
    ]
    salary_result = await db.hrm_employees.aggregate(salary_pipeline).to_list(1)
    total_salary = salary_result[0]["total"] if salary_result else 0
    avg_salary = salary_result[0]["avg"] if salary_result else 0
    
    # Today's attendance
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    present_today = await db.hrm_attendance.count_documents({"user_id": user_id, "date": today, "status": "present"})
    
    # Department breakdown
    dept_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    dept_breakdown = await db.hrm_employees.aggregate(dept_pipeline).to_list(50)
    
    # Recent payroll
    current_period = datetime.now(timezone.utc).strftime("%Y-%m")
    payroll_this_month = await db.hrm_payroll.count_documents({"user_id": user_id, "period": current_period})
    paid_this_month = await db.hrm_payroll.count_documents({"user_id": user_id, "period": current_period, "status": "paid"})
    
    return {
        "employees": {
            "total": total_employees,
            "active": active_employees,
            "on_leave": on_leave,
            "present_today": present_today
        },
        "departments": departments,
        "leave": {
            "pending_requests": pending_leave
        },
        "recruitment": {
            "open_vacancies": open_vacancies,
            "total_applications": total_applications,
            "new_applications": new_applications
        },
        "contracts": {
            "expiring_soon": expiring_contracts
        },
        "salary": {
            "total_monthly": total_salary,
            "average": round(avg_salary, 2)
        },
        "payroll": {
            "this_month": payroll_this_month,
            "paid": paid_this_month
        },
        "department_breakdown": [{"name": d["_id"] or "Geen", "count": d["count"]} for d in dept_breakdown]
    }

# ============================================
# AI CHAT ASSISTANT
# ============================================

class AIChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class AIActionResult(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# AI System functions to execute commands
async def ai_get_dashboard_stats(user_id: str):
    """Get dashboard statistics"""
    tenants = await db.tenants.count_documents({"user_id": user_id})
    apartments = await db.apartments.count_documents({"user_id": user_id})
    
    # Get payments this month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    payments_pipeline = [
        {"$match": {"user_id": user_id, "created_at": {"$gte": start_of_month.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    payments_result = await db.payments.aggregate(payments_pipeline).to_list(1)
    monthly_income = payments_result[0]["total"] if payments_result else 0
    
    # Outstanding balance
    # This is simplified - actual implementation would calculate from payments
    
    return {
        "total_tenants": tenants,
        "total_apartments": apartments,
        "monthly_income": monthly_income,
        "currency": "SRD"
    }

async def ai_list_tenants(user_id: str):
    """List all tenants"""
    tenants = await db.tenants.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return tenants

async def ai_create_tenant(user_id: str, name: str, phone: str, email: str = None, address: str = None, id_number: str = None):
    """Create a new tenant with validation"""
    # Validate required fields
    if not name or not isinstance(name, str) or len(name.strip()) < 2:
        return {"error": "Naam is verplicht en moet minimaal 2 tekens zijn"}
    if not phone or not isinstance(phone, str) or len(phone.strip()) < 5:
        return {"error": "Telefoonnummer is verplicht en moet minimaal 5 tekens zijn"}
    
    tenant = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name.strip(),
        "phone": phone.strip(),
        "email": email.strip() if email else None,
        "address": address.strip() if address else None,
        "id_number": id_number.strip() if id_number else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(tenant)
    return {"success": True, "tenant_id": tenant["id"], "name": name}

async def ai_list_apartments(user_id: str):
    """List all apartments"""
    apartments = await db.apartments.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return apartments

async def ai_create_apartment(user_id: str, name: str, address: str, rent_amount: float, description: str = None):
    """Create a new apartment with validation"""
    # Validate required fields
    if not name or not isinstance(name, str) or len(name.strip()) < 2:
        return {"error": "Appartement naam is verplicht en moet minimaal 2 tekens zijn"}
    
    try:
        rent = float(rent_amount) if rent_amount else 0
        if rent <= 0:
            return {"error": "Huurbedrag moet groter zijn dan 0"}
    except (ValueError, TypeError):
        return {"error": "Ongeldig huurbedrag"}
    
    apartment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name.strip(),
        "address": (address or "").strip(),
        "rent_amount": rent,
        "description": (description or "").strip() if description else None,
        "status": "available",
        "tenant_id": None,
        "bedrooms": 1,
        "bathrooms": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.apartments.insert_one(apartment)
    return {"success": True, "apartment_id": apartment["id"], "name": name}

async def ai_get_tenant_balance(user_id: str, tenant_name: str):
    """Get balance for a specific tenant by name"""
    tenant = await db.tenants.find_one({"user_id": user_id, "name": {"$regex": tenant_name, "$options": "i"}})
    if not tenant:
        return {"error": f"Huurder '{tenant_name}' niet gevonden"}
    
    apartment = await db.apartments.find_one({"user_id": user_id, "tenant_id": tenant["id"]})
    if not apartment:
        return {"tenant": tenant["name"], "message": "Geen appartement toegewezen"}
    
    # Calculate balance
    payments = await db.payments.find({
        "user_id": user_id,
        "tenant_id": tenant["id"],
        "payment_type": "rent"
    }).to_list(1000)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    return {
        "tenant": tenant["name"],
        "apartment": apartment["name"],
        "rent_amount": apartment["rent_amount"],
        "total_paid": total_paid
    }

async def ai_register_payment(user_id: str, tenant_name: str, amount: float, payment_type: str = "rent", description: str = None):
    """Register a payment for a tenant with validation"""
    # Validate tenant name
    if not tenant_name or not isinstance(tenant_name, str) or len(tenant_name.strip()) < 2:
        return {"error": "Huurder naam is verplicht"}
    
    # Validate amount
    try:
        payment_amount = float(amount) if amount else 0
        if payment_amount <= 0:
            return {"error": "Betaling bedrag moet groter zijn dan 0"}
    except (ValueError, TypeError):
        return {"error": "Ongeldig betalingsbedrag"}
    
    tenant = await db.tenants.find_one({"user_id": user_id, "name": {"$regex": tenant_name.strip(), "$options": "i"}})
    if not tenant:
        return {"error": f"Huurder '{tenant_name}' niet gevonden"}
    
    apartment = await db.apartments.find_one({"user_id": user_id, "tenant_id": tenant["id"]})
    
    now = datetime.now(timezone.utc)
    payment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tenant_id": tenant["id"],
        "apartment_id": apartment["id"] if apartment else None,
        "amount": payment_amount,
        "payment_type": payment_type or "rent",
        "payment_date": now.strftime("%Y-%m-%d"),
        "period_month": now.month,
        "period_year": now.year,
        "description": (description or f"Betaling van {tenant['name']}").strip(),
        "created_at": now.isoformat()
    }
    await db.payments.insert_one(payment)
    return {"success": True, "payment_id": payment["id"], "amount": payment_amount, "tenant": tenant["name"]}

async def ai_list_payments(user_id: str, limit: int = 10):
    """List recent payments"""
    payments = await db.payments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add tenant names
    for payment in payments:
        tenant = await db.tenants.find_one({"id": payment.get("tenant_id")})
        payment["tenant_name"] = tenant["name"] if tenant else "Onbekend"
    
    return payments

async def ai_list_loans(user_id: str):
    """List all loans"""
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for loan in loans:
        tenant = await db.tenants.find_one({"id": loan.get("tenant_id")})
        loan["tenant_name"] = tenant["name"] if tenant else "Onbekend"
    return loans

async def ai_create_loan(user_id: str, tenant_name: str, amount: float, description: str = None):
    """Create a loan for a tenant with validation"""
    # Validate tenant name
    if not tenant_name or not isinstance(tenant_name, str) or len(tenant_name.strip()) < 2:
        return {"error": "Huurder naam is verplicht"}
    
    # Validate amount
    try:
        loan_amount = float(amount) if amount else 0
        if loan_amount <= 0:
            return {"error": "Lening bedrag moet groter zijn dan 0"}
    except (ValueError, TypeError):
        return {"error": "Ongeldig leningsbedrag"}
    
    tenant = await db.tenants.find_one({"user_id": user_id, "name": {"$regex": tenant_name.strip(), "$options": "i"}})
    if not tenant:
        return {"error": f"Huurder '{tenant_name}' niet gevonden"}
    
    now = datetime.now(timezone.utc)
    loan = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tenant_id": tenant["id"],
        "amount": loan_amount,
        "remaining_amount": loan_amount,
        "description": (description or f"Lening aan {tenant['name']}").strip(),
        "status": "open",
        "loan_date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat()
    }
    await db.loans.insert_one(loan)
    return {"success": True, "loan_id": loan["id"], "amount": loan_amount, "tenant": tenant["name"]}

async def ai_get_kasgeld(user_id: str):
    """Get kasgeld (petty cash) balance"""
    kasgeld = await db.kasgeld.find_one({"user_id": user_id})
    if not kasgeld:
        return {"balance": 0, "transactions": []}
    
    transactions = await db.kasgeld_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {"balance": kasgeld.get("balance", 0), "recent_transactions": transactions}

# Main AI processing function
async def process_ai_command(user_id: str, message: str, session_id: str):
    """Process user message with AI and execute commands for ALL modules"""
    
    # Use the existing function to get active addon slugs
    active_modules = await get_user_active_addons(user_id)
    
    logger.info(f"AI Assistant - User {user_id} has active modules: {active_modules}")
    
    # Build context based on active modules
    context_parts = []
    available_actions = []
    
    # VASTGOED BEHEER MODULE
    if "vastgoed_beheer" in active_modules:
        stats = await ai_get_dashboard_stats(user_id)
        tenants = await ai_list_tenants(user_id)
        apartments = await ai_list_apartments(user_id)
        
        tenant_list = ", ".join([t["name"] for t in tenants[:10]]) if tenants else "Geen huurders"
        apartment_list = ", ".join([f"{a['name']} (SRD {a['rent_amount']})" for a in apartments[:10]]) if apartments else "Geen appartementen"
        
        context_parts.append(f"""
📦 VASTGOED BEHEER MODULE:
- Totaal huurders: {stats['total_tenants']}
- Totaal appartementen: {stats['total_apartments']}
- Maandinkomen: SRD {stats['monthly_income']:,.2f}
- Huurders: {tenant_list}
- Appartementen: {apartment_list}""")
        
        available_actions.extend([
            "HUURDER_TOEVOEGEN: Nieuwe huurder aanmaken (params: name, phone, email, address)",
            "APPARTEMENT_TOEVOEGEN: Nieuw appartement (params: name, address, rent_amount)",
            "BETALING_REGISTREREN: Betaling registreren (params: tenant_name, amount)",
            "SALDO_OPVRAGEN: Saldo bekijken (params: tenant_name)",
            "LENING_AANMAKEN: Lening aanmaken (params: tenant_name, amount)",
            "VASTGOED_OVERZICHT: Overzicht van verhuur data",
            "HUURDER_ZOEKEN: Zoek een huurder (params: search_term)",
            "OPENSTAANDE_BETALINGEN: Toon openstaande betalingen",
            "CONTRACTEN_OVERZICHT: Toon alle contracten"
        ])
    
    # HRM MODULE
    if "hrm" in active_modules:
        employees = await db.hrm_employees.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        departments = await db.hrm_departments.find({"user_id": user_id}, {"_id": 0}).to_list(20)
        leave_requests = await db.hrm_leave_requests.find({"user_id": user_id, "status": "pending"}, {"_id": 0}).to_list(20)
        
        emp_count = len(employees)
        dept_count = len(departments)
        pending_leave = len(leave_requests)
        emp_names = ", ".join([e.get("name", "Onbekend") for e in employees[:8]]) if employees else "Geen werknemers"
        dept_names = ", ".join([d.get("name", "") for d in departments[:5]]) if departments else "Geen afdelingen"
        
        # Calculate total salary
        total_salary = sum([e.get("salary", 0) for e in employees])
        
        context_parts.append(f"""
📦 HRM MODULE:
- Totaal werknemers: {emp_count}
- Afdelingen: {dept_count} ({dept_names})
- Openstaande verlofaanvragen: {pending_leave}
- Totale loonsom: SRD {total_salary:,.2f}/maand
- Werknemers: {emp_names}""")
        
        available_actions.extend([
            "WERKNEMER_TOEVOEGEN: Nieuwe werknemer (params: name, email, department, position, salary)",
            "WERKNEMER_ZOEKEN: Zoek werknemer (params: search_term)",
            "VERLOF_GOEDKEUREN: Verlofaanvraag goedkeuren (params: employee_name)",
            "VERLOF_AFWIJZEN: Verlofaanvraag afwijzen (params: employee_name, reason)",
            "HRM_OVERZICHT: Overzicht van personeel en verlof",
            "AFDELING_TOEVOEGEN: Nieuwe afdeling (params: name, description)",
            "AANWEZIGHEID_OVERZICHT: Toon aanwezigheid van vandaag",
            "SALARIS_OVERZICHT: Toon salaris overzicht",
            "VERLOF_OVERZICHT: Toon alle verlofaanvragen"
        ])
    
    # AUTO DEALER MODULE
    if "autodealer" in active_modules:
        vehicles = await db.autodealer_vehicles.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        customers = await db.autodealer_customers.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        sales = await db.autodealer_sales.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        
        available_count = len([v for v in vehicles if v.get("status") == "beschikbaar"])
        total_vehicles = len(vehicles)
        customer_count = len(customers)
        sales_count = len(sales)
        
        # Calculate total sales value
        total_sales_value = sum([s.get("price", 0) for s in sales])
        
        vehicle_list = ", ".join([f"{v.get('brand', '')} {v.get('model', '')}" for v in vehicles[:5]]) if vehicles else "Geen voertuigen"
        
        context_parts.append(f"""
📦 AUTO DEALER MODULE:
- Totaal voertuigen: {total_vehicles} ({available_count} beschikbaar)
- Klanten: {customer_count}
- Verkopen: {sales_count} (totaal SRD {total_sales_value:,.2f})
- Voertuigen: {vehicle_list}""")
        
        available_actions.extend([
            "VOERTUIG_TOEVOEGEN: Nieuw voertuig (params: brand, model, year, price_srd, license_plate)",
            "VOERTUIG_ZOEKEN: Zoek voertuig (params: search_term)",
            "KLANT_TOEVOEGEN: Nieuwe klant (params: name, phone, email, type)",
            "VERKOOP_REGISTREREN: Verkoop registreren (params: vehicle, customer_name, price)",
            "AUTODEALER_OVERZICHT: Overzicht van voertuigen en verkopen",
            "BESCHIKBARE_VOERTUIGEN: Toon beschikbare voertuigen",
            "VERKOPEN_OVERZICHT: Toon recente verkopen"
        ])
    
    # BEAUTY & SPA MODULE
    if "beauty" in active_modules or "beautyspa" in active_modules:
        appointments = await db.spa_appointments.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        services = await db.spa_services.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        spa_customers = await db.spa_customers.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        
        today = datetime.now().strftime("%Y-%m-%d")
        today_appointments = len([a for a in appointments if a.get("date", "").startswith(today)])
        pending_appointments = len([a for a in appointments if a.get("status") == "pending"])
        
        context_parts.append(f"""
📦 BEAUTY & SPA MODULE:
- Totaal afspraken: {len(appointments)} ({today_appointments} vandaag)
- Behandelingen: {len(services)}
- Klanten: {len(spa_customers)}
- Openstaande afspraken: {pending_appointments}""")
        
        available_actions.extend([
            "SPA_AFSPRAAK_MAKEN: Nieuwe afspraak (params: customer_name, service, date, time)",
            "SPA_DIENST_TOEVOEGEN: Nieuwe behandeling (params: name, price, duration)",
            "SPA_KLANT_TOEVOEGEN: Nieuwe klant (params: name, phone, email)",
            "SPA_OVERZICHT: Overzicht van afspraken en diensten",
            "VANDAAG_AFSPRAKEN: Toon afspraken van vandaag"
        ])
    
    # POMPSTATION MODULE
    if "pompstation" in active_modules:
        fuel_sales = await db.fuel_sales.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        fuel_inventory = await db.fuel_inventory.find({"user_id": user_id}, {"_id": 0}).to_list(10)
        
        today = datetime.now().strftime("%Y-%m-%d")
        today_sales = [s for s in fuel_sales if s.get("date", "").startswith(today)]
        today_revenue = sum([s.get("total", 0) for s in today_sales])
        
        context_parts.append(f"""
📦 POMPSTATION MODULE:
- Verkopen vandaag: {len(today_sales)} (SRD {today_revenue:,.2f})
- Brandstof types in voorraad: {len(fuel_inventory)}""")
        
        available_actions.extend([
            "BRANDSTOF_VERKOOP: Registreer verkoop (params: fuel_type, liters, price_per_liter)",
            "POMPSTATION_OVERZICHT: Overzicht van verkopen",
            "VOORRAAD_OVERZICHT: Toon brandstof voorraad"
        ])
    
    # If no modules active
    if not active_modules:
        return {
            "response": "⚠️ U heeft nog geen modules geactiveerd. Ga naar **Instellingen > Abonnement** om modules te activeren zoals Vastgoed Beheer, HRM, Auto Dealer, Beauty & Spa, of Pompstation.",
            "action_executed": False,
            "action_result": None
        }
    
    # Build system prompt
    context_text = "\n".join(context_parts) if context_parts else "Geen module data beschikbaar"
    actions_text = "\n".join([f"- {a}" for a in available_actions]) if available_actions else "Geen acties beschikbaar"
    
    # Get active module names for clarity
    module_names = []
    if "vastgoed_beheer" in active_modules:
        module_names.append("Vastgoed Beheer")
    if "hrm" in active_modules:
        module_names.append("HRM")
    if "autodealer" in active_modules:
        module_names.append("Auto Dealer")
    if "beauty" in active_modules or "beautyspa" in active_modules:
        module_names.append("Beauty & Spa")
    if "pompstation" in active_modules:
        module_names.append("Pompstation")
    
    active_module_list = ", ".join(module_names) if module_names else "Geen"
    
    system_prompt = f"""Je bent de slimme AI assistent van Facturatie N.V., een compleet ERP systeem voor Surinaamse bedrijven.
Je helpt de gebruiker met het beheren van hun bedrijf via hun actieve modules.

BELANGRIJKE INSTRUCTIES:
1. Je hebt ALLEEN toegang tot de hieronder genoemde ACTIEVE MODULES
2. Praat NIET over modules die de gebruiker NIET heeft geactiveerd
3. Als de gebruiker vraagt over een module die niet actief is, verwijs naar Instellingen > Abonnement
4. Wees vriendelijk, professioneel en behulpzaam
5. Gebruik SRD (Surinaamse Dollar) als valuta
6. Geef beknopte maar informatieve antwoorden

ACTIEVE MODULES VAN DEZE GEBRUIKER: {active_module_list}

HUIDIGE DATA EN STATISTIEKEN:
{context_text}

BESCHIKBARE ACTIES DIE JE KUNT UITVOEREN:
{actions_text}

WANNEER DE GEBRUIKER EEN ACTIE WIL UITVOEREN, GEEF DAN EEN JSON RESPONSE:
{{"action": "ACTIE_NAAM", "params": {{"param1": "waarde1", "param2": "waarde2"}}}}

VOORBEELDEN VAN COMMANDO'S:
- "Voeg werknemer Jan toe" -> {{"action": "WERKNEMER_TOEVOEGEN", "params": {{"name": "Jan", "department": "Algemeen"}}}}
- "Voeg auto BMW X5 toe" -> {{"action": "VOERTUIG_TOEVOEGEN", "params": {{"brand": "BMW", "model": "X5"}}}}
- "Registreer betaling 5000 voor Maria" -> {{"action": "BETALING_REGISTREREN", "params": {{"tenant_name": "Maria", "amount": 5000}}}}
- "Hoeveel werknemers heb ik?" -> Normale tekst response met de data
- "Toon beschikbare voertuigen" -> {{"action": "BESCHIKBARE_VOERTUIGEN", "params": {{}}}}

Als de gebruiker alleen informatie vraagt of een vraag stelt, antwoord normaal in tekst ZONDER JSON.
Als de gebruiker een actie wil uitvoeren, geef dan de JSON response met de juiste actie en parameters.

ONTHOUD: Je kunt ALLEEN helpen met de actieve modules van deze gebruiker ({active_module_list}).
Als gevraagd wordt over andere modules, leg uit dat deze eerst geactiveerd moeten worden."""

    # Initialize AI chat
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=session_id,
        system_message=system_prompt
    ).with_model("openai", "gpt-4o")
    
    # Send message to AI
    user_msg = UserMessage(text=message)
    ai_response = await chat.send_message(user_msg)
    
    # Check if response contains an action
    action_result = None
    final_response = ai_response
    
    try:
        # Try to parse JSON action from response
        if "{" in ai_response and "}" in ai_response:
            start = ai_response.find("{")
            end = ai_response.rfind("}") + 1
            json_str = ai_response[start:end]
            action_data = json.loads(json_str)
            
            if "action" in action_data:
                action = action_data["action"]
                params = action_data.get("params", {})
                
                # VASTGOED BEHEER ACTIONS
                if action == "HUURDER_TOEVOEGEN":
                    result = await ai_create_tenant(user_id, params.get("name"), params.get("phone"), params.get("email"), params.get("address"), params.get("id_number"))
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                    else:
                        action_result = result
                        final_response = f"✅ Huurder '{params.get('name')}' is succesvol toegevoegd!"
                        
                elif action == "APPARTEMENT_TOEVOEGEN":
                    rent = float(params.get("rent_amount", 0)) if params.get("rent_amount") else 0
                    result = await ai_create_apartment(user_id, params.get("name"), params.get("address", ""), rent, params.get("description"))
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                    else:
                        action_result = result
                        final_response = f"✅ Appartement '{params.get('name')}' is succesvol toegevoegd!"
                        
                elif action == "BETALING_REGISTREREN":
                    amount = float(params.get("amount", 0)) if params.get("amount") else 0
                    result = await ai_register_payment(user_id, params.get("tenant_name"), amount, params.get("payment_type", "rent"), params.get("description"))
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                    else:
                        action_result = result
                        final_response = f"✅ Betaling van SRD {amount:,.2f} voor {params.get('tenant_name')} is geregistreerd!"
                        
                elif action == "SALDO_OPVRAGEN":
                    result = await ai_get_tenant_balance(user_id, params.get("tenant_name"))
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                    else:
                        action_result = result
                        if "message" in result:
                            final_response = f"📊 **{result['tenant']}**: {result['message']}"
                        else:
                            final_response = f"📊 **Saldo {result['tenant']}**\n- Appartement: {result['apartment']}\n- Huur: SRD {result['rent_amount']:,.2f}\n- Totaal betaald: SRD {result['total_paid']:,.2f}"
                            
                elif action == "LENING_AANMAKEN":
                    amount = float(params.get("amount", 0)) if params.get("amount") else 0
                    result = await ai_create_loan(user_id, params.get("tenant_name"), amount, params.get("description"))
                    if "error" in result:
                        final_response = f"❌ {result['error']}"
                    else:
                        action_result = result
                        final_response = f"✅ Lening van SRD {amount:,.2f} voor {params.get('tenant_name')} is aangemaakt!"
                
                elif action == "VASTGOED_OVERZICHT":
                    stats = await ai_get_dashboard_stats(user_id)
                    tenants = await ai_list_tenants(user_id)
                    tenant_list = ", ".join([t["name"] for t in tenants[:10]]) if tenants else "Geen"
                    final_response = f"""📊 **Vastgoed Overzicht**
👥 Huurders: {stats['total_tenants']}
🏠 Appartementen: {stats['total_apartments']}
💰 Maandinkomen: SRD {stats['monthly_income']:,.2f}
📋 Huurders: {tenant_list}"""
                    action_result = {"overview": True}
                
                # HRM ACTIONS
                elif action == "WERKNEMER_TOEVOEGEN":
                    now = datetime.now(timezone.utc)
                    employee = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "name": params.get("name", "Nieuwe Werknemer"),
                        "email": params.get("email", ""),
                        "department": params.get("department", "Algemeen"),
                        "position": params.get("position", "Medewerker"),
                        "salary": float(params.get("salary", 0)) if params.get("salary") else 0,
                        "status": "active",
                        "hire_date": now.strftime("%Y-%m-%d"),
                        "created_at": now.isoformat()
                    }
                    await db.hrm_employees.insert_one(employee)
                    action_result = {"employee_id": employee["id"]}
                    final_response = f"✅ Werknemer '{params.get('name')}' is toegevoegd aan afdeling {params.get('department', 'Algemeen')}!"
                    
                elif action == "VERLOF_GOEDKEUREN":
                    emp_name = params.get("employee_name", "")
                    leave = await db.hrm_leave_requests.find_one({"user_id": user_id, "employee_name": {"$regex": emp_name, "$options": "i"}, "status": "pending"})
                    if leave:
                        await db.hrm_leave_requests.update_one({"id": leave["id"]}, {"$set": {"status": "approved"}})
                        action_result = {"approved": True}
                        final_response = f"✅ Verlofaanvraag van {emp_name} is goedgekeurd!"
                    else:
                        final_response = f"❌ Geen openstaande verlofaanvraag gevonden voor {emp_name}"
                        
                elif action == "HRM_OVERZICHT":
                    employees = await db.hrm_employees.find({"user_id": user_id}, {"_id": 0}).to_list(20)
                    leave_pending = await db.hrm_leave_requests.count_documents({"user_id": user_id, "status": "pending"})
                    final_response = f"""📊 **HRM Overzicht**
👥 Werknemers: {len(employees)}
📝 Openstaande verlofaanvragen: {leave_pending}"""
                    action_result = {"overview": True}
                
                # AUTO DEALER ACTIONS
                elif action == "VOERTUIG_TOEVOEGEN":
                    now = datetime.now(timezone.utc)
                    vehicle = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "brand": params.get("brand", ""),
                        "model": params.get("model", ""),
                        "year": int(params.get("year", 2024)) if params.get("year") else 2024,
                        "price_srd": float(params.get("price_srd", 0)) if params.get("price_srd") else 0,
                        "license_plate": params.get("license_plate", ""),
                        "status": "beschikbaar",
                        "created_at": now.isoformat()
                    }
                    await db.autodealer_vehicles.insert_one(vehicle)
                    action_result = {"vehicle_id": vehicle["id"]}
                    final_response = f"✅ Voertuig {params.get('brand')} {params.get('model')} is toegevoegd!"
                    
                elif action == "KLANT_TOEVOEGEN":
                    now = datetime.now(timezone.utc)
                    customer = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "name": params.get("name", ""),
                        "phone": params.get("phone", ""),
                        "email": params.get("email", ""),
                        "customer_type": params.get("type", "particulier"),
                        "created_at": now.isoformat()
                    }
                    await db.autodealer_customers.insert_one(customer)
                    action_result = {"customer_id": customer["id"]}
                    final_response = f"✅ Klant '{params.get('name')}' is toegevoegd!"
                    
                elif action == "AUTODEALER_OVERZICHT":
                    vehicles = await db.autodealer_vehicles.find({"user_id": user_id}, {"_id": 0}).to_list(20)
                    available = len([v for v in vehicles if v.get("status") == "beschikbaar"])
                    sales = await db.autodealer_sales.count_documents({"user_id": user_id})
                    final_response = f"""📊 **Auto Dealer Overzicht**
🚗 Voertuigen: {len(vehicles)} ({available} beschikbaar)
💰 Verkopen: {sales}"""
                    action_result = {"overview": True}
                
                elif action == "BESCHIKBARE_VOERTUIGEN":
                    vehicles = await db.autodealer_vehicles.find({"user_id": user_id, "status": "beschikbaar"}, {"_id": 0}).to_list(20)
                    if vehicles:
                        vehicle_list = "\n".join([f"• {v.get('brand', '')} {v.get('model', '')} ({v.get('year', '')}) - SRD {v.get('price_srd', 0):,.0f}" for v in vehicles[:10]])
                        final_response = f"🚗 **Beschikbare Voertuigen ({len(vehicles)})**\n\n{vehicle_list}"
                    else:
                        final_response = "Geen beschikbare voertuigen gevonden."
                    action_result = {"vehicles": len(vehicles)}
                
                # ADDITIONAL HRM ACTIONS
                elif action == "WERKNEMER_ZOEKEN":
                    search = params.get("search_term", "")
                    employees = await db.hrm_employees.find({
                        "user_id": user_id,
                        "name": {"$regex": search, "$options": "i"}
                    }, {"_id": 0}).to_list(10)
                    if employees:
                        emp_list = "\n".join([f"• {e.get('name', '')} - {e.get('position', '')} ({e.get('department', '')})" for e in employees])
                        final_response = f"👥 **Gevonden werknemers ({len(employees)})**\n\n{emp_list}"
                    else:
                        final_response = f"Geen werknemers gevonden met '{search}'"
                    action_result = {"found": len(employees)}
                
                elif action == "SALARIS_OVERZICHT":
                    employees = await db.hrm_employees.find({"user_id": user_id}, {"_id": 0}).to_list(50)
                    total = sum([e.get("salary", 0) for e in employees])
                    emp_list = "\n".join([f"• {e.get('name', '')}: SRD {e.get('salary', 0):,.0f}" for e in employees[:10]])
                    final_response = f"💰 **Salaris Overzicht**\n\nTotale loonsom: **SRD {total:,.0f}/maand**\n\n{emp_list}"
                    action_result = {"total_salary": total}
                
                elif action == "VERLOF_OVERZICHT":
                    leave_requests = await db.hrm_leave_requests.find({"user_id": user_id}, {"_id": 0}).to_list(20)
                    pending = [lr for lr in leave_requests if lr.get("status") == "pending"]
                    if pending:
                        leave_list = "\n".join([f"• {lr.get('employee_name', '')}: {lr.get('start_date', '')} - {lr.get('end_date', '')} ({lr.get('leave_type', '')})" for lr in pending[:10]])
                        final_response = f"📝 **Openstaande Verlofaanvragen ({len(pending)})**\n\n{leave_list}"
                    else:
                        final_response = "Geen openstaande verlofaanvragen."
                    action_result = {"pending": len(pending)}
                
                # ADDITIONAL VASTGOED ACTIONS
                elif action == "HUURDER_ZOEKEN":
                    search = params.get("search_term", "")
                    tenants = await db.tenants.find({
                        "user_id": user_id,
                        "name": {"$regex": search, "$options": "i"}
                    }, {"_id": 0}).to_list(10)
                    if tenants:
                        tenant_list = "\n".join([f"• {t.get('name', '')} - {t.get('phone', '')}" for t in tenants])
                        final_response = f"👥 **Gevonden huurders ({len(tenants)})**\n\n{tenant_list}"
                    else:
                        final_response = f"Geen huurders gevonden met '{search}'"
                    action_result = {"found": len(tenants)}
                
                elif action == "OPENSTAANDE_BETALINGEN":
                    # Get tenants with outstanding balances
                    tenants = await db.tenants.find({"user_id": user_id}, {"_id": 0}).to_list(50)
                    outstanding = []
                    for t in tenants:
                        payments = await db.payments.find({"user_id": user_id, "tenant_id": t["id"]}, {"_id": 0}).to_list(100)
                        total_paid = sum([p.get("amount", 0) for p in payments])
                        # Simple outstanding calculation
                        if total_paid < 1000:  # Placeholder logic
                            outstanding.append(t)
                    if outstanding:
                        out_list = "\n".join([f"• {t.get('name', '')}" for t in outstanding[:10]])
                        final_response = f"⚠️ **Huurders met openstaande betalingen ({len(outstanding)})**\n\n{out_list}"
                    else:
                        final_response = "Alle huurders zijn bij met hun betalingen! ✅"
                    action_result = {"outstanding": len(outstanding)}
                
                # BEAUTY & SPA ACTIONS
                elif action == "SPA_OVERZICHT":
                    appointments = await db.spa_appointments.count_documents({"user_id": user_id})
                    services = await db.spa_services.count_documents({"user_id": user_id})
                    customers = await db.spa_customers.count_documents({"user_id": user_id})
                    final_response = f"""💅 **Beauty & Spa Overzicht**
📅 Totaal afspraken: {appointments}
✂️ Behandelingen: {services}
👥 Klanten: {customers}"""
                    action_result = {"overview": True}
                
                elif action == "VANDAAG_AFSPRAKEN":
                    today = datetime.now().strftime("%Y-%m-%d")
                    appointments = await db.spa_appointments.find({
                        "user_id": user_id,
                        "date": {"$regex": f"^{today}"}
                    }, {"_id": 0}).to_list(20)
                    if appointments:
                        app_list = "\n".join([f"• {a.get('time', '')} - {a.get('customer_name', '')} ({a.get('service', '')})" for a in appointments])
                        final_response = f"📅 **Afspraken Vandaag ({len(appointments)})**\n\n{app_list}"
                    else:
                        final_response = "Geen afspraken gepland voor vandaag."
                    action_result = {"appointments": len(appointments)}
                
                # POMPSTATION ACTIONS
                elif action == "POMPSTATION_OVERZICHT":
                    today = datetime.now().strftime("%Y-%m-%d")
                    sales = await db.fuel_sales.find({"user_id": user_id}, {"_id": 0}).to_list(100)
                    today_sales = [s for s in sales if s.get("date", "").startswith(today)]
                    today_revenue = sum([s.get("total", 0) for s in today_sales])
                    total_revenue = sum([s.get("total", 0) for s in sales])
                    final_response = f"""⛽ **Pompstation Overzicht**
📅 Verkopen vandaag: {len(today_sales)} (SRD {today_revenue:,.0f})
💰 Totale omzet: SRD {total_revenue:,.0f}"""
                    action_result = {"overview": True}
                    
    except json.JSONDecodeError:
        pass
    except Exception as e:
        logger.error(f"AI action error: {e}")
    
    return {
        "response": final_response,
        "action_executed": action_result is not None,
        "action_result": action_result
    }

@api_router.post("/ai/chat")
async def ai_chat(message_data: AIChatMessage, current_user: dict = Depends(get_current_user)):
    """AI Chat endpoint - processes user messages and executes commands"""
    try:
        session_id = message_data.session_id or f"chat_{current_user['id']}_{datetime.now().strftime('%Y%m%d')}"
        
        result = await process_ai_command(
            current_user["id"],
            message_data.message,
            session_id
        )
        
        # Store chat message in database
        await db.ai_chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "session_id": session_id,
            "user_message": message_data.message,
            "ai_response": result["response"],
            "action_executed": result["action_executed"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI fout: {str(e)}")

# ==================== PUBLIC CHATBOT FOR WEBSITE ====================

class PublicChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

@api_router.post("/public/chat")
async def public_chat(chat_data: PublicChatMessage):
    """Public chatbot for website visitors - answers questions about services"""
    
    session_id = chat_data.session_id or str(uuid.uuid4())
    message = chat_data.message
    
    # Get all available addons for context
    addons = await db.addons.find({}, {"_id": 0}).to_list(50)
    addon_info = "\n".join([f"- {a.get('name')}: SRD {a.get('price', 0):,.0f}/maand - {a.get('description', '')}" for a in addons])
    
    system_prompt = f"""Je bent de virtuele assistent van Facturatie.sr, het toonaangevende Surinaamse platform voor digitale facturatie en bedrijfsadministratie.

OVER FACTURATIE.SR:
- Wij bieden een volledig geïntegreerd ERP- en HRM-systeem
- Speciaal ontwikkeld voor Surinaamse bedrijven
- Alle prijzen zijn in SRD (Surinaamse Dollar)
- SSL-encryptie voor veilige gegevensopslag
- 24/7 ondersteuning beschikbaar
- Meer dan 500 tevreden klanten

BESCHIKBARE MODULES EN PRIJZEN:
{addon_info}

KERNFUNCTIES:
- Boekhouding: Facturatie, inkomsten/uitgaven, belastingaangifte
- HRM: Personeelsbeheer, salarissen, verlof, contracten
- CRM/Leads: Klantbeheer, sales pipeline, leadopvolging
- Projecten: Taakbeheer, mijlpalen, tijdregistratie
- POS: Point of Sale, voorraad, kassasysteem
- Verhuur Beheer: Huurders, appartementen, betalingen
- Beauty & Spa: Afspraken, behandelingen, klantgegevens
- AutoDealer: Voorraadbeheer, verkoop, aftersales
- Hotel Management: Kamers, boekingen, check-in/out

CONTACT:
- Telefoon: +597 893-4982
- Website: facturatie.sr

INSTRUCTIES:
1. Beantwoord vragen vriendelijk en professioneel in het Nederlands
2. Geef concrete prijsinformatie wanneer gevraagd
3. Leg uit welke modules het beste passen bij de vraag van de klant
4. Moedig bezoekers aan om een gratis account aan te maken
5. Verwijs naar de prijzenpagina (/prijzen) voor details
6. Wees behulpzaam en probeer de klant te helpen met hun specifieke situatie"""

    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY")
        if not llm_key:
            raise HTTPException(status_code=500, detail="Chat service niet beschikbaar")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"public_{session_id}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        user_msg = UserMessage(text=message)
        ai_response = await chat.send_message(user_msg)
        
        # Store chat in database for analytics
        await db.public_chats.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_message": message,
            "ai_response": ai_response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "response": ai_response,
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Public chat error: {e}")
        return {
            "response": "Sorry, er is een fout opgetreden. Neem contact op via +597 893-4982 of probeer het later opnieuw.",
            "session_id": session_id
        }

# ==================== TENANT PORTAL ROUTES ====================

@api_router.post("/tenant-portal/register")
async def tenant_portal_register(data: TenantRegister):
    """Register a tenant account linked to their tenant record"""
    # Check if tenant exists with this email
    tenant = await db.tenants.find_one({"email": data.email}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Geen huurder gevonden met dit e-mailadres. Neem contact op met uw verhuurder.")
    
    # Check if already has a portal account
    existing_account = await db.tenant_accounts.find_one({"email": data.email}, {"_id": 0})
    if existing_account:
        raise HTTPException(status_code=400, detail="Er bestaat al een account met dit e-mailadres")
    
    # Create tenant portal account
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    account_doc = {
        "id": account_id,
        "tenant_id": tenant["id"],
        "email": data.email,
        "password": hash_password(data.password),
        "name": tenant["name"],
        "landlord_user_id": tenant["user_id"],  # Link to landlord
        "created_at": now.isoformat(),
        "last_login": None,
        "is_active": True
    }
    
    await db.tenant_accounts.insert_one(account_doc)
    
    # Generate token
    token = create_token(account_id, data.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant": {
            "id": account_id,
            "tenant_id": tenant["id"],
            "email": data.email,
            "name": tenant["name"]
        }
    }


@api_router.post("/tenant-portal/login")
async def tenant_portal_login(data: TenantLogin):
    """Login for tenant portal"""
    account = await db.tenant_accounts.find_one({"email": data.email}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not verify_password(data.password, account["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not account.get("is_active", True):
        raise HTTPException(status_code=403, detail="Uw account is gedeactiveerd")
    
    # Update last login
    await db.tenant_accounts.update_one(
        {"id": account["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(account["id"], data.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant": {
            "id": account["id"],
            "tenant_id": account["tenant_id"],
            "email": account["email"],
            "name": account["name"]
        }
    }


async def get_tenant_account(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current tenant account from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ongeldige token")
        
        account = await db.tenant_accounts.find_one({"id": user_id}, {"_id": 0})
        if not account:
            raise HTTPException(status_code=401, detail="Huurder account niet gevonden")
        if not account.get("is_active", True):
            raise HTTPException(status_code=403, detail="Uw account is gedeactiveerd")
        return account
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token is verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")


@api_router.get("/tenant-portal/me")
async def tenant_portal_me(account: dict = Depends(get_tenant_account)):
    """Get current tenant account info"""
    return {
        "id": account["id"],
        "tenant_id": account["tenant_id"],
        "email": account["email"],
        "name": account["name"],
        "created_at": account["created_at"]
    }


@api_router.get("/tenant-portal/dashboard")
async def tenant_portal_dashboard(account: dict = Depends(get_tenant_account)):
    """Get tenant dashboard with all relevant information"""
    tenant_id = account["tenant_id"]
    landlord_id = account["landlord_user_id"]
    
    # Get tenant info
    tenant = await db.tenants.find_one(
        {"id": tenant_id},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    # Get apartment info
    apartment = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": landlord_id},
        {"_id": 0}
    )
    
    # Get payments for this tenant
    payments = await db.payments.find(
        {"tenant_id": tenant_id, "user_id": landlord_id},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(100)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    # Calculate outstanding balance
    outstanding_balance = 0
    if apartment:
        # Get all months since tenant moved in
        # For now, simple calculation based on rent - payments
        rent = apartment.get("rent_amount", 0)
        # Count months tenant has been renting (simplified)
        outstanding_balance = max(0, rent - total_paid % rent) if rent > 0 else 0
    
    # Get open invoices
    invoices = await db.invoices.find(
        {"tenant_id": tenant_id, "user_id": landlord_id, "status": {"$ne": "paid"}},
        {"_id": 0}
    ).to_list(50)
    
    # Get meter readings for this apartment
    last_meter_reading = None
    pending_meter_reading = True
    
    if apartment:
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year
        
        # Check if reading exists for current month
        current_reading = await db.meter_readings.find_one(
            {
                "apartment_id": apartment["id"],
                "user_id": landlord_id,
                "period_month": current_month,
                "period_year": current_year
            },
            {"_id": 0}
        )
        pending_meter_reading = current_reading is None
        
        # Get last meter reading
        last_reading = await db.meter_readings.find_one(
            {"apartment_id": apartment["id"], "user_id": landlord_id},
            {"_id": 0},
            sort=[("period_year", -1), ("period_month", -1)]
        )
        if last_reading:
            last_meter_reading = {
                "id": last_reading.get("id"),
                "period": f"{last_reading.get('period_month')}/{last_reading.get('period_year')}",
                "ebs_reading": last_reading.get("ebs_reading"),
                "swm_reading": last_reading.get("swm_reading"),
                "total_cost": last_reading.get("total_cost"),
                "payment_status": last_reading.get("payment_status")
            }
    
    return TenantPortalDashboard(
        tenant_id=tenant_id,
        tenant_name=tenant.get("name", ""),
        apartment_id=apartment.get("id") if apartment else None,
        apartment_name=apartment.get("name") if apartment else None,
        apartment_address=apartment.get("address") if apartment else None,
        rent_amount=apartment.get("rent_amount") if apartment else None,
        total_paid=total_paid,
        total_due=apartment.get("rent_amount", 0) if apartment else 0,
        outstanding_balance=outstanding_balance,
        recent_payments=[{
            "id": p.get("id"),
            "amount": p.get("amount"),
            "date": p.get("payment_date"),
            "description": p.get("description", "Huurbetaling")
        } for p in payments[:5]],
        pending_meter_reading=pending_meter_reading,
        last_meter_reading=last_meter_reading,
        open_invoices=[{
            "id": inv.get("id"),
            "invoice_number": inv.get("invoice_number"),
            "amount": inv.get("total_amount"),
            "due_date": inv.get("due_date"),
            "status": inv.get("status")
        } for inv in invoices[:5]]
    )


@api_router.get("/tenant-portal/payments")
async def tenant_portal_payments(account: dict = Depends(get_tenant_account)):
    """Get all payments for the tenant"""
    tenant_id = account["tenant_id"]
    landlord_id = account["landlord_user_id"]
    
    payments = await db.payments.find(
        {"tenant_id": tenant_id, "user_id": landlord_id},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(200)
    
    return payments


@api_router.get("/tenant-portal/invoices")
async def tenant_portal_invoices(account: dict = Depends(get_tenant_account)):
    """Get all invoices for the tenant"""
    tenant_id = account["tenant_id"]
    landlord_id = account["landlord_user_id"]
    
    invoices = await db.invoices.find(
        {"tenant_id": tenant_id, "user_id": landlord_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return invoices


@api_router.get("/tenant-portal/meter-readings")
async def tenant_portal_meter_readings(account: dict = Depends(get_tenant_account)):
    """Get meter readings for tenant's apartment"""
    tenant_id = account["tenant_id"]
    landlord_id = account["landlord_user_id"]
    
    # Get apartment
    apartment = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": landlord_id},
        {"_id": 0}
    )
    
    if not apartment:
        return []
    
    readings = await db.meter_readings.find(
        {"apartment_id": apartment["id"], "user_id": landlord_id},
        {"_id": 0}
    ).sort([("period_year", -1), ("period_month", -1)]).to_list(50)
    
    return readings


@api_router.post("/tenant-portal/meter-readings")
async def tenant_portal_submit_meter_reading(
    reading_data: TenantMeterReadingCreate,
    account: dict = Depends(get_tenant_account)
):
    """Submit a meter reading as a tenant"""
    tenant_id = account["tenant_id"]
    landlord_id = account["landlord_user_id"]
    
    # Get apartment
    apartment = await db.apartments.find_one(
        {"tenant_id": tenant_id, "user_id": landlord_id},
        {"_id": 0}
    )
    
    if not apartment:
        raise HTTPException(status_code=404, detail="Geen appartement gevonden")
    
    # Determine reading date and period
    if reading_data.reading_date:
        try:
            reading_dt = datetime.fromisoformat(reading_data.reading_date.replace('Z', '+00:00'))
        except Exception:
            reading_dt = datetime.now(timezone.utc)
    else:
        reading_dt = datetime.now(timezone.utc)
    
    period_month = reading_dt.month
    period_year = reading_dt.year
    
    # Check if reading already exists for this period
    existing = await db.meter_readings.find_one({
        "apartment_id": apartment["id"],
        "user_id": landlord_id,
        "period_month": period_month,
        "period_year": period_year
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Er is al een meterstand ingediend voor {period_month}/{period_year}"
        )
    
    # Get previous reading
    prev_reading = await db.meter_readings.find_one(
        {
            "apartment_id": apartment["id"],
            "user_id": landlord_id,
            "$or": [
                {"period_year": {"$lt": period_year}},
                {"$and": [{"period_year": period_year}, {"period_month": {"$lt": period_month}}]}
            ]
        },
        {"_id": 0},
        sort=[("period_year", -1), ("period_month", -1)]
    )
    
    # Calculate usage and costs
    ebs_previous = prev_reading.get("ebs_reading") if prev_reading else None
    swm_previous = prev_reading.get("swm_reading") if prev_reading else None
    
    ebs_usage = None
    ebs_cost = None
    if reading_data.ebs_reading is not None and ebs_previous is not None:
        ebs_usage = max(0, reading_data.ebs_reading - ebs_previous)
        ebs_cost = calculate_ebs_cost(ebs_usage)
    
    swm_usage = None
    swm_cost = None
    if reading_data.swm_reading is not None and swm_previous is not None:
        swm_usage = max(0, reading_data.swm_reading - swm_previous)
        swm_cost = calculate_swm_cost(swm_usage)
    
    total_cost = (ebs_cost or 0) + (swm_cost or 0)
    
    reading_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    reading_doc = {
        "id": reading_id,
        "apartment_id": apartment["id"],
        "apartment_name": apartment.get("name"),
        "tenant_id": tenant_id,
        "tenant_name": account.get("name"),
        "reading_date": reading_dt.strftime("%Y-%m-%d"),
        "period_month": period_month,
        "period_year": period_year,
        "ebs_reading": reading_data.ebs_reading,
        "ebs_previous": ebs_previous,
        "ebs_usage": ebs_usage,
        "ebs_cost": ebs_cost,
        "swm_reading": reading_data.swm_reading,
        "swm_previous": swm_previous,
        "swm_usage": swm_usage,
        "swm_cost": swm_cost,
        "total_cost": total_cost if total_cost > 0 else None,
        "payment_status": "pending",
        "paid_at": None,
        "notes": reading_data.notes,
        "created_at": now.isoformat(),
        "submitted_by": "tenant",
        "user_id": landlord_id  # Important: belongs to landlord
    }
    
    await db.meter_readings.insert_one(reading_doc)
    reading_doc.pop("_id", None)
    
    return {
        "message": "Meterstand succesvol ingediend!",
        "reading": reading_doc
    }


# ==================== EMPLOYEE PORTAL ====================

class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str

class EmployeeAccountCreate(BaseModel):
    employee_id: str
    email: EmailStr
    name: str
    password: str

@api_router.post("/employee-portal/login")
async def employee_portal_login(credentials: EmployeeLogin):
    """Login for employee portal"""
    account = await db.employee_accounts.find_one({"email": credentials.email}, {"_id": 0})
    
    if not account:
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not verify_password(credentials.password, account["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
    if not account.get("is_active", True):
        raise HTTPException(status_code=403, detail="Uw account is gedeactiveerd")
    
    # Update last login
    await db.employee_accounts.update_one(
        {"id": account["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create JWT token
    token = jwt.encode({
        "user_id": account["id"],
        "employee_id": account["employee_id"],
        "type": "employee_portal",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "employee": {
            "id": account["id"],
            "employee_id": account["employee_id"],
            "email": account["email"],
            "name": account["name"]
        }
    }

async def get_employee_account(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current employee account from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "employee_portal":
            raise HTTPException(status_code=401, detail="Ongeldige token type")
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ongeldige token")
        
        account = await db.employee_accounts.find_one({"id": user_id}, {"_id": 0})
        if not account:
            raise HTTPException(status_code=401, detail="Werknemer account niet gevonden")
        if not account.get("is_active", True):
            raise HTTPException(status_code=403, detail="Uw account is gedeactiveerd")
        return account
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token is verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

@api_router.get("/employee-portal/me")
async def employee_portal_me(account: dict = Depends(get_employee_account)):
    """Get current employee account info"""
    return {
        "id": account["id"],
        "employee_id": account["employee_id"],
        "email": account["email"],
        "name": account["name"],
        "created_at": account.get("created_at")
    }

@api_router.get("/employee-portal/dashboard")
async def employee_portal_dashboard(account: dict = Depends(get_employee_account)):
    """Get employee dashboard with all relevant information"""
    employee_id = account["employee_id"]
    account.get("employer_user_id")
    account.get("workspace_id")
    
    # Get employee info from hrm_employees
    employee = await db.hrm_employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        # Try regular employees collection
        employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    # Get recent salary payments
    salaries = await db.hrm_payroll.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("pay_date", -1).to_list(12)
    
    if not salaries:
        salaries = await db.salaries.find(
            {"employee_id": employee_id},
            {"_id": 0}
        ).sort("payment_date", -1).to_list(12)
    
    # Get leave requests
    leave_requests = await db.hrm_leave_requests.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    # Get attendance records for current month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    attendance = await db.hrm_attendance.find(
        {
            "employee_id": employee_id,
            "date": {"$gte": month_start.strftime("%Y-%m-%d")}
        },
        {"_id": 0}
    ).to_list(31)
    
    # Calculate stats
    total_earned = sum(s.get("net_salary", s.get("amount", 0)) for s in salaries)
    days_worked = len([a for a in attendance if a.get("status") == "present"])
    pending_leave = len([req for req in leave_requests if req.get("status") == "pending"])
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.get("name", account["name"]),
        "department": employee.get("department"),
        "position": employee.get("position", employee.get("function")),
        "hire_date": employee.get("hire_date", employee.get("start_date")),
        "salary": employee.get("salary", employee.get("base_salary")),
        "email": employee.get("email"),
        "phone": employee.get("phone"),
        "stats": {
            "total_earned_ytd": total_earned,
            "days_worked_month": days_worked,
            "pending_leave_requests": pending_leave
        },
        "recent_salaries": [{
            "id": s.get("id"),
            "period": s.get("pay_period", f"{s.get('month')}/{s.get('year')}"),
            "gross": s.get("gross_salary", s.get("amount")),
            "net": s.get("net_salary", s.get("amount")),
            "date": s.get("pay_date", s.get("payment_date")),
            "status": s.get("status", "paid")
        } for s in salaries[:6]],
        "leave_requests": [{
            "id": req.get("id"),
            "type": req.get("leave_type"),
            "start_date": req.get("start_date"),
            "end_date": req.get("end_date"),
            "days": req.get("days"),
            "status": req.get("status"),
            "reason": req.get("reason")
        } for req in leave_requests[:5]],
        "attendance_summary": {
            "month": now.strftime("%B %Y"),
            "present": days_worked,
            "absent": len([a for a in attendance if a.get("status") == "absent"]),
            "late": len([a for a in attendance if a.get("status") == "late"]),
            "leave": len([a for a in attendance if a.get("status") == "leave"])
        }
    }

@api_router.post("/employee-portal/leave-request")
async def employee_portal_submit_leave(
    leave_type: str,
    start_date: str,
    end_date: str,
    reason: Optional[str] = None,
    account: dict = Depends(get_employee_account)
):
    """Submit a leave request"""
    employee_id = account["employee_id"]
    
    # Calculate days
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    days = (end - start).days + 1
    
    leave_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    leave_doc = {
        "id": leave_id,
        "employee_id": employee_id,
        "employee_name": account["name"],
        "leave_type": leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "days": days,
        "reason": reason,
        "status": "pending",
        "created_at": now,
        "workspace_id": account.get("workspace_id"),
        "employer_user_id": account.get("employer_user_id")
    }
    
    await db.hrm_leave_requests.insert_one(leave_doc)
    
    return {"message": "Verlofaanvraag ingediend", "leave_request": {k: v for k, v in leave_doc.items() if k != "_id"}}

@api_router.get("/employee-portal/payslips")
async def employee_portal_payslips(account: dict = Depends(get_employee_account)):
    """Get all payslips for the employee"""
    employee_id = account["employee_id"]
    
    payslips = await db.hrm_payroll.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("pay_date", -1).to_list(50)
    
    if not payslips:
        payslips = await db.salaries.find(
            {"employee_id": employee_id},
            {"_id": 0}
        ).sort("payment_date", -1).to_list(50)
    
    return payslips

# Admin endpoint to create employee accounts
@api_router.post("/hrm/employee-accounts")
async def create_employee_account(
    data: EmployeeAccountCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a portal account for an employee"""
    # Check if employee exists
    employee = await db.hrm_employees.find_one({"id": data.employee_id})
    if not employee:
        employee = await db.employees.find_one({"id": data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Werknemer niet gevonden")
    
    # Check if account already exists
    existing = await db.employee_accounts.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Er bestaat al een account met dit emailadres")
    
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    account_doc = {
        "id": account_id,
        "employee_id": data.employee_id,
        "email": data.email,
        "name": data.name,
        "password": hash_password(data.password),
        "is_active": True,
        "created_at": now,
        "last_login": None,
        "employer_user_id": current_user["id"],
        "workspace_id": current_user.get("workspace_id")
    }
    
    await db.employee_accounts.insert_one(account_doc)
    
    return {
        "message": "Werknemersaccount aangemaakt",
        "account": {
            "id": account_id,
            "employee_id": data.employee_id,
            "email": data.email,
            "name": data.name
        }
    }

@api_router.get("/hrm/employee-accounts")
async def get_employee_accounts(current_user: dict = Depends(get_current_user)):
    """Get all employee portal accounts"""
    workspace_id = current_user.get("workspace_id")
    
    query = {"employer_user_id": current_user["id"]}
    if workspace_id:
        query = {"$or": [query, {"workspace_id": workspace_id}]}
    
    accounts = await db.employee_accounts.find(query, {"_id": 0, "password": 0}).to_list(100)
    return accounts

@api_router.delete("/hrm/employee-accounts/{account_id}")
async def delete_employee_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an employee portal account"""
    result = await db.employee_accounts.delete_one({
        "id": account_id,
        "$or": [
            {"employer_user_id": current_user["id"]},
            {"workspace_id": current_user.get("workspace_id")}
        ]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account niet gevonden")
    return {"message": "Account verwijderd"}


# Include routers
api_router.include_router(autodealer_router)
api_router.include_router(tenant_portal_router)
api_router.include_router(hrm_router)
api_router.include_router(autodealer_portal_router)
api_router.include_router(payment_methods_router)
api_router.include_router(admin_router)
api_router.include_router(domain_management_router)
api_router.include_router(beautyspa_router)
api_router.include_router(spa_booking_router)
api_router.include_router(suribet_router)
api_router.include_router(boekhouding_router)

# =============================================================================
# GITHUB WEBHOOK AUTO-DEPLOY
# =============================================================================
import subprocess
import hmac
import hashlib

WEBHOOK_SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET', 'your-webhook-secret-here')
DEPLOY_SCRIPT = os.environ.get('DEPLOY_SCRIPT', '/home/facturatie/htdocs/facturatie.sr/webhook-deploy.sh')

def verify_github_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature or WEBHOOK_SECRET == 'your-webhook-secret-here':
        return True  # Skip verification if no secret configured
    expected = 'sha256=' + hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def run_deploy_script():
    """Run the deploy script in background"""
    try:
        subprocess.Popen(['bash', DEPLOY_SCRIPT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        logger.error(f"Deploy script error: {e}")

@api_router.post("/webhook/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """GitHub Webhook endpoint for auto-deploy"""
    signature = request.headers.get('X-Hub-Signature-256', '')
    payload = await request.body()
    
    if not verify_github_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    event = request.headers.get('X-GitHub-Event', '')
    
    if event == 'push':
        background_tasks.add_task(run_deploy_script)
        logger.info("GitHub push received - starting auto-deploy")
        return {"status": "ok", "message": "Deploy started"}
    elif event == 'ping':
        return {"status": "ok", "message": "Pong!"}
    
    return {"status": "ok", "message": f"Event {event} ignored"}

# Include the router in the main app
app.include_router(api_router)

# Add GZip compression middleware for faster responses
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache headers middleware for static responses
@app.middleware("http")
async def add_cache_headers(request, call_next):
    response = await call_next(request)
    
    # Add cache headers for public endpoints
    if "/api/public/" in str(request.url):
        response.headers["Cache-Control"] = "public, max-age=300"  # 5 minutes
    elif "/api/addons" in str(request.url) and request.method == "GET":
        response.headers["Cache-Control"] = "public, max-age=300"
    
    return response

@app.on_event("shutdown")
async def shutdown_db_client():
    # Stop scheduled tasks
    try:
        scheduler = get_scheduled_tasks(db, get_email_service(db))
        scheduler.stop()
    except:
        pass
    client.close()
