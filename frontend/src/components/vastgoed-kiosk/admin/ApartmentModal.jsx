import { useState, useEffect } from 'react';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';

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

  const handleSubmit = async () => {
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
    <MobileModalShell
      title={`${apartment ? 'Bewerk' : 'Nieuw'} Appartement`}
      subtitle={apartment?.number}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel="Opslaan"
      testIdPrefix="apt-modal"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Nummer *</label>
        <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} required
          data-testid="apt-number-input"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" placeholder="A1" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Locatie</label>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
          data-testid="apt-location-select"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-orange-400">
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
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" placeholder="2 slaapkamers" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Maandhuur</label>
        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            data-testid="apt-currency-select"
            className="w-24 px-2 py-3 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 text-sm focus:outline-none focus:border-orange-400"
          >
            <option value="SRD">SRD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
            data-testid="apt-monthly-rent-input"
            className="flex-1 min-w-0 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
            placeholder="0.00"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Huurders gekoppeld aan dit appartement administreren hun huur in <span className="font-semibold">{currency}</span>.
        </p>
      </div>
    </MobileModalShell>
  );
}

export default ApartmentModal;
