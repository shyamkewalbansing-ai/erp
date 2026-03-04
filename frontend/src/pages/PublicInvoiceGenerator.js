import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Download, Printer, Upload, 
  Building2, User, CreditCard, Calendar,
  Receipt, X, Check, Sparkles, Mail, Phone, MapPin
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Currency configurations
const currencies = {
  SRD: { symbol: 'SRD', name: 'Surinaamse Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  USD: { symbol: '$', name: 'US Dollar' }
};

// BTW configurations
const btwOptions = {
  geen: { label: 'Geen BTW', rates: [{ value: 0, label: '0%' }] },
  SR: { label: '🇸🇷 SR', rates: [{ value: 10, label: '10%' }, { value: 0, label: '0%' }] },
  NL: { label: '🇳🇱 NL', rates: [{ value: 21, label: '21%' }, { value: 9, label: '9%' }, { value: 0, label: '0%' }] }
};

// Invoice Templates - Exact match to reference design
const templates = [
  { id: 'modern', name: 'Modern', primaryColor: '#F47B1F', secondaryColor: '#1D2C5C' },  // Orange + Navy
  { id: 'zakelijk', name: 'Zakelijk', primaryColor: '#2AA7DF', secondaryColor: '#1D2C5C' },  // Blue + Navy
  { id: 'creative', name: 'Creatief', primaryColor: '#9333EA', secondaryColor: '#1E1B4B' },  // Purple + Dark Purple
  { id: 'bold', name: 'Krachtig', primaryColor: '#DC2626', secondaryColor: '#1D2C5C' },  // Red + Navy
  { id: 'nature', name: 'Natuur', primaryColor: '#059669', secondaryColor: '#1D2C5C' }   // Green + Navy
];

const formatCurrency = (amount, currency) => {
  if (currency === 'SRD') {
    return `SRD ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'EUR') {
    return `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PublicInvoiceGenerator() {
  const invoiceRef = useRef(null);
  const [documentType, setDocumentType] = useState('factuur');
  const [currency, setCurrency] = useState('SRD');
  const [btwRegion, setBtwRegion] = useState('SR');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  
  const [company, setCompany] = useState({
    name: '', address: '', postcode: '', city: '', country: '',
    phone: '', email: '', kvk: '', btw_number: '', iban: '', bank_name: ''
  });
  
  const [logo, setLogo] = useState(null);
  const logoInputRef = useRef(null);
  
  const [customer, setCustomer] = useState({
    name: '', address: '', postcode: '', city: '', country: ''
  });
  
  const [invoiceDetails, setInvoiceDetails] = useState({
    number: `FAC-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  const currentBtwRates = btwOptions[btwRegion]?.rates || btwOptions.SR.rates;
  const currentTemplate = templates.find(t => t.id === selectedTemplate) || templates[0];
  
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, btw: currentBtwRates[0].value }
  ]);
  
  const [notes, setNotes] = useState('');

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
    const newRates = btwOptions[region]?.rates || btwOptions.SR.rates;
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
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${documentType}-${invoiceDetails.number}.pdf`);
      
      toast.success('PDF succesvol gedownload!', { id: 'pdf' });
    } catch (error) {
      toast.error('Fout bij genereren PDF', { id: 'pdf' });
    }
  };
  
  const handleDocumentTypeChange = (type) => {
    setDocumentType(type);
    setInvoiceDetails(prev => ({
      ...prev,
      number: `${type === 'factuur' ? 'FAC' : 'OFF'}-${new Date().getFullYear()}-001`
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header with Logo */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"
                alt="Facturatie.sr"
                className="h-8 w-auto"
              />
            </a>
            <span className="text-sm text-slate-500">Gratis Factuur & Offerte Maker</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        
        {/* Template Selection Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Template:</span>
              <div className="flex gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTemplate === t.id
                        ? 'text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    style={selectedTemplate === t.id ? { backgroundColor: t.primaryColor } : {}}
                  >
                    {selectedTemplate === t.id && <Check className="w-4 h-4" />}
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={generatePDF}
                style={{ backgroundColor: currentTemplate.primaryColor }}
                className="text-white shadow-md hover:opacity-90"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="border-slate-300"
              >
                <Printer className="w-4 h-4 mr-2" />
                Printen
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block">
          
          {/* Left Panel - Form */}
          <div className="xl:col-span-5 space-y-5 print:hidden">
            
            {/* Document Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Document Instellingen</h2>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleDocumentTypeChange('factuur')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    documentType === 'factuur'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span className="font-medium">Factuur</span>
                </button>
                <button
                  onClick={() => handleDocumentTypeChange('offerte')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    documentType === 'offerte'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Offerte</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Valuta</label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    {Object.entries(currencies).map(([code]) => (
                      <button
                        key={code}
                        onClick={() => setCurrency(code)}
                        className={`flex-1 py-2 text-sm font-medium transition-all ${
                          currency === code
                            ? 'bg-teal-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">BTW Regio</label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    {Object.entries(btwOptions).map(([key, opt]) => (
                      <button
                        key={key}
                        onClick={() => handleBtwRegionChange(key)}
                        className={`flex-1 py-2 text-sm font-medium transition-all ${
                          btwRegion === key
                            ? 'bg-teal-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {key === 'geen' ? 'Geen' : opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Company Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900">Uw Bedrijfsgegevens</h2>
              </div>
              
              {/* Logo Upload */}
              <div className="mb-4">
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                {logo ? (
                  <div className="relative inline-block">
                    <img src={logo} alt="Logo" className="h-12 rounded-lg" />
                    <button
                      onClick={() => setLogo(null)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-teal-500 hover:text-teal-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Logo uploaden
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <Input
                  placeholder="Bedrijfsnaam *"
                  value={company.name}
                  onChange={(e) => setCompany({...company, name: e.target.value})}
                  className="border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Adres"
                    value={company.address}
                    onChange={(e) => setCompany({...company, address: e.target.value})}
                    className="border-slate-200"
                  />
                  <Input
                    placeholder="Postcode & Plaats"
                    value={company.city}
                    onChange={(e) => setCompany({...company, city: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Telefoon"
                    value={company.phone}
                    onChange={(e) => setCompany({...company, phone: e.target.value})}
                    className="border-slate-200"
                  />
                  <Input
                    placeholder="E-mail"
                    value={company.email}
                    onChange={(e) => setCompany({...company, email: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="KvK nummer"
                    value={company.kvk}
                    onChange={(e) => setCompany({...company, kvk: e.target.value})}
                    className="border-slate-200"
                  />
                  <Input
                    placeholder="BTW-nummer"
                    value={company.btw_number}
                    onChange={(e) => setCompany({...company, btw_number: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
              </div>
            </div>
            
            {/* Bank Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900">Bankgegevens</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Bank naam"
                  value={company.bank_name}
                  onChange={(e) => setCompany({...company, bank_name: e.target.value})}
                  className="border-slate-200"
                />
                <Input
                  placeholder="IBAN / Rekeningnummer"
                  value={company.iban}
                  onChange={(e) => setCompany({...company, iban: e.target.value})}
                  className="border-slate-200"
                />
              </div>
            </div>
            
            {/* Customer Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900">Klantgegevens</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Klantnaam / Bedrijf *"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  className="border-slate-200"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Adres"
                    value={customer.address}
                    onChange={(e) => setCustomer({...customer, address: e.target.value})}
                    className="border-slate-200"
                  />
                  <Input
                    placeholder="Postcode & Plaats"
                    value={customer.city}
                    onChange={(e) => setCustomer({...customer, city: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
              </div>
            </div>
            
            {/* Invoice Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900">{documentType === 'factuur' ? 'Factuur' : 'Offerte'} Details</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Nummer"
                  value={invoiceDetails.number}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, number: e.target.value})}
                  className="border-slate-200"
                />
                <Input
                  type="date"
                  value={invoiceDetails.date}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
                  className="border-slate-200"
                />
                <Input
                  type="date"
                  value={invoiceDetails.due_date}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, due_date: e.target.value})}
                  className="border-slate-200"
                />
              </div>
            </div>
            
            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Producten / Diensten</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  <Plus className="w-4 h-4" />
                  Toevoegen
                </button>
              </div>
              
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">Item {index + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Omschrijving"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="border-slate-200 bg-white"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        type="number"
                        placeholder="Aantal"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="border-slate-200 bg-white"
                      />
                      <Input
                        type="number"
                        placeholder="Prijs"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="border-slate-200 bg-white"
                      />
                      {btwRegion !== 'geen' && (
                        <select
                          value={item.btw}
                          onChange={(e) => updateItem(item.id, 'btw', parseFloat(e.target.value))}
                          className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                        >
                          {currentBtwRates.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      <div className="h-10 px-3 rounded-md bg-slate-100 flex items-center justify-end text-sm font-medium text-slate-700">
                        {formatCurrency(item.quantity * item.price, currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="xl:col-span-7 print:col-span-1">
            <div className="sticky top-24 print:relative print:top-0">
              <div className="flex items-center justify-between mb-3 print:hidden">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-medium text-slate-600">Live Preview</span>
                </div>
                <span className="text-xs text-slate-400">Automatisch bijgewerkt</span>
              </div>
              
              {/* Invoice Preview - Exact Match Reference Design */}
              <div 
                ref={invoiceRef}
                className="invoice-preview-container bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none"
                style={{ minHeight: '800px', position: 'relative' }}
              >
                {/* Top Right Geometric Shapes */}
                <div className="absolute top-0 right-0" style={{ width: '280px', height: '200px', overflow: 'hidden' }}>
                  {/* Navy triangle background */}
                  <div 
                    className="absolute"
                    style={{ 
                      width: '300px',
                      height: '220px',
                      top: '-20px',
                      right: '-20px',
                      backgroundColor: currentTemplate.secondaryColor,
                      clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
                    }}
                  />
                  {/* Primary color triangle on top */}
                  <div 
                    className="absolute"
                    style={{ 
                      width: '200px',
                      height: '160px',
                      top: '-10px',
                      right: '-10px',
                      backgroundColor: currentTemplate.primaryColor,
                      clipPath: 'polygon(100% 0, 30% 0, 100% 80%)'
                    }}
                  />
                </div>

                {/* Main Content Area */}
                <div className="relative z-10 p-8">
                  
                  {/* Header: Logo + Company Info */}
                  <div className="flex items-start gap-4 mb-6">
                    {/* Logo Circle */}
                    {logo ? (
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center p-1"
                        style={{ backgroundColor: currentTemplate.primaryColor }}
                      >
                        <img src={logo} alt="Logo" className="max-h-10 max-w-10 object-contain rounded-full" />
                      </div>
                    ) : company.name ? (
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: currentTemplate.primaryColor }}
                      >
                        <span className="text-lg font-bold text-white">
                          {company.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: currentTemplate.primaryColor }}
                      >
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-bold text-slate-800">{company.name || 'Vector Arts'}</h1>
                      <p className="text-sm text-slate-500 italic">{company.city || 'Your Satisfaction My Success'}</p>
                    </div>
                  </div>

                  {/* INVOICE Title - Centered and Prominent */}
                  <div className="text-center mb-8">
                    <h2 
                      className="text-4xl font-black tracking-wider uppercase"
                      style={{ color: currentTemplate.secondaryColor }}
                    >
                      {documentType === 'factuur' ? 'FACTUUR' : 'OFFERTE'}
                    </h2>
                  </div>

                  {/* Invoice Details Row */}
                  <div className="flex justify-between mb-8">
                    {/* Invoice To */}
                    <div>
                      <p 
                        className="text-xs font-bold uppercase tracking-wider mb-2"
                        style={{ color: currentTemplate.primaryColor }}
                      >
                        Factuur aan:
                      </p>
                      <p className="font-semibold text-slate-800">{customer.name || 'Klantnaam'}</p>
                      {customer.address && <p className="text-sm text-slate-600">{customer.address}</p>}
                      {customer.city && <p className="text-sm text-slate-600">{customer.city}</p>}
                    </div>
                    
                    {/* Invoice Number & Dates */}
                    <div className="text-right">
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase">Factuur Nr:</p>
                        <p className="font-bold text-slate-800">{invoiceDetails.number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Datum:</p>
                        <p className="text-sm text-slate-700">{new Date(invoiceDetails.date).toLocaleDateString('nl-NL')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-8">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: currentTemplate.primaryColor }}>
                          <th className="text-left py-3 px-4 text-xs font-bold text-white uppercase">Omschrijving</th>
                          <th className="text-right py-3 px-3 text-xs font-bold text-white uppercase w-24">Prijs</th>
                          <th className="text-center py-3 px-3 text-xs font-bold text-white uppercase w-20">Aantal</th>
                          {btwRegion !== 'geen' && <th className="text-center py-3 px-2 text-xs font-bold text-white uppercase w-16">BTW</th>}
                          <th className="text-right py-3 px-4 text-xs font-bold text-white uppercase w-28">Totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr 
                            key={item.id} 
                            style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F6F6F6' }}
                          >
                            <td className="py-3 px-4 text-sm text-slate-700">{item.description || 'Product/Dienst'}</td>
                            <td className="py-3 px-3 text-sm text-slate-600 text-right">{formatCurrency(item.price, currency)}</td>
                            <td className="py-3 px-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                            {btwRegion !== 'geen' && <td className="py-3 px-2 text-sm text-slate-600 text-center">{item.btw}%</td>}
                            <td className="py-3 px-4 text-sm font-semibold text-slate-800 text-right">
                              {formatCurrency(item.quantity * item.price, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Terms & Totals Section */}
                  <div className="flex justify-between gap-8 mb-8">
                    {/* Terms & Conditions */}
                    <div className="flex-1">
                      <p 
                        className="text-xs font-bold uppercase tracking-wider mb-2"
                        style={{ color: currentTemplate.primaryColor }}
                      >
                        Betalingsvoorwaarden:
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Betaling binnen {Math.ceil((new Date(invoiceDetails.due_date) - new Date(invoiceDetails.date)) / (1000 * 60 * 60 * 24))} dagen na factuurdatum.
                        {company.iban && ` Gelieve over te maken naar ${company.iban}.`}
                      </p>
                      
                      {company.bank_name && (
                        <div className="mt-4">
                          <p 
                            className="text-xs font-bold uppercase tracking-wider mb-1"
                            style={{ color: currentTemplate.primaryColor }}
                          >
                            Bankgegevens:
                          </p>
                          <p className="text-xs text-slate-600">{company.bank_name}</p>
                          {company.iban && <p className="text-xs text-slate-600">{company.iban}</p>}
                        </div>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="w-56">
                      <div className="space-y-1">
                        <div className="flex justify-between py-1">
                          <span className="text-sm text-slate-600">Subtotaal</span>
                          <span className="text-sm text-slate-800">{formatCurrency(calculateSubtotal(), currency)}</span>
                        </div>
                        {btwRegion !== 'geen' && (
                          <div className="flex justify-between py-1">
                            <span className="text-sm text-slate-600">BTW</span>
                            <span className="text-sm text-slate-800">{formatCurrency(calculateBTW(), currency)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* GRAND TOTAL Bar */}
                      <div 
                        className="flex justify-between items-center py-3 px-4 mt-3 text-white"
                        style={{ backgroundColor: currentTemplate.primaryColor }}
                      >
                        <span className="text-xs font-bold uppercase">Totaal</span>
                        <span className="text-lg font-bold">{formatCurrency(calculateTotal(), currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div className="text-center mb-8">
                    <div className="inline-block">
                      <div className="w-40 border-b-2 border-slate-300 mb-2"></div>
                      <p className="text-sm font-semibold text-slate-700">{company.name || 'Uw Naam'}</p>
                      <p className="text-xs text-slate-500 uppercase">Handtekening</p>
                    </div>
                  </div>

                  {/* Contact Info with Icons */}
                  <div className="flex justify-center gap-8 text-xs text-slate-600">
                    {company.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" style={{ color: currentTemplate.primaryColor }} />
                        <span>{company.email}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" style={{ color: currentTemplate.primaryColor }} />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" style={{ color: currentTemplate.primaryColor }} />
                        <span>{company.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Right Geometric Shapes (mirrored) */}
                <div className="absolute bottom-0 right-0" style={{ width: '200px', height: '120px', overflow: 'hidden' }}>
                  {/* Navy triangle */}
                  <div 
                    className="absolute"
                    style={{ 
                      width: '220px',
                      height: '140px',
                      bottom: '-20px',
                      right: '-20px',
                      backgroundColor: currentTemplate.secondaryColor,
                      clipPath: 'polygon(100% 100%, 100% 20%, 20% 100%)'
                    }}
                  />
                  {/* Primary color accent */}
                  <div 
                    className="absolute"
                    style={{ 
                      width: '140px',
                      height: '100px',
                      bottom: '-10px',
                      right: '-10px',
                      backgroundColor: currentTemplate.primaryColor,
                      clipPath: 'polygon(100% 100%, 100% 40%, 50% 100%)'
                    }}
                  />
                </div>

                {/* Bottom Left Geometric Shape */}
                <div className="absolute bottom-0 left-0" style={{ width: '150px', height: '100px', overflow: 'hidden' }}>
                  <div 
                    className="absolute"
                    style={{ 
                      width: '160px',
                      height: '110px',
                      bottom: '-10px',
                      left: '-10px',
                      backgroundColor: currentTemplate.primaryColor,
                      clipPath: 'polygon(0 100%, 0 40%, 80% 100%)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style>{`
        @media print {
          body * { 
            visibility: hidden; 
          }
          .invoice-preview-container,
          .invoice-preview-container * { 
            visibility: visible; 
          }
          .invoice-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden { 
            display: none !important; 
          }
        }
      `}</style>
    </div>
  );
}
