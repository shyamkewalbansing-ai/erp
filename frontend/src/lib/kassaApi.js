// Kassa POS API Service
const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const getToken = () => localStorage.getItem('kassa_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
});

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Er is een fout opgetreden' }));
    throw new Error(error.detail || 'Fout');
  }
  return response.json();
};

// Categories
export const categoriesAPI = {
  getAll: () => fetch(`${API_URL}/api/kassa/categories`, { headers: headers() }).then(handleResponse),
  create: (data) => fetch(`${API_URL}/api/kassa/categories`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${API_URL}/api/kassa/categories/${id}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${API_URL}/api/kassa/categories/${id}`, {
    method: 'DELETE', headers: headers()
  }).then(handleResponse)
};

// Products
export const productsAPI = {
  getAll: (categoryId = null, search = null) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (search) params.append('search', search);
    return fetch(`${API_URL}/api/kassa/products?${params}`, { headers: headers() }).then(handleResponse);
  },
  getByBarcode: (barcode) => fetch(`${API_URL}/api/kassa/products/barcode/${barcode}`, { headers: headers() }).then(handleResponse),
  create: (data) => fetch(`${API_URL}/api/kassa/products`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${API_URL}/api/kassa/products/${id}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${API_URL}/api/kassa/products/${id}`, {
    method: 'DELETE', headers: headers()
  }).then(handleResponse)
};

// Orders
export const ordersAPI = {
  getAll: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetch(`${API_URL}/api/kassa/orders?${params}`, { headers: headers() }).then(handleResponse);
  },
  getOne: (id) => fetch(`${API_URL}/api/kassa/orders/${id}`, { headers: headers() }).then(handleResponse),
  create: (data) => fetch(`${API_URL}/api/kassa/orders`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse),
  refund: (id) => fetch(`${API_URL}/api/kassa/orders/${id}/refund`, {
    method: 'POST', headers: headers()
  }).then(handleResponse)
};

// Customers
export const customersAPI = {
  getAll: (search = null) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetch(`${API_URL}/api/kassa/customers${params}`, { headers: headers() }).then(handleResponse);
  },
  create: (data) => fetch(`${API_URL}/api/kassa/customers`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${API_URL}/api/kassa/customers/${id}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse)
};

// Reports
export const reportsAPI = {
  daily: (date = null) => {
    const params = date ? `?date=${date}` : '';
    return fetch(`${API_URL}/api/kassa/reports/daily${params}`, { headers: headers() }).then(handleResponse);
  },
  inventory: () => fetch(`${API_URL}/api/kassa/reports/inventory`, { headers: headers() }).then(handleResponse)
};

// Settings
export const settingsAPI = {
  get: () => fetch(`${API_URL}/api/kassa/settings`, { headers: headers() }).then(handleResponse),
  update: (data) => fetch(`${API_URL}/api/kassa/settings`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  }).then(handleResponse)
};

// Plans
export const plansAPI = {
  getAll: () => fetch(`${API_URL}/api/kassa/plans`, { headers: headers() }).then(handleResponse),
  getSubscription: () => fetch(`${API_URL}/api/kassa/subscription`, { headers: headers() }).then(handleResponse)
};

export default {
  categories: categoriesAPI,
  products: productsAPI,
  orders: ordersAPI,
  customers: customersAPI,
  reports: reportsAPI,
  settings: settingsAPI,
  plans: plansAPI
};
