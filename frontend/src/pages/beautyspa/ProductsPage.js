import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const categories = [
  { value: 'shampoo', label: 'Shampoo' },
  { value: 'oil', label: 'Olie' },
  { value: 'scrub', label: 'Scrub' },
  { value: 'nail_polish', label: 'Nagellak' },
  { value: 'cream', label: 'Crème' },
  { value: 'wax', label: 'Wax' },
  { value: 'other', label: 'Overig' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState({ product: null, quantity: 0, reason: '' });
  
  const [form, setForm] = useState({
    name: '', category: '', brand: '', description: '',
    purchase_price_srd: 0, selling_price_srd: 0,
    stock_quantity: 0, min_stock_level: 5,
    batch_number: '', expiry_date: '', supplier: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProducts();
  }, [lowStockOnly]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (lowStockOnly) params.append('low_stock', 'true');
      
      const res = await axios.get(`${API_URL}/beautyspa/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (error) {
      toast.error('Fout bij laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedProduct) {
        await axios.put(`${API_URL}/beautyspa/products/${selectedProduct.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Product bijgewerkt');
      } else {
        await axios.post(`${API_URL}/beautyspa/products`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Product toegevoegd');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout');
    }
  };

  const handleStockAdjust = async () => {
    if (!stockAdjustment.product || stockAdjustment.quantity === 0) return;
    
    try {
      await axios.post(
        `${API_URL}/beautyspa/products/${stockAdjustment.product.id}/adjust-stock?quantity=${stockAdjustment.quantity}&reason=${encodeURIComponent(stockAdjustment.reason || 'Handmatige aanpassing')}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Voorraad aangepast');
      setStockAdjustment({ product: null, quantity: 0, reason: '' });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanpassen');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Product verwijderen?')) return;
    try {
      await axios.delete(`${API_URL}/beautyspa/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Product verwijderd');
      fetchProducts();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setForm({
      name: '', category: '', brand: '', description: '',
      purchase_price_srd: 0, selling_price_srd: 0,
      stock_quantity: 0, min_stock_level: 5,
      batch_number: '', expiry_date: '', supplier: ''
    });
    setSelectedProduct(null);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setForm({ ...product });
    setIsDialogOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-products-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Producten & Voorraad</h1>
          <p className="text-slate-600">Beheer uw spa producten</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuw Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? 'Product Bewerken' : 'Nieuw Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Categorie *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})} required>
                    <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Merk</Label>
                  <Input value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Input value={form.supplier} onChange={(e) => setForm({...form, supplier: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inkoopprijs (SRD)</Label>
                  <Input type="number" value={form.purchase_price_srd} onChange={(e) => setForm({...form, purchase_price_srd: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Verkoopprijs (SRD) *</Label>
                  <Input type="number" value={form.selling_price_srd} onChange={(e) => setForm({...form, selling_price_srd: parseFloat(e.target.value) || 0})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voorraad</Label>
                  <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({...form, stock_quantity: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Min. Voorraadniveau</Label>
                  <Input type="number" value={form.min_stock_level} onChange={(e) => setForm({...form, min_stock_level: parseInt(e.target.value) || 5})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batchnummer</Label>
                  <Input value={form.batch_number} onChange={(e) => setForm({...form, batch_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Vervaldatum</Label>
                  <Input type="date" value={form.expiry_date} onChange={(e) => setForm({...form, expiry_date: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuleren</Button>
                <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                  {selectedProduct ? 'Bijwerken' : 'Toevoegen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button variant={lowStockOnly ? 'default' : 'outline'} onClick={() => setLowStockOnly(!lowStockOnly)}
              className={lowStockOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Lage Voorraad
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32 bg-slate-100"></CardContent></Card>)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Geen producten</h3>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-pink-500 to-purple-600">
            <Plus className="w-4 h-4 mr-2" /> Nieuw Product
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={`hover:shadow-lg transition-shadow ${product.stock_quantity <= product.min_stock_level ? 'border-amber-300 bg-amber-50' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    {product.brand && <p className="text-sm text-slate-500">{product.brand}</p>}
                  </div>
                  <Badge variant="outline">{categories.find(c => c.value === product.category)?.label || product.category}</Badge>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Voorraad</p>
                    <p className={`text-2xl font-bold ${product.stock_quantity <= product.min_stock_level ? 'text-amber-600' : 'text-slate-900'}`}>
                      {product.stock_quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Prijs</p>
                    <p className="text-lg font-bold text-emerald-600">SRD {product.selling_price_srd?.toLocaleString()}</p>
                  </div>
                </div>

                {product.stock_quantity <= product.min_stock_level && (
                  <div className="flex items-center gap-2 p-2 bg-amber-100 rounded-lg mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700">Lage voorraad!</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setStockAdjustment({ product, quantity: 0, reason: '' })}>
                    <ArrowUp className="w-3 h-3 mr-1" /> Voorraad
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(product.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!stockAdjustment.product} onOpenChange={() => setStockAdjustment({ product: null, quantity: 0, reason: '' })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Voorraad Aanpassen: {stockAdjustment.product?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setStockAdjustment(s => ({...s, quantity: s.quantity - 1}))}>
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Input type="number" value={stockAdjustment.quantity} onChange={(e) => setStockAdjustment(s => ({...s, quantity: parseInt(e.target.value) || 0}))}
                className="w-24 text-center text-2xl font-bold" />
              <Button variant="outline" size="icon" onClick={() => setStockAdjustment(s => ({...s, quantity: s.quantity + 1}))}>
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
            <Input placeholder="Reden (optioneel)" value={stockAdjustment.reason} onChange={(e) => setStockAdjustment(s => ({...s, reason: e.target.value}))} />
            <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600" onClick={handleStockAdjust} disabled={stockAdjustment.quantity === 0}>
              Voorraad Aanpassen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
