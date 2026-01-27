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

### CMS Image Upload ✅ (NIEUW - 27 Jan 2026)
- [x] Server-side image upload via `/api/cms/upload-image`
- [x] Logo upload met preview in CMS Instellingen
- [x] Login/Registratie afbeelding upload
- [x] Sectie afbeelding upload in page editor
- [x] Max 5MB bestandslimiet
- [x] Loading state tijdens upload

### HRM Module - Volledig Uitgebreid ✅
- [x] **Aparte pagina's in sidebar** - Net als Vastgoed Beheer module
- [x] **HRM Dashboard** - Overzicht statistieken, snelle acties
- [x] **Personeel** - Werknemers CRUD met zoeken, filteren, status badges
- [x] **Werving** - Vacatures en sollicitaties beheren
- [x] **Contracten** - Arbeidscontracten met type, salaris, valuta
- [x] **Documenten** - Document beheer per werknemer
- [x] **Verlof** - Verlofaanvragen indienen, goedkeuren, afwijzen
- [x] **Aanwezigheid** - Tijdregistratie met in-/uitklokken
- [x] **Loonlijst** - Loonstroken genereren, goedkeuren, uitbetalen
- [x] **HRM Instellingen** - Valuta's, werkuren, verlof config, afdelingen

### Sidebar Structuur ✅
- [x] Aparte secties voor "VASTGOED BEHEER" en "HRM MODULE"
- [x] Visuele scheiding met labels en borders
- [x] Alle module-specifieke items onder juiste sectie

### CMS End-to-End Functionaliteit ✅ VERIFIED
- [x] CMS editor met 4 tabs: Pagina's, Footer, Instellingen, Design
- [x] Backend API's voor CMS pagina CRUD
- [x] LandingPage haalt CMS content dynamisch op
- [x] Wijzigingen in CMS editor zijn direct zichtbaar
- [x] Drag & drop voor sectie herordening

### AI Chatbot Assistent ✅
- [x] OpenAI GPT-4o integratie via Emergent LLM Key
- [x] ChatWidget component op alle publieke pagina's
- [x] Quick questions voor snelle hulp

### Website Redesign ✅
- [x] **LandingPage** - Nieuw design met CMS integratie
- [x] **PrijzenPage** - Module prijzen en bestellen
- [x] **OverOnsPage** - Bedrijfsinformatie
- [x] **VoorwaardenPage** - Juridische voorwaarden
- [x] **PrivacyPage** - Privacy informatie

## HRM Module API Endpoints
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

## CMS API Endpoints
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/cms/pages | GET | Alle CMS pagina's |
| /api/cms/pages/{id} | PUT/DELETE | Pagina bewerken/verwijderen |
| /api/cms/upload-image | POST | Afbeelding uploaden |
| /api/cms/footer | GET/PUT | Footer instellingen |
| /api/public/cms/page/{slug} | GET | Publieke CMS pagina |

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123

## Testing Status (27 Jan 2026)
- Backend: 100% (25/25 tests passed)
- Frontend: 100% (all UI tests passed)
- Test report: /app/test_reports/iteration_20.json

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] CMS end-to-end verificatie
- [x] HRM Module uitbreiding
- [x] CMS Image Upload

### P1 (High Priority)
- [ ] **server.py refactoring** (>9000 lines) - Split into routers
- [ ] Partner logo's uploaden via CMS

### P2 (Medium Priority)
- [ ] Update.sh deployment script verbeteren
- [ ] Email notificaties voor HRM

### P3 (Nice to Have)
- [ ] Chat geschiedenis per sessie
- [ ] Overige ERP modules (Inventory, CRM, Accounting)

## Architecture Notes
- `server.py` is >9000 regels - KRITIEK om te refactoren naar modulaire routers
- HRM frontend pages beschermd door SubscriptionRoute (alleen voor klanten met HRM add-on)
- CMS Editor: /app/website-beheer
