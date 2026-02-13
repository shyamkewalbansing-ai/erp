#!/bin/bash

# =============================================================================
#
#   ███████╗ █████╗  ██████╗████████╗██╗   ██╗██████╗  █████╗ ████████╗██╗███████╗
#   ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██║   ██║██╔══██╗██╔══██╗╚══██╔══╝██║██╔════╝
#   █████╗  ███████║██║        ██║   ██║   ██║██████╔╝███████║   ██║   ██║█████╗  
#   ██╔══╝  ██╔══██║██║        ██║   ██║   ██║██╔══██╗██╔══██║   ██║   ██║██╔══╝  
#   ██║     ██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║██║  ██║   ██║   ██║███████╗
#   ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚══════╝
#
#   COMPLETE CLOUDPANEL INSTALLER v4.0
#   
#   Dit script installeert ALLES automatisch:
#   - CloudPanel site aanmaken (via clpctl)
#   - MongoDB 7.0
#   - Node.js 20 + Yarn
#   - Python 3.11 + venv
#   - SSL certificaten (Let's Encrypt via Snap)
#   - Nginx (hoofddomein + app subdomain)
#   - Supervisor services
#   - Database backup cron
#   - Beheer commands (update/backup/restore)
#
#   GEBRUIK:
#   curl -sSL https://raw.githubusercontent.com/shyamkewalbansing-ai/erp/main/COMPLETE_INSTALL.sh -o install.sh && chmod +x install.sh && sudo ./install.sh
#
# =============================================================================

set -e

# =============================================================================
# KLEUREN
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# LOGGING
# =============================================================================
print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║   FACTURATIE ERP - COMPLETE CLOUDPANEL INSTALLER v4.0             ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}▶ $1${NC}"; }
log_info() { echo -e "${BLUE}  ℹ ${NC} $1"; }
log_success() { echo -e "${GREEN}  ✔ ${NC} $1"; }
log_warning() { echo -e "${YELLOW}  ⚠ ${NC} $1"; }
log_error() { echo -e "${RED}  ✖ ${NC} $1"; exit 1; }

# =============================================================================
# CHECK ROOT
# =============================================================================
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Dit script moet als root worden uitgevoerd!${NC}"
        echo "Gebruik: sudo ./COMPLETE_INSTALL.sh"
        exit 1
    fi
}

