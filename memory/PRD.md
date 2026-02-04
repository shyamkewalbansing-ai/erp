# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
ERP SaaS systeem voor Surinaamse bedrijven met modulaire add-ons, CMS beheer en AI chatbot.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI, lazy loading
- **Database**: MongoDB (erp_db)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Styling**: Tailwind CSS met glassmorphism effecten
- **Fonts**: Outfit (headings), Plus Jakarta Sans (body)
- **Primary Color**: #0caf60 (groen)
- **Multi-tenant**: Workspace-based isolatie per klant

## What's Been Implemented (4 Feb 2026)

### VASTGOED BEHEER UI MODERNISERING ✅ (VOLTOOID - 4 Feb 2026)
Alle Vastgoed Beheer pagina's hebben nu een consistente, moderne look met hero banners en stats cards.

**Gemoderniseerde Pagina's:**
- [x] **Appartementen** (`/app/apartments`) - Hero banner, 4 stats cards, moderne kaart layout
- [x] **Kasgeld** (`/app/kasgeld`) - Hero banner met SRD/EUR toggle, 6 stats cards, wisselkoers info
- [x] **Borg/Deposits** (`/app/deposits`) - Hero banner, 3 stats cards, mobile responsive cards
- [x] **Leningen** (`/app/leningen`) - Hero banner, 4 stats cards, mobile responsive cards

**UI Componenten per Pagina:**
- **Hero Banner**: Donkere gradient achtergrond (slate naar emerald/purple/orange), decoratieve blur elementen
- **Stats Cards**: Featured card met gradient, normale cards met hover effecten
- **Zoek/Filter Bar**: Consistent styling met muted achtergrond
- **Tabellen**: Desktop table, mobile card layout
- **Empty States**: Moderne iconen, CTA knoppen

### SUPERADMIN SIDEBAR UITGESCHAKELD ✅ (VOLTOOID - 4 Feb 2026)
De zijbalk is nu volledig verborgen voor superadmin gebruikers.

**Wat is geïmplementeerd:**
- [x] Sidebar wordt niet gerenderd voor superadmin role
- [x] Main content krijgt `main-content-full-width` class
- [x] Header neemt volledige breedte in
- [x] Werkt op zowel desktop als mobiel

**Gewijzigde Bestanden:**
- `/app/frontend/src/components/Layout.js` - Conditie voor sidebar rendering
- `/app/frontend/src/App.css` - Nieuwe `.main-content-full-width` class

---

### SUPERADMIN DASHBOARD RESPONSIVENESS ✅ (VOLTOOID - 4 Feb 2026)
Complete responsieve UI voor het superadmin dashboard zonder horizontaal scrollen.

**Belangrijkste Fixes:**
- [x] **Geen horizontaal scrollen meer** - alle content past binnen het scherm
- [x] Stats cards: 2x2 grid op mobiel, 4 kolommen op desktop
- [x] Compacte padding: p-2 op mobiel, p-3/p-4 op tablet, p-6 op desktop
- [x] Hero header compact en responsive
- [x] "Klant Aanmaken" knop: fullwidth op mobiel, inline op desktop
- [x] Klanten weergave: kaart-layout op mobiel, tabel op desktop (lg:)
- [x] Tabs horizontaal scrollbaar zonder pagina-overflow
- [x] Main content `overflow-x-hidden` om overflow te voorkomen

**Layout Wijzigingen:**
- `/app/frontend/src/pages/Admin.js`:
  - Stats cards grid: `grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 lg:gap-3`
  - Compacte card padding: `p-1.5 sm:p-2.5`
  - Compacte tekst: `text-[8px] sm:text-[10px]`
  - Mobile card layout voor klanten (blok op <lg)
  - Desktop table layout voor klanten (verborgen op <lg)
  
- `/app/frontend/src/components/Layout.js`:
  - Page content padding: `p-2 sm:p-3 md:p-4 lg:p-6`
  - Main content: `overflow-x-hidden`

**Geteste Schermformaten:**
- ✅ Mobiel (375px) - ALLE content zichtbaar, geen scrollen
- ✅ Tablet (768px)
- ✅ Desktop (1280px)

---

## What's Been Implemented (3 Feb 2026)

### GEAUTOMATISEERDE DOMAIN SETUP ✅ (NIEUW - 3 Feb 2026)
Complete automatisering voor het configureren van custom domeinen voor nieuwe klanten:

**Features:**
- [x] "Nieuw Domein Setup" knop in admin dashboard (Domains tab)
- [x] Setup dialoog met klant selectie en domein input
- [x] Automatische workspace aanmaak of update
- [x] DNS A-record verificatie
- [x] Domein registratie in database
- [x] Stap-voor-stap voortgangsindicatie
- [x] Integratie met server-side setup script (setup-domain.sh)

**Backend API's:** `/app/backend/routers/domain_management.py`
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/domains/status | GET | Overzicht alle custom domeinen |
| /api/domains/setup-automated | POST | **NIEUW** Geautomatiseerde domain setup |
| /api/domains/verify-dns/{workspace_id} | POST | DNS verificatie |
| /api/domains/provision/nginx/{workspace_id} | POST | Nginx configuratie |
| /api/domains/provision/ssl/{workspace_id} | POST | SSL installatie |
| /api/domains/provision/full/{workspace_id} | POST | Volledige setup |

