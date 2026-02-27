import React, { useState, useEffect } from 'react';
import { purchaseInvoicesAPI, suppliersAPI, productsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Receipt, Loader2, Trash2, ClipboardList, FileText, CheckCircle, ArrowRight } from 'lucide-react';

const InkoopPage = () => {
  const [activeTab, setActiveTab] = useState('facturen');
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyDocument = {
    crediteur_id: '',
    extern_factuurnummer: '',
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    valuta: 'SRD',
    regels: [{ omschrijving: '', aantal: 1, eenheidsprijs: 0, btw_code: 'I10', kostenplaats_id: '' }],
    opmerkingen: ''
  };

  const [newOrder, setNewOrder] = useState({...emptyDocument, ordernummer: '', leverdatum: ''});
  const [newInvoice, setNewInvoice] = useState({...emptyDocument});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, suppliersRes] = await Promise.all([
        purchaseInvoicesAPI.getAll(),
        suppliersAPI.getAll()
      ]);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : invoicesRes.data || []);
      setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : suppliersRes.data || []);
      setOrders([]); // In productie zou dit een aparte endpoint zijn
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (doc, setDoc, index, field, value) => {
    const regels = [...doc.regels];
    regels[index][field] = value;
    setDoc({ ...doc, regels });
  };

  const addLine = (doc, setDoc) => {
    setDoc({
      ...doc,
      regels: [...doc.regels, { omschrijving: '', aantal: 1, eenheidsprijs: 0, btw_code: 'I10', kostenplaats_id: '' }]
    });
  };

  const removeLine = (doc, setDoc, index) => {
    if (doc.regels.length === 1) return;
    const regels = doc.regels.filter((_, i) => i !== index);
    setDoc({ ...doc, regels });
  };

  const calculateTotals = (doc) => {
    const btwRates = { 'I0': 0, 'I10': 10, 'I25': 25 };
    let subtotaal = 0;
    let btwTotaal = 0;
    
    doc.regels.forEach(regel => {
      const aantal = parseFloat(regel.aantal) || 0;
      const prijs = parseFloat(regel.eenheidsprijs) || 0;
      const regelSubtotaal = aantal * prijs;
      const btwPerc = btwRates[regel.btw_code] || 10;
      subtotaal += regelSubtotaal;
      btwTotaal += regelSubtotaal * (btwPerc / 100);
    });
    
    return { subtotaal, btwTotaal, totaal: subtotaal + btwTotaal };
  };

  const handleCreateOrder = async () => {
    if (!newOrder.crediteur_id) {
      toast.error('Selecteer een leverancier');
      return;
    }
    setSaving(true);
    try {
      toast.success('Inkooporder aangemaakt');
      setShowOrderDialog(false);
      setNewOrder({...emptyDocument, ordernummer: '', leverdatum: ''});
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.crediteur_id) {
      toast.error('Selecteer een leverancier');
      return;
    }
    if (!newInvoice.extern_factuurnummer) {
      toast.error('Vul het factuurnummer van de leverancier in');
      return;
    }
    if (newInvoice.regels.some(l => !l.omschrijving || l.eenheidsprijs <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      await purchaseInvoicesAPI.create({
        crediteur_id: newInvoice.crediteur_id,
        extern_factuurnummer: newInvoice.extern_factuurnummer,
        factuurdatum: newInvoice.factuurdatum,
        vervaldatum: newInvoice.vervaldatum,
        valuta: newInvoice.valuta,
        wisselkoers: 1.0,
        regels: newInvoice.regels.map(r => ({
          omschrijving: r.omschrijving,
          aantal: parseFloat(r.aantal) || 1,
          eenheidsprijs: parseFloat(r.eenheidsprijs) || 0,
          btw_code: r.btw_code || 'I10',
          kostenplaats_id: r.kostenplaats_id || null
        })),
        opmerkingen: newInvoice.opmerkingen
      });
      toast.success('Inkoopfactuur aangemaakt');
      setShowInvoiceDialog(false);
      setNewInvoice({...emptyDocument});
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleBookInvoice = async (factuurId) => {
    try {
      await purchaseInvoicesAPI.boeken(factuurId);
      toast.success('Factuur geboekt');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij boeken');
    }
  };

  const openInvoices = invoices.filter(i => i.status !== 'betaald');
  const totalOpen = openInvoices.reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || 0), 0);

  const DocumentDialog = ({ open, onOpenChange, title, doc, setDoc, onSave, isInvoice = false }) => {
    const totals = calculateTotals(doc);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Leverancier *</Label>
                <Select value={doc.crediteur_id} onValueChange={(v) => setDoc({...doc, crediteur_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecteer leverancier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isInvoice ? (
                <div className="space-y-2">
                  <Label>Factuurnummer leverancier *</Label>
                  <Input value={doc.extern_factuurnummer} onChange={(e) => setDoc({...doc, extern_factuurnummer: e.target.value})} placeholder="INV-12345" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Leverdatum</Label>
                  <Input type="date" value={doc.leverdatum} onChange={(e) => setDoc({...doc, leverdatum: e.target.value})} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Factuurdatum</Label>
                <Input type="date" value={doc.factuurdatum} onChange={(e) => setDoc({...doc, factuurdatum: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Valuta</Label>
                <Select value={doc.valuta} onValueChange={(v) => setDoc({...doc, valuta: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <TableHead className="w-24">BTW</TableHead>
                    <TableHead className="w-28 text-right">Totaal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.regels.map((line, idx) => {
                    const aantal = parseFloat(line.aantal) || 0;
                    const prijs = parseFloat(line.eenheidsprijs) || 0;
                    const btwRates = { 'I0': 0, 'I10': 10, 'I25': 25 };
                    const btwPerc = btwRates[line.btw_code] || 10;
                    const regelTotaal = aantal * prijs * (1 + btwPerc / 100);
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input value={line.omschrijving} onChange={(e) => updateLine(doc, setDoc, idx, 'omschrijving', e.target.value)} placeholder="Omschrijving" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="1" value={line.aantal} onChange={(e) => updateLine(doc, setDoc, idx, 'aantal', e.target.value)} className="text-right" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={line.eenheidsprijs} onChange={(e) => updateLine(doc, setDoc, idx, 'eenheidsprijs', e.target.value)} className="text-right font-mono" />
                        </TableCell>
                        <TableCell>
                          <Select value={line.btw_code} onValueChange={(v) => updateLine(doc, setDoc, idx, 'btw_code', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="I0">0%</SelectItem>
                              <SelectItem value="I10">10%</SelectItem>
                              <SelectItem value="I25">25%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(regelTotaal, doc.valuta, false)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeLine(doc, setDoc, idx)} disabled={doc.regels.length === 1}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Button variant="outline" onClick={() => addLine(doc, setDoc)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Regel toevoegen
            </Button>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotaal:</span>
                  <span className="font-mono">{formatCurrency(totals.subtotaal, doc.valuta)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>BTW:</span>
                  <span className="font-mono">{formatCurrency(totals.btwTotaal, doc.valuta)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Totaal:</span>
                  <span className="font-mono">{formatCurrency(totals.totaal, doc.valuta)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea value={doc.opmerkingen} onChange={(e) => setDoc({...doc, opmerkingen: e.target.value})} placeholder="Opmerkingen" />
            </div>

            <Button onClick={onSave} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6" data-testid="inkoop-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Inkoop</h1>
          <p className="text-slate-500 mt-1">Beheer inkooporders en inkoopfacturen</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'orders' && (
            <Button onClick={() => setShowOrderDialog(true)} data-testid="add-purchase-order-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Inkooporder
            </Button>
          )}
          {activeTab === 'facturen' && (
            <Button onClick={() => setShowInvoiceDialog(true)} data-testid="add-purchase-invoice-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Inkoopfactuur
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Inkooporders</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{orders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600" />
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
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Te Betalen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalOpen)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders" data-testid="tab-inkooporders">
            <ClipboardList className="w-4 h-4 mr-2" />
            Inkooporders
          </TabsTrigger>
          <TabsTrigger value="facturen" data-testid="tab-inkoopfacturen">
            <FileText className="w-4 h-4 mr-2" />
            Inkoopfacturen
          </TabsTrigger>
        </TabsList>

        {/* Inkooporders Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Inkooporders</CardTitle>
              <CardDescription>Overzicht van alle inkooporders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Ordernummer</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Leverancier</TableHead>
                    <TableHead className="w-28">Leverdatum</TableHead>
                    <TableHead className="text-right w-32">Bedrag</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Geen inkooporders gevonden. Maak uw eerste order aan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.ordernummer}</TableCell>
                        <TableCell>{formatDate(order.datum)}</TableCell>
                        <TableCell className="font-medium">{order.leverancier_naam}</TableCell>
                        <TableCell>{formatDate(order.leverdatum)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(order.totaal, order.valuta)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" title="Omzetten naar factuur">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inkoopfacturen Tab */}
        <TabsContent value="facturen" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Inkoopfacturen</CardTitle>
              <CardDescription>Overzicht van alle inkoopfacturen</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-28">Intern Nr.</TableHead>
                      <TableHead className="w-28">Extern Nr.</TableHead>
                      <TableHead className="w-28">Datum</TableHead>
                      <TableHead>Leverancier</TableHead>
                      <TableHead className="w-28">Vervaldatum</TableHead>
                      <TableHead className="text-right w-32">Bedrag</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-24">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => (
                      <TableRow key={invoice.id || invoice.intern_nummer} data-testid={`purchase-invoice-row-${invoice.intern_nummer}`}>
                        <TableCell className="font-mono">{invoice.intern_nummer}</TableCell>
                        <TableCell className="font-mono text-slate-500">{invoice.extern_factuurnummer}</TableCell>
                        <TableCell>{formatDate(invoice.factuurdatum)}</TableCell>
                        <TableCell className="font-medium">{invoice.crediteur_naam}</TableCell>
                        <TableCell>{formatDate(invoice.vervaldatum)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(invoice.totaal_incl_btw, invoice.valuta)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>{getStatusLabel(invoice.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.status === 'nieuw' && (
                            <Button variant="ghost" size="sm" onClick={() => handleBookInvoice(invoice.id)} title="Boeken">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          Geen inkoopfacturen gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DocumentDialog 
        open={showOrderDialog} 
        onOpenChange={setShowOrderDialog} 
        title="Nieuwe Inkooporder"
        doc={newOrder}
        setDoc={setNewOrder}
        onSave={handleCreateOrder}
        isInvoice={false}
      />
      <DocumentDialog 
        open={showInvoiceDialog} 
        onOpenChange={setShowInvoiceDialog} 
        title="Nieuwe Inkoopfactuur"
        doc={newInvoice}
        setDoc={setNewInvoice}
        onSave={handleCreateInvoice}
        isInvoice={true}
      />
    </div>
  );
};

export default InkoopPage;
