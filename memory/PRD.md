# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
SaaS programma maken voor verhuur van appartementen in Suriname met valuta in SRD (Surinaamse Dollar).
De applicatie is gerebrand van "SuriRentals" naar "Facturatie N.V." en uitgebreid naar een generiek, modulair ERP SaaS systeem.

### Core Requirements
- Beheren van huurders
- Beheren van appartementen (welke vrij/bezet zijn)
- Tracking welke huurders betaald hebben en welke niet
- Openstaande saldo van huurders
- Borg beheren
- Kwitantie maken (PDF)
- Betalingsherinneringen (dashboard)
- **SaaS Abonnement Model**: Superadmin, klanten met 3-dagen proefperiode, SRD 3.500/maand
- **Modulair Add-on Systeem**: Klanten kunnen specifieke modules bestellen

## User Personas
1. **Super Admin**: Beheert alle klantaccounts, abonnementen, en add-on verzoeken
2. **Verhuurder/Klant**: Primaire gebruiker die meerdere appartementen beheert
3. **Eigenaar met klein portfolio**: Particuliere verhuurder met 1-5 units
4. **Nieuwe klant**: Bezoeker die modules bestelt via de landing page

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI componenten
- **Database**: MongoDB
- **PDF Generation**: ReportLab
- **Styling**: Tailwind CSS met custom design (Outfit + Plus Jakarta Sans fonts)
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented (January 2026)

### Post-Order Auto-Login & Module Status Flow ✅ (26 Jan 2026)
- [x] **Order met account aanmaak**: Klant bestelt modules via landing page en krijgt automatisch een account
- [x] **JWT token retour**: Backend geeft JWT token terug voor auto-login
- [x] **Auto-login redirect**: Na bestelling wordt klant automatisch ingelogd en doorgestuurd naar "Mijn Modules"
- [x] **Mijn Modules pagina**: Nieuwe `/app/mijn-modules` route voor klanten
- [x] **Pending status weergave**: Klant ziet modules met "In Afwachting" status
- [x] **Actieve modules weergave**: Na goedkeuring ziet klant actieve modules met einddatum
- [x] **Sidebar link**: "Mijn Modules" link toegevoegd aan klant sidebar
- [x] **Admin Add-on Verzoeken**: Superadmin ziet openstaande verzoeken in Admin → Add-ons tab
- [x] **Goedkeuren/Afwijzen**: Superadmin kan verzoeken goedkeuren of afwijzen
- [x] **Subscription activatie**: Bij goedkeuring wordt subscription_status en end_date bijgewerkt

### API Endpoints Toegevoegd (26 Jan 2026)
- POST /api/public/orders - Maakt order, user account, addon requests aan; retourneert JWT
- GET /api/my-addon-requests - Klant's addon aanvragen met status
- GET /api/my-active-addons - Klant's actieve add-ons
- GET /api/admin/addon-requests - Alle openstaande verzoeken (superadmin)
- PUT /api/admin/addon-requests/{id}/approve - Goedkeuren en activeren
- PUT /api/admin/addon-requests/{id}/reject - Afwijzen

### CMS Consolidatie & Publieke Website ✅ (26 Jan 2026)
- [x] **Unified Website Beheer**: Samengevoegd in één `WebsiteBeheer.js`
- [x] **Dynamische publieke website**: CMS-gestuurde pagina's
- [x] **CMS-gestuurde navigatie**: Menu wordt dynamisch geladen

### ERP SaaS Transformatie & Mope Betaalintegratie ✅ (25 Jan 2026)
- [x] **Modulair Add-on Systeem**: Dynamische UI op basis van actieve add-ons
- [x] **Add-on Management (Superadmin)**: CRUD voor add-ons met prijzen
- [x] **Bestelformulier met Accountregistratie**: Wachtwoord bij registratie
- [x] **Mope Betaalintegratie**: Backend endpoints voor betalingsinitiatie

### Contractgeneratie met Digitale Handtekening ✅ (23 Jan 2026)
- [x] **Contracten pagina** met overzicht, zoeken, filteren
- [x] **Digitale ondertekening** via unieke link
- [x] **PDF download** met handtekening

### Notificaties & Reminders ✅ (23 Jan 2026)
- [x] **Notificatie bel** rechtsboven met badge
- [x] **Prioriteit systeem**: Urgent, Aandacht, Info

### SaaS Subscription System ✅
- [x] 3-dagen gratis proefperiode bij registratie
- [x] Super Admin Dashboard met klantstatistieken
- [x] Abonnement activatie/deactivatie door admin

### Authentication System
- [x] JWT-based login
- [x] Protected routes met subscription check
- [x] Role-based access (superadmin/customer)

### Complete Feature List
- [x] Huurders (Tenants) Management - CRUD
- [x] Appartementen (Apartments) Management - CRUD
- [x] Betalingen (Payments) - met PDF kwitanties
- [x] Facturen (Invoices) - overzicht en PDF download
- [x] Borg (Deposits) Management
- [x] Kasgeld (Cash Fund)
- [x] Onderhoud (Maintenance)
- [x] Werknemers (Employees) met loonstroken
- [x] Leningen (Loans)
- [x] Dashboard met statistieken
- [x] HRM Module (basis structuur)

## Database Collections
- users (met role, subscription_status, subscription_end_date)
- subscriptions (betalingshistorie)
- addons (beschikbare modules)
- addon_requests (pending verzoeken van klanten)
- user_addons (geactiveerde add-ons per gebruiker)
- tenants, apartments, payments, deposits
- kasgeld, maintenance, employees, salaries, loans
- cms_pages, cms_menu, cms_footer

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123
- **Test Klant**: Via POST /api/public/orders aanmaken

## Prioritized Backlog

### P0 (Critical) - All Complete ✅

### P1 (High Priority)
- [ ] HRM Module functionaliteit uitbouwen (frontend)
- [ ] E-mail herinneringen voor late betalingen
- [ ] server.py refactoring naar modulaire APIRouters

### P2 (Medium Priority)
- [ ] update.sh deployment script maken
- [ ] CMS afbeelding uploads fixen (base64 → file upload)
- [ ] Maandelijkse/jaarlijkse rapporten
- [ ] Export naar Excel/CSV

### P3 (Nice to Have)
- [ ] SMS notificaties (Twilio)
- [ ] Dark mode toggle
- [ ] Mobile app (React Native)

## Next Action Items
1. HRM Module frontend uitbouwen met echte functionaliteit
2. update.sh script maken voor eenvoudige server updates
3. server.py opsplitsen in modulaire bestanden
4. CMS image uploads fixen

## Recent Test Results
- **Backend**: 100% (15/15 tests passed)
- **Frontend**: 100% (all features verified)
- **Test Report**: /app/test_reports/iteration_18.json
