import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Globe, 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  Server,
  Lock,
  Trash2,
  Play,
  Eye,
  Clock,
  Plus,
  Rocket
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DomainManagementPage() {
  const { token } = useAuth();
  const [domains, setDomains] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(null);
  const [previewDialog, setPreviewDialog] = useState({ open: false, config: '', domain: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, domain: null });
  
  // New domain setup state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupForm, setSetupForm] = useState({ domain: '', user_id: '' });
  const [setupResult, setSetupResult] = useState(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch(`${API_URL}/api/domains/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Fout bij ophalen domeinen');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    fetchDomains();
    fetchCustomers();
  }, [token]);

  // Automated domain setup
  const handleAutomatedSetup = async () => {
    if (!setupForm.domain || !setupForm.user_id) {
      toast.error('Vul alle velden in');
      return;
    }
    
    setSetupLoading(true);
    setSetupResult(null);
    
    try {
      const res = await fetch(`${API_URL}/api/domains/setup-automated`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: setupForm.domain,
          user_id: setupForm.user_id
        })
      });
      
      const data = await res.json();
      setSetupResult(data);
      
      if (data.success) {
        toast.success('Domein setup gestart!');
        fetchDomains();
      } else {
        toast.error(data.message || 'Setup mislukt');
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Fout bij domain setup');
      setSetupResult({
        success: false,
        message: 'Netwerkfout - probeer opnieuw',
        steps_completed: []
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const verifyDNS = async (workspaceId) => {
    setProvisioning(workspaceId + '-dns');
    try {
      const res = await fetch(`${API_URL}/api/domains/verify-dns/${workspaceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.verified) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
      fetchDomains();
    } catch (error) {
      toast.error('DNS verificatie mislukt');
    } finally {
      setProvisioning(null);
    }
  };

  const previewNginxConfig = async (workspaceId, domain) => {
    setProvisioning(workspaceId + '-preview');
    try {
      const res = await fetch(`${API_URL}/api/domains/provision/nginx/${workspaceId}?preview_only=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPreviewDialog({ open: true, config: data.config_preview, domain });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Preview mislukt');
    } finally {
      setProvisioning(null);
    }
  };

  const provisionNginx = async (workspaceId) => {
    setProvisioning(workspaceId + '-nginx');
    try {
      const res = await fetch(`${API_URL}/api/domains/provision/nginx/${workspaceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchDomains();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Nginx provisioning mislukt');
    } finally {
      setProvisioning(null);
    }
  };

  const provisionSSL = async (workspaceId) => {
    setProvisioning(workspaceId + '-ssl');
    try {
      const res = await fetch(`${API_URL}/api/domains/provision/ssl/${workspaceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchDomains();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('SSL provisioning mislukt');
    } finally {
      setProvisioning(null);
    }
  };

  const fullProvision = async (workspaceId) => {
    setProvisioning(workspaceId + '-full');
    try {
      const res = await fetch(`${API_URL}/api/domains/provision/full/${workspaceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.overall_success) {
        toast.success('Domein volledig geconfigureerd!');
      } else {
        toast.warning(data.message);
        // Show individual step results
        data.steps?.forEach(step => {
          if (!step.success) {
            toast.error(`${step.step}: ${step.message}`);
          }
        });
      }
      fetchDomains();
    } catch (error) {
      toast.error('Volledige provisioning mislukt');
    } finally {
      setProvisioning(null);
    }
  };

  const removeConfig = async (workspaceId) => {
    setProvisioning(workspaceId + '-remove');
    try {
      const res = await fetch(`${API_URL}/api/domains/provision/${workspaceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchDomains();
      } else {
        toast.error(data.message || 'Verwijderen mislukt');
      }
    } catch (error) {
      toast.error('Verwijderen mislukt');
    } finally {
      setProvisioning(null);
      setConfirmDialog({ open: false, action: null, domain: null });
    }
  };

  const getStatusBadge = (verified, type) => {
    if (verified) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          {type}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-500/20">
        <XCircle className="w-3 h-3 mr-1" />
        {type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="domain-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domain Management</h1>
          <p className="text-muted-foreground">Beheer custom domeinen, Nginx en SSL certificaten</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setSetupForm({ domain: '', user_id: '' });
              setSetupResult(null);
              setSetupDialogOpen(true);
            }} 
            data-testid="new-domain-setup-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuw Domein Setup
          </Button>
          <Button onClick={fetchDomains} variant="outline" data-testid="refresh-domains-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Automatische Domain Provisioning</AlertTitle>
        <AlertDescription>
          Dit dashboard automatiseert het configureren van Nginx en SSL voor custom domeinen. 
          Zorg ervoor dat de DNS A-record correct is geconfigureerd voordat u provisioniert.
        </AlertDescription>
      </Alert>

      {/* Domain Cards */}
      {domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Geen custom domeinen</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Er zijn nog geen workspaces met custom domeinen geconfigureerd. 
              Workspaces kunnen een custom domein instellen in hun workspace instellingen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <Card key={domain.workspace_id} data-testid={`domain-card-${domain.workspace_id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      {domain.domain}
                    </CardTitle>
                    <CardDescription>
                      Workspace: {domain.workspace_name}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(domain.dns_verified, 'DNS')}
                    {getStatusBadge(domain.nginx_configured, 'Nginx')}
                    {getStatusBadge(domain.ssl_active, 'SSL')}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Globe className={`w-4 h-4 ${domain.dns_verified ? 'text-green-500' : 'text-orange-500'}`} />
                      <div>
                        <p className="font-medium">DNS Status</p>
                        <p className="text-muted-foreground">
                          {domain.dns_verified ? 'Geverifieerd' : domain.error_message || 'Niet geverifieerd'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Server className={`w-4 h-4 ${domain.nginx_configured ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium">Nginx Status</p>
                        <p className="text-muted-foreground">
                          {domain.nginx_configured ? 'Geconfigureerd' : 'Niet geconfigureerd'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Lock className={`w-4 h-4 ${domain.ssl_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium">SSL Status</p>
                        <p className="text-muted-foreground">
                          {domain.ssl_active 
                            ? domain.ssl_expiry 
                              ? `Actief (verloopt: ${domain.ssl_expiry})` 
                              : 'Actief'
                            : 'Niet actief'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Checked */}
                  {domain.last_checked && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Laatst gecontroleerd: {new Date(domain.last_checked).toLocaleString('nl-NL')}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyDNS(domain.workspace_id)}
                      disabled={provisioning !== null}
                      data-testid={`verify-dns-${domain.workspace_id}`}
                    >
                      {provisioning === domain.workspace_id + '-dns' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      DNS Verificatie
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => previewNginxConfig(domain.workspace_id, domain.domain)}
                      disabled={provisioning !== null}
                      data-testid={`preview-nginx-${domain.workspace_id}`}
                    >
                      {provisioning === domain.workspace_id + '-preview' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 mr-2" />
                      )}
                      Preview Config
                    </Button>

                    {!domain.nginx_configured && domain.dns_verified && (
                      <Button
                        size="sm"
                        onClick={() => provisionNginx(domain.workspace_id)}
                        disabled={provisioning !== null}
                        data-testid={`provision-nginx-${domain.workspace_id}`}
                      >
                        {provisioning === domain.workspace_id + '-nginx' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Server className="w-4 h-4 mr-2" />
                        )}
                        Nginx Configureren
                      </Button>
                    )}

                    {domain.nginx_configured && !domain.ssl_active && domain.dns_verified && (
                      <Button
                        size="sm"
                        onClick={() => provisionSSL(domain.workspace_id)}
                        disabled={provisioning !== null}
                        data-testid={`provision-ssl-${domain.workspace_id}`}
                      >
                        {provisioning === domain.workspace_id + '-ssl' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Shield className="w-4 h-4 mr-2" />
                        )}
                        SSL Installeren
                      </Button>
                    )}

                    {domain.dns_verified && !domain.nginx_configured && !domain.ssl_active && (
                      <Button
                        size="sm"
                        className="bg-primary"
                        onClick={() => fullProvision(domain.workspace_id)}
                        disabled={provisioning !== null}
                        data-testid={`full-provision-${domain.workspace_id}`}
                      >
                        {provisioning === domain.workspace_id + '-full' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Volledige Setup
                      </Button>
                    )}

                    {(domain.nginx_configured || domain.ssl_active) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDialog({ 
                          open: true, 
                          action: () => removeConfig(domain.workspace_id),
                          domain: domain.domain 
                        })}
                        disabled={provisioning !== null}
                        data-testid={`remove-config-${domain.workspace_id}`}
                      >
                        {provisioning === domain.workspace_id + '-remove' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Verwijderen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Nginx Config Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ ...previewDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Nginx Configuratie Preview</DialogTitle>
            <DialogDescription>
              Configuratie voor {previewDialog.domain}
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[50vh]">
            {previewDialog.config}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog({ open: false, config: '', domain: '' })}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuratie Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u de Nginx en SSL configuratie voor {confirmDialog.domain} wilt verwijderen?
              Dit kan de toegankelijkheid van de website beïnvloeden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: null, domain: null })}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={confirmDialog.action}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
