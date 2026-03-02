"""
SumUp Payment Integration Router
Handles card/pin payments via SumUp terminals
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import httpx
import os
import logging
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

# SumUp Configuration
SUMUP_API_KEY = os.environ.get('SUMUP_API_KEY', '')
SUMUP_AFFILIATE_KEY = os.environ.get('SUMUP_AFFILIATE_KEY', '')
SUMUP_BASE_URL = os.environ.get('SUMUP_BASE_URL', 'https://api.sumup.com')

# Models
class CheckoutCreate(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = Field(default="EUR")
    description: Optional[str] = None
    checkout_reference: Optional[str] = None

class CheckoutResponse(BaseModel):
    success: bool
    checkout_id: Optional[str] = None
    checkout_reference: Optional[str] = None
    amount: float
    currency: str
    status: str
    error: Optional[str] = None

class ReaderPair(BaseModel):
    pairing_code: str

def get_sumup_headers():
    """Get authorization headers for SumUp API"""
    return {
        "Authorization": f"Bearer {SUMUP_API_KEY}",
        "Content-Type": "application/json"
    }

@router.get("/status")
async def check_sumup_status():
    """Check if SumUp integration is configured"""
    is_configured = bool(SUMUP_API_KEY and SUMUP_AFFILIATE_KEY)
    return {
        "configured": is_configured,
        "has_api_key": bool(SUMUP_API_KEY),
        "has_affiliate_key": bool(SUMUP_AFFILIATE_KEY)
    }

@router.get("/merchant")
async def get_merchant_info():
    """Get merchant account information from SumUp"""
    if not SUMUP_API_KEY:
        raise HTTPException(status_code=500, detail="SumUp API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SUMUP_BASE_URL}/v0.1/me",
                headers=get_sumup_headers()
            )
        
        if response.status_code != 200:
            logger.error(f"SumUp merchant info failed: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail="Kon merchant info niet ophalen"
            )
        
        data = response.json()
        return {
            "success": True,
            "merchant_code": data.get("merchant_profile", {}).get("merchant_code"),
            "business_name": data.get("merchant_profile", {}).get("business_name"),
            "currency": data.get("merchant_profile", {}).get("default_currency", "EUR")
        }
    except httpx.RequestError as e:
        logger.error(f"Network error: {e}")
        raise HTTPException(status_code=503, detail="Netwerkfout bij SumUp")

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(checkout: CheckoutCreate):
    """
    Create a new payment checkout via SumUp.
    Returns a checkout_id that can be used to process payment on terminal.
    """
    if not SUMUP_API_KEY:
        raise HTTPException(status_code=500, detail="SumUp API key not configured")
    
    try:
        # First get merchant code
        async with httpx.AsyncClient(timeout=30.0) as client:
            merchant_resp = await client.get(
                f"{SUMUP_BASE_URL}/v0.1/me",
                headers=get_sumup_headers()
            )
        
        if merchant_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Kon merchant info niet ophalen")
        
        merchant_data = merchant_resp.json()
        merchant_code = merchant_data.get("merchant_profile", {}).get("merchant_code")
        
        if not merchant_code:
            raise HTTPException(status_code=500, detail="Merchant code niet gevonden")
        
        # Generate checkout reference if not provided
        checkout_reference = checkout.checkout_reference or f"POS-{uuid.uuid4().hex[:8].upper()}"
        
        # Create checkout payload
        payload = {
            "checkout_reference": checkout_reference,
            "amount": checkout.amount,
            "currency": checkout.currency,
            "merchant_code": merchant_code,
            "description": checkout.description or "POS Betaling"
        }
        
        # Create checkout via SumUp API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SUMUP_BASE_URL}/v0.1/checkouts",
                json=payload,
                headers=get_sumup_headers()
            )
        
        if response.status_code not in [200, 201]:
            logger.error(f"SumUp checkout creation failed: {response.text}")
            error_detail = "Kon checkout niet aanmaken"
            try:
                error_data = response.json()
                error_detail = error_data.get("message", error_detail)
            except:
                pass
            return CheckoutResponse(
                success=False,
                amount=checkout.amount,
                currency=checkout.currency,
                status="FAILED",
                error=error_detail
            )
        
        checkout_data = response.json()
        checkout_id = checkout_data.get("id")
        
        logger.info(f"SumUp checkout created: {checkout_id}")
        
        return CheckoutResponse(
            success=True,
            checkout_id=checkout_id,
            checkout_reference=checkout_reference,
            amount=checkout.amount,
            currency=checkout.currency,
            status="PENDING"
        )
        
    except httpx.RequestError as e:
        logger.error(f"Network error creating checkout: {e}")
        return CheckoutResponse(
            success=False,
            amount=checkout.amount,
            currency=checkout.currency,
            status="FAILED",
            error="Netwerkfout bij verbinding met SumUp"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return CheckoutResponse(
            success=False,
            amount=checkout.amount,
            currency=checkout.currency,
            status="FAILED",
            error=str(e)
        )

@router.get("/checkout/{checkout_id}")
async def get_checkout_status(checkout_id: str):
    """Get the current status of a checkout"""
    if not SUMUP_API_KEY:
        raise HTTPException(status_code=500, detail="SumUp API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SUMUP_BASE_URL}/v0.1/checkouts/{checkout_id}",
                headers=get_sumup_headers()
            )
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Checkout niet gevonden")
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Kon checkout status niet ophalen"
            )
        
        data = response.json()
        
        return {
            "success": True,
            "checkout_id": checkout_id,
            "status": data.get("status"),
            "amount": data.get("amount"),
            "currency": data.get("currency"),
            "transaction_code": data.get("transaction_code"),
            "transaction_id": data.get("transaction_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting checkout status: {e}")
        raise HTTPException(status_code=500, detail="Interne fout")

@router.get("/readers")
async def list_readers():
    """List all paired card readers"""
    if not SUMUP_API_KEY:
        raise HTTPException(status_code=500, detail="SumUp API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SUMUP_BASE_URL}/v0.1/readers",
                headers=get_sumup_headers()
            )
        
        if response.status_code != 200:
            logger.error(f"Failed to list readers: {response.text}")
            return {"success": False, "readers": [], "error": "Kon readers niet ophalen"}
        
        readers = response.json()
        
        return {
            "success": True,
            "readers": readers if isinstance(readers, list) else [],
            "total": len(readers) if isinstance(readers, list) else 0
        }
        
    except Exception as e:
        logger.error(f"Error listing readers: {e}")
        return {"success": False, "readers": [], "error": str(e)}

@router.post("/readers/pair")
async def pair_reader(pairing: ReaderPair):
    """Pair a new card reader using pairing code"""
    if not SUMUP_API_KEY:
        raise HTTPException(status_code=500, detail="SumUp API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SUMUP_BASE_URL}/v0.1/readers",
                json={"code": pairing.pairing_code},
                headers=get_sumup_headers()
            )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Reader pairing failed: {response.text}")
            error_msg = "Koppelen mislukt"
            try:
                error_data = response.json()
                error_msg = error_data.get("message", error_msg)
            except:
                pass
            raise HTTPException(status_code=400, detail=error_msg)
        
        reader_data = response.json()
        
        return {
            "success": True,
            "reader_id": reader_data.get("id"),
            "reader_name": reader_data.get("name"),
            "status": reader_data.get("status")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pairing reader: {e}")
        raise HTTPException(status_code=500, detail="Fout bij koppelen reader")

@router.post("/readers/{reader_id}/checkout")
async def send_to_reader(reader_id: str, checkout_id: str):
    """Send a checkout to a specific card reader for processing"""
    if not SUMUP_API_KEY or not SUMUP_AFFILIATE_KEY:
        raise HTTPException(status_code=500, detail="SumUp configuratie incompleet")
    
    try:
        payload = {
            "checkout_reference": checkout_id,
            "affiliate_key": SUMUP_AFFILIATE_KEY
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SUMUP_BASE_URL}/v0.1/readers/{reader_id}/checkout",
                json=payload,
                headers=get_sumup_headers()
            )
        
        if response.status_code not in [200, 201, 202]:
            logger.error(f"Send to reader failed: {response.text}")
            error_msg = "Kon betaling niet naar terminal sturen"
            try:
                error_data = response.json()
                error_msg = error_data.get("message", error_msg)
            except:
                pass
            raise HTTPException(status_code=400, detail=error_msg)
        
        return {
            "success": True,
            "status": "SENT_TO_READER",
            "message": "Betaling verzonden naar terminal"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending to reader: {e}")
        raise HTTPException(status_code=500, detail="Fout bij verzenden naar terminal")

@router.delete("/checkout/{checkout_id}")
async def cancel_checkout(checkout_id: str):
    """Cancel/deactivate a pending checkout"""
    if not SUMUP_API_KEY:
        raise HTTPException(status_code=500, detail="SumUp API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{SUMUP_BASE_URL}/v0.1/checkouts/{checkout_id}",
                headers=get_sumup_headers()
            )
        
        if response.status_code not in [200, 204]:
            logger.error(f"Checkout cancellation failed: {response.text}")
            return {"success": False, "error": "Kon checkout niet annuleren"}
        
        return {"success": True, "message": "Checkout geannuleerd"}
        
    except Exception as e:
        logger.error(f"Error cancelling checkout: {e}")
        return {"success": False, "error": str(e)}
