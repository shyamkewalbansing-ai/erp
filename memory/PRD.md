# Vastgoed Kiosk ERP - Product Requirements Document

## Original Problem Statement
Full-stack ERP system for real estate/apartment rent payments with a tenant-facing Kiosk, Admin Dashboard, and Superadmin Dashboard.

## Core Architecture
- **Backend**: FastAPI + MongoDB (kiosk.py ~3000 lines)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Kiosk Design**: Albert Heijn self-checkout style (orange theme, floating white cards, touch-friendly)

## User Personas
- **Tenants**: Use kiosk to pay rent via Cash, Mope QR, or SumUp Card
- **Company Admins**: Manage tenants, payments, settings per company
- **Superadmin**: Manages all companies

## Implemented Features

### Kiosk (Tenant-Facing)
- Full redesign: orange gradient, floating cards, 3D elements
- PIN entry, apartment selection, tenant overview, payment flow
- Payment methods: Cash, Mope (QR), SumUp (Card)
- Receipt generation with auto-print
- Responsive: works in both landscape AND portrait mode (md:flex-row breakpoint)

### Payment Integrations
- **SumUp Pinbetaling**: Per-company API key, merchant code, currency (EUR/USD), exchange rate for SRD conversion
- **Mope QR Betaling**: Per-company API key, QR code generation, status polling (open/scanned/paid)
  - Mock mode: key starting with `mock_` auto-transitions payment status
  - Real mode: connects to https://api.mope.sr API

### Admin Dashboard
- Tenant management (CRUD, import)
- Payment overview, receipts
- Settings: Company info, billing, WhatsApp, SumUp, Mope
- Kiosk PIN management

### Superadmin Dashboard
- Company management, activation/deactivation

## Database Schema (key collections)
- `kiosk_companies`: company settings including sumup_*/mope_* fields
- `kiosk_tenants`: tenant info, outstanding rent/service costs/fines
- `kiosk_payments`: payment records with payment_method (cash/card/mope)
- `kiosk_apartments`: apartment records
- `mope_mock_payments`: mock Mope payment tracking

## Key API Endpoints
- `PUT /api/kiosk/auth/settings` - Save company settings (SumUp + Mope)
- `GET /api/kiosk/public/{id}/sumup/enabled` - Check SumUp config + exchange rate
- `POST /api/kiosk/public/{id}/sumup/checkout` - Create SumUp checkout
- `GET /api/kiosk/public/{id}/mope/enabled` - Check Mope config
- `POST /api/kiosk/public/{id}/mope/checkout` - Create Mope payment (+ mock)
- `GET /api/kiosk/public/{id}/mope/status/{pid}` - Poll Mope status
- `POST /api/kiosk/public/{id}/payments` - Register payment

## Pending/Upcoming Tasks
### P1
- Modernize "Kwitanties" (Receipts) tab with unified table style

### P2
- Monthly financial report (automated)
- CSV/PDF export of payment reports
- Password reset functionality
- Multi-building support per company

### Refactoring
- Split KioskAdminDashboard.jsx (~3000 lines) into smaller components
- Split kiosk.py (~3000 lines) into feature-specific route files

## 3rd Party Integrations
- SumUp Online Checkout API (per-company keys)
- Mope/Hakrinbank Payment API (per-company keys)
- Shelly Smart Relays (local HTTP)
- WhatsApp Business API

## Credentials
- Superadmin: admin@facturatie.sr / Bharat7755
- Test company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678
