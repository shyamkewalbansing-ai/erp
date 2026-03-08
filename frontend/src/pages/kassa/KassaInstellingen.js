import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Loader2, Store, Mail, Phone, MapPin, 
  Receipt, Building2, Percent, CreditCard, Settings as SettingsIcon,
  Volume2, VolumeX, Sun, Moon, Printer
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function KassaInstellingen() {
  const navigate = useNavigate();
  const { token, business, refreshUser } = useKassaAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    kvk_number: '',
    btw_number: '',
    btw_percentage: 8,
    currency: 'SRD',
    settings: {
      receipt_header: '',
      receipt_footer: 'Bedankt voor uw aankoop!',
      auto_print_receipt: true,
      sound_enabled: true,
      theme: 'light'
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/kassa/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings({
          business_name: data.business_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          kvk_number: data.kvk_number || '',
          btw_number: data.btw_number || '',
          btw_percentage: data.btw_percentage || 8,
          currency: data.currency || 'SRD',
          settings: {
            receipt_header: data.settings?.receipt_header || data.business_name || '',
            receipt_footer: data.settings?.receipt_footer || 'Bedankt voor uw aankoop!',
            auto_print_receipt: data.settings?.auto_print_receipt ?? true,
            sound_enabled: data.settings?.sound_enabled ?? true,
            theme: data.settings?.theme || 'light'
          }
        });
      }
    } catch (error) {
      toast.error('Fout bij laden instellingen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/kassa/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        toast.success('Instellingen opgeslagen');
        refreshUser();
      } else {
        throw new Error('Fout bij opslaan');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="kassa-instellingen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/kassa/pos')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Instellingen</h1>
                <p className="text-sm text-gray-500">Beheer uw bedrijfs- en kassagegevens</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Bedrijfsgegevens */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Bedrijfsgegevens</CardTitle>
                <CardDescription>Uw bedrijfsinformatie voor facturen en bonnen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Bedrijfsnaam</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="business_name"
                    value={settings.business_name}
                    onChange={(e) => updateSetting('business_name', e.target.value)}
                    className="pl-10"
                    placeholder="Uw Bedrijf B.V."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    className="pl-10"
                    placeholder="info@uwbedrijf.sr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoonnummer</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    className="pl-10"
                    placeholder="+597 xxxxxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => updateSetting('address', e.target.value)}
                    className="pl-10"
                    placeholder="Straatnaam 123, Paramaribo"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Belasting & Valuta */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Percent className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Belasting & Valuta</CardTitle>
                <CardDescription>BTW percentage en valuta instellingen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kvk_number">KvK Nummer</Label>
                <Input
                  id="kvk_number"
                  value={settings.kvk_number}
                  onChange={(e) => updateSetting('kvk_number', e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="btw_number">BTW Nummer</Label>
                <Input
                  id="btw_number"
                  value={settings.btw_number}
                  onChange={(e) => updateSetting('btw_number', e.target.value)}
                  placeholder="SRxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="btw_percentage">BTW Percentage (%)</Label>
                <Input
                  id="btw_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.btw_percentage}
                  onChange={(e) => updateSetting('btw_percentage', parseFloat(e.target.value) || 0)}
                  placeholder="8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Valuta</Label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="SRD">SRD - Surinaamse Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bon Instellingen */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Bon Instellingen</CardTitle>
                <CardDescription>Pas uw kassabon aan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_header">Bon Koptekst</Label>
              <Input
                id="receipt_header"
                value={settings.settings.receipt_header}
                onChange={(e) => updateNestedSetting('receipt_header', e.target.value)}
                placeholder="Uw Bedrijfsnaam"
              />
              <p className="text-xs text-gray-500">Wordt bovenaan de bon weergegeven</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt_footer">Bon Voettekst</Label>
              <Input
                id="receipt_footer"
                value={settings.settings.receipt_footer}
                onChange={(e) => updateNestedSetting('receipt_footer', e.target.value)}
                placeholder="Bedankt voor uw aankoop!"
              />
              <p className="text-xs text-gray-500">Wordt onderaan de bon weergegeven</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Automatisch bon printen</p>
                  <p className="text-sm text-gray-500">Print automatisch na elke verkoop</p>
                </div>
              </div>
              <button
                onClick={() => updateNestedSetting('auto_print_receipt', !settings.settings.auto_print_receipt)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.settings.auto_print_receipt ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.settings.auto_print_receipt ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* App Instellingen */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>App Instellingen</CardTitle>
                <CardDescription>Algemene app voorkeuren</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {settings.settings.sound_enabled ? (
                  <Volume2 className="w-5 h-5 text-gray-500" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Geluidseffecten</p>
                  <p className="text-sm text-gray-500">Speel geluid af bij acties</p>
                </div>
              </div>
              <button
                onClick={() => updateNestedSetting('sound_enabled', !settings.settings.sound_enabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.settings.sound_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.settings.sound_enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {settings.settings.theme === 'light' ? (
                  <Sun className="w-5 h-5 text-gray-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Thema</p>
                  <p className="text-sm text-gray-500">Kies licht of donker thema</p>
                </div>
              </div>
              <select
                value={settings.settings.theme}
                onChange={(e) => updateNestedSetting('theme', e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="light">Licht</option>
                <option value="dark">Donker</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Abonnement Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle>Abonnement</CardTitle>
                <CardDescription>Uw huidige abonnement en status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm">Huidig Plan</p>
                  <p className="text-2xl font-bold">{business?.subscription_plan?.toUpperCase() || 'BASIC'}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-sm">Status</p>
                  <p className="font-semibold">
                    {business?.subscription_status === 'trial' ? '14-dagen proefperiode' : 'Actief'}
                  </p>
                </div>
              </div>
              <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
