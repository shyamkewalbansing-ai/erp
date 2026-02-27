/**
 * Boekhouding API Client
 * Complete API wrapper for the Boekhouding (Accounting) module
 * Uses the existing /api/boekhouding/* endpoints
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Generic fetch wrapper
const apiFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}/api/boekhouding${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  return response.json();
};

// ==================== INITIALIZATION ====================

export const initBoekhouding = () => apiFetch('/init/volledig', { method: 'POST' });

// ==================== DASHBOARD ====================

export const dashboardAPI = {
  getSummary: () => apiFetch('/dashboard'),
  getActielijst: () => apiFetch('/dashboard/actielijst'),
};

// ==================== WISSELKOERSEN ====================

export const exchangeRatesAPI = {
  getAll: () => apiFetch('/wisselkoersen'),
  getLatest: () => apiFetch('/wisselkoersen/latest'),
  create: (data) => apiFetch('/wisselkoersen', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== BTW CODES ====================

export const btwAPI = {
  getAll: () => apiFetch('/btw-codes'),
  create: (data) => apiFetch('/btw-codes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/btw-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/btw-codes/${id}`, { method: 'DELETE' }),
};

// ==================== GROOTBOEK (CHART OF ACCOUNTS) ====================

export const accountsAPI = {
  getAll: (type = null) => apiFetch(`/rekeningen${type ? `?type=${type}` : ''}`),
  create: (data) => apiFetch('/rekeningen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/rekeningen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/rekeningen/${id}`, { method: 'DELETE' }),
};

export const dagboekenAPI = {
  getAll: () => apiFetch('/dagboeken'),
  create: (data) => apiFetch('/dagboeken', { method: 'POST', body: JSON.stringify(data) }),
};

export const journalAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/journaalposten${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/journaalposten', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== DEBITEUREN (CUSTOMERS) ====================

export const customersAPI = {
  getAll: () => apiFetch('/debiteuren'),
  getOne: (id) => apiFetch(`/debiteuren/${id}`),
  create: (data) => apiFetch('/debiteuren', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/debiteuren/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/debiteuren/${id}`, { method: 'DELETE' }),
  getOpenstaand: (id) => apiFetch(`/debiteuren/${id}/openstaand`),
  getOuderdomAnalyse: () => apiFetch('/debiteuren/ouderdom/analyse'),
};

// ==================== CREDITEUREN (SUPPLIERS) ====================

export const suppliersAPI = {
  getAll: () => apiFetch('/crediteuren'),
  getOne: (id) => apiFetch(`/crediteuren/${id}`),
  create: (data) => apiFetch('/crediteuren', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/crediteuren/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/crediteuren/${id}`, { method: 'DELETE' }),
  getBetaaladvies: () => apiFetch('/crediteuren/betaaladvies'),
};

// ==================== VERKOOPFACTUREN (SALES INVOICES) ====================

export const salesInvoicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/verkoopfacturen${query ? `?${query}` : ''}`);
  },
  getOne: (id) => apiFetch(`/verkoopfacturen/${id}`),
  create: (data) => apiFetch('/verkoopfacturen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/verkoopfacturen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  verzenden: (id) => apiFetch(`/verkoopfacturen/${id}/verzenden`, { method: 'POST' }),
  registreerBetaling: (id, bedrag, datum) => apiFetch(`/verkoopfacturen/${id}/betaling?bedrag=${bedrag}${datum ? `&datum=${datum}` : ''}`, { method: 'POST' }),
};

// ==================== INKOOPFACTUREN (PURCHASE INVOICES) ====================

export const purchaseInvoicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/inkoopfacturen${query ? `?${query}` : ''}`);
  },
  getOne: (id) => apiFetch(`/inkoopfacturen/${id}`),
  create: (data) => apiFetch('/inkoopfacturen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/inkoopfacturen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  boeken: (id) => apiFetch(`/inkoopfacturen/${id}/boeken`, { method: 'POST' }),
  registreerBetaling: (id, bedrag, datum) => apiFetch(`/inkoopfacturen/${id}/betaling?bedrag=${bedrag}${datum ? `&datum=${datum}` : ''}`, { method: 'POST' }),
};

// ==================== BANKREKENINGEN ====================

export const bankAccountsAPI = {
  getAll: () => apiFetch('/bankrekeningen'),
  create: (data) => apiFetch('/bankrekeningen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/bankrekeningen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getMutaties: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/bankrekeningen/${id}/mutaties${query ? `?${query}` : ''}`);
  },
  createMutatie: (id, data) => {
    const params = new URLSearchParams(data).toString();
    return apiFetch(`/bankrekeningen/${id}/mutaties?${params}`, { method: 'POST' });
  },
  importMutaties: (id, mutaties) => apiFetch(`/bankrekeningen/${id}/import`, { method: 'POST', body: JSON.stringify({ bankrekening_id: id, mutaties }) }),
};

// ==================== KASBOEK ====================

export const kasboekAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/kasboek${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/kasboek', { method: 'POST', body: JSON.stringify(data) }),
  getSaldo: () => apiFetch('/kasboek/saldo'),
};

// ==================== RECONCILIATIE ====================

export const reconciliatieAPI = {
  getOverzicht: (bankrekeningId) => apiFetch(`/reconciliatie/${bankrekeningId}`),
  autoMatch: (bankrekeningId) => apiFetch(`/reconciliatie/auto-match?bankrekening_id=${bankrekeningId}`, { method: 'POST' }),
  match: (data) => apiFetch('/reconciliatie/match', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== VASTE ACTIVA ====================

export const fixedAssetsAPI = {
  getAll: () => apiFetch('/vaste-activa'),
  getOne: (id) => apiFetch(`/vaste-activa/${id}`),
  create: (data) => apiFetch('/vaste-activa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/vaste-activa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/vaste-activa/${id}`, { method: 'DELETE' }),
  afschrijven: (id) => apiFetch(`/vaste-activa/${id}/afschrijven`, { method: 'POST' }),
  getAfschrijvingen: (id) => apiFetch(`/vaste-activa/${id}/afschrijvingen`),
};

// ==================== KOSTENPLAATSEN ====================

export const costCentersAPI = {
  getAll: () => apiFetch('/kostenplaatsen'),
  create: (data) => apiFetch('/kostenplaatsen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/kostenplaatsen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ==================== ARTIKELEN (PRODUCTS) ====================

export const productsAPI = {
  getAll: () => apiFetch('/artikelen'),
  getOne: (id) => apiFetch(`/artikelen/${id}`),
  create: (data) => apiFetch('/artikelen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/artikelen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/artikelen/${id}`, { method: 'DELETE' }),
};

// ==================== MAGAZIJNEN ====================

export const warehousesAPI = {
  getAll: () => apiFetch('/magazijnen'),
  create: (data) => apiFetch('/magazijnen', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== VOORRAAD ====================

export const stockAPI = {
  getMutaties: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/voorraad/mutaties${query ? `?${query}` : ''}`);
  },
  createMutatie: (data) => apiFetch('/voorraad/mutaties', { method: 'POST', body: JSON.stringify(data) }),
  getNiveaus: () => apiFetch('/voorraad/niveaus'),
  getLaagVoorraad: () => apiFetch('/voorraad/laag'),
};

// ==================== PROJECTEN ====================

export const projectsAPI = {
  getAll: () => apiFetch('/projecten'),
  getOne: (id) => apiFetch(`/projecten/${id}`),
  create: (data) => apiFetch('/projecten', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/projecten/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/projecten/${id}`, { method: 'DELETE' }),
  getUren: (id) => apiFetch(`/projecten/${id}/uren`),
  createUren: (data) => apiFetch('/projecten/uren', { method: 'POST', body: JSON.stringify(data) }),
  getKosten: (id) => apiFetch(`/projecten/${id}/kosten`),
  createKosten: (data) => apiFetch('/projecten/kosten', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== RAPPORTAGES ====================

export const reportsAPI = {
  balans: (datum = null) => apiFetch(`/rapportages/balans${datum ? `?datum=${datum}` : ''}`),
  winstVerlies: (van = null, tot = null) => {
    const params = new URLSearchParams();
    if (van) params.append('van', van);
    if (tot) params.append('tot', tot);
    const query = params.toString();
    return apiFetch(`/rapportages/winst-verlies${query ? `?${query}` : ''}`);
  },
  btw: (periode = null) => apiFetch(`/rapportages/btw${periode ? `?periode=${periode}` : ''}`),
  grootboekkaart: (rekeningCode, van = null, tot = null) => {
    const params = new URLSearchParams();
    if (van) params.append('van', van);
    if (tot) params.append('tot', tot);
    const query = params.toString();
    return apiFetch(`/rapportages/grootboekkaart/${rekeningCode}${query ? `?${query}` : ''}`);
  },
  proefbalans: (datum = null) => apiFetch(`/rapportages/proefbalans${datum ? `?datum=${datum}` : ''}`),
};

// ==================== HERINNERINGEN ====================

export const remindersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/herinneringen${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/herinneringen', { method: 'POST', body: JSON.stringify(data) }),
  markSent: (id) => apiFetch(`/herinneringen/${id}/verzonden`, { method: 'PUT' }),
  getFacturenVoorHerinnering: () => apiFetch('/herinneringen/facturen-voor-herinnering'),
};

// ==================== DOCUMENTEN ====================

export const documentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/documenten${query ? `?${query}` : ''}`);
  },
  getOne: (id) => apiFetch(`/documenten/${id}`),
  upload: async (file, metadata) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    
    const response = await fetch(`${API_URL}/api/boekhouding/documenten/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    
    return response.json();
  },
  delete: (id) => apiFetch(`/documenten/${id}`, { method: 'DELETE' }),
};

// ==================== INSTELLINGEN ====================

export const settingsAPI = {
  getBedrijf: () => apiFetch('/instellingen/bedrijf'),
  updateBedrijf: (data) => apiFetch('/instellingen/bedrijf', { method: 'PUT', body: JSON.stringify(data) }),
  getNummering: () => apiFetch('/instellingen/nummering'),
  updateNummering: (data) => apiFetch('/instellingen/nummering', { method: 'PUT', body: JSON.stringify(data) }),
};

export default {
  init: initBoekhouding,
  dashboard: dashboardAPI,
  exchangeRates: exchangeRatesAPI,
  btw: btwAPI,
  accounts: accountsAPI,
  dagboeken: dagboekenAPI,
  journal: journalAPI,
  customers: customersAPI,
  suppliers: suppliersAPI,
  salesInvoices: salesInvoicesAPI,
  purchaseInvoices: purchaseInvoicesAPI,
  bankAccounts: bankAccountsAPI,
  kasboek: kasboekAPI,
  reconciliatie: reconciliatieAPI,
  fixedAssets: fixedAssetsAPI,
  costCenters: costCentersAPI,
  products: productsAPI,
  warehouses: warehousesAPI,
  stock: stockAPI,
  projects: projectsAPI,
  reports: reportsAPI,
  reminders: remindersAPI,
  documents: documentsAPI,
  settings: settingsAPI,
};
