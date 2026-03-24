import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Home, CreditCard, Loader2, Search,
  AlertTriangle, Crown, Check, X, ArrowLeft, TrendingUp,
  DollarSign, Shield, ToggleLeft, ToggleRight
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    } catch { /* skip */ }
  };

  const handleToggleStatus = async (companyId) => {
    try {
      await axios.put(`${API}/superadmin/companies/${companyId}/status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { alert('Statuswijziging mislukt'); }
  };

  const handleUpdateSubscription = async (companyId, sub) => {
    try {
      await axios.put(`${API}/superadmin/companies/${companyId}/subscription?subscription=${sub}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { alert('Abonnement wijzigen mislukt'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    navigate('/vastgoed');
  };

  const filteredCompanies = companies.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const TABS = [
    { id: 'overview', label: 'Overzicht', icon: TrendingUp },
    { id: 'companies', label: 'Bedrijven', icon: Building2 },
    { id: 'payments', label: 'Betalingen', icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100" data-testid="superadmin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Super Admin</h1>
              <p className="text-xs text-slate-500">Platform Beheer</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="superadmin-logout"
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-600 transition"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'payments' && payments.length === 0) loadPayments();
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

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Building2, label: 'Bedrijven', value: stats.total_companies, sub: `${stats.active_companies} actief`, color: 'bg-blue-50 text-blue-600' },
                { icon: Users, label: 'Huurders', value: stats.total_tenants, color: 'bg-purple-50 text-purple-600' },
                { icon: Home, label: 'Appartementen', value: stats.total_apartments, color: 'bg-green-50 text-green-600' },
                { icon: CreditCard, label: 'Betalingen', value: stats.total_payments, color: 'bg-orange-50 text-orange-600' },
                { icon: DollarSign, label: 'Totale Omzet', value: formatSRD(stats.total_revenue), color: 'bg-emerald-50 text-emerald-600' },
                { icon: Crown, label: 'Abonnementen', value: companies.filter(c => c.subscription !== 'gratis').length + ' betaald', sub: `${companies.filter(c => c.subscription === 'gratis').length} gratis`, color: 'bg-amber-50 text-amber-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-slate-500">{s.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  {s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Top Companies */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Top Bedrijven (op omzet)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Bedrijf</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Huurders</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Appartementen</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Omzet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...companies].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(c => (
                      <tr key={c.company_id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">{c.tenant_count}</td>
                        <td className="p-4 text-right font-medium text-slate-700">{c.apartment_count}</td>
                        <td className="p-4 text-right font-bold text-green-600">{formatSRD(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Zoek op bedrijfsnaam of email..."
                  data-testid="superadmin-company-search"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Alle Bedrijven ({filteredCompanies.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Bedrijf</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Abonnement</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Huurders</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Appt.</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Omzet</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map(c => (
                      <tr key={c.company_id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                          {c.telefoon && <p className="text-xs text-slate-400">{c.telefoon}</p>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {c.status === 'active' ? 'Actief' : 'Inactief'}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={c.subscription || 'gratis'}
                            onChange={e => handleUpdateSubscription(c.company_id, e.target.value)}
                            data-testid={`sub-select-${c.company_id}`}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                          >
                            <option value="gratis">Gratis</option>
                            <option value="basis">Basis</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">{c.tenant_count}</td>
                        <td className="p-4 text-right font-medium text-slate-700">{c.apartment_count}</td>
                        <td className="p-4 text-right font-bold text-green-600">{formatSRD(c.revenue)}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(c.company_id)}
                            data-testid={`toggle-status-${c.company_id}`}
                            className={`p-2 rounded-lg transition ${
                              c.status === 'active'
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                            title={c.status === 'active' ? 'Deactiveren' : 'Activeren'}
                          >
                            {c.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Recente Betalingen (alle bedrijven)</h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Betalingen laden...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Bedrijf</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Appt.</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.payment_id || i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-4 text-sm font-medium text-slate-700">{p.company_name || '-'}</td>
                        <td className="p-4 font-bold text-slate-900">{p.tenant_name}</td>
                        <td className="p-4 text-slate-600">{p.apartment_number}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-semibold">
                            {p.payment_type === 'rent' ? 'Huur' : p.payment_type === 'fine' ? 'Boete' : p.payment_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-green-600">{formatSRD(p.amount)}</td>
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
