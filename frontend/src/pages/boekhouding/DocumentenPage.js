import React, { useState, useEffect, useRef } from 'react';
import { documentsAPI } from '../../lib/boekhoudingApi';
import { formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Upload, FileText, Download, Trash2, Loader2, Search, 
  File, Image, FileSpreadsheet, FolderOpen, Link
} from 'lucide-react';

const DocumentenPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const [uploadData, setUploadData] = useState({
    entity_type: 'general',
    entity_id: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [filterType]);

  const fetchDocuments = async () => {
    try {
      const params = filterType !== 'all' ? { entity_type: filterType } : {};
      const response = await documentsAPI.getAll(params);
      setDocuments(response.data);
    } catch (error) {
      toast.error('Fout bij laden documenten');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecteer een bestand');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entity_type', uploadData.entity_type);
      if (uploadData.entity_id) {
        formData.append('entity_id', uploadData.entity_id);
      }
      if (uploadData.description) {
        formData.append('description', uploadData.description);
      }

      await documentsAPI.upload(formData);
      toast.success('Document geüpload');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadData({ entity_type: 'general', entity_id: '', description: '' });
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentsAPI.download(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Fout bij downloaden');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit document wilt verwijderen?')) return;
    try {
      await documentsAPI.delete(id);
      toast.success('Document verwijderd');
      fetchDocuments();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('image')) return <Image className="w-5 h-5 text-purple-500" />;
    if (fileType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    return <File className="w-5 h-5 text-blue-500" />;
  };

  const getEntityTypeBadge = (type) => {
    const labels = {
      invoice: 'Factuur',
      customer: 'Klant',
      supplier: 'Leverancier',
      project: 'Project',
      journal: 'Journaal',
      general: 'Algemeen'
    };
    const colors = {
      invoice: 'bg-blue-100 text-blue-700',
      customer: 'bg-green-100 text-green-700',
      supplier: 'bg-amber-100 text-amber-700',
      project: 'bg-purple-100 text-purple-700',
      journal: 'bg-slate-100 text-slate-700',
      general: 'bg-slate-100 text-slate-500'
    };
    return <Badge className={colors[type]}>{labels[type] || type}</Badge>;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter(doc =>
    (doc.original_filename || doc.bestandsnaam || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description || doc.omschrijving || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="documenten-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">Documentbeheer</h1>
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
              <div className="space-y-2">
                <Label>Bestand *</Label>
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-600">Klik om een bestand te selecteren</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC, XLS (max 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Koppelen aan</Label>
                <Select value={uploadData.entity_type} onValueChange={(v) => setUploadData({...uploadData, entity_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Algemeen</SelectItem>
                    <SelectItem value="invoice">Factuur</SelectItem>
                    <SelectItem value="customer">Klant</SelectItem>
                    <SelectItem value="supplier">Leverancier</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="journal">Journaalpost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {uploadData.entity_type !== 'general' && (
                <div className="space-y-2">
                  <Label>ID (optioneel)</Label>
                  <Input
                    value={uploadData.entity_id}
                    onChange={(e) => setUploadData({...uploadData, entity_id: e.target.value})}
                    placeholder="Entity ID"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Omschrijving</Label>
                <Input
                  value={uploadData.description}
                  onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                  placeholder="Korte beschrijving"
                />
              </div>

              <Button onClick={handleUpload} className="w-full" disabled={uploading || !selectedFile} data-testid="upload-submit-btn">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Uploaden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Documenten</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{documents.length}</p>
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
                <p className="text-sm text-slate-500">Totale Grootte</p>
                <p className="text-2xl font-bold font-mono text-slate-900">
                  {formatFileSize(documents.reduce((sum, d) => sum + d.file_size, 0))}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <File className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Documenten</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  <SelectItem value="invoice">Facturen</SelectItem>
                  <SelectItem value="customer">Klanten</SelectItem>
                  <SelectItem value="supplier">Leveranciers</SelectItem>
                  <SelectItem value="project">Projecten</SelectItem>
                  <SelectItem value="general">Algemeen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Laden...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Bestandsnaam</TableHead>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead className="w-24">Grootte</TableHead>
                  <TableHead className="w-28">Datum</TableHead>
                  <TableHead className="w-28">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map(doc => {
                  const filename = doc.original_filename || doc.bestandsnaam || 'Onbekend';
                  const fileType = doc.file_type || doc.bestandstype || 'other';
                  const fileSize = doc.file_size || doc.bestandsgrootte || 0;
                  const description = doc.description || doc.omschrijving || '';
                  const entityType = doc.entity_type || doc.entiteit_type || 'general';
                  
                  return (
                  <TableRow key={doc.id} data-testid={`document-row-${doc.id}`}>
                    <TableCell>{getFileIcon(fileType)}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{filename}</span>
                        {description && (
                          <p className="text-xs text-slate-500">{description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEntityTypeBadge(entityType)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatFileSize(fileSize)}</TableCell>
                    <TableCell className="text-slate-500">{formatDate(doc.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          title="Downloaden"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          title="Verwijderen"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      {searchTerm ? 'Geen documenten gevonden' : 'Geen documenten. Upload uw eerste document.'}
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