**Frontend:** `/app/frontend/src/pages/DomainManagementPage.js`
- Setup dialoog met klant dropdown en domein input
- Real-time stappen feedback
- Integratie met admin panel

**Test Rapport:** `/app/test_reports/iteration_32.json` - 100% geslaagd (14/14 backend, alle UI flows)

---

### SERVER UPDATE KNOP VERBETERD ✅ (3 Feb 2026)
Duidelijke "server-update.sh" knop in admin panel met:
- **"Uitvoeren: server-update.sh"** knop met raket icoon
- Exacte commando zichtbaar: `sudo /home/clp/htdocs/facturatie.sr/server-update.sh`
- Lijst met wat het script doet (backup, git pull, dependencies, frontend build, services herstart)
- Waarschuwing om eerst naar GitHub te pushen

---

## What's Been Implemented (1 Feb 2026)

### POMPSTATION (GAS STATION) MODULE ✅ (NIEUW - 1 Feb 2026)
Complete Pompstation module voor Surinaamse tankstations:

**Features:**
- [x] Dashboard met omzet, liters, actieve pompen, waarschuwingen
- [x] Brandstoftank beheer - niveau monitoring, metingen, alerts
- [x] Leveringen registratie - leverancier, chauffeur, variance tracking
- [x] Pompen management - koppeling aan tanks, status beheer
- [x] POS/Kassa systeem - brandstof + winkelartikelen, multi-betaalmethoden
- [x] Winkel voorraad - producten, categorieën, barcode, voorraad alerts
- [x] Diensten beheer - shift start/stop, kas reconciliatie
- [x] Personeel - medewerkers, functies, PIN codes, uurlonen
- [x] Veiligheid & Compliance - inspecties, incidenten, status tracking
- [x] Rapportages - dagelijkse omzet, betaalmethode uitsplitsing

**Backend:** `/app/backend/routers/pompstation.py` - 28 API endpoints
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/pompstation/dashboard | GET | Dashboard statistieken |
| /api/pompstation/tanks | GET/POST | Tank CRUD |
| /api/pompstation/tanks/{id} | PUT/DELETE | Tank update/delete |
| /api/pompstation/tanks/{id}/readings | POST | Tank meting toevoegen |
| /api/pompstation/deliveries | GET/POST | Leveringen |
| /api/pompstation/pumps | GET/POST | Pompen beheer |
| /api/pompstation/products | GET/POST | Winkelproducten |
| /api/pompstation/products/{id} | PUT/DELETE | Product update/delete |
| /api/pompstation/sales | GET/POST | Verkopen/POS |
| /api/pompstation/shifts/start | POST | Dienst starten |
| /api/pompstation/shifts/{id}/close | POST | Dienst afsluiten |
| /api/pompstation/employees | GET/POST | Personeel |
| /api/pompstation/inspections | GET/POST | Veiligheidsinspecties |
| /api/pompstation/incidents | GET/POST | Incidenten |
| /api/pompstation/reports/daily | GET | Dagrapportage |
| /api/pompstation/prices | GET/POST | Brandstofprijzen |

**Frontend:** `/app/frontend/src/pages/pompstation/` - 10 pagina's
- DashboardPage.js - Overzicht met statistieken
- TanksPage.js - Tank beheer met visuele niveau indicators
- LeveringenPage.js - Leveringen registratie en overzicht
- PompenPage.js - Pomp configuratie
- POSPage.js - Kassa systeem met brandstof/winkel tabs
- WinkelPage.js - Winkelvoorraad beheer
- DienstenPage.js - Diensten start/stop met kas reconciliatie
- PersoneelPage.js - Personeelsbeheer
- VeiligheidPage.js - Inspecties en incidenten
- RapportagesPage.js - Dagelijkse rapportages

**Test Rapport:** `/app/test_reports/iteration_29.json` - 100% geslaagd (28/28 backend, frontend flow)

**Test Credentials:**
- Email: test@pompstation.sr
- Wachtwoord: test123
- Toegang: Pompstation module

---

### ONLINE BOOKING PORTAL (Beauty Spa) ✅ (NIEUW - 1 Feb 2026)
Publiek toegankelijk boekingsportaal voor spa klanten:

**Features:**
- [x] Stap-voor-stap boekingsproces (4 stappen)
- [x] Behandelingen per categorie (massage, facial, manicure, pedicure, body, pakketten)
- [x] Surinaamse specialiteiten gemarkeerd (Awara olie, Aloë Vera, Kokos)
- [x] Datum/tijd selectie met beschikbaarheid controle
- [x] Automatische klant aanmaak bij eerste boeking
- [x] Boeking bevestiging met booking ID
- [x] Annulering met telefoon verificatie

**Backend API's:** `/app/backend/routers/spa_booking.py` - 7 endpoints
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/spa-booking/spa/{id}/info | GET | Spa informatie ophalen |
| /api/spa-booking/spa/{id}/treatments | GET | Behandelingen per categorie |
| /api/spa-booking/spa/{id}/staff | GET | Beschikbare medewerkers |
| /api/spa-booking/spa/{id}/availability | GET | Tijdslots voor datum |
| /api/spa-booking/spa/{id}/book | POST | Nieuwe boeking aanmaken |
| /api/spa-booking/spa/{id}/booking/{bid} | GET | Boeking details |
| /api/spa-booking/spa/{id}/cancel/{bid} | POST | Boeking annuleren |

