import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Download, Printer, Upload, 
  Calendar, X, Eye, ChevronDown, Save, Send
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Currency configurations
const currencies = [
  { code: 'SRD', symbol: 'SRD', name: 'Surinaamse Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' }
];

// BTW configurations
const btwOptions = [
  { id: 'geen', label: 'Geen BTW', rates: [{ value: 0, label: '0%' }] },
  { id: 'sr', label: 'Suriname', rates: [{ value: 10, label: '10%' }, { value: 0, label: '0%' }] },
  { id: 'nl', label: 'Nederland', rates: [{ value: 21, label: '21%' }, { value: 9, label: '9%' }, { value: 0, label: '0%' }] }
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
    number: `${new Date().getFullYear()}-001`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  const currentBtwRates = btwOptions.find(b => b.id === btwRegion)?.rates || btwOptions[0].rates;
  
  const [items, setItems] = useState([
    { id: 1, description: '', reference: '', quantity: 1, price: 0, btw: currentBtwRates[0].value }
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
      id: Date.now(), description: '', reference: '', quantity: 1, price: 0, btw: currentBtwRates[0].value
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

  // Preview mode
  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-100 print:bg-white">
        <div className="bg-white border-b border-gray-200 print:hidden">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <button 
              onClick={() => setShowPreview(false)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
            >
              ← Terug naar editor
            </button>
            <div className="flex gap-2">
              <button
                onClick={generatePDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto py-8 px-4 print:p-0 print:max-w-none">
          <div 
            ref={invoiceRef}
            className="bg-white shadow-lg print:shadow-none"
            style={{ minHeight: '297mm', padding: '15mm' }}
          >
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-600">
              <div>
                {logo ? (
                  <img src={logo} alt="Logo" className="h-16 mb-3" />
                ) : company.name && (
                  <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl mb-3">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h1 className="text-xl font-bold text-gray-900">{company.name || 'Uw Bedrijf'}</h1>
                <div className="text-sm text-gray-600 mt-1">
                  {company.address && <p>{company.address}</p>}
                  {(company.postcode || company.city) && <p>{company.postcode} {company.city}</p>}
                  {company.phone && <p>{company.phone}</p>}
                  {company.email && <p>{company.email}</p>}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-blue-600 uppercase">{documentType}</h2>
                <p className="text-lg font-mono text-gray-700 mt-1">#{invoiceDetails.number}</p>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Datum: {new Date(invoiceDetails.date).toLocaleDateString('nl-NL')}</p>
                  <p>Vervaldatum: {new Date(invoiceDetails.due_date).toLocaleDateString('nl-NL')}</p>
                </div>
              </div>
            </div>
            
            {/* Customer */}
            <div className="mb-8">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Factuuradres</p>
              <p className="font-semibold text-gray-900">{customer.name || 'Klantnaam'}</p>
              {customer.address && <p className="text-gray-600">{customer.address}</p>}
              {(customer.postcode || customer.city) && <p className="text-gray-600">{customer.postcode} {customer.city}</p>}
            </div>
            
            {/* Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-blue-600 text-white text-sm">
                  <th className="text-left py-3 px-4 font-medium">Omschrijving</th>
                  <th className="text-center py-3 px-3 font-medium w-20">Aantal</th>
                  <th className="text-right py-3 px-3 font-medium w-28">Prijs</th>
                  {btwRegion !== 'geen' && <th className="text-center py-3 px-3 font-medium w-16">BTW</th>}
                  <th className="text-right py-3 px-4 font-medium w-28">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4 text-sm">{item.description || '-'}</td>
                    <td className="py-3 px-3 text-sm text-center">{item.quantity}</td>
                    <td className="py-3 px-3 text-sm text-right">{formatCurrency(item.price, currency)}</td>
                    {btwRegion !== 'geen' && <td className="py-3 px-3 text-sm text-center">{item.btw}%</td>}
                    <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(item.quantity * item.price, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600">Subtotaal</span>
                  <span>{formatCurrency(calculateSubtotal(), currency)}</span>
                </div>
                {btwRegion !== 'geen' && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">BTW</span>
                    <span>{formatCurrency(calculateBTW(), currency)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-blue-600 mt-2">
                  <span>Totaal</span>
                  <span className="text-blue-600">{formatCurrency(calculateTotal(), currency)}</span>
                </div>
              </div>
            </div>
            
            {/* Bank Info */}
            {(company.bank_name || company.iban) && (
              <div className="border-t border-gray-200 pt-6 text-sm text-gray-600">
                <p className="font-semibold text-gray-900 mb-2">Betalingsgegevens</p>
                {company.bank_name && <p>Bank: {company.bank_name}</p>}
                {company.iban && <p>IBAN: {company.iban}</p>}
                <p className="mt-2 text-xs text-gray-400">Gelieve het factuurnummer te vermelden bij betaling.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Editor mode
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <a href="/" className="text-blue-600 font-semibold text-lg">Facturatie.sr</a>
              <div className="h-6 w-px bg-gray-200"></div>
              <span className="text-gray-600 text-sm">Factuur maken</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Voorbeeld
              </button>
              <button
                onClick={generatePDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Document Settings Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Document Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Type:</span>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="factuur">Factuur</option>
                <option value="offerte">Offerte</option>
              </select>
            </div>
            
            {/* Invoice Number */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Nummer:</span>
              <input
                type="text"
                value={invoiceDetails.number}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, number: e.target.value})}
                className="h-9 w-28 px-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Currency */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Valuta:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            
            {/* BTW Region */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">BTW:</span>
              <select
                value={btwRegion}
                onChange={(e) => handleBtwRegionChange(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {btwOptions.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>
            
            {/* Dates */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Datum:</span>
              <input
                type="date"
                value={invoiceDetails.date}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Vervaldatum:</span>
              <input
                type="date"
                value={invoiceDetails.due_date}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, due_date: e.target.value})}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Uw gegevens</h3>
              </div>
              <div className="p-4 space-y-3">
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                {logo ? (
                  <div className="relative inline-block mb-3">
                    <img src={logo} alt="Logo" className="h-12" />
                    <button onClick={() => setLogo(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">
                      <X className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-3"
                  >
                    <Upload className="w-4 h-4" /> Logo uploaden
                  </button>
                )}
                <input
                  placeholder="Bedrijfsnaam *"
                  value={company.name}
                  onChange={(e) => setCompany({...company, name: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  placeholder="Adres"
                  value={company.address}
                  onChange={(e) => setCompany({...company, address: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Postcode"
                    value={company.postcode}
                    onChange={(e) => setCompany({...company, postcode: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Plaats"
                    value={company.city}
                    onChange={(e) => setCompany({...company, city: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Telefoon"
                    value={company.phone}
                    onChange={(e) => setCompany({...company, phone: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    placeholder="E-mail"
                    value={company.email}
                    onChange={(e) => setCompany({...company, email: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="KvK nummer"
                    value={company.kvk}
                    onChange={(e) => setCompany({...company, kvk: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    placeholder="BTW nummer"
                    value={company.btw_number}
                    onChange={(e) => setCompany({...company, btw_number: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Bank"
                    value={company.bank_name}
                    onChange={(e) => setCompany({...company, bank_name: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    placeholder="IBAN"
                    value={company.iban}
                    onChange={(e) => setCompany({...company, iban: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Klant</h3>
              </div>
              <div className="p-4 space-y-3">
                <input
                  placeholder="Klantnaam / Bedrijf *"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  placeholder="Adres"
                  value={customer.address}
                  onChange={(e) => setCustomer({...customer, address: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Postcode"
                    value={customer.postcode}
                    onChange={(e) => setCustomer({...customer, postcode: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Plaats"
                    value={customer.city}
                    onChange={(e) => setCustomer({...customer, city: e.target.value})}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Regels</h3>
                <button
                  onClick={addItem}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Regel toevoegen
                </button>
              </div>
              
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className={`grid ${btwRegion !== 'geen' ? 'grid-cols-12' : 'grid-cols-10'} gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase`}>
                  <div className={btwRegion !== 'geen' ? 'col-span-5' : 'col-span-5'}>Omschrijving</div>
                  <div className="col-span-2 text-center">Aantal</div>
                  <div className="col-span-2 text-right">Prijs excl.</div>
                  {btwRegion !== 'geen' && <div className="col-span-1 text-center">BTW</div>}
                  <div className={btwRegion !== 'geen' ? 'col-span-1' : 'col-span-1'} >Totaal</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
              
              {/* Items */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className={`grid ${btwRegion !== 'geen' ? 'grid-cols-12' : 'grid-cols-10'} gap-2 px-4 py-3 items-center`}>
                    <div className={btwRegion !== 'geen' ? 'col-span-5' : 'col-span-5'}>
                      <input
                        placeholder="Omschrijving product of dienst"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full h-9 px-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full h-9 px-2 border border-gray-300 rounded text-sm text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full h-9 px-2 border border-gray-300 rounded text-sm text-right"
                      />
                    </div>
                    {btwRegion !== 'geen' && (
                      <div className="col-span-1">
                        <select
                          value={item.btw}
                          onChange={(e) => updateItem(item.id, 'btw', parseFloat(e.target.value))}
                          className="w-full h-9 px-1 border border-gray-300 rounded text-sm"
                        >
                          {currentBtwRates.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={`${btwRegion !== 'geen' ? 'col-span-1' : 'col-span-1'} text-right text-sm font-medium text-gray-700`}>
                      {formatCurrency(item.quantity * item.price, currency)}
                    </div>
                    <div className="col-span-1 text-center">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="max-w-xs ml-auto">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">Subtotaal</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal(), currency)}</span>
                  </div>
                  {btwRegion !== 'geen' && (
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">BTW</span>
                      <span className="font-medium">{formatCurrency(calculateBTW(), currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 text-lg font-bold border-t border-gray-300 mt-2">
                    <span>Totaal</span>
                    <span className="text-blue-600">{formatCurrency(calculateTotal(), currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
