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
1. **Dashboard** (`/app/boekhouding`) - KPI overzicht + Interactieve Grafieken
2. **Grootboek** (`/app/boekhouding/grootboek`) - Rekeningschema & Journaalposten
3. **Debiteuren** (`/app/boekhouding/debiteuren`) - Klanten & Verkoopfacturen
4. **Crediteuren** (`/app/boekhouding/crediteuren`) - Leveranciers & Inkoopfacturen
5. **Bank/Kas** (`/app/boekhouding/bank-kas`) - Bankrekeningen & Transacties
6. **BTW** (`/app/boekhouding/btw`) - BTW codes & Aangiftes
7. **Verkoop** (`/app/boekhouding/verkoop`) - Offertes, Orders & Facturen
8. **Inkoop** (`/app/boekhouding/inkoop`) - Inkooporders & Facturen
9. **Wisselkoersen** (`/app/boekhouding/wisselkoersen`) - Koersen beheer
10. **Instellingen** (`/app/boekhouding/instellingen`) - 4 tabs: Bedrijf, E-mail SMTP, Factuur, Bedrijven

### ✅ Testing
- Backend API tests: 10/10 passed (100%) - iteration 48
- Frontend UI tests: 11/11 pages passed (100%) - iteration 49
- P0/P1 Feature tests: 7/7 backend + all frontend passed (100%) - iteration 50
- P2/P3 Feature tests: 11/11 backend + all frontend passed (100%) - iteration 51
- Test credentials: demo@facturatie.sr / demo2024

### ✅ Automatische Herinneringen Scheduler (Voltooid - December 2025)
- Nieuwe `HerinneringScheduler` in `/app/backend/services/herinnering_scheduler.py`
- Dagelijkse controle om 08:00 SRT (Suriname tijd) op vervallen facturen
- Escalatie: eerste herinnering → tweede herinnering → aanmaning
- Configureerbaar per gebruiker:
  - Dagen voor eerste herinnering (standaard: 7)
  - Dagen tussen herinneringen (standaard: 7)
  - Maximum aantal herinneringen (standaard: 3)
- Automatisch e-mail versturen als SMTP geconfigureerd is
- Frontend UI in Instellingen > Herinneringen tab
- API endpoints:
  - `GET /api/boekhouding/herinneringen/scheduler-status`
  - `POST /api/boekhouding/herinneringen/trigger-check`

### ✅ E-mail Services Samenvoegen (Voltooid - December 2025)
- Nieuwe `UnifiedEmailService` in `/app/backend/services/unified_email_service.py`
- Combineert functionaliteit van `email_service.py` en `boekhouding_email.py`
- **Oude services verwijderd:** `email_service.py` en `boekhouding_email.py` zijn nu vervangen
- Ondersteunt gebruiker-specifieke SMTP-instellingen uit `boekhouding_instellingen`
- Methoden: `send_email`, `generate_reminder_html`, `generate_invoice_html`
- System templates: welcome, password_reset, module_expiring, module_expired

### ✅ Vastgoed Dashboard 500-Error Fix (Voltooid - December 2025)
- Probleem: `KeyError: 'apartment_id'` door ontbrekende velden in payments
- Oplossing: `.get()` met fallbacks voor `apartment_id` en `tenant_id`
- Dashboard laadt nu correct met alle statistieken

### ✅ Factuur Template Ontwerpen (Voltooid - December 2025)
Drie template stijlen beschikbaar in PDF generator:
1. **Standaard:** Klassiek professioneel ontwerp, lichte kleuren
2. **Modern:** Strak en minimalistisch, donkere header met blauw accent
3. **Kleurrijk:** Levendige kleuren, paars met amber accent, alternerende rijen

### ✅ Product Foto Upload & Artikel Selectie (Voltooid - December 2025)
Twee nieuwe features voor de Voorraad en Verkoop modules:

**Product Foto Upload:**
- Nieuw `foto_url` veld in ArtikelCreate model
- Image upload endpoint: `POST /api/boekhouding/upload-image`
- Image serving endpoint: `GET /api/boekhouding/images/{filename}`
- Max 5MB, ondersteunt JPG, PNG, GIF, WEBP
- VoorraadPage toont nu een "Foto" kolom met productafbeeldingen
- Upload UI met preview en verwijder-knop in Nieuw Product dialog

**Artikel Selectie op Facturen:**
- VerkoopPage factuur dialog heeft nu een "Artikel" dropdown
- Dropdown toont producten met naam én verkoopprijs
- Automatische prijs-invulling bij selectie van een artikel
- Automatische omschrijving-invulling met productnaam
- Fallback tekstveld voor handmatige invoer ("Of typ handmatig...")

**Product Foto's op PDF Facturen:**
- PDF generator toont productafbeeldingen in de factuurregels tabel
- Dynamische kolombreedte: foto-kolom verschijnt alleen als er foto's zijn
- Afbeeldingsvalidatie: alleen geldige afbeeldingen (min 10x10 pixels) worden getoond
- Graceful fallback: lege cel bij ontbrekende of ongeldige afbeeldingen

Test resultaten: 100% backend (10/10 tests), 100% frontend (alle features verified)

### ✅ Finance OS UI Refactoring (Voltooid - December 2025)
Complete visuele herziening van alle boekhouding pagina's naar "Finance OS" stijl:
- **Getalnotatie:** Nederlandse notatie (nl-NL) - bv. `SRD 2.500,00`
- **Kaarten:** `bg-white border border-slate-100 shadow-sm`
- **Icoon containers:** `w-11 h-11 rounded-xl bg-{color}-50` met `text-{color}-500`
- **Headers:** `text-2xl font-semibold text-slate-900`
- **Subtitels:** `text-slate-500 mt-0.5`
- **Tabel headers:** `text-xs font-medium text-slate-500`

