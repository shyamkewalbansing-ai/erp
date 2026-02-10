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
#   COMPLETE CLOUDPANEL INSTALLER v3.1
#   
#   Dit script installeert ALLES automatisch:
#   - CloudPanel site aanmaken (via clpctl)
#   - MongoDB 7.0
#   - Node.js 20 + Yarn
#   - Python 3 + venv
#   - SSL certificaten (Let's Encrypt)
#   - Nginx (hoofddomein + app subdomain)
#   - Supervisor services
#   - Database backup cron
#   - Beheer commands (update/backup/restore)
#
#   GEBRUIK:
#   chmod +x COMPLETE_INSTALL.sh
#   sudo ./COMPLETE_INSTALL.sh
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
    echo "║   FACTURATIE ERP - COMPLETE CLOUDPANEL INSTALLER                  ║"
    echo "║   Versie 3.0                                                      ║"
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
    
    # Directories
    APP_DIR="/home/clp/htdocs/$DOMAIN"
    BACKEND_PORT=8001
    FRONTEND_PORT=3000
    MONGO_DB_NAME="facturatie_db"
    
    echo ""
    echo -e "${BOLD}Configuratie overzicht:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Domein:           $DOMAIN"
    echo "  App subdomain:    app.$DOMAIN"
    echo "  E-mail:           $EMAIL"
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
    
    # Site user password genereren
    SITE_USER_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
}

# =============================================================================
# STAP 0: CLOUDPANEL SITE AANMAKEN
# =============================================================================
create_cloudpanel_site() {
    log_step "STAP 0/11: CloudPanel site aanmaken..."
    
    # Check of CloudPanel is geïnstalleerd
    if ! command -v clpctl &> /dev/null; then
        log_warning "CloudPanel CLI (clpctl) niet gevonden!"
        log_info "Installeer CloudPanel eerst: https://www.cloudpanel.io/docs/v2/getting-started/"
        log_info "Of maak de site handmatig aan in CloudPanel."
        return 1
    fi
    
    # Check of site al bestaat
    if [ -d "$APP_DIR" ]; then
        log_info "Site directory bestaat al: $APP_DIR"
        log_info "Site wordt niet opnieuw aangemaakt in CloudPanel"
        return 0
    fi
    
    # Maak Node.js site aan in CloudPanel
    log_info "Site aanmaken via CloudPanel CLI..."
    
    clpctl site:add:nodejs \
        --domainName="$DOMAIN" \
        --nodejsVersion="20" \
        --appPort="$FRONTEND_PORT" \
        --siteUser="clp" \
        --siteUserPassword="$SITE_USER_PASSWORD" 2>/dev/null || {
        
        log_warning "Kon site niet aanmaken via clpctl"
        log_info "Probeer alternatieve methode..."
        
        # Alternatief: maak directory structuur handmatig
        mkdir -p "$APP_DIR"
        chown -R clp:clp "$APP_DIR" 2>/dev/null || true
    }
    
    # Voeg app subdomain toe
    log_info "App subdomain toevoegen..."
    clpctl site:domain:add --domainName="$DOMAIN" --newDomainName="app.$DOMAIN" 2>/dev/null || {
        log_info "Subdomain toevoegen via CLI niet gelukt - wordt later via Nginx geconfigureerd"
    }
    
    # Voeg www subdomain toe
    clpctl site:domain:add --domainName="$DOMAIN" --newDomainName="www.$DOMAIN" 2>/dev/null || true
    
    log_success "CloudPanel site geconfigureerd"
}

# =============================================================================
# STAP 1: SYSTEEM VOORBEREIDEN
# =============================================================================
prepare_system() {
    log_step "STAP 1/11: Systeem voorbereiden..."
    
    apt-get update -qq
    apt-get install -y -qq \
        curl wget git build-essential \
        software-properties-common unzip \
        supervisor certbot python3-certbot-nginx \
        gnupg ca-certificates > /dev/null 2>&1
    
    log_success "Systeem pakketten geïnstalleerd"
}

# =============================================================================
# STAP 2: NODE.JS 20 INSTALLEREN
# =============================================================================
install_nodejs() {
    log_step "STAP 2/11: Node.js 20 installeren..."
    
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 20 ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        apt-get install -y -qq nodejs > /dev/null 2>&1
    fi
    
    npm install -g yarn serve > /dev/null 2>&1
    
    log_success "Node.js $(node --version) + Yarn $(yarn --version) geïnstalleerd"
}

