# Facturatie.SR - Product Requirements Document

## Original Problem Statement
Comprehensive accounting and business management platform for Suriname businesses. The platform includes multiple modules:
- Boekhouding (Accounting) - Core accounting functionality
- HRM/Personeel - Human Resource Management
- Schuldbeheer - Personal Debt Management
- Vastgoed Beheer - Real Estate Management
- Auto Dealer, Beauty Spa, Pompstation - Industry-specific modules
- **Kassa POS - Standalone Point of Sale system (NEW)**

## Current Session: March 8, 2026

### Completed This Session

#### Kassa POS System ✅ (P0 - NEW MAJOR FEATURE)
A complete standalone Point of Sale system for Suriname businesses with:

**Backend (`/app/backend/routers/kassa.py`):**
- Separate JWT authentication system
- Multi-tenant architecture (each business has own account)
- SaaS subscription plans (Basic SRD 49/mo, Pro SRD 99/mo, Enterprise SRD 199/mo)
- **Endpoints:**
  - Auth: `/api/kassa/auth/register`, `/api/kassa/auth/login`, `/api/kassa/auth/me`
  - Categories: CRUD operations
  - Products: CRUD + barcode lookup + stock tracking
  - Orders: Create sales, refunds, automatic stock updates
  - Customers: CRUD + loyalty points
  - Reports: Daily sales, inventory alerts
  - Settings: Business configuration
  - Superadmin: Manage all businesses and subscriptions

**Frontend Pages:**
- `/kassa/login` - Login/Register page with features overview
- `/kassa/pos` - Main POS interface (SumUp-style design)
- `/kassa/producten` - Product management
- `/kassa/rapporten` - Sales and inventory reports

**Features Implemented:**
- Product grid with category filtering
- Barcode scanning support
- Shopping cart with quantity controls
- Multiple payment methods (Cash, PIN, QR)
- Change calculation for cash payments
- Quick amount buttons
- Customer selection with loyalty points
- Automatic stock deduction on sale
- Receipt modal after sale
- Daily sales reports
- Low stock alerts
- BTW (8%) automatic calculation

**Files Created:**
- `backend/routers/kassa.py` - Complete backend API
- `frontend/src/context/KassaAuthContext.js` - Auth provider
- `frontend/src/lib/kassaApi.js` - API service
- `frontend/src/pages/kassa/KassaLogin.js` - Login page
- `frontend/src/pages/kassa/KassaPOS.js` - Main POS interface
- `frontend/src/pages/kassa/KassaProducten.js` - Product management
- `frontend/src/pages/kassa/KassaRapporten.js` - Reports

#### HRM / Personeel Loonlijst - Grootboek Koppeling ✅ (P0)
- **Loonbelasting (2360) en AOV Premie (2380) integratie met Grootboek**:
  - Bij uitbetaling van salarissen worden automatisch journaalposten aangemaakt
  - **Rekeningen gebruikt**:
    - 6000 Salarissen (Debet - bruto salaris)
    - 2360 Loonheffing te betalen (Credit - indien belasting > 0)
    - 2380 AOV-premie te betalen (Credit - 4% van bruto)
    - 1500 Bank (Credit - netto uitbetaling)
- **Suriname belastingtarieven 2024 geïmplementeerd**:
  - Belastingvrije som: SRD 9.000/maand
  - Schijf 1: 0-3.500 SRD = 8%
  - Schijf 2: 3.501-7.000 SRD = 18%
  - Schijf 3: 7.001-10.500 SRD = 28%
  - Schijf 4: boven 10.500 SRD = 38%
  - AOV Premie: 4%
- **Frontend HRMLoonlijst.js herschreven met**:
  - Tabs: Loonstroken | Belasting Overzicht | Grootboek Info
  - Statistieken: Bruto, Loonbelasting, AOV, Netto totalen
  - Details dropdown per loonstrook met belasting breakdown
  - "Geboekt" badge bij uitbetaalde salarissen
  - Belasting rapport met per-periode overzicht
  - Grootboek documentatie met voorbeeld journaalpost
- **Backend endpoints**:
  - `POST /api/hrm/payroll/generate-with-tax` - Genereer loonstroken met belasting
  - `PUT /api/hrm/payroll/{id}/pay-with-journal` - Uitbetalen + grootboek boeking
  - `GET /api/hrm/payroll/tax-report` - Belastingrapport
  - `POST /api/hrm/payroll/calculate-tax` - Belasting calculator
- **Bestanden gewijzigd**:
  - `backend/routers/hrm.py` - uuid import, fix process_payroll_payment, _id cleanup
  - `backend/services/grootboek_service.py` - salarissen/loonbelasting/aov_premie rekeningen
  - `frontend/src/pages/HRMLoonlijst.js` - Volledig herschreven met tabs en grootboek info

