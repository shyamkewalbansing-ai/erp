import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Download, Printer, Upload, 
  Building2, User, Phone, Mail, CreditCard, Calendar,
  Receipt, X, Check, Palette, ChevronRight, Globe,
  Sparkles, Layout, Layers
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Currency configurations
const currencies = {
  SRD: { symbol: 'SRD', name: 'Surinaamse Dollar', locale: 'nl-SR' },
  EUR: { symbol: '€', name: 'Euro', locale: 'nl-NL' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' }
};

// BTW configurations
const btwOptions = {
  NL: [
    { value: 21, label: '21%' },
    { value: 9, label: '9%' },
    { value: 0, label: '0%' }
  ],
  SR: [
    { value: 10, label: '10%' },
    { value: 0, label: '0%' }
  ]
};

// Invoice Templates
const templates = [
  { 
    id: 'modern', 
    name: 'Modern', 
    description: 'Strak en minimalistisch',
    colors: { primary: '#10b981', secondary: '#059669', accent: '#d1fae5' }
  },
  { 
    id: 'professional', 
    name: 'Professioneel', 
    description: 'Klassiek zakelijk',
    colors: { primary: '#1e40af', secondary: '#1e3a8a', accent: '#dbeafe' }
  },
  { 
    id: 'elegant', 
    name: 'Elegant', 
    description: 'Luxe uitstraling',
    colors: { primary: '#7c3aed', secondary: '#6d28d9', accent: '#ede9fe' }
  },
  { 
    id: 'bold', 
    name: 'Bold', 
    description: 'Opvallend en modern',
    colors: { primary: '#dc2626', secondary: '#b91c1c', accent: '#fee2e2' }
  },
  { 
    id: 'minimal', 
    name: 'Minimaal', 
    description: 'Zwart-wit clean',
    colors: { primary: '#18181b', secondary: '#27272a', accent: '#f4f4f5' }
  }
];

const formatCurrency = (amount, currency) => {
  const config = currencies[currency];
  if (currency === 'SRD') {
    return `SRD ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Modern Template Component
const ModernTemplate = ({ data, template, currency, formatCurrency }) => {
  const colors = templates.find(t => t.id === template)?.colors || templates[0].colors;
  
  return (
    <div className="bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header with colored bar */}
      <div className="h-2" style={{ backgroundColor: colors.primary }}></div>
      
      <div className="p-8">
        {/* Top Section */}
        <div className="flex justify-between items-start mb-10">
          <div>
            {data.logo ? (
              <img src={data.logo} alt="Logo" className="h-14 mb-4 object-contain" />
            ) : (
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-white font-bold text-xl"
                style={{ backgroundColor: colors.primary }}
              >
                {data.company.name ? data.company.name.substring(0, 2).toUpperCase() : 'CO'}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{data.company.name || 'Uw Bedrijf'}</h1>
            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
              {data.company.address && <p>{data.company.address}</p>}
              {(data.company.postcode || data.company.city) && (
                <p>{data.company.postcode} {data.company.city}</p>
              )}
              {data.company.country && <p>{data.company.country}</p>}
            </div>
          </div>
          
          <div className="text-right">
            <div 
              className="inline-block px-6 py-2 rounded-full text-white font-semibold text-sm uppercase tracking-wider"
              style={{ backgroundColor: colors.primary }}
            >
              {data.documentType}
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-4">#{data.invoiceDetails.number}</p>
          </div>
        </div>
        
        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="p-4 rounded-xl" style={{ backgroundColor: colors.accent }}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Aan</p>
            <p className="font-semibold text-gray-900">{data.customer.name || 'Klantnaam'}</p>
            <div className="text-sm text-gray-600 mt-1">
              {data.customer.address && <p>{data.customer.address}</p>}
              {(data.customer.postcode || data.customer.city) && (
                <p>{data.customer.postcode} {data.customer.city}</p>
              )}
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Datum</p>
            <p className="font-semibold text-gray-900">
              {new Date(data.invoiceDetails.date).toLocaleDateString('nl-NL', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {data.documentType === 'factuur' ? 'Vervaldatum' : 'Geldig tot'}
            </p>
            <p className="font-semibold text-gray-900">
              {new Date(data.invoiceDetails.due_date).toLocaleDateString('nl-NL', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </p>
          </div>
        </div>
        
        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.accent }}>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-l-lg">Omschrijving</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Aantal</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Prijs</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">BTW</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-r-lg">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-900">{item.description || 'Product/Dienst'}</p>
                  </td>
                  <td className="py-4 px-4 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-4 px-4 text-right text-gray-600">{formatCurrency(item.price, currency)}</td>
                  <td className="py-4 px-4 text-center text-gray-600">{item.btw}%</td>
                  <td className="py-4 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(item.quantity * item.price, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Totals */}
        <div className="flex justify-end mb-10">
          <div className="w-72">
            <div className="flex justify-between py-2 text-gray-600">
              <span>Subtotaal</span>
              <span>{formatCurrency(data.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between py-2 text-gray-600">
              <span>BTW</span>
              <span>{formatCurrency(data.btw, currency)}</span>
            </div>
            <div 
              className="flex justify-between py-4 px-4 mt-2 rounded-xl text-white font-bold text-lg"
              style={{ backgroundColor: colors.primary }}
            >
              <span>Totaal</span>
              <span>{formatCurrency(data.total, currency)}</span>
            </div>
          </div>
        </div>
        
        {/* Notes */}
        {data.notes && (
          <div className="p-4 rounded-xl bg-gray-50 mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Opmerkingen</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p>
          </div>
        )}
        
        {/* Bank Details */}
        {(data.company.bank_name || data.company.iban) && (
          <div className="border-t border-gray-200 pt-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Betalingsgegevens</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {data.company.bank_name && (
                <div>
                  <p className="text-gray-500">Bank</p>
                  <p className="font-medium text-gray-900">{data.company.bank_name}</p>
                </div>
              )}
              {data.company.iban && (
                <div>
                  <p className="text-gray-500">IBAN</p>
                  <p className="font-medium text-gray-900">{data.company.iban}</p>
                </div>
              )}
              {data.company.bic && (
                <div>
                  <p className="text-gray-500">BIC/SWIFT</p>
                  <p className="font-medium text-gray-900">{data.company.bic}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center text-sm text-gray-400">
          <div className="flex items-center gap-4">
            {data.company.phone && <span>📞 {data.company.phone}</span>}
            {data.company.email && <span>✉️ {data.company.email}</span>}
          </div>
          {data.company.kvk && <span>KvK: {data.company.kvk}</span>}
        </div>
      </div>
      
      {/* Bottom colored bar */}
      <div className="h-2" style={{ backgroundColor: colors.primary }}></div>
    </div>
  );
};

export default function PublicInvoiceGenerator() {
  const invoiceRef = useRef(null);
  const [documentType, setDocumentType] = useState('factuur');
  const [currency, setCurrency] = useState('SRD');
  const [btwRegion, setBtwRegion] = useState('SR');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [activeTab, setActiveTab] = useState('details'); // details, items, preview
  
  const [company, setCompany] = useState({
    name: '', address: '', postcode: '', city: '', country: '',
    phone: '', email: '', kvk: '', btw_number: '', iban: '', bank_name: '', bic: ''
  });
  
  const [logo, setLogo] = useState(null);
  const logoInputRef = useRef(null);
  
  const [customer, setCustomer] = useState({
    name: '', address: '', postcode: '', city: '', country: '', email: ''
  });
  
  const [invoiceDetails, setInvoiceDetails] = useState({
    number: `FAC-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: ''
  });
  
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, btw: btwOptions[btwRegion][0].value }
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
      id: Date.now(), description: '', quantity: 1, price: 0, btw: btwOptions[btwRegion][0].value
    }]);
  };
  
  const removeItem = (id) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
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
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
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
    window.print();
  };
  
  const handleDocumentTypeChange = (type) => {
    setDocumentType(type);
    setInvoiceDetails(prev => ({
      ...prev,
      number: `${type === 'factuur' ? 'FAC' : 'OFF'}-${new Date().getFullYear()}-001`
    }));
  };
  
  const handleBtwRegionChange = (region) => {
    setBtwRegion(region);
    setItems(items.map(item => ({ ...item, btw: btwOptions[region][0].value })));
  };

  const templateData = {
    logo, company, customer, invoiceDetails, items, notes, documentType,
    subtotal: calculateSubtotal(), btw: calculateBTW(), total: calculateTotal()
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Factuur Generator</h1>
                <p className="text-xs text-gray-400">Maak professionele documenten</p>
              </div>
            </div>
            <a 
              href="/" 
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              Facturatie.sr
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 print:p-0 print:max-w-none">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 print:block">
          
          {/* Left Panel - Controls */}
          <div className="xl:col-span-2 space-y-6 print:hidden">
            
            {/* Template Selection */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="font-semibold">Kies Template</h2>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`group relative p-3 rounded-xl border-2 transition-all ${
                      selectedTemplate === t.id
                        ? 'border-white bg-white/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div 
                      className="w-full h-8 rounded-lg mb-2"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                    <p className="text-xs font-medium truncate">{t.name}</p>
                    {selectedTemplate === t.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Document Type & Settings */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Layout className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="font-semibold">Document Instellingen</h2>
              </div>
              
              <div className="space-y-4">
                {/* Document Type */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDocumentTypeChange('factuur')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      documentType === 'factuur'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-white/10 hover:border-white/30 text-gray-400'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span className="text-sm font-medium">Factuur</span>
                  </button>
                  <button
                    onClick={() => handleDocumentTypeChange('offerte')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      documentType === 'offerte'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-white/10 hover:border-white/30 text-gray-400'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Offerte</span>
                  </button>
                </div>
                
                {/* Currency */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Valuta</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(currencies).map(([code, config]) => (
                      <button
                        key={code}
                        onClick={() => setCurrency(code)}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          currency === code
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-white/10 hover:border-white/30 text-gray-400'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* BTW Region */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">BTW Regio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleBtwRegionChange('SR')}
                      className={`p-2 rounded-lg border text-sm transition-all ${
                        btwRegion === 'SR'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 hover:border-white/30 text-gray-400'
                      }`}
                    >
                      🇸🇷 Suriname
                    </button>
                    <button
                      onClick={() => handleBtwRegionChange('NL')}
                      className={`p-2 rounded-lg border text-sm transition-all ${
                        btwRegion === 'NL'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 hover:border-white/30 text-gray-400'
                      }`}
                    >
                      🇳🇱 Nederland
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Logo */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-pink-400" />
                </div>
                <h2 className="font-semibold">Logo</h2>
              </div>
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              {logo ? (
                <div className="relative group">
                  <img src={logo} alt="Logo" className="h-16 mx-auto rounded-lg" />
                  <button
                    onClick={() => setLogo(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                >
                  <Upload className="w-6 h-6 mx-auto text-gray-500 group-hover:text-emerald-400 mb-2" />
                  <span className="text-sm text-gray-500 group-hover:text-gray-300">Upload logo</span>
                </button>
              )}
            </div>
            
            {/* Company Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="font-semibold">Uw Gegevens</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Bedrijfsnaam *"
                  value={company.name}
                  onChange={(e) => setCompany({...company, name: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="Adres"
                  value={company.address}
                  onChange={(e) => setCompany({...company, address: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Postcode"
                    value={company.postcode}
                    onChange={(e) => setCompany({...company, postcode: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                  <Input
                    placeholder="Plaats"
                    value={company.city}
                    onChange={(e) => setCompany({...company, city: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Telefoon"
                    value={company.phone}
                    onChange={(e) => setCompany({...company, phone: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                  <Input
                    placeholder="E-mail"
                    value={company.email}
                    onChange={(e) => setCompany({...company, email: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="KvK nummer"
                    value={company.kvk}
                    onChange={(e) => setCompany({...company, kvk: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                  <Input
                    placeholder="BTW-nummer"
                    value={company.btw_number}
                    onChange={(e) => setCompany({...company, btw_number: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Bank Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-yellow-400" />
                </div>
                <h2 className="font-semibold">Bankgegevens</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Bank naam"
                  value={company.bank_name}
                  onChange={(e) => setCompany({...company, bank_name: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="IBAN / Rekeningnummer"
                  value={company.iban}
                  onChange={(e) => setCompany({...company, iban: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
            
            {/* Customer Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <h2 className="font-semibold">Klantgegevens</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Klantnaam / Bedrijf *"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <Input
                  placeholder="Adres"
                  value={customer.address}
                  onChange={(e) => setCustomer({...customer, address: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Postcode"
                    value={customer.postcode}
                    onChange={(e) => setCustomer({...customer, postcode: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                  <Input
                    placeholder="Plaats"
                    value={customer.city}
                    onChange={(e) => setCustomer({...customer, city: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Invoice Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-400" />
                </div>
                <h2 className="font-semibold">{documentType === 'factuur' ? 'Factuur' : 'Offerte'} Details</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Nummer"
                  value={invoiceDetails.number}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, number: e.target.value})}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Datum</label>
                    <Input
                      type="date"
                      value={invoiceDetails.date}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      {documentType === 'factuur' ? 'Vervaldatum' : 'Geldig tot'}
                    </label>
                    <Input
                      type="date"
                      value={invoiceDetails.due_date}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, due_date: e.target.value})}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Items */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h2 className="font-semibold">Producten / Diensten</h2>
                </div>
                <button
                  onClick={addItem}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Toevoegen
                </button>
              </div>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 bg-white/5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Item {index + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Omschrijving"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Aantal</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Prijs</label>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">BTW</label>
                        <select
                          value={item.btw}
                          onChange={(e) => updateItem(item.id, 'btw', parseFloat(e.target.value))}
                          className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                        >
                          {btwOptions[btwRegion].map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-gray-400">Subtotaal: </span>
                      <span className="text-white font-medium">{formatCurrency(item.quantity * item.price, currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notes */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <h2 className="font-semibold mb-4">Opmerkingen</h2>
              <textarea
                placeholder="Betalingsvoorwaarden, opmerkingen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={generatePDF}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 h-12 text-white font-medium"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1 h-12 border-white/20 text-white hover:bg-white/10"
              >
                <Printer className="w-5 h-5 mr-2" />
                Printen
              </Button>
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="xl:col-span-3 print:col-span-1">
            <div className="sticky top-24 print:relative print:top-0">
              <div className="flex items-center justify-between mb-4 print:hidden">
                <h2 className="font-semibold text-gray-300">Live Preview</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Automatisch bijgewerkt
                </div>
              </div>
              
              <div 
                ref={invoiceRef}
                className="rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none"
                style={{ minHeight: '842px' }}
              >
                <ModernTemplate 
                  data={templateData} 
                  template={selectedTemplate}
                  currency={currency}
                  formatCurrency={formatCurrency}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-preview, #invoice-preview * { visibility: visible; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
