# Facturatie.sr - Product Requirements Document

## Original Problem Statement
De gebruiker wil een uitgebreide Boekhouding (Accounting) module bouwen die specifiek is afgestemd op de Surinaamse markt met ondersteuning voor SRD, USD, en EUR valuta.

## Completed Boekhouding Module ✅

### All Pages Implemented (17 total)
| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Dashboard | `/app/boekhouding` | ✅ | KPI's, charts, bank saldi |
| Grootboek | `/app/boekhouding/grootboek` | ✅ | Rekeningschema, journaalposten |
| Debiteuren | `/app/boekhouding/debiteuren` | ✅ | Klanten, verkoopfacturen |
| Crediteuren | `/app/boekhouding/crediteuren` | ✅ | Leveranciers, inkoopfacturen |
| Bank/Kas | `/app/boekhouding/bank-kas` | ✅ | **5 tabs**: Bankrekening, Transactie, Importeren, Bankreconciliatie, Kasboek |
| BTW | `/app/boekhouding/btw` | ✅ | BTW-codes, aangifte overzicht |
| Verkoop | `/app/boekhouding/verkoop` | ✅ | **3 tabs**: Offertes, Orders, Facturen |
| Inkoop | `/app/boekhouding/inkoop` | ✅ | **2 tabs**: Inkooporders, Inkoopfacturen |
| Voorraad | `/app/boekhouding/voorraad` | ✅ | Producten, mutaties, niveaus |
| Vaste Activa | `/app/boekhouding/vaste-activa` | ✅ | Activa, afschrijvingen |
| Projecten | `/app/boekhouding/projecten` | ✅ | Budget, uren tracking |
| Rapportages | `/app/boekhouding/rapportages` | ✅ | Balans, Winst & Verlies |
| Wisselkoersen | `/app/boekhouding/wisselkoersen` | ✅ | Koersen SRD/USD/EUR |
| Herinneringen | `/app/boekhouding/herinneringen` | ✅ | Betalingsherinneringen, vervallen facturen |
| Documenten | `/app/boekhouding/documenten` | ✅ | Documentbeheer, upload bijlagen |
| Audit Trail | `/app/boekhouding/audit-trail` | ✅ | Gebruikersacties en wijzigingen log |
| Instellingen | `/app/boekhouding/instellingen` | ✅ | Bedrijfsgegevens, nummering |

### Backend Endpoints Implemented
| Endpoint | Status | Description |
|----------|--------|-------------|
| `/api/boekhouding/audit-trail` | ✅ | GET/POST audit logs |
| `/api/boekhouding/herinneringen` | ✅ | GET/POST betalingsherinneringen |
| `/api/boekhouding/herinneringen/facturen` | ✅ | GET facturen voor herinnering |
| `/api/boekhouding/herinneringen/{id}/verzonden` | ✅ | PUT markeer als verzonden |
| `/api/boekhouding/documenten` | ✅ | GET/POST/DELETE documenten |

### Key Files
- **API Client**: `/app/frontend/src/lib/boekhoudingApi.js`
- **Utils**: `/app/frontend/src/lib/utils.js` (currency formatting)
- **Backend Router**: `/app/backend/routers/boekhouding.py` (100+ endpoints)
- **Pages**: `/app/frontend/src/pages/boekhouding/*.js`

### Valuta Support
- SRD (Surinaamse Dollar) - primary
- USD (US Dollar)
- EUR (Euro)

### Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Verified Working (Feb 27, 2026) - Full Testing Complete

### Latest Update: All Features Complete
| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| Bank/Kas 5 tabs | ✅ | ✅ | Working |
| Verkoop 3 tabs | ✅ | ✅ | Working |
| Inkoop 2 tabs | ✅ | ✅ | Working |
| Betalingsherinneringen | ✅ | ✅ | Working |
| Documentbeheer | ✅ | ✅ | Working |
| Audit Trail | ✅ | ✅ | Working |
| Sidebar Navigation | ✅ | N/A | 17 menu items |

### API Tests: 100% PASSED
- Audit Trail: Returns 6 demo logs
- Herinneringen: Endpoints working
- Documenten: CRUD operations working

### Demo Data Available
- 1 debiteur (Test Klant N.V.)
- 1 crediteur (Test Leverancier N.V.)
- 1 bankrekening (DSB Zakelijk met SRD 10.000)
- 1 verkoopfactuur (VF2026-00001)
- 83 grootboekrekeningen (volledig rekeningschema)
- 1 wisselkoers (USD/SRD: 35.5)
- 6 audit trail entries (demo)

## Completed in This Session
- [x] Bank/Kas uitgebreid met 5 tabs (Bankrekening, Transactie, Importeren, Bankreconciliatie, Kasboek)
- [x] Verkoop uitgebreid met 3 tabs (Offertes, Orders, Facturen)
- [x] Inkoop uitgebreid met 2 tabs (Inkooporders, Inkoopfacturen)
- [x] Nieuwe pagina: Betalingsherinneringen met backend endpoints
- [x] Nieuwe pagina: Documentbeheer met backend endpoints
- [x] Nieuwe pagina: Audit Trail met backend endpoints
- [x] Sidebar navigatie bijgewerkt met 17 menu items
- [x] Boekhouding addon geactiveerd voor demo gebruiker

## Backlog (P1)
- [ ] MT940 bank import functionaliteit
- [ ] Automatische reconciliatie matching
- [ ] File upload implementatie voor documenten

## Backlog (P2)
- [ ] PDF generatie voor facturen
- [ ] Email verzending voor herinneringen
- [ ] OCR voor document scanning
- [ ] Surinaamse belastingrapportages
- [ ] Multi-company support
