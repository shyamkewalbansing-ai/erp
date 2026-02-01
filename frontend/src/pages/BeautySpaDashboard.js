import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Users,
  Calendar,
  Scissors,
  Package,
  ShoppingCart,
  UserCog,
  BarChart3,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Star,
  Gift,
  Phone,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const formatCurrency = (amount) => {
  return `SRD ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)}`;
};

export default function BeautySpaDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/beautyspa/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Beauty Spa Dashboard</h1>
          <p className="text-muted-foreground">Laden...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded-lg"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const mainStats = [
    {
      title: 'Totaal Klanten',
      value: stats?.total_clients || 0,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50 dark:bg-blue-950',
      textColor: 'text-blue-600',
      link: '/app/beautyspa/clients'
    },
    {
      title: 'Afspraken Vandaag',
      value: stats?.todays_appointments || 0,
      icon: Calendar,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50 dark:bg-emerald-950',
      textColor: 'text-emerald-600',
      link: '/app/beautyspa/appointments'
    },
    {
      title: 'Omzet Vandaag',
      value: formatCurrency(stats?.today_revenue),
      icon: DollarSign,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50 dark:bg-amber-950',
      textColor: 'text-amber-600',
      link: '/app/beautyspa/reports'
    },
    {
      title: 'Omzet Deze Maand',
      value: formatCurrency(stats?.month_revenue),
      icon: TrendingUp,
      color: 'bg-violet-500',
      lightColor: 'bg-violet-50 dark:bg-violet-950',
      textColor: 'text-violet-600',
      link: '/app/beautyspa/reports'
    }
  ];

  const quickStats = [
    { label: 'Behandelingen', value: stats?.total_treatments || 0, icon: Scissors, color: 'text-rose-500' },
    { label: 'Medewerkers', value: stats?.total_staff || 0, icon: UserCog, color: 'text-indigo-500' },
    { label: 'Producten', value: stats?.total_products || 0, icon: Package, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Beauty Spa Dashboard</h1>
          <p className="text-muted-foreground">Overzicht van uw spa management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/beautyspa/appointments')} className="gap-2">
            <Calendar className="w-4 h-4" />
            Nieuwe Afspraak
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/beautyspa/pos')} className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Kassa
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat, i) => (
          <Link key={i} to={stat.link}>
            <Card className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${stat.lightColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {(stats?.low_stock_count > 0 || stats?.pending_appointments > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats?.low_stock_count > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">Lage Voorraad</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {stats.low_stock_count} product(en) moeten worden aangevuld
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                    onClick={() => navigate('/app/beautyspa/products?low_stock=true')}
                  >
                    Bekijken
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Komende Afspraken
                </CardTitle>
                <CardDescription>Afspraken voor vandaag en morgen</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/beautyspa/appointments')}>
                Alle bekijken
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.upcoming_appointments?.length > 0 ? (
              <div className="space-y-3">
                {stats.upcoming_appointments.slice(0, 5).map((apt, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">{apt.appointment_date?.split('-')[2]}</span>
                      <span className="text-lg font-bold text-primary">{apt.appointment_time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{apt.client_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{apt.treatment_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden sm:flex">
                        <Clock className="w-3 h-3 mr-1" />
                        {apt.duration || 60} min
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        Bevestigd
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Geen komende afspraken</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/app/beautyspa/appointments')}
                >
                  Afspraak Plannen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Snelle Acties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Nieuwe Klant', icon: Users, path: '/app/beautyspa/clients', color: 'text-blue-500' },
              { label: 'Nieuwe Afspraak', icon: Calendar, path: '/app/beautyspa/appointments', color: 'text-emerald-500' },
              { label: 'Walk-in Toevoegen', icon: Clock, path: '/app/beautyspa/queue', color: 'text-amber-500' },
              { label: 'Kassa Openen', icon: ShoppingCart, path: '/app/beautyspa/pos', color: 'text-violet-500' },
              { label: 'Voucher Aanmaken', icon: Gift, path: '/app/beautyspa/vouchers', color: 'text-rose-500' },
              { label: 'Rapportage Bekijken', icon: BarChart3, path: '/app/beautyspa/reports', color: 'text-indigo-500' },
            ].map((action, i) => (
              <Link key={i} to={action.path}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
                  <div className={`p-2 rounded-lg bg-muted group-hover:bg-background transition-colors`}>
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Popular Treatments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Populaire Behandelingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.popular_treatments?.length > 0 ? (
              <div className="space-y-3">
                {stats.popular_treatments.slice(0, 4).map((treatment, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-sm text-foreground">{treatment.name}</span>
                    </div>
                    <Badge variant="secondary">{treatment.count}x</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nog geen behandelingen voltooid
              </p>
            )}
          </CardContent>
        </Card>

        {/* Staff Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-500" />
              Medewerkers Vandaag
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.staff_today?.length > 0 ? (
              <div className="space-y-3">
                {stats.staff_today.slice(0, 4).map((staff, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                          {staff.name?.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-foreground">{staff.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{staff.appointments || 0} afspraken</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Geen medewerkers ingepland
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Vandaag Samenvatting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Afspraken voltooid</span>
              <span className="font-semibold text-foreground">
                {stats?.completed_today || 0} / {stats?.todays_appointments || 0}
              </span>
            </div>
            <Progress 
              value={stats?.todays_appointments ? ((stats?.completed_today || 0) / stats.todays_appointments) * 100 : 0} 
              className="h-2"
            />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-600">{stats?.completed_today || 0}</p>
                <p className="text-xs text-muted-foreground">Voltooid</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <Timer className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-600">{(stats?.todays_appointments || 0) - (stats?.completed_today || 0)}</p>
                <p className="text-xs text-muted-foreground">Resterend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
