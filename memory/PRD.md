# Vastgoed Kiosk ERP - Product Requirements Document

## Origineel Probleemstelling
Migratie van een standalone React/Python KIOSK applicatie (voor vastgoed/appartement huurbetalingen) naar een bestaand full-stack ERP systeem met SaaS model.

## Architectuur
- **Frontend:** React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Route prefix:** /api/kiosk/

## Kiosk Design
- **Albert Heijn zelfscankassa stijl** met oranje gradient achtergrond
- Decoratieve elementen: cirkels, glow, diagonale lijnen
- Witte zwevende kaarten (rounded-[2rem], shadow-[0_25px_60px])
- Glasachtige knoppen (bg-white/20 backdrop-blur-sm)

## Voltooide Features
- [2026-03-23] Auto-billing + Achterstand + Huurovereenkomst + Werknemers + Bank/Kas
- [2026-03-24] Zoekbalk, Kwitanties filter, ReceiptTicket, Multi-select betalingen
- [2026-03-24] WhatsApp Business API + Berichten tab
- [2026-03-24] Stroombreker auto-cutoff, Superadmin Dashboard
- [2026-03-24] Virtual Keyboard, Tenant code, Delete buttons, Responsive UI
- [2026-03-24] KIOSK REDESIGN: AH stijl, grotere kaarten, rijke achtergrond, zichtbare knoppen
- [2026-03-24] Print fix: dubbele afdruk verwijderd
- [2026-03-24] SRD bedragen op 1 lijn (whitespace-nowrap)
- [2026-03-24] Betaling geslaagd pagina: zelfde oranje achtergrond
- [2026-03-24] Volgende knop + Terug naar start knop op overzicht
- **[2026-03-24] SumUp Online Checkout integratie (per bedrijf instelbaar via Admin Instellingen)**

## SumUp Integratie
- Per bedrijf instelbaar: API Key + Merchant Code in Admin → Instellingen
- Toggle om SumUp aan/uit te zetten
- Kiosk betalingsflow: keuze Contant of Pinpas (SumUp)
- SumUp Card Widget wordt geladen voor kaartbetaling
- Backend endpoints: POST checkout, GET status, GET enabled
- Currency: EUR (instelbaar)

## Database Schema
- `kiosk_companies`: + `sumup_api_key`, `sumup_merchant_code`, `sumup_enabled`
- `kiosk_employees`, `kiosk_kas`, `kiosk_payments`, `kiosk_tenants`

## Credentials
- Email: demo@facturatie.sr | Wachtwoord: demo2024
- Superadmin: admin@facturatie.sr | Wachtwoord: Bharat7755

## Backlog
### P2
- Kwitanties tab moderniseren
- Maandelijks financieel rapport
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten
- Multi-building support

## Refactoring
- KioskAdminDashboard.jsx (3000+ regels) opsplitsen
- kiosk.py (2800+ regels) opsplitsen