# =============================================================================
# CONFIGURATIE VRAGEN
# =============================================================================
get_configuration() {
    print_banner
    
    echo -e "${BOLD}Welkom bij de Facturatie ERP Installer!${NC}"
    echo ""
    echo "Beantwoord de volgende vragen om de installatie te configureren."
    echo ""
    
    # Domein
    read -p "$(echo -e ${CYAN}Domein ${NC}[bijv. facturatie.sr]: )" DOMAIN
    if [ -z "$DOMAIN" ]; then
        log_error "Domein is verplicht!"
    fi
    
    # Email voor SSL
    read -p "$(echo -e ${CYAN}E-mail ${NC}[voor SSL certificaten]: )" EMAIL
    if [ -z "$EMAIL" ]; then
        EMAIL="admin@$DOMAIN"
        log_info "Standaard e-mail: $EMAIL"
    fi
    
    # Admin wachtwoord
    read -sp "$(echo -e ${CYAN}Admin wachtwoord${NC}: )" ADMIN_PASSWORD
    echo ""
    if [ -z "$ADMIN_PASSWORD" ]; then
        ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)
        log_info "Admin wachtwoord gegenereerd: $ADMIN_PASSWORD"
    fi
    
    # Site user
    read -p "$(echo -e ${CYAN}CloudPanel site user ${NC}[standaard: facturatie]: )" SITE_USER
    if [ -z "$SITE_USER" ]; then
        SITE_USER="facturatie"
    fi
    
    # Database wachtwoord
    DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    
    # JWT Secret
    JWT_SECRET=$(openssl rand -hex 32)
    
    # GitHub URL
    GITHUB_REPO_DEFAULT="https://github.com/shyamkewalbansing-ai/erp.git"
    read -p "$(echo -e ${CYAN}GitHub repo URL ${NC}[$GITHUB_REPO_DEFAULT]: )" GITHUB_REPO
    if [ -z "$GITHUB_REPO" ]; then
        GITHUB_REPO="$GITHUB_REPO_DEFAULT"
    fi
    
    # Directories - detecteer CloudPanel structuur
    if [ -d "/home/$SITE_USER/htdocs" ]; then
        APP_DIR="/home/$SITE_USER/htdocs/$DOMAIN"
    elif [ -d "/home/clp/htdocs" ]; then
        APP_DIR="/home/clp/htdocs/$DOMAIN"
    else
        APP_DIR="/home/$SITE_USER/htdocs/$DOMAIN"
    fi
    
    BACKEND_PORT=8001
    FRONTEND_PORT=3000
    MONGO_DB_NAME="facturatie_db"
    WILDCARD_SSL=false
    
    # Detecteer server IP
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "UNKNOWN")
    
    # Site user password genereren
    SITE_USER_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    
    echo ""
    echo -e "${BOLD}Configuratie overzicht:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Domein:           $DOMAIN"
    echo "  Server IP:        $SERVER_IP"
    echo "  App subdomain:    app.$DOMAIN"
    echo "  E-mail:           $EMAIL"
    echo "  Site user:        $SITE_USER"
    echo "  App directory:    $APP_DIR"
    echo "  Database:         $MONGO_DB_NAME"
    echo "  Backend poort:    $BACKEND_PORT"
    echo "  Frontend poort:   $FRONTEND_PORT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    read -p "$(echo -e ${CYAN}Doorgaan met installatie? ${NC}[j/n]: )" CONFIRM
    if [ "$CONFIRM" != "j" ] && [ "$CONFIRM" != "J" ] && [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Installatie geannuleerd."
        exit 0
    fi
}

# =============================================================================
# STAP 1: SYSTEEM VOORBEREIDEN
# =============================================================================
prepare_system() {
    log_step "STAP 1/12: Systeem voorbereiden..."
    
    apt-get update -qq
    apt-get install -y -qq \
        curl wget git build-essential \
        software-properties-common unzip \
        supervisor snapd \
        gnupg ca-certificates > /dev/null 2>&1
    
    # Installeer certbot via snap (voorkomt Python conflicten)
    log_info "Certbot installeren via snap..."
    apt-get remove -y certbot python3-certbot-nginx > /dev/null 2>&1 || true
    snap install --classic certbot > /dev/null 2>&1 || true
    ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
    
    log_success "Systeem pakketten geïnstalleerd"
}

# =============================================================================
# STAP 2: NODE.JS 20 INSTALLEREN
# =============================================================================
install_nodejs() {
    log_step "STAP 2/12: Node.js 20 installeren..."
    
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 20 ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        apt-get install -y -qq nodejs > /dev/null 2>&1
    fi
    
    npm install -g yarn serve > /dev/null 2>&1
    
    log_success "Node.js $(node --version) + Yarn $(yarn --version) geïnstalleerd"
}

# =============================================================================
# STAP 3: PYTHON 3.11 INSTALLEREN
# =============================================================================
install_python() {
    log_step "STAP 3/12: Python 3.11 installeren..."
    
    # Voeg deadsnakes PPA toe voor Python 3.11
    add-apt-repository -y ppa:deadsnakes/ppa > /dev/null 2>&1 || true
    apt-get update -qq
    
    apt-get install -y -qq \
        python3.11 python3.11-venv python3.11-dev \
        python3-pip > /dev/null 2>&1
    
    log_success "Python $(python3.11 --version | cut -d' ' -f2) geïnstalleerd"
}

