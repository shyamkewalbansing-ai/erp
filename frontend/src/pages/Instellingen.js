import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword, uploadLogo, deleteLogo, getMyAddons } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
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
  Calculator,
  CreditCard,
  Banknote,
  Wallet,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import EmailSettingsCustomer from '../components/EmailSettingsCustomer';
import SidebarOrderSettings from '../components/SidebarOrderSettings';
import {
  VastgoedSettingsForm,
  HRMSettingsForm,
  AutoDealerSettingsForm,
  BeautySpaSettingsForm
} from '../components/settings';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Betaalmethodes Content Component
function BetaalmethodesContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('bank_transfer');

  const [bankSettings, setBankSettings] = useState({
    is_enabled: true,
    is_default: true,
    bank_name: '',
    account_holder: '',
    account_number: '',
    iban: '',
    swift_bic: '',
    description: '',
    instructions: 'Maak het bedrag over naar onderstaande bankrekening met vermelding van het factuurnummer.'
  });

  const [mopeSettings, setMopeSettings] = useState({
    is_enabled: false,
    test_token: '',
    live_token: '',
    use_live_mode: false,
    merchant_id: '',
    instructions: 'Klik op de betaalknop om via Mope te betalen.'
  });

  const [cashSettings, setCashSettings] = useState({
    is_enabled: true,
    instructions: 'Betaal contant bij het kantoor.'
  });

  const [chequeSettings, setChequeSettings] = useState({
    is_enabled: false,
    instructions: 'Schrijf de cheque uit op naam van het bedrijf.'
  });

  const fetchSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payment-methods/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const methods = response.data.payment_methods || [];
      
      methods.forEach(method => {
        if (method.method_id === 'bank_transfer') {
          setBankSettings({
            is_enabled: method.is_enabled || false,
            is_default: method.is_default || false,
            bank_name: method.bank_settings?.bank_name || '',
            account_holder: method.bank_settings?.account_holder || '',
            account_number: method.bank_settings?.account_number || '',
            iban: method.bank_settings?.iban || '',
            swift_bic: method.bank_settings?.swift_bic || '',
            description: method.bank_settings?.description || '',
            instructions: method.instructions || ''
          });
        } else if (method.method_id === 'mope') {
          setMopeSettings({
            is_enabled: method.is_enabled || false,
            test_token: method.mope_settings?.test_token || '',
            live_token: method.mope_settings?.live_token || '',
            use_live_mode: method.mope_settings?.use_live_mode || false,
            merchant_id: method.mope_settings?.merchant_id || '',
            instructions: method.instructions || ''
          });
        } else if (method.method_id === 'cash') {
          setCashSettings({
            is_enabled: method.is_enabled || false,
            instructions: method.instructions || ''
          });
        } else if (method.method_id === 'cheque') {
          setChequeSettings({
            is_enabled: method.is_enabled || false,
            instructions: method.instructions || ''
          });
        }
      });
      
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Fout bij laden van betaalinstellingen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const paymentMethods = [
        {
          method_id: 'bank_transfer',
          name: 'Bankoverschrijving',
          is_enabled: bankSettings.is_enabled,
          is_default: bankSettings.is_default,
          description: 'Betalen via bankoverschrijving',
          instructions: bankSettings.instructions,
          bank_settings: {
            bank_name: bankSettings.bank_name,
            account_holder: bankSettings.account_holder,
            account_number: bankSettings.account_number,
            iban: bankSettings.iban,
            swift_bic: bankSettings.swift_bic,
            description: bankSettings.description
          }
        },
        {
          method_id: 'mope',
          name: 'Mope',
          is_enabled: mopeSettings.is_enabled,
          is_default: false,
          description: 'Online betalen via Mope',
          instructions: mopeSettings.instructions,
          mope_settings: {
            is_enabled: mopeSettings.is_enabled,
            test_token: mopeSettings.test_token,
            live_token: mopeSettings.live_token,
            use_live_mode: mopeSettings.use_live_mode,
            merchant_id: mopeSettings.merchant_id
          }
        },
        {
          method_id: 'cash',
          name: 'Contant',
          is_enabled: cashSettings.is_enabled,
          is_default: false,
          description: 'Contante betaling',
          instructions: cashSettings.instructions
        },
        {
          method_id: 'cheque',
          name: 'Cheque',
          is_enabled: chequeSettings.is_enabled,
          is_default: false,
          description: 'Betalen per cheque',
          instructions: chequeSettings.instructions
        }
      ];
      
      await axios.put(
        `${API_URL}/payment-methods/settings`,
        {
          payment_methods: paymentMethods,
          default_method: bankSettings.is_default ? 'bank_transfer' : 
                         (mopeSettings.is_enabled ? 'mope' : 'bank_transfer')
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Betaalinstellingen opgeslagen');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fout bij opslaan van instellingen');
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

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Betaalmethodes
            </h2>
            <p className="text-muted-foreground mt-1">
              Configureer de betaalmethodes voor alle modules
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Opslaan
          </Button>
        </div>
      </div>
      <CardContent className="p-6">
        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            De geconfigureerde betaalmethodes worden automatisch beschikbaar in alle modules 
            (Vastgoed, HRM, Auto Dealer, etc.) voor facturen, kwitanties en andere betalingen.
          </p>
        </div>

        {/* Payment Methods Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
            <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="mope" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Mope</span>
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              <span className="hidden sm:inline">Contant</span>
            </TabsTrigger>
            <TabsTrigger value="cheque" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Cheque</span>
            </TabsTrigger>
          </TabsList>

          {/* Bank Transfer Tab */}
          <TabsContent value="bank_transfer" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Bankoverschrijving</p>
                  <p className="text-sm text-muted-foreground">Betaling via bankrekening</p>
                </div>
              </div>
              <Switch
                checked={bankSettings.is_enabled}
                onCheckedChange={(checked) => setBankSettings({...bankSettings, is_enabled: checked})}
              />
            </div>
            
            {bankSettings.is_enabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Banknaam</Label>
                  <Input
                    value={bankSettings.bank_name}
                    onChange={(e) => setBankSettings({...bankSettings, bank_name: e.target.value})}
                    placeholder="Bijv. Hakrinbank"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rekeninghouder</Label>
                  <Input
                    value={bankSettings.account_holder}
                    onChange={(e) => setBankSettings({...bankSettings, account_holder: e.target.value})}
                    placeholder="Naam van de rekeninghouder"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rekeningnummer</Label>
                  <Input
                    value={bankSettings.account_number}
                    onChange={(e) => setBankSettings({...bankSettings, account_number: e.target.value})}
                    placeholder="Uw rekeningnummer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN (optioneel)</Label>
                  <Input
                    value={bankSettings.iban}
                    onChange={(e) => setBankSettings({...bankSettings, iban: e.target.value})}
                    placeholder="Internationaal rekeningnummer"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Instructies voor klant</Label>
                  <Textarea
                    value={bankSettings.instructions}
                    onChange={(e) => setBankSettings({...bankSettings, instructions: e.target.value})}
                    placeholder="Instructies die op de factuur worden getoond"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Mope Tab */}
          <TabsContent value="mope" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Mope Betaling</p>
                  <p className="text-sm text-muted-foreground">Online betalen via Mope</p>
                </div>
              </div>
              <Switch
                checked={mopeSettings.is_enabled}
                onCheckedChange={(checked) => setMopeSettings({...mopeSettings, is_enabled: checked})}
              />
            </div>
            
            {mopeSettings.is_enabled && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Mope integratie is binnenkort beschikbaar
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <Input
                      value={mopeSettings.merchant_id}
                      onChange={(e) => setMopeSettings({...mopeSettings, merchant_id: e.target.value})}
                      placeholder="Uw Mope Merchant ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Test Token</Label>
                    <Input
                      type="password"
                      value={mopeSettings.test_token}
                      onChange={(e) => setMopeSettings({...mopeSettings, test_token: e.target.value})}
                      placeholder="Test API token"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Cash Tab */}
          <TabsContent value="cash" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Contante Betaling</p>
                  <p className="text-sm text-muted-foreground">Betaling in contanten</p>
                </div>
              </div>
              <Switch
                checked={cashSettings.is_enabled}
                onCheckedChange={(checked) => setCashSettings({...cashSettings, is_enabled: checked})}
              />
            </div>
            
            {cashSettings.is_enabled && (
              <div className="space-y-2">
                <Label>Instructies voor klant</Label>
                <Textarea
                  value={cashSettings.instructions}
                  onChange={(e) => setCashSettings({...cashSettings, instructions: e.target.value})}
                  placeholder="Instructies voor contante betaling"
                  rows={2}
                />
              </div>
            )}
          </TabsContent>

          {/* Cheque Tab */}
          <TabsContent value="cheque" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Cheque Betaling</p>
                  <p className="text-sm text-muted-foreground">Betaling per cheque</p>
                </div>
              </div>
              <Switch
                checked={chequeSettings.is_enabled}
                onCheckedChange={(checked) => setChequeSettings({...chequeSettings, is_enabled: checked})}
              />
            </div>
            
            {chequeSettings.is_enabled && (
              <div className="space-y-2">
                <Label>Instructies voor klant</Label>
                <Textarea
                  value={chequeSettings.instructions}
                  onChange={(e) => setChequeSettings({...chequeSettings, instructions: e.target.value})}
                  placeholder="Instructies voor cheque betaling"
                  rows={2}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// System settings - always visible
const systemSettingsNav = [
  { id: 'profile', icon: User, label: 'Profiel', description: 'Naam, e-mail en bedrijfsgegevens', category: 'system' },
  { id: 'logo', icon: ImageIcon, label: 'Logo', description: 'Bedrijfslogo uploaden', category: 'system' },
  { id: 'sidebar', icon: LayoutList, label: 'Sidebar Volgorde', description: 'Module volgorde aanpassen', category: 'system' },
  { id: 'betaalmethodes', icon: CreditCard, label: 'Betaalmethodes', description: 'Betaalmethodes beheren', category: 'system' },
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeSection, setActiveSection] = useState(searchParams.get('tab') || 'profile');
  const [activeAddons, setActiveAddons] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  
  const isSuperAdmin = user?.role === 'superadmin';
  
  // Update active section when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveSection(tab);
    }
  }, [searchParams]);
  
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

  // Load profile photo from user
  useEffect(() => {
    if (user?.profile_photo) {
      setProfilePhoto(user.profile_photo);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
    loadActiveAddons();
  }, [user]);

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
    // Superadmin has access to all modules
    if (isSuperAdmin) return true;
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo is te groot. Maximum 5MB toegestaan.');
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Alleen JPG, PNG en WebP bestanden zijn toegestaan');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bestand is te groot (max 5MB)');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/user/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePhoto(data.photo_url);
        toast.success('Profielfoto geüpload');
        if (refreshUser) await refreshUser();
      } else {
        toast.error('Fout bij uploaden foto');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fout bij uploaden foto');
    } finally {
      setUploadingPhoto(false);
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
                {/* Profile Photo */}
                <div className="flex flex-col items-center gap-3 pb-6 border-b border-border/50">
                  <div className="relative">
                    {profilePhoto || user?.profile_photo ? (
                      <img 
                        src={profilePhoto || user?.profile_photo} 
                        alt="Profiel" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-3xl font-bold border-4 border-primary/20">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Klik op het camera icoon om uw profielfoto te wijzigen (JPG, PNG of WebP, max 5MB)</p>
                </div>

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
                  {/* Logo Preview - Same style as Dashboard */}
                  <div className="flex flex-col items-center gap-4">
                    {profile.logo ? (
                      <div className="relative">
                        <div className="bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm rounded-2xl p-4">
                          <img 
                            src={profile.logo} 
                            alt="Logo" 
                            className="h-20 w-auto object-contain max-w-[200px]"
                          />
                        </div>
                        <button
                          onClick={handleDeleteLogo}
                          disabled={uploadingLogo}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-48 h-24 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
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
                    Aanbevolen: Vierkante afbeelding (PNG of JPG). Maximum 5MB.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sidebar Order Section */}
          {activeSection === 'sidebar' && (
            <SidebarOrderSettings />
          )}

          {/* Betaalmethodes Section */}
          {activeSection === 'betaalmethodes' && (
            <BetaalmethodesContent />
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
