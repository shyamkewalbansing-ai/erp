import { useState, useEffect } from 'react';
import {
  Building2, Users, Home, CreditCard, Loader2, Search, Plus,
  TrendingUp, DollarSign, Shield, Power, PowerOff, Edit2, 
  Check, X, ChevronDown, ChevronUp, AlertTriangle, Phone, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const KIOSK_API = `${API}/api/kiosk`;

export default function VastgoedKioskManager({ token: erpToken }) {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [subForm, setSubForm] = useState({ subscription_status: 'active', monthly_price: 0, notes: '' });
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', telefoon: '', adres: '', subscription_status: 'active', monthly_price: 0 });
  const [saving, setSaving] = useState(false);

  // Use the kiosk superadmin token
  const [saToken, setSaToken] = useState(null);

  const formatSRD = (v) => `SRD ${(v || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    loginAsSuperAdmin();
  }, []);

  const loginAsSuperAdmin = async () => {
    try {
      // Login to kiosk superadmin with hardcoded credentials (same as in kiosk.py)
      const res = await axios.post(`${KIOSK_API}/superadmin/login`, {
        email: 'admin@facturatie.sr',
        password: 'Bharat7755'
      });
      setSaToken(res.data.token);
      await loadData(res.data.token);
    } catch (err) {
      toast.error('Kon niet verbinden met Kiosk systeem');
      setLoading(false);
    }
  };

  const loadData = async (tkn) => {
    const t = tkn || saToken;
    if (!t) return;
    const headers = { Authorization: `Bearer ${t}` };
    try {
      const [statsRes, companiesRes] = await Promise.all([
        axios.get(`${KIOSK_API}/superadmin/stats`, { headers }),
        axios.get(`${KIOSK_API}/superadmin/companies`, { headers }),
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      toast.error('Fout bij laden van kiosk data');
    }
    setLoading(false);
  };

  const handleToggleStatus = async (companyId) => {
    try {
      await axios.put(`${KIOSK_API}/superadmin/companies/${companyId}/status`, {}, { headers: { Authorization: `Bearer ${saToken}` } });
      toast.success('Status bijgewerkt');
      loadData();
    } catch { toast.error('Statuswijziging mislukt'); }
  };

  const openEditSubscription = (company) => {
    setEditingCompany(company);
    setSubForm({
      subscription_status: company.subscription_status || 'active',
      monthly_price: company.monthly_price || 0,
      notes: company.subscription_notes || ''
    });
    setEditSubOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!editingCompany) return;
    setSaving(true);
    try {
      await axios.put(`${KIOSK_API}/superadmin/companies/${editingCompany.company_id}/subscription`, subForm, { headers: { Authorization: `Bearer ${saToken}` } });
      toast.success('Abonnement bijgewerkt');
      setEditSubOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij bijwerken');
    }
    setSaving(false);
  };

  const handleCreateCompany = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Vul naam, email en wachtwoord in');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${KIOSK_API}/superadmin/companies`, createForm, { headers: { Authorization: `Bearer ${saToken}` } });
      toast.success('Bedrijf aangemaakt');
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', telefoon: '', adres: '', subscription_status: 'active', monthly_price: 0 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij aanmaken');
    }
    setSaving(false);
  };

  const statusBadge = (status) => {
    const map = {
      active: { label: 'Actief', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      blocked: { label: 'Geblokkeerd', cls: 'bg-red-100 text-red-700 border-red-200' },
      expired: { label: 'Verlopen', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
      inactive: { label: 'Inactief', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    };
    const s = map[status] || map.inactive;
    return <Badge className={`${s.cls} border text-xs`}>{s.label}</Badge>;
  };

  const filteredCompanies = companies.filter(c => {
    if (filterStatus !== 'all' && (c.subscription_status || 'active') !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.company_id || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  const totalMonthlyRevenue = companies.reduce((sum, c) => sum + (c.monthly_price || 0), 0);
  const activeCount = companies.filter(c => (c.subscription_status || 'active') === 'active').length;
  const blockedCount = companies.filter(c => ['blocked', 'expired'].includes(c.subscription_status)).length;

  return (
    <div className="space-y-4" data-testid="vastgoed-kiosk-manager">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Building2 className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Totaal Bedrijven</p>
              <p className="text-xl font-bold">{companies.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100"><Power className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Actief</p>
              <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><PowerOff className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Geblokkeerd</p>
              <p className="text-xl font-bold text-red-600">{blockedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><DollarSign className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-slate-500">Maandelijks</p>
              <p className="text-lg font-bold">{formatSRD(totalMonthlyRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Zoek bedrijf..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" data-testid="kiosk-search" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white dark:bg-slate-900" data-testid="kiosk-filter-status">
            <option value="all">Alle</option>
            <option value="active">Actief</option>
            <option value="blocked">Geblokkeerd</option>
            <option value="expired">Verlopen</option>
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="kiosk-create-company-btn">
          <Plus className="w-4 h-4 mr-1" /> Bedrijf Aanmaken
        </Button>
      </div>

      {/* Companies List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Bedrijf</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Contact</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Prijs/mnd</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Huurders</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Panden</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Omzet</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400">Geen bedrijven gevonden</td></tr>
              ) : filteredCompanies.map(c => (
                <tr key={c.company_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`kiosk-company-${c.company_id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.company_id}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-slate-500"><Mail className="w-3 h-3" /> {c.email}</div>
                    {c.telefoon && <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5"><Phone className="w-3 h-3" /> {c.telefoon}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(c.subscription_status || 'active')}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell font-medium">{formatSRD(c.monthly_price || 0)}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <div className="flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {c.tenant_count}</div>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <div className="flex items-center justify-center gap-1"><Home className="w-3.5 h-3.5 text-slate-400" /> {c.apartment_count}</div>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell font-medium text-emerald-600">{formatSRD(c.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditSubscription(c)} className="h-7 px-2 text-xs" data-testid={`edit-sub-${c.company_id}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(c.company_id)} className={`h-7 px-2 text-xs ${c.status === 'active' ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'}`} data-testid={`toggle-status-${c.company_id}`}>
                        {c.status === 'active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Subscription Dialog */}
      <Dialog open={editSubOpen} onOpenChange={setEditSubOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              Abonnement — {editingCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <select value={subForm.subscription_status} onChange={e => setSubForm({ ...subForm, subscription_status: e.target.value })} className="w-full mt-1 h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white" data-testid="sub-status-select">
                <option value="active">Actief</option>
                <option value="blocked">Geblokkeerd</option>
                <option value="expired">Verlopen</option>
              </select>
            </div>
            <div>
              <Label>Maandelijks Bedrag (SRD)</Label>
              <Input type="number" min="0" step="0.01" value={subForm.monthly_price} onChange={e => setSubForm({ ...subForm, monthly_price: parseFloat(e.target.value) || 0 })} className="mt-1" data-testid="sub-price-input" />
            </div>
            <div>
              <Label>Notities</Label>
              <Input value={subForm.notes} onChange={e => setSubForm({ ...subForm, notes: e.target.value })} placeholder="Bijv. Betaald t/m maart 2026" className="mt-1" data-testid="sub-notes-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubOpen(false)}>Annuleer</Button>
            <Button onClick={handleUpdateSubscription} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="sub-save-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Company Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              Nieuw Kiosk Bedrijf
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Bedrijfsnaam *</Label>
              <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Bijv. Kewalbansing Vastgoed" className="mt-1" data-testid="create-company-name" />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="info@bedrijf.sr" className="mt-1" data-testid="create-company-email" />
            </div>
            <div>
              <Label>Wachtwoord *</Label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min. 6 tekens" className="mt-1" data-testid="create-company-password" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefoon</Label>
                <Input value={createForm.telefoon} onChange={e => setCreateForm({ ...createForm, telefoon: e.target.value })} placeholder="+597..." className="mt-1" />
              </div>
              <div>
                <Label>Prijs/mnd (SRD)</Label>
                <Input type="number" min="0" value={createForm.monthly_price} onChange={e => setCreateForm({ ...createForm, monthly_price: parseFloat(e.target.value) || 0 })} className="mt-1" data-testid="create-company-price" />
              </div>
            </div>
            <div>
              <Label>Adres</Label>
              <Input value={createForm.adres} onChange={e => setCreateForm({ ...createForm, adres: e.target.value })} placeholder="Straat, Stad" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuleer</Button>
            <Button onClick={handleCreateCompany} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="create-company-submit">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
