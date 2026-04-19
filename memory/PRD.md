# Vastgoed Kiosk ERP — PRD

## Sprint 23 (19 april 2026)

### Geïmplementeerd:
- **Payroll Kalender** in Werknemers tab: grid van werknemers × laatste 6/12 maanden, groen/rood indicator per maand, toont netto bedrag bij betaalde maanden, telt onbetaalde werknemers voor huidige maand, sticky werknemer-kolom voor scrollen
- Cleanup redundante "Loon Uitbetalen" modal uit `EmployeesTab.jsx` (vervangen door Loonstroken-flow)
- Ongebruikte imports verwijderd (`CheckCircle`, `XCircle`), `Banknote`/`DollarSign` behouden voor summary cards
- Nieuwe bestand: `/app/frontend/src/components/vastgoed-kiosk/admin/PayrollCalendar.jsx`
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
