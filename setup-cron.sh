#!/bin/bash

# ========================================
# Facturatie N.V. - Cron Setup Script
# ========================================

CRON_SECRET="facturatie-cron-secret-2026"

echo "Cron job instellen voor Facturatie N.V...."

# Maak cron job aan (elke minuut)
(crontab -l 2>/dev/null | grep -v "facturatie.*cron"; echo "* * * * * curl -s 'http://127.0.0.1:8001/api/cron/run?secret=$CRON_SECRET' > /dev/null 2>&1") | crontab -

echo "✅ Cron job geïnstalleerd!"
echo ""
echo "De volgende taken draaien nu automatisch:"
echo "  - Elke minuut: Abonnementen controleren"
echo "  - Elke minuut: Herinneringen versturen (3 dagen voor verlopen)"
echo "  - Elke dag om 00:00: Database opschonen (data ouder dan 30 dagen)"
echo ""
echo "Controleer met: crontab -l"
