# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
ERP SaaS systeem voor Surinaamse bedrijven met modulaire add-ons, CMS beheer en AI chatbot.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI, lazy loading
- **Database**: MongoDB (test_database)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Styling**: Tailwind CSS met glassmorphism effecten
- **Fonts**: Outfit (headings), Plus Jakarta Sans (body)
- **Primary Color**: #0caf60 (groen)
- **Multi-tenant**: Workspace-based isolatie per klant

## What's Been Implemented (1 Feb 2026)

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

## Architecture Notes
- Huurders hebben aparte `tenant_accounts` collectie (losgekoppeld van `users`)
- Tenant portaal routes starten met `/huurder`
- Verhuurder (landlord) ID wordt opgeslagen in tenant account voor data isolatie
