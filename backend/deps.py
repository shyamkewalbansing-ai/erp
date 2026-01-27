# Shared dependencies for all routers
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import jwt
import bcrypt
import uuid
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'surirentals')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'suri-rentals-default-secret-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Constants
SUBSCRIPTION_PRICE_SRD = 3500.0
SUBSCRIPTION_DAYS = 30
TRIAL_DAYS = 3
SUPER_ADMIN_EMAIL = "admin@facturatie.sr"

# Security
security = HTTPBearer()

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.hostinger.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'info@facturatie.sr')
APP_URL = os.environ.get('APP_URL', 'https://facturatie.sr')

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token is verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
    
    status, end_date, _ = get_subscription_status(user)
    user["subscription_status"] = status
    user["subscription_end_date"] = end_date
    
    return user

async def get_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin rechten vereist")
    return current_user

def get_subscription_status(user: dict) -> tuple:
    """Returns (status, end_date, days_remaining)"""
    if user.get("role") == "superadmin":
        return ("active", None, None)
    
    end_date_str = user.get("subscription_end_date")
    is_trial = user.get("is_trial", False)
    
    if not end_date_str:
        return ("none", None, None)
    
    try:
        end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        days_remaining = (end_date - now).days
        
        if days_remaining < 0:
            return ("expired", end_date_str, 0)
        elif is_trial:
            return ("trial", end_date_str, days_remaining)
        else:
            return ("active", end_date_str, days_remaining)
    except Exception:
        return ("none", None, None)

# ==================== PYDANTIC MODELS ====================

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
    role: str
    subscription_status: str
    subscription_end_date: Optional[str] = None
    created_at: str
    logo: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
