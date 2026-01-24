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
  adminResetPassword,
  adminUpdateCustomer,
  getAdminDomains,
  createCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  formatCurrency,
  // Add-ons imports
  getAdminAddons,
  createAddon,
  updateAddon,
  deleteAddon,
  getUserAddons,
  activateUserAddon,
  deactivateUserAddon,
  getAddonRequests,
  approveAddonRequest,
  rejectAddonRequest
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
  Download,
  Key,
  Edit,
  Globe,
  Copy,
  ExternalLink,
  Package,
  Puzzle
} from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [domains, setDomains] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  
  // Add-ons state
  const [addons, setAddons] = useState([]);
  const [addonRequests, setAddonRequests] = useState([]);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [selectedAddonRequest, setSelectedAddonRequest] = useState(null);
  const [customerAddons, setCustomerAddons] = useState([]);
  
  // Dialog states
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deleteCustomerDialogOpen, setDeleteCustomerDialogOpen] = useState(false);
  const [createCustomerDialogOpen, setCreateCustomerDialogOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);
  const [addDomainDialogOpen, setAddDomainDialogOpen] = useState(false);
  const [deleteDomainDialogOpen, setDeleteDomainDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // Add-on dialog states
  const [createAddonDialogOpen, setCreateAddonDialogOpen] = useState(false);
  const [editAddonDialogOpen, setEditAddonDialogOpen] = useState(false);
  const [deleteAddonDialogOpen, setDeleteAddonDialogOpen] = useState(false);
  const [activateAddonDialogOpen, setActivateAddonDialogOpen] = useState(false);
  const [customerAddonsDialogOpen, setCustomerAddonsDialogOpen] = useState(false);
  const [approveAddonRequestDialogOpen, setApproveAddonRequestDialogOpen] = useState(false);
  
  // Form states
  const [activating, setActivating] = useState(false);
  const [months, setMonths] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', company_name: '' });
  const [newDomain, setNewDomain] = useState({ domain: '', user_id: '' });
  
  // Add-on form states
  const [newAddon, setNewAddon] = useState({
    name: '',
    slug: '',
    description: '',
    price: 3500
  });
  const [editAddonForm, setEditAddonForm] = useState({
    name: '',
    description: '',
    price: 0
  });
  const [addonMonths, setAddonMonths] = useState('1');
  
  // Create customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
    plan_type: 'trial', // 'trial', 'active', 'none', 'free'
    subscription_months: 1,
    payment_method: 'bank_transfer',
    payment_reference: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, customersRes, requestsRes, subscriptionsRes, domainsRes, addonsRes, addonRequestsRes] = await Promise.all([
        getAdminDashboard(),
        getAdminCustomers(),
        getSubscriptionRequests(),
        getAdminSubscriptions(),
        getAdminDomains(),
        getAdminAddons(),
        getAddonRequests()
      ]);
      setStats(dashboardRes.data);
      setCustomers(customersRes.data);
      setRequests(requestsRes.data);
      setSubscriptions(subscriptionsRes.data);
      setDomains(domainsRes.data);
      setAddons(addonsRes.data);
      setAddonRequests(addonRequestsRes.data);
    } catch (error) {
      toast.error('Fout bij het laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Password reset handler
  const handleResetPassword = async () => {
    if (!selectedCustomer || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    
    setActivating(true);
    try {
      await adminResetPassword(selectedCustomer.id, newPassword);
      toast.success(`Wachtwoord gereset voor ${selectedCustomer.name}`);
      setResetPasswordDialogOpen(false);
      setSelectedCustomer(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij resetten');
    } finally {
      setActivating(false);
    }
  };

  // Edit customer handler
  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;
    
    setActivating(true);
    try {
      await adminUpdateCustomer(selectedCustomer.id, editForm);
      toast.success(`Klant ${editForm.name} bijgewerkt`);
      setEditCustomerDialogOpen(false);
      setSelectedCustomer(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    } finally {
      setActivating(false);
    }
  };

  // Domain handlers
  const handleAddDomain = async () => {
    if (!newDomain.domain || !newDomain.user_id) {
      toast.error('Vul alle velden in');
      return;
    }
    
    setActivating(true);
    try {
      await createCustomDomain(newDomain);
      toast.success('Domein toegevoegd');
      setAddDomainDialogOpen(false);
      setNewDomain({ domain: '', user_id: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen');
    } finally {
      setActivating(false);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    setActivating(true);
    try {
      await verifyCustomDomain(domainId);
      toast.success('Domein geverifieerd');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verifiëren');
    } finally {
      setActivating(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!selectedDomain) return;
    
    setActivating(true);
    try {
      await deleteCustomDomain(selectedDomain.id);
      toast.success('Domein verwijderd');
      setDeleteDomainDialogOpen(false);
      setSelectedDomain(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    } finally {
      setActivating(false);
    }
  };

  // ==================== ADD-ON HANDLERS ====================
  
  const handleCreateAddon = async () => {
    if (!newAddon.name || !newAddon.slug) {
      toast.error('Naam en slug zijn verplicht');
      return;
    }
    
    setActivating(true);
    try {
      await createAddon({
        name: newAddon.name,
        slug: newAddon.slug,
        description: newAddon.description,
        price: parseFloat(newAddon.price) || 0,
        is_active: true
      });
      toast.success('Add-on aangemaakt');
      setCreateAddonDialogOpen(false);
      setNewAddon({ name: '', slug: '', description: '', price: 3500 });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setActivating(false);
    }
  };

  const handleEditAddon = async () => {
    if (!selectedAddon) return;
    
    setActivating(true);
    try {
      await updateAddon(selectedAddon.id, {
        name: editAddonForm.name,
        description: editAddonForm.description,
        price: parseFloat(editAddonForm.price) || 0
      });
      toast.success('Add-on bijgewerkt');
      setEditAddonDialogOpen(false);
      setSelectedAddon(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    } finally {
      setActivating(false);
    }
  };

  const handleDeleteAddon = async () => {
    if (!selectedAddon) return;
    
    setActivating(true);
    try {
      await deleteAddon(selectedAddon.id);
      toast.success('Add-on verwijderd');
      setDeleteAddonDialogOpen(false);
      setSelectedAddon(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    } finally {
      setActivating(false);
    }
  };

  const handleActivateAddonForCustomer = async () => {
    if (!selectedCustomer || !selectedAddon) return;
    
    setActivating(true);
    try {
      await activateUserAddon(selectedCustomer.id, {
        user_id: selectedCustomer.id,
        addon_id: selectedAddon.id,
        months: parseInt(addonMonths) || 1
      });
      toast.success('Add-on geactiveerd voor klant');
      setActivateAddonDialogOpen(false);
      setSelectedAddon(null);
      setAddonMonths('1');
      loadCustomerAddons(selectedCustomer.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij activeren');
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivateUserAddon = async (addonId) => {
    if (!selectedCustomer) return;
    
    try {
      await deactivateUserAddon(selectedCustomer.id, addonId);
      toast.success('Add-on gedeactiveerd');
      loadCustomerAddons(selectedCustomer.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij deactiveren');
    }
  };

  const loadCustomerAddons = async (userId) => {
    try {
      const res = await getUserAddons(userId);
      setCustomerAddons(res.data);
    } catch (error) {
      console.error('Fout bij laden add-ons:', error);
      setCustomerAddons([]);
    }
  };

  const handleApproveAddonRequest = async () => {
    if (!selectedAddonRequest) return;
    
    setActivating(true);
    try {
      await approveAddonRequest(selectedAddonRequest.id, parseInt(addonMonths) || 1);
      toast.success('Add-on verzoek goedgekeurd');
      setApproveAddonRequestDialogOpen(false);
      setSelectedAddonRequest(null);
      setAddonMonths('1');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij goedkeuren');
    } finally {
      setActivating(false);
    }
  };

  const handleRejectAddonRequest = async (requestId) => {
    try {
      await rejectAddonRequest(requestId);
      toast.success('Add-on verzoek afgewezen');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij afwijzen');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const generateNginxConfig = (domain) => {
    return `# Nginx configuratie voor ${domain}
# Voeg dit toe in CloudPanel of maak een nieuwe site aan

server {
    listen 80;
    server_name ${domain} www.${domain};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain} www.${domain};
    
    # SSL certificaat (via CloudPanel Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    
    # Frontend (React build)
    root /home/cloudpanel/htdocs/facturatie/frontend/build;
    index index.html;
    
    # API routes naar backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip compressie
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}`;
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
        plan_type: 'trial',
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
          <TabsTrigger value="domains">Domeinen</TabsTrigger>
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
                      <th className="text-left py-3 px-4 font-medium">Domein</th>
                      <th className="text-left py-3 px-4 font-medium">Geldig tot</th>
                      <th className="text-left py-3 px-4 font-medium">Totaal Betaald</th>
                      <th className="text-left py-3 px-4 font-medium">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => {
                      const customerDomains = domains.filter(d => d.user_id === customer.id);
                      return (
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
                          {customerDomains.length > 0 ? (
                            <div className="space-y-1">
                              {customerDomains.map((domain) => (
                                <div key={domain.id} className="flex items-center gap-2">
                                  <Globe className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">{domain.domain}</span>
                                  {domain.verified ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-yellow-500" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground h-7 px-2"
                              onClick={() => {
                                setNewDomain({ domain: '', user_id: customer.id });
                                setAddDomainDialogOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Domein
                            </Button>
                          )}
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
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setEditForm({
                                  name: customer.name,
                                  email: customer.email,
                                  company_name: customer.company_name || ''
                                });
                                setEditCustomerDialogOpen(true);
                              }}
                              title="Bewerken"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setNewPassword('');
                                setResetPasswordDialogOpen(true);
                              }}
                              title="Wachtwoord Resetten"
                            >
                              <Key className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setActivateDialogOpen(true);
                              }}
                              data-testid={`activate-btn-${customer.id}`}
                              title="Abonnement Activeren"
                            >
                              <Plus className="w-3 h-3" />
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
                                title="Abonnement Stoppen"
                              >
                                <XCircle className="w-3 h-3" />
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
                              title="Verwijderen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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

        {/* Domains Tab */}
        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Custom Domeinen
                  </CardTitle>
                  <CardDescription>Beheer custom domeinen voor klanten</CardDescription>
                </div>
                <Button onClick={() => setAddDomainDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Domein Toevoegen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* DNS Info Box */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-semibold text-blue-600 mb-2">DNS Configuratie voor Klanten</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Klanten moeten een <strong>A-record</strong> aanmaken bij hun domeinprovider (bijv. Cloudflare, GoDaddy, TransIP):
                </p>
                <div className="bg-background p-3 rounded border space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm w-20">Type:</span>
                    <span className="font-mono font-semibold">A</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm w-20">Naam:</span>
                    <span className="font-mono font-semibold">@ of www</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm w-20">Waarde:</span>
                    <span className="font-mono font-semibold text-primary">72.62.174.117</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6"
                      onClick={() => copyToClipboard('72.62.174.117')}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Kopieer
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm w-20">TTL:</span>
                    <span className="font-mono font-semibold">3600</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  ⚠️ Na het instellen van de DNS moet u in CloudPanel een nieuwe site aanmaken voor dit domein en een SSL certificaat configureren.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Domein</th>
                      <th className="text-left py-3 px-4 font-medium">Klant</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Aangemaakt</th>
                      <th className="text-left py-3 px-4 font-medium">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((domain) => (
                      <tr key={domain.id} className="border-b hover:bg-accent/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{domain.domain}</span>
                            <a 
                              href={`https://${domain.domain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{domain.user_name || 'Onbekend'}</p>
                            <p className="text-sm text-muted-foreground">{domain.user_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {domain.verified ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Actief
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              <Clock className="w-3 h-3 mr-1" />
                              In Afwachting
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">
                            {new Date(domain.created_at).toLocaleDateString('nl-NL')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDomain(domain);
                                setConfigDialogOpen(true);
                              }}
                              title="Nginx Configuratie"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Config
                            </Button>
                            {!domain.verified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerifyDomain(domain.id)}
                                disabled={activating}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verifiëren
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedDomain(domain);
                                setDeleteDomainDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {domains.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          Geen domeinen gevonden
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

            <div className="space-y-2">
              <Label>Abonnement Type *</Label>
              <Select 
                value={newCustomer.plan_type} 
                onValueChange={(v) => setNewCustomer({...newCustomer, plan_type: v})}
              >
                <SelectTrigger data-testid="plan-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">3 Dagen Proefperiode (gratis)</SelectItem>
                  <SelectItem value="active">Direct Actief Abonnement (betaald)</SelectItem>
                  <SelectItem value="free">Volledig Gratis (onbeperkt)</SelectItem>
                  <SelectItem value="none">Geen Abonnement (geblokkeerd tot activatie)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newCustomer.plan_type === 'trial' && 'Klant krijgt 3 dagen gratis toegang'}
                {newCustomer.plan_type === 'active' && 'Klant heeft direct volledige toegang'}
                {newCustomer.plan_type === 'free' && 'Klant heeft permanent gratis toegang'}
                {newCustomer.plan_type === 'none' && 'Klant kan niet inloggen tot u activeert'}
              </p>
            </div>

            {newCustomer.plan_type === 'active' && (
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

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wachtwoord Resetten</DialogTitle>
            <DialogDescription>
              Reset het wachtwoord voor {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nieuw Wachtwoord</Label>
              <Input
                type="password"
                placeholder="Minimaal 6 tekens"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="reset-password-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleResetPassword} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Wachtwoord Resetten
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editCustomerDialogOpen} onOpenChange={setEditCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Naam"
              />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="email@voorbeeld.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bedrijfsnaam (optioneel)</Label>
              <Input
                value={editForm.company_name}
                onChange={(e) => setEditForm({...editForm, company_name: e.target.value})}
                placeholder="Bedrijfsnaam"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomerDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleEditCustomer} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Opslaan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Domain Dialog */}
      <Dialog open={addDomainDialogOpen} onOpenChange={setAddDomainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Domein Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een custom domein toe voor een klant
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Domein</Label>
              <Input
                value={newDomain.domain}
                onChange={(e) => setNewDomain({...newDomain, domain: e.target.value})}
                placeholder="bijv. mijnverhuur.nl"
              />
              <p className="text-xs text-muted-foreground">
                Zonder http:// of www.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Klant</Label>
              <Select 
                value={newDomain.user_id} 
                onValueChange={(v) => setNewDomain({...newDomain, user_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een klant" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDomainDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddDomain} disabled={activating}>
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Toevoegen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Domain Dialog */}
      <Dialog open={deleteDomainDialogOpen} onOpenChange={setDeleteDomainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Domein Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u het domein <strong>{selectedDomain?.domain}</strong> wilt verwijderen?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDomainDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeleteDomain} disabled={activating}>
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

      {/* Nginx Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Nginx Configuratie voor {selectedDomain?.domain}</DialogTitle>
            <DialogDescription>
              Kopieer deze configuratie en voeg toe in CloudPanel
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-accent/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Stappen in CloudPanel:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Ga naar CloudPanel → Sites → Add Site</li>
                <li>Vul het domein in: <strong>{selectedDomain?.domain}</strong></li>
                <li>Kies "Reverse Proxy" of "Static Site"</li>
                <li>Vraag SSL certificaat aan (Let's Encrypt)</li>
                <li>Pas de Nginx configuratie aan met onderstaande code</li>
              </ol>
            </div>
            
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[300px] text-xs">
                {selectedDomain && generateNginxConfig(selectedDomain.domain)}
              </pre>
              <Button
                className="absolute top-2 right-2"
                size="sm"
                onClick={() => {
                  if (selectedDomain) {
                    copyToClipboard(generateNginxConfig(selectedDomain.domain));
                  }
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Kopieer
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
