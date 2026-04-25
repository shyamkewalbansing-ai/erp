import { useState, useEffect } from 'react';
import { Banknote } from 'lucide-react';
import { API, axios } from './utils';
import MobileModalShell from './MobileModalShell';

const NL_MONTHS_FULL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

export default function VoorschotModal({ token, employee, year, month, onClose, onSaved }) {
  const periodLabel = `${NL_MONTHS_FULL[month]} ${year}`;
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [voorschotten, setVoorschotten] = useState([]);
  const [saving, setSaving] = useState(false);

  const totalVoorschot = voorschotten.reduce((s, v) => s + (v.amount || 0), 0);
  const remaining = Math.max(0, (employee?.maandloon || 0) - totalVoorschot);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${API}/admin/employees/${employee.employee_id}/voorschotten`, {
          params: { period_label: periodLabel },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setVoorschotten(r.data || []);
      } catch { /* skip */ }
    })();
    return () => { cancelled = true; };
  }, [employee?.employee_id, periodLabel, token]);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      await axios.post(`${API}/admin/employees/${employee.employee_id}/voorschot`, {
        amount: amt,
        period_label: periodLabel,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      alert('Voorschot mislukt: ' + (e?.response?.data?.detail || e.message));
      setSaving(false);
    }
  };

  const removeVoorschot = async (entryId) => {
    if (!window.confirm('Voorschot verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/employees/${employee.employee_id}/voorschot/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVoorschotten(prev => prev.filter(v => v.entry_id !== entryId));
      if (onSaved) onSaved();
    } catch (e) {
      alert('Verwijderen mislukt');
    }
  };

  return (
    <MobileModalShell
      title="Voorschot uitbetalen"
      subtitle={`${employee?.name} · ${periodLabel}`}
      onClose={() => !saving && onClose()}
      onSubmit={submit}
      submitLabel={`Uitbetalen ${amount ? `SRD ${parseFloat(amount).toLocaleString('nl-NL')}` : ''}`}
      loading={saving}
      testIdPrefix="voorschot-modal"
      maxWidth="sm:max-w-md"
    >
      {/* Summary */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold">Maandloon</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">SRD {(employee?.maandloon || 0).toLocaleString('nl-NL')}</p>
        </div>
        <div className="border-x border-orange-200">
          <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold">Voorschot</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">SRD {totalVoorschot.toLocaleString('nl-NL')}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold">Open</p>
          <p className={`text-sm font-black mt-0.5 ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>SRD {remaining.toLocaleString('nl-NL')}</p>
        </div>
      </div>

      {/* Form */}
      <div>
        <label className="block text-xs font-medium mb-1">Bedrag *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">SRD</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            data-testid="voorschot-amount-input"
            className="w-full pl-12 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
            placeholder="0,00"
            autoFocus
          />
        </div>
        {remaining > 0 && !amount && (
          <button
            type="button"
            onClick={() => setAmount(String(remaining))}
            className="mt-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
            data-testid="voorschot-fill-remaining"
          >
            Vul resterend bedrag (SRD {remaining.toLocaleString('nl-NL')})
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Betaalmethode *</label>
        <div className="grid grid-cols-2 gap-2">
          {[{v:'cash',l:'Kas'},{v:'bank',l:'Bank'}].map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setPaymentMethod(opt.v)}
              data-testid={`voorschot-method-${opt.v}`}
              className={`py-2.5 rounded-xl text-sm font-bold border ${paymentMethod === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Datum</label>
        <input
          type="date"
          value={paymentDate}
          onChange={e => setPaymentDate(e.target.value)}
          className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Notitie (optioneel)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={120}
          className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
          placeholder="bv. medische kosten"
        />
      </div>

      {/* Existing voorschotten */}
      {voorschotten.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-orange-500" />
            Eerdere voorschotten — {periodLabel}
          </p>
          <div className="space-y-1.5">
            {voorschotten.map(v => (
              <div key={v.entry_id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2" data-testid={`voorschot-row-${v.entry_id}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">SRD {(v.amount || 0).toLocaleString('nl-NL')}</p>
                  {v.created_at && (
                    <p className="text-[10px] text-slate-500">
                      {new Date(v.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })} · {v.payment_method === 'cash' ? 'Kas' : 'Bank'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeVoorschot(v.entry_id)}
                  className="text-rose-400 hover:text-rose-600 text-[11px] font-medium"
                  data-testid={`voorschot-delete-${v.entry_id}`}
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </MobileModalShell>
  );
}
