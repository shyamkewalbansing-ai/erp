import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, uploadLogo, deleteLogo, getMyAddons } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Settings,
  ChevronRight,
  Camera,
  KeyRound,
  Send,
  LayoutList,
  Home,
  Users,
  Car,
  Sparkles,
  Fuel,
  Calculator
} from 'lucide-react';
import EmailSettingsCustomer from '../components/EmailSettingsCustomer';
import SidebarOrderSettings from '../components/SidebarOrderSettings';
import {
  VastgoedSettingsForm,
  HRMSettingsForm,
  AutoDealerSettingsForm,
  BeautySpaSettingsForm,
  PompstationSettingsForm,
  BoekhoudingSettingsForm
} from '../components/settings';

// System settings - always visible
const systemSettingsNav = [
  { id: 'profile', icon: User, label: 'Profiel', description: 'Naam, e-mail en bedrijfsgegevens', category: 'system' },
  { id: 'logo', icon: ImageIcon, label: 'Logo', description: 'Bedrijfslogo uploaden', category: 'system' },
  { id: 'sidebar', icon: LayoutList, label: 'Sidebar Volgorde', description: 'Module volgorde aanpassen', category: 'system' },
  { id: 'email', icon: Send, label: 'Email', description: 'SMTP instellingen voor facturen', category: 'system' },
  { id: 'security', icon: Shield, label: 'Beveiliging', description: 'Wachtwoord wijzigen', category: 'system' },
];

// Module-specific settings - only visible when module is active
const moduleSettingsConfig = {
  vastgoed_beheer: {
    id: 'vastgoed',
    icon: Home,
    label: 'Vastgoed Instellingen',
    description: 'Huurinstellingen en betaaltermijnen',
    addon_slug: 'vastgoed_beheer'
  },
  hrm: {
    id: 'hrm',
    icon: Users,
    label: 'HRM Instellingen',
    description: 'Personeelsinstellingen en verlofregels',
    addon_slug: 'hrm'
  },
  autodealer: {
    id: 'autodealer',
    icon: Car,
    label: 'Auto Dealer Instellingen',
    description: 'Voertuigbeheer en verkoopinstellingen',
    addon_slug: 'autodealer'
  },
  beauty: {
    id: 'beauty',
    icon: Sparkles,
    label: 'Beauty Spa Instellingen',
    description: 'Behandelingen en reserveringsinstellingen',
    addon_slug: 'beauty'
  },
  pompstation: {
    id: 'pompstation',
    icon: Fuel,
    label: 'Pompstation Instellingen',
    description: 'Brandstofprijzen en tankinstellingen',
    addon_slug: 'pompstation'
  },
  boekhouding: {
    id: 'boekhouding',
    icon: Calculator,
    label: 'Boekhouding Instellingen',
    description: 'BTW-tarieven en valuta-instellingen',
    addon_slug: 'boekhouding'
  }
};

