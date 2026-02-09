# Suribet Dashboard - Product Requirements Document

## Oorspronkelijke Probleemstelling
Een "Dagrapporten" applicatie voor Suribet met financieel beheer, inclusief bon scanning, commissie tracking, en uitbetalingen.

## Huidige Status
**Fase**: MVP Compleet + Iteratieve verbeteringen

## Geïmplementeerde Functies

### Core Features
- **Bon Scanner & QR Upload**: AI-gedreven receipt scanning met Gemini Vision
- **Financiële Header**: Live tracking van "Suribet Deel" en "Jouw Commissie"
- **Payout System**: Modal om meerdere rapporten te selecteren en uit te betalen
- **Commission Management**: Opnemen van commissie naar kasboek
- **Balance Transfers**: Transfers tussen commissie, Suribet saldo en kasboek
- **Balance Adjustment Management**: Bekijken en verwijderen van saldo aanpassingen
- **Force Reset**: Functie om vastgelopen data te resetten

### UI/UX
- **Snelle Acties Component**: Navigatie onderaan alle Suribet pagina's (Dec 2024)
- **Date Selector**: Navigeren per dag op alle pagina's
- **Payout Modal**: Rapporten gegroepeerd per datum
- **Report Cards**: Begin/Eindsaldo weergave

### Pagina's
1. Dashboard (`/app/suribet/dashboard`)
2. Dagrapporten (`/app/suribet/dagrapporten`)
3. Uitbetalingen (`/app/suribet/uitbetalingen`)
4. Kasboek (`/app/suribet/kasboek`)
5. Machines (`/app/suribet/machines`)
6. Werknemers (`/app/suribet/werknemers`)
7. Loonuitbetaling (`/app/suribet/loonuitbetaling`)

## Technische Stack
- **Frontend**: React, Tailwind CSS, Shadcn/ui
- **Backend**: FastAPI, MongoDB
- **AI Integration**: Gemini Vision (via Emergent LLM Key)

## Database Collections
- `suribet_dagstaten` - Dagelijkse rapporten
- `suribet_uitbetalingen` - Uitbetaling records
- `suribet_kasboek` - Kasboek entries
- `suribet_saldo_aanpassingen` - Saldo aanpassingen

## Belangrijke Endpoints
- `/api/suribet/openstaand-totaal` - Running totals
- `/api/suribet/uitbetalingen` - Payouts
- `/api/suribet/commissie-opnemen` - Commission withdrawal
- `/api/suribet/saldo-naar-suribet` - Balance to Suribet
- `/api/suribet/saldo-naar-commissie` - Balance to Commission

## Backlog

### P1 - Aankomend
- **Dashboard Redirect**: Automatische redirect van `/app/dashboard` naar eerste module

### P2 - Toekomstig
- **Refactoring DagrapportenPage.js**: Bestand is >2500 regels, moet opgesplitst worden

## Credentials
- Test account: `demo@facturatie.sr` / `demo2024`

## Laatste Update
December 2024 - Snelle Acties component correct geplaatst onderaan alle Suribet pagina's
