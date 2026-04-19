import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Printer, Loader2, X, MessageCircle, Send, Wallet } from 'lucide-react';
import { API, axios } from './utils';

function Loonstroken({ token, formatSRD, employees, onChange, prefillRequest, onPrefillConsumed }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [initialValues, setInitialValues] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [waSending, setWaSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/loonstroken`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(r.data || []);
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (prefillRequest) {
      setInitialValues(prefillRequest);
      setShowModal(true);
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefillRequest, onPrefillConsumed]);

  useEffect(() => {
    if (!preview) { setPreviewHtml(''); return; }
    setPreviewLoading(true);
    axios.get(`${API}/admin/loonstroken/${preview.loonstrook_id}/receipt?noprint=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPreviewHtml(r.data))
      .catch(() => setPreviewHtml('<p style="padding:40px;text-align:center">Fout bij laden</p>'))
      .finally(() => setPreviewLoading(false));
  }, [preview, token]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deze loonstrook verwijderen? De kas-boeking wordt ook verwijderd.')) return;
    try {
      await axios.delete(`${API}/admin/loonstroken/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      load();
      if (onChange) onChange();
    } catch { alert('Verwijderen mislukt'); }
  };

  const openPrint = (item) => {
    axios.get(`${API}/admin/loonstroken/${item.loonstrook_id}/receipt`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const win = window.open('', '_blank');
        if (win) { win.document.open(); win.document.write(r.data); win.document.close(); }
      });
  };

  const sendWhatsApp = async () => {
    if (!preview) return;
    setWaSending(true);
    try {
      await axios.post(`${API}/admin/loonstroken/${preview.loonstrook_id}/send-whatsapp`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('WhatsApp bericht verstuurd!');
    } catch (err) { alert('Versturen mislukt: ' + (err.response?.data?.detail || err.message)); }
    setWaSending(false);
  };

  const shareWhatsAppLink = () => {
    if (!preview) return;
    const phone = (preview.telefoon || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Beste ${preview.employee_name},\n\n` +
      `Uw loonstrook voor ${preview.period_label} is beschikbaar:\n` +
      `Netto loon: SRD ${Number(preview.netto_loon).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}\n` +
      `Strook nr: ${preview.strook_nummer}`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const total = items.reduce((s, i) => s + (i.netto_loon || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-slate-900">Loonstroken</h2>
          <span className="text-xs text-slate-400">({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Totaal netto: <span className="font-bold text-slate-700">{formatSRD(total)}</span></span>
          <button onClick={() => { setInitialValues(null); setShowModal(true); }} data-testid="new-loonstrook-btn"
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
            <Plus className="w-4 h-4" /> Nieuwe Loonstrook
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center"><Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Nog geen loonstroken geregistreerd.</p>
          <p className="text-slate-400 text-xs mt-1">Maak een loonstrook aan om loon uit te betalen met automatische kas-boeking, printbare strook en WhatsApp verzending.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Nummer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Werknemer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Periode</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Bruto</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Aftrek</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Netto</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => {
                  const bruto = (p.bruto_loon || 0) + (p.overuren_bedrag || 0) + (p.bonus || 0);
                  const aftrek = (p.belasting_aftrek || 0) + (p.overige_aftrek || 0);
                  return (
                    <tr key={p.loonstrook_id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-600">{new Date(p.payment_date || p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="p-4 text-sm font-mono text-green-600">{p.strook_nummer}</td>
                      <td className="p-4 font-bold text-slate-900">{p.employee_name}{p.functie && <span className="text-xs text-slate-400 font-normal block">{p.functie}</span>}</td>
                      <td className="p-4 text-sm text-slate-600">{p.period_label}</td>
                      <td className="p-4 text-right text-sm text-slate-600">{formatSRD(bruto)}</td>
                      <td className="p-4 text-right text-sm text-red-500">{aftrek > 0 ? `- ${formatSRD(aftrek)}` : '-'}</td>
                      <td className="p-4 text-right font-bold text-slate-900">{formatSRD(p.netto_loon)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setPreview(p)} className="text-slate-400 hover:text-green-500 p-1.5" title="Bekijken"><FileText className="w-4 h-4" /></button>
                          <button onClick={() => openPrint(p)} className="text-slate-400 hover:text-orange-500 p-1.5" title="Afdrukken"><Printer className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.loonstrook_id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
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
            {items.map(p => (
              <div key={p.loonstrook_id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{p.employee_name}</p>
                    <p className="text-xs text-slate-400">{p.period_label} · {new Date(p.payment_date || p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatSRD(p.netto_loon)}</p>
                </div>
                <span className="text-[10px] text-green-600 font-mono">{p.strook_nummer}</span>
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-50 mt-2">
                  <button onClick={() => setPreview(p)} className="text-slate-400 hover:text-green-500 p-1.5"><FileText className="w-4 h-4" /></button>
                  <button onClick={() => openPrint(p)} className="text-slate-400 hover:text-orange-500 p-1.5"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.loonstrook_id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <LoonstrookModal
          token={token} employees={employees}
          initialValues={initialValues}
          onClose={() => { setShowModal(false); setInitialValues(null); }}
          onCreated={(created) => {
            setShowModal(false);
            setInitialValues(null);
            load();
            if (onChange) onChange();
            setPreview({ loonstrook_id: created.loonstrook_id, employee_name: created.employee_name, netto_loon: created.netto_loon, strook_nummer: created.strook_nummer });
          }}
        />
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={() => setPreview(null)}>
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-[100dvh] sm:h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Loonstrook {preview.strook_nummer}</h3>
              </div>
              <button onClick={() => setPreview(null)} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-slate-100 relative">
              {previewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Laden...</div>
              ) : (
                <iframe srcDoc={previewHtml} title="Loonstrook" className="w-full h-full border-0 bg-white" />
              )}
            </div>
            <div className="flex items-center gap-2 p-3 border-t border-slate-200 flex-shrink-0 bg-white flex-wrap" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <button onClick={() => setPreview(null)} className="px-3 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-sm font-medium"><X className="w-4 h-4 inline mr-1" />Sluiten</button>
              <button onClick={shareWhatsAppLink}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold">
                <MessageCircle className="w-4 h-4" /> WhatsApp (handmatig)
              </button>
              {preview.telefoon && (
                <button onClick={sendWhatsApp} disabled={waSending}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Verstuur direct
                </button>
              )}
              <button onClick={() => openPrint(preview)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold">
                <Printer className="w-4 h-4" /> Afdrukken / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoonstrookModal({ token, employees, onClose, onCreated, initialValues }) {
  const [employeeId, setEmployeeId] = useState(initialValues?.employeeId || '');
  const [period, setPeriod] = useState(() => {
    if (initialValues?.period) return initialValues.period;
    const m = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
    const d = new Date();
    return `${m[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [bruto, setBruto] = useState('');
  const [overuren, setOveruren] = useState('0');
  const [bonus, setBonus] = useState('0');
  const [belasting, setBelasting] = useState('0');
  const [overigeAftrek, setOverigeAftrek] = useState('0');
  const [dagen, setDagen] = useState('');
  const [uren, setUren] = useState('');
  const [method, setMethod] = useState('bank');
  const [date, setDate] = useState(() => initialValues?.date || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedEmp = employees.find(e => e.employee_id === employeeId);
  const brutoTotaal = (parseFloat(bruto) || 0) + (parseFloat(overuren) || 0) + (parseFloat(bonus) || 0);
  const totaleAftrek = (parseFloat(belasting) || 0) + (parseFloat(overigeAftrek) || 0);
  const netto = brutoTotaal - totaleAftrek;

  useEffect(() => {
    if (selectedEmp && !bruto) setBruto(selectedEmp.maandloon?.toString() || '');
  }, [selectedEmp, bruto]);

  const submit = async (e) => {
    e.preventDefault();
    if (!employeeId || netto <= 0) return;
    setSaving(true);
    try {
      const r = await axios.post(`${API}/admin/loonstroken`, {
        employee_id: employeeId,
        period_label: period,
        bruto_loon: parseFloat(bruto) || 0,
        overuren_bedrag: parseFloat(overuren) || 0,
        bonus: parseFloat(bonus) || 0,
        belasting_aftrek: parseFloat(belasting) || 0,
        overige_aftrek: parseFloat(overigeAftrek) || 0,
        dagen_gewerkt: dagen ? parseInt(dagen) : null,
        uren_gewerkt: uren ? parseFloat(uren) : null,
        payment_method: method,
        payment_date: date,
        notes
      }, { headers: { Authorization: `Bearer ${token}` } });
      onCreated(r.data);
    } catch (err) { alert('Opslaan mislukt: ' + (err.response?.data?.detail || err.message)); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center"><Wallet className="w-6 h-6 text-green-600" /></div>
            <div><h3 className="text-lg font-bold text-slate-900">Nieuwe Loonstrook</h3></div>
          </div>
          <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Werknemer *</label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white">
              <option value="">— Kies werknemer —</option>
              {employees.filter(e => e.status === 'active').map(e => (
                <option key={e.employee_id} value={e.employee_id}>{e.name}{e.functie ? ` · ${e.functie}` : ''}</option>
              ))}
            </select>
            {selectedEmp && !selectedEmp.telefoon && <p className="text-xs text-amber-600 mt-1">⚠️ Geen telefoonnummer bij werknemer - WhatsApp versturen niet mogelijk.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Periode *</label>
            <input type="text" value={period} onChange={e => setPeriod(e.target.value)} required
              className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="bijv. april 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Dagen gewerkt</label>
              <input type="number" value={dagen} onChange={e => setDagen(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Uren gewerkt</label>
              <input type="number" step="0.5" value={uren} onChange={e => setUren(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div><label className="block text-xs font-medium mb-1">Bruto loon (SRD) *</label>
              <input type="number" step="0.01" value={bruto} onChange={e => setBruto(e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg text-sm font-bold" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs font-medium mb-1">Overuren</label>
                <input type="number" step="0.01" value={overuren} onChange={e => setOveruren(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium mb-1">Bonus</label>
                <input type="number" step="0.01" value={bonus} onChange={e => setBonus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-red-700">Aftrek</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs font-medium mb-1">Belasting</label>
                <input type="number" step="0.01" value={belasting} onChange={e => setBelasting(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium mb-1">Overige</label>
                <input type="number" step="0.01" value={overigeAftrek} onChange={e => setOverigeAftrek(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
          </div>
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-600">NETTO LOON</p>
            <p className="text-2xl font-bold text-green-700">SRD {netto.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Uit betaald vanuit</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white">
                <option value="bank">Bank</option><option value="cash">Kas</option></select></div>
            <div><label className="block text-xs font-medium mb-1">Datum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Opmerkingen (optioneel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 border rounded-lg text-sm font-medium">Annuleren</button>
            <button type="submit" disabled={saving || !employeeId || netto <= 0}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {saving ? 'Bezig...' : 'Loonstrook Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Loonstroken;
