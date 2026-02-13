#!/bin/bash

# =============================================================================
# GITHUB WEBHOOK AUTO-DEPLOY SCRIPT v3.0
# Volledige sync met GitHub - verwijdert oude code, haalt alles nieuw op
# Locatie: /home/facturatie/htdocs/facturatie.sr/webhook-deploy.sh
# =============================================================================

# Configuratie
APP_DIR="/home/facturatie/htdocs/facturatie.sr"
LOG_FILE="$APP_DIR/logs/deploy.log"
LOCK_FILE="/tmp/facturatie-deploy.lock"
SERVER_IP="72.62.174.80"
GITHUB_BRANCH="main"

# Maak logs directory aan EERST
mkdir -p "$APP_DIR/logs"
touch "$LOG_FILE"

# Fix git safe directory
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

# Voorkom meerdere deploys tegelijk
if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
    if [ "$LOCK_AGE" -gt 600 ]; then
        echo "$(date): Stale lock removed (age: ${LOCK_AGE}s)" >> $LOG_FILE
        rm -f "$LOCK_FILE"
    else
        echo "$(date): Deploy already running, skipping..." >> $LOG_FILE
        exit 0
    fi
fi

trap "rm -f $LOCK_FILE" EXIT
touch $LOCK_FILE

echo "" >> $LOG_FILE
echo "============================================================" >> $LOG_FILE
echo "$(date): 🚀 VOLLEDIGE DEPLOY GESTART" >> $LOG_FILE
echo "============================================================" >> $LOG_FILE

cd $APP_DIR || exit 1

# =============================================================================
# STAP 1: VOLLEDIGE GIT SYNC
# =============================================================================
echo "$(date): [1/7] Git repository synchroniseren..." >> $LOG_FILE

# Fetch alle remote changes
git fetch origin --prune >> $LOG_FILE 2>&1

# Reset lokale wijzigingen en sync met remote (verwijdert oude code)
git reset --hard origin/$GITHUB_BRANCH >> $LOG_FILE 2>&1

# Verwijder ongetrackte bestanden BEHALVE logs en .env files
git clean -fd -e logs -e "*.env" -e ".env*" >> $LOG_FILE 2>&1

# Maak logs directory opnieuw aan (voor het geval git clean het verwijderde)
mkdir -p "$APP_DIR/logs"

# Log huidige commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "$(date): ✅ Git sync voltooid - commit: $CURRENT_COMMIT" >> $LOG_FILE

# =============================================================================
# STAP 2: BACKEND DEPENDENCIES
# =============================================================================
echo "$(date): [2/7] Backend dependencies updaten..." >> $LOG_FILE

cd $APP_DIR/backend

# Activeer virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    
    # Update pip
    pip install --upgrade pip -q >> $LOG_FILE 2>&1
    
    # Installeer/update alle dependencies
    pip install -r requirements.txt -q >> $LOG_FILE 2>&1
    
    deactivate
    echo "$(date): ✅ Backend dependencies geïnstalleerd" >> $LOG_FILE
else
    echo "$(date): ⚠️ Geen venv gevonden - backend dependencies overgeslagen" >> $LOG_FILE
fi

# =============================================================================
# STAP 3: FRONTEND DEPENDENCIES
# =============================================================================
echo "$(date): [3/7] Frontend dependencies updaten..." >> $LOG_FILE

cd $APP_DIR/frontend

# Verwijder oude node_modules cache
rm -rf node_modules/.cache 2>/dev/null || true

# Installeer dependencies
yarn install --frozen-lockfile >> $LOG_FILE 2>&1 || yarn install >> $LOG_FILE 2>&1

echo "$(date): ✅ Frontend dependencies geïnstalleerd" >> $LOG_FILE

# =============================================================================
# STAP 4: FRONTEND .ENV CONFIGURATIE
# =============================================================================
echo "$(date): [4/7] Frontend configuratie controleren..." >> $LOG_FILE

# Zorg ervoor dat SERVER_IP in .env staat
if ! grep -q "REACT_APP_SERVER_IP" .env 2>/dev/null; then
    echo "REACT_APP_SERVER_IP=$SERVER_IP" >> .env
    echo "$(date): ✅ REACT_APP_SERVER_IP toegevoegd aan .env" >> $LOG_FILE
fi

# =============================================================================
# STAP 5: FRONTEND BUILD
# =============================================================================
echo "$(date): [5/7] Frontend bouwen (kan even duren)..." >> $LOG_FILE

# Verwijder oude build
rm -rf build 2>/dev/null || true

# Build frontend
yarn build >> $LOG_FILE 2>&1

echo "$(date): ✅ Frontend build voltooid" >> $LOG_FILE

# =============================================================================
# STAP 6: SCRIPTS UITVOERBAAR MAKEN
# =============================================================================
echo "$(date): [6/7] Scripts configureren..." >> $LOG_FILE

cd $APP_DIR

# Maak alle scripts uitvoerbaar
chmod +x webhook-deploy.sh 2>/dev/null || true
chmod +x setup-domain.sh 2>/dev/null || true
chmod +x COMPLETE_INSTALL.sh 2>/dev/null || true

echo "$(date): ✅ Scripts geconfigureerd" >> $LOG_FILE

# =============================================================================
# STAP 7: SERVICES HERSTARTEN
# =============================================================================
echo "$(date): [7/7] Services herstarten..." >> $LOG_FILE

# Stop services
supervisorctl stop facturatie-backend >> $LOG_FILE 2>&1 || true
supervisorctl stop facturatie-frontend >> $LOG_FILE 2>&1 || true

sleep 2

# Start services
supervisorctl start facturatie-backend >> $LOG_FILE 2>&1
sleep 2
supervisorctl start facturatie-frontend >> $LOG_FILE 2>&1
sleep 3

# =============================================================================
# VERIFICATIE
# =============================================================================
echo "$(date): Services verifiëren..." >> $LOG_FILE

BACKEND_OK=$(supervisorctl status facturatie-backend 2>/dev/null | grep -c "RUNNING" || echo 0)
FRONTEND_OK=$(supervisorctl status facturatie-frontend 2>/dev/null | grep -c "RUNNING" || echo 0)

if [ "$BACKEND_OK" -eq 0 ]; then
    echo "$(date): ⚠️ Backend niet running, opnieuw proberen..." >> $LOG_FILE
    supervisorctl restart facturatie-backend >> $LOG_FILE 2>&1
    sleep 3
fi

if [ "$FRONTEND_OK" -eq 0 ]; then
    echo "$(date): ⚠️ Frontend niet running, opnieuw proberen..." >> $LOG_FILE
    supervisorctl restart facturatie-frontend >> $LOG_FILE 2>&1
    sleep 3
fi

# Final status
echo "" >> $LOG_FILE
echo "$(date): 📊 SERVICE STATUS:" >> $LOG_FILE
supervisorctl status >> $LOG_FILE 2>&1

# =============================================================================
# CLEANUP
# =============================================================================
echo "$(date): Cleanup uitvoeren..." >> $LOG_FILE

# Verwijder oude logs (ouder dan 7 dagen)
find $APP_DIR/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Verwijder npm/yarn cache
rm -rf ~/.npm/_cacache 2>/dev/null || true
rm -rf ~/.cache/yarn 2>/dev/null || true

echo "" >> $LOG_FILE
echo "============================================================" >> $LOG_FILE
echo "$(date): ✅ DEPLOY SUCCESVOL VOLTOOID!" >> $LOG_FILE
echo "$(date): Commit: $CURRENT_COMMIT" >> $LOG_FILE
echo "============================================================" >> $LOG_FILE