**Frontend:** `/app/frontend/src/pages/SpaBookingPage.js`
**Route:** `/booking/spa/:workspaceId`
**Demo:** `/booking/spa/demo-spa` (Tropical Wellness Spa)

**Test Rapport:** `/app/test_reports/iteration_28.json` - 100% geslaagd (20/20 backend, full frontend flow)

---

### BEAUTY SPA MODULE ✅ (NIEUW - 1 Feb 2026)
Complete Beauty Spa Management module met 12 submodules speciaal voor Suriname:

**Features:**
- [x] Dashboard met statistieken en komende afspraken
- [x] Klantenbeheer (CRM) - huidtype, allergieën, voorkeuren, lidmaatschappen, loyaliteitspunten
- [x] Afspraak- en roosterbeheer - online boeken, herinneringen, no-show registratie
- [x] Behandelingen & Services - catalogus, pakketten, Surinaamse specialiteiten (kruiden, aloë)
- [x] Product- en voorraadbeheer - batchnummers, vervaldatums, automatische waarschuwingen
- [x] Kassasysteem (POS) - Surinaamse betaalmethoden (Telesur Pay, Finabank QR, Hakrinbank QR)
- [x] Personeelsbeheer - commissies, specialisaties, salarissen
- [x] Rapportages & Analytics - omzet, bestsellers, prestaties
- [x] Walk-in wachtrij beheer
- [x] Vouchers & cadeaubonnen

**Backend:** `/app/backend/routers/beautyspa.py` - 31 API endpoints
**Frontend:** `/app/frontend/src/pages/beautyspa/` - 10 pagina's
**Test Rapport:** `/app/test_reports/iteration_27.json` - 100% geslaagd

---

### LOGIN & REGISTER UI REDESIGN ✅ (NIEUW - 1 Feb 2026)
Complete herontwerp van Login en Register pagina's met moderne styling:

**Features:**
- [x] Split-screen layout met gradient linker paneel
- [x] Modern formulier met glassmorphism accenten
- [x] Trust indicators (klant avatars, sterren, stats)
- [x] Demo link sectie met call-to-action
- [x] "3 Dagen Gratis" banner op register pagina
- [x] Vergeten wachtwoord modal
- [x] Consistente styling met rest van de site

**Bug Verificatie:**
- [x] **"Login faalt na uitloggen" bug - GEVERIFIEERD OPGELOST** (iteration_26)
- [x] Login -> Dashboard -> Logout -> Login flow werkt correct
- [x] Alle auth API endpoints getest en werkend

**Frontend Pagina's:**
- `/login` - Moderne login pagina met features sidebar
- `/register` - Moderne registratie pagina met gratis proefperiode info

**Test Rapport:** `/app/test_reports/iteration_26.json` - 100% geslaagd

---

### DEMO ACCOUNT SYSTEEM ✅ (NIEUW - 1 Feb 2026)
Complete demo omgeving voor potentiële klanten:

**Features:**
- [x] Demo gebruiker met onbeperkt abonnement (demo@facturatie.sr / demo2024)
- [x] Alle 3 modules geactiveerd (Vastgoed Beheer, HRM, Auto Dealer)
- [x] Automatische data cleanup (elk uur)
- [x] Handmatige cleanup trigger via admin endpoint
- [x] Modern donker design demo pagina met credentials
- [x] **Directe login** - één klik → automatisch inloggen → dashboard

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/admin/cleanup-demo-data | POST | Handmatige demo data cleanup (admin only) |

**Demo Credentials:**
- Email: demo@facturatie.sr
- Wachtwoord: demo2024
- Toegang: Alle modules (Vastgoed, HRM, Auto Dealer)

**Frontend Pagina's:**
- `/demo` - Modern demo pagina met credentials en directe login
- `/modules-overzicht` - Modern modules overzicht (geen prijzen, details → FAQ)

---

## What's Been Implemented (31 Jan 2026)

### NGINX/SSL AUTOMATISERING ✅ (NIEUW - 31 Jan 2026)
Complete automatisering voor custom domain configuratie:

**Features:**
- [x] Admin dashboard voor domain management (`/app/admin/domeinen`)
- [x] Automatische DNS verificatie
- [x] Nginx configuratie generatie en installatie
- [x] Let's Encrypt SSL certificaat provisioning
- [x] One-click volledige setup (DNS → Nginx → SSL)
- [x] Config preview voor transparantie
- [x] Real-time status monitoring (DNS, Nginx, SSL)
- [x] Verwijder functionaliteit

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/domains/status | GET | Overzicht alle custom domeinen |
| /api/domains/status/{workspace_id} | GET | Status specifiek domein |
| /api/domains/verify-dns/{workspace_id} | POST | DNS verificatie |
| /api/domains/provision/nginx/{workspace_id} | POST | Nginx installeren |
| /api/domains/provision/ssl/{workspace_id} | POST | SSL installeren |
| /api/domains/provision/full/{workspace_id} | POST | Volledige setup |
| /api/domains/provision/{workspace_id} | DELETE | Config verwijderen |

**Shell Scripts:**
- `scripts/configure_domain.sh` - Nginx configuratie script
- `scripts/remove_domain.sh` - Domain verwijderen script
- `scripts/renew_ssl.sh` - SSL renewal script

**Documentatie:**
- `docs/NGINX_SSL_HANDLEIDING.md` - Complete handleiding

