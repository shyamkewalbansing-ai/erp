#!/bin/bash

# =============================================================================
# GITHUB WEBHOOK AUTO-DEPLOY SCRIPT
# Dit script wordt aangeroepen door de webhook wanneer je naar GitHub pusht
# =============================================================================

APP_DIR="APP_DIR_PLACEHOLDER"
LOG_FILE="$APP_DIR/logs/deploy.log"
LOCK_FILE="/tmp/facturatie-deploy.lock"

# Server IP - pas dit aan naar jouw server IP
SERVER_IP="72.62.174.80"

# Voorkom meerdere deploys tegelijk
if [ -f "$LOCK_FILE" ]; then
    echo "$(date): Deploy already running, skipping..." >> $LOG_FILE
    exit 0
fi

touch $LOCK_FILE

echo "" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
echo "$(date): Starting auto-deploy..." >> $LOG_FILE
echo "========================================" >> $LOG_FILE

cd $APP_DIR

# Pull latest code
echo "$(date): Pulling latest code from GitHub..." >> $LOG_FILE
git pull origin main >> $LOG_FILE 2>&1

# Update backend
echo "$(date): Updating backend dependencies..." >> $LOG_FILE
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt -q >> $LOG_FILE 2>&1
deactivate

# Ensure frontend .env has correct SERVER_IP
echo "$(date): Checking frontend .env configuration..." >> $LOG_FILE
cd $APP_DIR/frontend
if ! grep -q "REACT_APP_SERVER_IP" .env 2>/dev/null; then
    echo "REACT_APP_SERVER_IP=$SERVER_IP" >> .env
    echo "$(date): Added REACT_APP_SERVER_IP to .env" >> $LOG_FILE
fi

# Rebuild frontend
echo "$(date): Rebuilding frontend..." >> $LOG_FILE
yarn install --silent >> $LOG_FILE 2>&1
yarn build >> $LOG_FILE 2>&1

# Restart services
echo "$(date): Restarting services..." >> $LOG_FILE
supervisorctl restart all >> $LOG_FILE 2>&1

# Wait for services to start
sleep 5

# Check service status
echo "$(date): Checking service status..." >> $LOG_FILE
supervisorctl status >> $LOG_FILE 2>&1

# Double check - if services not running, restart again
if ! supervisorctl status facturatie-backend | grep -q "RUNNING"; then
    echo "$(date): Backend not running, restarting again..." >> $LOG_FILE
    supervisorctl restart facturatie-backend >> $LOG_FILE 2>&1
    sleep 3
fi

if ! supervisorctl status facturatie-frontend | grep -q "RUNNING"; then
    echo "$(date): Frontend not running, restarting again..." >> $LOG_FILE
    supervisorctl restart facturatie-frontend >> $LOG_FILE 2>&1
    sleep 3
fi

# Final status check
echo "$(date): Final service status:" >> $LOG_FILE
supervisorctl status >> $LOG_FILE 2>&1

# Cleanup
rm -f $LOCK_FILE

echo "$(date): Deploy completed successfully!" >> $LOG_FILE
echo "========================================"  >> $LOG_FILE
