import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Upload, Search, Loader2, CheckCircle, XCircle, AlertCircle,
  ArrowRight, FileText, Building2, RefreshCw, Trash2, Link2, Unlink,
  TrendingUp, TrendingDown, Wallet, Clock, Ban
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  niet_gematcht: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  suggestie: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  gematcht: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  genegeerd: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

const statusLabels = {
  niet_gematcht: 'Niet Gematcht',
  suggestie: 'Suggestie',
  gematcht: 'Gematcht',
  genegeerd: 'Genegeerd'
};

export default function BankReconciliatiePage() {
  const [transacties, setTransacties] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedTransactie, setSelectedTransactie] = useState(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTransacties();
    fetchStats();
  }, []);

  const fetchTransacties = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/transacties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransacties(data.transacties || []);
      }
    } catch (error) {
      toast.error('Fout bij ophalen transacties');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Fout bij ophalen stats');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/transacties/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.totaal} transacties geïmporteerd, ${data.met_suggesties} met suggesties`);
        fetchTransacties();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij uploaden');
      }
    } catch (error) {
      toast.error('Fout bij uploaden bestand');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAutoMatch = async () => {
    setAutoMatching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/transacties/auto-match`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.matched} transacties automatisch gematcht`);
        fetchTransacties();
        fetchStats();
      } else {
        toast.error('Fout bij automatisch matchen');
      }
    } catch (error) {
      toast.error('Fout bij automatisch matchen');
    } finally {
      setAutoMatching(false);
    }
  };

  const handleMatch = async (transactieId, factuurId, factuurType) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/transacties/${transactieId}/match`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          factuur_id: factuurId,
          factuur_type: factuurType
        })
      });

      if (res.ok) {
        toast.success('Transactie succesvol gematcht');
        setMatchDialogOpen(false);
        setSelectedTransactie(null);
        fetchTransacties();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij matchen');
      }
    } catch (error) {
      toast.error('Fout bij matchen');
    }
  };

  const handleIgnore = async (transactieId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/transacties/${transactieId}/ignore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Transactie genegeerd');
        fetchTransacties();
        fetchStats();
      }
    } catch (error) {
      toast.error('Fout bij negeren');
    }
  };

  const handleDelete = async (transactieId) => {
    if (!window.confirm('Weet u zeker dat u deze transactie wilt verwijderen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/bank/transacties/${transactieId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Transactie verwijderd');
        fetchTransacties();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij verwijderen');
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const filteredTransacties = transacties.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return t.omschrijving?.toLowerCase().includes(search) ||
             t.referentie?.toLowerCase().includes(search) ||
             t.tegenrekening?.toLowerCase().includes(search);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Bank Reconciliatie</h1>
              <p className="mt-2 text-emerald-100 text-sm sm:text-base">
                Match banktransacties met openstaande facturen
              </p>
            </div>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                data-testid="upload-csv-btn"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                CSV Uploaden
              </Button>
              <Button 
                onClick={handleAutoMatch}
                disabled={autoMatching}
                className="bg-white text-emerald-600 hover:bg-emerald-50"
                data-testid="auto-match-btn"
              >
                {autoMatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Auto Match
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Niet Gematcht</p>
                  <p className="text-xl font-bold">{stats.transacties?.niet_gematcht?.count || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Suggesties</p>
                  <p className="text-xl font-bold">{stats.transacties?.suggestie?.count || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gematcht</p>
                  <p className="text-xl font-bold">{stats.transacties?.gematcht?.count || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Verkoop</p>
                  <p className="text-xl font-bold">{stats.openstaande_verkoopfacturen || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Inkoop</p>
                  <p className="text-xl font-bold">{stats.openstaande_inkoopfacturen || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Zoeken op omschrijving, referentie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 rounded-lg">
                <SelectValue placeholder="Filter op status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle transacties</SelectItem>
                <SelectItem value="niet_gematcht">Niet Gematcht</SelectItem>
                <SelectItem value="suggestie">Met Suggestie</SelectItem>
                <SelectItem value="gematcht">Gematcht</SelectItem>
                <SelectItem value="genegeerd">Genegeerd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Transacties List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          {filteredTransacties.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen transacties gevonden</h3>
              <p className="text-muted-foreground mb-4">Upload een CSV bestand met banktransacties om te beginnen</p>
              <Button onClick={() => fileInputRef.current?.click()} className="bg-emerald-500 hover:bg-emerald-600">
                <Upload className="w-4 h-4 mr-2" /> CSV Uploaden
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTransacties.map((trans) => (
                <div key={trans.id} className="p-4 sm:p-5 hover:bg-muted/50 transition-colors" data-testid={`transactie-${trans.id}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        trans.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        {trans.type === 'credit' ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">{trans.omschrijving || 'Geen omschrijving'}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{trans.datum}</span>
                          {trans.referentie && <span>• Ref: {trans.referentie}</span>}
                          {trans.tegenrekening && <span>• {trans.tegenrekening}</span>}
                        </div>
                        {trans.match_suggesties?.length > 0 && trans.status !== 'gematcht' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {trans.match_suggesties.slice(0, 2).map((sug, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs cursor-pointer hover:bg-emerald-50" onClick={() => {
                                setSelectedTransactie(trans);
                                setMatchDialogOpen(true);
                              }}>
                                {sug.factuur_type === 'verkoopfactuur' ? '📤' : '📥'} {sug.factuurnummer} 
                                ({sug.score}% match)
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 ml-14 lg:ml-0">
                      <div className="text-left sm:text-right">
                        <p className={`font-bold text-lg ${trans.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {trans.type === 'credit' ? '+' : '-'} {trans.valuta || 'SRD'} {trans.bedrag?.toLocaleString()}
                        </p>
                        <Badge className={`${statusColors[trans.status]} text-xs`}>
                          {statusLabels[trans.status]}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {trans.status !== 'gematcht' && trans.status !== 'genegeerd' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedTransactie(trans);
                                setMatchDialogOpen(true);
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-xs"
                              data-testid={`match-btn-${trans.id}`}
                            >
                              <Link2 className="w-3 h-3 mr-1" /> Matchen
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleIgnore(trans.id)}
                              className="text-xs"
                            >
                              <Ban className="w-3 h-3 mr-1" /> Negeren
                            </Button>
                          </>
                        )}
                        {trans.status !== 'gematcht' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDelete(trans.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        {trans.status === 'gematcht' && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {trans.matched_factuur_type === 'verkoopfactuur' ? 'Verkoop' : 'Inkoop'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transactie Matchen</DialogTitle>
          </DialogHeader>
          {selectedTransactie && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="font-semibold">{selectedTransactie.omschrijving}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedTransactie.datum}</p>
                <p className={`text-lg font-bold mt-2 ${selectedTransactie.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedTransactie.type === 'credit' ? '+' : '-'} SRD {selectedTransactie.bedrag?.toLocaleString()}
                </p>
              </div>

              {selectedTransactie.match_suggesties?.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Suggesties</Label>
                  {selectedTransactie.match_suggesties.map((sug, idx) => (
                    <div 
                      key={idx}
                      className="border rounded-lg p-3 hover:border-emerald-500 cursor-pointer transition-colors"
                      onClick={() => handleMatch(selectedTransactie.id, sug.factuur_id, sug.factuur_type)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            {sug.factuur_type === 'verkoopfactuur' ? (
                              <FileText className="w-4 h-4 text-green-500" />
                            ) : (
                              <Building2 className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="font-semibold">{sug.factuurnummer}</span>
                            <Badge variant="outline" className="text-xs">
                              {sug.score}% match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {sug.klant_naam || sug.leverancier_naam}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">SRD {sug.openstaand_bedrag?.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">openstaand</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Geen automatische suggesties gevonden</p>
                  <p className="text-sm mt-1">Zoek handmatig naar een factuur</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>
              Annuleren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
