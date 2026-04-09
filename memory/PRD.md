# Vastgoed Kiosk ERP — Product Requirements Document

## Origineel Probleem
Full-stack ERP systeem voor vastgoed/appartement huurbetalingen met een geïntegreerde KIOSK applicatie (Albert Heijn self-checkout stijl). Bevat Face ID login, PIN-code authenticatie, en mock/echte betaalmethoden.

## Architectuur
```
/app/
├── backend/
│   ├── routers/kiosk.py          # Kiosk API logica
│   └── server.py                 # FastAPI server + ERP auth
├── frontend/
│   ├── public/
│   │   ├── models/               # face-api.js model bestanden (.bin + manifest)
│   │   └── service-worker.js     # SW v3 — model bestanden uitgesloten van cache
│   └── src/
│       ├── components/
│       │   ├── Layout.js         # Hoofd sidebar (Admin links)
│       │   ├── VastgoedKioskManager.jsx
│       │   └── vastgoed-kiosk/
│       │       ├── KioskLayout.jsx
│       │       ├── KioskAdminDashboard.jsx  # Admin dashboard (bottom: 12vh fix)
│       │       ├── FaceCapture.jsx          # Face ID (rAF loop, geluid, responsive)
│       │       ├── HuurdersLayout.jsx       # Huurders portaal (responsive)
│       │       ├── KioskApartmentSelect.jsx
│       │       └── ...overige kiosk componenten
│       └── pages/
│           ├── Admin.js
│           └── App.js
```

## Wat is geïmplementeerd

### Sprint 1 (vorige sessies)
- ERP basis: facturen, klanten, producten, boekhouding modules
- Kiosk terminal: Face ID login, PIN-code, betalingsflow
- SuperAdmin dashboard met bedrijfsbeheer
- WhatsApp integratie (backend)
- SumUp checkout integratie

### Sprint 2 (vorige sessie)
- SuperAdmin tabs verplaatst naar sidebar in Layout.js
- `emergentintegrations` verwijderd uit requirements.txt (productie fix)
- FaceCapture.jsx eerste patches (race condition)

### Sprint 3 (huidige sessie — 29 maart 2026)
- **Face ID model .bin fix**: Shard bestanden hernoemd naar .bin extensie + manifesten bijgewerkt — Nginx serveerde index.html i.p.v. binaire modeldata
- **Service Worker v3**: Cache versie gebumpt, model bestanden uitgesloten van SW caching
- **FaceCapture.jsx volledig herschreven**:
  - requestAnimationFrame detectie loop (smooth, geen jank)
  - Camera start direct (modellen laden op achtergrond)
  - Geluid bij gezichtsherkenning (Web Audio API twee-tonen chime)
  - Adaptive camera resolutie (320x240 mobiel, 640x480 desktop)
  - Professionele scanning UI (hoek brackets + scan line animatie)
  - Try/catch om detectSingleFace met automatisch model-herlaad
- **HuurdersLayout.jsx volledig responsive**: Werkt op alle telefoons
  - Flexbox layout met shrink-0 bottom bar
  - Responsive tekst, knoppen, spacing
  - `min-h-dvh` voor correcte mobiele viewport
- **KioskLayout scroll fix**: overflow-y-auto voor alle stappen
- **KioskAdminDashboard scroll fix**: `bottom: 12vh` zodat content niet achter bottom bar verdwijnt
- **Maandhuur auto-fill**: Bij appartement selectie wordt huur + borg automatisch ingevuld
- **Appartement dropdown filter**: Bezette appartementen verborgen bij nieuwe huurder, zichtbaar wanneer vrij
- **Surinaamse tijd**: Live klok (America/Paramaribo) op admin dashboard
- **KioskApartmentSelect**: h-full verwijderd van grid — alle appartementen scrollbaar

