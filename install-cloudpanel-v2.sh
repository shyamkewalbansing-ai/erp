#!/bin/bash

# =============================================================================
# FACTURATIE.SR - CLOUDPANEL INSTALLATIE SCRIPT (FIXED)
# =============================================================================
# 
# Verbeterde versie met correcte SSL certificaat flow
#
# =============================================================================

set -e

# Kleuren
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================================"
echo "   FACTURATIE.SR - CLOUDPANEL INSTALLATIE (v2)"
echo "============================================================"
echo ""

# =============================================================================
# CONFIGURATIE
# =============================================================================

read -p "Voer uw hoofddomein in (bijv. facturatie.sr): " DOMAIN
read -p "Voer uw e-mailadres in (voor SSL): " EMAIL
read -p "Database wachtwoord: " DB_PASSWORD
read -p "Admin wachtwoord: " ADMIN_PASSWORD

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$DB_PASSWORD" ] || [ -z "$ADMIN_PASSWORD" ]; then
    log_error "Alle velden zijn verplicht!"
    exit 1
fi

APP_DIR="/home/clp/htdocs/$DOMAIN"
BACKEND_PORT=8001
FRONTEND_PORT=3000
MONGO_DB_NAME="facturatie_db"

# =============================================================================
# STAP 1: VERWIJDER CONFLICTERENDE NGINX CONFIGURATIES
# =============================================================================

log_info "Stap 1: Nginx configuratie opschonen..."

# Stop nginx tijdelijk
systemctl stop nginx 2>/dev/null || true

# Verwijder oude configuratie als deze bestaat
rm -f /etc/nginx/sites-enabled/$DOMAIN.conf
rm -f /etc/nginx/sites-available/$DOMAIN.conf

# =============================================================================
# STAP 2: MAAK TIJDELIJKE HTTP-ONLY CONFIGURATIE (voor Certbot)
# =============================================================================

log_info "Stap 2: Tijdelijke HTTP configuratie voor SSL aanvraag..."

# Maak webroot directory
mkdir -p /var/www/certbot/.well-known/acme-challenge
chown -R www-data:www-data /var/www/certbot

# Tijdelijke HTTP-only configuratie
cat > /etc/nginx/sites-available/$DOMAIN-temp.conf << EOF
# Tijdelijke configuratie voor SSL certificaat aanvraag
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN app.$DOMAIN;
    
    # Let's Encrypt verificatie
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    
    # Alle andere requests tijdelijk blokkeren
    location / {
        return 503 "Site wordt geïnstalleerd...";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable tijdelijke configuratie
ln -sf /etc/nginx/sites-available/$DOMAIN-temp.conf /etc/nginx/sites-enabled/

# Test en start nginx
nginx -t
systemctl start nginx

log_success "Tijdelijke HTTP configuratie actief"

# =============================================================================
# STAP 3: SSL CERTIFICATEN AANVRAGEN
# =============================================================================

log_info "Stap 3: SSL certificaten aanvragen..."

# Installeer certbot als nog niet aanwezig
apt-get install -y certbot python3-certbot-nginx

# Wacht even tot nginx volledig draait
sleep 3

# Vraag certificaat aan via webroot methode
certbot certonly --webroot \
    -w /var/www/certbot \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d app.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --force-renewal || {
    
    log_warning "Webroot methode mislukt, probeer standalone..."
    
    # Stop nginx voor standalone
    systemctl stop nginx
    
    certbot certonly --standalone \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d app.$DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --non-interactive \
        --force-renewal || {
        
        log_error "SSL certificaat aanvraag mislukt!"
        log_error "Controleer of uw DNS records correct zijn geconfigureerd."
        log_error ""
        log_error "Vereiste DNS records:"
        log_error "  A    @      -> UW_SERVER_IP"
        log_error "  A    www    -> UW_SERVER_IP"
        log_error "  A    app    -> UW_SERVER_IP"
        log_error ""
        log_error "Probeer later handmatig:"
        log_error "  certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN"
        
        # Start nginx weer
        systemctl start nginx
        exit 1
    }
}

log_success "SSL certificaten verkregen!"

# =============================================================================
# STAP 4: VOLLEDIGE NGINX CONFIGURATIE
# =============================================================================

log_info "Stap 4: Volledige Nginx configuratie installeren..."

# Stop nginx
systemctl stop nginx

# Verwijder tijdelijke configuratie
rm -f /etc/nginx/sites-enabled/$DOMAIN-temp.conf
rm -f /etc/nginx/sites-available/$DOMAIN-temp.conf

# Maak volledige configuratie
cat > /etc/nginx/sites-available/$DOMAIN.conf << 'NGINX_EOF'
# =============================================================================
# FACTURATIE.SR - NGINX CONFIGURATIE
# =============================================================================

# Redirect HTTP naar HTTPS
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

# =============================================================================
# HOOFDDOMEIN - LANDING PAGES
# =============================================================================
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    # SSL
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozSSL:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss;
    
    # Frontend (Landing pages)
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
        proxy_read_timeout 86400;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:BACKEND_PORT_PLACEHOLDER/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    }
    
    # Redirect /app naar app subdomain
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

