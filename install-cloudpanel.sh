#!/bin/bash

# =============================================================================
# FACTURATIE.SR - CLOUDPANEL INSTALLATIE SCRIPT
# =============================================================================
# 
# Dit script installeert de complete Facturatie ERP applicatie op CloudPanel.
#
# VEREISTEN:
# - CloudPanel geïnstalleerd op Ubuntu 22.04 of Debian 11
# - Root toegang
# - Domein gekoppeld aan server IP
#
# GEBRUIK:
# 1. Upload dit script naar uw server
# 2. chmod +x install-facturatie.sh
# 3. sudo ./install-facturatie.sh
#
# =============================================================================

set -e  # Stop bij eerste fout

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functies
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Header
echo ""
echo "============================================================"
echo "   FACTURATIE.SR - CLOUDPANEL INSTALLATIE"
echo "============================================================"
echo ""

# =============================================================================
# CONFIGURATIE VARIABELEN
# =============================================================================

# Vraag gebruiker om input
read -p "Voer uw domein in (bijv. facturatie.sr): " DOMAIN
read -p "Voer uw e-mailadres in (voor SSL certificaten): " EMAIL
read -p "Voer een wachtwoord in voor de database: " DB_PASSWORD
read -p "Voer een wachtwoord in voor de admin account: " ADMIN_PASSWORD

# Valideer input
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$DB_PASSWORD" ] || [ -z "$ADMIN_PASSWORD" ]; then
    log_error "Alle velden zijn verplicht!"
    exit 1
fi

# Configuratie
APP_NAME="facturatie"
APP_DIR="/home/clp/htdocs/$DOMAIN"
BACKEND_PORT=8001
FRONTEND_PORT=3000
NODE_VERSION="20"
PYTHON_VERSION="3.11"
MONGO_DB_NAME="facturatie_db"

log_info "Configuratie:"
log_info "  Domein: $DOMAIN"
log_info "  App Directory: $APP_DIR"
log_info "  Backend Port: $BACKEND_PORT"
log_info "  Frontend Port: $FRONTEND_PORT"
echo ""

# =============================================================================
# 1. SYSTEEM UPDATES EN BASIS PACKAGES
# =============================================================================

log_info "Stap 1/10: Systeem updates installeren..."

apt-get update -y
apt-get upgrade -y
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    supervisor

log_success "Systeem updates voltooid"

# =============================================================================
# 2. NODE.JS INSTALLEREN
# =============================================================================

log_info "Stap 2/10: Node.js $NODE_VERSION installeren..."

# Installeer Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# Installeer Yarn
npm install -g yarn

# Verifieer installatie
node --version
npm --version
yarn --version

log_success "Node.js geïnstalleerd"

# =============================================================================
# 3. PYTHON INSTALLEREN
# =============================================================================

log_info "Stap 3/10: Python $PYTHON_VERSION installeren..."

# Python is meestal al geïnstalleerd, maar we installeren pip en venv
apt-get install -y python3 python3-pip python3-venv python3-dev

# Verifieer installatie
python3 --version
pip3 --version

log_success "Python geïnstalleerd"

# =============================================================================
# 4. MONGODB INSTALLEREN
# =============================================================================

log_info "Stap 4/10: MongoDB installeren..."

# Importeer MongoDB public GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Voeg MongoDB repository toe
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update en installeer MongoDB
apt-get update -y
apt-get install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Wacht tot MongoDB is gestart
sleep 5

# Maak database en gebruiker aan
mongosh --eval "
use $MONGO_DB_NAME
db.createUser({
    user: 'facturatie_user',
    pwd: '$DB_PASSWORD',
    roles: [{ role: 'readWrite', db: '$MONGO_DB_NAME' }]
})
"

log_success "MongoDB geïnstalleerd en geconfigureerd"

# =============================================================================
# 5. APPLICATIE DIRECTORY AANMAKEN
# =============================================================================

log_info "Stap 5/10: Applicatie directory aanmaken..."

