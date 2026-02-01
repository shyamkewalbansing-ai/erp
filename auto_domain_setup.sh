#!/bin/bash
# ================================================================
# Auto Domain Setup Script
# Called by the backend API to automatically configure domains
# 
# Usage: ./auto_domain_setup.sh <domain> <workspace_id>
# ================================================================

DOMAIN="$1"
WORKSPACE_ID="$2"
LOG_FILE="/home/clp/htdocs/facturatie.sr/logs/domain_setup.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "$1"
}

# Check arguments
if [ -z "$DOMAIN" ]; then
    log "ERROR: Domain is required"
    exit 1
fi

log "Starting setup for domain: $DOMAIN"

# Create Nginx config
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    
    # Initially use main domain cert, certbot will update this
    ssl_certificate /etc/letsencrypt/live/facturatie.sr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/facturatie.sr/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Workspace-ID $WORKSPACE_ID;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Workspace-ID $WORKSPACE_ID;
    }
}
EOF

log "Nginx config created: $NGINX_CONFIG"

# Enable the site
ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN"
log "Symlink created"

# Test nginx config
if nginx -t 2>&1; then
    log "Nginx config is valid"
else
    log "ERROR: Nginx config is invalid"
    exit 1
fi

# Reload nginx
systemctl reload nginx
log "Nginx reloaded"

# Create certbot directory if not exists
mkdir -p /var/www/certbot

# Try to get SSL certificate (non-interactive)
log "Attempting to get SSL certificate..."
if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --non-interactive --agree-tos --email admin@facturatie.sr 2>&1; then
    log "SSL certificate obtained successfully"
    
    # Update nginx config with new certificate
    sed -i "s|/etc/letsencrypt/live/facturatie.sr/|/etc/letsencrypt/live/$DOMAIN/|g" "$NGINX_CONFIG"
    
    # Reload nginx with new cert
    systemctl reload nginx
    log "Nginx reloaded with new certificate"
else
    log "WARNING: Could not obtain SSL certificate. Using main domain cert."
    log "Make sure DNS A record points to 72.62.174.117"
fi

log "Setup completed for domain: $DOMAIN"
echo "SUCCESS"
