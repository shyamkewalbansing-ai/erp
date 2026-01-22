import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminDashboard, 
  getAdminCustomers, 
  createAdminCustomer,
  activateSubscription, 
  deactivateCustomer,
  deleteCustomerPermanent,
  getSubscriptionRequests,
  getAdminSubscriptions,
  deleteSubscriptionPayment,
  downloadSubscriptionReceipt,
  formatCurrency 
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
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
  Trash2,
  FileText,
  UserPlus,
  Download
} from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  
  // Dialog states
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deleteCustomerDialogOpen, setDeleteCustomerDialogOpen] = useState(false);
  const [createCustomerDialogOpen, setCreateCustomerDialogOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  
  // Form states
  const [activating, setActivating] = useState(false);
  const [months, setMonths] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Create customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
    activate_subscription: false,
    subscription_months: 1,
    payment_method: 'bank_transfer',
    payment_reference: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, customersRes, requestsRes, subscriptionsRes] = await Promise.all([
        getAdminDashboard(),
        getAdminCustomers(),
        getSubscriptionRequests(),
        getAdminSubscriptions()
      ]);
      setStats(dashboardRes.data);
      setCustomers(customersRes.data);
      setRequests(requestsRes.data);
      setSubscriptions(subscriptionsRes.data);
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

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    setActivating(true);
    try {
      await deleteCustomerPermanent(selectedCustomer.id);
      toast.success(`Klant ${selectedCustomer.name} permanent verwijderd`);
      setDeleteCustomerDialogOpen(false);
      setSelectedCustomer(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    } finally {
      setActivating(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.password) {
      toast.error('Vul alle verplichte velden in');
      return;
    }
    
    setActivating(true);
    try {
      await createAdminCustomer({
        ...newCustomer,
        subscription_months: parseInt(newCustomer.subscription_months)
      });
      toast.success(`Klant ${newCustomer.name} aangemaakt`);
      setCreateCustomerDialogOpen(false);
      setNewCustomer({
        name: '',
        email: '',
        password: '',
        company_name: '',
        activate_subscription: false,
        subscription_months: 1,
        payment_method: 'bank_transfer',
        payment_reference: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setActivating(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedSubscription) return;
    
    setActivating(true);
    try {
      await deleteSubscriptionPayment(selectedSubscription.id);
      toast.success('Betaling verwijderd');
      setDeletePaymentDialogOpen(false);
      setSelectedSubscription(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    } finally {
      setActivating(false);
    }
  };

  const handleDownloadReceipt = async (subscription) => {
    try {
      const response = await downloadSubscriptionReceipt(subscription.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kwitantie_${subscription.user_name?.replace(' ', '_') || 'klant'}_${subscription.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden PDF');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Beheerder Dashboard</h1>
          <p className="text-muted-foreground">Beheer klanten en abonnementen</p>
        </div>
        <Button onClick={() => setCreateCustomerDialogOpen(true)} data-testid="create-customer-btn">
          <UserPlus className="w-4 h-4 mr-2" />
          Klant Aanmaken
        </Button>
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

      {/* Tabs for Customers and Payments */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Klanten</TabsTrigger>
          <TabsTrigger value="payments">Betalingen</TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers">
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
                            {(customer.subscription_status === 'active' || customer.subscription_status === 'trial') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-500 border-orange-500/20 hover:bg-orange-500/10"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setDeactivateDialogOpen(true);
                                }}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Stop
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setDeleteCustomerDialogOpen(true);
                              }}
                              data-testid={`delete-btn-${customer.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Betalingsgeschiedenis</CardTitle>
              <CardDescription>Alle abonnementsbetalingen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Klant</th>
                      <th className="text-left py-3 px-4 font-medium">Bedrag</th>
                      <th className="text-left py-3 px-4 font-medium">Periode</th>
                      <th className="text-left py-3 px-4 font-medium">Methode</th>
                      <th className="text-left py-3 px-4 font-medium">Datum</th>
                      <th className="text-left py-3 px-4 font-medium">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b hover:bg-accent/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{sub.user_name || 'Onbekend'}</p>
                            <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-primary">{formatCurrency(sub.amount)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">{sub.months} maand(en)</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {sub.payment_method === 'bank_transfer' ? 'Bank' : 
                             sub.payment_method === 'cash' ? 'Contant' : sub.payment_method}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">
                            {new Date(sub.created_at).toLocaleDateString('nl-NL')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReceipt(sub)}
                              data-testid={`download-receipt-${sub.id}`}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setDeletePaymentDialogOpen(true);
                              }}
                              data-testid={`delete-payment-${sub.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Geen betalingen gevonden
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Customer Dialog */}
      <Dialog open={createCustomerDialogOpen} onOpenChange={setCreateCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe Klant Aanmaken</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe klant toe aan het systeem
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                placeholder="Volledige naam"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                data-testid="new-customer-name"
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                placeholder="email@voorbeeld.com"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                data-testid="new-customer-email"
              />
            </div>

            <div className="space-y-2">
              <Label>Wachtwoord *</Label>
              <Input
                type="password"
                placeholder="Minimaal 6 tekens"
                value={newCustomer.password}
                onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                data-testid="new-customer-password"
              />
            </div>

            <div className="space-y-2">
              <Label>Bedrijfsnaam (optioneel)</Label>
              <Input
                placeholder="Bedrijfsnaam"
                value={newCustomer.company_name}
                onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="activate"
                checked={newCustomer.activate_subscription}
                onCheckedChange={(checked) => setNewCustomer({...newCustomer, activate_subscription: checked})}
              />
              <Label htmlFor="activate" className="cursor-pointer">
                Direct abonnement activeren (anders 3 dagen proef)
              </Label>
            </div>

            {newCustomer.activate_subscription && (
              <>
                <div className="space-y-2">
                  <Label>Aantal maanden</Label>
                  <Select 
                    value={String(newCustomer.subscription_months)} 
                    onValueChange={(v) => setNewCustomer({...newCustomer, subscription_months: parseInt(v)})}
                  >
                    <SelectTrigger>
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
                  <Select 
                    value={newCustomer.payment_method} 
                    onValueChange={(v) => setNewCustomer({...newCustomer, payment_method: v})}
                  >
                    <SelectTrigger>
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
                    value={newCustomer.payment_reference}
                    onChange={(e) => setNewCustomer({...newCustomer, payment_reference: e.target.value})}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCustomerDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateCustomer} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Aanmaken
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Abonnement Stoppen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u het abonnement van {selectedCustomer?.name} wilt stoppen?
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
                  Stoppen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog open={deleteCustomerDialogOpen} onOpenChange={setDeleteCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Klant Permanent Verwijderen</DialogTitle>
            <DialogDescription>
              <span className="text-red-500 font-semibold">WAARSCHUWING:</span> Dit verwijdert {selectedCustomer?.name} en ALLE bijbehorende gegevens permanent:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Account en abonnementsgegevens</li>
                <li>Alle huurders</li>
                <li>Alle appartementen</li>
                <li>Alle betalingen en borg</li>
                <li>Alle onderhouds- en personeelsgegevens</li>
              </ul>
              <p className="mt-2 font-semibold">Dit kan niet ongedaan worden gemaakt!</p>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomerDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Permanent Verwijderen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <Dialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Betaling Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze betaling wilt verwijderen?
              {selectedSubscription && (
                <div className="mt-2 p-3 bg-accent rounded-lg">
                  <p><strong>Klant:</strong> {selectedSubscription.user_name}</p>
                  <p><strong>Bedrag:</strong> {formatCurrency(selectedSubscription.amount)}</p>
                  <p><strong>Datum:</strong> {new Date(selectedSubscription.created_at).toLocaleDateString('nl-NL')}</p>
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Let op: Het abonnement van de klant wordt aangepast op basis van resterende betalingen.
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePaymentDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeletePayment} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Verwijderen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
