# ============================================================
# FACTURATIE ERP - CLOUDPANEL INSTALLATIE SCRIPT
# ============================================================
# 
# Dit script installeert de complete Facturatie ERP applicatie
# op een CloudPanel server (Ubuntu 22.04 / Debian 11+)
#
# Vereisten:
# - CloudPanel geïnstalleerd (https://www.cloudpanel.io)
# - Minimaal 2GB RAM, 20GB SSD
# - Root toegang
# - Domeinnaam gekoppeld aan server IP
#
# Gebruik:
# 1. Upload dit script naar je server
# 2. chmod +x install_facturatie.sh
# 3. sudo ./install_facturatie.sh
#
# ============================================================

#!/bin/bash

set -e

# ==================== CONFIGURATIE ====================
# PAS DEZE VARIABELEN AAN NAAR JE EIGEN INSTELLINGEN

APP_DOMAIN="facturatie.jouwdomein.nl"          # Je domeinnaam
APP_NAME="facturatie"                           # App naam (zonder spaties)
DB_NAME="facturatie_db"                         # Database naam
DB_USER="facturatie_user"                       # Database gebruiker
DB_PASS=$(openssl rand -base64 24)              # Automatisch gegenereerd wachtwoord
SECRET_KEY=$(openssl rand -base64 32)           # JWT Secret Key
ADMIN_EMAIL="admin@facturatie.sr"               # Superadmin email
ADMIN_PASS="admin123"                           # Superadmin wachtwoord (VERANDER DIT!)

# Git repository (pas aan als je een eigen repo hebt)
GIT_REPO="https://github.com/jouw-username/facturatie-erp.git"
# Of gebruik rsync/scp om bestanden te kopiëren

# ==================== KLEUREN ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==================== PRE-FLIGHT CHECKS ====================
echo ""
echo "============================================================"
echo "   FACTURATIE ERP - CLOUDPANEL INSTALLATIE"
echo "============================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo_error "Dit script moet als root worden uitgevoerd!"
    echo "Gebruik: sudo ./install_facturatie.sh"
    exit 1
fi

# Check if CloudPanel is installed
if [ ! -d "/home/clp" ]; then
    echo_error "CloudPanel is niet geïnstalleerd!"
    echo "Installeer eerst CloudPanel: https://www.cloudpanel.io/docs/v2/getting-started/"
    exit 1
fi

echo_info "Configuratie:"
echo "  - Domein: $APP_DOMAIN"
echo "  - App Naam: $APP_NAME"
echo "  - Database: $DB_NAME"
echo ""

read -p "Wil je doorgaan met deze instellingen? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo_warning "Installatie geannuleerd."
    exit 1
fi

# ==================== STAP 1: SYSTEEM UPDATES ====================
echo ""
echo_info "Stap 1/10: Systeem bijwerken..."

apt-get update -y
apt-get upgrade -y

echo_success "Systeem bijgewerkt!"

# ==================== STAP 2: INSTALLEER DEPENDENCIES ====================
echo ""
echo_info "Stap 2/10: Dependencies installeren..."

apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    certbot \
    python3-certbot-nginx

# Node.js 18+ installeren
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Yarn installeren
if ! command -v yarn &> /dev/null; then
    npm install -g yarn
fi

echo_success "Dependencies geïnstalleerd!"
echo "  - Node.js: $(node -v)"
echo "  - Python: $(python3 --version)"
echo "  - Yarn: $(yarn -v)"

# ==================== STAP 3: MONGODB INSTALLEREN ====================
echo ""
echo_info "Stap 3/10: MongoDB installeren..."

if ! command -v mongod &> /dev/null; then
    # MongoDB 6.0 repository toevoegen
    curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    apt-get update
    apt-get install -y mongodb-org
    
    # Start MongoDB
    systemctl start mongod
    systemctl enable mongod
fi

# Wacht tot MongoDB draait
sleep 3

# Maak database en gebruiker aan
mongosh --eval "
    use $DB_NAME;
    db.createUser({
        user: '$DB_USER',
        pwd: '$DB_PASS',
        roles: [{ role: 'readWrite', db: '$DB_NAME' }]
    });
