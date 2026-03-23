import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CreditCard, Home, Plus, Pencil, Trash2, 
  ArrowLeft, DollarSign, Loader2, Settings, ExternalLink,
  Copy, Check, Receipt, Zap, Crown, Search, Calendar,
  AlertTriangle, User, Banknote, FileText, Save, Eye
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskAdminDashboard() {
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

  useEffect(() => {
    if (!token) {
      navigate('/vastgoed');
      return;
    }
    loadData();
  }, [token, navigate]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/vastgoed')} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{company?.name}</h1>
                <p className="text-sm text-slate-500">Beheerder</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyKioskUrl}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm hover:bg-slate-200 transition"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              Kopieer Kiosk URL
            </button>
            <button
              onClick={() => navigate(`/vastgoed/${company?.company_id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Open Kiosk
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && <DashboardTab dashboard={dashboard} formatSRD={formatSRD} />}

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
function DashboardTab({ dashboard, formatSRD }) {
  if (!dashboard) return null;

  const stats = [
    { icon: Home, label: 'Appartementen', value: dashboard.total_apartments, color: 'blue' },
    { icon: Users, label: 'Actieve Huurders', value: dashboard.total_tenants, color: 'green' },
    { icon: DollarSign, label: 'Openstaande Huur', value: formatSRD(dashboard.total_outstanding), color: 'red' },
    { icon: FileText, label: 'Open Servicekosten', value: formatSRD(dashboard.total_service_costs), color: 'orange' },
    { icon: AlertTriangle, label: 'Open Boetes', value: formatSRD(dashboard.total_fines), color: 'purple' },
    { icon: CreditCard, label: 'Ontvangen (maand)', value: formatSRD(dashboard.total_received_month), color: 'emerald' },
  ];

  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
          <div className={`w-12 h-12 rounded-lg ${colors[stat.color]} flex items-center justify-center mb-4`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ============== TENANTS TAB ==============
function TenantsTab({ tenants, apartments, formatSRD, getInitials, onAddTenant, onEditTenant, onAddRent, onRefresh, token }) {
  const [deleting, setDeleting] = useState(null);
  const activeTenants = tenants.filter(t => t.status === 'active');

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Weet u zeker dat u ${tenant.name} wilt verwijderen?`)) return;
    setDeleting(tenant.tenant_id);
    try {
      await axios.delete(`${API}/admin/tenants/${tenant.tenant_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (err) {
      alert('Verwijderen mislukt');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Huurders ({activeTenants.length})</h2>
        <button
          onClick={onAddTenant}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" />
          Nieuwe Huurder
        </button>
      </div>

      <div className="space-y-4">
        {activeTenants.map(tenant => {
          const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
          // Show arrears if there's any outstanding debt (rent, service, or fines)
          const hasArrears = total > 0;
          const currentDate = new Date();
          const monthName = currentDate.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });

          return (
            <div key={tenant.tenant_id} className="bg-white rounded-2xl border border-slate-200 p-6">
              {/* Header Section */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* Blue Avatar - Deep Royal Blue #2E3A8C */}
                  <div 
                    className="w-16 h-16 rounded-2xl text-white flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: '#2E3A8C' }}
                  >
                    {getInitials(tenant.name).charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl">{tenant.name}</h3>
                    <p className="text-slate-500">
                      Appt. {tenant.apartment_number} · {tenant.tenant_code} · 
                      <span style={{ color: '#4CAF50' }} className="font-semibold ml-1">Actief</span>
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-slate-500 text-sm">
                      {tenant.telefoon && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {tenant.telefoon}
                        </span>
                      )}
                      {tenant.email && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {tenant.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Edit/Delete Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditTenant(tenant)}
                    className="w-12 h-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-slate-300 hover:text-slate-700 transition"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tenant)}
                    disabled={deleting === tenant.tenant_id}
                    className="w-12 h-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-red-200 hover:text-red-500 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-slate-200 my-4"></div>

              {/* Financial Cards Grid */}
              <div className="grid grid-cols-5 gap-3 mb-5">
                {/* Maand - Light Blue Background #F4F8FD */}
                <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#F4F8FD' }}>
                  <p className="text-xs uppercase font-medium mb-1" style={{ color: '#E53935' }}>Maand</p>
                  <p className="font-bold text-lg" style={{ color: '#1E3A8A' }}>{monthName}</p>
                </div>
                
                {/* Huur - Red #E53935 for amounts > 0, Green #4CAF50 for 0 */}
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400 uppercase font-medium mb-1">Huur</p>
                  <p 
                    className="font-bold text-lg"
                    style={{ color: (tenant.outstanding_rent || 0) > 0 ? '#E53935' : '#4CAF50' }}
                  >
                    SRD<br />{Number(tenant.outstanding_rent || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Service - Green #4CAF50 for 0, Red #E53935 for > 0 */}
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400 uppercase font-medium mb-1">Service</p>
                  <p 
                    className="font-bold text-lg"
                    style={{ color: (tenant.service_costs || 0) > 0 ? '#E53935' : '#4CAF50' }}
                  >
                    SRD<br />{Number(tenant.service_costs || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Boetes - Red #E53935 */}
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400 uppercase font-medium mb-1">Boetes</p>
                  <p 
                    className="font-bold text-lg"
                    style={{ color: (tenant.fines || 0) > 0 ? '#E53935' : '#4CAF50' }}
                  >
                    SRD<br />{Number(tenant.fines || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Totaal - Blue #1E88E5 */}
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400 uppercase font-medium mb-1">Totaal</p>
                  <p className="font-bold text-lg" style={{ color: '#1E88E5' }}>
                    SRD<br />{Number(total).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onAddRent(tenant)}
                  className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-medium hover:border-orange-300 hover:text-orange-600 transition"
                >
                  <DollarSign className="w-5 h-5" />
                  + Maandhuur
                </button>
                
                {hasArrears && (
                  <div className="flex items-center gap-2 px-4 py-3 text-orange-500 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    Achterstand
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {activeTenants.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nog geen huurders toegevoegd</p>
            <button
              onClick={onAddTenant}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Eerste Huurder Toevoegen
            </button>
          </div>
        )}
      </div>
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
        stamp_whatsapp: stampWhatsapp
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