#### Bank & Kas Beheer Grootboek Koppeling ✅ (P1)
- **Automatische journaalposten bij banktransacties**:
  - Elke transactie wordt nu automatisch geboekt naar het grootboek
  - Ontvangsten: Bank (1500) Debet, Tegenrekening Credit
  - Uitgaven: Tegenrekening Debet, Bank (1500) Credit
- **Categorie selectie voor tegenrekening**:
  - Verkoop (4000)
  - Inkoop (4400)
  - Kosten (4600)
  - Salaris (4100)
  - Huur (4200)
  - Bankkosten (8510)
  - Rente Ontvangen (8000)
  - Rente Betaald (8500)
  - Privé (3100)
  - Overig (8999)
- **Grootboek Preview** in transactie dialog:
  - Toont exact welke rekeningen worden geboekt
  - Debet en credit bedragen zichtbaar
- **Bestanden gewijzigd**:
  - `backend/routers/boekhouding_legacy.py` - Grootboek boeking toegevoegd aan create_banktransactie
  - `frontend/src/pages/boekhouding/BankKasPage.js` - Categorie selectie en preview toegevoegd

#### Crediteuren Pagina Fix ✅ (P0 - Kritiek)
- **UI volledig werkend** en komt exact overeen met VerkoopPage/DebiteurenPage styling:
  - Alle 6 tabs zichtbaar: Overzicht, Verwerken, Openstaande Facturen, Betalingen Verwerken, Afletteren, Ouderdomsanalyse
  - 4 statistiek-cards met 3D shadow effect
  - Emerald groene actieve tab buttons
  - Status legenda met iconen
- **Boekjaar en Periode filters werkend**:
  - Dynamische jaren uit factuurdata
  - "Alle jaren" als standaard optie
  - Periode weergave past zich automatisch aan
- **Actieknoppen nu werkend**:
  - 👁️ Bekijken - Navigeert naar leverancier detail pagina
  - ✏️ Bewerken - Opent modal om leverancier te bewerken (inclusief bankgegevens)
  - 📄 Facturen - Opent modal met alle facturen van de leverancier (met betaal optie)
- **Betaling verwerken functionaliteit**:
  - Betaling modal met bedrag, datum, betaalmethode
  - **Grootboek preview** toont automatisch de boeking:
    - Crediteuren (2300): Debet (schuld verminderd)
    - Bank (1100): Credit (geld uitgegeven)
  - Bulk betaling van meerdere facturen
- **Ouderdomsanalyse**:
  - 4 categorieën: 0-30, 30-60, 60-90, 90+ dagen
  - Verlopen facturen tabel
- **Bestanden gewijzigd**:
  - `frontend/src/pages/boekhouding/CrediteruenPage.js` - Volledig herschreven met modals en functionaliteit
  - `frontend/src/lib/boekhoudingApi.js` - `addPayment` functie toegevoegd aan purchaseInvoicesAPI

#### Debiteuren Pagina Fix ✅ (P0 - Kritiek)
- **UI volledig werkend** en komt exact overeen met VerkoopPage styling:
  - Alle 6 tabs zichtbaar: Overzicht, Verwerken, Openstaande Facturen, Herinneringen Verzenden, Afletteren, Ouderdomsanalyse
  - 4 statistiek-cards met 3D shadow effect
  - Emerald groene actieve tab buttons
  - Status legenda met iconen
- **Actieknoppen nu werkend**:
  - 👁️ Bekijken - Navigeert naar debiteur detail pagina
  - ✏️ Bewerken - Opent modal om debiteur te bewerken (naam, email, telefoon, adres, BTW, betalingstermijn)
  - 📄 Facturen - Opent modal met alle facturen van de debiteur (met totaal openstaand bedrag)
- **Grootboek integratie werkt correct**:
  - Journaalposten worden automatisch aangemaakt bij verzonden facturen (VK dagboek)
  - Journaalposten worden automatisch aangemaakt bij betalingen (BK dagboek)
  - Rekening 1300 (Debiteuren), 1500 (Bank), 4000 (Omzet) correct gelinkt
- **Alle backend endpoints getest en werkend**:
  - `GET/POST /api/boekhouding/debiteuren` - CRUD operaties
  - `GET/POST /api/boekhouding/verkoopfacturen` - Factuur management
  - `PUT /api/boekhouding/verkoopfacturen/{id}/status` - Status wijzigen
  - `POST /api/boekhouding/verkoopfacturen/{id}/betaling` - Afletteren
  - `POST /api/boekhouding/rekeningen/herbereken-saldi` - Saldi herberekenen
