# Facturatie.sr - Product Requirements Document

## Originele Probleemstelling
Bouw en verbeter een volledige Boekhouding (Accounting) applicatie met Nederlandse interface. De focus ligt op het repareren en verbeteren van de Verkoop, Debiteuren, en Crediteuren functionaliteiten.

---

## Vastgoed Kiosk Module (23 maart 2026) ✅ VOLTOOID

### Beschrijving
Volledige migratie van een externe KIOSK applicatie voor huurbetalingen naar de lokale `/vastgoed` route. De module functioneert als een "Mini-SaaS" binnen het bestaande ERP-systeem met eigen authenticatie.

### Voltooide Functionaliteiten

#### Landing Page & Auth
- ✅ Light Mode landing page met Kiosk styling
- ✅ Registratie en login modal (Nederlands)
- ✅ JWT-based authenticatie met `company_id`
- ✅ Kiosk URL generatie voor huurders

#### Admin Dashboard (7 Tabs)
1. ✅ **Dashboard** - Statistieken: Appartementen, Huurders, Openstaande Huur, Boetes, Ontvangen
2. ✅ **Huurders** - Beheer van huurders per bedrijf
3. ✅ **Appartementen** - Appartementenbeheer met status
4. ✅ **Kwitanties** - Betalingshistorie met zoek- en filteropties
5. ✅ **Instellingen** - Facturering, boetes, bedrijfsstempel
6. ✅ **Stroombrekers** - Stroomstatus per appartement (GEMOCKT - Tuya integratie nodig)
7. ✅ **Abonnement** - Plan overzicht (Gratis Plan)

#### Kiosk Mode (Fullscreen)
- ✅ Welkom scherm met bedrijfsnaam en datum
- ✅ Appartement selectie
- ✅ Huurder identificatie (tenant code)
- ✅ Betalingstype selectie (Maandhuur, Servicekosten, Boetes)
- ✅ Betaling bevestiging
- ✅ Kwitantie generatie

### Technische Details

**Backend:** `/app/backend/routers/kiosk.py`
**Frontend:** `/app/frontend/src/components/vastgoed-kiosk/`

**Database Collections:**
- `kiosk_companies` - Bedrijfsaccounts
- `kiosk_apartments` - Appartementen
- `kiosk_tenants` - Huurders
- `kiosk_payments` - Betalingen

**API Endpoints:**
- `POST /api/kiosk/auth/register` & `/login`
- `GET /api/kiosk/public/{company_id}/company`
- `GET /api/kiosk/public/{company_id}/tenants`
- `POST /api/kiosk/public/{company_id}/payment`
- `GET /api/kiosk/admin/dashboard`
- `POST /api/kiosk/admin/apply-fines`

### Updates 23 maart 2026

#### Kwitantie Verbeteringen ✅
1. **Maand weergave toegevoegd** - Bij gedeeltelijke/volledige huurbetalingen wordt nu de betalingsmaand duidelijk getoond:
   - Nieuwe "Voor welke maand?" sectie in betalingsflow
   - Maand keuze uit huidige maand + 3 voorgaande maanden
   - Maand getoond in bevestigingsscherm
   - **Prominente oranje box** op kwitantie: "HUURBETALING VOOR [Maand]"
   
2. **Dynamische bedrijfsnaam** - De kwitantie toont nu de echte bedrijfsnaam van de gebruiker:
   - Header toont bedrijfsnaam in plaats van "APPARTEMENT KIOSK SURINAME"
   - Initialen worden automatisch gegenereerd uit bedrijfsnaam
   - Bedrijfsstempel rechtsonder met bedrijfsnaam

3. **Layout fix betalingsscherm** - "Volgende" knop nu altijd zichtbaar onderaan scherm

#### Kiosk PIN Beveiliging ✅
1. **4-cijferige PIN code** voor kiosk toegang:
   - Admin kan PIN instellen in Instellingen tab
   - Huurders moeten PIN invoeren voordat ze de kiosk kunnen gebruiken
   - PIN wordt opgeslagen per bedrijf
   - Session-based verificatie (hoeft maar 1x per sessie)

2. **PIN invoer scherm**:
   - Professioneel beveiligd scherm met bedrijfsnaam
   - Nummerpad voor PIN invoer
   - Foutmelding bij verkeerde PIN
   - "Terug naar home" optie

#### Verbeterde Print Functie ✅
- Print functie nu via iframe (betrouwbaarder dan popup)
- Betere error handling
- A4 formaat met exacte kleuren

