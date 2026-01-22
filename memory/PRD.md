# SuriRentals - Product Requirements Document

## Original Problem Statement
SaaS programma maken voor verhuur van appartementen in Suriname met valuta in SRD (Surinaamse Dollar).

### Core Requirements
- Beheren van huurders
- Beheren van appartementen (welke vrij/bezet zijn)
- Tracking welke huurders betaald hebben en welke niet
- Openstaande saldo van huurders
- Borg beheren
- Kwitantie maken (PDF)
- Betalingsherinneringen (dashboard)

## User Personas
1. **Verhuurder/Vastgoedbeheerder**: Primaire gebruiker die meerdere appartementen beheert
2. **Eigenaar met klein portfolio**: Particuliere verhuurder met 1-5 units

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI componenten
- **Database**: MongoDB
- **PDF Generation**: ReportLab
- **Styling**: Tailwind CSS met custom design (Outfit + Plus Jakarta Sans fonts)
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented (December 2025)

### Authentication System
- [x] User registration with email/password
- [x] JWT-based login
- [x] Protected routes
- [x] Auto-logout on token expiry

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
- [x] Registreer betalingen (huur, borg, overig)
- [x] Periode tracking (maand/jaar)
- [x] PDF kwitanties genereren en downloaden
- [x] Betalingsgeschiedenis

### Borg (Deposits) Management
- [x] Borg registreren
- [x] Status tracking (in beheer, terugbetaald, deels terugbetaald)
- [x] Borg terugbetalen

### Dashboard
- [x] Totaal appartementen / bezet / beschikbaar
- [x] Totaal huurders
- [x] Inkomsten deze maand
- [x] Openstaand saldo
- [x] Borg in beheer
- [x] Betalingsherinneringen voor achterstallige huur
- [x] Recente betalingen overzicht

### UI/UX
- [x] Responsive design (desktop + mobile)
- [x] Nederlandse interface
- [x] SRD valuta formatting
- [x] Professional groene kleurenpalet (#0caf60)
- [x] Split-screen login/register pagina's
- [x] Shadcn UI componenten

## Prioritized Backlog

### P0 (Critical) - All Complete ✅

### P1 (High Priority) - Future Enhancements
- [ ] E-mail herinneringen voor late betalingen
- [ ] Huurcontracten uploaden en beheren
- [ ] Meerdere gebruikers per account
- [ ] Export naar Excel/CSV

### P2 (Medium Priority)
- [ ] Maandelijkse/jaarlijkse rapporten
- [ ] Onderhoud tracking
- [ ] Huurder communicatie log
- [ ] Dark mode toggle

### P3 (Nice to Have)
- [ ] SMS notificaties (Twilio)
- [ ] Automatische huurverhoging berekening
- [ ] Documenten scanner (ID's, contracten)
- [ ] Mobile app (React Native)

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Tenants
- GET/POST /api/tenants
- GET/PUT/DELETE /api/tenants/{id}
- GET /api/tenants/{id}/balance

### Apartments
- GET/POST /api/apartments
- GET/PUT/DELETE /api/apartments/{id}
- POST /api/apartments/{id}/assign-tenant
- POST /api/apartments/{id}/remove-tenant

### Payments
- GET/POST /api/payments
- GET/DELETE /api/payments/{id}
- GET /api/receipts/{payment_id}/pdf

### Deposits
- GET/POST /api/deposits
- PUT/DELETE /api/deposits/{id}

### Dashboard
- GET /api/dashboard

## Next Action Items
1. Email herinneringen implementeren (SendGrid/Resend)
2. Huurcontracten upload functie
3. Rapporten exporteren naar PDF/Excel