- **Bestanden gewijzigd**:
  - `frontend/src/pages/boekhouding/DebiteruenPage.js` - Modals toegevoegd voor edit en facturen

#### Automatische Betalingsherinneringen ✅ (Reeds Geïmplementeerd)
- **Scheduler draait dagelijks om 08:00 SRT** (Surinaamse tijd)
- **Configureerbare instellingen** in Boekhouding > Instellingen > Herinneringen:
  - Auto-herinneringen aan/uit toggle
  - Dagen na vervaldatum voor eerste herinnering (standaard 7)
  - Dagen tussen herinneringen (standaard 7)
  - Maximum aantal herinneringen (3, inclusief aanmaning)
- **Escalatie systeem**:
  1. Eerste herinnering - Vriendelijke herinnering
  2. Tweede herinnering - Dringender verzoek
  3. Aanmaning - Laatste waarschuwing met incassomaatregelen
- **E-mail versturen** (vereist SMTP configuratie)
- **Handmatige trigger** via "Nu controleren" knop

## Previous Session: March 6, 2026

### Completed Previous Session

#### PWA Offline Functionaliteit Fix ✅ (P0 - Kritiek)
- **Service Worker v7** volledig herschreven met robuuste offline ondersteuning:
  - Correct cachen van `index.html` en `/` voor SPA navigatie
  - Aparte cache voor app shell (`facturatie-shell-v7`) en assets (`facturatie-v7`)
  - Network-first strategie voor navigatie, cache-first voor assets
  - Stale-while-revalidate voor statische bestanden
  - Verbeterde chunk caching via Performance API
- **OfflinePreloadManager Component** verbeterd:
  - Cache app shell automatisch via service worker
  - Download alle 112 React modules voor offline gebruik
  - Smaller batch size (3) met langere delays (150ms) om 429 rate limiting te voorkomen
  - Progress indicator tijdens download
  - "Offline beschikbaar" indicator na succesvolle download
- **ChunkErrorBoundary** component toegevoegd:
  - Vangt chunk loading errors op wanneer offline
  - Toont vriendelijke foutmelding met retry optie
  - Suggereert offline download als pagina niet beschikbaar is
- **Automatische index.html caching** bij pagina load
- **Bestanden gewijzigd**:
  - `frontend/public/service-worker.js` - Herschreven v7
  - `frontend/src/components/OfflinePreloadManager.js` - Verbeterde caching
  - `frontend/src/components/ChunkErrorBoundary.js` - NEW: Error boundary
  - `frontend/src/lib/preloadModules.js` - Verbeterde chunk detectie
  - `frontend/src/App.js` - SafeSuspense wrapper toegevoegd

**Belangrijke opmerking:** Volledige offline functionaliteit vereist dat de gebruiker eerst de "Downloaden voor offline" functie uitvoert terwijl online. Dit cachet alle 112+ modules. Zonder deze download zullen sommige pagina's niet beschikbaar zijn offline.

## Previous Session: March 4, 2026

### Completed This Session

#### Gratis Factuur Account Systeem ✅ (NEW - Latest)
- **Complete standalone auth system** separate from main Facturatie.sr:
  - User registration and login with JWT tokens
  - Secure password hashing with bcrypt
  - Token stored in `gratis_factuur_token` localStorage key
- **Customer Management (Klantenbeheer)**:
  - Full CRUD operations (add, edit, delete customers)
  - Customer statistics (total invoices, outstanding amount)
  - Search functionality
- **Invoice Management (Facturenbeheer)**:
  - Unlimited invoice storage
  - Edit invoices after saving
  - Status tracking: openstaand, deelbetaling, betaald
  - Filter by status
  - Link invoices to customers
- **Payment Tracking (Betalingen)**:
  - Register partial or full payments
  - Automatic status updates on invoices
  - Payment history per invoice
- **Dashboard with Statistics**:
  - Total revenue, outstanding amount
  - Overdue invoices count
  - Customer count
  - Status breakdown (openstaand/deelbetaling/betaald)
  - Recent invoices list
- **Email via SMTP**:
  - Configure personal SMTP server
  - Send invoices to customers
  - Send payment reminders
- **New Pages**:
  - `/gratis-factuur/login` - Login/Register
  - `/gratis-factuur/dashboard` - Dashboard
  - `/gratis-factuur/klanten` - Customer management
  - `/gratis-factuur/facturen` - Invoice list
  - `/gratis-factuur/instellingen` - Settings (company, bank, SMTP)
