#!/bin/bash
# ============================================================
# FACTURATIE ERP - WEBHOOK DEPLOY SCRIPT
# ============================================================
#
# Dit script wordt aangeroepen door een webhook (bijv. GitHub/GitLab)
# om automatisch te deployen na een push naar de main branch.
#
# Setup met CloudPanel/Nginx:
# 1. Maak een endpoint in je backend: /api/webhook/deploy
# 2. Of gebruik een simpele webhook server (zie onder)
#
# Beveilig de webhook met een secret token!
#
# ============================================================

set -e

# ==================== CONFIGURATIE ====================
APP_DIR="/var/www/facturatie"
APP_NAME="facturatie"
LOG_FILE="/var/log/${APP_NAME}_deploy.log"
LOCK_FILE="/tmp/${APP_NAME}_deploy.lock"

# Webhook secret (VERANDER DIT!)
WEBHOOK_SECRET="jouw-geheime-webhook-token-hier"

# ==================== LOGGING ====================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# ==================== LOCK CHECK ====================
# Voorkom dubbele deployments
if [ -f "$LOCK_FILE" ]; then
    log "ERROR: Deployment al bezig. Lock file bestaat: $LOCK_FILE"
    exit 1
fi

# Maak lock file
touch $LOCK_FILE
trap "rm -f $LOCK_FILE" EXIT

# ==================== START DEPLOY ====================
log "=========================================="
log "DEPLOYMENT GESTART"
log "=========================================="

cd $APP_DIR

# Git pull
log "Git pull uitvoeren..."
git fetch origin
git reset --hard origin/main 2>/dev/null || git reset --hard origin/master

# Backend
log "Backend updaten..."
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

# Frontend
log "Frontend bouwen..."
cd $APP_DIR/frontend
yarn install --silent
yarn build

# Herstart services
log "Services herstarten..."
supervisorctl restart all

# Health check
sleep 5
BACKEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health)
FRONTEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

log "Health Check: Backend=$BACKEND_OK, Frontend=$FRONTEND_OK"

if [ "$BACKEND_OK" = "200" ] && [ "$FRONTEND_OK" = "200" ]; then
    log "DEPLOYMENT SUCCESVOL!"
else
    log "WARNING: Services mogelijk nog aan het opstarten"
fi

log "=========================================="
log "DEPLOYMENT VOLTOOID"
log "=========================================="

# Optioneel: Stuur notificatie (Slack, Discord, Email)
# curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
#     -H "Content-type: application/json" \
#     -d '{"text":"Facturatie ERP deployment voltooid!"}'