### Sprint 4 (29 maart 2026)
- **Mobiele responsiveness fix voor alle Kiosk betaalschermen** (P0):
  - `KioskTenantOverview.jsx`: flex-col op mobiel, md:flex-row op desktop
  - `KioskPaymentSelect.jsx`: Betalingstypen + keypad stapelen verticaal op mobiel
  - `KioskPaymentConfirm.jsx`: Betaalmethode kaarten responsive grid/flex-wrap
  - `PaymentConfirm.jsx`: w-full md:w-1/2 layout
  - Alle headers responsive met flex-wrap en truncate
  - Huurder variant card breedte verlaagd van 500px min naar 300px
  - Getest met testing agent: 100% pass rate op mobiel (375px) én desktop (1920px)

### Sprint 5 (30 maart 2026) — Geautomatiseerde Notificaties
- **9 WhatsApp/Twilio Notificatie Triggers geïmplementeerd:**
  1. Stroombreker UIT → bericht naar huurder (`shelly_off`)
  2. Stroombreker AAN → bericht naar huurder (`shelly_on`)
  3. Salaris uitbetaald → bericht naar werknemer (`salary_paid`)
  4. Betalingsbewijs → bericht naar huurder (`payment_confirmation`) — al bestaand
  5. Huurprijs gewijzigd → melding naar actieve huurders (`rent_updated`)
  6. Nieuw huurcontract → bericht naar huurder (`lease_created`)
  7. Huur verschuldigd → dagelijkse herinnering via scheduler (`rent_reminder` / `rent_due_today`)
  8. Boete opgelegd → bericht per huurder (`fine_applied`)
  9. Huurcontract bijna verlopen → wekelijkse waarschuwing via scheduler (`lease_expiring`)
- **Dagelijkse Kiosk Scheduler:** Achtergrondtaak die om 08:00 Suriname-tijd draait voor huur-herinneringen (3 dagen voor + op vervaldatum) en contract-verloop waarschuwingen (30 dagen van tevoren, max 1x per week)
- **Handmatig trigger endpoint:** `POST /api/kiosk/admin/daily-notifications` voor directe controle
- **Notificatie Logboek tab:** Nieuwe "Notificaties" tab in admin dashboard met:
  - Statistieken (totaal/verzonden/mislukt)
  - Zoek op huurder of telefoon
  - Filter op berichttype (15+ types) en status
  - Paginering (50 per pagina)
  - "Herinneringen versturen" handmatige trigger knop
  - Uitklapbaar berichtdetail
- **100% backend test pass rate** (iteration_84)

### Sprint 6 (30 maart 2026) — Leningen Module
- **Leningen (Loans) tab** in admin dashboard:
  - Aanmaken: huurder selectie, leningbedrag, maandelijkse aflossing, startdatum, omschrijving
  - Overzicht: totaal geleend, totaal afgelost, openstaand, voortgangsbalk per lening
  - Aflossingen: flexibel bedrag OF vast maandbedrag, snelknoppen (maandelijks/volledig)
  - Detail modal: volledige betaalgeschiedenis met datum, bedrag, methode, resterend
  - Filter op status (actief/afgelost), verwijderen
  - Auto-markering "afgelost" wanneer saldo = 0
  - Meerdere leningen per huurder mogelijk
- **Backend validatie:** Overpayment geblokkeerd (bedrag > openstaand saldo)
- **WhatsApp notificaties:** Automatisch bij nieuwe lening (`loan_created`) en aflossing (`loan_payment`)
- **Backend test pass rate:** 76% → 100% na overpayment fix (iteration_85)
- **Frontend test pass rate:** 100% (iteration_85)

### Sprint 7 (30 maart 2026) — Meterstanden Module (EBS/SWM)
- **Meterstanden sectie** in Stroombrekers tab:
  - Per appartement: oude stand, nieuwe stand, verbruik (kWh/m³), kosten
  - EBS (stroom) tarief: SRD 2,28/kWh (residentieel Suriname 2025)
  - SWM (water) tarief: SRD 35,26/m³ (residentieel Suriname 2025-2026)
  - Maandelijks handmatig invoeren, vorige stand wordt automatisch oude stand
  - "Doorberekenen" knop: voegt nutskosten toe aan huurder servicekosten
  - Tarieven aanpasbaar via Tarieven modal
  - WhatsApp notificatie bij doorberekenen (`meter_charge`)
