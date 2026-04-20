# Vastgoed Kiosk ERP — PRD

## Sprint 34 (20 april 2026) — Auto-reprint definitieve bon na Beheerder approval

### Context:
Na de "Eén-klik goedkeuren met PIN" (Sprint 33) bleef de huurder met een pending bon ("WACHT OP GOEDKEURING") achter. In gemengde teams zou het handig zijn om automatisch een tweede, definitieve bon te printen na approval zodat de huurder een up-to-date versie meekrijgt.

### Geïmplementeerd:
- **`ReceiptTicket.jsx`**: Groene "✓ GOEDGEKEURD DOOR {NAAM}" banner toegevoegd als `payment.status === 'approved' && payment.approved_by` (vervangt de gele WACHT OP GOEDKEURING banner)
- **`ReceiptTicket.jsx`**: QR-code (via `qrcode.react`) toegevoegd onderaan de bon voor approved betalingen, linkt naar `{APP_URL}/api/kiosk/public/receipt/{payment_id}` met label "Scan om te verifiëren / Online kwitantie authentiek"
- **`KioskReceipt.jsx`** — `silentPrint(p?)` accepteert nu optioneel een payment-override en includeert `status`, `approved_by`, `reprint` flags in de thermal-print-server payload
- **`KioskReceipt.jsx`** — `handleApprovePin` roept na succes `silentPrint(updatedPayment)` aan + speelt `playPaperFeedSound()` + toont een groene floating toast "✓ Definitieve bon wordt geprint..." gedurende 4.5s
- **`KioskReceipt.jsx`** — Countdown wordt uitgebreid naar 20s na approval (i.p.v. 5s) zodat de huurder voldoende tijd heeft om de nieuwe bon + saldo te zien

### Tested end-to-end:
- Pending payment SRD 500 Boetes via PIN 1234 → pending bon met WACHT OP GOEDKEURING banner ✅
- Done phase → "Wacht op goedkeuring" amber UI ✅
- Klik Goedkeuren met Beheerder PIN → voer 5678 in → UI switcht naar groen "Betaling geslaagd!" + Boetes SRD 0 + saldo bijgewerkt + groene "✓ Definitieve bon wordt geprint..." toast + countdown terug naar 20 ✅
- Hidden print-receipt DOM rendert approved ReceiptTicket met GOEDGEKEURD banner + QR-code ✅
- Lint clean ✅

## Sprint 33 (20 april 2026) — Eén-klik Beheerder goedkeuring op Kiosk bon

### Context:
In gemengde teams ontvangt een medewerker/boekhouder contant geld via de Kiosk, maar de betaling is pending tot een Beheerder goedkeurt. Voorheen moest de beheerder naar het admin dashboard. Nu kan hij direct naast de Kiosk staan en met zijn PIN goedkeuren.

### Geïmplementeerd:
- **Backend** (`public.py`): Nieuw publiek endpoint `POST /public/{company_id}/payments/{payment_id}/approve-with-pin` dat de company Kiosk PIN óf een employee PIN met `role=beheerder` accepteert. Verifieert PIN, past tenant balances aan, markeert payment als `approved`, stuurt WhatsApp bevestiging + Web Push.
- **Frontend** (`KioskReceipt.jsx`): Amber "Goedkeuren met Beheerder PIN" knop verschijnt in de `done` phase als `status=pending`. Opent een modal met Lock icon, keypad en live validatie. Countdown pauzeert zolang de modal open is.
- **Frontend** (`KioskReceipt.jsx`): `currentPayment` state houdt de huidige status lokaal vast; na succesvolle approve switcht de UI direct van amber/"Wacht op goedkeuring" naar groen/"Alles betaald!" of "Betaling geslaagd!" met bijgewerkte `remaining_*` saldi, zonder page reload of nieuwe payment call.

### Security:
- Only company Kiosk PIN or employee PIN with role `beheerder` accepted; role `boekhouder` / `kiosk_medewerker` krijgt `401 Ongeldige beheerder PIN`.
- Payment must be pending (already approved → `400 Betaling is al goedgekeurd`).

