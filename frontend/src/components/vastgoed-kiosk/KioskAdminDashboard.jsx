import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, CreditCard, Home, Plus, Pencil, Trash2, 
  ArrowLeft, DollarSign, Loader2, Settings, ExternalLink,
  Copy, Check
} from 'lucide-react';
import axios from 'axios';

// Local API
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
  const [editingItem, setEditingItem] = useState(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] py-4 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/vastgoed')} className="text-[#64748b] hover:text-[#0f172a]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#0f172a]">{company?.name}</h1>
                <p className="text-sm text-[#64748b]">Admin Dashboard</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyKioskUrl}
              className="flex items-center gap-2 px-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-sm hover:bg-[#f1f5f9]"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              Kopieer Kiosk URL
            </button>
            <button
              onClick={() => navigate(`/vastgoed/${company?.company_id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm hover:bg-[#ea580c]"
            >
              <ExternalLink className="w-4 h-4" />
              Open Kiosk
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Building2 },
            { id: 'apartments', label: 'Appartementen', icon: Home },
            { id: 'tenants', label: 'Huurders', icon: Users },
            { id: 'payments', label: 'Betalingen', icon: CreditCard },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id 
                  ? 'bg-[#f97316] text-white' 
                  : 'bg-white text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Home} label="Appartementen" value={dashboard.total_apartments} color="blue" />
            <StatCard icon={Users} label="Actieve Huurders" value={dashboard.total_tenants} color="green" />
            <StatCard icon={DollarSign} label="Openstaand" value={formatSRD(dashboard.total_outstanding)} color="red" />
            <StatCard icon={CreditCard} label="Ontvangen (maand)" value={formatSRD(dashboard.total_received_month)} color="orange" />
          </div>
        )}

        {/* Apartments Tab */}
        {activeTab === 'apartments' && (
          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center">
              <h2 className="font-semibold text-[#0f172a]">Appartementen ({apartments.length})</h2>
              <button
                onClick={() => { setEditingItem(null); setShowApartmentModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm hover:bg-[#ea580c]"
              >
                <Plus className="w-4 h-4" />
                Nieuw Appartement
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Nummer</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Omschrijving</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Huur</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-[#64748b]">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {apartments.map(apt => (
                    <tr key={apt.apartment_id} className="border-t border-[#e2e8f0]">
                      <td className="p-4 font-medium">{apt.number}</td>
                      <td className="p-4 text-[#64748b]">{apt.description || '-'}</td>
                      <td className="p-4">{formatSRD(apt.monthly_rent)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          apt.status === 'occupied' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {apt.status === 'occupied' ? 'Bewoond' : 'Beschikbaar'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => { setEditingItem(apt); setShowApartmentModal(true); }}
                          className="text-[#64748b] hover:text-[#f97316] p-1"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center">
              <h2 className="font-semibold text-[#0f172a]">Huurders ({tenants.length})</h2>
              <button
                onClick={() => { setEditingItem(null); setShowTenantModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm hover:bg-[#ea580c]"
              >
                <Plus className="w-4 h-4" />
                Nieuwe Huurder
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Naam</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Appt</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Code</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Openstaand</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-[#64748b]">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.tenant_id} className="border-t border-[#e2e8f0]">
                      <td className="p-4 font-medium">{t.name}</td>
                      <td className="p-4">{t.apartment_number}</td>
                      <td className="p-4 font-mono text-sm">{t.tenant_code}</td>
                      <td className="p-4">
                        <span className={t.outstanding_rent > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatSRD(t.outstanding_rent)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.status === 'active' ? 'Actief' : 'Inactief'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => { setEditingItem(t); setShowTenantModal(true); }}
                          className="text-[#64748b] hover:text-[#f97316] p-1"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="p-4 border-b border-[#e2e8f0]">
              <h2 className="font-semibold text-[#0f172a]">Betalingsgeschiedenis ({payments.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Datum</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Kwitantie</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Huurder</th>
                    <th className="text-left p-4 text-sm font-medium text-[#64748b]">Type</th>
                    <th className="text-right p-4 text-sm font-medium text-[#64748b]">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.payment_id} className="border-t border-[#e2e8f0]">
                      <td className="p-4 text-sm">
                        {new Date(p.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="p-4 font-mono text-sm">{p.kwitantie_nummer}</td>
                      <td className="p-4">{p.tenant_name}</td>
                      <td className="p-4 capitalize">{p.payment_type.replace('_', ' ')}</td>
                      <td className="p-4 text-right font-medium text-green-600">
                        {formatSRD(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Apartment Modal */}
      {showApartmentModal && (
        <ApartmentModal
          apartment={editingItem}
          onClose={() => setShowApartmentModal(false)}
          onSave={() => { setShowApartmentModal(false); loadData(); }}
          token={token}
        />
      )}

      {/* Tenant Modal */}
      {showTenantModal && (
        <TenantModal
          tenant={editingItem}
          apartments={apartments}
          onClose={() => setShowTenantModal(false)}
          onSave={() => { setShowTenantModal(false); loadData(); }}
          token={token}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600'
  };
  
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-[#64748b] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
    </div>
  );
}

// Apartment Modal
function ApartmentModal({ apartment, onClose, onSave, token }) {
  const [number, setNumber] = useState(apartment?.number || '');
  const [description, setDescription] = useState(apartment?.description || '');
  const [monthlyRent, setMonthlyRent] = useState(apartment?.monthly_rent || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
      setError(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold mb-4">{apartment ? 'Bewerk' : 'Nieuw'} Appartement</h3>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nummer *</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="2 slaapkamers, balkon"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maandhuur (SRD)</label>
            <input
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">
              Annuleren
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 bg-[#f97316] text-white rounded-xl disabled:opacity-50"
            >
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tenant Modal
function TenantModal({ tenant, apartments, onClose, onSave, token }) {
  const [name, setName] = useState(tenant?.name || '');
  const [apartmentId, setApartmentId] = useState(tenant?.apartment_id || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [telefoon, setTelefoon] = useState(tenant?.telefoon || '');
  const [monthlyRent, setMonthlyRent] = useState(tenant?.monthly_rent || 0);
  const [depositRequired, setDepositRequired] = useState(tenant?.deposit_required || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { 
        name, 
        apartment_id: apartmentId,
        email: email || null,
        telefoon: telefoon || null,
        monthly_rent: parseFloat(monthlyRent),
        deposit_required: parseFloat(depositRequired)
      };
      
      if (tenant) {
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, data, { headers });
      } else {
        await axios.post(`${API}/admin/tenants`, data, { headers });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  const availableApartments = apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{tenant ? 'Bewerk' : 'Nieuwe'} Huurder</h3>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Naam *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Appartement *</label>
            <select
              value={apartmentId}
              onChange={(e) => setApartmentId(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl"
            >
              <option value="">Selecteer...</option>
              {availableApartments.map(a => (
                <option key={a.apartment_id} value={a.apartment_id}>{a.number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefoon</label>
            <input
              type="tel"
              value={telefoon}
              onChange={(e) => setTelefoon(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maandhuur (SRD)</label>
            <input
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Borgsom vereist (SRD)</label>
            <input
              type="number"
              value={depositRequired}
              onChange={(e) => setDepositRequired(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">
              Annuleren
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 bg-[#f97316] text-white rounded-xl disabled:opacity-50"
            >
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
