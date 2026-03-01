import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import SchuldbeheerLayout from './SchuldbeheerLayout';
import { FileArchive, Upload, Trash2, Download, X, AlertCircle, FileText, Image, File } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const getFileIcon = (mimeType) => {
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentenPage() {
  const { token } = useAuth();
  const [documenten, setDocumenten] = useState([]);
  const [schulden, setSchulden] = useState([]);
  const [relaties, setRelaties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    gekoppeld_type: 'schuld', gekoppeld_id: '', omschrijving: '', file: null
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('gekoppeld_type', filterType);
      const [docRes, schuldenRes, relatiesRes] = await Promise.all([
        fetch(`${API_URL}/api/schuldbeheer/documenten?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/schuldbeheer/schulden`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/schuldbeheer/relaties`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (!docRes.ok) throw new Error('Fout bij ophalen');
      setDocumenten(await docRes.json());
      setSchulden(await schuldenRes.json());
      setRelaties(await relatiesRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file || !formData.gekoppeld_id) {
      alert('Selecteer een bestand en koppeling');
      return;
    }
    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', formData.file);
      uploadData.append('gekoppeld_type', formData.gekoppeld_type);
      uploadData.append('gekoppeld_id', formData.gekoppeld_id);
      if (formData.omschrijving) uploadData.append('omschrijving', formData.omschrijving);
      
      const response = await fetch(`${API_URL}/api/schuldbeheer/documenten`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Fout bij uploaden');
      }
      setShowModal(false);
      setFormData({ gekoppeld_type: 'schuld', gekoppeld_id: '', omschrijving: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await fetch(`${API_URL}/api/schuldbeheer/documenten/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Fout bij downloaden');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originele_naam;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit document wilt verwijderen?')) return;
    try {
      await fetch(`${API_URL}/api/schuldbeheer/documenten/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getKoppelingNaam = (doc) => {
    if (doc.gekoppeld_type === 'schuld') {
      const schuld = schulden.find(s => s.id === doc.gekoppeld_id);
      return schuld ? `${schuld.dossiernummer} - ${schuld.omschrijving}` : doc.gekoppeld_id;
    } else {
      const relatie = relaties.find(r => r.id === doc.gekoppeld_id);
      return relatie ? relatie.naam : doc.gekoppeld_id;
    }
  };

  const koppelingOptions = formData.gekoppeld_type === 'schuld' 
    ? schulden.map(s => ({ id: s.id, label: `${s.dossiernummer} - ${s.omschrijving}` }))
    : relaties.map(r => ({ id: r.id, label: r.naam }));

  return (
    <SchuldbeheerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documenten</h1>
            <p className="text-gray-500">Upload en beheer documenten gekoppeld aan schulden of schuldeisers</p>
          </div>
          <button onClick={() => { setFormData({ gekoppeld_type: 'schuld', gekoppeld_id: schulden[0]?.id || '', omschrijving: '', file: null }); setShowModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Document Uploaden
          </button>
        </div>

        <div className="flex gap-4">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Alle documenten</option>
            <option value="schuld">Schuld documenten</option>
            <option value="relatie">Schuldeiser documenten</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>
        ) : documenten.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><FileArchive className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Nog geen documenten geüpload</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documenten.map((doc) => {
              const FileIcon = getFileIcon(doc.mime_type);
              return (
                <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={doc.originele_naam}>{doc.originele_naam}</h3>
                      <p className="text-xs text-gray-500 mt-1">{formatFileSize(doc.bestandsgrootte)}</p>
                      <p className="text-xs text-gray-400 mt-1">{doc.upload_datum?.split('T')[0]}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">
                      <span className="font-medium capitalize">{doc.gekoppeld_type}:</span>
                    </p>
                    <p className="text-sm text-gray-700 truncate" title={getKoppelingNaam(doc)}>{getKoppelingNaam(doc)}</p>
                    {doc.omschrijving && <p className="text-xs text-gray-400 mt-1 truncate">{doc.omschrijving}</p>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleDownload(doc)} className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1">
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Document Uploaden</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUpload} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bestand *</label>
                  <input type="file" ref={fileInputRef} required onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">Max 10MB. PDF, afbeeldingen, Word, Excel toegestaan.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Koppelen aan *</label>
                  <select value={formData.gekoppeld_type} onChange={(e) => setFormData({...formData, gekoppeld_type: e.target.value, gekoppeld_id: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="schuld">Schuld (Dossier)</option>
                    <option value="relatie">Schuldeiser (Relatie)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{formData.gekoppeld_type === 'schuld' ? 'Schuld' : 'Schuldeiser'} *</label>
                  <select required value={formData.gekoppeld_id} onChange={(e) => setFormData({...formData, gekoppeld_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecteer...</option>
                    {koppelingOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                  <input type="text" value={formData.omschrijving} onChange={(e) => setFormData({...formData, omschrijving: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bijv. Betalingsovereenkomst" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuleren</button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {uploading ? 'Uploaden...' : 'Uploaden'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SchuldbeheerLayout>
  );
}
