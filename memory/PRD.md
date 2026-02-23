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

## Boekhouding Module Uitbreiding (20 Feb 2025)

### Geïmplementeerd
De Boekhouding module is uitgebreid met de volgende submodules, allemaal gegroepeerd onder `/app/boekhouding/`:

#### 1. Inkoop Module (`/app/boekhouding/inkoop/*`)
- **Dashboard**: Overzicht inkoopprocessen
- **Leveranciers**: CRUD voor leveranciersbeheer
- **Inkoopoffertes**: Offertes aanvragen bij leveranciers
- **Inkooporders**: Bestellingen plaatsen
- **Goederenontvangst**: Inkomende goederen registreren

#### 2. Verkoop Module (`/app/boekhouding/verkoop/*`)
- **Dashboard**: Overzicht verkoopprocessen
- **Klanten**: CRUD voor klantenbeheer
- **Verkoopoffertes**: Offertes maken voor klanten
- **Verkooporders**: Verkooporders beheren
- **Prijslijsten**: Prijzen en kortingen beheren

#### 3. Voorraad Module (`/app/boekhouding/voorraad/*`)
- **Dashboard**: Voorraadoverzicht
- **Artikelen**: Artikelbeheer met SKU, prijzen, etc.
- **Magazijnen**: Magazijnlocaties beheren
- **Voorraadmutaties**: In/uit bewegingen registreren
- **Inventarisatie**: Voorraadtellingen

#### 4. Projecten Module (`/app/boekhouding/projecten/*`)
- **Dashboard**: Projectenoverzicht met KPI's
- **Alle Projecten**: Project CRUD (klant/intern/onderhoud)
- **Urenregistratie**: Uren boeken op projecten

#### 5. Vaste Activa & Kostenplaatsen
- **Vaste Activa**: Registratie en afschrijvingen
- **Kostenplaatsen**: Budget tracking per afdeling

### Backend Bestanden
- `/app/backend/routers/inkoop.py`
- `/app/backend/routers/verkoop.py`
- `/app/backend/routers/voorraad.py`
- `/app/backend/routers/projecten.py`
- `/app/backend/routers/activa.py`

### Frontend Bestanden
- `/app/frontend/src/pages/inkoop/*.js`
- `/app/frontend/src/pages/verkoop/*.js`
- `/app/frontend/src/pages/voorraad/*.js`
- `/app/frontend/src/pages/projecten/*.js`
- `/app/frontend/src/pages/boekhouding/ActivaPage.js`
- `/app/frontend/src/pages/boekhouding/KostenplaatsenPage.js`

### Database Collecties
- `inkoop_leveranciers`, `inkoop_offertes`, `inkoop_orders`, `inkoop_ontvangsten`
- `verkoop_klanten`, `verkoop_offertes`, `verkoop_orders`, `verkoop_prijslijsten`
- `voorraad_artikelen`, `voorraad_magazijnen`, `voorraad_mutaties`
- `vaste_activa`, `activa_afschrijvingen`, `kostenplaatsen`
- `projecten`, `project_taken`, `project_uren`, `project_kosten`

### Test Account
- **Email**: `boekhoud@test.nl`
- **Wachtwoord**: `test1234`

### Bug Fixes (21 Feb 2025)
- **Veldnamen gefixed**: Frontend formulieren gebruikten verkeerde veldnamen (`prijs`, `btw_percentage`) terwijl backend `prijs_per_stuk` en `btw_tarief` verwachtte
- **Datum veld toegevoegd**: `orderdatum` en `offertedatum` worden nu automatisch ingevuld
- **Alle CRUD dialogen werkend**: Verkooporders, Verkoopoffertes, Inkooporders, Inkoopoffertes hebben nu werkende aanmaak-dialogen

### Debiteuren/Crediteuren Koppeling (23 Feb 2025)
- **Debiteuren = Klanten**: Verkoop module gebruikt nu `boekhouding_debiteuren` in plaats van aparte `verkoop_klanten` tabel
- **Crediteuren = Leveranciers**: Inkoop module gebruikt nu `boekhouding_crediteuren` in plaats van aparte `inkoop_leveranciers` tabel
- **Navigatie geherstructureerd**: 
  - Klanten verwijderd uit Verkoop submenu
  - Leveranciers verwijderd uit Inkoop submenu
  - Debiteuren en Crediteuren zijn nu de centrale entiteiten
- **Facturen Routes toegevoegd**:
  - `/app/boekhouding/verkoop/facturen` → Verkoopfacturen (gegenereerd uit orders)
  - `/app/boekhouding/inkoop/facturen` → Inkoopfacturen
- **Backend aangepast**: Orders en offertes zoeken nu eerst in debiteuren/crediteuren, met fallback naar legacy tabellen

## Roadmap / Backlog

### P0 - Kritiek
- [x] Frontend debuggen (opgelost)
- [x] Navigatie herstructureren onder Boekhouding

### P1 - Hoog
- [ ] Bank/Kas uitbreiding (koppeling met facturen)
- [ ] Nieuwe menu items: Gebruikersbeheer, Product/Dienst
- [ ] Inkomsten/Uitgaven overzichten

### P2 - Medium
- [ ] HRM integratie met boekhouding (personeelskosten automatisch boeken)
- [ ] Salaris koppeling met Bank/Kas
- [ ] Project uren koppeling met HRM medewerkers

### P3 - Laag
- [ ] Geavanceerde rapportages per module
- [ ] Export functies (Excel, PDF)
- [ ] Bulk import/export
