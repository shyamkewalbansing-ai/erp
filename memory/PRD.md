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
| **Herinneringen** | `/app/boekhouding/herinneringen` | ✅ | **NIEUW**: Betalingsherinneringen voor vervallen facturen |
| **Documenten** | `/app/boekhouding/documenten` | ✅ | **NIEUW**: Documentbeheer, upload bijlagen |
| **Audit Trail** | `/app/boekhouding/audit-trail` | ✅ | **NIEUW**: Gebruikersacties en wijzigingen log |
| Instellingen | `/app/boekhouding/instellingen` | ✅ | Bedrijfsgegevens, nummering |

### Key Files
- **API Client**: `/app/frontend/src/lib/boekhoudingApi.js`
- **Utils**: `/app/frontend/src/lib/utils.js` (currency formatting)
- **Backend Router**: `/app/backend/routers/boekhouding.py` (80+ endpoints)
- **Pages**: `/app/frontend/src/pages/boekhouding/*.js`

### Valuta Support
- SRD (Surinaamse Dollar) - primary
- USD (US Dollar)
- EUR (Euro)

### Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Verified Working (Feb 27, 2026) - Full Testing Complete

### Latest Update: New Features Added
| Feature | Status | Details |
|---------|--------|---------|
| Bank/Kas tabs | ✅ | Bankrekening, Transactie, Importeren, Bankreconciliatie, Kasboek |
| Verkoop tabs | ✅ | Offertes, Orders, Facturen |
| Inkoop tabs | ✅ | Inkooporders, Inkoopfacturen |
| Betalingsherinneringen | ✅ | KPI cards, herinnering aanmaken, facturen voor herinnering |
| Documentbeheer | ✅ | Upload, zoeken, filteren, document types |
| Audit Trail | ✅ | Activiteitenlog, filters, exporteren |

### Frontend Pages: 100% PASSED (17/17)
- ✅ Dashboard - KPI cards (Omzet, Kosten, Winst), bank saldi (SRD 10.000), charts
- ✅ Grootboek - Full chart of accounts (1000-8xxx), journaalposten tab
- ✅ Debiteuren - Test Klant N.V., verkoopfacturen tab, zoekfunctie
- ✅ Crediteuren - Test Leverancier N.V., inkoopfacturen tab
- ✅ Bank/Kas - **5 tabs working**: Bankrekening, Transactie, Importeren, Bankreconciliatie, Kasboek
- ✅ BTW - BTW codes, aangifte tabs
- ✅ Verkoop - **3 tabs working**: Offertes, Orders, Facturen
- ✅ Inkoop - **2 tabs working**: Inkooporders, Inkoopfacturen
- ✅ Voorraad - Producten, mutaties tabs
- ✅ Vaste Activa - Activaoverzicht tabel
- ✅ Projecten - Projectenoverzicht tabel
- ✅ Rapportages - Balans/W&V tabs met datum picker
- ✅ Wisselkoersen - USD/SRD 35.5, koershistorie tabel
- ✅ Herinneringen - KPI cards, 2 tabs (Herinneringen, Facturen voor Herinnering)
- ✅ Documenten - Upload dialog, zoeken, filteren, document tabel
- ✅ Audit Trail - Activiteitenlog met 6 demo entries, filters, export
- ✅ Instellingen - Bedrijfsgegevens, nummering tabs

### Demo Data Available
- 1 debiteur (Test Klant N.V.)
- 1 crediteur (Test Leverancier N.V.)
- 1 bankrekening (DSB Zakelijk met SRD 10.000)
- 1 verkoopfactuur (VF2026-00001)
- 83 grootboekrekeningen (volledig rekeningschema)
- 1 wisselkoers (USD/SRD: 35.5)

## Completed in This Session
- [x] Bank/Kas uitgebreid met 5 tabs (Bankrekening, Transactie, Importeren, Bankreconciliatie, Kasboek)
- [x] Verkoop uitgebreid met 3 tabs (Offertes, Orders, Facturen)
- [x] Inkoop uitgebreid met 2 tabs (Inkooporders, Inkoopfacturen)
- [x] Nieuwe pagina: Betalingsherinneringen
- [x] Nieuwe pagina: Documentbeheer
- [x] Nieuwe pagina: Audit Trail
- [x] Sidebar navigatie bijgewerkt met nieuwe menu items

## Backlog (P1)
- [ ] Backend endpoints voor Audit Trail (nu met demo data)
- [ ] Backend endpoints voor Documenten upload
- [ ] Backend endpoints voor Betalingsherinneringen
- [ ] MT940 bank import functionaliteit
- [ ] Automatische reconciliatie matching

## Backlog (P2)
- [ ] PDF generatie voor facturen
- [ ] Email verzending voor herinneringen
- [ ] OCR voor document scanning
- [ ] Surinaamse belastingrapportages
- [ ] Multi-company support
