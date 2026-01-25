#!/bin/bash

# =============================================================================
#  FACTURATIE ERP - ÉÉN-KLIK INSTALLATIE
# =============================================================================
#  
#  GEBRUIK: Kopieer en plak dit commando op uw server:
#
#  curl -sSL https://raw.githubusercontent.com/shyamkewalbansing-ai/erp/main/install.sh | sudo bash
#
# =============================================================================

set -e

# Configuratie
GITHUB_REPO="https://github.com/shyamkewalbansing-ai/erp.git"
INSTALL_DIR="/home/facturatie/htdocs/facturatie.sr"
DOMAIN="facturatie.sr"
BACKEND_PORT="8001"

# Kleuren
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║   ${GREEN}███████╗ █████╗  ██████╗████████╗██╗   ██╗██████╗${CYAN}        ║${NC}"
echo -e "${CYAN}║   ${GREEN}██╔════╝██╔══██╗██╔════╝╚══██╔══╝██║   ██║██╔══██╗${CYAN}       ║${NC}"
echo -e "${CYAN}║   ${GREEN}█████╗  ███████║██║        ██║   ██║   ██║██████╔╝${CYAN}       ║${NC}"
echo -e "${CYAN}║   ${GREEN}██╔══╝  ██╔══██║██║        ██║   ██║   ██║██╔══██╗${CYAN}       ║${NC}"
echo -e "${CYAN}║   ${GREEN}██║     ██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║${CYAN}       ║${NC}"
echo -e "${CYAN}║   ${GREEN}╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝${CYAN}       ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║            ${NC}ERP Automatische Installatie${CYAN}                    ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[→]${NC} $1"; }

# Check root
if [ "$EUID" -ne 0 ]; then
    error "Voer uit met sudo: curl -sSL ... | sudo bash"
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    error "Kan OS niet detecteren"
fi

echo -e "${YELLOW}Gedetecteerd OS: $OS${NC}"
echo ""

# ============================================
# STAP 1: Systeem updaten
# ============================================
step "Stap 1/8: Systeem updaten..."
apt-get update -qq
apt-get upgrade -y -qq
log "Systeem bijgewerkt"

# ============================================
# STAP 2: Basis packages installeren
# ============================================
step "Stap 2/8: Basis packages installeren..."
apt-get install -y -qq \
    git \
    curl \
    wget \
    gnupg \
    ca-certificates \
    build-essential \
    python3 \
    python3-pip \
    python3-venv
log "Basis packages geïnstalleerd"

# ============================================
# STAP 3: Node.js installeren
# ============================================
step "Stap 3/8: Node.js installeren..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
log "Node.js $(node -v) geïnstalleerd"

# ============================================
# STAP 4: MongoDB installeren
# ============================================
step "Stap 4/8: MongoDB installeren..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org
fi
systemctl start mongod 2>/dev/null || true
systemctl enable mongod 2>/dev/null || true
log "MongoDB geïnstalleerd en gestart"

# ============================================
# STAP 5: Code downloaden van GitHub
# ============================================
step "Stap 5/8: Code downloaden van GitHub..."

# Maak directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$(dirname $INSTALL_DIR)"

# Clone of pull
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull origin main
    log "Code bijgewerkt"
else
    # Backup bestaande bestanden indien aanwezig
    if [ -d "$INSTALL_DIR" ] && [ "$(ls -A $INSTALL_DIR)" ]; then
        mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d%H%M%S)"
    fi
    git clone "$GITHUB_REPO" "$INSTALL_DIR"
    log "Code gedownload"
fi

cd "$INSTALL_DIR"

# ============================================
# STAP 6: Backend installeren
# ============================================
step "Stap 6/8: Backend installeren..."
cd "$INSTALL_DIR/backend"

# Python venv
python3 -m venv venv
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate

# .env aanmaken als niet bestaat
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > .env << ENVEOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="facturatie_production"
CORS_ORIGINS="https://${DOMAIN},https://www.${DOMAIN},http://localhost:3000"
JWT_SECRET="${JWT_SECRET}"

# Email SMTP Settings - PAS DIT AAN!
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@facturatie.sr
SMTP_PASSWORD=VERANDER_DIT_WACHTWOORD
SMTP_FROM=info@facturatie.sr
APP_URL=https://${DOMAIN}
ENVEOF
    warn "Backend .env aangemaakt - vergeet niet SMTP_PASSWORD aan te passen!"
fi

log "Backend geïnstalleerd"

# ============================================
# STAP 7: Frontend bouwen
# ============================================
step "Stap 7/8: Frontend bouwen..."
cd "$INSTALL_DIR/frontend"

# .env voor productie
cat > .env << ENVEOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
ENVEOF

# Dependencies en build
npm install --silent 2>/dev/null || yarn install --silent
npm run build 2>/dev/null || yarn build

log "Frontend gebouwd"

# ============================================
# STAP 8: Services configureren
# ============================================
step "Stap 8/8: Services configureren..."

# Logs directory
mkdir -p "$INSTALL_DIR/logs"

# Systemd service
cat > /etc/systemd/system/facturatie-backend.service << SERVICEEOF
[Unit]
Description=Facturatie ERP Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/backend
Environment="PATH=${INSTALL_DIR}/backend/venv/bin"
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port ${BACKEND_PORT} --workers 2
Restart=always
RestartSec=5
StandardOutput=append:${INSTALL_DIR}/logs/backend.log
StandardError=append:${INSTALL_DIR}/logs/backend.error.log

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Start service
systemctl daemon-reload
systemctl enable facturatie-backend
systemctl restart facturatie-backend

log "Backend service gestart"

# Nginx config opslaan
cat > "$INSTALL_DIR/nginx-cloudpanel.conf" << 'NGINXEOF'
# =====================================================
# KOPIEER DIT NAAR CLOUDPANEL VHOST CONFIGURATIE
# =====================================================

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
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
}

location / {
    root /home/facturatie/htdocs/facturatie.sr/frontend/build;
    try_files $uri $uri/ /index.html;
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# ============================================
# KLAAR!
# ============================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║   ✅  INSTALLATIE VOLTOOID!                                ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}                    LAATSTE STAPPEN                          ${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}1.${NC} ${BLUE}SMTP Wachtwoord instellen:${NC}"
echo "   nano $INSTALL_DIR/backend/.env"
echo "   → Verander SMTP_PASSWORD=VERANDER_DIT_WACHTWOORD"
echo ""
echo -e "${CYAN}2.${NC} ${BLUE}CloudPanel Nginx configureren:${NC}"
echo "   → Login op CloudPanel"
echo "   → Sites → ${DOMAIN} → Vhost"
echo "   → Kopieer inhoud van: $INSTALL_DIR/nginx-cloudpanel.conf"
echo "   → Plak in de 'Custom Nginx Directives' sectie"
echo "   → Klik 'Save'"
echo ""
echo -e "${CYAN}3.${NC} ${BLUE}Backend herstarten (na wijzigingen):${NC}"
echo "   sudo systemctl restart facturatie-backend"
echo ""
echo -e "${CYAN}4.${NC} ${BLUE}Status controleren:${NC}"
echo "   sudo systemctl status facturatie-backend"
echo "   curl http://localhost:8001/api/health"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Nginx config opgeslagen in:${NC}"
echo "   $INSTALL_DIR/nginx-cloudpanel.conf"
echo ""
echo -e "${GREEN}Logs bekijken:${NC}"
echo "   tail -f $INSTALL_DIR/logs/backend.log"
echo ""
