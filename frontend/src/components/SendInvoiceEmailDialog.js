import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Mail, 
  Send, 
  Loader2, 
  X,
  CheckCircle,
  User,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SendInvoiceEmailDialog({ 
  open, 
  onOpenChange, 
  factuur, 
  debiteur,
  onSuccess 
}) {
  const [sending, setSending] = useState(false);
  const [emailData, setEmailData] = useState({
    to_email: '',
    subject: '',
    message: ''
  });

  // Update email data when debiteur changes
  useEffect(() => {
    if (debiteur?.email) {
      setEmailData(prev => ({
        ...prev,
        to_email: debiteur.email
      }));
    }
  }, [debiteur]);

  const handleSend = async () => {
    if (!emailData.to_email) {
      toast.error('Vul een email adres in');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        `${API_URL}/api/boekhouding/verkoopfacturen/${factuur.id}/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(emailData)
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(`Factuur verzonden naar ${emailData.to_email}`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.detail || 'Fout bij verzenden factuur');
      }
    } catch (error) {
      toast.error('Fout bij verzenden factuur');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" />
            Factuur Versturen
          </DialogTitle>
          <DialogDescription>
            Verstuur factuur {factuur?.factuurnummer} per email naar de klant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Factuur Info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{factuur?.factuurnummer}</p>
              <p className="text-sm text-muted-foreground">
                {factuur?.valuta || 'SRD'} {factuur?.totaal?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Debiteur Info */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{debiteur?.naam || 'Onbekend'}</p>
              <p className="text-sm text-muted-foreground">
                {debiteur?.email || 'Geen email'}
              </p>
            </div>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to_email">Email Adres *</Label>
              <Input
                id="to_email"
                type="email"
                placeholder="klant@email.com"
                value={emailData.to_email}
                onChange={(e) => setEmailData({...emailData, to_email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Onderwerp (optioneel)</Label>
              <Input
                id="subject"
                placeholder={`Factuur ${factuur?.factuurnummer}`}
                value={emailData.subject}
                onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Bericht (optioneel)</Label>
              <Textarea
                id="message"
                placeholder="Extra bericht bij de factuur..."
                value={emailData.message}
                onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          {/* Email sent info */}
          {factuur?.email_verzonden && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-300">
                Eerder verzonden naar {factuur.email_verzonden_aan} op{' '}
                {new Date(factuur.email_verzonden_op).toLocaleString('nl-NL')}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || !emailData.to_email}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verzenden...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Versturen</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
