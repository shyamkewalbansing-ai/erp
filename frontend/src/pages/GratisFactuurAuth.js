import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Building2, Phone, ArrowRight, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GratisFactuurAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    bedrijfsnaam: '',
    telefoon: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const body = mode === 'login' 
        ? { email: formData.email, password: formData.password }
        : formData;
      
      const response = await fetch(`${API_URL}/api/invoice/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Er is iets fout gegaan');
      }
      
      // Save token and user
      localStorage.setItem('invoice_token', data.token);
      localStorage.setItem('invoice_user', JSON.stringify(data.user));
      
      toast.success(mode === 'login' ? 'Welkom terug!' : 'Account aangemaakt!');
      navigate('/invoice/dashboard');
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img 
              src="https://customer-assets.emergentagent.com/job_suriname-rentals/artifacts/ltu8gy30_logo_dark_1760568268.webp"
              alt="Facturatie.sr"
              className="h-10 w-auto mx-auto brightness-0 invert"
            />
          </Link>
          <p className="text-slate-400 mt-2">Gratis Factuur & Offerte Generator</p>
        </div>
        
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
          </h1>
          <p className="text-slate-500 text-center mb-6">
            {mode === 'login' 
              ? 'Log in om uw facturen te beheren' 
              : 'Maak gratis een account aan'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Bedrijfsnaam *"
                    value={formData.bedrijfsnaam}
                    onChange={(e) => setFormData({...formData, bedrijfsnaam: e.target.value})}
                    className="pl-10 h-12"
                    required
                  />
                </div>
                
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="Telefoonnummer"
                    value={formData.telefoon}
                    onChange={(e) => setFormData({...formData, telefoon: e.target.value})}
                    className="pl-10 h-12"
                  />
                </div>
              </>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="email"
                placeholder="E-mailadres *"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="pl-10 h-12"
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="password"
                placeholder="Wachtwoord *"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="pl-10 h-12"
                required
                minLength={6}
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  {mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-slate-500">
              {mode === 'login' ? 'Nog geen account?' : 'Al een account?'}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="ml-2 text-teal-600 font-medium hover:text-teal-700"
              >
                {mode === 'login' ? 'Registreren' : 'Inloggen'}
              </button>
            </p>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link
              to="/invoice"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <User className="w-4 h-4" />
              Doorgaan zonder account
            </Link>
          </div>
        </div>
        
        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-white/80">
            <p className="text-2xl font-bold text-white">∞</p>
            <p className="text-sm">Onbeperkt facturen</p>
          </div>
          <div className="text-white/80">
            <p className="text-2xl font-bold text-white">100%</p>
            <p className="text-sm">Gratis</p>
          </div>
          <div className="text-white/80">
            <p className="text-2xl font-bold text-white">✓</p>
            <p className="text-sm">Email versturen</p>
          </div>
        </div>
      </div>
    </div>
  );
}
