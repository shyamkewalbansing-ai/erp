import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getWorkspaceUsers, 
  inviteWorkspaceUser, 
  removeWorkspaceUser, 
  updateWorkspaceBranding,
  getWorkspaceBackups,
  createWorkspaceBackup,
  restoreWorkspaceBackup,
  deleteWorkspaceBackup,
  downloadWorkspaceBackup,
  getWorkspaceSettings,
  updateWorkspaceSettings,
  updateWorkspaceDomain,
  verifyWorkspaceDomain,
  createUserWorkspace
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Palette, Globe, Trash2, Crown, Shield, Eye, Mail, Loader2, Save,
  Database, Download, RotateCcw, Plus, AlertTriangle, Clock, HardDrive, Settings,
  Link, Server, CheckCircle, XCircle, Copy, RefreshCw, Building2, ExternalLink
} from 'lucide-react';

export default function WorkspaceSettings() {
  const { user, workspace, branding, updateBranding, fetchWorkspace } = useAuth();
  const [users, setUsers] = useState([]);
  const [backups, setBackups] = useState([]);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupsLoading, setBackupsLoading] = useState(true);
  
  // Dialogs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [createWorkspaceDialogOpen, setCreateWorkspaceDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  
  // Loading states
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  
  // Forms
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'member' });
  const [backupForm, setBackupForm] = useState({ name: '', description: '' });
  const [settingsForm, setSettingsForm] = useState({ name: '', slug: '' });
  const [domainForm, setDomainForm] = useState({ domain_type: 'subdomain', subdomain: '', custom_domain: '' });
  const [newWorkspaceForm, setNewWorkspaceForm] = useState({ name: '', slug: '' });
  const [brandingForm, setBrandingForm] = useState({
    logo_url: '', portal_name: '', primary_color: '#0caf60', secondary_color: '#059669'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        logo_url: branding.logo_url || '',
        portal_name: branding.portal_name || '',
        primary_color: branding.primary_color || '#0caf60',
        secondary_color: branding.secondary_color || '#059669'
      });
    }
  }, [branding]);

  const loadData = async () => {
    try {
      const [usersRes, settingsRes] = await Promise.all([
        getWorkspaceUsers().catch(() => ({ data: [] })),
        getWorkspaceSettings().catch(() => ({ data: { has_workspace: false } }))
      ]);
      
      setUsers(usersRes.data);
      setWorkspaceData(settingsRes.data);
      
      if (settingsRes.data?.workspace) {
        setSettingsForm({
          name: settingsRes.data.workspace.name || '',
          slug: settingsRes.data.workspace.slug || ''
        });
        if (settingsRes.data.domain) {
          setDomainForm({
            domain_type: settingsRes.data.domain.type || 'subdomain',
            subdomain: settingsRes.data.domain.subdomain || '',
            custom_domain: settingsRes.data.domain.custom_domain || ''
          });
        }
      }
      
      // Load backups
      try {
        const backupsRes = await getWorkspaceBackups();
        setBackups(backupsRes.data);
      } catch (e) {
        console.log('No backups or error loading backups');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setBackupsLoading(false);
    }
  };

  // === Workspace Settings Handlers ===
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateWorkspaceSettings(settingsForm);
      toast.success('Workspace instellingen opgeslagen');
      await loadData();
      await fetchWorkspace();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSavingSettings(false);
    }
  };

  // === Domain Handlers ===
  const handleSaveDomain = async () => {
    setSavingDomain(true);
    try {
      await updateWorkspaceDomain(domainForm);
      toast.success('Domein instellingen opgeslagen');
      setDomainDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDns = async () => {
    setVerifyingDns(true);
    try {
      const res = await verifyWorkspaceDomain();
      if (res.data.success) {
        toast.success(res.data.message);
        await loadData();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verificatie mislukt');
    } finally {
      setVerifyingDns(false);
    }
  };

  // === Create Workspace Handler ===
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceForm.name) {
      toast.error('Geef een naam voor de workspace');
      return;
    }
    setCreatingWorkspace(true);
    try {
      await createUserWorkspace(newWorkspaceForm);
      toast.success('Workspace aangemaakt!');
      setCreateWorkspaceDialogOpen(false);
      await loadData();
      await fetchWorkspace();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Aanmaken mislukt');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  // === User Handlers ===
  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Vul alle velden in');
      return;
    }
    try {
      await inviteWorkspaceUser(inviteForm);
      toast.success('Gebruiker uitgenodigd');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', name: '', role: 'member' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Uitnodigen mislukt');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Weet u zeker dat u deze gebruiker wilt verwijderen?')) return;
    try {
      await removeWorkspaceUser(userId);
      toast.success('Gebruiker verwijderd');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verwijderen mislukt');
    }
  };

  // === Branding Handlers ===
  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const success = await updateBranding(brandingForm);
      if (success) {
        toast.success('Branding opgeslagen');
        await fetchWorkspace();
      } else {
        toast.error('Opslaan mislukt');
      }
    } catch (error) {
      toast.error('Opslaan mislukt');
    } finally {
      setSavingBranding(false);
    }
  };

  // === Backup Handlers ===
  const handleCreateBackup = async () => {
    if (!backupForm.name) {
      toast.error('Geef een naam voor de backup');
      return;
    }
    setCreatingBackup(true);
    try {
      await createWorkspaceBackup(backupForm);
      toast.success('Backup succesvol aangemaakt');
      setBackupDialogOpen(false);
      setBackupForm({ name: '', description: '' });
      const res = await getWorkspaceBackups();
      setBackups(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Backup maken mislukt');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    setRestoringBackup(true);
    try {
      const res = await restoreWorkspaceBackup(selectedBackup.id, true);
      toast.success(`Backup hersteld! ${res.data.records_restored} records teruggezet.`);
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      const backupsRes = await getWorkspaceBackups();
      setBackups(backupsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Herstel mislukt');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDeleteBackup = async (backup) => {
    if (!window.confirm(`Weet u zeker dat u backup "${backup.name}" wilt verwijderen?`)) return;
    try {
      await deleteWorkspaceBackup(backup.id);
      toast.success('Backup verwijderd');
      const res = await getWorkspaceBackups();
      setBackups(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verwijderen mislukt');
    }
  };

  const handleDownloadBackup = async (backup) => {
    try {
      const res = await downloadWorkspaceBackup(backup.id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backup.name.replace(/\s+/g, '_')}_${backup.id.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Backup gedownload');
    } catch (error) {
      toast.error('Download mislukt');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  // === Helpers ===
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('nl-NL', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner': return <Badge className="bg-yellow-100 text-yellow-700">Eigenaar</Badge>;
      case 'admin': return <Badge className="bg-blue-100 text-blue-700">Admin</Badge>;
      case 'member': return <Badge className="bg-green-100 text-green-700">Lid</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700">Viewer</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // No workspace - show create option
  if (!workspaceData?.has_workspace) {
    return (
      <div className="max-w-2xl mx-auto py-12" data-testid="no-workspace">
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Geen Workspace</h2>
            <p className="text-gray-500 mb-6">
              Je hebt nog geen workspace. Maak er een aan om te beginnen met het beheren van je data.
            </p>
            <Button size="lg" onClick={() => setCreateWorkspaceDialogOpen(true)} data-testid="create-workspace-btn">
              <Plus className="w-5 h-5 mr-2" />
              Workspace Aanmaken
            </Button>
          </CardContent>
        </Card>

        {/* Create Workspace Dialog */}
        <Dialog open={createWorkspaceDialogOpen} onOpenChange={setCreateWorkspaceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Workspace Aanmaken</DialogTitle>
              <DialogDescription>Maak een workspace aan voor jouw organisatie</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workspace Naam *</Label>
                <Input
                  value={newWorkspaceForm.name}
                  onChange={(e) => setNewWorkspaceForm({...newWorkspaceForm, name: e.target.value})}
                  placeholder="Mijn Bedrijf"
                  data-testid="new-workspace-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL-vriendelijke naam)</Label>
                <Input
                  value={newWorkspaceForm.slug}
                  onChange={(e) => setNewWorkspaceForm({...newWorkspaceForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  placeholder="mijn-bedrijf"
                />
                <p className="text-xs text-gray-500">Dit wordt je subdomein: {newWorkspaceForm.slug || 'mijn-bedrijf'}.facturatie.sr</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateWorkspaceDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleCreateWorkspace} disabled={creatingWorkspace}>
                {creatingWorkspace ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Aanmaken
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const isOwner = workspaceData?.is_owner;
  const domain = workspaceData?.domain || {};

  return (
    <div className="space-y-6" data-testid="workspace-settings">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Instellingen</h1>
        <p className="text-gray-500">Beheer uw workspace, domein, branding en gebruikers</p>
      </div>

      {/* Workspace Info Header */}
      {workspace && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: branding?.primary_color || '#0caf60' }}
                >
                  {workspace.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{workspace.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="w-4 h-4" />
                    {domain.type === 'subdomain' 
                      ? <span>{domain.full_subdomain || `${domain.subdomain}.facturatie.sr`}</span>
                      : domain.custom_domain || 'Geen domein'}
                    {domain.dns_verified ? (
                      <Badge className="bg-green-100 text-green-700 ml-2"><CheckCircle className="w-3 h-3 mr-1" /> Actief</Badge>
                    ) : domain.type === 'custom' ? (
                      <Badge className="bg-yellow-100 text-yellow-700 ml-2"><Clock className="w-3 h-3 mr-1" /> DNS Verificatie</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              {isOwner && (
                <Badge className="bg-yellow-100 text-yellow-700"><Crown className="w-3 h-3 mr-1" /> Eigenaar</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2" />Algemeen</TabsTrigger>
          <TabsTrigger value="domain"><Globe className="w-4 h-4 mr-2" />Domein</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="w-4 h-4 mr-2" />Branding</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Gebruikers</TabsTrigger>
          <TabsTrigger value="backups"><Database className="w-4 h-4 mr-2" />Backups</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Algemene Instellingen</CardTitle>
              <CardDescription>Beheer de basisgegevens van je workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workspace Naam</Label>
                  <Input
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})}
                    placeholder="Mijn Bedrijf"
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input
                    value={settingsForm.slug}
                    onChange={(e) => setSettingsForm({...settingsForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    placeholder="mijn-bedrijf"
                    disabled={!isOwner}
                  />
                  <p className="text-xs text-gray-500">URL: {settingsForm.slug}.facturatie.sr</p>
                </div>
              </div>
              
              {isOwner && (
                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Instellingen Opslaan
                </Button>
              )}
              
              {!isOwner && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Alleen de eigenaar kan workspace instellingen wijzigen
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Domein Instellingen</CardTitle>
                  <CardDescription>Configureer je subdomein of eigen domein</CardDescription>
                </div>
                {isOwner && (
                  <Button onClick={() => setDomainDialogOpen(true)} data-testid="change-domain-btn">
                    <Link className="w-4 h-4 mr-2" />
                    Domein Wijzigen
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Domain Info */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Huidig Domein Type:</span>
                  <Badge>{domain.type === 'subdomain' ? 'Subdomein' : 'Custom Domein'}</Badge>
                </div>
                
                {domain.type === 'subdomain' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subdomein:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-1 rounded border">{domain.full_subdomain || `${domain.subdomain}.facturatie.sr`}</code>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`https://${domain.full_subdomain || `${domain.subdomain}.facturatie.sr`}`)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a href={`https://${domain.full_subdomain || `${domain.subdomain}.facturatie.sr`}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Custom Domein:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-3 py-1 rounded border">{domain.custom_domain}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(domain.custom_domain)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">DNS Status:</span>
                      {domain.dns_verified ? (
                        <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Geverifieerd</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" /> Wacht op verificatie</Badge>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* DNS Instructions for Custom Domain */}
              {domain.type === 'custom' && domain.dns_instructions && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-800">
                    <Server className="w-5 h-5" />
                    DNS Configuratie Instructies
                  </h4>
                  <p className="text-sm text-blue-700">{domain.dns_instructions.instructions}</p>
                  
                  <div className="bg-white rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Record Type:</span>
                        <p className="font-mono font-medium">{domain.dns_instructions.record_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Host/Naam:</span>
                        <p className="font-mono font-medium">@</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Waarde:</span>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-medium">{domain.dns_instructions.value}</p>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(domain.dns_instructions.value)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isOwner && !domain.dns_verified && (
                    <Button onClick={handleVerifyDns} disabled={verifyingDns} className="w-full">
                      {verifyingDns ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      DNS Verificeren
                    </Button>
                  )}
                </div>
              )}

              {/* SSL Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">SSL Certificaat:</span>
                {domain.ssl_active ? (
                  <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Actief</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600"><XCircle className="w-3 h-3 mr-1" /> Niet actief</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Pas het uiterlijk van je portaal aan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Portaal Naam</Label>
                <Input
                  value={brandingForm.portal_name}
                  onChange={(e) => setBrandingForm({...brandingForm, portal_name: e.target.value})}
                  placeholder="Mijn Bedrijf Portaal"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={brandingForm.logo_url}
                  onChange={(e) => setBrandingForm({...brandingForm, logo_url: e.target.value})}
                  placeholder="https://..."
                />
                {brandingForm.logo_url && (
                  <img src={brandingForm.logo_url} alt="Preview" className="h-10 mt-2" />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({...brandingForm, primary_color: e.target.value})}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({...brandingForm, primary_color: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secundaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({...brandingForm, secondary_color: e.target.value})}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({...brandingForm, secondary_color: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveBranding} disabled={savingBranding} className="w-full">
                {savingBranding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Branding Opslaan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gebruikers</CardTitle>
                  <CardDescription>{users.length} gebruiker(s) in workspace</CardDescription>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)} size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Uitnodigen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nog geen gebruikers</p>
                  <Button variant="link" onClick={() => setInviteDialogOpen(true)}>Nodig iemand uit</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((wsUser) => (
                    <div key={wsUser.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getRoleIcon(wsUser.role)}
                        <div>
                          <p className="font-medium">{wsUser.name}</p>
                          <p className="text-sm text-gray-500">{wsUser.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(wsUser.role)}
                        {wsUser.role !== 'owner' && wsUser.user_id !== user?.id && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleRemoveUser(wsUser.user_id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Backup & Herstel</CardTitle>
                  <CardDescription>Maak backups van uw workspace data en herstel wanneer nodig</CardDescription>
                </div>
                <Button onClick={() => setBackupDialogOpen(true)} data-testid="create-backup-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Backup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {backupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nog geen backups</p>
                  <p className="text-sm mt-1">Maak een backup om uw data veilig te stellen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <HardDrive className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(backup.created_at)}</span>
                            <span>{formatBytes(backup.size_bytes)}</span>
                            <span>{backup.records_count} records</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadBackup(backup)} title="Download"><Download className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedBackup(backup); setRestoreDialogOpen(true); }} title="Herstel"><RotateCcw className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteBackup(backup)} title="Verwijder"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === DIALOGS === */}

      {/* Domain Dialog */}
      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Domein Wijzigen</DialogTitle>
            <DialogDescription>Kies tussen een subdomein of je eigen domein</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Domein Type</Label>
              <Select value={domainForm.domain_type} onValueChange={(v) => setDomainForm({...domainForm, domain_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subdomain">Subdomein (gratis, direct actief)</SelectItem>
                  <SelectItem value="custom">Eigen Domein (DNS configuratie vereist)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {domainForm.domain_type === 'subdomain' ? (
              <div className="space-y-2">
                <Label>Subdomein</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={domainForm.subdomain}
                    onChange={(e) => setDomainForm({...domainForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    placeholder={settingsForm.slug || 'mijn-bedrijf'}
                  />
                  <span className="text-gray-500">.facturatie.sr</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Custom Domein</Label>
                <Input
                  value={domainForm.custom_domain}
                  onChange={(e) => setDomainForm({...domainForm, custom_domain: e.target.value})}
                  placeholder="portal.jouwbedrijf.nl"
                />
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Na het opslaan moet je een A-record aanmaken in je DNS-instellingen
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveDomain} disabled={savingDomain}>
              {savingDomain ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker Uitnodigen</DialogTitle>
            <DialogDescription>Nodig een nieuwe gebruiker uit voor uw workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={inviteForm.name} onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})} placeholder="Jan Jansen" />
            </div>
            <div className="space-y-2">
              <Label>E-mailadres *</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})} placeholder="jan@voorbeeld.nl" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({...inviteForm, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Volledige toegang</SelectItem>
                  <SelectItem value="member">Lid - Bewerken</SelectItem>
                  <SelectItem value="viewer">Viewer - Alleen lezen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleInvite}><Mail className="w-4 h-4 mr-2" />Uitnodigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Backup Maken</DialogTitle>
            <DialogDescription>Maak een backup van alle workspace data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Backup Naam *</Label>
              <Input value={backupForm.name} onChange={(e) => setBackupForm({...backupForm, name: e.target.value})} placeholder="Maandelijkse backup januari" />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving (optioneel)</Label>
              <Input value={backupForm.description} onChange={(e) => setBackupForm({...backupForm, description: e.target.value})} placeholder="Notities..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              Backup Maken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Backup Herstellen
            </DialogTitle>
          </DialogHeader>
          {selectedBackup && (
            <div className="py-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="font-medium text-amber-800 mb-2">Let op!</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Alle huidige data wordt overschreven</li>
                  <li>• Er wordt automatisch een veiligheidsbackup gemaakt</li>
                  <li>• Dit kan niet ongedaan worden gemaakt</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedBackup.name}</p>
                <p className="text-sm text-gray-500">{formatDate(selectedBackup.created_at)} • {selectedBackup.records_count} records</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleRestoreBackup} disabled={restoringBackup} variant="destructive">
              {restoringBackup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Backup Herstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
