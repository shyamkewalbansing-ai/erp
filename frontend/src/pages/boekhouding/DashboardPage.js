import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, Calculator, Users, Building2, Wallet, AlertCircle, 
  ArrowUpRight, ArrowDownRight, TrendingUp, FileText, Receipt,
  Plus, BarChart3, CreditCard, BookOpen, Calendar, Activity,
  DollarSign, Euro, Banknote
} from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (amount, currency = 'SRD') => {
  return `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

export default function BoekhoudingDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const currentDate = new Date().toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/boekhouding/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Kon dashboard niet laden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border-red-200 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <Button onClick={loadDashboard} variant="outline" size="sm">Opnieuw proberen</Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalDebiteuren = Object.values(data?.openstaande_debiteuren || {}).reduce((a, b) => a + b, 0);
  const totalCrediteuren = Object.values(data?.openstaande_crediteuren || {}).reduce((a, b) => a + b, 0);
  const totalBankSaldi = Object.values(data?.bank_saldi || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8" data-testid="boekhouding-dashboard">
      {/* Hero Header - Same style as Vastgoed */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Decorative Blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/30 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-sm mb-4">
              <Calendar className="w-4 h-4" />
              {currentDate}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Welkom terug, <span className="text-emerald-400">{user?.name?.split(' ')[0] || 'Gebruiker'}</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Hier is een overzicht van uw financiële administratie
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {user?.logo && (
              <img 
                src={user.logo} 
                alt="Logo" 
                className="h-20 w-auto object-contain bg-white/10 backdrop-blur-sm rounded-2xl p-3"
              />
            )}
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/app/boekhouding/handleiding')}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Handleiding
              </Button>
              <Button 
                onClick={() => navigate('/app/boekhouding/verkoopfacturen')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Factuur
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Te Ontvangen - Featured Card */}
        <div className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Te Ontvangen (Debiteuren)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{formatCurrency(totalDebiteuren, 'SRD')}</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ArrowUpRight className="w-7 h-7" />
              </div>
            </div>
            
            {/* Currency Breakdown */}
            <div className="flex items-center gap-4 text-sm">
              {Object.entries(data?.openstaande_debiteuren || {}).map(([currency, amount]) => (
                amount > 0 && (
                  <span key={currency} className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                    {currency === 'SRD' && <Banknote className="w-4 h-4" />}
                    {currency === 'USD' && <DollarSign className="w-4 h-4" />}
                    {currency === 'EUR' && <Euro className="w-4 h-4" />}
                    {formatCurrency(amount, currency)}
                  </span>
                )
              ))}
              {totalDebiteuren === 0 && (
                <span className="bg-white/20 px-3 py-1.5 rounded-full">Geen openstaand</span>
              )}
            </div>
          </div>
        </div>

        {/* Te Betalen Card */}
        <div 
          className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/boekhouding/crediteuren')}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Schulden</Badge>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">Te Betalen</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCrediteuren, 'SRD')}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.crediteuren_count || 0} crediteuren</p>
          </div>
        </div>

        {/* Bank Saldi Card */}
        <div 
          className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/boekhouding/bankrekeningen')}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Wallet className="w-6 h-6" />
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Bank</Badge>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">Bank Saldi</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBankSaldi, 'SRD')}</p>
            <div className="flex gap-2 mt-2">
              {Object.entries(data?.bank_saldi || {}).map(([currency, amount]) => (
                amount > 0 && (
                  <Badge key={currency} variant="outline" className={`text-xs ${
                    currency === 'SRD' ? 'text-emerald-600 border-emerald-500/30' :
                    currency === 'USD' ? 'text-blue-600 border-blue-500/30' :
                    'text-purple-600 border-purple-500/30'
                  }`}>
                    {currency}
                  </Badge>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Snelle Acties
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              onClick={() => navigate('/app/boekhouding/verkoopfacturen')}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-600 transition-all">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Factuur Maken</span>
            </button>
            <button 
              onClick={() => navigate('/app/boekhouding/debiteuren')}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center text-blue-600 transition-all">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Debiteuren</span>
            </button>
            <button 
              onClick={() => navigate('/app/boekhouding/bankrekeningen')}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center text-purple-600 transition-all">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Bank/Kas</span>
            </button>
            <button 
              onClick={() => navigate('/app/boekhouding/rapportages')}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-600 transition-all">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Rapportages</span>
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl bg-card border border-border/50 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Overzicht
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Debiteuren</span>
              </div>
              <span className="text-lg font-bold">{data?.debiteuren_count || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm font-medium">Crediteuren</span>
              </div>
              <span className="text-lg font-bold">{data?.crediteuren_count || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm font-medium">Vervallen</span>
              </div>
              <span className={`text-lg font-bold ${data?.vervallen_facturen > 0 ? 'text-red-500' : ''}`}>
                {data?.vervallen_facturen || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">Hulp nodig?</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
              Bekijk onze uitgebreide handleiding voor stap-voor-stap instructies over alle boekhoudkundige functies.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/app/boekhouding/handleiding')}
              className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/50"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Naar Handleiding
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