### AUTO DEALER KLANT PORTAAL BUG FIX ✅ (31 Jan 2026)
- [x] Opgelost: `KeyError: 'id'` in `/api/user/addons` endpoint
- [x] Auto Dealer sectie nu zichtbaar in sidebar voor klanten met addon

### AUTO DEALER MODULE ✅ (30 Jan 2026)
Complete autohandelmodule voor Suriname met multi-valuta ondersteuning:

**Features:**
- [x] Dashboard met statistieken (voertuigen, klanten, omzet)
- [x] Multi-valuta ondersteuning (SRD, EUR, USD)
- [x] Voertuigen beheer (CRUD met alle velden)
- [x] Klanten beheer (particulier en zakelijk)
- [x] Verkoop registratie met automatische status updates
- [x] Valuta selector op alle pagina's
- [x] Sidebar navigatie met AUTO DEALER sectie

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/autodealer/stats | GET | Dashboard statistieken |
| /api/autodealer/vehicles | GET/POST | Voertuigen lijst/aanmaken |
| /api/autodealer/vehicles/{id} | GET/PUT/DELETE | Voertuig CRUD |
| /api/autodealer/customers | GET/POST | Klanten lijst/aanmaken |
| /api/autodealer/customers/{id} | GET/PUT/DELETE | Klant CRUD |
| /api/autodealer/sales | GET/POST | Verkopen lijst/aanmaken |
| /api/autodealer/sales/{id} | GET/PUT/DELETE | Verkoop CRUD |

**Database Collections:**
- `autodealer_vehicles` - Voertuigen met multi-valuta prijzen
- `autodealer_customers` - Klanten (particulier/zakelijk)
- `autodealer_sales` - Verkopen met betaalstatus

**Frontend Pagina's:**
- `/app/autodealer` - Dashboard
- `/app/autodealer/voertuigen` - Voertuigen beheer
- `/app/autodealer/klanten` - Klanten beheer
- `/app/autodealer/verkopen` - Verkopen beheer

**Test Resultaten:** 100% geslaagd (23/23 backend tests, alle UI flows)

### Workspace Backup & Restore ✅ (NIEUW - 30 Jan 2026)
- [x] Backup maken van alle workspace data
- [x] Backup lijst met details (grootte, records, datum)
- [x] Backup herstellen met automatische veiligheidsbackup
- [x] Backup downloaden als JSON
- [x] Backup verwijderen
- [x] UI in Workspace Instellingen pagina

**API Endpoints:**
- `GET /api/workspace/backups` - Lijst van backups
- `POST /api/workspace/backups` - Nieuwe backup maken
- `POST /api/workspace/backups/{id}/restore?confirm=true` - Herstellen
- `DELETE /api/workspace/backups/{id}` - Verwijderen
- `GET /api/workspace/backups/{id}/download` - Downloaden

**Gebackupte Collections (Volledige Lijst):**

| Module | Collections |
|--------|-------------|
| **Vastgoed Beheer** | tenants, apartments, payments, deposits, loans, kasgeld, maintenance, meter_readings, contracts, invoices |
| **HRM Module** | employees, salaries, hrm_employees, hrm_departments, hrm_attendance, hrm_leave_requests, hrm_payroll, hrm_settings |
| **Auto Dealer** | autodealer_vehicles, autodealer_customers, autodealer_sales |
| **Huurders Portaal** | tenant_accounts |
| **AI Chat** | ai_chat_history |
| **Workspace** | workspace_users, workspace_logs, user_addons |

### Klant Workspace Beheer ✅ (NIEUW - 30 Jan 2026)
Klanten kunnen nu hun eigen workspace volledig beheren:
- [x] Workspace naam en slug wijzigen
- [x] Domein type kiezen (subdomein of custom domain)
- [x] DNS A-record instructies bekijken voor custom domains
- [x] DNS verificatie uitvoeren
- [x] SSL status bekijken
- [x] Workspace aanmaken (als nog geen workspace)
- [x] Tabbed UI: Algemeen, Domein, Branding, Gebruikers, Backups

**API Endpoints:**
- `GET /api/workspace/settings` - Volledige workspace instellingen
- `PUT /api/workspace/settings` - Naam/slug wijzigen
- `PUT /api/workspace/domain` - Domein wijzigen
- `POST /api/workspace/domain/verify` - DNS verificatie
- `POST /api/workspace/create` - Nieuwe workspace aanmaken

### Volledige Multi-Tenant Systeem ✅

#### 1. Klant Workspaces (Admin)
- [x] Workspace management in superadmin dashboard
- [x] Statistieken: Totaal, Actief, In Afwachting
- [x] Workspace aanmaken/bewerken/verwijderen
- [x] Domein keuze: Subdomein of Custom domein
- [x] DNS verificatie & SSL tracking
- [x] Nginx config generator

#### 2. Frontend Branding Context ✅
- [x] Workspace branding automatisch geladen na login
- [x] CSS variabelen dynamisch ingesteld (--brand-primary, --brand-secondary)
- [x] Logo en portaal naam in sidebar
- [x] Branding opslaan per workspace

#### 3. Workspace Users Beheer ✅
- [x] "Workspace & Team" pagina onder Instellingen
- [x] Gebruikers uitnodigen met rollen (Admin, Lid, Viewer)
- [x] Gebruikers verwijderen
- [x] Branding bewerken met color picker

