#!/usr/bin/env python3
"""
Data Repair Script for Facturatie N.V.
This script fixes corrupt data in the MongoDB database that may cause server crashes.

Run this on the production server:
    cd /home/facturatie/htdocs/facturatie.sr/backend
    python3 fix_corrupt_data.py
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'surirentals')

async def fix_data():
    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    fixed_count = 0
    
    # === FIX LOANS ===
    print("\n=== Checking Loans Collection ===")
    loans = await db.loans.find({}).to_list(10000)
    print(f"Found {len(loans)} loans")
    
    for loan in loans:
        updates = {}
        loan_id = loan.get("id", str(loan.get("_id", "unknown")))
        
        # Fix missing loan_date
        if not loan.get("loan_date"):
            # Use created_at if available, otherwise use today
            created_at = loan.get("created_at", "")
            if created_at:
                updates["loan_date"] = created_at[:10]  # Take just the date part
            else:
                updates["loan_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            print(f"  - Loan {loan_id}: Adding missing loan_date = {updates['loan_date']}")
        
        # Fix missing amount
        if loan.get("amount") is None:
            updates["amount"] = 0
            print(f"  - Loan {loan_id}: Setting missing amount to 0")
        
        # Fix missing user_id
        if not loan.get("user_id"):
            # Try to get user_id from tenant
            tenant_id = loan.get("tenant_id")
            if tenant_id:
                tenant = await db.tenants.find_one({"id": tenant_id})
                if tenant and tenant.get("user_id"):
                    updates["user_id"] = tenant["user_id"]
                    print(f"  - Loan {loan_id}: Setting user_id from tenant = {updates['user_id']}")
        
        # Fix missing tenant_id
        if not loan.get("tenant_id"):
            print(f"  - Loan {loan_id}: WARNING - Missing tenant_id, marking as orphan")
            updates["description"] = f"[ORPHAN - NO TENANT] {loan.get('description', '')}"
        
        # Fix missing id
        if not loan.get("id"):
            import uuid
            updates["id"] = str(uuid.uuid4())
            print(f"  - Loan (no id): Adding missing id = {updates['id']}")
        
        # Fix missing created_at
        if not loan.get("created_at"):
            updates["created_at"] = datetime.now(timezone.utc).isoformat()
            print(f"  - Loan {loan_id}: Adding missing created_at")
        
        # Apply fixes
        if updates:
            await db.loans.update_one({"_id": loan["_id"]}, {"$set": updates})
            fixed_count += 1
    
    # === FIX TENANTS ===
    print("\n=== Checking Tenants Collection ===")
    tenants = await db.tenants.find({}).to_list(10000)
    print(f"Found {len(tenants)} tenants")
    
    for tenant in tenants:
        updates = {}
        tenant_id = tenant.get("id", str(tenant.get("_id", "unknown")))
        
        # Fix missing name
        if not tenant.get("name"):
            updates["name"] = "Onbekend"
            print(f"  - Tenant {tenant_id}: Setting missing name to 'Onbekend'")
        
        # Fix missing phone
        if not tenant.get("phone"):
            updates["phone"] = ""
            print(f"  - Tenant {tenant_id}: Setting missing phone to empty string")
        
        # Fix missing id
        if not tenant.get("id"):
            import uuid
            updates["id"] = str(uuid.uuid4())
            print(f"  - Tenant (no id): Adding missing id = {updates['id']}")
        
        # Fix missing created_at
        if not tenant.get("created_at"):
            updates["created_at"] = datetime.now(timezone.utc).isoformat()
            print(f"  - Tenant {tenant_id}: Adding missing created_at")
        
        # Apply fixes
        if updates:
            await db.tenants.update_one({"_id": tenant["_id"]}, {"$set": updates})
            fixed_count += 1
    
    # === FIX APARTMENTS ===
    print("\n=== Checking Apartments Collection ===")
    apartments = await db.apartments.find({}).to_list(10000)
    print(f"Found {len(apartments)} apartments")
    
    for apt in apartments:
        updates = {}
        apt_id = apt.get("id", str(apt.get("_id", "unknown")))
        
        # Fix missing name
        if not apt.get("name"):
            updates["name"] = "Onbekend Appartement"
            print(f"  - Apartment {apt_id}: Setting missing name")
        
        # Fix missing address
        if not apt.get("address"):
            updates["address"] = ""
            print(f"  - Apartment {apt_id}: Setting missing address to empty string")
        
        # Fix missing rent_amount
        if apt.get("rent_amount") is None:
            updates["rent_amount"] = 0
            print(f"  - Apartment {apt_id}: Setting missing rent_amount to 0")
        
        # Fix missing bedrooms/bathrooms
        if apt.get("bedrooms") is None:
            updates["bedrooms"] = 1
            print(f"  - Apartment {apt_id}: Setting missing bedrooms to 1")
        if apt.get("bathrooms") is None:
            updates["bathrooms"] = 1
            print(f"  - Apartment {apt_id}: Setting missing bathrooms to 1")
        
        # Fix missing status
        if not apt.get("status"):
            updates["status"] = "available"
            print(f"  - Apartment {apt_id}: Setting missing status to 'available'")
        
        # Fix missing id
        if not apt.get("id"):
            import uuid
            updates["id"] = str(uuid.uuid4())
            print(f"  - Apartment (no id): Adding missing id = {updates['id']}")
        
        # Fix missing created_at
        if not apt.get("created_at"):
            updates["created_at"] = datetime.now(timezone.utc).isoformat()
            print(f"  - Apartment {apt_id}: Adding missing created_at")
        
        # Apply fixes
        if updates:
            await db.apartments.update_one({"_id": apt["_id"]}, {"$set": updates})
            fixed_count += 1
    
    # === FIX PAYMENTS ===
    print("\n=== Checking Payments Collection ===")
    payments = await db.payments.find({}).to_list(10000)
    print(f"Found {len(payments)} payments")
    
    for payment in payments:
        updates = {}
        payment_id = payment.get("id", str(payment.get("_id", "unknown")))
        
        # Fix missing payment_date
        if not payment.get("payment_date"):
            created_at = payment.get("created_at", "")
            if created_at:
                updates["payment_date"] = created_at[:10]
            else:
                updates["payment_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            print(f"  - Payment {payment_id}: Adding missing payment_date")
        
        # Fix missing amount
        if payment.get("amount") is None:
            updates["amount"] = 0
            print(f"  - Payment {payment_id}: Setting missing amount to 0")
        
        # Fix missing payment_type
        if not payment.get("payment_type"):
            updates["payment_type"] = "rent"
            print(f"  - Payment {payment_id}: Setting missing payment_type to 'rent'")
        
        # Fix missing id
        if not payment.get("id"):
            import uuid
            updates["id"] = str(uuid.uuid4())
            print("  - Payment (no id): Adding missing id")
        
        # Fix missing created_at
        if not payment.get("created_at"):
            updates["created_at"] = datetime.now(timezone.utc).isoformat()
            print(f"  - Payment {payment_id}: Adding missing created_at")
        
        # Apply fixes
        if updates:
            await db.payments.update_one({"_id": payment["_id"]}, {"$set": updates})
            fixed_count += 1
    
    print("\n=== Summary ===")
    print(f"Total records fixed: {fixed_count}")
    print("\nData repair complete!")
    print("Please restart the backend service: sudo systemctl restart facturatie.service")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_data())
