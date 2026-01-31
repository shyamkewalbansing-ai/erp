#!/bin/bash
# =============================================================================
# Remove Domain Configuration Script for Facturatie.sr
# =============================================================================
# Usage: sudo ./remove_domain.sh <domain>
# Example: sudo ./remove_domain.sh portal.example.com
# =============================================================================

set -e

NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "Dit script moet als root worden uitgevoerd (gebruik sudo)"
fi

# Check arguments
if [ $# -lt 1 ]; then
    echo "Gebruik: $0 <domain>"
    echo "Voorbeeld: $0 portal.example.com"
    exit 1
fi

DOMAIN="$1"

log "Removing domain configuration for: $DOMAIN"

# Remove symlink from sites-enabled
if [ -L "${NGINX_ENABLED}/${DOMAIN}" ]; then
    rm "${NGINX_ENABLED}/${DOMAIN}"
    log "Removed symlink from sites-enabled"
fi

# Remove config from sites-available
if [ -f "${NGINX_AVAILABLE}/${DOMAIN}" ]; then
    rm "${NGINX_AVAILABLE}/${DOMAIN}"
    log "Removed configuration from sites-available"
fi

# Test and reload nginx
log "Testing Nginx configuration..."
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    log "Nginx reloaded successfully"
else
    error "Nginx test failed after removal - please check manually"
fi

echo ""
echo "=========================================="
echo "Domain configuratie verwijderd!"
echo "=========================================="
echo "Domain: $DOMAIN"
echo ""
echo "Let op: SSL certificaten zijn NIET verwijderd."
echo "Om SSL certificaten te verwijderen:"
echo "  sudo certbot delete --cert-name $DOMAIN"
echo "=========================================="
