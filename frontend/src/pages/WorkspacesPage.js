import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
  Loader2,
  Trash2,
  Eye,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function WorkspacesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceStats, setWorkspaceStats] = useState({ total: 0, active: 0, pending: 0, error: 0 });
  
  // Create workspace dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    slug: '',
    owner_id: '',
    domain_type: 'subdomain'
  });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/workspaces`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ws = response.data || [];
      setWorkspaces(ws);
      
      // Calculate stats
      setWorkspaceStats({
        total: ws.length,
        active: ws.filter(w => w.status === 'active').length,
        pending: ws.filter(w => w.status === 'pending').length,
        error: ws.filter(w => w.status === 'error').length
      });
    } catch (error) {
      toast.error('Fout bij laden workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name || !newWorkspace.slug) {
      toast.error('Naam en slug zijn verplicht');
      return;
    }
    
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/admin/workspaces`, newWorkspace, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Workspace aangemaakt');
      setCreateDialogOpen(false);
      setNewWorkspace({ name: '', slug: '', owner_id: '', domain_type: 'subdomain' });
      loadWorkspaces();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (!window.confirm('Weet u zeker dat u deze workspace wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/workspaces/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Workspace verwijderd');
      loadWorkspaces();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="workspaces-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">Beheer alle klant workspaces</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Workspace
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Totaal</p>
                <p className="text-3xl font-bold">{workspaceStats.total}</p>
              </div>
              <Layers className="w-10 h-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Actief</p>
                <p className="text-3xl font-bold text-green-600">{workspaceStats.active}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">In Afwachting</p>
                <p className="text-3xl font-bold text-orange-600">{workspaceStats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Fouten</p>
                <p className="text-3xl font-bold text-red-600">{workspaceStats.error}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Zoek workspaces..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workspaces List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Workspaces ({filteredWorkspaces.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Naam</th>
                  <th className="text-left p-3 font-medium">Slug</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Domein</th>
                  <th className="text-left p-3 font-medium">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkspaces.map((ws) => (
                  <tr key={ws.id} className="border-b hover:bg-accent/50">
                    <td className="p-3 font-medium">{ws.name}</td>
                    <td className="p-3 text-muted-foreground">{ws.slug}</td>
                    <td className="p-3">
                      <Badge variant={ws.status === 'active' ? 'default' : ws.status === 'pending' ? 'secondary' : 'destructive'}>
                        {ws.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">
                      {ws.domain?.subdomain && (
                        <span className="text-blue-600">{ws.domain.subdomain}.facturatie.sr</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {ws.domain?.subdomain && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://${ws.domain.subdomain}.facturatie.sr`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteWorkspace(ws.id)}
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Workspace</DialogTitle>
            <DialogDescription>Maak een nieuwe workspace aan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                placeholder="Bedrijfsnaam"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={newWorkspace.slug}
                onChange={(e) => setNewWorkspace({...newWorkspace, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                placeholder="bedrijfsnaam"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleCreateWorkspace} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
