import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, Plus, Search, Filter, Download, Mail, Trash2, Edit,
  CheckCircle, Clock, AlertTriangle, Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { DashboardLayout } from './GratisFactuurDashboard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('invoice_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export default function GratisFactuurFacturen() {
  const navigate = useNavigate();
  const [facturen, setFacturen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('alle');
  
  useEffect(() => {
    loadFacturen();
  }, []);
  
  const loadFacturen = async () => {
    try {
      const response = await fetch(`${API_URL}/api/invoice/facturen`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setFacturen(data);
      }
    } catch (error) {
      console.error('Error loading facturen:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (factuurId) => {
    if (!window.confirm('Weet u zeker dat u deze factuur wilt verwijderen?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/invoice/facturen/${factuurId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Fout bij verwijderen');
      
      toast.success('Factuur verwijderd');
      loadFacturen();
      
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handleSendEmail = async (factuurId) => {
    try {
      const response = await fetch(`${API_URL}/api/invoice/email/factuur`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ factuur_id: factuurId })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Fout bij versturen');
      
      toast.success(data.message);
      loadFacturen();
      
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handleSendReminder = async (factuurId) => {
    try {
      const response = await fetch(`${API_URL}/api/invoice/email/herinnering/${factuurId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Fout bij versturen');
      
      toast.success(data.message);
      
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const filteredFacturen = facturen.filter(f => {
    const matchesSearch = 
      f.nummer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.klant_naam?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'alle' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const formatCurrency = (amount, valuta = 'SRD') => {
    if (valuta === 'EUR') return `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
    if (valuta === 'USD') return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    return `SRD ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'betaald':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Betaald
          </span>
        );
      case 'deelbetaling':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Deelbetaling
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <AlertTriangle className="w-3 h-3" />
            Openstaand
          </span>
        );
    }
  };
  
  if (loading) {
    return (
      <DashboardLayout activeTab="facturen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout activeTab="facturen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Facturen</h1>
            <p className="text-slate-500">{facturen.length} facturen</p>
          </div>
          <Link to="/invoice/facturen/nieuw">
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Factuur
            </Button>
          </Link>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Zoek op nummer of klant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {['alle', 'openstaand', 'deelbetaling', 'betaald'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Facturen Table */}
        {filteredFacturen.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Geen facturen gevonden</h3>
            <p className="text-slate-500 mb-4">Maak uw eerste factuur aan</p>
            <Link to="/invoice/facturen/nieuw">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Factuur Maken
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Nummer</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Klant</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Datum</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Vervaldatum</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600">Bedrag</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacturen.map((factuur) => (
                  <tr key={factuur.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <Link 
                        to={`/invoice/facturen/${factuur.id}`}
                        className="font-medium text-teal-600 hover:text-teal-700"
                      >
                        {factuur.nummer}
                      </Link>
                      <p className="text-xs text-slate-500 capitalize">{factuur.document_type}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-slate-900">{factuur.klant_naam || '-'}</p>
                      {factuur.klant_email && (
                        <p className="text-xs text-slate-500">{factuur.klant_email}</p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">{factuur.datum}</td>
                    <td className="py-4 px-6 text-slate-600">{factuur.vervaldatum}</td>
                    <td className="py-4 px-6 text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(factuur.totaal, factuur.valuta)}
                      </p>
                      {factuur.betaald_bedrag > 0 && factuur.status !== 'betaald' && (
                        <p className="text-xs text-green-600">
                          Betaald: {formatCurrency(factuur.betaald_bedrag, factuur.valuta)}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(factuur.status)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/invoice/facturen/${factuur.id}`}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Bekijken"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/invoice/facturen/${factuur.id}/bewerken`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {factuur.status !== 'betaald' && (
                          <button
                            onClick={() => handleSendReminder(factuur.id)}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Herinnering versturen"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(factuur.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