- **Backend test pass rate:** 82% (17 tests, 3 test script issues) — alle endpoints werken correct
- **Frontend test pass rate:** 100% (iteration_86)

## Inloggegevens
- SuperAdmin ERP: admin@facturatie.sr / Bharat7755
- Kiosk Company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678

## Productie Deployment
- Server: app.facturatie.sr
- Workflow: git pull → cd frontend → rm -rf build → yarn build → supervisorctl restart
- NOOIT emergentintegrations in requirements.txt
- Service Worker actief — cache versie bumpen bij grote wijzigingen

## Geblokkeerd
- Mope Payment Gateway — wacht op API key
- Uni5Pay — wacht op API key

### Sprint 8 (30 maart 2026) — Internetaansluiting Fix
- **P0 Fix:** `Edit3` icon vervangen door `Pencil` in InternetTab component → Frontend crash opgelost
- Internet tab volledig functioneel: plannen CRUD, huurder toewijzing, kosten overzicht

### Sprint 9 (30 maart 2026) — Internet Integratie Overal
- **Dashboard overzicht:** "Open Internet" stat toegevoegd met Wifi icon en `total_internet` backend API
- **Huurders tab:** Internet kolom toont openstaande internetkosten per huurder met plannaam
- **Kiosk Financieel overzicht (KioskTenantOverview):** Internet in items lijst met Wifi icon + opgenomen in totaal
- **Betaalflow (KioskPaymentSelect):** Internet als selecteerbaar betaaltype (verlaagt `internet_outstanding`)
- **Kwitantiebonnen (ReceiptTicket + HuurdersReceipt):** Internet in "Openstaand na betaling" sectie + TYPE_LABELS
- **Backend:** Alle tenant endpoints (admin + publiek) retourneren nu internet-velden
- **Backend:** `remaining_internet` in payment responses, `internet` als betaaltype
- **Backend:** Bij toewijzen internet plan wordt `internet_outstanding` direct verhoogd met eerste maand
- **WhatsApp berichten:** Internet meegenomen in totaal resterend saldo
- **100% test pass rate** (iteration_87: 13/13 backend, alle frontend tests)

### Sprint 10 (30 maart 2026) — Meterstanden Verwijderd + Tenda Router Integratie
- Hele Meterstanden (EBS/SWM) functionaliteit verwijderd op verzoek gebruiker
- Frontend: MeterReadingsSection component, sub-tab toggle, ~409 regels verwijderd
- Backend: 5 meter endpoints + MeterReadingCreate model verwijderd, ~205 regels
- Stroombrekers tab toont nu alleen het Shelly paneel (schoon, geen sub-tabs)
- **Internet tab:** Verwijder-knop toegevoegd bij huurder internetaansluitingen
- **Tenda AC1200 Router Integratie:**
  - CRUD routers per huurder (koppelen aan tenant, IP + admin wachtwoord)
  - Internet aan/uit zetten per router (via Tenda goform API)
  - Status checken + verbonden apparaten bekijken
  - Backend endpoints: `/admin/tenda/routers`, `/admin/tenda/routers/{id}/control`, `/admin/tenda/routers/{id}/status`
  - Frontend: Router kaarten met aan/uit toggle, status check, apparaten modal
### P0
- ~~9 Geautomatiseerde WhatsApp/Twilio Notificaties~~ ✅ (30 maart 2026)
- ~~Internetaansluiting tab crash fix~~ ✅ (30 maart 2026)
- ~~Refactoring monolithische bestanden~~ ✅ (30 maart 2026)

### Sprint 11 (30 maart 2026) — ID Kaart Registratie + USB Kaartlezer
- Nieuwe "ID Kaart" sub-tab binnen Huurders
- USB kaartlezer integratie in Huurder modal
- Backend: id_card velden in TenantCreate/Update

