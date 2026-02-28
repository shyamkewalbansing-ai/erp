import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Grid3X3, 
  User, 
  Trash2, 
  Plus, 
  Minus,
  CreditCard,
  Banknote,
  X,
  Check,
  Loader2,
  ShoppingCart,
  Package,
  Coffee,
  UtensilsCrossed,
  GlassWater,
  Tag,
  Receipt,
  Percent,
  UserPlus,
  Printer,
  Barcode,
  Calculator,
  ArrowLeft,
  Users,
  Camera,
  CameraOff,
  ScanLine
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const APP_URL = window.location.origin;

// Categorie iconen mapping
const categoryIcons = {
  'all': Grid3X3,
  'koffie': Coffee,
  'coffee': Coffee,
  'dranken': GlassWater,
  'beverages': GlassWater,
  'drinks': GlassWater,
  'eten': UtensilsCrossed,
  'food': UtensilsCrossed,
  'desserts': UtensilsCrossed,
  'producten': Package,
  'products': Package,
  'overig': Tag,
  'other': Tag,
};

// Snelle bedragen voor contante betaling
const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200, 500];

const POSPage = () => {
  const navigate = useNavigate();
  const barcodeInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [cart, setCart] = useState([]);
  
  // Payment state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStep, setPaymentStep] = useState('method'); // 'method', 'cash', 'processing', 'success'
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  
  // Discount state
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  
  // Customer state
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Barcode scanner state
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);
  const scannerContainerRef = useRef(null);

  // Mobile scanner session state
  const [showScannerLinkDialog, setShowScannerLinkDialog] = useState(false);
  const [scannerSession, setScannerSession] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Create scanner session for mobile phones
  const createScannerSession = async () => {
    setCreatingSession(true);
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/pos/scanner-session/create`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScannerSession(data);
        setShowScannerLinkDialog(true);
      } else {
        toast.error('Kon scanner sessie niet aanmaken');
      }
    } catch (error) {
      toast.error('Fout bij aanmaken scanner sessie');
    } finally {
      setCreatingSession(false);
    }
  };

  // Poll for scanned items
  useEffect(() => {
    if (!scannerSession?.code) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/boekhouding/pos/scanner-session/${scannerSession.code}/items`);
        if (response.ok) {
          const items = await response.json();
          // Add new items to cart
          for (const item of items) {
            // Check if already in cart (by cart_item_id to prevent duplicates)
            const alreadyInCart = cart.some(c => c.scan_id === item.id);
            if (!alreadyInCart) {
              const product = products.find(p => p.id === item.artikel_id);
              if (product) {
                setCart(prev => {
                  const existing = prev.find(p => p.id === product.id);
                  if (existing) {
                    return prev.map(p => 
                      p.id === product.id 
                        ? { ...p, quantity: p.quantity + 1, scan_id: item.id }
                        : p
                    );
                  }
                  return [...prev, { ...product, quantity: 1, scan_id: item.id }];
                });
                toast.success(`📱 ${product.naam} gescand`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [scannerSession?.code, cart, products]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/artikelen`, {
        headers: { ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.filter(p => p.type !== 'dienst' && (p.is_actief !== false)));
        
        // Extract unique categories
        const cats = [...new Set(data.map(p => p.categorie || 'Overig').filter(Boolean))];
        setCategories(['all', ...cats]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/debiteuren`, {
        headers: { ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  // Barcode scanner - listen for keyboard input
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    
    const handleKeyPress = (e) => {
      // Only process if no dialog is open and not in an input field
      if (showPaymentDialog || showDiscountDialog || showCustomerDialog) return;
      if (e.target.tagName === 'INPUT') return;
      
      const currentTime = Date.now();
      
      // If more than 100ms since last key, reset buffer (barcode scanners are fast)
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;
      
      if (e.key === 'Enter' && barcodeBuffer.length > 3) {
        // Search for product by barcode/code
        const product = products.find(p => 
          p.code?.toLowerCase() === barcodeBuffer.toLowerCase() ||
          p.barcode?.toLowerCase() === barcodeBuffer.toLowerCase()
        );
        if (product) {
          addToCart(product);
          toast.success(`${product.naam} toegevoegd`);
        } else {
          toast.error(`Product niet gevonden: ${barcodeBuffer}`);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        barcodeBuffer += e.key;
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [products, showPaymentDialog, showDiscountDialog, showCustomerDialog]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || 
      (p.categorie || 'Overig').toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchQuery || 
      p.naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
    setSelectedCustomer(null);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.verkoopprijs * item.quantity), 0);
  const btwPercentage = 10; // Default BTW
  
  // Calculate discount
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountAmount = subtotal * (appliedDiscount.value / 100);
    } else {
      discountAmount = Math.min(appliedDiscount.value, subtotal);
    }
  }
  
  const subtotalAfterDiscount = subtotal - discountAmount;
  const btwAmount = subtotalAfterDiscount * (btwPercentage / 100);
  const total = subtotalAfterDiscount + btwAmount;
  
  // Calculate change
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeAmount = cashReceivedNum - total;

  const applyDiscount = () => {
    const value = parseFloat(discountValue);
    if (!value || value <= 0) {
      toast.error('Voer een geldig bedrag in');
      return;
    }
    if (discountType === 'percentage' && value > 100) {
      toast.error('Percentage kan niet hoger zijn dan 100%');
      return;
    }
    setAppliedDiscount({ type: discountType, value });
    setShowDiscountDialog(false);
    setDiscountValue('');
    toast.success(`Korting van ${discountType === 'percentage' ? `${value}%` : formatCurrency(value)} toegepast`);
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    toast.info('Korting verwijderd');
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDialog(false);
    toast.success(`Klant ${customer.naam} geselecteerd`);
  };

  const handleBarcodeSearch = () => {
    if (!barcodeQuery) return;
    
    const product = products.find(p => 
      p.code?.toLowerCase() === barcodeQuery.toLowerCase() ||
      p.barcode?.toLowerCase() === barcodeQuery.toLowerCase()
    );
    
    if (product) {
      addToCart(product);
      toast.success(`${product.naam} toegevoegd`);
      setBarcodeQuery('');
      setShowBarcodeDialog(false);
      stopCameraScanner();
    } else {
      toast.error(`Product niet gevonden: ${barcodeQuery}`);
    }
  };

  // Camera barcode scanner functions
  const startCameraScanner = async () => {
    setCameraError(null);
    
    try {
      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length === 0) {
        setCameraError('Geen camera gevonden op dit apparaat');
        return;
      }

      const html5QrCode = new Html5Qrcode("barcode-scanner-container");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        formatsToSupport: [
          0,  // QR_CODE
          1,  // AZTEC
          2,  // CODABAR
          3,  // CODE_39
          4,  // CODE_93
          5,  // CODE_128
          6,  // DATA_MATRIX
          7,  // MAXICODE
          8,  // ITF
          9,  // EAN_13
          10, // EAN_8
          11, // PDF_417
          12, // RSS_14
          13, // RSS_EXPANDED
          14, // UPC_A
          15, // UPC_E
          16  // UPC_EAN_EXTENSION
        ]
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText, decodedResult) => {
          // Barcode successfully scanned
          console.log("Scanned barcode:", decodedText);
          handleScannedBarcode(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (happens constantly while searching)
        }
      );

      setCameraActive(true);
    } catch (err) {
      console.error("Camera scanner error:", err);
      const errorMsg = err.toString();
      
      if (errorMsg.includes('NotAllowedError')) {
        setCameraError('Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen.');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('DevicesNotFoundError')) {
        setCameraError('Geen camera gevonden op dit apparaat.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('could not start video source')) {
        setCameraError('Camera is in gebruik door een andere app. Sluit andere apps die de camera gebruiken en probeer opnieuw.');
      } else if (errorMsg.includes('OverconstrainedError')) {
        // Try with first available camera
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const html5QrCode = new Html5Qrcode("barcode-scanner-container");
            html5QrCodeRef.current = html5QrCode;
            await html5QrCode.start(
              devices[0].id,
              { fps: 10, qrbox: { width: 200, height: 120 } },
              (decodedText) => handleScannedBarcode(decodedText),
              () => {}
            );
            setCameraActive(true);
            return;
          }
        } catch (retryErr) {
          setCameraError('Camera configuratie niet ondersteund.');
        }
      } else {
        setCameraError(`Kon camera niet starten: ${err.message || err}`);
      }
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setCameraActive(false);
  };

  const handleScannedBarcode = (barcode) => {
    // Stop scanner after successful scan
    stopCameraScanner();
    
    // Search for product
    const product = products.find(p => 
      p.code?.toLowerCase() === barcode.toLowerCase() ||
      p.barcode?.toLowerCase() === barcode.toLowerCase() ||
      p.ean?.toLowerCase() === barcode.toLowerCase()
    );
    
    if (product) {
      addToCart(product);
      toast.success(`${product.naam} gescand en toegevoegd!`);
      setShowBarcodeDialog(false);
    } else {
      // Show the scanned code in the input field
      setBarcodeQuery(barcode);
      toast.error(`Product niet gevonden voor barcode: ${barcode}`);
    }
  };

  // Cleanup camera on dialog close
  const handleBarcodeDialogClose = (open) => {
    if (!open) {
      stopCameraScanner();
      setBarcodeQuery('');
    }
    setShowBarcodeDialog(open);
  };

  const startPayment = (method) => {
    setPaymentMethod(method);
    if (method === 'contant') {
      setPaymentStep('cash');
      setCashReceived('');
    } else {
      // Pin payment - process directly
      processPayment(method);
    }
  };

  const processPayment = async (method) => {
    setPaymentStep('processing');
    setProcessing(true);

    try {
      const saleData = {
        type: 'pos',
        betaalmethode: method,
        klant_id: selectedCustomer?.id || null,
        klant_naam: selectedCustomer?.naam || null,
        regels: cart.map(item => ({
          artikel_id: item.id,
          artikel_naam: item.naam,
          aantal: item.quantity,
          prijs_per_stuk: item.verkoopprijs,
          btw_percentage: btwPercentage,
          totaal: item.verkoopprijs * item.quantity
        })),
        subtotaal: subtotal,
        korting_type: appliedDiscount?.type || null,
        korting_waarde: appliedDiscount?.value || 0,
        korting_bedrag: discountAmount,
        btw_bedrag: btwAmount,
        totaal: total,
        ontvangen_bedrag: method === 'contant' ? cashReceivedNum : total,
        wisselgeld: method === 'contant' ? Math.max(0, changeAmount) : 0,
        status: 'betaald'
      };

      const response = await fetch(`${API_URL}/api/boekhouding/pos/verkopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const sale = await response.json();
        setLastSale({ ...sale, wisselgeld: method === 'contant' ? Math.max(0, changeAmount) : 0 });
        setPaymentStep('success');
        toast.success('Betaling succesvol!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij verwerken betaling');
        setPaymentStep('method');
      }
    } catch (error) {
      toast.error('Fout bij verwerken betaling');
      setPaymentStep('method');
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = () => {
    if (cashReceivedNum < total) {
      toast.error('Ontvangen bedrag is lager dan het totaal');
      return;
    }
    processPayment('contant');
  };

  const closePaymentAndReset = () => {
    setShowPaymentDialog(false);
    setPaymentStep('method');
    setPaymentMethod(null);
    setCashReceived('');
    setCart([]);
    setAppliedDiscount(null);
    setSelectedCustomer(null);
    setLastSale(null);
  };

  const printReceipt = async () => {
    if (!lastSale) return;
    
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/pos/verkopen/${lastSale.id}/bon`, {
        headers: { ...getAuthHeader() }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bon-${lastSale.bonnummer}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success('Bon gedownload');
      } else {
        // Fallback: open print window
        window.print();
      }
    } catch (error) {
      toast.error('Fout bij printen bon');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', { 
      style: 'currency', 
      currency: 'SRD',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const getCategoryIcon = (cat) => {
    const IconComponent = categoryIcons[cat.toLowerCase()] || Tag;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-100 flex items-center justify-center" data-testid="pos-page">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">POS laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-100 flex" data-testid="pos-page">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col">
        {/* Header with Categories */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Home Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app/boekhouding')}
              className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white hover:bg-slate-800"
              data-testid="pos-home-btn"
            >
              <Home className="w-5 h-5" />
            </Button>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map(cat => {
                const IconComponent = getCategoryIcon(cat);
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    data-testid={`pos-category-${cat}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {cat === 'all' ? 'Alles' : cat}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative ml-auto w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoeken of scan barcode..."
                className="pl-10 bg-slate-50 border-slate-200"
                data-testid="pos-search-input"
              />
            </div>

            {/* Barcode Scanner Button */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowBarcodeDialog(true)}
              className="shrink-0"
              title="Barcode invoeren"
            >
              <Barcode className="w-5 h-5 text-slate-500" />
            </Button>

            {/* Mobile Scanner Link */}
            <Button 
              variant="outline"
              onClick={createScannerSession}
              disabled={creatingSession}
              className="shrink-0 hidden sm:flex"
              title="Open mobiele scanner op telefoon"
            >
              {creatingSession ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">Telefoon Scanner</span>
            </Button>

            {/* Customer Button */}
            <Button 
              variant={selectedCustomer ? "default" : "outline"}
              size="icon"
              onClick={() => setShowCustomerDialog(true)}
              className="shrink-0"
              title="Klant selecteren"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 hover:border-slate-200"
                data-testid={`pos-product-${product.code || product.id}`}
              >
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden">
                  {product.foto_url ? (
                    <img 
                      src={product.foto_url.startsWith('http') ? product.foto_url : `${API_URL}${product.foto_url}`}
                      alt={product.naam}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                
                {/* Product Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-slate-900 truncate">{product.naam}</h3>
                  <p className="text-xs text-slate-400">{product.code}</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {formatCurrency(product.verkoopprijs)}
                  </p>
                </div>

                {/* Quantity Badge (if in cart) */}
                {cart.find(item => item.id === product.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {cart.find(item => item.id === product.id).quantity}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Package className="w-16 h-16 mb-4" />
              <p className="text-lg">Geen producten gevonden</p>
              <p className="text-sm">Pas je filters aan of voeg producten toe in Voorraad</p>
            </div>
          )}
        </div>

        {/* Left Sidebar Icons */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-r-xl shadow-lg py-2 border border-l-0 border-slate-200">
          <div className="flex flex-col gap-1 px-2">
            <button 
              onClick={() => setShowBarcodeDialog(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Barcode scanner"
            >
              <Barcode className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowDiscountDialog(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Korting toevoegen"
            >
              <Percent className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowCustomerDialog(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Klant selecteren"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Cart/Receipt */}
      <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{cart.reduce((sum, i) => sum + i.quantity, 0)} items</span>
            </div>
            <button 
              onClick={clearCart}
              className="text-sm text-slate-400 hover:text-red-500 transition-colors"
              data-testid="pos-clear-cart-btn"
            >
              Wissen
            </button>
          </div>
          
          {/* Selected Customer */}
          {selectedCustomer && (
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 mt-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">{selectedCustomer.naam}</span>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm">Winkelwagen is leeg</p>
              <p className="text-xs mt-1">Scan een barcode of selecteer producten</p>
            </div>
          ) : (
            cart.map(item => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
                data-testid={`pos-cart-item-${item.id}`}
              >
                {/* Quantity Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">
                    {item.quantity}
                  </div>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.naam}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(item.verkoopprijs)} per stuk</p>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.verkoopprijs * item.quantity)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer - Totals & Charge Button */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          {/* Subtotals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotaal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {/* Discount */}
            {appliedDiscount && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Korting ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : 'vast'})
                  <button onClick={removeDiscount} className="ml-1 text-red-400 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-slate-500">
              <span>BTW ({btwPercentage}%)</span>
              <span>{formatCurrency(btwAmount)}</span>
            </div>
            
            {/* Add Discount Button */}
            {!appliedDiscount && cart.length > 0 && (
              <button
                onClick={() => setShowDiscountDialog(true)}
                className="w-full py-2 text-sm text-slate-500 hover:text-emerald-600 border border-dashed border-slate-200 rounded-lg hover:border-emerald-300 transition-colors flex items-center justify-center gap-2"
              >
                <Percent className="w-4 h-4" />
                Korting toevoegen
              </button>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-lg font-semibold text-slate-900">Totaal</span>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>

          {/* Charge Button */}
          <button
            onClick={() => cart.length > 0 && setShowPaymentDialog(true)}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
              cart.length > 0
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            data-testid="pos-charge-btn"
          >
            <Calculator className="w-5 h-5" />
            <span>Afrekenen</span>
          </button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        if (!open && paymentStep !== 'processing') {
          setShowPaymentDialog(false);
          setPaymentStep('method');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          {/* Step: Choose Method */}
          {paymentStep === 'method' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-xl">Kies betaalmethode</DialogTitle>
              </DialogHeader>
              <div className="py-6">
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-slate-900">{formatCurrency(total)}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                    {appliedDiscount && ` • Korting: ${formatCurrency(discountAmount)}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => startPayment('contant')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                    data-testid="pos-pay-cash-btn"
                  >
                    <Banknote className="w-12 h-12 text-emerald-600" />
                    <span className="font-semibold text-slate-700">Contant</span>
                  </button>
                  <button
                    onClick={() => startPayment('pin')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    data-testid="pos-pay-card-btn"
                  >
                    <CreditCard className="w-12 h-12 text-blue-600" />
                    <span className="font-semibold text-slate-700">Pin/Kaart</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step: Cash Payment - Enter Amount */}
          {paymentStep === 'cash' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaymentStep('method')} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <DialogTitle className="text-xl">Contante betaling</DialogTitle>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-6">
                {/* Amount to pay */}
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Te betalen</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(total)}</p>
                </div>

                {/* Cash received input */}
                <div className="space-y-2">
                  <Label>Ontvangen bedrag</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="text-2xl h-14 text-center font-mono"
                    autoFocus
                    data-testid="pos-cash-input"
                  />
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(amount.toString())}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashReceived(Math.ceil(total).toString())}
                    className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-sm font-medium text-emerald-700 transition-colors"
                  >
                    Exact
                  </button>
                </div>

                {/* Change calculation */}
                {cashReceivedNum > 0 && (
                  <div className={`p-4 rounded-xl ${changeAmount >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${changeAmount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {changeAmount >= 0 ? 'Wisselgeld terug' : 'Nog te ontvangen'}
                      </span>
                      <span className={`text-2xl font-bold ${changeAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(changeAmount))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Confirm button */}
                <Button
                  onClick={handleCashPayment}
                  disabled={cashReceivedNum < total}
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  data-testid="pos-confirm-cash-btn"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Betaling bevestigen
                </Button>
              </div>
            </>
          )}

          {/* Step: Processing */}
          {paymentStep === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-lg text-slate-600">Betaling verwerken...</p>
            </div>
          )}

          {/* Step: Success */}
          {paymentStep === 'success' && (
            <div className="py-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Betaling Succesvol!</h2>
                <p className="text-slate-500">{lastSale?.bonnummer}</p>
              </div>
              
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Betaalmethode</span>
                  <span className="font-medium">{paymentMethod === 'contant' ? 'Contant' : 'Pin/Kaart'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Totaal</span>
                  <span className="font-medium">{formatCurrency(lastSale?.totaal || total)}</span>
                </div>
                {paymentMethod === 'contant' && lastSale?.wisselgeld > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ontvangen</span>
                      <span className="font-medium">{formatCurrency(lastSale?.ontvangen_bedrag || cashReceivedNum)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold pt-2 border-t border-slate-200">
                      <span>Wisselgeld</span>
                      <span className="text-lg">{formatCurrency(lastSale?.wisselgeld)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={printReceipt}
                  className="h-12"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Bon printen
                </Button>
                <Button
                  onClick={closePaymentAndReset}
                  className="h-12 bg-emerald-600 hover:bg-emerald-700"
                  data-testid="pos-success-close-btn"
                >
                  Volgende klant
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Korting toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type korting</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Vast bedrag (SRD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{discountType === 'percentage' ? 'Percentage' : 'Bedrag'}</Label>
              <Input
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '25.00'}
              />
            </div>
            {discountValue && (
              <div className="p-3 bg-emerald-50 rounded-lg text-center">
                <p className="text-sm text-emerald-600">
                  Korting: {discountType === 'percentage' ? `${discountValue}%` : formatCurrency(parseFloat(discountValue) || 0)}
                </p>
                <p className="text-xs text-emerald-500 mt-1">
                  = {formatCurrency(discountType === 'percentage' ? subtotal * (parseFloat(discountValue) || 0) / 100 : Math.min(parseFloat(discountValue) || 0, subtotal))} korting
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>Annuleren</Button>
            <Button onClick={applyDiscount} className="bg-emerald-600 hover:bg-emerald-700">
              <Percent className="w-4 h-4 mr-2" />
              Toepassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Klant selecteren</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {customers.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Geen klanten gevonden</p>
              ) : (
                customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedCustomer?.id === customer.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{customer.naam}</p>
                      <p className="text-sm text-slate-500">{customer.email || customer.telefoon || 'Geen contactgegevens'}</p>
                    </div>
                    {selectedCustomer?.id === customer.id && (
                      <Check className="w-5 h-5 text-blue-500 ml-auto" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>Sluiten</Button>
            {selectedCustomer && (
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-700"
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerDialog(false);
                }}
              >
                Klant verwijderen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog - With Camera Support */}
      <Dialog open={showBarcodeDialog} onOpenChange={handleBarcodeDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5" />
              Barcode Scanner
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Camera Scanner Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera Scanner
                </Label>
                {cameraActive ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={stopCameraScanner}
                    className="text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <CameraOff className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={startCameraScanner}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Start Camera
                  </Button>
                )}
              </div>
              
              {/* Camera View */}
              <div 
                id="barcode-scanner-container" 
                className={`relative rounded-lg overflow-hidden bg-slate-900 ${cameraActive ? 'h-64' : 'h-32'}`}
              >
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">Klik "Start Camera" om te scannen</p>
                    <p className="text-xs text-slate-500 mt-1">Werkt op telefoon en tablet</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-4 text-center">
                    <CameraOff className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">{cameraError}</p>
                  </div>
                )}
              </div>
              
              {cameraActive && (
                <p className="text-xs text-center text-emerald-600 animate-pulse">
                  📷 Richt de camera op een barcode...
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-sm text-slate-500">of typ handmatig</span>
              </div>
            </div>

            {/* Manual Input Section */}
            <div className="space-y-2">
              <Label>Barcode / Artikelcode</Label>
              <div className="flex gap-2">
                <Input
                  ref={barcodeInputRef}
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                  placeholder="Typ barcode of artikelcode..."
                  className="flex-1"
                />
                <Button onClick={handleBarcodeSearch} disabled={!barcodeQuery}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Supported Formats */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">Ondersteunde formaten:</p>
              <p className="text-xs text-slate-400">
                EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, en meer
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleBarcodeDialogClose(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner Link / QR Code Dialog */}
      <Dialog open={showScannerLinkDialog} onOpenChange={setShowScannerLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">📱 Telefoon Scanner</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {scannerSession && (
              <>
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-inner">
                    <QRCode 
                      value={`${APP_URL}/scan/${scannerSession.code}`}
                      size={200}
                      level="M"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-center space-y-2">
                  <p className="text-slate-700 font-medium">
                    Scan deze QR code met je telefoon
                  </p>
                  <p className="text-sm text-slate-500">
                    Of open de link hieronder
                  </p>
                </div>

                {/* Link */}
                <div className="bg-slate-100 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Link:</p>
                  <p className="text-sm font-mono break-all text-slate-700">
                    {APP_URL}/scan/{scannerSession.code}
                  </p>
                </div>

                {/* Copy Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(`${APP_URL}/scan/${scannerSession.code}`);
                    toast.success('Link gekopieerd!');
                  }}
                >
                  📋 Kopieer Link
                </Button>

                {/* Session Info */}
                <div className="text-center text-xs text-slate-400">
                  <p>Sessie code: <span className="font-mono font-bold">{scannerSession.code}</span></p>
                  <p>Geldig tot: {new Date(scannerSession.expires_at).toLocaleTimeString('nl-NL')}</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScannerLinkDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSPage;
