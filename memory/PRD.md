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
- [2026-03-24] Kleurfix Huurders tabel: bedragen standaard zwart, alleen oranje/rood bij achterstand
- [2026-03-24] Zoekbalk toegevoegd bij Huurders en Appartementen tabs
- [2026-03-24] Kwitanties maandfilter standaard op huidige maand
- [2026-03-24] Appartementen status: "Bewoond" -> "Bezet"
- [2026-03-24] Kwitantie preview/print: gebruikt nu exact dezelfde ReceiptTicket component als de Kiosk, met modal in admin
- [2026-03-24] ReceiptTicket type labels uitgebreid (monthly_rent, fine) voor compatibiliteit
- [2026-03-24] Kiosk betaalpagina: maandselectie verwijderd, meerdere items tegelijk selecteerbaar (checkboxes), "Alles betalen" optie, "Ander bedrag" keypad
- [2026-03-24] Bedrijfsstempel geheel vernieuwd: rechthoekig formaat met huis-icoon (SVG), schuin gestempeld, donkerrood kleur, matching met fysieke stempel
- [2026-03-24] Betaalmethoden sectie: bankgegevens (naam, rekening, rekeninghouder) getoond op kwitanties
- [2026-03-24] WhatsApp Business API: self-service configuratie, berichten versturen (herinnering/boete/achterstand), bulk versturen, berichtengeschiedenis
- [2026-03-24] WhatsApp knop bij huurders met schuld voor directe herinnering
- [2026-03-24] WhatsApp Berichten tab: berichtengeschiedenis met statistieken, zoek/filter op type en status, expandable berichten

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
### P2
- Kwitanties tab moderniseren (unified table, zoek/filter)
- Maandelijks financieel rapport (Kas inkomsten, uitgaven, salarissen)
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-building support per bedrijf

## Refactoring Nodig
- KioskAdminDashboard.jsx (2800+ regels) opsplitsen in aparte tab-componenten
- kiosk.py (2600+ regels) opsplitsen in aparte routers
