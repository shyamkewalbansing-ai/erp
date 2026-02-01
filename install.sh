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
#   ONE-CLICK INSTALLER v1.0
#   
#   Gebruik:
#   curl -sSL https://raw.githubusercontent.com/JOUW_USERNAME/facturatie/main/install.sh | sudo bash -s -- --domain=facturatie.sr --email=info@facturatie.sr
#
# =============================================================================

set -e

# =============================================================================
# KLEUREN EN LOGGING
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   FACTURATIE.SR - AUTOMATISCHE INSTALLATIE                    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}▶ $1${NC}"; }
log_info() { echo -e "${BLUE}  ℹ ${NC} $1"; }
log_success() { echo -e "${GREEN}  ✔ ${NC} $1"; }
log_warning() { echo -e "${YELLOW}  ⚠ ${NC} $1"; }
log_error() { echo -e "${RED}  ✖ ${NC} $1"; }

# =============================================================================
# CONFIGURATIE VARIABELEN
# =============================================================================
DOMAIN=""
EMAIL=""
DB_PASSWORD=""
ADMIN_PASSWORD=""
GITHUB_REPO="https://github.com/shyamkewalbansing-ai/erp.git"

APP_DIR=""
BACKEND_PORT=8001
FRONTEND_PORT=3000
MONGO_DB_NAME="facturatie_db"

# =============================================================================
# PARSE ARGUMENTEN
# =============================================================================
parse_args() {
    for arg in "$@"; do
        case $arg in
            --domain=*)
                DOMAIN="${arg#*=}"
                ;;
            --email=*)
                EMAIL="${arg#*=}"
                ;;
            --db-password=*)
                DB_PASSWORD="${arg#*=}"
                ;;
            --admin-password=*)
                ADMIN_PASSWORD="${arg#*=}"
                ;;
            --github=*)
                GITHUB_REPO="${arg#*=}"
                ;;
            --help)
                show_help
                exit 0
                ;;
        esac
    done
}

show_help() {
    echo "Gebruik: $0 [opties]"
    echo ""
    echo "Opties:"
    echo "  --domain=DOMAIN        Uw domein (bijv. facturatie.sr)"
    echo "  --email=EMAIL          E-mail voor SSL certificaten"
    echo "  --db-password=PASS     Database wachtwoord (wordt gegenereerd als leeg)"
    echo "  --admin-password=PASS  Admin wachtwoord (wordt gegenereerd als leeg)"
    echo "  --github=URL           GitHub repository URL"
    echo "  --help                 Toon deze help"
    echo ""
    echo "Voorbeeld:"
    echo "  curl -sSL https://raw.githubusercontent.com/user/repo/main/install.sh | sudo bash -s -- --domain=facturatie.sr --email=info@facturatie.sr"
}

# =============================================================================
# INTERACTIEVE MODUS
# =============================================================================
interactive_setup() {
    print_banner
    
    echo -e "${BOLD}Configuratie${NC}"
    echo ""
    
    if [ -z "$DOMAIN" ]; then
        read -p "  Domein (bijv. facturatie.sr): " DOMAIN
    fi
    
    if [ -z "$EMAIL" ]; then
        read -p "  E-mail (voor SSL): " EMAIL
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
        log_info "Database wachtwoord gegenereerd: $DB_PASSWORD"
    fi
    
    if [ -z "$ADMIN_PASSWORD" ]; then
        read -p "  Admin wachtwoord: " ADMIN_PASSWORD
        if [ -z "$ADMIN_PASSWORD" ]; then
            ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)
            log_info "Admin wachtwoord gegenereerd: $ADMIN_PASSWORD"
        fi
    fi
    
    # Validatie
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_error "Domein en e-mail zijn verplicht!"
        exit 1
    fi
    
    APP_DIR="/home/clp/htdocs/$DOMAIN"
    
    echo ""
    echo -e "${BOLD}Configuratie overzicht:${NC}"
    echo "  Domein:          $DOMAIN"
    echo "  E-mail:          $EMAIL"
    echo "  App Directory:   $APP_DIR"
    echo "  Database:        $MONGO_DB_NAME"
    echo ""
    
    read -p "Doorgaan met installatie? (j/n): " CONFIRM
    if [ "$CONFIRM" != "j" ] && [ "$CONFIRM" != "J" ] && [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Installatie geannuleerd."
        exit 0
    fi
}