" 2>/dev/null || echo_warning "Database gebruiker bestaat mogelijk al"

echo_success "MongoDB geïnstalleerd en geconfigureerd!"

# ==================== STAP 4: APP DIRECTORY AANMAKEN ====================
echo ""
echo_info "Stap 4/10: App directory aanmaken..."

APP_DIR="/var/www/$APP_NAME"
mkdir -p $APP_DIR
cd $APP_DIR

# Als je Git gebruikt:
# git clone $GIT_REPO .

# Of maak de directory structuur handmatig:
mkdir -p backend frontend

echo_success "Directory structuur aangemaakt: $APP_DIR"

# ==================== STAP 5: BACKEND CONFIGUREREN ====================
echo ""
echo_info "Stap 5/10: Backend configureren..."

cd $APP_DIR/backend

# Python virtual environment aanmaken
python3 -m venv venv
source venv/bin/activate

# Requirements installeren (kopieer eerst je requirements.txt)
if [ -f "requirements.txt" ]; then
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# .env bestand aanmaken
cat > .env << EOF
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=$DB_NAME

# JWT Secret (VERANDER DIT IN PRODUCTIE!)
SECRET_KEY=$SECRET_KEY
JWT_SECRET=$SECRET_KEY

# CORS Origins (voeg je domeinen toe)
CORS_ORIGINS=https://$APP_DOMAIN,http://localhost:3000

# SMTP Configuration (optioneel - voor email notificaties)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@$APP_DOMAIN

# Emergent LLM Key (voor AI features - optioneel)
EMERGENT_LLM_KEY=

# Server Configuration
SERVER_IP=$(curl -s ifconfig.me)
MAIN_DOMAIN=$APP_DOMAIN
EOF

echo_success "Backend geconfigureerd!"

# ==================== STAP 6: FRONTEND CONFIGUREREN ====================
echo ""
echo_info "Stap 6/10: Frontend configureren..."

cd $APP_DIR/frontend

# .env bestand aanmaken
cat > .env << EOF
REACT_APP_BACKEND_URL=https://$APP_DOMAIN
EOF

# Dependencies installeren en bouwen
if [ -f "package.json" ]; then
    yarn install
    yarn build
fi

echo_success "Frontend geconfigureerd!"

# ==================== STAP 7: SUPERVISOR CONFIGUREREN ====================
echo ""
echo_info "Stap 7/10: Supervisor configureren..."

cat > /etc/supervisor/conf.d/$APP_NAME.conf << EOF
[program:${APP_NAME}_backend]
directory=$APP_DIR/backend
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/${APP_NAME}_backend.err.log
stdout_logfile=/var/log/supervisor/${APP_NAME}_backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin"

[program:${APP_NAME}_frontend]
directory=$APP_DIR/frontend
command=/usr/bin/npx serve -s build -l 3000
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/${APP_NAME}_frontend.err.log
stdout_logfile=/var/log/supervisor/${APP_NAME}_frontend.out.log
EOF

# Installeer serve voor static file serving
npm install -g serve

supervisorctl reread
supervisorctl update

echo_success "Supervisor geconfigureerd!"

# ==================== STAP 8: NGINX CONFIGUREREN ====================
echo ""
echo_info "Stap 8/10: Nginx configureren..."

# CloudPanel Nginx configuratie
cat > /etc/nginx/sites-available/$APP_NAME << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name APP_DOMAIN_PLACEHOLDER;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name APP_DOMAIN_PLACEHOLDER;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/APP_DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/APP_DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;

    # API Routes - Proxy to Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # File upload size
        client_max_body_size 50M;
    }

    # WebSocket Support
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Frontend - Static Files
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|woff|woff2|ttf|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Logs
    access_log /var/log/nginx/APP_NAME_PLACEHOLDER_access.log;
    error_log /var/log/nginx/APP_NAME_PLACEHOLDER_error.log;
}
NGINX_EOF

