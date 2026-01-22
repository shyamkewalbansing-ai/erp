import { useState, useEffect } from 'react';
import { getKasgeld, createKasgeld, deleteKasgeld, formatCurrency } from '../lib/api';
import { toast } from 'sonner';
import { 
  Banknote, 
  Plus, 
  ArrowUpCircle,
  ArrowDownCircle,
  Wrench,
  Trash2,
  Calendar
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

export default function Kasgeld() {
  const [kasgeldData, setKasgeldData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    fetchKasgeld();
  }, []);

  const fetchKasgeld = async () => {
    try {
      const response = await getKasgeld();
      setKasgeldData(response.data);
    } catch (error) {
      toast.error('Fout bij laden kasgeld');
    } finally {
      setLoading(false);
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
      fetchKasgeld();
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
      fetchKasgeld();
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
            Beheer uw kasgeld voor onderhoud en andere uitgaven
          </p>
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

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${kasgeldData?.total_balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(kasgeldData?.total_balance || 0)}
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
              Totaal Stortingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(kasgeldData?.total_deposits || 0)}
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
              Totaal Opnames
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">
                {formatCurrency(kasgeldData?.total_withdrawals || 0)}
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
              Onderhoudskosten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(kasgeldData?.total_maintenance_costs || 0)}
              </span>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-blue-600" />
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
                {kasgeldData.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {transaction.transaction_date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`status-badge ${
                        transaction.transaction_type === 'deposit' 
                          ? 'bg-green-50 text-green-600' 
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {transaction.transaction_type === 'deposit' ? 'Storting' : 'Opname'}
                      </span>
                    </TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      transaction.transaction_type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {transaction.transaction_type === 'deposit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setSelectedTransaction(transaction); setShowDeleteDialog(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
