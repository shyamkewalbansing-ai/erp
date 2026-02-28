// Boekhouding API Client - matches reference repository structure
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Field name translations: English <-> Dutch
// This helps maintain consistency between frontend (English) and backend (Dutch)
const fieldMappings = {
  // Common fields
  name: 'naam',
  address: 'adres',
  city: 'plaats',
  country: 'land',
  phone: 'telefoon',
  description: 'omschrijving',
  currency: 'valuta',
  
  // Bank/Account fields
  bank_name: 'bank',
  account_number: 'rekeningnummer',
  
  // Customer/Supplier fields
  btw_number: 'btw_nummer',
  payment_terms: 'betalingstermijn',
  
  // Project fields
  customer_id: 'klant_id',
  start_date: 'startdatum',
  end_date: 'einddatum',
  hours_budget: 'uren_budget',
  
  // Invoice fields
  invoice_date: 'factuur_datum',
  due_date: 'vervaldatum',
  
  // Time entry fields
  project_id: 'project_id',
  hourly_rate: 'uurtarief',
};

// Convert English field names to Dutch for backend
export const toBackendFormat = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const converted = {};
  for (const [key, value] of Object.entries(data)) {
    const dutchKey = fieldMappings[key] || key;
    converted[dutchKey] = value;
  }
  return converted;
};

// Convert Dutch field names to English for frontend
export const toFrontendFormat = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const reverseMappings = {};
  for (const [eng, nl] of Object.entries(fieldMappings)) {
    reverseMappings[nl] = eng;
  }
  
  const converted = {};
  for (const [key, value] of Object.entries(data)) {
    const englishKey = reverseMappings[key] || key;
    converted[englishKey] = value;
  }
  return converted;
};

const apiFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw { response: { data: error, status: response.status } };
  }
  
  return { data: await response.json() };
};

// Dashboard
export const dashboardAPI = {
  getSummary: () => apiFetch('/boekhouding/dashboard'),
};

// Exchange Rates
export const exchangeRatesAPI = {
  getAll: () => apiFetch('/boekhouding/wisselkoersen'),
  getLatest: () => apiFetch('/boekhouding/wisselkoersen/latest'),
  create: (data) => apiFetch('/boekhouding/wisselkoersen', { method: 'POST', body: JSON.stringify(data) }),
  syncCME: () => apiFetch('/boekhouding/wisselkoersen/sync-cme', { method: 'POST' }),
  previewCME: () => apiFetch('/boekhouding/wisselkoersen/cme-preview'),
  getSchedulerStatus: () => apiFetch('/boekhouding/wisselkoersen/scheduler-status'),
};

