# Auth Router - Authentication endpoints
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import uuid
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from deps import (
    db, logger, hash_password, verify_password, create_token, get_current_user,
    get_subscription_status, TRIAL_DAYS, SUPER_ADMIN_EMAIL,
    UserCreate, UserLogin, UserResponse, TokenResponse,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register new user"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    
    user_count = await db.users.count_documents({})
    is_superadmin = user_count == 0 or user_data.email == SUPER_ADMIN_EMAIL
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
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
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
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


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")
    
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


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        company_name=current_user.get("company_name"),
        role=current_user.get("role", "customer"),
        subscription_status=current_user.get("subscription_status", "none"),
        subscription_end_date=current_user.get("subscription_end_date"),
        created_at=current_user["created_at"],
        logo=current_user.get("logo")
    )


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u instructies"}
    
    reset_token = str(uuid.uuid4())
    reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.users.update_one(
        {"email": request.email},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_expiry.isoformat()
        }}
    )
    
    try:
        if SMTP_PASSWORD:
            frontend_url = os.environ.get("FRONTEND_URL", "https://facturatie.sr")
            reset_link = f"{frontend_url}/reset-wachtwoord/{reset_token}"
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Wachtwoord Resetten - Facturatie N.V."
            msg["From"] = SMTP_USER
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
                    Deze link is 1 uur geldig.
                </p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(html_content, "html"))
            
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, request.email, msg.as_string())
            
            logger.info(f"Password reset email sent to {request.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return {"message": "Als dit e-mailadres bestaat, ontvangt u instructies"}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    user = await db.users.find_one({"reset_token": request.token}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen reset link")
    
    expiry = user.get("reset_token_expiry")
    if expiry:
        try:
            expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expiry_dt:
                raise HTTPException(status_code=400, detail="Reset link is verlopen")
        except:
            raise HTTPException(status_code=400, detail="Ongeldige reset link")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 6 tekens bevatten")
    
    hashed_password = hash_password(request.new_password)
    
    await db.users.update_one(
        {"reset_token": request.token},
        {"$set": {"password": hashed_password},
         "$unset": {"reset_token": "", "reset_token_expiry": ""}}
    )
    
    return {"message": "Wachtwoord succesvol gewijzigd"}
