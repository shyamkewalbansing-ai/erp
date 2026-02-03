import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, Fuel, DollarSign, AlertTriangle, Clock, Receipt } from 'lucide-react';
import { getModuleSettings, updateModuleSettings } from '../../lib/api';

const defaultSettings = {
  fuel_price_gasoline: 0.0,
  fuel_price_diesel: 0.0,
  fuel_price_lpg: 0.0,
  tank_warning_level_percentage: 20,
  tank_critical_level_percentage: 10,
  shift_duration_hours: 8,
  track_meter_readings: true,
  require_shift_handover: true,
  default_currency: 'SRD',
  auto_update_inventory: true,
  pos_receipt_header: '',
  pos_receipt_footer: ''
};

export default function PompstationSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getModuleSettings('pompstation');
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
      await updateModuleSettings('pompstation', settings);
      toast.success('Pompstation instellingen opgeslagen');
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
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Fuel className="w-5 h-5 text-amber-500" />
          Pompstation Instellingen
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configureer brandstofprijzen, tankniveaus en diensten
        </p>
      </div>
      <CardContent className="p-6 space-y-8">
        {/* Brandstofprijzen */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-amber-500" />
            Brandstofprijzen ({settings.default_currency}/liter)
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Benzine</Label>
              <Input 
                type="number" 
                min="0"
                step="0.01"
                value={settings.fuel_price_gasoline}
                onChange={(e) => setSettings({...settings, fuel_price_gasoline: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Diesel</Label>
              <Input 
                type="number" 
                min="0"
                step="0.01"
                value={settings.fuel_price_diesel}
                onChange={(e) => setSettings({...settings, fuel_price_diesel: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">LPG</Label>
              <Input 
                type="number" 
                min="0"
                step="0.01"
                value={settings.fuel_price_lpg}
                onChange={(e) => setSettings({...settings, fuel_price_lpg: parseFloat(e.target.value) || 0})}
              />
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
          </div>
        </div>

        {/* Tank Niveaus */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Tank Waarschuwingen
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Waarschuwingsniveau (%)</Label>
              <Select 
                value={String(settings.tank_warning_level_percentage)} 
                onValueChange={(v) => setSettings({...settings, tank_warning_level_percentage: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10,15,20,25,30].map(p => (
                    <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Gele waarschuwing wanneer tank onder dit niveau komt</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Kritiek niveau (%)</Label>
              <Select 
                value={String(settings.tank_critical_level_percentage)} 
                onValueChange={(v) => setSettings({...settings, tank_critical_level_percentage: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5,10,15,20].map(p => (
                    <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Rode waarschuwing wanneer tank onder dit niveau komt</p>
            </div>
          </div>
        </div>

        {/* Diensten */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-amber-500" />
            Diensten & Overdracht
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Dienst duur (uren)</Label>
              <Select 
                value={String(settings.shift_duration_hours)} 
                onValueChange={(v) => setSettings({...settings, shift_duration_hours: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 uur</SelectItem>
                  <SelectItem value="8">8 uur</SelectItem>
                  <SelectItem value="10">10 uur</SelectItem>
                  <SelectItem value="12">12 uur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Meterstanden bijhouden</Label>
                <p className="text-xs text-muted-foreground mt-1">Registreer pompmeterstanden per dienst</p>
              </div>
              <Switch 
                checked={settings.track_meter_readings}
                onCheckedChange={(v) => setSettings({...settings, track_meter_readings: v})}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Dienst overdracht vereist</Label>
                <p className="text-xs text-muted-foreground mt-1">Overdracht document bij wisseling</p>
              </div>
              <Switch 
                checked={settings.require_shift_handover}
                onCheckedChange={(v) => setSettings({...settings, require_shift_handover: v})}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Auto voorraad update</Label>
                <p className="text-xs text-muted-foreground mt-1">Winkelvoorraad automatisch bijwerken</p>
              </div>
              <Switch 
                checked={settings.auto_update_inventory}
                onCheckedChange={(v) => setSettings({...settings, auto_update_inventory: v})}
              />
            </div>
          </div>
        </div>

        {/* POS Bon */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Receipt className="w-4 h-4 text-amber-500" />
            Kassabon Instellingen
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Bon Header</Label>
              <Textarea 
                value={settings.pos_receipt_header}
                onChange={(e) => setSettings({...settings, pos_receipt_header: e.target.value})}
                placeholder="Bijv. bedrijfsnaam, adres, telefoon..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Bon Footer</Label>
              <Textarea 
                value={settings.pos_receipt_footer}
                onChange={(e) => setSettings({...settings, pos_receipt_footer: e.target.value})}
                placeholder="Bijv. bedankt voor uw bezoek, openingstijden..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
