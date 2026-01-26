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

## What's Been Implemented (26 Jan 2026)

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
