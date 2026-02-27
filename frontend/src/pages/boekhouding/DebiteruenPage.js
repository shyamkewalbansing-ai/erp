import React, { useState, useEffect } from 'react';
import { customersAPI, invoicesAPI } from '../../lib/boekhoudingApi';
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
import { Plus, Users, Receipt, Search, Loader2 } from 'lucide-react';

const DebiterenPage = () => {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newCustomer, setNewCustomer] = useState({
    naam: '',
    adres: '',
    plaats: '',
    postcode: '',
    land: 'Suriname',
    telefoon: '',
    email: '',
    btw_nummer: '',
    betalingstermijn: 30,
    kredietlimiet: 0,
    valuta: 'SRD'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, invoicesRes] = await Promise.all([
        customersAPI.getAll(),
        invoicesAPI.getAll({ invoice_type: 'sales' })
      ]);
      setCustomers(customersRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.naam) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      await customersAPI.create(newCustomer);
      toast.success('Debiteur aangemaakt');
      setShowCustomerDialog(false);
      setNewCustomer({
        naam: '', adres: '', plaats: '', postcode: '', land: 'Suriname', 
        telefoon: '', email: '', btw_nummer: '', betalingstermijn: 30, 
        kredietlimiet: 0, valuta: 'SRD'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.naam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nummer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.openstaand_bedrag || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="debiteuren-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="debiteuren-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Debiteuren</h1>
          <p className="text-slate-500 mt-1">Beheer uw klanten en verkoopfacturen</p>
        </div>
        <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-customer-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Debiteur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nieuwe Debiteur</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label>Naam *</Label>
                <Input
                  value={newCustomer.naam}
                  onChange={(e) => setNewCustomer({...newCustomer, naam: e.target.value})}
                  placeholder="Bedrijfsnaam of naam"
                  data-testid="customer-name-input"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Adres</Label>
                <Input
                  value={newCustomer.adres}
                  onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                  placeholder="Straat en huisnummer"
                />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={newCustomer.postcode}
                  onChange={(e) => setNewCustomer({...newCustomer, postcode: e.target.value})}
                  placeholder="Postcode"
                />
              </div>
              <div className="space-y-2">
                <Label>Plaats</Label>
                <Input
                  value={newCustomer.plaats}
                  onChange={(e) => setNewCustomer({...newCustomer, plaats: e.target.value})}
                  placeholder="Paramaribo"
                />
              </div>
              <div className="space-y-2">
                <Label>Land</Label>
                <Select value={newCustomer.land} onValueChange={(v) => setNewCustomer({...newCustomer, land: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Suriname">Suriname</SelectItem>
                    <SelectItem value="Nederland">Nederland</SelectItem>
                    <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                    <SelectItem value="Overig">Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>BTW-nummer</Label>
                <Input
                  value={newCustomer.btw_nummer}
                  onChange={(e) => setNewCustomer({...newCustomer, btw_nummer: e.target.value})}
                  placeholder="BTW123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefoon</Label>
                <Input
                  value={newCustomer.telefoon}
                  onChange={(e) => setNewCustomer({...newCustomer, telefoon: e.target.value})}
                  placeholder="+597 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  placeholder="info@klant.sr"
                />
              </div>
              <div className="space-y-2">
                <Label>Betalingstermijn (dagen)</Label>
                <Select 
                  value={String(newCustomer.betalingstermijn)} 
                  onValueChange={(v) => setNewCustomer({...newCustomer, betalingstermijn: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Direct</SelectItem>
                    <SelectItem value="14">14 dagen</SelectItem>
                    <SelectItem value="30">30 dagen</SelectItem>
                    <SelectItem value="60">60 dagen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valuta</Label>
                <Select value={newCustomer.valuta} onValueChange={(v) => setNewCustomer({...newCustomer, valuta: v})}>
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
              <div className="space-y-2">
                <Label>Kredietlimiet</Label>
                <Input
                  type="number"
                  value={newCustomer.kredietlimiet}
                  onChange={(e) => setNewCustomer({...newCustomer, kredietlimiet: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <Button onClick={handleCreateCustomer} className="w-full" disabled={saving} data-testid="save-customer-btn">
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
                <p className="text-sm text-slate-500">Totaal Debiteuren</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{customers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Openstaand</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="w-4 h-4 mr-2" />
            Debiteuren
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="w-4 h-4 mr-2" />
            Verkoopfacturen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Klantenlijst</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="search-input"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-24">Nr.</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Plaats</TableHead>
                    <TableHead>Telefoon</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="w-20">Valuta</TableHead>
                    <TableHead className="text-right w-32">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => (
                    <TableRow key={customer.id} data-testid={`customer-row-${customer.nummer}`}>
                      <TableCell className="font-mono">{customer.nummer}</TableCell>
                      <TableCell className="font-medium">{customer.naam}</TableCell>
                      <TableCell className="text-slate-500">{customer.plaats || '-'}</TableCell>
                      <TableCell className="text-slate-500">{customer.telefoon || '-'}</TableCell>
                      <TableCell className="text-slate-500">{customer.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.valuta}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${(customer.openstaand_bedrag || 0) > 0 ? 'text-amber-600' : ''}`}>
                        {formatCurrency(customer.openstaand_bedrag || 0, customer.valuta)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        {searchTerm ? 'Geen klanten gevonden' : 'Geen klanten. Maak uw eerste debiteur aan.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Verkoopfacturen</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Nummer</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Debiteur</TableHead>
                    <TableHead className="w-28">Vervaldatum</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(invoice => (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.factuurnummer}`}>
                      <TableCell className="font-mono">{invoice.factuurnummer}</TableCell>
                      <TableCell>{formatDate(invoice.factuurdatum)}</TableCell>
                      <TableCell className="font-medium">{invoice.debiteur_naam || '-'}</TableCell>
                      <TableCell>{formatDate(invoice.vervaldatum)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.totaal_incl_btw, invoice.valuta)}
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
                        Geen verkoopfacturen gevonden
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

export default DebiterenPage;
