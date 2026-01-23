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
- [x] Status per factuur: Betaald / Openstaand
- [x] Filters: zoeken, status, jaar
- [x] Samenvatting kaarten (totaal, betaald, openstaand, bedrag)
- [x] Openstaand saldo per huurder overzicht
- [x] Automatisch bijgewerkt wanneer betalingen worden gedaan

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
1. E-mail bezorging naar externe domeinen (DNS SPF/DKIM records nodig)
2. E-mail herinneringen voor late betalingen (SendGrid/Resend)
3. Huurcontracten upload functie
4. Rapporten exporteren naar PDF/Excel

## Recent Updates (23 Jan 2026)
### New Features Implemented - Batch Complete ✅
1. **Kasgeld Transactiegeschiedenis**: Onderhoud en salarissen nu zichtbaar in Kasgeld transacties
2. **Onderhoud Kosten Toewijzing**: Dropdown om kosten aan Kasgeld (verhuurder) of Huurder toe te wijzen
3. **PDF Loonstrook**: Download knop bij salarisbetalingen in Werknemers pagina
4. **PDF Borg Terugbetaling**: Download knop bij terugbetaalde borgen in Borg pagina
5. **Borg in Bekijk Saldo**: Borg bedrag en datum zichtbaar in huurder balans modal
6. **Openstaand Saldo Check bij Betalingen**: Waarschuwing bij nieuwe betaling als huurder openstaande maanden heeft, met automatische selectie van oudste onbetaalde maand
7. **Facturen Pagina**: Nieuw menu-item met overzicht van alle huur-facturen, status (betaald/gedeeltelijk/openstaand), filters en cumulatief saldo per huurder
8. **Verbeterde Openstaand Saldo Waarschuwing**: Waarschuwing blijft zichtbaar tot volledig betaald, toont gedeeltelijke betalingen met bedragen (⚡ symbool)