### Sprint 12 (30 maart 2026) — SMTP Email Integratie
- Email SMTP sectie in Instellingen tab (host, poort, email, wachtwoord, aan/uit toggle)
- Dual-notificatie systeem: WhatsApp + Email gelijktijdig bij alle triggers
- Handmatige "Mail" knop naast WhatsApp in Huurders tabel
- Backend: `/admin/email/test` en `/admin/email/send` endpoints
- `aiosmtplib` voor async email verzending

### Sprint 13 (30 maart 2026) — Code Refactoring
- **Frontend:** `KioskAdminDashboard.jsx` opgesplitst: 5317 → 361 regels (orchestrator)
  - 14 module bestanden in `/admin/` directory
  - Gedeelde utils (API, formatSRD, getInitials)
  - Elke tab en modal als apart bestand
- **Backend:** `kiosk.py` opgesplitst: 4905 → Python package met 12 modules
  - `base.py` (480r): Router, DatabaseProxy, helpers, modellen
  - `auth.py` (152r), `admin.py` (1028r), `admin_operations.py` (922r)
  - `public.py` (375r), `payment_gateways.py` (320r), `messaging.py` (354r)
  - `devices.py` (511r), `loans.py` (201r), `superadmin.py` (185r)
  - `faceid.py` (171r), `scheduler.py` (236r)
- **Test resultaat:** 100% backend (23/23), 100% frontend (10/10 tabs)

### Sprint 14 (30 maart 2026) — UI Verbeteringen Batch
- Verlopen huurovereenkomst melding verwijderd van Dashboard (alleen "binnen 30 dagen" waarschuwing)
- Internet optie toegevoegd aan Bedrag Toevoegen / Betaling modal
- Kwitanties tab: Openstaand saldo kolom toegevoegd
- Kwitantie bekijken: Alleen bon weergave (geen toolbar)
- Bank/Kas: Huurinkomsten en Kassaldo bedragen in zwart
- WhatsApp/Email/Loon acties: Popup modals i.p.v. browser confirm/alert
- Notificaties log: Verschonen knop met backend DELETE endpoint

### Sprint 15 (7 april 2026) — Custom Domein Koppeling
- Nieuwe "Domein" sub-tab in Instellingen (naast Instellingen + Notificaties)
- Domeinnaam invoerveld met normalisatie (lowercase, strip http/https)
- Landingspagina keuze: Kiosk Betaalpagina of Login Pagina (configureerbaar per bedrijf)
- DNS Configuratie instructies (CNAME record met kopiëer knoppen)
- DNS Verificatie: checkt CNAME/A records (niet meer tegen hardcoded preview domein)
- SSL Certificaat check met duidelijke instructies (Let's Encrypt / Cloudflare)
- Frontend routing via CustomDomainResolver: onbekende domeinen → lookup → redirect naar juiste kiosk
- Backend: `/admin/domain/verify`, `/admin/domain/lookup` endpoints
- DB: `custom_domain`, `custom_domain_landing` velden in kiosk_companies

### Sprint 16 (8-9 april 2026) — Kwitantie Modal Fix + Verdeling Feature
- Kwitantie preview modal: max-h verlaagd van 95vh naar 85vh zodat "Afdrukken" en "Sluiten" knoppen altijd zichtbaar zijn
- **Verdeling feature in Bank/Kas**: Rekeninghouders beheer (CRUD), percentageverdeling van huurinkomsten, preview overzicht, uitvoeren als kas-boekingen
  - Backend: 5 nieuwe endpoints (`/admin/verdeling/rekeninghouders` CRUD, `/admin/verdeling/overzicht`, `/admin/verdeling/uitvoeren`)
  - Frontend: KasTab herbouwd met sub-tab switcher (Bank/Kas + Verdeling views)
  - DB: nieuwe collectie `kiosk_rekeninghouders`
- Dode code: Oude KasTab functie (180 regels) verwijderd uit SettingsTab.jsx

### P1
- Kwitanties tab moderniseren (unified table style)

### P2
- Maandelijks financieel rapport (automatisch)
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-gebouw ondersteuning per bedrijf
