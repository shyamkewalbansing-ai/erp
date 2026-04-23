import { useState } from 'react';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';

function LeaseModal({ lease, tenants, apartments, onClose, onSave, token }) {
  const [tenantId, setTenantId] = useState(lease?.tenant_id || '');
  const [apartmentId, setApartmentId] = useState(lease?.apartment_id || '');
  const [startDate, setStartDate] = useState(lease?.start_date || '');
  const [endDate, setEndDate] = useState(lease?.end_date || '');
  const [monthlyRent, setMonthlyRent] = useState(lease?.monthly_rent || 0);
  const [voorwaarden, setVoorwaarden] = useState(lease?.voorwaarden || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400";

  return (
    <MobileModalShell
      title={lease ? 'Huurovereenkomst Bewerken' : 'Nieuwe Huurovereenkomst'}
      subtitle={lease ? `${lease.tenant_name} · ${lease.apartment_number}` : 'Vul onderstaande velden in'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={lease ? 'Bijwerken' : 'Aanmaken'}
      testIdPrefix="lease-modal"
    >
      {!lease && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Huurder</label>
            <select value={tenantId} onChange={e => handleTenantChange(e.target.value)} required
              className={inputCls + ' bg-white'}
              data-testid="lease-tenant-select">
              <option value="">Selecteer huurder...</option>
              {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name} - {t.apartment_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Appartement</label>
            <select value={apartmentId} onChange={e => setApartmentId(e.target.value)} required
              className={inputCls + ' bg-white'}
              data-testid="lease-apartment-select">
              <option value="">Selecteer appartement...</option>
              {apartments.map(a => <option key={a.apartment_id} value={a.apartment_id}>{a.number} - {a.description}</option>)}
            </select>
          </div>
        </>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
            className={inputCls} data-testid="lease-start-date" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Einddatum</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
            className={inputCls} data-testid="lease-end-date" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Maandhuur (SRD)</label>
        <input type="number" step="0.01" inputMode="decimal" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} required
          className={inputCls} data-testid="lease-monthly-rent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Voorwaarden</label>
        <textarea value={voorwaarden} onChange={e => setVoorwaarden(e.target.value)} rows={4} placeholder="Aanvullende voorwaarden van de huurovereenkomst..."
          className={inputCls + ' resize-none'} data-testid="lease-voorwaarden" />
      </div>
    </MobileModalShell>
  );
}


export default LeaseModal;
