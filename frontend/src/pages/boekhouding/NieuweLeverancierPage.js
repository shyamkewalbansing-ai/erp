import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { suppliersAPI } from '../../lib/boekhoudingApi';
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

// Tab Button Component
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
      active 
        ? 'bg-purple-600 text-white shadow-sm' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

const NieuweLeverancierPage = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basis');

  const [supplier, setSupplier] = useState({
    naam: '',
    adres: '',
    plaats: '',
    postcode: '',
    land: 'Suriname',
    telefoon: '',
    email: '',
    btw_nummer: '',
    betalingstermijn: 30,
    valuta: 'SRD',
    iban: '',
    kvk_nummer: '',
    notities: ''
  });

  const handleSave = async () => {
    if (!supplier.naam) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      await suppliersAPI.create(supplier);
      toast.success('Leverancier succesvol aangemaakt');
      navigate('/app/boekhouding/crediteuren');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="nieuwe-leverancier-page">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">Crediteurenbeheer</h1>
        </div>
      </div>

      {/* Tab Buttons Row */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/boekhouding/crediteuren')}
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
            Betalingsgegevens
          </TabButton>
          
          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="ml-auto bg-purple-600 hover:bg-purple-700 rounded-lg"
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
            <Select value={supplier.valuta} onValueChange={(v) => setSupplier({...supplier, valuta: v})}>
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
            <p className="text-sm font-medium text-purple-600">Nieuw</p>
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
                {activeSection === 'betaling' && 'Betalingsgegevens instellen'}
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
                      value={supplier.naam}
                      onChange={(e) => setSupplier({...supplier, naam: e.target.value})}
                      placeholder="Voer de naam in"
                      className="rounded-lg"
                      data-testid="supplier-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">BTW-nummer</Label>
                    <Input
                      value={supplier.btw_nummer}
                      onChange={(e) => setSupplier({...supplier, btw_nummer: e.target.value})}
                      placeholder="BTW123456789"
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">KvK-nummer</Label>
                    <Input
                      value={supplier.kvk_nummer}
                      onChange={(e) => setSupplier({...supplier, kvk_nummer: e.target.value})}
                      placeholder="12345678"
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Notities</Label>
                  <Textarea
                    value={supplier.notities}
                    onChange={(e) => setSupplier({...supplier, notities: e.target.value})}
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
                    value={supplier.telefoon}
                    onChange={(e) => setSupplier({...supplier, telefoon: e.target.value})}
                    placeholder="+597 123 4567"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">E-mail</Label>
                  <Input
                    type="email"
                    value={supplier.email}
                    onChange={(e) => setSupplier({...supplier, email: e.target.value})}
                    placeholder="info@leverancier.sr"
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
                    value={supplier.adres}
                    onChange={(e) => setSupplier({...supplier, adres: e.target.value})}
                    placeholder="Industrieweg 10"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Postcode</Label>
                  <Input
                    value={supplier.postcode}
                    onChange={(e) => setSupplier({...supplier, postcode: e.target.value})}
                    placeholder="Postcode"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Plaats</Label>
                  <Input
                    value={supplier.plaats}
                    onChange={(e) => setSupplier({...supplier, plaats: e.target.value})}
                    placeholder="Paramaribo"
                    className="rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Land</Label>
                  <Select value={supplier.land} onValueChange={(v) => setSupplier({...supplier, land: v})}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Suriname">Suriname</SelectItem>
                      <SelectItem value="Nederland">Nederland</SelectItem>
                      <SelectItem value="Verenigde Staten">Verenigde Staten</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="Guyana">Guyana</SelectItem>
                      <SelectItem value="Brazilië">Brazilië</SelectItem>
                      <SelectItem value="Overig">Overig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Betalingsgegevens */}
            {activeSection === 'betaling' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Betalingstermijn</Label>
                  <Select 
                    value={String(supplier.betalingstermijn)} 
                    onValueChange={(v) => setSupplier({...supplier, betalingstermijn: parseInt(v)})}
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Valuta</Label>
                  <Select value={supplier.valuta} onValueChange={(v) => setSupplier({...supplier, valuta: v})}>
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
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">IBAN / Rekeningnummer</Label>
                  <Input
                    value={supplier.iban}
                    onChange={(e) => setSupplier({...supplier, iban: e.target.value})}
                    placeholder="SR00XXXX0000000000"
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
                onClick={() => navigate('/app/boekhouding/crediteuren')}
                className="rounded-lg"
              >
                Annuleren
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 rounded-lg"
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

export default NieuweLeverancierPage;
