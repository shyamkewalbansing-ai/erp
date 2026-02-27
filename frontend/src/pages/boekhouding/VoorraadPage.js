import React, { useState, useEffect } from 'react';
import { productsAPI, warehousesAPI, stockMovementsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatNumber, formatDate } from '../../lib/utils';
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
import { Plus, Package, Warehouse, ArrowUpDown, Loader2, Search, AlertTriangle } from 'lucide-react';

const VoorraadPage = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    description: '',
    type: 'product',
    unit: 'stuk',
    purchase_price: 0,
    sales_price: 0,
    min_stock: 0
  });

  const [newMovement, setNewMovement] = useState({
    product_id: '',
    warehouse_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'in',
    quantity: 0,
    description: ''
  });

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
      await productsAPI.create(newProduct);
      toast.success('Product aangemaakt');
      setShowProductDialog(false);
      setNewProduct({
        code: '', name: '', description: '', type: 'product',
        unit: 'stuk', purchase_price: 0, sales_price: 0, min_stock: 0
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async () => {
    if (!newMovement.product_id || !newMovement.quantity) {
      toast.error('Selecteer product en vul hoeveelheid in');
      return;
    }
    setSaving(true);
    try {
      await stockMovementsAPI.create(newMovement);
      toast.success('Mutatie aangemaakt');
      setShowMovementDialog(false);
      setNewMovement({
        product_id: '', warehouse_id: '',
        date: new Date().toISOString().split('T')[0],
        type: 'in', quantity: 0, description: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock && p.min_stock > 0);

  return (
    <div className="space-y-6" data-testid="voorraad-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Voorraad</h1>
          <p className="text-slate-500 mt-1">Beheer producten en voorraadniveaus</p>
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
                  <Select value={newMovement.product_id} onValueChange={(v) => setNewMovement({...newMovement, product_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.filter(p => p.type === 'product').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={newMovement.date}
                      onChange={(e) => setNewMovement({...newMovement, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newMovement.type} onValueChange={(v) => setNewMovement({...newMovement, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Inkomend</SelectItem>
                        <SelectItem value="out">Uitgaand</SelectItem>
                        <SelectItem value="adjustment">Correctie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hoeveelheid *</Label>
                  <Input
                    type="number"
                    value={newMovement.quantity}
                    onChange={(e) => setNewMovement({...newMovement, quantity: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Omschrijving</Label>
                  <Input
                    value={newMovement.description}
                    onChange={(e) => setNewMovement({...newMovement, description: e.target.value})}
                    placeholder="Reden van mutatie"
                  />
                </div>
                <Button onClick={handleCreateMovement} className="w-full" disabled={saving}>
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
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Producten</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{products.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Voorraadwaarde</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-slate-200 ${lowStockProducts.length > 0 ? 'bg-amber-50' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Lage Voorraad</p>
                <p className={`text-2xl font-bold font-mono ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {lowStockProducts.length}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${lowStockProducts.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
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
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Producten</CardTitle>
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
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="w-20">Eenheid</TableHead>
                    <TableHead className="text-right w-24">Voorraad</TableHead>
                    <TableHead className="text-right w-28">Inkoopprijs</TableHead>
                    <TableHead className="text-right w-28">Verkoopprijs</TableHead>
                    <TableHead className="text-right w-28">Waarde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(product => (
                    <TableRow key={product.id} data-testid={`product-row-${product.code}`}>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                        {product.stock_quantity <= product.min_stock && product.min_stock > 0 && (
                          <Badge className="ml-2 bg-amber-100 text-amber-700">Laag</Badge>
                        )}
                      </TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className={`text-right font-mono ${product.stock_quantity <= product.min_stock && product.min_stock > 0 ? 'text-amber-600' : ''}`}>
                        {formatNumber(product.stock_quantity, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(product.purchase_price)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(product.sales_price)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(product.stock_quantity * product.purchase_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
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
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Voorraadmutaties</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="text-right w-24">Aantal</TableHead>
                    <TableHead>Omschrijving</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(movement => {
                    const product = products.find(p => p.id === movement.product_id);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>{formatDate(movement.date)}</TableCell>
                        <TableCell className="font-medium">{product?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            movement.type === 'in' ? 'bg-green-100 text-green-700' :
                            movement.type === 'out' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {movement.type === 'in' ? 'Inkomend' : movement.type === 'out' ? 'Uitgaand' : 'Correctie'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono ${movement.type === 'in' ? 'text-green-600' : movement.type === 'out' ? 'text-red-600' : ''}`}>
                          {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{formatNumber(movement.quantity, 0)}
                        </TableCell>
                        <TableCell className="text-slate-500">{movement.description || '-'}</TableCell>
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
