import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CreditCard, Home, Plus, Pencil, Trash2, 
  ArrowLeft, DollarSign, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, Crown, Search, Calendar,
  AlertTriangle, User, Banknote, FileText, Save, Eye, LogIn, MessageSquare,
  Phone, Mail, Landmark, UserCog, TrendingUp, TrendingDown, Briefcase, ScanFace, Camera, XCircle
} from 'lucide-react';
import axios from 'axios';
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
    { id: 'employees', label: 'Werknemers', icon: Briefcase },
    { id: 'settings', label: 'Instellingen', icon: Settings },
    { id: 'power', label: 'Stroombrekers', icon: Zap },
    { id: 'messages', label: 'Berichten', icon: MessageSquare },
    { id: 'subscription', label: 'Abonnement', icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3 sm:py-4 px-3 sm:px-4 lg:px-8 shadow-sm">
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

      <div className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Tabs */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1 scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
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
          <SettingsTab company={company} token={token} onRefresh={loadData} />
        )}

        {/* Bank/Kas Tab */}
        {activeTab === 'kas' && (
          <KasTab token={token} tenants={tenants} formatSRD={formatSRD} />
        )}

        {/* Werknemers Tab */}
        {activeTab === 'employees' && (
          <EmployeesTab token={token} formatSRD={formatSRD} />
        )}

        {/* Power/Stroombrekers Tab */}
        {activeTab === 'power' && (
          <PowerTab apartments={apartments} tenants={tenants} token={token} onRefresh={loadData} />
        )}

        {/* Berichten/WhatsApp Tab */}
        {activeTab === 'messages' && (
          <MessagesTab token={token} />
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <SubscriptionTab company={company} />
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
    </div>
  );
}

// ============== DASHBOARD TAB ==============
function DashboardTab({ dashboard, payments, leases, formatSRD }) {
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
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Overzicht</h2>
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
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50">
              <tr>
                {stats.map((stat, i) => (
                  <th key={i} className="p-4 text-sm font-medium text-slate-500 text-left">{stat.label}</th>
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
                      <p className="text-lg font-bold text-slate-900">{stat.value}</p>
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
                    <td className="p-4 text-right font-bold text-green-600">{formatSRD(p.amount)}</td>
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
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurmaand</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Huur</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Service</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Boetes</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Totaal</th>
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
                  const total = rent + service + fines;
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
                      <td className={`p-4 text-right font-bold ${rent > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatSRD(rent)}
                      </td>
                      <td className={`p-4 text-right font-bold ${service > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {formatSRD(service)}
                      </td>
                      <td className={`p-4 text-right font-bold ${fines > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatSRD(fines)}
                      </td>
                      <td className={`p-4 text-right font-black ${total > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
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
                              <MessageSquare className="w-4 h-4" />
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
                      apt.status === 'occupied' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
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

  const handlePrint = () => {
    window.print();
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
function SettingsTab({ company, token, onRefresh }) {
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

      {/* Face ID Section */}
      <FaceIdSettings company={company} token={token} onRefresh={onRefresh} />
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
  const [category, setCategory] = useState('other');
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
      setAmount(''); setDescription(''); setCategory('other'); setRelatedTenant('');
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
          <h2 className="font-semibold text-slate-900">Uitgaven Overzicht</h2>
          <div className="flex gap-2">
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
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Bijv. Onderhoud dak" required data-testid="kas-description-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Categorie</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" data-testid="kas-category-select">
                  <option value="maintenance">Onderhoud</option>
                  <option value="utilities">Nutsvoorzieningen</option>
                  <option value="supplies">Materialen</option>
                  <option value="other">Overig</option>
                </select>
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
          <p className="text-2xl font-bold text-green-600">{formatSRD(activeEmps.reduce((s, e) => s + (e.total_paid || 0), 0))}</p>
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
                    <td className="p-4 text-right font-bold text-green-600">{formatSRD(emp.total_paid || 0)}</td>
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

// ============== SUBSCRIPTION TAB ==============
function MessagesTab({ token }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/whatsapp/history`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadMessages(); }, []);

  const typeLabels = {
    payment_confirmation: { label: 'Betaling', color: 'bg-green-100 text-green-700' },
    new_invoice: { label: 'Factuur', color: 'bg-blue-100 text-blue-700' },
    fine_applied: { label: 'Boete', color: 'bg-red-100 text-red-700' },
    overdue: { label: 'Achterstand', color: 'bg-orange-100 text-orange-700' },
    auto: { label: 'Automatisch', color: 'bg-slate-100 text-slate-600' },
    manual: { label: 'Handmatig', color: 'bg-purple-100 text-purple-700' },
  };

  const statusLabels = {
    sent: { label: 'Verzonden', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    failed: { label: 'Mislukt', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    pending: { label: 'Wachtend', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  };

  const filtered = messages.filter(m => {
    if (filterType !== 'all' && m.message_type !== filterType) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (m.tenant_name || '').toLowerCase().includes(q) || (m.phone || '').includes(q);
    }
    return true;
  });

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  const stats = {
    total: messages.length,
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
            onClick={loadMessages}
            data-testid="messages-refresh"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
          >
            <Loader2 className="w-4 h-4" />
            Vernieuwen
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
              <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} required
                className="w-full px-4 py-3 border rounded-xl">
                <option value="">Selecteer...</option>
                {availableApartments.map(a => <option key={a.apartment_id} value={a.apartment_id}>{a.number}</option>)}
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
  const [amount, setAmount] = useState(tenant?.monthly_rent || 0);
  const [type, setType] = useState('rent');
  const [loading, setLoading] = useState(false);

  // Calculate next month label
  const billedThrough = tenant?.rent_billed_through || '';
  let nextMonthLabel = '';
  if (billedThrough) {
    const [y, m] = billedThrough.split('-');
    const nextDate = new Date(parseInt(y), parseInt(m)); // month is 0-indexed, so parseInt(m) = next month
    nextMonthLabel = nextDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (type === 'rent') {
        // Use advance-month endpoint: adds monthly rent and moves to next month
        await axios.post(`${API}/admin/tenants/${tenant.tenant_id}/advance-month`, {}, { headers });
      } else {
        // Service costs or fines: add to existing balance
        const update = {};
        if (type === 'service') {
          update.service_costs = (tenant.service_costs || 0) + parseFloat(amount);
        } else if (type === 'fine') {
          update.fines = (tenant.fines || 0) + parseFloat(amount);
        }
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, update, { headers });
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.detail || 'Toevoegen mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6">
        <h3 className="text-xl font-bold mb-2">Bedrag Toevoegen</h3>
        <p className="text-slate-500 mb-4">{tenant.name} - Appt. {tenant.apartment_number}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="flex gap-2">
              {[
                { id: 'rent', label: 'Maandhuur' },
                { id: 'service', label: 'Servicekosten' },
                { id: 'fine', label: 'Boete' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    type === t.id 
                      ? 'bg-orange-500 text-white' 
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
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Bedrag (SRD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl text-2xl font-bold text-center"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">
              Annuleren
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {loading ? 'Toevoegen...' : type === 'rent' ? `Huur ${nextMonthLabel} toevoegen` : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
