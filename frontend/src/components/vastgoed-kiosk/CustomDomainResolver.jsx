import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

/**
 * Detects if the current hostname is a custom domain registered by a kiosk company.
 * If so, redirects to the appropriate kiosk page (kiosk or login).
 */
export default function CustomDomainResolver() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Known app domains — skip custom domain check
    const knownDomains = [
      'facturatie.sr', 'www.facturatie.sr', 'app.facturatie.sr',
      'localhost', '127.0.0.1'
    ];
    
    // Also skip preview environments
    if (knownDomains.includes(hostname) || hostname.includes('.preview.emergentagent.com')) {
      setChecking(false);
      return;
    }
    
    // Also skip *.facturatie.sr subdomains (they have their own routing)
    if (hostname.endsWith('.facturatie.sr')) {
      setChecking(false);
      return;
    }

    // Unknown domain — check if it's a custom kiosk domain
    const lookupDomain = async () => {
      try {
        const res = await axios.get(`${API}/admin/domain/lookup?host=${encodeURIComponent(hostname)}`);
        const { company_id, custom_domain_landing } = res.data;
        
        if (custom_domain_landing === 'login') {
          // Redirect to admin/login page with company context
          navigate(`/vastgoed/admin`, { replace: true });
        } else {
          // Default: redirect to kiosk page
          navigate(`/vastgoed/${company_id}`, { replace: true });
        }
      } catch (err) {
        // Domain not found in database — show error or fallback
        if (err.response?.status === 404) {
          setError('Dit domein is niet gekoppeld aan een kiosk account.');
        } else {
          setError('Kan verbinding niet maken met de server.');
        }
        setChecking(false);
      }
    };
    
    lookupDomain();
  }, [navigate]);

  if (checking && !error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Domein niet gevonden</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <p className="text-xs text-slate-400">
            Domein: <strong>{window.location.hostname}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Not a custom domain — render nothing, let normal routing handle it
  return null;
}
