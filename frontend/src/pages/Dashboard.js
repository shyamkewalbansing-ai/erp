import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboard, formatCurrency, getMyAddons, getModulePaymentStatus, submitModulePaymentRequest } from '../lib/api';
import { REFRESH_EVENTS } from '../lib/refreshEvents';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Banknote,
  Package,
  Sparkles,
  Copy,
  CheckCircle,
  AlertCircle,
  Calendar,
  Bell,
  ChevronRight,
  Activity,
  BarChart3,
  Zap,
  ArrowUp,
  ArrowDown,
  Eye,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVastgoedAddon, setHasVastgoedAddon] = useState(false);
  const [addonsChecked, setAddonsChecked] = useState(false);
  
  // Payment popup state
  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    checkAddonsAndFetch();
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      const response = await getModulePaymentStatus();
      setPaymentStatus(response.data);
      if (response.data.has_expired_modules) {
        setPaymentPopupOpen(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handleSubmitPaymentRequest = async () => {
    setSubmittingPayment(true);
    try {
      await submitModulePaymentRequest();
      toast.success('Betaalverzoek ingediend! We nemen contact met u op.');
      setPaymentPopupOpen(false);
    } catch (error) {
      toast.error('Fout bij indienen betaalverzoek');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const checkAddonsAndFetch = async () => {
    try {
      const addonsResponse = await getMyAddons();
      const addons = addonsResponse.data || [];
      const hasVastgoed = addons.some(addon => 
        addon.addon_slug === 'vastgoed_beheer' && 
        (addon.status === 'active' || addon.status === 'trial')
      );
      setHasVastgoedAddon(hasVastgoed);
      setAddonsChecked(true);
      
      if (hasVastgoed) {
        await fetchDashboard();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking addons:', error);
      setAddonsChecked(true);
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleRefresh = () => fetchDashboard();
    window.addEventListener(REFRESH_EVENTS.DASHBOARD, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENTS.DASHBOARD, handleRefresh);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-muted-foreground font-medium">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  // Welcome screen for users without vastgoed module
  if (addonsChecked && !hasVastgoedAddon) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center" data-testid="welcome-screen">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary via-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Package className="w-14 h-14 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce"></div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent mb-4">
            Welkom bij Facturatie.sr
          </h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Ontdek onze krachtige modules en activeer de functionaliteit die perfect past bij uw bedrijf.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/app/modules')}
              size="lg"
              className="bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Bekijk Modules
            </Button>
            <Button 
              onClick={() => navigate('/prijzen')}
              variant="outline"
              size="lg"
              className="border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Prijzen Bekijken
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const occupancyRate = stats?.total_apartments > 0 
    ? Math.round((stats?.occupied_apartments / stats?.total_apartments) * 100) 
    : 0;

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Hero Header */}
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
              Hier is een overzicht van uw verhuurportfolio
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
            <Button 
              onClick={() => navigate('/app/appartementen')}
              className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuw Appartement
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Occupancy Rate - Featured Card */}
        <div className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Bezettingsgraad</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{occupancyRate}%</span>
                  <span className="text-emerald-200 text-sm">bezet</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Activity className="w-7 h-7" />
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                  <Building2 className="w-4 h-4" />
                  {stats?.total_apartments || 0} totaal
                </span>
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {stats?.occupied_apartments || 0} bezet
                </span>
              </div>
              <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                <Zap className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
              <ArrowUp className="w-3 h-3" />
              +12%
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm font-medium">Inkomsten deze maand</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {formatCurrency(stats?.total_income_this_month || 0)}
          </p>
          
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground" onClick={() => navigate('/app/betalingen')}>
              Bekijk details
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Outstanding Card */}
        <div className={`group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:shadow-xl ${
          (stats?.total_outstanding || 0) > 0 
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-900 hover:shadow-orange-500/10' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-emerald-500/5'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              (stats?.total_outstanding || 0) > 0 
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/30' 
                : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/30'
            }`}>
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            {(stats?.total_outstanding || 0) > 0 && (
              <Badge className="bg-orange-500 text-white border-0 animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Actie
              </Badge>
            )}
          </div>
          
          <p className="text-muted-foreground text-sm font-medium">Openstaand</p>
          <p className={`text-3xl font-bold mt-1 ${
            (stats?.total_outstanding || 0) > 0 ? 'text-orange-600' : 'text-foreground'
          }`}>
            {formatCurrency((stats?.total_outstanding || 0) + (stats?.total_outstanding_loans || 0))}
          </p>
          
          {stats?.total_outstanding_loans > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Banknote className="w-3 h-3" />
              Incl. leningen: {formatCurrency(stats.total_outstanding_loans)}
            </p>
          )}
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cash Balance */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Kasgeld Saldo</p>
                <p className={`text-3xl font-bold ${
                  (stats?.total_kasgeld || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatCurrency(stats?.total_kasgeld || 0)}
                </p>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                (stats?.total_kasgeld || 0) >= 0 
                  ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50' 
                  : 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50'
              }`}>
                <Banknote className={`w-7 h-7 ${
                  (stats?.total_kasgeld || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground" onClick={() => navigate('/app/kasgeld')}>
                Beheren
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Deposits */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Borg in Beheer</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(stats?.total_deposits_held || 0)}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/50 dark:to-cyan-900/50 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-teal-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground" onClick={() => navigate('/app/borg')}>
                Bekijken
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground text-sm font-medium">Snelle Acties</p>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/app/huurders')}
                className="justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                Huurders
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/app/appartementen')}
                className="justify-start"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Panden
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/app/facturen')}
                className="justify-start"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Facturen
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/app/meterstanden')}
                className="justify-start"
              >
                <Zap className="w-4 h-4 mr-2" />
                Meters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Reminders & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reminders Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                Herinneringen
              </CardTitle>
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-semibold">
                {(stats?.reminders?.length || 0)} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {stats?.reminders && stats.reminders.length > 0 ? (
              <div className="space-y-3">
                {stats.reminders.slice(0, 5).map((reminder, index) => (
                  <div 
                    key={index}
                    className="group flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-transparent hover:border-orange-200 dark:hover:border-orange-900 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {reminder.title || reminder.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reminder.date || 'Vandaag'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-foreground font-medium">Alles in orde!</p>
                <p className="text-muted-foreground text-sm mt-1">Geen openstaande herinneringen</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                Recente Betalingen
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/betalingen')} className="text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                Alles bekijken
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {stats?.recent_payments && stats.recent_payments.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_payments.slice(0, 5).map((payment, index) => (
                  <div 
                    key={index}
                    className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {payment.tenant_name || 'Onbekend'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {payment.date || 'Recent'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        +{formatCurrency(payment.amount || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                        <ArrowUp className="w-3 h-3 text-emerald-500" />
                        Ontvangen
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-foreground font-medium">Geen betalingen</p>
                <p className="text-muted-foreground text-sm mt-1">Nog geen recente betalingen</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Popup Dialog */}
      <Dialog open={paymentPopupOpen} onOpenChange={setPaymentPopupOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              Proefperiode Verlopen
            </DialogTitle>
            <DialogDescription>
              Uw proefperiode is verlopen. Betaal om uw modules te blijven gebruiken.
            </DialogDescription>
          </DialogHeader>
          
          {paymentStatus && (
            <div className="space-y-4 mt-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h4 className="font-semibold text-orange-800 mb-2">Verlopen Modules:</h4>
                <div className="space-y-2">
                  {paymentStatus.expired_modules?.map((module, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-orange-700">{module.addon_name}</span>
                      <span className="font-medium text-orange-900">SRD {module.price?.toLocaleString('nl-NL')}/mnd</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-orange-200 mt-3 pt-3 flex justify-between">
                  <span className="font-semibold text-orange-900">Totaal:</span>
                  <span className="font-bold text-orange-900">SRD {paymentStatus.total_monthly_amount?.toLocaleString('nl-NL')}/mnd</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h4 className="font-semibold text-emerald-800 mb-3">Betaalgegevens:</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 text-sm">Bank:</span>
                    <span className="font-medium text-emerald-900">{paymentStatus.payment_info?.bank_name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 text-sm">Rekening:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-emerald-900">{paymentStatus.payment_info?.account_number || '-'}</span>
                      {paymentStatus.payment_info?.account_number && (
                        <button 
                          onClick={() => copyToClipboard(paymentStatus.payment_info?.account_number)}
                          className="p-1 hover:bg-emerald-200 rounded"
                        >
                          <Copy className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 text-sm">T.n.v.:</span>
                    <span className="font-medium text-emerald-900">{paymentStatus.payment_info?.account_holder || '-'}</span>
                  </div>
                </div>
                {paymentStatus.payment_info?.instructions && (
                  <p className="text-xs text-emerald-600 mt-3 pt-3 border-t border-emerald-200">
                    {paymentStatus.payment_info.instructions}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentPopupOpen(false)}
                  className="flex-1"
                >
                  Later
                </Button>
                <Button
                  onClick={handleSubmitPaymentRequest}
                  disabled={submittingPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {submittingPayment ? (
                    <>Bezig...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ik heb betaald
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
