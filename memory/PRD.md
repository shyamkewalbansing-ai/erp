# Facturatie.sr - Product Requirements Document

## Originele Probleem
De gebruiker wil een geconsolideerd installatiescript voor hun CloudPanel-server setup, samen met automatische deployments via GitHub webhooks en diverse module-aanpassingen.

## Kernfunctionaliteiten
1. **All-in-one Installatiescript** (`COMPLETE_INSTALL.sh`) - Installeert alle dependencies, configureert Nginx/Supervisor, SSL
2. **GitHub Webhook voor Auto-Deploy** - Push naar main branch triggert automatische update
3. **Modulaire Add-ons Systeem** - Boekhouding, HRM, Vastgoed, Auto Dealer, etc.
4. **Multi-tenant Workspaces** - Elke klant krijgt eigen workspace met custom domein
5. **Automatische Domain Setup** - Nginx + SSL automatisch via wildcard certificaat
6. **Wildcard SSL** (`*.facturatie.sr`) - Alle subdomeinen automatisch beveiligd

## Technische Stack
- **Frontend**: React, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (facturatie_db)
- **Server**: CloudPanel, Nginx, Supervisor
- **SSL**: Let's Encrypt via Cloudflare DNS (wildcard)
- **DNS**: Cloudflare

## Voltooide Taken

### Februari 2025 (Huidige Sessie)
- [x] IP-adres probleem opgelost - hardcoded IP vervangen door environment variabele
- [x] CORS geconfigureerd voor alle subdomeinen (`CORS_ORIGINS="*"`)
- [x] Workspace branding laadt correct op subdomeinen
- [x] Laadscherm toegevoegd voor branding (geen flash meer)
- [x] "Nieuwe Workspace" knop gefixed
- [x] **Wildcard SSL certificaat** (`*.facturatie.sr`) via Cloudflare DNS
- [x] **Wildcard Nginx config** - Alle subdomeinen automatisch
- [x] **Webhook-deploy.sh** geüpdatet met git safe.directory fix
- [x] **COMPLETE_INSTALL.sh** uitgebreid met Cloudflare wildcard SSL
- [x] Domain status detecteert wildcard certificaat correct

### Eerdere Sessies
- [x] Geconsolideerd installatiescript: `COMPLETE_INSTALL.sh`
- [x] GitHub webhook systeem voor automatische deployments
- [x] Gratis tier voor boekhoudmodule (5 klanten, 5 facturen limiet)
- [x] Demo account zonder vooraf geactiveerde modules

## Belangrijke Bestanden
- `/app/COMPLETE_INSTALL.sh` - Master installatiescript (met Cloudflare wildcard SSL)
- `/app/webhook-deploy.sh` - Webhook auto-deploy script
- `/app/setup-domain.sh` - Automatische domain setup (voor custom domains)
- `/app/frontend/.env` - Frontend configuratie
- `/app/backend/.env` - Backend configuratie
- `/app/backend/routers/domain_management.py` - Domain management API

## SSL Certificaten
- **Wildcard**: `/etc/letsencrypt/live/facturatie.sr-0001/` (`*.facturatie.sr`)
- **Hoofddomein**: `/etc/letsencrypt/live/facturatie.sr/` (`facturatie.sr`, `www`, `app`)
- **Cloudflare credentials**: `/root/.secrets/cloudflare.ini`

## Nginx Configuraties
- `/etc/nginx/sites-available/facturatie.conf` - Hoofddomein
- `/etc/nginx/sites-available/facturatie-wildcard.conf` - Alle subdomeinen

## Database
- **Naam**: `facturatie_db`
- **Collecties**: workspaces, users, addons, user_addons, boekhouding_*, hrm_*, etc.

## Credentials voor Testing
- **Admin**: `admin@facturatie.sr` / `Admin123!`
- **Demo**: `demo@facturatie.sr` / `demo2024`

## Server Info
- **IP**: `72.62.174.80`
- **App Path**: `/home/facturatie/htdocs/facturatie.sr/`
- **Webhook**: `https://facturatie.sr/api/webhook/github`

## Key API Endpoints
- `POST /api/domains/setup-automated` - Automatische domain setup
- `GET /api/workspace/branding-public/{slug}` - Publieke workspace branding
- `POST /api/webhook/github` - GitHub webhook voor auto-deploy
- `GET /api/domains/status/{workspace_id}` - Domain status (detecteert wildcard)
