import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Users, Clock, Calendar, DollarSign, UserCheck } from 'lucide-react';
import { getModuleSettings, updateModuleSettings } from '../../lib/api';

const defaultSettings = {
  work_hours_per_day: 8.0,
  work_days_per_week: 5,
  overtime_multiplier: 1.5,
  weekend_multiplier: 2.0,
  annual_leave_days: 20,
  sick_leave_days: 10,
  maternity_leave_days: 90,
  paternity_leave_days: 5,
  probation_period_months: 3,
  notice_period_days: 30,
  salary_payment_day: 25,
  default_currency: 'SRD',
  track_attendance: true,
  require_leave_approval: true
};

export default function HRMSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getModuleSettings('hrm');
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
      await updateModuleSettings('hrm', settings);
      toast.success('HRM instellingen opgeslagen');
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
      <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          HRM Instellingen
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configureer werktijden, verlof, salarissen en personeelsregels
        </p>
      </div>
      <CardContent className="p-6 space-y-8">
        {/* Werktijden */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-blue-500" />
            Werktijden
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Werkuren per dag</Label>
              <Input 
                type="number" 
                min="1" 
                max="24"
                step="0.5"
                value={settings.work_hours_per_day}
                onChange={(e) => setSettings({...settings, work_hours_per_day: parseFloat(e.target.value) || 8})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Werkdagen per week</Label>
              <Select 
                value={String(settings.work_days_per_week)} 
                onValueChange={(v) => setSettings({...settings, work_days_per_week: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5,6,7].map(days => (
                    <SelectItem key={days} value={String(days)}>{days} dagen</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Overwerk multiplier</Label>
              <Select 
                value={String(settings.overtime_multiplier)} 
                onValueChange={(v) => setSettings({...settings, overtime_multiplier: parseFloat(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="1.75">1.75x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Weekend multiplier</Label>
              <Select 
                value={String(settings.weekend_multiplier)} 
                onValueChange={(v) => setSettings({...settings, weekend_multiplier: parseFloat(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="2.5">2.5x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Verlof */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-blue-500" />
            Verlof Regels
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Jaarlijks verlof (dagen)</Label>
              <Input 
                type="number" 
                min="0" 
                max="60"
                value={settings.annual_leave_days}
                onChange={(e) => setSettings({...settings, annual_leave_days: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Ziekteverlof (dagen)</Label>
              <Input 
                type="number" 
                min="0" 
                max="60"
                value={settings.sick_leave_days}
                onChange={(e) => setSettings({...settings, sick_leave_days: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Zwangerschapsverlof (dagen)</Label>
              <Input 
                type="number" 
                min="0" 
                max="180"
                value={settings.maternity_leave_days}
                onChange={(e) => setSettings({...settings, maternity_leave_days: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Vaderschapsverlof (dagen)</Label>
              <Input 
                type="number" 
                min="0" 
                max="30"
                value={settings.paternity_leave_days}
                onChange={(e) => setSettings({...settings, paternity_leave_days: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
        </div>

        {/* Contract & Salaris */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-blue-500" />
            Contract & Salaris
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Proeftijd (maanden)</Label>
              <Select 
                value={String(settings.probation_period_months)} 
                onValueChange={(v) => setSettings({...settings, probation_period_months: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,6].map(months => (
                    <SelectItem key={months} value={String(months)}>{months} maanden</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Opzegtermijn (dagen)</Label>
              <Select 
                value={String(settings.notice_period_days)} 
                onValueChange={(v) => setSettings({...settings, notice_period_days: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[14,30,60,90].map(days => (
                    <SelectItem key={days} value={String(days)}>{days} dagen</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Salarisbetaling op dag</Label>
              <Select 
                value={String(settings.salary_payment_day)} 
                onValueChange={(v) => setSettings({...settings, salary_payment_day: parseInt(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,10,15,20,25,28].map(day => (
                    <SelectItem key={day} value={String(day)}>Dag {day}</SelectItem>
                  ))}
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
          </div>
        </div>

        {/* Automatisering */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
            <UserCheck className="w-4 h-4 text-blue-500" />
            Automatisering
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Aanwezigheid bijhouden</Label>
                <p className="text-xs text-muted-foreground mt-1">Registreer in- en uitklokken van personeel</p>
              </div>
              <Switch 
                checked={settings.track_attendance}
                onCheckedChange={(v) => setSettings({...settings, track_attendance: v})}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Verlof goedkeuring vereist</Label>
                <p className="text-xs text-muted-foreground mt-1">Manager moet verlofaanvragen goedkeuren</p>
              </div>
              <Switch 
                checked={settings.require_leave_approval}
                onCheckedChange={(v) => setSettings({...settings, require_leave_approval: v})}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
