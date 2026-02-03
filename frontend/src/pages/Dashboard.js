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
  PieChart,
  BarChart3
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
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto"></div>
            <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-muted-foreground">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  // Welcome screen for users without vastgoed module
  if (addonsChecked && !hasVastgoedAddon) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center" data-testid="welcome-screen">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/25">
            <Package className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Welkom bij Facturatie.sr
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Ontdek onze modules en activeer de functionaliteit die past bij uw bedrijf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate('/app/modules')}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Bekijk Modules
            </Button>
            <Button 
              onClick={() => navigate('/prijzen')}
              variant="outline"
              size="lg"
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

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 lg:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2">
              <Calendar className="w-4 h-4" />
              {currentDate}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              Welkom terug, {user?.name?.split(' ')[0] || 'Gebruiker'}
            </h1>
            <p className="text-slate-400 mt-1">
              Hier is een overzicht van uw verhuurportfolio
            </p>
          </div>
          
          {user?.logo && (
            <img 
              src={user.logo} 
              alt="Logo" 
              className="h-16 w-auto object-contain bg-white/10 rounded-xl p-2"
            />
          )}
        </div>
      </div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Primary Stats */}
        <div className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white border-0">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>
            <p className="text-emerald-100 text-sm">Totaal Appartementen</p>
            <p className="text-4xl font-bold mt-1">{stats?.total_apartments || 0}</p>
            <div className="flex items-center gap-2 mt-3 text-emerald-100 text-sm">
              <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                <Users className="w-3 h-3" />
                {stats?.occupied_apartments || 0} bezet
              </span>
              <span>{stats?.available_apartments || 0} beschikbaar</span>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              Deze maand
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Inkomsten</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {formatCurrency(stats?.total_income_this_month || 0)}
          </p>
        </div>

        {/* Outstanding Card */}
        <div className={`group rounded-2xl p-6 border transition-all hover:shadow-lg ${
          (stats?.total_outstanding || 0) > 0 
            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 hover:shadow-orange-500/10' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-emerald-500/5'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              (stats?.total_outstanding || 0) > 0 
                ? 'bg-orange-100 dark:bg-orange-900/30' 
                : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              <CreditCard className={`w-6 h-6 ${
                (stats?.total_outstanding || 0) > 0 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-slate-600 dark:text-slate-400'
              }`} />
            </div>
            {(stats?.total_outstanding || 0) > 0 && (
              <Badge variant="destructive" className="bg-orange-500">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Actie vereist
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Openstaand</p>
          <p className={`text-3xl font-bold mt-1 ${
            (stats?.total_outstanding || 0) > 0 ? 'text-orange-600' : 'text-foreground'
          }`}>
            {formatCurrency((stats?.total_outstanding || 0) + (stats?.total_outstanding_loans || 0))}
          </p>
          {stats?.total_outstanding_loans > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Incl. leningen: {formatCurrency(stats.total_outstanding_loans)}
            </p>
          )}
        </div>

        {/* Cash Balance Card */}
        <div className={`group rounded-2xl p-6 border transition-all hover:shadow-lg ${
          (stats?.total_kasgeld || 0) >= 0 
            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-emerald-500/5' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 hover:shadow-red-500/10'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              (stats?.total_kasgeld || 0) >= 0 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              <Banknote className={`w-6 h-6 ${
                (stats?.total_kasgeld || 0) >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Kasgeld Saldo</p>
          <p className={`text-3xl font-bold mt-1 ${
            (stats?.total_kasgeld || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(stats?.total_kasgeld || 0)}
          </p>
        </div>

        {/* Deposits Card */}
        <div className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Borg in Beheer</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {formatCurrency(stats?.total_deposits_held || 0)}
          </p>
        </div>

        {/* Quick Actions Card */}
        <div className="group bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Snelle Acties</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/app/huurders')}
              className="text-xs"
            >
              Huurders
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/app/appartementen')}
              className="text-xs"
            >
              Appartementen
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Section - Reminders & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reminders Card */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-orange-500" />
                Herinneringen
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {(stats?.reminders?.length || 0)} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.reminders && stats.reminders.length > 0 ? (
              <div className="space-y-3">
                {stats.reminders.slice(0, 5).map((reminder, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {reminder.title || reminder.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reminder.date || 'Vandaag'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-muted-foreground text-sm">Geen openstaande herinneringen</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-blue-500" />
                Recente Betalingen
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/betalingen')}>
                Alles bekijken
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recent_payments && stats.recent_payments.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_payments.slice(0, 5).map((payment, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {payment.tenant_name || 'Onbekend'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.date || 'Recent'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">
                      +{formatCurrency(payment.amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-muted-foreground text-sm">Geen recente betalingen</p>
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
