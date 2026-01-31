# Nginx/SSL Automatisering Handleiding

## Overzicht

Dit document beschrijft hoe custom domeinen automatisch worden geconfigureerd met Nginx en SSL certificaten voor de Facturatie.sr multi-tenant ERP applicatie.

## Componenten

### 1. Backend API (`/api/domains/`)

De backend biedt de volgende endpoints voor domeinbeheer:

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/domains/status` | GET | Overzicht van alle custom domeinen |
| `/api/domains/status/{workspace_id}` | GET | Status van een specifiek domein |
| `/api/domains/verify-dns/{workspace_id}` | POST | DNS verificatie uitvoeren |
| `/api/domains/provision/nginx/{workspace_id}` | POST | Nginx configuratie installeren |
| `/api/domains/provision/ssl/{workspace_id}` | POST | SSL certificaat installeren |
| `/api/domains/provision/full/{workspace_id}` | POST | Volledige setup (DNS → Nginx → SSL) |
| `/api/domains/provision/{workspace_id}` | DELETE | Configuratie verwijderen |

### 2. Admin Dashboard

De Domain Management pagina is beschikbaar op `/app/admin/domeinen` (alleen voor superadmins).

**Features:**
- Overzicht van alle workspaces met custom domeinen
- Real-time DNS, Nginx en SSL status
- One-click provisioning
- Nginx config preview
- Verwijder functionaliteit

### 3. Shell Scripts

De volgende scripts zijn beschikbaar voor handmatige configuratie:

| Script | Beschrijving |
|--------|--------------|
| `configure_domain.sh` | Nginx configuratie aanmaken |
| `remove_domain.sh` | Domein configuratie verwijderen |
| `renew_ssl.sh` | SSL certificaten vernieuwen |

## Workflow: Custom Domain Toevoegen

### Stap 1: Workspace Configureren

1. Klant gaat naar **Workspace Instellingen** → **Domein**
2. Selecteert "Custom Domain"
3. Voert het gewenste domein in (bijv. `portal.bedrijf.nl`)
4. Krijgt DNS instructies te zien

### Stap 2: DNS Configureren (door klant)

De klant moet bij hun DNS provider:
1. Een **A-record** aanmaken voor het domein
2. Dit laten wijzen naar het server IP: `{SERVER_IP}`

Voorbeeld DNS record:
```
Type: A
Naam: portal
Waarde: 45.79.123.456
TTL: 3600
```

### Stap 3: DNS Verificatie

1. Superadmin gaat naar **Domain Management**
2. Klikt op "DNS Verificatie" voor het domein
3. Als DNS correct is → groene checkmark

### Stap 4: Nginx Configuratie

**Via Dashboard:**
1. Klik op "Preview Config" om de configuratie te bekijken
2. Klik op "Nginx Configureren" om te installeren

**Via Command Line:**
```bash
sudo ./configure_domain.sh portal.bedrijf.nl workspace-slug
```

### Stap 5: SSL Certificaat

**Via Dashboard:**
1. Na Nginx configuratie, klik op "SSL Installeren"
2. Wacht op Let's Encrypt verificatie (~30 seconden)

**Via Command Line:**
```bash
sudo ./configure_domain.sh portal.bedrijf.nl workspace-slug --ssl
```

### Stap 6: Volledig Automatisch

Voor één-klik setup na DNS verificatie:
1. Klik op "Volledige Setup"
2. Dit voert alle stappen uit: DNS check → Nginx → SSL

## Server Vereisten

### Minimale Vereisten
- Ubuntu 20.04+ of Debian 11+
- Nginx 1.18+
- Certbot (voor Let's Encrypt)
- Python 3.9+

### Installatie
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Create directories
sudo mkdir -p /var/www/certbot
sudo mkdir -p /var/log/facturatie
```

### Permissies

De backend moet de volgende permissies hebben:
```bash
# Nginx config schrijven (optie 1: sudoers)
echo "www-data ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx" | sudo tee /etc/sudoers.d/nginx-reload

# Of (optie 2: directory permissies)
sudo chown -R www-data:www-data /etc/nginx/sites-available /etc/nginx/sites-enabled
```

## SSL Certificaat Vernieuwing

### Automatisch (Cron)
```bash
# Crontab toevoegen
sudo crontab -e

# Voeg toe (elke dag om 3:00)
0 3 * * * /app/scripts/renew_ssl.sh >> /var/log/facturatie/ssl_renewal.log 2>&1
```

### Handmatig
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Troubleshooting

### DNS Verificatie Mislukt

**Probleem:** "DNS lookup mislukt"

**Oplossing:**
1. Controleer of het A-record correct is aangemaakt
2. Wacht 5-10 minuten voor DNS propagatie
3. Gebruik `dig` of `nslookup` om te testen:
```bash
dig portal.bedrijf.nl +short
# Moet het server IP tonen
```

### Nginx Config Fout

**Probleem:** "Nginx configuratie test mislukt"

**Oplossing:**
1. Bekijk de exacte foutmelding:
```bash
sudo nginx -t
```
2. Controleer het configuratiebestand:
```bash
sudo cat /etc/nginx/sites-available/portal.bedrijf.nl
```

### SSL Installatie Mislukt

**Probleem:** "Certbot fout"

**Mogelijke oorzaken:**
1. DNS wijst nog niet naar de server
2. Poort 80 is geblokkeerd door firewall
3. Rate limit bereikt bij Let's Encrypt

**Oplossing:**
1. Controleer DNS is correct
2. Open poort 80:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```
3. Wacht 1 uur bij rate limit

### Permissie Fout

**Probleem:** "Geen schrijfrechten"

**Oplossing:**
```bash
# Geef backend gebruiker rechten
sudo usermod -aG www-data $USER
sudo chown -R www-data:www-data /etc/nginx/sites-available
sudo chown -R www-data:www-data /etc/nginx/sites-enabled
```

## Nginx Configuratie Voorbeeld

```nginx
# HTTP redirect
server {
    listen 80;
    server_name portal.bedrijf.nl;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name portal.bedrijf.nl;
    
    ssl_certificate /etc/letsencrypt/live/portal.bedrijf.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.bedrijf.nl/privkey.pem;
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Frontend
    location / {
        root /var/www/workspace-slug/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

## Security Consideraties

1. **Rate Limiting:** Let's Encrypt heeft een limiet van 50 certificaten per domein per week
2. **Wildcard:** Overweeg wildcard certificaten voor subdomeinen (`*.facturatie.sr`)
3. **HSTS:** Wordt automatisch toegevoegd aan HTTPS configuraties
4. **SSL Protocols:** Alleen TLS 1.2 en 1.3 zijn ingeschakeld
5. **Security Headers:** X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

## Monitoring

### Log Bestanden
- `/var/log/facturatie/domain_config.log` - Domain configuratie logs
- `/var/log/facturatie/ssl_renewal.log` - SSL renewal logs
- `/var/log/nginx/access.log` - Nginx access logs
- `/var/log/nginx/error.log` - Nginx error logs

### Status Controleren
```bash
# Nginx status
sudo systemctl status nginx

# SSL certificaat status
sudo certbot certificates

# Domain configuratie bekijken
cat /etc/nginx/sites-enabled/portal.bedrijf.nl
```
