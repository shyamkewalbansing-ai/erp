# Facturatie.sr - Product Requirements Document

## Originele Probleemstelling
De gebruiker wil een uitgebreide Boekhouding (Accounting) module bouwen die specifiek is afgestemd op de Surinaamse markt.

## User's Preferred Language
Dutch (Nederlands)

---

## Wat is Voltooid (Maart 2026)

### ✅ Point of Sale (POS) - Volledig Uitgebreid

#### Camera Barcode Scanner (NIEUW)
- **html5-qrcode library** geïntegreerd
- **Start/Stop Camera** knoppen
- **Ondersteunde formaten**: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, etc.
- **Automatisch toevoegen**: Product wordt direct aan winkelwagen toegevoegd na scan
- **Error handling**: Duidelijke foutmeldingen bij camera problemen
- **Cross-platform**: Werkt op telefoon, tablet en laptop

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
- [ ] **Backend Refactoring:** `boekhouding_legacy.py` (5200+ regels) opsplitsen
- [ ] **Multi-tenancy:** Alle queries filteren op `bedrijf_id`

### P2 - Middel Prioriteit
- [ ] **Frontend Refactoring:** `VerkoopPage.js` en `VoorraadPage.js` opsplitsen
- [ ] **POS Hardware:** Kassalade, thermische printer, betaalterminal

### P3 - Laag Prioriteit
- [ ] API rate limiting en caching

---

## Test Gegevens

### Demo Gebruiker
- Email: demo@facturatie.sr
- Wachtwoord: demo2024

### Recent Test Rapport
- `/app/test_reports/iteration_56.json`
- Backend: 100% (14/14 tests)
- Frontend: 100% (16/16 features)

---

## Belangrijke Bestanden

### Frontend
- `/app/frontend/src/pages/boekhouding/POSPage.js` (1200+ regels)
- Camera scanner gebruikt `html5-qrcode` library

### Backend
- `/app/backend/routers/boekhouding_legacy.py` (5200+ regels)

---

*Laatste update: 28 februari 2026 - Camera barcode scanner toegevoegd aan POS*
