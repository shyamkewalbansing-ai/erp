import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent } from '../../components/ui/card';
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
  Users,
  Mail,
  Phone,
  MapPin,
  Wallet,
  FileText,
  CheckCircle2
} from 'lucide-react';

const NieuweDebiteurPage = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

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
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/app/boekhouding/debiteuren')}
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Nieuwe Debiteur Aanmaken</h1>
              <p className="text-sm text-gray-500">Voeg een nieuwe klant toe aan uw administratie</p>
            </div>
          </div>
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

      {/* Form Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Basisgegevens */}
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Basisgegevens</h2>
                  <p className="text-sm text-gray-500">Bedrijfs- of persoonsgegevens</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Bedrijfsnaam / Naam *</Label>
                  <Input
                    value={customer.naam}
                    onChange={(e) => setCustomer({...customer, naam: e.target.value})}
                    placeholder="Bijv. ABC Trading N.V."
                    className="rounded-lg"
                    data-testid="customer-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">BTW-nummer</Label>
                  <Input
                    value={customer.btw_nummer}
                    onChange={(e) => setCustomer({...customer, btw_nummer: e.target.value})}
                    placeholder="BTW123456789"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Valuta</Label>
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
            </CardContent>
          </Card>

          {/* Contactgegevens */}
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Contactgegevens</h2>
                  <p className="text-sm text-gray-500">Telefoon en e-mail</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Telefoon</Label>
                  <Input
                    value={customer.telefoon}
                    onChange={(e) => setCustomer({...customer, telefoon: e.target.value})}
                    placeholder="+597 123 4567"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">E-mail</Label>
                  <Input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({...customer, email: e.target.value})}
                    placeholder="info@bedrijf.sr"
                    className="rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresgegevens */}
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Adresgegevens</h2>
                  <p className="text-sm text-gray-500">Factuuradres van de klant</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Straat en huisnummer</Label>
                  <Input
                    value={customer.adres}
                    onChange={(e) => setCustomer({...customer, adres: e.target.value})}
                    placeholder="Domineestraat 1"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Postcode</Label>
                  <Input
                    value={customer.postcode}
                    onChange={(e) => setCustomer({...customer, postcode: e.target.value})}
                    placeholder="Postcode"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Plaats</Label>
                  <Input
                    value={customer.plaats}
                    onChange={(e) => setCustomer({...customer, plaats: e.target.value})}
                    placeholder="Paramaribo"
                    className="rounded-lg"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Land</Label>
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
            </CardContent>
          </Card>

          {/* Betalingsvoorwaarden */}
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Betalingsvoorwaarden</h2>
                  <p className="text-sm text-gray-500">Termijnen en kredietlimiet</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Betalingstermijn</Label>
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Kredietlimiet ({customer.valuta})</Label>
                  <Input
                    type="number"
                    value={customer.kredietlimiet}
                    onChange={(e) => setCustomer({...customer, kredietlimiet: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notities */}
          <Card className="bg-white border border-gray-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Notities</h2>
                  <p className="text-sm text-gray-500">Interne opmerkingen (optioneel)</p>
                </div>
              </div>
              
              <Textarea
                value={customer.notities}
                onChange={(e) => setCustomer({...customer, notities: e.target.value})}
                placeholder="Eventuele opmerkingen over deze klant..."
                className="rounded-lg min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
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
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Debiteur Opslaan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NieuweDebiteurPage;
