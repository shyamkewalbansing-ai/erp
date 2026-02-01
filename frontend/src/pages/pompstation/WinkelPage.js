import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categories = [
  { value: 'snacks', label: 'Snacks' },
  { value: 'drinks', label: 'Dranken' },
  { value: 'oil', label: 'Olie & Vloeistoffen' },
  { value: 'accessories', label: 'Accessoires' },
  { value: 'gas_cylinders', label: 'Gasflessen' },
  { value: 'phone_cards', label: 'Telefoonkaarten' },
  { value: 'other', label: 'Overig' },
];

export default function WinkelPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'snacks',
    barcode: '',
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_alert: 5,
    supplier: ''
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = filterCategory !== 'all' 
        ? `${API_URL}/api/pompstation/products?category=${filterCategory}`
        : `${API_URL}/api/pompstation/products`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kon producten niet laden');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = selectedProduct 
        ? `${API_URL}/api/pompstation/products/${selectedProduct.id}`
        : `${API_URL}/api/pompstation/products`;
      
      const res = await fetch(url, {
        method: selectedProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Kon product niet opslaan');
      
      toast.success(selectedProduct ? 'Product bijgewerkt' : 'Product aangemaakt');
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Weet u zeker dat u "${product.name}" wilt verwijderen?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/pompstation/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Kon product niet verwijderen');
      
      toast.success('Product verwijderd');
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'snacks',
      barcode: '',
      purchase_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      supplier: ''
    });
    setSelectedProduct(null);
  };

  const openEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      barcode: product.barcode || '',
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      min_stock_alert: product.min_stock_alert,
      supplier: product.supplier || ''
    });
    setDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-winkel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-orange-500" />
            Winkel Voorraad
          </h1>
          <p className="text-muted-foreground mt-1">
            Beheer uw winkelproducten en voorraad
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuw Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedProduct ? 'Product Bewerken' : 'Nieuw Product'}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? 'Wijzig de productgegevens' : 'Voeg een nieuw product toe aan uw winkelvoorraad'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Productnaam</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Coca Cola 330ml"
                    required
                  />
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="8712345678901"
                  />
                </div>
                <div>
                  <Label>Inkoopprijs (SRD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label>Verkoopprijs (SRD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label>Voorraad</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label>Min. Voorraad Alert</Label>
                  <Input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({...formData, min_stock_alert: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Leverancier</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    placeholder="Naam leverancier"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annuleren
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  {selectedProduct ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert for low stock */}
      {lowStockCount > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <div>
                <p className="font-medium text-orange-600">Lage Voorraad Waarschuwing</p>
                <p className="text-sm text-muted-foreground">
                  {lowStockCount} product(en) hebben een lage voorraad
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const isLowStock = product.stock_quantity <= product.min_stock_alert;
          
          return (
            <Card key={product.id} className={isLowStock ? 'border-orange-500/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <CardDescription className="capitalize">{product.category}</CardDescription>
                  </div>
                  {isLowStock && (
                    <Badge variant="destructive" className="bg-orange-500">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Laag
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Voorraad</p>
                    <p className={`font-semibold ${isLowStock ? 'text-orange-500' : ''}`}>
                      {product.stock_quantity} stuks
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prijs</p>
                    <p className="font-semibold text-green-600">{formatCurrency(product.selling_price)}</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Marge: {product.profit_margin?.toFixed(1) || 0}%
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEdit(product)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Bewerken
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="p-8 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Geen producten gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterCategory !== 'all' 
              ? 'Pas uw zoekopdracht of filter aan'
              : 'Voeg uw eerste product toe om te beginnen'}
          </p>
          {!searchTerm && filterCategory === 'all' && (
            <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Product Toevoegen
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
