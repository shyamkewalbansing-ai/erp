import { useState, useEffect } from 'react';
import { getKasgeld, createKasgeld, deleteKasgeld, getExchangeRate, formatCurrency, formatCurrencyEUR } from '../lib/api';
import { toast } from 'sonner';
import { 
  Banknote, 
  Plus, 
  ArrowUpCircle,
  ArrowDownCircle,
  Wrench,
  Trash2,
  Calendar,
  CreditCard,
  Users2,
  RefreshCw,
  Euro,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Switch } from '../components/ui/switch';

export default function Kasgeld() {
  const [kasgeldData, setKasgeldData] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [showInEuro, setShowInEuro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRate, setLoadingRate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    transaction_type: 'deposit',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kasgeldRes, rateRes] = await Promise.all([
        getKasgeld(),
        getExchangeRate()
      ]);
      setKasgeldData(kasgeldRes.data);
      setExchangeRate(rateRes.data);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  const refreshExchangeRate = async () => {
    setLoadingRate(true);
    try {
      const response = await getExchangeRate();
      setExchangeRate(response.data);
      toast.success('Wisselkoers bijgewerkt');
    } catch (error) {
      toast.error('Fout bij ophalen wisselkoers');
    } finally {
      setLoadingRate(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createKasgeld({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      toast.success(formData.transaction_type === 'deposit' ? 'Storting toegevoegd' : 'Opname geregistreerd');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteKasgeld(selectedTransaction.id);
      toast.success('Transactie verwijderd');
      setShowDeleteDialog(false);
      setSelectedTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      transaction_type: 'deposit',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
    });
  };

  const convertToEuro = (srdAmount) => {
    if (!exchangeRate) return 0;
    return srdAmount * exchangeRate.srd_to_eur;
  };

  const displayAmount = (amount) => {
    if (showInEuro && exchangeRate) {
      return formatCurrencyEUR(convertToEuro(amount));
    }
    return formatCurrency(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Kasgeld laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0" data-testid="kasgeld-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-emerald-500/30 rounded-full blur-[60px] lg:blur-[100px]"></div>
        <div className="hidden sm:block absolute bottom-0 left-1/4 w-32 lg:w-64 h-32 lg:h-64 bg-blue-500/20 rounded-full blur-[40px] lg:blur-[80px]"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs sm:text-sm mb-3 sm:mb-4">
              <Banknote className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Kasgeld Beheer</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Kasgeld
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">
              Beheer uw kasgeld voor onderhoud en salarisbetalingen
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {/* Euro Toggle */}
            <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2">
              <span className="text-sm text-white/70">SRD</span>
              <Switch
                checked={showInEuro}
                onCheckedChange={setShowInEuro}
                data-testid="euro-toggle"
              />
              <Euro className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/70">EUR</span>
            </div>
            <Button 
              onClick={() => { resetForm(); setShowModal(true); }}
              size="sm"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
              data-testid="add-kasgeld-btn"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Transactie Toevoegen
            </Button>
          </div>
        </div>
      </div>

      {/* Exchange Rate Info */}
      {exchangeRate && (
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Huidige Wisselkoers</p>
                <p className="text-base sm:text-lg font-bold text-blue-700">
                  1 EUR = {exchangeRate.eur_to_srd.toFixed(2)} SRD
                </p>
                <p className="text-[10px] sm:text-xs text-blue-500">
                  Bron: {exchangeRate.source === 'live' ? 'Live koers' : exchangeRate.source === 'cached' ? 'Gecached' : 'Geschatte koers'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshExchangeRate}
              disabled={loadingRate}
              className="border-blue-300 text-blue-600 hover:bg-blue-100 text-xs sm:text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 ${loadingRate ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Totaal Saldo - Featured */}
        <div className="col-span-2 lg:col-span-1 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Totaal Saldo</p>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${kasgeldData?.total_balance >= 0 ? '' : 'text-red-200'}`}>
                {displayAmount(kasgeldData?.total_balance || 0)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Huurinkomsten */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] sm:text-xs font-medium mb-1">Huurinkomsten</p>
              <p className="text-base sm:text-xl font-bold text-foreground">{displayAmount(kasgeldData?.total_payments || 0)}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Extra Stortingen */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] sm:text-xs font-medium mb-1">Stortingen</p>
              <p className="text-base sm:text-xl font-bold text-green-600">{displayAmount(kasgeldData?.total_deposits || 0)}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Opnames */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] sm:text-xs font-medium mb-1">Opnames</p>
              <p className="text-base sm:text-xl font-bold text-orange-600">{displayAmount(kasgeldData?.total_withdrawals || 0)}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Onderhoud */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] sm:text-xs font-medium mb-1">Onderhoud</p>
              <p className="text-base sm:text-xl font-bold text-blue-600">{displayAmount(kasgeldData?.total_maintenance_costs || 0)}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Salarissen */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-3 sm:p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] sm:text-xs font-medium mb-1">Salarissen</p>
              <p className="text-base sm:text-xl font-bold text-purple-600">{displayAmount(kasgeldData?.total_salary_payments || 0)}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl sm:rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Transactiegeschiedenis</h2>
        </div>
        <div className="p-0">
          {kasgeldData?.transactions?.filter(t => t.transaction_type !== 'payment').length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Datum</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Omschrijving</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Bedrag</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kasgeldData.transactions
                  .filter(t => t.transaction_type !== 'payment')
                  .map((transaction) => {
                  const isDeposit = transaction.transaction_type === 'deposit';
                  const isWithdrawal = transaction.transaction_type === 'withdrawal';
                  const isSalary = transaction.transaction_type === 'salary';
                  const isMaintenance = transaction.transaction_type === 'maintenance';
                  
                  const isIncome = isDeposit;
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground hidden sm:block" />
                          {transaction.transaction_date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                          isDeposit ? 'bg-green-500/10 text-green-600' : 
                          isSalary ? 'bg-purple-500/10 text-purple-600' :
                          isMaintenance ? 'bg-blue-500/10 text-blue-600' :
                          'bg-orange-500/10 text-orange-600'
                        }`}>
                          {isDeposit ? 'Storting' : 
                           isSalary ? 'Salaris' : 
                           isMaintenance ? 'Onderhoud' : 'Opname'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs sm:text-sm text-muted-foreground">{transaction.description || '-'}</TableCell>
                      <TableCell className={`text-right text-xs sm:text-sm font-semibold ${
                        isIncome ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {isIncome ? '+' : '-'}
                        {displayAmount(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {transaction.source === 'manual' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                            onClick={() => { setSelectedTransaction(transaction); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
                <Banknote className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 text-center">Nog geen transacties</h3>
              <p className="text-muted-foreground text-center text-xs sm:text-sm">Voeg een transactie toe om te beginnen</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe transactie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type transactie *</Label>
              <Select 
                value={formData.transaction_type} 
                onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger data-testid="kasgeld-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Storting (geld toevoegen)</SelectItem>
                  <SelectItem value="withdrawal">Opname (geld opnemen)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Bedrag (SRD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="kasgeld-amount-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Datum *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
                data-testid="kasgeld-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Bijv. Maandelijkse kasstorting..."
                rows={2}
                data-testid="kasgeld-description-input"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button type="submit" className="flex-1 bg-primary" data-testid="save-kasgeld-btn">
                Toevoegen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transactie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze transactie wilt verwijderen? 
              Dit zal het kasgeld saldo aanpassen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
