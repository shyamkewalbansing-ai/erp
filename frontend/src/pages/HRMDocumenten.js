import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { FileText, Upload, Calendar, User, Loader2, Trash2, AlertTriangle, File } from 'lucide-react';
import api from '../lib/api';

export default function HRMDocumenten() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('all');
  
  const [formData, setFormData] = useState({
    employee_id: '', name: '', document_type: 'other', file_url: '', notes: '', expiry_date: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [documentsRes, employeesRes] = await Promise.all([
        api.get('/hrm/documents'),
        api.get('/hrm/employees')
      ]);
      setDocuments(documentsRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) { toast.error('Naam is verplicht'); return; }
    setSaving(true);
    try {
      await api.post('/hrm/documents', formData);
      toast.success('Document toegevoegd');
      setShowModal(false);
      setFormData({ employee_id: '', name: '', document_type: 'other', file_url: '', notes: '', expiry_date: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit document wilt verwijderen?')) return;
    try {
      await api.delete(`/hrm/documents/${id}`);
      toast.success('Document verwijderd');
      loadData();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const getDocTypeBadge = (type) => {
    const styles = {
      contract: 'bg-blue-100 text-blue-700',
      id: 'bg-purple-100 text-purple-700',
      certificate: 'bg-green-100 text-green-700',
      other: 'bg-gray-100 text-gray-700'
    };
    const labels = { contract: 'Contract', id: 'ID/Paspoort', certificate: 'Certificaat', other: 'Anders' };
    return <Badge className={styles[type]}>{labels[type] || type}</Badge>;
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate <= thirtyDaysFromNow;
  };

  const filteredDocuments = filterEmployee === 'all' 
    ? documents 
    : documents.filter(d => d.employee_id === filterEmployee);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const expiringDocs = documents.filter(d => isExpiringSoon(d.expiry_date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documenten</h1>
          <p className="text-muted-foreground mt-1">Beheer documenten van uw werknemers</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Upload className="w-4 h-4 mr-2" />Document Toevoegen
        </Button>
      </div>

      {/* Expiring Warning */}
      {expiringDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">{expiringDocs.length} document(en) verlopen binnenkort</p>
              <p className="text-sm text-orange-600">Controleer de vervaldatums en update indien nodig</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold">{documents.length}</p>
          <p className="text-sm text-muted-foreground">Totaal Documenten</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-blue-600">{documents.filter(d => d.document_type === 'contract').length}</p>
          <p className="text-sm text-muted-foreground">Contracten</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-purple-600">{documents.filter(d => d.document_type === 'id').length}</p>
          <p className="text-sm text-muted-foreground">ID Documenten</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-2xl font-bold text-orange-600">{expiringDocs.length}</p>
          <p className="text-sm text-muted-foreground">Binnenkort Verlopend</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter op werknemer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Werknemers</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Geen documenten</h3>
            <p className="text-muted-foreground mb-4">Upload uw eerste document</p>
            <Button onClick={() => setShowModal(true)}><Upload className="w-4 h-4 mr-2" />Document Toevoegen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${isExpiringSoon(doc.expiry_date) ? 'ring-2 ring-orange-300' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <File className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{doc.name}</h3>
                      {doc.employee_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />{doc.employee_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {getDocTypeBadge(doc.document_type)}
                      </div>
                      {doc.expiry_date && (
                        <p className={`text-xs mt-2 flex items-center gap-1 ${isExpiringSoon(doc.expiry_date) ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                          <Calendar className="w-3 h-3" />
                          Verloopt: {new Date(doc.expiry_date).toLocaleDateString('nl-NL')}
                          {isExpiringSoon(doc.expiry_date) && <AlertTriangle className="w-3 h-3 ml-1" />}
                        </p>
                      )}
                      {doc.notes && <p className="text-xs text-muted-foreground mt-1 italic">&quot;{doc.notes}&quot;</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Document Toevoegen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Werknemer</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer (optioneel)" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Document Naam *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Bijv. Arbeidscontract 2024" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="id">ID/Paspoort</SelectItem>
                    <SelectItem value="certificate">Certificaat</SelectItem>
                    <SelectItem value="other">Anders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vervaldatum</Label><Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} /></div>
            </div>
            <div><Label>Notities</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Optionele opmerkingen..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
