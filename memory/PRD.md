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
│   │   │   ├── admin.py            # Admin CRUD + combined dashboard-data endpoint
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
│               └── admin/
│                   ├── SettingsTab.jsx        # URL preview + company_id sync
│                   ├── KasTab.jsx             # Verdeling UI
│                   ├── EmployeesTab.jsx       # Partial salary modal
│                   └── ...14 module bestanden
```

## Wat is geïmplementeerd

### Sprint 1-7 (vorige sessies)
- ERP basis, Kiosk terminal, Face ID, PIN-code, betalingsflow
- WhatsApp/Twilio/SMTP notificaties (9 triggers + scheduler)
- Leningen module, Internet module, Tenda router integratie
- SuperAdmin dashboard, SumUp checkout, Meterstanden (later verwijderd)

### Sprint 8-13 (vorige sessie)
- ID Kaart registratie + USB kaartlezer
- SMTP Email integratie
- Code refactoring: Frontend 5317→361 regels, Backend 4905→12 modules
- UI verbeteringen batch

### Sprint 14-17 (vorige sessie)
- Custom Domein koppeling met DNS/SSL verificatie
- Kwitantie Modal fix + Verdeling feature (Bank/Kas)
- Kiosk volledig responsive (VirtualKeyboard verwijderd)
- PIN screen native keyboard fix + custom number pad
- PWA dynamic manifest fix
- Overdue rent calculation fix (huidige maand niet als achterstand)
- Partial salary payments
- Apartments gesorteerd (drag-and-drop + alfabetisch)

### Sprint 18 (12 april 2026) — Performance + Company URL Sync
- **Performance optimalisatie:**
  - Combined `admin/dashboard-data` endpoint (6 API calls → 1)
  - MongoDB indexing op startup via `ensure_indexes()`
  - In-memory caching voor public endpoints (30s TTL)
  - Frontend parallel data loading
  - Snelheid verbeterd van ~830ms naar ~110ms
- **P0 Bug Fix: Bedrijfsnaam & URL Sync**
  - Wanneer bedrijfsnaam wijzigt → slug wordt automatisch geregenereerd
  - Cascade update van `company_id` in alle 15 MongoDB collecties
  - Nieuw JWT token wordt teruggegeven na slug wijziging
  - Frontend toont URL preview onder bedrijfsnaam veld
  - Frontend slaat nieuw token op en redirect naar admin dashboard
  - Cache invalidatie na slug wijziging
- **Bug Fix: KioskLayout preload crash**
  - `setApartments`/`setTenants` werden aangeroepen zonder useState declaratie
  - Veroorzaakte "Bedrijf niet gevonden" foutmelding
  - Opgelost door onnodige preload aanroepen te verwijderen
- **Test resultaat:** 100% backend (11/11), 100% frontend (iteration_92)

## Inloggegevens
- SuperAdmin ERP: admin@facturatie.sr / Bharat7755
- Kiosk Company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678
- Kiosk URL: /vastgoed/kewalbansing

## Productie Deployment
- Server: app.facturatie.sr
- Workflow: git pull → cd frontend → rm -rf build → yarn build → supervisorctl restart
- NOOIT emergentintegrations in requirements.txt
- Service Worker actief — cache versie bumpen bij grote wijzigingen

## Geblokkeerd
- Mope Payment Gateway — wacht op API key (MOCKED)
- Uni5Pay — wacht op API key (MOCKED)

## Key Technical Concepts
- **Mobile-First Kiosk:** PWA manifest dynamisch via Blob URLs, native keyboard onderdrukt op PIN via readOnly
- **API Optimization:** auth/me + admin/tenants + admin/dashboard-data parallel geladen
- **MongoDB Startup Indexes:** Via @app.on_event("startup") in routers/kiosk/__init__.py
- **Company URL Sync:** Bij naam-wijziging → slugify → cascade update 15 collecties → nieuw JWT token

## Prioriteiten

### P0 — Kritiek
- ~~Bedrijfsnaam & URL Sync Bug~~ ✅ (12 april 2026)

### P1 — Hoog
- Kwitanties tab moderniseren (unified table style van rest Admin Dashboard)

### P2 — Medium
- Maandelijks financieel rapport (automatisch)
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-gebouw ondersteuning per bedrijf
