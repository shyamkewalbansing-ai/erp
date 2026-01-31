import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Loader2, Puzzle, RefreshCw } from 'lucide-react';
import api, { getPublicAddons, formatCurrency } from '../lib/api';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';

export default function ModulesPage() {
  const navigate = useNavigate();
  const [addons, setAddons] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedAddons, setSelectedAddons] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [addonsRes, settingsRes] = await Promise.all([
        getPublicAddons(),
        api.get('/public/landing/settings').catch(() => ({ data: {} }))
      ]);
      
      setAddons(addonsRes.data || []);
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    return selectedAddons.reduce((sum, id) => {
      const addon = addons.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
  };

  const handleOrder = () => {
    const params = new URLSearchParams();
    params.set('addons', selectedAddons.join(','));
    navigate(`/register?${params.toString()}`);
  };

  const resetSelection = () => {
    setSelectedAddons([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <PublicNav logoUrl={settings?.logo_url} companyName={settings?.company_name} />

      {/* Main Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Onze Modules</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Kies de modules die passen bij uw bedrijfsvoering. Betaal alleen voor wat u nodig heeft.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Modules Grid */}
            <div className="lg:col-span-2">
              {/* Base Package Card */}
              <Card className="mb-6 border-2 border-primary">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                          <span className="text-white font-bold text-xl">→</span>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Basispakket</h2>
                        <p className="text-gray-500">
                          {selectedAddons.length > 0 
                            ? `${selectedAddons.length} module${selectedAddons.length > 1 ? 's' : ''} geselecteerd`
                            : `+${addons.length} Premium Add-on`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
                      <p className="text-gray-500">/Maand</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Addon Cards Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addons.map((addon) => (
                  <Card 
                    key={addon.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedAddons.includes(addon.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => toggleAddon(addon.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          {addon.icon_url ? (
                            <img src={addon.icon_url} alt={addon.name} className="w-8 h-8" />
                          ) : (
                            <Puzzle className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <Checkbox 
                          checked={selectedAddons.includes(addon.id)}
                          onCheckedChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {addon.category || 'STATISTIEKEN'}
                      </Badge>
                      
                      <h3 className="font-bold text-lg mb-2">{addon.name}</h3>
                      
                      {addon.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{addon.description}</p>
                      )}
                      
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(addon.price)}
                        <span className="text-sm font-normal text-gray-500">/Maand</span>
                      </p>
                      
                      <Button 
                        variant="default" 
                        className="w-full mt-4 bg-gray-900 hover:bg-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAddon(addon.id);
                        }}
                      >
                        {selectedAddons.includes(addon.id) ? 'Geselecteerd' : 'Details weergeven'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Order Summary Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="border-2">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-6">Uw Selectie</h3>
                    
                    {/* Selected Modules */}
                    <div className="space-y-3 mb-6">
                      {selectedAddons.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Geen modules geselecteerd</p>
                      ) : (
                        selectedAddons.map(id => {
                          const addon = addons.find(a => a.id === id);
                          return addon ? (
                            <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                  <Puzzle className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-medium">{addon.name}</span>
                              </div>
                              <span className="text-primary font-semibold">{formatCurrency(addon.price)}</span>
                            </div>
                          ) : null;
                        })
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t pt-4 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold">Totaal per maand:</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
                      </div>
                      
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 h-12 text-lg"
                        onClick={handleOrder}
                        disabled={selectedAddons.length === 0}
                      >
                        Koop nu
                      </Button>
                    </div>

                    {/* Reset Button */}
                    {selectedAddons.length > 0 && (
                      <button 
                        className="flex items-center justify-center gap-2 w-full text-gray-500 hover:text-gray-700 mt-4"
                        onClick={resetSelection}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Selectie wissen
                      </button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>© {new Date().getFullYear()} {settings?.company_name || "Facturatie N.V."}. Alle rechten voorbehouden.</p>
        </div>
      </footer>
    </div>
  );
}
