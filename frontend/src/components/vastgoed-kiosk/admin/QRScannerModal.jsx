import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrCode, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import MobileModalShell from './MobileModalShell';

/**
 * QR Scanner Modal — scans a receipt QR code and opens the verified kwitantie.
 *
 * The kwitantie QR codes link to `/api/kiosk/public/receipt/<payment_id>` or the
 * publieke verificatie URL. This scanner extracts the payment_id from the URL
 * and redirects to the verified receipt view so the Beheerder can check
 * that the physical/printed receipt matches the one in our system.
 */
function QRScannerModal({ onClose }) {
  const [status, setStatus] = useState('starting'); // starting | scanning | found | error
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedUrl, setScannedUrl] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const scannerRef = useRef(null);
  const scannerElId = 'qr-scanner-region';

  useEffect(() => {
    let qr;
    let cancelled = false;

    // Helper to safely stop the scanner (only if it's actually running).
    const safeStop = async (instance) => {
      if (!instance) return;
      try {
        const state = instance.getState?.();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await instance.stop();
        }
      } catch { /* already stopped or never started — ignore */ }
      try { instance.clear(); } catch { /* noop */ }
    };

    (async () => {
      try {
        qr = new Html5Qrcode(scannerElId);
        scannerRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            handleScan(decodedText);
          },
          () => { /* silent - scanning in progress */ }
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

    return () => {
      cancelled = true;
      safeStop(scannerRef.current);
    };
  }, []);

  const handleScan = (text) => {
    // Extract payment_id from URL patterns:
    // 1) https://<host>/api/kiosk/public/receipt/<uuid>
    // 2) https://<host>/kwitantie/<uuid>
    // 3) raw UUID
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = text.match(uuidRegex);
    if (!match) {
      setStatus('error');
      setErrorMsg('QR code herkent geen geldig kwitantie-nummer.');
      setScannedUrl(text);
      return;
    }
    const pid = match[0];
    setPaymentId(pid);
    setScannedUrl(text);
    setStatus('found');
    // Stop the scanner safely — only if still running.
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch { /* ignore */ }
    }
  };

  const openReceipt = () => {
    if (!paymentId) return;
    const url = `${window.location.origin}/api/kiosk/public/receipt/${paymentId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <MobileModalShell
      title="QR Code Scannen"
      subtitle="Scan kwitantie QR code"
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
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition"
          >
            Sluiten
          </button>
        </div>
      ) : status === 'found' ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm font-semibold text-green-700 mb-2">Kwitantie gevonden!</p>
          <p className="text-[10px] text-slate-400 font-mono break-all bg-slate-50 p-2 rounded mb-4">{paymentId}</p>
          <div className="flex flex-col gap-2 px-4">
            <button
              onClick={openReceipt}
              data-testid="qr-open-receipt"
              className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold active:scale-[0.98] transition"
            >
              Kwitantie openen
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition"
            >
              Annuleren
            </button>
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
            {/* Viewfinder overlay */}
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
              Deze scanner verifieert of de QR code hoort bij een kwitantie in ons systeem. Na succesvolle scan opent de originele kwitantie ter controle.
            </p>
          </div>
        </div>
      )}
    </MobileModalShell>
  );
}

export default QRScannerModal;
