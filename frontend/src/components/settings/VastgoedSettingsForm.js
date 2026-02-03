import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Home, DollarSign, Clock, Bell, FileText } from 'lucide-react';
import { getModuleSettings, updateModuleSettings } from '../../lib/api';

const defaultSettings = {
  rent_due_day: 1,
  payment_frequency: 'monthly',
  grace_period_days: 5,
  payment_deadline_day: 0,
  payment_deadline_month_offset: 0,
  late_fee_percentage: 0,
  late_fee_fixed: 0,
  auto_generate_invoices: true,
  invoice_prefix: 'HF',
  default_currency: 'SRD',
  send_payment_reminders: true,
  reminder_days_before: 3
};

export default function VastgoedSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getModuleSettings('vastgoed_beheer');
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
      await updateModuleSettings('vastgoed_beheer', settings);
      toast.success('Vastgoed instellingen opgeslagen');
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
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Home className="w-5 h-5 text-emerald-500" />
          Vastgoed Instellingen
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configureer huurinstellingen, betalingstermijnen en automatiseringen
        </p>
      </div>
      <CardContent className="p-6 space-y-8">
        {/* Betalingsinstellingen */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Betalingsinstellingen
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Huur verschuldigd op</Label>
              <Select 
                value={String(settings.rent_due_day)} 
                onValueChange={(v) => setSettings({...settings, rent_due_day: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,5,10,15,20,25,28].map(day => (
                    <SelectItem key={day} value={String(day)}>Dag {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Betalingsfrequentie</Label>
              <Select 
                value={settings.payment_frequency} 
                onValueChange={(v) => setSettings({...settings, payment_frequency: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Wekelijks</SelectItem>
                  <SelectItem value="biweekly">Tweewekelijks</SelectItem>
                  <SelectItem value="monthly">Maandelijks</SelectItem>
                  <SelectItem value="quarterly">Per kwartaal</SelectItem>
                  <SelectItem value="yearly">Jaarlijks</SelectItem>
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
                  <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Termijnen */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-emerald-500" />
            Termijnen & Boetes
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Gratieperiode (dagen)</Label>
              <Select 
                value={String(settings.grace_period_days)} 
                onValueChange={(v) => setSettings({...settings, grace_period_days: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0,3,5,7,10,14,30].map(days => (
                    <SelectItem key={days} value={String(days)}>{days} dagen</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Deadline dag</Label>
              <Select 
                value={String(settings.payment_deadline_day)} 
                onValueChange={(v) => setSettings({...settings, payment_deadline_day: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Geen vaste dag</SelectItem>
                  {[1,5,10,15,20,25,28].map(day => (
                    <SelectItem key={day} value={String(day)}>Dag {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Boete percentage (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                value={settings.late_fee_percentage}
                onChange={(e) => setSettings({...settings, late_fee_percentage: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Vaste boete ({settings.default_currency})</Label>
              <Input 
                type="number" 
                min="0"
                value={settings.late_fee_fixed}
                onChange={(e) => setSettings({...settings, late_fee_fixed: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </div>

        {/* Facturen */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-emerald-500" />
            Factuur Instellingen
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Factuur prefix</Label>
              <Input 
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({...settings, invoice_prefix: e.target.value.toUpperCase()})}
                placeholder="HF"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">Bijv. HF2024-00001</p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Automatisch facturen genereren</Label>
                <p className="text-xs text-muted-foreground mt-1">Maak automatisch facturen aan op de verschuldigingsdatum</p>
              </div>
              <Switch 
                checked={settings.auto_generate_invoices}
                onCheckedChange={(v) => setSettings({...settings, auto_generate_invoices: v})}
              />
            </div>
          </div>
        </div>

        {/* Herinneringen */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Bell className="w-4 h-4 text-emerald-500" />
            Herinneringen
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Betalingsherinneringen versturen</Label>
                <p className="text-xs text-muted-foreground mt-1">Stuur automatisch herinneringen naar huurders</p>
              </div>
              <Switch 
                checked={settings.send_payment_reminders}
                onCheckedChange={(v) => setSettings({...settings, send_payment_reminders: v})}
              />
            </div>
            
            {settings.send_payment_reminders && (
              <div className="space-y-2">
                <Label className="text-sm">Dagen voor deadline</Label>
                <Select 
                  value={String(settings.reminder_days_before)} 
                  onValueChange={(v) => setSettings({...settings, reminder_days_before: parseInt(v)})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,5,7,14].map(days => (
                      <SelectItem key={days} value={String(days)}>{days} dagen</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
