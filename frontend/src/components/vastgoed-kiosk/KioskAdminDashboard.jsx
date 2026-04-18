import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Home, ArrowLeft, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, LogIn, Landmark, Briefcase, Wallet, Wifi
} from 'lucide-react';
import axios from 'axios';

// Admin sub-components
import DashboardTab from './admin/DashboardTab';
import TenantsTab from './admin/TenantsTab';
import ApartmentsTab from './admin/ApartmentsTab';
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskAdminDashboard({ companyId: propCompanyId, pinAuthenticated = false, onBack, onLock, kioskEmployee }) {
  const navigate = useNavigate();
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

  const handleLogout = () => {
    if (onLock) {
      onLock();
    } else {
      localStorage.removeItem('kiosk_token');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const ALL_TABS = [
    { id: 'dashboard', label: 'Home', icon: Building2 },
    { id: 'tenants', label: 'Huurders', icon: Users },
    { id: 'apartments', label: 'Appt.', icon: Home },
    { id: 'payments', label: 'Kwitanties', icon: Receipt },
    { id: 'kas', label: 'Bank/Kas', icon: Landmark },
    { id: 'loans', label: 'Leningen', icon: Wallet },
    { id: 'employees', label: 'Werknemers', icon: Briefcase },
    { id: 'power', label: 'Stroom', icon: Zap },
    { id: 'internet', label: 'Internet', icon: Wifi },
    { id: 'settings', label: 'Instellingen', icon: Settings },
  ];

  // Role-based access control
  const ROLE_TABS = {
    beheerder: ['dashboard', 'tenants', 'apartments', 'payments', 'kas', 'loans', 'employees', 'power', 'internet', 'settings'],
    boekhouder: ['dashboard', 'tenants', 'payments', 'kas'],
    kiosk_medewerker: ['dashboard', 'payments'],
  };
  const employeeRole = kioskEmployee?.role;
  const allowedTabIds = employeeRole ? (ROLE_TABS[employeeRole] || ROLE_TABS.kiosk_medewerker) : null;
  const TABS = allowedTabIds ? ALL_TABS.filter(t => allowedTabIds.includes(t.id)) : ALL_TABS;

  // Mobile bottom nav
  const MOBILE_MAIN_TABS = ['dashboard', 'tenants', 'apartments', 'payments'].filter(id => TABS.some(t => t.id === id));
  const MOBILE_MORE_TABS = TABS.filter(t => !MOBILE_MAIN_TABS.includes(t.id));

  // Reset tab when role changes
  useEffect(() => {
    if (!TABS.some(t => t.id === activeTab)) setActiveTab(TABS[0]?.id || 'dashboard');
  }, [employeeRole]); // eslint-disable-line

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 z-50" style={{ overflow: 'hidden' }}>
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
              onClick={handleBack}
              className="w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 flex items-center justify-center gap-1.5 bg-orange-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Kiosk</span>
            </button>
            <button
              onClick={handleLogout}
              data-testid="admin-logout-button"
              className="w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 flex items-center justify-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
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
