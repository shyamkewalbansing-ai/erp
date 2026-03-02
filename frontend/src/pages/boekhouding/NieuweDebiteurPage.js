import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../../lib/boekhoudingApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  Save,
  Building2,
  User
} from 'lucide-react';

// Tab Button Component - matches debiteuren page
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
      active 
        ? 'bg-emerald-600 text-white shadow-sm' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

const NieuweDebiteurPage = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basis');

  const [customer, setCustomer] = useState({
    naam: '',
    adres: '',
    plaats: '',
    postcode: '',
    land: 'Suriname',
    telefoon: '',
    email: '',
    btw_nummer: '',
    betalingstermijn: 30,
    kredietlimiet: 0,
    valuta: 'SRD',
    notities: ''
  });

  const handleSave = async () => {
    if (!customer.naam) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      await customersAPI.create(customer);
      toast.success('Debiteur succesvol aangemaakt');
      navigate('/app/boekhouding/debiteuren');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="nieuwe-debiteur-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Debiteurenbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/boekhouding/debiteuren')}
            className="rounded-lg text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar overzicht
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <TabButton active={activeSection === 'basis'} onClick={() => setActiveSection('basis')}>
            Basisgegevens
          </TabButton>
          <TabButton active={activeSection === 'contact'} onClick={() => setActiveSection('contact')}>
            Contactgegevens
          </TabButton>
          <TabButton active={activeSection === 'adres'} onClick={() => setActiveSection('adres')}>
            Adresgegevens
          </TabButton>
          <TabButton active={activeSection === 'betaling'} onClick={() => setActiveSection('betaling')}>
            Betalingsvoorwaarden
          </TabButton>
          
          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Opslaan
          </Button>
        </div>
      </div>

      {/* Filter/Info Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Type
            </Label>
            <Select defaultValue="bedrijf">
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bedrijf">Bedrijf</SelectItem>
                <SelectItem value="particulier">Particulier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Valuta</Label>
            <Select value={customer.valuta} onValueChange={(v) => setCustomer({...customer, valuta: v})}>
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
          
          <div className="space-y-1">
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <User className="w-4 h-4" />
              Verantwoordelijke
            </Label>
            <Select defaultValue="me">
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Huidige gebruiker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-right">
            <span className="text-sm text-gray-500">Status</span>
            <p className="text-sm font-medium text-emerald-600">Nieuw</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Form Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {activeSection === 'basis' && 'Basisgegevens invullen'}
                {activeSection === 'contact' && 'Contactgegevens invullen'}
                {activeSection === 'adres' && 'Adresgegevens invullen'}
                {activeSection === 'betaling' && 'Betalingsvoorwaarden instellen'}
              </span>
              <span className="text-xs text-gray-500">* Verplicht veld</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-6">
            {/* Basisgegevens */}
            {activeSection === 'basis' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Bedrijfsnaam / Naam *</Label>
                    <Input
                      value={customer.naam}
                      onChange={(e) => setCustomer({...customer, naam: e.target.value})}
                      placeholder="Voer de naam in"
                      className="rounded-lg"
                      data-testid="customer-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">BTW-nummer</Label>
                    <Input
                      value={customer.btw_nummer}
                      onChange={(e) => setCustomer({...customer, btw_nummer: e.target.value})}
                      placeholder="BTW123456789"
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Valuta</Label>
                    <Select value={customer.valuta} onValueChange={(v) => setCustomer({...customer, valuta: v})}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Notities</Label>
                  <Textarea
                    value={customer.notities}
                    onChange={(e) => setCustomer({...customer, notities: e.target.value})}
                    placeholder="Eventuele opmerkingen..."
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
              </div>
            )}

            {/* Contactgegevens */}
            {activeSection === 'contact' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Telefoon</Label>
                  <Input
                    value={customer.telefoon}
                    onChange={(e) => setCustomer({...customer, telefoon: e.target.value})}
                    placeholder="+597 123 4567"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">E-mail</Label>
                  <Input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({...customer, email: e.target.value})}
                    placeholder="info@bedrijf.sr"
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Adresgegevens */}
            {activeSection === 'adres' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Straat en huisnummer</Label>
                  <Input
                    value={customer.adres}
                    onChange={(e) => setCustomer({...customer, adres: e.target.value})}
                    placeholder="Domineestraat 1"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Postcode</Label>
                  <Input
                    value={customer.postcode}
                    onChange={(e) => setCustomer({...customer, postcode: e.target.value})}
                    placeholder="Postcode"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Plaats</Label>
                  <Input
                    value={customer.plaats}
                    onChange={(e) => setCustomer({...customer, plaats: e.target.value})}
                    placeholder="Paramaribo"
                    className="rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Land</Label>
                  <Select value={customer.land} onValueChange={(v) => setCustomer({...customer, land: v})}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Suriname">Suriname</SelectItem>
                      <SelectItem value="Nederland">Nederland</SelectItem>
                      <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                      <SelectItem value="Guyana">Guyana</SelectItem>
                      <SelectItem value="Frans-Guyana">Frans-Guyana</SelectItem>
                      <SelectItem value="Brazilië">Brazilië</SelectItem>
                      <SelectItem value="Overig">Overig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Betalingsvoorwaarden */}
            {activeSection === 'betaling' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Betalingstermijn</Label>
                  <Select 
                    value={String(customer.betalingstermijn)} 
                    onValueChange={(v) => setCustomer({...customer, betalingstermijn: parseInt(v)})}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Direct</SelectItem>
                      <SelectItem value="7">7 dagen</SelectItem>
                      <SelectItem value="14">14 dagen</SelectItem>
                      <SelectItem value="30">30 dagen</SelectItem>
                      <SelectItem value="60">60 dagen</SelectItem>
                      <SelectItem value="90">90 dagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Kredietlimiet ({customer.valuta})</Label>
                  <Input
                    type="number"
                    value={customer.kredietlimiet}
                    onChange={(e) => setCustomer({...customer, kredietlimiet: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Vul alle gegevens in en klik op Opslaan
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/boekhouding/debiteuren')}
                className="rounded-lg"
              >
                Annuleren
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Opslaan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NieuweDebiteurPage;
