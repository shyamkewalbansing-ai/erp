import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Car, DollarSign, FileText, Globe, Shield } from 'lucide-react';
import { getModuleSettings, updateModuleSettings } from '../../lib/api';

const defaultSettings = {
  commission_percentage: 5.0,
  default_warranty_months: 12,
  auto_generate_contracts: true,
  contract_prefix: 'VC',
  invoice_prefix: 'VF',
  default_currency: 'SRD',
  track_test_drives: true,
  require_deposit: true,
  deposit_percentage: 10.0,
  show_prices_on_portal: true,
  allow_online_inquiries: true
};

export default function AutoDealerSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getModuleSettings('autodealer');
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
      await updateModuleSettings('autodealer', settings);
      toast.success('Auto Dealer instellingen opgeslagen');
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
      <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Car className="w-5 h-5 text-orange-500" />
          Auto Dealer Instellingen
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configureer verkoop, commissies, garanties en klantportaal
        </p>
      </div>
      <CardContent className="p-6 space-y-8">
        {/* Verkoop Instellingen */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-orange-500" />
            Verkoop Instellingen
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Commissie percentage (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                step="0.5"
                value={settings.commission_percentage}
                onChange={(e) => setSettings({...settings, commission_percentage: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Standaard garantie</Label>
              <Select 
                value={String(settings.default_warranty_months)} 
                onValueChange={(v) => setSettings({...settings, default_warranty_months: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Geen garantie</SelectItem>
                  <SelectItem value="3">3 maanden</SelectItem>
                  <SelectItem value="6">6 maanden</SelectItem>
                  <SelectItem value="12">12 maanden</SelectItem>
                  <SelectItem value="24">24 maanden</SelectItem>
                  <SelectItem value="36">36 maanden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Standaard valuta</Label>
              <Select 
                value={settings.default_currency} 
                onValueChange={(v) => setSettings({...settings, default_currency: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRD">SRD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Aanbetaling percentage (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                step="5"
                value={settings.deposit_percentage}
                onChange={(e) => setSettings({...settings, deposit_percentage: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </div>

        {/* Documenten */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-orange-500" />
            Documenten
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Contract prefix</Label>
              <Input 
                value={settings.contract_prefix}
                onChange={(e) => setSettings({...settings, contract_prefix: e.target.value.toUpperCase()})}
                placeholder="VC"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">Bijv. VC2024-00001</p>
            </div>
            
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
          </div>
        </div>

        {/* Automatisering */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Shield className="w-4 h-4 text-orange-500" />
            Automatisering
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Automatisch contracten genereren</Label>
                <p className="text-xs text-muted-foreground mt-1">Maak automatisch contracten bij verkoop</p>
              </div>
              <Switch 
                checked={settings.auto_generate_contracts}
                onCheckedChange={(v) => setSettings({...settings, auto_generate_contracts: v})}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Proefritten bijhouden</Label>
                <p className="text-xs text-muted-foreground mt-1">Registreer proefritten van klanten</p>
              </div>
              <Switch 
                checked={settings.track_test_drives}
                onCheckedChange={(v) => setSettings({...settings, track_test_drives: v})}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Aanbetaling vereist</Label>
                <p className="text-xs text-muted-foreground mt-1">Aanbetaling verplicht bij reservering</p>
              </div>
              <Switch 
                checked={settings.require_deposit}
                onCheckedChange={(v) => setSettings({...settings, require_deposit: v})}
              />
            </div>
          </div>
        </div>

        {/* Klant Portaal */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Globe className="w-4 h-4 text-orange-500" />
            Klant Portaal
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Prijzen tonen op portaal</Label>
                <p className="text-xs text-muted-foreground mt-1">Toon voertuigprijzen op klantportaal</p>
              </div>
              <Switch 
                checked={settings.show_prices_on_portal}
                onCheckedChange={(v) => setSettings({...settings, show_prices_on_portal: v})}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Online aanvragen toestaan</Label>
                <p className="text-xs text-muted-foreground mt-1">Klanten kunnen online interesse tonen</p>
              </div>
              <Switch 
                checked={settings.allow_online_inquiries}
                onCheckedChange={(v) => setSettings({...settings, allow_online_inquiries: v})}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
