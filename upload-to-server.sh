#!/bin/bash

# =============================================================================
# FACTURATIE.SR - UPLOAD SCRIPT
# =============================================================================
#
# Dit script upload de applicatie bestanden naar uw CloudPanel server.
#
# GEBRUIK:
# 1. Pas de SERVER variabelen aan
# 2. chmod +x upload-to-server.sh
# 3. ./upload-to-server.sh
#
# =============================================================================

# === CONFIGURATIE - PAS DEZE AAN ===
SERVER_IP="YOUR_SERVER_IP"
SERVER_USER="root"
DOMAIN="facturatie.sr"
APP_DIR="/home/clp/htdocs/$DOMAIN"
# ====================================

# Kleuren
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Uploading naar $SERVER_USER@$SERVER_IP:$APP_DIR"

# Backend uploaden
echo -e "${BLUE}[INFO]${NC} Backend uploaden..."
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' \
    /app/backend/ $SERVER_USER@$SERVER_IP:$APP_DIR/backend/

# Frontend uploaden
echo -e "${BLUE}[INFO]${NC} Frontend uploaden..."
rsync -avz --exclude 'node_modules' --exclude 'build' \
    /app/frontend/ $SERVER_USER@$SERVER_IP:$APP_DIR/frontend/

# Config bestanden uploaden
echo -e "${BLUE}[INFO]${NC} Configuratie uploaden..."
scp /app/nginx-subdomain.conf.template $SERVER_USER@$SERVER_IP:$APP_DIR/
scp /app/docs/SUBDOMAIN_SETUP.md $SERVER_USER@$SERVER_IP:$APP_DIR/docs/

echo -e "${GREEN}[SUCCESS]${NC} Upload voltooid!"
echo ""
echo "Nu op de server uitvoeren:"
echo "  cd $APP_DIR/backend && source venv/bin/activate && pip install -r requirements.txt"
echo "  cd $APP_DIR/frontend && yarn install && yarn build"
echo "  supervisorctl restart all"