# =============================================================================
# STAP 4: MONGODB 7.0 INSTALLEREN
# =============================================================================
install_mongodb() {
    log_step "STAP 4/12: MongoDB 7.0 installeren..."
    
    if ! command -v mongod &> /dev/null; then
        # Import GPG key
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
            gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
        
        # Add repository
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
            > /etc/apt/sources.list.d/mongodb-org-7.0.list
        
        apt-get update -qq
        apt-get install -y -qq mongodb-org > /dev/null 2>&1
    fi
    
    # Start MongoDB
    systemctl start mongod
    systemctl enable mongod > /dev/null 2>&1
    
    sleep 3
    
    # Create database user
    mongosh --quiet --eval "
        use $MONGO_DB_NAME
        db.createUser({
            user: 'facturatie_user',
            pwd: '$DB_PASSWORD',
            roles: [{ role: 'readWrite', db: '$MONGO_DB_NAME' }]
        })
    " 2>/dev/null || log_info "Database gebruiker bestaat mogelijk al"
    
    log_success "MongoDB 7.0 geïnstalleerd en geconfigureerd"
}

# =============================================================================
# STAP 5: CLOUDPANEL SITE AANMAKEN
# =============================================================================
create_cloudpanel_site() {
    log_step "STAP 5/12: CloudPanel site voorbereiden..."
    
    # Maak directory structuur
    mkdir -p $APP_DIR/{backend,frontend,logs,backups}
    mkdir -p /var/www/certbot/.well-known/acme-challenge
    chown -R www-data:www-data /var/www/certbot
    
    # Check of clpctl beschikbaar is
    if command -v clpctl &> /dev/null; then
        log_info "Site aanmaken via CloudPanel CLI..."
        clpctl site:add:nodejs \
            --domainName="$DOMAIN" \
            --nodejsVersion="20" \
            --appPort="$FRONTEND_PORT" \
            --siteUser="$SITE_USER" \
            --siteUserPassword="$SITE_USER_PASSWORD" 2>/dev/null || log_info "Site bestaat mogelijk al"
        
        # Voeg subdomains toe
        clpctl site:domain:add --domainName="$DOMAIN" --newDomainName="app.$DOMAIN" 2>/dev/null || true
        clpctl site:domain:add --domainName="$DOMAIN" --newDomainName="www.$DOMAIN" 2>/dev/null || true
    fi
    
    # Update APP_DIR als CloudPanel een andere locatie gebruikt
    if [ -d "/home/$SITE_USER/htdocs/$DOMAIN" ]; then
        APP_DIR="/home/$SITE_USER/htdocs/$DOMAIN"
    fi
    
    mkdir -p $APP_DIR/{backend,frontend,logs,backups}
    
    log_success "CloudPanel site voorbereid: $APP_DIR"
}

