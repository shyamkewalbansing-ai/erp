import React, { useState, useEffect } from 'react';
import { purchaseOrdersAPI, invoicesAPI, suppliersAPI, productsAPI } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Receipt, Loader2, Trash2 } from 'lucide-react';

const InkoopPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    type: 'purchase',
    supplier_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'SRD',
    lines: [{ description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, invoicesRes, suppliersRes, productsRes] = await Promise.all([
        purchaseOrdersAPI.getAll(),
        invoicesAPI.getAll({ invoice_type: 'purchase' }),
        suppliersAPI.getAll(),
        productsAPI.getAll()
      ]);
      setPurchaseOrders(ordersRes.data);
      setInvoices(invoicesRes.data);
      setSuppliers(suppliersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index, field, value) => {
    const lines = [...newInvoice.lines];
    lines[index][field] = value;
    
    const quantity = parseFloat(lines[index].quantity) || 0;
    const unitPrice = parseFloat(lines[index].unit_price) || 0;
    const btwPercentage = parseFloat(lines[index].btw_percentage) || 0;
    
    const subtotal = quantity * unitPrice;
    lines[index].btw_amount = subtotal * (btwPercentage / 100);
    lines[index].total = subtotal + lines[index].btw_amount;
    
    setNewInvoice({ ...newInvoice, lines });
  };

  const addLine = () => {
    setNewInvoice({
      ...newInvoice,
      lines: [...newInvoice.lines, { description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }]
    });
  };

  const removeLine = (index) => {
    if (newInvoice.lines.length === 1) return;
    const lines = newInvoice.lines.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, lines });
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.supplier_id) {
      toast.error('Selecteer een leverancier');
      return;
    }
    if (newInvoice.lines.some(l => !l.description || l.unit_price <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      await invoicesAPI.create(newInvoice);
      toast.success('Inkoopfactuur aangemaakt');
      setShowInvoiceDialog(false);
      setNewInvoice({
        type: 'purchase', supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'SRD',
        lines: [{ description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }],
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const subtotal = newInvoice.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const btwTotal = newInvoice.lines.reduce((s, l) => s + (l.btw_amount || 0), 0);
  const total = subtotal + btwTotal;

  return (
    <div className="space-y-6" data-testid="inkoop-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Inkoop</h1>
          <p className="text-slate-500 mt-1">Beheer inkooporders en inkoopfacturen</p>
        </div>
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-purchase-invoice-btn">
              <Plus className="w-4 h-4 mr-2" />
              Inkoopfactuur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe Inkoopfactuur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Leverancier *</Label>
                  <Select value={newInvoice.supplier_id} onValueChange={(v) => setNewInvoice({...newInvoice, supplier_id: v})}>
                    <SelectTrigger data-testid="purchase-supplier-select">
                      <SelectValue placeholder="Selecteer leverancier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Factuurdatum</Label>
                  <Input
                    type="date"
                    value={newInvoice.date}
                    onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vervaldatum</Label>
                  <Input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select value={newInvoice.currency} onValueChange={(v) => setNewInvoice({...newInvoice, currency: v})}>
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
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[300px]">Omschrijving</TableHead>
                      <TableHead className="w-20">Aantal</TableHead>
                      <TableHead className="w-28">Prijs</TableHead>
                      <TableHead className="w-20">BTW %</TableHead>
                      <TableHead className="w-28 text-right">Totaal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newInvoice.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            placeholder="Omschrijving"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                            className="text-right font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={String(line.btw_percentage)} onValueChange={(v) => updateLine(idx, 'btw_percentage', parseFloat(v))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="25">25%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(line.total || 0, newInvoice.currency, false)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(idx)}
                            disabled={newInvoice.lines.length === 1}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button variant="outline" onClick={addLine} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Regel toevoegen
              </Button>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotaal:</span>
                    <span className="font-mono">{formatCurrency(subtotal, newInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>BTW:</span>
                    <span className="font-mono">{formatCurrency(btwTotal, newInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Totaal:</span>
                    <span className="font-mono">{formatCurrency(total, newInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notities</Label>
                <Textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  placeholder="Opmerkingen"
                />
              </div>

              <Button onClick={handleCreateInvoice} className="w-full" disabled={saving} data-testid="save-purchase-invoice-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Factuur Aanmaken
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Inkooporders</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{purchaseOrders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Inkoopfacturen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{invoices.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="orders" data-testid="tab-purchase-orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Inkooporders
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-purchase-invoices">
            <Receipt className="w-4 h-4 mr-2" />
            Inkoopfacturen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Inkooporders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Nummer</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Leverancier</TableHead>
                    <TableHead className="w-28">Verwacht</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_number}</TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell className="font-medium">{order.supplier_name}</TableCell>
                      <TableCell>{formatDate(order.expected_date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(order.total, order.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Geen inkooporders gevonden
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
                    <TableRow key={invoice.id} data-testid={`purchase-invoice-row-${invoice.invoice_number}`}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>{formatDate(invoice.date)}</TableCell>
                      <TableCell className="font-medium">{invoice.supplier_name}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.total, invoice.currency)}
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

export default InkoopPage;
