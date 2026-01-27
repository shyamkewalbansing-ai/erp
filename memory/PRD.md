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

### Partner Logo's via CMS ✅ (NIEUW - 27 Jan 2026)
- [x] Partner logo's beheerbaar via CMS Instellingen tab
- [x] "Partner Toevoegen" knop met upload functionaliteit
- [x] Placeholder logo's verwijderd van landing page (geen 404 errors meer)
- [x] Partners sectie verborgen als er geen logo's zijn geconfigureerd

### CMS Image Upload ✅ (27 Jan 2026)
- [x] Server-side image upload via `/api/cms/upload-image`
- [x] Logo upload met preview in CMS Instellingen
- [x] Login/Registratie afbeelding upload
- [x] Sectie afbeelding upload in page editor
- [x] Max 5MB bestandslimiet
- [x] Loading state tijdens upload

### Server.py Refactoring (GESTART)
- [x] Routers directory aangemaakt: `/app/backend/routers/`
- [x] deps.py met gedeelde dependencies aangemaakt
- [x] auth.py router aangemaakt (nog niet geïntegreerd)
- [ ] HRM router extraheren
- [ ] CMS router extraheren
- [ ] Overige routers (apartments, payments, etc.)
- [ ] Main server.py updaten om routers te importeren

### HRM Module - Volledig Uitgebreid ✅
- [x] **Aparte pagina's in sidebar** - Net als Vastgoed Beheer module
- [x] **HRM Dashboard** - Overzicht statistieken, snelle acties
- [x] **Personeel** - Werknemers CRUD met zoeken, filteren
- [x] **Werving** - Vacatures en sollicitaties beheren
- [x] **Contracten** - Arbeidscontracten
- [x] **Documenten** - Document beheer per werknemer
- [x] **Verlof** - Verlofaanvragen
- [x] **Aanwezigheid** - Tijdregistratie
- [x] **Loonlijst** - Loonstroken
- [x] **HRM Instellingen** - Valuta's, werkuren, etc.

### CMS End-to-End Functionaliteit ✅
- [x] CMS editor met 4 tabs: Pagina's, Footer, Instellingen, Design
- [x] Backend API's voor CMS pagina CRUD
- [x] LandingPage haalt CMS content dynamisch op

### AI Chatbot Assistent ✅
- [x] OpenAI GPT-4o integratie via Emergent LLM Key

## API Endpoints

### CMS
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/cms/pages | GET | Alle CMS pagina's |
| /api/cms/pages/{id} | PUT/DELETE | Pagina bewerken/verwijderen |
| /api/cms/upload-image | POST | Afbeelding uploaden |
| /api/admin/landing/settings | GET/PUT | Landing page instellingen + partners |

### HRM
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/hrm/dashboard | GET | Dashboard statistieken |
| /api/hrm/employees | GET/POST | Werknemers CRUD |
| /api/hrm/departments | GET/POST | Afdelingen |
| /api/hrm/contracts | GET/POST | Contracten |
| /api/hrm/settings | GET/PUT | HRM Instellingen |

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] CMS image upload
- [x] Partner logo's via CMS
- [x] Placeholder logo 404 errors opgelost

### P1 (High Priority) - IN PROGRESS
- [ ] **server.py refactoring voltooien** (>9000 lines) - Routers integreren

### P2 (Medium Priority)
- [ ] Email notificaties voor HRM
- [ ] Update.sh deployment script verbeteren

### P3 (Nice to Have)
- [ ] Overige ERP modules (Inventory, CRM, Accounting)

## File Structure
```
/app/backend/
├── server.py          # Main (9400+ lines - needs refactoring)
├── deps.py            # NEW: Shared dependencies
└── routers/
    ├── __init__.py    # NEW
    └── auth.py        # NEW: Auth router (not yet integrated)
```

## Architecture Notes
- `server.py` is >9400 regels - KRITIEK om te refactoren
- Routers zijn aangemaakt maar nog niet geïntegreerd
- Partner logo's nu via settings.partners array
