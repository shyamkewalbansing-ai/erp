# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
ERP SaaS systeem voor Surinaamse bedrijven met modulaire add-ons, CMS beheer en AI chatbot.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI, lazy loading
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Styling**: Tailwind CSS met glassmorphism effecten
- **Fonts**: Outfit (headings), Plus Jakarta Sans (body)
- **Primary Color**: #0caf60 (groen)
- **Multi-tenant**: Workspace-based isolatie per klant

## What's Been Implemented (30 Jan 2026)

### Workspace Backup & Restore ✅ (NIEUW - 30 Jan 2026)
- [x] Backup maken van alle workspace data
- [x] Backup lijst met details (grootte, records, datum)
- [x] Backup herstellen met automatische veiligheidsbackup
- [x] Backup downloaden als JSON
- [x] Backup verwijderen
- [x] UI in Workspace Instellingen pagina

**API Endpoints:**
- `GET /api/workspace/backups` - Lijst van backups
- `POST /api/workspace/backups` - Nieuwe backup maken
- `POST /api/workspace/backups/{id}/restore?confirm=true` - Herstellen
- `DELETE /api/workspace/backups/{id}` - Verwijderen
- `GET /api/workspace/backups/{id}/download` - Downloaden

**Gebackupte Collections:**
tenants, apartments, payments, deposits, loans, kasgeld, maintenance, employees, salaries, meter_readings, contracts, invoices, workspace_users, workspace_logs

### Volledige Multi-Tenant Systeem ✅

#### 1. Klant Workspaces (Admin)
- [x] Workspace management in superadmin dashboard
- [x] Statistieken: Totaal, Actief, In Afwachting
- [x] Workspace aanmaken/bewerken/verwijderen
- [x] Domein keuze: Subdomein of Custom domein
- [x] DNS verificatie & SSL tracking
- [x] Nginx config generator

#### 2. Frontend Branding Context ✅
- [x] Workspace branding automatisch geladen na login
- [x] CSS variabelen dynamisch ingesteld (--brand-primary, --brand-secondary)
- [x] Logo en portaal naam in sidebar
- [x] Branding opslaan per workspace

#### 3. Workspace Users Beheer ✅
- [x] "Workspace & Team" pagina onder Instellingen
- [x] Gebruikers uitnodigen met rollen (Admin, Lid, Viewer)
- [x] Gebruikers verwijderen
- [x] Branding bewerken met color picker

#### 4. Data Isolatie ✅
- [x] Automatische workspace aanmaak bij registratie
- [x] Data queries gefilterd op workspace_id
- [x] Legacy data support via user_id fallback

#### 5. Code Refactoring (Gestart)
- [x] `/app/backend/routers/deps.py` - Gedeelde dependencies
- [x] `/app/backend/routers/workspaces.py` - Workspace router
- [ ] Overige routers (hrm, cms, tenants) - TODO

**Domein Opties:**
- **Subdomein**: klantnaam.facturatie.sr (direct actief, auto-SSL)
- **Custom Domein**: portal.klantdomein.nl (DNS A-record naar server IP)

**API Endpoints:**
- `GET/POST /api/admin/workspaces` - Workspace CRUD
- `GET /api/workspace/current` - Huidige workspace + branding
- `PUT /api/workspace/branding` - Branding wijzigen
- `GET/POST /api/workspace/users` - Gebruikersbeheer

### Systeem Update Functie ✅ (30 Jan 2026)
Update productie server via webhook:

**Features:**
- [x] Update knop in superadmin dashboard
- [x] Webhook URL configuratie
- [x] HMAC-SHA256 signature voor veiligheid
- [x] Opties: Backend herstarten, Frontend rebuilden, Migraties
- [x] Deployment logs met status tracking
- [x] VPS setup instructies

### UI/UX Redesign ✅ (27 Jan 2026)
Complete moderne redesign van de applicatie:

**Features:**
- [x] Glassmorphism navigatie header
- [x] Moderne hero sectie met gradient tekst en trust indicators
- [x] Feature cards met backdrop-blur en hover animaties
- [x] Bento-grid style modules sectie
- [x] Gradient CTA sectie met decoratieve elementen
- [x] Multi-kolom footer met sociale media links
- [x] Moderne login pagina met split layout
- [x] Verbeterde tenant dashboard styling
- [x] Pill-shaped buttons met shadows
- [x] Custom fonts (Outfit, Plus Jakarta Sans)