#### 4. Data Isolatie ✅
- [x] Automatische workspace aanmaak bij registratie
- [x] Data queries gefilterd op workspace_id
- [x] Legacy data support via user_id fallback

#### 5. Code Refactoring (Gestart)
- [x] `/app/backend/routers/deps.py` - Gedeelde dependencies
- [x] `/app/backend/routers/workspaces.py` - Workspace router
- [ ] Overige routers (hrm, cms, tenants) - TODO

**Domein Opties:**
- **Subdomein**: klantnaam.facturatie.sr (direct actief, auto-SSL)
- **Custom Domein**: portal.klantdomein.nl (DNS A-record naar server IP)

**API Endpoints:**
- `GET/POST /api/admin/workspaces` - Workspace CRUD
- `GET /api/workspace/current` - Huidige workspace + branding
- `PUT /api/workspace/branding` - Branding wijzigen
- `GET/POST /api/workspace/users` - Gebruikersbeheer

### Systeem Update Functie ✅ (30 Jan 2026)
Update productie server via webhook:

**Features:**
- [x] Update knop in superadmin dashboard
- [x] Webhook URL configuratie
- [x] HMAC-SHA256 signature voor veiligheid
- [x] Opties: Backend herstarten, Frontend rebuilden, Migraties
- [x] Deployment logs met status tracking
- [x] VPS setup instructies

### UI/UX Redesign ✅ (27 Jan 2026)
Complete moderne redesign van de applicatie:

**Features:**
- [x] Glassmorphism navigatie header
- [x] Moderne hero sectie met gradient tekst en trust indicators
- [x] Feature cards met backdrop-blur en hover animaties
- [x] Bento-grid style modules sectie
- [x] Gradient CTA sectie met decoratieve elementen
- [x] Multi-kolom footer met sociale media links
- [x] Moderne login pagina met split layout
- [x] Verbeterde tenant dashboard styling
- [x] Pill-shaped buttons met shadows
- [x] Custom fonts (Outfit, Plus Jakarta Sans)

### Huurders Portaal ✅ (27 Jan 2026)
Complete self-service portaal voor huurders:

**Features:**
- [x] Eigen login/registratie systeem voor huurders
- [x] Dashboard met appartement info, huur, saldo
- [x] Betalingsoverzicht en -geschiedenis
- [x] Zelf meterstanden (EBS/SWM) indienen
- [x] Automatische kostenberekening met Suriname tarieven
- [x] Openstaande facturen bekijken
- [x] Melding wanneer meterstand nog niet ingediend

**URL:** `/huurder` (aparte portaal van verhuurder)

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/tenant-portal/register | POST | Huurder registratie |
| /api/tenant-portal/login | POST | Huurder login |
| /api/tenant-portal/me | GET | Account info |
| /api/tenant-portal/dashboard | GET | Dashboard data |
| /api/tenant-portal/payments | GET | Betalingsgeschiedenis |
| /api/tenant-portal/invoices | GET | Facturen |
| /api/tenant-portal/meter-readings | GET/POST | Meterstanden |

### Meterstanden Module ✅ (27 Jan 2026)
- [x] Officiële Suriname EBS tarieven (0-150, 150-500, 500+ kWh)
- [x] Officiële Suriname SWM tarieven (0-10, 10-30, 30+ m³)
- [x] Automatische verbruiks- en kostenberekening
- [x] Betaling markeren met kasgeld aftrek
- [x] Periode navigatie en samenvatting

### Partner Logo's via CMS ✅
- [x] Partner logo's beheerbaar via CMS Instellingen

### CMS Image Upload ✅
- [x] Server-side image upload
- [x] Logo, Login/Registratie afbeeldingen

### HRM Module ✅
- [x] 9 aparte pagina's in sidebar
- [x] Dashboard, Personeel, Werving, Contracten, etc.

## Test Credentials

### Verhuurder
- **Superadmin**: admin@facturatie.sr / admin123
- **Klant met modules**: shyam@kewalbansing.net / test1234

### Huurder
- **Huurder portaal**: jan@example.com / huurder123

## EBS & SWM Tarieven Suriname 2024

### EBS (Elektriciteit)
| Verbruik | Tarief |
|----------|--------|
| 0 - 150 kWh | SRD 0.35 / kWh |
| 150 - 500 kWh | SRD 0.55 / kWh |
| 500+ kWh | SRD 0.85 / kWh |

### SWM (Water)
| Verbruik | Tarief |
|----------|--------|
| 0 - 10 m³ | SRD 2.50 / m³ |
| 10 - 30 m³ | SRD 4.50 / m³ |
| 30+ m³ | SRD 7.50 / m³ |

