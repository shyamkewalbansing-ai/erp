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
      const res = await axios.get(`${API}/superadmin/invoices`, { headers: { Authorization: `Bearer ${token}` } });
      setPayments(res.data);
      setPaymentsLoaded(true);
    } catch { /* skip */ }
  };

  const handleMarkInvoicePaid = async (invoiceId) => {
    if (!window.confirm('Deze factuur markeren als BETAALD?')) return;
    try {
      await axios.post(`${API}/superadmin/invoices/${invoiceId}/mark-paid`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadPayments();
      loadData();
    } catch { alert('Markeren mislukt'); }
  };

  const handleMarkInvoiceUnpaid = async (invoiceId) => {
    if (!window.confirm('Deze factuur terugzetten naar ONBETAALD?')) return;
    try {
      await axios.post(`${API}/superadmin/invoices/${invoiceId}/mark-unpaid`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadPayments();
      loadData();
    } catch { alert('Wijzigen mislukt'); }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm(`Factuur ${invoice.period} voor ${invoice.company_name} verwijderen?`)) return;
    try {
      await axios.delete(`${API}/superadmin/invoices/${invoice.invoice_id}`, { headers: { Authorization: `Bearer ${token}` } });
      loadPayments();
      loadData();
    } catch { alert('Verwijderen mislukt'); }
  };

  const handleEditPaymentMethods = async () => {
    try {
      const cur = await axios.get(`${API.replace('/superadmin','')}/public/subscription/payment-methods`);
      const d = cur.data || {};
      const bankOn = window.confirm(`Bankoverschrijving ${d.bank_transfer_enabled ? 'AAN' : 'UIT'}. Klik OK voor AAN, Cancel voor UIT.`);
      const mopeOn = window.confirm(`Mope betaling ${d.mope_enabled ? 'AAN' : 'UIT'}. Klik OK voor AAN, Cancel voor UIT.`);
      let mopeData = {};
      if (mopeOn) {
        const mope_merchant_id = window.prompt('Mope Merchant ID:', d.mope_merchant_id || '');
        if (mope_merchant_id === null) return;
        const mope_merchant_name = window.prompt('Mope Merchant naam:', d.mope_merchant_name || '');
        if (mope_merchant_name === null) return;
        const mope_phone = window.prompt('Mope Telefoonnummer:', d.mope_phone || '');
        if (mope_phone === null) return;
        mopeData = { mope_merchant_id, mope_merchant_name, mope_phone };
      }
      const uniOn = window.confirm(`Uni5Pay betaling ${d.uni5pay_enabled ? 'AAN' : 'UIT'}. Klik OK voor AAN, Cancel voor UIT.`);
      let uniData = {};
      if (uniOn) {
        const uni5pay_merchant_id = window.prompt('Uni5Pay Merchant ID:', d.uni5pay_merchant_id || '');
        if (uni5pay_merchant_id === null) return;
        const uni5pay_merchant_name = window.prompt('Uni5Pay Merchant naam:', d.uni5pay_merchant_name || '');
        if (uni5pay_merchant_name === null) return;
        uniData = { uni5pay_merchant_id, uni5pay_merchant_name };
      }
      await axios.post(`${API}/superadmin/subscription/payment-methods`,
        { bank_transfer_enabled: bankOn, mope_enabled: mopeOn, ...mopeData, uni5pay_enabled: uniOn, ...uniData },
        { headers: { Authorization: `Bearer ${token}` } });
      alert('Betaalmethoden opgeslagen');
    } catch { alert('Opslaan mislukt'); }
  };

  const handleEditBankDetails = async () => {
    try {
      const cur = await axios.get(`${API.replace('/superadmin','')}/public/subscription/bank-details`);
      const d = cur.data || {};
      const bank_name = window.prompt('Bank naam:', d.bank_name || '');
      if (bank_name === null) return;
      const account_holder = window.prompt('Ten name van:', d.account_holder || '');
      if (account_holder === null) return;
      const account_number = window.prompt('Rekeningnummer:', d.account_number || '');
      if (account_number === null) return;
      const swift = window.prompt('SWIFT/BIC (optioneel):', d.swift || '');
      if (swift === null) return;
      const reference_hint = window.prompt('Omschrijving-hint voor huurders:', d.reference_hint || 'Vermeld uw bedrijfsnaam als omschrijving');
      if (reference_hint === null) return;
      await axios.post(`${API}/superadmin/subscription/bank-details`,
        { bank_name, account_holder, account_number, swift, reference_hint },
        { headers: { Authorization: `Bearer ${token}` } });
      alert('Bankgegevens opgeslagen');
    } catch { alert('Opslaan mislukt'); }
  };

  const handleGenerateMonthly = async () => {
    if (!window.confirm('Maandelijkse facturen genereren voor alle bedrijven (zonder lifetime)?')) return;
    try {
      const res = await axios.post(`${API}/superadmin/subscription/generate-monthly`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(`${res.data.created} nieuwe facturen aangemaakt voor ${res.data.period}`);
      loadPayments();
      loadData();
    } catch { alert('Genereren mislukt'); }
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

  const handleToggleLifetime = async (company) => {
    const newVal = !company.lifetime;
    const msg = newVal
      ? `"${company.name}" LIFETIME Pro toekennen?\n\nDit bedrijf hoeft nooit meer te betalen en krijgt geen maandelijkse facturen meer.`
      : `Lifetime voor "${company.name}" intrekken?\n\nVanaf nu krijgt het bedrijf weer maandelijkse facturen.`;
    if (!window.confirm(msg)) return;
    try {
      await axios.post(`${API}/superadmin/companies/${company.company_id}/lifetime`,
        { lifetime: newVal },
        { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { alert('Lifetime wijzigen mislukt'); }
  };

  const handleEditPrice = async (company) => {
    const raw = window.prompt(`Nieuwe maandelijkse prijs voor ${company.name} (SRD):`, String(company.monthly_price || 3000));
    if (raw === null) return;
    const price = parseFloat(raw);
    if (isNaN(price) || price < 0) { alert('Ongeldig bedrag'); return; }
    try {
      await axios.put(`${API}/superadmin/companies/${company.company_id}/price`,
        { monthly_price: price },
        { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { alert('Prijs wijzigen mislukt'); }
  };

  const handleAddInvoice = async (company) => {
    const period = window.prompt(`Handmatige factuur voor ${company.name}\n\nPeriode (YYYY-MM):`, new Date().toISOString().slice(0, 7));
    if (!period) return;
    const amtRaw = window.prompt(`Bedrag (SRD):`, String(company.monthly_price || 3000));
    if (!amtRaw) return;
    const amount = parseFloat(amtRaw);
    if (isNaN(amount)) { alert('Ongeldig bedrag'); return; }
    try {
      await axios.post(`${API}/superadmin/invoices`,
        { company_id: company.company_id, period, amount },
        { headers: { Authorization: `Bearer ${token}` } });
      if (activeTab === 'payments') loadPayments();
      loadData();
      alert('Factuur toegevoegd');
    } catch { alert('Factuur aanmaken mislukt'); }
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
    { id: 'payments', label: 'Abonnement Facturen', icon: CreditCard },
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
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Abonnement</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prijs / mnd</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Betaalde fact.</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Open</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map(c => {
                      const subStatus = c.subscription_status || 'trial';
                      const statusStyle = {
                        lifetime: 'bg-purple-50 text-purple-700 border-purple-200',
                        active: 'bg-green-50 text-green-700 border-green-200',
                        trial: 'bg-blue-50 text-blue-700 border-blue-200',
                        overdue: 'bg-red-50 text-red-700 border-red-200',
                      }[subStatus] || 'bg-slate-50 text-slate-600 border-slate-200';
                      const statusLabel = {
                        lifetime: 'LIFETIME',
                        active: 'Actief',
                        trial: 'Proef',
                        overdue: 'Achterstallig',
                      }[subStatus] || subStatus;
                      const trialEnds = c.trial_ends_at ? new Date(c.trial_ends_at) : null;
                      const trialText = trialEnds && !c.lifetime ? trialEnds.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
                      return (
                      <tr key={c.company_id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                          {c.telefoon && <p className="text-xs text-slate-400">{c.telefoon}</p>}
                          {trialText && <p className="text-[11px] text-blue-500 mt-1">Proef t/m: {trialText}</p>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle}`}>
                              {c.lifetime && <Crown className="w-3 h-3" />}
                              {statusLabel}
                            </span>
                            <span className={`text-[10px] font-medium ${c.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                              {c.status === 'active' ? 'Login actief' : 'Login geblokkeerd'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleEditPrice(c)}
                            data-testid={`edit-price-${c.company_id}`}
                            className="font-bold text-slate-900 text-sm hover:text-red-600 hover:underline"
                            title="Prijs wijzigen"
                          >
                            {formatSRD(c.monthly_price || 3000)}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold">{c.paid_invoices || 0}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${c.unpaid_invoices > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>{c.unpaid_invoices || 0}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {/* Toggle Status */}
                            <button
                              onClick={() => handleToggleStatus(c.company_id)}
                              data-testid={`toggle-status-${c.company_id}`}
                              className={`p-1.5 rounded-lg transition ${
                                c.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={c.status === 'active' ? 'Login blokkeren' : 'Login activeren'}
                            >
                              {c.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            {/* Toggle Lifetime */}
                            <button
                              onClick={() => handleToggleLifetime(c)}
                              data-testid={`toggle-lifetime-${c.company_id}`}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                c.lifetime ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              title={c.lifetime ? 'Lifetime uitzetten' : 'Lifetime toekennen'}
                            >
                              <Crown className="w-3 h-3" />
                              {c.lifetime ? 'Lifetime' : 'Geen LT'}
                            </button>
                            {/* Add invoice */}
                            <button
                              onClick={() => handleAddInvoice(c)}
                              data-testid={`add-invoice-${c.company_id}`}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="Handmatige factuur toevoegen"
                            >
                              <CreditCard className="w-5 h-5" />
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
                    );})}
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
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Abonnement Facturen</h2>
                <p className="text-xs text-slate-400 mt-0.5">Maandelijkse SaaS betalingen van bedrijven (bankoverschrijving)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditBankDetails}
                  data-testid="edit-bank-details-btn"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  title="Bankgegevens wijzigen (getoond bij registratie)"
                >
                  Bankgegevens
                </button>
                <button
                  onClick={handleEditPaymentMethods}
                  data-testid="edit-payment-methods-btn"
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold"
                  title="Mope/Uni5Pay betaalmethoden configureren"
                >
                  Betaalmethoden
                </button>
                <button
                  onClick={handleGenerateMonthly}
                  data-testid="generate-monthly-btn"
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                  title="Genereer maandelijkse facturen voor alle bedrijven"
                >
                  + Maand genereren
                </button>
                <button onClick={loadPayments} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            {!paymentsLoaded ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Facturen laden...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Nog geen facturen</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrijf</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Periode</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrag</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vervaldatum</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Betaald op</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((inv) => {
                      const statusLabel = {
                        paid: 'Betaald', unpaid: 'Onbetaald', pending_review: 'Wacht op review'
                      }[inv.status] || inv.status;
                      const statusColor = {
                        paid: 'bg-green-50 text-green-700 border-green-200',
                        unpaid: inv.is_overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
                        pending_review: 'bg-blue-50 text-blue-700 border-blue-200',
                      }[inv.status] || 'bg-slate-50 text-slate-600 border-slate-200';
                      return (
                        <tr key={inv.invoice_id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-4">
                            <p className="text-sm font-bold text-slate-900">{inv.company_name}</p>
                            <p className="text-xs text-slate-400">{inv.company_id}</p>
                            {inv.payment_method && <p className="text-[11px] text-purple-600 mt-1">via {inv.payment_method}</p>}
                            {inv.payment_proof_url && (
                              <a href={inv.payment_proof_url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline">
                                📎 Betaalbewijs
                              </a>
                            )}
                          </td>
                          <td className="p-4 text-sm font-semibold text-slate-700">{inv.period}</td>
                          <td className="p-4 text-right text-sm font-bold text-slate-900">{formatSRD(inv.amount)}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                              {statusLabel}
                              {inv.is_overdue && ` (+${inv.days_overdue}d)`}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {inv.status !== 'paid' ? (
                                <button
                                  onClick={() => handleMarkInvoicePaid(inv.invoice_id)}
                                  data-testid={`mark-paid-${inv.invoice_id}`}
                                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs font-semibold"
                                >
                                  ✓ Betaald
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMarkInvoiceUnpaid(inv.invoice_id)}
                                  data-testid={`mark-unpaid-${inv.invoice_id}`}
                                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md text-xs font-semibold"
                                >
                                  ↶ Onbetaald
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteInvoice(inv)}
                                data-testid={`delete-invoice-${inv.invoice_id}`}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
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
        )}
      </div>
    </div>
  );
}
