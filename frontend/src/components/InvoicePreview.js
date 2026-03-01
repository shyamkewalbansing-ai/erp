import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Printer, Download, X } from 'lucide-react';

const InvoicePreview = ({ 
  open, 
  onClose, 
  invoice, 
  customer, 
  bedrijf,
  onDownloadPdf 
}) => {
  const printRef = useRef(null);

  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factuur ${invoice.factuurnummer || 'NIEUW'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 10pt;
              color: #1e293b;
              padding: 20mm;
              max-width: 210mm;
              margin: 0 auto;
            }
            .accent-bar {
              height: 4mm;
              background: #22c55e;
              margin-bottom: 8mm;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10mm;
            }
            .company-name {
              font-size: 16pt;
              font-weight: bold;
              color: #22c55e;
            }
            .company-info {
              font-size: 8pt;
              color: #64748b;
              text-align: right;
              line-height: 1.5;
            }
            .title {
              font-size: 20pt;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 8mm;
            }
            .info-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10mm;
            }
            .client-info {
              font-size: 9pt;
            }
            .client-name {
              font-weight: bold;
              margin-bottom: 2mm;
            }
            .invoice-details {
              text-align: right;
            }
            .detail-label {
              font-size: 7pt;
              color: #64748b;
              text-transform: uppercase;
            }
            .detail-value {
              font-size: 10pt;
              color: #1e293b;
              margin-bottom: 3mm;
            }
            .factuurnummer {
              color: #22c55e;
              font-weight: bold;
              font-size: 11pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8mm;
            }
            th {
              text-align: left;
              font-size: 8pt;
              color: #64748b;
              font-weight: bold;
              padding: 8px 5px;
              border-bottom: 2px solid #22c55e;
            }
            th.right {
              text-align: right;
            }
            td {
              padding: 8px 5px;
              font-size: 9pt;
              border-bottom: 1px solid #e2e8f0;
            }
            td.right {
              text-align: right;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            .totals-section {
              display: flex;
              justify-content: space-between;
              margin-top: 5mm;
            }
            .btw-breakdown {
              font-size: 8pt;
            }
            .btw-breakdown th, .btw-breakdown td {
              padding: 4px 8px;
            }
            .totals {
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3mm;
            }
            .total-label {
              font-size: 9pt;
              color: #64748b;
            }
            .total-value {
              font-size: 9pt;
              color: #1e293b;
            }
            .grand-total {
              border-top: 2px solid #22c55e;
              padding-top: 5mm;
              margin-top: 5mm;
            }
            .grand-total .total-label {
              font-size: 11pt;
              font-weight: bold;
              color: #1e293b;
            }
            .grand-total .total-value {
              font-size: 14pt;
              font-weight: bold;
              color: #22c55e;
            }
            .footer {
              margin-top: 10mm;
              font-size: 8pt;
              color: #64748b;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Calculate totals
  const lines = invoice.lines || [];
  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const btwTotal = lines.reduce((s, l) => s + (parseFloat(l.btw_amount) || 0), 0);
  const total = subtotal + btwTotal;

  // BTW breakdown
  const btwBreakdown = {};
  lines.forEach(line => {
    const perc = parseFloat(line.btw_percentage) || 0;
    const bedragExcl = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
    const btwBedrag = bedragExcl * (perc / 100);
    
    if (!btwBreakdown[perc]) {
      btwBreakdown[perc] = { over: 0, bedrag: 0 };
    }
    btwBreakdown[perc].over += bedragExcl;
    btwBreakdown[perc].bedrag += btwBedrag;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle>Afdrukvoorbeeld</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-lg">
                <Printer className="w-4 h-4 mr-2" />
                Afdrukken
              </Button>
              {onDownloadPdf && (
                <Button variant="outline" size="sm" onClick={onDownloadPdf} className="rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Preview Content */}
        <div className="p-6 bg-slate-100">
          <div 
            ref={printRef}
            className="bg-white shadow-lg mx-auto"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              padding: '15mm',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {/* Green Accent Bar */}
            <div className="h-1 bg-emerald-500 mb-6" />
            
            {/* Header */}
            <div className="flex justify-between mb-8">
              <div></div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-500 mb-2">
                  {bedrijf?.bedrijfsnaam || 'Mijn Bedrijf'}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  {bedrijf?.adres && <div>{bedrijf.adres}</div>}
                  {(bedrijf?.postcode || bedrijf?.plaats) && (
                    <div>{bedrijf.postcode} {bedrijf.plaats}</div>
                  )}
                  {bedrijf?.kvk_nummer && <div className="mt-2">KvK nr: {bedrijf.kvk_nummer}</div>}
                  {bedrijf?.btw_nummer && <div>BTW nr: {bedrijf.btw_nummer}</div>}
                  {bedrijf?.bank_rekening && (
                    <>
                      <div className="mt-2">Bank: {bedrijf.bank_naam}</div>
                      <div>IBAN: {bedrijf.bank_rekening}</div>
                    </>
                  )}
                  {bedrijf?.telefoon && <div className="mt-2">Tel: {bedrijf.telefoon}</div>}
                  {bedrijf?.email && <div>Email: {bedrijf.email}</div>}
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Factuur</h1>
            
            {/* Info Grid */}
            <div className="flex justify-between mb-8">
              {/* Client Info */}
              <div className="text-sm">
                <div className="text-xs text-slate-500 mb-1">Aan:</div>
                <div className="font-bold text-slate-900">{customer?.naam || '-'}</div>
                {customer?.adres && <div className="text-slate-700">{customer.adres}</div>}
                {(customer?.postcode || customer?.plaats) && (
                  <div className="text-slate-700">{customer.postcode} {customer.plaats}</div>
                )}
              </div>
              
              {/* Invoice Details */}
              <div className="text-right">
                <div className="mb-3">
                  <div className="text-xs text-emerald-600 font-bold">Factuurnummer</div>
                  <div className="text-sm text-slate-900">{invoice.factuurnummer || 'NIEUW'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Factuurdatum</div>
                  <div className="text-sm text-slate-900">{formatDate(invoice.date)}</div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Vervaldatum</div>
                  <div className="text-sm text-slate-900">{formatDate(invoice.due_date)}</div>
                </div>
                {invoice.reference && (
                  <div>
                    <div className="text-xs text-slate-500">Uw referentie</div>
                    <div className="text-sm text-slate-900">{invoice.reference}</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Line Items Table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-emerald-500">
                  <th className="text-left text-xs text-slate-500 font-bold py-2 px-1">OMSCHRIJVING</th>
                  <th className="text-right text-xs text-slate-500 font-bold py-2 px-1">AANTAL</th>
                  <th className="text-right text-xs text-slate-500 font-bold py-2 px-1">STUKSPRIJS</th>
                  <th className="text-right text-xs text-slate-500 font-bold py-2 px-1">BTW</th>
                  <th className="text-right text-xs text-slate-500 font-bold py-2 px-1">TOTAAL</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter(l => !l.isTextLine || l.description).map((line, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                    <td className="py-2 px-1 text-sm text-slate-900 border-b border-slate-100">
                      {line.description || '-'}
                    </td>
                    <td className="py-2 px-1 text-sm text-slate-900 text-right border-b border-slate-100">
                      {line.isTextLine ? '' : line.quantity}
                    </td>
                    <td className="py-2 px-1 text-sm text-slate-900 text-right border-b border-slate-100">
                      {line.isTextLine ? '' : formatAmount(line.unit_price, invoice.currency)}
                    </td>
                    <td className="py-2 px-1 text-sm text-slate-900 text-right border-b border-slate-100">
                      {line.isTextLine ? '' : `${line.btw_percentage}%`}
                    </td>
                    <td className="py-2 px-1 text-sm text-slate-900 text-right border-b border-slate-100">
                      {line.isTextLine ? '' : formatAmount(line.total || 0, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals Section */}
            <div className="flex justify-between">
              {/* BTW Breakdown */}
              <div className="text-xs">
                <table className="border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-1 px-2 text-slate-500 font-bold">BTW%</th>
                      <th className="text-right py-1 px-2 text-slate-500 font-bold">OVER</th>
                      <th className="text-right py-1 px-2 text-slate-500 font-bold">BEDRAG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(btwBreakdown).sort(([a], [b]) => Number(a) - Number(b)).map(([perc, data]) => (
                      <tr key={perc}>
                        <td className="py-1 px-2 text-slate-700">{perc}%</td>
                        <td className="py-1 px-2 text-slate-700 text-right">{formatAmount(data.over, invoice.currency)}</td>
                        <td className="py-1 px-2 text-slate-700 text-right">{formatAmount(data.bedrag, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Totals */}
              <div className="text-right">
                <div className="flex justify-between gap-8 mb-2">
                  <span className="text-sm text-slate-500">TOTAAL EXCL BTW</span>
                  <span className="text-sm text-slate-900">{formatAmount(subtotal, invoice.currency)}</span>
                </div>
                
                <div className="border-t-2 border-emerald-500 pt-3 mt-3">
                  <div className="flex justify-between gap-8">
                    <span className="text-base font-bold text-slate-900">TOTAAL</span>
                    <span className="text-lg font-bold text-emerald-600">{formatAmount(total, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-xs text-slate-500">
              <p>
                Gelieve het bedrag van {formatAmount(total, invoice.currency)} over te maken onder vermelding van factuurnummer {invoice.factuurnummer || 'NIEUW'}.
              </p>
            </div>
            
            {/* Notes */}
            {invoice.notes && (
              <div className="mt-4 text-xs text-slate-500">
                <div className="font-bold mb-1">Opmerkingen:</div>
                <p>{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;
