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
export const getTenantOutstanding = (id) => api.get(`/tenants/${id}/outstanding`);

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

// Invoices (Facturen)
export const getInvoices = () => api.get('/invoices');

// Deposits
export const getDeposits = () => api.get('/deposits');
export const createDeposit = (data) => api.post('/deposits', data);
export const updateDeposit = (id, data) => api.put(`/deposits/${id}`, data);
export const deleteDeposit = (id) => api.delete(`/deposits/${id}`);

// Kasgeld (Cash Fund)
export const getKasgeld = () => api.get('/kasgeld');
export const createKasgeld = (data) => api.post('/kasgeld', data);
export const deleteKasgeld = (id) => api.delete(`/kasgeld/${id}`);

// Onderhoud (Maintenance)
export const getMaintenance = () => api.get('/maintenance');
export const getMaintenanceRecord = (id) => api.get(`/maintenance/${id}`);
export const createMaintenance = (data) => api.post('/maintenance', data);
export const updateMaintenance = (id, data) => api.put(`/maintenance/${id}`, data);
export const deleteMaintenance = (id) => api.delete(`/maintenance/${id}`);
export const getApartmentMaintenance = (apartmentId) => api.get(`/maintenance/apartment/${apartmentId}`);

// Werknemers (Employees)
export const getEmployees = () => api.get('/employees');
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Salaris (Salary Payments)
export const getSalaries = () => api.get('/salaries');
export const createSalary = (data) => api.post('/salaries', data);
export const deleteSalary = (id) => api.delete(`/salaries/${id}`);
export const downloadPayslip = (salaryId) => 
  api.get(`/salaries/${salaryId}/pdf`, { responseType: 'blob' });

// Deposit Refund PDF
export const downloadDepositRefund = (depositId) => 
  api.get(`/deposits/${depositId}/refund-pdf`, { responseType: 'blob' });

// Wisselkoers (Exchange Rate)
export const getExchangeRate = () => api.get('/exchange-rate');

// Subscription
export const getSubscriptionStatus = () => api.get('/subscription/status');
export const requestSubscription = () => api.post('/subscription/request');

// Admin - Customers
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getAdminCustomers = () => api.get('/admin/customers');
export const createAdminCustomer = (data) => api.post('/admin/customers', data);
export const deactivateCustomer = (userId) => api.delete(`/admin/customers/${userId}`);
export const deleteCustomerPermanent = (userId) => api.delete(`/admin/customers/${userId}/permanent`);

// Admin - Subscriptions
export const getAdminSubscriptions = () => api.get('/admin/subscriptions');
export const activateSubscription = (data) => api.post('/admin/subscriptions', data);
export const deleteSubscriptionPayment = (subscriptionId) => api.delete(`/admin/subscriptions/${subscriptionId}`);
export const getSubscriptionRequests = () => api.get('/admin/subscription-requests');
export const downloadSubscriptionReceipt = (subscriptionId) => 
  api.get(`/admin/subscriptions/${subscriptionId}/pdf`, { responseType: 'blob' });

// Admin - Customer Profile Management
export const adminResetPassword = (userId, newPassword) => 
  api.put(`/admin/customers/${userId}/password`, { new_password: newPassword });
export const adminUpdateCustomer = (userId, data) => 
  api.put(`/admin/customers/${userId}/profile`, data);

// Admin - Custom Domains
export const getAdminDomains = () => api.get('/admin/domains');
export const createCustomDomain = (data) => api.post('/admin/domains', data);
export const verifyCustomDomain = (domainId) => api.put(`/admin/domains/${domainId}/verify`);
export const deleteCustomDomain = (domainId) => api.delete(`/admin/domains/${domainId}`);
export const getCustomerDomains = (userId) => api.get(`/admin/domains/customer/${userId}`);

// Profile/Settings
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (currentPassword, newPassword) => 
  api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
export const uploadLogo = (logoData) => api.post('/profile/logo', { logo_data: logoData });
export const deleteLogo = () => api.delete('/profile/logo');
export const updateRentSettings = (settings) => api.put('/profile/rent-settings', settings);

// Format currency in EUR
export const formatCurrencyEUR = (amount) => {
  return `€ ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

export default api;
