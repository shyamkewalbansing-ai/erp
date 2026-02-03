# Subdomain Configuratie Handleiding

## Overzicht

Deze applicatie ondersteunt twee modi:
1. **Path-based routing** (development/preview): Alles op één domein met `/app` prefix
2. **Subdomain-based routing** (productie): Landing op hoofddomein, app op `app.` subdomain

## Huidige Setup (Development/Preview)

```
https://multi-currency-books-1.preview.emergentagent.com/           → Landing page
https://multi-currency-books-1.preview.emergentagent.com/login      → Login
https://multi-currency-books-1.preview.emergentagent.com/app/       → Ingelogde applicatie
https://multi-currency-books-1.preview.emergentagent.com/booking/   → Publieke booking portals
```

## Productie Setup (Subdomain Mode)

```
https://facturatie.sr/                    → Landing page, Pricing, Modules
https://facturatie.sr/login               → Redirect naar app.facturatie.sr/login
https://app.facturatie.sr/                → Ingelogde applicatie
https://app.facturatie.sr/dashboard       → Dashboard
https://tenant1.facturatie.sr/            → Klant workspace (optioneel)
```

## Configuratie Stappen

### 1. DNS Configuratie

Bij uw DNS provider, voeg de volgende records toe:

```
Type    Name    Value                   TTL
A       @       YOUR_SERVER_IP          300
A       app     YOUR_SERVER_IP          300
A       *       YOUR_SERVER_IP          300    (voor tenant subdomains)
```

### 2. SSL Certificaten

Genereer een wildcard SSL certificaat met Let's Encrypt:

```bash
# Installeer certbot
sudo apt install certbot python3-certbot-nginx

# Genereer wildcard certificaat (DNS validatie vereist)
sudo certbot certonly --manual --preferred-challenges dns \
    -d facturatie.sr -d *.facturatie.sr

# Volg de instructies om DNS TXT records toe te voegen
```

### 3. Nginx Configuratie

Kopieer de template naar Nginx:

```bash
# Kopieer template
sudo cp /app/nginx-subdomain.conf.template /etc/nginx/sites-available/facturatie.conf

# Bewerk en vervang YOUR_DOMAIN
sudo sed -i 's/YOUR_DOMAIN/facturatie.sr/g' /etc/nginx/sites-available/facturatie.conf
sudo sed -i 's/YOUR_BACKEND_IP/localhost/g' /etc/nginx/sites-available/facturatie.conf

# Enable site
sudo ln -s /etc/nginx/sites-available/facturatie.conf /etc/nginx/sites-enabled/

# Test configuratie
sudo nginx -t

# Herlaad Nginx
sudo systemctl reload nginx
```

### 4. Frontend Environment

Update `/app/frontend/.env` voor productie:

```env
REACT_APP_BACKEND_URL=https://facturatie.sr
REACT_APP_SUBDOMAIN_MODE=true
REACT_APP_APP_URL=https://app.facturatie.sr
REACT_APP_LANDING_URL=https://facturatie.sr
```

### 5. Backend CORS Update

Voeg de nieuwe domeinen toe aan CORS in `/app/backend/server.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://facturatie.sr",
        "https://app.facturatie.sr",
        "https://*.facturatie.sr",  # Voor tenant subdomains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Cookie Configuratie

Voor cross-subdomain authenticatie worden cookies gebruikt met de volgende instellingen:

```javascript
// Cookie domain wordt automatisch ingesteld op .facturatie.sr
// Zodat cookies werken op zowel facturatie.sr als app.facturatie.sr
document.cookie = `token=${value}; domain=.facturatie.sr; path=/; secure; samesite=lax`;
```

## Tenant Subdomains (Optioneel)

Klanten kunnen hun eigen subdomain krijgen (bijv. `bedrijfx.facturatie.sr`):

1. Workspace aanmaken met unieke slug
2. DNS wildcard is al geconfigureerd
3. Backend herkent subdomain via `X-Tenant-Subdomain` header
4. Frontend laadt workspace-specifieke branding

## Troubleshooting

### Cookies werken niet cross-domain
- Controleer dat `domain=.facturatie.sr` is ingesteld
- Controleer dat `SameSite=Lax` of `SameSite=None; Secure` is gebruikt

### Redirect loops
- Controleer Nginx configuratie voor correcte redirects
- Controleer dat frontend URL's correct zijn in `.env`

### SSL errors
- Zorg dat wildcard certificaat alle subdomains dekt
- Vernieuw certificaat indien verlopen

## Bestanden

- `/app/nginx-subdomain.conf.template` - Nginx configuratie template
- `/app/frontend/src/lib/subdomain.js` - Frontend subdomain helper
- `/app/frontend/.env` - Environment variabelen