# =============================================================================
# CHECK ROOT
# =============================================================================
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Dit script moet als root worden uitgevoerd!"
        log_info "Gebruik: sudo $0"
        exit 1
    fi
}

# =============================================================================
# SYSTEEM VOORBEREIDEN
# =============================================================================
prepare_system() {
    log_step "Systeem voorbereiden..."
    
    apt-get update -qq
    apt-get install -y -qq curl wget git build-essential software-properties-common unzip supervisor > /dev/null 2>&1
    
    log_success "Systeem pakketten geïnstalleerd"
}

# =============================================================================
# NODE.JS INSTALLEREN
# =============================================================================
install_nodejs() {
    log_step "Node.js installeren..."
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        apt-get install -y -qq nodejs > /dev/null 2>&1
    fi
    
    npm install -g yarn serve > /dev/null 2>&1
    
    log_success "Node.js $(node --version) geïnstalleerd"
}

# =============================================================================
# PYTHON INSTALLEREN
# =============================================================================
install_python() {
    log_step "Python installeren..."
    
    apt-get install -y -qq python3 python3-pip python3-venv python3-dev > /dev/null 2>&1
    
    log_success "Python $(python3 --version | cut -d' ' -f2) geïnstalleerd"
}

# =============================================================================
# MONGODB INSTALLEREN
# =============================================================================
install_mongodb() {
    log_step "MongoDB installeren..."
    
    if ! command -v mongod &> /dev/null; then
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
        
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
        
        apt-get update -qq
        apt-get install -y -qq mongodb-org > /dev/null 2>&1
    fi
    
    systemctl start mongod
    systemctl enable mongod > /dev/null 2>&1
    
    sleep 3
    
    # Maak database en gebruiker
    mongosh --quiet --eval "
        use $MONGO_DB_NAME
        db.createUser({
            user: 'facturatie_user',
            pwd: '$DB_PASSWORD',
            roles: [{ role: 'readWrite', db: '$MONGO_DB_NAME' }]
        })
    " 2>/dev/null || true
    
    log_success "MongoDB geïnstalleerd en geconfigureerd"
}

# =============================================================================
# APPLICATIE DOWNLOADEN
# =============================================================================
download_app() {
    log_step "Applicatie downloaden van GitHub..."
    
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Backup bestaande installatie
    if [ -d "$APP_DIR/backend" ]; then
        mv $APP_DIR/backend $APP_DIR/backend.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        mv $APP_DIR/frontend $APP_DIR/frontend.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    fi
    
    # Clone repository
    git clone --depth 1 $GITHUB_REPO . 2>/dev/null || {
        log_warning "Git clone mislukt. Maak directories handmatig..."
        mkdir -p backend frontend
    }
    
    log_success "Applicatie gedownload"
}

# =============================================================================
# BACKEND CONFIGUREREN
# =============================================================================
configure_backend() {
    log_step "Backend configureren..."
    
    cd $APP_DIR/backend
    
    # Virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Dependencies installeren
    if [ -f "requirements.txt" ]; then
        pip install --upgrade pip -q
        pip install -r requirements.txt -q
    fi
    
    # .env bestand
    cat > .env << EOF
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
    
    deactivate
    
    log_success "Backend geconfigureerd"
}

# =============================================================================
# FRONTEND CONFIGUREREN
# =============================================================================
configure_frontend() {
    log_step "Frontend configureren..."
    
    cd $APP_DIR/frontend
    
    # .env bestand
    cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
REACT_APP_SUBDOMAIN_MODE=true
REACT_APP_APP_URL=https://app.$DOMAIN
REACT_APP_LANDING_URL=https://$DOMAIN
EOF
    
    # Dependencies installeren
    if [ -f "package.json" ]; then
        yarn install --silent 2>/dev/null || npm install --silent 2>/dev/null
        yarn build --silent 2>/dev/null || npm run build --silent 2>/dev/null
    fi
    
    log_success "Frontend geconfigureerd"
}

# =============================================================================
# SUPERVISOR CONFIGUREREN
# =============================================================================
configure_supervisor() {
    log_step "Supervisor services configureren..."
    
    mkdir -p $APP_DIR/logs
    
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
    
    supervisorctl reread > /dev/null 2>&1
    supervisorctl update > /dev/null 2>&1
    
    log_success "Supervisor geconfigureerd"
}

