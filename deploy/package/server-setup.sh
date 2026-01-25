#!/bin/bash
# ===========================================
# Server Setup Script - Uitvoeren op de server
# ===========================================

set -e

INSTALL_DIR="/home/facturatie/htdocs/facturatie.sr"

echo "🚀 Facturatie ERP Server Setup"
echo "================================"

# 1. Directories aanmaken
echo "[1/6] Directories aanmaken..."
mkdir -p "$INSTALL_DIR/backend"
mkdir -p "$INSTALL_DIR/frontend"
mkdir -p "$INSTALL_DIR/logs"

# 2. Python venv aanmaken
echo "[2/6] Python virtual environment..."
cd "$INSTALL_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# 3. .env configureren
echo "[3/6] Configuratie..."
if [ -f ".env.template" ] && [ ! -f ".env" ]; then
    cp .env.template .env
    echo "⚠️  PAS AAN: $INSTALL_DIR/backend/.env"
fi

# 4. Permissies
echo "[4/6] Permissies instellen..."
chown -R facturatie:facturatie "$INSTALL_DIR"
chmod 600 "$INSTALL_DIR/backend/.env"
chmod +x "$INSTALL_DIR/backend/venv/bin/uvicorn"

# 5. Systemd service
echo "[5/6] Systemd service installeren..."
sudo cp facturatie-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable facturatie-backend
sudo systemctl start facturatie-backend

# 6. Status check
echo "[6/6] Status controleren..."
sleep 2
if systemctl is-active --quiet facturatie-backend; then
    echo "✅ Backend service draait!"
else
    echo "❌ Backend service niet gestart. Check logs:"
    echo "   sudo journalctl -u facturatie-backend -n 50"
fi

echo ""
echo "================================"
echo "✅ Setup voltooid!"
echo ""
echo "VOLGENDE STAPPEN:"
echo "1. Bewerk /home/facturatie/htdocs/facturatie.sr/backend/.env"
echo "2. Voeg nginx config toe via CloudPanel"
echo "3. Herstart: sudo systemctl restart facturatie-backend"
echo "4. Test: curl http://localhost:8001/api/health"
echo ""
