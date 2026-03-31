import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, DollarSign, Loader2, Banknote, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { API, axios } from './utils';

function EmployeesTab({ token, formatSRD }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [name, setName] = useState('');
  const [functie, setFunctie] = useState('');
  const [maandloon, setMaandloon] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payModal, setPayModal] = useState(null); // { employee }
  const [payResult, setPayResult] = useState(null);

  const loadEmployees = async () => {
    try {
      const resp = await axios.get(`${API}/admin/employees`, { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(resp.data || []);
    } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { loadEmployees(); }, []);

  const resetForm = () => {
    setName(''); setFunctie(''); setMaandloon(''); setTelefoon(''); setEmail('');
    setEditingEmp(null); setShowForm(false);
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setName(emp.name); setFunctie(emp.functie || ''); setMaandloon(emp.maandloon?.toString() || '');
    setTelefoon(emp.telefoon || ''); setEmail(emp.email || '');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingEmp) {
        await axios.put(`${API}/admin/employees/${editingEmp.employee_id}`, {
          name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/employees`, {
          name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      resetForm();
      loadEmployees();
    } catch { alert('Opslaan mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`"${emp.name}" verwijderen?`)) return;
    try {
      await axios.delete(`${API}/admin/employees/${emp.employee_id}`, { headers: { Authorization: `Bearer ${token}` } });
      loadEmployees();
    } catch { alert('Verwijderen mislukt'); }
  };

  const handlePay = async (emp) => {
    setPayModal({ employee: emp });
  };

  const executePay = async () => {
    const emp = payModal.employee;
    setPaying(emp.employee_id);
    try {
      await axios.post(`${API}/admin/employees/${emp.employee_id}/pay`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadEmployees();
      setPayResult({ success: true, message: `Loon uitbetaald: SRD ${emp.maandloon?.toFixed(2)} aan ${emp.name}` });
    } catch {
      setPayResult({ success: false, message: 'Uitbetaling mislukt' });
    }
    setPaying(null);
  };

  const activeEmps = employees.filter(e => e.status === 'active');
  const totalLoon = activeEmps.reduce((sum, e) => sum + (e.maandloon || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Samenvatting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Werknemers</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeEmps.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-slate-500">Totaal Maandloon</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatSRD(totalLoon)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-slate-500">Totaal Uitbetaald</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatSRD(activeEmps.reduce((s, e) => s + (e.total_paid || 0), 0))}</p>
        </div>
      </div>

      {/* Werknemers Tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Werknemers ({activeEmps.length})</h2>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600" data-testid="add-employee-btn">
            <Plus className="w-4 h-4" /> Nieuwe Werknemer
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naam *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required data-testid="emp-name-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Functie</label>
                <input value={functie} onChange={e => setFunctie(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="emp-functie-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Maandloon (SRD)</label>
                <input type="number" step="0.01" value={maandloon} onChange={e => setMaandloon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="emp-loon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefoon</label>
                <input value={telefoon} onChange={e => setTelefoon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50" data-testid="emp-submit-btn">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingEmp ? 'Bijwerken' : 'Opslaan')}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">
                  Annuleer
                </button>
              </div>
            </div>
          </form>
        )}

        {activeEmps.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen werknemers</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Werknemer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Functie</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Maandloon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Totaal Betaald</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Telefoon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {activeEmps.map(emp => (
                  <tr key={emp.employee_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {emp.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{emp.functie || '-'}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.maandloon)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.total_paid || 0)}</td>
                    <td className="p-4 text-slate-600">{emp.telefoon || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePay(emp)}
                          disabled={paying === emp.employee_id || !emp.maandloon}
                          className="text-green-500 hover:text-green-700 p-1.5 rounded hover:bg-green-50 disabled:opacity-50"
                          title="Loon uitbetalen"
                          data-testid={`pay-emp-${emp.employee_id}`}
                        >
                          {paying === emp.employee_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(emp)} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp)} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loon Uitbetalen Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { if (!paying) { setPayModal(null); setPayResult(null); } }}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            {payResult ? (
              <div className="text-center">
                <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${payResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {payResult.success ? <CheckCircle className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${payResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {payResult.success ? 'Uitbetaald!' : 'Mislukt'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">{payResult.message}</p>
                <button onClick={() => { setPayModal(null); setPayResult(null); }} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium">
                  Sluiten
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Loon Uitbetalen</h3>
                    <p className="text-sm text-slate-500">Dit wordt afgeschreven van de kas</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-600"><span className="font-bold">Werknemer:</span> {payModal.employee.name}</p>
                  <p className="text-sm text-slate-600"><span className="font-bold">Functie:</span> {payModal.employee.functie || '-'}</p>
                  <p className="text-sm text-slate-600"><span className="font-bold">Bedrag:</span> <span className="font-bold text-green-600">SRD {payModal.employee.maandloon?.toFixed(2)}</span></p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setPayModal(null); setPayResult(null); }} disabled={!!paying} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                    Annuleren
                  </button>
                  <button onClick={executePay} disabled={!!paying} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                    {paying ? 'Bezig...' : 'Uitbetalen'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




export default EmployeesTab;
