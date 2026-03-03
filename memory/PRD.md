# Facturatie.SR - Product Requirements Document

## Original Problem Statement
Comprehensive accounting and business management platform for Suriname businesses. The platform includes multiple modules:
- Boekhouding (Accounting) - Core accounting functionality
- HRM/Personeel - Human Resource Management
- Schuldbeheer - Personal Debt Management
- Vastgoed Beheer - Real Estate Management
- Auto Dealer, Beauty Spa, Pompstation - Industry-specific modules

## Current Focus: UI/UX Redesign & Bug Fixes

### Recently Completed (March 2026)

#### Session: March 3, 2026
**P0 Issues Fixed:**
1. ✅ `Loader2 is not defined` JavaScript error - Fixed by adding missing imports to:
   - `/app/frontend/src/pages/boekhouding/DebiteruenPage.js`
   - `/app/frontend/src/pages/boekhouding/CrediteruenPage.js`

2. ✅ Layout Flicker/Shift during page navigation - Fixed by standardizing loading states across 19+ pages:
   - All pages now use consistent `min-h-screen bg-gray-50 w-full` wrapper
   - Centered Loader2 spinner with emerald-500 color
   - Stable layout without horizontal/vertical shifts

**Previously Completed:**
- ✅ Grootboek page redesign (3D cards, bulk code mapping)
- ✅ HRM/Personeel page redesign (consistent 3D card style)
- ✅ Bank/Kas page redesign (mirrors VerkoopPage layout)

### Pending Issues

#### P1 - Medium Priority
1. **Post-login Redirect** - Works correctly based on user's sidebar module order
   - Demo account redirects to `/app/schuldbeheer` (first in order)
   - Users can customize via profile settings

#### P2 - Verification Pending
- POS link removal from sidebar
- Employee add flow (E2E test)
- Sidebar quicklink navigation
- Invoice email delivery

### Upcoming Tasks

1. **PDF Payslip Generator** (P1)
   - Add functionality for employees to download/print payslips
   
2. **"Meer functies" Clarification** (P2)
   - Clarify what additional functions user wants for accounting pages

### Future/Backlog

1. **Advanced AI Features** (P2)
   - Phone call integration
   - WhatsApp integration

2. **Schuldbeheer Module** (P2)
   - Build core debt management functionality

3. **Admin Module Assignment** (P2)
   - Build UI for administrators to assign modules to users

## Code Architecture

```
/app
├── backend/          # FastAPI backend
├── frontend/
│   └── src/
│       ├── App.js                    # Main router, lazy loading, PageLoader
│       ├── components/
│       │   ├── Layout.js             # Main layout with sidebar
│       │   └── ui/                   # Shadcn components
│       ├── context/
│       │   └── AuthContext.js        # User session management
│       └── pages/
│           ├── Login.js              # Login with redirect logic
│           └── boekhouding/          # Accounting module pages
│               ├── VerkoopPage.js    # Reference design (gold standard)
│               ├── DebiteruenPage.js # Fixed Loader2 import
│               ├── CrediteruenPage.js # Fixed Loader2 import
│               ├── GrootboekPage.js  # Redesigned
│               ├── HRMPage.js        # Redesigned
│               ├── BankKasPage.js    # Redesigned
│               └── ...               # All updated with consistent loading
```

## Design Standards

### Loading State Pattern (Standardized)
```jsx
if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 w-full" data-testid="page-name">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    </div>
  );
}
```

### Visual Design
- 3D card style with shadow effects
- Emerald-500 as primary accent color
- Gray-50 background throughout
- Consistent tab button styling
- Status legend with icons

## Test Credentials
- Email: `demo@facturatie.sr`
- Password: `demo2024`

## Key Technical Notes

1. **Redirect Logic** (Login.js):
   - Priority 1: User's explicit default dashboard choice
   - Priority 2: First ACTIVE module in saved sidebar order
   - Priority 3: First active module (fallback)

2. **Loading States**:
   - Use `Loader2` from lucide-react
   - Always include import when using the component
   - Consistent styling across all pages

3. **User Preferences**: Stored in `/api/user/sidebar-order` endpoint
