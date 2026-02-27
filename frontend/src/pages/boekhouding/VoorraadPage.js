import React, { useState, useEffect } from 'react';
import { productsAPI, stockAPI, warehousesAPI } from '../../lib/boekhoudingApi';
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
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProduct, setNewProduct] = useState({
    code: '', naam: '', omschrijving: '', type: 'product',
    eenheid: 'stuk', inkoopprijs: 0, verkoopprijs: 0, min_voorraad: 0
  });

  const [newMovement, setNewMovement] = useState({
    artikel_code: '', datum: new Date().toISOString().split('T')[0],
    type: 'inkoop', aantal: 0, omschrijving: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        productsAPI.getAll(),
        stockAPI.getMutaties().catch(() => [])
      ]);
      setProducts(Array.isArray(productsRes) ? productsRes : productsRes.data || []);
      setMovements(Array.isArray(movementsRes) ? movementsRes : movementsRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally { setLoading(false); }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.code || !newProduct.naam) { toast.error('Vul code en naam in'); return; }
    setSaving(true);
    try {
      await productsAPI.create(newProduct);
      toast.success('Product aangemaakt');
      setShowProductDialog(false);
      setNewProduct({ code: '', naam: '', omschrijving: '', type: 'product', eenheid: 'stuk', inkoopprijs: 0, verkoopprijs: 0, min_voorraad: 0 });
      fetchData();
    } catch (error) { toast.error(error.message || 'Fout bij aanmaken'); }
    finally { setSaving(false); }
  };

  const handleCreateMovement = async () => {
    if (!newMovement.artikel_code || !newMovement.aantal) { toast.error('Selecteer product en vul hoeveelheid in'); return; }
    setSaving(true);
    try {
      await stockAPI.createMutatie(newMovement);
      toast.success('Mutatie aangemaakt');
      setShowMovementDialog(false);
      setNewMovement({ artikel_code: '', datum: new Date().toISOString().split('T')[0], type: 'inkoop', aantal: 0, omschrijving: '' });
      fetchData();
    } catch (error) { toast.error(error.message || 'Fout bij aanmaken'); }
    finally { setSaving(false); }
  };

  const filteredProducts = products.filter(p => (p.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const totalValue = products.reduce((sum, p) => sum + ((p.voorraad || 0) * (p.inkoopprijs || 0)), 0);
  const lowStockProducts = products.filter(p => (p.voorraad || 0) <= (p.min_voorraad || 0) && (p.min_voorraad || 0) > 0);

  return (
    <div className="space-y-6" data-testid="voorraad-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Voorraad</h1>
          <p className="text-slate-500 mt-1">Beheer producten en voorraadniveaus</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogTrigger asChild><Button variant="outline" data-testid="add-product-btn"><Plus className="w-4 h-4 mr-2" />Product</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuw Product</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Code *</Label><Input value={newProduct.code} onChange={(e) => setNewProduct({...newProduct, code: e.target.value})} placeholder="P001" /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={newProduct.type} onValueChange={(v) => setNewProduct({...newProduct, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="dienst">Dienst</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Naam *</Label><Input value={newProduct.naam} onChange={(e) => setNewProduct({...newProduct, naam: e.target.value})} placeholder="Product naam" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Eenheid</Label>
                    <Select value={newProduct.eenheid} onValueChange={(v) => setNewProduct({...newProduct, eenheid: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="stuk">Stuk</SelectItem><SelectItem value="kg">Kilogram</SelectItem><SelectItem value="liter">Liter</SelectItem><SelectItem value="uur">Uur</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Min. voorraad</Label><Input type="number" value={newProduct.min_voorraad} onChange={(e) => setNewProduct({...newProduct, min_voorraad: parseFloat(e.target.value) || 0})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Inkoopprijs</Label><Input type="number" step="0.01" value={newProduct.inkoopprijs} onChange={(e) => setNewProduct({...newProduct, inkoopprijs: parseFloat(e.target.value) || 0})} /></div>
                  <div className="space-y-2"><Label>Verkoopprijs</Label><Input type="number" step="0.01" value={newProduct.verkoopprijs} onChange={(e) => setNewProduct({...newProduct, verkoopprijs: parseFloat(e.target.value) || 0})} /></div>
                </div>
                <Button onClick={handleCreateProduct} className="w-full" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
            <DialogTrigger asChild><Button data-testid="add-movement-btn"><Plus className="w-4 h-4 mr-2" />Mutatie</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuwe Voorraadmutatie</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Product *</Label>
                  <Select value={newMovement.artikel_code} onValueChange={(v) => setNewMovement({...newMovement, artikel_code: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecteer product" /></SelectTrigger>
                    <SelectContent>{products.filter(p => p.type === 'product').map(p => (<SelectItem key={p.code} value={p.code}>{p.code} - {p.naam}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Datum</Label><Input type="date" value={newMovement.datum} onChange={(e) => setNewMovement({...newMovement, datum: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={newMovement.type} onValueChange={(v) => setNewMovement({...newMovement, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="inkoop">Inkoop</SelectItem><SelectItem value="verkoop">Verkoop</SelectItem><SelectItem value="correctie">Correctie</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Hoeveelheid *</Label><Input type="number" value={newMovement.aantal} onChange={(e) => setNewMovement({...newMovement, aantal: parseFloat(e.target.value) || 0})} /></div>
                <div className="space-y-2"><Label>Omschrijving</Label><Input value={newMovement.omschrijving} onChange={(e) => setNewMovement({...newMovement, omschrijving: e.target.value})} placeholder="Reden" /></div>
                <Button onClick={handleCreateMovement} className="w-full" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Totaal Producten</p><p className="text-2xl font-bold font-mono text-slate-900">{products.length}</p></div><div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"><Package className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Voorraadwaarde</p><p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalValue)}</p></div><div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center"><Warehouse className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card className={`border-slate-200 ${lowStockProducts.length > 0 ? 'bg-amber-50' : ''}`}><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Lage Voorraad</p><p className={`text-2xl font-bold font-mono ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{lowStockProducts.length}</p></div><div className={`w-12 h-12 rounded-lg flex items-center justify-center ${lowStockProducts.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}><AlertTriangle className={`w-6 h-6 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} /></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList><TabsTrigger value="products" data-testid="tab-products"><Package className="w-4 h-4 mr-2" />Producten</TabsTrigger><TabsTrigger value="movements" data-testid="tab-movements"><ArrowUpDown className="w-4 h-4 mr-2" />Mutaties</TabsTrigger></TabsList>
        <TabsContent value="products" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-lg">Producten</CardTitle><div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div></CardHeader>
            <CardContent>
              {loading ? <div className="text-center py-8 text-slate-500">Laden...</div> : (
                <Table>
                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-24">Code</TableHead><TableHead>Naam</TableHead><TableHead className="w-20">Eenheid</TableHead><TableHead className="text-right w-24">Voorraad</TableHead><TableHead className="text-right w-28">Inkoopprijs</TableHead><TableHead className="text-right w-28">Verkoopprijs</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredProducts.map(product => (
                      <TableRow key={product.code} data-testid={`product-row-${product.code}`}>
                        <TableCell className="font-mono">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.naam}{(product.voorraad || 0) <= (product.min_voorraad || 0) && (product.min_voorraad || 0) > 0 && <Badge className="ml-2 bg-amber-100 text-amber-700">Laag</Badge>}</TableCell>
                        <TableCell>{product.eenheid}</TableCell>
                        <TableCell className={`text-right font-mono ${(product.voorraad || 0) <= (product.min_voorraad || 0) && (product.min_voorraad || 0) > 0 ? 'text-amber-600' : ''}`}>{formatNumber(product.voorraad || 0, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(product.inkoopprijs || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(product.verkoopprijs || 0)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredProducts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">{searchTerm ? 'Geen producten gevonden' : 'Geen producten. Maak uw eerste product aan.'}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-lg">Voorraadmutaties</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-28">Datum</TableHead><TableHead>Product</TableHead><TableHead className="w-28">Type</TableHead><TableHead className="text-right w-24">Aantal</TableHead><TableHead>Omschrijving</TableHead></TableRow></TableHeader>
                <TableBody>
                  {movements.map((movement, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDate(movement.datum)}</TableCell>
                      <TableCell className="font-medium">{movement.artikel_naam || movement.artikel_code}</TableCell>
                      <TableCell><Badge className={movement.type === 'inkoop' ? 'bg-green-100 text-green-700' : movement.type === 'verkoop' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>{movement.type === 'inkoop' ? 'Inkoop' : movement.type === 'verkoop' ? 'Verkoop' : 'Correctie'}</Badge></TableCell>
                      <TableCell className={`text-right font-mono ${movement.type === 'inkoop' ? 'text-green-600' : movement.type === 'verkoop' ? 'text-red-600' : ''}`}>{movement.type === 'inkoop' ? '+' : movement.type === 'verkoop' ? '-' : ''}{formatNumber(movement.aantal || 0, 0)}</TableCell>
                      <TableCell className="text-slate-500">{movement.omschrijving || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Geen mutaties gevonden</TableCell></TableRow>}
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
