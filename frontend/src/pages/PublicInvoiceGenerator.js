import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Download, Printer, Upload, 
  Building2, User, Phone, Mail, CreditCard, Calendar,
  Receipt, X, Check
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
    { value: 21, label: '21% (Standaard)' },
    { value: 9, label: '9% (Laag tarief)' },
    { value: 0, label: '0% (Vrijgesteld)' }
  ],
  SR: [
    { value: 10, label: '10% (Standaard)' },
    { value: 0, label: '0% (Vrijgesteld)' }
  ]
};

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

export default function PublicInvoiceGenerator() {
  const invoiceRef = useRef(null);
  const [documentType, setDocumentType] = useState('factuur'); // factuur or offerte
  const [currency, setCurrency] = useState('SRD');
  const [btwRegion, setBtwRegion] = useState('SR'); // NL or SR
  
  // Company details
  const [company, setCompany] = useState({
    name: '',
    address: '',
    postcode: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    kvk: '',
    btw_number: '',
    iban: '',
    bank_name: '',
    bic: ''
  });
  
  // Logo
  const [logo, setLogo] = useState(null);
  const logoInputRef = useRef(null);
  
  // Customer details
  const [customer, setCustomer] = useState({
    name: '',
    address: '',
    postcode: '',
    city: '',
    country: '',
    email: ''
  });
  
  // Invoice details
  const [invoiceDetails, setInvoiceDetails] = useState({
    number: `${documentType === 'factuur' ? 'FAC' : 'OFF'}-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: ''
  });
  
  // Line items
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, btw: btwOptions[btwRegion][0].value }
  ]);
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo mag maximaal 2MB zijn');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Add new item
  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      description: '',
      quantity: 1,
      price: 0,
      btw: btwOptions[btwRegion][0].value
    }]);
  };
  
  // Remove item
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };
  
  // Update item
  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Calculate totals
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };
  
  const calculateBTW = () => {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      return sum + (itemTotal * item.btw / 100);
    }, 0);
  };
  
  const calculateTotal = () => {
    return calculateSubtotal() + calculateBTW();
  };
  
  // Generate PDF
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
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${documentType}-${invoiceDetails.number}.pdf`);
      
      toast.success('PDF succesvol gedownload!', { id: 'pdf' });
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Fout bij genereren PDF', { id: 'pdf' });
    }
  };
  
  // Print
  const handlePrint = () => {
    if (!company.name || !customer.name) {
      toast.error('Vul minimaal uw bedrijfsnaam en klantnaam in');
      return;
    }
    window.print();
  };
  
  // Update document number when type changes
  const handleDocumentTypeChange = (type) => {
    setDocumentType(type);
    setInvoiceDetails(prev => ({
      ...prev,
      number: `${type === 'factuur' ? 'FAC' : 'OFF'}-${new Date().getFullYear()}-001`
    }));
  };
  
  // Update BTW when region changes
  const handleBtwRegionChange = (region) => {
    setBtwRegion(region);
    setItems(items.map(item => ({
      ...item,
      btw: btwOptions[region][0].value
    })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gratis Factuur & Offerte Generator</h1>
                <p className="text-sm text-gray-500">Maak professionele documenten in enkele minuten</p>
              </div>
            </div>
            <a href="/" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
              ← Terug naar Facturatie.sr
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
          
          {/* Left Panel - Form */}
          <div className="lg:col-span-1 space-y-6 print:hidden">
            
            {/* Document Type */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Document Type</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDocumentTypeChange('factuur')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    documentType === 'factuur'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Receipt className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">Factuur</span>
                </button>
                <button
                  onClick={() => handleDocumentTypeChange('offerte')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    documentType === 'offerte'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">Offerte</span>
                </button>
              </div>
            </div>
            
            {/* Currency & BTW Region */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Valuta & BTW</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valuta</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(currencies).map(([code, config]) => (
                      <button
                        key={code}
                        onClick={() => setCurrency(code)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          currency === code
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {config.symbol}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BTW Regio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleBtwRegionChange('SR')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        btwRegion === 'SR'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      🇸🇷 Suriname
                    </button>
                    <button
                      onClick={() => handleBtwRegionChange('NL')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        btwRegion === 'NL'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      🇳🇱 Nederland
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Logo Upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Logo</h2>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              {logo ? (
                <div className="relative">
                  <img src={logo} alt="Logo" className="max-h-24 mx-auto rounded-lg" />
                  <button
                    onClick={() => setLogo(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Klik om logo te uploaden</span>
                </button>
              )}
            </div>
            
            {/* Company Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-500" />
                Uw Bedrijfsgegevens
              </h2>
              <div className="space-y-3">
                <Input
                  placeholder="Bedrijfsnaam *"
                  value={company.name}
                  onChange={(e) => setCompany({...company, name: e.target.value})}
                />
                <Input
                  placeholder="Adres"
                  value={company.address}
                  onChange={(e) => setCompany({...company, address: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Postcode"
                    value={company.postcode}
                    onChange={(e) => setCompany({...company, postcode: e.target.value})}
                  />
                  <Input
                    placeholder="Plaats"
                    value={company.city}
                    onChange={(e) => setCompany({...company, city: e.target.value})}
                  />
                </div>
                <Input
                  placeholder="Land"
                  value={company.country}
                  onChange={(e) => setCompany({...company, country: e.target.value})}
                />
                <Input
                  placeholder="Telefoon"
                  value={company.phone}
                  onChange={(e) => setCompany({...company, phone: e.target.value})}
                />
                <Input
                  placeholder="E-mail"
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany({...company, email: e.target.value})}
                />
                <Input
                  placeholder="KvK / Bedrijfsnummer"
                  value={company.kvk}
                  onChange={(e) => setCompany({...company, kvk: e.target.value})}
                />
                <Input
                  placeholder="BTW-nummer"
                  value={company.btw_number}
                  onChange={(e) => setCompany({...company, btw_number: e.target.value})}
                />
              </div>
            </div>
            
            {/* Bank Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Bankgegevens
              </h2>
              <div className="space-y-3">
                <Input
                  placeholder="Bank naam"
                  value={company.bank_name}
                  onChange={(e) => setCompany({...company, bank_name: e.target.value})}
                />
                <Input
                  placeholder="IBAN / Rekeningnummer"
                  value={company.iban}
                  onChange={(e) => setCompany({...company, iban: e.target.value})}
                />
                <Input
                  placeholder="BIC / SWIFT"
                  value={company.bic}
                  onChange={(e) => setCompany({...company, bic: e.target.value})}
                />
              </div>
            </div>
            
            {/* Customer Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                Klantgegevens
              </h2>
              <div className="space-y-3">
                <Input
                  placeholder="Klantnaam / Bedrijf *"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                />
                <Input
                  placeholder="Adres"
                  value={customer.address}
                  onChange={(e) => setCustomer({...customer, address: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Postcode"
                    value={customer.postcode}
                    onChange={(e) => setCustomer({...customer, postcode: e.target.value})}
                  />
                  <Input
                    placeholder="Plaats"
                    value={customer.city}
                    onChange={(e) => setCustomer({...customer, city: e.target.value})}
                  />
                </div>
                <Input
                  placeholder="Land"
                  value={customer.country}
                  onChange={(e) => setCustomer({...customer, country: e.target.value})}
                />
                <Input
                  placeholder="E-mail"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({...customer, email: e.target.value})}
                />
              </div>
            </div>
            
            {/* Invoice Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                {documentType === 'factuur' ? 'Factuur' : 'Offerte'} Details
              </h2>
              <div className="space-y-3">
                <Input
                  placeholder={`${documentType === 'factuur' ? 'Factuur' : 'Offerte'}nummer`}
                  value={invoiceDetails.number}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, number: e.target.value})}
                />
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Datum</label>
                  <Input
                    type="date"
                    value={invoiceDetails.date}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {documentType === 'factuur' ? 'Vervaldatum' : 'Geldig tot'}
                  </label>
                  <Input
                    type="date"
                    value={invoiceDetails.due_date}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, due_date: e.target.value})}
                  />
                </div>
                <Input
                  placeholder="Referentie / PO nummer"
                  value={invoiceDetails.reference}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, reference: e.target.value})}
                />
              </div>
            </div>
            
            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Opmerkingen</h2>
              <textarea
                placeholder="Betalingsvoorwaarden, opmerkingen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={generatePDF}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-12"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1 h-12"
              >
                <Printer className="w-5 h-5 mr-2" />
                Printen
              </Button>
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="lg:col-span-2 print:col-span-1">
            <div className="sticky top-24 print:relative print:top-0">
              <h2 className="font-semibold text-gray-900 mb-4 print:hidden">Preview</h2>
              
              {/* Invoice Preview */}
              <div 
                ref={invoiceRef}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 print:shadow-none print:border-0 print:rounded-none print:p-0"
                style={{ minHeight: '842px' }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    {logo ? (
                      <img src={logo} alt="Logo" className="max-h-16 mb-4" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900">
                      {company.name || 'Uw Bedrijfsnaam'}
                    </h1>
                    {company.address && <p className="text-gray-600">{company.address}</p>}
                    {(company.postcode || company.city) && (
                      <p className="text-gray-600">{company.postcode} {company.city}</p>
                    )}
                    {company.country && <p className="text-gray-600">{company.country}</p>}
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-bold text-emerald-600 uppercase">
                      {documentType}
                    </h2>
                    <p className="text-gray-600 mt-2">#{invoiceDetails.number}</p>
                  </div>
                </div>
                
                {/* Contact & Customer Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Van</h3>
                    <div className="text-gray-700 space-y-1">
                      {company.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {company.phone}</p>}
                      {company.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {company.email}</p>}
                      {company.kvk && <p className="text-sm">KvK: {company.kvk}</p>}
                      {company.btw_number && <p className="text-sm">BTW: {company.btw_number}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Aan</h3>
                    <div className="text-gray-700">
                      <p className="font-semibold">{customer.name || 'Klantnaam'}</p>
                      {customer.address && <p>{customer.address}</p>}
                      {(customer.postcode || customer.city) && (
                        <p>{customer.postcode} {customer.city}</p>
                      )}
                      {customer.country && <p>{customer.country}</p>}
                      {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="flex gap-8 mb-8 text-sm">
                  <div>
                    <span className="text-gray-500">Datum: </span>
                    <span className="font-medium">{new Date(invoiceDetails.date).toLocaleDateString('nl-NL')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{documentType === 'factuur' ? 'Vervaldatum' : 'Geldig tot'}: </span>
                    <span className="font-medium">{new Date(invoiceDetails.due_date).toLocaleDateString('nl-NL')}</span>
                  </div>
                  {invoiceDetails.reference && (
                    <div>
                      <span className="text-gray-500">Referentie: </span>
                      <span className="font-medium">{invoiceDetails.reference}</span>
                    </div>
                  )}
                </div>
                
                {/* Items Table */}
                <div className="mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 text-sm font-semibold text-gray-600">Omschrijving</th>
                        <th className="text-center py-3 text-sm font-semibold text-gray-600 w-20">Aantal</th>
                        <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">Prijs</th>
                        <th className="text-center py-3 text-sm font-semibold text-gray-600 w-20">BTW</th>
                        <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">Totaal</th>
                        <th className="w-10 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Omschrijving product/dienst"
                              className="w-full bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded print:bg-transparent"
                            />
                          </td>
                          <td className="py-3 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="1"
                              className="w-16 text-center bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded print:bg-transparent"
                            />
                          </td>
                          <td className="py-3 text-right">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-24 text-right bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded print:bg-transparent"
                            />
                          </td>
                          <td className="py-3 text-center">
                            <select
                              value={item.btw}
                              onChange={(e) => updateItem(item.id, 'btw', parseFloat(e.target.value))}
                              className="bg-transparent focus:outline-none focus:bg-gray-50 px-2 py-1 rounded print:bg-transparent text-sm"
                            >
                              {btwOptions[btwRegion].map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.value}%</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 text-right font-medium">
                            {formatCurrency(item.quantity * item.price, currency)}
                          </td>
                          <td className="py-3 text-center print:hidden">
                            {items.length > 1 && (
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <button
                    onClick={addItem}
                    className="mt-4 text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1 print:hidden"
                  >
                    <Plus className="w-4 h-4" />
                    Regel toevoegen
                  </button>
                </div>
                
                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Subtotaal</span>
                      <span>{formatCurrency(calculateSubtotal(), currency)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>BTW</span>
                      <span>{formatCurrency(calculateBTW(), currency)}</span>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-200 mt-2">
                      <span>Totaal</span>
                      <span className="text-emerald-600">{formatCurrency(calculateTotal(), currency)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                {notes && (
                  <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Opmerkingen</h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{notes}</p>
                  </div>
                )}
                
                {/* Bank Details */}
                {(company.bank_name || company.iban) && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Betalingsgegevens</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {company.bank_name && <p>Bank: {company.bank_name}</p>}
                      {company.iban && <p>IBAN: {company.iban}</p>}
                      {company.bic && <p>BIC/SWIFT: {company.bic}</p>}
                      <p className="mt-2 text-gray-500">
                        Gelieve het {documentType === 'factuur' ? 'factuur' : 'offerte'}nummer te vermelden bij betaling.
                      </p>
                    </div>
                  </div>
                )}
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
          #invoice-preview, #invoice-preview * {
            visibility: visible;
          }
          #invoice-preview {
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