- **Backend**: `/app/backend/routers/gratis_factuur.py`
- **MongoDB Collections**: `gratis_factuur_users`, `gratis_factuur_klanten`, `gratis_factuur_facturen`, `gratis_factuur_betalingen`

#### Factuur PDF Preview Herontwerp ✅
- **Modern geometrisch design** exactly matching reference image:
  - Geometric triangles in top-right corner (navy + primary color)
  - Geometric shapes in bottom corners
  - Large centered "FACTUUR" title
  - Colored table header with alternating row colors
  - Signature section
  - Contact icons (Mail, Phone, MapPin)
- **5 color templates**: Modern (orange), Zakelijk (blue), Creatief (purple), Krachtig (red), Natuur (green)
- **Removed thumbnail previews** per user request

#### AI Assistent Enhancement ✅
- **Boekhouding module** fully integrated into AI assistant with:
  - BTW overzicht (BTW saldo bekijken)
  - Omzet overzicht (maand/jaar statistieken)
  - Openstaande facturen
  - Debiteuren/Crediteuren overzicht
  - Grootboek overzicht
  - Bank transacties
  - Boekhouding rapportage
- **Schuldbeheer module** added (schulden overzicht, aflossingen)
- **Suribet module** added (ticket verkopen, omzet)
- Fixed missing `/api/ai/assistant/chat` endpoint
- Improved error handling for LLM service errors

#### Gratis Factuur & Offerte Generator ✅
- New public page at `/gratis-factuur` and `/invoice-generator`
- Features:
  - Create professional invoices and quotes
  - 3 currencies: SRD, EUR, USD
  - BTW regions: Suriname (10%, 0%) and Netherlands (21%, 9%, 0%)
  - Logo upload functionality
  - Bank details section
  - Live preview with automatic calculations
  - PDF download (html2canvas + jsPDF)
  - Print functionality
  - Multiple line items support
  - **5 modern template designs with geometric shapes** (NEW)

### Previous Session Fixes (March 3, 2026)
- Fixed `Loader2 is not defined` JavaScript error
- Fixed layout flicker during page navigation
- Standardized loading states across 19+ pages

## Code Architecture

```
/app
├── backend/
│   └── server.py                      # AI assistant enhanced with boekhouding, schuldbeheer, suribet
├── frontend/
│   └── src/
│       ├── App.js                     # Added routes for invoice generator
│       ├── pages/
│       │   ├── PublicInvoiceGenerator.js  # NEW - Public invoice/quote generator
│       │   └── boekhouding/           # All pages with consistent loading states
│       └── components/
│           └── AIAssistant.js         # AI chat widget
```

## Key Features

### AI Assistant Capabilities
Now supports ALL modules:
- Vastgoed Beheer (property management)
- HRM (employee management)
- Auto Dealer (vehicle sales)
- Beauty & Spa (appointments)
- Pompstation (fuel sales)
- **Boekhouding** (accounting - NEW)
- **Schuldbeheer** (debt management - NEW)
- **Suribet** (lottery retailer - NEW)

### Public Tools
- `/gratis-factuur` - Free invoice/quote generator (no login required)

## Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Pending/Upcoming Tasks

### P0 - High Priority
- ✅ **PWA Offline Bug** - OPGELOST: Service worker v7 cachet nu correct index.html
- ✅ **Debiteuren Pagina** - OPGELOST: Volledig werkend met Grootboek integratie

### P1 - Next Priority
- **PWA Offline data sync** - Offline data aanmaken en automatisch synchroniseren bij verbinding (momenteel nog niet werkend voor alle modules)
- **Live Chat Systeem** - WebSocket implementatie voor real-time chat tussen klanten en medewerkers
- **Login redirect issue**: Users incorrectly redirected to `/app/hrm` after login instead of their first module
- PDF Payslip Generator for HRM module

### P2 - Future
- **Login pagina UI fixes** - Spacing, iconen, wachtwoord vergeten knop (verificatie nodig)
- **AI Assistant conversatie bug** - Context behoud fix (verificatie nodig)
- Responsive design voor "Boekhouding" module
- Verify production server AI assistant (EMERGENT_LLM_KEY configuration)
- Schuldbeheer module core functionality

### Future/Backlog
- Advanced AI Features (telephony, WhatsApp)
- Schuldbeheer Module expansion
- Admin Module Assignment UI
- "Meer functies" clarification for accounting pages

## Technical Notes

### Dependencies Added
- `html2canvas` - For capturing invoice preview as image
- `jsPDF` - For generating PDF documents

### API Endpoints
- `/api/ai/chat` - Main AI chat endpoint
- `/api/ai/assistant/chat` - Alias for AI assistant page
- `/api/public/chat` - Public chatbot for website visitors
