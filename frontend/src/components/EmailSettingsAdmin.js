import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Mail, 
  Server, 
  Send, 
  Save, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff,
  Bell,
  Users,
  CreditCard,
  Clock,
  FileText,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import ScheduledJobsAdmin from './ScheduledJobsAdmin';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmailSettingsAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'Facturatie.sr',
    use_tls: true,
    start_tls: true,
    admin_email: '',
    notify_new_customer: true,
    notify_payment_request: true,
    notify_module_expiring: true
  });

  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/email-settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/email-templates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/email-logs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/email-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        toast.success('Email instellingen opgeslagen');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan instellingen');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/email-settings/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Test email verzonden! Controleer uw inbox.');
      } else {
        toast.error(result.error || 'Test email mislukt');
      }
    } catch (error) {
      toast.error('Fout bij verzenden test email');
    } finally {
      setTesting(false);
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
    <div className="space-y-6">
      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">
            <Server className="w-4 h-4 mr-2" />
            SMTP Instellingen
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="logs" onClick={loadLogs}>
            <Clock className="w-4 h-4 mr-2" />
            Verzendlog
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Enable/Disable */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Service
                  </CardTitle>
                  <CardDescription>Configureer SMTP voor het versturen van emails</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="enabled">Ingeschakeld</Label>
                  <Switch
                    id="enabled"
                    checked={settings.enabled}
                    onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SMTP Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Server</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Poort</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Gebruikersnaam</Label>
                  <Input
                    id="smtp_user"
                    placeholder="uw@email.com"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="App wachtwoord"
                      value={settings.smtp_password}
                      onChange={(e) => setSettings({...settings, smtp_password: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_email">Afzender Email</Label>
                  <Input
                    id="from_email"
                    placeholder="noreply@facturatie.sr"
                    value={settings.from_email}
                    onChange={(e) => setSettings({...settings, from_email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_name">Afzender Naam</Label>
                  <Input
                    id="from_name"
                    placeholder="Facturatie.sr"
                    value={settings.from_name}
                    onChange={(e) => setSettings({...settings, from_name: e.target.value})}
                  />
                </div>
              </div>

              {/* TLS Settings */}
              <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Switch
                    id="use_tls"
                    checked={settings.use_tls}
                    onCheckedChange={(checked) => setSettings({...settings, use_tls: checked})}
                  />
                  <Label htmlFor="use_tls">Gebruik TLS</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="start_tls"
                    checked={settings.start_tls}
                    onCheckedChange={(checked) => setSettings({...settings, start_tls: checked})}
                  />
                  <Label htmlFor="start_tls">STARTTLS</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Admin Notificaties
              </CardTitle>
              <CardDescription>Ontvang emails bij belangrijke gebeurtenissen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  placeholder="admin@facturatie.sr"
                  value={settings.admin_email}
                  onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Nieuwe Klant</span>
                  </div>
                  <Switch
                    checked={settings.notify_new_customer}
                    onCheckedChange={(checked) => setSettings({...settings, notify_new_customer: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">Betaalverzoek</span>
                  </div>
                  <Switch
                    checked={settings.notify_payment_request}
                    onCheckedChange={(checked) => setSettings({...settings, notify_payment_request: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Module Verloopt</span>
                  </div>
                  <Switch
                    checked={settings.notify_module_expiring}
                    onCheckedChange={(checked) => setSettings({...settings, notify_module_expiring: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !settings.enabled || !settings.smtp_host}
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bezig...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Test Email Versturen</>
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opslaan...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Instellingen Opslaan</>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Beschikbare email templates in het systeem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div 
                    key={template.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{template.subject}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Verzendlog</CardTitle>
                  <CardDescription>Overzicht van verzonden emails</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={logsLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  Vernieuwen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nog geen emails verzonden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === 'sent' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{log.to_email}</p>
                          <p className="text-xs text-muted-foreground">{log.subject}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                          {log.status === 'sent' ? 'Verzonden' : 'Mislukt'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.sent_at || log.attempted_at).toLocaleString('nl-NL')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
