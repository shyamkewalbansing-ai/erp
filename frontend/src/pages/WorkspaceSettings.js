import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getWorkspaceUsers, 
  inviteWorkspaceUser, 
  updateWorkspaceUserRole, 
  removeWorkspaceUser, 
  updateWorkspaceBranding,
  getWorkspaceBackups,
  createWorkspaceBackup,
  restoreWorkspaceBackup,
  deleteWorkspaceBackup,
  downloadWorkspaceBackup
} from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Palette, 
  Globe, 
  Trash2, 
  Crown, 
  Shield, 
  Eye,
  Mail,
  Loader2,
  Save,
  Database,
  Download,
  RotateCcw,
  Plus,
  AlertTriangle,
  Clock,
  HardDrive,
  FileJson
} from 'lucide-react';

export default function WorkspaceSettings() {
  const { user, workspace, branding, updateBranding, fetchWorkspace } = useAuth();
  const [users, setUsers] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'member' });
  const [backupForm, setBackupForm] = useState({ name: '', description: '' });
  const [brandingForm, setBrandingForm] = useState({
    logo_url: '',
    portal_name: '',
    primary_color: '#0caf60',
    secondary_color: '#059669'
  });

  useEffect(() => {
    loadData();
    loadBackups();
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
      const res = await getWorkspaceUsers();
      setUsers(res.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const res = await getWorkspaceBackups();
      setBackups(res.data);
    } catch (error) {
      console.error('Error loading backups:', error);
    } finally {
      setBackupsLoading(false);
    }
  };

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

  const handleRoleChange = async (userId, role) => {
    try {
      await updateWorkspaceUserRole(userId, role);
      toast.success('Rol bijgewerkt');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bijwerken mislukt');
    }
  };

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

  // Backup functions
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
      loadBackups();
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
      loadBackups();
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
      loadBackups();
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

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <div className="space-y-6" data-testid="workspace-settings">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Instellingen</h1>
        <p className="text-gray-500">Beheer uw workspace, branding en gebruikers</p>
      </div>

      {/* Workspace Info */}
      {workspace && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
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
                  {workspace.domain?.type === 'subdomain' 
                    ? `${workspace.domain.subdomain}.facturatie.sr`
                    : workspace.domain?.custom_domain || 'Geen domein'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Branding
            </CardTitle>
            <CardDescription>Pas het uiterlijk van uw portaal aan</CardDescription>
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

        {/* Users Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gebruikers
                </CardTitle>
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
                <Button variant="link" onClick={() => setInviteDialogOpen(true)}>
                  Nodig iemand uit
                </Button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveUser(wsUser.user_id)}
                        >
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
      </div>

      {/* Backup & Restore Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup & Herstel
              </CardTitle>
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
                <div 
                  key={backup.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                  data-testid={`backup-item-${backup.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{backup.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(backup.created_at)}
                        </span>
                        <span>{formatBytes(backup.size_bytes)}</span>
                        <span>{backup.records_count} records</span>
                      </div>
                      {backup.description && (
                        <p className="text-sm text-gray-400 mt-1">{backup.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadBackup(backup)}
                      title="Download als JSON"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setRestoreDialogOpen(true);
                      }}
                      title="Herstel backup"
                      data-testid={`restore-backup-${backup.id}`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteBackup(backup)}
                      title="Verwijder backup"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Nieuwe Backup Maken
            </DialogTitle>
            <DialogDescription>
              Maak een backup van alle workspace data (huurders, appartementen, betalingen, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Backup Naam *</Label>
              <Input
                value={backupForm.name}
                onChange={(e) => setBackupForm({...backupForm, name: e.target.value})}
                placeholder="Bijv: Maandelijkse backup januari"
                data-testid="backup-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving (optioneel)</Label>
              <Input
                value={backupForm.description}
                onChange={(e) => setBackupForm({...backupForm, description: e.target.value})}
                placeholder="Notities over deze backup..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleCreateBackup} disabled={creatingBackup} data-testid="confirm-create-backup">
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
            <DialogDescription>
              Weet u zeker dat u de backup wilt herstellen?
            </DialogDescription>
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
                <p className="text-sm text-gray-500">
                  {formatDate(selectedBackup.created_at)} • {selectedBackup.records_count} records
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Annuleren</Button>
            <Button 
              onClick={handleRestoreBackup} 
              disabled={restoringBackup}
              variant="destructive"
              data-testid="confirm-restore-backup"
            >
              {restoringBackup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Backup Herstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker Uitnodigen</DialogTitle>
            <DialogDescription>
              Nodig een nieuwe gebruiker uit voor uw workspace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
                placeholder="Jan Jansen"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mailadres *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                placeholder="jan@voorbeeld.nl"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({...inviteForm, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Button onClick={handleInvite}>
              <Mail className="w-4 h-4 mr-2" />
              Uitnodigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
