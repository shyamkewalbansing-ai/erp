#!/bin/bash
#===============================================================================
# SNELLE UPDATE SCRIPT
# 
# Voor snelle updates zonder volledige rebuild
# Gebruik dit wanneer je alleen backend code hebt gewijzigd
#===============================================================================

set -e

APP_DIR="/var/www/facturatie-nv"
BRANCH="main"

echo "🚀 Snelle update starten..."

cd "$APP_DIR"

# Pull latest code
echo "📥 Code ophalen..."
git fetch origin
git reset --hard "origin/$BRANCH"

# Restart backend only
echo "🔄 Backend herstarten..."
if command -v supervisorctl &> /dev/null; then
    supervisorctl restart facturatie-nv-backend
elif command -v systemctl &> /dev/null; then
    systemctl restart facturatie-nv-backend
else
    pkill -f "uvicorn server:app" || true
    cd backend
    source ../venv/bin/activate
    nohup uvicorn server:app --host 0.0.0.0 --port 8001 > /var/log/facturatie-backend.log 2>&1 &
fi

echo "✅ Update voltooid!"
