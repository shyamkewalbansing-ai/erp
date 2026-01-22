# SuriRentals - Installatie Handleiding

## 🚀 Snelle Installatie (3 stappen!)

### Stap 1: Download en Upload
1. Download alle bestanden via "Save to GitHub" of VS Code view
2. Upload naar uw server in: `/home/cloudpanel/htdocs/surirentals/`

### Stap 2: Voer het installatiescript uit
```bash
cd /home/cloudpanel/htdocs/surirentals
chmod +x install.sh
sudo ./install.sh
```

Het script vraagt om:
- Uw domein (bijv. `surirentals.uwdomein.com`)
- Een wachtwoord (of wordt automatisch gegenereerd)

### Stap 3: SSL Certificaat
1. Open CloudPanel: `https://uw-server-ip:8443`
2. Ga naar **Sites** → uw domein → **SSL/TLS**
3. Klik op **New Let's Encrypt Certificate**
4. Voer uit: `sudo nginx -t && sudo systemctl reload nginx`

### Klaar! 🎉
Open `https://uwdomein.com/register` en maak uw admin account aan.

---

## 📁 Bestanden Structuur

```
/home/cloudpanel/htdocs/surirentals/
├── install.sh          ← Voer dit uit!
├── backend/
│   ├── server.py
│   └── requirements.txt
└── frontend/
    ├── src/
    └── package.json
```

---

## 🔧 Handige Commando's

```bash
# Backend herstarten
sudo systemctl restart surirentals

# Logs bekijken
sudo journalctl -u surirentals -f

# Status controleren
sudo systemctl status surirentals
```

---

## ❓ Problemen?

### Backend start niet
```bash
sudo journalctl -u surirentals -n 50
```

### Frontend werkt niet
```bash
cd /home/cloudpanel/htdocs/surirentals/frontend
yarn build
sudo systemctl reload nginx
```

### MongoDB werkt niet
```bash
sudo systemctl status mongod
sudo systemctl start mongod
```
