import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
import { UserCog, Plus, Edit, Phone, Mail, Award, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const roles = [
  { value: 'therapist', label: 'Therapeut' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Eigenaar' },
];

const specializations = ['Massage', 'Facial', 'Manicure', 'Pedicure', 'Waxing', 'Haar', 'Lichaam'];

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  const [form, setForm] = useState({
    name: '', phone: '', email: '', role: 'therapist',
    specializations: [], commission_percentage: 0, salary_srd: 0, certifications: []
  });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_URL}/beautyspa/staff`, { headers: { Authorization: `Bearer ${token}` } });
      setStaff(res.data);
    } catch (error) { toast.error('Fout bij laden'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedStaff) {
        await axios.put(`${API_URL}/beautyspa/staff/${selectedStaff.id}`, form, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Medewerker bijgewerkt');
      } else {
        await axios.post(`${API_URL}/beautyspa/staff`, form, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Medewerker toegevoegd');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error) { toast.error(error.response?.data?.detail || 'Fout'); }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', role: 'therapist', specializations: [], commission_percentage: 0, salary_srd: 0, certifications: [] });
    setSelectedStaff(null);
  };

  const handleEdit = (s) => {
    setSelectedStaff(s);
    setForm({ ...s, certifications: s.certifications || [] });
    setIsDialogOpen(true);
  };

  const toggleSpecialization = (spec) => {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec) 
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec]
    }));
  };

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-staff-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personeelsbeheer</h1>
          <p className="text-slate-600">Beheer medewerkers en roosters</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Medewerker
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedStaff ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Rol *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Specialisaties</Label>
                <div className="flex flex-wrap gap-2">
                  {specializations.map(spec => (
                    <Badge key={spec} variant={form.specializations.includes(spec) ? 'default' : 'outline'}
                      className={`cursor-pointer ${form.specializations.includes(spec) ? 'bg-pink-500' : ''}`}
                      onClick={() => toggleSpecialization(spec)}>
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commissie %</Label>
                  <Input type="number" value={form.commission_percentage} onChange={(e) => setForm({...form, commission_percentage: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Salaris (SRD)</Label>
                  <Input type="number" value={form.salary_srd} onChange={(e) => setForm({...form, salary_srd: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuleren</Button>
                <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                  {selectedStaff ? 'Bijwerken' : 'Toevoegen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-40 bg-slate-100"></CardContent></Card>)}
        </div>
      ) : staff.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <UserCog className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Geen medewerkers</h3>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-pink-500 to-purple-600">
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Medewerker
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <Card key={s.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      <Badge variant="outline" className="capitalize">{roles.find(r => r.value === s.role)?.label || s.role}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Edit className="w-4 h-4" /></Button>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {s.phone}</p>
                  {s.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {s.email}</p>}
                </div>

                {s.specializations?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.specializations.map(spec => (
                      <Badge key={spec} variant="outline" className="text-xs bg-pink-50 text-pink-700">{spec}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Behandelingen</p>
                    <p className="font-bold text-pink-600">{s.total_treatments || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Commissie</p>
                    <p className="font-bold text-purple-600">{s.commission_percentage || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Verdiend</p>
                    <p className="font-bold text-emerald-600">SRD {(s.total_commission || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
