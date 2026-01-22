#!/bin/bash

# ========================================
# Facturatie N.V. - Volledige Auto-Installer
# ========================================

set -e

DOMAIN="vastgoed.facturatie.sr"
APP_USER="facturatie-vastgoed"
APP_DIR="/home/$APP_USER/htdocs/$DOMAIN"
GITHUB_URL="https://github.com/shyamkewalbansing-ai/rent.git"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║     FACTURATIE N.V. - AUTO INSTALLER            ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Voer uit met: sudo bash auto-install.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/8] Systeem pakketten...${NC}"
apt-get update -qq
apt-get install -y git python3 python3-pip python3-venv nodejs npm gnupg curl certbot python3-certbot-nginx -qq

echo -e "${YELLOW}[2/8] MongoDB...${NC}"
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null || true
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    apt-get update -qq
    apt-get install -y mongodb-org -qq
fi
systemctl start mongod 2>/dev/null || true
systemctl enable mongod 2>/dev/null || true

echo -e "${YELLOW}[3/8] Yarn...${NC}"
npm install -g yarn -q 2>/dev/null || true

echo -e "${YELLOW}[4/8] Gebruiker aanmaken...${NC}"
id "$APP_USER" &>/dev/null || useradd -m -s /bin/bash $APP_USER
mkdir -p /home/$APP_USER/htdocs

echo -e "${YELLOW}[5/8] Code downloaden...${NC}"
rm -rf $APP_DIR 2>/dev/null || true
git clone $GITHUB_URL $APP_DIR

echo -e "${YELLOW}[6/8] Backend configureren...${NC}"
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate

JWT_SECRET=$(openssl rand -hex 32)
cat > $APP_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie
JWT_SECRET=$JWT_SECRET
EOF

echo -e "${YELLOW}[7/8] Frontend bouwen...${NC}"
cd $APP_DIR/frontend
cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF
yarn install --silent 2>/dev/null
yarn build 2>/dev/null

echo -e "${YELLOW}[8/8] Services starten...${NC}"

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

cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
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
        client_max_body_size 10M;
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

chown -R www-data:www-data $APP_DIR/frontend/build

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}     ✅ INSTALLATIE VOLTOOID!              ${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "SSL certificaat installeren:"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Open daarna: https://$DOMAIN/register"
echo ""
