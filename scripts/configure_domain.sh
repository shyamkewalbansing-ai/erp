#!/bin/bash
# =============================================================================
# NGINX Domain Configuration Script for Facturatie.sr
# =============================================================================
# Usage: sudo ./configure_domain.sh <domain> <workspace_slug> [--ssl]
# Example: sudo ./configure_domain.sh portal.example.com myworkspace --ssl
# =============================================================================

set -e

# Configuration
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
WEBROOT="/var/www"
CERTBOT_WEBROOT="/var/www/certbot"
BACKEND_PORT=8001
LOG_FILE="/var/log/facturatie/domain_config.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "[ERROR] $1" >> "$LOG_FILE" 2>/dev/null || true
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "Dit script moet als root worden uitgevoerd (gebruik sudo)"
fi

# Check arguments
if [ $# -lt 2 ]; then
    echo "Gebruik: $0 <domain> <workspace_slug> [--ssl]"
    echo "Voorbeeld: $0 portal.example.com myworkspace --ssl"
    exit 1
fi

DOMAIN="$1"
WORKSPACE_SLUG="$2"
ENABLE_SSL=false

if [ "$3" == "--ssl" ]; then
    ENABLE_SSL=true
fi

log "Starting domain configuration for: $DOMAIN (workspace: $WORKSPACE_SLUG)"

# Create directories
mkdir -p "$CERTBOT_WEBROOT"
mkdir -p "$(dirname "$LOG_FILE")"

# Generate HTTP-only config first
generate_http_config() {
    cat << EOF
# Nginx configuration for $DOMAIN
# Generated: $(date)
# Workspace: $WORKSPACE_SLUG

upstream ${WORKSPACE_SLUG}_backend {
    server 127.0.0.1:${BACKEND_PORT};
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
        allow all;
    }

    # Frontend static files
    root ${WEBROOT}/${WORKSPACE_SLUG}/frontend/build;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://${WORKSPACE_SLUG}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://${WORKSPACE_SLUG}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    # React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
EOF
}

# Generate HTTPS config
generate_https_config() {
    cat << EOF
# Nginx configuration for $DOMAIN (SSL enabled)
# Generated: $(date)
# Workspace: $WORKSPACE_SLUG

upstream ${WORKSPACE_SLUG}_backend {
    server 127.0.0.1:${BACKEND_PORT};
    keepalive 32;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
        allow all;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    root ${WEBROOT}/${WORKSPACE_SLUG}/frontend/build;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://${WORKSPACE_SLUG}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://${WORKSPACE_SLUG}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    # React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
EOF
}

# Step 1: Create HTTP config first
log "Generating Nginx configuration..."
CONFIG_FILE="${NGINX_AVAILABLE}/${DOMAIN}"

if [ "$ENABLE_SSL" = true ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    generate_https_config > "$CONFIG_FILE"
    log "Generated HTTPS configuration"
else
    generate_http_config > "$CONFIG_FILE"
    log "Generated HTTP configuration"
fi

# Step 2: Enable the site
log "Enabling site..."
if [ ! -L "${NGINX_ENABLED}/${DOMAIN}" ]; then
    ln -s "$CONFIG_FILE" "${NGINX_ENABLED}/${DOMAIN}"
fi

# Step 3: Test nginx configuration
log "Testing Nginx configuration..."
if ! nginx -t 2>/dev/null; then
    error "Nginx configuratie test mislukt. Controleer de logs."
fi

# Step 4: Reload nginx
log "Reloading Nginx..."
systemctl reload nginx

log "✅ Nginx configuratie succesvol geïnstalleerd voor $DOMAIN"

# Step 5: Optionally install SSL
if [ "$ENABLE_SSL" = true ] && [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    log "Installing SSL certificate..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        warn "Certbot niet gevonden. Installeer met: apt install certbot python3-certbot-nginx"
        exit 0
    fi
    
    # Obtain SSL certificate
    certbot certonly \
        --webroot \
        -w "$CERTBOT_WEBROOT" \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "ssl@facturatie.sr" \
        --expand || {
            warn "SSL certificaat installatie mislukt. Controleer DNS configuratie."
            exit 0
        }
    
    # Update nginx config with SSL
    log "Updating Nginx configuration with SSL..."
    generate_https_config > "$CONFIG_FILE"
    
    # Test and reload
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log "✅ SSL certificaat succesvol geïnstalleerd!"
    else
        error "Nginx SSL configuratie test mislukt."
    fi
fi

echo ""
echo "=========================================="
echo "Domain configuratie voltooid!"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Workspace: $WORKSPACE_SLUG"
echo "Config file: $CONFIG_FILE"
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "SSL: Actief"
else
    echo "SSL: Niet actief (voer script uit met --ssl flag)"
fi
echo "=========================================="
