import React, { useState, useEffect } from 'react';
import { settingsAPI, bedrijvenAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { 
  Settings, 
  Building2, 
  Loader2, 
  Save, 
  Mail, 
  Send, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Palette,
  Eye,
  Plus,
  Trash2,
  Check,
  Building,
  Bell,
  Clock,
  Play,
  Upload,
  Image,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InstellingenPage = () => {
  const [settings, setSettings] = useState({
    bedrijfsnaam: '',
    adres: '',
    plaats: '',
    land: 'Suriname',
    telefoon: '',
    email: '',
    btw_nummer: '',
    kvk_nummer: '',
    bank_naam: '',
    bank_rekening: '',
    logo_url: '',
    factuur_voorwaarden: '',
    standaard_betalingstermijn: 30,
    // SMTP instellingen
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    // Factuur template instellingen
    factuur_primaire_kleur: '#1e293b',
    factuur_secundaire_kleur: '#f1f5f9',
    factuur_template: 'standaard',
    // Automatische herinneringen
    auto_herinneringen_enabled: false,
    dagen_voor_eerste_herinnering: 7,
    dagen_tussen_herinneringen: 7,
    max_herinneringen: 3
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [triggeringCheck, setTriggeringCheck] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Multi-tenant state
  const [bedrijven, setBedrijven] = useState([]);
  const [actiefBedrijf, setActiefBedrijf] = useState(null);
  const [bedrijvenLoading, setBedrijvenLoading] = useState(false);
  const [showNewBedrijfDialog, setShowNewBedrijfDialog] = useState(false);
  const [newBedrijf, setNewBedrijf] = useState({ naam: '', adres: '', plaats: '', btw_nummer: '' });
  const [savingBedrijf, setSavingBedrijf] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBedrijven();
    fetchSchedulerStatus();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Alleen JPG, PNG, GIF of WEBP bestanden zijn toegestaan');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bestand is te groot (max 5MB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/boekhouding/upload-image`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({ ...settings, logo_url: data.url });
        toast.success('Logo geüpload');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij uploaden logo');
      }
    } catch (error) {
      toast.error('Fout bij uploaden logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings({ ...settings, logo_url: '' });
    toast.info('Logo verwijderd (sla instellingen op om te bevestigen)');
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/herinneringen/scheduler-status`, {
        headers: { ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setSchedulerStatus(data);
      }
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    }
  };

  const triggerReminderCheck = async () => {
    setTriggeringCheck(true);
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/herinneringen/trigger-check`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Controle uitgevoerd: ${data.reminders_created} herinneringen aangemaakt, ${data.emails_sent} e-mails verzonden`);
        fetchSchedulerStatus();
      } else {
        toast.error('Fout bij uitvoeren controle');
      }
    } catch (error) {
      toast.error('Fout bij uitvoeren controle');
    } finally {
      setTriggeringCheck(false);
    }
  };

  const fetchBedrijven = async () => {
    setBedrijvenLoading(true);
    try {
      const [allRes, actiefRes] = await Promise.all([
        bedrijvenAPI.getAll(),
        bedrijvenAPI.getActief()
      ]);
      setBedrijven(allRes.data || []);
      setActiefBedrijf(actiefRes.data);
    } catch (error) {
      console.error('Error loading bedrijven:', error);
    } finally {
      setBedrijvenLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getCompany();
      if (response.data) {
        setSettings(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Fout bij laden instellingen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateCompany(settings);
      toast.success('Instellingen succesvol opgeslagen');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fout bij opslaan instellingen');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    // Valideer SMTP-velden
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      toast.error('Vul eerst alle SMTP-velden in');
      return;
    }

    setTestingEmail(true);
    setEmailTestResult(null);
    
    try {
      // Eerst opslaan, dan testen
      await settingsAPI.updateCompany(settings);
      const response = await settingsAPI.testEmail();
      
      // Check response for success/error from backend
      if (response.data?.success === false) {
        setEmailTestResult({ success: false, message: response.data?.error || 'Test e-mail mislukt' });
        toast.error(response.data?.error || 'Test e-mail mislukt');
      } else {
        setEmailTestResult({ success: true, message: response.data?.message || 'Test e-mail verzonden!' });
        toast.success(response.data?.message || 'Test e-mail succesvol verzonden!');
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.response?.data?.detail || 'Test e-mail mislukt';
      setEmailTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTestingEmail(false);
    }
  };

  // Multi-tenant functies
  const handleCreateBedrijf = async () => {
    if (!newBedrijf.naam) {
      toast.error('Bedrijfsnaam is verplicht');
      return;
    }
    
    setSavingBedrijf(true);
    try {
      await bedrijvenAPI.create(newBedrijf);
      toast.success('Bedrijf aangemaakt');
      setNewBedrijf({ naam: '', adres: '', plaats: '', btw_nummer: '' });
      setShowNewBedrijfDialog(false);
      fetchBedrijven();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Fout bij aanmaken bedrijf');
    } finally {
      setSavingBedrijf(false);
    }
  };

  const handleActiveerBedrijf = async (bedrijfId) => {
    try {
      await bedrijvenAPI.activeer(bedrijfId);
      toast.success('Bedrijf geactiveerd - data wordt nu gefilterd op dit bedrijf');
      fetchBedrijven();
      // Refresh instellingen voor nieuwe bedrijf
      fetchSettings();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Fout bij activeren bedrijf');
    }
  };

  const handleDeleteBedrijf = async (bedrijfId) => {
    if (!window.confirm('Weet u zeker dat u dit bedrijf wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return;
    }
    
    try {
      await bedrijvenAPI.delete(bedrijfId);
      toast.success('Bedrijf verwijderd');
      fetchBedrijven();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Fout bij verwijderen bedrijf');
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

  const templates = [
    { value: 'standaard', label: 'Standaard', description: 'Klassiek professioneel ontwerp' },
    { value: 'modern', label: 'Modern', description: 'Strak en minimalistisch' },
    { value: 'kleurrijk', label: 'Kleurrijk', description: 'Met accent kleuren' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="instellingen-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="instellingen-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Instellingen</h1>
          <p className="text-slate-500 mt-0.5">Beheer uw bedrijfsgegevens, e-mail en factuurinstellingen</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          data-testid="save-settings-btn"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Alle Instellingen Opslaan
        </Button>
      </div>

      <Tabs defaultValue="bedrijf" className="space-y-6">
        <TabsList className="bg-slate-100/80">
          <TabsTrigger value="bedrijf" className="gap-2">
            <Building2 className="w-4 h-4" />
            Bedrijf
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            E-mail (SMTP)
          </TabsTrigger>
          <TabsTrigger value="herinneringen" className="gap-2">
            <Bell className="w-4 h-4" />
            Herinneringen
          </TabsTrigger>
          <TabsTrigger value="factuur" className="gap-2">
            <FileText className="w-4 h-4" />
            Factuur
          </TabsTrigger>
          <TabsTrigger value="multi-tenant" className="gap-2">
            <Building className="w-4 h-4" />
            Bedrijven
          </TabsTrigger>
        </TabsList>

        {/* Bedrijfsgegevens Tab */}
        <TabsContent value="bedrijf" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Algemene Info */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Bedrijfsgegevens</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Algemene informatie over uw bedrijf</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bedrijfsnaam *</Label>
                  <Input
                    value={settings.bedrijfsnaam || ''}
                    onChange={(e) => setSettings({...settings, bedrijfsnaam: e.target.value})}
                    placeholder="Uw bedrijfsnaam"
                    data-testid="company-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres</Label>
                  <Input
                    value={settings.adres || ''}
                    onChange={(e) => setSettings({...settings, adres: e.target.value})}
                    placeholder="Straat en nummer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plaats</Label>
                    <Input
                      value={settings.plaats || ''}
                      onChange={(e) => setSettings({...settings, plaats: e.target.value})}
                      placeholder="Paramaribo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Land</Label>
                    <Input
                      value={settings.land || 'Suriname'}
                      onChange={(e) => setSettings({...settings, land: e.target.value})}
                      placeholder="Suriname"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefoon</Label>
                    <Input
                      value={settings.telefoon || ''}
                      onChange={(e) => setSettings({...settings, telefoon: e.target.value})}
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
              </CardContent>
            </Card>

            {/* Registratie & Bank */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Registratie & Bank</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Fiscale en bankgegevens</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BTW-nummer</Label>
                    <Input
                      value={settings.btw_nummer || ''}
                      onChange={(e) => setSettings({...settings, btw_nummer: e.target.value})}
                      placeholder="BTW123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KvK-nummer</Label>
                    <Input
                      value={settings.kvk_nummer || ''}
                      onChange={(e) => setSettings({...settings, kvk_nummer: e.target.value})}
                      placeholder="12345678"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Input
                    value={settings.bank_naam || ''}
                    onChange={(e) => setSettings({...settings, bank_naam: e.target.value})}
                    placeholder="Bijv. Hakrinbank, DSB"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rekeningnummer</Label>
                  <Input
                    value={settings.bank_rekening || ''}
                    onChange={(e) => setSettings({...settings, bank_rekening: e.target.value})}
                    placeholder="SR00HAKR0000000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Standaard Betalingstermijn (dagen)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.standaard_betalingstermijn || 30}
                    onChange={(e) => setSettings({...settings, standaard_betalingstermijn: parseInt(e.target.value) || 30})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bedrijfslogo Card */}
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Image className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Bedrijfslogo</CardTitle>
                  <CardDescription className="text-sm text-slate-500">Upload uw logo voor facturen en documenten</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  {settings.logo_url ? (
                    <div className="relative group">
                      <img 
                        src={settings.logo_url.startsWith('http') ? settings.logo_url : `${API_URL}${settings.logo_url}`}
                        alt="Bedrijfslogo"
                        className="w-40 h-40 object-contain border border-slate-200 rounded-lg bg-white p-2"
                        data-testid="company-logo-preview"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Logo verwijderen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-40 h-40 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                      <div className="text-center text-slate-400">
                        <Image className="w-10 h-10 mx-auto mb-2" />
                        <span className="text-xs">Geen logo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-slate-700">Logo uploaden</Label>
                    <p className="text-sm text-slate-500 mt-1 mb-3">
                      Upload een logo (JPG, PNG, GIF of WEBP, max 5MB). Dit logo verschijnt op uw facturen en andere documenten.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        disabled={uploadingLogo}
                        onClick={() => document.getElementById('logo-upload-input').click()}
                        data-testid="upload-logo-btn"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploadingLogo ? 'Uploaden...' : 'Logo Kiezen'}
                      </Button>
                      <input
                        id="logo-upload-input"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      {settings.logo_url && (
                        <Button 
                          variant="ghost" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleRemoveLogo}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Of URL invoeren */}
                  <div className="pt-4 border-t border-slate-100">
                    <Label className="text-slate-700">Of voer een URL in</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={settings.logo_url || ''}
                        onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
                        placeholder="https://example.com/logo.png"
                        className="flex-1"
                        data-testid="logo-url-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-mail (SMTP) Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">E-mail Server Instellingen (SMTP)</CardTitle>
                  <CardDescription className="text-sm text-slate-500">
                    Configureer uw eigen SMTP-server om facturen en herinneringen te versturen.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>SMTP Server *</Label>
                    <Input
                      value={settings.smtp_host || ''}
                      onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                      placeholder="smtp.gmail.com"
                      data-testid="smtp-host-input"
                    />
                    <p className="text-xs text-slate-500">
                      Gmail: smtp.gmail.com | Outlook: smtp.office365.com
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Poort</Label>
                    <Input
                      type="number"
                      value={settings.smtp_port || 587}
                      onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value) || 587})}
                      placeholder="587"
                      data-testid="smtp-port-input"
                    />
                    <p className="text-xs text-slate-500">
                      TLS: 587 (aanbevolen) | SSL: 465
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>SMTP Gebruikersnaam *</Label>
                    <Input
                      value={settings.smtp_user || ''}
                      onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                      placeholder="uw.email@gmail.com"
                      data-testid="smtp-user-input"
                    />
                    <p className="text-xs text-slate-500">
                      Meestal uw volledige e-mailadres
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Wachtwoord *</Label>
                    <Input
                      type="password"
                      value={settings.smtp_password || ''}
                      onChange={(e) => setSettings({...settings, smtp_password: e.target.value})}
                      placeholder="••••••••"
                      data-testid="smtp-password-input"
                    />
                    <p className="text-xs text-slate-500">
                      Voor Gmail: gebruik een App-wachtwoord
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-900 mb-4">Afzender Gegevens</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Afzender E-mail</Label>
                    <Input
                      type="email"
                      value={settings.smtp_from_email || ''}
                      onChange={(e) => setSettings({...settings, smtp_from_email: e.target.value})}
                      placeholder="facturen@uwbedrijf.sr"
                    />
                    <p className="text-xs text-slate-500">
                      Laat leeg om SMTP gebruikersnaam te gebruiken
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Afzender Naam</Label>
                    <Input
                      value={settings.smtp_from_name || ''}
                      onChange={(e) => setSettings({...settings, smtp_from_name: e.target.value})}
                      placeholder="Uw Bedrijf"
                    />
                    <p className="text-xs text-slate-500">
                      Naam die ontvangers zien
                    </p>
                  </div>
                </div>
              </div>

              {/* Test E-mail Section */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-slate-900">Test E-mail Versturen</h4>
                    <p className="text-sm text-slate-500">
                      Verstuur een test e-mail naar uw eigen adres om de configuratie te verifiëren
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={testingEmail || !settings.smtp_host || !settings.smtp_user || !settings.smtp_password}
                    data-testid="test-email-btn"
                  >
                    {testingEmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Test Versturen
                  </Button>
                </div>

                {emailTestResult && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${
                    emailTestResult.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {emailTestResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={emailTestResult.success ? 'text-green-800' : 'text-red-800'}>
                      {emailTestResult.message}
                    </span>
                  </div>
                )}
              </div>

              {/* Gmail Help */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h5 className="font-medium text-slate-900 mb-2">Gmail Configuratie Hulp</h5>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Ga naar uw Google Account Instellingen</li>
                  <li>Zoek naar "App-wachtwoorden" onder Beveiliging</li>
                  <li>Genereer een nieuw wachtwoord voor "Mail"</li>
                  <li>Gebruik dit wachtwoord als SMTP wachtwoord</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Automatische Herinneringen Tab */}
        <TabsContent value="herinneringen" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Instellingen */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Automatische Herinneringen</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Automatisch herinneringen versturen bij vervallen facturen</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Automatische herinneringen inschakelen</Label>
                    <p className="text-xs text-slate-500 mt-1">Dagelijks om 08:00 (Suriname tijd) worden vervallen facturen gecontroleerd</p>
                  </div>
                  <Switch
                    checked={settings.auto_herinneringen_enabled}
                    onCheckedChange={(checked) => setSettings({...settings, auto_herinneringen_enabled: checked})}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="dagen_voor_eerste_herinnering">Dagen na vervaldatum voor eerste herinnering</Label>
                    <Input
                      id="dagen_voor_eerste_herinnering"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.dagen_voor_eerste_herinnering}
                      onChange={(e) => setSettings({...settings, dagen_voor_eerste_herinnering: parseInt(e.target.value) || 7})}
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Na hoeveel dagen over de vervaldatum de eerste herinnering wordt verzonden</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="dagen_tussen_herinneringen">Dagen tussen herinneringen</Label>
                    <Input
                      id="dagen_tussen_herinneringen"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.dagen_tussen_herinneringen}
                      onChange={(e) => setSettings({...settings, dagen_tussen_herinneringen: parseInt(e.target.value) || 7})}
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Aantal dagen tussen escalatie (eerste → tweede → aanmaning)</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="max_herinneringen">Maximum aantal herinneringen</Label>
                    <Select 
                      value={String(settings.max_herinneringen)} 
                      onValueChange={(v) => setSettings({...settings, max_herinneringen: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 herinnering</SelectItem>
                        <SelectItem value="2">2 herinneringen</SelectItem>
                        <SelectItem value="3">3 herinneringen (incl. aanmaning)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Na dit aantal stopt de automatische opvolging</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Scheduler Status</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Huidige status en statistieken</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedulerStatus ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className={`text-lg font-semibold ${schedulerStatus.auto_herinneringen_enabled ? 'text-green-600' : 'text-slate-400'}`}>
                          {schedulerStatus.auto_herinneringen_enabled ? 'Actief' : 'Uitgeschakeld'}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">SMTP</p>
                        <p className={`text-lg font-semibold ${schedulerStatus.smtp_configured ? 'text-green-600' : 'text-red-500'}`}>
                          {schedulerStatus.smtp_configured ? 'Geconfigureerd' : 'Niet geconfigureerd'}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Facturen over vervaldatum</p>
                        <p className="text-2xl font-semibold text-slate-900">{schedulerStatus.facturen_over_vervaldatum}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Herinneringen vandaag</p>
                        <p className="text-2xl font-semibold text-slate-900">{schedulerStatus.herinneringen_vandaag}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Volgende automatische controle</p>
                      <p className="text-sm font-medium text-blue-900">{schedulerStatus.next_run}</p>
                    </div>
                    
                    <Button 
                      onClick={triggerReminderCheck} 
                      disabled={triggeringCheck}
                      className="w-full"
                      variant="outline"
                    >
                      {triggeringCheck ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Nu controleren
                    </Button>
                    
                    {!schedulerStatus.smtp_configured && (
                      <div className="p-4 bg-amber-50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">SMTP niet geconfigureerd</p>
                          <p className="text-xs text-amber-700 mt-1">
                            Herinneringen worden wel aangemaakt, maar e-mails kunnen niet worden verzonden. 
                            Configureer SMTP in de E-mail tab.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Info Card */}
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Hoe werkt automatische herinneringen?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-amber-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Eerste herinnering</p>
                    <p className="text-sm text-slate-500">Vriendelijke herinnering na {settings.dagen_voor_eerste_herinnering} dagen over vervaldatum</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Tweede herinnering</p>
                    <p className="text-sm text-slate-500">Dringender verzoek na nog eens {settings.dagen_tussen_herinneringen} dagen</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-red-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Aanmaning</p>
                    <p className="text-sm text-slate-500">Laatste waarschuwing met vermelding van incassomaatregelen</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Factuur Template Tab */}
        <TabsContent value="factuur" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Keuze */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Factuur Template</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Kies het uiterlijk van uw facturen</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {templates.map(template => (
                    <label 
                      key={template.value}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        settings.factuur_template === template.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.value}
                        checked={settings.factuur_template === template.value}
                        onChange={(e) => setSettings({...settings, factuur_template: e.target.value})}
                        className="w-4 h-4 text-primary"
                      />
                      <div>
                        <span className="font-medium text-slate-900">{template.label}</span>
                        <p className="text-sm text-slate-500">{template.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Kleuren */}
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Kleuren</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Pas de kleuren van uw facturen aan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primaire Kleur</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.factuur_primaire_kleur || '#1e293b'}
                      onChange={(e) => setSettings({...settings, factuur_primaire_kleur: e.target.value})}
                      className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                    />
                    <Input
                      value={settings.factuur_primaire_kleur || '#1e293b'}
                      onChange={(e) => setSettings({...settings, factuur_primaire_kleur: e.target.value})}
                      placeholder="#1e293b"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Voor kopteksten en accenten</p>
                </div>
                <div className="space-y-2">
                  <Label>Secundaire Kleur</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.factuur_secundaire_kleur || '#f1f5f9'}
                      onChange={(e) => setSettings({...settings, factuur_secundaire_kleur: e.target.value})}
                      className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                    />
                    <Input
                      value={settings.factuur_secundaire_kleur || '#f1f5f9'}
                      onChange={(e) => setSettings({...settings, factuur_secundaire_kleur: e.target.value})}
                      placeholder="#f1f5f9"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Voor achtergronden en subtiele elementen</p>
                </div>

                {/* Voorbeeld */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <Label className="mb-3 block">Voorbeeld</Label>
                  <div 
                    className="rounded-lg p-4 border"
                    style={{ backgroundColor: settings.factuur_secundaire_kleur || '#f1f5f9' }}
                  >
                    <div 
                      className="text-lg font-bold mb-2"
                      style={{ color: settings.factuur_primaire_kleur || '#1e293b' }}
                    >
                      FACTUUR #VF2024-00001
                    </div>
                    <div className="text-sm text-slate-600">
                      {settings.bedrijfsnaam || 'Uw Bedrijf'}
                    </div>
                    <div 
                      className="mt-3 py-2 px-3 rounded text-white text-sm font-medium inline-block"
                      style={{ backgroundColor: settings.factuur_primaire_kleur || '#1e293b' }}
                    >
                      Totaal: SRD 1.250,00
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Factuur Voorwaarden */}
            <Card className="bg-white border border-slate-100 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Factuur Voorwaarden</CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Standaard tekst die onderaan elke factuur wordt getoond
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.factuur_voorwaarden || ''}
                  onChange={(e) => setSettings({...settings, factuur_voorwaarden: e.target.value})}
                  placeholder="Bijv. Betaling binnen 30 dagen. Bij te late betaling wordt wettelijke rente in rekening gebracht."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Multi-Tenant / Bedrijven Tab */}
        <TabsContent value="multi-tenant" className="space-y-6">
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Building className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Bedrijven Beheer</CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                      Beheer meerdere bedrijven vanuit één account.
                    </CardDescription>
                  </div>
                </div>
                <Dialog open={showNewBedrijfDialog} onOpenChange={setShowNewBedrijfDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-bedrijf-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Nieuw Bedrijf
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuw Bedrijf Toevoegen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Bedrijfsnaam *</Label>
                        <Input
                          value={newBedrijf.naam}
                          onChange={(e) => setNewBedrijf({...newBedrijf, naam: e.target.value})}
                          placeholder="Bedrijf B.V."
                          data-testid="new-bedrijf-naam"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adres</Label>
                        <Input
                          value={newBedrijf.adres}
                          onChange={(e) => setNewBedrijf({...newBedrijf, adres: e.target.value})}
                          placeholder="Straat en nummer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Plaats</Label>
                          <Input
                            value={newBedrijf.plaats}
                            onChange={(e) => setNewBedrijf({...newBedrijf, plaats: e.target.value})}
                            placeholder="Paramaribo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>BTW-nummer</Label>
                          <Input
                            value={newBedrijf.btw_nummer}
                            onChange={(e) => setNewBedrijf({...newBedrijf, btw_nummer: e.target.value})}
                            placeholder="BTW123456"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewBedrijfDialog(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleCreateBedrijf} disabled={savingBedrijf}>
                        {savingBedrijf ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Toevoegen
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {bedrijvenLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : bedrijven.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nog geen bedrijven aangemaakt
                </div>
              ) : (
                <div className="space-y-3">
                  {bedrijven.map((bedrijf) => (
                    <div 
                      key={bedrijf.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        bedrijf.is_actief 
                          ? 'border-primary bg-primary/5' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      data-testid={`bedrijf-item-${bedrijf.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          bedrijf.is_actief ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{bedrijf.naam}</span>
                            {bedrijf.is_actief && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                Actief
                              </span>
                            )}
                            {bedrijf.is_default && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                                Standaard
                              </span>
                            )}
                          </div>
                          {(bedrijf.adres || bedrijf.plaats) && (
                            <p className="text-sm text-slate-500">
                              {[bedrijf.adres, bedrijf.plaats].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!bedrijf.is_actief && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActiveerBedrijf(bedrijf.id)}
                            data-testid={`activeer-bedrijf-${bedrijf.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Activeren
                          </Button>
                        )}
                        {!bedrijf.is_actief && bedrijven.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteBedrijf(bedrijf.id)}
                            data-testid={`delete-bedrijf-${bedrijf.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Hoe werkt Multi-Tenant?</h5>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Elk bedrijf heeft volledig gescheiden data (facturen, klanten, etc.)</li>
                  <li>Het actieve bedrijf bepaalt welke data u ziet en bewerkt</li>
                  <li>U kunt eenvoudig wisselen door een ander bedrijf te activeren</li>
                  <li>Rapporten en exports zijn altijd voor het actieve bedrijf</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="lg"
          data-testid="save-all-settings-btn"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Alle Instellingen Opslaan
        </Button>
      </div>
    </div>
  );
};

export default InstellingenPage;
