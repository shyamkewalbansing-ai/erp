import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { 
  Wallet, 
  Plus, 
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function KasboekPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [machines, setMachines] = useState([]);
  const [werknemers, setWerknemers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'income',
    category: 'commissie',
    amount: '',
    currency: 'SRD',
    description: '',
    machine_id: '',
    employee_id: ''
  });

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maart' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Augustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const categories = {
    income: [
      { value: 'commissie', label: 'Commissie' },
      { value: 'verkoop', label: 'Verkoop' },
      { value: 'overig_inkomen', label: 'Overig Inkomen' }
    ],
    expense: [
      { value: 'loon', label: 'Loon' },
      { value: 'onderhoud', label: 'Onderhoud' },
      { value: 'aankoop', label: 'Aankoop' },
      { value: 'huur', label: 'Huur' },
      { value: 'utilities', label: 'Nutsvoorzieningen' },
      { value: 'overig', label: 'Overig' }
    ]
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [kasboekRes, machinesRes, werknemersRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/kasboek?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/suribet/machines`, { headers }),
        fetch(`${API_URL}/api/suribet/werknemers`, { headers })
      ]);

      if (kasboekRes.ok) setEntries(await kasboekRes.json());
      if (machinesRes.ok) setMachines(await machinesRes.json());
      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/kasboek`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        toast.success('Transactie toegevoegd');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij opslaan');
      }
    } catch (error) {
      toast.error('Fout bij opslaan');
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/kasboek/${selectedEntry.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Transactie verwijderd');
        setShowDeleteDialog(false);
        setSelectedEntry(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      transaction_type: 'income',
      category: 'commissie',
      amount: '',
      currency: 'SRD',
      description: '',
      machine_id: '',
      employee_id: ''
    });
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || e.transaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    inkomsten: entries.filter(e => e.transaction_type === 'income').reduce((sum, e) => sum + e.amount, 0),
    uitgaven: entries.filter(e => e.transaction_type === 'expense').reduce((sum, e) => sum + e.amount, 0)
  };
  stats.saldo = stats.inkomsten - stats.uitgaven;

  const formatCurrency = (amount, currency = 'SRD') => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-kasboek-page">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Kasboek</h1>
              <p className="text-emerald-100 text-sm sm:text-base">Inkomsten en uitgaven beheer</p>
            </div>
          </div>
          
          {/* Date Selector - Per dag */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 bg-transparent border-0"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/70" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[140px] bg-transparent border-0 text-white text-sm [color-scheme:dark]"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 bg-transparent border-0"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/20 text-xs bg-transparent border-0"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Vandaag
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Inkomsten</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.inkomsten)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Uitgaven</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(stats.uitgaven)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">Saldo</p>
                <p className={`text-xl sm:text-2xl font-bold ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.saldo)}
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                stats.saldo >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op omschrijving..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle transacties</SelectItem>
                <SelectItem value="income">Inkomsten</SelectItem>
                <SelectItem value="expense">Uitgaven</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Transactie
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {filteredEntries.length > 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      entry.transaction_type === 'income' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {entry.transaction_type === 'income' 
                        ? <ArrowUpRight className="w-5 h-5" />
                        : <ArrowDownRight className="w-5 h-5" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(entry.date)}</span>
                        <Badge variant="outline" className="text-xs capitalize">{entry.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold text-lg ${
                      entry.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {entry.transaction_type === 'income' ? '+' : '-'}
                      {formatCurrency(entry.amount, entry.currency)}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { setSelectedEntry(entry); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Geen transacties gevonden</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || typeFilter !== 'all' 
                ? 'Probeer andere zoekfilters' 
                : 'Voeg uw eerste transactie toe om te beginnen'}
            </p>
            {!search && typeFilter === 'all' && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Eerste Transactie
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              Nieuwe Transactie
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select 
                  value={formData.transaction_type} 
                  onValueChange={(v) => setFormData({
                    ...formData, 
                    transaction_type: v,
                    category: v === 'income' ? 'commissie' : 'loon'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Inkomsten</SelectItem>
                    <SelectItem value="expense">Uitgaven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({...formData, category: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories[formData.transaction_type].map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bedrag *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valuta</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData({...formData, currency: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Omschrijving *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Beschrijving van de transactie"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Machine (optioneel)</Label>
                <Select 
                  value={formData.machine_id || "none"} 
                  onValueChange={(v) => setFormData({...formData, machine_id: v === "none" ? "" : v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen machine</SelectItem>
                    {machines.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.machine_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Werknemer (optioneel)</Label>
                <Select 
                  value={formData.employee_id || "none"} 
                  onValueChange={(v) => setFormData({...formData, employee_id: v === "none" ? "" : v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen werknemer</SelectItem>
                    {werknemers.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transactie Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze transactie wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
