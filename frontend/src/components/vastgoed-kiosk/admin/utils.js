import axios from 'axios';

export const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

/**
 * Geeft de basis-URL voor "open link in nieuw tab" acties (PDF, receipt).
 * - Op facturatie.sr of preview omgeving: gebruik REACT_APP_BACKEND_URL (facturatie.sr)
 * - Op een custom subdomein (bv. dadovastgoed.kewalbansing.net): gebruik huidig origin
 *   zodat de gebruiker op hetzelfde subdomein blijft — geen domein-wisseling.
 *
 * NB: Alle API-routes gaan via nginx door naar dezelfde backend, dus beide werken.
 */
export const getKioskOriginAPI = () => {
  if (typeof window === 'undefined') return API;
  const host = window.location.hostname;
  const isMain = ['facturatie.sr', 'www.facturatie.sr', 'app.facturatie.sr', 'localhost', '127.0.0.1'].includes(host)
    || host.includes('.preview.emergentagent.com')
    || host.endsWith('.facturatie.sr');
  return isMain ? API : `${window.location.origin}/api/kiosk`;
};

export const formatSRD = (amount) => {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
};

// Format any amount with a currency prefix. Falls back to SRD when not provided.
export const formatAmount = (amount, currency) => {
  const cur = (currency || 'SRD').toString().toUpperCase();
  return `${cur} ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
};

export const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
};

export { axios };
