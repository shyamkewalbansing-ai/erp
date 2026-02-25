# ERP Boekhouding - Product Requirements Document

## Oorspronkelijke Probleemstelling
Een uitgebreide ERP-applicatie met volledig geïntegreerde boekhoudkundige modules:
- **Boekhouding Core**: Grootboek, Debiteuren, Crediteuren, Bank/Kas, Vaste Activa, Kostenplaatsen
- **Inkoop Module**: Offertes, Orders, Goederenontvangst, Inkoopfacturen → Grootboek
- **Verkoop Module**: Offertes, Orders, Verkoopfacturen → Grootboek, Prijslijsten
- **Voorraad Module**: Artikelenbeheer, Magazijnen, Voorraadmutaties → Grootboek
- **Projecten Module**: Projectenbeheer, Urenregistratie → Grootboek
- **Rapportages**: Balans, Winst & Verlies, BTW Aangifte, etc.

## Technische Stack
- **Frontend**: React met TailwindCSS, Shadcn/UI componenten
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Taal**: Nederlands (Dutch)

## Voltooide Functies

### 24 februari 2026 - GROOTBOEK INTEGRATIE (VOLTOOID)
Volledige integratie van alle modules met het grootboek:

#### 1. Automatische Journaalposten
- ✅ **Verkoopfactuur → Grootboek** (bij status "verstuurd")
  - Debet: Debiteuren (1200)
  - Credit: Omzet Verkoop (8000) + BTW Af te dragen (2100)
  
- ✅ **Verkoopfactuur Betaling → Grootboek**
  - Debet: Bank/Kas (1100/1000)
  - Credit: Debiteuren (1200)

- ✅ **Inkoopfactuur → Grootboek**
  - Debet: Inkoopkosten/Voorraad (4000/1300) + BTW Voorbelasting (2200)
  - Credit: Crediteuren (2000)

- ✅ **Inkoopfactuur Betaling → Grootboek**
  - Debet: Crediteuren (2000)
  - Credit: Bank/Kas (1100/1000)

- ✅ **Voorraadmutaties → Grootboek**
  - Inkoop: Debet Voorraad, Credit Voorraadkosten
  - Verkoop: Debet Voorraadkosten, Credit Voorraad

- ✅ **Project Uren → Grootboek**
  - Debet: Projectkosten (4500)
  - Credit: Personeelskosten (4200)

- ✅ **Afschrijvingen → Grootboek**
  - Debet: Afschrijvingskosten (4300)
  - Credit: Cum. Afschrijving Vaste Activa (1410)

#### 2. Standaard Rekeningschema
Automatisch aangemaakt bij eerste gebruik:
- 1000: Kas
- 1100: Bank
- 1200: Debiteuren
- 1300: Voorraad
- 1400: Vaste Activa
- 2000: Crediteuren
- 2100: BTW Af te dragen
- 2200: BTW Voorbelasting
- 4000: Inkoopkosten
- 4300: Afschrijvingskosten
- 4500: Projectkosten
- 8000: Omzet Verkoop

#### 3. Rapportages Module
- ✅ **Balans** - Activa en Passiva overzicht
- ✅ **Winst & Verlies** - Opbrengsten en Kosten
- ✅ **Journaalposten** - Alle boekingen
- ✅ **Openstaande Debiteuren** - Per klant
- ✅ **Openstaande Crediteuren** - Per leverancier
- ✅ **Voorraadwaarde** - Per artikel
- ✅ **Projecten Overzicht** - Uren en kosten
- ✅ **BTW Aangifte** - Per periode

### 25 februari 2026 - Voorraad Integraties (VOLTOOID)
- ✅ **Verkooporders → Voorraadreservering**
  - Stock wordt gereserveerd bij bevestigen order
  - Stock wordt afgeschreven bij levering
  - Stock wordt vrijgegeven bij annuleren
  - Error bij onvoldoende voorraad
- ✅ **Goederenontvangst → Voorraadmutaties**
  - Automatische stock-in bij ontvangst
  - Grootboek boeking (Voorraad + / Voorraadkosten -)
- ✅ **Audit Trail**: Reserveringen en mutaties worden gelogd

