# Facturatie.sr - Product Requirements Document

## Original Problem Statement
De gebruiker wil een uitgebreide Boekhouding (Accounting) module bouwen die specifiek is afgestemd op de Surinaamse markt. De aanvraag omvat meer dan 15 sub-modules.

## Product Overview
Multi-tenant SaaS platform voor Surinaamse bedrijven met modulaire add-ons voor:
- Vastgoed Beheer
- HRM
- Auto Dealer
- Beauty Spa
- Suribet Retailer
- **Boekhouding** (nieuw geïmplementeerd)

## Boekhouding Module - Implemented ✅

### Core Features (Completed)
| Module | Status | Description |
|--------|--------|-------------|
| Dashboard | ✅ | KPI's, omzet, kosten, winst, bank saldi, charts |
| Grootboek | ✅ | Rekeningschema, dagboeken, journaalposten |
| Debiteuren | ✅ | Klantbeheer, verkoopfacturen |
| Crediteuren | ✅ | Leveranciersbeheer, inkoopfacturen |
| Bank/Kas | ✅ | Bankrekeningen, kasboek, transacties |
| BTW | ✅ | BTW codes, tarieven |
| Verkoop | ✅ | Offertes, orders, facturen |
| Inkoop | ✅ | Inkooporders, facturen |
| Voorraad | ✅ | Artikelen, magazijnen, niveaus |
| Vaste Activa | ✅ | Activaregister, afschrijvingen |
| Projecten | ✅ | Uren, budget tracking |
| Rapportages | ✅ | Balans, W&V, BTW aangifte |
| Wisselkoersen | ✅ | Handmatige koers invoer (SRD, USD, EUR) |
| Instellingen | ✅ | Bedrijfsinstellingen, nummering |

### Technical Implementation
- **Frontend**: React met shadcn/ui componenten
- **API Client**: `/app/frontend/src/lib/boekhoudingApi.js`
- **Backend**: FastAPI router `/app/backend/routers/boekhouding.py`
- **Database**: MongoDB collections

### Key API Endpoints
```
GET/POST /api/boekhouding/dashboard
GET/POST /api/boekhouding/rekeningen
GET/POST /api/boekhouding/debiteuren
GET/POST /api/boekhouding/crediteuren
GET/POST /api/boekhouding/bankrekeningen
GET/POST /api/boekhouding/verkoopfacturen
GET/POST /api/boekhouding/inkoopfacturen
GET/POST /api/boekhouding/wisselkoersen
GET     /api/boekhouding/rapportages/*
```

### Valuta Support
- SRD (Surinaamse Dollar) - primary
- USD (US Dollar)
- EUR (Euro)

## Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Architecture
```
/app/
├── backend/
│   ├── routers/
│   │   └── boekhouding.py  # Complete accounting router
│   └── server.py           # Main FastAPI with addon system
└── frontend/
    └── src/
        ├── lib/
        │   ├── boekhoudingApi.js  # API wrapper
        │   └── utils.js           # Currency formatting
        ├── components/
        │   └── Layout.js          # Sidebar with boekhouding nav
        └── pages/
            └── boekhouding/       # All module pages
                ├── DashboardPage.js
                ├── GrootboekPage.js
                ├── DebiteruenPage.js
                ├── CrediteruenPage.js
                ├── BankKasPage.js
                └── ... (14 total pages)
```

## Completed Work (Feb 27, 2026)
1. ✅ Created complete boekhouding API client (`boekhoudingApi.js`)
2. ✅ Extended utils.js with Dutch currency/status formatting
3. ✅ Implemented Dashboard with charts and metrics
4. ✅ Implemented Grootboek with accounts/journal entries
5. ✅ Implemented Debiteuren with customers/invoices
6. ✅ Implemented Crediteuren with suppliers/invoices
7. ✅ Implemented Bank/Kas with accounts/kasboek
8. ✅ Fixed Authorization header bug in backend router
9. ✅ Tested all 5 main pages - 100% pass rate

## Backlog (P1)
- [ ] Full CRUD operations for all modules
- [ ] Bank import (CSV/MT940)
- [ ] Bank reconciliation with auto-matching
- [ ] Document upload and OCR
- [ ] Email reminders for overdue invoices
- [ ] Audit trail per user
- [ ] Multi-company support

## Backlog (P2)
- [ ] Surinamese tax compliance reports
- [ ] Integration with Surinamese banks
- [ ] Mobile-responsive optimizations
- [ ] Dashboard customization

## Notes
- Reference repository: `https://github.com/shyamkewalbansing-ai/sr.git` (branch: Boekhouding)
- UI follows clean/modern light theme as per user preference
