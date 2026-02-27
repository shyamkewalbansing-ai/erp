import React, { useState, useEffect } from 'react';
import { remindersAPI } from '../../lib/boekhoudingApi';
import { formatCurrency, formatDate } from '../../lib/utils';
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
    return <Badge className={styles[level]}>{labels[level]}</Badge>;
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
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const sentCount = reminders.filter(r => r.status === 'sent').length;
  const totalOverdue = reminders.reduce((sum, r) => sum + (r.status !== 'acknowledged' ? r.amount_due : 0), 0);

  return (
    <div className="space-y-6" data-testid="herinneringen-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Betalingsherinneringen</h1>
          <p className="text-slate-500 mt-1">Beheer herinneringen voor vervallen facturen</p>
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
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Te Verzenden</p>
                <p className="text-2xl font-bold font-mono text-amber-600">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Verzonden</p>
                <p className="text-2xl font-bold font-mono text-blue-600">{sentCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Openstaand</p>
                <p className="text-2xl font-bold font-mono text-red-600">{formatCurrency(totalOverdue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Herinneringen Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Laden...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-28">Factuur</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead className="w-24">Niveau</TableHead>
                  <TableHead className="text-right w-24">Dagen</TableHead>
                  <TableHead className="text-right w-32">Bedrag</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-48">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map(reminder => (
                  <TableRow key={reminder.id} data-testid={`reminder-row-${reminder.invoice_number}`}>
                    <TableCell className="font-mono">{reminder.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{reminder.customer_name}</span>
                        {reminder.customer_email && (
                          <p className="text-xs text-slate-500">{reminder.customer_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getLevelBadge(reminder.reminder_level)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {reminder.days_overdue}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reminder.amount_due, reminder.currency)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HerinneringenPage;
