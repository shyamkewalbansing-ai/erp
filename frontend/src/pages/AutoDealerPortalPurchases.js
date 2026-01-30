import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { 
  Car, 
  ArrowLeft,
  Search,
  Calendar,
  ChevronRight,
  Loader2,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function AutoDealerPortalPurchases() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('autodealer_customer_token');
    if (!token) {
      navigate('/klant-portaal/login');
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  }, [navigate]);

  const fetchPurchases = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    
    try {
      const response = await axios.get(`${API_URL}/autodealer-portal/purchases`, { headers });
      setPurchases(response.data.purchases || []);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('autodealer_customer_token');
        navigate('/klant-portaal/login');
      } else {
        toast.error('Fout bij laden van aankopen');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, navigate]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const formatCurrency = (amount, currency = 'SRD') => {
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'SRD';
    return `${symbol} ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.vehicle?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vehicle?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || purchase.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" data-testid="purchases-page">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/klant-portaal')}
                className="text-slate-300 hover:text-white"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug
              </Button>
            </div>
            <h1 className="text-lg font-semibold text-white">Mijn Aankopen</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Zoeken op merk, model of kenteken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              data-testid="search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-white text-sm"
              data-testid="status-filter"
            >
              <option value="all">Alle statussen</option>
              <option value="completed">Voltooid</option>
              <option value="pending">In afwachting</option>
              <option value="cancelled">Geannuleerd</option>
            </select>
          </div>
        </div>

        {/* Purchases List */}
        {filteredPurchases.length > 0 ? (
          <div className="space-y-4">
            {filteredPurchases.map((purchase) => (
              <Link 
                key={purchase.id} 
                to={`/klant-portaal/aankopen/${purchase.id}`}
                data-testid={`purchase-${purchase.id}`}
              >
                <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-emerald-500/50 transition-colors">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Vehicle Image */}
                      <div className="md:w-48 h-40 md:h-auto bg-slate-700/50 flex-shrink-0">
                        {purchase.vehicle?.image_url ? (
                          <img 
                            src={purchase.vehicle.image_url} 
                            alt={`${purchase.vehicle.brand} ${purchase.vehicle.model}`}
                            className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="w-16 h-16 text-slate-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white">
                              {purchase.vehicle?.brand} {purchase.vehicle?.model}
                            </h3>
                            <p className="text-slate-400 mt-1">
                              {purchase.vehicle?.year} • {purchase.vehicle?.license_plate || 'Geen kenteken'}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-4">
                              <span className="text-sm text-slate-400 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(purchase.sale_date)}
                              </span>
                              {purchase.vehicle?.mileage && (
                                <span className="text-sm text-slate-400">
                                  {purchase.vehicle.mileage.toLocaleString()} km
                                </span>
                              )}
                              {purchase.vehicle?.fuel_type && (
                                <span className="text-sm text-slate-400">
                                  {purchase.vehicle.fuel_type}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-left md:text-right">
                            <span className={`inline-block text-xs px-3 py-1 rounded-full mb-2 ${
                              purchase.status === 'completed' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : purchase.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {purchase.status === 'completed' ? 'Voltooid' : 
                               purchase.status === 'pending' ? 'In afwachting' : 'Geannuleerd'}
                            </span>
                            <p className="text-2xl font-bold text-white">
                              {formatCurrency(
                                purchase.total_price?.amount || 0, 
                                purchase.total_price?.currency || 'SRD'
                              )}
                            </p>
                            <div className="flex items-center justify-end mt-2 text-emerald-400">
                              <span className="text-sm">Details bekijken</span>
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
            <CardContent className="py-16 text-center">
              <Car className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm || filterStatus !== 'all' ? 'Geen resultaten' : 'Nog geen aankopen'}
              </h3>
              <p className="text-slate-400">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Probeer andere zoektermen of filters' 
                  : 'Uw voertuigaankopen worden hier weergegeven'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {purchases.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-slate-400">
              {filteredPurchases.length} van {purchases.length} aankopen weergegeven
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