#### Gewijzigde Bestanden
- `frontend/src/components/vastgoed-kiosk/ReceiptTicket.jsx` - Dynamische bedrijfsnaam, prominente maand box
- `frontend/src/components/vastgoed-kiosk/KioskPaymentSelect.jsx` - Maand selectie, vaste Volgende knop
- `frontend/src/components/vastgoed-kiosk/KioskPaymentConfirm.jsx` - Maand weergave
- `frontend/src/components/vastgoed-kiosk/KioskPinEntry.jsx` - NIEUW: PIN invoer component
- `frontend/src/components/vastgoed-kiosk/KioskLayout.jsx` - PIN verificatie flow
- `frontend/src/components/vastgoed-kiosk/KioskAdminDashboard.jsx` - PIN instellingen sectie
- `frontend/src/components/vastgoed-kiosk/KioskReceipt.jsx` - Verbeterde print functie
- `backend/routers/kiosk.py` - PIN endpoints en /auth/me uitgebreid

### Toekomstige Taken (Backlog)
- P1: Tuya API integratie voor echte stroombrekers
- P2: SMS/WhatsApp herinneringen
- P2: CSV/PDF export van betalingsrapporten
- P2: Multi-building support per bedrijf
- P2: E-mail notificaties voor verlopen abonnementen

---

## Huidige Sessie Updates (9 maart 2026)

### Voltooide Werkzaamheden

#### 1. Verkoop Pagina Fixes
- ✅ **Email modal met bewerkbare velden** - Gebruiker kan nu onderwerp en bericht aanpassen voor verzending
- ✅ **Factuurnummer en datum weergave** - Nu correct weergegeven in de facturen lijst
- ✅ **Print functie** - Opent nu direct een print dialoog in plaats van PDF download
- ✅ **Email versturen** - Retourneert nu correcte success response (was eerder fout)
- ✅ **debiteur_email** - Email adres wordt nu correct opgehaald van klantgegevens

#### 2. PDF Design Verbeteringen
- ✅ **Nieuw design** gebaseerd op gebruiker referentie:
  - Logo met initialen in groene cirkel
  - Bedrijfsnaam naast logo
  - "FACTUUR" titel prominent
  - Donkerblauwe diagonale streep rechtsboven
  - Groene diagonale streep rechtsonder
  - Tabel met groene header
  - Betalingsvoorwaarden sectie
  - Totaal met groene achtergrond
  - Handtekening sectie

#### 3. Email Service Fixes
- ✅ MIME structuur gecorrigeerd voor emails met bijlagen
- ✅ Betere Nederlandse foutmeldingen voor SMTP errors
- ✅ Consistente UnifiedEmailService gebruikt voor alle emails

#### 4. Backend Data Normalisatie
- ✅ `nummer` en `datum` velden worden nu consistent teruggegeven naast `factuurnummer` en `factuurdatum`
- ✅ `debiteur_email` wordt dynamisch opgehaald als niet aanwezig in factuur

### Gewijzigde Bestanden
- `backend/routers/boekhouding_legacy.py` - Email endpoint, data normalisatie
- `backend/services/pdf_generator.py` - Volledig nieuw design met decoratieve elementen
- `backend/services/unified_email_service.py` - MIME fix voor bijlagen
- `frontend/src/pages/boekhouding/VerkoopPage.js` - Email modal, print functie, data display

## Nog Te Verifiëren Door Gebruiker

### P1 - Verificatie Vereist
1. **Debiteuren pagina** - Delete button en View modal
2. **Crediteuren pagina** - Delete button en View modal
3. **HRM/Grootboek integratie** - Loonbelasting (2360) en AOV (2380) journaalposten
4. **Kostenplaatsen** - Pagina en functionaliteit

## Bekende Problemen (Backlog)

### P2 - PWA Offline Functionaliteit
- Service worker is defect
- Offline data synchronisatie (`offlineDb.js`) werkt niet
- Twee redundante offline indicators moeten worden geconsolideerd

### P3 - Live Chat Systeem
- Niet afgemaakt

## Technische Architectuur

### Frontend
- React met Tailwind CSS
- Shadcn UI componenten
- lucide-react iconen

### Backend
- FastAPI (Python)
- MongoDB database

### Key Collections
- `boekhouding_verkoopfacturen`
- `boekhouding_debiteuren`
- `boekhouding_crediteuren`
- `boekhouding_offertes`
- `boekhouding_journaal`

## Deployment Instructies

Om updates naar productie te deployen:
```bash
cd /home/facturatie/htdocs/facturatie.sr
git pull origin main
cd frontend && yarn build
sudo supervisorctl restart facturatie-backend facturatie-frontend
```

## Test Credentials
- Email: demo@facturatie.sr
- Password: demo2024