### 25 februari 2026 - Bank Reconciliatie (VOLTOOID)
- ✅ **CSV Upload**: Parse banktransacties uit CSV bestanden
- ✅ **Multi-valuta**: Ondersteunt SRD, USD, EUR
- ✅ **Surinaamse banken**: DSB, Hakrinbank, Finabank, Republic Bank, SPSB, Volkscredietbank
- ✅ **Internationale banken**: IBAN formaat, US banks, etc.
- ✅ **Automatisch Matchen**: Suggesties op basis van bedrag en factuurnummer/klantnaam
- ✅ **Handmatig Matchen**: Transactie aan specifieke factuur koppelen
- ✅ **Status Beheer**: Niet gematcht, Suggestie, Gematcht, Genegeerd
- ✅ **Grootboek Integratie**: Matching registreert betaling en boekt naar grootboek
- ✅ Backend: `/app/backend/routers/bankreconciliatie.py`
- ✅ Frontend: `/app/boekhouding/bankreconciliatie`

### 25 februari 2026 - Dashboard Valuta Exposure Widget (VOLTOOID)
- ✅ **Valuta Exposure Warning Widget** op Boekhouding Dashboard
  - Automatisch laden van exposure data via `/api/rapportages/valuta/exposure`
  - Waarschuwingsdrempel: SRD 10.000
  - **Normale status** (blauw): "Uw openstaande valutaposities zijn binnen normale limieten"
  - **Waarschuwing status** (amber): "U heeft een significante valutapositie. Overweeg hedging maatregelen"
  - Toont per valuta: symbool, valutacode, netto positie (+/-)
  - Totaal SRD equivalent met kleurcodering (groen/rood)
  - "Details" knop navigeert naar `/app/boekhouding/valuta-rapportages`

### 25 februari 2026 - Inkoopfacturen PDF & Multi-Valuta Rapportages (VOLTOOID)
- ✅ **Inkoopfacturen PDF Export**
  - Endpoints: `GET /api/pdf/inkoopfactuur/{id}` en `GET /api/pdf/inkoopfactuur/{id}/preview`
  - Rode thema (vs groene voor verkoop) om onderscheid te maken
  - Toont SRD equivalent en kostenplaats informatie
  - Professionele PDF layout met leverancier details

- ✅ **Multi-Valuta Rapportages Module**
  - Nieuwe pagina: `/app/boekhouding/valuta-rapportages`
  - **Valuta Overzicht**: `GET /api/rapportages/valuta/overzicht?jaar=YYYY`
    - Verkoop/inkoop per valuta met SRD equivalenten
    - Totalen en saldo berekening
  - **Valuta Exposure**: `GET /api/rapportages/valuta/exposure`
    - Openstaande posities in vreemde valuta
    - Te ontvangen vs te betalen per valuta
    - Netto exposure in SRD
  - **Koers Historie**: `GET /api/rapportages/valuta/koershistorie?valuta=USD&dagen=30`
    - Historische koersen met trend analyse

- ✅ **Frontend pagina** met:
  - StatsGrid met totalen
  - Omzet per valuta tabel
  - Exposure cards met details
  - Huidige wisselkoersen overzicht

### 25 februari 2026 - Grootboek Integraties (VOLTOOID)
- ✅ **Automatische Afschrijvingen**
  - Endpoint: `POST /api/vaste-activa/maandelijkse-afschrijvingen?maand=YYYY-MM`
  - Boekt automatisch alle maandelijkse afschrijvingen naar grootboek
  - Rekening 4300 (Afschrijvingskosten) ↔ 1410 (Cum. Afschrijving)
  - Test: 12 activa succesvol afgeschreven in één batch

- ✅ **Kostenplaats Koppeling aan Inkoopfacturen**
  - Nieuw veld `kostenplaats_id` in inkoopfacturen
  - Automatische boeking naar kostenplaats bij factuur aanmaak
  - Budget tracking met voortgangspercentage
  - SRD equivalent voor multi-valuta facturen

- ✅ **Wisselkoers Integratie**
  - Automatische conversie naar SRD bij multi-valuta transacties
  - Fallback naar standaard koersen indien geen specifieke koers
  - Nieuwe grootboekrekeningen: 8900 (Koersverschillen), 4600 (Koersverliezen)
  - Helper functies: `get_wisselkoers()`, `converteer_naar_srd()`, `boek_koersverschil()`