# Maak directory aan als deze niet bestaat
mkdir -p $APP_DIR
cd $APP_DIR

# Als er al bestanden zijn, maak backup
if [ -d "$APP_DIR/backend" ]; then
    log_warning "Bestaande installatie gevonden, backup maken..."
    mv $APP_DIR/backend $APP_DIR/backend.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    mv $APP_DIR/frontend $APP_DIR/frontend.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
fi

log_success "Directory gereed"

# =============================================================================
# 6. APPLICATIE CODE DOWNLOADEN
# =============================================================================

log_info "Stap 6/10: Applicatie code downloaden..."

# Clone of download de applicatie
# OPTIE 1: Als je een Git repository hebt
# git clone https://github.com/jouw-repo/facturatie.git .

# OPTIE 2: Download van Emergent export (pas URL aan)
log_warning "Upload uw applicatie bestanden naar: $APP_DIR"
log_warning "Of configureer een Git repository URL"

# Maak placeholder directories
mkdir -p $APP_DIR/backend
mkdir -p $APP_DIR/frontend

log_success "Directory structuur aangemaakt"

# =============================================================================
# 7. BACKEND CONFIGUREREN
# =============================================================================

log_info "Stap 7/10: Backend configureren..."

cd $APP_DIR/backend

# Maak Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Installeer dependencies (als requirements.txt bestaat)
if [ -f "requirements.txt" ]; then
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# Maak .env bestand
cat > $APP_DIR/backend/.env << EOF
# Database
MONGO_URL=mongodb://facturatie_user:$DB_PASSWORD@localhost:27017/$MONGO_DB_NAME?authSource=$MONGO_DB_NAME
DB_NAME=$MONGO_DB_NAME

# Server
HOST=0.0.0.0
PORT=$BACKEND_PORT

# JWT Secret (genereer een veilige key)
JWT_SECRET=$(openssl rand -hex 32)

# Admin credentials
ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Domain
DOMAIN=$DOMAIN
APP_URL=https://app.$DOMAIN
LANDING_URL=https://$DOMAIN
EOF

deactivate

log_success "Backend geconfigureerd"

# =============================================================================
# 8. FRONTEND CONFIGUREREN
# =============================================================================

log_info "Stap 8/10: Frontend configureren..."

cd $APP_DIR/frontend

# Installeer dependencies (als package.json bestaat)
if [ -f "package.json" ]; then
    yarn install
fi

# Maak .env bestand
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
REACT_APP_SUBDOMAIN_MODE=true
REACT_APP_APP_URL=https://app.$DOMAIN
REACT_APP_LANDING_URL=https://$DOMAIN
EOF

# Build frontend voor productie
if [ -f "package.json" ]; then
    yarn build
fi

log_success "Frontend geconfigureerd"

# =============================================================================
# 9. SUPERVISOR CONFIGUREREN
# =============================================================================

log_info "Stap 9/10: Supervisor services configureren..."

# Backend service
cat > /etc/supervisor/conf.d/facturatie-backend.conf << EOF
[program:facturatie-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT
directory=$APP_DIR/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/facturatie-backend.err.log
stdout_logfile=/var/log/supervisor/facturatie-backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin"
EOF

# Frontend service (serve static build)
cat > /etc/supervisor/conf.d/facturatie-frontend.conf << EOF
[program:facturatie-frontend]
command=/usr/bin/npx serve -s build -l $FRONTEND_PORT
directory=$APP_DIR/frontend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/facturatie-frontend.err.log
stdout_logfile=/var/log/supervisor/facturatie-frontend.out.log
EOF

# Installeer serve globaal
npm install -g serve

# Herlaad supervisor
supervisorctl reread
supervisorctl update

log_success "Supervisor geconfigureerd"

# =============================================================================
# 10. NGINX CONFIGUREREN
# =============================================================================

log_info "Stap 10/10: Nginx configureren..."

# Maak Nginx configuratie voor hoofddomein
cat > /etc/nginx/sites-available/$DOMAIN.conf << 'NGINX_CONF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER app.DOMAIN_PLACEHOLDER;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# Hoofddomein - Landing Pages
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:FRONTEND_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:BACKEND_PORT_PLACEHOLDER/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    
    # Redirect /app to app subdomain
    location /app {
        return 301 https://app.DOMAIN_PLACEHOLDER$request_uri;
    }
    
    location = /login {
        return 301 https://app.DOMAIN_PLACEHOLDER/login;
    }
    
    location = /register {
        return 301 https://app.DOMAIN_PLACEHOLDER/register;
    }
}

