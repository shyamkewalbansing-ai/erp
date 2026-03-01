import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
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
  WifiOff
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast, Toaster } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const POSMobileScannerPage = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [connected, setConnected] = useState(true);

  // Audio feedback
  const successSound = useRef(null);
  const errorSound = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch products on load
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/boekhouding/artikelen`, {
          headers: { ...getAuthHeader() }
        });
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Start camera on mount
  useEffect(() => {
    if (!loading && products.length > 0) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [loading]);

  const playSound = (type) => {
    if (!soundEnabled) return;
    
    // Use Web Audio API for sound feedback
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
        setTimeout(() => {
          oscillator.frequency.value = 1000;
        }, 100);
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 200);
      } else {
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 300);
      }
    } catch (e) {
      // Audio not supported
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('Geen camera gevonden');
        return;
      }

      const html5QrCode = new Html5Qrcode("mobile-scanner-view");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleScannedBarcode(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      if (err.toString().includes('NotAllowedError')) {
        setCameraError('Camera toegang geweigerd. Sta camera toe in browser instellingen.');
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
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const handleScannedBarcode = async (barcode) => {
    // Prevent duplicate scans within 2 seconds
    if (lastScanned?.barcode === barcode && Date.now() - lastScanned.time < 2000) {
      return;
    }

    const product = products.find(p => 
      p.code?.toLowerCase() === barcode.toLowerCase() ||
      p.barcode?.toLowerCase() === barcode.toLowerCase() ||
      p.ean?.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      // Add to POS cart via API
      try {
        const response = await fetch(`${API_URL}/api/boekhouding/pos/cart/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            artikel_id: product.id,
            barcode: barcode
          })
        });

        playSound('success');
        setLastScanned({ 
          barcode, 
          product, 
          success: true, 
          time: Date.now() 
        });
        setScanCount(prev => prev + 1);
        
        // Vibrate on success (mobile)
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }

        toast.success(
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium">{product.naam}</p>
              <p className="text-sm text-gray-500">Toegevoegd aan kassa</p>
            </div>
          </div>
        );
      } catch (error) {
        console.error('Error adding to cart:', error);
      }
    } else {
      playSound('error');
      setLastScanned({ 
        barcode, 
        product: null, 
        success: false, 
        time: Date.now() 
      });
      
      // Vibrate pattern on error (mobile)
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      toast.error(
        <div className="flex items-center gap-3">
          <X className="w-5 h-5 text-red-500" />
          <div>
            <p className="font-medium">Product niet gevonden</p>
            <p className="text-sm text-gray-500">Barcode: {barcode}</p>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Scanner laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col" data-testid="pos-mobile-scanner">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/boekhouding/pos')}
          className="text-white hover:bg-gray-700"
        >
          <Home className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <span className="text-white font-medium">{scanCount} gescand</span>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-emerald-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-white hover:bg-gray-700"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <div 
          id="mobile-scanner-view" 
          className="absolute inset-0"
        />
        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative">
              {/* Scan frame */}
              <div className="w-72 h-48 border-2 border-emerald-400 rounded-lg relative">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                
                {/* Scanning line animation */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-scan" />
              </div>
            </div>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center p-6">
              <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white mb-4">{cameraError}</p>
              <Button onClick={startScanner} variant="outline" className="text-white border-white">
                Opnieuw proberen
              </Button>
            </div>
          </div>
        )}

        {/* No camera active */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Camera niet actief</p>
              <Button onClick={startScanner} className="bg-emerald-600 hover:bg-emerald-700">
                <Camera className="w-4 h-4 mr-2" />
                Start Scanner
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Last Scanned Result */}
      {lastScanned && (
        <div className={`px-4 py-3 ${lastScanned.success ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <div className="flex items-center gap-3">
            {lastScanned.success ? (
              <>
                <Check className="w-6 h-6 text-white" />
                <div className="flex-1 text-white">
                  <p className="font-medium">{lastScanned.product?.naam}</p>
                  <p className="text-sm text-emerald-100">
                    {lastScanned.product?.verkoopprijs?.toLocaleString('nl-SR', { style: 'currency', currency: 'SRD' })}
                  </p>
                </div>
              </>
            ) : (
              <>
                <X className="w-6 h-6 text-white" />
                <div className="flex-1 text-white">
                  <p className="font-medium">Niet gevonden</p>
                  <p className="text-sm text-red-100">{lastScanned.barcode}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="bg-gray-800 px-4 py-4 safe-area-inset-bottom">
        <Button
          onClick={() => navigate('/app/boekhouding/pos')}
          className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Naar Kassa ({scanCount})
        </Button>
      </div>

      {/* Custom CSS for scanning animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        .safe-area-inset-bottom {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
};

export default POSMobileScannerPage;
