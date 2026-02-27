# Facturatie.sr - Product Requirements Document

## Original Problem Statement
De gebruiker wil een uitgebreide Boekhouding (Accounting) module bouwen die specifiek is afgestemd op de Surinaamse markt met ondersteuning voor SRD, USD, en EUR valuta.

## Completed Boekhouding Module ✅

### All Pages Implemented (14 total)
| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Dashboard | `/app/boekhouding` | ✅ | KPI's, charts, bank saldi |
| Grootboek | `/app/boekhouding/grootboek` | ✅ | Rekeningschema, journaalposten |
| Debiteuren | `/app/boekhouding/debiteuren` | ✅ | Klanten, verkoopfacturen |
| Crediteuren | `/app/boekhouding/crediteuren` | ✅ | Leveranciers, inkoopfacturen |
| Bank/Kas | `/app/boekhouding/bank-kas` | ✅ | Bankrekeningen, kasboek |
| BTW | `/app/boekhouding/btw` | ✅ | BTW-codes, aangifte overzicht |
| Verkoop | `/app/boekhouding/verkoop` | ✅ | Verkoopfacturen aanmaken |
| Inkoop | `/app/boekhouding/inkoop` | ✅ | Inkoopfacturen registreren |
| Voorraad | `/app/boekhouding/voorraad` | ✅ | Producten, mutaties, niveaus |
| Vaste Activa | `/app/boekhouding/vaste-activa` | ✅ | Activa, afschrijvingen |
| Projecten | `/app/boekhouding/projecten` | ✅ | Budget, uren tracking |
| Rapportages | `/app/boekhouding/rapportages` | ✅ | Balans, Winst & Verlies |
| Wisselkoersen | `/app/boekhouding/wisselkoersen` | ✅ | Koersen SRD/USD/EUR |
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
### Backend APIs: 100% PASSED
- All 13 tested endpoints return 200 OK
- Dashboard KPIs, rekeningen, debiteuren, crediteuren, bankrekeningen all functional

### Frontend Pages: 100% PASSED (14/14)
- ✅ Dashboard - KPI cards (Omzet, Kosten, Winst), bank saldi (SRD 10.000), charts
- ✅ Grootboek - Full chart of accounts (1000-8xxx), journaalposten tab
- ✅ Debiteuren - Test Klant N.V., verkoopfacturen tab, zoekfunctie
- ✅ Crediteuren - Test Leverancier N.V., inkoopfacturen tab
- ✅ Bank/Kas - DSB Zakelijk account, kasboek tab
- ✅ BTW - BTW codes, aangifte tabs
- ✅ Verkoop - VF2026-00001 factuur, overzicht tabel
- ✅ Inkoop - Inkoopfacturen tabel (empty)
- ✅ Voorraad - Producten, mutaties tabs
- ✅ Vaste Activa - Activaoverzicht tabel
- ✅ Projecten - Projectenoverzicht tabel
- ✅ Rapportages - Balans/W&V tabs met datum picker
- ✅ Wisselkoersen - USD/SRD 35.5, koershistorie tabel
- ✅ Instellingen - Bedrijfsgegevens, nummering tabs

### Demo Data Available
- 1 debiteur (Test Klant N.V.)
- 1 crediteur (Test Leverancier N.V.)
- 1 bankrekening (DSB Zakelijk met SRD 10.000)
- 1 verkoopfactuur (VF2026-00001)
- 83 grootboekrekeningen (volledig rekeningschema)
- 1 wisselkoers (USD/SRD: 35.5)

## Backlog (P1)
- [ ] Demo/seed data voor alle modules
- [ ] Bank import (CSV/MT940)
- [ ] Bank reconciliatie met auto-matching
- [ ] Document upload en OCR
- [ ] Email herinneringen

## Backlog (P2)
- [ ] Surinaamse belastingrapportages
- [ ] Multi-company support
- [ ] Audit trail per gebruiker
