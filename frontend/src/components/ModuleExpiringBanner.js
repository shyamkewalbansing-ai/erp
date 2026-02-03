import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  X, 
  ChevronRight,
  Copy,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ModuleExpiringBanner({ onClose }) {
  const navigate = useNavigate();
  const [expiringModules, setExpiringModules] = useState([]);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkExpiringModules();
  }, []);

  const checkExpiringModules = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user/modules/payment-status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check for modules expiring within 7 days
        if (data.trial_ends_at) {
          const trialEnd = new Date(data.trial_ends_at);
          const now = new Date();
          const diffTime = trialEnd - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 7 && diffDays > 0) {
            setDaysRemaining(diffDays);
            setExpiringModules(data.active_modules || []);
            setPaymentInfo(data.payment_info);
          }
        }
        
        // Also check expired modules
        if (data.has_expired_modules) {
          setDaysRemaining(0);
          setExpiringModules(data.expired_modules || []);
          setPaymentInfo(data.payment_info);
        }
      }
    } catch (error) {
      console.error('Error checking expiring modules:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal for 24 hours
    localStorage.setItem('expiringBannerDismissed', Date.now().toString());
    if (onClose) onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const handleSubmitPayment = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/user/modules/payment-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        toast.success('Betaalverzoek ingediend! We nemen contact met u op.');
        setShowTopupDialog(false);
        handleDismiss();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij indienen verzoek');
      }
    } catch (error) {
      toast.error('Fout bij indienen betaalverzoek');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if banner was dismissed recently
  useEffect(() => {
    const dismissedTime = localStorage.getItem('expiringBannerDismissed');
    if (dismissedTime) {
      const hoursSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissal < 24) {
        setDismissed(true);
      }
    }
  }, []);

  if (dismissed || (daysRemaining === null && expiringModules.length === 0)) {
    return null;
  }

  const isExpired = daysRemaining === 0;
  const isUrgent = daysRemaining !== null && daysRemaining <= 3;

  return (
    <>
      {/* Banner */}
      <div className={`relative overflow-hidden rounded-xl p-4 mb-6 ${
        isExpired 
          ? 'bg-gradient-to-r from-red-500 to-rose-500' 
          : isUrgent 
          ? 'bg-gradient-to-r from-orange-500 to-amber-500'
          : 'bg-gradient-to-r from-yellow-500 to-amber-400'
      }`}>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:200%_200%] animate-shimmer" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isExpired ? 'bg-white/20' : 'bg-white/20'
            }`}>
              {isExpired ? (
                <AlertTriangle className="w-6 h-6 text-white" />
              ) : (
                <Clock className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="text-white">
              <h3 className="font-bold text-lg">
                {isExpired 
                  ? '⚠️ Module(s) Verlopen!' 
                  : `⏰ Module(s) verlopen over ${daysRemaining} dag${daysRemaining > 1 ? 'en' : ''}`
                }
              </h3>
              <p className="text-white/90 text-sm">
                {isExpired 
                  ? 'Heractiveer nu om weer toegang te krijgen tot uw modules.'
                  : 'Verleng nu om onderbrekingen te voorkomen.'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowTopupDialog(true)}
              className={`${
                isExpired 
                  ? 'bg-white text-red-600 hover:bg-white/90' 
                  : 'bg-white text-orange-600 hover:bg-white/90'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isExpired ? 'Nu Heractiveren' : 'Nu Verlengen'}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top-up Dialog */}
      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              {isExpired ? 'Module(s) Heractiveren' : 'Module(s) Verlengen'}
            </DialogTitle>
            <DialogDescription>
              {isExpired 
                ? 'Betaal om uw modules direct te heractiveren.'
                : 'Verleng uw abonnement om onderbrekingen te voorkomen.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Modules List */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <h4 className="font-semibold mb-3">
                {isExpired ? 'Verlopen Modules:' : 'Module(s) die verlopen:'}
              </h4>
              <div className="space-y-2">
                {expiringModules.map((module, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span>{module.addon_name || module.name}</span>
                    <span className="font-medium">
                      SRD {(module.price || 0).toLocaleString('nl-NL')}/mnd
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            {paymentInfo && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Betaalgegevens
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 dark:text-emerald-300">Bank:</span>
                    <span className="font-medium">{paymentInfo.bank_name || 'Hakrinbank'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 dark:text-emerald-300">Rekening:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono">{paymentInfo.account_number || '1234567890'}</span>
                      <button 
                        onClick={() => copyToClipboard(paymentInfo.account_number)}
                        className="p-1 hover:bg-emerald-200 rounded"
                      >
                        <Copy className="w-4 h-4 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 dark:text-emerald-300">T.n.v.:</span>
                    <span className="font-medium">{paymentInfo.account_holder || 'Facturatie N.V.'}</span>
                  </div>
                </div>
                {paymentInfo.instructions && (
                  <p className="text-xs text-emerald-600 mt-3 pt-3 border-t border-emerald-200">
                    {paymentInfo.instructions}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
              Later
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bezig...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Ik heb betaald</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
