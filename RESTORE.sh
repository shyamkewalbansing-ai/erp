#!/bin/bash
# ============================================================
# FACTURATIE ERP - RESTORE SCRIPT
# ============================================================
#
# Dit script herstelt een backup van de Facturatie ERP applicatie.
#
# Gebruik:
#   chmod +x restore.sh
#   sudo ./restore.sh /var/backups/facturatie/facturatie_backup_20240101_120000.tar.gz
#
# ============================================================

set -e

# ==================== CONFIGURATIE ====================
APP_DIR="/var/www/facturatie"
DB_NAME="facturatie_db"

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

# ==================== CHECK ARGUMENTS ====================
if [ -z "$1" ]; then
    echo_error "Gebruik: $0 <backup-bestand.tar.gz>"
    echo ""
    echo "Beschikbare backups:"
    ls -la /var/backups/facturatie/*.tar.gz 2>/dev/null || echo "  Geen backups gevonden"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo_error "Backup bestand niet gevonden: $BACKUP_FILE"
    exit 1
fi

# ==================== CONFIRMATIE ====================
echo ""
echo "============================================================"
echo "   FACTURATIE ERP - RESTORE"
echo "============================================================"
echo ""
echo_warning "WAARSCHUWING: Dit zal de huidige database en bestanden overschrijven!"
echo ""
echo "Backup bestand: $BACKUP_FILE"
echo ""
read -p "Weet je zeker dat je wilt doorgaan? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo_warning "Restore geannuleerd."
    exit 1
fi

# ==================== STOP SERVICES ====================
echo ""
echo_info "Services stoppen..."
supervisorctl stop all

# ==================== EXTRACT BACKUP ====================
echo_info "Backup uitpakken..."

TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Vind de backup directory
BACKUP_DIR=$(ls -d ${TEMP_DIR}/facturatie_backup_* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo_error "Ongeldige backup structuur!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo_success "Backup uitgepakt naar: $BACKUP_DIR"

# ==================== RESTORE DATABASE ====================
echo_info "Database herstellen..."

if [ -d "${BACKUP_DIR}/mongodb/${DB_NAME}" ]; then
    # Drop bestaande database
    mongosh --eval "db.getSiblingDB('${DB_NAME}').dropDatabase()" --quiet
    
    # Restore
    mongorestore --db $DB_NAME "${BACKUP_DIR}/mongodb/${DB_NAME}" --quiet
    
    echo_success "Database hersteld!"
else
    echo_warning "Geen database backup gevonden in archief"
fi

# ==================== RESTORE UPLOADS ====================
echo_info "Upload bestanden herstellen..."

if [ -d "${BACKUP_DIR}/uploads" ]; then
    # Backup huidige uploads
    if [ -d "${APP_DIR}/backend/uploads" ]; then
        mv "${APP_DIR}/backend/uploads" "${APP_DIR}/backend/uploads_old_$(date +%Y%m%d%H%M%S)"
    fi
    
    cp -r "${BACKUP_DIR}/uploads" "${APP_DIR}/backend/uploads"
    chown -R www-data:www-data "${APP_DIR}/backend/uploads"
    
    echo_success "Uploads hersteld!"
else
    echo_warning "Geen uploads in backup gevonden"
fi

# ==================== RESTORE CONFIG (optioneel) ====================
echo ""
read -p "Wil je ook de configuratie herstellen? (j/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Jj]$ ]]; then
    echo_info "Configuratie herstellen..."
    
    if [ -f "${BACKUP_DIR}/config/backend.env" ]; then
        cp "${BACKUP_DIR}/config/backend.env" "${APP_DIR}/backend/.env"
        echo_success "Backend .env hersteld"
    fi
    
    if [ -f "${BACKUP_DIR}/config/frontend.env" ]; then
        cp "${BACKUP_DIR}/config/frontend.env" "${APP_DIR}/frontend/.env"
        echo_success "Frontend .env hersteld"
    fi
fi

# ==================== CLEANUP ====================
echo_info "Tijdelijke bestanden opruimen..."
rm -rf "$TEMP_DIR"

# ==================== START SERVICES ====================
echo_info "Services herstarten..."
supervisorctl start all

sleep 5

# ==================== HEALTH CHECK ====================
echo ""
echo_info "Health check uitvoeren..."

BACKEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health 2>/dev/null || echo "000")
FRONTEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")

echo "Backend status: HTTP $BACKEND_OK"
echo "Frontend status: HTTP $FRONTEND_OK"

# ==================== DONE ====================
echo ""
echo "============================================================"
echo_success "RESTORE VOLTOOID!"
echo "============================================================"
echo ""
echo "Volgende stappen:"
echo "  1. Test de applicatie"
echo "  2. Controleer de data"
echo "  3. Verwijder oude backups indien gewenst"
echo ""
