#!/bin/bash

# =============================================================================
# Facturatie ERP - Automatisch Installatiescript voor CloudPanel
# =============================================================================
# 
# GEBRUIK:
#   1. Upload dit script naar uw server
#   2. chmod +x install.sh
#   3. sudo ./install.sh
#
# VEREISTEN:
#   - CloudPanel met Node.js en Python ondersteuning
#   - MongoDB (lokaal of extern)
#   - Nginx (wordt door CloudPanel beheerd)
#
# =============================================================================

set -e  # Stop bij fouten

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuratie - PAS DEZE AAN NAAR UW SITUATIE
INSTALL_DIR="/home/facturatie/htdocs/facturatie.sr"
DOMAIN="facturatie.sr"
BACKEND_PORT="8001"
USER="facturatie"
GROUP="facturatie"

# MongoDB configuratie
MONGO_URL="mongodb://localhost:27017"
DB_NAME="facturatie_production"

# JWT Secret (genereer een nieuwe voor productie!)
JWT_SECRET=$(openssl rand -hex 32)

# SMTP Configuratie (pas aan naar uw gegevens)
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="info@facturatie.sr"
SMTP_PASSWORD="UW_SMTP_WACHTWOORD"
SMTP_FROM="info@facturatie.sr"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Facturatie ERP - Installatie Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Functie om stappen te loggen
log_step() {
    echo -e "${GREEN}[STAP]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WAARSCHUWING]${NC} $1"
}

log_error() {
    echo -e "${RED}[FOUT]${NC} $1"
}

# Controleer of script als root draait
if [ "$EUID" -ne 0 ]; then 
    log_error "Dit script moet als root uitgevoerd worden (gebruik sudo)"
    exit 1
fi

# 1. Systeem updaten en vereisten installeren
log_step "Systeem vereisten controleren en installeren..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv nodejs npm mongodb-org curl git

# Controleer of MongoDB draait
if ! systemctl is-active --quiet mongod; then
    log_step "MongoDB starten..."
    systemctl start mongod
    systemctl enable mongod
fi

# 2. Installatie directory aanmaken
log_step "Installatie directory voorbereiden: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/backend"
mkdir -p "$INSTALL_DIR/frontend"
mkdir -p "$INSTALL_DIR/logs"

# 3. Backend installeren
log_step "Backend installeren..."
cd "$INSTALL_DIR/backend"

# Python virtual environment aanmaken
python3 -m venv venv
source venv/bin/activate

# Requirements installeren
cat > requirements.txt << 'EOF'
fastapi==0.110.1
uvicorn==0.25.0
motor==3.3.1
pymongo==4.5.0
python-jose==3.5.0
passlib==1.7.4
bcrypt==4.1.3
python-multipart==0.0.21
python-dotenv==1.2.1
pydantic==2.12.5
email-validator==2.3.0
reportlab==4.4.9
httpx==0.28.1
aiosmtplib==3.0.1
EOF

pip install --quiet -r requirements.txt

# .env bestand aanmaken voor backend
cat > .env << EOF
MONGO_URL="${MONGO_URL}"
DB_NAME="${DB_NAME}"
CORS_ORIGINS="https://${DOMAIN},https://www.${DOMAIN}"
JWT_SECRET="${JWT_SECRET}"

# Email SMTP Settings
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_FROM}
APP_URL=https://${DOMAIN}
EOF

deactivate

# 4. Frontend bouwen
log_step "Frontend bouwen..."
cd "$INSTALL_DIR/frontend"

# .env voor frontend
cat > .env << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF

# 5. Systemd service voor backend
log_step "Systemd service configureren..."
cat > /etc/systemd/system/facturatie-backend.service << EOF
[Unit]
Description=Facturatie ERP Backend API
After=network.target mongod.service

[Service]
Type=simple
User=${USER}
Group=${GROUP}
WorkingDirectory=${INSTALL_DIR}/backend
Environment="PATH=${INSTALL_DIR}/backend/venv/bin"
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port ${BACKEND_PORT}
Restart=always
RestartSec=10
StandardOutput=append:${INSTALL_DIR}/logs/backend.log
StandardError=append:${INSTALL_DIR}/logs/backend.error.log

[Install]
WantedBy=multi-user.target
EOF

# 6. Nginx configuratie voor CloudPanel
log_step "Nginx configuratie aanmaken..."
cat > /tmp/facturatie-nginx.conf << EOF
# Facturatie ERP - Nginx Configuratie
# Voeg dit toe aan uw CloudPanel site configuratie of /etc/nginx/sites-available/${DOMAIN}

# Backend API proxy
location /api {
    proxy_pass http://127.0.0.1:${BACKEND_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_read_timeout 86400;
}

# Frontend (React static files)
location / {
    root ${INSTALL_DIR}/frontend/build;
    try_files \$uri \$uri/ /index.html;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 7. Permissies instellen
log_step "Permissies instellen..."
chown -R ${USER}:${GROUP} "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod 600 "$INSTALL_DIR/backend/.env"

# 8. Services starten
log_step "Backend service starten..."
systemctl daemon-reload
systemctl enable facturatie-backend
systemctl start facturatie-backend

# 9. Installatie voltooien
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Installatie Voltooid!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Volgende stappen:${NC}"
echo ""
echo "1. ${YELLOW}Upload de applicatie bestanden:${NC}"
echo "   - Backend bestanden naar: ${INSTALL_DIR}/backend/"
echo "   - Frontend build naar: ${INSTALL_DIR}/frontend/build/"
echo ""
echo "2. ${YELLOW}Nginx configuratie:${NC}"
echo "   Voeg de inhoud van /tmp/facturatie-nginx.conf toe aan uw"
echo "   CloudPanel site configuratie voor ${DOMAIN}"
echo ""
echo "3. ${YELLOW}SSL Certificaat:${NC}"
echo "   Configureer Let's Encrypt via CloudPanel"
echo ""
echo "4. ${YELLOW}Backend .env aanpassen:${NC}"
echo "   nano ${INSTALL_DIR}/backend/.env"
echo "   - Pas SMTP_PASSWORD aan"
echo "   - Controleer MONGO_URL"
echo ""
echo "5. ${YELLOW}Service herstarten na wijzigingen:${NC}"
echo "   sudo systemctl restart facturatie-backend"
echo ""
echo "6. ${YELLOW}Logs bekijken:${NC}"
echo "   tail -f ${INSTALL_DIR}/logs/backend.log"
echo "   tail -f ${INSTALL_DIR}/logs/backend.error.log"
echo ""
echo -e "${GREEN}Nginx configuratie opgeslagen in: /tmp/facturatie-nginx.conf${NC}"
echo ""
