# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
SaaS programma maken voor verhuur van appartementen in Suriname met valuta in SRD (Surinaamse Dollar).
De applicatie is gerebrand van "SuriRentals" naar "Facturatie N.V."

### Core Requirements
- Beheren van huurders
- Beheren van appartementen (welke vrij/bezet zijn)
- Tracking welke huurders betaald hebben en welke niet
- Openstaande saldo van huurders
- Borg beheren
- Kwitantie maken (PDF)
- Betalingsherinneringen (dashboard)
- **SaaS Abonnement Model**: Superadmin, klanten met 3-dagen proefperiode, SRD 3.500/maand

## User Personas
1. **Super Admin**: Beheert alle klantaccounts en abonnementen
2. **Verhuurder/Klant**: Primaire gebruiker die meerdere appartementen beheert
3. **Eigenaar met klein portfolio**: Particuliere verhuurder met 1-5 units

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI componenten
- **Database**: MongoDB
- **PDF Generation**: ReportLab
- **Styling**: Tailwind CSS met custom design (Outfit + Plus Jakarta Sans fonts)
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented (January 2026)

### Contractgeneratie met Digitale Handtekening ✅ (23 Jan 2026)
- [x] **Contracten pagina** met overzicht, zoeken, filteren op status
- [x] **Summary cards**: Totaal Contracten, Ondertekend, Wacht op Handtekening
- [x] **Contract aanmaken** via modal met alle velden:
  - Verhuurder gegevens (automatisch)
  - Huurder selectie + gegevens (naam, ID, telefoon, email)
  - Appartement selectie + adres
  - Huurperiode (start/einddatum of onbepaalde tijd)
  - Huurprijs en waarborgsom
  - Betaalvoorwaarden (betaaldag, deadline)
  - Bijzondere bepalingen (vrij tekstveld)
- [x] **Digitale ondertekening** via unieke link (publiek, geen login nodig)
- [x] **Handtekening canvas**: tekenen met muis of vinger
- [x] **Ondertekeningspagina** toont alle contractgegevens
- [x] **PDF download** met handtekening (indien ondertekend)
- [x] **Status tracking**: Concept → Wacht op handtekening → Ondertekend
- [x] **Opslag bij huurder**: Contract gekoppeld aan tenant_id

### Notificaties & Reminders ✅ (23 Jan 2026)
- [x] **Notificatie bel** rechtsboven in header (desktop en mobiel)
- [x] **Badge** met aantal meldingen (rood bij urgente meldingen)
- [x] **Popover** met alle notificaties en details
- [x] **Herinnering huurbetalingen**: Niet betaalde huur deze maand
- [x] **Herinnering openstaand saldo**: Meer dan 1 maand huur achterstallig
- [x] **Contract vervaldatum**: Contracten die binnen 30 dagen verlopen
- [x] **Openstaande leningen**: Leningen die nog niet volledig terugbetaald zijn
- [x] **Loonbetalingen**: Lonen die nog niet uitbetaald zijn (na 25e van maand)
- [x] **Prioriteit systeem**: Urgent (rood), Aandacht (geel), Info (groen)
- [x] **Ververs knop** om notificaties te herladen

### Wachtwoord Vergeten ✅ (24 Jan 2026)
- [x] **"Wachtwoord vergeten?"** link op inlogpagina
- [x] **Modal** om e-mailadres in te voeren
- [x] **Reset link** per e-mail (1 uur geldig)
- [x] **Reset wachtwoord pagina** om nieuw wachtwoord in te stellen
- [x] **Beveiliging**: E-mail enumeratie voorkomen (altijd success response)

