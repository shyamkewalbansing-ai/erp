import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Calculator, DollarSign, FileText, Calendar, Percent } from 'lucide-react';
import { getModuleSettings, updateModuleSettings } from '../lib/api';

const defaultSettings = {
  default_currency: 'SRD',
  fiscal_year_start_month: 1,
  btw_tarief_hoog: 25.0,
  btw_tarief_laag: 10.0,
  btw_aangifte_periode: 'quarterly',
  auto_btw_calculation: true,
  invoice_prefix: 'VF',
  invoice_number_length: 5,
  default_payment_terms_days: 30,
  show_btw_on_invoices: true,
  enable_multi_currency: true,
  exchange_rate_source: 'manual'
};

const monthNames = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export default function BoekhoudingSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getModuleSettings('boekhouding');
      if (res.data.settings) {
        setSettings({ ...defaultSettings, ...res.data.settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateModuleSettings('boekhouding', settings);
      toast.success('Boekhouding instellingen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan van instellingen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-500" />
          Boekhouding Instellingen
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configureer BTW-tarieven, valuta en factuurinstellingen
        </p>
      </div>
      <CardContent className="p-6 space-y-8">
        {/* Valuta */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-purple-500" />
            Valuta Instellingen
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Standaard valuta</Label>
              <Select 
                value={settings.default_currency} 
                onValueChange={(v) => setSettings({...settings, default_currency: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Multi-valuta</Label>
                <p className="text-xs text-muted-foreground mt-1">SRD, USD en EUR ondersteuning</p>
              </div>
              <Switch 
                checked={settings.enable_multi_currency}
                onCheckedChange={(v) => setSettings({...settings, enable_multi_currency: v})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Wisselkoers bron</Label>
              <Select 
                value={settings.exchange_rate_source} 
                onValueChange={(v) => setSettings({...settings, exchange_rate_source: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Handmatig invoeren</SelectItem>
                  <SelectItem value="cbvs">Centrale Bank (CBVS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* BTW */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Percent className="w-4 h-4 text-purple-500" />
            BTW Instellingen
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Hoog tarief (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                step="0.5"
                value={settings.btw_tarief_hoog}
                onChange={(e) => setSettings({...settings, btw_tarief_hoog: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">Standaard: 25%</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Laag tarief (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                step="0.5"
                value={settings.btw_tarief_laag}
                onChange={(e) => setSettings({...settings, btw_tarief_laag: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">Standaard: 10%</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">BTW aangifte periode</Label>
              <Select 
                value={settings.btw_aangifte_periode} 
                onValueChange={(v) => setSettings({...settings, btw_aangifte_periode: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Maandelijks</SelectItem>
                  <SelectItem value="quarterly">Per kwartaal</SelectItem>
                  <SelectItem value="yearly">Jaarlijks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Auto BTW berekening</Label>
                <p className="text-xs text-muted-foreground mt-1">Automatisch BTW berekenen</p>
              </div>
              <Switch 
                checked={settings.auto_btw_calculation}
                onCheckedChange={(v) => setSettings({...settings, auto_btw_calculation: v})}
              />
            </div>
          </div>
        </div>

        {/* Facturen */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-purple-500" />
            Factuur Instellingen
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Factuur prefix</Label>
              <Input 
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({...settings, invoice_prefix: e.target.value.toUpperCase()})}
                placeholder="VF"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">Bijv. VF2024-00001</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Nummering lengte</Label>
              <Select 
                value={String(settings.invoice_number_length)} 
                onValueChange={(v) => setSettings({...settings, invoice_number_length: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 cijfers (001)</SelectItem>
                  <SelectItem value="4">4 cijfers (0001)</SelectItem>
                  <SelectItem value="5">5 cijfers (00001)</SelectItem>
                  <SelectItem value="6">6 cijfers (000001)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Betalingstermijn (dagen)</Label>
              <Select 
                value={String(settings.default_payment_terms_days)} 
                onValueChange={(v) => setSettings({...settings, default_payment_terms_days: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Direct</SelectItem>
                  <SelectItem value="7">7 dagen</SelectItem>
                  <SelectItem value="14">14 dagen</SelectItem>
                  <SelectItem value="30">30 dagen</SelectItem>
                  <SelectItem value="60">60 dagen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">BTW op facturen</Label>
                <p className="text-xs text-muted-foreground mt-1">Toon BTW regels</p>
              </div>
              <Switch 
                checked={settings.show_btw_on_invoices}
                onCheckedChange={(v) => setSettings({...settings, show_btw_on_invoices: v})}
              />
            </div>
          </div>
        </div>

        {/* Boekjaar */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-purple-500" />
            Boekjaar
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Boekjaar begint in</Label>
              <Select 
                value={String(settings.fiscal_year_start_month)} 
                onValueChange={(v) => setSettings({...settings, fiscal_year_start_month: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Standaard: Januari (kalenderjaar)</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