export default function Instellingen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [activeAddons, setActiveAddons] = useState([]);
  const fileInputRef = useRef(null);
  
  // Profile form
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    company_name: '',
    logo: null
  });
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
    loadActiveAddons();
  }, []);

  const isSuperAdmin = user?.role === 'superadmin';

  const loadActiveAddons = async () => {
    try {
      // Superadmin has access to all modules
      if (isSuperAdmin) {
        setActiveAddons(['vastgoed_beheer', 'hrm', 'autodealer', 'beauty', 'pompstation', 'boekhouding']);
        return;
      }
      
      const res = await getMyAddons();
      const activeSlugs = res.data
        .filter(a => a.status === 'active' || a.status === 'trial')
        .map(a => a.addon_slug);
      setActiveAddons(activeSlugs);
    } catch {
      setActiveAddons([]);
    }
  };

  const hasAddon = (slug) => {
    // Boekhouding is always active (free module)
    if (slug === 'boekhouding') return true;
    return activeAddons.includes(slug);
  };

  // Get dynamic navigation items based on active modules
  const getSettingsNav = () => {
    const nav = [...systemSettingsNav];
    
    // Add module-specific settings
    Object.values(moduleSettingsConfig).forEach(config => {
      if (hasAddon(config.addon_slug)) {
        nav.push({
          id: config.id,
          icon: config.icon,
          label: config.label,
          description: config.description,
          category: 'module'
        });
      }
    });
    
    return nav;
  };

  const loadProfile = async () => {
    try {
      const response = await getProfile();
      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        company_name: response.data.company_name || '',
        logo: response.data.logo || null
      });
    } catch (error) {
      toast.error('Fout bij het laden van profiel');
    } finally {
      setLoading(false);
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
      toast.success('Logo verwijderd');
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij het verwijderen van logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: profile.name,
        company_name: profile.company_name
      });
      toast.success('Profiel opgeslagen');
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Wachtwoord gewijzigd');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij wijzigen wachtwoord');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const settingsNav = getSettingsNav();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
          <p className="text-muted-foreground text-sm">Beheer uw account en module instellingen</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Settings Navigation */}
        <Card className="h-fit border-border/50">
          <CardContent className="p-2">
            {/* System Settings */}
            <div className="mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Systeem
              </p>
              {settingsNav.filter(item => item.category === 'system').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ml-auto flex-shrink-0 transition-transform ${activeSection === item.id ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>

            {/* Module Settings */}
            {settingsNav.filter(item => item.category === 'module').length > 0 && (
              <div className="border-t border-border/50 pt-2 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                  Module Instellingen
                </p>
                {settingsNav.filter(item => item.category === 'module').map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      activeSection === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ml-auto flex-shrink-0 transition-transform ${activeSection === item.id ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profiel Instellingen
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Beheer uw persoonlijke en bedrijfsgegevens
                </p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Naam
                    </Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      E-mailadres
                    </Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="border-border/50 bg-muted/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Bedrijfsnaam
                  </Label>
                  <Input
                    id="company"
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    className="border-border/50"
                  />
                </div>
                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button onClick={handleSaveProfile} disabled={saving} className="bg-primary hover:bg-primary/90">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logo Section */}
          {activeSection === 'logo' && (
            <Card className="border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Bedrijfslogo
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Upload uw bedrijfslogo voor facturen en documenten
                </p>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    {profile.logo ? (
                      <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-muted/30 border-2 border-dashed border-border/50 p-2">
                        <img 
                          src={profile.logo} 
                          alt="Logo" 
                          className="w-full h-full object-contain rounded-xl"
                        />
                        <button
                          onClick={handleDeleteLogo}
                          disabled={uploadingLogo}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground">Geen logo</span>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    variant="outline"
                    className="gap-2"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {profile.logo ? 'Logo Wijzigen' : 'Logo Uploaden'}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Aanbevolen: Vierkante afbeelding (PNG of JPG). Maximum 2MB.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sidebar Order Section */}
          {activeSection === 'sidebar' && (
            <SidebarOrderSettings />
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
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-muted-foreground" />
                      Huidig wachtwoord
                    </Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        className="pr-10 border-border/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Nieuw wachtwoord
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        className="pr-10 border-border/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Bevestig nieuw wachtwoord
                    </Label>
                    <Input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="border-border/50"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={saving || !passwordForm.current_password || !passwordForm.new_password}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                    Wachtwoord Wijzigen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ==================== MODULE SPECIFIC SETTINGS ==================== */}

          {/* Vastgoed Beheer Settings */}
          {activeSection === 'vastgoed' && hasAddon('vastgoed_beheer') && (
            <VastgoedSettingsForm />
          )}

          {/* HRM Settings */}
          {activeSection === 'hrm' && hasAddon('hrm') && (
            <HRMSettingsForm />
          )}

          {/* Auto Dealer Settings */}
          {activeSection === 'autodealer' && hasAddon('autodealer') && (
            <AutoDealerSettingsForm />
          )}

          {/* Beauty Spa Settings */}
          {activeSection === 'beauty' && hasAddon('beauty') && (
            <BeautySpaSettingsForm />
          )}

          {/* Pompstation Settings */}
          {activeSection === 'pompstation' && hasAddon('pompstation') && (
            <PompstationSettingsForm />
          )}

          {/* Boekhouding Settings */}
          {activeSection === 'boekhouding' && (
            <BoekhoudingSettingsForm />
          )}
        </div>
      </div>
    </div>
  );
}
