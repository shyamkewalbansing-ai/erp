import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Loader2, Banknote } from 'lucide-react';
import { API, axios } from './utils';
import VoorschotModal from './VoorschotModal';

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

function PayrollCalendar({ token, employees, formatSRD, refreshKey, onRequestPayslip, onChange }) {
  const [loonstroken, setLoonstroken] = useState([]);
  const [voorschotKas, setVoorschotKas] = useState([]);
  const [voorschotModal, setVoorschotModal] = useState(null); // { emp, year, month }
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [monthsToShow, setMonthsToShow] = useState(6);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [lsResp, kasResp] = await Promise.all([
          axios.get(`${API}/admin/loonstroken`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/admin/kas`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!cancelled) {
          setLoonstroken(lsResp.data || []);
          // Filter only voorschot entries (kas entries)
          const kasList = Array.isArray(kasResp.data) ? kasResp.data : (kasResp.data?.entries || []);
          const kas = kasList.filter(k => k.category === 'voorschot');
          setVoorschotKas(kas);
        }
      } catch { /* skip */ }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [token, refreshKey, internalRefresh]);

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

  // Map: employee_id -> "YYYY-M" -> { count, total }  (voorschotten)
  const voorschotMap = useMemo(() => {
    const map = {};
    voorschotKas.forEach(v => {
      const ym = parsePeriodLabel(v.voorschot_period || '');
      if (!ym || !v.related_employee_id) return;
      const key = `${ym.year}-${ym.month}`;
      if (!map[v.related_employee_id]) map[v.related_employee_id] = {};
      if (!map[v.related_employee_id][key]) map[v.related_employee_id][key] = { count: 0, total: 0 };
      map[v.related_employee_id][key].count += 1;
      map[v.related_employee_id][key].total += (v.amount || 0);
    });
    return map;
  }, [voorschotKas]);

  const activeEmps = employees.filter(e => e.status === 'active');

  // Summary: count missing for current month
  const currentKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}`;
  })();
  const missingThisMonth = activeEmps.filter(e => !payrollMap[e.employee_id]?.[currentKey]).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200" data-testid="payroll-calendar">
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Payroll Kalender</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              {missingThisMonth > 0
                ? `${missingThisMonth} werknemer(s) nog niet uitbetaald`
                : 'Alle werknemers zijn bijgewerkt'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setMonthsToShow(6)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium ${monthsToShow === 6 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            data-testid="payroll-calendar-6m-btn"
          >6 mnd</button>
          <button
            onClick={() => setMonthsToShow(12)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium ${monthsToShow === 12 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            data-testid="payroll-calendar-12m-btn"
          >12 mnd</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : activeEmps.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">Nog geen werknemers</div>
      ) : (
        <>
        {/* Desktop tabel */}
        <div className="overflow-x-auto hidden md:block">
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
                    const voorschot = voorschotMap[emp.employee_id]?.[key];
                    const paid = !!cell;
                    return (
                      <td
                        key={key}
                        className="p-1.5 text-center"
                        data-testid={`payroll-cell-${emp.employee_id}-${key}`}
                      >
                        {paid ? (
                          <div className="bg-green-100 border border-green-200 rounded-lg py-1.5 px-1" title={`Betaald: ${formatSRD(cell.netto_total)}${voorschot ? ` + voorschot ${formatSRD(voorschot.total)}` : ''}`}>
                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto mb-0.5" />
                            <div className="text-[10px] font-semibold text-green-700 leading-tight">
                              {formatSRD(cell.netto_total)}
                            </div>
                            {cell.count > 1 && (
                              <div className="text-[9px] text-green-600">×{cell.count}</div>
                            )}
                            {voorschot && (
                              <div className="text-[9px] text-orange-600 mt-0.5 font-bold">+vrs {formatSRD(voorschot.total)}</div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => onRequestPayslip && onRequestPayslip(emp, m.year, m.month)}
                              className="w-full bg-red-50 hover:bg-orange-50 hover:border-orange-300 border border-red-100 rounded-lg py-1.5 px-1 transition group cursor-pointer"
                              title={`Klik om loonstrook aan te maken voor ${NL_MONTHS_FULL[m.month]} ${m.year}`}
                              data-testid={`payroll-create-${emp.employee_id}-${key}`}
                            >
                              <Circle className="w-4 h-4 text-red-400 group-hover:text-orange-500 mx-auto mb-0.5" />
                              <div className="text-[10px] font-medium text-red-400 group-hover:text-orange-600 leading-tight">
                                + Betalen
                              </div>
                              {voorschot && (
                                <div className="text-[9px] text-orange-600 mt-0.5 font-bold">vrs {formatSRD(voorschot.total)}</div>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setVoorschotModal({ emp, year: m.year, month: m.month })}
                              className="w-full text-[9px] font-bold uppercase tracking-wide text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md py-1 px-1 transition flex items-center justify-center gap-1"
                              title={`Voorschot uitbetalen voor ${NL_MONTHS_FULL[m.month]} ${m.year}`}
                              data-testid={`payroll-voorschot-${emp.employee_id}-${key}`}
                            >
                              <Banknote className="w-3 h-3" /> Voorschot
                            </button>
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
        {/* Mobile cards: per werknemer een kaart met maand-tegels in grid */}
        <div className="md:hidden divide-y divide-slate-100">
          {activeEmps.map(emp => (
            <div key={emp.employee_id} className="p-3" data-testid={`payroll-mobile-emp-${emp.employee_id}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {emp.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{emp.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{emp.functie || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {months.map(m => {
                  const key = `${m.year}-${m.month}`;
                  const cell = payrollMap[emp.employee_id]?.[key];
                  const voorschot = voorschotMap[emp.employee_id]?.[key];
                  const paid = !!cell;
                  const isCurrent = key === currentKey;
                  return (
                    <div key={key} className="flex flex-col">
                      <div className={`text-center text-[9px] font-bold uppercase tracking-wide mb-0.5 ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {NL_MONTHS_SHORT[m.month]} <span className="text-slate-300">{String(m.year).slice(2)}</span>
                      </div>
                      {paid ? (
                        <div className="bg-green-100 border border-green-200 rounded-lg py-1.5 px-1 text-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mx-auto" />
                          <div className="text-[9px] font-bold text-green-700 leading-tight mt-0.5">{formatSRD(cell.netto_total)}</div>
                          {voorschot && (
                            <div className="text-[8px] text-orange-600 font-bold mt-0.5">+vrs {formatSRD(voorschot.total)}</div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => onRequestPayslip && onRequestPayslip(emp, m.year, m.month)}
                            className="w-full bg-red-50 active:bg-orange-100 border border-red-100 rounded-lg py-1.5 px-1 text-center"
                            data-testid={`payroll-mobile-create-${emp.employee_id}-${key}`}
                          >
                            <Circle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                            <div className="text-[9px] font-bold text-red-500 leading-tight mt-0.5">+ Betalen</div>
                            {voorschot && (
                              <div className="text-[8px] text-orange-600 font-bold mt-0.5">vrs {formatSRD(voorschot.total)}</div>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVoorschotModal({ emp, year: m.year, month: m.month })}
                            className="w-full text-[9px] font-bold uppercase text-orange-600 active:bg-orange-100 bg-orange-50 border border-orange-200 rounded-md py-1 px-1 flex items-center justify-center gap-1"
                            data-testid={`payroll-mobile-voorschot-${emp.employee_id}-${key}`}
                          >
                            <Banknote className="w-3 h-3" /> Vrsch
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        </>
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
          <span>Nog niet uitbetaald — klik om loonstrook aan te maken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Banknote className="w-3 h-3 text-orange-600" />
          <span>Voorschot — gedeeltelijke betaling</span>
        </div>
      </div>

      {voorschotModal && (
        <VoorschotModal
          token={token}
          employee={voorschotModal.emp}
          year={voorschotModal.year}
          month={voorschotModal.month}
          onClose={() => setVoorschotModal(null)}
          onSaved={() => { setInternalRefresh(k => k + 1); if (onChange) onChange(); }}
        />
      )}
    </div>
  );
}

export default PayrollCalendar;