### Huurders Portaal ✅ (27 Jan 2026)
Complete self-service portaal voor huurders:

**Features:**
- [x] Eigen login/registratie systeem voor huurders
- [x] Dashboard met appartement info, huur, saldo
- [x] Betalingsoverzicht en -geschiedenis
- [x] Zelf meterstanden (EBS/SWM) indienen
- [x] Automatische kostenberekening met Suriname tarieven
- [x] Openstaande facturen bekijken
- [x] Melding wanneer meterstand nog niet ingediend

**URL:** `/huurder` (aparte portaal van verhuurder)

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/tenant-portal/register | POST | Huurder registratie |
| /api/tenant-portal/login | POST | Huurder login |
| /api/tenant-portal/me | GET | Account info |
| /api/tenant-portal/dashboard | GET | Dashboard data |
| /api/tenant-portal/payments | GET | Betalingsgeschiedenis |
| /api/tenant-portal/invoices | GET | Facturen |
| /api/tenant-portal/meter-readings | GET/POST | Meterstanden |

### Meterstanden Module ✅ (27 Jan 2026)
- [x] Officiële Suriname EBS tarieven (0-150, 150-500, 500+ kWh)
- [x] Officiële Suriname SWM tarieven (0-10, 10-30, 30+ m³)
- [x] Automatische verbruiks- en kostenberekening
- [x] Betaling markeren met kasgeld aftrek
- [x] Periode navigatie en samenvatting

### Partner Logo's via CMS ✅
- [x] Partner logo's beheerbaar via CMS Instellingen

### CMS Image Upload ✅
- [x] Server-side image upload
- [x] Logo, Login/Registratie afbeeldingen

### HRM Module ✅
- [x] 9 aparte pagina's in sidebar
- [x] Dashboard, Personeel, Werving, Contracten, etc.

## Test Credentials

### Verhuurder
- **Superadmin**: admin@facturatie.sr / admin123
- **Klant met modules**: shyam@kewalbansing.net / test1234

### Huurder
- **Huurder portaal**: jan@example.com / huurder123

## EBS & SWM Tarieven Suriname 2024

### EBS (Elektriciteit)
| Verbruik | Tarief |
|----------|--------|
| 0 - 150 kWh | SRD 0.35 / kWh |
| 150 - 500 kWh | SRD 0.55 / kWh |
| 500+ kWh | SRD 0.85 / kWh |

### SWM (Water)
| Verbruik | Tarief |
|----------|--------|
| 0 - 10 m³ | SRD 2.50 / m³ |
| 10 - 30 m³ | SRD 4.50 / m³ |
| 30+ m³ | SRD 7.50 / m³ |

## File Structure
```
/app/frontend/src/
├── context/
│   └── TenantAuthContext.js    # NEW: Huurder auth context
├── pages/
│   ├── TenantLogin.js          # NEW: Huurder login/register
│   ├── TenantDashboard.js      # NEW: Huurder dashboard
│   ├── Meterstanden.js         # Verhuurder meterstanden
│   └── ...

/app/backend/
├── server.py                   # +tenant portal endpoints (~10000 lines)
└── routers/                    # Prepared for modular refactoring
```

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] Huurders portaal met eigen login
- [x] Huurders kunnen zelf meterstanden invoeren
- [x] Dashboard met appartement, betalingen, saldo
- [x] UI/UX redesign met moderne glassmorphism styling

### P1 (High Priority)
- [ ] **server.py refactoring** (>10000 lines) - Split into modular routers
- [ ] **Herinneringen voor maandelijkse meteropname** (email notificaties)

### P2 (Medium Priority)
- [ ] Huurder kan betalingen doen via portaal
- [ ] Email notificaties voor HRM

### P3 (Nice to Have)
- [ ] Meterstanden exporteren naar PDF
- [ ] Grafiek met verbruikshistorie
- [ ] Overige ERP modules (Inventory, CRM, Accounting)

## Architecture Notes
- Huurders hebben aparte `tenant_accounts` collectie (losgekoppeld van `users`)
- Tenant portaal routes starten met `/huurder`
- Verhuurder (landlord) ID wordt opgeslagen in tenant account voor data isolatie