# Vervang placeholders
sed -i "s/APP_DOMAIN_PLACEHOLDER/$APP_DOMAIN/g" /etc/nginx/sites-available/$APP_NAME
sed -i "s/APP_NAME_PLACEHOLDER/$APP_NAME/g" /etc/nginx/sites-available/$APP_NAME

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

echo_success "Nginx geconfigureerd!"

# ==================== STAP 9: SSL CERTIFICAAT ====================
echo ""
echo_info "Stap 9/10: SSL certificaat aanvragen..."

# Test nginx configuratie (zonder SSL eerst)
# Maak tijdelijke config zonder SSL
cat > /etc/nginx/sites-available/${APP_NAME}_temp << EOF
server {
    listen 80;
    server_name $APP_DOMAIN;
    root /var/www/html;
    location /.well-known/acme-challenge/ {
        allow all;
    }
}
EOF

ln -sf /etc/nginx/sites-available/${APP_NAME}_temp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/$APP_NAME
nginx -t && systemctl reload nginx

# Vraag SSL certificaat aan
certbot certonly --webroot -w /var/www/html -d $APP_DOMAIN --non-interactive --agree-tos --email admin@$APP_DOMAIN || {
    echo_warning "SSL certificaat kon niet automatisch worden aangevraagd."
    echo "Voer handmatig uit: certbot certonly --webroot -w /var/www/html -d $APP_DOMAIN"
}

# Zet de echte config terug
rm -f /etc/nginx/sites-enabled/${APP_NAME}_temp
rm -f /etc/nginx/sites-available/${APP_NAME}_temp
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Test en herlaad nginx
nginx -t && systemctl reload nginx

echo_success "SSL geconfigureerd!"

# ==================== STAP 10: SERVICES STARTEN ====================
echo ""
echo_info "Stap 10/10: Services starten..."

# Start alle services
supervisorctl restart all
systemctl restart nginx

# Wacht even
sleep 5

# Check of alles draait
echo ""
echo_info "Service Status:"
supervisorctl status

echo ""
echo "============================================================"
echo_success "INSTALLATIE VOLTOOID!"
echo "============================================================"
echo ""
echo "Belangrijke informatie:"
echo "  - App URL: https://$APP_DOMAIN"
echo "  - Admin Login: $ADMIN_EMAIL / $ADMIN_PASS"
echo "  - Database: $DB_NAME"
echo "  - Database Wachtwoord: $DB_PASS"
echo ""
echo "Configuratie bestanden:"
echo "  - Backend: $APP_DIR/backend/.env"
echo "  - Frontend: $APP_DIR/frontend/.env"
echo "  - Nginx: /etc/nginx/sites-available/$APP_NAME"
echo "  - Supervisor: /etc/supervisor/conf.d/$APP_NAME.conf"
echo ""
echo "Logs bekijken:"
echo "  - Backend: tail -f /var/log/supervisor/${APP_NAME}_backend.err.log"
echo "  - Frontend: tail -f /var/log/supervisor/${APP_NAME}_frontend.err.log"
echo "  - Nginx: tail -f /var/log/nginx/${APP_NAME}_error.log"
echo ""
echo "BEWAAR DEZE GEGEVENS VEILIG!"
echo ""

# Sla credentials op in een bestand
cat > $APP_DIR/CREDENTIALS.txt << EOF
============================================================
FACTURATIE ERP - INSTALLATIE CREDENTIALS
============================================================
Aangemaakt op: $(date)

App URL: https://$APP_DOMAIN
Admin Email: $ADMIN_EMAIL
Admin Wachtwoord: $ADMIN_PASS

Database Naam: $DB_NAME
Database User: $DB_USER
Database Wachtwoord: $DB_PASS

JWT Secret: $SECRET_KEY

VERWIJDER DIT BESTAND NA HET OPSLAAN VAN DE GEGEVENS!
============================================================
EOF

chmod 600 $APP_DIR/CREDENTIALS.txt
echo_warning "Credentials opgeslagen in: $APP_DIR/CREDENTIALS.txt"
echo_warning "VERWIJDER DIT BESTAND NA HET OPSLAAN VAN DE GEGEVENS!"
