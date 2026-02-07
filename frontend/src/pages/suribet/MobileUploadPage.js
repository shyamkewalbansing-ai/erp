import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, Upload, CheckCircle2, Loader2, X, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function MobileUploadPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview tonen
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !token || !sessionId) {
      setError('Geen bestand of ongeldige sessie');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/suribet/mobile-upload?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setUploaded(true);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.detail || 'Upload mislukt');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Netwerkfout - probeer opnieuw');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setPreview(null);
    setUploaded(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!token || !sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Ongeldige Link</h1>
            <p className="text-muted-foreground">
              Deze QR code is verlopen of ongeldig. Scan opnieuw vanuit de applicatie.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-emerald-700 mb-2">Gelukt!</h1>
            <p className="text-muted-foreground mb-4">
              De bon is succesvol geüpload. Je kunt dit venster sluiten.
            </p>
            <p className="text-sm text-muted-foreground">
              De data wordt automatisch verwerkt in de applicatie.
            </p>
            <Button 
              onClick={resetUpload} 
              variant="outline" 
              className="mt-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Nog een bon uploaden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold">Suribet Bon Upload</h1>
            <p className="text-sm text-muted-foreground">
              Maak een foto van de bon of selecteer uit galerij
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="mb-4 relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full rounded-lg border-2 border-emerald-200"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={resetUpload}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Upload Buttons */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!preview ? (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Maak Foto
              </Button>
              <Button
                onClick={() => {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }}
                variant="outline"
                className="w-full h-12"
              >
                <Upload className="w-4 h-4 mr-2" />
                Kies uit Galerij
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploaden...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Bon
                </>
              )}
            </Button>
          )}

          {/* Session Info */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Sessie: {sessionId.slice(0, 8)}...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
