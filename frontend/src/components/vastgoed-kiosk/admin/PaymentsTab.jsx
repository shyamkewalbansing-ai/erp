import { useState } from 'react';
import { Trash2, Receipt, Search, Calendar, FileText, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ReceiptTicket from '../ReceiptTicket';

function PaymentsTab({ payments, totalFiltered, searchTerm, setSearchTerm, selectedMonth, setSelectedMonth, formatSRD, token, company, tenants, onDeletePayment, onRefresh }) {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [approving, setApproving] = useState(null);
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    });
  }

  const stampData = company ? {
    stamp_company_name: company.stamp_company_name || company.name,
    stamp_address: company.stamp_address || company.adres || '',
    stamp_phone: company.stamp_phone || company.telefoon || '',
    stamp_whatsapp: company.stamp_whatsapp || '',
    bank_name: company.bank_name || '',
    bank_account_name: company.bank_account_name || '',
    bank_account_number: company.bank_account_number || '',
    bank_description: company.bank_description || '',
  } : null;

  const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

  // Lookup huurder huidig saldo (fallback voor oude betalingen zonder opgeslagen remaining)
  const tenantMap = {};
  (tenants || []).forEach(t => {
    const total = (t.outstanding_rent || 0) + (t.service_costs || 0) + (t.fines || 0) + (t.internet_outstanding || 0);
    tenantMap[t.tenant_code] = total;
    tenantMap[t.name] = total;
  });

  const handleFixCoveredMonths = async () => {
    if (!window.confirm('Wilt u de periode-gegevens van alle kwitanties herberekenen?')) return;
    setFixing(true);
    try {
      const res = await fetch(`${API}/admin/payments/fix-covered-months`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      toast.success(`${data.message}`);
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Herberekening mislukt');
    }
    setFixing(false);
  };

  const handleApprove = async (paymentId) => {
    if (!window.confirm('Betaling goedkeuren? Saldo wordt bijgewerkt.')) return;
    setApproving(paymentId);
    try {
      await axios.post(`${API}/admin/payments/${paymentId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Betaling goedgekeurd');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Goedkeuren mislukt');
    }
    setApproving(null);
  };

  const handleReject = async (paymentId) => {
    if (!window.confirm('Betaling afwijzen? Dit kan niet ongedaan worden.')) return;
    setApproving(paymentId);
    try {
      await axios.post(`${API}/admin/payments/${paymentId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Betaling afgewezen');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Afwijzen mislukt');
    }
    setApproving(null);
  };

  const PRINT_SERVER_URL = 'http://localhost:5555';
  const handlePrint = async () => {
    if (!selectedPayment) return;
    // Try local print server first, otherwise open backend receipt HTML
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        const printData = {
          company_name: stampData?.stamp_company_name || 'Vastgoed Beheer',
          address: stampData?.stamp_address || '',
          phone: stampData?.stamp_phone || '',
          receipt_number: selectedPayment.kwitantie_nummer || '',
          date: new Date(selectedPayment.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: new Date(selectedPayment.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          tenant_name: selectedPayment.tenant_name || '',
          apartment: `${selectedPayment.apartment_number || ''} / ${selectedPayment.tenant_code || ''}`,
          payment_type: { rent: 'Huurbetaling', monthly_rent: 'Huurbetaling', partial_rent: 'Gedeelt. huurbetaling', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borgsom' }[selectedPayment.payment_type] || selectedPayment.payment_type,
          amount: Number(selectedPayment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
          total: Number(selectedPayment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 }),
          payment_method: { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' }[selectedPayment.payment_method] || selectedPayment.payment_method || 'Contant',
          remaining_total: Number((selectedPayment.remaining_rent || 0) + (selectedPayment.remaining_service || 0) + (selectedPayment.remaining_fines || 0)).toLocaleString('nl-NL', { minimumFractionDigits: 2 })
        };
        await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) });
      } else {
        // Open backend-generated receipt HTML in new tab for printing
        window.open(`${API}/admin/payments/${selectedPayment.payment_id}/receipt?token=${token}`, '_blank');
      }
    } catch {
      window.open(`${API}/admin/payments/${selectedPayment.payment_id}/receipt?token=${token}`, '_blank');
    }
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-[140px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Zoek..."
            data-testid="payment-search"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="all">Alle maanden</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
        </select>
        <div className="text-right px-3 py-1.5 bg-orange-50 rounded-lg">
          <p className="text-[10px] text-orange-600">{payments.length} betalingen</p>
          <p className="text-sm sm:text-lg font-bold text-orange-600">{formatSRD(totalFiltered)}</p>
        </div>
        <button
          onClick={handleFixCoveredMonths}
          disabled={fixing}
          data-testid="fix-covered-months-btn"
          title="Periodes herberekenen"
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fixing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{fixing ? 'Bezig...' : 'Periodes herberekenen'}</span>
        </button>
      </div>

      {/* Table - Desktop */}
      <div className="overflow-x-auto hidden md:block">
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Geen betalingen gevonden
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Kwitantie</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Appt</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Periode</th>
                <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                <th className="text-right p-4 text-sm font-medium text-slate-500">Openstaand</th>
                <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.payment_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-600">
                    {new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 font-mono text-sm text-orange-600">
                    {p.kwitantie_nummer}
                    {p.status === 'pending' && <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">IN AFWACHTING</span>}
                    {p.status === 'rejected' && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">AFGEWEZEN</span>}
                  </td>
                  <td className="p-4 font-medium text-slate-900">{p.tenant_name}</td>
                  <td className="p-4 text-slate-600">{p.apartment_number}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {{monthly_rent:'Maandhuur',rent:'Huurbetaling',service_costs:'Servicekosten',deposit:'Borg',fine:'Boete',fines:'Boete',partial_rent:'Deelbetaling',internet:'Internet',other:'Overig'}[p.payment_type] || p.payment_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {p.covered_months?.length > 0 ? p.covered_months.join(', ') : '-'}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800">{formatSRD(p.amount)}</td>
                  <td className="p-4 text-right">
                    {(() => {
                      const hasStored = p.remaining_rent !== null && p.remaining_rent !== undefined;
                      const rem = hasStored
                        ? (p.remaining_rent || 0) + (p.remaining_service || 0) + (p.remaining_fines || 0) + (p.remaining_internet || 0)
                        : (tenantMap[p.tenant_name] || tenantMap[p.tenant_code] || 0);
                      if (rem > 0) return <span className="font-bold text-red-600">{formatSRD(rem)}</span>;
                      return <span className="text-green-600 text-sm font-medium">Voldaan</span>;
                    })()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'pending' ? (
                        <>
                          <button onClick={() => handleApprove(p.payment_id)} disabled={approving === p.payment_id} className="text-green-500 hover:text-green-700 p-1 disabled:opacity-50" title="Goedkeuren"><CheckCircle className="w-5 h-5" /></button>
                          <button onClick={() => handleReject(p.payment_id)} disabled={approving === p.payment_id} className="text-red-400 hover:text-red-600 p-1 disabled:opacity-50" title="Afwijzen"><XCircle className="w-5 h-5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setSelectedPayment(p)} data-testid={`receipt-view-${p.payment_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Kwitantie bekijken"><FileText className="w-4 h-4" /></button>
                          <button onClick={() => onDeletePayment(p.payment_id)} data-testid={`delete-payment-${p.payment_id}`} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-slate-100">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Geen betalingen gevonden</div>
        ) : payments.map(p => {
          const hasStored = p.remaining_rent !== null && p.remaining_rent !== undefined;
          const rem = hasStored
            ? (p.remaining_rent || 0) + (p.remaining_service || 0) + (p.remaining_fines || 0) + (p.remaining_internet || 0)
            : (tenantMap[p.tenant_name] || tenantMap[p.tenant_code] || 0);
          return (
            <div key={p.payment_id} className="p-4">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{p.tenant_name}</p>
                  <p className="text-xs text-slate-400">{p.apartment_number} · {new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <p className="font-bold text-slate-900">{formatSRD(p.amount)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {{monthly_rent:'Maandhuur',rent:'Huur',service_costs:'Service',deposit:'Borg',fine:'Boete',fines:'Boete',partial_rent:'Deelbetaling',internet:'Internet',other:'Overig'}[p.payment_type] || p.payment_type}
                </span>
                <span className="text-[10px] text-orange-600 font-mono">{p.kwitantie_nummer}</span>
                {p.status === 'pending' && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">IN AFWACHTING</span>}
                {p.status === 'rejected' && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">AFGEWEZEN</span>}
              </div>
              {p.covered_months?.length > 0 && (
                <p className="text-xs text-slate-500 mb-1.5">Periode: {p.covered_months.join(', ')}</p>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
                <span className="text-xs">
                  {p.status === 'pending' ? <span className="font-medium text-yellow-600">Wacht op goedkeuring</span> : rem > 0 ? <span className="font-bold text-red-600">Open: {formatSRD(rem)}</span> : <span className="text-green-600 font-medium">Voldaan</span>}
                </span>
                <div className="flex items-center gap-0.5">
                  {p.status === 'pending' ? (
                    <>
                      <button onClick={() => handleApprove(p.payment_id)} disabled={approving === p.payment_id} className="text-green-500 hover:text-green-700 p-1.5 disabled:opacity-50"><CheckCircle className="w-5 h-5" /></button>
                      <button onClick={() => handleReject(p.payment_id)} disabled={approving === p.payment_id} className="text-red-400 hover:text-red-600 p-1.5 disabled:opacity-50"><XCircle className="w-5 h-5" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setSelectedPayment(p)} className="text-slate-400 hover:text-orange-500 p-1.5"><FileText className="w-4 h-4" /></button>
                      <button onClick={() => onDeletePayment(p.payment_id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Kwitantie Preview Modal - alleen bon */}
    {selectedPayment && (() => {
      const matchedTenant = (tenants || []).find(t => t.name === selectedPayment.tenant_name || t.tenant_code === selectedPayment.tenant_code) || null;
      return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Receipt - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex justify-center">
            <ReceiptTicket payment={selectedPayment} tenant={matchedTenant} preview={true} stampData={stampData} />
          </div>
          {/* Bottom actions - always visible */}
          <div className="flex items-center gap-2 p-3 border-t border-slate-100 flex-shrink-0">
            <button onClick={handlePrint} data-testid="receipt-print-btn" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">
              <Receipt className="w-4 h-4" /> Afdrukken
            </button>
            <button onClick={() => setSelectedPayment(null)} className="px-6 py-2.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl text-sm font-medium">
              Sluiten
            </button>
          </div>
        </div>
      </div>
      );
    })()}
    </>
  );
}



export default PaymentsTab;
