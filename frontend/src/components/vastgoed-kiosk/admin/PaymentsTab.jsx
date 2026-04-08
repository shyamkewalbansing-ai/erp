import { useState } from 'react';
import { Trash2, Receipt, Search, Calendar, FileText } from 'lucide-react';
import ReceiptTicket from '../ReceiptTicket';

function PaymentsTab({ payments, totalFiltered, searchTerm, setSearchTerm, selectedMonth, setSelectedMonth, formatSRD, token, company, tenants, onDeletePayment }) {
  const [selectedPayment, setSelectedPayment] = useState(null);
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

  // Lookup huurder openstaand saldo per tenant
  const tenantMap = {};
  (tenants || []).forEach(t => {
    const total = (t.outstanding_rent || 0) + (t.service_costs || 0) + (t.fines || 0) + (t.internet_outstanding || t.internet_cost || 0);
    tenantMap[t.tenant_code] = total;
    tenantMap[t.name] = total;
  });

  const PRINT_SERVER_URL = 'http://localhost:5555';
  const handlePrint = async () => {
    if (!selectedPayment) return;
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
    try {
      const hc = await fetch(`${PRINT_SERVER_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => null);
      if (hc?.ok) {
        await fetch(`${PRINT_SERVER_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(printData) });
      } else {
        window.print();
      }
    } catch { window.print(); }
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Zoek op naam, appartement, kwitantienummer..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
          >
            <option value="all">Alle maanden</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="text-right px-4 py-2 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-600">{payments.length} betalingen</p>
          <p className="text-lg font-bold text-orange-600">{formatSRD(totalFiltered)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Geen betalingen gevonden
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Datum</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Kwitantie</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Appt</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
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
                  <td className="p-4 font-mono text-sm text-orange-600">{p.kwitantie_nummer}</td>
                  <td className="p-4 font-medium text-slate-900">{p.tenant_name}</td>
                  <td className="p-4 text-slate-600">{p.apartment_number}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {{monthly_rent:'Maandhuur',service_costs:'Servicekosten',deposit:'Borg',fine:'Boete',partial_rent:'Deelbetaling',other:'Overig'}[p.payment_type] || p.payment_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800">{formatSRD(p.amount)}</td>
                  <td className="p-4 text-right">
                    {(() => {
                      const tenantOutstanding = tenantMap[p.tenant_name] || tenantMap[p.tenant_code] || 0;
                      return tenantOutstanding > 0 
                        ? <span className="font-bold text-red-600">{formatSRD(tenantOutstanding)}</span>
                        : <span className="text-green-600 text-sm font-medium">Voldaan</span>;
                    })()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        data-testid={`receipt-view-${p.payment_id}`}
                        className="text-slate-400 hover:text-orange-500 p-1"
                        title="Kwitantie bekijken"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePayment(p.payment_id)}
                        data-testid={`delete-payment-${p.payment_id}`}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {/* Kwitantie Preview Modal - alleen bon */}
    {selectedPayment && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={() => setSelectedPayment(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full max-h-[95vh] overflow-auto print:max-w-none print:rounded-none print:shadow-none" onClick={(e) => e.stopPropagation()}>
          {/* Receipt */}
          <div className="p-4 print:p-0 flex justify-center">
            <ReceiptTicket payment={selectedPayment} tenant={null} preview={true} stampData={stampData} />
          </div>
          {/* Bottom actions */}
          <div className="flex items-center gap-2 p-3 border-t border-slate-100 print:hidden">
            <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">
              <Receipt className="w-4 h-4" /> Afdrukken
            </button>
            <button onClick={() => setSelectedPayment(null)} className="px-6 py-2.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl text-sm font-medium">
              Sluiten
            </button>
          </div>
        </div>
        {/* Hidden full-size for printing */}
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
          <ReceiptTicket payment={selectedPayment} tenant={null} preview={false} stampData={stampData} />
        </div>
      </div>
    )}
    </>
  );
}



export default PaymentsTab;
