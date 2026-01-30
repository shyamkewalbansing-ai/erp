# Facturatie.sr - VPS Multi-Tenant Setup Guide

## Overzicht

Deze guide helpt u bij het opzetten van de multi-tenant infrastructuur voor Facturatie.sr op uw VPS server.

**Architectuur:**
```
                    ┌─────────────────────────────────────┐
                    │           INTERNET                  │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         DNS (Cloudflare/andere)     │
                    │  *.facturatie.sr → VPS_IP           │
                    │  facturatie.sr → VPS_IP             │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │           NGINX                     │
                    │  - SSL termination (Let's Encrypt)  │
                    │  - Reverse proxy                    │
                    │  - Workspace routing                │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐ ┌───────▼────────┐ ┌────────▼────────┐
    │   Frontend:3000   │ │  Backend:8001  │ │   MongoDB:27017 │
    │   (React App)     │ │  (FastAPI)     │ │   (Database)    │
    └───────────────────┘ └────────────────┘ └─────────────────┘
```

---

## Stap 1: Server Voorbereiding

### 1.1 SSH naar uw VPS
```bash
ssh root@UW_SERVER_IP
```

### 1.2 Systeem updaten
```bash
apt update && apt upgrade -y
```

### 1.3 Benodigde pakketten installeren
```bash
apt install -y nginx certbot python3-certbot-nginx git nodejs npm python3 python3-pip mongodb supervisor ufw
```

### 1.4 Firewall configureren
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## Stap 2: DNS Configuratie

### 2.1 Bij uw DNS provider (Cloudflare/andere)

Maak de volgende DNS records aan:

| Type | Naam | Waarde | TTL |
|------|------|--------|-----|
| A | @ | UW_SERVER_IP | Auto |
| A | * | UW_SERVER_IP | Auto |
| A | www | UW_SERVER_IP | Auto |

**Belangrijk:** De `*` (wildcard) record zorgt ervoor dat alle subdomeinen naar uw server wijzen.

### 2.2 Verificatie
```bash
# Test of DNS werkt
dig +short facturatie.sr
dig +short testbedrijf.facturatie.sr
# Beide moeten uw server IP tonen
```

---

## Stap 3: Applicatie Installatie

### 3.1 Project clonen
```bash
cd /var/www
git clone https://github.com/UW_GEBRUIKER/facturatie.git
cd facturatie
```

### 3.2 Backend setup
```bash
cd backend
pip3 install -r requirements.txt

# Environment variabelen
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie
JWT_SECRET=GENEREER_EEN_VEILIGE_RANDOM_STRING
EOF
```

### 3.3 Frontend setup
```bash
cd ../frontend
npm install

# Environment variabelen
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://facturatie.sr
EOF

# Build frontend
npm run build
```

---

## Stap 4: Nginx Configuratie

### 4.1 Hoofddomein configuratie
```bash
cat > /etc/nginx/sites-available/facturatie << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name facturatie.sr www.facturatie.sr;
    return 301 https://$server_name$request_uri;
}

# Main domain - HTTPS
server {
    listen 443 ssl http2;
    server_name facturatie.sr www.facturatie.sr;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/facturatie.sr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/facturatie.sr/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (static files)
    root /var/www/facturatie/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # File uploads
    client_max_body_size 50M;
}
EOF
```

### 4.2 Wildcard subdomeinen configuratie
```bash
cat > /etc/nginx/sites-available/facturatie-wildcard << 'EOF'
# Wildcard subdomains - redirect HTTP to HTTPS
server {
    listen 80;
    server_name *.facturatie.sr;
    return 301 https://$host$request_uri;
}

# Wildcard subdomains - HTTPS
server {
    listen 443 ssl http2;
    server_name *.facturatie.sr;

    # Wildcard SSL certificate
    ssl_certificate /etc/letsencrypt/live/facturatie.sr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/facturatie.sr/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    root /var/www/facturatie/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API - include workspace header
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extract subdomain and pass as header
        set $subdomain "";
        if ($host ~* ^([^.]+)\.facturatie\.sr$) {
            set $subdomain $1;
        }
        proxy_set_header X-Subdomain $subdomain;
        
        proxy_read_timeout 300s;
    }

    client_max_body_size 50M;
}
EOF
```

