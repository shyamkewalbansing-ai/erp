#!/usr/bin/env python3
"""
Script om de demo account te activeren met alle modules - VOLLEDIG ACTIEF
Data wordt na 1 uur automatisch verwijderd door de backend scheduler.
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

# All available modules including Beauty Spa
ALL_MODULES = [
    {
        "name": "Vastgoed Beheer",
        "slug": "vastgoed_beheer",
        "description": "Complete module voor vastgoedbeheer. Huurders, appartementen, betalingen en meer.",
        "price": 1000.0,
        "category": "vastgoed"
    },
    {
        "name": "HRM",
        "slug": "hrm",
        "description": "Complete HRM module voor personeelsbeheer. Werknemers, verlof, salarissen.",
        "price": 1500.0,
        "category": "hr"
    },
    {
        "name": "Auto Dealer",
        "slug": "autodealer",
        "description": "Autohandelmodule met multi-valuta ondersteuning (SRD, EUR, USD).",
        "price": 2500.0,
        "category": "handel"
    },
    {
        "name": "Beauty Spa",
        "slug": "beauty",
        "description": "Complete Beauty Spa module. Klanten, behandelingen, afspraken, voorraad, POS en online boekingen.",
        "price": 2000.0,
        "category": "diensten"
    }
]

async def setup_demo():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'facturatie_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    now = datetime.now(timezone.utc)
    # PERMANENT active - 100 years from now
    permanent_end = (now + timedelta(days=36500)).isoformat()
    
    # Demo account settings
    demo_email = "demo@facturatie.sr"
    demo_password = "demo2024"
    demo_name = "Demo Gebruiker"
    demo_company = "Demo Bedrijf"
    
    print(f"Setting up demo account: {demo_email}")
    print("=" * 50)
    
    # Check if demo user exists
    demo_user = await db.users.find_one({"email": demo_email})
    
    if demo_user:
        user_id = demo_user.get("id") or str(demo_user["_id"])
        print(f"✓ Demo user found: {user_id}")
        
        # Update user - FULLY ACTIVE (not trial)
        await db.users.update_one(
            {"email": demo_email},
            {"$set": {
                "subscription_end_date": permanent_end,
                "is_trial": False,  # NOT a trial - fully active
                "name": demo_name,
                "company_name": demo_company
            }}
        )
        print("✓ Demo account is nu VOLLEDIG ACTIEF (geen trial)")
    else:
        # Create demo user - FULLY ACTIVE
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": demo_email,
            "password": hash_password(demo_password),
            "name": demo_name,
            "company_name": demo_company,
            "role": "customer",
            "subscription_end_date": permanent_end,
            "is_trial": False,  # NOT a trial - fully active
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user_doc)
        print(f"✓ Created demo user (VOLLEDIG ACTIEF): {user_id}")
    
    # Ensure all modules exist in addons collection
    print("\n--- Ensuring all modules exist ---")
    for module in ALL_MODULES:
        existing = await db.addons.find_one({"slug": module["slug"]})
        if not existing:
            addon_doc = {
                "id": str(uuid.uuid4()),
                "name": module["name"],
                "slug": module["slug"],
                "description": module["description"],
                "price": module["price"],
                "is_active": True,
                "category": module["category"],
                "created_at": now.isoformat()
            }
            await db.addons.insert_one(addon_doc)
            print(f"  ✓ Created addon: {module['name']}")
        else:
            # Ensure addon is active
            await db.addons.update_one(
                {"slug": module["slug"]},
                {"$set": {"is_active": True}}
            )
            print(f"  ✓ Addon exists: {module['name']}")
    
    # Get all available addons and activate for demo user - PERMANENT
    print("\n--- Activating modules for demo user (PERMANENT) ---")
    addons = await db.addons.find({"is_active": True}).to_list(100)
    
    for addon in addons:
        addon_id = addon.get("id") or str(addon["_id"])
        addon_slug = addon.get("slug", "")
        addon_name = addon.get("name", addon_slug)
        
        # Remove any existing addon entry for this user/addon combo
        await db.user_addons.delete_many({
            "user_id": user_id,
            "$or": [{"addon_id": addon_id}, {"addon_slug": addon_slug}]
        })
        
        # Create permanent addon entry
        user_addon = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "addon_id": addon_id,
            "addon_slug": addon_slug,
            "status": "active",
            "start_date": now.isoformat(),
            "end_date": permanent_end,  # Permanent
            "activated_at": now.isoformat(),
            "created_at": now.isoformat()
        }
        await db.user_addons.insert_one(user_addon)
        print(f"  ✓ Activated: {addon_name}")
    
    # Update workspace IP
    result = await db.workspaces.update_many(
        {},
        {"$set": {"domain.dns_record_value": "72.62.174.117"}}
    )
    print(f"\n✓ Updated {result.modified_count} workspaces with IP: 72.62.174.117")
    
    # Create sample spa data for demo
    print("\n--- Creating sample Beauty Spa data ---")
    workspace = await db.workspaces.find_one({"owner_id": user_id})
    workspace_id = workspace["id"] if workspace else None
    
    if workspace_id:
        # Check if sample treatments exist
        existing_treatments = await db.spa_treatments.find_one({"user_id": user_id})
        if not existing_treatments:
            treatments = [
                {"id": str(uuid.uuid4()), "name": "Gezichtsmassage", "duration": 30, "price": 150.0, "category": "gezicht", "user_id": user_id, "workspace_id": workspace_id, "is_active": True, "created_at": now.isoformat()},
                {"id": str(uuid.uuid4()), "name": "Manicure", "duration": 45, "price": 100.0, "category": "nagels", "user_id": user_id, "workspace_id": workspace_id, "is_active": True, "created_at": now.isoformat()},
                {"id": str(uuid.uuid4()), "name": "Pedicure", "duration": 60, "price": 120.0, "category": "nagels", "user_id": user_id, "workspace_id": workspace_id, "is_active": True, "created_at": now.isoformat()},
                {"id": str(uuid.uuid4()), "name": "Full Body Massage", "duration": 90, "price": 350.0, "category": "massage", "user_id": user_id, "workspace_id": workspace_id, "is_active": True, "created_at": now.isoformat()},
            ]
            await db.spa_treatments.insert_many(treatments)
            print("  ✓ Created sample treatments")
        
        # Check if sample staff exist
        existing_staff = await db.spa_staff.find_one({"user_id": user_id})
        if not existing_staff:
            staff = [
                {"id": str(uuid.uuid4()), "name": "Maria Santos", "email": "maria@demo.sr", "phone": "+597 123-4567", "role": "therapist", "specialties": ["massage", "gezicht"], "user_id": user_id, "workspace_id": workspace_id, "is_active": True, "created_at": now.isoformat()},
                {"id": str(uuid.uuid4()), "name": "Lisa Chen", "email": "lisa@demo.sr", "phone": "+597 234-5678", "role": "nail_technician", "specialties": ["nagels"], "user_id": user_id, "workspace_id": workspace_id, "is_active": True, "created_at": now.isoformat()},
            ]
            await db.spa_staff.insert_many(staff)
            print("  ✓ Created sample staff")
    
    print("\n" + "=" * 50)
    print("✅ DEMO ACCOUNT SETUP COMPLETE!")
    print("=" * 50)
    print(f"   Email: {demo_email}")
    print(f"   Password: {demo_password}")
    print(f"   Status: VOLLEDIG ACTIEF (geen limiet)")
    print(f"   Modules: ALLE GEACTIVEERD")
    print("")
    print("   ⏰ BELANGRIJK: Alle data die gebruikers invoeren")
    print("      wordt NA 1 UUR automatisch verwijderd!")
    print("      (door de backend cleanup scheduler)")
    print("=" * 50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_demo())
