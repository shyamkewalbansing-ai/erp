import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  Sparkles
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function BeautySpaDashboard() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Beauty Spa Dashboard</h1>
        <p className="text-muted-foreground">Welkom bij uw spa management systeem</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">Klanten</p>
                <p className="text-3xl font-bold">{stats?.total_clients || 0}</p>
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
                <p className="text-3xl font-bold">{stats?.todays_appointments || 0}</p>
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
                <p className="text-3xl font-bold">SRD {stats?.today_revenue?.toLocaleString() || 0}</p>
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
                <p className="text-3xl font-bold">SRD {stats?.month_revenue?.toLocaleString() || 0}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center">
              <Scissors className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Behandelingen</p>
              <p className="text-2xl font-bold text-foreground">{stats?.total_treatments || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <UserCog className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medewerkers</p>
              <p className="text-2xl font-bold text-foreground">{stats?.total_staff || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Producten</p>
              <p className="text-2xl font-bold text-foreground">{stats?.total_products || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {stats?.low_stock_count > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 dark:text-amber-200">Lage Voorraad Waarschuwing</h3>
                <p className="text-amber-700 dark:text-amber-300">
                  {stats.low_stock_count} product(en) hebben een lage voorraad
                </p>
              </div>
              <Link to="/app/beautyspa/products?low_stock=true">
                <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50">
                  Bekijken
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-600" />
            Komende Afspraken
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.upcoming_appointments?.length > 0 ? (
            <div className="space-y-4">
              {stats.upcoming_appointments.map((apt, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {apt.appointment_time}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{apt.client_name}</p>
                      <p className="text-sm text-muted-foreground">{apt.treatment_name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800">
                    {apt.appointment_date}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Geen komende afspraken
            </p>
          )}
          <div className="mt-4 text-center">
            <Link to="/app/beautyspa/appointments">
              <Button variant="outline" className="border-pink-200 text-pink-700 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-300 dark:hover:bg-pink-900/30">
                Alle Afspraken Bekijken
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/app/beautyspa/clients">
          <Card className="hover:shadow-lg transition-all cursor-pointer group hover:border-pink-200 dark:hover:border-pink-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-pink-600" />
              </div>
              <p className="font-medium text-foreground">Nieuwe Klant</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/beautyspa/appointments">
          <Card className="hover:shadow-lg transition-all cursor-pointer group hover:border-purple-200 dark:hover:border-purple-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-medium text-foreground">Nieuwe Afspraak</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/beautyspa/pos">
          <Card className="hover:shadow-lg transition-all cursor-pointer group hover:border-emerald-200 dark:hover:border-emerald-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-medium text-foreground">Kassa Openen</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/beautyspa/queue">
          <Card className="hover:shadow-lg transition-all cursor-pointer group hover:border-amber-200 dark:hover:border-amber-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-medium text-foreground">Wachtrij</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
