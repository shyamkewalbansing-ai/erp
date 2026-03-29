# Vastgoed Kiosk ERP - Product Requirements Document

## Original Problem Statement
Full-stack ERP system for real estate/apartment rent payments with a KIOSK terminal (Albert Heijn self-checkout style). Manage Kiosk subscriptions via the ERP SuperAdmin dashboard. Support Face ID scanning and mock/real local payment methods.

## User Personas
- **SuperAdmin**: Manages all companies, subscriptions, domains, payments
- **Company Admin (Kiosk)**: Manages tenants, properties, payments for their company
- **Tenant (Huurder)**: Uses kiosk to make rent payments via Face ID or PIN

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + Python
- Database: MongoDB (via Motor async driver)
- Kiosk: face-api.js for Face ID

## Core Requirements
1. ERP with modules: Boekhouding, Schuldbeheer
2. Kiosk terminal for rent payments (Face ID + PIN login)
3. SuperAdmin dashboard for company/subscription management
4. Subscription blocking for expired companies

## What's Been Implemented

### Completed (Previous Sessions)
- KasTab: Inkomsten/Uitgaven with free-text categories
- Subdomain routing removed; Kiosk on standard `/vastgoed` paths
- 5 modules permanently removed (Vastgoed Beheer, HRM, Auto Dealer, Suribet, Beauty Spa)
- SuperAdmin Vastgoed Kiosk subscription management
- "Abonnement Verlopen" blocking for expired subscriptions

### Completed (Current Session - 29 Mar 2026)
- **Admin Sidebar Migration**: All 13 SuperAdmin tabs moved from horizontal tabs in `Admin.js` to collapsible "Beheerder" section in the main sidebar (`Layout.js`)
- Each admin tab now has its own URL route: `/app/admin/klanten`, `/app/admin/betalingen`, `/app/admin/modules`, `/app/admin/verzoeken`, `/app/admin/werkruimtes`, `/app/admin/domein-provisioning`, `/app/admin/domeinen`, `/app/admin/betaalmethodes`, `/app/admin/email`, `/app/admin/website`, `/app/admin/systeem`, `/app/admin/live-chat`, `/app/admin/vastgoed-kiosk`
- `emergentintegrations` removed from `requirements.txt` (was causing production deploy failure)
- Frontend successfully deployed to production

## Architecture
```
/app/
├── backend/
│   ├── routers/kiosk.py          # Kiosk API (monolithic ~3300 lines)
│   └── server.py                  # Main FastAPI server + ERP auth
├── frontend/src/
│   ├── components/
│   │   ├── Layout.js              # Main sidebar with admin nav items
│   │   ├── VastgoedKioskManager.jsx
│   │   └── vastgoed-kiosk/        # Kiosk components
│   ├── pages/
│   │   ├── Admin.js               # Admin dashboard (uses URL params for tab)
│   │   └── App.js                 # Routing
```

## Key API Endpoints
- `GET /api/superadmin/companies` - Fetch kiosk companies
- `PUT /api/superadmin/companies/{id}/subscription` - Update subscription

## Prioritized Backlog

### P0 (Blocking)
- None currently

### P1 (Next Up)
- Modernize "Kwitanties" (Receipts) tab
- WhatsApp receipt integration (backend logic exists, needs frontend tie-in)
- Refactoring: Split `Admin.js` (~3700 lines), `KioskAdminDashboard.jsx` (~3400 lines), `kiosk.py` (~3300 lines)

### P2 (Future)
- Monthly financial report automation
- CSV/PDF export of payment reports
- Password reset functionality
- Multi-building support per company

## 3rd Party Integrations
- SumUp Online Checkout API (needs user API key)
- Mope Payment API (MOCKED - needs real credentials)
- Uni5Pay (MOCKED - needs real credentials)
- WhatsApp Business API (needs user API key)

## Credentials
- SuperAdmin: admin@facturatie.sr / Bharat7755
- Kiosk Company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678
