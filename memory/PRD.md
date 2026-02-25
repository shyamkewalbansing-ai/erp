# ERP Boekhouding - Product Requirements Document

## Oorspronkelijke Probleemstelling
Een uitgebreide ERP-applicatie met volledig geïntegreerde boekhoudkundige modules:
- **Boekhouding Core**: Grootboek, Debiteuren, Crediteuren, Bank/Kas, Vaste Activa, Kostenplaatsen
- **Inkoop Module**: Offertes, Orders, Goederenontvangst, Inkoopfacturen → Grootboek
- **Verkoop Module**: Offertes, Orders, Verkoopfacturen → Grootboek, Prijslijsten
- **Voorraad Module**: Artikelenbeheer, Magazijnen, Voorraadmutaties → Grootboek
- **Projecten Module**: Projectenbeheer, Urenregistratie → Grootboek
- **Rapportages**: Balans, Winst & Verlies, BTW Aangifte, etc.

## Technische Stack
- **Frontend**: React met TailwindCSS, Shadcn/UI componenten
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Taal**: Nederlands (Dutch)

## Voltooide Functies

### 24 februari 2026 - GROOTBOEK INTEGRATIE (VOLTOOID)
Volledige integratie van alle modules met het grootboek:

#### 1. Automatische Journaalposten
- ✅ **Verkoopfactuur → Grootboek** (bij status "verstuurd")
  - Debet: Debiteuren (1200)
  - Credit: Omzet Verkoop (8000) + BTW Af te dragen (2100)
  
- ✅ **Verkoopfactuur Betaling → Grootboek**
  - Debet: Bank/Kas (1100/1000)
  - Credit: Debiteuren (1200)

- ✅ **Inkoopfactuur → Grootboek**
  - Debet: Inkoopkosten/Voorraad (4000/1300) + BTW Voorbelasting (2200)
  - Credit: Crediteuren (2000)

- ✅ **Inkoopfactuur Betaling → Grootboek**
  - Debet: Crediteuren (2000)
  - Credit: Bank/Kas (1100/1000)

- ✅ **Voorraadmutaties → Grootboek**
  - Inkoop: Debet Voorraad, Credit Voorraadkosten
  - Verkoop: Debet Voorraadkosten, Credit Voorraad

- ✅ **Project Uren → Grootboek**
  - Debet: Projectkosten (4500)
  - Credit: Personeelskosten (4200)

- ✅ **Afschrijvingen → Grootboek**
  - Debet: Afschrijvingskosten (4300)
  - Credit: Cum. Afschrijving Vaste Activa (1410)

#### 2. Standaard Rekeningschema
Automatisch aangemaakt bij eerste gebruik:
- 1000: Kas
- 1100: Bank
- 1200: Debiteuren
- 1300: Voorraad
- 1400: Vaste Activa
- 2000: Crediteuren
- 2100: BTW Af te dragen
- 2200: BTW Voorbelasting
- 4000: Inkoopkosten
- 4300: Afschrijvingskosten
- 4500: Projectkosten
- 8000: Omzet Verkoop

#### 3. Rapportages Module
- ✅ **Balans** - Activa en Passiva overzicht
- ✅ **Winst & Verlies** - Opbrengsten en Kosten
- ✅ **Journaalposten** - Alle boekingen
- ✅ **Openstaande Debiteuren** - Per klant
- ✅ **Openstaande Crediteuren** - Per leverancier
- ✅ **Voorraadwaarde** - Per artikel
- ✅ **Projecten Overzicht** - Uren en kosten
- ✅ **BTW Aangifte** - Per periode

### 25 februari 2026 - Bank Reconciliatie (VOLTOOID)
- ✅ **CSV Upload**: Parse banktransacties uit CSV bestanden
- ✅ **Automatisch Matchen**: Suggesties op basis van bedrag en factuurnummer/klantnaam
- ✅ **Handmatig Matchen**: Transactie aan specifieke factuur koppelen
- ✅ **Status Beheer**: Niet gematcht, Suggestie, Gematcht, Genegeerd
- ✅ **Grootboek Integratie**: Matching registreert betaling en boekt naar grootboek
- ✅ Backend: `/app/backend/routers/bankreconciliatie.py`
- ✅ Frontend: `/app/boekhouding/bankreconciliatie`

### 24 februari 2026 - Volledige CRUD Functionaliteit (VOLTOOID)
- ✅ **Verkoop Orders**: Create, Update (concept), Delete (concept/geannuleerd)
- ✅ **Verkoop Offertes**: Create, Update (concept), Delete (concept/verlopen/afgewezen)
- ✅ **Inkoop Orders**: Create, Update (concept), Delete (concept/geannuleerd)
- ✅ **Inkoop Offertes**: Create, Update (concept/verzonden), Delete (concept/verlopen/afgewezen)
- ✅ Frontend Edit/Delete knoppen voor juiste statussen
- ✅ Dialog toont "Bewerken" titel bij bewerken
- ✅ Bevestigingsdialoog bij verwijderen

