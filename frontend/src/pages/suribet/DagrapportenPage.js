import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Users2,
  Banknote,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Calculator,
  DollarSign,
  Euro,
  Camera,
  Upload,
  QrCode,
  Loader2,
  Receipt,
  Smartphone,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Running totals state
const useRunningTotals = () => {
  const [totals, setTotals] = useState({
    total_balance: 0,
    total_commission: 0,
    total_suribet: 0,
    unpaid_count: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchTotals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/openstaand-totaal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTotals(data);
      }
    } catch (error) {
      console.error('Error fetching totals:', error);
    } finally {
      setLoading(false);
    }
  };

  return { totals, loading, fetchTotals };
};

// Biljet denominaties
const SRD_DENOMINATIES = [5, 10, 20, 50, 100, 200, 500];
const EUR_DENOMINATIES = [5, 10, 20, 50, 100, 200];
const USD_DENOMINATIES = [1, 5, 10, 20, 50, 100];

export default function DagrapportenPage() {
  const [loading, setLoading] = useState(true);
  const [dagrapporten, setDagrapporten] = useState([]);
  const [machines, setMachines] = useState([]);
  const [werknemers, setWerknemers] = useState([]);
  const [wisselkoersen, setWisselkoersen] = useState({ eur_to_srd: 38.5, usd_to_srd: 35.5 });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [scanningBon, setScanningBon] = useState(false);
  const [bonData, setBonData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState(null);
  const [qrPolling, setQrPolling] = useState(false);
  const [selectedForPayout, setSelectedForPayout] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [showCommissieModal, setShowCommissieModal] = useState(false);
  const [processingCommissie, setProcessingCommissie] = useState(false);
  const [commissieNotes, setCommissieNotes] = useState('');
  
  // Saldo toevoegen modals
  const [showSaldoSuribetModal, setShowSaldoSuribetModal] = useState(false);
  const [showSaldoCommissieModal, setShowSaldoCommissieModal] = useState(false);
  const [saldoAmount, setSaldoAmount] = useState('');
  const [saldoNotes, setSaldoNotes] = useState('');
  const [processingSaldo, setProcessingSaldo] = useState(false);
  
  const fileInputRef = useRef(null);
  const qrPollIntervalRef = useRef(null);
  
  // Running totals hook
  const { totals: runningTotals, loading: totalsLoading, fetchTotals } = useRunningTotals();
  
  // Form state
  const [formData, setFormData] = useState({
    machine_id: '',
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    beginsaldo_srd: 0,
    beginsaldo_eur: 0,
    beginsaldo_usd: 0,
    eindsaldo_srd: 0,
    eindsaldo_eur: 0,
    eindsaldo_usd: 0,
    biljetten_srd: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 },
    biljetten_eur: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0 },
    biljetten_usd: { b1: 0, b5: 0, b10: 0, b20: 0, b50: 0, b100: 0 },
    bon_data: null,
    suribet_percentage: 80,
    notes: ''
  });

  useEffect(() => {
    fetchData();
    fetchTotals();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [dagstatenRes, machinesRes, werknemersRes, koersenRes] = await Promise.all([
        fetch(`${API_URL}/api/suribet/dagstaten?date=${selectedDate}`, { headers }),
        fetch(`${API_URL}/api/suribet/machines`, { headers }),
        fetch(`${API_URL}/api/suribet/werknemers`, { headers }),
        fetch(`${API_URL}/api/suribet/wisselkoersen`, { headers })
      ]);

      if (dagstatenRes.ok) setDagrapporten(await dagstatenRes.json());
      if (machinesRes.ok) setMachines(await machinesRes.json());
      if (werknemersRes.ok) setWerknemers(await werknemersRes.json());
      if (koersenRes.ok) setWisselkoersen(await koersenRes.json());
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Bon scanner functie
  const handleBonUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningBon(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      // Use XMLHttpRequest to avoid service worker interference
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/suribet/parse-bon`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data);
            } else {
              reject(new Error(data.detail || 'Server error'));
            }
          } catch (e) {
            reject(new Error('Ongeldige server response'));
          }
        };
        
        xhr.onerror = () => reject(new Error('Netwerkfout'));
        xhr.ontimeout = () => reject(new Error('Timeout - probeer opnieuw'));
        xhr.timeout = 120000; // 2 minuten timeout voor AI processing
        
        xhr.send(formDataUpload);
      });

      if (result.success) {
        setBonData(result.bon_data);
        // Update form with bon data including date if available
        setFormData(prev => ({
          ...prev,
          bon_data: result.bon_data,
          // Auto-fill date from receipt if available
          date: result.bon_data.receipt_date || prev.date
        }));
        toast.success('Bon succesvol gescand!');
      } else {
        toast.error(result.detail || 'Fout bij scannen bon');
      }
    } catch (error) {
      console.error('Bon scan error:', error);
      toast.error(error.message || 'Fout bij scannen bon');
    } finally {
      setScanningBon(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // QR Code functies
  const createQrSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/mobile-upload/create-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrSessionId(data.session_id);
        setShowQrModal(true);
        startQrPolling(data.session_id);
      } else {
        toast.error('Kon QR sessie niet aanmaken');
      }
    } catch (error) {
      toast.error('Fout bij aanmaken QR sessie');
    }
  };

  const startQrPolling = (sessionId) => {
    setQrPolling(true);
    
    // Poll elke 3 seconden voor upload status
    qrPollIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/suribet/mobile-upload/status/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'completed' && data.bon_data) {
            // Upload is voltooid!
            setBonData(data.bon_data);
            setFormData(prev => ({
              ...prev,
              bon_data: data.bon_data,
              // Auto-fill date from receipt if available
              date: data.bon_data.receipt_date || prev.date
            }));
            toast.success('Bon succesvol ontvangen via telefoon!');
            stopQrPolling();
            setShowQrModal(false);
          } else if (data.status === 'expired') {
            toast.error('QR sessie verlopen');
            stopQrPolling();
            setShowQrModal(false);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  const stopQrPolling = () => {
    setQrPolling(false);
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current);
      qrPollIntervalRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollIntervalRef.current) {
        clearInterval(qrPollIntervalRef.current);
      }
    };
  }, []);

  const getQrUrl = () => {
    const baseUrl = window.location.origin;
    const token = localStorage.getItem('token');
    return `${baseUrl}/upload/suribet/${qrSessionId}?token=${token}`;
  };

  // Payout functies
  const toggleSelectForPayout = (rapportId) => {
    setSelectedForPayout(prev => 
      prev.includes(rapportId) 
        ? prev.filter(id => id !== rapportId)
        : [...prev, rapportId]
    );
  };

  const selectAllUnpaid = () => {
    // Get all unpaid reports (not just current date)
    const allUnpaid = dagrapporten.filter(r => !r.is_paid);
    if (allUnpaid.length > 0) {
      // Clear selection and open modal - user will select in the modal
      setSelectedForPayout([]);
      setShowPayoutModal(true);
    } else {
      toast.info('Geen openstaande rapporten gevonden');
    }
  };

  // Get unpaid reports grouped by date
  const getUnpaidReportsGroupedByDate = () => {
    const unpaid = dagrapporten.filter(r => !r.is_paid);
    const grouped = {};
    
    unpaid.forEach(rapport => {
      const date = rapport.date;
      if (!grouped[date]) {
        grouped[date] = {
          date: date,
          reports: [],
          totalBalance: 0,
          totalCommission: 0
        };
      }
      grouped[date].reports.push(rapport);
      grouped[date].totalBalance += rapport.bon_data?.balance || 0;
      grouped[date].totalCommission += rapport.bon_data?.total_pos_commission || 0;
    });
    
    // Convert to array and sort by date descending
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Get all unpaid reports for backward compatibility
  const getUnpaidReports = () => {
    return dagrapporten.filter(r => !r.is_paid);
  };

  // Toggle selection of all reports for a specific date
  const toggleDateSelection = (date) => {
    const reportsForDate = dagrapporten.filter(r => r.date === date && !r.is_paid);
    const reportIds = reportsForDate.map(r => r.id);
    
    // Check if all reports for this date are already selected
    const allSelected = reportIds.every(id => selectedForPayout.includes(id));
    
    if (allSelected) {
      // Deselect all reports for this date
      setSelectedForPayout(prev => prev.filter(id => !reportIds.includes(id)));
    } else {
      // Select all reports for this date
      setSelectedForPayout(prev => [...new Set([...prev, ...reportIds])]);
    }
  };

  // Check if all reports for a date are selected
  const isDateFullySelected = (date) => {
    const reportsForDate = dagrapporten.filter(r => r.date === date && !r.is_paid);
    return reportsForDate.length > 0 && reportsForDate.every(r => selectedForPayout.includes(r.id));
  };

  // Select all unpaid in the modal
  const selectAllInModal = () => {
    const unpaidIds = dagrapporten.filter(r => !r.is_paid).map(r => r.id);
    setSelectedForPayout(unpaidIds);
  };

  // Clear all selections in modal
  const clearAllInModal = () => {
    setSelectedForPayout([]);
  };

  const clearSelection = () => {
    setSelectedForPayout([]);
  };

  // Calculate total Suribet Deel for selected reports (= bon balance)
  const calculatePayoutTotal = () => {
    return dagrapporten
      .filter(r => selectedForPayout.includes(r.id))
      .reduce((sum, r) => {
        // Suribet Deel = bon balance (niet balance - commission)
        const balance = r.bon_data?.balance || 0;
        return sum + balance;
      }, 0);
  };

  const handlePayout = async () => {
    if (selectedForPayout.length === 0) {
      toast.error('Selecteer eerst dagrapporten');
      return;
    }

    setProcessingPayout(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/uitbetalingen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dagstaat_ids: selectedForPayout,
          amount: calculatePayoutTotal(),
          notes: payoutNotes
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowPayoutModal(false);
        setSelectedForPayout([]);
        setPayoutNotes('');
        fetchData();
        fetchTotals(); // Refresh running totals
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij uitbetaling');
      }
    } catch (error) {
      toast.error('Fout bij uitbetaling');
    } finally {
      setProcessingPayout(false);
    }
  };

  // Commissie opnemen handler
  const handleCommissieOpnemen = async () => {
    if (runningTotals.total_commission <= 0) {
      toast.error('Geen commissie beschikbaar om op te nemen');
      return;
    }

    setProcessingCommissie(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/commissie-opnemen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: runningTotals.total_commission,
          notes: commissieNotes || 'Commissie opname'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowCommissieModal(false);
        setCommissieNotes('');
        fetchData();
        fetchTotals(); // Refresh running totals
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij commissie opnemen');
      }
    } catch (error) {
      toast.error('Fout bij commissie opnemen');
    } finally {
      setProcessingCommissie(false);
    }
  };

  // Saldo toevoegen aan Suribet (uit commissie)
  const handleSaldoNaarSuribet = async () => {
    const amount = parseFloat(saldoAmount);
    if (!amount || amount <= 0) {
      toast.error('Voer een geldig bedrag in');
      return;
    }

    setProcessingSaldo(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/saldo-naar-suribet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          notes: saldoNotes || 'Saldo toevoeging aan Suribet'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowSaldoSuribetModal(false);
        setSaldoAmount('');
        setSaldoNotes('');
        fetchData();
        fetchTotals();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij saldo toevoegen');
      }
    } catch (error) {
      toast.error('Fout bij saldo toevoegen');
    } finally {
      setProcessingSaldo(false);
    }
  };

  // Saldo toevoegen aan Commissie (uit kasboek)
  const handleSaldoNaarCommissie = async () => {
    const amount = parseFloat(saldoAmount);
    if (!amount || amount <= 0) {
      toast.error('Voer een geldig bedrag in');
      return;
    }

    setProcessingSaldo(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/suribet/saldo-naar-commissie`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          notes: saldoNotes || 'Saldo toevoeging uit kasboek'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowSaldoCommissieModal(false);
        setSaldoAmount('');
        setSaldoNotes('');
        fetchData();
        fetchTotals();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij saldo toevoegen');
      }
    } catch (error) {
      toast.error('Fout bij saldo toevoegen');
    } finally {
      setProcessingSaldo(false);
    }
  };

  // Bereken totaal biljetten in SRD
  const berekenBiljettenTotaal = (biljetten, denominaties, multiplier = 1) => {
    if (!biljetten) return 0;
    return denominaties.reduce((sum, denom) => {
      const key = `b${denom}`;
      return sum + (biljetten[key] || 0) * denom * multiplier;
    }, 0);
  };

  // Bereken totale omzet - nu ook met bon data
  const berekenTotaleOmzet = (rapport) => {
    // Als er bon data is, gebruik de balance daarvan
    if (rapport.bon_data?.balance) {
      return rapport.bon_data.balance;
    }
    // Anders bereken van biljetten
    const srd = berekenBiljettenTotaal(rapport.biljetten_srd, SRD_DENOMINATIES);
    const eur = berekenBiljettenTotaal(rapport.biljetten_eur, EUR_DENOMINATIES, wisselkoersen.eur_to_srd);
    const usd = berekenBiljettenTotaal(rapport.biljetten_usd, USD_DENOMINATIES, wisselkoersen.usd_to_srd);
    return srd + eur + usd;
  };

  // Bereken commissies - nu van bon data
  const berekenCommissies = (omzet, suribetPercentage, bonData = null) => {
    if (bonData?.total_pos_commission) {
      // Gebruik de commissie van de bon
      const totaleCommissie = bonData.total_pos_commission;
      // Retailer krijgt (100 - suribetPercentage)% van de commissie
      const jouwCommissie = totaleCommissie * ((100 - suribetPercentage) / 100);
      const suribetDeel = totaleCommissie * (suribetPercentage / 100);
      return { suribetDeel, jouwCommissie, totaleCommissie };
    }
    // Fallback naar oude berekening
    const suribetDeel = omzet * (suribetPercentage / 100);
    const jouwCommissie = omzet - suribetDeel;
    return { suribetDeel, jouwCommissie, totaleCommissie: omzet };
  };

  // Check of machine verlies draait
  const isVerlies = (rapport) => {
    const omzet = berekenTotaleOmzet(rapport);
    const beginsaldo = rapport.beginsaldo_srd + 
      (rapport.beginsaldo_eur * wisselkoersen.eur_to_srd) + 
      (rapport.beginsaldo_usd * wisselkoersen.usd_to_srd);
    const eindsaldo = rapport.eindsaldo_srd + 
      (rapport.eindsaldo_eur * wisselkoersen.eur_to_srd) + 
      (rapport.eindsaldo_usd * wisselkoersen.usd_to_srd);
    
    return omzet < beginsaldo || eindsaldo < beginsaldo;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Bereken omzet automatisch van biljetten (of gebruik bon balance)
      const biljettenOmzet = berekenTotaleOmzet({
        biljetten_srd: formData.biljetten_srd,
        biljetten_eur: formData.biljetten_eur,
        biljetten_usd: formData.biljetten_usd
      });
      
      // Use bon balance if available, otherwise use counted bills
      const omzet = formData.bon_data?.balance || biljettenOmzet;

      const response = await fetch(`${API_URL}/api/suribet/dagstaten`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          omzet,
          bon_data: formData.bon_data || null
        })
      });

      if (response.ok) {
        toast.success('Dagrapport toegevoegd');
        setShowModal(false);
        resetForm();
        setBonData(null);
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
      const response = await fetch(`${API_URL}/api/suribet/dagstaten/${selectedRapport.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Dagrapport verwijderd');
        setShowDeleteDialog(false);
        setSelectedRapport(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      machine_id: '',
      date: selectedDate,
      employee_id: '',
      beginsaldo_srd: 0,
      beginsaldo_eur: 0,
      beginsaldo_usd: 0,
      eindsaldo_srd: 0,
      eindsaldo_eur: 0,
      eindsaldo_usd: 0,
      biljetten_srd: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 },
      biljetten_eur: { b5: 0, b10: 0, b20: 0, b50: 0, b100: 0, b200: 0 },
      biljetten_usd: { b1: 0, b5: 0, b10: 0, b20: 0, b50: 0, b100: 0 },
      bon_data: null,
      suribet_percentage: 80,
      notes: ''
    });
    setBonData(null);
  };

  const getMachineName = (id) => machines.find(m => m.id === id)?.machine_id || 'Onbekend';
  const getWerknemerName = (id) => werknemers.find(w => w.id === id)?.name || 'Onbekend';

  const formatCurrency = (amount, currency = 'SRD') => {
    return new Intl.NumberFormat('nl-SR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Stats berekenen - gebruik bon_data als beschikbaar
  const stats = {
    totaalOmzet: dagrapporten.reduce((sum, r) => {
      // Gebruik bon balance als beschikbaar, anders berekende omzet
      return sum + (r.bon_data?.balance || r.omzet || berekenTotaleOmzet(r));
    }, 0),
    totaalCommissie: dagrapporten.reduce((sum, r) => {
      // Gebruik bon commissie als beschikbaar
      return sum + (r.bon_data?.total_pos_commission || r.commissie || 0);
    }, 0),
    aantalMachines: dagrapporten.length,
    verliesMachines: dagrapporten.filter(r => isVerlies(r)).length
  };

  // Bereken form totalen live
  const formOmzetSRD = berekenBiljettenTotaal(formData.biljetten_srd, SRD_DENOMINATIES);
  const formOmzetEUR = berekenBiljettenTotaal(formData.biljetten_eur, EUR_DENOMINATIES);
  const formOmzetUSD = berekenBiljettenTotaal(formData.biljetten_usd, USD_DENOMINATIES);
  const formBiljettenTotaal = formOmzetSRD + (formOmzetEUR * wisselkoersen.eur_to_srd) + (formOmzetUSD * wisselkoersen.usd_to_srd);
  
  // Als bon data beschikbaar is, gebruik die voor omzet en commissie
  const formTotaalOmzet = bonData?.balance || formBiljettenTotaal;
  const formCommissies = berekenCommissies(formTotaalOmzet, formData.suribet_percentage, bonData);
  
  // Bereken begin en eind saldo
  const formBeginsaldo = formData.beginsaldo_srd + (formData.beginsaldo_eur * wisselkoersen.eur_to_srd) + (formData.beginsaldo_usd * wisselkoersen.usd_to_srd);
  const formEindsaldo = bonData?.balance 
    ? formBeginsaldo + bonData.balance - formBiljettenTotaal
    : formData.eindsaldo_srd + (formData.eindsaldo_eur * wisselkoersen.eur_to_srd) + (formData.eindsaldo_usd * wisselkoersen.usd_to_srd);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="suribet-dagrapporten-page">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dagrapporten</h1>
              <p className="text-emerald-100 text-sm sm:text-base">Machine omzet & biljetten registratie</p>
            </div>
          </div>
          
          {/* Date Selector */}
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
                className="bg-transparent border-0 text-white w-[140px] text-center [color-scheme:dark]"
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

      {/* Running Totals Header - Prominent Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Suribet Deel</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {totalsLoading ? '...' : formatCurrency(runningTotals.total_suribet)}
                </p>
                <p className="text-xs text-orange-600/70 mt-1">
                  {runningTotals.unpaid_count} rapport{runningTotals.unpaid_count !== 1 ? 'en' : ''} openstaand
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            {runningTotals.total_suribet > 0 && (
              <Button 
                onClick={selectAllUnpaid}
                size="sm"
                className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Banknote className="w-4 h-4 mr-1" />
                Suribet Uitbetalen
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Jouw Commissie</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {totalsLoading ? '...' : formatCurrency(runningTotals.total_commission)}
                </p>
                <p className="text-xs text-blue-600/70 mt-1">Beschikbaar om op te nemen</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            {runningTotals.total_commission > 0 && (
              <Button 
                onClick={() => setShowCommissieModal(true)}
                size="sm"
                className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Banknote className="w-4 h-4 mr-1" />
                Commissie Opnemen
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Machines Vandaag</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {stats.aantalMachines}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Geregistreerde rapporten</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg ${stats.verliesMachines > 0 ? 'ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Verlies</p>
                <p className={`text-2xl sm:text-3xl font-bold ${stats.verliesMachines > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {stats.verliesMachines}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.verliesMachines > 0 ? 'Let op!' : 'Geen verlies'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                stats.verliesMachines > 0 ? 'bg-red-500/20' : 'bg-slate-500/10'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${stats.verliesMachines > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Wisselkoersen: 1 EUR = {wisselkoersen.eur_to_srd} SRD | 1 USD = {wisselkoersen.usd_to_srd} SRD
              </div>
            </div>
            <div className="flex gap-2">
              {selectedForPayout.length > 0 && (
                <Button 
                  onClick={() => setShowPayoutModal(true)} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Betaal Suribet ({selectedForPayout.length})
                </Button>
              )}
              <Button onClick={() => { resetForm(); setFormData(f => ({...f, date: selectedDate})); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Dagrapport
              </Button>
            </div>
          </div>
          
          {/* Selection controls */}
          {dagrapporten.filter(r => !r.is_paid).length > 0 && (
            <div className="mt-3 pt-3 border-t flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={selectAllUnpaid}>
                Selecteer Alle Openstaand
              </Button>
              {selectedForPayout.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Deselecteer
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Geselecteerd: {formatCurrency(calculatePayoutTotal())} voor Suribet
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dagrapporten List */}
      {dagrapporten.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {dagrapporten.map((rapport, index) => {
            const omzet = berekenTotaleOmzet(rapport);
            const { suribetDeel, jouwCommissie } = berekenCommissies(omzet, rapport.suribet_percentage || 80);
            const verlies = isVerlies(rapport);
            const bonBalance = rapport.bon_data?.balance || 0;
            const bonCommission = rapport.bon_data?.total_pos_commission || 0;
            const suribetAmount = bonBalance - bonCommission;
            const isPaid = rapport.is_paid;
            const isSelected = selectedForPayout.includes(rapport.id);
            
            // Bereken lopend totaal
            const runningTotal = dagrapporten.slice(0, index + 1).reduce((sum, r) => {
              return sum + (r.bon_data?.balance || 0);
            }, 0);
            const runningCommission = dagrapporten.slice(0, index + 1).reduce((sum, r) => {
              return sum + (r.bon_data?.total_pos_commission || 0);
            }, 0);
            
            // Format tijd uit created_at
            const formatTime = (dateString) => {
              if (!dateString) return '';
              const date = new Date(dateString);
              return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            };

            return (
              <Card key={rapport.id} className={`border-0 shadow-lg hover:shadow-xl transition-shadow ${verlies ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' : ''} ${isPaid ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-orange-500' : ''}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    {/* Top row: checkbox, machine info, actions */}
                    <div className="flex items-start gap-4">
                      {/* Checkbox - only for unpaid */}
                      {!isPaid && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectForPayout(rapport.id)}
                          className="w-5 h-5 mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                      )}
                      {isPaid && (
                        <div className="w-5 h-5 mt-1 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                      
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        verlies ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{getMachineName(rapport.machine_id)}</h3>
                          {isPaid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Betaald
                            </Badge>
                          ) : verlies ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Verlies
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                              Openstaand
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1 font-medium text-blue-600">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(rapport.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users2 className="w-3.5 h-3.5" />
                            {getWerknemerName(rapport.employee_id)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setSelectedRapport(rapport); setShowDetailModal(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => { setSelectedRapport(rapport); setShowDeleteDialog(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Financial info */}
                    <div className="grid grid-cols-3 gap-3 ml-9 pl-4 border-l-2 border-emerald-200">
                      <div>
                        <p className="text-xs text-muted-foreground">Suribet Deel</p>
                        <p className="font-bold text-orange-600">{formatCurrency(bonBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jouw Commissie</p>
                        <p className="font-bold text-blue-600">{formatCurrency(bonCommission)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 -m-1">
                        <p className="text-xs text-muted-foreground">Begin / Eind Saldo</p>
                        <p className="font-medium text-sm">
                          {formatCurrency(bonBalance)} / {formatCurrency(rapport.total_in_srd || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Bon / Geteld</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-lg border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Geen dagrapporten</h3>
            <p className="text-muted-foreground text-center mb-4">
              Er zijn nog geen dagrapporten voor {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <Button onClick={() => { resetForm(); setFormData(f => ({...f, date: selectedDate})); setShowModal(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Eerste Dagrapport
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Nieuw Dagrapport
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bon Scanner */}
            <div className="p-4 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  {scanningBon ? (
                    <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
                  ) : (
                    <Camera className="w-7 h-7 text-emerald-500" />
                  )}
                </div>
                <h4 className="font-semibold mb-1">Scan Suribet Bon</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload een foto van de bon om automatisch de bedragen uit te lezen
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleBonUpload}
                  className="hidden"
                  id="bon-upload"
                />
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={scanningBon}
                    className="border-emerald-300 hover:bg-emerald-100"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {scanningBon ? 'Scannen...' : 'Maak Foto'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handleBonUpload(e);
                      input.click();
                    }}
                    disabled={scanningBon}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={createQrSession}
                    disabled={scanningBon}
                    className="border-blue-300 hover:bg-blue-100"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Code
                  </Button>
                </div>
              </div>
              
              {/* Bon Data Preview */}
              {bonData && (
                <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-sm">Bon Data Geladen</span>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Gescand</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Sales:</span>
                      <span className="font-medium">{formatCurrency(bonData.total_sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Payout:</span>
                      <span className="font-medium">{formatCurrency(bonData.total_payout)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">POS Commissie:</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(bonData.total_pos_commission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-bold text-lg">{formatCurrency(bonData.balance)}</span>
                    </div>
                  </div>
                  
                  {/* Gedetailleerde commissie breakdown */}
                  {bonData.pos_sales && bonData.pos_sales.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">POS Sales Commissies:</p>
                      <div className="space-y-1">
                        {bonData.pos_sales.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{item.product}: {formatCurrency(item.total_bets)} × {item.comm_percentage}%</span>
                            <span className="text-emerald-600">{formatCurrency(item.commission)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Basis Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <Label>Machine *</Label>
                <Select 
                  value={formData.machine_id} 
                  onValueChange={(v) => setFormData({...formData, machine_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.filter(m => m.status === 'active').map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.machine_id} - {m.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Werknemer</Label>
                <Select 
                  value={formData.employee_id || "none"} 
                  onValueChange={(v) => setFormData({...formData, employee_id: v === "none" ? "" : v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen werknemer</SelectItem>
                    {werknemers.filter(w => w.status === 'active').map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Biljetten Tabs */}
            <Tabs defaultValue="srd" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="srd">SRD Biljetten</TabsTrigger>
                <TabsTrigger value="eur">EUR Biljetten</TabsTrigger>
                <TabsTrigger value="usd">USD Biljetten</TabsTrigger>
              </TabsList>
              
              <TabsContent value="srd" className="space-y-3">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {SRD_DENOMINATIES.map(denom => (
                    <div key={denom} className="space-y-1">
                      <Label className="text-xs text-center block">{denom} SRD</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.biljetten_srd[`b${denom}`] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormData({
                          ...formData,
                          biljetten_srd: {
                            ...formData.biljetten_srd,
                            [`b${denom}`]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="text-center h-10 text-lg font-medium"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totaal SRD:</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(formOmzetSRD)}</p>
                </div>
              </TabsContent>

              <TabsContent value="eur" className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {EUR_DENOMINATIES.map(denom => (
                    <div key={denom} className="space-y-1">
                      <Label className="text-xs text-center block">€{denom}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.biljetten_eur[`b${denom}`] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormData({
                          ...formData,
                          biljetten_eur: {
                            ...formData.biljetten_eur,
                            [`b${denom}`]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="text-center h-10 text-lg font-medium"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totaal EUR: € {formOmzetEUR.toFixed(2)} (= {formatCurrency(formOmzetEUR * wisselkoersen.eur_to_srd)} SRD)</p>
                </div>
              </TabsContent>

              <TabsContent value="usd" className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {USD_DENOMINATIES.map(denom => (
                    <div key={denom} className="space-y-1">
                      <Label className="text-xs text-center block">${denom}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.biljetten_usd[`b${denom}`] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormData({
                          ...formData,
                          biljetten_usd: {
                            ...formData.biljetten_usd,
                            [`b${denom}`]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="text-center h-10 text-lg font-medium"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totaal USD: $ {formOmzetUSD.toFixed(2)} (= {formatCurrency(formOmzetUSD * wisselkoersen.usd_to_srd)} SRD)</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Notities - alleen indien nodig */}
            <div className="space-y-2">
              <Label>Notities (optioneel)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Optionele notities"
              />
            </div>

            {/* Totalen Preview */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-lg space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Berekening Overzicht
              </h4>

              {/* Biljetten Totaal */}
              <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Getelde Biljetten Totaal (SRD)</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(formBiljettenTotaal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  SRD: {formatCurrency(formOmzetSRD)} | EUR: €{formOmzetEUR.toFixed(2)} | USD: ${formOmzetUSD.toFixed(2)}
                </p>
              </div>

              {/* Bon Data Berekening - alleen tonen als bon gescand is */}
              {bonData ? (
                <>
                  {/* Bon Datum */}
                  {bonData.receipt_date && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Datum van Bon</p>
                      <p className="font-bold text-blue-600">{new Date(bonData.receipt_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                
                  {/* Bon vs Biljetten vergelijking */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">📊 Bon vs Biljetten Vergelijking</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Bon Balance:</span>
                        <span className="font-bold">{formatCurrency(bonData.balance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Getelde Biljetten:</span>
                        <span className="font-bold">{formatCurrency(formBiljettenTotaal)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Omzet & Commissie uit Bon */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Totale Omzet (Bon)</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(bonData.balance)}</p>
                    </div>
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Jouw Commissie (van Bon)</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(bonData.total_pos_commission)}</p>
                    </div>
                  </div>

                  {/* Gedetailleerde commissie per product */}
                  {bonData.pos_sales && bonData.pos_sales.length > 0 && (
                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Commissie per Product:</p>
                      <div className="space-y-1">
                        {bonData.pos_sales.filter(item => item.commission > 0).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.product}: {formatCurrency(item.total_bets)} × {item.comm_percentage}%
                            </span>
                            <span className="font-medium text-emerald-600">{formatCurrency(item.commission)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    📷 Scan een bon om de commissie berekening te zien
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={!formData.machine_id}>
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" />
              Dagrapport Details
            </DialogTitle>
          </DialogHeader>
          {selectedRapport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Machine</p>
                  <p className="font-medium">{getMachineName(selectedRapport.machine_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Werknemer</p>
                  <p className="font-medium">{getWerknemerName(selectedRapport.employee_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum</p>
                  <p className="font-medium">{new Date(selectedRapport.date).toLocaleDateString('nl-NL')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aangemaakt om</p>
                  <p className="font-medium">
                    {selectedRapport.created_at 
                      ? new Date(selectedRapport.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '-'}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Biljetten Telling</h4>
                
                {/* SRD */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">SRD Biljetten</p>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {SRD_DENOMINATIES.map(d => (
                      <div key={d} className="text-center p-1 bg-muted rounded">
                        <div className="font-medium">{d}</div>
                        <div>{selectedRapport.biljetten_srd?.[`b${d}`] || 0}x</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-right mt-1 font-medium">
                    Totaal: {formatCurrency(berekenBiljettenTotaal(selectedRapport.biljetten_srd, SRD_DENOMINATIES))}
                  </p>
                </div>

                {/* EUR */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">EUR Biljetten</p>
                  <div className="grid grid-cols-6 gap-1 text-xs">
                    {EUR_DENOMINATIES.map(d => (
                      <div key={d} className="text-center p-1 bg-muted rounded">
                        <div className="font-medium">€{d}</div>
                        <div>{selectedRapport.biljetten_eur?.[`b${d}`] || 0}x</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-right mt-1 font-medium">
                    Totaal: € {berekenBiljettenTotaal(selectedRapport.biljetten_eur, EUR_DENOMINATIES).toFixed(2)}
                  </p>
                </div>

                {/* USD */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">USD Biljetten</p>
                  <div className="grid grid-cols-6 gap-1 text-xs">
                    {USD_DENOMINATIES.map(d => (
                      <div key={d} className="text-center p-1 bg-muted rounded">
                        <div className="font-medium">${d}</div>
                        <div>{selectedRapport.biljetten_usd?.[`b${d}`] || 0}x</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-right mt-1 font-medium">
                    Totaal: $ {berekenBiljettenTotaal(selectedRapport.biljetten_usd, USD_DENOMINATIES).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedRapport.notes && (
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">Notities</p>
                  <p>{selectedRapport.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dagrapport Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit dagrapport wilt verwijderen? 
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

      {/* Payout Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-orange-500" />
              Betaal Suribet Uit
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
            {/* Summary */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Totaal uit te betalen:</p>
                  <p className="text-3xl font-bold text-orange-600">{formatCurrency(calculatePayoutTotal())}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{selectedForPayout.length} rapport(en)</p>
                  <p className="text-xs text-muted-foreground">geselecteerd</p>
                </div>
              </div>
            </div>

            {/* Selection buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={selectAllInModal}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Selecteer Alles
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllInModal}>
                Deselecteer Alles
              </Button>
            </div>
            
            {/* Scrollable list of unpaid reports grouped by date */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {getUnpaidReportsGroupedByDate().map((group) => {
                const isSelected = isDateFullySelected(group.date);
                const machineNames = group.reports.map(r => getMachineName(r.machine_id)).join(', ');
                
                return (
                  <div 
                    key={group.date}
                    onClick={() => toggleDateSelection(group.date)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30' 
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-lg">
                              {new Date(group.date).toLocaleDateString('nl-NL', { 
                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                            <Badge className="bg-purple-100 text-purple-700">
                              {group.reports.length} machine{group.reports.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <span className="font-bold text-xl text-orange-600 flex-shrink-0">
                            {formatCurrency(group.totalBalance)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                          <span className="truncate">{machineNames}</span>
                          <span className="flex-shrink-0">Commissie: {formatCurrency(group.totalCommission)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {getUnpaidReportsGroupedByDate().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Geen openstaande rapporten</p>
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div className="space-y-2 flex-shrink-0">
              <Label>Notities (optioneel)</Label>
              <Input
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Bijv. Opgehaald door Jan"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handlePayout} 
              disabled={processingPayout || selectedForPayout.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {processingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bevestig Uitbetaling
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={(open) => {
        if (!open) stopQrPolling();
        setShowQrModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              Scan met Telefoon
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            {qrSessionId && (
              <>
                <div className="p-4 bg-white rounded-xl shadow-lg">
                  <QRCodeSVG 
                    value={getQrUrl()} 
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Scan deze QR code met je telefoon om de bon te uploaden
                  </p>
                  
                  {qrPolling && (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Wachten op upload...</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg w-full">
                  <p className="text-xs text-center text-blue-700 dark:text-blue-300">
                    <strong>Tip:</strong> Open de camera app op je telefoon en richt op de QR code. 
                    De upload pagina opent automatisch.
                  </p>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                stopQrPolling();
                setShowQrModal(false);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commissie Opnemen Modal */}
      <Dialog open={showCommissieModal} onOpenChange={setShowCommissieModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              Commissie Opnemen
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Beschikbare commissie:</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(runningTotals.total_commission)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dit bedrag wordt naar uw kasboek geboekt
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Notities (optioneel)</Label>
              <Input
                value={commissieNotes}
                onChange={(e) => setCommissieNotes(e.target.value)}
                placeholder="Bijv. Commissie week 1"
              />
            </div>
            
            <div className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              <p className="font-medium text-amber-700 dark:text-amber-400">Let op:</p>
              <p className="text-amber-600 dark:text-amber-500">Na opname wordt dit bedrag als inkomst toegevoegd aan uw kasboek en worden de openstaande commissies gereset.</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommissieModal(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleCommissieOpnemen} 
              disabled={processingCommissie || runningTotals.total_commission <= 0}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {processingCommissie ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Opnemen naar Kasboek
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
