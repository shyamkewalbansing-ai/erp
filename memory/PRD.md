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

## Voltooide Features
- [2026-03-23] Auto-billing logica gerepareerd + 8 pytest tests
- [2026-03-23] Achterstand maanden specifiek weergegeven
- [2026-03-23] Realistische Huurovereenkomst met rode bedrijfsstempel (Suriname)
- [2026-03-23] Werknemers tab (CRUD + salarisbetalingen)
- [2026-03-23] Bank/Kas tab (dynamische inkomsten, alleen uitgaven in kas tabel)
- [2026-03-24] Kleurfix Huurders tabel: bedragen standaard zwart, alleen oranje/rood bij achterstand (groen verwijderd)

## Database Schema
- `kiosk_employees`: name, role, salary, hire_date, status
- `kiosk_kas`: amount, entry_type (expense/salary), category, description
- `kiosk_payments`: source of truth voor alle huurinkomsten

## Kas Logica
- Totale Inkomsten = dynamisch uit kiosk_payments (status=completed)
- Totale Uitgaven = som uit kiosk_kas collection
- Kassaldo = Inkomsten - Uitgaven
- NOOIT income entries schrijven naar kiosk_kas

## Bestanden
- `/app/backend/routers/kiosk.py` - Alle backend logica
- `/app/frontend/src/components/vastgoed-kiosk/KioskAdminDashboard.jsx` - Admin UI
- `/app/frontend/src/components/vastgoed-kiosk/KioskTenantOverview.jsx` - Kiosk UI
- `/app/backend/tests/test_billing.py` - Pytest billing tests

## Credentials
- Email: demo@facturatie.sr | Wachtwoord: demo2024
- Login via: /vastgoed

## Backlog (Geprioriteerd)
### P1
- Tuya API integratie voor stroombrekers (momenteel gemocked)

### P2
- Kwitanties tab moderniseren (unified table, zoek/filter)
- SMS/WhatsApp herinneringen (3 dagen voor vervaldatum)
- Maandelijks financieel rapport
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-building support per bedrijf

## Refactoring Nodig
- KioskAdminDashboard.jsx (1700+ regels) opsplitsen
- kiosk.py (1800+ regels) opsplitsen
