# 🚀 Facturatie ERP - CloudPanel Installatie Handleiding

## 📋 Overzicht

Deze handleiding beschrijft hoe je de Facturatie ERP applicatie installeert op een CloudPanel server.

---

## 🖥️ Server Vereisten

| Vereiste | Minimum | Aanbevolen |
|----------|---------|------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 vCPU | 2 vCPU |
| Opslag | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 / Debian 11 | Ubuntu 22.04 LTS |
| Bandbreedte | 1 TB | Unlimited |

### Aanbevolen VPS Providers:
- **Vultr** (vanaf $12/maand)
- **DigitalOcean** (vanaf $12/maand)
- **Hetzner** (vanaf €4/maand)
- **Linode** (vanaf $12/maand)

---

## 📝 Stap-voor-Stap Installatie

### Stap 1: Server Aanmaken

1. Maak een nieuwe VPS aan bij je provider
2. Kies **Ubuntu 22.04 LTS**
3. Noteer het **IP-adres** en **root wachtwoord**

### Stap 2: DNS Configureren

Ga naar je domein registrar en maak deze DNS records aan:

```
Type    Naam                Waarde              TTL
A       @                   [SERVER_IP]         300
A       www                 [SERVER_IP]         300
A       *.facturatie        [SERVER_IP]         300  (voor subdomains)
```

### Stap 3: CloudPanel Installeren

SSH naar je server:
```bash
ssh root@[SERVER_IP]
```

Installeer CloudPanel:
```bash
curl -sSL https://installer.cloudpanel.io/ce/v2/install.sh -o install.sh
sudo bash install.sh
```

Wacht 5-10 minuten. Na installatie krijg je:
- CloudPanel URL: `https://[SERVER_IP]:8443`
- Maak een admin account aan

### Stap 4: Applicatie Bestanden Uploaden

**Optie A: Via Git (aanbevolen)**
```bash
cd /var/www
git clone https://github.com/jouw-repo/facturatie-erp.git facturatie
```

**Optie B: Via SFTP/SCP**
```bash
# Vanaf je lokale machine:
scp -r /pad/naar/app/* root@[SERVER_IP]:/var/www/facturatie/
```

**Optie C: Via FileZilla**
1. Verbind met SFTP naar `[SERVER_IP]` poort 22
2. Upload naar `/var/www/facturatie/`

### Stap 5: Installatie Script Uitvoeren

```bash
# Maak script uitvoerbaar
chmod +x /var/www/facturatie/CLOUDPANEL_INSTALL.sh

# Pas configuratie aan (optioneel)
nano /var/www/facturatie/CLOUDPANEL_INSTALL.sh

# Voer installatie uit
sudo /var/www/facturatie/CLOUDPANEL_INSTALL.sh
```

### Stap 6: Database Seed (Eerste Keer)

```bash
cd /var/www/facturatie/backend
source venv/bin/activate
python3 -c "
import asyncio
from server import seed_default_data
asyncio.run(seed_default_data())
"
```

---

## 🔧 Handmatige Configuratie

Als je het script niet wilt gebruiken, hier de handmatige stappen:

### MongoDB Installeren

```bash
# MongoDB 6.0 repository
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl start mongod
sudo systemctl enable mongod
```

### Node.js Installeren

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn serve
```

### Backend Configureren

```bash
cd /var/www/facturatie/backend

# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Dependencies
pip install -r requirements.txt

# Environment file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie_db
SECRET_KEY=jouw-geheime-sleutel-hier-minimaal-32-karakters
CORS_ORIGINS=https://jouwdomein.nl
EOF
```

### Frontend Configureren

```bash
cd /var/www/facturatie/frontend

# Environment file
echo "REACT_APP_BACKEND_URL=https://jouwdomein.nl" > .env

# Build
yarn install
yarn build
```

### Supervisor Configuratie

```bash
sudo nano /etc/supervisor/conf.d/facturatie.conf
```

```ini
[program:facturatie_backend]
directory=/var/www/facturatie/backend
command=/var/www/facturatie/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/facturatie_backend.err.log
stdout_logfile=/var/log/supervisor/facturatie_backend.out.log

[program:facturatie_frontend]
directory=/var/www/facturatie/frontend
command=/usr/bin/npx serve -s build -l 3000
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/facturatie_frontend.err.log
stdout_logfile=/var/log/supervisor/facturatie_frontend.out.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

### Nginx Configuratie

Via CloudPanel:
1. Ga naar **Sites** → **Add Site**
2. Kies **Reverse Proxy**
3. Vul je domein in
4. Stel proxy in naar `http://127.0.0.1:3000`

