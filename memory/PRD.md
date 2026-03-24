# Facturatie.sr - Vastgoed Kiosk ERP

## Origineel Probleem
Migratie van een standalone React/Python KIOSK applicatie (voor vastgoed/appartement huurbetalingen) naar een bestaand full-stack ERP systeem. Vereist: True Kiosk Mode, Admin Dashboard, geïsoleerde authenticatie, stille/automatische bon-printing, robuuste touchscreen ondersteuning.

## Architectuur
```
/app/
├── backend/
│   ├── routers/
│   │   └── kiosk.py                 # Core billing, Kas, Employees, Leases
│   ├── tests/
│   │   └── test_billing.py          # 8 pytest regressietests
│   └── .env
├── frontend/
│   ├── src/
│   │   └── components/
│   │       └── vastgoed-kiosk/
│   │           ├── KioskAdminDashboard.jsx  # Admin met tabs: Dashboard, Huurders, Appartementen, Kwitanties, Bank/Kas, Werknemers, Instellingen, Stroombrekers, Abonnement
│   │           └── KioskTenantOverview.jsx  # Kiosk huurder overzicht met achterstand maanden
│   └── .env
└── memory/
    └── PRD.md
```

## Kern Features (Geïmplementeerd)
- Kiosk modus voor huurbetalingen (PIN login)
- Admin Dashboard met 9 tabs
- Automatische billing engine met fine/rent berekening
- Configureerbare "Huur vervalt op dag" + "Dezelfde/Volgende maand" toggle
- Achterstand details per maand (welke maanden onbetaald)
- Bank/Kas systeem (inkomsten, uitgaven, kassaldo)
- Werknemers beheer (aanmaken, loon uitbetalen via Kas)
- Professionele huurovereenkomst met bedrijfsstempel (Surinaams recht)
- Huurovereenkomsten module (CRUD + auto-generatie)
- Skeuomorphic Stroombrekers UI (NIET AANPASSEN)
- Dashboard waarschuwingen voor aflopende huurcontracten
- Automatische kas-boekingen bij huurbetalingen

## Billing Engine Semantiek
- **billing_next_month=True ("Volgende maand")**: Due date = billing_day van de VOLGENDE maand
- **billing_next_month=False ("Dezelfde maand")**: Due date = billing_day van DEZELFDE maand
- Boete bij: openstaand > 0 EN vervaldatum gepasseerd
- Idempotent: meerdere aanroepen = geen dubbele facturering

## Sleutel DB Schema
- `kiosk_companies`: billing_day, billing_next_month, fine_amount
- `kiosk_tenants`: rent_billed_through, last_fine_month, outstanding_rent, fines, monthly_rent
- `kiosk_leases`: start_date, end_date, monthly_rent, voorwaarden
- `kiosk_kas`: entry_id, entry_type (income/expense/salary), amount, description, category
- `kiosk_employees`: employee_id, name, functie, maandloon, status

## API Endpoints
- `GET /api/kiosk/admin/tenants` - Triggers auto-billing, returns overdue_months
- `GET /api/kiosk/admin/kas` - Kas boekingen + totalen
- `POST /api/kiosk/admin/kas` - Nieuwe boeking
- `GET /api/kiosk/admin/employees` - Werknemers lijst
- `POST /api/kiosk/admin/employees` - Nieuwe werknemer
- `POST /api/kiosk/admin/employees/{id}/pay` - Loon uitbetalen (via Kas)
- `GET /api/kiosk/admin/leases/{id}/document` - Professionele huurovereenkomst HTML

## Wat is Geïmplementeerd
| Datum | Feature/Fix |
|-------|-------------|
| 2026-03 | UI/UX herontwerp Admin Dashboard tabs |
| 2026-03 | Skeuomorphic Stroombrekers interface |
| 2026-03 | Huurovereenkomsten module (CRUD + auto-generatie) |
| 2026-03 | Auto-billing engine + Instellingen |
| 2026-03-24 | P0: Billing engine geverifieerd (8 pytest tests) |
| 2026-03-24 | Achterstand details per maand in Huurders tab + Kiosk overzicht |
| 2026-03-24 | Bank/Kas tab (inkomsten, uitgaven, kassaldo) |
| 2026-03-24 | Werknemers tab (CRUD + loon uitbetaling via Kas) |
| 2026-03-24 | Professionele huurovereenkomst met bedrijfsstempel |
| 2026-03-24 | Automatische kas-boekingen bij huurbetalingen |

## Gemockt
- Tuya API voor stroombrekers

## Backlog (Geprioriteerd)
### P1
- Tuya API integratie voor stroombrekers

### P2
- Moderniseer "Kwitanties" tab (uniforme tabelstijl + zoeken/filteren)
- SMS/WhatsApp herinneringen
- CSV/PDF export van betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-building support per bedrijf

### Refactoring
- KioskAdminDashboard.jsx opsplitsen in kleinere componenten
