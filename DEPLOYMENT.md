# 🚀 Facturatie N.V. - Server Deployment Handleiding

## Stap 1: Code naar GitHub pushen

In Emergent, klik op **"Save to GitHub"** knop om je code naar je GitHub repository te pushen.

## Stap 2: Server Voorbereiden

### Vereisten installeren (Ubuntu/Debian)

```bash
# Update systeem
sudo apt update && sudo apt upgrade -y

# Installeer Python 3.10+
sudo apt install python3 python3-pip python3-venv -y

# Installeer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Installeer Yarn
npm install -g yarn

# Installeer MongoDB
sudo apt install mongodb -y
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Installeer Nginx en Supervisor
sudo apt install nginx supervisor -y

# Installeer Git
sudo apt install git -y

# Installeer Certbot voor SSL
sudo apt install certbot python3-certbot-nginx -y
```

## Stap 3: Deployment Script Aanpassen

1. Download het `deploy.sh` script naar je server
2. Open het script en pas de configuratie aan:

```bash
nano deploy.sh
```

Wijzig deze variabelen:
- `GITHUB_REPO` - Je GitHub repository URL
- `APP_DIR` - Waar je de app wilt installeren
- `BRANCH` - De git branch (meestal "main")

## Stap 4: Eerste Deployment

```bash
# Maak het script uitvoerbaar
chmod +x deploy.sh

# Voer deployment uit
sudo ./deploy.sh
```

## Stap 5: Environment Variables Configureren

Na de eerste deployment, configureer de `.env` bestanden:

### Backend (.env)
```bash
nano /var/www/facturatie-nv/backend/.env
```

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=facturatie

# Security - VERANDER DIT!
JWT_SECRET=jouw_zeer_lange_geheime_sleutel_hier_minimaal_32_karakters

# App URL
APP_URL=https://jouw-domein.com

# Email (optioneel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw-email@gmail.com
SMTP_PASSWORD=app-wachtwoord
```

### Frontend (.env)
```bash
nano /var/www/facturatie-nv/frontend/.env
```

```env
REACT_APP_BACKEND_URL=https://jouw-domein.com
```

## Stap 6: Nginx Configureren

```bash
sudo nano /etc/nginx/sites-available/facturatie-nv
```

```nginx
server {
    listen 80;
    server_name jouw-domein.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jouw-domein.com;
    
    # SSL (na certbot)
    ssl_certificate /etc/letsencrypt/live/jouw-domein.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jouw-domein.com/privkey.pem;
    
    # Frontend
    location / {
        root /var/www/facturatie-nv/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activeer de configuratie:
```bash
sudo ln -s /etc/nginx/sites-available/facturatie-nv /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Stap 7: SSL Certificaat

```bash
sudo certbot --nginx -d jouw-domein.com
```

## Stap 8: Supervisor Configureren (Auto-restart)

```bash
sudo nano /etc/supervisor/conf.d/facturatie-nv.conf
```

```ini
[program:facturatie-nv-backend]
directory=/var/www/facturatie-nv/backend
command=/var/www/facturatie-nv/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/facturatie-nv/backend.err.log
stdout_logfile=/var/log/facturatie-nv/backend.out.log
environment=PATH="/var/www/facturatie-nv/venv/bin"
```

```bash
sudo mkdir -p /var/log/facturatie-nv
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start facturatie-nv-backend
```

## 🔄 Updates Deployen

### Volledige update (met frontend rebuild):
```bash
sudo ./deploy.sh
```

### Snelle update (alleen backend):
```bash
sudo ./quick-update.sh
```

## 🔍 Troubleshooting

### Backend logs bekijken:
```bash
sudo tail -f /var/log/facturatie-nv/backend.err.log
```

### Nginx logs bekijken:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Service status:
```bash
sudo supervisorctl status
```

### MongoDB status:
```bash
sudo systemctl status mongodb
```

## 📱 Support

Heb je hulp nodig? Neem contact op via het Emergent platform.
