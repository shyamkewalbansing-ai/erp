import { useState } from 'react';
import { ArrowLeft, ArrowRight, User, CreditCard, Wallet, FileText, CheckCircle, Home, Clock, X, Wifi, Printer, Download } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatMoney(amount, currency) {
  const cur = (currency || 'SRD').toString().toUpperCase();
  return `${cur} ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Open a payment's receipt and trigger print/download.
// Uses window.location.origin to stay on the CURRENT subdomain (so users on custom subdomains
// don't get redirected to the primary facturatie.sr origin). The /api/kiosk/public/receipt/
// endpoint is routed through nginx on every custom subdomain.
function printPaymentReceipt(payment) {
  if (!payment?.payment_id) return;
  const origin = window.location.origin;
  const url = `${origin}/api/kiosk/public/receipt/${payment.payment_id}?autoprint=1`;
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w || w.closed || typeof w.closed === 'undefined') {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

const TYPE_LABELS = { rent: 'Huur', partial_rent: 'Gedeeltelijk', service_costs: 'Servicekosten', fines: 'Boetes', deposit: 'Borg' };
const METHOD_LABELS = { cash: 'Contant', card: 'Pinpas', mope: 'Mope', bank: 'Bank', pin: 'PIN' };

// Inline fullscreen PDF preview modal — werkt ook in PWA standalone mode
function PdfModal({ html, onClose, onPrint, fileName = 'rapport.pdf' }) {
  const handleDownload = () => {
    // Download als HTML bestand (browser kan dit dan zelf "afdrukken als PDF")
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/85 backdrop-blur-sm flex flex-col" data-testid="kiosk-pdf-modal">
      {/* Top toolbar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">Financieel Overzicht</p>
            <p className="text-[11px] text-slate-500 truncate">Klaar om te downloaden of af te drukken</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onPrint}
            data-testid="kiosk-pdf-print-btn"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Afdrukken / PDF</span>
            <span className="sm:hidden">Print</span>
          </button>
          <button
            onClick={handleDownload}
            data-testid="kiosk-pdf-download-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-lg transition active:scale-95"
            title="Download als HTML"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            data-testid="kiosk-pdf-close-btn"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition active:scale-95"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Sluiten</span>
          </button>
        </div>
      </div>

      {/* Iframe preview */}
      <div className="flex-1 bg-slate-100 overflow-hidden">
        <iframe
          id="kiosk-pdf-iframe"
          title="Financieel Overzicht"
          srcDoc={html}
          className="w-full h-full bg-white"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}

export default function KioskTenantOverview({ tenant, onBack, onPay, companyId, variant = 'default' }) {
  const cur = (tenant?.currency || 'SRD').toUpperCase();
  const fmt = (v) => formatMoney(v, cur);
  const [showHistory, setShowHistory] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pdfHtml, setPdfHtml] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) + (tenant.internet_outstanding || 0);
  const hasDebt = total > 0;

  const loadHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/payments`);
      setPayments(res.data);
    } catch { setPayments([]); }
    finally { setLoadingHistory(false); }
  };

  const items = [
    { label: 'Maandhuur', value: tenant.monthly_rent || 0, icon: Home },
    { label: 'Openstaande huur', value: tenant.outstanding_rent || 0, icon: Wallet, highlight: true, overdue: tenant.overdue_months },
    { label: 'Servicekosten', value: tenant.service_costs || 0, icon: FileText },
    { label: 'Boetes', value: tenant.fines || 0, icon: FileText },
    { label: 'Internet', value: tenant.internet_outstanding || 0, icon: Wifi },
  ];

  const handleExportPDF = async () => {
    setGeneratingPdf(true);
    // Always fetch fresh payment history for the PDF
    let history = payments;
    if (!history || history.length === 0) {
      try {
        const res = await axios.get(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/payments`);
        history = res.data || [];
      } catch { history = []; }
    }

    const generatedAt = new Date().toLocaleString('nl-NL', { timeZone: 'America/Paramaribo', dateStyle: 'full', timeStyle: 'short' });
    const overdueStr = (tenant.overdue_months && tenant.overdue_months.length) ? tenant.overdue_months.join(', ') : '—';

    const itemRows = items.map((it) => `
      <tr>
        <td class="label">${it.label}</td>
        <td class="value">${fmt(it.value)}</td>
      </tr>`).join('');

    const historyRows = (history || []).slice(0, 30).map((p) => {
      const d = p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      const type = TYPE_LABELS[p.payment_type] || (p.payment_type || '').replace('_', ' ');
      const periode = (p.covered_months || []).join(', ') || '-';
      const ontvangen = p.processed_by || '-';
      return `
      <tr>
        <td>${d}</td>
        <td>${type}</td>
        <td>${periode}</td>
        <td>${ontvangen}</td>
        <td class="amount">${formatMoney(p.amount, p.currency || cur)}</td>
        <td class="receipt">${p.kwitantie_nummer || '-'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<title>Financieel Overzicht — ${tenant.name}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px 28px; color: #1e293b; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FF5C00; padding-bottom: 16px; margin-bottom: 22px; }
  .header h1 { font-size: 22px; margin: 0; color: #0f172a; letter-spacing: -0.5px; }
  .header .subtitle { color: #FF5C00; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .header .meta { text-align: right; font-size: 11px; color: #64748b; }
  .header .meta strong { color: #0f172a; }
  .tenant-card { background: #0f172a; color: #fff; border-radius: 12px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .tenant-card .name { font-size: 16px; font-weight: 700; }
  .tenant-card .meta { font-size: 11px; opacity: 0.7; margin-top: 2px; }
  .tenant-card .total-label { font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1.5px; }
  .tenant-card .total-amount { font-size: 22px; font-weight: 800; color: #FF8A3D; }
  h2 { font-size: 14px; color: #0f172a; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #FFF4EC; color: #C74600; padding: 8px 10px; border-bottom: 2px solid #FF5C00; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:nth-child(even) td { background: #fafbfc; }
  .items td.label { color: #64748b; width: 65%; }
  .items td.value { font-weight: 700; color: #0f172a; text-align: right; }
  .amount { text-align: right; font-weight: 700; color: #0f172a; }
  .receipt { font-family: monospace; color: #64748b; font-size: 10px; text-align: right; }
  .overdue-banner { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 14px; border-radius: 8px; font-size: 11px; margin-bottom: 16px; }
  .overdue-banner strong { color: #7f1d1d; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Financieel Overzicht</h1>
      <div class="subtitle">Huurder rapport</div>
    </div>
    <div class="meta">
      <div><strong>${generatedAt}</strong></div>
      <div>Suriname (UTC-3)</div>
    </div>
  </div>

  <div class="tenant-card">
    <div>
      <div class="name">${tenant.name}</div>
      <div class="meta">Appartement ${tenant.apartment_number || '-'} · ${tenant.tenant_code || ''}</div>
    </div>
    <div style="text-align:right">
      <div class="total-label">Totaal openstaand</div>
      <div class="total-amount">${fmt(total)}</div>
    </div>
  </div>

  ${overdueStr !== '—' ? `<div class="overdue-banner"><strong>Achterstand:</strong> ${overdueStr}</div>` : ''}

  <h2>Saldi</h2>
  <table class="items">
    <tbody>${itemRows}</tbody>
  </table>

  <h2>Betalingsgeschiedenis (laatste 30)</h2>
  <table>
    <thead>
      <tr>
        <th>Datum</th>
        <th>Type</th>
        <th>Periode</th>
        <th>Ontvangen door</th>
        <th style="text-align:right">Bedrag</th>
        <th style="text-align:right">Kwitantie</th>
      </tr>
    </thead>
    <tbody>${historyRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">Geen betalingen geregistreerd.</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <div>${tenant.name} · Appartement ${tenant.apartment_number || '-'}</div>
    <div>Gegenereerd via SuriRent Kiosk</div>
  </div>
</body>
</html>`;

    // Auto-trigger native print only for new-window flow; inline modal uses its own button
    const htmlWithAutoPrint = html.replace(
      '</body>',
      `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script></body>`
    );

    // Detect PWA standalone mode — in PWA window.open opent een venster
    // zonder browser UI (geen sluit-knop), wat de gebruiker vast zet.
    // Altijd inline modal gebruiken in PWA. Op normale browser gebruik nieuw venster.
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      setPdfHtml(html);
      setGeneratingPdf(false);
      return;
    }

    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) {
      // Pop-up geblokkeerd — fallback naar inline modal
      setPdfHtml(html);
      setGeneratingPdf(false);
      return;
    }
    w.document.open();
    w.document.write(htmlWithAutoPrint);
    w.document.close();
    setGeneratingPdf(false);
  };

  const handlePrintInline = () => {
    // Print de iframe content
    const iframe = document.getElementById('kiosk-pdf-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.print();
      }
    }
  };

  if (variant === 'huurder') {
    return (
      <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 3vw 0' }}>
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ minHeight: '7vh', padding: '1vh 0.5vw' }}>
          <button onClick={onBack} className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }} data-testid="back-btn">
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
          <div className="flex items-center gap-2 text-white">
            <User style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-subtitle truncate max-w-[40vw]">{tenant.name}</span>
            <span className="kiosk-body opacity-70 whitespace-nowrap">Appt. {tenant.apartment_number}</span>
          </div>
          <div className="hidden sm:block" style={{ width: '6vw' }} />
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
          <div className="bg-white flex flex-col" style={{ width: 'clamp(300px, 90vw, 860px)', borderRadius: 'clamp(16px, 2vh, 28px)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* Tenant banner */}
            <div className="bg-slate-900 text-white flex items-center justify-between" style={{ padding: 'clamp(14px, 2.5vh, 32px) clamp(16px, 2vw, 36px)' }}>
              <div className="flex items-center" style={{ gap: 'clamp(8px, 1vw, 18px)' }}>
                <div className="rounded-full bg-white/10 flex items-center justify-center" style={{ width: '5vh', height: '5vh' }}>
                  <User style={{ width: '2.5vh', height: '2.5vh' }} className="text-white" />
                </div>
                <div>
                  <p className="kiosk-subtitle font-bold">{tenant.name}</p>
                  <p className="kiosk-small opacity-60">Appartement {tenant.apartment_number} · {tenant.tenant_code}</p>
                </div>
              </div>
              <div className="text-right flex items-center" style={{ gap: 'clamp(8px, 1vw, 14px)' }}>
                <button
                  onClick={handleExportPDF}
                  disabled={generatingPdf}
                  data-testid="kiosk-export-pdf-btn-huurder"
                  title="Financieel overzicht opslaan als PDF"
                  className="inline-flex items-center bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-lg transition active:scale-95"
                  style={{ gap: 'clamp(4px, 0.4vw, 8px)', padding: 'clamp(6px, 0.9vh, 12px) clamp(10px, 1.2vw, 18px)', fontSize: 'clamp(11px, 1.3vh, 14px)' }}
                >
                  <Download style={{ width: '1.8vh', height: '1.8vh' }} />
                  <span>{generatingPdf ? '...' : 'PDF'}</span>
                </button>
                <div>
                  <p className="kiosk-small opacity-60">Totaal openstaand</p>
                  <p className="kiosk-amount-md whitespace-nowrap">{fmt(total)}</p>
                </div>
              </div>
            </div>

            {/* Financial tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'clamp(6px, 0.8vw, 14px)', padding: 'clamp(12px, 2vh, 28px) clamp(14px, 2vw, 32px)' }}>
              {items.map((item, i) => {
                const Icon = item.icon;
                const isHighlight = item.highlight && item.value > 0;
                return (
                  <div key={i} className={`flex items-center justify-between rounded-xl transition ${isHighlight ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50 border-2 border-transparent'}`}
                    style={{ padding: 'clamp(10px, 1.8vh, 24px) clamp(10px, 1.2vw, 20px)' }}>
                    <div className="flex items-center" style={{ gap: 'clamp(6px, 0.8vw, 14px)' }}>
                      <div className={`rounded-lg flex items-center justify-center ${isHighlight ? 'bg-orange-100' : 'bg-white'}`} style={{ width: '4vh', height: '4vh' }}>
                        <Icon style={{ width: '2vh', height: '2vh' }} className={isHighlight ? 'text-orange-500' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className={`kiosk-body font-semibold ${isHighlight ? 'text-orange-700' : 'text-slate-500'}`}>{item.label}</span>
                        {item.overdue?.length > 0 && (
                          <p style={{ fontSize: '10px' }} className="text-red-500 font-medium">{item.overdue.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <span className={`kiosk-subtitle whitespace-nowrap ${isHighlight ? 'text-orange-600' : 'text-slate-800'}`}>{fmt(item.value)}</span>
                  </div>
                );
              })}
            </div>

            {/* Action bar */}
            <div style={{ padding: '0 clamp(14px, 2vw, 32px) clamp(14px, 2.5vh, 32px)' }}>
              {hasDebt ? (
                <>
                  <button onClick={onPay} data-testid="pay-btn"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98]"
                    style={{ padding: 'clamp(12px, 2.2vh, 28px)', marginBottom: '1vh' }}>
                    <span className="kiosk-btn-text">Betalen — {fmt(total)}</span>
                    <ArrowRight style={{ width: '2.5vh', height: '2.5vh' }} />
                  </button>
                  <button onClick={loadHistory} data-testid="history-btn"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center gap-2 rounded-xl transition"
                    style={{ padding: 'clamp(8px, 1.4vh, 18px)' }}>
                    <Clock style={{ width: '1.8vh', height: '1.8vh' }} />
                    <span className="kiosk-small font-semibold">Betalingsgeschiedenis</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-green-600" style={{ marginBottom: '2vh' }}>
                    <CheckCircle style={{ width: '3vh', height: '3vh' }} />
                    <span className="kiosk-subtitle font-bold">Alles betaald!</span>
                  </div>
                  <button onClick={onBack} data-testid="back-home-btn"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98]"
                    style={{ padding: 'clamp(12px, 2.2vh, 28px)', marginBottom: '1vh' }}>
                    <Home style={{ width: '2.5vh', height: '2.5vh' }} />
                    <span className="kiosk-btn-text">Terug naar start</span>
                  </button>
                  <button onClick={loadHistory} data-testid="history-btn-no-debt"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center gap-2 rounded-xl transition"
                    style={{ padding: 'clamp(8px, 1.4vh, 18px)' }}>
                    <Clock style={{ width: '1.8vh', height: '1.8vh' }} />
                    <span className="kiosk-small font-semibold">Betalingsgeschiedenis</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showHistory && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            style={{
              top: 'max(0px, env(safe-area-inset-top, 0px))',
              padding: '3vh 4vw 4vh',
            }}
            onClick={() => setShowHistory(false)}
          >
            <div className="kiosk-card w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()} data-testid="history-popup">
              <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2vw, 32px)', borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-3">
                  <Clock style={{ width: '2.5vh', height: '2.5vh' }} className="text-orange-500" />
                  <div>
                    <h2 className="kiosk-subtitle text-slate-900">Betalingsgeschiedenis</h2>
                    <p className="kiosk-small text-slate-400">{tenant.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(false)} className="bg-slate-100 hover:bg-slate-200 flex items-center justify-center rounded-lg transition" style={{ width: '4vh', height: '4vh' }}>
                  <X style={{ width: '2vh', height: '2vh' }} className="text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto" style={{ padding: 'clamp(8px, 1.5vh, 20px) clamp(12px, 1.5vw, 24px)' }}>
                {loadingHistory ? (
                  <div className="text-center" style={{ padding: '4vh 0' }}><div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="kiosk-body text-slate-400">Laden...</p></div>
                ) : payments.length === 0 ? (
                  <div className="text-center" style={{ padding: '4vh 0' }}><p className="kiosk-subtitle text-slate-400">Geen betalingen gevonden</p></div>
                ) : (
                  <div>{payments.map((p, i) => { const date = p.created_at ? new Date(p.created_at) : null; const dateStr = date ? date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; const periode = p.covered_months?.length > 0 ? p.covered_months.join(', ') : ''; const ontvangen = p.processed_by || ''; const goedgekeurd = p.approved_by && p.approved_by !== p.processed_by ? p.approved_by : ''; return (<div key={p.payment_id || i} className="kiosk-card-row flex items-center justify-between gap-2"><div className="flex items-center gap-3 min-w-0 flex-1"><CheckCircle style={{ width: '2vh', height: '2vh' }} className="text-green-500 flex-shrink-0" /><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="kiosk-body font-bold text-slate-900">{formatMoney(p.amount, p.currency || cur)}</span><span className="kiosk-small px-2 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">{TYPE_LABELS[p.payment_type] || p.payment_type}</span></div><p className="kiosk-small text-slate-400">{dateStr} · {p.kwitantie_nummer || ''}</p>{periode && <p className="kiosk-small text-slate-500 font-medium">Periode: {periode}</p>}{ontvangen && <p className="kiosk-small text-slate-500 font-medium">Ontvangen door: <span className="text-slate-700 font-semibold">{ontvangen}</span></p>}{goedgekeurd && <p className="kiosk-small text-slate-500 font-medium">Goedgekeurd door: <span className="text-slate-700 font-semibold">{goedgekeurd}</span></p>}</div></div><button onClick={(e) => { e.stopPropagation(); printPaymentReceipt(p); }} data-testid={`h-huurder-print-${i}`} title="Kwitantie afdrukken" className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition active:scale-95 flex-shrink-0"><Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Afdruk</span></button></div>); })}</div>
                )}
              </div>
              <div style={{ padding: 'clamp(8px, 1.5vh, 16px) clamp(12px, 1.5vw, 24px)', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setShowHistory(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition kiosk-body font-bold" style={{ padding: 'clamp(8px, 1.5vh, 16px)' }}>Sluiten</button>
              </div>
            </div>
          </div>
        )}

        {pdfHtml && <PdfModal html={pdfHtml} onClose={() => setPdfHtml(null)} onPrint={handlePrintInline} fileName={`Financieel-${tenant.name}-${tenant.apartment_number || ''}.pdf`} />}
      </div>
    );
  }

  return (
    <div className="h-full bg-orange-500 flex flex-col p-3 sm:p-6 pt-2 sm:pt-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-2 sm:py-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">Terug</span>
        </button>
        <div className="flex items-center gap-2 text-white">
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base font-semibold truncate max-w-[35vw] sm:max-w-[30vw]">{tenant.name}</span>
          <span className="text-xs sm:text-sm opacity-70 whitespace-nowrap">Appt. {tenant.apartment_number}</span>
        </div>
        <div className="hidden sm:block w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 min-h-0 overflow-auto pb-2">
        {/* Left panel - Financial overview */}
        <div className="kiosk-card flex-none md:flex-[3] flex flex-col min-w-0">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="text-sm sm:text-base font-semibold text-slate-800">Financieel overzicht</span>
            <button
              onClick={handleExportPDF}
              disabled={generatingPdf}
              data-testid="kiosk-export-pdf-btn"
              title="Financieel overzicht opslaan als PDF"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generatingPdf ? '...' : 'PDF'}</span>
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-center rounded bg-slate-50 w-8 h-8 sm:w-9 sm:h-9">
                    <item.icon className={`w-4 h-4 ${item.highlight && item.value > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <span className={`text-sm sm:text-base ${item.highlight ? 'text-orange-600 font-bold' : 'text-slate-600'}`}>{item.label}</span>
                    {item.overdue?.length > 0 && (
                      <p className="text-[11px] text-red-500 font-medium">{item.overdue.join(', ')}</p>
                    )}
                  </div>
                </div>
                <span className={`text-sm sm:text-base font-semibold whitespace-nowrap ${item.highlight ? 'text-orange-600' : 'text-slate-800'}`}>
                  {fmt(item.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 flex items-center justify-between p-3 sm:p-4 border-t-2 border-slate-200">
            <span className="text-sm sm:text-base font-semibold text-slate-600">Totaal openstaand</span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 whitespace-nowrap">{fmt(total)}</span>
          </div>
        </div>

        {/* Right panel - Action card */}
        <div className="kiosk-card flex-none md:flex-[2] flex flex-col items-center justify-center min-w-0 text-center p-4 sm:p-6">
          {hasDebt ? (
            <>
              <div className="rounded-full bg-orange-50 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-5">
                <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
              </div>
              <p className="text-sm text-slate-400 mb-1">Te betalen</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 whitespace-nowrap mb-4 sm:mb-6">{fmt(total)}</p>
              <button onClick={onPay} data-testid="pay-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98] py-3 sm:py-4">
                <span className="text-base sm:text-lg font-bold">Volgende</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={loadHistory} data-testid="history-btn"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center gap-2 rounded-xl transition mt-2 py-2.5 sm:py-3">
                <Clock className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">Betalingsgeschiedenis</span>
              </button>
            </>
          ) : (
            <>
              <div className="rounded-full bg-green-50 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-5">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-700 mb-1">Alles betaald!</p>
              <p className="text-sm text-green-500 mb-4 sm:mb-6">Geen openstaand saldo</p>
              <button onClick={onBack} data-testid="back-home-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 rounded-xl transition active:scale-[0.98] py-3 sm:py-4">
                <Home className="w-5 h-5" />
                <span className="text-base sm:text-lg font-bold">Terug naar start</span>
              </button>
              <button onClick={loadHistory} data-testid="history-btn-no-debt"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center gap-2 rounded-xl transition mt-2 py-2.5 sm:py-3">
                <Clock className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">Betalingsgeschiedenis</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment History Overlay */}
      {showHistory && (
        <div
          className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          style={{
            top: 'max(0px, env(safe-area-inset-top, 0px))',
            padding: '3vh 4vw 4vh',
          }}
          onClick={() => setShowHistory(false)}
        >
          <div className="kiosk-card w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()} data-testid="history-popup">
            <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2vw, 32px)', borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <Clock style={{ width: '2.5vh', height: '2.5vh' }} className="text-orange-500" />
                <div>
                  <h2 className="kiosk-subtitle text-slate-900">Betalingsgeschiedenis</h2>
                  <p className="kiosk-small text-slate-400">{tenant.name}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="bg-slate-100 hover:bg-slate-200 flex items-center justify-center rounded-lg transition" style={{ width: '4vh', height: '4vh' }} data-testid="history-close-btn">
                <X style={{ width: '2vh', height: '2vh' }} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'clamp(8px, 1.5vh, 20px) clamp(12px, 1.5vw, 24px)' }}>
              {loadingHistory ? (
                <div className="text-center" style={{ padding: '4vh 0' }}>
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="kiosk-body text-slate-400">Laden...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center" style={{ padding: '4vh 0' }}>
                  <p className="kiosk-subtitle text-slate-400">Geen betalingen gevonden</p>
                </div>
              ) : (
                <div>
                  {payments.map((p, i) => {
                    const date = p.created_at ? new Date(p.created_at) : null;
                    const dateStr = date ? date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                    const periode = p.covered_months?.length > 0 ? p.covered_months.join(', ') : '';
                    const ontvangen = p.processed_by || '';
                    const goedgekeurd = p.approved_by && p.approved_by !== p.processed_by ? p.approved_by : '';
                    return (
                      <div key={p.payment_id || i} className="kiosk-card-row flex items-center justify-between gap-2" data-testid={`history-item-${i}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <CheckCircle style={{ width: '2vh', height: '2vh' }} className="text-green-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="kiosk-body font-bold text-slate-900">{formatMoney(p.amount, p.currency || cur)}</span>
                              <span className="kiosk-small px-2 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">{TYPE_LABELS[p.payment_type] || p.payment_type}</span>
                              <span className="kiosk-small px-2 py-0.5 rounded bg-slate-100 text-slate-600">{METHOD_LABELS[p.payment_method] || p.payment_method || 'Contant'}</span>
                            </div>
                            <p className="kiosk-small text-slate-400">{dateStr} · {p.kwitantie_nummer || ''}</p>
                            {periode && <p className="kiosk-small text-slate-500 font-medium">Periode: {periode}</p>}
                            {ontvangen && <p className="kiosk-small text-slate-500 font-medium">Ontvangen door: <span className="text-slate-700 font-semibold">{ontvangen}</span></p>}
                            {goedgekeurd && <p className="kiosk-small text-slate-500 font-medium">Goedgekeurd door: <span className="text-slate-700 font-semibold">{goedgekeurd}</span></p>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); printPaymentReceipt(p); }}
                          data-testid={`history-print-${i}`}
                          title="Kwitantie afdrukken"
                          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition active:scale-95 flex-shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Afdruk</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: 'clamp(8px, 1.5vh, 16px) clamp(12px, 1.5vw, 24px)', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setShowHistory(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition kiosk-body font-bold" style={{ padding: 'clamp(8px, 1.5vh, 16px)' }}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfHtml && <PdfModal html={pdfHtml} onClose={() => setPdfHtml(null)} onPrint={handlePrintInline} fileName={`Financieel-${tenant.name}-${tenant.apartment_number || ''}.pdf`} />}
    </div>
  );
}