### 4.3 Sites activeren
```bash
ln -s /etc/nginx/sites-available/facturatie /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/facturatie-wildcard /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Verwijder default site

# Test configuratie
nginx -t
```

---

## Stap 5: SSL Certificaten (Let's Encrypt)

### 5.1 Hoofddomein certificaat
```bash
# Eerst zonder SSL om certbot te laten werken
# Pas nginx config tijdelijk aan om alleen HTTP te accepteren

certbot --nginx -d facturatie.sr -d www.facturatie.sr
```

### 5.2 Wildcard certificaat (vereist DNS challenge)
```bash
# Wildcard certificaat vereist DNS-01 challenge
certbot certonly --manual --preferred-challenges dns \
    -d "*.facturatie.sr" -d "facturatie.sr"
```

**Let op:** Certbot zal vragen om een TXT record toe te voegen:
```
_acme-challenge.facturatie.sr TXT "gegenereerde_waarde"
```

Voeg dit toe bij uw DNS provider en wacht 1-2 minuten voordat u bevestigt.

### 5.3 Auto-renewal instellen
```bash
# Test renewal
certbot renew --dry-run

# Cron job voor automatische renewal
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
```

---

## Stap 6: Supervisor Configuratie

### 6.1 Backend service
```bash
cat > /etc/supervisor/conf.d/facturatie-backend.conf << 'EOF'
[program:facturatie-backend]
directory=/var/www/facturatie/backend
command=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/facturatie/backend.err.log
stdout_logfile=/var/log/facturatie/backend.out.log
environment=PATH="/usr/local/bin:/usr/bin:/bin"
EOF
```

### 6.2 Log directory aanmaken
```bash
mkdir -p /var/log/facturatie
chown www-data:www-data /var/log/facturatie
```

### 6.3 Supervisor herstarten
```bash
supervisorctl reread
supervisorctl update
supervisorctl status
```

---

## Stap 7: Deploy Script

### 7.1 Deploy script aanmaken
```bash
cat > /var/www/facturatie/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "$(date): Starting deployment..."

cd /var/www/facturatie

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Backend updates
echo "Updating backend dependencies..."
cd backend
pip3 install -r requirements.txt

# Frontend updates
echo "Building frontend..."
cd ../frontend
npm install
npm run build

# Restart services
echo "Restarting services..."
supervisorctl restart facturatie-backend

echo "$(date): Deployment completed successfully!"
EOF

chmod +x /var/www/facturatie/deploy.sh
```

### 7.2 Webhook endpoint voor automatische updates

Maak een simpel webhook script:
```bash
cat > /var/www/facturatie/webhook.py << 'EOF'
from flask import Flask, request, jsonify
import subprocess
import hmac
import hashlib
import os

app = Flask(__name__)
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', 'your-secret-here')

@app.route('/api/deploy', methods=['POST'])
def deploy():
    # Verify signature
    signature = request.headers.get('X-Webhook-Signature', '')
    payload = request.get_data()
    
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected):
        return jsonify({'error': 'Invalid signature'}), 403
    
    # Run deploy script
    try:
        result = subprocess.run(
            ['/var/www/facturatie/deploy.sh'],
            capture_output=True,
            text=True,
            timeout=300
        )
        return jsonify({
            'success': True,
            'output': result.stdout[-1000:] if result.stdout else None,
            'error': result.stderr[-500:] if result.stderr else None
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8002)
EOF
```

---

## Stap 8: Custom Domein Setup (Per Klant)

Wanneer een klant een custom domein wil gebruiken (bijv. `portal.klantdomein.nl`):