// BTW Codes
export const btwAPI = {
  getAll: () => apiFetch('/boekhouding/btw-codes'),
  create: (data) => apiFetch('/boekhouding/btw-codes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/btw-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/btw-codes/${id}`, { method: 'DELETE' }),
};

// Accounts (Chart of Accounts)
export const accountsAPI = {
  getAll: () => apiFetch('/boekhouding/rekeningen'),
  create: (data) => apiFetch('/boekhouding/rekeningen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/rekeningen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/rekeningen/${id}`, { method: 'DELETE' }),
};

// Journal Entries
export const journalAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/journaalposten${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/boekhouding/journaalposten', { method: 'POST', body: JSON.stringify(data) }),
  post: (id) => apiFetch(`/boekhouding/journaalposten/${id}/boeken`, { method: 'PUT' }),
};

// Customers
export const customersAPI = {
  getAll: () => apiFetch('/boekhouding/debiteuren'),
  getOne: (id) => apiFetch(`/boekhouding/debiteuren/${id}`),
  create: (data) => apiFetch('/boekhouding/debiteuren', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/debiteuren/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/debiteuren/${id}`, { method: 'DELETE' }),
};

// Suppliers
export const suppliersAPI = {
  getAll: () => apiFetch('/boekhouding/crediteuren'),
  getOne: (id) => apiFetch(`/boekhouding/crediteuren/${id}`),
  create: (data) => apiFetch('/boekhouding/crediteuren', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/crediteuren/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/crediteuren/${id}`, { method: 'DELETE' }),
};

// Bank Accounts
export const bankAccountsAPI = {
  getAll: () => apiFetch('/boekhouding/bankrekeningen'),
  create: (data) => apiFetch('/boekhouding/bankrekeningen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/bankrekeningen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Bank Transactions
export const bankTransactionsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/banktransacties${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/boekhouding/banktransacties', { method: 'POST', body: JSON.stringify(data) }),
};

// Bank Import
export const bankImportAPI = {
  importCSV: async (accountId, formData) => {
    const response = await fetch(`${API_BASE}/boekhouding/bank/import/csv?bank_id=${accountId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return { data: await response.json() };
  },
  importMT940: async (accountId, formData) => {
    const response = await fetch(`${API_BASE}/boekhouding/bank/import/mt940?bank_id=${accountId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return { data: await response.json() };
  },
};

// Invoices (Sales)
export const invoicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/verkoopfacturen${query ? `?${query}` : ''}`);
  },
  getOne: (id) => apiFetch(`/boekhouding/verkoopfacturen/${id}`),
  create: (data) => apiFetch('/boekhouding/verkoopfacturen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/verkoopfacturen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) => apiFetch(`/boekhouding/verkoopfacturen/${id}/status?status=${status}`, { method: 'PUT' }),
  addPayment: (id, data) => apiFetch(`/boekhouding/verkoopfacturen/${id}/betaling`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/verkoopfacturen/${id}`, { method: 'DELETE' }),
};

// Purchase Invoices
export const purchaseInvoicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/inkoopfacturen${query ? `?${query}` : ''}`);
  },
  getOne: (id) => apiFetch(`/boekhouding/inkoopfacturen/${id}`),
  create: (data) => apiFetch('/boekhouding/inkoopfacturen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/inkoopfacturen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) => apiFetch(`/boekhouding/inkoopfacturen/${id}/status?status=${status}`, { method: 'PUT' }),
};

// Products
export const productsAPI = {
  getAll: () => apiFetch('/boekhouding/artikelen'),
  create: (data) => apiFetch('/boekhouding/artikelen', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/artikelen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/artikelen/${id}`, { method: 'DELETE' }),
};

// Fixed Assets
export const fixedAssetsAPI = {
  getAll: () => apiFetch('/boekhouding/vaste-activa'),
  create: (data) => apiFetch('/boekhouding/vaste-activa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/vaste-activa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  depreciate: (id) => apiFetch(`/boekhouding/vaste-activa/${id}/afschrijven`, { method: 'POST' }),
};

// Projects
export const projectsAPI = {
  getAll: () => apiFetch('/boekhouding/projecten'),
  getOne: (id) => apiFetch(`/boekhouding/projecten/${id}`),
  create: (data) => apiFetch('/boekhouding/projecten', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/boekhouding/projecten/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Time Entries
export const timeEntriesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/uren${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/boekhouding/uren', { method: 'POST', body: JSON.stringify(data) }),
};

// Cost Centers
export const costCentersAPI = {
  getAll: () => apiFetch('/boekhouding/kostenplaatsen'),
  create: (data) => apiFetch('/boekhouding/kostenplaatsen', { method: 'POST', body: JSON.stringify(data) }),
};

// Warehouses
export const warehousesAPI = {
  getAll: () => apiFetch('/boekhouding/magazijnen'),
  create: (data) => apiFetch('/boekhouding/magazijnen', { method: 'POST', body: JSON.stringify(data) }),
};

// Stock Movements
export const stockMovementsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/voorraadmutaties${query ? `?${query}` : ''}`);
  },
  create: (data) => apiFetch('/boekhouding/voorraadmutaties', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/boekhouding/voorraadmutaties/${id}`, { method: 'DELETE' }),
};

// Purchase Orders
export const purchaseOrdersAPI = {
  getAll: () => apiFetch('/boekhouding/inkooporders'),
  create: (data) => apiFetch('/boekhouding/inkooporders', { method: 'POST', body: JSON.stringify(data) }),
};

// Quotes
export const quotesAPI = {
  getAll: () => apiFetch('/boekhouding/offertes'),
  create: (data) => apiFetch('/boekhouding/offertes', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => apiFetch(`/boekhouding/offertes/${id}/status?status=${status}`, { method: 'PUT' }),
};

// Sales Orders
export const salesOrdersAPI = {
  getAll: () => apiFetch('/boekhouding/verkooporders'),
  create: (data) => apiFetch('/boekhouding/verkooporders', { method: 'POST', body: JSON.stringify(data) }),
};

// Reports
export const reportsAPI = {
  profitLoss: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/rapportages/winst-verlies${query ? `?${query}` : ''}`);
  },
  balanceSheet: () => apiFetch('/boekhouding/rapportages/balans'),
  btw: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/rapportages/btw${query ? `?${query}` : ''}`);
  },
  aging: (type) => apiFetch(`/boekhouding/rapportages/ouderdom?type=${type}`),
};

// Company Settings
export const settingsAPI = {
  getCompany: () => apiFetch('/boekhouding/instellingen'),
  updateCompany: (data) => apiFetch('/boekhouding/instellingen', { method: 'PUT', body: JSON.stringify(data) }),
  testEmail: async () => {
    // Special handling for test email with longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(`${API_BASE}/boekhouding/instellingen/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      return { data };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { data: { success: false, error: 'Timeout: De SMTP-server reageert niet. Controleer uw instellingen.' } };
      }
      throw error;
    }
  },
};

