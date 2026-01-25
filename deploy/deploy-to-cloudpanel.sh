#!/bin/bash

# =============================================================================
# Facturatie ERP - Volledige Deployment naar CloudPanel
# =============================================================================
#
# Dit script:
# 1. Bouwt de frontend
# 2. Maakt een deployment package
# 3. Kan uploaden naar uw server via SCP
#
# GEBRUIK:
#   chmod +x deploy-to-cloudpanel.sh
#   ./deploy-to-cloudpanel.sh
#
# =============================================================================

set -e

# Kleuren
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuratie - PAS DIT AAN
SERVER_USER="facturatie"
SERVER_HOST="uw-server-ip"  # Bijv: 192.168.1.100 of facturatie.sr
SERVER_PATH="/home/facturatie/htdocs/facturatie.sr"
DOMAIN="facturatie.sr"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Facturatie ERP - Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Huidige directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$SCRIPT_DIR/package"

echo -e "${GREEN}[1/5]${NC} Opschonen oude build..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/backend"
mkdir -p "$DEPLOY_DIR/frontend"

echo -e "${GREEN}[2/5]${NC} Frontend bouwen..."
cd "$APP_DIR/frontend"

# Update .env voor productie
cat > .env.production << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF

# Build
npm run build 2>/dev/null || yarn build

# Kopieer build
cp -r build/* "$DEPLOY_DIR/frontend/"

echo -e "${GREEN}[3/5]${NC} Backend voorbereiden..."
cd "$APP_DIR/backend"

# Kopieer backend bestanden (exclusief venv en __pycache__)
cp server.py "$DEPLOY_DIR/backend/"
cp requirements.txt "$DEPLOY_DIR/backend/" 2>/dev/null || true

# Maak productie .env template
cat > "$DEPLOY_DIR/backend/.env.template" << 'EOF'
# MongoDB - pas aan naar uw configuratie
MONGO_URL="mongodb://localhost:27017"
DB_NAME="facturatie_production"

# CORS - uw domein(en)
CORS_ORIGINS="https://facturatie.sr,https://www.facturatie.sr"

# JWT Secret - VERANDER DIT! (genereer met: openssl rand -hex 32)
JWT_SECRET="VERANDER_DIT_NAAR_EEN_VEILIGE_WAARDE"

# Email SMTP Settings
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@facturatie.sr
SMTP_PASSWORD=UW_WACHTWOORD
SMTP_FROM=info@facturatie.sr
APP_URL=https://facturatie.sr
EOF

echo -e "${GREEN}[4/5]${NC} Deployment package maken..."

# Nginx config
cat > "$DEPLOY_DIR/nginx-site.conf" << 'EOF'
# ============================================
# Nginx configuratie voor Facturatie ERP
# ============================================
# 
# INSTALLATIE in CloudPanel:
# 1. Ga naar uw site in CloudPanel
# 2. Klik op "Vhost" 
# 3. Voeg onderstaande location blocks toe binnen de server {} block
#
# OF handmatig:
# sudo nano /etc/nginx/sites-available/facturatie.sr
# Plak de location blocks en: sudo nginx -t && sudo systemctl reload nginx
# ============================================

# API Backend Proxy
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
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Frontend - React SPA
location / {
    root /home/facturatie/htdocs/facturatie.sr/frontend;
    try_files $uri $uri/ /index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Systemd service
cat > "$DEPLOY_DIR/facturatie-backend.service" << 'EOF'
[Unit]
Description=Facturatie ERP Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=facturatie
Group=facturatie
WorkingDirectory=/home/facturatie/htdocs/facturatie.sr/backend
Environment="PATH=/home/facturatie/htdocs/facturatie.sr/backend/venv/bin"
ExecStart=/home/facturatie/htdocs/facturatie.sr/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/home/facturatie/htdocs/facturatie.sr/logs/backend.log
StandardError=append:/home/facturatie/htdocs/facturatie.sr/logs/backend.error.log

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Server setup script
cat > "$DEPLOY_DIR/server-setup.sh" << 'SERVERSCRIPT'
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
SERVERSCRIPT

chmod +x "$DEPLOY_DIR/server-setup.sh"

# README
cat > "$DEPLOY_DIR/README.md" << 'EOF'
# Facturatie ERP - Deployment Package

## Inhoud
- `frontend/` - Gebouwde React applicatie
- `backend/` - FastAPI backend code
- `nginx-site.conf` - Nginx configuratie
- `facturatie-backend.service` - Systemd service
- `server-setup.sh` - Automatisch setup script

## Installatie Stappen

### 1. Upload naar server
```bash
scp -r package/* facturatie@uw-server:/home/facturatie/htdocs/facturatie.sr/
```

### 2. SSH naar server
```bash
ssh facturatie@uw-server
cd /home/facturatie/htdocs/facturatie.sr
```

### 3. Setup script uitvoeren
```bash
chmod +x server-setup.sh
./server-setup.sh
```

### 4. Backend configureren
```bash
nano backend/.env
# Pas MONGO_URL, JWT_SECRET, SMTP_PASSWORD aan
```

### 5. Nginx configureren (CloudPanel)
1. Login op CloudPanel
2. Ga naar Sites → facturatie.sr → Vhost
3. Voeg de inhoud van `nginx-site.conf` toe
4. Klik op "Save"

### 6. Service herstarten
```bash
sudo systemctl restart facturatie-backend
sudo systemctl reload nginx
```

### 7. Testen
```bash
curl https://facturatie.sr/api/health
```

## Troubleshooting

### Backend logs
```bash
tail -f /home/facturatie/htdocs/facturatie.sr/logs/backend.log
tail -f /home/facturatie/htdocs/facturatie.sr/logs/backend.error.log
sudo journalctl -u facturatie-backend -f
```

### Service status
```bash
sudo systemctl status facturatie-backend
```

### Nginx test
```bash
sudo nginx -t
sudo systemctl reload nginx
```
EOF

# Maak tar.gz
echo -e "${GREEN}[5/5]${NC} Package comprimeren..."
cd "$SCRIPT_DIR"
tar -czf facturatie-deploy.tar.gz -C package .

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Deployment Package Gereed!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Package locatie: ${YELLOW}$SCRIPT_DIR/facturatie-deploy.tar.gz${NC}"
echo ""
echo -e "${BLUE}Upload naar server:${NC}"
echo "  scp $SCRIPT_DIR/facturatie-deploy.tar.gz ${SERVER_USER}@${SERVER_HOST}:~/"
echo ""
echo -e "${BLUE}Op de server uitvoeren:${NC}"
echo "  ssh ${SERVER_USER}@${SERVER_HOST}"
echo "  cd /home/facturatie/htdocs/facturatie.sr"
echo "  tar -xzf ~/facturatie-deploy.tar.gz"
echo "  chmod +x server-setup.sh"
echo "  ./server-setup.sh"
echo ""