### 8.1 Klant instructies (stuur naar klant)
```
Om uw custom domein te koppelen:

1. Log in bij uw DNS provider (bijv. TransIP, Cloudflare)
2. Maak een A-record aan:
   - Naam: portal (of uw gewenste subdomein)
   - Type: A
   - Waarde: UW_SERVER_IP
   - TTL: 3600 of Auto

3. Wacht 5-30 minuten tot DNS is gepropageerd
4. Klik op "DNS Verifiëren" in uw dashboard
```

### 8.2 Nginx config voor custom domein (automatisch via admin panel)
```bash
# Dit wordt gegenereerd via het admin panel
# Voorbeeld voor portal.klantdomein.nl:

cat > /etc/nginx/sites-available/klantdomein << 'EOF'
server {
    listen 80;
    server_name portal.klantdomein.nl;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portal.klantdomein.nl;

    ssl_certificate /etc/letsencrypt/live/portal.klantdomein.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.klantdomein.nl/privkey.pem;

    root /var/www/facturatie/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Workspace-ID WORKSPACE_ID_HIER;
    }
}
EOF

# SSL certificaat aanvragen
certbot --nginx -d portal.klantdomein.nl

# Activeren
ln -s /etc/nginx/sites-available/klantdomein /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Stap 9: Server IP Configureren in Applicatie

### 9.1 Update server.py
```bash
# Open het bestand
nano /var/www/facturatie/backend/server.py

# Zoek naar SERVER_IP (rond regel 180)
# Wijzig:
SERVER_IP = "45.79.123.456"
# Naar:
SERVER_IP = "UW_WERKELIJKE_SERVER_IP"
```

### 9.2 Herstart backend
```bash
supervisorctl restart facturatie-backend
```

---

## Stap 10: Verificatie & Testen

### 10.1 Services controleren
```bash
# Nginx
systemctl status nginx

# Backend
supervisorctl status facturatie-backend

# MongoDB
systemctl status mongodb
```

### 10.2 Logs bekijken
```bash
# Nginx errors
tail -f /var/log/nginx/error.log

# Backend logs
tail -f /var/log/facturatie/backend.err.log
tail -f /var/log/facturatie/backend.out.log
```

### 10.3 Test endpoints
```bash
# Test hoofddomein
curl -I https://facturatie.sr

# Test API
curl https://facturatie.sr/api/health

# Test subdomein
curl -I https://testbedrijf.facturatie.sr
```

---

## Troubleshooting

### SSL problemen
```bash
# Forceer certificate renewal
certbot renew --force-renewal

# Check certificate
openssl s_client -connect facturatie.sr:443 -servername facturatie.sr
```

### Nginx problemen
```bash
# Test configuratie
nginx -t

# Herstart
systemctl restart nginx
```

### Backend problemen
```bash
# Check logs
tail -100 /var/log/facturatie/backend.err.log

# Handmatig starten voor debugging
cd /var/www/facturatie/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### DNS problemen
```bash
# Check DNS propagatie
dig +short klantnaam.facturatie.sr

# Check van verschillende DNS servers
dig @8.8.8.8 +short klantnaam.facturatie.sr
dig @1.1.1.1 +short klantnaam.facturatie.sr
```

---

## Samenvatting Checklist

- [ ] VPS server geïnstalleerd en geconfigureerd
- [ ] DNS records aangemaakt (A + wildcard)
- [ ] Applicatie gecloned en geïnstalleerd
- [ ] Nginx geconfigureerd voor hoofd- en subdomeinen
- [ ] SSL certificaten aangevraagd (inclusief wildcard)
- [ ] Supervisor geconfigureerd voor backend
- [ ] Deploy script aangemaakt
- [ ] SERVER_IP aangepast in server.py
- [ ] Alle services getest

---

## Contact & Support

Bij problemen:
- Check de logs
- Controleer DNS propagatie
- Verifieer SSL certificaten
- Test met curl vanaf de server zelf

**Webhook URL voor admin panel:**
```
https://facturatie.sr/api/deploy
```

**Webhook Secret:** (configureer in admin panel)
Genereer met: `openssl rand -hex 32`
