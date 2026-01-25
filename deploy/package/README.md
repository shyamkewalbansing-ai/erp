# Facturatie ERP - Deployment Package

## Inhoud
- `frontend/` - Gebouwde React applicatie
- `backend/` - FastAPI backend code
- `nginx-site.conf` - Nginx configuratie
- `facturatie-backend.service` - Systemd service
- `server-setup.sh` - Automatisch setup script

## Installatie Stappen

### 1. Upload naar server
```bash
scp -r package/* facturatie@uw-server:/home/facturatie/htdocs/facturatie.sr/
```

### 2. SSH naar server
```bash
ssh facturatie@uw-server
cd /home/facturatie/htdocs/facturatie.sr
```

### 3. Setup script uitvoeren
```bash
chmod +x server-setup.sh
./server-setup.sh
```

### 4. Backend configureren
```bash
nano backend/.env
# Pas MONGO_URL, JWT_SECRET, SMTP_PASSWORD aan
```

### 5. Nginx configureren (CloudPanel)
1. Login op CloudPanel
2. Ga naar Sites → facturatie.sr → Vhost
3. Voeg de inhoud van `nginx-site.conf` toe
4. Klik op "Save"

### 6. Service herstarten
```bash
sudo systemctl restart facturatie-backend
sudo systemctl reload nginx
```

### 7. Testen
```bash
curl https://facturatie.sr/api/health
```

## Troubleshooting

### Backend logs
```bash
tail -f /home/facturatie/htdocs/facturatie.sr/logs/backend.log
tail -f /home/facturatie/htdocs/facturatie.sr/logs/backend.error.log
sudo journalctl -u facturatie-backend -f
```

### Service status
```bash
sudo systemctl status facturatie-backend
```

### Nginx test
```bash
sudo nginx -t
sudo systemctl reload nginx
```
