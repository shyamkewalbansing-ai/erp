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
| Bank/Kas | `/app/boekhouding/bank-kas` | ✅ | 5 tabs met MT940/CSV import en reconciliatie |
| BTW | `/app/boekhouding/btw` | ✅ | BTW-codes, aangifte overzicht |
| Verkoop | `/app/boekhouding/verkoop` | ✅ | 3 tabs: Offertes, Orders, Facturen |
| Inkoop | `/app/boekhouding/inkoop` | ✅ | 2 tabs: Inkooporders, Inkoopfacturen |
| Voorraad | `/app/boekhouding/voorraad` | ✅ | Producten, mutaties, niveaus |
| Vaste Activa | `/app/boekhouding/vaste-activa` | ✅ | Activa, afschrijvingen |
| Projecten | `/app/boekhouding/projecten` | ✅ | Budget, uren tracking |
| Rapportages | `/app/boekhouding/rapportages` | ✅ | Balans, Winst & Verlies |
| Wisselkoersen | `/app/boekhouding/wisselkoersen` | ✅ | Koersen SRD/USD/EUR |
| Herinneringen | `/app/boekhouding/herinneringen` | ✅ | Betalingsherinneringen |
| Documenten | `/app/boekhouding/documenten` | ✅ | Documentbeheer met file upload |
| Audit Trail | `/app/boekhouding/audit-trail` | ✅ | Gebruikersacties log |
| Instellingen | `/app/boekhouding/instellingen` | ✅ | Bedrijfsgegevens, nummering |

### P1 Features Completed ✅

#### 1. MT940 Bank Import
- **Endpoint**: `POST /api/boekhouding/bank/import/mt940`
- **Features**:
  - Parse standaard MT940 formaat
  - Ondersteunt Surinaamse banken (DSB, Hakrinbank, Finabank, Republic Bank)
  - Automatische duplicaat detectie
  - Extraheert tegenpartij informatie
  - Frontend: Drag & drop file upload met formaat auto-detectie

#### 2. CSV Bank Import
- **Endpoint**: `POST /api/boekhouding/bank/import/csv`
- **Features**:
  - Flexibele CSV parsing
  - Configureerbare delimiter
  - Handmatige CSV paste optie
  - Foutrapportage per regel

#### 3. Automatische Reconciliatie
- **Endpoint**: `POST /api/boekhouding/reconciliatie/auto-match/{bank_id}`
- **Matching Strategies**:
  1. Factuurnummer in omschrijving (95% confidence)
  2. Exact bedrag match + klant naam (85% confidence)
  3. Exact bedrag match alleen (80% confidence)
- **Additional Endpoints**:
  - `POST /reconciliatie/manual-match` - Handmatige koppeling
  - `POST /reconciliatie/book-payment` - Betaling boeken
  - `GET /reconciliatie/overzicht/{bank_id}` - Overzicht

#### 4. Document Upload
- **Endpoint**: `POST /api/boekhouding/documenten/upload`
- **Features**:
  - Max 10MB bestandsgrootte
  - Ondersteunde formaten: PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX, CSV, TXT
  - Automatische file hash voor uniciteit
  - Koppeling aan facturen, debiteuren, etc.
- **Additional Endpoints**:
  - `GET /documenten/{id}/download` - Base64 download
  - `GET /documenten/{id}/preview` - Preview info

### Key Files
- **API Client**: `/app/frontend/src/lib/boekhoudingApi.js`
- **Backend Router**: `/app/backend/routers/boekhouding.py` (120+ endpoints)
- **Pages**: `/app/frontend/src/pages/boekhouding/*.js`
- **Upload Directory**: `/app/uploads/documenten`

### Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Verified Working (Feb 27, 2026)

### API Tests: 100% PASSED
- ✅ MT940 import endpoint
- ✅ CSV import endpoint
- ✅ Auto-match reconciliatie
- ✅ Document upload
- ✅ Audit trail

### Frontend Tests: 100% PASSED
- ✅ Bank/Kas Import tab met file upload
- ✅ Bank/Kas Reconciliatie tab met Auto-Match
- ✅ Documenten upload dialog

## Backlog (P2)
- [ ] PDF generatie voor facturen
- [ ] Email verzending voor herinneringen
- [ ] OCR voor document scanning
- [ ] Surinaamse belastingrapportages
- [ ] Multi-company support
- [ ] Real-time bank koppeling (via bank API)
