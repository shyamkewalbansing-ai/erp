# CloudPanel Installatie Handleiding - Facturatie.sr

## Snelle Start (5 stappen)

### Stap 1: Server Voorbereiden

SSH naar uw CloudPanel server:
```bash
ssh root@uw-server-ip
```

### Stap 2: Installatiescript Downloaden

```bash
# Download het installatiescript
wget -O install-facturatie.sh https://raw.githubusercontent.com/uw-repo/facturatie/main/install-cloudpanel.sh

# Of kopieer het script handmatig naar de server
```

### Stap 3: Script Uitvoeren

```bash
chmod +x install-facturatie.sh
./install-facturatie.sh
```

Het script vraagt om:
- **Domein**: bijv. `facturatie.sr`
- **E-mail**: voor SSL certificaten
- **Database wachtwoord**: kies een sterk wachtwoord
- **Admin wachtwoord**: voor het admin account

### Stap 4: Applicatie Bestanden Uploaden

**Optie A: Via SFTP (FileZilla, WinSCP)**
1. Verbind met uw server via SFTP
2. Ga naar `/home/clp/htdocs/uw-domein.sr/`
3. Upload de `backend/` en `frontend/` mappen

**Optie B: Via SCP vanaf uw computer**
```bash
# Backend
scp -r /pad/naar/backend/* root@uw-server:/home/clp/htdocs/uw-domein.sr/backend/

# Frontend
scp -r /pad/naar/frontend/* root@uw-server:/home/clp/htdocs/uw-domein.sr/frontend/
```

**Optie C: Via Git**
```bash
cd /home/clp/htdocs/uw-domein.sr
git clone https://github.com/uw-repo/facturatie.git .
```

### Stap 5: Dependencies Installeren en Starten

```bash
# Backend dependencies
cd /home/clp/htdocs/uw-domein.sr/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend dependencies en build
cd /home/clp/htdocs/uw-domein.sr/frontend
yarn install
yarn build

# Services herstarten
supervisorctl restart all
```

---

## DNS Configuratie

Voeg deze DNS records toe bij uw domein registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | UW_SERVER_IP | 300 |
| A | www | UW_SERVER_IP | 300 |
| A | app | UW_SERVER_IP | 300 |

Wacht 5-10 minuten tot DNS propagatie voltooid is.

---

## Na Installatie

### URLs

- **Landing Page**: https://uw-domein.sr
- **Applicatie**: https://app.uw-domein.sr
- **Login**: https://app.uw-domein.sr/login

### Admin Login

- **Email**: admin@uw-domein.sr
- **Wachtwoord**: (wat u heeft opgegeven tijdens installatie)

### Beheer Commando's

```bash
# Service status bekijken
supervisorctl status

# Backend herstarten
supervisorctl restart facturatie-backend

# Frontend herstarten
supervisorctl restart facturatie-frontend

# Logs bekijken
tail -f /var/log/supervisor/facturatie-backend.out.log
tail -f /var/log/supervisor/facturatie-backend.err.log

# Nginx herstarten
systemctl restart nginx

# MongoDB status
systemctl status mongod
```

---

## Troubleshooting

### Website laadt niet

1. Controleer DNS:
```bash
nslookup uw-domein.sr
```

2. Controleer Nginx:
```bash
nginx -t
systemctl status nginx
```

3. Controleer services:
```bash
supervisorctl status
```

### 502 Bad Gateway

Backend draait waarschijnlijk niet:
```bash
supervisorctl restart facturatie-backend
tail -f /var/log/supervisor/facturatie-backend.err.log
```

### Database connectie fout

Controleer MongoDB:
```bash
systemctl status mongod
mongosh --eval "db.adminCommand('ping')"
```

### SSL Certificaat fout

Vernieuw certificaat:
```bash
certbot renew --force-renewal
systemctl reload nginx
```

---

## Backup

### Database Backup

```bash
# Backup maken
mongodump --db facturatie_db --out /backup/mongo/$(date +%Y%m%d)

# Backup terugzetten
mongorestore --db facturatie_db /backup/mongo/20240101/facturatie_db
```

### Applicatie Backup

```bash
# Volledige backup
tar -czvf /backup/facturatie-$(date +%Y%m%d).tar.gz /home/clp/htdocs/uw-domein.sr
```

---

## Updates

Om de applicatie te updaten:

```bash
cd /home/clp/htdocs/uw-domein.sr

# Stop services
supervisorctl stop all

# Backup maken
tar -czvf /backup/facturatie-pre-update-$(date +%Y%m%d).tar.gz .

# Update code (via git of upload)
git pull origin main

# Backend dependencies updaten
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend rebuilden
cd ../frontend
yarn install
yarn build

# Services herstarten
supervisorctl start all
```

---

## Support

Bij problemen:
1. Controleer de logs: `/var/log/supervisor/`
2. Controleer Nginx logs: `/var/log/nginx/`
3. Controleer MongoDB logs: `/var/log/mongodb/`
