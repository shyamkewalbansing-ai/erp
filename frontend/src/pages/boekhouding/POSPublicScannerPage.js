import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Camera,
  CameraOff,
  Check,
  X,
  ShoppingCart,
  Package,
  Volume2,
  VolumeX,
  Loader2,
  Wifi,
  WifiOff,
  QrCode
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast, Toaster } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const POSPublicScannerPage = () => {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [connected, setConnected] = useState(true);

  // Validate session on load
  useEffect(() => {
    const validateSession = async () => {
      if (!sessionCode) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/boekhouding/pos/scanner-session/${sessionCode}/validate`);
        if (response.ok) {
          const data = await response.json();
          setSessionValid(data.valid);
          setConnected(true);
        } else {
          setSessionValid(false);
          setConnected(false);
        }
      } catch (error) {
        console.error('Error validating session:', error);
        setSessionValid(false);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };
    validateSession();
  }, [sessionCode]);

  // Start camera when session is valid
  useEffect(() => {
    if (!loading && sessionValid) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [loading, sessionValid]);

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
    
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera niet ondersteund. Gebruik Safari op iOS of Chrome op Android.');
        return;
      }

      // Request camera permission first
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        });
        testStream.getTracks().forEach(track => track.stop());
      } catch (permErr) {
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          if (isIOSDevice) {
            setCameraError('Camera toegang geweigerd.\n\nGa naar: Instellingen → Safari → Camera → Sta toe');
          } else {
            setCameraError('Camera toegang geweigerd. Sta camera toe in je browser.');
          }
          return;
        }
        if (permErr.name === 'NotFoundError') {
          setCameraError('Geen camera gevonden op dit apparaat.');
          return;
        }
        // Try without facingMode for OverconstrainedError
        if (permErr.name === 'OverconstrainedError') {
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            fallbackStream.getTracks().forEach(track => track.stop());
          } catch (e) {
            setCameraError('Camera niet beschikbaar.');
            return;
          }
        }
      }

      // Clean up existing scanner
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch (e) {}
        html5QrCodeRef.current = null;
      }

      // Wait for iOS
      await new Promise(resolve => setTimeout(resolve, isIOSDevice ? 800 : 300));

      const html5QrCode = new Html5Qrcode("public-scanner-view");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.8);
            return { width: qrboxSize, height: Math.floor(qrboxSize * 0.6) };
          },
          aspectRatio: 1.5,
          formatsToSupport: [0,3,4,5,8,9,10,14,15] // Common barcode formats
        },
        (decodedText) => handleScannedBarcode(decodedText),
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      const errorMsg = err.toString().toLowerCase();
      
      if (errorMsg.includes('notallowed') || errorMsg.includes('permission')) {
        setCameraError(isIOSDevice 
          ? 'Camera geweigerd. Ga naar Instellingen → Safari → Camera' 
          : 'Camera geweigerd. Sta toe in browser.');
      } else if (errorMsg.includes('notreadable') || errorMsg.includes('could not start')) {
        setCameraError('Camera in gebruik. Sluit andere apps.');
      } else {
        setCameraError(`Camera fout. Ververs de pagina.`);
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
    // Prevent duplicate scans - 3 second cooldown
    if (lastScanned?.barcode === barcode && Date.now() - lastScanned.time < 3000) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/boekhouding/pos/scanner-session/${sessionCode}/scan`, {
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
          time: Date.now() 
        });
        setScanCount(prev => prev + 1);
        
        if (navigator.vibrate) navigator.vibrate(100);

        toast.success(
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium">{data.product?.naam}</p>
              <p className="text-sm opacity-75">Toegevoegd!</p>
            </div>
          </div>
        );
      } else {
        playSound('error');
        setLastScanned({ barcode, product: null, success: false, time: Date.now() });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        toast.error(`Product niet gevonden: ${barcode}`);
      }
    } catch (error) {
      playSound('error');
      toast.error('Verbindingsfout');
      setConnected(false);
    }
  };

  // No session code provided
  if (!sessionCode) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center text-white max-w-sm">
          <QrCode className="w-20 h-20 mx-auto mb-6 text-slate-500" />
          <h1 className="text-2xl font-bold mb-4">Scanner Code Nodig</h1>
          <p className="text-slate-400 mb-6">
            Open de POS op de computer en klik op "Telefoon Scanner" om een QR code te krijgen.
          </p>
          <p className="text-sm text-slate-500">
            Scan de QR code of open de link die je krijgt.
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

  // Invalid session
  if (!sessionValid) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center text-white max-w-sm">
          <X className="w-20 h-20 mx-auto mb-6 text-red-500" />
          <h1 className="text-2xl font-bold mb-4">Sessie Verlopen</h1>
          <p className="text-slate-400 mb-6">
            Deze scanner link is verlopen of ongeldig. Vraag een nieuwe link aan op de kassa.
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
    <div className="fixed inset-0 bg-slate-900 flex flex-col" data-testid="pos-public-scanner">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-emerald-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <span className="text-slate-400 text-sm">Verbonden</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <span className="text-white font-bold text-lg">{scanCount}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-white hover:bg-slate-700"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <div id="public-scanner-view" className="absolute inset-0" />
        
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
      <div className="bg-slate-800 px-4 py-4 text-center">
        <p className="text-emerald-400 text-sm">
          📷 Richt camera op barcode • Product wordt automatisch toegevoegd
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

export default POSPublicScannerPage;
