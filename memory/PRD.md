# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
ERP SaaS systeem voor Surinaamse bedrijven met modulaire add-ons en CMS beheer.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI, lazy loading, code splitting
- **Database**: MongoDB
- **Styling**: Tailwind CSS
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented (26 Jan 2026)

### Nieuwe Publieke Website ✅
- **Landing Page** - Moderne hero met ERP dashboard preview
- **Prijzen Page** (/prijzen) - Module selectie met maandelijks/jaarlijks toggle
- **Over Ons Page** (/over-ons) - Missie, waarden, team, statistieken
- **Algemene Voorwaarden** (/voorwaarden) - Volledige juridische tekst
- **Privacybeleid** (/privacy) - Compleet privacybeleid

### CMS Beheer via Admin Dashboard ✅
- **Website tab** in Admin met alle pagina's
- **Bewerken knop** voor elke pagina
- **Preview knop** om pagina's te bekijken
- **Extra Pagina's** sectie voor custom pages
- **Sectie editor** met drag & drop

### Snelheidsoptimalisaties ✅
- **Lazy loading** - Alle niet-kritieke pagina's lazy loaded
- **Code splitting** - App splitst in kleinere chunks
- **API caching** - 30 seconden cache voor publieke endpoints
- **Preconnect/Prefetch** - Fonts en externe resources
- **Critical CSS** - Inline voor snelle eerste render
- **Optimized index.html** - Preload, DNS prefetch

### Post-Order Auto-Login Flow ✅
- Klant bestelt → automatisch account
- JWT token voor auto-login
- Redirect naar "Mijn Modules"
- Superadmin goedkeuring

## Publieke Routes
| Route | Pagina |
|-------|--------|
| / | Home |
| /prijzen | Prijzen |
| /over-ons | Over Ons |
| /voorwaarden | Voorwaarden |
| /privacy | Privacy |
| /login | Login |

## Admin Routes
| Tab | Functie |
|-----|---------|
| Klanten | Klantenbeheer |
| Betalingen | Overzicht |
| Add-ons | Module beheer |
| Domeinen | DNS management |
| Website | **CMS Editor** |

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123

## Prioritized Backlog

### P1 (High Priority)
- [ ] CMS content direct vanuit database laden in pagina's
- [ ] HRM Module frontend uitbouwen
- [ ] server.py refactoring

### P2 (Medium Priority)
- [ ] E-mail herinneringen
- [ ] Export naar Excel/CSV
- [ ] update.sh script

## Performance Optimizations Done
1. React.lazy() voor alle secundaire pagina's
2. Suspense met PageLoader component
3. API response caching (30 sec TTL)
4. Preconnect naar fonts.googleapis.com
5. DNS prefetch naar customer-assets
6. Critical CSS inline in HTML
7. Async script loading
8. memo() voor component caching
