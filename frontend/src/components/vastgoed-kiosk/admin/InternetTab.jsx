import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Wifi, Power, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';

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
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">Internet Plannen</h3>
          <button
            onClick={() => { setEditPlan(null); setPlanName(''); setPlanSpeed(''); setPlanPrice(''); setShowPlanModal(true); }}
            data-testid="internet-add-plan"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nieuw plan</span><span className="sm:hidden">Nieuw</span>
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
        {/* Desktop tabel */}
        <div className="overflow-x-auto hidden md:block">
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
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {connections.map(c => (
            <div key={c.tenant_id} className="p-3" data-testid={`internet-conn-mobile-${c.tenant_id}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">App. {c.apartment_number}</p>
                </div>
                {c.internet_cost > 0 && (
                  <p className="font-bold text-slate-900 text-sm whitespace-nowrap ml-2">{formatSRD(c.internet_cost)}<span className="text-[10px] text-slate-400 font-normal">/mnd</span></p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                {c.internet_plan_name ? (
                  <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-orange-100 text-orange-700 truncate">{c.internet_plan_name}</span>
                ) : (
                  <span className="text-slate-400 text-[11px]">Geen plan</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setAssignModal(c)}
                    data-testid={`internet-assign-mobile-${c.tenant_id}`}
                    className="px-2.5 py-1.5 text-[11px] bg-slate-100 active:bg-slate-200 rounded-lg font-bold"
                  >
                    {c.internet_plan_id ? 'Wijzigen' : 'Toewijzen'}
                  </button>
                  {c.internet_plan_id && (
                    <button
                      onClick={() => handleUnassign(c.tenant_id)}
                      className="p-1.5 bg-red-50 active:bg-red-100 text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenda Router Management */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Router Beheer (Tenda AC1200)</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">Internet aan/uit per huurder, verbonden apparaten</p>
          </div>
          <button
            onClick={() => setShowRouterModal(true)}
            data-testid="tenda-add-router"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Router toevoegen</span><span className="sm:hidden">Router</span>
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
        <MobileModalShell
          title={editPlan ? 'Plan Bewerken' : 'Nieuw Internet Plan'}
          subtitle={editPlan?.name}
          onClose={() => setShowPlanModal(false)}
          onSubmit={handleSavePlan}
          loading={saving}
          submitLabel="Opslaan"
          testIdPrefix="plan-modal"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Naam *</label>
            <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
              data-testid="plan-name" placeholder="Bijv. Basis" className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Snelheid *</label>
            <input type="text" value={planSpeed} onChange={e => setPlanSpeed(e.target.value)}
              data-testid="plan-speed" placeholder="Bijv. 25 Mbps" className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prijs per maand (SRD) *</label>
            <input type="number" inputMode="decimal" value={planPrice} onChange={e => setPlanPrice(e.target.value)}
              data-testid="plan-price" placeholder="0.00" min="0" step="0.01" className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </MobileModalShell>
      )}

      {/* Assign Plan Modal */}
      {assignModal && (
        <MobileModalShell
          title={`Internet — ${assignModal.name}`}
          subtitle={`App. ${assignModal.apartment_number}`}
          onClose={() => setAssignModal(null)}
          hideFooter={true}
          testIdPrefix="assign-modal"
        >
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
        </MobileModalShell>
      )}

      {/* Add Router Modal */}
      {showRouterModal && (
        <MobileModalShell
          title="Tenda Router Toevoegen"
          subtitle="Koppel router aan huurder"
          onClose={() => setShowRouterModal(false)}
          onSubmit={handleAddRouter}
          loading={saving}
          submitLabel="Toevoegen"
          testIdPrefix="router-modal"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Huurder *</label>
            <select value={routerTenantId} onChange={e => setRouterTenantId(e.target.value)}
              data-testid="router-tenant-select"
              className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400">
              <option value="">Selecteer huurder...</option>
              {tenants.filter(t => t.status === 'active' && !routers.find(r => r.tenant_id === t.tenant_id)).map(t => (
                <option key={t.tenant_id} value={t.tenant_id}>{t.name} — {t.apartment_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Router IP-adres *</label>
            <input type="text" value={routerIp} onChange={e => setRouterIp(e.target.value)}
              data-testid="router-ip" placeholder="bijv. 192.168.1.1 of publiek IP" className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Wachtwoord *</label>
            <input type="password" value={routerPassword} onChange={e => setRouterPassword(e.target.value)}
              data-testid="router-password" placeholder="Router admin wachtwoord" className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Naam (optioneel)</label>
            <input type="text" value={routerName} onChange={e => setRouterName(e.target.value)}
              data-testid="router-name" placeholder="bijv. Router App. A1" className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </MobileModalShell>
      )}

      {/* Connected Devices Modal */}
      {deviceModal && (
        <MobileModalShell
          title="Verbonden Apparaten"
          subtitle={`${deviceModal.devices.length} apparaten online`}
          onClose={() => setDeviceModal(null)}
          hideFooter={true}
          testIdPrefix="devices-modal"
        >
          {deviceModal.devices.length === 0 ? (
            <p className="text-center text-slate-400 py-4">Geen apparaten verbonden</p>
          ) : (
            deviceModal.devices.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 text-sm truncate">{d.name || 'Onbekend apparaat'}</p>
                  <p className="text-xs text-slate-400 font-mono truncate">{d.mac}</p>
                </div>
                <span className="text-xs font-mono text-slate-500 flex-shrink-0 ml-2">{d.ip}</span>
              </div>
            ))
          )}
        </MobileModalShell>
      )}
    </div>
  );
}




export default InternetTab;
