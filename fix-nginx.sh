#!/bin/bash

# =============================================================================
# SNELLE FIX - Nginx Configuratie voor Facturatie.sr
# =============================================================================
# 
# Voer dit uit op uw server:
# chmod +x fix-nginx.sh && ./fix-nginx.sh
#
# =============================================================================

DOMAIN="facturatie.sr"
BACKEND_PORT=8001
FRONTEND_PORT=3000

echo "=== NGINX FIX VOOR FACTURATIE.SR ==="
echo ""

# Stop nginx
echo "[1/4] Nginx stoppen..."
systemctl stop nginx 2>/dev/null || true

# Verwijder oude configuratie
echo "[2/4] Oude configuratie verwijderen..."
rm -f /etc/nginx/sites-enabled/$DOMAIN.conf
rm -f /etc/nginx/sites-enabled/${DOMAIN}*
rm -f /etc/nginx/sites-available/$DOMAIN.conf
rm -f /etc/nginx/sites-available/${DOMAIN}*

# Maak nieuwe correcte configuratie
echo "[3/4] Nieuwe configuratie aanmaken..."

cat > /etc/nginx/sites-available/$DOMAIN.conf << 'NGINXCONF'
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name facturatie.sr www.facturatie.sr app.facturatie.sr;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# Hoofddomein - Landing Pages
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    
    server_name facturatie.sr www.facturatie.sr;
    
    ssl_certificate /etc/letsencrypt/live/facturatie.sr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/facturatie.sr/privkey.pem;
    ssl_session_timeout 1d;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
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
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    
    # Redirect naar app subdomain
    location /app {
        return 301 https://app.facturatie.sr$request_uri;
    }
    
    location = /login {
        return 301 https://app.facturatie.sr/login;
    }
    
    location = /register {
        return 301 https://app.facturatie.sr/register;
    }
}

# App Subdomain
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    
    server_name app.facturatie.sr;
    
    ssl_certificate /etc/letsencrypt/live/facturatie.sr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/facturatie.sr/privkey.pem;
    ssl_session_timeout 1d;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
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
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
NGINXCONF

# Enable configuratie
ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/

# Test en start nginx
echo "[4/4] Nginx testen en starten..."
nginx -t

if [ $? -eq 0 ]; then
    systemctl start nginx
    systemctl status nginx --no-pager
    echo ""
    echo "=== SUCCES! ==="
    echo ""
    echo "Nginx draait nu correct!"
    echo ""
    echo "Test de URLs:"
    echo "  https://facturatie.sr"
    echo "  https://app.facturatie.sr"
    echo ""
else
    echo ""
    echo "=== FOUT ==="
    echo "Nginx configuratie test mislukt. Zie bovenstaande foutmelding."
fi
