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

## Verified Working (Feb 27, 2026)
- ✅ Dashboard met metric cards en charts
- ✅ Verkoop pagina met echte factuur data (VF2026-00001)
- ✅ BTW pagina met codes en aangifte tabs
- ✅ Voorraad pagina met product/mutatie management
- ✅ Alle 14 pagina's laden correct zonder fouten

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
