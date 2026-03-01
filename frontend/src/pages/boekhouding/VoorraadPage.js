import React, { useState, useEffect, useRef } from 'react';
import { productsAPI, warehousesAPI, stockMovementsAPI, toBackendFormat } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Package, Warehouse, ArrowUpDown, Loader2, Search, AlertTriangle, ImagePlus, X, Pencil, Trash2, Camera, CameraOff, Barcode, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VoorraadPage = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditMovementDialog, setShowEditMovementDialog] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingMovement, setDeletingMovement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    description: '',
    type: 'product',
    unit: 'stuk',
    purchase_price: 0,
    sales_price: 0,
    min_stock: 0,
    image_url: '',
    barcode: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [showBarcodeScanDialog, setShowBarcodeScanDialog] = useState(false);
  const [barcodeScanTarget, setBarcodeScanTarget] = useState('new'); // 'new' or 'edit'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);
  const lastScannedRef = useRef({ barcode: null, time: 0 });
  const scanCooldown = 3000; // 3 seconds cooldown between same barcode scans

  const [newMovement, setNewMovement] = useState({
    artikel_id: '',
    magazijn_id: '',
    datum: new Date().toISOString().split('T')[0],
    type: 'inkoop',
    aantal: 0,
    opmerkingen: ''
  });

  // Format number with Dutch locale
  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  const formatNumber = (num, decimals = 0) => {
    return new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num || 0);
  };

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Alleen afbeeldingen zijn toegestaan');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Afbeelding mag maximaal 5MB zijn');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/boekhouding/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setNewProduct({...newProduct, image_url: data.url});
        toast.success('Afbeelding geüpload');
      } else {
        toast.error('Fout bij uploaden afbeelding');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fout bij uploaden afbeelding');
    } finally {
      setUploadingImage(false);
    }
  };

  // Barcode Scanner Functions
  const startBarcodeScanner = async () => {
    setCameraError(null);
    
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera wordt niet ondersteund. Gebruik Safari op iOS.');
        return;
      }

      // Request camera permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        stream.getTracks().forEach(track => track.stop());
      } catch (permErr) {
        if (permErr.name === 'NotAllowedError') {
          setCameraError(isIOSDevice 
            ? 'Camera geweigerd. Ga naar Instellingen → Safari → Camera' 
            : 'Camera toegang geweigerd.');
        } else if (permErr.name === 'NotFoundError') {
          setCameraError('Geen camera gevonden.');
        } else if (permErr.name === 'OverconstrainedError') {
          // Try without constraints
          try {
            const fallback = await navigator.mediaDevices.getUserMedia({ video: true });
            fallback.getTracks().forEach(track => track.stop());
          } catch (e) {
            setCameraError('Camera niet beschikbaar.');
            return;
          }
        } else {
          setCameraError('Camera niet beschikbaar.');
        }
        return;
      }

      // Clean up any existing scanner
      if (html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch (e) {}
        html5QrCodeRef.current = null;
      }

      // Wait for iOS
      await new Promise(resolve => setTimeout(resolve, isIOSDevice ? 500 : 100));

      const html5QrCode = new Html5Qrcode("barcode-scanner-voorraad");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => handleScannedBarcode(decodedText),
        () => {}
      );

      setCameraActive(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setCameraError('Kon scanner niet starten. Ververs de pagina.');
    }
  };

  const stopBarcodeScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {}
    }
    setCameraActive(false);
  };

  const handleScannedBarcode = (barcode) => {
    const now = Date.now();
    
    // Prevent duplicate scans of the same barcode within cooldown period
    if (lastScannedRef.current.barcode === barcode && 
        now - lastScannedRef.current.time < scanCooldown) {
      return; // Ignore duplicate scan
    }
    
    // Update last scanned reference
    lastScannedRef.current = { barcode, time: now };
    
    // Stop scanner immediately after successful scan
    stopBarcodeScanner();
    
    if (barcodeScanTarget === 'new') {
      setNewProduct(prev => ({ ...prev, barcode }));
    } else if (barcodeScanTarget === 'edit' && editingProduct) {
      setEditingProduct(prev => ({ ...prev, barcode }));
    }
    
    setShowBarcodeScanDialog(false);
    toast.success(`Barcode gescand: ${barcode}`);
  };

  const openBarcodeScanner = (target) => {
    setBarcodeScanTarget(target);
    setShowBarcodeScanDialog(true);
  };

  const closeBarcodeScanner = () => {
    stopBarcodeScanner();
    setShowBarcodeScanDialog(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, warehousesRes, movementsRes] = await Promise.all([
        productsAPI.getAll(),
        warehousesAPI.getAll(),
        stockMovementsAPI.getAll()
      ]);
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.code || !newProduct.name) {
      toast.error('Vul code en naam in');
      return;
    }
    setSaving(true);
    try {
      // Use central helper for field name conversion
      const productData = toBackendFormat({
        code: newProduct.code,
        name: newProduct.name,
        description: newProduct.description,
        type: newProduct.type,
        unit: newProduct.unit,
        purchase_price: newProduct.purchase_price,
        sales_price: newProduct.sales_price,
        min_stock: newProduct.min_stock,
        image_url: newProduct.image_url || null,
        barcode: newProduct.barcode || null
      });
      
      await productsAPI.create(productData);
      toast.success('Product aangemaakt');
      setShowProductDialog(false);
      setNewProduct({
        code: '', name: '', description: '', type: 'product',
        unit: 'stuk', purchase_price: 0, sales_price: 0, min_stock: 0, image_url: '', barcode: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async () => {
    if (!newMovement.artikel_id || !newMovement.aantal) {
      toast.error('Selecteer product en vul aantal in');
      return;
    }
    setSaving(true);
    try {
      await stockMovementsAPI.create(newMovement);
      toast.success('Mutatie aangemaakt');
      setShowMovementDialog(false);
      setNewMovement({
        artikel_id: '', magazijn_id: '',
        datum: new Date().toISOString().split('T')[0],
        type: 'inkoop', aantal: 0, opmerkingen: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  // Edit product
  const handleEditProduct = (product) => {
    setEditingProduct({
      id: product.id,
      code: product.code || '',
      name: product.naam || product.name || '',
      description: product.omschrijving || product.description || '',
      type: product.type || 'product',
      unit: product.eenheid || product.unit || 'stuk',
      purchase_price: product.inkoopprijs || product.purchase_price || 0,
      sales_price: product.verkoopprijs || product.sales_price || 0,
      min_stock: product.minimum_voorraad || product.min_stock || 0,
      image_url: product.foto_url || product.image_url || '',
      barcode: product.barcode || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct.code || !editingProduct.name) {
      toast.error('Vul code en naam in');
      return;
    }
    setSaving(true);
    try {
      const productData = {
        code: editingProduct.code,
        naam: editingProduct.name,
        omschrijving: editingProduct.description,
        type: editingProduct.type,
        eenheid: editingProduct.unit,
        inkoopprijs: editingProduct.purchase_price,
        verkoopprijs: editingProduct.sales_price,
        minimum_voorraad: editingProduct.min_stock,
        foto_url: editingProduct.image_url || null,
        barcode: editingProduct.barcode || null
      };
      await productsAPI.update(editingProduct.id, productData);
      toast.success('Product bijgewerkt');
      setShowEditDialog(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    } finally {
      setSaving(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Weet u zeker dat u dit product wilt verwijderen?')) {
      return;
    }
    setDeleting(productId);
    try {
      await productsAPI.delete(productId);
      toast.success('Product verwijderd');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    } finally {
      setDeleting(null);
    }
  };

  // Delete movement
  const handleDeleteMovement = async (movementId) => {
    if (!window.confirm('Weet u zeker dat u deze mutatie wilt verwijderen? De voorraad wordt NIET automatisch aangepast.')) {
      return;
    }
    setDeletingMovement(movementId);
    try {
      await stockMovementsAPI.delete(movementId);
      toast.success('Mutatie verwijderd');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    } finally {
      setDeletingMovement(null);
    }
  };

  const filteredProducts = products.filter(p =>
    (p.naam || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = products.reduce((sum, p) => sum + ((p.voorraad || p.voorraad_aantal || p.stock_quantity || 0) * (p.inkoopprijs || p.purchase_price || 0)), 0);
  const lowStockProducts = products.filter(p => {
    const stock = p.voorraad || p.voorraad_aantal || p.stock_quantity || 0;
    const minStock = p.minimum_voorraad || p.min_stock || 0;
    return stock <= minStock && minStock > 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="voorraad-page">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="voorraad-page">
      {/* Header - matching VerkoopPage */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Voorraad</h1>
          <p className="text-gray-500 mt-0.5">Beheer producten en voorraadniveaus</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-product-btn">
                <Plus className="w-4 h-4 mr-2" />
                Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      value={newProduct.code}
                      onChange={(e) => setNewProduct({...newProduct, code: e.target.value})}
                      placeholder="P001"
                      data-testid="product-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newProduct.type} onValueChange={(v) => setNewProduct({...newProduct, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="service">Dienst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Product naam"
                    data-testid="product-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving</Label>
                  <Input
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Beschrijving"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Eenheid</Label>
                    <Select value={newProduct.unit} onValueChange={(v) => setNewProduct({...newProduct, unit: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stuk">Stuk</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="liter">Liter</SelectItem>
                        <SelectItem value="meter">Meter</SelectItem>
                        <SelectItem value="uur">Uur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Min. voorraad</Label>
                    <Input
                      type="number"
                      value={newProduct.min_stock}
                      onChange={(e) => setNewProduct({...newProduct, min_stock: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inkoopprijs</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newProduct.purchase_price}
                      onChange={(e) => setNewProduct({...newProduct, purchase_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verkoopprijs</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newProduct.sales_price}
                      onChange={(e) => setNewProduct({...newProduct, sales_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                
                {/* Barcode */}
                <div className="space-y-2">
                  <Label>Barcode / EAN</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                      placeholder="Barcode of EAN nummer"
                      className="flex-1"
                      data-testid="product-barcode-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openBarcodeScanner('new')}
                      className="flex items-center gap-1"
                      data-testid="scan-barcode-btn"
                    >
                      <ScanLine className="w-4 h-4" />
                      Scan
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Gebruik de camera om een barcode te scannen</p>
                </div>

                {/* Product Foto Upload */}
                <div className="space-y-2">
                  <Label>Product Foto</Label>
                  <div className="flex items-center gap-4">
                    {newProduct.image_url ? (
                      <div className="relative">
                        <img 
                          src={newProduct.image_url} 
                          alt="Product" 
                          className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setNewProduct({...newProduct, image_url: ''})}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        {uploadingImage ? (
                          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">Upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                    <div className="text-xs text-gray-500">
                      <p>Max. 5MB</p>
                      <p>JPG, PNG of GIF</p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleCreateProduct} className="w-full" disabled={saving} data-testid="save-product-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-movement-btn">
                <Plus className="w-4 h-4 mr-2" />
                Mutatie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Voorraadmutatie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={newMovement.artikel_id} onValueChange={(v) => setNewMovement({...newMovement, artikel_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.filter(p => p.type === 'product').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.naam || p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Magazijn *</Label>
                  <Select value={newMovement.magazijn_id} onValueChange={(v) => setNewMovement({...newMovement, magazijn_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer magazijn" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.length > 0 ? warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.naam || w.name}</SelectItem>
                      )) : (
                        <SelectItem value="default">Hoofdmagazijn</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={newMovement.datum}
                      onChange={(e) => setNewMovement({...newMovement, datum: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newMovement.type} onValueChange={(v) => setNewMovement({...newMovement, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inkoop">Inkoop</SelectItem>
                        <SelectItem value="verkoop">Verkoop</SelectItem>
                        <SelectItem value="correctie_plus">Correctie +</SelectItem>
                        <SelectItem value="correctie_min">Correctie -</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Aantal *</Label>
                  <Input
                    type="number"
                    value={newMovement.aantal}
                    onChange={(e) => setNewMovement({...newMovement, aantal: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opmerkingen</Label>
                  <Input
                    value={newMovement.opmerkingen}
                    onChange={(e) => setNewMovement({...newMovement, opmerkingen: e.target.value})}
                    placeholder="Reden van mutatie"
                  />
                </div>
                <Button onClick={handleCreateMovement} className="w-full" disabled={saving || !newMovement.artikel_id || !newMovement.magazijn_id || newMovement.aantal <= 0}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Product Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Product Bewerken</DialogTitle>
              </DialogHeader>
              {editingProduct && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Code *</Label>
                      <Input
                        value={editingProduct.code}
                        onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value})}
                        placeholder="PRD001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={editingProduct.type} onValueChange={(v) => setEditingProduct({...editingProduct, type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="dienst">Dienst</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Naam *</Label>
                    <Input
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                      placeholder="Productnaam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Omschrijving</Label>
                    <Input
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      placeholder="Korte beschrijving"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Eenheid</Label>
                      <Select value={editingProduct.unit} onValueChange={(v) => setEditingProduct({...editingProduct, unit: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stuk">Stuk</SelectItem>
                          <SelectItem value="kg">Kilogram</SelectItem>
                          <SelectItem value="liter">Liter</SelectItem>
                          <SelectItem value="meter">Meter</SelectItem>
                          <SelectItem value="uur">Uur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Inkoopprijs</Label>
                      <Input
                        type="number"
                        value={editingProduct.purchase_price}
                        onChange={(e) => setEditingProduct({...editingProduct, purchase_price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Verkoopprijs</Label>
                      <Input
                        type="number"
                        value={editingProduct.sales_price}
                        onChange={(e) => setEditingProduct({...editingProduct, sales_price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Voorraad</Label>
                    <Input
                      type="number"
                      value={editingProduct.min_stock}
                      onChange={(e) => setEditingProduct({...editingProduct, min_stock: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  
                  {/* Barcode in Edit Dialog */}
                  <div className="space-y-2">
                    <Label>Barcode / EAN</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingProduct.barcode || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                        placeholder="Barcode of EAN nummer"
                        className="flex-1"
                        data-testid="edit-product-barcode-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openBarcodeScanner('edit')}
                        className="flex items-center gap-1"
                        data-testid="edit-scan-barcode-btn"
                      >
                        <ScanLine className="w-4 h-4" />
                        Scan
                      </Button>
                    </div>
                  </div>
                  
                  <Button onClick={handleUpdateProduct} className="w-full" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Opslaan
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Barcode Scanner Dialog */}
          <Dialog open={showBarcodeScanDialog} onOpenChange={(open) => {
            if (!open) closeBarcodeScanner();
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5" />
                  Barcode Scannen
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Camera View */}
                <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                  <div id="barcode-scanner-voorraad" className="w-full" />
                  
                  {/* Scanning overlay */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-40 border-2 border-emerald-400 rounded-lg relative">
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-pulse" 
                             style={{ animation: 'scan 2s ease-in-out infinite' }} />
                      </div>
                    </div>
                  )}
                  
                  {/* Camera Error */}
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                      <div className="text-center p-4">
                        <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-white text-sm mb-3">{cameraError}</p>
                        <Button 
                          onClick={startBarcodeScanner} 
                          variant="outline" 
                          size="sm"
                          className="text-white border-white hover:bg-slate-800"
                        >
                          Opnieuw proberen
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Start camera prompt */}
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Camera className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <Button 
                          onClick={startBarcodeScanner} 
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Camera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-center text-sm text-gray-500">
                  Richt de camera op de barcode. Deze wordt automatisch gescand.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeBarcodeScanner}>
                  Annuleren
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards - matching VerkoopPage style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-medium truncate">Totaal Producten</p>
                <p className="text-sm lg:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">{products.length}</p>
                <p className="text-xs mt-1 text-gray-400">In catalogus</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-medium truncate">Voorraadwaarde</p>
                <p className="text-sm lg:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">{formatAmount(totalValue)}</p>
                <p className="text-xs mt-1 text-emerald-600">Totale waarde</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Warehouse className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-medium truncate">Mutaties</p>
                <p className="text-sm lg:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">{movements.length}</p>
                <p className="text-xs mt-1 text-gray-400">Deze periode</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <ArrowUpDown className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500 font-medium truncate">Lage Voorraad</p>
                <p className={`text-sm lg:text-base font-bold mt-1 whitespace-nowrap ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {lowStockProducts.length}
                </p>
                <p className={`text-xs mt-1 ${lowStockProducts.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {lowStockProducts.length > 0 ? 'Actie vereist' : 'Alles op voorraad'}
                </p>
              </div>
              <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${lowStockProducts.length > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-4 h-4 lg:w-5 lg:h-5 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" data-testid="tab-products">
            <Package className="w-4 h-4 mr-2" />
            Producten
          </TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Mutaties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Producten</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Zoeken..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="search-products"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-16 text-xs font-medium text-gray-500">Foto</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-gray-500">Code</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Naam</TableHead>
                    <TableHead className="w-28 text-xs font-medium text-gray-500">Barcode</TableHead>
                    <TableHead className="w-20 text-xs font-medium text-gray-500">Eenheid</TableHead>
                    <TableHead className="text-right w-24 text-xs font-medium text-gray-500">Voorraad</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-gray-500">Inkoopprijs</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-gray-500">Verkoopprijs</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-gray-500">Waarde</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-gray-500 text-center">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(product => {
                    const productName = product.naam || product.name || '';
                    const stockQty = product.voorraad || product.voorraad_aantal || product.stock_quantity || 0;
                    const minStock = product.minimum_voorraad || product.min_stock || 0;
                    const purchasePrice = product.inkoopprijs || product.purchase_price || 0;
                    const salesPrice = product.verkoopprijs || product.sales_price || 0;
                    const unit = product.eenheid || product.unit || '';
                    const fotoUrl = product.foto_url || product.image_url;
                    const productBarcode = product.barcode || '';
                    const isLowStock = stockQty <= minStock && minStock > 0;
                    
                    return (
                    <TableRow key={product.id} data-testid={`product-row-${product.code}`}>
                      <TableCell>
                        {fotoUrl ? (
                          <img 
                            src={fotoUrl.startsWith('/') ? `${API_URL}${fotoUrl}` : fotoUrl} 
                            alt={productName} 
                            className="w-10 h-10 object-cover rounded-md border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{product.code}</TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {productName}
                        {isLowStock && (
                          <Badge className="ml-2 text-xs bg-amber-100 text-amber-700">Laag</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {productBarcode ? (
                          <span className="flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            <span className="font-mono text-xs">{productBarcode}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{unit}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                        {formatNumber(stockQty, 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">{formatAmount(purchasePrice)}</TableCell>
                      <TableCell className="text-right text-sm text-gray-600">{formatAmount(salesPrice)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-gray-900">
                        {formatAmount(stockQty * purchasePrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditProduct(product)}
                            className="h-8 w-8 p-0 hover:bg-slate-100"
                            data-testid={`edit-product-${product.code}`}
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deleting === product.id}
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            data-testid={`delete-product-${product.code}`}
                          >
                            {deleting === product.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'Geen producten gevonden' : 'Geen producten. Maak uw eerste product aan.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">Voorraadmutaties</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28 text-xs font-medium text-gray-500">Datum</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Product</TableHead>
                    <TableHead className="w-28 text-xs font-medium text-gray-500">Type</TableHead>
                    <TableHead className="text-right w-24 text-xs font-medium text-gray-500">Aantal</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Opmerkingen</TableHead>
                    <TableHead className="w-20 text-xs font-medium text-gray-500 text-center">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(movement => {
                    const product = products.find(p => p.id === (movement.artikel_id || movement.product_id));
                    const movementDate = movement.datum || movement.date || movement.created_at;
                    const movementQty = movement.aantal || movement.quantity || 0;
                    const movementType = movement.type;
                    const movementDesc = movement.opmerkingen || movement.description || '-';
                    
                    // Determine display type based on actual type values
                    const getTypeDisplay = (type) => {
                      switch(type) {
                        case 'inkoop': return { label: 'Inkoop', color: 'bg-green-100 text-green-700', sign: '+' };
                        case 'verkoop': return { label: 'Verkoop', color: 'bg-red-100 text-red-700', sign: '-' };
                        case 'correctie_plus': return { label: 'Correctie +', color: 'bg-blue-100 text-blue-700', sign: '+' };
                        case 'correctie_min': return { label: 'Correctie -', color: 'bg-orange-100 text-orange-700', sign: '-' };
                        case 'in': return { label: 'Inkomend', color: 'bg-green-100 text-green-700', sign: '+' };
                        case 'out': return { label: 'Uitgaand', color: 'bg-red-100 text-red-700', sign: '-' };
                        default: return { label: type, color: 'bg-slate-100 text-gray-700', sign: '' };
                      }
                    };
                    const typeInfo = getTypeDisplay(movementType);
                    
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm text-gray-600">{formatDate(movementDate)}</TableCell>
                        <TableCell className="text-sm font-medium text-gray-900">{product?.naam || product?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right text-sm font-medium ${typeInfo.sign === '+' ? 'text-green-600' : typeInfo.sign === '-' ? 'text-red-600' : 'text-gray-900'}`}>
                          {typeInfo.sign}{formatNumber(movementQty, 0)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{movementDesc}</TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteMovement(movement.id)}
                            disabled={deletingMovement === movement.id}
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            data-testid={`delete-movement-${movement.id}`}
                          >
                            {deletingMovement === movement.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Geen mutaties gevonden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Scanner Animation Styles */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

export default VoorraadPage;
