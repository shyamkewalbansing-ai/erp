#!/bin/bash

# =============================================================================
# GITHUB WEBHOOK AUTO-DEPLOY SCRIPT v2.0
# Dit script wordt automatisch aangeroepen wanneer je naar GitHub pusht
# Locatie: /home/facturatie/htdocs/facturatie.sr/webhook-deploy.sh
# =============================================================================

# Configuratie
APP_DIR="/home/facturatie/htdocs/facturatie.sr"
LOG_FILE="$APP_DIR/logs/deploy.log"
LOCK_FILE="/tmp/facturatie-deploy.lock"
SERVER_IP="72.62.174.80"

# Maak logs directory aan als die niet bestaat
mkdir -p "$APP_DIR/logs"

# Fix git safe directory (voorkomt ownership errors)
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

# Voorkom meerdere deploys tegelijk
if [ -f "$LOCK_FILE" ]; then
    echo "$(date): Deploy already running, skipping..." >> $LOG_FILE
    exit 0
fi

trap "rm -f $LOCK_FILE" EXIT
touch $LOCK_FILE

echo "" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
echo "$(date): Starting auto-deploy..." >> $LOG_FILE
echo "========================================" >> $LOG_FILE

cd $APP_DIR || exit 1

# Pull latest code
echo "$(date): Pulling latest code from GitHub..." >> $LOG_FILE
git fetch origin >> $LOG_FILE 2>&1
git reset --hard origin/main >> $LOG_FILE 2>&1

# Update backend dependencies
echo "$(date): Updating backend dependencies..." >> $LOG_FILE
cd $APP_DIR/backend
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install -r requirements.txt -q >> $LOG_FILE 2>&1
    deactivate
fi

# Update frontend
echo "$(date): Updating frontend..." >> $LOG_FILE
cd $APP_DIR/frontend

# Ensure .env has correct SERVER_IP
if ! grep -q "REACT_APP_SERVER_IP" .env 2>/dev/null; then
    echo "REACT_APP_SERVER_IP=$SERVER_IP" >> .env
    echo "$(date): Added REACT_APP_SERVER_IP to .env" >> $LOG_FILE
fi

# Install dependencies and build
yarn install --frozen-lockfile >> $LOG_FILE 2>&1 || yarn install >> $LOG_FILE 2>&1
yarn build >> $LOG_FILE 2>&1

# Restart services
echo "$(date): Restarting services..." >> $LOG_FILE
supervisorctl restart facturatie-backend >> $LOG_FILE 2>&1
sleep 2
supervisorctl restart facturatie-frontend >> $LOG_FILE 2>&1
sleep 3

# Verify services are running
echo "$(date): Verifying services..." >> $LOG_FILE
BACKEND_STATUS=$(supervisorctl status facturatie-backend 2>/dev/null | grep -c "RUNNING")
FRONTEND_STATUS=$(supervisorctl status facturatie-frontend 2>/dev/null | grep -c "RUNNING")

if [ "$BACKEND_STATUS" -eq 0 ]; then
    echo "$(date): WARNING - Backend not running, retrying..." >> $LOG_FILE
    supervisorctl restart facturatie-backend >> $LOG_FILE 2>&1
    sleep 3
fi

if [ "$FRONTEND_STATUS" -eq 0 ]; then
    echo "$(date): WARNING - Frontend not running, retrying..." >> $LOG_FILE
    supervisorctl restart facturatie-frontend >> $LOG_FILE 2>&1
    sleep 3
fi

# Final status
echo "$(date): Final status:" >> $LOG_FILE
supervisorctl status >> $LOG_FILE 2>&1

echo "$(date): Deploy completed!" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
