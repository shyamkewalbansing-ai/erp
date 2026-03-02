import React, { useState, useEffect } from 'react';
import { btwAPI, reportsAPI } from '../../lib/boekhoudingApi';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, Calculator, FileText, Loader2, TrendingUp, TrendingDown,
  RefreshCw, Download, Search, Filter, Eye, Edit, Trash2, X,
  DollarSign, Percent, Calendar, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// Format currency
const formatCurrency = (amount, currency = 'SRD') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  if (currency === 'USD') return `$ ${formatted}`;
  if (currency === 'EUR') return `€ ${formatted}`;
  return `SRD ${formatted}`;
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, subtitleColor, icon: Icon, iconBg, iconColor, trend }) => {
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
            <p className="text-sm lg:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1 mt-1">
                {trend && (
                  trend > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />
                )}
                <p className={`text-xs ${subtitleColor || 'text-gray-400'}`}>{subtitle}</p>
              </div>
            )}
          </div>
          <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// BTW Code Badge
const BTWTypeBadge = ({ type }) => {
  if (type === 'sales' || type === 'verkoop') {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Verkoop</Badge>;
  }
  if (type === 'purchases' || type === 'inkoop') {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Inkoop</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Beide</Badge>;
};

// Main Component
const BTWPage = () => {
  const [btwCodes, setBtwCodes] = useState([]);
  const [btwReport, setBtwReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current_quarter');

  const [formData, setFormData] = useState({
    code: '', naam: '', percentage: 0, type: 'both'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, reportRes] = await Promise.all([
        btwAPI.getAll(),
        reportsAPI.btw()
      ]);
      setBtwCodes(codesRes.data || []);
      setBtwReport(reportRes.data || {});
    } catch (error) {
      toast.error('Fout bij laden BTW gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.naam) { toast.error('Vul code en naam in'); return; }
    setSaving(true);
    try {
      await btwAPI.create(formData);
      toast.success('BTW-code aangemaakt');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await btwAPI.update(editItem.id, formData);
      toast.success('BTW-code bijgewerkt');
      setShowEditDialog(false);
      setEditItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij bijwerken');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Weet u zeker dat u BTW-code "${item.code}" wilt verwijderen?`)) return;
    try {
      await btwAPI.delete(item.id);
      toast.success('BTW-code verwijderd');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({ code: '', naam: '', percentage: 0, type: 'both' });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      code: item.code || '',
      naam: item.naam || item.name || '',
      percentage: item.percentage || 0,
      type: item.type || 'both'
    });
    setShowEditDialog(true);
  };

  // Calculate BTW stats
  const btwSales = btwReport?.btw_verkoop || btwReport?.btw_sales || 0;
  const btwPurchases = btwReport?.btw_inkoop || btwReport?.btw_purchases || 0;
  const btwBalance = btwSales - btwPurchases;
  const isPayable = btwBalance > 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BTW Beheer</h1>
          <p className="text-sm text-gray-500 mt-1">BTW-codes, aangiften en overzichten</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Vernieuwen
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" /> Exporteren
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="BTW Verkoop"
          value={formatCurrency(btwSales)}
          subtitle="Te ontvangen"
          subtitleColor="text-emerald-500"
          icon={TrendingUp}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          trend={1}
        />
        <StatCard
          title="BTW Inkoop"
          value={formatCurrency(btwPurchases)}
          subtitle="Voorbelasting"
          subtitleColor="text-blue-500"
          icon={TrendingDown}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          trend={-1}
        />
        <StatCard
          title="BTW Saldo"
          value={formatCurrency(Math.abs(btwBalance))}
          subtitle={isPayable ? 'Te betalen' : 'Te ontvangen'}
          subtitleColor={isPayable ? 'text-amber-500' : 'text-emerald-500'}
          icon={DollarSign}
          iconBg={isPayable ? 'bg-amber-100' : 'bg-emerald-100'}
          iconColor={isPayable ? 'text-amber-600' : 'text-emerald-600'}
        />
        <StatCard
          title="BTW Codes"
          value={btwCodes.length}
          subtitle="Actieve tarieven"
          icon={Percent}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Overzicht
          </TabsTrigger>
          <TabsTrigger value="codes" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            BTW-codes
          </TabsTrigger>
          <TabsTrigger value="aangifte" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Aangifte
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Period selector */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">BTW Overzicht</h3>
                  <p className="text-sm text-gray-500">Selecteer een periode voor het overzicht</p>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_quarter">Huidig Kwartaal</SelectItem>
                    <SelectItem value="previous_quarter">Vorig Kwartaal</SelectItem>
                    <SelectItem value="current_year">Huidig Jaar</SelectItem>
                    <SelectItem value="previous_year">Vorig Jaar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* BTW Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">BTW over Verkopen</h3>
                    <p className="text-xs text-gray-500">Af te dragen BTW</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Omzet excl. BTW</span>
                    <span className="text-gray-900">{formatCurrency(btwReport?.omzet_excl || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">BTW 15%</span>
                    <span className="text-gray-900">{formatCurrency(btwReport?.btw_15 || btwSales)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="font-medium text-gray-900">Totaal BTW Verkoop</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(btwSales)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Voorbelasting (Inkoop)</h3>
                    <p className="text-xs text-gray-500">Te verrekenen BTW</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Inkoop excl. BTW</span>
                    <span className="text-gray-900">{formatCurrency(btwReport?.inkoop_excl || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">BTW 15%</span>
                    <span className="text-gray-900">{formatCurrency(btwReport?.btw_inkoop_15 || btwPurchases)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="font-medium text-gray-900">Totaal Voorbelasting</span>
                    <span className="font-medium text-blue-600">{formatCurrency(btwPurchases)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BTW Balance */}
          <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl ${isPayable ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPayable ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    {isPayable ? <AlertCircle className="w-6 h-6 text-amber-600" /> : <CheckCircle className="w-6 h-6 text-emerald-600" />}
                  </div>
                  <div>
                    <h3 className={`font-medium ${isPayable ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {isPayable ? 'Te Betalen aan Belastingdienst' : 'Te Ontvangen van Belastingdienst'}
                    </h3>
                    <p className={`text-sm ${isPayable ? 'text-amber-600' : 'text-emerald-600'}`}>
                      BTW Saldo voor dit kwartaal
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${isPayable ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {formatCurrency(Math.abs(btwBalance))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BTW Codes Tab */}
        <TabsContent value="codes" className="mt-4 space-y-4">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">BTW Tarieven</h3>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                  <Plus className="w-4 h-4 mr-1.5" /> Nieuw Tarief
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Naam</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Percentage</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 w-24">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-2">Laden...</p>
                        </td>
                      </tr>
                    ) : btwCodes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <Percent className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">Geen BTW-codes gevonden</p>
                        </td>
                      </tr>
                    ) : (
                      btwCodes.map((code) => (
                        <tr key={code.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-gray-900">{code.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900">{code.naam || code.name}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium text-gray-900">{code.percentage}%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <BTWTypeBadge type={code.type} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => openEdit(code)}>
                                <Edit className="w-4 h-4 text-gray-400" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600" onClick={() => handleDelete(code)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aangifte Tab */}
        <TabsContent value="aangifte" className="mt-4 space-y-4">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">BTW Aangifte</h3>
              <p className="text-sm text-gray-500 mb-4">
                Genereer en verstuur uw BTW aangifte naar de belastingdienst
              </p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                <FileText className="w-4 h-4 mr-2" /> Aangifte Genereren
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
              Nieuw BTW Tarief
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Code *</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="BTW15" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Percentage *</Label>
                <Input type="number" value={formData.percentage} onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Naam *</Label>
              <Input value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})} placeholder="BTW 15%" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Beide (Verkoop & Inkoop)</SelectItem>
                  <SelectItem value="sales">Alleen Verkoop</SelectItem>
                  <SelectItem value="purchases">Alleen Inkoop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              BTW Tarief Bewerken
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Code *</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Percentage *</Label>
                <Input type="number" value={formData.percentage} onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Naam *</Label>
              <Input value={formData.naam} onChange={(e) => setFormData({...formData, naam: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Beide (Verkoop & Inkoop)</SelectItem>
                  <SelectItem value="sales">Alleen Verkoop</SelectItem>
                  <SelectItem value="purchases">Alleen Inkoop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuleren</Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BTWPage;
