# Facturatie.sr - Product Requirements Document

## Originele Probleemstelling
De gebruiker wil een uitgebreide Boekhouding (Accounting) module bouwen die specifiek is afgestemd op de Surinaamse markt. De aanvraag omvat meer dan 15 sub-modules:
- Dashboard
- Grootboek (General Ledger)
- Debiteuren (Accounts Receivable)
- Crediteuren (Accounts Payable)
- Bank/Kas (Bank/Cash)
- BTW-module (VAT module)
- Rapportages (Financial Reports)
- En andere

## Productvereisten
- **Valuta:** Ondersteuning voor SRD, USD, en EUR
- **Wisselkoersen:** Handmatige invoer van wisselkoersen
- **Thema:** Clean/Modern (licht thema)
- **Structuur & UI:** Exact conform referentie-repository `https://github.com/shyamkewalbansing-ai/sr.git`

## User's Preferred Language
Dutch (Nederlands)

---

## Architectuur

### Backend
- **Framework:** FastAPI
- **Database:** MongoDB
- **Router:** `/app/backend/routers/boekhouding/__init__.py` (import van `boekhouding_legacy.py`)
- **Services:** `/app/backend/services/grootboek_service.py` (automatische journaalpost logica)

### Frontend
- **Framework:** React
- **UI Library:** TailwindCSS, Shadcn/UI
- **Pagina's:** `/app/frontend/src/pages/boekhouding/`
- **API Client:** `/app/frontend/src/lib/boekhoudingApi.js`

### Key Collections (MongoDB)
- `boekhouding_rekeningen` - Chart of accounts
- `boekhouding_debiteuren` - Customers
- `boekhouding_crediteuren` - Suppliers
- `boekhouding_verkoopfacturen` - Sales invoices
- `boekhouding_inkoopfacturen` - Purchase invoices
- `boekhouding_bankrekeningen` - Bank accounts
- `boekhouding_banktransacties` - Bank transactions
- `boekhouding_btw_codes` - VAT codes
- `boekhouding_wisselkoersen` - Exchange rates
- `boekhouding_journaalposten` - Journal entries
- `boekhouding_vaste_activa` - Fixed assets
- `boekhouding_projecten` - Projects
- `boekhouding_uren` - Time entries
- `boekhouding_artikelen` - Products/Services
- `boekhouding_magazijnen` - Warehouses
- `boekhouding_voorraadmutaties` - Stock movements
- `boekhouding_documenten` - Documents
- `boekhouding_herinneringen` - Payment reminders

---

## Wat is Voltooid (Maart 2026)

### ✅ Logo Upload Functionaliteit (P2 - Nieuw)
- Nieuwe logo upload sectie in Instellingen pagina
- Ondersteunt JPG, PNG, GIF, WEBP (max 5MB)
- Preview van huidige logo
- Verwijder knop
- Alternatief: URL invoer
- Logo wordt gebruikt op facturen en documenten

### ✅ Backend Refactoring Voorbereiding (P1 - Gedeeltelijk)
- `/app/backend/routers/boekhouding.py` verplaatst naar `boekhouding_legacy.py`
- Nieuwe modulaire structuur voorbereid in `/app/backend/routers/boekhouding/`
- `grootboek_service.py` geëxtraheerd naar `/app/backend/services/`
- Backward compatible via `__init__.py` import

### ✅ InkoopPage Bugfix
- Correcte API gebruikt (`purchaseInvoicesAPI` i.p.v. `invoicesAPI`)
- Nederlandse veldnamen support (factuurnummer, crediteur_naam, etc.)
- Extern factuurnummer veld toegevoegd

### ✅ Architecturale Integratie (Grootboek) - Vorige Sessie
- `_create_journal_entry` helper-functie voor automatische journaalposten
- `_find_rekening` functie voor robuuste rekening-lookup
- **Verkoopfacturen** worden automatisch geboekt bij statuswijziging naar `verzonden`
- **Betalingen** worden automatisch geboekt (Bank aan Debiteuren)
- **Inkoopfacturen** worden automatisch geboekt bij statuswijziging
- **Balans rapportage** haalt data direct uit grootboeksaldi
- **Winst & Verlies rapportage** haalt data uit grootboek

