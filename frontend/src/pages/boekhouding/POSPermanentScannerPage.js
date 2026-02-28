import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Camera,
  CameraOff,
  Check,
  X,
  ShoppingCart,
  Volume2,
  VolumeX,
  Loader2,
  Wifi,
  WifiOff,
  ScanLine
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast, Toaster } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const POSPermanentScannerPage = () => {
  const { code } = useParams();
  const html5QrCodeRef = useRef(null);
  const lastScannedRef = useRef({ barcode: null, time: 0 });
  const scanCooldown = 3000; // 3 seconds cooldown
  
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scannerValid, setScannerValid] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [connected, setConnected] = useState(true);

  // Validate scanner on load
  useEffect(() => {
    const validateScanner = async () => {
      if (!code) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/boekhouding/pos/permanent-scanner/${code}/validate`);
        if (response.ok) {
          const data = await response.json();
          setScannerValid(data.valid);
          setScanCount(data.scan_count || 0);
          setConnected(true);
        } else {
          setScannerValid(false);
          setConnected(false);
        }
      } catch (error) {
        console.error('Error validating scanner:', error);
        setScannerValid(false);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };
    validateScanner();
  }, [code]);

  // Start camera when scanner is valid
  useEffect(() => {
    if (!loading && scannerValid) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [loading, scannerValid]);

  const playSound = (type) => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'success') {
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.frequency.value = 1000, 100);
        setTimeout(() => { oscillator.stop(); audioContext.close(); }, 200);
      } else {
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => { oscillator.stop(); audioContext.close(); }, 300);
      }
    } catch (e) {}
  };

  const startScanner = async () => {
    setCameraError(null);
    
    try {
      // First request camera permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr) {
          if (permErr.name === 'NotAllowedError') {
            setCameraError('Camera toegang geweigerd. Sta camera toe in je browser.');
            return;
          }
        }
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('Geen camera gevonden');
        return;
      }

      // Clean up existing scanner
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch (e) {}
        html5QrCodeRef.current = null;
      }

      const html5QrCode = new Html5Qrcode("permanent-scanner-view");
      html5QrCodeRef.current = html5QrCode;

      // Try back camera first, then fall back
      const cameraConfig = devices.length > 1 
        ? { facingMode: "environment" }
        : devices[0].id;

      await html5QrCode.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 280, height: 180 } },
        (decodedText) => handleScannedBarcode(decodedText),
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      const errorMsg = err.toString();
      
      if (errorMsg.includes('NotAllowedError')) {
        setCameraError('Camera toegang geweigerd. Sta camera toe.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('could not start video source')) {
        setCameraError('Camera is in gebruik. Sluit andere apps die de camera gebruiken.');
      } else if (errorMsg.includes('OverconstrainedError')) {
        // Retry with first available camera
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const html5QrCode = new Html5Qrcode("permanent-scanner-view");
            html5QrCodeRef.current = html5QrCode;
            await html5QrCode.start(
              devices[0].id,
              { fps: 10, qrbox: { width: 250, height: 150 } },
              (decodedText) => handleScannedBarcode(decodedText),
              () => {}
            );
            setIsScanning(true);
            return;
          }
        } catch (retryErr) {}
        setCameraError('Camera niet ondersteund.');
      } else {
        setCameraError(`Camera error: ${err.message || err}`);
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {}
    }
    setIsScanning(false);
  };

  const handleScannedBarcode = async (barcode) => {
    const now = Date.now();
    
    // Prevent duplicate scans - 3 second cooldown
    if (lastScannedRef.current.barcode === barcode && 
        now - lastScannedRef.current.time < scanCooldown) {
      return;
    }
    
    // Update last scanned reference immediately
    lastScannedRef.current = { barcode, time: now };

    try {
      const response = await fetch(`${API_URL}/api/boekhouding/pos/permanent-scanner/${code}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        playSound('success');
        setLastScanned({ 
          barcode, 
          product: data.product, 
          success: true, 
          time: now 
        });
        setScanCount(prev => prev + 1);
        
        if (navigator.vibrate) navigator.vibrate(100);

        toast.success(
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium">{data.product?.naam}</p>
              <p className="text-sm opacity-75">Toegevoegd aan winkelwagen!</p>
            </div>
          </div>
        );
      } else {
        playSound('error');
        setLastScanned({ barcode, product: null, success: false, time: now });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        toast.error(`Product niet gevonden: ${barcode}`);
      }
    } catch (error) {
      playSound('error');
      toast.error('Verbindingsfout');
      setConnected(false);
    }
  };

  // No code provided
  if (!code) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center text-white max-w-sm">
          <ScanLine className="w-20 h-20 mx-auto mb-6 text-slate-500" />
          <h1 className="text-2xl font-bold mb-4">Scanner Code Nodig</h1>
          <p className="text-slate-400 mb-6">
            Open de POS op de computer en klik op "Permanente Scanner" om je persoonlijke scanner link te krijgen.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Verbinden...</p>
        </div>
      </div>
    );
  }

  // Invalid scanner
  if (!scannerValid) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center text-white max-w-sm">
          <X className="w-20 h-20 mx-auto mb-6 text-red-500" />
          <h1 className="text-2xl font-bold mb-4">Scanner Niet Gevonden</h1>
          <p className="text-slate-400 mb-6">
            Deze scanner link is ongeldig. Vraag een nieuwe link aan via de POS.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="text-white border-white"
          >
            Opnieuw proberen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col" data-testid="pos-permanent-scanner">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-emerald-200" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <span className="text-emerald-100 text-sm font-medium">Permanente Scanner</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-200" />
          <span className="text-white font-bold text-lg">{scanCount}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-white hover:bg-emerald-600"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-emerald-300" />}
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <div id="permanent-scanner-view" className="absolute inset-0" />
        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-72 h-48 border-2 border-emerald-400 rounded-lg relative">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-scan" />
            </div>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center p-6">
              <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white mb-4">{cameraError}</p>
              <Button onClick={startScanner} variant="outline" className="text-white border-white">
                Opnieuw proberen
              </Button>
            </div>
          </div>
        )}

        {/* Not scanning */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <Camera className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <Button onClick={startScanner} className="bg-emerald-600 hover:bg-emerald-700">
                <Camera className="w-4 h-4 mr-2" />
                Start Scanner
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Last Scanned */}
      {lastScanned && (
        <div className={`px-4 py-3 ${lastScanned.success ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <div className="flex items-center gap-3">
            {lastScanned.success ? (
              <>
                <Check className="w-6 h-6 text-white" />
                <div className="flex-1 text-white">
                  <p className="font-medium">{lastScanned.product?.naam}</p>
                  <p className="text-sm opacity-75">
                    {lastScanned.product?.verkoopprijs?.toLocaleString('nl-SR', { style: 'currency', currency: 'SRD' })}
                  </p>
                </div>
              </>
            ) : (
              <>
                <X className="w-6 h-6 text-white" />
                <div className="flex-1 text-white">
                  <p className="font-medium">Niet gevonden</p>
                  <p className="text-sm opacity-75">{lastScanned.barcode}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-emerald-800 px-4 py-4 text-center">
        <p className="text-emerald-200 text-sm">
          📷 Altijd actief • Geen sessie limiet • Richt camera op barcode
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default POSPermanentScannerPage;
