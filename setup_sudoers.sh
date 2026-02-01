#!/bin/bash
# ================================================================
# Sudoers configuratie voor automatische domain provisioning
# Dit script voegt de nodige sudo rechten toe voor de backend
# ================================================================

echo "=== Facturatie Domain Provisioning Sudoers Setup ==="

# Bepaal de gebruiker die de backend draait
BACKEND_USER="root"

# Maak sudoers config voor domain management
cat > /etc/sudoers.d/facturatie-domains << 'EOF'
# Facturatie Domain Management - Automatische Nginx/SSL provisioning
# Toegestaan voor root (of de backend user)

# Nginx commands
root ALL=(ALL) NOPASSWD: /usr/bin/nginx -t
root ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
root ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
root ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx

# Certbot commands
root ALL=(ALL) NOPASSWD: /usr/bin/certbot *
root ALL=(ALL) NOPASSWD: /snap/bin/certbot *

# Auto domain setup script
root ALL=(ALL) NOPASSWD: /home/clp/htdocs/facturatie.sr/auto_domain_setup.sh *

# File operations for Nginx sites
root ALL=(ALL) NOPASSWD: /bin/ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*
root ALL=(ALL) NOPASSWD: /bin/rm /etc/nginx/sites-enabled/*
EOF

# Zet juiste permissions
chmod 440 /etc/sudoers.d/facturatie-domains

# Valideer sudoers
visudo -c -f /etc/sudoers.d/facturatie-domains

if [ $? -eq 0 ]; then
    echo "✓ Sudoers configuratie succesvol geïnstalleerd"
else
    echo "✗ Fout in sudoers configuratie"
    rm /etc/sudoers.d/facturatie-domains
    exit 1
fi

echo ""
echo "=== Setup Compleet ==="
echo "De backend kan nu automatisch:"
echo "  - Nginx configuraties aanmaken"
echo "  - SSL certificaten installeren"
echo "  - Nginx herladen"
