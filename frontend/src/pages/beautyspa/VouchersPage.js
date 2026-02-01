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
import { Ticket, Plus, Trash2, Percent, DollarSign, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: 10,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10),
    max_uses: 1
  });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    try {
      const res = await axios.get(`${API_URL}/beautyspa/vouchers`, { headers: { Authorization: `Bearer ${token}` } });
      setVouchers(res.data);
    } catch (error) { toast.error('Fout bij laden'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/beautyspa/vouchers`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Voucher aangemaakt');
      setIsDialogOpen(false);
      setForm({
        code: '', discount_type: 'percentage', discount_value: 10,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10),
        max_uses: 1
      });
      fetchVouchers();
    } catch (error) { toast.error(error.response?.data?.detail || 'Fout'); }
  };

  const handleDelete = async (voucherId) => {
    if (!window.confirm('Voucher verwijderen?')) return;
    try {
      await axios.delete(`${API_URL}/beautyspa/vouchers/${voucherId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Voucher verwijderd');
      fetchVouchers();
    } catch (error) { toast.error('Fout'); }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SPA';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm(f => ({ ...f, code }));
  };

  const isExpired = (date) => new Date(date) < new Date();
  const isValid = (v) => !isExpired(v.valid_until) && v.uses_count < v.max_uses;

  return (
    <div className="max-w-5xl mx-auto" data-testid="beautyspa-vouchers-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vouchers & Cadeaubonnen</h1>
          <p className="text-slate-600">Beheer kortingscodes en vouchers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="w-4 h-4 mr-2" /> Nieuwe Voucher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuwe Voucher</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SPAKORTING" required className="uppercase" />
                  <Button type="button" variant="outline" onClick={generateCode}>Genereer</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({...form, discount_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Vast bedrag (SRD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Waarde</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({...form, discount_value: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geldig vanaf</Label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm({...form, valid_from: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Geldig tot</Label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm({...form, valid_until: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Max. Gebruik</Label>
                <Input type="number" value={form.max_uses} onChange={(e) => setForm({...form, max_uses: parseInt(e.target.value) || 1})} min="1" />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600">
                Voucher Aanmaken
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32 bg-slate-100"></CardContent></Card>)}
        </div>
      ) : vouchers.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Geen vouchers</h3>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600">
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Voucher
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vouchers.map((v) => (
            <Card key={v.id} className={`${isValid(v) ? '' : 'opacity-60'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-2xl text-slate-900 tracking-wider">{v.code}</h3>
                      {isValid(v) ? (
                        <Badge className="bg-green-100 text-green-700">Actief</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Verlopen</Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(v.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                    {v.discount_type === 'percentage' ? (
                      <><span className="text-2xl font-bold">{v.discount_value}</span><Percent className="w-4 h-4" /></>
                    ) : (
                      <><DollarSign className="w-4 h-4" /><span className="text-xl font-bold">{v.discount_value}</span></>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Korting</p>
                    <p className="font-semibold text-slate-900">
                      {v.discount_type === 'percentage' ? `${v.discount_value}% korting` : `SRD ${v.discount_value} korting`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{v.valid_from} t/m {v.valid_until}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gebruikt</span>
                    <span className="font-medium">{v.uses_count || 0} / {v.max_uses}</span>
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
