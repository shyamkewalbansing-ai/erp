import { useState, useEffect } from 'react';
import { MapPin, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { API, axios } from './utils';

function LocationsTab({ token, apartments = [], onRefresh }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {obj} = edit

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/locations`, { headers: { Authorization: `Bearer ${token}` } });
      setLocations(r.data || []);
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, [token]);

  const handleDelete = async (locationId) => {
    const linkedCount = apartments.filter(a => a.location_id === locationId).length;
    const msg = linkedCount > 0
      ? `Deze locatie heeft ${linkedCount} gekoppelde appartement(en). Weet u zeker dat u wilt verwijderen? De appartementen blijven bestaan maar worden ontkoppeld.`
      : 'Weet u zeker dat u deze locatie wilt verwijderen?';
    if (!window.confirm(msg)) return;
    try {
      await axios.delete(`${API}/admin/locations/${locationId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchLocations();
      if (onRefresh) onRefresh();
    } catch { alert('Verwijderen mislukt'); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <MapPin className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-slate-900">Locaties</h2>
          <span className="text-xs text-slate-400">({locations.length})</span>
        </div>
        <button
          onClick={() => setEditing({})}
          data-testid="add-location-btn"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nieuwe Locatie</span>
          <span className="sm:hidden">Nieuw</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Laden...</div>
      ) : locations.length === 0 ? (
        <div className="p-8 text-center">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nog geen locaties aangemaakt.</p>
          <p className="text-slate-400 text-xs mt-1">Maak locaties aan om appartementen te groeperen per gebouw/adres.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full min-w-[500px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Naam</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Adres</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartementen</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const aptCount = apartments.filter(a => a.location_id === loc.location_id).length;
                  return (
                    <tr key={loc.location_id} className="border-t border-slate-100" data-testid={`location-row-${loc.location_id}`}>
                      <td className="p-4 font-bold text-slate-900">{loc.name}</td>
                      <td className="p-4 text-slate-500">{loc.address || '-'}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-600 rounded-full px-2.5 py-1">
                          <Building2 className="w-3 h-3" /> {aptCount}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditing(loc)} className="text-slate-400 hover:text-orange-500 p-1" data-testid={`edit-location-${loc.location_id}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(loc.location_id)} className="text-slate-400 hover:text-red-500 p-1" data-testid={`delete-location-${loc.location_id}`}>
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
          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {locations.map(loc => {
              const aptCount = apartments.filter(a => a.location_id === loc.location_id).length;
              return (
                <div key={loc.location_id} className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{loc.name}</p>
                    {loc.address && <p className="text-[11px] text-slate-400 truncate">{loc.address}</p>}
                    <p className="text-[11px] text-orange-600 font-bold mt-0.5">{aptCount} appt.</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => setEditing(loc)} className="text-slate-400 hover:text-orange-500 p-2"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(loc.location_id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editing && (
        <LocationModal
          location={editing.location_id ? editing : null}
          token={token}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); fetchLocations(); if (onRefresh) onRefresh(); }}
        />
      )}
    </div>
  );
}

function LocationModal({ location, token, onClose, onSave }) {
  const [name, setName] = useState(location?.name || '');
  const [address, setAddress] = useState(location?.address || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { name: name.trim(), address: address.trim() };
      if (location) {
        await axios.put(`${API}/admin/locations/${location.location_id}`, data, { headers });
      } else {
        await axios.post(`${API}/admin/locations`, data, { headers });
      }
      onSave();
    } catch { alert('Opslaan mislukt'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{location ? 'Bewerk' : 'Nieuwe'} Locatie</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Naam *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
              data-testid="location-name-input"
              className="w-full px-4 py-3 border rounded-xl" placeholder="bijv. Hoofdgebouw" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adres</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              data-testid="location-address-input"
              className="w-full px-4 py-3 border rounded-xl" placeholder="bijv. Heerenstraat 12" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">Annuleren</button>
            <button type="submit" disabled={saving} data-testid="location-submit-btn"
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LocationsTab;
