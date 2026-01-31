#!/bin/bash
# =============================================================================
# SSL Certificate Renewal Script for Facturatie.sr
# =============================================================================
# This script can be run as a cron job to renew SSL certificates
# Usage: sudo ./renew_ssl.sh
# Cron example: 0 3 * * * /path/to/renew_ssl.sh >> /var/log/facturatie/ssl_renewal.log 2>&1
# =============================================================================

set -e

LOG_FILE="/var/log/facturatie/ssl_renewal.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "Dit script moet als root worden uitgevoerd (gebruik sudo)" >&2
   exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"

log "Starting SSL certificate renewal check..."

# Renew certificates
certbot renew --quiet --no-self-upgrade

# Reload nginx if any certificates were renewed
if [ $? -eq 0 ]; then
    log "Reloading Nginx after renewal..."
    systemctl reload nginx
    log "SSL renewal completed successfully"
else
    log "No certificates needed renewal"
fi
