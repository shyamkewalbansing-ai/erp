# Facturatie.sr - Vastgoed Kiosk ERP

## Origineel Probleem
Migratie van een standalone React/Python KIOSK applicatie (voor vastgoed/appartement huurbetalingen) naar een bestaand full-stack ERP systeem. Vereist: True Kiosk Mode, Admin Dashboard, geïsoleerde authenticatie, stille/automatische bon-printing, robuuste touchscreen ondersteuning, en subdomain routing.

## Architectuur
```
/app/
├── backend/
│   ├── routers/
│   │   └── kiosk.py                 # Core billing logic, Lease endpoints, Auth
│   ├── tests/
│   │   └── test_billing.py          # 8 pytest regressietests voor billing engine
│   └── .env
├── frontend/
│   ├── src/
│   │   └── components/
│   │       └── vastgoed-kiosk/
│   │           └── KioskAdminDashboard.jsx  # Admin dashboard met alle tabs
│   └── .env
└── memory/
    └── PRD.md
```

## Kern Features (Geïmplementeerd)
- Kiosk modus voor huurbetalingen (PIN login)
- Admin Dashboard met tabs: Dashboard, Huurders, Appartementen, Kwitanties, Instellingen, Stroombrekers, Abonnement
- Huurovereenkomsten (Lease Agreements) module met CRUD en auto-generatie
- Automatische billing engine (side-effect op GET /admin/tenants)
- Configureerbare "Huur vervalt op dag" (billing_day) + "Dezelfde/Volgende maand" toggle
- Boete-systeem op basis van vervaldatum
- Skeuomorphic Stroombrekers UI (NIET AANPASSEN)
- Dashboard waarschuwingen voor aflopende huurcontracten

## Billing Engine Semantiek
- **billing_next_month=True ("Volgende maand")**: Due date = billing_day van de VOLGENDE maand. Feb huur vervalt op 24 maart.
- **billing_next_month=False ("Dezelfde maand")**: Due date = billing_day van DEZELFDE maand. Feb huur vervalt op 24 feb.
- Boete wordt toegepast als: openstaand > 0 EN vervaldatum gepasseerd EN nog niet eerder beboet voor die periode
- Idempotent: meerdere aanroepen produceren geen dubbele facturering/boetes

## Sleutel DB Schema
- `kiosk_companies`: billing_day (int), billing_next_month (bool), fine_amount (float)
- `kiosk_tenants`: rent_billed_through (YYYY-MM), last_fine_month (YYYY-MM), outstanding_rent, fines, monthly_rent
- `kiosk_leases`: start_date, end_date, monthly_rent, terms

## API Endpoints
- `GET /api/kiosk/admin/tenants` - Triggers auto-billing side-effects
- `POST /api/kiosk/admin/leases`
- `PUT /api/kiosk/auth/settings`
- `POST /api/kiosk/admin/tenants/{id}/advance-month`

## Wat is Geïmplementeerd
| Datum | Feature/Fix |
|-------|-------------|
| 2026-03 | UI/UX herontwerp Admin Dashboard tabs |
| 2026-03 | Skeuomorphic Stroombrekers interface |
| 2026-03 | Huurovereenkomsten module (CRUD + auto-generatie) |
| 2026-03 | Start/eind datum velden voor huurders → automatische lease |
| 2026-03 | Dashboard waarschuwingsbanner voor aflopende leases |
| 2026-03 | Bewerkbare financiële velden in Edit Tenant modal |
| 2026-03 | Auto-billing engine met rent_billed_through tracking |
| 2026-03 | "Huur vervalt op dag" instelling + Dezelfde/Volgende maand toggle |
| 2026-03-24 | P0 Bug Fix: Billing engine geverifieerd met 8 pytest tests (alle scenario's + idempotency) |

## Gemockt
- Tuya API voor stroombrekers (backend)

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
- KioskAdminDashboard.jsx opsplitsen in kleinere componenten (>1600 regels)

## Testgegevens
- PIN login: 7755 (KEWALBANSING)
- Email: shyam@kewalbansing.com, sushsital@hotmail.com