// PDF Invoice
export const pdfAPI = {
  getInvoicePdf: async (invoiceId) => {
    const response = await fetch(`${API_BASE}/boekhouding/verkoopfacturen/${invoiceId}/pdf`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('PDF download failed');
    return { data: await response.blob() };
  },
};

// Payment Reminders
export const remindersAPI = {
  getAll: () => apiFetch('/boekhouding/herinneringen'),
  generate: () => apiFetch('/boekhouding/herinneringen/genereren', { method: 'POST' }),
  markSent: (id) => apiFetch(`/boekhouding/herinneringen/${id}/verzonden`, { method: 'PUT' }),
  acknowledge: (id) => apiFetch(`/boekhouding/herinneringen/${id}/bevestigen`, { method: 'PUT' }),
  getLetter: async (id) => {
    const response = await fetch(`${API_BASE}/boekhouding/herinneringen/${id}/brief`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Letter download failed');
    return { data: await response.blob() };
  },
};

// Documents
export const documentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/boekhouding/documenten${query ? `?${query}` : ''}`);
  },
  getOne: (id) => apiFetch(`/boekhouding/documenten/${id}`),
  upload: async (formData) => {
    const response = await fetch(`${API_BASE}/boekhouding/documenten/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return { data: await response.json() };
  },
  download: async (id) => {
    const response = await fetch(`${API_BASE}/boekhouding/documenten/${id}/download`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Download failed');
    return { data: await response.blob() };
  },
  delete: (id) => apiFetch(`/boekhouding/documenten/${id}`, { method: 'DELETE' }),
  link: (id, entityType, entityId) => apiFetch(`/boekhouding/documenten/${id}/link?entity_type=${entityType}&entity_id=${entityId}`, { method: 'PUT' }),
};

// Multi-tenant / Bedrijven
export const bedrijvenAPI = {
  getAll: () => apiFetch('/boekhouding/bedrijven'),
  getActief: () => apiFetch('/boekhouding/bedrijven/actief'),
  create: (data) => apiFetch('/boekhouding/bedrijven', { method: 'POST', body: JSON.stringify(data) }),
  activeer: (id) => apiFetch(`/boekhouding/bedrijven/${id}/activeer`, { method: 'PUT' }),
  delete: (id) => apiFetch(`/boekhouding/bedrijven/${id}`, { method: 'DELETE' }),
};

// Dashboard Charts
export const chartsAPI = {
  getChartData: () => apiFetch('/boekhouding/dashboard/charts'),
};

// Default export for backward compatibility
export default {
  dashboard: dashboardAPI,
  exchangeRates: exchangeRatesAPI,
  btw: btwAPI,
  accounts: accountsAPI,
  journal: journalAPI,
  customers: customersAPI,
  suppliers: suppliersAPI,
  bankAccounts: bankAccountsAPI,
  bankTransactions: bankTransactionsAPI,
  bankImport: bankImportAPI,
  invoices: invoicesAPI,
  purchaseInvoices: purchaseInvoicesAPI,
  products: productsAPI,
  fixedAssets: fixedAssetsAPI,
  projects: projectsAPI,
  timeEntries: timeEntriesAPI,
  costCenters: costCentersAPI,
  warehouses: warehousesAPI,
  stockMovements: stockMovementsAPI,
  purchaseOrders: purchaseOrdersAPI,
  quotes: quotesAPI,
  salesOrders: salesOrdersAPI,
  reports: reportsAPI,
  settings: settingsAPI,
  pdf: pdfAPI,
  reminders: remindersAPI,
  documents: documentsAPI,
  bedrijven: bedrijvenAPI,
  charts: chartsAPI,
};
