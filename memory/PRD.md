# Facturatie.SR - Product Requirements Document

## Original Problem Statement
Comprehensive accounting and business management platform for Suriname businesses. The platform includes multiple modules:
- Boekhouding (Accounting) - Core accounting functionality
- HRM/Personeel - Human Resource Management
- Schuldbeheer - Personal Debt Management
- Vastgoed Beheer - Real Estate Management
- Auto Dealer, Beauty Spa, Pompstation - Industry-specific modules

## Current Session: March 4, 2026

### Completed This Session

#### Factuur PDF Preview Herontwerp ✅ (Latest)
- **Modern geometrisch design** geïmplementeerd in `PublicInvoiceGenerator.js`:
  - Diagonale vormen in header/footer met CSS `clip-path`
  - 5 kleurthema's: Modern (teal/oranje), Zakelijk (blauw), Creatief (paars/roze), Krachtig (rood/amber), Natuur (groen)
  - Elke template heeft nu `primaryColor` en `accentColor` voor two-tone designs
  - Gekleurde tabelheaders met witte tekst
  - Accent-gekleurde TOTAAL balk
  - Bedrijfslogo met witte achtergrond in header
  - "Bedankt voor uw vertrouwen!" boodschap in footer
- **Tested by testing_agent**: 100% success rate (8/8 features + 4 extra tests)

#### AI Assistent Enhancement ✅
- **Boekhouding module** fully integrated into AI assistant with:
  - BTW overzicht (BTW saldo bekijken)
  - Omzet overzicht (maand/jaar statistieken)
  - Openstaande facturen
  - Debiteuren/Crediteuren overzicht
  - Grootboek overzicht
  - Bank transacties
  - Boekhouding rapportage
- **Schuldbeheer module** added (schulden overzicht, aflossingen)
- **Suribet module** added (ticket verkopen, omzet)
- Fixed missing `/api/ai/assistant/chat` endpoint
- Improved error handling for LLM service errors

#### Gratis Factuur & Offerte Generator ✅
- New public page at `/gratis-factuur` and `/invoice-generator`
- Features:
  - Create professional invoices and quotes
  - 3 currencies: SRD, EUR, USD
  - BTW regions: Suriname (10%, 0%) and Netherlands (21%, 9%, 0%)
  - Logo upload functionality
  - Bank details section
  - Live preview with automatic calculations
  - PDF download (html2canvas + jsPDF)
  - Print functionality
  - Multiple line items support
  - **5 modern template designs with geometric shapes** (NEW)

### Previous Session Fixes (March 3, 2026)
- Fixed `Loader2 is not defined` JavaScript error
- Fixed layout flicker during page navigation
- Standardized loading states across 19+ pages

## Code Architecture

```
/app
├── backend/
│   └── server.py                      # AI assistant enhanced with boekhouding, schuldbeheer, suribet
├── frontend/
│   └── src/
│       ├── App.js                     # Added routes for invoice generator
│       ├── pages/
│       │   ├── PublicInvoiceGenerator.js  # NEW - Public invoice/quote generator
│       │   └── boekhouding/           # All pages with consistent loading states
│       └── components/
│           └── AIAssistant.js         # AI chat widget
```

## Key Features

### AI Assistant Capabilities
Now supports ALL modules:
- Vastgoed Beheer (property management)
- HRM (employee management)
- Auto Dealer (vehicle sales)
- Beauty & Spa (appointments)
- Pompstation (fuel sales)
- **Boekhouding** (accounting - NEW)
- **Schuldbeheer** (debt management - NEW)
- **Suribet** (lottery retailer - NEW)

### Public Tools
- `/gratis-factuur` - Free invoice/quote generator (no login required)

## Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Pending/Upcoming Tasks

### P0 - High Priority
- **Login redirect issue**: Users incorrectly redirected to `/app/hrm` after login instead of their first module. Requires investigation of user-specific `sidebar-order` config.

### P1 - Next Priority
- PDF Payslip Generator for HRM module
- Verify production server AI assistant (EMERGENT_LLM_KEY configuration)
- Template switching UI improvement (larger preview thumbnails)

### P2 - User Verification
- POS link removal from sidebar
- Employee add flow E2E test
- Sidebar quicklink navigation
- Invoice email delivery

### Future/Backlog
- Advanced AI Features (telephony, WhatsApp)
- Schuldbeheer Module expansion
- Admin Module Assignment UI
- "Meer functies" clarification for accounting pages

## Technical Notes

### Dependencies Added
- `html2canvas` - For capturing invoice preview as image
- `jsPDF` - For generating PDF documents

### API Endpoints
- `/api/ai/chat` - Main AI chat endpoint
- `/api/ai/assistant/chat` - Alias for AI assistant page
- `/api/public/chat` - Public chatbot for website visitors
