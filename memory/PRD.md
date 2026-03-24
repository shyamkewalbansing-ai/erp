# Vastgoed Kiosk ERP - Product Requirements Document

## Origineel Probleemstelling
Migratie van een standalone React/Python KIOSK applicatie (voor vastgoed/appartement huurbetalingen) naar een bestaand full-stack ERP systeem. Het systeem vereist een "True Kiosk Mode", Admin Dashboard, geisoleerde authenticatie, geautomatiseerde factureringsengines, en robuuste touchscreen ondersteuning.

## Architectuur
- **Frontend:** React (CRA) met Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Route prefix:** /api/kiosk/

## Kernfuncties
1. Kiosk modus voor huurders (touchscreen betaling)
2. Admin Dashboard met tabs: Dashboard, Huurders, Appartementen, Kwitanties, Bank/Kas, Werknemers, Instellingen, Stroombrekers, Abonnement
3. Auto-billing engine (huur + boetes)
4. Huurovereenkomsten generatie met bedrijfsstempel
5. Werknemers beheer met salarisbetalingen
6. Bank/Kas financieel dashboard (dynamische inkomsten uit kiosk_payments)

## Kiosk Design Stijl
- **Albert Heijn zelfscankassa stijl** - Echte kiosk look & feel
- **Achtergrond:** Dikke oranje gradient (from-orange-500 via-orange-500 to-orange-600) met rijke decoratie:
  - Decoratieve cirkels met witte borders (3D diepte)
  - Glow effecten (blur-3xl)
  - Diagonale lijnen
  - Gradient overlays
- **Kaarten:** Witte zwevende kaarten (rounded-[2rem], shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)])
- **Knoppen:** Groot, touch-friendly (py-5/py-6, rounded-2xl)
- **Header knoppen:** bg-white/20 backdrop-blur-sm border border-white/20 (glasachtig, goed zichtbaar)
- **Receipt pagina:** Groene gradient achtergrond

## Voltooide Features
- [2026-03-23] Auto-billing logica gerepareerd + 8 pytest tests
- [2026-03-23] Achterstand maanden specifiek weergegeven
- [2026-03-23] Realistische Huurovereenkomst met rode bedrijfsstempel (Suriname)
- [2026-03-23] Werknemers tab (CRUD + salarisbetalingen)
- [2026-03-23] Bank/Kas tab (dynamische inkomsten, alleen uitgaven in kas tabel)
- [2026-03-24] Kleurfix Huurders tabel
- [2026-03-24] Zoekbalk bij Huurders en Appartementen tabs
- [2026-03-24] Kwitanties maandfilter standaard op huidige maand
- [2026-03-24] Kwitantie preview/print ReceiptTicket component
- [2026-03-24] Kiosk betaalpagina meerdere items selecteerbaar
- [2026-03-24] Bedrijfsstempel vernieuwd
- [2026-03-24] WhatsApp Business API + Berichten tab
- [2026-03-24] Stroombreker auto-cutoff
- [2026-03-24] Superadmin Dashboard
- [2026-03-24] Virtual Keyboard voor touch devices
- [2026-03-24] Tenant code management
- [2026-03-24] Delete buttons Appartementen/Kwitanties
- [2026-03-24] Responsive UI overhaul
- **[2026-03-24] KIOSK REDESIGN V1: Albert Heijn stijl - Oranje gradient, witte zwevende kaarten**
- **[2026-03-24] KIOSK REDESIGN V2: Grotere kaarten, mooiere schaduwen, grotere tekst/knoppen**
- **[2026-03-24] KIOSK REDESIGN V3: Rijkere achtergrond (cirkels, glow, lijnen, stippen) + zichtbare glasachtige knoppen**

## Database Schema
- `kiosk_employees`: name, role, salary, hire_date, status
- `kiosk_kas`: amount, entry_type (expense/salary), category, description
- `kiosk_payments`: source of truth voor alle huurinkomsten
- `kiosk_companies`: subscription_plan, is_active, power_cutoff_days
- `kiosk_tenants`: tenant_code (handmatig instelbaar)

## Bestanden
- `/app/backend/routers/kiosk.py` - Alle backend logica
- `/app/frontend/src/components/vastgoed-kiosk/KioskAdminDashboard.jsx` - Admin UI
- `/app/frontend/src/components/vastgoed-kiosk/KioskWelcome.jsx`
- `/app/frontend/src/components/vastgoed-kiosk/KioskApartmentSelect.jsx`
- `/app/frontend/src/components/vastgoed-kiosk/KioskTenantOverview.jsx`
- `/app/frontend/src/components/vastgoed-kiosk/KioskPaymentSelect.jsx`
- `/app/frontend/src/components/vastgoed-kiosk/KioskPaymentConfirm.jsx`
- `/app/frontend/src/components/vastgoed-kiosk/KioskReceipt.jsx`
- `/app/frontend/src/components/vastgoed-kiosk/KioskPinEntry.jsx`

## Credentials
- Email: demo@facturatie.sr | Wachtwoord: demo2024
- Superadmin: admin@facturatie.sr | Wachtwoord: Bharat7755

## Backlog (Geprioriteerd)
### P2
- Kwitanties tab moderniseren
- Maandelijks financieel rapport
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-building support per bedrijf

## Refactoring Nodig
- KioskAdminDashboard.jsx (3000+ regels) opsplitsen
- kiosk.py (2800+ regels) opsplitsen
