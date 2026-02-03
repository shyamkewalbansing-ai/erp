import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Sparkles, Clock, Calendar, DollarSign, Bell, Globe } from 'lucide-react';
import { getModuleSettings, updateModuleSettings } from '../../lib/api';

const defaultSettings = {
  opening_time: '09:00',
  closing_time: '18:00',
  slot_duration_minutes: 30,
  buffer_between_appointments: 15,
  max_advance_booking_days: 30,
  cancellation_notice_hours: 24,
  no_show_fee_percentage: 50.0,
  default_currency: 'SRD',
  send_appointment_reminders: true,
  reminder_hours_before: 24,
  allow_online_booking: true,
  require_deposit: false,
  deposit_percentage: 25.0
};

export default function BeautySpaSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getModuleSettings('beauty');
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
      await updateModuleSettings('beauty', settings);
      toast.success('Beauty Spa instellingen opgeslagen');
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
      <div className="bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-500" />
          Beauty Spa Instellingen
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configureer openingstijden, reserveringen en betalingen
        </p>
      </div>
      <CardContent className="p-6 space-y-8">
        {/* Openingstijden */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-pink-500" />
            Openingstijden
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Opening</Label>
              <Input 
                type="time"
                value={settings.opening_time}
                onChange={(e) => setSettings({...settings, opening_time: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Sluiting</Label>
              <Input 
                type="time"
                value={settings.closing_time}
                onChange={(e) => setSettings({...settings, closing_time: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Tijdslot duur</Label>
              <Select 
                value={String(settings.slot_duration_minutes)} 
                onValueChange={(v) => setSettings({...settings, slot_duration_minutes: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minuten</SelectItem>
                  <SelectItem value="30">30 minuten</SelectItem>
                  <SelectItem value="45">45 minuten</SelectItem>
                  <SelectItem value="60">60 minuten</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Buffer tussen afspraken</Label>
              <Select 
                value={String(settings.buffer_between_appointments)} 
                onValueChange={(v) => setSettings({...settings, buffer_between_appointments: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Geen</SelectItem>
                  <SelectItem value="5">5 minuten</SelectItem>
                  <SelectItem value="10">10 minuten</SelectItem>
                  <SelectItem value="15">15 minuten</SelectItem>
                  <SelectItem value="30">30 minuten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Reserveringen */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-pink-500" />
            Reserveringen
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Max. vooraf boeken</Label>
              <Select 
                value={String(settings.max_advance_booking_days)} 
                onValueChange={(v) => setSettings({...settings, max_advance_booking_days: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weken</SelectItem>
                  <SelectItem value="30">1 maand</SelectItem>
                  <SelectItem value="60">2 maanden</SelectItem>
                  <SelectItem value="90">3 maanden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Annuleringstermijn</Label>
              <Select 
                value={String(settings.cancellation_notice_hours)} 
                onValueChange={(v) => setSettings({...settings, cancellation_notice_hours: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Geen</SelectItem>
                  <SelectItem value="2">2 uur</SelectItem>
                  <SelectItem value="4">4 uur</SelectItem>
                  <SelectItem value="12">12 uur</SelectItem>
                  <SelectItem value="24">24 uur</SelectItem>
                  <SelectItem value="48">48 uur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">No-show kosten (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                value={settings.no_show_fee_percentage}
                onChange={(e) => setSettings({...settings, no_show_fee_percentage: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </div>

        {/* Betalingen */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-pink-500" />
            Betalingen
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
                  <SelectItem value="SRD">SRD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Aanbetaling vereist</Label>
                <p className="text-xs text-muted-foreground mt-1">Bij reservering</p>
              </div>
              <Switch 
                checked={settings.require_deposit}
                onCheckedChange={(v) => setSettings({...settings, require_deposit: v})}
              />
            </div>
            
            {settings.require_deposit && (
              <div className="space-y-2">
                <Label className="text-sm">Aanbetaling (%)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={settings.deposit_percentage}
                  onChange={(e) => setSettings({...settings, deposit_percentage: parseFloat(e.target.value) || 0})}
                />
              </div>
            )}
          </div>
        </div>

        {/* Herinneringen & Online Boeken */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Bell className="w-4 h-4 text-pink-500" />
            Automatisering
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Afspraak herinneringen</Label>
                <p className="text-xs text-muted-foreground mt-1">Stuur automatisch herinneringen</p>
              </div>
              <Switch 
                checked={settings.send_appointment_reminders}
                onCheckedChange={(v) => setSettings({...settings, send_appointment_reminders: v})}
              />
            </div>
            
            {settings.send_appointment_reminders && (
              <div className="space-y-2">
                <Label className="text-sm">Herinnering uren voor afspraak</Label>
                <Select 
                  value={String(settings.reminder_hours_before)} 
                  onValueChange={(v) => setSettings({...settings, reminder_hours_before: parseInt(v)})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 uur</SelectItem>
                    <SelectItem value="4">4 uur</SelectItem>
                    <SelectItem value="12">12 uur</SelectItem>
                    <SelectItem value="24">24 uur</SelectItem>
                    <SelectItem value="48">48 uur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Online boeken toestaan</Label>
                <p className="text-xs text-muted-foreground mt-1">Klanten kunnen online reserveren</p>
              </div>
              <Switch 
                checked={settings.allow_online_booking}
                onCheckedChange={(v) => setSettings({...settings, allow_online_booking: v})}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
