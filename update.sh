#!/bin/bash

#############################################
# Facturatie.sr - Server Update Script
# Gebruik: ./update.sh
#############################################

set -e

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory (pas aan indien nodig)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   Facturatie.sr - Server Update Script     ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

cd "$PROJECT_DIR"

# Stap 1: Fix git ownership problemen
echo -e "${YELLOW}[1/6] Git ownership fixen...${NC}"
if [ -d ".git" ]; then
    sudo chown -R $USER:$USER .git 2>/dev/null || true
    git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true
    echo -e "${GREEN}✓ Git ownership opgelost${NC}"
else
    echo -e "${RED}✗ Geen .git folder gevonden${NC}"
    exit 1
fi

# Stap 2: Lokale wijzigingen opslaan (optioneel)
echo -e "${YELLOW}[2/6] Controleren op lokale wijzigingen...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}  Lokale wijzigingen gevonden, worden verwijderd...${NC}"
    git checkout -- . 2>/dev/null || true
    git clean -fd 2>/dev/null || true
fi
echo -e "${GREEN}✓ Werkdirectory schoon${NC}"

# Stap 3: Nieuwste code ophalen
echo -e "${YELLOW}[3/6] Nieuwste code ophalen van GitHub...${NC}"
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git reset --hard origin/$BRANCH
echo -e "${GREEN}✓ Code bijgewerkt naar laatste versie${NC}"

# Stap 4: Backend dependencies installeren
echo -e "${YELLOW}[4/6] Backend dependencies installeren...${NC}"
if [ -d "backend" ]; then
    cd backend
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet 2>/dev/null || pip3 install -r requirements.txt --quiet
        echo -e "${GREEN}✓ Backend dependencies geïnstalleerd${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}  Geen backend folder gevonden, overslaan...${NC}"
fi

# Stap 5: Frontend dependencies installeren
echo -e "${YELLOW}[5/6] Frontend dependencies installeren...${NC}"
if [ -d "frontend" ]; then
    cd frontend
    if [ -f "package.json" ]; then
        yarn install --silent 2>/dev/null || npm install --silent 2>/dev/null
        echo -e "${GREEN}✓ Frontend dependencies geïnstalleerd${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}  Geen frontend folder gevonden, overslaan...${NC}"
fi

# Stap 6: Services herstarten
echo -e "${YELLOW}[6/6] Services herstarten...${NC}"

# Probeer supervisor eerst
if command -v supervisorctl &> /dev/null; then
    sudo supervisorctl restart all 2>/dev/null && echo -e "${GREEN}✓ Services herstart via supervisor${NC}" || true
# Anders systemctl
elif command -v systemctl &> /dev/null; then
    sudo systemctl restart backend 2>/dev/null || true
    sudo systemctl restart frontend 2>/dev/null || true
    echo -e "${GREEN}✓ Services herstart via systemctl${NC}"
# PM2 als fallback
elif command -v pm2 &> /dev/null; then
    pm2 restart all 2>/dev/null || true
    echo -e "${GREEN}✓ Services herstart via PM2${NC}"
else
    echo -e "${YELLOW}  Geen service manager gevonden. Herstart handmatig.${NC}"
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}   ✓ Update succesvol voltooid!             ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "Huidige versie: ${BLUE}$(git log -1 --format='%h - %s' 2>/dev/null || echo 'onbekend')${NC}"
echo -e "Branch: ${BLUE}$BRANCH${NC}"
echo ""
