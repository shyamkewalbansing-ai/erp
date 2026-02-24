import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, Plus, FileText, Trash2, Search, Send, DollarSign, Mail, 
  Download, Eye, Receipt, ArrowRight, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import SendInvoiceEmailDialog from '../../components/SendInvoiceEmailDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (amount, currency = 'SRD') => `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2 }) || '0,00'}`;

const statusColors = { 
  concept: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', 
  verstuurd: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', 
  betaald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', 
  gedeeltelijk_betaald: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', 
  vervallen: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
};

const statusLabels = { 
  concept: 'Concept', 
  verstuurd: 'Verstuurd', 
  betaald: 'Betaald', 
  gedeeltelijk_betaald: 'Gedeeltelijk', 
  vervallen: 'Vervallen' 
};

export default function VerkoopfacturenPage() {
  const [facturen, setFacturen] = useState([]);
  const [debiteuren, setDebiteuren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedFactuur, setSelectedFactuur] = useState(null);
  const [selectedDebiteur, setSelectedDebiteur] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [form, setForm] = useState({ 
    debiteur_id: '', 
    factuurdatum: new Date().toISOString().split('T')[0], 
    valuta: 'SRD', 
    regels: [{ omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '25' }], 
    opmerkingen: '' 
  });
  const [payForm, setPayForm] = useState({ 
    bedrag: 0, 
    betaaldatum: new Date().toISOString().split('T')[0], 
    betaalmethode: 'bank' 
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [facturenRes, debRes] = await Promise.all([
        api.get('/boekhouding/verkoopfacturen'), 
        api.get('/boekhouding/debiteuren')
      ]);
      setFacturen(facturenRes.data);
      setDebiteuren(debRes.data);
    } catch (err) { 
      toast.error('Kon data niet laden'); 
    } finally { 
      setLoading(false); 
    }
  };

  const addRegel = () => setForm({
    ...form, 
    regels: [...form.regels, { omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '25' }]
  });
  
  const removeRegel = (i) => setForm({
    ...form, 
    regels: form.regels.filter((_, idx) => idx !== i)
  });
  
  const updateRegel = (i, field, value) => { 
    const newRegels = [...form.regels]; 
    newRegels[i][field] = value; 
    setForm({...form, regels: newRegels}); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.debiteur_id) { toast.error('Selecteer een debiteur'); return; }
    if (form.regels.length === 0 || !form.regels[0].omschrijving) { toast.error('Voeg minimaal 1 regel toe'); return; }
    try {
      await api.post('/boekhouding/verkoopfacturen', form);
      toast.success('Factuur aangemaakt');
      setDialogOpen(false);
      setForm({ 
        debiteur_id: '', 
        factuurdatum: new Date().toISOString().split('T')[0], 
        valuta: 'SRD', 
        regels: [{ omschrijving: '', aantal: 1, prijs_per_stuk: 0, btw_tarief: '25' }], 
        opmerkingen: '' 
      });
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Fout bij aanmaken'); 
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/boekhouding/verkoopfacturen/${id}/status?status=${status}`);
      toast.success('Status bijgewerkt');
      loadData();
    } catch (err) { 
      toast.error('Fout bij bijwerken status'); 
    }
  };

  const openPayDialog = (f) => { 
    setSelectedFactuur(f); 
    setPayForm({ 
      bedrag: f.totaal - f.betaald_bedrag, 
      betaaldatum: new Date().toISOString().split('T')[0], 
      betaalmethode: 'bank' 
    }); 
    setPayDialogOpen(true); 
  };

  const openEmailDialog = (f) => {
    const debiteur = debiteuren.find(d => d.id === f.debiteur_id);
    setSelectedFactuur(f);
    setSelectedDebiteur(debiteur);
    setEmailDialogOpen(true);
  };

  const handlePay = async () => {
    try {
      await api.post(`/boekhouding/verkoopfacturen/${selectedFactuur.id}/betaling`, payForm);
      toast.success('Betaling geregistreerd');
      setPayDialogOpen(false);
      loadData();
    } catch (err) { 
      toast.error('Fout bij registreren betaling'); 
    }
  };

  // Download PDF
  const handleDownloadPdf = async (factuur) => {
    setDownloadingPdf(factuur.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/pdf/verkoopfactuur/${factuur.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Fout bij downloaden');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Factuur_${factuur.factuurnummer}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Fout bij downloaden PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Preview PDF (opens in new tab)
  const handlePreviewPdf = async (factuur) => {
    const token = localStorage.getItem('token');
    window.open(`${API_URL}/api/pdf/verkoopfactuur/${factuur.id}/preview?token=${token}`, '_blank');
  };

  const filtered = facturen.filter(f => 
    f.factuurnummer?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.debiteur_naam?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    totaal: facturen.length,
    concept: facturen.filter(f => f.status === 'concept').length,
    verstuurd: facturen.filter(f => f.status === 'verstuurd').length,
    betaald: facturen.filter(f => f.status === 'betaald').length,
    totaalBedrag: facturen.reduce((sum, f) => sum + (f.totaal || 0), 0),
    openstaand: facturen.filter(f => !['betaald', 'concept'].includes(f.status))
      .reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Facturen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="verkoopfacturen-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3">
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Boekhouding</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Verkoopfacturen</h1>
            <p className="text-slate-400 text-sm sm:text-base">Beheer uw facturen aan klanten</p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto"
            data-testid="nieuwe-factuur-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Factuur
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Concept</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.concept}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Verstuurd</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.verstuurd}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Betaald</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.betaald}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl sm:rounded-2xl bg-card border p-3 sm:p-4 lg:p-5 col-span-2 lg:col-span-1 ${stats.openstaand > 0 ? 'border-amber-300' : 'border-border/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${stats.openstaand > 0 ? 'bg-amber-500/10' : 'bg-slate-500/10'}`}>
              <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${stats.openstaand > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Openstaand</p>
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${stats.openstaand > 0 ? 'text-amber-600' : ''}`}>
                SRD {stats.openstaand.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek facturen..."
          className="pl-10 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Facturen List */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Geen facturen gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">Maak uw eerste factuur aan</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Factuur
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((f) => (
              <div key={f.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm sm:text-base font-mono">{f.factuurnummer}</p>
                      <Badge className={`${statusColors[f.status]} text-xs`}>{statusLabels[f.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.debiteur_naam}</p>
                    <p className="text-xs text-muted-foreground">
                      Datum: {f.factuurdatum} • Vervalt: {f.vervaldatum}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ml-13 lg:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold">{formatCurrency(f.totaal, f.valuta)}</p>
                    {f.betaald_bedrag > 0 && f.betaald_bedrag < f.totaal && (
                      <p className="text-xs text-muted-foreground">
                        Betaald: {formatCurrency(f.betaald_bedrag, f.valuta)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {/* PDF Download */}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDownloadPdf(f)} 
                      disabled={downloadingPdf === f.id}
                      title="Download PDF"
                      className="rounded-lg"
                      data-testid={`download-pdf-${f.id}`}
                    >
                      {downloadingPdf === f.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-emerald-600" />
                      )}
                    </Button>
                    
                    {/* Status Actions */}
                    {f.status === 'concept' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => updateStatus(f.id, 'verstuurd')} 
                        title="Markeer als verstuurd"
                        className="rounded-lg"
                      >
                        <Send className="w-4 h-4 text-blue-500" />
                      </Button>
                    )}
                    
                    {/* Email */}
                    {f.status !== 'concept' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => openEmailDialog(f)} 
                        title="Verstuur per email"
                        className="rounded-lg"
                      >
                        <Mail className="w-4 h-4 text-blue-500" />
                      </Button>
                    )}
                    
                    {/* Payment */}
                    {['verstuurd', 'gedeeltelijk_betaald'].includes(f.status) && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => openPayDialog(f)} 
                        title="Betaling registreren"
                        className="rounded-lg"
                      >
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Factuur Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Nieuwe Verkoopfactuur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Debiteur *</Label>
                <Select value={form.debiteur_id} onValueChange={(v) => setForm({...form, debiteur_id: v})}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                  <SelectContent>
                    {debiteuren.map(d => <SelectItem key={d.id} value={d.id}>{d.naam}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Datum *</Label>
                <Input 
                  className="rounded-lg"
                  type="date" 
                  value={form.factuurdatum} 
                  onChange={(e) => setForm({...form, factuurdatum: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Valuta *</Label>
                <Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm">Factuurregels</Label>
              {form.regels.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-5">
                    <Input 
                      className="rounded-lg"
                      placeholder="Omschrijving" 
                      value={r.omschrijving} 
                      onChange={(e) => updateRegel(i, 'omschrijving', e.target.value)} 
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input 
                      className="rounded-lg"
                      type="number" 
                      placeholder="Aantal" 
                      value={r.aantal} 
                      onChange={(e) => updateRegel(i, 'aantal', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input 
                      className="rounded-lg"
                      type="number" 
                      placeholder="Prijs" 
                      value={r.prijs_per_stuk} 
                      onChange={(e) => updateRegel(i, 'prijs_per_stuk', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Select value={r.btw_tarief} onValueChange={(v) => updateRegel(i, 'btw_tarief', v)}>
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="25">25%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    {form.regels.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeRegel(i)} className="rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRegel} className="rounded-lg">
                <Plus className="w-4 h-4 mr-1" />Regel Toevoegen
              </Button>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto rounded-lg">
                Annuleren
              </Button>
              <Button type="submit" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 rounded-lg">
                Factuur Aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Betaling Registreren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm">Factuur: <span className="font-mono font-bold">{selectedFactuur?.factuurnummer}</span></p>
              <p className="text-sm">Openstaand: <span className="font-bold text-amber-600">
                {formatCurrency(selectedFactuur?.totaal - selectedFactuur?.betaald_bedrag, selectedFactuur?.valuta)}
              </span></p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Bedrag</Label>
              <Input 
                className="rounded-lg"
                type="number" 
                value={payForm.bedrag} 
                onChange={(e) => setPayForm({...payForm, bedrag: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Datum</Label>
              <Input 
                className="rounded-lg"
                type="date" 
                value={payForm.betaaldatum} 
                onChange={(e) => setPayForm({...payForm, betaaldatum: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Betaalmethode</Label>
              <Select value={payForm.betaalmethode} onValueChange={(v) => setPayForm({...payForm, betaalmethode: v})}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="kas">Kas</SelectItem>
                  <SelectItem value="pin">PIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} className="w-full sm:w-auto rounded-lg">
              Annuleren
            </Button>
            <Button onClick={handlePay} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 rounded-lg">
              Betaling Registreren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <SendInvoiceEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        factuur={selectedFactuur}
        debiteur={selectedDebiteur}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
