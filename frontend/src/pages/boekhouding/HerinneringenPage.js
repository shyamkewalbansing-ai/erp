import React, { useState, useEffect } from 'react';
import { remindersAPI, salesInvoicesAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Bell, Send, Clock, AlertTriangle, CheckCircle, Loader2, Mail, FileText, Plus } from 'lucide-react';

const HerinneringenPage = () => {
  const [herinneringen, setHerinneringen] = useState([]);
  const [facturenVoorHerinnering, setFacturenVoorHerinnering] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFactuur, setSelectedFactuur] = useState(null);
  const [herinneringType, setHerinneringType] = useState('eerste');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [herinneringenRes, facturenRes] = await Promise.all([
        remindersAPI.getAll().catch(() => []),
        remindersAPI.getFacturenVoorHerinnering().catch(() => [])
      ]);
      setHerinneringen(Array.isArray(herinneringenRes) ? herinneringenRes : herinneringenRes.data || []);
      setFacturenVoorHerinnering(Array.isArray(facturenRes) ? facturenRes : facturenRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHerinnering = async () => {
    if (!selectedFactuur) {
      toast.error('Selecteer een factuur');
      return;
    }
    setSaving(true);
    try {
      await remindersAPI.create({
        debiteur_id: selectedFactuur.debiteur_id,
        factuur_id: selectedFactuur.id,
        type: herinneringType
      });
      toast.success('Herinnering aangemaakt');
      setShowCreateDialog(false);
      setSelectedFactuur(null);
      setHerinneringType('eerste');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSent = async (herinneringId) => {
    try {
      await remindersAPI.markSent(herinneringId);
      toast.success('Herinnering gemarkeerd als verzonden');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij bijwerken');
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'eerste': return 'Eerste herinnering';
      case 'tweede': return 'Tweede herinnering';
      case 'aanmaning': return 'Aanmaning';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'eerste': return 'bg-blue-100 text-blue-800';
      case 'tweede': return 'bg-amber-100 text-amber-800';
      case 'aanmaning': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const verlopenFacturen = facturenVoorHerinnering.filter(f => {
    const vervalDatum = new Date(f.vervaldatum);
    return vervalDatum < new Date();
  });

  const totalVerlopen = verlopenFacturen.reduce((sum, f) => sum + (f.openstaand_bedrag || 0), 0);
  const verzonden = herinneringen.filter(h => h.verzonden).length;
  const nietVerzonden = herinneringen.filter(h => !h.verzonden).length;

  return (
    <div className="space-y-6" data-testid="herinneringen-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Betalingsherinneringen</h1>
          <p className="text-slate-500 mt-1">Beheer herinneringen voor vervallen facturen</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="create-reminder-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Herinnering
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Betalingsherinnering</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Selecteer Factuur *</Label>
                <Select value={selectedFactuur?.id || ''} onValueChange={(v) => setSelectedFactuur(facturenVoorHerinnering.find(f => f.id === v))}>
                  <SelectTrigger><SelectValue placeholder="Selecteer factuur" /></SelectTrigger>
                  <SelectContent>
                    {facturenVoorHerinnering.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.factuurnummer} - {f.debiteur_naam} ({formatCurrency(f.openstaand_bedrag)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedFactuur && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <p className="text-sm"><strong>Klant:</strong> {selectedFactuur.debiteur_naam}</p>
                  <p className="text-sm"><strong>Factuurnummer:</strong> {selectedFactuur.factuurnummer}</p>
                  <p className="text-sm"><strong>Bedrag:</strong> {formatCurrency(selectedFactuur.openstaand_bedrag)}</p>
                  <p className="text-sm"><strong>Vervaldatum:</strong> {formatDate(selectedFactuur.vervaldatum)}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Type Herinnering</Label>
                <Select value={herinneringType} onValueChange={setHerinneringType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eerste">Eerste herinnering</SelectItem>
                    <SelectItem value="tweede">Tweede herinnering</SelectItem>
                    <SelectItem value="aanmaning">Aanmaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateHerinnering} className="w-full" disabled={saving || !selectedFactuur}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                Herinnering Aanmaken
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Verlopen Facturen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{verlopenFacturen.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Verlopen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(totalVerlopen)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Te Verzenden</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{nietVerzonden}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Verzonden</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{verzonden}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overzicht">
        <TabsList>
          <TabsTrigger value="overzicht" data-testid="tab-overzicht">
            <Bell className="w-4 h-4 mr-2" />
            Herinneringen
          </TabsTrigger>
          <TabsTrigger value="facturen" data-testid="tab-facturen-herinnering">
            <FileText className="w-4 h-4 mr-2" />
            Facturen voor Herinnering
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overzicht" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Betalingsherinneringen</CardTitle>
              <CardDescription>Overzicht van alle aangemaakte herinneringen</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Laden...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-28">Datum</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Factuur</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="text-right w-32">Bedrag</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-24">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {herinneringen.map(herinnering => (
                      <TableRow key={herinnering.id}>
                        <TableCell>{formatDate(herinnering.created_at)}</TableCell>
                        <TableCell className="font-medium">{herinnering.debiteur_naam || '-'}</TableCell>
                        <TableCell className="font-mono">{herinnering.factuurnummer || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(herinnering.type)}>{getTypeLabel(herinnering.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(herinnering.bedrag || 0)}</TableCell>
                        <TableCell>
                          {herinnering.verzonden ? (
                            <Badge className="bg-green-100 text-green-800">Verzonden</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Te verzenden</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!herinnering.verzonden && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarkSent(herinnering.id)} title="Markeer als verzonden">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {herinneringen.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          Geen herinneringen gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturen" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Facturen voor Herinnering</CardTitle>
              <CardDescription>Openstaande facturen die verlopen zijn of bijna verlopen</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Factuurnummer</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead className="w-28">Factuurdatum</TableHead>
                    <TableHead className="w-28">Vervaldatum</TableHead>
                    <TableHead className="w-24">Dagen Over</TableHead>
                    <TableHead className="text-right w-32">Openstaand</TableHead>
                    <TableHead className="w-24">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturenVoorHerinnering.map(factuur => {
                    const vervalDatum = new Date(factuur.vervaldatum);
                    const dagenOver = Math.floor((new Date() - vervalDatum) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={factuur.id}>
                        <TableCell className="font-mono">{factuur.factuurnummer}</TableCell>
                        <TableCell className="font-medium">{factuur.debiteur_naam}</TableCell>
                        <TableCell>{formatDate(factuur.factuurdatum)}</TableCell>
                        <TableCell>{formatDate(factuur.vervaldatum)}</TableCell>
                        <TableCell>
                          <Badge className={dagenOver > 30 ? 'bg-red-100 text-red-800' : dagenOver > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}>
                            {dagenOver > 0 ? `${dagenOver} dagen` : 'Nog niet verlopen'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(factuur.openstaand_bedrag)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedFactuur(factuur);
                              setShowCreateDialog(true);
                            }}
                            title="Herinnering aanmaken"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {facturenVoorHerinnering.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Geen openstaande facturen voor herinnering
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HerinneringenPage;
