#!/bin/bash

# =============================================================================
# GITHUB WEBHOOK AUTO-DEPLOY SCRIPT
# Dit script wordt aangeroepen door de webhook wanneer je naar GitHub pusht
# =============================================================================

APP_DIR="APP_DIR_PLACEHOLDER"
LOG_FILE="$APP_DIR/logs/deploy.log"
LOCK_FILE="/tmp/facturatie-deploy.lock"

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

# Rebuild frontend
echo "$(date): Rebuilding frontend..." >> $LOG_FILE
cd $APP_DIR/frontend
yarn install --silent >> $LOG_FILE 2>&1
yarn build --silent >> $LOG_FILE 2>&1

# Restart services
echo "$(date): Restarting services..." >> $LOG_FILE
supervisorctl restart all >> $LOG_FILE 2>&1

# Cleanup
rm -f $LOCK_FILE

echo "$(date): Deploy completed successfully!" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
