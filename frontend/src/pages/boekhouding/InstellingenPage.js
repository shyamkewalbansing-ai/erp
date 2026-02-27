import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Settings, Building2, Loader2, Save } from 'lucide-react';

const InstellingenPage = () => {
  const [settings, setSettings] = useState({
    id: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    btw_number: '',
    default_currency: 'SRD',
    fiscal_year_start: 1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getCompany();
      setSettings(response.data);
    } catch (error) {
      toast.error('Fout bij laden instellingen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateCompany(settings);
      toast.success('Instellingen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maart' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Augustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  return (
    <div className="space-y-6" data-testid="instellingen-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Instellingen</h1>
          <p className="text-slate-500 mt-1">Beheer uw bedrijfsgegevens en voorkeuren</p>
        </div>
      </div>

      {loading ? (
        <Card className="border-slate-200">
          <CardContent className="p-8 text-center text-slate-500">
            Laden...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Bedrijfsgegevens</CardTitle>
                  <CardDescription>Algemene informatie over uw bedrijf</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bedrijfsnaam</Label>
                <Input
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                  placeholder="Uw bedrijfsnaam"
                  data-testid="company-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  value={settings.address || ''}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  placeholder="Straat en nummer, Stad"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefoon</Label>
                  <Input
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({...settings, phone: e.target.value})}
                    placeholder="+597 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    placeholder="info@bedrijf.sr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>BTW-nummer</Label>
                <Input
                  value={settings.btw_number || ''}
                  onChange={(e) => setSettings({...settings, btw_number: e.target.value})}
                  placeholder="BTW123456789"
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Settings */}
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Financiële Instellingen</CardTitle>
                  <CardDescription>Valuta en boekjaar voorkeuren</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Standaard Valuta</Label>
                <Select 
                  value={settings.default_currency} 
                  onValueChange={(v) => setSettings({...settings, default_currency: v})}
                >
                  <SelectTrigger data-testid="default-currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Boekjaar</Label>
                <Select 
                  value={String(settings.fiscal_year_start)} 
                  onValueChange={(v) => setSettings({...settings, fiscal_year_start: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">De maand waarin uw boekjaar begint</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="lg:col-span-2">
            <Button 
              onClick={handleSave} 
              className="w-full md:w-auto"
              disabled={saving}
              data-testid="save-settings-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Instellingen Opslaan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstellingenPage;
