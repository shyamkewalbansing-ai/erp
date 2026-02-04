import { useState, useEffect, lazy, Suspense } from 'react';
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
  bulkActivateModules,
  getModulePayments,
  getModulePaymentRequests,
  confirmModulePayment,
  rejectAddonRequest,
  // Deployment
  getDeploymentSettings,
  updateDeploymentSettings,
  triggerSystemUpdate,
  getDeploymentLogs,
  // Workspaces
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  verifyWorkspaceDns,
  activateWorkspaceSsl,
  getWorkspaceNginxConfig,
  getWorkspaceStats
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

// Lazy load WebsiteEditor for better performance
const WebsiteEditor = lazy(() => import('../components/WebsiteEditor'));
import DomainManagementPage from './DomainManagementPage';
import EmailSettingsAdmin from '../components/EmailSettingsAdmin';
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
  Puzzle,
  RefreshCw,
  Github,
  Server,
  Terminal,
  Settings,
  History,
  Shield,
  Building2,
  Palette,
  Link,
  CheckCircle2,
  AlertCircle,
  Layers,
  Eye,
  Check,
  Bell,
  Banknote,
  Mail,
  Rocket,
  Play
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
    price: 3500,
    category: '',
    icon_name: '',
    hero_image_url: '',
    highlights: '',
    features: []
  });
  const [editAddonForm, setEditAddonForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    icon_name: '',
    hero_image_url: '',
    highlights: '',
    features: []
  });
  const [addonMonths, setAddonMonths] = useState('1');
  
  // Deployment/Update states
  const [deploymentSettings, setDeploymentSettings] = useState({
    webhook_url: '',
    webhook_secret: '',
    auto_restart_backend: true,
    auto_rebuild_frontend: true,
    run_migrations: true,
    last_update: null,
    last_update_status: null
  });
  const [deploymentLogs, setDeploymentLogs] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [savingDeploySettings, setSavingDeploySettings] = useState(false);
  
  // Workspace states
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState({ total: 0, active: 0, pending: 0 });
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [createWorkspaceDialogOpen, setCreateWorkspaceDialogOpen] = useState(false);
  const [editWorkspaceDialogOpen, setEditWorkspaceDialogOpen] = useState(false);
  const [deleteWorkspaceDialogOpen, setDeleteWorkspaceDialogOpen] = useState(false);
  const [nginxConfigDialogOpen, setNginxConfigDialogOpen] = useState(false);
  const [nginxConfig, setNginxConfig] = useState('');
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [filteredWorkspaces, setFilteredWorkspaces] = useState([]);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    slug: '',
    owner_id: '',
    domain_type: 'subdomain',
    subdomain: '',
    custom_domain: '',
    branding: {
      logo_url: '',
      favicon_url: '',
      primary_color: '#0caf60',
      secondary_color: '#059669',
      portal_name: ''
    }
  });
  
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
  
  // Module activation state
  const [selectedModules, setSelectedModules] = useState([]);
  const [modulePayments, setModulePayments] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  // Filter workspaces based on search
  useEffect(() => {
    const filtered = workspaces.filter(workspace => 
      workspace.name.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      workspace.slug.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      (workspace.owner_email && workspace.owner_email.toLowerCase().includes(workspaceSearch.toLowerCase()))
    );
    setFilteredWorkspaces(filtered);
  }, [workspaces, workspaceSearch]);

  const loadData = async () => {
    try {
      const [dashboardRes, customersRes, requestsRes, subscriptionsRes, domainsRes, addonsRes, addonRequestsRes, deploySettingsRes, deployLogsRes, workspacesRes, workspaceStatsRes] = await Promise.all([
        getAdminDashboard(),
        getAdminCustomers(),
        getSubscriptionRequests(),
        getAdminSubscriptions(),
        getAdminDomains(),
        getAdminAddons(),
        getAddonRequests(),
        getDeploymentSettings().catch(() => ({ data: {} })),
        getDeploymentLogs().catch(() => ({ data: [] })),
        getWorkspaces().catch(() => ({ data: [] })),
        getWorkspaceStats().catch(() => ({ data: { total: 0, active: 0, pending: 0 } }))
      ]);
      setStats(dashboardRes.data);
      setCustomers(customersRes.data);
      setRequests(requestsRes.data);
      setSubscriptions(subscriptionsRes.data);
      setDomains(domainsRes.data);
      setAddons(addonsRes.data);
      setAddonRequests(addonRequestsRes.data);
      if (deploySettingsRes.data) {
        setDeploymentSettings(prev => ({...prev, ...deploySettingsRes.data}));
      }
      setDeploymentLogs(deployLogsRes.data || []);
      setWorkspaces(workspacesRes.data || []);
      setWorkspaceStats(workspaceStatsRes.data || { total: 0, active: 0, pending: 0 });
      
      // Load module payment requests separately
      try {
        const paymentRequestsRes = await getModulePaymentRequests();
        setPaymentRequests(paymentRequestsRes.data || []);
      } catch (e) {
        console.error('Error loading payment requests:', e);
      }
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
      // Parse highlights from comma-separated string to array
      const highlightsArray = newAddon.highlights 
        ? newAddon.highlights.split(',').map(h => h.trim()).filter(Boolean)
        : [];
      
      await createAddon({
        name: newAddon.name,
        slug: newAddon.slug,
        description: newAddon.description,
        price: parseFloat(newAddon.price) || 0,
        is_active: true,
        category: newAddon.category || null,
        icon_name: newAddon.icon_name || null,
        hero_image_url: newAddon.hero_image_url || null,
        highlights: highlightsArray,
        features: newAddon.features || []
      });
      toast.success('Add-on aangemaakt');
      setCreateAddonDialogOpen(false);
      setNewAddon({ name: '', slug: '', description: '', price: 3500, category: '', icon_name: '', hero_image_url: '', highlights: '', features: [] });
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
      // Parse highlights from comma-separated string to array
      const highlightsArray = editAddonForm.highlights 
        ? (typeof editAddonForm.highlights === 'string' 
            ? editAddonForm.highlights.split(',').map(h => h.trim()).filter(Boolean)
            : editAddonForm.highlights)
        : [];
      
      await updateAddon(selectedAddon.id, {
        name: editAddonForm.name,
        description: editAddonForm.description,
        price: parseFloat(editAddonForm.price) || 0,
        category: editAddonForm.category || null,
        icon_name: editAddonForm.icon_name || null,
        hero_image_url: editAddonForm.hero_image_url || null,
        highlights: highlightsArray,
        features: editAddonForm.features || []
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

  // Workspace handlers
  const handleDeleteWorkspace = async (workspaceId) => {
    try {
      await deleteWorkspace(workspaceId);
      toast.success('Workspace verwijderd');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen workspace');
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
    
    # SSL certificaat (via CloudPanel Let&apos;s Encrypt)
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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-1" data-testid="admin-page">
      {/* Hero Header - Same style as Dashboard */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Decorative Blurs */}
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-emerald-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-teal-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[10px] sm:text-sm mb-2 sm:mb-4">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>SUPERADMIN</span>
            </div>
            <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold text-white mb-1">
              Beheerder Dashboard
            </h1>
            <p className="text-slate-400 text-xs sm:text-base lg:text-lg">
              Beheer klanten, modules en instellingen
            </p>
          </div>
          
          <button 
            onClick={() => setCreateCustomerDialogOpen(true)} 
            data-testid="create-customer-btn"
            className="w-full sm:w-auto self-start font-semibold shadow-lg text-xs sm:text-sm h-9 sm:h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
            <span className="text-emerald-700">Klant Aanmaken</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Customers - Featured */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-3 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white/20 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <p className="text-emerald-100 text-[11px] sm:text-sm font-medium">Totaal Klanten</p>
            </div>
            <p className="text-xl sm:text-3xl lg:text-4xl font-bold">{stats?.total_customers || 0}</p>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <p className="text-muted-foreground text-[11px] sm:text-sm font-medium">Actief</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-emerald-600">{stats?.active_subscriptions || 0}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Actieve Abonnementen</p>
        </div>

        {/* Expired Subscriptions */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-rose-500/10 flex items-center justify-center">
              <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-rose-500" />
            </div>
            <p className="text-muted-foreground text-[11px] sm:text-sm font-medium">Verlopen</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-rose-600">{stats?.expired_subscriptions || 0}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Verlopen Abonnementen</p>
        </div>

        {/* Revenue Card */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-3 sm:p-6">
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-emerald-500/20 rounded-full blur-[60px]"></div>
          <div className="relative">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <p className="text-slate-400 text-[11px] sm:text-sm font-medium">Omzet</p>
            </div>
            <p className="text-xl sm:text-3xl font-bold text-white">{formatCurrency(stats?.total_revenue || 0)}</p>
            <p className="text-[10px] sm:text-xs text-emerald-400 mt-0.5 sm:mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400"></span>
              Deze maand: {formatCurrency(stats?.revenue_this_month || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Requests - Modern Alert */}
      {requests.length > 0 && (
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-amber-800 dark:text-amber-200">
                Openstaande Verzoeken ({requests.length})
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm mb-3 sm:mb-4">Klanten die wachten op activatie</p>
              <div className="space-y-2">
                {requests.slice(0, 3).map((request) => (
                  <div 
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/80 dark:bg-slate-900/50 rounded-lg border border-amber-200 dark:border-amber-900/30"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{request.user_name}</p>
                      <p className="text-xs text-slate-500 truncate">{request.user_email}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white"
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
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Tabs Navigation - Responsive */}
      <Tabs defaultValue="customers" className="space-y-4 sm:space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-1 sm:p-1.5 overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex gap-0.5 sm:gap-1 bg-transparent min-w-max">
            <TabsTrigger value="customers" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden xs:inline">Klanten</span>
              <span className="xs:hidden">Klant</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Betalingen</span>
              <span className="sm:hidden">Betal</span>
            </TabsTrigger>
            <TabsTrigger value="addons" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Puzzle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Add-ons</span>
              <span className="sm:hidden">Add</span>
              {addonRequests.length > 0 && (
                <Badge className="ml-1 sm:ml-1.5 bg-orange-500 text-white text-[10px] sm:text-xs px-1 sm:px-1.5">{addonRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="module-requests" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Verzoeken</span>
              <span className="sm:hidden">Verz</span>
              {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="ml-1 sm:ml-1.5 bg-white text-orange-600 text-[10px] sm:text-xs px-1 sm:px-1.5">
                  {paymentRequests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="workspaces" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Workspaces</span>
              <span className="sm:hidden">Work</span>
            </TabsTrigger>
            <TabsTrigger value="domain-provisioning" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Server className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Domains</span>
              <span className="sm:hidden">Dom</span>
            </TabsTrigger>
            <TabsTrigger value="domains" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Domeinen</span>
              <span className="sm:hidden">Dom</span>
            </TabsTrigger>
            <TabsTrigger value="betaalmethodes" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Betalen</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="website" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Website</span>
              <span className="sm:hidden">Web</span>
            </TabsTrigger>
            <TabsTrigger value="update" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap">
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Update</span>
              <span className="sm:hidden">Upd</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Customers Tab */}
        <TabsContent value="workspaces">
          <div className="space-y-4 sm:space-y-6">
            {/* Workspace Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Totaal</p>
                      <p className="text-3xl font-bold text-blue-600">{workspaceStats.total}</p>
                    </div>
                    <Building2 className="w-10 h-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs sm:text-sm">Actief</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-600">{workspaceStats.active}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs sm:text-sm">In Afwachting</p>
                      <p className="text-2xl sm:text-3xl font-bold text-orange-600">{workspaceStats.pending}</p>
                    </div>
                    <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Create Workspace Dialog */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Zoek workspaces..."
                  value={workspaceSearch}
                  onChange={(e) => setWorkspaceSearch(e.target.value)}
                  className="pl-10"
                  data-testid="workspace-search"
                />
              </div>
              <Button onClick={() => setCreateWorkspaceOpen(true)} data-testid="create-workspace-btn" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Workspace
              </Button>
            </div>

            {/* Workspaces Table */}
            <Card>
              <CardContent className="p-0">
                {loadingWorkspaces ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Workspace</th>
                          <th className="text-left p-4 font-medium">Eigenaar</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Domein</th>
                          <th className="text-left p-4 font-medium">Aangemaakt</th>
                          <th className="text-left p-4 font-medium">Acties</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkspaces.map((ws) => (
                          <tr key={ws.id} className="border-b hover:bg-accent/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{ws.name}</p>
                                  <p className="text-sm text-muted-foreground">{ws.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {ws.owner_email || '-'}
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={ws.status === 'active' ? 'default' : ws.status === 'pending' ? 'secondary' : 'destructive'}
                                className={ws.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                              >
                                {ws.status === 'active' ? 'Actief' : ws.status === 'pending' ? 'In Afwachting' : 'Fout'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {ws.domain?.subdomain ? (
                                <a 
                                  href={`https://${ws.domain.subdomain}.facturatie.sr`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {ws.domain.subdomain}.facturatie.sr
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : ws.domain?.custom_domain ? (
                                <a 
                                  href={`https://${ws.domain.custom_domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {ws.domain.custom_domain}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {ws.created_at ? new Date(ws.created_at).toLocaleDateString('nl-NL') : '-'}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedWorkspace(ws);
                                    setEditWorkspaceOpen(true);
                                  }}
                                  data-testid={`edit-workspace-${ws.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteWorkspace(ws.id)}
                                  data-testid={`delete-workspace-${ws.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                              title="Modules Activeren"
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
                                title="Modules Deactiveren"
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

        {/* Module Payment Requests Tab */}
        <TabsContent value="module-requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    Module Betaalverzoeken
                  </CardTitle>
                  <CardDescription>Bevestig betalingen en activeer modules voor klanten</CardDescription>
                </div>
                <Button variant="outline" onClick={loadData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Vernieuwen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-lg font-medium">Geen openstaande verzoeken</p>
                  <p className="text-muted-foreground">Alle module betaalverzoeken zijn verwerkt</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentRequests.map((request) => (
                    <div 
                      key={request.id}
                      className={`p-4 rounded-xl border-2 ${
                        request.status === 'pending' 
                          ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' 
                          : request.status === 'confirmed'
                          ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{request.user_name || 'Onbekend'}</h4>
                              <p className="text-sm text-muted-foreground">{request.user_email}</p>
                            </div>
                            <Badge className={
                              request.status === 'pending' ? 'bg-orange-500' :
                              request.status === 'confirmed' ? 'bg-emerald-500' : 'bg-slate-500'
                            }>
                              {request.status === 'pending' ? 'Wachtend' :
                               request.status === 'confirmed' ? 'Bevestigd' : request.status}
                            </Badge>
                          </div>
                          
                          <div className="ml-13 space-y-1">
                            <p className="text-sm font-medium">Modules:</p>
                            <div className="flex flex-wrap gap-2">
                              {request.modules?.map((module, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {module.addon_name} - SRD {module.price?.toLocaleString('nl-NL')}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              Totaal: <span className="font-bold text-primary">SRD {request.total_amount?.toLocaleString('nl-NL')}</span> /maand
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Aangevraagd: {new Date(request.created_at).toLocaleString('nl-NL')}
                            </p>
                          </div>
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 lg:mt-0">
                            <Select
                              defaultValue="1"
                              onValueChange={(value) => {
                                // Store selected months for this request
                                request.selectedMonths = parseInt(value);
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-32">
                                <SelectValue placeholder="Maanden" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 maand</SelectItem>
                                <SelectItem value="3">3 maanden</SelectItem>
                                <SelectItem value="6">6 maanden</SelectItem>
                                <SelectItem value="12">12 maanden</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={async () => {
                                try {
                                  const months = request.selectedMonths || 1;
                                  await confirmModulePayment(request.id, months);
                                  toast.success(`Modules geactiveerd voor ${months} maand(en)`);
                                  loadData();
                                } catch (error) {
                                  toast.error('Fout bij bevestigen betaling');
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Bevestigen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Domain Provisioning Tab */}
        <TabsContent value="domain-provisioning">
          <DomainManagementPage />
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons">
          <div className="space-y-6">
            {/* Add-on Requests */}
            {addonRequests.length > 0 && (
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <CardTitle className="text-lg">Openstaande Add-on Verzoeken</CardTitle>
                    <Badge className="bg-orange-500 text-white">{addonRequests.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {addonRequests.map((request) => (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-background rounded-lg border">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{request.user_email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{request.addon_name}</Badge>
                            <span className="text-sm text-primary font-medium">
                              {formatCurrency(request.addon_price || 0)}/maand
                            </span>
                          </div>
                          {request.notes && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">&quot;{request.notes}&quot;</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="flex-1 sm:flex-none"
                            onClick={() => {
                              setSelectedAddonRequest(request);
                              setAddonMonths('1');
                              setApproveAddonRequestDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Goedkeuren</span>
                            <span className="sm:hidden">OK</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleRejectAddonRequest(request.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Afwijzen</span>
                            <span className="sm:hidden">Nee</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add-ons Management */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Add-ons Beheer</CardTitle>
                    <CardDescription>Beheer beschikbare add-ons en prijzen</CardDescription>
                  </div>
                  <Button onClick={() => setCreateAddonDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Add-on
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Naam</th>
                        <th className="text-left py-3 px-4 font-medium">Slug</th>
                        <th className="text-left py-3 px-4 font-medium">Prijs/maand</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-right py-3 px-4 font-medium">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addons.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Geen add-ons gevonden
                          </td>
                        </tr>
                      ) : (
                        addons.map((addon) => (
                          <tr key={addon.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary" />
                                <span className="font-medium">{addon.name}</span>
                              </div>
                              {addon.description && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                                  {addon.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-xs bg-muted px-2 py-1 rounded">{addon.slug}</code>
                            </td>
                            <td className="py-3 px-4 font-medium text-primary">
                              {formatCurrency(addon.price)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={addon.is_active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}>
                                {addon.is_active ? 'Actief' : 'Inactief'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAddon(addon);
                                    setEditAddonForm({
                                      name: addon.name,
                                      description: addon.description || '',
                                      price: addon.price,
                                      category: addon.category || '',
                                      icon_name: addon.icon_name || '',
                                      hero_image_url: addon.hero_image_url || '',
                                      highlights: Array.isArray(addon.highlights) ? addon.highlights.join(', ') : '',
                                      features: addon.features || []
                                    });
                                    setEditAddonDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedAddon(addon);
                                    setDeleteAddonDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Activate Add-on for Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add-on Activeren voor Klant</CardTitle>
                <CardDescription>Selecteer een klant en activeer een add-on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Klant selecteren</Label>
                    <Select 
                      value={selectedCustomer?.id || ''} 
                      onValueChange={(value) => {
                        const customer = customers.find(c => c.id === value);
                        setSelectedCustomer(customer);
                        if (customer) {
                          loadCustomerAddons(customer.id);
                        }
                      }}
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
                  
                  {selectedCustomer && (
                    <div className="space-y-2">
                      <Label>Add-on selecteren</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedAddon?.id || ''} 
                          onValueChange={(value) => setSelectedAddon(addons.find(a => a.id === value))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecteer een add-on" />
                          </SelectTrigger>
                          <SelectContent>
                            {addons.filter(a => a.is_active).map((addon) => (
                              <SelectItem key={addon.id} value={addon.id}>
                                {addon.name} - {formatCurrency(addon.price)}/mnd
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={() => setActivateAddonDialogOpen(true)}
                          disabled={!selectedAddon}
                        >
                          Activeren
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Show customer's current add-ons */}
                {selectedCustomer && customerAddons.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium mb-3">Actieve add-ons voor {selectedCustomer.name}</h4>
                    <div className="space-y-2">
                      {customerAddons.map((ua) => (
                        <div key={ua.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <span className="font-medium">{ua.addon_name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={
                                ua.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                                ua.status === 'expired' ? 'bg-red-500/10 text-red-500' : 
                                'bg-gray-500/10 text-gray-500'
                              }>
                                {ua.status === 'active' ? 'Actief' : ua.status === 'expired' ? 'Verlopen' : 'Gedeactiveerd'}
                              </Badge>
                              {ua.end_date && (
                                <span className="text-xs text-muted-foreground">
                                  Tot: {new Date(ua.end_date).toLocaleDateString('nl-NL')}
                                </span>
                              )}
                            </div>
                          </div>
                          {ua.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivateUserAddon(ua.addon_id)}
                            >
                              Deactiveren
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Betaalmethodes Tab */}
        <TabsContent value="betaalmethodes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Betaalmethodes
              </CardTitle>
              <CardDescription>
                Configureer de betaalmethodes voor facturen en betalingen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Ga naar de volledige betaalmethodes configuratie pagina voor alle opties.
                </p>
                <Button onClick={() => window.location.href = '/app/betaalmethodes'}>
                  <Settings className="w-4 h-4 mr-2" />
                  Betaalmethodes Beheren
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Website Tab - CMS Beheer */}
        <TabsContent value="website">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          }>
            <WebsiteEditor />
          </Suspense>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email">
          <EmailSettingsAdmin />
        </TabsContent>

        {/* Update/Deployment Tab */}
        <TabsContent value="update">
          <div className="grid gap-4 sm:gap-6">
            {/* Server Update Script Card - NEW */}
            <Card className="border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 sm:p-3 bg-emerald-500 rounded-lg sm:rounded-xl flex-shrink-0">
                      <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                        Server Update Script
                        <Badge className="bg-emerald-500 text-white text-xs">Aanbevolen</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Voer het veilige update script uit op uw productie server
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    size="default"
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-lg w-full lg:w-auto text-sm sm:text-base"
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        const response = await triggerSystemUpdate();
                        toast.success(response.data.message || 'Update script gestart!');
                        // Refresh logs
                        const logsRes = await getDeploymentLogs();
                        setDeploymentLogs(logsRes.data);
                        // Refresh settings for last update time
                        const settingsRes = await getDeploymentSettings();
                        setDeploymentSettings(settingsRes.data);
                        // Show info toast about background process
                        toast.info('Update draait op achtergrond. Ververs pagina over ~30 sec.', { duration: 10000 });
                      } catch (error) {
                        toast.error(error.response?.data?.detail || 'Update mislukt');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    disabled={updating || deploymentSettings.last_update_status === 'running'}
                    data-testid="run-update-script-btn"
                  >
                    {updating || deploymentSettings.last_update_status === 'running' ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Update draait op achtergrond...</span>
                        <span className="sm:hidden">Bezig...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        <span className="hidden sm:inline">Uitvoeren: server-update.sh</span>
                        <span className="sm:hidden">Update</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6">
                {/* Running status indicator */}
                {deploymentSettings.last_update_status === 'running' && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="text-blue-800 font-medium">Update draait op achtergrond</p>
                      <p className="text-blue-600 text-sm">Klik op &quot;Vernieuwen&quot; om de status te controleren</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="sm:ml-auto w-full sm:w-auto"
                      onClick={async () => {
                        const res = await getDeploymentSettings();
                        setDeploymentSettings(res.data);
                        const logsRes = await getDeploymentLogs();
                        setDeploymentLogs(logsRes.data);
                        toast.success('Status vernieuwd');
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Vernieuwen
                    </Button>
                  </div>
                )}
                
                <div className="bg-white/70 rounded-lg p-3 sm:p-4 border border-emerald-200">
                  <h4 className="font-medium text-emerald-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Terminal className="w-4 h-4" />
                    Dit script voert uit:
                  </h4>
                  <code className="block text-xs sm:text-sm bg-slate-900 text-emerald-400 p-2 sm:p-3 rounded-lg mb-3 font-mono overflow-x-auto">
                    sudo /home/clp/htdocs/facturatie.sr/server-update.sh
                  </code>
                  <ul className="text-xs sm:text-sm text-emerald-800 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                      Maakt automatisch een backup
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                      Haalt laatste code op via git pull
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                      Installeert dependencies (pip/yarn)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                      Bouwt frontend opnieuw
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                      Herstart backend en frontend services
                    </li>
                  </ul>
                </div>
                {deploymentSettings.last_update && (
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mt-3">
                    <History className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      Laatste update: {new Date(deploymentSettings.last_update).toLocaleString('nl-NL')}
                    </span>
                    {deploymentSettings.last_update_status === 'success' ? (
                      <Badge className="bg-green-100 text-green-700">Succesvol</Badge>
                    ) : deploymentSettings.last_update_status === 'failed' ? (
                      <Badge className="bg-red-100 text-red-700">Mislukt</Badge>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning Alert */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm sm:text-base">Belangrijke eerste stap</h4>
                  <p className="text-amber-800 text-xs sm:text-sm mt-1">
                    Voordat u op de knop klikt, zorg dat u de laatste code naar GitHub hebt gepushed via 
                    <strong> &quot;Save to Github&quot;</strong> in Emergent. Anders wordt er niets nieuws opgehaald.
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Update Instellingen
                </CardTitle>
                <CardDescription>
                  Configureer wat er tijdens een update moet gebeuren
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium mb-3">Update Opties</h4>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deploymentSettings.auto_rebuild_frontend}
                      onChange={(e) => setDeploymentSettings({...deploymentSettings, auto_rebuild_frontend: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium">Frontend Rebuilden</span>
                      <p className="text-xs text-gray-500">Bouw de frontend opnieuw na git pull</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deploymentSettings.sync_modules !== false}
                      onChange={(e) => setDeploymentSettings({...deploymentSettings, sync_modules: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium">Modules Synchroniseren</span>
                      <p className="text-xs text-gray-500">Synchroniseer nieuwe modules naar de database</p>
                    </div>
                  </label>
                </div>

                <Button 
                  className="w-full mt-4"
                  variant="outline"
                  onClick={async () => {
                    setSavingDeploySettings(true);
                    try {
                      await updateDeploymentSettings(deploymentSettings);
                      toast.success('Instellingen opgeslagen');
                    } catch (error) {
                      toast.error('Opslaan mislukt');
                    } finally {
                      setSavingDeploySettings(false);
                    }
                  }}
                  disabled={savingDeploySettings}
                  data-testid="save-deploy-settings-btn"
                >
                  {savingDeploySettings ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Instellingen Opslaan
                </Button>
              </CardContent>
            </Card>

            {/* Deployment Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="w-5 h-5" />
                      Deployment Logs
                    </CardTitle>
                    <CardDescription>Geschiedenis van systeem updates</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await getDeploymentLogs();
                        setDeploymentLogs(res.data);
                        toast.success('Logs vernieuwd');
                      } catch (error) {
                        toast.error('Laden mislukt');
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Vernieuwen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deploymentLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nog geen deployment logs</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deploymentLogs.map((log) => (
                      <div key={log.id} className={`p-3 rounded-lg border ${
                        log.status === 'success' ? 'bg-green-50 border-green-200' :
                        log.status === 'failed' ? 'bg-red-50 border-red-200' :
                        log.status === 'running' ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {log.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : log.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-red-600" />
                            ) : log.status === 'running' ? (
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            ) : (
                              <Clock className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-medium">{log.message}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString('nl-NL')}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-sm text-gray-600 mt-2 font-mono bg-white/50 p-2 rounded">
                            {log.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Workspace Dialog */}
      <Dialog open={createWorkspaceDialogOpen} onOpenChange={setCreateWorkspaceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Nieuwe Workspace Aanmaken
            </DialogTitle>
            <DialogDescription>
              Maak een gescheiden omgeving aan voor een klant
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workspace Naam *</Label>
                <Input
                  placeholder="Bedrijfsnaam B.V."
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL) *</Label>
                <Input
                  placeholder="bedrijfsnaam"
                  value={newWorkspace.slug}
                  onChange={(e) => setNewWorkspace({...newWorkspace, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                />
                <p className="text-xs text-gray-500">Alleen kleine letters, cijfers en koppeltekens</p>
              </div>
            </div>

            {/* Owner Selection */}
            <div className="space-y-2">
              <Label>Eigenaar (Klant) *</Label>
              <Select value={newWorkspace.owner_id} onValueChange={(v) => setNewWorkspace({...newWorkspace, owner_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een klant" />
                </SelectTrigger>
                <SelectContent>
                  {customers.filter(c => c.role !== 'superadmin').map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Domain Settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Domein Configuratie
              </h4>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <label className={`flex-1 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-colors ${newWorkspace.domain_type === 'subdomain' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="domain_type"
                      value="subdomain"
                      checked={newWorkspace.domain_type === 'subdomain'}
                      onChange={() => setNewWorkspace({...newWorkspace, domain_type: 'subdomain'})}
                      className="sr-only"
                    />
                    <div className="font-medium mb-1 text-sm sm:text-base">Subdomein</div>
                    <p className="text-xs sm:text-sm text-gray-500">klantnaam.facturatie.sr</p>
                    <p className="text-xs text-green-600 mt-2">✓ Direct actief</p>
                  </label>
                  
                  <label className={`flex-1 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-colors ${newWorkspace.domain_type === 'custom' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="domain_type"
                      value="custom"
                      checked={newWorkspace.domain_type === 'custom'}
                      onChange={() => setNewWorkspace({...newWorkspace, domain_type: 'custom'})}
                      className="sr-only"
                    />
                    <div className="font-medium mb-1 text-sm sm:text-base">Custom Domein</div>
                    <p className="text-xs sm:text-sm text-gray-500">portal.klantdomein.nl</p>
                    <p className="text-xs text-orange-600 mt-2">⏳ DNS verificatie vereist</p>
                  </label>
                </div>

                {newWorkspace.domain_type === 'subdomain' && (
                  <div className="space-y-2">
                    <Label>Subdomein</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="klantnaam"
                        value={newWorkspace.subdomain || newWorkspace.slug}
                        onChange={(e) => setNewWorkspace({...newWorkspace, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        className="flex-1"
                      />
                      <span className="text-gray-500">.facturatie.sr</span>
                    </div>
                  </div>
                )}

                {newWorkspace.domain_type === 'custom' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Custom Domein</Label>
                      <Input
                        placeholder="portal.klantdomein.nl"
                        value={newWorkspace.custom_domain}
                        onChange={(e) => setNewWorkspace({...newWorkspace, custom_domain: e.target.value.toLowerCase()})}
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">DNS Instructies</h5>
                      <p className="text-sm text-blue-700 mb-2">
                        De klant moet een A-record aanmaken:
                      </p>
                      <div className="bg-white rounded p-2 font-mono text-sm">
                        <span className="text-gray-500">Type:</span> A<br />
                        <span className="text-gray-500">Naam:</span> {newWorkspace.custom_domain || 'portal.klantdomein.nl'}<br />
                        <span className="text-gray-500">Waarde:</span> 72.62.174.117
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Branding Settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Portaal Naam</Label>
                  <Input
                    placeholder="Klant Portaal"
                    value={newWorkspace.branding.portal_name}
                    onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, portal_name: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newWorkspace.branding.logo_url}
                    onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, logo_url: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newWorkspace.branding.primary_color}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, primary_color: e.target.value}})}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={newWorkspace.branding.primary_color}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, primary_color: e.target.value}})}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secundaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newWorkspace.branding.secondary_color}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, secondary_color: e.target.value}})}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={newWorkspace.branding.secondary_color}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, secondary_color: e.target.value}})}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateWorkspaceDialogOpen(false)} className="w-full sm:w-auto">Annuleren</Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
              onClick={async () => {
                if (!newWorkspace.name || !newWorkspace.slug || !newWorkspace.owner_id) {
                  toast.error('Vul alle verplichte velden in');
                  return;
                }
                try {
                  await createWorkspace(newWorkspace);
                  toast.success('Workspace aangemaakt');
                  setCreateWorkspaceDialogOpen(false);
                  setNewWorkspace({
                    name: '', slug: '', owner_id: '', domain_type: 'subdomain', subdomain: '', custom_domain: '',
                    branding: { logo_url: '', favicon_url: '', primary_color: '#0caf60', secondary_color: '#059669', portal_name: '' }
                  });
                  loadData();
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Aanmaken mislukt');
                }
              }}
            >
              Workspace Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog open={editWorkspaceDialogOpen} onOpenChange={setEditWorkspaceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workspace Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de instellingen van {selectedWorkspace?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workspace Naam</Label>
                <Input
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (niet wijzigbaar)</Label>
                <Input value={newWorkspace.slug} disabled className="bg-gray-100" />
              </div>
            </div>

            {/* Branding */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Branding</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Portaal Naam</Label>
                  <Input
                    value={newWorkspace.branding?.portal_name || ''}
                    onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, portal_name: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={newWorkspace.branding?.logo_url || ''}
                    onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, logo_url: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newWorkspace.branding?.primary_color || '#0caf60'}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, primary_color: e.target.value}})}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={newWorkspace.branding?.primary_color || '#0caf60'}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, primary_color: e.target.value}})}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secundaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newWorkspace.branding?.secondary_color || '#059669'}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, secondary_color: e.target.value}})}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={newWorkspace.branding?.secondary_color || '#059669'}
                      onChange={(e) => setNewWorkspace({...newWorkspace, branding: {...newWorkspace.branding, secondary_color: e.target.value}})}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWorkspaceDialogOpen(false)}>Annuleren</Button>
            <Button 
              onClick={async () => {
                try {
                  await updateWorkspace(selectedWorkspace.id, {
                    name: newWorkspace.name,
                    branding: newWorkspace.branding
                  });
                  toast.success('Workspace bijgewerkt');
                  setEditWorkspaceDialogOpen(false);
                  loadData();
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Bijwerken mislukt');
                }
              }}
            >
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Dialog */}
      <Dialog open={deleteWorkspaceDialogOpen} onOpenChange={setDeleteWorkspaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Workspace Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u &quot;{selectedWorkspace?.name}&quot; wilt verwijderen? Dit verwijdert ook alle gebruikers en data van deze workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWorkspaceDialogOpen(false)}>Annuleren</Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteWorkspace(selectedWorkspace.id);
                  toast.success('Workspace verwijderd');
                  setDeleteWorkspaceDialogOpen(false);
                  loadData();
                } catch (error) {
                  toast.error('Verwijderen mislukt');
                }
              }}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nginx Config Dialog */}
      <Dialog open={nginxConfigDialogOpen} onOpenChange={setNginxConfigDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Nginx Configuratie - {selectedWorkspace?.name}
            </DialogTitle>
            <DialogDescription>
              Kopieer deze configuratie naar uw VPS server
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
            <pre>{nginxConfig}</pre>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNginxConfigDialogOpen(false)}>Sluiten</Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(nginxConfig);
              toast.success('Configuratie gekopieerd');
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Kopiëren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Activate Dialog - Module Selection */}
      <Dialog open={activateDialogOpen} onOpenChange={(open) => {
        setActivateDialogOpen(open);
        if (!open) setSelectedModules([]);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modules Activeren/Verlengen</DialogTitle>
            <DialogDescription>
              Selecteer modules voor {selectedCustomer?.name} en activeer met één klik
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Module Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecteer Modules</Label>
              <div className="grid gap-2">
                {addons.filter(a => a.is_active).map(addon => {
                  const isSelected = selectedModules.includes(addon.id);
                  const isFree = addon.is_free || addon.price === 0;
                  return (
                    <div
                      key={addon.id}
                      onClick={() => {
                        setSelectedModules(prev => 
                          prev.includes(addon.id)
                            ? prev.filter(id => id !== addon.id)
                            : [...prev, addon.id]
                        );
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{addon.name}</p>
                          <p className="text-xs text-muted-foreground">{addon.slug}</p>
                        </div>
                      </div>
                      <Badge variant={isFree ? "secondary" : "outline"}>
                        {isFree ? 'GRATIS' : formatCurrency(addon.price) + '/mnd'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {selectedModules.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">{selectedModules.length} module(s) geselecteerd</p>
                <p className="text-xs text-muted-foreground">
                  Totaal: {formatCurrency(
                    addons
                      .filter(a => selectedModules.includes(a.id))
                      .reduce((sum, a) => sum + (a.price || 0), 0)
                  )}/maand
                </p>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-2">
              <Label>Aantal maanden</Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger data-testid="months-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 maand</SelectItem>
                  <SelectItem value="3">3 maanden</SelectItem>
                  <SelectItem value="6">6 maanden</SelectItem>
                  <SelectItem value="12">12 maanden (jaar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <Label>Betaalmethode</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={async () => {
                if (selectedModules.length === 0) {
                  toast.error('Selecteer minimaal één module');
                  return;
                }
                setActivating(true);
                try {
                  await bulkActivateModules(selectedCustomer.id, {
                    user_id: selectedCustomer.id,
                    addon_ids: selectedModules,
                    months: parseInt(months),
                    payment_method: paymentMethod,
                    payment_reference: paymentReference || undefined
                  });
                  toast.success(`${selectedModules.length} module(s) geactiveerd voor ${selectedCustomer.name}`);
                  setActivateDialogOpen(false);
                  setSelectedModules([]);
                  setSelectedCustomer(null);
                  loadData();
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Fout bij activeren');
                } finally {
                  setActivating(false);
                }
              }} 
              disabled={activating || selectedModules.length === 0}
            >
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {selectedModules.length} Module(s) Activeren
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
            <DialogTitle>Modules Deactiveren</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u de modules van {selectedCustomer?.name} wilt deactiveren?
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
                <li>Kies &quot;Reverse Proxy&quot; of &quot;Static Site&quot;</li>
                <li>Vraag SSL certificaat aan (Let&apos;s Encrypt)</li>
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

      {/* Create Add-on Dialog */}
      <Dialog open={createAddonDialogOpen} onOpenChange={setCreateAddonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Add-on Aanmaken</DialogTitle>
            <DialogDescription>
              Maak een nieuwe add-on aan die klanten kunnen activeren. De module detail pagina wordt automatisch gegenereerd op basis van onderstaande gegevens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  placeholder="bijv. Vastgoed Beheer"
                  value={newAddon.name}
                  onChange={(e) => setNewAddon({...newAddon, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (unieke identificatie) *</Label>
                <Input
                  placeholder="bijv. vastgoed_beheer"
                  value={newAddon.slug}
                  onChange={(e) => setNewAddon({...newAddon, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                />
                <p className="text-xs text-muted-foreground">Gebruik alleen kleine letters, cijfers en streepjes. Dit wordt de URL: /modules/{newAddon.slug || 'slug'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Beschrijving *</Label>
              <Input
                placeholder="Uitgebreide beschrijving van de add-on (verschijnt op de module detail pagina)"
                value={newAddon.description}
                onChange={(e) => setNewAddon({...newAddon, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prijs per maand (SRD)</Label>
                <Input
                  type="number"
                  placeholder="3500 (0 = gratis)"
                  value={newAddon.price}
                  onChange={(e) => setNewAddon({...newAddon, price: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">Gebruik 0 voor een gratis module</p>
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newAddon.category}
                  onChange={(e) => setNewAddon({...newAddon, category: e.target.value})}
                >
                  <option value="">Selecteer categorie...</option>
                  <option value="financieel">Financieel</option>
                  <option value="hrm">HRM / Personeel</option>
                  <option value="vastgoed">Vastgoed</option>
                  <option value="automotive">Automotive</option>
                  <option value="beauty">Beauty / Wellness</option>
                  <option value="retail">Retail / Verkoop</option>
                  <option value="analytics">Analytics / Rapportage</option>
                  <option value="algemeen">Algemeen</option>
                </select>
                <p className="text-xs text-muted-foreground">Bepaalt de kleur van de module</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icoon naam (Lucide)</Label>
                <Input
                  placeholder="bijv. Users, Building2, Calculator"
                  value={newAddon.icon_name}
                  onChange={(e) => setNewAddon({...newAddon, icon_name: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">Zie <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">lucide.dev/icons</a></p>
              </div>
              <div className="space-y-2">
                <Label>Hero Afbeelding URL</Label>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={newAddon.hero_image_url}
                  onChange={(e) => setNewAddon({...newAddon, hero_image_url: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Highlights (gescheiden door komma&apos;s) *</Label>
              <Input
                placeholder="bijv. Multi-valuta, BTW berekening, Rapportages, Gratis"
                value={newAddon.highlights}
                onChange={(e) => setNewAddon({...newAddon, highlights: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">4-6 korte kenmerken die als badges op de module pagina worden getoond</p>
            </div>
            
            {/* Info box about module page */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Na het aanmaken kunt u de module bewerken om extra features/secties toe te voegen. 
                De module detail pagina (/modules/{newAddon.slug || 'slug'}) wordt automatisch gegenereerd.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAddonDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateAddon} disabled={activating}>
              {activating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Dialog */}
      <Dialog open={editAddonDialogOpen} onOpenChange={setEditAddonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add-on Bewerken</DialogTitle>
            <DialogDescription>
              Pas de add-on gegevens aan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input
                value={editAddonForm.name}
                onChange={(e) => setEditAddonForm({...editAddonForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Input
                value={editAddonForm.description}
                onChange={(e) => setEditAddonForm({...editAddonForm, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prijs per maand (SRD)</Label>
                <Input
                  type="number"
                  value={editAddonForm.price}
                  onChange={(e) => setEditAddonForm({...editAddonForm, price: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Input
                  placeholder="bijv. Personeel, Vastgoed, Analytics"
                  value={editAddonForm.category}
                  onChange={(e) => setEditAddonForm({...editAddonForm, category: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icoon naam (Lucide)</Label>
                <Input
                  placeholder="bijv. Users, Building2, BarChart3"
                  value={editAddonForm.icon_name}
                  onChange={(e) => setEditAddonForm({...editAddonForm, icon_name: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">Zie lucide.dev/icons voor opties</p>
              </div>
              <div className="space-y-2">
                <Label>Hero Afbeelding URL</Label>
                <Input
                  placeholder="https://..."
                  value={editAddonForm.hero_image_url}
                  onChange={(e) => setEditAddonForm({...editAddonForm, hero_image_url: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Highlights (gescheiden door komma&apos;s)</Label>
              <Input
                placeholder="bijv. Dashboard, Rapporten, Facturatie, Beheer"
                value={editAddonForm.highlights}
                onChange={(e) => setEditAddonForm({...editAddonForm, highlights: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Korte kenmerken die op de module pagina worden getoond</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAddonDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleEditAddon} disabled={activating}>
              {activating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Add-on Dialog */}
      <Dialog open={deleteAddonDialogOpen} onOpenChange={setDeleteAddonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add-on Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u de add-on &quot;{selectedAddon?.name}&quot; wilt verwijderen? 
              Dit zal ook alle klant-koppelingen verwijderen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAddonDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeleteAddon} disabled={activating}>
              {activating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Add-on for Customer Dialog */}
      <Dialog open={activateAddonDialogOpen} onOpenChange={setActivateAddonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add-on Activeren</DialogTitle>
            <DialogDescription>
              Activeer &quot;{selectedAddon?.name}&quot; voor {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Prijs per maand</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(selectedAddon?.price || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Aantal maanden</Label>
              <Select value={addonMonths} onValueChange={setAddonMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 maand</SelectItem>
                  <SelectItem value="3">3 maanden</SelectItem>
                  <SelectItem value="6">6 maanden</SelectItem>
                  <SelectItem value="12">12 maanden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-sm font-medium text-green-600">
                Totaal: {formatCurrency((selectedAddon?.price || 0) * parseInt(addonMonths || 1))}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateAddonDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleActivateAddonForCustomer} disabled={activating}>
              {activating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Activeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Add-on Request Dialog */}
      <Dialog open={approveAddonRequestDialogOpen} onOpenChange={setApproveAddonRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add-on Verzoek Goedkeuren</DialogTitle>
            <DialogDescription>
              Keur het verzoek van {selectedAddonRequest?.user_name} goed voor &quot;{selectedAddonRequest?.addon_name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Klant:</span>
                <span className="font-medium">{selectedAddonRequest?.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{selectedAddonRequest?.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Add-on:</span>
                <span className="font-medium">{selectedAddonRequest?.addon_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prijs:</span>
                <span className="text-primary font-medium">{formatCurrency(selectedAddonRequest?.addon_price || 0)}/maand</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Aantal maanden activeren</Label>
              <Select value={addonMonths} onValueChange={setAddonMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 maand</SelectItem>
                  <SelectItem value="3">3 maanden</SelectItem>
                  <SelectItem value="6">6 maanden</SelectItem>
                  <SelectItem value="12">12 maanden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveAddonRequestDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleApproveAddonRequest} disabled={activating}>
              {activating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Goedkeuren & Activeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
