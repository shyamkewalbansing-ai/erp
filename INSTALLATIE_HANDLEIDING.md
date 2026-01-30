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

## 📄 Licentie

© 2024-2026 Facturatie N.V. Suriname
Alle rechten voorbehouden.