### Verbeterde Facturen Pagina ✅ (24 Jan 2026)
- [x] **Jaar selector** met navigatie pijlen en dropdown
- [x] **Maandkaarten** met Betaald/Openstaand aantallen
- [x] **Bij klik op maand**: Detailtabel met alle huurders
- [x] **Kolommen**: Huurder, Appartement, Huur, Betaald, Openstaand, Cum. Saldo, Status, Actie
- [x] **Jaaroverzicht tabel** met alle huurders en maanden
- [x] **Status indicators**: ✓ (betaald), ½ (gedeeltelijk), ○ (openstaand)
- [x] **Detail modal** met complete factuurinfo:
  - Periode en status
  - Huurder en appartement gegevens
  - Huur, onderhoudskosten, betalingen
  - Cumulatief saldo (achterstallig/vooruit betaald)
  - Openstaande leningen
  - Betalingsgeschiedenis

### Dashboard Verbeteringen ✅ (23 Jan 2026)
- [x] "Openstaand" kaart toont nu gecombineerd bedrag (huur + leningen)
- [x] "Openstaand" toont ondertitel "incl. leningen SRD X" als er openstaande leningen zijn
- [x] "Inkomsten deze maand" berekent nu correct op basis van payment_date
- [x] Sidebar "Uitloggen" knop is nu altijd zichtbaar onderaan (mt-auto, flex-shrink-0)

### Huurinstellingen - Betaaldeadline ✅ (23 Jan 2026)
- [x] Nieuwe "Betaaldeadline" sectie toegevoegd aan Huurinstellingen
- [x] "Deadline in volgende maand?" dropdown (Dezelfde maand / Volgende maand)
- [x] "Deadline dag" dropdown (1e t/m 28e)
- [x] Live voorbeeld: "Huur van januari moet uiterlijk 6 februari betaald zijn"
- [x] Backend velden: payment_deadline_day, payment_deadline_month_offset
- [x] Validatie: deadline dag moet tussen 0 en 28 zijn

### Leningen (Loans) - NIEUW ✅ (23 Jan 2026)
- [x] Leningen aanmaken voor huurders
- [x] Overzicht van alle leningen met status (Open/Gedeeltelijk/Afbetaald)
- [x] Samenvatting kaarten (Totaal Uitgeleend, Terugbetaald, Openstaand, Actieve Leningen)
- [x] Lening bewerken en verwijderen
- [x] Lening terugbetaling via Betalingen module
- [x] Lening selectie dropdown in betalingsformulier
- [x] Automatische status update (open → partial → paid)
- [x] GET /api/tenants/{id}/loans endpoint voor dropdown

### Rebranding ✅ (22 Jan 2026)
- [x] Applicatie gerebrand van "SuriRentals" naar "Facturatie N.V."
- [x] Nieuw logo (FACTURATE) geïmplementeerd op alle pagina's
- [x] Logo zichtbaar op Login, Register en Dashboard/Sidebar
- [x] Alle tekstuele verwijzingen bijgewerkt (frontend en backend)
- [x] PDF kwitanties bijgewerkt met nieuwe naam
- [x] Page title bijgewerkt naar "Facturatie N.V. | Verhuurbeheer"

### SaaS Subscription System ✅
- [x] 3-dagen gratis proefperiode bij registratie
- [x] Eerste gebruiker of admin@facturatie.sr wordt automatisch superadmin
- [x] Super Admin Dashboard met klantstatistieken
- [x] Klantenbeheer (lijst, zoeken, activeren, deactiveren)
- [x] Abonnement activatie door admin (SRD 3.500/maand)
- [x] Abonnement deactivatie door admin
- [x] Frontend route guards voor subscription checks
- [x] Abonnement pagina voor klanten met betaalinfo
- [x] Bank overschrijving verzoek functie
- [x] Sidebar badges (Proefperiode/Verlopen/Admin)
- [x] Verlopen abonnement → redirect naar /abonnement

### Authentication System
- [x] User registration with email/password (met 3-dagen trial)
- [x] JWT-based login
- [x] Protected routes (subscription check)
- [x] Auto-logout on token expiry
- [x] Role-based access (superadmin/customer)

