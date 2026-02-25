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
      const [dashboardRes, exposureRes] = await Promise.all([
        api.get('/boekhouding/dashboard'),
        api.get('/rapportages/valuta/exposure').catch(() => ({ data: null }))
      ]);
      setData(dashboardRes.data);
      setExposure(exposureRes.data);
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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="boekhouding-dashboard">
      {/* Hero Header - Responsive */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Decorative Blurs - Hidden on mobile for performance */}
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-emerald-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-blue-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col gap-4 sm:gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="truncate">{currentDate}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Welkom terug, <span className="text-emerald-400">{user?.name?.split(' ')[0] || 'Gebruiker'}</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Hier is een overzicht van uw financiële administratie
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {user?.logo && (
              <img 
                src={user.logo} 
                alt="Logo" 
                className="h-12 sm:h-16 lg:h-20 w-auto object-contain bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-3"
              />
            )}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => navigate('/app/boekhouding/handleiding')}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 text-xs sm:text-sm"
              >
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Handleiding</span>
                <span className="xs:hidden">Help</span>
              </Button>
              <Button 
                onClick={() => navigate('/app/boekhouding/verkoopfacturen')}
                size="sm"
                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Nieuwe Factuur</span>
                <span className="xs:hidden">Factuur</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Te Ontvangen - Featured Card */}
        <div className="sm:col-span-2 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Te Ontvangen (Debiteuren)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold truncate">{formatCurrency(totalDebiteuren, 'SRD')}</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ml-2">
                <ArrowUpRight className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
            </div>
            
            {/* Currency Breakdown - Scrollable on mobile */}
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm overflow-x-auto pb-1 scrollbar-hide">
              {Object.entries(data?.openstaande_debiteuren || {}).map(([currency, amount]) => (
                amount > 0 && (
                  <span key={currency} className="flex items-center gap-1 sm:gap-2 bg-white/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap flex-shrink-0">
                    {currency === 'SRD' && <Banknote className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {currency === 'USD' && <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {currency === 'EUR' && <Euro className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {formatCurrency(amount, currency)}
                  </span>
                )
              ))}
              {totalDebiteuren === 0 && (
                <span className="bg-white/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap">Geen openstaand</span>
              )}
            </div>
          </div>
        </div>

        {/* Te Betalen Card */}
        <div 
          className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/boekhouding/crediteuren')}
        >
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">Schulden</Badge>
          </div>
          
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Te Betalen</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{formatCurrency(totalCrediteuren, 'SRD')}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.crediteuren_count || 0} crediteuren</p>
          </div>
        </div>

        {/* Bank Saldi Card */}
        <div 
          className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/boekhouding/bankrekeningen')}
        >
          <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">Bank</Badge>
          </div>
          
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Bank Saldi</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{formatCurrency(totalBankSaldi, 'SRD')}</p>
            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
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

      {/* Quick Actions & Info Row - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            Snelle Acties
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <button 
              onClick={() => navigate('/app/boekhouding/verkoopfacturen')}
              className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-600 transition-all">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Factuur</span>
            </button>
            <button 
              onClick={() => navigate('/app/boekhouding/debiteuren')}
              className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/20 transition-all group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center text-blue-600 transition-all">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Debiteuren</span>
            </button>
            <button 
              onClick={() => navigate('/app/boekhouding/bankrekeningen')}
              className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/20 transition-all group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center text-purple-600 transition-all">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Bank/Kas</span>
            </button>
            <button 
              onClick={() => navigate('/app/boekhouding/rapportages')}
              className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/20 transition-all group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-600 transition-all">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Rapportages</span>
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            Overzicht
          </h3>
          <div className="space-y-2 sm:space-y-4">
            <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Debiteuren</span>
              </div>
              <span className="text-base sm:text-lg font-bold">{data?.debiteuren_count || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Crediteuren</span>
              </div>
              <span className="text-base sm:text-lg font-bold">{data?.crediteuren_count || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Vervallen</span>
              </div>
              <span className={`text-base sm:text-lg font-bold ${data?.vervallen_facturen > 0 ? 'text-red-500' : ''}`}>
                {data?.vervallen_facturen || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Card - Responsive */}
      <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm sm:text-base mb-1">Hulp nodig?</h3>
            <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mb-2 sm:mb-3">
              Bekijk onze uitgebreide handleiding voor stap-voor-stap instructies over alle boekhoudkundige functies.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/app/boekhouding/handleiding')}
              className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/50 text-xs sm:text-sm"
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Naar Handleiding
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