### ✅ Alle Eerdere Features
- MT940 Bankimport
- PDF Generatie (3 templates)
- Automatische Reconciliatie
- E-mail Verzending
- Excel Export
- Surinaamse Belastingrapportages
- CME.sr Wisselkoers Integratie
- Multi-tenant Ondersteuning
- Automatische Herinneringen Scheduler

---

## Backlog / Toekomstige Taken

### P1 - Hoog Prioriteit
- [ ] **Complete Backend Refactoring:** `boekhouding_legacy.py` verder opsplitsen in:
  - `dashboard.py` - Dashboard endpoints
  - `grootboek.py` - Rekeningen, BTW-codes, Journaalposten
  - `relaties.py` - Debiteuren, Crediteuren
  - `bank.py` - Bankrekeningen, Transacties, Import
  - `verkoop.py` - Verkoopfacturen, Offertes, Orders
  - `inkoop.py` - Inkoopfacturen, Orders
  - `rapportages.py` - Alle rapporten
  - `instellingen.py` - Instellingen, Bedrijven
- [ ] **Multi-tenancy Verbeteren:** Alle queries strikt filteren op `bedrijf_id`

### P2 - Middel Prioriteit
- [ ] **Frontend Refactoring:** `VerkoopPage.js` (836 regels) en `VoorraadPage.js` (908 regels) opsplitsen
- [ ] **InstellingenPage.js Refactoring:** (1207 regels) opsplitsen per tab

### P3 - Laag Prioriteit
- [ ] Herbruikbare UI componenten (MetricCard)
- [ ] MT940-import verbeteren
- [ ] Excel-exports uitbreiden
- [ ] API rate limiting en caching
- [ ] Backup en restore functionaliteit

---

## Test Gegevens

### Demo Gebruiker
- Email: demo@facturatie.sr
- Wachtwoord: demo2024

### Recent Test Rapport
- `/app/test_reports/iteration_54.json`
- Backend: 100% (21/21 tests passed)
- Frontend: 100% (6/6 pages verified)

---

## Belangrijke Bestanden

### Backend
- `/app/backend/routers/boekhouding/__init__.py` - Module entry point
- `/app/backend/routers/boekhouding_legacy.py` - Hoofdrouter (4771 regels)
- `/app/backend/services/grootboek_service.py` - Automatische boeking logica
- `/app/backend/server.py` - Server configuratie

### Frontend
- `/app/frontend/src/pages/boekhouding/*.js` - Alle pagina's
- `/app/frontend/src/lib/boekhoudingApi.js` - API client
- `/app/frontend/src/lib/utils.js` - Helpers

---

## API Endpoints Overzicht

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/boekhouding/dashboard` | GET | Dashboard KPIs |
| `/api/boekhouding/upload-image` | POST | Logo/afbeelding uploaden |
| `/api/boekhouding/instellingen` | GET/PUT | Bedrijfsinstellingen |
| `/api/boekhouding/rekeningen` | GET/POST | Grootboekrekeningen |
| `/api/boekhouding/journaalposten` | GET/POST | Journaalposten |
| `/api/boekhouding/debiteuren` | GET/POST | Klanten |
| `/api/boekhouding/crediteuren` | GET/POST | Leveranciers |
| `/api/boekhouding/bankrekeningen` | GET/POST | Bankrekeningen |
| `/api/boekhouding/banktransacties` | GET/POST | Transacties |
| `/api/boekhouding/btw-codes` | GET/POST | BTW codes |
| `/api/boekhouding/wisselkoersen` | GET/POST | Wisselkoersen |
| `/api/boekhouding/verkoopfacturen` | GET/POST | Verkoopfacturen |
| `/api/boekhouding/inkoopfacturen` | GET/POST | Inkoopfacturen |
| `/api/boekhouding/artikelen` | GET/POST | Producten/Diensten |
| `/api/boekhouding/rapportages/*` | GET | Diverse rapporten |
| `/api/boekhouding/bedrijven` | GET/POST | Multi-tenant bedrijven |

---

*Laatste update: 28 februari 2026 - Logo upload geïmplementeerd, InkoopPage bugfix*
