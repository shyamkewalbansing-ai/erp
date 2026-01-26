# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
SaaS programma maken voor verhuur van appartementen in Suriname met valuta in SRD (Surinaamse Dollar).
De applicatie is gerebrand van "SuriRentals" naar "Facturatie N.V." en uitgebreid naar een generiek, modulair ERP SaaS systeem.

## User Personas
1. **Super Admin**: Beheert alle klantaccounts, abonnementen, en website content
2. **Verhuurder/Klant**: Primaire gebruiker die meerdere appartementen beheert
3. **Nieuwe klant**: Bezoeker die modules bestelt via de landing page

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI componenten
- **Database**: MongoDB
- **Styling**: Tailwind CSS met custom design (Outfit + Plus Jakarta Sans fonts)
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented

### Nieuwe Publieke Website (26 Jan 2026) ✅
- [x] **Landing Page** - Volledig nieuwe hero sectie met ERP dashboard preview
- [x] **Prijzen Page** (/prijzen) - Module selectie met maandelijks/jaarlijks toggle
- [x] **Over Ons Page** (/over-ons) - Missie, waarden, team, statistieken
- [x] **Algemene Voorwaarden** (/voorwaarden) - Volledige juridische tekst
- [x] **Privacybeleid** (/privacy) - Compleet privacybeleid
- [x] **Navigatie** - Consistente header/footer op alle pagina's
- [x] **Mobile responsive** - Hamburger menu voor mobiel

### Website Beheer in Admin (26 Jan 2026) ✅
- [x] Nieuwe "Website" tab in Admin dashboard
- [x] Overzicht van alle publieke pagina's met preview links
- [x] "Website Beheer" link verwijderd uit sidebar
- [x] Gecentraliseerd beheer in Admin → Website tab

### Post-Order Auto-Login Flow (26 Jan 2026) ✅
- [x] Klant bestelt modules → automatisch account aanmaken
- [x] JWT token retour voor auto-login
- [x] Redirect naar "Mijn Modules" pagina
- [x] Superadmin kan verzoeken goedkeuren/afwijzen

### Overige Features ✅
- [x] HRM Module (basis)
- [x] Contractgeneratie met digitale handtekening
- [x] Notificaties & Reminders
- [x] SaaS Subscription System
- [x] Mope Betaalintegratie (backend)

## Publieke Routes
| Route | Pagina | Beschrijving |
|-------|--------|--------------|
| / | Home | Landing page met hero, features, modules |
| /prijzen | Prijzen | Add-on prijzen met selectie |
| /over-ons | Over Ons | Bedrijfsinformatie |
| /voorwaarden | Voorwaarden | Algemene voorwaarden |
| /privacy | Privacy | Privacybeleid |
| /modules | Modules | Module overzicht |
| /login | Login | Inloggen |
| /register | Register | Registreren |

## Admin Routes
| Route | Tab | Functie |
|-------|-----|---------|
| /app/admin | Klanten | Klantenbeheer |
| /app/admin | Betalingen | Betalingsoverzicht |
| /app/admin | Add-ons | Module en verzoeken beheer |
| /app/admin | Domeinen | Domein management |
| /app/admin | Website | Pagina overzicht en links |

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123

## Prioritized Backlog

### P1 (High Priority)
- [ ] HRM Module frontend uitbouwen
- [ ] CMS content editing (inline editing van pagina's)
- [ ] server.py refactoring naar modulaire APIRouters

### P2 (Medium Priority)
- [ ] update.sh deployment script
- [ ] E-mail herinneringen voor late betalingen
- [ ] Export naar Excel/CSV

### P3 (Nice to Have)
- [ ] Dark mode toggle
- [ ] SMS notificaties

## Recent Changes (26 Jan 2026)
1. Nieuwe LandingPage.js met moderne kewalbansing.net stijl
2. PrijzenPage.js met module selectie en order flow
3. OverOnsPage.js met missie, waarden en team
4. VoorwaardenPage.js met volledige juridische tekst
5. PrivacyPage.js met compleet privacybeleid
6. Admin.js uitgebreid met "Website" tab
7. Layout.js - "Website Beheer" link verwijderd uit sidebar
8. App.js - Nieuwe routes toegevoegd
