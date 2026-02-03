#!/bin/bash
#===============================================================================
# FACTURATIE N.V. - Automatische Deployment Script
# 
# Dit script:
# 1. Maakt een backup van de huidige installatie
# 2. Haalt de nieuwste code op van GitHub
# 3. Update Python dependencies
# 4. Update Node.js dependencies
# 5. Bouwt de React frontend
# 6. Herstart alle services
#
# GEBRUIK:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# VEREISTEN:
#   - Git
#   - Python 3.10+
#   - Node.js 18+
#   - Yarn
#   - MongoDB (lokaal of extern)
#   - Supervisor of systemd voor process management
#===============================================================================

set -e  # Stop bij errors

# ==========================
# CONFIGURATIE - PAS AAN!
# ==========================
APP_NAME="facturatie-nv"
APP_DIR="/var/www/$APP_NAME"           # Waar de app staat
GITHUB_REPO="https://github.com/JOUW_USERNAME/JOUW_REPO.git"  # PAS AAN!
BRANCH="main"                          # Git branch
BACKUP_DIR="/var/backups/$APP_NAME"    # Backup locatie
LOG_FILE="/var/log/$APP_NAME-deploy.log"

# Backend configuratie
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$APP_DIR/venv"               # Python virtual environment
BACKEND_PORT=8001

# Frontend configuratie
FRONTEND_DIR="$APP_DIR/frontend"
FRONTEND_PORT=3000

# Colors voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==========================
# FUNCTIES
# ==========================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WAARSCHUWING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[FOUT]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check of script als root draait
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        warn "Script draait niet als root. Sommige operaties kunnen falen."
    fi
}

# Maak backup
create_backup() {
    log "📦 Backup maken van huidige installatie..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date '+%Y%m%d_%H%M%S').tar.gz"
    
    if [ -d "$APP_DIR" ]; then
        tar -czf "$BACKUP_FILE" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)" 2>/dev/null || true
        log "✅ Backup gemaakt: $BACKUP_FILE"
    else
        warn "Geen bestaande installatie gevonden om te backuppen"
    fi
    
    # Verwijder oude backups (houd laatste 5)
    ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
}

# Stop services
stop_services() {
    log "🛑 Stoppen van services..."
    
    # Probeer supervisor
    if command -v supervisorctl &> /dev/null; then
        supervisorctl stop "$APP_NAME-backend" 2>/dev/null || true
        supervisorctl stop "$APP_NAME-frontend" 2>/dev/null || true
    fi
    
    # Probeer systemd
    if command -v systemctl &> /dev/null; then
        systemctl stop "$APP_NAME-backend" 2>/dev/null || true
        systemctl stop "$APP_NAME-frontend" 2>/dev/null || true
    fi
    
    # Kill processen op poorten
    fuser -k $BACKEND_PORT/tcp 2>/dev/null || true
    fuser -k $FRONTEND_PORT/tcp 2>/dev/null || true
    
    sleep 2
    log "✅ Services gestopt"
}

# Pull code van GitHub
pull_code() {
    log "📥 Code ophalen van GitHub..."
    
    if [ -d "$APP_DIR/.git" ]; then
        # Bestaande repo - pull updates
        cd "$APP_DIR"
        git fetch origin
        git reset --hard "origin/$BRANCH"
        git clean -fd
    else
        # Nieuwe installatie - clone repo
        mkdir -p "$(dirname $APP_DIR)"
        git clone -b "$BRANCH" "$GITHUB_REPO" "$APP_DIR"
    fi
    
    log "✅ Code bijgewerkt naar laatste versie"
}

# Setup Python virtual environment en dependencies
setup_backend() {
    log "🐍 Backend dependencies installeren..."
    
    cd "$BACKEND_DIR"
    
    # Maak virtual environment als het niet bestaat
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
    fi
    
    # Activeer virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Installeer dependencies
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    
    # Installeer emergent integrations (als nodig)
    pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ 2>/dev/null || true
    
    deactivate
    
    log "✅ Backend dependencies geïnstalleerd"
}

# Setup frontend en build
setup_frontend() {
    log "⚛️ Frontend dependencies installeren en bouwen..."
    
    cd "$FRONTEND_DIR"
    
    # Check Node.js versie
    NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js versie 18+ vereist. Huidige versie: $(node -v)"
    fi
    
    # Installeer dependencies
    if [ -f "yarn.lock" ]; then
        yarn install --frozen-lockfile
    elif [ -f "package-lock.json" ]; then
        npm ci
    else
        yarn install
    fi
    
    # Build production versie
    yarn build || npm run build
    
    log "✅ Frontend gebouwd"
}

