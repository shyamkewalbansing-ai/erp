import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { API, axios } from './utils';

const NL_MONTHS_FULL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const NL_MONTHS_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

// Parse "maart 2026" -> { year: 2026, month: 2 }
function parsePeriodLabel(label) {
  if (!label || typeof label !== 'string') return null;
  const clean = label.toLowerCase().trim();
  for (let i = 0; i < NL_MONTHS_FULL.length; i++) {
    if (clean.startsWith(NL_MONTHS_FULL[i]) || clean.startsWith(NL_MONTHS_SHORT[i])) {
      const yearMatch = clean.match(/(20\d{2})/);
      if (yearMatch) return { year: parseInt(yearMatch[1], 10), month: i };
    }
  }
  return null;
}

function PayrollCalendar({ token, employees, formatSRD, refreshKey }) {
  const [loonstroken, setLoonstroken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthsToShow, setMonthsToShow] = useState(6);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await axios.get(`${API}/admin/loonstroken`, { headers: { Authorization: `Bearer ${token}` } });
        if (!cancelled) setLoonstroken(resp.data || []);
      } catch { /* skip */ }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  // Build list of last N months (including current)
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return result;
  }, [monthsToShow]);

  // Map: employee_id -> "YYYY-M" -> { count, netto_total }
  const payrollMap = useMemo(() => {
    const map = {};
    loonstroken.forEach(ls => {
      let ym = parsePeriodLabel(ls.period_label);
      if (!ym && ls.payment_date) {
        const d = new Date(ls.payment_date);
        if (!isNaN(d)) ym = { year: d.getFullYear(), month: d.getMonth() };
      }
      if (!ym) return;
      const key = `${ym.year}-${ym.month}`;
      if (!map[ls.employee_id]) map[ls.employee_id] = {};
      if (!map[ls.employee_id][key]) map[ls.employee_id][key] = { count: 0, netto_total: 0 };
      map[ls.employee_id][key].count += 1;
      map[ls.employee_id][key].netto_total += (ls.netto_loon || 0);
    });
    return map;
  }, [loonstroken]);

  const activeEmps = employees.filter(e => e.status === 'active');

  // Summary: count missing for current month
  const currentKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}`;
  })();
  const missingThisMonth = activeEmps.filter(e => !payrollMap[e.employee_id]?.[currentKey]).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200" data-testid="payroll-calendar">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Payroll Kalender</h2>
            <p className="text-xs text-slate-500">
              {missingThisMonth > 0
                ? `${missingThisMonth} werknemer(s) nog niet uitbetaald deze maand`
                : 'Alle werknemers zijn bijgewerkt voor deze maand'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthsToShow(6)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${monthsToShow === 6 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            data-testid="payroll-calendar-6m-btn"
          >6 maanden</button>
          <button
            onClick={() => setMonthsToShow(12)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${monthsToShow === 12 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            data-testid="payroll-calendar-12m-btn"
          >12 maanden</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : activeEmps.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">Nog geen werknemers</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-medium text-slate-500 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Werknemer</th>
                {months.map(m => {
                  const isCurrent = `${m.year}-${m.month}` === currentKey;
                  return (
                    <th
                      key={`${m.year}-${m.month}`}
                      className={`p-2 text-center font-medium min-w-[90px] ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`}
                    >
                      <div className="text-[11px] uppercase tracking-wide">{NL_MONTHS_SHORT[m.month]}</div>
                      <div className="text-[10px] text-slate-400">{m.year}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activeEmps.map(emp => (
                <tr key={emp.employee_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 sticky left-0 bg-white hover:bg-slate-50 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{emp.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{emp.functie || '-'}</p>
                      </div>
                    </div>
                  </td>
                  {months.map(m => {
                    const key = `${m.year}-${m.month}`;
                    const cell = payrollMap[emp.employee_id]?.[key];
                    const paid = !!cell;
                    return (
                      <td
                        key={key}
                        className="p-1.5 text-center"
                        data-testid={`payroll-cell-${emp.employee_id}-${key}`}
                      >
                        {paid ? (
                          <div className="bg-green-100 border border-green-200 rounded-lg py-1.5 px-1" title={`Betaald: ${formatSRD(cell.netto_total)}`}>
                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-0.5" />
                            <div className="text-[10px] font-semibold text-green-700 leading-tight">
                              {formatSRD(cell.netto_total)}
                            </div>
                            {cell.count > 1 && (
                              <div className="text-[9px] text-green-600">×{cell.count}</div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-100 rounded-lg py-1.5 px-1" title="Niet uitbetaald">
                            <Circle className="w-4 h-4 text-red-400 mx-auto mb-0.5" />
                            <div className="text-[10px] font-medium text-red-400 leading-tight">—</div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
          </div>
          <span>Uitbetaald</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-100" />
          <span>Nog niet uitbetaald</span>
        </div>
      </div>
    </div>
  );
}

export default PayrollCalendar;
