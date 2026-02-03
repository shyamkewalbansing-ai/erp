import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, uploadLogo, deleteLogo, updateRentSettings } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  User, 
  Lock, 
  Mail, 
  Building2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  ImageIcon,
  Upload,
  Trash2,
  Calendar,
  Clock,
  Settings,
  ChevronRight,
  Camera,
  KeyRound,
  Bell,
  Palette,
  Send
} from 'lucide-react';
import EmailSettingsCustomer from '../components/EmailSettingsCustomer';

// Settings navigation items
const settingsNav = [
  { id: 'profile', icon: User, label: 'Profiel', description: 'Naam, e-mail en bedrijfsgegevens' },
  { id: 'logo', icon: ImageIcon, label: 'Logo', description: 'Bedrijfslogo uploaden' },
  { id: 'rent', icon: Calendar, label: 'Huurinstellingen', description: 'Betaaldagen en termijnen' },
  { id: 'email', icon: Send, label: 'Email', description: 'SMTP instellingen voor facturen' },
  { id: 'security', icon: Shield, label: 'Beveiliging', description: 'Wachtwoord wijzigen' },
];

export default function Instellingen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRent, setSavingRent] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const fileInputRef = useRef(null);
  
  // Profile form
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    company_name: '',
    logo: null
  });
  
  // Rent settings form
  const [rentSettings, setRentSettings] = useState({
    rent_due_day: 1,
    payment_frequency: 'monthly',
    grace_period_days: 5,
    payment_deadline_day: 0,
    payment_deadline_month_offset: 0
  });
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getProfile();
      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        company_name: response.data.company_name || '',
        logo: response.data.logo || null
      });
      setRentSettings({
        rent_due_day: response.data.rent_due_day || 1,
        payment_frequency: response.data.payment_frequency || 'monthly',
        grace_period_days: response.data.grace_period_days || 5,
        payment_deadline_day: response.data.payment_deadline_day || 0,
        payment_deadline_month_offset: response.data.payment_deadline_month_offset || 0
      });
    } catch (error) {
      toast.error('Fout bij het laden van profiel');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRentSettings = async () => {
    setSavingRent(true);
    try {
      await updateRentSettings(rentSettings);
      toast.success('Huurinstellingen opgeslagen');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSavingRent(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo is te groot. Maximum 2MB toegestaan.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Alleen afbeeldingen zijn toegestaan');
      return;
    }

    setUploadingLogo(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;
          await uploadLogo(base64Data);
          setProfile(prev => ({ ...prev, logo: base64Data }));
          toast.success('Logo succesvol geüpload');
          if (refreshUser) await refreshUser();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Fout bij het uploaden');
        } finally {
          setUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Fout bij het lezen van bestand');
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    setUploadingLogo(true);
    try {
      await deleteLogo();
      setProfile(prev => ({ ...prev, logo: null }));
      toast.success('Logo succesvol verwijderd');
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het verwijderen');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateProfile(profile);
      toast.success('Profiel succesvol bijgewerkt');
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het bijwerken');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Nieuwe wachtwoorden komen niet overeen');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Nieuw wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    
    setSaving(true);
    
    try {
      await changePassword(passwordForm.current_password, passwordForm.new_password);
      toast.success('Wachtwoord succesvol gewijzigd');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het wijzigen van wachtwoord');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredNav = user?.role === 'superadmin' 
    ? settingsNav.filter(item => item.id === 'profile' || item.id === 'security')
    : settingsNav;

  return (
    <div className="space-y-8 max-w-5xl mx-auto" data-testid="settings-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            Instellingen
          </h1>
          <p className="text-muted-foreground mt-1">Beheer uw account en voorkeuren</p>
        </div>
        
        {/* Account Badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {profile.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 overflow-hidden border-border/50">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      activeSection === item.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`nav-${item.id}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      activeSection === item.id ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      activeSection === item.id ? 'rotate-90' : ''
                    }`} />
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profiel Gegevens
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Wijzig uw persoonlijke informatie
                </p>
              </div>
              <CardContent className="p-6">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Volledige naam</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="pl-10 h-11"
                          placeholder="Uw naam"
                          data-testid="settings-name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">E-mailadres</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="pl-10 h-11"
                          placeholder="email@voorbeeld.com"
                          data-testid="settings-email"
                        />
                      </div>
                    </div>
                  </div>

                  {user?.role !== 'superadmin' && (
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-medium">Bedrijfsnaam</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="company"
                          value={profile.company_name}
                          onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                          className="pl-10 h-11"
                          placeholder="Bedrijfsnaam (optioneel)"
                          data-testid="settings-company"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-border/50">
                    <Button type="submit" disabled={saving} className="h-11 px-6" data-testid="save-profile-btn">
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Opslaan...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Wijzigingen Opslaan
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Logo Section */}
          {activeSection === 'logo' && user?.role !== 'superadmin' && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Bedrijfslogo
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Upload uw logo voor de sidebar en PDF documenten
                </p>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  {/* Logo Preview */}
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                      {profile.logo ? (
                        <img 
                          src={profile.logo} 
                          alt="Bedrijfslogo" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="text-center">
                          <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Geen logo</p>
                        </div>
                      )}
                    </div>
                    {profile.logo && (
                      <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleDeleteLogo}
                          disabled={uploadingLogo}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Upload Section */}
                  <div className="flex-1 space-y-4">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <h4 className="font-medium text-foreground mb-2">Upload nieuw logo</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                        <li>• Maximum bestandsgrootte: 2MB</li>
                        <li>• Ondersteunde formaten: PNG, JPG, SVG</li>
                        <li>• Aanbevolen: vierkant formaat (1:1)</li>
                      </ul>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                        data-testid="logo-input"
                      />
                      
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-full md:w-auto"
                        data-testid="upload-logo-btn"
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploaden...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {profile.logo ? 'Logo Vervangen' : 'Logo Uploaden'}
                          </>
                        )}
                      </Button>
                    </div>

                    {profile.logo && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDeleteLogo}
                        disabled={uploadingLogo}
                        className="text-destructive hover:text-destructive"
                        data-testid="delete-logo-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Logo Verwijderen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rent Settings Section */}
          {activeSection === 'rent' && user?.role !== 'superadmin' && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Huurinstellingen
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Configureer betaaldagen en betalingstermijnen
                </p>
              </div>
              <CardContent className="p-6 space-y-6">
                {/* Basic Settings */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Huur verschuldigd op</Label>
                    <Select 
                      value={String(rentSettings.rent_due_day)} 
                      onValueChange={(v) => setRentSettings({...rentSettings, rent_due_day: parseInt(v)})}
                    >
                      <SelectTrigger className="h-11" data-testid="rent-due-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(28)].map((_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}e van de maand
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Betalingsfrequentie</Label>
                    <Select 
                      value={rentSettings.payment_frequency} 
                      onValueChange={(v) => setRentSettings({...rentSettings, payment_frequency: v})}
                    >
                      <SelectTrigger className="h-11" data-testid="payment-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Maandelijks</SelectItem>
                        <SelectItem value="weekly">Wekelijks</SelectItem>
                        <SelectItem value="biweekly">Tweewekelijks</SelectItem>
                        <SelectItem value="quarterly">Per kwartaal</SelectItem>
                        <SelectItem value="yearly">Jaarlijks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Betalingstermijn</Label>
                    <Select 
                      value={String(rentSettings.grace_period_days)} 
                      onValueChange={(v) => setRentSettings({...rentSettings, grace_period_days: parseInt(v)})}
                    >
                      <SelectTrigger className="h-11" data-testid="grace-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Direct te laat</SelectItem>
                        <SelectItem value="3">3 dagen</SelectItem>
                        <SelectItem value="5">5 dagen</SelectItem>
                        <SelectItem value="7">7 dagen</SelectItem>
                        <SelectItem value="10">10 dagen</SelectItem>
                        <SelectItem value="14">14 dagen</SelectItem>
                        <SelectItem value="30">30 dagen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Deadline Settings */}
                <div className="p-5 rounded-xl bg-muted/30 border border-border/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Betaaldeadline</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Stel in wanneer de huur uiterlijk betaald moet zijn (bijv. &quot;Januari huur moet voor 6 februari betaald zijn&quot;)
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Deadline maand</Label>
                      <Select 
                        value={String(rentSettings.payment_deadline_month_offset)} 
                        onValueChange={(v) => setRentSettings({...rentSettings, payment_deadline_month_offset: parseInt(v)})}
                      >
                        <SelectTrigger className="h-11" data-testid="deadline-month-offset">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Dezelfde maand</SelectItem>
                          <SelectItem value="1">Volgende maand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Deadline dag</Label>
                      <Select 
                        value={String(rentSettings.payment_deadline_day)} 
                        onValueChange={(v) => setRentSettings({...rentSettings, payment_deadline_day: parseInt(v)})}
                      >
                        <SelectTrigger className="h-11" data-testid="deadline-day">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Niet ingesteld</SelectItem>
                          {[...Array(28)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}e
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Preview */}
                  {(rentSettings.payment_deadline_day > 0 || rentSettings.payment_deadline_month_offset > 0) && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm">
                        <span className="font-medium">Voorbeeld: </span>
                        Huur van januari moet uiterlijk{' '}
                        <span className="font-bold text-primary">
                          {rentSettings.payment_deadline_day || rentSettings.rent_due_day}{' '}
                          {rentSettings.payment_deadline_month_offset === 1 ? 'februari' : 'januari'}
                        </span>
                        {' '}betaald zijn.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button 
                    type="button" 
                    onClick={handleSaveRentSettings}
                    disabled={savingRent}
                    className="h-11 px-6"
                    data-testid="save-rent-settings"
                  >
                    {savingRent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opslaan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Instellingen Opslaan
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Section */}
          {activeSection === 'email' && (
            <EmailSettingsCustomer />
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Beveiliging
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Wijzig uw wachtwoord voor extra beveiliging
                </p>
              </div>
              <CardContent className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <KeyRound className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-600 dark:text-amber-400">Wachtwoord Tips</h4>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          <li>• Gebruik minimaal 6 tekens</li>
                          <li>• Combineer letters, cijfers en symbolen</li>
                          <li>• Gebruik niet uw naam of e-mailadres</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_password" className="text-sm font-medium">Huidig wachtwoord</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="current_password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                          className="pl-10 pr-10 h-11"
                          placeholder="Uw huidige wachtwoord"
                          data-testid="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new_password" className="text-sm font-medium">Nieuw wachtwoord</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="new_password"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                            className="pl-10 pr-10 h-11"
                            placeholder="Minimaal 6 tekens"
                            data-testid="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm_password" className="text-sm font-medium">Bevestig wachtwoord</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirm_password"
                            type="password"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                            className="pl-10 h-11"
                            placeholder="Herhaal nieuw wachtwoord"
                            data-testid="confirm-password"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/50">
                    <Button type="submit" disabled={saving} className="h-11 px-6" data-testid="change-password-btn">
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Wijzigen...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Wachtwoord Wijzigen
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