Of handmatig - zie `/etc/nginx/sites-available/facturatie` in het installatie script.

### SSL Certificaat

```bash
sudo certbot --nginx -d jouwdomein.nl -d www.jouwdomein.nl
```

---

## 🔄 Updates Deployen

### Automatisch (met Git)

```bash
cd /var/www/facturatie
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
yarn build

# Herstart services
sudo supervisorctl restart all
```

### Update Script

Maak een update script:

```bash
#!/bin/bash
# /var/www/facturatie/update.sh

cd /var/www/facturatie

echo "Pulling latest changes..."
git pull origin main

echo "Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt

echo "Building frontend..."
cd ../frontend
yarn install
yarn build

echo "Restarting services..."
sudo supervisorctl restart all

echo "Done!"
```

---

## 📊 Monitoring & Logs

### Logs Bekijken

```bash
# Backend errors
tail -f /var/log/supervisor/facturatie_backend.err.log

# Frontend errors
tail -f /var/log/supervisor/facturatie_frontend.err.log

# Nginx access
tail -f /var/log/nginx/facturatie_access.log

# Nginx errors
tail -f /var/log/nginx/facturatie_error.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Service Status

```bash
# Supervisor status
sudo supervisorctl status

# Nginx status
sudo systemctl status nginx

# MongoDB status
sudo systemctl status mongod
```

### Server Resources

```bash
# CPU & Memory
htop

# Disk usage
df -h

# MongoDB stats
mongosh --eval "db.stats()"
```

---

## 🔒 Beveiliging

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8443/tcp    # CloudPanel
sudo ufw enable
```

### SSH Beveiliging

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Zet: PermitRootLogin no
# Zet: PasswordAuthentication no (na SSH key setup)

sudo systemctl restart sshd
```

### Automatische Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🆘 Troubleshooting

### Backend Start Niet

```bash
# Check logs
tail -n 50 /var/log/supervisor/facturatie_backend.err.log

# Test handmatig
cd /var/www/facturatie/backend
source venv/bin/activate
python3 -c "from server import app; print('OK')"
```

### Database Connectie Fout

```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connectie
mongosh --eval "db.adminCommand('ping')"
```

### Frontend Laadt Niet

```bash
# Check build
ls -la /var/www/facturatie/frontend/build

# Rebuild
cd /var/www/facturatie/frontend
yarn build
```

### SSL Problemen

```bash
# Test certificaat
sudo certbot certificates

# Vernieuw certificaat
sudo certbot renew --dry-run
```

### 502 Bad Gateway

1. Check of backend draait: `supervisorctl status`
2. Check poorten: `netstat -tlnp | grep 8001`
3. Check Nginx config: `nginx -t`

---

## 📞 Support

Bij problemen:
1. Check de logs (zie boven)
2. Raadpleeg de CloudPanel documentatie
3. Maak een issue aan op GitHub

---

## 🗂️ Beschikbare Scripts

Na installatie heb je de volgende scripts beschikbaar:

| Script | Functie |
|--------|---------|
| `CLOUDPANEL_INSTALL.sh` | Volledige eerste installatie |
| `UPDATE.sh` | Update na git pull of code wijzigingen |
| `BACKUP.sh` | Maak een complete backup |
| `RESTORE.sh` | Herstel een backup |
| `WEBHOOK_DEPLOY.sh` | Automatisch deployen via webhook |

### Update Script Gebruiken

```bash
# Volledige update
sudo ./UPDATE.sh

# Alleen backend updaten
sudo ./UPDATE.sh --backend-only

# Alleen frontend updaten  
sudo ./UPDATE.sh --frontend-only

# Update zonder services te herstarten
sudo ./UPDATE.sh --no-restart
```

### Backup & Restore

```bash
# Backup maken
sudo ./BACKUP.sh

# Backups worden opgeslagen in: /var/backups/facturatie/
ls -la /var/backups/facturatie/

# Restore uitvoeren
sudo ./RESTORE.sh /var/backups/facturatie/facturatie_backup_20240101_120000.tar.gz
```

### Automatische Backups (Cron)

```bash
# Backup elke nacht om 2:00
sudo crontab -e

# Voeg toe:
0 2 * * * /var/www/facturatie/BACKUP.sh >> /var/log/facturatie_backup.log 2>&1
```

---

## 🔄 Automatische Deployment (CI/CD)

### GitHub Actions Voorbeeld

Maak `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.SERVER_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/facturatie
            ./UPDATE.sh
```

### Webhook Configuratie

1. Genereer een webhook secret:
```bash
openssl rand -hex 32
```

2. Pas `WEBHOOK_DEPLOY.sh` aan met je secret

3. Configureer webhook in GitHub/GitLab:
   - URL: `https://jouwdomein.nl/api/webhook/deploy`
   - Secret: Je gegenereerde secret
   - Events: Push events

