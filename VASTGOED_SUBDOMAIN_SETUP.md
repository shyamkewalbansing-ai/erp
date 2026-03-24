# Vastgoed Subdomein Configuratie

## vastgoed.facturatie.sr instellen

### Stap 1: DNS Record toevoegen

Ga naar uw domeinprovider en voeg dit DNS record toe:

| Type | Naam      | Waarde         |
|------|-----------|----------------|
| A    | vastgoed  | 72.62.174.80   |

### Stap 2: Installatiescript opnieuw uitvoeren

Het `COMPLETE_INSTALL.sh` script is bijgewerkt met de `vastgoed` subdomain configuratie.
Bij de volgende deployment wordt het automatisch meegenomen.

Of handmatig SSL vernieuwen:
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d facturatie.sr -d www.facturatie.sr -d app.facturatie.sr -d vastgoed.facturatie.sr
sudo systemctl start nginx
```

### Stap 3: Nginx configuratie (als handmatig nodig)

Voeg dit server blok toe aan `/etc/nginx/sites-enabled/facturatie.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name vastgoed.facturatie.sr;
    
    ssl_certificate /etc/letsencrypt/live/facturatie.sr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/facturatie.sr/privkey.pem;
    
    # Root redirect naar /vastgoed
    location = / {
        return 301 https://vastgoed.facturatie.sr/vastgoed;
    }
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
}
```

### Hoe het werkt

- `vastgoed.facturatie.sr` -> Nginx redirect naar `/vastgoed`
- Frontend detecteert het subdomein en toont automatisch de Kiosk module
- API calls werken via `/api/kiosk/...` zoals normaal
- Bedrijven kunnen hun kiosk URL worden: `vastgoed.facturatie.sr/vastgoed/{company_id}`
