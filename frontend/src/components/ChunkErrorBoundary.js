import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Error Boundary for chunk loading errors
 * Shows friendly message when offline
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
      return { hasError: true };
    }
    throw error;
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm text-center">
            <WifiOff className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Pagina niet beschikbaar</h1>
            <p className="text-gray-600 text-sm mb-4">
              Deze pagina is niet offline beschikbaar. Alleen de Boekhouding module werkt offline.
            </p>
            <Button onClick={this.handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Opnieuw proberen
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChunkErrorBoundary;