---

## 📊 Performance Optimalisatie

### Nginx Caching

Voeg toe aan je Nginx config voor betere performance:

```nginx
# Proxy caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=facturatie_cache:10m inactive=60m;

# In location /api/
proxy_cache facturatie_cache;
proxy_cache_valid 200 5m;
proxy_cache_bypass $http_cache_control;
```

### MongoDB Index Optimalisatie

```bash
mongosh facturatie_db --eval "
    // Workspace indexes
    db.workspaces.createIndex({ 'subdomain': 1 }, { unique: true });
    db.workspaces.createIndex({ 'custom_domain': 1 });
    
    // User indexes
    db.users.createIndex({ 'email': 1, 'workspace_id': 1 });
    db.users.createIndex({ 'workspace_id': 1 });
    
    // Auto Dealer indexes
    db.autodealer_vehicles.createIndex({ 'workspace_id': 1 });
    db.autodealer_sales.createIndex({ 'workspace_id': 1, 'sale_date': -1 });
"
```

### Process Manager (PM2 alternatief)

Als je PM2 prefereert boven Supervisor:

```bash
npm install -g pm2

# Backend
cd /var/www/facturatie/backend
pm2 start "source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8001" --name facturatie-backend

# Frontend
cd /var/www/facturatie/frontend
pm2 start "npx serve -s build -l 3000" --name facturatie-frontend

# Save configuration
pm2 save
pm2 startup
```

---

## 🌐 Multi-Tenant Subdomain Setup

Voor workspace subdomains (bijv. `klant1.facturatie.nl`):

### Wildcard DNS

Voeg een wildcard A-record toe:
```
*.facturatie.nl    A    [SERVER_IP]
```

### Wildcard SSL

```bash
# Installeer certbot plugin voor Cloudflare/DNS
sudo apt install python3-certbot-dns-cloudflare

# Vraag wildcard certificaat aan
sudo certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials /root/.cloudflare.ini \
    -d facturatie.nl \
    -d *.facturatie.nl
```

### Nginx voor Subdomains

```nginx
server {
    listen 443 ssl http2;
    server_name ~^(?<subdomain>.+)\.facturatie\.nl$;
    
    # SSL config...
    
    # Pass subdomain to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header X-Workspace-Subdomain $subdomain;
        # ... other headers
    }
}
```

---

---

## 📋 Quick Reference Card

### Belangrijke Paden

```
/var/www/facturatie/          # Applicatie root
├── backend/
│   ├── .env                  # Backend configuratie
│   ├── venv/                 # Python virtual environment
│   └── server.py             # Main FastAPI app
├── frontend/
│   ├── .env                  # Frontend configuratie
│   ├── build/                # Production build
│   └── src/                  # Source code
├── UPDATE.sh                 # Update script
├── BACKUP.sh                 # Backup script
└── RESTORE.sh                # Restore script

/etc/nginx/sites-available/   # Nginx configs
/etc/supervisor/conf.d/       # Supervisor configs
/var/log/supervisor/          # Service logs
/var/backups/facturatie/      # Backups
```

### Veelgebruikte Commando's

```bash
# Service beheer
sudo supervisorctl status                    # Status bekijken
sudo supervisorctl restart all               # Alles herstarten
sudo supervisorctl restart facturatie_backend  # Alleen backend

# Logs
tail -f /var/log/supervisor/facturatie_backend.err.log
tail -f /var/log/supervisor/facturatie_frontend.err.log

# Database
mongosh facturatie_db                        # Database shell
mongodump --db facturatie_db --out ./backup  # Manual backup

# SSL
sudo certbot renew --dry-run                 # Test vernieuwing
sudo certbot certificates                    # Bekijk certificaten

# Updates
cd /var/www/facturatie && sudo ./UPDATE.sh   # Update uitvoeren
```

### Environment Variables

**Backend (.env):**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie_db
SECRET_KEY=je-secret-key
CORS_ORIGINS=https://jouwdomein.nl
EMERGENT_LLM_KEY=sk-emergent-xxx    # Voor AI features
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=https://jouwdomein.nl
```

### Ports

| Service | Intern | Extern |
|---------|--------|--------|
| Frontend | 3000 | 80/443 |
| Backend API | 8001 | /api/* |
| MongoDB | 27017 | - |
| CloudPanel | 8443 | 8443 |

---

## 📄 Licentie

© 2024-2026 Facturatie N.V. Suriname
Alle rechten voorbehouden.
