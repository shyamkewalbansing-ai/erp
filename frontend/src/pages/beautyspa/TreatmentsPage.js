import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Scissors,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Sparkles,
  Leaf
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const categories = [
  { value: 'massage', label: 'Massage', icon: '💆' },
  { value: 'facial', label: 'Facial', icon: '✨' },
  { value: 'manicure', label: 'Manicure', icon: '💅' },
  { value: 'pedicure', label: 'Pedicure', icon: '🦶' },
  { value: 'waxing', label: 'Waxing', icon: '🌸' },
  { value: 'hair', label: 'Haar', icon: '💇' },
  { value: 'body', label: 'Lichaam', icon: '🧴' },
  { value: 'package', label: 'Pakket', icon: '🎁' },
];

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    duration_minutes: 60,
    price_srd: 0,
    required_staff: 1,
    is_surinamese_special: false,
    is_package: false
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTreatments();
  }, [categoryFilter]);

  const fetchTreatments = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      
      const res = await axios.get(`${API_URL}/beautyspa/treatments?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTreatments(res.data);
    } catch (error) {
      toast.error('Fout bij laden van behandelingen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedTreatment) {
        await axios.put(`${API_URL}/beautyspa/treatments/${selectedTreatment.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Behandeling bijgewerkt');
      } else {
        await axios.post(`${API_URL}/beautyspa/treatments`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Behandeling toegevoegd');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchTreatments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Er is een fout opgetreden');
    }
  };

  const handleEdit = (treatment) => {
    setSelectedTreatment(treatment);
    setForm({
      name: treatment.name || '',
      category: treatment.category || '',
      description: treatment.description || '',
      duration_minutes: treatment.duration_minutes || 60,
      price_srd: treatment.price_srd || 0,
      required_staff: treatment.required_staff || 1,
      is_surinamese_special: treatment.is_surinamese_special || false,
      is_package: treatment.is_package || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (treatmentId) => {
    if (!window.confirm('Weet u zeker dat u deze behandeling wilt deactiveren?')) return;
    
    try {
      await axios.delete(`${API_URL}/beautyspa/treatments/${treatmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Behandeling gedeactiveerd');
      fetchTreatments();
    } catch (error) {
      toast.error('Fout bij deactiveren');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      category: '',
      description: '',
      duration_minutes: 60,
      price_srd: 0,
      required_staff: 1,
      is_surinamese_special: false,
      is_package: false
    });
    setSelectedTreatment(null);
  };

  const getCategoryInfo = (cat) => categories.find(c => c.value === cat) || { label: cat, icon: '✨' };

  // Group treatments by category
  const groupedTreatments = treatments.reduce((acc, t) => {
    const cat = t.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-treatments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Behandelingen & Services</h1>
          <p className="text-slate-600">Beheer uw spa behandelingen en pakketten</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Behandeling
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedTreatment ? 'Behandeling Bewerken' : 'Nieuwe Behandeling'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Naam van de behandeling"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categorie *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duur (minuten) *</Label>
                  <Input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({...form, duration_minutes: parseInt(e.target.value) || 0})}
                    min="15"
                    step="15"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prijs (SRD) *</Label>
                  <Input
                    type="number"
                    value={form.price_srd}
                    onChange={(e) => setForm({...form, price_srd: parseFloat(e.target.value) || 0})}
                    min="0"
                    step="10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Benodigde Medewerkers</Label>
                  <Input
                    type="number"
                    value={form.required_staff}
                    onChange={(e) => setForm({...form, required_staff: parseInt(e.target.value) || 1})}
                    min="1"
                    max="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschrijving</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 border rounded-lg resize-none"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Beschrijving van de behandeling..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="surinamese"
                    checked={form.is_surinamese_special}
                    onChange={(e) => setForm({...form, is_surinamese_special: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="surinamese" className="cursor-pointer flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600" />
                    Surinaamse Specialiteit (kruiden, aloë, etc.)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="package"
                    checked={form.is_package}
                    onChange={(e) => setForm({...form, is_package: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="package" className="cursor-pointer flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Dit is een pakket/combinatie
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                  {selectedTreatment ? 'Bijwerken' : 'Toevoegen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('')}
              className={categoryFilter === '' ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}
            >
              Alles
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={categoryFilter === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat.value)}
                className={categoryFilter === cat.value ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}
              >
                {cat.icon} {cat.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Treatments List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : treatments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Scissors className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Geen behandelingen gevonden</h3>
            <p className="text-slate-500 mb-4">Voeg uw eerste behandeling toe</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-pink-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Behandeling
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTreatments).map(([category, items]) => {
            const catInfo = getCategoryInfo(category);
            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">{catInfo.icon}</span>
                  {catInfo.label}
                  <Badge variant="outline" className="ml-2">{items.length}</Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((treatment) => (
                    <Card key={treatment.id} className="hover:shadow-lg transition-shadow group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{treatment.name}</h3>
                              {treatment.is_surinamese_special && (
                                <Badge className="bg-green-100 text-green-700">
                                  <Leaf className="w-3 h-3 mr-1" />
                                  Surinaams
                                </Badge>
                              )}
                            </div>
                            {treatment.is_package && (
                              <Badge className="bg-purple-100 text-purple-700 mb-2">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Pakket
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(treatment)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDelete(treatment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {treatment.description && (
                          <p className="text-sm text-slate-500 mb-4 line-clamp-2">{treatment.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{treatment.duration_minutes} min</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-600 font-bold">
                            <DollarSign className="w-4 h-4" />
                            <span>SRD {treatment.price_srd?.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {treatment.times_booked > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-slate-400">
                              {treatment.times_booked}x geboekt
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
