#!/bin/bash
# =============================================================================
# AUTOMATISCHE DOMEIN SETUP SCRIPT
# Dit script configureert Nginx en SSL voor een custom domein
# Gebruik: sudo ./setup-domain.sh <domein>
# Voorbeeld: sudo ./setup-domain.sh demogebruiker.facturatie.sr
# =============================================================================

set -e

DOMAIN=$1
APP_DIR="${APP_DIR:-/home/facturatie/htdocs/facturatie.sr}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
CERTBOT_WEBROOT="/var/www/certbot"

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Valideer input
if [ -z "$DOMAIN" ]; then
    log_error "Gebruik: $0 <domein>"
    exit 1
fi

log_info "Start setup voor domein: $DOMAIN"

# Stap 1: Maak certbot webroot directory
log_info "Maak certbot webroot directory..."
mkdir -p "$CERTBOT_WEBROOT/.well-known/acme-challenge"

# Stap 2: Maak Nginx config (eerst HTTP only voor SSL challenge)
log_info "Maak Nginx configuratie..."
NGINX_CONF="$NGINX_AVAILABLE/${DOMAIN}.conf"

cat > "$NGINX_CONF" << EOF
# HTTP server for $DOMAIN (SSL pending)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
        allow all;
    }
    
    # Proxy to frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }
}
EOF

# Stap 3: Enable de site
log_info "Enable Nginx site..."
ln -sf "$NGINX_CONF" "$NGINX_ENABLED/${DOMAIN}.conf"

# Stap 4: Test en reload Nginx
log_info "Test Nginx configuratie..."
nginx -t || {
    log_error "Nginx configuratie fout!"
    exit 1
}

log_info "Reload Nginx..."
systemctl reload nginx

# Stap 5: Wacht even voor DNS propagatie check
sleep 2

# Stap 6: Probeer SSL certificaat te verkrijgen
log_info "Verkrijg SSL certificaat..."

# Check of certbot beschikbaar is
if command -v certbot &> /dev/null; then
    # Probeer SSL met nginx plugin
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@facturatie.sr --redirect 2>&1 || {
        log_warn "Certbot met nginx plugin mislukt, probeer webroot methode..."
        
        # Probeer webroot methode
        certbot certonly --webroot -w "$CERTBOT_WEBROOT" -d "$DOMAIN" --non-interactive --agree-tos --email admin@facturatie.sr 2>&1 || {
            log_warn "SSL certificaat kon niet worden verkregen. DNS is mogelijk nog niet geconfigureerd."
            log_warn "Probeer later opnieuw met: sudo certbot --nginx -d $DOMAIN"
            # Ga door zonder SSL
        }
    }
    
    # Check of SSL certificaat is aangemaakt
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL certificaat succesvol verkregen!"
        
        # Update Nginx config met SSL
        cat > "$NGINX_CONF" << EOF
# HTTP to HTTPS redirect for $DOMAIN
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

# HTTPS server for $DOMAIN
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Proxy to frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }
}
EOF
        
        # Reload nginx met SSL config
        nginx -t && systemctl reload nginx
        
        log_info "SUCCESS: $DOMAIN is volledig geconfigureerd met SSL!"
        echo "SSL_ACTIVE=true"
        exit 0
    else
        log_warn "SSL certificaat niet gevonden na certbot"
    fi
else
    log_warn "Certbot niet gevonden. Installeer met: snap install certbot --classic"
fi

log_info "Setup voltooid voor $DOMAIN (zonder SSL)"
echo "SSL_ACTIVE=false"
exit 0
