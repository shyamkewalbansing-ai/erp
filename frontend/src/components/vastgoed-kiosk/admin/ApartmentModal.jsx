import { useState } from 'react';
import { API, axios } from './utils';

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
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6">
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



export default ApartmentModal;
