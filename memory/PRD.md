# Vastgoed Kiosk ERP — PRD

## Sprint 25 (19 april 2026) — Superadmin: Impersonate + Delete

### Geïmplementeerd:
- **Inloggen als bedrijf** knop (indigo LogIn icoon) per bedrijf in Superadmin dashboard — genereert een company token, slaat op in localStorage, navigeert direct naar het admin dashboard van dat bedrijf (skipt kiosk/select stap)
- **Impersonatie Banner** (oranje) bovenin admin dashboard: "🛡️ U bent ingelogd als [Bedrijf] via Superadmin — ← Terug naar Superadmin" — klikbaar om netjes terug te keren (wist company token + flags)
- **Verwijderen** knop (rood Trash2 icoon) per bedrijf met dubbele bevestiging (gebruiker moet bedrijfsnaam exact overtypen) — cascade verwijdert across 19 gerelateerde collections
- Backend endpoints: `POST /superadmin/companies/{id}/impersonate`, `DELETE /superadmin/companies/{id}`
- Gewijzigd: `superadmin.py`, `SuperAdminDashboard.jsx`, `KioskLayout.jsx` (skip naar admin bij impersonation), `KioskAdminDashboard.jsx` (banner component)

## Sprint 24 (19 april 2026) — Web Push Notifications