- ✅ **Gewijzigde bestanden**:
  - `/app/backend/utils/grootboek_integration.py` - Wisselkoers & kostenplaats functies
  - `/app/backend/routers/boekhouding.py` - Kostenplaats_id in inkoopfacturen
  - `/app/backend/routers/vaste_activa.py` - Maandelijkse afschrijvingen batch endpoint

### 25 februari 2026 - UI Refactoring: ModulePageLayout Component (VOLTOOID)
- ✅ **Nieuwe herbruikbare component**: `/app/frontend/src/components/ModulePageLayout.js`
  - `ModulePageLayout`: Wrapper met hero header (emerald of dark variant)
  - `StatsGrid`: Flexibele stats kaarten grid (2-5 kolommen)
  - `StatCard`: Individuele statistiek kaart met icon en kleuren
  - `ContentSection`: Max-width content wrapper
  - `PageCard`: Standaard kaart voor pagina secties
- ✅ **Gerefactorde pagina's**:
  - `WisselkoersenPage.js` - Nu met herbruikbare componenten
  - `BankReconciliatiePage.js` - Nu met StatsGrid component
  - `ActivaPage.js` - Nu met hero header en StatsGrid
  - `KostenplaatsenPage.js` - Nu met hero header
- ✅ **Voordelen**:
  - Consistente UI styling over alle module pagina's
  - Minder code duplicatie (DRY principe)
  - Makkelijker onderhoud en uitbreidbaarheid
  - Automatische loading states

### 25 februari 2026 - P2 Modules: Vaste Activa, Kostenplaatsen, Wisselkoersen (VOLTOOID)
- ✅ **Vaste Activa Module**
  - Volledige CRUD voor vaste activa beheer
  - Categorieën: Gebouwen, Machines, Inventaris, Transportmiddelen, Computers, Software, Overig
  - Afschrijvingsmethoden: Lineair, Degressief, Annuïteit
  - Statistieken: Totaal Activa, Aanschafwaarde, Boekwaarde
  - Backend: `/app/backend/routers/vaste_activa.py`
  - Frontend: `/app/frontend/src/pages/boekhouding/ActivaPage.js`
  - Route: `/app/boekhouding/activa`

- ✅ **Kostenplaatsen Module**
  - Volledige CRUD voor kostenplaatsen/afdelingen
  - Types: Afdeling, Project, Product, etc.
  - Budget beheer met voortgangsbalken
  - Verantwoordelijke toewijzen
  - Backend: `/app/backend/routers/kostenplaatsen.py`
  - Frontend: `/app/frontend/src/pages/boekhouding/KostenplaatsenPage.js`
  - Route: `/app/boekhouding/kostenplaatsen`

- ✅ **Wisselkoersen Module**
  - Volledige CRUD voor wisselkoersen
  - Ondersteunde valuta: USD, EUR, GYD, BRL
  - Basis valuta: SRD (Surinaamse Dollar)
  - **Valuta Converter**: Realtime conversie tussen valuta
  - Bron tracking (bijv. CBvS)
  - Backend: `/app/backend/routers/wisselkoersen.py`
  - Frontend: `/app/frontend/src/pages/boekhouding/WisselkoersenPage.js`
  - Route: `/app/boekhouding/wisselkoersen`

- ✅ **Test resultaten** (25 feb 2026)
  - Backend: 38/38 tests geslaagd (100%)
  - Frontend: Alle navigatie en CRUD operaties werken correct

### 24 februari 2026 - Volledige CRUD Functionaliteit (VOLTOOID)
- ✅ **Verkoop Orders**: Create, Update (concept), Delete (concept/geannuleerd)
- ✅ **Verkoop Offertes**: Create, Update (concept), Delete (concept/verlopen/afgewezen)
- ✅ **Inkoop Orders**: Create, Update (concept), Delete (concept/geannuleerd)
- ✅ **Inkoop Offertes**: Create, Update (concept/verzonden), Delete (concept/verlopen/afgewezen)
- ✅ Frontend Edit/Delete knoppen voor juiste statussen
- ✅ Dialog toont "Bewerken" titel bij bewerken
- ✅ Bevestigingsdialoog bij verwijderen

