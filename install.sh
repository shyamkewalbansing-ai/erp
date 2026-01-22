#!/bin/bash

#############################################
#  SuriRentals - Automatische Installatie   #
#  Voor CloudPanel servers                  #
#############################################

set -e

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║     SuriRentals Installatie Script         ║"
echo "║     Versie 1.0 - CloudPanel                ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Detecteer huidige map (waar het script wordt uitgevoerd)
INSTALL_DIR="$(pwd)"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"

echo -e "${GREEN}Installatie map: $INSTALL_DIR${NC}"
echo ""

# Controleer of backend en frontend mappen bestaan
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}FOUT: Backend map niet gevonden: $BACKEND_DIR${NC}"
    echo -e "Zorg ervoor dat u het script uitvoert in de surirentals hoofdmap."
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}FOUT: Frontend map niet gevonden: $FRONTEND_DIR${NC}"
    echo -e "Zorg ervoor dat u het script uitvoert in de surirentals hoofdmap."
    exit 1
fi

# Variabelen - VRAAG AAN GEBRUIKER
read -p "Voer uw domein in (bijv. surirentals.facturatie.sr): " DOMAIN
read -p "Voer een veilig JWT wachtwoord in (of druk Enter voor automatisch): " JWT_SECRET

if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo -e "${YELLOW}JWT Secret automatisch gegenereerd${NC}"
fi

echo ""
echo -e "${YELLOW}Stap 1/8: Systeem updaten...${NC}"
sudo apt update

echo ""
echo -e "${YELLOW}Stap 2/8: MongoDB installeren...${NC}"
if ! command -v mongod &> /dev/null; then
    sudo apt install -y gnupg curl
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor 2>/dev/null || true
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
    echo -e "${GREEN}✓ MongoDB geïnstalleerd${NC}"
else
    echo -e "${GREEN}✓ MongoDB is al geïnstalleerd${NC}"
fi

echo ""
echo -e "${YELLOW}Stap 3/8: Python installeren...${NC}"

# Check welke Python beschikbaar is
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
    echo -e "${GREEN}✓ Python 3.11 gevonden${NC}"
elif command -v python3.10 &> /dev/null; then
    PYTHON_CMD="python3.10"
    echo -e "${GREEN}✓ Python 3.10 gevonden${NC}"
elif command -v python3.9 &> /dev/null; then
    PYTHON_CMD="python3.9"
    echo -e "${GREEN}✓ Python 3.9 gevonden${NC}"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo -e "${GREEN}✓ Python 3 gevonden${NC}"
else
    echo -e "${YELLOW}Python niet gevonden, installeren via deadsnakes PPA...${NC}"
    sudo apt install -y software-properties-common
    sudo add-apt-repository -y ppa:deadsnakes/ppa
    sudo apt update
    sudo apt install -y python3.11 python3.11-venv python3.11-dev
    PYTHON_CMD="python3.11"
    echo -e "${GREEN}✓ Python 3.11 geïnstalleerd${NC}"
fi

# Installeer venv als dat nog niet bestaat
sudo apt install -y python3-venv python3-pip -qq 2>/dev/null || true

echo -e "${GREEN}✓ Python is klaar (${PYTHON_CMD})${NC}"

echo ""
echo -e "${YELLOW}Stap 4/8: Node.js 20 installeren...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    sudo npm install -g yarn
    echo -e "${GREEN}✓ Node.js en Yarn geïnstalleerd${NC}"
else
    echo -e "${GREEN}✓ Node.js is al geïnstalleerd${NC}"
fi

echo ""
echo -e "${YELLOW}Stap 5/8: Backend configureren...${NC}"
cd $BACKEND_DIR

# Virtual environment maken met beschikbare Python
$PYTHON_CMD -m venv venv
source venv/bin/activate

# Dependencies
pip install --upgrade pip -q
pip install -r requirements.txt -q

# .env bestand
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=surirentals
JWT_SECRET=$JWT_SECRET
EOF

deactivate
echo -e "${GREEN}✓ Backend geconfigureerd${NC}"

echo ""
echo -e "${YELLOW}Stap 6/8: Frontend bouwen...${NC}"
cd $FRONTEND_DIR

# .env bestand
cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

# Dependencies en build
yarn install --silent
yarn build

echo -e "${GREEN}✓ Frontend gebouwd${NC}"

echo ""
echo -e "${YELLOW}Stap 7/8: Systemd service aanmaken...${NC}"
sudo tee /etc/systemd/system/surirentals.service > /dev/null << EOF
[Unit]
Description=SuriRentals Backend API
After=network.target mongod.service

[Service]
Type=simple
User=clp
Group=clp
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin"
ExecStart=$BACKEND_DIR/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable surirentals
sudo systemctl start surirentals

echo -e "${GREEN}✓ Backend service gestart${NC}"

echo ""
echo -e "${YELLOW}Stap 8/8: Nginx configuratie...${NC}"
sudo tee /etc/nginx/sites-enabled/$DOMAIN.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    root $FRONTEND_DIR/build;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

echo -e "${GREEN}✓ Nginx geconfigureerd${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ INSTALLATIE VOLTOOID!${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo -e "Nog te doen:"
echo -e "1. ${YELLOW}SSL Certificaat aanvragen in CloudPanel${NC}"
echo -e "   - Ga naar Sites → $DOMAIN → SSL/TLS"
echo -e "   - Klik op 'New Let's Encrypt Certificate'"
echo ""
echo -e "2. ${YELLOW}Nginx herladen:${NC}"
echo -e "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo -e "3. ${YELLOW}Open uw browser:${NC}"
echo -e "   https://$DOMAIN/register"
echo ""
echo -e "4. ${YELLOW}Eerste gebruiker = Super Admin!${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
