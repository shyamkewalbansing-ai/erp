#!/bin/bash

# ========================================
# Facturatie N.V. - Volledige Auto-Installer
# Één script voor complete installatie
# ========================================

set -e

# Configuratie
DOMAIN="vastgoed.facturatie.sr"
APP_USER="facturatie-vastgoed"
APP_DIR="/home/$APP_USER/htdocs/$DOMAIN"

# Kleuren
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║                                                  ║"
echo "║     FACTURATIE N.V. - AUTO INSTALLER            ║"
echo "║     Volledige installatie in 1 klik             ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[FOUT] Voer uit met: sudo ./auto-install.sh${NC}"
    exit 1
fi

# Vraag GitHub URL
echo ""
echo -e "${YELLOW}Voer uw GitHub repository URL in:${NC}"
echo -e "(Eerst 'Save to GitHub' klikken in Emergent)"
echo ""
read -p "GitHub URL: " GITHUB_URL

if [ -z "$GITHUB_URL" ]; then
    echo -e "${RED}[FOUT] GitHub URL is verplicht!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Installatie gestart...${NC}"
echo ""

# ============================================
# STAP 1: Systeem pakketten
# ============================================
echo -e "${YELLOW}[1/8] Systeem pakketten installeren...${NC}"
apt-get update -qq
apt-get install -y git python3 python3-pip python3-venv nodejs npm gnupg curl certbot python3-certbot-nginx -qq

# ============================================
# STAP 2: MongoDB installeren
# ============================================
echo -e "${YELLOW}[2/8] MongoDB installeren...${NC}"
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null || true
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    apt-get update -qq
    apt-get install -y mongodb-org -qq
fi
systemctl start mongod 2>/dev/null || true
systemctl enable mongod 2>/dev/null || true
echo -e "   MongoDB: ${GREEN}OK${NC}"

# ============================================
# STAP 3: Yarn installeren
# ============================================
echo -e "${YELLOW}[3/8] Yarn installeren...${NC}"
if ! command -v yarn &> /dev/null; then
    npm install -g yarn -q
fi
echo -e "   Yarn: ${GREEN}OK${NC}"

# ============================================
# STAP 4: Gebruiker en map aanmaken
# ============================================
echo -e "${YELLOW}[4/8] App gebruiker aanmaken...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
fi
mkdir -p /home/$APP_USER/htdocs
echo -e "   Gebruiker: ${GREEN}OK${NC}"

# ============================================
# STAP 5: Code downloaden van GitHub
# ============================================
echo -e "${YELLOW}[5/8] Code downloaden van GitHub...${NC}"
if [ -d "$APP_DIR" ]; then
    rm -rf $APP_DIR
fi
git clone $GITHUB_URL $APP_DIR
echo -e "   Download: ${GREEN}OK${NC}"

# ============================================
# STAP 6: Backend configureren
# ============================================
echo -e "${YELLOW}[6/8] Backend configureren...${NC}"
cd $APP_DIR/backend

# Virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate

# Backend .env
JWT_SECRET=$(openssl rand -hex 32)
cat > $APP_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie
JWT_SECRET=$JWT_SECRET
EOF

echo -e "   Backend: ${GREEN}OK${NC}"

# ============================================
# STAP 7: Frontend configureren
# ============================================
echo -e "${YELLOW}[7/8] Frontend bouwen (dit duurt even)...${NC}"
cd $APP_DIR/frontend

# Frontend .env
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

yarn install --silent 2>/dev/null
yarn build 2>/dev/null
echo -e "   Frontend: ${GREEN}OK${NC}"

# ============================================
# STAP 8: Services configureren
# ============================================
echo -e "${YELLOW}[8/8] Services configureren...${NC}"

# Systemd service
cat > /etc/systemd/system/facturatie.service << EOF
[Unit]
Description=Facturatie N.V. Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/venv/bin
ExecStart=$APP_DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable facturatie
systemctl start facturatie

# Nginx configuratie
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    root $APP_DIR/frontend/build;
    index index.html;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        client_max_body_size 10M;
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Permissies
chown -R www-data:www-data $APP_DIR/frontend/build
chmod -R 755 $APP_DIR

nginx -t && systemctl reload nginx
echo -e "   Services: ${GREEN}OK${NC}"

# ============================================
# SSL Certificaat
# ============================================
echo ""
echo -e "${YELLOW}SSL Certificaat installeren...${NC}"
echo -e "(Zorg dat DNS A-record wijst naar deze server)"
echo ""
read -p "SSL nu installeren? (j/n): " INSTALL_SSL

if [ "$INSTALL_SSL" = "j" ] || [ "$INSTALL_SSL" = "J" ]; then
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || true
fi

# ============================================
# KLAAR!
# ============================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗"
echo "║                                                  ║"
echo "║          ✅ INSTALLATIE VOLTOOID!               ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Open nu: ${GREEN}https://$DOMAIN/register${NC}"
echo ""
echo -e "De eerste gebruiker wordt automatisch ${YELLOW}Super Admin${NC}!"
echo ""
echo -e "${YELLOW}Handige commando's:${NC}"
echo "  sudo systemctl restart facturatie  - Backend herstarten"
echo "  sudo journalctl -u facturatie -f   - Logs bekijken"
echo ""
