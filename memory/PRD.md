# ERP Boekhouding - Product Requirements Document

## Oorspronkelijke Probleemstelling
Een uitgebreide ERP-applicatie voor boekhoudkundige modules met ondersteuning voor:
- **Inkoop Module**: Offertes, Orders, Goederenontvangst, Crediteurenbeheer
- **Verkoop Module**: Offertes, Orders, Facturatie, Debiteurenbeheer, Prijslijsten
- **Voorraad Module**: Artikelenbeheer, Magazijnen, Voorraadmutaties, Inventarisatie
- **Projecten Module**: Projectenbeheer, Urenregistratie
- **Bank/Kas Module**: Transacties, Factuurkoppelingen
- **Boekhouding Core**: Debiteuren, Crediteuren, Vaste Activa, Kostenplaatsen

## Technische Stack
- **Frontend**: React met TailwindCSS, Shadcn/UI componenten
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Taal**: Nederlands (Dutch)

## Voltooide Functies

### 23 februari 2026 - UI/UX Overhaul
- ✅ **Alle modulepagina's bijgewerkt** met consistent emerald-green design
- ✅ Hero headers met gradient (from-slate-900 via-slate-800 to-emerald-900)
- ✅ Stats grids met emerald/blue/purple/amber accenten
- ✅ Responsive layouts voor mobile/tablet/desktop
- ✅ Nederlandse taal consistent toegepast

### Bijgewerkte pagina's:
- `/app/frontend/src/pages/inkoop/DashboardPage.js`
- `/app/frontend/src/pages/verkoop/DashboardPage.js`
- `/app/frontend/src/pages/voorraad/DashboardPage.js`
- `/app/frontend/src/pages/voorraad/ArtikelenPage.js`
- `/app/frontend/src/pages/voorraad/MagazijnenPage.js`
- `/app/frontend/src/pages/voorraad/MutatiesPage.js`
- `/app/frontend/src/pages/voorraad/InventarisatiePage.js`
- `/app/frontend/src/pages/projecten/DashboardPage.js`
- `/app/frontend/src/pages/projecten/OverzichtPage.js`
- `/app/frontend/src/pages/projecten/UrenPage.js`
- `/app/frontend/src/pages/verkoop/PrijslijstenPage.js`
- `/app/frontend/src/pages/inkoop/OntvangstenPage.js`

### 23 februari 2026 - Factuur Generatie
- ✅ **Factuur maken vanuit Verkooporders** - volledig werkend
- ✅ Backend endpoint: `POST /api/verkoop/orders/{order_id}/naar-factuur`
- ✅ Frontend knop toont voor bevestigde/geleverde orders
- ✅ Order status wordt automatisch naar "gefactureerd" gezet
- ✅ Factuur wordt correct aangemaakt met alle ordergegevens

### 24 februari 2026 - PDF Factuur Download
- ✅ **Professionele PDF factuur generatie** met ReportLab
- ✅ Backend endpoints:
  - `GET /api/pdf/verkoopfactuur/{id}` - Download PDF
  - `GET /api/pdf/verkoopfactuur/{id}/preview` - Preview in browser
- ✅ PDF bevat:
  - Bedrijfsgegevens en logo placeholder
  - Klantgegevens (uit Debiteuren)
  - Factuurnummer, datum, vervaldatum
  - Factuurregels met BTW berekening
  - Subtotaal, BTW, Totaal
  - Betalingsstatus
- ✅ Frontend Download knop op Verkoopfacturen pagina
- ✅ VerkoopfacturenPage.js bijgewerkt met emerald-green UI

## Bestaande Functionaliteit

### Debiteuren/Crediteuren
- ✅ Centraal beheer van klanten (Debiteuren) en leveranciers (Crediteuren)
- ✅ Gebruikt als single source of truth voor Verkoop en Inkoop modules
- ✅ Restyled pagina's met emerald-green theme

### Verkoop Module
- ✅ Verkoopoffertes CRUD
- ✅ Verkooporders CRUD
- ✅ Offerte naar Order conversie
- ✅ Order naar Factuur generatie
- ✅ Prijslijsten beheer
- ✅ Klantprijzen en kortingen

### Inkoop Module
- ✅ Inkoopoffertes CRUD
- ✅ Inkooporders CRUD
- ✅ Goederenontvangst pagina (basis)

### Voorraad Module
- ✅ Artikelenbeheer met categorieën
- ✅ Magazijnenbeheer
- ✅ Voorraadmutaties registratie
- ✅ Inventarisatie functie

### Projecten Module
- ✅ Projectenbeheer met status tracking
- ✅ Urenregistratie per project
- ✅ Budget tracking

## Prioriteit Backlog

### P0 - Kritiek
- [x] ~~UI/UX Overhaul voor alle pagina's~~ (VOLTOOID)
- [x] ~~Factuur generatie vanuit Verkooporders~~ (VOLTOOID)
- [x] ~~PDF Factuur Download~~ (VOLTOOID)

### P1 - Hoog
- [ ] Bank/Kas module uitbreiden met factuurkoppelingen
- [ ] Inkomsten/Uitgaven overzichten
- [ ] Volledige CRUD voor alle entiteiten

### P2 - Medium
- [ ] HRM integratie met kostenboekingen
- [ ] Inkoopfacturen PDF export
- [ ] Bulk import/export functies

### P3 - Laag
- [ ] Dashboard rapportages
- [ ] Email notificaties
- [ ] Multi-valuta ondersteuning uitbreiden

## Database Collecties

| Collectie | Beschrijving |
|-----------|--------------|
| `boekhouding_debiteuren` | Centrale klantgegevens (single source of truth) |
| `boekhouding_crediteuren` | Centrale leveranciergegevens |
| `boekhouding_verkoopfacturen` | Verkoopfacturen |
| `verkoop_orders` | Verkooporders |
| `verkoop_offertes` | Verkoopoffertes |
| `verkoop_prijslijsten` | Prijslijsten |
| `inkoop_orders` | Inkooporders |
| `inkoop_offertes` | Inkoopoffertes |
| `voorraad_artikelen` | Producten/diensten |
| `voorraad_magazijnen` | Magazijnen |
| `voorraad_mutaties` | Voorraadwijzigingen |
| `projecten` | Projecten |
| `projecten_uren` | Urenregistraties |

## API Endpoints

### Belangrijkste Endpoints
- `GET/POST /api/boekhouding/debiteuren` - Debiteurenbeheer
- `GET/POST /api/boekhouding/crediteuren` - Crediteurenbeheer
- `GET/POST /api/verkoop/orders` - Verkooporders
- `POST /api/verkoop/orders/{id}/naar-factuur` - Factuur genereren
- `GET/POST /api/inkoop/orders` - Inkooporders
- `GET/POST /api/voorraad/artikelen` - Artikelenbeheer
- `GET/POST /api/projecten/` - Projectenbeheer

## Test Credentials
- **Email**: test@demo.com
- **Password**: demo123
