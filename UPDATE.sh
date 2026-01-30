#!/bin/bash
# ============================================================
# FACTURATIE ERP - QUICK UPDATE SCRIPT
# ============================================================
# 
# Dit script update de applicatie naar de nieuwste versie.
# Gebruik: sudo ./update.sh
#
# ============================================================

set -e

APP_DIR="/var/www/facturatie"
BACKUP_DIR="/var/backups/facturatie"

# Kleuren
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "============================================================"
echo "   FACTURATIE ERP - UPDATE"
echo "============================================================"
echo ""

# Backup maken
echo -e "${YELLOW}[1/5]${NC} Backup maken..."
mkdir -p $BACKUP_DIR
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mongodump --db=facturatie_db --out=$BACKUP_DIR/$BACKUP_NAME 2>/dev/null || echo "MongoDB backup overgeslagen"
echo -e "${GREEN}✓${NC} Backup gemaakt: $BACKUP_DIR/$BACKUP_NAME"

# Code updaten
echo -e "${YELLOW}[2/5]${NC} Code updaten..."
cd $APP_DIR
if [ -d ".git" ]; then
    git pull origin main
    echo -e "${GREEN}✓${NC} Code bijgewerkt via Git"
else
    echo "Geen Git repository gevonden - handmatige update vereist"
fi

# Backend dependencies
echo -e "${YELLOW}[3/5]${NC} Backend dependencies updaten..."
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt --quiet
echo -e "${GREEN}✓${NC} Backend dependencies bijgewerkt"

# Frontend bouwen
echo -e "${YELLOW}[4/5]${NC} Frontend bouwen..."
cd $APP_DIR/frontend
yarn install --silent
yarn build
echo -e "${GREEN}✓${NC} Frontend gebouwd"

# Services herstarten
echo -e "${YELLOW}[5/5]${NC} Services herstarten..."
supervisorctl restart all
echo -e "${GREEN}✓${NC} Services herstart"

echo ""
echo "============================================================"
echo -e "${GREEN}UPDATE VOLTOOID!${NC}"
echo "============================================================"
echo ""
echo "Service status:"
supervisorctl status
echo ""
