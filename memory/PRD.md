# Facturatie.sr - Product Requirements Document

## Originele Probleemstelling
Bouw en verbeter een volledige Boekhouding (Accounting) applicatie met Nederlandse interface. De focus ligt op het repareren en verbeteren van de Verkoop, Debiteuren, en Crediteuren functionaliteiten.

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
