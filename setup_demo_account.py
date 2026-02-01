#!/usr/bin/env python3
"""
Script om de demo account te activeren met alle modules en een 3-dagen trial
Voer uit op de server: python3 setup_demo_account.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt

load_dotenv('.env')

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def setup_demo():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'facturatie_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    now = datetime.now(timezone.utc)
    trial_end = (now + timedelta(days=3)).isoformat()
    
    # Demo account settings
    demo_email = "demo@facturatie.sr"
    demo_password = "demo2024"
    demo_name = "Demo Gebruiker"
    demo_company = "Demo Bedrijf"
    
    print(f"Setting up demo account: {demo_email}")
    
    # Check if demo user exists
    demo_user = await db.users.find_one({"email": demo_email})
    
    if demo_user:
        user_id = demo_user.get("id") or str(demo_user["_id"])
        print(f"Demo user found: {user_id}")
        
        # Update user with trial
        await db.users.update_one(
            {"email": demo_email},
            {"$set": {
                "subscription_end_date": trial_end,
                "is_trial": True,
                "name": demo_name,
                "company_name": demo_company
            }}
        )
        print("Updated demo user with 3-day trial")
    else:
        # Create demo user
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": demo_email,
            "password": hash_password(demo_password),
            "name": demo_name,
            "company_name": demo_company,
            "role": "customer",
            "subscription_end_date": trial_end,
            "is_trial": True,
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user_doc)
        print(f"Created demo user: {user_id}")
    
    # Get all available addons
    addons = await db.addons.find({"is_active": True}).to_list(100)
    print(f"Found {len(addons)} active addons")
    
    # Activate all addons for demo user
    for addon in addons:
        addon_id = addon.get("id") or str(addon["_id"])
        addon_slug = addon.get("slug", "")
        
        # Check if already has this addon
        existing = await db.user_addons.find_one({
            "user_id": user_id,
            "$or": [{"addon_id": addon_id}, {"addon_slug": addon_slug}]
        })
        
        if not existing:
            user_addon = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "addon_id": addon_id,
                "addon_slug": addon_slug,
                "status": "active",
                "start_date": now.isoformat(),
                "end_date": trial_end,
                "activated_at": now.isoformat(),
                "created_at": now.isoformat()
            }
            await db.user_addons.insert_one(user_addon)
            print(f"  Activated addon: {addon.get('name', addon_slug)}")
        else:
            # Update existing addon to active
            await db.user_addons.update_one(
                {"_id": existing["_id"]},
                {"$set": {"status": "active", "end_date": trial_end}}
            )
            print(f"  Updated addon: {addon.get('name', addon_slug)}")
    
    # Update workspace IP
    await db.workspaces.update_many(
        {},
        {"$set": {"domain.dns_record_value": "72.62.174.117"}}
    )
    print("Updated all workspaces with correct IP: 72.62.174.117")
    
    print("\n✅ Demo account setup complete!")
    print(f"   Email: {demo_email}")
    print(f"   Password: {demo_password}")
    print(f"   Trial ends: {trial_end}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_demo())