### 24 februari 2026 - Email met PDF Bijlage (VOLTOOID)
- ✅ Email versturen met factuur PDF als bijlage
- ✅ Gebruikt MIMEApplication voor PDF attachment
- ✅ Frontend SendInvoiceEmailDialog component
- ✅ Endpoint: `POST /api/boekhouding/verkoopfacturen/{id}/send-email`
- ✅ Vereist SMTP configuratie in Instellingen → Email

### 24 februari 2026 - PDF Factuur Download (VOLTOOID)
- ✅ Professionele PDF generatie met ReportLab
- ✅ Download endpoint: `/api/pdf/verkoopfactuur/{id}`
- ✅ Preview endpoint: `/api/pdf/verkoopfactuur/{id}/preview`

### 23 februari 2026 - UI/UX Overhaul
- ✅ Alle modulepagina's met emerald-green design
- ✅ Responsive layouts
- ✅ Nederlandse taal

## Code Architectuur

```
/app/backend/
├── routers/
│   ├── boekhouding.py    # Met grootboek integratie
│   ├── verkoop.py        # Verkoop → Debiteuren → Grootboek
│   ├── inkoop.py         # Inkoop → Crediteuren → Grootboek
│   ├── voorraad.py       # Met grootboek integratie
│   ├── projecten.py      # Met grootboek integratie
│   ├── activa.py         # Met afschrijvingen → Grootboek
│   ├── rapportages.py    # Nieuwe rapportages module
│   └── pdf.py            # PDF generatie
├── utils/
│   └── grootboek_integration.py  # Centrale boeking utilities
└── server.py
```

## Database Collecties

### Grootboek
| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_rekeningen` | Grootboekrekeningen met saldi |
| `boekhouding_journaalposten` | Alle journaalposten met regels |

### Facturen & Betalingen
| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_verkoopfacturen` | Verkoopfacturen |
| `boekhouding_inkoopfacturen` | Inkoopfacturen |
| `boekhouding_transacties` | Betalingen |

