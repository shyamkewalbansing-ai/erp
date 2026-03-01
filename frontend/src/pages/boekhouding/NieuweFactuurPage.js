import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, customersAPI, productsAPI, pdfAPI, toBackendFormat } from '../../lib/boekhoudingApi';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  Save,
  Eye,
  Send,
  MoreHorizontal,
  FileText,
  Calendar,
  Building2,
  MapPin
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import InvoicePreview from '../../components/InvoicePreview';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NieuweFactuurPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [bedrijf, setBedrijf] = useState(null);

  const [invoice, setInvoice] = useState({
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_date: new Date().toISOString().split('T')[0],
    currency: 'SRD',
    specification: '',
    reference: '',
    notes: '',
    lines: [{ product_id: '', description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }]
  });

  // Generate temporary invoice number (will be replaced by backend)
  const tempInvoiceNumber = `NIEUW`;

  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [customersRes, productsRes, bedrijfRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
        fetch(`${API_URL}/api/boekhouding/instellingen`, { headers }).then(r => r.json()).catch(() => ({}))
      ]);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setBedrijf(bedrijfRes || {});
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    setInvoice({ ...invoice, customer_id: customerId });
  };

  const updateLine = (index, field, value) => {
    const lines = [...invoice.lines];
    lines[index][field] = value;
    
    const quantity = parseFloat(lines[index].quantity) || 0;
    const unitPrice = parseFloat(lines[index].unit_price) || 0;
    const btwPercentage = parseFloat(lines[index].btw_percentage) || 0;
    
    const subtotal = quantity * unitPrice;
    lines[index].btw_amount = subtotal * (btwPercentage / 100);
    lines[index].total = subtotal + lines[index].btw_amount;
    
    setInvoice({ ...invoice, lines });
  };

  const addLine = () => {
    setInvoice({
      ...invoice,
      lines: [...invoice.lines, { product_id: '', description: '', quantity: 1, unit_price: 0, btw_percentage: 10, btw_amount: 0, total: 0 }]
    });
  };

  const addTextLine = () => {
    setInvoice({
      ...invoice,
      lines: [...invoice.lines, { product_id: '', description: '', quantity: 0, unit_price: 0, btw_percentage: 0, btw_amount: 0, total: 0, isTextLine: true }]
    });
  };

  const removeLine = (index) => {
    if (invoice.lines.length === 1) return;
    const lines = invoice.lines.filter((_, i) => i !== index);
    setInvoice({ ...invoice, lines });
  };

  const selectProduct = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const lines = [...invoice.lines];
      lines[index] = {
        ...lines[index],
        product_id: productId,
        description: product.naam || product.name || '',
        unit_price: product.verkoopprijs || product.sales_price || 0,
      };
      const qty = lines[index].quantity || 1;
      const price = lines[index].unit_price || 0;
      const btwPct = lines[index].btw_percentage || 0;
      const subtotal = qty * price;
      lines[index].btw_amount = subtotal * (btwPct / 100);
      lines[index].total = subtotal + lines[index].btw_amount;
      setInvoice({ ...invoice, lines });
    }
  };

  const handleSave = async (sendAfterSave = false) => {
    if (!invoice.customer_id) {
      toast.error('Selecteer een klant');
      return;
    }
    if (invoice.lines.filter(l => !l.isTextLine).some(l => !l.description || l.unit_price <= 0)) {
      toast.error('Vul alle regels correct in');
      return;
    }
    setSaving(true);
    try {
      const invoiceData = toBackendFormat({
        customer_id: invoice.customer_id,
        invoice_date: invoice.date,
        due_date: invoice.due_date,
        currency: invoice.currency,
        notes: invoice.notes
      });
      invoiceData.regels = invoice.lines.map(line => toBackendFormat({
        product_id: line.product_id,
        description: line.description,
        quantity: parseFloat(line.quantity) || 0,
        unit_price: parseFloat(line.unit_price) || 0,
        btw_percentage: parseFloat(line.btw_percentage) || 0
      }));
      
      const result = await invoicesAPI.create(invoiceData);
      
      if (sendAfterSave && result.data?.id) {
        await invoicesAPI.updateStatus(result.data.id, 'verzonden');
        toast.success('Factuur aangemaakt en verzonden');
      } else {
        toast.success('Factuur aangemaakt');
      }
      
      navigate('/app/boekhouding/verkoop');
    } catch (error) {
      console.error('Invoice creation error:', error);
      toast.error(error.response?.data?.detail || error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const subtotal = invoice.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const btwTotal = invoice.lines.reduce((s, l) => s + (l.btw_amount || 0), 0);
  const total = subtotal + btwTotal;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50" data-testid="nieuwe-factuur-page">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/app/boekhouding/verkoop')}
              className="rounded-lg hover:bg-slate-100"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900">Factuur</h1>
              <span className="text-xl font-mono text-slate-500">{tempInvoiceNumber}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="rounded-lg"
              disabled={saving}
            >
              <Eye className="w-4 h-4 mr-2" />
              Afdrukvoorbeeld
            </Button>
            <Button 
              variant="outline" 
              className="rounded-lg"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Opslaan
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                  Actie
                  <MoreHorizontal className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSave(false)}>
                  <Save className="w-4 h-4 mr-2" />
                  Opslaan als concept
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSave(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Opslaan en verzenden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleSave(true)}
              disabled={saving}
              data-testid="send-invoice-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Versturen
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Customer Info */}
          <Card className="bg-white border-0 shadow-sm rounded-2xl lg:col-span-1">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Klant
                  </Label>
                  <Select 
                    value={invoice.customer_id} 
                    onValueChange={handleCustomerChange}
                  >
                    <SelectTrigger className="rounded-lg h-11" data-testid="customer-select">
                      <SelectValue placeholder="Selecteer klant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.naam || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Address */}
                {selectedCustomer && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Factuuradres
                    </Label>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="font-medium text-slate-900">{selectedCustomer.naam || selectedCustomer.name}</p>
                      {selectedCustomer.adres && <p className="text-sm text-slate-600 mt-1">{selectedCustomer.adres}</p>}
                      {selectedCustomer.postcode && selectedCustomer.plaats && (
                        <p className="text-sm text-slate-600">{selectedCustomer.postcode} {selectedCustomer.plaats}</p>
                      )}
                      {selectedCustomer.land && <p className="text-sm text-slate-600">{selectedCustomer.land}</p>}
                      {selectedCustomer.kvk && (
                        <p className="text-xs text-slate-400 mt-2">KVK: {selectedCustomer.kvk}</p>
                      )}
                      {selectedCustomer.btw_nummer && (
                        <p className="text-xs text-slate-400">BTW: {selectedCustomer.btw_nummer}</p>
                      )}
                    </div>
                  </div>
                )}

                {!selectedCustomer && (
                  <div className="bg-slate-50 rounded-xl p-6 border border-dashed border-slate-200 text-center">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Selecteer een klant om het factuuradres te tonen</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Dates & Status */}
          <Card className="bg-white border-0 shadow-sm rounded-2xl lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Factuurgegevens</span>
                </div>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                  Concept
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Factuurdatum</Label>
                  <Input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => setInvoice({...invoice, date: e.target.value})}
                    className="rounded-lg"
                    data-testid="invoice-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vervaldatum (30 dagen)</Label>
                  <Input
                    type="date"
                    value={invoice.due_date}
                    onChange={(e) => setInvoice({...invoice, due_date: e.target.value})}
                    className="rounded-lg"
                    data-testid="due-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Leveringsdatum</Label>
                  <Input
                    type="date"
                    value={invoice.delivery_date}
                    onChange={(e) => setInvoice({...invoice, delivery_date: e.target.value})}
                    className="rounded-lg"
                    data-testid="delivery-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valuta</Label>
                  <Select value={invoice.currency} onValueChange={(v) => setInvoice({...invoice, currency: v})}>
                    <SelectTrigger className="rounded-lg">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Specificatie</Label>
                  <Input
                    value={invoice.specification}
                    onChange={(e) => setInvoice({...invoice, specification: e.target.value})}
                    placeholder="Project of opdracht omschrijving"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Referentie</Label>
                  <Input
                    value={invoice.reference}
                    onChange={(e) => setInvoice({...invoice, reference: e.target.value})}
                    placeholder="Uw referentie / PO nummer"
                    className="rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Lines */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50/50 border-b border-slate-100">
                    <TableHead className="text-xs font-semibold text-emerald-800 uppercase tracking-wide py-4 px-4 w-[40%]">
                      Omschrijving
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-emerald-800 uppercase tracking-wide py-4 px-4 text-center w-[12%]">
                      Hoeveelheid
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-emerald-800 uppercase tracking-wide py-4 px-4 text-right w-[15%]">
                      Prijs ex BTW
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-emerald-800 uppercase tracking-wide py-4 px-4 text-center w-[10%]">
                      BTW
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-emerald-800 uppercase tracking-wide py-4 px-4 text-right w-[15%]">
                      Prijs totaal
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-emerald-800 uppercase tracking-wide py-4 px-4 text-center w-[8%]">
                      Actie
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((line, idx) => (
                    <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <TableCell className="py-3 px-4">
                        {line.isTextLine ? (
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            placeholder="Typ tekst..."
                            className="rounded-lg border-dashed"
                          />
                        ) : (
                          <div className="space-y-2">
                            <Select 
                              value={line.product_id || ''} 
                              onValueChange={(v) => selectProduct(idx, v)}
                            >
                              <SelectTrigger className="rounded-lg" data-testid={`line-product-${idx}`}>
                                <SelectValue placeholder="Selecteer artikel..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.naam || product.name} - {formatAmount(product.verkoopprijs || product.sales_price || 0)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(idx, 'description', e.target.value)}
                              placeholder="Of typ handmatig..."
                              className="rounded-lg text-sm"
                              data-testid={`line-desc-${idx}`}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {!line.isTextLine && (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                            className="rounded-lg text-center"
                          />
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {!line.isTextLine && (
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                            className="rounded-lg text-right"
                          />
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {!line.isTextLine && (
                          <Select 
                            value={String(line.btw_percentage)} 
                            onValueChange={(v) => updateLine(idx, 'btw_percentage', parseFloat(v))}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="25">25%</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <span className="font-medium text-slate-900">
                          {formatAmount(line.total || 0, invoice.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(idx)}
                          disabled={invoice.lines.length === 1}
                          className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Add Line Buttons */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <Button 
                variant="outline" 
                onClick={addLine} 
                className="rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                data-testid="add-line-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe regel
              </Button>
              <Button 
                variant="outline" 
                onClick={addTextLine} 
                className="rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Tekstregel toevoegen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Totals & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Notities</Label>
              <Textarea
                value={invoice.notes}
                onChange={(e) => setInvoice({...invoice, notes: e.target.value})}
                placeholder="Opmerkingen op de factuur (zichtbaar voor de klant)"
                className="rounded-lg min-h-[120px]"
                data-testid="invoice-notes"
              />
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">Subtotaal</span>
                  <span className="text-sm font-medium text-slate-900">{formatAmount(subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">BTW</span>
                  <span className="text-sm font-medium text-slate-900">{formatAmount(btwTotal, invoice.currency)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-slate-900">Totaal</span>
                    <span className="text-xl font-bold text-emerald-600" data-testid="invoice-total">
                      {formatAmount(total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NieuweFactuurPage;