# =============================================================================
# APP SUBDOMAIN - APPLICATIE
# =============================================================================
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    
    server_name app.DOMAIN_PLACEHOLDER;
    
    # SSL
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:AppSSL:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss;
    
    # Frontend (React App)
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
        proxy_read_timeout 86400;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:BACKEND_PORT_PLACEHOLDER/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:FRONTEND_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
NGINX_EOF

# Vervang placeholders
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN.conf
sed -i "s/BACKEND_PORT_PLACEHOLDER/$BACKEND_PORT/g" /etc/nginx/sites-available/$DOMAIN.conf
sed -i "s/FRONTEND_PORT_PLACEHOLDER/$FRONTEND_PORT/g" /etc/nginx/sites-available/$DOMAIN.conf

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/

# Test configuratie
nginx -t || {
    log_error "Nginx configuratie test mislukt!"
    exit 1
}

# Start nginx
systemctl start nginx

log_success "Nginx geconfigureerd"

# =============================================================================
# STAP 5: MONGODB INSTALLEREN
# =============================================================================

log_info "Stap 5: MongoDB installeren..."

# Check of MongoDB al is geïnstalleerd
if ! command -v mongod &> /dev/null; then
    # Importeer MongoDB GPG key
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

    # Detecteer OS versie
    if [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        DISTRO=$DISTRIB_CODENAME
    else
        DISTRO="jammy"
    fi

    # Voeg repository toe
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $DISTRO/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    apt-get update -y
    apt-get install -y mongodb-org
fi

# Start MongoDB
systemctl start mongod
systemctl enable mongod

sleep 3

# Maak database gebruiker
mongosh --eval "
use $MONGO_DB_NAME
db.createUser({
    user: 'facturatie_user',
    pwd: '$DB_PASSWORD',
    roles: [{ role: 'readWrite', db: '$MONGO_DB_NAME' }]
})
" 2>/dev/null || log_warning "Database gebruiker bestaat mogelijk al"

log_success "MongoDB geïnstalleerd"

# =============================================================================
# STAP 6: NODE.JS EN PYTHON
# =============================================================================

log_info "Stap 6: Node.js en Python installeren..."

# Node.js
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

npm install -g yarn serve

# Python
apt-get install -y python3 python3-pip python3-venv python3-dev

log_success "Node.js en Python geïnstalleerd"

# =============================================================================
# STAP 7: APP DIRECTORY
# =============================================================================

log_info "Stap 7: App directory voorbereiden..."

mkdir -p $APP_DIR/backend
mkdir -p $APP_DIR/frontend
mkdir -p $APP_DIR/logs

# Maak backend .env
cat > $APP_DIR/backend/.env << EOF
MONGO_URL=mongodb://facturatie_user:$DB_PASSWORD@localhost:27017/$MONGO_DB_NAME?authSource=$MONGO_DB_NAME
DB_NAME=$MONGO_DB_NAME
HOST=0.0.0.0
PORT=$BACKEND_PORT
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$ADMIN_PASSWORD
DOMAIN=$DOMAIN
APP_URL=https://app.$DOMAIN
LANDING_URL=https://$DOMAIN
EOF

# Maak frontend .env
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
REACT_APP_SUBDOMAIN_MODE=true
REACT_APP_APP_URL=https://app.$DOMAIN
REACT_APP_LANDING_URL=https://$DOMAIN
EOF

# Maak Python venv
cd $APP_DIR/backend
python3 -m venv venv

log_success "App directory voorbereid"

# =============================================================================
# STAP 8: SUPERVISOR SERVICES
# =============================================================================

log_info "Stap 8: Supervisor services configureren..."

apt-get install -y supervisor

# Backend service
cat > /etc/supervisor/conf.d/facturatie-backend.conf << EOF
[program:facturatie-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT
directory=$APP_DIR/backend
user=root
autostart=true
autorestart=true
stderr_logfile=$APP_DIR/logs/backend.err.log
stdout_logfile=$APP_DIR/logs/backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin"
EOF

# Frontend service
cat > /etc/supervisor/conf.d/facturatie-frontend.conf << EOF
[program:facturatie-frontend]
command=/usr/bin/npx serve -s build -l $FRONTEND_PORT
directory=$APP_DIR/frontend
user=root
autostart=true
autorestart=true
stderr_logfile=$APP_DIR/logs/frontend.err.log
stdout_logfile=$APP_DIR/logs/frontend.out.log
EOF

supervisorctl reread
supervisorctl update

log_success "Supervisor geconfigureerd"

# =============================================================================
# STAP 9: CRON VOOR SSL VERNIEUWING
# =============================================================================

log_info "Stap 9: SSL auto-renewal configureren..."

(crontab -l 2>/dev/null | grep -v "certbot"; echo "0 3 1 * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

log_success "SSL auto-renewal geconfigureerd"

# =============================================================================
# AFRONDING
# =============================================================================

echo ""
echo "============================================================"
echo "   INSTALLATIE VOLTOOID!"
echo "============================================================"
echo ""
log_success "Facturatie.sr basis installatie voltooid!"
echo ""
echo "VOLGENDE STAPPEN:"
echo ""
echo "1. Upload uw applicatie bestanden naar:"
echo "   Backend:  $APP_DIR/backend/"
echo "   Frontend: $APP_DIR/frontend/"
echo ""
echo "2. Installeer dependencies:"
echo "   cd $APP_DIR/backend"
echo "   source venv/bin/activate"
echo "   pip install -r requirements.txt"
echo "   deactivate"
echo ""
echo "   cd $APP_DIR/frontend"
echo "   yarn install"
echo "   yarn build"
echo ""
echo "3. Start de services:"
echo "   supervisorctl restart all"
echo ""
echo "============================================================"
echo "CONFIGURATIE INFO"
echo "============================================================"
echo ""
echo "URLs:"
echo "  Landing:    https://$DOMAIN"
echo "  Applicatie: https://app.$DOMAIN"
echo ""
echo "Admin Login:"
echo "  Email:      admin@$DOMAIN"
echo "  Wachtwoord: $ADMIN_PASSWORD"
echo ""
echo "Database:"
echo "  Host:       localhost"
echo "  Database:   $MONGO_DB_NAME"
echo "  Gebruiker:  facturatie_user"
echo "  Wachtwoord: $DB_PASSWORD"
echo ""
echo "Bestanden:"
echo "  App:        $APP_DIR"
echo "  Logs:       $APP_DIR/logs/"
echo "  Nginx:      /etc/nginx/sites-available/$DOMAIN.conf"
echo ""
echo "Commando's:"
echo "  supervisorctl status"
echo "  supervisorctl restart facturatie-backend"
echo "  supervisorctl restart facturatie-frontend"
echo "  tail -f $APP_DIR/logs/backend.out.log"
echo ""
echo "============================================================"
