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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="contracten-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Contracten</h1>
          <p className="text-muted-foreground mt-1">Beheer huurcontracten en digitale ondertekening</p>
        </div>
        <Button onClick={() => setShowModal(true)} data-testid="add-contract-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Contract
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalContracts}</p>
                <p className="text-sm text-muted-foreground">Totaal Contracten</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{signedContracts}</p>
                <p className="text-sm text-muted-foreground">Ondertekend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingContracts}</p>
                <p className="text-sm text-muted-foreground">Wacht op Handtekening</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op huurder of appartement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="search-contracts"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending_signature">Wacht op handtekening</SelectItem>
            <SelectItem value="signed">Ondertekend</SelectItem>
            <SelectItem value="draft">Concept</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts List */}
      <Card>
        <CardContent className="p-0">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Geen contracten gevonden</h3>
              <p className="text-muted-foreground">Maak een nieuw contract aan om te beginnen</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Huurder</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Appartement</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Huurperiode</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Huurprijs</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-muted/30" data-testid={`contract-row-${contract.id}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{contract.tenant_name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>{contract.apartment_name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {contract.start_date}
                            {contract.end_date ? ` - ${contract.end_date}` : ' - Onbepaald'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(contract.rent_amount)}</td>
                      <td className="p-4">{getStatusBadge(contract.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {contract.status === 'pending_signature' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleShowSigningLink(contract)}
                              data-testid={`signing-link-btn-${contract.id}`}
                            >
                              <Link2 className="w-4 h-4 mr-1" />
                              Link
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPdf(contract)}
                            data-testid={`download-pdf-btn-${contract.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(contract.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`delete-contract-btn-${contract.id}`}
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
