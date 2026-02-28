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
- **Point of Sale (POS)** - NIEUW
- En andere

## Productvereisten
- **Valuta:** Ondersteuning voor SRD, USD, en EUR
- **Wisselkoersen:** Handmatige invoer van wisselkoersen
- **Thema:** Clean/Modern (licht thema)
- **Structuur & UI:** Exact conform referentie-repository

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
- **`boekhouding_pos_verkopen`** - POS Sales (NIEUW)

---

## Wat is Voltooid (Maart 2026)

### ✅ Point of Sale (POS) Module - NIEUW
- **Fullscreen Interface:** Opent zonder sidebar, exact zoals de gebruiker vroeg
- **Productgrid:** Links, met categorieën, zoekfunctie en productafbeeldingen
- **Winkelwagen/Kassabon:** Rechts, met aantallen, prijzen en totalen
- **Afrekenen Flow:**
  - Subtotaal en BTW (10%) berekening
  - Betaaldialoog met "Contant" en "Pin/Kaart" opties
  - Succes dialoog na betaling
  - "Volgende klant" knop om te resetten
- **Home Knop:** Navigeert terug naar Boekhouding Dashboard
- **Sidebar Integratie:** POS link toegevoegd in boekhouding navigatie
- **Dashboard Knop:** "Point of Sale" quick access knop op dashboard
- **Automatische Boekingen:**
  - Voorraad wordt automatisch verminderd na verkoop
  - Journaalpost wordt automatisch aangemaakt
  - Voorraadmutatie wordt gelogd
- **POS Dagoverzicht API:** Aggregeert verkopen per betaalmethode

### ✅ Logo Upload Functionaliteit
- Nieuwe logo upload sectie in Instellingen pagina
- Ondersteunt JPG, PNG, GIF, WEBP (max 5MB)
- Preview van huidige logo
- Verwijder knop
- Alternatief: URL invoer
- Logo wordt gebruikt op facturen en documenten

### ✅ Backend Refactoring Voorbereiding
- `/app/backend/routers/boekhouding.py` verplaatst naar `boekhouding_legacy.py`
- Nieuwe modulaire structuur voorbereid in `/app/backend/routers/boekhouding/`
- `grootboek_service.py` geëxtraheerd naar `/app/backend/services/`
- Backward compatible via `__init__.py` import

### ✅ InkoopPage Bugfix
- Correcte API gebruikt (`purchaseInvoicesAPI` i.p.v. `invoicesAPI`)
- Nederlandse veldnamen support
- Extern factuurnummer veld toegevoegd

### ✅ Architecturale Integratie (Grootboek) - Vorige Sessie
- Automatische journaalposten voor verkoop, inkoop en betalingen
- Rapportages halen data uit grootboeksaldi

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

## POS Technische Details

### Backend Endpoints
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/boekhouding/pos/producten` | GET | Haal actieve producten op |
| `/api/boekhouding/pos/verkopen` | POST | Maak POS verkoop aan |
| `/api/boekhouding/pos/verkopen` | GET | Haal POS verkopen op |
| `/api/boekhouding/pos/dagoverzicht` | GET | Dag-overzicht per betaalmethode |

### Frontend Files
- `/app/frontend/src/pages/boekhouding/POSPage.js` - Hoofdcomponent
- `/app/frontend/src/App.js` - Route (buiten Layout voor fullscreen)
- `/app/frontend/src/components/Layout.js` - Sidebar link

### POS Verkoop Data Model
```javascript
{
  id: "uuid",
  user_id: "user_id",
  bonnummer: "POS-202602-00001",
  datum: "2026-02-28T03:00:00Z",
  betaalmethode: "contant" | "pin",
  regels: [
    {
      artikel_id: "uuid",
      artikel_naam: "Product naam",
      aantal: 2,
      prijs_per_stuk: 275.00,
      btw_percentage: 10,
      totaal: 550.00
    }
  ],
  subtotaal: 500.00,
  btw_bedrag: 50.00,
  totaal: 550.00,
  status: "betaald"
}
```

---

## Backlog / Toekomstige Taken

### P1 - Hoog Prioriteit
- [ ] **Complete Backend Refactoring:** `boekhouding_legacy.py` verder opsplitsen
- [ ] **Multi-tenancy Verbeteren:** Alle queries strikt filteren op `bedrijf_id`

### P2 - Middel Prioriteit
- [ ] **Frontend Refactoring:** `VerkoopPage.js` en `VoorraadPage.js` opsplitsen
- [ ] **POS Verbeteringen:**
  - [ ] Kassalade openen (hardware integratie)
  - [ ] Bonprinter ondersteuning
  - [ ] Barcode scanner
  - [ ] Korting toepassen
  - [ ] Klant koppelen aan verkoop

### P3 - Laag Prioriteit
- [ ] Herbruikbare UI componenten (MetricCard)
- [ ] MT940-import verbeteren
- [ ] Excel-exports uitbreiden
- [ ] API rate limiting en caching

---

## Test Gegevens

### Demo Gebruiker
- Email: demo@facturatie.sr
- Wachtwoord: demo2024

### Recent Test Rapport
- `/app/test_reports/iteration_55.json`
- Backend: 100% (8/8 tests passed)
- Frontend: 100% (11/11 features verified)

---

## Belangrijke Bestanden

### Backend
- `/app/backend/routers/boekhouding/__init__.py`
- `/app/backend/routers/boekhouding_legacy.py` (4900+ regels)
- `/app/backend/services/grootboek_service.py`
- `/app/backend/tests/test_pos_boekhouding.py` (NIEUW)

### Frontend
- `/app/frontend/src/pages/boekhouding/POSPage.js` (NIEUW)
- `/app/frontend/src/pages/boekhouding/DashboardPage.js`
- `/app/frontend/src/pages/boekhouding/InstellingenPage.js`
- `/app/frontend/src/lib/boekhoudingApi.js`

---

*Laatste update: 28 februari 2026 - Point of Sale module volledig geïmplementeerd*
