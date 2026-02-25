import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ModulePageLayout, StatsGrid, ContentSection, PageCard } from '../../components/ModulePageLayout';
import { 
  Plus, DollarSign, Euro, ArrowRightLeft, Calendar, Trash2, RefreshCw, Download, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const valutaInfo = {
  USD: { naam: 'US Dollar', symbol: '$', icon: DollarSign },
  EUR: { naam: 'Euro', symbol: '€', icon: Euro },
  GYD: { naam: 'Guyanese Dollar', symbol: 'G$' },
  BRL: { naam: 'Braziliaanse Real', symbol: 'R$' }
};

export default function WisselkoersenPage() {
  const [koersen, setKoersen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingCme, setFetchingCme] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [form, setForm] = useState({
    valuta: 'USD',
    koers: '',
    datum: new Date().toISOString().split('T')[0],
    bron: 'CBvS'
  });
  const [convertForm, setConvertForm] = useState({
    bedrag: '',
    van_valuta: 'USD',
    naar_valuta: 'SRD'
  });
  const [convertResult, setConvertResult] = useState(null);

  useEffect(() => {
    fetchKoersen();
  }, []);

  const fetchKoersen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/wisselkoersen/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKoersen(data);
      }
    } catch (error) {
      toast.error('Fout bij ophalen wisselkoersen');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromCme = async () => {
    setFetchingCme(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/boekhouding/wisselkoersen/ophalen-cme`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Koersen opgehaald van CME.sr</span>
            {data.koersen?.map((k) => (
              <span key={k.valuta} className="text-sm">
                {k.valuta}: SRD {k.koers} (koop: {k.koop}, verkoop: {k.verkoop})
              </span>
            ))}
          </div>
        );
        fetchKoersen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij ophalen koersen van CME.sr');
      }
    } catch (error) {
      toast.error('Fout bij verbinden met CME.sr');
    } finally {
      setFetchingCme(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.koers || parseFloat(form.koers) <= 0) {
      toast.error('Voer een geldige koers in');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/wisselkoersen/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          koers: parseFloat(form.koers)
        })
      });
      if (res.ok) {
        toast.success('Wisselkoers opgeslagen');
        setDialogOpen(false);
        setForm({ valuta: 'USD', koers: '', datum: new Date().toISOString().split('T')[0], bron: 'CBvS' });
        fetchKoersen();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze wisselkoers wilt verwijderen?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/wisselkoersen/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Wisselkoers verwijderd');
        fetchKoersen();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleConvert = async () => {
    if (!convertForm.bedrag || parseFloat(convertForm.bedrag) <= 0) {
      toast.error('Voer een geldig bedrag in');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/wisselkoersen/converteer`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bedrag: parseFloat(convertForm.bedrag),
          van_valuta: convertForm.van_valuta,
          naar_valuta: convertForm.naar_valuta
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConvertResult(data);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Fout bij conversie');
      }
    } catch (error) {
      toast.error('Fout bij conversie');
    }
  };

  // Header action buttons
  const headerActions = (
    <>
      <Button 
        onClick={fetchFromCme}
        disabled={fetchingCme}
        className="bg-blue-500 hover:bg-blue-600 text-white"
        data-testid="ophalen-cme-btn"
      >
        {fetchingCme ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {fetchingCme ? 'Ophalen...' : 'CME.sr Koersen'}
      </Button>
      <Button 
        onClick={() => setConvertDialogOpen(true)}
        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
        data-testid="converter-btn"
      >
        <ArrowRightLeft className="w-4 h-4 mr-2" /> Converter
      </Button>
      <Button 
        onClick={() => setDialogOpen(true)}
        className="bg-white text-emerald-600 hover:bg-emerald-50"
        data-testid="nieuwe-koers-btn"
      >
        <Plus className="w-4 h-4 mr-2" /> Nieuwe Koers
      </Button>
    </>
  );

  return (
    <ModulePageLayout
      title="Wisselkoersen"
      subtitle="Beheer wisselkoersen voor multi-valuta transacties"
      actions={headerActions}
      loading={loading}
      loadingText="Wisselkoersen laden..."
      testId="wisselkoersen-page"
    >
      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {koersen.map((koers) => {
            const info = valutaInfo[koers.valuta] || {};
            const Icon = info.icon || DollarSign;
            return (
              <div key={koers.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{koers.valuta}</p>
                    <p className="text-xl font-bold">SRD {koers.koers?.toFixed(2)}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDelete(koers.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    data-testid={`delete-${koers.valuta}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {koers.datum} • {koers.bron || 'Handmatig'}
                </p>
              </div>
            );
          })}
          
          {koersen.length === 0 && (
            <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen wisselkoersen</h3>
              <p className="text-muted-foreground mb-4">Voeg wisselkoersen toe om te beginnen</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" /> Eerste Koers Toevoegen
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info sectie */}
      <ContentSection>
        <PageCard title="Wisselkoers Informatie">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">SRD is de basis valuta. Alle koersen zijn uitgedrukt als:</p>
              <ul className="space-y-1">
                <li>• 1 USD = X SRD</li>
                <li>• 1 EUR = X SRD</li>
              </ul>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" /> CME.sr Integratie
              </p>
              <p className="text-blue-600 dark:text-blue-400 mb-2">
                Klik op "CME.sr Koersen" om automatisch de actuele wisselkoersen op te halen van Central Money Exchange Suriname.
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-500">
                Bron: <a href="https://www.cme.sr" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">www.cme.sr</a>
              </p>
            </div>
          </div>
        </PageCard>
      </ContentSection>

      {/* Nieuwe Koers Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Wisselkoers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valuta</Label>
              <Select value={form.valuta} onValueChange={(v) => setForm({...form, valuta: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GYD">GYD - Guyanese Dollar</SelectItem>
                  <SelectItem value="BRL">BRL - Braziliaanse Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Koers (1 {form.valuta} = X SRD)</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="bijv. 36.50"
                value={form.koers}
                onChange={(e) => setForm({...form, koers: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input 
                type="date"
                value={form.datum}
                onChange={(e) => setForm({...form, datum: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Bron</Label>
              <Input 
                placeholder="bijv. CBvS, Bank"
                value={form.bron}
                onChange={(e) => setForm({...form, bron: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} className="bg-emerald-500 hover:bg-emerald-600">Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Converter Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valuta Converter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bedrag</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="100.00"
                value={convertForm.bedrag}
                onChange={(e) => setConvertForm({...convertForm, bedrag: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Van</Label>
                <Select value={convertForm.van_valuta} onValueChange={(v) => setConvertForm({...convertForm, van_valuta: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Naar</Label>
                <Select value={convertForm.naar_valuta} onValueChange={(v) => setConvertForm({...convertForm, naar_valuta: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleConvert} className="w-full bg-emerald-500 hover:bg-emerald-600">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Converteer
            </Button>
            
            {convertResult && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-muted-foreground">Resultaat:</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {convertResult.geconverteerd?.valuta} {convertResult.geconverteerd?.bedrag?.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Koers: {convertResult.geconverteerd?.koers} • Datum: {convertResult.datum}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConvertDialogOpen(false); setConvertResult(null); }}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
