import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, ArrowRight, Loader2, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import api from '../lib/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Wachtwoord succesvol gewijzigd!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Fout bij resetten wachtwoord');
      toast.error(err.response?.data?.detail || 'Fout bij resetten wachtwoord');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Wachtwoord Gewijzigd!</h1>
          <p className="text-muted-foreground mb-6">
            Uw wachtwoord is succesvol gewijzigd. U kunt nu inloggen met uw nieuwe wachtwoord.
          </p>
          <Button onClick={() => navigate('/login')} className="rounded-full" data-testid="go-to-login">
            Naar Inloggen
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Ongeldig</h1>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/login')} className="rounded-full w-full" data-testid="back-to-login">
              Terug naar Inloggen
            </Button>
            <p className="text-sm text-muted-foreground">
              Vraag een nieuwe reset link aan via de inlogpagina.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp" 
            alt="Facturatie N.V." 
            className="h-12 w-auto mx-auto mb-6"
          />
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Nieuw Wachtwoord</h1>
          <p className="text-muted-foreground">
            Kies een nieuw wachtwoord voor uw account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nieuw Wachtwoord</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                required
                minLength={6}
                data-testid="new-password-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimaal 6 tekens</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Bevestig Wachtwoord</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12"
                required
                data-testid="confirm-password-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-full"
            disabled={loading}
            data-testid="reset-password-submit"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Wachtwoord Wijzigen
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Back to login */}
        <p className="mt-8 text-center text-muted-foreground">
          Wachtwoord herinnerd?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
