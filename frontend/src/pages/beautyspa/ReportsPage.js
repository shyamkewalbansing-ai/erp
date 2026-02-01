import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { BarChart3, TrendingUp, DollarSign, Users, Scissors, Package, UserCog } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState(null);
  const [treatmentsData, setTreatmentsData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [clientsData, setClientsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => { fetchReports(); }, [period]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [revenue, treatments, products, staff, clients] = await Promise.all([
        axios.get(`${API_URL}/beautyspa/reports/revenue?period=${period}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/reports/treatments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/reports/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/reports/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/reports/clients`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRevenueData(revenue.data);
      setTreatmentsData(treatments.data);
      setProductsData(products.data);
      setStaffData(staff.data);
      setClientsData(clients.data);
    } catch (error) { toast.error('Fout bij laden rapporten'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-reports-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapportages & Analytics</h1>
          <p className="text-slate-600">Inzichten in uw spa bedrijf</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Vandaag</SelectItem>
            <SelectItem value="week">Deze Week</SelectItem>
            <SelectItem value="month">Deze Maand</SelectItem>
            <SelectItem value="year">Dit Jaar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32 bg-slate-100"></CardContent></Card>)}
        </div>
      ) : (
        <>
          {/* Revenue Stats */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Totale Omzet</p>
                    <p className="text-3xl font-bold">SRD {revenueData?.total_revenue?.toLocaleString() || 0}</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Transacties</p>
                    <p className="text-3xl font-bold">{revenueData?.total_transactions || 0}</p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm">Gem. Transactie</p>
                    <p className="text-3xl font-bold">SRD {Math.round(revenueData?.average_transaction || 0).toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-teal-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-500 mb-2">Per Betaalmethode</p>
                <div className="space-y-1">
                  {revenueData?.by_payment_method && Object.entries(revenueData.by_payment_method).map(([method, amount]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                      <span className="font-medium">SRD {amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Treatments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-emerald-600" /> Top Behandelingen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {treatmentsData.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Geen data</p>
                ) : (
                  <div className="space-y-3">
                    {treatmentsData.slice(0, 5).map((t, i) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-xs text-slate-500">{t.times_booked || 0}x geboekt</p>
                          </div>
                        </div>
                        <Badge variant="outline">SRD {t.price_srd?.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" /> Top Producten
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productsData.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Geen data</p>
                ) : (
                  <div className="space-y-3">
                    {productsData.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.quantity_sold}x verkocht</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">SRD {p.revenue?.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-amber-600" /> Medewerker Prestaties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffData.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Geen data</p>
                ) : (
                  <div className="space-y-3">
                    {staffData.slice(0, 5).map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                            {s.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-slate-500">{s.total_treatments || 0} behandelingen</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">SRD {(s.total_commission || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">commissie</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> Top Klanten
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientsData.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Geen data</p>
                ) : (
                  <div className="space-y-3">
                    {clientsData.slice(0, 5).map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                            {c.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.total_visits || 0} bezoeken</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">SRD {(c.total_spent || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">besteed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
