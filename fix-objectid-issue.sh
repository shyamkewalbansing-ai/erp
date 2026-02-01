#!/bin/bash
# Fix script voor ObjectId serialization error
# Dit script update de code op de productie server

echo "=== ObjectId Fix Script ==="
echo ""

# Ga naar de app directory
cd /home/clp/htdocs/facturatie.sr || exit 1

# Stop services
echo "1. Stoppen van services..."
sudo supervisorctl stop facturatie-backend facturatie-frontend 2>/dev/null || true

# Pull latest code from GitHub
echo "2. Laatste code ophalen van GitHub..."
git fetch origin
git reset --hard origin/main

# Restart services
echo "3. Services herstarten..."
sudo supervisorctl start facturatie-backend facturatie-frontend

# Wait for startup
sleep 5

# Check status
echo "4. Controleren van services..."
sudo supervisorctl status

echo ""
echo "=== Fix voltooid! ==="
echo ""
echo "Test login met:"
echo "  Email: demo@facturatie.sr"
echo "  Wachtwoord: demo2024"
echo ""
echo "Of admin:"
echo "  Email: admin@facturatie.sr" 
echo "  Wachtwoord: Bharat7755!!"
