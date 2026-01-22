import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Building2, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welkom terug!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=85"
          alt="Modern apartment"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Beheer uw vastgoed met gemak</h2>
          <p className="text-lg text-white/80">
            De complete oplossing voor verhuurbeheer in Suriname. 
            Beheer huurders, appartementen en betalingen op één plek.
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
              className="h-6 w-auto"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welkom terug</h2>
            <p className="text-muted-foreground">
              Log in om uw verhuurportfolio te beheren
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  data-testid="login-email"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-input border-transparent focus:border-primary"
                  required
                  data-testid="login-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 btn-scale"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  Inloggen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-center text-muted-foreground">
            Nog geen account?{' '}
            <Link 
              to="/register" 
              className="text-primary font-medium hover:underline"
              data-testid="register-link"
            >
              Registreer hier
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
