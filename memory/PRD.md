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
- **Achtergrond:** Dikke oranje gradient (from-orange-500 via-orange-500 to-orange-600) vult het hele scherm
- **Kaarten:** Witte zwevende kaarten (rounded-3xl, shadow-2xl) voor alle content
- **Knoppen:** Groot, touch-friendly (py-4 px-6 rounded-2xl)
- **Decoratieve elementen:** Subtiele overlays voor visueel diepte
- **Receipt pagina:** Groene gradient achtergrond

## Voltooide Features
- [2026-03-23] Auto-billing logica gerepareerd + 8 pytest tests
- [2026-03-23] Achterstand maanden specifiek weergegeven
- [2026-03-23] Realistische Huurovereenkomst met rode bedrijfsstempel (Suriname)
- [2026-03-23] Werknemers tab (CRUD + salarisbetalingen)
- [2026-03-23] Bank/Kas tab (dynamische inkomsten, alleen uitgaven in kas tabel)
- [2026-03-24] Kleurfix Huurders tabel: bedragen standaard zwart, alleen oranje/rood bij achterstand
- [2026-03-24] Zoekbalk toegevoegd bij Huurders en Appartementen tabs
- [2026-03-24] Kwitanties maandfilter standaard op huidige maand
- [2026-03-24] Appartementen status: "Bewoond" -> "Bezet"
- [2026-03-24] Kwitantie preview/print: gebruikt nu exact dezelfde ReceiptTicket component als de Kiosk
- [2026-03-24] ReceiptTicket type labels uitgebreid (monthly_rent, fine)
- [2026-03-24] Kiosk betaalpagina: meerdere items tegelijk selecteerbaar, "Alles betalen", "Ander bedrag" keypad
- [2026-03-24] Bedrijfsstempel geheel vernieuwd: rechthoekig formaat met huis-icoon
- [2026-03-24] Betaalmethoden sectie: bankgegevens getoond op kwitanties
- [2026-03-24] WhatsApp Business API: self-service configuratie, berichten versturen
- [2026-03-24] WhatsApp Berichten tab: berichtengeschiedenis
- [2026-03-24] Stroombreker auto-cutoff instelling
- [2026-03-24] Tabs navigatie: horizontaal scrollbaar
- [2026-03-24] Superadmin Dashboard (SaaS management)
- [2026-03-24] Virtual Keyboard voor touch devices
- [2026-03-24] Tenant code management (handmatig + A-Z keypad)
- [2026-03-24] Delete buttons voor Appartementen en Kwitanties
- [2026-03-24] Responsive UI overhaul
- **[2026-03-24] KIOSK REDESIGN: Albert Heijn stijl - Oranje gradient achtergrond, witte zwevende kaarten, echte kiosk look (alle 7 pagina's)**

## Database Schema
- `kiosk_employees`: name, role, salary, hire_date, status
- `kiosk_kas`: amount, entry_type (expense/salary), category, description
- `kiosk_payments`: source of truth voor alle huurinkomsten
- `kiosk_companies`: subscription_plan, is_active, power_cutoff_days
- `kiosk_tenants`: tenant_code (handmatig instelbaar)

## Kas Logica
- Totale Inkomsten = dynamisch uit kiosk_payments (status=completed)
- Totale Uitgaven = som uit kiosk_kas collection
- Kassaldo = Inkomsten - Uitgaven
- NOOIT income entries schrijven naar kiosk_kas

## Bestanden
- `/app/backend/routers/kiosk.py` - Alle backend logica
- `/app/frontend/src/components/vastgoed-kiosk/KioskAdminDashboard.jsx` - Admin UI
- `/app/frontend/src/components/vastgoed-kiosk/KioskWelcome.jsx` - Kiosk welkom (oranje bg + witte kaart)
- `/app/frontend/src/components/vastgoed-kiosk/KioskApartmentSelect.jsx` - Appartement selectie
- `/app/frontend/src/components/vastgoed-kiosk/KioskTenantOverview.jsx` - Huurder overzicht
- `/app/frontend/src/components/vastgoed-kiosk/KioskPaymentSelect.jsx` - Betaling selectie
- `/app/frontend/src/components/vastgoed-kiosk/KioskPaymentConfirm.jsx` - Betaling bevestiging
- `/app/frontend/src/components/vastgoed-kiosk/KioskReceipt.jsx` - Kwitantie/succes
- `/app/frontend/src/components/vastgoed-kiosk/KioskPinEntry.jsx` - PIN invoer
- `/app/backend/tests/test_billing.py` - Pytest billing tests

## Credentials
- Email: demo@facturatie.sr | Wachtwoord: demo2024
- Superadmin: admin@facturatie.sr | Wachtwoord: Bharat7755
- Login via: /vastgoed

## Backlog (Geprioriteerd)
### P2
- Kwitanties tab moderniseren (unified table, zoek/filter)
- Maandelijks financieel rapport (Kas inkomsten, uitgaven, salarissen)
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-building support per bedrijf

## Refactoring Nodig
- KioskAdminDashboard.jsx (3000+ regels) opsplitsen in aparte tab-componenten
- kiosk.py (2800+ regels) opsplitsen in aparte routers
