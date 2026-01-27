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

## What's Been Implemented (27 Jan 2026)

### UI/UX Redesign ✅ (NIEUW - 27 Jan 2026)
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

**Bestanden gewijzigd:**
- `/app/frontend/tailwind.config.js` - Font families toegevoegd
- `/app/frontend/src/pages/LandingPage.js` - Volledig gemoderniseerd
- `/app/frontend/src/pages/Login.js` - Split layout met gradient overlay
- `/app/frontend/src/pages/TenantDashboard.js` - Glassmorphism styling

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

### P1 (High Priority)
- [ ] **Herinneringen voor maandelijkse meteropname** (email notificaties)
- [ ] **server.py refactoring** (>10000 lines) - Split into routers

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
