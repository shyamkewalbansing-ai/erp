#!/usr/bin/env python3
"""
Script om de demo account aan te maken - ZONDER modules geactiveerd.
Klanten kiezen zelf welke modules ze willen testen (3 dagen gratis).
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

# All available modules - allemaal BETAALD (3 dagen gratis trial)
ALL_MODULES = [
    {
        "name": "Boekhouding",
        "slug": "boekhouding",
        "description": "Complete boekhouding met multi-valuta (SRD, EUR, USD) en BTW.",
        "price": 500.0,
        "category": "financieel",
        "is_free": False,
        "trial_days": 3
    },
    {
        "name": "Vastgoed Beheer",
        "slug": "vastgoed_beheer",
        "description": "Complete module voor vastgoedbeheer. Huurders, appartementen, betalingen en meer.",
        "price": 1000.0,
        "category": "vastgoed",
        "is_free": False,
        "trial_days": 3
    },
    {
        "name": "HRM",
        "slug": "hrm",
        "description": "Complete HRM module voor personeelsbeheer. Werknemers, verlof, salarissen.",
        "price": 1500.0,
        "category": "hr",
        "is_free": False,
        "trial_days": 3
    },
    {
        "name": "Auto Dealer",
        "slug": "autodealer",
        "description": "Autohandelmodule met multi-valuta ondersteuning (SRD, EUR, USD).",
        "price": 2500.0,
        "category": "handel",
        "is_free": False,
        "trial_days": 3
    },
    {
        "name": "Beauty Spa",
        "slug": "beauty",
        "description": "Complete Beauty Spa module. Klanten, behandelingen, afspraken, voorraad, POS en online boekingen.",
        "price": 2000.0,
        "category": "diensten",
        "is_free": False,
        "trial_days": 3
    },
    {
        "name": "Suribet Retailer",
        "slug": "suribet",
        "description": "Administratie voor Suribet verkooppunten. Dagstaten, kasboek, werknemers.",
        "price": 2000.0,
        "category": "retail",
        "is_free": False,
        "trial_days": 3
    },
    {
        "name": "Pompstation",
        "slug": "pompstation",
        "description": "Complete pompstation administratie. Brandstof, winkel, personeel.",
        "price": 2000.0,
        "category": "retail",
        "is_free": False,
        "trial_days": 3
    }
]

async def setup_demo():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'facturatie_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    now = datetime.now(timezone.utc)
    
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
        
        # Update user
        await db.users.update_one(
            {"email": demo_email},
            {"$set": {
                "name": demo_name,
                "company_name": demo_company,
                "role": "customer",
                "is_active": True
            }}
        )
        print("✓ Demo account bijgewerkt")
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
            "is_active": True,
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user_doc)
        print(f"✓ Created demo user: {user_id}")
    
    # VERWIJDER alle geactiveerde modules voor demo user
    print("\n--- Removing all activated modules for demo user ---")
    result = await db.user_addons.delete_many({"user_id": user_id})
    print(f"  ✓ Removed {result.deleted_count} activated modules")
    
    # Ensure all modules exist in addons collection - ALLEMAAL BETAALD
    print("\n--- Ensuring all modules exist (alle betaald, 3 dagen trial) ---")
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
                "is_free": False,
                "trial_days": 3,
                "category": module["category"],
                "created_at": now.isoformat()
            }
            await db.addons.insert_one(addon_doc)
            print(f"  ✓ Created addon: {module['name']} (SRD {module['price']}/maand, 3 dagen gratis)")
        else:
            # Update addon - NIET meer gratis, 3 dagen trial
            await db.addons.update_one(
                {"slug": module["slug"]},
                {"$set": {
                    "is_active": True,
                    "is_free": False,
                    "trial_days": 3,
                    "price": module["price"]
                }}
            )
            print(f"  ✓ Updated addon: {module['name']} (SRD {module['price']}/maand, 3 dagen gratis)")
    
    # Update boekhouding specifically - NIET meer gratis
    await db.addons.update_one(
        {"slug": "boekhouding"},
        {"$set": {
            "is_free": False,
            "trial_days": 3,
            "price": 500.0
        }}
    )
    print("\n✓ Boekhouding is nu BETAALD (SRD 500/maand, 3 dagen gratis trial)")
    
    print("\n" + "=" * 50)
    print("✅ DEMO ACCOUNT SETUP COMPLETE!")
    print("=" * 50)
    print(f"   Email: {demo_email}")
    print(f"   Password: {demo_password}")
    print(f"   Geactiveerde modules: GEEN")
    print(f"   ")
    print(f"   Klanten kunnen zelf modules activeren:")
    print(f"   - 3 dagen GRATIS testen")
    print(f"   - Daarna betalen")
    print("=" * 50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_demo())
