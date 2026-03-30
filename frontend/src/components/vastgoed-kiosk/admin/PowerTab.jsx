import { useState, useEffect } from 'react';
import { Plus, Loader2, Zap, AlertTriangle } from 'lucide-react';
import { API, axios } from './utils';

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










export default PowerTab;
