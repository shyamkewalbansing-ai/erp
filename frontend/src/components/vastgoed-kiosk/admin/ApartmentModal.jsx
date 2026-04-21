import { useState, useEffect } from 'react';
import { API, axios } from './utils';

function ApartmentModal({ apartment, onClose, onSave, token }) {
  const [number, setNumber] = useState(apartment?.number || '');
  const [description, setDescription] = useState(apartment?.description || '');
  const [monthlyRent, setMonthlyRent] = useState(apartment?.monthly_rent || 0);
  const [currency, setCurrency] = useState((apartment?.currency || 'SRD').toUpperCase());
  const [locationId, setLocationId] = useState(apartment?.location_id || '');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/locations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLocations(r.data || []))
      .catch(() => setLocations([]));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = {
        number,
        description,
        monthly_rent: parseFloat(monthlyRent),
        currency,
        location_id: locationId || null,
      };
      if (apartment) {
        await axios.put(`${API}/admin/apartments/${apartment.apartment_id}`, data, { headers });
      } else {
        await axios.post(`${API}/admin/apartments`, data, { headers });
      }
      onSave();
    } catch {
      alert('Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6">
        <h3 className="text-xl font-bold mb-4">{apartment ? 'Bewerk' : 'Nieuw'} Appartement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nummer *</label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} required
              data-testid="apt-number-input"
              className="w-full px-4 py-3 border rounded-xl" placeholder="A1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Locatie</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
              data-testid="apt-location-select"
              className="w-full px-4 py-3 border rounded-xl bg-white">
              <option value="">— Geen locatie —</option>
              {locations.map(loc => (
                <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
              ))}
            </select>
            {locations.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">Maak eerst een locatie aan onder het &quot;Locaties&quot; tabblad.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Omschrijving</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl" placeholder="2 slaapkamers" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maandhuur</label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                data-testid="apt-currency-select"
                className="w-28 px-3 py-3 border rounded-xl bg-white font-semibold text-slate-700"
              >
                <option value="SRD">SRD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                data-testid="apt-monthly-rent-input"
                className="flex-1 px-4 py-3 border rounded-xl"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Huurders gekoppeld aan dit appartement administreren hun huur in <span className="font-semibold">{currency}</span>.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">Annuleren</button>
            <button type="submit" disabled={loading} data-testid="apt-submit-btn"
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApartmentModal;
