import { useState } from 'react';
import { API, axios } from './utils';

function LeaseModal({ lease, tenants, apartments, onClose, onSave, token }) {
  const [tenantId, setTenantId] = useState(lease?.tenant_id || '');
  const [apartmentId, setApartmentId] = useState(lease?.apartment_id || '');
  const [startDate, setStartDate] = useState(lease?.start_date || '');
  const [endDate, setEndDate] = useState(lease?.end_date || '');
  const [monthlyRent, setMonthlyRent] = useState(lease?.monthly_rent || 0);
  const [voorwaarden, setVoorwaarden] = useState(lease?.voorwaarden || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (lease) {
        await axios.put(`${API}/admin/leases/${lease.lease_id}`, {
          start_date: startDate, end_date: endDate, monthly_rent: parseFloat(monthlyRent), voorwaarden
        }, { headers });
      } else {
        await axios.post(`${API}/admin/leases`, {
          tenant_id: tenantId, apartment_id: apartmentId,
          start_date: startDate, end_date: endDate, monthly_rent: parseFloat(monthlyRent), voorwaarden
        }, { headers });
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill apartment when tenant selected
  const handleTenantChange = (tid) => {
    setTenantId(tid);
    const t = tenants.find(x => x.tenant_id === tid);
    if (t) {
      setApartmentId(t.apartment_id);
      setMonthlyRent(t.monthly_rent || 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{lease ? 'Huurovereenkomst Bewerken' : 'Nieuwe Huurovereenkomst'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!lease && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Huurder</label>
                <select value={tenantId} onChange={e => handleTenantChange(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  data-testid="lease-tenant-select">
                  <option value="">Selecteer huurder...</option>
                  {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name} - {t.apartment_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appartement</label>
                <select value={apartmentId} onChange={e => setApartmentId(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  data-testid="lease-apartment-select">
                  <option value="">Selecteer appartement...</option>
                  {apartments.map(a => <option key={a.apartment_id} value={a.apartment_id}>{a.number} - {a.description}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                data-testid="lease-start-date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Einddatum</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                data-testid="lease-end-date" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maandhuur (SRD)</label>
            <input type="number" step="0.01" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              data-testid="lease-monthly-rent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Voorwaarden</label>
            <textarea value={voorwaarden} onChange={e => setVoorwaarden(e.target.value)} rows={4} placeholder="Aanvullende voorwaarden van de huurovereenkomst..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
              data-testid="lease-voorwaarden" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              Annuleren
            </button>
            <button type="submit" disabled={loading} data-testid="lease-submit"
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
              {loading ? 'Opslaan...' : lease ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




export default LeaseModal;