### Huurders (Tenants) Management
- [x] CRUD operations (Create, Read, Update, Delete)
- [x] Search functionality
- [x] Balance/saldo view per huurder
- [x] Contact info (phone, email, address, ID)

### Appartementen (Apartments) Management
- [x] CRUD operations
- [x] Status tracking (beschikbaar/bezet)
- [x] Huurprijs in SRD
- [x] Slaapkamers/badkamers info
- [x] Huurder toewijzen/verwijderen

### Betalingen (Payments)
- [x] Registreer huurbetalingen per maand
- [x] Borg betalingen afzonderlijk
- [x] PDF kwitanties downloaden
- [x] Openstaand saldo check bij nieuwe betaling
- [x] Waarschuwing blijft zichtbaar tot volledig betaald
- [x] Gedeeltelijke betalingen worden getoond (betaald vs openstaand)
- [x] Maand selector toont ⚡ symbool bij gedeeltelijk betaalde maanden

### Facturen (Invoices) - NIEUW
- [x] Overzicht van alle huur-facturen per huurder
- [x] Status per factuur: Betaald / Gedeeltelijk / Openstaand
- [x] Filters: zoeken, status, jaar
- [x] Samenvatting kaarten (totaal, betaald, gedeeltelijk, openstaand, nog te ontvangen)
- [x] Openstaand saldo per huurder overzicht
- [x] Automatisch bijgewerkt wanneer betalingen worden gedaan
- [x] Cumulatief saldo tracking (openstaand van vorige maanden)
- [x] **NIEUW**: Aparte kolommen: Huur, Onderhoud, Totaal
- [x] **NIEUW**: Uitklapbare rijen met onderhoud details

### Borg (Deposits) Management
- [x] Borg registreren
- [x] Status tracking (in beheer, terugbetaald, deels terugbetaald)
- [x] Borg terugbetalen

### Kasgeld (Cash Fund)
- [x] Automatisch gevuld door huurbetalingen
- [x] Handmatige stortingen/opnames
- [x] SRD naar EUR omrekenen met dagkoers
- [x] Onderhoudkosten aftrekken
- [x] Salarisbetalingen aftrekken

### Onderhoud (Maintenance)
- [x] Onderhoudskosten per appartement
- [x] Categorieën (WC, kraan, douche, keuken, verven, kasten, overig)
- [x] Kosten toewijzing: Kasgeld (verhuurder) of Huurder
- [x] Alleen 'kasgeld' type kosten afgetrokken van Kasgeld
- [x] Onderhoud transacties zichtbaar in Kasgeld historie
- [x] **NIEUW**: Huurder onderhoudskosten toegevoegd aan huur saldo
- [x] **NIEUW**: Onderhoudskosten zichtbaar in Facturen met details

### Werknemers (Employees)
- [x] CRUD voor werknemers
- [x] Salarisbetalingen registreren
- [x] Salaris automatisch afgetrokken van Kasgeld
- [x] PDF loonstrook downloaden per salarisbetaling
- [x] Salaris transacties zichtbaar in Kasgeld historie

### Borg (Deposits) Management
- [x] Borg registreren
- [x] Status tracking (in beheer, terugbetaald, deels terugbetaald)
- [x] Borg terugbetalen
- [x] PDF terugbetaling bevestiging downloaden
- [x] Borg zichtbaar in huurder saldo overzicht ("Bekijk Saldo")

### Leningen (Loans) - NIEUW (23 Jan 2026) ✅
- [x] Leningen aanmaken voor huurders
- [x] Overzicht van alle leningen met status (Open/Gedeeltelijk/Afbetaald)
- [x] Samenvatting kaarten (Totaal Uitgeleend, Terugbetaald, Openstaand, Actieve Leningen)
- [x] Lening bewerken en verwijderen
- [x] Lening terugbetaling via Betalingen module
- [x] Lening selectie dropdown in betalingsformulier
- [x] Automatische status update (open → partial → paid)
- [x] Leningen zichtbaar in Facturen overzicht (optioneel)
- [x] GET /api/tenants/{id}/loans endpoint voor dropdown

