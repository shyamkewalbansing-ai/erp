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
- **Router:** `/app/backend/routers/boekhouding.py`

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

## Wat is Voltooid (December 2025)

### ✅ Backend - Volledig Gerefactored
- Complete `/api/boekhouding/*` router met 80+ endpoints
- Alle endpoints gebruiken Nederlandse veldnamen conform referentie
- CRUD operaties voor alle entiteiten
- Dashboard KPIs
- Rapportages (Balans, Winst/Verlies, BTW, Ouderdomsanalyse)
- Bank import (CSV, MT940)
- Documenten upload/download
- Herinneringen genereren

### ✅ MT940 Bankimport (P1 - Voltooid)
- Verbeterde MT940 parser met `mt940` library
- Fallback naar handmatige parsing voor non-standard formaten
- Parsing van: datum, bedrag, tegenrekening, tegenpartij, omschrijving
- Automatische saldo-update van bankrekening

### ✅ PDF Generatie (P1 - Voltooid)
- Professionele factuur PDFs met `reportlab` library
- Volledig bedrijfslogo-ondersteuning
- Gedetailleerde factuurregels met BTW berekening
- Betalingsgegevens sectie
- Herinnering brieven in PDF formaat

### ✅ Automatische Reconciliatie (P1 - Voltooid)
- Intelligente matching van banktransacties met facturen
- Confidence score gebaseerd op:
  - Bedrag matching (50 punten voor exact, 40 voor <1%, 20 voor <5%)
  - Factuurnummer in omschrijving (30 punten)
  - Klantnaam matching (20 punten)
- API endpoint: `/api/boekhouding/banktransacties/{id}/reconciliatie-suggesties`
- API endpoint: `/api/boekhouding/banktransacties/{id}/reconcilieer`

### ✅ E-mail Verzending (P2 - Voltooid)
- Email service module met HTML templates
- Betalingsherinneringen per email
- Professionele HTML templates voor eerste, tweede herinnering en aanmaning
- API endpoint: `/api/boekhouding/herinneringen/{id}/email`
- SMTP configureerbaar via environment variables

### ✅ Excel Export (P3 - Voltooid)
- Export grootboek naar Excel (rekeningschema + journaalposten)
- Export debiteuren naar Excel (klanten + facturen)
- Export crediteuren naar Excel (leveranciers + facturen)
- Export BTW aangifte naar Excel
- Export Winst & Verlies naar Excel
- Export Balans naar Excel
- Export Ouderdomsanalyse naar Excel
- API endpoints: `/api/boekhouding/export/*`

### ✅ Surinaamse Belastingrapportages (P3 - Voltooid)
- **BTW Aangifte Suriname**: Per maand, per tarief (25%, 10%, 0%), voorbelasting
- **Loonbelasting Overzicht**: Geschatte berekening volgens Surinaamse schijven
- **Inkomstenbelasting Overzicht**: Jaaroverzicht met belastingschijven
- API endpoints: `/api/boekhouding/rapportages/suriname/*`

### ✅ Frontend - Alle Pagina's Werkend
1. **Dashboard** (`/app/boekhouding`) - KPI overzicht
2. **Grootboek** (`/app/boekhouding/grootboek`) - Rekeningschema & Journaalposten
3. **Debiteuren** (`/app/boekhouding/debiteuren`) - Klanten & Verkoopfacturen
4. **Crediteuren** (`/app/boekhouding/crediteuren`) - Leveranciers & Inkoopfacturen
5. **Bank/Kas** (`/app/boekhouding/bank-kas`) - Bankrekeningen & Transacties
6. **BTW** (`/app/boekhouding/btw`) - BTW codes & Aangiftes
7. **Verkoop** (`/app/boekhouding/verkoop`) - Offertes, Orders & Facturen
8. **Inkoop** (`/app/boekhouding/inkoop`) - Inkooporders & Facturen
9. **Wisselkoersen** (`/app/boekhouding/wisselkoersen`) - Koersen beheer

### ✅ Testing
- Backend API tests: 14/14 passed (100%)
- Frontend UI tests: 9/9 pages working (100%)
- Test credentials: demo@facturatie.sr / demo2024

---

## Backlog / Toekomstige Taken

### Alle P0, P1, P2, P3 en P4 taken zijn voltooid! 🎉

### ✅ Laatste Implementaties (P4 - December 2025)

#### SMTP Instellingen (Voltooid)
- Gebruikers kunnen eigen SMTP-server configureren
- Velden: host, poort, gebruikersnaam, wachtwoord, afzender email/naam
- Test e-mail versturen functionaliteit
- Gmail configuratie hulp informatie

#### Dashboard Grafieken (Voltooid)
- Interactieve grafieken met Recharts library
- Omzet vs Kosten per Maand (BarChart)
- Cashflow Overzicht (AreaChart)
- Ouderdomsanalyse Debiteuren (PieChart/Donut)
- Top 5 Klanten sectie
- API endpoint: `/api/boekhouding/dashboard/charts`

#### Multi-Tenant Ondersteuning (Voltooid)
- Bedrijven beheer vanuit één account
- Nieuw bedrijf toevoegen dialoog
- Bedrijf activeren/deactiveren
- Data filtering per actief bedrijf
- Race condition fix met atomaire MongoDB upsert
- API endpoints: `/api/boekhouding/bedrijven`, `/api/boekhouding/bedrijven/actief`

#### Custom Factuur Templates (Voltooid)
- Template keuze (Standaard, Modern, Kleurrijk)
- Primaire en secundaire kleur picker
- Live preview van factuur styling
- Factuur voorwaarden tekstveld

### Mogelijke Toekomstige Verbeteringen (P5)
- [ ] API rate limiting en caching
- [ ] Backup en restore functionaliteit
- [ ] Meer gedetailleerde audit logging
- [ ] Integratie met Surinaamse banken (indien API beschikbaar)
- [ ] Automatische wisselkoers updates
- [ ] Dashboard widgets drag & drop

---

## Test Gegevens

### Demo Gebruiker
- Email: demo@facturatie.sr
- Wachtwoord: demo2024

### Seed Data
- 1 Debiteur: Test Klant N.V. (DEB00001)
- 1 Crediteur: Test Leverancier N.V. (CRE00001)
- Volledig rekeningschema (1000-2200 series)
- 10 BTW codes (EX, I0, I10, I25, IM, IV, V0, V10, V25, VV)
- 1 Wisselkoers: USD/SRD = 35,50

---

## Belangrijke Bestanden

### Backend
- `/app/backend/routers/boekhouding.py` - Hoofdrouter
- `/app/backend/server.py` - Server configuratie
- `/app/backend/tests/test_boekhouding_api.py` - API tests

### Frontend
- `/app/frontend/src/pages/boekhouding/*.js` - Alle pagina's
- `/app/frontend/src/lib/boekhoudingApi.js` - API client
- `/app/frontend/src/lib/utils.js` - Helpers (formatCurrency, etc.)
- `/app/frontend/src/App.js` - Routing

---

## API Endpoints Overzicht

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/boekhouding/dashboard` | GET | Dashboard KPIs |
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
| `/api/boekhouding/vaste-activa` | GET/POST | Vaste activa |
| `/api/boekhouding/projecten` | GET/POST | Projecten |
| `/api/boekhouding/rapportages/*` | GET | Diverse rapporten |
| `/api/boekhouding/instellingen` | GET/PUT | Bedrijfsinstellingen |

---

*Laatste update: 27 december 2025*
