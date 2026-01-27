# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
ERP SaaS systeem voor Surinaamse bedrijven met modulaire add-ons, CMS beheer en AI chatbot.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI, lazy loading
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Styling**: Tailwind CSS
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented (27 Jan 2026)

### HRM Module - Volledig Uitgebreid ✅ (NIEUW)
- [x] **Aparte pagina's in sidebar** - Net als Vastgoed Beheer module
- [x] **HRM Dashboard** - Overzicht statistieken, snelle acties, wachtende verlofaanvragen
- [x] **Personeel** - Werknemers CRUD met zoeken, filteren, status badges
- [x] **Werving** - Vacatures en sollicitaties beheren met status tracking
- [x] **Contracten** - Arbeidscontracten met type, salaris, valuta, looptijd
- [x] **Documenten** - Document beheer per werknemer met vervaldatum waarschuwingen
- [x] **Verlof** - Verlofaanvragen indienen, goedkeuren, afwijzen
- [x] **Aanwezigheid** - Tijdregistratie met in-/uitklokken
- [x] **Loonlijst** - Loonstroken genereren, goedkeuren, uitbetalen
- [x] **HRM Instellingen** - Valuta's (SRD/EUR/USD), werkuren, verlof config, afdelingen

### Sidebar Structuur ✅ (NIEUW)
- [x] Aparte secties voor "VASTGOED BEHEER" en "HRM MODULE"
- [x] Visuele scheiding met labels en borders
- [x] Alle module-specifieke items onder juiste sectie

### CMS End-to-End Functionaliteit ✅ VERIFIED
- [x] CMS editor in admin panel met sectie bewerken
- [x] Backend API's voor CMS pagina CRUD
- [x] LandingPage haalt CMS content dynamisch op
- [x] Secties tab met alle 9 secties (hero, partners, features, modules, industries, cta)
- [x] Wijzigingen in CMS editor zijn direct zichtbaar op publieke pagina's
- [x] Drag & drop voor sectie herordening
- [x] Sectie types: hero, partners, features, module, industries, cta

### AI Chatbot Assistent ✅
- [x] OpenAI GPT-4o integratie via Emergent LLM Key
- [x] Publieke chatbot endpoint: POST /api/public/chat
- [x] ChatWidget component op alle publieke pagina's
- [x] Kennis over alle modules, prijzen en diensten
- [x] Quick questions voor snelle hulp
- [x] Chat sessie opslag voor analytics

### Website Redesign ✅
- [x] **LandingPage** - Volledig nieuw design met CMS integratie
- [x] **PrijzenPage** - Module prijzen en bestellen
- [x] **OverOnsPage** - Bedrijfsinformatie
- [x] **VoorwaardenPage** - Juridische voorwaarden
- [x] **PrivacyPage** - Privacy informatie

### Snelheidsoptimalisaties ✅
- [x] React.lazy loading voor alle pagina's
- [x] Code splitting
- [x] Preconnect/Prefetch

## HRM Module API Endpoints (NIEUW)
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/hrm/dashboard | GET | Dashboard statistieken |
| /api/hrm/employees | GET/POST | Werknemers CRUD |
| /api/hrm/employees/{id} | PUT/DELETE | Werknemer bewerken/verwijderen |
| /api/hrm/departments | GET/POST | Afdelingen beheren |
| /api/hrm/contracts | GET/POST | Arbeidscontracten |
| /api/hrm/vacancies | GET/POST | Vacatures |
| /api/hrm/applications | GET/POST | Sollicitaties |
| /api/hrm/leave-requests | GET/POST | Verlofaanvragen |
| /api/hrm/attendance | GET/POST | Aanwezigheid |
| /api/hrm/attendance/clock-in | POST | Inklokken |
| /api/hrm/attendance/clock-out | POST | Uitklokken |
| /api/hrm/payroll | GET/POST | Loonstroken |
| /api/hrm/payroll/generate | POST | Automatisch genereren |
| /api/hrm/documents | GET/POST | Documenten |
| /api/hrm/settings | GET/PUT | HRM Instellingen |

## CMS Structuur
| Sectie ID | Type | Bewerkbaar |
|-----------|------|------------|
| hero | hero | ✅ Titel, Content |
| partners | partners | ✅ Titel, Content |
| features | features | ✅ Titel, Content |
| boekhouding | module | ✅ Titel, Content |
| hrm | module | ✅ Titel, Content |
| projecten | module | ✅ Titel, Content |
| leads | module | ✅ Titel, Content |
| industries | industries | ✅ Titel, Content |
| cta | cta | ✅ Titel, Content |

## API Endpoints
| Endpoint | Functie |
|----------|---------|
| POST /api/public/chat | AI Chatbot |
| GET /api/public/addons | Module lijst |
| POST /api/public/orders | Bestelling + account |
| GET /api/public/cms/page/{slug} | CMS pagina content |
| GET /api/cms/pages | CMS pagina's (admin) |
| PUT /api/cms/pages/{id} | CMS pagina update (admin) |

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] CMS end-to-end verificatie

### P1 (High Priority)
- [ ] Image uploads voor CMS (partner logos, module afbeeldingen)
- [ ] HRM Module frontend uitbouwen

### P2 (Medium Priority)
- [ ] server.py refactoring (>8700 lines)
- [ ] update.sh deployment script

### P3 (Nice to Have)
- [ ] Chat geschiedenis per sessie
- [ ] Overige ERP modules (Inventory, CRM, Accounting)