# App Subdomain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.DOMAIN_PLACEHOLDER;
    
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:FRONTEND_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:BACKEND_PORT_PLACEHOLDER/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
NGINX_CONF

# Vervang placeholders
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN.conf
sed -i "s/BACKEND_PORT_PLACEHOLDER/$BACKEND_PORT/g" /etc/nginx/sites-available/$DOMAIN.conf
sed -i "s/FRONTEND_PORT_PLACEHOLDER/$FRONTEND_PORT/g" /etc/nginx/sites-available/$DOMAIN.conf

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/

# Maak certbot directory
mkdir -p /var/www/certbot

log_success "Nginx geconfigureerd"

# =============================================================================
# SSL CERTIFICATEN
# =============================================================================

log_info "SSL certificaten aanmaken..."

# Installeer certbot als nog niet geïnstalleerd
apt-get install -y certbot python3-certbot-nginx

# Vraag certificaat aan
certbot certonly --webroot -w /var/www/certbot \
    -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive || {
    log_warning "SSL certificaat aanvraag mislukt. Probeer handmatig:"
    log_warning "certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN"
}

# Test Nginx configuratie
nginx -t

# Herlaad Nginx
systemctl reload nginx

log_success "SSL certificaten geconfigureerd"

# =============================================================================
# FIREWALL CONFIGUREREN
# =============================================================================

log_info "Firewall configureren..."

# UFW configureren
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

log_success "Firewall geconfigureerd"

# =============================================================================
# CRON JOBS VOOR SSL VERNIEUWING
# =============================================================================

log_info "Cron jobs configureren..."

# Voeg SSL vernieuwing toe aan crontab
(crontab -l 2>/dev/null; echo "0 0 1 * * certbot renew --quiet && systemctl reload nginx") | crontab -

log_success "Cron jobs geconfigureerd"

# =============================================================================
# AFRONDING
# =============================================================================

echo ""
echo "============================================================"
echo "   INSTALLATIE VOLTOOID!"
echo "============================================================"
echo ""
log_success "Facturatie.sr is succesvol geïnstalleerd!"
echo ""
echo "BELANGRIJK: Upload uw applicatie bestanden naar:"
echo "  Backend: $APP_DIR/backend/"
echo "  Frontend: $APP_DIR/frontend/"
echo ""
echo "Na het uploaden, voer uit:"
echo "  cd $APP_DIR/backend && source venv/bin/activate && pip install -r requirements.txt"
echo "  cd $APP_DIR/frontend && yarn install && yarn build"
echo "  supervisorctl restart all"
echo ""
echo "URLs:"
echo "  Landing Page: https://$DOMAIN"
echo "  Applicatie:   https://app.$DOMAIN"
echo ""
echo "Inloggen als admin:"
echo "  Email: admin@$DOMAIN"
echo "  Wachtwoord: $ADMIN_PASSWORD"
echo ""
echo "Database:"
echo "  Host: localhost"
echo "  Database: $MONGO_DB_NAME"
echo "  Gebruiker: facturatie_user"
echo "  Wachtwoord: $DB_PASSWORD"
echo ""
echo "Logs bekijken:"
echo "  tail -f /var/log/supervisor/facturatie-backend.out.log"
echo "  tail -f /var/log/supervisor/facturatie-frontend.out.log"
echo ""
echo "Services beheren:"
echo "  supervisorctl status"
echo "  supervisorctl restart facturatie-backend"
echo "  supervisorctl restart facturatie-frontend"
echo ""
echo "============================================================"