### 24 februari 2026 - Email met PDF Bijlage (VOLTOOID)
- ✅ Email versturen met factuur PDF als bijlage
- ✅ Gebruikt MIMEApplication voor PDF attachment
- ✅ Frontend SendInvoiceEmailDialog component
- ✅ Endpoint: `POST /api/boekhouding/verkoopfacturen/{id}/send-email`
- ✅ Vereist SMTP configuratie in Instellingen → Email

### 24 februari 2026 - PDF Factuur Download (VOLTOOID)
- ✅ Professionele PDF generatie met ReportLab
- ✅ Download endpoint: `/api/pdf/verkoopfactuur/{id}`
- ✅ Preview endpoint: `/api/pdf/verkoopfactuur/{id}/preview`

### 23 februari 2026 - UI/UX Overhaul
- ✅ Alle modulepagina's met emerald-green design
- ✅ Responsive layouts
- ✅ Nederlandse taal

## Code Architectuur

```
/app/backend/
├── routers/
│   ├── boekhouding.py    # Met grootboek integratie
│   ├── verkoop.py        # Verkoop → Debiteuren → Grootboek
│   ├── inkoop.py         # Inkoop → Crediteuren → Grootboek
│   ├── voorraad.py       # Met grootboek integratie
│   ├── projecten.py      # Met grootboek integratie
│   ├── activa.py         # Met afschrijvingen → Grootboek
│   ├── rapportages.py    # Nieuwe rapportages module
│   └── pdf.py            # PDF generatie
├── utils/
│   └── grootboek_integration.py  # Centrale boeking utilities
└── server.py
```

## Database Collecties

### Grootboek
| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_rekeningen` | Grootboekrekeningen met saldi |
| `boekhouding_journaalposten` | Alle journaalposten met regels |

### Facturen & Betalingen
| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_verkoopfacturen` | Verkoopfacturen |
| `boekhouding_inkoopfacturen` | Inkoopfacturen |
| `boekhouding_transacties` | Betalingen |

### Entiteiten
| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_debiteuren` | Klanten (single source of truth) |
| `boekhouding_crediteuren` | Leveranciers |
| `voorraad_artikelen` | Producten/diensten |
| `projecten` | Projecten |

## API Endpoints

### Rapportages (Nieuw)
- `GET /api/rapportages/grootboek/balans` - Balans overzicht
- `GET /api/rapportages/grootboek/resultaat` - Winst & Verlies
- `GET /api/rapportages/grootboek/journaalposten` - Journaalposten
- `GET /api/rapportages/debiteuren/openstaand` - Openstaande debiteuren
- `GET /api/rapportages/crediteuren/openstaand` - Openstaande crediteuren
- `GET /api/rapportages/voorraad/waarde` - Voorraadwaarde
- `GET /api/rapportages/projecten/overzicht` - Projecten overzicht
- `GET /api/rapportages/btw/aangifte` - BTW aangifte

### CRUD Endpoints (Nieuw)
- `PUT /api/verkoop/orders/{id}` - Update verkooporder (alleen concept)
- `PUT /api/verkoop/offertes/{id}` - Update verkoopofferte (alleen concept)
- `PUT /api/inkoop/orders/{id}` - Update inkooporder (alleen concept)
- `PUT /api/inkoop/offertes/{id}` - Update inkoopofferte (concept/verzonden)
- `DELETE` endpoints voor alle bovenstaande entiteiten

### PDF
- `GET /api/pdf/verkoopfactuur/{id}` - Download PDF
- `GET /api/pdf/verkoopfactuur/{id}/preview` - Preview PDF

### Email
- `POST /api/boekhouding/verkoopfacturen/{id}/send-email` - Verstuur factuur per email met PDF bijlage

## Prioriteit Backlog

### P0 - Kritiek (VOLTOOID)
- [x] UI/UX Overhaul
- [x] Factuur generatie vanuit Verkooporders
- [x] PDF Factuur Download
- [x] **Grootboek Integratie - VOLLEDIG GEÏMPLEMENTEERD**
- [x] **Rapportages Module - VOLLEDIG GEÏMPLEMENTEERD**
- [x] **Email versturen met PDF bijlage - VOLTOOID**
- [x] **Volledige CRUD voor Orders & Offertes - VOLTOOID**
- [x] **Bank Reconciliatie - VOLTOOID**

### P1 - Hoog
- [ ] Goederenontvangst → Voorraadmutaties automatisch
- [ ] Verkooporders → Voorraadreservering

### P2 - Medium
- [ ] HRM integratie met kostenboekingen
- [ ] Inkoopfacturen PDF export
- [ ] Bulk import/export functies
- [ ] Multi-valuta rapportages

### P3 - Laag
- [ ] Dashboard widgets
- [ ] Geautomatiseerde herinneringen
- [ ] Audit trail

## Test Credentials
- **Email**: test@demo.com
- **Password**: demo123
