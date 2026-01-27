import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Settings, Building2, Plus, Trash2, Loader2, DollarSign, Clock, Calendar } from 'lucide-react';
import api from '../lib/api';

export default function HRMInstellingen() {
  const [settings, setSettings] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [settingsRes, departmentsRes] = await Promise.all([
        api.get('/hrm/settings'),
        api.get('/hrm/departments')
      ]);
      setSettings(settingsRes.data || {});
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/hrm/settings', settings);
      toast.success('Instellingen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDept = async () => {
    if (!deptForm.name) { toast.error('Naam is verplicht'); return; }
    setSaving(true);
    try {
      await api.post('/hrm/departments', deptForm);
      toast.success('Afdeling toegevoegd');
      setShowDeptModal(false);
      setDeptForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      toast.error('Fout bij toevoegen');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze afdeling wilt verwijderen?')) return;
    try {
      await api.delete(`/hrm/departments/${id}`);
      toast.success('Afdeling verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HRM Instellingen</h1>
        <p className="text-muted-foreground mt-1">Configureer uw HR-systeem</p>
      </div>

      {/* General Settings */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Algemene Instellingen
          </CardTitle>
          <CardDescription>Basis configuratie voor uw HR-systeem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Standaard Valuta
              </Label>
              <Select value={settings.default_currency || 'SRD'} onValueChange={(v) => setSettings({ ...settings, default_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRD">SRD - Surinaamse Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="USD">USD - Amerikaanse Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Werkuren per dag
              </Label>
              <Input 
                type="number" 
                value={settings.work_hours_per_day || 8} 
                onChange={(e) => setSettings({ ...settings, work_hours_per_day: parseInt(e.target.value) })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Werkdagen per week</Label>
              <Input 
                type="number" 
                value={settings.work_days_per_week || 5} 
                onChange={(e) => setSettings({ ...settings, work_days_per_week: parseInt(e.target.value) })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Overwerk tarief (multiplier)</Label>
              <Input 
                type="number" 
                step="0.1"
                value={settings.overtime_rate || 1.5} 
                onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) })} 
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Vakantiedagen per jaar
              </Label>
              <Input 
                type="number" 
                value={settings.vacation_days_per_year || 20} 
                onChange={(e) => setSettings({ ...settings, vacation_days_per_year: parseInt(e.target.value) })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Ziektedagen per jaar</Label>
              <Input 
                type="number" 
                value={settings.sick_days_per_year || 10} 
                onChange={(e) => setSettings({ ...settings, sick_days_per_year: parseInt(e.target.value) })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Belastingtarief (%)</Label>
              <Input 
                type="number" 
                step="0.1"
                value={(settings.tax_rate || 0) * 100} 
                onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) / 100 })} 
              />
            </div>
          </div>
          
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Werkregels</h3>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <Label className="text-base">Thuiswerken toestaan</Label>
                <p className="text-sm text-muted-foreground">Werknemers kunnen op afstand werken</p>
              </div>
              <Switch 
                checked={settings.allow_remote_work !== false} 
                onCheckedChange={(v) => setSettings({ ...settings, allow_remote_work: v })} 
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <Label className="text-base">Verplicht inklokken</Label>
                <p className="text-sm text-muted-foreground">Werknemers moeten dagelijks in- en uitklokken</p>
              </div>
              <Switch 
                checked={settings.require_clock_in === true} 
                onCheckedChange={(v) => setSettings({ ...settings, require_clock_in: v })} 
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} size="lg" className="mt-4">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Instellingen Opslaan
          </Button>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Afdelingen
              </CardTitle>
              <CardDescription>Beheer de afdelingen in uw organisatie</CardDescription>
            </div>
            <Button onClick={() => setShowDeptModal(true)}>
              <Plus className="w-4 h-4 mr-2" />Afdeling Toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">Geen afdelingen aangemaakt</p>
              <Button variant="outline" onClick={() => setShowDeptModal(true)}>
                <Plus className="w-4 h-4 mr-2" />Eerste Afdeling Toevoegen
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/50 to-muted rounded-xl group hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteDept(dept.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Modal */}
      <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Afdeling</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naam *</Label>
              <Input 
                value={deptForm.name} 
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} 
                placeholder="Bijv. Sales, IT, HR, Finance"
              />
            </div>
            <div>
              <Label>Beschrijving</Label>
              <Textarea 
                value={deptForm.description} 
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} 
                rows={3}
                placeholder="Optionele beschrijving van de afdeling..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeptModal(false)}>Annuleren</Button>
            <Button onClick={handleAddDept} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
