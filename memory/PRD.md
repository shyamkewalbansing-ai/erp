# Facturatie.sr - Product Requirements Document

## Originele Probleemstelling
De gebruiker wil een uitgebreide Boekhouding (Accounting) module bouwen die specifiek is afgestemd op de Surinaamse markt.

## User's Preferred Language
Dutch (Nederlands)

---

## Wat is Voltooid (Maart 2026)

### ✅ Boekhouding Module Redesign (NIEUW - 1 maart 2026)
- **15 pagina's geünificeerd:** Alle pagina's hebben nu dezelfde design als VerkoopPage
- **Consistente statistiek kaarten:** Elke pagina heeft nu 4 StatCards met dezelfde styling
- **Kleurenpalet gestandaardiseerd:** Alle `slate-` kleuren vervangen door `gray-` voor consistentie
- **Moderne UI elementen:** `rounded-2xl` borders, `shadow-sm hover:shadow-md` transitions
- **InkoopPage volledig herontworpen:** Nu met 4 kaarten, tabs, zoekbalk en detail sidebar
- **VoorraadPage verbeterd:** Van 3 naar 4 statistiek kaarten

**Alle herontworpen pagina's:**
1. VerkoopPage (template)
2. InkoopPage ✅
3. VoorraadPage ✅
4. CrediteruenPage ✅
5. BTWPage ✅
6. BankKasPage ✅
7. GrootboekPage ✅
8. DebiteruenPage ✅
9. ProjectenPage ✅
10. RapportagesPage ✅
11. WisselkoersenPage ✅
12. HerinneringenPage ✅
13. DocumentenPage ✅
14. AuditTrailPage ✅
15. InstellingenPage ✅
16. VasteActivaPage ✅

### ✅ Dashboard Live Data Koppeling (28 feb 2026)
- **Live financiële data:** Total Income, Expense, Savings nu gekoppeld aan backend API
- **Live grafiekdata:** Omzet/Kosten per maand grafiek toont nu echte data uit `/dashboard/charts`
- **Wisselkoersen:** USD/SRD en EUR/SRD worden live weergegeven
- **Kas Balans:** Toont echte bank/kas saldo
- **Openstaand Debiteuren:** Live bedrag en aantal facturen
- **Top Klanten:** Dynamische lijst op basis van omzet
- **Quick Actions:** Vernieuwd naar POS, Factuur, Inkoop, Grootboek

### ✅ Debiteuren Page Redesign (NIEUW - 28 feb 2026)
- **FinSight design:** Zelfde stijl als Grootboek pagina
- **4 StatCards:** Totaal Debiteuren, Verkoopfacturen, Openstaand, Totaal Gefactureerd
- **Moderne tabs:** Klanten / Verkoopfacturen met emerald accent
- **Filter functionaliteit:** Zoeken en status filter op facturen
- **Consistente UI:** Rounded-2xl cards, shadow-sm, slate kleuren

### ✅ Barcode in Voorraad (28 feb 2026)
- **Barcode veld** toegevoegd aan "Nieuw Product" formulier
- **Barcode veld** toegevoegd aan "Product Bewerken" formulier
- **Barcode kolom** zichtbaar in producten tabel met barcode icoon
- **Camera scanner dialoog** voor barcode scannen met telefoon/webcam
- **Backend ondersteuning** - ArtikelCreate model uitgebreid met barcode field
- **POS integratie** - Producten kunnen gevonden worden via barcode scan

### ✅ Point of Sale (POS) - Volledig Uitgebreid

#### Camera Barcode Scanner
- **html5-qrcode library** geïntegreerd
- **Start/Stop Camera** knoppen
- **Ondersteunde formaten**: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, etc.
- **Automatisch toevoegen**: Product wordt direct aan winkelwagen toegevoegd na scan
- **Error handling**: Duidelijke foutmeldingen bij camera problemen
- **Cross-platform**: Werkt op telefoon, tablet en laptop

#### Publieke Mobiele Scanner
- **Login-vrije** scanner pagina op `/scan/:sessionCode`
- **QR-code generatie** vanuit POS om mobiele scanner te koppelen
- **Real-time sync** - Gescande producten verschijnen direct in hoofd-POS winkelwagen

#### Wisselgeld Berekening
- Bedrag invoeren met snelle knoppen ($5-$500 + Exact)
- Automatische wisselgeld berekening

#### Korting Toepassen
- Percentage of vast bedrag korting
- Preview en verwijderbaar

#### Klant Koppelen
- Selecteer debiteur uit lijst
- Opslaan bij verkoop

#### Bon Printen
- PDF kassabon (80mm formaat)

#### Correcte Grootboek Koppeling
- Contant → Kas rekening
- Pin → Bank rekening

### ✅ Alle Eerdere Features
- Logo Upload
- MT940 Bankimport
- PDF Factuur Generatie
- E-mail Verzending
- Excel Export
- Surinaamse Belastingrapportages
- CME.sr Wisselkoers Integratie
- Multi-tenant Ondersteuning

---

## Backlog / Toekomstige Taken

### P1 - Hoog Prioriteit
- [ ] **Backend Refactoring:** `boekhouding_legacy.py` (5300+ regels) opsplitsen
- [ ] **Verifieer POS-Grootboek Koppeling:** Controleer of contante/pin betalingen correct worden geboekt
- [ ] **Multi-tenancy:** Alle queries filteren op `bedrijf_id`

### P2 - Middel Prioriteit
- [ ] **Frontend Refactoring:** `POSPage.js` (1400+ regels), `VerkoopPage.js` en `VoorraadPage.js` opsplitsen
- [ ] **POS Hardware:** Kassalade, thermische printer, betaalterminal
- [ ] **Kassarapport:** Dagomzet per betaalmethode

### P3 - Laag Prioriteit
- [ ] MT940 bankimport implementeren
- [ ] Excel exports voor alle relevante data
- [ ] Logo verificatie op PDF facturen
- [ ] API rate limiting en caching

---

## Test Gegevens

### Demo Gebruiker
- Email: demo@facturatie.sr
- Wachtwoord: demo2024

### Recent Test Rapport
- `/app/test_reports/iteration_60.json`
- Frontend: 100% (8/8 Boekhouding pagina's geverifieerd)
- Alle pagina's hebben consistente design met 4 stat cards, gray kleuren, rounded-2xl borders

---

## Belangrijke Bestanden

### Frontend
- `/app/frontend/src/pages/boekhouding/POSPage.js` (1400+ regels)
- `/app/frontend/src/pages/boekhouding/VoorraadPage.js` - met barcode functionaliteit
- `/app/frontend/src/pages/boekhouding/POSPublicScannerPage.js` - publieke scanner

### Backend
- `/app/backend/routers/boekhouding_legacy.py` (5300+ regels)
- ArtikelCreate model met barcode field (regel 526)

---

*Laatste update: 1 maart 2026 - Alle 15+ Boekhouding pagina's herontworpen met consistente VerkoopPage stijl*
