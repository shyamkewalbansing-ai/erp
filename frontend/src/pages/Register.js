import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Building2, Mail, Lock, User, ArrowRight, Briefcase } from 'lucide-react';
import { getLandingSettings } from '../lib/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getLandingSettings().then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, companyName || undefined);
      toast.success('Account aangemaakt! U heeft 3 dagen gratis proefperiode.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src={settings?.register_image_url || "https://customer-assets.emergentagent.com/job_modular-erp-19/artifacts/kribqmjl_261F389D-0F54-4D61-963C-4B58A923ED3D.png"}
          alt="Facturatie ERP"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="text-3xl font-bold mb-3">Start vandaag met Facturatie N.V.</h2>
          <p className="text-base text-white/90">
            Maak een gratis account aan en ontdek onze bedrijfsmodules. 
            U krijgt 3 dagen gratis proefperiode om het platform te verkennen!
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
              alt="Facturatie N.V." 
              className="h-12 w-auto"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Account aanmaken</h2>
            <p className="text-muted-foreground">
              Vul uw gegevens in om te beginnen. Kies daarna de modules die u nodig heeft.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Volledige naam</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Jan Jansen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-input border-transparent focus:border-primary"
                  required
                  data-testid="register-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Bedrijfsnaam (optioneel)</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="company"
                  type="text"
                  placeholder="Uw bedrijfsnaam"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="pl-10 h-12 bg-input border-transparent focus:border-primary"
                  data-testid="register-company"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@voorbeeld.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-input border-transparent focus:border-primary"
                  required
                  data-testid="register-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimaal 6 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-input border-transparent focus:border-primary"
                  required
                  minLength={6}
                  data-testid="register-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 btn-scale"
              disabled={loading}
              data-testid="register-submit"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  Account aanmaken
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-muted-foreground">
            Heeft u al een account?{' '}
            <Link 
              to="/login" 
              className="text-primary font-medium hover:underline"
              data-testid="login-link"
            >
              Log hier in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
