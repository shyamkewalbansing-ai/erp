import React from 'react';
import { WifiOff, RefreshCw, Download } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Error Boundary for handling chunk loading errors
 * Shows a friendly message when offline and chunks aren't cached
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a chunk loading error
    if (error.name === 'ChunkLoadError' || 
        error.message?.includes('Loading chunk') ||
        error.message?.includes('ChunkLoadError')) {
      return { hasError: true, error };
    }
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ChunkErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleDownloadOffline = async () => {
    // Redirect to trigger offline download
    localStorage.removeItem('offlinePreloadComplete');
    localStorage.removeItem('offlinePreloadDate');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isOffline = !navigator.onLine;
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <WifiOff className="w-8 h-8 text-amber-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {isOffline ? 'Pagina niet beschikbaar offline' : 'Pagina kon niet laden'}
            </h1>
            
            <p className="text-gray-600 mb-6">
              {isOffline 
                ? 'Deze pagina is nog niet gedownload voor offline gebruik. Maak verbinding met internet om de pagina te laden.'
                : 'Er is een fout opgetreden bij het laden van deze pagina. Probeer het opnieuw.'
              }
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Opnieuw proberen
              </Button>
              
              {!isOffline && (
                <Button 
                  onClick={this.handleDownloadOffline}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download voor offline
                </Button>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              Tip: Download alle pagina's via de knop rechtsonder om offline te werken.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
