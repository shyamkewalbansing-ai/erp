#!/bin/bash

# =============================================================================
# FIX SCRIPT - Lost de huidige Nginx/SSL problemen op
# =============================================================================
#
# Voer dit uit als u al problemen heeft met de installatie
#
# =============================================================================

DOMAIN="facturatie.sr"  # Pas aan indien nodig
EMAIL="info@facturatie.sr"  # Pas aan indien nodig
BACKEND_PORT=8001
FRONTEND_PORT=3000

echo "=== FIX SCRIPT VOOR FACTURATIE.SR ==="
echo ""

# Stop nginx
echo "[1/6] Nginx stoppen..."
systemctl stop nginx

# Verwijder alle oude configuraties
echo "[2/6] Oude configuraties verwijderen..."
rm -f /etc/nginx/sites-enabled/$DOMAIN*
rm -f /etc/nginx/sites-available/$DOMAIN*

# Maak certbot directory
echo "[3/6] Certbot directories aanmaken..."
mkdir -p /var/www/certbot/.well-known/acme-challenge
chown -R www-data:www-data /var/www/certbot

# Vraag SSL certificaat aan via standalone (geen nginx nodig)
echo "[4/6] SSL certificaat aanvragen (standalone)..."
certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d app.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --force-renewal

# Controleer of certificaat bestaat
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "ERROR: SSL certificaat niet gevonden!"
    echo ""
    echo "Mogelijke oorzaken:"
    echo "1. DNS records zijn niet correct geconfigureerd"
    echo "2. Domein wijst niet naar dit server IP"
    echo ""
    echo "Controleer met: dig $DOMAIN +short"
    echo "Moet uw server IP tonen."
    exit 1
fi

echo "[5/6] Nginx configuratie aanmaken..."

# Nieuwe configuratie
cat > /etc/nginx/sites-available/$DOMAIN.conf << EOF
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

# Hoofddomein
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    
    server_name $DOMAIN www.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MainSSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
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
    
    location /app {
        return 301 https://app.$DOMAIN\$request_uri;
    }
    
    location = /login {
        return 301 https://app.$DOMAIN/login;
    }
    
    location = /register {
        return 301 https://app.$DOMAIN/register;
    }
}

# App subdomain
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    
    server_name app.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:AppSSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
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

# Enable configuratie
ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/

# Test nginx
echo "[6/6] Nginx testen en starten..."
nginx -t

if [ $? -eq 0 ]; then
    systemctl start nginx
    echo ""
    echo "=== SUCCES ==="
    echo ""
    echo "Nginx draait nu correct met SSL!"
    echo ""
    echo "Test met:"
    echo "  curl -I https://$DOMAIN"
    echo "  curl -I https://app.$DOMAIN"
else
    echo ""
    echo "ERROR: Nginx configuratie test mislukt!"
    echo "Bekijk de foutmelding hierboven."
fi