## File Structure
```
/app/frontend/src/
├── context/
│   └── TenantAuthContext.js    # NEW: Huurder auth context
├── pages/
│   ├── TenantLogin.js          # NEW: Huurder login/register
│   ├── TenantDashboard.js      # NEW: Huurder dashboard
│   ├── Meterstanden.js         # Verhuurder meterstanden
│   └── ...

/app/backend/
├── server.py                   # +tenant portal endpoints (~10000 lines)
└── routers/                    # Prepared for modular refactoring
```

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] Huurders portaal met eigen login
- [x] Huurders kunnen zelf meterstanden invoeren
- [x] Dashboard met appartement, betalingen, saldo
- [x] UI/UX redesign met moderne glassmorphism styling
- [x] **Auto Dealer Module** met multi-valuta (SRD, EUR, USD)
- [x] **Prijzen pagina redesign** - Moderne pricing cards met Starter/Professional/Enterprise (3 Feb 2026)
- [x] **Boekhouding module backend** - Gratis module voor alle klanten (3 Feb 2026)
- [x] **Frontend routing fix** - formatCurrency bug opgelost (3 Feb 2026)
- [x] **Domain Provisioning tab** - Toegevoegd aan Admin dashboard (3 Feb 2026)
- [x] **Superadmin sidebar standaard ingeklapt** - Automatisch dicht bij eerste bezoek (3 Feb 2026)
- [x] **Modern Dashboard redesign** - Nieuwe gradient hero, stat cards met animaties, verbeterde UX (3 Feb 2026)
- [x] **Boekhouding Module volledig werkend** - Gratis module voor alle klanten, sidebar altijd zichtbaar (3 Feb 2026)
- [x] **Module bestelling popup** - Klanten zonder modules krijgen popup om modules te bestellen en betalen (3 Feb 2026)
- [x] **Routing fix** - Gebruikers worden naar dashboard gestuurd i.p.v. /app/abonnement (3 Feb 2026)
- [x] **Admin Module Verzoeken tab** - Betalingsbevestiging UI voor module activatie (3 Feb 2026)
- [x] **Quick Start Wizard** - Interactieve wizard voor nieuwe gebruikers om snel aan de slag te gaan (3 Feb 2026)
- [x] **Email Systeem Compleet** - SMTP configuratie voor admin en klanten (3 Feb 2026)
  - Admin Email Settings tab met SMTP config, templates, verzendlog
  - Klant Email Settings in Instellingen pagina
  - Email templates voor welkom, wachtwoord reset, module verloop
  - Module Expiring Banner op dashboard
- [x] **Cron Job Automatisering** - Automatische email herinneringen (3 Feb 2026)
  - Dagelijkse check voor bijna verlopen modules (7, 3, 1 dagen)
  - Dagelijkse check voor verlopen modules + status update
  - Wekelijkse log cleanup
  - Admin UI voor monitoring en handmatige uitvoering

