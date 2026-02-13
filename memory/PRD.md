# Facturatie.sr - Product Requirements Document

## Originele Probleem
De gebruiker wil een geconsolideerd installatiescript voor hun CloudPanel-server setup, samen met automatische deployments via GitHub webhooks en diverse module-aanpassingen.

## Kernfunctionaliteiten
1. **All-in-one Installatiescript** (`COMPLETE_INSTALL.sh`) - Installeert alle dependencies, configureert Nginx/Supervisor, SSL
2. **GitHub Webhook voor Auto-Deploy** - Push naar main branch triggert automatische update
3. **Modulaire Add-ons Systeem** - Boekhouding, HRM, Vastgoed, Auto Dealer, etc.
4. **Multi-tenant Workspaces** - Elke klant krijgt eigen workspace met custom domein
5. **Automatische Domain Setup** - Nginx + SSL automatisch via `setup-domain.sh`

## Technische Stack
- **Frontend**: React, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (facturatie_db)
- **Server**: CloudPanel, Nginx, Supervisor
- **SSL**: Certbot (Let's Encrypt)

## Voltooide Taken

### Februari 2025 (Huidige Sessie)
- [x] IP-adres probleem opgelost - hardcoded `72.62.174.117` vervangen door `72.62.174.80`
- [x] IP verplaatst naar environment variabele `REACT_APP_SERVER_IP`
- [x] CORS geconfigureerd voor alle subdomeinen (`CORS_ORIGINS="*"`)
- [x] Workspace branding laadt nu correct op subdomeinen
- [x] Laadscherm toegevoegd voor branding (geen "Facturatie" flash meer)
- [x] "Nieuwe Workspace" knop gefixed (verkeerde state variabele)
- [x] Automatische domain setup script aangemaakt (`setup-domain.sh`)
- [x] Backend pad gecorrigeerd naar `/home/facturatie/htdocs/facturatie.sr/`

### Eerdere Sessies
- [x] Geconsolideerd installatiescript: `COMPLETE_INSTALL.sh`
- [x] GitHub webhook systeem voor automatische deployments
- [x] Gratis tier voor boekhoudmodule (5 klanten, 5 facturen limiet)
- [x] Demo account zonder vooraf geactiveerde modules
- [x] WhatsApp floating button verwijderd van landingspagina

## Openstaande Items
- [ ] Test "Nieuwe Workspace" knop na deploy
- [ ] Test automatische domain setup via Domain Management pagina
- [ ] Oude/ongebruikte shell scripts opruimen

## Backlog / Toekomstige Verbeteringen
- [ ] Wildcard SSL certificaat (`*.facturatie.sr`) voor alle subdomeinen
- [ ] Email notificaties bij workspace aanmaak
- [ ] Uitgebreidere branding opties (fonts, login achtergrond)
- [ ] `.env.example` bestanden aanmaken

## Belangrijke Bestanden
- `/app/COMPLETE_INSTALL.sh` - Master installatiescript
- `/app/webhook-deploy.sh` - Webhook auto-deploy script
- `/app/setup-domain.sh` - **NIEUW** Automatische Nginx + SSL setup
- `/app/frontend/.env` - Frontend configuratie (inclusief `REACT_APP_SERVER_IP`)
- `/app/backend/.env` - Backend configuratie
- `/app/backend/routers/domain_management.py` - Domain management API

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
