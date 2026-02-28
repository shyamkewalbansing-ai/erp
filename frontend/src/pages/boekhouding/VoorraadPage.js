import React, { useState, useEffect } from 'react';
import { productsAPI, warehousesAPI, stockMovementsAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Package, Warehouse, ArrowUpDown, Loader2, Search, AlertTriangle, ImagePlus, X, Pencil, Trash2 } from 'lucide-react';

const VoorraadPage = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
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
    image_url: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);

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
      const productData = {
        code: newProduct.code,
        naam: newProduct.name,
        omschrijving: newProduct.description,
        type: newProduct.type,
        eenheid: newProduct.unit,
        inkoopprijs: newProduct.purchase_price,
        verkoopprijs: newProduct.sales_price,
        minimum_voorraad: newProduct.min_stock,
        foto_url: newProduct.image_url || null
      };
      await productsAPI.create(productData);
      toast.success('Product aangemaakt');
      setShowProductDialog(false);
      setNewProduct({
        code: '', name: '', description: '', type: 'product',
        unit: 'stuk', purchase_price: 0, sales_price: 0, min_stock: 0, image_url: ''
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
      image_url: product.foto_url || product.image_url || ''
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
        foto_url: editingProduct.image_url || null
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
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 " data-testid="voorraad-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Voorraad</h1>
          <p className="text-slate-500 mt-0.5">Beheer producten en voorraadniveaus</p>
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
                          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-6 h-6 text-slate-400" />
                            <span className="text-xs text-slate-500 mt-1">Upload</span>
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
                    <div className="text-xs text-slate-500">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Producten</p>
                <p className="text-2xl font-semibold text-slate-900">{products.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Voorraadwaarde</p>
                <p className="text-2xl font-semibold text-slate-900">{formatAmount(totalValue)}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-white border border-slate-100 shadow-sm ${lowStockProducts.length > 0 ? 'bg-amber-50' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Lage Voorraad</p>
                <p className={`text-2xl font-semibold ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {lowStockProducts.length}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${lowStockProducts.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${lowStockProducts.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
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
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Producten</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16 text-xs font-medium text-slate-500">Foto</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500">Code</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Naam</TableHead>
                    <TableHead className="w-20 text-xs font-medium text-slate-500">Eenheid</TableHead>
                    <TableHead className="text-right w-24 text-xs font-medium text-slate-500">Voorraad</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-slate-500">Inkoopprijs</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-slate-500">Verkoopprijs</TableHead>
                    <TableHead className="text-right w-28 text-xs font-medium text-slate-500">Waarde</TableHead>
                    <TableHead className="w-24 text-xs font-medium text-slate-500 text-center">Acties</TableHead>
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
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{product.code}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {productName}
                        {isLowStock && (
                          <Badge className="ml-2 text-xs bg-amber-100 text-amber-700">Laag</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{unit}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                        {formatNumber(stockQty, 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">{formatAmount(purchasePrice)}</TableCell>
                      <TableCell className="text-right text-sm text-slate-600">{formatAmount(salesPrice)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-slate-900">
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
                            <Pencil className="w-4 h-4 text-slate-500" />
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
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
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
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Voorraadmutaties</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28 text-xs font-medium text-slate-500">Datum</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Product</TableHead>
                    <TableHead className="w-28 text-xs font-medium text-slate-500">Type</TableHead>
                    <TableHead className="text-right w-24 text-xs font-medium text-slate-500">Aantal</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Omschrijving</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(movement => {
                    const product = products.find(p => p.id === movement.product_id);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm text-slate-600">{formatDate(movement.date)}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">{product?.naam || product?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${
                            movement.type === 'in' ? 'bg-green-100 text-green-700' :
                            movement.type === 'out' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {movement.type === 'in' ? 'Inkomend' : movement.type === 'out' ? 'Uitgaand' : 'Correctie'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right text-sm font-medium ${movement.type === 'in' ? 'text-green-600' : movement.type === 'out' ? 'text-red-600' : 'text-slate-900'}`}>
                          {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{formatNumber(movement.quantity, 0)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{movement.description || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
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
    </div>
  );
};

export default VoorraadPage;