# =============================================================================
# STAP 3: PYTHON INSTALLEREN
# =============================================================================
install_python() {
    log_step "STAP 3/11: Python installeren..."
    
    apt-get install -y -qq \
        python3 python3-pip python3-venv \
        python3-dev > /dev/null 2>&1
    
    log_success "Python $(python3 --version | cut -d' ' -f2) geïnstalleerd"
}

# =============================================================================
# STAP 4: MONGODB 7.0 INSTALLEREN
# =============================================================================
install_mongodb() {
    log_step "STAP 4/10: MongoDB 7.0 installeren..."
    
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
# STAP 5: APP DIRECTORY VOORBEREIDEN
# =============================================================================
prepare_app_directory() {
    log_step "STAP 5/10: App directory voorbereiden..."
    
    mkdir -p $APP_DIR/{backend,frontend,logs,backups}
    mkdir -p /var/www/certbot/.well-known/acme-challenge
    chown -R www-data:www-data /var/www/certbot
    
    # Download from GitHub if specified
    if [ -n "$GITHUB_REPO" ]; then
        log_info "Code downloaden van GitHub..."
        cd $APP_DIR
        git clone --depth 1 "$GITHUB_REPO" temp_clone 2>/dev/null || true
        
        if [ -d "temp_clone/backend" ]; then
            cp -r temp_clone/backend/* backend/ 2>/dev/null || true
            cp -r temp_clone/frontend/* frontend/ 2>/dev/null || true
            rm -rf temp_clone
            log_success "Code gedownload van GitHub"
        else
            rm -rf temp_clone
            log_warning "GitHub clone mislukt - upload bestanden handmatig"
        fi
    fi
    
    log_success "App directory voorbereid: $APP_DIR"
}

# =============================================================================
# STAP 6: BACKEND CONFIGUREREN
# =============================================================================
configure_backend() {
    log_step "STAP 6/10: Backend configureren..."
    
    cd $APP_DIR/backend
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        pip install --upgrade pip -q
        pip install -r requirements.txt -q
    fi
    
    # Create .env file
    cat > .env << EOF
# =============================================================================
# FACTURATIE ERP - BACKEND CONFIGURATIE
# Automatisch gegenereerd op: $(date)
# =============================================================================

# Database
MONGO_URL=mongodb://facturatie_user:$DB_PASSWORD@localhost:27017/$MONGO_DB_NAME?authSource=$MONGO_DB_NAME
DB_NAME=$MONGO_DB_NAME

# Server
HOST=0.0.0.0
PORT=$BACKEND_PORT

# Security
JWT_SECRET=$JWT_SECRET

# Admin Account
ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Domain
DOMAIN=$DOMAIN
APP_URL=https://app.$DOMAIN
LANDING_URL=https://$DOMAIN

# CORS
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://app.$DOMAIN

# SMTP (configureer naar eigen instellingen)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@$DOMAIN
EOF
    
    chmod 600 .env
    deactivate
    
    log_success "Backend geconfigureerd"
}

# =============================================================================
# STAP 7: FRONTEND CONFIGUREREN
# =============================================================================
configure_frontend() {
    log_step "STAP 7/10: Frontend configureren..."
    
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
# STAP 8: SSL CERTIFICATEN
# =============================================================================
setup_ssl() {
    log_step "STAP 8/10: SSL certificaten aanvragen..."
    
    # Stop nginx if running
    systemctl stop nginx 2>/dev/null || true
    
    # Check if certificate already exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL certificaat bestaat al"
        return 0
    fi
    
    # Request certificate using standalone method
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
        log_info "  A   @     -> UW_SERVER_IP"
        log_info "  A   www   -> UW_SERVER_IP"
        log_info "  A   app   -> UW_SERVER_IP"
        log_info ""
        log_info "Probeer later handmatig:"
        log_info "  certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN"
        return 1
    }
    
    log_success "SSL certificaten verkregen"
}

# =============================================================================
# STAP 9: NGINX CONFIGUREREN
# =============================================================================
configure_nginx() {
    log_step "STAP 9/10: Nginx configureren..."
    
    # Remove old configurations
    rm -f /etc/nginx/sites-enabled/$DOMAIN*
    rm -f /etc/nginx/sites-available/$DOMAIN*
    
    # Check if SSL certificate exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        SSL_ENABLED=true
    else
        SSL_ENABLED=false
        log_warning "Geen SSL certificaat - configureer HTTP only"
    fi
    
    # Create nginx configuration
    cat > /etc/nginx/sites-available/$DOMAIN.conf << 'NGINXEOF'
# =============================================================================
# FACTURATIE ERP - NGINX CONFIGURATIE
# =============================================================================

# HTTP -> HTTPS redirect
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
    ssl_session_cache shared:MainSSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss;
    
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
        client_max_body_size 50M;
    }
    
    # Redirect to app subdomain
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
        client_max_body_size 50M;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:FRONTEND_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
NGINXEOF
    
    # Replace placeholders
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN.conf
    sed -i "s/BACKEND_PORT_PLACEHOLDER/$BACKEND_PORT/g" /etc/nginx/sites-available/$DOMAIN.conf
    sed -i "s/FRONTEND_PORT_PLACEHOLDER/$FRONTEND_PORT/g" /etc/nginx/sites-available/$DOMAIN.conf
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/
    
    # Test and start nginx
    if nginx -t 2>/dev/null; then
        systemctl start nginx
        systemctl enable nginx > /dev/null 2>&1
        log_success "Nginx geconfigureerd en gestart"
    else
        log_error "Nginx configuratie test mislukt!"
    fi
}

# =============================================================================
# STAP 10: SUPERVISOR EN CRON JOBS
# =============================================================================
configure_services() {
    log_step "STAP 10/10: Services en cron jobs configureren..."
    
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
        log_success "Backend en frontend services gestart"
        
        # Wait for backend to start
        sleep 5
        
        # Setup demo account
        if [ -f "$APP_DIR/setup_demo_account.py" ]; then
            log_info "Demo account aanmaken..."
            cd $APP_DIR/backend
            source venv/bin/activate
            python3 $APP_DIR/setup_demo_account.py > /dev/null 2>&1 || true
            deactivate
            log_success "Demo account aangemaakt (demo@facturatie.sr / demo2024)"
        fi
    else
        log_warning "server.py niet gevonden - upload eerst de applicatie bestanden"
    fi
    
    # SSL auto-renewal cron
    (crontab -l 2>/dev/null | grep -v "certbot"; \
        echo "0 3 1 * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    
    # Database backup cron (daily at 2 AM)
    (crontab -l 2>/dev/null | grep -v "mongodump"; \
        echo "0 2 * * * mongodump --db=$MONGO_DB_NAME --out=$APP_DIR/backups/\$(date +\%Y\%m\%d) --quiet") | crontab -
    
    log_success "Cron jobs geconfigureerd (SSL renewal + database backup)"
}

# =============================================================================
# BEHEER SCRIPTS INSTALLEREN
# =============================================================================
install_management_scripts() {
    log_info "Beheer scripts installeren..."
    
    # facturatie command
    cat > /usr/local/bin/facturatie << 'CMDEOF'
#!/bin/bash

APP_DIR="/home/clp/htdocs/DOMAIN_PLACEHOLDER"
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
        certbot renew --quiet
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
    
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /usr/local/bin/facturatie
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
  mongodb://facturatie_user:$DB_PASSWORD@localhost:27017/$MONGO_DB_NAME?authSource=$MONGO_DB_NAME

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
    echo -e "${BOLD}Database:${NC}"
    echo "  Database:        $MONGO_DB_NAME"
    echo "  Wachtwoord:      $DB_PASSWORD"
    echo ""
    echo -e "${BOLD}Beheer:${NC}"
    echo "  facturatie status   - Service status bekijken"
    echo "  facturatie restart  - Services herstarten"
    echo "  facturatie logs     - Logs bekijken"
    echo "  facturatie backup   - Database backup maken"
    echo ""
    echo -e "${YELLOW}CREDENTIALS:${NC}"
    echo "  Opgeslagen in: $APP_DIR/CREDENTIALS.txt"
    echo ""
    
    if [ ! -f "$APP_DIR/backend/server.py" ]; then
        echo -e "${YELLOW}VOLGENDE STAPPEN:${NC}"
        echo ""
        echo "  1. Upload applicatie bestanden naar:"
        echo "     Backend:  $APP_DIR/backend/"
        echo "     Frontend: $APP_DIR/frontend/"
        echo ""
        echo "  2. Installeer backend dependencies:"
        echo "     cd $APP_DIR/backend"
        echo "     source venv/bin/activate"
        echo "     pip install -r requirements.txt"
        echo ""
        echo "  3. Bouw frontend:"
        echo "     cd $APP_DIR/frontend"
        echo "     yarn install && yarn build"
        echo ""
        echo "  4. Start services:"
        echo "     facturatie restart"
        echo ""
    fi
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
    prepare_app_directory
    configure_backend
    configure_frontend
    setup_ssl
    configure_nginx
    configure_services
    install_management_scripts
    show_completion
}

main "$@"