# Configureer environment variables
setup_env() {
    log "🔧 Environment variables configureren..."
    
    # Backend .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        warn "Backend .env niet gevonden - kopieer .env.example of maak handmatig aan"
        cat > "$BACKEND_DIR/.env" << 'EOF'
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie

# Security
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_SECRET_KEY
APP_URL=https://jouw-domein.com

# Email (optioneel)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EOF
    fi
    
    # Frontend .env
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        warn "Frontend .env niet gevonden"
        cat > "$FRONTEND_DIR/.env" << 'EOF'
REACT_APP_BACKEND_URL=https://jouw-domein.com
EOF
    fi
    
    log "✅ Environment geconfigureerd"
}

# Start services
start_services() {
    log "🚀 Services starten..."
    
    # Probeer supervisor
    if command -v supervisorctl &> /dev/null; then
        supervisorctl reread
        supervisorctl update
        supervisorctl start "$APP_NAME-backend" 2>/dev/null || start_with_nohup
        supervisorctl start "$APP_NAME-frontend" 2>/dev/null || true
        supervisorctl status
    # Probeer systemd
    elif command -v systemctl &> /dev/null; then
        systemctl daemon-reload
        systemctl start "$APP_NAME-backend" 2>/dev/null || start_with_nohup
        systemctl start "$APP_NAME-frontend" 2>/dev/null || true
        systemctl status "$APP_NAME-backend" --no-pager || true
    else
        start_with_nohup
    fi
    
    log "✅ Services gestart"
}

# Start met nohup als fallback
start_with_nohup() {
    log "📌 Services starten met nohup..."
    
    # Start backend
    cd "$BACKEND_DIR"
    source "$VENV_DIR/bin/activate"
    nohup uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT > /var/log/$APP_NAME-backend.log 2>&1 &
    deactivate
    
    # Start frontend (alleen in dev, voor productie gebruik nginx)
    # cd "$FRONTEND_DIR"
    # nohup serve -s build -l $FRONTEND_PORT > /var/log/$APP_NAME-frontend.log 2>&1 &
    
    info "Backend gestart op poort $BACKEND_PORT"
    info "Voor productie: configureer nginx om frontend build te serveren"
}

# Health check
health_check() {
    log "🏥 Health check uitvoeren..."
    
    sleep 5
    
    # Check backend
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/health" | grep -q "200"; then
        log "✅ Backend is gezond"
    else
        warn "Backend health check gefaald - check logs"
    fi
}

# Toon nginx configuratie
show_nginx_config() {
    info "📋 Aanbevolen Nginx configuratie:"
    cat << 'NGINX'

# /etc/nginx/sites-available/facturatie-nv
server {
    listen 80;
    server_name jouw-domein.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jouw-domein.com;
    
    # SSL certificaten (gebruik certbot)
    ssl_certificate /etc/letsencrypt/live/jouw-domein.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jouw-domein.com/privkey.pem;
    
    # Frontend (React build)
    location / {
        root /var/www/facturatie-nv/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
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
    }
}

NGINX
}

# Toon supervisor configuratie
show_supervisor_config() {
    info "📋 Aanbevolen Supervisor configuratie:"
    cat << 'SUPERVISOR'

# /etc/supervisor/conf.d/facturatie-nv.conf
[program:facturatie-nv-backend]
directory=/var/www/facturatie-nv/backend
command=/var/www/facturatie-nv/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/facturatie-nv/backend.err.log
stdout_logfile=/var/log/facturatie-nv/backend.out.log
environment=PATH="/var/www/facturatie-nv/venv/bin"

SUPERVISOR
}

# ==========================
# MAIN SCRIPT
# ==========================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║           FACTURATIE N.V. - Automatische Deployment              ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Maak log directory
    mkdir -p "$(dirname $LOG_FILE)"
    
    log "🚀 Deployment gestart"
    
    check_root
    create_backup
    stop_services
    pull_code
    setup_env
    setup_backend
    setup_frontend
    start_services
    health_check
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    ✅ DEPLOYMENT VOLTOOID!                       ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    
    log "✅ Deployment voltooid!"
    
    echo ""
    info "📝 VOLGENDE STAPPEN:"
    echo "   1. Controleer de .env bestanden in backend/ en frontend/"
    echo "   2. Configureer nginx voor productie (zie hieronder)"
    echo "   3. Setup SSL met: sudo certbot --nginx -d jouw-domein.com"
    echo ""
    
    show_nginx_config
    echo ""
    show_supervisor_config
}

# Run main functie
main "$@"
