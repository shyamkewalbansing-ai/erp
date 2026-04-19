import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Home, CreditCard, Loader2, Search,
  Crown, ArrowLeft, TrendingUp, DollarSign, Shield,
  ToggleLeft, ToggleRight, Power, PowerOff, RefreshCw,
  LogIn, Trash2
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;
const PRO_PRICE = 3500;

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSub, setFilterSub] = useState('all');
  const token = localStorage.getItem('superadmin_token');

  const formatSRD = (v) => `SRD ${(v || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!token) { navigate('/vastgoed'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [statsRes, companiesRes] = await Promise.all([
        axios.get(`${API}/superadmin/stats`, { headers }),
        axios.get(`${API}/superadmin/companies`, { headers }),
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('superadmin_token');
        navigate('/vastgoed');
      }
    }
    setLoading(false);
  };

  const loadPayments = async () => {
    try {
      const res = await axios.get(`${API}/superadmin/payments`, { headers: { Authorization: `Bearer ${token}` } });
      setPayments(res.data);
      setPaymentsLoaded(true);
    } catch { /* skip */ }
  };

  const handleToggleStatus = async (companyId) => {
    try {
      await axios.put(`${API}/superadmin/companies/${companyId}/status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { alert('Statuswijziging mislukt'); }
  };

  const handleToggleSubscription = async (companyId) => {
    try {
      await axios.put(`${API}/superadmin/companies/${companyId}/subscription`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { alert('Abonnement wijzigen mislukt'); }
  };

  const handleImpersonate = async (company) => {
    if (!window.confirm(`Inloggen als "${company.name}"? U krijgt volledige toegang tot dit bedrijf.`)) return;
    try {
      const res = await axios.post(
        `${API}/superadmin/companies/${company.company_id}/impersonate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Store regular company token + mark session as PIN-verified so kiosk skips PIN
      localStorage.setItem('kiosk_token', res.data.token);
      sessionStorage.setItem(`kiosk_pin_verified_${res.data.company_id}`, 'true');
      // Mark session as superadmin impersonation so the admin dashboard shows a banner
      sessionStorage.setItem('sa_impersonating', '1');
      sessionStorage.setItem('sa_impersonating_company', res.data.name);
      sessionStorage.setItem('sa_impersonating_company_id', res.data.company_id);
      // Go straight to the company admin dashboard
      navigate(`/vastgoed/${res.data.company_id}`);
    } catch (err) {
      alert('Inloggen mislukt: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteCompany = async (company) => {
    const confirm1 = window.prompt(
      `⚠️ DEFINITIEF VERWIJDEREN\n\n` +
      `Bedrijf "${company.name}" en ALLE gerelateerde data (huurders, appartementen, betalingen, loonstroken, etc.) worden PERMANENT verwijderd.\n\n` +
      `Dit kan NIET ongedaan gemaakt worden.\n\n` +
      `Typ de bedrijfsnaam exact over om te bevestigen:\n"${company.name}"`
    );
    if (confirm1 === null) return;
    if (confirm1.trim() !== company.name) {
      alert('Naam komt niet overeen. Verwijderen geannuleerd.');
      return;
    }
    try {
      const res = await axios.delete(
        `${API}/superadmin/companies/${company.company_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Bedrijf verwijderd. ${res.data.records_removed || 0} records verwijderd.`);
      loadData();
    } catch (err) {
      alert('Verwijderen mislukt: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    navigate('/vastgoed');
  };

  const filteredCompanies = companies.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterSub === 'pro' && c.subscription !== 'pro') return false;
    if (filterSub === 'free' && c.subscription === 'pro') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.telefoon?.includes(q);
    }
    return true;
  });

  const TABS = [
    { id: 'companies', label: 'Bedrijven', icon: Building2 },
    { id: 'payments', label: 'Betalingen', icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="superadmin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Facturatie.sr</h1>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="superadmin-logout"
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 transition"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-[1400px] mx-auto">
        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Bedrijven</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_companies}</p>
              <p className="text-xs text-slate-400">{stats.active_companies} actief</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">PRO Abonnementen</p>
              <p className="text-xl font-bold text-red-600">{stats.pro_companies}</p>
              <p className="text-xs text-slate-400">{stats.free_companies} gratis</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">SaaS Omzet / mnd</p>
              <p className="text-xl font-bold text-green-600">{formatSRD(stats.monthly_saas_revenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Huurders</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_tenants}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Huurbetalingen</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_payments}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'payments' && !paymentsLoaded) loadPayments();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Zoek op naam, email of telefoon..."
                    data-testid="superadmin-company-search"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="all">Alle statussen</option>
                  <option value="active">Actief</option>
                  <option value="inactive">Inactief</option>
                </select>
                <select
                  value={filterSub}
                  onChange={e => setFilterSub(e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="all">Alle plannen</option>
                  <option value="pro">PRO</option>
                  <option value="free">Gratis</option>
                </select>
                <button onClick={loadData} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Companies Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrijf</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Huurders</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Appt.</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Betalingen</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Huuromzet</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map(c => (
                      <tr key={c.company_id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                          {c.telefoon && <p className="text-xs text-slate-400">{c.telefoon}</p>}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {c.status === 'active' ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                            {c.status === 'active' ? 'Actief' : 'Inactief'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {c.subscription === 'pro' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">
                              <Crown className="w-3 h-3" /> PRO
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Gratis</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700 text-sm">{c.tenant_count}</td>
                        <td className="p-4 text-right font-medium text-slate-700 text-sm">{c.apartment_count}</td>
                        <td className="p-4 text-right font-medium text-slate-700 text-sm">{c.payment_count}</td>
                        <td className="p-4 text-right font-bold text-sm text-slate-900">{formatSRD(c.revenue)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Toggle Status */}
                            <button
                              onClick={() => handleToggleStatus(c.company_id)}
                              data-testid={`toggle-status-${c.company_id}`}
                              className={`p-1.5 rounded-lg transition text-xs font-semibold ${
                                c.status === 'active'
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={c.status === 'active' ? 'Deactiveren' : 'Activeren'}
                            >
                              {c.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            {/* Toggle PRO */}
                            <button
                              onClick={() => handleToggleSubscription(c.company_id)}
                              data-testid={`toggle-sub-${c.company_id}`}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                                c.subscription === 'pro'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              title={c.subscription === 'pro' ? 'Downgrade naar Gratis' : 'Upgrade naar PRO'}
                            >
                              {c.subscription === 'pro' ? 'PRO uit' : 'PRO aan'}
                            </button>
                            {/* Login as company */}
                            <button
                              onClick={() => handleImpersonate(c)}
                              data-testid={`impersonate-${c.company_id}`}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                              title={`Inloggen als ${c.name}`}
                            >
                              <LogIn className="w-5 h-5" />
                            </button>
                            {/* Delete company */}
                            <button
                              onClick={() => handleDeleteCompany(c)}
                              data-testid={`delete-${c.company_id}`}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                              title={`Bedrijf ${c.name} verwijderen`}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredCompanies.length === 0 && (
                <div className="p-12 text-center text-slate-400">Geen bedrijven gevonden</div>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Alle Huurbetalingen</h2>
              <button onClick={loadPayments} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {!paymentsLoaded ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Betalingen laden...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Geen betalingen gevonden</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrijf</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Huurder</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Appt.</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrag</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.payment_id || i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4 text-sm text-slate-600">{p.company_name || '-'}</td>
                        <td className="p-4 text-sm font-bold text-slate-900">{p.tenant_name}</td>
                        <td className="p-4 text-sm text-slate-600">{p.apartment_number}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            p.payment_type === 'rent' ? 'bg-blue-50 text-blue-600' :
                            p.payment_type === 'fine' ? 'bg-red-50 text-red-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.payment_type === 'rent' ? 'Huur' : p.payment_type === 'fine' ? 'Boete' : p.payment_type}
                          </span>
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-slate-900">{formatSRD(p.amount)}</td>
                        <td className="p-4 text-sm text-slate-500">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
