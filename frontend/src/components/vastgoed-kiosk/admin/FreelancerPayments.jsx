import { useState, useEffect, useCallback } from 'react';
import { HandCoins, Receipt as ReceiptIcon, Trash2, Plus, Printer, Loader2, X, MessageCircle, Send } from 'lucide-react';
import { API, axios } from './utils';

function FreelancerPayments({ token, formatSRD, employees, onChange }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewPayment, setPreviewPayment] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [waSending, setWaSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/freelancer-payments`, { headers: { Authorization: `Bearer ${token}` } });
      setPayments(r.data || []);
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deze uitbetaling verwijderen? De kas-boeking wordt ook verwijderd.')) return;
    try {
      await axios.delete(`${API}/admin/freelancer-payments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      load();
      if (onChange) onChange();
    } catch { alert('Verwijderen mislukt'); }
  };

  const openReceipt = (payment) => {
    setPreviewPayment(payment);
  };

  const openPrintNewTab = async (payment) => {
    // Fetch authenticated, encrypted PDF and open in a new tab
    try {
      const r = await axios.get(
        `${API}/admin/freelancer-payments/${payment.payment_id}/receipt/pdf`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blobUrl = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(blobUrl, '_blank');
    } catch {
      alert('Kon PDF niet laden');
    }
  };

  useEffect(() => {
    if (!previewPayment) { setPreviewHtml(''); return; }
    setPreviewLoading(true);
    axios.get(`${API}/admin/freelancer-payments/${previewPayment.payment_id}/receipt?noprint=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPreviewHtml(r.data))
      .catch(() => setPreviewHtml('<p style="text-align:center;padding:40px;font-family:sans-serif">Kon kwitantie niet laden</p>'))
      .finally(() => setPreviewLoading(false));
  }, [previewPayment, token]);

  const handleSendWhatsApp = async () => {
    if (!previewPayment) return;
    if (!previewPayment.telefoon) {
      // Use wa.me fallback if no phone
      alert('Geen telefoonnummer geregistreerd. Voeg een telefoonnummer toe in de uitbetaling.');
      return;
    }
    setWaSending(true);
    try {
      await axios.post(`${API}/admin/freelancer-payments/${previewPayment.payment_id}/send-whatsapp`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('WhatsApp bericht verstuurd!');
    } catch (err) {
      alert('Versturen mislukt: ' + (err.response?.data?.detail || err.message));
    }
    setWaSending(false);
  };

  const handleShareWhatsAppLink = () => {
    if (!previewPayment) return;
    const phone = (previewPayment.telefoon || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Beste ${previewPayment.employee_name},\n\n` +
      `U heeft een uitbetaling ontvangen:\n` +
      `Bedrag: SRD ${Number(previewPayment.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}\n` +
      `Kwitantie: ${previewPayment.kwitantie_nummer}\n` +
      `Omschrijving: ${previewPayment.description || ''}`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-slate-900">Losse Uitbetalingen</h2>
          <span className="text-xs text-slate-400">({payments.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Totaal: <span className="font-bold text-slate-700">{formatSRD(total)}</span></span>
          <button
            onClick={() => setShowModal(true)}
            data-testid="new-freelancer-payment-btn"
            className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Uitbetaling</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" /></div>
      ) : payments.length === 0 ? (
        <div className="p-8 text-center">
          <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Nog geen losse uitbetalingen geregistreerd.</p>
          <p className="text-slate-400 text-xs mt-1">Registreer betalingen aan freelancers of aannemers met printbare kwitanties.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Kwitantie</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Ontvanger</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Omschrijving</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Afgetrokken van</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Verwerkt door</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.payment_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`fp-row-${p.payment_id}`}>
                    <td className="p-4 text-sm text-slate-600">{new Date(p.payment_date || p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4 text-sm font-mono text-orange-600">{p.kwitantie_nummer}</td>
                    <td className="p-4 font-bold text-slate-900">{p.employee_name}{p.functie && <span className="text-xs text-slate-400 font-normal block">{p.functie}</span>}{p.telefoon && <span className="text-[10px] text-green-600 font-normal block">{p.telefoon}</span>}</td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate">{p.description || '-'}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.payment_method === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        Van {p.payment_method === 'bank' ? 'Bank' : 'Kas'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{p.processed_by || '-'}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(p.amount)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openReceipt(p)} className="text-slate-400 hover:text-orange-500 p-1.5" title="Kwitantie afdrukken" data-testid={`fp-receipt-${p.payment_id}`}>
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.payment_id)} className="text-slate-400 hover:text-red-500 p-1.5" title="Verwijderen" data-testid={`fp-delete-${p.payment_id}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {payments.map(p => (
              <div key={p.payment_id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{p.employee_name}</p>
                    <p className="text-xs text-slate-400">{p.functie || ''}{p.functie ? ' · ' : ''}{new Date(p.payment_date || p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatSRD(p.amount)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[10px] text-orange-600 font-mono">{p.kwitantie_nummer}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.payment_method === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    Van {p.payment_method === 'bank' ? 'Bank' : 'Kas'}
                  </span>
                </div>
                {p.description && <p className="text-xs text-slate-500 mb-1">{p.description}</p>}
                {p.processed_by && <p className="text-[11px] text-slate-400 mb-2">Verwerkt door: <span className="text-slate-600 font-semibold">{p.processed_by}</span></p>}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-50">
                  <button onClick={() => openReceipt(p)} className="text-slate-400 hover:text-orange-500 p-1.5"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.payment_id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <FreelancerPaymentModal
          token={token}
          employees={employees}
          onClose={() => setShowModal(false)}
          onCreated={(payment) => {
            setShowModal(false);
            load();
            if (onChange) onChange();
            openReceipt(payment);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewPayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={() => setPreviewPayment(null)}>
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-[100dvh] sm:h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ReceiptIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Kwitantie {previewPayment.kwitantie_nummer}</h3>
              </div>
              <button onClick={() => setPreviewPayment(null)} data-testid="fp-preview-close" className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-slate-100 relative">
              {previewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laden...
                </div>
              ) : (
                <iframe srcDoc={previewHtml} title="Kwitantie" className="w-full h-full border-0 bg-white" data-testid="fp-preview-iframe" />
              )}
            </div>
            <div className="flex items-center gap-2 p-3 border-t border-slate-200 flex-shrink-0 bg-white flex-wrap" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <button onClick={() => setPreviewPayment(null)} className="px-3 py-2.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-sm font-medium">
                <X className="w-4 h-4 inline mr-1" /> Sluiten
              </button>
              <button onClick={handleShareWhatsAppLink} data-testid="fp-wa-share-btn"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold active:scale-95">
                <MessageCircle className="w-4 h-4" /> WhatsApp (handmatig)
              </button>
              {previewPayment.telefoon && (
                <button onClick={handleSendWhatsApp} disabled={waSending} data-testid="fp-wa-send-btn"
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95">
                  {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Verstuur direct
                </button>
              )}
              <button onClick={() => openPrintNewTab(previewPayment)} data-testid="fp-print-btn"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold active:scale-95">
                <Printer className="w-4 h-4" /> Afdrukken / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FreelancerPaymentModal({ token, employees, onClose, onCreated }) {
  const [employeeName, setEmployeeName] = useState('');
  const [functie, setFunctie] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!employeeName.trim() || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      const r = await axios.post(`${API}/admin/freelancer-payments`, {
        employee_name: employeeName.trim(),
        functie: functie.trim(),
        telefoon: telefoon.trim(),
        amount: parseFloat(amount),
        description,
        payment_method: method,
        payment_date: date,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onCreated(r.data);
    } catch { alert('Registreren mislukt'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
              <HandCoins className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Losse Uitbetaling</h3>
              <p className="text-xs text-slate-500">Registreer + printbare kwitantie</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Naam ontvanger *</label>
            <input type="text" value={employeeName} onChange={e => setEmployeeName(e.target.value)} required autoFocus
              data-testid="fp-name-input"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
              placeholder="bijv. Rakesh Jaglal" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Functie / Type werk</label>
            <input type="text" value={functie} onChange={e => setFunctie(e.target.value)}
              data-testid="fp-functie-input"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
              placeholder="bijv. Schilder, Loodgieter" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Telefoon (voor WhatsApp kwitantie)</label>
            <input type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)}
              data-testid="fp-telefoon-input"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
              placeholder="+597 8812345" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bedrag (SRD) *</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
              data-testid="fp-amount-input"
              className="w-full px-3 py-3 border border-slate-300 rounded-lg text-lg font-bold" placeholder="0.00" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Omschrijving</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              data-testid="fp-description-input"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
              placeholder="Bijv. Schilderwerk appt. A1, 3 dagen werk" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Uit betaald vanuit</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                data-testid="fp-method-select"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="cash">Kas (contant)</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Datum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>

          {/* Info box */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-slate-600">
            <p><strong className="text-orange-700">Info:</strong> Dit bedrag wordt als uitgave geboekt in <strong>Bank/Kas</strong> onder categorie &quot;freelancer&quot;. Uw saldo daalt met SRD {parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : '0,00'}.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
              Annuleren
            </button>
            <button type="submit" disabled={saving || !employeeName.trim() || !amount}
              data-testid="fp-submit-btn"
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ReceiptIcon className="w-4 h-4" />}
              {saving ? 'Bezig...' : 'Uitbetalen & Kwitantie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FreelancerPayments;
