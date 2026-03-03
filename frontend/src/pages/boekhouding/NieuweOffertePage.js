import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesAPI, customersAPI, productsAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Percent,
  Copy,
  Eye,
  Download
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
    { value: 'week', label: 'week' },
    { value: 'maand', label: 'maand' },
    { value: 'vast', label: 'vast' },
    { value: 'kg', label: 'kg' },
    { value: 'liter', label: 'liter' },
  ];

  const BTW_RATES = [
    { value: '0', label: '0%' },
    { value: '10', label: '10%' },
    { value: '21', label: '21%' },
  ];

  const PAYMENT_TERMS = [
    { value: '14', label: '14 dagen' },
    { value: '30', label: '30 dagen' },
    { value: '60', label: '60 dagen' },
    { value: 'direct', label: 'Direct' },
    { value: 'vooruit', label: 'Vooruitbetaling' },
  ];

  const VALIDITY_PERIODS = [
    { value: '14', label: '14 dagen' },
    { value: '30', label: '30 dagen' },
    { value: '60', label: '60 dagen' },
    { value: '90', label: '90 dagen' },
  ];

  const [offerte, setOfferte] = useState({
    customer_id: '',
    contact_person: '',
    project_name: '',
    date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    validity_days: '30',
    currency: 'SRD',
    payment_terms: '30',
    delivery_time: '',
    discount_type: 'none',
    discount_value: 0,
    deposit_percentage: 0,
    notes: '',
    internal_notes: '',
    lines: [{ id: '1', description: '', quantity: 1, unit: 'stuk', unit_price: 0, btw_percentage: 10, discount: 0 }]
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
  const generateOfferteNumber = () => `OFF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
  const [offerteNumber] = useState(generateOfferteNumber());

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update valid_until when validity_days changes
    const days = parseInt(offerte.validity_days) || 30;
    const validUntil = new Date(offerte.date);
    validUntil.setDate(validUntil.getDate() + days);
    setOfferte(prev => ({ ...prev, valid_until: validUntil.toISOString().split('T')[0] }));
  }, [offerte.validity_days, offerte.date]);

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
      lines: [...offerte.lines, { id: generateId(), description: '', quantity: 1, unit: 'stuk', unit_price: 0, btw_percentage: 10, discount: 0 }]
    });
  };

  const duplicateLine = (index) => {
    const lines = [...offerte.lines];
    const newLine = { ...lines[index], id: generateId() };
    lines.splice(index + 1, 0, newLine);
    setOfferte({ ...offerte, lines });
    toast.success('Regel gedupliceerd');
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

  const calculateLineSubtotal = (line) => {
    return (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
  };

  const calculateLineDiscount = (line) => {
    const subtotal = calculateLineSubtotal(line);
    return subtotal * ((parseFloat(line.discount) || 0) / 100);
  };

  const calculateLineTotal = (line) => {
    return calculateLineSubtotal(line) - calculateLineDiscount(line);
  };

  const calculateLineBTW = (line) => {
    const total = calculateLineTotal(line);
    return total * ((parseFloat(line.btw_percentage) || 0) / 100);
  };

  // Totals
  const linesSubtotal = offerte.lines.reduce((s, l) => s + calculateLineSubtotal(l), 0);
  const linesDiscount = offerte.lines.reduce((s, l) => s + calculateLineDiscount(l), 0);
  const subtotalAfterLineDiscount = linesSubtotal - linesDiscount;
  
  // Global discount
  const globalDiscount = offerte.discount_type === 'percentage' 
    ? subtotalAfterLineDiscount * ((parseFloat(offerte.discount_value) || 0) / 100)
    : offerte.discount_type === 'fixed' 
      ? parseFloat(offerte.discount_value) || 0 
      : 0;
  
  const subtotalAfterDiscount = subtotalAfterLineDiscount - globalDiscount;
  const btwTotal = offerte.lines.reduce((s, l) => s + calculateLineBTW(l), 0);
  const total = subtotalAfterDiscount + btwTotal;
  const depositAmount = total * ((parseFloat(offerte.deposit_percentage) || 0) / 100);

  const handleSave = async (sendAfterSave = false) => {
    if (!offerte.customer_id) {
      toast.error('Selecteer een klant');
      return;
    }
    if (offerte.lines.some(l => !l.description)) {
      toast.error('Vul alle omschrijvingen in');
      return;
    }
    setSaving(true);
    try {
      const offerteData = {
        nummer: offerteNumber,
        klant_id: offerte.customer_id,
        contactpersoon: offerte.contact_person,
        project_naam: offerte.project_name,
        datum: offerte.date,
        geldig_tot: offerte.valid_until,
        valuta: offerte.currency,
        betalingstermijn: offerte.payment_terms,
        levertijd: offerte.delivery_time,
        korting_type: offerte.discount_type,
        korting_waarde: parseFloat(offerte.discount_value) || 0,
        aanbetaling_percentage: parseFloat(offerte.deposit_percentage) || 0,
        opmerkingen: offerte.notes,
        interne_notities: offerte.internal_notes,
        status: sendAfterSave ? 'verzonden' : 'concept',
        regels: offerte.lines.map(line => ({
          omschrijving: line.description,
          aantal: parseFloat(line.quantity) || 0,
          eenheid: line.unit,
          prijs: parseFloat(line.unit_price) || 0,
          korting: parseFloat(line.discount) || 0,
          btw_percentage: parseFloat(line.btw_percentage) || 0
        }))
      };
      
      await quotesAPI.create(offerteData);
      toast.success(sendAfterSave ? 'Offerte verzonden naar klant' : 'Offerte opgeslagen als concept');
      navigate('/app/boekhouding/verkoop');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100" data-testid="nieuwe-offerte-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/boekhouding/verkoop')} className="hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-600" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Nieuwe Offerte</h1>
                <p className="text-xs text-slate-500">{offerteNumber}</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Concept</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-slate-600">
              <Eye className="w-4 h-4 mr-2" />
              Voorbeeld
            </Button>
            <Button variant="outline" size="sm" className="text-slate-600">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Opslaan
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Versturen
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-12 gap-5">
          
          {/* Left Column - Main Content */}
          <div className="col-span-9 space-y-5">
            
            {/* Klant & Project Info */}
            <div className="grid grid-cols-2 gap-5">
              {/* Klantgegevens */}
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Klantgegevens
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Klant *</Label>
                    <Select value={offerte.customer_id} onValueChange={handleCustomerChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecteer klant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.naam || c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCustomer && (
                    <div className="p-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
                      <p className="font-medium text-slate-900">{selectedCustomer.naam || selectedCustomer.name}</p>
                      {selectedCustomer.adres && <p className="text-slate-600">{selectedCustomer.adres}</p>}
                      {selectedCustomer.postcode && <p className="text-slate-600">{selectedCustomer.postcode} {selectedCustomer.plaats}</p>}
                      {selectedCustomer.email && (
                        <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {selectedCustomer.email}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Contactpersoon</Label>
                    <Input 
                      value={offerte.contact_person} 
                      onChange={(e) => setOfferte({...offerte, contact_person: e.target.value})}
                      placeholder="Naam contactpersoon"
                      className="h-9"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Project & Offerte Info */}
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Offerte Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Offertedatum</Label>
                      <Input type="date" value={offerte.date} onChange={(e) => setOfferte({...offerte, date: e.target.value})} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Geldigheid</Label>
                      <Select value={offerte.validity_days} onValueChange={(v) => setOfferte({...offerte, validity_days: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VALIDITY_PERIODS.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Projectnaam / Referentie</Label>
                    <Input 
                      value={offerte.project_name} 
                      onChange={(e) => setOfferte({...offerte, project_name: e.target.value})}
                      placeholder="Projectnaam of referentienummer"
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Betalingstermijn</Label>
                      <Select value={offerte.payment_terms} onValueChange={(v) => setOfferte({...offerte, payment_terms: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TERMS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Levertijd</Label>
                      <Input 
                        value={offerte.delivery_time} 
                        onChange={(e) => setOfferte({...offerte, delivery_time: e.target.value})}
                        placeholder="Bijv. 2-3 weken"
                        className="h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Offerte Regels */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-700">Offerte Regels</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Omschrijving</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide w-20">Aantal</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide w-24">Eenheid</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide w-28">Prijs</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide w-20">Korting</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide w-28">Totaal</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide w-20">BTW</th>
                        <th className="px-3 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {offerte.lines.map((line, idx) => (
                        <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <div className="space-y-1.5">
                              <Select value="" onValueChange={(v) => selectProduct(idx, v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Artikel kiezen..." />
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
                                className="h-8 text-sm"
                                placeholder="Omschrijving..."
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Input 
                              type="number"
                              value={line.quantity} 
                              onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                              className="h-8 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Select value={line.unit} onValueChange={(v) => updateLine(idx, 'unit', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map(u => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input 
                              type="number"
                              step="0.01"
                              value={line.unit_price} 
                              onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                              className="h-8 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center">
                              <Input 
                                type="number"
                                value={line.discount} 
                                onChange={(e) => updateLine(idx, 'discount', e.target.value)}
                                className="h-8 text-sm text-right w-14"
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-400 ml-1">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-900">
                            {formatAmount(calculateLineTotal(line), offerte.currency)}
                          </td>
                          <td className="px-3 py-2">
                            <Select value={String(line.btw_percentage)} onValueChange={(v) => updateLine(idx, 'btw_percentage', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BTW_RATES.map(r => (
                                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => duplicateLine(idx)} className="h-7 w-7 p-0 hover:bg-slate-100">
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
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
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <Button variant="outline" size="sm" onClick={addLine} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                    <Plus className="w-4 h-4 mr-2" />
                    Regel toevoegen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Opmerkingen */}
            <div className="grid grid-cols-2 gap-5">
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700">Opmerkingen (zichtbaar voor klant)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    value={offerte.notes}
                    onChange={(e) => setOfferte({...offerte, notes: e.target.value})}
                    placeholder="Bijv. betalingsvoorwaarden, garantie, leveringsvoorwaarden..."
                    className="min-h-[100px] text-sm"
                  />
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700">Interne notities (niet zichtbaar)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    value={offerte.internal_notes}
                    onChange={(e) => setOfferte({...offerte, internal_notes: e.target.value})}
                    placeholder="Interne opmerkingen voor eigen administratie..."
                    className="min-h-[100px] text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="col-span-3 space-y-5">
            {/* Totalen */}
            <Card className="bg-white border border-slate-200 shadow-sm sticky top-20">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-700">Totaaloverzicht</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotaal</span>
                  <span className="font-medium">{formatAmount(linesSubtotal, offerte.currency)}</span>
                </div>
                
                {linesDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Regelkorting</span>
                    <span>- {formatAmount(linesDiscount, offerte.currency)}</span>
                  </div>
                )}

                {/* Global Discount */}
                <div className="pt-2 border-t border-slate-100">
                  <Label className="text-xs text-slate-500 mb-2 block">Extra korting</Label>
                  <div className="flex gap-2">
                    <Select value={offerte.discount_type} onValueChange={(v) => setOfferte({...offerte, discount_type: v})}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">Vast bedrag</SelectItem>
                      </SelectContent>
                    </Select>
                    {offerte.discount_type !== 'none' && (
                      <Input 
                        type="number"
                        value={offerte.discount_value}
                        onChange={(e) => setOfferte({...offerte, discount_value: e.target.value})}
                        className="h-8 w-20 text-right text-sm"
                        placeholder="0"
                      />
                    )}
                  </div>
                </div>

                {globalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Extra korting</span>
                    <span>- {formatAmount(globalDiscount, offerte.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-600">BTW</span>
                  <span className="font-medium">{formatAmount(btwTotal, offerte.currency)}</span>
                </div>

                <div className="flex justify-between py-3 bg-emerald-50 -mx-4 px-4 rounded-lg border border-emerald-100">
                  <span className="font-semibold text-slate-900">Totaal incl. BTW</span>
                  <span className="text-xl font-bold text-emerald-600">{formatAmount(total, offerte.currency)}</span>
                </div>

                {/* Aanbetaling */}
                <div className="pt-2 border-t border-slate-100">
                  <Label className="text-xs text-slate-500 mb-2 block">Aanbetaling</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={offerte.deposit_percentage}
                      onChange={(e) => setOfferte({...offerte, deposit_percentage: e.target.value})}
                      className="h-8 w-20 text-right text-sm"
                      placeholder="0"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                  {offerte.deposit_percentage > 0 && (
                    <p className="text-sm text-slate-600 mt-2">
                      Aanbetaling: <span className="font-medium">{formatAmount(depositAmount, offerte.currency)}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valuta</span>
                    <span className="font-medium">{offerte.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Geldig tot</span>
                    <span className="font-medium">{new Date(offerte.valid_until).toLocaleDateString('nl-NL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Betaling</span>
                    <span className="font-medium">{PAYMENT_TERMS.find(t => t.value === offerte.payment_terms)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Regels</span>
                    <span className="font-medium">{offerte.lines.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NieuweOffertePage;
