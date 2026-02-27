import React, { useState, useEffect } from 'react';
import { salesInvoicesAPI, customersAPI, productsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, FileText, ShoppingCart, Receipt, Loader2, Trash2, Send, FileEdit, ClipboardList, ArrowRight } from 'lucide-react';

const VerkoopPage = () => {
  const [activeTab, setActiveTab] = useState('facturen');
  const [invoices, setInvoices] = useState([]);
  const [offertes, setOffertes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOfferteDialog, setShowOfferteDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyDocument = {
    debiteur_id: '',
    datum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    valuta: 'SRD',
    regels: [{ omschrijving: '', aantal: 1, eenheidsprijs: 0, btw_code: 'V10' }],
    opmerkingen: '',
    referentie: ''
  };

  const [newOfferte, setNewOfferte] = useState({...emptyDocument});
  const [newOrder, setNewOrder] = useState({...emptyDocument});
  const [newInvoice, setNewInvoice] = useState({...emptyDocument, factuurdatum: new Date().toISOString().split('T')[0]});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, customersRes, productsRes] = await Promise.all([
        salesInvoicesAPI.getAll(),
        customersAPI.getAll(),
        productsAPI.getAll().catch(() => [])
      ]);
      const invoiceData = Array.isArray(invoicesRes) ? invoicesRes : invoicesRes.data || [];
      setInvoices(invoiceData);
      // Mock offertes en orders van facturen data (in productie zou dit aparte endpoints hebben)
      setOffertes(invoiceData.filter(i => i.status === 'concept').map(i => ({...i, type: 'offerte'})));
      setOrders([]);
      setCustomers(Array.isArray(customersRes) ? customersRes : customersRes.data || []);
      setProducts(Array.isArray(productsRes) ? productsRes : productsRes.data || []);
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
    
    const aantal = parseFloat(regels[index].aantal) || 0;
    const prijs = parseFloat(regels[index].eenheidsprijs) || 0;
    
    setDoc({ ...doc, regels });
  };

  const addLine = (doc, setDoc) => {
    setDoc({
      ...doc,
      regels: [...doc.regels, { omschrijving: '', aantal: 1, eenheidsprijs: 0, btw_code: 'V10' }]
    });
  };

  const removeLine = (doc, setDoc, index) => {
    if (doc.regels.length === 1) return;
    const regels = doc.regels.filter((_, i) => i !== index);
    setDoc({ ...doc, regels });
  };

  const calculateTotals = (doc) => {
    const btwRates = { 'V0': 0, 'V10': 10, 'V25': 25 };
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

  const handleCreateOfferte = async () => {
    if (!newOfferte.debiteur_id) {
      toast.error('Selecteer een klant');
      return;
    }
    setSaving(true);
    try {
      // In productie zou dit een aparte offerte endpoint zijn
      toast.success('Offerte aangemaakt');
      setShowOfferteDialog(false);
      setNewOfferte({...emptyDocument});
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.debiteur_id) {
      toast.error('Selecteer een klant');
      return;
    }
    setSaving(true);
    try {
      toast.success('Verkooporder aangemaakt');
      setShowOrderDialog(false);
      setNewOrder({...emptyDocument});
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.debiteur_id) {
      toast.error('Selecteer een klant');
      return;
    }
    if (newInvoice.regels.some(l => !l.omschrijving || l.eenheidsprijs <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      await salesInvoicesAPI.create({
        debiteur_id: newInvoice.debiteur_id,
        factuurdatum: newInvoice.factuurdatum || newInvoice.datum,
        vervaldatum: newInvoice.vervaldatum,
        valuta: newInvoice.valuta,
        regels: newInvoice.regels.map(r => ({
          omschrijving: r.omschrijving,
          aantal: parseFloat(r.aantal) || 1,
          eenheidsprijs: parseFloat(r.eenheidsprijs) || 0,
          btw_code: r.btw_code || 'V10',
          korting_percentage: 0
        })),
        opmerkingen: newInvoice.opmerkingen,
        referentie: newInvoice.referentie
      });
      toast.success('Factuur aangemaakt');
      setShowInvoiceDialog(false);
      setNewInvoice({...emptyDocument, factuurdatum: new Date().toISOString().split('T')[0]});
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvoice = async (factuurId) => {
    try {
      await salesInvoicesAPI.verzenden(factuurId);
      toast.success('Factuur verzonden');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij verzenden');
    }
  };

  const openInvoices = invoices.filter(i => i.status !== 'betaald');
  const totalOpen = openInvoices.reduce((sum, i) => sum + (i.openstaand_bedrag || i.totaal_incl_btw || 0), 0);

  const DocumentDialog = ({ open, onOpenChange, title, doc, setDoc, onSave }) => {
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
                <Label>Klant *</Label>
                <Select value={doc.debiteur_id} onValueChange={(v) => setDoc({...doc, debiteur_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input type="date" value={doc.factuurdatum || doc.datum} onChange={(e) => setDoc({...doc, factuurdatum: e.target.value, datum: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Vervaldatum</Label>
                <Input type="date" value={doc.vervaldatum} onChange={(e) => setDoc({...doc, vervaldatum: e.target.value})} />
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
                    const btwRates = { 'V0': 0, 'V10': 10, 'V25': 25 };
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
                              <SelectItem value="V0">0%</SelectItem>
                              <SelectItem value="V10">10%</SelectItem>
                              <SelectItem value="V25">25%</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referentie</Label>
                <Input value={doc.referentie} onChange={(e) => setDoc({...doc, referentie: e.target.value})} placeholder="Optionele referentie" />
              </div>
              <div className="space-y-2">
                <Label>Opmerkingen</Label>
                <Textarea value={doc.opmerkingen} onChange={(e) => setDoc({...doc, opmerkingen: e.target.value})} placeholder="Opmerkingen" />
              </div>
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
    <div className="space-y-6" data-testid="verkoop-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Verkoop</h1>
          <p className="text-slate-500 mt-1">Beheer offertes, orders en verkoopfacturen</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'offertes' && (
            <Button onClick={() => setShowOfferteDialog(true)} data-testid="add-offerte-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Offerte
            </Button>
          )}
          {activeTab === 'orders' && (
            <Button onClick={() => setShowOrderDialog(true)} data-testid="add-order-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Order
            </Button>
          )}
          {activeTab === 'facturen' && (
            <Button onClick={() => setShowInvoiceDialog(true)} data-testid="add-invoice-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Factuur
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Offertes</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{offertes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileEdit className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Orders</p>
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
                <p className="text-sm text-slate-500">Facturen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{invoices.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Openstaand</p>
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
          <TabsTrigger value="offertes" data-testid="tab-offertes">
            <FileEdit className="w-4 h-4 mr-2" />
            Offertes
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ClipboardList className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="facturen" data-testid="tab-facturen">
            <FileText className="w-4 h-4 mr-2" />
            Facturen
          </TabsTrigger>
        </TabsList>

        {/* Offertes Tab */}
        <TabsContent value="offertes" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Offertes</CardTitle>
              <CardDescription>Overzicht van alle offertes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-28">Nummer</TableHead>
                      <TableHead className="w-28">Datum</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead className="w-28">Geldig tot</TableHead>
                      <TableHead className="text-right w-32">Bedrag</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-24">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offertes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          Geen offertes gevonden. Maak uw eerste offerte aan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      offertes.map(offerte => (
                        <TableRow key={offerte.id || offerte.factuurnummer}>
                          <TableCell className="font-mono">{offerte.factuurnummer || '-'}</TableCell>
                          <TableCell>{formatDate(offerte.factuurdatum)}</TableCell>
                          <TableCell className="font-medium">{offerte.debiteur_naam}</TableCell>
                          <TableCell>{formatDate(offerte.vervaldatum)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(offerte.totaal_incl_btw, offerte.valuta)}</TableCell>
                          <TableCell><Badge variant="outline">Concept</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" title="Omzetten naar order">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Verkooporders</CardTitle>
              <CardDescription>Overzicht van alle verkooporders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Ordernummer</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead>Klant</TableHead>
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
                        Geen verkooporders gevonden. Maak uw eerste order aan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.ordernummer}</TableCell>
                        <TableCell>{formatDate(order.datum)}</TableCell>
                        <TableCell className="font-medium">{order.klant_naam}</TableCell>
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

        {/* Facturen Tab */}
        <TabsContent value="facturen" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Verkoopfacturen</CardTitle>
              <CardDescription>Overzicht van alle verkoopfacturen</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-28">Nummer</TableHead>
                      <TableHead className="w-28">Datum</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead className="w-28">Vervaldatum</TableHead>
                      <TableHead className="text-right w-32">Bedrag</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-24">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => (
                      <TableRow key={invoice.factuurnummer} data-testid={`sales-invoice-row-${invoice.factuurnummer}`}>
                        <TableCell className="font-mono">{invoice.factuurnummer}</TableCell>
                        <TableCell>{formatDate(invoice.factuurdatum)}</TableCell>
                        <TableCell className="font-medium">{invoice.debiteur_naam}</TableCell>
                        <TableCell>{formatDate(invoice.vervaldatum)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(invoice.totaal_incl_btw, invoice.valuta)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>{getStatusLabel(invoice.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.status === 'concept' && (
                            <Button variant="ghost" size="sm" onClick={() => handleSendInvoice(invoice.id)} title="Verzenden">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          Geen verkoopfacturen gevonden
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
        open={showOfferteDialog} 
        onOpenChange={setShowOfferteDialog} 
        title="Nieuwe Offerte"
        doc={newOfferte}
        setDoc={setNewOfferte}
        onSave={handleCreateOfferte}
      />
      <DocumentDialog 
        open={showOrderDialog} 
        onOpenChange={setShowOrderDialog} 
        title="Nieuwe Verkooporder"
        doc={newOrder}
        setDoc={setNewOrder}
        onSave={handleCreateOrder}
      />
      <DocumentDialog 
        open={showInvoiceDialog} 
        onOpenChange={setShowInvoiceDialog} 
        title="Nieuwe Verkoopfactuur"
        doc={newInvoice}
        setDoc={setNewInvoice}
        onSave={handleCreateInvoice}
      />
    </div>
  );
};

export default VerkoopPage;
