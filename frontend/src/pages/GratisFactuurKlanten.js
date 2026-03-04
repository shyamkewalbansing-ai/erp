import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Plus, Search, Edit, Trash2, Mail, Phone, MapPin,
  FileText, AlertCircle, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { DashboardLayout } from './GratisFactuurDashboard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('gratis_factuur_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export default function GratisFactuurKlanten() {
  const [klanten, setKlanten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingKlant, setEditingKlant] = useState(null);
  const [formData, setFormData] = useState({
    naam: '', email: '', telefoon: '', adres: '', postcode: '', plaats: '', land: '', notities: ''
  });
  
  useEffect(() => {
    loadKlanten();
  }, []);
  
  const loadKlanten = async () => {
    try {
      const response = await fetch(`${API_URL}/api/gratis-factuur/klanten`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setKlanten(data);
      }
    } catch (error) {
      console.error('Error loading klanten:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingKlant 
        ? `${API_URL}/api/gratis-factuur/klanten/${editingKlant.id}`
        : `${API_URL}/api/gratis-factuur/klanten`;
      
      const response = await fetch(url, {
        method: editingKlant ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Fout bij opslaan');
      
      toast.success(editingKlant ? 'Klant bijgewerkt' : 'Klant toegevoegd');
      setShowModal(false);
      setEditingKlant(null);
      setFormData({ naam: '', email: '', telefoon: '', adres: '', postcode: '', plaats: '', land: '', notities: '' });
      loadKlanten();
      
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handleEdit = (klant) => {
    setEditingKlant(klant);
    setFormData({
      naam: klant.naam || '',
      email: klant.email || '',
      telefoon: klant.telefoon || '',
      adres: klant.adres || '',
      postcode: klant.postcode || '',
      plaats: klant.plaats || '',
      land: klant.land || '',
      notities: klant.notities || ''
    });
    setShowModal(true);
  };
  
  const handleDelete = async (klantId) => {
    if (!window.confirm('Weet u zeker dat u deze klant wilt verwijderen?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/gratis-factuur/klanten/${klantId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Fout bij verwijderen');
      
      toast.success('Klant verwijderd');
      loadKlanten();
      
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const filteredKlanten = klanten.filter(k => 
    k.naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const formatCurrency = (amount) => `SRD ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
  
  if (loading) {
    return (
      <DashboardLayout activeTab="klanten">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout activeTab="klanten">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Klanten</h1>
            <p className="text-slate-500">{klanten.length} klanten</p>
          </div>
          <Button 
            onClick={() => { setEditingKlant(null); setFormData({ naam: '', email: '', telefoon: '', adres: '', postcode: '', plaats: '', land: '', notities: '' }); setShowModal(true); }}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Klant
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Zoek op naam of email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Klanten Grid */}
        {filteredKlanten.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Geen klanten gevonden</h3>
            <p className="text-slate-500 mb-4">Voeg uw eerste klant toe om te beginnen</p>
            <Button onClick={() => setShowModal(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Klant Toevoegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKlanten.map((klant) => (
              <div key={klant.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-bold text-teal-600">
                        {klant.naam?.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{klant.naam}</h3>
                      {klant.plaats && (
                        <p className="text-sm text-slate-500">{klant.plaats}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(klant)}
                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(klant.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  {klant.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{klant.email}</span>
                    </div>
                  )}
                  {klant.telefoon && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{klant.telefoon}</span>
                    </div>
                  )}
                </div>
                
                {/* Stats */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Facturen</p>
                    <p className="font-semibold text-slate-900">{klant.aantal_facturen || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Openstaand</p>
                    <p className={`font-semibold ${klant.openstaand > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(klant.openstaand || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingKlant ? 'Klant Bewerken' : 'Nieuwe Klant'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam *</label>
                <Input
                  value={formData.naam}
                  onChange={(e) => setFormData({...formData, naam: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefoon</label>
                  <Input
                    value={formData.telefoon}
                    onChange={(e) => setFormData({...formData, telefoon: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                <Input
                  value={formData.adres}
                  onChange={(e) => setFormData({...formData, adres: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
                  <Input
                    value={formData.postcode}
                    onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plaats</label>
                  <Input
                    value={formData.plaats}
                    onChange={(e) => setFormData({...formData, plaats: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notities</label>
                <textarea
                  value={formData.notities}
                  onChange={(e) => setFormData({...formData, notities: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Annuleren
                </Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {editingKlant ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