### Tested end-to-end:
- curl: Wrong PIN → 401 ✅; boekhouder PIN 1234 → 401 ✅; company PIN 5678 → 200 approved ✅; replay approve → 400 ✅
- Screenshot: Boekhouder betaalt Boetes SRD 725 → pending UI → klikt "Goedkeuren met Beheerder PIN" → typt 0000 → "Ongeldige beheerder PIN" in rood → typt 5678 → UI switcht naar groen "Alles betaald!" met SRD 0,00 op alle categorieën ✅
- MongoDB: payment `status=approved`, `approved_by=KEWALBANSING`, `approved_at` gezet ✅
- Lint clean ✅

## Sprint 32 (20 april 2026) — Kiosk Receipt UX: pending vs approved styling

### Probleem:
De `KioskReceipt` en `ReceiptTicket` maakten in de "show" phase hardcoded gebruik van groene success styling ("Betaling geslaagd!" + groene check) ongeacht de payment status. Voor een boekhouder/medewerker (non-beheerder) flow met `status: pending` zag de UI er nog steeds uit als succesvol, terwijl de betaling nog op goedkeuring wacht. Ook toonde de bon een misleidende "OPENSTAAND NA BETALING" label met pre-payment saldi.

### Opgelost:
- **`KioskReceipt.jsx`** — Show phase: amber Clock icon + "Betaling ontvangen" + subtitle "Wacht op goedkeuring beheerder" voor pending; groene CheckCircle + "Betaling geslaagd!" voor approved/beheerder
- **`KioskReceipt.jsx`** — Done phase: amber themed card ("Wacht op goedkeuring" titel, "Bedrag (in afwachting)" + Status row) voor pending; groene themed card met saldo breakdown + Totaal openstaand bar voor approved
- **`KioskReceipt.jsx`** — Header: "Betaling ingediend" (pending) vs "Betaling voltooid" (approved)
- **`ReceiptTicket.jsx`** — Voegt "*** WACHT OP GOEDKEURING ***" gele banner toe bovenaan de bon bij pending
- **`ReceiptTicket.jsx`** — "OPENSTAAND (HUIDIG)" label i.p.v. "OPENSTAAND NA BETALING" bij pending (via `hasRemainingData = !isPending && ...`)
- **`ReceiptTicket.jsx`** — Bij pending toont de bon "*** SALDO WORDT BIJGEWERKT NA GOEDKEURING ***" i.p.v. het saldo-overzicht of "*** VOLLEDIG VOLDAAN ***"

### Tested end-to-end:
- Company PIN 5678 (beheerder) → backend returnt `status: approved` + bijgewerkte `remaining_*` → frontend toont groen "Betaling geslaagd!" + correct "Openstaande huur SRD 0,00" ✅
- Employee PIN 1234 (boekhouder) → backend returnt `status: pending` + pre-payment `remaining_*` → frontend toont amber Clock + "Wacht op goedkeuring" + "*** WACHT OP GOEDKEURING ***" banner op bon ✅
- Beide flows verified via live screenshots ✅
- Lint clean: KioskReceipt.jsx + ReceiptTicket.jsx ✅

## Sprint 31 (20 april 2026) — QR Code op Kwitantie

### Geïmplementeerd:
- **Backend** (`admin.py`): `qrcode[pil]` library toegevoegd, QR code server-side gegenereerd als base64 PNG ingebed in HTML
- Nieuwe **publieke endpoint** `GET /public/receipt/{payment_id}` — zonder auth, alleen approved/completed payments, UUID is niet te raden
- Refactored `_render_receipt_html()` — gedeeld tussen `/admin/.../receipt` (token required) en `/public/receipt/...` (public, read-only)
- QR code linkt naar `{APP_URL}/api/kiosk/public/receipt/{payment_id}`
- Visuele design: 80x80px QR rechts onderaan, gestippelde bovenlijn, labels "Scan om te verifiëren" + "Online kwitantie authentiek"

### Tested:
- Admin receipt bevat QR block (6 matches) + PNG data URL ✅
- Public receipt werkt zonder auth → 200 OK, 9175 bytes ✅
- Onbekende payment_id → 404 ✅
- Screenshot toont perfect combinatie: BEHEERDER badge + stempel + QR code op 1 kwitantie ✅

## Sprint 30 (20 april 2026) — Beheerder auto-approve in Kiosk

### Probleem:
Wanneer een beheerder via de Kiosk met Company PIN (5678) inlogde, werden betalingen als `pending` gemarkeerd. Beheerders moesten hun eigen Kwitanties goedkeuren.

