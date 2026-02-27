import React, { useState, useEffect, useRef } from 'react';
import { documentsAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, File, Image, Trash2, Download, Loader2, FolderOpen, Search, Filter, Eye } from 'lucide-react';

const DocumentenPage = () => {
  const [documenten, setDocumenten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const fileInputRef = useRef(null);

  const [uploadData, setUploadData] = useState({
    naam: '',
    type: 'factuur',
    gekoppeld_aan_type: '',
    gekoppeld_aan_id: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await documentsAPI.getAll();
      setDocumenten(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fout bij laden documenten');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadData({...uploadData, naam: file.name});
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecteer een bestand');
      return;
    }
    if (!uploadData.naam) {
      toast.error('Vul een naam in');
      return;
    }
    setUploading(true);
    try {
      await documentsAPI.upload(selectedFile, {
        naam: uploadData.naam,
        type: uploadData.type,
        gekoppeld_aan_type: uploadData.gekoppeld_aan_type || null,
        gekoppeld_aan_id: uploadData.gekoppeld_aan_id || null
      });
      toast.success('Document geüpload');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadData({ naam: '', type: 'factuur', gekoppeld_aan_type: '', gekoppeld_aan_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Weet u zeker dat u dit document wilt verwijderen?')) return;
    try {
      await documentsAPI.delete(documentId);
      toast.success('Document verwijderd');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Fout bij verwijderen');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'factuur': return <FileText className="w-4 h-4" />;
      case 'bon': return <File className="w-4 h-4" />;
      case 'contract': return <FileText className="w-4 h-4" />;
      case 'afbeelding': return <Image className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'factuur': return 'Factuur';
      case 'bon': return 'Bon/Kassabon';
      case 'contract': return 'Contract';
      case 'afbeelding': return 'Afbeelding';
      case 'overig': return 'Overig';
      default: return type;
    }
  };

  const filteredDocumenten = documenten.filter(doc => {
    const matchesSearch = doc.naam?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const documentStats = {
    totaal: documenten.length,
    facturen: documenten.filter(d => d.type === 'factuur').length,
    bonnen: documenten.filter(d => d.type === 'bon').length,
    contracten: documenten.filter(d => d.type === 'contract').length
  };

  return (
    <div className="space-y-6" data-testid="documenten-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Documentbeheer</h1>
          <p className="text-slate-500 mt-1">Upload en beheer documenten en bijlagen</p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button data-testid="upload-document-btn">
              <Upload className="w-4 h-4 mr-2" />
              Document Uploaden
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Document Uploaden</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 mx-auto text-green-500" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-slate-400" />
                    <p className="text-slate-500">Klik om een bestand te selecteren</p>
                    <p className="text-sm text-slate-400">PDF, JPG, PNG, DOC, XLS (max 10MB)</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Documentnaam *</Label>
                <Input 
                  value={uploadData.naam}
                  onChange={(e) => setUploadData({...uploadData, naam: e.target.value})}
                  placeholder="Naam van het document"
                />
              </div>

              <div className="space-y-2">
                <Label>Type Document</Label>
                <Select value={uploadData.type} onValueChange={(v) => setUploadData({...uploadData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factuur">Factuur</SelectItem>
                    <SelectItem value="bon">Bon/Kassabon</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="afbeelding">Afbeelding</SelectItem>
                    <SelectItem value="overig">Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Koppelen aan (optioneel)</Label>
                  <Select value={uploadData.gekoppeld_aan_type} onValueChange={(v) => setUploadData({...uploadData, gekoppeld_aan_type: v})}>
                    <SelectTrigger><SelectValue placeholder="Type selecteren" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Geen koppeling</SelectItem>
                      <SelectItem value="verkoopfactuur">Verkoopfactuur</SelectItem>
                      <SelectItem value="inkoopfactuur">Inkoopfactuur</SelectItem>
                      <SelectItem value="debiteur">Debiteur</SelectItem>
                      <SelectItem value="crediteur">Crediteur</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID (optioneel)</Label>
                  <Input 
                    value={uploadData.gekoppeld_aan_id}
                    onChange={(e) => setUploadData({...uploadData, gekoppeld_aan_id: e.target.value})}
                    placeholder="Document/factuur ID"
                  />
                </div>
              </div>

              <Button onClick={handleUpload} className="w-full" disabled={uploading || !selectedFile}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Uploaden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Documenten</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{documentStats.totaal}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Facturen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{documentStats.facturen}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Bonnen</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{documentStats.bonnen}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <File className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Contracten</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{documentStats.contracten}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Zoeken op documentnaam..."
                className="pl-10"
              />
            </div>
            <div className="w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  <SelectItem value="factuur">Facturen</SelectItem>
                  <SelectItem value="bon">Bonnen</SelectItem>
                  <SelectItem value="contract">Contracten</SelectItem>
                  <SelectItem value="afbeelding">Afbeeldingen</SelectItem>
                  <SelectItem value="overig">Overig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Documenten</CardTitle>
          <CardDescription>Overzicht van alle geüploade documenten</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Laden...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead className="w-28">Gekoppeld aan</TableHead>
                  <TableHead className="w-28">Upload datum</TableHead>
                  <TableHead className="w-24">Grootte</TableHead>
                  <TableHead className="w-24">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocumenten.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>{getTypeIcon(doc.type)}</TableCell>
                    <TableCell className="font-medium">{doc.naam}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(doc.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {doc.gekoppeld_aan_type ? `${doc.gekoppeld_aan_type}` : '-'}
                    </TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell className="text-slate-500">{doc.grootte ? `${(doc.grootte / 1024).toFixed(1)} KB` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="Bekijken">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Downloaden">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} title="Verwijderen">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocumenten.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      {searchTerm || filterType !== 'all' ? 'Geen documenten gevonden met deze filters' : 'Geen documenten geüpload. Upload uw eerste document.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentenPage;
