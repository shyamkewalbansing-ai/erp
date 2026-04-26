import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, Briefcase, Banknote, DollarSign } from 'lucide-react';
import { API, axios } from './utils';
import FreelancerPayments from './FreelancerPayments';
import Loonstroken from './Loonstroken';
import PayrollCalendar from './PayrollCalendar';
import MobileModalShell from './MobileModalShell';

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
  const [role, setRole] = useState('kiosk_medewerker');
  const [pin, setPin] = useState('');
  const [payrollRefreshKey, setPayrollRefreshKey] = useState(0);
  const [loonstrookPrefill, setLoonstrookPrefill] = useState(null);

  const handleRequestPayslip = (emp, year, month) => {
    const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
    const period = `${NL_MONTHS[month]} ${year}`;
    // Use 25th of the selected month as default payment date (or today if current month)
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const d = isCurrentMonth ? now : new Date(year, month, 25);
    const date = d.toISOString().slice(0, 10);
    setLoonstrookPrefill({ employeeId: emp.employee_id, period, date, _ts: Date.now() });
    // Scroll to loonstroken section
    setTimeout(() => {
      const el = document.querySelector('[data-testid="new-loonstrook-btn"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

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
    setRole('kiosk_medewerker'); setPin('');
    setEditingEmp(null); setShowForm(false);
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setName(emp.name); setFunctie(emp.functie || ''); setMaandloon(emp.maandloon?.toString() || '');
    setTelefoon(emp.telefoon || ''); setEmail(emp.email || '');
    setRole(emp.role || 'kiosk_medewerker');
    setPin('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingEmp) {
        const updateData = { name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email, role };
        if (pin) updateData.pin = pin;
        await axios.put(`${API}/admin/employees/${editingEmp.employee_id}`, updateData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const createData = { name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email, role };
        if (pin) createData.pin = pin;
        await axios.post(`${API}/admin/employees`, createData, { headers: { Authorization: `Bearer ${token}` } });
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

  const activeEmps = employees.filter(e => e.status === 'active');
  const totalLoon = activeEmps.reduce((sum, e) => sum + (e.maandloon || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Samenvatting */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">Werknemers</p>
          </div>
          <p className="text-base sm:text-2xl font-bold text-slate-900">{activeEmps.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">Maandloon</p>
          </div>
          <p className="text-sm sm:text-2xl font-bold text-slate-900 break-all">{formatSRD(totalLoon)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">Uitbetaald</p>
          </div>
          <p className="text-sm sm:text-2xl font-bold text-slate-900 break-all">{formatSRD(activeEmps.reduce((s, e) => s + (e.total_paid || 0), 0))}</p>
        </div>
      </div>

      {/* Werknemers Tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Werknemers ({activeEmps.length})</h2>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 whitespace-nowrap" data-testid="add-employee-btn">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nieuwe Werknemer</span>
            <span className="sm:hidden">Nieuw</span>
          </button>
        </div>

        {/* Form (mobile-friendly modal) */}
        {showForm && (
          <MobileModalShell
            title={editingEmp ? 'Werknemer bewerken' : 'Nieuwe Werknemer'}
            subtitle={editingEmp ? editingEmp.name : 'Vul onderstaande velden in'}
            onClose={resetForm}
            onSubmit={() => { if (!name.trim() || saving) return; handleSubmit({ preventDefault: () => {} }); }}
            loading={saving}
            submitLabel={editingEmp ? 'Bijwerken' : 'Opslaan'}
            testIdPrefix="emp-modal"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Naam *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                required data-testid="emp-name-input" placeholder="Volledige naam" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Functie</label>
              <input value={functie} onChange={e => setFunctie(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                data-testid="emp-functie-input" placeholder="bijv. Schoonmaker" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Maandloon (SRD)</label>
              <input type="number" inputMode="decimal" step="0.01" value={maandloon} onChange={e => setMaandloon(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                data-testid="emp-loon-input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefoon</label>
              <input type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                placeholder="+597 ..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                placeholder="naam@email.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400"
                data-testid="emp-role-select">
                <option value="beheerder">Beheerder</option>
                <option value="boekhouder">Boekhouder</option>
                <option value="kiosk_medewerker">Kiosk Medewerker</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">PIN code (4 cijfers) {editingEmp?.has_pin ? '(laat leeg om niet te wijzigen)' : ''}</label>
              <input type="text" inputMode="numeric" maxLength={4} pattern="[0-9]*" value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                placeholder="bijv. 1234" data-testid="emp-pin-input" />
            </div>
          </MobileModalShell>
        )}

        {activeEmps.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen werknemers</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Werknemer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Functie</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Rol</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Maandloon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Open <span className="text-[10px] text-slate-400 font-normal capitalize">deze maand</span></th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Totaal Betaald</th>
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
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        emp.role === 'beheerder' ? 'bg-purple-100 text-purple-600' :
                        emp.role === 'boekhouder' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {{beheerder:'Beheerder',boekhouder:'Boekhouder',kiosk_medewerker:'Kiosk'}[emp.role] || emp.role || 'Kiosk'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.maandloon)}</td>
                    <td className="p-4 text-right">
                      <span className={`font-bold ${(emp.current_period_open || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatSRD(emp.current_period_open || 0)}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.total_paid || 0)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
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
          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-slate-100">
            {activeEmps.map(emp => {
              const ROLE_LABELS = {beheerder:'Beheerder',boekhouder:'Boekhouder',kiosk_medewerker:'Kiosk'};
              return (
                <div key={emp.employee_id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.functie || '-'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${emp.role === 'beheerder' ? 'bg-purple-100 text-purple-600' : emp.role === 'boekhouder' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {ROLE_LABELS[emp.role] || 'Kiosk'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                    <div className="flex justify-between"><span className="text-slate-400">Maandloon</span><span className="font-bold text-slate-700">{formatSRD(emp.maandloon)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Open ({emp.current_period?.split(' ')[0] || 'maand'})</span><span className={`font-bold ${(emp.current_period_open || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatSRD(emp.current_period_open || 0)}</span></div>
                    <div className="flex justify-between col-span-2"><span className="text-slate-400">Totaal Betaald</span><span className="font-bold text-slate-700">{formatSRD(emp.total_paid || 0)}</span></div>
                  </div>
                  <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-slate-50">
                    <button onClick={() => openEdit(emp)} className="text-slate-400 hover:text-orange-500 p-1.5"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(emp)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Payroll Kalender */}
      <PayrollCalendar token={token} employees={employees} formatSRD={formatSRD} refreshKey={payrollRefreshKey} onRequestPayslip={handleRequestPayslip} onChange={() => { loadEmployees(); setPayrollRefreshKey(k => k + 1); }} />

      {/* Loonstroken sectie */}
      <Loonstroken
        token={token}
        formatSRD={formatSRD}
        employees={employees}
        prefillRequest={loonstrookPrefill}
        onPrefillConsumed={() => setLoonstrookPrefill(null)}
        onChange={() => { loadEmployees(); setPayrollRefreshKey(k => k + 1); }}
      />

      {/* Losse Uitbetalingen sectie */}
      <FreelancerPayments token={token} formatSRD={formatSRD} employees={employees} onChange={loadEmployees} />
    </div>
  );
}




export default EmployeesTab;
