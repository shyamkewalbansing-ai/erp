import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Download, Printer, Upload, 
  ArrowLeft, Calendar, X, Save, Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Currency configurations
const currencies = [
  { code: 'SRD', symbol: 'SRD', name: 'Surinaamse Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' }
];

// BTW configurations - including "Geen BTW" option
const btwOptions = [
  { id: 'geen', label: 'Geen BTW', rates: [{ value: 0, label: 'Geen BTW' }] },
  { id: 'sr', label: '🇸🇷 Suriname', rates: [{ value: 10, label: '10%' }, { value: 0, label: '0%' }] },
  { id: 'nl', label: '🇳🇱 Nederland', rates: [{ value: 21, label: '21%' }, { value: 9, label: '9%' }, { value: 0, label: '0%' }] }
];

const formatCurrency = (amount, currency) => {
  const curr = currencies.find(c => c.code === currency) || currencies[0];
  if (currency === 'SRD') {
    return `SRD ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${curr.symbol} ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('nl-NL');
};

export default function PublicInvoiceGenerator() {
  const invoiceRef = useRef(null);
  const [documentType, setDocumentType] = useState('factuur');
  const [currency, setCurrency] = useState('SRD');
  const [btwRegion, setBtwRegion] = useState('sr');
  const [showPreview, setShowPreview] = useState(false);
  
  const [company, setCompany] = useState({
    name: '', address: '', postcode: '', city: '', country: 'Suriname',
    phone: '', email: '', kvk: '', btw_number: '', iban: '', bank_name: ''
  });
  
  const [logo, setLogo] = useState(null);
  const logoInputRef = useRef(null);
  
  const [customer, setCustomer] = useState({
    name: '', address: '', postcode: '', city: '', country: ''
  });
  
  const [invoiceDetails, setInvoiceDetails] = useState({
    number: `${new Date().getFullYear()}001`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_date: new Date().toISOString().split('T')[0]
  });
  
  const currentBtwRates = btwOptions.find(b => b.id === btwRegion)?.rates || btwOptions[0].rates;
  
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, btw: currentBtwRates[0].value }
  ]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo mag maximaal 2MB zijn');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };
  
  const addItem = () => {
    setItems([...items, {
      id: Date.now(), description: '', quantity: 1, price: 0, btw: currentBtwRates[0].value
    }]);
  };
  
  const removeItem = (id) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const handleBtwRegionChange = (region) => {
    setBtwRegion(region);
    const newRates = btwOptions.find(b => b.id === region)?.rates || btwOptions[0].rates;
    setItems(items.map(item => ({ ...item, btw: newRates[0].value })));
  };
  
  const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const calculateBTW = () => items.reduce((sum, item) => sum + (item.quantity * item.price * item.btw / 100), 0);
  const calculateTotal = () => calculateSubtotal() + calculateBTW();
  
  const generatePDF = async () => {
    if (!company.name || !customer.name) {
      toast.error('Vul minimaal uw bedrijfsnaam en klantnaam in');
      return;
    }
    
    setShowPreview(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const element = invoiceRef.current;
    if (!element) return;
    
    toast.loading('PDF wordt gegenereerd...', { id: 'pdf' });
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${documentType}-${invoiceDetails.number}.pdf`);
      
      toast.success('PDF succesvol gedownload!', { id: 'pdf' });
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Fout bij genereren PDF', { id: 'pdf' });
    }
  };
  
  const handlePrint = () => {
    if (!company.name || !customer.name) {
      toast.error('Vul minimaal uw bedrijfsnaam en klantnaam in');
      return;
    }
    setShowPreview(true);
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-white/80 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Terug</span>
              </a>
              <div className="h-6 w-px bg-white/30"></div>
              <h1 className="text-lg font-semibold">
                {documentType === 'factuur' ? 'Factuur' : 'Offerte'} Maken
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="ghost"
                className="text-white hover:bg-white/20 h-9"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Editor' : 'Preview'}
              </Button>
              <Button
                onClick={generatePDF}
                className="bg-white text-emerald-700 hover:bg-emerald-50 h-9"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={handlePrint}
                variant="ghost"
                className="text-white hover:bg-white/20 h-9"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Header - Document Type & Settings */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Document Type Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setDocumentType('factuur')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    documentType === 'factuur'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Factuur
                </button>
                <button
                  onClick={() => setDocumentType('offerte')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    documentType === 'offerte'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Offerte
                </button>
              </div>
              
              {/* Currency */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Valuta:</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              
              {/* BTW Region */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">BTW:</span>
                <select
                  value={btwRegion}
                  onChange={(e) => handleBtwRegionChange(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {btwOptions.map(b => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Invoice Number */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Nummer:</span>
              <input
                type="text"
                value={invoiceDetails.number}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, number: e.target.value})}
                className="w-32 h-9 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none">
        
        {/* Editor View */}
        {!showPreview ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Company & Customer */}
            <div className="space-y-6">
              {/* Company Details */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-2">
                  <h2 className="text-white font-medium text-sm">Uw Gegevens</h2>
                </div>
                <div className="p-4 space-y-3">
                  {/* Logo */}
                  <div>
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    {logo ? (
                      <div className="relative inline-block">
                        <img src={logo} alt="Logo" className="h-16 rounded" />
                        <button
                          onClick={() => setLogo(null)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-emerald-500 hover:text-emerald-600"
                      >
                        <Upload className="w-4 h-4" />
                        Logo uploaden
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Bedrijfsnaam *"
                    value={company.name}
                    onChange={(e) => setCompany({...company, name: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Adres"
                    value={company.address}
                    onChange={(e) => setCompany({...company, address: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Postcode"
                      value={company.postcode}
                      onChange={(e) => setCompany({...company, postcode: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Plaats"
                      value={company.city}
                      onChange={(e) => setCompany({...company, city: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Telefoon"
                      value={company.phone}
                      onChange={(e) => setCompany({...company, phone: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={company.email}
                      onChange={(e) => setCompany({...company, email: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="KvK nummer"
                      value={company.kvk}
                      onChange={(e) => setCompany({...company, kvk: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="BTW nummer"
                      value={company.btw_number}
                      onChange={(e) => setCompany({...company, btw_number: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Bank"
                      value={company.bank_name}
                      onChange={(e) => setCompany({...company, bank_name: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="IBAN"
                      value={company.iban}
                      onChange={(e) => setCompany({...company, iban: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Customer Details */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-2">
                  <h2 className="text-white font-medium text-sm">Klant</h2>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Klantnaam / Bedrijf *"
                    value={customer.name}
                    onChange={(e) => setCustomer({...customer, name: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Adres"
                    value={customer.address}
                    onChange={(e) => setCustomer({...customer, address: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Postcode"
                      value={customer.postcode}
                      onChange={(e) => setCustomer({...customer, postcode: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Plaats"
                      value={customer.city}
                      onChange={(e) => setCustomer({...customer, city: e.target.value})}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Dates */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-2">
                  <h2 className="text-white font-medium text-sm">Datums</h2>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Factuurdatum</label>
                    <input
                      type="date"
                      value={invoiceDetails.date}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {documentType === 'factuur' ? 'Vervaldatum' : 'Geldig tot'}
                    </label>
                    <input
                      type="date"
                      value={invoiceDetails.due_date}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, due_date: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-2 flex items-center justify-between">
                  <h2 className="text-white font-medium text-sm">Producten / Diensten</h2>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 text-white/90 hover:text-white text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Toevoegen
                  </button>
                </div>
                
                {/* Table Header */}
                <div className="bg-slate-50 border-b border-slate-200">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-slate-500 uppercase">
                    <div className="col-span-5">Omschrijving</div>
                    <div className="col-span-2 text-center">Aantal</div>
                    <div className="col-span-2 text-right">Prijs excl.</div>
                    {btwRegion !== 'geen' && <div className="col-span-1 text-center">BTW</div>}
                    <div className={`${btwRegion !== 'geen' ? 'col-span-1' : 'col-span-2'} text-right`}>Totaal</div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
                
                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Omschrijving"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full h-9 px-3 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full h-9 px-3 rounded border border-slate-300 text-sm text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full h-9 px-3 rounded border border-slate-300 text-sm text-right"
                        />
                      </div>
                      {btwRegion !== 'geen' && (
                        <div className="col-span-1">
                          <select
                            value={item.btw}
                            onChange={(e) => updateItem(item.id, 'btw', parseFloat(e.target.value))}
                            className="w-full h-9 px-1 rounded border border-slate-300 text-sm text-center"
                          >
                            {currentBtwRates.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={`${btwRegion !== 'geen' ? 'col-span-1' : 'col-span-2'} text-right font-medium text-sm text-slate-700`}>
                        {formatCurrency(item.quantity * item.price, currency)}
                      </div>
                      <div className="col-span-1 text-center">
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Totals */}
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <div className="max-w-xs ml-auto space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotaal</span>
                      <span className="font-medium">{formatCurrency(calculateSubtotal(), currency)}</span>
                    </div>
                    {btwRegion !== 'geen' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">BTW</span>
                        <span className="font-medium">{formatCurrency(calculateBTW(), currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-300">
                      <span className="text-slate-700">Totaal</span>
                      <span className="text-emerald-600">{formatCurrency(calculateTotal(), currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Preview View */
          <div className="flex justify-center">
            <div 
              ref={invoiceRef}
              className="bg-white shadow-xl rounded-lg overflow-hidden print:shadow-none print:rounded-none"
              style={{ width: '210mm', minHeight: '297mm' }}
            >
              {/* Invoice Header */}
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              
              <div className="p-8">
                {/* Header with Logo and Title */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    {logo ? (
                      <img src={logo} alt="Logo" className="h-16 mb-3" />
                    ) : company.name && (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl mb-3">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <h1 className="text-xl font-bold text-slate-900">{company.name || 'Uw Bedrijf'}</h1>
                    <div className="text-sm text-slate-500 mt-1">
                      {company.address && <p>{company.address}</p>}
                      {(company.postcode || company.city) && <p>{company.postcode} {company.city}</p>}
                      {company.phone && <p>Tel: {company.phone}</p>}
                      {company.email && <p>{company.email}</p>}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <h2 className="text-3xl font-bold text-emerald-600 uppercase">
                      {documentType}
                    </h2>
                    <p className="text-xl font-mono text-slate-700 mt-2">#{invoiceDetails.number}</p>
                  </div>
                </div>
                
                {/* Customer & Dates */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Factuuradres</h3>
                    <div className="text-slate-700">
                      <p className="font-semibold text-lg">{customer.name || 'Klantnaam'}</p>
                      {customer.address && <p>{customer.address}</p>}
                      {(customer.postcode || customer.city) && <p>{customer.postcode} {customer.city}</p>}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="inline-block text-left">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-slate-400">Datum:</span>
                        <span className="font-medium">{formatDate(invoiceDetails.date)}</span>
                        <span className="text-slate-400">{documentType === 'factuur' ? 'Vervaldatum:' : 'Geldig tot:'}</span>
                        <span className="font-medium">{formatDate(invoiceDetails.due_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Items Table */}
                <table className="w-full mb-8">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                      <th className="text-left py-3 px-4 text-sm font-medium rounded-l-lg">Omschrijving</th>
                      <th className="text-center py-3 px-2 text-sm font-medium w-20">Aantal</th>
                      <th className="text-right py-3 px-4 text-sm font-medium w-28">Prijs</th>
                      {btwRegion !== 'geen' && <th className="text-center py-3 px-2 text-sm font-medium w-16">BTW</th>}
                      <th className="text-right py-3 px-4 text-sm font-medium w-32 rounded-r-lg">Bedrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-3 px-4 text-sm">{item.description || 'Product/Dienst'}</td>
                        <td className="py-3 px-2 text-sm text-center">{item.quantity}</td>
                        <td className="py-3 px-4 text-sm text-right">{formatCurrency(item.price, currency)}</td>
                        {btwRegion !== 'geen' && <td className="py-3 px-2 text-sm text-center">{item.btw}%</td>}
                        <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(item.quantity * item.price, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-sm border-b border-slate-200">
                      <span className="text-slate-500">Subtotaal</span>
                      <span>{formatCurrency(calculateSubtotal(), currency)}</span>
                    </div>
                    {btwRegion !== 'geen' && (
                      <div className="flex justify-between py-2 text-sm border-b border-slate-200">
                        <span className="text-slate-500">BTW</span>
                        <span>{formatCurrency(calculateBTW(), currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 text-lg font-bold">
                      <span>Totaal</span>
                      <span className="text-emerald-600">{formatCurrency(calculateTotal(), currency)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Info */}
                {(company.bank_name || company.iban) && (
                  <div className="border-t border-slate-200 pt-6 mt-8">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Betalingsgegevens</h3>
                    <div className="text-sm text-slate-600">
                      {company.bank_name && <p>Bank: {company.bank_name}</p>}
                      {company.iban && <p>IBAN: {company.iban}</p>}
                      {company.kvk && <p>KvK: {company.kvk}</p>}
                      {company.btw_number && <p>BTW: {company.btw_number}</p>}
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                      Gelieve het {documentType}nummer te vermelden bij betaling.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500 mt-auto"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:bg-white { background: white !important; }
        }
      `}</style>
    </div>
  );
}