### P1 (High Priority)
- [x] **server.py refactoring** (>12000 lines) - Split into modular routers (IN PROGRESS)
  - ✅ tenant_portal.py (178 lines) - Huurders portaal
  - ✅ hrm.py (805 lines) - HRM module
  - ✅ autodealer_portal.py (483 lines) - Auto Dealer klantportaal
  - ✅ payment_methods.py (576 lines) - Betaalmethodes
  - ✅ admin.py (530 lines) - Admin/superadmin endpoints
  - **Totaal verplaatst: ~4.700 regels naar /app/backend/routers/**
- [x] **Login bug na uitloggen** - GEVERIFIEERD OPGELOST (iteration_26, 1 Feb 2026)
- [ ] **Herinneringen voor maandelijkse meteropname** (email notificaties)
- [x] **Workspace branding globaal toepassen** - CSS variabelen met HSL conversie (VOLTOOID)
- [x] **Betaalmethodes in facturen** - PDF facturen tonen nu bankgegevens en Mope info (VOLTOOID)
- [ ] **Mope betalingen valideren** - Test API token nodig van gebruiker

### Auto Dealer Klantportaal ✅ (NIEUW - 30 Jan 2026)
Complete klantportaal voor Auto Dealer module:

**Frontend Pagina's:**
| Pagina | URL | Beschrijving |
|--------|-----|--------------|
| Login/Registratie | `/klant-portaal/login` | Tabs voor inloggen en registreren |
| Dashboard | `/klant-portaal` | Statistieken, snelle acties, recente aankopen |
| Aankopen | `/klant-portaal/aankopen` | Overzicht met zoeken en filteren |

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/autodealer-portal/login` | POST | Klant login |
| `/api/autodealer-portal/register` | POST | Klant registratie |
| `/api/autodealer-portal/me` | GET/PUT | Profiel ophalen/bijwerken |
| `/api/autodealer-portal/dashboard` | GET | Dashboard met stats |
| `/api/autodealer-portal/purchases` | GET | Alle aankopen |
| `/api/autodealer-portal/support` | POST/GET | Ondersteuningsverzoeken |

**Features:**
- [x] Aparte authenticatie voor klanten (autodealer_customer_token)
- [x] Registratie met automatische koppeling aan klantrecord
- [x] Dashboard met totaal aankopen, voertuigen, besteed bedrag
- [x] Aankopen overzicht met zoeken en status filter
- [x] Ondersteuningsverzoeken indienen
- [x] Modern dark theme UI

### CloudPanel Deployment ✅ (NIEUW - 30 Jan 2026)
Volledige deployment documentatie en scripts gemaakt:

**Scripts:**
| Script | Beschrijving |
|--------|--------------|
| `CLOUDPANEL_INSTALL.sh` | Volledige eerste installatie (13KB) |
| `UPDATE.sh` | Update na git pull met opties (--backend-only, --frontend-only) |
| `BACKUP.sh` | Complete backup (DB + uploads + config) |
| `RESTORE.sh` | Backup terugzetten met validatie |
| `WEBHOOK_DEPLOY.sh` | Automatisch deployen via CI/CD webhook |

**Documentatie:**
| Document | Beschrijving |
|----------|--------------|
| `INSTALLATIE_HANDLEIDING.md` | Complete CloudPanel guide (14KB) |
| `VPS_SETUP_GUIDE.md` | Uitgebreide VPS setup met architectuur |
| `README.md` | Project overzicht en quick start |

**Features:**
- [x] Automatisch MongoDB 6.0 installatie
- [x] Node.js 18 + Yarn setup
- [x] Python venv met dependencies
- [x] Supervisor configuratie voor services
- [x] Nginx reverse proxy met SSL
- [x] Let's Encrypt SSL automatisering
- [x] Backup retentie (30 dagen default)
- [x] Health check na updates
- [x] Multi-tenant subdomain instructies
- [x] Performance optimalisatie tips
- [x] CI/CD webhook deployment

### P2 (Medium Priority)
- [ ] Huurder kan betalingen doen via portaal
- [ ] Email notificaties voor HRM

### Modules Landing Pagina's ✅ (NIEUW - 30 Jan 2026)
Nieuwe modules overzicht en detail pagina's voor marketing:

**Pagina's:**
| Pagina | URL | Beschrijving |
|--------|-----|--------------|
| Modules Overzicht | `/modules-overzicht` | Grid met alle modules en korte beschrijving |
| HRM Module | `/modules/hrm` | Detail pagina met alle HRM features |
| Vastgoed Beheer | `/modules/vastgoed-beheer` | Detail pagina met vastgoed features |
| Auto Dealer | `/modules/auto-dealer` | Detail pagina met auto dealer features |
| AI Chatbot | `/modules/ai-chatbot` | Detail pagina met chatbot features |
| Website CMS | `/modules/website-cms` | Detail pagina met CMS features |
| Multi-Tenant | `/modules/multi-tenant` | Detail pagina met workspace features |

**Features:**
- [x] Hero sectie met gradient achtergrond per module
- [x] Feature secties met afbeeldingen (Unsplash)
- [x] Bullet points met alle mogelijkheden
- [x] Prijs informatie per module
- [x] CTA knoppen naar registratie
- [x] Responsive design
- [x] Populair/Nieuw badges

### Betaalmethodes Configuratie ✅ (NIEUW - 31 Jan 2026)
Complete betaalmethodes beheer voor alle modules:

**Backend Router:** `/app/backend/routers/payment_methods.py`
**Frontend Pagina:** `/app/frontend/src/pages/BetaalmethodesPage.js`

**Ondersteunde Betaalmethodes:**
| Methode | Beschrijving | Status |
|---------|--------------|--------|
| Bankoverschrijving | Bank naam, rekeninghouder, nummer, IBAN | ✅ Standaard |
| Mope | Online payment gateway voor Suriname | ✅ Configureerbaar |
| Contant | Contante betaling op kantoor | ✅ Actief |
| Cheque | Betaling per cheque | ✅ Optioneel |

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/payment-methods/settings` | GET/PUT | Betaalinstellingen ophalen/opslaan |
| `/api/payment-methods/methods` | GET | Actieve betaalmethodes |
| `/api/payment-methods/mope/settings` | GET/PUT | Mope configuratie |
| `/api/payment-methods/invoices/{id}/pay` | POST | Factuur betalen |

**Features:**
- [x] Superadmin en workspace eigenaren kunnen configureren
- [x] Mope integratie met test en live tokens
- [x] Bankgegevens configuratie
- [x] Standaard betaalmethode selectie
- [x] Betaalinstructies per methode
- [x] Live/Test modus toggle voor Mope
- [x] Automatisch beschikbaar in alle modules (Vastgoed, HRM, Auto Dealer)

### P3 (Nice to Have)
- [ ] Meterstanden exporteren naar PDF
- [ ] Grafiek met verbruikshistorie
- [ ] Overige ERP modules (Inventory, CRM, Accounting)

## Recent Updates (3 Feb 2026)

### EMAIL INTEGRATIE VOOR FACTUREN ✅ (NIEUW - 3 Feb 2026)
Complete email functionaliteit voor het versturen van facturen naar klanten:

**Features:**
- [x] "Versturen" knop op verkoopfacturen pagina (Mail icoon voor verstuurd facturen)
- [x] SendInvoiceEmailDialog component met factuur en debiteur informatie
- [x] Email formulier met to_email, onderwerp, en bericht velden
- [x] Automatisch voorvullen van debiteur email adres
- [x] Status update van concept naar verstuurd met paper plane icoon
- [x] Welcome email voor nieuwe klanten via async email service
- [x] Password reset email via centralized email service

**Backend API's:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/boekhouding/verkoopfacturen/{id}/send-email | POST | Factuur per email versturen |
| /api/email/settings | GET/POST | Admin SMTP instellingen |
| /api/email/settings/user | GET/POST | Klant SMTP instellingen |
| /api/email/test | POST | SMTP verbinding testen |

**Frontend Componenten:**
- `/app/frontend/src/components/SendInvoiceEmailDialog.js` - Email dialog
- `/app/frontend/src/pages/boekhouding/VerkoopfacturenPage.js` - Mail icoon integratie

**Test Rapport:** `/app/test_reports/iteration_30.json` - 100% geslaagd

---

### ADMIN MODULE BETALINGSBEVESTIGING ✅ (NIEUW - 3 Feb 2026)
Complete admin functionaliteit voor het bevestigen van module betalingen:

**Features:**
- [x] Module Verzoeken tab in Admin dashboard
- [x] Lijst van pending betalingsverzoeken met klant info
- [x] Maanden selectie (1, 3, 6, 12 maanden)
- [x] Bevestigen knop om modules te activeren
- [x] Status tracking (pending, confirmed)

**Backend API's:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/admin/module-payment-requests | GET | Alle betalingsverzoeken ophalen |
| /api/admin/module-payment-requests/{id}/confirm | POST | Betaling bevestigen en modules activeren |

**Frontend:** `/app/frontend/src/pages/Admin.js` - Module Verzoeken tab (line 937-945, 1410-1530)

**Note:** Vereist `superadmin` rol (niet `admin`) om toegang te krijgen tot admin panel.

---

### ADMIN DASHBOARD TABS FIX ✅ (NIEUW - 3 Feb 2026)
De admin dashboard tabs zijn gefixed zodat alle tabs netjes op één horizontale lijn staan.

**Wijzigingen:**
- [x] TabsList met `inline-flex` en `min-w-max` voor horizontale layout
- [x] `overflow-x-auto` voor scrolling op kleinere schermen
- [x] `whitespace-nowrap` om text wrapping te voorkomen
- [x] Kortere labels (bijv. "Betaalmethodes" → "Betalen", "Domain Provisioning" → "Domains")
- [x] Compactere padding (`px-3 py-2` i.p.v. `px-4 py-2.5`)

---

### SIDEBAR MODULE VOLGORDE ✅ (NIEUW - 3 Feb 2026)
Klanten kunnen nu zelf de volgorde van modules in de sidebar aanpassen.

**Features:**
- [x] Nieuwe "Sidebar Volgorde" optie in Instellingen menu
- [x] Module lijst met positie nummers (1, 2, 3, etc.)
- [x] Pijltje omhoog/omlaag knoppen om modules te verplaatsen
- [x] Opslaan knop met success toast
- [x] Boekhouding module altijd getoond met "(Gratis)" label
- [x] Dynamische sidebar rendering op basis van opgeslagen volgorde

**Backend API's:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/user/sidebar-order | GET | Opgeslagen module volgorde ophalen |
| /api/user/sidebar-order | PUT | Module volgorde opslaan |

**Frontend Componenten:**
- `/app/frontend/src/components/SidebarOrderSettings.js` - Module volgorde component
- `/app/frontend/src/components/Layout.js` - Dynamische sidebar rendering met `getOrderedModules()`

**Database:**
- `user_sidebar_settings` collectie met `user_id` en `module_order` array

**Test Rapport:** `/app/test_reports/iteration_31.json` - 100% geslaagd

---

### MODULE INSTELLINGEN SYSTEEM ✅ (NIEUW - 3 Feb 2026)
Complete uitgebreide instellingen voor alle modules met schaalbare architectuur.

**Systeem Overzicht:**
- Elke module heeft eigen settings component in `/app/frontend/src/components/settings/`
- Settings worden dynamisch geladen gebaseerd op actieve modules
- Schaalbaar: nieuwe modules krijgen automatisch settings sectie

**Module Settings Geïmplementeerd:**

| Module | Component | Features |
|--------|-----------|----------|
| Vastgoed Beheer | VastgoedSettingsForm.js | Betalingsinstellingen, termijnen, boetes, factuur instellingen, herinneringen |
| HRM | HRMSettingsForm.js | Werktijden, verlof regels, contract & salaris, automatisering |
| Auto Dealer | AutoDealerSettingsForm.js | Verkoop, commissies, garanties, documenten, klant portaal |
| Beauty Spa | BeautySpaSettingsForm.js | Openingstijden, reserveringen, betalingen, herinneringen |
| Pompstation | PompstationSettingsForm.js | Brandstofprijzen, tank waarschuwingen, diensten, kassabon |
| Boekhouding | BoekhoudingSettingsForm.js | Valuta, BTW-tarieven, facturen, boekjaar |

**Backend API's:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/module-settings/{module_slug} | GET | Module instellingen ophalen |
| /api/module-settings/{module_slug} | PUT | Module instellingen opslaan |
| /api/module-settings | GET | Alle module instellingen ophalen |

**Database:**
- `module_settings` collectie met `user_id`, `module_slug`, en `settings` object

**Frontend Structuur:**
```
/app/frontend/src/components/settings/
├── index.js                    # Export bundel
├── VastgoedSettingsForm.js     # Vastgoed module settings
├── HRMSettingsForm.js          # HRM module settings
├── AutoDealerSettingsForm.js   # Auto Dealer module settings
├── BeautySpaSettingsForm.js    # Beauty Spa module settings
├── PompstationSettingsForm.js  # Pompstation module settings
└── BoekhoudingSettingsForm.js  # Boekhouding module settings
```

**Nieuwe Module Toevoegen:**
1. Maak `{ModuleName}SettingsForm.js` in `/components/settings/`
2. Voeg export toe aan `index.js`
3. Voeg config toe aan `moduleSettingsConfig` in `Instellingen.js`
4. Voeg Pydantic model toe in `server.py` voor default settings

## Architecture Notes
- Huurders hebben aparte `tenant_accounts` collectie (losgekoppeld van `users`)
- Tenant portaal routes starten met `/huurder`
- Verhuurder (landlord) ID wordt opgeslagen in tenant account voor data isolatie
