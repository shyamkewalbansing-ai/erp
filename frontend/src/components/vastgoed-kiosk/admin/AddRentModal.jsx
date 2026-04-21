import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { API, axios } from './utils';

function AddRentModal({ tenant, onClose, onSave, token }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('rent');
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');

  // Reset amount when type changes
  useEffect(() => {
    if (type === 'rent') {
      setAmount(tenant?.monthly_rent || 0);
    } else if (type === 'service') {
      setAmount('');
    } else if (type === 'fine') {
      setAmount('');
    } else if (type === 'internet') {
      setAmount(tenant?.internet_outstanding || tenant?.internet_cost || 0);
    } else if (type === 'payment') {
      setAmount('');
    }
  }, [type, tenant]);

  // Calculate next month label + pretty-format current billed-through
  const billedThrough = tenant?.rent_billed_through || '';
  let nextMonthLabel = '';
  let billedThroughLabel = '';
  if (billedThrough) {
    const [y, m] = billedThrough.split('-');
    const year = parseInt(y);
    const mIdx = parseInt(m) - 1;        // 1-indexed → JS 0-indexed
    const billedDate = new Date(year, mIdx);
    const nextDate = new Date(year, mIdx + 1);   // billed_through + 1 month
    billedThroughLabel = billedDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    nextMonthLabel = nextDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  } else {
    // New tenant without billed_through: default to current real-world month
    const now = new Date();
    nextMonthLabel = now.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    billedThroughLabel = '';
  }

  const totalDebt = (tenant?.outstanding_rent || 0) + (tenant?.service_costs || 0) + (tenant?.fines || 0) + (tenant?.internet_outstanding || tenant?.internet_cost || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (type === 'rent') {
        await axios.post(`${API}/admin/tenants/${tenant.tenant_id}/advance-month`, {}, { headers });
        onSave();
      } else if (type === 'service' || type === 'fine' || type === 'internet') {
        const update = {};
        if (type === 'service') {
          update.service_costs = (tenant.service_costs || 0) + parseFloat(amount);
        } else if (type === 'internet') {
          update.internet_outstanding = (tenant.internet_outstanding || 0) + parseFloat(amount);
        } else {
          update.fines = (tenant.fines || 0) + parseFloat(amount);
        }
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, update, { headers });
        onSave();
      } else if (type === 'payment') {
        // Register manual payment
        const payAmount = parseFloat(amount);
        if (!payAmount || payAmount <= 0) {
          alert('Voer een geldig bedrag in');
          setLoading(false);
          return;
        }
        // Determine what we're paying off
        let payType = 'rent';
        if (tenant.outstanding_rent > 0) payType = 'rent';
        else if (tenant.service_costs > 0) payType = 'service_costs';
        else if (tenant.fines > 0) payType = 'fines';

        const res = await axios.post(`${API}/admin/payments/register`, {
          tenant_id: tenant.tenant_id,
          amount: payAmount,
          payment_type: payType,
          payment_method: paymentMethod,
          description: description || 'Handmatige betaling'
        }, { headers });
        setPaymentResult(res.data);
        // Auto-print via bonprinter
        const PRINT_URL = 'http://localhost:5555';
        const printData = {
          company_name: 'Vastgoed Beheer',
          receipt_number: res.data.kwitantie_nummer || '',
          date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          tenant_name: res.data.tenant_name || tenant?.name || '',
          apartment: `${res.data.apartment_number || tenant?.apartment_number || ''}`,
          payment_type: { rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[res.data.payment_type] || res.data.payment_type,
          amount: Number(res.data.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
          total: Number(res.data.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
          payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' }[res.data.payment_method] || 'Contant',
          remaining_total: Number((res.data.remaining_rent || 0) + (res.data.remaining_service || 0) + (res.data.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2 })
        };
        try {
          const hc = await fetch(`${PRINT_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
          if (hc?.ok) {
            await fetch(`${PRINT_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) });
          }
        } catch {}
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Actie mislukt');
    } finally {
      setLoading(false);
    }
  };

  // Payment success screen
  if (paymentResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-orange-700 mb-2">Betaling Geregistreerd!</h3>
          <p className="text-slate-600 mb-1">Kwitantie: <span className="font-bold">{paymentResult.kwitantie_nummer}</span></p>
          <p className="text-slate-600 mb-1">Bedrag: <span className="font-bold">SRD {paymentResult.amount?.toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span></p>
          <p className="text-slate-600 mb-4">{tenant.name} - Appt. {tenant.apartment_number}</p>
          {paymentResult.whatsapp_sent && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
              <p className="text-sm text-orange-700 font-medium">WhatsApp bon automatisch verstuurd</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-slate-500 mb-1">Resterende saldi na betaling:</p>
            <p className="text-sm text-slate-700">Huur: SRD {(paymentResult.remaining_rent || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>
            <p className="text-sm text-slate-700">Servicekosten: SRD {(paymentResult.remaining_service || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>
            <p className="text-sm text-slate-700">Boetes: SRD {(paymentResult.remaining_fines || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={async () => {
                const PRINT_URL = 'http://localhost:5555';
                const printData = {
                  company_name: 'Vastgoed Beheer',
                  receipt_number: paymentResult.kwitantie_nummer || '',
                  date: new Date(paymentResult.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  time: new Date(paymentResult.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
                  tenant_name: paymentResult.tenant_name || tenant?.name || '',
                  apartment: `${paymentResult.apartment_number || tenant?.apartment_number || ''}`,
                  payment_type: { rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[paymentResult.payment_type] || paymentResult.payment_type,
                  amount: Number(paymentResult.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
                  total: Number(paymentResult.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
                  payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' }[paymentResult.payment_method] || 'Contant',
                  remaining_total: Number((paymentResult.remaining_rent || 0) + (paymentResult.remaining_service || 0) + (paymentResult.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2 })
                };
                try {
                  const hc = await fetch(`${PRINT_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
                  if (hc?.ok) { await fetch(`${PRINT_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) }); }
                  else { alert('Bonprinter niet bereikbaar'); }
                } catch { alert('Bonprinter niet bereikbaar'); }
              }}
              className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-slate-50">
              Opnieuw Printen
            </button>
            <button onClick={() => { setPaymentResult(null); onSave(); }}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-medium">
              Sluiten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">Bedrag Toevoegen / Betaling</h3>
        <p className="text-slate-500 mb-4">{tenant.name} - Appt. {tenant.apartment_number}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'rent', label: 'Maandhuur' },
                { id: 'service', label: 'Servicekosten' },
                { id: 'fine', label: 'Boete' },
                { id: 'internet', label: 'Internet' },
                { id: 'payment', label: 'Betaling Registreren' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    type === t.id
                      ? t.id === 'payment' ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'rent' ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 mb-2">
                Gefactureerd t/m: <span className="font-bold">{billedThroughLabel || '-'}</span>
              </p>
              <p className="text-sm text-slate-700 mb-2">
                Openstaand saldo: <span className="font-bold text-red-600">SRD {(tenant.outstanding_rent || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span>
              </p>
              <div className="border-t border-orange-200 pt-2 mt-2">
                <p className="text-sm text-slate-700">
                  Volgende te factureren maand: <span className="font-bold text-orange-700">{nextMonthLabel}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Door te bevestigen wordt <span className="font-semibold">{nextMonthLabel}</span> aan het openstaand saldo toegevoegd.
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  Maandhuur: <span className="font-bold">SRD {(tenant.monthly_rent || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span>
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  Nieuw totaal: SRD {((tenant.outstanding_rent || 0) + (tenant.monthly_rent || 0)).toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          ) : type === 'payment' ? (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm font-bold text-orange-800 mb-2">Openstaande schuld</p>
                {tenant.outstanding_rent > 0 && <p className="text-sm text-slate-700">Huur: SRD {(tenant.outstanding_rent).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                {tenant.service_costs > 0 && <p className="text-sm text-slate-700">Servicekosten: SRD {(tenant.service_costs).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                {tenant.fines > 0 && <p className="text-sm text-slate-700">Boetes: SRD {(tenant.fines).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                {(tenant.internet_outstanding || tenant.internet_cost || 0) > 0 && <p className="text-sm text-slate-700">Internet: SRD {(tenant.internet_outstanding || tenant.internet_cost || 0).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</p>}
                <p className="text-sm font-bold text-slate-900 mt-1 border-t border-orange-200 pt-1">
                  Totaal: SRD {totalDebt.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Betaalmethode</label>
                <div className="flex gap-2">
                  {[{id:'cash',label:'Contant'},{id:'bank',label:'Bank'},{id:'pin',label:'PIN'}].map(m => (
                    <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${paymentMethod === m.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bedrag (SRD)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" className="w-full px-4 py-3 border rounded-xl text-2xl font-bold text-center" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Omschrijving (optioneel)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Handmatige betaling" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <p className="text-xs text-slate-400">Kwitantie wordt automatisch geprint en WhatsApp bon verstuurd</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Bedrag (SRD)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className="w-full px-4 py-3 border rounded-xl text-2xl font-bold text-center" required />
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">
              Annuleren
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-3 text-white rounded-xl disabled:opacity-50 ${type === 'payment' ? 'bg-orange-600' : 'bg-orange-500'}`}>
              {loading ? 'Bezig...' : type === 'rent' ? `Huur ${nextMonthLabel} toevoegen` : type === 'payment' ? 'Betaling Registreren' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default AddRentModal;
