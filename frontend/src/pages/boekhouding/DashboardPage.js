import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, Calculator, Users, Building2, Wallet, AlertCircle, 
  ArrowUpRight, ArrowDownRight, TrendingUp, FileText, Receipt,
  Plus, BarChart3, CreditCard, BookOpen
} from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (amount, currency = 'SRD') => {
  return `${currency} ${amount?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
};

export default function BoekhoudingDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/boekhouding/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Kon dashboard niet laden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="content-card border-red-200 bg-red-50 dark:bg-red-950/30">
          <div className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <Button onClick={loadDashboard} variant="outline" size="sm">Opnieuw proberen</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="page-title-icon bg-emerald-500/10">
              <Calculator className="w-5 h-5 text-emerald-600" />
            </div>
            Boekhouding Dashboard
          </h1>
          <p className="page-subtitle">Financieel overzicht en administratie</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/app/boekhouding/verkoopfacturen')} 
            className="btn-primary-gradient"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Factuur
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-action-grid">
        <div className="quick-action-card" onClick={() => navigate('/app/boekhouding/verkoopfacturen')}>
          <div className="quick-action-icon">
            <FileText className="w-5 h-5" />
          </div>
          <span className="quick-action-label">Factuur Maken</span>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/app/boekhouding/debiteuren')}>
          <div className="quick-action-icon">
            <Users className="w-5 h-5" />
          </div>
          <span className="quick-action-label">Debiteuren</span>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/app/boekhouding/bankrekeningen')}>
          <div className="quick-action-icon">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="quick-action-label">Bank/Kas</span>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/app/boekhouding/rapportages')}>
          <div className="quick-action-icon">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="quick-action-label">Rapportages</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Debiteuren */}
        <div 
          className="stat-card stat-blue" 
          onClick={() => navigate('/app/boekhouding/debiteuren')}
        >
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Debiteuren</p>
              <p className="stat-card-value">{data?.debiteuren_count || 0}</p>
            </div>
            <div className="stat-card-icon">
              <Users />
            </div>
          </div>
        </div>

        {/* Crediteuren */}
        <div 
          className="stat-card stat-purple" 
          onClick={() => navigate('/app/boekhouding/crediteuren')}
        >
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Crediteuren</p>
              <p className="stat-card-value">{data?.crediteuren_count || 0}</p>
            </div>
            <div className="stat-card-icon">
              <Building2 />
            </div>
          </div>
        </div>

        {/* Vervallen Facturen */}
        <div className={`stat-card ${data?.vervallen_facturen > 0 ? 'stat-red' : 'stat-emerald'}`}>
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Vervallen Facturen</p>
              <p className="stat-card-value">{data?.vervallen_facturen || 0}</p>
            </div>
            <div className="stat-card-icon">
              <AlertCircle />
            </div>
          </div>
        </div>

        {/* Bank Saldo */}
        <div 
          className="stat-card stat-emerald" 
          onClick={() => navigate('/app/boekhouding/bankrekeningen')}
        >
          <div className="stat-card-content">
            <div className="stat-card-info">
              <p className="stat-card-label">Bank Saldi</p>
              <div className="space-y-0.5">
                {Object.entries(data?.bank_saldi || {}).map(([currency, amount]) => (
                  amount > 0 && (
                    <p key={currency} className={`text-sm font-semibold currency-value currency-${currency.toLowerCase()}`}>
                      {formatCurrency(amount, currency)}
                    </p>
                  )
                ))}
                {!Object.values(data?.bank_saldi || {}).some(v => v > 0) && (
                  <p className="text-sm text-muted-foreground">Geen saldo</p>
                )}
              </div>
            </div>
            <div className="stat-card-icon">
              <Wallet />
            </div>
          </div>
        </div>
      </div>

      {/* Openstaande Bedragen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Te Ontvangen */}
        <div className="content-card">
          <div className="content-card-header">
            <h3 className="content-card-title">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              Te Ontvangen (Debiteuren)
            </h3>
            <Badge className="badge-success">Vorderingen</Badge>
          </div>
          <div className="content-card-body">
            <div className="space-y-2">
              {Object.entries(data?.openstaande_debiteuren || {}).map(([currency, amount]) => (
                amount > 0 && (
                  <div key={currency} className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                    <span className="font-medium">{currency}</span>
                    <span className={`font-semibold currency-value currency-${currency.toLowerCase()}`}>
                      {formatCurrency(amount, currency)}
                    </span>
                  </div>
                )
              ))}
              {!Object.values(data?.openstaande_debiteuren || {}).some(v => v > 0) && (
                <div className="empty-state py-8">
                  <div className="empty-state-icon">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <p className="empty-state-description">Geen openstaande vorderingen</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Te Betalen */}
        <div className="content-card">
          <div className="content-card-header">
            <h3 className="content-card-title">
              <ArrowDownRight className="w-5 h-5 text-red-500" />
              Te Betalen (Crediteuren)
            </h3>
            <Badge className="badge-danger">Schulden</Badge>
          </div>
          <div className="content-card-body">
            <div className="space-y-2">
              {Object.entries(data?.openstaande_crediteuren || {}).map(([currency, amount]) => (
                amount > 0 && (
                  <div key={currency} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/30 rounded-xl">
                    <span className="font-medium">{currency}</span>
                    <span className={`font-semibold currency-value currency-${currency.toLowerCase()}`}>
                      {formatCurrency(amount, currency)}
                    </span>
                  </div>
                )
              ))}
              {!Object.values(data?.openstaande_crediteuren || {}).some(v => v > 0) && (
                <div className="empty-state py-8">
                  <div className="empty-state-icon">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <p className="empty-state-description">Geen openstaande schulden</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div className="content-card bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <div className="content-card-body">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">Hulp nodig?</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                Bekijk onze uitgebreide handleiding voor stap-voor-stap instructies over alle boekhoudkundige functies.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/app/boekhouding/handleiding')}
                className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/50"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Naar Handleiding
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
