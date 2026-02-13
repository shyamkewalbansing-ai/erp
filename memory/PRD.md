# Facturatie.sr - Product Requirements Document

## Originele Probleem
De gebruiker wil een geconsolideerd installatiescript voor hun CloudPanel-server setup, samen met automatische deployments via GitHub webhooks en diverse module-aanpassingen.

## Kernfunctionaliteiten
1. **All-in-one Installatiescript** (`COMPLETE_INSTALL.sh`) - Installeert alle dependencies, configureert Nginx/Supervisor, SSL
2. **GitHub Webhook voor Auto-Deploy** - Push naar main branch triggert automatische update
3. **Modulaire Add-ons Systeem** - Boekhouding, HRM, Vastgoed, Auto Dealer, etc.
4. **Multi-tenant Workspaces** - Elke klant krijgt eigen workspace met custom domein

## Technische Stack
- **Frontend**: React, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB
- **Server**: CloudPanel, Nginx, Supervisor
- **SSL**: Certbot (Let's Encrypt)

## Voltooide Taken

### December 2025 (Huidige Sessie)
- [x] IP-adres probleem opgelost - hardcoded `72.62.174.117` vervangen door `72.62.174.80`
- [x] IP verplaatst naar environment variabele `REACT_APP_SERVER_IP`
- [x] Aangepaste bestanden: `DomeinenPage.js`, `Admin.js`, `Layout.js`, `webhook-deploy.sh`

### Eerdere Sessies
- [x] Geconsolideerd installatiescript: `COMPLETE_INSTALL.sh`
- [x] GitHub webhook systeem voor automatische deployments
- [x] Gratis tier voor boekhoudmodule (5 klanten, 5 facturen limiet)
- [x] Demo account zonder vooraf geactiveerde modules
- [x] WhatsApp floating button verwijderd van landingspagina
- [x] Broken links en ontbrekende module detail pagina's gefixed

## Openstaande Items
Geen

## Backlog / Toekomstige Verbeteringen
- [ ] `.env.example` bestanden aanmaken voor makkelijkere installatie
- [ ] Alle hardcoded waarden naar environment variabelen verplaatsen

## Belangrijke Bestanden
- `/app/COMPLETE_INSTALL.sh` - Master installatiescript
- `/app/webhook-deploy.sh` - Webhook auto-deploy script
- `/app/frontend/.env` - Frontend configuratie (inclusief `REACT_APP_SERVER_IP`)
- `/app/backend/.env` - Backend configuratie

## Credentials voor Testing
- **Admin**: `admin@facturatie.sr` / `Admin123!`
- **Demo**: `demo@facturatie.sr` / `demo2024`

## Server Info
- **IP**: `72.62.174.80`
- **App Path**: `/home/facturatie/htdocs/facturatie.sr/`
- **Webhook**: `https://facturatie.sr/api/webhook/github`
