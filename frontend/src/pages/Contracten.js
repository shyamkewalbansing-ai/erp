import { useState, useEffect, useRef } from 'react';
import { getTenants, getApartments, getContracts, createContract, deleteContract, downloadContractPdf, formatCurrency } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Search,
  Download,
  Trash2,
  Link2,
  Copy,
  CheckCircle2,
  Clock,
  FileSignature,
  Loader2,
  Eye,
  Calendar,
  Building2,
  User
} from 'lucide-react';

export default function Contracten() {
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    tenant_id: '',
    apartment_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    rent_amount: '',
    deposit_amount: '',
    payment_due_day: 1,
    payment_deadline_day: 0,
    payment_deadline_month_offset: 0,
    additional_terms: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contractsRes, tenantsRes, apartmentsRes] = await Promise.all([
        getContracts(),
        getTenants(),
        getApartments()
      ]);
      setContracts(contractsRes.data);
      setTenants(tenantsRes.data);
      setApartments(apartmentsRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantChange = (tenantId) => {
    setFormData({ ...formData, tenant_id: tenantId });
    
    // Find assigned apartment for this tenant
    const apt = apartments.find(a => a.tenant_id === tenantId);
    if (apt) {
      setFormData(prev => ({
        ...prev,
        tenant_id: tenantId,
        apartment_id: apt.id,
        rent_amount: apt.rent_amount.toString()
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.tenant_id || !formData.apartment_id || !formData.rent_amount) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    setSaving(true);
    try {
      await createContract({
        ...formData,
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount) || 0,
        end_date: formData.end_date || null
      });
      toast.success('Contract aangemaakt');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit contract wilt verwijderen?')) return;
    
    try {
      await deleteContract(id);
      toast.success('Contract verwijderd');
      fetchData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleDownloadPdf = async (contract) => {
    try {
      const response = await downloadContractPdf(contract.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Contract_${contract.tenant_name?.replace(/\s/g, '_')}_${contract.id.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden PDF');
    }
  };

  const handleShowSigningLink = (contract) => {
    setSelectedContract(contract);
    setShowLinkModal(true);
  };

  const copySigningLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/onderteken/${selectedContract.signing_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link gekopieerd naar klembord');
  };

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      apartment_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      rent_amount: '',
      deposit_amount: '',
      payment_due_day: 1,
      payment_deadline_day: 0,
      payment_deadline_month_offset: 0,
      additional_terms: ''
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Ondertekend</Badge>;
      case 'pending_signature':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Wacht op handtekening</Badge>;
      default:
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Concept</Badge>;
    }
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = 
      c.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.apartment_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const totalContracts = contracts.length;
  const signedContracts = contracts.filter(c => c.status === 'signed').length;
  const pendingContracts = contracts.filter(c => c.status === 'pending_signature').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Contracten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="contracten-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-teal-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-cyan-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-teal-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <FileSignature className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{totalContracts} contracten</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Contracten Beheer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer huurcontracten en digitale ondertekening
            </p>
          </div>
          
          <Button 
            onClick={() => setShowModal(true)}
            size="sm"
            className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white text-xs sm:text-sm"
            data-testid="add-contract-btn"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nieuw Contract
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Contracts - Featured */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 p-4 sm:p-6 text-white shadow-xl shadow-teal-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-xs sm:text-sm font-medium mb-1">Totaal Contracten</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{totalContracts}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Signed */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Ondertekend</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{signedContracts}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Pending Signature */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Wacht op handtekening</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingContracts}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op huurder of appartement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-muted/30 border-transparent focus:border-primary text-sm"
              data-testid="search-contracts"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="draft">Concept</SelectItem>
              <SelectItem value="pending_signature">Wacht op handtekening</SelectItem>
              <SelectItem value="signed">Ondertekend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contracts List */}
      {filteredContracts.length > 0 ? (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-border/50">
            {filteredContracts.map((contract) => (
              <div key={contract.id} className="p-4" data-testid={`contract-card-${contract.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground text-sm">{contract.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{contract.apartment_name}</p>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-muted-foreground">
                    {contract.start_date} - {contract.end_date || 'Onbepaald'}
                  </div>
                  <p className="font-semibold text-teal-600 text-sm">{formatCurrency(contract.rent_amount)}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleDownloadPdf(contract)}>
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                  {contract.status === 'pending_signature' && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleShowSigningLink(contract)}>
                      <Link2 className="w-3 h-3 mr-1" />
                      Link
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Huurder</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Appartement</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Periode</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm">Huur</th>
                  <th className="text-center p-4 font-medium text-muted-foreground text-sm">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-muted/30 transition-colors" data-testid={`contract-row-${contract.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{contract.tenant_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {contract.apartment_name}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {contract.start_date} - {contract.end_date || 'Onbepaald'}
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold text-teal-600">
                      {formatCurrency(contract.rent_amount)}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPdf(contract)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        {contract.status === 'pending_signature' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShowSigningLink(contract)}>
                            <Link2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(contract.id)}
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
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 border-dashed">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
              <FileSignature className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 text-center">
              {search || statusFilter !== 'all' ? 'Geen contracten gevonden' : 'Nog geen contracten'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm">
              {search || statusFilter !== 'all' 
                ? 'Probeer een andere zoekterm of pas uw filters aan' 
                : 'Maak uw eerste huurcontract aan om te beginnen'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button 
                onClick={() => setShowModal(true)}
                className="shadow-lg shadow-teal-500/20 bg-teal-500 hover:bg-teal-600 text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Eerste Contract Aanmaken
              </Button>
            )}
          </div>
        </div>
      )}

      {/* New Contract Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuw Huurcontract</DialogTitle>
            <DialogDescription>
              Vul de gegevens in om een huurcontract aan te maken
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Tenant Selection */}
              <div className="space-y-2">
                <Label>Huurder *</Label>
                <Select 
                  value={formData.tenant_id} 
                  onValueChange={handleTenantChange}
                >
                  <SelectTrigger data-testid="contract-tenant-select">
                    <SelectValue placeholder="Selecteer huurder" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Apartment Selection */}
              <div className="space-y-2">
                <Label>Appartement *</Label>
                <Select 
                  value={formData.apartment_id} 
                  onValueChange={(v) => setFormData({...formData, apartment_id: v})}
                >
                  <SelectTrigger data-testid="contract-apartment-select">
                    <SelectValue placeholder="Selecteer appartement" />
                  </SelectTrigger>
                  <SelectContent>
                    {apartments.map(apt => (
                      <SelectItem key={apt.id} value={apt.id}>
                        {apt.name} - {formatCurrency(apt.rent_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>Startdatum *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  data-testid="contract-start-date"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>Einddatum (leeg = onbepaalde tijd)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  data-testid="contract-end-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rent Amount */}
              <div className="space-y-2">
                <Label>Huurprijs per maand (SRD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({...formData, rent_amount: e.target.value})}
                  placeholder="0.00"
                  data-testid="contract-rent-amount"
                />
              </div>

              {/* Deposit Amount */}
              <div className="space-y-2">
                <Label>Waarborgsom (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({...formData, deposit_amount: e.target.value})}
                  placeholder="0.00"
                  data-testid="contract-deposit-amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Payment Due Day */}
              <div className="space-y-2">
                <Label>Betaaldag</Label>
                <Select 
                  value={String(formData.payment_due_day)} 
                  onValueChange={(v) => setFormData({...formData, payment_due_day: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(28)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}e van de maand
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Month */}
              <div className="space-y-2">
                <Label>Deadline maand</Label>
                <Select 
                  value={String(formData.payment_deadline_month_offset)} 
                  onValueChange={(v) => setFormData({...formData, payment_deadline_month_offset: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Dezelfde maand</SelectItem>
                    <SelectItem value="1">Volgende maand</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Day */}
              <div className="space-y-2">
                <Label>Deadline dag</Label>
                <Select 
                  value={String(formData.payment_deadline_day)} 
                  onValueChange={(v) => setFormData({...formData, payment_deadline_day: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Niet ingesteld</SelectItem>
                    {[...Array(28)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}e
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Terms */}
            <div className="space-y-2">
              <Label>Bijzondere bepalingen</Label>
              <Textarea
                value={formData.additional_terms}
                onChange={(e) => setFormData({...formData, additional_terms: e.target.value})}
                placeholder="Optionele aanvullende voorwaarden..."
                rows={4}
                data-testid="contract-additional-terms"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-contract-btn">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
              Contract Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signing Link Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ondertekeningslink</DialogTitle>
            <DialogDescription>
              Deel deze link met de huurder om het contract digitaal te ondertekenen
            </DialogDescription>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Link voor: {selectedContract.tenant_name}</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/onderteken/${selectedContract.signing_token}`}
                    className="flex-1 text-sm"
                  />
                  <Button onClick={copySigningLink} data-testid="copy-link-btn">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                De huurder kan via deze link het contract bekijken en digitaal ondertekenen met hun vinger of muis.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkModal(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
