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
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  Save,
  Send,
  FileText,
  Building2
} from 'lucide-react';

const NieuweOffertePage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const UNITS = [
    { value: 'stuk', label: 'stuk' },
    { value: 'm2', label: 'm²' },
    { value: 'm', label: 'm' },
    { value: 'uur', label: 'uur' },
    { value: 'dag', label: 'dag' },
    { value: 'vast', label: 'vast' },
  ];

  const BTW_RATES = [
    { value: '0', label: '0%' },
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
    lines: [{ id: '1', description: '', quantity: 1, unit: 'stuk', unit_price: 0, btw_percentage: 10 }]
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
    setOfferte({ ...offerte, lines });
  };

  const addLine = () => {
    setOfferte({
      ...offerte,
      lines: [...offerte.lines, { id: generateId(), description: '', quantity: 1, unit: 'stuk', unit_price: 0, btw_percentage: 10 }]
    });
  };

  const removeLine = (index) => {
    if (offerte.lines.length === 1) return;
    const lines = offerte.lines.filter((_, i) => i !== index);
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

  const calculateLineTotal = (line) => {
    const subtotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
    return subtotal;
  };

  const calculateLineBTW = (line) => {
    const subtotal = calculateLineTotal(line);
    return subtotal * ((parseFloat(line.btw_percentage) || 0) / 100);
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/boekhouding/verkoop')} className="rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Nieuwe Offerte</h1>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200">Concept</Badge>
          </div>
          
          <div className="flex items-center gap-2">
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

      <div className="p-6 max-w-6xl mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Klant */}
          <Card className="col-span-4 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Klant</Label>
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="col-span-8 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Datum</Label>
                  <Input type="date" value={offerte.date} onChange={(e) => setOfferte({...offerte, date: e.target.value})} className="rounded-lg h-10" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Geldig tot</Label>
                  <Input type="date" value={offerte.valid_until} onChange={(e) => setOfferte({...offerte, valid_until: e.target.value})} className="rounded-lg h-10" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Onderwerp</Label>
                  <Input value={offerte.subject} onChange={(e) => setOfferte({...offerte, subject: e.target.value})} placeholder="Onderwerp" className="rounded-lg h-10" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Valuta</Label>
                  <Select value={offerte.currency} onValueChange={(v) => setOfferte({...offerte, currency: v})}>
                    <SelectTrigger className="rounded-lg h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SRD">SRD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Omschrijving</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-24">Aantal</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">Eenheid</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-28">Prijs</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-28">Totaal</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-20">BTW</th>
                    <th className="px-3 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {offerte.lines.map((line, idx) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <Select value="" onValueChange={(v) => selectProduct(idx, v)}>
                            <SelectTrigger className="rounded-lg h-9 text-sm">
                              <SelectValue placeholder="Selecteer artikel..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.naam || p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input 
                            value={line.description} 
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            className="h-9 text-sm rounded-lg"
                            placeholder="Of typ handmatig..."
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Input 
                          type="number"
                          value={line.quantity} 
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          className="h-9 text-sm rounded-lg text-right"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Select value={line.unit} onValueChange={(v) => updateLine(idx, 'unit', v)}>
                          <SelectTrigger className="h-9 text-sm rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map(u => (
                              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Input 
                          type="number"
                          step="0.01"
                          value={line.unit_price} 
                          onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                          className="h-9 text-sm rounded-lg text-right"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatAmount(calculateLineTotal(line), offerte.currency)}
                      </td>
                      <td className="px-3 py-3">
                        <Select value={String(line.btw_percentage)} onValueChange={(v) => updateLine(idx, 'btw_percentage', v)}>
                          <SelectTrigger className="h-9 text-sm rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BTW_RATES.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={offerte.lines.length === 1} className="h-8 w-8 p-0 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" size="sm" onClick={addLine} className="rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe regel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-7 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Opmerkingen</Label>
              <Textarea
                value={offerte.notes}
                onChange={(e) => setOfferte({...offerte, notes: e.target.value})}
                placeholder="Opmerkingen voor de klant..."
                className="rounded-lg min-h-[100px]"
              />
            </CardContent>
          </Card>

          <Card className="col-span-5 bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Subtotaal</span>
                  <span className="text-sm font-medium">{formatAmount(subtotal, offerte.currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">BTW</span>
                  <span className="text-sm font-medium">{formatAmount(btwTotal, offerte.currency)}</span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-50 -mx-4 px-4 rounded-lg mt-2">
                  <span className="font-semibold">Totaal</span>
                  <span className="text-xl font-bold text-emerald-600">{formatAmount(total, offerte.currency)}</span>
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
