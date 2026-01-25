#!/bin/bash

# =============================================================================
# FACTURATIE ERP - SNELLE INSTALLATIE
# =============================================================================
# 
# Dit script doet ALLES automatisch:
# 1. Installeert vereisten (Python, Node, MongoDB)
# 2. Configureert de applicatie
# 3. Start de services
#
# GEBRUIK:
#   wget https://raw.githubusercontent.com/.../quick-install.sh
#   chmod +x quick-install.sh
#   sudo ./quick-install.sh
#
# OF kopieer dit script naar uw server en voer uit
# =============================================================================

set -e

# CONFIGURATIE - PAS DIT AAN!
DOMAIN="facturatie.sr"
INSTALL_DIR="/home/facturatie/htdocs/facturatie.sr"
BACKEND_PORT="8001"
MONGO_URL="mongodb://localhost:27017"
DB_NAME="facturatie_production"

# SMTP (pas aan)
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="info@facturatie.sr"
SMTP_PASSWORD="VERANDER_DIT"

# Kleuren
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                   ║${NC}"
    echo -e "${BLUE}║   ${GREEN}FACTURATIE ERP${BLUE}                                 ║${NC}"
    echo -e "${BLUE}║   ${NC}Automatische Installatie${BLUE}                        ║${NC}"
    echo -e "${BLUE}║                                                   ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
}

log() {
    echo -e "${GREEN}►${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Check root
if [ "$EUID" -ne 0 ]; then
    error "Voer dit script uit met sudo: sudo $0"
fi

print_banner

# 1. Systeem voorbereiden
log "Systeem updaten..."
apt-get update -qq

# 2. MongoDB installeren als niet aanwezig
if ! command -v mongod &> /dev/null; then
    log "MongoDB installeren..."
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org
    systemctl start mongod
    systemctl enable mongod
    success "MongoDB geïnstalleerd en gestart"
else
    success "MongoDB is al geïnstalleerd"
fi

# 3. Python en Node.js
log "Python en Node.js installeren..."
apt-get install -y -qq python3 python3-pip python3-venv nodejs npm curl

# 4. Directory structuur
log "Directories aanmaken..."
mkdir -p "$INSTALL_DIR"/{backend,frontend,logs}

# 5. Backend requirements
log "Backend dependencies installeren..."
cd "$INSTALL_DIR/backend"

# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Requirements
cat > requirements.txt << 'REQS'
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
REQS

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate

# 6. Backend .env
log "Backend configuratie..."
JWT_SECRET=$(openssl rand -hex 32)

cat > "$INSTALL_DIR/backend/.env" << ENVFILE
MONGO_URL="${MONGO_URL}"
DB_NAME="${DB_NAME}"
CORS_ORIGINS="https://${DOMAIN},https://www.${DOMAIN},http://localhost:3000"
JWT_SECRET="${JWT_SECRET}"

# Email SMTP Settings
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_USER}
APP_URL=https://${DOMAIN}
ENVFILE

chmod 600 "$INSTALL_DIR/backend/.env"

# 7. Systemd service
log "Backend service configureren..."
cat > /etc/systemd/system/facturatie-backend.service << SERVICE
[Unit]
Description=Facturatie ERP Backend
After=network.target mongod.service

[Service]
Type=simple
User=facturatie
Group=facturatie
WorkingDirectory=${INSTALL_DIR}/backend
Environment="PATH=${INSTALL_DIR}/backend/venv/bin"
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port ${BACKEND_PORT} --workers 2
Restart=always
RestartSec=5
StandardOutput=append:${INSTALL_DIR}/logs/backend.log
StandardError=append:${INSTALL_DIR}/logs/backend.error.log

[Install]
WantedBy=multi-user.target
SERVICE

# 8. Nginx configuratie hint
log "Nginx configuratie aanmaken..."
cat > "$INSTALL_DIR/nginx-config.txt" << 'NGINX'
# =====================================================
# NGINX CONFIGURATIE - Voeg toe aan CloudPanel Vhost
# =====================================================

# Backend API
location /api {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}

# Frontend
location / {
    root /home/facturatie/htdocs/facturatie.sr/frontend;
    try_files $uri $uri/ /index.html;
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

# 9. Permissies
log "Permissies instellen..."
chown -R facturatie:facturatie "$INSTALL_DIR" 2>/dev/null || true

# 10. Services
log "Services starten..."
systemctl daemon-reload
systemctl enable facturatie-backend

# Check if server.py exists before starting
if [ -f "$INSTALL_DIR/backend/server.py" ]; then
    systemctl start facturatie-backend
    success "Backend service gestart"
else
    warn "server.py niet gevonden - upload eerst de applicatie bestanden"
fi

# Klaar!
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   INSTALLATIE VOLTOOID!                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}VOLGENDE STAPPEN:${NC}"
echo ""
echo "1. ${BLUE}Upload applicatie bestanden:${NC}"
echo "   - Backend (server.py) → $INSTALL_DIR/backend/"
echo "   - Frontend (build/)   → $INSTALL_DIR/frontend/"
echo ""
echo "2. ${BLUE}Configureer SMTP wachtwoord:${NC}"
echo "   nano $INSTALL_DIR/backend/.env"
echo ""
echo "3. ${BLUE}Nginx configureren via CloudPanel:${NC}"
echo "   Kopieer inhoud van: $INSTALL_DIR/nginx-config.txt"
echo "   Plak in CloudPanel → Sites → $DOMAIN → Vhost"
echo ""
echo "4. ${BLUE}Backend herstarten:${NC}"
echo "   sudo systemctl restart facturatie-backend"
echo ""
echo "5. ${BLUE}Status controleren:${NC}"
echo "   sudo systemctl status facturatie-backend"
echo "   curl http://localhost:${BACKEND_PORT}/api/health"
echo ""
echo -e "${GREEN}Veel succes!${NC}"
echo ""
