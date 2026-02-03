import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Mail, 
  Server, 
  Send, 
  Save, 
  Loader2, 
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmailSettingsCustomer() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [settings, setSettings] = useState({
    enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    use_tls: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user/email-settings`, {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/user/email-settings`, {
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
      const response = await fetch(`${API_URL}/api/user/email-settings/test`, {
        method: 'POST',
        headers: {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Instellingen
            </CardTitle>
            <CardDescription>
              Configureer uw eigen SMTP server om emails te versturen vanuit uw modules
            </CardDescription>
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
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Met uw eigen email server kunt u facturen en herinneringen versturen naar uw klanten 
            vanuit uw eigen emailadres. Voor Gmail: gebruik een App Wachtwoord.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_host">SMTP Server</Label>
            <Input
              id="smtp_host"
              placeholder="smtp.gmail.com"
              value={settings.smtp_host || ''}
              onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
            />
            <p className="text-xs text-muted-foreground">
              Gmail: smtp.gmail.com | Outlook: smtp.office365.com
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_port">Poort</Label>
            <Input
              id="smtp_port"
              type="number"
              placeholder="587"
              value={settings.smtp_port}
              onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value) || 587})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_user">Email / Gebruikersnaam</Label>
            <Input
              id="smtp_user"
              placeholder="uw@email.com"
              value={settings.smtp_user || ''}
              onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_password">Wachtwoord / App Wachtwoord</Label>
            <div className="relative">
              <Input
                id="smtp_password"
                type={showPassword ? "text" : "password"}
                placeholder="App wachtwoord"
                value={settings.smtp_password || ''}
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
              placeholder="uw@bedrijf.com"
              value={settings.from_email || ''}
              onChange={(e) => setSettings({...settings, from_email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_name">Afzender Naam</Label>
            <Input
              id="from_name"
              placeholder="Uw Bedrijfsnaam"
              value={settings.from_name || ''}
              onChange={(e) => setSettings({...settings, from_name: e.target.value})}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <Switch
            id="use_tls"
            checked={settings.use_tls}
            onCheckedChange={(checked) => setSettings({...settings, use_tls: checked})}
          />
          <Label htmlFor="use_tls">Gebruik TLS/SSL beveiligde verbinding</Label>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !settings.enabled || !settings.smtp_host}
          >
            {testing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bezig...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Test Email</>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opslaan...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Opslaan</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
