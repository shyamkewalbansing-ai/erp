import React, { useState, useEffect } from 'react';
import { purchaseInvoicesAPI, suppliersAPI, productsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Receipt, Loader2, Trash2 } from 'lucide-react';

const InkoopPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    crediteur_code: '',
    factuurnummer_leverancier: '',
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    valuta: 'SRD',
    regels: [{ omschrijving: '', aantal: 1, prijs: 0, btw_percentage: 10, btw_bedrag: 0, totaal: 0 }],
    opmerkingen: ''
  });

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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index, field, value) => {
    const regels = [...newInvoice.regels];
    regels[index][field] = value;
    
    const aantal = parseFloat(regels[index].aantal) || 0;
    const prijs = parseFloat(regels[index].prijs) || 0;
    const btwPercentage = parseFloat(regels[index].btw_percentage) || 0;
    
    const subtotal = aantal * prijs;
    regels[index].btw_bedrag = subtotal * (btwPercentage / 100);
    regels[index].totaal = subtotal + regels[index].btw_bedrag;
    
    setNewInvoice({ ...newInvoice, regels });
  };

  const addLine = () => {
    setNewInvoice({
      ...newInvoice,
      regels: [...newInvoice.regels, { omschrijving: '', aantal: 1, prijs: 0, btw_percentage: 10, btw_bedrag: 0, totaal: 0 }]
    });
  };

  const removeLine = (index) => {
    if (newInvoice.regels.length === 1) return;
    const regels = newInvoice.regels.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, regels });
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.crediteur_code) {
      toast.error('Selecteer een leverancier');
      return;
    }
    if (newInvoice.regels.some(l => !l.omschrijving || l.prijs <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      await purchaseInvoicesAPI.create(newInvoice);
      toast.success('Inkoopfactuur aangemaakt');
      setShowInvoiceDialog(false);
      setNewInvoice({
        crediteur_code: '',
        factuurnummer_leverancier: '',
        factuurdatum: new Date().toISOString().split('T')[0],
        vervaldatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valuta: 'SRD',
        regels: [{ omschrijving: '', aantal: 1, prijs: 0, btw_percentage: 10, btw_bedrag: 0, totaal: 0 }],
        opmerkingen: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const subtotal = newInvoice.regels.reduce((s, l) => s + (parseFloat(l.aantal) || 0) * (parseFloat(l.prijs) || 0), 0);
  const btwTotal = newInvoice.regels.reduce((s, l) => s + (l.btw_bedrag || 0), 0);
  const total = subtotal + btwTotal;

  const openInvoices = invoices.filter(i => i.status !== 'betaald');
  const totalOpen = openInvoices.reduce((sum, i) => sum + (i.totaal_bedrag || 0), 0);

  return (
    <div className="space-y-6" data-testid="inkoop-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Inkoop</h1>
          <p className="text-slate-500 mt-1">Beheer inkoopfacturen</p>
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
                  <Select value={newInvoice.crediteur_code} onValueChange={(v) => setNewInvoice({...newInvoice, crediteur_code: v})}>
                    <SelectTrigger data-testid="purchase-supplier-select">
                      <SelectValue placeholder="Selecteer leverancier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.code} value={s.code}>{s.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leverancier Factuurnr</Label>
                  <Input
                    value={newInvoice.factuurnummer_leverancier}
                    onChange={(e) => setNewInvoice({...newInvoice, factuurnummer_leverancier: e.target.value})}
                    placeholder="INV-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Factuurdatum</Label>
                  <Input
                    type="date"
                    value={newInvoice.factuurdatum}
                    onChange={(e) => setNewInvoice({...newInvoice, factuurdatum: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select value={newInvoice.valuta} onValueChange={(v) => setNewInvoice({...newInvoice, valuta: v})}>
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
                    {newInvoice.regels.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={line.omschrijving}
                            onChange={(e) => updateLine(idx, 'omschrijving', e.target.value)}
                            placeholder="Omschrijving"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={line.aantal}
                            onChange={(e) => updateLine(idx, 'aantal', e.target.value)}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.prijs}
                            onChange={(e) => updateLine(idx, 'prijs', e.target.value)}
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
                          {formatCurrency(line.totaal || 0, newInvoice.valuta, false)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(idx)}
                            disabled={newInvoice.regels.length === 1}
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
                    <span className="font-mono">{formatCurrency(subtotal, newInvoice.valuta)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>BTW:</span>
                    <span className="font-mono">{formatCurrency(btwTotal, newInvoice.valuta)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Totaal:</span>
                    <span className="font-mono">{formatCurrency(total, newInvoice.valuta)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opmerkingen</Label>
                <Textarea
                  value={newInvoice.opmerkingen}
                  onChange={(e) => setNewInvoice({...newInvoice, opmerkingen: e.target.value})}
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
                <p className="text-sm text-slate-500">Totaal Facturen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{invoices.length}</p>
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

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Inkoopfacturen</CardTitle>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InkoopPage;