### Opgelost:
- **Backend** (`public.py`): `/verify-pin` endpoint returnt nu ook `company_name`
- **Frontend** (`KioskPinEntry.jsx`): bij Company PIN succes wordt een synthetisch `kioskEmployee = {name: company_name, role: 'beheerder', via: 'company_pin'}` doorgegeven
- **Frontend** (`KioskLayout.jsx`): `kioskEmployee` wordt gepersisteerd in sessionStorage (`kiosk_employee_{company_id}`) zodat rol behouden blijft bij page refresh; wordt geladen uit sessionStorage als PIN al eerder is geverifieerd
- Bij "Lock" (uitloggen) worden beide session keys (`kiosk_pin_verified_*` + `kiosk_employee_*`) gewist

### Effect:
- **Company PIN login → rol beheerder** → alle Kiosk betalingen direct `approved`, `processed_by` = company naam, `approved_by` = zelf, factuur direct WhatsApp verstuurd
- **Employee PIN met rol beheerder** → zelfde auto-approve flow, `processed_by` = werknemer naam
- **Employee PIN met rol kiosk_medewerker / boekhouder** → status blijft `pending`, moet beheerder goedkeuren (ongewijzigd)

### Tested end-to-end:
- Company PIN 5678 → sessionStorage `{"name":"KEWALBANSING","role":"beheerder","via":"company_pin"}` ✅
- Header toont "KEWALBANSING · Beheerder" badge ✅
- Kiosk payment met role=beheerder → DB `status=approved`, `processed_by`/`approved_by` = "Shyam Kewalbansing" ✅

## Sprint 29 (20 april 2026) — Mope Webhook

### Geïmplementeerd:
- `POST /public/subscription/mope-webhook` — server-to-server endpoint voor Mope
- 3-way invoice matching: primair via `payment_gateway_id`, fallback via `order_id` prefix (`SAAS-{invoice_id[:8]}`)
- **Alleen** markeert paid bij status in `[paid, completed, success]` — andere statussen (failed, expired, canceled) worden genegeerd
- Altijd 200 response (voorkomt retry-loops van Mope)
- Triggert Web Push notificatie naar alle staff devices: "✅ Abonnement betaald (Mope)"
- `webhook_url` wordt automatisch meegestuurd bij checkout (`{APP_URL}/api/kiosk/public/subscription/mope-webhook`)
- Logger schrijft alle webhook events naar `kiosk.subscription` logger

**Tested** (curl): 4 scenarios — unknown ID, gateway_id match, order_id fallback, failed status ✅

## Sprint 28 (20 april 2026) — Echte Mope/Uni5Pay Gateway voor SaaS

### Geïmplementeerd:
Hergebruikt het bestaande Mope/Uni5Pay patroon uit `payment_gateways.py` (voor Kiosk huurbetalingen) en toegepast op SaaS abonnement facturen.

**Backend** (`subscription.py`):
- `POST /admin/subscription/invoices/{id}/mope-checkout` → echte Mope API call (`https://api.mope.sr/api/shop/payment_request`) of mock als `mock_` prefix; returnt `payment_url` + `payment_id`
- `GET /admin/subscription/invoices/{id}/mope-status/{pid}` → polled Mope status; bij "paid" wordt factuur **automatisch gemarkeerd** als betaald (geen handmatige tussenkomst nodig)
- `POST /admin/subscription/invoices/{id}/uni5pay-checkout` + status endpoint (mock pattern zoals kiosk)
- `GET /superadmin/subscription/payment-methods` → geeft **volledige** config terug (incl. api key) voor superadmin
- **Security**: `mope_api_key` wordt gestript uit `/public/...` en `/admin/subscription` responses — alleen superadmin ziet het

**Frontend**:
- `SubscriptionTab.jsx`: "Betaal via Mope/Uni5Pay" knop roept nu echte checkout endpoint aan → opent `payment_url` in nieuwe tab → polled elke 4s tot max 5 min → toont succesmelding + refresh als betaling wordt gedetecteerd
- Superadmin "Betaalmethoden" dialog vraagt nu ook **Mope API Key** (met hint "gebruik mock_xxx voor test mode")

