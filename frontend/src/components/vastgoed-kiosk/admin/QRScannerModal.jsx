import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrCode, AlertCircle, CheckCircle, Loader2, Receipt, DollarSign } from 'lucide-react';
import MobileModalShell from './MobileModalShell';
import AddRentModal from './AddRentModal';
import { API, axios } from './utils';

/**
 * QR Scanner Modal — scans a receipt QR code and shows the receipt IN a popup
 * (no new tab). Includes an action button to register outstanding amounts for
 * that tenant via the existing AddRentModal flow.
 */
function QRScannerModal({ onClose, token, onRefresh }) {
  const [status, setStatus] = useState('starting'); // starting | scanning | loading | found | error
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedUrl, setScannedUrl] = useState('');
  const [payment, setPayment] = useState(null);
  const [tenant, setTenant] = useState(null); // Full tenant object for AddRentModal
  const [showAddRent, setShowAddRent] = useState(false);
  const scannerRef = useRef(null);
  const scannerElId = 'qr-scanner-region';

  const headers = { Authorization: `Bearer ${token}` };

  const safeStop = async (instance) => {
    if (!instance) return;
    try {
      const state = instance.getState?.();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await instance.stop();
      }
    } catch { /* already stopped — ignore */ }
    try { instance.clear(); } catch { /* noop */ }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const qr = new Html5Qrcode(scannerElId);
        scannerRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            handleScan(decodedText);
          },
          () => { /* silent */ }
        );
        if (!cancelled) setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        const msg = (err && (err.message || err.toString())) || 'Onbekende fout';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('allow')) {
          setErrorMsg('Camera toegang geweigerd. Sta camera-toegang toe in je browser instellingen.');
        } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('requested device')) {
          setErrorMsg('Geen camera gevonden op dit apparaat.');
        } else {
          setErrorMsg('Camera kon niet worden gestart. ' + msg);
        }
      }
    })();

    return () => { cancelled = true; safeStop(scannerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScan = async (text) => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = text.match(uuidRegex);
    if (!match) {
      setStatus('error');
      setErrorMsg('QR code bevat geen geldig kwitantie-nummer.');
      setScannedUrl(text);
      return;
    }
    const pid = match[0];
    setScannedUrl(text);
    setStatus('loading');
    await safeStop(scannerRef.current);

    // Fetch payment details via admin API
    try {
      const { data: p } = await axios.get(`${API}/admin/payments/${pid}`, { headers });
      setPayment(p);
      // Try to load the full tenant (for AddRentModal compatibility)
      if (p.tenant_id) {
        try {
          const { data: tenants } = await axios.get(`${API}/admin/tenants`, { headers });
          const t = Array.isArray(tenants) ? tenants.find(x => x.tenant_id === p.tenant_id) : null;
          if (t) setTenant(t);
        } catch { /* ignore - button still works via payment-only fallback */ }
      }
      setStatus('found');
    } catch (err) {
      setStatus('error');
      const detail = err.response?.data?.detail || '';
      if (err.response?.status === 404) {
        setErrorMsg('Kwitantie niet gevonden in dit systeem. Mogelijk is deze voor een ander bedrijf of verwijderd.');
      } else {
        setErrorMsg('Ophalen mislukt: ' + (detail || err.message || 'Onbekende fout'));
      }
    }
  };

  const handleRegisterPayment = () => {
    if (!tenant) {
      alert('Huurder kan niet worden geladen. Gebruik "Huurders" tab om betaling te registreren.');
      return;
    }
    setShowAddRent(true);
  };

  const formatMoney = (amount, currency = 'SRD') => {
    const cur = (currency || 'SRD').toString().toUpperCase();
    return `${cur} ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  const TYPE_LABELS = {
    rent: 'Huurbetaling', partial_rent: 'Gedeelt. huur', service_costs: 'Servicekosten',
    fines: 'Boete', deposit: 'Borgsom', internet: 'Internet',
  };
  const METHOD_LABELS = { cash: 'Contant', bank: 'Bank', pin: 'PIN', card: 'Pinpas', mope: 'Mope' };

  // If AddRentModal is open, don't render the outer QR modal (avoid z-index chaos).
  if (showAddRent && tenant) {
    return (
      <AddRentModal
        tenant={tenant}
        token={token}
        onClose={() => { setShowAddRent(false); }}
        onSave={() => {
          setShowAddRent(false);
          onRefresh?.();
          onClose(); // Close everything — user has registered a new payment
        }}
      />
    );
  }

  return (
    <MobileModalShell
      title="QR Code Scannen"
      subtitle={status === 'found' ? 'Kwitantie gevonden' : 'Scan kwitantie QR code'}
      onClose={onClose}
      hideFooter={true}
      testIdPrefix="qr-scanner"
    >
      {status === 'error' ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-red-700 mb-2">Scannen mislukt</p>
          <p className="text-xs text-slate-500 px-4">{errorMsg}</p>
          {scannedUrl && (
            <p className="text-[10px] text-slate-400 mt-3 font-mono break-all bg-slate-50 p-2 rounded">{scannedUrl}</p>
          )}
          <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition">
            Sluiten
          </button>
        </div>
      ) : status === 'loading' ? (
        <div className="text-center py-10">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Kwitantie wordt opgehaald...</p>
        </div>
      ) : status === 'found' && payment ? (
        <div>
          {/* Success header */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-green-800 truncate">Kwitantie geverifieerd</p>
              <p className="text-[11px] text-slate-500 truncate">#{payment.kwitantie_nummer || payment.payment_id?.slice(0, 8)}</p>
            </div>
          </div>

          {/* Receipt details */}
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Huurder</p>
              <p className="text-sm font-bold text-slate-900">{payment.tenant_name || '-'}</p>
              <p className="text-[11px] text-slate-500">Appt. {payment.apartment_number || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Bedrag</p>
                <p className="text-base font-bold text-orange-600">{formatMoney(payment.amount, payment.currency)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Type</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{TYPE_LABELS[payment.payment_type] || payment.payment_type}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Methode</p>
                <p className="text-sm text-slate-700">{METHOD_LABELS[payment.payment_method] || payment.payment_method}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Datum</p>
                <p className="text-sm text-slate-700">{formatDate(payment.created_at)}</p>
              </div>
            </div>
            {payment.covered_months?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Periode</p>
                <p className="text-sm text-slate-700">{payment.covered_months.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Current outstanding balance */}
          {tenant && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-orange-700 uppercase mb-2">Huidige openstaande schuld</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-slate-600">Huur:</span>
                <span className="text-right font-semibold text-slate-900">{formatMoney(tenant.outstanding_rent || 0, tenant.currency)}</span>
                <span className="text-slate-600">Servicekosten:</span>
                <span className="text-right font-semibold text-slate-900">{formatMoney(tenant.service_costs || 0, tenant.currency)}</span>
                <span className="text-slate-600">Boetes:</span>
                <span className="text-right font-semibold text-slate-900">{formatMoney(tenant.fines || 0, tenant.currency)}</span>
                <span className="text-slate-600 font-bold pt-1 border-t border-orange-200 mt-1">Totaal:</span>
                <span className="text-right font-bold text-red-600 pt-1 border-t border-orange-200 mt-1">
                  {formatMoney((tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0), tenant.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 space-y-2">
            <button
              onClick={handleRegisterPayment}
              disabled={!tenant}
              data-testid="qr-register-payment"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              Openstaand bedrag registreren
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/api/kiosk/public/receipt/${payment.payment_id}?autoprint=1`;
                  try {
                    const w = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!w || w.closed) window.location.href = url;
                  } catch { window.location.href = url; }
                }}
                data-testid="qr-print-receipt"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                <Receipt className="w-4 h-4" />
                Afdrukken
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-square">
            <div id={scannerElId} className="w-full h-full" />
            {status === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin mb-2" />
                <p className="text-sm">Camera starten...</p>
              </div>
            )}
            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-60 border-4 border-orange-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            )}
          </div>
          <p className="text-xs text-center text-slate-500 mt-4">
            Plaats de QR code van de kwitantie binnen het oranje kader.<br />
            De scan gebeurt automatisch.
          </p>
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
            <QrCode className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600">
              Na succesvolle scan zie je de kwitantie en kan je direct openstaande bedragen registreren.
            </p>
          </div>
        </div>
      )}
    </MobileModalShell>
  );
}

export default QRScannerModal;
