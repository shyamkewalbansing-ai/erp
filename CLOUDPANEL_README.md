# 🚀 FACTURATIE ERP - COMPLETE CLOUDPANEL INSTALLER

## ✅ Nieuw: Één Script voor Alles!

In plaats van al die losse scripts heb je nu **één compleet install script** dat alles automatisch doet:

```bash
sudo ./COMPLETE_INSTALL.sh
```

---

## 📋 Wat doet dit script?

| Stap | Beschrijving |
|------|-------------|
| 1 | Systeem voorbereiden (curl, git, supervisor, certbot) |
| 2 | Node.js 20 + Yarn installeren |
| 3 | Python 3 + pip + venv installeren |
| 4 | MongoDB 7.0 installeren + database aanmaken |
| 5 | App directory voorbereiden |
| 6 | Backend configureren (.env, venv) |
| 7 | Frontend configureren (.env, build) |
| 8 | SSL certificaten aanvragen (Let's Encrypt) |
| 9 | Nginx configureren (hoofddomein + app subdomain) |
| 10 | Supervisor services + cron jobs |

---

## 🛠 Installatie

### Stap 1: Upload naar server

```bash
scp COMPLETE_INSTALL.sh root@jouw-server:/root/
```

### Stap 2: Maak uitvoerbaar

```bash
chmod +x COMPLETE_INSTALL.sh
```

### Stap 3: Voer uit

```bash
sudo ./COMPLETE_INSTALL.sh
```

### Stap 4: Beantwoord de vragen

Het script vraagt om:
- **Domein** (bijv. `facturatie.sr`)
- **E-mail** (voor SSL certificaten)
- **Admin wachtwoord**
- **GitHub URL** (optioneel)

---

## 🎛 Beheer Commands

Na installatie heb je het `facturatie` command:

```bash
# Service status bekijken
facturatie status

# Services herstarten
facturatie restart

# Logs bekijken
facturatie logs
facturatie logs backend
facturatie logs error

# Database backup maken
facturatie backup

# Applicatie updaten van Git
facturatie update

# SSL certificaat vernieuwen
facturatie ssl-renew
```

---

## 📁 Directory Structuur na Installatie

```
/home/clp/htdocs/jouw-domein/
├── backend/
│   ├── venv/           # Python virtual environment
│   ├── server.py       # FastAPI backend
│   ├── requirements.txt
│   └── .env            # Backend configuratie
├── frontend/
│   ├── build/          # Production build
│   ├── src/
│   ├── package.json
│   └── .env            # Frontend configuratie
├── logs/
│   ├── backend.out.log
│   ├── backend.err.log
│   ├── frontend.out.log
│   └── frontend.err.log
├── backups/            # Database backups
└── CREDENTIALS.txt     # Login gegevens (VERWIJDER NA OPSLAAN!)
```

---

## 🔧 Configuratie Bestanden

| Bestand | Locatie |
|---------|---------|
| Backend .env | `/home/clp/htdocs/DOMAIN/backend/.env` |
| Frontend .env | `/home/clp/htdocs/DOMAIN/frontend/.env` |
| Nginx config | `/etc/nginx/sites-available/DOMAIN.conf` |
| Supervisor backend | `/etc/supervisor/conf.d/facturatie-backend.conf` |
| Supervisor frontend | `/etc/supervisor/conf.d/facturatie-frontend.conf` |

---

## 🔄 Automatische Taken

Het script configureert automatisch:

| Taak | Schema | Beschrijving |
|------|--------|-------------|
| SSL Renewal | Elke 1e van de maand, 03:00 | Vernieuwt SSL certificaten |
| Database Backup | Dagelijks om 02:00 | Backup naar /home/clp/htdocs/DOMAIN/backups/ |

---

## ❌ Oude Scripts (Kunnen Verwijderd Worden)

Na gebruik van `COMPLETE_INSTALL.sh` zijn deze oude scripts niet meer nodig:

```bash
# Deze kunnen weg:
rm -f /app/fix-nginx.sh
rm -f /app/fix-nginx-ssl.sh
rm -f /app/install-cloudpanel.sh
rm -f /app/install-cloudpanel-v2.sh
rm -f /app/auto-install.sh
rm -f /app/auto_domain_setup.sh
rm -f /app/setup_all_workspaces.sh
rm -f /app/setup_workspace_subdomain.sh
rm -f /app/nginx-subdomain.conf.template
rm -f /app/CLOUDPANEL_INSTALL.sh
rm -f /app/install.sh
rm -f /app/update.sh
rm -f /app/quick-update.sh
rm -f /app/setup-cron.sh
rm -f /app/deploy.sh
rm -rf /app/deploy/
rm -rf /app/scripts/
```

**Behoud alleen:**
- `COMPLETE_INSTALL.sh` - Nieuwe complete installer
- `BACKUP.sh` - Uitgebreide backup (optioneel)
- `RESTORE.sh` - Restore functie (optioneel)

---

## 🌐 DNS Configuratie

Zorg dat deze DNS records zijn geconfigureerd **VOOR** je het script uitvoert:

| Type | Naam | Waarde |
|------|------|--------|
| A | @ | JE_SERVER_IP |
| A | www | JE_SERVER_IP |
| A | app | JE_SERVER_IP |

---

## ❓ Problemen?

### SSL certificaat mislukt?
```bash
# Handmatig SSL aanvragen
certbot certonly --standalone -d jouw-domein.nl -d www.jouw-domein.nl -d app.jouw-domein.nl
```

### Services starten niet?
```bash
# Check logs
tail -f /home/clp/htdocs/DOMAIN/logs/backend.err.log

# Herstart services
supervisorctl restart all
```

### Nginx fout?
```bash
# Test configuratie
nginx -t

# Bekijk nginx logs
tail -f /var/log/nginx/error.log
```

---

## 📞 Support

Voor vragen of problemen, controleer eerst:
1. DNS records correct geconfigureerd?
2. Server IP bereikbaar op poort 80/443?
3. Firewall staat HTTP/HTTPS toe?

---

**Versie 3.0** - Complete CloudPanel Installer
