import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboard, formatCurrency, getMyAddons } from '../lib/api';
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
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVastgoedAddon, setHasVastgoedAddon] = useState(false);
  const [addonsChecked, setAddonsChecked] = useState(false);

  useEffect(() => {
    checkAddonsAndFetch();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => checkAddonsAndFetch();
    window.addEventListener(REFRESH_EVENTS.DASHBOARD, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_EVENTS.DASHBOARD, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.ALL, handleRefresh);
    };
  }, []);

  const checkAddonsAndFetch = async () => {
    try {
      // Check if user has vastgoed_beheer add-on
      const addonsRes = await getMyAddons();
      const hasAddon = addonsRes.data.some(
        a => a.addon_slug === 'vastgoed_beheer' && a.status === 'active'
      );
      setHasVastgoedAddon(hasAddon);
      setAddonsChecked(true);

      // Only fetch dashboard data if user has the add-on
      if (hasAddon) {
        const response = await getDashboard();
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show empty state if no add-on
  if (addonsChecked && !hasVastgoedAddon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Package className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Welkom bij Facturatie N.V.</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Uw account is actief! Om te beginnen met het beheren van uw bedrijf, 
          activeer een module die past bij uw behoeften.
        </p>
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg rounded-xl shadow-lg shadow-primary/20"
            onClick={() => navigate('/abonnement')}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Bekijk Beschikbare Modules
          </Button>
          <p className="text-sm text-muted-foreground">
            Start met de <strong>Vastgoed Beheer</strong> module voor verhuuradministratie
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Totaal Appartementen',
      value: stats?.total_apartments || 0,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-accent',
    },
    {
      label: 'Bezet',
      value: stats?.occupied_apartments || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: `${stats?.available_apartments || 0} beschikbaar`,
    },
    {
      label: 'Inkomsten deze maand',
      value: formatCurrency(stats?.total_income_this_month || 0),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-accent',
    },
    {
      label: 'Openstaand',
      value: formatCurrency((stats?.total_outstanding || 0) + (stats?.total_outstanding_loans || 0)),
      icon: CreditCard,
      color: (stats?.total_outstanding || 0) + (stats?.total_outstanding_loans || 0) > 0 ? 'text-orange-600' : 'text-primary',
      bgColor: (stats?.total_outstanding || 0) + (stats?.total_outstanding_loans || 0) > 0 ? 'bg-orange-50' : 'bg-accent',
      subtitle: stats?.total_outstanding_loans > 0 ? `incl. leningen ${formatCurrency(stats.total_outstanding_loans)}` : undefined,
    },
    {
      label: 'Kasgeld Saldo',
      value: formatCurrency(stats?.total_kasgeld || 0),
      icon: Banknote,
      color: stats?.total_kasgeld >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats?.total_kasgeld >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      label: 'Borg in beheer',
      value: formatCurrency(stats?.total_deposits_held || 0),
      icon: Wallet,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van uw verhuurportfolio
          </p>
        </div>
        {user?.logo && (
          <img 
            src={user.logo} 
            alt="Bedrijfslogo" 
            className="h-20 w-auto max-w-[250px] object-contain hidden sm:block"
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={stat.label} 
            className={`stat-card card-hover animate-fade-in stagger-${index + 1}`}
            data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={`stat-card-icon ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reminders */}
        <Card className="animate-fade-in stagger-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Betalingsherinneringen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.reminders?.length > 0 ? (
              <div className="space-y-3">
                {stats.reminders.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className={`reminder-card ${reminder.reminder_type === 'upcoming' ? 'upcoming' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      reminder.reminder_type === 'overdue' ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      <Clock className={`w-5 h-5 ${
                        reminder.reminder_type === 'overdue' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {reminder.tenant_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {reminder.apartment_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(reminder.amount_due)}
                      </p>
                      <p className={`text-xs ${
                        reminder.reminder_type === 'overdue' ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        {reminder.days_overdue > 0 
                          ? `${reminder.days_overdue} dagen te laat`
                          : 'Bijna vervallen'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Geen openstaande herinneringen</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="animate-fade-in stagger-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-primary" />
              Recente Betalingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recent_payments?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {payment.tenant_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {payment.apartment_name} • {payment.payment_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {payment.payment_type === 'rent' ? 'Huur' : 
                         payment.payment_type === 'deposit' ? 'Borg' : 'Overig'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center mb-4">
                  <CreditCard className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Geen recente betalingen</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
