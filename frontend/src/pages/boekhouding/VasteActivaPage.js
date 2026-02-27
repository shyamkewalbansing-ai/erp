import React, { useState, useEffect } from 'react';
import { fixedAssetsAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Building, Calculator, Loader2 } from 'lucide-react';

const VasteActivaPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newAsset, setNewAsset] = useState({
    code: '', naam: '', categorie: 'inventaris', aanschafdatum: new Date().toISOString().split('T')[0],
    aanschafwaarde: 0, restwaarde: 0, afschrijvingsmethode: 'lineair', levensduur_jaren: 5, valuta: 'SRD'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fixedAssetsAPI.getAll();
      setAssets(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newAsset.code || !newAsset.naam || !newAsset.aanschafwaarde) { toast.error('Vul alle verplichte velden in'); return; }
    setSaving(true);
    try {
      await fixedAssetsAPI.create(newAsset);
      toast.success('Activum aangemaakt');
      setShowDialog(false);
      setNewAsset({ code: '', naam: '', categorie: 'inventaris', aanschafdatum: new Date().toISOString().split('T')[0], aanschafwaarde: 0, restwaarde: 0, afschrijvingsmethode: 'lineair', levensduur_jaren: 5, valuta: 'SRD' });
      fetchData();
    } catch (error) { toast.error(error.message || 'Fout bij aanmaken'); }
    finally { setSaving(false); }
  };

  const totalValue = assets.reduce((sum, a) => sum + (a.aanschafwaarde || 0), 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + (a.totaal_afgeschreven || 0), 0);
  const bookValue = totalValue - totalDepreciation;

  return (
    <div className="space-y-6" data-testid="vaste-activa-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Vaste Activa</h1>
          <p className="text-slate-500 mt-1">Beheer vaste activa en afschrijvingen</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button data-testid="add-asset-btn"><Plus className="w-4 h-4 mr-2" />Nieuw Activum</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nieuw Vast Activum</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Code *</Label><Input value={newAsset.code} onChange={(e) => setNewAsset({...newAsset, code: e.target.value})} placeholder="VA001" /></div>
              <div className="space-y-2"><Label>Categorie</Label>
                <Select value={newAsset.categorie} onValueChange={(v) => setNewAsset({...newAsset, categorie: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="inventaris">Inventaris</SelectItem><SelectItem value="machines">Machines</SelectItem><SelectItem value="voertuigen">Voertuigen</SelectItem><SelectItem value="gebouwen">Gebouwen</SelectItem><SelectItem value="computers">Computers</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2"><Label>Naam *</Label><Input value={newAsset.naam} onChange={(e) => setNewAsset({...newAsset, naam: e.target.value})} placeholder="Omschrijving activum" /></div>
              <div className="space-y-2"><Label>Aanschafdatum</Label><Input type="date" value={newAsset.aanschafdatum} onChange={(e) => setNewAsset({...newAsset, aanschafdatum: e.target.value})} /></div>
              <div className="space-y-2"><Label>Aanschafwaarde *</Label><Input type="number" step="0.01" value={newAsset.aanschafwaarde} onChange={(e) => setNewAsset({...newAsset, aanschafwaarde: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Restwaarde</Label><Input type="number" step="0.01" value={newAsset.restwaarde} onChange={(e) => setNewAsset({...newAsset, restwaarde: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Levensduur (jaren)</Label><Input type="number" value={newAsset.levensduur_jaren} onChange={(e) => setNewAsset({...newAsset, levensduur_jaren: parseInt(e.target.value) || 5})} /></div>
              <div className="space-y-2"><Label>Afschrijvingsmethode</Label>
                <Select value={newAsset.afschrijvingsmethode} onValueChange={(v) => setNewAsset({...newAsset, afschrijvingsmethode: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="lineair">Lineair</SelectItem><SelectItem value="degressief">Degressief</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Valuta</Label>
                <Select value={newAsset.valuta} onValueChange={(v) => setNewAsset({...newAsset, valuta: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SRD">SRD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Button onClick={handleCreate} className="w-full" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Opslaan</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Totaal Activa</p><p className="text-2xl font-bold font-mono text-slate-900">{assets.length}</p></div><div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"><Building className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Aanschafwaarde</p><p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalValue)}</p></div><div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center"><Calculator className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Boekwaarde</p><p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(bookValue)}</p></div><div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center"><Building className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Activaoverzicht</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8 text-slate-500">Laden...</div> : (
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-24">Code</TableHead><TableHead>Naam</TableHead><TableHead className="w-28">Categorie</TableHead><TableHead className="w-28">Aanschafdatum</TableHead><TableHead className="text-right w-32">Aanschafwaarde</TableHead><TableHead className="text-right w-32">Afgeschreven</TableHead><TableHead className="text-right w-32">Boekwaarde</TableHead></TableRow></TableHeader>
              <TableBody>
                {assets.map(asset => (
                  <TableRow key={asset.code} data-testid={`asset-row-${asset.code}`}>
                    <TableCell className="font-mono">{asset.code}</TableCell>
                    <TableCell className="font-medium">{asset.naam}</TableCell>
                    <TableCell><Badge variant="outline">{asset.categorie}</Badge></TableCell>
                    <TableCell>{formatDate(asset.aanschafdatum)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(asset.aanschafwaarde, asset.valuta)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(asset.totaal_afgeschreven || 0, asset.valuta)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency((asset.aanschafwaarde || 0) - (asset.totaal_afgeschreven || 0), asset.valuta)}</TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Geen vaste activa gevonden</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VasteActivaPage;