Aangepaste pagina's:
1. DashboardPage.js
2. DebiteruenPage.js
3. CrediteruenPage.js
4. GrootboekPage.js
5. BTWPage.js
6. BankKasPage.js
7. VoorraadPage.js
8. RapportagesPage.js
9. WisselkoersenPage.js
10. DocumentenPage.js
11. VerkoopPage.js
12. InkoopPage.js
13. VasteActivaPage.js
14. ProjectenPage.js
15. HerinneringenPage.js
16. AuditTrailPage.js
17. InstellingenPage.js

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
- [ ] Dashboard widgets drag & drop

### ✅ CME.sr Wisselkoers Integratie (Voltooid - December 2025)
- Automatische wisselkoers synchronisatie van Central Money Exchange (cme.sr)
- Inkoop én verkoop koersen apart opgeslagen
- Handmatige sync knop op Wisselkoersen pagina
- Automatische sync bij openen boekhouding module
- Preview dialog met actuele CME koersen
- Playwright-gebaseerde scraper voor JavaScript-gerenderde content
- **Automatische scheduler**: Dagelijkse sync om 09:00, 10:00 en 11:00 Surinaamse tijd (UTC-3)
- Status indicator op Wisselkoersen pagina toont actieve scheduler
- API endpoints:
  - `POST /api/boekhouding/wisselkoersen/sync-cme`
  - `GET /api/boekhouding/wisselkoersen/cme-preview`
  - `GET /api/boekhouding/wisselkoersen/scheduler-status`

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
| `/api/boekhouding/upload-image` | POST | Product afbeelding uploaden |
| `/api/boekhouding/images/{filename}` | GET | Geüploade afbeelding ophalen |
| `/api/boekhouding/vaste-activa` | GET/POST | Vaste activa |
| `/api/boekhouding/projecten` | GET/POST | Projecten |
| `/api/boekhouding/rapportages/*` | GET | Diverse rapporten |
| `/api/boekhouding/instellingen` | GET/PUT | Bedrijfsinstellingen |
| `/api/boekhouding/instellingen/test-email` | POST | Test SMTP configuratie |
| `/api/boekhouding/bedrijven` | GET/POST | Multi-tenant bedrijven |
| `/api/boekhouding/bedrijven/actief` | GET | Actief bedrijf |
| `/api/boekhouding/bedrijven/{id}/activeer` | PUT | Activeer bedrijf |
| `/api/boekhouding/dashboard/charts` | GET | Dashboard grafieken data |

---

*Laatste update: 28 februari 2026 - BTW, Bank/Kas en Grootboek pagina's gefixed*

---

## Recente Wijzigingen (Februari 2026)

### ✅ BTW Pagina Bugfix (Voltooid)
- Veldnaam-mismatch gefixed: `name` → `naam`, `active` → `actief`
- BTW-codes worden nu correct weergegeven met naam en status
- Alle 10 BTW-codes zijn nu zichtbaar en tonen de juiste informatie

### ✅ Bank/Kas Pagina Bugfix (Voltooid)
- Veldnaam-mismatch gefixed voor bankrekeningen: `name` → `naam`, `bank_name` → `bank`, `account_number` → `rekeningnummer`, `balance` → `huidig_saldo`, `currency` → `valuta`
- Veldnaam-mismatch gefixed voor transacties: `date` → `datum`, `description` → `omschrijving`, `reference` → `referentie`, `amount` → `bedrag`
- Totaal saldo's worden nu correct berekend en getoond
- Bankrekening tabel toont nu alle kolommen correct

### ✅ Betaling Toevoegen Formulier Redesign (Voltooid)
- Popup vervangen door professioneel slide-out panel
- Factuurgegevens card met factuurnummer, totaal, reeds betaald, openstaand
- Nette formulier indeling met 2-kolom grid
- Annuleren en Betaling Registreren knoppen

### ✅ Grootboek Externe Code Functionaliteit (Voltooid)
- Nieuwe "Externe Code" kolom in rekeningschema tabel
- Nieuwe "Acties" kolom met koppel-knop
- Dialog voor bewerken van externe codes
- Backend endpoints:
  - `POST /api/boekhouding/rekeningen/init-standaard` - Laad standaard Surinaams rekeningschema
  - `PUT /api/boekhouding/rekeningen/{id}/externe-code` - Koppel externe code
  - `GET /api/boekhouding/rekeningen/zoek-op-externe-code/{code}` - Zoek op externe code

### ✅ Standaard Surinaams Rekeningschema (Voltooid)
- 100+ rekeningen beschikbaar voor initialisatie
- Structuur volgens Surinaamse boekhoudpraktijk:
  - 1xxx: Activa (vaste activa, vlottende activa, liquide middelen)
  - 2xxx: Passiva (eigen vermogen, langlopende/kortlopende schulden)
  - 4xxx: Opbrengsten (omzet, overige opbrengsten)
  - 5xxx-8xxx: Kosten (personeels-, huisvestings-, overige kosten)
  - 9xxx: Tussenrekeningen
- Lokale Surinaamse banken: DSB, Republic, Hakrinbank, Finabank
- Surinaamse belasting rekeningen: AOV, loonheffing, inkomstenbelasting
