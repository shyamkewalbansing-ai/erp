import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import SnelleActies from '../../components/suribet/SnelleActies';
import { 
  Banknote, 
  Calendar,
  CheckCircle2,
  Trash2,
  Eye,
  FileText,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('nl-SR', { style: 'currency', currency: 'SRD' }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function UitbetalingenPage() {
  const [uitbetalingen, setUitbetalingen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUitbetaling, setSelectedUitbetaling] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchUitbetalingen();
  }, []);

  const fetchUitbetalingen = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/uitbetalingen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUitbetalingen(data);
      }
    } catch (error) {
      toast.error('Fout bij laden uitbetalingen');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (uitbetaling) => {
    setSelectedUitbetaling(uitbetaling);
    setShowDetailModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/uitbetalingen/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Uitbetaling verwijderd');
        fetchUitbetalingen();
      } else {
        toast.error('Fout bij verwijderen');
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    } finally {
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-500" />
            Suribet Uitbetalingen
          </h1>
          <p className="text-muted-foreground">Overzicht van alle uitbetalingen aan Suribet</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Totaal Uitbetalingen</p>
            <p className="text-2xl font-bold">{uitbetalingen.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Totaal Uitbetaald</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(uitbetalingen.reduce((sum, u) => sum + (u.total_amount || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Laatste Uitbetaling</p>
            <p className="text-lg font-medium">
              {uitbetalingen.length > 0 ? formatDate(uitbetalingen[0].payout_date) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uitbetalingen Geschiedenis</CardTitle>
        </CardHeader>
        <CardContent>
          {uitbetalingen.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen uitbetalingen geregistreerd</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uitbetalingen.map((uitbetaling) => (
                <div 
                  key={uitbetaling.id}
                  className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 rounded-lg border"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Uitbetaling</p>
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            {uitbetaling.dagstaat_details?.length || 0} dagen
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(uitbetaling.payout_date)}</span>
                        </div>
                        {uitbetaling.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{uitbetaling.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Bedrag</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {formatCurrency(uitbetaling.total_amount)}
                        </p>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewDetails(uitbetaling)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            setDeleteId(uitbetaling.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Uitbetaling Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedUitbetaling && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Datum</p>
                  <p className="font-medium">{formatDate(selectedUitbetaling.payout_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totaal Bedrag</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedUitbetaling.total_amount)}</p>
                </div>
              </div>
              
              {selectedUitbetaling.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notities</p>
                  <p>{selectedUitbetaling.notes}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Dagrapporten in deze uitbetaling:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedUitbetaling.dagstaat_details?.map((detail, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{formatDate(detail.date)}</p>
                          <p className="text-xs text-muted-foreground">Machine: {detail.machine_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Suribet Deel</p>
                          <p className="font-bold text-emerald-600">{formatCurrency(detail.suribet_amount)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Jouw Commissie: {formatCurrency(detail.commission)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uitbetaling Verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert de uitbetaling en markeert de dagrapporten weer als openstaand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
