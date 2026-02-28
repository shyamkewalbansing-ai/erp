import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
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
  ScanLine,
  Download,
  Share2
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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Check if running as standalone PWA
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
    
    // Show install instructions immediately if not installed
    if (!standalone) {
      setShowInstallInstructions(true);
    }
  }, []);

  // Listen for PWA install prompt (Android)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-trigger on Android after a short delay
      setTimeout(() => {
        if (e) {
          e.prompt();
        }
      }, 1500);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Handle PWA install
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Scanner wordt geïnstalleerd!');
        setShowInstallInstructions(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    setShowInstallInstructions(false);
    localStorage.setItem('scanner_install_dismissed', 'true');
  };

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
      // Check if we're on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // First request camera permission with iOS-friendly constraints
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // iOS requires specific constraints
          const constraints = isIOS 
            ? { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } }
            : { video: true };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr) {
          console.error('Permission error:', permErr);
          if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
            setCameraError('Camera toegang geweigerd. Ga naar Instellingen → Safari → Camera en sta toegang toe voor deze website.');
            return;
          }
          if (permErr.name === 'NotFoundError') {
            setCameraError('Geen camera gevonden op dit apparaat.');
            return;
          }
          // For iOS, show specific instructions
          if (isIOS) {
            setCameraError('Camera niet beschikbaar. Controleer of je Safari gebruikt en camera toegang hebt toegestaan in Instellingen.');
            return;
          }
        }
      } else {
        setCameraError('Camera API niet ondersteund. Gebruik Safari op iOS of Chrome op Android.');
        return;
      }

      // Clean up existing scanner
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch (e) {}
        html5QrCodeRef.current = null;
      }

      // Small delay for iOS
      if (isIOS) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const html5QrCode = new Html5Qrcode("permanent-scanner-view");
      html5QrCodeRef.current = html5QrCode;

      // iOS-specific camera configuration
      const cameraConfig = { facingMode: "environment" };
      
      // Scanner configuration optimized for iOS
      const scannerConfig = {
        fps: isIOS ? 5 : 10, // Lower FPS for iOS to reduce strain
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778, // 16:9
        disableFlip: false,
        // iOS needs these experimental features
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      await html5QrCode.start(
        cameraConfig,
        scannerConfig,
        (decodedText) => handleScannedBarcode(decodedText),
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      const errorMsg = err.toString();
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('PermissionDenied')) {
        if (isIOS) {
          setCameraError('Camera toegang geweigerd. Ga naar Instellingen → Safari → Camera en sta toegang toe.');
        } else {
          setCameraError('Camera toegang geweigerd. Sta camera toe in je browser instellingen.');
        }
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('could not start video source')) {
        setCameraError('Camera is in gebruik door een andere app. Sluit andere apps en probeer opnieuw.');
      } else if (errorMsg.includes('OverconstrainedError') || errorMsg.includes('Constraints')) {
        // Retry with less strict constraints
        try {
          if (html5QrCodeRef.current) {
            try { await html5QrCodeRef.current.stop(); } catch (e) {}
          }
          const html5QrCode = new Html5Qrcode("permanent-scanner-view");
          html5QrCodeRef.current = html5QrCode;
          
          // Try with just facingMode, no other constraints
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 5, qrbox: { width: 200, height: 120 } },
            (decodedText) => handleScannedBarcode(decodedText),
            () => {}
          );
          setIsScanning(true);
          return;
        } catch (retryErr) {
          console.error("Retry failed:", retryErr);
          setCameraError('Camera configuratie niet ondersteund. Probeer een andere browser.');
        }
      } else if (errorMsg.includes('NotFoundError')) {
        setCameraError('Geen camera gevonden op dit apparaat.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Onbekende fout'}. ${isIOS ? 'Probeer Safari te herstarten.' : ''}`);
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
      {/* PWA Meta Tags */}
      <Helmet>
        <title>Scanner - POS</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Scanner" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#059669" />
        <link rel="apple-touch-icon" href="/scanner-icon-192.png" />
        <link rel="manifest" href="/scanner-manifest.json" />
      </Helmet>
      
      <Toaster position="top-center" richColors />
      
      {/* Full-screen Install Instructions Overlay */}
      {showInstallInstructions && !isStandalone && (
        <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full bg-slate-800 rounded-2xl p-6 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Scanner Installeren</h2>
              <p className="text-slate-400 text-sm">Installeer als app voor de beste ervaring</p>
            </div>
            
            {/* iOS Instructions */}
            {isIOS ? (
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">1</div>
                    <div>
                      <p className="text-white font-medium">Tik op Delen</p>
                      <p className="text-slate-400 text-sm">Het vierkant met pijl omhoog onderaan</p>
                      <div className="mt-2 flex justify-center">
                        <div className="bg-slate-600 rounded-lg p-2">
                          <Share2 className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">2</div>
                    <div>
                      <p className="text-white font-medium">Tik op "Zet op beginscherm"</p>
                      <p className="text-slate-400 text-sm">Scroll naar beneden in het menu</p>
                      <div className="mt-2 bg-slate-600 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-6 h-6 bg-slate-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs">+</span>
                        </div>
                        <span className="text-white text-sm">Zet op beginscherm</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">3</div>
                    <div>
                      <p className="text-white font-medium">Tik op "Voeg toe"</p>
                      <p className="text-slate-400 text-sm">De app verschijnt op je beginscherm</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Android - Show install button */
              <div className="space-y-4">
                {deferredPrompt ? (
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Installeer Scanner App
                  </Button>
                ) : (
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <p className="text-white text-center mb-3">Tik op het menu (⋮) en kies:</p>
                    <div className="bg-slate-600 rounded-lg p-3 flex items-center gap-3">
                      <Download className="w-5 h-5 text-white" />
                      <span className="text-white text-sm">"App installeren" of "Toevoegen aan startscherm"</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Skip Button */}
            <button 
              onClick={dismissInstallPrompt}
              className="w-full mt-6 py-3 text-slate-400 hover:text-white transition-colors text-sm"
            >
              Overslaan en direct scannen →
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-emerald-200" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <span className="text-emerald-100 text-sm font-medium">
            {isStandalone ? 'Scanner' : 'Permanente Scanner'}
          </span>
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
            <div className="text-center p-6 max-w-sm">
              <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white mb-4">{cameraError}</p>
              
              {/* iOS specific help */}
              {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                <div className="bg-slate-800 rounded-lg p-4 mb-4 text-left text-sm">
                  <p className="text-emerald-400 font-medium mb-2">📱 iPhone Instructies:</p>
                  <ol className="text-slate-300 space-y-1 list-decimal list-inside">
                    <li>Open <strong>Instellingen</strong></li>
                    <li>Ga naar <strong>Safari</strong></li>
                    <li>Scroll naar <strong>Camera</strong></li>
                    <li>Selecteer <strong>Toestaan</strong></li>
                    <li>Kom terug en druk opnieuw</li>
                  </ol>
                </div>
              )}
              
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
        <p className="text-emerald-300/70 text-xs mt-1">
          iPhone: Gebruik Safari • Sta camera toe in Instellingen
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
