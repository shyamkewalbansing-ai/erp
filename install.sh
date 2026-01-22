#!/bin/bash

# ========================================
# Facturatie N.V. - Installatie Script
# ========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║     Facturatie N.V. - Installatie          ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Vaste instellingen
APP_DIR="/home/facturatie-vastgoed/htdocs/vastgoed.facturatie.sr"
DOMAIN="vastgoed.facturatie.sr"

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "Dit script moet als root worden uitgevoerd (sudo)"
    exit 1
fi

echo "[1/6] Pakketten installeren..."
apt-get update -qq
apt-get install -y python3 python3-pip python3-venv nodejs npm gnupg curl -qq

# MongoDB
if ! command -v mongod &> /dev/null; then
    echo "[1/6] MongoDB installeren..."
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y mongodb-org -qq
    systemctl start mongod
    systemctl enable mongod
fi

# Yarn
if ! command -v yarn &> /dev/null; then
    npm install -g yarn -q
fi

echo "[2/6] Backend configureren..."
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Backend .env
JWT_SECRET=$(openssl rand -hex 32)
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie
JWT_SECRET=$JWT_SECRET
EOF
deactivate

echo "[3/6] Frontend configureren..."
cd $APP_DIR/frontend
cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF
yarn install --silent
yarn build

echo "[4/6] Service aanmaken..."
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

echo "[5/6] Nginx configureren..."
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
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "[6/6] Permissies instellen..."
chown -R www-data:www-data $APP_DIR/frontend/build

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}       INSTALLATIE VOLTOOID!                ${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "Volgende stap: SSL certificaat installeren"
echo ""
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Daarna openen: https://$DOMAIN/register"
echo ""
