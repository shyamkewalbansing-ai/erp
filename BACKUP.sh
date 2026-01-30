#!/bin/bash
# ============================================================
# FACTURATIE ERP - BACKUP SCRIPT
# ============================================================
#
# Dit script maakt een volledige backup van:
# - MongoDB database
# - Upload bestanden
# - Configuratie bestanden
#
# Gebruik:
#   chmod +x backup.sh
#   sudo ./backup.sh
#
# Automatisch (cron):
#   0 2 * * * /var/www/facturatie/backup.sh >> /var/log/facturatie_backup.log 2>&1
#
# ============================================================

set -e

# ==================== CONFIGURATIE ====================
APP_DIR="/var/www/facturatie"
BACKUP_DIR="/var/backups/facturatie"
DB_NAME="facturatie_db"
RETENTION_DAYS=30

# Timestamp voor backup naam
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="facturatie_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# ==================== KLEUREN ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==================== START ====================
echo ""
echo "============================================================"
echo "   FACTURATIE ERP - BACKUP"
echo "============================================================"
echo ""
echo_info "Backup gestart: $TIMESTAMP"

# Maak backup directory
mkdir -p $BACKUP_PATH

# ==================== DATABASE BACKUP ====================
echo_info "Database backup maken..."

mongodump --db $DB_NAME --out "${BACKUP_PATH}/mongodb" --quiet

if [ -d "${BACKUP_PATH}/mongodb/${DB_NAME}" ]; then
    echo_success "Database backup voltooid!"
else
    echo_error "Database backup mislukt!"
    exit 1
fi

# ==================== UPLOADS BACKUP ====================
echo_info "Upload bestanden backuppen..."

if [ -d "${APP_DIR}/backend/uploads" ]; then
    cp -r "${APP_DIR}/backend/uploads" "${BACKUP_PATH}/uploads"
    echo_success "Uploads gekopieerd!"
else
    echo_warning "Geen uploads directory gevonden"
fi

# ==================== CONFIG BACKUP ====================
echo_info "Configuratie backuppen..."

mkdir -p "${BACKUP_PATH}/config"

# Backend .env
if [ -f "${APP_DIR}/backend/.env" ]; then
    cp "${APP_DIR}/backend/.env" "${BACKUP_PATH}/config/backend.env"
fi

# Frontend .env
if [ -f "${APP_DIR}/frontend/.env" ]; then
    cp "${APP_DIR}/frontend/.env" "${BACKUP_PATH}/config/frontend.env"
fi

# Nginx config
if [ -f "/etc/nginx/sites-available/facturatie" ]; then
    cp "/etc/nginx/sites-available/facturatie" "${BACKUP_PATH}/config/nginx.conf"
fi

# Supervisor config
if [ -f "/etc/supervisor/conf.d/facturatie.conf" ]; then
    cp "/etc/supervisor/conf.d/facturatie.conf" "${BACKUP_PATH}/config/supervisor.conf"
fi

echo_success "Configuratie gekopieerd!"

# ==================== COMPRIMEREN ====================
echo_info "Backup comprimeren..."

cd $BACKUP_DIR
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
echo_success "Backup gecomprimeerd: ${BACKUP_SIZE}"

# ==================== OUDE BACKUPS OPRUIMEN ====================
echo_info "Oude backups opruimen (ouder dan ${RETENTION_DAYS} dagen)..."

find $BACKUP_DIR -name "facturatie_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/facturatie_backup_*.tar.gz 2>/dev/null | wc -l)
echo_info "Aantal backups bewaard: ${BACKUP_COUNT}"

# ==================== DONE ====================
echo ""
echo "============================================================"
echo_success "BACKUP VOLTOOID!"
echo "============================================================"
echo ""
echo "Backup locatie: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Grootte: ${BACKUP_SIZE}"
echo ""
echo "Restore commando:"
echo "  tar -xzf ${BACKUP_NAME}.tar.gz"
echo "  mongorestore --db $DB_NAME ${BACKUP_NAME}/mongodb/${DB_NAME}"
echo ""

# ==================== OPTIONEEL: OFFSITE BACKUP ====================
# Uncomment en configureer voor externe backup

# AWS S3:
# aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://jouw-bucket/backups/"

# Google Cloud Storage:
# gsutil cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "gs://jouw-bucket/backups/"

# Rsync naar externe server:
# rsync -avz "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" user@backup-server:/backups/

# Dropbox (met Dropbox Uploader):
# ./dropbox_uploader.sh upload "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "/Backups/"