### Dashboard
- [x] Totaal appartementen / bezet / beschikbaar
- [x] Totaal huurders
- [x] Inkomsten deze maand
- [x] Openstaand saldo
- [x] Borg in beheer
- [x] Kasgeld saldo
- [x] Werknemers/salaris statistieken
- [x] Betalingsherinneringen voor achterstallige huur
- [x] Recente betalingen overzicht

### UI/UX
- [x] Responsive design (desktop + mobile)
- [x] Nederlandse interface
- [x] SRD valuta formatting
- [x] Professional groene kleurenpalet (#0caf60)
- [x] Split-screen login/register pagina's
- [x] Shadcn UI componenten
- [x] Sidebar met role-based menu items

## Prioritized Backlog

### P0 (Critical) - All Complete ✅

### P1 (High Priority)
- [ ] E-mail herinneringen voor late betalingen
- [ ] Huurcontracten uploaden en beheren
- [ ] Export naar Excel/CSV

### P2 (Medium Priority)
- [ ] Maandelijkse/jaarlijkse rapporten
- [ ] Huurder communicatie log
- [ ] Dark mode toggle
- [ ] Automatische abonnement betaling (Stripe/PayPal)

### P3 (Nice to Have)
- [ ] SMS notificaties (Twilio)
- [ ] Automatische huurverhoging berekening
- [ ] Documenten scanner (ID's, contracten)
- [ ] Mobile app (React Native)

## API Endpoints

### Auth
- POST /api/auth/register - Registratie (geeft 3-dagen trial)
- POST /api/auth/login
- GET /api/auth/me

### Admin (Superadmin only)
- GET /api/admin/dashboard - Admin statistieken
- GET /api/admin/customers - Lijst van klanten
- POST /api/admin/subscriptions - Abonnement activeren
- DELETE /api/admin/customers/{id} - Abonnement deactiveren
- GET /api/admin/subscriptions - Alle abonnementen
- GET /api/admin/subscription-requests - Openstaande verzoeken

### Subscription (Customers)
- GET /api/subscription/status - Huidige status
- POST /api/subscription/request - Activatie aanvragen

### Core Features
- GET/POST /api/tenants, /api/apartments, /api/payments, /api/deposits
- GET /api/dashboard
- GET /api/kasgeld, POST /api/kasgeld
- GET/POST /api/maintenance (incl. cost_type: 'kasgeld' of 'tenant')
- GET/POST /api/employees, /api/salaries
- GET /api/receipts/{payment_id}/pdf - Huur kwitantie PDF
- GET /api/salaries/{salary_id}/pdf - Loonstrook PDF
- GET /api/deposits/{deposit_id}/refund-pdf - Borg terugbetaling PDF
- GET /api/tenants/{tenant_id}/balance - Huurder saldo incl. borg
- GET /api/exchange-rate
- GET /api/invoices - Facturen overzicht
- GET /api/invoices/pdf/{tenant_id}/{year}/{month} - Factuur PDF download
- GET/POST/PUT/DELETE /api/loans - Leningen CRUD
- GET /api/tenants/{tenant_id}/loans - Leningen per huurder (voor dropdown)

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123
- **Test Klant**: nieuw@test.com / test123

## SaaS Business Model
- **Proefperiode**: 3 dagen gratis
- **Abonnementsprijs**: SRD 3.500 per maand
- **Betaling**: Bankoverschrijving (De Surinaamsche Bank)
- **Activatie**: Door superadmin na betalingsontvangst

## Database Collections
- users (met role, subscription_status, subscription_end_date, is_trial)
- subscriptions (betalingshistorie)
- subscription_requests (pending verzoeken)
- tenants, apartments, payments, deposits
- kasgeld, maintenance, employees, salaries

## Next Action Items
1. **HRM Module functionaliteit bouwen** - De add-on bestaat maar heeft nog geen echte features
2. E-mail bezorging naar externe domeinen (DNS SPF/DKIM records nodig)
3. UI Redesign voltooien voor resterende pagina's
4. E-mail herinneringen voor late betalingen (SendGrid/Resend)
5. Andere ERP modules bouwen naar wens (Inventory, CRM, Accounting)
6. **server.py Refactoring** - Backend bestand is >7600 regels en moet worden opgesplitst in modulaire APIRouters

## Recent Updates (26 Jan 2026)

### CMS Consolidatie & Publieke Website ✅ (26 Jan 2026)
- [x] **Unified Website Beheer**: `LandingEditor.js` en `CMSBuilder.js` samengevoegd in één `WebsiteBeheer.js`
- [x] **Enkele navigatie link**: Admin sidebar toont nu één "Website Beheer" link in plaats van twee
- [x] **Route update**: `/app/website-beheer` vervangt `/app/landing-editor` en `/app/cms-builder`
- [x] **Dynamische publieke website**: Nieuwe `PublicPage.js` component die CMS content rendert
- [x] **CMS-gestuurde navigatie**: Menu wordt dynamisch geladen uit `/api/public/cms/menu`
- [x] **CMS-gestuurde pagina's**: Homepage, Over Ons, Contact worden uit de database geladen
- [x] **Footer uit CMS**: Footer configuratie wordt dynamisch geladen
- [x] **Oude bestanden verwijderd**: `LandingPage.js`, `CMSBuilder.js`, `LandingEditor.js`, `OverOnsPage.js`, `ContactPage.js`, `CMSPage.js`
- [x] **emergentintegrations** toegevoegd aan `requirements.txt`
- [x] **Getest**: Backend 100% (17/17), Frontend 100% (alle features geverifieerd)

### CMS Admin Interface (WebsiteBeheer.js)
- **Pagina's tab**: Beheer alle website pagina's, secties, publicatie status, menu zichtbaarheid
- **Footer tab**: Footer kolommen, links, copyright tekst, kleuren
- **Instellingen tab**: Bedrijfsgegevens, logo, sociale media, login/register afbeeldingen
- **Design tab**: Primaire en secundaire kleuren

### CMS API Endpoints
- GET /api/public/cms/menu - Haalt navigatiemenu op
- GET /api/public/cms/page/:slug - Haalt pagina content op
- GET /api/public/cms/footer - Haalt footer configuratie op
- GET/PUT /api/cms/pages - CRUD voor pagina's (admin only)
- GET/PUT /api/cms/footer - Footer beheer (admin only)

## Recent Updates (25 Jan 2026)

### ERP SaaS Transformatie & Mope Betaalintegratie ✅ (25 Jan 2026)
- [x] **Modulair Add-on Systeem**: Applicatie getransformeerd naar generieke ERP SaaS
- [x] **Dynamische UI**: Sidebar, Dashboard en AI Assistant tonen features op basis van actieve add-ons
- [x] **Lege staat voor nieuwe klanten**: Dashboard toont "geen modules geactiveerd" zonder actieve add-ons
- [x] **Add-on Management (Superadmin)**: CRUD voor add-ons met prijzen
- [x] **Customer Add-on Beheer**: Superadmin kan add-ons activeren/deactiveren per klant
- [x] **Multi-pagina Publieke Website**: Home, Prijzen, Over Ons, Contact, Voorwaarden, Privacy
- [x] **Website CMS (Superadmin)**: "Website Beheer" pagina om landingspagina content te beheren
- [x] **Bestelformulier met Accountregistratie**: Bezoekers kunnen modules bestellen en direct een account aanmaken
- [x] **Wachtwoord bij registratie**: Order formulier bevat wachtwoord veld (min 6 tekens)
- [x] **Mope Betaalintegratie**: Backend endpoints voor betalingsinitiatie en status check
- [x] **Mope Settings UI**: Superadmin kan Test/Live API tokens configureren via Website Beheer → Betalingen
- [x] **Backend validatie**: Orders vereisen minimaal één module en geldig wachtwoord

### API Endpoints Toegevoegd (25 Jan 2026)
- POST /api/public/orders - Maakt order én gebruikersaccount aan met wachtwoord
- POST /api/public/orders/{id}/pay - Initieert Mope betaling en retourneert payment_url
- GET /api/public/orders/{id}/payment-status - Controleert betaalstatus bij Mope
- GET /api/admin/mope/settings - Haalt Mope instellingen op (superadmin only)
- PUT /api/admin/mope/settings - Update Mope tokens (superadmin only)
- POST /api/webhooks/mope - Webhook endpoint voor Mope callbacks

### Mope Integratie Documentatie
- **API URL**: https://api.mope.sr/api
- **Documentatie**: https://api.mope.sr/integration/doc
- **Test Tokens**: Configureerbaar via Website Beheer → Betalingen
- **Live Tokens**: Configureerbaar via Website Beheer → Betalingen
- **Flow**: Bestelling → Account aanmaken → Betalen via Mope → Modules worden geactiveerd

## Recent Updates (24 Jan 2026)

### Backend Hardening & Crash Prevention ✅ (24 Jan 2026)
- [x] **Global Exception Handler** toegevoegd om crashes te voorkomen
- [x] **Robuuste data-ophaling** voor alle endpoints met `.get()` en defaults
- [x] **Loans endpoint** veilig gemaakt met try/except en data validation
- [x] **Tenants endpoint** veilig gemaakt met defaults voor ontbrekende velden
- [x] **Apartments endpoint** veilig gemaakt met defaults voor ontbrekende velden
- [x] **Dashboard endpoint** veilig gemaakt met error handling
- [x] **Notifications endpoint** veilig gemaakt met error handling
- [x] **Data repair script** (`fix_corrupt_data.py`) voor productieserver
- [x] **Getest**: Alle kritieke endpoints werken zonder crashes
### Factuur PDF Download ✅ (24 Jan 2026)
- [x] **Download PDF knop** in factuur detail modal op Facturen pagina
- [x] **Backend endpoint** `/api/invoices/pdf/{tenant_id}/{year}/{month}` genereert PDF
- [x] **PDF bevat**: Huurder info, appartement, huur, betalingen, cumulatief saldo, leningen
- [x] **Bestandsnaam**: `Factuur_{HuurderNaam}_{Maand}_{Jaar}.pdf`
- [x] **Getest**: Backend 100% (8/8), Frontend 100%

### Recent Updates (23 Jan 2026)
### New Features Implemented - Batch Complete ✅
1. **Kasgeld Transactiegeschiedenis**: Onderhoud en salarissen nu zichtbaar in Kasgeld transacties
2. **Onderhoud Kosten Toewijzing**: Dropdown om kosten aan Kasgeld (verhuurder) of Huurder toe te wijzen
3. **PDF Loonstrook**: Download knop bij salarisbetalingen in Werknemers pagina
4. **PDF Borg Terugbetaling**: Download knop bij terugbetaalde borgen in Borg pagina
5. **Borg in Bekijk Saldo**: Borg bedrag en datum zichtbaar in huurder balans modal
6. **Openstaand Saldo Check bij Betalingen**: Waarschuwing bij nieuwe betaling als huurder openstaande maanden heeft, met automatische selectie van oudste onbetaalde maand
7. **Facturen Pagina**: Nieuw menu-item met overzicht van alle huur-facturen, status (betaald/gedeeltelijk/openstaand), filters en cumulatief saldo per huurder
8. **Verbeterde Openstaand Saldo Waarschuwing**: Waarschuwing blijft zichtbaar tot volledig betaald, toont gedeeltelijke betalingen met bedragen (⚡ symbool)
