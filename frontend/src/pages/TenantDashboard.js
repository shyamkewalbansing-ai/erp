import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenantAuth } from '../context/TenantAuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Home, 
  LogOut, 
  Building2, 
  Wallet, 
  Zap, 
  Droplets, 
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Loader2,
  ArrowRight,
  Receipt
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const formatCurrency = (amount) => {
  return `SRD ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;
};

export default function TenantDashboard() {
  const { tenant, logout } = useTenantAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Meter reading dialog
  const [meterDialogOpen, setMeterDialogOpen] = useState(false);
  const [meterForm, setMeterForm] = useState({ ebs_reading: '', swm_reading: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tenant_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dashboardRes, paymentsRes, invoicesRes, meterRes] = await Promise.all([
        axios.get(`${API_URL}/tenant-portal/dashboard`, { headers }),
        axios.get(`${API_URL}/tenant-portal/payments`, { headers }),
        axios.get(`${API_URL}/tenant-portal/invoices`, { headers }),
        axios.get(`${API_URL}/tenant-portal/meter-readings`, { headers })
      ]);
      
      setDashboard(dashboardRes.data);
      setPayments(paymentsRes.data);
      setInvoices(invoicesRes.data);
      setMeterReadings(meterRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/huurder/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMeterReading = async (e) => {
    e.preventDefault();
    if (!meterForm.ebs_reading && !meterForm.swm_reading) {
      toast.error('Vul minimaal één meterstand in');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('tenant_token');
      await axios.post(`${API_URL}/tenant-portal/meter-readings`, {
        ebs_reading: meterForm.ebs_reading ? parseFloat(meterForm.ebs_reading) : null,
        swm_reading: meterForm.swm_reading ? parseFloat(meterForm.swm_reading) : null,
        notes: meterForm.notes || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Meterstand succesvol ingediend!');
      setMeterDialogOpen(false);
      setMeterForm({ ebs_reading: '', swm_reading: '', notes: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij indienen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/huurder/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Home className="w-6 h-6 text-emerald-500" />
              <div>
                <h1 className="font-semibold text-gray-900">Huurders Portaal</h1>
                <p className="text-xs text-gray-500">{tenant?.name}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-gray-500">
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welkom, {tenant?.name}!</h2>
          <p className="text-gray-500">Beheer uw huur, betalingen en meterstanden</p>
        </div>

        {/* Apartment Info Card */}
        {dashboard?.apartment_name && (
          <Card className="mb-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Building2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{dashboard.apartment_name}</h3>
                    <p className="text-gray-500">{dashboard.apartment_address}</p>
                    <p className="text-emerald-600 font-medium mt-1">
                      Huur: {formatCurrency(dashboard.rent_amount)} / maand
                    </p>
                  </div>
                </div>
                {dashboard.pending_meter_reading && (
                  <Button onClick={() => setMeterDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                    <Zap className="w-4 h-4 mr-2" />
                    Meterstand Doorgeven
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Totaal Betaald</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboard?.total_paid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Maandelijkse Huur</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(dashboard?.rent_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={dashboard?.outstanding_balance > 0 ? 'border-orange-300 bg-orange-50' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${dashboard?.outstanding_balance > 0 ? 'bg-orange-200' : 'bg-gray-100'}`}>
                  {dashboard?.outstanding_balance > 0 
                    ? <AlertCircle className="w-6 h-6 text-orange-600" />
                    : <CheckCircle className="w-6 h-6 text-gray-400" />
                  }
                </div>
                <div>
                  <p className="text-sm text-gray-500">Openstaand Saldo</p>
                  <p className={`text-2xl font-bold ${dashboard?.outstanding_balance > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {formatCurrency(dashboard?.outstanding_balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meter Reading Alert */}
        {dashboard?.pending_meter_reading && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Meterstand nog niet ingediend</p>
                    <p className="text-sm text-yellow-600">Geef uw EBS en SWM meterstanden door voor deze maand</p>
                  </div>
                </div>
                <Button onClick={() => setMeterDialogOpen(true)} variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-100">
                  Nu Doorgeven
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Betalingen
            </TabsTrigger>
            <TabsTrigger value="meters" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Meterstanden
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Recente Betalingen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.recent_payments?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.recent_payments.map((payment, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{payment.description || 'Huurbetaling'}</p>
                          <p className="text-sm text-gray-500">{payment.date}</p>
                        </div>
                        <p className="font-semibold text-emerald-600">{formatCurrency(payment.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Geen recente betalingen</p>
                )}
              </CardContent>
            </Card>

            {/* Last Meter Reading */}
            {dashboard?.last_meter_reading && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Laatste Meterstand
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-500">Periode</p>
                      <p className="font-semibold">{dashboard.last_meter_reading.period}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-500">EBS Stand</p>
                      <p className="font-semibold">{dashboard.last_meter_reading.ebs_reading?.toLocaleString()} kWh</p>
                    </div>
                    <div className="p-3 bg-cyan-50 rounded-lg">
                      <p className="text-sm text-gray-500">SWM Stand</p>
                      <p className="font-semibold">{dashboard.last_meter_reading.swm_reading?.toLocaleString()} m³</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-gray-500">Kosten</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(dashboard.last_meter_reading.total_cost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Open Invoices */}
            {dashboard?.open_invoices?.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                    <FileText className="w-5 h-5" />
                    Openstaande Facturen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.open_invoices.map((invoice, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">Vervaldatum: {invoice.due_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">{formatCurrency(invoice.amount)}</p>
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Betalingsgeschiedenis</CardTitle>
                <CardDescription>Al uw betalingen aan de verhuurder</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.payment_date}</TableCell>
                          <TableCell>{payment.description || 'Huurbetaling'}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nog geen betalingen geregistreerd</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meter Readings Tab */}
          <TabsContent value="meters">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Meterstanden</CardTitle>
                  <CardDescription>Uw EBS en SWM meterstanden</CardDescription>
                </div>
                <Button onClick={() => setMeterDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Meterstand
                </Button>
              </CardHeader>
              <CardContent>
                {meterReadings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead className="text-right">EBS (kWh)</TableHead>
                        <TableHead className="text-right">EBS Kosten</TableHead>
                        <TableHead className="text-right">SWM (m³)</TableHead>
                        <TableHead className="text-right">SWM Kosten</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meterReadings.map((reading) => (
                        <TableRow key={reading.id}>
                          <TableCell className="font-medium">
                            {reading.period_month}/{reading.period_year}
                          </TableCell>
                          <TableCell className="text-right">
                            {reading.ebs_reading?.toLocaleString()}
                            {reading.ebs_usage !== null && (
                              <span className="text-xs text-gray-500 block">
                                (+{reading.ebs_usage?.toLocaleString()})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {reading.ebs_cost ? formatCurrency(reading.ebs_cost) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {reading.swm_reading?.toLocaleString()}
                            {reading.swm_usage !== null && (
                              <span className="text-xs text-gray-500 block">
                                (+{reading.swm_usage?.toLocaleString()})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {reading.swm_cost ? formatCurrency(reading.swm_cost) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {reading.total_cost ? formatCurrency(reading.total_cost) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {reading.payment_status === 'paid' ? (
                              <Badge className="bg-emerald-100 text-emerald-700">Betaald</Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300">Openstaand</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nog geen meterstanden ingediend</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Meter Reading Dialog */}
      <Dialog open={meterDialogOpen} onOpenChange={setMeterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meterstand Doorgeven</DialogTitle>
            <DialogDescription>
              Voer uw huidige EBS en SWM meterstanden in
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMeterReading} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                EBS Meterstand (kWh)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Huidige stand op uw EBS meter"
                value={meterForm.ebs_reading}
                onChange={(e) => setMeterForm({ ...meterForm, ebs_reading: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-500" />
                SWM Meterstand (m³)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Huidige stand op uw SWM meter"
                value={meterForm.swm_reading}
                onChange={(e) => setMeterForm({ ...meterForm, swm_reading: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Opmerkingen (optioneel)</Label>
              <Input
                placeholder="Extra informatie..."
                value={meterForm.notes}
                onChange={(e) => setMeterForm({ ...meterForm, notes: e.target.value })}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMeterDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Indienen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
