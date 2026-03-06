import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  MessageSquare,
  Circle,
  Mail,
  Phone,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export default function LiveChatStaffManager() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [stats, setStats] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'support',
    department: 'Algemeen',
    max_concurrent_chats: 5
  });

  useEffect(() => {
    fetchStaff();
    fetchStats();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_URL}/api/live-chat/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Kon medewerkers niet laden');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/live-chat/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`${API_URL}/api/live-chat/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const newStaff = await res.json();
        setStaff([newStaff, ...staff]);
        setShowAddDialog(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'support',
          department: 'Algemeen',
          max_concurrent_chats: 5
        });
        toast.success('Medewerker toegevoegd');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Kon medewerker niet toevoegen');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('Er is een fout opgetreden');
    }
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`${API_URL}/api/live-chat/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          department: formData.department,
          max_concurrent_chats: formData.max_concurrent_chats,
          is_active: formData.is_active
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setStaff(staff.map(s => s.id === updated.id ? updated : s));
        setShowEditDialog(false);
        setEditingStaff(null);
        toast.success('Medewerker bijgewerkt');
      } else {
        toast.error('Kon medewerker niet bijwerken');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('Er is een fout opgetreden');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Weet je zeker dat je deze medewerker wilt verwijderen?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/live-chat/staff/${staffId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setStaff(staff.filter(s => s.id !== staffId));
        toast.success('Medewerker verwijderd');
      } else {
        toast.error('Kon medewerker niet verwijderen');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Er is een fout opgetreden');
    }
  };

  const openEditDialog = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      department: staffMember.department,
      max_concurrent_chats: staffMember.max_concurrent_chats,
      is_active: staffMember.is_active
    });
    setShowEditDialog(true);
  };

  const filteredStaff = staff.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'supervisor': return 'bg-purple-100 text-purple-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Totaal Medewerkers</p>
                <p className="text-2xl font-bold">{stats?.total_staff || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-2xl font-bold text-green-600">{stats?.online_staff || 0}</p>
              </div>
              <Circle className="w-8 h-8 text-green-500 fill-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Actieve Chats</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.active_sessions || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Wachtrij</p>
                <p className="text-2xl font-bold text-red-600">{stats?.waiting_sessions || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Live Chat Medewerkers
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Medewerker
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Zoek medewerker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Staff List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Geen medewerkers gevonden' : 'Nog geen medewerkers toegevoegd'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-semibold">
                          {member.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      {member.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                        {!member.is_active && (
                          <Badge variant="destructive">Inactief</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </span>
                        <span>{member.department}</span>
                        <span>Max {member.max_concurrent_chats} chats</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(member)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteStaff(member.id)}
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

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Medewerker Toevoegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStaff}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Naam</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Volledige naam"
                  required
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@voorbeeld.com"
                  required
                />
              </div>
              <div>
                <Label>Wachtwoord</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Sterk wachtwoord"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Afdeling</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    placeholder="Afdeling"
                  />
                </div>
              </div>
              <div>
                <Label>Max gelijktijdige chats</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_concurrent_chats}
                  onChange={(e) => setFormData({...formData, max_concurrent_chats: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuleren
              </Button>
              <Button type="submit">Toevoegen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medewerker Bewerken</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditStaff}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Naam</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={formData.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Afdeling</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Max gelijktijdige chats</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_concurrent_chats}
                  onChange={(e) => setFormData({...formData, max_concurrent_chats: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuleren
              </Button>
              <Button type="submit">Opslaan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
