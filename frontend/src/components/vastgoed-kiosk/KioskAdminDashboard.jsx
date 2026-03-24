import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CreditCard, Home, Plus, Pencil, Trash2, 
  ArrowLeft, DollarSign, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, Crown, Search, Calendar,
  AlertTriangle, User, Banknote, FileText, Save, Eye, LogIn,
  Phone, Mail
} from 'lucide-react';
import axios from 'axios';

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
  const [copied, setCopied] = useState(false);

  // Modal states
  const [showApartmentModal, setShowApartmentModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showAddRentModal, setShowAddRentModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

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
      const [meRes, dashRes, aptRes, tenRes, payRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { headers }),
        axios.get(`${API}/admin/dashboard`, { headers }),
        axios.get(`${API}/admin/apartments`, { headers }),
        axios.get(`${API}/admin/tenants`, { headers }),
        axios.get(`${API}/admin/payments`, { headers })
      ]);
      setCompany(meRes.data);
      setDashboard(dashRes.data);
      setApartments(aptRes.data);
      setTenants(tenRes.data);
      setPayments(payRes.data);
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
        {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} payments={payments} formatSRD={formatSRD} />}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <TenantsTab 
            tenants={tenants}
            apartments={apartments}
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
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab company={company} token={token} onRefresh={loadData} />
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
function DashboardTab({ dashboard, payments, formatSRD }) {
  if (!dashboard) return null;

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
function TenantsTab({ tenants, apartments, formatSRD, getInitials, onAddTenant, onEditTenant, onAddRent, onRefresh, token }) {
  const activeTenants = tenants.filter(t => t.status === 'active');
  const [deleting, setDeleting] = useState(null);

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

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="font-semibold text-slate-900">Huurders ({activeTenants.length})</h2>
        <button
          onClick={onAddTenant}
          data-testid="add-tenant-button"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
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
                <th className="text-left p-4 text-sm font-medium text-slate-500">Contact</th>
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
                      <div className="text-sm">
                        {tenant.telefoon && <p className="text-slate-500">{tenant.telefoon}</p>}
                        {tenant.email && <p className="text-slate-400 truncate max-w-[180px]">{tenant.email}</p>}
                      </div>
                    </td>
                    <td className={`p-4 text-right font-bold ${rent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatSRD(rent)}
                    </td>
                    <td className={`p-4 text-right font-bold ${service > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatSRD(service)}
                    </td>
                    <td className={`p-4 text-right font-bold ${fines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatSRD(fines)}
                    </td>
                    <td className={`p-4 text-right font-black ${total > 0 ? 'text-orange-600' : 'text-green-600'}`}>
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
  );
}

// ============== APARTMENTS TAB ==============
function ApartmentsTab({ apartments, tenants, formatSRD, onAdd, onEdit }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="font-semibold text-slate-900">Appartementen ({apartments.length})</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
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
            {apartments.map(apt => {
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
                      {apt.status === 'occupied' ? 'Bewoond' : 'Beschikbaar'}
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
function PaymentsTab({ payments, totalFiltered, searchTerm, setSearchTerm, selectedMonth, setSelectedMonth, formatSRD }) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    });
  }

  return (
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
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs capitalize">
                      {p.payment_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-green-600">{formatSRD(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============== SETTINGS TAB ==============
function SettingsTab({ company, token, onRefresh }) {
  const [billingDay, setBillingDay] = useState(company?.billing_day || 1);
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
        fine_amount: fineAmount,
        stamp_company_name: stampName,
        stamp_address: stampAddress,
        stamp_phone: stampPhone,
        stamp_whatsapp: stampWhatsapp,
        kiosk_pin: kioskPin || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert('Opslaan mislukt');
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

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Huur vervalt op dag
            </label>
            <p className="text-xs text-slate-400 mb-2">De dag van de maand waarop de huur betaald moet zijn (1-28)</p>
            <input
              type="number"
              min="1"
              max="28"
              value={billingDay}
              onChange={(e) => setBillingDay(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
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
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Stroombrekers</h3>
            <p className="text-sm text-slate-500">Beheer de stroomstatus per appartement</p>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-3 gap-4">
        {activeTenants.map(tenant => {
          const apt = apartments.find(a => a.apartment_id === tenant.apartment_id);
          const powerOn = tenant.power_status !== 'off';
          const hasDebt = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) > 0;

          return (
            <div key={tenant.tenant_id} className={`rounded-xl border-2 p-4 ${
              powerOn ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900">Appt. {apt?.number}</p>
                  <p className="text-sm text-slate-500">{tenant.name}</p>
                </div>
                <div className={`w-4 h-4 rounded-full ${powerOn ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              
              {hasDebt && (
                <p className="text-xs text-red-600 mb-3">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Openstaand saldo
                </p>
              )}

              <button
                onClick={() => togglePower(tenant.tenant_id, powerOn ? 'on' : 'off')}
                disabled={updating === tenant.tenant_id}
                className={`w-full py-2 rounded-lg font-medium text-sm transition ${
                  powerOn 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                } disabled:opacity-50`}
              >
                {updating === tenant.tenant_id ? 'Bezig...' : powerOn ? 'Stroom UIT' : 'Stroom AAN'}
              </button>
            </div>
          );
        })}
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
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, data, { headers });
      } else {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const update = {};
      if (type === 'rent') {
        update.outstanding_rent = (tenant.outstanding_rent || 0) + parseFloat(amount);
      } else if (type === 'service') {
        update.service_costs = (tenant.service_costs || 0) + parseFloat(amount);
      } else if (type === 'fine') {
        update.fines = (tenant.fines || 0) + parseFloat(amount);
      }
      
      await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, update, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSave();
    } catch (err) {
      alert('Toevoegen mislukt');
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
          <div>
            <label className="block text-sm font-medium mb-1">Bedrag (SRD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl text-2xl font-bold text-center"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">
              Annuleren
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {loading ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
