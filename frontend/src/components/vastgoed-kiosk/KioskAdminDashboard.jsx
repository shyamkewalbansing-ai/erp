import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Home, ArrowLeft, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, LogIn, Landmark, Briefcase, Wallet, Wifi,
  AlertTriangle, MapPin, Shield, QrCode
} from 'lucide-react';
import axios from 'axios';

// Admin sub-components
import DashboardTab from './admin/DashboardTab';
import TenantsTab from './admin/TenantsTab';
import ApartmentsTab from './admin/ApartmentsTab';
import LocationsTab from './admin/LocationsTab';
import PaymentsTab from './admin/PaymentsTab';
import SettingsTab from './admin/SettingsTab';
import KasTab from './admin/KasTab';
import LoansTab, { LoanDetailModal } from './admin/LoansTab';
import EmployeesTab from './admin/EmployeesTab';
import PowerTab from './admin/PowerTab';
import InternetTab from './admin/InternetTab';
import ApartmentModal from './admin/ApartmentModal';
import TenantModal from './admin/TenantModal';
import AddRentModal from './admin/AddRentModal';
import QRScannerModal from './admin/QRScannerModal';
import PWAInstallPrompt from './PWAInstallPrompt';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskAdminDashboard({ companyId: propCompanyId, pinAuthenticated = false, onBack, onLock, kioskEmployee: kioskEmployeeProp }) {
  const navigate = useNavigate();
  // Fallback to localStorage for direct /vastgoed/admin access via PIN keypad
  const kioskEmployee = kioskEmployeeProp || (() => {
    try {
      const raw = JSON.parse(localStorage.getItem('kiosk_employee_session') || 'null');
      if (!raw) return null;
      // Normalize: backend uses employee_name, component expects 'name'
      return { ...raw, name: raw.name || raw.employee_name };
    } catch { return null; }
  })();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [leases, setLeases] = useState([]);
  const [copied, setCopied] = useState(false);

  // Modal states
  const [showApartmentModal, setShowApartmentModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showAddRentModal, setShowAddRentModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loanDetailData, setLoanDetailData] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const token = localStorage.getItem('kiosk_token');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/vastgoed');
    }
  };

  const handleOpenKiosk = () => {
    // If this admin dashboard is embedded inside the Kiosk (KioskLayout),
    // onBack switches the internal step back to the apartment select screen.
    // Otherwise (standalone /vastgoed/admin), navigate to the actual Kiosk URL.
    if (onBack) {
      onBack();
    } else if (company?.company_id) {
      navigate(`/vastgoed/${company.company_id}`);
    } else {
      navigate('/vastgoed');
    }
  };

  const handleLogout = () => {
    if (onLock) {
      onLock();
    } else {
      localStorage.removeItem('kiosk_token');
      localStorage.removeItem('kiosk_employee_session');
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
      });
      navigate('/vastgoed');
    }
  };

  useEffect(() => {
    if (!token) {
      if (!pinAuthenticated) {
        navigate('/vastgoed');
        return;
      }
    }
    loadData();
  }, [token, navigate, pinAuthenticated]);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [meRes, dashRes, tenRes, combinedRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { headers }),
        axios.get(`${API}/admin/dashboard`, { headers }),
        axios.get(`${API}/admin/tenants`, { headers }),
        axios.get(`${API}/admin/dashboard-data`, { headers }),
      ]);
      setCompany(meRes.data);
      setDashboard(dashRes.data);
      setTenants(tenRes.data);
      setApartments(combinedRes.data.apartments);
      setPayments(combinedRes.data.payments);
      setLeases(combinedRes.data.leases);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('kiosk_token');
        navigate('/vastgoed');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyKioskUrl = () => {
    const url = `${window.location.origin}/vastgoed/${company?.company_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSRD = (amount) => {
    return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = !searchTerm || 
      p.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.kwitantie_nummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedMonth === 'all') return matchesSearch;
    
    const paymentDate = new Date(p.created_at);
    const [year, month] = selectedMonth.split('-');
    return matchesSearch && 
      paymentDate.getFullYear() === parseInt(year) && 
      paymentDate.getMonth() === parseInt(month) - 1;
  });

  const totalFiltered = filteredPayments.filter(p => p.status !== 'rejected').reduce((sum, p) => sum + (p.amount || 0), 0);

  // Role-based tab definitions (MUST be before loading return to avoid hook order issues)
  const ALL_TABS = [
    { id: 'dashboard', label: 'Home', icon: Building2 },
    { id: 'tenants', label: 'Huurders', icon: Users },
    { id: 'locations', label: 'Locaties', icon: MapPin },
    { id: 'apartments', label: 'Appt.', icon: Home },
    { id: 'payments', label: 'Kwitanties', icon: Receipt },
    { id: 'kas', label: 'Bank/Kas', icon: Landmark },
    { id: 'loans', label: 'Leningen', icon: Wallet },
    { id: 'employees', label: 'Werknemers', icon: Briefcase },
    { id: 'power', label: 'Stroom', icon: Zap },
    { id: 'internet', label: 'Internet', icon: Wifi },
    { id: 'settings', label: 'Instellingen', icon: Settings },
  ];
  const ROLE_TABS = {
    beheerder: ['dashboard', 'tenants', 'locations', 'apartments', 'payments', 'kas', 'loans', 'employees', 'power', 'internet', 'settings'],
    boekhouder: ['dashboard', 'tenants', 'payments', 'kas'],
    kiosk_medewerker: [], // No admin dashboard access - only kiosk
  };
  const employeeRole = kioskEmployee?.role;
  const allowedTabIds = employeeRole ? (ROLE_TABS[employeeRole] || ROLE_TABS.kiosk_medewerker) : null;
  const TABS = allowedTabIds ? ALL_TABS.filter(t => allowedTabIds.includes(t.id)) : ALL_TABS;
  const MOBILE_MAIN_TABS = ['dashboard', 'tenants', 'apartments', 'payments'].filter(id => TABS.some(t => t.id === id));
  const MOBILE_MORE_TABS = TABS.filter(t => !MOBILE_MAIN_TABS.includes(t.id));

  useEffect(() => {
    if (!TABS.some(t => t.id === activeTab)) setActiveTab(TABS[0]?.id || 'dashboard');
  }, [employeeRole]); // eslint-disable-line

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Block access for kiosk_medewerker role
  if (employeeRole === 'kiosk_medewerker') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center" data-testid="rbac-blocked-dashboard">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Geen toegang</h2>
          <p className="text-sm text-slate-500 mb-5">
            Als Kiosk Medewerker heeft u geen toegang tot het Admin Dashboard. U kunt alleen betalingen registreren via de Kiosk.
          </p>
          <button
            onClick={handleBack}
            data-testid="rbac-back-to-kiosk"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition active:scale-95"
          >
            Terug naar Kiosk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 z-50" style={{ overflow: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <ImpersonationBanner />
      <SubscriptionBanner token={token} />
      <PWAInstallPrompt />
      {/* Header - compact on mobile */}
      <header className="bg-white border-b border-slate-200 py-2 sm:py-4 px-3 sm:px-4 lg:px-8 shadow-sm flex-shrink-0 z-20">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <button onClick={handleBack} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition flex-shrink-0">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/30 flex-shrink-0">
                <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 truncate">{company?.name}</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                  {kioskEmployee ? `${kioskEmployee.name} · ${{beheerder:'Beheerder',boekhouder:'Boekhouder',kiosk_medewerker:'Kiosk Medewerker'}[kioskEmployee.role] || kioskEmployee.role}` : 'Admin Dashboard'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            <button
              onClick={copyKioskUrl}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs lg:text-sm font-medium hover:bg-slate-200 transition"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">Kopieer URL</span>
            </button>
            <button
              onClick={handleOpenKiosk}
              data-testid="admin-open-kiosk-btn"
              className="w-7 h-7 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 flex items-center justify-center gap-1.5 bg-orange-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
            >
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Kiosk</span>
            </button>
            <button
              onClick={handleLogout}
              data-testid="admin-logout-button"
              className="w-7 h-7 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 flex items-center justify-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
              <span className="hidden sm:inline">Uit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop tabs - hidden on mobile */}
      <div className="hidden md:block bg-slate-100 border-b border-slate-200 px-3 sm:px-4 lg:px-8 pt-4 pb-2 flex-shrink-0 z-10">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition active:scale-95 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-4 lg:px-8 py-3 sm:py-4 pb-20 md:pb-6" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>

        {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} payments={payments} leases={leases} formatSRD={formatSRD} />}

        {activeTab === 'tenants' && (
          <TenantsTab 
            tenants={tenants}
            apartments={apartments}
            leases={leases}
            formatSRD={formatSRD}
            getInitials={getInitials}
            onAddTenant={() => { setEditingItem(null); setShowTenantModal(true); }}
            onEditTenant={(t) => { setEditingItem(t); setShowTenantModal(true); }}
            onAddRent={(t) => { setSelectedTenant(t); setShowAddRentModal(true); }}
            onRefresh={loadData}
            token={token}
          />
        )}

        {activeTab === 'locations' && (
          <LocationsTab
            token={token}
            apartments={apartments}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'apartments' && (
          <ApartmentsTab 
            apartments={apartments}
            tenants={tenants}
            formatSRD={formatSRD}
            onAdd={() => { setEditingItem(null); setShowApartmentModal(true); }}
            onEdit={(a) => { setEditingItem(a); setShowApartmentModal(true); }}
            onDelete={async (id) => {
              if (!confirm('Weet u zeker dat u dit appartement wilt verwijderen?')) return;
              try {
                await axios.delete(`${API}/admin/apartments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                loadData();
              } catch { alert('Verwijderen mislukt'); }
            }}
            token={token}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab 
            payments={filteredPayments}
            totalFiltered={totalFiltered}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            formatSRD={formatSRD}
            token={token}
            company={company}
            tenants={tenants}
            onRefresh={loadData}
            onDeletePayment={async (id) => {
              if (!confirm('Weet u zeker dat u deze betaling wilt verwijderen?')) return;
              try {
                await axios.delete(`${API}/admin/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                loadData();
              } catch { alert('Verwijderen mislukt'); }
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab company={company} token={token} onRefresh={loadData} tenants={tenants} />
        )}

        {activeTab === 'kas' && (
          <KasTab token={token} tenants={tenants} formatSRD={formatSRD} />
        )}

        {activeTab === 'loans' && (
          <LoansTab token={token} tenants={tenants} formatSRD={formatSRD} onShowDetail={setLoanDetailData} />
        )}

        {activeTab === 'employees' && (
          <EmployeesTab token={token} formatSRD={formatSRD} />
        )}

        {activeTab === 'power' && (
          <PowerTab apartments={apartments} tenants={tenants} token={token} onRefresh={loadData} />
        )}

        {activeTab === 'internet' && (
          <InternetTab token={token} tenants={tenants} formatSRD={formatSRD} onRefresh={loadData} />
        )}

      </div>

      {/* Modals */}
      {showApartmentModal && (
        <ApartmentModal
          apartment={editingItem}
          onClose={() => setShowApartmentModal(false)}
          onSave={() => { setShowApartmentModal(false); loadData(); }}
          token={token}
        />
      )}

      {showTenantModal && (
        <TenantModal
          tenant={editingItem}
          apartments={apartments}
          onClose={() => setShowTenantModal(false)}
          onSave={() => { setShowTenantModal(false); loadData(); }}
          token={token}
          companyId={company?.company_id}
        />
      )}

      {showAddRentModal && selectedTenant && (
        <AddRentModal
          tenant={selectedTenant}
          onClose={() => { setShowAddRentModal(false); setSelectedTenant(null); }}
          onSave={() => { setShowAddRentModal(false); setSelectedTenant(null); loadData(); }}
          token={token}
        />
      )}

      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          token={token}
          onRefresh={loadData}
        />
      )}

      {loanDetailData && (
        <LoanDetailModal
          loan={loanDetailData}
          formatSRD={formatSRD}
          onClose={() => setLoanDetailData(null)}
          onPay={() => {}}
        />
      )}

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[55] flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {MOBILE_MAIN_TABS.map(tabId => {
          const tab = TABS.find(t => t.id === tabId);
          if (!tab) return null;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowMoreMenu(false); }}
              className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${isActive ? 'text-orange-500' : 'text-slate-400'}`}
              data-testid={`mobile-nav-${tab.id}`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>{tab.label}</span>
            </button>
          );
        })}
        {/* More menu button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative ${
            !MOBILE_MAIN_TABS.includes(activeTab) || showMoreMenu ? 'text-orange-500' : 'text-slate-400'
          }`}
          data-testid="mobile-nav-more"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          <span className="text-[10px] mt-0.5 font-medium">Meer</span>
        </button>
      </nav>

      {/* Mobile "Meer" popup menu */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute bottom-[56px] left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 grid grid-cols-3 gap-2">
              {/* Special action: QR Scanner */}
              <button
                onClick={() => { setShowQRScanner(true); setShowMoreMenu(false); }}
                data-testid="mobile-qr-scanner-btn"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors active:scale-95 text-orange-600 bg-orange-50 border border-orange-200"
              >
                <QrCode className="w-5 h-5" />
                <span className="text-[11px] font-bold">QR Scan</span>
              </button>
              {MOBILE_MORE_TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setShowMoreMenu(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors active:scale-95 ${
                      isActive ? 'bg-orange-50 text-orange-500' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionBanner({ token }) {
  const [sub, setSub] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('sub_banner_dismissed') === '1');

  useEffect(() => {
    if (!token || dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
        const r = await axios.get(`${API}/admin/subscription`, { headers: { Authorization: `Bearer ${token}` } });
        if (!cancelled) setSub(r.data);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [token, dismissed]);

  if (!sub || sub.lifetime || dismissed) return null;
  const status = sub.subscription_status;
  if (status === 'active' || status === 'lifetime') return null;

  let message = '';
  let style = 'bg-blue-500 hover:bg-blue-600';
  if (status === 'trial' && sub.days_left_trial !== null) {
    if (sub.days_left_trial <= 3) {
      message = `⏰ Uw proefperiode eindigt over ${sub.days_left_trial} dag(en). Maak SRD ${sub.monthly_price.toLocaleString('nl-NL')} over om door te gaan.`;
      style = 'bg-amber-500 hover:bg-amber-600';
    } else {
      message = `✨ Proefperiode actief — nog ${sub.days_left_trial} dagen. Vergeet niet op tijd SRD ${sub.monthly_price.toLocaleString('nl-NL')} over te maken.`;
    }
  } else if (status === 'overdue') {
    message = `⚠️ Uw abonnement is ACHTERSTALLIG. Maak SRD ${sub.monthly_price.toLocaleString('nl-NL')} over om uw account volledig actief te houden.`;
    style = 'bg-red-500 hover:bg-red-600';
  } else {
    return null;
  }

  const handleDismiss = (e) => {
    e.stopPropagation();
    sessionStorage.setItem('sub_banner_dismissed', '1');
    setDismissed(true);
  };

  const bd = sub.bank_details || {};
  const hasBank = bd.bank_name || bd.account_number;

  return (
    <div
      className={`w-full ${style} text-white px-3 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 flex-shrink-0 transition z-20`}
      data-testid="subscription-banner"
    >
      <span className="truncate flex-1 text-center">{message}
        {hasBank && <span className="hidden md:inline ml-2 font-normal opacity-90">Bank: {bd.bank_name} · {bd.account_number}</span>}
      </span>
      <button onClick={handleDismiss} className="text-white/80 hover:text-white text-xs underline flex-shrink-0" data-testid="dismiss-sub-banner">
        Verberg
      </button>
    </div>
  );
}

function ImpersonationBanner() {
  const navigate = useNavigate();
  const isImpersonating = typeof window !== 'undefined' && sessionStorage.getItem('sa_impersonating') === '1';
  if (!isImpersonating) return null;
  const companyName = sessionStorage.getItem('sa_impersonating_company') || 'dit bedrijf';

  const handleReturn = () => {
    // Clean up impersonation state and company token so the superadmin can
    // return to the superadmin dashboard without residue.
    try {
      localStorage.removeItem('kiosk_token');
      const cid = sessionStorage.getItem('sa_impersonating_company_id');
      if (cid) sessionStorage.removeItem(`kiosk_pin_verified_${cid}`);
      sessionStorage.removeItem('sa_impersonating');
      sessionStorage.removeItem('sa_impersonating_company');
      sessionStorage.removeItem('sa_impersonating_company_id');
    } catch (e) { /* noop */ }
    navigate('/vastgoed/superadmin');
  };

  return (
    <button
      onClick={handleReturn}
      data-testid="impersonation-banner"
      className="w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 flex-shrink-0 transition z-30"
      title="Klik om terug te keren naar Superadmin"
    >
      <Shield className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">
        U bent ingelogd als <strong className="font-bold">{companyName}</strong> via Superadmin
      </span>
      <span className="hidden sm:inline font-bold underline">← Terug naar Superadmin</span>
      <span className="sm:hidden font-bold underline">← Terug</span>
    </button>
  );
}
