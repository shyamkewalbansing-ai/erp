import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  Shield
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function DomeinenPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create domain dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDomain, setNewDomain] = useState({
    domain: '',
    customer_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [domainsRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/admin/domains`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/customers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDomains(domainsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      toast.error('Fout bij laden domeinen');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDomain = async () => {
    if (!newDomain.domain || !newDomain.customer_id) {
      toast.error('Domein en klant zijn verplicht');
      return;
    }
    
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/admin/domains`, newDomain, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Domein toegevoegd');
      setCreateDialogOpen(false);
      setNewDomain({ domain: '', customer_id: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen');
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/admin/domains/${domainId}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('DNS verificatie gestart');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verificatie');
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm('Weet u zeker dat u dit domein wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/domains/${domainId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Domein verwijderd');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const filteredDomains = domains.filter(d =>
    d.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="domains-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domeinen</h1>
          <p className="text-muted-foreground">Beheer custom domeinen voor klanten</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Domein
        </Button>
      </div>

      {/* DNS Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            DNS Configuratie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 text-sm mb-3">
            Klanten moeten de volgende DNS records instellen voor hun custom domein:
          </p>
          <div className="bg-white rounded-lg p-3 font-mono text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span><strong>Type:</strong> A</span>
              <span><strong>Value:</strong> 72.62.174.80</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard('72.62.174.80')}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Zoek domeinen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Domains List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Domeinen ({filteredDomains.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDomains.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Domein</th>
                    <th className="text-left p-3 font-medium">Klant</th>
                    <th className="text-left p-3 font-medium">DNS Status</th>
                    <th className="text-left p-3 font-medium">SSL</th>
                    <th className="text-left p-3 font-medium">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.map((domain) => (
                    <tr key={domain.id} className="border-b hover:bg-accent/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{domain.domain}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {customers.find(c => c.id === domain.customer_id)?.name || '-'}
                      </td>
                      <td className="p-3">
                        <Badge variant={domain.dns_verified ? 'default' : 'secondary'}>
                          {domain.dns_verified ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Geverifieerd</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> In afwachting</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={domain.ssl_active ? 'default' : 'secondary'}>
                          {domain.ssl_active ? 'Actief' : 'Inactief'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerifyDomain(domain.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDeleteDomain(domain.id)}
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Geen domeinen gevonden</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuw Custom Domein</DialogTitle>
            <DialogDescription>Voeg een custom domein toe voor een klant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Domein</Label>
              <Input
                value={newDomain.domain}
                onChange={(e) => setNewDomain({...newDomain, domain: e.target.value.toLowerCase()})}
                placeholder="voorbeeld.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Klant</Label>
              <Select 
                value={newDomain.customer_id} 
                onValueChange={(value) => setNewDomain({...newDomain, customer_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer klant" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleCreateDomain} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