### Geïmplementeerd:
- **Web Push (VAPID)** voor PWA op desktop + mobiel, werkt ook als app gesloten is
- **Notification Actions** - "Goedkeuren" + "Bekijken" knoppen op pending approval pushes; Service Worker roept `/api/kiosk/admin/payments/{id}/approve` rechtstreeks aan zonder app te openen
- Auth token persisted in IndexedDB bij subscribe, zodat SW API calls kan doen (push action → approve endpoint met Bearer token)
- VAPID keys gegenereerd en in `backend/.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Dependencies: `pywebpush==2.3.0`, `py-vapid==1.9.4`, `http-ece==1.2.1`
- **Backend** (`/app/backend/routers/kiosk/push.py`):
  - `GET /api/kiosk/public/push/vapid-public-key`
  - `POST /api/kiosk/admin/push/subscribe`
  - `POST /api/kiosk/admin/push/unsubscribe`
  - `GET /api/kiosk/admin/push/subscriptions`
  - `PATCH /api/kiosk/admin/push/subscriptions/{id}` (toggle enabled)
  - `DELETE /api/kiosk/admin/push/subscriptions/{id}`
  - `POST /api/kiosk/admin/push/test`
  - Helper `send_push_to_company()` met auto-cleanup van verlopen (410/404) subscriptions
- **Trigger points** (vuur push naar alle staff devices):
  - `public.py` Kiosk payment endpoint: pending → "Kwitantie wacht op goedkeuring"; auto-approved → "Nieuwe Kiosk betaling"
  - `admin.py` approve endpoint: "Kwitantie goedgekeurd"
  - `admin_operations.py` apply-fines: "Achterstallige huur - Boetes toegepast"
- **Frontend**:
  - Service worker push + notificationclick event handlers in `/app/frontend/public/service-worker.js`
  - Client helper `pushClient.js` (subscribe/unsubscribe/list/toggle/test)
  - `PushNotificationsSettings.jsx` component in nieuwe "Push" sub-tab onder Instellingen
  - Per-device toggle switches + test-knop + status indicator

## Sprint 23 (19 april 2026)

### Geïmplementeerd:
- **Payroll Kalender** in Werknemers tab: grid van werknemers × laatste 6/12 maanden, groen/rood indicator per maand, toont netto bedrag bij betaalde maanden, telt onbetaalde werknemers voor huidige maand, sticky werknemer-kolom voor scrollen
- **Klikbare rode cellen**: "+ Betalen" knop opent direct de Loonstrook modal met prefill (werknemer + periode "maand jaar" + datum = 25e van die maand + maandloon auto-ingevuld)
- Cleanup redundante "Loon Uitbetalen" modal uit `EmployeesTab.jsx` (vervangen door Loonstroken-flow)
- Ongebruikte imports verwijderd (`CheckCircle`, `XCircle`), `Banknote`/`DollarSign` behouden voor summary cards
- Nieuwe bestand: `/app/frontend/src/components/vastgoed-kiosk/admin/PayrollCalendar.jsx`
- `Loonstroken.jsx` accepteert nu `prefillRequest` prop + `LoonstrookModal` accepteert `initialValues` prop
- Auto-refresh payroll kalender wanneer nieuwe loonstrook wordt aangemaakt (via `refreshKey`)

## Sprint 22 (19 april 2026)

### Geïmplementeerd:

**Multi-locatie ondersteuning**
- Nieuwe Admin tab "Locaties" (CRUD: naam + adres)
- `location_id` + `location_name` toegevoegd aan appartementen
- Locatie dropdown in Appartement modal
- Locatie kolom in Appartementen tabel (desktop + mobiel)
- Kiosk: eerst locatie kiezen → daarna appartementen van die locatie
- "Overige" optie voor niet-gekoppelde appartementen
- Backend: `kiosk_locations` collection + CRUD endpoints + public GET

**Losse werkers / aannemers betalen + Kwitantie**
- Nieuwe "Losse Uitbetalingen" sectie in Werknemers tab
- Modal: ontvanger + bedrag + omschrijving + methode (cash/bank) + datum
- Automatisch kwitantie nummer (FR2026-00001 etc)
- Automatische kas-boeking als uitgave
- Printbare A5 kwitantie HTML endpoint
- Lijst met alle uitbetalingen (verwijder + herprinten)
- Tabel toont ontvanger, functie, omschrijving, verwerkt door, bedrag

**Beheerder Auto-Approve**
- Betaling via Kiosk door Beheerder (role=beheerder) → direct approved, saldo updates, WhatsApp
- Handmatige registratie via Admin Dashboard → direct approved
- Kiosk Medewerker / Boekhouder → blijft pending

**RBAC Fixes**
- Kiosk Medewerker: 0 toegang tot Admin Dashboard (blokscherm)
- "Beheerder" knop verborgen voor Kiosk Medewerker in Kiosk header
- Boekhouder: beperkte tabs (dashboard, huurders, kwitanties, kas)

**PIN Login Gecombineerd**
- Eén PIN scherm accepteert zowel bedrijfs-PIN als medewerker-PIN
- Label: "4-cijferige toegangscode (bedrijf of medewerker)"
- Fallback logica: eerst bedrijf, dan medewerker

**Face ID Volledig Verwijderd**
- Face ID button/modal uit CompanySelect
- Face ID tab uit KioskPinEntry
- Face ID settings sectie uit Admin Instellingen
- Face ID registratie uit Huurder modal
- Face ID kolom uit Huurders tabel
- `FaceCapture.jsx` bestand verwijderd

**Kiosk UI Verbeteringen**
- "Code" knop + volledige code-invoer verwijderd uit kiosk
- HuurdersLayout gebruikt nu huurderscode/appartementnummer ipv Face ID
- Receipt toont correcte `remaining_rent/service/fines/internet`
- "Alles betaald!" alleen tonen bij echt voldaan én goedgekeurd
- Pending betaling toont "Betaling ontvangen (wacht op goedkeuring)"

**Betalingsgeschiedenis (Kiosk)**
- Toont "Ontvangen door: [Naam Kiosk Medewerker]"
- Toont "Goedgekeurd door: [Naam Beheerder]" (als anders)

**Admin Kwitanties tabel**
- Nieuwe "Ontvangen door" kolom met processed_by + approved_by (indien anders)
- Mobile variant toont zelfde info

---

## Sprint 20-21 (18 april 2026)

### Geïmplementeerd:

**Betaling Goedkeuring Systeem**
- Alle betalingen → status `pending`, saldo ongewijzigd
- Admin Kwitanties: IN AFWACHTING badge + Goedkeuren/Afwijzen knoppen
- Bij goedkeuring → handtekening popup → saldo update → WhatsApp bevestiging
- Afgewezen betalingen worden NIET verwerkt

**Handtekening bij Goedkeuring**
- Canvas om handtekening te tekenen (touch + muis)
- 1x tekenen → opgeslagen in localStorage → automatisch hergebruikt
- Handtekening als watermerk op de kwitantie PDF (rotated, 12% opacity)

**Werknemer PIN Login**
- Elke werknemer krijgt eigen 4-cijferige PIN
- Kiosk: "Medewerker" knop → PIN invoer → login
- Na login: werknemer naam groen getoond, `processed_by` op betalingen

**Werknemers Rollen Systeem**
- 3 rollen: Beheerder, Boekhouder, Kiosk Medewerker
- Vast/Los (Aannemer) type
- Salary kwitanties bij werknemer betaling
- `processed_by` + `approved_by` op elke betaling en kwitantie

**Financieel Overzicht Fix**
- Alleen goedgekeurde betalingen in saldo/geschiedenis
- Dashboard "In afwachting" stat

### Nog te doen:
- Rol-gebaseerde toegangscontrole (functies per rol beperken)

## Inloggegevens
- Kiosk: shyam@kewalbansing.net / Bharat7755 | PIN: 5678
- SuperAdmin: admin@facturatie.sr / Bharat7755
