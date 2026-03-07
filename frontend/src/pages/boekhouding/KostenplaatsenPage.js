import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Loader2, Building2, Edit, Trash2, Eye, BookOpen, BarChart3, Layers, Info, PieChart } from 'lucide-react';
import api from '../../lib/api';

const formatCurrency = (amount, currency = 'SRD') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  
  if (currency === 'USD') return `$ ${formatted}`;
  if (currency === 'EUR') return `€ ${formatted}`;
  return `SRD ${formatted}`;
};

export default function KostenplaatsenPage() {
  const [kostenplaatsen, setKostenplaatsen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [transactions, setTransactions] = useState([]);
  
  const [formData, setFormData] = useState({
    code: '',
    naam: '',
    omschrijving: '',
    budget: '',
    status: 'actief',
    verantwoordelijke: '',
    afdeling: ''
  });

  const loadData = async () => {
    try {
      const response = await api.get('/boekhouding/kostenplaatsen');
      setKostenplaatsen(response.data || []);
    } catch (error) {
      console.error('Error loading kostenplaatsen:', error);
      toast.error('Fout bij laden kostenplaatsen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.code || !formData.naam) {
      toast.error('Code en naam zijn verplicht');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        ...formData,
        budget: parseFloat(formData.budget) || 0
      };
      
      if (editingItem) {
        await api.put(`/boekhouding/kostenplaatsen/${editingItem.id}`, data);
        toast.success('Kostenplaats bijgewerkt');
      } else {
        await api.post('/boekhouding/kostenplaatsen', data);
        toast.success('Kostenplaats aangemaakt');
      }
      
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet u zeker dat u deze kostenplaats wilt verwijderen?')) return;
    
    try {
      await api.delete(`/boekhouding/kostenplaatsen/${id}`);
      toast.success('Kostenplaats verwijderd');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      code: '', naam: '', omschrijving: '', budget: '', 
      status: 'actief', verantwoordelijke: '', afdeling: ''
    });
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      naam: item.naam || '',
      omschrijving: item.omschrijving || '',
      budget: item.budget?.toString() || '',
      status: item.status || 'actief',
      verantwoordelijke: item.verantwoordelijke || '',
      afdeling: item.afdeling || ''
    });
    setShowModal(true);
  };

  const viewDetails = async (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    
    // Load transactions for this cost center
    try {
      const response = await api.get(`/boekhouding/journaalposten?kostenplaats=${item.code}`);
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const actief = kostenplaatsen.filter(k => k.status === 'actief');
    return {
      count: kostenplaatsen.length,
      actief: actief.length,
      totaalBudget: actief.reduce((sum, k) => sum + (k.budget || 0), 0),
      totaalBesteed: actief.reduce((sum, k) => sum + (k.besteed || 0), 0)
    };
  }, [kostenplaatsen]);

  // Generate next code
  const generateCode = () => {
    const existingCodes = kostenplaatsen.map(k => k.code).filter(c => c.match(/^KP\d+$/));
    const numbers = existingCodes.map(c => parseInt(c.replace('KP', ''))).filter(n => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `KP${String(nextNum).padStart(3, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center" data-testid="kostenplaatsen-page">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="kostenplaatsen-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kostenplaatsen</h1>
          <p className="text-gray-500 mt-0.5">Beheer kostenplaatsen voor kostenallocatie en budgettering</p>
        </div>
        <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-kostenplaats-btn" onClick={() => setFormData({...formData, code: generateCode()})}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Kostenplaats
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Kostenplaats Bewerken' : 'Nieuwe Kostenplaats'}</DialogTitle>
              <DialogDescription>
                Kostenplaatsen worden gebruikt om kosten toe te wijzen aan specifieke afdelingen of projecten.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="KP001"
                    data-testid="code-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actief">Actief</SelectItem>
                      <SelectItem value="inactief">Inactief</SelectItem>
                      <SelectItem value="afgesloten">Afgesloten</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  value={formData.naam}
                  onChange={(e) => setFormData({...formData, naam: e.target.value})}
                  placeholder="Bijv. Marketing, Verkoop, IT"
                  data-testid="naam-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Omschrijving</Label>
                <Input
                  value={formData.omschrijving}
                  onChange={(e) => setFormData({...formData, omschrijving: e.target.value})}
                  placeholder="Korte omschrijving..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Afdeling</Label>
                  <Input
                    value={formData.afdeling}
                    onChange={(e) => setFormData({...formData, afdeling: e.target.value})}
                    placeholder="Afdeling"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verantwoordelijke</Label>
                  <Input
                    value={formData.verantwoordelijke}
                    onChange={(e) => setFormData({...formData, verantwoordelijke: e.target.value})}
                    placeholder="Naam"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Budget (SRD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
              <Button onClick={handleSubmit} disabled={saving} data-testid="save-btn">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingItem ? 'Bijwerken' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grootboek Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <BookOpen className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Grootboek Koppeling:</strong> Kostenplaatsen kunnen worden gekoppeld aan journaalposten voor gedetailleerde kostenanalyse per afdeling of project.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overzicht" data-testid="tab-overzicht">
            <Layers className="w-4 h-4 mr-2" />Overzicht
          </TabsTrigger>
          <TabsTrigger value="budget" data-testid="tab-budget">
            <BarChart3 className="w-4 h-4 mr-2" />Budgetanalyse
          </TabsTrigger>
          <TabsTrigger value="info" data-testid="tab-info">
            <Info className="w-4 h-4 mr-2" />Informatie
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overzicht */}
        <TabsContent value="overzicht" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{totals.count}</p>
                <p className="text-sm text-muted-foreground">Totaal</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-green-600">{totals.actief}</p>
                <p className="text-sm text-muted-foreground">Actief</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.totaalBudget)}</p>
                <p className="text-sm text-muted-foreground">Totaal Budget</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.totaalBesteed)}</p>
                <p className="text-sm text-muted-foreground">Totaal Besteed</p>
              </CardContent>
            </Card>
          </div>

          {/* Kostenplaatsen Table */}
          <Card className="bg-white border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Kostenplaatsen Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Afdeling</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Besteed</TableHead>
                    <TableHead className="text-right">Beschikbaar</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kostenplaatsen.map(item => {
                    const budget = item.budget || 0;
                    const besteed = item.besteed || 0;
                    const beschikbaar = budget - besteed;
                    
                    return (
                      <TableRow key={item.id} data-testid={`kostenplaats-row-${item.code}`}>
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.naam}</div>
                          {item.omschrijving && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">{item.omschrijving}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{item.afdeling || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(budget)}</TableCell>
                        <TableCell className="text-right text-amber-600">{formatCurrency(besteed)}</TableCell>
                        <TableCell className={`text-right font-medium ${beschikbaar < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(beschikbaar)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${
                            item.status === 'actief' ? 'bg-green-100 text-green-700' :
                            item.status === 'inactief' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.status === 'actief' ? 'Actief' : 
                             item.status === 'inactief' ? 'Inactief' : 'Afgesloten'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewDetails(item)} data-testid={`view-${item.code}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)} data-testid={`edit-${item.code}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(item.id)} data-testid={`delete-${item.code}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {kostenplaatsen.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Geen kostenplaatsen gevonden</p>
                        <Button variant="outline" className="mt-3" onClick={() => { setFormData({...formData, code: generateCode()}); setShowModal(true); }}>
                          <Plus className="w-4 h-4 mr-2" />Eerste Kostenplaats Toevoegen
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Budgetanalyse */}
        <TabsContent value="budget" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Budget vs. Besteed per Kostenplaats
              </CardTitle>
              <CardDescription>
                Vergelijking van toegewezen budget met werkelijke kosten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kostenplaatsen.filter(k => k.status === 'actief' && k.budget > 0).length > 0 ? (
                <div className="space-y-4">
                  {kostenplaatsen.filter(k => k.status === 'actief' && k.budget > 0).map(item => {
                    const budget = item.budget || 0;
                    const besteed = item.besteed || 0;
                    const percentage = budget > 0 ? (besteed / budget) * 100 : 0;
                    const isOverBudget = besteed > budget;
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-mono text-sm text-gray-500">{item.code}</span>
                            <h4 className="font-medium">{item.naam}</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(besteed)} / {formatCurrency(budget)}
                            </div>
                            <div className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : percentage > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                              {Math.round(percentage)}%
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        {isOverBudget && (
                          <p className="text-xs text-red-600 mt-1">
                            Budget overschreden met {formatCurrency(besteed - budget)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Geen kostenplaatsen met budget gevonden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Informatie */}
        <TabsContent value="info" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Grootboek Koppeling - Kostenplaatsen
              </CardTitle>
              <CardDescription>
                Hoe kostenplaatsen werken met de boekhouding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <p>
                  Kostenplaatsen zijn een manier om kosten te categoriseren per afdeling, project of verantwoordelijkheidsgebied.
                  Ze worden gebruikt voor:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Kostenallocatie</strong> - Kosten toewijzen aan specifieke afdelingen</li>
                  <li><strong>Budgettering</strong> - Budget per afdeling instellen en bewaken</li>
                  <li><strong>Rapportage</strong> - Kostenoverzichten per kostenplaats genereren</li>
                  <li><strong>Verantwoordelijkheid</strong> - Kosten koppelen aan verantwoordelijken</li>
                </ul>
              </div>

              {/* Example */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Voorbeeld Gebruik</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Bij het boeken van een factuur kan een kostenplaats worden meegegeven:
                </p>
                <table className="w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2 text-left">Rekening</th>
                      <th className="p-2 text-left">Omschrijving</th>
                      <th className="p-2 text-left">Kostenplaats</th>
                      <th className="p-2 text-right">Bedrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-mono">4600</td>
                      <td className="p-2">Kantoorkosten</td>
                      <td className="p-2"><Badge variant="outline">KP001 - Marketing</Badge></td>
                      <td className="p-2 text-right">SRD 1.500,00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">4600</td>
                      <td className="p-2">Kantoorkosten</td>
                      <td className="p-2"><Badge variant="outline">KP002 - Verkoop</Badge></td>
                      <td className="p-2 text-right">SRD 2.000,00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Common Cost Centers */}
              <div>
                <h4 className="font-semibold mb-3">Veelgebruikte Kostenplaatsen</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Marketing', 'Verkoop', 'IT', 'HR', 'Financiën', 'Productie', 'R&D', 'Logistiek', 'Management'].map(name => (
                    <Card key={name} className="bg-gray-50 border-gray-200">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-sm">{name}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedItem?.code} - {selectedItem?.naam}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`text-xs ${
                    selectedItem.status === 'actief' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedItem.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afdeling</p>
                  <p className="font-medium">{selectedItem.afdeling || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium text-blue-600">{formatCurrency(selectedItem.budget || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Besteed</p>
                  <p className="font-medium text-amber-600">{formatCurrency(selectedItem.besteed || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verantwoordelijke</p>
                  <p className="font-medium">{selectedItem.verantwoordelijke || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Beschikbaar</p>
                  <p className={`font-medium ${(selectedItem.budget || 0) - (selectedItem.besteed || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency((selectedItem.budget || 0) - (selectedItem.besteed || 0))}
                  </p>
                </div>
              </div>
              
              {selectedItem.omschrijving && (
                <div>
                  <p className="text-sm text-muted-foreground">Omschrijving</p>
                  <p>{selectedItem.omschrijving}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Recente Transacties</h4>
                {transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Datum</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 5).map((t, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{t.datum}</TableCell>
                          <TableCell className="text-sm">{t.omschrijving}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(t.totaal_debet || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Geen transacties gevonden voor deze kostenplaats
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