**Security tested**: `{"detail":"Niet geautoriseerd"}` zonder superadmin token ✅
**End-to-end tested**: mock checkout → handmatig status = paid in DB → poll endpoint → factuur auto-gemarkeerd als `paid` + `marked_paid_by: mope-auto` ✅

## Sprint 27 (20 april 2026) — Betaalbewijs upload + Mope/Uni5Pay

### Geïmplementeerd:
- **Betaalbewijs upload** per openstaande factuur in `Instellingen → Abonnement`: file picker (image/PDF, max 5MB) → base64 → `POST /admin/subscription/invoices/{id}/upload-proof` → status wordt `pending_review`
- **Mope + Uni5Pay** als alternatieve SaaS betaalmethoden:
  - Superadmin config: `POST /superadmin/subscription/payment-methods` (mope_merchant_id, mope_phone, uni5pay_merchant_id, enable/disable per methode)
  - Company: `POST /admin/subscription/invoices/{id}/initiate-payment` met method=mope|uni5pay|bank_transfer → marks pending_review
  - Per open factuur 4 knoppen: 🏦 Bank gestart / Betaal via Mope (oranje) / Betaal via Uni5Pay (blauw) / 📎 Betaalbewijs uploaden
- **Alternatieve betaalmethoden kaart** in Abonnement tab toont Mope/Uni5Pay merchant info met gradient kleuren
- **Superadmin Abonnement Facturen** toont nu per factuur: betaalmethode label + clickable 📎 Betaalbewijs link
- **"Betaalmethoden" knop** naast "Bankgegevens" in superadmin Facturen tab voor configuratie

## Sprint 26 (20 april 2026) — SaaS Subscription Management

### Geïmplementeerd (Superadmin refactor):- **Nieuwe collection** `kiosk_subscription_invoices` + `kiosk_saas_config` (bank_details)
- **Backend** (`subscription.py`): DEFAULT_MONTHLY_PRICE=3000, TRIAL_DAYS=14
  - `GET/POST/DELETE /superadmin/invoices` (filter op status/company)
  - `POST /superadmin/invoices/{id}/mark-paid` + `mark-unpaid`
  - `POST /superadmin/companies/{id}/lifetime` (toggle)
  - `PUT /superadmin/companies/{id}/price` (prijs override per bedrijf)
  - `POST /superadmin/subscription/generate-monthly` (cron/handmatig)
  - `POST /superadmin/subscription/bank-details`
  - `GET /public/subscription/bank-details` (voor registratie scherm)
  - `GET /admin/subscription` (eigen status + facturen)
  - `POST /admin/subscription/invoices/{id}/upload-proof`
- **Register flow** (`auth.py`): zet `subscription_status=trial`, `trial_ends_at=+14d`, `monthly_price=3000`, maakt automatisch eerste factuur aan
- **Superadmin Dashboard refactor**:
  - Bedrijven tabel: Huurders/Appt/Betalingen/Huuromzet kolommen VERWIJDERD. Nieuwe kolommen: Abonnement (Actief/Proef/Achterstallig/Lifetime), Prijs/mnd (klikbaar om te wijzigen), Betaalde fact., Open facturen
  - Acties: status toggle, Lifetime toggle (Crown icoon), handmatige factuur +, Inloggen-als, Verwijderen
  - "Abonnement Facturen" tab (voorheen "Alle Huurbetalingen"): toont SaaS facturen met Mark Paid / Unpaid / Delete
  - "Bankgegevens" knop + "Maand genereren" knop
- **Registratie 2-staps flow** (`CompanySelect.jsx`):
  1. Stap 1: formulier invullen (naam, email, wachtwoord, tel)
  2. Stap 2: bevestigingsscherm met SRD 3.000 groot display, bankgegevens, proef-info → "Account aanmaken & 14 dagen proef starten"
- **Company Dashboard banner** (`KioskAdminDashboard.jsx`): `SubscriptionBanner` toont proef-dagen / achterstallig waarschuwing met bankgegevens (dismiss-baar per sessie)
- **Instellingen → Abonnement sub-tab** (`SettingsTab.jsx`): vervangt oude "Gratis Plan" met echte gekoppelde data — hero kaart met status (Lifetime/Actief/Proef/Achterstallig) + maandbedrag, bankgegevens block, volledige facturen tabel met per/bedrag/status/vervaldatum/betaaldatum

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
