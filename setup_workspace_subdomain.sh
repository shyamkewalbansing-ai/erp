#!/bin/bash
# ================================================================
# Workspace Subdomain Setup Script
# Automatisch Nginx + SSL configureren voor nieuwe workspaces
# 
# Gebruik: sudo ./setup_workspace_subdomain.sh <subdomain> <workspace_id>
# Voorbeeld: sudo ./setup_workspace_subdomain.sh demogebruiker 3b4b8c8c-185a-4766-ad43-1c4779ac750c
# ================================================================

set -e

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuratie
MAIN_DOMAIN="facturatie.sr"
SERVER_IP="72.62.174.117"
FRONTEND_PORT="3000"
BACKEND_PORT="8001"

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Dit script moet als root worden uitgevoerd (sudo)${NC}"
    exit 1
fi

# Check argumenten
if [ -z "$1" ]; then
    echo -e "${YELLOW}Gebruik: $0 <subdomain> [workspace_id]${NC}"
    echo -e "Voorbeeld: $0 demogebruiker 3b4b8c8c-185a-4766-ad43-1c4779ac750c"
    exit 1
fi

SUBDOMAIN="$1"
WORKSPACE_ID="${2:-}"
FULL_DOMAIN="${SUBDOMAIN}.${MAIN_DOMAIN}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Workspace Subdomain Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Subdomain: ${YELLOW}${FULL_DOMAIN}${NC}"
echo -e "Workspace ID: ${YELLOW}${WORKSPACE_ID:-'niet opgegeven'}${NC}"
echo ""

# Stap 1: Nginx config aanmaken
echo -e "${YELLOW}[1/4] Nginx configuratie aanmaken...${NC}"

NGINX_CONFIG="/etc/nginx/sites-available/${SUBDOMAIN}"

cat > "$NGINX_CONFIG" << EOF
# Nginx config voor workspace: ${SUBDOMAIN}
# Gegenereerd op: $(date)

server {
    listen 80;
    listen [::]:80;
    server_name ${FULL_DOMAIN};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${FULL_DOMAIN};
    
    # SSL certificaten (gebruik hoofddomein cert, of eigen cert na certbot)
    ssl_certificate /etc/letsencrypt/live/${MAIN_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${MAIN_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # Gzip compressie
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Frontend (React app)
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Workspace-Subdomain ${SUBDOMAIN};
        ${WORKSPACE_ID:+proxy_set_header X-Workspace-ID ${WORKSPACE_ID};}
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Workspace-Subdomain ${SUBDOMAIN};
        ${WORKSPACE_ID:+proxy_set_header X-Workspace-ID ${WORKSPACE_ID};}
        proxy_read_timeout 300s;
    }
}
EOF

echo -e "${GREEN}✓ Nginx config aangemaakt: ${NGINX_CONFIG}${NC}"

# Stap 2: Symlink maken
echo -e "${YELLOW}[2/4] Nginx config activeren...${NC}"

ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/${SUBDOMAIN}"
echo -e "${GREEN}✓ Symlink aangemaakt${NC}"

# Stap 3: Nginx testen
echo -e "${YELLOW}[3/4] Nginx configuratie testen...${NC}"

if nginx -t 2>&1; then
    echo -e "${GREEN}✓ Nginx configuratie is geldig${NC}"
else
    echo -e "${RED}✗ Nginx configuratie fout! Check de config.${NC}"
    exit 1
fi

# Stap 4: Nginx herladen
echo -e "${YELLOW}[4/4] Nginx herladen...${NC}"

systemctl reload nginx
echo -e "${GREEN}✓ Nginx hergeladen${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SETUP VOLTOOID!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Uw subdomain is nu actief: ${YELLOW}https://${FULL_DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}BELANGRIJK: DNS Configuratie${NC}"
echo -e "Zorg dat u een A-record heeft aangemaakt:"
echo -e "  Naam:   ${SUBDOMAIN}"
echo -e "  Type:   A"
echo -e "  Waarde: ${SERVER_IP}"
echo ""
echo -e "${YELLOW}OPTIONEEL: Eigen SSL certificaat${NC}"
echo -e "Voor een eigen certificaat voor dit subdomain:"
echo -e "  sudo certbot --nginx -d ${FULL_DOMAIN}"
echo ""
echo -e "${GREEN}========================================${NC}"
