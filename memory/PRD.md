# Vastgoed Kiosk ERP - Product Requirements Document

## Original Problem Statement
Full-stack ERP system for real estate/apartment rent payments with a tenant-facing Kiosk, Admin Dashboard, and Superadmin Dashboard. The kiosk must be an exact 1:1 replica of an Albert Heijn self-checkout kiosk: flat design, no decorative backgrounds, viewport-adaptive scaling.

## Core Architecture
- **Backend**: FastAPI + MongoDB (kiosk.py ~3000 lines)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Kiosk Design**: Albert Heijn self-checkout style (orange bg, flat white cards, fixed white bottom bar)

## User Personas
- **Tenants**: Use kiosk to pay rent via Cash, Mope QR, or SumUp Card
- **Company Admins**: Manage tenants, payments, settings per company
- **Superadmin**: Manages all companies

## Implemented Features

### Kiosk (Tenant-Facing)
- Professional kiosk design: solid orange background, flat white cards (kiosk-card class), no shadows
- Fixed white bottom bar (12vh height) with company name and tenant info
- **Viewport-adaptive scaling (ALL screens)**: fills screen on any size (12"-17"+) using clamp(), vh, vw. No scrollbars on any screen.
- PIN entry, apartment selection, tenant overview, payment flow
- Payment methods: Cash, Mope (QR), SumUp (Card)
- Receipt generation with auto-print
- Betalingsgeschiedenis: popup overlay with last 10 payments per tenant
- Responsive: works in both landscape AND portrait mode

### Viewport Scaling (Completed 25 Mar 2026)
- KioskPinEntry.jsx - Refactored to viewport CSS
- KioskWelcome.jsx - Refactored to viewport CSS
- KioskApartmentSelect.jsx - Refactored to viewport CSS
- KioskTenantOverview.jsx - Refactored to viewport CSS
- KioskPaymentSelect.jsx - Refactored to viewport CSS
- KioskPaymentConfirm.jsx - Fixed syntax errors + refactored to viewport CSS
- KioskReceipt.jsx - Refactored to viewport CSS
- KioskLayout.jsx - Uses kiosk-fullscreen, overflow-hidden

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
- `GET /api/kiosk/public/{id}/tenant/{tid}/payments` - Tenant payment history
- `POST /api/kiosk/public/{id}/payments` - Register payment

### Automatic Device Detection (Completed 25 Mar 2026)
- Touch detection via navigator.maxTouchPoints / ontouchstart
- Screen size categories: compact (≤800px), normal, large (>1080px)
- Touch mode: larger buttons (min 48px touch targets), bigger fonts
- Compact mode: tighter spacing, smaller fonts for small screens
- Large mode: bigger fonts and icons for large monitors
- Visible mode badge in bottom bar (Touch/Desktop indicator)
- CSS classes: .kiosk-touch, .kiosk-compact, .kiosk-large on root element

### Face ID via Webcam (Completed 26 Mar 2026)
- Browser-based face recognition using face-api.js (no external API needed)
- Admin: register face in settings, login with Face ID instead of PIN on /vastgoed
- Tenants: face registered by admin, login with Face ID on /huurders
- Optional: users can always choose PIN/code or Face ID
- Backend endpoints: register, verify, delete face descriptors for admin and tenants
- FaceCapture.jsx reusable component with webcam feed and visual guides
- Models served from /public/models (tiny_face_detector, face_landmark_68, face_recognition)

### Huurders Kiosk Route (Completed 26 Mar 2026)
- `/huurders/:companyId` - separate public route for tenants
- No PIN, no welcome screen - starts directly at apartment selection
- Only Mope and Pinpas payment methods (no cash)
- Reuses existing kiosk components with `hideCash` prop
- Each company gets their own unique huurders link

## Pending/Upcoming Tasks
### P0
- Integrate real Mope API key (waiting for Hakrinbank credentials from user)

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
- Mope/Hakrinbank Payment API (per-company keys, currently MOCKED)
- Shelly Smart Relays (local HTTP)
- WhatsApp Business API

## Credentials
- Superadmin: admin@facturatie.sr / Bharat7755
- Test company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678
- Company ID: ca1240d5-1c1c-41b4-9d88-0798fa7cb8c1
