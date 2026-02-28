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
- **Point of Sale (POS)** - VOLLEDIG UITGEBREID
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
- **`boekhouding_pos_verkopen`** - POS Sales

---

## Wat is Voltooid (Maart 2026)

### ✅ Point of Sale (POS) - Volledig Uitgebreid

#### Wisselgeld Berekening
- **Bedrag invoeren**: Groot invoerveld voor ontvangen bedrag
- **Snelle bedragen**: $5, $10, $20, $50, $100, $200, $500 knoppen + "Exact" knop
- **Automatische berekening**: Wisselgeld wordt direct getoond in groene box
- **Validatie**: Knop pas actief als bedrag >= totaal

#### Korting Toepassen
- **Percentage korting**: Bijv. 10% van subtotaal
- **Vast bedrag korting**: Bijv. $25 korting
- **Preview**: Toont hoeveel korting wordt toegepast
- **Verwijderbaar**: Korting kan worden verwijderd met X knop

#### Klant Koppelen
- **Klant selecteren**: Dialoog met alle debiteuren
- **Klant tonen**: Geselecteerde klant wordt getoond in winkelwagen
- **Klant verwijderen**: Kan worden losgekoppeld
- **Opslaan bij verkoop**: Klant ID en naam worden opgeslagen

#### Bon Printen
- **PDF generatie**: Kassabon in 80mm formaat
- **Inhoud**: Bedrijfsnaam, adres, datum, items, BTW, korting, totaal, wisselgeld
- **Download**: Direct downloaden als PDF

#### Barcode Scanner
- **Automatisch scannen**: Luistert naar keyboard input (voor echte scanners)
- **Handmatig invoeren**: Dialoog voor barcode/artikelcode invoer
- **Zoeken**: Zoekt op code of barcode veld

#### Correcte Grootboek Koppeling
- **Contant**: Geld gaat naar Kas rekening (activa)
- **Pin/Kaart**: Geld gaat naar Bank rekening (activa)
- **Omzet**: Automatisch geboekt naar Omzet rekening
- **BTW**: Automatisch geboekt naar BTW te betalen rekening

#### Nieuwe API Endpoints
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/boekhouding/pos/verkopen/{id}/bon` | GET | PDF kassabon downloaden |
| `/api/boekhouding/pos/kassa-status` | GET | Kas saldo, dagomzet, transacties |
| `/api/boekhouding/pos/dagoverzicht` | GET | Overzicht per betaalmethode |

### ✅ Logo Upload Functionaliteit
- Logo upload sectie in Instellingen pagina
- Ondersteunt JPG, PNG, GIF, WEBP (max 5MB)

### ✅ Backend Refactoring Voorbereiding
- Modulaire structuur voorbereid
- `grootboek_service.py` geëxtraheerd

### ✅ Alle Eerdere Features
- MT940 Bankimport
- PDF Factuur Generatie (3 templates)
- Automatische Reconciliatie
- E-mail Verzending
- Excel Export
- Surinaamse Belastingrapportages
- CME.sr Wisselkoers Integratie
- Multi-tenant Ondersteuning
- Automatische Herinneringen Scheduler

---

## POS Technische Details

### POS Verkoop Data Model
```javascript
{
  id: "uuid",
  user_id: "user_id",
  bonnummer: "POS-202602-00001",
  datum: "2026-02-28T03:00:00Z",
  betaalmethode: "contant" | "pin",
  klant_id: "uuid" | null,
  klant_naam: "Klant Naam" | null,
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
  korting_type: "percentage" | "fixed" | null,
  korting_waarde: 10,
  korting_bedrag: 50.00,
  btw_bedrag: 45.00,
  totaal: 495.00,
  ontvangen_bedrag: 500.00,
  wisselgeld: 5.00,
  status: "betaald"
}
```

---

## Backlog / Toekomstige Taken

### P1 - Hoog Prioriteit
- [ ] **Complete Backend Refactoring:** `boekhouding_legacy.py` (5200+ regels) opsplitsen
- [ ] **Multi-tenancy Verbeteren:** Alle queries strikt filteren op `bedrijf_id`

### P2 - Middel Prioriteit
- [ ] **Frontend Refactoring:** `VerkoopPage.js` en `VoorraadPage.js` opsplitsen
- [ ] **POS Hardware Integratie:**
  - [ ] Kassalade openen (hardware signaal)
  - [ ] Thermische bonprinter ondersteuning
  - [ ] Betaalterminal integratie

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
- `/app/test_reports/iteration_56.json`
- Backend: 100% (14/14 tests passed)
- Frontend: 100% (16/16 features verified)

---

## Belangrijke Bestanden

### Backend
- `/app/backend/routers/boekhouding/__init__.py`
- `/app/backend/routers/boekhouding_legacy.py` (5200+ regels)
- `/app/backend/services/grootboek_service.py`
- `/app/backend/tests/test_pos_extended_features.py`

### Frontend
- `/app/frontend/src/pages/boekhouding/POSPage.js` (850+ regels)
- `/app/frontend/src/pages/boekhouding/DashboardPage.js`
- `/app/frontend/src/pages/boekhouding/InstellingenPage.js`
- `/app/frontend/src/lib/boekhoudingApi.js`

---

*Laatste update: 28 februari 2026 - POS volledig uitgebreid met wisselgeld, korting, klant, barcode en bon printen*
