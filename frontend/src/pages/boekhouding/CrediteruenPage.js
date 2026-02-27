import React, { useState, useEffect } from 'react';
import { suppliersAPI, purchaseInvoicesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
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
import { Plus, Truck, Receipt, Search, Loader2 } from 'lucide-react';

const CrediteruenPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newSupplier, setNewSupplier] = useState({
    code: '',
    naam: '',
    adres: '',
    stad: '',
    telefoon: '',
    email: '',
    btw_nummer: '',
    betalingstermijn: 30,
    valuta: 'SRD'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersRes, invoicesRes] = await Promise.all([
        suppliersAPI.getAll(),
        purchaseInvoicesAPI.getAll()
      ]);
      setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : suppliersRes.data || []);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : invoicesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.code || !newSupplier.naam) {
      toast.error('Vul code en naam in');
      return;
    }
    setSaving(true);
    try {
      await suppliersAPI.create(newSupplier);
      toast.success('Leverancier aangemaakt');
      setShowSupplierDialog(false);
      setNewSupplier({
        code: '', naam: '', adres: '', stad: '', telefoon: '', email: '',
        btw_nummer: '', betalingstermijn: 30, valuta: 'SRD'
      });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    (s.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.openstaand_saldo || 0), 0);

  return (
    <div className="space-y-6" data-testid="crediteuren-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Crediteuren</h1>
          <p className="text-slate-500 mt-1">Beheer uw leveranciers en inkoopfacturen</p>
        </div>
        <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-supplier-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Leverancier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nieuwe Leverancier</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={newSupplier.code}
                  onChange={(e) => setNewSupplier({...newSupplier, code: e.target.value})}
                  placeholder="L001"
                  data-testid="supplier-code-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  value={newSupplier.naam}
                  onChange={(e) => setNewSupplier({...newSupplier, naam: e.target.value})}
                  placeholder="Leverancier naam"
                  data-testid="supplier-name-input"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Adres</Label>
                <Input
                  value={newSupplier.adres}
                  onChange={(e) => setNewSupplier({...newSupplier, adres: e.target.value})}
                  placeholder="Straat en nummer"
                />
              </div>
              <div className="space-y-2">
                <Label>Stad</Label>
                <Input
                  value={newSupplier.stad}
                  onChange={(e) => setNewSupplier({...newSupplier, stad: e.target.value})}
                  placeholder="Paramaribo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefoon</Label>
                <Input
                  value={newSupplier.telefoon}
                  onChange={(e) => setNewSupplier({...newSupplier, telefoon: e.target.value})}
                  placeholder="+597 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                  placeholder="info@leverancier.sr"
                />
              </div>
              <div className="space-y-2">
                <Label>BTW-nummer</Label>
                <Input
                  value={newSupplier.btw_nummer}
                  onChange={(e) => setNewSupplier({...newSupplier, btw_nummer: e.target.value})}
                  placeholder="BTW123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Betalingstermijn (dagen)</Label>
                <Input
                  type="number"
                  value={newSupplier.betalingstermijn}
                  onChange={(e) => setNewSupplier({...newSupplier, betalingstermijn: parseInt(e.target.value) || 30})}
                />
              </div>
              <div className="space-y-2">
                <Label>Valuta</Label>
                <Select value={newSupplier.valuta} onValueChange={(v) => setNewSupplier({...newSupplier, valuta: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Button onClick={handleCreateSupplier} className="w-full" disabled={saving} data-testid="save-supplier-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Opslaan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Leveranciers</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{suppliers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Te Betalen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">
            <Truck className="w-4 h-4 mr-2" />
            Leveranciers
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-purchase-invoices">
            <Receipt className="w-4 h-4 mr-2" />
            Inkoopfacturen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Leverancierslijst</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="search-suppliers"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead>Naam</TableHead>
                      <TableHead>Stad</TableHead>
                      <TableHead>Telefoon</TableHead>
                      <TableHead className="w-20">Valuta</TableHead>
                      <TableHead className="text-right w-32">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map(supplier => (
                      <TableRow key={supplier.code} data-testid={`supplier-row-${supplier.code}`}>
                        <TableCell className="font-mono">{supplier.code}</TableCell>
                        <TableCell className="font-medium">{supplier.naam}</TableCell>
                        <TableCell className="text-slate-500">{supplier.stad || '-'}</TableCell>
                        <TableCell className="text-slate-500">{supplier.telefoon || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{supplier.valuta}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono ${(supplier.openstaand_saldo || 0) > 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(supplier.openstaand_saldo || 0, supplier.valuta)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSuppliers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          {searchTerm ? 'Geen leveranciers gevonden' : 'Geen leveranciers. Maak uw eerste leverancier aan.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Inkoopfacturen</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Nummer</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Leverancier</TableHead>
                    <TableHead className="w-28">Vervaldatum</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(invoice => (
                    <TableRow key={invoice.factuurnummer} data-testid={`purchase-invoice-row-${invoice.factuurnummer}`}>
                      <TableCell className="font-mono">{invoice.factuurnummer}</TableCell>
                      <TableCell>{formatDate(invoice.factuurdatum)}</TableCell>
                      <TableCell className="font-medium">{invoice.crediteur_naam}</TableCell>
                      <TableCell>{formatDate(invoice.vervaldatum)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.totaal_bedrag, invoice.valuta)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Geen inkoopfacturen gevonden
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

export default CrediteruenPage;
