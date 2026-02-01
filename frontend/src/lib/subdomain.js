/**
 * Subdomain Configuration Helper
 * 
 * This module handles routing between:
 * - Main domain (facturatie.sr) - Public landing pages
 * - App subdomain (app.facturatie.sr) - Authenticated application
 * - Tenant subdomains (*.facturatie.sr) - Customer workspaces
 */

// Get the base domain from environment or detect it
const getBaseDomain = () => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  
  // Preview/staging environment
  if (hostname.includes('.preview.emergentagent.com')) {
    return hostname;
  }
  
  // Production - extract base domain
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    // Handle cases like app.facturatie.sr or tenant.facturatie.sr
    return parts.slice(-2).join('.');
  }
  
  return hostname;
};

// Check if we're on the app subdomain
export const isAppSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Local development - check for app. prefix or port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // In development, we use path-based routing, not subdomain
    // Check if URL starts with /app
    return window.location.pathname.startsWith('/app');
  }
  
  // Preview environment - always treat as combined (path-based)
  if (hostname.includes('.preview.emergentagent.com')) {
    return window.location.pathname.startsWith('/app');
  }
  
  // Production - check for app. subdomain
  return hostname.startsWith('app.');
};

// Check if we're on the main/landing domain
export const isMainDomain = () => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return !window.location.pathname.startsWith('/app');
  }
  
  // Preview environment
  if (hostname.includes('.preview.emergentagent.com')) {
    return !window.location.pathname.startsWith('/app');
  }
  
  // Production - main domain has no subdomain prefix
  const parts = hostname.split('.');
  return parts.length === 2; // e.g., facturatie.sr
};

// Check if we're on a tenant subdomain
export const isTenantSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Not applicable in development/preview
  if (hostname === 'localhost' || hostname.includes('.preview.emergentagent.com')) {
    return false;
  }
  
  // Check if subdomain exists and is not 'app' or 'www'
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    return subdomain !== 'app' && subdomain !== 'www';
  }
  
  return false;
};

// Get tenant subdomain name
export const getTenantSubdomain = () => {
  if (!isTenantSubdomain()) return null;
  
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts[0];
};

// Get URLs for different parts of the application
export const getUrls = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const baseDomain = getBaseDomain();
  
  // Local development / Preview - use path-based routing
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.preview.emergentagent.com')) {
    const baseUrl = `${protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}`;
    return {
      landing: baseUrl,
      app: `${baseUrl}/app`,
      login: `${baseUrl}/login`,
      register: `${baseUrl}/register`,
      isSubdomainMode: false
    };
  }
  
  // Production - use subdomain-based routing
  return {
    landing: `${protocol}//${baseDomain}`,
    app: `${protocol}//app.${baseDomain}`,
    login: `${protocol}//app.${baseDomain}/login`,
    register: `${protocol}//app.${baseDomain}/register`,
    isSubdomainMode: true
  };
};

// Redirect to appropriate domain
export const redirectToApp = () => {
  const urls = getUrls();
  if (urls.isSubdomainMode) {
    window.location.href = urls.app;
  } else {
    window.location.href = '/app';
  }
};

export const redirectToLanding = () => {
  const urls = getUrls();
  if (urls.isSubdomainMode) {
    window.location.href = urls.landing;
  } else {
    window.location.href = '/';
  }
};

export const redirectToLogin = () => {
  const urls = getUrls();
  if (urls.isSubdomainMode) {
    window.location.href = urls.login;
  } else {
    window.location.href = '/login';
  }
};

// Cookie domain for cross-subdomain auth
export const getCookieDomain = () => {
  const hostname = window.location.hostname;
  
  // Local development - no domain restriction
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }
  
  // Preview - no domain restriction
  if (hostname.includes('.preview.emergentagent.com')) {
    return undefined;
  }
  
  // Production - set cookie for all subdomains
  const baseDomain = getBaseDomain();
  return `.${baseDomain}`;
};

export default {
  isAppSubdomain,
  isMainDomain,
  isTenantSubdomain,
  getTenantSubdomain,
  getUrls,
  redirectToApp,
  redirectToLanding,
  redirectToLogin,
  getCookieDomain
};
