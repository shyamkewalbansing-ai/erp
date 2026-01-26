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

### AI Chatbot Assistent ✅ NEW
- [x] OpenAI GPT-4o integratie via Emergent LLM Key
- [x] Publieke chatbot endpoint: POST /api/public/chat
- [x] ChatWidget component op alle publieke pagina's
- [x] Kennis over alle modules, prijzen en diensten
- [x] Quick questions voor snelle hulp
- [x] Chat sessie opslag voor analytics

### Verbeterde Publieke Pagina's ✅ NEW
- [x] **Landing Page** - Module kaarten met iconen, partner logos
- [x] **Voorwaarden** - Mooi design met genummerde artikelen en highlights
- [x] **Privacy** - Blauw kleurschema, SSL/GDPR highlights

### Website Beheer in Admin ✅
- [x] Website tab in Admin dashboard
- [x] Pagina overzicht met bewerken/preview knoppen
- [x] Sectie editor met drag & drop

### Snelheidsoptimalisaties ✅
- [x] Lazy loading voor alle niet-kritieke pagina's
- [x] Code splitting
- [x] API caching (30 sec)
- [x] Preconnect/Prefetch

## Publieke Routes
| Route | Pagina |
|-------|--------|
| / | Home + Chat |
| /prijzen | Prijzen + Chat |
| /over-ons | Over Ons + Chat |
| /voorwaarden | Voorwaarden + Chat |
| /privacy | Privacy + Chat |

## API Endpoints
| Endpoint | Functie |
|----------|---------|
| POST /api/public/chat | AI Chatbot |
| GET /api/public/addons | Module lijst |
| POST /api/public/orders | Bestelling + account |

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123

## AI Chatbot Features
- Beantwoordt vragen over alle modules
- Geeft prijsinformatie (SRD)
- Verwijst naar prijzenpagina
- Moedigt registratie aan
- 24/7 beschikbaar

## Prioritized Backlog

### P1 (High Priority)
- [ ] CMS content direct bewerkbaar via admin
- [ ] Partner logos uploaden/beheren
- [ ] Module afbeeldingen uploaden

### P2 (Medium Priority)
- [ ] HRM Module frontend uitbouwen
- [ ] server.py refactoring

### P3 (Nice to Have)
- [ ] Chat geschiedenis per sessie
- [ ] Analytics dashboard voor chats
