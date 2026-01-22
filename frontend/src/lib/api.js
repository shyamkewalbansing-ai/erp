import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Format currency
export const formatCurrency = (amount) => {
  return `SRD ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Tenants
export const getTenants = () => api.get('/tenants');
export const getTenant = (id) => api.get(`/tenants/${id}`);
export const createTenant = (data) => api.post('/tenants', data);
export const updateTenant = (id, data) => api.put(`/tenants/${id}`, data);
export const deleteTenant = (id) => api.delete(`/tenants/${id}`);
export const getTenantBalance = (id) => api.get(`/tenants/${id}/balance`);

// Apartments
export const getApartments = () => api.get('/apartments');
export const getApartment = (id) => api.get(`/apartments/${id}`);
export const createApartment = (data) => api.post('/apartments', data);
export const updateApartment = (id, data) => api.put(`/apartments/${id}`, data);
export const deleteApartment = (id) => api.delete(`/apartments/${id}`);
export const assignTenant = (apartmentId, tenantId) => 
  api.post(`/apartments/${apartmentId}/assign-tenant?tenant_id=${tenantId}`);
export const removeTenant = (apartmentId) => 
  api.post(`/apartments/${apartmentId}/remove-tenant`);

// Payments
export const getPayments = () => api.get('/payments');
export const getPayment = (id) => api.get(`/payments/${id}`);
export const createPayment = (data) => api.post('/payments', data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);
export const downloadReceipt = (paymentId) => 
  api.get(`/receipts/${paymentId}/pdf`, { responseType: 'blob' });

// Deposits
export const getDeposits = () => api.get('/deposits');
export const createDeposit = (data) => api.post('/deposits', data);
export const updateDeposit = (id, data) => api.put(`/deposits/${id}`, data);
export const deleteDeposit = (id) => api.delete(`/deposits/${id}`);

export default api;
