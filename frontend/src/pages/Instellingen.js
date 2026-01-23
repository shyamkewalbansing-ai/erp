import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, uploadLogo, deleteLogo, updateRentSettings } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
  Clock
} from 'lucide-react';

export default function Instellingen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRent, setSavingRent] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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
      // Load rent settings
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

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo is te groot. Maximum 2MB toegestaan.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Alleen afbeeldingen zijn toegestaan');
      return;
    }

    setUploadingLogo(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;
          await uploadLogo(base64Data);
          setProfile(prev => ({ ...prev, logo: base64Data }));
          toast.success('Logo succesvol geüpload');
          if (refreshUser) {
            await refreshUser();
          }
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
      if (refreshUser) {
        await refreshUser();
      }
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
      if (refreshUser) {
        await refreshUser();
      }
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
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
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

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
        <p className="text-muted-foreground">Beheer uw account instellingen</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Account Informatie</CardTitle>
          </div>
          <CardDescription>
            {user?.role === 'superadmin' ? 'Super Administrator Account' : 'Klant Account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {profile.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{profile.name}</p>
              <p className="text-muted-foreground">{profile.email}</p>
              {user?.role === 'superadmin' && (
                <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  Super Admin
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Logo - Only for customers */}
      {user?.role !== 'superadmin' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <CardTitle>Bedrijfslogo</CardTitle>
            </div>
            <CardDescription>
              Upload uw logo voor de sidebar, dashboard en PDF kwitanties (max 2MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Logo Preview */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-accent/30 overflow-hidden">
                  {profile.logo ? (
                    <img 
                      src={profile.logo} 
                      alt="Bedrijfslogo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    {profile.logo ? 'Uw huidige logo' : 'Nog geen logo geüpload'}
                  </p>
                  <div className="flex gap-2">
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
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      data-testid="upload-logo-btn"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {profile.logo ? 'Wijzigen' : 'Uploaden'}
                    </Button>
                    {profile.logo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLogo}
                        disabled={uploadingLogo}
                        className="text-destructive hover:text-destructive"
                        data-testid="delete-logo-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Verwijderen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rent Settings - Only for customers */}
      {user?.role !== 'superadmin' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle>Huurinstellingen</CardTitle>
            </div>
            <CardDescription>
              Configureer wanneer huur verschuldigd is en de betalingsfrequentie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Huur verschuldigd op dag</Label>
                <Select 
                  value={String(rentSettings.rent_due_day)} 
                  onValueChange={(v) => setRentSettings({...rentSettings, rent_due_day: parseInt(v)})}
                >
                  <SelectTrigger data-testid="rent-due-day">
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
                <p className="text-xs text-muted-foreground">
                  Op welke dag van de maand is huur verschuldigd
                </p>
              </div>

              <div className="space-y-2">
                <Label>Betalingsfrequentie</Label>
                <Select 
                  value={rentSettings.payment_frequency} 
                  onValueChange={(v) => setRentSettings({...rentSettings, payment_frequency: v})}
                >
                  <SelectTrigger data-testid="payment-frequency">
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
                <p className="text-xs text-muted-foreground">
                  Hoe vaak huurders moeten betalen
                </p>
              </div>

              <div className="space-y-2">
                <Label>Betalingstermijn (dagen)</Label>
                <Select 
                  value={String(rentSettings.grace_period_days)} 
                  onValueChange={(v) => setRentSettings({...rentSettings, grace_period_days: parseInt(v)})}
                >
                  <SelectTrigger data-testid="grace-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Geen (direct te laat)</SelectItem>
                    <SelectItem value="3">3 dagen</SelectItem>
                    <SelectItem value="5">5 dagen</SelectItem>
                    <SelectItem value="7">7 dagen</SelectItem>
                    <SelectItem value="10">10 dagen</SelectItem>
                    <SelectItem value="14">14 dagen</SelectItem>
                    <SelectItem value="30">30 dagen</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Aantal dagen na vervaldatum voordat het als "te laat" telt
                </p>
              </div>
            </div>

            <Button 
              type="button" 
              onClick={handleSaveRentSettings}
              disabled={savingRent}
              data-testid="save-rent-settings"
            >
              {savingRent ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Huurinstellingen Opslaan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profiel Gegevens</CardTitle>
          </div>
          <CardDescription>
            Wijzig uw naam en e-mailadres
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="pl-10"
                  placeholder="Uw naam"
                  data-testid="settings-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  className="pl-10"
                  placeholder="email@voorbeeld.com"
                  data-testid="settings-email"
                />
              </div>
            </div>

            {user?.role !== 'superadmin' && (
              <div className="space-y-2">
                <Label htmlFor="company">Bedrijfsnaam</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="company"
                    value={profile.company_name}
                    onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                    className="pl-10"
                    placeholder="Bedrijfsnaam (optioneel)"
                    data-testid="settings-company"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={saving} data-testid="save-profile-btn">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Profiel Opslaan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle>Wachtwoord Wijzigen</CardTitle>
          </div>
          <CardDescription>
            Wijzig uw wachtwoord voor extra beveiliging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Huidig Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                  className="pl-10 pr-10"
                  placeholder="Uw huidige wachtwoord"
                  data-testid="current-password"
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
              <Label htmlFor="new_password">Nieuw Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                  className="pl-10 pr-10"
                  placeholder="Minimaal 6 tekens"
                  data-testid="new-password"
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
              <Label htmlFor="confirm_password">Bevestig Nieuw Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  className="pl-10"
                  placeholder="Herhaal nieuw wachtwoord"
                  data-testid="confirm-password"
                />
              </div>
            </div>

            <Button type="submit" variant="outline" disabled={saving} data-testid="change-password-btn">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wijzigen...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Wachtwoord Wijzigen
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
