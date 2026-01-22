#!/bin/bash

# ========================================
# Facturatie N.V. - Installatie Script
# Voor CloudPanel Server
# ========================================

set -e

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║     Facturatie N.V. - Installatie          ║"
echo "║     Verhuurbeheersysteem                   ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Dit script moet als root worden uitgevoerd (sudo)${NC}"
    exit 1
fi

# Vraag om domein
echo -e "${YELLOW}Voer uw domeinnaam in (bijv. facturatie.uwbedrijf.com):${NC}"
read -p "Domein: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domein is verplicht!${NC}"
    exit 1
fi

# Vraag om server IP voor DNS instructies
echo -e "${YELLOW}Wat is het IP-adres van uw server?${NC}"
read -p "Server IP: " SERVER_IP

if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UW_SERVER_IP")
fi

# Basis variabelen
APP_DIR="/home/cloudpanel/htdocs/facturatie"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo -e "${BLUE}[1/7] Systeem pakketten installeren...${NC}"
apt-get update
apt-get install -y python3 python3-pip python3-venv nodejs npm gnupg curl

# MongoDB installeren als het niet bestaat
if ! command -v mongod &> /dev/null; then
    echo -e "${BLUE}[1/7] MongoDB installeren...${NC}"
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
fi

# Yarn installeren als het niet bestaat
if ! command -v yarn &> /dev/null; then
    npm install -g yarn
fi

echo -e "${BLUE}[2/7] Backend configureren...${NC}"

# Python virtual environment
cd $BACKEND_DIR
python3 -m venv venv
source venv/bin/activate

# Requirements installeren
pip install --upgrade pip
pip install -r requirements.txt

# Backend .env maken
JWT_SECRET=$(openssl rand -hex 32)
cat > $BACKEND_DIR/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie
JWT_SECRET=$JWT_SECRET
EOF

deactivate

echo -e "${BLUE}[3/7] Frontend configureren...${NC}"

cd $FRONTEND_DIR

# Frontend .env maken
cat > $FRONTEND_DIR/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

# Frontend bouwen
yarn install
yarn build

echo -e "${BLUE}[4/7] Systemd service aanmaken...${NC}"

cat > /etc/systemd/system/facturatie.service << EOF
[Unit]
Description=Facturatie N.V. Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/venv/bin
ExecStart=$BACKEND_DIR/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable facturatie
systemctl start facturatie

echo -e "${BLUE}[5/7] Nginx configuratie aanmaken...${NC}"

# Nginx config
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS (na SSL certificaat)
    # return 301 https://\$server_name\$request_uri;
    
    # Frontend (React build)
    root $FRONTEND_DIR/build;
    index index.html;
    
    # API routes naar backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
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
    
    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Activeer de site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo -e "${BLUE}[6/7] Permissies instellen...${NC}"
chown -R www-data:www-data $FRONTEND_DIR/build
chmod -R 755 $FRONTEND_DIR/build

echo -e "${BLUE}[7/7] Status controleren...${NC}"
sleep 2

# Check services
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗"
echo -e "║          INSTALLATIE VOLTOOID!             ║"
echo -e "╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}=== Service Status ===${NC}"
systemctl status facturatie --no-pager -l | head -5
echo ""
systemctl status mongod --no-pager -l | head -5
echo ""

echo -e "${YELLOW}=== DNS Configuratie ===${NC}"
echo -e "Voeg dit A-record toe bij uw domeinprovider:"
echo -e "  ${GREEN}Type: A${NC}"
echo -e "  ${GREEN}Naam: $DOMAIN${NC}"
echo -e "  ${GREEN}Waarde: $SERVER_IP${NC}"
echo ""

echo -e "${YELLOW}=== SSL Certificaat (BELANGRIJK!) ===${NC}"
echo -e "Voer dit commando uit nadat DNS is geconfigureerd:"
echo -e "  ${GREEN}sudo certbot --nginx -d $DOMAIN${NC}"
echo ""
echo -e "Of via CloudPanel:"
echo -e "  1. Open CloudPanel: https://$SERVER_IP:8443"
echo -e "  2. Ga naar Sites → $DOMAIN → SSL/TLS"
echo -e "  3. Klik op 'New Let's Encrypt Certificate'"
echo ""

echo -e "${YELLOW}=== Volgende Stappen ===${NC}"
echo -e "1. Configureer DNS A-record"
echo -e "2. Wacht 5-10 minuten op DNS propagatie"
echo -e "3. Installeer SSL certificaat"
echo -e "4. Open https://$DOMAIN/register"
echo -e "5. Maak uw eerste account aan (wordt automatisch admin!)"
echo ""

echo -e "${YELLOW}=== Handige Commando's ===${NC}"
echo -e "  Backend herstarten:  ${GREEN}sudo systemctl restart facturatie${NC}"
echo -e "  Logs bekijken:       ${GREEN}sudo journalctl -u facturatie -f${NC}"
echo -e "  Status controleren:  ${GREEN}sudo systemctl status facturatie${NC}"
echo ""
