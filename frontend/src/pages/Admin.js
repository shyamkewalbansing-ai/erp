import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminDashboard, 
  getAdminCustomers, 
  activateSubscription, 
  deactivateCustomer,
  getSubscriptionRequests,
  formatCurrency 
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  CreditCard, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  Building2
} from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [months, setMonths] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, customersRes, requestsRes] = await Promise.all([
        getAdminDashboard(),
        getAdminCustomers(),
        getSubscriptionRequests()
      ]);
      setStats(dashboardRes.data);
      setCustomers(customersRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      toast.error('Fout bij het laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubscription = async () => {
    if (!selectedCustomer) return;
    
    setActivating(true);
    try {
      await activateSubscription({
        user_id: selectedCustomer.id,
        months: parseInt(months),
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined
      });
      
      toast.success(`Abonnement geactiveerd voor ${selectedCustomer.name}`);
      setActivateDialogOpen(false);
      setSelectedCustomer(null);
      setMonths('1');
      setPaymentReference('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij activeren');
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivateCustomer = async () => {
    if (!selectedCustomer) return;
    
    setActivating(true);
    try {
      await deactivateCustomer(selectedCustomer.id);
      toast.success(`Abonnement gedeactiveerd voor ${selectedCustomer.name}`);
      setDeactivateDialogOpen(false);
      setSelectedCustomer(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij deactiveren');
    } finally {
      setActivating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Actief</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Proef</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Verlopen</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Geen</Badge>;
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.company_name && customer.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold">Geen Toegang</h2>
        <p className="text-muted-foreground mt-2">Deze pagina is alleen toegankelijk voor beheerders.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Beheerder Dashboard</h1>
        <p className="text-muted-foreground">Beheer klanten en abonnementen</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totaal Klanten</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actieve Abonnementen</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.active_subscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verlopen Abonnementen</CardTitle>
            <XCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.expired_subscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Deze maand: {formatCurrency(stats?.revenue_this_month || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Clock className="w-5 h-5" />
              Openstaande Verzoeken ({requests.length})
            </CardTitle>
            <CardDescription>Klanten die wachten op activatie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{request.user_name}</p>
                    <p className="text-sm text-muted-foreground">{request.user_email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString('nl-NL')}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        const customer = customers.find(c => c.id === request.user_id);
                        if (customer) {
                          setSelectedCustomer(customer);
                          setActivateDialogOpen(true);
                        }
                      }}
                    >
                      Activeren
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Klanten</CardTitle>
              <CardDescription>Overzicht van alle geregistreerde klanten</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[250px]"
                data-testid="customer-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Klant</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Geldig tot</th>
                  <th className="text-left py-3 px-4 font-medium">Totaal Betaald</th>
                  <th className="text-left py-3 px-4 font-medium">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-accent/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                        {customer.company_name && (
                          <p className="text-xs text-muted-foreground">{customer.company_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(customer.subscription_status)}
                    </td>
                    <td className="py-3 px-4">
                      {customer.subscription_end_date ? (
                        <span className="text-sm">
                          {new Date(customer.subscription_end_date).toLocaleDateString('nl-NL')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{formatCurrency(customer.total_paid)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setActivateDialogOpen(true);
                          }}
                          data-testid={`activate-btn-${customer.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Activeren
                        </Button>
                        {customer.subscription_status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDeactivateDialogOpen(true);
                            }}
                            data-testid={`deactivate-btn-${customer.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Geen klanten gevonden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activate Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnement Activeren</DialogTitle>
            <DialogDescription>
              Activeer of verleng het abonnement voor {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Aantal maanden</Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger data-testid="months-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 maand - {formatCurrency(3500)}</SelectItem>
                  <SelectItem value="3">3 maanden - {formatCurrency(10500)}</SelectItem>
                  <SelectItem value="6">6 maanden - {formatCurrency(21000)}</SelectItem>
                  <SelectItem value="12">12 maanden - {formatCurrency(42000)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Betaalmethode</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="payment-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bankoverschrijving</SelectItem>
                  <SelectItem value="cash">Contant</SelectItem>
                  <SelectItem value="other">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Betaalreferentie (optioneel)</Label>
              <Input
                placeholder="Bijv. transactienummer"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                data-testid="payment-reference-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleActivateSubscription} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activeren
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnement Deactiveren</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u het abonnement van {selectedCustomer?.name} wilt deactiveren?
              De klant verliest direct toegang tot de applicatie.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeactivateCustomer} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactiveren
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
