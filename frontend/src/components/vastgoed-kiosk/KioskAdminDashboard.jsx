import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CreditCard, Home, Plus, Pencil, Trash2, 
  ArrowLeft, DollarSign, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, Crown, Search, Calendar,
  AlertTriangle, User, Banknote, FileText, Save, Eye, LogIn, MessageSquare,
  Phone, Mail, Landmark, UserCog, TrendingUp, TrendingDown, Briefcase, ScanFace, Camera, XCircle, CheckCircle, Bell, Wallet, Wifi, Power, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import ReceiptTicket from './ReceiptTicket';
import VirtualKeyboard from './VirtualKeyboard';
import FaceCapture from './FaceCapture';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskAdminDashboard({ companyId: propCompanyId, pinAuthenticated = false, onBack, onLock }) {
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

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const token = localStorage.getItem('kiosk_token');

  // Handle back navigation
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
      // If no token and not PIN authenticated, redirect to login
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
      const [meRes, dashRes, aptRes, tenRes, payRes, leaseRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { headers }),
        axios.get(`${API}/admin/dashboard`, { headers }),
        axios.get(`${API}/admin/apartments`, { headers }),
        axios.get(`${API}/admin/tenants`, { headers }),
        axios.get(`${API}/admin/payments`, { headers }),
        axios.get(`${API}/admin/leases`, { headers })
      ]);
      setCompany(meRes.data);
      setDashboard(dashRes.data);
      setApartments(aptRes.data);
      setTenants(tenRes.data);
      setPayments(payRes.data);
      setLeases(leaseRes.data);
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

  const totalFiltered = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Building2 },
    { id: 'tenants', label: 'Huurders', icon: Users },
    { id: 'apartments', label: 'Appartementen', icon: Home },
    { id: 'payments', label: 'Kwitanties', icon: Receipt },
    { id: 'kas', label: 'Bank/Kas', icon: Landmark },
    { id: 'loans', label: 'Leningen', icon: Wallet },
    { id: 'employees', label: 'Werknemers', icon: Briefcase },
    { id: 'power', label: 'Stroombrekers', icon: Zap },
    { id: 'internet', label: 'Internet', icon: Wifi },
    { id: 'settings', label: 'Instellingen', icon: Settings },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 flex flex-col bg-slate-100" style={{ overflow: 'hidden', bottom: '7vh' }}>
      {/* Header - fixed */}
      <header className="bg-white border-b border-slate-200 py-3 sm:py-4 px-3 sm:px-4 lg:px-8 shadow-sm flex-shrink-0 z-20">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base lg:text-lg font-bold text-slate-900">{company?.name}</h1>
                <p className="text-xs text-slate-500">Admin Dashboard</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={copyKioskUrl}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs lg:text-sm font-medium hover:bg-slate-200 transition"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">Kopieer URL</span>
            </button>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-xs lg:text-sm font-bold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Kiosk</span>
            </button>
            <button
              onClick={handleLogout}
              data-testid="admin-logout-button"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs lg:text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <LogIn className="w-4 h-4 rotate-180" />
              <span className="hidden sm:inline">Uit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs - fixed */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-4 lg:px-8 pt-4 pb-2 flex-shrink-0 z-10">
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
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 lg:px-8 py-4 pb-6">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} payments={payments} leases={leases} formatSRD={formatSRD} />}

        {/* Tenants Tab */}
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

        {/* Apartments Tab */}
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
          />
        )}

        {/* Payments/Kwitanties Tab */}
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
            onDeletePayment={async (id) => {
              if (!confirm('Weet u zeker dat u deze betaling wilt verwijderen?')) return;
              try {
                await axios.delete(`${API}/admin/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                loadData();
              } catch { alert('Verwijderen mislukt'); }
            }}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab company={company} token={token} onRefresh={loadData} tenants={tenants} />
        )}

        {/* Bank/Kas Tab */}
        {activeTab === 'kas' && (
          <KasTab token={token} tenants={tenants} formatSRD={formatSRD} />
        )}

        {/* Leningen Tab */}
        {activeTab === 'loans' && (
          <LoansTab token={token} tenants={tenants} formatSRD={formatSRD} onShowDetail={setLoanDetailData} />
        )}

        {/* Werknemers Tab */}
        {activeTab === 'employees' && (
          <EmployeesTab token={token} formatSRD={formatSRD} />
        )}

        {/* Power/Stroombrekers Tab */}
        {activeTab === 'power' && (
          <PowerTab apartments={apartments} tenants={tenants} token={token} onRefresh={loadData} />
        )}

        {/* Internet Tab */}
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

      <VirtualKeyboard />

      {/* Loan Detail Modal - buiten scrollable area */}
      {loanDetailData && (
        <LoanDetailModal
          loan={loanDetailData}
          formatSRD={formatSRD}
          onClose={() => setLoanDetailData(null)}
          onPay={() => {}}
        />
      )}
    </div>
  );
}

// ============== DASHBOARD TAB ==============
function DashboardTab({ dashboard, payments, leases, formatSRD }) {
  // Suriname time (UTC-3) — hooks must be before any conditional return
  const [srTime, setSrTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setSrTime(now.toLocaleString('nl-NL', {
        timeZone: 'America/Paramaribo',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!dashboard) return null;

  // Check expiring leases (within 30 days)
  const now = new Date();
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLeases = (leases || []).filter(l => {
    if (l.status === 'terminated') return false;
    const end = new Date(l.end_date);
    return end >= now && end <= in30days;
  });
  const expiredLeases = (leases || []).filter(l => {
    if (l.status === 'terminated') return false;
    return new Date(l.end_date) < now;
  });

  const stats = [
    { icon: Home, label: 'Appartementen', value: dashboard.total_apartments },
    { icon: Users, label: 'Actieve Huurders', value: dashboard.total_tenants },
    { icon: DollarSign, label: 'Openstaande Huur', value: formatSRD(dashboard.total_outstanding) },
    { icon: FileText, label: 'Open Servicekosten', value: formatSRD(dashboard.total_service_costs) },
    { icon: AlertTriangle, label: 'Open Boetes', value: formatSRD(dashboard.total_fines) },
    { icon: Wifi, label: 'Open Internet', value: formatSRD(dashboard.total_internet || 0) },
    { icon: CreditCard, label: 'Ontvangen (maand)', value: formatSRD(dashboard.total_received_month) },
  ];

  const recentPayments = (payments || []).slice(0, 6);

  return (
    <div>
      {/* Lease expiry warnings */}
      {expiredLeases.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-4 flex items-center gap-3" data-testid="expired-leases-warning">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">{expiredLeases.length} huurovereenkomst{expiredLeases.length !== 1 ? 'en' : ''} verlopen</p>
            <p className="text-sm text-red-600">{expiredLeases.map(l => l.tenant_name).join(', ')}</p>
          </div>
        </div>
      )}
      {expiringLeases.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 mb-4 flex items-center gap-3" data-testid="expiring-leases-warning">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-orange-700">{expiringLeases.length} huurovereenkomst{expiringLeases.length !== 1 ? 'en' : ''} verlopen binnen 30 dagen</p>
            <p className="text-sm text-orange-600">{expiringLeases.map(l => `${l.tenant_name} (${l.end_date})`).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Overzicht</h2>
          <span className="text-sm text-slate-500">{srTime}</span>
        </div>
        {/* Mobile: grid cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:hidden gap-px bg-slate-100">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
              <p className="text-base font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr>
                {stats.map((stat, i) => (
                  <th key={i} className="p-4 text-sm font-medium text-slate-500 text-left whitespace-nowrap">{stat.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                {stats.map((stat, i) => (
                  <td key={i} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <stat.icon className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="text-lg font-bold text-slate-900 whitespace-nowrap">{stat.value}</p>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recente betalingen - zelfde tabel-stijl */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Recente betalingen</h2>
        </div>
        {recentPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nog geen betalingen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Kwitantie</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <tr key={p.payment_id || i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.tenant_name}</td>
                    <td className="p-4 text-slate-600">{p.apartment_number}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-semibold">
                        {p.payment_type === 'rent' ? 'Huur'
                          : p.payment_type === 'service' ? 'Service'
                          : p.payment_type === 'fine' ? 'Boetes'
                          : p.payment_type === 'partial_rent' ? 'Gedeeltelijke huur'
                          : p.payment_type === 'deposit' ? 'Borgsom'
                          : p.payment_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(p.amount)}</td>
                    <td className="p-4 text-right text-sm text-slate-400 font-mono">{p.kwitantie_nummer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============== TENANTS TAB ==============
function TenantsTab({ tenants, apartments, leases, formatSRD, getInitials, onAddTenant, onEditTenant, onAddRent, onRefresh, token }) {
  const [tenantSearch, setTenantSearch] = useState('');
  const activeTenants = tenants.filter(t => {
    if (t.status !== 'active') return false;
    if (!tenantSearch) return true;
    const q = tenantSearch.toLowerCase();
    return t.name?.toLowerCase().includes(q) ||
      t.apartment_number?.toLowerCase().includes(q) ||
      t.tenant_code?.toLowerCase().includes(q);
  });
  const [deleting, setDeleting] = useState(null);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Weet u zeker dat u "${tenant.name}" wilt verwijderen?`)) return;
    setDeleting(tenant.tenant_id);
    try {
      await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, { status: 'inactive' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch {
      alert('Verwijderen mislukt');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteLease = async (leaseId) => {
    if (!window.confirm('Weet u zeker dat u deze huurovereenkomst wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/leases/${leaseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch {
      alert('Verwijderen mislukt');
    }
  };

  const openLeaseDoc = (leaseId) => {
    window.open(`${API}/admin/leases/${leaseId}/document?token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Huurders tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              placeholder="Zoek op naam, appartement, code..."
              data-testid="tenant-search-input"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <span className="text-sm text-slate-500 whitespace-nowrap">{activeTenants.length} huurder{activeTenants.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onAddTenant}
            data-testid="add-tenant-button"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Huurder
          </button>
        </div>
        {activeTenants.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen huurders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurmaand</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Huur</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Service</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Boetes</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Internet</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Totaal</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-500">Face ID</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {activeTenants.map(tenant => {
                  const rent = tenant.outstanding_rent || 0;
                  const service = tenant.service_costs || 0;
                  const fines = tenant.fines || 0;
                  const internet = tenant.internet_outstanding || tenant.internet_cost || 0;
                  const total = rent + service + fines + internet;
                  const hasArrears = rent > (tenant.monthly_rent || 0);

                  // Format billed month
                  const billedMonth = tenant.rent_billed_through || '';
                  let billedLabel = '';
                  if (billedMonth) {
                    const [y, m] = billedMonth.split('-');
                    const d = new Date(parseInt(y), parseInt(m) - 1);
                    billedLabel = d.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
                  }

                  // Overdue months from API
                  const overdueMonths = tenant.overdue_months || [];

                  return (
                    <tr key={tenant.tenant_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`tenant-row-${tenant.tenant_id}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {getInitials(tenant.name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{tenant.name}</p>
                            <p className="text-xs text-slate-400">{tenant.tenant_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{tenant.apartment_number}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                          t/m {billedLabel}
                        </span>
                        {overdueMonths.length > 0 && (
                          <div className="mt-1">
                            <span className="text-[11px] text-red-500 font-medium">
                              Achterstand: {overdueMonths.join(', ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${rent > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatSRD(rent)}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${service > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {formatSRD(service)}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${fines > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatSRD(fines)}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${internet > 0 ? 'text-slate-900' : 'text-slate-800'}`}>
                        {internet > 0 ? formatSRD(internet) : '-'}
                        {tenant.internet_plan_name && <p className="text-[10px] text-slate-400 mt-0.5">{tenant.internet_plan_name}</p>}
                      </td>
                      <td className={`p-4 text-right font-black whitespace-nowrap ${total > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {formatSRD(total)}
                      </td>
                      <td className="p-4 text-center">
                        {tenant.face_id_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-600" data-testid={`face-badge-${tenant.tenant_id}`}>
                            <ScanFace className="w-3 h-3" /> Actief
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {hasArrears ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Achterstand</span>
                        ) : total === 0 ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">Betaald</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">Open</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onAddRent(tenant)} data-testid={`add-rent-${tenant.tenant_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Maandhuur toevoegen">
                            <DollarSign className="w-4 h-4" />
                          </button>
                          {total > 0 && (
                            <button 
                              onClick={async () => {
                                if (!confirm(`WhatsApp herinnering sturen naar ${tenant.name}?`)) return;
                                try {
                                  const res = await axios.post(`${API}/admin/whatsapp/send`, { tenant_id: tenant.tenant_id, message_type: 'overdue' }, { headers: { Authorization: `Bearer ${token}` } });
                                  alert(res.data.message);
                                } catch (err) {
                                  alert(err.response?.data?.detail || 'Bericht versturen mislukt. Configureer WhatsApp in Instellingen.');
                                }
                              }}
                              data-testid={`wa-send-${tenant.tenant_id}`} 
                              className="text-slate-400 hover:text-green-500 p-1" 
                              title="WhatsApp herinnering sturen"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                          )}
                          <button onClick={() => onEditTenant(tenant)} data-testid={`edit-tenant-${tenant.tenant_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tenant)} data-testid={`delete-tenant-${tenant.tenant_id}`} disabled={deleting === tenant.tenant_id} className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-50" title="Verwijderen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Huurovereenkomsten tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Huurovereenkomsten ({(leases || []).length})</h2>
          <button
            onClick={() => { setEditingLease(null); setShowLeaseModal(true); }}
            data-testid="add-lease-button"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Overeenkomst
          </button>
        </div>
        {(leases || []).length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen huurovereenkomsten</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Startdatum</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Einddatum</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Maandhuur</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {(leases || []).map(lease => {
                  const isExpired = new Date(lease.end_date) < new Date();
                  const status = lease.status === 'terminated' ? 'terminated' : isExpired ? 'expired' : 'active';
                  return (
                    <tr key={lease.lease_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`lease-row-${lease.lease_id}`}>
                      <td className="p-4 font-bold text-slate-900">{lease.tenant_name}</td>
                      <td className="p-4 text-slate-600">{lease.apartment_number}</td>
                      <td className="p-4 text-slate-600">{lease.start_date}</td>
                      <td className="p-4 text-slate-600">{lease.end_date}</td>
                      <td className="p-4 text-right font-bold text-slate-900">{formatSRD(lease.monthly_rent)}</td>
                      <td className="p-4">
                        {status === 'active' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">Actief</span>
                        ) : status === 'expired' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Verlopen</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Beëindigd</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openLeaseDoc(lease.lease_id)} data-testid={`lease-doc-${lease.lease_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Document genereren">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingLease(lease); setShowLeaseModal(true); }} data-testid={`lease-edit-${lease.lease_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteLease(lease.lease_id)} data-testid={`lease-delete-${lease.lease_id}`} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lease Modal */}
      {showLeaseModal && (
        <LeaseModal
          lease={editingLease}
          tenants={activeTenants}
          apartments={apartments}
          onClose={() => { setShowLeaseModal(false); setEditingLease(null); }}
          onSave={() => { setShowLeaseModal(false); setEditingLease(null); onRefresh(); }}
          token={token}
        />
      )}
    </div>
  );
}

// ============== APARTMENTS TAB ==============
function ApartmentsTab({ apartments, tenants, formatSRD, onAdd, onEdit, onDelete }) {
  const [aptSearch, setAptSearch] = useState('');
  const filteredApartments = apartments.filter(apt => {
    if (!aptSearch) return true;
    const q = aptSearch.toLowerCase();
    const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
    return apt.number?.toLowerCase().includes(q) ||
      apt.description?.toLowerCase().includes(q) ||
      tenant?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={aptSearch}
            onChange={(e) => setAptSearch(e.target.value)}
            placeholder="Zoek op nummer, omschrijving, huurder..."
            data-testid="apartment-search-input"
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>
        <span className="text-sm text-slate-500 whitespace-nowrap">{filteredApartments.length} appartement{filteredApartments.length !== 1 ? 'en' : ''}</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nieuw Appartement
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Nummer</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Omschrijving</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Huur</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
              <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredApartments.map(apt => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              return (
                <tr key={apt.apartment_id} className="border-t border-slate-100">
                  <td className="p-4 font-bold text-slate-900">{apt.number}</td>
                  <td className="p-4 text-slate-500">{apt.description || '-'}</td>
                  <td className="p-4">{tenant?.name || <span className="text-slate-400">-</span>}</td>
                  <td className="p-4">{formatSRD(apt.monthly_rent)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      apt.status === 'occupied' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {apt.status === 'occupied' ? 'Bezet' : 'Beschikbaar'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(apt)} className="text-slate-400 hover:text-orange-500 p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(apt.apartment_id)} className="text-slate-400 hover:text-red-500 p-1" data-testid={`delete-apt-${apt.apartment_id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== PAYMENTS/KWITANTIES TAB ==============
function PaymentsTab({ payments, totalFiltered, searchTerm, setSearchTerm, selectedMonth, setSelectedMonth, formatSRD, token, company, onDeletePayment }) {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    });
  }

  const stampData = company ? {
    stamp_company_name: company.stamp_company_name || company.name,
    stamp_address: company.stamp_address || company.adres || '',
    stamp_phone: company.stamp_phone || company.telefoon || '',
    stamp_whatsapp: company.stamp_whatsapp || '',
    bank_name: company.bank_name || '',
    bank_account_name: company.bank_account_name || '',
    bank_account_number: company.bank_account_number || '',
    bank_description: company.bank_description || '',
  } : null;

  const PRINT_SERVER_URL = 'http://localhost:5555';
  const handlePrint = async () => {
    if (!selectedPayment) return;
    const printData = {
      company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
      address: stampData?.stamp_address || '',
      phone: stampData?.stamp_phone || '',
      receipt_number: selectedPayment.kwitantie_nummer || '',
      date: new Date(selectedPayment.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: new Date(selectedPayment.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      tenant_name: selectedPayment.tenant_name || '',
      apartment: `${selectedPayment.apartment_number || ''} / ${selectedPayment.tenant_code || ''}`,
      payment_type: { rent: 'Huurbetaling', monthly_rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[selectedPayment.payment_type] || selectedPayment.payment_type,
      amount: Number(selectedPayment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
      total: Number(selectedPayment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
      payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' }[selectedPayment.payment_method] || selectedPayment.payment_method || 'Contant',
      remaining_total: Number((selectedPayment.remaining_rent || 0) + (selectedPayment.remaining_service || 0) + (selectedPayment.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2 })
    };
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) });
      } else {
        window.print();
      }
    } catch { window.print(); }
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Zoek op naam, appartement, kwitantienummer..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
          >
            <option value="all">Alle maanden</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="text-right px-4 py-2 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-600">{payments.length} betalingen</p>
          <p className="text-lg font-bold text-orange-600">{formatSRD(totalFiltered)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Geen betalingen gevonden
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Kwitantie</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Appt</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.payment_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-600">
                    {new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 font-mono text-sm text-orange-600">{p.kwitantie_nummer}</td>
                  <td className="p-4 font-medium text-slate-900">{p.tenant_name}</td>
                  <td className="p-4 text-slate-600">{p.apartment_number}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {{monthly_rent:'Maandhuur',service_costs:'Servicekosten',deposit:'Borg',fine:'Boete',partial_rent:'Deelbetaling',other:'Overig'}[p.payment_type] || p.payment_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800">{formatSRD(p.amount)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        data-testid={`receipt-view-${p.payment_id}`}
                        className="text-slate-400 hover:text-orange-500 p-1"
                        title="Kwitantie bekijken"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePayment(p.payment_id)}
                        data-testid={`delete-payment-${p.payment_id}`}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {/* Kwitantie Preview Modal */}
    {selectedPayment && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={() => setSelectedPayment(null)}>
        <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-[520px] w-full max-h-[95vh] overflow-auto print:max-w-none print:rounded-none print:shadow-none print:bg-white" onClick={(e) => e.stopPropagation()}>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-t-2xl print:hidden">
            <p className="text-white text-sm font-medium">Kwitantie {selectedPayment.kwitantie_nummer}</p>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
                <Receipt className="w-4 h-4" /> Afdrukken
              </button>
              <button onClick={() => setSelectedPayment(null)} className="px-3 py-2 text-slate-400 hover:text-white text-sm">
                Sluiten
              </button>
            </div>
          </div>
          {/* Receipt */}
          <div className="p-4 print:p-0 flex justify-center">
            <ReceiptTicket payment={selectedPayment} tenant={null} preview={true} stampData={stampData} />
          </div>
        </div>
        {/* Hidden full-size for printing */}
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
          <ReceiptTicket payment={selectedPayment} tenant={null} preview={false} stampData={stampData} />
        </div>
      </div>
    )}
    </>
  );
}

// ============== SETTINGS TAB ==============
function SettingsTab({ company, token, onRefresh, tenants }) {
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [billingDay, setBillingDay] = useState(company?.billing_day || 1);
  const [billingNextMonth, setBillingNextMonth] = useState(company?.billing_next_month !== false);
  const [fineAmount, setFineAmount] = useState(company?.fine_amount || 0);
  const [powerCutoffDays, setPowerCutoffDays] = useState(company?.power_cutoff_days || 0);
  const [stampName, setStampName] = useState(company?.stamp_company_name || '');
  const [stampAddress, setStampAddress] = useState(company?.stamp_address || '');
  const [stampPhone, setStampPhone] = useState(company?.stamp_phone || '');
  const [stampWhatsapp, setStampWhatsapp] = useState(company?.stamp_whatsapp || '');
  const [kioskPin, setKioskPin] = useState(company?.kiosk_pin || '');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingFines, setApplyingFines] = useState(false);
  // Bank/betaalmethode
  const [bankName, setBankName] = useState(company?.bank_name || '');
  const [bankAccountName, setBankAccountName] = useState(company?.bank_account_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(company?.bank_account_number || '');
  const [bankDescription, setBankDescription] = useState(company?.bank_description || '');
  // WhatsApp Business API
  const [waApiUrl, setWaApiUrl] = useState(company?.wa_api_url || 'https://graph.facebook.com/v21.0');
  const [waApiToken, setWaApiToken] = useState(company?.wa_api_token || '');
  const [waPhoneId, setWaPhoneId] = useState(company?.wa_phone_id || '');
  const [waEnabled, setWaEnabled] = useState(company?.wa_enabled || false);
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);
  // SumUp Payment Integration
  const [sumupApiKey, setSumupApiKey] = useState(company?.sumup_api_key || '');
  const [sumupMerchantCode, setSumupMerchantCode] = useState(company?.sumup_merchant_code || '');
  const [sumupEnabled, setSumupEnabled] = useState(company?.sumup_enabled || false);
  const [sumupCurrency, setSumupCurrency] = useState(company?.sumup_currency || 'EUR');
  const [sumupExchangeRate, setSumupExchangeRate] = useState(company?.sumup_exchange_rate || '');
  // Mope Payment Integration
  const [mopeApiKey, setMopeApiKey] = useState(company?.mope_api_key || '');
  const [mopeEnabled, setMopeEnabled] = useState(company?.mope_enabled || false);
  // Uni5Pay Payment Integration
  const [uni5MerchantId, setUni5MerchantId] = useState(company?.uni5pay_merchant_id || '');
  const [uni5Enabled, setUni5Enabled] = useState(company?.uni5pay_enabled || false);
  // Start screen setting
  const [startScreen, setStartScreen] = useState(company?.start_screen || 'kiosk');
  // Twilio SMS Integration
  const [twilioSid, setTwilioSid] = useState(company?.twilio_account_sid || '');
  const [twilioToken, setTwilioToken] = useState(company?.twilio_auth_token || '');
  const [twilioPhone, setTwilioPhone] = useState(company?.twilio_phone_number || '');
  const [twilioEnabled, setTwilioEnabled] = useState(company?.twilio_enabled || false);
  const [twilioTesting, setTwilioTesting] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState(null);

  const handleSaveStamp = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        stamp_company_name: stampName,
        stamp_address: stampAddress,
        stamp_phone: stampPhone,
        stamp_whatsapp: stampWhatsapp,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        bank_name: bankName,
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
        bank_description: bankDescription,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        wa_api_url: waApiUrl,
        wa_api_token: waApiToken,
        wa_phone_id: waPhoneId,
        wa_enabled: waEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      // Save first, then test
      await handleSaveWhatsApp();
      const res = await axios.post(`${API}/admin/whatsapp/test`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setWaTestResult(res.data);
    } catch (err) {
      setWaTestResult({ status: 'error', message: 'Test mislukt' });
    } finally {
      setWaTesting(false);
    }
  };

  const handleSaveTwilio = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
        twilio_phone_number: twilioPhone,
        twilio_enabled: twilioEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTwilio = async () => {
    setTwilioTesting(true);
    setTwilioTestResult(null);
    try {
      await handleSaveTwilio();
      const res = await axios.post(`${API}/admin/twilio/test`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTwilioTestResult(res.data);
    } catch (err) {
      setTwilioTestResult({ status: 'error', message: 'Test mislukt' });
    } finally {
      setTwilioTesting(false);
    }
  };

  const handleSaveSumUp = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        sumup_api_key: sumupApiKey,
        sumup_merchant_code: sumupMerchantCode,
        sumup_enabled: sumupEnabled,
        sumup_currency: sumupCurrency,
        sumup_exchange_rate: parseFloat(sumupExchangeRate) || 1.0
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      alert('SumUp instellingen opgeslagen!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMope = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        mope_api_key: mopeApiKey,
        mope_enabled: mopeEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      alert('Mope instellingen opgeslagen!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUni5Pay = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        uni5pay_merchant_id: uni5MerchantId,
        uni5pay_enabled: uni5Enabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      alert('Uni5Pay instellingen opgeslagen!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        billing_day: billingDay,
        billing_next_month: billingNextMonth,
        fine_amount: fineAmount,
        power_cutoff_days: powerCutoffDays
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyFines = async () => {
    if (!confirm('Weet u zeker dat u boetes wilt toepassen op alle huurders met achterstand?')) return;
    setApplyingFines(true);
    try {
      await axios.post(`${API}/admin/apply-fines`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      onRefresh();
      alert('Boetes zijn toegepast');
    } catch (err) {
      alert('Boetes toepassen mislukt');
    } finally {
      setApplyingFines(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab selector */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setSettingsSubTab('general')}
          data-testid="settings-subtab-general"
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${settingsSubTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Settings className="w-4 h-4" /> Instellingen
        </button>
        <button
          onClick={() => setSettingsSubTab('notifications')}
          data-testid="settings-subtab-notifications"
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${settingsSubTab === 'notifications' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Bell className="w-4 h-4" /> Notificaties
        </button>
      </div>

      {settingsSubTab === 'notifications' ? (
        <MessagesTab token={token} />
      ) : (
      <>
      {/* Facturering & Boetes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Facturering & Boetes</h3>
            <p className="text-sm text-slate-500">Configureer wanneer huur vervalt en het boetebedrag</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Huur vervalt op dag
            </label>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="number"
                min="1"
                max="28"
                value={billingDay}
                onChange={(e) => setBillingDay(parseInt(e.target.value) || 1)}
                className="w-24 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-lg font-bold"
              />
              <span className="text-sm text-slate-500">van de</span>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setBillingNextMonth(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!billingNextMonth ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Dezelfde maand
                </button>
                <button
                  type="button"
                  onClick={() => setBillingNextMonth(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingNextMonth ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Volgende maand
                </button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              <span className="font-medium">Voorbeeld:</span> Huur van maart moet betaald zijn voor{' '}
              <span className="font-bold text-orange-600">
                {billingDay} {billingNextMonth ? 'april' : 'maart'}
              </span>
              . Na die datum wordt de nieuwe maandhuur automatisch bij het saldo opgeteld.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Boetebedrag (SRD)
            </label>
            <p className="text-xs text-slate-400 mb-2">Vast bedrag dat eenmalig wordt toegevoegd bij te late betaling</p>
            <input
              type="number"
              value={fineAmount}
              onChange={(e) => setFineAmount(parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-500" />
                Stroombreker automatisch uitschakelen
              </div>
            </label>
            <p className="text-xs text-slate-400 mb-2">Aantal dagen na de vervaldatum waarna de stroombreker automatisch wordt uitgeschakeld. Zet op 0 om uit te schakelen.</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="90"
                value={powerCutoffDays}
                onChange={(e) => setPowerCutoffDays(parseInt(e.target.value) || 0)}
                data-testid="power-cutoff-days"
                className="w-24 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-lg font-bold"
              />
              <span className="text-sm text-slate-500">dagen na vervaldatum</span>
            </div>
            {powerCutoffDays > 0 && (
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 mt-3 flex items-start gap-2">
                <Zap className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-medium">Let op:</span> Als een huurder {powerCutoffDays} dag{powerCutoffDays !== 1 ? 'en' : ''} na de vervaldatum nog niet betaald heeft, wordt de stroombreker van het gekoppelde appartement automatisch uitgeschakeld.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          <button
            onClick={handleApplyFines}
            disabled={applyingFines}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            {applyingFines ? 'Toepassen...' : 'Boetes nu toepassen'}
          </button>
        </div>
      </div>

      {/* Kiosk PIN Beveiliging */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Kiosk PIN Beveiliging</h3>
            <p className="text-sm text-slate-500">Beveilig uw kiosk met een 4-cijferige PIN code</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              4-cijferige PIN
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Huurders moeten deze PIN invoeren om de kiosk te gebruiken. Laat leeg om PIN uit te schakelen.
            </p>
            <div className="flex gap-2">
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                value={kioskPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setKioskPin(val);
                }}
                placeholder="bijv. 1234"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-2xl tracking-widest font-mono text-center"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                <Eye className={`w-5 h-5 ${showPin ? 'text-orange-500' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className={`p-4 rounded-xl border ${kioskPin && kioskPin.length === 4 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
              {kioskPin && kioskPin.length === 4 ? (
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="font-medium">PIN beveiliging actief</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Geen PIN - Kiosk is open voor iedereen</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-6"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'PIN Opslaan'}
        </button>
      </div>

      {/* Startscherm na inloggen */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Startscherm na inloggen</h3>
            <p className="text-sm text-slate-500">Kies waar u terecht komt na het inloggen op de kiosk</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={async () => {
              setStartScreen('kiosk');
              try {
                await axios.put(`${API}/auth/settings`, { start_screen: 'kiosk' }, { headers: { Authorization: `Bearer ${token}` } });
                onRefresh();
              } catch {}
            }}
            className={`flex-1 p-4 rounded-xl border-2 transition ${startScreen === 'kiosk' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="text-2xl mb-2">
              <svg className={`w-8 h-8 mx-auto ${startScreen === 'kiosk' ? 'text-orange-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <p className={`font-bold text-center ${startScreen === 'kiosk' ? 'text-orange-700' : 'text-slate-700'}`}>Kiosk</p>
            <p className="text-xs text-slate-400 text-center mt-1">Huurders kiezen hun appartement</p>
          </button>
          <button
            type="button"
            onClick={async () => {
              setStartScreen('dashboard');
              try {
                await axios.put(`${API}/auth/settings`, { start_screen: 'dashboard' }, { headers: { Authorization: `Bearer ${token}` } });
                onRefresh();
              } catch {}
            }}
            className={`flex-1 p-4 rounded-xl border-2 transition ${startScreen === 'dashboard' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="text-2xl mb-2">
              <svg className={`w-8 h-8 mx-auto ${startScreen === 'dashboard' ? 'text-orange-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </div>
            <p className={`font-bold text-center ${startScreen === 'dashboard' ? 'text-orange-700' : 'text-slate-700'}`}>Dashboard</p>
            <p className="text-xs text-slate-400 text-center mt-1">Direct naar het beheerder dashboard</p>
          </button>
        </div>
      </div>

      {/* Bedrijfsstempel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Bedrijfsstempel</h3>
            <p className="text-sm text-slate-500">Configureer de stempel die op kwitanties en huurovereenkomsten wordt getoond</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bedrijfsnaam</label>
              <input
                type="text"
                value={stampName}
                onChange={(e) => setStampName(e.target.value)}
                placeholder="bijv. Uw Bedrijfsnaam"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Adres</label>
              <input
                type="text"
                value={stampAddress}
                onChange={(e) => setStampAddress(e.target.value)}
                placeholder="bijv. Straatnaam nr.1"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Telefoon</label>
              <input
                type="text"
                value={stampPhone}
                onChange={(e) => setStampPhone(e.target.value)}
                placeholder="bijv. 1234567"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp</label>
              <input
                type="text"
                value={stampWhatsapp}
                onChange={(e) => setStampWhatsapp(e.target.value)}
                placeholder="bijv. 0000000000"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Stamp Preview - matches physical stamp */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Voorbeeld</label>
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 flex items-center justify-center min-h-[220px]">
              <div style={{ transform: 'rotate(-5deg)' }}>
                <div style={{
                  border: '2.5px solid #991b1b',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(255,255,255,0.6)',
                }}>
                  {/* House icon - SVG matching the physical stamp */}
                  <svg width="52" height="48" viewBox="0 0 52 48" fill="none" style={{ flexShrink: 0 }}>
                    {/* Back house */}
                    <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
                    <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
                    <rect x="18" y="22" width="6" height="6" fill="white" rx="0.5"/>
                    <rect x="28" y="22" width="6" height="6" fill="white" rx="0.5"/>
                    {/* Front house */}
                    <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
                    <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
                    <rect x="8" y="31" width="5" height="5" fill="white" rx="0.5"/>
                    <rect x="16" y="31" width="5" height="5" fill="white" rx="0.5"/>
                    <rect x="8" y="38" width="5" height="6" fill="white" rx="0.5"/>
                    <rect x="16" y="38" width="5" height="6" fill="white" rx="0.5"/>
                  </svg>
                  {/* Text */}
                  <div style={{ lineHeight: 1.4 }}>
                    <p style={{ color: '#991b1b', fontWeight: 700, fontSize: '13px', margin: 0 }}>
                      {stampName || 'Bedrijfsnaam'}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0, fontWeight: 500 }}>
                      {stampAddress || 'Adres'}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0, fontWeight: 500 }}>
                      Tel : {stampPhone || '0000000'}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0, fontWeight: 500 }}>
                      Whatsapp : {stampWhatsapp || '0000000'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveStamp}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 disabled:opacity-50 mt-6"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Stempel opslaan'}
        </button>
      </div>

      {/* Betaalmethoden / Bankoverschrijving */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Betaalmethoden</h3>
            <p className="text-sm text-slate-500">Bankgegevens voor overschrijving — wordt getoond op kwitanties</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banknaam</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="bijv. De Surinaamsche Bank" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rekeninghouder</label>
            <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="bijv. Uw Bedrijfsnaam" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rekeningnummer</label>
            <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="bijv. 1234567890" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving (optioneel)</label>
            <input type="text" value={bankDescription} onChange={e => setBankDescription(e.target.value)} placeholder="bijv. Vermeld uw huurderscode" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        {(bankName || bankAccountNumber) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-bold text-blue-800 mb-2">Voorbeeld op kwitantie:</p>
            <div className="text-sm text-blue-700">
              <p>Bank: {bankName || '—'}</p>
              <p>Rekening: {bankAccountNumber || '—'}</p>
              <p>T.n.v.: {bankAccountName || '—'}</p>
              {bankDescription && <p className="text-xs text-blue-500 mt-1">{bankDescription}</p>}
            </div>
          </div>
        )}
        <button onClick={handleSaveBank} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 mt-4">
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Bankgegevens opslaan'}
        </button>
      </div>

      {/* WhatsApp Business API */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">WhatsApp Business API</h3>
            <p className="text-sm text-slate-500">Stuur automatisch herinneringen en boete-meldingen naar huurders</p>
          </div>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4">
          <div>
            <p className="font-medium text-slate-800">WhatsApp berichten activeren</p>
            <p className="text-xs text-slate-500">Schakel in om berichten te kunnen versturen via uw WhatsApp Business account</p>
          </div>
          <button onClick={() => setWaEnabled(!waEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${waEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${waEnabled ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>

        {waEnabled && (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
                <input type="text" value={waApiUrl} onChange={e => setWaApiUrl(e.target.value)} placeholder="https://graph.facebook.com/v21.0" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
                <input type="password" value={waApiToken} onChange={e => setWaApiToken(e.target.value)} placeholder="Uw WhatsApp Business API token" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                <input type="text" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="bijv. 123456789012345" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" />
              </div>
            </div>

            {/* Test result */}
            {waTestResult && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${waTestResult.status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {waTestResult.message}
              </div>
            )}

            {/* Setup guide */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-slate-700 text-sm mb-2">Hoe krijgt u deze gegevens?</p>
              <ol className="text-xs text-slate-500 space-y-1.5 list-decimal pl-4">
                <li>Ga naar <span className="font-mono text-slate-700">developers.facebook.com</span> en maak een Meta app aan</li>
                <li>Voeg de <b>WhatsApp</b> product toe aan uw app</li>
                <li>Kopieer de <b>Phone Number ID</b> en <b>Permanent Access Token</b></li>
                <li>Voeg uw bedrijfs WhatsApp nummer toe en verifieer het</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={handleTestWhatsApp} disabled={waTesting || !waApiToken || !waPhoneId} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 text-sm font-medium">
                {waTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {waTesting ? 'Testen...' : 'Verbinding testen'}
              </button>
              <button onClick={handleSaveWhatsApp} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'WhatsApp opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Twilio SMS Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Phone className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Twilio WhatsApp</h3>
            <p className="text-xs text-slate-500">Verstuur WhatsApp berichten naar huurders via Twilio</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4">
          <div>
            <p className="font-medium text-slate-800">Twilio WhatsApp activeren</p>
            <p className="text-xs text-slate-500">Schakel in om WhatsApp berichten te versturen via Twilio</p>
          </div>
          <button onClick={() => setTwilioEnabled(!twilioEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${twilioEnabled ? 'bg-red-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${twilioEnabled ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>

        {twilioEnabled && (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account SID</label>
                <input type="text" value={twilioSid} onChange={e => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Auth Token</label>
                <input type="password" value={twilioToken} onChange={e => setTwilioToken(e.target.value)} placeholder="Uw Twilio Auth Token" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Nummer</label>
                <input type="text" value={twilioPhone} onChange={e => setTwilioPhone(e.target.value)} placeholder="whatsapp:+14155238886" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
              </div>
            </div>

            {twilioTestResult && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${twilioTestResult.status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {twilioTestResult.message}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-slate-700 text-sm mb-2">Hoe instellen?</p>
              <ol className="text-xs text-slate-500 space-y-1.5 list-decimal pl-4">
                <li>Ga naar <span className="font-mono text-slate-700">twilio.com/console</span> en maak een account aan</li>
                <li>Kopieer uw <b>Account SID</b> en <b>Auth Token</b> van het dashboard</li>
                <li>Ga naar <b>Messaging &gt; Try it out &gt; Send a WhatsApp message</b></li>
                <li>Activeer de Twilio Sandbox of koppel uw eigen WhatsApp Business nummer</li>
                <li>Vul het nummer in als <span className="font-mono text-slate-700">whatsapp:+14155238886</span></li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={handleTestTwilio} disabled={twilioTesting || !twilioSid || !twilioToken} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 text-sm font-medium">
                {twilioTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {twilioTesting ? 'Testen...' : 'Verbinding testen'}
              </button>
              <button onClick={handleSaveTwilio} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* SumUp Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">SumUp Pinbetaling</h3>
            <p className="text-sm text-slate-500">Koppel SumUp voor kaartbetalingen op de kiosk</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Schakel in om pinbetalingen via SumUp te activeren</p>
            <button onClick={() => setSumupEnabled(!sumupEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${sumupEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${sumupEnabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        {sumupEnabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">API Key</label>
                <input 
                  type="password" 
                  value={sumupApiKey} 
                  onChange={e => setSumupApiKey(e.target.value)} 
                  placeholder="sup_sk_..." 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono text-sm" 
                  data-testid="sumup-api-key"
                />
                <p className="text-xs text-slate-400 mt-1">Te vinden in SumUp Dashboard &rarr; Ontwikkelaars &rarr; API Keys</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Merchant Code</label>
                <input 
                  type="text" 
                  value={sumupMerchantCode} 
                  onChange={e => setSumupMerchantCode(e.target.value)} 
                  placeholder="bijv. MH4H92C7" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono text-sm" 
                  data-testid="sumup-merchant-code"
                />
                <p className="text-xs text-slate-400 mt-1">Te vinden in SumUp Dashboard &rarr; Profiel</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Valuta</label>
                <select 
                  value={sumupCurrency} 
                  onChange={e => setSumupCurrency(e.target.value)} 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  data-testid="sumup-currency"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - Brits Pond</option>
                  <option value="BRL">BRL - Braziliaanse Real</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Valuta van uw SumUp account (SRD wordt niet ondersteund door SumUp)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Wisselkoers (SRD per 1 {sumupCurrency})</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={sumupExchangeRate} 
                  onChange={e => setSumupExchangeRate(e.target.value)} 
                  placeholder="bijv. 40 (als 40 SRD = 1 EUR)" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm" 
                  data-testid="sumup-exchange-rate"
                />
                <p className="text-xs text-slate-400 mt-1">Hoeveel SRD is 1 {sumupCurrency}? Bijv. als 1 EUR = 40 SRD, vul dan 40 in</p>
                {sumupExchangeRate && parseFloat(sumupExchangeRate) > 0 && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">Voorbeeld: SRD 100,00 = {sumupCurrency} {(100 / parseFloat(sumupExchangeRate)).toFixed(2)}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveSumUp} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 text-sm font-medium">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'SumUp opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mope Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Mope Betaling</h3>
            <p className="text-sm text-slate-500">Koppel Mope voor QR-code betalingen op de kiosk (SRD)</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Schakel in om Mope betalingen te activeren</p>
            <button onClick={() => setMopeEnabled(!mopeEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${mopeEnabled ? 'bg-green-500' : 'bg-slate-300'}`} data-testid="mope-toggle">
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${mopeEnabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        {mopeEnabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">API Key</label>
                <input 
                  type="password" 
                  value={mopeApiKey} 
                  onChange={e => setMopeApiKey(e.target.value)} 
                  placeholder="test_9b0ba11923bc45b5be82eb4f3117ba0a" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" 
                  data-testid="mope-api-key"
                />
                <p className="text-xs text-slate-400 mt-1">Ontvangen van Mope/Hakrinbank na activatie webshop functionaliteit</p>
                <p className="text-xs text-blue-500 mt-1">Tip: Gebruik een key met <code>test_</code> prefix om te testen zonder echte betalingen</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveMope} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium" data-testid="mope-save-btn">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Mope opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Uni5Pay Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Uni5Pay Betaling</h3>
            <p className="text-sm text-slate-500">Koppel Uni5Pay+ voor QR-code betalingen op de kiosk (SRD)</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Schakel in om Uni5Pay te activeren</p>
            <button onClick={() => setUni5Enabled(!uni5Enabled)} className={`w-12 h-6 rounded-full transition-all relative ${uni5Enabled ? 'bg-green-500' : 'bg-slate-300'}`} data-testid="uni5pay-toggle">
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${uni5Enabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        {uni5Enabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Merchant ID</label>
                <input 
                  type="text" 
                  value={uni5MerchantId} 
                  onChange={e => setUni5MerchantId(e.target.value)} 
                  placeholder="UNI5_MERCHANT_12345" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" 
                  data-testid="uni5pay-merchant-id"
                />
                <p className="text-xs text-slate-400 mt-1">Ontvangen van Uni5Pay+ na goedkeuring merchant account</p>
                <p className="text-xs text-blue-500 mt-1">Nog geen account? Registreer via uni5pay.sr/merchants</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveUni5Pay} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium" data-testid="uni5pay-save-btn">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Uni5Pay opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Face ID Section */}
      <FaceIdSettings company={company} token={token} onRefresh={onRefresh} />

      {/* Abonnement Section */}
      <SubscriptionTab company={company} />
      </>
      )}
    </div>
  );
}

// ============== FACE ID SETTINGS ==============
function FaceIdSettings({ company, token, onRefresh }) {
  const [adminFaces, setAdminFaces] = useState([]);
  const [showAdminCapture, setShowAdminCapture] = useState(false);
  const [newFaceLabel, setNewFaceLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantCapture, setTenantCapture] = useState(null);

  const loadAdminStatus = () => {
    axios.get(`${API}/public/${company.company_id}/face/admin-status`)
      .then(res => setAdminFaces(res.data.faces || [])).catch(() => {});
  };

  useEffect(() => {
    axios.get(`${API}/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTenants(res.data)).catch(() => {});
    loadAdminStatus();
  }, [company.company_id, token]);

  const handleAdminRegister = async (descriptor) => {
    setSaving(true);
    try {
      await axios.post(`${API}/public/${company.company_id}/face/register-admin`, {
        descriptor,
        label: newFaceLabel.trim() || `Beheerder ${adminFaces.length + 1}`
      });
      setShowAdminCapture(false);
      setNewFaceLabel('');
      loadAdminStatus();
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Registratie mislukt');
    } finally { setSaving(false); }
  };

  const handleAdminDeleteOne = async (index) => {
    const face = adminFaces[index];
    if (!window.confirm(`Face ID "${face.label}" verwijderen?`)) return;
    try {
      await axios.delete(`${API}/public/${company.company_id}/face/admin?index=${index}`);
      loadAdminStatus();
      onRefresh();
    } catch { alert('Verwijderen mislukt'); }
  };

  const handleAdminDeleteAll = async () => {
    if (!window.confirm('ALLE Face IDs verwijderen voor beheerder?')) return;
    try {
      await axios.delete(`${API}/public/${company.company_id}/face/admin`);
      loadAdminStatus();
      onRefresh();
    } catch { alert('Verwijderen mislukt'); }
  };

  const handleTenantRegister = async (tenantId, descriptor) => {
    try {
      await axios.post(`${API}/public/${company.company_id}/tenant/${tenantId}/face/register`, { descriptor });
      setTenantCapture(null);
      // Refresh tenants list
      const res = await axios.get(`${API}/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } });
      setTenants(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Registratie mislukt');
    }
  };

  const handleTenantDelete = async (tenantId) => {
    if (!window.confirm('Face ID verwijderen voor deze huurder?')) return;
    try {
      await axios.delete(`${API}/public/${company.company_id}/tenant/${tenantId}/face`);
      const res = await axios.get(`${API}/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } });
      setTenants(res.data);
    } catch { alert('Verwijderen mislukt'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-6" data-testid="face-id-settings">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <ScanFace className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Face ID</h3>
          <p className="text-sm text-slate-400">Gezichtsherkenning via webcam voor inloggen</p>
        </div>
      </div>

      {/* Admin Face ID */}
      <div className="bg-slate-50 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Beheerder Face ID</h4>
            <p className="text-xs text-slate-400">Meerdere gezichten registreren voor kiosk-toegang</p>
          </div>
          <div className="flex items-center gap-2">
            {adminFaces.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" /> {adminFaces.length} geregistreerd
              </span>
            )}
          </div>
        </div>

        {/* Registered faces list */}
        {adminFaces.length > 0 && (
          <div className="space-y-2 mb-4">
            {adminFaces.map((face, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-100" data-testid={`admin-face-${idx}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <ScanFace className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{face.label}</p>
                    {face.registered_at && (
                      <p className="text-xs text-slate-400">{new Date(face.registered_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAdminDeleteOne(idx)}
                  data-testid={`admin-face-delete-${idx}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Verwijder
                </button>
              </div>
            ))}
            {adminFaces.length > 1 && (
              <button
                onClick={handleAdminDeleteAll}
                data-testid="admin-face-delete-all"
                className="text-xs font-medium text-red-400 hover:text-red-600 transition mt-1"
              >
                Alles verwijderen
              </button>
            )}
          </div>
        )}

        {/* Add new face */}
        {showAdminCapture ? (
          <div className="bg-white rounded-xl p-4 border border-violet-200">
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Naam / Label</label>
              <input
                type="text"
                value={newFaceLabel}
                onChange={e => setNewFaceLabel(e.target.value)}
                data-testid="admin-face-label-input"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none"
                placeholder={`Beheerder ${adminFaces.length + 1}`}
              />
            </div>
            <FaceCapture mode="register" onCapture={handleAdminRegister} onCancel={() => { setShowAdminCapture(false); setNewFaceLabel(''); }} buttonLabel="Gezicht vastleggen" />
          </div>
        ) : (
          <button onClick={() => setShowAdminCapture(true)} data-testid="admin-face-register-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium transition">
            <Camera className="w-4 h-4" />
            {adminFaces.length > 0 ? 'Nieuw gezicht toevoegen' : 'Gezicht registreren'}
          </button>
        )}
      </div>

      {/* Tenant Face ID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Huurder Face ID</h4>
            <p className="text-xs text-slate-400">Huurders kunnen inloggen op /huurders kiosk met Face ID</p>
          </div>
        </div>
        <div className="space-y-2">
          {tenants.filter(t => t.status === 'active').map(t => (
            <div key={t.tenant_id} className="bg-slate-50 rounded-xl p-4" data-testid={`tenant-face-${t.tenant_id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                    {t.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">Appt. {t.apartment_number} · {t.tenant_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.face_id_enabled ? (
                    <>
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> Face ID
                      </span>
                      <button onClick={() => setTenantCapture(t.tenant_id)} className="text-xs text-violet-600 hover:text-violet-700 font-medium">Opnieuw</button>
                      <button onClick={() => handleTenantDelete(t.tenant_id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Verwijder</button>
                    </>
                  ) : (
                    <button onClick={() => setTenantCapture(t.tenant_id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-xs font-medium transition">
                      <Camera className="w-3.5 h-3.5" /> Registreer
                    </button>
                  )}
                </div>
              </div>
              {tenantCapture === t.tenant_id && (
                <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200">
                  <FaceCapture mode="register" onCapture={(desc) => handleTenantRegister(t.tenant_id, desc)} onCancel={() => setTenantCapture(null)} buttonLabel={`Registreer ${t.name}`} />
                </div>
              )}
            </div>
          ))}
          {tenants.filter(t => t.status === 'active').length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Geen actieve huurders gevonden</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============== BANK/KAS TAB ==============
function KasTab({ token, tenants, formatSRD }) {
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [relatedTenant, setRelatedTenant] = useState('');
  const [saving, setSaving] = useState(false);

  const loadKas = async () => {
    try {
      const resp = await axios.get(`${API}/admin/kas`, { headers: { Authorization: `Bearer ${token}` } });
      setEntries(resp.data.entries || []);
      setTotals({ total_income: resp.data.total_income, total_expense: resp.data.total_expense, balance: resp.data.balance });
    } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { loadKas(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      await axios.post(`${API}/admin/kas`, {
        entry_type: formType,
        amount: parseFloat(amount),
        description,
        category,
        related_tenant_id: relatedTenant || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setAmount(''); setDescription(''); setCategory(''); setRelatedTenant('');
      loadKas();
    } catch { alert('Boeking mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Boeking verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/kas/${entryId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadKas();
    } catch { alert('Verwijderen mislukt'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Kas Samenvatting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-slate-500">Huurinkomsten</p>
          </div>
          <p className="text-2xl font-bold text-green-600" data-testid="kas-income">{formatSRD(totals.total_income)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-slate-500">Totale Uitgaven</p>
          </div>
          <p className="text-2xl font-bold text-red-600" data-testid="kas-expense">{formatSRD(totals.total_expense)}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm text-slate-500">Kassaldo</p>
          </div>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="kas-balance">
            {formatSRD(totals.balance)}
          </p>
        </div>
      </div>

      {/* Boekingen Tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
          <h2 className="font-semibold text-slate-900">Boekingen Overzicht</h2>
          <div className="flex gap-2">
            <button onClick={() => { setFormType('income'); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600" data-testid="add-income-btn">
              <TrendingUp className="w-4 h-4" /> Inkomsten Registreren
            </button>
            <button onClick={() => { setFormType('expense'); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600" data-testid="add-expense-btn">
              <TrendingDown className="w-4 h-4" /> Uitgave Registreren
            </button>
          </div>
        </div>

        {/* Inline Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bedrag (SRD)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.00" required data-testid="kas-amount-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Omschrijving</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder={formType === 'income' ? 'Bijv. Huur pand 3, Borg ontvangen' : 'Bijv. Onderhoud dak, EBS rekening'} required data-testid="kas-description-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Categorie</label>
                <input value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder={formType === 'income' ? 'Bijv. Huur, Borg, Overig' : 'Bijv. Onderhoud, Nutsvoorzieningen, Materialen'} data-testid="kas-category-input" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50" data-testid="kas-submit-btn">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Opslaan'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">
                  Annuleer
                </button>
              </div>
            </div>
          </form>
        )}

        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen boekingen</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Omschrijving</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Categorie</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.entry_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-sm text-slate-600">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="p-4">
                      {e.entry_type === 'income' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Inkomst</span>}
                      {e.entry_type === 'expense' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Uitgave</span>}
                      {e.entry_type === 'salary' && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Loon</span>}
                    </td>
                    <td className="p-4 text-sm text-slate-900">
                      {e.description}
                      {e.related_tenant_name && <span className="text-xs text-slate-400 ml-2">({e.related_tenant_name})</span>}
                      {e.related_employee_name && <span className="text-xs text-slate-400 ml-2">({e.related_employee_name})</span>}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs capitalize">{e.category}</span>
                    </td>
                    <td className={`p-4 text-right font-bold ${e.entry_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.entry_type === 'income' ? '+' : '-'} {formatSRD(e.amount)}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(e.entry_id)} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============== WERKNEMERS TAB ==============
function EmployeesTab({ token, formatSRD }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [name, setName] = useState('');
  const [functie, setFunctie] = useState('');
  const [maandloon, setMaandloon] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(null);

  const loadEmployees = async () => {
    try {
      const resp = await axios.get(`${API}/admin/employees`, { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(resp.data || []);
    } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { loadEmployees(); }, []);

  const resetForm = () => {
    setName(''); setFunctie(''); setMaandloon(''); setTelefoon(''); setEmail('');
    setEditingEmp(null); setShowForm(false);
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setName(emp.name); setFunctie(emp.functie || ''); setMaandloon(emp.maandloon?.toString() || '');
    setTelefoon(emp.telefoon || ''); setEmail(emp.email || '');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingEmp) {
        await axios.put(`${API}/admin/employees/${editingEmp.employee_id}`, {
          name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/employees`, {
          name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      resetForm();
      loadEmployees();
    } catch { alert('Opslaan mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`"${emp.name}" verwijderen?`)) return;
    try {
      await axios.delete(`${API}/admin/employees/${emp.employee_id}`, { headers: { Authorization: `Bearer ${token}` } });
      loadEmployees();
    } catch { alert('Verwijderen mislukt'); }
  };

  const handlePay = async (emp) => {
    if (!window.confirm(`Loon uitbetalen aan ${emp.name}: SRD ${emp.maandloon?.toFixed(2)}?\nDit wordt afgeschreven van de kas.`)) return;
    setPaying(emp.employee_id);
    try {
      await axios.post(`${API}/admin/employees/${emp.employee_id}/pay`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadEmployees();
      alert(`Loon uitbetaald: SRD ${emp.maandloon?.toFixed(2)}`);
    } catch { alert('Uitbetaling mislukt'); }
    setPaying(null);
  };

  const activeEmps = employees.filter(e => e.status === 'active');
  const totalLoon = activeEmps.reduce((sum, e) => sum + (e.maandloon || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Samenvatting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Werknemers</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeEmps.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-slate-500">Totaal Maandloon</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatSRD(totalLoon)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-slate-500">Totaal Uitbetaald</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatSRD(activeEmps.reduce((s, e) => s + (e.total_paid || 0), 0))}</p>
        </div>
      </div>

      {/* Werknemers Tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Werknemers ({activeEmps.length})</h2>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600" data-testid="add-employee-btn">
            <Plus className="w-4 h-4" /> Nieuwe Werknemer
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naam *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required data-testid="emp-name-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Functie</label>
                <input value={functie} onChange={e => setFunctie(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="emp-functie-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Maandloon (SRD)</label>
                <input type="number" step="0.01" value={maandloon} onChange={e => setMaandloon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="emp-loon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefoon</label>
                <input value={telefoon} onChange={e => setTelefoon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50" data-testid="emp-submit-btn">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingEmp ? 'Bijwerken' : 'Opslaan')}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">
                  Annuleer
                </button>
              </div>
            </div>
          </form>
        )}

        {activeEmps.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen werknemers</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Werknemer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Functie</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Maandloon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Totaal Betaald</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Telefoon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {activeEmps.map(emp => (
                  <tr key={emp.employee_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {emp.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{emp.functie || '-'}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.maandloon)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.total_paid || 0)}</td>
                    <td className="p-4 text-slate-600">{emp.telefoon || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePay(emp)}
                          disabled={paying === emp.employee_id || !emp.maandloon}
                          className="text-green-500 hover:text-green-700 p-1.5 rounded hover:bg-green-50 disabled:opacity-50"
                          title="Loon uitbetalen"
                          data-testid={`pay-emp-${emp.employee_id}`}
                        >
                          {paying === emp.employee_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(emp)} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp)} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// ============== POWER/STROOMBREKERS TAB ==============
function PowerTab({ apartments, tenants, token, onRefresh }) {
  const [shellyDevices, setShellyDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [newDevice, setNewDevice] = useState({ apartment_id: '', device_ip: '', device_name: '', device_type: 'gen1', channel: 0 });

  const loadDevices = async () => {
    try {
      const res = await axios.get(`${API}/admin/shelly-devices`, { headers: { Authorization: `Bearer ${token}` } });
      setShellyDevices(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadDevices(); }, []);

  const handleControl = async (deviceId, action) => {
    setUpdating(deviceId);
    try {
      const res = await axios.post(`${API}/admin/shelly-devices/${deviceId}/control?action=${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setShellyDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, last_status: res.data.status } : d));
    } catch (err) { alert('Schakelen mislukt'); }
    setUpdating(null);
  };

  const handleRefreshAll = async () => {
    setUpdating('all');
    try {
      const res = await axios.post(`${API}/admin/shelly-devices/refresh-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setShellyDevices(prev => prev.map(d => {
        const upd = res.data.find(r => r.device_id === d.device_id);
        return upd ? { ...d, last_status: upd.status, online: upd.online } : d;
      }));
    } catch (err) { console.error(err); }
    setUpdating(null);
  };

  const handleAddDevice = async () => {
    if (!newDevice.apartment_id || !newDevice.device_ip) return;
    try {
      await axios.post(`${API}/admin/shelly-devices`, newDevice, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddModal(false);
      setNewDevice({ apartment_id: '', device_ip: '', device_name: '', device_type: 'gen1', channel: 0 });
      loadDevices();
    } catch (err) { alert('Toevoegen mislukt'); }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Weet u zeker dat u dit apparaat wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/shelly-devices/${deviceId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadDevices();
    } catch (err) { alert('Verwijderen mislukt'); }
  };

  const activeTenants = tenants.filter(t => t.status === 'active');

  // Group devices by apartment
  const devicesByApt = {};
  shellyDevices.forEach(d => {
    if (!devicesByApt[d.apartment_id]) devicesByApt[d.apartment_id] = [];
    devicesByApt[d.apartment_id].push(d);
  });

  return (
    <div className="space-y-6">
      {/* Main Panel - Realistic circuit breaker box */}
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
        {/* Panel header strip */}
        <div className="px-6 py-3 flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-700 tracking-wider uppercase">Stroombrekers Paneel</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRefreshAll} disabled={updating === 'all'} className="text-xs text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md">
              <Loader2 className={`w-3.5 h-3.5 ${updating === 'all' ? 'animate-spin' : ''}`} />
              Status verversen
            </button>
            <button onClick={() => setShowAddModal(true)} className="text-xs text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition font-medium">
              <Plus className="w-3.5 h-3.5" />
              Shelly toevoegen
            </button>
          </div>
        </div>

        {/* Breaker grid */}
        <div className="p-6 bg-slate-50">
          {shellyDevices.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium mb-2">Geen Shelly apparaten gekoppeld</p>
              <p className="text-slate-400 text-sm mb-6">Voeg Shelly relais toe om stroombrekers per appartement te bedienen</p>
              <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium">
                <Plus className="w-4 h-4 inline mr-2" />
                Eerste apparaat toevoegen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {shellyDevices.map(device => {
                const apt = apartments.find(a => a.apartment_id === device.apartment_id);
                const tenant = activeTenants.find(t => t.apartment_id === device.apartment_id);
                const powerOn = device.last_status === 'on';
                const unknown = !device.last_status || device.last_status === 'unknown';
                const unreachable = device.last_status === 'unreachable';
                const hasDebt = tenant && ((tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) > 0);
                const isUpdating = updating === device.device_id;

                return (
                  <div key={device.device_id} className="flex flex-col items-center group" data-testid={`breaker-${device.device_id}`}>
                    {/* Circuit breaker unit */}
                    <div className="w-28 rounded-md overflow-hidden relative" style={{
                      background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
                      boxShadow: '0 3px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)'
                    }}>
                      {/* Brand label */}
                      <div className="text-center pt-1.5">
                        <span className="text-[7px] font-bold text-slate-400 tracking-[0.15em] uppercase">Shelly</span>
                      </div>

                      {/* Top screw */}
                      <div className="flex justify-center pt-1">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c0c0c0 0%, #888 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.5)' }}>
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-[1px] bg-slate-500/60 rotate-45" />
                          </div>
                        </div>
                      </div>

                      {/* Switch housing */}
                      <div className="px-3 py-2">
                        <div className="relative w-full h-28 rounded" style={{
                          background: 'linear-gradient(180deg, #b8b8b8 0%, #989898 100%)',
                          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.3)'
                        }}>
                          {/* ON / OFF labels */}
                          <div className="absolute top-2 left-0 right-0 text-center">
                            <span className="text-[7px] font-black text-slate-500/70 tracking-[0.2em]">ON</span>
                            <div className="w-3 h-[1px] bg-slate-500/40 mx-auto mt-0.5" />
                          </div>
                          <div className="absolute bottom-2 left-0 right-0 text-center">
                            <div className="w-3 h-[1px] bg-slate-500/40 mx-auto mb-0.5" />
                            <span className="text-[7px] font-black text-slate-500/70 tracking-[0.2em]">OFF</span>
                          </div>

                          {/* Toggle lever */}
                          <button
                            onClick={() => handleControl(device.device_id, 'toggle')}
                            disabled={isUpdating}
                            data-testid={`breaker-toggle-${device.device_id}`}
                            className="absolute left-2 right-2 h-12 cursor-pointer transition-all duration-300 ease-in-out disabled:cursor-wait"
                            style={{
                              top: (powerOn && !unknown) ? '10px' : 'auto',
                              bottom: (powerOn && !unknown) ? 'auto' : '10px',
                              background: unknown || unreachable
                                ? 'linear-gradient(180deg, #a3a3a3 0%, #737373 40%, #525252 100%)'
                                : powerOn
                                  ? 'linear-gradient(180deg, #fb923c 0%, #ea580c 40%, #c2410c 100%)'
                                  : 'linear-gradient(180deg, #94a3b8 0%, #64748b 40%, #475569 100%)',
                              borderRadius: '4px',
                              boxShadow: powerOn && !unknown
                                ? '0 4px 10px rgba(234,88,12,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                                : '0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                            }}
                          >
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]">
                              {isUpdating ? (
                                <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                              ) : (
                                <>
                                  <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                                  <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                                  <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                                </>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Bottom: screw + LED */}
                      <div className="flex items-center justify-between px-4 pb-2">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c0c0c0 0%, #888 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.5)' }}>
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-[1px] bg-slate-500/60 -rotate-45" />
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full border transition-all duration-500 ${
                          unknown || unreachable ? 'bg-yellow-400 border-yellow-500' :
                          powerOn ? 'bg-green-400 border-green-500' : 'bg-red-500 border-red-600'
                        }`} style={{
                          boxShadow: unknown || unreachable ? '0 0 8px rgba(250,204,21,0.6)' :
                            powerOn ? '0 0 8px rgba(74,222,128,0.7)' : '0 0 8px rgba(239,68,68,0.6)'
                        }} />
                      </div>
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-center">
                      <p className="text-sm font-bold text-slate-800">Appt. {apt?.number || '?'}</p>
                      <p className="text-xs text-slate-400">{tenant?.name || 'Geen huurder'}</p>
                      <span className={`text-[10px] font-bold tracking-wider ${
                        unknown || unreachable ? 'text-yellow-400' :
                        powerOn ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isUpdating ? 'BEZIG...' : unknown ? 'ONBEKEND' : unreachable ? 'OFFLINE' : powerOn ? 'AAN' : 'UIT'}
                      </span>
                      {hasDebt && (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-orange-400" />
                          <span className="text-[10px] text-orange-400 font-medium">SCHULD</span>
                        </div>
                      )}
                      {/* Delete button */}
                      <button onClick={() => handleDeleteDevice(device.device_id)} className="mt-1 text-[10px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                        Verwijderen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel footer */}
        <div className="px-6 py-3 flex items-center justify-between bg-slate-100 border-t border-slate-200">
          <span className="text-[10px] text-slate-400 font-mono">{shellyDevices.length} apparaten gekoppeld</span>
          <span className="text-[10px] text-slate-400">SHELLY LOCAL API</span>
        </div>
      </div>


      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Shelly Apparaat Toevoegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appartement</label>
                <select value={newDevice.apartment_id} onChange={e => setNewDevice({...newDevice, apartment_id: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500">
                  <option value="">Selecteer appartement...</option>
                  {apartments.map(a => <option key={a.apartment_id} value={a.apartment_id}>Appt. {a.number} - {a.description}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IP-adres van Shelly</label>
                <input type="text" value={newDevice.device_ip} onChange={e => setNewDevice({...newDevice, device_ip: e.target.value})} placeholder="bijv. 192.168.1.100" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam (optioneel)</label>
                <input type="text" value={newDevice.device_name} onChange={e => setNewDevice({...newDevice, device_name: e.target.value})} placeholder="bijv. Meterkast A-101" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={newDevice.device_type} onChange={e => setNewDevice({...newDevice, device_type: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500">
                    <option value="gen1">Gen1 (Shelly 1)</option>
                    <option value="gen2">Gen2+ (Plus/Pro)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kanaal</label>
                  <input type="number" min="0" max="3" value={newDevice.channel} onChange={e => setNewDevice({...newDevice, channel: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Annuleren</button>
              <button onClick={handleAddDevice} disabled={!newDevice.apartment_id || !newDevice.device_ip} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500 font-medium">Toevoegen</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}








// ============== INTERNET TAB ==============
function InternetTab({ token, tenants, formatSRD, onRefresh }) {
  const [plans, setPlans] = useState([]);
  const [connections, setConnections] = useState([]);
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planSpeed, setPlanSpeed] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [showRouterModal, setShowRouterModal] = useState(false);
  const [routerTenantId, setRouterTenantId] = useState('');
  const [routerIp, setRouterIp] = useState('');
  const [routerPassword, setRouterPassword] = useState('');
  const [routerName, setRouterName] = useState('');
  const [controlling, setControlling] = useState(null);
  const [checking, setChecking] = useState(null);
  const [deviceModal, setDeviceModal] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, connRes, routerRes] = await Promise.all([
        axios.get(`${API}/admin/internet/plans`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/internet/connections`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/tenda/routers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setPlans(plansRes.data);
      setConnections(connRes.data);
      setRouters(routerRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePlan = async () => {
    if (!planName || !planSpeed || !planPrice) return alert('Vul alle velden in');
    setSaving(true);
    try {
      if (editPlan) {
        await axios.put(`${API}/admin/internet/plans/${editPlan.plan_id}`, {
          name: planName, speed: planSpeed, price: parseFloat(planPrice),
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/internet/plans`, {
          name: planName, speed: planSpeed, price: parseFloat(planPrice),
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowPlanModal(false); setEditPlan(null);
      setPlanName(''); setPlanSpeed(''); setPlanPrice('');
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij opslaan'); }
    setSaving(false);
  };

  const deletePlan = async (planId) => {
    if (!confirm('Plan verwijderen? Gekoppelde huurders worden ontkoppeld.')) return;
    try {
      await axios.delete(`${API}/admin/internet/plans/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Fout'); }
  };

  const handleAssign = async (tenantId, planId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/internet/assign?tenant_id=${tenantId}&plan_id=${planId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAssignModal(null);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) { alert(err.response?.data?.detail || 'Fout'); }
    setSaving(false);
  };

  const handleUnassign = async (tenantId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/internet/assign?tenant_id=${tenantId}&plan_id=none`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) { alert(err.response?.data?.detail || 'Fout'); }
    setSaving(false);
  };

  const handleAddRouter = async () => {
    if (!routerTenantId || !routerIp || !routerPassword) return alert('Vul alle velden in');
    setSaving(true);
    try {
      await axios.post(`${API}/admin/tenda/routers`, {
        tenant_id: routerTenantId, router_ip: routerIp, admin_password: routerPassword, router_name: routerName,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowRouterModal(false);
      setRouterTenantId(''); setRouterIp(''); setRouterPassword(''); setRouterName('');
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij toevoegen'); }
    setSaving(false);
  };

  const handleDeleteRouter = async (routerId) => {
    if (!confirm('Router verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/tenda/routers/${routerId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch (err) { alert('Verwijderen mislukt'); }
  };

  const handleControlInternet = async (routerId, action) => {
    setControlling(routerId);
    try {
      const res = await axios.post(`${API}/admin/tenda/routers/${routerId}/control?action=${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success(res.data.message);
        loadData();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) { toast.error('Verbinding mislukt'); }
    setControlling(null);
  };

  const handleCheckStatus = async (routerId) => {
    setChecking(routerId);
    try {
      const res = await axios.post(`${API}/admin/tenda/routers/${routerId}/status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.status === 'online') {
        toast.success(`Online — ${res.data.device_count} apparaten`);
        setDeviceModal({ routerId, devices: res.data.connected_devices });
      } else {
        toast.error('Router offline');
      }
      loadData();
    } catch (err) { toast.error('Status controle mislukt'); }
    setChecking(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="internet-tab">
      {/* Plans Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Internet Plannen</h3>
          <button
            onClick={() => { setEditPlan(null); setPlanName(''); setPlanSpeed(''); setPlanPrice(''); setShowPlanModal(true); }}
            data-testid="internet-add-plan"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Nieuw plan
          </button>
        </div>
        {plans.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Wifi className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Geen plannen aangemaakt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {plans.map(p => (
              <div key={p.plan_id} className="border border-slate-200 rounded-xl p-4 hover:border-orange-300 transition" data-testid={`plan-${p.plan_id}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">{p.name}</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditPlan(p); setPlanName(p.name); setPlanSpeed(p.speed); setPlanPrice(p.price.toString()); setShowPlanModal(true); }}
                      className="p-1 rounded hover:bg-slate-100 transition"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => deletePlan(p.plan_id)} className="p-1 rounded hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-orange-600 font-medium">{p.speed}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatSRD(p.price)}<span className="text-xs font-normal text-slate-400"> /maand</span></p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connections Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Aansluitingen per Huurder</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Huurder</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">App.</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Internet Plan</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600">Kosten/maand</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {connections.map(c => (
                <tr key={c.tenant_id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 text-slate-500">{c.apartment_number}</td>
                  <td className="py-3 px-4">
                    {c.internet_plan_name ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{c.internet_plan_name}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Geen plan</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {c.internet_cost > 0 ? formatSRD(c.internet_cost) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setAssignModal(c)}
                        data-testid={`internet-assign-${c.tenant_id}`}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                      >
                        {c.internet_plan_id ? 'Wijzigen' : 'Toewijzen'}
                      </button>
                      {c.internet_plan_id && (
                        <button
                          onClick={() => handleUnassign(c.tenant_id)}
                          data-testid={`internet-remove-${c.tenant_id}`}
                          className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenda Router Management */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Router Beheer (Tenda AC1200)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Internet aan/uit per huurder, verbonden apparaten</p>
          </div>
          <button
            onClick={() => setShowRouterModal(true)}
            data-testid="tenda-add-router"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Router toevoegen
          </button>
        </div>
        {routers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Wifi className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Geen routers gekoppeld</p>
            <p className="text-xs mt-1">Voeg een Tenda router toe per huurder</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {routers.map(r => (
              <div key={r.router_id} className={`border rounded-xl p-4 transition ${r.internet_enabled ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`} data-testid={`router-${r.router_id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${r.status === 'online' ? 'bg-green-500 animate-pulse' : r.status === 'offline' ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <h4 className="font-bold text-slate-900 text-sm">{r.router_name || r.router_ip}</h4>
                  </div>
                  <button onClick={() => handleDeleteRouter(r.router_id)} className="p-1 rounded hover:bg-red-100 transition">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
                <div className="space-y-1 mb-3 text-xs text-slate-500">
                  <p>Huurder: <span className="font-semibold text-slate-700">{r.tenant_name}</span></p>
                  <p>App: <span className="font-semibold text-slate-700">{r.apartment_number}</span></p>
                  <p>IP: <span className="font-mono text-slate-700">{r.router_ip}</span></p>
                  {r.connected_devices?.length > 0 && (
                    <p>Apparaten: <span className="font-semibold text-slate-700">{r.connected_devices.length} verbonden</span></p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleControlInternet(r.router_id, r.internet_enabled ? 'disable' : 'enable')}
                    disabled={controlling === r.router_id}
                    data-testid={`tenda-toggle-${r.router_id}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      r.internet_enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50`}
                  >
                    {controlling === r.router_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                      r.internet_enabled ? <><Power className="w-3.5 h-3.5" /> Uitzetten</> : <><Power className="w-3.5 h-3.5" /> Aanzetten</>
                    )}
                  </button>
                  <button
                    onClick={() => handleCheckStatus(r.router_id)}
                    disabled={checking === r.router_id}
                    data-testid={`tenda-status-${r.router_id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition disabled:opacity-50"
                  >
                    {checking === r.router_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><RefreshCw className="w-3.5 h-3.5" /> Status</>}
                  </button>
                </div>
                <div className="mt-2 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.internet_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.internet_enabled ? 'INTERNET AAN' : 'INTERNET UIT'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Create/Edit Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPlanModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="plan-modal-title">{editPlan ? 'Plan Bewerken' : 'Nieuw Internet Plan'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam *</label>
                <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
                  data-testid="plan-name" placeholder="Bijv. Basis" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Snelheid *</label>
                <input type="text" value={planSpeed} onChange={e => setPlanSpeed(e.target.value)}
                  data-testid="plan-speed" placeholder="Bijv. 25 Mbps" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prijs per maand (SRD) *</label>
                <input type="number" value={planPrice} onChange={e => setPlanPrice(e.target.value)}
                  data-testid="plan-price" placeholder="0.00" min="0" step="0.01" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowPlanModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
              <button onClick={handleSavePlan} disabled={saving} data-testid="plan-save"
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="assign-modal-title">Internet — {assignModal.name}</h3>
              <p className="text-sm text-slate-500 mt-1">App. {assignModal.apartment_number}</p>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => handleAssign(assignModal.tenant_id, 'none')}
                data-testid="assign-none"
                className={`w-full text-left p-3 rounded-xl border transition ${!assignModal.internet_plan_id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <p className="font-medium text-slate-700">Geen internet</p>
                <p className="text-xs text-slate-400">Aansluiting verwijderen</p>
              </button>
              {plans.map(p => (
                <button
                  key={p.plan_id}
                  onClick={() => handleAssign(assignModal.tenant_id, p.plan_id)}
                  data-testid={`assign-plan-${p.plan_id}`}
                  className={`w-full text-left p-3 rounded-xl border transition ${assignModal.internet_plan_id === p.plan_id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-orange-600">{p.speed}</p>
                    </div>
                    <span className="font-bold text-slate-900">{formatSRD(p.price)}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-slate-200">
              <button onClick={() => setAssignModal(null)} className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Router Modal */}
      {showRouterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRouterModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="router-modal-title">Tenda Router Toevoegen</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Huurder *</label>
                <select value={routerTenantId} onChange={e => setRouterTenantId(e.target.value)}
                  data-testid="router-tenant-select"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  <option value="">Selecteer huurder...</option>
                  {tenants.filter(t => t.status === 'active' && !routers.find(r => r.tenant_id === t.tenant_id)).map(t => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.name} — {t.apartment_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Router IP-adres *</label>
                <input type="text" value={routerIp} onChange={e => setRouterIp(e.target.value)}
                  data-testid="router-ip" placeholder="bijv. 192.168.1.1 of publiek IP" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Wachtwoord *</label>
                <input type="password" value={routerPassword} onChange={e => setRouterPassword(e.target.value)}
                  data-testid="router-password" placeholder="Router admin wachtwoord" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam (optioneel)</label>
                <input type="text" value={routerName} onChange={e => setRouterName(e.target.value)}
                  data-testid="router-name" placeholder="bijv. Router App. A1" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowRouterModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
              <button onClick={handleAddRouter} disabled={saving} data-testid="router-save"
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Devices Modal */}
      {deviceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeviceModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="devices-modal-title">Verbonden Apparaten</h3>
              <p className="text-sm text-slate-500 mt-1">{deviceModal.devices.length} apparaten online</p>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto">
              {deviceModal.devices.length === 0 ? (
                <p className="text-center text-slate-400 py-4">Geen apparaten verbonden</p>
              ) : (
                <div className="space-y-2">
                  {deviceModal.devices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{d.name || 'Onbekend apparaat'}</p>
                        <p className="text-xs text-slate-400 font-mono">{d.mac}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{d.ip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-200">
              <button onClick={() => setDeviceModal(null)} className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function LoansTab({ token, tenants, formatSRD, onShowDetail }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null); // loan object
  const [filterStatus, setFilterStatus] = useState('all');

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/loans`, { headers: { Authorization: `Bearer ${token}` } });
      setLoans(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadDetail = async (loanId) => {
    try {
      const res = await axios.get(`${API}/admin/loans/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      onShowDetail(res.data);
    } catch (err) { console.error(err); }
  };

  const deleteLoan = async (loanId) => {
    if (!confirm('Weet u zeker dat u deze lening wilt verwijderen? Alle aflossingen worden ook verwijderd.')) return;
    try {
      await axios.delete(`${API}/admin/loans/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadLoans();
      onShowDetail(null);
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij verwijderen'); }
  };

  useEffect(() => { loadLoans(); }, []);

  const filtered = filterStatus === 'all' ? loans : loans.filter(l => l.status === filterStatus);

  const stats = {
    totalLoaned: loans.filter(l => l.status === 'active').reduce((s, l) => s + l.amount, 0),
    totalRemaining: loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remaining, 0),
    totalPaid: loans.reduce((s, l) => s + l.total_paid, 0),
    activeCount: loans.filter(l => l.status === 'active').length,
    paidOffCount: loans.filter(l => l.status === 'paid_off').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="loans-tab">
      {/* Actions bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          data-testid="loans-filter-status"
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle leningen ({loans.length})</option>
          <option value="active">Actief ({stats.activeCount})</option>
          <option value="paid_off">Afgelost ({stats.paidOffCount})</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreateModal(true)}
          data-testid="loans-create-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Nieuwe lening
        </button>
      </div>

      {/* Loans list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Geen leningen gevonden</p>
            <p className="text-sm text-slate-400 mt-1">Maak een nieuwe lening aan via de knop hierboven</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Huurder</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">App.</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Leningbedrag</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Maand. aflossing</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Afgelost</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Openstaand</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(loan => {
                  const progress = loan.amount > 0 ? Math.min(100, (loan.total_paid / loan.amount) * 100) : 0;
                  return (
                    <tr key={loan.loan_id} className="hover:bg-slate-50 transition" data-testid={`loan-row-${loan.loan_id}`}>
                      <td className="py-3 px-4 font-medium text-slate-900">{loan.tenant_name}</td>
                      <td className="py-3 px-4 text-slate-500">{loan.apartment_number}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatSRD(loan.amount)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatSRD(loan.monthly_payment)}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{formatSRD(loan.total_paid)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={loan.remaining > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatSRD(loan.remaining)}</span>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' : loan.status === 'paid_off' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {loan.status === 'active' ? 'Actief' : loan.status === 'paid_off' ? 'Afgelost' : 'Geannuleerd'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {loan.status === 'active' && (
                            <button
                              onClick={() => setShowPayModal(loan)}
                              data-testid={`loan-pay-${loan.loan_id}`}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                              title="Aflossing registreren"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => loadDetail(loan.loan_id)}
                            data-testid={`loan-detail-${loan.loan_id}`}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                            title="Details bekijken"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteLoan(loan.loan_id)}
                            data-testid={`loan-delete-${loan.loan_id}`}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Loan Modal */}
      {showCreateModal && (
        <LoanCreateModal
          tenants={tenants}
          token={token}
          formatSRD={formatSRD}
          onClose={() => setShowCreateModal(false)}
          onSave={() => { setShowCreateModal(false); loadLoans(); }}
        />
      )}

      {/* Pay Loan Modal */}
      {showPayModal && (
        <LoanPayModal
          loan={showPayModal}
          token={token}
          formatSRD={formatSRD}
          onClose={() => setShowPayModal(null)}
          onSave={() => { setShowPayModal(null); loadLoans(); }}
        />
      )}
    </div>
  );
}

function LoanCreateModal({ tenants, token, formatSRD, onClose, onSave }) {
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTenants = tenants.filter(t => t.status === 'active');

  const handleSave = async () => {
    if (!tenantId || !amount || !monthlyPayment) return alert('Vul alle verplichte velden in');
    if (parseFloat(amount) <= 0 || parseFloat(monthlyPayment) <= 0) return alert('Bedragen moeten groter dan 0 zijn');
    setSaving(true);
    try {
      await axios.post(`${API}/admin/loans`, {
        tenant_id: tenantId,
        amount: parseFloat(amount),
        monthly_payment: parseFloat(monthlyPayment),
        start_date: startDate,
        description,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij aanmaken'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900" data-testid="loan-create-title">Nieuwe Lening</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Huurder *</label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              data-testid="loan-tenant-select"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Selecteer huurder...</option>
              {activeTenants.map(t => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.name} — {t.apartment_number}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leningbedrag (SRD) *</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                data-testid="loan-amount-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maand. aflossing (SRD) *</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={e => setMonthlyPayment(e.target.value)}
                data-testid="loan-monthly-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              data-testid="loan-start-date"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="loan-description"
              placeholder="Bijv. Voorschot verbouwing"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {amount && monthlyPayment && parseFloat(monthlyPayment) > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              Geschatte looptijd: <strong>{Math.ceil(parseFloat(amount) / parseFloat(monthlyPayment))} maanden</strong>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="loan-save-btn"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lening aanmaken'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanPayModal({ loan, token, formatSRD, onClose, onSave }) {
  const [amount, setAmount] = useState(loan.monthly_payment?.toString() || '');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const handlePay = async () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return alert('Voer een geldig bedrag in');
    if (payAmount > loan.remaining) return alert(`Bedrag kan niet hoger zijn dan het openstaande saldo (${formatSRD(loan.remaining)})`);
    setSaving(true);
    try {
      await axios.post(`${API}/admin/loans/${loan.loan_id}/pay`, {
        amount: payAmount,
        description: description || 'Aflossing',
        payment_method: paymentMethod,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij registreren'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900" data-testid="loan-pay-title">Aflossing — {loan.tenant_name}</h2>
          <p className="text-sm text-slate-500 mt-1">Openstaand: <span className="font-bold text-red-600">{formatSRD(loan.remaining)}</span></p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bedrag (SRD) *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              data-testid="loan-pay-amount"
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setAmount(loan.monthly_payment?.toString())} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition">
                Maandelijks ({formatSRD(loan.monthly_payment)})
              </button>
              <button onClick={() => setAmount(loan.remaining?.toString())} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition">
                Volledig ({formatSRD(loan.remaining)})
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Betaalmethode</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              data-testid="loan-pay-method"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="cash">Contant</option>
              <option value="bank">Bank</option>
              <option value="pin">Pinpas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="loan-pay-description"
              placeholder="Aflossing"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
          <button
            onClick={handlePay}
            disabled={saving}
            data-testid="loan-pay-submit"
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aflossing registreren'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanDetailModal({ loan, formatSRD, onClose, onPay }) {
  const progress = loan.amount > 0 ? Math.min(100, (loan.total_paid / loan.amount) * 100) : 0;

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };
  const formatDateTime = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900" data-testid="loan-detail-title">Lening — {loan.tenant_name}</h2>
            <p className="text-sm text-slate-500 mt-1">App. {loan.apartment_number} | Aangemaakt: {formatDate(loan.start_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {loan.status === 'active' ? 'Actief' : 'Afgelost'}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
              <XCircle className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Leningbedrag</p>
              <p className="text-lg font-bold text-slate-900">{formatSRD(loan.amount)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <p className="text-xs text-slate-500 mb-1">Afgelost</p>
              <p className="text-lg font-bold text-green-600">{formatSRD(loan.total_paid)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <p className="text-xs text-slate-500 mb-1">Openstaand</p>
              <p className="text-lg font-bold text-red-600">{formatSRD(loan.remaining)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Voortgang</span>
              <span className="font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {loan.description && (
            <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm text-slate-600 border border-slate-200">
              <span className="font-medium">Omschrijving:</span> {loan.description}
            </div>
          )}

          <p className="text-sm font-semibold text-slate-700 mb-4">Maandelijkse aflossing: <span className="text-orange-600">{formatSRD(loan.monthly_payment)}</span></p>

          {/* Payment history */}
          <h3 className="text-sm font-bold text-slate-700 mb-3">Betaalgeschiedenis ({loan.payments?.length || 0})</h3>
          {(!loan.payments || loan.payments.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nog geen aflossingen geregistreerd</p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Datum</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Bedrag</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Methode</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Resterend</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Omschrijving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loan.payments.map(p => (
                    <tr key={p.payment_id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600">{formatDateTime(p.created_at)}</td>
                      <td className="py-2 px-3 text-right font-medium text-green-600">{formatSRD(p.amount)}</td>
                      <td className="py-2 px-3 text-slate-500 capitalize">{p.payment_method}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatSRD(p.remaining_after)}</td>
                      <td className="py-2 px-3 text-slate-500">{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
          {loan.status === 'active' && (
            <button
              onClick={onPay}
              data-testid="loan-detail-pay-btn"
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            >
              Aflossing registreren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============== SUBSCRIPTION TAB ==============
function MessagesTab({ token }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const PAGE_SIZE = 50;

  const loadMessages = async (pageNum = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, skip: pageNum * PAGE_SIZE });
      if (filterType !== 'all') params.set('msg_type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);
      const res = await axios.get(`${API}/admin/whatsapp/history?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data.messages || res.data);
      setTotal(res.data.total || 0);
      setPage(pageNum);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadMessages(0); }, [filterType, filterStatus]);

  const handleSearch = () => loadMessages(0);

  const handleTriggerDaily = async () => {
    if (!confirm('Wilt u nu handmatig huur-herinneringen en contract-waarschuwingen versturen naar alle huurders?')) return;
    setTriggerLoading(true);
    try {
      const res = await axios.post(`${API}/admin/daily-notifications`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      alert(`Klaar! ${d.rent_reminders} huur-herinnering(en) en ${d.lease_warnings} contract-waarschuwing(en) verstuurd.`);
      loadMessages(0);
    } catch (err) {
      alert(err.response?.data?.detail || 'Fout bij versturen notificaties');
    }
    setTriggerLoading(false);
  };

  const typeLabels = {
    payment_confirmation: { label: 'Betaling', color: 'bg-green-100 text-green-700' },
    new_invoice: { label: 'Factuur', color: 'bg-blue-100 text-blue-700' },
    fine_applied: { label: 'Boete', color: 'bg-red-100 text-red-700' },
    overdue: { label: 'Achterstand', color: 'bg-orange-100 text-orange-700' },
    auto: { label: 'Automatisch', color: 'bg-slate-100 text-slate-600' },
    manual: { label: 'Handmatig', color: 'bg-purple-100 text-purple-700' },
    salary_paid: { label: 'Salaris', color: 'bg-indigo-100 text-indigo-700' },
    rent_updated: { label: 'Huurwijziging', color: 'bg-amber-100 text-amber-700' },
    lease_created: { label: 'Huurcontract', color: 'bg-cyan-100 text-cyan-700' },
    lease_expiring: { label: 'Contract verloopt', color: 'bg-rose-100 text-rose-700' },
    loan_created: { label: 'Lening', color: 'bg-indigo-100 text-indigo-700' },
    loan_payment: { label: 'Leningaflossing', color: 'bg-teal-100 text-teal-700' },
    shelly_on: { label: 'Stroom AAN', color: 'bg-emerald-100 text-emerald-700' },
    shelly_off: { label: 'Stroom UIT', color: 'bg-zinc-200 text-zinc-700' },
    rent_reminder: { label: 'Herinnering', color: 'bg-yellow-100 text-yellow-700' },
    rent_due_today: { label: 'Vervaldatum', color: 'bg-orange-100 text-orange-700' },
    rent_reminder_manual: { label: 'Herinnering (handmatig)', color: 'bg-violet-100 text-violet-700' },
  };

  const statusLabels = {
    sent: { label: 'Verzonden', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    failed: { label: 'Mislukt', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    pending: { label: 'Wachtend', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  };

  const filtered = messages;

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  const stats = {
    total: total,
    sent: messages.filter(m => m.status === 'sent').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="messages-tab">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Totaal berichten</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              <p className="text-xs text-slate-500">Verzonden</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              <p className="text-xs text-slate-500">Mislukt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Zoek op huurder of telefoon..."
              data-testid="messages-search"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            data-testid="messages-filter-type"
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400"
          >
            <option value="all">Alle types</option>
            <option value="payment_confirmation">Betaling</option>
            <option value="new_invoice">Factuur</option>
            <option value="fine_applied">Boete</option>
            <option value="overdue">Achterstand</option>
            <option value="salary_paid">Salaris</option>
            <option value="rent_updated">Huurwijziging</option>
            <option value="lease_created">Huurcontract</option>
            <option value="lease_expiring">Contract verloopt</option>
            <option value="loan_created">Lening</option>
            <option value="loan_payment">Leningaflossing</option>
            <option value="shelly_on">Stroom AAN</option>
            <option value="shelly_off">Stroom UIT</option>
            <option value="rent_reminder">Herinnering</option>
            <option value="rent_due_today">Vervaldatum</option>
            <option value="rent_reminder_manual">Herinnering (handmatig)</option>
            <option value="manual">Handmatig</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            data-testid="messages-filter-status"
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400"
          >
            <option value="all">Alle statussen</option>
            <option value="sent">Verzonden</option>
            <option value="failed">Mislukt</option>
            <option value="pending">Wachtend</option>
          </select>
          <button
            onClick={() => loadMessages(0)}
            data-testid="messages-refresh"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
          >
            <Loader2 className="w-4 h-4" />
            Vernieuwen
          </button>
          <button
            onClick={handleTriggerDaily}
            disabled={triggerLoading}
            data-testid="messages-trigger-daily"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {triggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Herinneringen versturen
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Geen berichten gevonden</p>
            <p className="text-sm text-slate-400 mt-1">
              {messages.length === 0 ? 'WhatsApp berichten verschijnen hier zodra ze automatisch worden verstuurd' : 'Pas uw filters aan om berichten te zien'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((msg) => {
              const typeInfo = typeLabels[msg.message_type] || typeLabels.auto;
              const statusInfo = statusLabels[msg.status] || statusLabels.pending;
              const isExpanded = expandedId === msg.message_id;
              return (
                <div
                  key={msg.message_id}
                  data-testid={`message-row-${msg.message_id}`}
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : msg.message_id)}
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusInfo.dot}`} />
                    {/* Tenant info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{msg.tenant_name || 'Onbekend'}</span>
                        <span className="text-xs text-slate-400">{msg.phone}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(msg.created_at)}</p>
                    </div>
                    {/* Channel badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${msg.channel === 'twilio_whatsapp' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {msg.channel === 'twilio_whatsapp' ? 'Twilio' : 'WhatsApp'}
                    </span>
                    {/* Type badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {/* Expanded message content */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pl-12">
                      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                        {msg.message}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-3">
          <p className="text-sm text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} van {total} berichten
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => loadMessages(page - 1)}
              data-testid="messages-prev-page"
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Vorige
            </button>
            <button
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => loadMessages(page + 1)}
              data-testid="messages-next-page"
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionTab({ company }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
        <Crown className="w-10 h-10 text-orange-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Gratis Plan</h2>
      <p className="text-slate-500 mb-8">U gebruikt momenteel het gratis plan van Appartement Kiosk</p>
      
      <div className="bg-slate-50 rounded-xl p-6 max-w-md mx-auto mb-8">
        <h4 className="font-semibold text-slate-900 mb-4">Inbegrepen:</h4>
        <ul className="text-left space-y-2 text-slate-600">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Onbeperkt appartementen
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Onbeperkt huurders
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Kiosk voor betalingen
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Kwitanties genereren
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Stroombrekers beheer
          </li>
        </ul>
      </div>

      <p className="text-sm text-slate-400">
        Bedrijfs-ID: {company?.company_id}
      </p>
    </div>
  );
}

// ============== MODALS ==============


function LeaseModal({ lease, tenants, apartments, onClose, onSave, token }) {
  const [tenantId, setTenantId] = useState(lease?.tenant_id || '');
  const [apartmentId, setApartmentId] = useState(lease?.apartment_id || '');
  const [startDate, setStartDate] = useState(lease?.start_date || '');
  const [endDate, setEndDate] = useState(lease?.end_date || '');
  const [monthlyRent, setMonthlyRent] = useState(lease?.monthly_rent || 0);
  const [voorwaarden, setVoorwaarden] = useState(lease?.voorwaarden || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (lease) {
        await axios.put(`${API}/admin/leases/${lease.lease_id}`, {
          start_date: startDate, end_date: endDate, monthly_rent: parseFloat(monthlyRent), voorwaarden
        }, { headers });
      } else {
        await axios.post(`${API}/admin/leases`, {
          tenant_id: tenantId, apartment_id: apartmentId,
          start_date: startDate, end_date: endDate, monthly_rent: parseFloat(monthlyRent), voorwaarden
        }, { headers });
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill apartment when tenant selected
  const handleTenantChange = (tid) => {
    setTenantId(tid);
    const t = tenants.find(x => x.tenant_id === tid);
    if (t) {
      setApartmentId(t.apartment_id);
      setMonthlyRent(t.monthly_rent || 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{lease ? 'Huurovereenkomst Bewerken' : 'Nieuwe Huurovereenkomst'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!lease && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Huurder</label>
                <select value={tenantId} onChange={e => handleTenantChange(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  data-testid="lease-tenant-select">
                  <option value="">Selecteer huurder...</option>
                  {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name} - {t.apartment_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appartement</label>
                <select value={apartmentId} onChange={e => setApartmentId(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  data-testid="lease-apartment-select">
                  <option value="">Selecteer appartement...</option>
                  {apartments.map(a => <option key={a.apartment_id} value={a.apartment_id}>{a.number} - {a.description}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                data-testid="lease-start-date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Einddatum</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                data-testid="lease-end-date" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maandhuur (SRD)</label>
            <input type="number" step="0.01" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              data-testid="lease-monthly-rent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Voorwaarden</label>
            <textarea value={voorwaarden} onChange={e => setVoorwaarden(e.target.value)} rows={4} placeholder="Aanvullende voorwaarden van de huurovereenkomst..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
              data-testid="lease-voorwaarden" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              Annuleren
            </button>
            <button type="submit" disabled={loading} data-testid="lease-submit"
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
              {loading ? 'Opslaan...' : lease ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function ApartmentModal({ apartment, onClose, onSave, token }) {
  const [number, setNumber] = useState(apartment?.number || '');
  const [description, setDescription] = useState(apartment?.description || '');
  const [monthlyRent, setMonthlyRent] = useState(apartment?.monthly_rent || 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { number, description, monthly_rent: parseFloat(monthlyRent) };
      if (apartment) {
        await axios.put(`${API}/admin/apartments/${apartment.apartment_id}`, data, { headers });
      } else {
        await axios.post(`${API}/admin/apartments`, data, { headers });
      }
      onSave();
    } catch (err) {
      alert('Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6">
        <h3 className="text-xl font-bold mb-4">{apartment ? 'Bewerk' : 'Nieuw'} Appartement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nummer *</label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} required
              className="w-full px-4 py-3 border rounded-xl" placeholder="A1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Omschrijving</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl" placeholder="2 slaapkamers" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maandhuur (SRD)</label>
            <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">Annuleren</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TenantModal({ tenant, apartments, onClose, onSave, token, companyId }) {
  const [name, setName] = useState(tenant?.name || '');
  const [apartmentId, setApartmentId] = useState(tenant?.apartment_id || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [telefoon, setTelefoon] = useState(tenant?.telefoon || '');
  const [tenantCode, setTenantCode] = useState(tenant?.tenant_code || '');
  const [monthlyRent, setMonthlyRent] = useState(tenant?.monthly_rent || 0);
  const [depositRequired, setDepositRequired] = useState(tenant?.deposit_required || 0);
  const [outstandingRent, setOutstandingRent] = useState(tenant?.outstanding_rent || 0);
  const [serviceCosts, setServiceCosts] = useState(tenant?.service_costs || 0);
  const [fines, setFines] = useState(tenant?.fines || 0);
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(!!tenant?.face_id_enabled);
  const [faceSaving, setFaceSaving] = useState(false);

  const availableApartments = apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { name, apartment_id: apartmentId, email: email || null, telefoon: telefoon || null,
        monthly_rent: parseFloat(monthlyRent), deposit_required: parseFloat(depositRequired),
        tenant_code: tenantCode || null };
      if (tenant) {
        data.outstanding_rent = parseFloat(outstandingRent);
        data.service_costs = parseFloat(serviceCosts);
        data.fines = parseFloat(fines);
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, data, { headers });
      } else {
        if (leaseStart && leaseEnd) {
          data.lease_start_date = leaseStart;
          data.lease_end_date = leaseEnd;
        }
        await axios.post(`${API}/admin/tenants`, data, { headers });
      }
      onSave();
    } catch (err) {
      alert('Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceRegister = async (descriptor) => {
    if (!tenant || !companyId) return;
    setFaceSaving(true);
    try {
      await axios.post(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/face/register`, { descriptor });
      setFaceRegistered(true);
      setShowFaceCapture(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Face ID registratie mislukt');
    } finally { setFaceSaving(false); }
  };

  const handleFaceDelete = async () => {
    if (!tenant || !companyId) return;
    if (!window.confirm('Face ID verwijderen voor deze huurder?')) return;
    try {
      await axios.delete(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/face`);
      setFaceRegistered(false);
    } catch { alert('Verwijderen mislukt'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{tenant ? 'Bewerk' : 'Nieuwe'} Huurder</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Naam *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Appartement *</label>
              <select value={apartmentId} onChange={(e) => {
                  const id = e.target.value;
                  setApartmentId(id);
                  if (id) {
                    const apt = apartments.find(a => a.apartment_id === id);
                    if (apt && apt.monthly_rent) {
                      setMonthlyRent(apt.monthly_rent);
                      setDepositRequired(apt.monthly_rent);
                    }
                  }
                }} required
                className="w-full px-4 py-3 border rounded-xl">
                <option value="">Selecteer...</option>
                {apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id).map(a => <option key={a.apartment_id} value={a.apartment_id}>{a.number}{a.monthly_rent ? ` - SRD ${a.monthly_rent.toLocaleString('nl-NL')}` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefoon</label>
              <input type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Huurderscode</label>
              <input type="text" value={tenantCode} onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                placeholder="bijv. A101"
                data-testid="tenant-code-input"
                className="w-full px-4 py-3 border rounded-xl font-mono uppercase" />
              <p className="text-xs text-slate-400 mt-1">Leeg = automatisch</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maandhuur (SRD)</label>
              <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Borgsom (SRD)</label>
              <input type="number" value={depositRequired} onChange={(e) => setDepositRequired(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
          </div>
          {tenant && (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Financieel</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Openstaande huur</label>
                  <input type="number" step="0.01" value={outstandingRent} onChange={(e) => setOutstandingRent(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Servicekosten</label>
                  <input type="number" step="0.01" value={serviceCosts} onChange={(e) => setServiceCosts(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Boetes</label>
                  <input type="number" step="0.01" value={fines} onChange={(e) => setFines(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
              </div>
            </div>
          )}
          {!tenant && (
            <>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Huurovereenkomst</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Startdatum</label>
                    <input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)}
                      data-testid="tenant-lease-start"
                      className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Einddatum</label>
                    <input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)}
                      data-testid="tenant-lease-end"
                      className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Automatisch een huurovereenkomst aanmaken</p>
              </div>
            </>
          )}
          {/* Face ID Section - only when editing existing tenant */}
          {tenant && companyId && (
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold text-slate-700">Face ID</p>
                </div>
                {faceRegistered && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Geregistreerd
                  </span>
                )}
              </div>
              {showFaceCapture ? (
                <div className="bg-slate-50 rounded-xl p-4">
                  <FaceCapture
                    mode="register"
                    onCapture={handleFaceRegister}
                    onCancel={() => setShowFaceCapture(false)}
                    buttonLabel={`Registreer ${tenant.name}`}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowFaceCapture(true)} data-testid="tenant-modal-face-register-btn"
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium transition">
                    <Camera className="w-4 h-4" />
                    {faceRegistered ? 'Opnieuw registreren' : 'Gezicht registreren'}
                  </button>
                  {faceRegistered && (
                    <button type="button" onClick={handleFaceDelete} data-testid="tenant-modal-face-delete-btn"
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition">
                      <Trash2 className="w-4 h-4" /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">Annuleren</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRentModal({ tenant, onClose, onSave, token }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('rent');
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');

  // Reset amount when type changes
  useEffect(() => {
    if (type === 'rent') {
      setAmount(tenant?.monthly_rent || 0);
    } else if (type === 'service') {
      setAmount('');
    } else if (type === 'fine') {
      setAmount('');
    } else if (type === 'payment') {
      setAmount('');
    }
  }, [type, tenant]);

  // Calculate next month label
  const billedThrough = tenant?.rent_billed_through || '';
  let nextMonthLabel = '';
  if (billedThrough) {
    const [y, m] = billedThrough.split('-');
    const nextDate = new Date(parseInt(y), parseInt(m));
    nextMonthLabel = nextDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  }

  const totalDebt = (tenant?.outstanding_rent || 0) + (tenant?.service_costs || 0) + (tenant?.fines || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (type === 'rent') {
        await axios.post(`${API}/admin/tenants/${tenant.tenant_id}/advance-month`, {}, { headers });
        onSave();
      } else if (type === 'service' || type === 'fine') {
        const update = {};
        if (type === 'service') {
          update.service_costs = (tenant.service_costs || 0) + parseFloat(amount);
        } else {
          update.fines = (tenant.fines || 0) + parseFloat(amount);
        }
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, update, { headers });
        onSave();
      } else if (type === 'payment') {
        // Register manual payment
        const payAmount = parseFloat(amount);
        if (!payAmount || payAmount <= 0) {
          alert('Voer een geldig bedrag in');
          setLoading(false);
          return;
        }
        // Determine what we're paying off
        let payType = 'rent';
        if (tenant.outstanding_rent > 0) payType = 'rent';
        else if (tenant.service_costs > 0) payType = 'service_costs';
        else if (tenant.fines > 0) payType = 'fines';

        const res = await axios.post(`${API}/admin/payments/register`, {
          tenant_id: tenant.tenant_id,
          amount: payAmount,
          payment_type: payType,
          payment_method: paymentMethod,
          description: description || 'Handmatige betaling'
        }, { headers });
        setPaymentResult(res.data);
        // Auto-print via bonprinter
        const PRINT_URL = 'http://localhost:5555';
        const printData = {
          company_name: 'Vastgoed Beheer',
          receipt_number: res.data.kwitantie_nummer || '',
          date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          tenant_name: res.data.tenant_name || tenant?.name || '',
          apartment: `${res.data.apartment_number || tenant?.apartment_number || ''}`,
          payment_type: { rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[res.data.payment_type] || res.data.payment_type,
          amount: Number(res.data.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
          total: Number(res.data.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
          payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' }[res.data.payment_method] || 'Contant',
          remaining_total: Number((res.data.remaining_rent || 0) + (res.data.remaining_service || 0) + (res.data.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2 })
        };
        try {
          const hc = await fetch(`${PRINT_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
          if (hc?.ok) {
            await fetch(`${PRINT_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) });
          }
        } catch {}
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Actie mislukt');
    } finally {
      setLoading(false);
    }
  };

  // Payment success screen
  if (paymentResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-orange-700 mb-2">Betaling Geregistreerd!</h3>
          <p className="text-slate-600 mb-1">Kwitantie: <span className="font-bold">{paymentResult.kwitantie_nummer}</span></p>
          <p className="text-slate-600 mb-1">Bedrag: <span className="font-bold">SRD {paymentResult.amount?.toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span></p>
          <p className="text-slate-600 mb-4">{tenant.name} - Appt. {tenant.apartment_number}</p>
          {paymentResult.whatsapp_sent && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
              <p className="text-sm text-orange-700 font-medium">WhatsApp bon automatisch verstuurd</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-slate-500 mb-1">Resterende saldi na betaling:</p>
            <p className="text-sm text-slate-700">Huur: SRD {(paymentResult.remaining_rent || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>
            <p className="text-sm text-slate-700">Servicekosten: SRD {(paymentResult.remaining_service || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>
            <p className="text-sm text-slate-700">Boetes: SRD {(paymentResult.remaining_fines || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={async () => {
                const PRINT_URL = 'http://localhost:5555';
                const printData = {
                  company_name: 'Vastgoed Beheer',
                  receipt_number: paymentResult.kwitantie_nummer || '',
                  date: new Date(paymentResult.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  time: new Date(paymentResult.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
                  tenant_name: paymentResult.tenant_name || tenant?.name || '',
                  apartment: `${paymentResult.apartment_number || tenant?.apartment_number || ''}`,
                  payment_type: { rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[paymentResult.payment_type] || paymentResult.payment_type,
                  amount: Number(paymentResult.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
                  total: Number(paymentResult.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
                  payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' }[paymentResult.payment_method] || 'Contant',
                  remaining_total: Number((paymentResult.remaining_rent || 0) + (paymentResult.remaining_service || 0) + (paymentResult.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2 })
                };
                try {
                  const hc = await fetch(`${PRINT_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
                  if (hc?.ok) { await fetch(`${PRINT_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) }); }
                  else { alert('Bonprinter niet bereikbaar'); }
                } catch { alert('Bonprinter niet bereikbaar'); }
              }}
              className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-slate-50">
              Opnieuw Printen
            </button>
            <button onClick={() => { setPaymentResult(null); onSave(); }}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-medium">
              Sluiten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">Bedrag Toevoegen / Betaling</h3>
        <p className="text-slate-500 mb-4">{tenant.name} - Appt. {tenant.apartment_number}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'rent', label: 'Maandhuur' },
                { id: 'service', label: 'Servicekosten' },
                { id: 'fine', label: 'Boete' },
                { id: 'payment', label: 'Betaling Registreren' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    type === t.id
                      ? t.id === 'payment' ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'rent' ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 mb-2">
                Gefactureerd t/m: <span className="font-bold">{billedThrough || '-'}</span>
              </p>
              <p className="text-sm text-slate-700 mb-2">
                Openstaand saldo: <span className="font-bold text-red-600">SRD {(tenant.outstanding_rent || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span>
              </p>
              <div className="border-t border-orange-200 pt-2 mt-2">
                <p className="text-sm text-slate-700">
                  Nieuwe maand: <span className="font-bold text-orange-700">{nextMonthLabel}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Maandhuur: <span className="font-bold">SRD {(tenant.monthly_rent || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span>
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  Nieuw totaal: SRD {((tenant.outstanding_rent || 0) + (tenant.monthly_rent || 0)).toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          ) : type === 'payment' ? (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm font-bold text-orange-800 mb-2">Openstaande schuld</p>
                {tenant.outstanding_rent > 0 && <p className="text-sm text-slate-700">Huur: SRD {(tenant.outstanding_rent).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                {tenant.service_costs > 0 && <p className="text-sm text-slate-700">Servicekosten: SRD {(tenant.service_costs).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                {tenant.fines > 0 && <p className="text-sm text-slate-700">Boetes: SRD {(tenant.fines).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                <p className="text-sm font-bold text-slate-900 mt-1 border-t border-orange-200 pt-1">
                  Totaal: SRD {totalDebt.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Betaalmethode</label>
                <div className="flex gap-2">
                  {[{id:'cash',label:'Contant'},{id:'bank',label:'Bank'},{id:'pin',label:'PIN'}].map(m => (
                    <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${paymentMethod === m.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bedrag (SRD)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" className="w-full px-4 py-3 border rounded-xl text-2xl font-bold text-center" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Omschrijving (optioneel)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Handmatige betaling" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <p className="text-xs text-slate-400">Kwitantie wordt automatisch geprint en WhatsApp bon verstuurd</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Bedrag (SRD)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className="w-full px-4 py-3 border rounded-xl text-2xl font-bold text-center" required />
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">
              Annuleren
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-3 text-white rounded-xl disabled:opacity-50 ${type === 'payment' ? 'bg-orange-600' : 'bg-orange-500'}`}>
              {loading ? 'Bezig...' : type === 'rent' ? `Huur ${nextMonthLabel} toevoegen` : type === 'payment' ? 'Betaling Registreren' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