# =============================================================================
# SSL CERTIFICATEN
# =============================================================================
setup_ssl() {
    log_step "SSL certificaten aanvragen..."
    
    apt-get install -y -qq certbot > /dev/null 2>&1
    
    mkdir -p /var/www/certbot/.well-known/acme-challenge
    
    # Tijdelijke nginx config voor certbot
    systemctl stop nginx 2>/dev/null || true
    
    # Check of certificaat al bestaat
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL certificaat bestaat al"
    else
        certbot certonly --standalone \
            -d $DOMAIN \
            -d www.$DOMAIN \
            -d app.$DOMAIN \
            --email $EMAIL \
            --agree-tos \
            --non-interactive \
            --quiet || {
            log_warning "SSL certificaat aanvraag mislukt"
            log_info "Probeer later handmatig: certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN -d app.$DOMAIN"
        }
    fi
    
    log_success "SSL geconfigureerd"
}

# =============================================================================
# NGINX CONFIGUREREN
# =============================================================================
configure_nginx() {
    log_step "Nginx configureren..."
    
    # Verwijder oude configs
    rm -f /etc/nginx/sites-enabled/$DOMAIN*
    rm -f /etc/nginx/sites-available/$DOMAIN*
    
    # Nieuwe config
    cat > /etc/nginx/sites-available/$DOMAIN.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN app.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $DOMAIN www.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
    
    location /app { return 301 https://app.$DOMAIN\$request_uri; }
    location = /login { return 301 https://app.$DOMAIN/login; }
    location = /register { return 301 https://app.$DOMAIN/register; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name app.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/
    
    nginx -t && systemctl start nginx
    
    log_success "Nginx geconfigureerd"
}

# =============================================================================
# CRON JOBS
# =============================================================================
setup_cron() {
    log_step "Automatische SSL vernieuwing instellen..."
    
    (crontab -l 2>/dev/null | grep -v "certbot"; echo "0 3 1 * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    
    log_success "Cron jobs geconfigureerd"
}

# =============================================================================
# AFRONDING
# =============================================================================
show_completion() {
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   ✔ INSTALLATIE VOLTOOID!                                     ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
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
    echo -e "${BOLD}Database:${NC}"
    echo "  Database:        $MONGO_DB_NAME"
    echo "  Gebruiker:       facturatie_user"
    echo "  Wachtwoord:      $DB_PASSWORD"
    echo ""
    echo -e "${BOLD}Bestanden:${NC}"
    echo "  App:             $APP_DIR"
    echo "  Logs:            $APP_DIR/logs/"
    echo ""
    echo -e "${BOLD}Beheer commando's:${NC}"
    echo "  supervisorctl status"
    echo "  supervisorctl restart facturatie-backend"
    echo "  supervisorctl restart facturatie-frontend"
    echo "  tail -f $APP_DIR/logs/backend.out.log"
    echo ""
    
    # Sla credentials op
    cat > $APP_DIR/CREDENTIALS.txt << EOF
=== FACTURATIE.SR CREDENTIALS ===
Aangemaakt: $(date)

URLs:
  Landing Page:    https://$DOMAIN
  Applicatie:      https://app.$DOMAIN

Admin Login:
  E-mail:          admin@$DOMAIN
  Wachtwoord:      $ADMIN_PASSWORD

Database:
  Host:            localhost
  Database:        $MONGO_DB_NAME
  Gebruiker:       facturatie_user
  Wachtwoord:      $DB_PASSWORD

MongoDB URL:
  mongodb://facturatie_user:$DB_PASSWORD@localhost:27017/$MONGO_DB_NAME?authSource=$MONGO_DB_NAME
EOF
    
    chmod 600 $APP_DIR/CREDENTIALS.txt
    
    log_info "Credentials opgeslagen in: $APP_DIR/CREDENTIALS.txt"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    check_root
    parse_args "$@"
    
    # Als geen argumenten, gebruik interactieve modus
    if [ -z "$DOMAIN" ]; then
        interactive_setup
    else
        print_banner
        APP_DIR="/home/clp/htdocs/$DOMAIN"
        
        # Genereer wachtwoorden als niet opgegeven
        [ -z "$DB_PASSWORD" ] && DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
        [ -z "$ADMIN_PASSWORD" ] && ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)
    fi
    
    prepare_system
    install_nodejs
    install_python
    install_mongodb
    download_app
    configure_backend
    configure_frontend
    configure_supervisor
    setup_ssl
    configure_nginx
    setup_cron
    show_completion
}

main "$@"
