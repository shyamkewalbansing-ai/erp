# Facturatie N.V. - Installatie Handleiding

## 🚀 Snelle Installatie (3 stappen!)

### Stap 1: Download en Upload
1. Klik op **"Save to GitHub"** (in de chat hieronder) om de code op te slaan
2. Download de bestanden van GitHub als ZIP
3. Upload naar uw server via SFTP in: `/home/cloudpanel/htdocs/facturatie/`

**Of via Git:**
```bash
cd /home/cloudpanel/htdocs
git clone https://github.com/UW_GEBRUIKERSNAAM/UW_REPO.git facturatie
```

### Stap 2: Voer het installatiescript uit
```bash
cd /home/cloudpanel/htdocs/facturatie
chmod +x install.sh
sudo ./install.sh
```

Het script vraagt om:
- Uw domein (bijv. `facturatie.uwbedrijf.com`)
- Server IP-adres (voor DNS instructies)

### Stap 3: DNS & SSL Configuratie

**DNS instellen bij uw domeinprovider:**
| Type | Naam | Waarde |
|------|------|--------|
| A | facturatie | UW_SERVER_IP |

**SSL certificaat installeren (na DNS):**
```bash
sudo certbot --nginx -d facturatie.uwbedrijf.com
```

### Klaar! 🎉
Open `https://uwdomein.com/register` en maak uw admin account aan.
De eerste gebruiker wordt automatisch de **Super Admin**!

---

## 📁 Bestanden Structuur

```
/home/cloudpanel/htdocs/facturatie/
├── install.sh          ← Voer dit uit!
├── INSTALLATIE.md      ← Deze handleiding
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env            ← Wordt automatisch aangemaakt
└── frontend/
    ├── src/
    ├── package.json
    └── .env            ← Wordt automatisch aangemaakt
```

---

## 🔧 Handige Commando's

```bash
# Backend herstarten
sudo systemctl restart facturatie

# Logs bekijken
sudo journalctl -u facturatie -f

# Status controleren
sudo systemctl status facturatie

# MongoDB status
sudo systemctl status mongod
```

---

## ⚙️ Configuratie Bestanden

### Backend (.env)
Locatie: `/home/cloudpanel/htdocs/facturatie/backend/.env`
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie
JWT_SECRET=automatisch_gegenereerd
```

### Frontend (.env)
Locatie: `/home/cloudpanel/htdocs/facturatie/frontend/.env`
```env
REACT_APP_BACKEND_URL=https://uw-domein.com
```

---

## ❓ Problemen Oplossen

### Backend start niet
```bash
# Bekijk de foutmelding
sudo journalctl -u facturatie -n 50

# Handmatig testen
cd /home/cloudpanel/htdocs/facturatie/backend
source venv/bin/activate
python3 -c "import server"
```

### Frontend werkt niet
```bash
cd /home/cloudpanel/htdocs/facturatie/frontend
yarn build
sudo systemctl reload nginx
```

### MongoDB werkt niet
```bash
sudo systemctl status mongod
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 502 Bad Gateway
```bash
# Check of backend draait
sudo systemctl status facturatie

# Herstart backend
sudo systemctl restart facturatie

# Check nginx config
sudo nginx -t
sudo systemctl reload nginx
```

### SSL/HTTPS problemen
```bash
# Installeer certbot als niet aanwezig
sudo apt install certbot python3-certbot-nginx

# Genereer certificaat
sudo certbot --nginx -d uw-domein.com
```

---

## 🔐 Accounts & Rollen

| Rol | Beschrijving |
|-----|-------------|
| **Super Admin** | Eerste gebruiker, beheert alle klanten |
| **Klant** | Beheert eigen huurders, appartementen, betalingen |

**Test account aanmaken:**
Registreer via `/register` - de eerste account wordt automatisch Super Admin.

---

## 📞 Support

Heeft u hulp nodig? Neem contact op met uw ontwikkelaar of raadpleeg de documentatie.