### Entiteiten
| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_debiteuren` | Klanten (single source of truth) |
| `boekhouding_crediteuren` | Leveranciers |
| `voorraad_artikelen` | Producten/diensten |
| `projecten` | Projecten |

## API Endpoints

### Rapportages (Nieuw)
- `GET /api/rapportages/grootboek/balans` - Balans overzicht
- `GET /api/rapportages/grootboek/resultaat` - Winst & Verlies
- `GET /api/rapportages/grootboek/journaalposten` - Journaalposten
- `GET /api/rapportages/debiteuren/openstaand` - Openstaande debiteuren
- `GET /api/rapportages/crediteuren/openstaand` - Openstaande crediteuren
- `GET /api/rapportages/voorraad/waarde` - Voorraadwaarde
- `GET /api/rapportages/projecten/overzicht` - Projecten overzicht
- `GET /api/rapportages/btw/aangifte` - BTW aangifte

### Bank Reconciliatie (Nieuw)
- `POST /api/bank/transacties/upload` - Upload CSV met banktransacties
- `GET /api/bank/transacties` - Haal transacties op met stats
- `GET /api/bank/transacties/{id}` - Haal specifieke transactie op
- `POST /api/bank/transacties/{id}/match` - Match transactie aan factuur
- `POST /api/bank/transacties/{id}/ignore` - Negeer transactie
- `DELETE /api/bank/transacties/{id}` - Verwijder transactie
- `POST /api/bank/transacties/auto-match` - Automatisch matchen
- `GET /api/bank/stats` - Reconciliatie statistieken

### CRUD Endpoints (Nieuw)
- `PUT /api/verkoop/orders/{id}` - Update verkooporder (alleen concept)
- `PUT /api/verkoop/offertes/{id}` - Update verkoopofferte (alleen concept)
- `PUT /api/inkoop/orders/{id}` - Update inkooporder (alleen concept)
- `PUT /api/inkoop/offertes/{id}` - Update inkoopofferte (concept/verzonden)
- `DELETE` endpoints voor alle bovenstaande entiteiten

### PDF
- `GET /api/pdf/verkoopfactuur/{id}` - Download PDF
- `GET /api/pdf/verkoopfactuur/{id}/preview` - Preview PDF

### Email
- `POST /api/boekhouding/verkoopfacturen/{id}/send-email` - Verstuur factuur per email met PDF bijlage

### Vaste Activa (Nieuw)
- `GET /api/vaste-activa/` - Lijst alle activa
- `GET /api/vaste-activa/{id}` - Haal specifiek activum op
- `GET /api/vaste-activa/stats` - Statistieken
- `POST /api/vaste-activa/` - Nieuw activum aanmaken
- `PUT /api/vaste-activa/{id}` - Activum bijwerken
- `DELETE /api/vaste-activa/{id}` - Activum verwijderen
- `POST /api/vaste-activa/{id}/afschrijving` - Afschrijving boeken
- `GET /api/vaste-activa/{id}/afschrijvingen` - Afschrijvingshistorie
- `POST /api/vaste-activa/maandelijkse-afschrijvingen` - Batch afschrijvingen

### Kostenplaatsen (Nieuw)
- `GET /api/kostenplaatsen/` - Lijst alle kostenplaatsen
- `GET /api/kostenplaatsen/{id}` - Haal specifieke kostenplaats op
- `GET /api/kostenplaatsen/stats` - Statistieken
- `GET /api/kostenplaatsen/rapportage/overzicht` - Rapportage overzicht
- `POST /api/kostenplaatsen/` - Nieuwe kostenplaats aanmaken
- `PUT /api/kostenplaatsen/{id}` - Kostenplaats bijwerken
- `DELETE /api/kostenplaatsen/{id}` - Kostenplaats verwijderen
- `POST /api/kostenplaatsen/{id}/boeking` - Kosten boeken
- `GET /api/kostenplaatsen/{id}/boekingen` - Boekingshistorie

### Wisselkoersen (Nieuw)
- `GET /api/wisselkoersen/` - Lijst alle wisselkoersen
- `GET /api/wisselkoersen/actueel/{valuta}` - Actuele koers voor valuta
- `GET /api/wisselkoersen/historie/{valuta}` - Historische koersen
- `GET /api/wisselkoersen/standaard-koersen` - Standaard koersen
- `POST /api/wisselkoersen/` - Nieuwe wisselkoers aanmaken
- `PUT /api/wisselkoersen/{id}` - Wisselkoers bijwerken
- `DELETE /api/wisselkoersen/{id}` - Wisselkoers verwijderen
- `POST /api/wisselkoersen/converteer` - Valuta converter
- `POST /api/wisselkoersen/bulk-import` - Bulk import koersen

## Prioriteit Backlog

### P0 - Kritiek (VOLTOOID)
- [x] UI/UX Overhaul
- [x] Factuur generatie vanuit Verkooporders
- [x] PDF Factuur Download
- [x] **Grootboek Integratie - VOLLEDIG GEÏMPLEMENTEERD**
- [x] **Rapportages Module - VOLLEDIG GEÏMPLEMENTEERD**
- [x] **Email versturen met PDF bijlage - VOLTOOID**
- [x] **Volledige CRUD voor Orders & Offertes - VOLTOOID**
- [x] **Bank Reconciliatie - VOLTOOID**
- [x] **Goederenontvangst → Voorraadmutaties - VOLTOOID**
- [x] **Verkooporders → Voorraadreservering - VOLTOOID**

### P1 - Hoog (Alle P1 taken voltooid!)
- [x] Goederenontvangst → Voorraadmutaties automatisch
- [x] Verkooporders → Voorraadreservering
- [x] UI Refactoring: `ModulePageLayout` component (herbruikbare hero headers en stats grids) - VOLTOOID

### P2 - Medium
- [x] Vaste Activa Module met CRUD - VOLTOOID
- [x] Kostenplaatsen Module met CRUD - VOLTOOID  
- [x] Wisselkoersen Module met Converter - VOLTOOID
- [x] Automatische periodieke afschrijvingen (Vaste Activa → Grootboek) - VOLTOOID
- [x] Kostenplaats koppelingen aan inkoopfacturen - VOLTOOID
- [x] Wisselkoers integratie in financiële transacties - VOLTOOID
- [x] Inkoopfacturen PDF export - VOLTOOID
- [x] Multi-valuta rapportages - VOLTOOID
- [ ] HRM integratie met kostenboekingen
- [ ] Bulk import/export functies

### P3 - Laag
- [ ] Dashboard widgets
- [ ] Geautomatiseerde herinneringen
- [ ] Audit trail

## Test Credentials
- **Email**: test@demo.com
- **Password**: demo123
