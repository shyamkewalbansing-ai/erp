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
  Euro
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="kasgeld-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kasgeld</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer uw kasgeld voor onderhoud en salarisbetalingen
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Euro Toggle */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground">SRD</span>
            <Switch
              checked={showInEuro}
              onCheckedChange={setShowInEuro}
              data-testid="euro-toggle"
            />
            <Euro className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">EUR</span>
          </div>
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="rounded-full bg-primary hover:bg-primary/90"
            data-testid="add-kasgeld-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Transactie toevoegen
          </Button>
        </div>
      </div>

      {/* Exchange Rate Info */}
      {exchangeRate && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Euro className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Huidige Wisselkoers</p>
                  <p className="text-lg font-bold text-blue-700">
                    1 EUR = {exchangeRate.eur_to_srd.toFixed(2)} SRD
                  </p>
                  <p className="text-xs text-blue-500">
                    Bron: {exchangeRate.source === 'live' ? 'Live koers' : exchangeRate.source === 'cached' ? 'Gecached' : 'Geschatte koers'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshExchangeRate}
                disabled={loadingRate}
                className="border-blue-300 text-blue-600 hover:bg-blue-100"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingRate ? 'animate-spin' : ''}`} />
                Vernieuwen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-bold ${kasgeldData?.total_balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {displayAmount(kasgeldData?.total_balance || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Huurinkomsten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-primary">
                {displayAmount(kasgeldData?.total_payments || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Extra Stortingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-green-600">
                {displayAmount(kasgeldData?.total_deposits || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opnames
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-orange-600">
                {displayAmount(kasgeldData?.total_withdrawals || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Onderhoud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-blue-600">
                {displayAmount(kasgeldData?.total_maintenance_costs || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salarissen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-purple-600">
                {displayAmount(kasgeldData?.total_salary_payments || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Users2 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactiegeschiedenis</CardTitle>
        </CardHeader>
        <CardContent>
          {kasgeldData?.transactions?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kasgeldData.transactions
                  .filter(t => t.transaction_type !== 'payment') // Filter huurbetalingen uit
                  .map((transaction) => {
                  const isDeposit = transaction.transaction_type === 'deposit';
                  const isWithdrawal = transaction.transaction_type === 'withdrawal';
                  const isSalary = transaction.transaction_type === 'salary';
                  
                  const isIncome = isDeposit;
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {transaction.transaction_date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`status-badge ${
                          isDeposit ? 'bg-green-50 text-green-600' : 
                          isSalary ? 'bg-purple-50 text-purple-600' :
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {isDeposit ? 'Storting' : 
                           isSalary ? 'Salaris' : 'Opname'}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.description || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        isIncome ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {isIncome ? '+' : '-'}
                        {displayAmount(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {/* Only allow delete for manual transactions */}
                        {transaction.source === 'manual' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { setSelectedTransaction(transaction); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <Banknote className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nog geen transacties</p>
            </div>
          )}
        </CardContent>
      </Card>

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