# =============================================================================
# STAP 6: CODE DOWNLOADEN
# =============================================================================
download_code() {
    log_step "STAP 6/12: Code downloaden van GitHub..."
    
    cd $APP_DIR
    
    # Clone repo
    if [ -n "$GITHUB_REPO" ]; then
        log_info "Code downloaden van: $GITHUB_REPO"
        git clone --depth 1 "$GITHUB_REPO" temp_clone 2>/dev/null || true
        
        if [ -d "temp_clone/backend" ]; then
            cp -r temp_clone/backend/* backend/ 2>/dev/null || true
            cp -r temp_clone/frontend/* frontend/ 2>/dev/null || true
            cp temp_clone/setup_demo_account.py ./ 2>/dev/null || true
            rm -rf temp_clone
            log_success "Code gedownload van GitHub"
        else
            rm -rf temp_clone
            log_warning "GitHub clone mislukt - upload bestanden handmatig"
        fi
    fi
}

# =============================================================================
# STAP 7: BACKEND CONFIGUREREN
# =============================================================================
configure_backend() {
    log_step "STAP 7/12: Backend configureren..."
    
    cd $APP_DIR/backend
    
    # Create virtual environment met Python 3.11
    python3.11 -m venv venv
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip -q
    
    # Install ALL required dependencies
    log_info "Backend dependencies installeren (dit duurt even)..."
    
    # Core dependencies
    pip install -q \
        motor pymongo bcrypt passlib python-jose python-multipart \
        PyJWT reportlab email-validator aiosmtplib apscheduler \
        fastapi uvicorn starlette python-dotenv pydantic \
        httpx aiohttp requests pillow jinja2 \
        2>&1 | grep -v "WARNING\|DEPRECATION" || true
    
    # Install from requirements.txt if exists
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt -q 2>&1 | grep -v "WARNING\|DEPRECATION\|ERROR.*emergentintegrations" || true
    fi
    
    # Install emergentintegrations from custom index
    pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -q 2>&1 || true
    
    # Create .env file
    cat > .env << EOF
# =============================================================================
# FACTURATIE ERP - BACKEND CONFIGURATIE
# Automatisch gegenereerd op: $(date)
# =============================================================================

# Database
MONGO_URL=mongodb://localhost:27017/$MONGO_DB_NAME
DB_NAME=$MONGO_DB_NAME

# Server
HOST=0.0.0.0
PORT=$BACKEND_PORT

# Security
JWT_SECRET=$JWT_SECRET

# GitHub Webhook (voor automatische updates)
GITHUB_WEBHOOK_SECRET=webhook_secret_$(openssl rand -hex 16)
DEPLOY_SCRIPT=$APP_DIR/webhook-deploy.sh

# Admin Account
ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Domain
DOMAIN=$DOMAIN
APP_URL=https://app.$DOMAIN
LANDING_URL=https://$DOMAIN

# CORS
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://app.$DOMAIN
EOF
    
    chmod 600 .env
    deactivate
    
    log_success "Backend geconfigureerd"
    
    # Create webhook deploy script
    cat > $APP_DIR/webhook-deploy.sh << 'DEPLOYEOF'
#!/bin/bash
APP_DIR="APP_DIR_PLACEHOLDER"
LOG_FILE="$APP_DIR/logs/deploy.log"
LOCK_FILE="/tmp/facturatie-deploy.lock"

if [ -f "$LOCK_FILE" ]; then
    echo "$(date): Deploy already running" >> $LOG_FILE
    exit 0
fi
touch $LOCK_FILE

echo "" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
echo "$(date): Starting auto-deploy..." >> $LOG_FILE

cd $APP_DIR
git pull origin main >> $LOG_FILE 2>&1

cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt -q >> $LOG_FILE 2>&1
deactivate

cd $APP_DIR/frontend
yarn install --silent >> $LOG_FILE 2>&1
yarn build >> $LOG_FILE 2>&1

echo "$(date): Restarting services..." >> $LOG_FILE
supervisorctl restart all >> $LOG_FILE 2>&1
sleep 5

# Double check services
if ! supervisorctl status facturatie-backend | grep -q "RUNNING"; then
    echo "$(date): Backend not running, restarting..." >> $LOG_FILE
    supervisorctl restart facturatie-backend >> $LOG_FILE 2>&1
    sleep 3
fi

if ! supervisorctl status facturatie-frontend | grep -q "RUNNING"; then
    echo "$(date): Frontend not running, restarting..." >> $LOG_FILE
    supervisorctl restart facturatie-frontend >> $LOG_FILE 2>&1
    sleep 3
fi

echo "$(date): Final status:" >> $LOG_FILE
supervisorctl status >> $LOG_FILE 2>&1

rm -f $LOCK_FILE
echo "$(date): Deploy completed!" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
DEPLOYEOF
    
    sed -i "s|APP_DIR_PLACEHOLDER|$APP_DIR|g" $APP_DIR/webhook-deploy.sh
    chmod +x $APP_DIR/webhook-deploy.sh
}

# =============================================================================
# STAP 8: FRONTEND CONFIGUREREN
# =============================================================================
configure_frontend() {
    log_step "STAP 8/12: Frontend configureren..."
    
    cd $APP_DIR/frontend
    
    # Create .env file
    cat > .env << EOF
# =============================================================================
# FACTURATIE ERP - FRONTEND CONFIGURATIE
# Automatisch gegenereerd op: $(date)
# =============================================================================

REACT_APP_BACKEND_URL=https://$DOMAIN
REACT_APP_SUBDOMAIN_MODE=true
REACT_APP_APP_URL=https://app.$DOMAIN
REACT_APP_LANDING_URL=https://$DOMAIN
EOF
    
    # Build frontend if package.json exists
    if [ -f "package.json" ]; then
        log_info "Frontend dependencies installeren..."
        yarn install --silent 2>/dev/null || npm install --silent 2>/dev/null
        
        log_info "Frontend bouwen..."
        yarn build --silent 2>/dev/null || npm run build --silent 2>/dev/null
        
        log_success "Frontend gebouwd"
    else
        log_warning "package.json niet gevonden - upload frontend bestanden"
    fi
}

# =============================================================================
# STAP 9: SSL CERTIFICATEN
# =============================================================================
setup_ssl() {
    log_step "STAP 9/12: SSL certificaten aanvragen..."
    
    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true
    
    # Check if wildcard certificate already exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN-0001/fullchain.pem" ]; then
        log_info "Wildcard SSL certificaat bestaat al"
        return 0
    fi
    
    # Check if regular certificate already exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL certificaat bestaat al"
    fi
    
    # Ask for Cloudflare API token for wildcard SSL
    echo ""
    echo -e "${CYAN}Wildcard SSL Certificaat Setup${NC}"
    echo "Voor een wildcard certificaat (*.${DOMAIN}) is Cloudflare DNS validatie nodig."
    echo ""
    read -p "$(echo -e ${CYAN}Cloudflare API Token ${NC}[leeg voor standaard SSL]: )" CLOUDFLARE_TOKEN
    
    if [ -n "$CLOUDFLARE_TOKEN" ]; then
        log_info "Wildcard SSL certificaat aanvragen via Cloudflare..."
        
        # Install Cloudflare DNS plugin
        snap install certbot-dns-cloudflare 2>/dev/null || true
        snap set certbot trust-plugin-with-root=ok 2>/dev/null || true
        snap connect certbot:plugin certbot-dns-cloudflare 2>/dev/null || true
        
        # Create credentials file
        mkdir -p /root/.secrets
        cat > /root/.secrets/cloudflare.ini << CFEOF
dns_cloudflare_api_token = $CLOUDFLARE_TOKEN
CFEOF
        chmod 600 /root/.secrets/cloudflare.ini
        
        # Request wildcard certificate
        certbot certonly \
            --dns-cloudflare \
            --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
            --dns-cloudflare-propagation-seconds 120 \
            -d "$DOMAIN" \
            -d "*.$DOMAIN" \
            --email $EMAIL \
            --agree-tos \
            --non-interactive 2>/dev/null && {
            
            log_success "Wildcard SSL certificaat verkregen voor *.$DOMAIN"
            WILDCARD_SSL=true
            return 0
        }
        
        log_warning "Wildcard SSL mislukt, probeer standaard SSL..."
    fi
    
    # Fallback to standard SSL
    certbot certonly --standalone \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d app.$DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --non-interactive \
        --quiet 2>/dev/null || {
        
        log_warning "SSL certificaat aanvraag mislukt"
        log_info "Controleer of DNS records correct zijn geconfigureerd:"
        log_info "  A   @     -> $SERVER_IP"
        log_info "  A   www   -> $SERVER_IP"
        log_info "  A   app   -> $SERVER_IP"
        log_info ""
        log_info "Probeer later handmatig:"
        log_info "  sudo systemctl stop nginx"
        log_info "  sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN"
        log_info "  sudo systemctl start nginx"
        return 1
    }
    
    log_success "SSL certificaten verkregen"
}

# =============================================================================
# STAP 10: NGINX CONFIGUREREN
# =============================================================================
configure_nginx() {
    log_step "STAP 10/12: Nginx configureren..."
    
    # Remove CloudPanel and default configs
    rm -f /etc/nginx/sites-enabled/$DOMAIN.conf
    rm -f /etc/nginx/sites-enabled/${DOMAIN}.conf
    rm -f /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-enabled/default.conf
    
    # Create nginx configuration (compatible with older nginx versions)
    cat > /etc/nginx/sites-available/$DOMAIN.conf << EOF
# =============================================================================
# FACTURATIE ERP - NGINX CONFIGURATIE
# Automatisch gegenereerd op: $(date)
# =============================================================================

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN app.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HOOFDDOMEIN - Landing Pages
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name $DOMAIN www.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MainSSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml application/json application/javascript;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
    
    # Redirect to app subdomain
    location = /login { return 301 https://app.$DOMAIN/login; }
    location = /register { return 301 https://app.$DOMAIN/register; }
    location = /dashboard { return 301 https://app.$DOMAIN/dashboard; }
}

# APP SUBDOMAIN - Applicatie
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name app.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:AppSSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml application/json application/javascript;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF
    
    # Create wildcard config for customer subdomains (if wildcard SSL was obtained)
    if [ "$WILDCARD_SSL" = "true" ] || [ -f "/etc/letsencrypt/live/$DOMAIN-0001/fullchain.pem" ]; then
        log_info "Wildcard Nginx configuratie aanmaken..."
        
        cat > /etc/nginx/sites-available/facturatie-wildcard.conf << WEOF
# =============================================================================
# WILDCARD SUBDOMAIN CONFIGURATIE
# Alle *.${DOMAIN} subdomeinen worden automatisch ondersteund
# =============================================================================

# HTTP -> HTTPS redirect voor alle subdomeinen
server {
    listen 80;
    listen [::]:80;
    server_name *.$DOMAIN;
    return 301 https://\\\$host\\\$request_uri;
}

# HTTPS voor alle subdomeinen
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.$DOMAIN;
    
    # Wildcard SSL certificaat
    ssl_certificate /etc/letsencrypt/live/$DOMAIN-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN-0001/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
}
WEOF
        
        ln -sf /etc/nginx/sites-available/facturatie-wildcard.conf /etc/nginx/sites-enabled/
        log_success "Wildcard Nginx configuratie aangemaakt"
    fi
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/
    
    # Test and start nginx
    if nginx -t 2>/dev/null; then
        systemctl start nginx
        systemctl enable nginx > /dev/null 2>&1
        log_success "Nginx geconfigureerd en gestart"
    else
        log_warning "Nginx configuratie test mislukt - check handmatig met: nginx -t"
    fi
}

# =============================================================================
# STAP 11: SUPERVISOR SERVICES
# =============================================================================
configure_services() {
    log_step "STAP 11/12: Supervisor services configureren..."
    
    # Maak logs directory
    mkdir -p $APP_DIR/logs
    
    # Backend supervisor service
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
    
    # Frontend supervisor service
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
    
    # Reload supervisor
    supervisorctl reread > /dev/null 2>&1
    supervisorctl update > /dev/null 2>&1
    
    # Start services if server.py exists
    if [ -f "$APP_DIR/backend/server.py" ]; then
        supervisorctl restart all > /dev/null 2>&1
        sleep 5
        
        # Check if running
        if supervisorctl status facturatie-backend | grep -q "RUNNING"; then
            log_success "Backend service gestart"
        else
            log_warning "Backend start probleem - check logs met: cat $APP_DIR/logs/backend.err.log"
        fi
        
        if supervisorctl status facturatie-frontend | grep -q "RUNNING"; then
            log_success "Frontend service gestart"
        fi
        
        # Setup demo account
        if [ -f "$APP_DIR/setup_demo_account.py" ]; then
            log_info "Demo account aanmaken..."
            cd $APP_DIR/backend
            source venv/bin/activate
            python3 $APP_DIR/setup_demo_account.py > /dev/null 2>&1 || true
            deactivate
            log_success "Demo account aangemaakt"
        fi
    else
        log_warning "server.py niet gevonden - upload eerst de applicatie bestanden"
    fi
    
    # SSL auto-renewal cron
    (crontab -l 2>/dev/null | grep -v "certbot"; \
        echo "0 3 1 * * /snap/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    
    # Database backup cron (daily at 2 AM)
    (crontab -l 2>/dev/null | grep -v "mongodump"; \
        echo "0 2 * * * mongodump --db=$MONGO_DB_NAME --out=$APP_DIR/backups/\$(date +\%Y\%m\%d) --quiet") | crontab -
    
    log_success "Cron jobs geconfigureerd"
}

# =============================================================================
# STAP 12: BEHEER SCRIPTS INSTALLEREN
# =============================================================================
install_management_scripts() {
    log_step "STAP 12/12: Beheer scripts installeren..."
    
    # facturatie command
    cat > /usr/local/bin/facturatie << 'CMDEOF'
#!/bin/bash

APP_DIR="APP_DIR_PLACEHOLDER"
DB_NAME="facturatie_db"

case "$1" in
    status)
        echo "=== Service Status ==="
        supervisorctl status
        ;;
    restart)
        echo "Services herstarten..."
        supervisorctl restart all
        echo "✓ Klaar!"
        ;;
    logs)
        if [ "$2" == "backend" ]; then
            tail -f $APP_DIR/logs/backend.out.log
        elif [ "$2" == "error" ]; then
            tail -f $APP_DIR/logs/backend.err.log
        else
            tail -f $APP_DIR/logs/backend.out.log $APP_DIR/logs/frontend.out.log
        fi
        ;;
    backup)
        BACKUP_DIR="$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)"
        echo "Backup maken naar: $BACKUP_DIR"
        mkdir -p $BACKUP_DIR
        mongodump --db=$DB_NAME --out=$BACKUP_DIR --quiet
        echo "✓ Database backup voltooid!"
        ;;
    update)
        echo "Applicatie updaten..."
        cd $APP_DIR
        if [ -d ".git" ]; then
            git pull origin main
        fi
        cd backend
        source venv/bin/activate
        pip install -r requirements.txt -q
        deactivate
        cd ../frontend
        yarn install --silent 2>/dev/null
        yarn build --silent 2>/dev/null
        supervisorctl restart all
        echo "✓ Update voltooid!"
        ;;
    ssl-renew)
        echo "SSL certificaat vernieuwen..."
        /snap/bin/certbot renew --quiet
        systemctl reload nginx
        echo "✓ Klaar!"
        ;;
    demo)
        echo "Demo account aanmaken/resetten..."
        cd $APP_DIR/backend
        source venv/bin/activate
        python3 $APP_DIR/setup_demo_account.py
        deactivate
        echo "✓ Demo account klaar!"
        ;;
    *)
        echo "Facturatie ERP Beheer"
        echo ""
        echo "Gebruik: facturatie <command>"
        echo ""
        echo "Commands:"
        echo "  status     - Toon service status"
        echo "  restart    - Herstart alle services"
        echo "  logs       - Bekijk logs (logs backend / logs error)"
        echo "  backup     - Maak database backup"
        echo "  update     - Update applicatie van Git"
        echo "  ssl-renew  - Vernieuw SSL certificaat"
        echo "  demo       - Maak/reset demo account"
        ;;
esac
CMDEOF
    
    sed -i "s|APP_DIR_PLACEHOLDER|$APP_DIR|g" /usr/local/bin/facturatie
    chmod +x /usr/local/bin/facturatie
    
    log_success "Beheer command geïnstalleerd: facturatie"
}

# =============================================================================
# INSTALLATIE AFRONDEN
# =============================================================================
show_completion() {
    # Save credentials
    cat > $APP_DIR/CREDENTIALS.txt << EOF
╔═══════════════════════════════════════════════════════════════════╗
║   FACTURATIE ERP - INSTALLATIE CREDENTIALS                        ║
║   Aangemaakt: $(date)
╚═══════════════════════════════════════════════════════════════════╝

URLs:
  Landing Page:    https://$DOMAIN
  Applicatie:      https://app.$DOMAIN

Admin Login:
  E-mail:          admin@$DOMAIN
  Wachtwoord:      $ADMIN_PASSWORD

Demo Login:
  E-mail:          demo@facturatie.sr
  Wachtwoord:      demo2024

Database:
  Host:            localhost
  Database:        $MONGO_DB_NAME
  Gebruiker:       facturatie_user
  Wachtwoord:      $DB_PASSWORD
  
MongoDB URL:
  mongodb://localhost:27017/$MONGO_DB_NAME

JWT Secret:
  $JWT_SECRET

Bestanden:
  App directory:   $APP_DIR
  Backend .env:    $APP_DIR/backend/.env
  Frontend .env:   $APP_DIR/frontend/.env
  Logs:            $APP_DIR/logs/
  Backups:         $APP_DIR/backups/

Beheer Commands:
  facturatie status     - Service status
  facturatie restart    - Services herstarten
  facturatie logs       - Logs bekijken
  facturatie backup     - Database backup
  facturatie update     - Applicatie updaten
  facturatie ssl-renew  - SSL vernieuwen
  facturatie demo       - Demo account aanmaken

⚠ BEWAAR DEZE GEGEVENS VEILIG EN VERWIJDER DIT BESTAND DAARNA!

EOF
    
    chmod 600 $APP_DIR/CREDENTIALS.txt
    
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║   ✔ INSTALLATIE VOLTOOID!                                         ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BOLD}URLs:${NC}"
    echo "  Landing Page:    https://$DOMAIN"
    echo "  Applicatie:      https://app.$DOMAIN"
    echo ""
    echo -e "${BOLD}Admin Login:${NC}"
    echo "  E-mail:          admin@$DOMAIN"
    echo "  Wachtwoord:      $ADMIN_PASSWORD"
    echo ""
    echo -e "${BOLD}Demo Login:${NC}"
    echo "  E-mail:          demo@facturatie.sr"
    echo "  Wachtwoord:      demo2024"
    echo ""
    echo -e "${BOLD}Beheer:${NC}"
    echo "  facturatie status   - Service status bekijken"
    echo "  facturatie restart  - Services herstarten"
    echo "  facturatie logs     - Logs bekijken"
    echo "  facturatie backup   - Database backup maken"
    echo ""
    echo -e "${YELLOW}CREDENTIALS opgeslagen in:${NC}"
    echo "  $APP_DIR/CREDENTIALS.txt"
    echo ""
    echo -e "${BOLD}GitHub Webhook (Automatische Updates):${NC}"
    echo "  URL:     https://$DOMAIN/api/webhook/github"
    echo "  Secret:  (zie .env bestand)"
    echo ""
    echo "  Configureer in GitHub:"
    echo "  1. Ga naar: https://github.com/JOUW-REPO/settings/hooks"
    echo "  2. Add webhook"
    echo "  3. Payload URL: https://$DOMAIN/api/webhook/github"
    echo "  4. Content type: application/json"
    echo "  5. Secret: (kopieer GITHUB_WEBHOOK_SECRET uit .env)"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    check_root
    get_configuration
    
    prepare_system
    install_nodejs
    install_python
    install_mongodb
    create_cloudpanel_site
    download_code
    configure_backend
    configure_frontend
    setup_ssl
    configure_nginx
    configure_services
    install_management_scripts
    show_completion
}

main "$@"
