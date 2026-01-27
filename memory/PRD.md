# Facturatie N.V. - Product Requirements Document

## Original Problem Statement
ERP SaaS systeem voor Surinaamse bedrijven met modulaire add-ons, CMS beheer en AI chatbot.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) met JWT authenticatie
- **Frontend**: React met Shadcn UI, lazy loading
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Styling**: Tailwind CSS
- **Primary Color**: #0caf60 (groen)

## What's Been Implemented (27 Jan 2026)

### Meterstanden Module ✅ (NIEUW - 27 Jan 2026)
Complete EBS en SWM meterstanden beheer voor Vastgoed Beheer module:

**Backend Features:**
- [x] Officiële Suriname EBS tarieven (staffels: 0-150, 150-500, 500+ kWh)
- [x] Officiële Suriname SWM tarieven (staffels: 0-10, 10-30, 30+ m³)
- [x] Automatische verbruiksberekening (nieuwe stand - vorige stand)
- [x] Automatische kostenberekening op basis van tariefstaffels
- [x] Betaling markeren met automatische kasgeld aftrek
- [x] Betaling ongedaan maken
- [x] Periode samenvatting (totaal verbruik, kosten, betaald/openstaand)
- [x] Meterstand historie per appartement

**Frontend Features:**
- [x] Meterstanden pagina met overzichtelijke UI
- [x] Periode selector (maand navigatie)
- [x] Summary cards: Ingediend, EBS Totaal, SWM Totaal, Totaal Kosten
- [x] Tabel met alle meterstanden en status badges
- [x] Meterstand toevoegen dialog
- [x] Tarieven instellingen dialog (EBS & SWM tabs)
- [x] Betaal knop met bevestigingsdialog
- [x] Filter op appartement, betalingsstatus, zoeken

**API Endpoints:**
| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| /api/meter-readings | GET/POST | Meterstanden CRUD |
| /api/meter-readings/{id} | PUT/DELETE | Meterstand bewerken/verwijderen |
| /api/meter-readings/{id}/pay | POST | Markeer als betaald (kasgeld aftrek) |
| /api/meter-readings/{id}/unpay | POST | Markeer als onbetaald |
| /api/meter-readings/summary | GET | Periode samenvatting |
| /api/meter-settings | GET/PUT | Tarieven instellingen |
| /api/apartments/{id}/meter-history | GET | Meterstand historie |

### Partner Logo's via CMS ✅ (27 Jan 2026)
- [x] Partner logo's beheerbaar via CMS Instellingen tab
- [x] Upload functionaliteit met preview
- [x] Placeholder logo's verwijderd

### CMS Image Upload ✅ (27 Jan 2026)
- [x] Server-side image upload via `/api/cms/upload-image`
- [x] Logo, Login/Registratie afbeeldingen upload

### HRM Module - Volledig Uitgebreid ✅
- [x] 9 aparte pagina's in sidebar
- [x] Dashboard, Personeel, Werving, Contracten, Documenten, Verlof, Aanwezigheid, Loonlijst, Instellingen

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

## Test Credentials
- **Superadmin**: admin@facturatie.sr / admin123
- **Klant met Vastgoed+HRM**: shyam@kewalbansing.net / test1234

## File Structure
```
/app/backend/
├── server.py          # Main backend (~9500 lines)
└── routers/           # Prepared for modular refactoring
    └── auth.py

/app/frontend/src/pages/
├── Meterstanden.js    # NEW: Meterstanden beheer pagina
├── HRM*.js            # HRM module pagina's
└── ...
```

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] Meterstanden module met EBS/SWM tarieven
- [x] CMS image upload
- [x] Partner logo's via CMS

### P1 (High Priority)
- [ ] **server.py refactoring** (>9500 lines) - Split into routers
- [ ] Huurders kunnen zelf meterstanden invoeren via portaal
- [ ] Herinneringen voor maandelijkse meteropname

### P2 (Medium Priority)
- [ ] Email notificaties voor HRM
- [ ] Meterstanden exporteren naar PDF/Excel

### P3 (Nice to Have)
- [ ] Overige ERP modules (Inventory, CRM, Accounting)
- [ ] Grafiek met verbruikshistorie
