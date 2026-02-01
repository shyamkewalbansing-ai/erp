import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  Calendar,
  Scissors,
  Package,
  ShoppingCart,
  UserCog,
  BarChart3,
  Megaphone,
  Globe,
  FileText,
  Zap,
  Building2,
  Sparkles,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Menu,
  X,
  Home
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/beautyspa' },
  { id: 'clients', label: 'Klanten', icon: Users, path: '/beautyspa/clients' },
  { id: 'appointments', label: 'Afspraken', icon: Calendar, path: '/beautyspa/appointments' },
  { id: 'treatments', label: 'Behandelingen', icon: Scissors, path: '/beautyspa/treatments' },
  { id: 'products', label: 'Producten', icon: Package, path: '/beautyspa/products' },
  { id: 'pos', label: 'Kassa (POS)', icon: ShoppingCart, path: '/beautyspa/pos' },
  { id: 'staff', label: 'Personeel', icon: UserCog, path: '/beautyspa/staff' },
  { id: 'reports', label: 'Rapportages', icon: BarChart3, path: '/beautyspa/reports' },
  { id: 'queue', label: 'Wachtrij', icon: Clock, path: '/beautyspa/queue' },
  { id: 'vouchers', label: 'Vouchers', icon: Sparkles, path: '/beautyspa/vouchers' },
];

export default function BeautySpaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const isActive = (path) => {
    if (path === '/beautyspa') {
      return location.pathname === '/beautyspa';
    }
    return location.pathname.startsWith(path);
  };

  // If we're at the root beautyspa path, show the dashboard
  const showDashboard = location.pathname === '/app/beautyspa' || location.pathname === '/beautyspa';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-lg"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b bg-gradient-to-r from-pink-500 to-purple-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">Beauty Spa</h1>
                <p className="text-xs text-pink-100">Management System</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive(item.path)
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-pink-50 hover:text-pink-600'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Back to Dashboard */}
          <div className="p-4 border-t">
            <Link to="/dashboard">
              <Button variant="outline" className="w-full">
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Terug naar Hoofdmenu
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen p-6">
        {showDashboard ? (
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Beauty Spa Dashboard
              </h1>
              <p className="text-slate-600">
                Welkom bij uw spa management systeem
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-20 bg-slate-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : stats && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-pink-100 text-sm">Klanten</p>
                          <p className="text-3xl font-bold">{stats.total_clients}</p>
                        </div>
                        <Users className="w-12 h-12 text-pink-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">Afspraken Vandaag</p>
                          <p className="text-3xl font-bold">{stats.todays_appointments}</p>
                        </div>
                        <Calendar className="w-12 h-12 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-emerald-100 text-sm">Omzet Vandaag</p>
                          <p className="text-3xl font-bold">SRD {stats.today_revenue?.toLocaleString()}</p>
                        </div>
                        <DollarSign className="w-12 h-12 text-emerald-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 text-sm">Omzet Deze Maand</p>
                          <p className="text-3xl font-bold">SRD {stats.month_revenue?.toLocaleString()}</p>
                        </div>
                        <BarChart3 className="w-12 h-12 text-amber-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                        <Scissors className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Behandelingen</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.total_treatments}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <UserCog className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Medewerkers</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.total_staff}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Producten</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.total_products}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Low Stock Alert */}
                {stats.low_stock_count > 0 && (
                  <Card className="mb-8 border-amber-200 bg-amber-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-800">Lage Voorraad Waarschuwing</h3>
                          <p className="text-amber-700">
                            {stats.low_stock_count} product(en) hebben een lage voorraad
                          </p>
                        </div>
                        <Link to="/beautyspa/products?low_stock=true">
                          <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100">
                            Bekijken
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upcoming Appointments */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-pink-600" />
                      Komende Afspraken
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.upcoming_appointments?.length > 0 ? (
                      <div className="space-y-4">
                        {stats.upcoming_appointments.map((apt, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                                {apt.appointment_time}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{apt.client_name}</p>
                                <p className="text-sm text-slate-500">{apt.treatment_name}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                              {apt.appointment_date}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-8">
                        Geen komende afspraken
                      </p>
                    )}
                    <div className="mt-4 text-center">
                      <Link to="/beautyspa/appointments">
                        <Button variant="outline" className="border-pink-200 text-pink-700 hover:bg-pink-50">
                          Alle Afspraken Bekijken
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Nieuwe Klant', icon: Users, path: '/beautyspa/clients', color: 'pink' },
                    { label: 'Nieuwe Afspraak', icon: Calendar, path: '/beautyspa/appointments', color: 'purple' },
                    { label: 'Kassa Openen', icon: ShoppingCart, path: '/beautyspa/pos', color: 'emerald' },
                    { label: 'Wachtrij', icon: Clock, path: '/beautyspa/queue', color: 'amber' },
                  ].map((action, i) => (
                    <Link key={i} to={action.path}>
                      <Card className={`hover:shadow-lg transition-all cursor-pointer group hover:border-${action.color}-200`}>
                        <CardContent className="p-6 text-center">
                          <div className={`w-12 h-12 bg-${action.color}-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                            <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                          </div>
                          <p className="font-medium text-slate-700">{action.label}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
