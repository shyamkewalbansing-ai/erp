# Vastgoed Kiosk ERP — Product Requirements Document

## Origineel Probleem
Full-stack ERP systeem voor vastgoed/appartement huurbetalingen met een geïntegreerde KIOSK applicatie (Albert Heijn self-checkout stijl). Bevat Face ID login, PIN-code authenticatie, en mock/echte betaalmethoden.

## Architectuur
```
/app/
├── backend/
│   ├── routers/
│   │   ├── kiosk/
│   │   │   ├── __init__.py          # MongoDB index startup
│   │   │   ├── base.py             # Router, DatabaseProxy, helpers, modellen
│   │   │   ├── auth.py             # Auth + settings (company_id slug sync)
│   │   │   ├── admin.py            # Admin CRUD + combined dashboard-data + receipt HTML
│   │   │   ├── admin_operations.py # Verdeling, employees, kas, fines
│   │   │   ├── public.py           # Public kiosk endpoints (cached)
│   │   │   ├── payment_gateways.py # SumUp, Mope, Uni5Pay
│   │   │   ├── messaging.py        # WhatsApp, Twilio, email
│   │   │   ├── devices.py          # Shelly stroombrekers
│   │   │   ├── loans.py            # Leningen module
│   │   │   ├── superadmin.py       # SuperAdmin dashboard
│   │   │   ├── faceid.py           # Face ID registratie/herkenning
│   │   │   └── scheduler.py        # Dagelijkse notificaties
│   └── server.py                    # FastAPI server + ERP auth
├── frontend/
│   └── src/
│       └── components/
│           └── vastgoed-kiosk/
│               ├── KioskLayout.jsx           # Mobile layout + PWA manifest
│               ├── KioskAdminDashboard.jsx   # Admin orchestrator (combined endpoint)
│               ├── ReceiptTicket.jsx         # Receipt preview component
│               └── admin/
│                   ├── PaymentsTab.jsx       # Kwitanties + stored remaining balances
│                   ├── SettingsTab.jsx        # URL preview + company_id sync
│                   ├── KasTab.jsx             # Verdeling UI
│                   ├── EmployeesTab.jsx       # Partial salary modal
│                   └── ...14 module bestanden
```

## Wat is geïmplementeerd

### Sprint 1-17 (vorige sessies)
- ERP basis, Kiosk terminal, Face ID, PIN-code, betalingsflow
- WhatsApp/Twilio/SMTP notificaties (9 triggers + scheduler)
- Leningen module, Internet module, Tenda router integratie
- SuperAdmin dashboard, SumUp checkout
- ID Kaart registratie + USB kaartlezer
- Code refactoring: Frontend 5317→361 regels, Backend 4905→12 modules
- Custom Domein koppeling met DNS/SSL verificatie
- Kwitantie Modal fix + Verdeling feature (Bank/Kas)
- Kiosk volledig responsive (VirtualKeyboard verwijderd)
- PIN screen + custom number pad, PWA manifest fix
- Overdue rent calculation fix, Partial salary payments
- Apartments gesorteerd (drag-and-drop + alfabetisch)

### Sprint 18 (12 april 2026) — Performance + Company URL Sync
- **Performance optimalisatie:** Combined endpoint, MongoDB indexes, caching (~830ms→~110ms)
- **P0 Bug Fix: Bedrijfsnaam & URL Sync** — Slug regeneratie + cascade update 15 collecties + nieuw JWT token
- **Bug Fix: KioskLayout preload crash** — setApartments/setTenants zonder useState verwijderd
- Test: 100% backend (11/11), 100% frontend (iteration_92)

### Sprint 19 (12 april 2026) — Kwitanties Bug Fixes
- **Bug Fix: Onjuist openstaand saldo op kwitantie** — Backend slaat nu `remaining_rent`, `remaining_service`, `remaining_fines`, `remaining_internet` op in het betaling-document bij registratie
- **Bug Fix: Onjuiste Openstaand kolom** — Frontend toont nu het opgeslagen resterende saldo per betaling, niet het huidige huurder-saldo
- **Bug Fix: Afdrukken lege pagina** — Print knop opent nu de backend HTML receipt in een nieuw tabblad (via `/admin/payments/{id}/receipt?token=xxx`) i.p.v. CSS print hack
- **Verbetering: Backend receipt** — Type labels uitgebreid (rent, partial_rent, internet), covered_months weergave, "Openstaand na betaling" sectie toegevoegd
- Test: 100% backend (8/8), 100% frontend (iteration_93)

## Inloggegevens
- SuperAdmin ERP: admin@facturatie.sr / Bharat7755
- Kiosk Company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678
- Kiosk URL: /vastgoed/kewalbansing

## Productie Deployment
- Server: app.facturatie.sr
- Workflow: git pull → cd frontend → rm -rf build → yarn build → supervisorctl restart
- NOOIT emergentintegrations in requirements.txt

## Geblokkeerd
- Mope Payment Gateway — wacht op API key (MOCKED)
- Uni5Pay — wacht op API key (MOCKED)

## Prioriteiten

### P1 — Hoog
- Kwitanties tab moderniseren (unified table style van rest Admin Dashboard)

### P2 — Medium
- Maandelijks financieel rapport (automatisch)
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-gebouw ondersteuning per bedrijf
