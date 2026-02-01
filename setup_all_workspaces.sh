#!/bin/bash
# ================================================================
# Setup ALL Workspaces Script
# Haalt alle workspaces uit de database en configureert Nginx
# 
# Gebruik: sudo ./setup_all_workspaces.sh
# ================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Dit script moet als root worden uitgevoerd (sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup All Workspaces${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Ga naar backend directory
cd /home/clp/htdocs/facturatie.sr/backend
source venv/bin/activate

# Haal workspaces op en configureer ze
python3 << 'PYTHON_SCRIPT'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import subprocess
from dotenv import load_dotenv

load_dotenv('.env')

async def setup_all():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'facturatie_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    workspaces = await db.workspaces.find({}, {"_id": 0, "id": 1, "slug": 1, "name": 1}).to_list(100)
    
    print(f"Gevonden: {len(workspaces)} workspaces\n")
    
    for ws in workspaces:
        slug = ws.get("slug")
        ws_id = ws.get("id")
        name = ws.get("name", slug)
        
        if not slug:
            print(f"⚠ Workspace '{name}' heeft geen slug, overgeslagen")
            continue
        
        print(f"Configureren: {slug} ({name})")
        
        try:
            result = subprocess.run(
                ["/home/clp/htdocs/facturatie.sr/setup_workspace_subdomain.sh", slug, ws_id],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print(f"  ✓ {slug}.facturatie.sr geconfigureerd")
            else:
                print(f"  ✗ Fout: {result.stderr}")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    client.close()
    print("\n✅ Alle workspaces verwerkt!")

asyncio.run(setup_all())
PYTHON_SCRIPT

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ KLAAR!${NC}"
echo -e "${GREEN}========================================${NC}"
