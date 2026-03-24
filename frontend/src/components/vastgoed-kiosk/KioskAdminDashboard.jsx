import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CreditCard, Home, Plus, Pencil, Trash2, 
  ArrowLeft, DollarSign, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, Crown, Search, Calendar,
  AlertTriangle, User, Banknote, FileText, Save, Eye, LogIn,
  Phone, Mail, Landmark, UserCog, TrendingUp, TrendingDown, Briefcase
} from 'lucide-react';
import axios from 'axios';
import ReceiptTicket from './ReceiptTicket';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskAdminDashboard({ companyId: propCompanyId, pinAuthenticated = false, onBack }) {
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
    localStorage.removeItem('kiosk_token');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('kiosk_pin_verified_')) sessionStorage.removeItem(key);
    });
    navigate('/vastgoed');
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
    { id: 'subscription', label: 'Abonnement', icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 lg:px-8 shadow-sm">
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

      <div className="w-full px-4 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition active:scale-95 ${
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

      {/* Stat Cards - zelfde witte container als Huurders/Appartementen */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Overzicht</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
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
            <table className="w-full">
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
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurmaand</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Huur</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Service</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Boetes</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Totaal</th>
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
            <table className="w-full">
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
function ApartmentsTab({ apartments, tenants, formatSRD, onAdd, onEdit }) {
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
        <table className="w-full">
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
                    <button onClick={() => onEdit(apt)} className="text-slate-400 hover:text-orange-500 p-1">
                      <Pencil className="w-4 h-4" />
                    </button>
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
function PaymentsTab({ payments, totalFiltered, searchTerm, setSearchTerm, selectedMonth, setSelectedMonth, formatSRD, token, company }) {
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
    stamp_whatsapp: company.stamp_whatsapp || ''
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
          <table className="w-full">
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
                    <button
                      onClick={() => setSelectedPayment(p)}
                      data-testid={`receipt-view-${p.payment_id}`}
                      className="text-slate-400 hover:text-orange-500 p-1"
                      title="Kwitantie bekijken / afdrukken"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
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
  const [stampName, setStampName] = useState(company?.stamp_company_name || '');
  const [stampAddress, setStampAddress] = useState(company?.stamp_address || '');
  const [stampPhone, setStampPhone] = useState(company?.stamp_phone || '');
  const [stampWhatsapp, setStampWhatsapp] = useState(company?.stamp_whatsapp || '');
  const [kioskPin, setKioskPin] = useState(company?.kiosk_pin || '');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingFines, setApplyingFines] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        billing_day: billingDay,
        billing_next_month: billingNextMonth,
        fine_amount: fineAmount
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
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Bedrijfsstempel</h3>
            <p className="text-sm text-slate-500">Configureer de stempel die op kwitanties wordt getoond</p>
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
                placeholder="bijv. Stichting Perraysarbha"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Adres</label>
              <input
                type="text"
                value={stampAddress}
                onChange={(e) => setStampAddress(e.target.value)}
                placeholder="bijv. Kewalbasingweg nr.7"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Telefoon</label>
              <input
                type="text"
                value={stampPhone}
                onChange={(e) => setStampPhone(e.target.value)}
                placeholder="bijv. 8624141"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp</label>
              <input
                type="text"
                value={stampWhatsapp}
                onChange={(e) => setStampWhatsapp(e.target.value)}
                placeholder="bijv. +597 8624141"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Voorbeeld</label>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              {stampName || stampAddress || stampPhone ? (
                <div className="border border-slate-300 rounded-lg p-4 text-center">
                  <Home className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  {stampName && <p className="font-bold text-slate-900">{stampName}</p>}
                  {stampAddress && <p className="text-sm text-slate-500">{stampAddress}</p>}
                  {stampPhone && <p className="text-sm text-slate-500">Tel: {stampPhone}</p>}
                  {stampWhatsapp && <p className="text-sm text-slate-500">WhatsApp: {stampWhatsapp}</p>}
                </div>
              ) : (
                <p className="text-center text-slate-400">Vul de velden in om een voorbeeld te zien</p>
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
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
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
            <table className="w-full">
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
            <table className="w-full">
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
  const [updating, setUpdating] = useState(null);

  const togglePower = async (tenantId, currentStatus) => {
    setUpdating(tenantId);
    try {
      await axios.put(`${API}/admin/tenants/${tenantId}`, {
        power_status: currentStatus === 'on' ? 'off' : 'on'
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert('Status wijzigen mislukt');
    } finally {
      setUpdating(null);
    }
  };

  const activeTenants = tenants.filter(t => t.status === 'active');

  return (
    <div>
      {/* Panel header */}
      <div className="bg-slate-200 rounded-t-xl px-6 py-4 flex items-center justify-between border border-slate-300 border-b-0">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-slate-800">Stroombrekers Paneel</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-slate-500 font-medium">SYSTEEM ACTIEF</span>
        </div>
      </div>

      {/* Breaker panel body */}
      <div className="bg-slate-100 rounded-b-xl p-6 border border-slate-300 border-t-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {activeTenants.map(tenant => {
            const apt = apartments.find(a => a.apartment_id === tenant.apartment_id);
            const powerOn = tenant.power_status !== 'off';
            const hasDebt = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) > 0;
            const isUpdating = updating === tenant.tenant_id;

            return (
              <div
                key={tenant.tenant_id}
                data-testid={`breaker-${tenant.tenant_id}`}
                className="flex flex-col items-center"
              >
                {/* Breaker unit */}
                <div className="w-28 rounded-md overflow-hidden" style={{background:'linear-gradient(180deg,#e8e8e8 0%,#d4d4d4 100%)', boxShadow:'0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)'}}>
                  {/* Top screw */}
                  <div className="flex justify-center pt-2">
                    <div className="w-3.5 h-3.5 rounded-full" style={{background:'linear-gradient(135deg,#bbb 0%,#888 100%)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.4)'}}>
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-[1px] bg-slate-500/60 rotate-45" />
                      </div>
                    </div>
                  </div>

                  {/* Switch housing */}
                  <div className="px-3 py-2">
                    <div className="relative w-full h-28 rounded" style={{background:'linear-gradient(180deg,#c0c0c0 0%,#a0a0a0 100%)', boxShadow:'inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.3)'}}>
                      {/* ON label */}
                      <div className="absolute top-1.5 left-0 right-0 text-center">
                        <span className="text-[8px] font-black text-slate-500/70 tracking-widest">ON</span>
                        <div className="w-3.5 h-[1.5px] bg-slate-500/40 mx-auto mt-0.5" />
                      </div>
                      {/* OFF label */}
                      <div className="absolute bottom-1.5 left-0 right-0 text-center">
                        <div className="w-3.5 h-[1.5px] bg-slate-500/40 mx-auto mb-0.5" />
                        <span className="text-[8px] font-black text-slate-500/70 tracking-widest">OFF</span>
                      </div>

                      {/* Toggle lever */}
                      <button
                        onClick={() => togglePower(tenant.tenant_id, powerOn ? 'on' : 'off')}
                        disabled={isUpdating}
                        data-testid={`breaker-toggle-${tenant.tenant_id}`}
                        className="absolute left-2 right-2 h-12 cursor-pointer transition-all duration-300 disabled:cursor-wait"
                        style={{
                          top: powerOn ? '10px' : 'auto',
                          bottom: powerOn ? 'auto' : '10px',
                          background: powerOn
                            ? 'linear-gradient(180deg, #fb923c 0%, #ea580c 40%, #c2410c 100%)'
                            : 'linear-gradient(180deg, #94a3b8 0%, #64748b 40%, #475569 100%)',
                          borderRadius: '4px',
                          boxShadow: powerOn
                            ? '0 4px 8px rgba(234,88,12,0.4), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.2)'
                            : '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Lever grip lines */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]">
                          <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                          <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                          <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Bottom screw + LED */}
                  <div className="flex items-center justify-between px-4 pb-2">
                    <div className="w-3.5 h-3.5 rounded-full" style={{background:'linear-gradient(135deg,#bbb 0%,#888 100%)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.4)'}}>
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-[1px] bg-slate-500/60 -rotate-45" />
                      </div>
                    </div>
                    {/* LED indicator */}
                    <div className={`w-3 h-3 rounded-full border ${powerOn ? 'bg-green-400 border-green-500' : 'bg-red-500 border-red-600'}`} style={{boxShadow: powerOn ? '0 0 6px rgba(74,222,128,0.6)' : '0 0 6px rgba(239,68,68,0.5)'}} />
                  </div>
                </div>

                {/* Label below */}
                <div className="mt-3 text-center">
                  <p className="text-sm font-bold text-slate-700">Appt. {apt?.number}</p>
                  <p className="text-xs text-slate-400">{tenant.name}</p>
                  <span className={`text-[10px] font-bold tracking-wider ${powerOn ? 'text-green-600' : 'text-red-500'}`}>
                    {isUpdating ? 'BEZIG...' : powerOn ? 'AAN' : 'UIT'}
                  </span>
                  {hasDebt && (
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] text-orange-500 font-medium">SCHULD</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============== SUBSCRIPTION TAB ==============
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
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
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
          <div className="grid grid-cols-2 gap-4">
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
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
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

function TenantModal({ tenant, apartments, onClose, onSave, token }) {
  const [name, setName] = useState(tenant?.name || '');
  const [apartmentId, setApartmentId] = useState(tenant?.apartment_id || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [telefoon, setTelefoon] = useState(tenant?.telefoon || '');
  const [monthlyRent, setMonthlyRent] = useState(tenant?.monthly_rent || 0);
  const [depositRequired, setDepositRequired] = useState(tenant?.deposit_required || 0);
  const [outstandingRent, setOutstandingRent] = useState(tenant?.outstanding_rent || 0);
  const [serviceCosts, setServiceCosts] = useState(tenant?.service_costs || 0);
  const [fines, setFines] = useState(tenant?.fines || 0);
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [loading, setLoading] = useState(false);

  const availableApartments = apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { name, apartment_id: apartmentId, email: email || null, telefoon: telefoon || null,
        monthly_rent: parseFloat(monthlyRent), deposit_required: parseFloat(depositRequired) };
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{tenant ? 'Bewerk' : 'Nieuwe'} Huurder</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
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
