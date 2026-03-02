import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, customersAPI, productsAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  Save,
  Send,
  MoreHorizontal,
  FileText,
  Calendar,
  Building2,
  MapPin,
  Copy,
  TrendingUp,
  Percent,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';

const NieuweOffertePage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Item types
  const ITEM_TYPES = [
    { value: 'T', label: 'Titel' },
    { value: 'M', label: 'Materiaal' },
    { value: 'P', label: 'Product' },
    { value: 'D', label: 'Dienst' },
    { value: 'A', label: 'Arbeid' },
  ];

  // Units
  const UNITS = [
    { value: 'stuk', label: 'stuk' },
    { value: 'm2', label: 'm²' },
    { value: 'm', label: 'm' },
    { value: 'uur', label: 'uur' },
    { value: 'dag', label: 'dag' },
    { value: 'vast', label: 'vast' },
    { value: 'kg', label: 'kg' },
    { value: 'liter', label: 'liter' },
  ];

  // BTW rates
  const BTW_RATES = [
    { value: '0', label: '0%' },
    { value: '9', label: '9%' },
    { value: '10', label: '10%' },
    { value: '21', label: '21%' },
  ];

  const [offerte, setOfferte] = useState({
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'SRD',
    subject: '',
    reference: '',
    notes: '',
    lines: [
      { 
        id: '1',
        type: 'M', 
        category: '', 
        description: '', 
        quantity: 1, 
        unit: 'stuk',
        unit_price: 0, 
        btw_percentage: 10, 
        isTitle: false
      }
    ]
  });

  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll()
      ]);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    setOfferte({ ...offerte, customer_id: customerId });
  };

  const updateLine = (index, field, value) => {
    const lines = [...offerte.lines];
    lines[index][field] = value;
    
    // If type is changed to Title, reset numeric values
    if (field === 'type' && value === 'T') {
      lines[index].isTitle = true;
      lines[index].quantity = 0;
      lines[index].unit_price = 0;
    } else if (field === 'type') {
      lines[index].isTitle = false;
    }
    
    setOfferte({ ...offerte, lines });
  };

  const addLine = (type = 'M') => {
    setOfferte({
      ...offerte,
      lines: [...offerte.lines, { 
        id: generateId(),
        type: type, 
        category: '', 
        description: '', 
        quantity: 1, 
        unit: 'stuk',
        unit_price: 0, 
        btw_percentage: 10,
        isTitle: type === 'T'
      }]
    });
  };

  const addTitleLine = () => {
    setOfferte({
      ...offerte,
      lines: [...offerte.lines, { 
        id: generateId(),
        type: 'T', 
        category: '', 
        description: '', 
        quantity: 0, 
        unit: '',
        unit_price: 0, 
        btw_percentage: 0,
        isTitle: true
      }]
    });
  };

  const removeLine = (index) => {
    if (offerte.lines.length === 1) return;
    const lines = offerte.lines.filter((_, i) => i !== index);
    setOfferte({ ...offerte, lines });
  };

  const duplicateLine = (index) => {
    const lines = [...offerte.lines];
    const newLine = { ...lines[index], id: generateId() };
    lines.splice(index + 1, 0, newLine);
    setOfferte({ ...offerte, lines });
  };

  const selectProduct = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const lines = [...offerte.lines];
      lines[index] = {
        ...lines[index],
        description: product.naam || product.name || '',
        unit_price: product.verkoopprijs || product.sales_price || 0,
      };
      setOfferte({ ...offerte, lines });
    }
  };

  // Calculate line total
  const calculateLineTotal = (line) => {
    if (line.isTitle || line.type === 'T') return 0;
    const subtotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
    return subtotal;
  };

  // Calculate line BTW
  const calculateLineBTW = (line) => {
    if (line.isTitle || line.type === 'T') return 0;
    const subtotal = calculateLineTotal(line);
    return subtotal * ((parseFloat(line.btw_percentage) || 0) / 100);
  };

  // Toggle row selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.length === offerte.lines.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(offerte.lines.map(l => l.id));
    }
  };

  // Increase all prices
  const increasePrices = (percentage) => {
    const factor = 1 + (percentage / 100);
    const lines = offerte.lines.map(line => ({
      ...line,
      unit_price: line.isTitle ? 0 : line.unit_price * factor
    }));
    setOfferte({ ...offerte, lines });
    toast.success(`Prijzen ${percentage > 0 ? 'verhoogd' : 'verlaagd'} met ${Math.abs(percentage)}%`);
  };

  // Delete selected rows
  const deleteSelectedRows = () => {
    if (selectedRows.length === 0) return;
    const lines = offerte.lines.filter(l => !selectedRows.includes(l.id));
    if (lines.length === 0) {
      lines.push({ 
        id: generateId(),
        type: 'M', 
        category: '', 
        description: '', 
        quantity: 1, 
        unit: 'stuk',
        unit_price: 0, 
        btw_percentage: 10,
        isTitle: false
      });
    }
    setOfferte({ ...offerte, lines });
    setSelectedRows([]);
    toast.success(`${selectedRows.length} regel(s) verwijderd`);
  };

  const handleSave = async (sendAfterSave = false) => {
    if (!offerte.customer_id) {
      toast.error('Selecteer een klant');
      return;
    }
    setSaving(true);
    try {
      const offerteData = {
        klant_id: offerte.customer_id,
        datum: offerte.date,
        geldig_tot: offerte.valid_until,
        valuta: offerte.currency,
        onderwerp: offerte.subject,
        referentie: offerte.reference,
        opmerkingen: offerte.notes,
        status: sendAfterSave ? 'verzonden' : 'concept',
        regels: offerte.lines.map(line => ({
          type: line.type,
          categorie: line.category,
          omschrijving: line.description,
          aantal: parseFloat(line.quantity) || 0,
          eenheid: line.unit,
          prijs: parseFloat(line.unit_price) || 0,
          btw_percentage: parseFloat(line.btw_percentage) || 0
        }))
      };
      
      await quotesAPI.create(offerteData);
      toast.success(sendAfterSave ? 'Offerte aangemaakt en verzonden' : 'Offerte opgeslagen');
      navigate('/app/boekhouding/verkoop');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const subtotal = offerte.lines.reduce((s, l) => s + calculateLineTotal(l), 0);
  const btwTotal = offerte.lines.reduce((s, l) => s + calculateLineBTW(l), 0);
  const total = subtotal + btwTotal;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="nieuwe-offerte-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/app/boekhouding/verkoop')}
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Nieuwe Offerte</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-emerald-50 rounded-lg">
                <span className="text-sm text-emerald-700">{selectedRows.length} geselecteerd</span>
                <Button variant="ghost" size="sm" onClick={deleteSelectedRows} className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Quote Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Settings className="w-4 h-4 mr-2" />
                  Acties
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => increasePrices(5)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Verhoog prijzen +5%
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => increasePrices(10)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Verhoog prijzen +10%
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => increasePrices(-5)}>
                  <Percent className="w-4 h-4 mr-2" />
                  Verlaag prijzen -5%
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => increasePrices(-10)}>
                  <Percent className="w-4 h-4 mr-2" />
                  Verlaag prijzen -10%
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="rounded-lg">
              <Save className="w-4 h-4 mr-2" />
              Opslaan
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Versturen
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Top Section - Customer & Details */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Customer */}
          <Card className="col-span-4 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Klant</Label>
              <Select value={offerte.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger className="rounded-lg h-10">
                  <SelectValue placeholder="Selecteer klant..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.naam || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium">{selectedCustomer.naam || selectedCustomer.name}</p>
                  {selectedCustomer.adres && <p className="text-gray-600">{selectedCustomer.adres}</p>}
                  {selectedCustomer.postcode && <p className="text-gray-600">{selectedCustomer.postcode} {selectedCustomer.plaats}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="col-span-8 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Datum</Label>
                  <Input type="date" value={offerte.date} onChange={(e) => setOfferte({...offerte, date: e.target.value})} className="rounded-lg h-10" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Geldig tot</Label>
                  <Input type="date" value={offerte.valid_until} onChange={(e) => setOfferte({...offerte, valid_until: e.target.value})} className="rounded-lg h-10" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Valuta</Label>
                  <Select value={offerte.currency} onValueChange={(v) => setOfferte({...offerte, currency: v})}>
                    <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SRD">SRD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Onderwerp</Label>
                  <Input value={offerte.subject} onChange={(e) => setOfferte({...offerte, subject: e.target.value})} placeholder="Onderwerp" className="rounded-lg h-10" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Referentie</Label>
                  <Input value={offerte.reference} onChange={(e) => setOfferte({...offerte, reference: e.target.value})} placeholder="Ref." className="rounded-lg h-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lines Table */}
        <Card className="bg-white border border-gray-200 rounded-lg mb-4">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="w-10 px-3 py-3 text-left">
                      <Checkbox 
                        checked={selectedRows.length === offerte.lines.length && offerte.lines.length > 0}
                        onCheckedChange={toggleAllRows}
                      />
                    </th>
                    <th className="w-20 px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="w-32 px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categorie</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Omschrijving</th>
                    <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aantal</th>
                    <th className="w-24 px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Eenheid</th>
                    <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Prijs</th>
                    <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Totaal</th>
                    <th className="w-20 px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase">BTW</th>
                    <th className="w-24 px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {offerte.lines.map((line, idx) => (
                    <tr 
                      key={line.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 ${line.isTitle || line.type === 'T' ? 'bg-gray-50' : ''} ${selectedRows.includes(line.id) ? 'bg-emerald-50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <Checkbox 
                          checked={selectedRows.includes(line.id)}
                          onCheckedChange={() => toggleRowSelection(line.id)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={line.type} onValueChange={(v) => updateLine(idx, 'type', v)}>
                          <SelectTrigger className="h-8 text-xs rounded">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.value} - {t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        {!line.isTitle && line.type !== 'T' && (
                          <Input 
                            value={line.category} 
                            onChange={(e) => updateLine(idx, 'category', e.target.value)}
                            className="h-8 text-sm rounded"
                            placeholder="Categorie"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Input 
                          value={line.description} 
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          className={`h-8 text-sm rounded ${line.isTitle || line.type === 'T' ? 'font-semibold' : ''}`}
                          placeholder={line.isTitle || line.type === 'T' ? "Sectie titel..." : "Omschrijving..."}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {!line.isTitle && line.type !== 'T' && (
                          <Input 
                            type="number"
                            value={line.quantity} 
                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                            className="h-8 text-sm rounded text-right"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {!line.isTitle && line.type !== 'T' && (
                          <Select value={line.unit} onValueChange={(v) => updateLine(idx, 'unit', v)}>
                            <SelectTrigger className="h-8 text-xs rounded">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => (
                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {!line.isTitle && line.type !== 'T' && (
                          <Input 
                            type="number"
                            step="0.01"
                            value={line.unit_price} 
                            onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                            className="h-8 text-sm rounded text-right"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {!line.isTitle && line.type !== 'T' && formatAmount(calculateLineTotal(line), offerte.currency)}
                      </td>
                      <td className="px-2 py-2">
                        {!line.isTitle && line.type !== 'T' && (
                          <Select value={String(line.btw_percentage)} onValueChange={(v) => updateLine(idx, 'btw_percentage', v)}>
                            <SelectTrigger className="h-8 text-xs rounded">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BTW_RATES.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => duplicateLine(idx)} className="h-7 w-7 p-0 hover:bg-gray-100">
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={offerte.lines.length === 1} className="h-7 w-7 p-0 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Buttons */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-gray-50">
              <Button variant="outline" size="sm" onClick={() => addLine('M')} className="rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Plus className="w-4 h-4 mr-1" />
                Regel
              </Button>
              <Button variant="outline" size="sm" onClick={addTitleLine} className="rounded-lg">
                <FileText className="w-4 h-4 mr-1" />
                Titel/Sectie
              </Button>
              <Button variant="outline" size="sm" onClick={() => addLine('D')} className="rounded-lg">
                <Plus className="w-4 h-4 mr-1" />
                Dienst
              </Button>
              <Button variant="outline" size="sm" onClick={() => addLine('A')} className="rounded-lg">
                <Plus className="w-4 h-4 mr-1" />
                Arbeid
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Section - Notes & Totals */}
        <div className="grid grid-cols-12 gap-4">
          {/* Notes */}
          <Card className="col-span-7 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Opmerkingen</Label>
              <Textarea
                value={offerte.notes}
                onChange={(e) => setOfferte({...offerte, notes: e.target.value})}
                placeholder="Opmerkingen voor de klant..."
                className="rounded-lg min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="col-span-5 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Subtotaal excl. BTW</span>
                  <span className="text-sm font-medium">{formatAmount(subtotal, offerte.currency)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">BTW</span>
                  <span className="text-sm font-medium">{formatAmount(btwTotal, offerte.currency)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-emerald-50 -mx-4 px-4 rounded-lg">
                  <span className="font-semibold text-gray-900">Totaal incl. BTW</span>
                  <span className="text-xl font-bold text-emerald-600">{formatAmount(total, offerte.currency)}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{offerte.lines.filter(l => l.type !== 'T').length}</p>
                  <p className="text-xs text-gray-500">Regels</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{offerte.lines.filter(l => l.type === 'T').length}</p>
                  <p className="text-xs text-gray-500">Secties</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NieuweOffertePage;
