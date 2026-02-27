import React, { useState, useEffect } from 'react';
import { remindersAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Mail, Check, FileText, Loader2, AlertTriangle, Clock } from 'lucide-react';

const HerinneringenPage = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Format number with Dutch locale
  const formatAmount = (amount, currency = 'SRD') => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount || 0));
    
    if (currency === 'USD') return `$ ${formatted}`;
    if (currency === 'EUR') return `€ ${formatted}`;
    return `SRD ${formatted}`;
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await remindersAPI.getAll();
      setReminders(response.data);
    } catch (error) {
      toast.error('Fout bij laden herinneringen');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await remindersAPI.generate();
      toast.success(response.data.message);
      fetchReminders();
    } catch (error) {
      toast.error('Fout bij genereren herinneringen');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkSent = async (id) => {
    try {
      await remindersAPI.markSent(id);
      toast.success('Herinnering gemarkeerd als verzonden');
      fetchReminders();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await remindersAPI.acknowledge(id);
      toast.success('Herinnering afgehandeld');
      fetchReminders();
    } catch (error) {
      toast.error('Fout bij bijwerken');
    }
  };

  const handleDownloadLetter = async (id, invoiceNumber, level) => {
    try {
      const response = await remindersAPI.getLetter(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `herinnering_${invoiceNumber}_niveau${level}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Fout bij downloaden brief');
    }
  };

  const getLevelBadge = (level) => {
    const styles = {
      1: 'bg-amber-100 text-amber-700',
      2: 'bg-orange-100 text-orange-700',
      3: 'bg-red-100 text-red-700'
    };
    const labels = {
      1: '1e Herinnering',
      2: '2e Herinnering',
      3: 'Laatste Aanmaning'
    };
    return <Badge className={`text-xs ${styles[level]}`}>{labels[level]}</Badge>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      acknowledged: 'bg-green-100 text-green-700'
    };
    const labels = {
      pending: 'Te verzenden',
      sent: 'Verzonden',
      acknowledged: 'Afgehandeld'
    };
    return <Badge className={`text-xs ${styles[status]}`}>{labels[status]}</Badge>;
  };

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const sentCount = reminders.filter(r => r.status === 'sent').length;
  const totalOverdue = reminders.reduce((sum, r) => sum + (r.status !== 'acknowledged' ? r.amount_due : 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="herinneringen-page">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="herinneringen-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Betalingsherinneringen</h1>
          <p className="text-slate-500 mt-0.5">Beheer herinneringen voor vervallen facturen</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} data-testid="generate-reminders-btn">
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Herinneringen Genereren
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Te Verzenden</p>
                <p className="text-2xl font-semibold text-amber-600">{pendingCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Verzonden</p>
                <p className="text-2xl font-semibold text-blue-600">{sentCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-white border border-slate-100 shadow-sm ${totalOverdue > 0 ? 'bg-red-50' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-2">Totaal Openstaand</p>
                <p className={`text-2xl font-semibold ${totalOverdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatAmount(totalOverdue)}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${totalOverdue > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${totalOverdue > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Table */}
      <Card className="bg-white border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Herinneringen Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28 text-xs font-medium text-slate-500">Factuur</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Klant</TableHead>
                <TableHead className="w-28 text-xs font-medium text-slate-500">Niveau</TableHead>
                <TableHead className="text-right w-24 text-xs font-medium text-slate-500">Dagen</TableHead>
                <TableHead className="text-right w-32 text-xs font-medium text-slate-500">Bedrag</TableHead>
                <TableHead className="w-28 text-xs font-medium text-slate-500">Status</TableHead>
                <TableHead className="w-32 text-xs font-medium text-slate-500">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map(reminder => (
                <TableRow key={reminder.id} data-testid={`reminder-row-${reminder.invoice_number}`}>
                  <TableCell className="text-sm text-slate-600">{reminder.invoice_number}</TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium text-slate-900">{reminder.customer_name}</span>
                      {reminder.customer_email && (
                        <p className="text-xs text-slate-500">{reminder.customer_email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getLevelBadge(reminder.reminder_level)}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-red-600">
                    {reminder.days_overdue}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-slate-900">
                    {formatAmount(reminder.amount_due, reminder.currency)}
                  </TableCell>
                  <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadLetter(reminder.id, reminder.invoice_number, reminder.reminder_level)}
                        title="Download brief"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {reminder.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkSent(reminder.id)}
                          title="Markeer als verzonden"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                      {reminder.status !== 'acknowledged' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(reminder.id)}
                          title="Afhandelen"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {reminders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Geen herinneringen. Klik op "Herinneringen Genereren" om te controleren op vervallen facturen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HerinneringenPage;
