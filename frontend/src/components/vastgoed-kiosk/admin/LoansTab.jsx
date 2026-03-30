import { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Loader2, Eye, Wallet, XCircle } from 'lucide-react';
import { API, axios } from './utils';

function LoansTab({ token, tenants, formatSRD, onShowDetail }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null); // loan object
  const [filterStatus, setFilterStatus] = useState('all');

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/loans`, { headers: { Authorization: `Bearer ${token}` } });
      setLoans(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadDetail = async (loanId) => {
    try {
      const res = await axios.get(`${API}/admin/loans/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      onShowDetail(res.data);
    } catch (err) { console.error(err); }
  };

  const deleteLoan = async (loanId) => {
    if (!confirm('Weet u zeker dat u deze lening wilt verwijderen? Alle aflossingen worden ook verwijderd.')) return;
    try {
      await axios.delete(`${API}/admin/loans/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadLoans();
      onShowDetail(null);
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij verwijderen'); }
  };

  useEffect(() => { loadLoans(); }, []);

  const filtered = filterStatus === 'all' ? loans : loans.filter(l => l.status === filterStatus);

  const stats = {
    totalLoaned: loans.filter(l => l.status === 'active').reduce((s, l) => s + l.amount, 0),
    totalRemaining: loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remaining, 0),
    totalPaid: loans.reduce((s, l) => s + l.total_paid, 0),
    activeCount: loans.filter(l => l.status === 'active').length,
    paidOffCount: loans.filter(l => l.status === 'paid_off').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="loans-tab">
      {/* Actions bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          data-testid="loans-filter-status"
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle leningen ({loans.length})</option>
          <option value="active">Actief ({stats.activeCount})</option>
          <option value="paid_off">Afgelost ({stats.paidOffCount})</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreateModal(true)}
          data-testid="loans-create-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Nieuwe lening
        </button>
      </div>

      {/* Loans list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Geen leningen gevonden</p>
            <p className="text-sm text-slate-400 mt-1">Maak een nieuwe lening aan via de knop hierboven</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Huurder</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">App.</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Leningbedrag</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Maand. aflossing</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Afgelost</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Openstaand</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(loan => {
                  const progress = loan.amount > 0 ? Math.min(100, (loan.total_paid / loan.amount) * 100) : 0;
                  return (
                    <tr key={loan.loan_id} className="hover:bg-slate-50 transition" data-testid={`loan-row-${loan.loan_id}`}>
                      <td className="py-3 px-4 font-medium text-slate-900">{loan.tenant_name}</td>
                      <td className="py-3 px-4 text-slate-500">{loan.apartment_number}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatSRD(loan.amount)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatSRD(loan.monthly_payment)}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{formatSRD(loan.total_paid)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={loan.remaining > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatSRD(loan.remaining)}</span>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' : loan.status === 'paid_off' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {loan.status === 'active' ? 'Actief' : loan.status === 'paid_off' ? 'Afgelost' : 'Geannuleerd'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {loan.status === 'active' && (
                            <button
                              onClick={() => setShowPayModal(loan)}
                              data-testid={`loan-pay-${loan.loan_id}`}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                              title="Aflossing registreren"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => loadDetail(loan.loan_id)}
                            data-testid={`loan-detail-${loan.loan_id}`}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                            title="Details bekijken"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteLoan(loan.loan_id)}
                            data-testid={`loan-delete-${loan.loan_id}`}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                            title="Verwijderen"
                          >
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
        )}
      </div>

      {/* Create Loan Modal */}
      {showCreateModal && (
        <LoanCreateModal
          tenants={tenants}
          token={token}
          formatSRD={formatSRD}
          onClose={() => setShowCreateModal(false)}
          onSave={() => { setShowCreateModal(false); loadLoans(); }}
        />
      )}

      {/* Pay Loan Modal */}
      {showPayModal && (
        <LoanPayModal
          loan={showPayModal}
          token={token}
          formatSRD={formatSRD}
          onClose={() => setShowPayModal(null)}
          onSave={() => { setShowPayModal(null); loadLoans(); }}
        />
      )}
    </div>
  );
}

function LoanCreateModal({ tenants, token, formatSRD, onClose, onSave }) {
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTenants = tenants.filter(t => t.status === 'active');

  const handleSave = async () => {
    if (!tenantId || !amount || !monthlyPayment) return alert('Vul alle verplichte velden in');
    if (parseFloat(amount) <= 0 || parseFloat(monthlyPayment) <= 0) return alert('Bedragen moeten groter dan 0 zijn');
    setSaving(true);
    try {
      await axios.post(`${API}/admin/loans`, {
        tenant_id: tenantId,
        amount: parseFloat(amount),
        monthly_payment: parseFloat(monthlyPayment),
        start_date: startDate,
        description,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij aanmaken'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900" data-testid="loan-create-title">Nieuwe Lening</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Huurder *</label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              data-testid="loan-tenant-select"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Selecteer huurder...</option>
              {activeTenants.map(t => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.name} — {t.apartment_number}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leningbedrag (SRD) *</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                data-testid="loan-amount-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maand. aflossing (SRD) *</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={e => setMonthlyPayment(e.target.value)}
                data-testid="loan-monthly-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              data-testid="loan-start-date"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="loan-description"
              placeholder="Bijv. Voorschot verbouwing"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {amount && monthlyPayment && parseFloat(monthlyPayment) > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              Geschatte looptijd: <strong>{Math.ceil(parseFloat(amount) / parseFloat(monthlyPayment))} maanden</strong>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="loan-save-btn"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lening aanmaken'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanPayModal({ loan, token, formatSRD, onClose, onSave }) {
  const [amount, setAmount] = useState(loan.monthly_payment?.toString() || '');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const handlePay = async () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return alert('Voer een geldig bedrag in');
    if (payAmount > loan.remaining) return alert(`Bedrag kan niet hoger zijn dan het openstaande saldo (${formatSRD(loan.remaining)})`);
    setSaving(true);
    try {
      await axios.post(`${API}/admin/loans/${loan.loan_id}/pay`, {
        amount: payAmount,
        description: description || 'Aflossing',
        payment_method: paymentMethod,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij registreren'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900" data-testid="loan-pay-title">Aflossing — {loan.tenant_name}</h2>
          <p className="text-sm text-slate-500 mt-1">Openstaand: <span className="font-bold text-red-600">{formatSRD(loan.remaining)}</span></p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bedrag (SRD) *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              data-testid="loan-pay-amount"
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setAmount(loan.monthly_payment?.toString())} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition">
                Maandelijks ({formatSRD(loan.monthly_payment)})
              </button>
              <button onClick={() => setAmount(loan.remaining?.toString())} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition">
                Volledig ({formatSRD(loan.remaining)})
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Betaalmethode</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              data-testid="loan-pay-method"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="cash">Contant</option>
              <option value="bank">Bank</option>
              <option value="pin">Pinpas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="loan-pay-description"
              placeholder="Aflossing"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
          <button
            onClick={handlePay}
            disabled={saving}
            data-testid="loan-pay-submit"
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aflossing registreren'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanDetailModal({ loan, formatSRD, onClose, onPay }) {
  const progress = loan.amount > 0 ? Math.min(100, (loan.total_paid / loan.amount) * 100) : 0;

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };
  const formatDateTime = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900" data-testid="loan-detail-title">Lening — {loan.tenant_name}</h2>
            <p className="text-sm text-slate-500 mt-1">App. {loan.apartment_number} | Aangemaakt: {formatDate(loan.start_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {loan.status === 'active' ? 'Actief' : 'Afgelost'}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
              <XCircle className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Leningbedrag</p>
              <p className="text-lg font-bold text-slate-900">{formatSRD(loan.amount)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <p className="text-xs text-slate-500 mb-1">Afgelost</p>
              <p className="text-lg font-bold text-green-600">{formatSRD(loan.total_paid)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <p className="text-xs text-slate-500 mb-1">Openstaand</p>
              <p className="text-lg font-bold text-red-600">{formatSRD(loan.remaining)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Voortgang</span>
              <span className="font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {loan.description && (
            <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm text-slate-600 border border-slate-200">
              <span className="font-medium">Omschrijving:</span> {loan.description}
            </div>
          )}

          <p className="text-sm font-semibold text-slate-700 mb-4">Maandelijkse aflossing: <span className="text-orange-600">{formatSRD(loan.monthly_payment)}</span></p>

          {/* Payment history */}
          <h3 className="text-sm font-bold text-slate-700 mb-3">Betaalgeschiedenis ({loan.payments?.length || 0})</h3>
          {(!loan.payments || loan.payments.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nog geen aflossingen geregistreerd</p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Datum</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Bedrag</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Methode</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Resterend</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Omschrijving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loan.payments.map(p => (
                    <tr key={p.payment_id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600">{formatDateTime(p.created_at)}</td>
                      <td className="py-2 px-3 text-right font-medium text-green-600">{formatSRD(p.amount)}</td>
                      <td className="py-2 px-3 text-slate-500 capitalize">{p.payment_method}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatSRD(p.remaining_after)}</td>
                      <td className="py-2 px-3 text-slate-500">{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
          {loan.status === 'active' && (
            <button
              onClick={onPay}
              data-testid="loan-detail-pay-btn"
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            >
              Aflossing registreren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




export { LoanDetailModal };
export default LoansTab;
